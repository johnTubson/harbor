import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  CreateMerchantInput,
  JwtPayload,
  MerchantRejectInput,
  UpdateMerchantInput,
} from "@harbor/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class MerchantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  findAll(status?: string) {
    return this.prisma.merchant.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id },
      include: { kycDocuments: true },
    });
    if (!merchant) {
      throw new NotFoundException("Merchant not found");
    }
    return merchant;
  }

  async findSelf(merchantId: string) {
    return this.findById(merchantId);
  }

  async create(input: CreateMerchantInput) {
    const existing = await this.prisma.merchant.findUnique({
      where: { slug: input.slug },
    });
    if (existing) {
      throw new ConflictException("Merchant slug already exists");
    }
    return this.prisma.merchant.create({ data: input });
  }

  async update(id: string, input: UpdateMerchantInput) {
    await this.findById(id);
    if (input.slug) {
      const existing = await this.prisma.merchant.findFirst({
        where: { slug: input.slug, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException("Merchant slug already exists");
      }
    }
    return this.prisma.merchant.update({ where: { id }, data: input });
  }

  async approve(id: string, actor: JwtPayload) {
    const merchant = await this.findById(id);
    const updated = await this.prisma.merchant.update({
      where: { id },
      data: { status: "active", rejectReason: null },
    });
    await this.audit.append({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: "merchant.approved",
      entityType: "Merchant",
      entityId: id,
      metadata: { previousStatus: merchant.status, newStatus: "active" },
    });
    return updated;
  }

  async reject(id: string, input: MerchantRejectInput, actor: JwtPayload) {
    const merchant = await this.findById(id);
    const updated = await this.prisma.merchant.update({
      where: { id },
      data: { status: "rejected", rejectReason: input.reason },
    });
    await this.audit.append({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: "merchant.rejected",
      entityType: "Merchant",
      entityId: id,
      metadata: {
        previousStatus: merchant.status,
        newStatus: "rejected",
        reason: input.reason,
      },
    });
    return updated;
  }
}
