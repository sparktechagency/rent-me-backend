import { Model, Types } from 'mongoose';

export type IAdmin = {
  _id: Types.ObjectId;
  id: string;
  name: string;
  email: string;
  contact: string;
  address: string;
  profileImg: string;
};

export type AdminModel = Model<IAdmin>;
