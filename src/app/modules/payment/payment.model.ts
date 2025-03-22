import { model, Schema } from 'mongoose';
import { IPayment, PaymentModel } from './payment.interface';

const paymentSchema = new Schema<IPayment, PaymentModel>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'usd' },
    status: {
      type: String,
      enum: ['initiated', 'succeeded', 'failed', 'refunded', 'canceled'],
      default: 'initiated',
    },
    stripePaymentSessionId: { type: String },
    stripePaymentIntentId: { type: String },
    stripeTransferId: { type: String },
    stripePayoutId: { type: String },
    applicationFee: { type: Number, default: 0 },
    isInstantTransfer: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Payment = model('Payment', paymentSchema);
