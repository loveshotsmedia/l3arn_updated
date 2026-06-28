/**
 * Hero Slice — Phase A acceptance test (real integration, no mocks).
 *
 * Exercises the live HTTP endpoints against a real Supabase (local stack by
 * default) and verifies the rows that land. Covers:
 *   - migration 008 tables exist (mission_attempts, companion_profiles)
 *   - POST /api/sessions/start  → child_sessions row + opaque token
 *   - POST /api/sessions/verify → 200 for a live token; identity correct
 *   - POST /api/student/session/house → academy_identities.house persists,
 *                                        child_profiles.sorting_complete = true
 *   - POST /api/student/session/companion → companion_profiles upsert (bond kept)
 *   - fail-closed: bad token → 401, revoked → 410, expired → 410
 *
 * Env:
 *   SUPABASE_URL              (default http://127.0.0.1:54321)
 *   SUPABASE_SERVICE_ROLE_KEY (required)
 *   AI_WORKERS_URL            (default http://127.0.0.1:3001)
 *
 * Run from services/ai-workers:  node scripts/hero-slice-acceptance.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API = (process.env.AI_WORKERS_URL ?? "http://127.0.0.1:3001").replace(/\/$/, "");

if (!SERVICE_ROLE_KEY) {
  console.error("FATAL: SUPABASE_SERVICE_ROLE_KEY is required");
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let passed = 0;
let failed = 0;
const results = [];
function check(name, cond, detail = "") {
  if (cond) {
    passed++;
    results.push(`  PASS  ${name}`);
  } else {
    failed++;
    results.push(`  FAIL  ${name}${detail ? "  — " + detail : ""}`);
  }
}

const rand = Math.floor(Math.random() * 1e6);

async function main() {
  // ── 0. migration 008 tables exist ───────────────────────────────────────────
  {
    const { error: maErr } = await supabase.from("mission_attempts").select("id").limit(1);
    check("migration 008: mission_attempts table exists", !maErr, maErr?.message);
    const { error: cpErr } = await supabase.from("companion_profiles").select("id").limit(1);
    check("migration 008: companion_profiles table exists", !cpErr, cpErr?.message);
  }

  // ── 1. Seed fixtures ────────────────────────────────────────────────────────
  // Auth admin createUser fires on_auth_user_created → parent_accounts row.
  const email = `hero+${rand}@l3arn.test`;
  const { data: userData, error: userErr } = await supabase.auth.admin.createUser({
    email,
    password: `Test-${rand}-pw!`,
    email_confirm: true,
    user_metadata: { display_name: "Hero Parent" },
  });
  check("seed: auth user created", !userErr && !!userData?.user?.id, userErr?.message);
  const parentId = userData?.user?.id;
  if (!parentId) {
    finish();
    return;
  }

  // parent_accounts is created by trigger — confirm it exists before FK inserts.
  const { data: pa } = await supabase
    .from("parent_accounts")
    .select("id")
    .eq("id", parentId)
    .maybeSingle();
  check("seed: parent_accounts row auto-created by trigger", !!pa);

  const { data: household, error: hhErr } = await supabase
    .from("households")
    .insert({ parent_account_id: parentId, name: "Hero Household", state_code: "FL" })
    .select("id")
    .single();
  check("seed: household created", !hhErr && !!household?.id, hhErr?.message);
  if (!household?.id) { finish(); return; }

  const { data: child, error: childErr } = await supabase
    .from("child_profiles")
    .insert({
      household_id: household.id,
      parent_account_id: parentId,
      legal_first_name: "Hero",
      legal_last_name: "Child",
      date_of_birth: "2016-05-01",
      grade: "3",
    })
    .select("id")
    .single();
  check("seed: child_profile created", !childErr && !!child?.id, childErr?.message);
  if (!child?.id) { finish(); return; }

  const displayName = `Star${rand}`;
  const { data: identity, error: idErr } = await supabase
    .from("academy_identities")
    .insert({
      child_profile_id: child.id,
      display_name: displayName,
      house: "pre_sorting",
    })
    .select("id, display_name, house")
    .single();
  check("seed: academy_identity created (house=pre_sorting)", !idErr && identity?.house === "pre_sorting", idErr?.message);
  if (!identity?.id) { finish(); return; }

  // ── 2. POST /api/sessions/start ──────────────────────────────────────────────
  const startRes = await fetch(`${API}/api/sessions/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Parent-Id": parentId },
    body: JSON.stringify({ childProfileId: child.id, launchMode: "parent_launched" }),
  });
  const startBody = await startRes.json().catch(() => ({}));
  check("start: 200", startRes.status === 200, `status ${startRes.status} ${JSON.stringify(startBody)}`);
  const token = startBody.childSessionToken;
  check("start: returns opaque token (!= childProfileId)", !!token && token !== child.id);
  check("start: identity displayName correct", startBody?.academyIdentity?.displayName === displayName);
  check("start: identity house is pre_sorting", startBody?.academyIdentity?.house === "pre_sorting");

  // ── 3. POST /api/sessions/verify (happy) ─────────────────────────────────────
  const verifyRes = await fetch(`${API}/api/sessions/verify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const verifyBody = await verifyRes.json().catch(() => ({}));
  check("verify: 200 for live token", verifyRes.status === 200, `status ${verifyRes.status} ${JSON.stringify(verifyBody)}`);
  check("verify: returns correct displayName", verifyBody?.academyIdentity?.displayName === displayName);
  check("verify: returns house pre_sorting (pre-sorting)", verifyBody?.academyIdentity?.house === "pre_sorting");

  // ── 4. POST /api/student/session/house ───────────────────────────────────────
  const houseRes = await fetch(`${API}/api/student/session/house`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ house: "Cytrex" }),
  });
  const houseBody = await houseRes.json().catch(() => ({}));
  check("house: 200", houseRes.status === 200, `status ${houseRes.status} ${JSON.stringify(houseBody)}`);
  check("house: response house = Cytrex", houseBody?.academyIdentity?.house === "Cytrex");

  const { data: idAfter } = await supabase
    .from("academy_identities")
    .select("house")
    .eq("id", identity.id)
    .single();
  check("house: academy_identities.house persisted = Cytrex", idAfter?.house === "Cytrex");

  const { data: childAfter } = await supabase
    .from("child_profiles")
    .select("sorting_complete")
    .eq("id", child.id)
    .single();
  check("house: child_profiles.sorting_complete = true", childAfter?.sorting_complete === true);

  // house must NOT be writable as pre_sorting (schema-level: SelectableHouse)
  const badHouseRes = await fetch(`${API}/api/student/session/house`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ house: "pre_sorting" }),
  });
  check("house: rejects pre_sorting (400)", badHouseRes.status === 400, `status ${badHouseRes.status}`);

  // ── 5. POST /api/student/session/companion ───────────────────────────────────
  const compRes = await fetch(`${API}/api/student/session/companion`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      companionKey: "comp-001-spark",
      characterName: "Spark",
      characterStyle: "curious-inventor",
      teachingTone: "enthusiastic",
      templateId: "comp-001-spark",
    }),
  });
  const compBody = await compRes.json().catch(() => ({}));
  check("companion: 200", compRes.status === 200, `status ${compRes.status} ${JSON.stringify(compBody)}`);
  check("companion: companionKey persisted", compBody?.companion?.companionKey === "comp-001-spark");
  check("companion: bondLevel starts at 0", compBody?.companion?.bondLevel === 0);

  // bump bond, then re-select a different companion — bond must NOT be clobbered
  await supabase.from("companion_profiles").update({ bond_level: 7 }).eq("child_profile_id", child.id);
  const comp2Res = await fetch(`${API}/api/student/session/companion`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ companionKey: "comp-002-luna", characterName: "Luna" }),
  });
  const comp2Body = await comp2Res.json().catch(() => ({}));
  check("companion: re-select 200", comp2Res.status === 200, `status ${comp2Res.status}`);
  check("companion: re-select keeps bond_level=7 (no clobber)", comp2Body?.companion?.bondLevel === 7, `got ${comp2Body?.companion?.bondLevel}`);
  check("companion: re-select updates key to luna", comp2Body?.companion?.companionKey === "comp-002-luna");

  // ── 5b. Mission 001 runtime: start ───────────────────────────────────────────
  const startMissionRes = await fetch(`${API}/api/student/mission/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ missionId: "mission-001" }),
  });
  const startMissionBody = await startMissionRes.json().catch(() => ({}));
  check("mission start: 200", startMissionRes.status === 200, `status ${startMissionRes.status} ${JSON.stringify(startMissionBody)}`);
  const attemptId = startMissionBody.missionAttemptId;
  check("mission start: returns attempt id", !!attemptId);
  check("mission start: content is validated or static fallback (no raw AI)", ["ai", "fallback"].includes(startMissionBody.contentSource), `got ${startMissionBody.contentSource}`);
  check("mission start: has tasks", Array.isArray(startMissionBody.tasks) && startMissionBody.tasks.length > 0);

  const { data: attemptStarted } = await supabase
    .from("mission_attempts")
    .select("status")
    .eq("id", attemptId)
    .single();
  check("mission start: mission_attempts row is 'started'", attemptStarted?.status === "started");

  // ── 5c. Mission 001 runtime: complete ────────────────────────────────────────
  const completeRes = await fetch(`${API}/api/student/mission/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ missionAttemptId: attemptId, completedAllTasks: true, masteryThresholdMet: true }),
  });
  const completeBody = await completeRes.json().catch(() => ({}));
  check("mission complete: 200", completeRes.status === 200, `status ${completeRes.status} ${JSON.stringify(completeBody)}`);
  check("mission complete: not alreadyCompleted (first call)", completeBody.alreadyCompleted === false);
  check("mission complete: moolah=25", completeBody?.rewards?.moolahEarned === 25, `got ${completeBody?.rewards?.moolahEarned}`);
  check("mission complete: xp=75 (50+25)", completeBody?.rewards?.xpEarned === 75, `got ${completeBody?.rewards?.xpEarned}`);
  check("mission complete: housePoints=15 (10+5 evidence)", completeBody?.rewards?.housePointsEarned === 15, `got ${completeBody?.rewards?.housePointsEarned}`);
  check("mission complete: companionBond=20 (15+5 mastery)", completeBody?.rewards?.companionBondDelta === 20, `got ${completeBody?.rewards?.companionBondDelta}`);
  check("mission complete: both badges awarded", Array.isArray(completeBody?.rewards?.badgesAwarded) && completeBody.rewards.badgesAwarded.includes("mission-001-complete") && completeBody.rewards.badgesAwarded.includes("ai-literacy-1"), JSON.stringify(completeBody?.rewards?.badgesAwarded));
  check("mission complete: evidence captured", completeBody.evidenceCount > 0, `got ${completeBody.evidenceCount}`);
  check("mission complete: mastery records written", completeBody.masteryRecordsWritten > 0, `got ${completeBody.masteryRecordsWritten}`);
  check("mission complete: First Learning Map generated", !!completeBody.reportId, `reportId ${completeBody.reportId}`);

  // ── 5d. Verify DB rows landed ────────────────────────────────────────────────
  const { data: attemptDone } = await supabase
    .from("mission_attempts")
    .select("status, completed_at, mastery_achieved")
    .eq("id", attemptId)
    .single();
  check("DB: mission_attempts completed", attemptDone?.status === "completed" && attemptDone?.completed_at != null && attemptDone?.mastery_achieved === true);

  const { data: ledger } = await supabase
    .from("moolah_ledger")
    .select("amount, balance_after")
    .eq("source_id", attemptId);
  check("DB: one moolah_ledger row for attempt", (ledger?.length ?? 0) === 1, `count ${ledger?.length}`);
  check("DB: ledger balance_after set by trigger", ledger?.[0]?.balance_after === 25, `got ${ledger?.[0]?.balance_after}`);

  const { data: wallet } = await supabase
    .from("moolah_wallets")
    .select("balance")
    .eq("child_profile_id", child.id)
    .single();
  check("DB: wallet balance = 25 (atomic via trigger)", wallet?.balance === 25, `got ${wallet?.balance}`);

  const { data: xp } = await supabase.from("xp_events").select("xp_amount").eq("source_id", attemptId);
  check("DB: xp_events row written (75)", (xp?.length ?? 0) === 1 && xp?.[0]?.xp_amount === 75, JSON.stringify(xp));

  const { data: hp } = await supabase.from("house_points").select("points, house").eq("source_id", attemptId);
  check("DB: house_points row (15, Cytrex)", hp?.[0]?.points === 15 && hp?.[0]?.house === "Cytrex", JSON.stringify(hp));

  const { data: evidence } = await supabase
    .from("learning_evidence_events")
    .select("id")
    .eq("mission_attempt_id", attemptId);
  check("DB: learning_evidence_events match count", (evidence?.length ?? 0) === completeBody.evidenceCount, `db ${evidence?.length} vs api ${completeBody.evidenceCount}`);

  const { data: mastery } = await supabase
    .from("mastery_records")
    .select("id, evidence_event_ids")
    .eq("child_profile_id", child.id);
  check("DB: mastery_records written with proof chain", (mastery?.length ?? 0) > 0 && (mastery?.[0]?.evidence_event_ids?.length ?? 0) > 0, `count ${mastery?.length}`);

  const { data: badgesAwarded } = await supabase.from("child_badges").select("id").eq("source_id", attemptId);
  check("DB: child_badges rows written (2)", (badgesAwarded?.length ?? 0) === 2, `count ${badgesAwarded?.length}`);

  const { data: growth } = await supabase.from("companion_growth_events").select("bond_delta").eq("source_id", attemptId);
  check("DB: companion_growth_events row (bond +20)", growth?.[0]?.bond_delta === 20, JSON.stringify(growth));

  const { data: report } = await supabase.from("parent_reports").select("id, report_type").eq("mission_attempt_id", attemptId).maybeSingle();
  check("DB: parent_reports (First Learning Map) row exists", report?.report_type === "unified-first-learning-map");

  // ── 5e. Idempotency: re-complete must NOT double-award ────────────────────────
  const recompleteRes = await fetch(`${API}/api/student/mission/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ missionAttemptId: attemptId, completedAllTasks: true, masteryThresholdMet: true }),
  });
  const recompleteBody = await recompleteRes.json().catch(() => ({}));
  check("idempotency: re-complete returns alreadyCompleted", recompleteBody.alreadyCompleted === true, `status ${recompleteRes.status} ${JSON.stringify(recompleteBody)}`);

  const { data: walletAfter } = await supabase
    .from("moolah_wallets")
    .select("balance")
    .eq("child_profile_id", child.id)
    .single();
  check("idempotency: wallet balance unchanged (still 25)", walletAfter?.balance === 25, `got ${walletAfter?.balance}`);

  const { data: ledgerAfter } = await supabase.from("moolah_ledger").select("id").eq("source_id", attemptId);
  check("idempotency: still one moolah_ledger row", (ledgerAfter?.length ?? 0) === 1, `count ${ledgerAfter?.length}`);

  // ── 6. Fail-closed cases ─────────────────────────────────────────────────────
  const badTokRes = await fetch(`${API}/api/sessions/verify`, {
    method: "POST",
    headers: { Authorization: `Bearer not-a-real-token-${rand}` },
  });
  check("fail-closed: unknown token → 401", badTokRes.status === 401, `status ${badTokRes.status}`);

  const noTokRes = await fetch(`${API}/api/sessions/verify`, { method: "POST" });
  check("fail-closed: missing token → 401", noTokRes.status === 401, `status ${noTokRes.status}`);

  // revoke → 410
  await supabase
    .from("child_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("session_token", token);
  const revokedRes = await fetch(`${API}/api/sessions/verify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  check("fail-closed: revoked session → 410", revokedRes.status === 410, `status ${revokedRes.status}`);

  // un-revoke but expire → 410
  await supabase
    .from("child_sessions")
    .update({ revoked_at: null, expires_at: new Date(Date.now() - 1000).toISOString() })
    .eq("session_token", token);
  const expiredRes = await fetch(`${API}/api/sessions/verify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  check("fail-closed: expired session → 410", expiredRes.status === 410, `status ${expiredRes.status}`);

  // revoked/expired house write must also be denied
  const deniedHouse = await fetch(`${API}/api/student/session/house`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ house: "Lyrion" }),
  });
  check("fail-closed: expired token cannot write house → 410", deniedHouse.status === 410, `status ${deniedHouse.status}`);

  // ── Cleanup (best-effort) ────────────────────────────────────────────────────
  await supabase.auth.admin.deleteUser(parentId).catch(() => {});

  finish();
}

function finish() {
  console.log("\n──────── Hero Slice Phase A — Acceptance Results ────────");
  console.log(results.join("\n"));
  console.log(`\n  ${passed} passed, ${failed} failed`);
  console.log("─────────────────────────────────────────────────────────\n");
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Acceptance run crashed:", err);
  if (results.length) {
    console.log("\nResults captured before crash:");
    console.log(results.join("\n"));
  }
  process.exit(3);
});
