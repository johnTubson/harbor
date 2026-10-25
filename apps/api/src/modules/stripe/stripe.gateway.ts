import type Stripe from "stripe";

export type AccountSnapshot = {
  id: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsDue: string[];
  disabledReason: string | null;
};

export type CreateExpressAccountInput = {
  email: string;
  country: string;
  merchantId: string;
};

export type CreateCheckoutSessionInput = {
  orderId: string;
  paymentId: string;
  currency: string;
  lineItems: { name: string; unitAmountCents: number; quantity: number }[];
  successUrl: string;
  cancelUrl: string;
  expiresAt: Date;
  customerEmail?: string;
};

export type CreateTransferInput = {
  amountCents: number;
  currency: string;
  destinationAccountId: string;
  sourceChargeId: string;
  transferGroup: string;
};

export type CreateRefundInput = {
  chargeId: string;
  amountCents?: number;
};

/**
 * Port for every Stripe call Harbor makes. Services depend on this, never on
 * the SDK directly, so the whole money path runs against `FakeStripeGateway`
 * in CI and before a supported-country platform account exists (ADR-007).
 */
export abstract class StripeGateway {
  abstract createExpressAccount(
    input: CreateExpressAccountInput,
    idempotencyKey: string
  ): Promise<{ id: string }>;

  abstract createAccountLink(
    accountId: string,
    returnUrl: string,
    refreshUrl: string
  ): Promise<{ url: string }>;

  abstract retrieveAccount(accountId: string): Promise<AccountSnapshot>;

  abstract createCheckoutSession(
    input: CreateCheckoutSessionInput,
    idempotencyKey: string
  ): Promise<{ id: string; url: string }>;

  abstract createTransfer(
    input: CreateTransferInput,
    idempotencyKey: string
  ): Promise<{ id: string }>;

  abstract createRefund(
    input: CreateRefundInput,
    idempotencyKey: string
  ): Promise<{ id: string }>;

  abstract createTransferReversal(
    transferId: string,
    amountCents: number,
    idempotencyKey: string
  ): Promise<{ id: string }>;

  /** Verifies the signature against the raw body; throws on mismatch. */
  abstract constructEvent(
    rawBody: Buffer | string,
    signature: string,
    secret: string
  ): Stripe.Event;
}
