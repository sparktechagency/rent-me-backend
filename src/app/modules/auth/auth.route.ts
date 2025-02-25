import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { AuthController } from './auth.controller';
import { AuthValidation } from './auth.validation';
import { rateLimiter } from '../../../util/rateLimmiter';
const router = express.Router();

router.post(
  '/login',
  rateLimiter,
  validateRequest(AuthValidation.createLoginZodSchema),
  AuthController.loginUser
);

router.post('/refresh-token', AuthController.refreshToken);

router.post(
  '/forget-password',
  validateRequest(AuthValidation.createForgetPasswordZodSchema),
  AuthController.forgetPassword
);

router.post(
  '/verify-email',
  validateRequest(AuthValidation.createVerifyEmailZodSchema),
  AuthController.verifyEmail
);

router.post(
  '/reset-password',
  validateRequest(AuthValidation.createResetPasswordZodSchema),
  AuthController.resetPassword
);

router.post(
  '/resend-otp',
  validateRequest(AuthValidation.resendOtpZodSchema),
  AuthController.resendOtp
);

router.post(
  '/change-password',
  auth(USER_ROLES.ADMIN, USER_ROLES.CUSTOMER, USER_ROLES.VENDOR),
  validateRequest(AuthValidation.createChangePasswordZodSchema),
  AuthController.changePassword
);

router.post(
  '/send-otp-to-phone',
  auth(USER_ROLES.CUSTOMER, USER_ROLES.VENDOR),
  validateRequest(AuthValidation.createSendOtpToPhoneZodSchema),
  AuthController.sendOtpToPhone
);

router.post(
  '/verify-otp-for-phone',
  auth(USER_ROLES.CUSTOMER, USER_ROLES.VENDOR),
  validateRequest(AuthValidation.createVerifyOtpForPhoneZodSchema),
  AuthController.verifyOtpForPhone
);

router.delete(
  '/delete-account',
  auth(USER_ROLES.CUSTOMER, USER_ROLES.VENDOR),
  validateRequest(AuthValidation.deleteAccountZodSchema),
  AuthController.deleteAccount
);

router.patch(
  '/app-id',
  auth(USER_ROLES.CUSTOMER, USER_ROLES.VENDOR),
  validateRequest(AuthValidation.updateUserAppIdZodSchema),
  AuthController.updateUserAppId
);

router.patch('/restrict-user/:id',
  auth(USER_ROLES.ADMIN),
  AuthController.restrictOrActivateUser)

router.post(
  '/social-login',
  validateRequest(AuthValidation.createSocialLoginZodSchema),
  AuthController.socialLogin
);


router.patch('/toggle-user-permission',
  auth(USER_ROLES.CUSTOMER, USER_ROLES.VENDOR),
  AuthController.toggleUserPermission
)


export const AuthRoutes = router;
