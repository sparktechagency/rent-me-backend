import { z } from 'zod';

const createProductZodSchema = z.object({
  name: z.string({
    required_error: 'Name is required',
  }),
  description: z.string().optional(),
  hourlyRate: z.number({
    required_error: 'Hourly rate is required',
  }),
  minHours: z.number().optional(),
  dailyRate: z.number(),
  minDays: z.number().optional(),
  quantity: z.number().optional(),
});

const updateProductZodSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  hourlyRate: z.number().optional(),
  minHours: z.number().optional(),
  dailyRate: z.number().optional(),
  minDays: z.number().optional(),
  quantity: z.number().optional(),
  // categories: z.array(z.string()).optional(),
});
export const ProductValidations = {
  createProductZodSchema,
  updateProductZodSchema,
};
