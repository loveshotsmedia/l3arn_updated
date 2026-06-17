/**
 * CalibrationSignal types and builder.
 *
 * Mission 001 is the "Learner Calibration" mission — it is specifically designed
 * to gather calibration signals that move the learner profile confidence from
 * 40-55% (post Sorting Ceremony) to 60-75% (post Mission 001).
 *
 * Calibration signals are NOT AI-generated output — they are defined by the
 * Mission Compiler based on which tasks and evidence capture points are included
 * in the mission. They describe what the system WILL capture, not what it HAS captured.
 *
 * Grounded in: architecture.md §9 (Learner Calibration Model),
 * CONTEXT.md §6 Decision 27 (First Mission),
 * evidence.schema.ts (EvidenceCaptureTypeSchema).
 *
 * OPEN QUESTION: CalibrationSignal is not yet defined in shared-types. If the
 * learner-model agent (Agent D or equivalent) defines a canonical
 * CalibrationSignalSchema in shared-types, this file should import from there
 * instead of defining its own type. — Agent 6, Phase 0
 */

/**
 * A CalibrationSignal describes one dimension of learner behavior that
 * Mission 001 is designed to measure.
 *
 * TODO: When learner-profile schema is added to shared-types, align this
 * type with the canonical CalibrationEventSchema or CalibrationSignalSchema.
 */
export interface CalibrationSignal {
  /** Unique identifier for this signal type */
  signalType:
    | "reading-vs-listening"
    | "cognitive-load"
    | "ai-readiness"
    | "persistence"
    | "delivery-mode-preference"
    | "hint-frequency";

  /** Human-readable description of what is being calibrated */
  description: string;

  /** Which task or evidence capture point in the mission generates this signal */
  sourceMissionTaskId: string | null;

  /** Which evidence capture type generates this signal */
  evidenceCaptureType:
    | "decision-log"
    | "sequence-completion"
    | "ai-mistake-check"
    | "explanation"
    | "reflection"
    | "structured-replay"
    | null;
}

/**
 * Build the calibration signals for Mission 001.
 * These signals are fixed for Mission 001 — they represent the calibration
 * dimensions that every first-time learner provides data on.
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
