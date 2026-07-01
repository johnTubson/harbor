import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import {
  settlementBatchSchema,
  settlementPeriodQuerySchema,
  type JwtPayload,
  type SettlementBatchInput,
  type SettlementPeriodQuery,
} from "@harbor/shared";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SettlementsService } from "./settlements.service";

@ApiTags("settlements")
@ApiBearerAuth()
@Controller("settlements")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @Get()
  @Roles("platform_admin", "merchant_admin")
  @ApiOperation({ summary: "List settlements (tenant-scoped for merchants)" })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.settlementsService.findAll(user);
  }

  @Get("preview")
  @Roles("platform_admin", "merchant_admin")
  @ApiOperation({ summary: "Preview settlement with fee breakdown" })
  @ApiQuery({ name: "periodStart", required: true })
  @ApiQuery({ name: "periodEnd", required: true })
  @ApiQuery({ name: "merchantId", required: false })
  preview(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(settlementPeriodQuerySchema))
    period: SettlementPeriodQuery,
    @Query("merchantId") merchantId?: string
  ) {
    return this.settlementsService.preview(user, period, merchantId);
  }

  @Post("batch")
  @Roles("platform_admin")
  @ApiOperation({ summary: "Create draft settlements for all active merchants" })
  createBatch(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(settlementBatchSchema)) body: SettlementBatchInput
  ) {
    return this.settlementsService.createBatch(user, body);
  }
}
