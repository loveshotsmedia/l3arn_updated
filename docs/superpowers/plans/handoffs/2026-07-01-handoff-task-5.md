# Handoff: L3ARN 3D Academy — Task 5 (Two-modes law — mission-mode state + ambient-pause system)

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
- **Plan:** `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` — the actionable, task-by-task implementation plan for Phase 0 (Foundation) and Phase 1 (a vertical-slice "Living Great Hall" room). **This is your primary reference document — read it in full before starting, especially the "Execution Strategy" section near the top (dependency graph, gate protocol) and Task 5's full text (also reproduced in §4 below for convenience, but the live file is authoritative if the two ever disagree).**

You do not need to read the 5 research reports under `docs/superpowers/research/3d-world/` unless something in the plan references them and you need more depth — they're background, not required reading for Task 5.

---

## 2. Exact current state — start here

**Task 0** (the dependency bootstrap — React 18→19, Next 14→15, R3F v8→v9, Koota ECS, camera-controls, vitest, etc.) **is done, reviewed, and merged into `main`** via PR #6.

**Tasks 1 and 2** (as numbered in the plan) are no-ops — fully absorbed into Task 0 during planning. Do not try to "do" them.

**Task 3** (ECS core: `packages/world-engine/src/core/world.ts` + `clock.ts`) **is done, reviewed, and merged into `main`** via PR #7 (merge commit `104afa5`). This added a thin Koota ECS wrapper (`createGameWorld()`, traits `Position`/`Velocity`/`MoveTarget`/`HouseTint`) and a fixed-timestep accumulator (`createFixedClock()`).

**Task 4** (SimLoop — single `useFrame` driving the ECS, avatar movement migrated off per-frame `setState`) **is done, reviewed, and merged into `main`** via PR #8 (squash merge commit `a9d850fe52979884e63cc8aacc2163f5bd8571d3`). This added `systems/movement.ts` (fixed-step movement, `APPROACH_FACTOR` ease-out), `render/SimLoop.tsx` (the single `useFrame`), and rewired `worldStore.ts`/`PlayerAvatar.tsx`/`WorldCanvas.tsx` onto the ECS. Post-merge verification was run and confirmed passing on the updated `main`: `pnpm -r typecheck` clean across all 7 workspace packages, and `cd packages/world-engine && pnpm test` passing 9/9 (2 in `world.test.ts`, 4 in `clock.test.ts`, 3 in `movement.test.ts`).

**The next task is Task 5** (Two-modes law — mission-mode state + ambient-pause system). It builds on Task 4's `worldStore.ts`, which **already contains** `worldMode: 'explore' | 'mission'`, `enterMissionMode`, and `exitMissionMode` (verified present on the merged `main` at `worldStore.ts` lines 26/37-38/45/82-83) — Task 5 adds the *enforcement* controller those actions will call through.

### Your branch and worktree

A branch has already been created for you: **`feature/3d-academy-task-5`**, pushed to `origin`, branched fresh from the current tip of `origin/main` (`a9d850f`, which includes Tasks 0, 3, and 4). It currently has zero commits beyond what's already on `main` — you're starting from a clean, verified baseline.

A worktree already exists checked out to this branch at:
```
E:\L3ARN\L3arn_repo\.worktrees\task-5
```

**Use this exact worktree. Do not create a new one.** Three other worktrees exist in this repo — leave them all alone, they are unrelated to your task:
- `E:\L3ARN\L3arn_repo\.worktrees\task-4` — the (now merged) Task 4 branch; historical, not needed for Task 5.
- `E:\L3ARN\L3arn_repo\.worktrees\rebase-attempt-phase0-1` — sits on `main`; not needed for Task 5.
- `E:\L3ARN\L3arn_repo\.worktrees\track-a-holdings-backend` — unrelated, separate work.

Also do not work in `E:\L3ARN\L3arn_repo` directly — that's a different checkout, on a different, unrelated branch (`docs/3d-academy-world-spec`).

### Verify your starting point before doing anything else

```bash
cd "E:\L3ARN\L3arn_repo\.worktrees\task-5"
git status                          # should show branch feature/3d-academy-task-5, clean
git log --oneline -3                # top commit should be "3D Academy Task 4: SimLoop (ECS-driven movement) (#8)" or a later docs commit on this branch
git fetch origin main
git log HEAD..origin/main --oneline # MUST be empty — if not, stop and investigate
pnpm install
pnpm --filter @l3arn/shared-types build
pnpm --filter @l3arn/safety build
pnpm --filter @l3arn/mission-compiler build
pnpm -r typecheck                   # MUST pass clean across all 7 packages before you start
```

The three `pnpm --filter ... build` commands are needed because `packages/shared-types`, `packages/safety`, and `packages/mission-compiler` publish via a `dist/` folder that isn't committed to git — other packages resolve them via workspace linking against that build output, so it has to exist locally before typecheck will pass. This is a one-time thing per fresh worktree, not something you need to repeat per commit.

