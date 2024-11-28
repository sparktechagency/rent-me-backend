/* eslint-disable @typescript-eslint/no-explicit-any */
import { JwtPayload } from 'jsonwebtoken';
import StripeService from './payment.stripe';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { User } from '../user/user.model';
import { Order } from '../order/order.model';
import { Payment } from './payment.model';

const onboardVendor = async (user: JwtPayload) => {
  try {
    const isUserExists = await User.findById(user.id, { stripeId: 1 });
    if (!isUserExists) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }

    const onboardingUrl = await StripeService.createAccountLink(
      isUserExists?.stripeId,
      'https://yourapp.com/onboarding-success', // Replace with your URL
      'https://yourapp.com/onboarding-failed' // Replace with your URL
    );

    return onboardingUrl;
  } catch (error: any) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error.message);
  }
};

const createCheckoutSession = async (user: JwtPayload, orderId: string) => {
  try {
    //This amount will be get from the order collection in the future
    const amount = 500;

    const isOrderExists = await Order.findById(orderId);

    if (!isOrderExists) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Order does not exist');
    }

    const vendor = await User.findOne(
      { vendor: isOrderExists.vendorId },
      { stripeId: 1, _id: 1 }
    );
    if (!vendor) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Vendor does not exist');
    }

    // Store initial payment data in Payment collection
    const paymentData = {
      orderId: orderId,
      customerId: user.id, //ref to user collection
      vendorId: vendor._id, //ref to user collection
      amount,
      status: 'initiated', // payment is in 'initiated' state before successful payment
    };

    const payment = await Payment.create(paymentData);

    // Create a checkout session
    const paymentIntent = await StripeService.createCheckoutSession(
      user?.email,
      amount,
      vendor?.stripeId,
      orderId
    );

    // Update the payment document with the checkout session ID
    payment.stripePaymentSessionId = paymentIntent.sessionId;
    await payment.save();

    return paymentIntent.url;
  } catch (error) {
    throw new ApiError(StatusCodes.BAD_REQUEST, error?.message);
  }
};

const transferToVendor = async (user: JwtPayload, orderId: string) => {
  const isOrderExists = await Order.findById(orderId, {
    vendorId: 1,
    _id: 1,
    amount: 1,
  });

  if (!isOrderExists) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Order does not exist');
  }

  const isUserExists = await User.findOne(
    { vendor: isOrderExists.vendorId },
    { stripeId: 1 }
  );

  if (!isUserExists) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Vendor does not exist');
  }

  const isPaymentExists = await Payment.findOne(
    { orderId: orderId, status: 'succeeded' },
    { amount: 1, status: 1 }
  );
  if (!isPaymentExists) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Payment does not exist');
  }

  if (isOrderExists.amount !== isPaymentExists.amount) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Payment amount does not match order amount'
    );
  }

  const transfer = await StripeService.transferToVendor(
    isUserExists.stripeId,
    isPaymentExists.amount
  );

  return transfer;
};

export const PaymentService = {
  onboardVendor,
  createCheckoutSession,
  transferToVendor,
};
