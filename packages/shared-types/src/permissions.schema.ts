/**
 * Permissions Contract
 *
 * Cross-cutting trust boundaries, data access scopes, parent visibility flags,
 * and the admin access model for L3ARN.
 *
 * Core principle: child sessions are strictly scoped. A child session cannot
 * access parent dashboard data, sibling profiles, or any other household's
 * data. These boundaries are enforced by Supabase RLS; this contract lets
 * application code reason about them explicitly and prevents silent violations.
 *
 * Admin access model is Provisional per ADR-049. The role matrix and full
 * permission levels require founding-team source confirmation. The types here
 * establish the shape and audit invariants that any confirmed model must satisfy.
 *
 * Grounded in: ADR-007 (child identity), ADR-008 (parent visibility),
 * ADR-030 (account ownership), ADR-031 (child session model),
 * ADR-049 (admin access model — provisional), ADR-059 (RLS before UI),
 * ADR-060 (curriculum tables via API only — provisional), COPPA baseline.
 */

import { z } from "zod";
import { VisibilityTierSchema } from "./identity.schema";

// ─── Data Principals ──────────────────────────────────────────────────────────
// Who can act on data in L3ARN. Roles are intentionally narrow.

export const DataPrincipalSchema = z.enum([
  "parent",        // authenticated parent account holder
  "child-session", // active child session — strictly scoped (see ChildSessionScopeSchema)
  "admin",         // L3ARN admin; subject to ADR-049 confirmation
  "system",        // internal service-to-service calls
]);
export type DataPrincipal = z.infer<typeof DataPrincipalSchema>;

// ─── Child Session Scope ──────────────────────────────────────────────────────
// Compile-time record of what a child session CAN and CANNOT access.
// `z.literal(false)` fields are invariants — they cannot be set to true.
// These reflect the RLS rules that must exist before any UI ships (ADR-059).

export const ChildSessionScopeSchema = z.object({
  sessionId: z.string().uuid(),
  childProfileId: z.string().uuid(),
  householdId: z.string().uuid(),

  // Permitted access
  canAccessOwnMissions: z.literal(true),
  canAccessOwnRewards: z.literal(true),
  canAccessSharedAcademyWorld: z.literal(true),

  // Structural prohibitions — compile-time invariants
  canAccessParentDashboard: z.literal(false),
  canAccessSiblingProfiles: z.literal(false),
  canAccessOtherHouseholds: z.literal(false),
  canSendPrivateMessages: z.literal(false),      // No DMs in MVP (ADR-006)
  canReadCurriculumTablesDirectly: z.literal(false), // API only (ADR-060 provisional)
});
export type ChildSessionScope = z.infer<typeof ChildSessionScopeSchema>;

// Factory — use this to produce a well-formed scope for a given session.
export function buildChildSessionScope(
  sessionId: string,
  childProfileId: string,
  householdId: string,
): ChildSessionScope {
  return ChildSessionScopeSchema.parse({
    sessionId,
    childProfileId,
    householdId,
    canAccessOwnMissions: true,
    canAccessOwnRewards: true,
    canAccessSharedAcademyWorld: true,
    canAccessParentDashboard: false,
    canAccessSiblingProfiles: false,
    canAccessOtherHouseholds: false,
    canSendPrivateMessages: false,
    canReadCurriculumTablesDirectly: false,
  });
}

// ─── Parent Visibility Flags ──────────────────────────────────────────────────
// Reusable per-record metadata for anything that crosses the trust boundary
// into parent-facing reporting. Applied to evidence events, world events, chat
// logs, session records, and AI output envelopes.

export const ParentVisibilityFlagsSchema = z.object({
  parentVisible: z.boolean(),
  requiresParentConsent: z.boolean(),  // must have a ConsentRecord before surfacing
  includeInPortfolio: z.boolean(),
  retentionDays: z.number().int().positive().nullable(), // null = keep until parent deletes
  visibilityTier: VisibilityTierSchema, // which tier can see this record (ADR-008)
});
export type ParentVisibilityFlags = z.infer<typeof ParentVisibilityFlagsSchema>;

