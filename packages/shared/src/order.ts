import { z } from "zod";
import { orderStatusSchema } from "./enums";

export const orderLineSchema = z.object({
  id: z.uuid(),
  orderId: z.uuid(),
  productTitle: z.string().min(1),
  variantName: z.string().nullable(),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().nonnegative(),
});

export const orderSchema = z.object({
  id: z.uuid(),
  merchantId: z.uuid(),
  status: orderStatusSchema,
  totalCents: z.number().int().nonnegative(),
  currency: z.string().length(3),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const orderWithLinesSchema = orderSchema.extend({
  lines: z.array(orderLineSchema),
});

export type OrderLine = z.infer<typeof orderLineSchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderWithLines = z.infer<typeof orderWithLinesSchema>;
