import Stripe from 'stripe';
import config from '../../../config';

export const stripe = new Stripe(config.stripe_secret!, {
  apiVersion: '2024-11-20.acacia',
});

class StripeService {
  // Create a connected account for the vendor
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

  // Generate the account onboarding link for the vendor
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

  // Create a checkout session for the customer payment
  async createCheckoutSession(
    customerEmail: string,
    amount: number,
    orderId: string
  ) {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Service Payment',
              description: 'Payment for vendor service',
            },
            unit_amount: Math.round(Number(amount) * 100), // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'https://admin.rentmeus.com/public/payment-success',
      cancel_url: 'https://admin.rentmeus.com/public/payment-cancel',
      payment_intent_data: {},
      metadata: {
        customer_email: customerEmail,
        amount: Math.round(Number(amount)).toString(),
        orderId: orderId,
      },
    });

    return { sessionId: session.id, url: session.url as string };
  }

  // Generate a login link for the connected user's Express Dashboard
  async createLoginLink(accountId: string): Promise<string> {
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return loginLink.url;
  }
}

export default new StripeService();
