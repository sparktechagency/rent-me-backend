import { z } from 'zod';

const createProductZodSchema = z.object({
  name: z.string({
    required_error: 'Name is required',
  }),
  description: z.string().optional(),
  hourlyRate: z.number({
    required_error: 'Hourly rate is required',
  }),
  minHours: z.number({
    required_error: 'Minimum hours is required',
  }),
  dailyRate: z.number({
    required_error: 'Daily rate is required',
  }),
  minDays: z.number({
    required_error: 'Minimum days is required',
  }),

  quantity: z.number().optional(),
  categories: z.array(z.string(), {
    required_error: 'Categories are required',
  }),
});

const updateProductZodSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  hourlyRate: z.number().optional(),
  minHours: z.number().optional(),
  dailyRate: z.number().optional(),
  minDays: z.number().optional(),
  quantity: z.number().optional(),
  categories: z.array(z.string()).optional(),
});
export const ProductValidations = {
  createProductZodSchema,
  updateProductZodSchema,
};
