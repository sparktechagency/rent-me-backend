/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
import { StatusCodes } from 'http-status-codes';
import { USER_ROLES } from '../../../enums/user';
import ApiError from '../../../errors/ApiError';
import { emailHelper } from '../../../helpers/emailHelper';
import { emailTemplate } from '../../../shared/emailTemplate';
import generateOTP from '../../../util/generateOTP';
import { IUser, IUserFilters } from './user.interface';
import { User } from './user.model';
import mongoose, { SortOrder } from 'mongoose';
import { generateCustomIdBasedOnRole } from './user.utils';
import { Admin } from '../admin/admin.model';
import { Customer } from '../customer/customer.model';
import { Vendor } from '../vendor/vendor.model';
import { userSearchableFields } from './user.constants';
import { IPaginationOptions } from '../../../types/pagination';
import { paginationHelper } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../types/response';
import StripeService from '../payment/payment.stripe';

const createUserToDB = async (payload: Partial<IUser>): Promise<IUser> => {
  const { ...user } = payload;

  let newUserData = null;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Generate custom ID
    user.id = await generateCustomIdBasedOnRole(user.role!);

    // Create user role-specific data
    const createdUser = await createUserByRole(user, session);

    // Save user to DB
    const newUser = await User.create([user], { session });
    if (!newUser?.length) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create User');
    }

    newUserData = newUser[0];

    // Commit the transaction
    await session.commitTransaction();

    // Populate related fields after commit
    if (newUserData) {
      newUserData = await User.findOne({ _id: newUserData._id })
        .populate('admin')
        .populate('customer')
        .populate('vendor');
    }

    const otp = generateOTP();
    const values = {
      name: createdUser![0].name,
      otp,
      email: newUserData!.email!,
    };
    const createAccountTemplate = emailTemplate.createAccount(values);
    await emailHelper.sendEmail(createAccountTemplate);

    const authentication = {
      oneTimeCode: otp,
      expireAt: new Date(Date.now() + 3 * 60000),
    };
    await User.findOneAndUpdate(
      { _id: newUserData!._id },
      { $set: { authentication } }
    );

    return newUserData!;
  } catch (error) {
    await session.abortTransaction();
    throw error; // Rethrow error for upstream handling
  } finally {
    session.endSession(); // Ensure session cleanup
  }
};

// Helper to create user by role
const createUserByRole = async (
  user: Partial<IUser>,
  session: mongoose.ClientSession
) => {
  switch (user?.role) {
    case USER_ROLES.ADMIN: {
      const admin = await Admin.create([user], { session });
      if (!admin?.length) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create Admin');
      }
      user.admin = admin[0]._id;
      return admin;
    }
    case USER_ROLES.CUSTOMER: {
      const customer = await Customer.create([user], { session });
      if (!customer?.length) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Failed to create Customer'
        );
      }
      user.customer = customer[0]._id;
      return customer;
    }
    case USER_ROLES.VENDOR: {
      const account = await StripeService.createConnectedAccount(user.email!);
      user.stripeId = account.id;
      const vendor = await Vendor.create([user], { session });
      if (!vendor?.length) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create Vendor');
      }
      user.vendor = vendor[0]._id;
      return vendor;
    }
    default:
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid role');
  }
};

const updateUser = async (
  id: string,
  payload: Partial<IUser>
): Promise<IUser | null> => {
  const isExistUser = await User.findOne({ id: id });
  if (!isExistUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }

  const updateDoc = await User.findOneAndUpdate({ id: id }, payload, {
    new: true,
  });

  return updateDoc;
};

const getUserProfileFromDB = async (id: string): Promise<Partial<IUser>> => {
  const isExistUser = await User.findOne({ id: id })
    .populate('admin')
    .populate('customer')
    .populate('vendor')
    .lean();
  if (!isExistUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }

  return isExistUser;
};

const getAllUser = async (
  filters: IUserFilters,
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<IUser[]>> => {
  const { searchTerm, ...filtersData } = filters;
  const { page, limit, skip, sortOrder, sortBy } =
    paginationHelper.calculatePagination(paginationOptions);
  const andCondition = [];

  if (searchTerm) {
    andCondition.push({
      $or: userSearchableFields.map(field => ({
        [field]: {
          $regex: searchTerm,
          $options: 'i',
        },
      })),
    });
  }
  if (Object.keys(filtersData).length) {
    andCondition.push({
      $and: Object.entries(filtersData).map(([field, value]) => {
        const parsedValue = Number(value);
        return {
          [field]: !isNaN(parsedValue) ? parsedValue : value,
        };
      }),
    });
  }

  const sortConditions: { [key: string]: SortOrder } = {};
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder;
  }

  const whereConditions = andCondition.length > 0 ? { $and: andCondition } : {};

  const result = await User.find(whereConditions)
    .sort(sortConditions)
    .skip(skip)
    .limit(limit)
    .populate('admin')
    .populate('customer')
    .populate('vendor');

  const total = await User.countDocuments(whereConditions);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: result,
  };
};

const deleteUser = async (id: string): Promise<IUser | null> => {
  const isUserExists = await User.findOne({ id: id });
  if (!isUserExists) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }
  const updatedData = {
    status: 'delete',
  };

  const result = await User.findOneAndUpdate({ id: id }, updatedData, {
    new: true,
  });
  return result;
};

export const UserService = {
  createUserToDB,
  getUserProfileFromDB,
  updateUser,
  getAllUser,
  deleteUser,
};
