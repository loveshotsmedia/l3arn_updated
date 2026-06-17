/**
 * Mission Contract — Foundation
 *
 * Covers the three-part constraint, all six mission output types,
 * and mission attempt records.
 *
 * Grounded in: ADR-014 (mission compiler constraint), ADR-015 (conflict resolution),
 * ADR-016 (mission output model), ADR-017 (delivery mode control),
 * ADR-010 (academic progress), ADR-011 (reward economy), ADR-026 (evidence capture),
 * architecture.md §6 (Mission Compiler Architecture).
 */

import { z } from "zod";
import {
  ApprovalModeSchema,
  DeliveryModeSchema,
  GradeSchema,
  HouseSchema,
} from "./identity.schema";

// ─── Mastery Levels ───────────────────────────────────────────────────────────

export const MasteryLevelSchema = z.enum([
  "emerging",
  "developing",
  "proficient",
  "advanced",
]);
export type MasteryLevel = z.infer<typeof MasteryLevelSchema>;

// ─── Three-Part Mission Constraint (ADR-014) ──────────────────────────────────
// Every mission must satisfy ALL THREE dimensions.
// Conflict resolution order defined in ADR-015; the Compiler applies it — the
// output schema represents the result after conflicts have been resolved.

// Dimension 1: Parent Intent
export const ParentIntentSchema = z.object({
  approvalMode: ApprovalModeSchema,
  emphasizeTopics: z.array(z.string()).default([]),
  blockedTopics: z.array(z.string()).default([]),
  preferredDeliveryModes: z.array(DeliveryModeSchema).optional(),
  customInstructions: z.string().max(1000).optional(),
});
export type ParentIntent = z.infer<typeof ParentIntentSchema>;

// Dimension 2: Standards / Mastery Alignment (ADR-013, ADR-014)
// Every instructional mission must be traceable to a mastery objective and,
// where applicable, a Florida CPALMS standard code.
export const StandardsAlignmentSchema = z.object({
  masterySkillId: z.string(),
  masteryDomainId: z.string(),
  masteryObjective: z.string(),
  floridaStandardCode: z.string().optional(), // e.g. "LAFS.3.RI.1.1"; optional for non-FL families
  l3arnMasteryLevel: MasteryLevelSchema,
  evidenceThreshold: z.string(),              // human-readable mastery bar description
});
export type StandardsAlignment = z.infer<typeof StandardsAlignmentSchema>;

// Dimension 3: Child Personalization
export const ChildPersonalizationSchema = z.object({
  childProfileId: z.string().uuid(),
  grade: GradeSchema,
  preferredDeliveryMode: DeliveryModeSchema,
  instructionChunkSize: z.enum(["short", "medium", "long"]),
  hintFrequency: z.enum(["high", "medium", "low"]),
  interests: z.array(z.string()),
  house: HouseSchema,
  companionId: z.string().uuid().optional(),
  accessibilityFlags: z.object({
    audioSupport: z.boolean(),
    visualSupport: z.boolean(),
    lowTextMode: z.boolean(),
    parentReadAloud: z.boolean(),
  }),
});
export type ChildPersonalization = z.infer<typeof ChildPersonalizationSchema>;

// ─── Mission Output Types (ADR-016) ──────────────────────────────────────────
// All six output types are always compiled; the consumer renders the
// appropriate one based on delivery mode and parent/student settings.

// Output 1: Parent Plan
export const ParentPlanSchema = z.object({
  objective: z.string(),
  standardsAlignment: StandardsAlignmentSchema,
  materials: z.array(z.string()),
  steps: z.array(z.string()),
  safetyNotes: z.string().optional(),
  evidenceSummary: z.string(),
  masteryThreshold: z.string(),
  whyChosen: z.string(), // explains how personalization + alignment produced this mission
});
export type ParentPlan = z.infer<typeof ParentPlanSchema>;

// Output 2: 3D Mission
export const CompanionDialogueLineSchema = z.object({
  companionId: z.string(),
  line: z.string(),
  trigger: z.enum([
    "on-start",
    "on-hint-requested",
    "on-step-complete",
    "on-mistake",
    "on-mission-complete",
  ]),
});
export type CompanionDialogueLine = z.infer<typeof CompanionDialogueLineSchema>;

export const MissionTaskSchema = z.object({
  id: z.string(),
  description: z.string(),
  interactionType: z.enum(["click", "drag", "choice", "text-input", "observe", "sequence"]),
  assetRefs: z.array(z.string()).optional(),
  isEvidenceCapturePoint: z.boolean(),
});
export type MissionTask = z.infer<typeof MissionTaskSchema>;

export const Student3dMissionSchema = z.object({
  storyHook: z.string(),
  worldRoomId: z.string(),           // maps to a room in the Core Academy Map (ADR-018)
  companionDialogue: z.array(CompanionDialogueLineSchema),
  tasks: z.array(MissionTaskSchema).min(1),
  rewardPreviewLabel: z.string(),    // what the student sees they'll earn before starting
});
export type Student3dMission = z.infer<typeof Student3dMissionSchema>;

// Output 3: Interactive Lite (cards/illustrations; lower-stimulation mode)
export const LiteInteractionSchema = z.object({
  type: z.enum(["choice", "tap", "drag"]),
  prompt: z.string(),
  options: z.array(z.string()).optional(),
});
export type LiteInteraction = z.infer<typeof LiteInteractionSchema>;

