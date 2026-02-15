/**
 * Audit log DTO — shared between frontend and backend.
 */
import { z } from 'zod';

export const AuditLogSchema = z.object({
    id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    user_id: z.string().uuid(),
    action: z.string(),
    resource_type: z.string(),
    resource_id: z.string().nullable().optional(),
    metadata: z.record(z.unknown()).nullable().optional(),
    trace_id: z.string(),
    request_id: z.string(),
    created_at: z.string().datetime(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;
