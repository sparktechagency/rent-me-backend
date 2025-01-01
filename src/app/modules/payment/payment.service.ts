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
import { sendNotification } from '../../../helpers/sendNotificationHelper';
import { Types } from 'mongoose';

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
      { vendorId: 1, amount: 1, isInstantTransfer: 1 }
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

    // Create payment record
    const paymentData = {
      orderId: orderId,
      customerId: user.userId,
      vendorId: _id,
      amount:
        isOrderExists.amount +
        Number(config.application_fee) * isOrderExists.amount,
      status: 'initiated',
    };

    const payment = await Payment.create(paymentData);
    if (!payment) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create payment.');
    }

    // Create Stripe checkout session
    const paymentIntent = await StripeService.createCheckoutSession(
      user?.email,
      isOrderExists.amount +
        Number(config.application_fee) * isOrderExists.amount,
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

    const loginLink = await StripeService.createLoginLink(
      isVendorExist.stripeId
    );

    return loginLink;
  } catch (error: unknown) {
    throw new ApiError(StatusCodes.BAD_REQUEST, (error as Error).message);
  }
};

const transferToVendor = async (user: JwtPayload, orderId: string) => {
  try {
    // Fetch the order and payment details
    const [isOrderExists, isPaymentExists] = await Promise.all([
      Order.findById(orderId, {
        id: 1,
        vendorId: 1,
        amount: 1,
        isInstantTransfer: 1,
        paymentId: 1,
      }),
      Payment.findOne(
        { orderId, status: 'succeeded' },
        { amount: 1, stripePaymentIntentId: 1 }
      ),
    ]);

    if (!isOrderExists)
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Order does not exist');
    if (!isPaymentExists)
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Payment does not exist');

    // Validate the vendor's user
    const isUserExists = await User.findOne({ _id: user.id }).populate({
      path: 'vendor',
      select: 'stripeId',
    });
    if (!isUserExists)
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Vendor does not exist');

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
        'Insufficient funds in platform account for transfer'
      );
    }

    const { stripeId } = isUserExists.vendor as IVendor;

    // Verify the vendor's Stripe account
    const account = await stripe.accounts.retrieve(stripeId);
    if (account.requirements && account.requirements.disabled_reason) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Vendor's Stripe account is not enabled: ${account.requirements.disabled_reason}`
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
        'No external accounts found for the vendor'
      );
    }

    const externalAccount = externalAccounts.data.find(
      account => account.status === 'verified'
    );

    if (!externalAccount) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'No verified external accounts found for the vendor'
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
      },
      { new: true }
    );

    // Update the order status to completed
    await Order.findOneAndUpdate(
      { _id: orderId, status: 'ongoing' },
      { status: 'completed' },
      { new: true }
    );

    //send notification
    await sendNotification(
      'getNotification',
      isOrderExists.vendorId as Types.ObjectId,
      {
        userId: user.id,
        title: `Payment received for order ${isOrderExists.id}`,
        message: `You have received a payment of $${remainingAmount} for order ${isOrderExists.id}`,
        type: user.role,
      }
    );

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
