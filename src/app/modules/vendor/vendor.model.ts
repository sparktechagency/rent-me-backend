import { model, Schema } from 'mongoose';
import { IVendor, VendorModel } from './vendor.interface';

const vendorSchema = new Schema<IVendor, VendorModel>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    contact: {
      type: String,
      default: '',
    },
    isContactVerified: {
      type: Boolean,
      default: false,
    },
    profileImg: {
      type: String,
    },
    verifiedFlag: {
      type: Boolean,
      default: false,
    },
    address: {
      _id: false,
      type: {
        street: { type: String, required: true },
        apartmentOrSuite: { type: String },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zip: { type: String, required: true },
        country: { type: String, required: true, default: 'United States' },
      },
    },
    rating: {
      type: Number,
      default: 0,
      required: true,
    },
    totalReviews: {
      type: Number,
      default: 0,
      required: true,
    },
    orderCompleted: {
      type: Number,
      default: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },

    businessProfile: {
      type: String,
    },
    businessTitle: {
      type: String,
    },
    businessType: {
      type: String,
      enum: [
        'Party Rentals',
        'Event Planning',
        'Catering',
        'Entertainment',
        'Other',
      ],
    },
    profileCompletion: {
      type: Number,
      default: 0,
    },
    stripeId: {
      type: String,
    },
    stripeConnected: {
      type: Boolean,
      default: false,
    },
    businessAddress: {
      _id: false,
      type: {
        street: { type: String, required: true },
        apartmentOrSuite: { type: String },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zip: { type: String, required: true },
        country: { type: String, required: true, default: 'United States' },
      },
    },
    businessContact: {
      type: String,
    },
    isBusinessContactVerified: {
      type: Boolean,
      default: false,
    },
    businessEmail: {
      type: String,
    },
    isBusinessEmailVerified: {
      type: Boolean,
      default: false,
    },
    socialLinks: {
      _id: false,
      type: {
        facebook: { type: String },
        instagram: { type: String },
        twitter: { type: String },
        linkedin: { type: String },
        website: { type: String },
      },
    },
    yearsInBusiness: {
      type: Number,
    },
    isLicensed: {
      type: Boolean,
      default: false,
    },
    license: {
      type: String,
    },
    description: {
      type: String,
    },
    availableDays: {
      type: [String],
    },
    operationStartTime: {
      type: String,
    },
    operationEndTime: {
      type: String,
    },

    signatureType: {
      type: String,
      enum: ['Typed', 'Digital'],
    },

    signature: {
      type: String,
    },
    digitalSignature: {
      type: String,
    },
    location: {
      type: { type: String, default: 'Point', enum: ['Point'] },
      coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
    },
  },
  {
    timestamps: true,
  }
);
vendorSchema.index({ location: '2dsphere' });

export const Vendor = model<IVendor, VendorModel>('Vendor', vendorSchema);
