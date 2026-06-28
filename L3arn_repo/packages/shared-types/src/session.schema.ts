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
