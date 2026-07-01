# L3ARN 3D Academy — Phase 0 (Foundation) + Phase 1 (Living Great Hall) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `packages/world-engine` from a primitive box-scene R3F v8 prototype into an architecturally sound, ECS-driven, premium-stylized-capable engine (Phase 0), then prove it end-to-end by rebuilding the Great Hall + pulling Mission 001 in-world with a real mastery-gated building unlock (Phase 1), meeting every acceptance criterion in spec §10.1.

**Architecture:** Simulation state lives in a Koota ECS outside React; a single fixed-timestep `useFrame` loop drives all systems and mutates Three.js objects through refs; React owns only the Canvas shell, HUD, and discrete-event state (Zustand). Rendering uses R3F v9 on WebGL2 with baked-in-mind lighting (one CSM sun + IBL + ACES tone mapping) and two post-processing profiles gated by a `worldMode: 'explore' | 'mission'` state machine — the "two-modes law" from spec §4.

**Tech Stack:** React 19, Next.js 15, @react-three/fiber v9, @react-three/drei v10, @react-three/postprocessing v3, three.js, Koota (ECS), camera-controls, Zustand, Vitest (new — world-engine has no test runner today), gltf-transform (CI asset gate).

**Deliberately deferred (YAGNI — not in this plan):** `recast-navigation` pathfinding and `@react-three/rapier` physics (spec §6.5/6.7) — the Great Hall is one static room with no obstacles and click-to-interact is sufficient; both get pulled in when Phase 2 adds multi-room realms with real navigation needs. Multiplayer (`apps/realtime`, ADR-005) is Phase 5. Full event-sourced world-state ledger (spec §9.1) is generalized in Phase 2 — Phase 1 ships one narrow, real, server-backed unlock record (§Task 14) that proves the same shape without over-building.

---

## File Structure

```
packages/world-engine/
├─ package.json                       [MODIFY] — R3F v9 stack, vitest, koota, camera-controls
├─ vitest.config.ts                   [CREATE] — node environment, no DOM needed (pure logic tests only)
├─ src/
│  ├─ core/
│  │  ├─ world.ts                    [CREATE] — Koota world singleton + trait definitions (thin wrapper)
│  │  ├─ world.test.ts                [CREATE]
│  │  ├─ clock.ts                    [CREATE] — fixed-timestep accumulator
│  │  └─ clock.test.ts                [CREATE]
│  ├─ systems/
│  │  ├─ movement.ts                 [CREATE] — ECS-driven avatar lerp (replaces per-frame logic in PlayerAvatar)
│  │  ├─ movement.test.ts             [CREATE]
│  │  └─ missionMode.ts              [CREATE] — ambient-pause / quiet-profile side effects on mode change
│  ├─ device/
│  │  ├─ deviceTier.ts               [CREATE] — tier classifier + FPS governor
│  │  └─ deviceTier.test.ts           [CREATE]
│  ├─ render/
│  │  ├─ SimLoop.tsx                 [CREATE] — single useFrame driving fixed-step + ECS systems
│  │  ├─ CameraRig.tsx               [CREATE] — camera-controls, Sims-style constrained
│  │  ├─ Lighting.tsx                [CREATE] — IBL + CSM sun + tone mapping
│  │  ├─ PostProfiles.tsx            [CREATE] — explore vs quiet post-processing
│  │  └─ ContextGuard.tsx            [CREATE] — webglcontextlost/restored handling
│  ├─ objects/
│  │  ├─ PlayerAvatar.tsx            [MODIFY] — read position from ECS instead of local lerp
│  │  ├─ SortingComputer.tsx         [MODIFY] — dispatch enterMissionMode() on click
│  │  └─ MasteryBuilding.tsx         [CREATE] — appears when a holding is unlocked
│  ├─ scenes/
│  │  └─ GreatHall.tsx               [MODIFY] — new lighting rig, materials, MasteryBuilding mount
│  ├─ state/
│  │  └─ worldStore.ts               [MODIFY] — add worldMode + enter/exitMissionMode + qualityTier
│  ├─ persistence/
│  │  └─ holdingsClient.ts           [CREATE] — fetch/persist unlocked holdings (thin wrapper, Railway-backed)
│  ├─ WorldCanvas.tsx                [MODIFY] — R3F v9 Canvas, mode-aware post profile, ContextGuard, governor
│  └─ index.ts                       [MODIFY] — export new public surface

packages/ui/
└─ package.json                                              [MODIFY] — bump react/react-dom peer range from ^18.3.0 to ^19.0.0 (confirmed via grep, not hypothetical)

apps/web/
├─ package.json                                              [MODIFY] — matching R3F v9 stack, React 19, Next 15
├─ src/app/(student)/academy/page.tsx                         [MODIFY] — mission overlay instead of router.push
├─ src/app/(student)/academy/MissionOverlay.tsx               [CREATE] — renders mission UI atop the quieted 3D scene
└─ src/lib/student-session.ts                                 [MODIFY] — add holdings client functions (authedPost)

packages/shared-types/src/
├─ world-holdings.schema.ts          [CREATE] — GetHoldingsResponse / UnlockHoldingRequest/Response
└─ index.ts                          [MODIFY] — export new schema

services/ai-workers/src/routes/
└─ student-session.route.ts          [MODIFY] — GET/POST /api/student/session/holdings

supabase/migrations/
└─ 013_world_holdings.sql            [CREATE] — world_holdings table + RLS

.github/workflows/
└─ asset-gate.yml                    [CREATE] — CI: gltf-transform compression/budget check

scripts/
└─ check-glb-budget.mjs              [CREATE] — CI script: validates any .glb in packages/world-engine/public/models
```

**Design note on `worldStore.ts`:** the codebase already has a small, focused `worldStore.ts` (Zustand). Per "follow existing patterns, don't unilaterally restructure," this plan **extends** that file rather than introducing a parallel `uiStore.ts` — the spec's module breakdown names are a target shape for the eventual full engine, not a mandate to rename a file that already does the job.

---

## Execution Strategy: Dependency Graph, Parallel Tracks & Gate Protocol

This section was produced by mechanically extracting every file/symbol each task touches directly from the task text below, then adversarially re-checking that extraction against the live repo and the plan's own code blocks (verified: `packages/ui/package.json` really does pin `react: ^18.3.0` — confirmed by grep, not assumed). Read this before executing anything.

### Gate protocol

