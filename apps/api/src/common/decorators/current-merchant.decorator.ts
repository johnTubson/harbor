import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import type { JwtPayload } from "@harbor/shared";

export const CurrentMerchant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    const merchantId = request.user?.merchantId;
    if (!merchantId) {
      throw new ForbiddenException("Merchant scope required");
    }
    return merchantId;
  }
);
