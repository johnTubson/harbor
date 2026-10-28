import Stripe from "stripe";
import {
  type AccountSnapshot,
  type CreateCheckoutSessionInput,
  type CreateExpressAccountInput,
  type CreateRefundInput,
  type CreateTransferInput,
  StripeGateway,
} from "./stripe.gateway";

/** Pinned to the SDK's bundled version so types match responses. */
export const STRIPE_API_VERSION = "2026-09-30.endive";

export function toAccountSnapshot(account: Stripe.Account): AccountSnapshot {
  return {
    id: account.id,
    chargesEnabled: account.charges_enabled ?? false,
    payoutsEnabled: account.payouts_enabled ?? false,
    detailsSubmitted: account.details_submitted ?? false,
    requirementsDue: account.requirements?.currently_due ?? [],
    disabledReason: account.requirements?.disabled_reason ?? null,
  };
}

export class StripeSdkGateway extends StripeGateway {
  private readonly stripe: Stripe;

  constructor(secretKey: string) {
    super();
    this.stripe = new Stripe(secretKey, {
      apiVersion: STRIPE_API_VERSION,
      maxNetworkRetries: 2,
      appInfo: { name: "Harbor" },
    });
  }

  async createExpressAccount(
    input: CreateExpressAccountInput,
    idempotencyKey: string
  ) {
    const account = await this.stripe.accounts.create(
      {
        email: input.email,
        country: input.country,
        controller: {
          stripe_dashboard: { type: "express" },
          fees: { payer: "application" },
          losses: { payments: "application" },
          requirement_collection: "stripe",
        },
        capabilities: { transfers: { requested: true } },
        metadata: { merchantId: input.merchantId },
      },
      { idempotencyKey }
    );
    return { id: account.id };
  }

  async createAccountLink(
    accountId: string,
    returnUrl: string,
    refreshUrl: string
  ) {
    const link = await this.stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      return_url: returnUrl,
      refresh_url: refreshUrl,
    });
    return { url: link.url };
  }

  async retrieveAccount(accountId: string) {
    return toAccountSnapshot(await this.stripe.accounts.retrieve(accountId));
  }

  async createCheckoutSession(
    input: CreateCheckoutSessionInput,
    idempotencyKey: string
  ) {
    const metadata = { orderId: input.orderId, paymentId: input.paymentId };
    const session = await this.stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: input.lineItems.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: item.unitAmountCents,
            product_data: { name: item.name },
          },
        })),
        // Separate charges and transfers: no transfer_data, no application fee.
        payment_intent_data: { transfer_group: input.orderId, metadata },
        metadata,
        customer_email: input.customerEmail,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        expires_at: Math.floor(input.expiresAt.getTime() / 1000),
      },
      { idempotencyKey }
    );
    if (!session.url) {
      throw new Error(`Checkout session ${session.id} has no URL`);
    }
    return { id: session.id, url: session.url };
  }

  async createTransfer(input: CreateTransferInput, idempotencyKey: string) {
    const transfer = await this.stripe.transfers.create(
      {
        amount: input.amountCents,
        currency: input.currency.toLowerCase(),
        destination: input.destinationAccountId,
        source_transaction: input.sourceChargeId,
        transfer_group: input.transferGroup,
      },
      { idempotencyKey }
    );
    return { id: transfer.id };
  }

  async createRefund(input: CreateRefundInput, idempotencyKey: string) {
    const refund = await this.stripe.refunds.create(
      { charge: input.chargeId, amount: input.amountCents },
      { idempotencyKey }
    );
    return { id: refund.id };
  }

  async createTransferReversal(
    transferId: string,
    amountCents: number,
    idempotencyKey: string
  ) {
    const reversal = await this.stripe.transfers.createReversal(
      transferId,
      { amount: amountCents },
      { idempotencyKey }
    );
    return { id: reversal.id };
  }

  constructEvent(rawBody: Buffer | string, signature: string, secret: string) {
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }
}