// ─── Admin Access Role (ADR-049 — Confirmed June 2026) ───────────────────────
// Six roles with strict separation of authority. Founder-confirmed role matrix.
// All admin roles share these invariants:
//   - No role may bypass RLS
//   - No role may view raw child PII without a logged AdminAccessRecord
//   - All admin sessions time out
//
// founder:           Full authority. Kill-switch. Role management. Final S0/S1 resolution.
//                    Can restore killed features and approve Wave 2. View all operational systems.
// safety-admin:      Review incidents, classify severity, recommend kill switch.
//                    Review flagged chat/AI/evidence issues.
//                    Cannot: restore killed features, alter consent, casually browse child data.
// support-admin:     Onboarding help, support-relevant account state, support notes, guide parents.
//                    Cannot: alter model-improvement consent, view unnecessary child content,
//                    restore safety features.
// curriculum-admin:  Mastery map, standards mappings, mission patterns/rubrics,
//                    anonymized learning outcomes.
//                    Cannot: access identifiable child data by default, alter parent permissions.
// technical-admin:   Logs, system health, deployment diagnostics, bug investigation.
//                    Cannot: override consent, casually browse child content,
//                    restore killed safety features without founder approval.
// ai-agent-operator: Summarize incidents, classify severity, draft support replies,
//                    detect anomalies, prepare scorecards.
//                    Cannot: make final S0/S1 decisions, restore killed features,
//                    change consent/settings, delete/export child data, bypass permissions.

export const AdminAccessRoleSchema = z.enum([
  "founder",
  "safety-admin",
  "support-admin",
  "curriculum-admin",
  "technical-admin",
  "ai-agent-operator",
]);
export type AdminAccessRole = z.infer<typeof AdminAccessRoleSchema>;

// ─── Admin Access Record (ADR-049 — Provisional) ─────────────────────────────
// Every admin action on child or parent data must produce one of these records
// before the action proceeds. No justification = no access.
// Maps to: admin access log (specific table name pending ADR-049 confirmation)

export const AdminAccessRecordSchema = z.object({
  id: z.string().uuid(),
  adminUserId: z.string().uuid(),
  adminRole: AdminAccessRoleSchema,
  resourceType: z.string(),     // e.g. "child_profile", "chat_message", "escalation_record"
  resourceId: z.string().uuid(),
  householdId: z.string().uuid(),
  justification: z.string().min(10).max(500), // required; short justification logged
  accessedAt: z.string().datetime(),
  sessionExpiresAt: z.string().datetime(), // admin sessions must time out
  ipAddress: z.string().optional(),        // retained for audit; never surfaced to UI
});
export type AdminAccessRecord = z.infer<typeof AdminAccessRecordSchema>;

// ─── Data Domain Registry ─────────────────────────────────────────────────────
// The nine schema domains from architecture.md §12. Used to describe what
// domains a given principal's access scope includes.

export const DataDomainSchema = z.enum([
  "identity-auth",
  "learner-model",
  "curriculum-spine",      // read via Mission Compiler API only (ADR-060 provisional)
  "mission-system",
  "evidence-reports",
  "rewards-economy",
  "world-state",
  "network-safety",
  "learning-intelligence", // de-identified only; requires explicit parent opt-in (ADR-029)
]);
export type DataDomain = z.infer<typeof DataDomainSchema>;

// ─── Data Access Scope ────────────────────────────────────────────────────────
// Describes what domains a given principal can interact with in a given context.
// Not a runtime token — a typed description used for service-boundary validation.

export const DataAccessScopeSchema = z.object({
  principal: DataPrincipalSchema,
  householdId: z.string().uuid().nullable(), // null for system/admin cross-household access
  allowedDomains: z.array(DataDomainSchema).min(1),
  restrictions: z.array(z.string()),         // human-readable additional constraints
});
export type DataAccessScope = z.infer<typeof DataAccessScopeSchema>;

// ─── Resolved Questions ───────────────────────────────────────────────────────
// ✅ ADR-049: Admin role matrix confirmed June 2026 — see AdminAccessRoleSchema above.
//
// ─── Remaining Open Questions ─────────────────────────────────────────────────
// • ADR-049: Admin session timeout duration not yet specified.
// • ADR-060: Whether curriculum-spine access prohibition is enforced via RLS, API
//   gateway, or both — not yet confirmed. Until confirmed, canReadCurriculumTablesDirectly
//   in ChildSessionScope remains a literal(false) and all UI code routes via API.
