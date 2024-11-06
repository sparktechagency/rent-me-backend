import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { IService } from './service.interface';
import { Service } from './service.model';

const createService = async (data: IService): Promise<IService> => {
  const result = await Service.create(data);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create service');
  }
  return result;
};

//Filter and pagination needed
const getAllService = async (): Promise<IService[] | null> => {
  const result = await Service.find()
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

const deleteService = async (id: string): Promise<IService | null> => {
  const result = await Service.findByIdAndDelete(id);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete service');
  }
  return result;
};

export const ServiceServices = {
  createService,
  getAllService,
  getSingleService,
  updateService,
  deleteService,
};
