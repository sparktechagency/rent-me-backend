import { Schema, model } from 'mongoose';
import { IProduct, ProductModel } from './product.interface';

const productSchema = new Schema<IProduct, ProductModel>({
  name: { type: String, required: true },
  image: { type: String, required: true },
  description: { type: String },
  hourlyRate: { type: Number, required: true },
  minHours: { type: Number, required: true },
  dailyRate: { type: Number, required: true },
  minDays: { type: Number, required: true },
  quantity: { type: Number },
  isDeleted: { type: Boolean, default: false },
  // categories: [
  //   { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  // ],
  vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
});

export const Product = model<IProduct, ProductModel>('Product', productSchema);
