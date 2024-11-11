import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { CategoryService } from './category.service';
import { Request, Response } from 'express';
import { ICategory } from './category.interface';

const createCategory = catchAsync(async (req: Request, res: Response) => {
  const categoryData = req?.body;

  let image;
  if (req.files && 'image' in req.files && req.files.image[0]) {
    image = `/images/${req.files.image[0].filename}`;
  }

  const data: ICategory = {
    ...categoryData,
    image,
  };
  const result = await CategoryService.createCategory(data);
  sendResponse<ICategory>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Category created successfully',
    data: result,
  });
});

const getCategoryById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CategoryService.getSingleCategory(id);
  sendResponse<ICategory | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Category retrieved successfully',
    data: result,
  });
});

const getAllCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.getAllCategory();
  sendResponse<ICategory[] | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All category retrieved successfully',
    data: result,
  });
});

const updateCategoryById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const categoryData = req?.body;

  let image;
  if (req.files && 'image' in req.files && req.files.image[0]) {
    image = `/images/${req.files.image[0].filename}`;
  }

  const data: ICategory = {
    ...categoryData,
    image,
  };
  const result = await CategoryService.updateCategory(id, data);
  sendResponse<ICategory | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Category updated successfully',
    data: result,
  });
});

const deleteCategoryById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CategoryService.deleteCategory(id);
  sendResponse<ICategory | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Category deleted successfully',
    data: result,
  });
});

export const CategoryController = {
  createCategory,
  getCategoryById,
  getAllCategory,
  updateCategoryById,
  deleteCategoryById,
};
