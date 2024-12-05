import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Package } from './package.model';
import { IPackage } from './package.interface';

import { Service } from '../service/service.model';
import { JwtPayload } from 'jsonwebtoken';

import mongoose from 'mongoose';

const createPackage = async (
  user: JwtPayload,
  payload: IPackage
): Promise<IPackage> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Set vendor ID
    payload.vendorId = user.userId;

    // Check if service exists
    const isServiceExist = await Service.findById(payload.serviceId).session(
      session
    );
    if (!isServiceExist) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Service does not exist');
    }

    // Create the package
    const createdPackage = await Package.create([{ ...payload }], { session });
    if (!createdPackage?.length) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create package');
    }

    // Add package ID to the service's packages field
    await Service.findByIdAndUpdate(
      payload.serviceId,
      { $push: { packages: createdPackage[0]._id } },
      { new: true, session }
    );

    // Commit the transaction
    await session.commitTransaction();
    return createdPackage[0];
  } catch (error) {
    await session.abortTransaction();
    throw error; // Rethrow the error for the caller to handle
  } finally {
    session.endSession();
  }
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

const deletePackage = async (
  user: JwtPayload,
  packageId: string
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the package
    const packageToDelete = await Package.findById(packageId);
    if (!packageToDelete) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Package not found');
    }

    // Ensure the package belongs to the vendor
    if (packageToDelete.vendorId.toString() !== user.userId) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'You are not authorized to delete this package'
      );
    }

    // Remove the package from the service's packages field
    await Service.findByIdAndUpdate(
      packageToDelete.serviceId,
      { $pull: { packages: packageId } },
      { new: true, session }
    );

    // Delete the package
    await Package.findByIdAndDelete(packageId, { session });

    // Commit the transaction
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error; // Rethrow the error for the caller to handle
  } finally {
    session.endSession();
  }
};

export const PackageService = {
  createPackage,
  updatePackage,
  getSinglePackage,
  deletePackage,
};
