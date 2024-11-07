import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Vendor } from './vendor.model';
import { IVendor } from './vendor.interface';
import { JwtPayload } from 'jsonwebtoken';
import unlinkFile from '../../../shared/unlinkFile';
import { User } from '../user/user.model';

const updateVendor = async (user: JwtPayload, payload: Partial<IVendor>) => {
  const { id } = user;
  console.log(user);
  console.log(id);

  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  //unlink file here
  if (payload.profileImg) {
    unlinkFile(isExistUser.profile);
  }

  const result = await Vendor.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });

  //need to be fixed!!!
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update vendor');
  }

  return result;
};

export const VendorService = {
  updateVendor,
};
