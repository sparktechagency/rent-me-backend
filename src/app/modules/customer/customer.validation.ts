import { z } from 'zod';

const updateCustomerProfileZodSchema = z.object({
  name: z.string().optional(),
  contact: z.string().optional(),
  profileImg: z.string().optional(),
  address: z.string().optional(),
  location: z
    .object({
      type: z.literal('Point'), // Ensure the type is 'Point' (GeoJSON requirement)
      coordinates: z
        .array(z.number()) // Array of two numbers (longitude, latitude)
        .length(2) // Ensure the array has exactly two numbers (longitude, latitude)
        .optional(), // The coordinates are optional
    })
    .optional(), // The location object itself is optional
});

export const CustomerValidation = {
  updateCustomerProfileZodSchema,
};
