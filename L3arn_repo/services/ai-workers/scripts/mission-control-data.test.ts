/**
 * Founder Mission Control — Phase C data-layer acceptance test (real, no mocks).
 *
 * Exercises the ACTUAL fetchers in apps/web/src/lib/mission-control-data.ts
 * against a live Supabase stack (local by default). It captures a baseline,
 * seeds one full Hero-Slice footprint (active session + mission attempts incl. a
 * fallback + a completion + rewards + evidence + a First Learning Map), then
 * asserts each fetcher reflects the seeded rows as exact deltas and surfaces the
 * seeded rows in its recent feed — and that the returned rows carry NO PII.
 *
 * This is the Phase C analogue of hero-slice-acceptance.mjs: the Mission Control
 * page is a Server Component that can't be unit-rendered here, so we test its
 * data layer directly (the page just renders these shapes).
 *
 * Env:
 *   SUPABASE_URL              (default http://127.0.0.1:54321)
 *   SUPABASE_SERVICE_ROLE_KEY (required — locally this is the SECRET_KEY, sb_secret_…)
 *
 * Run from services/ai-workers:
 *   npx ts-node --transpile-only scripts/mission-control-data.test.ts
 */

import { createClient } from "@supabase/supabase-js";
import {
  fetchActiveSessions,
  fetchMissionActivity,
  fetchAiFallbackEvents,
  fetchRewardLedgerHealth,
  fetchEvidenceReporting,
} from "../../../apps/web/src/lib/mission-control-data";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("FATAL: SUPABASE_SERVICE_ROLE_KEY is required");
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let passed = 0;
let failed = 0;
const results: string[] = [];
function check(name: string, cond: boolean, detail = ""): void {
  if (cond) {
    passed++;
    results.push(`  PASS  ${name}`);
  } else {
    failed++;
    results.push(`  FAIL  ${name}${detail ? "  — " + detail : ""}`);
  }
}

// Keys that must NEVER appear in any de-identified row returned to the UI.
const FORBIDDEN_KEYS = [
  "legal_first_name",
  "legal_last_name",
  "email",
  "address",
  "content_json",
  "payload_json",
  "violation_summary",
  "display_name",
];
function assertNoPII(label: string, row: Record<string, unknown> | undefined): void {
  if (!row) {
    check(`${label}: row present for PII check`, false, "no row");
    return;
  }
  const leaked = Object.keys(row).filter((k) => FORBIDDEN_KEYS.includes(k));
  check(`${label}: no PII keys (${Object.keys(row).join(",")})`, leaked.length === 0, `leaked ${leaked.join(",")}`);
}

const rand = Math.floor(Math.random() * 1e6);

