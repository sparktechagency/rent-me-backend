import { JwtPayload } from 'jsonwebtoken';
import StripeService, { stripe } from './payment.stripe';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { User } from '../user/user.model';
import { Order } from '../order/order.model';
import { Payment } from './payment.model';
import config from '../../../config';

import { Vendor } from '../vendor/vendor.model';
import { IVendor } from '../vendor/vendor.interface';

import { USER_ROLES } from '../../../enums/user';
import { ICustomer } from '../customer/customer.interface';
import { orderNotificationAndDataSendWithSocket } from '../order/order.utils';
import { logger } from '../../../shared/logger';

const onboardVendor = async (user: JwtPayload) => {
  try {
    const isUserExists = await User.findById(user.id).populate('vendor', {
      stripeId: 1,
    });
    if (!isUserExists) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }

    const { stripeId } = isUserExists.vendor as IVendor;
    let newStripeId = null;
    if (!stripeId) {
      const account = await StripeService.createConnectedAccount(user?.email);
      if (!account) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Failed to create connected account'
        );
      }

      newStripeId = account.id;
      await Vendor.findByIdAndUpdate(
        { _id: user.userId },
        { $set: { stripeId: account.id } },
        { new: true }
      );
    }

    const onboardingUrl = await StripeService.createAccountLink(
      newStripeId || stripeId,
      'https://yourapp.com/onboarding-success', // Replace with your URL
      'https://yourapp.com/onboarding-failed' // Replace with your URL
    );

    return onboardingUrl;
  } catch (error: unknown) {
    throw new ApiError(StatusCodes.BAD_REQUEST, (error as Error).message);
  }
};

const createCheckoutSession = async (user: JwtPayload, orderId: string) => {
  try {
    const isOrderExists = await Order.findById(
      { _id: orderId, status: 'accepted', paymentStatus: 'pending' },
      {
        vendorId: 1,
        amount: 1,
        isInstantTransfer: 1,
        deliveryFee: 1,
        setupFee: 1,
        isSetup: 1,
      }
    );

    const vendor = await User.findOne({
      vendor: isOrderExists?.vendorId,
    }).populate({
      path: 'vendor',
      select: 'stripeId',
    });

    if (!isOrderExists) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Order does not exist');
    }

    if (!vendor) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Vendor does not exist');
    }

    const { stripeId, _id } = vendor?.vendor as IVendor & { _id: string };

    if (stripeId === null || !stripeId) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Vendor does not have a connected account'
      );
    }

    if (vendor.status !== 'active') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Requested vendor is not active to accept payments'
      );
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

    let finalAmount = Number(isOrderExists.amount) || 0;

    if (isOrderExists?.setupFee) {
      finalAmount += Number(isOrderExists.setupFee) || 0;
    }

    finalAmount +=
      Number(isOrderExists.deliveryFee) || Number(config.customer_cc_rate!) * Number(isOrderExists.amount);

    // Create payment record
    const paymentData = {
      orderId: orderId,
      customerId: user.userId,
      vendorId: _id,
      amount: finalAmount,
      status: 'initiated',
    };

    const payment = await Payment.create(paymentData);
    if (!payment) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create payment.');
    }

    // Create Stripe checkout session
    const paymentIntent = await StripeService.createCheckoutSession(
      user?.email,
      finalAmount,
      orderId
    );

    payment.stripePaymentSessionId = paymentIntent.sessionId;
    await payment.save();

    return paymentIntent.url;
  } catch (error: unknown) {
    // Handle errors
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      (error as Error).message ||
        'An error occurred while creating the checkout session'
    );
  }
};

const getConnectedUserDashboard = async (user: JwtPayload) => {
  try {
    const isVendorExist = await Vendor.findById(user.userId, { stripeId: 1 });
    if (!isVendorExist) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
    }

    return await StripeService.createLoginLink(
      isVendorExist.stripeId
    );
  } catch (error: unknown) {
    throw new ApiError(StatusCodes.BAD_REQUEST, (error as Error).message);
  }
};

