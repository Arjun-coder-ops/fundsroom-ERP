import { PrismaClient, CustomerStatus, CustomerType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const [admin, sales, warehouse, accounts] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@fundsroom.test' },
      update: {},
      create: { name: 'Aisha Admin', email: 'admin@fundsroom.test', passwordHash, role: 'ADMIN' },
    }),
    prisma.user.upsert({
      where: { email: 'sales@fundsroom.test' },
      update: {},
      create: { name: 'Sam Sales', email: 'sales@fundsroom.test', passwordHash, role: 'SALES' },
    }),
    prisma.user.upsert({
      where: { email: 'warehouse@fundsroom.test' },
      update: {},
      create: { name: 'Wesley Warehouse', email: 'warehouse@fundsroom.test', passwordHash, role: 'WAREHOUSE' },
    }),
    prisma.user.upsert({
      where: { email: 'accounts@fundsroom.test' },
      update: {},
      create: { name: 'Amy Accounts', email: 'accounts@fundsroom.test', passwordHash, role: 'ACCOUNTS' },
    }),
  ]);

  const customerData = [
    { name: 'Ravi Traders', mobile: '9800000001', businessName: 'Ravi Traders Pvt Ltd', customerType: CustomerType.WHOLESALE, status: CustomerStatus.ACTIVE, address: 'Ahmedabad, Gujarat' },
    { name: 'Priya Distributors', mobile: '9800000002', businessName: 'Priya Distribution Co', customerType: CustomerType.DISTRIBUTOR, status: CustomerStatus.ACTIVE, address: 'Surat, Gujarat' },
    { name: 'Kiran Retail Store', mobile: '9800000003', businessName: 'Kiran Kirana Store', customerType: CustomerType.RETAIL, status: CustomerStatus.LEAD, address: 'Rajkot, Gujarat' },
    { name: 'Mehta Enterprises', mobile: '9800000004', businessName: 'Mehta Enterprises', customerType: CustomerType.WHOLESALE, status: CustomerStatus.ACTIVE, address: 'Vadodara, Gujarat' },
    { name: 'New Age Mart', mobile: '9800000005', businessName: 'New Age Mart', customerType: CustomerType.RETAIL, status: CustomerStatus.INACTIVE, address: 'Ahmedabad, Gujarat' },
  ];

  const customers = [];
  for (const c of customerData) {
    const customer = await prisma.customer.upsert({
      where: { id: `seed-${c.mobile}` },
      update: {},
      create: {
        id: `seed-${c.mobile}`,
        name: c.name,
        mobile: c.mobile,
        businessName: c.businessName,
        customerType: c.customerType,
        status: c.status,
        address: c.address,
        notes: 'Seeded demo customer',
      },
    });
    customers.push(customer);
  }

  await prisma.followUp.createMany({
    data: [
      { customerId: customers[2].id, note: 'Initial call - interested in bulk stationery order', createdById: sales.id },
      { customerId: customers[0].id, note: 'Discussed monthly credit terms', createdById: sales.id },
    ],
    skipDuplicates: true,
  });

  const productData = [
    { sku: 'STN-PEN-001', name: 'Ball Pen (Blue) - Box of 50', category: 'Stationery', unitPrice: 250, currentStock: 500, minStockAlert: 100, location: 'Warehouse A - Rack 1' },
    { sku: 'STN-NB-002', name: 'Notebook A4 200pg', category: 'Stationery', unitPrice: 60, currentStock: 30, minStockAlert: 50, location: 'Warehouse A - Rack 2' },
    { sku: 'PKG-BOX-003', name: 'Corrugated Box (Medium)', category: 'Packaging', unitPrice: 35, currentStock: 800, minStockAlert: 150, location: 'Warehouse B - Rack 1' },
    { sku: 'PKG-TAPE-004', name: 'Packing Tape Roll', category: 'Packaging', unitPrice: 45, currentStock: 20, minStockAlert: 40, location: 'Warehouse B - Rack 2' },
    { sku: 'CLN-SOAP-005', name: 'Hand Soap Bar (Case of 24)', category: 'Cleaning Supplies', unitPrice: 480, currentStock: 120, minStockAlert: 30, location: 'Warehouse A - Rack 3' },
    { sku: 'ELE-CBL-006', name: 'USB-C Cable 1m', category: 'Electronics', unitPrice: 150, currentStock: 15, minStockAlert: 25, location: 'Warehouse C - Rack 1' },
  ];

  const products = [];
  for (const p of productData) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: p,
    });
    products.push(product);
  }

  const existingChallan = await prisma.challan.findFirst({ where: { challanNumber: 'CH-2026-000001' } });
  if (!existingChallan) {
    const year = new Date().getFullYear();
    await prisma.challanCounter.upsert({
      where: { year },
      update: { value: { increment: 1 } },
      create: { year, value: 1 },
    });

    await prisma.challan.create({
      data: {
        challanNumber: 'CH-2026-000001',
        customerId: customers[0].id,
        createdById: sales.id,
        status: 'DRAFT',
        totalQuantity: 60,
        items: {
          create: [
            {
              productId: products[0].id,
              quantity: 20,
              productNameSnapshot: products[0].name,
              productSkuSnapshot: products[0].sku,
              unitPriceSnapshot: products[0].unitPrice,
            },
            {
              productId: products[2].id,
              quantity: 40,
              productNameSnapshot: products[2].name,
              productSkuSnapshot: products[2].sku,
              unitPriceSnapshot: products[2].unitPrice,
            },
          ],
        },
      },
    });
  }

  console.log('Seed complete.');
  console.log('Demo users (password for all: Password123!):');
  console.log(`  ADMIN:     ${admin.email}`);
  console.log(`  SALES:     ${sales.email}`);
  console.log(`  WAREHOUSE: ${warehouse.email}`);
  console.log(`  ACCOUNTS:  ${accounts.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
