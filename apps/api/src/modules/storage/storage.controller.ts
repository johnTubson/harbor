import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { kycUploadUrlRequestSchema } from "@harbor/shared";
import { CurrentMerchant } from "../../common/decorators/current-merchant.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { StorageService } from "./storage.service";

@ApiTags("storage")
@ApiBearerAuth()
@Controller("storage")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post("kyc/upload-url")
  @Roles("merchant_admin")
  @ApiOperation({ summary: "Get presigned URL for KYC document upload" })
  createKycUploadUrl(
    @CurrentMerchant() merchantId: string,
    @Body(new ZodValidationPipe(kycUploadUrlRequestSchema)) body: unknown
  ) {
    return this.storageService.createKycUploadUrl(
      merchantId,
      body as Parameters<StorageService["createKycUploadUrl"]>[1]
    );
  }
}
