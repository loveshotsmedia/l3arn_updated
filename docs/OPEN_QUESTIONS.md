# L3ARN Open Questions — Phase 0 Build Wave 1

Aggregated from Agents 4, 5, 6, 7, and 12 across the first parallel build wave.
Each item needs a decision before the relevant Sprint 2 work begins.

---

## Agent 12 — GTM / Beta Ops Open Questions

### OQ-GTM-001 — Community Channel URL
**Source:** Agent 12
**Filed:** 2026-06-17
**File:** `apps/web/src/app/apply/thank-you/page.tsx`

The thank-you page includes a placeholder for a community link (Discord or email list). No URL was confirmed in the spec or CONTEXT.md. The community link must be confirmed and inserted before the beta application goes live.

**Severity:** Medium — does not block beta application submission, but reduces post-application friction.
**Blocks integration?** No — the thank-you page works without it.

---

### OQ-GTM-002 — Hero Slice Demo Video Asset and Hosting URL
**Source:** Agent 12
**Filed:** 2026-06-17
**Files:** `apps/web/src/app/demo/page.tsx`, `apps/web/src/app/page.tsx` (hero section)

The demo page and landing page hero both contain video placeholders. Per ADR-037 (demo-assets) and the Minimum Launch Proof provisional decision, the landing page and 2–4 minute Hero Slice demo video must both be present before paid acquisition opens. The hosting URL for the video is not yet confirmed.

**Severity:** Medium — paid acquisition is blocked until this is ready (per ADR-036 + provisional decision). The landing page and apply form work without it.
**Blocks integration?** No — the pages function without the video. Blocks the paid-acquisition gate per ADR-037.

---

### OQ-GTM-003 — Beta Scoring Weights Confirmation (ADR-041)
**Source:** Agent 12
**Filed:** 2026-06-17
**File:** `apps/web/src/app/apply/actions.ts`

The fit score algorithm in `computeFitScore()` is implemented per the spec and ADR-041. However, ADR-041 is marked **Provisional** in the ADR index. The exact point allocations (especially "pain urgency" which defaults to 10 and "Inner Circle potential" which is currently folded into feedback commitment) should be confirmed by the founding team before the first batch of applications is reviewed.

**Severity:** Low — the scoring works and the founder manual review gate (ADR-042) is the actual acceptance mechanism. Score is informational.
**Blocks integration?** No.

---

### OQ-GTM-004 — Confirmation Email Provider
**Source:** Agent 12
**Filed:** 2026-06-17
**File:** `apps/web/src/app/apply/actions.ts`

The Server Action does not send a confirmation email after application submission. Per the spec, email sending was explicitly out of scope ("document it as a TODO with suggested provider"). Suggested providers: **Resend** (API-first, Next.js friendly) or **SendGrid**. The founder must choose a provider, provision API keys, and wire the email in Sprint 2 before the beta launch is announced at scale.

**Severity:** Medium — applicants receive no confirmation email. They see the thank-you page but get no inbox record.
**Blocks integration?** No — the form works. Blocks announcing the beta at scale.

---

---

## Critical (block Sprint 2 work)

### ADR-047 vs S4 Kill-Switch Conflict
**Source:** Agent 7 (OQ-005)
**Filed:** 2026-06-16

ADR-047 says "no automated kill switch." But S4 severity events (CSAM, explicit self-harm) require immediate automated blocking — by definition these cannot wait for a human review step. The current implementation includes a `KillSwitchTrigger` interface and `NoopKillSwitch` placeholder. The founding team must resolve whether:
- ADR-047 is amended to carve out S4 events, OR
- A "graduated automated response" is defined (auto-block session, human review within N minutes for escalation)

**Blocks:** Any S4 event handling. Currently the NoopKillSwitch just logs.

---

### ADR-054: Retry Count and Fallback Notification Mechanism
**Source:** Agents 6, 7 (OQ-007)
**Filed:** 2026-06-16

