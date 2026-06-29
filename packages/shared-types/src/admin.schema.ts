/**
 * Admin User Contract
 *
 * Zod schemas and TypeScript types for the admin_users table.
 * Admin role authorization is server-side only — never expose admin role
 * data to client components or browser bundles.
 *
 * Source of truth: infra/supabase/migrations/006_founder_mission_control.sql
 * Authorization logic: apps/web/src/lib/admin-auth.ts
 *
 * Grounded in: ADR-049 (Admin Access Model), OQ-A11-001 resolution.
 */

import { z } from "zod";

// ─── Admin Role ───────────────────────────────────────────────────────────────
// Mirrors the CHECK constraint in admin_users.role column.

export const AdminRoleSchema = z.enum([
  "founder",
  "safety_admin",
  "support_admin",
  "curriculum_admin",
  "technical_admin",
  "ai_agent_operator",
]);
export type AdminRole = z.infer<typeof AdminRoleSchema>;

// ─── Admin User ───────────────────────────────────────────────────────────────
// Mirrors the admin_users table. Used for type-safe reads via service_role.
// SECURITY: email is display-only. Authorization is based on user_id only.

export const AdminUserSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),            // auth.users.id — authorization key
  email: z.string().email(),      // display only, NOT authorization source
  role: AdminRoleSchema,
  granted_by: z.string().nullable(),
  granted_at: z.string().datetime(),
  revoked_at: z.string().datetime().nullable(),
  notes: z.string().nullable(),
});
export type AdminUser = z.infer<typeof AdminUserSchema>;
