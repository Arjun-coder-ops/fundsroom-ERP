import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  category: z.string().optional(),
  unitPrice: z.coerce.number().nonnegative('Unit price cannot be negative'),
  currentStock: z.coerce.number().int().nonnegative('Stock cannot be negative').default(0),
  minStockAlert: z.coerce.number().int().nonnegative().default(0),
  location: z.string().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const listProductsQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  lowStock: z.coerce.boolean().optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
});

export const stockAdjustmentSchema = z.object({
  quantity: z.coerce.number().int().positive('Quantity must be a positive number'),
  movementType: z.enum(['IN', 'OUT']),
  reason: z.string().min(1, 'Reason is required'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
