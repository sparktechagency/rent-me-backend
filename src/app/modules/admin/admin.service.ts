import { JwtPayload } from 'jsonwebtoken';
import { Admin } from './admin.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { User } from '../user/user.model';
import { IAdmin } from './admin.interface';

const getAdminProfile = async (user: JwtPayload) => {
  const [admin, userInfo] = await Promise.all([
    Admin.findOne({ _id: user.userId }).lean(),
    User.findOne({ _id: user.id, status: 'active' }, { role: 1 }).lean(),
  ]);

  if (!userInfo) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Admin doesn't exist!");
  }

  if (!admin) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Admin not found');
  }

  // Combine admin and role info and return
  return { ...admin, role: userInfo.role };
};

const deleteAdmin = async (user: JwtPayload) => {
  const result = await Admin.findOneAndDelete({ id: user.userId });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete admin');
  }
  return result;
};

const updateAdminProfileToDB = async (
  user: JwtPayload,
  payload: Partial<IAdmin>
) => {
  const isUserExist = await User.findOne({ _id: user.id, status: 'active' });
  if (!isUserExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Admin doesn't exist!");
  }

  const result = await Admin.findOneAndUpdate({ _id: user.userId }, payload, {
    new: true,
  });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update admin');
  }
  return result;
};

export const AdminService = {
  getAdminProfile,
  deleteAdmin,
  updateAdminProfileToDB,
};
