# Handoff: L3ARN 3D Academy — Task 7 (Lighting & post-processing — IBL, sun, tone mapping, explore/quiet profiles)

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

A second instance of the same rule paid off in Task 6: the plan doc's code snippet used raw numeric `ACTION` values copied from camera-controls v2, which are **wrong** in the installed v3 (the bit-flags shifted). The executing agent caught it only because it checked the installed package's `.d.ts` before trusting the snippet. When a plan snippet hard-codes values from a third-party library, verify them against `node_modules/<pkg>/dist/*.d.ts` before using them.

---

## 1. What L3ARN is and what this work is

L3ARN is a parent-led + student-driven learning platform. Students explore a browser-based 3D "Academy" world, guided by an AI companion, undertaking learning missions. The current 3D world (`packages/world-engine`) is a primitive, untextured placeholder — the long-term vision (a "premium-stylized" world comparable to a well-produced browser game) is documented in:

- **Spec:** `docs/superpowers/specs/2026-06-30-3d-academy-world-design.md` — the full design vision, research-grounded, covering rendering, art pipeline, performance, architecture, and educational design.
- **Plan:** `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` — the actionable, task-by-task implementation plan for Phase 0 (Foundation) and Phase 1 (a vertical-slice "Living Great Hall" room). **This is your primary reference document — read it in full before starting, especially the "Execution Strategy" section near the top (dependency graph, gate protocol) and Task 7's full text (also reproduced in §4 below for convenience, but the live file is authoritative if the two ever disagree).**

You do not need to read the 5 research reports under `docs/superpowers/research/3d-world/` unless something in the plan references them and you need more depth — they're background, not required reading for Task 7.

---

## 2. Exact current state — start here

**Task 0** (the dependency bootstrap — React 18→19, Next 14→15, R3F v8→v9, Koota ECS, camera-controls, vitest, postprocessing, etc.) **is done, reviewed, and merged into `main`** via PR #6.

**Tasks 1 and 2** (as numbered in the plan) are no-ops — fully absorbed into Task 0 during planning. Do not try to "do" them.

**Task 3** (ECS core: `packages/world-engine/src/core/world.ts` + `clock.ts`) is merged via PR #7 (`104afa5`).

**Task 4** (SimLoop — single `useFrame` driving the ECS, avatar movement migrated off per-frame `setState`) is merged via PR #8 (squash commit `a9d850f`).

**Task 5** (Two-modes law — mission-mode controller + worldStore enforcement wiring) is merged via PR #9 (squash commit `f763851`). Added `systems/missionMode.ts` (`createMissionModeController`) and wired it into `worldStore.ts`'s `enterMissionMode`/`exitMissionMode` actions.

**Task 6** (Camera — Sims-style constrained rig via camera-controls) is **merged via PR #10 (squash commit `a48983a`)**. It added `packages/world-engine/src/render/CameraRig.tsx` and swapped it into `WorldCanvas.tsx`, replacing the old `<OrbitControls>` block. Post-merge verification was run on the updated `main` and confirmed clean: `pnpm -r typecheck` 7/7 packages `Done`, world-engine tests 12/12, **and** (because Task 7's Step 5 uses it for the first time) a baseline `pnpm --filter @l3arn/web build` — passed, exit 0, full route table emitted. One deviation from the plan's snippet is baked into the merged CameraRig and matters as precedent: `camera-controls@3.1.2`'s `ACTION` bit-flags shifted in v3, so CameraRig uses the typed enum (`ACTION.NONE` for left/right, `ACTION.DOLLY` for wheel), not the plan's raw numbers.

**The next task is Task 7** (Lighting & post-processing). Its key assumptions were verified directly against the real merged `main` (not assumed from the plan):

