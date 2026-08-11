import { z } from 'zod';

export const customerTypeEnum = z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']);
export const customerStatusEnum = z.enum(['LEAD', 'ACTIVE', 'INACTIVE']);

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  mobile: z.string().min(7, 'A valid mobile number is required'),
  email: z.string().email().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  customerType: customerTypeEnum.default('RETAIL'),
  address: z.string().optional(),
  status: customerStatusEnum.default('LEAD'),
  followUpDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const createFollowUpSchema = z.object({
  note: z.string().min(1, 'Follow-up note is required'),
  followUpAt: z.coerce.date().optional(),
});

export const listCustomersQuerySchema = z.object({
  search: z.string().optional(),
  status: customerStatusEnum.optional(),
  customerType: customerTypeEnum.optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;
