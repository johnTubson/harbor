import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import type Stripe from "stripe";
import { STRIPE_CONFIG, type StripeConfig } from "../stripe/stripe.config";
import { StripeGateway } from "../stripe/stripe.gateway";

/** Which Stripe webhook endpoint received the event; each has its own secret. */
export type WebhookEndpoint = "account" | "connect";

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly stripe: StripeGateway,
    @Inject(STRIPE_CONFIG) private readonly config: StripeConfig
  ) {}

  verify(
    endpoint: WebhookEndpoint,
    rawBody: Buffer | undefined,
    signature: string | undefined
  ): Stripe.Event {
    if (!signature) {
      throw new BadRequestException("Missing Stripe-Signature header");
    }
    if (!rawBody) {
      throw new BadRequestException("Missing raw request body");
    }

    const secret =
      endpoint === "connect"
        ? this.config.connectWebhookSecret
        : this.config.webhookSecret;

    try {
      return this.stripe.constructEvent(rawBody, signature, secret);
    } catch {
      // Never echo the payload or the verification detail back to the caller.
      this.logger.warn(`Rejected ${endpoint} webhook: invalid signature`);
      throw new BadRequestException("Invalid Stripe signature");
    }
  }

  /**
   * S0: verify + log only. S1 persists to StripeEvent (dedupe on event.id);
   * S2 enqueues to the BullMQ worker before acknowledging.
   */
  receive(
    endpoint: WebhookEndpoint,
    rawBody: Buffer | undefined,
    signature: string | undefined
  ) {
    const event = this.verify(endpoint, rawBody, signature);
    this.logger.log(
      `Received ${endpoint} webhook ${event.id} (${event.type})${
        event.account ? ` for ${event.account}` : ""
      }`
    );
    return { received: true, id: event.id };
  }
}
