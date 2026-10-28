# ADR-007: Money path — Stripe Connect separate charges and transfers

**Status:** Accepted (S0, 2026-10-25)
**Context docs:** Stripe extension research and implementation plan (internal, not published)
**Stripe sources** (retrieved 2026-10-25, SDK `stripe@23.0.1`, API `2026-09-30.endive`):

- [Separate charges and transfers (Checkout, Stripe-hosted)](https://docs.stripe.com/connect/separate-charges-and-transfers?platform=web&integration=checkout&ui=stripe-hosted)
- [Create an account — `controller`](https://docs.stripe.com/api/accounts/create)

---

## Context

Harbor is a services marketplace. A buyer pays up front, the platform holds the funds, and the seller is paid only after the buyer approves delivery. Sellers are Stripe Connect **Express** accounts. The platform also sells sellers a Harbor Pro subscription (Stripe Billing), which this ADR does not cover beyond the fee tier.

## Decision

### 1. Charge type: separate charges and transfers (SCT)

- The buyer pays the **platform** through a Stripe Checkout Session (`mode: payment`). The session carries `payment_intent_data.transfer_group = orderId` and `metadata.{orderId,paymentId}`. It has **no** `transfer_data` and **no** `application_fee_amount`.
- No money moves to the seller at payment time. The order sits in `held`.
- Destination charges are documented as an alternate "instant release" mode only. Direct charges are out of scope, because they suit sellers who own the customer relationship.

**Why SCT:** it is the only Connect charge type that separates payment from payout without a fixed authorization window, which is what hold-and-release needs. Stripe: _"The charge on your platform account is decoupled from the transfers to your connected accounts."_

### 2. Release trigger

Funds are released when the buyer approves a `delivered` order (`POST /orders/:id/approve`). An admin can force-release, which is audit-logged.

Release flow:

1. Guarded state change `UPDATE Payment SET status='releasing' WHERE id=$1 AND status='held'`. If 0 rows are updated, return 409, so no double transfers.
2. `transfers.create({ amount, currency, destination, source_transaction: chargeId, transfer_group: orderId })` with idempotency key `transfer:{paymentId}`.
3. Persist the Transfer, post the ledger journal, and set the order to `completed`. The `transfer.created` webhook reconciles if the process died after step 2.

**Why `source_transaction`:** the transfer succeeds even if the charge's funds are still pending on the platform, and Stripe holds it until they become available. Constraints from Stripe: the transfer must not exceed the source charge, it inherits the charge's pending period, and the attribute cannot be set later.

**Hold window:** the SCT docs give no maximum time between charge and transfer. Harbor still enforces its own limit: S2 adds an auto-release or escalation job after `HOLD_MAX_DAYS` (default 14) so funds are never held indefinitely.

### 3. Fee math

- The platform fee is `MoneyService.platformFeeCents(subtotalCents, tier)`: free = 2.9% + $0.30, Pro = 1.9% + $0.30. It is **snapshotted on `Payment.platformFeeCents` at checkout**, so a plan change never alters an in-flight order.
- `transfer.amount = subtotalCents − platformFeeCents`.
- With SCT there is no application fee object. Stripe: _"the platform can collect fees on a charge by reducing the amount it transfers to the destination accounts."_
- Stripe's processing fees are debited from the platform balance and are not passed to the seller. They are a known gap in v1 reconciliation.

### 4. Tax

With SCT and no `on_behalf_of`, the platform is the business of record. Stripe Tax collected at checkout stays on the platform balance as `tax_payable`. **Transfers are computed from the pre-tax subtotal, never from `amount_received`.**

### 5. Refunds

Stripe: _"refunding a charge has no impact on any associated transfers."_ Harbor therefore handles refunds as follows:

- **Before release:** refund the charge. No transfer exists. The ledger reverses payable, fee and tax pro-rata. Policy: a full refund returns the platform fee.
- **After release:** **reverse the transfer first** (`transfers.createReversal`, pro-rata net, key `reversal:{transferId}:{refundRequestId}`), then refund the charge (key `refund:{paymentId}:{refundRequestId}`).
- **Reversal can fail:** a reversal needs the seller's available balance to cover it (or connected reserves). If it fails, Harbor **does not refund**. It returns `refund_blocked_reversal_failed`, and the admin's recovery options are: retry after the seller's balance recovers, net the amount off the seller's future transfers, or refund from platform funds as a written-off loss.

### 6. Disputes and losses

Express accounts are created with:

```ts
controller: {
  stripe_dashboard: { type: "express" },
  fees: { payer: "application" },
  losses: { payments: "application" },
  requirement_collection: "stripe",
}
```

(`type: "express"` is deprecated in favour of `controller`.) The platform pays Stripe's fees and is liable for negative balances and chargebacks. Stripe recommends SCT only when the platform is responsible for negative balances, and this configuration is consistent with that.

On `charge.dispute.created`, the payment moves to `disputed` and appears in the admin dispute queue. If the dispute is lost, the loss goes to the `dispute_losses` ledger account. Reversing the seller's transfer for a lost dispute is an admin decision, audit-logged, and never automatic.

### 7. Idempotency

| Call              | Idempotency key                           |
| ----------------- | ----------------------------------------- |
| Express account   | `acct:{merchantId}`                       |
| Checkout session  | `checkout:{orderId}`                      |
| Release transfer  | `transfer:{paymentId}`                    |
| Refund            | `refund:{paymentId}:{refundRequestId}`    |
| Transfer reversal | `reversal:{transferId}:{refundRequestId}` |
| Billing customer  | `customer:{merchantId}`                   |

Inbound webhooks are deduplicated on `event.id` (`StripeEvent` primary key, then BullMQ `jobId`). Handlers are additionally idempotent through unique Stripe-object-ID columns and ledger `(journalKey, account, direction)`.

### 8. Webhook endpoints

| Endpoint                         | Secret                          | Receives                                               |
| -------------------------------- | ------------------------------- | ------------------------------------------------------ |
| `POST /webhooks/stripe`          | `STRIPE_WEBHOOK_SECRET`         | Platform events: checkout, payment_intent, charge, transfer, dispute, billing |
| `POST /webhooks/stripe/connect`  | `STRIPE_CONNECT_WEBHOOK_SECRET` | Connected-account events (`account.updated`, carries `event.account`) |

Signatures are verified against the raw body (`NestFactory.create(AppModule, { rawBody: true })`). Verification failures return 400 without echoing the payload.

### 9. Regions and the platform-country blocker

- SCT is supported for platforms in AE, AT, AU, BE, BG, BR, CA, CH, CY, CZ, DE, DK, EE, ES, FI, FR, GB, GI, GR, HK, HR, HU, IE, IT, JP, LI, LT, LU, LV, MT, MX, MY, NL, NO, NZ, PL, PT, RO, SE, SG, SI, SK, and US.
- Cross-border transfers work only between the **US, CA, UK, EEA and CH**. Otherwise the platform and connected accounts must be in the same region.
- **Nigeria (NG) is not a supported SCT platform country.** The platform account must belong to a real entity in a supported country (owned, Atlas, or partner-hosted test keys). Never use a false address.
- Demo configuration: a US platform, US Express sellers, USD only.

### 10. Test-mode only

`STRIPE_MODE` is `fake` (in-memory `FakeStripeGateway`, used in CI and before an account exists) or `test` (real test-mode keys). `STRIPE_MODE=live`, `sk_live_` and `rk_live_` keys are **rejected at boot** (`loadStripeConfig`).

## Consequences

- **Positive:** a real escrow-style flow, an explicit ledger, one clear place where money moves (`transfer:{paymentId}`), and the whole path testable offline.
- **Negative:** the platform carries chargeback and negative-balance risk, refund after release depends on the seller's balance, and Stripe processing fees are absorbed by the platform.
- **Follow-ups:** an auto-release job (S2), Stripe fee reconciliation from balance transactions (post-v1), and a destination-charge mode (post-v1).

## Alternatives considered

| Option                              | Rejected because                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| Destination charges                 | Funds move to the seller at charge time, so a "hold" needs reversals. Kept as an alternate mode.  |
| Direct charges                      | The seller owns the customer and the charge. Wrong story for a platform-owned marketplace.         |
| Manual capture (auth-and-hold)      | Card authorizations expire within days, which is too short for service delivery.                  |
| Connected-account manual payouts    | Funds sit on the seller's balance, so the platform cannot claw back cleanly before approval.      |
