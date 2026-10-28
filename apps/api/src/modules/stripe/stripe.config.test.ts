import { describe, expect, it } from "vitest";
import {
  FAKE_CONNECT_WEBHOOK_SECRET,
  FAKE_WEBHOOK_SECRET,
  loadStripeConfig,
} from "./stripe.config";

const testModeEnv = {
  STRIPE_MODE: "test",
  STRIPE_SECRET_KEY: "sk_test_123",
  STRIPE_WEBHOOK_SECRET: "whsec_account",
  STRIPE_CONNECT_WEBHOOK_SECRET: "whsec_connect",
};

describe("loadStripeConfig", () => {
  it("defaults to fake mode with fake webhook secrets", () => {
    expect(loadStripeConfig({})).toEqual({
      mode: "fake",
      webhookSecret: FAKE_WEBHOOK_SECRET,
      connectWebhookSecret: FAKE_CONNECT_WEBHOOK_SECRET,
    });
  });

  it("treats empty env values as unset", () => {
    expect(
      loadStripeConfig({ STRIPE_MODE: "", STRIPE_SECRET_KEY: "" }).mode
    ).toBe("fake");
  });

  it("rejects STRIPE_MODE=live", () => {
    expect(() => loadStripeConfig({ STRIPE_MODE: "live" })).toThrow(/live/);
  });

  it.each(["sk_live_abc", "rk_live_abc"])(
    "rejects live key %s in any mode",
    (key) => {
      expect(() => loadStripeConfig({ STRIPE_SECRET_KEY: key })).toThrow(
        /Live Stripe keys/
      );
      expect(() =>
        loadStripeConfig({ ...testModeEnv, STRIPE_SECRET_KEY: key })
      ).toThrow(/Live Stripe keys/);
    }
  );

  it("accepts sk_test_ and rk_test_ keys in test mode", () => {
    expect(loadStripeConfig(testModeEnv)).toMatchObject({
      mode: "test",
      secretKey: "sk_test_123",
    });
    expect(
      loadStripeConfig({ ...testModeEnv, STRIPE_SECRET_KEY: "rk_test_123" })
        .secretKey
    ).toBe("rk_test_123");
  });

  it("requires a test key in test mode", () => {
    expect(() =>
      loadStripeConfig({ ...testModeEnv, STRIPE_SECRET_KEY: undefined })
    ).toThrow(/sk_test_/);
  });

  it("requires both webhook secrets in test mode", () => {
    expect(() =>
      loadStripeConfig({
        ...testModeEnv,
        STRIPE_CONNECT_WEBHOOK_SECRET: undefined,
      })
    ).toThrow(/STRIPE_CONNECT_WEBHOOK_SECRET/);
  });
});
