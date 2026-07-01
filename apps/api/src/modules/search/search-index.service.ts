import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class SearchIndexService {
  constructor(private readonly prisma: PrismaService) {}

  async indexProduct(productId: string) {
    const id = z.uuid().parse(productId);
    await this.prisma.$executeRawUnsafe(
      `UPDATE "Product"
       SET "searchVector" = to_tsvector(
         'english',
         coalesce("title", '') || ' ' || coalesce("description", '')
       )
       WHERE "id"::text = $1`,
      id
    );
  }

  async indexAllProducts() {
    await this.prisma.$executeRaw`
      UPDATE "Product"
      SET "searchVector" = to_tsvector(
        'english',
        coalesce("title", '') || ' ' || coalesce("description", '')
      )
    `;
  }
}
