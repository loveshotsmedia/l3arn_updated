# L3ARN COMPLETE BUILD ASSESSMENT

_Required by `docs/L3ARN_MASTER_GOAL.md` §20. Written 2026-09-07 against `main` @ `85ef14a` and the live production deployment. Every claim below was verified by reading the code on `main`, by measuring the live app with Playwright, or by both — not from prior documentation. Where prior documentation is wrong, this says so._

**Evidence set:** `docs/references/current-bad/` (35 live captures + console log, indexed in its README) · `docs/references/target/` (14 reference frames, indexed in its README).

---

## A. Current Product Reality

### Genuinely complete (verified live, 2026-09-07)

| Capability | Evidence |
|---|---|
| Parent auth → dashboard → Start Session → child token → child entry | Walked live; `01`–`02` captures. Backend-mediated, `sessionStorage` identity, fail-closed verify. |
| Great Hall renders as a real scene | `03-academy-first-load.png`. 13 procedural object modules, HDRI IBL + hemisphere + one shadow sun, ACES tone mapping, dust motes, N8AO + Bloom in explore mode. **Canvas fills 93 % of viewport at 1440×900 and 91–93 % at 1280×720 / 1024×768 / 390×844** (`31-*`). |
| Two-modes law (explore ↔ mission) | `worldStore.worldMode`, `PostProfiles.tsx` strips post-processing in mission mode, `missionMode.ts` controller with tests. |
| Device tiers + FPS governor + DPR caps | `packages/world-engine/src/device/deviceTier.ts`, tested. |
| Asset-budget CI gate | `.github/workflows/asset-gate.yml` → `scripts/check-glb-budget.mjs` (gltf-transform). Zero GLBs exist yet, so it has never gated anything real. |
| Mission 001 start with real AI in < 6 s | `05` capture: "Preparing your mission…" → briefing in under 6 s. `compileStart()` streams on `MISSION_START_MODEL` (haiku) with `AbortController`, `maxRetries: 0`, non-retryable short-circuit (`e2c7768`, `22e0599`). |
| Mission 001 learning logic, evidence, calibration, rewards | Walked all 6 steps live; completion wrote **+25 Moolah, +75 XP, +15 House Points, +20 Companion Bond, 2 badges** — matches `CODEX_HANDOFF.md` §12. Parent report then showed 5 mastery skills with evidence counts and calibration (`16`). |
| House Calling content and rules | Walked live for QuasarKid3 (`17`–`29`): intro → four Houses → 7-question trial → recommendation (Novari) → child may override → oath → accepted → companion chamber. Four Houses only, system recommends, child chooses, transfer-locked. |
| Mastery-gated holding unlock | `MasteryBuilding` "fractions-observatory" in `GreatHall.tsx`, `GET/POST /api/student/session/holdings`, migration `013_world_holdings.sql`. |
| Parent report (First Learning Map) | Parent-friendly skill names, evidence counts, calibration, rewards, next-step. Tier copy now truthful ("Full detail shown.") after PR #41. |
| Founder Mission Control | Server-rendered, service-role, founder-gated, de-identified (Phase C handoff). |
| Safety detection + logging | `safety.middleware.ts` classifies, blocks S2+, kill switch on S4, `contain()` on S3/S4 → `audit_logs` + `safety_escalations`. |

### Only technically wired (exists in code, does not deliver the experience)

