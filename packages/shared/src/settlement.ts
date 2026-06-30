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

export type Settlement = z.infer<typeof settlementSchema>;
