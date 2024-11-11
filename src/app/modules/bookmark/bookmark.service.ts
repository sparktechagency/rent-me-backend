import { StatusCodes } from 'http-status-codes';
import { IBookmark } from './bookmark.interface';
import { Bookmark } from './bookmark.model';
import ApiError from '../../../errors/ApiError';
import { JwtPayload } from 'jsonwebtoken';

const createBookmark = async (
  user: JwtPayload,
  payload: IBookmark
): Promise<IBookmark> => {
  payload.customerId = user.userId;
  const createBookmark = await Bookmark.create(payload);
  if (!createBookmark) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create bookmark');
  }
  return createBookmark;
};

const getAllBookmarks = async (id: string): Promise<IBookmark[] | null> => {
  const result = await Bookmark.find({ customerId: id }).populate('vendorId');
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get bookmarks');
  }
  return result;
};

const removeBookmark = async (
  id: string,
  user: JwtPayload
): Promise<IBookmark | null> => {
  const removeBookmark = await Bookmark.findOneAndDelete({
    _id: id,
    customerId: user.userId,
  });
  if (!removeBookmark) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to remove bookmark');
  }
  return removeBookmark;
};

export const BookmarkService = {
  createBookmark,
  removeBookmark,
  getAllBookmarks,
};
