import { Request, Response } from 'express';
import { ProductServices } from './product.service';
import catchAsync from '../../../shared/catchAsync';
import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import pick from '../../../shared/pick';
import { productFilterableFields } from './product.constants';
import { paginationFields } from '../../../types/pagination';
import { S3Helper } from '../../../helpers/s3Helper';

const createProduct = catchAsync(async (req: Request, res: Response) => {
  const { user } = req;
  if (req.files && 'image' in req.files && req.files.image[0]) {
    req.body.image = await S3Helper.uploadToS3(req.files.image[0], 'products');
  }
  const result = await ProductServices.createProductToDB(user, req.body);
  res.status(StatusCodes.OK).json({
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Product created successfully',
    data: result,
  });
});

const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user;
  if (req.files && 'image' in req.files && req.files.image[0]) {
    req.body.image = await S3Helper.uploadToS3(req.files.image[0], 'products');
  }
  const result = await ProductServices.updateProductToDB(
    new Types.ObjectId(id),
    user,
    req.body
  );
  res.status(StatusCodes.OK).json({
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Product updated successfully',
    data: result,
  });
});

const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user;
  const result = await ProductServices.deleteProductFromDB(
    user,
    new Types.ObjectId(id)
  );
  res.status(StatusCodes.OK).json({
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Product deleted successfully',
    data: result,
  });
});

const getAllProduct = catchAsync(async (req: Request, res: Response) => {
  const filtersData = pick(req.query, productFilterableFields);
  const paginationData = pick(req.query, paginationFields);
  const result = await ProductServices.getAllProductFromDB(
    req.user,
    filtersData,
    paginationData
  );
  res.status(StatusCodes.OK).json({
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Product retrieved successfully',
    data: result,
  });
});

export const ProductController = {
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProduct,
};
