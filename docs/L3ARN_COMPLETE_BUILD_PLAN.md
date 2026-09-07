# L3ARN COMPLETE BUILD PLAN

_Canonical planning artifact 5 of 5 and **the execution source of truth** (`docs/L3ARN_MASTER_GOAL.md` §19, §21). Every task names its files, its dependencies, and its gates. Nothing here starts until the founder sends **EXECUTE THE BUILD**. Written 2026-09-07 against `main` @ `85ef14a`._

Companion documents: `L3ARN_COMPLETE_BUILD_ASSESSMENT.md` (why), `L3ARN_GAME_EXPERIENCE_BIBLE.md` (what), `L3ARN_WORLD_ARCHITECTURE.md` (how), `L3ARN_ASSET_MANIFEST.md` + `L3ARN_ASSET_FACTORY.md` (with what).

---

## 0. Ground rules

- One task per PR, bounded branch off `origin/main`, gated by evidence not assertion. Repo protocol: worktree per task, scoped `git add`, never commit on `main` (`~/.claude/CLAUDE.md`).
- Every child-facing task ends with the §18 visual QA loop and screenshots in `docs/qa/<task-id>/`.
- Stop and ask only for: a founder decision, a safety/architecture conflict, missing credentials, a paid purchase. Otherwise continue.
- Migrations: next number is **014**. If PR #38's body is integrated, its `013_lesson_task_skeletons.sql` is renumbered.
- Absolute prohibitions (`MASTER_GOAL` §22) apply to every task and are checked in review.

## 1. Dependency graph

```
P0 Foundation ──┬─► P1 World shell & zones ──┬─► P2 Camera (ADR gate) ──┐
                │                            ├─► P3 HUD grammar ─────────┤
                │                            └─► P4 Companion ───────────┼─► P5 Mission 001 gameplay ─┐
                │                                                        ├─► P6 House Calling ────────┤
                ├─► P7 Audio (manager + UI now; zone ambient after P1) ──┘                            ├─► P10 Perf & a11y ─► P11 Beta gate (Agent 23)
                ├─► P8 Assets (concepts + CC0 now; hero rigs after P4/P6) ────────────────────────────┤
                └─► P9 Hardening: Agent 19 · Agent 20 ─► Agent 21 · Agent 22 (process) ──────────────┘
```

Critical path: **P0 → P1 → P2 → P5 → P10 → P11**. Convergence points (never parallelised internally): P5, P10, P11.

## 2. Phases and tasks

Format: `ID — title` · **Files** · **Depends** · **Gate** (technical / visual / gameplay as applicable).

### P0 — Foundation & hygiene (all parallel-safe, all small)

- **P0.1 — Pause dead-end hotfix** · `apps/web/src/app/(student)/layout.tsx` · — · Gate: Playwright: Pause → `/student/enter?token=…` shows entry (not "Can't enter yet"); session still valid; screenshot. (Cherry-pick `46706b2` if founder picks §M-3(b); else write equivalent.)
- **P0.2 — Companion choice lands in the Academy** · `onboarding/companion/page.tsx:49,66` → `router.push("/student/academy")` (mission is triggered in-world) · — · Gate: first-time child sees the Great Hall before Mission 001; e2e screenshot.
- **P0.3 — E2E harness** · new `tests/e2e/` (Playwright), `playwright.config.ts`, GitHub workflow `e2e.yml` (login with a CI test parent; secrets in repo settings) · — · Gate: green run asserting login→session→entry→academy, canvas ≥ 90 % viewport, zero console errors, N8AO warnings = 0 (fails today → P0.6), visual snapshot baseline committed to `docs/qa/baseline/`.
- **P0.4 — Theme tokens + fonts** · new `packages/world-engine/src/theme.ts` (WORLD, UI, ZONE_ATMOSPHERE, eyebrow/keycap CSS) · `apps/web/src/app/layout.tsx` `next/font/google` (Outfit 800, Instrument Serif 400, Inter) · — · Gate: tokens imported by one scene and one HUD component; fonts self-hosted (no runtime Google request).
- **P0.5 — ADR drafts** · new `docs/ADR/ADR-004-supersede-first-person-default.md`, `ADR-061-staged-fidelity.md`, `ADR-062-physics-deferred.md`, `ADR-063-companion-voice.md`, `ADR-064-student-world-prefs.md`; rows in `ADR-000-index.md` · — · Gate: files exist, index updated, **ADR-004-supersede marked "awaiting founder sign-off"**.
- **P0.6 — N8AO warning flood** · `render/PostProfiles.tsx`, `package.json` (`n8ao`/`@react-three/postprocessing` bump) · — · Gate: console warnings on Academy load = 0 on MED; N8AO HIGH-only if the bug persists; screenshot shows AO still present on HIGH.
- **P0.7 — PR #38 disposition** · per §M-3 · — · Gate: decision recorded in `docs/decisions/2026-09-pr38.md`; if (a), migration renumbered to `014_lesson_task_skeletons.sql` and full suite green after merge.
- **P0.8 — Delete/guard `/api/missions` full-compile route** · `services/ai-workers/src/routes/mission.route.ts`, `index.ts:104` · per §M-9 · Gate: route removed or founder-gated; no web caller (`git grep`).

