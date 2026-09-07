# Agent 20 — Safety Containment Enforcement

_Plan recreated 2026-09-07 from `docs/CODEX_HANDOFF.md` §15 + `docs/AI_HARDENING_BACKLOG.md` | Pre-Beta Hardening Wave, agent 2 of 5_

---

## Clearance

> **HELD 2026-09-07 (founder directive). Agent 20 is NOT cleared to implement.**
>
> Agents 19–23 are folded into the **Astra6 master build dependency graph** (`goal/complete-l3arn`) and none begins until `docs/L3ARN_COMPLETE_BUILD_PLAN.md` exists and has been reviewed. Agent 20 is safety-critical and must appear in that graph as a hard dependency of Agent 21 and of the Agent 23 beta gate — it cannot be scheduled as optional or parallel work.

Within the wave's own ordering, Agent 20 runs **after Agent 19 is complete and verified**.

This agent turns safety containment from **observability** into **enforcement**. Today an S3/S4 event is logged to stdout, `audit_logs` and `safety_escalations`, and the containment actions are recorded but **not executed**. Agent 20 makes them execute.

This is the highest-stakes agent in the wave. It touches the child-safety path, so a confident-but-wrong claim here is the most expensive kind of error in this repo. Nothing in this plan may be reported complete on the strength of unit tests alone.

Read first, in this order:
- `docs/CODEX_HANDOFF.md` — all of it; especially §14 (Safety and Privacy — Automated containment), §15, §23 ("World-write containment", "Moderation persistence"), §24 (Do Not list)
- `docs/AI_HARDENING_BACKLOG.md` — item 3 is this agent's mandate
- `docs/ADR/ADR-000-index.md` — **ADR-047 (as amended June 2026)** is the governing decision; also **ADR-046**, **ADR-048**
- `packages/safety/src/kill-switch/safety-containment.interface.ts` — read the whole file; it enumerates the eight approved actions and the restoration rule
- `packages/safety/src/kill-switch/supabase-safety-containment.ts` — the Phase 1 implementation and its inline Phase 2 TODOs
- `services/ai-workers/src/middleware/safety.middleware.ts` — the call site
- `docs/supabase_schema.md`, `docs/supabase_rls_policy_plan.md`
- `docs/agent_operating_rules.md`

---

## Guardrails

1. **Never overwrite `child_permissions`.** `docs/CODEX_HANDOFF.md` §24 forbids it outright: "Do not overwrite parent permission rows for temporary safety containment." `child_permissions` is the **parent's** source of truth. Containment is a session-scoped override that layers *over* it. A containment that mutates the parent's row destroys parent authority and cannot be cleanly restored.
2. **Stricter wins.** When parent permission and containment override disagree, the runtime resolves to the **more restrictive** value — always, in both directions, with no exception for convenience.
3. **No automated restoration.** Per the interface header and ADR-047: any containment action requires founder/admin review before the affected capability is restored. Do not add a timer, a TTL that self-clears into a permissive state, or a "clear on next session" shortcut.
4. **Do not claim world-write freezing works.** §23 is explicit: there is no complete world-write service enforcement point yet. `freeze-world-state` may be interface-ready only. **Do not report it as enforced.** An honest "interface-ready, not enforced" is required; a false claim of enforcement is a safety-critical lie.
5. **Do not expose founder-only tables to parents.** §24. `safety_escalations` is founder-only. Parent-facing surfacing is **Agent 21's** job, not this one — do not build parent UI here.
6. **Fail closed.** If containment state cannot be read, the runtime restricts rather than permits. §6: "The runtime should fail closed."
7. **Records must still be written even when an action cannot be enforced.** The existing "log even when not enforced" property is load-bearing and must survive this change.

---

## Current State (verified against `main`, 2026-09-07)

**Detection and routing already work.** `services/ai-workers/src/middleware/safety.middleware.ts` classifies violations, determines severity, blocks S2+, creates moderation events, triggers the kill switch on S4, and calls `contain()` for S3/S4 with actions from `buildContainmentActionsForSeverity()`:

- `S4` → `["block-content", "end-session"]`
- `S3` → `["block-content", "force-guided-ai"]`

The middleware already returns a safe fallback response to the client on a safety block (`safety.middleware.ts:325`), so **`block-content` is in practice already enforced at the response boundary.** Confirm this before duplicating it — the gap is the *other* actions, not this one.

**Enforcement is where it stops.** `packages/safety/src/kill-switch/supabase-safety-containment.ts` states it plainly at lines 16–18: "Actions in `event.actions` are logged only (not enforced). Phase 2 will wire real halt logic." Line 101 logs `Phase 1: action logged (not enforced)` per action. DB writes to `audit_logs` and `safety_escalations` do happen and never throw.

**Approved actions** (`safety-containment.interface.ts:33-41`): `block-content`, `end-session`, `force-quick-chat`, `force-guided-ai`, `disable-audio`, `disable-evidence`, `freeze-moolah`, `freeze-world-state`.

