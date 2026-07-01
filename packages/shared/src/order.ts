import { z } from "zod";
import { orderStatusSchema } from "./enums";

export const orderLineSchema = z.object({
  id: z.uuid(),
  orderId: z.uuid(),
  productTitle: z.string().min(1),
  variantName: z.string().nullable(),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().nonnegative(),
  lineTotalCents: z.number().int().nonnegative(),
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

export const createOrderLineSchema = z.object({
  productTitle: z.string().min(1).max(200),
  variantName: z.string().max(128).optional(),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().nonnegative(),
});

export const createOrderSchema = z.object({
  lines: z.array(createOrderLineSchema).min(1),
  currency: z.string().length(3).default("USD"),
});

export const transitionOrderSchema = z.object({
  status: orderStatusSchema,
});

export type OrderLine = z.infer<typeof orderLineSchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderWithLines = z.infer<typeof orderWithLinesSchema>;
export type CreateOrderLineInput = z.infer<typeof createOrderLineSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type TransitionOrderInput = z.infer<typeof transitionOrderSchema>;
