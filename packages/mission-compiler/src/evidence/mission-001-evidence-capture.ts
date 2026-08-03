/**
 * Mission 001 — Evidence Capture Spec
 *
 * Static specification of the evidence capture plan for every Mission 001 task
 * (Repair the Sorting Computer + Calibrate the Learner Core).
 *
 * This is PURE TYPED DATA — no AI calls, no async, no side effects.
 * It describes what the mission intends to capture at each task, for whom,
 * and under what consent requirements.
 *
 * Evidence capture types map to EvidenceCaptureTypeSchema from @l3arn/shared-types.
 * masterySkillTarget values are the canonical skill keys seeded in Migration 002
 * (mastery_skills.code, stored as DB-uppercase equivalents). The Mission Compiler
 * resolves these canonical keys to mastery_skill UUIDs at runtime.
 *
 * Privacy invariants (ADR-026, ADR-027):
 *   - No webcam, no face capture, no always-on audio capture
 *   - Audio response tasks require consentRequired: true
 *     (parent must have audio-push-to-talk consent active)
 *   - All items with consentRequired: true are gated by child_permissions.audio_enabled
 *     at the application layer before capture is attempted
 *
 * Grounded in:
 *   - sprint_map.md Mission 001 spec (tasks, evidence, calibration signals)
 *   - calibration-signals.ts (task IDs: task-sort-red, task-explain-rule)
 *   - architecture.md §8 (Evidence/Reports domain)
 *   - ADR-026 (evidence capture)
 *   - ADR-027 (audio: push-to-talk only)
 *   - evidence-requirements.ts (EvidenceCapturePoint)
 *   - OQ-A10-003 resolved: canonical skill keys confirmed from curriculum seed data (Migration 002)
 */

import type { EvidenceCaptureType } from "@l3arn/shared-types";

// ─── Canonical Skill Keys (OQ-A10-003 resolved) ──────────────────────────────
//
// These are the 5 canonical masterySkillTarget keys for Mission 001.
// Seeded in Migration 002 (mastery_skills). Any masterySkillTarget value in
// MISSION_001_EVIDENCE_SPEC that is not in this list is a TypeScript compile error.
//
// The Mission Compiler resolves these keys to mastery_skill UUIDs at runtime
// via: SELECT id FROM mastery_skills WHERE code = <DB_UPPERCASE_EQUIVALENT>
// ─────────────────────────────────────────────────────────────────────────────

export const MISSION_001_REQUIRED_SKILL_KEYS = [
  'ai_literacy.verify_ai_output',
  'logic.sequence_steps',
  'comprehension.follow_multistep_instructions',
  'reasoning.use_evidence_to_decide',
  'learner.calibration_initial_profile',
] as const;

export type Mission001SkillKey = typeof MISSION_001_REQUIRED_SKILL_KEYS[number];

// ─── Mission001EvidenceSpec ───────────────────────────────────────────────────

/**
 * Evidence capture specification for one Mission 001 task.
 *
 * Each field:
 *   taskId            — matches task IDs used in calibration-signals.ts and mission steps
 *   taskName          — human-readable task name for parent reports and admin tooling
 *   evidenceCaptureType — the capture type (matches EvidenceCaptureTypeSchema)
 *   masterySkillTarget  — canonical Mission001SkillKey (resolved to mastery_skill UUID at runtime)
 *   parentVisible     — whether this evidence item appears in parent reports
 *   consentRequired   — true = audio-push-to-talk parent consent required before capture
 *   retentionDays     — data retention:
 *                         0 = session only (not persisted after session ends)
 *                         365 = 1 year
 *                        -1 = permanent (portfolio anchor; parent-consented only)
 */
export interface Mission001EvidenceSpec {
  taskId: string;
  taskName: string;
  evidenceCaptureType: EvidenceCaptureType;
  masterySkillTarget: Mission001SkillKey;
  parentVisible: boolean;
  consentRequired: boolean;
  retentionDays: number;
}

