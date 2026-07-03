# Handoff: L3ARN 3D Academy — Task 13 (Mission overlay — Mission 001 runs in-world, not as a route navigation)

**You are a fresh Claude Code agent with no memory of prior conversations. This document is self-contained — everything you need is here or linked from here. Read this whole document before touching any code.**

---

## 0. Read this first: the one rule that matters most

**Verify, don't trust.** This has already paid off ten times on this project. The short version of the running ledger (each was a real incident, not a hypothetical):

1. A prior session built hours of work on a stale, locally-cached copy of `main` that didn't match GitHub — required a careful rebase + byte-for-byte recovery.
2. Task 6's plan snippet used raw numeric `camera-controls` `ACTION` values from v2, which are **wrong** in the installed v3 (bit-flags shifted). Caught only by reading the installed `.d.ts`.
3. Task 7's `<N8AO>` triggers a per-frame WebGL warning — a documented upstream `pmndrs/postprocessing` bug, disclosed rather than silently patched. **Still unresolved** — see §2.
4. Task 9's plan snippet imported `@gltf-transform/core` (only `@gltf-transform/cli` was a root devDep) and ran `vitest` from repo root (only `packages/world-engine` had it). Both caught by actually running the commands.
5. Task 9's CI workflow hard-coded `node-version: 20`, which passed every local check but failed the first real GitHub Actions run in ~13s (`pnpm@11.7.0` needs Node ≥ 22.13). Only the real CI run caught it.
6. Task 10's `<Environment files="/env/...hdr">` 404'd because `apps/web` had never had a `public/` dir and Next only serves static files from the app's own `public/`. Fixed with `scripts/sync-world-engine-public.mjs` (copies `packages/world-engine/public/*` → `apps/web/public/*`, chained into `dev`/`build`). **Merged and on `main` — don't redo it.**
7. `docs/AI_PRODUCTION_SETUP.md` references `https://l3arn.vercel.app` as prod — that returns 200 but for an unrelated Locofy site. The **real production URL** (confirmed via the repo's `homepage` field + Vercel's commit-status `target_url`) is **`https://l3arnupdated.vercel.app`**. A 200 alone proves nothing — check `X-Matched-Path`/content, not just the status line. (Re-confirmed for this handoff: repo `homepageUrl` = `https://l3arnupdated.vercel.app`, and prod `/academy` returns `200` + `X-Matched-Path: /academy` + `X-Vercel-Cache: PRERENDER`.)
8. A fresh worktree is missing `apps/web/.env.local` — it's gitignored/untracked, and `git worktree add` only checks out *tracked* files. The web build fails during static prerender with `@supabase/ssr: Your project's URL and API key are required...` until it's copied in (byte-identical across sibling worktrees — non-secret-inventing shared local dev config, safe to copy). **This handoff's own worktree already has it copied in — see §2.**
9. On this machine, `git worktree add` and `pnpm install` on a fresh worktree can be **very** slow — one `pnpm install` took over an hour once, and `git worktree add` needs multiple minutes to check out ~211 files. **Run these as background tasks, not foreground**, or they hit the 2-minute foreground timeout mid-checkout and leave a corrupt partial tree (files staged "deleted" that are just not-yet-checked-out). If you hit `fatal: Unable to create '.../index.lock': File exists` after a killed command, check `ps aux | grep git` for a process whose command line actually references *your* worktree path before removing the lock — there are usually many unrelated concurrent git processes on this machine.
10. **NEW, from Task 12's execution — three things directly relevant to Task 13:**
    - **The `/student/*`, `/parent/*`, `/admin/*` URL prefixes are INTENTIONAL, not a bug.** `apps/web/next.config.mjs` has `rewrites()` mapping `/student/:path* → /:path*` (and parent/admin), added by "Agent 17, 2026-06-28", precisely because the app's `router.push()` calls use those prefixes while the route-group dirs `(student)`/`(parent)`/`(admin)` are stripped from the URL by Next. So `router.push("/student/academy")` and `router.push("/student/mission/mission-001")` both **resolve correctly** via the rewrite. Prior handoffs' note that "the route is `/academy` NOT `/student/academy`" is about *what URL you type in the browser for the dev/Playwright check* (`/academy` matches the group directly) — it is NOT a statement that `/student/academy` is broken. **Do not "fix" the `/student/...` paths in `router.push` — they are correct and the whole app uses them uniformly.**
    - **Clicking the Sorting Computer today does `router.push("/student/mission/mission-001")` — a full navigation away from the 3D world. This is exactly what Task 13 replaces** with an in-world overlay. (During Task 12's browser check, the ~800ms camera "settle" was only briefly visible before this navigation completed — Task 12 added the settle, Task 13 makes the world *stay* so it reads as a deliberate framing gesture.)
    - **The `/academy` R3F canvas renders in a ~150px-tall strip** (confirmed on BOTH local headless dev AND the live production site — so it's real, not a headless artifact). It's a `WorldCanvas`-internal layout characteristic, pre-existing, unrelated to any task's game logic, and it did not block Task 12's verification. Task 13 mounts a **fullscreen `position:fixed` overlay** over the whole viewport (not just the canvas strip), so the strip does not affect the overlay — but don't be surprised by it when you screenshot.

**Before you write a single line of code**, run (in the worktree, see §2):
```bash
cd "E:\L3ARN\L3arn_repo\.worktrees\task-13"
git fetch origin main
git log HEAD..origin/main --oneline   # MUST be empty
```
If the second command prints anything, **stop and investigate** — your branch is behind `main`. Confirmed empty when this handoff was written; check anyway.

When a plan snippet hard-codes values, API shapes, **or relative import paths**, verify them against the real files/tree before trusting them (this handoff caught a wrong relative-import depth in Task 13's own snippet — see §4 flag D). When a snippet describes runtime behavior of a rendering/effects library or a browser, verify by running it and reading the console/network tab. When a snippet targets an environment you're not in (CI, an external URL, a dev server, a browser), verify **in that environment** — local success doesn't transfer.

---

## 1. What L3ARN is and what this work is

L3ARN is a parent-led + student-driven learning platform. Students explore a browser-based 3D "Academy" world, guided by an AI companion, undertaking learning missions. The 3D world (`packages/world-engine`) is being incrementally upgraded from a primitive placeholder toward a "premium-stylized" world. Reference docs:

- **Spec:** `docs/superpowers/specs/2026-06-30-3d-academy-world-design.md` — the full design vision (rendering, art pipeline, performance, architecture, educational design).
- **Plan:** `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` — the task-by-task Phase 0/1 plan. **Primary reference — read it in full**, especially the "Execution Strategy" section near the top (dependency graph, gate protocol) and Task 13's full text (also reproduced verbatim in §4 below; the live file is authoritative if they ever disagree).

**Task 13 is the fourth task of Phase 1 (The Living Great Hall vertical slice).** Phase 0 (Tasks 0–9), Task 10 (Real IBL), Task 11 (PBR material pass), and Task 12 (Explore→Mission camera "settle") are complete and merged. Task 13 keeps the 3D world mounted-but-quiet **behind a fullscreen overlay** when a student commits to a mission, instead of navigating away to `/student/mission/[missionId]`. The crystal-sorting gameplay, its telemetry (`tryCapture`), and its Railway calls are **entirely unchanged** — only *how the mission is presented* changes (route push → in-world overlay). This is the payoff of Task 12: with the world staying mounted, the "settle" camera move reads as a deliberate two-modes transition rather than a jump-cut before a page load.

---

## 2. Exact current state — start here

**Tasks 0, 3–9 merged; Task 10 (PR #14, `e4455ed`); Task 11 (PR #15, `b54eaf4`).**

**Task 12** (Explore→Mission "settle") is **merged via PR #16 (squash commit `6c342c9`)** — it is the current tip of `origin/main`. Freshly verified for this handoff (not copied from Task 12's handoff):
- `gh pr view 16` → `state: MERGED`, merged `2026-07-03T16:04:41Z`, merge/squash commit `6c342c9ff359d854da8525d6cfbd7768332609cb`.
- `git log origin/main --oneline -1` → `6c342c9 3D Academy Task 12: Explore->Mission settle transition (#16)`.
- Combined commit status on `6c342c9`: **`success`** — `Vercel`: "Deployment has completed"; `L3arn Updated - l3arn_updated` (Railway): "Success".
- **Post-merge verification** (done in the `rebase-attempt-phase0-1` worktree, fast-forwarded `b54eaf4..6c342c9`): `pnpm install --frozen-lockfile` "Already up to date" (Task 12 added zero deps), `pnpm -r typecheck` **7/7 packages Done / 0 errors**, `packages/world-engine` suite **16/16**, `pnpm --filter @l3arn/web build` **exit 0 with the full 21-route table** (`/academy` 371 kB).
- **Confirmed genuinely LIVE in production, not just merged**: `https://l3arnupdated.vercel.app/academy` → 200 / `X-Matched-Path: /academy` / prerendered; and the deployed `/academy` JS chunk (`/_next/static/chunks/app/(student)/academy/page-*.js`) contains Task 12's identifiers `settleTarget` (×4), `requestSettle` (×2), `clearSettle` (×2). A live headless-Playwright render showed the Great Hall drawing correctly with **0 console errors** (199 warnings, all the known N8AO pattern below).

**Known open issue carried forward from Task 7 (still unresolved, NOT in Task 13's scope):** `<N8AO>` inside `packages/world-engine/src/render/PostProfiles.tsx`'s `EffectComposer` still emits a per-frame WebGL console **warning** (`GL_INVALID_OPERATION: glBlitFramebuffer: Read and write depth stencil attachments cannot be the same image`). Re-confirmed still present and untouched for this handoff: `git log --oneline -1 -- packages/world-engine/src/render/PostProfiles.tsx` is still Task 7's merge commit `8a0af30` — no task since has touched it. Documented upstream `pmndrs/postprocessing` architectural bug (fix only in the not-yet-stable v7 rewrite); a warning not an error, no visual defect. **Task 13 does not touch `PostProfiles.tsx` or the 3D render pipeline at all** — it only toggles `worldMode`/`activeMissionId` in the React layer, which `PostProfiles` already reacts to (Task 7). Carry it forward in your PR body as PRs #11, #12, #13, #14, #15, #16 all did.

**Track A (Task 14's backend slice) status — checked fresh, has NOT landed out-of-band:** confirmed via direct search of the current `main` tip — no `world_holdings`-named file under `supabase/migrations/`, no `holding`-named file under `packages/shared-types/src/`, and no route file under `services/ai-workers/src/routes/` references "holding". **Track A has not landed.** This doesn't block Task 13. It IS worth flagging when you write Task 14's handoff, since Task 14 inserts an `unlockHolding(...)` call into the same mission-success path Task 13 restructures (see §6).

### CRITICAL — Task 13's plan text has several drift points vs. the current code. All independently verified for this handoff. Read these before executing §4:

**Flag A — the "Files" header is INCOMPLETE (inverse of Task 12's `WorldCanvas` issue).** Task 13's Files header (§4) lists only:
> - Create: `apps/web/src/app/(student)/academy/MissionOverlay.tsx`
> - Modify: `apps/web/src/app/(student)/academy/page.tsx`

…but **Step 2 also modifies `apps/web/src/app/(student)/mission/[missionId]/page.tsx`**, and Step 7's `git add` explicitly includes `apps/web/src/app/(student)/mission/`. So there are **three** touched files, not two. The mission page modification is real and required (it's what makes the page render both as a route and as an overlay). Confirm you edit all three; don't let the stale header make you skip the mission-page edit.

**Flag B — the mission page's CURRENT export shape differs from the plan's "before" assumption.** Plan Step 2 shows changing to `export default function MissionPage({ forcedMissionId, onExit }: MissionPageProps = {})` with `const params = useParams(); ... const missionId = forcedMissionId ?? (params.missionId as string);`. But the **current** first two lines of the component (`apps/web/src/app/(student)/mission/[missionId]/page.tsx:398-400`) are:
```tsx
export default function MissionPage() {
  const { missionId } = useParams<{ missionId: string }>();
  const router = useRouter();
```
So you must **replace** the destructured `const { missionId } = useParams<{ missionId: string }>()` line — not just prefix it. A correct reconciliation:
```tsx
interface MissionPageProps {
  forcedMissionId?: string;
  onExit?: () => void;
}

export default function MissionPage({ forcedMissionId, onExit }: MissionPageProps = {}) {
  const params = useParams<{ missionId: string }>();
  const router = useRouter();
  const missionId = forcedMissionId ?? params.missionId;
```
(`useParams` and `useRouter` are already imported at line 4 — `import { useParams, useRouter } from "next/navigation";`. `router` is still used for the route-fallback path, so keep it.)

**Flag C — there are THREE `router.push("/student/academy")` sites in the mission page, not one, and the plan's Step 2 only addresses "the done screen."** They are:
- **line 533** — the `error` phase "Back to the Academy" button
- **line 572** — the `done` phase "Return to the Academy" button
- **line 591** — the `dev-fallback` phase "Back to the Academy" button

For the overlay to behave correctly, **all three must prefer `onExit` when provided** (fall back to the route push otherwise). If you only wire the `done` screen (as the plan's literal `handleDone` example does), then exiting from the `error` or `dev-fallback` phase while inside the overlay will do a **full page navigation** to `/student/academy`, remounting the whole world — defeating the "world stays mounted" purpose. This matters *especially* for `dev-fallback` (line 591): **your Step-6 browser check runs in dev with no session token, so the mission loads in the `dev-fallback` phase, and its "Back to the Academy" button is the ONLY way to close the overlay in that flow.** If line 591 still does `router.push`, your verification cannot demonstrate the "returns to the Great Hall without a full page reload" requirement. Recommended: add one helper and wire all three buttons to it:
```tsx
function handleExit() {
  if (onExit) { onExit(); return; }
  router.push("/student/academy");
}
```
Then change all three buttons' `onClick={() => router.push("/student/academy")}` to `onClick={handleExit}`.

**Flag D — the plan's dynamic-import path in `MissionOverlay.tsx` is WRONG by one directory level.** The plan snippet (§4 Step 1) writes:
```tsx
const MissionPageInner = dynamic(
  () => import('../../mission/[missionId]/page').then((mod) => mod.default),
  { ssr: false },
);
```
But `MissionOverlay.tsx` lives in `(student)/academy/`, and the target lives in `(student)/mission/[missionId]/`. From `academy/`, `../` already reaches `(student)/`, so the correct path is **`'../mission/[missionId]/page'` (ONE `../`)**, not `'../../mission/[missionId]/page'` (TWO — that resolves to `app/mission/...`, which does not exist). Verified directly against the directory tree. **Use `'../mission/[missionId]/page'`.** (The `.then((mod) => mod.default)` is correct — `page.tsx` default-exports the component.)

**Flag E — after Step 3 removes the two `router.push` calls from the academy page, `useRouter`/`router` become UNUSED there.** Current `apps/web/src/app/(student)/academy/page.tsx` uses `router` at exactly two places (lines 42 and 52), both replaced by `setActiveMissionId(...)` in Step 3. So after Step 3, `import { useRouter } from "next/navigation";` (line 4) and `const router = useRouter();` (line 15) are dead. `tsc --noEmit` (Step 5) will NOT flag them (`apps/web/tsconfig.json` is `strict: true` but does **not** set `noUnusedLocals`), so Step 5 can pass with dead code — but `pnpm --filter @l3arn/web build`'s lint pass (which you run in §5) may complain, and it's dead code regardless. **Remove both the `useRouter` import and the `const router = useRouter()` line from the academy page.** (`useState` is already imported at line 3, so the plan's `import { useState } from 'react'` is already satisfied — don't add a duplicate import.)

**Non-drift confirmations (verified so you don't re-verify from scratch):**
- **`useWorldStore` is already exported** from `packages/world-engine/src/index.ts:33` (`export * from "./state/worldStore";`). Step 4 is a confirm-only no-op. `WorldEvent` is also already exported (line 22) and already imported by the academy page.
- **`exitMissionMode` exists** in `worldStore.ts` (needed by `handleMissionExit` in Step 3).
- **Minor cosmetic (NOT a Task 13 requirement):** on overlay close, `handleMissionExit` calls `exitMissionMode()` (restores Explore-mode bloom via Task 7's `PostProfiles`), but nothing issues a *new* camera move, so the camera stays wherever Task 12's "settle" left it (close to the Sorting Computer) rather than pulling back out. That's acceptable for Phase 1 and the plan doesn't ask for a "settle back". If it looks abrupt in your browser check, note it as a follow-up in the PR body — do **not** add a camera-reset unless you want to expand scope (it would touch `CameraRig`/the store, out of Task 13's Files).

### Your branch and worktree

A branch has been created for you: **`feature/3d-academy-task-13`**, branched fresh from the current tip of `origin/main` (`6c342c9`, Task 12). It exists **locally only — not yet pushed**. Push it yourself as part of §3's gate protocol once you commit. Once you commit, its only content beyond `main` will be this handoff document.

A worktree already exists checked out to this branch at:
```
E:\L3ARN\L3arn_repo\.worktrees\task-13
```
**Use this exact worktree. Do not create a new one.** Leave all other worktrees alone (`task-4`…`task-12` are merged/historical; `rebase-attempt-phase0-1` sits on `main` and is reused for post-merge verification; `track-a-holdings-backend` is unrelated separate work). Do not work in `E:\L3ARN\L3arn_repo` directly nor `E:\L3ARN` — those are a different, unrelated branch (`docs/3d-academy-world-spec`).

**This worktree's `apps/web/.env.local` is already present** (copied in while writing this handoff, byte-identical to the main checkout's copy — see §0 lesson 8). You do not need to redo this.

### Verify your starting point before doing anything else

This sequence was run in this worktree while writing this handoff (run the slow git/pnpm steps as **background tasks** — §0 lesson 9):

```bash
cd "E:\L3ARN\L3arn_repo\.worktrees\task-13"
git status --short                  # only the (untracked) handoff doc, if not yet committed
git log --oneline -1                # 6c342c9 "3D Academy Task 12 ... (#16)"
git branch --show-current           # feature/3d-academy-task-13
git fetch origin main
git log HEAD..origin/main --oneline # MUST be empty — confirmed empty
pnpm install                        # fresh worktree — run in background, NOT a hang
pnpm --filter @l3arn/shared-types build
pnpm --filter @l3arn/safety build
pnpm --filter @l3arn/mission-compiler build
pnpm -r typecheck                   # expect: all 7 packages Done, 0 errors
cd packages/world-engine && pnpm test   # expect: 16/16 passing (5 files)
```
The identical commit (`6c342c9`) was already proven healthy in the `rebase-attempt-phase0-1` worktree while writing this handoff (typecheck 7/7, world-engine 16/16, web build 21 routes) — so if `pnpm -r typecheck` does not pass cleanly for you at this starting point in the task-13 worktree, the problem is worktree-local (most likely `pnpm install` didn't finish, or `.env.local` is missing for the web build) — **stop and report rather than building on a broken baseline.**

---

## 3. The gate protocol (non-negotiable — this is how the project owner wants to work)

1. **Implement Task 13 completely** (see §4, and apply the Flag A–E corrections from §2).
2. **Verify**: run the exact commands the task and §5 specify, and confirm they pass. Don't just claim they pass — show the actual output. This includes the manual browser check (§5) — Task 13's whole point is the in-world overlay behavior, which typecheck/tests cannot prove.
3. **Commit** using the message the task specifies (§4 Step 7).
4. **Push** your branch: `git push -u origin feature/3d-academy-task-13` (it exists locally only so far — push it yourself).
5. **Open a PR** against `main`:
   ```bash
   gh pr create --title "3D Academy Task 13: Mission 001 as in-world overlay (not a route navigation)" --base main --head feature/3d-academy-task-13 --body "..."
   ```
   Write a real PR body: what this adds and why (the world now stays mounted-but-quiet behind a fullscreen overlay when a mission starts, so Task 12's camera "settle" reads as a deliberate two-modes transition instead of a pre-navigation flicker; the mission's pedagogy/telemetry/Railway calls are unchanged — only presentation changes); a test-plan checklist mirroring what you verified in step 2 (typecheck 7/7, world-engine 16/16, web build 21 routes, and the browser check showing the world visible-but-dimmed behind the mission card + the crystal-sorting/`tryCapture` calls still firing + exit returning to the Great Hall without a full reload); an explicit note that the mission page (`mission/[missionId]/page.tsx`) was modified additively so the standalone route still works (per Flag A); and carry forward the Task 7 N8AO status note the same way every prior PR did.
6. **Stop.** Do not merge the PR yourself. Do not start Task 14. The project owner will review, merge, and run their own post-merge verification. Report back (in your final message) that the PR is open, give them the URL, and stop.

**Why this matters:** the project owner has explicitly asked for a tight, one-task-at-a-time loop with a real PR and a real merge at every step — not a big batch landing at once. Respect that even if it feels like you could "just keep going."

---

## 4. Task 13: Mission overlay — Mission 001 runs in-world, not as a route navigation

*(Full, verbatim task text from `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md`, `### Task 13:`, lines ~2154–2323 as of this writing. If any discrepancy exists between this copy and the live file, the live file wins. **Apply the Flag A–E corrections from §2 as you execute — they are numbered references below where they bite.**)*

> **Files:**
> - Create: `apps/web/src/app/(student)/academy/MissionOverlay.tsx`
> - Modify: `apps/web/src/app/(student)/academy/page.tsx`
>
> *(→ **Flag A**: this header is incomplete — Step 2 also modifies `apps/web/src/app/(student)/mission/[missionId]/page.tsx`, and Step 7's `git add` includes it. Edit all three files.)*

Today, clicking the Sorting Computer does `router.push('/student/mission/mission-001')` — a full page navigation away from the 3D world. This task keeps the world mounted and quiet behind an overlay instead, satisfying "Mission 001 pedagogy intact in-world" without re-implementing the crystal-sorting gameplay in 3D (that gameplay, its telemetry via `tryCapture`, and its Railway calls are untouched — only *how it's presented* changes).

- [ ] **Step 1: Extract the existing mission page's inner logic into a reusable component**

Read the current file first to confirm the export shape:

Run: `head -30 "apps/web/src/app/(student)/mission/[missionId]/page.tsx"`

The existing default export is a full page component reading `missionId` from `useParams()`. Create a thin overlay wrapper that renders it without relying on the route param — instead accepting `missionId` as a prop:

```tsx
// apps/web/src/app/(student)/academy/MissionOverlay.tsx
'use client';

/**
 * MissionOverlay — renders the Mission 001 experience as a fullscreen
 * overlay ON TOP OF the (now-quieted, per the two-modes law) 3D Great Hall,
 * instead of navigating away to /student/mission/[missionId]. This is what
 * "Mission 001 pulled in-world" means in Phase 1: the world stays mounted
 * and visible-but-quiet behind the mission UI; the mission's own pedagogy,
 * telemetry (tryCapture), and Railway calls are entirely unchanged.
 */
