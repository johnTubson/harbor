/**
 * S0 Track B: provision Harbor's Stripe test-mode resources.
 *
 *   pnpm stripe:setup --dry-run
 *   pnpm stripe:setup --webhook-base-url=https://api.example.com
 *
 * Idempotent: every resource is looked up first (by lookup key, metadata or
 * URL) and only created when missing. Dashboard-only steps (Connect platform
 * profile, Tax head office/registrations) are checked and reported.
 */
import Stripe from "stripe";
import { loadEnvForCli } from "../config/env";
import { loadStripeConfig } from "../modules/stripe/stripe.config";
import { STRIPE_API_VERSION } from "../modules/stripe/stripe-sdk.gateway";
import {
  ACCOUNT_WEBHOOK_EVENTS,
  CONNECT_WEBHOOK_EVENTS,
} from "../modules/webhooks/webhook-events";

export const PRO_PRICE_LOOKUP_KEY_DEFAULT = "harbor_pro_monthly";
export const PRO_PRICE_CENTS = 1900;
const HARBOR_METADATA = { harbor: "s0-setup" };

/** Platform countries that support separate charges and transfers (ADR-007 §9). */
// prettier-ignore
export const SCT_PLATFORM_COUNTRIES = new Set([
  "AE", "AT", "AU", "BE", "BG", "BR", "CA", "CH", "CY", "CZ", "DE", "DK",
  "EE", "ES", "FI", "FR", "GB", "GI", "GR", "HK", "HR", "HU", "IE", "IT",
  "JP", "LI", "LT", "LU", "LV", "MT", "MX", "MY", "NL", "NO", "NZ", "PL",
  "PT", "RO", "SE", "SG", "SI", "SK", "US",
]);

export type SetupOptions = {
  dryRun: boolean;
  priceLookupKey: string;
  portalReturnUrl: string;
  webhookBaseUrl?: string;
};

export type SetupReport = {
  ok: string[];
  created: string[];
  actionRequired: string[];
};

