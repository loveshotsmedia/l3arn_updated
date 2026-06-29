/**
 * Identity Contract — Foundation
 *
 * Covers every entity that has an account, session, or permission in L3ARN.
 * This is the root schema module; all other schemas import from here.
 *
 * Grounded in: ADR-007 (child identity), ADR-008 (parent visibility),
 * ADR-009 (AI interaction), ADR-012 (curriculum approval), ADR-027 (audio),
 * ADR-029 (model improvement opt-out), ADR-030 (account ownership),
 * ADR-031 (child session model), COPPA baseline.
 */

import { z } from "zod";

// ─── Shared Enums ────────────────────────────────────────────────────────────
// Imported by mission, world-event, and rewards schemas.

export const HouseSchema = z.enum(["pre_sorting", "Valkryn", "Lyrion", "Novari", "Cytrex"]);
export type House = z.infer<typeof HouseSchema>;

// K-8 grade range (ADR-030: parent-owned child profiles for K-8 MVP)
export const GradeSchema = z.enum(["K", "1", "2", "3", "4", "5", "6", "7", "8"]);
export type Grade = z.infer<typeof GradeSchema>;

// Parent curriculum approval modes (ADR-012)
export const ApprovalModeSchema = z.enum(["high-control", "balanced", "autopilot"]);
export type ApprovalMode = z.infer<typeof ApprovalModeSchema>;

// Mission delivery modes available to students (ADR-016, ADR-017)
export const DeliveryModeSchema = z.enum(["3d", "interactive-lite", "text-audio-offline"]);
export type DeliveryMode = z.infer<typeof DeliveryModeSchema>;

// Student chat modes (ADR-006)
// K-5 = quick-chat-only; grades 6-8 = moderated-free-text with explicit parent approval
export const ChatModeSchema = z.enum(["quick-chat-only", "moderated-free-text"]);
export type ChatMode = z.infer<typeof ChatModeSchema>;

// Parent visibility tiers (ADR-008)
export const VisibilityTierSchema = z.enum([
  "full",            // K-5 default: parent sees everything
  "summary",         // grades 6-8 default: summary with expand-on-demand
  "safety-override", // always available regardless of tier
]);
export type VisibilityTier = z.infer<typeof VisibilityTierSchema>;

// ─── Parent Account ───────────────────────────────────────────────────────────

export const ParentAccountSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ParentAccount = z.infer<typeof ParentAccountSchema>;

// ─── Household ────────────────────────────────────────────────────────────────
// A family unit; one parent account may manage one household in MVP.

export const HouseholdSchema = z.object({
  id: z.string().uuid(),
  parentAccountId: z.string().uuid(),
  name: z.string().min(1).max(100),
  createdAt: z.string().datetime(),
});
export type Household = z.infer<typeof HouseholdSchema>;

// ─── Child Profile ────────────────────────────────────────────────────────────
// Real-identity record. Parent-owned. Protected by Supabase RLS.
// NEVER exposed through public channels or to other students.
// Maps to: child_profiles table (architecture.md §8)

export const ChildProfileSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  parentAccountId: z.string().uuid(),
  legalFirstName: z.string().min(1).max(100),
  legalLastName: z.string().min(1).max(100),
  grade: GradeSchema,
  dateOfBirth: z.string().date(), // YYYY-MM-DD; retained for COPPA age verification only
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ChildProfile = z.infer<typeof ChildProfileSchema>;

// ─── Academy Identity ─────────────────────────────────────────────────────────
// Public-facing identity. Display Name + House only. (ADR-007)
// Real full name hidden by default.
// No face capture, no biometric identifiers — avatar is asset-based only.
// Maps to: academy_identities table

