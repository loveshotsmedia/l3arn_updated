# TEST RESULTS — Adaptive Lesson Runtime (Task 15, Live Verification)

**Date:** 2026-08-02
**Branch:** `feature/adaptive-lesson-runtime`
**Worktree:** `E:/L3ARN/L3arn_repo/.worktrees/adaptive-lesson-runtime/L3arn_repo`
**Method:** Real browser (Playwright), real local `ai-workers` Express server, real Supabase project `l3arn-platform` (`ljjhwzdziovrlvlvhuxs`), real Anthropic API (`contentSource: "ai"` on every mission compile — no fallback content was used). No mocks.

## Environment setup (had to be solved first)

`apps/web`'s `NEXT_PUBLIC_RAILWAY_API_URL` in this worktree pointed at nothing by
default (no `.env.local` — untracked files are not copied into a new git worktree).
The main checkout at `E:/L3ARN/L3arn_repo` already had a working local-dev
configuration from prior work (Mission Fast-Start project): `apps/web/.env.local`
pointing `NEXT_PUBLIC_RAILWAY_API_URL=http://localhost:3001`, and
`services/ai-workers/.env` with real Supabase service-role key + Anthropic key.

Steps taken:
1. Copied `apps/web/.env.local` and `services/ai-workers/.env` from the main
   checkout into this worktree (both gitignored, never committed).
2. Built the workspace deps `ai-workers` needs: `pnpm --filter @l3arn/shared-types
   --filter @l3arn/safety --filter @l3arn/mission-compiler run build`.
3. `services/ai-workers` has **no dotenv loader** (`src/index.ts` never calls
   `dotenv.config()` — it expects Railway to inject real env vars). Running
   `pnpm --filter @l3arn/ai-workers dev` alone left `ANTHROPIC_API_KEY` /
   `SUPABASE_URL` etc. all unset. Fix: `cd services/ai-workers && set -a &&
   source .env && set +a && npx ts-node src/index.ts` — loads the `.env` into
   the shell before starting. `GET /health` then confirmed
   `anthropicKeyPresent:true, anthropicModelPresent:true, missionAiReady:true`.
4. Started `apps/web` with `npx next dev -p 3000` from `apps/web/`.

Both servers ran locally against this branch's code for the entire verification.

## What was tested

Full child gameplay loop for Mission 001 (`Repair the Sorting Computer`) using
the real test account `davewatson.wfs+l3arnt14@gmail.com` and its two children
StarBlazer7 (full playthrough) and NovaPilot9 (exit/resume test), via:
parent login → Start Session → session-launched handoff → `/student/enter`
(token verify) → `/student/academy` → Sorting Computer → `/student/mission/mission-001`.

## RESULT 1 — Real wrong-answer feedback (core claim #1): CONFIRMED WORKING

On Step 1 of 6 (sort-categorize round, "The Red Bin needs a crystal"), tapped
the **green** crystal (deliberately wrong). Result: the button's accessible
name became `"A green crystal. — try again"`, a red `✗` rendered on the
button, and the mission **stayed on "Step 1 of 6"** — it did not silently
accept the wrong tap or advance. Tapping the correct red crystal then advanced
to Step 2. Screenshot: `verification-screenshots/07-sort-round1-WRONG-ANSWER-FEEDBACK.png`
(and again post-fix: `06b-sort-round1-WRONG-ANSWER-FEEDBACK-postfix.png`).

This is the central claim of the whole 15-task plan (replacing the old
no-fail hardcoded step with genuine discrimination) and it holds.

## BUG FOUND #1 — FIXED AND RE-VERIFIED

