import { Model } from 'mongoose';

export type ICategory = {
  name: string;
  description: string;
  image: string;
};

export type ICategoryModel = Model<ICategory>;
