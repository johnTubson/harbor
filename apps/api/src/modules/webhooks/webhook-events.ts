import type Stripe from "stripe";

type EnabledEvent = Stripe.WebhookEndpointCreateParams.EnabledEvent;

/**
 * Events delivered to `POST /webhooks/stripe` (platform account). Registered by
 * `stripe:setup`; S2+ handlers are keyed off this list. See ADR-007 §8.
 */
export const ACCOUNT_WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "checkout.session.expired",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "charge.refunded",
  "charge.dispute.created",
  "charge.dispute.updated",
  "charge.dispute.closed",
  "transfer.created",
  "transfer.updated",
  "transfer.reversed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
] as const satisfies readonly EnabledEvent[];

/** Events delivered to `POST /webhooks/stripe/connect` (connected accounts). */
export const CONNECT_WEBHOOK_EVENTS = [
  "account.updated",
  "account.application.deauthorized",
  "capability.updated",
  "payout.paid",
  "payout.failed",
] as const satisfies readonly EnabledEvent[];