| Thing | Reality |
|---|---|
| "3D mission" | Mission 001 is a **1,244-line DOM component** (`MissionExperience.tsx`) rendered in a 720 px card. Each sort step is **one button** ("Red Bin — click to sort"). AI Mistake Check and Reflection are **A/B/C/D quizzes**. The world behind it is blurred and inert (`06`–`11`). |
| In-world mission | Only for *returning* children. After companion choice, `onboarding/companion/page.tsx:49,66` pushes to the **standalone** `/student/mission/mission-001` route — the first-time child's first mission has **no world behind it at all** (`30`). |
| Companion | Two emoji cards (Spark ⚡, Luna 🌙) in a 108-line page. The compiler generates **exactly one** `companionDialogue` line, "on-start", which the prompt itself says "is not rendered on the briefing screen." In the world engine the word "companion" appears only in `GroveNook.tsx` (a nook object) and the store. **There is no companion character anywhere in the 3D world.** |
| House Calling as ceremony | 1,075-line DOM page, zero Three.js. Creature slots are **blurred placeholder blobs** (`18`). The reveal is a green word in a card (`26`). |
| Safety containment | Logged only. `supabase-safety-containment.ts:16-18`: "Actions … are logged only (not enforced)." Agent 20's mandate. |
| Parent safety notices | None. Agent 21's mandate. The false "safety-flagged events are surfaced" copy was removed today (PR #41). |
| Audio | **None anywhere.** No TTS, no `AudioContext`, no Howler, no `<audio>`. Not even UI sounds. |
| World response to learning | After "Return to the Academy" the Great Hall is pixel-identical to before the mission (`14` vs `03`). The holding unlock writes data; nothing celebrates it. |
| Pause | `layout.tsx` `handlePause()` → `router.push("/student/enter")` → **"Can't enter yet"** dead end; session lost (`15`). |

### Documentation that is wrong and must not be planned against

1. **`L3ARN_3D_WORLD_IMPLEMENTATION_SPEC.md` Part 0 / Part 1 is stale.** It describes "a 30×30 plane, four boxes for walls … a 150-pixel-tall canvas … no sky and no fog." None of that is true on `main`: visual passes 1–9 (`86fd86d` … `81ee1cd`) added the canvas-strip fix, HDRI sky background, `Fog`, walls, runner, hearth, tables, chandeliers, tapestries. **Its Defect 1 does not reproduce** (measured). Its Parts 2–8 (camera, style lock, HUD laws, screen specs, tokens) remain valid and are adopted below.
2. **`CODEX_HANDOFF.md` §3/§23 "~66 s generation"** is the *full six-section `compile()`*, reachable only via `/api/missions` (`mission.route.ts:116`) which **the web app never calls**. The live path is `compileStart()` at 5–7 s (haiku) / ~13.6 s (sonnet), measured in `22e0599`.
3. **`AI_HARDENING_BACKLOG.md` items 1–2 are half-stale.** Timeout via `AbortSignal` and `maxRetries: 0` **already exist on `main`** (`compiler.ts:124,349,393-396,544,573,595-597`; default `DEFAULT_AI_TIMEOUT_MS = 30_000`, env `MISSION_AI_TIMEOUT_MS`). What is genuinely missing: retry **backoff** (`retry-engine.ts:23-26` still says "Currently no delay"), and resolution of the duplicate `packages/safety/src/retry/ai-retry.helper.ts`. Agent 19's plan has been corrected accordingly (see its Current State table).
4. **PR #38 ("Adaptive lesson runtime", 37 commits) is marked MERGED but merged into `docs/3d-academy-world-spec`, not `main`.** Its Pause fix (`46706b2`), its lesson-task-skeleton migration and the adaptive runtime **are not in production**. Its migration is numbered `013_lesson_task_skeletons.sql`; `main` has `013_world_holdings.sql` — a **migration-number collision** awaits whoever integrates it.

---

## B. Current Child Experience Problems

Specific, from the live captures:

