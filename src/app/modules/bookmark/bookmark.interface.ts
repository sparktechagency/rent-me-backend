import { Model, Types } from 'mongoose';

export type IBookmark = {
  vendorId: Types.ObjectId;
  customerId: Types.ObjectId;
};

export type BookmarkModel = Model<IBookmark>;
