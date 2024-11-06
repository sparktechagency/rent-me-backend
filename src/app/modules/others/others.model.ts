import { model, Schema } from 'mongoose';
import {
  FaQsModel,
  IFaQs,
  IPrivacyPolicy,
  ITermsAndConditions,
  PrivacyPolicyModel,
  TermsAndConditionsModel,
} from './others.interface';

const privacyPolicySchema = new Schema<IPrivacyPolicy, PrivacyPolicyModel>(
  {
    content: {
      type: String,
      required: true,
    },
    userType: {
      type: String,
      enum: ['USER', 'VENDOR'],
      required: true,
    },
  },
  { timestamps: true }
);

const termsAndConditionSchema = new Schema<
  ITermsAndConditions,
  TermsAndConditionsModel
>(
  {
    content: {
      type: String,
      required: true,
    },
    userType: {
      type: String,
      enum: ['USER', 'VENDOR'],
      required: true,
    },
  },
  { timestamps: true }
);

const faqsSchema = new Schema<IFaQs, FaQsModel>(
  {
    content: {
      type: String,
      required: true,
    },
    userType: {
      type: String,
      enum: ['USER', 'VENDOR'],
      required: true,
    },
  },
  { timestamps: true }
);

export const PrivacyPolicy = model<IPrivacyPolicy, PrivacyPolicyModel>(
  'PrivacyPolicy',
  privacyPolicySchema
);

export const TermsAndCondition = model<
  ITermsAndConditions,
  TermsAndConditionsModel
>('TermsAndCondition', termsAndConditionSchema);

export const FaQs = model<IFaQs, FaQsModel>('FaQs', faqsSchema);
