import { model, Schema } from 'mongoose';
import { IReview, IReviewModel } from './review.interface';

const reviewSchema = new Schema<IReview, IReviewModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    vendorId: { type: Schema.Types.ObjectId, ref: 'User' },
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service' },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export const Review = model<IReview, IReviewModel>('Review', reviewSchema);
