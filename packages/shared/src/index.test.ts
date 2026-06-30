import { describe, expect, it } from "vitest";
import {
  HARBOR_VERSION,
  createProductSchema,
  loginSchema,
  merchantSchema,
  orderStatusSchema,
  userRoleSchema,
} from "./index";

describe("harbor shared", () => {
  it("exports version", () => {
    expect(HARBOR_VERSION).toBe("0.1.0");
  });

  it("validates login", () => {
    const result = loginSchema.safeParse({
      email: "admin@harbor.demo",
      password: "demo1234",
    });
    expect(result.success).toBe(true);
  });

  it("validates enums", () => {
    expect(userRoleSchema.safeParse("platform_admin").success).toBe(true);
    expect(orderStatusSchema.safeParse("shipped").success).toBe(true);
    expect(userRoleSchema.safeParse("invalid").success).toBe(false);
  });

  it("validates merchant shape", () => {
    const result = merchantSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Harbor Demo Shop",
      slug: "harbor-demo",
      status: "active",
      rejectReason: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("validates create product input", () => {
    const result = createProductSchema.safeParse({
      title: "Organic Cotton Tote",
      slug: "organic-cotton-tote",
      variants: [
        {
          sku: "TOTE-NAT",
          name: "Natural",
          priceCents: 2499,
          stock: 10,
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
