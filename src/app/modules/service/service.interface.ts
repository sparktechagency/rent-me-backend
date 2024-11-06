import { Model, Types } from 'mongoose';

export type IService = {
  vendorId: Types.ObjectId;
  title: string;
  description: string;
  estBudget: number;
  productDimension: string;
  categoryId: Types.ObjectId;
  cover: string;
};

export type ServiceModel = Model<IService>;
