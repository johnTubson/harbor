import Stripe from "stripe";
import {
  type AccountSnapshot,
  type CreateCheckoutSessionInput,
  type CreateExpressAccountInput,
  type CreateRefundInput,
  type CreateTransferInput,
  StripeGateway,
} from "./stripe.gateway";

export type FakeStripeCall = {
  method: string;
  idempotencyKey?: string;
  input: unknown;
};

/**
 * In-memory Stripe for CI and pre-account development. IDs are derived from
 * the idempotency key, so retries return the same object — mirroring Stripe's
 * idempotency semantics. Webhook signatures are verified for real.
 */
export class FakeStripeGateway extends StripeGateway {
  readonly calls: FakeStripeCall[] = [];
  readonly accounts = new Map<string, AccountSnapshot>();

  // Placeholder key: the SDK client is used only for offline signature checks.
  private readonly signer = new Stripe("sk_test_fake_offline");

  private fakeId(prefix: string, idempotencyKey: string) {
    return `${prefix}_fake_${idempotencyKey.replace(/[^a-zA-Z0-9]/g, "_")}`;
  }

  private record(method: string, input: unknown, idempotencyKey?: string) {
    this.calls.push({ method, input, idempotencyKey });
  }

  async createExpressAccount(
    input: CreateExpressAccountInput,
    idempotencyKey: string
  ) {
    this.record("createExpressAccount", input, idempotencyKey);
    const id = this.fakeId("acct", idempotencyKey);
    if (!this.accounts.has(id)) {
      this.accounts.set(id, {
        id,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        requirementsDue: ["external_account", "tos_acceptance.date"],
        disabledReason: "requirements.past_due",
      });
    }
    return { id };
  }

  async createAccountLink(
    accountId: string,
    returnUrl: string,
    refreshUrl: string
  ) {
    this.record("createAccountLink", { accountId, returnUrl, refreshUrl });
    return {
      url: `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}fake_account=${accountId}`,
    };
  }

  async retrieveAccount(accountId: string) {
    this.record("retrieveAccount", { accountId });
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`No such account: ${accountId}`);
    }
    return account;
  }

  async createCheckoutSession(
    input: CreateCheckoutSessionInput,
    idempotencyKey: string
  ) {
    this.record("createCheckoutSession", input, idempotencyKey);
    const id = this.fakeId("cs", idempotencyKey);
    return { id, url: `${input.successUrl}?session_id=${id}` };
  }

  async createTransfer(input: CreateTransferInput, idempotencyKey: string) {
    this.record("createTransfer", input, idempotencyKey);
    return { id: this.fakeId("tr", idempotencyKey) };
  }

  async createRefund(input: CreateRefundInput, idempotencyKey: string) {
    this.record("createRefund", input, idempotencyKey);
    return { id: this.fakeId("re", idempotencyKey) };
  }

  async createTransferReversal(
    transferId: string,
    amountCents: number,
    idempotencyKey: string
  ) {
    this.record(
      "createTransferReversal",
      { transferId, amountCents },
      idempotencyKey
    );
    return { id: this.fakeId("trr", idempotencyKey) };
  }

  constructEvent(rawBody: Buffer | string, signature: string, secret: string) {
    return this.signer.webhooks.constructEvent(rawBody, signature, secret);
  }

  /** Test helper: build a `Stripe-Signature` header for a payload. */
  signPayload(payload: string, secret: string): string {
    return this.signer.webhooks.generateTestHeaderString({ payload, secret });
  }
}
