import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import { runStripeSetup, type SetupOptions } from "./stripe-setup";

type MockState = {
  country: string;
  connectEnabled: boolean;
  prices: { id: string; product: string }[];
  portals: { id: string; metadata: Record<string, string> }[];
  endpoints: { id: string; url: string }[];
  taxStatus: "active" | "pending";
};

function mockStripe(state: MockState) {
  const stripe = {
    accounts: {
      retrieveCurrent: vi.fn(async () => ({ country: state.country })),
      list: vi.fn(async () => {
        if (!state.connectEnabled) throw new Error("Connect not enabled");
        return { data: [] };
      }),
    },
    prices: {
      list: vi.fn(async () => ({ data: state.prices })),
      create: vi.fn(async () => ({ id: "price_new" })),
    },
    products: { create: vi.fn(async () => ({ id: "prod_new" })) },
    billingPortal: {
      configurations: {
        list: vi.fn(async () => ({ data: state.portals })),
        create: vi.fn(async () => ({ id: "bpc_new" })),
      },
    },
    tax: {
      settings: {
        retrieve: vi.fn(async () => ({
          status: state.taxStatus,
          status_details: { pending: { missing_fields: ["head_office"] } },
        })),
      },
    },
    webhookEndpoints: {
      list: vi.fn(async () => ({ data: state.endpoints })),
      create: vi.fn(async (params: { url: string }) => ({
        id: `we_${params.url.endsWith("connect") ? "connect" : "account"}`,
        secret: "whsec_created",
      })),
    },
  };
  return { stripe, client: stripe as unknown as Stripe };
}

const freshState = (): MockState => ({
  country: "US",
  connectEnabled: true,
  prices: [],
  portals: [],
  endpoints: [],
  taxStatus: "active",
});

const options: SetupOptions = {
  dryRun: false,
  priceLookupKey: "harbor_pro_monthly",
  portalReturnUrl: "http://localhost:3012/billing",
  webhookBaseUrl: "https://api.example.com/",
};

describe("runStripeSetup", () => {
  it("creates every missing resource on a fresh account", async () => {
    const { stripe, client } = mockStripe(freshState());
    const report = await runStripeSetup(client, options);

    expect(stripe.prices.create).toHaveBeenCalledWith(
      expect.objectContaining({
        product: "prod_new",
        lookup_key: "harbor_pro_monthly",
        recurring: { interval: "month" },
      }),
      { idempotencyKey: "setup:price:harbor_pro_monthly" }
    );
    expect(stripe.billingPortal.configurations.create).toHaveBeenCalledOnce();
    expect(stripe.webhookEndpoints.create).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://api.example.com/webhooks/stripe",
        connect: false,
      })
    );
    expect(stripe.webhookEndpoints.create).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://api.example.com/webhooks/stripe/connect",
        connect: true,
        enabled_events: expect.arrayContaining(["account.updated"]),
      })
    );
    expect(report.actionRequired).toEqual([
      "Set STRIPE_WEBHOOK_SECRET=whsec_created on the API host (shown once)",
      "Set STRIPE_CONNECT_WEBHOOK_SECRET=whsec_created on the API host (shown once)",
    ]);
  });

  it("creates nothing when everything already exists", async () => {
    const { stripe, client } = mockStripe({
      ...freshState(),
      prices: [{ id: "price_1", product: "prod_1" }],
      portals: [{ id: "bpc_1", metadata: { harbor: "s0-setup" } }],
      endpoints: [
        { id: "we_1", url: "https://api.example.com/webhooks/stripe" },
        { id: "we_2", url: "https://api.example.com/webhooks/stripe/connect" },
      ],
    });
    const report = await runStripeSetup(client, options);

    expect(stripe.products.create).not.toHaveBeenCalled();
    expect(stripe.prices.create).not.toHaveBeenCalled();
    expect(stripe.billingPortal.configurations.create).not.toHaveBeenCalled();
    expect(stripe.webhookEndpoints.create).not.toHaveBeenCalled();
    expect(report.created).toEqual([]);
    expect(report.actionRequired).toEqual([]);
  });

  it("makes no writes in dry-run mode", async () => {
    const { stripe, client } = mockStripe(freshState());
    const report = await runStripeSetup(client, { ...options, dryRun: true });

    expect(stripe.products.create).not.toHaveBeenCalled();
    expect(stripe.prices.create).not.toHaveBeenCalled();
    expect(stripe.billingPortal.configurations.create).not.toHaveBeenCalled();
    expect(stripe.webhookEndpoints.create).not.toHaveBeenCalled();
    expect(report.created.every((line) => line.startsWith("[dry-run]"))).toBe(
      true
    );
  });

  it("flags an unsupported platform country, missing Connect and pending Tax", async () => {
    const { client } = mockStripe({
      ...freshState(),
      country: "NG",
      connectEnabled: false,
      taxStatus: "pending",
    });
    const report = await runStripeSetup(client, {
      ...options,
      dryRun: true,
      webhookBaseUrl: undefined,
    });

    expect(report.actionRequired).toEqual([
      expect.stringContaining("Platform country NG does not support"),
      expect.stringContaining("Connect not enabled"),
      expect.stringContaining("missing: head_office"),
    ]);
  });
});
