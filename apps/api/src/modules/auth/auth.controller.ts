import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { loginSchema, refreshTokenSchema } from "@harbor/shared";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { AuthService } from "./auth.service";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @ApiOperation({ summary: "Authenticate and receive JWT access token" })
  @ApiResponse({ status: 200, description: "Login successful" })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  login(@Body(new ZodValidationPipe(loginSchema)) body: unknown) {
    return this.authService.login(body as Parameters<AuthService["login"]>[0]);
  }

  @Post("refresh")
  @ApiOperation({ summary: "Refresh access token (stub)" })
  @ApiResponse({ status: 501, description: "Not implemented" })
  refresh(@Body(new ZodValidationPipe(refreshTokenSchema)) _body: unknown) {
    return this.authService.refresh();
  }
}
