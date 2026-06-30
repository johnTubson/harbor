import { z } from "zod";

export const auditLogSchema = z.object({
  id: z.uuid(),
  actorId: z.uuid().nullable(),
  actorEmail: z.string().nullable(),
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.coerce.date(),
});

export const auditLogCreateSchema = z.object({
  actorId: z.uuid().optional(),
  actorEmail: z.string().optional(),
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const paginatedAuditLogsSchema = z.object({
  items: z.array(auditLogSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
});

export type AuditLog = z.infer<typeof auditLogSchema>;
export type AuditLogCreateInput = z.infer<typeof auditLogCreateSchema>;
export type PaginatedAuditLogs = z.infer<typeof paginatedAuditLogsSchema>;