export async function runStripeSetup(
  stripe: Stripe,
  options: SetupOptions
): Promise<SetupReport> {
  const report: SetupReport = { ok: [], created: [], actionRequired: [] };
  const create = async <T>(label: string, fn: () => Promise<T>) => {
    if (options.dryRun) {
      report.created.push(`[dry-run] would create ${label}`);
      return undefined;
    }
    const result = await fn();
    report.created.push(label);
    return result;
  };

  // 1. Platform account + Connect
  const platform = await stripe.accounts.retrieveCurrent();
  if (platform.country && SCT_PLATFORM_COUNTRIES.has(platform.country)) {
    report.ok.push(`Platform country ${platform.country} supports SCT`);
  } else {
    report.actionRequired.push(
      `Platform country ${
        platform.country ?? "unknown"
      } does not support separate charges and transfers (ADR-007 §9)`
    );
  }
  try {
    await stripe.accounts.list({ limit: 1 });
    report.ok.push("Connect is enabled on the platform");
  } catch {
    report.actionRequired.push(
      "Connect not enabled: complete the platform profile at https://dashboard.stripe.com/test/connect/accounts/overview"
    );
  }

  // 2. Harbor Pro product + monthly price
  const prices = await stripe.prices.list({
    lookup_keys: [options.priceLookupKey],
    active: true,
    limit: 1,
  });
  const existingPrice = prices.data[0];
  if (existingPrice) {
    report.ok.push(
      `Price ${options.priceLookupKey} exists (${existingPrice.id})`
    );
  } else {
    const product = await create("product Harbor Pro", () =>
      stripe.products.create(
        { name: "Harbor Pro", metadata: HARBOR_METADATA },
        { idempotencyKey: "setup:product:harbor_pro" }
      )
    );
    await create(
      `price ${options.priceLookupKey} ($${PRO_PRICE_CENTS / 100}/mo)`,
      () =>
        stripe.prices.create(
          {
            product: product!.id,
            currency: "usd",
            unit_amount: PRO_PRICE_CENTS,
            recurring: { interval: "month" },
            lookup_key: options.priceLookupKey,
            tax_behavior: "exclusive",
            metadata: HARBOR_METADATA,
          },
          { idempotencyKey: `setup:price:${options.priceLookupKey}` }
        )
    );
  }

  // 3. Customer Portal configuration (looked up by metadata)
  const portals = await stripe.billingPortal.configurations.list({
    active: true,
    limit: 100,
  });
  const portal = portals.data.find(
    (config) => config.metadata?.harbor === HARBOR_METADATA.harbor
  );
  if (portal) {
    report.ok.push(`Customer Portal configuration exists (${portal.id})`);
  } else {
    await create("Customer Portal configuration", () =>
      stripe.billingPortal.configurations.create({
        name: "Harbor Pro",
        metadata: HARBOR_METADATA,
        default_return_url: options.portalReturnUrl,
        business_profile: { headline: "Manage your Harbor Pro plan" },
        features: {
          invoice_history: { enabled: true },
          payment_method_update: { enabled: true },
          customer_update: {
            enabled: true,
            allowed_updates: ["email", "address", "tax_id"],
          },
          subscription_cancel: { enabled: true, mode: "at_period_end" },
        },
      })
    );
  }

  // 4. Stripe Tax (head office + registrations are Dashboard tasks)
  const tax = await stripe.tax.settings.retrieve();
  if (tax.status === "active") {
    report.ok.push("Stripe Tax settings active");
  } else {
    const missing = tax.status_details?.pending?.missing_fields ?? [];
    report.actionRequired.push(
      `Stripe Tax is ${tax.status}${
        missing.length ? ` (missing: ${missing.join(", ")})` : ""
      }: https://dashboard.stripe.com/test/settings/tax`
    );
  }

  // 5. Webhook endpoints (deployed URL only; local dev uses `stripe listen`)
  if (!options.webhookBaseUrl) {
    report.ok.push(
      "No --webhook-base-url: use `stripe listen` locally (see README)"
    );
    return report;
  }
  const base = options.webhookBaseUrl.replace(/\/+$/, "");
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  const targets = [
    {
      label: "account",
      url: `${base}/webhooks/stripe`,
      connect: false,
      events: [...ACCOUNT_WEBHOOK_EVENTS],
      env: "STRIPE_WEBHOOK_SECRET",
    },
    {
      label: "Connect",
      url: `${base}/webhooks/stripe/connect`,
      connect: true,
      events: [...CONNECT_WEBHOOK_EVENTS],
      env: "STRIPE_CONNECT_WEBHOOK_SECRET",
    },
  ];
  for (const target of targets) {
    const existing = endpoints.data.find(
      (endpoint) => endpoint.url === target.url
    );
    if (existing) {
      report.ok.push(
        `${target.label} webhook endpoint exists (${existing.id})`
      );
      continue;
    }
    const endpoint = await create(
      `${target.label} webhook endpoint ${target.url}`,
      () =>
        stripe.webhookEndpoints.create({
          url: target.url,
          connect: target.connect,
          enabled_events: target.events,
          api_version: STRIPE_API_VERSION,
          metadata: HARBOR_METADATA,
        })
    );
    if (endpoint?.secret) {
      // The signing secret is only returned on create.
      report.actionRequired.push(
        `Set ${target.env}=${endpoint.secret} on the API host (shown once)`
      );
    }
  }

  return report;
}

function parseArgs(argv: string[]) {
  const flag = (name: string) =>
    argv
      .find((arg) => arg.startsWith(`--${name}=`))
      ?.split("=")
      .slice(1)
      .join("=");
  return {
    dryRun: argv.includes("--dry-run"),
    webhookBaseUrl: flag("webhook-base-url"),
  };
}

async function main() {
  loadEnvForCli();
  const config = loadStripeConfig();
  if (config.mode !== "test" || !config.secretKey) {
    console.error(
      "stripe:setup needs STRIPE_MODE=test and a sk_test_/rk_test_ STRIPE_SECRET_KEY"
    );
    process.exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  const merchantUrl =
    process.env.MERCHANT_URL ??
    `http://localhost:${process.env.MERCHANT_PORT ?? 3012}`;
  const stripe = new Stripe(config.secretKey, {
    apiVersion: STRIPE_API_VERSION,
  });

  const report = await runStripeSetup(stripe, {
    dryRun: args.dryRun,
    priceLookupKey:
      process.env.STRIPE_PRO_PRICE_LOOKUP_KEY ?? PRO_PRICE_LOOKUP_KEY_DEFAULT,
    portalReturnUrl: `${merchantUrl}/billing`,
    webhookBaseUrl: args.webhookBaseUrl,
  });

  for (const line of report.ok) console.log(`✓ ${line}`);
  for (const line of report.created) console.log(`+ ${line}`);
  for (const line of report.actionRequired) console.log(`! ${line}`);
  process.exit(report.actionRequired.length ? 2 : 0);
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
