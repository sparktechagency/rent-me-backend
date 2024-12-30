import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload, Secret } from 'jsonwebtoken';
import config from '../../../config';
import ApiError from '../../../errors/ApiError';
import { emailHelper } from '../../../helpers/emailHelper';
import { jwtHelper } from '../../../helpers/jwtHelper';
import { emailTemplate } from '../../../shared/emailTemplate';
import {
  IAuthResetPassword,
  IChangePassword,
  ILoginData,
  IVerifyEmail,
} from '../../../types/auth';
import cryptoToken from '../../../util/cryptoToken';
import generateOTP from '../../../util/generateOTP';
import { ResetToken } from '../resetToken/resetToken.model';
import { User } from '../user/user.model';
import { ILoginResponse, IRefreshTokenResponse } from '../../../types/response';

import { Customer } from '../customer/customer.model';
import { Vendor } from '../vendor/vendor.model';
import { sendOtp, verifyOtp } from '../../../helpers/twilioHelper';
import { IVendor } from '../vendor/vendor.interface';
import { calculateCustomerProfileCompletion } from '../customer/customer.utils';
import { calculateProfileCompletion } from '../vendor/vendor.utils';
import { ICustomer } from '../customer/customer.interface';
import { USER_ROLES } from '../../../enums/user';

//login
const loginUserFromDB = async (
  payload: ILoginData
): Promise<ILoginResponse> => {
  const { email, password } = payload;

  const isExistUser = await User.findOne({ email }).select('+password');
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  if (isExistUser.status === 'restricted') {
    if (
      isExistUser.restrictionLeftAt &&
      new Date() < isExistUser.restrictionLeftAt
    ) {
      const remainingMinutes = Math.ceil(
        (isExistUser.restrictionLeftAt.getTime() - Date.now()) / 60000
      );
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `You are restricted to login for ${remainingMinutes} minutes`
      );
    }

    isExistUser.status = 'active';
    isExistUser.wrongLoginAttempts = 0;
    isExistUser.restrictionLeftAt = null;

    await User.findByIdAndUpdate(
      { _id: isExistUser._id },
      {
        $set: {
          status: isExistUser.status,
          wrongLoginAttempts: isExistUser.wrongLoginAttempts,
          restrictionLeftAt: isExistUser.restrictionLeftAt,
        },
      }
    );
  }

  //check verified and status
  if (!isExistUser.verified) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Please verify your account, then try to login again'
    );
  }

  //check user status
  if (isExistUser.status === 'delete') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You don’t have permission to access this content.It looks like your account has been deactivated.'
    );
  }

  //check match password
  if (
    password &&
    !(await User.isMatchPassword(password, isExistUser.password))
  ) {
    isExistUser.wrongLoginAttempts += 1;

    if (isExistUser.wrongLoginAttempts >= 5) {
      isExistUser.status = 'restricted';
      isExistUser.restrictionLeftAt = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ); // Restrict for 1 day
    }

    await User.findByIdAndUpdate(
      { _id: isExistUser._id },
      {
        $set: {
          wrongLoginAttempts: isExistUser.wrongLoginAttempts,
          status: isExistUser.status,
          restrictionLeftAt: isExistUser.restrictionLeftAt,
        },
      }
    );

    throw new ApiError(StatusCodes.BAD_REQUEST, 'Password is incorrect!');
  }

  //create accessToken token
  const accessToken = jwtHelper.createToken(
    {
      id: isExistUser._id, //user collection id
      userCustomId: isExistUser.id, // user custom id
      userId:
        isExistUser.role === 'CUSTOMER'
          ? isExistUser.customer
          : isExistUser.role === 'VENDOR'
          ? isExistUser.vendor
          : isExistUser.admin,
      role: isExistUser.role,
      email: isExistUser.email,
    },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string
  );

  const refreshToken = jwtHelper.createToken(
    {
      id: isExistUser._id, //user collection id
      userCustomId: isExistUser.id, // user custom id
      userId:
        isExistUser.role === 'CUSTOMER'
          ? isExistUser.customer
          : isExistUser.role === 'VENDOR'
          ? isExistUser.vendor
          : isExistUser.admin,
      role: isExistUser.role,
      email: isExistUser.email,
    },
    config.jwt.jwt_refresh_secret as Secret,
    config.jwt.jwt_refresh_expire_in as string
  );

  return { accessToken, refreshToken, role: isExistUser.role };
};

