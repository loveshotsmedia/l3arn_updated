/**
 * Mission 001 calibration signal builder.
 *
 * CalibrationSignal is defined canonically in @l3arn/shared-types.
 * This module re-exports the type and provides the Mission 001 builder function.
 *
 * Grounded in: architecture.md §9, evidence.schema.ts, calibration.schema.ts.
 */

import { CalibrationSignal } from "@l3arn/shared-types";

export type { CalibrationSignal };

/**
 * Build the fixed set of calibration signals for Mission 001.
 * These signals describe what the system WILL measure — not what it has captured.
 *
 * @param hasAudioEnabled - whether the child has audio enabled in their permissions
 */
export function buildMission001CalibrationSignals(
  hasAudioEnabled: boolean,
): CalibrationSignal[] {
  const signals: CalibrationSignal[] = [
    {
      signalType: "cognitive-load",
      description:
        "Measures how long the student spends on each task and whether they request hints, " +
        "indicating the appropriate instruction chunk size and scaffolding level.",
      sourceMissionTaskId: "task-sort-red",
      evidenceCaptureType: "sequence-completion",
    },
    {
      signalType: "ai-readiness",
      description:
        "Measures whether the student engages with companion dialogue, " +
        "responds to AI prompts, and is comfortable interacting with the AI companion.",
      sourceMissionTaskId: "task-explain-rule",
      evidenceCaptureType: "decision-log",
    },
    {
      signalType: "persistence",
      description:
        "Measures whether the student retries after mistakes rather than requesting help " +
        "or abandoning, indicating frustration tolerance and self-directed learning readiness.",
      sourceMissionTaskId: null,
      evidenceCaptureType: "structured-replay",
    },
    {
      signalType: "delivery-mode-preference",
      description:
        "Mission 001 offers all three delivery modes; which mode the student chooses " +
        "provides a baseline delivery mode preference signal.",
      sourceMissionTaskId: null,
      evidenceCaptureType: null,
    },
    {
      signalType: "hint-frequency",
      description:
        "How often the student requests hints from the companion during the mission, " +
        "calibrating the appropriate hint frequency for future missions.",
      sourceMissionTaskId: null,
      evidenceCaptureType: "decision-log",
    },
  ];

  if (hasAudioEnabled) {
    signals.push({
      signalType: "reading-vs-listening",
      description:
        "If audio is enabled, measures whether the student activates read-aloud prompts " +
        "or prefers reading text independently, calibrating audio support preference.",
      sourceMissionTaskId: null,
      evidenceCaptureType: null,
    });
  }

  return signals;
}
