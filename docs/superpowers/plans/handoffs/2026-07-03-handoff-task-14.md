# Handoff: L3ARN 3D Academy — Task 14 (Mastery-gated building — first real "build layer" unlock)

**You are a fresh Claude Code agent with no memory of prior conversations. This document is self-contained — everything you need is here or linked from here. Read this whole document before touching any code.**

---

## 0. Read this first: the one rule that matters most

**Verify, don't trust.** This has already paid off eleven times on this project. The short version of the running ledger (each was a real incident, not a hypothetical):

1. A prior session built hours of work on a stale, locally-cached copy of `main` that didn't match GitHub — required a careful rebase + byte-for-byte recovery.
2. Task 6's plan snippet used raw numeric `camera-controls` `ACTION` values from v2, which are **wrong** in the installed v3 (bit-flags shifted). Caught only by reading the installed `.d.ts`.
3. Task 7's `<N8AO>` triggers a per-frame WebGL warning — a documented upstream `pmndrs/postprocessing` bug, disclosed rather than silently patched. **Still unresolved** — see §2.
4. Task 9's plan snippet imported `@gltf-transform/core` (only `@gltf-transform/cli` was a root devDep) and ran `vitest` from repo root (only `packages/world-engine` had it). Both caught by actually running the commands.
5. Task 9's CI workflow hard-coded `node-version: 20`, which passed every local check but failed the first real GitHub Actions run in ~13s (`pnpm@11.7.0` needs Node ≥ 22.13). Only the real CI run caught it.
6. Task 10's `<Environment files="/env/...hdr">` 404'd because `apps/web` had never had a `public/` dir. Fixed with `scripts/sync-world-engine-public.mjs`. **Merged and on `main` — don't redo it.**
7. `docs/AI_PRODUCTION_SETUP.md` references `https://l3arn.vercel.app` as prod — that returns 200 but for an unrelated Locofy site. The **real production URL** (confirmed via the repo's `homepageUrl` + Vercel's commit-status `target_url`) is **`https://l3arnupdated.vercel.app`**. A 200 alone proves nothing — check `X-Matched-Path`/content. (Re-confirmed for this handoff: repo `homepageUrl` = `https://l3arnupdated.vercel.app`; prod `/academy` returns `200` + `X-Matched-Path: /academy` + `X-Vercel-Cache: PRERENDER`.)
8. A fresh worktree is missing `apps/web/.env.local` — it's gitignored/untracked, and `git worktree add` only checks out *tracked* files. The web build fails during static prerender with `@supabase/ssr: Your project's URL and API key are required...` until it's copied in (byte-identical across sibling worktrees — safe to copy). **This handoff's own worktree already has it copied in — see §2.**
9. On this machine, `git worktree add` and `pnpm install` on a fresh worktree can be **very** slow — one `pnpm install` took over an hour once; `git worktree add` needs multiple minutes to check out ~211 files. **Run these as background tasks, not foreground**, or they hit the 2-minute foreground timeout mid-checkout and leave a corrupt partial tree. If you hit `fatal: Unable to create '.../index.lock': File exists`, check `ps aux | grep git` for a process whose command line references *your* worktree path before removing the lock.
10. From Task 12/13: **The `/student/*`, `/parent/*`, `/admin/*` URL prefixes are INTENTIONAL, not a bug.** `apps/web/next.config.mjs` has `rewrites()` mapping `/student/:path* → /:path*` (and parent/admin). So `router.push("/student/academy")` resolves correctly. **Do not "fix" the `/student/...` paths.** The browser-check URL is `/academy` (the `(student)` route group is stripped from the URL); navigate Playwright there. The `/academy` R3F canvas renders in a ~150px-tall strip (confirmed on local headless dev AND live prod — real, not a headless artifact); it does not affect a `position:fixed` fullscreen overlay.
11. **NEW, from Task 13's execution — the single most important lesson for Task 14:** **You cannot repurpose a Next.js `page.tsx` default export as a prop-taking component.** Task 13's plan said "add `forcedMissionId`/`onExit` props to the mission `page.tsx` default export and import it into an overlay." That passed `tsc --noEmit` but **failed `next build`** — Next 15.5 requires a `page.tsx` default export to satisfy the generated `PageProps` type (its props must be `{ params, searchParams }`), and forbids arbitrary props / extra named value exports on a route file. The fix — now merged — was to **extract the entire dual-mode component into a sibling file, `apps/web/src/app/(student)/mission/[missionId]/MissionExperience.tsx`**, exporting `export function MissionExperience({ forcedMissionId, onExit }: MissionExperienceProps = {})`, and reduce `page.tsx` to a thin wrapper: `export default function MissionPage() { return <MissionExperience />; }`. **This directly bites Task 14: Step 7 tells you to hook `unlockHolding` in "`mission/[missionId]/page.tsx`, right after the existing `completeMission(...)` call" — but that call now lives in `MissionExperience.tsx`, NOT `page.tsx` (which no longer contains any mission logic). See §2 Flag C.** The general rule: for any "reuse a page component as a plain component" move on this stack, extract to a sibling file — never add props to a `page.tsx` default export.

**Before you write a single line of code**, run (in the worktree, see §2):
```bash
cd "E:\L3ARN\L3arn_repo\.worktrees\task-14"
git fetch origin main
git log HEAD..origin/main --oneline   # MUST be empty
```
If the second command prints anything, **stop and investigate** — your branch is behind `main`. Confirmed empty when this handoff was written; check anyway.

When a plan snippet hard-codes values, API shapes, SQL column names, **or relative import paths**, verify them against the real files/tree before trusting them (this handoff caught a broken RLS policy column and a moved edit site in Task 14's own snippets — see §2 Flags C & D). When a snippet targets an environment you're not in (the live Supabase project, a running Railway service, a browser, CI), verify **in that environment** — local success doesn't transfer.

---

## 1. What L3ARN is and what this work is

L3ARN is a parent-led + student-driven learning platform. Students explore a browser-based 3D "Academy" world, guided by an AI companion, undertaking learning missions. The 3D world (`packages/world-engine`) is being incrementally upgraded from a primitive placeholder toward a "premium-stylized" world. Reference docs:

- **Spec:** `docs/superpowers/specs/2026-06-30-3d-academy-world-design.md` — the full design vision. §3.4 "Mastery Makes the World" is the pillar Task 14 realizes end-to-end for the first time.
- **Plan:** `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` — the task-by-task Phase 0/1 plan. **Primary reference — read it in full**, especially the "Execution Strategy" section near the top (dependency graph, gate protocol) and Task 14's full text (also reproduced verbatim in §4 below; the live file is authoritative if they ever disagree).

**Task 14 is the fifth task of Phase 1 (The Living Great Hall vertical slice).** Phase 0 (Tasks 0–9), Task 10 (Real IBL), Task 11 (PBR material pass), Task 12 (Explore→Mission camera "settle"), and Task 13 (Mission 001 as in-world overlay) are complete and merged. Task 14 realizes **"Mastery Makes the World" (spec §3.4) end-to-end for exactly one building, backed by a real Supabase table** — not a mock. On demonstrated mastery of Mission 001, a "Fractions Observatory" holding is unlocked (persisted in a new `world_holdings` table), and its building becomes visible in the Great Hall. It follows the identical pattern already used by `/api/student/session/house` and `/api/student/session/companion` (`requireChildSession` + `getSupabaseServiceClient`), so it fits the codebase's existing conventions exactly. **The mastery framing is load-bearing: a holding unlocks on demonstrated mastery of a specific mission — never on points or currency, and there is no "locked/greyed-out" placeholder (a visible-but-locked building would read as a purchasable reward, the exact framing this feature exists to avoid).**

---

## 2. Exact current state — start here

**Tasks 0, 3–9 merged; Task 10 (PR #14); Task 11 (PR #15); Task 12 (PR #16).**

**Task 13** (Mission 001 as in-world overlay) is **merged via PR #17 (squash commit `4c785a9`)** — it is the current tip of `origin/main`. Freshly verified for this handoff (not copied):
- `gh pr view 17` → `state: MERGED`, merged `2026-07-03T17:29:38Z`, squash commit `4c785a95e9b6dd33e3d66883b2dc0ecb5d0f16d2`.
- `git log origin/main --oneline -1` → `4c785a9 3D Academy Task 13: Mission 001 as in-world overlay (not a route navigation) (#17)`.
- Combined commit status on `4c785a9`: **`success`** — `Vercel`: "Deployment has completed"; `L3arn Updated - l3arn_updated` (Railway): "Success".
- **Post-merge verification** (done in the `rebase-attempt-phase0-1` worktree, fast-forwarded `6c342c9..4c785a9`): dist builds OK, `pnpm -r typecheck` **7/7 packages Done / 0 errors**, `packages/world-engine` suite **16/16** (5 files), `pnpm --filter @l3arn/web build` **exit 0 with the full 21-route table** (`/academy` now **372 kB**, up ~1 kB from Task 12's 371 kB — the overlay).
- **Confirmed genuinely LIVE in production, not just merged**: `https://l3arnupdated.vercel.app/academy` → 200 / `X-Matched-Path: /academy` / prerendered; and the deployed `/academy` JS chunk (`/_next/static/chunks/app/(student)/academy/page-*.js`) contains Task 13's overlay fingerprint — the exact MissionOverlay inline styles `blur(6px)`, `rgba(8, 10, 20, 0.55)`, `backdropFilter`, plus the `MissionExperience` dynamic-import reference (`loadableGenerated:{webpack:()=>[8140]`). (`activeMissionId` is absent because it minifies to a local var — that's expected; the style-literal fingerprints are the reliable proof.)

**How Task 13 restructured the mission code (you MUST understand this for Task 14):**
- `apps/web/src/app/(student)/mission/[missionId]/page.tsx` is now a **thin wrapper**: `export default function MissionPage() { return <MissionExperience />; }`.
- All the mission logic (`startMission`/`completeMission`/`tryCapture`, the phases, the three "back to the Academy" buttons wired through a `handleExit()` that prefers `onExit`) lives in **`apps/web/src/app/(student)/mission/[missionId]/MissionExperience.tsx`** (~1043 lines), which exports `MissionExperience({ forcedMissionId, onExit })`.
- `apps/web/src/app/(student)/academy/MissionOverlay.tsx` renders `MissionExperience` (via `dynamic(() => import("../mission/[missionId]/MissionExperience").then(m => m.MissionExperience), { ssr: false })`) as a `position:fixed` fullscreen overlay when a mission is active.
- `apps/web/src/app/(student)/academy/page.tsx` holds `activeMissionId` state; `handleWorldEvent` sets it (no more `router.push` to a mission route); `handleMissionExit` clears it and calls `useWorldStore.getState().exitMissionMode()`. **`useWorldStore` is already imported here (line 4).**

**Known open issue carried forward from Task 7 (still unresolved, NOT in Task 14's scope):** `<N8AO>` inside `packages/world-engine/src/render/PostProfiles.tsx`'s `EffectComposer` emits a per-frame WebGL console **warning** (`GL_INVALID_OPERATION: glBlitFramebuffer: Read and write depth stencil attachments cannot be the same image`). Re-confirmed still present and untouched for this handoff: `git log --oneline -1 -- packages/world-engine/src/render/PostProfiles.tsx` is still Task 7's merge commit `8a0af30`. Documented upstream `pmndrs/postprocessing` architectural bug; a warning not an error, no visual defect. **Task 14 does not touch the render pipeline.** Carry it forward in your PR body as PRs #11–#17 all did.

**Track A (Task 14's backend slice) status — checked fresh, has NOT landed out-of-band:** confirmed via direct search of the current `main` tip — **no** `world_holdings`-named file under `supabase/migrations/` (migrations run `001`–`012`; next number is `013`), **no** `world-holdings`/`holding`-named file under `packages/shared-types/src/`, and **no** "holding" reference in `services/ai-workers/src/routes/student-session.route.ts`. **Track A has not landed — you are building all of Task 14 (Steps 1–11).** The only pre-existing "holding" reference anywhere is the placeholder stub file — see Flag B.

### CRITICAL — Task 14's plan text has several drift points vs. the current code. All independently verified for this handoff. Read these before executing §4:

**Flag A — the "Files" header is INCOMPLETE (same failure mode as Task 13's).** Task 14's Files header (§4) lists 7 files but **omits two files the steps actually edit**:
- **`packages/world-engine/src/state/worldStore.ts`** — Step 6 adds `unlockedHoldingIds` state to it. Not in the header.
- **The mission-completion file** — Step 7 edits it to fire the unlock. The header doesn't name it, and the name the plan *does* use in Step 7 (`mission/[missionId]/page.tsx`) is **wrong** post-Task-13 (see Flag C). Step 11's `git add` includes `apps/web/src/app/(student)/mission/` (the whole dir), so it's captured in the commit — but don't let the stale header make you skip the edit.

So Task 14 touches **9 files**, not 7. Full corrected list:
1. Create `packages/shared-types/src/world-holdings.schema.ts`
2. Modify `packages/shared-types/src/index.ts`
3. Create `supabase/migrations/013_world_holdings.sql`
4. Modify `services/ai-workers/src/routes/student-session.route.ts`
5. Modify `apps/web/src/lib/student-session.ts`
6. **Modify (NOT create)** `packages/world-engine/src/objects/MasteryBuilding.tsx` — see Flag B
7. Modify `packages/world-engine/src/state/worldStore.ts` — **(missing from header)**
8. Modify `apps/web/src/app/(student)/academy/page.tsx`
9. Modify `apps/web/src/app/(student)/mission/[missionId]/MissionExperience.tsx` — **(missing from header; NOT page.tsx)** — see Flag C

**Flag B — `MasteryBuilding.tsx` is listed as "Create" but it ALREADY EXISTS as a null-rendering stub.** Current content of `packages/world-engine/src/objects/MasteryBuilding.tsx`:
```tsx
/**
 * MasteryBuilding — placeholder until Task 14 wires the real mastery-gated
 * unlock (Supabase `world_holdings` table, spec §3.4). Renders nothing.
 */
