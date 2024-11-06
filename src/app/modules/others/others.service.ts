//Privacy Policy

import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { FaQs, PrivacyPolicy, TermsAndCondition } from './others.model';
import { IFaQs, IPrivacyPolicy, ITermsAndConditions } from './others.interface';

const createPrivacyPolicy = async (
  payload: IPrivacyPolicy
): Promise<IPrivacyPolicy | null> => {
  const result = await PrivacyPolicy.create(payload);
  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to create privacy policy'
    );
  }
  return result;
};

const createTermsAndConditions = async (
  payload: ITermsAndConditions
): Promise<ITermsAndConditions | null> => {
  const result = await TermsAndCondition.create(payload);
  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to create terms and conditions'
    );
  }
  return result;
};

const createFaQs = async (payload: IFaQs): Promise<IFaQs | null> => {
  const result = await FaQs.create(payload);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create FaQs');
  }
  return result;
};
//need to update
const getPrivacyPolicy = async (
  type: string
): Promise<IPrivacyPolicy | null> => {
  const result = await PrivacyPolicy.findOne({ userType: type });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get privacy policy');
  }
  return result;
};

const getTermsAndConditions = async (
  type: string
): Promise<ITermsAndConditions | null> => {
  const result = await TermsAndCondition.findOne({ userType: type });
  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to get terms and conditions'
    );
  }
  return result;
};

const getFaQs = async (type: string): Promise<IFaQs | null> => {
  const result = await FaQs.findOne({ userType: type });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get FaQs');
  }
  return result;
};

const deletePrivacyPolicy = async (id: string) => {
  const result = await PrivacyPolicy.findByIdAndDelete(id);
  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to delete privacy policy'
    );
  }
  return result;
};

const deleteTermsAndConditions = async (id: string) => {
  const result = await TermsAndCondition.findByIdAndDelete(id);
  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to delete terms and conditions'
    );
  }
  return result;
};

const deleteFaQs = async (id: string) => {
  const result = await FaQs.findByIdAndDelete(id);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete FaQs');
  }
  return result;
};

export const OthersService = {
  createPrivacyPolicy,
  getPrivacyPolicy,
  deletePrivacyPolicy,
  createTermsAndConditions,
  getTermsAndConditions,
  deleteTermsAndConditions,
  createFaQs,
  getFaQs,
  deleteFaQs,
};
