/**
 * Session Contract — Child Session Launch
 *
 * Covers the POST /api/sessions/start endpoint contract:
 * parent-initiated child session creation.
 *
 * Grounded in: ADR-031 (child session model), OQ-A8-001 (session start endpoint).
 *
 * Rules:
 *  - LaunchMode is scaffolded for future trusted-device PIN sessions,
 *    but only "parent_launched" is implemented. Return 400 if
 *    "trusted_device_pin" is requested before Phase 1.
 *  - childSessionToken is ALWAYS opaque (crypto.randomUUID() result).
 *    It MUST never equal childProfileId.
 *  - AcademyIdentity in the response carries displayName + house only (ADR-007).
 *  - Session duration: 2 hours for parent_launched (ADR-031).
 */

import { z } from "zod";
import { HouseSchema } from "./identity.schema";

// ─── Launch Mode ──────────────────────────────────────────────────────────────

/**
 * How the child session was initiated.
 * "trusted_device_pin" is scaffolded for future use only — returning 400
 * if requested until Phase 1 trusted-device flow is implemented.
 */
export const LaunchModeSchema = z.enum(["parent_launched", "trusted_device_pin"]);
export type LaunchMode = z.infer<typeof LaunchModeSchema>;

// ─── Request ──────────────────────────────────────────────────────────────────

export const StartSessionRequestSchema = z.object({
  /** The child's profile UUID — parent must own this profile (enforced by Railway). */
  childProfileId: z.string().uuid({ message: "childProfileId must be a valid UUID" }),

  /**
   * How the session is being launched.
   * Only "parent_launched" is implemented in Phase 0.
   * "trusted_device_pin" scaffolded; returns 400 until Phase 1.
   */
  launchMode: LaunchModeSchema.default("parent_launched"),
});

export type StartSessionRequest = z.infer<typeof StartSessionRequestSchema>;

// ─── Response ─────────────────────────────────────────────────────────────────

/**
 * Public academy identity included in the session response.
 * Display Name + House only — no legal name, no PII (ADR-007).
 */
export const AcademyIdentityResponseSchema = z.object({
  /** Child's Academy display name (2–32 chars, unique Academy-wide). */
  displayName: z.string(),

  /**
   * Current house affiliation.
   * "pre_sorting" if Sorting Ceremony has not yet been completed.
   */
  house: z.string(),
});

export type AcademyIdentityResponse = z.infer<typeof AcademyIdentityResponseSchema>;

export const StartSessionResponseSchema = z.object({
  /**
   * Opaque session token issued by Railway.
   * NOT the childProfileId — generated via crypto.randomUUID().
   * The child app uses this token to authenticate Railway API calls for this session.
   */
  childSessionToken: z.string(),

  /** UUID of the newly created child_sessions row. */
  childSessionId: z.string().uuid(),

  /** ISO 8601 timestamp when this session expires. Default: 2h from creation. */
  expiresAt: z.string().datetime(),

  /** Academy identity for display in the child entry experience. */
  academyIdentity: AcademyIdentityResponseSchema,
});

export type StartSessionResponse = z.infer<typeof StartSessionResponseSchema>;

// ─── Verify Session (GET-equivalent; child entry gate) ─────────────────────────
//
// The child entry page (/student/enter) MUST call this before rendering any
// Academy context. The opaque childSessionToken travels in the
// `Authorization: Bearer <token>` header — never in the URL/query (avoids token
// leakage into logs/referrers) and never trusted from localStorage.
//
// Fail-closed contract:
//   - missing / unknown token  → 401 (invalid session)
//   - expired / revoked / ended → 410 (session no longer usable)
//   - any backend/DB error      → treated as invalid (deny), never "allow"
// Only a 200 with VerifySessionResponse may grant entry.

export const VerifySessionResponseSchema = z.object({
  /** UUID of the verified child_sessions row. */
  childSessionId: z.string().uuid(),

  /** UUID of the academy_identities row bound to this session. */
  academyIdentityId: z.string().uuid(),

  /** ISO 8601 timestamp when this session expires. */
  expiresAt: z.string().datetime(),

  /** Verified academy identity (display name + house) — the entry authority. */
  academyIdentity: AcademyIdentityResponseSchema,
});

export type VerifySessionResponse = z.infer<typeof VerifySessionResponseSchema>;

// ─── Selectable House ──────────────────────────────────────────────────────────
//
// HouseSchema (identity.schema) includes "pre_sorting" — the *initial* state.
// A child can never *select* "pre_sorting"; the Sorting Ceremony only writes one
// of the four real houses. This is the request-validation surface for that.

export const SelectableHouseSchema = HouseSchema.exclude(["pre_sorting"]);
export type SelectableHouse = z.infer<typeof SelectableHouseSchema>;

// ─── Set House (Sorting Ceremony result) ───────────────────────────────────────
//
// POST /api/student/session/house
// Auth: Authorization: Bearer <childSessionToken>
// Writes academy_identities.house (NEVER child_profiles). Backend-mediated only.

