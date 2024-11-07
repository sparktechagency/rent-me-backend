import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import { IVendor } from './vendor.interface';
import sendResponse from '../../../shared/sendResponse';
import { VendorService } from './vendor.service';
import { Request, Response } from 'express';

const updateVendor = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  let profile;
  if (req.files && 'image' in req.files && req.files.image[0]) {
    profile = `/images/${req.files.image[0].filename}`;
  }

  const data = {
    profile,
    ...req.body,
  };
  const result = await VendorService.updateVendor(user, data);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Vendor profile updated successfully',
    data: result,
  });
});

export const VendorController = {
  updateVendor,
};