### P1 — World shell & zones (W-World + W-UI)

- **P1.1 — Full-bleed shell** · `(student)/layout.tsx` (remove header; fixed canvas layer; `HudLayer` mount), `academy/page.tsx` (becomes HUD state), new `apps/web/src/features/hud/HudLayer.tsx` · P0.4 · Gate: canvas = 100 % viewport at 4 sizes; HUD `pointer-events:none` except controls; no header; screenshot vs `A1`.
- **P1.2 — Scene registry + transitions** · new `scenes/registry.ts`, `render/SceneTransition.tsx`; `WorldCanvas.tsx` switch → registry; `types.ts` `SceneKey` union · P0 · Gate: swap scene → 300 ms fade to fog colour; camera lands on spawn; unit test.
- **P1.3 — Zone system + atmosphere** · new `systems/zones.ts`; `render/Lighting.tsx` zone-parametrised from `ZONE_ATMOSPHERE`; store `currentZone` · P0.4, P1.2 · Gate: crossing a boundary changes fog/sky over 2 s; fog == sky at horizon (pixel sample); event emitted once; debounce test.
- **P1.4 — Academy Grounds exterior** · new `scenes/AcademyGrounds.tsx`, `objects/Ground.tsx` (noise + vertex colours), `objects/Scatter.tsx` (seeded `InstancedMesh`), `objects/BackdropRing.tsx`, `objects/Signpost.tsx`; Great Hall doors (`objects/Door.tsx`) · P1.2, P1.3 · Gate: two reloads → **pixel-identical** screenshot (determinism); ≤ 40 draw calls; canopy dapple visible (`C2`); no terminator visible (fog `far` swallows edge); screenshot vs `B2`/`C1`.
- **P1.5 — Interaction system + affordance** · new `systems/interaction.ts`, `objects/Interactable.tsx`, `objects/GlowPuddle.tsx`; `SortingComputer.tsx` migrated; store `focusedInteractableId`, `contextualVerb` · P1.1 · Gate: hover/approach shows puddle pulse + bottom-centre verb; `E`/click fires `object-interact`; comfort-click path works; unit tests for focus resolution.
- **P1.6 — Entry screen over the live world** · `enter/page.tsx` → overlay component in HUD layer per `B1` (scrim, eyebrow, display name, CTA with `⏎` keycap); CTA hides overlay, no navigation · P1.1 · Gate: world animating behind entry; pressing Enter never changes route; screenshot vs `B1`.

### P2 — Camera & controls (W-World) — **blocked on ADR-004 supersession sign-off**

