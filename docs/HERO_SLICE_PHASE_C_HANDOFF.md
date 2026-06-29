# Hero Slice — Phase C Handoff (Founder Mission Control)

**For:** the agent picking up Phase C in a fresh context window.
**Branch:** `integration/hero-slice` (already pushed to origin). Work on this branch.
**Status when written:** Phase A + B complete and verified (59/59 acceptance), pushed. Phase C not started.
**Date:** 2026-06-28.

> Read this whole document first. Then read the files in §11 before writing any code.
> Do not trust prior training data about this repo — verify against the files cited here.

---

## 1. What the Hero Slice is (the product goal)

One complete working path: **a parent launches a child session → the child enters L3ARN, gets sorted into a House, picks a companion, completes Mission 001, earns rewards → the parent sees proof of learning. The founder can observe all of it.**

Phases A and B built and verified everything up to "parent sees proof." **Phase C is the founder's observability layer** — the last piece.

---

## 2. Phase C mission (your job)

Expose Hero Slice operational state in **Founder Mission Control** so the founder can see live activity. Today the console shows only: enrollment counts, the safety-escalation queue, and the recent audit log. You will **add** read-only panels for the data Phases A/B now produce.

### Acceptance criteria (from the original Agent 6 spec)
1. Founder can see **active child sessions**.
2. Founder can see **Mission 001 starts / completions**.
3. Founder can see **failed AI validation / fallback events**.
4. Founder can see **reward ledger health**.
5. Founder can see **evidence / report creation**.
6. Founder can see **safety escalations** (already done — keep it).
7. **Non-founder cannot access** Mission Control (already enforced — verify it still holds).
8. **Kill / safety containment actions are logged** (already done via `SupabaseSafetyContainment` → `audit_logs` — verify, don't rebuild).

This is **observability, additive, read-only**. You are not changing the child or parent flows. Scope discipline: resist rebuilding what already works.

---

## 3. Current verified state (do NOT redo)

Phase A + B are done, committed, and **verified end-to-end against a live local Supabase stack** (`services/ai-workers/scripts/hero-slice-acceptance.mjs`, run via `npm run test:acceptance` in `services/ai-workers`, **59/59 passing**).

What exists and works:
- **Session/identity:** `POST /api/sessions/start`, `POST /api/sessions/verify` (Bearer token, fail-closed). `/student/enter` verifies before rendering identity.
- **Sorting/companion:** `POST /api/student/session/house` (writes `academy_identities.house`), `POST /api/student/session/companion` (upserts `companion_profiles`).
- **Mission runtime:** `POST /api/student/mission/start` (compiles Mission 001, Zod-validated, **static fallback** when AI unavailable → records `mission_attempts.content_source = 'ai' | 'fallback'`), `POST /api/student/mission/complete` (idempotent pipeline → rewards + evidence + mastery + First Learning Map).
- **Tables produced:** `child_sessions`, `academy_identities`, `companion_profiles`, `mission_attempts`, `moolah_ledger` (+ `moolah_wallets` via trigger), `xp_events`, `house_points`, `child_badges`, `companion_growth_events`, `learning_evidence_events`, `mastery_records`, `parent_reports`.
- **Migrations applied locally:** `001`–`009`. (`008` = mission_attempts + companion_profiles; `009` = explicit `service_role` grants — see §8.)

Commits on the branch: `ff0912c`, `fa9d383`, `2636dbf` (Phase A), `cf16544` (Phase B), `6a0a619` (polish).

---

## 4. Architecture & repo orientation

- **Monorepo root in the working tree:** `e:\L3ARN\L3arn_repo` (this is the dir you work in).
- **Git root is one level up:** `E:\L3ARN`. `git` commands resolve automatically, but note paths in `git status` are prefixed with `L3arn_repo/`.
- **Frontend:** in-repo **Next.js App Router** at `apps/web` (deployed on Vercel). Route groups: `(parent)`, `(student)`, `(admin)`. **NOTE:** older project notes call the frontend "Lovable" — that is wrong for this repo; the real frontend is `apps/web`.
- **Backend:** Express service `services/ai-workers` (Railway). The student app calls it cross-origin via `NEXT_PUBLIC_RAILWAY_API_URL`.
- **DB/Auth:** Supabase. Migrations in **`supabase/migrations/`** (top-level). ⚠️ `infra/supabase/migrations/` is empty/stale — ignore it.
- **Shared contracts:** `packages/shared-types` (Zod + types, built via tsup to `dist`). `packages/mission-compiler` (compiler + reward/skill/evidence logic, built to `dist`).
- **Founder console lives in the frontend, server-side:** `apps/web/src/app/(admin)/mission-control/page.tsx` — a **React Server Component** that queries Supabase directly with the **service-role** client. It does NOT call Railway. **This is the key architectural fact for Phase C: you add server-side queries to this page, you do not add Railway endpoints.**

---

## 5. How Founder Mission Control works today (the pattern to extend)

File: `apps/web/src/app/(admin)/mission-control/page.tsx` (Server Component).

- Auth is enforced upstream by `apps/web/src/app/(admin)/layout.tsx` → `isFounder()` in `apps/web/src/lib/admin-auth.ts` → reads `admin_users` (role = `founder`, `revoked_at IS NULL`), **fail-closed** (any error → redirect home). Do not weaken this.
- Data is fetched by `async function fetchX(): Promise<DeIdentifiedShape>` helpers, each calling `createSupabaseServiceRoleClient()` from `@/lib/supabase-server`, then awaited together in `Promise.all` inside the default export and rendered as sections.
- **De-identification is NON-NEGOTIABLE** (see the file's header comment): no legal name, no parent email, no address; `child_profile_id` / `session_id` shown as **UUID only**; `audit_logs.payload_json` is never expanded in the UI.

### Your additions (follow the exact same pattern)
Add new `fetchX()` helpers + new render sections to the SAME page. Suggested:

| Panel | Source table(s) | Query sketch (de-identified) |
|---|---|---|
| **Active child sessions** | `child_sessions` | `count` + recent rows where `revoked_at IS NULL AND ended_at IS NULL AND expires_at > now()`. Show `id`, `child_profile_id` (UUID), `launch_mode`, `started_at`, `expires_at`. |
| **Mission activity** | `mission_attempts` | counts: total started, total completed (`completed_at NOT NULL`), completion rate. Recent rows: `mission_id`, `status`, `content_source`, `started_at`, `completed_at` (UUIDs only). |
| **AI fallback events** | `mission_attempts` | count + recent where `content_source = 'fallback'` (this is the "failed AI validation / fallback" signal). |
| **Reward ledger health** | `moolah_ledger`, `xp_events`, `child_badges` | counts (e.g. ledger entries, total moolah via sum if cheap, badges awarded) over a recent window. Aggregates only — no per-child PII. |
| **Evidence / report creation** | `learning_evidence_events`, `parent_reports`, `mastery_records` | counts: evidence events, mastery records, First Learning Maps generated. |

Use `.select("id", { count: "exact", head: true })` for pure counts (cheap), and small `.limit(N).order("created_at"/"started_at", { ascending: false })` selects for recent-activity tables. Mirror `fetchEnrollmentCounts` / `fetchPendingEscalations` exactly.

**Likely no new migration needed** — Phase C reads existing tables. If you decide a SQL **view** helps, create it as migration `010_*.sql` following the conventions in §7/§8 and grant `service_role` (the page uses service_role, which §8/migration 009 covers for tables created after 009 by the same role; for a view, add an explicit `GRANT SELECT ... TO service_role, authenticated`). Prefer plain queries over a view unless there's a real reason.

---

## 6. Service-role client (how the page reads data)

`apps/web/src/lib/supabase-server.ts` exports:
- `createSupabaseServerClient()` — anon key, RLS per caller (parent contexts). **Not for Mission Control.**
- `createSupabaseServiceRoleClient()` — **use this** for all Mission Control reads. URL from `NEXT_PUBLIC_SUPABASE_URL`, key from `SUPABASE_SERVICE_ROLE_KEY` (server-only). Never import in a Client Component; never leak results unfiltered.

---

## 7. NON-NEGOTIABLE conventions

1. **De-identify everything** rendered (see §5). UUIDs only; no legal names/emails/addresses; don't expand `payload_json`.
2. **Founder-only, server-side.** Keep the `(admin)/layout.tsx` + `admin-auth.ts` guard intact and fail-closed. Mission Control queries run only in the Server Component / Route Handlers with the service-role client.
3. **Append-only audit.** `audit_logs` has no UPDATE/DELETE policy by design. Any admin **write** action (you probably won't add one in Phase C) must also write an `audit_logs` row.
4. **RLS pattern for any new table/view:** `ENABLE` + `FORCE ROW LEVEL SECURITY`; service_role writes (bypasses RLS); parent reads via `auth_owns_child(child_profile_id)`; child-session defense-in-depth read via `current_setting('app.child_profile_id', true)`. Reuse helpers `set_updated_at()`, `auth_owns_child()` (defined in migration 001).
5. **Structured logging** in backend code: `console.log(JSON.stringify({ level, system, msg, timestamp, ...data }))`. (Frontend server components just `console.error` on query failure and return safe defaults — see existing fetchers.)
6. **No PII to the browser, ever.** Strip before returning from the fetcher.

---

## 8. Critical gotchas (these cost real time — read them)

1. **Local Supabase uses the NEW API key system.** The legacy `service_role` JWT returns `permission denied` / behaves as `anon` against this local stack. Use the **`SECRET_KEY` (`sb_secret_…`)** from `npx supabase status -o env` as the service key locally. In Supabase **Cloud**, the real `service_role` key works normally — this is a local-only quirk.
2. **`service_role` grant gap.** A clean local/CI stack does **not** apply Supabase's implicit default privileges, so `service_role` had no SELECT/INSERT on public tables → "permission denied for table …". Migration **009** (`009_grant_service_role_public.sql`) fixes this explicitly and sets `ALTER DEFAULT PRIVILEGES` so tables created by later migrations are covered. If you add migration 010 and hit permission-denied, confirm 009 ran; for a **view**, grant explicitly.
3. **Rebuild workspace packages after editing them.** `packages/shared-types` and `packages/mission-compiler` compile to `dist` via tsup. Consumers import `dist`. After editing their `src`, run `pnpm --filter @l3arn/<pkg> build` or `ai-workers`/`web` won't see the change. (Phase C probably edits neither — it's mostly `apps/web`.)
4. **`ai-workers` runs via `ts-node` (`npm run dev`) and does NOT hot-reload.** Restart it after backend `src` changes. (Phase C likely needs no backend changes.)
5. **CORS** exists (`services/ai-workers/src/lib/cors.ts`, `ALLOWED_ORIGINS`). Only relevant if you add a browser→Railway call — Mission Control reads Supabase server-side, so probably N/A.
6. **Shell quirks:** PowerShell working-directory **persists** across tool calls (don't re-`Set-Location` into a relative subdir twice). Bash cwd may differ — use absolute paths. `docker exec` needs **`-i`** to accept stdin/heredoc.
7. **Pre-existing failure:** `packages/ui/src/Card.tsx` has a TS error on `main` (`title?: ReactNode` vs `HTMLAttributes`). It is NOT yours; `pnpm -r typecheck` will stop there. Typecheck your packages individually (`pnpm --filter @l3arn/web typecheck`). Don't fix `ui` unless asked.
8. **`pre_sorting` is a real `house_name` enum value** (the unsorted state). The 4 selectable houses are Valkryn/Lyrion/Novari/Cytrex. `child_profiles` does NOT store house — `academy_identities.house` does.

---

## 9. Local dev + verification playbook

Docker Desktop + the Supabase CLI are installed. The local stack and `ai-workers` may still be running from the prior session; if not:

```bash
# 1. Ensure Docker engine is up (Windows): start "Docker Desktop", wait for `docker info` to succeed.

# 2. Start the local Supabase stack (applies all migrations incl. 009):
npx supabase start          # from e:\L3ARN\L3arn_repo

# 3. Get local connection values (NOTE: use SECRET_KEY, not the legacy service_role JWT):
npx supabase status -o env
#   API_URL      = http://127.0.0.1:54321
#   SECRET_KEY   = sb_secret_...   ← use as SUPABASE_SERVICE_ROLE_KEY locally
#   DB_URL       = postgresql://postgres:postgres@127.0.0.1:54322/postgres

# 4. Inspect DB directly (container name = supabase_db_L3arn_repo):
docker exec -i supabase_db_L3arn_repo psql -U postgres -d postgres -c "select status, content_source, count(*) from mission_attempts group by 1,2;"

# 5. Regression-check the existing backend (must stay green):
cd services/ai-workers
# env (PowerShell): $env:SUPABASE_URL/$env:SUPABASE_SERVICE_ROLE_KEY = SECRET_KEY / $env:AI_WORKERS_URL=http://127.0.0.1:3001 / $env:ANTHROPIC_API_KEY=dummy
npm run dev   # (background) then poll http://127.0.0.1:3001/health
npm run test:acceptance   # expect 59/59
```

### Verifying Phase C specifically (Mission Control is a server-rendered page)
The acceptance script can't click the page, so do **one** of these (recommended: the first, plus a screenshot):

- **(Recommended) Extract + test the data layer.** Put the new fetchers in a small server module (e.g. `apps/web/src/lib/mission-control-data.ts`) that takes a Supabase client, and write a node script (model it on `hero-slice-acceptance.mjs`) that: seeds an active session + a started + a completed `mission_attempt` (+ a fallback one) + some rewards, then asserts the aggregates your fetchers return. This mirrors how Phases A/B kept logic testable and gives you real, observed verification.
- **(Smoke) Playwright** against the running Next dev server (`pnpm --filter @l3arn/web dev`) logged in as a founder. Requires: a Supabase auth user whose `auth.users.id` has an `admin_users` row with `role='founder'`, and `apps/web/.env.local` set to the local stack (`NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, `SUPABASE_SERVICE_ROLE_KEY=<SECRET_KEY>`, anon key from status). Headless only. Take a screenshot of the dashboard showing the new panels with seeded data. Also verify a **non-founder** is redirected (criterion 7).

Always also confirm `pnpm --filter @l3arn/web typecheck` is clean.

---

## 10. Definition of done (verified-done, not "should work")

Do not report Phase C complete until you have **observed**:
- Each new panel renders real counts/rows from seeded data (via the data-layer test and/or a Playwright screenshot).
- Non-founder access still redirects (criterion 7) — show the evidence.
- `npm run test:acceptance` still 59/59 (no regression).
- `pnpm --filter @l3arn/web typecheck` clean.
- A short note on what you could NOT verify, if anything.

A claim of "done" that hands the human a checklist to run themselves is a failed completion. Run it.

---

## 11. Read these files before coding (in order)

1. This document.
2. Memory: `C:\Users\cjwil\.claude\projects\e--L3ARN\memory\hero_slice_integration.md` and `MEMORY.md`.
3. `apps/web/src/app/(admin)/mission-control/page.tsx` — the file you extend (read all of it; §5 covers the top).
4. `apps/web/src/app/(admin)/mission-control/ReviewEscalationForm.tsx` and `apps/web/src/app/api/admin/escalations/[id]/review/route.ts` — the existing admin write pattern (founder-auth + audit).
5. `apps/web/src/app/(admin)/layout.tsx` + `apps/web/src/lib/admin-auth.ts` — founder gate (don't change; understand).
6. `apps/web/src/lib/supabase-server.ts` — the service-role client.
7. `supabase/migrations/006_founder_mission_control.sql` — `audit_logs`, `safety_escalations`, `admin_users` (de-identification contract in comments).
8. `supabase/migrations/008_mission_runtime_companion.sql` — `mission_attempts`, `companion_profiles` (the new activity sources).
9. `supabase/migrations/004_rewards_moolah_companion.sql` + `005_evidence_reports.sql` — reward + evidence/report tables.
10. `supabase/migrations/001_identity_household_consent.sql` — `child_sessions` columns (active-session query) + RLS helpers.
11. `services/ai-workers/scripts/hero-slice-acceptance.mjs` — the verification pattern to copy.
12. `packages/safety/src/kill-switch/` (`safety-containment.interface.ts`, `supabase-safety-containment.ts`) — confirm containment→`audit_logs` logging already satisfies criterion 8.
13. `docs/superpowers/plans/agent-11-founder-mission-control.md` — the original Mission Control spec (there is no `docs/admin_console_spec.md`; this is the real spec).

---

## 12. Git workflow

- Stay on `integration/hero-slice`. Commit in focused, reviewable chunks. **Do not** add `apps/web/tsconfig.tsbuildinfo` or `dist/` (gitignored) to commits.
- Commit message footer (required):
  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  ```
- Push only when asked (the human pushed Phase A/B; ask before pushing Phase C, or follow their instruction).
- Update the memory file `hero_slice_integration.md` + `MEMORY.md` pointer when Phase C is done.

---

## 13. Decisions for the human (ask if blocked)

- **Cloud `service_role` grants:** migration 009 is local-driven; confirm the Cloud project `ljjhwzdziovrlvlvhuxs` already grants `service_role` (Cloud default — almost certainly yes). If the backend ever 403s in Cloud, 009 is the fix.
- **`ALLOWED_ORIGINS` on Railway** must be set to the Vercel origin(s) for the live browser flow (Phase A/B requirement; flag if not set).
- **Live deploy / PR:** the branch is on origin; PR not opened. Confirm whether to open a PR after Phase C.

---

### One-line summary
Add founder-only, server-side, de-identified read panels (active sessions, mission activity, AI-fallback events, reward-ledger health, evidence/report creation) to `apps/web/src/app/(admin)/mission-control/page.tsx`, following the existing `fetchX()` + service-role pattern; verify with a seeded data-layer test (+ Playwright screenshot) against the local Supabase stack; keep founder-gate and de-identification intact; don't regress 59/59.
