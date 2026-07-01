import "reflect-metadata";
import { loadEnvForCli } from "../src/config/env";

loadEnvForCli();

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { SettlementsService } from "../src/modules/settlements/settlements.service";

async function login(
  app: INestApplication,
  email: string,
  password: string
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post("/auth/login")
    .send({ email, password })
    .expect(201);

  return response.body.accessToken as string;
}

describe("orders and settlements", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects invalid order state transition", async () => {
    const token = await login(app, "merchant2@harbor.demo", "demo1234");

    const created = await request(app.getHttpServer())
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        lines: [
          {
            productTitle: "Test Product",
            quantity: 1,
            unitPriceCents: 1000,
          },
        ],
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/orders/${created.body.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "delivered" })
      .expect(400);
  });

  it("allows valid order state transition", async () => {
    const token = await login(app, "merchant2@harbor.demo", "demo1234");

    const created = await request(app.getHttpServer())
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        lines: [
          {
            productTitle: "Test Product",
            quantity: 1,
            unitPriceCents: 1000,
          },
        ],
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`/orders/${created.body.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "paid" })
      .expect(200);

    expect(response.body.status).toBe("paid");
  });

  it("settlement preview shows fee breakdown", async () => {
    const token = await login(app, "merchant@harbor.demo", "demo1234");
    const periodStart = new Date("2020-01-01").toISOString();
    const periodEnd = new Date("2030-12-31").toISOString();

    const response = await request(app.getHttpServer())
      .get("/settlements/preview")
      .query({ periodStart, periodEnd })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.totals.orderCount).toBeGreaterThan(0);
    expect(response.body.totals.grossCents).toBeGreaterThan(0);
    expect(response.body.totals.feeBreakdown.percentBps).toBe(290);
    expect(response.body.totals.feeBreakdown.flatCentsPerOrder).toBe(30);
    expect(response.body.totals.feeBreakdown.percentFeeLabel).toBe("2.9%");
    expect(response.body.totals.feeCents).toBe(
      response.body.totals.feeBreakdown.percentFeeCents +
        response.body.totals.feeBreakdown.flatFeeCents
    );
    expect(response.body.totals.netCents).toBe(
      response.body.totals.grossCents - response.body.totals.feeCents
    );
    expect(response.body.merchants).toHaveLength(1);
  });

  it("order lines include server-computed line totals", async () => {
    const token = await login(app, "merchant@harbor.demo", "demo1234");

    const response = await request(app.getHttpServer())
      .get("/orders")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.length).toBeGreaterThan(0);
    const line = response.body[0].lines[0];
    expect(line.lineTotalCents).toBeTypeOf("number");
    expect(line.lineTotalCents).toBeGreaterThan(0);
  });

  it("worker creates settlement record in test", async () => {
    const settlementsService = app.get(SettlementsService);
    const periodStart = new Date("2020-01-01");
    const periodEnd = new Date("2030-12-31");

    const merchants = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "merchant@harbor.demo", password: "demo1234" })
      .expect(201);

    const merchantId = merchants.body.user.merchantId as string;

    const preview = await settlementsService.previewForMerchant(merchantId, {
      periodStart,
      periodEnd,
    });
    expect(preview.orderCount).toBeGreaterThan(0);

    const settlement = await settlementsService.createDraftForMerchant(
      merchantId,
      { periodStart, periodEnd }
    );

    expect(settlement).not.toBeNull();
    expect(settlement!.status).toBe("draft");
    expect(settlement!.grossCents).toBe(preview.grossCents);
    expect(settlement!.feeCents).toBe(preview.feeCents);
    expect(settlement!.netCents).toBe(preview.netCents);
  });
});
