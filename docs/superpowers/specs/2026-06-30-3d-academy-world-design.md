# L3ARN 3D Academy World — Design Specification

**Status:** Draft for review
**Date:** 2026-06-30
**Owner:** Founder (Cameron Watson)
**Type:** North-star vision + phased roadmap (foundational spec)
**Supersedes:** nothing — *operationalizes* existing accepted ADRs (see §0.2)
**Research foundation:** `docs/superpowers/research/3d-world/01–05` (5 agent reports, cited throughout)

---

## 0. How to read this document

### 0.1 What this is
This spec turns an already-accepted decision — *L3ARN is a living 3D Academy in the browser* (ADR-003, ADR-016, ADR-018, ADR-019, ADR-020) — into a **buildable, research-grounded technical + art + pedagogy specification** that reaches the "premium stylized" quality bar demonstrated by the Fable 5 Age-of-Empires world (`Braffolk/fable5-world-demo`), while running smoothly on the school Chromebooks and tablets children actually use.

The current implementation (`packages/world-engine`, rendered at `/student/academy`) is architecturally sound but visually primitive: untextured `boxGeometry` walls, a flat gray plane, solid-color materials, no models, no environment. The gap to the vision is **art, world systems, and learning depth — not plumbing.** The existing `WorldEvent` contract, `SceneKey` abstraction, and `tryCapture` telemetry are reusable foundations.

### 0.2 Relationship to existing ADRs (this spec builds ON these)
| ADR | Decision | How this spec uses it |
|-----|----------|----------------------|
| ADR-001 | Stack: Three.js/R3F, World Engine, Supabase, Railway | Kept; refined to R3F **v9** (see §6.1 / proposed ADR-061) |
| ADR-003 | True 3D browser Academy | The premise of this entire spec |
| ADR-004 | Sims-style angled camera + click/tap; 1st/3rd person for special missions | Honored exactly (§6.4) — **not** a free RTS camera |
| ADR-005 | Shared-room multiplayer | Committed; sequenced to Phase 5; sim designed server-portable now (§6.9) |
| ADR-010 | Evidence-based mastery model | Realized as Evidence-Centered Design + stealth assessment (§5) |
| ADR-011 | Reward split: effort rewards + mastery-gated major progression | The backbone of "Mastery Makes the World" (§3.4) — buildings are mastery-gated, not bought |
| ADR-016 | Multi-modal mission output incl. `student_3d_mission`, `student_interactive_lite`, `student_text_audio_offline` | In-world mission = `student_3d_mission`; lite/offline = the LOW-tier + offline fallback (§8.4) |
| ADR-018 | Core Academy Map (Great Hall, 4 House Halls, Mission Commons, Companion Grove, Moolah Market, AI Lab, Outdoor Grounds, Event Arena, Parent Portal) | The canonical campus; **Realms extend Outdoor Grounds** (§3.2) |
| ADR-019 | Fully Living Academy w/ governed persistent world state | The world-state model this spec details |
| ADR-020 | Hybrid event-sourced world state: Railway executes/broadcasts, Supabase authoritative ledger | The persistence architecture (§9.1) — not a naive JSON blob |
| ADR-013, ADR-022 | L3ARN Mastery Map + Florida K-8 standards; evidence rubrics | The competency model backing every mission (§5.1) |
| ADR-026, ADR-027 | Evidence auto-capture, **no webcam/face**; **push-to-talk only, no always-on mic** | Hard constraints on telemetry + MoMO voice (§5, §8.5) |
| ADR-006, ADR-009 | Age-tiered chat + AI interaction | MoMO's tutoring adapts by age band (§5.4) |
| ADR-050 | Monorepo: `/apps/web`, `/apps/realtime`, `/apps/api`, `/packages/*` | World sim lives in `packages/world-engine`; multiplayer server in `apps/realtime` |
| ADR-058 | 9 Supabase schema domains incl. World State, Learning Intelligence | Persistence + telemetry map to these domains (§9) |

### 0.3 Proposed new ADRs this spec introduces
To be filed as ADR-061 through ADR-069 (see §11): renderer baseline, two-modes law, sim-outside-React/ECS, stylized-PBR art direction, performance/device-tier contract, companion-safety & anti-dark-pattern doctrine, mastery-gated world construction, asset pipeline & licensing gate, accessibility & comfort baseline.

---

## 1. Vision & north star

> A living, painterly 3D Academy that a child *wants* to walk into — and that quietly turns that wanting into real, measured learning.

Students arrive at a beautiful Academy campus, are Sorted into a House, and explore a ring of House-themed **Realms** — each a knowledge domain rendered as an explorable biome. Guided by their companion **MoMO**, they undertake **missions** that happen *in the world*. As they demonstrate mastery, they **build their own Academy** — watching competence become architecture — and their companion evolves alongside them. The world remembers them (persistent, living), rewards *learning* rather than *time*, and is safe by construction.

**The quality bar:** premium-stylized (Zelda: BOTW / Ori / Age-of-Empires-IV-stylized), not photoreal. Validated by research: AoE IV itself is painterly stylized-realism art-directed for readability, which is cheaper, kid-safe, ages better, and maps directly onto free CC0 asset libraries (report 02).

**The floor:** smooth on a school Chromebook / iPad. The look scales *up* on capable hardware; it never falls *through* on weak hardware.

**The discipline:** beauty is the *motivational envelope*, not the learning mechanism (report 05). The world dazzles to earn attention, then gets out of the way so thinking can happen.

