import { model, Schema } from 'mongoose';
import { IService, ServiceModel } from './service.interface';

const serviceSchema = new Schema<IService, ServiceModel>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true },
    description: { type: String, required: true },
    estBudget: { type: Number, required: true },
    productDimension: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
    cover: { type: String, required: true },
  },
  { timestamps: true }
);

export const Service = model<IService, ServiceModel>('Service', serviceSchema);