ADR-054 is provisional. The 3-retry constant (`AI_MAX_RETRY_ATTEMPTS = 3`) is applied but needs founding-team source confirmation. More importantly, the parent notification mechanism when a safe fallback is used (email, in-app alert, or both) is not yet specified. The Mission Compiler logs a warning but does not send a notification.

**Blocks:** Parent notification flows in Sprint 2.

---

### Model Version Configuration
**Source:** Agent 6 (OQ-003)
**Filed:** 2026-06-16

The Mission Compiler hardcodes `claude-3-5-sonnet-20241022` as the model. This must be an environment variable or ADR before Sprint 2, as model versions change and the choice affects cost, latency, and output quality.

**Recommendation:** Add `ANTHROPIC_MODEL` Railway env var; default to `claude-sonnet-4-6`.

---

## Architecture Decisions Needed

### Vite vs Next.js App Router
**Source:** Agents 4, 5
**Filed:** 2026-06-16

The L3ARN repo now has BOTH structures:
- `apps/web/src/app/` — Next.js 14 App Router (Agent 4, recommended by spec)
- `apps/web/src/pages/` — Vite/React Router component copies (Agent 5 originals, now superseded)

**Decision needed:** Confirm Next.js 14 App Router as the canonical frontend. The `src/pages/student/` directory can be deleted once confirmed. The `src/app/(student)/` routes are the active ones.

---

### Prompt Format: Raw JSON vs. Claude Tool Use (Structured Output)
**Source:** Agent 6 (OQ-002)
**Filed:** 2026-06-16

The Mission Compiler currently asks Claude to return raw JSON in its text response, then calls `JSON.parse()`. A JSON parse error counts as a retry attempt. Using Claude's `tool_use` / structured output would eliminate this failure mode entirely. The tradeoff is slightly more complex prompt engineering.

**Recommendation:** Switch to `tool_use` structured output before Sprint 2 load testing.

---

### `house_affiliation` Field Location
**Source:** Agent 5
**Filed:** 2026-06-16

`ChildProfileSchema` in `identity.schema.ts` does NOT have a `house_affiliation` field. House lives on `AcademyIdentitySchema.house`. The correct Supabase write target for house selection is `academy_identities.house`, not `child_profiles`. The student onboarding write is currently a placeholder console.log.

**Action required:** Agent D (Supabase/Data) confirm: is `academy_identities.house` the correct write path? Is there a `sorting_pending` state needed pre-Sorting Ceremony?

---

### `academy_identities.house` NOT NULL Before Sorting Ceremony
**Source:** Agent 4 (OQ-PARENT-001)
**Filed:** 2026-06-16

`academy_identities.house` is `NOT NULL` in the DB schema, but house is unknown until the Sorting Ceremony. The onboarding flow currently inserts a placeholder `"Novari"`.

**Options:**
- (a) Make `house` nullable with a `sorting_pending` boolean
- (b) Add a `pre_sorting` enum value to `HouseSchema`
- (c) Defer `academy_identities` row creation until after the Sorting Ceremony

---

## Schema Gaps

### `ModerationEventSchema` — Chat vs AI Output Mismatch
**Source:** Agent 7 (OQ-004)
**Filed:** 2026-06-16

`ModerationEventSchema` was originally designed for chat moderation. Agent 7 added `triggerSource` + `aiOutputEnvelopeId` to support AI output events, making `roomId` and `messageType` optional. The discriminated union approach (one schema per trigger type) would be cleaner but is deferred to Phase 1.

**Current state:** Schema extended with `triggerSource` enum. Sentinel values no longer needed.

---

### `CalibrationSignal` Canonical Location
**Source:** Agent 6 (OQ-004)
**Filed:** 2026-06-16

`CalibrationSignal` is now in `packages/shared-types/src/calibration.schema.ts` (resolved in this build wave). The `mission-compiler` package should be updated to import from `@l3arn/shared-types` instead of its local definition.