---

## 2. Design principles (the five pillars)

1. **Two-Modes, enforced in code (§4).** *Explore mode* = full beauty, ambient life, MoMO's personality. *Mission mode* = visual quiet, decoration/motion suppressed, MoMO becomes a focused Socratic tutor. This single rule resolves the central beauty-vs-learning tension and is enforced by the engine, not by convention.

2. **Simulation lives outside React (§6.2).** All per-frame state is held in a vanilla ECS; Three objects are mutated through refs inside a single `useFrame`; React never runs the game loop. React owns the shell (scene structure, HUD, lifecycle) only. This is the difference between a smooth world and a stuttering one.

3. **Stylized-PBR, not photoreal (§7).** Image-based lighting + baked lightmaps + one cascaded-shadow sun + filmic tone mapping. Lifted, colored shadows — never crushed black. This is how you get "AoE-quality" light on a Chromebook.

4. **Everything instanced, LOD'd, compressed, streamed (§8).** Draw calls are the #1 killer on weak devices. Instancing + LOD + culling *together*; KTX2 textures; Meshopt geometry; progressive streaming. Enforced as CI budgets, not aspirations.

5. **Learning is built backward from a competency model (§5).** Competency → evidence → task (Evidence-Centered Design). Stealth assessment measures competence from in-world behavior. This is how L3ARN's founding principle — *parent config = hypothesis; student behavior = ground truth* — becomes literally true in code.

---

## 3. World & narrative structure — "Mastery Makes the World"

### 3.1 The blend (the chosen model)
The world is a **pre-built, beautiful Academy + Realms** that children **grow through mastery**. Progress is visible in **two channels at once**: the **companion** (existing bond/evolution system) and the student's **buildings/holdings**. The world exists and is gorgeous on day one; *your corner of it rises as you learn.*

This blends the "Living Academy & its Realms" structure with the "build-your-Academy" progression — deliberately avoiding a from-scratch settlement-management sim (which would drift into busywork and risk the overjustification trap) while keeping the powerful "my actions reshape the world" motivation of Age of Empires.

### 3.2 Spatial structure (reconciled with ADR-018)
```
THE ACADEMY (persistent, per-student world state — ADR-019/020)
│
├── CAMPUS  (the social hub — ADR-018 canonical locations, full Explore-mode beauty)
│   ├── Great Hall            (arrival, Sorting Computer, Mission 001 — ADR-024)
│   ├── 4 House Halls         (Valkryn / Lyrion / Novari / Cytrex)
│   ├── Companion Grove       (MoMO chamber, companion evolution — ADR-018)
│   ├── Mission Commons       (mission board / launch)
│   ├── Moolah Market         (effort-reward economy — ADR-011 effort layer)
│   ├── AI Lab                (AI-literacy missions, e.g., the "AI made a mistake" pattern)
│   ├── Event Arena           (seasonal/live events — living-world hooks)
│   └── Parent Portal/Report Room (parent-facing; links to reports)
│
├── REALMS  (domain biomes — an expansion of ADR-018 "Outdoor Grounds")
│   ├── Novari Realm   — verdant/nature → life & earth science, ecology
│   ├── Cytrex Realm   — luminous tech → logic, math, AI literacy, computational thinking
│   ├── Valkryn Realm  — storm/mountain → physical science, energy, forces
│   └── Lyrion Realm   — song/spire → language arts, music, expression
│         (House themes = regional aesthetics; a student of any House may enter any Realm.
│          Curriculum domains map to Realms via the L3ARN Mastery Map — ADR-013/022.)
│
└── HOLDINGS  (the BUILD layer — mastery-gated, per-student)
    └── Buildable plots within the Campus and each Realm. Demonstrated mastery of a
        skill-cluster erects a real, walk-up-able structure. This is the visible
        second mirror of competence (the first being companion evolution).
```

### 3.3 Narrative frame
The established frame ("the Sorting Computer is broken; the Academy needs you") generalizes: the Academy is a place of wonder that has fallen quiet, and the student **brings it back to life through mastery**. Every skill learned lights up a piece of the world. This is intrinsically motivating (SDT: competence + autonomy + relatedness) and requires no dark patterns to sustain.

### 3.4 The construction mechanic ("Mastery Makes the World") — integrity rules
Grounded in **ADR-011** (effort rewards vs mastery-gated major progression):

- **Buildings unlock on *demonstrated mastery*, never on points or currency.** A structure is a *representation of competence*, not a purchased reward. This is what keeps the build layer out of the overjustification trap the research warns about (report 05 §3).
- **Moolah / XP / House Points remain the *effort* layer** (ADR-011) — celebration and cosmetic personalization (decorating a holding you *earned*), never the gate on learning progression. Rewards celebrate; they don't drive.
- **No leaderboards in the child-facing world** (report 05: leaderboards demotivate the low performers who most need help). House Points aggregate to *House-level* collaborative goals, not individual child rankings.
- **Dual-growth telemetry:** each construction event is tied to the specific mastered objective(s), producing a legible "I built the Fractions Observatory by mastering fractions" narrative for both child and parent.

### 3.5 Living-world hooks (ADR-019)
Persistent, governed world state enables: seasonal decorations, House banners driven by House Influence, scheduled Event Arena happenings, and NPC presence — all Railway-scheduled and broadcast (ADR-020). These are **Explore-mode only** and must respect the two-modes rule (§4): they never intrude on Mission mode.

---

## 4. Two-Modes specification (the core law) — *proposed ADR-062*

