import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { IService, IServiceFilters } from './service.interface';
import { ServiceServices } from './service.service';
import { StatusCodes } from 'http-status-codes';
import pick from '../../../shared/pick';
import { serviceFilterableFields } from './service.constants';
import { IPackage } from '../package/package.interface';

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
  const filters = pick(req.query, serviceFilterableFields);

  const result = await ServiceServices.getAllService(filters);
  sendResponse<IService[] | null>(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All service retrieved successfully',
    data: result,
  });
});

const createService = catchAsync(async (req: Request, res: Response) => {
  const serviceData = req?.body;
  const { userId } = req.user;
  serviceData.vendorId = userId;

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

const updateService = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const serviceData = req.body;

  let cover;
  if (req.files && 'image' in req.files && req.files.image[0]) {
    cover = `/images/${req.files.image[0].filename}`;
  }

  const data: IService = {
    ...serviceData,
    cover,
  };

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

const getAllPackageByServiceId = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await ServiceServices.getAllPackageByServiceId(id);
    sendResponse<IPackage[]>(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Packages retrieved successfully',
      data: result,
    });
  }
);

const getAllServiceByVendorId = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await ServiceServices.getAllServiceByVendorId(id);
    sendResponse<IService[]>(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Services retrieved successfully',
      data: result,
    });
  }
);

export const ServiceController = {
  createService,
  getSingleService,
  getAllService,
  updateService,
  deleteService,
  getAllPackageByServiceId,
  getAllServiceByVendorId,
};