- **P2.1 — `cameraMode` + rig exclusivity** · `state/worldStore.ts`, `WorldCanvas.tsx` · P1 · Gate: unit test "exactly one rig mounted" for all three modes; switching never leaves two controllers.
- **P2.2 — `FirstPersonRig`** · new `render/FirstPersonRig.tsx`, `systems/velocityMovement.ts` (ECS), keyboard ref hook · P2.1 · Gate: pointer lock engages/releases; looking down does **not** slow movement (test: speed with pitch −80° == speed at 0°); Y == terrain+1.45 after 60 s walk (drift 0); walk 2.6 / run 4.4 m/s measured; e2e walks forward 5 s and player moved.
- **P2.3 — Collision** · new `systems/collision.ts`; `GreatHall.colliders`, `AcademyGrounds.colliders` · P2.2 · Gate: cannot walk through walls/tables; slides along; unit tests.
- **P2.4 — Comfort layer** · pause menu sliders (sensitivity, invert-Y, head-bob off, vignette), `prefers-reduced-motion` → `comfort-click`, `FX-10` vignette overlay, "Click to look around" plate · P2.2, P3.1 · Gate: emulate reduced motion → `cameraMode === 'comfort-click'`; settings persist server-side (P2.6); head-bob off by default (test).
- **P2.5 — `ThirdPersonRig` on `V`** · new `render/ThirdPersonRig.tsx`; `PlayerAvatar` visible in third-person · P2.2 · Gate: toggle round-trips with no camera fighting; character in lower-centre third (screenshot vs `C1`).
- **P2.6 — Preferences persistence** · migration `014_student_world_prefs.sql` (RLS: parent read own child; service_role write), route in `student-session.route.ts`, `student-session.ts` client, `shared-types` schema · P2.1 · Gate: prefs survive reload and device; RLS verified as parent A vs parent B (live); `localStorage` never read for prefs (grep).
- **P2.7 — Touch input** · HUD on-screen stick + tap-to-interact; device defaults (tablet third-person, phone comfort-click) · P2.5, §M-7 · Gate: Playwright mobile emulation completes entry→hall→interact.

### P3 — HUD grammar (W-UI)

- **P3.1 — HUD shell (eight laws)** · `features/hud/*`: `Lockup`, `Breadcrumb`, `Focus`, `Pills`, `Keycaps`, `Satchel`, `XpRail`, `Toast`, `PauseMenu` (over blurred live world, Resume/Camera/Sound/Ask a grown-up) · P0.4, P1.1 · Gate: visual diff vs `C1`/`B2`; no element in the centre except toasts; keycaps present in every state; pause menu screenshot vs `B4`.
- **P3.2 — Zone card** · `features/hud/ZoneCard.tsx` · P1.3 · Gate: fires once on entry, 240 ms in / 4 s hold; debounced 60 s (test); screenshot vs `D1`.
- **P3.3 — Choice-card modal** · `features/hud/ChoiceModal.tsx` (`B3`: blur 14 px, scrim tinted to zone fog, 3–4 cards, key badges, keys 1–4 bound) · P0.4 · Gate: keys select; world legible and animating behind; keyboard-only completion; screenshot vs `B3`.
- **P3.4 — Narration player** · `features/hud/NarrationPlayer.tsx` (`A3`: cream card, eyebrow, serif title, progress, Pause, **Transcript**) · P0.4 · Gate: transcript renders exact line text; fully keyboard reachable; screenshot vs `A3`.
- **P3.5 — Developmental tier copy system** · `features/copy/tiers.ts` (K–2 / 3–5 / 6–8 variants), used by HUD/mission/ceremony · P3.1 · Gate: unit test: a Grade K line ≤ 8 words, Grade 4 ≤ 14; no `A)`–`D)` or numbered lists anywhere in child copy (lint rule).

### P4 — Companion as character (W-Companion)

- **P4.1 — Companion entity + controller** · new `entities/companion.ts`, `systems/companionController.ts`, `objects/Companion.tsx` (procedural stand-ins for Spark and Luna) · P1.5 · Gate: follows at 1.5–3 m, never blocks path, teleports when > 12 m (tests); state machine tests for all 12 states; looks at player / objective (screenshot).
- **P4.2 — Dialogue contract** · `packages/shared-types` (`companionDialogue` → array ≤ 5), `mission-compiler` prompt v3d-0.3.0 + fallback + tests (name fidelity test kept), `mission-runtime.ts` · P4.1 · Gate: compiler tests green; live start returns ≤ 5 lines; companion never renamed (test).
- **P4.3 — Companion speaks** · lines → `NarrationPlayer`; scripted line bank per state; captions · P3.4, P4.2 · Gate: every voiced/shown line has a transcript entry; screenshot in world.
- **P4.4 — Optional TTS** · `audio/tts/<provider>Adapter.ts` behind parent flag (`child_permissions.audio_enabled` governs output too, or a new column — ADR-063) · P7.1, §M-5 · Gate: flag off → no network call (test); flag on → audio + caption + transcript match exactly.
- **P4.5 — Founder companion overlay** · `features/hud/CompanionStateOverlay.tsx` gated on role · P4.1 · Gate: never renders for a child session (test).

