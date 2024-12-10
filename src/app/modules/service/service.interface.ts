import { Model, Types } from 'mongoose';
import { IVendor } from '../vendor/vendor.interface';
import { ICategory } from '../category/category.interface';

export type IService = {
  vendorId: Types.ObjectId | IVendor;
  title: string;
  description: string;
  estBudget: number;
  packages: Types.ObjectId[];
  categoryId: Types.ObjectId | ICategory;
  cover: string;
};

export type ServiceModel = Model<IService>;

export type IServiceFilters = {
  searchTerm: string;
  estBudget?: number;
  title: string;
  categoryId: string;
  minEstBudget?: number;
  maxEstBudget?: number;
};
