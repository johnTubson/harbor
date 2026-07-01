import { z } from "zod";
import { kycDocumentTypeSchema } from "./enums";

export const kycUploadUrlRequestSchema = z.object({
  type: kycDocumentTypeSchema,
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1).max(128),
});

export const kycUploadUrlResponseSchema = z.object({
  uploadUrl: z.url(),
  objectKey: z.string().min(1),
  expiresIn: z.number().int().positive(),
});

export const registerKycDocumentSchema = z.object({
  type: kycDocumentTypeSchema,
  objectKey: z.string().min(1).max(512),
  fileName: z.string().min(1).max(255),
});

export type KycUploadUrlRequest = z.infer<typeof kycUploadUrlRequestSchema>;
export type KycUploadUrlResponse = z.infer<typeof kycUploadUrlResponseSchema>;
export type RegisterKycDocumentInput = z.infer<
  typeof registerKycDocumentSchema
>;
