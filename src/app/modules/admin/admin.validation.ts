import { z } from 'zod';

const updateAdminZodSchema = z.object({
  name: z.string().optional(),
  contact: z.string().optional(),
  address: z.string().optional(),
});

export const AdminValidation = {
  updateAdminZodSchema,
};
