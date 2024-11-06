import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { IService } from './service.interface';
import { ServiceServices } from './service.service';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';

const createService = catchAsync(async (req: Request, res: Response) => {
  const serviceData = JSON.parse(req.body.data);

  let cover;
  if (req.files && 'image' in req.files && req.files.image[0]) {
    cover = `/images/${req.files.image[0].filename}`;
  }

  const data: IService = {
    ...serviceData,
    cover,
  };

  const result = await ServiceServices.createService(data);
  sendResponse<IService>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service created successfully',
    data: result,
  });
});

const getSingleService = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ServiceServices.getSingleService(id);
  sendResponse<IService | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service retrieved successfully',
    data: result,
  });
});

//search Filter and pagination needed
const getAllService = catchAsync(async (req: Request, res: Response) => {
  const result = await ServiceServices.getAllService();
  sendResponse<IService[] | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All service retrieved successfully',
    data: result,
  });
});

const updateService = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const serviceData = JSON.parse(req.body?.data);

  let cover;
  if (req.files && 'image' in req.files && req.files.image[0]) {
    cover = `/images/${req.files.image[0].filename}`;
  }

  const data: IService = {
    ...serviceData,
    cover,
  };
  console.log(data);
  const result = await ServiceServices.updateService(id, data);
  sendResponse<IService | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service updated successfully',
    data: result,
  });
});

const deleteService = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ServiceServices.deleteService(id);
  sendResponse<IService | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Service deleted successfully',
    data: result,
  });
});

export const ServiceController = {
  createService,
  getSingleService,
  getAllService,
  updateService,
  deleteService,
};
