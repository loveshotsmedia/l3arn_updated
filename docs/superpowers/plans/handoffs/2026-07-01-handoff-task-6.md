# Handoff: L3ARN 3D Academy — Task 6 (Camera — Sims-style constrained rig via camera-controls)

**You are a fresh Claude Code agent with no memory of prior conversations. This document is self-contained — everything you need is here or linked from here. Read this whole document before touching any code.**

---

## 0. Read this first: the one rule that matters most

**Verify, don't trust.** Earlier work on this project hit a serious problem: a prior session built several hours of work on a stale, locally-cached copy of `main` that didn't match what was actually on GitHub (the repo had been restructured — a nested `L3arn_repo/` directory was flattened to the repo root — and the local checkout never picked that up). The fix required a careful git rebase and byte-for-byte content verification to recover.

**Before you write a single line of code**, run:
```bash
git fetch origin main
git log HEAD..origin/main --oneline
```
If that second command prints anything, **stop and investigate before proceeding** — your branch is behind `main` and you need to understand why before building on top of it. If you're following the setup instructions in §2 exactly (branching fresh from `origin/main`), this should be empty, but check anyway. Do not assume; verify.

---

## 1. What L3ARN is and what this work is

L3ARN is a parent-led + student-driven learning platform. Students explore a browser-based 3D "Academy" world, guided by an AI companion, undertaking learning missions. The current 3D world (`packages/world-engine`) is a primitive, untextured placeholder — the long-term vision (a "premium-stylized" world comparable to a well-produced browser game) is documented in:

- **Spec:** `docs/superpowers/specs/2026-06-30-3d-academy-world-design.md` — the full design vision, research-grounded, covering rendering, art pipeline, performance, architecture, and educational design.
- **Plan:** `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` — the actionable, task-by-task implementation plan for Phase 0 (Foundation) and Phase 1 (a vertical-slice "Living Great Hall" room). **This is your primary reference document — read it in full before starting, especially the "Execution Strategy" section near the top (dependency graph, gate protocol) and Task 6's full text (also reproduced in §4 below for convenience, but the live file is authoritative if the two ever disagree).**

You do not need to read the 5 research reports under `docs/superpowers/research/3d-world/` unless something in the plan references them and you need more depth — they're background, not required reading for Task 6.

---

## 2. Exact current state — start here

**Task 0** (the dependency bootstrap — React 18→19, Next 14→15, R3F v8→v9, Koota ECS, camera-controls, vitest, etc.) **is done, reviewed, and merged into `main`** via PR #6. This included adding `camera-controls: ^3.1.2` to the root `package.json` — it is already an installed dependency, Task 6 does not need to add it.

**Tasks 1 and 2** (as numbered in the plan) are no-ops — fully absorbed into Task 0 during planning. Do not try to "do" them.

**Task 3** (ECS core: `packages/world-engine/src/core/world.ts` + `clock.ts`) **is done, reviewed, and merged into `main`** via PR #7 (merge commit `104afa5`).

**Task 4** (SimLoop — single `useFrame` driving the ECS, avatar movement migrated off per-frame `setState`) **is done, reviewed, and merged into `main`** via PR #8 (squash merge commit `a9d850fe52979884e63cc8aacc2163f5bd8571d3`).

**Task 5** (Two-modes law — mission-mode controller + worldStore enforcement wiring) **is done, reviewed, and merged into `main`** via PR #9 (squash merge commit `f763851`). This added `systems/missionMode.ts` (`createMissionModeController` — fires `onEnterMission`/`onExitMission` exactly once per real transition, idempotent) and wired it into `worldStore.ts`'s `enterMissionMode`/`exitMissionMode` actions. Post-merge verification was run and confirmed passing on the updated `main`: `pnpm -r typecheck` clean across all 7 workspace packages, and `cd packages/world-engine && pnpm test` passing 12/12 (2 in `world.test.ts`, 4 in `clock.test.ts`, 3 in `movement.test.ts`, 3 in `missionMode.test.ts`).