**Action:** Update `packages/mission-compiler/src/outputs/calibration-signals.ts` to import `CalibrationSignal` from `@l3arn/shared-types` in Sprint 2.

---

### `focus_subjects` Not in DB Schema
**Source:** Agent 4 (OQ-PARENT-005)
**Filed:** 2026-06-16

The curriculum setup onboarding step captures `focusSubjects` in the UI, but `child_permissions` has no `focus_subjects` column. The data is captured but not persisted.

**Action required:** Add `focus_subjects jsonb` column to `child_permissions`, OR create a new `parent_curriculum_prefs` table.

---

## Implementation Placeholders (Wire in Sprint 2)

### Supabase Writes in Student Onboarding
**Source:** Agent 5
All student onboarding Supabase writes (house selection → `academy_identities`, companion selection → `companion_configs`) are `console.log` placeholders. They require an authenticated child session ID and Supabase client scoped to `ChildSessionScope`.

### Parent Notification on AI Fallback
**Source:** Agents 6, 7
When `result.status === "failed-with-fallback"`, the Mission Compiler and safety middleware log a warning but do not notify the parent. The notification mechanism (email, in-app) is TBD per ADR-054.

### `/api/safety/check` Admin Auth Gate
**Source:** Agent 7 (OQ-008)
The `POST /api/safety/check` endpoint is for internal testing only. It must have an admin auth gate before Phase 1 production. Currently it is unprotected.

### Child Session Verification on `/student/enter`
**Source:** Agent 5
The `EnterAcademy` page reads `displayName` from `localStorage`. In production it must verify a valid `child_sessions` row in Supabase before rendering. `localStorage` is a placeholder until the session model (ADR-031) is wired.

### Grade-based `parentVisibilityTier` Default
**Source:** Agent 4 (OQ-PARENT-004)
`parentVisibilityTier` should default to `"full"` for K-5 and `"summary"` for grades 6-8. This logic belongs in a DB trigger or Railway function that fires after `child_profiles` INSERT. Currently defaults to `"full"` for all grades.

### Onboarding State Token
**Source:** Agent 4 (OQ-PARENT-002)
`child_profile_id` is passed through the onboarding flow via `sessionStorage`. This is fragile across tab refreshes. Replace with a server-side onboarding token or URL param in Sprint 2.

### Avatar Move-To Wiring (World Engine)
**Source:** Agent 5
`PlayerAvatar.tsx` has a lerp-based `moveTo` target but it is not yet wired to the floor-click `avatar-move-requested` WorldEvent. Needs a zustand store or imperative ref callback.

### Scene Transition Animations
**Source:** Agent 5
`WorldCanvas` hard-swaps scenes. Fade-in/out transitions are a placeholder for Sprint 2.

### `crypto.randomUUID()` — Node 18+ Requirement
**Source:** Agent 7 (OQ-007)
`moderation-event.creator.ts` uses `crypto.randomUUID()`. The Node engines field in `services/ai-workers/package.json` must be pinned to `>=18.0.0`. Currently only the root `package.json` specifies `node: ">=18.0.0"`.

---

---

## Agent 10 — Evidence & Reports (filed 2026-06-17)

### OQ-A10-001: Migration 005 Number Conflict with supabase_schema.md
**Source:** Agent 10
**Filed:** 2026-06-17
**Severity:** Low — does not block Sprint 2 work; must resolve before next migration is written

`supabase_schema.md` planning section reserved migration 005 for "Chat / Safety / Moderation."
Agent 10 spec directive says the evidence & reports migration must be `005_evidence_reports.sql`.
Migration 003 only created `parent_curriculum_prefs` and `onboarding_sessions` — it did not create
the Evidence/Reports tables that were described as part of "Migration 003" in the planning docs.

**Action required:** Founding team must confirm migration 005 number assignment. Chat/Safety tables
will then take 006. All future agents must reference this resolution before writing a new migration.

**Blocks:** Next migration author — they must know which number is next.

---

