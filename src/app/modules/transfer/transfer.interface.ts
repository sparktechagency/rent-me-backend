import { Model, Types } from 'mongoose';

export type ITransfer = {
  transferId: string;
  payoutId: string;
  paymentId: Types.ObjectId;
};

export type ITransferDocument = Model<ITransfer>;
