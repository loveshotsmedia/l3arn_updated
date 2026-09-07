# L3ARN WORLD ARCHITECTURE

_Canonical planning artifact 2 of 5 (`docs/L3ARN_MASTER_GOAL.md` §19). How the experience in `L3ARN_GAME_EXPERIENCE_BIBLE.md` is built on the approved stack. Grounded in the code on `main` @ `85ef14a`; every "exists" claim cites a file. Written 2026-09-07._

Stack is unchanged and non-negotiable (`MASTER_GOAL` §11): Next.js 15 · React 19 · Three.js 0.171 · React Three Fiber 9 · drei 10 · `camera-controls` 3 · koota ECS · zustand 5 · `postprocessing` 6.39 · Railway (Express) · Supabase. No Unity/Unreal/Godot. No physics engine in v1 (ADR-062 defers; see §12).

---

## 1. What exists today (reuse inventory)

`packages/world-engine/src/`:

| Module | Role | Verdict |
|---|---|---|
| `WorldCanvas.tsx` (143) | R3F `<Canvas shadows>`, scene switch, device tier + FPS governor wiring, `onEvent` bus | **Keep**; becomes the always-mounted world layer |
| `state/worldStore.ts` (147) | zustand: `world` (koota), `playerEntity`, `moveTarget`, `worldMode`, `settleTarget`, `currentScene`, `worldStateFrozen`, `qualityTier`, `dpr`, `unlockedHoldingIds` | **Keep + extend** (§4) |
| `core/world.ts`, `core/clock.ts`, `render/SimLoop.tsx` | koota ECS world, fixed-step clock, per-frame sim step | **Keep** |
| `systems/movement.ts` | exponential ease-out toward `MoveTarget` | Keep for comfort-click; **add** velocity movement system |
| `systems/avatarHeading.ts`, `ambientMotes.ts`, `ambientFlicker.ts`, `missionMode.ts` | heading, motes, torch flicker, explore↔mission controller | **Keep** |
| `render/CameraRig.tsx` (88) | `camera-controls`, Sims-style constraints, click-to-move, settle | **Keep as `comfort-click` rig** |
| `render/Lighting.tsx` (57) | HDRI IBL + visible sky, hemisphere, one shadow sun, ACES | **Keep; parametrise by zone** |
| `render/PostProfiles.tsx` | N8AO + Bloom in explore; none in mission | Keep; fix N8AO warnings; tier-gate |
| `scenes/GreatHall.tsx` (204) + 13 `objects/*` + `art/proceduralTextures.ts` | the Great Hall | **Keep**; add mission objects, doors, exterior |
| `device/deviceTier.ts` | LOW/MED/HIGH, DPR caps, FPS governor | **Keep**; drives every budget below |
| `types.ts` | `SceneKey`, `WorldEvent`, `SceneProps` | **Extend** |

`apps/web/src/app/(student)/`: `layout.tsx` (header + Pause), `academy/page.tsx` (129; mounts `WorldCanvas`, `hudHint`, `MissionOverlay`), `academy/MissionOverlay.tsx` (47), `mission/[missionId]/MissionExperience.tsx` (1244; the whole mission), `enter/page.tsx`, `onboarding/house/page.tsx` (1075, DOM), `onboarding/companion/page.tsx` (108, DOM). `apps/web/src/lib/student-session.ts` (all Railway calls).

Backend contracts consumed by the world (unchanged): `POST /api/student/mission/start|complete|evidence`, `POST /api/student/session/house|companion|holdings|calibration-signals`, `POST /api/student/calibration/snapshot`, `GET /api/student/session/holdings` (`student-session.ts:110-442`).

---

## 2. Layer model