### OQ-A10-002: @supabase/supabase-js Missing from ai-workers Dependencies
**Source:** Agent 10
**Filed:** 2026-06-17
**Severity:** Medium — currently worked around with raw fetch calls; must resolve before Sprint 2 production

`services/ai-workers/package.json` does not include `@supabase/supabase-js`. The
`assembleUnifiedFirstLearningMap` function in `services/ai-workers/src/reports/unified-first-learning-map.ts`
uses raw `fetch` calls against the Supabase REST API to read evidence data.

**Action required:** Add `@supabase/supabase-js` to `services/ai-workers/package.json` and replace
the raw fetch helper with a typed Supabase client. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
in Railway environment variables.

**Blocks:** Type safety on Supabase reads in the reports assembler. Also blocks the web frontend
from calling the assembler directly (it should call Railway, not Supabase directly, for this data).

---

### OQ-A10-003: mastery_skills.skill_key Values Not Yet Confirmed
**Source:** Agent 10
**Filed:** 2026-06-17
**Severity:** Medium — blocks mastery_records writes if keys mismatch

The `Mission001EvidenceSpec` entries in `mission-001-evidence-capture.ts` use
`masterySkillTarget` values like `"AI_LITERACY.SORT_BY_ATTRIBUTE"` and `"AI_LITERACY.AI_ERROR_DETECTION"`.
These follow the naming convention from `mastery_skills.code` in Migration 002, but the exact
seeded values have not been confirmed with Agent F (Curriculum Knowledge Base) or the Migration 002
seed data.

**Action required:** Agent F must confirm or correct the `masterySkillTarget` values in
`packages/mission-compiler/src/evidence/mission-001-evidence-capture.ts` before any
`mastery_records` writes happen in Sprint 2.

**Blocks:** Mastery record writes in Sprint 2 Mission 001 integration.

---

### OQ-A10-004: Calibration Score Assembler is Placeholder
**Source:** Agent 10
**Filed:** 2026-06-17
**Severity:** Medium — calibration section in the parent report is static placeholder

The `assembleUnifiedFirstLearningMap` function returns a static calibration score
(score: 62, confidence: 0.6) because `learner_calibration_events` are written by
the learner model pipeline (Agent G) and that pipeline is not yet wired.

**Action required:** Agent G (Learner Model) must write `learner_calibration_events` rows
when Mission 001 calibration signals are captured. Agent 10's assembler in Sprint 2 should
then aggregate those rows to produce a real calibration score.

**Blocks:** Accurate calibration scores in parent reports until Agent G pipeline is wired.

---

### OQ-A10-005: Parent Reports Page Reads mastery_skills Directly
**Source:** Agent 10
**Filed:** 2026-06-17
**Severity:** Low — violates curriculum table isolation (ADR-060) if applied; not yet confirmed

`apps/web/src/app/(parent)/reports/[childId]/page.tsx` does NOT directly query `mastery_skills`
(which is a service-role-only curriculum table per ADR-060). Instead, it reads `mastery_records`
which stores `mastery_skill_id` (a UUID). The `skill_name` field on `MasteryRecordRow` is marked
as optional (`skill_name?: string`) and will show the UUID as a fallback.

**Action required:** Sprint 2 should either:
(a) Store a denormalized `skill_name` in `mastery_records` at write time (service layer), OR
(b) Route the mastery display through the Railway API which can join `mastery_skills` securely.
Currently skill names show as UUIDs in the parent report UI.

**Blocks:** Human-readable skill names in the parent report. Not a blocker for Sprint 1 integration.

---

## Agent 9 — Rewards / Moolah / Companion Growth (filed 2026-06-17)

### OQ-A9-001: supabase_schema.md Migration numbering conflict
**Source:** Agent 9
**Filed:** 2026-06-17
**Severity:** Low — does not block integration; must resolve before next migration author writes