export const AcademyIdentitySchema = z.object({
  id: z.string().uuid(),
  childProfileId: z.string().uuid(),
  displayName: z.string().min(2).max(32),   // parent-approved Academy Display Name
  house: HouseSchema,
  avatarAssetId: z.string().optional(),      // reference to a pre-built avatar asset; no face data
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AcademyIdentity = z.infer<typeof AcademyIdentitySchema>;

// ─── Child Permissions ────────────────────────────────────────────────────────
// Parent-set permission record for a child. Controls AI, audio, chat, delivery,
// curriculum approval mode, model improvement opt-in, and content boundaries.
// Maps to: child_permissions table

export const ChildPermissionsSchema = z.object({
  id: z.string().uuid(),
  childProfileId: z.string().uuid(),

  // Chat (ADR-006): parent sets which chat mode the child operates under
  chatMode: ChatModeSchema,

  // Audio (ADR-027): push-to-talk only when enabled; never always-on
  audioEnabled: z.boolean(),

  // AI interaction (ADR-009): parent enables/disables AI companion chat
  aiInteractionEnabled: z.boolean(),

  // Delivery modes the child may access (ADR-017: parent governs, student chooses within)
  allowedDeliveryModes: z.array(DeliveryModeSchema).min(1),

  // Curriculum approval mode (ADR-012)
  curriculumApprovalMode: ApprovalModeSchema,

  // Model improvement opt-in (ADR-029): false = opted out; this is the safe default
  modelImprovementOptIn: z.boolean(),

  // Parent visibility tier for this child's data (ADR-008)
  parentVisibilityTier: VisibilityTierSchema,

  // Optional hard limits
  screenLimitMinutesPerDay: z.number().int().positive().optional(),
  blockedTopics: z.array(z.string()).default([]),

  updatedAt: z.string().datetime(),
  updatedByParentAccountId: z.string().uuid(),
});
export type ChildPermissions = z.infer<typeof ChildPermissionsSchema>;

// ─── Trusted Device ───────────────────────────────────────────────────────────
// Allows child to log in via avatar/PIN on an approved device (ADR-031).
// Maps to: trusted_devices table

export const TrustedDeviceSchema = z.object({
  id: z.string().uuid(),
  childProfileId: z.string().uuid(),
  parentAccountId: z.string().uuid(),
  deviceFingerprint: z.string(),
  nickname: z.string().optional(),
  approvedAt: z.string().datetime(),
  lastUsedAt: z.string().datetime().optional(),
  revokedAt: z.string().datetime().optional(),
});
export type TrustedDevice = z.infer<typeof TrustedDeviceSchema>;

// ─── Child Session ────────────────────────────────────────────────────────────
// Active session record. Entry method is either parent-launched or
// avatar/PIN on a trusted device (ADR-031).
// Maps to: child_sessions table

export const SessionEntryMethodSchema = z.enum([
  "parent-launch",
  "avatar-pin-trusted-device",
]);
export type SessionEntryMethod = z.infer<typeof SessionEntryMethodSchema>;

export const ChildSessionSchema = z.object({
  id: z.string().uuid(),
  childProfileId: z.string().uuid(),
  academyIdentityId: z.string().uuid(),
  entryMethod: SessionEntryMethodSchema,
  trustedDeviceId: z.string().uuid().optional(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  currentRoomId: z.string().optional(),
});
export type ChildSession = z.infer<typeof ChildSessionSchema>;

// ─── Parent Consent ───────────────────────────────────────────────────────────
// Immutable consent records for COPPA compliance and audit trail.
// Maps to: parent_consents table
// Every consent type that creates a new data-collection or interaction right
// must be recorded here before the feature activates.

export const ConsentTypeSchema = z.enum([
  "coppa-data-collection",      // base COPPA consent; required before any child data is collected
  "audio-push-to-talk",         // parent enables push-to-talk for the child
  "ai-interaction",             // parent enables AI companion chat
  "model-improvement",          // parent opts in to model improvement (default: NOT granted)
  "moderated-free-text-chat",   // parent approves grades 6-8 free-text chat (ADR-006)
  "visibility-reduction",       // parent downgrades from full to summary visibility (ADR-008)
]);
export type ConsentType = z.infer<typeof ConsentTypeSchema>;

export const ParentConsentSchema = z.object({
  id: z.string().uuid(),
  parentAccountId: z.string().uuid(),
  childProfileId: z.string().uuid().optional(), // null = account-level consent
  consentType: ConsentTypeSchema,
  granted: z.boolean(),
  grantedAt: z.string().datetime(),
  ipAddress: z.string().optional(),            // retained for COPPA audit; not surfaced to UI
  revokedAt: z.string().datetime().optional(),
});
export type ParentConsent = z.infer<typeof ParentConsentSchema>;
