/**
 * Calibration Contract
 *
 * Learner calibration signals — the structured behavioral dimensions that
 * Mission 001 (Repair the Sorting Computer) is designed to measure.
 *
 * Calibration signals describe what the system WILL capture, not what it
 * HAS captured. They are produced by the Mission Compiler alongside the
 * mission output, and consumed by the learner model pipeline to update
 * the learner profile confidence level (40-55% → 60-75% after Mission 001).
 *
 * Grounded in: architecture.md §9 (Learner Calibration Model),
 * CONTEXT.md §6 Decision 27 (First Mission = Calibration Mission),
 * evidence.schema.ts (EvidenceCaptureTypeSchema).
 */

import { z } from "zod";

// ─── Calibration Signal Type ──────────────────────────────────────────────────
// The six dimensions measured by Mission 001.

export const CalibrationSignalTypeSchema = z.enum([
  "reading-vs-listening",       // whether student activates audio vs. reads independently
  "cognitive-load",             // time-on-task + hint usage = chunk size signal
  "ai-readiness",               // engagement with companion dialogue and AI prompts
  "persistence",                // retry-after-failure vs. help-seeking behavior
  "delivery-mode-preference",   // which of the three delivery modes the student chooses
  "hint-frequency",             // how often the student requests companion hints
]);
export type CalibrationSignalType = z.infer<typeof CalibrationSignalTypeSchema>;

// ─── Evidence Capture Type (calibration subset) ───────────────────────────────
// Evidence capture types that generate calibration signals in Mission 001.
// Subset of EvidenceCaptureTypeSchema — only the types relevant to calibration.

export const CalibrationEvidenceCaptureTypeSchema = z.enum([
  "decision-log",
  "sequence-completion",
  "ai-mistake-check",
  "explanation",
  "reflection",
  "structured-replay",
]);
export type CalibrationEvidenceCaptureType = z.infer<typeof CalibrationEvidenceCaptureTypeSchema>;

// ─── Calibration Signal ───────────────────────────────────────────────────────
// One calibration dimension produced by the Mission Compiler.
// The learner model consumes these alongside the mission output to know
// which signals to look for in the resulting interaction data.

export const CalibrationSignalSchema = z.object({
  signalType: CalibrationSignalTypeSchema,
  description: z.string(),
  sourceMissionTaskId: z.string().nullable(),
  evidenceCaptureType: CalibrationEvidenceCaptureTypeSchema.nullable(),
});
export type CalibrationSignal = z.infer<typeof CalibrationSignalSchema>;
