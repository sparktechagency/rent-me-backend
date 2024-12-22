import { z } from 'zod';

// Reusable address schema

// Social links schema

const updateAddressSchema = z
  .object({
    street: z.string().optional(),
    apartmentOrSuite: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().default('United States').optional(),
  })
  .optional();

// Social links schema
const updateSocialLinksSchema = z.object({
  facebook: z.string().url('Invalid URL').optional(),
  instagram: z.string().url('Invalid URL').optional(),
  twitter: z.string().url('Invalid URL').optional(),
  linkedin: z.string().url('Invalid URL').optional(),
  website: z.string().url('Invalid URL').optional(),
});

const updateVendorZodSchema = z.object({
  name: z.string().optional(),
  contact: z.string().optional(),
  profileImg: z.string().optional(),
  address: updateAddressSchema,
  location: z
    .object({
      type: z.literal('Point'), // Ensure the type is 'Point' (GeoJSON requirement)
      coordinates: z
        .array(z.number()) // Array of two numbers (longitude, latitude)
        .length(2) // Ensure the array has exactly two numbers (longitude, latitude)
        .optional(), // The coordinates are optional
    })
    .optional(),
});

// Main Vendor schema
const getBusinessInformationFromVendor = z.object({
  // Business Information
  businessTitle: z.string(),
  businessType: z.enum([
    'Party Rentals',
    'Event Planning',
    'Catering',
    'Entertainment',
    'Other',
  ]),

  businessAddress: updateAddressSchema.optional(),
  businessContact: z.string().optional(),
  businessEmail: z.string().email('Invalid email address').optional(),
  socialLinks: updateSocialLinksSchema.optional(),
  yearsInBusiness: z.number().optional(),
  isLicensed: z.boolean().default(false),
  license: z.string().optional(),
  description: z.string().optional(),
  availableDays: z
    .array(
      z.enum([
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ])
    )
    .optional(),
  operationStartTime: z.string().optional(),
  operationEndTime: z.string().optional(),

  // Bank Information (Sensitive fields, typically excluded from responses)
  bankName: z.string().optional(),
  bankAccountName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankAccountType: z.string().optional(),
  bankRoutingNumber: z.string().optional(),

  // Signature
  signatureType: z.enum(['Typed', 'Digital']).optional(),
  signature: z.string().optional(),
});

export const VendorValidation = {
  updateVendorZodSchema,
  getBusinessInformationFromVendor,
};
