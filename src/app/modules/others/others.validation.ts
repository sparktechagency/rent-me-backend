import { z } from 'zod';

const createPrivacyPolicyZodSchema = z.object({
  body: z.object({
    content: z.string().min(1, { message: 'Content is required1111' }),
    userType: z.enum(['USER', 'VENDOR'], {
      required_error: 'User type is required',
    }),
  }),
});

const createTermsAndConditionsZodSchema = z.object({
  body: z.object({
    content: z.string().min(1, { message: 'Content is required' }),
    userType: z.enum(['USER', 'VENDOR'], {
      required_error: 'User type is required',
    }),
  }),
});

const createFaqsZodSchema = z.object({
  body: z.object({
    content: z.string().min(1, { message: 'Content is required' }),
    userType: z.enum(['USER', 'VENDOR'], {
      required_error: 'User type is required',
    }),
  }),
});

export const othersValidation = {
  createPrivacyPolicyZodSchema,
  createTermsAndConditionsZodSchema,
  createFaqsZodSchema,
};
