# Handoff: L3ARN 3D Academy — Task 4 (SimLoop — single useFrame driving the ECS, avatar movement migrated off per-frame setState)

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
- **Plan:** `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` — the actionable, task-by-task implementation plan for Phase 0 (Foundation) and Phase 1 (a vertical-slice "Living Great Hall" room). **This is your primary reference document — read it in full before starting, especially the "Execution Strategy" section near the top (dependency graph, gate protocol) and Task 4's full text (also reproduced in §4 below for convenience, but the live file is authoritative if the two ever disagree).**

You do not need to read the 5 research reports under `docs/superpowers/research/3d-world/` unless something in the plan references them and you need more depth — they're background, not required reading for Task 4.

---

## 2. Exact current state — start here

**Task 0** (the dependency bootstrap — React 18→19, Next 14→15, R3F v8→v9, Koota ECS, camera-controls, vitest, etc.) **is done, reviewed, and merged into `main`** via PR #6.

**Tasks 1 and 2** (as numbered in the plan) are no-ops — fully absorbed into Task 0 during planning. Do not try to "do" them.

**Task 3** (ECS core: `packages/world-engine/src/core/world.ts` + `clock.ts`) **is done, reviewed, and merged into `main`** via PR #7 (merge commit `104afa5fddaf49d2451df95e85091c831a40c578`). This added a thin Koota ECS wrapper (`createGameWorld()`, traits `Position`/`Velocity`/`MoveTarget`/`HouseTint`) and a fixed-timestep accumulator (`createFixedClock()`). Post-merge verification was run and confirmed passing on the updated `main`: `pnpm -r typecheck` clean across all 7 workspace packages, and `cd packages/world-engine && pnpm test` passing 6/6 (2 in `world.test.ts`, 4 in `clock.test.ts`).

**The next real task with new code to write is Task 4** (SimLoop — single `useFrame` driving the ECS, avatar movement migrated off per-frame `setState`). It builds directly on Task 3's `core/world.ts` and `core/clock.ts`.

### Your branch and worktree

A branch has already been created for you: **`feature/3d-academy-task-4`**, pushed to `origin`, branched fresh from the current tip of `origin/main` (which includes Task 0 and Task 3). It currently has zero commits beyond what's already on `main` — you're starting from a clean, verified baseline.

A worktree already exists checked out to this branch at:
```
E:\L3ARN\L3arn_repo\.worktrees\task-4
```

