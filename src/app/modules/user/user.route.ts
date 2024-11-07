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
  '/profile/:id',
  auth(USER_ROLES.ADMIN),
  UserController.getUserProfile
);

//create and update user profile
router.post(
  '/',
  validateRequest(UserValidation.createUserZodSchema),
  UserController.createUser
);

//update user
router.patch(
  '/:id',
  auth(USER_ROLES.ADMIN),
  validateRequest(UserValidation.updateUserZodSchema),
  UserController.updateUser
);

// .patch(
//   auth(USER_ROLES.ADMIN, USER_ROLES.CUSTOMER, USER_ROLES.VENDOR),
//   fileUploadHandler(),
//   UserController.updateProfile
// );

//get all user
router.get('/', auth(USER_ROLES.ADMIN), UserController.getAllUser);

export const UserRoutes = router;
