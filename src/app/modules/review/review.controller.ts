import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import { ReviewService } from './review.service';
import { IReview } from './review.interface';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { paginationFields } from '../../../types/pagination';
import pick from '../../../shared/pick';

const createReview = catchAsync(async (req: Request, res: Response) => {
  const { ...reviewData } = req.body;
  const { userId } = req.user;
  reviewData.customerId = userId;

  const result = await ReviewService.createReview(reviewData);
  sendResponse<IReview | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Review created successfully',
    data: result,
  });
});

const updateReview = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const payload = req.body;
  const result = await ReviewService.updateReview(id, payload);
  sendResponse<IReview | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Review updated successfully',
    data: result,
  });
});

const getAllReviewsForVendorById = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { packageId } = req.query;
    const paginationOptions = pick(req.query, paginationFields);

    const result = await ReviewService.getAllReviewsForVendorById(
      id,
      paginationOptions,
      packageId as string
    );

    sendResponse<IReview[] | null>(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'All reviews retrieved successfully',
      meta: result?.meta,
      data: result?.data,
    });
  }
);

const getSingleReview = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ReviewService.getSingleReview(id);
  sendResponse<IReview | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Single review retrieved successfully',
    data: result,
  });
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ReviewService.deleteReview(id);
  sendResponse<IReview | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Review deleted successfully',
    data: result,
  });
});
export const ReviewController = {
  createReview,
  getAllReviewsForVendorById,
  getSingleReview,
  updateReview,
  deleteReview,
};