`supabase_schema.md` planning section reserves "Migration 004" for "World State / Living Academy"
(world_state_events, room_state_snapshots, etc.) but the canonical agent migration map assigns 004
to Rewards/Moolah/Companion (agent-09 spec). The schema doc's future migrations will need to be
renumbered after all agent branches merge. This is a doc maintenance issue only.

**Blocks:** Schema doc accuracy. Does not block integration/hero-slice.

---

### OQ-A9-002: moolah_wallets balance update strategy — DB trigger vs service-layer transaction
**Source:** Agent 9
**Filed:** 2026-06-17
**Severity:** Medium — needed before production Moolah awards are issued

`moolah_wallets.balance` and `moolah_wallets.lifetime_earned` must be updated atomically when a
`moolah_ledger` entry is inserted. Migration 004 does NOT include a trigger for this. Options:
- (a) PostgreSQL trigger on `moolah_ledger INSERT` that atomically updates `moolah_wallets`
- (b) Railway backend performs both writes in a single transaction (service layer)

Option (a) provides stronger atomicity guarantees but couples the wallet update to the DB layer.
Option (b) keeps all business logic in the service layer.

**Action required:** Founding team / Agent D decide. Add the trigger or service-layer pattern before Sprint 2 Moolah award flow.
**Blocks:** Production Moolah award flow. Does not block hero-slice demo (no real awards yet).

---

### OQ-A9-003: house_points.house and badges.house should be constrained to valid house values
**Source:** Agent 9
**Filed:** 2026-06-17
**Severity:** Low — validate at service layer until resolved

`house_points.house` and `badges.house` are `TEXT` columns in Migration 004 rather than using the
`public.house_name` ENUM (which includes `pre_sorting`). House points should only be attributed to
real Houses (Valkryn, Lyrion, Novari, Cytrex) — never to `pre_sorting`. A future migration should
add a CHECK constraint or cast to the ENUM on both columns.

**Action required:** Add to a future migration (005 or later) once the house_name enum handling is settled.
**Blocks:** None currently.

---

## ADR Status

| ADR | Topic | Status |
|-----|-------|--------|
| ADR-029 | Model improvement opt-out | Applied — safe default = opted out ✓ |
| ADR-047 | Kill-switch policy | Conflict with S4 — needs founding team resolution |
| ADR-054 | AI retry/fallback | Provisional — retry count and notification TBD |
| ADR-028 | AI model strategy | Model version hardcoded — needs env var |
| ADR-031 | Child session auth | Not yet implemented — placeholder localStorage |
| ADR-006 | Student chat model | Schema updated for AI output events ✓ |

---

## Agent 11 — Founder Mission Control (filed 2026-06-17)

### OQ-A11-001: Founder Email-List Auth Must Be Replaced Before Beta
**Source:** Agent 11
**Filed:** 2026-06-17
**Resolved:** 2026-06-17 (Patch OQ-A11-001)
**Severity:** ~~High~~ RESOLVED

**Resolution:** `NEXT_PUBLIC_FOUNDER_EMAILS` has been fully removed as an authorization authority.
Admin authorization now uses the `admin_users` table (added to Migration 006) via service_role
server-side lookup. All role checks happen in Server Components or API Route Handlers only.
Fails closed on any DB error.

**Files changed:**
- `infra/supabase/migrations/006_founder_mission_control.sql` — `admin_users` table added
- `packages/shared-types/src/admin.schema.ts` — `AdminRoleSchema`, `AdminUserSchema` added
- `apps/web/src/lib/admin-auth.ts` — `getAdminRole`, `isFounder`, `requireAdminRole`, `requireFounder`
- `apps/web/src/app/(admin)/layout.tsx` — email gate replaced with `isFounder(session.user.id)`
- `apps/web/src/app/api/admin/escalations/[id]/review/route.ts` — email gate replaced

**Blocks:** No longer blocks Wave 1 beta launch.

---

### OQ-A11-002: migration 006 number conflict with supabase_schema.md planning section
**Source:** Agent 11
**Filed:** 2026-06-17
**Severity:** Low — does not block integration; must resolve before next migration author writes

