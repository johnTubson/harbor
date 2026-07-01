import { Injectable } from "@nestjs/common";
import type { ProductSearchQuery, ProductSearchResponse } from "@harbor/shared";
import { PrismaService } from "../../prisma/prisma.service";

type SearchRow = {
  id: string;
  merchantId: string;
  title: string;
  description: string | null;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  merchantName: string;
  merchantSlug: string;
  rank: number;
};

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(input: ProductSearchQuery): Promise<ProductSearchResponse> {
    const query = input.q.trim();
    const limit = input.limit;

    const rows = await this.prisma.$queryRaw<SearchRow[]>`
      SELECT
        p.id,
        p."merchantId",
        p.title,
        p.description,
        p.slug,
        p."createdAt",
        p."updatedAt",
        m.name AS "merchantName",
        m.slug AS "merchantSlug",
        ts_rank(p."searchVector", plainto_tsquery('english', ${query})) AS rank
      FROM "Product" p
      INNER JOIN "Merchant" m ON m.id = p."merchantId"
      WHERE m.status = 'active'
        AND p."searchVector" @@ plainto_tsquery('english', ${query})
      ORDER BY rank DESC, p."createdAt" DESC
      LIMIT ${limit}
    `;

    const productIds = rows.map((row) => row.id);
    const variants =
      productIds.length > 0
        ? await this.prisma.productVariant.findMany({
            where: { productId: { in: productIds } },
          })
        : [];

    const variantsByProduct = new Map<string, typeof variants>();
    for (const variant of variants) {
      const list = variantsByProduct.get(variant.productId) ?? [];
      list.push(variant);
      variantsByProduct.set(variant.productId, list);
    }

    const results = rows.map((row) => ({
      id: row.id,
      merchantId: row.merchantId,
      title: row.title,
      description: row.description,
      slug: row.slug,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      merchantName: row.merchantName,
      merchantSlug: row.merchantSlug,
      rank: Number(row.rank),
      variants: variantsByProduct.get(row.id) ?? [],
    }));

    return {
      query,
      results,
      total: results.length,
    };
  }
}