**The next task is Task 6** (Camera — Sims-style constrained rig via camera-controls). It replaces the current restricted `<OrbitControls>` in `WorldCanvas.tsx` with the `camera-controls` library, matching ADR-004 (click/tap to move, constrained angled camera). This was verified directly against the real merged `main`: `WorldCanvas.tsx` currently imports `OrbitControls` from `@react-three/drei` and renders it with `enablePan={false}`, `enableZoom={true}`, `minPolarAngle={Math.PI / 6}`, `maxPolarAngle={Math.PI / 2.5}`, `minDistance={8}`, `maxDistance={30}`, `target={[0, 0, 0]}` — exactly the constraint values Task 6's `CameraRig` is meant to preserve. The root `package.json` was independently confirmed to already list `"camera-controls": "^3.1.2"` as a dependency, and `apps/web/package.json`'s `name` field is confirmed `@l3arn/web` (matches the dev-server command in Task 6 Step 4).

### Your branch and worktree

A branch has already been created for you: **`feature/3d-academy-task-6`**, pushed to `origin`, branched fresh from the current tip of `origin/main` (`f763851`, which includes Tasks 0, 3, 4, and 5). It currently has zero commits beyond what's already on `main` — you're starting from a clean, verified baseline.

A worktree already exists checked out to this branch at:
```
E:\L3ARN\L3arn_repo\.worktrees\task-6
```

**Use this exact worktree. Do not create a new one.** Other worktrees exist in this repo — leave them all alone, they are unrelated to your task:
- `E:\L3ARN\L3arn_repo\.worktrees\task-4` — the (now merged) Task 4 branch; historical, not needed for Task 6.
- `E:\L3ARN\L3arn_repo\.worktrees\task-5` — the (now merged) Task 5 branch; historical, not needed for Task 6.
- `E:\L3ARN\L3arn_repo\.worktrees\rebase-attempt-phase0-1` — sits on `main` (reused repeatedly for post-merge verification); not needed for Task 6.
- `E:\L3ARN\L3arn_repo\.worktrees\track-a-holdings-backend` — unrelated, separate work.

Also do not work in `E:\L3ARN\L3arn_repo` directly — that's a different checkout, on a different, unrelated branch (`docs/3d-academy-world-spec`).

### Verify your starting point before doing anything else

```bash
cd "E:\L3ARN\L3arn_repo\.worktrees\task-6"
git status                          # should show branch feature/3d-academy-task-6, clean
git log --oneline -3                # top commit should be "3D Academy Task 5: Two-modes controller (explore/mission) (#9)" or a later docs commit on this branch
git fetch origin main
git log HEAD..origin/main --oneline # MUST be empty — if not, stop and investigate
pnpm install
pnpm --filter @l3arn/shared-types build
pnpm --filter @l3arn/safety build
pnpm --filter @l3arn/mission-compiler build
pnpm -r typecheck                   # MUST pass clean across all 7 packages before you start
```

The three `pnpm --filter ... build` commands are needed because `packages/shared-types`, `packages/safety`, and `packages/mission-compiler` publish via a `dist/` folder that isn't committed to git — other packages resolve them via workspace linking against that build output, so it has to exist locally before typecheck will pass. This is a one-time thing per fresh worktree, not something you need to repeat per commit.

