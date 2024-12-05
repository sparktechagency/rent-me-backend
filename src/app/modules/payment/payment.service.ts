/* eslint-disable @typescript-eslint/no-explicit-any */
import { JwtPayload } from 'jsonwebtoken';
import StripeService, { stripe } from './payment.stripe';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { User } from '../user/user.model';
import { Order } from '../order/order.model';
import { Payment } from './payment.model';
import config from '../../../config';
import { Transfer } from '../transfer/transfer.model';

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
    const isOrderExists = await Order.findById(
      { _id: orderId, status: 'accepted', paymentStatus: 'pending' },
      { vendorId: 1, amount: 1, isInstantTransfer: 1 }
    );

    const vendor = await User.findOne(
      { vendor: isOrderExists?.vendorId },
      { stripeId: 1, _id: 1 }
    );

    if (!isOrderExists) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Order does not exist');
    }

    if (!vendor) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Vendor does not exist');
    }

    // Check if payment already exists for this order
    const isPaymentExists = await Payment.findOne(
      { orderId: orderId, status: 'succeeded' },
      { amount: 1, stripePaymentIntentId: 1 }
    );
    if (isPaymentExists) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Payment already exists for this order'
      );
    }

    // Create payment record
    const paymentData = {
      orderId: orderId,
      customerId: user.id,
      vendorId: vendor._id,
      amount: isOrderExists.amount,
      status: 'initiated',
    };

    const payment = await Payment.create(paymentData);
    if (!payment) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create payment.');
    }

    // Create Stripe checkout session
    const paymentIntent = await StripeService.createCheckoutSession(
      user?.email,
      isOrderExists.amount,
      orderId
    );

    payment.stripePaymentSessionId = paymentIntent.sessionId;
    await payment.save();

    return paymentIntent.url;
  } catch (error) {
    // Handle errors
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      error?.message || 'An error occurred while creating the checkout session'
    );
  }
};

const transferToVendor = async (user: JwtPayload, orderId: string) => {
  try {
    const isAlreadyTransfered = await Transfer.findOne({ orderId });
    if (isAlreadyTransfered) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Transfer already initiated for this order'
      );
    }

    const [isOrderExists, isPaymentExists] = await Promise.all([
      Order.findById(orderId, { vendorId: 1, amount: 1, isInstantTransfer: 1 }),
      Payment.findOne(
        { orderId, status: 'succeeded' },
        { amount: 1, stripePaymentIntentId: 1 }
      ),
    ]);

    if (!isOrderExists)
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Order does not exist');
    if (!isPaymentExists)
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Payment does not exist');

    const isUserExists = await User.findOne(
      { vendor: isOrderExists.vendorId },
      { stripeId: 1 }
    );
    if (!isUserExists)
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Vendor does not exist');

    const applicationFeePercentage = isOrderExists.isInstantTransfer
      ? Number(config.instant_transfer_fee)
      : Number(config.application_fee);
    const applicationFee = Math.floor(
      isPaymentExists.amount * applicationFeePercentage
    );
    const remainingAmount = isPaymentExists.amount - applicationFee;

    const [transfer, payout] = await Promise.all([
      stripe.transfers.create({
        amount: Math.floor(remainingAmount * 100),
        currency: 'usd',
        destination: isUserExists.stripeId,
      }),
      stripe.payouts.create({
        amount: Math.floor(applicationFee * 100),
        currency: 'usd',
        destination: isUserExists.stripeId,
        method: isOrderExists.isInstantTransfer ? 'instant' : 'standard',
      }),
    ]);

    const updatePayment = await Payment.findOneAndUpdate(
      { _id: isPaymentExists._id },
      {
        applicationFee,
        isInstantTransfer: isOrderExists.isInstantTransfer,
      },
      { new: true }
    );

    await Transfer.create({
      transferId: transfer.id,
      payoutId: payout.id,
      paymentId: isPaymentExists._id,
    });

    // Update the order status to completed
    await Order.findOneAndUpdate(
      { _id: orderId, status: 'ongoing' },
      { status: 'completed' },
      { new: true }
    );

    return { transfer, payout, updatePayment };
  } catch (error) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      `Transfer failed: ${error.message}`
    );
  }
};

export const PaymentService = {
  onboardVendor,
  createCheckoutSession,
  transferToVendor,
};
