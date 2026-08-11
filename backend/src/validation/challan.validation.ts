import { z } from 'zod';

export const challanItemSchema = z.object({
  productId: z.string().uuid('Valid productId is required'),
  quantity: z.coerce.number().int().positive('Quantity must be greater than 0'),
});

export const createChallanSchema = z.object({
  customerId: z.string().uuid('Valid customerId is required'),
  items: z.array(challanItemSchema).min(1, 'At least one product line is required'),
});

export const updateChallanSchema = z.object({
  customerId: z.string().uuid().optional(),
  items: z.array(challanItemSchema).min(1).optional(),
});

export const listChallansQuerySchema = z.object({
  status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']).optional(),
  customerId: z.string().uuid().optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
});

export type CreateChallanInput = z.infer<typeof createChallanSchema>;
export type UpdateChallanInput = z.infer<typeof updateChallanSchema>;