1. **The world is a lobby, not a place.** A child enters, sees a handsome isometric hall, and the only thing to do is click one glowing object. No exploration reward, no zones, no signposts, no scale beyond one room.
2. **The child never stands in the world.** Sims-style orbit at 8–30 m; `mouseButtons.left/right = NONE`. There is no eye-height, no look, no walk. Movement is an exponential lerp toward a click.
3. **Mission 001 is a worksheet in a modal.** Briefing lists tasks as a numbered checklist ("Drag the red crystals into the red bin") while the actual interaction is a single button. Three sort steps are three identical single-button screens. Two of six steps are multiple-choice quizzes. ~40 % of each card is dead space.
4. **Nothing in the world reacts.** The Sorting Computer never sparks, flickers, repairs or lights up. Completion is four stat tiles and raw badge keys (`mission-001-complete`). Return to the hall: identical scene.
5. **The companion does not exist as a character.** Chosen as an emoji; appears in missions as a generic avatar glyph beside italic text; one AI line generated and discarded.
6. **House Calling is a survey.** Seven A/B/C/D screens then a green word. The strongest content in the product (four Houses, creatures, mottos, growth challenges, oath) is delivered as pricing-page cards with blurred blobs where creatures belong.
7. **First-time flow skips the Academy entirely.** Companion choice → standalone mission page → "Return to the Academy" is the first time the child sees the Great Hall.
8. **Persistent SaaS chrome.** 62 px header with a brand string and a `Pause` button that is a dead end.
9. **Two blank wait states** ("Preparing your mission…", "Saving your progress…") with no companion, no world cue, no progress.
10. **Silence.** Zero audio of any kind.
11. **Portrait is an accident.** The camera framing at 390×844 shows floor and a table; nothing was designed for it.
12. **Copy is adequate but not child-native.** "The Sorting Machine in the Great Hall has mixed up all the colored crystals! Can you help sort them back into the right bins before the Academy runs out of power?" is fine once; the trial and quizzes read as tests.

---

## C. World Engine Assessment

### Reusable as-is (do not rebuild)

- **Package shape and stack:** `@react-three/fiber` 9.1, `drei` 10, `three` 0.171, `camera-controls` 3, `koota` ECS, `zustand` 5, `postprocessing` 6.39 / `@react-three/postprocessing` 3. Current, correct, keep.
- **`Lighting.tsx`** — HDRI IBL with visible sky, hemisphere bounce lifting shadows to colour, single 2048 shadow sun, ACES. Close to right; parametrise per zone, don't rewrite.
- **`deviceTier.ts` + FPS governor + `TIER_DPR_CAP`** — the performance tiering the master goal §17 asks for already exists.
- **`PostProfiles.tsx`** and the explore/mission mode controller with tests.
- **ECS core** (`core/world.ts`, `clock.ts`, `SimLoop.tsx`) — fixed-step simulation, tested. Movement, heading, motes, flicker as systems.
- **All 13 object modules + `proceduralTextures.ts`** — hall architecture, hearth, chandeliers, tables, shelves, tapestries, torches, dust motes. This *is* the Great Hall dressing and it is good.
- **`SortingComputer.tsx`** dispatch contract (`object-interact` event + `enterMissionMode()`).
- **Holdings** (`MasteryBuilding`, store hydration from Railway).
- **`WorldEvent` / `SceneKey` types** and the `WorldCanvas` prop contract.

### Must change

| What | Why | How (summary; detail in `L3ARN_WORLD_ARCHITECTURE.md`) |
|---|---|---|
| Camera model | No first-person, no eye height, no look | `cameraMode` in store; `FirstPersonRig`, `ThirdPersonRig`, keep `CameraRig` as `comfort-click`; exactly one rig mounted |
| Movement | Exponential lerp to click target only | Add velocity-based WASD movement system in the ECS; keep click-to-move for comfort mode |
| Collision | None | Per-scene AABB list, reject-and-slide; no physics engine in v1 |
| Interaction | One clickable object, bare | Raycast interaction system with hover affordance (glow puddle), contextual verb, `E` to interact |
| Scenes | One scene, hard-swap | Scene registry + transition system (fade), zone boundaries, per-zone atmosphere tokens |
| Canvas layering | Canvas inside a flex column under a header | `position: fixed; inset: 0` canvas layer; HUD layer `pointer-events: none` with per-control re-enable; header removed |
| Mission runtime coupling | DOM component owns the mission; world is decorative | In-world mission state machine drives crystals/bins/machine; `MissionExperience` logic (start/complete/evidence/calibration calls) extracted into a headless controller the world consumes |
| Companion | Absent | Companion entity + controller (follow, look-at, point, states) + narration player with Transcript |
| Audio | Absent | Audio manager (WebAudio via `three` `AudioListener`/`PositionalAudio`), ambient + UI + spatial, captions |
| N8AO warnings | 186 `glBlitFramebuffer` warnings per load | Upgrade `n8ao`/postprocessing or disable `N8AO` on LOW/MED; verify visually |

