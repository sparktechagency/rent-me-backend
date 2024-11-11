import { model, Schema } from 'mongoose';
import { BookmarkModel, IBookmark } from './bookmark.interface';

const bookmarkSchema = new Schema<IBookmark, BookmarkModel>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
  },
  { timestamps: true }
);

export const Bookmark = model<IBookmark, BookmarkModel>(
  'Bookmark',
  bookmarkSchema
);
