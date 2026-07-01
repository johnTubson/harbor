import "reflect-metadata";
import { loadEnvForCli } from "../src/config/env";

loadEnvForCli();

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { IndexQueueService } from "../src/workers/index-queue.service";

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

describe("search and storage", () => {
  let app: INestApplication;
  let indexQueue: IndexQueueService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    indexQueue = moduleRef.get(IndexQueueService);
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns seeded products from public search", async () => {
    const response = await request(app.getHttpServer())
      .get("/products/search")
      .query({ q: "honey" })
      .expect(200);

    expect(response.body.query).toBe("honey");
    expect(response.body.results.length).toBeGreaterThan(0);
    expect(response.body.results[0]).toMatchObject({
      title: expect.stringMatching(/honey/i),
      merchantName: expect.any(String),
      variants: expect.any(Array),
    });
  });

  it("indexes product within worker fallback after create", async () => {
    const token = await login(app, "merchant2@harbor.demo", "demo1234");
    const uniqueTitle = `Scout Lantern ${Date.now()}`;

    const created = await request(app.getHttpServer())
      .post("/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: uniqueTitle,
        description: "Rechargeable camp lantern for night markets.",
        slug: `scout-lantern-${Date.now()}`,
        variants: [
          {
            sku: `LANT-${Date.now()}`,
            name: "Standard",
            priceCents: 3499,
            stock: 25,
          },
        ],
      })
      .expect(201);

    await indexQueue.indexProductNow(created.body.id as string);

    const response = await request(app.getHttpServer())
      .get("/products/search")
      .query({ q: "Scout Lantern" })
      .expect(200);

    const ids = response.body.results.map((row: { id: string }) => row.id);
    expect(ids).toContain(created.body.id);
  });

  it("search spans multiple active merchants", async () => {
    const response = await request(app.getHttpServer())
      .get("/products/search")
      .query({ q: "organic" })
      .expect(200);

    const merchantSlugs = new Set(
      response.body.results.map(
        (row: { merchantSlug: string }) => row.merchantSlug
      )
    );
    expect(response.body.results.length).toBeGreaterThan(0);
    expect(merchantSlugs.size).toBeGreaterThanOrEqual(1);
  });

  it("rejects KYC object key for wrong merchant", async () => {
    const token = await login(app, "merchant@harbor.demo", "demo1234");

    await request(app.getHttpServer())
      .post("/merchants/me/kyc-documents")
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "business_license",
        objectKey: "kyc/other-merchant/business-license.pdf",
        fileName: "business-license.pdf",
      })
      .expect(400);
  });
});
