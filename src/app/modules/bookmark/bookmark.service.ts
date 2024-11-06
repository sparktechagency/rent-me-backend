import { StatusCodes } from 'http-status-codes';
import { IBookmark } from './bookmark.interface';
import { Bookmark } from './bookmark.model';
import ApiError from '../../../errors/ApiError';

const createBookmark = async (payload: IBookmark): Promise<IBookmark> => {
  const createBookmark = await Bookmark.create(payload);
  if (!createBookmark) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create bookmark');
  }
  return createBookmark;
};

const getAllBookmarks = async (id: string): Promise<IBookmark[] | null> => {
  const result = await Bookmark.find({ userId: id }).populate('vendorId');
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to get bookmarks');
  }
  return result;
};

const removeBookmark = async (id: string): Promise<IBookmark | null> => {
  const removeBookmark = await Bookmark.findByIdAndDelete(id);
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
