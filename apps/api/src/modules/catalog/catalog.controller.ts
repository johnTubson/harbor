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
  createProductSchema,
  type JwtPayload,
  updateProductSchema,
} from "@harbor/shared";
import { CurrentMerchant } from "../../common/decorators/current-merchant.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CatalogService } from "./catalog.service";

@ApiTags("catalog")
@ApiBearerAuth()
@Controller("products")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @Roles("platform_admin", "merchant_admin", "merchant_staff")
  @ApiOperation({ summary: "List products scoped to tenant" })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.catalogService.findAll(user);
  }

  @Get(":id")
  @Roles("platform_admin", "merchant_admin", "merchant_staff")
  @ApiOperation({ summary: "Get product by ID (tenant-scoped)" })
  @ApiResponse({ status: 403, description: "Cross-tenant access denied" })
  findById(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.catalogService.findById(id, user);
  }

  @Post()
  @Roles("merchant_admin", "merchant_staff")
  @ApiOperation({ summary: "Create product for current merchant" })
  create(
    @CurrentMerchant() merchantId: string,
    @Body(new ZodValidationPipe(createProductSchema)) body: unknown
  ) {
    return this.catalogService.create(
      merchantId,
      body as Parameters<CatalogService["create"]>[1]
    );
  }

  @Patch(":id")
  @Roles("merchant_admin", "merchant_staff")
  @ApiOperation({ summary: "Update product for current merchant" })
  update(
    @Param("id") id: string,
    @CurrentMerchant() merchantId: string,
    @Body(new ZodValidationPipe(updateProductSchema)) body: unknown
  ) {
    return this.catalogService.update(
      id,
      merchantId,
      body as Parameters<CatalogService["update"]>[2]
    );
  }
}
