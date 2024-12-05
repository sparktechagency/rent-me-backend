import { model, Schema } from 'mongoose';
import { IService, ServiceModel } from './service.interface';

const serviceSchema = new Schema<IService, ServiceModel>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    estBudget: { type: Number, required: true },
    packages: [{ type: Schema.Types.ObjectId, ref: 'Package', required: true }],
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    cover: { type: String },
  },
  { timestamps: true }
);

export const Service = model<IService, ServiceModel>('Service', serviceSchema);
