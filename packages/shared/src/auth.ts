import { z } from "zod";
import { userRoleSchema } from "./enums";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const jwtPayloadSchema = z.object({
  sub: z.uuid(),
  email: z.email(),
  role: userRoleSchema,
  merchantId: z.uuid().optional(),
});

export const authUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  role: userRoleSchema,
  merchantId: z.uuid().nullable(),
});

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: authUserSchema,
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type JwtPayload = z.infer<typeof jwtPayloadSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
