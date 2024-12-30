import { StatusCodes } from 'http-status-codes';
import { IBookmark } from './bookmark.interface';
import { Bookmark } from './bookmark.model';
import ApiError from '../../../errors/ApiError';
import { JwtPayload } from 'jsonwebtoken';

const createOrRemoveBookmark = async (
  user: JwtPayload,
  payload: IBookmark
): Promise<IBookmark> => {
  const isExist = await Bookmark.findOne({
    vendorId: payload.vendorId,
    customerId: user.userId,
  });
  if (isExist) {
    await Bookmark.deleteOne({ _id: isExist._id });
    return isExist;
  }
  const result = await Bookmark.create({
    customerId: user.userId,
    vendorId: payload.vendorId,
  });
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create bookmark');
  }
  return result;
};

const getAllBookmarks = async (id: string): Promise<IBookmark[] | null> => {
  const result = await Bookmark.find({ customerId: id }).populate('vendorId');
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get bookmarks');
  }
  return result;
};

export const BookmarkService = {
  createOrRemoveBookmark,
  getAllBookmarks,
};
