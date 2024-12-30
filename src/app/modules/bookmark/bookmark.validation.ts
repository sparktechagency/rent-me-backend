import { z } from 'zod';

const addOrRemoveBookMarkZodSchema = z.object({
  body: z.object({
    vendorId: z.string({
      required_error: 'Vendor ID is required',
    }),
  }),
});

export const BookmarkValidation = {
  addOrRemoveBookMarkZodSchema,
};
