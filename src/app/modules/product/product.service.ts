import { JwtPayload } from 'jsonwebtoken';
import { IProduct, IProductFilterableFields } from './product.interface';
import { Product } from './product.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { IPaginationOptions } from '../../../types/pagination';
import { paginationHelper } from '../../../helpers/paginationHelper';
import { Types } from 'mongoose';

const createProductToDB = async (user: JwtPayload, payload: IProduct) => {
  payload.vendor = user.userId;

  const product = await Product.create([payload]);
  if (product.length == 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create product');
  }
  return product;
};

const updateProductToDB = async (
  productId: Types.ObjectId,
  user: JwtPayload,
  payload: IProduct
) => {
  const isProductExist = await Product.findById(productId);
  if (!isProductExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Product not found');
  }

  const product = await Product.findByIdAndUpdate(
    productId,
    { $set: { ...payload } },
    {
      new: true,
    }
  );
  if (!product) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update product');
  }
  return product;
};

const deleteProductFromDB = async (
  user: JwtPayload,
  productId: Types.ObjectId
) => {
  const isProductExist = await Product.findOne({
    _id: productId,
    vendor: user.userId,
  });
  if (!isProductExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Product not found');
  }
  const product = await Product.findOneAndDelete({ _id: productId });
  if (!product) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete product');
  }
  return product;
};

const getAllProductFromDB = async (
  filters: IProductFilterableFields,
  paginationOptions: IPaginationOptions
) => {
  const { searchTerm, ...filtersData } = filters;
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);

  const andConditions = [];

  if (searchTerm) {
    andConditions.push({
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
      ],
    });
  }

  const products = await Product.find({
    $and: andConditions,
    ...filtersData,
  })
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit);

  const total = await Product.countDocuments({
    $and: andConditions,
    ...filtersData,
  });

  return {
    meta: {
      total,
      page,
      limit,
      totalPage: Math.ceil(total / limit),
    },
    data: products,
  };
};

export const ProductServices = {
  createProductToDB,
  updateProductToDB,
  deleteProductFromDB,
  getAllProductFromDB,
};
