import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { JwtPayload } from "@harbor/shared";

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user: JwtPayload;
      body?: { merchantId?: string };
      query?: { merchantId?: string };
      tenantMerchantId?: string;
    }>();

    const user = request.user;
    if (!user) {
      throw new ForbiddenException("Authentication required");
    }

    const clientMerchantId =
      request.body?.merchantId ?? request.query?.merchantId;
    if (clientMerchantId && user.role !== "platform_admin") {
      throw new ForbiddenException("Cannot specify merchantId");
    }

    if (user.role !== "platform_admin") {
      if (!user.merchantId) {
        throw new ForbiddenException("Merchant scope required");
      }
      request.tenantMerchantId = user.merchantId;
    }

    return true;
  }
}
