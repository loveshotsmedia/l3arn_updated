/**
 * Mission lesson fetch — sub-project 2 (adaptive lesson runtime).
 *
 * Serves the fixed, hand-authored fixture lesson sequence for a mission
 * attempt. Stands in for the real generation pipeline (sub-project 4).
 *
 * No real learning-style/reading-tier calibration signal exists in the
 * codebase yet (confirmed: startMission's personalization uses grade/house/
 * companion only; house_calling_signals stores trait scores, not a VARK
 * classification) — this resolves a fixed default variant-key rather than
 * pretending to read a signal that doesn't exist. Swapping in a real signal
 * later only touches resolveVariantKey() below.
 *
 * Grounded in: docs/superpowers/specs/2026-07-20-adaptive-lesson-runtime-design.md §1.1
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { MISSION_001_LESSON_SEQUENCE } from "@l3arn/mission-compiler";
import type { MissionLessonResponse } from "@l3arn/shared-types";
import type { ChildSessionRow } from "../lib/child-session";
import { MissionRuntimeError } from "./mission-runtime";

const log = (level: string, msg: string, data?: object) =>
  console.log(
    JSON.stringify({
      level,
      system: "mission-lesson",
      msg,
      timestamp: new Date().toISOString(),
      ...data,
    }),
  );

/** No real calibration signal exists yet — see file header. */
function resolveVariantKey() {
  return { learningStyle: "reading-writing" as const, readingTier: "grade-level" as const };
}

const MISSION_LESSON_SEQUENCES: Record<string, typeof MISSION_001_LESSON_SEQUENCE> = {
  "mission-001": MISSION_001_LESSON_SEQUENCE,
};

export async function getMissionLesson(
  supabase: SupabaseClient,
  session: ChildSessionRow,
  missionId: string,
  missionAttemptId: string,
): Promise<MissionLessonResponse> {
  const sequence = MISSION_LESSON_SEQUENCES[missionId];
  if (!sequence) {
    throw new MissionRuntimeError(404, "LESSON_NOT_FOUND", `No lesson sequence configured for mission '${missionId}'.`);
  }

  const { data: attempt, error } = await supabase
    .from("mission_attempts")
    .select("id, current_task_index")
    .eq("id", missionAttemptId)
    .eq("child_profile_id", session.child_profile_id)
    .maybeSingle();

  if (error) {
    log("error", "getMissionLesson: mission_attempts lookup failed", {
      childSessionId: session.id,
      missionAttemptId,
      dbError: error.message,
    });
    throw new MissionRuntimeError(503, "LESSON_LOOKUP_FAILED", "Could not verify mission attempt. Please try again.");
  }
  if (!attempt) {
    throw new MissionRuntimeError(403, "ATTEMPT_NOT_OWNED", "This mission attempt does not belong to your session.");
  }

  // resolveVariantKey() is called for future-compatibility (this is where a
  // real generation pipeline would branch on style/tier); today's fixed
  // fixture sequence doesn't vary by it.
  resolveVariantKey();

  return {
    missionId,
    missionAttemptId,
    tasks: sequence,
    resumeFromTaskIndex: (attempt as { current_task_index: number }).current_task_index,
  };
}

export async function updateMissionTaskIndex(
  supabase: SupabaseClient,
  session: ChildSessionRow,
  missionAttemptId: string,
  taskIndex: number,
): Promise<void> {
  const { data, error } = await supabase
    .from("mission_attempts")
    .update({ current_task_index: taskIndex })
    .eq("id", missionAttemptId)
    .eq("child_profile_id", session.child_profile_id)
    .select("id");

  if (error) {
    log("error", "updateMissionTaskIndex: mission_attempts update failed", {
      childSessionId: session.id,
      missionAttemptId,
      dbError: error.message,
    });
    throw new MissionRuntimeError(500, "TASK_INDEX_UPDATE_FAILED", "Could not save your progress. Please try again.");
  }

  if (!data || data.length === 0) {
    log("error", "updateMissionTaskIndex: no mission_attempts row matched (not found or not owned)", {
      childSessionId: session.id,
      missionAttemptId,
    });
    throw new MissionRuntimeError(403, "ATTEMPT_NOT_OWNED", "This mission attempt does not belong to your session.");
  }
}
