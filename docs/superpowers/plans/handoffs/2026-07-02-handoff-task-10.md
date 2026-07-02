# Handoff: L3ARN 3D Academy — Task 10 (Real IBL — download and wire a Poly Haven HDRI)

**You are a fresh Claude Code agent with no memory of prior conversations. This document is self-contained — everything you need is here or linked from here. Read this whole document before touching any code.**

---

## 0. Read this first: the one rule that matters most

**Verify, don't trust.** This has already paid off five times on this project:

1. A prior session built hours of work on a stale, locally-cached copy of `main` that didn't match GitHub (the repo had been restructured and the local checkout never picked it up). The fix required a careful git rebase and byte-for-byte content verification to recover.
2. Task 6's plan snippet used raw numeric `ACTION` values copied from `camera-controls` v2, which are **wrong** in the installed v3 (the bit-flags shifted). The executing agent caught it only because it checked the installed package's `.d.ts` before trusting the snippet.
3. Task 7's plan snippet was correct, but manual browser verification surfaced a real runtime problem the plan text couldn't have anticipated: `<N8AO>` triggers a per-frame WebGL warning, traced to a documented upstream architectural bug in `pmndrs/postprocessing` (not fixable by any prop change). It was disclosed in the PR rather than silently shipped or silently patched around. **Still unresolved** — see §2 below.
4. Task 9's plan snippet made two toolchain assumptions that didn't hold against the installed `main`: it imported `@gltf-transform/core` (only `@gltf-transform/cli` was a direct root devDependency) and ran `vitest` from repo root (only `packages/world-engine` had it). Both were caught by actually running the import/command before trusting the snippet, and fixed with two `pnpm add -D -w` calls.
5. **New, from Task 9's own execution:** Task 9's CI workflow snippet hard-coded `node-version: 20`. That is syntactically fine and **passed every local check** (the executor's local Node was v24). But the very first GitHub Actions run **failed in ~13 seconds**: `pnpm@11.7.0` requires Node ≥ 22.13 (it `require`s the `node:sqlite` builtin, which does not exist in Node 20), so `actions/setup-node@v4`'s pnpm-cache step (`pnpm store path`) crashed with `ERR_UNKNOWN_BUILTIN_MODULE: No such built-in module: node:sqlite` before `pnpm install` even ran. The fix (bump the workflow to `node-version: 22`, matching the repo's own `engines.node: >=22.13.0`) was only found by **observing the real CI run**, because it was not reproducible locally. **Lesson: "passes locally" does not prove "passes in the target environment" when the target is a different runner / Node version / OS / network. Observe the actual environment.** This lesson bears directly on Task 10, whose verification depends on two things the local `pnpm -r typecheck` cannot exercise: an outbound `curl` to an external CDN, and a running dev server serving a binary asset to a browser. **Verify those in the real execution environment — don't assume the snippet works just because the code typechecks.**

**Before you write a single line of code**, run:
```bash
cd "E:\L3ARN\L3arn_repo\.worktrees\task-10"
git fetch origin main
git log HEAD..origin/main --oneline
```
If that second command prints anything, **stop and investigate before proceeding** — your branch is behind `main`. If you're starting from the branch/worktree already set up for you (see §2), this should be empty, but check anyway. Do not assume; verify.

When a plan snippet hard-codes values or API shapes from a third-party library, verify them against the installed `node_modules/<pkg>/.../*.d.ts` (Task 6's lesson). When a plan snippet is *type-correct* but describes runtime behavior of a rendering/effects library or a browser, verify it by actually running it and reading the console/network tab (Task 7's lesson). When a plan snippet imports a package or invokes a CLI, verify it resolves before running it (Task 9's lesson). When a plan snippet targets an environment you are not currently in — a CI runner, an external URL, a dev server, a browser — verify it **in that environment**, because local success does not transfer (Task 9's fifth lesson, above). Task 10 hits the last two directly.

---

## 1. What L3ARN is and what this work is

L3ARN is a parent-led + student-driven learning platform. Students explore a browser-based 3D "Academy" world, guided by an AI companion, undertaking learning missions. The current 3D world (`packages/world-engine`) is a primitive, untextured placeholder — the long-term vision (a "premium-stylized" world comparable to a well-produced browser game) is documented in:

- **Spec:** `docs/superpowers/specs/2026-06-30-3d-academy-world-design.md` — the full design vision, research-grounded, covering rendering, art pipeline, performance, architecture, and educational design.
- **Plan:** `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` — the actionable, task-by-task implementation plan for Phase 0 (Foundation) and Phase 1 (a vertical-slice "Living Great Hall" room). **This is your primary reference document — read it in full before starting, especially the "Execution Strategy" section near the top (dependency graph, gate protocol), the "Honest scope note" immediately above Task 10 (reproduced in §4 below), and Task 10's full text (also reproduced in §4 below; the live file is authoritative if the two ever disagree).**

**Task 10 is the first task of Phase 1 (The Living Great Hall vertical slice)** — Phase 0 (Tasks 0–9) is complete and merged. Read the Honest scope note in §4 before you start: this project **cannot generate bespoke 3D character/prop models** (there is no 3D-asset-generation tool in this toolchain). What *is* directly executable is fetching real CC0 assets from Poly Haven's public CDN and building the tooling/lighting/material pipeline so real GLB models drop straight in later. Task 10 is exactly that — fetching one real CC0 HDRI and wiring it into the lighting rig. Keep that framing intact.

You do not need to read the 5 research reports under `docs/superpowers/research/3d-world/` unless something in the plan references them and you need more depth — they're background, not required reading for Task 10.

---

## 2. Exact current state — start here

**Tasks 0, 3, 4, 5, 6, 7, 8 are all merged into `main`** (Tasks 1–2 were no-ops absorbed into Task 0). 

**Task 9** (Asset compression CI gate — gltf-transform) is **merged via PR #13 (squash commit `22eb5a4`)** — it is the current tip of `origin/main`. Task 9 added `scripts/check-glb-budget.mjs` (+ `.test.mjs`), the repo's first-ever GitHub Actions workflow `.github/workflows/asset-gate.yml`, and `packages/world-engine/public/models/.gitkeep`, plus two root devDependencies (`@gltf-transform/core@^4.4.0`, `vitest@^2.1.9`). Freshly verified for this handoff (not copied from the PR's claims):
- `gh pr view 13` → `state: MERGED`, merge commit `22eb5a4`. The merge commit's combined status is **`success`** (Vercel: success, "L3arn Updated": success).
- `git log origin/main --oneline -1` → `22eb5a4 3D Academy Task 9: Asset compression CI gate (gltf-transform) (#13)`.
- **Post-merge verification** (fast-forwarded the `rebase-attempt-phase0-1` worktree `f57b8ae..22eb5a4`): `pnpm install` clean (the two Task-9 devDeps present on `main`), all three dist builds succeeded, `pnpm -r typecheck` all 7 packages `Done` / 0 errors, `packages/world-engine` suite **16/16**, `pnpm --filter @l3arn/web build` exit 0 with the full **21-route** table (`/academy`, `/dashboard`, `/onboarding/*`, etc. — same shape as prior baselines).
- **Task 9 gate sanity check (per prior handoff's §6 ask):** the merged `.github/workflows/asset-gate.yml` carries the `node-version: 22` fix. Its `paths:` filter is narrow — `packages/world-engine/public/models/**/*.glb` and `scripts/check-glb-budget.mjs` only — so it will **not** misfire on unrelated PRs; it is a `pull_request` gate by design and correctly did not run on the merge-to-`main` push. Its only run history is the two PR #13 runs (first failed on Node 20, second succeeded after the Node 22 fix). Note Task 10 adds a `.hdr` under `public/env/`, which is **outside** this gate's `.glb`/models path filter — the asset gate will not touch your HDRI.

**Known open issue carried forward from Task 7 (still unresolved, NOT in Task 10's scope, but you WILL touch the same file's neighbor):** `<N8AO>` inside `packages/world-engine/src/render/PostProfiles.tsx`'s `EffectComposer` still emits a per-frame WebGL console warning (`GL_INVALID_OPERATION: glBlitFramebuffer: Read and write depth stencil attachments cannot be the same image`). Re-confirmed still present and untouched for this handoff: `git log --oneline -- packages/world-engine/src/render/PostProfiles.tsx` shows the file's last change is still Task 7's merge commit `8a0af30`. This is a documented upstream `pmndrs/postprocessing` architectural bug (fix only in the not-yet-stable v7 rewrite), a console **warning** not an error, no visual defect. **Task 10 edits `Lighting.tsx`, not `PostProfiles.tsx`** — but when you do the browser verification (Step 4) you will likely see this N8AO warning in the console. **Do not mistake it for something your change broke** — it predates you and is expected. Carry it forward in your PR body as prior task PRs have.

### Your branch and worktree

A branch has already been created for you: **`feature/3d-academy-task-10`**, pushed to `origin`, branched fresh from the current tip of `origin/main` (`22eb5a4`, which includes Tasks 0, 3, 4, 5, 6, 7, 8, and 9). Once you commit, its only content beyond `main` will be this handoff document — you're starting from a clean, verified baseline.

A worktree already exists checked out to this branch at:
```
E:\L3ARN\L3arn_repo\.worktrees\task-10
```

**Use this exact worktree. Do not create a new one.** Other worktrees exist in this repo — leave them all alone, they are unrelated to your task:
- `E:\L3ARN\L3arn_repo\.worktrees\task-4` through `...\task-9` — merged task branches; historical, not needed for Task 10.
- `E:\L3ARN\L3arn_repo\.worktrees\rebase-attempt-phase0-1` — sits on `main` (reused repeatedly for post-merge verification); not needed for Task 10.
- `E:\L3ARN\L3arn_repo\.worktrees\track-a-holdings-backend` — unrelated, separate work.

Also do not work in `E:\L3ARN\L3arn_repo` directly — that's a different checkout, on a different, unrelated branch (`docs/3d-academy-world-spec`).

### Verify your starting point before doing anything else

This exact sequence was run in this worktree moments before this document was written and confirmed clean:

```bash
cd "E:\L3ARN\L3arn_repo\.worktrees\task-10"
git status                          # branch feature/3d-academy-task-10; clean apart from (once added) this handoff
git log --oneline -2                # top: 22eb5a4 "3D Academy Task 9 ... (#13)"; then f57b8ae "Task 8 ... (#12)"
git fetch origin main
git log HEAD..origin/main --oneline # MUST be empty — confirmed empty
pnpm install                        # fresh worktree — first install populated node_modules from scratch, took ~4m35s; NOT a hang
pnpm --filter @l3arn/shared-types build
pnpm --filter @l3arn/safety build
pnpm --filter @l3arn/mission-compiler build
pnpm -r typecheck                   # confirmed: all 7 packages Done, 0 errors
cd packages/world-engine && pnpm test   # confirmed: 16/16 passing (5 files)
```

All of the above passed clean when this handoff was written. This was a **freshly created worktree**, so your first `pnpm install` may already be populated (the handoff-writer ran it) — but if `node_modules` is somehow missing, expect ~5 minutes, not a hang. If `pnpm -r typecheck` does not pass cleanly for you at this starting point, **stop and report back rather than building on top of a broken baseline** — something changed and needs investigating.

---

## 3. The gate protocol (non-negotiable — this is how the project owner wants to work)

1. **Implement Task 10 completely** (see §4).
2. **Verify**: run the exact commands the task and §5 specify, and confirm they pass. Don't just claim they pass — show the actual output. This includes the manual browser check (§4 Step 4 / §5) — Task 10, unlike Task 9, DOES have a live-render verification step.
3. **Commit** using the message the task specifies (§4 Step 5).
4. **Push** your branch: `git push origin feature/3d-academy-task-10`
5. **Open a PR** against `main`:
   ```bash
   gh pr create --title "3D Academy Task 10: Real IBL — Poly Haven CC0 HDRI" --base main --head feature/3d-academy-task-10 --body "..."
   ```
   Write a real PR body: what this adds, why (one or two sentences — this replaces the built-in drei `preset="dawn"` studio-like IBL with a real CC0 outdoor-sky HDRI from Poly Haven, so the world's image-based lighting and metal reflections come from a real captured environment per spec §7.5–7.7 and the Phase-1 art pipeline), a test-plan checklist mirroring what you verified in step 2 (including the browser check with a screenshot and the confirmed-200 HDR network request), and the asset attribution (CC0, source URL — same info as the `ASSET_MANIFEST.md` you create in Step 2). Carry forward the Task 7 N8AO status note (still open, still untouched), the same way Tasks 8 and 9's PRs did. If you needed any deviation from the plan's literal snippets (see §4 handoff-writer notes for the ones already known), call each out explicitly so it doesn't read as unexplained scope creep.
6. **Stop.** Do not merge the PR yourself. Do not start Task 11. Do not do anything else. The project owner will review, merge, and run their own post-merge verification. Report back to them (in your final message) that the PR is open, give them the URL, and stop.

**Why this matters:** the project owner has explicitly asked for a tight, one-task-at-a-time loop with a real PR and a real merge at every step — not a big batch of work landing all at once. Respect that even if it feels like you could "just keep going." Stopping here is the correct, complete outcome for this session, not a failure to finish.

---

## 4. Task 10: Real IBL — download and wire a Poly Haven HDRI

*(This is the full, verbatim task text from `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` (the "Honest scope note" plus `### Task 10:`, lines ~1858–1924 as of this writing). If you find any discrepancy between this copy and the live file, the live file wins — but there shouldn't be one.)*

> **Honest scope note (Orchestration-First framing):** I cannot generate bespoke 3D character/prop models myself — there is no 3D-asset-generation tool in this toolchain. What *is* directly executable now: fetching real CC0 HDRI/texture assets from Poly Haven's public CDN (Task 10) and building every piece of tooling/lighting/material infrastructure so that when GLB models arrive (via Meshy, Quaternius/KayKit downloads, or a technical artist), they drop straight into a working pipeline (Task 9's CI gate, `Lighting.tsx`'s IBL, the `<Detailed>`/`useGLTF` loading pattern in Task 11). Task 11 therefore upgrades the Great Hall's **materials, lighting response, and proportions** within primitive geometry — a real, visible, honest quality jump — rather than claiming photoreal models that don't exist yet. Confidence on the asset-fetching path: **High**. Confidence on "this alone reaches the Fable-5 bar": **Low** — that requires the art pipeline in spec §7.5–7.7 (bespoke/CC0 character and prop models), which is a follow-on art-production task, not an engineering one.

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

*(Handoff-writer's notes, not part of the verbatim task text. All five were verified live while writing this handoff — but re-verify at execution time, since time has passed and URLs/tools can drift.)*

**(1) The Poly Haven URL is live and returns a real HDR — verified now, re-verify at execution.** A `curl -sIL` of `https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloofendal_48d_partly_cloudy_puresky_1k.hdr` returned `HTTP/1.1 200 OK`, `Content-Type: application/octet-stream`, `Content-Length: 1435119` (~1.4 MB). A full download to a scratch location had first bytes `#?RADIANCE\nFORMAT=32-bit_rle_rgbe` and `file` reported `Radiance HDR image data`. So Step 1's snippet works as written. **Note the intentional rename:** the CDN filename is `kloofendal_48d_partly_cloudy_puresky_1k.hdr` but the plan saves it locally as `great-hall-dawn.hdr` — that is deliberate (the manifest in Step 2 records the true source URL for attribution), not a typo. Do the `file` verify step for real and paste its output — this is Task 10's equivalent of Task 9's "observe the real environment" lesson: the local typecheck cannot tell you the CDN is reachable or the bytes are valid.

**(2) `file` IS available in this environment** — `/usr/bin/file` (file-5.46) in the Git Bash the Bash tool uses. So Step 1's `file` verification runs as written; no fallback needed. (If you somehow end up in a shell without `file`, the magic-byte fallback is `head -c 10 <path>` — a real Radiance HDR starts with the literal `#?RADIANCE`.)

**(3) The `Environment` import in `Lighting.tsx` already exists — Step 3's "change the import" is a NO-OP.** `packages/world-engine/src/render/Lighting.tsx` line 8 already reads `import { Environment } from '@react-three/drei';` (its file-header comment even says "Real HDRI asset is wired in Phase 1 Task 10"). **Do not add a duplicate import** (that would fail typecheck under this package's `noUnusedLocals` if it caused a dup, and is just wrong). The ONLY real edit is the prop swap on the `<Environment ... />` line (currently line 24): change `<Environment preset="dawn" background={false} />` to `<Environment files="/env/great-hall-dawn.hdr" background={false} />`. Everything else in that file (the `useThree`/tone-mapping `useEffect`, the lights) stays exactly as-is.

**(4) The route is `/academy`, NOT `/student/academy`.** Step 4 says open `/student/academy`, but the academy page lives at `apps/web/src/app/(student)/academy/page.tsx` — `(student)` is a Next.js **route group** (parentheses are stripped from the URL). The `pnpm --filter @l3arn/web build` route table confirms the mounted path is `/academy`. So the dev URL is `http://localhost:3000/academy` (default Next dev port), not `/student/academy`. This page is the one that mounts `WorldCanvas` (the 3D world) — confirmed it's the only page importing `world-engine`.

**(5) How to do the Step 4 browser check (headless, objective-first).** Tasks 7 and 8 verified the academy render via **headless Playwright** — follow that precedent (there is a Playwright MCP available; run it headless). Make the pass/fail **objective**, since "reflections visibly differ" is subjective: (a) start `pnpm --filter @l3arn/web dev` (run it backgrounded; it does not exit on its own — don't block on it), (b) navigate to `http://localhost:3000/academy`, (c) confirm the **network request for `/env/great-hall-dawn.hdr` returns HTTP 200** (not 404) — this is the hard, non-subjective proof the asset is served, and it's exactly what Step 4 asks for, (d) confirm the canvas renders with no NEW console errors (the pre-existing N8AO WebGL *warning* from §2 will appear — that is expected, not a regression), (e) capture a screenshot for the PR. Then **stop the dev server**. If `/academy` redirects to auth/login in your environment, check how Tasks 7–8 handled session for their browser checks (they succeeded, so a working path exists) before assuming it's broken — that's a "verify, don't trust" moment, not a dead end.

**(6) The committed HDR is a ~1.4 MB binary in git.** That's expected and fine for this repo (it's a required runtime asset served by Next from `public/`). It is **not** touched by Task 9's asset-gate CI (that only scans `public/models/**/*.glb`; this is `public/env/*.hdr`). Confirm it isn't caught by any `.gitignore` before committing (a quick `git status` after the download should show it as an untracked file, and `git add packages/world-engine/public/env/` should stage both the `.hdr` and `ASSET_MANIFEST.md`). Step 5's `git add` list is complete as written; you should NOT need to add `package.json`/`pnpm-lock.yaml` for this task (no new dependencies — `@react-three/drei` is already installed and `Environment` is already imported).

---

## 5. After Step 5 — before you open the PR

Run the full workspace typecheck to make sure the `Lighting.tsx` edit didn't break types:

```bash
pnpm -r typecheck
```
Expected: all 7 packages `Done`, 0 errors.

Run the `world-engine` test suite to confirm no regression (Task 10 adds no test files and changes one JSX prop + one asset; nothing in `src/**/*.test.ts` exercises `Lighting.tsx`'s Environment prop, so this should be unchanged):

```bash
cd packages/world-engine && pnpm test
```
Expected: still **16/16**.

Run the web build to confirm the app still builds with the changed lighting (and that nothing about the asset path breaks the build):

```bash
pnpm --filter @l3arn/web build
```
Expected: exit 0, full 21-route table (same shape as §2's post-merge baseline).

Do the **browser check** described in §4 note (5) / Step 4 — this is the real point of Task 10 and the one thing typecheck/tests can't prove:
- dev server up, `http://localhost:3000/academy` loads,
- `/env/great-hall-dawn.hdr` network request returns **200** (paste/screenshot it),
- canvas renders, no NEW console errors (pre-existing N8AO warning excepted),
- screenshot captured for the PR,
- dev server stopped.

Then follow §3, steps 3–6: commit, push, open the PR, stop.

---

## 6. What happens next (for whoever picks this up after the PR merges)

Once the project owner merges this PR and confirms post-merge verification (`pnpm -r typecheck`, the world-engine test suite, and `pnpm --filter @l3arn/web build` on the updated `main`) is good, **the next step is Task 11 (Rebuild Great Hall — materials, proportions, warmth)** — the second task of **Phase 1**. Re-read the Honest scope note (§4 above / plan doc line ~1858) before writing the Task 11 handoff: Task 11 upgrades the Great Hall's **materials, lighting response, and proportions within primitive geometry** — a real, visible, honest quality jump — NOT photoreal bespoke models (which this toolchain cannot generate). Keep that framing intact; don't let the Task 11 handoff over-promise.

Whoever does that — write a new handoff document at `docs/superpowers/plans/handoffs/<date>-handoff-task-11.md`, following the exact structure of this document:
- §0: the "verify, don't trust" reminder (keep it — five lessons deep now; add a sixth if Task 10 surfaces its own during execution, e.g. anything about the CDN download, the dev-server asset serving, or the browser check that the plan text couldn't have anticipated).
- §1: project context (can be copied nearly verbatim from this doc; update only the "which task / which phase" framing).
- §2: exact current state — **this section must be freshly verified, not copied**: confirm what's actually on `main` now (`git log origin/main --oneline -5`, confirm Task 10's squash commit is the tip and its merge-commit status is green), create a fresh branch (`feature/3d-academy-task-11`) from the current `origin/main` tip, set up a worktree at `.worktrees/task-11`, and run the same verification sequence (fetch/range-empty, install, dist builds, typecheck 7/7, world-engine tests) to confirm the starting point is healthy before handing off. Also re-check the N8AO known issue status (has it been triaged/fixed/explicitly accepted since?), and confirm Task 10's HDRI actually merged and is served on the deployed site (the `/env/great-hall-dawn.hdr` request returns 200 on the merged `main`, not just locally).
- §3: the gate protocol (copy verbatim — it doesn't change).
- §4: Task 11's full verbatim text, pulled fresh from `docs/superpowers/plans/2026-07-01-3d-academy-phase0-1.md` (search for `### Task 11:`, starts ~line 1928) — don't hand-transcribe from memory, copy it exactly. Task 11 modifies `packages/world-engine/src/scenes/GreatHall.tsx` (and likely materials); read the current `GreatHall.tsx` while writing the handoff and flag any plan-vs-code drift (component names, prop shapes, material APIs) the same way this handoff pre-verified Task 10's `Lighting.tsx` import and the `/academy` route.
- §5: any task-specific post-implementation verification the task calls for (Task 11 will again need a browser check — reuse the headless-Playwright, objective-first approach from §4 note (5) here).
- §6: this same "what happens next" section, updated to point at Task 12.

This pattern (verify fresh state → fresh branch → full task text → pre-verify snippets against real code/tools/URLs → implement → verify (incl. browser) → PR → stop) repeats for every task through Task 17. Do not skip the "freshly verify, don't copy" step in §2 — that exact mistake (trusting stale local state instead of re-checking `origin/main`) is what caused the multi-hour git archaeology this document's §0 warns about.
