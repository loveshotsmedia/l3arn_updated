# Agent 21 — Parent Safety Flags + Report Trust

_Plan recreated 2026-09-07 from `docs/CODEX_HANDOFF.md` §15 + `docs/AI_HARDENING_BACKLOG.md` | Pre-Beta Hardening Wave, agent 3 of 5_

---

## Clearance

> **HELD 2026-09-07 (founder directive). Agent 21 is NOT cleared to implement.**
>
> Agents 19–23 are folded into the **Astra6 master build dependency graph** (`goal/complete-l3arn`) and none begins until `docs/L3ARN_COMPLETE_BUILD_PLAN.md` exists and has been reviewed.
>
> **One exception, and it is a live defect, not new work:** the misleading copy identified in *Required Acceptance Criterion A0* below is on production **now**, telling parents something untrue. Removing or replacing that one string does not depend on Agent 20, Agent 21, or the build plan. It may be done immediately as an isolated copy fix on founder approval; everything else in this plan waits.

Agent 21 is otherwise sequenced **after Agent 20 is complete and verified**. Agent 21 surfaces to parents the events Agent 20 makes real; running it first would build a UI over behaviour that does not yet exist.

This agent closes the trust gap in the parent report: the First Learning Map currently shows mastery, calibration, rewards and companion progress, but a parent has **no way to learn that a safety event occurred**. It also fixes a subtler trust problem — when the AI validation path falls back, the parent is currently told nothing, and silence in a safety-adjacent product reads as concealment.

Read first, in this order:
- `docs/CODEX_HANDOFF.md` — all of it; especially §13 (First Learning Map), §14 (Safety administration), §15, §24 (Do Not list)
- `docs/AI_HARDENING_BACKLOG.md` — item 4 is this agent's mandate
- `docs/HERO_SLICE_PHASE_C_HANDOFF.md`
- `apps/web/src/app/(parent)/reports/[childId]/page.tsx` — read the whole file, including the header doc comment
- `docs/ADR/ADR-000-index.md` — ADR-046, ADR-047 (amended), ADR-048
- `docs/agent_operating_rules.md`

---

## Required Acceptance Criterion A0 — the report must not claim a surface it does not have

_Added 2026-09-07 (founder directive). This is a **required acceptance criterion**, not a nice-to-have, and it is tracked as a live blocker._

**The rule:** the parent report must **never** claim that safety-flagged events are surfaced unless the page is actually bound to the parent-safe safety-notice data source.

**The current violation.** `apps/web/src/app/(parent)/reports/[childId]/page.tsx:752-753` renders, for the `safety-override` visibility tier:

> "Only safety-flagged events are surfaced."

Nothing in that file ever fetches a safety flag — `git grep -n "safety" -- 'apps/web/src/app/(parent)/reports/*'` returns only the tier type declaration (`:101`, `:228-229`) and this label copy. The page makes a factual claim to a parent about safety visibility that the code does not honour. In a child-safety product that is worse than showing nothing: a parent reading it concludes they are being shown safety events, and their silence therefore means none occurred.

**Required sequence:**

1. **Until the notice surface exists — remove or replace the misleading copy.** Replace it with language that describes what the tier actually does today and makes no claim about safety flags, or remove the claim entirely. Do not soften it and leave the promise intact; a hedge is still a claim.
2. **After Agent 21 lands — the copy may return, but only if** the parent-safe safety-notice data is genuinely fetched and rendered on that page. Binding to the data source is the precondition for the sentence existing at all.
3. **Never satisfy this by pointing the page at `safety_escalations`.** That table is founder-only (`docs/CODEX_HANDOFF.md` §24: "Do not expose founder-only safety tables directly to parents"). The correct source is the separate parent-facing notice surface built in Task 1 — reading the founder table would resolve the copy/data mismatch by creating a far worse privacy breach.

**Verification:** load the report as a real parent on the `safety-override` tier and read the rendered text. Confirm that every safety-visibility claim on screen corresponds to data actually fetched on that request. Verify by observing the page, not by reading the component.

---

## Guardrails

1. **Parent-facing notices are a separate surface from founder-only `safety_escalations`.** Do not query the founder table from a parent route and do not relax its RLS. `docs/CODEX_HANDOFF.md` §24: "Do not expose founder-only safety tables directly to parents."
2. **Do not expose raw moderation internals.** No rule names, no matched-topic strings, no severity codes (`S3`/`S4`), no raw AI output, no raw chat content, no classifier confidence. A parent sees *what happened and what to do*, never the machinery.
3. **Routine validation fallback uses calm quality language.** A Zod validation failure that fell back to the safe static mission is a **quality** event, not a safety event. Language like "we used a standard version of this mission" — never alarming, never implying a safety incident occurred.
4. **True serious events may use "paused / reviewing" language.** Reserve this register for actual S3/S4 containment. Do not blur the two: making routine fallbacks sound serious trains parents to ignore notices, and making serious events sound routine is worse.
5. **Final parent-facing copy requires founder sign-off.** §15 states this explicitly. Ship the copy as clearly-marked placeholder text with a `<!-- COPY: awaiting founder sign-off -->` marker and list every string in the completion report for Cameron to approve. **Do not treat your own copy as approved.**
6. **Report stays private to the parent by default** (§13). No new sharing surface.
7. **Respect the existing visibility tiers.** The report already implements `full` / `summary` / `safety-override` (`page.tsx:101`, `:228-229`, `:752-753`). Extend that model; do not replace it.
8. No new product scope (§24).

