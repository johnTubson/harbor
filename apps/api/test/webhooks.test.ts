import "reflect-metadata";
import { loadEnvForCli } from "../src/config/env";

loadEnvForCli();

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { FakeStripeGateway } from "../src/modules/stripe/fake-stripe.gateway";
import {
  STRIPE_CONFIG,
  type StripeConfig,
} from "../src/modules/stripe/stripe.config";
import { StripeGateway } from "../src/modules/stripe/stripe.gateway";

function fixture(name: string): string {
  return readFileSync(join(__dirname, "fixtures/stripe", `${name}.json`), "utf8");
}

describe("stripe webhooks", () => {
  let app: INestApplication;
  let gateway: FakeStripeGateway;
  let config: StripeConfig;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ rawBody: true });
    await app.init();

    const resolved = app.get(StripeGateway);
    if (!(resolved instanceof FakeStripeGateway)) {
      throw new Error("Webhook tests require STRIPE_MODE=fake");
    }
    gateway = resolved;
    config = app.get<StripeConfig>(STRIPE_CONFIG);
  });

  afterAll(async () => {
    await app?.close();
  });

  function post(path: string, payload: string, signature?: string) {
    const req = request(app.getHttpServer())
      .post(path)
      .set("Content-Type", "application/json");
    if (signature) {
      req.set("Stripe-Signature", signature);
    }
    return req.send(payload);
  }

  it("accepts a correctly signed account event", async () => {
    const payload = fixture("checkout.session.completed");
    const response = await post(
      "/webhooks/stripe",
      payload,
      gateway.signPayload(payload, config.webhookSecret)
    ).expect(200);

    expect(response.body).toEqual({
      received: true,
      id: "evt_fixture_checkout_completed",
    });
  });

  it("accepts a correctly signed Connect event", async () => {
    const payload = fixture("account.updated");
    const response = await post(
      "/webhooks/stripe/connect",
      payload,
      gateway.signPayload(payload, config.connectWebhookSecret)
    ).expect(200);

    expect(response.body.id).toBe("evt_fixture_account_updated");
  });

  it("rejects a bad signature without echoing the payload", async () => {
    const payload = fixture("checkout.session.completed");
    const response = await post(
      "/webhooks/stripe",
      payload,
      gateway.signPayload(payload, "whsec_wrong")
    ).expect(400);

    expect(JSON.stringify(response.body)).not.toContain("cs_test_fixture");
  });

  it("rejects a payload altered after signing", async () => {
    const payload = fixture("checkout.session.completed");
    const signature = gateway.signPayload(payload, config.webhookSecret);
    await post(
      "/webhooks/stripe",
      payload.replace("5000", "1"),
      signature
    ).expect(400);
  });

  it("rejects a missing Stripe-Signature header", async () => {
    await post("/webhooks/stripe", fixture("checkout.session.completed")).expect(
      400
    );
  });

  it("keeps endpoint secrets separate", async () => {
    const payload = fixture("account.updated");
    await post(
      "/webhooks/stripe/connect",
      payload,
      gateway.signPayload(payload, config.webhookSecret)
    ).expect(400);
  });
});
