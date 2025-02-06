import { z } from 'zod';

const manageCartZodSchema = z.object({
  body: z.object({
    vendorId: z.string({ required_error: 'Vendor ID is required' }),
    products: z.array(
      z.object({
        product: z.string(),
        quantity: z.number(),
      })
    ),
  }),
});

export const CartValidations = { manageCartZodSchema };