interface MasteryBuildingProps {
  position?: [number, number, number];
  holdingId: string;
}

export function MasteryBuilding(_props: MasteryBuildingProps) {
  return null;
}
```
You must **replace the body** (Step 5's real render), not create a new file. Two things the plan doesn't tell you, both verified:
- **It is already mounted in the scene.** `packages/world-engine/src/scenes/GreatHall.tsx:16` imports it and **line 78** renders `<MasteryBuilding position={[6, 0, -8]} holdingId="fractions-observatory" />` (a Task 11 forward reference). So Step 10's "the Fractions Observatory is now visible at `[6, 0, -8]`" is **already wired** — you do NOT need to edit `GreatHall.tsx` or add a scene mount. Just make the component render when unlocked. (Keep the `holdingId` prop required; the plan's Step 5 signature `position: [number, number, number]` is compatible with the existing call site, which passes `position`.)
- **Order matters:** Step 5's real body reads `useWorldStore((s) => s.unlockedHoldingIds)`, which does not exist on the store until Step 6. **Do Step 6 (worldStore) before Step 5 typechecks**, or do both before running `tsc`.
- **No barrel change needed.** `MasteryBuilding` is consumed by `GreatHall.tsx` via a relative import (`../objects/MasteryBuilding`), not via `packages/world-engine/src/index.ts`. Nothing outside the package imports it. Do **not** add a barrel export (unlike `SortingComputer`/`PlayerAvatar`, which are exported for external use). The plan doesn't ask you to, and you don't need to.

**Flag C — Step 7's `completeMission(...)` edit site MOVED from `page.tsx` to `MissionExperience.tsx` (this is lesson 11 biting).** Step 7 says to add the `unlockHolding(...)` call in "`apps/web/src/app/(student)/mission/[missionId]/page.tsx`, right after the existing `completeMission(...)` call succeeds." But post-Task-13, `page.tsx` is a thin wrapper with **no** `completeMission` call. The real call site is **`apps/web/src/app/(student)/mission/[missionId]/MissionExperience.tsx`**, inside `handleComplete` (a `useCallback`), at approximately line 525:
```tsx
const outcome = await completeMission(input);
if (outcome.ok) {
  setResult(outcome.data);
  setPhase("done");
  // ← INSERT THE UNLOCK HOOK HERE
  updateCalibration().catch(() => {}); // best-effort: update calibration snapshot
} else {
  setErrorMessage(outcome.message);
  setPhase("error");
}
```
Insert, immediately after `setPhase("done");`:
```tsx
if (missionId === "mission-001") {
  const unlockResult = await unlockHolding("fractions-observatory", missionId);
  if (unlockResult.ok) {
    useWorldStore.getState().addUnlockedHoldingId("fractions-observatory");
  }
  // Best-effort: a failure here must NOT block the mission-complete screen —
  // the authoritative mastery record (completeMission's response) already saved.
}
```
(`missionId` is already in scope at `MissionExperience.tsx:420` — `const missionId = forcedMissionId ?? params.missionId;`.)

Imports for `MissionExperience.tsx` (verified against its current top-of-file):
- It **already imports** from the web lib: `import { startMission, completeMission, updateCalibration, type CompleteMissionInput } from "../../../../lib/student-session";` — **merge `unlockHolding` into this existing import**, don't add a second line. (The depth `../../../../lib` is correct — `MissionExperience.tsx` is in the same directory `page.tsx` was.)
- It does **NOT** import `useWorldStore`. Add `import { useWorldStore } from "@l3arn/world-engine";` (it imports only `@l3arn/shared-types` types from a package today). The plan's "if not already present" note is correct here — it's NOT present in this file.

**Flag D — the migration's `world_holdings_parent_read` RLS policy is BROKEN as written.** Step 1's policy body is:
```sql
using (
  child_profile_id in (
    select id from child_profiles where household_id in (
      select household_id from household_members where user_id = auth.uid()
    )
  )
);
```
But `household_members` **has no `user_id` column**. Verified against `supabase/migrations/001_identity_household_consent.sql:345` — its columns are `id, household_id, parent_account_id (→ parent_accounts(id)), role, invited_at, accepted_at`. The membership↔auth link is not `user_id`. The project already has the correct abstraction: **`public.auth_owns_household(hh_id uuid)`** (defined at `001:136`), a `SECURITY DEFINER` function that returns `EXISTS (SELECT 1 FROM households WHERE id = hh_id AND parent_account_id = auth.uid() AND deleted_at IS NULL)`. `child_profiles` has a `household_id` column (`001:384`). Use the helper — it's exactly what `household_members`' own parent-read policy uses (`001:369`). **Corrected policy:**
```sql
-- Parents can read their own child's holdings (ADR-008 parent visibility).
create policy world_holdings_parent_read
  on world_holdings
  for select
  using (
    child_profile_id in (
      select id from public.child_profiles
      where public.auth_owns_household(household_id)
    )
  );
