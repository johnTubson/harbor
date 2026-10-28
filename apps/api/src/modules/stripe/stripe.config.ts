import { z } from "zod";

export const STRIPE_CONFIG = Symbol("STRIPE_CONFIG");

/** Default secrets used by `STRIPE_MODE=fake` so tests can sign fixtures without env setup. */
export const FAKE_WEBHOOK_SECRET = "whsec_fake_account";
export const FAKE_CONNECT_WEBHOOK_SECRET = "whsec_fake_connect";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

const envSchema = z.object({
  STRIPE_MODE: z.preprocess(
    emptyToUndefined,
    z.enum(["fake", "test"]).default("fake")
  ),
  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  STRIPE_CONNECT_WEBHOOK_SECRET: optionalString,
});

export type StripeConfig = {
  mode: "fake" | "test";
  secretKey?: string;
  webhookSecret: string;
  connectWebhookSecret: string;
};

/**
 * Parse Stripe env. Live keys are never accepted — Harbor is a test-mode demo
 * (see ADR-007). Throws at boot so a misconfigured deploy cannot start.
 */
export function loadStripeConfig(
  env: Record<string, string | undefined> = process.env
): StripeConfig {
  if (env.STRIPE_MODE === "live") {
    throw new Error("STRIPE_MODE=live is not supported (ADR-007)");
  }

  const parsed = envSchema.parse(env);
  const secretKey = parsed.STRIPE_SECRET_KEY;

  if (secretKey && /^(sk|rk)_live_/.test(secretKey)) {
    throw new Error("Live Stripe keys are not allowed (ADR-007)");
  }

  if (parsed.STRIPE_MODE === "fake") {
    return {
      mode: "fake",
      webhookSecret: parsed.STRIPE_WEBHOOK_SECRET ?? FAKE_WEBHOOK_SECRET,
      connectWebhookSecret:
        parsed.STRIPE_CONNECT_WEBHOOK_SECRET ?? FAKE_CONNECT_WEBHOOK_SECRET,
    };
  }

  if (!secretKey || !/^(sk|rk)_test_/.test(secretKey)) {
    throw new Error(
      "STRIPE_MODE=test requires STRIPE_SECRET_KEY starting with sk_test_ or rk_test_"
    );
  }
  if (!parsed.STRIPE_WEBHOOK_SECRET || !parsed.STRIPE_CONNECT_WEBHOOK_SECRET) {
    throw new Error(
      "STRIPE_MODE=test requires STRIPE_WEBHOOK_SECRET and STRIPE_CONNECT_WEBHOOK_SECRET"
    );
  }

  return {
    mode: "test",
    secretKey,
    webhookSecret: parsed.STRIPE_WEBHOOK_SECRET,
    connectWebhookSecret: parsed.STRIPE_CONNECT_WEBHOOK_SECRET,
  };
}
