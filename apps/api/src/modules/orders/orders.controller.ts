import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  createOrderSchema,
  transitionOrderSchema,
  type CreateOrderInput,
  type JwtPayload,
  type TransitionOrderInput,
} from "@harbor/shared";
import { CurrentMerchant } from "../../common/decorators/current-merchant.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
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

  @Post()
  @Roles("merchant_admin")
  @ApiOperation({ summary: "Create demo order for current merchant" })
  create(
    @CurrentMerchant() merchantId: string,
    @Body(new ZodValidationPipe(createOrderSchema)) body: CreateOrderInput
  ) {
    return this.ordersService.create(merchantId, body);
  }

  @Patch(":id/status")
  @Roles("platform_admin", "merchant_admin")
  @ApiOperation({ summary: "Transition order status (state machine)" })
  @ApiResponse({ status: 400, description: "Invalid state transition" })
  transition(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(transitionOrderSchema)) body: TransitionOrderInput,
    @CurrentUser() user: JwtPayload
  ) {
    return this.ordersService.transition(id, user, body.status);
  }
}
