import {
  Injectable,
  NotImplementedException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { compare } from "bcryptjs";
import type {
  AuthUser,
  JwtPayload,
  LoginInput,
  LoginResponse,
} from "@harbor/shared";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async login(input: LoginInput): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const valid = await compare(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      ...(user.merchantId ? { merchantId: user.merchantId } : {}),
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      merchantId: user.merchantId,
    };

    return {
      accessToken,
      refreshToken: "refresh-not-implemented",
      user: authUser,
    };
  }

  refresh(): never {
    throw new NotImplementedException(
      "Refresh token rotation is planned for production"
    );
  }
}
