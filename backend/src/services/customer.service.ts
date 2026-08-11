import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { AppError } from '../utils/AppError';
import { buildMeta, parsePagination } from '../utils/pagination';
import {
  CreateCustomerInput,
  CreateFollowUpInput,
  UpdateCustomerInput,
} from '../validation/customer.validation';
import { Request } from 'express';

export async function listCustomers(req: Request) {
  const pagination = parsePagination(req);
  const { search, status, customerType } = req.query as {
    search?: string;
    status?: string;
    customerType?: string;
  };

  const where: Prisma.CustomerWhereInput = {
    ...(status ? { status: status as any } : {}),
    ...(customerType ? { customerType: customerType as any } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { mobile: { contains: search, mode: 'insensitive' } },
            { businessName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.customer.count({ where }),
  ]);

  return { items, meta: buildMeta(total, pagination) };
}

export async function getCustomerById(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      followUps: { orderBy: { followUpAt: 'desc' } },
      challans: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
  if (!customer) throw AppError.notFound('Customer not found');
  return customer;
}

export async function createCustomer(data: CreateCustomerInput) {
  return prisma.customer.create({ data });
}

export async function updateCustomer(id: string, data: UpdateCustomerInput) {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Customer not found');
  return prisma.customer.update({ where: { id }, data });
}

export async function addFollowUp(customerId: string, userId: string, data: CreateFollowUpInput) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw AppError.notFound('Customer not found');

  return prisma.followUp.create({
    data: {
      customerId,
      note: data.note,
      followUpAt: data.followUpAt ?? new Date(),
      createdById: userId,
    },
  });
}
