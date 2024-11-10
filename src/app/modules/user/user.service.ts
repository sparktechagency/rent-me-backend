import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import { USER_ROLES } from '../../../enums/user';
import ApiError from '../../../errors/ApiError';
import { emailHelper } from '../../../helpers/emailHelper';
import { emailTemplate } from '../../../shared/emailTemplate';
import generateOTP from '../../../util/generateOTP';
import { IUser, IUserFilters } from './user.interface';
import { User } from './user.model';
import mongoose from 'mongoose';
import { generateCustomIdBasedOnRole } from './user.utils';
import { Admin } from '../admin/admin.model';
import { Customer } from '../customer/customer.model';
import { Vendor } from '../vendor/vendor.model';
import { userSearchableFields } from './user.constants';

const createUserToDB = async (payload: Partial<IUser>): Promise<IUser> => {
  const { ...user } = payload;

  let newUserData = null;
  let createdUser;

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const id = await generateCustomIdBasedOnRole(user?.role!);
    user.id = id as string;

    if (user?.role === USER_ROLES.ADMIN) {
      createdUser = await Admin.create([user], { session });
      if (!createdUser?.length) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create Admin');
      }

      //assign admin mongoDB id to user
      user.admin = createdUser[0]._id;
    } else if (user?.role === USER_ROLES.CUSTOMER) {
      createdUser = await Customer.create([user], { session });
      if (!createdUser?.length) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Failed to create Customer'
        );
      }

      //assign customer mongoDB id to user
      user.customer = createdUser[0]._id;
    } else if (user?.role === USER_ROLES.VENDOR) {
      createdUser = await Vendor.create([user], { session });
      if (!createdUser?.length) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create Vendor');
      }

      //assign vendor mongoDB id to user
      user.vendor = createdUser[0]._id;
    }

    const newUser = await User.create([user], { session });
    if (!newUser?.length) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create User');
    }

    newUserData = newUser[0];

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }

  if (newUserData) {
    newUserData = await User.findOne({ _id: newUserData._id })
      .populate('admin')
      .populate('customer')
      .populate('vendor');
  }

  //send email
  const otp = generateOTP();
  const values = {
    name: createdUser![0].name,
    otp: otp,
    email: newUserData!.email!,
  };

  const createAccountTemplate = emailTemplate.createAccount(values);
  emailHelper.sendEmail(createAccountTemplate);

  //save to DB
  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 3 * 60000),
  };
  await User.findOneAndUpdate(
    { _id: newUserData!._id },
    { $set: { authentication } }
  );

  return newUserData!;
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

const getAllUser = async (filters: IUserFilters): Promise<Partial<IUser>[]> => {
  const { searchTerm, ...filtersData } = filters;

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
  const whereConditions = andCondition.length > 0 ? { $and: andCondition } : {};

  const result = await User.find(whereConditions)
    .populate('admin')
    .populate('customer')
    .populate('vendor');

  return result;
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
