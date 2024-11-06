import { Model, Types } from 'mongoose';

export type IReview = {
  userId: Types.ObjectId;
  vendorId: Types.ObjectId;
  serviceId: Types.ObjectId;
  rating: number;
  comment: string;
};

export type IReviewModel = Model<IReview>;
