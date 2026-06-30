import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { JwtPayload } from "@harbor/shared";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(user: JwtPayload) {
    if (user.role === "platform_admin") {
      return this.prisma.order.findMany({
        include: { lines: true },
        orderBy: { createdAt: "desc" },
      });
    }
    if (!user.merchantId) {
      throw new ForbiddenException("Merchant scope required");
    }
    return this.prisma.order.findMany({
      where: { merchantId: user.merchantId },
      include: { lines: true },
      orderBy: { createdAt: "desc" },
    });
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
    return order;
  }
}
