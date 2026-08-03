# Handoff: L3ARN 3D Academy — Task 11 (Rebuild Great Hall — materials, proportions, warmth)

**You are a fresh Claude Code agent with no memory of prior conversations. This document is self-contained — everything you need is here or linked from here. Read this whole document before touching any code.**

---

## 0. Read this first: the one rule that matters most

**Verify, don't trust.** This has already paid off six times on this project:

1. A prior session built hours of work on a stale, locally-cached copy of `main` that didn't match GitHub (the repo had been restructured and the local checkout never picked it up). The fix required a careful git rebase and byte-for-byte content verification to recover.
2. Task 6's plan snippet used raw numeric `ACTION` values copied from `camera-controls` v2, which are **wrong** in the installed v3 (the bit-flags shifted). The executing agent caught it only because it checked the installed package's `.d.ts` before trusting the snippet.
3. Task 7's plan snippet was correct, but manual browser verification surfaced a real runtime problem the plan text couldn't have anticipated: `<N8AO>` triggers a per-frame WebGL warning, traced to a documented upstream architectural bug in `pmndrs/postprocessing` (not fixable by any prop change). It was disclosed in the PR rather than silently shipped or silently patched around. **Still unresolved** — see §2 below.
4. Task 9's plan snippet made two toolchain assumptions that didn't hold against the installed `main`: it imported `@gltf-transform/core` (only `@gltf-transform/cli` was a direct root devDependency) and ran `vitest` from repo root (only `packages/world-engine` had it). Both were caught by actually running the import/command before trusting the snippet.
5. Task 9's CI workflow snippet hard-coded `node-version: 20`, which passed every local check but failed the first real GitHub Actions run in ~13 seconds (`pnpm@11.7.0` requires Node ≥ 22.13). Only observing the real CI run caught it — it was not reproducible locally.
6. **New, from Task 10's own execution:** Task 10's plan snippet assumed `<Environment files="/env/great-hall-dawn.hdr" />` would just resolve once the file existed under `packages/world-engine/public/env/`. It 404'd. Root cause: **`apps/web` has never had a `public/` directory**, and Next.js only serves static files from the *app's own* `public/` folder — never from a workspace package's `public/` folder. This was invisible through Task 9 because `packages/world-engine/public/models/.gitkeep` was never actually loaded by anything at runtime. Task 10 was the first task to need a real static asset served to the browser, so it was the first to surface the gap. Fixed with `scripts/sync-world-engine-public.mjs` (copies `packages/world-engine/public/*` → `apps/web/public/*`, chained into the `dev`/`build` npm scripts). **This fix is already merged and present on `main` — you don't need to redo it, just know it exists if you touch any static asset path.**

   A seventh, smaller lesson from *writing this handoff*: verifying "the deployed site" is not as simple as finding *a* URL that returns 200. `docs/AI_PRODUCTION_SETUP.md` references `https://l3arn.vercel.app` as the prod origin — that domain returns HTTP 200, but for a completely unrelated Locofy-generated static site (checked the response body; it's not this Next.js app at all — a stale/wrong doc reference, not a live mirror of this app). The real production URL, confirmed by cross-referencing the GitHub repo's own `homepage` field (`gh api repos/loveshotsmedia/l3arn_updated`) against the Vercel commit-status `target_url`, is **`https://l3arnupdated.vercel.app`** (note: no dot/dash between "l3arn" and "updated" — easy to mistype). Confirmed for real this time by checking the response headers, not just the status code: `Content-Type: application/octet-stream`, `X-Matched-Path: /env/great-hall-dawn.hdr`, `Content-Length: 1435119` (byte-exact match to the source asset). **A 200 status code alone proves nothing if you haven't confirmed the response is actually the thing you expected** — check content-type / matched-path / byte count, not just the status line.

**Before you write a single line of code**, run:
```bash
cd "E:\L3ARN\L3arn_repo\.worktrees\task-11"
git fetch origin main
git log HEAD..origin/main --oneline
```
If that second command prints anything, **stop and investigate before proceeding** — your branch is behind `main`. This was confirmed empty when this handoff was written, but check anyway. Do not assume; verify.

When a plan snippet hard-codes values or API shapes from a third-party library, verify them against the installed `node_modules/<pkg>/.../*.d.ts`. When a plan snippet is *type-correct* but describes runtime behavior of a rendering/effects library or a browser, verify it by actually running it and reading the console/network tab. When a plan snippet imports a package or invokes a CLI, verify it resolves before running it. When a plan snippet targets an environment you are not currently in — a CI runner, an external URL, a dev server, a browser — verify it **in that environment**, because local success does not transfer. **Task 11 adds one more class: when a plan snippet imports a component that a *later* task is supposed to create (a forward reference), verify whether that component exists yet before trusting the import will typecheck — see §4 note (1) below, this is not hypothetical, it's confirmed missing right now.**

---

## 1. What L3ARN is and what this work is

L3ARN is a parent-led + student-driven learning platform. Students explore a browser-based 3D "Academy" world, guided by an AI companion, undertaking learning missions. The current 3D world (`packages/world-engine`) is being incrementally upgraded from a primitive, untextured placeholder toward a "premium-stylized" world — the long-term vision is documented in:

- **Spec:** `docs/superpowers/specs/2026-06-30-3d-academy-world-design.md` — the full design vision, research-grounded, covering rendering, art pipeline, performance, architecture, and educational design.
- **Plan:** `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` — the actionable, task-by-task implementation plan for Phase 0 (Foundation) and Phase 1 (a vertical-slice "Living Great Hall" room). **This is your primary reference document — read it in full before starting, especially the "Execution Strategy" section near the top (dependency graph, gate protocol), the "Honest scope note" immediately above Task 10 (spec unchanged, still governs Task 11 — reproduced in §4 below), and Task 11's full text (also reproduced in §4 below; the live file is authoritative if the two ever disagree).**

**Task 11 is the second task of Phase 1 (The Living Great Hall vertical slice)** — Phase 0 (Tasks 0–9) and Task 10 (Real IBL) are complete and merged. Read the Honest scope note in §4 before you start: this project **cannot generate bespoke 3D character/prop models** (there is no 3D-asset-generation tool in this toolchain). Task 11 stays inside that honest scope: it upgrades the Great Hall's **materials, lighting response, and proportions within the existing primitive geometry** (boxes/planes) — a real, visible, honest quality jump now that Task 10's real HDRI actually informs every reflection — not a claim of photoreal bespoke models, which don't exist yet and aren't in scope here.

You do not need to read the 5 research reports under `docs/superpowers/research/3d-world/` unless something in the plan references them and you need more depth — they're background, not required reading for Task 11.

---

## 2. Exact current state — start here

**Tasks 0, 3, 4, 5, 6, 7, 8, 9 are all merged into `main`** (Tasks 1–2 were no-ops absorbed into Task 0).

**Task 10** (Real IBL — Poly Haven CC0 HDRI) is **merged via PR #14 (squash commit `e4455ed`)** — it is the current tip of `origin/main`. Freshly verified for this handoff (not copied from the PR's claims):
- `gh pr view 14` → `state: MERGED`, merge commit `e4455ed`.
- `git log origin/main --oneline -5` → `e4455ed 3D Academy Task 10: Real IBL — Poly Haven CC0 HDRI (#14)` at the tip, followed by Task 9's `22eb5a4`.
- Combined commit status on `e4455ed`: **`success`** (`Vercel`: success, `L3arn Updated - l3arn_updated`: success).
- **Post-merge verification**, done in the `rebase-attempt-phase0-1` worktree (fast-forwarded `22eb5a4..e4455ed`): `pnpm install` clean, all three dist builds succeeded, `pnpm -r typecheck` 7/7 packages `Done` / 0 errors, `packages/world-engine` suite **16/16**, `pnpm --filter @l3arn/web build` exit 0 with the full 21-route table, and — critically — a dev server started from that fast-forwarded checkout served `/env/great-hall-dawn.hdr` at **200** with the exact expected byte count (1,435,119).
- **Confirmed on the real deployed production site** (not just locally): `https://l3arnupdated.vercel.app/env/great-hall-dawn.hdr` → 200, `Content-Type: application/octet-stream`, `X-Matched-Path: /env/great-hall-dawn.hdr`, `Content-Length: 1435119`. `https://l3arnupdated.vercel.app/academy` → 200. (See §0's seventh lesson for how the *wrong* prod URL was ruled out first — don't reuse `l3arn.vercel.app`, it's a different, unrelated app.)

**Known open issue carried forward from Task 7 (still unresolved, NOT in Task 11's scope, but Task 11 changes the lighting these materials render under, so you will see its effects more clearly):** `<N8AO>` inside `packages/world-engine/src/render/PostProfiles.tsx`'s `EffectComposer` still emits a per-frame WebGL console warning (`GL_INVALID_OPERATION: glBlitFramebuffer: Read and write depth stencil attachments cannot be the same image`). Re-confirmed still present and untouched for this handoff: `git log --oneline -- packages/world-engine/src/render/PostProfiles.tsx` shows the file's last change is still Task 7's merge commit `8a0af30`. This is a documented upstream `pmndrs/postprocessing` architectural bug (fix only in the not-yet-stable v7 rewrite), a console **warning** not an error, no visual defect. **Task 11 does not touch `PostProfiles.tsx`** — but your browser verification (§5) will show this warning firing at a higher rate than before, because Task 11 intentionally increases the Sorting Computer's `emissiveIntensity` so bloom (which N8AO's warning is adjacent to, not caused by) picks it up more. **Do not mistake the warning volume/rate for something your change broke** — it predates you, is a known quantity, and is expected. Carry it forward in your PR body as prior task PRs (8, 9, 10) have.

**IMPORTANT — a real plan-vs-code drift, not hypothetical, confirmed while writing this handoff:** Task 11's Step 1 snippet (§4 below) imports and renders a `MasteryBuilding` component from `../objects/MasteryBuilding`. That file **does not exist yet** — `packages/world-engine/src/objects/` currently contains only `PlayerAvatar.tsx` and `SortingComputer.tsx` (confirmed via `find`/`ls` while writing this handoff). `MasteryBuilding.tsx` is created by **Task 14** (`### Task 14: Mastery-gated building`, plan doc line ~2327), which has not run yet — Tasks 12 and 13 come before it in strict sequential order. The plan doc's own Step 3 for Task 11 acknowledges this ("will fail until Task 14 creates `MasteryBuilding.tsx`... if running out of order, stub `MasteryBuilding` first with a component that returns `null`"). Since this project's gate protocol (§3) merges each task fully verified — including a clean `pnpm -r typecheck` — before the next task starts, **you cannot leave a broken import on `main` between Task 11 and Task 14**. **You must create a minimal stub before applying Task 11's Step 1 snippet.** See §4 note (1) for the exact stub to create.

Everything else in Task 11's snippets was cross-checked against the current code while writing this handoff and matches: `SortingComputer.tsx`'s current `emissiveIntensity` values are `0.6` (body) and `1.2` (screen face) — exactly what the plan's Step 2 says to bump *from* (to `0.9` and `1.6` respectively), confirming the plan's assumed baseline is accurate. `GreatHall.tsx`'s current `handleFloorClick`, `SceneProps` import, and `useWorldStore` usage all match the plan's Step 1 snippet's assumed baseline (the only structural addition in the snippet is the `MasteryBuilding` import/usage noted above — the color/roughness/metalness changes are the intended edit, not drift). `useWorldStore` already exports `enterMissionMode` (confirmed via grep), so Task 11's Step 2 edit to `SortingComputer.tsx` will resolve cleanly.

### Your branch and worktree

A branch has already been created for you: **`feature/3d-academy-task-11`**, pushed to `origin`, branched fresh from the current tip of `origin/main` (`e4455ed`, which includes Tasks 0, 3–9, and 10). Once you commit, its only content beyond `main` will be this handoff document — you're starting from a clean, verified baseline.

A worktree already exists checked out to this branch at:
```
E:\L3ARN\L3arn_repo\.worktrees\task-11
```

**Use this exact worktree. Do not create a new one.** Other worktrees exist in this repo — leave them all alone, they are unrelated to your task:
- `E:\L3ARN\L3arn_repo\.worktrees\task-4` through `...\task-10` — merged task branches; historical, not needed for Task 11.
- `E:\L3ARN\L3arn_repo\.worktrees\rebase-attempt-phase0-1` — sits on `main` (reused repeatedly for post-merge verification); not needed for Task 11.
- `E:\L3ARN\L3arn_repo\.worktrees\track-a-holdings-backend` — unrelated, separate work.

Also do not work in `E:\L3ARN\L3arn_repo` directly, nor in `E:\L3ARN` — those are different checkouts on a different, unrelated branch (`docs/3d-academy-world-spec`).

### Verify your starting point before doing anything else

This exact sequence was run in this worktree moments before this document was written and confirmed clean:

```bash
cd "E:\L3ARN\L3arn_repo\.worktrees\task-11"
git status                          # branch feature/3d-academy-task-11; clean apart from (once added) this handoff
git log --oneline -3                # top: e4455ed "3D Academy Task 10 ... (#14)"; then 22eb5a4 "Task 9 ... (#13)"
git fetch origin main
git log HEAD..origin/main --oneline # MUST be empty — confirmed empty
pnpm install                        # fresh worktree — first install took ~7m25s; NOT a hang
pnpm --filter @l3arn/shared-types build
pnpm --filter @l3arn/safety build
pnpm --filter @l3arn/mission-compiler build
pnpm -r typecheck                   # confirmed: all 7 packages Done, 0 errors
cd packages/world-engine && pnpm test   # confirmed: 16/16 passing (5 files)
```

All of the above passed clean when this handoff was written. If `pnpm -r typecheck` does not pass cleanly for you at this starting point, **stop and report back rather than building on top of a broken baseline** — something changed and needs investigating.

---

## 3. The gate protocol (non-negotiable — this is how the project owner wants to work)

1. **Implement Task 11 completely** (see §4) — including the `MasteryBuilding` stub (§4 note (1)) that the plan's own text anticipates for out-of-order/strict-sequential execution.
2. **Verify**: run the exact commands the task and §5 specify, and confirm they pass. Don't just claim they pass — show the actual output. This includes the manual browser check (§5) — Task 11, like Task 10, has a live-render verification step.
3. **Commit** using the message the task specifies (§4 Step 5).
4. **Push** your branch: `git push origin feature/3d-academy-task-11`
5. **Open a PR** against `main`:
   ```bash
   gh pr create --title "3D Academy Task 11: Rebuild Great Hall — materials, proportions, warmth" --base main --head feature/3d-academy-task-11 --body "..."
   ```
   Write a real PR body: what this adds, why (Task 10's real HDRI now visibly informs every reflection in the room — this task gives every surface a deliberate PBR pass instead of flat single-tone slabs, and gives the Sorting Computer's glow the presence bloom can actually catch), a test-plan checklist mirroring what you verified in step 2 (including the browser check with a screenshot), and disclosure of the `MasteryBuilding` stub you had to add (this is a deviation from the plan's literal snippet — call it out explicitly, same as Task 10's PR disclosed its sync-script addition, so it doesn't read as unexplained scope creep). Carry forward the Task 7 N8AO status note, the same way Tasks 8, 9, and 10's PRs did.
6. **Stop.** Do not merge the PR yourself. Do not start Task 12. Do not do anything else. The project owner will review, merge, and run their own post-merge verification. Report back to them (in your final message) that the PR is open, give them the URL, and stop.

**Why this matters:** the project owner has explicitly asked for a tight, one-task-at-a-time loop with a real PR and a real merge at every step — not a big batch of work landing all at once. Respect that even if it feels like you could "just keep going." Stopping here is the correct, complete outcome for this session, not a failure to finish.

---

## 4. Task 11: Rebuild Great Hall — materials, proportions, warmth

*(This is the full, verbatim task text from `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` (`### Task 11:`, lines ~1928–2065 as of this writing). If you find any discrepancy between this copy and the live file, the live file wins — but there shouldn't be one.)*

> **Honest scope note (Orchestration-First framing, unchanged from Task 10 — reproduced here since it still governs Task 11):** I cannot generate bespoke 3D character/prop models myself — there is no 3D-asset-generation tool in this toolchain. What *is* directly executable now: fetching real CC0 HDRI/texture assets from Poly Haven's public CDN (done, Task 10) and building every piece of tooling/lighting/material infrastructure so that when GLB models arrive (via Meshy, Quaternius/KayKit downloads, or a technical artist), they drop straight into a working pipeline (Task 9's CI gate, `Lighting.tsx`'s IBL, the `<Detailed>`/`useGLTF` loading pattern in Task 11 — used here for the *pattern*, not for loading a real model yet). Task 11 therefore upgrades the Great Hall's **materials, lighting response, and proportions** within primitive geometry — a real, visible, honest quality jump — rather than claiming photoreal models that don't exist yet.

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
Expected: PASS (will fail until Task 14 creates `MasteryBuilding.tsx` — if executing tasks strictly in order, do Task 11's import as a forward reference is fine since Task 14 runs before this is user-facing; if running out of order, stub `MasteryBuilding` first with a component that returns `null`).

- [ ] **Step 4: Manual verification**

Run: `pnpm --filter @l3arn/web dev`, open `/student/academy`.
Expected: warmer, more varied wall/floor tones; Sorting Computer glow is noticeably brighter/bloomier. Click it — expect no visible change yet (mission-mode consumers land in Task 12/13). Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add packages/world-engine/src/scenes/GreatHall.tsx packages/world-engine/src/objects/SortingComputer.tsx
git commit -m "feat(world-engine): PBR material pass on Great Hall under real IBL"
```

---

*(Handoff-writer's notes, not part of the verbatim task text. All were verified live while writing this handoff — but re-verify at execution time, since time has passed and code can drift.)*

**(1) `MasteryBuilding.tsx` does not exist — you must stub it before Step 1, or `pnpm -r typecheck` will fail and the gate (§3) will block you from merging.** This is the one real deviation this handoff requires beyond the plan's literal text. The plan's own Step 3 acknowledges the out-of-order case; since this project's gate protocol requires a green `pnpm -r typecheck` before every merge, treat this as the operative case regardless of task ordering philosophy. Create `packages/world-engine/src/objects/MasteryBuilding.tsx`:

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
This matches the prop shape Task 11's Step 1 snippet actually passes (`position={[6, 0, -8]} holdingId="fractions-observatory"`) and the shape Task 14's plan text uses (`holdingId` as a string matching the eventual `world_holdings.holding_id` column — see plan doc `### Task 14`, line ~2327, Step 1's migration comment: `holding_id text not null, -- e.g. 'fractions-observatory' — matches MasteryBuilding's holdingId prop`). Add this new file to the Step 5 `git add`/commit alongside the two files the plan lists — do not leave it uncommitted or untracked. Note this addition explicitly in your PR body (per §3 Step 5) so it doesn't read as unexplained scope creep; it's a load-bearing stub, not filler.

**(2) The route is `/academy`, NOT `/student/academy`.** Same drift Task 10's handoff flagged: Step 4 above says open `/student/academy`, but the academy page lives at `apps/web/src/app/(student)/academy/page.tsx` — `(student)` is a Next.js **route group**, stripped from the URL. The dev URL is `http://localhost:3000/academy` (or whatever port `next dev` actually picks — check its stdout, Task 10's execution saw it shift to 3002/3003/3004 across attempts because of lingering processes on 3000–3003; see note (4) below on cleaning those up).

**(3) `SortingComputer.tsx`'s current baseline exactly matches what the plan assumes.** Confirmed while writing this handoff: current `emissiveIntensity` is `0.6` on the body mesh (`meshStandardMaterial` inside the first `<mesh>`) and `1.2` on the screen face (the second `<mesh>`, the `planeGeometry` at `position={[0, 0, 0.41]}`). The plan's Step 2 parenthetical says to bump these to `0.9` and `1.6` respectively — apply that exactly, the baseline it assumes is real. `handleClick`'s current shape (`(e: { stopPropagation: () => void })`) also matches exactly what the plan's replacement snippet assumes; you're inserting one line (`useWorldStore.getState().enterMissionMode();`) before the existing `onEvent(...)` call, not restructuring the function.

**(4) How to do the Step 4 / §5 browser check (headless, objective-first) — reuse Task 10's approach.** Start `pnpm --filter @l3arn/web dev` backgrounded (it does not exit on its own — don't block on it; check its stdout for the actual port, since 3000 was occupied by an unrelated stray process (`51316`) throughout Task 10's session and may still be). Navigate headless Playwright to `http://localhost:<port>/academy`. Confirm: (a) the canvas renders without crashing, (b) **0 new console errors** — expect the pre-existing, unrelated `favicon.ico` 404 (this app has never had a favicon) and the pre-existing N8AO `GL_INVALID_OPERATION` warning (now firing at whatever rate the brighter emissive intensity produces — still a warning, not an error, still not your bug), (c) capture a screenshot for the PR. Since "warmer tones" and "more bloomy" are subjective, the objective proof here is really "canvas renders, 0 new errors, typecheck/tests/build all green" — say so plainly in the PR rather than overclaiming a visual diff you can't quantify from a single screenshot. **Stop the dev server when done — and verify it's actually stopped**, not just that `TaskStop`/the tool reported success. Task 10's execution discovered that `next dev` on Windows can leave an orphaned `node.exe` (`next-server`) process holding the port even after the wrapping shell task is torn down: check `Get-NetTCPConnection -LocalPort <port> -State Listen` (PowerShell) to find the real PID and `Stop-Process -Id <pid> -Force` it, then re-curl the port to confirm `000`/connection-refused before moving on.

**(5) No new dependencies needed.** `useWorldStore`, `SortingComputer`, `PlayerAvatar`, `SceneProps` are all already in place and unchanged in shape. The only genuinely new file is the `MasteryBuilding.tsx` stub from note (1).

---

## 5. After Step 5 — before you open the PR

Run the full workspace typecheck to make sure the edits (and the `MasteryBuilding` stub) didn't break types:

```bash
pnpm -r typecheck
```
Expected: all 7 packages `Done`, 0 errors.

Run the `world-engine` test suite to confirm no regression (confirmed while writing this handoff: no test file under `packages/world-engine/src/**/*.test.ts` references `GreatHall` or `SortingComputer`, so this suite exercises neither file directly — a pass here proves no *unrelated* regression, not that the material change itself is correct; that's what the browser check is for):

```bash
cd packages/world-engine && pnpm test
```
Expected: still **16/16**.

Run the web build to confirm the app still builds with the changed scene:

```bash
pnpm --filter @l3arn/web build
```
Expected: exit 0, full 21-route table (same shape as §2's baseline).

Do the **browser check** described in §4 note (4) — this is the real point of Task 11 and the one thing typecheck/tests can't prove:
- dev server up, `http://localhost:<port>/academy` loads,
- canvas renders, no NEW console errors (pre-existing favicon 404 and N8AO warning excepted),
- screenshot captured for the PR,
- dev server stopped **and confirmed actually stopped** (see note (4)'s Windows-orphan-process caveat).

Then follow §3, steps 3–6: commit, push, open the PR, stop.

---

## 6. What happens next (for whoever picks this up after the PR merges)

Once the project owner merges this PR and confirms post-merge verification (`pnpm -r typecheck`, the world-engine test suite, `pnpm --filter @l3arn/web build`, and a real render/asset check — see §2's pattern for how to verify the *actual* deployed production URL, not a stale doc reference) is good, **the next step is Task 12** — read `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` (search `### Task 12:`) for its exact scope; this handoff-writer has not pre-read it, so don't assume anything about it beyond what the live plan doc says.

Whoever does that — write a new handoff document at `docs/superpowers/plans/handoffs/<date>-handoff-task-12.md`, following the exact structure of this document:
- §0: the "verify, don't trust" reminder (keep it — seven lessons deep now; add an eighth if Task 11 surfaces its own during execution, e.g. anything about the `MasteryBuilding` stub, the material/lighting interaction, or the browser check that this plan text couldn't have anticipated).
- §1: project context (can be copied nearly verbatim from this doc; update only the "which task / which phase" framing).
- §2: exact current state — **this section must be freshly verified, not copied**: confirm what's actually on `main` now (`git log origin/main --oneline -5`, confirm Task 11's squash commit is the tip and its merge-commit status is green), create a fresh branch (`feature/3d-academy-task-12`) from the current `origin/main` tip, set up a worktree at `.worktrees/task-12`, and run the same verification sequence (fetch/range-empty, install, dist builds, typecheck 7/7, world-engine tests) to confirm the starting point is healthy before handing off. Also re-check the N8AO known issue status (has it been triaged/fixed/explicitly accepted since?), re-confirm the real production URL (`https://l3arnupdated.vercel.app` as of this writing — but re-verify, don't assume it hasn't changed) actually serves the merged Task 11 changes, and check whether Task 14's backend track (`world_holdings` migration/shared-types schema) has landed out-of-band yet (the plan's "parallel-track split" note means it's possible, even though this handoff executed strictly sequentially).
- §3: the gate protocol (copy verbatim — it doesn't change).
- §4: Task 12's full verbatim text, pulled fresh from `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` — don't hand-transcribe from memory, copy it exactly. Read whatever files Task 12 modifies in their *current* state while writing the handoff, and flag any plan-vs-code drift the same way this handoff flagged Task 11's missing `MasteryBuilding.tsx`.
- §5: any task-specific post-implementation verification the task calls for (reuse the headless-Playwright, objective-first approach, and the Windows-orphan-process-cleanup caveat from §4 note (4) here if Task 12 also needs a dev-server browser check).
- §6: this same "what happens next" section, updated to point at Task 13.

This pattern (verify fresh state → fresh branch → full task text → pre-verify snippets against real code/tools/URLs → implement → verify (incl. browser) → PR → stop) repeats for every task through Task 17. Do not skip the "freshly verify, don't copy" step in §2 — that exact mistake (trusting stale local state instead of re-checking `origin/main`) is what caused the multi-hour git archaeology this document's §0 warns about.