### P5 — Mission 001 as gameplay (W-Mission) — convergence

- **P5.1 — Headless controller extraction** *(can start Day 1)* · new `features/mission-001/useMission001Controller.ts`; `MissionExperience.tsx` slimmed to presentation · — · Gate: **regression**: scripted completion through the controller writes identical evidence/complete payloads (snapshot test of request bodies) and live completion still yields +25/+75/+15/+20 + 2 badges + 5 mastery skills.
- **P5.2 — Mission objects** · `objects/Crystal.tsx` (3 shapes/glyphs), `objects/Bin.tsx`, `SortingComputer.tsx` 6 states + `Lever`, `objects/Plaque.tsx`; VFX FX-01..03 · P1.5 · Gate: states switch visibly; sparks on `broken`; screenshots per state.
- **P5.3 — Broken arrival** · `GreatHall.tsx` mission-pending state (dimmed light banks, scattered crystals, machine sparking), companion reaction line · P4.3, P5.2 · Gate: a child with no completed mission sees the malfunction on arrival; screenshot; video of sparks.
- **P5.4 — Pick–carry–place** · `systems/carry.ts` (kinematic follow), snap zones, accept/reject feedback, comfort-mode assisted toss, evidence via controller · P2, P5.1, P5.2 · Gate: correct placement → snap + pulse + light bank + chime + companion cheer + `decision-log`/`sequence-completion` evidence identical to today; wrong → gentle reject + hint; completable in all three camera modes and with keyboard only.
- **P5.5 — Sequencing levers** · `Lever` interactables; out-of-order sparks + reset · P5.4 · Gate: evidence emitted; hint after 2 failures (core tier).
- **P5.6 — In-world AI Mistake Check** · machine announces result; wrong crystal flickers; correction → plaque lights, machine line "You're right. I was wrong." · P5.4 · Gate: `AI-mistake-check` evidence identical; plaque screenshot; video.
- **P5.7 — Explain + Reflect** · `ChoiceModal` with tiered response modes (pick-a-picture / sentence assembly / selectable / short text) · P3.3, P3.5 · Gate: evidence identical; keyboard-only; no `A)`–`D)`.
- **P5.8 — Completion ceremony** · light sweep FX-05, banner unfurl FX-06, reward motes MO-05 → XP rail, badge art MO-06 on satchel, holding rise (EN-07 animation), companion celebrate · P5.4, P3.1 · Gate: rewards/mastery/report writes unchanged; video captured; no "Nice work!" dashboard card; badges never shown as raw keys.
- **P5.9 — World persistence** · holdings response `worldFlags`; hall renders repaired/lit on return · P5.8 · Gate: reload → machine repaired, banner lit; parent B's child unaffected (RLS live check).
- **P5.10 — Lite/offline delivery modes** · DOM card restyled to choice-card grammar over the mounted world for `interactive-lite`/`text-audio-offline` · P3.3, P5.1 · Gate: both modes complete with identical evidence; screenshot shows world behind.

### P6 — House Calling ceremony (W-Ceremony)

