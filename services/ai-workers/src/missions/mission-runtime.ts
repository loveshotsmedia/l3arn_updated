/**
 * Mission runtime — start + complete (Hero Slice Phase B).
 *
 * startMission:   authenticate session → compile Mission 001 (Zod-validated;
 *                 static fallback on AI failure, so no unvalidated AI output ever
 *                 reaches the child) → create a mission_attempts row → return a
 *                 compact student-facing mission view.
 *
 * completeMission: idempotently transition the attempt started→completed, then
 *                 run the completion pipeline in dependency order:
 *                   evidence → mastery_records → rewards → First Learning Map.
 *                 Idempotency: the started→completed transition is a conditional
 *                 UPDATE; only the request that wins it runs the pipeline. The
 *                 moolah_ledger idempotency_key is defense-in-depth.
 *
 * All writes go through the service_role client (RLS bypassed; trusted server).
 *
 * Grounded in: ADR-011 (rewards), ADR-010/026 (evidence + mastery), ADR-016
 * (mission output), ADR-054 (validated/fallback AI), Hero Slice (Agents 3/4/5).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MissionCompiler,
  computeMission001Rewards,
  MISSION_001_EVIDENCE_SPEC,
  resolveSkillDbCode,
} from "@l3arn/mission-compiler";
import type {
  StartMissionResponse,
  CompleteMissionResponse,
} from "@l3arn/shared-types";
import type { ChildSessionRow } from "../lib/child-session";
import { assembleUnifiedFirstLearningMap } from "../reports/unified-first-learning-map";

const log = (level: string, msg: string, data?: object) =>
  console.log(
    JSON.stringify({
      level,
      system: "mission-runtime",
      msg,
      timestamp: new Date().toISOString(),
      ...data,
    }),
  );

const REAL_HOUSES = ["Valkryn", "Lyrion", "Novari", "Cytrex"] as const;

/** Thrown for expected error states so the route can map them to status codes. */
export class MissionRuntimeError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

// ─── Start ──────────────────────────────────────────────────────────────────

