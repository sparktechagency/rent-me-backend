import { z } from 'zod';

const createOrderZodSchema = z.object({
  body: z.object({
    vendorId: z.string().nonempty('Vendor ID is required'), // Expecting ObjectId as a string
    serviceId: z.string().nonempty('Service ID is required'), // Expecting ObjectId as a string
    packageId: z.string().nonempty('Package ID is required'), // Expecting ObjectId as a string
    // amount: z.number().min(0, 'Amount must be a positive number'),
    preference: z.string().optional(),
    offeredAmount: z
      .number()
      .min(0, 'Offered amount must be a positive number'),
    deliveryAddress: z.string().nonempty('Delivery address is required'),
    // serviceDate: z.string().transform(str => new Date(str)), // Expecting ISO date string
    // deliveryTime: z.string().transform(str => new Date(str)), // Expecting ISO time string
    serviceStartDateTime: z
      .string({ required_error: 'Service start time is required' })
      .transform(str => new Date(str)),
    serviceEndDateTime: z
      .string({ required_error: 'Service end time is required' })
      .transform(str => new Date(str)),
    deliveryFee: z.number().min(0).optional(),
  }),
});

const updateOrderStatusValidationForVendor = z.object({
  body: z.object({
    status: z.enum(['accepted', 'rejected'], {
      required_error: 'Status is required',
    }),
  }),
});

const updateOrderStatusValidationForCustomer = z.object({
  body: z.object({
    status: z.enum(['decline'], {
      required_error: 'Status is required',
    }),
    deliveryDeclineMessage: z.string().optional(),
  }),
});
export const OrderValidation = {
  createOrderZodSchema,
  updateOrderStatusValidationForVendor,
  updateOrderStatusValidationForCustomer,
};
