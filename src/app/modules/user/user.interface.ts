import { Model } from 'mongoose';
import { USER_ROLES } from '../../../enums/user';

type ILocation = {
  lat: number;
  lon: number;
};

export type IUser = {
  name: string;
  contact?: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'USER' | 'VENDOR';
  location?: ILocation;
  profile?: string;
  status: 'active' | 'delete';
  verified: boolean;
  address: string;
  authentication?: {
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