`supabase_schema.md` planning section reserves "Migration 006" for "AI Logs / Learning Intelligence"
(`ai_output_audit_logs`, `deidentified_events`, `pseudonymous_key_map`, etc.) and "Migration 007"
for "Admin / Beta Operations" (`admin_users`, `admin_sessions`, `admin_audit_logs`, etc.).

Agent 11 was directed via canonical migration map override to write `006_founder_mission_control.sql`.
The tables created (audit_logs, safety_escalations, founder_sessions) overlap in purpose with
what the schema doc called "Migration 007." The AI Logs domain will need its own migration number
(007 or 008).

**Action required:** Founding team must reconcile migration number assignments across all agents
(Agents 9, 10, 11 all have number conflicts with the schema doc planning section).

**Blocks:** Next migration author. Does not block integration/hero-slice.

---

### OQ-A11-003: SUPABASE_SERVICE_ROLE_KEY not yet in ai-workers package.json dependencies
**Source:** Agent 11
**Filed:** 2026-06-17
**Severity:** Medium — blocks SupabaseSafetyContainment from wiring in production

`services/ai-workers/src/middleware/safety.middleware.ts` now does a conditional
`require("@supabase/supabase-js")` in production when SUPABASE_SERVICE_ROLE_KEY is set.
However, `@supabase/supabase-js` is not yet listed in `services/ai-workers/package.json`.

Per OQ-A10-002, this is a known gap. Agent 11 adds the dependency need here as a duplicate
reference so the fix is captured from both consumers.

**Action required:** Add `"@supabase/supabase-js": "^2.49.0"` to
`services/ai-workers/package.json` dependencies. Set SUPABASE_URL and
SUPABASE_SERVICE_ROLE_KEY in Railway environment variables.

**Blocks:** SupabaseSafetyContainment production wiring. Noop fallback means containment
events are logged but NOT written to DB until this is resolved.

---

### OQ-A11-004: trigger_source not passed explicitly in SafetyContainmentEvent
**Source:** Agent 11
**Filed:** 2026-06-17
**Severity:** Low — does not block functionality; affects data quality in safety_escalations

`SafetyContainmentEvent` (safety-containment.interface.ts) does not include a `trigger_source`
field. `SupabaseSafetyContainment.inferTriggerSource()` infers it from `event.reason` string
content, which is fragile.

**Action required:** Add `triggerSource?: "user-input" | "ai-output" | "companion-response"`
to `SafetyContainmentEvent` interface, and populate it in the safety middleware before calling
`safetyContainment.contain()`.

**Blocks:** Accurate trigger_source values in safety_escalations. Low priority for Phase 1.

---

### OQ-A11-005: RAILWAY_AI_WORKERS_URL and RAILWAY_LOGS_URL not yet in apps/web env vars
**Source:** Agent 11
**Filed:** 2026-06-17
**Severity:** Low — dashboard shows placeholder URLs until configured

The Safety Status section of the Mission Control dashboard links to:
- `RAILWAY_AI_WORKERS_URL/api/safety/status`
- `RAILWAY_LOGS_URL`

These env vars do not yet exist in the apps/web environment configuration.

**Action required:** Add RAILWAY_AI_WORKERS_URL and RAILWAY_LOGS_URL to apps/web
Vercel environment variables and .env.local documentation.

**Blocks:** Live safety status link in dashboard. Does not block any functionality.

---

## Agent 8 — Parent Command Center (filed 2026-06-17)

### OQ-A8-001: Session Launch API Contract
**Source:** Agent 8
**Filed:** 2026-06-17
**Severity:** High — blocks Start Session button wiring in Sprint 2

The "Start Session" button on the parent dashboard is a visual placeholder (`disabled`, `opacity-50`, tooltip "Coming in Sprint 2"). In Phase 1 it must call Railway API `POST /sessions/start`. The contract is not yet specified:
- What body does `POST /sessions/start` accept? (`child_profile_id`? `trusted_device_id`? entry method?)
- What does the response return? (session token? redirect URL? child session ID?)
- Does it use Supabase JWT for auth or a separate Railway service token?