This exact sequence was run in this worktree moments before this document was written and confirmed clean (all 7 packages report `Done`, zero errors; `world-engine`'s test suite passes 12/12). If `pnpm -r typecheck` does not pass cleanly for you at this starting point, **stop and report back rather than building on top of a broken baseline** — something changed between then and now and needs investigating.

---

## 3. The gate protocol (non-negotiable — this is how the project owner wants to work)

1. **Implement Task 6 completely** (see §4).
2. **Verify**: run the exact typecheck command the task specifies, and confirm it passes. Don't just claim it passes — show the actual output. **This task also has a manual-browser verification step (§4 Step 4) — do not skip it.**
3. **Commit** using the message the task specifies.
4. **Push** your branch: `git push origin feature/3d-academy-task-6`
5. **Open a PR** against `main`:
   ```bash
   gh pr create --title "3D Academy Task 6: Sims-style CameraRig (camera-controls)" --base main --head feature/3d-academy-task-6 --body "..."
   ```
   Write a real PR body: what this adds, why (one or two sentences — this replaces the ad-hoc restricted `OrbitControls` with `camera-controls`, matching ADR-004 and giving a clean path to cinematic `setLookAt`/`fitToBox` moves later, e.g. the Explore→Mission "settle" in Task 12), and a test-plan checklist mirroring what you verified in step 2 (including the manual browser check).
6. **Stop.** Do not merge the PR yourself. Do not start Task 7. Do not do anything else. The project owner will review, merge, and run their own post-merge verification. Report back to them (in your final message) that the PR is open, give them the URL, and stop.

**Why this matters:** the project owner has explicitly asked for a tight, one-task-at-a-time loop with a real PR and a real merge at every step — not a big batch of work landing all at once. Respect that even if it feels like you could "just keep going." Stopping here is the correct, complete outcome for this session, not a failure to finish.

---

## 4. Task 6: Camera — Sims-style constrained rig via camera-controls

*(This is the full, verbatim task text from `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` (lines 1182–1285 as of this writing). If you find any discrepancy between this copy and the live file, the live file wins — but there shouldn't be one.)*

**Files:**
- Create: `packages/world-engine/src/render/CameraRig.tsx`
- Modify: `packages/world-engine/src/WorldCanvas.tsx`

Replaces the current restricted `<OrbitControls>` with `camera-controls`, matching ADR-004 exactly (click/tap to move — already handled by floor click; constrained angled camera — this task) and giving a cleaner path to cinematic `setLookAt`/`fitToBox` moves later (e.g., the Explore→Mission "settle").

- [ ] **Step 1: Implement CameraRig**

```tsx
// packages/world-engine/src/render/CameraRig.tsx
/**
 * CameraRig — Sims-style angled camera (ADR-004). Students orbit/zoom within
 * a constrained band; they never reach free-look or first-person by default.
 * Replaces the ad-hoc restricted <OrbitControls> with camera-controls, which
 * additionally gives us setLookAt()/fitToBox() for cinematic transitions
 * (used by the Explore -> Mission "settle" in Phase 1 Task 12).
 */
import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import CameraControlsImpl from 'camera-controls';
import * as THREE from 'three';

CameraControlsImpl.install({ THREE });

export function CameraRig() {
  const { camera, gl, invalidate } = useThree();
  const controlsRef = useRef<CameraControlsImpl | null>(null);

  useEffect(() => {
    const controls = new CameraControlsImpl(camera, gl.domElement);

    // Sims-style constraints — mirrors the previous OrbitControls limits.
    controls.minPolarAngle = Math.PI / 6; // ~30deg — don't go to top-down
    controls.maxPolarAngle = Math.PI / 2.5; // ~72deg — don't go fully horizontal
    controls.minDistance = 8;
    controls.maxDistance = 30;
    controls.dollyToCursor = false;
    controls.draggingSmoothTime = 0.15;

    // No pan — students navigate by click-to-move, not by dragging the world.
    controls.mouseButtons.left = 0; // CameraControls.ACTION.NONE
    controls.mouseButtons.right = 0;
    controls.mouseButtons.wheel = 8; // CameraControls.ACTION.ZOOM

    controls.setLookAt(10, 10, 10, 0, 0, 0, false);
    controlsRef.current = controls;

    const onControlsChange = () => invalidate();
    controls.addEventListener('update', onControlsChange);

    return () => {
      controls.removeEventListener('update', onControlsChange);
      controls.dispose();
    };
  }, [camera, gl, invalidate]);

  useEffect(() => {
    let raf: number;
    const clock = new THREE.Clock();
    const animate = () => {
      controlsRef.current?.update(clock.getDelta());
      raf = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(raf);
  }, []);

  return null;
}
```

- [ ] **Step 2: Swap it into WorldCanvas**

Edit `packages/world-engine/src/WorldCanvas.tsx` — remove the `OrbitControls` import and JSX block, add:

```tsx
import { CameraRig } from './render/CameraRig';
```

Replace the entire `<OrbitControls ...>...</OrbitControls>` block with:

```tsx
<CameraRig />
```

- [ ] **Step 3: Typecheck**

Run: `cd packages/world-engine && pnpm typecheck`
Expected: PASS. If `camera-controls`' types don't resolve cleanly against three's current version, check `node_modules/camera-controls/dist/index.d.ts` for the exact `install()` signature and adjust the import accordingly — this is a common friction point when three.js bumps minor versions.

- [ ] **Step 4: Manual verification**

Run: `pnpm --filter @l3arn/web dev`, open `/student/academy`.
Expected: mouse wheel zooms within the same 8–30 distance band as before; dragging does nothing (no pan, no free rotate); clicking the floor still moves the avatar. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add packages/world-engine/src/render/CameraRig.tsx packages/world-engine/src/WorldCanvas.tsx
git commit -m "feat(world-engine): replace OrbitControls with Sims-style CameraRig"
```

*(Handoff-writer's notes, not part of the verbatim task text: (1) The current `WorldCanvas.tsx` was read in full and independently confirmed to match this task's assumptions exactly — the existing `OrbitControls` block uses the identical constraint values (`minPolarAngle`/`maxPolarAngle`/`minDistance`/`maxDistance`) that `CameraRig` is meant to preserve, so this is a clean like-for-like swap, not a behavior change. (2) `camera-controls: ^3.1.2` is already an installed root dependency from Task 0 — no `package.json` edit needed. (3) This task has no automated test of its own (no `.test.ts` file created) — the typecheck in Step 3 plus the manual browser check in Step 4 together are the full verification; don't skip the manual step even though it's more friction than the automated-only checks in Tasks 3–5. (4) The task doesn't mention it, but if you want to sanity-check nothing else regressed, running the full `world-engine` test suite (`pnpm test`, expect 12/12 pre-existing, unchanged — this task adds no new tests) is cheap insurance before opening the PR, matching the pattern established in Tasks 3–5's §5.)*

---

## 5. After Step 5 — before you open the PR

Run the full workspace typecheck one more time to make sure nothing else broke:

```bash
pnpm -r typecheck
```

Also run the whole `world-engine` test suite to make sure nothing regressed — the Task 3/4/5 suites should still be green (Task 6 adds no new automated tests):

```bash
cd packages/world-engine && pnpm test
```

Expected: 12 tests total pass, unchanged from the pre-Task-6 baseline (2 from `world.test.ts` + 4 from `clock.test.ts` + 3 from `movement.test.ts` + 3 from `missionMode.test.ts`).

**Do not skip the manual browser verification from §4 Step 4** — this is the one task since Task 4 with a real interactive-behavior check, since it swaps the entire camera control library. Confirm zoom band, no-pan, no-free-rotate, and click-to-move-still-works, then stop the dev server before moving on.

Then follow §3, steps 4–6: push, open the PR, stop.

---

## 6. What happens next (for whoever picks this up after the PR merges)

Once the project owner merges this PR and confirms the post-merge verification (`pnpm -r typecheck` and the world-engine test suite passing on the updated `main`) is good, **the next step is Task 7 (Lighting & post-processing — IBL, CSM sun, tone mapping, explore/quiet profiles)**.

Whoever does that — write a new handoff document at `docs/superpowers/plans/handoffs/<date>-handoff-task-7.md`, following the exact structure of this document:
- §0: the "verify, don't trust" reminder (keep it — it's cheap insurance)
- §1: project context (can be copied verbatim from this doc, it doesn't change task-to-task)
- §2: exact current state — **this section must be freshly verified, not copied**: confirm what's actually on `main` now (`git log origin/main --oneline -5`), create a fresh branch (`feature/3d-academy-task-7`) from the current `origin/main` tip, set up a worktree or reuse an existing clean one, and run the same verification sequence (`pnpm install` + the three package builds + `pnpm -r typecheck`) to confirm the starting point is healthy before handing off. Note that Task 7 is the task that will finally give `missionMode.ts`'s `onEnterMission`/`onExitMission` callbacks real bodies (the "quiet post profile" swap) — verify that assumption against the real merged `worldStore.ts`/`missionMode.ts` before writing it into the doc, don't just assume it from this note.
- §3: the gate protocol (copy verbatim — it doesn't change)
- §4: Task 7's full verbatim text, pulled fresh from `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` (search for `### Task 7:`) — don't hand-transcribe from memory, copy it exactly, since the plan file is the source of truth and may have been touched by review feedback since this document was written
- §5: any task-specific post-implementation verification the task calls for
- §6: this same "what happens next" section, updated to point at Task 8

This pattern (verify fresh state → fresh branch → full task text → implement → PR → stop) repeats for every task through Task 17. Do not skip the "freshly verify, don't copy" step in §2 — that exact mistake (trusting stale local state instead of re-checking `origin/main`) is what caused the multi-hour git archaeology this document's §0 warns about.
