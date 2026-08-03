/**
 * Calibration Engine — computes learner calibration confidence from available signals.
 *
 * Reads two signal sources (in priority order):
 *   1. house_calling_signals — trait scores from The House Calling Trial
 *   2. learning_evidence_events — structured interaction events from Mission 001
 *
 * Calibration stages (architecture.md §9):
 *   onboarding        → 0.20–0.35 (parent onboarding only; neither source present)
 *   sorting-ceremony  → 0.40–0.55 (house_calling_signals found; no evidence yet)
 *   mission-001       → 0.60–0.75 (learning_evidence_events found; adds to signals)
 *   days-7-14         → 0.80–0.90 (future phase; not computed here)
 *
 * Confidence is computed as:
 *   baseScore + trait-completeness bonus (sorting-ceremony only) + evidence bonuses
 *
 * Grounded in: architecture.md §9 (Learner Calibration Model),
 *   packages/shared-types/src/calibration.schema.ts (CalibrationSignalTypeSchema),
 *   Migration 010 (house_calling_signals), Migration 005 (learning_evidence_events).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CalibrationStage =
  | "onboarding"
  | "sorting-ceremony"
  | "mission-001"
  | "days-7-14";

/** Stage confidence ranges from architecture.md §9 */
const STAGE_RANGES: Record<CalibrationStage, [number, number]> = {
  "onboarding":       [0.20, 0.35],
  "sorting-ceremony": [0.40, 0.55],
  "mission-001":      [0.60, 0.75],
  "days-7-14":        [0.80, 0.90],
};

/** Evidence event types that contribute calibration signal bonuses */
const EVIDENCE_BONUSES: Record<string, number> = {
  "sequence-completion": 0.02,
  "ai-mistake-check":    0.03,
  "explanation":         0.03,
  "reflection":          0.02,
  "decision-log":        0.02,
  "structured-replay":   0.03,
};

/** Max bonus from evidence events: sum of all EVIDENCE_BONUSES = 0.15 */

/** Trait keys expected in house_calling_signals.trait_scores */
const EXPECTED_TRAITS = [
  "curiosity",
  "courage",
  "creativity",
  "leadership",
  "collaboration",
  "resilience",
  "independence",
] as const;

export interface CalibrationSnapshot {
  stage: CalibrationStage;
  confidenceScore: number;
  signalSources: string[];
  traitProfile: Record<string, number> | null;
  calibrationSignals: Record<string, unknown> | null;
}

// ── Internal query result types ────────────────────────────────────────────────

interface HouseCallingSignalRow {
  trait_scores: Record<string, number>;
}

interface EvidenceEventRow {
  event_type: string;
  content_json: Record<string, unknown> | null;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/** Clamp a value to [min, max] and round to 3 decimal places. */
function clamp(value: number, min: number, max: number): number {
  return Math.round(Math.min(Math.max(value, min), max) * 1000) / 1000;
}

const log = (level: string, msg: string, data?: object) =>
  console.log(
    JSON.stringify({
      level,
      system: "calibration-engine",
      msg,
      timestamp: new Date().toISOString(),
      ...data,
    }),
  );

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Compute a calibration confidence snapshot for a child.
 *
 * Queries house_calling_signals + learning_evidence_events to determine:
 *   - which calibration stage the child is in
 *   - a confidence score within that stage's range
 *   - structured calibration signal observations
 *
 * Non-throwing: errors are logged and result in a degraded (onboarding) score
 * rather than a 500. Callers should treat the result as best-effort.
 */
export async function computeCalibrationSnapshot(
  supabase: SupabaseClient,
  childProfileId: string,
  academyIdentityId: string | null,
): Promise<CalibrationSnapshot> {
  // ── Step 1: Query house_calling_signals ───────────────────────────────────

  let houseCallingRow: HouseCallingSignalRow | null = null;

  try {
    const { data, error } = await supabase
      .from("house_calling_signals")
      .select("trait_scores")
      .eq("child_profile_id", childProfileId)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      log("warn", "computeCalibrationSnapshot: house_calling_signals query failed", {
        childProfileId,
        dbError: error.message,
      });
    } else {
      houseCallingRow = data as HouseCallingSignalRow | null;
    }
  } catch (err) {
    log("warn", "computeCalibrationSnapshot: unexpected error querying house_calling_signals", {
      childProfileId,
      error: (err as Error).message,
    });
  }

  // ── Step 2: Query learning_evidence_events ────────────────────────────────

  let evidenceRows: EvidenceEventRow[] = [];