```
The `world_holdings_service_role_all` policy in Step 1 is fine as written. Before applying, still run `mcp__claude_ai_Supabase__list_tables` (or read `001`) to re-confirm these names haven't drifted.

**Flag E — academy-page hydration (Step 7) has a placement trap.** Step 7 adds a `getHoldings().then(...)` inside the existing identity `useEffect` "after resolving `verified`." But that `useEffect` (`academy/page.tsx:24–36`) has an **early `return;` at line 29** in the verified branch:
```tsx
const verified = getVerifiedIdentity();
if (verified) {
  setDisplayName(verified.displayName);
  setHouse(asRealHouse(verified.house));
  return;                       // ← line 29
}
```
You must insert the `getHoldings()` call **before that `return;`** (i.e., right after `setHouse(asRealHouse(verified.house));`), or it will be dead code that never runs for real (verified) users. Also:
- **`useWorldStore` is already imported** in `academy/page.tsx` (line 4, from Task 13) — do **not** re-add it.
- Merge `getHoldings` into the existing import: `import { getVerifiedIdentity, getHoldings } from "../../../lib/student-session";` (depth `../../../lib` matches the existing `getVerifiedIdentity` import — correct).

**Flag F — Step 4's mid-file `import type {...}` and Step 2 placement are cosmetic, but tidy them.** Step 4 shows an `import type { GetHoldingsResponse, UnlockHoldingResponse } from "@l3arn/shared-types";` in the *middle* of `student-session.ts`. Put it with the other top-of-file imports instead (mid-file imports are legal but the lint pass in `pnpm --filter @l3arn/web build` may complain, and it's inconsistent with the file). Step 2's `export * from "./world-holdings.schema";` belongs in the "string IDs only; no cross-schema imports" group of `shared-types/src/index.ts` (the schema only uses `z.string()`), near the `evidence`/`parent-report`/`moderation` exports — matching the dependency-order comment block at the top of that file.

**Non-drift confirmations (verified so you don't re-verify from scratch):**
- **All the backend anchors the plan relies on exist:** `services/ai-workers/src/routes/student-session.route.ts` already imports `validateBody` (from `../middleware/validate`), `getSupabaseServiceClient` (from `../lib/supabase`), `requireChildSession` (from `../lib/child-session`), and `SetHouseRequestSchema` et al. from `@l3arn/shared-types`; the `/house` and `/companion` POST handlers are the exact template Step 3's routes mirror. `export const studentSessionRouter` is at line 40; append the two new routes after the last existing route.
- **All the web-lib anchors exist:** `apps/web/src/lib/student-session.ts` has `ApiOutcome<T>` (35), `railwayBaseUrl()` (39), `NOT_CONFIGURED` (44), `getSessionToken()` (58), `parseError()` (87), and `authedPost<T>()` (233). There is **no** `authedGet` yet (Step 4 adds it) and **no** `getHoldings`/`unlockHolding` yet.
- **`shared-types/src/index.ts`** re-exports schemas with `export * from "./x.schema";` — Step 2 matches.
- **Migration numbering:** `013` is the correct next number (existing are `001`–`012`).

### Your branch and worktree

A branch has been created for you: **`feature/3d-academy-task-14`**, branched fresh from the current tip of `origin/main` (`4c785a9`, Task 13). It exists **locally only — not yet pushed**. Push it yourself as part of §3's gate protocol once you commit. Its only content beyond `main` at handoff time is this handoff document.

A worktree already exists checked out to this branch at:
```
E:\L3ARN\L3arn_repo\.worktrees\task-14
```
**Use this exact worktree. Do not create a new one.** Leave all other worktrees alone (`task-4`…`task-13` are merged/historical; `rebase-attempt-phase0-1` sits on `main` and is reused for post-merge verification; `track-a-holdings-backend` is unrelated separate work). Do not work in `E:\L3ARN\L3arn_repo` directly nor `E:\L3ARN` — those are a different, unrelated branch (`docs/3d-academy-world-spec`).

**This worktree's `apps/web/.env.local` is already present** (copied in while writing this handoff, byte-identical to the main checkout's copy — see §0 lesson 8). You do not need to redo this.

### Verify your starting point before doing anything else

This sequence was run in this worktree while writing this handoff (run the slow git/pnpm steps as **background tasks** — §0 lesson 9):

```bash
cd "E:\L3ARN\L3arn_repo\.worktrees\task-14"
git status --short                  # only the (untracked/committed) handoff doc
git log --oneline -1                # handoff commit, atop 4c785a9
git branch --show-current           # feature/3d-academy-task-14
git fetch origin main
git log HEAD..origin/main --oneline # MUST be empty — confirmed empty
pnpm install                        # fresh worktree — run in background, NOT a hang
pnpm --filter @l3arn/shared-types build
pnpm --filter @l3arn/safety build
pnpm --filter @l3arn/mission-compiler build
pnpm -r typecheck                   # expect: all 7 packages Done, 0 errors
cd packages/world-engine && pnpm test   # expect: 16/16 passing (5 files)
```
The identical starting commit (`4c785a9`) was proven healthy while writing this handoff (typecheck 7/7, world-engine 16/16, web build 21 routes). If `pnpm -r typecheck` does not pass cleanly at this starting point, the problem is worktree-local (most likely `pnpm install` didn't finish, or `.env.local` is missing for the web build) — **stop and report rather than building on a broken baseline.**

---

## 3. The gate protocol (non-negotiable — this is how the project owner wants to work)

1. **Implement Task 14 completely** (see §4, and apply the Flag A–F corrections from §2).
2. **Verify**: run the exact commands the task and §5 specify, and confirm they pass. Don't just claim they pass — show the actual output. **Be scrupulously honest about the backend/E2E boundary (see §5):** the code, typecheck, web build, and world-engine tests are fully verifiable by you; the *full* persist-across-reload E2E (Step 10) additionally requires the migration applied to the live Supabase project (Step 9) **and** a real child session token (the dev-fallback path has no token, so `completeMission` — and therefore the unlock — never fires). Verify what you can objectively verify, and state precisely what remains pending. Do not claim the end-to-end unlock works if you have not observed it.
3. **Commit** using the message the task specifies (§4 Step 11).
4. **Push** your branch: `git push -u origin feature/3d-academy-task-14`.
5. **Open a PR** against `main`:
   ```bash
   gh pr create --title "3D Academy Task 14: Mastery-gated building — first holding unlock (Mastery Makes the World)" --base main --head feature/3d-academy-task-14 --body "..."
   ```
   Write a real PR body: what this adds and why (first end-to-end realization of spec §3.4 "Mastery Makes the World" — a `world_holdings` Supabase table + Railway GET/POST `/holdings` routes + client `getHoldings`/`unlockHolding` + a `MasteryBuilding` that renders only when unlocked + hydration on academy load + the unlock fired from Mission 001 completion; mastery-gated, never points/currency, no locked placeholder); a test-plan checklist mirroring §5 (typecheck 7/7, world-engine tests, web build 21 routes, and whatever browser/E2E you were able to run — **including an explicit "verified" vs "pending (needs migration applied + real session token)" split**); an explicit note that the unlock hook was placed in `MissionExperience.tsx` (not `page.tsx`) because Task 13 extracted the mission logic there (Flag C / lesson 11); an explicit note that the RLS parent-read policy was corrected to use `auth_owns_household()` (Flag D); and carry forward the Task 7 N8AO status note the same way every prior PR did.
6. **Stop.** Do not merge the PR yourself. Do not start Task 15. The project owner will review, merge, apply/confirm the migration if you couldn't, and run their own post-merge verification. Report back (in your final message) that the PR is open, give them the URL, and clearly list what is verified vs pending, and stop.

**A note on applying the migration (Step 9):** applying `013_world_holdings.sql` writes a schema change to the **live production Supabase project** — a stateful, outward-facing action. It is idempotent (`create table if not exists`) and purely additive (new table, no impact on existing data/rows), so it is low-risk. But treat it as **confirm-before-execute**: if you have Supabase access (MCP `mcp__claude_ai_Supabase__apply_migration`/`list_tables`, or the CLI path the project uses), you MAY apply it after confirming the table doesn't already exist — then verify with `list_tables`. If you do **not** have access, **do not block the PR**: commit the migration file, and state clearly in the PR body + your final report that the migration must be applied (by the owner) before the feature is live and before the full E2E can pass. Either way, the migration file must be committed.

**Why this matters:** the project owner has explicitly asked for a tight, one-task-at-a-time loop with a real PR and a real merge at every step — not a big batch landing at once. Respect that even if it feels like you could "just keep going."

---

## 4. Task 14: Mastery-gated building — first real "build layer" unlock

*(Full, verbatim task text from `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md`, `### Task 14:`, lines ~2327–2765 as of this writing. If any discrepancy exists between this copy and the live file, the live file wins. **Apply the Flag A–F corrections from §2 as you execute — they are referenced inline below where they bite.** Read the live file's Task 14 section too — this copy is faithful but the live file is authoritative.)*

