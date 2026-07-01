# Handoff: L3ARN 3D Academy — Task 3 (ECS core: world.ts + clock.ts)

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
- **Plan:** `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` — the actionable, task-by-task implementation plan for Phase 0 (Foundation) and Phase 1 (a vertical-slice "Living Great Hall" room). **This is your primary reference document — read it in full before starting, especially the "Execution Strategy" section near the top (dependency graph, gate protocol) and Task 3's full text (also reproduced in §4 below for convenience, but the live file is authoritative if the two ever disagree).**

You do not need to read the 5 research reports under `docs/superpowers/research/3d-world/` unless something in the plan references them and you need more depth — they're background, not required reading for Task 3.

---

## 2. Exact current state — start here

**Task 0 (the dependency bootstrap — React 18→19, Next 14→15, R3F v8→v9, Koota ECS, camera-controls, vitest, etc.) is done, reviewed, and merged into `main`** via PR #6. Every task from here on builds on top of it.

**Tasks 1 and 2 (as numbered in the plan) are no-ops.** Their content was fully absorbed into Task 0 during planning — the plan's own text says so explicitly at the top of each ("Steps 1–2 below are superseded... folded into Task 0"). Do not try to "do" Task 1 or Task 2. **The next real task with new code to write is Task 3.**

### Your branch and worktree

A branch has already been created for you: **`feature/3d-academy-task-3`**, pushed to `origin`, branched fresh from the current tip of `origin/main` (which includes Task 0). It currently has zero commits beyond what's already on `main` — you're starting from a clean, verified baseline.

