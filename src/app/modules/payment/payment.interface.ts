import { Model, Types } from 'mongoose';

export type IPayment = {
  orderId: Types.ObjectId;
  customerId: Types.ObjectId;
  vendorId: Types.ObjectId;
  amount: number;
  currency: string;
  status: string;
  stripePaymentSessionId: string;
  stripePaymentIntentId: string;
  stripeTransferId: string;
  applicationFee: number;
  isInstantTransfer: boolean;
  instantTransferFee: number;
};

export type PaymentModel = Model<IPayment>;