```
┌──────────────────────────────────────────────────────────────────┐
│ HUD layer (DOM, position:fixed, pointer-events:none, z 20)       │  tokens: theme.ts
│   lockup · breadcrumb · focus · pills · keycaps · satchel · rail  │
│   zone card · narration player · contextual verb · toasts        │
│   modals (blur world) · pause menu                               │
├──────────────────────────────────────────────────────────────────┤
│ Entry overlay (DOM, z 30, only before first control hand-off)    │
├──────────────────────────────────────────────────────────────────┤
│ World layer: <WorldCanvas> position:fixed inset:0 z 10           │  never unmounts
│   Scene registry → active zone scene(s)                          │
│   Camera rig (exactly one) · Lighting(zone) · Atmosphere(zone)   │
│   PostProfiles(tier, mode) · SimLoop                             │
│   Entities: player · companion · interactables · mission objects │
└──────────────────────────────────────────────────────────────────┘
        ▲ WorldEvent bus ▲                     ▼ zustand worldStore ▼
┌──────────────────────────────────────────────────────────────────┐
│ Headless controllers (React hooks, no DOM):                      │
│   useMission001Controller · useCompanionController               │
│   useZoneController · useAudioManager · useCameraMode            │
└──────────────────────────────────────────────────────────────────┘
        ▼ student-session.ts (unchanged API surface) ▼
                 Railway ai-workers → Supabase (RLS)
```

The `(student)` route group renders the World layer once in `layout.tsx`; child routes (`/academy`, `/onboarding/house`, `/onboarding/companion`, `/mission/[id]`) become **states of the HUD/overlay layer**, not separate pages with their own canvas. Route changes are allowed for deep-linking but must not unmount the canvas (Next layout persistence handles this when the canvas lives in the layout).

---

## 3. Shell (Phase 1)

`apps/web/src/app/(student)/layout.tsx`

- Remove the header. Mount `<WorldCanvas>` in a `position: fixed; inset: 0` div. Mount `<HudLayer>` above it.
- Identity comes from `getVerifiedIdentity()` (sessionStorage, verified server-side) exactly as `academy/page.tsx` does today; `localStorage` dev fallback stays dev-only.
- `Pause` moves into the HUD pills and opens the pause menu; "Ask a grown-up" navigates to `/student/enter?token=…` **with the session intact** (fixes the live dead end — `layout.tsx:13-15`).

Canvas sizing is already correct on production (measured 91–93 %); the change is layering, not the height chain.

---

## 4. State — `worldStore` extensions

```ts
// additions, all with tests like the existing store tests
cameraMode: 'first-person' | 'third-person' | 'comfort-click';   // §5
setCameraMode(mode); comfort: { sensitivity: number; invertY: boolean; headBob: boolean; vignette: boolean };
currentZone: ZoneKey | null; zoneEnteredAt: number;             // §7
interactables: Record<string, InteractableState>;               // §8
focusedInteractableId: string | null; contextualVerb: string | null;
companion: CompanionState;                                       // §10
mission: MissionWorldState | null;                               // §9 (world-side mirror only)
audio: { master: number; voice: number; sfx: number; unlocked: boolean }; // §11
persistent: { repairedMachines: string[]; litBanner: House | null }; // §13, hydrated from holdings/session
```

Rules: per-frame values (velocity, look) live in refs/ECS components, **never** in React state. Store holds mode/config/discrete state only. `worldStateFrozen` (existing) is honoured by every system that writes.

Server-side persistence of preferences: extend `child_sessions` or add `student_world_prefs` (migration `014_student_world_prefs.sql`; RLS: parent read own child, service_role write) for `cameraMode`, comfort settings, audio levels. `localStorage` is never the authority (`MASTER_GOAL` §15).

---

## 5. Camera rigs (Phase 2) — gated on ADR-004 supersession

```tsx
// WorldCanvas.tsx — mutually exclusive, never two at once
{cameraMode === 'comfort-click' && <CameraRig />}
{cameraMode === 'first-person'  && <FirstPersonRig eyeHeight={1.45} fov={72} />}
{cameraMode === 'third-person'  && <ThirdPersonRig distance={6} height={2.6} pitchDeg={12} />}
```