The most important design decision in this spec. Enforced by the engine.

### 4.1 The two modes
| | **Explore Mode** | **Mission Mode** |
|---|---|---|
| Purpose | Motivation, wonder, belonging, navigation | Instruction, thinking, assessment |
| Visuals | Full painterly beauty; ambient motion (grass, water, foliage, particles); day/night; NPC life | **Quieted:** ambient motion paused/dimmed, decorative particles off, background depth-of-field/vignette to foreground the task, camera settles |
| MoMO | Personality, warmth, idle chatter, movement | Focused Socratic tutor; **animation dampened during hard cognitive load** (report 05 §4) |
| Audio | Ambient world bed, music | Reduced bed; task-relevant cues only |
| Rendering | `frameloop="always"` while things move | Can drop to `frameloop="demand"`; budget reallocated to the task surface |

### 4.2 Why (evidence)
Seductive details — interesting-but-unnecessary detail during instruction — **lower retention and transfer even when the learner enjoys them and isn't consciously distracted** (Mayer's Coherence Principle; report 05 §1). The gorgeous world is a hallway *between* missions; during a mission it must recede. This is non-negotiable and is why "fully in-world" does **not** mean "spectacle during instruction."

### 4.3 Enforcement (how it's a law, not a vibe)
- A single `worldMode: 'explore' | 'mission'` state (in the cold UI store) gates a `MissionMode` system that: pauses ambient/vegetation animation systems, disables decorative particle emitters, applies the "quiet" post-processing profile, and switches MoMO's behavior tree to `tutor`.
- The transition is an explicit, animated **"settle"** (world calms over ~800ms) — itself a comfort/accessibility affordance (no jarring cut).
- CI/design lint: a mission surface may not spawn decorative/ambient systems; a review check flags any Mission-mode scene that enables Explore-only emitters.
- The existing 2D mission cards (`mission/[missionId]`) are the current crude "Mission mode." Phase 1 pulls this into the world **while preserving the visual-quiet discipline** — the in-world mission station is calm by construction.

---

## 5. Learning-integrity model — *the part competitors get wrong*

Realizes ADR-010 (evidence-based mastery) and ADR-013/022 (Mastery Map). Proposed companion-safety doctrine = ADR-066.

### 5.1 Competency → Evidence → Task (Evidence-Centered Design)
Build **backward from the L3ARN Mastery Map** (ADR-013/022), using Mislevy's ECD (operationalized for games by Shute; report 05 §2):
1. **Competency model** — the Mastery Map's fine-grained objectives (Florida K-8 aligned, ADR-013/025).
2. **Evidence model** — which in-world behaviors reveal each competency, and how strongly. (Evidence rubrics already scoped in ADR-022.)
3. **Task model** — the missions/quests (`student_3d_mission` etc., ADR-016) through which competence is demonstrated. Objectives are **visible to the learner** ("what am I building toward").

### 5.2 Stealth assessment (ADR-010, ADR-026)
Competence is measured *continuously and invisibly* from gameplay traces — **never a test that feels like a test.** This is the mechanism that makes *student behavior = ground truth* real. The existing `tryCapture(...)` events (`sequence-completion`, `ai-mistake-check`, `explanation`, `reflection`, `decision-log`, `structured-replay`) are the seed of the evidence stream; this spec formalizes them into scored evidence against the competency model. **Constraint (ADR-026):** structured events only — no webcam, no face, no biometrics.

### 5.3 Core learning loops (highest-ROI, most-neglected)
- **Spaced retrieval + interleaving, owned by MoMO.** Per-objective forgetting curve; MoMO resurfaces mastered concepts as callbacks and low-stakes in-world "warm-ups"; later missions interleave prior objectives rather than blocking. Strong, replicated evidence; almost no competitor does this well (report 05 §2).
- **Mastery, not seat-time.** Advance on demonstrated competence; loop back on failure with *more support*, not just repetition (Bloom mastery / 2-sigma).
- **Zones of Proximal Flow via dynamic difficulty.** Keep the learner in the flow∩ZPD band; **adjust scaffolding density first, raw difficulty last** (lowering challenge can lower learning).

### 5.4 MoMO tutoring protocol (strict — proposed ADR-066)
Age-tiered per ADR-006/009. MoMO:
1. **Socratic by default; answers are a last resort.** Diagnose the *specific* misconception → give the **minimum-viable hint** to restart productive struggle → escalate support only on repeated failure → **never volunteer the answer.** (An answer-giving "tutor" is an answer key with a face.)
2. **Prompts self-explanation** ("why do you think that?", "explain it back").
3. **Feedback meets Shute's bar:** non-evaluative, supportive, timely, specific, multidimensional, credible. **Process praise** ("you tried three strategies"), not person praise ("you're so smart").
4. **Animates *down* during hard cognitive load** (persona effect boosts feelings, not learning; an over-animated agent raises extraneous load).
5. **Voice = push-to-talk only** (ADR-027): no always-on mic, no voice ID, no emotion detection.