---

## Current State (verified against `main`, 2026-09-07)

**The report exists and is a single large client-facing page:** `apps/web/src/app/(parent)/reports/[childId]/page.tsx`. It already:
- reads `parent_visibility_tier` from privacy settings, typed `"full" | "summary" | "safety-override"` (`:101`, `:228-229`), defaulting to `"full"`
- renders tier-explanation copy including "Only safety-flagged events are surfaced." for the `safety-override` tier (`:752-753`)
- shows mastery (joined to `mastery_skills.parent_friendly_name`), calibration, XP (from `xp_events.xp_amount`), rewards and a human-readable companion name — all four verified fixed 2026-06-28

**The gap:** the tier machinery names safety-flagged events, but **nothing in the page ever fetches or renders a safety flag.** `git grep -n "safety" -- 'apps/web/src/app/(parent)/reports/*'` returns only the tier type and its label copy. A parent on the `safety-override` tier is currently told that only safety-flagged events are surfaced, and then shown none — the copy promises a surface that does not exist. That inconsistency is itself a trust defect and is worth fixing even before any real event occurs.

**What Agent 20 will have produced:** `child_containment_state` rows (founder-only RLS), `safety_escalations` rows (founder-only), `audit_logs` entries. **None of these are parent-readable**, which is why this agent needs its own parent-facing surface rather than a query.

**Fallback signal already available:** the AI audit envelope distinguishes `content_source=ai` from the safe-fallback path, and `AIOutputResult` carries the failed-with-fallback branch with attempt records. That is the input for the calm quality notice — no new detection work is required.

---

## Approved Design

From `docs/CODEX_HANDOFF.md` §15 — implement this, do not redesign it:

- Parent-facing notices are **separate** from founder-only `safety_escalations`.
- Do **not** expose raw moderation internals.
- Routine validation fallback → **calm quality language**.
- True serious events → may use **"paused / reviewing"** language.
- Final parent-facing copy → **requires founder sign-off**.

---

## Scope

### Task 1 — The parent-facing notice surface

The core decision: parents need a notice record that is **derived from** safety events but **owned separately**, carrying only de-identified, parent-appropriate content.

Recommended approach — a new `parent_safety_notices` table (migration `015_parent_safety_notices.sql`; confirm the number is free after Agent 20 takes 014):

- `id uuid primary key default gen_random_uuid()`
- `child_profile_id uuid not null references public.child_profiles(id) on delete cascade`
- `parent_account_id uuid not null references public.parent_accounts(id)` — the RLS anchor
- `notice_kind text not null check (notice_kind in ('content-quality-fallback','session-paused-for-review'))` — exactly two registers, matching guardrails 3 and 4. Adding a third kind is a product decision, not an implementation choice.
- `occurred_at timestamptz not null default now()`
- `session_id uuid`
- `acknowledged_at timestamptz`
- `source_escalation_id uuid` — a **soft** reference for founder-side correlation. Do not expose it through any parent-facing API response; it exists so a founder can join, not so a parent can.
- **No** severity code, **no** rule names, **no** matched topics, **no** raw content columns. If the column cannot be shown to a parent, it does not belong in this table.
- RLS: `enable` + `force`. Parent SELECT/UPDATE-acknowledge **only own children**; service_role INSERT; no child access.
- Index on `(parent_account_id, occurred_at desc)`.

Write the notice at the same moment the source event is recorded: `session-paused-for-review` from Agent 20's `contain()`, and `content-quality-fallback` where the fallback result is persisted. A notice write must never block or fail the child's session — same never-throws discipline as `contain()`.

Update `docs/supabase_schema.md` and `docs/supabase_rls_policy_plan.md` in the same commit.

**If a suitable parent-facing table already exists** after Agent 20 lands, use it rather than adding a second one — check first, and say which you chose and why.

### Task 2 — Render notices in the First Learning Map

File: `apps/web/src/app/(parent)/reports/[childId]/page.tsx`

- Fetch this child's `parent_safety_notices` alongside the existing report queries.
- Render a distinct section — placed so it is visible without hunting, but not so it dominates a report whose purpose is celebrating learning. A parent whose child had a normal session should see either nothing or a quiet all-clear.
- **Two visually distinct registers**, mapped to `notice_kind`:
  - `content-quality-fallback` → calm, neutral, informational. Not red, not a warning icon.
  - `session-paused-for-review` → serious but non-alarming; states that the session was paused and is being reviewed, and what the parent should expect next.
