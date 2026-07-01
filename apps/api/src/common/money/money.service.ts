import { Injectable } from "@nestjs/common";
import Decimal from "decimal.js";

/** Platform fee: 2.9% + $0.30 per order (demo rates). */
export const PLATFORM_FEE_PERCENT_BPS = 290;
export const PLATFORM_FEE_FLAT_CENTS = 30;

export type FeeBreakdown = {
  percentBps: number;
  percentFeeLabel: string;
  flatCentsPerOrder: number;
  flatFeeLabel: string;
  flatFeeDescription: string;
  percentFeeCents: number;
  flatFeeCents: number;
};

export type SettlementTotals = {
  orderCount: number;
  grossCents: number;
  feeCents: number;
  netCents: number;
  feeBreakdown: FeeBreakdown;
};

@Injectable()
export class MoneyService {
  private readonly decimalConfig = { rounding: Decimal.ROUND_HALF_UP };

  toCents(value: Decimal): number {
    return value.toDecimalPlaces(0, this.decimalConfig.rounding).toNumber();
  }

  cents(value: number | string): Decimal {
    return new Decimal(value);
  }

  lineTotalCents(unitPriceCents: number, quantity: number): number {
    return this.toCents(this.cents(unitPriceCents).mul(quantity));
  }

  sumCents(values: number[]): number {
    return this.toCents(
      values.reduce((sum, value) => sum.plus(value), new Decimal(0))
    );
  }

  orderTotalCents(
    lines: { unitPriceCents: number; quantity: number }[]
  ): number {
    return this.sumCents(
      lines.map((line) =>
        this.lineTotalCents(line.unitPriceCents, line.quantity)
      )
    );
  }

  calculateSettlementTotals(orderTotalsCents: number[]): SettlementTotals {
    const orderCount = orderTotalsCents.length;
    const grossCents = this.sumCents(orderTotalsCents);
    const percentFeeCents = this.sumCents(
      orderTotalsCents.map((total) =>
        this.toCents(
          this.cents(total).mul(PLATFORM_FEE_PERCENT_BPS).div(10_000)
        )
      )
    );
    const flatFeeCents = this.toCents(
      this.cents(PLATFORM_FEE_FLAT_CENTS).mul(orderCount)
    );
    const feeCents = this.toCents(
      this.cents(percentFeeCents).plus(flatFeeCents)
    );
    const netCents = this.toCents(this.cents(grossCents).minus(feeCents));

    return {
      orderCount,
      grossCents,
      feeCents,
      netCents,
      feeBreakdown: this.buildFeeBreakdown(
        percentFeeCents,
        flatFeeCents,
        orderCount
      ),
    };
  }

  aggregateSettlementTotals(previews: SettlementTotals[]): SettlementTotals {
    const orderCount = previews.reduce(
      (sum, preview) => sum + preview.orderCount,
      0
    );
    const grossCents = this.sumCents(
      previews.map((preview) => preview.grossCents)
    );
    const percentFeeCents = this.sumCents(
      previews.map((preview) => preview.feeBreakdown.percentFeeCents)
    );
    const flatFeeCents = this.sumCents(
      previews.map((preview) => preview.feeBreakdown.flatFeeCents)
    );
    const feeCents = this.sumCents(previews.map((preview) => preview.feeCents));
    const netCents = this.sumCents(previews.map((preview) => preview.netCents));

    return {
      orderCount,
      grossCents,
      feeCents,
      netCents,
      feeBreakdown: this.buildFeeBreakdown(
        percentFeeCents,
        flatFeeCents,
        orderCount
      ),
    };
  }

  private buildFeeBreakdown(
    percentFeeCents: number,
    flatFeeCents: number,
    orderCount: number
  ): FeeBreakdown {
    return {
      percentBps: PLATFORM_FEE_PERCENT_BPS,
      percentFeeLabel: this.formatPercentLabel(PLATFORM_FEE_PERCENT_BPS),
      flatCentsPerOrder: PLATFORM_FEE_FLAT_CENTS,
      flatFeeLabel: `${this.formatCentsLabel(
        PLATFORM_FEE_FLAT_CENTS
      )} per order`,
      flatFeeDescription: `${this.formatCentsLabel(
        PLATFORM_FEE_FLAT_CENTS
      )} × ${orderCount} order${orderCount === 1 ? "" : "s"}`,
      percentFeeCents,
      flatFeeCents,
    };
  }

  formatPercentLabel(bps: number): string {
    return `${this.cents(bps).div(100).toFixed(1)}%`;
  }

  formatCentsLabel(cents: number, currency = "USD"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(this.cents(cents).div(100).toNumber());
  }
}
