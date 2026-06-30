import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { JwtPayload } from "@harbor/shared";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OrdersService } from "./orders.service";

@ApiTags("orders")
@ApiBearerAuth()
@Controller("orders")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Roles("platform_admin", "merchant_admin", "merchant_staff")
  @ApiOperation({ summary: "List orders scoped to tenant" })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.ordersService.findAll(user);
  }

  @Get(":id")
  @Roles("platform_admin", "merchant_admin", "merchant_staff")
  @ApiOperation({ summary: "Get order by ID (tenant-scoped)" })
  @ApiResponse({ status: 403, description: "Cross-tenant access denied" })
  findById(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.ordersService.findById(id, user);
  }
}
