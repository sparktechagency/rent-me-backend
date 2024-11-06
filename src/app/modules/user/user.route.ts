import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import fileUploadHandler from '../../middlewares/fileUploadHandler';
import validateRequest from '../../middlewares/validateRequest';
import { UserController } from './user.controller';
import { UserValidation } from './user.validation';
const router = express.Router();

//get user profile
router.get(
  '/profile',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.VENDOR),
  UserController.getUserProfile
);

//create and update user profile
router
  .route('/')
  .post(
    validateRequest(UserValidation.createUserZodSchema),
    UserController.createUser
  )
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.VENDOR),
    fileUploadHandler(),
    UserController.updateProfile
  );

//get vendor with search and filter
// router.get(
//   '/vendor/',
//   auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.VENDOR),
//   UserController.getAllVendors
// );
//get all user
router.get('/', auth(USER_ROLES.ADMIN), UserController.getAllUser);

export const UserRoutes = router;
