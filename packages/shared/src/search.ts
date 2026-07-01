import { z } from "zod";
import { productWithVariantsSchema } from "./product";

export const productSearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const productSearchResultSchema = productWithVariantsSchema.extend({
  merchantName: z.string(),
  merchantSlug: z.string(),
  rank: z.number(),
});

export const productSearchResponseSchema = z.object({
  query: z.string(),
  results: z.array(productSearchResultSchema),
  total: z.number().int().nonnegative(),
});

export type ProductSearchQuery = z.infer<typeof productSearchQuerySchema>;
export type ProductSearchResult = z.infer<typeof productSearchResultSchema>;
export type ProductSearchResponse = z.infer<typeof productSearchResponseSchema>;
