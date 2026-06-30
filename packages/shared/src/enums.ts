import { z } from "zod";

export const userRoleSchema = z.enum([
  "platform_admin",
  "merchant_admin",
  "merchant_staff",
]);

export const merchantStatusSchema = z.enum([
  "pending",
  "active",
  "rejected",
  "suspended",
]);

export const orderStatusSchema = z.enum([
  "placed",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
]);

export const settlementStatusSchema = z.enum(["draft", "finalized", "paid"]);

export const kycDocumentTypeSchema = z.enum([
  "business_license",
  "government_id",
  "tax_certificate",
]);

export type UserRole = z.infer<typeof userRoleSchema>;
export type MerchantStatus = z.infer<typeof merchantStatusSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type SettlementStatus = z.infer<typeof settlementStatusSchema>;
export type KycDocumentType = z.infer<typeof kycDocumentTypeSchema>;
