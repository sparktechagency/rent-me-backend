import Stripe from 'stripe';
import config from '../../../config';

const stripe = new Stripe(config.stripe_secret!, {
  apiVersion: '2024-11-20.acacia',
});

class StripeService {
  /**
   * Create a Connected Account for a vendor.
   */
  async createConnectedAccount(email: string): Promise<Stripe.Account> {
    const account = await stripe.accounts.create({
      type: 'express', // Choose 'express' or 'custom' based on your needs
      email,
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
    });
    return account;
  }

  /**
   * Generate an Account Link for onboarding.
   */
  async createAccountLink(
    accountId: string,
    returnUrl: string,
    refreshUrl: string
  ): Promise<string> {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    return accountLink.url;
  }

  // Create a Stripe Checkout session
  async createCheckoutSession(
    customerEmail: string,
    amount: number,
    vendorAccountId: string,
    orderId: string
  ) {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'us_bank_account'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Service Payment',
              description: 'Payment for vendor service',
            },
            unit_amount: amount * 100, // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url:
        'https://yourapp.com/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://yourapp.com/cancel',
      payment_intent_data: {
        application_fee_amount: amount * 0.1 * 100, // Platform fee in cents
        transfer_data: {
          destination: vendorAccountId, // Vendor's connected account
        },
      },
      metadata: {
        customer_email: customerEmail,
        amount: amount.toString(),
        orderId: orderId,
      },
    });

    const sessionId = session.id as string;

    return { sessionId: sessionId, url: session.url as string }; // URL to redirect the customer to the hosted Checkout page
  }

  /**
   * Create a Transfer to a vendor's account.
   */
  //   Modify the transfer method to include platform fee deduction (10%)
  async transferToVendor(
    accountId: string,
    amount: number,
    currency: string = 'usd'
  ): Promise<Stripe.Transfer> {
    const platformFee = 0.1 * amount; // 10% platform fee
    const vendorShare = amount - platformFee;

    // First, retrieve the available balance
    const balance = await stripe.balance.retrieve();

    const availableBalance = balance.available.find(
      b => b.currency === currency
    );

    // Check if there are enough funds available
    if (
      !availableBalance ||
      availableBalance.amount < Math.floor(amount * 100)
    ) {
      throw new Error(
        'Insufficient funds in your Stripe account to process the transfer'
      );
    }

    // Proceed with the transfer to the vendor
    const transfer = await stripe.transfers.create({
      amount: Math.floor(vendorShare * 100),
      currency,
      destination: accountId, // Vendor's Connected Account ID
    });

    // Platform fee transfer if applicable
    if (platformFee > 0) {
      await stripe.transfers.create({
        amount: Math.floor(platformFee * 100), // Platform fee transfer (in cents)
        currency,
        destination: config.stripe_account_id!, // Your platform's Stripe account
      });
    }

    return transfer;
  }

  //Instant transfer for vendor
  //   async instantTransferToVendor(
  //     accountId: string,
  //     amount: number,
  //     currency: string = 'usd'
  //   ): Promise<Stripe.Payout> {
  //     const instantFee = 0.04 * amount; // 4% instant transfer fee
  //     const totalAmount = amount + instantFee; // Total amount including the extra charge

  //     const payout = await stripe.payouts.create({
  //       amount: Math.floor(totalAmount * 100), // Amount in cents (total)
  //       currency,
  //       destination: accountId, // Vendor's connected account ID
  //       method: 'instant', // Instant payout
  //     });

  //     return payout;
  //   }

  /**
   * Create a PaymentIntent for receiving payments from customers.
//    */
  //   async createPaymentIntent(
  //     amount: number,
  //     currency: string = 'usd',
  //     paymentMethodTypes: string[] = ['card'],
  //     applicationFee: number = 0, // Optional application fee for platform revenue
  //     connectedAccountId?: string // Optional vendor account for direct charges
  //   ): Promise<Stripe.PaymentIntent> {
  //     const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
  //       amount: amount * 100, // Amount in cents
  //       currency,
  //       payment_method_types: paymentMethodTypes,
  //     };

  //     if (connectedAccountId) {
  //       paymentIntentParams.transfer_data = {
  //         destination: connectedAccountId, // Vendor's Connected Account ID
  //         amount: Math.floor((amount - applicationFee) * 100), // Vendor’s share after platform fee
  //       };
  //       paymentIntentParams.application_fee_amount = applicationFee * 100; // Platform fee
  //     }

  //     const paymentIntent = await stripe.paymentIntents.create(
  //       paymentIntentParams
  //     );
  //     return paymentIntent;
  //   }

  /**
   * Retrieve a PaymentIntent by its ID.
   */
  //   async retrievePaymentIntent(
  //     paymentIntentId: string
  //   ): Promise<Stripe.PaymentIntent> {
  //     const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  //     return paymentIntent;
  //   }

  /**
   * Verify and handle Stripe Webhooks.
   */
  // async handleWebhook(payload: Buffer, sig: string | string[]): Promise<Stripe.Event> {
  //     const webhookSecret = config.stripe_webhook_secret!;
  //     const event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  //     return event;
  //   }
}

export default new StripeService();
