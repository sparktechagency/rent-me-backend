import { Schema } from 'mongoose';
import { model } from 'mongoose';
import { IOtp } from './otp.interface';

const otpSchema = new Schema<IOtp>(
  {
    phoneNumber: {
      type: String,
      required: true,
    },
    otp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    requestCount: {
      type: Number,
      required: true,
      default: 0,
    },
    lastRequestAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);
otpSchema.index({ phoneNumber: 1 });
otpSchema.index({ lastRequestAt: 1 }); // Index for quick lookup of rate-limiting info



export const Otp = model('Otp', otpSchema);
