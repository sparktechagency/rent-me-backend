import { model, Schema } from 'mongoose';
import { BookmarkModel, IBookmark } from './bookmark.interface';

const bookmarkSchema = new Schema<IBookmark, BookmarkModel>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: 'User' },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Bookmark = model<IBookmark, BookmarkModel>(
  'Bookmark',
  bookmarkSchema
);
