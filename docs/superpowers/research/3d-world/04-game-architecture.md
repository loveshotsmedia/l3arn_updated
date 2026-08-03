# 04 — Game Architecture, World Systems & Interaction Patterns

**Research angle:** How to architect a performant, browser-based navigable 3D world / light-RTS ("the Academy") embedded inside the existing Next.js App Router app (`apps/web`), where a student drives a character/companion ("MoMO") across a scene, clicks world objects (e.g. a "Sorting Computer") to launch AI learning missions.

**Audience:** senior game/web engineer. Opinionated. Verified against 2025–2026 sources (links inline; consolidated at end).

**Verdict up front:** Build on **React Three Fiber (R3F v9) + drei + Rapier**, keep the *entire* simulation in a plain vanilla layer (an **ECS via Koota or miniplex**) that runs inside a single R3F `useFrame`, drive rendering by **mutating Three objects through refs** (never React state), gate the whole thing behind a **client-only `dynamic(ssr:false)` island**, and persist a compact serialized world snapshot to **Supabase** on debounced autosave. Pathfinding via **recast-navigation-js** (WASM Recast/Detour) with its **Crowd** API. Multiplayer is explicitly **future scope**; design the sim to be authoritative-server-portable but ship single-player.

---

## 1. The core tension: a 60fps game loop inside React

This is the single most important architectural decision, and it is where naive R3F games die.

React's mental model — "state changes → re-render → reconcile" — is *actively hostile* to a game loop. Calling `setState` at 60Hz routes every frame through React's scheduler, diffs the tree, and tanks the frame rate. The R3F docs are blunt about it: **"Fast updates are carried out in `useFrame` by mutation"** — grab a `ref` and mutate the Three.js object directly; do **not** call `setState` 60 times/sec ([R3F pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls)).

### The rule set (non-negotiable)

