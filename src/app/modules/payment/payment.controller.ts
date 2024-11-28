import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import { StatusCodes } from 'http-status-codes';
import sendResponse from '../../../shared/sendResponse';
import { PaymentService } from './payment.service';
import Stripe from 'stripe';
import config from '../../../config';
import { Payment } from './payment.model';

const onboardVendor = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;

  const result = await PaymentService.onboardVendor(user);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Vendor onboarded successfully',
    data: result,
  });
});

const createCheckoutSession = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    const { orderId } = req.params;

    const result = await PaymentService.createCheckoutSession(user, orderId);
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Payment intent created successfully',
      data: result,
    });
  }
);

const webhooks = catchAsync(async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = config.webhook_secret!; // Your webhook secret

  let event: Stripe.Event;

  // Verify the webhook signature
  try {
    event = Stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;

      await Payment.findOneAndUpdate(
        { orderId: session?.metadata?.orderId },
        { status: 'succeeded', stripePaymentIntentId: session.payment_intent },
        { new: true }
      );

      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      const metadata = paymentIntent.metadata;

      await Payment.findOneAndUpdate(
        { orderId: metadata.orderId },
        { status: 'failed' },
        { new: true }
      );

      break;
    }

    default:
  }

  // Acknowledge receipt of the event
  res.status(200).send('Received');
});

const transferToVendor = catchAsync(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const user = req.user;

  const result = await PaymentService.transferToVendor(user, orderId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Money transferred to vendor account successful.',
    data: result,
  });
});

export const PaymentController = {
  onboardVendor,
  createCheckoutSession,
  webhooks,
  transferToVendor,
};
