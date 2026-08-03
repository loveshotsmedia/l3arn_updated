# Handoff: L3ARN 3D Academy — Task 8 (Device tier detection + FPS governor + manual quality control)

**You are a fresh Claude Code agent with no memory of prior conversations. This document is self-contained — everything you need is here or linked from here. Read this whole document before touching any code.**

---

## 0. Read this first: the one rule that matters most

**Verify, don't trust.** This has already paid off three times on this project:

1. A prior session built hours of work on a stale, locally-cached copy of `main` that didn't match GitHub (the repo had been restructured and the local checkout never picked it up). The fix required a careful git rebase and byte-for-byte content verification to recover.
2. Task 6's plan snippet used raw numeric `ACTION` values copied from `camera-controls` v2, which are **wrong** in the installed v3 (the bit-flags shifted). The executing agent caught it only because it checked the installed package's `.d.ts` before trusting the snippet.
3. Task 7's plan snippet was correct, but manual browser verification surfaced a real runtime problem the plan text couldn't have anticipated: `<N8AO>` triggers a per-frame WebGL warning (`glBlitFramebuffer: Read and write depth stencil attachments cannot be the same image`), traced to a documented upstream architectural bug in `pmndrs/postprocessing` (not fixable by any prop change, not fixed in any published stable release — only in the not-yet-stable v7 rewrite). It was disclosed in the PR rather than silently shipped or silently patched around. See §2 below — it is **still unresolved** and Task 8 does **not** touch it (Task 8's scope is DPR/quality-tier state, not which post-processing passes run).

**Before you write a single line of code**, run:
```bash
git fetch origin main
git log HEAD..origin/main --oneline
```
If that second command prints anything, **stop and investigate before proceeding** — your branch is behind `main` and you need to understand why before building on top of it. If you're following the setup instructions in §2 exactly (branching fresh from `origin/main`), this should be empty, but check anyway. Do not assume; verify.

When a plan snippet hard-codes values or API shapes from a third-party library, verify them against the installed `node_modules/<pkg>/.../*.d.ts` before trusting them (Task 6's lesson). When a plan snippet is *type-correct* but describes runtime behavior of a third-party rendering/effects library, don't assume type-correctness implies bug-free behavior — verify by actually running it in the browser and reading the console (Task 7's lesson).

---

## 1. What L3ARN is and what this work is

L3ARN is a parent-led + student-driven learning platform. Students explore a browser-based 3D "Academy" world, guided by an AI companion, undertaking learning missions. The current 3D world (`packages/world-engine`) is a primitive, untextured placeholder — the long-term vision (a "premium-stylized" world comparable to a well-produced browser game) is documented in:

- **Spec:** `docs/superpowers/specs/2026-06-30-3d-academy-world-design.md` — the full design vision, research-grounded, covering rendering, art pipeline, performance, architecture, and educational design.
- **Plan:** `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` — the actionable, task-by-task implementation plan for Phase 0 (Foundation) and Phase 1 (a vertical-slice "Living Great Hall" room). **This is your primary reference document — read it in full before starting, especially the "Execution Strategy" section near the top (dependency graph, gate protocol) and Task 8's full text (also reproduced in §4 below for convenience, but the live file is authoritative if the two ever disagree).**

You do not need to read the 5 research reports under `docs/superpowers/research/3d-world/` unless something in the plan references them and you need more depth — they're background, not required reading for Task 8.

---

## 2. Exact current state — start here

**Task 0** (dependency bootstrap) is done, reviewed, merged into `main` via PR #6.

**Tasks 1 and 2** are no-ops — fully absorbed into Task 0. Do not try to "do" them.

**Task 3** (ECS core) merged via PR #7 (`104afa5`).

**Task 4** (SimLoop) merged via PR #8 (squash commit `a9d850f`).

**Task 5** (Two-modes law — mission-mode controller + worldStore enforcement) merged via PR #9 (squash commit `f763851`).

**Task 6** (Camera — Sims-style constrained rig via camera-controls) merged via PR #10 (squash commit `a48983a`).

**Task 7** (Lighting & post-processing — IBL, sun, tone mapping, explore/quiet profiles) is **merged via PR #11 (squash commit `8a0af30`)**. It added `packages/world-engine/src/render/Lighting.tsx` (IBL environment map + shadow-casting sun + fill light + ACES filmic tone mapping) and `packages/world-engine/src/render/PostProfiles.tsx` (Explore mode: `EffectComposer` with N8AO + Bloom; Mission mode: no composer at all), and wired both into `WorldCanvas.tsx` in place of the old manual ambient/directional lights.

**Known open issue carried forward from Task 7 (unresolved, not in Task 8's scope):** `<N8AO>` inside `PostProfiles.tsx`'s `EffectComposer` spams a WebGL console warning every frame (`GL_INVALID_OPERATION: glBlitFramebuffer: Read and write depth stencil attachments cannot be the same image`). This was investigated end-to-end in Task 7's PR (#11) and confirmed to be a documented upstream `pmndrs/postprocessing` architectural bug — not caused by our config (reproduces at any `multisampling` value, `stencilBuffer` prop doesn't help), not fixable via a version bump (`postprocessing@6.39.2`, `n8ao@1.10.2`, `@react-three/postprocessing@3.0.4` are each already the latest published *stable* release; the fix is only in the not-yet-stable v7 rewrite). No visual defect — AO/bloom render correctly. **Task 8 does not touch `PostProfiles.tsx`** (its file list is `deviceTier.ts`/`.test.ts`, `worldStore.ts`, `WorldCanvas.tsx` only) — do not assume Task 8 resolves this. If you want to fold quality-tier gating of post-processing effects into scope, that's a deliberate scope decision to raise with the project owner, not something to do silently.

**The next task is Task 8** (Device tier detection + FPS governor + manual quality control). Its key assumptions were verified directly against the real merged `main` (`8a0af30`) — not assumed from the plan:

- `WorldCanvas.tsx` currently renders, inside `<Canvas shadows camera={{...}}>`: `<Lighting />`, `<SimLoop world={world} />`, `<CameraRig />`, `<PostProfiles />`, then the `<Suspense>`-wrapped `<SceneLoader>`. No `frameloop` prop is set on `<Canvas>`, so it defaults to R3F's `"always"` mode — Step 6's `invalidate()` calls in the plan snippet are safe no-ops in this mode (they only matter under `frameloop="demand"`), not a bug to fix.
- `worldStore.ts` (`WorldState` interface + store body) has **no** `qualityTier`/`dpr`/`setQualityTier`/`setDpr` fields yet — confirmed absent. Step 5's additions are genuinely new, not a duplicate of existing state.
- `vitest.config.ts` for `world-engine`: `environment: 'node'`, `include: ['src/**/*.test.ts']`. The new `deviceTier.test.ts` (Step 1) only exercises `classifyDeviceTier` — pure string-matching logic, no DOM/WebGL needed — fully compatible with the `node` test environment. (`detectRendererString`, which does touch a `WebGLRenderingContext`, is not unit-tested — consistent with this suite's existing design of verifying rendering live via Playwright, not in vitest.)
- Library API shapes in the plan snippet verified against installed packages (Task 6 ACTION-enum discipline applied): `WebGLRenderer.getPixelRatio(): number` and `setPixelRatio(value: number): void` are present in the installed `@types/three@0.171.0` (`src/renderers/WebGLRenderer.d.ts`). `RootState.invalidate: (frames?: number) => void` is present in installed `@react-three/fiber@9.6.1` (`dist/declarations/src/core/store.d.ts`), confirming `useThree()`'s destructured `{ gl, invalidate }` is valid. `WebGLRenderer.getContext(): WebGLRenderingContext | WebGL2RenderingContext` matches `detectRendererString`'s parameter type exactly. **No mismatches found** — unlike Task 6, this task's snippets check out cleanly against the installed toolchain. (Still worth a final glance at the installed `.d.ts` files yourself before leaning on this — package versions can drift between when this was written and when you execute.)

### Your branch and worktree

A branch has already been created for you: **`feature/3d-academy-task-8`**, pushed to `origin`, branched fresh from the current tip of `origin/main` (`8a0af30`, which includes Tasks 0, 3, 4, 5, 6, and 7). It has zero commits beyond `main` other than (once committed) this handoff document — you're starting from a clean, verified baseline.

A worktree already exists checked out to this branch at:
```
E:\L3ARN\L3arn_repo\.worktrees\task-8
```

**Use this exact worktree. Do not create a new one.** Other worktrees exist in this repo — leave them all alone, they are unrelated to your task:
- `E:\L3ARN\L3arn_repo\.worktrees\task-4`, `...\task-5`, `...\task-6`, `...\task-7` — merged task branches; historical, not needed for Task 8.
- `E:\L3ARN\L3arn_repo\.worktrees\rebase-attempt-phase0-1` — sits on `main` (reused repeatedly for post-merge verification); not needed for Task 8.
- `E:\L3ARN\L3arn_repo\.worktrees\track-a-holdings-backend` — unrelated, separate work.

Also do not work in `E:\L3ARN\L3arn_repo` directly — that's a different checkout, on a different, unrelated branch (`docs/3d-academy-world-spec`).

### Verify your starting point before doing anything else

```bash
cd "E:\L3ARN\L3arn_repo\.worktrees\task-8"
git status                          # should show branch feature/3d-academy-task-8, clean
git log --oneline -3                # top commit should be "3D Academy Task 7: Lighting & post-processing (IBL + explore/quiet profiles) (#11)" or a later docs commit on this branch
git fetch origin main
git log HEAD..origin/main --oneline # MUST be empty — if not, stop and investigate
pnpm install
pnpm --filter @l3arn/shared-types build
pnpm --filter @l3arn/safety build
pnpm --filter @l3arn/mission-compiler build
pnpm -r typecheck                   # MUST pass clean across all 7 packages before you start
```

The three `pnpm --filter ... build` commands are needed because `packages/shared-types`, `packages/safety`, and `packages/mission-compiler` publish via a `dist/` folder that isn't committed to git — other packages resolve them via workspace linking against that build output, so it has to exist locally before typecheck will pass. This is a one-time thing per fresh worktree, not something you need to repeat per commit.

This exact sequence was run in this worktree (and, separately, in the `rebase-attempt-phase0-1` worktree fast-forwarded to the same `main` tip) moments before this document was written and confirmed clean both times: all 7 packages report `Done`, zero errors; `world-engine`'s test suite passes 12/12; `pnpm --filter @l3arn/web build` passes with exit 0 and the full 21-route table. If `pnpm -r typecheck` does not pass cleanly for you at this starting point, **stop and report back rather than building on top of a broken baseline** — something changed between then and now and needs investigating.

---

## 3. The gate protocol (non-negotiable — this is how the project owner wants to work)

1. **Implement Task 8 completely** (see §4).
2. **Verify**: run the exact typecheck and test commands the task specifies, and confirm they pass. Don't just claim they pass — show the actual output. **This task also has a manual-browser verification step (§4 Step 8) — do not skip it.**
3. **Commit** using the message the task specifies.
4. **Push** your branch: `git push origin feature/3d-academy-task-8`
5. **Open a PR** against `main`:
   ```bash
   gh pr create --title "3D Academy Task 8: Device tier detection + FPS governor + manual quality control" --base main --head feature/3d-academy-task-8 --body "..."
   ```
   Write a real PR body: what this adds, why (one or two sentences — this adds boot-time GPU-tier classification and a runtime FPS governor so rendering quality degrades gracefully on weak/thermal-throttling devices instead of staying pinned to a budget it can't hit, per spec §8.1/8.3), and a test-plan checklist mirroring what you verified in step 2 (including the manual browser check). If you have a view on the Task 7 N8AO issue (§2) — e.g. whether Task 8's new `qualityTier` state should eventually gate post-processing — say so explicitly as a follow-up note; do not silently fold it into this PR's diff without flagging it, since it's outside this task's stated file list.
6. **Stop.** Do not merge the PR yourself. Do not start Task 9. Do not do anything else. The project owner will review, merge, and run their own post-merge verification. Report back to them (in your final message) that the PR is open, give them the URL, and stop.

**Why this matters:** the project owner has explicitly asked for a tight, one-task-at-a-time loop with a real PR and a real merge at every step — not a big batch of work landing all at once. Respect that even if it feels like you could "just keep going." Stopping here is the correct, complete outcome for this session, not a failure to finish.

---

## 4. Task 8: Device tier detection + FPS governor + manual quality control

*(This is the full, verbatim task text from `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` (lines 1427–1649 as of this writing). If you find any discrepancy between this copy and the live file, the live file wins — but there shouldn't be one.)*

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

*(Handoff-writer's notes, not part of the verbatim task text:*

*(1) Step 8's "no console errors" bar is the same one Task 7 hit: the pre-existing favicon 404 is fine (that's a request error, not a console.error from our code), but the N8AO `glBlitFramebuffer` warning from §2's known issue is a WARNING, not an ERROR — Chrome's console panel and Playwright's `browser_console_messages` tool both bucket it separately. Don't be alarmed if it's still present; it's pre-existing and out of scope for this task (see §2). If your dev-server port 3000 is busy, `next dev` picks another port automatically — read the terminal output for the real URL rather than assuming 3000, same as Task 7.*

*(2) The manual verification step asks you to inspect `gl.getPixelRatio()` via a temporary debug log or React DevTools. A quick way that doesn't require touching component code: after the page loads, use the browser devtools console directly (or Playwright's `browser_evaluate`) — but note `gl`/the renderer instance isn't on `window` by default, so the temporary-`console.log`-in-the-effect approach the task describes is the more reliable path. Remember to actually remove it before Step 9's commit, per the task text.*

*(3) This task, unlike Task 7, does not touch `Lighting.tsx` or `PostProfiles.tsx` at all. Do not use this task as an opportunity to "fix" the Task 7 N8AO issue (§2) unless you explicitly flag that scope expansion to the project owner first — the task's own file list is authoritative.)*

---

## 5. After Step 9 — before you open the PR

Run the full workspace typecheck one more time to make sure nothing else broke:

```bash
pnpm -r typecheck
```

Also run the whole `world-engine` test suite to make sure nothing regressed:

```bash
cd packages/world-engine && pnpm test
```

Expected: 16 tests total pass — the 12 from the pre-Task-8 baseline (2 `world.test.ts` + 4 `clock.test.ts` + 3 `movement.test.ts` + 3 `missionMode.test.ts`) plus the 4 new `deviceTier.test.ts` tests from Step 1.

**Do not skip the manual browser verification from §4 Step 8.** Unlike Task 7, this task has no dramatic visual delta to screenshot (DPR changes are usually subtle/imperceptible at a glance) — the verification bar here is functional correctness (tier classification fires once at boot, no console errors) rather than a visual before/after. Confirm it via the temporary debug log the task describes, then remove the log and stop the dev server.

Then follow §3, steps 4–6: push, open the PR, stop.

---

## 6. What happens next (for whoever picks this up after the PR merges)

Once the project owner merges this PR and confirms the post-merge verification (`pnpm -r typecheck`, the world-engine test suite, and `pnpm --filter @l3arn/web build` passing on the updated `main`) is good, **the next step is Task 9 (Asset compression CI gate — gltf-transform)**.

Whoever does that — write a new handoff document at `docs/superpowers/plans/handoffs/<date>-handoff-task-9.md`, following the exact structure of this document:
- §0: the "verify, don't trust" reminder (keep it — it's paid off three times now; add a fourth bullet if Task 8 surfaces its own lesson)
- §1: project context (can be copied verbatim from this doc, it doesn't change task-to-task)
- §2: exact current state — **this section must be freshly verified, not copied**: confirm what's actually on `main` now (`git log origin/main --oneline -5`), create a fresh branch (`feature/3d-academy-task-9`) from the current `origin/main` tip, set up a worktree or reuse an existing clean one, and run the same verification sequence (`pnpm install` + the three package builds + `pnpm -r typecheck` + the world-engine test suite) to confirm the starting point is healthy before handing off. Also re-check the status of the Task 7 N8AO known issue (§2 of this doc) — has it been triaged/fixed/explicitly accepted since this was written? Don't let it silently go stale across handoffs.
- §3: the gate protocol (copy verbatim — it doesn't change)
- §4: Task 9's full verbatim text, pulled fresh from `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` (search for `### Task 9:`) — don't hand-transcribe from memory, copy it exactly, since the plan file is the source of truth and may have been touched by review feedback since this document was written
- §5: any task-specific post-implementation verification the task calls for
- §6: this same "what happens next" section, updated to point at Task 10

This pattern (verify fresh state → fresh branch → full task text → implement → PR → stop) repeats for every task through Task 17. Do not skip the "freshly verify, don't copy" step in §2 — that exact mistake (trusting stale local state instead of re-checking `origin/main`) is what caused the multi-hour git archaeology this document's §0 warns about.
