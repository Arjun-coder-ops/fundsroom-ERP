import { Prisma } from '@prisma/client';
import { Request } from 'express';
import { prisma } from '../db/prisma';
import { AppError } from '../utils/AppError';
import { buildMeta, parsePagination } from '../utils/pagination';
import { CreateChallanInput, UpdateChallanInput } from '../validation/challan.validation';

const challanInclude = {
  customer: true,
  createdBy: { select: { id: true, name: true, email: true } },
  items: { include: { product: { select: { id: true, name: true, sku: true } } } },
} satisfies Prisma.ChallanInclude;

// Generates the next challan number for the current year in the format
// CH-YYYY-NNNNNN, using a per-year counter row updated atomically so
// concurrent requests never collide. Must be called from within the same
// transaction that creates the challan.
async function nextChallanNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();

  const counter = await tx.challanCounter.upsert({
    where: { year },
    create: { year, value: 1 },
    update: { value: { increment: 1 } },
  });

  return `CH-${year}-${String(counter.value).padStart(6, '0')}`;
}

export async function listChallans(req: Request) {
  const pagination = parsePagination(req);
  const { status, customerId } = req.query as { status?: string; customerId?: string };

  const where: Prisma.ChallanWhereInput = {
    ...(status ? { status: status as any } : {}),
    ...(customerId ? { customerId } : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.challan.findMany({
      where,
      include: challanInclude,
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.challan.count({ where }),
  ]);

  return { items, meta: buildMeta(total, pagination) };
}

export async function getChallanById(id: string) {
  const challan = await prisma.challan.findUnique({ where: { id }, include: challanInclude });
  if (!challan) throw AppError.notFound('Challan not found');
  return challan;
}

// Creates a challan in Draft status. Draft challans never touch stock -
// stock is only affected when a challan is confirmed (see confirmChallan).
export async function createChallan(userId: string, data: CreateChallanInput) {
  const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
  if (!customer) throw AppError.notFound('Customer not found');

  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

  if (products.length !== new Set(productIds).size) {
    const found = new Set(products.map((p) => p.id));
    const missing = productIds.filter((id) => !found.has(id));
    throw AppError.badRequest('One or more products were not found', { missingProductIds: missing });
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  const totalQuantity = data.items.reduce((sum, i) => sum + i.quantity, 0);

  return prisma.$transaction(
    async (tx) => {
      const challanNumber = await nextChallanNumber(tx);

      return tx.challan.create({
        data: {
          challanNumber,
          customerId: data.customerId,
          createdById: userId,
          status: 'DRAFT',
          totalQuantity,
          items: {
            create: data.items.map((item) => {
              const product = productMap.get(item.productId)!;
              return {
                productId: item.productId,
                quantity: item.quantity,
                productNameSnapshot: product.name,
                productSkuSnapshot: product.sku,
                unitPriceSnapshot: product.unitPrice,
              };
            }),
          },
        },
        include: challanInclude,
      });
    },
    { timeout: 10000 }
  );
}

// Replaces the line items of a Draft challan. Only Draft challans may be
// edited - Confirmed and Cancelled challans are immutable historical
// records.
export async function updateChallan(id: string, data: UpdateChallanInput) {
  const existing = await prisma.challan.findUnique({ where: { id }, include: { items: true } });
  if (!existing) throw AppError.notFound('Challan not found');
  if (existing.status !== 'DRAFT') {
    throw AppError.badRequest(`Cannot edit a challan with status '${existing.status}'. Only Draft challans can be edited.`);
  }

  if (data.customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) throw AppError.notFound('Customer not found');
  }

  return prisma.$transaction(async (tx) => {
    if (data.items) {
      const productIds = data.items.map((i) => i.productId);
      const products = await tx.product.findMany({ where: { id: { in: productIds } } });
      const productMap = new Map(products.map((p) => [p.id, p]));

      if (products.length !== new Set(productIds).size) {
        throw AppError.badRequest('One or more products were not found');
      }

      await tx.challanItem.deleteMany({ where: { challanId: id } });

      const totalQuantity = data.items.reduce((sum, i) => sum + i.quantity, 0);

      await tx.challan.update({
        where: { id },
        data: {
          ...(data.customerId ? { customerId: data.customerId } : {}),
          totalQuantity,
          items: {
            create: data.items.map((item) => {
              const product = productMap.get(item.productId)!;
              return {
                productId: item.productId,
                quantity: item.quantity,
                productNameSnapshot: product.name,
                productSkuSnapshot: product.sku,
                unitPriceSnapshot: product.unitPrice,
              };
            }),
          },
        },
      });
    } else if (data.customerId) {
      await tx.challan.update({ where: { id }, data: { customerId: data.customerId } });
    }

    return tx.challan.findUniqueOrThrow({ where: { id }, include: challanInclude });
  });
}

// The core stock business logic of the whole application.
//
// Rules enforced here:
//  1. Only a Draft challan can be confirmed (prevents double-confirmation).
//  2. Every line item's stock availability is checked BEFORE any stock is
//     touched.
//  3. If ANY item has insufficient stock, the whole operation aborts with
//     no side effects and a clear error naming the product and the
//     available/requested quantities.
//  4. If all items have sufficient stock, stock is decremented for every
//     item, an OUT StockMovement is recorded for each, and the challan is
//     marked Confirmed - all inside a single database transaction so the
//     result is atomic (all-or-nothing).
export async function confirmChallan(id: string, userId: string) {
  return prisma.$transaction(
    async (tx) => {
      const challan = await tx.challan.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!challan) throw AppError.notFound('Challan not found');

      if (challan.status !== 'DRAFT') {
        throw AppError.badRequest(
          `Cannot confirm a challan with status '${challan.status}'. Only Draft challans can be confirmed.`
        );
      }

      if (challan.items.length === 0) {
        throw AppError.badRequest('Cannot confirm a challan with no line items');
      }

      // Step 1: validate stock availability for every item up-front.
      const productIds = challan.items.map((i) => i.productId);
      const products = await tx.product.findMany({ where: { id: { in: productIds } } });
      const productMap = new Map(products.map((p) => [p.id, p]));

      const shortages: { productName: string; available: number; requested: number }[] = [];

      for (const item of challan.items) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw AppError.notFound(`Product referenced by this challan (${item.productNameSnapshot}) no longer exists`);
        }
        if (product.currentStock < item.quantity) {
          shortages.push({
            productName: product.name,
            available: product.currentStock,
            requested: item.quantity,
          });
        }
      }

      if (shortages.length > 0) {
        throw AppError.badRequest('Insufficient stock to confirm this challan', { shortages });
      }

      // Step 2: all items have sufficient stock - apply the reduction and
      // record the movements.
      for (const item of challan.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            movementType: 'OUT',
            reason: `Challan ${challan.challanNumber} confirmed`,
            relatedChallanId: challan.id,
            createdById: userId,
          },
        });
      }

      return tx.challan.update({
        where: { id },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
        include: challanInclude,
      });
    },
    { timeout: 10000 }
  );
}

// Cancelling a Draft challan is a no-op on stock (none was ever deducted).
// Cancelling a Confirmed challan is deliberately NOT supported here - doing
// so correctly would require a stock-reversal flow, which is out of scope
// for this case study and is called out as a known limitation in the
// README. Only Draft challans may be cancelled.
export async function cancelChallan(id: string) {
  return prisma.$transaction(async (tx) => {
    const challan = await tx.challan.findUnique({ where: { id } });
    if (!challan) throw AppError.notFound('Challan not found');

    if (challan.status !== 'DRAFT') {
      throw AppError.badRequest(
        `Cannot cancel a challan with status '${challan.status}'. Only Draft challans can be cancelled.`
      );
    }

    return tx.challan.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
      include: challanInclude,
    });
  });
}
