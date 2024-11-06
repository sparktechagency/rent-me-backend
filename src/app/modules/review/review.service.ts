import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { IReview } from './review.interface';
import { Review } from './review.model';

const createReview = async (payload: IReview): Promise<IReview | null> => {
  const createReview = await Review.create(payload);
  if (!createReview) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create review');
  }
  return createReview;
};

const getAllReviews = async (id: string): Promise<IReview[] | null> => {
  const result = await Review.find({ vendorId: id })
    .populate('userId')
    .populate('serviceId')
    .populate('vendorId');
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get all reviews');
  }
  return result;
};
const getSingleReview = async (id: string): Promise<IReview | null> => {
  const result = await Review.findById(id)
    .populate('userId')
    .populate('serviceId')
    .populate('vendorId');
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get single review');
  }
  return result;
};

const updateReview = async (
  id: string,
  payload: IReview
): Promise<IReview | null> => {
  const result = await Review.findByIdAndUpdate(id, payload, { new: true });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update review');
  }
  return result;
};

const deleteReview = async (id: string): Promise<IReview | null> => {
  const result = await Review.findByIdAndDelete(id);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete review');
  }
  return result;
};

export const ReviewService = {
  createReview,
  getAllReviews,
  getSingleReview,
  updateReview,
  deleteReview,
};
