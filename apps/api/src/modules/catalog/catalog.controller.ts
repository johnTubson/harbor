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
  createProductSchema,
  productSearchQuerySchema,
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
import { SearchService } from "../search/search.service";
import { CatalogService } from "./catalog.service";

@ApiTags("catalog")
@Controller("products")
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly searchService: SearchService
  ) {}

  @Get("search")
  @ApiOperation({ summary: "Public product search across active merchants" })
  @ApiQuery({ name: "q", required: true })
  @ApiQuery({ name: "limit", required: false })
  search(
    @Query(new ZodValidationPipe(productSearchQuerySchema)) query: unknown
  ) {
    return this.searchService.search(
      query as Parameters<SearchService["search"]>[0]
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles("platform_admin", "merchant_admin", "merchant_staff")
  @ApiOperation({ summary: "List products scoped to tenant" })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.catalogService.findAll(user);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles("platform_admin", "merchant_admin", "merchant_staff")
  @ApiOperation({ summary: "Get product by ID (tenant-scoped)" })
  @ApiResponse({ status: 403, description: "Cross-tenant access denied" })
  findById(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.catalogService.findById(id, user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @ApiBearerAuth()
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
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @ApiBearerAuth()
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