### Keep but re-home

- `MissionExperience.tsx` pedagogy: task sequencing, AI-mistake logic, explanation options, `tryCapture` evidence calls, `updateCalibration`, `unlockHolding`, dual-mode (route + overlay). Preserve every API call and every evidence event; change only where the child acts.

---

## D. Visual Quality Gap

Against `docs/references/target/`:

| Dimension | Target (frames) | L3ARN today | Gap |
|---|---|---|---|
| Presence | A1: first-person at street level, buildings tower, horizon fades | Isometric doll-house view from 8–30 m | Total — a camera-model change, not an art change |
| Full-bleed | A1/B1/C1: world to every edge, HUD floats | 93 % canvas + 62 px header bar + hint pill | Small in pixels, large in feel — remove header, float HUD |
| Atmosphere | E1: fog hue = identity; C2: dappled shadow; A1: horizon haze | Interior hall with warm fog and HDRI sky through roof — **already decent indoors**; no exterior, no zones, no per-zone palette | Medium — build the zone/atmosphere table; the lighting rig is close |
| Scale | C3/D1: world continues past the frame | One room, walls at 10 units | Large — exterior grounds + backdrop ring + additional zones |
| HUD grammar | A1/B2/G1: lockup, eyebrow labels, pills, keycaps, big numerals | Brand string + Pause + one hint pill | Total — but cheap (CSS + tokens) |
| Modals | B3/B4: blur(14px) world still animating, three cards, key badges | blur(6px) + 720 px card, world quieted | Medium — restyle, raise blur, bind keys 1/2/3 |
| Entry | B1: live world as page background, CTA hides overlay | Dark card, then route change, then world | Medium — mount world under entry overlay |
| Companion | A3: cream narration card, progress bar, Pause/Transcript | Italic text with an avatar glyph | Total |
| Animation density | B2: grass sway, chest glow pulse, character run cycle | Dust motes, torch flicker, avatar heading | Large — VFX, animated companion, machine states |
| Interaction feedback | B2: ring on ground, chest opens; A2: signposts | Glow ring under Sorting Computer (exists!) | Medium — generalise the affordance, add signposts |

**Honest positioning:** the Great Hall interior is *already* at or above the flat-shaded reference builds' fidelity per object. The gap is not "the art is bad"; it is **camera, scale, HUD, interaction, companion, audio, response**. That is why the 3D spec's Part 1 must not be executed as written — it would spend the first PR on defects that are already fixed.

---

## E. UX/Copy Gap

Child-hostile patterns found live:

- Numbered task lists (`05`), quiz letters A)–D) (`09`–`11`, `19`–`25`), progress "Step 4 of 6" as the only structure.
- Paragraph-length intros (`17`: 51 words before the first button).
- Buttons that describe UI rather than action: "Red Bin — click to sort", "Continue to the Trial", "Enter the Companion Chamber →".
- Raw identifiers shown to a child: `mission-001-complete`, `ai-literacy-1`, `curious-inventor`, `calm-guide`.
- Empty-state waits with no character: "Preparing your mission…", "Saving your progress…".
- No developmental tiering anywhere: a Grade 4 and a Kindergartener get identical copy and identical reading load.
- Companion lines are italicised system text, not a character speaking.

Copy that is **good and should be kept as content**: the House mottos and growth challenges, the seven trial questions, the oath, "AI can make mistakes — that's why we need humans to check", "even powerful AI needs a human partner."

