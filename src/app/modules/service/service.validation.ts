import { z } from 'zod';
const createServiceZodSchema = z.object({
  title: z.string({
    required_error: 'Title is required',
  }),
  description: z.string({ required_error: 'Description is required' }),
  estBudget: z.number().min(0, 'Budget must be a positive number'),

  categoryId: z.array(z.string()).optional(),
});

const updateServiceZodSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  estBudget: z.number().optional(),
  categoryId: z.array(z.string()).optional(),
});

export const ServiceValidation = {
  createServiceZodSchema,
  updateServiceZodSchema,
};
