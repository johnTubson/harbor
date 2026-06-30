import { z } from "zod";

export const productVariantSchema = z.object({
  id: z.uuid(),
  productId: z.uuid(),
  sku: z.string().min(1),
  name: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative(),
});

export const productSchema = z.object({
  id: z.uuid(),
  merchantId: z.uuid(),
  title: z.string().min(1),
  description: z.string().nullable(),
  slug: z.string().min(1),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const productWithVariantsSchema = productSchema.extend({
  variants: z.array(productVariantSchema),
});

export const createProductVariantSchema = z.object({
  sku: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  priceCents: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative().default(0),
});

export const createProductSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  variants: z.array(createProductVariantSchema).min(1),
});

export type ProductVariant = z.infer<typeof productVariantSchema>;
export type Product = z.infer<typeof productSchema>;
export type ProductWithVariants = z.infer<typeof productWithVariantsSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
