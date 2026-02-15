/**
 * Tenant DTOs — shared between frontend and backend.
 */
import { z } from 'zod';

export const TenantSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(255),
    slug: z.string().min(1).max(100),
    settings: z.record(z.unknown()).optional(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});

export const TenantCreateSchema = z.object({
    name: z.string().min(1).max(255),
    slug: z.string().min(1).max(100),
});

export type Tenant = z.infer<typeof TenantSchema>;
export type TenantCreate = z.infer<typeof TenantCreateSchema>;
