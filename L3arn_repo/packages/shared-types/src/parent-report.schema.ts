/**
 * Parent Report Contract
 *
 * Covers parent-facing report types, including the Unified First Learning Map
 * (Mission 001 output), learner calibration scores, evidence highlights,
 * mastery progress summaries, and game progress summaries.
 *
 * Key rule (MASTER_HANDOFF §8, ADR-011): game progress and academic mastery
 * are related but not identical. Reports expose both — separately.
 *
 * Key rule (MASTER_HANDOFF §7.1): L3ARN does not claim to fully know a child
 * on day one. Calibration scores carry explicit confidence levels.
 *
 * Privacy invariants (MASTER_HANDOFF §9.2):
 *   - noWebcamContent: no report contains webcam-sourced content
 *   - noFaceCaptureContent: no report contains face capture or biometric data
 *
 * Grounded in: MASTER_HANDOFF §5.1 (Mission 001), §7 (Learner Model),
 * ADR-008 (parent visibility), ADR-010 (academic progress), ADR-011 (rewards),
 * ADR-026 (evidence capture), ADR-029 (opt-out), architecture.md §8.
 */

import { z } from "zod";

// ─── Learner Calibration Score (MASTER_HANDOFF §7.1) ─────────────────────────
// Tracks how well L3ARN understands this child over time.
// Score improves across four stages. Never claims certainty on day one.

export const CalibrationStageSchema = z.enum([
  "parent-onboarding",  // 20–35% — age, grade, goals, boundaries
  "sorting-ceremony",   // 40–55% — House choice, interests, motivation signals
  "mission-001",        // 60–75% — reading/listening behavior, AI readiness, persistence
  "first-7-14-days",    // 80–90% — progression, retention, frustration signals
]);
export type CalibrationStage = z.infer<typeof CalibrationStageSchema>;

export const LearnerCalibrationScoreSchema = z.object({
  score: z.number().min(0).max(100),
  stage: CalibrationStageSchema,
  confidence: z.number().min(0).max(1),   // 0 = no confidence, 1 = high confidence
  signalsContributing: z.array(z.string()), // human-readable signal names
  computedAt: z.string().datetime(),
});
export type LearnerCalibrationScore = z.infer<typeof LearnerCalibrationScoreSchema>;

// ─── Evidence Highlight ───────────────────────────────────────────────────────
// A parent-consented moment of notable student performance surfaced in a report.
// Requires explicit parent consent before surfacing. (ADR-026)

export const EvidenceHighlightTypeSchema = z.enum([
  "mastery-moment",
  "persistence",
  "ai-readiness",
  "creative-expression",
  "help-seeking",
  "sequence-completion",
]);
export type EvidenceHighlightType = z.infer<typeof EvidenceHighlightTypeSchema>;

export const EvidenceHighlightSchema = z.object({
  id: z.string().uuid(),
  type: EvidenceHighlightTypeSchema,
  description: z.string(),
  evidenceEventId: z.string().uuid().optional(),
  artifactId: z.string().uuid().optional(),
  portfolioItemId: z.string().uuid().optional(),
  parentConsentedAt: z.string().datetime(), // consent required before inclusion
});
export type EvidenceHighlight = z.infer<typeof EvidenceHighlightSchema>;

// ─── Mastery Progress Summary ─────────────────────────────────────────────────
// Per-skill mastery state at report time. The academic backbone of the report.
// Intentionally separate from game progress (ADR-011).

export const MasteryProgressLevelSchema = z.enum([
  "not-started",
  "emerging",
  "developing",
  "proficient",
  "advanced",
]);
export type MasteryProgressLevel = z.infer<typeof MasteryProgressLevelSchema>;

export const MasteryProgressSummarySchema = z.object({
  masterySkillId: z.string(),
  masteryDomainId: z.string(),
  skillName: z.string(),
  currentLevel: MasteryProgressLevelSchema,
  evidenceCount: z.number().int().nonnegative(),
  lastActivityAt: z.string().datetime().optional(),
  floridaStandardCodes: z.array(z.string()).optional(), // ADR-013: FL + L3ARN Mastery Map
});
export type MasteryProgressSummary = z.infer<typeof MasteryProgressSummarySchema>;

