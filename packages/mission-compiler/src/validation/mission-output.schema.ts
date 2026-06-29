/**
 * MissionOutputSchema — Zod validation schema for raw AI output from Mission 001.
 *
 * This schema validates what Claude returns. It MUST match exactly what the
 * mission-001.prompt.ts prompt template instructs Claude to produce.
 *
 * All core fields are required (no .optional() on mission-critical fields).
 * The MissionOutput type from @l3arn/shared-types is the canonical shape;
 * this Zod schema is the enforcement gate before data reaches consumers.
 *
 * Grounded in: ADR-054 (AI output validation), ADR-016 (mission output model),
 * mission.schema.ts (MissionOutputSchema in shared-types).
 *
 * OPEN QUESTION: Should the Zod schema here be the same object as MissionOutputSchema
 * from shared-types, or a strict subset? Currently duplicated with required fields
 * only to enforce AI output completeness — the shared-types schema has some
 * optional fields that are acceptable in DB records but not in raw AI output.
 * — Agent 6, Phase 0
 */

import { z } from "zod";

// ─── Sub-schemas: Companion Dialogue ──────────────────────────────────────────

const CompanionDialogueLineSchema = z.object({
  companionId: z.string().min(1),
  line: z.string().min(1),
  trigger: z.enum([
    "on-start",
    "on-hint-requested",
    "on-step-complete",
    "on-mistake",
    "on-mission-complete",
  ]),
});

// ─── Sub-schemas: Mission Task ────────────────────────────────────────────────

const MissionTaskSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  interactionType: z.enum([
    "click",
    "drag",
    "choice",
    "text-input",
    "observe",
    "sequence",
  ]),
  assetRefs: z.array(z.string()).optional(),
  isEvidenceCapturePoint: z.boolean(),
});

// ─── Sub-schemas: Standards Alignment ────────────────────────────────────────

const StandardsAlignmentSchema = z.object({
  masterySkillId: z.string().min(1),
  masteryDomainId: z.string().min(1),
  masteryObjective: z.string().min(1),
  floridaStandardCode: z.string().optional(),
  l3arnMasteryLevel: z.enum(["emerging", "developing", "proficient", "advanced"]),
  evidenceThreshold: z.string().min(1),
});

// ─── Output 1: Parent Plan ─────────────────────────────────────────────────────

const AIParentPlanSchema = z.object({
  objective: z.string().min(1),
  standardsAlignment: StandardsAlignmentSchema,
  materials: z.array(z.string()).min(0),
  steps: z.array(z.string()).min(1),
  safetyNotes: z.string().optional(),
  evidenceSummary: z.string().min(1),
  masteryThreshold: z.string().min(1),
  whyChosen: z.string().min(1),
});

// ─── Output 2: 3D Mission ─────────────────────────────────────────────────────

const AI3dMissionSchema = z.object({
  storyHook: z.string().min(1),
  worldRoomId: z.string().min(1),
  companionDialogue: z.array(CompanionDialogueLineSchema).min(1),
  tasks: z.array(MissionTaskSchema).min(1),
  rewardPreviewLabel: z.string().min(1),
});

// ─── Output 3: Interactive Lite ───────────────────────────────────────────────

const AILiteInteractionSchema = z.object({
  type: z.enum(["choice", "tap", "drag"]),
  prompt: z.string().min(1),
  options: z.array(z.string()).optional(),
});

const AILiteCardSchema = z.object({
  id: z.string().min(1),
  contentText: z.string().min(1),
  illustrationRef: z.string().optional(),
  audioRef: z.string().optional(),
  interactions: z.array(AILiteInteractionSchema).min(1),
});

const AIInteractiveLiteSchema = z.object({
  cards: z.array(AILiteCardSchema).min(1),
});

// ─── Output 4: Text / Audio / Offline ────────────────────────────────────────

const AITextAudioOfflineSchema = z.object({
  steps: z.array(z.string()).min(1),
  readAloudScript: z.string().optional(),
  printableTaskDescription: z.string().min(1),
  artifactUploadInstructions: z.string().optional(),
});

// ─── Output 5: Evidence Plan ──────────────────────────────────────────────────

const AIEvidenceCapturePointSchema = z.object({
  stepId: z.string().min(1),
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

const AIEvidencePlanSchema = z.object({
  capturePoints: z.array(AIEvidenceCapturePointSchema).min(1),
  // Privacy invariants — AI is instructed to always produce these as true.
  // The Zod schema enforces them at validation time; if AI returns false, validation fails.
  noWebcam: z.literal(true),
  noFaceCapture: z.literal(true),
});

// ─── Output 6: Reward Plan ────────────────────────────────────────────────────

const AIRewardPlanSchema = z.object({
  effortMoolah: z.number().int().nonnegative(),
  effortXp: z.number().int().nonnegative(),
  masteryMoolah: z.number().int().nonnegative().optional(),
  masteryXp: z.number().int().nonnegative().optional(),
  companionBondIncrease: z.number().int().nonnegative(),
  housePointsContribution: z.number().int().nonnegative(),
  badgeIds: z.array(z.string()).optional(),
  masteryGated: z.boolean(),
});

// ─── Full AI Mission Output (what Claude must return) ─────────────────────────
// All six outputs are required. If any are missing, validation fails and retry fires.

export const AIRawMissionOutputSchema = z.object({
  parentPlan: AIParentPlanSchema,
  student3dMission: AI3dMissionSchema,
  studentInteractiveLite: AIInteractiveLiteSchema,
  studentTextAudioOffline: AITextAudioOfflineSchema,
  evidencePlan: AIEvidencePlanSchema,
  rewardPlan: AIRewardPlanSchema,
});

export type AIRawMissionOutput = z.infer<typeof AIRawMissionOutputSchema>;
