# Agent 11 — Founder Mission Control

_Spec issued 2026-06-17 | Phase 1 — Beta Operations Dashboard_

---

## Clearance

Agent 11 is cleared to begin. Read Agents 8–10 specs to understand the data surfaces you are monitoring. Your dashboard is founder-only — never parent-facing, never child-facing.

Read first:
- `docs/CONTEXT.md` §10 (Operations, Safety, and Engineering Contracts)
- `docs/architecture.md` §3 (Runtime Components — note: "Founder Mission Control" is listed)
- `docs/sprint_map.md`
- `docs/agent_operating_rules.md` (entire file — the Founder Mission Control section is here)
- `docs/ADR/ADR-000-index.md` (ADR-048: Founder Mission Control, ADR-049: Admin Access Model)
- `docs/supabase_schema.md` §Network / Safety domain
- `docs/supabase_rls_policy_plan.md`
- `packages/shared-types/src/identity.schema.ts`
- `packages/safety/src/kill-switch/safety-containment.interface.ts`
- `packages/safety/src/kill-switch/kill-switch.interface.ts`
- `packages/safety/src/events/moderation-event.creator.ts`
- `packages/safety/src/index.ts`
- `services/ai-workers/src/middleware/admin-auth.middleware.ts`
- `services/ai-workers/src/middleware/safety.middleware.ts`
- `services/ai-workers/src/routes/moderation.route.ts`

---

## Wave 1 Guardrails

1. No admin role may bypass RLS (agent_operating_rules.md).
2. No admin role may view raw child PII without audit logging.
3. Admin access must be traceable to a named person and reason.
4. Admin sessions must time out.
5. Admin actions on child or parent data require a logged justification.
6. Kill switch authority: only founders may invoke. Automated containment for S3/S4 is allowed per ADR-047 amendment — but restoration always requires founder review.
7. This dashboard is internal tooling only — never accessible to parents or children.
8. Add open questions instead of guessing.

---

## Product Decisions to Respect

From CONTEXT.md §10:
- Founder Mission Control (ADR-048): during beta, founders need visibility across enrollment, safety flags, incident status, world-state health, and the escalation queue.
- Admin Access Model (ADR-049): no admin may bypass RLS or view raw child PII without audit logging. Admin sessions time out. Justification required.
- Kill Switch (ADR-047 — amended): founders retain authority; automated containment is allowed for S3/S4 events; restoration always requires review.
- Incident escalation: founder review for serious safety, privacy, model, or child-interaction flags.

---

## Scope

### Task 1 — Migration 006: Audit Log + Admin Tables

File: `infra/supabase/migrations/006_audit_admin.sql`

**audit_logs** (append-only, service role only)
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `event_type TEXT NOT NULL` (e.g. "kill-switch-invoked", "containment-triggered", "admin-access", "visibility-override", "child-profile-modified")
- `actor_role TEXT NOT NULL` (e.g. "founder", "service-role", "safety-containment")
- `actor_id TEXT` (founder auth.users.id, or service name for automated events)
- `target_type TEXT` (e.g. "child_profile", "session", "household")
- `target_id UUID`
- `justification TEXT` (required for founder actions on child/parent data)
- `payload_json JSONB` (de-identified event data — no raw PII)
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- RLS: service role + founder role may insert; no update or delete; founder may SELECT all

**safety_escalations** (S3/S4 events requiring founder review)
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `child_profile_id UUID NOT NULL REFERENCES child_profiles(id)`
- `session_id UUID`
- `severity TEXT NOT NULL` (S3 or S4)
- `trigger_source TEXT NOT NULL` (user-input | ai-output | companion-response)
- `containment_actions TEXT[] NOT NULL` (list of actions taken automatically)
- `violation_summary TEXT NOT NULL` (de-identified: rule names + sanitized excerpt, no raw content)
- `status TEXT NOT NULL DEFAULT 'pending-review'` (pending-review | reviewed-resolved | reviewed-escalated | false-positive)
- `reviewed_by TEXT` (founder user ID)
- `reviewed_at TIMESTAMPTZ`
- `review_notes TEXT`
- `requires_founder_review BOOLEAN NOT NULL DEFAULT true`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- RLS: service role inserts; founder SELECT/UPDATE; no parent access; no child access