export async function startMission(
  supabase: SupabaseClient,
  session: ChildSessionRow,
  missionId: string,
): Promise<StartMissionResponse> {
  // Identity + grade + companion drive the compiler's personalization input.
  const { data: identity } = await supabase
    .from("academy_identities")
    .select("display_name, house")
    .eq("id", session.academy_identity_id)
    .maybeSingle();

  const { data: child } = await supabase
    .from("child_profiles")
    .select("grade")
    .eq("id", session.child_profile_id)
    .maybeSingle();

  const { data: companion } = await supabase
    .from("companion_profiles")
    .select("companion_key, character_style, teaching_tone")
    .eq("child_profile_id", session.child_profile_id)
    .maybeSingle();

  const displayName = (identity as { display_name?: string } | null)?.display_name ?? "Explorer";
  const rawHouse = (identity as { house?: string } | null)?.house ?? "pre_sorting";
  const houseAffiliation = (REAL_HOUSES as readonly string[]).includes(rawHouse) ? rawHouse : "Novari";
  const grade = (child as { grade?: string } | null)?.grade ?? "3";
  const companionPersonality =
    (companion as { teaching_tone?: string; character_style?: string } | null)?.teaching_tone ??
    (companion as { character_style?: string } | null)?.character_style ??
    "encouraging guide";

  // Compile. compile() validates with Zod and falls back to static content if
  // the AI call fails — it does not throw for that case. Unexpected throws
  // propagate to the route (→ 500).
  const compiler = new MissionCompiler();
  const output = await compiler.compile({
    parentIntent: { curriculumGoals: [], gradeLevel: grade, blockedTopics: [], subjectFocus: [] },
    childPersonalization: {
      displayName,
      houseAffiliation,
      companionPersonality,
      learningPrefs: [],
      audioEnabled: false,
    },
    masteryTargets: {
      standardIds: ["L3ARN-SORT-001"],
      targetSkills: ["Sort by one attribute", "Explain sorting logic"],
    },
    childProfileId: session.child_profile_id,
    childSessionId: session.id,
  });

  const contentSource: "ai" | "fallback" = output.usedFallback ? "fallback" : "ai";

  const { data: attempt, error: insertError } = await supabase
    .from("mission_attempts")
    .insert({
      child_profile_id: session.child_profile_id,
      child_session_id: session.id,
      academy_identity_id: session.academy_identity_id,
      mission_id: missionId,
      delivery_mode: "3d",
      status: "started",
      content_source: contentSource,
      ai_output_envelope_id: output.envelope.id,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !attempt) {
    log("error", "startMission: failed to insert mission_attempts", {
      childSessionId: session.id,
      dbError: insertError?.message,
    });
    throw new MissionRuntimeError(500, "MISSION_START_ERROR", "Could not start the mission. Please try again.");
  }

  const m = output.missionData.student3dMission;

  log("info", "startMission: attempt created", {
    missionAttemptId: attempt.id,
    missionId,
    contentSource,
  });

  return {
    missionAttemptId: attempt.id as string,
    missionId,
    contentSource,
    storyHook: m.storyHook,
    tasks: m.tasks.map((t) => ({
      id: t.id,
      description: t.description,
      interactionType: t.interactionType,
    })),
    rewardPreviewLabel: m.rewardPreviewLabel,
  };
}

// ─── Complete ─────────────────────────────────────────────────────────────────

interface CompleteParams {
  missionAttemptId: string;
  completedAllTasks: boolean;
  masteryThresholdMet: boolean;
  masteryEvidenceScore?: number;
}

const EMPTY_REWARDS = {
  moolahEarned: 0,
  xpEarned: 0,
  housePointsEarned: 0,
  companionBondDelta: 0,
  badgesAwarded: [] as string[],
};

export async function completeMission(
  supabase: SupabaseClient,
  session: ChildSessionRow,
  params: CompleteParams,
): Promise<CompleteMissionResponse> {
  const { missionAttemptId, completedAllTasks, masteryThresholdMet, masteryEvidenceScore } = params;
  const now = new Date().toISOString();

  // ── 1. Idempotent claim: started → completed (only the winner proceeds) ──────
  const { data: claimed, error: claimError } = await supabase
    .from("mission_attempts")
    .update({
      status: "completed",
      completed_at: now,
      mastery_achieved: masteryThresholdMet,
      mastery_evidence_score: masteryEvidenceScore ?? null,
    })
    .eq("id", missionAttemptId)
    .eq("child_profile_id", session.child_profile_id)
    .eq("status", "started")
    .select("id");

  if (claimError) {
    log("error", "completeMission: claim update failed", { missionAttemptId, dbError: claimError.message });
    throw new MissionRuntimeError(500, "MISSION_COMPLETE_ERROR", "Could not record completion. Please try again.");
  }

  if (!claimed || claimed.length === 0) {
    // We did not win the transition. Distinguish not-found from already-completed.
    const { data: existing } = await supabase
      .from("mission_attempts")
      .select("id, status")
      .eq("id", missionAttemptId)
      .eq("child_profile_id", session.child_profile_id)
      .maybeSingle();

    if (!existing) {
      throw new MissionRuntimeError(404, "MISSION_ATTEMPT_NOT_FOUND", "Mission attempt not found for this session.");
    }
    if ((existing as { status: string }).status === "completed") {
      const { data: report } = await supabase
        .from("parent_reports")
        .select("id")
        .eq("mission_attempt_id", missionAttemptId)
        .maybeSingle();
      return {
        missionAttemptId,
        status: "completed",
        alreadyCompleted: true,
        rewards: { ...EMPTY_REWARDS },
        evidenceCount: 0,
        masteryRecordsWritten: 0,
        reportId: ((report as { id?: string } | null)?.id ?? null) as string | null,
      };
    }
    throw new MissionRuntimeError(409, "MISSION_NOT_STARTABLE", `Mission attempt is '${(existing as { status: string }).status}', cannot complete.`);
  }

  // ── 2. Context for rewards + growth ──────────────────────────────────────────
  const { data: identity } = await supabase
    .from("academy_identities")
    .select("house")
    .eq("id", session.academy_identity_id)
    .maybeSingle();
  const house = (identity as { house?: string } | null)?.house ?? "pre_sorting";

  const { data: companion } = await supabase
    .from("companion_profiles")
    .select("companion_key, bond_level")
    .eq("child_profile_id", session.child_profile_id)
    .maybeSingle();

  // Evidence we auto-capture: every spec item except consent-gated audio (ADR-027).
  const evidenceSpec = MISSION_001_EVIDENCE_SPEC.filter((s) => !s.consentRequired);
  const rewards = computeMission001Rewards({
    completedAllTasks,
    evidenceCaptured: evidenceSpec.length > 0,
    masteryThresholdMet,
    deliveryMode: "three-d",
  });

  // ── 3. Resolve canonical skills → mastery_skills UUIDs ───────────────────────
  const skillCodes = [...new Set(evidenceSpec.map((s) => resolveSkillDbCode(s.masterySkillTarget)))];
  const { data: skillRows } = await supabase
    .from("mastery_skills")
    .select("id, code")
    .in("code", skillCodes);
  const codeToSkillId = new Map<string, string>(
    ((skillRows ?? []) as { id: string; code: string }[]).map((r) => [r.code, r.id]),
  );

  // ── 4. Write evidence events (proof units) ───────────────────────────────────
  const evidenceRows = evidenceSpec.map((s) => {
    const code = resolveSkillDbCode(s.masterySkillTarget);
    return {
      child_profile_id: session.child_profile_id,
      mission_attempt_id: missionAttemptId,
      event_type: s.evidenceCaptureType,
      content_json: { taskId: s.taskId, taskName: s.taskName },
      mastery_skill_id: codeToSkillId.get(code) ?? null,
      parent_consented_highlight: false,
      captured_at: now,
    };
  });

  const { data: insertedEvidence, error: evidenceError } = await supabase
    .from("learning_evidence_events")
    .insert(evidenceRows)
    .select("id");

  if (evidenceError) {
    log("error", "completeMission: evidence insert failed", { missionAttemptId, dbError: evidenceError.message });
    throw new MissionRuntimeError(500, "EVIDENCE_WRITE_ERROR", "Could not record learning evidence.");
  }

  // Map each inserted evidence id back to its skill code (PostgREST preserves order).
  const evidenceByCode = new Map<string, string[]>();
  (insertedEvidence as { id: string }[]).forEach((row, i) => {
    const code = resolveSkillDbCode(evidenceSpec[i].masterySkillTarget);
    const list = evidenceByCode.get(code) ?? [];
    list.push(row.id);
    evidenceByCode.set(code, list);
  });
  const evidenceCount = (insertedEvidence as { id: string }[]).length;

  // ── 5. Mastery records (one per skill, proof chain = its evidence ids) ────────
  let masteryRecordsWritten = 0;
  const masteryLevel = masteryThresholdMet ? "proficient" : "developing";
  for (const [code, skillId] of codeToSkillId.entries()) {
    const { error: masteryError } = await supabase
      .from("mastery_records")
      .upsert(
        {
          child_profile_id: session.child_profile_id,
          mastery_skill_id: skillId,
          mastery_level: masteryLevel,
          evidence_event_ids: evidenceByCode.get(code) ?? [],
          assessed_by: "mission-compiler",
          assessed_at: now,
        },
        { onConflict: "child_profile_id,mastery_skill_id" },
      );
    if (masteryError) {
      log("warn", "completeMission: mastery upsert failed", { code, dbError: masteryError.message });
    } else {
      masteryRecordsWritten++;
    }
  }

  // ── 6. Rewards (status guard already prevents double-award) ───────────────────
  const { error: moolahError } = await supabase.from("moolah_ledger").insert({
    child_profile_id: session.child_profile_id,
    amount: rewards.moolahEarned,
    reason: "Mission 001 completion",
    source_type: "mission-completion",
    source_id: missionAttemptId,
    idempotency_key: `m001:${missionAttemptId}:moolah`,
  });
  if (moolahError) {
    log("error", "completeMission: moolah insert failed", { missionAttemptId, dbError: moolahError.message });
    throw new MissionRuntimeError(500, "REWARD_WRITE_ERROR", "Could not award Moolah.");
  }

  const { error: xpError } = await supabase.from("xp_events").insert({
    child_profile_id: session.child_profile_id,
    xp_amount: rewards.xpEarned,
    reason: "Mission 001",
    source_type: "mission-attempt",
    source_id: missionAttemptId,
  });
  if (xpError) log("warn", "completeMission: xp insert failed", { dbError: xpError.message });

  if (house && rewards.housePointsEarned > 0) {
    const { error: hpError } = await supabase.from("house_points").insert({
      child_profile_id: session.child_profile_id,
      house,
      points: rewards.housePointsEarned,
      reason: "Mission 001",
      source_type: "mission-completion",
      source_id: missionAttemptId,
    });
    if (hpError) log("warn", "completeMission: house_points insert failed", { dbError: hpError.message });
  }

  // Badges: resolve badge_key → id, then award (idempotent on child_profile_id+badge_id).
  for (const badgeKey of rewards.badgesAwarded) {
    const { data: badge } = await supabase.from("badges").select("id").eq("badge_key", badgeKey).maybeSingle();
    if (!badge) {
      log("warn", "completeMission: badge key not found in catalogue", { badgeKey });
      continue;
    }
    const { error: badgeError } = await supabase
      .from("child_badges")
      .upsert(
        { child_profile_id: session.child_profile_id, badge_id: (badge as { id: string }).id, source_id: missionAttemptId },
        { onConflict: "child_profile_id,badge_id", ignoreDuplicates: true },
      );
    if (badgeError) log("warn", "completeMission: badge award failed", { badgeKey, dbError: badgeError.message });
  }

  // Companion growth (only if a companion has been chosen).
  if (companion) {
    const companionKey = (companion as { companion_key: string }).companion_key;
    const newBond = ((companion as { bond_level?: number }).bond_level ?? 0) + rewards.companionBondDelta;
    const { error: growthError } = await supabase.from("companion_growth_events").insert({
      child_profile_id: session.child_profile_id,
      companion_key: companionKey,
      event_type: "bond-increase",
      bond_delta: rewards.companionBondDelta,
      bond_total: newBond,
      source_id: missionAttemptId,
    });
    if (growthError) {
      log("warn", "completeMission: companion growth insert failed", { dbError: growthError.message });
    } else {
      await supabase.from("companion_profiles").update({ bond_level: newBond }).eq("child_profile_id", session.child_profile_id);
    }
  }

  // ── 7. First Learning Map (best-effort; completion already succeeded) ─────────
  const { data: privacy } = await supabase
    .from("privacy_settings")
    .select("parent_visibility_tier")
    .eq("child_profile_id", session.child_profile_id)
    .maybeSingle();
  const tier = ((privacy as { parent_visibility_tier?: string } | null)?.parent_visibility_tier ?? "full") as
    | "full"
    | "summary"
    | "safety-override";

  let reportId: string | null = null;
  try {
    const report = await assembleUnifiedFirstLearningMap({
      childProfileId: session.child_profile_id,
      missionAttemptId,
      parentVisibilityTier: tier,
    });
    const { data: reportRow, error: reportError } = await supabase
      .from("parent_reports")
      .insert({
        child_profile_id: session.child_profile_id,
        report_type: "unified-first-learning-map",
        mission_attempt_id: missionAttemptId,
        content_json: report,
        visibility_tier_at_generation: tier,
      })
      .select("id")
      .single();
    if (reportError) throw reportError;
    reportId = (reportRow as { id: string }).id;
  } catch (err) {
    log("warn", "completeMission: First Learning Map generation failed (non-fatal)", {
      missionAttemptId,
      error: (err as Error).message,
    });
  }

  log("info", "completeMission: pipeline complete", {
    missionAttemptId,
    evidenceCount,
    masteryRecordsWritten,
    reportId,
  });

  return {
    missionAttemptId,
    status: "completed",
    alreadyCompleted: false,
    rewards: {
      moolahEarned: rewards.moolahEarned,
      xpEarned: rewards.xpEarned,
      housePointsEarned: rewards.housePointsEarned,
      companionBondDelta: rewards.companionBondDelta,
      badgesAwarded: rewards.badgesAwarded,
    },
    evidenceCount,
    masteryRecordsWritten,
    reportId,
  };
}
