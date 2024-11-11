import { Types } from 'mongoose';
import { Customer } from './customer.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { User } from '../user/user.model';

const getCustomerProfile = async (id: Types.ObjectId) => {
  const customerId = new Types.ObjectId(id);

  console.log('INN', customerId);

  const isUserExist = await User.findOne({ customer: customerId });

  if (!isUserExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Customer doesn't exist!");
  }
  if (isUserExist.status === 'delete') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Profile has been deleted');
  }

  const result = await Customer.findById({ _id: id });
  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to get customer profile'
    );
  }
  return result;
};

const updateCustomerProfile = async (id: Types.ObjectId, payload: any) => {
  const isUserExist = await Customer.findById(id);
  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }
  const result = await Customer.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update customer');
  }
  return result;
};

const deleteCustomerProfile = async (id: Types.ObjectId) => {
  const isUserExist = await User.findById(id);
  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }
  const result = await User.findByIdAndUpdate(
    { _id: id },
    { status: 'delete' }
  );

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete customer');
  }
  return 'Profile deleted successfully';
};

//Not needed for now
const getAllCustomer = async () => {
  const result = await Customer.find({});
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get all customer');
  }
  return result;
};

const getSingleCustomer = async (id: string) => {
  console.log('INNN2');

  const isDeleted = await User.findOne({ id: id });
  if (!isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User has been deleted');
  }

  const result = await Customer.findOne({ id: id });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get customer');
  }
  return result;
};

export const CustomerService = {
  getCustomerProfile,
  updateCustomerProfile,
  deleteCustomerProfile,
  getAllCustomer,
  getSingleCustomer,
};