---

## F. Companion Gap

Required by §8: idle, follow, movement, look-at player/objective, pointing, excitement, concern, celebration, contextual hints, proximity, dialogue, teleport fallback, animation states.

Exists: a `companion_profiles` row, a bond counter (`companion_growth_events`), a name propagated into the mission prompt (verified: "Spark" not renamed), a boundary checker in `packages/safety`, one generated dialogue line that is discarded.

Missing: **all of §8.** No entity, no mesh, no rig, no controller, no dialogue surface, no voice, no transcript. Roster is two companions with emoji identities; `ADR-037` mentions "Charli/Loomi" for a trailer, so the canonical roster is a founder decision (§M).

---

## G. Asset Gap

Inventory on `main`: **one** HDRI (`great-hall-dawn.hdr`, Poly Haven CC0), zero GLB models (`public/models/.gitkeep`), procedural canvas textures, no fonts loaded via `next/font`, no audio files, no icons beyond emoji, no House sigils, no creature art.

Needed (full list in `L3ARN_ASSET_MANIFEST.md`): child-scaled player rig with walk/idle; companion characters (2 minimum) with 8 animation states; four House creatures (concept → hero models); crystals ×3 colours + bins ×3 + Sorting Computer in 4 states (broken / partial / repaired / celebrating); ceremonial chamber; exterior grounds + backdrop; House banners/sigils; VFX (sparks, energy pulse, glow puddle, celebration); UI icon set; audio (ambient ×3 zones, UI ×8, machine ×6, celebration, companion voice); three fonts.

Policy (§10): procedural first, generated concept → 3D second, CC0 third, paid only with approval. Everything above is achievable at Style Lock B with procedural + CC0 + generated concept art **except** the companion and creature rigs, which are the genuine hero-asset work.

---

## H. Technical Risks

| Risk | Severity | Grounding | Mitigation |
|---|---|---|---|
| **ADR-004 conflict** — first-person default reverses an accepted ADR with a stated safety rationale (design spec §6.4, §8.5 vestibular) | High (process) | `2026-06-30-3d-academy-world-design.md:220-223,349` | Superseding ADR with comfort layer as a *precondition*; comfort-click stays the reduced-motion default; founder sign-off before the camera PR merges |
| **Motion sickness in children** | High (safety) | Same spec §8.5 | Head-bob off, vignette, sensitivity/invert-Y, `prefers-reduced-motion` → comfort-click, sticky per student, third-person alternative |
| **Browser perf on LOW tier** with real animated characters, VFX, exterior scatter | Medium | Governor exists; no measurements with characters yet | Instancing, ≤40 draw calls/zone budget, LOD, tier-gated post/VFX, FPS floor as a gate |
| **Pointer lock on tablets/touch** — no mouse | Medium | Nothing designed for touch | Touch → comfort-click or third-person with virtual stick; decide per §M |
| **AI latency perception** | Low now (5–7 s live), high if the full `compile()` path is ever used (30 s default would fallback on ~66 s) | `22e0599`, `mission.route.ts:116` | Agent 19 measurement; keep `compileStart` as the only child path; delete or guard `/api/missions` |
| **Unmerged PR #38 body** (37 commits incl. adaptive runtime + migration `013` collision) | High (integration) | `gh pr view 38`: base `docs/3d-academy-world-spec` | Founder decision §M-3; if integrating, renumber migration and merge before Mission gameplay work touches `MissionExperience.tsx` |
| **N8AO WebGL warning flood** | Low (visual) / Medium (observability) | 186 warnings/load | Pin/upgrade `n8ao`; disable on LOW; treat console-clean as a gate |
| **No e2e harness in repo** | High (process) | No Playwright config tracked; only `hero-slice-acceptance.mjs` in `services/ai-workers/scripts` | Phase 0 adds `tests/e2e` Playwright with visual assertions — §18 makes visual QA mandatory, so it must be repeatable |
| **Safety enforcement not live** | High (beta) | Agent 20 plan | Backend workstream runs in parallel from day one |
| **Migration numbering** | Medium | `013` used twice across branches | Convention: next migration is `014_`; PR #38's becomes `015_` if integrated |
| **Single `WorldCanvas`/`worldStore`/`GreatHall`** touched by most workstreams | Medium (collisions) | File inventory | Ownership + interface-first rule in build plan §"Shared-file collision risks" |

