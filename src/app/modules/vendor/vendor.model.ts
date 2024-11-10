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
    profileImg: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '',
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
    shopVisited: {
      type: Number,
      default: 0,
    },
    location: {
      type: {
        lat: {
          type: Number,
        },
        lng: {
          type: Number,
        },
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);

export const Vendor = model<IVendor, VendorModel>('Vendor', vendorSchema);
