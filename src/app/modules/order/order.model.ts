import { model, Schema } from 'mongoose';
import { IOrder, IOrderModel } from './order.interface';

const orderSchema = new Schema<IOrder, IOrderModel>(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    packageId: {
      type: Schema.Types.ObjectId,
      ref: 'Package',
      required: true,
    },
    amount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: [
        'pending',
        'accepted',
        'ongoing',
        'rejected',
        'completed',
        'decline',
      ],
      default: 'pending',
    },
    preference: {
      type: String,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'half', 'full'],
      default: 'pending',
    },
    offeredAmount: {
      type: Number,
      required: true,
    },
    deliveryLocation: {
      type: { type: String, default: 'Point', enum: ['Point'] },
      coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude] // Default to [0, 0] if coordinates are not provided
    },
    deliveryAddress: {
      type: String,
      required: true,
    },
    // serviceDate: { type: String, required: true },
    serviceStartDateTime: { type: Date, required: true },
    serviceEndDateTime: { type: Date, required: true },

    isDeliveryDecline: {
      type: Boolean,
      default: false,
    },
    deliveryDeclineMessage: {
      type: String,
    },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

export const Order = model<IOrder, IOrderModel>('Order', orderSchema);
