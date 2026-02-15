/**
 * User / Profile DTOs — shared between frontend and backend.
 */
import { z } from 'zod';

export const MembershipRoleSchema = z.enum(['owner', 'admin', 'member']);
export type MembershipRole = z.infer<typeof MembershipRoleSchema>;

export const ProfileSchema = z.object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    display_name: z.string().nullable().optional(),
    avatar_url: z.string().url().nullable().optional(),
    role: MembershipRoleSchema,
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});

export const MembershipSchema = z.object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    role: MembershipRoleSchema,
    created_at: z.string().datetime(),
});

export type Profile = z.infer<typeof ProfileSchema>;
export type Membership = z.infer<typeof MembershipSchema>;
