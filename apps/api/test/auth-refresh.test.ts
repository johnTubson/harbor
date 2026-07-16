import "reflect-metadata";
import { createHash } from "node:crypto";
import { loadEnvForCli } from "../src/config/env";

loadEnvForCli();

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

describe("auth refresh rotation", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it("login returns a real refresh token (not the stub)", async () => {
    const response = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "admin@harbor.demo", password: "demo1234" })
      .expect(201);

    expect(response.body.refreshToken).toBeTruthy();
    expect(response.body.refreshToken).not.toBe("refresh-not-implemented");
    expect(response.body.accessToken).toBeTruthy();
  });

  it("refresh rotates tokens and invalidates the old refresh", async () => {
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "admin@harbor.demo", password: "demo1234" })
      .expect(201);

    const firstRefresh = login.body.refreshToken as string;

    const rotated = await request(app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken: firstRefresh })
      .expect(201);

    expect(rotated.body.accessToken).toBeTruthy();
    expect(rotated.body.refreshToken).toBeTruthy();
    expect(rotated.body.refreshToken).not.toBe(firstRefresh);

    await request(app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken: firstRefresh })
      .expect(401);
  });

  it("reusing a rotated refresh token revokes the whole family", async () => {
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "merchant@harbor.demo", password: "demo1234" })
      .expect(201);

    const firstRefresh = login.body.refreshToken as string;

    const rotated = await request(app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken: firstRefresh })
      .expect(201);

    const secondRefresh = rotated.body.refreshToken as string;

    await request(app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken: firstRefresh })
      .expect(401);

    await request(app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken: secondRefresh })
      .expect(401);

    const reused = await prisma.refreshToken.findUniqueOrThrow({
      where: { tokenHash: hashToken(firstRefresh) },
    });
    const activeInFamily = await prisma.refreshToken.count({
      where: {
        familyId: reused.familyId,
        revokedAt: null,
      },
    });
    expect(activeInFamily).toBe(0);
  });

  it("logout revokes refresh so subsequent refresh fails", async () => {
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "admin@harbor.demo", password: "demo1234" })
      .expect(201);

    const refreshToken = login.body.refreshToken as string;

    await request(app.getHttpServer())
      .post("/auth/logout")
      .send({ refreshToken })
      .expect(201);

    await request(app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken })
      .expect(401);
  });
});
