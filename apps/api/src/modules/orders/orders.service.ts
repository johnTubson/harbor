import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { CreateOrderInput, JwtPayload, OrderStatus } from "@harbor/shared";
import {
  assertValidOrderTransition,
  SETTLEABLE_ORDER_STATUSES,
} from "@harbor/shared";
import { MoneyService } from "../../common/money/money.service";
import { PrismaService } from "../../prisma/prisma.service";

type OrderRecord = {
  id: string;
  merchantId: string;
  status: OrderStatus;
  totalCents: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  lines: {
    id: string;
    orderId: string;
    productTitle: string;
    variantName: string | null;
    quantity: number;
    unitPriceCents: number;
  }[];
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly money: MoneyService
  ) {}

  private mapOrder(order: OrderRecord) {
    return {
      ...order,
      lines: order.lines.map((line) => ({
        ...line,
        lineTotalCents: this.money.lineTotalCents(
          line.unitPriceCents,
          line.quantity
        ),
      })),
    };
  }

  async findAll(user: JwtPayload) {
    const orders =
      user.role === "platform_admin"
        ? await this.prisma.order.findMany({
            include: { lines: true },
            orderBy: { createdAt: "desc" },
          })
        : user.merchantId
        ? await this.prisma.order.findMany({
            where: { merchantId: user.merchantId },
            include: { lines: true },
            orderBy: { createdAt: "desc" },
          })
        : null;

    if (!orders) {
      throw new ForbiddenException("Merchant scope required");
    }

    return orders.map((order) => this.mapOrder(order));
  }

  async findById(id: string, user: JwtPayload) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!order) {
      throw new NotFoundException("Order not found");
    }
    if (
      user.role !== "platform_admin" &&
      order.merchantId !== user.merchantId
    ) {
      throw new ForbiddenException("Access denied");
    }
    return this.mapOrder(order);
  }

  async create(merchantId: string, input: CreateOrderInput) {
    const totalCents = this.money.orderTotalCents(input.lines);
    const order = await this.prisma.order.create({
      data: {
        merchantId,
        status: "placed",
        totalCents,
        currency: input.currency,
        lines: {
          create: input.lines.map((line) => ({
            productTitle: line.productTitle,
            variantName: line.variantName ?? null,
            quantity: line.quantity,
            unitPriceCents: line.unitPriceCents,
          })),
        },
      },
      include: { lines: true },
    });
    return this.mapOrder(order);
  }

  async transition(id: string, user: JwtPayload, nextStatus: OrderStatus) {
    const order = await this.findById(id, user);
    try {
      assertValidOrderTransition(order.status, nextStatus);
    } catch {
      throw new BadRequestException(
        `Cannot transition order from ${order.status} to ${nextStatus}`
      );
    }
    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: nextStatus },
      include: { lines: true },
    });
    return this.mapOrder(updated);
  }

  async findSettleableInPeriod(
    merchantId: string,
    periodStart: Date,
    periodEnd: Date
  ) {
    return this.prisma.order.findMany({
      where: {
        merchantId,
        status: { in: [...SETTLEABLE_ORDER_STATUSES] },
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  previewSettlement(
    merchantId: string,
    merchantName: string | undefined,
    periodStart: Date,
    periodEnd: Date,
    orders: { id: string; totalCents: number }[]
  ) {
    const totals = this.money.calculateSettlementTotals(
      orders.map((order) => order.totalCents)
    );
    return {
      merchantId,
      merchantName,
      periodStart,
      periodEnd,
      orderCount: totals.orderCount,
      grossCents: totals.grossCents,
      feeCents: totals.feeCents,
      netCents: totals.netCents,
      feeBreakdown: totals.feeBreakdown,
      orderIds: orders.map((order) => order.id),
    };
  }
}
