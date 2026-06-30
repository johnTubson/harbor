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

export type AuditLog = z.infer<typeof auditLogSchema>;
