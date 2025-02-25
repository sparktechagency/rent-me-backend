import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { AuthService } from './auth.service';
import { Types } from 'mongoose';

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const { ...verifyData } = req.body;
  const result = await AuthService.verifyEmailToDB(verifyData);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: result.message,
    data: result.data,
  });
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const { ...loginData } = req.body;
  const result = await AuthService.loginUserFromDB(loginData);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User login successfully',
    data: result,
  });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  const result = await AuthService.refreshToken(refreshToken!);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User login successfully',
    data: result,
  });
});

const forgetPassword = catchAsync(async (req: Request, res: Response) => {
  const email = req.body.email;
  const result = await AuthService.forgetPasswordToDB(email);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Please check your email, we send a OTP!',
    data: result,
  });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const token = req.headers.authorization;
  const { ...resetData } = req.body;
  const result = await AuthService.resetPasswordToDB(token!, resetData);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Password reset successfully',
    data: result,
  });
});

const resendOtp = catchAsync(async (req: Request, res: Response) => {
  const email = req.body.email;
  const result = await AuthService.resendOtp(email);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Resend otp is sent to your mail',
    data: result,
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const { ...passwordData } = req.body;
  await AuthService.changePasswordToDB(user, passwordData);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Password changed successfully',
  });
});

const sendOtpToPhone = catchAsync(async (req: Request, res: Response) => {
  const { phoneNumber } = req.body;
  const user = req.user;
  const result = await AuthService.sendOtpToPhone(user, phoneNumber);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'OTP sent successfully',
    data: result,
  });
});

const verifyOtpForPhone = catchAsync(async (req: Request, res: Response) => {
  const { phoneNumber, otp, countryCode, isoCode, type } = req.body;
  const user = req.user;
  const result = await AuthService.verifyOtpForPhone(user, phoneNumber,countryCode, isoCode,otp,type);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'OTP verified successfully',
    data: result,
  });
});

const deleteAccount = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const { password } = req.body;
  await AuthService.deleteAccount(user, password);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Account deleted successfully',
  });
});

const updateUserAppId = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const { appId } = req.body;
  await AuthService.updateUserAppId(user, appId);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'App Id updated successfully',
  });
});

const socialLogin = catchAsync(async (req: Request, res: Response) => {
  const { appId, deviceId } = req.body;
  const result = await AuthService.socialLogin(appId,deviceId);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Social login successful',
    data: result,
  });
});


const restrictOrActivateUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AuthService.restrictOrActivateUser(req.body, new Types.ObjectId(id));
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User restricted successfully',
    data: result,
  });
})


const toggleUserPermission = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;

  const result = await AuthService.toggleUserPermission(user);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User permission toggled successfully',
    data: result,
  });
})

export const AuthController = {
  verifyEmail,
  loginUser,
  refreshToken,
  forgetPassword,
  resetPassword,
  resendOtp,
  changePassword,
  sendOtpToPhone,
  verifyOtpForPhone,
  deleteAccount,
  updateUserAppId,
  socialLogin,
  restrictOrActivateUser,
  toggleUserPermission
};