**Use this exact worktree. Do not create a new one.** Two other worktrees exist in this repo — leave both alone, they are unrelated to your task:
- `E:\L3ARN\L3arn_repo\.worktrees\rebase-attempt-phase0-1` — currently sits on `main` (it was used to verify Task 3's post-merge state and is not needed for Task 4).
- `E:\L3ARN\L3arn_repo\.worktrees\track-a-holdings-backend` — unrelated, separate work (`feature/3d-academy-holdings-backend-flat`).

Also do not work in `E:\L3ARN\L3arn_repo` directly — that's a different checkout, on a different, unrelated branch (`docs/3d-academy-world-spec`).

### Verify your starting point before doing anything else

```bash
cd "E:\L3ARN\L3arn_repo\.worktrees\task-4"
git status                          # should show branch feature/3d-academy-task-4, clean
git log --oneline -3                # top commit should be "3D Academy Task 3: ECS core (world.ts + clock.ts) (#7)"
git fetch origin main
git log HEAD..origin/main --oneline # MUST be empty — if not, stop and investigate
pnpm install
pnpm --filter @l3arn/shared-types build
pnpm --filter @l3arn/safety build
pnpm --filter @l3arn/mission-compiler build
pnpm -r typecheck                   # MUST pass clean across all 7 packages before you start
```

The three `pnpm --filter ... build` commands are needed because `packages/shared-types`, `packages/safety`, and `packages/mission-compiler` publish via a `dist/` folder that isn't committed to git — other packages resolve them via workspace linking against that build output, so it has to exist locally before typecheck will pass. This is a one-time thing per fresh worktree, not something you need to repeat per commit.

This exact sequence was run in this worktree moments before this document was written and confirmed clean (all 7 packages report `Done`, zero errors; `world-engine`'s test suite passes 6/6). If `pnpm -r typecheck` does not pass cleanly for you at this starting point, **stop and report back rather than building on top of a broken baseline** — something changed between then and now and needs investigating.

---

## 3. The gate protocol (non-negotiable — this is how the project owner wants to work)

1. **Implement Task 4 completely** (see §4), following TDD as the task itself specifies (write the failing test, watch it fail, implement, watch it pass — this project uses this discipline throughout).
2. **Verify**: run the exact typecheck/test commands the task specifies, and confirm they pass. Don't just claim they pass — show the actual output.
3. **Commit** using the message the task specifies.
4. **Push** your branch: `git push origin feature/3d-academy-task-4`
5. **Open a PR** against `main`:
   ```bash
   gh pr create --title "3D Academy Task 4: SimLoop (ECS-driven movement)" --base main --head feature/3d-academy-task-4 --body "..."
   ```
   Write a real PR body: what this adds, why (one or two sentences — this migrates avatar movement off ad-hoc per-frame refs onto the fixed-timestep ECS simulation loop from Task 3, so movement speed no longer drifts with frame rate), and a test-plan checklist mirroring what you verified in step 2.
6. **Stop.** Do not merge the PR yourself. Do not start Task 5. Do not do anything else. The project owner will review, merge, and run their own post-merge verification. Report back to them (in your final message) that the PR is open, give them the URL, and stop.

**Why this matters:** the project owner has explicitly asked for a tight, one-task-at-a-time loop with a real PR and a real merge at every step — not a big batch of work landing all at once. Respect that even if it feels like you could "just keep going." Stopping here is the correct, complete outcome for this session, not a failure to finish.

---

## 4. Task 4: SimLoop — single useFrame driving the ECS, avatar movement migrated off per-frame setState

*(This is the full, verbatim task text from `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` (lines 665–1026 as of this writing). If you find any discrepancy between this copy and the live file, the live file wins — but there shouldn't be one.)*

**Files:**
- Create: `packages/world-engine/src/render/SimLoop.tsx`
- Create: `packages/world-engine/src/systems/movement.ts`
- Create: `packages/world-engine/src/systems/movement.test.ts`
- Modify: `packages/world-engine/src/objects/PlayerAvatar.tsx`
- Modify: `packages/world-engine/src/state/worldStore.ts`
- Modify: `packages/world-engine/src/WorldCanvas.tsx`

The existing `PlayerAvatar.tsx` already avoids `setState`-per-frame (it lerps a ref in `useFrame` directly) — that part is fine. What's missing is a **single shared simulation loop** other systems will plug into, and a fixed-timestep movement system so speed doesn't drift with frame rate (today's `LERP_SPEED = 0.05` per frame is implicitly frame-rate-dependent, which is exactly the bug the fixed clock exists to prevent).

- [ ] **Step 1: Write the failing test for the movement system**

```typescript
// packages/world-engine/src/systems/movement.test.ts
import { describe, it, expect } from 'vitest';
import { createGameWorld, Position, MoveTarget } from '../core/world';
import { stepMovement } from './movement';

describe('stepMovement', () => {
  it('moves an entity toward its active MoveTarget at a fixed rate per step', () => {
    const world = createGameWorld();
    world.spawn(
      Position({ x: 0, y: 0.9, z: 0 }),
      MoveTarget({ x: 10, y: 0.9, z: 0, active: true }),
    );

    stepMovement(world);

    let x = -1;
    world.query(Position).updateEach(([pos]) => {
      x = pos.x;
    });

    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThan(10); // moved toward, didn't teleport
  });

  it('does nothing when MoveTarget is not active', () => {
    const world = createGameWorld();
    world.spawn(Position({ x: 5, y: 0.9, z: 5 }), MoveTarget({ x: 0, y: 0, z: 0, active: false }));

    stepMovement(world);

    let x = -1;
    let z = -1;
    world.query(Position).updateEach(([pos]) => {
      x = pos.x;
      z = pos.z;
    });

    expect(x).toBe(5);
    expect(z).toBe(5);
  });

  it('snaps and deactivates once within arrival tolerance', () => {
    const world = createGameWorld();
    world.spawn(
      Position({ x: 9.99, y: 0.9, z: 0 }),
      MoveTarget({ x: 10, y: 0.9, z: 0, active: true }),
    );

    stepMovement(world);

    let x = -1;
    let active = true;
    world.query(Position, MoveTarget).updateEach(([pos, target]) => {
      x = pos.x;
      active = target.active;
    });

    expect(x).toBe(10);
    expect(active).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd packages/world-engine && pnpm test src/systems/movement.test.ts`
Expected: FAIL — cannot find module `./movement`.

- [ ] **Step 3: Implement the movement system**

```typescript
// packages/world-engine/src/systems/movement.ts
import type { GameWorld } from '../core/world';
import { Position, MoveTarget } from '../core/world';

/** Units per fixed simulation step. At a 60hz fixed clock this is ~3 units/sec. */
const STEP_SPEED = 0.05;
const ARRIVAL_TOLERANCE = 0.02;

export function stepMovement(world: GameWorld): void {
  world.query(Position, MoveTarget).updateEach(([pos, target]) => {
    if (!target.active) return;

    const dx = target.x - pos.x;
    const dz = target.z - pos.z;
    const distSq = dx * dx + dz * dz;

    if (distSq <= ARRIVAL_TOLERANCE * ARRIVAL_TOLERANCE) {
      pos.x = target.x;
      pos.z = target.z;
      target.active = false;
      return;
    }

    pos.x += dx * STEP_SPEED;
    pos.z += dz * STEP_SPEED;
  });
}
```

*(Note: this task's code was written against the literal `world.ts` snippet from the plan doc's Task 3 section, i.e. assuming `world.query(...)` is called directly on the object returned by `createGameWorld()`. Task 3's actual merged implementation wraps Koota's world in `{ spawn, destroy, query, raw }` — `query` is exposed with the same generic signature, so `world.query(Position, MoveTarget).updateEach(...)` above works unchanged against the real `core/world.ts`. If you hit a type or behavior mismatch here, read the actual merged `packages/world-engine/src/core/world.ts` on `main` first — it is the source of truth, not this snippet.)*

- [ ] **Step 4: Run the tests again**

Run: `cd packages/world-engine && pnpm test src/systems/movement.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Build SimLoop — the single useFrame**

```tsx
// packages/world-engine/src/render/SimLoop.tsx
/**
 * SimLoop — the ONE useFrame for the whole world. Every other system that
 * needs to run per-frame plugs in here, never in its own separate useFrame.
 * This is what keeps the simulation deterministic and off the React render
 * path (spec §6.2/§6.3).
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { createFixedClock } from '../core/clock';
import type { GameWorld } from '../core/world';
import { stepMovement } from '../systems/movement';

const FIXED_STEP = 1 / 60;

interface SimLoopProps {
  world: GameWorld;
}

export function SimLoop({ world }: SimLoopProps) {
  const clockRef = useRef(createFixedClock(FIXED_STEP));

  useFrame((_state, delta) => {
    // Clamp raw delta before it ever reaches the accumulator — a second line
    // of defense against spiral-of-death on top of the clock's own cap.
    const safeDelta = Math.min(delta, 0.25);
    clockRef.current.tick(safeDelta, () => {
      stepMovement(world);
    });
  });

  return null;
}
```

- [ ] **Step 6: Extend worldStore to hold the shared ECS world**

Edit `packages/world-engine/src/state/worldStore.ts` — add a world instance and a helper to push move-target changes into the ECS instead of only the old plain `{x,y,z}` shape. Keep `moveTarget`/`setMoveTarget` for backward compatibility with existing callers (`GreatHall.tsx`'s floor click) but back it onto the ECS entity:

```typescript
// packages/world-engine/src/state/worldStore.ts
import { create } from 'zustand';
import { createGameWorld, Position, MoveTarget, HouseTint, type GameWorld } from '../core/world';

interface WorldState {
  world: GameWorld;
  /** The single player-avatar entity id, created once on first mount. */
  playerEntity: number | null;

  /** Target position for avatar lerp movement. null = no pending movement. */
  moveTarget: { x: number; y: number; z: number } | null;

  /** Explore vs Mission — the two-modes law (spec §4). */
  worldMode: 'explore' | 'mission';

  currentScene: string | null;
  worldStateFrozen: boolean;

  ensurePlayerEntity: (initialPosition: [number, number, number], houseColor: string) => number;
  setMoveTarget: (x: number, y: number, z: number) => void;
  clearMoveTarget: () => void;
  setCurrentScene: (scene: string) => void;
  freezeWorldState: () => void;
  unfreezeWorldState: () => void;
  enterMissionMode: () => void;
  exitMissionMode: () => void;
}

export const useWorldStore = create<WorldState>((set, get) => ({
  world: createGameWorld(),
  playerEntity: null,
  moveTarget: null,
  worldMode: 'explore',
  currentScene: null,
  worldStateFrozen: false,

  ensurePlayerEntity: (initialPosition, houseColor) => {
    const existing = get().playerEntity;
    if (existing !== null) return existing;

    const [x, y, z] = initialPosition;
    const entity = get().world.spawn(
      Position({ x, y, z }),
      MoveTarget({ x, y, z, active: false }),
      HouseTint({ color: houseColor }),
    );
    set({ playerEntity: entity });
    return entity;
  },

  setMoveTarget: (x, y, z) =>
    set((state) => {
      if (state.worldStateFrozen || state.worldMode === 'mission') return state;
      if (state.playerEntity !== null) {
        state.world.query(MoveTarget).updateEach(([target]) => {
          target.x = x;
          target.y = y;
          target.z = z;
          target.active = true;
        });
      }
      return { moveTarget: { x, y, z } };
    }),

  clearMoveTarget: () => set({ moveTarget: null }),
  setCurrentScene: (scene) => set({ currentScene: scene }),
  freezeWorldState: () => set({ worldStateFrozen: true }),
  unfreezeWorldState: () => set({ worldStateFrozen: false }),

  enterMissionMode: () => set({ worldMode: 'mission' }),
  exitMissionMode: () => set({ worldMode: 'explore' }),
}));
```

**Before editing this file, read the current, real `packages/world-engine/src/state/worldStore.ts` on your branch first.** The snippet above is the plan's target end-state; the plan doc itself calls out that you need to preserve backward compatibility with existing callers (e.g. `GreatHall.tsx`'s floor click) while rewiring internals onto the ECS. If the current file's shape differs from what's assumed here (extra fields, different method names), reconcile carefully rather than overwriting blindly — this is a **modify**, not a from-scratch create, and existing callers must keep working.

- [ ] **Step 7: Migrate PlayerAvatar to read Position from the ECS instead of owning its own lerp**

```tsx
// packages/world-engine/src/objects/PlayerAvatar.tsx
/**
 * PlayerAvatar — The student's in-world representation.
 *
 * Position is owned by the ECS (core/world.ts Position trait) and advanced
 * by systems/movement.ts inside SimLoop's fixed-timestep tick. This component
 * only reads the entity's Position each frame and writes it onto the ref —
 * it never mutates simulation state itself (spec §6.2: render = mutation
 * through refs, sim lives outside React).
 */
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Group } from 'three';
import { HOUSE_COLORS } from '../types';
import { useWorldStore } from '../state/worldStore';
import { Position } from '../core/world';

interface PlayerAvatarProps {
  displayName: string;
  house?: 'pre_sorting' | 'Valkryn' | 'Lyrion' | 'Novari' | 'Cytrex';
  initialPosition?: [number, number, number];
}

export function PlayerAvatar({
  displayName,
  house,
  initialPosition = [3, 0.9, 3],
}: PlayerAvatarProps) {
  const meshRef = useRef<Group>(null);
  const houseColor = house ? HOUSE_COLORS[house] : '#64748b';
  const world = useWorldStore((s) => s.world);
  const ensurePlayerEntity = useWorldStore((s) => s.ensurePlayerEntity);

  useEffect(() => {
    ensurePlayerEntity(initialPosition, houseColor);
    // Intentionally run once — the entity must not be re-created on re-renders
    // (e.g. when `house` resolves after the verified-identity effect fires).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;
    world.query(Position).updateEach(([pos]) => {
      meshRef.current!.position.set(pos.x, pos.y, pos.z);
    });
  });

  return (
    <group ref={meshRef} position={initialPosition}>
      <mesh castShadow>
        <capsuleGeometry args={[0.3, 0.8, 4, 8]} />
        <meshStandardMaterial color={houseColor} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial color={houseColor} roughness={0.5} />
      </mesh>
      <Html position={[0, 1.4, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            color: '#f1f5f9',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            border: `1px solid ${houseColor}`,
          }}
        >
          {displayName}
        </div>
      </Html>
    </group>
  );
}
```

**Read the current, real `PlayerAvatar.tsx` before overwriting it** — same caution as Step 6. It's a **modify**, and the plan doc itself notes the existing lerp-in-`useFrame` approach is already fine on its own terms; you're changing *where the position data comes from* (ECS instead of a locally-owned ref/lerp), not the overall rendering approach.

> Note: with only one query updating one entity, `updateEach` running for every entity that has `Position` is fine — once Phase 2 introduces NPCs/other entities with `Position`, `PlayerAvatar` will need to filter by its own entity id (store `playerEntity` and compare) rather than "the first Position it finds." Left as-is here deliberately (YAGNI) since there is exactly one Position entity in Phase 1.

- [ ] **Step 8: Mount SimLoop in WorldCanvas**

Edit `packages/world-engine/src/WorldCanvas.tsx` — add the import and mount `<SimLoop world={world} />` inside the `<Canvas>`, before `<Suspense>`:

```tsx
import { SimLoop } from './render/SimLoop';
import { useWorldStore } from './state/worldStore';
```

Inside the `WorldCanvas` function body, before the `return`:

```tsx
const world = useWorldStore((s) => s.world);
```

Inside the returned `<Canvas>`, right after the fill light and before `<OrbitControls>`:

```tsx
<SimLoop world={world} />
```

(`<OrbitControls>` itself is replaced in Task 6 — leave it in place for this task so the app keeps working end-to-end between tasks.)

**Read the current, real `WorldCanvas.tsx` before editing** — confirm the fill light / `<OrbitControls>` structure the plan assumes actually matches what's there; if it's drifted, place `<SimLoop>` wherever makes sense inside the `<Canvas>` (order relative to lights/controls doesn't functionally matter — `SimLoop` renders `null` and only registers a `useFrame` hook), and note the discrepancy in your final report.

- [ ] **Step 9: Typecheck and run all world-engine tests**

Run: `cd packages/world-engine && pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 10: Manual verification — avatar still moves on click**

Run: `pnpm --filter @l3arn/web dev`, open `/student/academy`, click the floor.
Expected: avatar walks toward the click point exactly as before (visually unchanged — this task is an internal architecture migration, not a visual change). Stop the dev server.

- [ ] **Step 11: Commit**

```bash
git add packages/world-engine/src/
git commit -m "refactor(world-engine): move avatar movement into ECS-driven SimLoop"
```

---

## 5. After Step 11 — before you open the PR

Run the full workspace typecheck one more time to make sure nothing else broke:

```bash
pnpm -r typecheck
```

Also run the whole `world-engine` test suite (not just `movement.test.ts`) to make sure nothing regressed — Task 3's `world.test.ts` and `clock.test.ts` should still be green alongside your new `movement.test.ts`:

```bash
cd packages/world-engine && pnpm test
```

Expected: 9 tests total pass (2 from `world.test.ts` + 4 from `clock.test.ts`, both from Task 3, + 3 new from `movement.test.ts`).

Confirm Step 10's manual browser check was actually done and the dev server was stopped afterward — don't skip this because the automated tests passed; the whole point of Task 4 is that avatar movement should be **visually unchanged** despite the internal rewire, and that can only be confirmed by actually looking at it.

Then follow §3, steps 4–6: push, open the PR, stop.

---

## 6. What happens next (for whoever picks this up after the PR merges)

Once the project owner merges this PR and confirms the post-merge verification (`pnpm -r typecheck` and the world-engine test suite passing on the updated `main`) is good, **the next step is Task 5 (Two-modes law — mission-mode state + ambient-pause system)**.

Whoever does that — write a new handoff document at `docs/superpowers/plans/handoffs/<date>-handoff-task-5.md`, following the exact structure of this document:
- §0: the "verify, don't trust" reminder (keep it — it's cheap insurance)
- §1: project context (can be copied verbatim from this doc, it doesn't change task-to-task)
- §2: exact current state — **this section must be freshly verified, not copied**: confirm what's actually on `main` now (`git log origin/main --oneline -5`), create a fresh branch (`feature/3d-academy-task-5`) from the current `origin/main` tip, set up a worktree or reuse an existing clean one, and run the same verification sequence (`pnpm install` + the three package builds + `pnpm -r typecheck`) to confirm the starting point is healthy before handing off
- §3: the gate protocol (copy verbatim — it doesn't change)
- §4: Task 5's full verbatim text, pulled fresh from `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` (search for `### Task 5:`) — don't hand-transcribe from memory, copy it exactly, since the plan file is the source of truth and may have been touched by review feedback since this document was written
- §5: any task-specific post-implementation verification the task calls for
- §6: this same "what happens next" section, updated to point at Task 6

This pattern (verify fresh state → fresh branch → full task text → implement → PR → stop) repeats for every task through Task 17. Do not skip the "freshly verify, don't copy" step in §2 — that exact mistake (trusting stale local state instead of re-checking `origin/main`) is what caused the multi-hour git archaeology this document's §0 warns about.
