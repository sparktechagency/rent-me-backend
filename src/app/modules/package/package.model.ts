import { model, Schema } from 'mongoose';
import { IPackage, IPackageModel } from './package.interface';

const packageSchema = new Schema<IPackage, IPackageModel>(
  {
    title: {
      type: String,
      required: true,
    },
    features: {
      type: [String],
      required: true,
    },
    type: {
      type: String,
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
  },
  {
    timestamps: true,
  }
);

export const Package = model<IPackage, IPackageModel>('Package', packageSchema);
