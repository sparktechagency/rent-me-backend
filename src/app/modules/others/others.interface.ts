import { Model } from 'mongoose';

export type IPrivacyPolicy = {
  content: string;
  userType: 'USER' | 'VENDOR';
};

export type ITermsAndConditions = {
  content: string;
  userType: 'USER' | 'VENDOR';
};

export type IFaQs = {
  content: string;
  userType: 'USER' | 'VENDOR';
};

export type PrivacyPolicyModel = Model<IPrivacyPolicy>;
export type TermsAndConditionsModel = Model<ITermsAndConditions>;
export type FaQsModel = Model<IFaQs>;
