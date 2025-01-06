import { Model, Types } from 'mongoose';

export type IProduct = {
  _id: Types.ObjectId;
  name: string;
  image: string;
  description?: string;
  hourlyRate: number;
  minHours: number;
  dailyRate: number;
  minDays: number;
  quantity?: number;
  categories: [Types.ObjectId];
  vendor: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type IProductFilterableFields = {
  searchTerm?: string;
  categories?: string[];
};
export type ProductModel = Model<IProduct>;
