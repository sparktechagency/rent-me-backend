import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';

import { Service } from './service.model';
import { IService, IServiceFilters } from './service.interface';
import { serviceSearchableFields } from './service.constants';
import { User } from '../user/user.model';
import { Package } from '../package/package.model';
import { IPackage } from '../package/package.interface';
import mongoose, { Types } from 'mongoose';
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

  const result = await Service.find(whereConditions).populate('packages', {
    title: 1,
    features: 1,
    setupFee: 1,
    setupDuration: 1,
  });

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get all service');
  }
  return result;
};

const getSingleService = async (id: string): Promise<IService | null> => {
  const result = await Service.findById(id).populate('packages', {
    title: 1,
    features: 1,
    setupFee: 1,
    setupDuration: 1,
  });

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

  const vendor = await User.findOne({
    vendor: new Types.ObjectId(user.userId),
    status: 'active',
  });
  if (!vendor) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Vendor does not exist');
  }

  data.vendorId = user.userId;
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
  const result = await Service.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true }
  );
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
  .populate('packages', {
    title: 1,
    features: 1,
  });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get services');
  }
  return result;
};

const deleteService = async (
  id: string,
  user: JwtPayload
): Promise<IService | null> => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const service = await Service.findOne({ _id: id });

    if (!service) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Service does not exists');
    }

    if (service.vendorId.toString() !== user.userId) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'You are not authorized to delete this service'
      );
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