const refreshToken = async (
  token: string
): Promise<IRefreshTokenResponse | null> => {
  let verifiedToken = null;
  try {
    // Verify the refresh token
    verifiedToken = jwtHelper.verifyToken(
      token,
      config.jwt.jwt_refresh_secret as Secret
    );
  } catch (error) {
    if (error instanceof Error) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
    }
    throw new ApiError(StatusCodes.FORBIDDEN, 'Invalid Refresh Token');
  }

  const { email } = verifiedToken;

  const isUserExist = await User.isExistUserByEmail(email);
  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found!');
  }

  const newAccessToken = jwtHelper.createToken(
    {
      id: isUserExist._id,
      userId:
        isUserExist.role === 'CUSTOMER'
          ? isUserExist.customer
          : isUserExist.role === 'VENDOR'
          ? isUserExist.vendor
          : isUserExist.admin,
      email: isUserExist.email,
      role: isUserExist.role,
      isSubscribe: isUserExist.isSubscribe,
    },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string
  );

  //after successful login reset the wrong login attempts
  isUserExist.wrongLoginAttempts = 0;
  isUserExist.restrictionLeftAt = null;
  await isUserExist.save();
  return {
    accessToken: newAccessToken,
  };
};

//forget password
const forgetPasswordToDB = async (email: string) => {
  const isExistUser = await User.isExistUserByEmail(email);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  //send mail
  const otp = generateOTP();
  const value = {
    otp,
    email: isExistUser.email,
  };
  const forgetPassword = emailTemplate.resetPassword(value);
  emailHelper.sendEmail(forgetPassword);

  //save to DB
  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 5 * 60000),
  };
  await User.findOneAndUpdate({ email }, { $set: { authentication } });
};

//verify email
const verifyEmailToDB = async (payload: IVerifyEmail) => {
  const { email, oneTimeCode } = payload;

  const isExistUser = await User.findOne({ email }).select('+authentication');
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  if (!Number(oneTimeCode)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Please give the otp, check your email we send a code'
    );
  }

  if (isExistUser.authentication?.oneTimeCode !== Number(oneTimeCode)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You provided wrong otp');
  }

  const date = new Date();
  if (date > isExistUser.authentication?.expireAt) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Otp already expired, Please try again'
    );
  }

  let message;
  let data;

  if (!isExistUser.verified) {
    await User.findOneAndUpdate(
      { _id: isExistUser._id },
      { verified: true, authentication: { Number: null, expireAt: null } }
    );
    message = 'Email verify successfully';
  } else {
    await User.findOneAndUpdate(
      { _id: isExistUser._id },
      {
        authentication: {
          isResetPassword: true,
          oneTimeCode: null,
          expireAt: null,
        },
      }
    );

    //create token ;
    const createToken = cryptoToken();
    await ResetToken.create({
      user: isExistUser._id,
      token: createToken,
      expireAt: new Date(Date.now() + 5 * 60000),
    });
    message =
      'Verification Successful: Please securely store and utilize this code for reset password';
    data = createToken;
  }
  return { data, message };
};

//forget password
const resetPasswordToDB = async (
  token: string,
  payload: IAuthResetPassword
) => {
  const { newPassword, confirmPassword } = payload;
  //isExist token
  const isExistToken = await ResetToken.isExistToken(token);
  if (!isExistToken) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
  }

  //user permission check
  const isExistUser = await User.findById(isExistToken.user).select(
    '+authentication'
  );
  if (!isExistUser?.authentication?.isResetPassword) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      "You don't have permission to change the password. Please click again to 'Forgot Password'"
    );
  }

  //validity check
  const isValid = await ResetToken.isExpireToken(token);
  if (!isValid) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Token expired, Please click again to the forget password'
    );
  }

  //check password
  if (newPassword !== confirmPassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "New password and Confirm password doesn't match!"
    );
  }

  const hashPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds)
  );

  const updateData = {
    password: hashPassword,
    authentication: {
      isResetPassword: false,
    },
  };

  await User.findOneAndUpdate({ _id: isExistToken.user }, updateData, {
    new: true,
  });
};

const changePasswordToDB = async (
  user: JwtPayload,
  payload: IChangePassword
) => {
  const { currentPassword, newPassword, confirmPassword } = payload;

  //new password and confirm password check
  if (newPassword !== confirmPassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Password and Confirm password doesn't matched"
    );
  }

  const isExistUser = await User.findById(user.id).select('+password');
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  //current password match
  if (
    currentPassword &&
    !(await User.isMatchPassword(currentPassword, isExistUser.password))
  ) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Password is incorrect');
  }

  //newPassword and current password
  if (currentPassword === newPassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Please give different password from current password'
    );
  }

  //hash password
  const hashPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds)
  );

  const updateData = {
    password: hashPassword,
  };
  await User.findOneAndUpdate({ _id: user.id }, updateData, { new: true });
};