- Respect the visibility tiers: on `safety-override`, notices are the primary content — which finally makes the existing `:752-753` copy true.
- Show nothing rather than an empty container when there are no notices.
- Allow acknowledgement (sets `acknowledged_at`). Acknowledging a notice **must not** clear a containment — restoration is founder/admin-only per Agent 20. Do not wire the parent's acknowledgement to anything in the containment lifecycle.

### Task 3 — Copy, staged for founder sign-off

Draft every string, mark it unapproved, and list it for Cameron.

Direction (drafts, not approved):
- `content-quality-fallback`: "We used our standard version of this mission to keep the quality consistent." Calm, no apology, no safety framing.
- `session-paused-for-review`: "This session was paused and is being reviewed. We will follow up before the next session." Serious, specific about what happens next, no detail about what triggered it.
- All-clear (optional): "No safety flags in this session."

Put the drafts in one module (e.g. `apps/web/src/app/(parent)/reports/[childId]/notice-copy.ts`) so the founder can review every parent-facing string in one file rather than hunting through JSX. Head it with the `<!-- COPY: awaiting founder sign-off -->` marker.

### Task 4 — Fix the report header doc comment

`page.tsx:18` documents the tiers including `safety-override` as "all sections shown including…". Once notices exist, update the header to describe what each tier actually shows. This is small and easy to skip; skipping it leaves the next agent reading a description that no longer matches the code.

### Task 5 — Tests

1. **RLS isolation** — parent A cannot read parent B's child's notices. Verify against real policies, as a real parent-role user, not by reading the migration.
2. **No internals leak** — assert the parent-facing payload contains no `S3`/`S4`, no rule names, no matched topics, no raw content, and no `source_escalation_id`. Assert on the actual serialized response, not on the type.
3. **Register separation** — a fallback notice renders calm copy; a containment notice renders paused/reviewing copy; they never render each other's.
4. **Tier behaviour** — `full`, `summary` and `safety-override` each render notices per spec.
5. **Empty state** — a clean session renders no notice block (or the all-clear), never a broken empty container.
6. **Acknowledgement is inert on containment** — acknowledging leaves `child_containment_state.active` true. This is the important negative test.
7. **Notice write never breaks the session** — a simulated notice-insert failure does not fail mission generation or the child session.

---

## Verification

1. Full suite green, including all seven new tests.
2. **Live end-to-end**: induce a real S3 (as in Agent 20's verification), then load the parent report as the real parent and observe the notice rendered. Screenshot it.
3. **Live fallback case**: force a validation fallback, load the report, confirm the calm quality notice — and confirm it does **not** read as a safety event.
4. **Cross-parent isolation live**: log in as a different real parent account and confirm the notice is absent. Observe it, do not infer it.
5. **Copy review**: hand Cameron the full list of parent-facing strings for sign-off. This agent is **not** done until that sign-off happens — record it as an explicit outstanding item if it has not.
6. Headless-only browser verification.

---

## Definition of Done

- [ ] **A0: no safety-visibility claim appears in the report unless that request actually fetched parent-safe notice data** — misleading `safety-override` copy removed or replaced in the interim, and restored only once bound to the real data source
- [ ] Parent-facing notice surface exists, separate from `safety_escalations`, with RLS enabled + forced
- [ ] Schema and RLS docs updated in the same commit
- [ ] Notices written from both sources (containment, validation fallback) without ever blocking the child session
- [ ] Report renders two visually distinct registers, tier-aware, with a clean empty state
- [ ] No severity codes, rule names, matched topics, raw content or escalation ids in any parent-facing payload
- [ ] Parent acknowledgement provably cannot clear a containment
- [ ] Report header doc comment matches actual tier behaviour
- [ ] All parent-facing copy isolated in one module and marked awaiting sign-off
- [ ] Seven new tests green; full suite green
- [ ] Live S3 notice, live fallback notice and live cross-parent isolation all observed with screenshots
- [ ] **Founder copy sign-off obtained** — or recorded as outstanding with the exact strings listed
- [ ] `docs/AI_HARDENING_BACKLOG.md` item 4 checked off with the commit SHA

---

## Open Questions to File (do not guess)

- **Should a parent be notified outside the report?** Email/SMS on a `session-paused-for-review` event is arguably the right behaviour for a serious safety event, but it is new product scope and §24 forbids adding scope during this wave. File it; do not build it.
- **Should the parent see anything at all for a routine fallback?** There is a real argument that a quality fallback is internal noise and telling parents erodes confidence without helping them. The opposite argument is that silence in a safety-adjacent product reads as concealment. This plan assumes disclose-calmly; it is a founder decision, not an implementation one.
- **Notice retention.** How long do notices persist in the report — the session, the current report, or forever? Assumed: they persist with the report. Needs confirming.
- **Does the `safety-override` tier have a live consumer today?** If no real parent is on that tier yet, its behaviour cannot be verified against production data — say so rather than claiming verification.
