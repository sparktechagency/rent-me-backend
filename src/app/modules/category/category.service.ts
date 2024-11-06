import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { ICategory } from './category.interface';
import { Category } from './category.model';

const createCategory = async (payload: ICategory): Promise<ICategory> => {
  const createCategory = await Category.create(payload);
  if (!createCategory) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create category');
  }
  return createCategory;
};

const getAllCategory = async (): Promise<ICategory[] | null> => {
  const allCategory = await Category.find();
  if (!allCategory) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get all category');
  }
  return allCategory;
};

const getSingleCategory = async (id: string): Promise<ICategory | null> => {
  const getCategory = await Category.findById(id);
  if (!getCategory) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get category');
  }
  return getCategory;
};

const deleteCategory = async (id: string): Promise<ICategory | null> => {
  const deleteCategory = await Category.findByIdAndDelete(id);
  if (!deleteCategory) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete category');
  }
  return deleteCategory;
};

const updateCategory = async (
  id: string,
  payload: ICategory
): Promise<ICategory> => {
  const updateCategory = await Category.findByIdAndUpdate(id, payload, {
    new: true,
  });
  if (!updateCategory) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update category');
  }
  return updateCategory;
};

export const CategoryService = {
  createCategory,
  getAllCategory,
  getSingleCategory,
  deleteCategory,
  updateCategory,
};