const resendOtp = async (email: string) => {
  const isExistUser = await User.isExistUserByEmail(email);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  //send mail
  const otp = generateOTP();
  const value = {
    name: isExistUser.name,
    otp,
    email: isExistUser.email,
  };
  const forgetPassword = emailTemplate.createAccount(value);
  emailHelper.sendEmail(forgetPassword);

  //save to DB
  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 3 * 60000),
  };
  await User.findOneAndUpdate({ email }, { $set: { authentication } });
};

const sendOtpToPhone = async (user: JwtPayload, phone: string) => {
  const isUserExist = await User.findById(user.id)
    .populate({
      path: 'vendor',
      select: {
        contact: 1,
        businessContact: 1,
        isBusinessContactVerified: 1,
        isContactVerified: 1,
      },
    })
    .populate({
      path: 'customer',
      select: { contact: 1, isContactVerified: 1 },
    });
  if (!isUserExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  if (isUserExist.role === USER_ROLES.CUSTOMER) {
    const { isContactVerified } = isUserExist.customer as ICustomer;

    if (isContactVerified) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Phone number is already verified'
      );
    }
  }

  if (isUserExist.role === USER_ROLES.VENDOR) {
    const { isContactVerified, isBusinessContactVerified } =
      isUserExist.vendor as IVendor;

    if (isContactVerified && isBusinessContactVerified) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Phone number is already verified'
      );
    }
  }

  await sendOtp(phone);
};

const verifyOtpForPhone = async (
  user: JwtPayload,
  phone: string,
  otp: string
) => {
  const isUserExist = await User.findById(user.id)
    .populate({
      path: 'vendor',
      select: { contact: 1, businessContact: 1 },
    })
    .populate({
      path: 'customer',
      select: { contact: 1 },
    });
  if (!isUserExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  const isVerified = await verifyOtp(phone, otp);
  if (!isVerified) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid OTP');
  }

  if (isUserExist.role === 'CUSTOMER') {
    // Update customer data
    const customer = await Customer.findByIdAndUpdate(
      isUserExist.customer, // Use ObjectId directly
      { $set: { isContactVerified: true } }
    );

    if (!customer) {
      throw new Error('Failed to update customer data.');
    }

    const profileCompletion = calculateCustomerProfileCompletion(customer);
    await Customer.findByIdAndUpdate(
      { _id: customer._id },
      {
        $set: {
          profileCompletion: profileCompletion,
          verifiedFlag: profileCompletion === 100,
        },
      }
    );
  } else if (isUserExist.role === 'VENDOR') {
    let updatedData: Partial<IVendor> = {};

    const vendor = isUserExist.vendor as IVendor;

    if (!vendor) {
      throw new Error('Vendor data not found.');
    }

    if (vendor.contact == phone && vendor.businessContact == phone) {
      updatedData = {
        isContactVerified: true,
        isBusinessContactVerified: true,
      };
    } else if (vendor.contact === phone) {
      updatedData = { isContactVerified: true };
    } else if (vendor.businessContact === phone) {
      updatedData = { isBusinessContactVerified: true };
    }

    // Update vendor data
    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendor._id, // Use the vendor ObjectId
      { $set: { updatedData } }
    );

    if (!updatedVendor) {
      throw new Error('Failed to update vendor data.');
    }

    const profileCompletion = calculateProfileCompletion(updatedVendor);
    await Vendor.findByIdAndUpdate(
      { _id: updatedVendor._id },
      {
        $set: {
          profileCompletion: profileCompletion,
          verifiedFlag: profileCompletion === 100,
        },
      }
    );
  }
};

const deleteAccount = async (user: JwtPayload, password: string) => {
  const isUserExist = await User.findById(user.id);
  if (!isUserExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  const isPasswordMatched = await bcrypt.compare(
    password,
    isUserExist.password
  );
  if (!isPasswordMatched) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Password is incorrect');
  }

  if (isUserExist.status === 'delete') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User already deleted!');
  }

  isUserExist.status = 'delete';
  await isUserExist.save();

  return isUserExist;
};

export const AuthService = {
  verifyEmailToDB,
  loginUserFromDB,
  forgetPasswordToDB,
  resetPasswordToDB,
  changePasswordToDB,
  refreshToken,
  resendOtp,
  sendOtpToPhone,
  verifyOtpForPhone,
  deleteAccount,
};
