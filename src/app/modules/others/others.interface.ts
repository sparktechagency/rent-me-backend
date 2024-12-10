import { Model, Types } from 'mongoose';

export type IPrivacyPolicy = {
  content: string;
  userType: 'CUSTOMER' | 'VENDOR' | 'USER';
};

export type ITermsAndConditions = {
  content: string;
  userType: 'CUSTOMER' | 'VENDOR' | 'USER';
};

export type IFaQs = {
  content: string;
  userType: 'CUSTOMER' | 'VENDOR' | 'USER';
};

export type IBanner = {
  title: string;
  description: string;
  link?: string;
  isActive: boolean;
  btnText: string;
  imgUrl: string;
  createdBy: Types.ObjectId;
};

export type PrivacyPolicyModel = Model<IPrivacyPolicy>;
export type TermsAndConditionsModel = Model<ITermsAndConditions>;
export type FaQsModel = Model<IFaQs>;
export type BannerModel = Model<IBanner>;
