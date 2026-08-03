/**
 * Admin Authorization Utility — Server-side only
 *
 * SECURITY CONTRACT:
 *   - ONLY import this in Server Components, Route Handlers, or Server Actions.
 *   - NEVER import this in Client Components ('use client').
 *   - All role checks hit the admin_users table via service_role.
 *   - Fails closed: any DB error = deny access. Access is NEVER granted on error.
 *
 * Source of truth: admin_users table (infra/supabase/migrations/006_founder_mission_control.sql)
 * Auth model: Supabase session (user_id) → admin_users table lookup via service_role
 *
 * Grounded in: ADR-049 (Admin Access Model), OQ-A11-001 resolution.
 */

import { createSupabaseServiceRoleClient } from "./supabase-server";
import type { AdminRole } from "@l3arn/shared-types";

/**
 * Returns the admin role for the given user, or null if the user has no
 * active admin role. Uses service_role to bypass RLS on admin_users.
 *
 * Fails closed: returns null on any error (never throws to callers).
 */
export async function getAdminRole(userId: string): Promise<AdminRole | null> {
  if (!userId) return null;

  try {
    const client = createSupabaseServiceRoleClient();
    const { data, error } = await client
      .from("admin_users")
      .select("role")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .maybeSingle();

    if (error) {
      // Fail closed — log the error but never grant access
      console.error(
        JSON.stringify({
          level: "ERROR",
          system: "admin-auth",
          message: "admin_users lookup failed — denying access (fail-closed)",
          error: error.message,
          userId,
        })
      );
      return null;
    }

    if (!data?.role) return null;

    // Validate the role value is a known AdminRole
    const knownRoles: AdminRole[] = [
      "founder",
      "safety_admin",
      "support_admin",
      "curriculum_admin",
      "technical_admin",
      "ai_agent_operator",
    ];
    if (!knownRoles.includes(data.role as AdminRole)) {
      console.error(
        JSON.stringify({
          level: "ERROR",
          system: "admin-auth",
          message: "Unknown role value in admin_users — denying access",
          role: data.role,
          userId,
        })
      );
      return null;
    }

    return data.role as AdminRole;
  } catch (err) {
    // Unexpected error — fail closed
    console.error(
      JSON.stringify({
        level: "ERROR",
        system: "admin-auth",
        message: "Unexpected error during admin role lookup — denying access (fail-closed)",
        error: err instanceof Error ? err.message : String(err),
        userId,
      })
    );
    return null;
  }
}

/**
 * Returns true if the given user has the 'founder' role in admin_users.
 * Fails closed: returns false on any error.
 */
export async function isFounder(userId: string): Promise<boolean> {
  const role = await getAdminRole(userId);
  return role === "founder";
}

/**
 * Throws an error if the given user does not have the required admin role.
 * Use in API routes to gate access.
 *
 * Fails closed: throws on any DB error (never passes through on error).
 *
 * @throws {Error} with message "Forbidden" if user lacks the required role
 */
export async function requireAdminRole(
  userId: string,
  requiredRole: AdminRole
): Promise<void> {
  const role = await getAdminRole(userId);
  if (role !== requiredRole) {
    throw new Error("Forbidden");
  }
}

/**
 * Throws an error if the given user does not have the 'founder' role.
 * Shorthand for requireAdminRole(userId, 'founder').
 *
 * @throws {Error} with message "Forbidden" if user is not a founder
 */
export async function requireFounder(userId: string): Promise<void> {
  await requireAdminRole(userId, "founder");
}
