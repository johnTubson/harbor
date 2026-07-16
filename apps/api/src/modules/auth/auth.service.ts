import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { compare } from "bcryptjs";
import type {
  AuthUser,
  JwtPayload,
  LoginInput,
  LoginResponse,
  RefreshTokenInput,
} from "@harbor/shared";
import { PrismaService } from "../../prisma/prisma.service";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function accessTtl(): string {
  return process.env.JWT_ACCESS_TTL ?? "15m";
}

function refreshTtlMs(): number {
  const raw = process.env.JWT_REFRESH_TTL ?? "7d";
  const match = /^(\d+)([smhd])$/.exec(raw);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * (multipliers[unit] ?? multipliers.d);
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async login(
    input: LoginInput,
    meta?: { userAgent?: string; ip?: string }
  ): Promise<LoginResponse> {
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

    const authUser = this.toAuthUser(user);
    const accessToken = await this.signAccessToken(user);
    const refreshToken = await this.issueRefreshToken(user.id, randomUUID(), meta);

    return {
      accessToken,
      refreshToken,
      user: authUser,
    };
  }

  async refresh(
    input: RefreshTokenInput,
    meta?: { userAgent?: string; ip?: string }
  ): Promise<LoginResponse> {
    const tokenHash = hashToken(input.refreshToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!existing) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (existing.revokedAt) {
      await this.revokeFamily(existing.familyId);
      throw new UnauthorizedException("Refresh token reuse detected");
    }

    if (existing.expiresAt.getTime() <= Date.now()) {
      await this.prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("Refresh token expired");
    }

    const rawRefresh = randomBytes(32).toString("hex");
    const replacement = await this.prisma.refreshToken.create({
      data: {
        userId: existing.userId,
        familyId: existing.familyId,
        tokenHash: hashToken(rawRefresh),
        expiresAt: new Date(Date.now() + refreshTtlMs()),
        userAgent: meta?.userAgent,
        ip: meta?.ip,
      },
    });

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: {
        revokedAt: new Date(),
        replacedById: replacement.id,
      },
    });

    const accessToken = await this.signAccessToken(existing.user);
    return {
      accessToken,
      refreshToken: rawRefresh,
      user: this.toAuthUser(existing.user),
    };
  }

  async logout(input: RefreshTokenInput): Promise<{ ok: true }> {
    const tokenHash = hashToken(input.refreshToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (existing && !existing.revokedAt) {
      await this.prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      });
    }

    return { ok: true };
  }

  private async signAccessToken(user: {
    id: string;
    email: string;
    role: JwtPayload["role"];
    merchantId: string | null;
  }): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      ...(user.merchantId ? { merchantId: user.merchantId } : {}),
    };

    return this.jwtService.signAsync(payload, {
      expiresIn: accessTtl() as `${number}${"s" | "m" | "h" | "d"}`,
    });
  }

  private async issueRefreshToken(
    userId: string,
    familyId: string,
    meta?: { userAgent?: string; ip?: string }
  ): Promise<string> {
    const raw = randomBytes(32).toString("hex");
    await this.prisma.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + refreshTtlMs()),
        userAgent: meta?.userAgent,
        ip: meta?.ip,
      },
    });
    return raw;
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private toAuthUser(user: {
    id: string;
    email: string;
    role: AuthUser["role"];
    merchantId: string | null;
  }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      merchantId: user.merchantId,
    };
  }
}