**founder_sessions** (for admin auth tracking)
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `founder_user_id TEXT NOT NULL`
- `session_token_hash TEXT NOT NULL UNIQUE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `expires_at TIMESTAMPTZ NOT NULL`
- `last_used_at TIMESTAMPTZ`
- `revoked_at TIMESTAMPTZ`

**Acceptance criteria:**
- [ ] Migration runs cleanly
- [ ] `audit_logs` has no UPDATE or DELETE policies — append-only
- [ ] Parent and child sessions cannot read any row in `safety_escalations`, `audit_logs`, or `founder_sessions`
- [ ] `safety_escalations` has no raw PII in accessible columns

### Task 2 — Real SafetyContainmentTrigger implementation

File: `packages/safety/src/kill-switch/supabase-safety-containment.ts` (new)

Replace `NoopSafetyContainment` for production use. The interface is already defined in `safety-containment.interface.ts`.

Implementation:
1. Accept a Supabase service-role client as a constructor parameter (injected, not imported directly — keep the safety package free of Supabase SDK dependency)
2. On `contain(event)`:
   - Execute each `SafetyContainmentAction` in the event (in Phase 1, log the action; in Phase 2, wire real enforcement)
   - Write to `audit_logs` and `safety_escalations` (via the injected client)
   - Log with level "CRITICAL" to stdout (structured JSON)
   - Resolve the promise (never reject — per the interface contract)
   - Set `requiresFounderReview: true` is a compile-time literal (already enforced by the interface type)

For Phase 1, the "execution" of actions can be logging only — but the record must be written. Phase 2 wires real halt logic (freeze world state via Railway, end session, etc.).

Export from `packages/safety/src/index.ts` alongside `NoopSafetyContainment`.

**Acceptance criteria:**
- [ ] `SupabaseS afetyContainment` implements `SafetyContainmentTrigger` interface
- [ ] Writes to `safety_escalations` and `audit_logs` on every invocation
- [ ] Never throws or rejects
- [ ] `requiresFounderReview: true` is maintained as a literal type (TypeScript enforces this)
- [ ] `NoopSafetyContainment` remains available for dev/test

### Task 3 — Founder Mission Control dashboard

File: `apps/web/src/app/(admin)/mission-control/page.tsx` (new)
File: `apps/web/src/app/(admin)/layout.tsx` (new)

This route group must be protected by Supabase auth + a founder role check. If the authenticated user does not have a founder role marker, redirect to `/`.

Founder role check: use `auth.users` metadata or a `founder_sessions` check. For Phase 1, use a simple check: if `process.env.NEXT_PUBLIC_FOUNDER_EMAILS` contains the logged-in user's email, allow access. Document this is temporary and must be replaced with a proper role system before Wave 1 beta.

**Dashboard sections (all read-only in Phase 1):**

1. **Enrollment overview**
   - Total families enrolled (count of `households`)
   - Total children (count of `child_profiles`)
   - Onboarding completion rate (% with `onboarding_complete = true`)
   - No parent or child PII visible — counts only

2. **Safety escalations queue**
   - List of `safety_escalations` rows with `status = "pending-review"`
   - Show: severity (S3/S4), trigger source, violation summary (de-identified), session ID (UUID only), created_at
   - Per row: "Mark Reviewed" button → sets `status = "reviewed-resolved"`, writes `reviewed_by`, `reviewed_at`, requires `review_notes` text input
   - Never show child legal name, email, or parent contact in this view

3. **Recent audit log**
   - Last 50 `audit_logs` rows ordered by `created_at DESC`
   - Show: event_type, actor_role, target_type, target_id, created_at
   - No `payload_json` expansion in the UI (security: detailed payloads viewed via Supabase dashboard only)

4. **Safety status**
   - Current `GET /api/safety/status` response from Railway (SAFETY_VERSION, platform blocked categories)
   - Link to Railway logs (external URL — don't embed)

**Acceptance criteria:**
- [ ] Route group `(admin)` only accessible if logged-in user is in `NEXT_PUBLIC_FOUNDER_EMAILS`
- [ ] Unauthorized users redirected to `/`
- [ ] Safety escalations queue shows pending reviews
- [ ] "Mark Reviewed" requires review notes input before saving
- [ ] Audit log shows last 50 entries
- [ ] No child legal name, parent email, or household address anywhere on this page
- [ ] All Supabase queries use service role (via Server Component or API route) — never client-side RLS for admin views

### Task 4 — Wire SupabaseS afetyContainment into ai-workers

File: `services/ai-workers/src/middleware/safety.middleware.ts`

Replace `NoopKillSwitch` instantiation with a conditional:
- In production: instantiate a real kill switch and safety containment that writes to Supabase (or use the Noop with a CRITICAL log if Supabase client is not yet wired)
- In development: keep Noop

For Phase 1: keep Noop but add the Supabase service client injection point so Phase 2 can drop it in without restructuring.

Add a `FOUNDER_ALERT_EMAIL` env var to `.env.example` — this is where Phase 2 will send S3/S4 alerts.

**Acceptance criteria:**
- [ ] Safety middleware has a clear injection point for real containment implementation
- [ ] `FOUNDER_ALERT_EMAIL` documented in `.env.example`
- [ ] Existing Noop behavior unchanged in development

---

## What Agent 11 Must NOT Do

- Do not build parent-facing reporting (Agent 10 scope)
- Do not expose any admin route to parent or child users
- Do not store raw AI output or raw chat content in `safety_escalations` — sanitized summaries only
- Do not bypass RLS in any query
- Do not build the full Founder Mission Control alerting system (Phase 2) — Phase 1 is dashboard only

---

## Files Agent 11 May Touch

```
infra/supabase/migrations/006_audit_admin.sql                        — new
packages/safety/src/kill-switch/supabase-safety-containment.ts       — new
packages/safety/src/index.ts                                         — add export
services/ai-workers/src/middleware/safety.middleware.ts              — minor (injection point)
services/ai-workers/.env.example                                     — add FOUNDER_ALERT_EMAIL
apps/web/src/app/(admin)/layout.tsx                                  — new
apps/web/src/app/(admin)/mission-control/page.tsx                    — new
docs/OPEN_QUESTIONS.md                                               — add new OQs
docs/ADR/ADR-000-index.md                                            — if decisions made
```
