import { z } from 'zod';

const updateCustomerProfileZodSchema = z.object({
  name: z.string().optional(),
  contact: z.string().optional(),
  profileImg: z.string().optional(),
  address: z.string().optional(),
  location: z
    .object({
      lat: z.number().optional(),
      lng: z.number().optional(),
    })
    .optional(),
});

export const CustomerValidation = {
  updateCustomerProfileZodSchema,
};
