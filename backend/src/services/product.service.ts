import { Prisma } from '@prisma/client';
import { Request } from 'express';
import { prisma } from '../db/prisma';
import { AppError } from '../utils/AppError';
import { buildMeta, parsePagination } from '../utils/pagination';
import { CreateProductInput, StockAdjustmentInput, UpdateProductInput } from '../validation/product.validation';

export async function listProducts(req: Request) {
  const pagination = parsePagination(req);
  const { search, category, lowStock } = req.query as {
    search?: string;
    category?: string;
    lowStock?: string | boolean;
  };

  const where: Prisma.ProductWhereInput = {
    ...(category ? { category } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  // Low-stock filtering compares two columns on the same row, which Prisma's
  // query builder can't express directly - so we filter it in application
  // code after fetching the (already paginated-by-other-filters) candidate
  // set. For a larger dataset this would move to a raw SQL / view-based
  // query instead.
  const all = await prisma.product.findMany({ where, orderBy: { name: 'asc' } });
  const filtered =
    lowStock === true || lowStock === 'true'
      ? all.filter((p) => p.currentStock <= p.minStockAlert)
      : all;

  const total = filtered.length;
  const items = filtered.slice(pagination.skip, pagination.skip + pagination.take);

  return { items, meta: buildMeta(total, pagination) };
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw AppError.notFound('Product not found');
  return product;
}

export async function createProduct(data: CreateProductInput) {
  const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
  if (existing) throw AppError.conflict(`A product with SKU '${data.sku}' already exists`);
  return prisma.product.create({ data });
}

export async function updateProduct(id: string, data: UpdateProductInput) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Product not found');

  if (data.sku && data.sku !== existing.sku) {
    const skuTaken = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (skuTaken) throw AppError.conflict(`A product with SKU '${data.sku}' already exists`);
  }

  return prisma.product.update({ where: { id }, data });
}

export async function getStockMovements(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw AppError.notFound('Product not found');

  return prisma.stockMovement.findMany({
    where: { productId },
    include: { createdBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

// Manual stock adjustment (e.g. receiving new stock, correcting a count).
// This is separate from the automatic OUT movements created when a challan
// is confirmed - see challan.service.ts.
export async function adjustStock(productId: string, userId: string, data: StockAdjustmentInput) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) throw AppError.notFound('Product not found');

    const delta = data.movementType === 'IN' ? data.quantity : -data.quantity;
    const newStock = product.currentStock + delta;

    if (newStock < 0) {
      throw AppError.badRequest(
        `Insufficient stock for '${product.name}'. Available: ${product.currentStock}, requested reduction: ${data.quantity}`
      );
    }

    const updated = await tx.product.update({
      where: { id: productId },
      data: { currentStock: newStock },
    });

    const movement = await tx.stockMovement.create({
      data: {
        productId,
        quantity: data.quantity,
        movementType: data.movementType,
        reason: data.reason,
        createdById: userId,
      },
    });

    return { product: updated, movement };
  });
}
