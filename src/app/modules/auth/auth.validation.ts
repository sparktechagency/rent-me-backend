import { z } from 'zod';

const createVerifyEmailZodSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }),
    oneTimeCode: z.number({ required_error: 'One time code is required' }),
  }),
});

const createLoginZodSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }),
    password: z.string({ required_error: 'Password is required' }),
  }),
});

const createForgetPasswordZodSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }),
  }),
});

const resendOtpZodSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }),
  }),
});

const createResetPasswordZodSchema = z.object({
  body: z.object({
    newPassword: z.string({ required_error: 'Password is required' }),
    confirmPassword: z.string({
      required_error: 'Confirm Password is required',
    }),
  }),
});

const createChangePasswordZodSchema = z.object({
  body: z.object({
    currentPassword: z.string({
      required_error: 'Current Password is required',
    }),
    newPassword: z.string({ required_error: 'New Password is required' }),
    confirmPassword: z.string({
      required_error: 'Confirm Password is required',
    }),
  }),
});

const createSendOtpToPhoneZodSchema = z.object({
  body: z.object({
    phoneNumber: z.string({ required_error: 'Phone number is required' }),
  }),
});

const createVerifyOtpForPhoneZodSchema = z.object({
  body: z.object({
    phoneNumber: z.string({ required_error: 'Phone number is required' }),
    otp: z.string({ required_error: 'OTP is required' }),
  }),
});

const deleteAccountZodSchema = z.object({
  body: z.object({
    password: z.string({ required_error: 'Password is required' }),
  }),
});

const updateUserAppIdZodSchema = z.object({
  body: z.object({
    appId: z.string({ required_error: 'App Id is required' }),
  }),
});
export const AuthValidation = {
  createVerifyEmailZodSchema,
  createForgetPasswordZodSchema,
  createLoginZodSchema,
  createResetPasswordZodSchema,
  createChangePasswordZodSchema,
  resendOtpZodSchema,
  createSendOtpToPhoneZodSchema,
  createVerifyOtpForPhoneZodSchema,
  deleteAccountZodSchema,
  updateUserAppIdZodSchema,
};
