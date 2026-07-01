import { describe, expect, it } from "vitest";
import {
  assertValidOrderTransition,
  canTransitionOrder,
} from "./order-state-machine";

describe("canTransitionOrder", () => {
  it("allows placed → paid and placed → cancelled", () => {
    expect(canTransitionOrder("placed", "paid")).toBe(true);
    expect(canTransitionOrder("placed", "cancelled")).toBe(true);
  });

  it("allows paid → shipped and paid → cancelled", () => {
    expect(canTransitionOrder("paid", "shipped")).toBe(true);
    expect(canTransitionOrder("paid", "cancelled")).toBe(true);
  });

  it("allows shipped → delivered", () => {
    expect(canTransitionOrder("shipped", "delivered")).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(canTransitionOrder("placed", "shipped")).toBe(false);
    expect(canTransitionOrder("placed", "delivered")).toBe(false);
    expect(canTransitionOrder("shipped", "cancelled")).toBe(false);
    expect(canTransitionOrder("delivered", "paid")).toBe(false);
    expect(canTransitionOrder("cancelled", "placed")).toBe(false);
  });

  it("rejects same-status transition", () => {
    expect(canTransitionOrder("paid", "paid")).toBe(false);
  });
});

describe("assertValidOrderTransition", () => {
  it("throws on invalid transition", () => {
    expect(() => assertValidOrderTransition("placed", "delivered")).toThrow(
      "Invalid order transition: placed → delivered"
    );
  });

  it("does not throw on valid transition", () => {
    expect(() => assertValidOrderTransition("paid", "shipped")).not.toThrow();
  });
});
