import { prisma } from '../db/prisma';

export async function getDashboardStats() {
  const [totalCustomers, totalProducts, totalChallans, products] = await Promise.all([
    prisma.customer.count(),
    prisma.product.count(),
    prisma.challan.count(),
    prisma.product.findMany({ select: { id: true, name: true, sku: true, currentStock: true, minStockAlert: true } }),
  ]);

  const lowStockProducts = products.filter((p) => p.currentStock <= p.minStockAlert);

  const [draftChallans, confirmedChallans] = await Promise.all([
    prisma.challan.count({ where: { status: 'DRAFT' } }),
    prisma.challan.count({ where: { status: 'CONFIRMED' } }),
  ]);

  return {
    totalCustomers,
    totalProducts,
    totalChallans,
    draftChallans,
    confirmedChallans,
    lowStockCount: lowStockProducts.length,
    lowStockProducts,
  };
}
