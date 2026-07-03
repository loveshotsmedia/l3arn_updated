# Handoff: L3ARN 3D Academy — Task 12 (Explore→Mission "settle" transition)

**You are a fresh Claude Code agent with no memory of prior conversations. This document is self-contained — everything you need is here or linked from here. Read this whole document before touching any code.**

---

## 0. Read this first: the one rule that matters most

**Verify, don't trust.** This has already paid off eight times on this project:

1. A prior session built hours of work on a stale, locally-cached copy of `main` that didn't match GitHub (the repo had been restructured and the local checkout never picked it up). The fix required a careful git rebase and byte-for-byte content verification to recover.
2. Task 6's plan snippet used raw numeric `ACTION` values copied from `camera-controls` v2, which are **wrong** in the installed v3 (the bit-flags shifted). The executing agent caught it only because it checked the installed package's `.d.ts` before trusting the snippet.
3. Task 7's plan snippet was correct, but manual browser verification surfaced a real runtime problem the plan text couldn't have anticipated: `<N8AO>` triggers a per-frame WebGL warning, traced to a documented upstream architectural bug in `pmndrs/postprocessing` (not fixable by any prop change). It was disclosed in the PR rather than silently shipped or silently patched around. **Still unresolved** — see §2 below.
4. Task 9's plan snippet made two toolchain assumptions that didn't hold against the installed `main`: it imported `@gltf-transform/core` (only `@gltf-transform/cli` was a direct root devDependency) and ran `vitest` from repo root (only `packages/world-engine` had it). Both were caught by actually running the import/command before trusting the snippet.
5. Task 9's CI workflow snippet hard-coded `node-version: 20`, which passed every local check but failed the first real GitHub Actions run in ~13 seconds (`pnpm@11.7.0` requires Node ≥ 22.13). Only observing the real CI run caught it — it was not reproducible locally.
6. Task 10's plan snippet assumed `<Environment files="/env/great-hall-dawn.hdr" />` would just resolve once the file existed under `packages/world-engine/public/env/`. It 404'd. Root cause: `apps/web` has never had a `public/` directory, and Next.js only serves static files from the *app's own* `public/` folder — never from a workspace package's `public/` folder. Fixed with `scripts/sync-world-engine-public.mjs` (copies `packages/world-engine/public/*` → `apps/web/public/*`, chained into the `dev`/`build` npm scripts). **This fix is merged and present on `main` — you don't need to redo it.**
7. Verifying "the deployed site" is not as simple as finding *a* URL that returns 200. `docs/AI_PRODUCTION_SETUP.md` references `https://l3arn.vercel.app` as the prod origin — that domain returns HTTP 200, but for a completely unrelated Locofy-generated static site. The real production URL, confirmed by cross-referencing the GitHub repo's own `homepage` field against Vercel's commit-status `target_url`, is **`https://l3arnupdated.vercel.app`**. A 200 status code alone proves nothing if you haven't confirmed the response is actually the thing you expected — check content-type / matched-path / byte count, not just the status line.
8. **New, from Task 11's own execution:** a fresh worktree (`.worktrees/task-11`) was missing `apps/web/.env.local`. This file is gitignored/untracked, and `git worktree add` only checks out *tracked* files — it does not inherit untracked files from the worktree it was branched from or from the main checkout. `pnpm --filter @l3arn/web build` failed during static prerendering with `@supabase/ssr: Your project's URL and API key are required to create a Supabase client!` until `.env.local` was manually copied in (confirmed byte-identical across every sibling worktree that has one — `main`, `task-10`, `task-4`, `task-7` — so this is shared, non-secret-inventing local dev config, safe to copy). **If your fresh `task-12` worktree's web build fails with that exact Supabase error, this is why** — copy `apps/web/.env.local` from the main checkout (`E:\L3ARN\L3arn_repo\apps\web\.env.local`) or any sibling worktree that has one before troubleshooting further. This handoff's own worktree already has it — see §2.

**A ninth, operational (not plan-correctness) lesson, also from writing this handoff:** on this machine, `git worktree add` and any full-tree git operation (`git reset --hard`, etc.) can be extremely slow — one `pnpm install` on a fresh worktree took over an hour of wall-clock time during this handoff's own verification, and a `git worktree add` needed multiple minutes just to check out ~211 files. **Run these as background tasks, not foreground**, or they will hit a 2-minute foreground timeout mid-checkout and leave a corrupted partial working tree (files staged as "deleted" that are actually just not-yet-checked-out). If you hit `fatal: Unable to create '.../index.lock': File exists` after a killed command, check `ps aux | grep git` for a process whose command line actually references your worktree's path before removing the lock — on this machine there are usually many *unrelated* concurrent git processes from other projects/sessions, and none of them will reference an L3ARN path. If none reference your path, the lock is stale and safe to remove.

**Before you write a single line of code**, run:
```bash
cd "E:\L3ARN\L3arn_repo\.worktrees\task-12"
git fetch origin main
git log HEAD..origin/main --oneline
```
If that second command prints anything, **stop and investigate before proceeding** — your branch is behind `main`. This was confirmed empty when this handoff was written, but check anyway. Do not assume; verify.

When a plan snippet hard-codes values or API shapes from a third-party library, verify them against the installed `node_modules/<pkg>/.../*.d.ts`. When a plan snippet is *type-correct* but describes runtime behavior of a rendering/effects library or a browser, verify it by actually running it and reading the console/network tab. When a plan snippet targets an environment you are not currently in — a CI runner, an external URL, a dev server, a browser — verify it **in that environment**, because local success does not transfer.

---

## 1. What L3ARN is and what this work is

L3ARN is a parent-led + student-driven learning platform. Students explore a browser-based 3D "Academy" world, guided by an AI companion, undertaking learning missions. The current 3D world (`packages/world-engine`) is being incrementally upgraded from a primitive, untextured placeholder toward a "premium-stylized" world — the long-term vision is documented in:

- **Spec:** `docs/superpowers/specs/2026-06-30-3d-academy-world-design.md` — the full design vision, research-grounded, covering rendering, art pipeline, performance, architecture, and educational design.
- **Plan:** `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` — the actionable, task-by-task implementation plan for Phase 0 (Foundation) and Phase 1 (a vertical-slice "Living Great Hall" room). **This is your primary reference document — read it in full before starting**, especially the "Execution Strategy" section near the top (dependency graph, gate protocol — it already flags a real inconsistency in Task 12's own text, see §2 below) and Task 12's full text (also reproduced in §4 below; the live file is authoritative if the two ever disagree).

**Task 12 is the third task of Phase 1 (The Living Great Hall vertical slice)** — Phase 0 (Tasks 0–9), Task 10 (Real IBL), and Task 11 (PBR material pass) are complete and merged. Task 12 adds the camera "settle" motion and post-processing quiet that fires when the student commits to a mission — the visible "two modes" moment (spec §4, §8.5) that Task 7's `PostProfiles` and Task 11's `enterMissionMode()` call already wired the reactive half of. This task adds the imperative camera half.

---

## 2. Exact current state — start here

**Tasks 0, 3, 4, 5, 6, 7, 8, 9 are all merged into `main`** (Tasks 1–2 were no-ops absorbed into Task 0).

**Task 10** (Real IBL) merged via PR #14, squash commit `e4455ed`.

**Task 11** (PBR material pass on the Great Hall) is **merged via PR #15 (squash commit `b54eaf4`)** — it is the current tip of `origin/main`. Freshly verified for this handoff (not copied from Task 11's own handoff):
- `gh pr view 15` → `state: MERGED`, merge commit `b54eaf4e38219950ada0363070c3141078d7fc73`, merged `2026-07-03T02:09:09Z`.
- `git log origin/main --oneline -5` → `b54eaf4 3D Academy Task 11: Rebuild Great Hall — materials, proportions, warmth (#15)` at the tip, followed by Task 10's `e4455ed`.
- Combined commit status on `b54eaf4`: **`success`** (`Vercel`: "Deployment has completed", `L3arn Updated - l3arn_updated` (Railway): "Success").
- **Post-merge verification**, done in the `rebase-attempt-phase0-1` worktree (fast-forwarded `e4455ed..b54eaf4`): `pnpm install` clean, all three dist builds succeeded, `pnpm -r typecheck` 7/7 packages `Done` / 0 errors, `packages/world-engine` suite **16/16**, `pnpm --filter @l3arn/web build` exit 0 with the full 21-route table.
- **Confirmed on the real deployed production site**: `https://l3arnupdated.vercel.app/academy` → 200, `X-Matched-Path: /academy`, `Content-Type: text/html; charset=utf-8`. A live headless-Playwright check against that URL showed 0 console errors (198 warnings, all the known N8AO pattern below) and — critically — a screenshot visually compared directly against Task 10's own baseline screenshot of the identical camera angle: walls visibly shifted from cool blue-gray to warm violet, floor from cool gray to warm tan. This confirms Task 11's material change is genuinely live in production, not just merged in source.

**Known open issue carried forward from Task 7 (still unresolved, NOT in Task 12's scope):** `<N8AO>` inside `packages/world-engine/src/render/PostProfiles.tsx`'s `EffectComposer` still emits a per-frame WebGL console warning (`GL_INVALID_OPERATION: glBlitFramebuffer: Read and write depth stencil attachments cannot be the same image`). Re-confirmed still present and untouched for this handoff: `git log --oneline -- packages/world-engine/src/render/PostProfiles.tsx` shows the file's last change is still Task 7's merge commit `8a0af30` — neither Task 10 nor Task 11 touched it. This is a documented upstream `pmndrs/postprocessing` architectural bug (fix only in the not-yet-stable v7 rewrite), a console **warning** not an error, no visual defect. Task 12 does not touch `PostProfiles.tsx` either — it only triggers the `worldMode` transition that `PostProfiles` already reacts to reactively (wired in Task 7), so no new interaction with this bug is expected. Carry it forward in your PR body as prior task PRs (8, 9, 10, 11) have.

**Track A (Task 14's backend slice) status — checked fresh, has NOT landed out-of-band:** the plan's Execution Strategy section (`docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md`, "Parallel tracks") allows Task 14's backend slice (the `world_holdings` Supabase migration, `packages/shared-types/src/world-holdings.schema.ts`, and two new Express routes in `services/ai-workers/src/routes/student-session.route.ts`) to be built on an independent parallel track starting right after Task 0. Confirmed via direct search of the current `main` tip: no `world_holdings`-named file exists under `supabase/migrations/`, no `holding`-named file exists under `packages/shared-types/src/`, and no route file under `services/ai-workers/src/routes/` references "holding". **Track A has not landed.** This doesn't block Task 12 (it doesn't touch any Track A path), but flag it again when you write Task 13's handoff, since Task 13 is closer to where Track A's frontend-facing pieces (Task 14 Steps 4–7) would eventually need to land.

**IMPORTANT — a real plan-internal inconsistency, already flagged by the plan document itself, re-confirmed against current code while writing this handoff:** Task 12's own "Files" header (§4 below) lists `packages/world-engine/src/WorldCanvas.tsx` as a file to modify, but its actual numbered Steps (1–3) only edit `packages/world-engine/src/state/worldStore.ts`, `packages/world-engine/src/objects/SortingComputer.tsx`, and `packages/world-engine/src/render/CameraRig.tsx` — no step touches `WorldCanvas.tsx`. The plan's own "Execution Strategy → Corrected dependency graph" section (line ~105) already caught this during an adversarial pass and states explicitly: *"Task 12's own Files header also lists this file, but its visible steps only edit `CameraRig.tsx`/`worldStore.ts`/`SortingComputer.tsx` — flagging this as a minor plan-internal inconsistency... treat Task 12 as *not* requiring a `WorldCanvas.tsx` edit unless you find otherwise while executing it."* Confirmed independently for this handoff: `WorldCanvas.tsx` currently renders `<CameraRig />` with **no props** (`packages/world-engine/src/WorldCanvas.tsx:128`), and has zero references to `settleTarget`/`requestSettle`/anything Task 12 introduces. Since `CameraRig` reads the store directly via `useWorldStore.subscribe(...)` (not via props), there's no prop-plumbing need through `WorldCanvas.tsx` either. **Do not edit `WorldCanvas.tsx` for this task.**

**Snippet-vs-installed-toolchain verification, done fresh for this handoff (not assumed from the plan text):**
- `packages/world-engine/src/state/worldStore.ts`'s current content (read in full) has no `settleTarget`/`requestSettle`/`clearSettle` — confirms Task 12 has not run yet and Step 1's additions are new, non-conflicting fields.
- `packages/world-engine/src/objects/SortingComputer.tsx`'s current `handleClick` (post-Task-11) is exactly:
  ```tsx
  function handleClick(e: { stopPropagation: () => void }) {
    e.stopPropagation();
    useWorldStore.getState().enterMissionMode();
    onEvent({ type: 'object-interact', objectId: 'sorting-computer', roomId: 'great-hall' });
  }
  ```
  This matches Task 12 Step 2's assumption exactly ("in `handleClick`, after `enterMissionMode()`") — insert `useWorldStore.getState().requestSettle(position);` as a new line between the `enterMissionMode()` call and the `onEvent(...)` call. `position` is already the destructured prop in scope (`SortingComputerProps.position`), confirmed no new value/prop needed.
- `packages/world-engine/src/render/CameraRig.tsx`'s current content (read in full) has exactly one `useEffect` for controls setup (ending at the file's line 50) and one separate `useEffect` for the animation-frame loop (lines 52–61) — `controlsRef` is already in scope as the plan assumes. Task 12's Step 3 snippet should be added as a **new, third** `useEffect`, not merged into either existing one (the plan's "after the main setup `useEffect`" instruction is satisfied by placing it anywhere after line 50; placing it between the two existing effects or after both both work equivalently since none share dependencies).
- **`camera-controls@3.1.2`'s installed `.d.ts`** (`node_modules/.pnpm/camera-controls@3.1.2_three@0.171.0/node_modules/camera-controls/dist/index.d.ts:765`) confirms `setLookAt`'s signature exactly: `setLookAt(positionX, positionY, positionZ, targetX, targetY, targetZ, enableTransition?: boolean): Promise<void>`. Task 12's Step 3 snippet calls it with exactly these 7 positional arguments in this order — verified correct, no drift (this is the same class of risk Task 6's handoff lesson #2 warns about — checked directly against the `.d.ts`, not assumed from memory of an earlier `camera-controls` major).
- **`zustand@5.0.14`'s installed `.d.ts`** (`node_modules/.pnpm/zustand@5.0.14_.../node_modules/zustand/vanilla.d.ts`) confirms `subscribe`'s signature: `subscribe: (listener: (state: T, prevState: T) => void) => () => void`. Task 12's Step 3 snippet calls `useWorldStore.subscribe((state) => {...})` (using only the first parameter, which TypeScript permits) and assigns the return value directly as the cleanup function (`const unsubscribe = ...; return unsubscribe;`) — both match the real installed signature exactly, no drift. Note this store is a plain `create<WorldState>(...)` with no `subscribeWithSelector` middleware, so the full-state (not per-selector) subscribe signature is the correct one to expect.
- No existing `prefers-reduced-motion`/`matchMedia` usage anywhere in `packages/world-engine/src` or `apps/web/src` — confirmed via grep. Task 12 is the first task to introduce reduced-motion handling; there's no existing pattern to reconcile against.

### Your branch and worktree

A branch has already been created for you: **`feature/3d-academy-task-12`**, pushed to `origin`... actually **not yet pushed** — it exists locally, branched fresh from the current tip of `origin/main` (`b54eaf4`, which includes Tasks 0, 3–9, 10, and 11). Push it yourself as part of §3's gate protocol once you commit. Once you commit, its only content beyond `main` will be this handoff document — you're starting from a clean, verified baseline.

A worktree already exists checked out to this branch at:
```
E:\L3ARN\L3arn_repo\.worktrees\task-12
```

**Use this exact worktree. Do not create a new one.** Other worktrees exist in this repo — leave them all alone, they are unrelated to your task:
- `E:\L3ARN\L3arn_repo\.worktrees\task-4` through `...\task-11` — merged task branches; historical, not needed for Task 12.
- `E:\L3ARN\L3arn_repo\.worktrees\rebase-attempt-phase0-1` — sits on `main` (reused repeatedly for post-merge verification); not needed for Task 12.
- `E:\L3ARN\L3arn_repo\.worktrees\track-a-holdings-backend` — unrelated, separate work (this may be where Track A eventually lands — do not touch it).

Also do not work in `E:\L3ARN\L3arn_repo` directly, nor in `E:\L3ARN` — those are different checkouts on a different, unrelated branch (`docs/3d-academy-world-spec`).

**This worktree's `apps/web/.env.local` is already present** (copied in while writing this handoff, byte-identical to the main checkout's copy — see §0 lesson 8). You do not need to redo this.

### Verify your starting point before doing anything else

This exact sequence was run in this worktree while writing this handoff and confirmed clean (run as **background tasks**, not foreground — see §0's ninth lesson about this machine's slow git/pnpm operations):

```bash
cd "E:\L3ARN\L3arn_repo\.worktrees\task-12"
git status --short                  # clean, 0 files
git log --oneline -1                # b54eaf4 "3D Academy Task 11 ... (#15)"
git branch --show-current           # feature/3d-academy-task-12
git fetch origin main
git log HEAD..origin/main --oneline # MUST be empty — confirmed empty
pnpm install                        # fresh worktree — took over an hour of background wall-clock time on this run; run in background, NOT a hang
pnpm --filter @l3arn/shared-types build
pnpm --filter @l3arn/safety build
pnpm --filter @l3arn/mission-compiler build
pnpm -r typecheck                   # confirmed: all 7 packages Done, 0 errors
cd packages/world-engine && pnpm test   # confirmed: 16/16 passing (5 files)
```

All of the above passed clean when this handoff was written. If `pnpm -r typecheck` does not pass cleanly for you at this starting point, **stop and report back rather than building on top of a broken baseline** — something changed and needs investigating.

---

## 3. The gate protocol (non-negotiable — this is how the project owner wants to work)

1. **Implement Task 12 completely** (see §4).
2. **Verify**: run the exact commands the task and §5 specify, and confirm they pass. Don't just claim they pass — show the actual output. This includes the manual browser check (§5) — Task 12, like Task 10 and Task 11, has a live-render verification step, and this one specifically needs a reduced-motion check.
3. **Commit** using the message the task specifies (§4 Step 6).
4. **Push** your branch: `git push origin feature/3d-academy-task-12` (note: unlike Task 11's handoff, this branch has **not** been pre-pushed — push it yourself, it only exists locally so far).
5. **Open a PR** against `main`:
   ```bash
   gh pr create --title "3D Academy Task 12: Explore->Mission settle transition" --base main --head feature/3d-academy-task-12 --body "..."
   ```
   Write a real PR body: what this adds, why (the reactive half — `PostProfiles` swapping post-processing profiles on `worldMode` — has existed since Task 7 and Task 11 wired `enterMissionMode()` into the Sorting Computer's click; this task adds the imperative camera motion that makes the transition feel like a deliberate "settle" rather than a jump-cut, and makes it respect `prefers-reduced-motion` per spec §8.5), a test-plan checklist mirroring what you verified in step 2 (including the browser check with reduced-motion on and off), and explicit confirmation that `WorldCanvas.tsx` was correctly left untouched (per §2's plan-internal-inconsistency note) so it doesn't read as an accidental scope miss. Carry forward the Task 7 N8AO status note, the same way Tasks 8, 9, 10, and 11's PRs did.
6. **Stop.** Do not merge the PR yourself. Do not start Task 13. Do not do anything else. The project owner will review, merge, and run their own post-merge verification. Report back to them (in your final message) that the PR is open, give them the URL, and stop.

**Why this matters:** the project owner has explicitly asked for a tight, one-task-at-a-time loop with a real PR and a real merge at every step — not a big batch of work landing all at once. Respect that even if it feels like you could "just keep going." Stopping here is the correct, complete outcome for this session, not a failure to finish.

---

## 4. Task 12: Explore→Mission "settle" transition

*(This is the full, verbatim task text from `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` (`### Task 12:`, lines ~2069–2150 as of this writing). If you find any discrepancy between this copy and the live file, the live file wins — but there shouldn't be one.)*

> **Files:**
> - Modify: `packages/world-engine/src/render/CameraRig.tsx`
> - Modify: `packages/world-engine/src/WorldCanvas.tsx`
>
> *(See §2's plan-internal-inconsistency note above — do not edit `WorldCanvas.tsx`; the plan's own dependency-graph section already flags this Files header as stale against the actual Steps below.)*

The "settle" is a ~800ms camera move toward the interacted object plus the `PostProfiles` mode swap that already happens automatically (Task 7 reads `worldMode` reactively). This task adds the camera motion and makes it respect `prefers-reduced-motion` (spec §8.5) — folded in here rather than as a separate task since it's one code path.

- [ ] **Step 1: Extend CameraRig with an imperative "settle on target" method, exposed via the store**

Edit `packages/world-engine/src/state/worldStore.ts` — add a settle-target field the CameraRig will watch:

```typescript
settleTarget: [number, number, number] | null;
requestSettle: (target: [number, number, number]) => void;
clearSettle: () => void;
```

```typescript
settleTarget: null,
requestSettle: (target) => set({ settleTarget: target }),
clearSettle: () => set({ settleTarget: null }),
```

- [ ] **Step 2: Have SortingComputer request a settle toward itself on click**

Edit `packages/world-engine/src/objects/SortingComputer.tsx` — in `handleClick`, after `enterMissionMode()`:

```tsx
useWorldStore.getState().requestSettle(position);
```

(`position` is already the prop the component receives — no new value needed.)

- [ ] **Step 3: Have CameraRig react to settleTarget**

Edit `packages/world-engine/src/render/CameraRig.tsx` — subscribe to the store and animate `setLookAt` when a settle is requested:

```tsx
import { useWorldStore } from '../state/worldStore';
```

Add inside the component, after the main setup `useEffect`:

```tsx
useEffect(() => {
  const unsubscribe = useWorldStore.subscribe((state) => {
    const target = state.settleTarget;
    if (!target || !controlsRef.current) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const [tx, ty, tz] = target;
    controlsRef.current.setLookAt(
      tx + 4, ty + 3, tz + 6, // slightly pulled back and above the interactable
      tx, ty, tz,
      !prefersReducedMotion, // enableTransition — instant cut if the user asked for reduced motion
    );
    useWorldStore.getState().clearSettle();
  });
  return unsubscribe;
}, []);
```

- [ ] **Step 4: Typecheck**

Run: `cd packages/world-engine && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Manual verification — the core "two-modes" moment**

Run: `pnpm --filter @l3arn/web dev`, open `/student/academy`.
Expected: clicking the Sorting Computer now (a) smoothly moves the camera toward it over ~800ms, and (b) the bloom/AO post effect disappears (Task 7's `PostProfiles` reacting to `worldMode: 'mission'`) — the scene visibly "calms." Test with OS-level reduced-motion enabled (Windows: Settings → Accessibility → Visual effects → Animation effects off) and confirm the camera cut is instant rather than animated. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add packages/world-engine/src/render/CameraRig.tsx packages/world-engine/src/objects/SortingComputer.tsx packages/world-engine/src/state/worldStore.ts
git commit -m "feat(world-engine): Explore->Mission settle transition (reduced-motion aware)"
```

---

*(Handoff-writer's notes, not part of the verbatim task text. All were verified live while writing this handoff — but re-verify at execution time, since time has passed and code can drift.)*

**(1) The route is `/academy`, NOT `/student/academy`.** Same drift Task 10's and Task 11's handoffs both flagged independently — Step 5 above says open `/student/academy`, but the academy page lives at `apps/web/src/app/(student)/academy/page.tsx` — `(student)` is a Next.js **route group**, stripped from the URL. The dev URL is `http://localhost:3000/academy` (or whatever port `next dev` actually picks — check its stdout; ports 3000–3002+ have been occupied by stray processes throughout this project's history, see note (4) below).

**(2) Do not edit `WorldCanvas.tsx`.** Covered in full in §2 above — this is the one deviation from the plan's literal "Files" header, but it is *not* a deviation from the plan's actual Steps, and the plan document itself already flags the header as stale. Disclose this in the PR body as a confirmation, not as a surprise.

**(3) Exact placement of the new `useEffect` in `CameraRig.tsx`.** The file currently has two `useEffect` hooks: the controls-setup one (creates `CameraControlsImpl`, sets constraints, returns a disposal cleanup) and the animation-frame-loop one (`requestAnimationFrame` loop calling `controlsRef.current?.update(...)`). Add Task 12's new settle-subscription `useEffect` as a third, independent hook — it doesn't need to run inside either existing effect, and doesn't share any cleanup concerns with them. Order relative to the other two doesn't matter functionally (all three have independent dependency arrays: `[camera, gl, invalidate]`, `[]`, and `[]` respectively).

**(4) How to do the Step 5 / §5 browser check (headless, objective-first) — reuse Task 10/11's approach, plus a reduced-motion variant new to this task.** Start `pnpm --filter @l3arn/web dev` backgrounded (it does not exit on its own — don't block on it; check its stdout for the actual port). Navigate headless Playwright to `http://localhost:<port>/academy`. For the **reduced-motion-off** case: click the Sorting Computer, wait ~1s, and confirm (a) 0 new console errors (the pre-existing favicon 404 and N8AO warning are expected, not regressions), (b) the camera visibly moved closer to the Sorting Computer in a follow-up screenshot compared to the pre-click screenshot. For the **reduced-motion-on** case: Playwright's `browser_run_code_unsafe` tool gives you direct `page` access, so prefer `await page.emulateMedia({ reducedMotion: 'reduce' })` before clicking, over trying to toggle real OS-level Windows accessibility settings inside a headless/CI-like environment — it's more reliable and exactly matches what `window.matchMedia('(prefers-reduced-motion: reduce)').matches` checks in the Step 3 snippet. Confirm the camera cut is instant (no animated transition) — since `setLookAt`'s `enableTransition` argument is what the snippet gates on `!prefersReducedMotion`, an instant cut is the objective proof this path works, not a subjective "does it look smoother" judgment. Capture screenshots for the PR (both variants). **Stop the dev server when done — and verify it's actually stopped**, not just that the stop command reported success. This project's `next dev` on Windows has repeatedly left an orphaned `node.exe` (`next-server`) process holding the port even after the wrapping shell task is torn down (confirmed again during Task 11's own execution: PID 61044 was still listening on port 3002 after a successful-looking stop). Check `Get-NetTCPConnection -LocalPort <port> -State Listen` (PowerShell) to find the real PID, `Stop-Process -Id <pid> -Force` it, then re-curl the port to confirm `000`/connection-refused before moving on.

**(5) No new dependencies needed.** `useWorldStore`, `SortingComputer`, `CameraRig`, `camera-controls`, `zustand` are all already in place and unchanged in shape (see §2's snippet-vs-toolchain verification above — this task's snippets were checked directly against the installed `.d.ts` files and found accurate, unlike Task 6 where a similar-looking snippet turned out to be wrong).

---

## 5. After Step 6 — before you open the PR

Run the full workspace typecheck to make sure the edits didn't break types:

```bash
pnpm -r typecheck
```
Expected: all 7 packages `Done`, 0 errors.

Run the `world-engine` test suite to confirm no regression (no test file under `packages/world-engine/src/**/*.test.ts` references `CameraRig`, `SortingComputer`, or `worldStore`'s settle fields directly as of this writing — confirm this is still true when you run it; if it's changed, that's new test coverage, not drift to worry about):

```bash
cd packages/world-engine && pnpm test
```
Expected: still **16/16** (or more, if new tests were added — just confirm 0 failures).

Run the web build to confirm the app still builds with the changed store/camera code:

```bash
pnpm --filter @l3arn/web build
```
Expected: exit 0, full 21-route table (same shape as §2's baseline). **If this fails with a Supabase client error, see §0 lesson 8 — you're likely missing `apps/web/.env.local`** (though this worktree should already have it, per §2).

Do the **browser check** described in §4 note (4) — this is the real point of Task 12 and the one thing typecheck/tests can't prove:
- dev server up, `http://localhost:<port>/academy` loads,
- click the Sorting Computer with reduced-motion off — camera visibly settles toward it, bloom/AO calms, 0 new console errors, screenshot captured,
- reload, emulate `prefers-reduced-motion: reduce`, click again — camera cut is instant (no animated transition), screenshot captured,
- dev server stopped **and confirmed actually stopped** (see note (4)'s Windows-orphan-process caveat).

Then follow §3, steps 3–6: commit, push, open the PR, stop.

---

## 6. What happens next (for whoever picks this up after the PR merges)

Once the project owner merges this PR and confirms post-merge verification (`pnpm -r typecheck`, the world-engine test suite, `pnpm --filter @l3arn/web build`, and a real render/asset check on `https://l3arnupdated.vercel.app` — re-verify this is still the correct production URL, don't assume) is good, **the next step is Task 13** — read `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` (search `### Task 13: Mission overlay — Mission 001 runs in-world, not as a route navigation`) for its exact scope; this handoff-writer has not pre-read it in depth, so don't assume anything about it beyond what the live plan doc says. Note: the plan's dependency-graph table (§2 above) flags that Task 13 touches `apps/web/src/app/(student)/academy/page.tsx` and `apps/web/src/app/(student)/mission/[missionId]/page.tsx`, and that Task 14 later inserts an `unlockHolding(...)` call into the same success path Task 13's restructuring depends on — worth re-reading that dependency note closely when scoping Task 13.

Whoever does that — write a new handoff document at `docs/superpowers/plans/handoffs/<date>-handoff-task-13.md`, following the exact structure of this document:
- §0: the "verify, don't trust" reminder (keep it — nine lessons deep now; add a tenth if Task 12 surfaces its own during execution, e.g. anything about the reduced-motion emulation, the `settleTarget` subscription pattern, or the browser check that this plan text couldn't have anticipated).
- §1: project context (can be copied nearly verbatim from this doc; update only the "which task / which phase" framing).
- §2: exact current state — **this section must be freshly verified, not copied**: confirm what's actually on `main` now (`git log origin/main --oneline -5`, confirm Task 12's squash commit is the tip and its merge-commit status is green), create a fresh branch (`feature/3d-academy-task-13`) from the current `origin/main` tip, set up a worktree at `.worktrees/task-13`, and run the same verification sequence (fetch/range-empty, install, dist builds, typecheck 7/7, world-engine tests) to confirm the starting point is healthy before handing off — **run the slow git/pnpm steps as background tasks per §0's ninth lesson**. Also re-check the N8AO known issue status, re-confirm the real production URL actually serves the merged Task 12 changes, and re-check whether Task 14's backend track (Track A) has landed out-of-band yet (still hadn't as of this handoff — re-verify, don't assume).
- §3: the gate protocol (copy verbatim — it doesn't change, except update the branch-already-pushed-or-not note based on what's actually true when you hand off).
- §4: Task 13's full verbatim text, pulled fresh from `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` — don't hand-transcribe from memory, copy it exactly. Read whatever files Task 13 modifies in their *current* state while writing the handoff, and flag any plan-vs-code drift the same way this handoff flagged Task 12's `WorldCanvas.tsx` Files-header inconsistency (which turned out to be harmless, already-flagged-in-plan) — don't assume every task's Files header is trustworthy; keep checking.
- §5: any task-specific post-implementation verification the task calls for (reuse the headless-Playwright, objective-first approach, and the Windows-orphan-process-cleanup caveat here if Task 13 also needs a dev-server browser check).
- §6: this same "what happens next" section, updated to point at Task 14 (noting Task 14 may be partially done already if Track A landed out-of-band by then).

This pattern (verify fresh state → fresh branch → full task text → pre-verify snippets against real code/tools/URLs → implement → verify (incl. browser) → PR → stop) repeats for every task through Task 17. Do not skip the "freshly verify, don't copy" step in §2 — that exact mistake (trusting stale local state instead of re-checking `origin/main`) is what caused the multi-hour git archaeology this document's §0 warns about.