**Relevant parent-owned columns** in `child_permissions` (migration `001_identity_household_consent.sql:514`) — the values containment must override *without writing*: `chat_mode`, `audio_enabled`, `ai_interaction_enabled`, `allowed_delivery_modes`, `blocked_topics`.

**`safety_escalations`** (migration `006_founder_mission_control.sql:112`) already carries `severity`, `trigger_source`, `containment_actions`, `violation_summary` and a `status` lifecycle (`pending-review` → `reviewed-resolved` / `reviewed-escalated` / `false-positive`). That status lifecycle is the natural hook for founder-reviewed restoration — use it rather than inventing a parallel one.

---

## Approved Design

From `docs/CODEX_HANDOFF.md` §15, this design is **already approved** — implement it, do not redesign it:

- Containment **layers over** `child_permissions`; it does not overwrite the parent source of truth.
- Use a **session-scoped override model**.
- Planned table: **`child_containment_state`**.
- The runtime resolves **"stricter wins"**.
- Restoration **clears the containment override**.
- **Founder/admin review is required** before restoration.

---

## Scope

### Task 1 — Migration: `child_containment_state`

New file: `supabase/migrations/014_child_containment_state.sql` (confirm 014 is free — `013_world_holdings.sql` is the latest on `main`; if another agent has taken 014, take the next number and say so).

Session-scoped containment overrides, one active row per (child, session). Suggested shape — adapt to the repo's existing migration conventions rather than importing a foreign style:

- `id uuid primary key default gen_random_uuid()`
- `child_profile_id uuid not null references public.child_profiles(id) on delete cascade`
- `session_id uuid` — nullable: an S4 event may land with no known session, and containment must still apply
- `severity text not null check (severity in ('S3','S4'))`
- `containment_actions text[] not null`
- `active boolean not null default true`
- `safety_escalation_id uuid references public.safety_escalations(id)` — ties the override to the founder-review record that must clear it
- `created_at timestamptz not null default now()`
- `cleared_at timestamptz`, `cleared_by_admin_account_id uuid` — both null while active
- RLS: `enable` + `force`, matching `child_permissions` and `safety_escalations`. **service_role INSERT/UPDATE; founder/safety-admin SELECT/UPDATE; no parent or child access to this table.** Parent-facing notices are Agent 21's separate surface.
- Index on `(child_profile_id, active)` — this is the runtime resolution hot path.
- A partial unique index on `(child_profile_id, session_id) where active` if the repo's conventions allow, to prevent duplicate active overrides.

Add the table to `docs/supabase_schema.md` and the policy to `docs/supabase_rls_policy_plan.md` in the same commit.

### Task 2 — Write the containment override on S3/S4

File: `packages/safety/src/kill-switch/supabase-safety-containment.ts`

Inside `contain()`, after the existing `audit_logs` and `safety_escalations` writes, insert the `child_containment_state` row.

- **Preserve the existing "never throws" property.** The stdout CRITICAL log happens first and DB failures are caught and logged. A failure to write the containment row must not crash the request — but it must log at CRITICAL and, because the runtime fails closed, an unwritable override is a **more** restrictive situation, not a permissive one. Decide and document how the runtime behaves when the override write fails; do not leave it implicit.
- Link the new row to the `safety_escalations` row created in the same call so restoration has a review record to hang off.
- Replace the `Phase 1: action logged (not enforced)` log (line 101) with an honest per-action status: `enforced`, or `interface-ready-not-enforced` for `freeze-world-state`. **Do not label an action enforced that isn't.**
- Update the file header (lines 16–18, 24) so it no longer says actions are logged only. A stale header on a safety file is how the next agent draws a false conclusion.

### Task 3 — Runtime resolution: "stricter wins"

New: a single resolution function — e.g. `packages/safety/src/kill-switch/resolve-effective-permissions.ts`.

It takes the parent's `child_permissions` row plus any active `child_containment_state` rows and returns the **effective** permissions. Every runtime read that currently reads `child_permissions` directly must go through this function instead.

Per-action mapping, stricter-wins:

| Action | Effect on effective permissions |
|---|---|
| `block-content` | already enforced at the response boundary in `safety.middleware.ts` — verify, do not duplicate |
| `end-session` | session marked terminated; child session verify/refresh fails closed |
| `force-quick-chat` | `chat_mode` → `quick-chat-only` (never loosen if the parent set something stricter) |
| `force-guided-ai` | AI restricted to guided mode |
| `disable-audio` | `audio_enabled` → `false` (one-directional: never `true`) |
| `disable-evidence` | evidence capture off for the session |
| `freeze-moolah` | Moolah transactions rejected; ledger stays source of truth, no balance rewrite |
| `freeze-world-state` | **interface-ready only** — see Guardrail 4 |

**The direction of the merge is the whole point.** Containment may only ever restrict. If the parent already set `chat_mode = 'quick-chat-only'` and containment says `force-quick-chat`, the result is unchanged. If the parent allowed full chat, containment restricts it. Containment must never be able to *grant* a capability the parent withheld — that is the failure mode that would turn a safety feature into a privilege-escalation bug.

Find every current reader of `child_permissions` before writing this (`git grep -n "child_permissions"` across `services/` and `apps/`) and route each one through the resolver. A single missed reader is an unenforced containment.