- **P6.1 — Calling Chamber scene** · new `scenes/CallingChamber.tsx`, banners (FX-06), dais, fog/light shaft, door from Great Hall · P1.2, P1.3 · Gate: transition from hall; atmosphere token; screenshot vs `E1` for fog identity.
- **P6.2 — Lore preview in-world** · banner approach → light + creature billboard manifest FX-07 + motto (narration) + growth-challenge plaque · P4.3, P6.1 · Gate: all four Houses reachable by walking; content strings unchanged from `onboarding/house/page.tsx` (test compares).
- **P6.3 — Trial as choice modals** · 7 questions via `ChoiceModal`; banners pulse toward the leaning House (tally never revealed) · P3.3 · Gate: question/answer strings identical to current; keyboard-only; scoring logic moved unchanged (unit test parity).
- **P6.4 — Recommendation reveal** · fog drop, banner blaze, creature descends, `YOUR CALLING · Novari.`; Accept / Choose differently (walk to another banner) · P6.2 · Gate: system recommends, child chooses (test both paths); video.
- **P6.5 — Oath** · line-by-line affirm, colour flood FX-08, creature roar/sing · P6.4 · Gate: `POST /api/student/session/house` payload unchanged; transfer lock intact (re-entry cannot overwrite — existing rule, test).
- **P6.6 — Companion unlock in the Grove** · `scenes/CompanionGrove.tsx`, companions as characters, walk-to-choose · P4.1, P6.5 · Gate: `POST /api/student/session/companion` unchanged; then → Great Hall with lit banner and sparking machine (P5.3).
- **P6.7 — Retire DOM ceremony pages** · `onboarding/house/page.tsx`, `onboarding/companion/page.tsx` become thin route shells that open the in-world ceremony state · P6.6 · Gate: deep link still works; no DOM-only path remains.

### P7 — Audio (W-Audio)

- **P7.1 — AudioManager + UI sounds** · new `audio/AudioManager.ts`, `audio/sfx.ts`, captions channel; Pause sound controls · P0 · Gate: muted until gesture; buckets independent; every UI action has a sound; captions render.
- **P7.2 — Zone ambient + spatial emitters** · per-zone loops, `PositionalAudio` on hearth/machine/creatures · P1.3, P7.1 · Gate: crossfade on zone change; emitter attenuates with distance (test via analyser).
- **P7.3 — Mission/ceremony SFX** · AU-05..08 wired to events · P5, P6 · Gate: every beat in the Bible tables has a sound; licence register complete.

### P8 — Assets (W-Assets)

- **P8.1 — Concepts + turnarounds** *(Day 1)* · `docs/art/concepts/{CH-02,CH-03,CR-01..04,UI-02,UI-03,MO-06}` · §M-6 · Gate: sheets + prompts committed; founder picks.
- **P8.2 — CC0 sourcing** *(Day 1)* · HDRIs, Lucide icons, fonts, audio · — · Gate: manifests/licences recorded.
- **P8.3 — Hero rigs** · GLB for CH-02/03, CR-01..04 per Factory §3 · P8.1, P4.1, P6.2 · Gate: budget gate green; clips named per state; in-engine QA screenshots; replaces procedural stand-ins with no controller change.
- **P8.4 — Fidelity uplift** · Sorting Computer, banners, avatar to stylized-realism; PBR/KTX2 introduced; ADR-061 · P8.3, P5, P6 · Gate: LOW tier still holds FPS floor; asset gate gating real files.

### P9 — Pre-Beta Hardening (W-Backend, W-Process) — incorporated, not separate

