import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';

import { Service } from './service.model';
import { IService, IServiceFilters } from './service.interface';
import { serviceSearchableFields } from './service.constants';
import { User } from '../user/user.model';
import { Package } from '../package/package.model';
import { IPackage } from '../package/package.interface';
import mongoose from 'mongoose';
import { JwtPayload } from 'jsonwebtoken';

//Filter and pagination needed
const getAllService = async (
  filters: Partial<IServiceFilters>
): Promise<IService[] | null> => {
  const { searchTerm, minEstBudget, maxEstBudget, ...filtersData } = filters;

  const andConditions = [];

  if (searchTerm) {
    andConditions.push({
      $or: serviceSearchableFields.map(field => ({
        [field]: {
          $regex: searchTerm,
          $options: 'i',
        },
      })),
    });
  }

  if (minEstBudget !== undefined || maxEstBudget !== undefined) {
    if (minEstBudget) {
      andConditions.push({
        estBudget: {
          $gte: Number(minEstBudget),
        },
      });
    }

    if (maxEstBudget) {
      andConditions.push({
        estBudget: {
          $lte: Number(maxEstBudget),
        },
      });
    }
  }
  if (Object.keys(filtersData).length) {
    andConditions.push({
      $and: Object.entries(filtersData).map(([field, value]) => {
        const parsedValue = Number(value);
        return {
          [field]: !isNaN(parsedValue) ? parsedValue : value,
        };
      }),
    });
  }

  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};

  const result = await Service.find(whereConditions)
    .populate('vendorId')
    .populate('categoryId');
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get all service');
  }
  return result;
};

const getSingleService = async (id: string): Promise<IService | null> => {
  const result = await Service.findById(id)
    .populate('vendorId')
    .populate('categoryId');
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get single service');
  }
  return result;
};

const createService = async (
  data: IService,
  user: JwtPayload
): Promise<IService> => {
  //check if the vendor exist and vendor is approved by admin
  const vendor = await User.findById({ vendor: user?.userId });
  if (!vendor) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Vendor does not exist');
  }
  if (!vendor?.approvedByAdmin) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You are not approved by admin yet'
    );
  }

  const result = await Service.create(data);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create service');
  }
  return result;
};
const updateService = async (
  id: string,
  data: IService
): Promise<IService | null> => {
  const result = await Service.findByIdAndUpdate(id, data, { new: true });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update service');
  }
  return result;
};

const getAllPackageByServiceId = async (id: string): Promise<IPackage[]> => {
  const result = await Package.find({ serviceId: id })
    .populate('vendorId')
    .populate('serviceId');
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get packages');
  }
  return result;
};

const getAllServiceByVendorId = async (id: string): Promise<IService[]> => {
  const result = await Service.find({ vendorId: id })
    .populate('categoryId')
    .populate('vendorId');
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get services');
  }
  return result;
};

const deleteService = async (id: string): Promise<IService | null> => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const service = await Service.findById(id);
    if (!service) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Service does not exists');
    }
    const result = await Service.findByIdAndDelete(id);
    if (!result) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete service');
    }

    // Delete all packages associated with the service
    const deletedPackages = await Package.deleteMany({ serviceId: id });
    if (!deletedPackages) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Failed to delete packages associated with the service'
      );
    }
    await session.commitTransaction();
    session.endSession();
    return result;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const ServiceServices = {
  createService,
  getAllService,
  getSingleService,
  updateService,
  deleteService,
  getAllPackageByServiceId,
  getAllServiceByVendorId,
};