- `WorldCanvas.tsx` currently renders: one `<ambientLight intensity={0.4} />`, a shadow-casting key `<directionalLight position={[10, 20, 10]} intensity={1.2} ...>`, a fill `<directionalLight position={[-5, 10, -5]} intensity={0.3} />`, plus `<SimLoop>`, `<CameraRig />`, and the `<Suspense>`-wrapped scene loader. Step 3's "remove the existing manual ambient/directional light JSX" refers to those three light elements — nothing else in the canvas moves. (The new `Lighting.tsx` deliberately uses different intensities — ambient 0.25, key 1.4, fill 0.25 — that's the task's intent, not a transcription error.)
- `worldStore.ts` exposes `worldMode: 'explore' | 'mission'` — exactly the selector `PostProfiles` uses (`useWorldStore((s) => s.worldMode)`). Verified present in the merged file.
- **Corrected assumption from the Task 6 handoff:** that doc's §6 speculated Task 7 would give `missionMode.ts`'s empty `onEnterMission`/`onExitMission` callbacks real bodies. **It does not** — verified against both the real Task 7 plan text and the merged code. `PostProfiles` subscribes to `worldMode` reactively via the Zustand store; the controller's callbacks stay empty. The merged `worldStore.ts` (lines 42–51) documents this on purpose: the controller exists to guarantee exactly-once enter/exit firing for *future* systems that need an imperative hook (e.g. companion animation damping), not for the post-profile swap. Do not "fix" the empty callbacks in this task.
- Dependencies: `packages/world-engine/package.json` already lists `@react-three/postprocessing: ^3.0.0` **and** `postprocessing: ^6.39.2` **and** `@react-three/drei: ^10.0.0` (all from Task 0). No `package.json` edit should be needed. Note the plan's Step 4 text says to expect `postprocessing@^6.36.0` — the actual installed spec is `^6.39.2`, which satisfies the same peer requirement; don't be alarmed by the mismatch and don't downgrade.
- The installed `@react-three/postprocessing` re-exports `N8AO` (confirmed in its `dist/index.d.ts`: `export * from './effects/N8AO'`), and `dawn` is a valid drei `<Environment>` preset (confirmed in drei's `environment-assets.d.ts`).
- Heads-up for Step 6 (manual verification): drei's `<Environment preset="dawn">` **fetches an HDRI over the network at runtime** — the browser needs internet access, and the first load may take a moment. Also two quirks of `/student/academy` observed during Task 6's verification, both pre-existing and NOT bugs to fix in this task: (1) the page renders the 3D canvas as a short strip at the top of the viewport (~150px tall at 1280×720) — that's page layout, not a rendering regression; (2) in dev mode the page works without auth (falls back to an "Explorer" identity), so you can open it directly. If port 3000 is busy, `next dev` picks another port — read the dev-server output for the real URL instead of assuming 3000.

### Your branch and worktree

A branch has already been created for you: **`feature/3d-academy-task-7`**, pushed to `origin`, branched fresh from the current tip of `origin/main` (`a48983a`, which includes Tasks 0, 3, 4, 5, and 6). It has zero commits beyond `main` other than (once committed) this handoff document — you're starting from a clean, verified baseline.

A worktree already exists checked out to this branch at:
```
E:\L3ARN\L3arn_repo\.worktrees\task-7
```

**Use this exact worktree. Do not create a new one.** Other worktrees exist in this repo — leave them all alone, they are unrelated to your task:
- `E:\L3ARN\L3arn_repo\.worktrees\task-4`, `...\task-5`, `...\task-6` — merged task branches; historical, not needed for Task 7.
- `E:\L3ARN\L3arn_repo\.worktrees\rebase-attempt-phase0-1` — sits on `main` (reused repeatedly for post-merge verification); not needed for Task 7.
- `E:\L3ARN\L3arn_repo\.worktrees\track-a-holdings-backend` — unrelated, separate work.

Also do not work in `E:\L3ARN\L3arn_repo` directly — that's a different checkout, on a different, unrelated branch (`docs/3d-academy-world-spec`).

### Verify your starting point before doing anything else

```bash
cd "E:\L3ARN\L3arn_repo\.worktrees\task-7"
git status                          # should show branch feature/3d-academy-task-7, clean
git log --oneline -3                # top commit should be "3D Academy Task 6: Sims-style CameraRig (camera-controls) (#10)" or a later docs commit on this branch
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

1. **Implement Task 7 completely** (see §4).
2. **Verify**: run the exact typecheck and build commands the task specifies, and confirm they pass. Don't just claim they pass — show the actual output. **This task also has a manual-browser verification step (§4 Step 6) — do not skip it.**
3. **Commit** using the message the task specifies.
4. **Push** your branch: `git push origin feature/3d-academy-task-7`
5. **Open a PR** against `main`:
   ```bash
   gh pr create --title "3D Academy Task 7: Lighting & post-processing (IBL + explore/quiet profiles)" --base main --head feature/3d-academy-task-7 --body "..."
   ```
   Write a real PR body: what this adds, why (one or two sentences — this replaces the placeholder three-light rig with the spec §7.2 lighting model and implements the visual half of the two-modes law: full stylized look in Explore, stripped-back output in Mission per Mayer's Coherence Principle), and a test-plan checklist mirroring what you verified in step 2 (including the manual browser check).
6. **Stop.** Do not merge the PR yourself. Do not start Task 8. Do not do anything else. The project owner will review, merge, and run their own post-merge verification. Report back to them (in your final message) that the PR is open, give them the URL, and stop.

**Why this matters:** the project owner has explicitly asked for a tight, one-task-at-a-time loop with a real PR and a real merge at every step — not a big batch of work landing all at once. Respect that even if it feels like you could "just keep going." Stopping here is the correct, complete outcome for this session, not a failure to finish.

---

## 4. Task 7: Lighting & post-processing — IBL, CSM sun, tone mapping, explore/quiet profiles

*(This is the full, verbatim task text from `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` (lines 1288–1423 as of this writing). If you find any discrepancy between this copy and the live file, the live file wins — but there shouldn't be one.)*

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

*(Handoff-writer's notes, not part of the verbatim task text:*

*(1) Step 4's expected version string (`^6.36.0`) is stale — the real `packages/world-engine/package.json` already has `postprocessing: ^6.39.2` (verified). The check passes on intent (the dep is present); do not change the version.*

*(2) Step 7's `git add` includes `packages/world-engine/package.json`, but per note (1) no package.json change should be needed — adding an unchanged file to the index is a harmless no-op, so you can run the command as written either way.*

*(3) `WorldCanvas.tsx`'s header doc comment currently says "Lighting: ambient + directional (three-point lighting placeholder)." — update that line to reflect the new `Lighting` rig when you do Step 3, matching the precedent Task 6 set (it updated the same comment block for the camera swap).*

*(4) The old fill light in WorldCanvas is `intensity={0.3}` and the key is `intensity={1.2}`; the new `Lighting.tsx` uses 0.25/1.4 plus `shadow-bias` — those differences are the task's intent (retuned for IBL), not drift to reconcile.*

*(5) This task has no automated test file of its own — Step 5's typecheck + web build plus Step 6's manual browser check are the full verification. Running the world-engine suite (`pnpm test`, expect 12/12 unchanged) before opening the PR is cheap insurance, matching Tasks 3–6's pattern.*

*(6) If typecheck stumbles on the effect components (JSX types for `N8AO`/`Bloom` under React 19), check the installed `@react-three/postprocessing` `dist/index.d.ts` for the real export shapes before changing any code — same "verify against the installed package" discipline that caught the Task 6 ACTION-enum problem.)*

---

## 5. After Step 7 — before you open the PR

Run the full workspace typecheck one more time to make sure nothing else broke:

```bash
pnpm -r typecheck
```

Also run the whole `world-engine` test suite to make sure nothing regressed — the Task 3/4/5 suites should still be green (Task 7 adds no new automated tests):

```bash
cd packages/world-engine && pnpm test
```

Expected: 12 tests total pass, unchanged from the pre-Task-7 baseline (2 from `world.test.ts` + 4 from `clock.test.ts` + 3 from `movement.test.ts` + 3 from `missionMode.test.ts`).

**Do not skip the manual browser verification from §4 Step 6** — this is a visual task; the typecheck and build passing proves almost nothing about whether the lighting actually looks right. Confirm the scene is visibly richer (IBL reflections, bloom on the emissive sorting-computer screen, softer shadows), then stop the dev server before moving on. A screenshot comparison against the pre-change look is the strongest evidence you can put in the PR (Task 6's session archived its "before" screenshots; a fresh screenshot of `main`'s look before you start is cheap to take and makes the diff undeniable).

Then follow §3, steps 4–6: push, open the PR, stop.

---

## 6. What happens next (for whoever picks this up after the PR merges)

Once the project owner merges this PR and confirms the post-merge verification (`pnpm -r typecheck`, the world-engine test suite, and — new as of this task — `pnpm --filter @l3arn/web build` passing on the updated `main`) is good, **the next step is Task 8 (Device tier detection + FPS governor + manual quality control)**.

Whoever does that — write a new handoff document at `docs/superpowers/plans/handoffs/<date>-handoff-task-8.md`, following the exact structure of this document:
- §0: the "verify, don't trust" reminder (keep it — it's cheap insurance, and it has now paid off twice)
- §1: project context (can be copied verbatim from this doc, it doesn't change task-to-task)
- §2: exact current state — **this section must be freshly verified, not copied**: confirm what's actually on `main` now (`git log origin/main --oneline -5`), create a fresh branch (`feature/3d-academy-task-8`) from the current `origin/main` tip, set up a worktree or reuse an existing clean one, and run the same verification sequence (`pnpm install` + the three package builds + `pnpm -r typecheck`) to confirm the starting point is healthy before handing off. Task 8 touches quality tiers that interact with what Task 7 just built (shadow map sizes, post-processing on/off per tier) — read the merged `Lighting.tsx`/`PostProfiles.tsx` as they actually landed (including any review-driven changes) before writing Task 8's assumptions, and verify Task 8's plan snippets against the installed packages' real APIs (the Task 6 ACTION-enum lesson).
- §3: the gate protocol (copy verbatim — it doesn't change)
- §4: Task 8's full verbatim text, pulled fresh from `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` (search for `### Task 8:`) — don't hand-transcribe from memory, copy it exactly, since the plan file is the source of truth and may have been touched by review feedback since this document was written
- §5: any task-specific post-implementation verification the task calls for
- §6: this same "what happens next" section, updated to point at Task 9

This pattern (verify fresh state → fresh branch → full task text → implement → PR → stop) repeats for every task through Task 17. Do not skip the "freshly verify, don't copy" step in §2 — that exact mistake (trusting stale local state instead of re-checking `origin/main`) is what caused the multi-hour git archaeology this document's §0 warns about.