- **P9.1 — Agent 19** · per `docs/superpowers/plans/agent-19-ai-reliability-hardening.md` (as corrected 2026-09-07): **measure first** (≥ 20 real `compileStart` runs on production config; min/median/p90/p95/max; provider vs validation latency; and separately `compile()` if §M-9 keeps it) → recommend timeout from p95 + margin (30 s is *not* pre-approved even though it is the current default) → backoff 500/1000 ms → resolve `ai-retry.helper.ts` duplication. Preserve 3-attempt cap, fallback, `maxRetries: 0`, short-circuit. · Day 1 · Gate: plan's DoD.
- **P9.2 — Agent 20** · containment enforcement (`014/015_child_containment_state.sql`, stricter-wins resolver, `end-session` fail-closed, founder restoration) · P9.1 · Gate: plan's DoD incl. live S3 induction and `child_permissions` byte-identical.
- **P9.3 — Agent 21** · parent-safe notice surface + report rendering; A0 already satisfied (PR #41) and must stay satisfied · P9.2 · Gate: plan's DoD incl. founder copy sign-off.
- **P9.4 — Agent 22** · `docs/demo/*` instrument; founder walkthrough logged · Day 1 · Gate: plan's DoD; docs-only.

### P10 — Performance & accessibility (convergence)

- **P10.1 — Budgets** · draw calls ≤ 40/zone, tris, GLB, texture memory, dispose on scene exit (no leak across 10 transitions) · all · Gate: measured on LOW/MED/HIGH tier emulation; FPS floor 30/60 for 60 s.
- **P10.2 — Accessibility** · keyboard-only full run; reduced motion; captions; non-colour cues; type sizes; targets ≥ 44 px; tablet/phone deliberate paths · all · Gate: axe pass on HUD; manual keyboard run recorded.
- **P10.3 — Full regression** · 16-step Hero Slice on production **after** all phases; console clean; e2e suite green · all · Gate: recorded.

### P11 — Beta gate

- **P11.1 — Agent 23** · `docs/BETA_READINESS_CHECKLIST.md` A–J executed with evidence; `BETA_READINESS_VERDICT.md`; founder walkthrough (Agent 22) complete; readiness labels updated · P10, P9 · Gate: READY / NOT READY with per-item recommendations. **Agent 23 gates the whole build.**

## 3. Parallel workstreams and owners

| Stream | Tasks | Starts | Owns (write authority) |
|---|---|---|---|
| W-QA | P0.3, all gates | Day 1 | `tests/e2e/**`, `docs/qa/**` |
| W-World | P1.2–1.5, P2.*, P5.2 | Day 1 | `packages/world-engine/src/{render,systems,scenes,objects,core}/**` |
| W-UI | P0.4, P1.1, P1.6, P3.* | Day 1 | `apps/web/src/features/hud/**`, `(student)/layout.tsx`, `theme.ts` |
| W-Companion | P4.* | after P1.5 | `world-engine/src/{entities,systems/companionController}`, `features/hud/NarrationPlayer` (shared with W-UI — interface first) |
| W-Mission | P5.1 Day 1; P5.3–5.10 after P1–P4 | Day 1 | `apps/web/src/features/mission-001/**`, `MissionExperience.tsx`, `scenes/great-hall/mission001/**` |
| W-Ceremony | P6.* | after P1, P3, P4.3 | `scenes/CallingChamber*`, `scenes/CompanionGrove*`, `onboarding/**` |
| W-Audio | P7.1 Day 1; P7.2–7.3 later | Day 1 | `world-engine/src/audio/**`, `public/audio/**` |
| W-Assets | P8.1–8.2 Day 1; P8.3–8.4 later | Day 1 | `docs/art/**`, `public/{models,ui,env}/**` |
| W-Backend | P0.8, P2.6 (server side), P5.9 (server side), P9.1–9.3 | Day 1 | `services/ai-workers/**`, `packages/{mission-compiler,safety,shared-types}/**`, `supabase/migrations/**` |
| W-Process | P0.5, P0.7, P9.4, P11 | Day 1 | `docs/**` (excluding `docs/qa`, `docs/art`) |

## 4. Shared-file collision risks

| File | Streams | Rule |
|---|---|---|
| `packages/world-engine/src/WorldCanvas.tsx` | World, UI, Companion, Audio | World owns; others add via registry/hook slots defined in P1.2 first |
| `packages/world-engine/src/state/worldStore.ts` | all | additive slices only; one PR per slice; no renames of existing fields |
| `packages/world-engine/src/scenes/GreatHall.tsx` | World, Mission, Companion, Ceremony | World owns geometry; Mission adds `mission001/` subtree via a single mount point; Ceremony adds doors only |
| `apps/web/src/app/(student)/layout.tsx`, `academy/page.tsx` | UI, Mission | UI owns; Mission consumes `HudLayer` slots |
| `MissionExperience.tsx` | Mission only (and PR #38 body if integrated — decide **before** P5.1) | |
| `apps/web/src/lib/student-session.ts` | Mission, Backend, World (prefs) | append new functions; never change existing signatures |
| `packages/shared-types/src/*.schema.ts` | Backend, Companion, Mission | Backend owns; consumers open a schema PR first, build second |
| `package.json` (root/web/world-engine) | Audio, Assets, World (n8ao) | one dependency PR at a time; `pnpm-lock.yaml` regenerated, never hand-merged |
| `supabase/migrations/` | Backend only | sequential numbering from 014; P9.2 and P2.6 coordinate numbers up front |

## 5. Acceptance criteria (summary — each task above carries its own)

**Technical:** typecheck green across the workspace; unit/contract tests green; e2e green; zero console errors; N8AO warnings 0; canvas 100 % viewport; exactly one camera rig; no `Math.random()` in world generation; no `localStorage` authority; RLS unchanged or strengthened; evidence/reward/report payloads byte-compatible for Mission 001.

**Visual:** compared against `docs/references/target/` per milestone; no dead space; no SaaS chrome; no centred card on a void; fog == sky at horizon; no pure-black shadows; keycaps visible; two-tier labels; modals blur the live world; screenshots (+ video for animation) in `docs/qa/<task>/`.

**Gameplay:** child stands in the world at eye height (or chosen comfort mode); every learning action is a world interaction completable in all three camera modes and keyboard-only; correct/incorrect produce world feedback ≤ 100 ms; companion present and reacting; completion visibly transforms the hall and persists; House Calling is walked, not clicked.

**Safety (every task):** no webcam/mic; unvalidated AI never reaches the child; `child_permissions` never overwritten; founder tables never parent-readable; sessions backend-mediated.

## 6. Gates

- **Browser QA (per child-facing task):** §18 ten-step loop, evidence committed.
- **Tests:** vitest (world-engine), jest (mission-compiler), Playwright e2e, controller regression snapshots, RLS live checks where a table changes.
- **Performance (P10 and any task adding geometry/VFX):** ≤ 40 draw calls/zone; FPS floor 30 LOW / 60 HIGH for 60 s; GLB budget CI; no memory growth across 10 scene transitions.
- **Production (before any deploy):** Vercel preview green; Railway env contracts documented (`MISSION_AI_TIMEOUT_MS`, `MISSION_START_MODEL`, `ANTHROPIC_MODEL`, TTS key if adopted); rollback path stated; migrations applied to Cloud Supabase **and** in repo.
- **Beta readiness:** Agent 23 checklist A–J + founder walkthrough. Not passable by automated tests alone (`MASTER_GOAL` §24).

## 7. Definition of done (the build)

All phases' gates green; the 16-step Hero Slice re-verified on production post-build; `docs/references/current-bad/` patterns absent from a fresh capture set (`docs/qa/final/`) judged against `docs/references/target/`; Agents 19–21 complete and independently re-verified; Agent 22 instrument used by the founder; Agent 23 verdict written; `CODEX_HANDOFF.md` §3 labels updated; and the founder's own answer to §23 — *does a child feel they entered somewhere, want to move, feel the companion, see the world respond, and want to come back* — is yes.

## 8. Founder decisions gating execution

From `L3ARN_COMPLETE_BUILD_ASSESSMENT.md` §M — the plan proceeds under these defaults until overruled:

| # | Decision | Default assumed here | Blocks |
|---|---|---|---|
| 1 | ADR-004 supersession (first-person default + comfort layer) | proposed yes | **P2 merge** |
| 2 | Staged fidelity (Style Lock B → stylized-realism) | yes | P8.4 |
| 3 | PR #38 body | (b) cherry-pick Pause fix now; decide (a) before P5.1 | P0.7, P5.1 |
| 4 | Companion roster | Spark + Luna ship; others later | P8.1 |
| 5 | Companion voice | text + transcript v1; TTS behind flag if provider named | P4.4 |
| 6 | Concept-art tool | founder names it | P8.1 |
| 7 | Touch defaults | tablet third-person, phone comfort-click | P2.7 |
| 8 | Multiplayer & Mission 002+ | out of this build (follow-on tracks) | scope |
| 9 | `/api/missions` full compile | delete | P0.8, P9.1 scope |

## 9. Execution command

On **EXECUTE THE BUILD**: start P0.1–P0.8 in parallel worktrees; W-QA lands P0.3 first so every later PR is gated; P5.1 and P9.1 begin the same day; P1 follows P0.4/P0.3; P2 waits only for the ADR-004 signature. Continue through the graph unless a founder decision, a safety/architecture conflict, missing credentials, or a paid purchase stops a task — then stop that task, ask, and continue the others.
