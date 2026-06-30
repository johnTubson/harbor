import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  CreateProductInput,
  JwtPayload,
  UpdateProductInput,
} from "@harbor/shared";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(user: JwtPayload) {
    if (user.role === "platform_admin") {
      return this.prisma.product.findMany({
        include: { variants: true },
        orderBy: { createdAt: "desc" },
      });
    }
    if (!user.merchantId) {
      throw new ForbiddenException("Merchant scope required");
    }
    return this.findByMerchant(user.merchantId);
  }

  findByMerchant(merchantId: string) {
    return this.prisma.product.findMany({
      where: { merchantId },
      include: { variants: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string, user: JwtPayload) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });
    if (!product) {
      throw new NotFoundException("Product not found");
    }
    if (
      user.role !== "platform_admin" &&
      product.merchantId !== user.merchantId
    ) {
      throw new ForbiddenException("Access denied");
    }
    return product;
  }

  async create(merchantId: string, input: CreateProductInput) {
    const existing = await this.prisma.product.findUnique({
      where: { merchantId_slug: { merchantId, slug: input.slug } },
    });
    if (existing) {
      throw new ConflictException("Product slug already exists for this merchant");
    }
    return this.prisma.product.create({
      data: {
        merchantId,
        title: input.title,
        description: input.description ?? null,
        slug: input.slug,
        variants: { create: input.variants },
      },
      include: { variants: true },
    });
  }

  async update(id: string, merchantId: string, input: UpdateProductInput) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });
    if (!product) {
      throw new NotFoundException("Product not found");
    }
    if (product.merchantId !== merchantId) {
      throw new ForbiddenException("Access denied");
    }
    if (input.slug && input.slug !== product.slug) {
      const slugTaken = await this.prisma.product.findUnique({
        where: { merchantId_slug: { merchantId, slug: input.slug } },
      });
      if (slugTaken) {
        throw new ConflictException("Product slug already exists for this merchant");
      }
    }
    return this.prisma.$transaction(async (tx) => {
      if (input.variants) {
        await tx.productVariant.deleteMany({ where: { productId: id } });
      }
      return tx.product.update({
        where: { id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          ...(input.slug !== undefined ? { slug: input.slug } : {}),
          ...(input.variants
            ? { variants: { create: input.variants } }
            : {}),
        },
        include: { variants: true },
      });
    });
  }
}
