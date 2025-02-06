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
    },
    packageId: {
      type: Schema.Types.ObjectId,
      ref: 'Package',
    },
    isCustomOrder: {
      type: Boolean,
      default: false,
    },
    products: {
      type: [
        {
          product: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
          },
          quantity: {
            type: Number,
            default: 1,
          },
          price: {
            type: Number,
            default: 0,
          },
        },
      ],
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
        'rejected',
        'declined',
        'cancelled',
        'started',
        'ongoing',
        'completed',
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
    },
    deliveryLocation: {
      type: { type: String, default: 'Point', enum: ['Point'] },
      coordinates: { type: [Number], required: true }, // [longitude, latitude] // Default to [0, 0] if coordinates are not provided
    },
    deliveryAddress: {
      type: String,
      required: true,
    },

    isSetup: { type: Boolean, default: false },
    setupFee: { type: Number },
    setupDuration: { type: String },
    setupStartDateAndTime: { type: Date },
    deliveryDateAndTime: { type: Date },
    deliveryFee: { type: Number, default: 0 },
    isInstantTransfer: {
      type: Boolean,
      default: false,
    },
    isDeliveryDecline: {
      type: Boolean,
      default: false,
    },
    deliveryDeclineMessage: {
      type: String,
    },
    review: {
      type: Schema.Types.ObjectId,
      ref: 'Review',
    },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

export const Order = model<IOrder, IOrderModel>('Order', orderSchema);
