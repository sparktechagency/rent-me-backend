import { paginationFields } from './../../../types/pagination';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import { IVendor } from './vendor.interface';
import sendResponse from '../../../shared/sendResponse';
import { VendorService } from './vendor.service';
import { Request, Response } from 'express';
import { vendorFilterableFields } from './vendor.constants';
import pick from '../../../shared/pick';
import { Express } from 'express';
import { Types } from 'mongoose';

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

  const result = await VendorService.updateVendorProfile(user, data);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Vendor profile updated successfully',
    data: result,
  });
});

const getBusinessInformationFromVendor = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    const vendorData = { ...req.body };

    // Define the expected structure of req.files
    type UploadedFiles = {
      [fieldname: string]: Express.Multer.File[];
    };

    const files = req.files as UploadedFiles;

    // Map field names to corresponding keys in vendorData
    const fileMappings: { [key: string]: string } = {
      businessProfile: 'businessProfile',
      license: 'license',
      signature: 'digitalSignature',
    };

    Object.entries(fileMappings).forEach(([field, key]) => {
      if (files && files[field] && files[field][0]) {
        vendorData[key] = `/images/${files[field][0].filename}`;
      }
    });

    const result = await VendorService.getBusinessInformationFromVendor(
      user,
      vendorData
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Business information updated successfully',
      data: result,
    });
  }
);

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
  const result = await VendorService.getSingleVendor(new Types.ObjectId(id));
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

//get all vendor
const getAllVendor = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, vendorFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);
  const user = req.user;
  const result = await VendorService.getAllVendor(
    filters,
    paginationOptions,
    user
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All vendor retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

//Statistics part begins here

const getVendorRevenue = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const { range } = req.query as { range: string };

  const result = await VendorService.getVendorRevenue(user, range);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Vendor revenue statistics retrieved successfully',
    data: result,
  });
});

const getVendorOrders = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const { range } = req.query as { range: string };

  const result = await VendorService.getVendorOrders(user, range);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Vendor orders statistics retrieved successfully',
    data: result,
  });
});

const getCustomerRetentionData = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    const { range } = req.query as { range: string };
    const result = await VendorService.getOrderRetentionByVendor(user, range);
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Customer retention data retrieved successfully',
      data: result,
    });
  }
);
export const VendorController = {
  updateVendorProfile,
  getVendorProfile,
  getSingleVendor,
  deleteVendorProfile,
  getAllVendor,
  getVendorRevenue,
  getVendorOrders,
  getCustomerRetentionData,
  getBusinessInformationFromVendor,
};
