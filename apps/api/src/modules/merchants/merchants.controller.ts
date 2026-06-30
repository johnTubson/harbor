import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  createMerchantSchema,
  merchantRejectSchema,
  type JwtPayload,
  updateMerchantSchema,
} from "@harbor/shared";
import { CurrentMerchant } from "../../common/decorators/current-merchant.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { MerchantsService } from "./merchants.service";

@ApiTags("merchants")
@ApiBearerAuth()
@Controller("merchants")
@UseGuards(JwtAuthGuard, RolesGuard)
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Get()
  @Roles("platform_admin")
  @ApiOperation({ summary: "List all merchants (admin)" })
  @ApiQuery({ name: "status", required: false })
  findAll(@Query("status") status?: string) {
    return this.merchantsService.findAll(status);
  }

  @Get("me")
  @Roles("merchant_admin", "merchant_staff")
  @ApiOperation({ summary: "Get current merchant profile" })
  findMe(@CurrentMerchant() merchantId: string) {
    return this.merchantsService.findSelf(merchantId);
  }

  @Get(":id")
  @Roles("platform_admin")
  @ApiOperation({ summary: "Get merchant by ID with KYC docs (admin)" })
  findById(@Param("id") id: string) {
    return this.merchantsService.findById(id);
  }

  @Post()
  @Roles("platform_admin")
  @ApiOperation({ summary: "Create merchant (admin)" })
  create(@Body(new ZodValidationPipe(createMerchantSchema)) body: unknown) {
    return this.merchantsService.create(
      body as Parameters<MerchantsService["create"]>[0]
    );
  }

  @Patch(":id")
  @Roles("platform_admin")
  @ApiOperation({ summary: "Update merchant (admin)" })
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateMerchantSchema)) body: unknown
  ) {
    return this.merchantsService.update(
      id,
      body as Parameters<MerchantsService["update"]>[1]
    );
  }

  @Patch(":id/approve")
  @Roles("platform_admin")
  @ApiOperation({ summary: "Approve pending merchant (admin)" })
  @ApiResponse({ status: 200, description: "Merchant approved" })
  approve(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.merchantsService.approve(id, user);
  }

  @Patch(":id/reject")
  @Roles("platform_admin")
  @ApiOperation({ summary: "Reject pending merchant (admin)" })
  reject(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(merchantRejectSchema)) body: unknown,
    @CurrentUser() user: JwtPayload
  ) {
    return this.merchantsService.reject(
      id,
      body as Parameters<MerchantsService["reject"]>[1],
      user
    );
  }
}
