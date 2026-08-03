# Handoff: L3ARN 3D Academy — Task 9 (Asset compression CI gate — gltf-transform)

**You are a fresh Claude Code agent with no memory of prior conversations. This document is self-contained — everything you need is here or linked from here. Read this whole document before touching any code.**

---

## 0. Read this first: the one rule that matters most

**Verify, don't trust.** This has already paid off four times on this project:

1. A prior session built hours of work on a stale, locally-cached copy of `main` that didn't match GitHub (the repo had been restructured and the local checkout never picked it up). The fix required a careful git rebase and byte-for-byte content verification to recover.
2. Task 6's plan snippet used raw numeric `ACTION` values copied from `camera-controls` v2, which are **wrong** in the installed v3 (the bit-flags shifted). The executing agent caught it only because it checked the installed package's `.d.ts` before trusting the snippet.
3. Task 7's plan snippet was correct, but manual browser verification surfaced a real runtime problem the plan text couldn't have anticipated: `<N8AO>` triggers a per-frame WebGL warning, traced to a documented upstream architectural bug in `pmndrs/postprocessing` (not fixable by any prop change). It was disclosed in the PR rather than silently shipped or silently patched around. **Still unresolved** — see §2 below.
4. **New, found while writing this handoff:** Task 9's own plan snippet (unexecuted at the time this was written) makes two toolchain assumptions that don't hold against the currently installed `main`. Step 2's script does `import { NodeIO } from '@gltf-transform/core'`, but only `@gltf-transform/cli` is a direct root `devDependency` (installed by Task 0) — `@gltf-transform/core` exists only as a *transitive* dependency inside pnpm's virtual store, and pnpm's strict linking does not expose it at the root `node_modules/@gltf-transform/`. Confirmed live: `node -e "import('@gltf-transform/core').then(()=>console.log('ok')).catch(e=>console.log(e.message))"` from repo root prints `Cannot find package '@gltf-transform/core'`. Separately, Step 3's `npx vitest run scripts/check-glb-budget.test.mjs` assumes `vitest` is resolvable from the repo root — it isn't (only `packages/world-engine` has it as a devDependency); confirmed live: `npx vitest --version` from repo root fails with `'vitest' is not recognized as an internal or external command`. Neither is a "the plan is wrong" situation — both are one `pnpm add -D -w <pkg>` away — but running the snippets as-is before adding those root devDependencies will fail with module-not-found / command-not-found errors that look like something else is broken. See §4's handoff-writer notes for the exact fix.

**Before you write a single line of code**, run:
```bash
git fetch origin main
git log HEAD..origin/main --oneline
```
If that second command prints anything, **stop and investigate before proceeding** — your branch is behind `main` and you need to understand why before building on top of it. If you're following the setup instructions in §2 exactly (branching fresh from `origin/main`), this should be empty, but check anyway. Do not assume; verify.

