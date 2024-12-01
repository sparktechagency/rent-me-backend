import { model, Schema } from 'mongoose';
import { ITransfer } from './transfer.interface';

const transferSchema = new Schema<ITransfer>(
  {
    transferId: { type: String, required: true },
    payoutId: { type: String, required: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
  },
  { timestamps: true }
);

export const Transfer = model<ITransfer>('Transfer', transferSchema);
