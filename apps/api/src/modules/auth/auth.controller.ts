import { Body, Controller, Headers, Ip, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import {
  loginSchema,
  refreshTokenSchema,
  type RefreshTokenInput,
} from "@harbor/shared";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { AuthService } from "./auth.service";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @ApiOperation({ summary: "Authenticate and receive JWT access + refresh tokens" })
  @ApiResponse({ status: 201, description: "Login successful" })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  login(
    @Body(new ZodValidationPipe(loginSchema)) body: unknown,
    @Headers("user-agent") userAgent?: string,
    @Ip() ip?: string
  ) {
    return this.authService.login(body as Parameters<AuthService["login"]>[0], {
      userAgent,
      ip,
    });
  }

  @Post("refresh")
  @ApiOperation({ summary: "Rotate refresh token and issue a new access token" })
  @ApiResponse({ status: 201, description: "Tokens rotated" })
  @ApiResponse({ status: 401, description: "Invalid or reused refresh token" })
  refresh(
    @Body(new ZodValidationPipe(refreshTokenSchema)) body: unknown,
    @Headers("user-agent") userAgent?: string,
    @Ip() ip?: string
  ) {
    return this.authService.refresh(body as RefreshTokenInput, {
      userAgent,
      ip,
    });
  }

  @Post("logout")
  @ApiOperation({ summary: "Revoke the current refresh token" })
  @ApiResponse({ status: 201, description: "Logged out" })
  logout(@Body(new ZodValidationPipe(refreshTokenSchema)) body: unknown) {
    return this.authService.logout(body as RefreshTokenInput);
  }
}
