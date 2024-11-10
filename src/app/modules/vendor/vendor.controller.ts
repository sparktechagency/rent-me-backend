import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import { IVendor } from './vendor.interface';
import sendResponse from '../../../shared/sendResponse';
import { VendorService } from './vendor.service';
import { Request, Response } from 'express';

const updateVendorProfile = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;

  let profileImg;
  if (req.files && 'image' in req.files && req.files.image[0]) {
    profileImg = `/images/${req.files.image[0].filename}`;
  }

  const data = {
    profileImg,
    ...req.body,
  };
  console.log(data);
  const result = await VendorService.updateVendorProfile(user, data);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Vendor profile updated successfully',
    data: result,
  });
});

const getVendorProfile = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;

  const result = await VendorService.getVendorProfile(user);
  sendResponse<IVendor | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Vendor profile retrieved successfully',
    data: result,
  });
});

const getSingleVendor = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await VendorService.getSingleVendor(id);
  sendResponse<IVendor | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Vendor retrieved successfully',
    data: result,
  });
});

const deleteVendorProfile = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await VendorService.deleteVendorProfile(user);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Profile deleted successfully',
    data: result,
  });
});

export const VendorController = {
  updateVendorProfile,
  getVendorProfile,
  getSingleVendor,
  deleteVendorProfile,
};