export const SetHouseRequestSchema = z.object({
  /** The house the child chose during the Sorting Ceremony. */
  house: SelectableHouseSchema,
});

export type SetHouseRequest = z.infer<typeof SetHouseRequestSchema>;

export const SetHouseResponseSchema = z.object({
  success: z.literal(true),
  /** The updated academy identity (so the client can refresh display state). */
  academyIdentity: AcademyIdentityResponseSchema,
});

export type SetHouseResponse = z.infer<typeof SetHouseResponseSchema>;

// ─── Select Companion ──────────────────────────────────────────────────────────
//
// POST /api/student/session/companion
// Auth: Authorization: Bearer <childSessionToken>
// Upserts companion_profiles (one active companion per child). Backend-mediated.

export const SelectCompanionRequestSchema = z.object({
  /** Stable key used across growth/rewards events, e.g. "comp-001-spark". */
  companionKey: z.string().min(1).max(64),
  /** Display name the child sees, e.g. "Spark". */
  characterName: z.string().min(1).max(48),
  /** Personality/teaching style descriptor from the chosen template. */
  characterStyle: z.string().max(64).optional(),
  /** Teaching tone descriptor from the chosen template. */
  teachingTone: z.string().max(64).optional(),
  /** Original template id the selection came from (provenance). */
  templateId: z.string().max(64).optional(),
});

export type SelectCompanionRequest = z.infer<typeof SelectCompanionRequestSchema>;

export const SelectCompanionResponseSchema = z.object({
  success: z.literal(true),
  companion: z.object({
    companionKey: z.string(),
    characterName: z.string(),
    bondLevel: z.number().int().nonnegative(),
    isActive: z.boolean(),
  }),
});

export type SelectCompanionResponse = z.infer<typeof SelectCompanionResponseSchema>;

// ─── Mission Runtime: Start ────────────────────────────────────────────────────
//
// POST /api/student/mission/start
// Auth: Authorization: Bearer <childSessionToken>
// Backend compiles the mission (Zod-validated; static fallback on AI failure —
// no unvalidated AI output ever reaches the child) and creates a mission_attempts
// row. Returns a compact student-facing mission view + the attempt id.

export const StartMissionRequestSchema = z.object({
  /** Canonical mission identifier. Hero Slice = "mission-001". */
  missionId: z.string().min(1).max(64).default("mission-001"),
});

export type StartMissionRequest = z.infer<typeof StartMissionRequestSchema>;

export const StudentMissionTaskSchema = z.object({
  id: z.string(),
  description: z.string(),
  interactionType: z.string(),
});

export const StartMissionResponseSchema = z.object({
  missionAttemptId: z.string().uuid(),
  missionId: z.string(),
  /** Provenance: 'ai' = compiled+validated; 'fallback' = static safe content. */
  contentSource: z.enum(["ai", "fallback"]),
  storyHook: z.string(),
  tasks: z.array(StudentMissionTaskSchema),
  rewardPreviewLabel: z.string(),
});

export type StartMissionResponse = z.infer<typeof StartMissionResponseSchema>;

// ─── Mission Runtime: Complete ─────────────────────────────────────────────────
//
// POST /api/student/mission/complete
// Auth: Authorization: Bearer <childSessionToken>
// Idempotent: the first call transitions the attempt started→completed and runs
// the reward + evidence + mastery + report pipeline. Repeat calls do not
// re-award (alreadyCompleted=true).

export const CompleteMissionRequestSchema = z.object({
  missionAttemptId: z.string().uuid(),
  /** Did the child finish all tasks (vs. just attempt)? Gates completion bonuses. */
  completedAllTasks: z.boolean().default(true),
  /** Did the child demonstrate the mastery bar (e.g. caught the AI mistake)? */
  masteryThresholdMet: z.boolean().default(false),
  /** Optional 0–1 evidence-weighted score. */
  masteryEvidenceScore: z.number().min(0).max(1).optional(),
});

export type CompleteMissionRequest = z.infer<typeof CompleteMissionRequestSchema>;

export const MissionRewardSummarySchema = z.object({
  moolahEarned: z.number().int().nonnegative(),
  xpEarned: z.number().int().nonnegative(),
  housePointsEarned: z.number().int().nonnegative(),
  companionBondDelta: z.number().int().nonnegative(),
  badgesAwarded: z.array(z.string()),
});

export const CompleteMissionResponseSchema = z.object({
  missionAttemptId: z.string().uuid(),
  status: z.literal("completed"),
  /** True if this completion was already recorded — no rewards were re-applied. */
  alreadyCompleted: z.boolean(),
  rewards: MissionRewardSummarySchema,
  evidenceCount: z.number().int().nonnegative(),
  masteryRecordsWritten: z.number().int().nonnegative(),
  /** parent_reports row id (First Learning Map), or null if assembly was skipped. */
  reportId: z.string().uuid().nullable(),
});

export type CompleteMissionResponse = z.infer<typeof CompleteMissionResponseSchema>;
