import { z } from 'zod';

const createCategoryZodSchema = z.object({
  name: z.string({
    required_error: 'Name is required',
  }),
  description: z.string().optional(),
  image: z.string().optional(),
});

const updateCategoryZodSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});

export const CategoryValidation = {
  createCategoryZodSchema,
  updateCategoryZodSchema,
};