A worktree already exists checked out to this branch at:
```
E:\L3ARN\L3arn_repo\.worktrees\rebase-attempt-phase0-1
```
(The folder name says "rebase-attempt-phase0-1" — that's a cosmetic leftover from a Windows file-lock that prevented a rename earlier; it is currently on branch `feature/3d-academy-task-3` and that's what matters. Feel free to rename it — `git worktree move "E:\L3ARN\L3arn_repo\.worktrees\rebase-attempt-phase0-1" "E:\L3ARN\L3arn_repo\.worktrees\task-3"` — if it works; if it fails with "Permission denied," don't fight it, just work in the existing path.)

**Use this exact worktree. Do not create a new one, do not work in `E:\L3ARN\L3arn_repo` directly (that's a different checkout, on a different, unrelated branch — `docs/3d-academy-world-spec` — leave it alone), and do not work in any other `.worktrees/*` directory you might find (there's a `track-a-holdings-backend` worktree there too — that's unrelated, separate work; do not touch it).**

### Verify your starting point before doing anything else

```bash
cd "E:\L3ARN\L3arn_repo\.worktrees\rebase-attempt-phase0-1"
git status                          # should show branch feature/3d-academy-task-3, clean
git log --oneline -3                # top commit should be "Merge pull request #6 from ..."
git fetch origin main
git log HEAD..origin/main --oneline # MUST be empty — if not, stop and investigate
pnpm install
pnpm --filter @l3arn/shared-types build
pnpm --filter @l3arn/safety build
pnpm --filter @l3arn/mission-compiler build
pnpm -r typecheck                   # MUST pass clean across all 7 packages before you start
```

The three `pnpm --filter ... build` commands are needed because `packages/shared-types`, `packages/safety`, and `packages/mission-compiler` publish via a `dist/` folder that isn't committed to git — other packages resolve them via workspace linking against that build output, so it has to exist locally before typecheck will pass. This is a one-time thing per fresh worktree, not something you need to repeat per commit.

If `pnpm -r typecheck` does not pass cleanly at this starting point, **stop and report back rather than building on top of a broken baseline.**

---

## 3. The gate protocol (non-negotiable — this is how the project owner wants to work)

1. **Implement Task 3 completely** (see §4), following TDD as the task itself specifies (write the failing test, watch it fail, implement, watch it pass — this project uses this discipline throughout).
2. **Verify**: run the exact typecheck/test commands the task specifies, and confirm they pass. Don't just claim they pass — show the actual output.
3. **Commit** using the message the task specifies.
4. **Push** your branch: `git push origin feature/3d-academy-task-3`
5. **Open a PR** against `main`:
   ```bash
   gh pr create --title "3D Academy Task 3: ECS core (world.ts + clock.ts)" --base main --head feature/3d-academy-task-3 --body "..."
   ```
   Write a real PR body: what this adds, why (one or two sentences — the ECS is the foundation everything else in Phase 0 builds on), and a test-plan checklist mirroring what you verified in step 2.
6. **Stop.** Do not merge the PR yourself. Do not start Task 4. Do not do anything else. The project owner will review, merge, and run their own post-merge verification. Report back to them (in your final message) that the PR is open, give them the URL, and stop.

**Why this matters:** the project owner has explicitly asked for a tight, one-task-at-a-time loop with a real PR and a real merge at every step — not a big batch of work landing all at once. Respect that even if it feels like you could "just keep going." Stopping here is the correct, complete outcome for this session, not a failure to finish.

---

## 4. Task 3: ECS core — world + fixed-timestep clock

*(This is the full, verbatim task text from `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md`. If you find any discrepancy between this copy and the live file, the live file wins — but there shouldn't be one.)*

**Files:**
- Create: `packages/world-engine/src/core/world.ts`
- Create: `packages/world-engine/src/core/world.test.ts`
- Create: `packages/world-engine/src/core/clock.ts`
- Create: `packages/world-engine/src/core/clock.test.ts`

- [ ] **Step 1: Write the failing test for the world wrapper**

```typescript
// packages/world-engine/src/core/world.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createGameWorld, Position, Velocity } from './world';

describe('createGameWorld', () => {
  it('spawns an entity with Position and Velocity traits and queries it back', () => {
    const world = createGameWorld();
    world.spawn(Position({ x: 1, y: 0, z: 2 }), Velocity({ x: 0, y: 0, z: 0 }));

    const results: Array<{ x: number; z: number }> = [];
    world.query(Position).updateEach(([pos]) => {
      results.push({ x: pos.x, z: pos.z });
    });

    expect(results).toEqual([{ x: 1, z: 2 }]);
  });

  it('destroy() removes the entity from future queries', () => {
    const world = createGameWorld();
    const entity = world.spawn(Position({ x: 0, y: 0, z: 0 }));
    world.destroy(entity);

    let count = 0;
    world.query(Position).updateEach(() => {
      count += 1;
    });

    expect(count).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd packages/world-engine && pnpm test src/core/world.test.ts`
Expected: FAIL — `./world` has no exported member `createGameWorld`.

- [ ] **Step 3: Implement the world wrapper**

This is a thin wrapper around Koota. Keeping our own function names (`createGameWorld`, `spawn`, `destroy`, `query`) isolates the rest of the codebase from Koota's exact API surface — if a future Koota version renames something, only this file changes.

```typescript
// packages/world-engine/src/core/world.ts
import { createWorld, trait } from 'koota';

// ─── Traits (ECS "components") ────────────────────────────────────────────
// Keep traits minimal and data-only. Behavior lives in systems/, never here.

export const Position = trait({ x: 0, y: 0, z: 0 });
export const Velocity = trait({ x: 0, y: 0, z: 0 });
export const MoveTarget = trait({ x: 0, y: 0, z: 0, active: false });
export const HouseTint = trait({ color: '#64748b' });

export function createGameWorld() {
  return createWorld();
}

export type GameWorld = ReturnType<typeof createGameWorld>;
```

- [ ] **Step 4: Run the test again**

Run: `cd packages/world-engine && pnpm test src/core/world.test.ts`
Expected: PASS, 2 tests. (Koota's own `world.spawn`/`world.query`/`world.destroy` API is used directly here — if the installed version's method names differ from what's shown, this is the one file to reconcile against `node_modules/koota`'s type definitions; the test above is the executable proof it's wired correctly.)

- [ ] **Step 5: Write the failing test for the fixed-timestep clock**

```typescript
// packages/world-engine/src/core/clock.test.ts
import { describe, it, expect } from 'vitest';
import { createFixedClock } from './clock';

describe('createFixedClock', () => {
  it('runs exactly one step for a delta equal to the step size', () => {
    const clock = createFixedClock(1 / 60);
    let steps = 0;
    clock.tick(1 / 60, () => {
      steps += 1;
    });
    expect(steps).toBe(1);
  });

  it('accumulates partial deltas across multiple ticks', () => {
    const clock = createFixedClock(1 / 60);
    let steps = 0;
    clock.tick(1 / 120, () => steps++); // half a step
    clock.tick(1 / 120, () => steps++); // now a full step accumulated
    expect(steps).toBe(1);
  });

  it('clamps a huge delta (e.g. tab was backgrounded) to avoid a spiral of death', () => {
    const clock = createFixedClock(1 / 60, { maxStepsPerTick: 5 });
    let steps = 0;
    clock.tick(10, () => steps++); // 10 seconds of "lag" at 60hz would be 600 steps
    expect(steps).toBe(5);
  });

  it('passes the alpha (interpolation factor) to the render callback', () => {
    const clock = createFixedClock(1 / 60);
    let capturedAlpha = -1;
    clock.tick(1 / 60 + 1 / 120, () => {}, (alpha) => {
      capturedAlpha = alpha;
    });
    expect(capturedAlpha).toBeGreaterThan(0);
    expect(capturedAlpha).toBeLessThan(1);
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `cd packages/world-engine && pnpm test src/core/clock.test.ts`
Expected: FAIL — cannot find module `./clock`.

- [ ] **Step 7: Implement the fixed-timestep accumulator**

```typescript
// packages/world-engine/src/core/clock.ts

export interface FixedClockOptions {
  /** Hard cap on simulation steps run in a single tick() call — prevents the
   * "spiral of death" when the tab was backgrounded and delta is huge. */
  maxStepsPerTick?: number;
}

export interface FixedClock {
  /**
   * Advance the clock by `deltaSeconds` of wall-clock time, running `step()`
   * once per fixed simulation tick (may be 0, 1, or many times). After all
   * steps run, calls `render(alpha)` with the leftover-time interpolation
   * factor (0..1) so the caller can blend visuals between the last two
   * simulation states.
   */
  tick(deltaSeconds: number, step: () => void, render?: (alpha: number) => void): void;
}

export function createFixedClock(stepSeconds: number, options: FixedClockOptions = {}): FixedClock {
  const maxStepsPerTick = options.maxStepsPerTick ?? 5;
  let accumulator = 0;

  return {
    tick(deltaSeconds, step, render) {
      accumulator += deltaSeconds;

      let stepsRun = 0;
      while (accumulator >= stepSeconds && stepsRun < maxStepsPerTick) {
        step();
        accumulator -= stepSeconds;
        stepsRun += 1;
      }

      // If we hit the cap, drop the remaining backlog rather than let it
      // compound into the next tick.
      if (stepsRun >= maxStepsPerTick) {
        accumulator = 0;
      }

      render?.(accumulator / stepSeconds);
    },
  };
}
```

- [ ] **Step 8: Run the tests again**

Run: `cd packages/world-engine && pnpm test src/core/clock.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 9: Commit**

```bash
git add packages/world-engine/src/core/
git commit -m "feat(world-engine): add Koota ECS wrapper and fixed-timestep clock"
```

---

## 5. After Step 9 — before you open the PR

Run the full workspace typecheck one more time to make sure nothing else broke:

```bash
pnpm -r typecheck
```

Also run the whole `world-engine` test suite (not just the two files you just wrote) to make sure nothing regressed:

```bash
cd packages/world-engine && pnpm test
```

Expected: 6 tests total pass (2 from `world.test.ts` + 4 from `clock.test.ts`). This is also the first time `world-engine`'s test suite will have any real tests in it — previously it correctly reported "no test files found."

Then follow §3, steps 4–6: push, open the PR, stop.

---

## 6. What happens next (for whoever picks this up after the PR merges)

Once the project owner merges this PR and confirms the post-merge verification (`pnpm -r typecheck` and the world-engine test suite passing on the updated `main`) is good, **the next step is Task 4 (SimLoop — single useFrame driving the ECS, avatar movement migrated off per-frame setState)**.

Whoever does that — write a new handoff document at `docs/superpowers/plans/handoffs/<date>-handoff-task-4.md`, following the exact structure of this document:
- §0: the "verify, don't trust" reminder (keep it — it's cheap insurance)
- §1: project context (can be copied verbatim from this doc, it doesn't change task-to-task)
- §2: exact current state — **this section must be freshly verified, not copied**: confirm what's actually on `main` now (`git log origin/main --oneline -5`), create a fresh branch (`feature/3d-academy-task-4`) from the current `origin/main` tip, set up a worktree or reuse an existing clean one, and run the same verification sequence (`pnpm install` + the three package builds + `pnpm -r typecheck`) to confirm the starting point is healthy before handing off
- §3: the gate protocol (copy verbatim — it doesn't change)
- §4: Task 4's full verbatim text, pulled fresh from `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` (search for `### Task 4:`) — don't hand-transcribe from memory, copy it exactly, since the plan file is the source of truth and may have been touched by review feedback since this document was written
- §5: any task-specific post-implementation verification the task calls for
- §6: this same "what happens next" section, updated to point at Task 5

This pattern (verify fresh state → fresh branch → full task text → implement → PR → stop) repeats for every task through Task 17. Do not skip the "freshly verify, don't copy" step in §2 — that exact mistake (trusting stale local state instead of re-checking `origin/main`) is what caused the multi-hour git archaeology this document's §0 warns about.
