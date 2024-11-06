import { Model } from 'mongoose';

export type ICategory = {
  name: string;
  description: string;
};

export type ICategoryModel = Model<ICategory>;