async function main(): Promise<void> {
  // ── 0. Baseline (call the real fetchers BEFORE seeding) ──────────────────────
  const baseActive = await fetchActiveSessions(supabase);
  const baseMission = await fetchMissionActivity(supabase);
  const baseFallback = await fetchAiFallbackEvents(supabase);
  const baseReward = await fetchRewardLedgerHealth(supabase);
  const baseEvidence = await fetchEvidenceReporting(supabase);

  check("baseline: fetchers return numeric counts", [
    baseActive.activeCount,
    baseMission.totalStarted,
    baseMission.totalCompleted,
    baseFallback.fallbackCount,
    baseFallback.aiCount,
    baseReward.ledgerEntryCount,
    baseReward.xpEventCount,
    baseReward.badgesAwardedCount,
    baseEvidence.evidenceEventCount,
    baseEvidence.masteryRecordCount,
    baseEvidence.firstLearningMapCount,
    baseEvidence.reportCount,
  ].every((n) => typeof n === "number" && Number.isFinite(n)));

  // ── 1. Seed fixtures ─────────────────────────────────────────────────────────
  const email = `mc+${rand}@l3arn.test`;
  const { data: userData, error: userErr } = await supabase.auth.admin.createUser({
    email,
    password: `Test-${rand}-pw!`,
    email_confirm: true,
    user_metadata: { display_name: "MC Parent" },
  });
  check("seed: auth user created", !userErr && !!userData?.user?.id, userErr?.message);
  const parentId = userData?.user?.id;
  if (!parentId) return finish();

  const { data: household, error: hhErr } = await supabase
    .from("households")
    .insert({ parent_account_id: parentId, name: "MC Household", state_code: "FL" })
    .select("id")
    .single();
  check("seed: household created", !hhErr && !!household?.id, hhErr?.message);
  if (!household?.id) return finish();

  const { data: child, error: childErr } = await supabase
    .from("child_profiles")
    .insert({
      household_id: household.id,
      parent_account_id: parentId,
      legal_first_name: "MC",
      legal_last_name: "Child",
      date_of_birth: "2016-05-01",
      grade: "3",
    })
    .select("id")
    .single();
  check("seed: child_profile created", !childErr && !!child?.id, childErr?.message);
  if (!child?.id) return finish();

  const { data: identity, error: idErr } = await supabase
    .from("academy_identities")
    .insert({ child_profile_id: child.id, display_name: `MCStar${rand}`, house: "pre_sorting" })
    .select("id")
    .single();
  check("seed: academy_identity created", !idErr && !!identity?.id, idErr?.message);
  if (!identity?.id) return finish();

  // Active session: not revoked, not ended, expires in 2h → must count as active.
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const { data: session, error: sessErr } = await supabase
    .from("child_sessions")
    .insert({
      child_profile_id: child.id,
      academy_identity_id: identity.id,
      entry_method: "parent-launch",
      launch_mode: "parent_launched",
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  check("seed: active child_session created", !sessErr && !!session?.id, sessErr?.message);
  if (!session?.id) return finish();

  // mission_attempts: A=ai/started, B=fallback/started, C=ai/completed
  const baseAttempt = {
    child_profile_id: child.id,
    child_session_id: session.id,
    mission_id: "mission-001",
  };
  const { data: attemptA, error: aErr } = await supabase
    .from("mission_attempts")
    .insert({ ...baseAttempt, content_source: "ai", status: "started" })
    .select("id")
    .single();
  const { data: attemptB, error: bErr } = await supabase
    .from("mission_attempts")
    .insert({ ...baseAttempt, content_source: "fallback", status: "started" })
    .select("id")
    .single();
  const { data: attemptC, error: cErr } = await supabase
    .from("mission_attempts")
    .insert({
      ...baseAttempt,
      content_source: "ai",
      status: "completed",
      completed_at: new Date().toISOString(),
      mastery_achieved: true,
    })
    .select("id")
    .single();
  check("seed: 3 mission_attempts created (ai/started, fallback/started, ai/completed)",
    !aErr && !bErr && !cErr && !!attemptA?.id && !!attemptB?.id && !!attemptC?.id,
    `${aErr?.message ?? ""} ${bErr?.message ?? ""} ${cErr?.message ?? ""}`);
  if (!attemptC?.id) return finish();

  // Rewards: ledger (+25, trigger fills balance_after), xp, one badge.
  const { error: ledErr } = await supabase.from("moolah_ledger").insert({
    child_profile_id: child.id,
    amount: 25,
    reason: "Mission 001 completion",
    source_type: "mission-completion",
    source_id: attemptC.id,
  });
  check("seed: moolah_ledger entry created", !ledErr, ledErr?.message);

  const { error: xpErr } = await supabase.from("xp_events").insert({
    child_profile_id: child.id,
    xp_amount: 75,
    reason: "Mission 001 effort + mastery",
    source_type: "mission-attempt",
    source_id: attemptC.id,
  });
  check("seed: xp_event created", !xpErr, xpErr?.message);

  const { data: badge } = await supabase
    .from("badges")
    .select("id")
    .eq("badge_key", "mission-001-complete")
    .single();
  const { error: cbErr } = await supabase.from("child_badges").insert({
    child_profile_id: child.id,
    badge_id: badge?.id,
    source_id: attemptC.id,
  });
  check("seed: child_badge awarded", !cbErr, cbErr?.message);

  // Evidence + mastery + First Learning Map report.
  const { error: evErr } = await supabase.from("learning_evidence_events").insert({
    child_profile_id: child.id,
    mission_attempt_id: attemptC.id,
    event_type: "decision-log",
  });
  check("seed: learning_evidence_event created", !evErr, evErr?.message);

  const { data: skill } = await supabase.from("mastery_skills").select("id").limit(1).single();
  const { error: mrErr } = await supabase.from("mastery_records").insert({
    child_profile_id: child.id,
    mastery_skill_id: skill?.id,
    mastery_level: "proficient",
  });
  check("seed: mastery_record created", !mrErr, mrErr?.message);

  const { data: report, error: prErr } = await supabase
    .from("parent_reports")
    .insert({
      child_profile_id: child.id,
      report_type: "unified-first-learning-map",
      content_json: { seeded: true },
      visibility_tier_at_generation: "full",
      mission_attempt_id: attemptC.id,
    })
    .select("id")
    .single();
  check("seed: parent_report (First Learning Map) created", !prErr && !!report?.id, prErr?.message);

  // ── 2. Re-fetch via the real fetchers (AFTER) ────────────────────────────────
  const afterActive = await fetchActiveSessions(supabase);
  const afterMission = await fetchMissionActivity(supabase);
  const afterFallback = await fetchAiFallbackEvents(supabase);
  const afterReward = await fetchRewardLedgerHealth(supabase);
  const afterEvidence = await fetchEvidenceReporting(supabase);

  // ── 3a. Active sessions ──────────────────────────────────────────────────────
  check("active: count +1", afterActive.activeCount === baseActive.activeCount + 1,
    `base ${baseActive.activeCount} → after ${afterActive.activeCount}`);
  const seededSession = afterActive.recent.find((r) => r.id === session.id);
  check("active: seeded session in recent feed", !!seededSession);
  check("active: recent row launch_mode correct", seededSession?.launch_mode === "parent_launched");
  check("active: recent row child UUID matches", seededSession?.child_profile_id === child.id);
  assertNoPII("active", seededSession as Record<string, unknown> | undefined);

  // ── 3b. Mission activity ─────────────────────────────────────────────────────
  check("mission: started +3", afterMission.totalStarted === baseMission.totalStarted + 3,
    `base ${baseMission.totalStarted} → after ${afterMission.totalStarted}`);
  check("mission: completed +1", afterMission.totalCompleted === baseMission.totalCompleted + 1,
    `base ${baseMission.totalCompleted} → after ${afterMission.totalCompleted}`);
  check("mission: completionRatePct in [0,100]",
    afterMission.completionRatePct >= 0 && afterMission.completionRatePct <= 100,
    `got ${afterMission.completionRatePct}`);
  check("mission: completed attempt in recent feed",
    afterMission.recent.some((r) => r.id === attemptC.id));
  assertNoPII("mission", afterMission.recent[0] as Record<string, unknown> | undefined);

  // ── 3c. AI fallback events ───────────────────────────────────────────────────
  check("fallback: fallback count +1", afterFallback.fallbackCount === baseFallback.fallbackCount + 1,
    `base ${baseFallback.fallbackCount} → after ${afterFallback.fallbackCount}`);
  check("fallback: ai count +2", afterFallback.aiCount === baseFallback.aiCount + 2,
    `base ${baseFallback.aiCount} → after ${afterFallback.aiCount}`);
  check("fallback: seeded fallback attempt in recent feed",
    afterFallback.recent.some((r) => r.id === attemptB!.id));
  check("fallback: rate in [0,100]",
    afterFallback.fallbackRatePct >= 0 && afterFallback.fallbackRatePct <= 100);

  // ── 3d. Reward ledger health ─────────────────────────────────────────────────
  check("reward: ledger entry count +1", afterReward.ledgerEntryCount === baseReward.ledgerEntryCount + 1,
    `base ${baseReward.ledgerEntryCount} → after ${afterReward.ledgerEntryCount}`);
  check("reward: xp event count +1", afterReward.xpEventCount === baseReward.xpEventCount + 1);
  check("reward: badges awarded +1", afterReward.badgesAwardedCount === baseReward.badgesAwardedCount + 1);
  const seededLedger = afterReward.recent.find((r) => r.child_profile_id === child.id);
  check("reward: seeded ledger row in recent feed (amount 25)", seededLedger?.amount === 25,
    `got ${seededLedger?.amount}`);
  assertNoPII("reward", seededLedger as Record<string, unknown> | undefined);

  // ── 3e. Evidence / reports ───────────────────────────────────────────────────
  check("evidence: evidence event count +1",
    afterEvidence.evidenceEventCount === baseEvidence.evidenceEventCount + 1);
  check("evidence: mastery record count +1",
    afterEvidence.masteryRecordCount === baseEvidence.masteryRecordCount + 1);
  check("evidence: First Learning Map count +1",
    afterEvidence.firstLearningMapCount === baseEvidence.firstLearningMapCount + 1,
    `base ${baseEvidence.firstLearningMapCount} → after ${afterEvidence.firstLearningMapCount}`);
  check("evidence: total report count +1",
    afterEvidence.reportCount === baseEvidence.reportCount + 1);
  const seededReport = afterEvidence.recentReports.find((r) => r.id === report!.id);
  check("evidence: seeded report in recent feed (unified-first-learning-map)",
    seededReport?.report_type === "unified-first-learning-map");
  assertNoPII("evidence", seededReport as Record<string, unknown> | undefined);

  // ── 4. Cleanup (best-effort) ─────────────────────────────────────────────────
  // child_profile delete cascades all child-scoped rows (mission_attempts, ledger,
  // xp, badges, evidence, mastery, reports, sessions, identities).
  await supabase.from("child_profiles").delete().eq("id", child.id);
  await supabase.from("households").delete().eq("id", household.id);
  await supabase.auth.admin.deleteUser(parentId).catch(() => {});

  finish();
}

function finish(): void {
  console.log("\n──── Mission Control (Phase C) — Data-Layer Acceptance ────");
  console.log(results.join("\n"));
  console.log(`\n  ${passed} passed, ${failed} failed`);
  console.log("───────────────────────────────────────────────────────────\n");
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Data-layer acceptance crashed:", err);
  if (results.length) {
    console.log("\nResults captured before crash:");
    console.log(results.join("\n"));
  }
  process.exit(3);
});
