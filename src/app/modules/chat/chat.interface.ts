import { Model, Types } from 'mongoose';
import { IVendor } from '../vendor/vendor.interface';
import { ICustomer } from '../customer/customer.interface';
import { IUser } from '../user/user.interface';

export type IChat = {
  participants: [Types.ObjectId | IUser];
  latestMessage: Types.ObjectId;
  latestMessageTime: Date;
};

export type ChatModel = Model<IChat>;
