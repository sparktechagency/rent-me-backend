/* eslint-disable @typescript-eslint/no-explicit-any */
import twilio from 'twilio';

import { addMinutes } from 'date-fns';
import config from '../config';
import { Otp } from '../app/modules/otp/otp.model';

import { StatusCodes } from 'http-status-codes';

const accountSid = config.twilio.account_sid;
const authToken = config.twilio.auth_token;
const twilioPhoneNumber = config.twilio.phone_number;
const client = twilio(accountSid, authToken);
import crypto from 'crypto';
import ApiError from '../errors/ApiError';

// Helper function to hash OTP
const hashOtp = (otp: string): string => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

export const sendOtp = async (phoneNumber: string): Promise<void> => {
  try {
    // Validate phone number format (E.164)
    if (!/^\+?[1-9]\d{1,14}$/.test(phoneNumber)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Invalid phone number format.'
      );
    }

    // Rate limiting: Check OTP request count
    const existingOtp = await Otp.findOne({ phoneNumber });

    if (existingOtp) {
      const timeElapsed =
        Date.now() - new Date(existingOtp.lastRequestAt).getTime();
      const tenMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds

      if (timeElapsed < tenMinutes && existingOtp.requestCount >= 3) {
        throw new ApiError(
          StatusCodes.TOO_MANY_REQUESTS,
          'Too many OTP requests. Please try again later.'
        );
      }

      // Increment request count or reset if outside the 30-minute window
      if (timeElapsed >= tenMinutes) {
        existingOtp.requestCount = 1;
        existingOtp.lastRequestAt = new Date();
      } else {
        existingOtp.requestCount += 1;
      }

      await existingOtp.save();
    }

    // Generate a random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = hashOtp(otp); // Hash the OTP before saving

    // Set OTP expiration (e.g., 5 minutes)
    const expiresAt = addMinutes(new Date(), 5);

    // Save OTP in the database
    const newOtp = existingOtp
      ? Object.assign(existingOtp, { otp: hashedOtp, expiresAt })
      : new Otp({
          phoneNumber,
          otp: hashedOtp,
          createdAt: new Date(),
          expiresAt,
          requestCount: 1,
          lastRequestAt: new Date(),
        });

    await newOtp.save();

     
    // Send the OTP using Twilio


    await client.messages.create({
      body: `Your OTP code is ${otp}. It will expire in 5 minutes.`,
      from: twilioPhoneNumber,
      to: phoneNumber,
    });
  } catch (error) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to send OTP. Please try again later.'
    );
  }
};

export const verifyOtp = async (
  phoneNumber: string,
  otp: string
): Promise<boolean> => {


  try {
    const existingOtp = await Otp.findOne({ phoneNumber });

    if (!existingOtp) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'No OTP found for this phone number.'
      );
    }

    // Check if OTP is expired
    if (new Date() > new Date(existingOtp.expiresAt)) {
      await existingOtp.deleteOne();
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'OTP has expired. Please request a new one.'
      );
    }

    // Hash the provided OTP and compare with the stored hash
    const hashedOtp = hashOtp(otp);
    if (existingOtp.otp !== hashedOtp) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid OTP.');
    }

    // Delete OTP after successful verification
    await existingOtp.deleteOne();

    return true;
  } catch (error) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to verify OTP. Please try again later.'
    );
  }
};



export const twilioStatusCallback = async (payload: any) => {
  console.log(payload);
};