import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { BookmarkController } from './bookmark.controller';
import { BookmarkValidation } from './bookmark.validation';
import validateRequest from '../../middlewares/validateRequest';
const router = express.Router();

router.post(
  '/',
  auth(USER_ROLES.CUSTOMER),
  validateRequest(BookmarkValidation.addOrRemoveBookMarkZodSchema),
  BookmarkController.createOrRemoveBookmark
);

router.get('/', auth(USER_ROLES.CUSTOMER), BookmarkController.getAllBookmarks);

export const BookMarkRoutes = router;