---

## I. Final Experience Architecture

**One sentence:** the world is a persistent, always-mounted, full-bleed R3F canvas; every child surface — entry, Academy, House Calling, Mission 001, completion, pause — is either *inside* that world or a blurred-world overlay above it; the companion is an entity in the same ECS as the player; learning telemetry is unchanged and is emitted by in-world interactions instead of DOM buttons.

Layers (bottom → top):

1. **World layer** — `WorldCanvas` at `position: fixed; inset: 0`, never unmounted between child routes. Scene registry: `great-hall`, `calling-chamber`, `companion-grove`, `academy-grounds` (exterior/backdrop), `mission-commons` (stub). Zone system with atmosphere tokens (sky, fog, sun) per zone.
2. **Simulation** — koota ECS: player (position, heading, velocity, collider), companion (position, state machine, target), interactables (affordance, verb, handler), mission objects (crystal, bin, machine-state), zone triggers. Fixed-step `SimLoop`.
3. **Camera** — `cameraMode ∈ {first-person, third-person, comfort-click}`; one rig mounted; comfort layer mandatory.
4. **Interaction** — raycast from camera (first-person) or pointer (comfort), hover affordance, contextual verb bottom-centre, `E`/click, keys 1/2/3 on choice cards.
5. **Mission runtime (headless)** — `useMission001Controller()` extracted from `MissionExperience.tsx`: owns `startMission`, task sequence, evidence capture, calibration, completion, rewards. Consumed by the in-world Mission 001 scene (primary) and by the legacy DOM card (fallback for `interactive-lite` / `text-audio-offline` delivery modes — which ADR-016 still requires).
6. **HUD layer** — DOM, `pointer-events: none`, tokens from `theme.ts`: lockup top-left, eyebrow + focus top-centre, pills top-right, keycaps bottom-centre, satchel bottom-left, XP rail bottom, zone card, narration player, contextual verb, toasts. Modals: `blur(14px) saturate(.85)` over the live world.
7. **Companion** — entity + `CompanionController` (idle/follow/look-at/point/excited/concerned/celebrate/hint/teleport), dialogue → narration player with **Transcript** (exact TTS text), optional TTS behind a parent-controlled flag.
8. **Audio** — `AudioManager` (WebAudio; `THREE.AudioListener` on camera, `PositionalAudio` on emitters), ambient per zone, UI, machine, celebration; captions for every voiced line; master/voice/sfx controls; muted until first gesture.
9. **Parent + founder surfaces** — unchanged architecture (Next.js pages, RLS, service-role for Mission Control). Parent-safe notices (Agent 21) and containment (Agent 20) added on the backend.

Everything above stays on the approved stack (§11): Next.js 15, React 19, R3F 9, drei, `camera-controls`, koota, zustand, Railway, Supabase. No engine migration. No physics engine in v1 (ADR to evaluate later).

---

## J. Execution Plan

Full dependency graph, per-task files, gates and acceptance criteria are in `docs/L3ARN_COMPLETE_BUILD_PLAN.md`. Summary of phases:

| Phase | Name | Depends on | Delivers |
|---|---|---|---|
| **0** | Foundation & hygiene | — | Pause hotfix on `main`; companion-choice → Academy; e2e Playwright harness with visual gates; `theme.ts` + fonts; N8AO warning fix; ADR files (004-supersede, 061 style lock, 062 physics deferred) drafted for sign-off; PR #38 disposition |
| **1** | World shell & zones | 0 | Fixed full-bleed canvas + HUD layer; header removed; scene registry + fade transitions; zone/atmosphere tokens; exterior grounds + backdrop ring; seeded scatter; interaction system + glow affordance |
| **2** | Camera & controls | 1, ADR sign-off | `cameraMode`, `FirstPersonRig`, `ThirdPersonRig`, comfort layer, AABB collision, pointer-lock plate, sticky per-student preference |
| **3** | HUD grammar | 1 | Lockup, breadcrumb, pills, keycaps, zone card, satchel, XP rail, pause menu over blurred world, choice-card modal style with keys 1/2/3 |
| **4** | Companion as character | 1, 3 | Companion entity + controller + placeholder rig (procedural) → generated-concept rig; narration player + Transcript; dialogue from compiler (multi-line) |
| **5** | Mission 001 as gameplay | 1, 2, 3, 4 | Headless mission controller; in-world crystals/bins/machine states; pick–carry–place; machine repair progression; in-world AI Mistake Check; explanation modes; completion ceremony; world change persists; legacy DOM card kept for lite/offline modes |
| **6** | House Calling ceremony | 1, 3, 4 | Calling Chamber scene; banners/sigils; creature manifestations (concept → model); trial as staged in-world choices (B3 cards over the live chamber); reveal; oath; companion unlock reveal |
| **7** | Audio | 1 | AudioManager, ambient per zone, UI, machine, celebration, captions, controls; optional TTS behind parent flag |
| **8** | Asset fidelity uplift | 4, 5, 6 | Style Lock B → stylized-realism on hero assets first (companions, creatures, Sorting Computer, banners); asset gate now gating real GLBs |
| **9** | Pre-Beta Hardening | parallel from 0 | Agent 19 (measure → backoff → duplicate retry engines), Agent 20 (containment enforcement), Agent 21 (parent notices; A0 done), Agent 22 (process) |
| **10** | Performance & accessibility | 5, 6, 7, 8 | Draw-call/geometry/texture budgets per zone, LOW-tier FPS floor, reduced motion, captions, non-colour cues, touch behaviour |
| **11** | Beta gate | all | Agent 23 checklist A–J, founder walkthrough, verdict |

Critical path: **0 → 1 → 2 → 5 → 10 → 11**. Phase 2 is the only phase blocked on a founder signature (ADR-004 supersession).

---

## K. Parallel Workstreams

