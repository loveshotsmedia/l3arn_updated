/**
 * Evidence Contract
 *
 * Covers structured learning events, artifacts, mastery records, and
 * portfolio items that together form the academic proof chain.
 *
 * Grounded in: ADR-026 (evidence capture), ADR-010 (academic progress),
 * ADR-029 (model improvement opt-out), MASTER_HANDOFF §9.2 (hard privacy rules),
 * architecture.md §8 (Evidence/Reports domain).
 *
 * Privacy invariants in this contract (enforced as z.literal(true)):
 *   - noWebcam: no webcam content is ever captured
 *   - noFaceCapture: no face capture or facial recognition data
 *   - noVoiceBiometrics: push-to-talk audio is never processed for voice ID
 *     or emotion detection
 */

import { z } from "zod";

// ─── Evidence Capture Types (ADR-026) ─────────────────────────────────────────

export const EvidenceCaptureTypeSchema = z.enum([
  "decision-log",        // structured record of choices made during a mission task
  "sequence-completion", // ordered task completion record
  "ai-mistake-check",    // student identifies/corrects an AI error (Mission 001)
  "explanation",         // student explains a concept in their own words
  "reflection",          // post-mission reflection prompt response
  "artifact-upload",     // parent/student uploads external work product
  "audio-response",      // push-to-talk response; parent must have enabled audio (ADR-027)
  "structured-replay",   // system-generated replay of mission interaction steps
  "screenshot",          // 3D scene screenshot; no face data, no webcam
]);
export type EvidenceCaptureType = z.infer<typeof EvidenceCaptureTypeSchema>;

// ─── Learning Evidence Event ──────────────────────────────────────────────────
// The atomic unit of academic proof. Auto-captured during a mission attempt.
// Maps to: learning_evidence_events table (architecture.md §8)

export const LearningEvidenceEventSchema = z.object({
  id: z.string().uuid(),
  missionAttemptId: z.string().uuid(),
  childProfileId: z.string().uuid(),
  childSessionId: z.string().uuid(),
  captureType: EvidenceCaptureTypeSchema,
  stepId: z.string(),                    // which mission step this evidence is from
  content: z.record(z.unknown()),        // structured content; shape varies by captureType
  capturedAt: z.string().datetime(),
  retentionUntil: z.string().datetime(), // data is not retained indefinitely (COPPA/privacy)
  parentVisible: z.boolean(),
  portfolioEligible: z.boolean(),

  // Privacy invariants (MASTER_HANDOFF §9.2; ADR-026)
  noWebcam: z.literal(true),
  noFaceCapture: z.literal(true),
  noVoiceBiometrics: z.literal(true),
});
export type LearningEvidenceEvent = z.infer<typeof LearningEvidenceEventSchema>;

// ─── Mission Replay Event ─────────────────────────────────────────────────────
// System-generated structured replay of a mission attempt.
// Distinct from LearningEvidenceEvent (that captures a specific moment;
// this captures the full interaction sequence).
// Maps to: mission_replay_events table

export const MissionReplayEventSchema = z.object({
  id: z.string().uuid(),
  missionAttemptId: z.string().uuid(),
  childProfileId: z.string().uuid(),
  interactionSequence: z.array(z.object({
    stepId: z.string(),
    action: z.string(),
    outcome: z.string(),
    timestampOffset: z.number().int().nonnegative(), // ms from mission start
  })),
  totalDurationMs: z.number().int().positive(),
  capturedAt: z.string().datetime(),
  retentionUntil: z.string().datetime(),
  parentVisible: z.boolean(),
  noWebcam: z.literal(true),
  noFaceCapture: z.literal(true),
});
export type MissionReplayEvent = z.infer<typeof MissionReplayEventSchema>;

// ─── Artifact ─────────────────────────────────────────────────────────────────
// A student work product: written work, drawing, audio recording, or structured output.
// Stored in Supabase Storage. Requires parent approval before portfolio inclusion.
// Maps to: artifacts table

export const ArtifactTypeSchema = z.enum([
  "written-work",
  "drawing",
  "audio-recording", // push-to-talk only; no always-on capture (ADR-027)
  "structured-output",
]);
export type ArtifactType = z.infer<typeof ArtifactTypeSchema>;

export const ArtifactSchema = z.object({
  id: z.string().uuid(),
  childProfileId: z.string().uuid(),
  missionAttemptId: z.string().uuid(),
  artifactType: ArtifactTypeSchema,
  storageRef: z.string(),             // Supabase Storage path
  title: z.string().optional(),
  parentApproved: z.boolean(),        // must be true before artifact enters portfolio
  parentApprovedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  retentionUntil: z.string().datetime(),
});
export type Artifact = z.infer<typeof ArtifactSchema>;

// ─── Mastery Record ───────────────────────────────────────────────────────────
// The persistent academic achievement record for a skill.
// Evidence-based: every mastery claim carries its proof chain. (ADR-010)
// Maps to: mastery_records table

export const MasteryLevelSchema = z.enum([
  "emerging",
  "developing",
  "proficient",
  "advanced",
]);
export type MasteryLevel = z.infer<typeof MasteryLevelSchema>;

export const MasteryRecordSchema = z.object({
  id: z.string().uuid(),
  childProfileId: z.string().uuid(),
  masterySkillId: z.string(),
  masteryDomainId: z.string(),
  floridaStandardCode: z.string().optional(),
  level: MasteryLevelSchema,
  evidenceEventIds: z.array(z.string().uuid()).min(1), // the proof chain
  achievedAt: z.string().datetime(),
  lastVerifiedAt: z.string().datetime(),
});
export type MasteryRecord = z.infer<typeof MasteryRecordSchema>;

// ─── Portfolio Item ───────────────────────────────────────────────────────────
// A parent-consented highlight from the evidence record.
// Requires explicit parent consent before inclusion. (ADR-026, ADR-029)
// Maps to: portfolio_items table

export const PortfolioItemSchema = z.object({
  id: z.string().uuid(),
  childProfileId: z.string().uuid(),
  evidenceEventId: z.string().uuid().optional(),
  artifactId: z.string().uuid().optional(),
  masteryRecordId: z.string().uuid().optional(),
  highlightNote: z.string().max(500).optional(), // parent-added annotation
  includedAt: z.string().datetime(),
  parentConsentedAt: z.string().datetime(), // required; no portfolio item without consent
});
export type PortfolioItem = z.infer<typeof PortfolioItemSchema>;
