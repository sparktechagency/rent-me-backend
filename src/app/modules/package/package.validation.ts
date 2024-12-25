import { z } from 'zod';

const createPackageZodSchema = z.object({
  body: z.object({
    title: z.string({
      required_error: 'Title is required',
    }),
    features: z.array(z.string()).nonempty('Features are required'),
    serviceId: z.string({ required_error: 'Service ID is required' }),
    setupFee: z.number({ required_error: 'Setup fee is required' }),
  }),
});

const updatePackageZodSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    features: z.array(z.string()).optional(),
    serviceId: z.string().optional(),
    setupFee: z.number().optional(),
  }),
});

export const PackageValidation = {
  createPackageZodSchema,
  updatePackageZodSchema,
};
