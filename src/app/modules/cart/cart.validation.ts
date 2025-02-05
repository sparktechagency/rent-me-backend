import { z } from 'zod';

const manageCartZodSchema = z.object({
  body: z.object({
    productId: z.string({ required_error: 'Product ID is required' }),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    vendorId: z.string({ required_error: 'Vendor ID is required' }),
  }),
});

export const CartValidations = { manageCartZodSchema };
