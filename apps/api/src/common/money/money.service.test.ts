import { describe, expect, it } from "vitest";
import {
  MoneyService,
  PLATFORM_FEE_FLAT_CENTS,
  PLATFORM_FEE_PERCENT_BPS,
} from "./money.service";

describe("MoneyService", () => {
  const money = new MoneyService();

  it("calculates line totals with Decimal.js", () => {
    expect(money.lineTotalCents(2499, 2)).toBe(4998);
  });

  it("calculates order total from lines", () => {
    expect(
      money.orderTotalCents([
        { unitPriceCents: 2499, quantity: 1 },
        { unitPriceCents: 1299, quantity: 1 },
      ])
    ).toBe(3798);
  });

  it("applies percent + flat fee per order", () => {
    const totals = money.calculateSettlementTotals([10_000]);
    expect(totals.feeCents).toBe(320);
    expect(totals.netCents).toBe(9680);
  });

  it("sums settlement totals across merchants", () => {
    const merchantA = money.calculateSettlementTotals([10_000, 2499]);
    const merchantB = money.calculateSettlementTotals([4599]);
    const aggregate = money.aggregateSettlementTotals([merchantA, merchantB]);

    expect(aggregate.orderCount).toBe(3);
    expect(aggregate.grossCents).toBe(17_098);
    expect(aggregate.feeBreakdown.percentBps).toBe(PLATFORM_FEE_PERCENT_BPS);
    expect(aggregate.feeBreakdown.flatCentsPerOrder).toBe(
      PLATFORM_FEE_FLAT_CENTS
    );
    expect(aggregate.feeCents).toBe(
      aggregate.feeBreakdown.percentFeeCents +
        aggregate.feeBreakdown.flatFeeCents
    );
    expect(aggregate.netCents).toBe(aggregate.grossCents - aggregate.feeCents);
  });
});