When a plan snippet hard-codes values or API shapes from a third-party library, verify them against the installed `node_modules/<pkg>/.../*.d.ts` before trusting them (Task 6's lesson). When a plan snippet is *type-correct* but describes runtime behavior of a third-party rendering/effects library, don't assume type-correctness implies bug-free behavior — verify by actually running it in the browser and reading the console (Task 7's lesson). When a plan snippet imports a package or invokes a CLI, don't assume it's installed/resolvable just because a *related* package is — check the actual root `package.json`/`node_modules` before running it (Task 9's own lesson, #4 above).

---

## 1. What L3ARN is and what this work is

L3ARN is a parent-led + student-driven learning platform. Students explore a browser-based 3D "Academy" world, guided by an AI companion, undertaking learning missions. The current 3D world (`packages/world-engine`) is a primitive, untextured placeholder — the long-term vision (a "premium-stylized" world comparable to a well-produced browser game) is documented in:

- **Spec:** `docs/superpowers/specs/2026-06-30-3d-academy-world-design.md` — the full design vision, research-grounded, covering rendering, art pipeline, performance, architecture, and educational design.
- **Plan:** `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` — the actionable, task-by-task implementation plan for Phase 0 (Foundation) and Phase 1 (a vertical-slice "Living Great Hall" room). **This is your primary reference document — read it in full before starting, especially the "Execution Strategy" section near the top (dependency graph, gate protocol) and Task 9's full text (also reproduced in §4 below for convenience, but the live file is authoritative if the two ever disagree).**

You do not need to read the 5 research reports under `docs/superpowers/research/3d-world/` unless something in the plan references them and you need more depth — they're background, not required reading for Task 9.

---

## 2. Exact current state — start here

**Task 0** (dependency bootstrap) is done, reviewed, merged into `main` via PR #6.

**Tasks 1 and 2** are no-ops — fully absorbed into Task 0. Do not try to "do" them.

**Task 3** (ECS core) merged via PR #7 (`104afa5`).

**Task 4** (SimLoop) merged via PR #8 (squash commit `a9d850f`).

**Task 5** (Two-modes law) merged via PR #9 (squash commit `f763851`).

**Task 6** (Camera — Sims-style constrained rig) merged via PR #10 (squash commit `a48983a`).

**Task 7** (Lighting & post-processing) merged via PR #11 (squash commit `8a0af30`).

**Task 8** (Device tier detection + FPS governor + manual quality control) is **merged via PR #12 (squash commit `f57b8ae`)**. Added `packages/world-engine/src/device/deviceTier.ts` + `.test.ts` (boot-time GPU-tier classification + a rolling-window FPS governor), `qualityTier`/`dpr` fields on `worldStore.ts`, and a `DeviceGovernor` component wired into `WorldCanvas.tsx`. This handoff's post-merge verification (fresh-run by this document's author, not copied from the PR's own claims):
- `git fetch origin main && git log origin/main --oneline -5` confirms `f57b8ae` is the current tip.
- The `rebase-attempt-phase0-1` worktree (reused specifically for post-merge verification) fast-forwarded cleanly `8a0af30..f57b8ae`.
- `pnpm install` + the three `dist`-publishing builds (`@l3arn/shared-types`, `@l3arn/safety`, `@l3arn/mission-compiler`) all succeeded.
- `pnpm -r typecheck`: all 7 packages report `Done`, zero errors.
- `packages/world-engine` test suite: **16/16 passing** (12 pre-Task-8 baseline + 4 new `deviceTier.test.ts`).
- `pnpm --filter @l3arn/web build`: exit 0, full 21-route table generated (`/academy`, `/dashboard`, `/onboarding/*`, etc. — same shape as Task 7's post-merge baseline).

**Known open issue carried forward from Task 7 (still unresolved, NOT in Task 9's scope):** `<N8AO>` inside `PostProfiles.tsx`'s `EffectComposer` still spams a per-frame WebGL console warning (`GL_INVALID_OPERATION: glBlitFramebuffer: Read and write depth stencil attachments cannot be the same image`). Re-confirmed still present and untouched: `git log --oneline -- packages/world-engine/src/render/PostProfiles.tsx` shows the file's last change is still Task 7's merge commit `8a0af30` — no fix has landed since. This remains a documented upstream `pmndrs/postprocessing` architectural bug (fix only exists in the not-yet-stable v7 rewrite), no visual defect, console warning not error. Task 8's PR #12 raised (as a follow-up note, not an action) that the new `qualityTier` state could eventually gate post-processing on low-tier devices — nobody has picked that up; it remains an unassigned future consideration, not part of any task in the current 17-task plan. **Task 9 does not touch `PostProfiles.tsx`/`Lighting.tsx` either** — its file list is entirely new files plus one new empty directory (see below).

**The next task is Task 9** (Asset compression CI gate — gltf-transform). Its assumptions were verified directly against the real merged `main` (`f57b8ae`):
- Root `package.json` already has `@gltf-transform/cli@^4.4.0` as a `devDependency` (installed by Task 0 Step 7, confirmed present via `grep`) — Task 9's own Step 1 check will pass trivially.
- **Finding (see §0.4 above for detail):** `@gltf-transform/core` — imported directly by Step 2's script — is not a direct root dependency and does not resolve from repo root as written. Fix: `pnpm add -D -w @gltf-transform/core` before writing/running Step 2's script.
- **Finding (see §0.4 above for detail):** `vitest` is not a root-level devDependency (only `packages/world-engine` has it) and there is no root `vitest.config`. Step 3's `npx vitest run scripts/check-glb-budget.test.mjs`, run from repo root, fails as written. Fix: `pnpm add -D -w vitest@^2.1.8` (matching the version already used in `packages/world-engine`) before Step 3, then either `pnpm exec vitest run scripts/check-glb-budget.test.mjs` or plain `npx vitest run ...` (npx will resolve correctly once vitest is a root devDependency). No root `vitest.config` exists, so vitest's default include glob (`**/*.{test,spec}.*`) should pick up `scripts/check-glb-budget.test.mjs` without needing a new config file — worth a quick sanity check once vitest is actually installed at root, since defaults can vary by version.
- `.github/workflows/` does not exist yet anywhere in this repo (confirmed via `ls .github/workflows` — directory absent) — Task 9's Step 4 will be the **first** GitHub Actions workflow ever added here. `mkdir -p .github/workflows` first.
- `packages/world-engine/public/` does not exist yet (confirmed) — Step 5's directory creation is genuinely new, not a duplicate.
- No `.glb` files exist anywhere in the repo (consistent with the plan's own note that Phase 1 doesn't require real art yet) — the "no files found" path (Step 6) is the only runtime path this task can exercise for real; there is no way to prove the "oversized asset rejected" path against a real file in this task, only via the unit test on the triangle-counting logic (Step 3).
- Root `package.json`'s `engines.pnpm` is pinned to `11.7.0`, matching Step 4's CI snippet's `pnpm/action-setup@v4` → `version: 11.7.0`. Re-verify this still matches at execution time (`grep pnpm package.json`) since a version bump between now and then would need the workflow snippet's pin updated too.

### Your branch and worktree

A branch has already been created for you: **`feature/3d-academy-task-9`**, pushed to `origin`, branched fresh from the current tip of `origin/main` (`f57b8ae`, which includes Tasks 0, 3, 4, 5, 6, 7, and 8). It has zero commits beyond `main` other than (once committed) this handoff document — you're starting from a clean, verified baseline.

A worktree already exists checked out to this branch at:
```
E:\L3ARN\L3arn_repo\.worktrees\task-9
```

**Use this exact worktree. Do not create a new one.** Other worktrees exist in this repo — leave them all alone, they are unrelated to your task:
- `E:\L3ARN\L3arn_repo\.worktrees\task-4` through `...\task-8` — merged task branches; historical, not needed for Task 9.
- `E:\L3ARN\L3arn_repo\.worktrees\rebase-attempt-phase0-1` — sits on `main` (reused repeatedly for post-merge verification); not needed for Task 9.
- `E:\L3ARN\L3arn_repo\.worktrees\track-a-holdings-backend` — unrelated, separate work.

Also do not work in `E:\L3ARN\L3arn_repo` directly — that's a different checkout, on a different, unrelated branch (`docs/3d-academy-world-spec`).

### Verify your starting point before doing anything else

```bash
cd "E:\L3ARN\L3arn_repo\.worktrees\task-9"
git status                          # should show branch feature/3d-academy-task-9, clean
git log --oneline -3                # top commit should be "3D Academy Task 8: Device tier detection..." (#12) or a later docs commit on this branch
git fetch origin main
git log HEAD..origin/main --oneline # MUST be empty — if not, stop and investigate
pnpm install
pnpm --filter @l3arn/shared-types build
pnpm --filter @l3arn/safety build
pnpm --filter @l3arn/mission-compiler build
pnpm -r typecheck                   # MUST pass clean across all 7 packages before you start
```

This exact sequence was run in this worktree moments before this document was written and confirmed clean: `git log HEAD..origin/main` empty; `pnpm install` succeeded (this was a **freshly created worktree**, so the first install had to populate `node_modules` from scratch — it took about 5 minutes; don't be alarmed if your run is similarly slow, it's not hung); all three dist builds succeeded; `pnpm -r typecheck` reported all 7 packages `Done`, zero errors; `world-engine`'s test suite passed 16/16. If `pnpm -r typecheck` does not pass cleanly for you at this starting point, **stop and report back rather than building on top of a broken baseline** — something changed between then and now and needs investigating.

---

## 3. The gate protocol (non-negotiable — this is how the project owner wants to work)

1. **Implement Task 9 completely** (see §4).
2. **Verify**: run the exact typecheck and test commands the task specifies, and confirm they pass. Don't just claim they pass — show the actual output.
3. **Commit** using the message the task specifies.
4. **Push** your branch: `git push origin feature/3d-academy-task-9`
5. **Open a PR** against `main`:
   ```bash
   gh pr create --title "3D Academy Task 9: Asset compression CI gate (gltf-transform)" --base main --head feature/3d-academy-task-9 --body "..."
   ```
   Write a real PR body: what this adds, why (one or two sentences — this proves the CI asset-budget gate exists and works *before* any real `.glb` art lands, per spec §7.6, so an oversized or over-triangle-budget asset gets caught at PR time instead of discovered at runtime on a student's device), and a test-plan checklist mirroring what you verified in step 2. **Explicitly call out the two devDependencies this PR adds beyond the plan's literal file list** (`@gltf-transform/core`, `vitest` at the root — both needed to make Steps 2–3 actually run from repo root; see §0.4/§2 above) so the project owner isn't surprised by the `package.json`/`pnpm-lock.yaml` diff. Also carry forward the Task 7 N8AO status note (still open, still untouched) in the PR body, the same way Task 8's PR did — don't let it silently drop off the radar.
6. **Stop.** Do not merge the PR yourself. Do not start Task 10. Do not do anything else. The project owner will review, merge, and run their own post-merge verification. Report back to them (in your final message) that the PR is open, give them the URL, and stop.

**Why this matters:** the project owner has explicitly asked for a tight, one-task-at-a-time loop with a real PR and a real merge at every step — not a big batch of work landing all at once. Respect that even if it feels like you could "just keep going." Stopping here is the correct, complete outcome for this session, not a failure to finish.

---

## 4. Task 9: Asset compression CI gate (gltf-transform)

*(This is the full, verbatim task text from `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` (lines 1652–1852 as of this writing). If you find any discrepancy between this copy and the live file, the live file wins — but there shouldn't be one.)*

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

*(Handoff-writer's notes, not part of the verbatim task text:*

*(1) Two toolchain gaps were found before handing this off — full detail in §0.4 and §2 above. (a) Step 2's script imports `@gltf-transform/core` directly, but only `@gltf-transform/cli` is an explicit root devDependency; run `pnpm add -D -w @gltf-transform/core` before writing/running Step 2. (b) Step 3's `npx vitest run ...` assumes vitest resolves from repo root; it doesn't yet (only `packages/world-engine` has it) — run `pnpm add -D -w vitest@^2.1.8` before Step 3. Neither gap means the plan is wrong — both are one install away — but running the snippets as-is first will produce confusing module-not-found / command-not-found errors. Add both packages, then re-run `pnpm -r typecheck` to confirm nothing else broke, before proceeding to Steps 2–3. Step 7's commit command already includes `package.json`/`pnpm-lock.yaml`, so these new devDependencies will be captured correctly once added.)*

*(2) Step 3's first code block (the `node -e "..."` one-liner with only a comment inside, no actual generated fixture) is inert — it doesn't do anything runnable, it's plan-authoring residue. The plan's own next sentence ("Simpler and more reliable...") acknowledges this and supersedes it with the real vitest unit test. Don't try to make the first snippet do something; the vitest test is the actual Step 3 deliverable.)*

*(3) Step 4's CI workflow is the **first** `.github/workflows/*.yml` file in this repo — there's no existing workflow to pattern-match conventions against. The snippet's `pnpm/action-setup@v4` → `version: 11.7.0` matches this repo's root `package.json` `engines.pnpm` pin as of this writing — re-verify with `grep pnpm package.json` before trusting the hard-coded version, since drift between now and execution is possible.)*

*(4) Unlike Tasks 7 and 8, Task 9 has no manual browser verification step — its "runtime" is a Node script and a GitHub Actions workflow, not anything that renders. Don't go looking for a browser check that isn't there; §5 below is the full post-implementation verification for this task.)*

---

## 5. After Step 7 — before you open the PR

Run the full workspace typecheck one more time to make sure nothing else broke:

```bash
pnpm -r typecheck
```

Also run the `world-engine` test suite to make sure nothing regressed (Task 9's files live outside `packages/world-engine/src` — the only `world-engine` touch is the new, empty `public/models/.gitkeep`):

```bash
cd packages/world-engine && pnpm test
```

Expected: still **16/16** — Task 9 adds no `world-engine` test files; the new `check-glb-budget.test.mjs` lives at repo-root `scripts/` and is run separately (below), not picked up by `world-engine`'s vitest config (`include: ['src/**/*.test.ts']`).

Confirm the new root-level test passes on its own:

```bash
pnpm exec vitest run scripts/check-glb-budget.test.mjs
```

Expected: PASS, 1 test (`countTriangles`).

Confirm the budget-check script's "no files" path (Step 6) still prints the expected message and exits 0 — this is the one live runtime proof this task can offer without a real `.glb` asset in the repo:

```bash
node scripts/check-glb-budget.mjs
```

Expected: `[asset-gate] No .glb files found — nothing to check.`, exit code 0.

Then follow §3, steps 4–6: push, open the PR, stop.

---

## 6. What happens next (for whoever picks this up after the PR merges)

Once the project owner merges this PR and confirms post-merge verification (`pnpm -r typecheck`, the world-engine test suite, and `pnpm --filter @l3arn/web build` passing on the updated `main`) is good, **the next step is Task 10 (Real IBL — download and wire a Poly Haven HDRI)** — the first task of **Phase 1 (The Living Great Hall vertical slice)**, not Phase 0. Note the plan doc's own "Honest scope note" immediately above Task 10 (around line 1858 as of this writing): this project cannot generate bespoke 3D character/prop models directly — what *is* directly executable is fetching real CC0 HDRI/texture assets from Poly Haven's public CDN (Task 10) and building the tooling/lighting/material pipeline so real GLB models drop straight in later. Read that scope note in full before writing the Task 10 handoff so its framing carries forward correctly.

Whoever does that — write a new handoff document at `docs/superpowers/plans/handoffs/<date>-handoff-task-10.md`, following the exact structure of this document:
- §0: the "verify, don't trust" reminder (keep it — four lessons deep now; add a fifth if Task 9 surfaces its own during execution)
- §1: project context (can be copied verbatim from this doc, it doesn't change task-to-task)
- §2: exact current state — **this section must be freshly verified, not copied**: confirm what's actually on `main` now (`git log origin/main --oneline -5`), create a fresh branch (`feature/3d-academy-task-10`) from the current `origin/main` tip, set up a worktree, and run the same verification sequence to confirm the starting point is healthy before handing off. Also re-check the N8AO known issue status (§2 of this doc) — has it been triaged/fixed/explicitly accepted since this was written? And confirm Task 9's CI gate actually merged clean and doesn't misfire on unrelated PRs given its `paths:` filter — worth a quick look at Actions history if any PRs have landed since.
- §3: the gate protocol (copy verbatim — it doesn't change)
- §4: Task 10's full verbatim text, pulled fresh from `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` (search for `### Task 10:`) — don't hand-transcribe from memory, copy it exactly. Note Task 10 needs outbound network access (`curl` to Poly Haven's CDN), a different verification shape than Tasks 3–9's pure-local work — confirm the download actually succeeds and produces a real HDR file (not an error page) in the execution environment before assuming the snippet is correct, same "verify, don't trust" discipline applied to a new kind of step.
- §5: any task-specific post-implementation verification the task calls for
- §6: this same "what happens next" section, updated to point at Task 11

This pattern (verify fresh state → fresh branch → full task text → implement → PR → stop) repeats for every task through Task 17. Do not skip the "freshly verify, don't copy" step in §2 — that exact mistake (trusting stale local state instead of re-checking `origin/main`) is what caused the multi-hour git archaeology this document's §0 warns about.
