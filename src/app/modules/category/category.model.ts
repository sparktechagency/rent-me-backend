import { model, Schema } from 'mongoose';
import { ICategory } from './category.interface';

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
  },

  {
    timestamps: true,
  }
);

export const Category = model<ICategory>('Category', categorySchema);
