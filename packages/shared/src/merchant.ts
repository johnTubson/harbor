import { z } from "zod";
import { kycDocumentTypeSchema, merchantStatusSchema } from "./enums";

export const kycDocumentSchema = z.object({
  id: z.uuid(),
  merchantId: z.uuid(),
  type: kycDocumentTypeSchema,
  objectKey: z.string().min(1),
  fileName: z.string().min(1),
  uploadedAt: z.coerce.date(),
});

export const merchantSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  status: merchantStatusSchema,
  rejectReason: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const merchantWithKycSchema = merchantSchema.extend({
  kycDocuments: z.array(kycDocumentSchema),
});

export const createMerchantSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export const updateMerchantSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
});

export const merchantRejectSchema = z.object({
  reason: z.string().min(1).max(500),
});

export type KycDocument = z.infer<typeof kycDocumentSchema>;
export type Merchant = z.infer<typeof merchantSchema>;
export type MerchantWithKyc = z.infer<typeof merchantWithKycSchema>;
export type CreateMerchantInput = z.infer<typeof createMerchantSchema>;
export type UpdateMerchantInput = z.infer<typeof updateMerchantSchema>;
export type MerchantRejectInput = z.infer<typeof merchantRejectSchema>;