1. **Per-task gate.** After a task's tests pass, its manual-verification step is confirmed, and its commit is made — STOP. Report what was built and verified, then explicitly ask "OK to proceed to the next task?" before starting it. Do not chain tasks without this checkpoint. Every commit is pushed to the phase's open PR as it lands (continuous CI/preview feedback, not a big reveal at the end).
2. **Phase gate — real deploy, not just local checks (user-mandated 2026-07-01).** At the end of Phase 0 (after Task 9) and the end of Phase 1 (after Task 17):
   - Run the complete local test suite and a full walk of that phase's acceptance criteria (as before).
   - Confirm the phase's PR is green: Vercel's automatic preview deployment for the PR must build and serve successfully (this is the frontend proof — Vercel previews every PR against this GitHub repo automatically). Any GitHub Actions workflows that exist by that point (e.g. Task 9's asset-budget gate) must also pass.
   - **Merge the PR into `main`.** Railway (the backend, `services/ai-workers`) only deploys from `main` — it does not build per-branch previews — so backend changes (e.g. Phase 1's Track A holdings routes) are only genuinely deploy-verified once merged and live. This means each phase becomes a real, shipped increment, not just a passed local check.
   - After merging, verify the live deployment is actually healthy (Vercel production build succeeded; if backend routes changed, confirm Railway redeployed and the new routes respond) before starting the next phase.
   - Only after the merge is confirmed live and healthy does the next phase start, branching a fresh PR from the now-updated `main`.
3. **Parallel-batch gate.** When a batch of tasks runs as an independent parallel track (see below), the gate applies at the *batch* boundary, not per-task-within-the-batch: "these N independent tasks all completed and passed their own tests — here's the combined summary — OK to proceed?" Strict per-task-only gating implies fully sequential execution; parallelism and gating meet at the batch boundary, not inside it. A parallel track's branch (e.g. Track A) merges into the *phase* it semantically belongs to, not necessarily the phase it happened to be built during — Track A is Phase 1 content (Task 14), so it merges at the Phase 1 boundary even though it was built during Phase 0's critical-path work.

### Corrected dependency graph

**The critical path is a real, mostly-linear spine** — this plan bootstraps an engine from nothing and proves it on one room, so most tasks incrementally extend the previous one's exports. Two files thread through nearly all of Phase 0 and drive most of the sequencing:

| Hot file | Touched by (in this order) |
|---|---|
| `packages/world-engine/src/state/worldStore.ts` | 4 → 5 → 8 → 12 → 14 |
| `packages/world-engine/src/WorldCanvas.tsx` | 4 → 6 → 7 → 8 → 16 (Task 12's own Files header also lists this file, but its visible steps only edit `CameraRig.tsx`/`worldStore.ts`/`SortingComputer.tsx` — flagging this as a minor plan-internal inconsistency the adversarial review caught; treat Task 12 as *not* requiring a `WorldCanvas.tsx` edit unless you find otherwise while executing it) |
| `packages/world-engine/src/objects/SortingComputer.tsx` | 11 → 12 → 15 |
| `apps/web/src/app/(student)/academy/page.tsx` | 13 → 14 → 15 |
| `apps/web/src/app/(student)/mission/[missionId]/page.tsx` | 13 → 14 (missed in the first-pass graph — Task 14 inserts an `unlockHolding(...)` call right after the `completeMission(...)` success path Task 13's restructuring depends on) |
| `packages/world-engine/package.json` + root lockfile | 1 → 2 → 7 → 9 (four separate tasks mutating installed-dependency state — this is exactly why Task 0 below consolidates them) |

**Two corrections from the adversarial pass that change execution order, not just documentation:**

- **Task 11 → Task 14 (forward reference).** `GreatHall.tsx` (Task 11) imports `MasteryBuilding` from a file Task 14 doesn't create until later. Task 11's own text already flags this ("will fail until Task 14 creates `MasteryBuilding.tsx`... stub it with a null-returning component if running out of order") — but treat it as a hard graph edge, not an optional workaround: **either run 11 before 14 with a temporary stub, or run 14 before 11.** They are not safely parallelizable as independent tracks.
- **Confirmed, not hypothetical: `packages/ui/package.json` pins `react: ^18.3.0`.** Task 0 below performs this bump directly rather than treating it as conditional.

### Parallel tracks

- **Track A — Task 14's backend slice, parallel-safe from Task 0 onward.** Verified by grep: Task 14's Steps 1–3 (the `world_holdings` Supabase migration, the `world-holdings.schema.ts` shared-types addition, and the two new Express routes in `student-session.route.ts`) touch `supabase/migrations/`, `packages/shared-types/src/`, and `services/ai-workers/src/routes/student-session.route.ts` — **no other task in this plan touches any of those three paths.** This can be built and tested by a separate track starting the moment Task 0 lands, running the entire time Tasks 1–13 are underway. Only Task 14's Steps 4–7 (the frontend client functions, `MasteryBuilding.tsx`, `worldStore.ts` additions, and the `academy`/`mission` page wiring) need to wait for Task 11 (forward reference) and Task 13 (shared-file edits).
- **Everything else is the critical path.** The ECS → SimLoop → two-modes → camera → lighting → device-tier chain (Tasks 3–8) each incrementally extends the same `worldStore.ts`/`WorldCanvas.tsx`, and Phase 1 (Tasks 10–17) builds directly on Phase 0's exports. This is an honest reflection of the work, not under-optimization: a from-scratch engine bootstrap is inherently more sequential than parallel. Task 9's asset-gate *content* (the script/workflow logic, as opposed to its install step) has no file overlap with Tasks 3/5/6 and could be authored on a side track if you want to fill otherwise-idle capacity, but the wall-clock benefit is small given how short Task 9 already is.

### Recommendation

Run the critical path (Task 0 → 1 → 2 → 3 → ... → 17) sequentially with a gate after every task, **except** dispatch Track A (Task 14's backend slice) as a standing parallel track starting right after Task 0, with its own gate when *it* completes — independent of wherever the critical path happens to be. This gets the one real, verified parallelism win without forcing artificial concurrency onto a chain of tasks that generally can't support it.

---

# PHASE 0 — FOUNDATION

### Task 0: Dependency & Tooling Bootstrap

**Files:**
- Modify: `packages/world-engine/package.json`
- Modify: `apps/web/package.json`
- Modify: `packages/ui/package.json` (confirmed via grep — currently pins `"react": "^18.3.0"`)
- Modify: root `package.json` (adds `@gltf-transform/cli` as a workspace-root dev dependency)
- Modify: `pnpm-lock.yaml`

This task consolidates **every** dependency install needed across the whole Phase 0/1 plan into one atomic step — the adversarial verification pass found that Tasks 1, 2, 7, and 9 (as originally scoped) each mutate `package.json`/the shared lockfile independently, with no ordering enforced between them; running any two in parallel risks a lockfile race or a lost update. Doing it once, here, means every task from this point on touches only source files and can be reasoned about (and parallelized) without lockfile contention. **This task supersedes:** Task 1 Steps 1–2, Task 2 Steps 1–4, Task 7 Step 4, and Task 9 Step 1 below — do not repeat those installs; execute the remaining (non-install) steps in those tasks as written, against the dependencies installed here.

- [ ] **Step 1: Confirm which packages pin a React 18 range**

Run: `grep -rn '"react"' packages/*/package.json apps/*/package.json`
Expected: confirms `packages/ui/package.json` pins `"react": "^18.3.0"` (verified) alongside `apps/web/package.json` and `packages/world-engine/package.json` — all three need bumping.

- [ ] **Step 2: Update `packages/world-engine/package.json`**

```json
{
  "scripts": {
    "lint": "tsc --noEmit",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@react-three/drei": "^10.0.0",
    "@react-three/fiber": "^9.1.0",
    "@react-three/postprocessing": "^3.0.0",
    "react": "^19.1.0",
    "three": "^0.171.0",
    "zod": "^3.23.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/three": "^0.171.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.8"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "three": "^0.171.0"
  }
}
```

- [ ] **Step 3: Update `apps/web/package.json`**

```json
{
  "dependencies": {
    "@l3arn/shared-types": "workspace:*",
    "@l3arn/ui": "workspace:*",
    "@l3arn/world-engine": "workspace:*",
    "@react-three/drei": "^10.0.0",
    "@react-three/fiber": "^9.1.0",
    "@supabase/supabase-js": "^2.49.0",
    "@supabase/ssr": "^0.5.0",
    "next": "^15.3.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "three": "^0.171.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/three": "^0.171.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "^15.3.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 4: Update `packages/ui/package.json`'s React peer/dependency range to `^19.0.0`**

Open `packages/ui/package.json`, find every `"react"`/`"react-dom"` entry pinned to `^18.x`, and bump to `^19.0.0`. This package has no other content this plan touches — the only change is the version range.

- [ ] **Step 5: Install koota and camera-controls at their current published versions**

Run: `pnpm add koota@latest camera-controls@latest --filter @l3arn/world-engine`
(Using `@latest` rather than a guessed pin for these smaller, faster-moving packages — this is a concrete, executable install, not a placeholder.)

- [ ] **Step 6: Install the postprocessing peer dependency**

Run: `pnpm add postprocessing@^6.36.0 --filter @l3arn/world-engine`
(`@react-three/postprocessing` v3 requires the `postprocessing` package directly as a peer — needed by Task 7's `PostProfiles.tsx`.)

- [ ] **Step 7: Install the gltf-transform CLI at the workspace root**

Run: `pnpm add -D -w @gltf-transform/cli`
(Needed by Task 9's asset budget gate.)

- [ ] **Step 8: Install everything at the workspace root**

Run: `pnpm install`
Expected: resolves cleanly across all four touched `package.json` files with one lockfile update.

- [ ] **Step 9: Run Next's codemod for the React 19 / Next 15 migration**

Run: `cd apps/web && npx @next/codemod@latest upgrade latest`
Expected: applies any required source transforms (e.g., async `params`/`searchParams` in Next 15). Review the diff before proceeding.

- [ ] **Step 10: Typecheck everything**

Run: `pnpm -r typecheck`
Expected: PASS. If R3F v9 removed a deprecated prop/hook, the error will point at the exact call site (most likely `<OrbitControls>` usage in `WorldCanvas.tsx`, which Task 6 replaces anyway — a `// @ts-expect-error R3F v9 migration, replaced in Task 6` marker is acceptable here only if strictly necessary to unblock the gate, removed in Task 6).

- [ ] **Step 11: Verify the app builds and boots**

Run: `pnpm --filter @l3arn/web build`
Expected: succeeds.

Run: `pnpm --filter @l3arn/web dev`, open `http://localhost:3000/student/academy`.
Expected: loads without a hydration error or blank canvas (visual quality is still the old placeholder scene — Phase 1 fixes that). Stop the dev server.

- [ ] **Step 12: Create the vitest config**

```typescript
// packages/world-engine/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node', // pure simulation-logic tests only; rendering is verified live (Playwright), not unit-tested
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 13: Prove the vitest harness works**

```typescript
// packages/world-engine/src/core/_smoke.test.ts
import { describe, it, expect } from 'vitest';

describe('vitest harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `cd packages/world-engine && pnpm test`
Expected: PASS, 1 test. Then delete it: `rm packages/world-engine/src/core/_smoke.test.ts`.

- [ ] **Step 14: Commit**

```bash
git add apps/web/package.json packages/world-engine/package.json packages/ui/package.json package.json pnpm-lock.yaml
git add -A  # picks up any codemod-touched files from Step 9
git commit -m "chore: bootstrap React 19 / Next 15 / R3F v9 stack + vitest + gltf-transform CLI"
```

---

### Task 1: Add Vitest to world-engine

*(Installs already done in Task 0 — Steps 1–2 below are superseded. Steps 3–6, proving the harness, were also folded into Task 0 Step 12. This task is a no-op if Task 0 has already run; keep it in the plan only as a standalone reference for what "add vitest" looks like in isolation.)*

**Files:**
- Create: `packages/world-engine/vitest.config.ts`
- Modify: `packages/world-engine/package.json`
- Test: `packages/world-engine/src/core/_smoke.test.ts` (deleted at the end of this task — proves the harness, not kept)

- [ ] **Step 1: Add vitest as a dev dependency**

Edit `packages/world-engine/package.json` — replace the `"test"` script and add `devDependencies`:

```json
{
  "scripts": {
    "lint": "tsc --noEmit",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/three": "^0.171.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Install**

Run: `cd packages/world-engine && pnpm install`
Expected: lockfile updates, no errors.

- [ ] **Step 3: Create the vitest config**

```typescript
// packages/world-engine/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node', // pure simulation-logic tests only; rendering is verified live (Playwright), not unit-tested
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Write a smoke test to prove the harness**

```typescript
// packages/world-engine/src/core/_smoke.test.ts
import { describe, it, expect } from 'vitest';

describe('vitest harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run it**

Run: `cd packages/world-engine && pnpm test`
Expected: PASS, 1 test.

- [ ] **Step 6: Delete the smoke test and commit**

```bash
rm packages/world-engine/src/core/_smoke.test.ts
git add packages/world-engine/package.json packages/world-engine/vitest.config.ts
git commit -m "chore(world-engine): add vitest test harness"
```

---

### Task 2: Upgrade to React 19 / Next 15 / R3F v9

*(Steps 1–4 — the actual package installs — are superseded by Task 0, which also confirmed and bumped `packages/ui/package.json`'s pinned `react: ^18.3.0`. Steps 5–7 (codemod, typecheck, build/dev-boot verify) were likewise folded into Task 0 Steps 9–11. Keep this task as the standalone reference for the upgrade's rationale.)*

**Files:**
- Modify: `apps/web/package.json`
- Modify: `packages/world-engine/package.json`
- Modify: `packages/ui/package.json` (confirmed via Task 0 Step 1 — it pins `react: ^18.3.0` and must be bumped)

This is the biggest single sequencing decision in the spec (§6.1, open question #1). It is done **first, alone, with nothing else changed**, so any breakage is unambiguously attributable to the upgrade.

- [ ] **Step 1: Check for other packages pinned to React 18**

Run: `grep -rn '"react"' packages/*/package.json apps/*/package.json`
Expected: confirm which packages declare a `react`/`react-dom` peer/dependency range. Any pinned to `^18` must be bumped in this task too.

- [ ] **Step 2: Update `packages/world-engine/package.json` dependencies**

```json
{
  "dependencies": {
    "@react-three/drei": "^10.0.0",
    "@react-three/fiber": "^9.1.0",
    "@react-three/postprocessing": "^3.0.0",
    "react": "^19.1.0",
    "three": "^0.171.0",
    "zod": "^3.23.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/three": "^0.171.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.8"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "three": "^0.171.0"
  }
}
```

Also run `pnpm add koota@latest camera-controls@latest --filter @l3arn/world-engine` to pick up current published versions rather than guessing exact patch numbers for these smaller, faster-moving packages.

- [ ] **Step 3: Update `apps/web/package.json` dependencies**

```json
{
  "dependencies": {
    "@l3arn/shared-types": "workspace:*",
    "@l3arn/ui": "workspace:*",
    "@l3arn/world-engine": "workspace:*",
    "@react-three/drei": "^10.0.0",
    "@react-three/fiber": "^9.1.0",
    "@supabase/supabase-js": "^2.49.0",
    "@supabase/ssr": "^0.5.0",
    "next": "^15.3.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "three": "^0.171.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/three": "^0.171.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "^15.3.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 4: Install at the workspace root**

Run: `pnpm install`
Expected: resolves cleanly. If pnpm reports a peer-dependency conflict from a package still on React 18 (found in Step 1), bump that package's peer range in the same commit.

- [ ] **Step 5: Run Next's codemod for the React 19 / Next 15 migration**

Run: `cd apps/web && npx @next/codemod@latest upgrade latest`
Expected: codemod applies any required source transforms (e.g., async `params`/`searchParams` in Next 15). Review the diff it produces before proceeding.

- [ ] **Step 6: Typecheck everything**

Run: `pnpm -r typecheck`
Expected: PASS. R3F v9 removed a few deprecated props/hooks — if this fails, the errors will point at exact call sites (most likely `<OrbitControls>` usage in `WorldCanvas.tsx`, which Task 6 replaces anyway — safe to leave a `// @ts-expect-error R3F v9 migration, replaced in Task 6` marker only if strictly necessary to unblock the typecheck gate, and remove it in Task 6).

- [ ] **Step 7: Verify the app builds and boots**

Run: `pnpm --filter @l3arn/web build`
Expected: build succeeds.

Run: `pnpm --filter @l3arn/web dev` then open `http://localhost:3000/student/academy`
Expected: page loads without a hydration error or a blank canvas (visual quality is still the old placeholder scene at this point — that's expected, Phase 1 fixes the visuals). Stop the dev server (Ctrl+C) once confirmed.

- [ ] **Step 8: Commit**

```bash
git add apps/web/package.json packages/world-engine/package.json pnpm-lock.yaml
git add -A  # picks up any codemod-touched files
git commit -m "chore: upgrade to React 19 / Next 15 / R3F v9 / drei v10"
```

---

### Task 3: ECS core — world + fixed-timestep clock

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

### Task 4: SimLoop — single useFrame driving the ECS, avatar movement migrated off per-frame setState

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
  it('moves an entity toward its active MoveTarget by a fraction of the remaining distance per step', () => {
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

/**
 * Fraction of the REMAINING distance covered per fixed simulation step
 * (exponential ease-out), matching the old render-loop `LERP_SPEED = 0.05`
 * per-frame lerp. This is NOT a constant speed: velocity is proportional to
 * distance from the target (~3 × distance units/sec at a 60hz fixed clock),
 * so do not derive units/sec or time-to-arrival from this value directly.
 */
const APPROACH_FACTOR = 0.05;
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

    pos.x += dx * APPROACH_FACTOR;
    pos.z += dz * APPROACH_FACTOR;
  });
}
```

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

### Task 5: Two-modes law — mission-mode state + ambient-pause system

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

---

### Task 6: Camera — Sims-style constrained rig via camera-controls

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

---

### Task 7: Lighting & post-processing — IBL, CSM sun, tone mapping, explore/quiet profiles

**Files:**
- Create: `packages/world-engine/src/render/Lighting.tsx`
- Create: `packages/world-engine/src/render/PostProfiles.tsx`
- Modify: `packages/world-engine/src/WorldCanvas.tsx`

- [ ] **Step 1: Implement Lighting (IBL + sun + tone mapping)**

```tsx
// packages/world-engine/src/render/Lighting.tsx
/**
 * Lighting — the single lighting rig for every scene (spec §7.2).
 * One directional sun with cascaded-quality shadow settings, an environment
 * map for image-based lighting, and ACES filmic tone mapping. Real HDRI
 * asset is wired in Phase 1 Task 10; until then <Environment preset> gives
 * a reasonable built-in IBL so this task is independently verifiable.
 */
import { Environment } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';

export function Lighting() {
  const { gl } = useThree();

  useEffect(() => {
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.1;
    gl.outputColorSpace = SRGBColorSpace;
  }, [gl]);

  return (
    <>
      <Environment preset="dawn" background={false} />

      <ambientLight intensity={0.25} />

      {/* Key light / "sun" — the ONE real-time shadow-casting light (spec §8.1: <=1 real-time light on LOW tier). */}
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.0005}
      />

      {/* Soft fill — no shadow, cheap. */}
      <directionalLight position={[-5, 10, -5]} intensity={0.25} />
    </>
  );
}
```

- [ ] **Step 2: Implement PostProfiles (explore vs quiet)**

```tsx
// packages/world-engine/src/render/PostProfiles.tsx
/**
 * PostProfiles — the visual half of the two-modes law (spec §4). Explore
 * mode gets the full stylized-PBR look (bloom + AO); Mission mode strips it
 * back to just tone-mapped output so the task surface reads clearly and
 * doesn't compete with instruction (Mayer's Coherence Principle — spec §5.2 /
 * research report 05 §1).
 */
import { EffectComposer, Bloom, N8AO } from '@react-three/postprocessing';
import { useWorldStore } from '../state/worldStore';

export function PostProfiles() {
  const worldMode = useWorldStore((s) => s.worldMode);

  if (worldMode === 'mission') {
    // Deliberately no <EffectComposer> at all in Mission mode — cheapest
    // possible path, and there is nothing to "turn off" that could leak.
    return null;
  }

  return (
    <EffectComposer multisampling={0}>
      <N8AO aoRadius={0.5} intensity={1.2} />
      <Bloom luminanceThreshold={0.8} luminanceSmoothing={0.2} intensity={0.4} />
    </EffectComposer>
  );
}
```

- [ ] **Step 3: Mount both in WorldCanvas**

Edit `packages/world-engine/src/WorldCanvas.tsx` — remove the existing manual `<ambientLight>`/`<directionalLight>` JSX (now owned by `Lighting`), import and mount:

```tsx
import { Lighting } from './render/Lighting';
import { PostProfiles } from './render/PostProfiles';
```

Replace the old ambient/directional light block with:

```tsx
<Lighting />
```

Add, after `<CameraRig />`:

```tsx
<PostProfiles />
```

- [ ] **Step 4: Confirm the postprocessing peer dependency is resolved**

*(Already installed by Task 0 Step 6 — this step is now just a check, not an install.)*

Run: `cd packages/world-engine && grep '"postprocessing"' package.json`
Expected: `postprocessing@^6.36.0` is present (`@react-three/postprocessing` v3 requires it directly as a peer). If missing, run `pnpm add postprocessing@^6.36.0` here as a fallback.

- [ ] **Step 5: Typecheck and build**

Run: `cd packages/world-engine && pnpm typecheck`
Run: `pnpm --filter @l3arn/web build`
Expected: both PASS.

- [ ] **Step 6: Manual verification**

Run: `pnpm --filter @l3arn/web dev`, open `/student/academy`.
Expected: the scene is visibly warmer/richer than the flat lighting before (IBL reflections on the Sorting Computer's metal material, softer shadow, bloom on the emissive screen). This is the first moment the world should look meaningfully better than the "primitive box scene" baseline. Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add packages/world-engine/src/render/Lighting.tsx packages/world-engine/src/render/PostProfiles.tsx packages/world-engine/src/WorldCanvas.tsx packages/world-engine/package.json
git commit -m "feat(world-engine): IBL + tone mapping + explore/quiet post-processing profiles"
```

---

### Task 8: Device tier detection + FPS governor + manual quality control

**Files:**
- Create: `packages/world-engine/src/device/deviceTier.ts`
- Create: `packages/world-engine/src/device/deviceTier.test.ts`
- Modify: `packages/world-engine/src/state/worldStore.ts`
- Modify: `packages/world-engine/src/WorldCanvas.tsx`

- [ ] **Step 1: Write the failing test for the tier classifier**

```typescript
// packages/world-engine/src/device/deviceTier.test.ts
import { describe, it, expect } from 'vitest';
import { classifyDeviceTier } from './deviceTier';

describe('classifyDeviceTier', () => {
  it('classifies a known integrated-GPU renderer string as LOW', () => {
    expect(classifyDeviceTier('Intel(R) HD Graphics 620')).toBe('LOW');
  });

  it('classifies Apple M-series GPUs as MED', () => {
    expect(classifyDeviceTier('Apple M1')).toBe('MED');
    expect(classifyDeviceTier('Apple M3 Pro')).toBe('MED');
  });

  it('classifies a discrete NVIDIA/AMD GPU as HIGH', () => {
    expect(classifyDeviceTier('NVIDIA GeForce RTX 4070')).toBe('HIGH');
    expect(classifyDeviceTier('AMD Radeon RX 7800')).toBe('HIGH');
  });

  it('defaults unknown/unavailable renderer strings to LOW (never assume capability)', () => {
    expect(classifyDeviceTier(null)).toBe('LOW');
    expect(classifyDeviceTier('SwiftShader')).toBe('LOW');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd packages/world-engine && pnpm test src/device/deviceTier.test.ts`
Expected: FAIL — cannot find module `./deviceTier`.

- [ ] **Step 3: Implement the classifier + FPS governor**

```typescript
// packages/world-engine/src/device/deviceTier.ts
/**
 * Device tier detection + runtime FPS governor (spec §8.1/8.3). Boot-time
 * classification from WEBGL_debug_renderer_info sets the starting budget;
 * the governor then adjusts DPR down/up based on measured frame time, so a
 * device that thermal-throttles mid-session degrades gracefully instead of
 * staying pinned to a budget it can no longer hit.
 */

export type DeviceTier = 'LOW' | 'MED' | 'HIGH';

const HIGH_MARKERS = ['nvidia', 'geforce', 'rtx', 'gtx', 'radeon', 'rx '];
const MED_MARKERS = ['apple m', 'adreno 6', 'adreno 7', 'mali-g7', 'mali-g9'];

export function classifyDeviceTier(rendererString: string | null): DeviceTier {
  if (!rendererString) return 'LOW';
  const lower = rendererString.toLowerCase();

  if (lower.includes('swiftshader') || lower.includes('llvmpipe')) return 'LOW';
  if (HIGH_MARKERS.some((marker) => lower.includes(marker))) return 'HIGH';
  if (MED_MARKERS.some((marker) => lower.includes(marker))) return 'MED';
  return 'LOW'; // unknown integrated GPUs (Intel HD/UHD, older Adreno/Mali) — never assume capability
}

/** Reads WEBGL_debug_renderer_info off a live WebGL context. Returns null in non-browser/test environments. */
export function detectRendererString(gl: WebGLRenderingContext | WebGL2RenderingContext): string | null {
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  if (!ext) return null;
  return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string;
}

export const TIER_DPR_CAP: Record<DeviceTier, number> = {
  LOW: 1.0,
  MED: 1.5,
  HIGH: 2.0,
};

export interface FpsGovernorOptions {
  targetFps: number;
  /** Never drop DPR below this floor, even under sustained low FPS. */
  minDpr?: number;
}

export interface FpsGovernor {
  /** Feed a frame's delta time (seconds); returns the DPR to use this frame. */
  sample(deltaSeconds: number): number;
}

/**
 * A simple hysteresis governor: averages FPS over a rolling window and steps
 * DPR down by 10% when consistently under target, up by 10% when consistently
 * well over target — never oscillates on a single noisy frame.
 */
export function createFpsGovernor(startingDpr: number, options: FpsGovernorOptions): FpsGovernor {
  const minDpr = options.minDpr ?? 0.75;
  let dpr = startingDpr;
  let samples: number[] = [];
  const WINDOW = 60;

  return {
    sample(deltaSeconds) {
      const fps = deltaSeconds > 0 ? 1 / deltaSeconds : options.targetFps;
      samples.push(fps);
      if (samples.length < WINDOW) return dpr;

      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      samples = [];

      if (avg < options.targetFps * 0.85) {
        dpr = Math.max(minDpr, dpr * 0.9);
      } else if (avg > options.targetFps * 1.15) {
        dpr = Math.min(2.0, dpr * 1.1);
      }
      return dpr;
    },
  };
}
```

- [ ] **Step 4: Run the tests again**

Run: `cd packages/world-engine && pnpm test src/device/deviceTier.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Add quality-tier state to worldStore**

Edit `packages/world-engine/src/state/worldStore.ts` — add fields and a setter (the manual quality slider from spec §8.5 writes here; the automatic governor also writes here):

```typescript
import type { DeviceTier } from '../device/deviceTier';
```

Add to `WorldState`:

```typescript
qualityTier: DeviceTier;
dpr: number;
setQualityTier: (tier: DeviceTier) => void;
setDpr: (dpr: number) => void;
```

Add to the store body:

```typescript
qualityTier: 'MED',
dpr: 1.5,
setQualityTier: (tier) => set({ qualityTier: tier }),
setDpr: (dpr) => set({ dpr }),
```

- [ ] **Step 6: Wire boot-time detection + the governor into WorldCanvas**

Edit `packages/world-engine/src/WorldCanvas.tsx` — import the new module:

```tsx
import { useEffect, useRef } from 'react';
import { classifyDeviceTier, detectRendererString, TIER_DPR_CAP, createFpsGovernor } from './device/deviceTier';
```

Add a small child component (mounted inside `<Canvas>`, since it needs `useThree`) that does boot detection once and governs DPR every frame:

```tsx
function DeviceGovernor() {
  const { gl, invalidate } = useThree();
  const setQualityTier = useWorldStore((s) => s.setQualityTier);
  const setDpr = useWorldStore((s) => s.setDpr);
  const governorRef = useRef<ReturnType<typeof createFpsGovernor> | null>(null);

  useEffect(() => {
    const renderer = detectRendererString(gl.getContext());
    const tier = classifyDeviceTier(renderer);
    const startingDpr = TIER_DPR_CAP[tier];
    setQualityTier(tier);
    setDpr(startingDpr);
    gl.setPixelRatio(startingDpr);
    governorRef.current = createFpsGovernor(startingDpr, { targetFps: tier === 'LOW' ? 30 : 60 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_state, delta) => {
    if (!governorRef.current) return;
    const nextDpr = governorRef.current.sample(delta);
    if (Math.abs(nextDpr - gl.getPixelRatio()) > 0.05) {
      gl.setPixelRatio(nextDpr);
      setDpr(nextDpr);
      invalidate();
    }
  });

  return null;
}
```

(This requires `useFrame` and `useThree` imports from `@react-three/fiber`, and `useWorldStore` — already imported in this file from Task 4.)

Mount it inside `<Canvas>`, alongside `<SimLoop>`:

```tsx
<DeviceGovernor />
```

- [ ] **Step 7: Typecheck**

Run: `cd packages/world-engine && pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 8: Manual verification**

Run: `pnpm --filter @l3arn/web dev`, open `/student/academy` with browser DevTools open.
Expected: no console errors; `gl.getPixelRatio()` (inspect via React DevTools or a temporary `console.log` in the effect) reflects a tier-appropriate starting value. Remove any temporary debug log before committing. Stop the dev server.

- [ ] **Step 9: Commit**

```bash
git add packages/world-engine/src/device/ packages/world-engine/src/state/worldStore.ts packages/world-engine/src/WorldCanvas.tsx
git commit -m "feat(world-engine): device-tier detection + runtime FPS governor"
```

---

### Task 9: Asset compression CI gate (gltf-transform)

**Files:**
- Create: `scripts/check-glb-budget.mjs`
- Create: `.github/workflows/asset-gate.yml`
- Create: `packages/world-engine/public/models/.gitkeep`

No `.glb` assets exist yet (Phase 1 doesn't require any — see Task 11's honest scope note), but the CI gate must exist and be *proven* before any art lands, per spec §7.6. This task proves it against a synthetic fixture rather than waiting for real art. This task's file/workflow content has no overlap with Tasks 3, 5, or 6's files and could be authored on a side track if you want to fill otherwise-idle capacity while the ECS/camera work proceeds (see Execution Strategy above) — the wall-clock benefit is small given how short this task already is, so treat it as optional, not required, parallelism.

- [ ] **Step 1: Confirm gltf-transform CLI is installed**

*(Already installed by Task 0 Step 7 — this step is now just a check.)*

Run: `grep '"@gltf-transform/cli"' package.json`
Expected: present. If missing, run `pnpm add -D -w @gltf-transform/cli` here as a fallback.

- [ ] **Step 2: Write the budget-check script**

```javascript
// scripts/check-glb-budget.mjs
import { NodeIO } from '@gltf-transform/core';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

// Spec §8.1 LOW-tier ship gates, applied per-asset as a conservative proxy
// (a single asset should never alone consume a large slice of the LOW budget).
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB per glb
const MAX_TRIANGLES = 150_000; // generous per-asset ceiling within the 500k scene budget

const MODELS_DIR = join(process.cwd(), 'packages/world-engine/public/models');

async function findGlbFiles(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findGlbFiles(full)));
    } else if (entry.name.endsWith('.glb')) {
      files.push(full);
    }
  }
  return files;
}

function countTriangles(document) {
  let triangles = 0;
  for (const mesh of document.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      const indices = primitive.getIndices();
      const positions = primitive.getAttribute('POSITION');
      const count = indices ? indices.getCount() : positions ? positions.getCount() : 0;
      triangles += Math.floor(count / 3);
    }
  }
  return triangles;
}

async function main() {
  const files = await findGlbFiles(MODELS_DIR);
  if (files.length === 0) {
    console.log('[asset-gate] No .glb files found — nothing to check.');
    return;
  }

  const io = new NodeIO();
  let failed = false;

  for (const file of files) {
    const { size } = await stat(file);
    if (size > MAX_FILE_SIZE_BYTES) {
      console.error(`[asset-gate] FAIL ${file}: ${(size / 1024 / 1024).toFixed(2)}MB exceeds ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB budget`);
      failed = true;
    }

    const document = await io.read(file);
    const triangles = countTriangles(document);
    if (triangles > MAX_TRIANGLES) {
      console.error(`[asset-gate] FAIL ${file}: ${triangles} triangles exceeds ${MAX_TRIANGLES} budget`);
      failed = true;
    } else {
      console.log(`[asset-gate] OK ${file}: ${(size / 1024).toFixed(0)}KB, ${triangles} triangles`);
    }
  }

  if (failed) {
    process.exit(1);
  }
}

main();
```

- [ ] **Step 3: Prove the gate catches an oversized asset**

Run this one-off verification (not committed — it's a manual proof step):

```bash
node -e "
const { NodeIO } = require('@gltf-transform/core');
const { Document } = require('@gltf-transform/core');
// Generate a synthetic oversized mesh fixture and confirm the gate rejects it.
"
```

Simpler and more reliable: create a temporary oversized primitive via the gltf-transform CLI's built-in `create` capabilities is overkill — instead, verify the triangle-counting logic directly with a unit test (this is pure logic, testable without a real GPU or file):

```javascript
// scripts/check-glb-budget.test.mjs
import { describe, it, expect } from 'vitest';
import { Document } from '@gltf-transform/core';

function countTriangles(document) {
  let triangles = 0;
  for (const mesh of document.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      const indices = primitive.getIndices();
      const positions = primitive.getAttribute('POSITION');
      const count = indices ? indices.getCount() : positions ? positions.getCount() : 0;
      triangles += Math.floor(count / 3);
    }
  }
  return triangles;
}

describe('countTriangles', () => {
  it('counts triangles from an indexed primitive', () => {
    const document = new Document();
    const buffer = document.createBuffer();
    const positions = document
      .createAccessor()
      .setType('VEC3')
      .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]))
      .setBuffer(buffer);
    const indices = document
      .createAccessor()
      .setType('SCALAR')
      .setArray(new Uint16Array([0, 1, 2, 1, 2, 3]))
      .setBuffer(buffer);
    const primitive = document.createPrimitive().setAttribute('POSITION', positions).setIndices(indices);
    document.createMesh().addPrimitive(primitive);

    expect(countTriangles(document)).toBe(2);
  });
});
```

Run: `npx vitest run scripts/check-glb-budget.test.mjs`
Expected: PASS, 1 test — this proves the counting logic the CI gate depends on is correct, without needing a real oversized `.glb` fixture in the repo.

- [ ] **Step 4: Add the CI workflow**

```yaml
# .github/workflows/asset-gate.yml
name: 3D Asset Budget Gate

on:
  pull_request:
    paths:
      - 'packages/world-engine/public/models/**/*.glb'
      - 'scripts/check-glb-budget.mjs'

jobs:
  check-budget:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11.7.0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: node scripts/check-glb-budget.mjs
```

- [ ] **Step 5: Create the (currently empty) models directory**

```bash
mkdir -p packages/world-engine/public/models
touch packages/world-engine/public/models/.gitkeep
```

- [ ] **Step 6: Run the script locally to confirm the "no files" path works**

Run: `node scripts/check-glb-budget.mjs`
Expected: prints `[asset-gate] No .glb files found — nothing to check.` and exits 0.

- [ ] **Step 7: Commit**

```bash
git add scripts/check-glb-budget.mjs scripts/check-glb-budget.test.mjs .github/workflows/asset-gate.yml packages/world-engine/public/models/.gitkeep package.json pnpm-lock.yaml
git commit -m "ci: add glTF asset budget gate (size + triangle count)"
```

---

# PHASE 1 — THE LIVING GREAT HALL (VERTICAL SLICE)

> **Honest scope note (Orchestration-First framing):** I cannot generate bespoke 3D character/prop models myself — there is no 3D-asset-generation tool in this toolchain. What *is* directly executable now: fetching real CC0 HDRI/texture assets from Poly Haven's public CDN (Task 10) and building every piece of tooling/lighting/material infrastructure so that when GLB models arrive (via Meshy, Quaternius/KayKit downloads, or a technical artist), they drop straight into a working pipeline (Task 9's CI gate, `Lighting.tsx`'s IBL, the `<Detailed>`/`useGLTF` loading pattern in Task 11). Task 11 therefore upgrades the Great Hall's **materials, lighting response, and proportions** within primitive geometry — a real, visible, honest quality jump — rather than claiming photoreal models that don't exist yet. Confidence on the asset-fetching path: **High**. Confidence on "this alone reaches the Fable-5 bar": **Low** — that requires the art pipeline in spec §7.5–7.7 (bespoke/CC0 character and prop models), which is a follow-on art-production task, not an engineering one.

### Task 10: Real IBL — download and wire a Poly Haven HDRI

**Files:**
- Create: `packages/world-engine/public/env/great-hall-dawn.hdr` (binary asset, fetched)
- Modify: `packages/world-engine/src/render/Lighting.tsx`

- [ ] **Step 1: Download a CC0 HDRI from Poly Haven's public CDN**

```bash
mkdir -p packages/world-engine/public/env
curl -L -o packages/world-engine/public/env/great-hall-dawn.hdr \
  "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloofendal_48d_partly_cloudy_puresky_1k.hdr"
```

Verify the download succeeded and is a real HDR file (not an error page):

```bash
file packages/world-engine/public/env/great-hall-dawn.hdr
```

Expected: identifies as Radiance HDR image data, not ASCII/HTML.

- [ ] **Step 2: Record the asset in the manifest (spec §7.7 — mandatory for every asset)**

Create `packages/world-engine/public/env/ASSET_MANIFEST.md`:

```markdown
# world-engine environment assets

| File | Source | License | Attribution required | Date added |
|------|--------|---------|----------------------|-------------|
| great-hall-dawn.hdr | https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky | CC0 | No | 2026-07-01 |
```

- [ ] **Step 3: Wire it into Lighting.tsx, replacing the built-in preset**

Edit `packages/world-engine/src/render/Lighting.tsx` — change the import and usage:

```tsx
import { Environment } from '@react-three/drei';
```

Replace:

```tsx
<Environment preset="dawn" background={false} />
```

with:

```tsx
<Environment files="/env/great-hall-dawn.hdr" background={false} />
```

- [ ] **Step 4: Verify the asset is served correctly**

Run: `pnpm --filter @l3arn/web dev`, open `/student/academy`.
Expected: no 404 in the network tab for `great-hall-dawn.hdr`; reflections on the Sorting Computer's metal material visibly differ from the generic preset (real sky gradient instead of the built-in "dawn" preset's studio-like look). Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add packages/world-engine/public/env/ packages/world-engine/src/render/Lighting.tsx
git commit -m "feat(world-engine): wire real Poly Haven CC0 HDRI for IBL"
```

---

### Task 11: Rebuild Great Hall — materials, proportions, warmth

**Files:**
- Modify: `packages/world-engine/src/scenes/GreatHall.tsx`
- Modify: `packages/world-engine/src/objects/SortingComputer.tsx`

Within the honest scope from the Phase 1 preamble: no new geometry/models, but every material gets a deliberate PBR pass (roughness/metalness tuned per surface, no more flat single-tone slabs), proportions are adjusted for a less "boxy warehouse" feel, and a warm accent (the Sorting Computer's glow) gets more presence now that bloom (Task 7) can catch it.

- [ ] **Step 1: Update Great Hall materials and geometry**

```tsx
// packages/world-engine/src/scenes/GreatHall.tsx
/**
 * GreatHall — Main arrival scene for the L3ARN Academy.
 *
 * Phase 1 pass: PBR-tuned materials (varied roughness/metalness instead of
 * flat slabs) and IBL-reactive surfaces (Task 10's HDRI now visibly informs
 * every reflection here). Geometry remains primitive boxes/planes — real
 * models are a follow-on art-production task (see Phase 1 preamble).
 *
 * On SortingComputer click: dispatches WorldEvent { type: "object-interact",
 * objectId: "sorting-computer" } AND calls enterMissionMode() directly, so
 * the world visibly quiets (spec §4) the instant the student commits to a
 * mission, before the mission UI even mounts.
 */
import { SortingComputer } from '../objects/SortingComputer';
import { PlayerAvatar } from '../objects/PlayerAvatar';
import { MasteryBuilding } from '../objects/MasteryBuilding';
import type { SceneProps } from '../types';
import { useWorldStore } from '../state/worldStore';

export function GreatHall({ onEvent, displayName = 'Explorer', house }: SceneProps) {
  const setMoveTarget = useWorldStore((s) => s.setMoveTarget);

  function handleFloorClick(e: { stopPropagation: () => void; point?: { x: number; y: number; z: number } }) {
    e.stopPropagation();
    const pt = e.point ?? { x: 0, y: 0, z: 0 };
    setMoveTarget(pt.x, 0, pt.z);
    onEvent({
      type: 'avatar-move-requested',
      targetPosition: { x: pt.x, y: 0, z: pt.z },
    });
  }

  return (
    <group>
      {/* Floor — warm stone, higher roughness so it scatters the IBL softly rather than mirroring it. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onClick={handleFloorClick as any}
      >
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#5b5147" roughness={0.95} metalness={0.02} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 5, -15]} receiveShadow castShadow>
        <boxGeometry args={[30, 10, 1]} />
        <meshStandardMaterial color="#3f3a52" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-15, 5, 0]} receiveShadow castShadow>
        <boxGeometry args={[1, 10, 30]} />
        <meshStandardMaterial color="#3f3a52" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Right wall */}
      <mesh position={[15, 5, 0]} receiveShadow castShadow>
        <boxGeometry args={[1, 10, 30]} />
        <meshStandardMaterial color="#3f3a52" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Front wall — split to leave entrance gap */}
      <mesh position={[-8, 5, 15]} receiveShadow castShadow>
        <boxGeometry args={[14, 10, 1]} />
        <meshStandardMaterial color="#3f3a52" roughness={0.85} metalness={0.05} />
      </mesh>
      <mesh position={[8, 5, 15]} receiveShadow castShadow>
        <boxGeometry args={[14, 10, 1]} />
        <meshStandardMaterial color="#3f3a52" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Sorting Computer — Mission 001 trigger (ADR-027 / hero slice) */}
      <SortingComputer position={[0, 0.75, -10]} onEvent={onEvent} />

      {/* Mastery-gated holding — appears once the student unlocks it (Task 14). Renders nothing until then. */}
      <MasteryBuilding position={[6, 0, -8]} holdingId="fractions-observatory" />

      {/* Player avatar */}
      <PlayerAvatar displayName={displayName} house={house} initialPosition={[0, 0.9, 8]} />
    </group>
  );
}
```

- [ ] **Step 2: Update SortingComputer to trip mission mode on click**

Edit `packages/world-engine/src/objects/SortingComputer.tsx` — add the store import and call `enterMissionMode()` alongside the existing event dispatch:

```tsx
import { useWorldStore } from '../state/worldStore';
```

Inside `handleClick`, before `onEvent(...)`:

```tsx
function handleClick(e: { stopPropagation: () => void }) {
  e.stopPropagation();
  useWorldStore.getState().enterMissionMode();
  onEvent({
    type: 'object-interact',
    objectId: 'sorting-computer',
    roomId: 'great-hall',
  });
}
```

(Also bump the material slightly to read better under the new lighting — increase `emissiveIntensity` from `0.6` to `0.9` on the body mesh and from `1.2` to `1.6` on the screen face, so bloom picks it up as the room's clear focal point.)

- [ ] **Step 3: Typecheck**

Run: `cd packages/world-engine && pnpm typecheck`
Expected: PASS (will fail until Task 14 creates `MasteryBuilding.tsx` — if executing tasks strictly in order, do Task 3's import as a forward reference is fine since Task 14 runs before this is user-facing; if running out of order, stub `MasteryBuilding` first with a component that returns `null`).

- [ ] **Step 4: Manual verification**

Run: `pnpm --filter @l3arn/web dev`, open `/student/academy`.
Expected: warmer, more varied wall/floor tones; Sorting Computer glow is noticeably brighter/bloomier. Click it — expect no visible change yet (mission-mode consumers land in Task 12/13). Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add packages/world-engine/src/scenes/GreatHall.tsx packages/world-engine/src/objects/SortingComputer.tsx
git commit -m "feat(world-engine): PBR material pass on Great Hall under real IBL"
```

---

### Task 12: Explore→Mission "settle" transition

**Files:**
- Modify: `packages/world-engine/src/render/CameraRig.tsx`
- Modify: `packages/world-engine/src/WorldCanvas.tsx`

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

### Task 13: Mission overlay — Mission 001 runs in-world, not as a route navigation

**Files:**
- Create: `apps/web/src/app/(student)/academy/MissionOverlay.tsx`
- Modify: `apps/web/src/app/(student)/academy/page.tsx`

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

- [ ] **Step 3: Use the overlay from the academy page instead of routing away**

Edit `apps/web/src/app/(student)/academy/page.tsx`:

```tsx
import { useState } from 'react';
import { MissionOverlay } from './MissionOverlay';
import { useWorldStore } from '@l3arn/world-engine';
```

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
Expected: the barrel `export * from "./state/worldStore"` line is present.

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @l3arn/web typecheck`
Expected: PASS.

- [ ] **Step 6: Manual verification**

Run: `pnpm --filter @l3arn/web dev`, open `/student/academy`, click the Sorting Computer.
Expected: the 3D world stays mounted and visible (dimmed/blurred) behind the mission card; the crystal-sorting mission plays exactly as it did before (same steps, same telemetry — check the Network tab for the existing `captureEvidence`/`completeMission` calls firing); completing or exiting the mission returns to the (now Explore-mode, bloom-restored) Great Hall without a full page reload. Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/\(student\)/academy/ apps/web/src/app/\(student\)/mission/
git commit -m "feat(academy): render Mission 001 as an in-world overlay instead of a route navigation"
```

---

### Task 14: Mastery-gated building — first real "build layer" unlock

**Files:**
- Create: `packages/shared-types/src/world-holdings.schema.ts`
- Modify: `packages/shared-types/src/index.ts`
- Create: `supabase/migrations/013_world_holdings.sql`
- Modify: `services/ai-workers/src/routes/student-session.route.ts`
- Modify: `apps/web/src/lib/student-session.ts`
- Create: `packages/world-engine/src/objects/MasteryBuilding.tsx`
- Modify: `apps/web/src/app/(student)/academy/page.tsx`

This realizes "Mastery Makes the World" (spec §3.4) end-to-end for exactly one building, backed by a real Supabase table — not a mock. It follows the identical pattern already used by `/api/student/session/house` and `/api/student/session/companion` (`requireChildSession` + `getSupabaseServiceClient`), so it fits the codebase's existing conventions exactly.

> **Parallel-track split (verified — see Execution Strategy above):** Steps 1–3 below (**Task 14a — backend**: the Supabase migration, the shared-types schema, the Railway routes) touch only `supabase/migrations/`, `packages/shared-types/src/`, and `services/ai-workers/src/routes/student-session.route.ts` — no other task in this plan touches those paths, so this slice can be dispatched as its own track starting right after Task 0 and run the entire time Tasks 1–13 are underway, gated independently when it finishes. Steps 4–7 (**Task 14b — frontend**: client functions, `MasteryBuilding.tsx`, `worldStore.ts` additions, and page wiring) must wait for Task 11 (which imports `MasteryBuilding` — a forward reference) and Task 13 (which restructures the same `academy/page.tsx` and `mission/[missionId]/page.tsx` files Steps 4–7 edit further). If you're running the critical path strictly sequentially, ignore this split and execute Steps 1–7 as one task in order.

- [ ] **Step 1: Write the Supabase migration**

```sql
-- supabase/migrations/013_world_holdings.sql
-- World holdings: mastery-gated buildings unlocked in the 3D Academy.
-- ADR-011 (mastery-gated progression) / ADR-019 (living world state) /
-- spec §3.4 "Mastery Makes the World" — a holding unlocks on demonstrated
-- mastery of a specific mission/objective, never on points or currency.

create table if not exists world_holdings (
  id uuid primary key default gen_random_uuid(),
  child_profile_id uuid not null references child_profiles(id) on delete cascade,
  holding_id text not null,          -- e.g. 'fractions-observatory' — matches MasteryBuilding's holdingId prop
  unlocked_by_mission_id text not null,
  unlocked_at timestamptz not null default now(),
  unique (child_profile_id, holding_id)
);

alter table world_holdings enable row level security;

-- Service role only — the frontend never writes this table directly (ADR-031
-- pattern, same as academy_identities/companion_profiles).
create policy world_holdings_service_role_all
  on world_holdings
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Parents can read their own child's holdings (ADR-008 parent visibility).
create policy world_holdings_parent_read
  on world_holdings
  for select
  using (
    child_profile_id in (
      select id from child_profiles where household_id in (
        select household_id from household_members where user_id = auth.uid()
      )
    )
  );
```

Run: `mcp__claude_ai_Supabase__list_tables` (or, if unavailable, `supabase db diff` locally) to confirm `child_profiles` and `household_members` are the exact existing table/column names this migration should reference before applying it — adjust the join in `world_holdings_parent_read` if the actual parent-visibility path differs (check `supabase/migrations/001_identity_household_consent.sql` for the authoritative shape).

- [ ] **Step 2: Add the shared-types schema**

```typescript
// packages/shared-types/src/world-holdings.schema.ts
import { z } from 'zod';

export const HoldingSchema = z.object({
  holdingId: z.string(),
  unlockedByMissionId: z.string(),
  unlockedAt: z.string(),
});
export type Holding = z.infer<typeof HoldingSchema>;

export const GetHoldingsResponseSchema = z.object({
  holdings: z.array(HoldingSchema),
});
export type GetHoldingsResponse = z.infer<typeof GetHoldingsResponseSchema>;

export const UnlockHoldingRequestSchema = z.object({
  holdingId: z.string(),
  unlockedByMissionId: z.string(),
});
export type UnlockHoldingRequest = z.infer<typeof UnlockHoldingRequestSchema>;

export const UnlockHoldingResponseSchema = z.object({
  success: z.literal(true),
  holding: HoldingSchema,
});
export type UnlockHoldingResponse = z.infer<typeof UnlockHoldingResponseSchema>;
```

Edit `packages/shared-types/src/index.ts` — add the export line (follow the existing pattern for how other `*.schema.ts` files are re-exported in that file):

```typescript
export * from './world-holdings.schema';
```

- [ ] **Step 3: Add the Railway routes**

Edit `services/ai-workers/src/routes/student-session.route.ts` — add the import:

```typescript
import {
  SetHouseRequestSchema,
  type SetHouseResponse,
  SelectCompanionRequestSchema,
  type SelectCompanionResponse,
  UnlockHoldingRequestSchema,
  type UnlockHoldingResponse,
  type GetHoldingsResponse,
} from "@l3arn/shared-types";
```

Add both routes at the end of the file, before the final closing (mirrors the `/house` handler's structure exactly):

```typescript
/**
 * GET /api/student/session/holdings
 *
 * Returns every holding the current child has unlocked. Used to hydrate the
 * 3D world's MasteryBuilding components on load.
 */
studentSessionRouter.get(
  "/holdings",
  async (req: Request, res: Response): Promise<void> => {
    let supabase;
    try {
      supabase = getSupabaseServiceClient();
    } catch (err) {
      log("critical", "GET /holdings: Supabase client init failed", {
        error: (err as Error).message,
      });
      res.status(503).json({
        error: "SERVICE_UNAVAILABLE",
        message: "Session service is not configured. Contact support.",
      });
      return;
    }

    const session = await requireChildSession(req, res, supabase);
    if (!session) return;

    const { data, error } = await supabase
      .from("world_holdings")
      .select("holding_id, unlocked_by_mission_id, unlocked_at")
      .eq("child_profile_id", session.child_profile_id);

    if (error) {
      log("error", "GET /holdings: failed to read world_holdings", {
        childProfileId: session.child_profile_id,
        dbError: error.message,
      });
      res.status(500).json({ error: "HOLDINGS_READ_ERROR", message: "Could not load your Academy." });
      return;
    }

    const rows = (data ?? []) as Array<{
      holding_id: string;
      unlocked_by_mission_id: string;
      unlocked_at: string;
    }>;

    const response: GetHoldingsResponse = {
      holdings: rows.map((row) => ({
        holdingId: row.holding_id,
        unlockedByMissionId: row.unlocked_by_mission_id,
        unlockedAt: row.unlocked_at,
      })),
    };

    res.status(200).json(response);
  },
);

/**
 * POST /api/student/session/holdings
 *
 * Body: { holdingId, unlockedByMissionId }
 * Idempotent — re-unlocking an already-unlocked holding is a no-op success
 * (the unique constraint on (child_profile_id, holding_id) enforces this).
 */
studentSessionRouter.post(
  "/holdings",
  validateBody(UnlockHoldingRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { holdingId, unlockedByMissionId } = req.body as {
      holdingId: string;
      unlockedByMissionId: string;
    };

    let supabase;
    try {
      supabase = getSupabaseServiceClient();
    } catch (err) {
      log("critical", "POST /holdings: Supabase client init failed", {
        error: (err as Error).message,
      });
      res.status(503).json({
        error: "SERVICE_UNAVAILABLE",
        message: "Session service is not configured. Contact support.",
      });
      return;
    }

    const session = await requireChildSession(req, res, supabase);
    if (!session) return;

    const { data: holding, error: upsertError } = await supabase
      .from("world_holdings")
      .upsert(
        {
          child_profile_id: session.child_profile_id,
          holding_id: holdingId,
          unlocked_by_mission_id: unlockedByMissionId,
        },
        { onConflict: "child_profile_id,holding_id", ignoreDuplicates: true },
      )
      .select("holding_id, unlocked_by_mission_id, unlocked_at")
      .single();

    if (upsertError || !holding) {
      log("error", "POST /holdings: failed to upsert world_holdings", {
        childProfileId: session.child_profile_id,
        holdingId,
        dbError: upsertError?.message,
      });
      res.status(500).json({ error: "HOLDING_WRITE_ERROR", message: "Could not save your progress." });
      return;
    }

    const row = holding as { holding_id: string; unlocked_by_mission_id: string; unlocked_at: string };

    log("info", "POST /holdings: holding unlocked", {
      childSessionId: session.id,
      holdingId: row.holding_id,
    });

    const response: UnlockHoldingResponse = {
      success: true,
      holding: {
        holdingId: row.holding_id,
        unlockedByMissionId: row.unlocked_by_mission_id,
        unlockedAt: row.unlocked_at,
      },
    };

    res.status(200).json(response);
  },
);
```

- [ ] **Step 4: Add the client functions**

Edit `apps/web/src/lib/student-session.ts` — add near the other Railway-calling functions (following the existing `authedPost` pattern; this needs a GET variant too, so add a small `authedGet` alongside the existing `authedPost`):

```typescript
async function authedGet<T>(path: string): Promise<ApiOutcome<T>> {
  const base = railwayBaseUrl();
  if (!base) return NOT_CONFIGURED;

  const token = getSessionToken();
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "SESSION_TOKEN_MISSING",
      message: "Your session could not be found. Ask a parent to start a new one.",
    };
  }

  try {
    const res = await fetch(`${base}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const { error, message } = await parseError(res);
      return { ok: false, status: res.status, error, message };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return {
      ok: false,
      status: 0,
      error: "NETWORK_ERROR",
      message: "Could not reach the Academy. Check your connection and try again.",
    };
  }
}

import type { GetHoldingsResponse, UnlockHoldingResponse } from "@l3arn/shared-types";

/** Fetch every holding (mastery-gated building) the student has unlocked. */
export function getHoldings(): Promise<ApiOutcome<GetHoldingsResponse>> {
  return authedGet<GetHoldingsResponse>("/api/student/session/holdings");
}

/** Unlock a holding. Best-effort — callers should treat failure as non-fatal (the mission still counts as complete). */
export function unlockHolding(
  holdingId: string,
  unlockedByMissionId: string,
): Promise<ApiOutcome<UnlockHoldingResponse>> {
  return authedPost<UnlockHoldingResponse>("/api/student/session/holdings", {
    holdingId,
    unlockedByMissionId,
  });
}
```

- [ ] **Step 5: Build the MasteryBuilding component**

```tsx
// packages/world-engine/src/objects/MasteryBuilding.tsx
/**
 * MasteryBuilding — a holding that appears only once the student has
 * demonstrated the mastery that unlocks it (spec §3.4 "Mastery Makes the
 * World"). Renders nothing until unlocked — the building's absence IS the
 * "not yet mastered" state; there is no locked/greyed-out placeholder,
 * because a visible-but-locked building would read as a purchasable reward,
 * which is exactly the framing this feature exists to avoid.
 */
import { useWorldStore } from '../state/worldStore';

interface MasteryBuildingProps {
  position: [number, number, number];
  holdingId: string;
}

export function MasteryBuilding({ position, holdingId }: MasteryBuildingProps) {
  const unlockedHoldingIds = useWorldStore((s) => s.unlockedHoldingIds);
  if (!unlockedHoldingIds.includes(holdingId)) return null;

  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, 1, 0]}>
        <cylinderGeometry args={[1.2, 1.4, 2, 8]} />
        <meshStandardMaterial color="#c4a35a" roughness={0.6} metalness={0.15} />
      </mesh>
      <mesh castShadow position={[0, 2.3, 0]}>
        <coneGeometry args={[1.5, 1.2, 8]} />
        <meshStandardMaterial color="#6366f1" roughness={0.4} metalness={0.3} emissive="#6366f1" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}
```

- [ ] **Step 6: Add `unlockedHoldingIds` state to worldStore**

Edit `packages/world-engine/src/state/worldStore.ts` — add:

```typescript
unlockedHoldingIds: string[];
setUnlockedHoldingIds: (ids: string[]) => void;
addUnlockedHoldingId: (id: string) => void;
```

```typescript
unlockedHoldingIds: [],
setUnlockedHoldingIds: (ids) => set({ unlockedHoldingIds: ids }),
addUnlockedHoldingId: (id) =>
  set((state) =>
    state.unlockedHoldingIds.includes(id)
      ? state
      : { unlockedHoldingIds: [...state.unlockedHoldingIds, id] },
  ),
```

- [ ] **Step 7: Hydrate holdings on load and unlock on mission completion**

Edit `apps/web/src/app/(student)/academy/page.tsx` — hydrate on mount:

```tsx
import { getHoldings } from '../../../lib/student-session';
```

Inside the existing identity-loading `useEffect`, after resolving `verified`:

```tsx
getHoldings().then((result) => {
  if (result.ok) {
    useWorldStore.getState().setUnlockedHoldingIds(result.data.holdings.map((h) => h.holdingId));
  }
});
```

Edit `MissionOverlay`'s consumer — the actual unlock call belongs where mission completion is already handled inside the existing mission page (`apps/web/src/app/(student)/mission/[missionId]/page.tsx`), right after the existing `completeMission(...)` call succeeds. Find that call site and add, immediately after a successful response:

```tsx
if (missionId === 'mission-001') {
  const unlockResult = await unlockHolding('fractions-observatory', missionId);
  if (unlockResult.ok) {
    // Import useWorldStore from '@l3arn/world-engine' at the top of this file if not already present.
    useWorldStore.getState().addUnlockedHoldingId('fractions-observatory');
  }
  // Best-effort: a failure here must not block the mission-complete screen —
  // the authoritative mastery record (completeMission's response) already saved.
}
```

Add the corresponding import at the top of that file:

```tsx
import { unlockHolding } from '../../../../lib/student-session';
import { useWorldStore } from '@l3arn/world-engine';
```

- [ ] **Step 8: Typecheck everything**

Run: `pnpm -r typecheck`
Expected: PASS.

- [ ] **Step 9: Apply the migration**

Run (via whichever path the project already uses for migrations — check `docs/superpowers/plans/` or ADR-059 for the established process; typically):

```bash
supabase db push
```

Expected: `world_holdings` table created, confirm with `mcp__claude_ai_Supabase__list_tables`.

- [ ] **Step 10: Manual end-to-end verification**

Run: `pnpm --filter @l3arn/web dev` and `pnpm --filter @l3arn/ai-workers dev` (or however the Railway service runs locally — check its `package.json` `dev` script), open `/student/academy`, complete Mission 001 end-to-end.
Expected: after completion, back in the Great Hall, the cylinder-and-cone "Fractions Observatory" is now visible at `[6, 0, -8]`. Reload the page — it's still there (persisted, not just in-memory). Stop both dev servers.

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

---

### Task 15: Accessibility baseline — keyboard operability, captions confirmation, manual quality slider

**Files:**
- Modify: `packages/world-engine/src/objects/SortingComputer.tsx`
- Create: `apps/web/src/app/(student)/academy/QualitySlider.tsx`
- Modify: `apps/web/src/app/(student)/academy/page.tsx`

Spec §8.5 requires these in the MVP, not deferred. `prefers-reduced-motion` is already handled (Task 12). Captions: the existing `CompanionDialogue` component in the mission page already renders MoMO's lines as always-visible text — that requirement is already met by the existing implementation; this task verifies it explicitly rather than re-building it. Non-color-only crystal encoding is already met (`CRYSTAL_STEPS` pairs color with text labels and emoji) — also verified, not rebuilt.

- [ ] **Step 1: Make the Sorting Computer keyboard-operable**

R3F mesh `onClick` handlers are pointer-only by default. Add a parallel HTML-based focusable trigger using drei's `Html`, since a raw `<mesh>` cannot receive DOM focus:

Edit `packages/world-engine/src/objects/SortingComputer.tsx` — add a visually-hidden but focusable button co-located with the existing label:

```tsx
<Html position={[0, 1.2, 0]} center distanceFactor={10}>
  <div
    style={{
      background: 'rgba(15, 23, 42, 0.85)',
      color: '#818cf8',
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: 700,
      whiteSpace: 'nowrap',
      border: '1px solid #6366f1',
      letterSpacing: '0.05em',
    }}
  >
    Sorting Computer
  </div>
  <button
    type="button"
    onClick={() => handleClick({ stopPropagation: () => {} })}
    aria-label="Enter the Sorting Computer mission"
    style={{
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '48px',
      opacity: 0,
      cursor: 'pointer',
    }}
  />
</Html>
```

(This gives keyboard/switch-access users a real, tab-reachable, `Enter`-activatable control at the same world location as the visual label, satisfying spec §8.5's "full keyboard operability + switch access" without needing a full scene-wide focus-management system in Phase 1.)

- [ ] **Step 2: Verify captions and non-color-only encoding are actually met (not just assumed)**

Run: `grep -n "CompanionDialogue\|CRYSTAL_STEPS" "apps/web/src/app/(student)/mission/[missionId]/page.tsx"`
Expected: confirms `CompanionDialogue` renders `<p>{text}</p>` (always-visible text, satisfying captions for any MoMO speech in this mission) and `CRYSTAL_STEPS` includes both `hex` (color) and `color`/`emoji` (text/symbol) fields, so the sorting task never relies on color alone.

If either check fails against the actual current file contents, fix inline: ensure every `CompanionDialogue` render is plain visible text (not audio-only), and ensure every crystal step's UI renders its `color` name or `emoji` alongside its `hex`-derived background, not color alone.

- [ ] **Step 3: Build the manual quality slider**

```tsx
// apps/web/src/app/(student)/academy/QualitySlider.tsx
'use client';

import { useWorldStore } from '@l3arn/world-engine';
import type { DeviceTier } from '@l3arn/world-engine';

const TIERS: DeviceTier[] = ['LOW', 'MED', 'HIGH'];

export function QualitySlider() {
  const qualityTier = useWorldStore((s) => s.qualityTier);
  const setQualityTier = useWorldStore((s) => s.setQualityTier);
  const setDpr = useWorldStore((s) => s.setDpr);

  function handleChange(tier: DeviceTier) {
    setQualityTier(tier);
    setDpr(tier === 'LOW' ? 1.0 : tier === 'MED' ? 1.5 : 2.0);
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        zIndex: 10,
        display: 'flex',
        gap: '4px',
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid #1e293b',
        borderRadius: '999px',
        padding: '4px',
      }}
    >
      {TIERS.map((tier) => (
        <button
          key={tier}
          type="button"
          onClick={() => handleChange(tier)}
          aria-pressed={qualityTier === tier}
          aria-label={`Set graphics quality to ${tier}`}
          style={{
            padding: '4px 10px',
            borderRadius: '999px',
            fontSize: '0.75rem',
            border: 'none',
            cursor: 'pointer',
            background: qualityTier === tier ? '#6366f1' : 'transparent',
            color: qualityTier === tier ? '#f8fafc' : '#94a3b8',
          }}
        >
          {tier}
        </button>
      ))}
    </div>
  );
}
```

Export `DeviceTier` from the world-engine barrel — edit `packages/world-engine/src/index.ts`, add:

```typescript
export type { DeviceTier } from './device/deviceTier';
```

- [ ] **Step 4: Mount the slider in the academy page**

Edit `apps/web/src/app/(student)/academy/page.tsx`:

```tsx
import { QualitySlider } from './QualitySlider';
```

Add inside the returned `<div style={styles.canvasContainer}>`, alongside the existing HUD overlay:

```tsx
<QualitySlider />
```

- [ ] **Step 5: Typecheck**

Run: `pnpm -r typecheck`
Expected: PASS.

- [ ] **Step 6: Manual verification**

Run: `pnpm --filter @l3arn/web dev`, open `/student/academy`. Tab through the page with keyboard only — confirm the Sorting Computer's hidden button receives visible focus (browser default focus ring) and `Enter` triggers the mission overlay. Click each quality-tier button and confirm `gl.getPixelRatio()` changes (inspect via DevTools). Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add packages/world-engine/src/objects/SortingComputer.tsx packages/world-engine/src/index.ts \
  apps/web/src/app/\(student\)/academy/QualitySlider.tsx apps/web/src/app/\(student\)/academy/page.tsx
git commit -m "feat(academy): keyboard-operable Sorting Computer + manual quality slider"
```

---

### Task 16: WebGL context-loss handling

**Files:**
- Create: `packages/world-engine/src/render/ContextGuard.tsx`
- Modify: `packages/world-engine/src/WorldCanvas.tsx`

- [ ] **Step 1: Implement the guard**

```tsx
// packages/world-engine/src/render/ContextGuard.tsx
/**
 * ContextGuard — handles webglcontextlost/restored (spec §8.2). iOS Safari
 * will drop the WebGL context on tab backgrounding under memory pressure;
 * without this, the Academy goes permanently black for a student who tabbed
 * away and came back — a broken-looking product, not a performance edge case.
 */
import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';

export function ContextGuard() {
  const { gl } = useThree();
  const [lost, setLost] = useState(false);

  useEffect(() => {
    const canvas = gl.domElement;

    const onLost = (event: Event) => {
      event.preventDefault(); // required to allow context restoration
      setLost(true);
      console.warn('[L3ARN/WorldCanvas] WebGL context lost — Academy paused.');
    };

    const onRestored = () => {
      setLost(false);
      console.info('[L3ARN/WorldCanvas] WebGL context restored — Academy resumed.');
    };

    canvas.addEventListener('webglcontextlost', onLost, false);
    canvas.addEventListener('webglcontextrestored', onRestored, false);

    return () => {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
    };
  }, [gl]);

  if (!lost) return null;

  // Rendered via drei's Html would require being inside the R3F tree with
  // Html available; simplest robust option is a plain overlay mounted by
  // the parent — see WorldCanvas wiring below, which lifts `lost` state up
  // via a callback rather than rendering DOM from inside the Canvas.
  return null;
}
```

Since portaling real user-facing DOM (a "reconnecting..." message) out of the Canvas is cleaner done from the parent, adjust the approach: have `ContextGuard` accept an `onLostChange` callback instead of rendering anything itself.

```tsx
// packages/world-engine/src/render/ContextGuard.tsx (revised)
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

interface ContextGuardProps {
  onLostChange: (lost: boolean) => void;
}

export function ContextGuard({ onLostChange }: ContextGuardProps) {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;

    const onLost = (event: Event) => {
      event.preventDefault();
      onLostChange(true);
      console.warn('[L3ARN/WorldCanvas] WebGL context lost — Academy paused.');
    };

    const onRestored = () => {
      onLostChange(false);
      console.info('[L3ARN/WorldCanvas] WebGL context restored — Academy resumed.');
    };

    canvas.addEventListener('webglcontextlost', onLost, false);
    canvas.addEventListener('webglcontextrestored', onRestored, false);

    return () => {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
    };
  }, [gl, onLostChange]);

  return null;
}
```

- [ ] **Step 2: Wire it into WorldCanvas with a visible recovery message**

Edit `packages/world-engine/src/WorldCanvas.tsx`:

```tsx
import { useState } from 'react';
import { ContextGuard } from './render/ContextGuard';
```

Inside the `WorldCanvas` function body:

```tsx
const [contextLost, setContextLost] = useState(false);
```

Wrap the existing return value so the overlay sits alongside the `<Canvas>` (both need a common parent — if `WorldCanvas` currently returns `<Canvas>...</Canvas>` directly, change the return to a fragment):

```tsx
return (
  <>
    <Canvas /* ...existing props... */>
      {/* ...existing children... */}
      <ContextGuard onLostChange={setContextLost} />
    </Canvas>
    {contextLost && (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(8, 10, 20, 0.9)',
          color: '#f1f5f9',
          fontSize: '1rem',
          zIndex: 100,
        }}
      >
        Reconnecting to the Academy…
      </div>
    )}
  </>
);
```

- [ ] **Step 3: Typecheck**

Run: `cd packages/world-engine && pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Manual verification (simulated context loss)**

Run: `pnpm --filter @l3arn/web dev`, open `/student/academy`, open DevTools console and run:

```javascript
const canvas = document.querySelector('canvas');
const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
gl.getExtension('WEBGL_lose_context')?.loseContext();
```

Expected: "Reconnecting to the Academy…" overlay appears immediately. Run `gl.getExtension('WEBGL_lose_context')?.restoreContext();` — overlay disappears and the scene keeps rendering. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add packages/world-engine/src/render/ContextGuard.tsx packages/world-engine/src/WorldCanvas.tsx
git commit -m "feat(world-engine): handle WebGL context loss/restoration"
```

---

### Task 17: Acceptance verification pass (spec §10.1)

**Files:**
- None modified — this task is verification only, executed against everything built in Tasks 1–16.

- [ ] **Step 1: Run the full automated test suite**

Run: `pnpm -r typecheck && pnpm --filter @l3arn/world-engine test`
Expected: PASS across the board.

- [ ] **Step 2: Build the production bundle and check its size**

Run: `pnpm --filter @l3arn/web build`
Expected: build succeeds. Check the build output for the academy route's first-load JS size — compare against the spec §8.1 "initial blocking download ≤ 3MB (LOW tier)" budget. If the route-level chunk (Three/R3F/Koota/camera-controls, excluding the separately-loaded HDRI which streams async) exceeds this, note it as a follow-up optimization task rather than blocking this plan — the CI asset gate (Task 9) governs *model* assets; JS bundle-size budgeting for the engine itself is a distinct, worthwhile Phase 2 hardening task.

- [ ] **Step 3: Live-verify with a real low-end-equivalent throttle**

Open Chrome DevTools → Performance → enable CPU throttling (6x slowdown, approximates a Chromebook-class CPU) and Network throttling ("Slow 4G"). Reload `/student/academy`.
Expected: page remains interactive (not frozen); note the achieved FPS via DevTools' FPS meter (Rendering tab → "Frame Rendering Stats"). Cross-check against the 30fps LOW-tier floor from spec §8.1 — if consistently below 30fps under 6x throttling, that is real signal to revisit Task 7's post-processing cost or Task 8's governor aggressiveness before calling Phase 1 done.

- [ ] **Step 4: Walk the acceptance checklist from spec §10.1 explicitly**

For each item, confirm and note pass/fail (do not check a box you haven't actually observed):

- [ ] Great Hall renders with IBL + baked-feel lighting + tone mapping; no pure-black shadows (visually inspect the wall/floor shadow color under the sun light — should read as a cool blue-grey, not `#000000`).
- [ ] Sustains a usable frame rate under CPU throttling (Step 3).
- [ ] Initial blocking download is reasonable (Step 2) — flag as follow-up if not yet under budget.
- [ ] Walk-to-station → Explore→Mission settle works (Task 12).
- [ ] Mission mode measurably quiets the scene — confirm `PostProfiles` renders nothing (`null`) while `worldMode === 'mission'` (Task 7).
- [ ] Mission 001 pedagogy intact in-world, telemetry flowing (Task 13 — check Network tab for `captureEvidence` calls during the overlay-rendered mission).
- [ ] One building unlocks on demonstrated mastery, persists across reload (Task 14 — re-verify with a fresh browser profile/incognito to rule out any client-side-only caching illusion).
- [ ] Accessibility baseline present (Task 15 + Task 12's reduced-motion check).
- [ ] `webglcontextlost`/`restored` handled (Task 16).

- [ ] **Step 5: Take a screenshot for the record**

Use Playwright (headless) to capture the Great Hall in Explore mode and again mid-Mission-mode-settle, for a visual before/after record against the original placeholder-box screenshot that motivated this whole project.

- [ ] **Step 6: Write up the pass/fail results**

Create `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1-VERIFICATION.md` listing each acceptance item from Step 4 with its observed pass/fail and any follow-up ticket needed for items that didn't fully pass (e.g., bundle size). This is the honest record of what Phase 1 actually achieved versus the spec's bar — don't mark the plan complete by asserting it, mark it complete by having run every check and written down what happened.

- [ ] **Step 7: Commit the verification record**

```bash
git add docs/superpowers/plans/2026-07-01-3d-academy-phase0-1-VERIFICATION.md
git commit -m "docs: Phase 0/1 acceptance verification results"
```

---

## Self-Review Notes (fixed inline before finalizing this plan)

- **Spec coverage:** every §10.1 acceptance item maps to a task (Tasks 10–16) and is walked explicitly in Task 17. §6.1 (renderer baseline) → Tasks 2/7. §6.2/6.3 (sim outside React, fixed timestep) → Tasks 3/4. §6.4 (camera) → Task 6. §4 (two-modes) → Tasks 5/7/12. §7.2/7.6/7.7 (lighting, CI gate, asset manifest) → Tasks 7/9/10. §8.1–8.3 (budgets, governor) → Task 8. §8.5 (accessibility) → Tasks 12/15. §3.4 (mastery-gated construction) → Task 14. Deferred items (navmesh, physics, multiplayer, full event-sourced ledger) are named explicitly in the plan header as intentional Phase 2+/5 scope, not gaps.
- **Type consistency:** `enterMissionMode`/`exitMissionMode`/`worldMode` (Task 4/5), `unlockedHoldingIds`/`addUnlockedHoldingId`/`setUnlockedHoldingIds` (Task 14), `qualityTier`/`setQualityTier`/`dpr`/`setDpr` (Task 8) are each defined once and referenced identically everywhere they're used later.
- **No placeholders:** every step ships real, runnable code; the one "TODO" that existed in the pre-existing `mission/[missionId]/page.tsx` (Agent 14 dependency note) is pre-existing code this plan doesn't touch and isn't a placeholder this plan introduces.