### Task 4 — Enforce `end-session`

Files: `services/ai-workers/src/lib/child-session.ts`, `services/ai-workers/src/routes/sessions.route.ts`

`POST /api/sessions/start` and `/api/sessions/verify` must fail closed while an active containment carries `end-session`. Child sessions are backend-mediated (§6), so this is the correct and sufficient enforcement point — do not attempt to enforce session termination in the browser, and never trust `localStorage` as identity authority (§24).

### Task 5 — Founder-reviewed restoration

Restoration clears the override; it is never automatic.

- An admin action (founder or safety admin only) sets `child_containment_state.active = false`, stamps `cleared_at` / `cleared_by_admin_account_id`, and moves the linked `safety_escalations.status` off `pending-review`.
- No TTL, no auto-expiry, no clear-on-next-session.
- Surface it in Founder Mission Control (`apps/web/src/app/(admin)/mission-control/page.tsx` already imports `SafetyContainment`), gated to founder/safety-admin. Keep this minimal — read the existing access-control pattern there and reuse it rather than inventing a second one.
- Write an `audit_logs` entry for every restoration. Restoring a safety containment is exactly the kind of critical write the audit trail exists for.

### Task 6 — Tests

Per `docs/CODEX_HANDOFF.md` §22, safety is a required test category.

1. **Stricter-wins matrix** — for each of the eight actions, the effective permission is the more restrictive of parent and containment, in both orderings. Include the negative case explicitly: containment can never grant what the parent withheld.
2. **S3 and S4 end-to-end** — an S3 and an S4 event each write `audit_logs` + `safety_escalations` + `child_containment_state`, and the resolver reflects the actions.
3. **`child_permissions` untouched** — assert the parent's row is byte-identical before and after containment. This is the regression test for the §24 prohibition and is the most important test in this task.
4. **Session fails closed** — `sessions/start` and `sessions/verify` refuse while an `end-session` containment is active.
5. **No automated restoration** — an active containment stays active with no admin action, across a new session and across process restart.
6. **Restoration requires founder/admin** — a parent-role and a non-admin caller are both rejected.
7. **Write-failure path** — a simulated `child_containment_state` insert failure still logs CRITICAL and does not crash the request.

---

## Verification

Unit tests are necessary and **not sufficient** for this agent.

1. Full suite green, including all seven new tests.
2. **Live S3 induction** against the deployed stack: trigger a real S3, then confirm in Supabase that `audit_logs`, `safety_escalations` and `child_containment_state` rows all exist, and that `child_permissions` is unchanged.
3. **Live enforcement observation** — with that containment active, confirm the restricted capability is actually refused by the runtime (not merely recorded). Observe the real refusal, do not infer it.
4. **Live restoration** — clear via the founder path; confirm the capability returns and an `audit_logs` entry was written.
5. **RLS verification before deploy** — confirm as a parent-role user and as an anonymous user that `child_containment_state` is not readable. Verify against the real policies, not the migration text.
6. State explicitly which actions are **enforced** and which are **interface-ready only**.

---

## Definition of Done

- [ ] `014_child_containment_state.sql` applied, with RLS enabled + forced and founder-only read
- [ ] Schema and RLS docs updated in the same commit
- [ ] `contain()` writes the containment override and still never throws
- [ ] Per-action logging reports honest `enforced` vs `interface-ready-not-enforced` status
- [ ] Stale "logged only" header comments corrected in `supabase-safety-containment.ts`
- [ ] Single stricter-wins resolver exists and **every** `child_permissions` reader routes through it
- [ ] `child_permissions` provably never written by containment
- [ ] `end-session` fails closed at `/api/sessions/start` and `/api/sessions/verify`
- [ ] Founder/admin-only restoration clears the override and writes an audit entry
- [ ] No TTL, no auto-expiry, no automated restoration anywhere
- [ ] `freeze-world-state` documented as interface-ready, **not** claimed as enforced
- [ ] Seven new tests green; full suite green
- [ ] Live S3 induction, live enforcement, live restoration and RLS check all observed
- [ ] `docs/AI_HARDENING_BACKLOG.md` item 3 checked off with the commit SHA

---

## Open Questions to File (do not guess)

- **Containment with no `session_id`.** An S4 event can arrive without a known session. Does the override then apply child-wide until reviewed? This plan assumes yes (fail closed, child-wide), which is the safe reading — but it is an assumption, and it is the one most likely to surprise a parent, so get it confirmed rather than shipped silently.
- **`moderation_events` persistence.** §23 records that these are "not fully persisted in the intended mature form today." Agent 20 should not fix that as scope creep, but should state whether containment depends on it.
- **`freeze-moolah` enforcement point.** The Moolah ledger is source of truth and balances are updated by DB logic. Confirm whether the freeze belongs in the DB function or the service layer before implementing — the wrong choice here is silently bypassable.
- **Parent notification.** Whether and how a parent learns a containment occurred is **Agent 21's** decision, and §15 records that final parent-facing copy requires founder sign-off. Do not pre-empt it here.
