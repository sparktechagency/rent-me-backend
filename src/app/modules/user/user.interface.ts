/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-unused-vars */
import { Model, Types } from 'mongoose';
import { ICustomer } from '../customer/customer.interface';
import { IVendor } from '../vendor/vendor.interface';
import { IAdmin } from '../admin/admin.interface';
import { USER_ROLES } from '../../../enums/user';

export type IUser = {
  _id: Types.ObjectId;
  id: string;
  email: string;
  password: string;
  customer?: Types.ObjectId | ICustomer;
  vendor?: Types.ObjectId | IVendor;
  admin?: Types.ObjectId | IAdmin;
  role: USER_ROLES;
  status: 'active' | 'restricted' | 'delete';

  verified: boolean;
  appId: string;
  wrongLoginAttempts: number;
  restrictionLeftAt: Date | null;
  authentication?: {
    passwordChangedAt: Date;
    isResetPassword: boolean;
    oneTimeCode: number;
    expireAt: Date;
  };
};

export type UserModel = {
  isExistUserById(id: string): any;
  isExistUserByEmail(email: string): any;
  isMatchPassword(password: string, hashPassword: string): boolean;
} & Model<IUser>;

export type IUserFilters = {
  searchTerm?: string;
  id?: string;
  role?: string;
  status?: string;
};
