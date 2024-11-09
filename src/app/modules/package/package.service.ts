import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Package } from './package.model';
import { IPackage } from './package.interface';
import { User } from '../user/user.model';
import { Types } from 'mongoose';

const createPackage = async (
  id: Types.ObjectId,
  payload: IPackage
): Promise<IPackage> => {
  payload.vendorId = id;
  const createPackage = await Package.create(payload);
  if (!createPackage) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create package');
  }
  return createPackage;
};

const updatePackage = async (
  id: string,
  payload: Partial<IPackage>
): Promise<IPackage | null> => {
  const ifExist = await Package.findById(id);
  if (!ifExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Package does not exist');
  }

  const result = await Package.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update package');
  }
  return result;
};

const getSinglePackage = async (id: string): Promise<IPackage | null> => {
  const result = await Package.findById(id);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get package');
  }
  return result;
};

const deletePackage = async (id: string): Promise<IPackage | null> => {
  const result = await Package.findByIdAndDelete(id);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete package');
  }
  return result;
};

export const PackageService = {
  createPackage,
  updatePackage,
  getSinglePackage,
  deletePackage,
};