export const LiteCardSchema = z.object({
  id: z.string(),
  contentText: z.string(),
  illustrationRef: z.string().optional(),
  audioRef: z.string().optional(), // parent-controlled audio (ADR-027)
  interactions: z.array(LiteInteractionSchema),
});
export type LiteCard = z.infer<typeof LiteCardSchema>;

export const StudentInteractiveLiteSchema = z.object({
  cards: z.array(LiteCardSchema).min(1),
});
export type StudentInteractiveLite = z.infer<typeof StudentInteractiveLiteSchema>;

// Output 4: Text / Audio / Offline
export const StudentTextAudioOfflineSchema = z.object({
  steps: z.array(z.string()).min(1),
  readAloudScript: z.string().optional(),
  printableTaskDescription: z.string(),
  artifactUploadInstructions: z.string().optional(),
});
export type StudentTextAudioOffline = z.infer<typeof StudentTextAudioOfflineSchema>;

// Output 5: Evidence Plan
// noWebcam and noFaceCapture are z.literal(true) to enforce privacy rules at the
// type level. Passing false is a compile error. (ADR-026, MASTER_HANDOFF §9.2)
export const EvidenceCapturePointSchema = z.object({
  stepId: z.string(),
  captureType: z.enum([
    "decision-log",
    "sequence-completion",
    "ai-mistake-check",
    "explanation",
    "reflection",
    "artifact-upload",
    "structured-replay",
  ]),
  retentionDays: z.number().int().positive(),
  parentVisible: z.boolean(),
  portfolioEligible: z.boolean(),
});
export type EvidenceCapturePoint = z.infer<typeof EvidenceCapturePointSchema>;

export const EvidencePlanSchema = z.object({
  capturePoints: z.array(EvidenceCapturePointSchema).min(1),
  noWebcam: z.literal(true),      // compile-time privacy invariant; never set to false
  noFaceCapture: z.literal(true), // compile-time privacy invariant; never set to false
});
export type EvidencePlan = z.infer<typeof EvidencePlanSchema>;

// Output 6: Reward Plan
// Effort rewards are unconditional. Mastery rewards are gated on evidence. (ADR-011)
export const RewardPlanSchema = z.object({
  effortMoolah: z.number().int().nonnegative(),
  effortXp: z.number().int().nonnegative(),
  masteryMoolah: z.number().int().nonnegative().optional(),  // awarded only if masteryAchieved
  masteryXp: z.number().int().nonnegative().optional(),      // awarded only if masteryAchieved
  companionBondIncrease: z.number().int().nonnegative(),
  housePointsContribution: z.number().int().nonnegative(),
  badgeIds: z.array(z.string()).optional(),
  masteryGated: z.boolean(), // true = major progression (companion evolution, room unlock) requires mastery evidence
});
export type RewardPlan = z.infer<typeof RewardPlanSchema>;

// ─── Full Mission Output (ADR-016) ───────────────────────────────────────────
// All six outputs are always present. Consumers render based on delivery mode.

export const MissionOutputSchema = z.object({
  parentPlan: ParentPlanSchema,
  student3dMission: Student3dMissionSchema,
  studentInteractiveLite: StudentInteractiveLiteSchema,
  studentTextAudioOffline: StudentTextAudioOfflineSchema,
  evidencePlan: EvidencePlanSchema,
  rewardPlan: RewardPlanSchema,
});
export type MissionOutput = z.infer<typeof MissionOutputSchema>;

// ─── Mission Status ───────────────────────────────────────────────────────────

export const MissionStatusSchema = z.enum([
  "draft",      // compiled but not yet approved
  "pending-approval", // awaiting parent approval in high-control mode (ADR-012)
  "active",     // approved and available to student
  "completed",
  "archived",
]);
export type MissionStatus = z.infer<typeof MissionStatusSchema>;

// ─── Mission Record ───────────────────────────────────────────────────────────
// Maps to: missions + mission_versions + mission_outputs tables (architecture.md §8)

export const MissionSchema = z.object({
  id: z.string().uuid(),
  childProfileId: z.string().uuid(),
  version: z.number().int().positive(),
  status: MissionStatusSchema,

  // The three constraint dimensions (ADR-014)
  parentIntent: ParentIntentSchema,
  childPersonalization: ChildPersonalizationSchema,
  standardsAlignment: StandardsAlignmentSchema,

  output: MissionOutputSchema,

  compiledAt: z.string().datetime(),
  approvedByParentAt: z.string().datetime().optional(), // required in high-control mode
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
});
export type Mission = z.infer<typeof MissionSchema>;

// ─── Mission Attempt ──────────────────────────────────────────────────────────
// One student run through a mission. A mission may have multiple attempts.
// Maps to: mission_attempts table

export const MissionAttemptSchema = z.object({
  id: z.string().uuid(),
  missionId: z.string().uuid(),
  childProfileId: z.string().uuid(),
  childSessionId: z.string().uuid(),
  deliveryMode: DeliveryModeSchema,
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  masteryEvidenceScore: z.number().min(0).max(1).optional(), // 0.0–1.0
  masteryAchieved: z.boolean().optional(),                   // set after evidence evaluation
});
export type MissionAttempt = z.infer<typeof MissionAttemptSchema>;
