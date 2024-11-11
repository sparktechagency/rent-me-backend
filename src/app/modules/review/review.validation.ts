import { z } from 'zod';

const createReviewZodSchema = z.object({
  body: z.object({
    rating: z.number().max(5, 'Rating must be between 1 and 5'),
    comment: z.string({
      required_error: 'Comment is required',
    }),
  }),
});

const updateReviewZodSchema = z.object({
  body: z.object({
    rating: z.number().optional(),
    comment: z.string().optional(),
  }),
});

export const ReviewValidation = {
  createReviewZodSchema,
  updateReviewZodSchema,
};