// ─── Mission 001 Task Evidence Spec Array ────────────────────────────────────
//
// Task IDs align with:
//   - calibration-signals.ts (task-sort-red, task-explain-rule)
//   - mission_steps in the mission output (from mission-001.prompt.ts)
//   - sprint_map.md evidence list: decision logs, completed sequence,
//     ai-mistake check, explanation/reflection, optional audio response,
//     structured replay/screenshot
//
// masterySkillTarget values are the 5 canonical skill keys resolved by OQ-A10-003
// and seeded in Migration 002 (mastery_skills). The Mission Compiler resolves
// these keys to mastery_skill UUIDs at runtime before writing mastery_records rows.
//
// Canonical keys (OQ-A10-003 resolved):
//   ai_literacy.verify_ai_output           — AI Literacy domain
//   logic.sequence_steps                   — Logic / Sequencing domain
//   comprehension.follow_multistep_instructions — Reading/Listening domain
//   reasoning.use_evidence_to_decide       — Evidence-Based Reasoning domain
//   learner.calibration_initial_profile    — Learner Calibration domain
// ─────────────────────────────────────────────────────────────────────────────

export const MISSION_001_EVIDENCE_SPEC: Mission001EvidenceSpec[] = [
  // ── Task: Sort by one attribute (the core sorting sequence) ────────────────
  //   Mapping: sequencing the repair steps demonstrates ordered-step logic.
  //   → logic.sequence_steps (closest canonical key for step-ordering task)
  {
    taskId: "task-sort-red",
    taskName: "Sort by One Attribute",
    evidenceCaptureType: "sequence-completion",
    masterySkillTarget: "logic.sequence_steps",  // canonical key ✓ (OQ-A10-003)
    parentVisible: true,
    consentRequired: false,
    retentionDays: 365,
  },

  // ── Task: Identify an AI mistake in the sorting output ─────────────────────
  //   Mapping: core AI error detection — student identifies when AI output is wrong.
  //   → ai_literacy.verify_ai_output (direct canonical match)
  {
    taskId: "task-ai-mistake-check",
    taskName: "Identify the AI Mistake",
    evidenceCaptureType: "ai-mistake-check",
    masterySkillTarget: "ai_literacy.verify_ai_output",  // canonical key ✓ (OQ-A10-003)
    parentVisible: true,
    consentRequired: false,
    retentionDays: 365,
  },

  // ── Task: Explain the sorting rule in their own words ──────────────────────
  //   Calibration source: task-explain-rule (ai-readiness signal)
  //   Mapping: student follows and executes the multi-step rule explanation task.
  //   → comprehension.follow_multistep_instructions (canonical match for explanation/instruction tasks)
  {
    taskId: "task-explain-rule",
    taskName: "Explain the Sorting Rule",
    evidenceCaptureType: "explanation",
    masterySkillTarget: "comprehension.follow_multistep_instructions",  // canonical key ✓ (OQ-A10-003)
    parentVisible: true,
    consentRequired: false,
    retentionDays: 365,
  },

  // ── Task: Decision logging throughout the mission ──────────────────────────
  //   Captures every choice the student makes (which item to sort, when to
  //   request a hint, how to respond to the companion). Used for:
  //     - calibration: ai-readiness, hint-frequency signals
  //     - mastery: evidence-use vs guessing (student uses task context to decide)
  //   Mapping: decision log measures whether student uses available evidence.
  //   → reasoning.use_evidence_to_decide (canonical match for evidence-based choices)
  {
    taskId: "task-decision-log",
    taskName: "In-Mission Decision Choices",
    evidenceCaptureType: "decision-log",
    masterySkillTarget: "reasoning.use_evidence_to_decide",  // canonical key ✓ (OQ-A10-003)
    parentVisible: true,
    consentRequired: false,
    retentionDays: 365,
  },

  // ── Task: Post-mission reflection prompt ───────────────────────────────────
  //   Student reflects on what they learned about AI mistakes.
  //   Parent-visible, portfolio-eligible if parent consents.
  //   Mapping: reflection on AI limitations — primary AI literacy signal.
  //   → ai_literacy.verify_ai_output (reflection deepens the same skill demonstrated in task-ai-mistake-check)
  {
    taskId: "task-reflection",
    taskName: "Mission Reflection",
    evidenceCaptureType: "reflection",
    masterySkillTarget: "ai_literacy.verify_ai_output",  // canonical key ✓ (OQ-A10-003; reflection reinforces AI error detection)
    parentVisible: true,
    consentRequired: false,
    retentionDays: 365,
  },

  // ── Task: Optional audio response (push-to-talk only) ─────────────────────
  //   Only available when parent has granted audio-push-to-talk consent
  //   (child_permissions.audio_enabled = true).
  //   Application layer MUST check audio_enabled before initiating capture.
  //   consentRequired: true enforces this gate via Mission001EvidenceSpec.
  //   Mapping: audio explanation of sorting rule → comprehension/instruction following.
  //   → comprehension.follow_multistep_instructions (audio variant of task-explain-rule)
  {
    taskId: "task-audio-response",
    taskName: "Audio Explanation Response (Push-to-Talk)",
    evidenceCaptureType: "audio-response",
    masterySkillTarget: "comprehension.follow_multistep_instructions",  // canonical key ✓ (OQ-A10-003; audio variant of explain-rule)
    parentVisible: true,
    consentRequired: true, // ADR-027: parent audio-push-to-talk consent required
    retentionDays: 90,     // Shorter retention for audio artifacts
  },

  // ── Task: Structured replay of the full mission interaction ───────────────
  //   System-generated from mission step events.
  //   Used for: persistence calibration signal (retry-after-mistake behavior)
  //   Not surfaced in parent reports directly; feeds the learner model pipeline.
  //   Mapping: full-mission replay captures initial learner calibration signals.
  //   → learner.calibration_initial_profile (canonical key for calibration capture)
  {
    taskId: "task-structured-replay",
    taskName: "Mission Interaction Replay",
    evidenceCaptureType: "structured-replay",
    masterySkillTarget: "learner.calibration_initial_profile",  // canonical key ✓ (OQ-A10-003; calibration signal)
    parentVisible: false, // Internal diagnostic; not shown directly in parent report
    consentRequired: false,
    retentionDays: 90,
  },

  // ── Task: Screenshot of the final sorted state ────────────────────────────
  //   3D scene screenshot showing the sorted output.
  //   No face data, no webcam — scene rendering only (ADR-026).
  //   Portfolio-eligible if parent consents (parent_consented_highlight).
  //   Mapping: screenshot evidences completed sequence (step ordering visible in output).
  //   → logic.sequence_steps (screenshot is the artifact of the completed sort sequence)
  {
    taskId: "task-screenshot",
    taskName: "Final Sorted State Screenshot",
    evidenceCaptureType: "screenshot",
    masterySkillTarget: "logic.sequence_steps",  // canonical key ✓ (OQ-A10-003; completed sequence artifact)
    parentVisible: true,
    consentRequired: false,
    retentionDays: 365,
  },
];

