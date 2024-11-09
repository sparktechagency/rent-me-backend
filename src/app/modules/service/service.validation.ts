import zod, { z } from 'zod';
const createServiceZodSchema = z.object({
  title: z.string({
    required_error: 'Title is required',
  }),
  description: z.string({ required_error: 'Description is required' }),
  estBudget: z.number().min(0, 'Budget must be a positive number'),
  productDimension: z.string({
    required_error: 'Product dimension is required',
  }),
  categoryId: z.string().optional(),
});

const updateServiceZodSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  estBudget: z.number().optional(),
  productDimension: z.string().optional(),
  categoryId: z.string().optional(),
});

export const ServiceValidation = {
  createServiceZodSchema,
  updateServiceZodSchema,
};
