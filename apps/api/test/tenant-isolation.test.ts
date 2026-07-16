import "reflect-metadata";
import { loadEnvForCli } from "../src/config/env";

loadEnvForCli();

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { jwtPayloadSchema } from "@harbor/shared";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";

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

describe("tenant isolation", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it("login returns JWT with correct claims", async () => {
    const response = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "merchant@harbor.demo", password: "demo1234" })
      .expect(201);

    expect(response.body.accessToken).toBeTypeOf("string");
    expect(response.body.user).toMatchObject({
      email: "merchant@harbor.demo",
      role: "merchant_admin",
    });
    expect(response.body.user.merchantId).toBeTruthy();

    const [, payloadB64] = (response.body.accessToken as string).split(".");
    const payload = jwtPayloadSchema.parse(
      JSON.parse(Buffer.from(payloadB64, "base64url").toString())
    );
    expect(payload.sub).toBe(response.body.user.id);
    expect(payload.email).toBe("merchant@harbor.demo");
    expect(payload.role).toBe("merchant_admin");
    expect(payload.merchantId).toBe(response.body.user.merchantId);
  });

  it("merchant cannot access another merchant's products", async () => {
    const merchant1Token = await login(app, "merchant@harbor.demo", "demo1234");
    const merchant2Token = await login(
      app,
      "merchant2@harbor.demo",
      "demo1234"
    );

    const merchant1Products = await request(app.getHttpServer())
      .get("/products")
      .set("Authorization", `Bearer ${merchant1Token}`)
      .expect(200);

    const merchant2Products = await request(app.getHttpServer())
      .get("/products")
      .set("Authorization", `Bearer ${merchant2Token}`)
      .expect(200);

    expect(merchant1Products.body.length).toBeGreaterThan(0);
    expect(merchant2Products.body.length).toBeGreaterThan(0);

    const merchant1Ids = new Set(
      merchant1Products.body.map((p: { id: string }) => p.id)
    );
    const merchant2Ids = new Set(
      merchant2Products.body.map((p: { id: string }) => p.id)
    );

    for (const id of merchant2Ids) {
      expect(merchant1Ids.has(id)).toBe(false);
    }

    const crossTenantProductId = merchant2Products.body[0].id as string;
    await request(app.getHttpServer())
      .get(`/products/${crossTenantProductId}`)
      .set("Authorization", `Bearer ${merchant1Token}`)
      .expect(403);
  });

  it("rejects client-supplied merchantId for merchant users", async () => {
    const token = await login(app, "merchant@harbor.demo", "demo1234");

    await request(app.getHttpServer())
      .get("/products")
      .query({ merchantId: "00000000-0000-0000-0000-000000000001" })
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });
});
