import { z } from 'zod';

const manageCartZodSchema = z.object({
  body: z.object({
   products: z.array(
    z.object({
      productId: z.string().nonempty('Product ID is required'),
      quantity: z.number().min(1, 'Quantity must be at least 1'),
    })
   ).nonempty('Products are required'),
  }),
});

export const CartValidations = { manageCartZodSchema };
