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
