import { Types } from 'mongoose';
import { Customer } from './customer.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { User } from '../user/user.model';
import { handleObjectUpdate } from '../vendor/vendor.utils';
import { IPaginationOptions } from '../../../types/pagination';
import { paginationHelper } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../types/response';
import { ICustomer } from './customer.interface';
import { calculateCustomerProfileCompletion } from './customer.utils';

const getCustomerProfile = async (id: Types.ObjectId) => {
  const customerId = new Types.ObjectId(id);

  const isUserExist = await User.findOne({ customer: customerId }).select('+appId').populate<{customer:ICustomer}>('customer').lean();

  if (!isUserExist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Requested profile doesn't exist!"
    );
  }

  return {...isUserExist.customer, appId: isUserExist.appId} as ICustomer;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const updateCustomerProfile = async (id: Types.ObjectId, payload: any) => {
  const { address,email, ...restData } = payload;


  console.log(payload);
  
  let updatedData = { ...restData };
  if (address && Object.keys(address).length > 0) {
    updatedData = handleObjectUpdate(address, restData, 'address');
  }

  const [isUserExist, isEmailExist] = await Promise.all([
    Customer.findById(id),
    email ? User.findOne({ email: email, status: ['active', 'restricted'], verified: true }) : Promise.resolve(null)
]);

  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }

  if (isEmailExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'An account with this email already exists. Please use a different email.');
  }

  const customer = await Customer.findOneAndUpdate(
    { _id: id },
    { $set: updatedData },
    {
      new: true,
    }
  );
  if (!customer) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update customer');
  }


  const profileCompletion = calculateCustomerProfileCompletion(customer);
  await User.findByIdAndUpdate(customer._id, {
    profileCompletion: profileCompletion,
    ...(email && {email:email}),
    verifiedFlag: customer.verifiedFlag
      ? customer.verifiedFlag // Keep it as is if already true
      : profileCompletion === 100, // Update to true only if completion is 100%
  });

  return customer;
};

const deleteCustomerProfile = async (id: Types.ObjectId) => {
  const isUserExist = await User.findById(id);
  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }
  const result = await User.findByIdAndUpdate(id, { status: 'delete' });

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete customer');
  }
  return 'Profile deleted successfully';
};

//Not needed for now
const getAllCustomer = async (
  paginationOption: IPaginationOptions
): Promise<IGenericResponse<ICustomer[]>> => {
  const { limit, page, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOption);

  const result = await Customer.find({})
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy]: sortOrder });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get all customer');
  }
  const total = await Customer.countDocuments();
  return {
    meta: {
      total: total,
      page,
      totalPage: Math.ceil(total / limit),
      limit,
    },
    data: result,
  };
};

const getSingleCustomer = async (id: Types.ObjectId) => {
  const customer = await User.findOne({ customer: id, status: 'active' });

  if (!customer) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Requested customer account is not found!'
    );
  }

  return customer.customer;
};

export const CustomerService = {
  getCustomerProfile,
  updateCustomerProfile,
  deleteCustomerProfile,
  getAllCustomer,
  getSingleCustomer,
};