**Symptom:** After answering Step 1 correctly, Step 2 ("The Blue Bin needs a
crystal") rendered with **all three crystal buttons permanently disabled**,
one still showing a stale "— try again ✗" from the *previous* round's
selection. The game was soft-locked — no further input was possible.
Screenshot: `verification-screenshots/08-sort-round2-step2.png`.

**Root cause:** `apps/web/src/app/(student)/mission/[missionId]/page.tsx`
rendered `<SortTrayTask .../>` / `<OptionListTask .../>` with no `key` prop.
Without a key that changes per task, React reuses the same component
instance across different `taskIndex` values, so `SortTrayTask`'s local
`useState` (`resolved`, `selectedId`) from the previous task instance was not
reset for the new task instance — `resolved` stayed `true` (disabling every
button) and `selectedId` still pointed at the old itemId.

**Fix applied:** added `key={currentTask.taskInstanceId}` to all three
task-renderer components (`SortTrayTask` × 2 usages, `OptionListTask` × 1) in
`apps/web/src/app/(student)/mission/[missionId]/page.tsx`, forcing a fresh
mount (and fresh local state) per task instance. `taskInstanceId` is a unique
per-task string guaranteed by `MissionLessonTaskSchema`
(`packages/shared-types/src/lesson-runtime.schema.ts`).

**Re-verified:** started a brand-new mission attempt after the fix. All 3
sort-categorize rounds, the apply-to-new transfer step, the ai-mistake-check
step, and the reflection step completed correctly end to end, with buttons
correctly enabled/reset at every step transition (screenshots
`08-sort-round2-fixed-enabled.png` through `13-mission-complete-rewards.png`).

## RESULT 2 — Full mission playthrough (post-fix): PASSED

Step-by-step, one continuous run (StarBlazer7, `missionAttemptId
2e8efe6f-595f-4dcf-9790-bf609b7443c8`):

| Step | Task | Result | Screenshot |
|---|---|---|---|
| Briefing | AI-generated story (`contentSource: "ai"`) | Rendered, real Anthropic content | `05-mission-briefing-realAI.png` |
| 1/6 | Sort — Red Bin | Wrong tap (green) → real ✗ feedback → correct tap (red) → advanced | `06-sort-round1-before-tap.png`, `06b-...-postfix.png` |
| 2/6 | Sort — Blue Bin | Buttons enabled (bug fixed), correct tap → advanced | `08-sort-round2-fixed-enabled.png` |
| 3/6 | Sort — Green Bin | Correct tap → advanced | `09-sort-round3-step3.png` |
| 4/6 | Apply-to-new (transfer, Purple Bin / new orange crystal) | Correct tap → advanced | `10-apply-to-new-transfer-step4.png` |
| 5/6 | AI-mistake-check ("companion said 5 sides, actually 6") | Correct option identified → advanced | `11-ai-mistake-check-step5.png` |
| 6/6 | Reflection ("Humans should check AI output") | Selected, mission completed | `12-reflection-step6.png` |
| Complete | Rewards screen | `+25 Moolah, +75 XP, +15 House Points, +20 Companion Bond`, badges `mission-001-complete`, `ai-literacy-1` | `13-mission-complete-rewards.png` |

Server-side confirmation (real DB writes, not UI-only):
```
completeMission: pipeline complete — missionAttemptId 2e8efe6f-..., evidenceCount:7, masteryRecordsWritten:5, reportId:c4133fcf-...
calibration snapshot persisted — confidenceScore:0.75, evidenceCount:45
```
Parent dashboard re-check after completion: StarBlazer7's Moolah balance
moved from 50 → 75 (matches the `+25` reward), confirming the reward pipeline
wrote to `moolah_wallets`, not just to component state.

## RESULT 3 — Exit / resume (core claim #2): **FAILED — confirmed real bug, ESCALATED, NOT FIXED**

Using NovaPilot9, a fresh mission attempt was started, Step 1 (Red Bin)
answered correctly, landing on **Step 2 of 6** (Blue Bin). Screenshot:
`14-before-exit-step2.png`. Tapped "Exit mission" → the in-page exit
confirmation ("Leave this mission? Your progress on this task is saved." /
Leave / Stay) appeared correctly (`15-exit-confirmation-dialog.png`).
Tapped "Leave" → returned to `/student/academy`.

Network confirmed `POST /api/student/mission/task-index` fired with body
`{"missionAttemptId":"f316f25d-4aaf-42d7-b66d-b0ff8ee4c695","taskIndex":1}`
and returned `200 OK` — **the save-on-exit half works correctly.**

Re-entered via the Sorting Computer → `/student/mission/mission-001` again.
**Expected:** resume directly at Step 2 (or at least land back on Step 2
after the briefing). **Actual:** the mission restarted at **Step 1 of 6**
("The Red Bin needs a crystal") with a brand-new AI-generated briefing/story.
Screenshot: `16-BUG-resume-restarted-at-step1-not-step2.png`.

**Confirmed with direct DB evidence** (Supabase REST, `mission_attempts` for
NovaPilot9's `child_profile_id`, most recent 5 rows):

| id | status | current_task_index | started_at |
|---|---|---|---|
| `b0dfa761-...` (newest, used for the "resumed" page) | started | **0** | 23:19:25 |
| `72c1bc8d-...` (duplicate, same load) | started | **0** | 23:19:18 |
| `f316f25d-...` (the one actually exited from) | started | **1** | 23:17:10 |
| `088a7ab7-...` (duplicate of the same load) | started | **0** | 23:17:09 |

**Root cause:** `POST /api/student/mission/start`
(`services/ai-workers/src/missions/mission-runtime.ts`, `startMission()`)
**unconditionally `INSERT`s a brand-new `mission_attempts` row on every
call** — there is no lookup for an existing non-completed attempt for the
same `(child_profile_id, mission_id)`. `GET
/api/student/mission/:missionId/lesson`'s `resumeFromTaskIndex`
(`services/ai-workers/src/missions/mission-lesson.ts`, `getMissionLesson()`)
reads `current_task_index` scoped strictly to the `missionAttemptId` it's
given — which is always the ID of the brand-new row `/start` just created,
whose `current_task_index` defaults to `0`. The previously-saved progress
(`current_task_index: 1` on `f316f25d-...`) is real, correctly written, and
completely orphaned — nothing ever reads it back.

**Why this was not fixed inline (per the plan's own escalation instructions):**
this is not a one-line/low-risk fix. Fixing it correctly requires a real
design decision that touches the attempt lifecycle across
`mission-runtime.ts`, `mission-lesson.ts`, and the `mission_attempts` schema/
query contract:
- What identifies "the" resumable attempt for a child+mission — most recent
  `status = 'started'` row? Is there ever more than one legitimately (retries,
  the same child on two devices)?
- The AI-recompiled briefing/story text is different on every `/start` call
  (by design — see `contentSource: "ai"` above). If `/start` is changed to
  reuse an existing attempt, does it also need to skip recompiling the
  briefing, or accept a mismatch between the (new) briefing text and the
  (old) task position?
- `apps/web/next.config.mjs` has `reactStrictMode: true`, which double-invokes
  effects in dev only — this is why two attempts are created per page load in
  this environment (`72c1bc8d`+`b0dfa761`, `088a7ab7`+`f316f25d`). It is not
  the cause of the resume bug (the exited-from attempt's index-1 save is
  real and correct), but any fix must be written to not be confused by it,
  and it's worth someone confirming whether disabling StrictMode is
  otherwise expected here.
- Orphaned `started` rows accumulate (4 in this test session alone) with no
  cleanup path — a secondary data-hygiene concern from the same root cause.

This is escalated, not silently worked around, per the task's explicit
instruction to stop and report on ambiguous/design-level issues rather than
guess at a fix.

## Bugs summary

| # | Bug | Severity | Status |
|---|---|---|---|
| 1 | `SortTrayTask`/`OptionListTask` missing `key` prop → state leaks across tasks, soft-locks every task after the first correct answer | Blocking (game unplayable past step 1) | **FIXED** — `key={currentTask.taskInstanceId}` added, re-verified with full playthrough |
| 2 | Exit → re-enter does not resume; `/start` always creates a new attempt with `current_task_index: 0`, orphaning the saved resume position | Blocking (core claim #2 of this plan) | **NOT FIXED — escalated.** Requires a design decision on attempt-lifecycle/resume semantics; out of scope for a low-risk inline patch |

## Screenshots (`verification-screenshots/`, all in this worktree)

1. `04-academy-before-mission.png` — 3D academy scene, Sorting Computer visible
2. `05-mission-briefing-realAI.png` — Mission 001 briefing, real AI-generated story
3. `06-sort-round1-before-tap.png` — Step 1, pre-fix run, before any tap
4. `06b-sort-round1-WRONG-ANSWER-FEEDBACK-postfix.png` — Step 1, post-fix run, wrong tap feedback
5. `07-sort-round1-WRONG-ANSWER-FEEDBACK.png` — Step 1, pre-fix run, wrong tap feedback (core claim #1 evidence)
6. `08-sort-round2-step2.png` — **Bug #1 evidence**: Step 2 all buttons disabled (pre-fix)
7. `08-sort-round2-fixed-enabled.png` — Step 2 correctly enabled (post-fix)
8. `09-sort-round3-step3.png` — Step 3, Green Bin round
9. `10-apply-to-new-transfer-step4.png` — Apply-to-new transfer step
10. `11-ai-mistake-check-step5.png` — AI-mistake-check step
11. `12-reflection-step6.png` — Reflection step
12. `13-mission-complete-rewards.png` — Completion + rewards screen
13. `14-before-exit-step2.png` — NovaPilot9, Step 2, before exit
14. `15-exit-confirmation-dialog.png` — Exit confirmation dialog
15. `16-BUG-resume-restarted-at-step1-not-step2.png` — **Bug #2 evidence**: re-entered mission restarted at Step 1

## Self-review

- Wrong-answer feedback (core claim #1): verified with direct DOM evidence
  (aria-label change, ✗ icon, step counter not advancing) on two separate
  runs (pre- and post-fix), plus a second wrong-tap-adjacent check on the
  ai-mistake-check step's option list. Confidence: high.
- Real backend/AI/DB integration: confirmed via server logs
  (`contentSource: "ai"`, `AI generation succeeded`), a direct DB read
  (Moolah balance before/after), and `completeMission` pipeline logs
  (`evidenceCount`, `masteryRecordsWritten`, `reportId`). Not a UI mock.
- Exit/resume (core claim #2): verified as **broken** with direct Supabase
  REST evidence (four `mission_attempts` rows quoted above), not just UI
  observation — ruling out "maybe I clicked wrong" as an explanation.
- The React `key` fix is minimal and scoped (3 lines, no behavior change
  beyond forcing correct remounts) — low risk, matches the task's
  "small, clear, low-risk fix" criteria for an inline fix.
- The resume bug was deliberately **not** patched — inventing an attempt-
  reuse/lookup policy under time pressure risked guessing wrong on a
  behavior with real product implications (what "resume" should mean when
  content is AI-regenerated per attempt). Flagged for human/architectural
  decision instead.

## Residual risk / what's not yet proven

- Only Mission 001's fixed fixture lesson sequence was exercised (per
  `mission-lesson.ts`, this stands in for the real generation pipeline —
  sub-project 4, not yet built). Other missions are untested.
- The exit/resume fix, once designed, needs its own live re-verification
  pass after implementation — this report does not close that claim.
- `reactStrictMode: true` double-invoking effects in dev created duplicate
  `mission_attempts`/AI-compile calls throughout this session; production
  builds don't double-invoke, but this was not independently confirmed in
  a production build during this pass.

---

## RE-VERIFICATION (2026-08-03) — Exit/Resume Fix (commits `7b07071`, `caca529`): CONFIRMED FIXED

**Method:** Same real environment (live browser, real local `ai-workers` +
`apps/web` dev servers, real Supabase project, real test account). Child used:
**QuasarKid3** (`5e1222e9-b4b9-47e4-bf38-53b5ab4df6fc`) — the one child not left
mid-mission by the original Aug 2 verification pass (StarBlazer7 had a
`completed` attempt; NovaPilot9 was left exited-mid-mission at index 1, the
exact bug this fix addresses).

**Environment note (unrelated to the fix, resolved during this pass):** both
dev servers, still running from the earlier session, had gone stale — Next.js
had a crashed webpack compile worker (`Jest worker encountered 2 child process
exceptions, exceeding retry limit`, 500 on `/student/mission/mission-001`) and
`ai-workers`' `POST /start` hung indefinitely despite `/health` responding
normally. Both were killed and restarted cleanly (`npx next dev -p 3000`;
`cd services/ai-workers && set -a && source .env && set +a && npx ts-node
src/index.ts`), after which both routes worked normally. Not a code defect —
noted here only so a future session isn't surprised by it.

**Baseline surprise (itself evidence the fix works, not a test artifact):**
QuasarKid3 already had one stale `started` mission_attempts row
(`5c93051b-7eca-4ccd-8d7b-df4adea203f1`, `current_task_index: 0`) from
2026-07-04 — unrelated pre-existing test debris, over a month old. On the very
first navigation to `/student/mission/mission-001` this session, the fixed
`startMission` found it and resumed it directly (no briefing, placeholder
`storyHook: "Welcome back! Let's pick up right where you left off."`,
`resumed: true`, `contentSource: "fallback"`) rather than creating a fresh
attempt. Server log: `startMission: resuming existing in-progress attempt (no
AI recompile)` with `missionAttemptId: 5c93051b-...`. This confirms the lookup
genuinely queries `(child_profile_id, mission_id, status='started')` with no
staleness cutoff — a real, if minor, product question for later (should a
month-old abandoned attempt auto-resume?), but exactly the mechanism the fix
commit describes.

**Test proceeded on this attempt** (a legitimate substrate — same mechanism,
just pre-existing rather than freshly created):

1. Answered Step 1 (Red Bin, correct) → Step 2 (Blue Bin, correct) → Step 3
   (Green Bin) — i.e., completed 2 full sort rounds before exiting.
2. Tapped **Exit mission** on Step 3 of 6 (`taskIndex: 2`). Exit-confirmation
   dialog appeared ("Leave this mission? Your progress on this task is
   saved." / Leave / Stay). Screenshot:
   `verification-screenshots/resume-04-exit-confirmation-dialog.png`.
3. Tapped **Leave**. Network confirmed `POST /api/student/mission/task-index`
   fired with `{"missionAttemptId":"5c93051b-...","taskIndex":2}` → `200 OK`.
4. **DB check immediately after exit** (Supabase REST,
   `mission_attempts?id=eq.5c93051b-...`):
   ```
   {"id":"5c93051b-7eca-4ccd-8d7b-df4adea203f1","status":"started",
    "current_task_index":2,"mission_id":"mission-001",
    "started_at":"2026-07-04T12:05:10.131+00:00","completed_at":null}
   ```
   Confirms save-on-exit: correct index, still `started` (not `completed`).
5. Re-entered via direct navigation to `/student/mission/mission-001` (same
   child, same session) — **THE KEY CHECK**: dropped directly into
   **"Step 3 of 6" (Green Bin)** with no briefing screen. Screenshot:
   `verification-screenshots/resume-05-KEY-resumed-at-step3.png`.
   - `POST /start` response: `{"missionAttemptId":"5c93051b-...",
     "resumed":true, "storyHook":"Welcome back! Let's pick up right where you
     left off.", ...}` — **same attempt ID as before exit.**
   - `GET /lesson?missionAttemptId=5c93051b-...` response:
     `"resumeFromTaskIndex":2` — matches exactly where it was left.
   - **DB check**: same two rows as before (`752bbe83-...` completed from
     July 4, `5c93051b-...` still `started`, now `current_task_index:2`) — no
     third/new row was created. Server log confirms the resume path fired
     again on re-entry: `startMission: resuming existing in-progress attempt
     (no AI recompile)`, `missionAttemptId: 5c93051b-...`.
   - Bonus finding: both the pre-exit entry and the post-exit re-entry each
     logged this resume message **twice** (React StrictMode double-invoke, as
     the fix's own commit message anticipated) — and in both cases both
     invocations resolved to the *same* attempt ID with no duplicate row
     created. The documented "check-then-insert race" residual risk did not
     manifest here (this was a lookup-then-return path with no insert at all
     when an attempt already exists, so double-invoke is inherently safe on
     this path — the race the commit message flags only applies to the
     create-new-attempt branch, which this test didn't exercise).
6. Completed the rest of the mission from the resumed point: Step 4
   (apply-to-new transfer, orange crystal) → Step 5 (ai-mistake-check,
   correctly identified the companion's error) → Step 6 (reflection,
   "Humans should check AI output") → **Mission Complete**. Screenshot:
   `verification-screenshots/resume-06-mission-complete-rewards.png`.
   Rewards: `+25 Moolah, +75 XP, +15 House Points, +20 Companion Bond`,
   badges `mission-001-complete`, `ai-literacy-1`.
7. **Final DB state**:
   ```
   {"id":"5c93051b-...","status":"completed","current_task_index":5,
    "completed_at":"2026-08-03T00:47:10.268+00:00"}
   ```
   Same attempt ID throughout the entire exit→resume→complete cycle — it was
   never abandoned or replaced.
8. Server log confirmed the full completion pipeline ran for real:
   `completeMission: pipeline complete`, `missionAttemptId: 5c93051b-...`,
   `evidenceCount:7`, `masteryRecordsWritten:5`, `reportId:0e6d8410-...`, plus
   `calibration snapshot persisted — confidenceScore:0.75`.
9. **Moolah cross-check** (DB + parent dashboard UI, not just component
   state): `moolah_wallets` for QuasarKid3 went from `balance: 25` (pre-test,
   shown on dashboard before Start Session) to `balance: 50, lifetime_earned:
   50` (matches the `+25` reward). Parent dashboard, reloaded after
   completion, shows QuasarKid3 at `🪙 50 Moolah`.

### Result: exit/resume is FIXED

The exact failure mode from the original report — re-entering after exit
creating a brand-new `mission_attempts` row at `current_task_index: 0`,
orphaning saved progress — did not reproduce. Every check (network response
body, `/lesson` `resumeFromTaskIndex`, direct DB row count and field values,
server logs) agrees: one attempt ID, correct resumed index, no duplicate row,
full completion pipeline unaffected downstream.

### Screenshots (this re-verification pass)

- `resume-01-academy-quasarkid3.png` — academy scene before entering mission
- `resume-02-step2-blue-bin.png` — Step 2, mid-playthrough
- `resume-03-pre-exit-step3.png` — Step 3, immediately before tapping Exit
- `resume-04-exit-confirmation-dialog.png` — exit confirmation dialog
- `resume-05-KEY-resumed-at-step3.png` — **the key screenshot**: re-entry
  landing directly on Step 3 (same task, no briefing, same attempt ID)
- `resume-06-mission-complete-rewards.png` — completion screen after
  finishing the resumed attempt

### Self-review (this pass)

- Every claim above is backed by either a direct Supabase REST query result,
  a captured network request/response body, or a server log line quoted
  verbatim — not UI observation alone, matching the rigor of the original
  bug report that found this broken.
- The dev-server staleness (crashed Next.js worker, hung `ai-workers` `/start`
  call) was diagnosed and fixed by process restart before concluding
  anything about the app; it would have been easy to misattribute a hang to
  the resume fix itself, so this is called out explicitly to avoid that
  reading by a future reviewer.
- Using a pre-existing month-old orphaned attempt as the test substrate
  (rather than a freshly-created one) was a deliberate choice once
  discovered, not a shortcut — it's a strictly stronger test of the lookup
  query than a same-session fresh attempt would have been, and it surfaced
  the (already-known, already-documented) lack of a staleness cutoff as a
  real behavior worth a product decision later, not a defect in this fix.
- No new problems found. The StrictMode double-invoke behavior was checked
  specifically against the "residual risk" the fix's commit message called
  out, and did not manifest as a duplicate row in this test — consistent
  with the commit's own reasoning (no insert happens on the resume path, only
  on the create-new-attempt path).