This exact sequence was run in this worktree moments before this document was written and confirmed clean (all 7 packages report `Done`, zero errors; `world-engine`'s test suite passes 9/9). If `pnpm -r typecheck` does not pass cleanly for you at this starting point, **stop and report back rather than building on top of a broken baseline** — something changed between then and now and needs investigating.

---

## 3. The gate protocol (non-negotiable — this is how the project owner wants to work)

1. **Implement Task 5 completely** (see §4), following TDD as the task itself specifies (write the failing test, watch it fail, implement, watch it pass — this project uses this discipline throughout).
2. **Verify**: run the exact typecheck/test commands the task specifies, and confirm they pass. Don't just claim they pass — show the actual output.
3. **Commit** using the message the task specifies.
4. **Push** your branch: `git push origin feature/3d-academy-task-5`
5. **Open a PR** against `main`:
   ```bash
   gh pr create --title "3D Academy Task 5: Two-modes controller (explore/mission)" --base main --head feature/3d-academy-task-5 --body "..."
   ```
   Write a real PR body: what this adds, why (one or two sentences — this adds the single enforcement point for the spec §4.3 two-modes law, so every ambient/decorative system pauses/resumes through one controller instead of each reading `worldMode` independently), and a test-plan checklist mirroring what you verified in step 2.
6. **Stop.** Do not merge the PR yourself. Do not start Task 6. Do not do anything else. The project owner will review, merge, and run their own post-merge verification. Report back to them (in your final message) that the PR is open, give them the URL, and stop.

**Why this matters:** the project owner has explicitly asked for a tight, one-task-at-a-time loop with a real PR and a real merge at every step — not a big batch of work landing all at once. Respect that even if it feels like you could "just keep going." Stopping here is the correct, complete outcome for this session, not a failure to finish.

---

## 4. Task 5: Two-modes law — mission-mode state + ambient-pause system

*(This is the full, verbatim task text from `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` (lines 1028–1180 as of this writing). If you find any discrepancy between this copy and the live file, the live file wins — but there shouldn't be one.)*

**Files:**
- Create: `packages/world-engine/src/systems/missionMode.ts`
- Create: `packages/world-engine/src/systems/missionMode.test.ts`
- Modify: `packages/world-engine/src/state/worldStore.ts` (already has `worldMode`/`enterMissionMode`/`exitMissionMode` from Task 4 — this task adds the *enforcement* system)

- [ ] **Step 1: Write the failing test**

```typescript
// packages/world-engine/src/systems/missionMode.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createMissionModeController } from './missionMode';

describe('createMissionModeController', () => {
  it('calls onEnterMission exactly once when transitioning explore -> mission', () => {
    const onEnterMission = vi.fn();
    const onExitMission = vi.fn();
    const controller = createMissionModeController({ onEnterMission, onExitMission });

    controller.setMode('explore');
    controller.setMode('mission');

    expect(onEnterMission).toHaveBeenCalledTimes(1);
    expect(onExitMission).not.toHaveBeenCalled();
  });

  it('calls onExitMission exactly once when transitioning mission -> explore', () => {
    const onEnterMission = vi.fn();
    const onExitMission = vi.fn();
    const controller = createMissionModeController({ onEnterMission, onExitMission });

    controller.setMode('mission');
    controller.setMode('explore');

    expect(onExitMission).toHaveBeenCalledTimes(1);
  });

  it('is idempotent — setting the same mode twice does not re-fire callbacks', () => {
    const onEnterMission = vi.fn();
    const onExitMission = vi.fn();
    const controller = createMissionModeController({ onEnterMission, onExitMission });

    controller.setMode('mission');
    controller.setMode('mission');

    expect(onEnterMission).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd packages/world-engine && pnpm test src/systems/missionMode.test.ts`
Expected: FAIL — cannot find module `./missionMode`.

- [ ] **Step 3: Implement the controller**

This is the enforcement point for spec §4.3 — every ambient/decorative system registers a pause/resume pair here instead of each reading `worldMode` independently, so there is exactly one place that guarantees Mission mode is visually quiet.

```typescript
// packages/world-engine/src/systems/missionMode.ts

export type WorldMode = 'explore' | 'mission';

export interface MissionModeCallbacks {
  /** Fired once, on the explore -> mission transition. Pause ambient systems, swap to the quiet post profile, dampen MoMO's animation here. */
  onEnterMission: () => void;
  /** Fired once, on the mission -> explore transition. Resume ambient systems, restore the explore post profile. */
  onExitMission: () => void;
}

export interface MissionModeController {
  setMode: (mode: WorldMode) => void;
  getMode: () => WorldMode;
}

export function createMissionModeController(
  callbacks: MissionModeCallbacks,
): MissionModeController {
  let current: WorldMode = 'explore';

  return {
    setMode(mode) {
      if (mode === current) return;
      current = mode;
      if (mode === 'mission') {
        callbacks.onEnterMission();
      } else {
        callbacks.onExitMission();
      }
    },
    getMode() {
      return current;
    },
  };
}
```

- [ ] **Step 4: Run the tests again**

Run: `cd packages/world-engine && pnpm test src/systems/missionMode.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Wire the controller into worldStore's enter/exitMissionMode actions**

Edit `packages/world-engine/src/state/worldStore.ts` — import and instantiate the controller, and call `controller.setMode(...)` from the existing actions so the callbacks fire exactly once per real transition (this is what Task 7's `PostProfiles` and a future ambient-vegetation system will register against):

```typescript
import { createMissionModeController } from '../systems/missionMode';
```

Add near the top of the store creation (outside `create()`, module scope, since it doesn't hold React state itself):

```typescript
const missionModeController = createMissionModeController({
  onEnterMission: () => {
    // Registered listeners (post-processing profile, ambient systems) read
    // worldMode directly via useWorldStore — this controller's job is only
    // to guarantee enter/exit fire exactly once per transition, for any
    // future system (e.g. companion animation damping) that needs a single
    // imperative hook rather than a reactive subscription.
  },
  onExitMission: () => {},
});
```

Update the two actions:

```typescript
enterMissionMode: () => {
  missionModeController.setMode('mission');
  set({ worldMode: 'mission' });
},
exitMissionMode: () => {
  missionModeController.setMode('explore');
  set({ worldMode: 'explore' });
},
```

- [ ] **Step 6: Run the full world-engine test suite**

Run: `cd packages/world-engine && pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/world-engine/src/systems/missionMode.ts packages/world-engine/src/systems/missionMode.test.ts packages/world-engine/src/state/worldStore.ts
git commit -m "feat(world-engine): add two-modes (explore/mission) controller"
```

*(Handoff-writer's notes, not part of the verbatim task text: (1) The worldStore assumption was verified against the real merged `main` — `worldMode`/`enterMissionMode`/`exitMissionMode` exist exactly as the task expects, and `setMoveTarget` already gates on `worldMode === 'mission'`. (2) As with Task 4, the worldStore edit is a **modify** — read the real current file first and reconcile; the snippets above are the target end-state, and existing callers must keep working. (3) Known minor debts recorded during Task 4's review, NOT in scope for Task 5 — don't fix them unless the task text asks: `clearMoveTarget` doesn't deactivate the ECS `MoveTarget` trait; the Zustand `moveTarget` field currently has zero readers; `HouseTint` can hold a stale fallback color if `house` resolves after mount; `PlayerAvatar`/`setMoveTarget` query ALL `Position`/`MoveTarget` entities (deliberate single-entity YAGNI until Phase 2 NPCs).)*

---

## 5. After Step 7 — before you open the PR

Run the full workspace typecheck one more time to make sure nothing else broke:

```bash
pnpm -r typecheck
```

Also run the whole `world-engine` test suite (not just `missionMode.test.ts`) to make sure nothing regressed — the Task 3 and Task 4 suites should still be green alongside your new `missionMode.test.ts`:

```bash
cd packages/world-engine && pnpm test
```

Expected: 12 tests total pass (2 from `world.test.ts` + 4 from `clock.test.ts` + 3 from `movement.test.ts`, all pre-existing, + 3 new from `missionMode.test.ts`).

Task 5 has no manual-browser step of its own (the controller callbacks are intentionally empty until Task 7/Task 12+ register real listeners, and mission mode isn't reachable from the UI yet) — the automated suite plus workspace typecheck is the full verification for this task.

Then follow §3, steps 4–6: push, open the PR, stop.

---

## 6. What happens next (for whoever picks this up after the PR merges)

Once the project owner merges this PR and confirms the post-merge verification (`pnpm -r typecheck` and the world-engine test suite passing on the updated `main`) is good, **the next step is Task 6 (Camera — Sims-style constrained rig via camera-controls)**.

Whoever does that — write a new handoff document at `docs/superpowers/plans/handoffs/<date>-handoff-task-6.md`, following the exact structure of this document:
- §0: the "verify, don't trust" reminder (keep it — it's cheap insurance)
- §1: project context (can be copied verbatim from this doc, it doesn't change task-to-task)
- §2: exact current state — **this section must be freshly verified, not copied**: confirm what's actually on `main` now (`git log origin/main --oneline -5`), create a fresh branch (`feature/3d-academy-task-6`) from the current `origin/main` tip, set up a worktree or reuse an existing clean one, and run the same verification sequence (`pnpm install` + the three package builds + `pnpm -r typecheck`) to confirm the starting point is healthy before handing off
- §3: the gate protocol (copy verbatim — it doesn't change)
- §4: Task 6's full verbatim text, pulled fresh from `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` (search for `### Task 6:`) — don't hand-transcribe from memory, copy it exactly, since the plan file is the source of truth and may have been touched by review feedback since this document was written
- §5: any task-specific post-implementation verification the task calls for
- §6: this same "what happens next" section, updated to point at Task 7

This pattern (verify fresh state → fresh branch → full task text → implement → PR → stop) repeats for every task through Task 17. Do not skip the "freshly verify, don't copy" step in §2 — that exact mistake (trusting stale local state instead of re-checking `origin/main`) is what caused the multi-hour git archaeology this document's §0 warns about.
