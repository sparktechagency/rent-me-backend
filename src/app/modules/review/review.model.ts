import { model, Schema } from 'mongoose';
import { IReview, IReviewModel } from './review.interface';

const reviewSchema = new Schema<IReview, IReviewModel>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    packageId: { type: Schema.Types.ObjectId, ref: 'Package', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export const Review = model<IReview, IReviewModel>('Review', reviewSchema);