import dynamic from 'next/dynamic';

const MissionPageInner = dynamic(
  () => import('../../mission/[missionId]/page').then((mod) => mod.default),
  { ssr: false },
);
```
*(→ **Flag D**: the import path above is WRONG by one level. Use `'../mission/[missionId]/page'` (ONE `../`), not `'../../mission/[missionId]/page'`.)*

```tsx
interface MissionOverlayProps {
  missionId: string;
  onClose: () => void;
}

export function MissionOverlay({ missionId, onClose }: MissionOverlayProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(8, 10, 20, 0.55)', // lets the quieted world read faintly behind the mission card
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflowY: 'auto',
      }}
    >
      <div style={{ width: '100%', maxWidth: '720px', margin: '2rem' }}>
        <MissionPageInner forcedMissionId={missionId} onExit={onClose} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add optional `forcedMissionId`/`onExit` props to the existing mission page so it works both as a route AND as an overlay**

Edit `apps/web/src/app/(student)/mission/[missionId]/page.tsx` — change the export signature (this is an additive change; the route usage `<MissionPage />` with no props continues to work exactly as before, reading from `useParams()`):

```tsx
interface MissionPageProps {
  forcedMissionId?: string;
  onExit?: () => void;
}

export default function MissionPage({ forcedMissionId, onExit }: MissionPageProps = {}) {
  const params = useParams();
  const router = useRouter();
  const missionId = forcedMissionId ?? (params.missionId as string);
```
*(→ **Flag B**: the current code is `const { missionId } = useParams<{ missionId: string }>();` — you must REPLACE that destructuring line, not prefix it. `useParams`/`useRouter` are already imported. Keep `router` — it's still used for the fallback path.)*

Find the existing "mission complete / done" screen's continue/exit action (wherever it currently calls `router.push(...)` back to the academy) and change it to prefer `onExit` when provided:

```tsx
function handleDone() {
  if (onExit) {
    onExit();
    return;
  }
  router.push('/student/academy');
}
```

(Wire `handleDone` to whatever button/effect currently triggers the return-to-academy navigation in the `"done"` phase — the exact JSX varies by what's already there; the contract is: **prefer `onExit`, fall back to the old route push** so both call sites keep working.)

*(→ **Flag C**: there are THREE `router.push("/student/academy")` buttons — `error` (line 533), `done` (line 572), `dev-fallback` (line 591) — not one. Wire ALL THREE to a single `handleExit()` helper (rename `handleDone` → `handleExit` if you like), so the overlay can close from any phase without a full navigation. The `dev-fallback` one is the button your Step-6 browser check will actually click, so it MUST go through `onExit`.)*

- [ ] **Step 3: Use the overlay from the academy page instead of routing away**

Edit `apps/web/src/app/(student)/academy/page.tsx`:

```tsx
import { useState } from 'react';
import { MissionOverlay } from './MissionOverlay';
import { useWorldStore } from '@l3arn/world-engine';
```
*(→ `useState` is already imported at line 3 — add only `MissionOverlay` and `useWorldStore`. → **Flag E**: after this step, remove the now-unused `import { useRouter } from "next/navigation";` (line 4) and `const router = useRouter();` (line 15).)*

Add state and replace the `object-interact` handling:

```tsx
const [activeMissionId, setActiveMissionId] = useState<string | null>(null);
```

```tsx
function handleWorldEvent(event: WorldEvent) {
  switch (event.type) {
    case 'object-interact':
      if (event.objectId === 'sorting-computer') {
        setActiveMissionId('mission-001');
      }
      break;
    case 'avatar-move-requested':
      console.log('[L3ARN] Avatar move requested to:', event.targetPosition);
      break;
    case 'scene-transition':
      console.log('[L3ARN] Scene transition:', event.fromScene, '→', event.toScene);
      break;
    case 'mission-trigger':
      setActiveMissionId(event.missionId);
      break;
    default: {
      const _exhaustive: never = event;
      console.warn('[L3ARN] Unhandled world event:', _exhaustive);
    }
  }
}

function handleMissionExit() {
  setActiveMissionId(null);
  useWorldStore.getState().exitMissionMode();
}
```

Add the overlay render, right after the existing `<div style={styles.hudOverlay}>` block, still inside the outer `<div style={styles.canvasContainer}>`:

```tsx
{activeMissionId && (
  <MissionOverlay missionId={activeMissionId} onClose={handleMissionExit} />
)}
```

- [ ] **Step 4: Export `useWorldStore` from the world-engine package if not already public**

Check `packages/world-engine/src/index.ts` — it already has `export * from "./state/worldStore";`, so `useWorldStore` is already exported. No change needed; confirm with:

Run: `grep -n "useWorldStore" packages/world-engine/src/index.ts`
Expected: the barrel `export * from "./state/worldStore"` line is present. *(→ Confirmed present at line 33 for this handoff — this step is a no-op.)*

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @l3arn/web typecheck`
Expected: PASS.

- [ ] **Step 6: Manual verification**

Run: `pnpm --filter @l3arn/web dev`, open `/student/academy`, click the Sorting Computer.
Expected: the 3D world stays mounted and visible (dimmed/blurred) behind the mission card; the crystal-sorting mission plays exactly as it did before (same steps, same telemetry — check the Network tab for the existing `captureEvidence`/`completeMission` calls firing); completing or exiting the mission returns to the (now Explore-mode, bloom-restored) Great Hall without a full page reload. Stop the dev server.

*(→ See §5 for the concrete headless-Playwright recipe, including the route-URL note and the Windows dev-server-orphan cleanup. In dev with no session token the mission loads in the `dev-fallback` phase — that's expected and is exactly why Flag C's "wire the dev-fallback exit through onExit" matters.)*

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/\(student\)/academy/ apps/web/src/app/\(student\)/mission/
git commit -m "feat(academy): render Mission 001 as an in-world overlay instead of a route navigation"
```

---

*(Handoff-writer's notes, not part of the verbatim task text. All verified live while writing this handoff — but re-verify at execution time, since time passes and code drifts.)*

**(1) The browser-check URL is `/academy`.** `(student)` is a Next route group, stripped from the URL. Navigate Playwright to `http://localhost:<port>/academy` (NOT `/student/academy` — though that also resolves via the next.config rewrite, `/academy` matches the group directly and is simplest for the check). The dev server picks a port from its stdout (3000–3002+ have all been used historically — read the actual port from the `next dev` output).

**(2) Do NOT "fix" the `/student/...` paths.** Per §0 lesson 10, `router.push("/student/academy")` is intentional and resolves via `next.config.mjs` rewrites. The mission page's route-fallback keeps `router.push("/student/academy")` — leave it as-is. The whole app uses these prefixes uniformly.

**(3) No new dependencies.** `next/dynamic`, `useWorldStore`, `MissionOverlay` (new local file), the mission page — all already present or created in-task. Nothing to `pnpm add`.

**(4) The mission page is ~1000 lines** (`apps/web/src/app/(student)/mission/[missionId]/page.tsx`) — but Task 13 touches only the top ~40 lines (the export signature, Flag B) and the three "back to academy" buttons (Flag C, lines 533/572/591). The crystal-sorting components, `tryCapture` telemetry, `startMission`/`completeMission` Railway calls, and all styling are UNCHANGED. Do not refactor the gameplay.

---

## 5. After Step 7 — before you open the PR

Run the full workspace typecheck to make sure the edits didn't break types:
```bash
pnpm -r typecheck
```
Expected: all 7 packages `Done`, 0 errors.

Run the `world-engine` test suite to confirm no regression (Task 13 doesn't touch `packages/world-engine` source, so this should be untouched — confirm anyway):
```bash
cd packages/world-engine && pnpm test
```
Expected: still **16/16** (or more, if new tests were added — just confirm 0 failures).

Run the web build to confirm the app still builds AND lints (this is where a leftover unused `router`/`useRouter` from Flag E would surface, if `tsc` didn't catch it):
```bash
pnpm --filter @l3arn/web build
```
Expected: exit 0, full 21-route table (`/academy` ~371 kB, same shape as §2's baseline). **If this fails with a Supabase client error, see §0 lesson 8 — you're likely missing `apps/web/.env.local`** (this worktree should already have it, per §2).

Do the **browser check** (this is the real point of Task 13 — typecheck/tests can't prove the overlay behavior). Reuse Task 10/11/12's headless, objective-first approach:
- Start `pnpm --filter @l3arn/web dev` **backgrounded** (it doesn't exit on its own — don't block on it; read the actual port from its stdout).
- Navigate headless Playwright to `http://localhost:<port>/academy`. Wait ~3s for the 3D scene to render (the canvas is the ~150px strip from §0 lesson 10 — that's expected).
- **Before-click screenshot.** Confirm the Great Hall + "Click the Sorting Computer to begin" HUD is visible and there are **0 console errors** (the N8AO warnings are expected; there is no favicon error).
- **Click the Sorting Computer.** Its clickable mesh sits just below its "Sorting Computer" label — during Task 12 the label anchored around screen `(698, 90)` and a click at `(695, 106)` reliably hit the mesh at the default 1280-wide viewport; re-derive it from a fresh snapshot if your viewport differs. **Unlike Task 12, the page must NOT navigate** — the URL stays `/academy` and a fullscreen overlay appears. (If the URL changes to `/student/mission/...`, your Step 3 wiring didn't take — the old `router.push` path is still firing.)
- **Overlay screenshot.** Confirm: (a) a dimmed/blurred mission card is centered over the viewport; (b) the Great Hall is faintly visible behind it (the `rgba(8,10,20,0.55)` + `blur(6px)` backdrop); (c) 0 new console errors. In dev with no session token you'll see the `dev-fallback` mission card ("DEV: no session token…") with a "Back to the Academy" button — that's expected.
- **Click "Back to the Academy" in the overlay.** Confirm the overlay closes, the URL is still `/academy` (**no full navigation / no page reload**), and the Great Hall is interactive again. This is the load-bearing proof that Flag C was applied (the `dev-fallback` exit routed through `onExit`, not `router.push`). If instead the page reloads/navigates, fix Flag C.
- *(If you can drive a real session token in dev, also verify the crystal-sorting steps play and the `captureEvidence`/`completeMission` network calls fire — but the no-token `dev-fallback` path is sufficient to prove the overlay mount/quiet/close behavior, which is what Task 13 changes.)*
- **Stop the dev server — and verify it's actually stopped**, not just that the stop command reported success. This project's `next dev` on Windows has repeatedly left an orphaned `node.exe` (`next-server`) holding the port even after the wrapping task is torn down (confirmed AGAIN during Task 12: after task-stop, PID was still listening on 3002). Check `Get-NetTCPConnection -LocalPort <port> -State Listen` (PowerShell), `Stop-Process -Id <pid> -Force`, then re-check the port shows no listener before moving on.

Then follow §3 steps 3–6: commit, push, open the PR, stop.

---

## 6. What happens next (for whoever picks this up after the PR merges)

Once the project owner merges this PR and confirms post-merge verification (`pnpm -r typecheck`, the world-engine test suite, `pnpm --filter @l3arn/web build`, and a real render check on `https://l3arnupdated.vercel.app/academy` — re-verify this is still the correct production URL via the repo `homepageUrl` + Vercel commit `target_url`, don't assume) is good, **the next step is Task 14** — read `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` (search `### Task 14: Mastery-gated building — first real "build layer" unlock`) for its exact scope. **Important cross-dependency:** Task 14 inserts an `unlockHolding(...)` call into the mission-success path — the SAME success path Task 13 just restructured (now flowing through the overlay's `onExit`/`handleMissionExit` and the mission page's completion). Read Task 13's actual merged code carefully when scoping Task 14 so the unlock hook lands in the right place. Also **re-check whether Task 14's backend track (Track A)** — the `world_holdings` Supabase migration, `packages/shared-types/src/world-holdings.schema.ts`, and the two new Express routes in `services/ai-workers/src/routes/student-session.route.ts` — has landed out-of-band yet (it had NOT as of this handoff; re-verify, don't assume). Task 14 may be partially done already if Track A landed by then.

Whoever does that — write a new handoff at `docs/superpowers/plans/handoffs/<date>-handoff-task-14.md`, following the exact structure of this document:
- §0: the "verify, don't trust" reminder (keep it — ten lessons deep now; add an eleventh if Task 13 surfaced its own during execution, e.g. anything about the `next/dynamic` overlay pattern, the `forcedMissionId`/`onExit` dual-mode page, or the overlay browser check that this plan text couldn't have anticipated).
- §1: project context (copy nearly verbatim; update only the "which task / which phase" framing).
- §2: exact current state — **freshly verified, not copied**: confirm Task 13's squash commit is the `origin/main` tip and its merge-commit status is green; create `feature/3d-academy-task-14` from the current tip; set up `.worktrees/task-14`; run the full verification sequence (fetch/range-empty, install, dist builds, typecheck 7/7, world-engine tests) — **background the slow git/pnpm steps** per §0 lesson 9. Re-check N8AO status, re-confirm the production URL actually serves the merged Task 13 changes (e.g. grep the deployed `/academy` chunk for `MissionOverlay`/`activeMissionId`), and re-check whether Track A landed. **And — as this handoff did for Task 13 — read every file Task 14 modifies in its CURRENT state and flag any plan-vs-code drift (stale Files headers, wrong relative-import depths, changed export shapes, multi-site edits the plan mentions once). Don't assume any task's Files header or snippet is trustworthy.**
- §3: the gate protocol (copy verbatim; update the branch-already-pushed-or-not note to match reality).
- §4: Task 14's full verbatim text, pulled fresh from the plan doc.
- §5: any task-specific post-implementation verification (reuse the headless-Playwright, objective-first approach + the Windows-orphan cleanup if Task 14 needs a browser check).
- §6: this same "what happens next" section, updated to point past Task 14.

This pattern (verify fresh state → fresh branch → full task text → pre-verify snippets against real code/tools/URLs/paths → implement → verify (incl. browser) → PR → stop) repeats for every task through Task 17. Do not skip the "freshly verify, don't copy" step in §2 — trusting stale local state instead of re-checking `origin/main` is exactly the mistake that cost the multi-hour git archaeology §0 warns about.
