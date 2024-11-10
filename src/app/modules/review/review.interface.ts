import { Model, Types } from 'mongoose';
import { IPackage } from '../package/package.interface';
import { ICustomer } from '../customer/customer.interface';

export type IReview = {
  customerId: Types.ObjectId | ICustomer; //replace with customerId
  vendorId: Types.ObjectId;
  rating: number;
  packageId: Types.ObjectId | IPackage;
  comment: string;
};

export type IReviewModel = Model<IReview>;