  try {
    const { data, error } = await supabase
      .from("learning_evidence_events")
      .select("event_type, content_json")
      .eq("child_profile_id", childProfileId);

    if (error) {
      log("warn", "computeCalibrationSnapshot: learning_evidence_events query failed", {
        childProfileId,
        dbError: error.message,
      });
    } else {
      evidenceRows = (data ?? []) as EvidenceEventRow[];
    }
  } catch (err) {
    log("warn", "computeCalibrationSnapshot: unexpected error querying learning_evidence_events", {
      childProfileId,
      error: (err as Error).message,
    });
  }

  // ── Step 3: Determine stage + base score ──────────────────────────────────

  const hasHouseCallingSignals = houseCallingRow !== null;
  const hasEvidence = evidenceRows.length > 0;

  // Count evidence by type
  const evidenceCounts: Record<string, number> = {};
  for (const row of evidenceRows) {
    evidenceCounts[row.event_type] = (evidenceCounts[row.event_type] ?? 0) + 1;
  }

  // Find the structured-replay row (for hint/attempt data)
  const structuredReplayRow = evidenceRows.find((r) => r.event_type === "structured-replay");
  const structuredReplayData = structuredReplayRow?.content_json ?? null;

  let stage: CalibrationStage;
  let baseScore: number;
  const signalSources: string[] = [];
  let traitProfile: Record<string, number> | null = null;
  let bonus = 0;

  if (hasEvidence) {
    // Mission 001 stage: evidence present (may or may not also have house calling signals)
    stage = "mission-001";
    baseScore = 0.60;
    signalSources.push("learning_evidence_events");

    // Add trait profile from house calling if available
    if (hasHouseCallingSignals) {
      signalSources.push("house_calling_signals");
      traitProfile = houseCallingRow!.trait_scores ?? null;
    }

    // Evidence type bonuses (max 0.15 total)
    let evidenceBonus = 0;
    for (const [eventType, bonusValue] of Object.entries(EVIDENCE_BONUSES)) {
      if ((evidenceCounts[eventType] ?? 0) > 0) {
        evidenceBonus += bonusValue;
      }
    }
    bonus = Math.min(evidenceBonus, 0.15);

  } else if (hasHouseCallingSignals) {
    // Sorting ceremony stage: only house calling signals present
    stage = "sorting-ceremony";
    baseScore = 0.40;
    signalSources.push("house_calling_signals");
    traitProfile = houseCallingRow!.trait_scores ?? null;

    // Trait completeness bonus: each trait with a score > 0 adds 0.02 (max 0.14 from 7 traits)
    if (traitProfile) {
      let traitBonus = 0;
      for (const trait of EXPECTED_TRAITS) {
        const score = traitProfile[trait];
        if (typeof score === "number" && score > 0) {
          traitBonus += 0.02;
        }
      }
      bonus = Math.min(traitBonus, 0.14);
    }

  } else {
    // Onboarding stage: no signals yet (parent onboarding only)
    stage = "onboarding";
    baseScore = 0.20;
    traitProfile = null;
    bonus = 0;
  }

  // ── Step 4: Compute final score, clamped to stage range ───────────────────

  const rawScore = baseScore + bonus;
  const [stageMin, stageMax] = STAGE_RANGES[stage];
  const confidenceScore = clamp(rawScore, stageMin, stageMax);

  // ── Step 5: Build calibrationSignals object ───────────────────────────────

  const hasAiMistakeCheck = (evidenceCounts["ai-mistake-check"] ?? 0) > 0;
  const hasStructuredReplay = (evidenceCounts["structured-replay"] ?? 0) > 0;

  const calibrationSignals: Record<string, unknown> | null =
    hasEvidence || hasHouseCallingSignals
      ? {
          // Maps to CalibrationSignalTypeSchema values
          "ai-readiness": hasAiMistakeCheck ? "signal-present" : "not-observed",
          "persistence": hasStructuredReplay
            ? ((structuredReplayData as Record<string, unknown>)?.totalAttempts ?? null)
            : null,
          "hint-frequency": hasStructuredReplay
            ? ((structuredReplayData as Record<string, unknown>)?.hintsUsed ?? null)
            : null,
          "delivery-mode-preference": "interactive-lite", // Phase 0 default
          "reading-vs-listening": "not-observed",         // audio not yet captured in Phase 0
          "cognitive-load": hasStructuredReplay
            ? ((structuredReplayData as Record<string, unknown>)?.completedAt
                ? "signal-present"
                : "not-observed")
            : "not-observed",
        }
      : null;

  log("info", "computeCalibrationSnapshot: computed snapshot", {
    childProfileId,
    stage,
    confidenceScore,
    signalSources,
    hasHouseCallingSignals,
    hasEvidence,
    evidenceCount: evidenceRows.length,
    bonus,
  });

  return {
    stage,
    confidenceScore,
    signalSources,
    traitProfile,
    calibrationSignals,
  };
}
