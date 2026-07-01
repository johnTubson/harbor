import { z } from "zod";
import { settlementStatusSchema } from "./enums";

export const settlementSchema = z.object({
  id: z.uuid(),
  merchantId: z.uuid(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  grossCents: z.number().int().nonnegative(),
  feeCents: z.number().int().nonnegative(),
  netCents: z.number().int().nonnegative(),
  status: settlementStatusSchema,
  createdAt: z.coerce.date(),
});

export const settlementFeeBreakdownSchema = z.object({
  percentBps: z.number().int().nonnegative(),
  percentFeeLabel: z.string(),
  flatCentsPerOrder: z.number().int().nonnegative(),
  flatFeeLabel: z.string(),
  flatFeeDescription: z.string(),
  percentFeeCents: z.number().int().nonnegative(),
  flatFeeCents: z.number().int().nonnegative(),
});

export const settlementTotalsSchema = z.object({
  orderCount: z.number().int().nonnegative(),
  grossCents: z.number().int().nonnegative(),
  feeCents: z.number().int().nonnegative(),
  netCents: z.number().int().nonnegative(),
  feeBreakdown: settlementFeeBreakdownSchema,
});

export const settlementPreviewSchema = z.object({
  merchantId: z.uuid(),
  merchantName: z.string().optional(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  orderCount: z.number().int().nonnegative(),
  grossCents: z.number().int().nonnegative(),
  feeCents: z.number().int().nonnegative(),
  netCents: z.number().int().nonnegative(),
  feeBreakdown: settlementFeeBreakdownSchema,
  orderIds: z.array(z.uuid()),
});

export const settlementPreviewResponseSchema = z.object({
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  merchants: z.array(settlementPreviewSchema),
  totals: settlementTotalsSchema,
});

export const settlementPeriodQuerySchema = z.object({
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
});

export const settlementBatchSchema = settlementPeriodQuerySchema;

export type Settlement = z.infer<typeof settlementSchema>;
export type SettlementFeeBreakdown = z.infer<
  typeof settlementFeeBreakdownSchema
>;
export type SettlementTotals = z.infer<typeof settlementTotalsSchema>;
export type SettlementPreview = z.infer<typeof settlementPreviewSchema>;
export type SettlementPreviewResponse = z.infer<
  typeof settlementPreviewResponseSchema
>;
export type SettlementPeriodQuery = z.infer<typeof settlementPeriodQuerySchema>;
export type SettlementBatchInput = z.infer<typeof settlementBatchSchema>;