const transferToVendor = async (user: JwtPayload, orderId: string) => {
  try {
    // Fetch the order and payment details

    const [isOrderExists, isPaymentExists, isUserExists] = await Promise.all([
      Order.findById(orderId, {
        id: 1,
        vendorId: 1,
        customerId: 1,
        amount: 1,
        isInstantTransfer: 1,
        paymentId: 1,
      }).populate<{ customerId: Partial<ICustomer>}>({
        path: 'customerId',
        select: {
          name: 1},
        },
      ).lean(),
      Payment.findOne(
        { orderId: orderId, status: 'succeeded' },
        { amount: 1, stripePaymentIntentId: 1 }
      ).lean(),
      User.findById(user.id).populate({
        path: 'vendor',
        select: 'stripeId deviceId',
      }).lean(),
    ]);



    if (!isOrderExists)
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Order does not exist');
    if (!isPaymentExists)
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Payment does not exist');

    if (!isUserExists)
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Vendor does not exist');


    //prevent vendor from transferring the money before the delivery time is passed
    // if (isOrderExists.deliveryDateAndTime && new Date() < new Date(isOrderExists.deliveryDateAndTime)) {
    //   throw new ApiError(
    //     StatusCodes.BAD_REQUEST,
    //     'Delivery time has not passed, please wait until the delivery time is passed'
    //   );
    // }

    // Calculate fees and remaining amount
    const applicationFeePercentage = isOrderExists.isInstantTransfer
      ? Number(config.instant_transfer_fee)
      : Number(config.application_fee);
    const applicationFee = Math.floor(
      isPaymentExists.amount * applicationFeePercentage
    );
    const remainingAmount = isPaymentExists.amount - applicationFee;

    // Check Stripe balance
    const balance = await stripe.balance.retrieve();

    if (balance.available[0].amount < Math.floor(remainingAmount * 100)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Due to insufficient balance, transfer cannot be processed, please try again later.'
      );
    }

    const { stripeId } = isUserExists.vendor as IVendor;

    // Verify the vendor's Stripe account
    const account = await stripe.accounts.retrieve(stripeId);
    if (account.requirements && account.requirements.disabled_reason) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Your Stripe account is not enabled: ${account.requirements.disabled_reason}, please update your account and try again.`
      );
    }

    // Retrieve the vendor's external account (e.g., bank account or card)
    const externalAccounts = await stripe.accounts.listExternalAccounts(
      stripeId,
      { object: 'bank_account' } // Use 'card' for cards
    );

    if (!externalAccounts.data.length) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'No bank account found, please add a bank account and try again.'
      );
    }

    const externalAccount = externalAccounts.data.find(
      account => account.status === 'verified'
    );

    if (!externalAccount) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'No verified external accounts found, please add a bank account and try again.'
      );
    }

    // Create a transfer to the vendor's Stripe account
    const transfer = await stripe.transfers.create({
      amount: Math.floor(remainingAmount * 100),
      currency: 'usd',
      destination: stripeId,
    });

    // Create a payout to the vendor's external account
    const payout = await stripe.payouts.create(
      {
        amount: Math.floor(remainingAmount * 100),
        currency: 'usd',
        destination: externalAccount.id,
        method: isOrderExists.isInstantTransfer ? 'instant' : 'standard',
      },
      {
        stripeAccount: stripeId,
      }
    );

    // Update payment details
    await Payment.findOneAndUpdate(
      { _id: isPaymentExists._id },
      {
        applicationFee,
        isInstantTransfer: isOrderExists.isInstantTransfer,
        stripeTransferId: transfer.id,
        stripePayoutId: payout.id
      },
      { new: true }
    );

    // Update the order status to be completed
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId, status: 'ongoing' },
      { $set: { status: 'completed' } },
      { new: true }
    );


    if(!updatedOrder){
      logger.error("Something went wrong while updating order status after successful payment.")
    }


    //TODO test this
    const notificationData = { title: `Payment request received for order ${isOrderExists.orderId}`,
      message: `The payment for order ${isOrderExists.orderId} has been successfully processed, ${isOrderExists.isInstantTransfer ? 'please check your bank account' : 'it will be available in 2-3 business days'}`

    }

    await orderNotificationAndDataSendWithSocket('order',isOrderExists._id, USER_ROLES.VENDOR, notificationData)


    return { transfer, payout };
  } catch (error) {
    const errorMessage = (error as Error).message;
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      `Transfer failed: ${errorMessage}`
    );
  }
};

export const PaymentService = {
  onboardVendor,
  createCheckoutSession,
  transferToVendor,
  getConnectedUserDashboard,
};