`render/FirstPersonRig.tsx` (new):
- Look: drei `<PointerLockControls>`; engage on canvas click; "Click to look around" plate until `document.pointerLockElement`; `Esc` releases.
- Move: one `useFrame`; keyboard state in a **ref**; direction from `camera.getWorldDirection()`, **Y zeroed and re-normalised** (the classic look-down-slows-you bug); walk 2.6 m/s, sprint 4.4 m/s, 0.08 s accel; no jump.
- Y = `terrainHeight(x, z) + eyeHeight` every frame.
- Writes the player entity's Position each step so companion/interaction systems read one truth.
- Comfort: sensitivity, invert-Y, head-bob (off), speed-driven vignette (DOM overlay opacity from store), `prefers-reduced-motion` → force `comfort-click`.

`render/ThirdPersonRig.tsx` (new): same movement code, camera offset behind/above, character mesh visible.

`CameraRig.tsx` (existing) unchanged; becomes the comfort rig; `setMoveTarget` flow retained; settle transition retained.

Collision (`systems/collision.ts`, new): per-scene array of AABBs exported by each scene (`GreatHall.colliders`), candidate position tested, reject-and-slide. Zero-cost at this geometry count. Touch input (§14) drives the same movement system through an on-screen stick component in the HUD layer.

## 6. Rendering: lighting, atmosphere, post, budgets