**Action required:** Railway API author (Agent B or C) must publish the sessions API contract
before the parent dashboard Start Session can be wired.

**Blocks:** Start Session button in Phase 1 Sprint 2. No blocker for Phase 0.

---

### OQ-A8-002: parent_curriculum_prefs Upsert Flow During Post-Onboarding Edit
**Source:** Agent 8
**Filed:** 2026-06-17
**Severity:** Medium — affects data integrity during post-onboarding edits

The curriculum page (`/parent/onboarding/curriculum?childId=<uuid>`) in edit mode
currently calls `supabase.from("child_permissions").upsert(...)` for `blocked_topics`
but there is no upsert to `parent_curriculum_prefs` for `focus_subjects` or `approval_mode`.

**Current state:** `parent_curriculum_prefs` table exists (Migration 003) but the curriculum
page does NOT write to it — it only writes to `child_permissions.blocked_topics`.
The `focus_subjects` column used in the dashboard/reports display therefore never gets
populated from the curriculum page.

**Action required:** Wire the curriculum page to also upsert `parent_curriculum_prefs`
(INSERT if missing, UPDATE if present). The `household_id` must be fetched first via
`households.parent_account_id = auth.uid()`. Add `focus_subjects` and `approval_mode`
writes alongside the existing `blocked_topics` write.

**Blocks:** Curriculum snapshot display on the dashboard card (shows "No curriculum preferences
set yet" until this is wired). Medium priority for Sprint 2.

---

### OQ-A8-003: Visibility Tier Override — Should It Trigger Audit Log or Parent Notification?
**Source:** Agent 8
**Filed:** 2026-06-17
**Severity:** Low — data quality and compliance question

When a parent changes `privacy_settings.parent_visibility_tier` via the dashboard settings panel,
the current implementation writes directly to `privacy_settings` via RLS. No audit log entry is
written. No parent notification is sent.

**Questions:**
- Should a `security_audit_events` row be written? (ADR-003 implies all privacy setting changes
  should be audit-logged.)
- Should a notification appear in the parent app acknowledging the change?
- Should `privacy_settings.parent_reviewed_at` be updated on visibility tier change?

**Action required:** Architecture decision before Sprint 2 visibility tier override flow is
considered production-ready.

**Blocks:** Audit compliance. Does not block the UI functionality.

---

### OQ-A8-004: parent_visibility_tier Column Location — privacy_settings vs child_permissions
**Source:** Agent 8
**Filed:** 2026-06-17
**Severity:** Resolved — confirmed from Migration 001 source

Agent 8 spec and the prompt referenced `child_permissions.parent_visibility_tier`.
This column does NOT exist on `child_permissions`. It lives on `privacy_settings.parent_visibility_tier`
(confirmed in Migration 001 SQL, line 581).

Agent 10 already correctly reads from `privacy_settings` in the reports page. Agent 8 dashboard
page also reads from `privacy_settings`. No schema change needed.

**Blocks:** Nothing — resolved. Documented for future agents to avoid the same confusion.

---

### OQ-A8-005: curriculum page uses sessionStorage for childId — fragile across tab refresh
**Source:** Agent 8 (extends OQ-PARENT-002)
**Filed:** 2026-06-17
**Severity:** Medium — affects onboarding reliability

The curriculum page onboarding flow uses `sessionStorage.getItem("onboarding_child_profile_id")`.
Agent 8 added `?childId=<uuid>` support for the post-onboarding edit path (which avoids this issue).
The onboarding flow itself still uses sessionStorage.

**Action required:** Replace sessionStorage with a server-side onboarding token (Migration 003
`onboarding_sessions` table is already created for this purpose) or URL param in Sprint 2.

**Blocks:** Onboarding reliability on tab refresh. Does not block hero-slice demo.