> **Files:** *(→ **Flag A**: incomplete — 9 files total, not 7; also see Flags B & C for the two the header names wrongly or omits.)*
> - Create: `packages/shared-types/src/world-holdings.schema.ts`
> - Modify: `packages/shared-types/src/index.ts`
> - Create: `supabase/migrations/013_world_holdings.sql`
> - Modify: `services/ai-workers/src/routes/student-session.route.ts`
> - Modify: `apps/web/src/lib/student-session.ts`
> - Create: `packages/world-engine/src/objects/MasteryBuilding.tsx`  *(→ **Flag B**: already exists as a stub — MODIFY, don't create; already mounted in GreatHall.tsx)*
> - Modify: `apps/web/src/app/(student)/academy/page.tsx`

This realizes "Mastery Makes the World" (spec §3.4) end-to-end for exactly one building, backed by a real Supabase table — not a mock. It follows the identical pattern already used by `/api/student/session/house` and `/api/student/session/companion`.

**Parallel-track split (informational):** the plan notes Steps 1–3 (backend: migration, shared-types schema, Railway routes) touch only `supabase/migrations/`, `packages/shared-types/src/`, and the route file — a separable "Track A". Steps 4–7 (frontend) depend on Task 11 (mounts `MasteryBuilding`) and Task 13 (restructured the academy/mission files). **Track A has NOT landed independently (verified — §2), so execute Steps 1–11 as one task, in order.**

- [ ] **Step 1: Write the Supabase migration** — `supabase/migrations/013_world_holdings.sql`. Table `world_holdings (id uuid pk default gen_random_uuid(), child_profile_id uuid not null references child_profiles(id) on delete cascade, holding_id text not null, unlocked_by_mission_id text not null, unlocked_at timestamptz not null default now(), unique (child_profile_id, holding_id))`. Enable RLS. Policy `world_holdings_service_role_all` for all `using/with check (auth.role() = 'service_role')`. Policy `world_holdings_parent_read` for select. *(→ **Flag D**: the plan's `world_holdings_parent_read` join uses `household_members.user_id`, which does NOT exist — use `public.auth_owns_household(household_id)` over `child_profiles` instead. Corrected policy is in §2 Flag D. The service-role policy is fine as-is.)* Run `mcp__claude_ai_Supabase__list_tables` to confirm `child_profiles`/`household_members` names before applying.

- [ ] **Step 2: Add the shared-types schema** — Create `packages/shared-types/src/world-holdings.schema.ts` with zod schemas: `HoldingSchema { holdingId, unlockedByMissionId, unlockedAt }` (all `z.string()`) + `Holding` type; `GetHoldingsResponseSchema { holdings: array(HoldingSchema) }` + type; `UnlockHoldingRequestSchema { holdingId, unlockedByMissionId }` + type; `UnlockHoldingResponseSchema { success: z.literal(true), holding: HoldingSchema }` + type. Add `export * from "./world-holdings.schema";` to `packages/shared-types/src/index.ts`. *(→ **Flag F**: place the export in the "no cross-schema imports" group.)* **(Full verbatim zod source is in the live plan file, Step 2 — copy it from there.)**

- [ ] **Step 3: Add the Railway routes** — Edit `services/ai-workers/src/routes/student-session.route.ts`. Merge `UnlockHoldingRequestSchema, type UnlockHoldingResponse, type GetHoldingsResponse` into the existing `@l3arn/shared-types` import. Append two routes (mirroring the `/house` handler exactly): `GET /holdings` (init service client → `requireChildSession` → `select holding_id, unlocked_by_mission_id, unlocked_at from world_holdings where child_profile_id = session.child_profile_id` → map to `GetHoldingsResponse`); `POST /holdings` (`validateBody(UnlockHoldingRequestSchema)` → init client → `requireChildSession` → `upsert({ child_profile_id, holding_id, unlocked_by_mission_id }, { onConflict: "child_profile_id,holding_id", ignoreDuplicates: true }).select(...).single()` → return `UnlockHoldingResponse`; idempotent via the unique constraint). **(Full verbatim handler source — including the exact error/log shapes — is in the live plan file, Step 3. Copy it; match the existing handlers' `log(...)`/`res.status(...).json(...)` conventions.)**

- [ ] **Step 4: Add the client functions** — Edit `apps/web/src/lib/student-session.ts`. Add an `authedGet<T>(path)` alongside the existing `authedPost` (same base/token/`parseError`/`NOT_CONFIGURED` pattern; GET with `Authorization: Bearer` header). Add `export function getHoldings(): Promise<ApiOutcome<GetHoldingsResponse>>` → `authedGet(...)`; and `export function unlockHolding(holdingId, unlockedByMissionId): Promise<ApiOutcome<UnlockHoldingResponse>>` → `authedPost(...)`. *(→ **Flag F**: put the `import type { GetHoldingsResponse, UnlockHoldingResponse } from "@l3arn/shared-types";` with the other top-of-file imports, not mid-file.)* **(Full verbatim source in the live plan file, Step 4.)**

- [ ] **Step 5: Build the `MasteryBuilding` component** — *(→ **Flag B**: `packages/world-engine/src/objects/MasteryBuilding.tsx` EXISTS as a null stub; REPLACE its body. It's already mounted in `GreatHall.tsx:78` at `[6,0,-8]` — no scene edit needed. Do Step 6 first so `s.unlockedHoldingIds` typechecks.)* Real body: `const unlockedHoldingIds = useWorldStore((s) => s.unlockedHoldingIds); if (!unlockedHoldingIds.includes(holdingId)) return null;` then render a `<group position={position}>` with a gold cylinder (`cylinderGeometry args={[1.2,1.4,2,8]}`, `meshStandardMaterial color="#c4a35a"`) + an indigo cone roof (`coneGeometry args={[1.5,1.2,8]}`, emissive `#6366f1`). Renders nothing until unlocked — the absence IS the "not yet mastered" state (no locked/greyed placeholder). **(Full verbatim JSX in the live plan file, Step 5.)**

- [ ] **Step 6: Add `unlockedHoldingIds` state to `worldStore`** — *(→ **Flag A**: this file is missing from the header.)* Edit `packages/world-engine/src/state/worldStore.ts`. Add to the interface: `unlockedHoldingIds: string[]; setUnlockedHoldingIds: (ids: string[]) => void; addUnlockedHoldingId: (id: string) => void;`. Add to the store impl: `unlockedHoldingIds: []`, `setUnlockedHoldingIds: (ids) => set({ unlockedHoldingIds: ids })`, `addUnlockedHoldingId: (id) => set((state) => state.unlockedHoldingIds.includes(id) ? state : { unlockedHoldingIds: [...state.unlockedHoldingIds, id] })`.

- [ ] **Step 7: Hydrate holdings on load and unlock on mission completion** —
  - Academy hydrate: edit `apps/web/src/app/(student)/academy/page.tsx`; merge `getHoldings` into the existing `../../../lib/student-session` import; inside the identity `useEffect`, after resolving `verified`, call `getHoldings().then((result) => { if (result.ok) useWorldStore.getState().setUnlockedHoldingIds(result.data.holdings.map((h) => h.holdingId)); })`. *(→ **Flag E**: insert BEFORE the early `return;` on the verified branch; `useWorldStore` is already imported — don't re-add.)*
  - Unlock on completion: *(→ **Flag C**: the plan says `mission/[missionId]/page.tsx` "after the existing `completeMission(...)`" — that call is now in `MissionExperience.tsx` (~line 525). Insert there.)* After `setPhase("done");`, add the `if (missionId === "mission-001") { const unlockResult = await unlockHolding("fractions-observatory", missionId); if (unlockResult.ok) useWorldStore.getState().addUnlockedHoldingId("fractions-observatory"); }` block (best-effort; must not block the done screen). Merge `unlockHolding` into `MissionExperience.tsx`'s existing `../../../../lib/student-session` import, and add `import { useWorldStore } from "@l3arn/world-engine";` (not currently imported there).

- [ ] **Step 8: Typecheck everything** — `pnpm -r typecheck` → expect all 7 packages Done, 0 errors.

- [ ] **Step 9: Apply the migration** — via the project's established path (Supabase MCP `apply_migration`, or CLI `supabase db push`). Confirm `world_holdings` created with `mcp__claude_ai_Supabase__list_tables`. *(→ §3 "A note on applying the migration": treat as confirm-before-execute; it's idempotent + additive; if you lack access, commit the file and flag for the owner — do not block the PR.)*

- [ ] **Step 10: Manual end-to-end verification** — run `pnpm --filter @l3arn/web dev` + the ai-workers dev server; open `/academy`; complete Mission 001; after completion, back in the Great Hall the cylinder-and-cone "Fractions Observatory" is visible at `[6,0,-8]`; reload — still there (persisted). Stop both dev servers. *(→ See §5 for the realistic version of this check — the no-token dev-fallback path cannot complete a mission, so the fully-real E2E needs the migration live + a real session token; the render wiring is provable by seeding the store. Windows dev-server-orphan cleanup applies.)*

- [ ] **Step 11: Commit**
```bash
git add packages/shared-types/src/world-holdings.schema.ts packages/shared-types/src/index.ts \
  supabase/migrations/013_world_holdings.sql \
  services/ai-workers/src/routes/student-session.route.ts \
  apps/web/src/lib/student-session.ts \
  packages/world-engine/src/objects/MasteryBuilding.tsx \
  packages/world-engine/src/state/worldStore.ts \
  apps/web/src/app/\(student\)/academy/page.tsx \
  apps/web/src/app/\(student\)/mission/
git commit -m "feat: mastery-gated building unlock (Mastery Makes the World, first holding)"
```
*(The `git add` list already includes `worldStore.ts` and the whole `mission/` dir — so despite the header's Flag-A omission, the commit captures all 9 files. Verify `git status` shows exactly your 9 edited/created files staged before committing.)*

---

*(Handoff-writer's notes — verified live while writing this handoff, but re-verify at execution time.)*

**(1) The browser-check URL is `/academy`** (the `(student)` route group is stripped). The dev server prints its port to stdout (3000–3002+ have all been used); read the actual port.
**(2) Do NOT "fix" the `/student/...` paths** (lesson 10) — the mission page's route-fallback keeps `router.push("/student/academy")` intentionally; leave it.
**(3) No new npm dependencies.** Everything (`zod`, `next/dynamic`, `useWorldStore`, the Supabase client, the Express middleware) is already present.
**(4) `MissionExperience.tsx` is ~1043 lines** — Task 14 touches only its imports and the ~4 lines inside `handleComplete` after `setPhase("done")`. Do not refactor the gameplay.

---

## 5. After Step 8/9 — before you open the PR

Run the full workspace typecheck (this is where a wrong import path or a missing store field surfaces):
```bash
pnpm -r typecheck   # expect: all 7 packages Done, 0 errors
```

Run the `world-engine` test suite. **Task 14 DOES touch `packages/world-engine`** (worldStore + MasteryBuilding), so this is a real regression gate now, not a formality:
```bash
cd packages/world-engine && pnpm test   # expect: 16/16 (or more if you add tests) — 0 failures
```
Consider adding a small test for `addUnlockedHoldingId` idempotency (the store already has `missionMode.test.ts`/`movement.test.ts` as patterns) — optional but cheap and on-pattern.

Run the web build to confirm it builds AND lints (catches a leftover unused import from Flag E/F, or a mid-file import):
```bash
pnpm --filter @l3arn/web build   # expect: exit 0, full 21-route table, /academy ~372 kB
```
If it fails with a Supabase client error during prerender, see §0 lesson 8 (`.env.local`) — this worktree should already have it.

**The browser check — be honest about the two layers:**
- **Render wiring (fully verifiable by you, no backend needed).** Start `pnpm --filter @l3arn/web dev` **backgrounded**; navigate headless Playwright to `http://localhost:<port>/academy`; wait ~3s. The Great Hall renders (the ~150px canvas strip is expected — lesson 10). The Fractions Observatory should be **absent** (nothing unlocked). Then, in the page context, seed the store and confirm the building appears:
  ```js
  // via mcp__plugin_playwright_playwright__browser_evaluate
  () => { window.__l3arn_seed?.(); }         // if no such hook, use the store directly:
  // The store is the world-engine zustand store; if it's reachable on window in dev, call
  // useWorldStore.getState().setUnlockedHoldingIds(['fractions-observatory']).
  ```
  If the store isn't exposed on `window`, the objective fallback is: confirm `MasteryBuilding` returns `null` when `unlockedHoldingIds` is empty and renders the mesh when it includes `'fractions-observatory'` — via the world-engine unit test (add a render/logic test) rather than the browser. Either way, prove: **empty store → no building; `['fractions-observatory']` → cylinder+cone at [6,0,-8]**. Capture before/after screenshots. Confirm **0 console errors** (N8AO warnings expected).
- **Full persist-across-reload E2E (Step 10) — requires the backend.** Completing Mission 001 for real needs (a) the `013` migration applied to the live Supabase project and (b) a real child **session token** (the dev-fallback path has no token, so `completeMission` — and thus the unlock — never fires; you'll get the "DEV: no session token" card). If you can drive a real session (parent-launched link / seeded token) **and** the migration is applied, run the whole flow and confirm the building persists after reload. If you cannot, **state so explicitly** in the PR body and your final report — verified: code + typecheck + build + world-engine + render-wiring; pending: live-backend E2E (needs migration applied + session token). Do not claim the E2E passed if you didn't observe it.
- **Stop the dev server — and verify it's actually stopped.** This project's `next dev` on Windows repeatedly leaves an orphaned `node.exe` (`next-server`) holding the port after the wrapping task is torn down. Check `Get-NetTCPConnection -LocalPort <port> -State Listen` (PowerShell), `Stop-Process -Id <pid> -Force`, then re-check the port shows no listener before moving on.

Then follow §3 steps 3–6: commit, push, open the PR (with the verified-vs-pending split), stop.

---

## 6. What happens next (for whoever picks this up after the PR merges)

Once the project owner merges this PR, applies/confirms the `013` migration, and confirms post-merge verification (`pnpm -r typecheck`, the world-engine suite, `pnpm --filter @l3arn/web build`, and — with a real session — a live render check on `https://l3arnupdated.vercel.app/academy` showing the Observatory persisting after mastery; re-verify the production URL via the repo `homepageUrl` + Vercel commit `target_url`, don't assume), **the next step is Task 15** — read `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` (search `### Task 15: Accessibility baseline — keyboard operability, captions confirmation, manual quality slider`) for its exact scope. Task 15 is the sixth and (per the plan) likely final task of the Phase 1 slice before Phase 1 wrap; confirm against the plan's Execution Strategy whether Tasks 16–17 remain.

Whoever does that — write a new handoff at `docs/superpowers/plans/handoffs/<date>-handoff-task-15.md`, following the exact structure of this document:
- §0: the "verify, don't trust" reminder (keep it — eleven lessons deep now; add a twelfth if Task 14 surfaced its own during execution, e.g. anything about applying a Supabase migration from an agent context, the store-seeding browser check for a gated render, or the no-token E2E boundary that this plan text couldn't have anticipated).
- §1: project context (copy nearly verbatim; update the "which task / which phase" framing).
- §2: exact current state — **freshly verified, not copied**: confirm Task 14's squash commit is the `origin/main` tip and its merge status is green; **re-confirm the `world_holdings` table actually exists in the live Supabase project** (`mcp__claude_ai_Supabase__list_tables`) — Task 14 is not truly "done" until the migration is live; create `feature/3d-academy-task-15` from the current tip; set up `.worktrees/task-15`; run the full verification sequence (background the slow git/pnpm steps — §0 lesson 9). Re-check N8AO status, re-confirm production serves the merged Task 14 (grep the deployed `/academy` chunk for MasteryBuilding/holdings identifiers if they survive minification, else the `getHoldings`/`world_holdings` string). **And — as this handoff did for Task 14 — read every file Task 15 modifies in its CURRENT state and flag any plan-vs-code drift (stale Files headers, wrong relative-import depths, changed export shapes, edit sites moved by earlier tasks, broken SQL/RLS column names, multi-site edits the plan mentions once). Don't assume any task's Files header or snippet is trustworthy.**
- §3: the gate protocol (copy verbatim; update the branch-already-pushed-or-not note and the migration-application note to match reality).
- §4: Task 15's full verbatim text, pulled fresh from the plan doc.
- §5: task-specific post-implementation verification (accessibility tasks want a keyboard-operability + captions + quality-slider check; reuse the headless-Playwright, objective-first approach + the Windows-orphan cleanup).
- §6: this same "what happens next" section, updated to point past Task 15.

This pattern (verify fresh state → fresh branch → full task text → pre-verify snippets against real code/tools/URLs/paths/SQL → implement → verify (incl. browser + backend where applicable) → PR → stop) repeats for every remaining task. Do not skip the "freshly verify, don't copy" step in §2 — trusting stale local state instead of re-checking `origin/main` (and, for Task 14, the live Supabase table) is exactly the mistake §0 warns about.
