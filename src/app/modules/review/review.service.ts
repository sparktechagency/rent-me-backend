import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { IReview } from './review.interface';
import { Review } from './review.model';
import mongoose from 'mongoose';
import { Vendor } from '../vendor/vendor.model';
import { IPaginationOptions } from '../../../types/pagination';
import { paginationHelper } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../types/response';
import { Order } from '../order/order.model';
import { sendNotification } from '../../../helpers/sendNotificationHelper';
import { USER_ROLES } from '../../../enums/user';

const createReview = async (payload: IReview): Promise<IReview | null> => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const order = await Order.findById(payload.orderId);

    if (!order) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Order not found');
    }

    const vendor = await Vendor.findById(order.vendorId);

    if (!vendor) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Vendor not found');
    }

    const vendorId = vendor._id;

    const createdReview = await Review.create(
      [
        {
          customerId: order.customerId,
          vendorId: order.vendorId,
          serviceId: order.serviceId,
          packageId: order.packageId,
          orderId: order._id,
          rating: payload.rating,
          comment: payload.comment,
        },
      ],
      { session }
    );
    if (!createdReview.length) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create review');
    }
    const avgRating = await Review.aggregate([
      {
        $match: { vendorId }, // Filter reviews by the userId
      },
      {
        $group: {
          _id: '$vendorId', // Group by userId
          avgRating: { $avg: '$rating' }, // Calculate the average rating
        },
      },
    ]);

    const vendorRating = Number(avgRating[0]?.avgRating.toFixed(2));
    vendor.rating = vendorRating || payload.rating;
    vendor.totalReviews = vendor.totalReviews + 1;

    await Order.updateOne(
      { _id: order._id },
      { $set: { review: createdReview[0]._id } },
      { session }
    );

    await Vendor.findByIdAndUpdate(
      vendorId,
      { $set: { rating: vendor.rating, totalReviews: vendor.totalReviews } },
      { session }
    );

    const notificationData = {
      userId: vendorId,
      title: `For order #${order.orderId}, a new review has been received with a rating of ${payload.rating}.`,
      message: `Customer message: ${payload.comment}`,
      type: USER_ROLES.VENDOR,
    };

    // sendNotification('notification', vendorId, notificationData);
    await sendNotification('getNotification', vendorId, notificationData);

    await session.commitTransaction();
    session.endSession();

    return createdReview[0];
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const getAllReviewsForVendorById = async (
  id: string,
  paginationOptions: IPaginationOptions,
  packageId?: string
): Promise<IGenericResponse<IReview[]> | null> => {
  const filter: { vendorId: string; packageId?: string } = { vendorId: id };
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);

  if (packageId) {
    filter.packageId = packageId;
  }

  // Find reviews based on the constructed filter
  const result = await Review.find(filter, { rating: 1, comment: 1 })
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit);

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get all reviews');
  }
  const total = await Review.countDocuments(filter);
  return {
    meta: {
      page,
      limit,
      total: total,
      totalPage: Math.ceil(result.length / limit),
    },
    data: result,
  };
};

const getSingleReview = async (id: string): Promise<IReview | null> => {
  const result = await Review.findById(id)
    .populate('customerId')
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
  const isReviewExist = await Review.findById(id);
  if (!isReviewExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found');
  }
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const vendor = await Vendor.findById(isReviewExist.vendorId);

    if (!vendor) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Vendor not found');
    }

    const vendorId = vendor._id;

    const avgRating = await Review.aggregate([
      {
        $match: { vendorId }, // Filter reviews by the userId
      },
      {
        $group: {
          _id: '$vendorId', // Group by userId
          avgRating: { $avg: '$rating' }, // Calculate the average rating
        },
      },
    ]);

    const updatedRating = Number(avgRating[0]?.avgRating.toFixed(2));
    vendor.rating = updatedRating;
    vendor.totalReviews = vendor.totalReviews - 1;

    await vendor.save({ session });

    const deleteReview = await Review.findByIdAndDelete(id);
    if (!createReview) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create review');
    }

    await session.commitTransaction();
    session.endSession();

    return deleteReview;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const ReviewService = {
  createReview,
  getAllReviewsForVendorById,
  getSingleReview,
  updateReview,
  deleteReview,
};
