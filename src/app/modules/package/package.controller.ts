import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { IPackage } from './package.interface';
import { PackageService } from './package.service';
import { StatusCodes } from 'http-status-codes';

const createPackage = catchAsync(async (req: Request, res: Response) => {
  const { ...packageData } = req.body;
  const { userId } = req.user;
  const result = await PackageService.createPackage(userId, packageData);
  sendResponse<IPackage | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Package created successfully',
    data: result,
  });
});

const updatePackage = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { ...packageData } = req.body;
  const result = await PackageService.updatePackage(id, packageData);
  sendResponse<IPackage | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Package updated successfully',
    data: result,
  });
});

const getSinglePackage = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await PackageService.getSinglePackage(id);
  sendResponse<IPackage | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Package retrieved successfully',
    data: result,
  });
});

const deletePackage = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await PackageService.deletePackage(id);
  sendResponse<IPackage | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Package deleted successfully',
    data: result,
  });
});

export const PackageController = {
  createPackage,
  updatePackage,
  getSinglePackage,
  deletePackage,
};