// ─── Compile-time canonical key check ────────────────────────────────────────
// If any spec entry's masterySkillTarget is not a Mission001SkillKey, this
// type resolves to `false` and the assignment below becomes a TypeScript error.
// Non-canonical keys are caught at build time, not runtime.
type _CanonicalCheck = (typeof MISSION_001_EVIDENCE_SPEC[number]['masterySkillTarget']) extends Mission001SkillKey ? true : false;
// If this line errors ("Type 'false' is not assignable to type 'true'"),
// a masterySkillTarget in the spec above uses a non-canonical key.
const _canonicalCheckPasses: _CanonicalCheck = true;
void _canonicalCheckPasses; // suppress unused-variable warning

// ─── Accessor helpers ─────────────────────────────────────────────────────────

/**
 * Get all evidence spec items for tasks that require parent consent
 * (audio-response items that require audio_enabled = true).
 *
 * The application must check child_permissions.audio_enabled before
 * initiating capture for any item returned by this function.
 */
export function getConsentRequiredEvidence(): Mission001EvidenceSpec[] {
  return MISSION_001_EVIDENCE_SPEC.filter((spec) => spec.consentRequired);
}

/**
 * Get all evidence spec items that are parent-visible.
 * These items will be surfaced in parent reports if captured.
 */
export function getParentVisibleEvidence(): Mission001EvidenceSpec[] {
  return MISSION_001_EVIDENCE_SPEC.filter((spec) => spec.parentVisible);
}

/**
 * Get the evidence spec for a specific task ID.
 * Returns undefined if no spec exists for that taskId.
 */
export function getEvidenceSpecForTask(
  taskId: string,
): Mission001EvidenceSpec | undefined {
  return MISSION_001_EVIDENCE_SPEC.find((spec) => spec.taskId === taskId);
}
