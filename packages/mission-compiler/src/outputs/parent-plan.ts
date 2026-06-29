/**
 * ParentPlanOutput types and builder.
 *
 * The parent plan explains what the mission teaches, how it aligns to standards,
 * what materials are needed, and why this mission was chosen for this child.
 *
 * Grounded in: ADR-016 (mission output model), mission.schema.ts (ParentPlanSchema).
 */

import type { ParentPlan, StandardsAlignment } from "@l3arn/shared-types";

/**
 * ParentPlanOutput re-exports the canonical ParentPlan type from shared-types.
 * Use this type in the MissionCompilerOutput interface so the compiler output
 * uses the same shape as the shared contract.
 */
export type ParentPlanOutput = ParentPlan;

/**
 * Build a ParentPlanOutput from the raw AI-validated parent plan fields.
 * This builder normalises the output and ensures the standardsAlignment
 * conforms to the shared StandardsAlignment type.
 */
export function buildParentPlanOutput(raw: {
  objective: string;
  standardsAlignment: StandardsAlignment;
  materials: string[];
  steps: string[];
  safetyNotes?: string;
  evidenceSummary: string;
  masteryThreshold: string;
  whyChosen: string;
}): ParentPlanOutput {
  return {
    objective: raw.objective,
    standardsAlignment: raw.standardsAlignment,
    materials: raw.materials,
    steps: raw.steps,
    safetyNotes: raw.safetyNotes,
    evidenceSummary: raw.evidenceSummary,
    masteryThreshold: raw.masteryThreshold,
    whyChosen: raw.whyChosen,
  };
}
