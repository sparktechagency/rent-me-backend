import { Model, Types } from 'mongoose';

export type IBookmark = {
  vendorId: Types.ObjectId;
  userId: Types.ObjectId;
};

export type BookmarkModel = Model<IBookmark>;
