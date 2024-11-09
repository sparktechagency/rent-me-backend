import { Model, Types } from 'mongoose';

export type IReview = {
  customerId: Types.ObjectId; //replace with customerId
  vendorId: Types.ObjectId;
  rating: number;
  comment: string;
};

export type IReviewModel = Model<IReview>;