| Stream | Scope | Can start | Blocks |
|---|---|---|---|
| **W-QA** | Playwright e2e + visual gates, console-clean gate, canvas-size gate | Day 1 | every merge |
| **W-World** | Phases 1, 2 (render, camera, zones, collision, interaction) | Day 1 | 5, 6 |
| **W-UI** | Phase 3 HUD grammar, tokens, fonts, modals, pause | Day 1 (after 0's shell) | 5, 6 |
| **W-Companion** | Phase 4 | after 1 | 5, 6 |
| **W-Mission** | Phase 5 headless controller extraction can start Day 1 (pure refactor with tests); in-world scene after 1–4 | Day 1 (controller) | 11 |
| **W-Ceremony** | Phase 6 | after 1, 3 | 11 |
| **W-Audio** | Phase 7 | Day 1 (manager + UI sounds), zone ambient after 1 | 10 |
| **W-Assets** | Phase 8 concept generation + CC0 sourcing + pipeline | Day 1 | 4, 6 hero rigs |
| **W-Backend** | Phase 9 Agents 19–21 | Day 1 | 11 |
| **W-Process** | Agent 22 | Day 1 | 11 |

Merge points (never parallelised): Phase 5's in-world scene (joins World + UI + Companion + Mission controller), Phase 10 (joins everything), Phase 11 (gate).

---

## L. Definition of Done

Per child-facing milestone (from §18 + §23), all of:

- Feature runs; played in a real browser; screenshots (and video where animation matters) captured into `docs/qa/<milestone>/`.
- Compared against `docs/references/target/`; no dead space, no SaaS UI, no text-heavy step, no missing feedback — each checked and written down.
- Playwright gate green: canvas ≥ 90 % viewport, zero console errors, N8AO warning count 0, FPS floor held on LOW tier, first-person Y drift = 0, no two rigs mounted.
- Unit/contract tests green; typecheck green across the workspace (not per package).
- Evidence/calibration/reward writes unchanged for Mission 001 (regression: completion still writes +25/+75/+15/+20 and 2 badges).
- Safety invariants intact: no webcam/mic, RLS unchanged, `child_permissions` never written by containment, no AI output unvalidated.
- Docs updated: this plan's phase table, ADR index, HANDOFF.

For the product: **a child enters and immediately feels like they entered somewhere; wants to move; the companion is present; the world responds; learning is embedded; the Academy celebrates; the parent sees evidence; the child wants to come back** (§23) — judged by the founder walkthrough (Agent 22 instrument), not by any of the gates above.

---

## M. Founder Decisions Required

Only decisions that cannot be inferred from approved documentation:

1. **Ratify ADR-004 supersession: first-person as default.** `MASTER_GOAL` §5 asks for it; `ADR-004` and the 2026-06-30 design spec §6.4/§8.5 forbid it as default on a stated vestibular-safety basis. Proposed: first-person default with mandatory comfort layer, comfort-click stays the reduced-motion default and the touch default. **Blocks Phase 2.**
2. **Ratify the staged fidelity path** — Style Lock B (flat-shaded, zero-texture) as the *interim* implementation style, stylized-realism as the *final* target, hero assets uplifted first. `MASTER_GOAL` §3 allows it; the 2026-06-30 spec §7 specifies a painterly-PBR pipeline from the start. Proposed: stage it. Cheap to decide, expensive to leave ambiguous.
3. **Disposition of PR #38's body** (`feature/adaptive-lesson-runtime`, 37 commits, merged into the stale `docs/3d-academy-world-spec` branch, never into `main`). Options: (a) integrate onto `main` now (renumber its migration to `014`/`015`, resolve against holdings), then build Phase 5 on the adaptive runtime; (b) cherry-pick only the Pause fix and leave the adaptive runtime for the lesson-engine track; (c) abandon. Recommendation: **(b) now, (a) as a Phase-5 prerequisite decision** once the headless controller exists — the adaptive runtime changes exactly the file Phase 5 refactors.
4. **Companion roster and names for v1.** Two exist (Spark, Luna). `ADR-037` names Charli/Loomi for a trailer. How many companions ship, and are Spark/Luna canonical?
5. **Companion voice.** TTS requires a provider and credentials (paid). Options: (a) text + narration player with Transcript only in v1; (b) TTS behind a parent-controlled flag with a named provider. Note `ADR-027` governs *input* audio (push-to-talk); companion *output* voice is not prohibited but is unaddressed.
6. **Concept-art generation tool** for asset policy step 1 — which image-generation tool is approved/available, and does the RTX 5090 lab run a local one?
7. **Touch/tablet behaviour.** Proposed: tablet → third-person with on-screen stick, phone → comfort-click, both with the same HUD. Confirm portrait phone is a supported target at all for the beta.
8. **Scope boundary of "complete":** does this build include (a) shared-room multiplayer (`CONTEXT.md` §4 non-negotiable #1 says networked world is MVP; `MASTER_GOAL` does not mention it), and (b) missions beyond 001 (report says "Next: Mission 002 — coming soon")? Proposed: both **out** of this build plan, tracked as the two follow-on tracks, so the beta gate is reachable.
9. **Cleanup of `/api/missions` (full `compile()`)** — unused by the web app, carries a 30 s default that would always fall back at ~66 s. Delete, or keep for the parent-plan output path? Affects Agent 19's measurement scope.

Everything else in the five documents proceeds under stated assumptions and can be corrected on review.
