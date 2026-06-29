/**
 * House Calling Ceremony — Data-layer verification script.
 *
 * Exercises the live HTTP endpoints and Supabase DB to verify:
 *   1. Migration 010 tables exist (house_memberships, house_calling_signals)
 *   2. Migration 011 table exists (calibration_snapshots)
 *   3. POST /api/student/session/calibration-signals  → house_calling_signals row created
 *   4. POST /api/student/calibration/snapshot          → calibration_snapshots row created
 *   5. confidence_score in sorting-ceremony range (0.40–0.55)
 *   6. calibration_stage = "sorting-ceremony"
 *   7. signal_sources includes "house_calling_signals"
 *   8. All 7 trait keys are present in trait_scores
 *   9. Calibration snapshot after mission-001 evidence yields "mission-001" stage
 *  10. confidence_score in mission-001 range (0.60–0.75) after evidence
 *
 * Env:
 *   SUPABASE_URL              (default http://127.0.0.1:54321)
 *   SUPABASE_SERVICE_ROLE_KEY (required)
 *   AI_WORKERS_URL            (default http://127.0.0.1:3001)
 *
 * Run from services/ai-workers:  node scripts/house-calling-verify.mjs
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

function finish() {
  console.log("\n──────── House Calling Ceremony — Data-Layer Verification ────────");
  for (const line of results) console.log(line);
  console.log(`\n  ${passed} passed, ${failed} failed`);
  console.log("───────────────────────────────────────────────────────────────────");
  process.exit(failed > 0 ? 1 : 0);
}

const rand = Math.floor(Math.random() * 1e6);

// ── Trait scores used in the trial (all 7 traits exercised) ──────────────────
const TRAIT_SCORES = {
  curiosity: 6,
  courage: 4,
  creativity: 4,
  leadership: 2,
  collaboration: 4,
  resilience: 3,
  independence: 3,
};

async function main() {
  // ── 0. Migration table checks ──────────────────────────────────────────────
  {
    const { error: hmErr } = await supabase.from("house_memberships").select("id").limit(1);
    check("migration 010: house_memberships table exists", !hmErr, hmErr?.message);

    const { error: hcsErr } = await supabase.from("house_calling_signals").select("id").limit(1);
    check("migration 010: house_calling_signals table exists", !hcsErr, hcsErr?.message);

    const { error: csErr } = await supabase.from("calibration_snapshots").select("id").limit(1);
    check("migration 011: calibration_snapshots table exists", !csErr, csErr?.message);
  }

  // ── 1. Seed: create auth user + household + child + academy_identity ────────
  const email = `house-calling+${rand}@l3arn.test`;
  const { data: userData, error: userErr } = await supabase.auth.admin.createUser({
    email,
    password: `Test-${rand}-pw!`,
    email_confirm: true,
    user_metadata: { display_name: "House Test Parent" },
  });
  check("seed: auth user created", !userErr && !!userData?.user?.id, userErr?.message);
  const parentId = userData?.user?.id;
  if (!parentId) { finish(); return; }

  // Wait for trigger: on_auth_user_created → parent_accounts
  const { data: pa } = await supabase
    .from("parent_accounts")
    .select("id")
    .eq("id", parentId)
    .maybeSingle();
  check("seed: parent_accounts row auto-created by trigger", !!pa);

  const { data: household, error: hhErr } = await supabase
    .from("households")
    .insert({ parent_account_id: parentId, name: "House Test Household", state_code: "TX" })
    .select("id")
    .single();
  check("seed: household created", !hhErr && !!household?.id, hhErr?.message);
  if (!household?.id) { finish(); return; }

  const { data: child, error: childErr } = await supabase
    .from("child_profiles")
    .insert({
      household_id: household.id,
      parent_account_id: parentId,
      legal_first_name: "Calling",
      legal_last_name: "Tester",
      date_of_birth: "2015-03-10",
      grade: "4",
    })
    .select("id")
    .single();
  check("seed: child_profile created", !childErr && !!child?.id, childErr?.message);
  if (!child?.id) { finish(); return; }

  const displayName = `Caller${rand}`;
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

  // ── 2. Start session: get a live child session token ─────────────────────────
  const startRes = await fetch(`${API}/api/sessions/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Parent-Id": parentId },
    body: JSON.stringify({ childProfileId: child.id, launchMode: "parent_launched" }),
  });
  const startBody = await startRes.json().catch(() => ({}));
  check("session start: 200", startRes.status === 200, `status ${startRes.status} ${JSON.stringify(startBody)}`);
  const token = startBody.childSessionToken;
  check("session start: returns session token", !!token);
  if (!token) { finish(); return; }

  // ── 3. Save calibration signals (POST /api/student/session/calibration-signals)
  const signalsRes = await fetch(`${API}/api/student/session/calibration-signals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      traitScores: TRAIT_SCORES,
      recommendedHouse: "Novari",
      selectedHouse: "Novari",
      overrideUsed: false,
    }),
  });
  const signalsBody = await signalsRes.json().catch(() => ({}));
  check(
    "calibration signals: 200",
    signalsRes.status === 200,
    `status ${signalsRes.status} ${JSON.stringify(signalsBody)}`,
  );

  // ── 4. Verify house_calling_signals row was written ───────────────────────────
  const { data: hcsRow, error: hcsRowErr } = await supabase
    .from("house_calling_signals")
    .select("*")
    .eq("child_profile_id", child.id)
    .maybeSingle();
  check("DB: house_calling_signals row created", !hcsRowErr && !!hcsRow, hcsRowErr?.message);
  check("DB: recommended_house = Novari", hcsRow?.recommended_house === "Novari");
  check("DB: selected_house = Novari", hcsRow?.selected_house === "Novari");
  check("DB: override_used = false", hcsRow?.override_used === false);

  // Verify all 7 trait keys in the persisted trait_scores
  const storedTraits = hcsRow?.trait_scores ?? {};
  const expectedTraits = ["curiosity", "courage", "creativity", "leadership", "collaboration", "resilience", "independence"];
  const allTraitsPresent = expectedTraits.every((t) => typeof storedTraits[t] === "number");
  check(
    "DB: house_calling_signals.trait_scores has all 7 traits",
    allTraitsPresent,
    `got keys: ${Object.keys(storedTraits).join(", ")}`,
  );

  // ── 5. POST /api/student/calibration/snapshot (after sorting ceremony) ────────
  const snap1Res = await fetch(`${API}/api/student/calibration/snapshot`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  });
  const snap1Body = await snap1Res.json().catch(() => ({}));
  check(
    "calibration snapshot (sorting-ceremony): 200",
    snap1Res.status === 200,
    `status ${snap1Res.status} ${JSON.stringify(snap1Body)}`,
  );
  check(
    "calibration snapshot (sorting-ceremony): stage = sorting-ceremony",
    snap1Body?.stage === "sorting-ceremony",
    `got stage: ${snap1Body?.stage}`,
  );
  const cs1 = snap1Body?.confidenceScore ?? 0;
  check(
    "calibration snapshot (sorting-ceremony): confidence_score in [0.40, 0.55]",
    cs1 >= 0.40 && cs1 <= 0.55,
    `got ${cs1}`,
  );
  check(
    "calibration snapshot (sorting-ceremony): signalSources includes house_calling_signals",
    Array.isArray(snap1Body?.signalSources) && snap1Body.signalSources.includes("house_calling_signals"),
    `got: ${JSON.stringify(snap1Body?.signalSources)}`,
  );

  // ── 6. Verify calibration_snapshots row was persisted ─────────────────────────
  const { data: snapRow, error: snapErr } = await supabase
    .from("calibration_snapshots")
    .select("*")
    .eq("child_profile_id", child.id)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  check("DB: calibration_snapshots row created", !snapErr && !!snapRow, snapErr?.message);
  check(
    "DB: calibration_snapshots.calibration_stage = sorting-ceremony",
    snapRow?.calibration_stage === "sorting-ceremony",
    `got: ${snapRow?.calibration_stage}`,
  );
  check(
    "DB: calibration_snapshots.confidence_score in [0.40, 0.55]",
    (snapRow?.confidence_score ?? 0) >= 0.40 && (snapRow?.confidence_score ?? 0) <= 0.55,
    `got ${snapRow?.confidence_score}`,
  );

  // ── 7. Seed mission evidence events → trigger mission-001 stage ───────────────
  // We seed evidence rows directly via service role (simulating what Mission 001
  // gameplay would write via POST /api/student/mission/evidence).
  const evidenceTypes = [
    "sequence-completion",
    "ai-mistake-check",
    "explanation",
    "reflection",
    "decision-log",
    "structured-replay",
  ];
  // We need a mission_attempt row for the FK.
  // Start mission 001 to create the attempt row.
  const missionStartRes = await fetch(`${API}/api/student/mission/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ missionId: "mission-001" }),
  });
  const missionStartBody = await missionStartRes.json().catch(() => ({}));
  check(
    "mission start (for evidence seeding): 200",
    missionStartRes.status === 200,
    `status ${missionStartRes.status} ${JSON.stringify(missionStartBody)}`,
  );
  const attemptId = missionStartBody?.missionAttemptId;
  check("mission start: returns attempt id", !!attemptId);

  if (attemptId) {
    // Insert evidence events directly via service client (no HTTP round-trip needed
    // for this verification — we're testing the calibration engine reads them, not
    // the evidence endpoint itself which is covered by hero-slice-acceptance.mjs).
    const evidenceInserts = evidenceTypes.map((et) => ({
      child_profile_id: child.id,
      mission_attempt_id: attemptId,
      event_type: et,
      content_json: { seeded: true, verifyScript: "house-calling-verify" },
      no_webcam: true,
      no_face_capture: true,
      no_voice_biometrics: true,
    }));
    const { error: evInsertErr } = await supabase
      .from("learning_evidence_events")
      .insert(evidenceInserts);
    check(
      "DB: evidence events seeded for all 6 types",
      !evInsertErr,
      evInsertErr?.message,
    );

    // ── 8. POST /api/student/calibration/snapshot (after mission-001 evidence) ──
    const snap2Res = await fetch(`${API}/api/student/calibration/snapshot`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    const snap2Body = await snap2Res.json().catch(() => ({}));
    check(
      "calibration snapshot (mission-001): 200",
      snap2Res.status === 200,
      `status ${snap2Res.status} ${JSON.stringify(snap2Body)}`,
    );
    check(
      "calibration snapshot (mission-001): stage = mission-001",
      snap2Body?.stage === "mission-001",
      `got stage: ${snap2Body?.stage}`,
    );
    const cs2 = snap2Body?.confidenceScore ?? 0;
    check(
      "calibration snapshot (mission-001): confidence_score in [0.60, 0.75]",
      cs2 >= 0.60 && cs2 <= 0.75,
      `got ${cs2}`,
    );
    check(
      "calibration snapshot (mission-001): signalSources includes learning_evidence_events",
      Array.isArray(snap2Body?.signalSources) && snap2Body.signalSources.includes("learning_evidence_events"),
      `got: ${JSON.stringify(snap2Body?.signalSources)}`,
    );
    check(
      "calibration snapshot (mission-001): signalSources also includes house_calling_signals",
      Array.isArray(snap2Body?.signalSources) && snap2Body.signalSources.includes("house_calling_signals"),
      `got: ${JSON.stringify(snap2Body?.signalSources)}`,
    );

    // Verify the new (most recent) calibration_snapshots row
    const { data: snap2Row } = await supabase
      .from("calibration_snapshots")
      .select("*")
      .eq("child_profile_id", child.id)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    check(
      "DB: calibration_snapshots (mission-001): calibration_stage = mission-001",
      snap2Row?.calibration_stage === "mission-001",
      `got: ${snap2Row?.calibration_stage}`,
    );
    check(
      "DB: calibration_snapshots (mission-001): confidence_score in [0.60, 0.75]",
      (snap2Row?.confidence_score ?? 0) >= 0.60 && (snap2Row?.confidence_score ?? 0) <= 0.75,
      `got ${snap2Row?.confidence_score}`,
    );
    check(
      "DB: calibration_snapshots (mission-001): trait_profile present (from house calling)",
      snap2Row?.trait_profile !== null && typeof snap2Row?.trait_profile === "object",
      `got: ${JSON.stringify(snap2Row?.trait_profile)}`,
    );
  }

  // ── 9. Fail-closed: snapshot without session token → 401 ─────────────────────
  const noTokenRes = await fetch(`${API}/api/student/calibration/snapshot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  check("fail-closed: no token → 401", noTokenRes.status === 401, `got ${noTokenRes.status}`);

  const badTokenRes = await fetch(`${API}/api/student/calibration/snapshot`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer not-a-real-token" },
    body: JSON.stringify({}),
  });
  check("fail-closed: bad token → 401", badTokenRes.status === 401, `got ${badTokenRes.status}`);

  finish();
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(2);
});