1. **Simulation state lives OUTSIDE React.** The authoritative game state (entity positions, velocities, selection, orders, resources) is held in a plain object graph / ECS world / vanilla store — never in `useState`. React never owns per-frame data.
2. **One loop to rule them all.** R3F already runs a single `requestAnimationFrame` loop. Everything hangs off `useFrame` callbacks (which fire in registration order, then R3F renders — all outside React). Do not spin your own `rAF` alongside R3F; you'd get two loops fighting over the same GPU. `useFrame` *is* your game loop ([R3F Discussion #697](https://github.com/pmndrs/react-three-fiber/discussions/697)).
3. **Render = mutation through refs.** Systems write to `mesh.position`, `mesh.quaternion`, `instancedMesh.setMatrixAt(...)`. `meshRef.current.position.x += delta`. No React involvement.
4. **React is for the shell, not the sim.** React/JSX owns: the scene graph *structure* (which objects exist), the HUD/DOM UI (mission panel, resource counters, tooltips), and lifecycle (mount/unmount of zones). React re-renders happen on *discrete* events (unit selected, mission opened), not per frame.
5. **Cross-boundary state uses a transient store.** When the sim must inform React (e.g. "a unit got selected → show its card"), push through **Zustand/Valtio subscribed transiently** so only the one subscribing component updates, not the tree. Zustand lets you `subscribe` to a store slice *without* a re-render for the hot path, and select a slice *with* a re-render for the cold path ([poimandres cheatsheet](https://react-community-tools-practices-cheatsheet.netlify.app/state-management/poimandres/)).

### Fixed timestep vs variable

Use a **fixed-timestep accumulator for simulation** and **interpolate for render** — the canonical "Fix Your Timestep" pattern ([gafferongames](https://gafferongames.com/post/fix_your_timestep/)). Physics/AI/gameplay logic that must be deterministic (and networkable later) *must not* be fed raw `delta`, or behavior changes with frame rate (jitter, tunneling, "explosions").

```ts
// inside a single useFrame(state, frameDelta) at the root of the world
const DT = 1 / 60;               // fixed sim step (seconds)
accumulator += Math.min(frameDelta, 0.25); // clamp to avoid spiral-of-death
while (accumulator >= DT) {
  prevState.copyFrom(currState);  // snapshot for interpolation
  stepSimulation(world, DT);      // ECS systems: movement, AI, pathing, collisions
  accumulator -= DT;
}
const alpha = accumulator / DT;
renderInterpolate(world, alpha);  // mutate Three objects = lerp(prev, curr, alpha)
```

- **Fixed** for: movement integration, steering/pathing, unit AI, resource ticks, cooldowns.
- **Variable (raw delta)** is fine for: pure cosmetic tweens, camera smoothing, particle wiggle, idle animation — anything with no gameplay consequence.
- **Clamp** `frameDelta` (e.g. `0.25s`) so a tab-switch stall doesn't trigger a "spiral of death" where the `while` loop can never catch up.
- For an educational world with tens–low-hundreds of entities, you may not *need* interpolation initially; but wiring the accumulator now costs nothing and future-proofs determinism + networking.

### On-demand rendering (huge battery win for a mostly-idle classroom)

The Academy is not Starcraft — most of the time nothing moves (student reading a mission panel). Use R3F's `frameloop="demand"` and call `invalidate()` only when something actually changes, dropping idle GPU usage to ~0 ([Rendering only when needed](https://gracious-keller-98ef35.netlify.app/docs/recipes/rendering-only-when-needed/)). Practical hybrid: run `frameloop="always"` while units are in motion / a mission cutscene plays, flip to `"demand"` when the world settles. This matters a lot for kids on Chromebooks/tablets.

---

## 2. ECS: worth it here, and which library

### Is ECS worth it for L3ARN?

**Yes, but lightweight.** The Academy has heterogeneous entities (student avatar/MoMO, NPC companions, interactable stations like the Sorting Computer, decorative props, projectiles/FX) that share overlapping behaviors (has-position, is-selectable, is-interactable, is-pathfinding, plays-animation). Classic OOP inheritance gets brittle fast here (the diamond problem: is a "companion that can be selected and issues missions" a Unit or an Interactable?). ECS composition — attach `Selectable`, `Interactable`, `Pathfinding` *traits/components* to any entity — is the clean model ([webgamedev ECS](https://www.webgamedev.com/code-architecture/ecs)).

**But** you don't need the extreme SoA/typed-array performance of bitECS. Entity counts are modest (dozens to low hundreds, not 50k bullets). Optimize for **developer experience + React integration**, not raw archetype throughput.

### Library comparison (2025–2026)

| Library | Model | Perf | React bindings | Fit for L3ARN |
|---|---|---|---|---|
| **bitECS** | SoA, typed arrays, functional, IDs only | **Fastest**, best memory (typed-array struct-of-arrays) | None official (roll your own) | Overkill; poor DX for React integration. Use only if you later hit a 10k+ entity wall. |
| **miniplex** | Object entities ("archetype" queries), "gentle game entity manager" | Very good for typical web games | `@miniplex/react`: `<Entity>`, `<Component>`, `useEntities` | **Strong candidate.** Best-documented React story, entities are plain objects (easy to serialize + debug). |
| **Koota** (pmndrs) | Traits, SoA *or* AoS, relations, change-tracking | Excellent, cache-friendly SoA; built for real-time | First-class: `useQuery`, `useTrait`, `useActions`, `WorldProvider` | **Top candidate.** Newer, pmndrs-maintained (same house as R3F), designed *specifically* for R3F/XR real-time state. |
| becsy | Multithreaded, TS-first | Good | None | Niche (workers); skip. |

Sources: [webgamedev ECS](https://www.webgamedev.com/code-architecture/ecs), [npm trends](https://npmtrends.com/@javelin/ecs-vs-@lastolivegames/becsy-vs-bitecs-vs-ecsy-vs-miniplex-vs-tick-knock), [ECS benchmark](https://github.com/noctjs/ecs-benchmark), [Koota](https://github.com/pmndrs/koota), [miniplex](https://github.com/hmans/miniplex).

### Recommendation: **Koota** (primary), miniplex (fallback)

Koota is the opinionated pick because it's from the **pmndrs** ecosystem (same maintainers as R3F/drei/zustand/valtio/rapier), so it's designed to coexist with `useFrame` and provides React hooks that already respect the "don't re-render on the hot path" rule. Its trait model maps cleanly to L3ARN's needs, and `useQuery`/`useTrait` give you *reactive* React views (HUD, unit cards) that update only when the queried set changes — not every frame.

```ts
// world.ts — vanilla, importable anywhere (systems, save, tests)
import { createWorld, trait } from 'koota';

export const Transform   = trait({ x: 0, y: 0, z: 0, rotY: 0 });
export const Velocity    = trait({ x: 0, y: 0, z: 0 });
export const MoveOrder   = trait({ tx: 0, tz: 0 });        // destination for click-to-move
export const Path        = trait(() => ({ waypoints: [] as number[][], i: 0 }));
export const Selectable  = trait({ selected: false });
export const Interactable= trait({ kind: 'sortingComputer', missionId: '' });
export const Ref3D       = trait(() => ({ obj: null as THREE.Object3D | null })); // link to Three obj

export const world = createWorld();

// spawn the student avatar / MoMO
export const player = world.spawn(
  Transform, Velocity, Selectable, Ref3D
);
// spawn an interactable station
world.spawn(
  Transform({ x: 12, z: -4 }),
  Interactable({ kind: 'sortingComputer', missionId: 'mission-001' }),
  Ref3D
);
```

```ts
// systems.ts — pure functions over the world, called inside the fixed-step loop
export function movementSystem(world: World, dt: number) {
  world.query(Transform, Velocity).updateEach(([t, v]) => {
    t.x += v.x * dt; t.z += v.z * dt;
  });
}
export function pathFollowSystem(world: World, dt: number) {
  world.query(Transform, Velocity, Path).updateEach(([t, v, path]) => {
    // steer toward path.waypoints[path.i]; advance i when close; zero velocity at end
  });
}
```

miniplex is the fallback if the team prefers plain-object entities (trivially `JSON.stringify`-able for save/load) over Koota's trait store; its React bindings (`<Entity>`/`<Component>`) let you declaratively bind an entity to a `<mesh>` in JSX, which some teams find more intuitive.

---

## 3. Rendering & the R3F/drei/Rapier stack

**Confirmed 2025–2026 baseline** ([Three.js + Next.js 2026 guide](https://threejsresources.com/frameworks/three-js-nextjs), [R3F v9 note](https://nextjs-forum.com/post/1329401496433066046)):

- **`three`** — renderer (WebGPURenderer optional/experimental; ship WebGL2 for device coverage).
- **`@react-three/fiber` v9** — React 19 / Next 15 compatible (v8 is **not**; must use v9). This is the loop + reconciler.
- **`@react-three/drei`** — batteries: `<OrbitControls>`/`CameraControls`, `<Instances>`/`<Instance>` (declarative InstancedMesh, hundreds of thousands of objects in one draw call), `<Select>` (selection with visual feedback), `Bvh` (accelerated raycasting wrapper), `useGLTF`, `Environment`, `AdaptiveDpr`, `Detailed` (LOD), `Bounds`. ([drei npm](https://www.npmjs.com/package/@react-three/drei), [R3F events](https://r3f.docs.pmnd.rs/tutorials/events-and-interaction))
- **`@react-three/rapier`** — WASM physics (matured in 2025; the reason R3F became viable for games). Use for character controller collision, ground raycasts, and "walk into station" triggers. Kinematic character controller for MoMO; sensors/colliders for interactables. ([R3F future talk](https://gitnation.com/contents/from-websites-to-games-the-future-of-react-three-fiber))
- **`three-mesh-bvh` / drei `Bvh`** — orders-of-magnitude faster raycasting on complex terrain; "500 rays vs 80k-poly model at 60fps." Essential once terrain has real geometry — click-to-move raycasts hit the ground mesh every click, and hover does it every pointer-move. ([three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh), [drei Bvh](https://drei.docs.pmnd.rs/performances/bvh))

### Rendering-perf rules (from R3F pitfalls)
Share geometries/materials via `useMemo`; **instance** repeated props (trees, desks, crystals); `useGLTF`/`useLoader` cache assets (never reload textures per component); **toggle `visible` instead of mount/unmount** for expensive objects; never `new Vector3()` inside `useFrame` (pool scratch vectors); use `AdaptiveDpr`/`AdaptiveEvents` + LOD for weak devices ([R3F pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls), [100 Three.js tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips)).

---

## 4. Camera system (RTS-style)

Use **`camera-controls` (yomotsu)** — via drei's `<CameraControls>` wrapper. It's OrbitControls-plus: smooth interpolated transitions and the exact verb set an RTS needs ([camera-controls](https://github.com/yomotsu/camera-controls), [docs](https://yomotsu.github.io/camera-controls/)):

- **Truck** = screen-space pan (WASD / edge-scroll / MMB-drag) — the RTS bread-and-butter.
- **Dolly** = move camera in/out (mouse wheel) — true zoom that changes composition (prefer over FOV zoom for RTS).
- **Rotate** = azimuth (yaw) + polar (pitch), clamp polar to keep a top-down-ish RTS tilt.
- **`setLookAt`/`fitToBox`/`moveTo`** with smooth interpolation for "focus on selected unit" / "jump to mission" / cinematic intros.
- Per-button action mapping (`mouseButtons.left/right/middle/wheel`, touch combos `TOUCH_DOLLY_TRUCK`) — configure MMB=truck, wheel=dolly, RMB=rotate. Mobile pinch-to-dolly + two-finger-truck out of the box.

**RTS camera controller module** wraps `camera-controls`: constrains polar angle, clamps pan to world bounds, exposes `focusEntity(id)` / `followEntity(id)` (follow-cam that re-targets each frame from the entity's `Ref3D`). Keep camera smoothing on the **variable** timestep (cosmetic).

---

## 5. Navigation & pathfinding

**Recommendation: `recast-navigation-js`** (Isaac Mason) — the WASM port of industry-standard **Recast/Detour**. It both *generates* navmeshes and *queries* them, and ships a **Crowd** API for agent movement + local avoidance. ([recast-navigation-js](https://github.com/isaac-mason/recast-navigation-js), [npm](https://www.npmjs.com/package/recast-navigation))

Why not `three-pathfinding` (donmccurdy/PatrolJS)? It's lighter and fine for simple static levels, but it *does not build navmeshes* (you must bake in Blender/Recast-CLI and export glTF) and has **no crowd/dynamic-obstacle support**; its author himself points people to recast-navigation-js for many-agent / dynamic scenes ([three-pathfinding](https://github.com/donmccurdy/three-pathfinding), [forum: CPU bottleneck](https://discourse.threejs.org/t/r3f-three-pathfinding-cpu-bottleneck-how-to-truly-optimize-navmesh-pathfinding-for-many-enemies/87162/3)). For a world where the Academy layout may change and companions wander, recast wins.

Packages: `@recast-navigation/core`, `@recast-navigation/generators` (high-level gen), `@recast-navigation/three` (Three geometry → navmesh helpers).

```ts
// build navmesh once from the walkable ground/collision meshes
import { init } from 'recast-navigation';
import { threeToSoloNavMesh } from '@recast-navigation/three';
await init(); // load WASM
const { navMesh } = threeToSoloNavMesh(walkableMeshes, { cs: 0.2, ch: 0.2 /* ...*/ });

import { NavMeshQuery, Crowd } from 'recast-navigation';
const query = new NavMeshQuery(navMesh);
const crowd = new Crowd(navMesh, { maxAgents: 64, maxAgentRadius: 0.5 });
const agentId = crowd.addAgent(startPos, { radius: 0.4, height: 1.6, /*...*/ });

// on click-to-move: snap target to navmesh, tell the crowd
const { point } = query.findClosestPoint(worldHitPoint);
crowd.getAgent(agentId).requestMoveTarget(point);

// each FIXED sim step: crowd.update(dt); then copy agent positions into Transform/Ref3D
```

- **Static solo navmesh** for launch (bake at load; L3ARN zones are hand-authored). Move to **tiled navmesh + `TileCache` temporary obstacles** (`addCylinderObstacle`) only if you add movable blockers.
- **Crowd** gives you steering + inter-agent avoidance for free, so a squad of companions doesn't stack. Feed `crowd.update(dt)` from the **fixed** step.
- **Steering AI (`yuka`)** is an *optional* higher-level layer for autonomous NPC behaviors (wander, seek, pursue, perception/vision, FSM/fuzzy logic) — engine-agnostic, pairs with Three ([yuka](https://github.com/Mugen87/yuka)). For L3ARN's mostly-scripted companions, **Recast Crowd alone is enough**; add yuka only if NPCs need emergent behavior. Don't run both pathing systems on the same agent.

---

## 6. Interaction: selection, click-to-move, hover, raycasting

R3F turns any `Object3D` with a `raycast` method into an event target (`onClick`, `onPointerOver/Out`, `onPointerMissed`) ([R3F events](https://r3f.docs.pmnd.rs/tutorials/events-and-interaction)). Patterns:

- **Click-to-move:** `onClick` on the ground plane → `event.point` is the world hit → snap to navmesh (`findClosestPoint`) → set the player's `MoveOrder`/crowd target. Show a click marker (decal/ring), fire on `onPointerMissed`-vs-`onClick` discipline so UI clicks don't move the unit. Wrap terrain in drei `<Bvh>` so this raycast stays cheap.
- **Selection:** `onClick` on a `Selectable` entity's mesh toggles its `Selected` trait → pushes selected-entity id into the Zustand UI store → HUD unit card appears (a *discrete* React update). drei `<Select>` gives box/click selection + outline feedback if you want marquee drag-select later.
- **Interactables (Sorting Computer):** `onClick` (or Rapier proximity sensor when MoMO walks up) on an `Interactable` entity → read its `missionId` → dispatch to the mission system → open the mission React panel + call Railway to spin up the AI session. Hover shows an affordance (emissive highlight + DOM tooltip via drei `<Html>`).
- **Hover:** `onPointerOver` sets a `hovered` flag on the entity; the render system (not React) brightens the material via ref. Avoid `setState` in `onPointerMove` (fires constantly — R3F pitfall).
- **Instanced picking:** if stations/props are instanced, `event.instanceId` identifies which instance was hit; combine with `three-mesh-bvh` for fast picking against instanced/complex meshes ([forum: instanced picking](https://discourse.threejs.org/t/best-way-to-do-instanced-mesh-picking-in-2024/59917)).

---

## 7. Hosting the world inside Next.js App Router

Three.js/WebGL is browser-only; SSR of the canvas throws hydration errors. The **required** pattern ([ssr:false trap](https://medium.com/@joshisagarm3/the-ssr-false-trap-in-next-js-app-router-and-how-i-escaped-it-74816bc7a778), [Three.js+Next guide](https://threejsresources.com/frameworks/three-js-nextjs), [use client/use server 2025](https://techify.blog/blog/understanding-use-client-and-use-server-in-nextjs)):

1. The `<Canvas>` component is a **Client Component** (`'use client'`).
2. You **cannot** call `dynamic(() => ..., { ssr:false })` from a *Server* Component in App Router. So: make a **client wrapper** (`'use client'`) that does the `dynamic(..., { ssr:false })`, and import *that* wrapper from the server page. (R3F v8 breaks on React 19/Next 15 — use **v9 RC**.)

```tsx
// app/academy/AcademyCanvas.client.tsx
'use client';
import dynamic from 'next/dynamic';
const World = dynamic(() => import('@/world/World'), {
  ssr: false,
  loading: () => <AcademyLoadingScreen />,   // spinner / progress
});
export default function AcademyCanvas() { return <World />; }
```
```tsx
// app/academy/page.tsx  (Server Component — route, auth gate, data prefetch)
import AcademyCanvas from './AcademyCanvas.client';
export default async function Page() {
  // server-side: verify Supabase session, fetch save-slot metadata
  return <AcademyCanvas />;
}
```

- **Code-split aggressively:** the whole Three/R3F/Rapier/recast bundle should load *only* on the `/academy` route, behind the dynamic import, so parent-dashboard / onboarding pages stay lightweight. Lazy-load heavy assets (GLTF, textures, WASM) via `<Suspense>` + drei `useGLTF.preload`.
- **Asset hosting:** put GLB/KTX2/Draco/textures on a CDN (Vercel static or Supabase Storage bucket / R2); use Draco/Meshopt compression + KTX2 basis textures for fast loads on school networks. Preload the WASM blobs (Rapier, recast) with `<link rel="preload">`.
- **Route isolation:** R3F's own guidance is that each route can host its own canvas or none; don't keep a global canvas mounted across the parent-facing pages ([R3F Discussion #3221](https://github.com/pmndrs/react-three-fiber/discussions/3221)).
- **Fits the existing repo:** this drops in as an `/academy` (or `/student/academy`) route group in `apps/web`; auth stays server-side (Supabase), and the world island calls Railway (`NEXT_PUBLIC_RAILWAY_API_URL`) for missions/AI exactly as the rest of the app does.

---

## 8. State & persistence (save/load to Supabase)

**Two-tier state, cleanly separated:**

- **Sim state (hot, per-frame):** the ECS world (Koota) — never touches React or the network per frame.
- **UI/meta state (cold, discrete):** **Zustand** store for selection, open mission, HUD toggles, camera mode. React subscribes here; the sim writes here only on events.

**Serialization / save model:**
- Define a **compact snapshot schema** = the *dynamic* world delta, not the whole scene. Static level geometry is content (shipped/authored), not saved. Persist: player/companion positions + facing, unlocked zones, active/paused mission state, inventory/resources, in-progress order queues, world-clock. Keep it a small JSON blob (a few KB).
- **Serialize from the ECS**, not from Three objects (Three objects are render output; ECS is truth). With miniplex, entities are already plain objects → near-free `JSON.stringify`. With Koota, walk `world.query(...)` and project traits into a DTO. Version the schema (`{ v: 1, ... }`) so migrations are possible.
- **Supabase persistence:** a `world_saves` (or reuse `learning_sessions`) row keyed by `student_id` + slot, `state jsonb`, `updated_at`, RLS-scoped to the owning student/parent. **Autosave = debounced** (e.g. every 15–30s *and* on meaningful events: mission complete, zone unlock, before unload via `visibilitychange`/`pagehide`). Never autosave per-frame. Optionally keep an append-only event log (matches L3ARN's audit-trail directive) so world state is reconstructable and telemetry-rich for the adaptation pipeline.
- **Load:** server page fetches the save row → passes as initial props → the client world island **hydrates the ECS** before first `useFrame`, then renders. Cold-start (new student) seeds a default world.
- **Determinism payoff:** because sim is fixed-timestep and lives in the ECS, save/load is just "restore entity components" — no fragile re-derivation from render state.

`valtio` is a viable alternative to Zustand for the UI tier (mutable proxy model, works with R3F, `subscribe` for out-of-React reads) ([valtio](https://github.com/pmndrs/valtio)) — but Zustand's explicit `subscribe`-without-render is the cleaner fit for the game↔UI boundary and is already the R3F-recommended shared-state tool.

---

## 9. Multiplayer / networking — **survey only, future scope**

Not in the initial build. Design the sim to be portable to an authoritative server later; ship single-player now. Options when the time comes:

- **Colyseus** — Node.js **authoritative** server framework: automatic room-based state sync, matchmaking, horizontal scaling, MIT-licensed. Best default for a turn/tick-based educational co-op ("classroom room"). Server owns state; clients send intents; server broadcasts patched state. ([Colyseus](https://colyseus.io/), [docs](https://docs.colyseus.io/))
- **geckos.io** — real-time **UDP via WebRTC** DataChannels for unreliable/unordered low-latency messaging; for fast action sync. Overkill and higher-complexity for L3ARN's pace; its own docs steer newcomers to socket.io-style libs first. ([geckos.io](https://github.com/geckosio/geckos.io))
- **Portability guidance:** keep simulation deterministic (fixed timestep ✔), express player input as **commands/intents** (not direct state mutation), and keep the ECS world as the single serializable truth. Then "single-player" is just "the authoritative server runs in-browser"; moving to Colyseus means running the same systems server-side and streaming state. **Do not** bake networking assumptions into rendering. Confidence this migration path holds: **High** for a lockstep/tick design; **Medium** if you later need twitch-latency co-op (then geckos + client prediction).

---

## 10. Recommended module / system breakdown

Vanilla core (framework-agnostic, testable, importable by systems/save/server) sits under `apps/web/src/world/`. R3F/React is a thin view layer on top.

```
apps/web/src/world/
├─ core/
│  ├─ world.ts            # Koota world + trait defs (Transform, Velocity, Selectable, Interactable, Path, Ref3D...)
│  ├─ clock.ts            # fixed-timestep accumulator; exposes step(dt) + alpha
│  └─ serialize.ts        # ECS <-> save DTO (versioned); pure functions
├─ systems/               # pure (world, dt) => void; run inside fixed step, in order
│  ├─ input.ts            # command queue -> intents (move, select, interact)
│  ├─ movement.ts         # integrate Velocity into Transform
│  ├─ pathfinding.ts      # recast Crowd bridge: agents <-> Transform; requestMoveTarget
│  ├─ ai.ts               # (optional) yuka/FSM for autonomous companions
│  ├─ interaction.ts      # proximity/click triggers -> mission dispatch
│  ├─ selection.ts        # maintain Selected set; push ids to UI store
│  └─ animation.ts        # drive avatar clip states from velocity/state
├─ nav/
│  ├─ buildNavmesh.ts     # threeToSoloNavMesh from walkable meshes (once, at load)
│  └─ crowd.ts            # Crowd lifecycle, agent<->entity mapping
├─ render/                # R3F/JSX — VIEW only, mutates Three via refs
│  ├─ World.tsx           # <Canvas>; root <SimLoop/>; frameloop demand/always toggle
│  ├─ SimLoop.tsx         # single useFrame -> clock.step -> run systems -> interpolate
│  ├─ Terrain.tsx         # <Bvh> ground; onClick => move command; onPointerMissed
│  ├─ EntityViews.tsx     # query -> <Instances>/<Instance> or per-entity mesh bound by Ref3D
│  ├─ CameraRig.tsx       # camera-controls wrapper: truck/dolly/rotate, focus/follow, bounds clamp
│  └─ Effects.tsx         # selection rings, click markers, hover highlights (ref-driven)
├─ state/
│  └─ uiStore.ts          # Zustand: selectedId, openMissionId, cameraMode, hud toggles (cold path)
├─ persistence/
│  ├─ saveClient.ts       # debounced autosave -> Supabase world_saves (RLS); load on mount
│  └─ eventLog.ts         # optional append-only telemetry/audit stream
└─ missions/
   └─ missionBridge.ts    # interactable -> open React mission panel + Railway session start
```

### System responsibilities, interfaces & dependencies

| System | Signature | Reads | Writes | Depends on |
|---|---|---|---|---|
| Input | `(world, cmds)` | command queue (from R3F events) | `MoveOrder`, `Selected`, interaction intents | uiStore, event handlers |
| Movement | `(world, dt)` | `Transform`,`Velocity` | `Transform` | fixed clock |
| Pathfinding | `(world, dt)` | `Transform`,`MoveOrder` | `Velocity`/`Transform` (from crowd) | nav/crowd, recast |
| AI (opt) | `(world, dt)` | perception, `Transform` | `Velocity`/`MoveOrder` | yuka |
| Interaction | `(world)` | `Interactable`, proximity/click | mission dispatch | missionBridge, Rapier sensors |
| Selection | `(world)` | `Selectable`, click | `Selected`, uiStore.selectedId | uiStore |
| Animation | `(world, dt)` | `Velocity`, state | anim mixer (via `Ref3D`) | drei/three |
| Render/Interp | `(world, alpha)` | prev+curr `Transform` | Three `Object3D` (via `Ref3D`) | R3F refs |
| Camera | `(dt)` | uiStore.cameraMode, focus id | camera | camera-controls |
| Persistence | debounced/event | ECS snapshot | Supabase | serialize, supabase-js |

**Data-flow contract:** R3F events → push *commands* → Input system converts to intents → fixed-step systems mutate ECS → Render system interpolates ECS → Three refs. React (HUD) reads only the Zustand UI store, which systems poke on discrete events. **No arrow ever points from a per-frame value into React state.**

---

## Top concrete recommendations for L3ARN

- **Renderer stack:** React Three Fiber **v9** (React 19/Next 15 compatible — v8 will *not* work) + `@react-three/drei` + `@react-three/rapier` (physics/character controller) + `three-mesh-bvh` (accelerated raycasting for click/hover). This is the proven 2025–2026 browser-game baseline.
- **Golden rule — sim outside React:** hold ALL per-frame state in a vanilla ECS; mutate Three objects through **refs inside a single `useFrame`**; NEVER `setState` per frame. React owns the shell (scene structure, HUD, lifecycle) only.
- **ECS = Koota** (pmndrs, R3F-native hooks `useQuery`/`useTrait`), with **miniplex** as the fallback if you want plain-object-serializable entities. Skip bitECS/becsy unless you hit 10k+ entities.
- **Game loop:** one `useFrame` at the world root running a **fixed-timestep accumulator** (`DT=1/60`, clamp frameDelta to kill the spiral-of-death) for all gameplay; raw `delta` only for cosmetic tweens; add render interpolation when motion demands it. Use `frameloop="demand"` + `invalidate()` when the world is idle (big battery win on school tablets).
- **Camera:** `camera-controls` (via drei `<CameraControls>`) mapped to RTS verbs — MMB/edge-scroll **truck**, wheel **dolly**, RMB **rotate** (clamp polar), `setLookAt`/`fitToBox` for focus/follow. Pinch + two-finger pan free on mobile.
- **Pathfinding:** **recast-navigation-js** (WASM Recast/Detour) — bake a **solo navmesh** at load from walkable meshes; drive movement via its **Crowd** API (steering + avoidance) from the fixed step. Reserve TileCache obstacles / yuka steering for later; don't run two pathers on one agent.
- **Interaction:** R3F pointer events + drei `<Bvh>` terrain: ground `onClick` → snap to navmesh → move; entity `onClick` → toggle `Selected` → HUD card; `Interactable` click/proximity (Rapier sensor) → launch mission + Railway AI session. Never `setState` in `onPointerMove`.
- **Next.js hosting:** `'use client'` `<Canvas>` behind a **client wrapper** doing `dynamic(import, { ssr:false })` (App Router forbids `ssr:false` in Server Components). Isolate as an `/academy` route so the Three/WASM bundle never loads on parent/onboarding pages; ship Draco/KTX2 assets from CDN/Supabase Storage; preload Rapier/recast WASM.
- **State/persistence:** two-tier — Koota ECS (hot) + **Zustand** UI store (cold, `subscribe`-without-render on the boundary). Save a **compact versioned JSON snapshot derived from the ECS** (dynamic delta only, not static geometry) to a `world_saves` Supabase table (RLS by student), **debounced autosave** (~15–30s + on mission-complete/zone-unlock + `pagehide`); hydrate ECS on load before first frame. Consider an append-only event log to satisfy L3ARN's audit-trail directive and feed the companion-adaptation pipeline.
- **Multiplayer = explicit future scope:** ship single-player, but keep the sim **deterministic + command/intent-driven + ECS-serializable** so a later port to an authoritative **Colyseus** server is a lift-and-shift of the same systems (geckos.io only if you later need twitch-latency co-op).

---

## Sources

- React Three Fiber — [Performance pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls) · [Events & interaction](https://r3f.docs.pmnd.rs/tutorials/events-and-interaction) · [Render on demand recipe](https://gracious-keller-98ef35.netlify.app/docs/recipes/rendering-only-when-needed/) · [Discussion #697 (loop vs React perf)](https://github.com/pmndrs/react-three-fiber/discussions/697) · [Discussion #3221 (routes/canvases)](https://github.com/pmndrs/react-three-fiber/discussions/3221) · [Future of R3F talk](https://gitnation.com/contents/from-websites-to-games-the-future-of-react-three-fiber)
- ECS — [webgamedev ECS guide](https://www.webgamedev.com/code-architecture/ecs) · [Koota (pmndrs)](https://github.com/pmndrs/koota) · [miniplex](https://github.com/hmans/miniplex) · [ECS benchmark](https://github.com/noctjs/ecs-benchmark) · [npm trends](https://npmtrends.com/@javelin/ecs-vs-@lastolivegames/becsy-vs-bitecs-vs-ecsy-vs-miniplex-vs-tick-knock) · [awesome-ecs](https://jslee02.github.io/awesome-entity-component-system/)
- Game loop — [Gaffer: Fix Your Timestep](https://gafferongames.com/post/fix_your_timestep/)
- State — [poimandres state cheatsheet](https://react-community-tools-practices-cheatsheet.netlify.app/state-management/poimandres/) · [valtio](https://github.com/pmndrs/valtio)
- Camera — [camera-controls (yomotsu)](https://github.com/yomotsu/camera-controls) · [docs](https://yomotsu.github.io/camera-controls/)
- Navigation — [recast-navigation-js](https://github.com/isaac-mason/recast-navigation-js) · [npm](https://www.npmjs.com/package/recast-navigation) · [three-pathfinding](https://github.com/donmccurdy/three-pathfinding) · [forum: pathfinding CPU bottleneck](https://discourse.threejs.org/t/r3f-three-pathfinding-cpu-bottleneck-how-to-truly-optimize-navmesh-pathfinding-for-many-enemies/87162/3) · [yuka](https://github.com/Mugen87/yuka)
- Raycasting/instancing — [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) · [drei Bvh](https://drei.docs.pmnd.rs/performances/bvh) · [drei npm](https://www.npmjs.com/package/@react-three/drei) · [forum: instanced picking](https://discourse.threejs.org/t/best-way-to-do-instanced-mesh-picking-in-2024/59917)
- Next.js hosting — [Three.js + Next.js 2026 guide](https://threejsresources.com/frameworks/three-js-nextjs) · [ssr:false trap](https://medium.com/@joshisagarm3/the-ssr-false-trap-in-next-js-app-router-and-how-i-escaped-it-74816bc7a778) · [use client/use server 2025](https://techify.blog/blog/understanding-use-client-and-use-server-in-nextjs) · [R3F+Next setup](https://nextjs-forum.com/post/1329401496433066046)
- Performance — [100 Three.js tips (2026)](https://www.utsubo.com/blog/threejs-best-practices-100-tips)
- Multiplayer — [Colyseus](https://colyseus.io/) · [Colyseus docs](https://docs.colyseus.io/) · [geckos.io](https://github.com/geckosio/geckos.io)
