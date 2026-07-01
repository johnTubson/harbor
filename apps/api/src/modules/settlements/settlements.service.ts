import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  JwtPayload,
  SettlementBatchInput,
  SettlementPeriodQuery,
  SettlementPreview,
  SettlementPreviewResponse,
} from "@harbor/shared";
import { MoneyService } from "../../common/money/money.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { OrdersService } from "../orders/orders.service";

@Injectable()
export class SettlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly auditService: AuditService,
    private readonly money: MoneyService
  ) {}

  private assertPeriod(periodStart: Date, periodEnd: Date) {
    if (periodStart >= periodEnd) {
      throw new BadRequestException("periodStart must be before periodEnd");
    }
  }

  private buildPreviewResponse(
    period: SettlementPeriodQuery,
    merchants: SettlementPreview[]
  ): SettlementPreviewResponse {
    const totals = this.money.aggregateSettlementTotals(
      merchants.map((merchant) => ({
        orderCount: merchant.orderCount,
        grossCents: merchant.grossCents,
        feeCents: merchant.feeCents,
        netCents: merchant.netCents,
        feeBreakdown: merchant.feeBreakdown,
      }))
    );

    return {
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      merchants,
      totals,
    };
  }

  async previewForMerchant(
    merchantId: string,
    period: SettlementPeriodQuery
  ): Promise<SettlementPreview> {
    this.assertPeriod(period.periodStart, period.periodEnd);
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });
    if (!merchant) {
      throw new NotFoundException("Merchant not found");
    }
    const orders = await this.ordersService.findSettleableInPeriod(
      merchantId,
      period.periodStart,
      period.periodEnd
    );
    return this.ordersService.previewSettlement(
      merchantId,
      merchant.name,
      period.periodStart,
      period.periodEnd,
      orders
    );
  }

  async preview(
    user: JwtPayload,
    period: SettlementPeriodQuery,
    merchantId?: string
  ): Promise<SettlementPreviewResponse> {
    this.assertPeriod(period.periodStart, period.periodEnd);

    if (user.role === "platform_admin") {
      const merchants = merchantId
        ? await this.prisma.merchant.findMany({
            where: { id: merchantId, status: "active" },
          })
        : await this.prisma.merchant.findMany({
            where: { status: "active" },
            orderBy: { name: "asc" },
          });

      const previews = await Promise.all(
        merchants.map(async (merchant) => {
          const orders = await this.ordersService.findSettleableInPeriod(
            merchant.id,
            period.periodStart,
            period.periodEnd
          );
          return this.ordersService.previewSettlement(
            merchant.id,
            merchant.name,
            period.periodStart,
            period.periodEnd,
            orders
          );
        })
      );

      return this.buildPreviewResponse(period, previews);
    }

    if (!user.merchantId) {
      throw new ForbiddenException("Merchant scope required");
    }

    const preview = await this.previewForMerchant(user.merchantId, period);
    return this.buildPreviewResponse(period, [preview]);
  }

  findAll(user: JwtPayload) {
    if (user.role === "platform_admin") {
      return this.prisma.settlement.findMany({
        orderBy: { createdAt: "desc" },
        include: { merchant: { select: { name: true } } },
      });
    }
    if (!user.merchantId) {
      throw new ForbiddenException("Merchant scope required");
    }
    return this.prisma.settlement.findMany({
      where: { merchantId: user.merchantId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createDraftForMerchant(
    merchantId: string,
    period: SettlementPeriodQuery
  ) {
    const preview = await this.previewForMerchant(merchantId, period);
    if (preview.orderCount === 0) {
      return null;
    }

    const existing = await this.prisma.settlement.findFirst({
      where: {
        merchantId,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        status: "draft",
      },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.settlement.create({
      data: {
        merchantId,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        grossCents: preview.grossCents,
        feeCents: preview.feeCents,
        netCents: preview.netCents,
        status: "draft",
      },
    });
  }

  async createBatch(user: JwtPayload, input: SettlementBatchInput) {
    const merchants = await this.prisma.merchant.findMany({
      where: { status: "active" },
      select: { id: true },
    });

    const created = [];
    for (const merchant of merchants) {
      const settlement = await this.createDraftForMerchant(merchant.id, input);
      if (settlement) {
        created.push(settlement);
      }
    }

    await this.auditService.append({
      actorId: user.sub,
      actorEmail: user.email,
      action: "settlement.batch_created",
      entityType: "Settlement",
      entityId: "batch",
      metadata: {
        periodStart: input.periodStart.toISOString(),
        periodEnd: input.periodEnd.toISOString(),
        count: created.length,
      },
    });

    return created;
  }

  async runNightlyDraft() {
    const periodEnd = new Date();
    periodEnd.setUTCHours(23, 59, 59, 999);

    const periodStart = new Date(periodEnd);
    periodStart.setUTCDate(periodStart.getUTCDate() - 1);
    periodStart.setUTCHours(0, 0, 0, 0);

    const merchants = await this.prisma.merchant.findMany({
      where: { status: "active" },
      select: { id: true },
    });

    const created = [];
    for (const merchant of merchants) {
      const settlement = await this.createDraftForMerchant(merchant.id, {
        periodStart,
        periodEnd,
      });
      if (settlement) {
        created.push(settlement);
      }
    }

    return { periodStart, periodEnd, created };
  }
}
