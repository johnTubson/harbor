import "reflect-metadata";
import { loadEnvForCli } from "../src/config/env";

loadEnvForCli();

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

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

describe("auth and admin operations", () => {
  let app: INestApplication;
  let adminToken: string;
  let pendingMerchantId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    adminToken = await login(app, "admin@harbor.demo", "demo1234");

    const prisma = app.get(PrismaService);
    const pending = await prisma.merchant.update({
      where: { slug: "pending-artisan" },
      data: { status: "pending", rejectReason: null },
    });
    pendingMerchantId = pending.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it("rejects invalid login credentials", async () => {
    await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "admin@harbor.demo", password: "wrong-password" })
      .expect(401);
  });

  it("admin login returns platform_admin role", async () => {
    const response = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "admin@harbor.demo", password: "demo1234" })
      .expect(201);

    expect(response.body.user.role).toBe("platform_admin");
    expect(response.body.user.merchantId).toBeNull();
    expect(response.body.refreshToken).not.toBe("refresh-not-implemented");
  });

  it("merchant cannot list all merchants", async () => {
    const token = await login(app, "merchant@harbor.demo", "demo1234");

    await request(app.getHttpServer())
      .get("/merchants")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });

  it("admin lists merchants with status filter", async () => {
    const response = await request(app.getHttpServer())
      .get("/merchants")
      .query({ status: "active" })
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.length).toBeGreaterThanOrEqual(2);
    expect(
      response.body.every((m: { status: string }) => m.status === "active")
    ).toBe(true);
  });

  it("admin gets merchant detail with KYC documents", async () => {
    expect(pendingMerchantId).toBeTruthy();

    const response = await request(app.getHttpServer())
      .get(`/merchants/${pendingMerchantId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.name).toBe("Pending Artisan Co");
    expect(response.body.kycDocuments.length).toBeGreaterThan(0);
  });

  it("merchant cannot approve merchants", async () => {
    const token = await login(app, "merchant@harbor.demo", "demo1234");

    await request(app.getHttpServer())
      .patch(`/merchants/${pendingMerchantId}/approve`)
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });

  it("admin can read audit log", async () => {
    const response = await request(app.getHttpServer())
      .get("/audit")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.items).toBeInstanceOf(Array);
    expect(response.body.total).toBeGreaterThan(0);
  });

  it("health endpoint returns ok", async () => {
    const response = await request(app.getHttpServer())
      .get("/health")
      .expect(200);

    expect(response.body.status).toBe("ok");
  });

  it("merchant can read own profile", async () => {
    const token = await login(app, "merchant@harbor.demo", "demo1234");

    const response = await request(app.getHttpServer())
      .get("/merchants/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.slug).toBe("harbor-demo");
  });

  it("admin approves pending merchant and writes audit log", async () => {
    expect(pendingMerchantId).toBeTruthy();

    const approved = await request(app.getHttpServer())
      .patch(`/merchants/${pendingMerchantId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(approved.body.status).toBe("active");

    const audit = await request(app.getHttpServer())
      .get("/audit")
      .query({ limit: 50 })
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const approval = audit.body.items.find(
      (entry: { action: string; entityId: string }) =>
        entry.action === "merchant.approved" &&
        entry.entityId === pendingMerchantId
    );
    expect(approval).toBeTruthy();
  });
});