// ─── Game Progress Summary ────────────────────────────────────────────────────
// The student's world/economy state at report time.
// Shown separately from mastery — parents can see both without conflating them.
// Grounded in: ADR-011 (reward economy), MASTER_HANDOFF §8.2 (Living Academy Engine)

export const GameProgressSummarySchema = z.object({
  house: z.string(),                            // House name
  companionName: z.string(),
  companionBondLevel: z.number().int().nonnegative(),
  moolahBalance: z.number().int().nonnegative(),
  totalXp: z.number().int().nonnegative(),
  badgesEarned: z.array(z.string()),            // badge IDs
  missionsCompleted: z.number().int().nonnegative(),
  missionsAttempted: z.number().int().nonnegative(),
  academyUnlocksContributed: z.number().int().nonnegative(),
});
export type GameProgressSummary = z.infer<typeof GameProgressSummarySchema>;

// ─── Next Mission Recommendation ─────────────────────────────────────────────
// The system recommends what comes next; parent approves based on their mode.
// (ADR-017: system recommends, parent governs, student chooses within boundaries)

export const NextMissionRecommendationSchema = z.object({
  summary: z.string(),
  rationale: z.string(), // must reference learner model + parent intent — not generic
  targetMasterySkillId: z.string(),
  targetMasteryDomainId: z.string(),
  suggestedDeliveryMode: z.enum(["3d", "interactive-lite", "text-audio-offline"]),
});
export type NextMissionRecommendation = z.infer<typeof NextMissionRecommendationSchema>;

// ─── Parent Report ────────────────────────────────────────────────────────────
// The primary parent-facing document. Supports multiple report types;
// the Unified First Learning Map is the mandatory output of Mission 001.
//
// Privacy invariants are z.literal(true): reports never contain biometric
// or webcam-sourced content. (MASTER_HANDOFF §9.2)
// Maps to: parent_reports table

export const ParentReportTypeSchema = z.enum([
  "unified-first-learning-map", // output of Mission 001 (MASTER_HANDOFF §5.1)
  "weekly-summary",
  "mission-completion",
  "portfolio",
]);
export type ParentReportType = z.infer<typeof ParentReportTypeSchema>;

export const ParentReportSchema = z.object({
  id: z.string().uuid(),
  childProfileId: z.string().uuid(),
  reportType: ParentReportTypeSchema,
  generatedAt: z.string().datetime(),

  // Academic proof (the core of every report)
  masteryProgress: z.array(MasteryProgressSummarySchema),

  // Learner calibration — present on mission-001 and first-7-14-days reports
  calibrationScore: LearnerCalibrationScoreSchema.optional(),

  // Evidence highlights — require parent consent before inclusion
  evidenceHighlights: z.array(EvidenceHighlightSchema),

  // Game/world progress — always shown separately from mastery (ADR-011)
  gameProgress: GameProgressSummarySchema.optional(),

  // System's next-path recommendation
  nextMissionRecommendation: NextMissionRecommendationSchema.optional(),

  // Privacy invariants (MASTER_HANDOFF §9.2; ADR-026)
  noWebcamContent: z.literal(true),
  noFaceCaptureContent: z.literal(true),
});
export type ParentReport = z.infer<typeof ParentReportSchema>;

// ─── Parent Visibility Mode (ADR-008) ─────────────────────────────────────────
// Controls how much detail is shown in reports by default.
// Safety override is always available regardless of mode.

export const ParentVisibilityModeSchema = z.enum([
  "full",            // K-5 default: all detail visible
  "summary",         // grades 6-8 default: summary with expand-on-demand
  "safety-override", // always available; overrides summary mode for flagged content
]);
export type ParentVisibilityMode = z.infer<typeof ParentVisibilityModeSchema>;