### 5.5 MoMO safety guardrails (non-negotiable — proposed ADR-066)
The companion is L3ARN's crown jewel *and* its biggest risk surface (documented companion-AI harms to minors; report 05 §4).
- MoMO is a **learning companion, not a friend/therapist/confidant.** Hard topic boundaries; a **crisis-escalation protocol** (self-harm/abuse/distress → safe scripted response + surface to parent/human, never improvise).
- **No engagement-maximizing behavior:** no guilt, no love-bombing, no FOMO, no discouraging logoff. MoMO *encourages breaks*.
- **Bond points outward** — toward real-world mastery and real people, not as a substitute for them.
- **Parent-visible + reversible** (consistent with L3ARN's versioned/reversible companion evolution and ADR-008 parent visibility).
- **Never a data-collection funnel** wearing a friendly face (COPPA, §5.7).

### 5.6 Anti-dark-pattern doctrine (proposed ADR-066; extends ADR-011)
Written as a binding product-values record:
- **No** pay-to-win, status cosmetics that create in-peer inequality, consumables/loot, or advertising to children (the Prodigy anti-pattern).
- **No** individual leaderboards for the child audience, **no** streak-jeopardy/loss-aversion loops, **no** autoplay/endless content that removes stopping cues.
- **Report *learning* to parents, not *minutes*.** Success = transfer + retention (delayed post-tests, spaced re-encounters), not engagement or session length. Early "wow"/novelty engagement is a leading indicator we deliberately *discount* (it decays).
- Because L3ARN is **parent-paid-for-outcomes** (ADR-032), the business incentive to build addictive loops never arises — the doctrine and the business model are aligned.

### 5.7 Child privacy & wellbeing (COPPA-2025 + UK Children's Code)
- **Data minimization + defined retention** (no indefinite storage); written security program.
- **Separate, unbundled verifiable parental consent** before any child data touches third parties or **AI model training** (aligns ADR-029 opt-out). Functional consent may **not** be bundled with training/advertising consent.
- **High-privacy defaults; no nudge/dark patterns to extract data.**
- **Wellbeing off-ramps:** a mission is a complete, satisfying unit that *ends*; "great stopping point" cues; MoMO break encouragement; parent time-caps that degrade gracefully (finish-your-mission, not hard mid-thought cutoff).

---

## 6. Technical architecture

Grounded in report 04 (architecture) and report 01 (renderer). Sits in the monorepo (ADR-050): sim/render in `packages/world-engine`, consumed by `apps/web`; future multiplayer in `apps/realtime`.

### 6.1 Renderer & engine baseline — *proposed ADR-061*
- **React Three Fiber v9 + drei v10 + `@react-three/postprocessing` v3**, on **three.js**.
- **WebGL2 is the guaranteed baseline; WebGPU (`three/webgpu` + TSL) is a per-device opt-in.** Rationale (report 01): the post-processing + cascaded-shadow stack that produces the premium-stylized look does **not** yet run on WebGPU (EffectComposer + CSM addon still porting to node/TSL), and WebGPU is unreliable on managed school Chromebooks. WebGPU is the ceiling; WebGL2 is the floor that must never fall through.
- **The premium-stylized look on WebGL2** comes from the mature post stack: Bloom, N8AO/GTAO, ACES/AgX tone mapping, SMAA/TAA.
- **Fallback engine (ruled in, not chosen):** Babylon.js 8.x (Apache-2.0) if engine breadth later outweighs React ergonomics. PlayCanvas (commercial editor) and raw three.js ruled out.

> **⚠️ Foundational migration constraint.** The repo is on **React 18.3 / Next 14.2 / R3F v8.17.10**. **R3F v8 is incompatible with React 19**; R3F v9 requires **React 19 / Next 15** (migrate v9 + drei v10 + postprocessing v3 atomically). **Recommendation:** perform the React 19 / Next 15 / R3F v9 upgrade in **Phase 0** to avoid building the world twice. It can be sequenced (start on v8) if the app-wide React 19 upgrade must wait, but that incurs rework. This is the single biggest sequencing decision (see §10, §12).

### 6.2 Simulation architecture — sim outside React (*proposed ADR-063*)
The single most important technical rule; where naive R3F games die (report 04 §1).
- **All per-frame state lives in a vanilla ECS** — **Koota** (pmndrs; R3F-native hooks) primary, **miniplex** fallback. Not `useState`.
- **One loop:** a single root `useFrame` runs the whole simulation, then R3F renders. No second `requestAnimationFrame`.
- **Render = mutation through refs.** Systems write `mesh.position`, `instancedMesh.setMatrixAt(...)`. **Never `setState` per frame.**
- **React owns the shell only:** scene structure, HUD/DOM (mission panel, resource counters, tooltips), lifecycle. React re-renders on *discrete* events (unit selected, mission opened).
- **Cross-boundary state** goes through **Zustand** subscribed transiently (hot path: `subscribe` without re-render; cold path: selector with re-render).

### 6.3 Game loop
- **Fixed-timestep accumulator** (`DT = 1/60`, clamp frameDelta to kill the spiral-of-death) for all gameplay (movement, pathing, AI, resource ticks); **render interpolation** between sim steps.
- Raw `delta` only for cosmetic tweens (camera smoothing, idle wiggle).
- **`frameloop="demand"` + `invalidate()` when the world is idle** (a mostly-idle classroom world) — a large battery/thermal win on tablets; and the Mission-mode surface reallocates budget to the task.

### 6.4 Camera (honors ADR-004 — Sims-style, not free RTS)
- **`camera-controls` (yomotsu)** via drei `<CameraControls>`, configured to the **Sims-style angled model** (ADR-004): click/tap to move, constrained polar angle, clamped pan to world bounds, dolly-zoom, gentle rotate. **Not** a free-look/first-person default.
- Smooth `setLookAt`/`fitToBox` for "focus on the mission station" / cinematic arrivals.
- **First/third-person is a per-mission opt-in** (ADR-004 "special missions"), not the default locomotion.
- The current `WorldCanvas` already implements a restricted OrbitControls version of this — `camera-controls` is the upgrade path.

### 6.5 Navigation & pathfinding
- **`recast-navigation-js`** (WASM Recast/Detour): bake a **solo navmesh** at load from walkable meshes; drive movement via its **Crowd** API (steering + avoidance) from the fixed step.
- TileCache temporary obstacles / `yuka` steering reserved for later; don't run two pathers on one agent.

### 6.6 Interaction
- R3F pointer events + drei **`<Bvh>`** (three-mesh-bvh) for cheap terrain raycasts.
- Ground `onClick` → snap to navmesh → move. Interactable (`Sorting Computer`, mission stations) `onClick`/proximity (Rapier sensor) → launch mission + Railway AI session + enter Mission mode.
- **Never `setState` in `onPointerMove`** (fires constantly). Hover highlights are ref-driven.
- Reuses the existing `WorldEvent` discriminated union (`object-interact`, `avatar-move-requested`, `scene-transition`, `mission-trigger`) — extended, not replaced.

### 6.7 Physics
- **`@react-three/rapier`** (WASM): kinematic character controller for the avatar/MoMO; sensors/colliders for "walk into station" triggers and world collision.

### 6.8 Hosting inside Next.js App Router
- `<Canvas>` is a **Client Component**; wrapped by a `'use client'` client-wrapper that does `dynamic(() => import('...'), { ssr:false })` (App Router forbids `ssr:false` in Server Components).
- **Route-isolated** at `/student/academy` so the Three/Rapier/recast/WASM bundle loads *only* there — parent/onboarding pages stay light.
- Server page does auth (Supabase session) + prefetch of world-save metadata; the client island hydrates the ECS before first frame.
- Assets (GLB/KTX2/Draco/WASM) on CDN (Vercel static / Supabase Storage / R2); preload Rapier + recast WASM.

### 6.9 Multiplayer (ADR-005 — committed, Phase 5)
ADR-005 commits to **shared-room multiplayer**. Ship single-player first, but design for it now: keep the sim **deterministic (fixed timestep ✔), command/intent-driven, and ECS-serializable**, so the port to an authoritative server (**Colyseus** default; `geckos.io` only if twitch-latency co-op is ever needed) is a lift-and-shift of the same systems into `apps/realtime`. Do not bake networking assumptions into rendering.

### 6.10 Module breakdown (`packages/world-engine`)
```
packages/world-engine/src/
├─ core/         world.ts (Koota traits) · clock.ts (fixed-step) · serialize.ts (ECS↔save DTO, versioned)
├─ systems/      input · movement · pathfinding (recast Crowd bridge) · interaction (→ mission dispatch)
│                selection · animation · ambient (Explore-only) · missionMode (two-modes enforcement)
├─ nav/          buildNavmesh.ts · crowd.ts
├─ render/       WorldCanvas.tsx (<Canvas>, mode-aware) · SimLoop.tsx (single useFrame)
│                Terrain.tsx (<Bvh>) · EntityViews.tsx (Instances) · CameraRig.tsx (Sims-style)
│                Effects.tsx · PostProfiles.tsx (explore vs quiet)
├─ scenes/       Campus + Realm scene definitions (data-driven, streamed)
├─ art/          lighting rig · material library (stylized-PBR) · asset registry + manifest
├─ state/        uiStore.ts (Zustand: worldMode, selectedId, openMissionId, cameraMode)
├─ persistence/  saveClient.ts (event-sourced → Supabase/Railway per ADR-020) · eventLog.ts (audit/telemetry)
├─ learning/     competency bridge · stealth-assessment scoring · spaced-retrieval scheduler · DDA
└─ missions/     missionBridge.ts (interactable → in-world Mission mode + Railway session; ADR-016 outputs)
```
**Data-flow contract:** R3F events → commands → Input system → fixed-step systems mutate ECS → Render system interpolates ECS → Three refs. React (HUD) reads only the Zustand UI store. **No arrow points from a per-frame value into React state.**

---

## 7. Art direction & asset pipeline — *proposed ADR-064 (art) + ADR-068 (pipeline)*

Grounded in report 02. Target: **painterly stylized-PBR, high readability, lifted colored shadows, warm friendly palette.**

### 7.1 Style lock
A 1-page art bible: "painterly stylised-PBR, Craig-Mullins-adjacent readability, lifted coloured shadows, warm palette." Lock budgets (§8) before hero art. Prove the lighting model on a grey-box first.

### 7.2 Lighting (the biggest single quality jump — do first)
Hybrid: **IBL + baked lightmaps + one real-time sun + filmic tone mapping.**
- **IBL/HDRI:** Poly Haven HDRI → PMREM → drei `<Environment/>`. Biggest jump from "primitive" to "real"; ~an afternoon.
- **Baked lightmaps** (Blender Cycles) for all static geometry — free at render time; soft painterly GI a Chromebook can't afford in real time.
- **One directional sun** with **Cascaded Shadow Maps** (2 cascades mobile / 4 desktop; 1024–2048 maps). **≤3 real-time lights total; no `PointLight` shadows** (6× cost). Fake local lights with emissive + baked bounce.
- **Tone mapping:** ACES Filmic (evaluate AgX) + per-time-of-day exposure. Work linear; tonemap last.
- **QA rule: no pure-black shadows** — colored, lifted shadow tones for the painterly/kid look (automated pixel-sample check, per the Fable5 demo).

### 7.3 Terrain
Authored heightmap + RGBA **splatmap**, GPU-blended (slope/height biased: grass on flats, rock on cliffs), height-blended transitions. Author in **Gaea**. **Rock meshes instanced on steep slopes** to hide the heightmap's soft cliffs. CDLOD clipmaps added later for large realms.

### 7.4 Vegetation (biggest wow-per-dollar; biggest perf trap)
- **`@three.ez/instanced-mesh` (InstancedMesh2)** backbone: per-instance frustum culling, BVH, LOD + shadow-LOD.
- **LOD chain:** full mesh → meshopt-decimated → **octahedral impostor** (far). Proven at 190k–200k trees in-browser.
- **Poisson/clustered scatter driven by the splatmap** (trees follow "forest" weight, avoid paths/water).
- **Grass:** instanced vertex-shader blades, 3-frequency wind, camera-radius growth. **(Explore-mode only; paused in Mission mode.)**

### 7.5 Characters & MoMO
- **One shared skeleton** + **Mixamo** clip library (retarget everything to it). Stock from **KayKit/Quaternius** (CC0, rigged); **bespoke companions via Meshy** (native auto-rig).
- **VAT / bone-texture instancing** for any crowd; full skinned meshes only for hero characters near camera.
- MoMO gets an expressive but performance-light rig with an explicit **"animate-down" state** for Mission-mode hard-cognitive moments (§4, §5.4).

### 7.6 Delivery pipeline & CI gate (*proposed ADR-068*)
- **Everything ships as `.glb`** through a **mandatory `glTF-Transform` CI gate**: dedupe → weld → **Meshopt** (Draco for large static terrain) → **KTX2/Basis** (UASTC for normal/ORM maps, ETC1S for albedo, RDO off) → texture-resize → prune.
- **CI fails the build** if any asset exceeds size/texture budgets or the scene exceeds the draw-call budget (§8).
- Wire `KTX2Loader` + `MeshoptDecoder`/`DRACOLoader` once; `useGLTF.preload`; drei `<Detailed/>` LODs; `<PerformanceMonitor/>` for adaptive quality.

### 7.7 Asset sources & licensing (*proposed ADR-068*)
- **Build from CC0 first:** Poly Haven (HDRI + tiling textures + scans), Quaternius + KayKit (stylized rigged kit + characters + modular buildings), Kenney (extras).
- **Fill gaps** with Fab/Megascans (Standard/CC-BY only — never Editorial for a commercial product).
- **AI generators (Meshy/Tripo) as concept + base-mesh factories** — always retopo, de-light (remove baked lighting from base color), and run the compression gate before shipping. **Commercial use requires paid plans**; free-tier output is generally not ship-clear.
- **Mandatory in-repo asset manifest** (CSV/JSON): per-asset source URL, licence, attribution, date. CC-BY needs in-app attribution; AI tools need the paid-plan grant recorded. Baked-lighting-in-base-color is a review reject.

---

## 8. Performance & accessibility contract — *proposed ADR-065 (perf) + ADR-069 (a11y)*

Grounded in report 03. **These are release gates, not suggestions.** Governing reality on kid hardware: the **CPU main thread (draw calls)** and **tiny shared VRAM (crashes, not slowdowns)** dominate — not triangle count. iOS Safari OOM-kills tabs near ~256–300 MB and drops WebGL context on backgrounding.

### 8.1 Device-tier budgets (per-frame ship gates)
| Budget | **LOW** (Chromebook / old iPad / iGPU) | **MED** (mainstream laptop / recent iPad / M1) | **HIGH** (discrete GPU) |
|---|---|---|---|
| Target FPS | **30 locked** (don't fight it) | 60 | 60 (120 where available) |
| Draw calls/frame | **< 100** (hard cap) | < 300 | < 1000 |
| Triangles on screen | ≤ 500 K | ≤ 1.5 M | ≤ 3–5 M |
| Real-time lights | **1** (sun) + baked | ≤ 3 | ≤ 5 |
| GPU texture memory | **≤ 128 MB** | ≤ 512 MB | ≤ 1–2 GB |
| Largest texture | 1024² KTX2 | 2048² | 2048–4096² |
| Initial blocking download | **≤ 2–3 MB** | ≤ 5 MB | ≤ 8 MB |
| DPR cap | 1.0 | 1.5 | 2.0 |
| Post-processing | off / 1 cheap pass | AO + tonemap | full stack |
| Renderer | WebGL2 (WebGPU if present) | WebGPU, WebGL2 fallback | WebGPU |

> **Opinionated stance (report 03):** on LOW, **lock a smooth 30 and spend the surplus on looking good** (baked GI, instanced dressing). A steady pretty 30 reads as polished to a child; a stuttering 45→22 reads as broken.

### 8.2 Mandatory techniques
- **Draw calls < 100 on LOW is the master gate.** Instance every repeated object; `BatchedMesh` for shared-material variety; atlas materials; merge static geometry per chunk. Verify `renderer.info.render.calls` in CI. (Instancing + LOD + culling *together* — instancing alone can regress on weak GPUs.)
- **100% KTX2/Basis textures**, mipmapped, POT; VRAM ≤128 MB on LOW (crash-avoidance).
- **Handle `webglcontextlost`/`restored` from day one**; dispose off-screen GPU resources aggressively. (iOS *will* drop context on backgrounding; unhandled = a broken Academy for a kid who tabbed away.)
- **LOD everything** (meshopt chains + octahedral impostors far), screen-density driven, + aggressive far-plane + fog.
- **Progressive/streaming glTF:** lowest-LOD embedded for instant display; stream the rest by chunk.

### 8.3 Runtime quality governor
Boot-detect tier via `WEBGL_debug_renderer_info` → then an **FPS governor** migrates the device up/down: DPR ladder (±10% steps), `regress()` on camera movement, `frameloop="demand"` for non-world UI, suspend on tab-hide. **Expose a manual quality slider** (kid devices thermal-throttle mid-session).

### 8.4 Graceful degradation & offline (ties to ADR-016)
The multi-modal mission output (ADR-016) *is* the degradation strategy:
- **`student_3d_mission`** — the full in-world experience (MED/HIGH, capable LOW).
- **`student_interactive_lite`** — a 2D interactive fallback (the current mission-card UI is exactly this) for the weakest devices or when the 3D bundle can't load.
- **`student_text_audio_offline`** — text/audio for offline/no-GPU contexts.
A device that can't sustain the LOW budget is routed to the lite variant automatically — the child never gets a broken 3D world.

### 8.5 Accessibility & comfort baseline (in the MVP, not v2 — *proposed ADR-069*)
- **Motion/vestibular safety (this is safety, not polish):** honor `prefers-reduced-motion` + an in-app reduced-motion mode; **optional teleport/click-to-move** (the ADR-004 default already avoids smooth first-person locomotion — good); comfort vignette during any camera motion; stable HUD reference frame; the FPS floor is itself a comfort spec.
- **Perception:** captions on **all** MoMO speech (also ESL/noisy-room support); colorblind-safe encoding (never color-only — the crystal-sorting mission must not rely on color alone; add shape/label); dyslexia-friendly adjustable type paired with audio.
- **Input:** full keyboard operability + visible focus; **switch access** (single-switch scanning) for motor-impaired kids; large touch targets.
- **Low-stimulation mode** for sensory-sensitive learners (dovetails with Mission mode's visual quiet).

---

## 9. Data model & persistence

### 9.1 World state (event-sourced per ADR-020)
- **Hybrid event-sourced:** Railway executes and broadcasts world-state changes; **Supabase is the authoritative append-only ledger** (ADR-020). This satisfies L3ARN's audit-trail directive and feeds the companion-adaptation + learning-intelligence pipelines (ADR-058 domains).
- The ECS is **hydrated from the ledger** (+ periodic compact snapshots for fast load) before first frame; changes append events, not overwrite blobs.
- **Snapshot DTO** = the *dynamic* delta only (avatar/companion positions, unlocked zones, holdings/buildings placed, active mission state, world clock) — versioned (`{ v: 1, ... }`). Static level geometry is authored content, never saved.
- **Autosave = debounced** (~15–30s + on mission-complete / building-unlock / `pagehide`), never per-frame. RLS-scoped to the owning student/parent.

### 9.2 Learning data (ADR-058: Learner Model, Evidence/Reports, Learning Intelligence domains)
- **Competency state** per student against the Mastery Map (mastery estimates, forgetting-curve timers for spaced retrieval).
- **Evidence stream** — scored stealth-assessment events (from `tryCapture`, formalized). No webcam/face (ADR-026).
- **Construction ledger** — each building tied to the objective(s) that unlocked it (dual-growth narrative for reports).
- **Parent reports surface *learning*** (mastery, growth, evidence highlights — parent-consented), **not minutes** (§5.6).

### 9.3 COPPA/privacy architecture (§5.7)
Data minimization, defined retention windows, written security program, unbundled VPC before any third-party/model-training use, high-privacy defaults. Companion-adaptation is versioned + reversible + parent-visible.

---

## 10. Phased roadmap

North-star = the full living, buildable, fully-in-world Academy. Path:

### Phase 0 — Foundation
- **Decide & (recommended) execute the React 19 / Next 15 / R3F v9 + drei v10 + postprocessing v3 upgrade** (§6.1). *Biggest sequencing decision.*
- World-engine ECS core (Koota) + fixed-step loop + sim-outside-React scaffold.
- Render pipeline: IBL + tone mapping + CSM sun + the **two-modes post profiles**.
- **glTF-Transform CI compression gate** + asset manifest + budget assertions.
- Device-tier detection + FPS governor + context-loss handling.

### Phase 1 — The Living Great Hall (vertical slice)
- Rebuild the **existing Great Hall + Sorting Computer** to premium-stylized quality (real lighting, materials, models — replacing the box placeholders).
- **Pull Mission 001 into the world**: walk to the Sorting Computer → **Explore→Mission "settle"** → the existing crystal-sorting pedagogy runs in-world with visual quiet, MoMO Socratic tutoring, and telemetry intact.
- First **"earn a building by mastery"** moment (one holding lights up on Mission 001 mastery).
- **Acceptance criteria (§10.1).**

### Phase 2 — First Realm + build layer
- One full biome **Realm** (recommend **Cytrex** — logic/AI/math, on-brand with the AI-literacy missions).
- Mastery → construction loop generalized; **dual-growth** wired to companion evolution.
- Streaming/chunking proven on a real realm.

### Phase 3 — Learning engine
- Competency model against the Mastery Map; stealth-assessment scoring; **spaced-retrieval scheduler**; dynamic difficulty (scaffolding-first).
- MoMO tutoring protocol + safety layer formalized and tested.

### Phase 4 — Full Realm ring + polish
- All four House Realms; living-world hooks (seasonal, Event Arena, House Influence banners); WebGPU enhancement tier for capable devices; hero-vista polish.

### Phase 5 — Shared-room multiplayer (ADR-005)
- Port the deterministic sim to an authoritative server in `apps/realtime` (Colyseus); classroom/co-op rooms.

### 10.1 Phase 1 acceptance criteria (definition of done)
- [ ] Great Hall renders at premium-stylized quality (IBL + baked lighting + CSM + tone mapping; no pure-black shadows).
- [ ] Sustains **30 fps / <100 draw calls / ≤128 MB VRAM** on a real low-end Chromebook **and** a pre-iPadOS-26 iPad (measured, not assumed).
- [ ] Initial blocking download **≤ 3 MB**; graceful `student_interactive_lite` fallback verified.
- [ ] Walk-to-station → **Explore→Mission settle** works; Mission mode measurably quiets the scene (ambient systems paused, quiet post profile active).
- [ ] Mission 001 pedagogy intact in-world (Socratic MoMO, self-explanation, reflection) with `tryCapture` telemetry flowing.
- [ ] One building unlocks on demonstrated mastery, tied to the mastered objective; persists via the event-sourced save.
- [ ] Accessibility baseline present: `prefers-reduced-motion`, captions on MoMO speech, non-color-only crystal encoding, keyboard operable, manual quality slider.
- [ ] `webglcontextlost`/`restored` handled (backgrounding recovers cleanly).
- [ ] Live-verified via headless Playwright screenshot + a real low-end device pass.

---

## 11. Proposed ADRs to file
| ADR | Title | Extends/relates |
|-----|-------|-----------------|
| ADR-061 | 3D Renderer & Engine Baseline (R3F v9 + drei v10; WebGL2-first, WebGPU opt-in) | ADR-001 |
| ADR-062 | Two-Modes World (Explore vs Mission), engine-enforced | ADR-003, ADR-019 |
| ADR-063 | Sim-Outside-React / ECS (Koota) + fixed-timestep loop | ADR-001 |
| ADR-064 | Stylized-PBR Art Direction (premium stylized, not photoreal) | ADR-003 |
| ADR-065 | Performance & Device-Tier Contract (budgets + governor + 30 fps LOW floor) | ADR-016 |
| ADR-066 | Companion-Safety & Anti-Dark-Pattern Doctrine (MoMO protocol + values) | ADR-009, ADR-011, ADR-026, ADR-027, ADR-029 |
| ADR-067 | Mastery-Gated World Construction ("Mastery Makes the World") + dual-growth | ADR-011, ADR-019 |
| ADR-068 | Asset Pipeline & Licensing Gate (glTF-Transform CI + asset manifest) | ADR-001, ADR-050 |
| ADR-069 | Accessibility & Comfort Baseline (in MVP) | ADR-004 |

---

## 12. Open questions (need founder/team decision)
1. **R3F v9 upgrade timing** — do the React 19 / Next 15 / R3F v9 upgrade in Phase 0 (recommended, avoids rebuilding the world), or start on v8 and migrate later (incurs rework)?
2. **First Realm choice** — Cytrex (recommended, on-brand with AI-literacy missions) vs Novari (nature is the easiest "wow" for stylized foliage)?
3. **Realm ↔ curriculum-domain mapping** — confirm the exact House→domain assignments against the L3ARN Mastery Map (ADR-013/022); the §3.2 assignments are a proposal.
4. **Building taxonomy** — what set of buildings/holdings exist, and which mastery clusters unlock which? (Needs a design pass with the Mastery Map.)
5. **Companion (MoMO) canonical design** — reconcile with `L3ARN_Character_Bible.docx`; confirm final rig/species before bespoke asset generation.
6. **Asset budget & licensing** — CC0-first is the plan; confirm budget for paid gap-fill (Meshy Pro / Fab/Megascans) and who owns the asset manifest/licence review.
7. **Art production capacity** — who executes the art pipeline (in-house technical artist vs contractor vs AI-assisted)? This gates Phase 1 timeline more than engineering.

---

## 13. Research foundation
Full cited reports (this spec is a synthesis of them):
- [`01-rendering-stack.md`](../research/3d-world/01-rendering-stack.md) — R3F v9 + WebGL2-first/WebGPU-opt-in; migration constraint; Babylon fallback.
- [`02-art-asset-pipeline.md`](../research/3d-world/02-art-asset-pipeline.md) — stylized-PBR; lighting; terrain; vegetation; characters; glTF-Transform gate; CC0 + AI assets.
- [`03-performance-optimization.md`](../research/3d-world/03-performance-optimization.md) — device-tier budgets; draw-call/VRAM discipline; governor; context-loss; streaming.
- [`04-game-architecture.md`](../research/3d-world/04-game-architecture.md) — sim-outside-React; Koota ECS; fixed timestep; camera; recast; hosting; persistence; module breakdown.
- [`05-educational-design.md`](../research/3d-world/05-educational-design.md) — beauty-as-envelope; two-modes; ECD/stealth assessment; spaced retrieval; MoMO tutoring + safety; anti-dark-patterns; COPPA; accessibility.

*Benchmark decoded: the "Fable 5 demo" is `Braffolk/fable5-world-demo` — a WebGPU three.js world (190k trees, 1M grass, probe-GI, volumetrics, zero bundled assets). It is the honest proof of what a browser can do in 2026 and the quality bar L3ARN targets — reached on WebGL2 via stylized-PBR + the mature post stack.*