`render/Lighting.tsx` becomes zone-parametrised: `<Lighting zone={zone} tier={tier} />` reading `ZONE_ATMOSPHERE[zone]` (`theme.ts`) — sky colour, fog colour/near/far, sun colour/angle, ambient tint, HDRI. Interior zones keep the Great Hall recipe (steep sun, HDRI sky through the roof); exterior zones use `<color attach="background">` + `<fog>` with **fog = sky at horizon**. Shadow map 2048 on HIGH/MED, 1024 on LOW (read the governor's tier). Tree canopies cast shadows (dapple for free).

`render/PostProfiles.tsx`: N8AO only on HIGH; Bloom on MED+; none in mission mode (existing rule). Fix the `glBlitFramebuffer` warning flood (pin/upgrade `n8ao`; if unresolved, N8AO stays HIGH-only and the console-clean gate applies to MED/LOW).

Budgets per zone (gates in Phase 10): ≤ 40 draw calls (`gl.info.render.calls` logged by the governor), ≤ 150k triangles visible on LOW, ≤ 8 MB GLB per zone (asset gate), textures none in Style Lock B (KTX2 arrives with uplift), FPS floor 30 on LOW / 60 on HIGH held for 60 s in Playwright.

## 7. Scenes and zones

`scenes/registry.ts` (new): `SceneKey` → component + `ZoneKey[]` + colliders + spawn points + atmosphere. Initial scenes:

| SceneKey | Zones | Purpose |
|---|---|---|
| `great-hall` (exists) | `great-hall`, `dais` | arrival, Mission 001, banners, doors to grounds/chamber/grove |
| `calling-chamber` (new) | `calling-chamber` | House Calling ceremony |
| `companion-grove` (new; `GroveNook` exists as an object) | `companion-grove` | companion unlock, later evolution |
| `academy-grounds` (new) | `courtyard`, `path-north` | exterior: sky, fog, seeded scatter, backdrop ring, signposts; makes the hall a place |
| `mission-commons` (stub) | — | future mission board (out of this build) |

Transitions (`render/SceneTransition.tsx`, new): fade-to-fog-colour 300 ms, swap scene, fade in; camera position carried by spawn point. Replaces the current hard swap (`WorldCanvas.tsx` header "Open Question").

Zone system (`systems/zones.ts`, new): axis-aligned zone volumes; on enter → `currentZone` change → atmosphere lerp (2 s), zone card (debounced 60 s), ambient audio crossfade, `WorldEvent { type: 'zone-entered' }`.

Seeded scatter (`objects/Scatter.tsx`, new): `mulberry32(zoneSeed)` — never `Math.random()` (hydration + learnable layout). One `InstancedMesh` per archetype (conifer, deciduous, rock, grass tuft, flower) per zone.

## 8. Interaction system

`systems/interaction.ts` + `objects/Interactable.tsx` (new): each interactable registers `{ id, verb, radius, position, onInteract, affordance: 'glow-puddle' | 'none' }`. Focus resolution: first-person → camera-forward raycast within 3 m; comfort-click → pointer raycast. Focused interactable sets `contextualVerb`; `E` / click / tap triggers `onInteract`. Affordance: `circleGeometry` + additive radial gradient, pulsing, under every interactable (the Sorting Computer's dais ring already does this — generalise it).

`SortingComputer.tsx` migrates onto this system; its event contract (`object-interact` → `enterMissionMode()`) is unchanged.

## 9. Mission runtime — headless controller + in-world scene

Extract from `MissionExperience.tsx` (1244) into `apps/web/src/features/mission-001/useMission001Controller.ts`:

- owns `startMission`, task list from `StartMissionResponse`, current task, `tryCapture(...)` evidence calls, AI-mistake logic, explanation/reflection options, `completeMission`, `updateCalibration`, `unlockHolding`, dev-fallback and error states.
- exposes a pure state machine: `phase`, `task`, `submitSort(crystalId, binId) → { accepted, hint? }`, `submitMistakeChoice(id)`, `submitExplain(...)`, `submitReflect(...)`, `finish()`.
- **Every evidence event keeps its current `captureType` and `contentJson` shape**, so `learning_evidence_events`, mastery and report writes are identical. Regression test: completing via the controller writes the same rows as today (+25/+75/+15/+20, 2 badges, 5 mastery skills).

Consumers:
1. **In-world scene** (`scenes/great-hall/mission001/*`, new): `Crystal` (pickable, colour + glyph + shape), `Bin` (snap zone, conduit, glow), `SortingComputer` states (`broken | partial-1..3 | repaired | celebrating`) with sparks/flicker/arcs (`objects/SortingComputer.tsx` extended), `Lever` sequencing, mistake reveal, completion ceremony (light sweep, banners, motes → HUD rail, holding rise). It calls the controller; the controller never knows about meshes.
2. **DOM card** (`MissionExperience.tsx` slimmed to presentation) for `interactive-lite` and `text-audio-offline` delivery modes (ADR-016), restyled to the choice-card grammar.

Choice modals (mistake options, explain, reflect) are HUD-layer components over the blurred live world with keys `1`–`4` bound.

`MissionOverlay.tsx` is retired once the in-world scene is the `3d` path; the standalone `/student/mission/[missionId]` route remains for lite/offline and deep links, rendering the DOM card **over the mounted world**, never on a void.

## 10. Companion

`entities/companion.ts` + `systems/companionController.ts` + `objects/Companion.tsx` (new):

- ECS entity with Position, Heading, `CompanionState` (`idle | follow | move-to | look-at-player | look-at-objective | point | excited | concerned | celebrate | hint | talk | teleport`), target ref.
- Controller: follow at 1.5–3 m to the player's forward-left; avoid blocking the path; teleport when > 12 m or stuck > 3 s; look-at targets via head bone or whole-body yaw in Style Lock B; state transitions on `WorldEvent`s (mission beats, zone entry, idle timers).
- Mesh: Style Lock B procedural rig per companion (distinct silhouette/colour/motion personality) → replaced by generated-concept GLTF with skeletal animation clips in Phase 8 (`useGLTF` + `useAnimations`, clips named after states).
- Dialogue: `CompanionLine { id, text, trigger, source: 'compiler' | 'scripted' }` → narration player (HUD) with progress + **Transcript** (exact text). Compiler contract change: `companionDialogue` from exactly one line to up to 5 triggered lines (prompt `mission-001-3d.prompt.ts`; Zod schema in `shared-types`; still validated; still cannot rename the companion — keep the existing test).
- Voice (optional, parent flag): `AudioManager.speak(line)` via a TTS provider adapter; captions on by default. Provider is a founder decision.

Founder/parent-only observability: `CompanionStateOverlay` (HUD, gated on role) mirroring `F1`.

## 11. Audio

`audio/AudioManager.ts` (new; no new dependency — WebAudio through `THREE.AudioListener` on the camera and `THREE.PositionalAudio` on emitters; `THREE.Audio` for UI/ambient). Buckets `master/voice/sfx/ambient`; unlock on first gesture; per-zone ambient crossfade; SFX registry keyed by event (`crystal.pickup`, `bin.accept`, `bin.reject`, `machine.spark`, `machine.restore`, `ui.confirm`, `celebrate`, `banner.unfurl`, `creature.manifest`); captions channel feeding the HUD. Files: OGG + MP3 fallback, CC0 or generated (see `L3ARN_ASSET_FACTORY.md`). Never a microphone.

## 12. Physics — deferred by ADR

ADR-062 (draft): AABB reject-and-slide is sufficient for locomotion; crystal "carry" is a kinematic follow, "place" is a snap on proximity, "assisted toss" is a scripted arc. If a later mission needs stacking/rolling/collision puzzles, evaluate `@react-three/rapier` via a new ADR. No physics dependency in this build.

## 13. Persistence of world response

World consequences are data: extend the holdings pattern. `GET /api/student/session/holdings` already hydrates unlocked buildings. Add `worldFlags` to the same response (server-derived from `mission_attempts` completions: `machine-001-repaired`, `banner-lit`) so the hall renders repaired on return without a new table. If a table is needed later, it is `academy_unlocks` per ADR-018/019 domain, RLS as `child_permissions`.

## 14. Input and devices

Desktop: mouse + keyboard (first-person default). Tablet: third-person + on-screen stick + tap-to-interact (default). Phone: comfort-click + tap (default). Detection by pointer type + viewport; override in Pause. All three produce identical `WorldEvent`s and evidence.

## 15. Contracts touched

- `packages/shared-types`: `WorldEventSchema` gains `zone-entered`, `interactable-focused`, `companion-state-changed`, `mission-object-interacted` (all `auditLogged: true`, `reversible` set honestly); `StartMissionResponse.companionDialogue` becomes an array (max 5); holdings response gains `worldFlags`. Each is a Zod change + spec table row (`shared_contracts_spec.md` "Adding New Schemas" steps 1–7).
- `packages/mission-compiler`: prompt v3d-0.3.0 (multi-line companion dialogue, unchanged brevity caps), fallback updated to match, tests updated.
- `services/ai-workers`: holdings route adds `worldFlags`; prefs route for `student_world_prefs`.
- No RLS weakening. No new child-readable founder tables.

## 16. Testing architecture

- **Unit (vitest)** in `world-engine`: movement (Y-zeroing, speeds), collision (slide), zones (enter/exit/debounce), interaction (focus resolution), companion state machine, seeded scatter determinism, camera-mode exclusivity (exactly one rig mounted), `prefers-reduced-motion` → comfort-click.
- **Contract (jest, mission-compiler)**: multi-line dialogue schema, companion-name fidelity, fallback shape.
- **Controller regression**: `useMission001Controller` produces the same evidence/complete payloads as today's component for a scripted run.
- **E2E (Playwright, new `tests/e2e/`)**: login → session → entry → academy; canvas ≥ 90 % viewport; zero console errors and zero N8AO warnings; pointer lock engages; walk 5 s forward moves the player; two reloads → pixel-identical scatter screenshot; Mission 001 in-world completion writes rewards; visual snapshots per milestone into `docs/qa/`.
- **Perf gate**: FPS floor per tier for 60 s; draw calls ≤ 40 per zone; GLB budget (existing CI gate).

## 17. ADRs to file (index rows + first individual ADR files)

- **ADR-004-supersede** — first-person default with mandatory comfort layer; comfort-click remains reduced-motion and phone default; third-person tablet default. **Founder sign-off required before Phase 2 merges.**
- **ADR-061** — staged fidelity: Style Lock B interim, stylized-realism final, hero assets first.
- **ADR-062** — physics engine deferred; AABB + kinematic carry in v1.
- **ADR-063** — companion output voice (TTS) policy, distinct from ADR-027 input audio; parent-controlled; transcript mandatory.
- **ADR-064** — student world preferences persistence (`student_world_prefs`), never `localStorage`.
