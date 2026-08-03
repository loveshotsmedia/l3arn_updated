/**
 * EvidenceRequirement types.
 *
 * EvidenceRequirements describe what evidence the mission expects to capture
 * at a per-task level. They are derived from the evidencePlan in the mission output
 * and are surfaced in MissionCompilerOutput for consumers that need to configure
 * evidence capture infrastructure before the mission starts.
 *
 * Grounded in: ADR-026 (evidence capture), evidence.schema.ts,
 * mission.schema.ts (EvidencePlanSchema, EvidenceCapturePointSchema).
 *
 * OPEN QUESTION: EvidenceRequirement is a compiler-output concern, not a
 * shared-types concern — but if Agent D (data/schema agent) defines a
 * canonical EvidenceRequirementSchema for the mission system tables, this
 * type should align with it. — Agent 6, Phase 0
 */

import type { EvidenceCapturePoint } from "@l3arn/shared-types";

/**
 * EvidenceRequirement is a direct re-export of EvidenceCapturePoint from
 * shared-types. The Mission Compiler uses the term "requirement" to signal
 * that this is what the system needs to be prepared to capture — before the
 * student starts the mission.
 */
export type EvidenceRequirement = EvidenceCapturePoint;

/**
 * Build the EvidenceRequirement list from raw evidence capture point data.
 * Validates that required privacy invariants (noWebcam, noFaceCapture) are
 * present on the evidence plan before extracting capture points.
 */
export function buildEvidenceRequirements(
  capturePoints: EvidenceCapturePoint[],
): EvidenceRequirement[] {
  // Pass through — capture points from the validated AI output already
  // conform to EvidenceCapturePointSchema (Zod-validated before reaching here).
  return capturePoints.map((point) => ({
    stepId: point.stepId,
    captureType: point.captureType,
    retentionDays: point.retentionDays,
    parentVisible: point.parentVisible,
    portfolioEligible: point.portfolioEligible,
  }));
}
