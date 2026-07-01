# L3ARN 3D World — Research 01: Rendering Technology Stack & Engine Selection

**Research angle:** Which browser 3D rendering technology should L3ARN standardize on for a
high-fidelity, "premium stylized" Academy world that runs inside the existing Next.js App
Router monorepo, targets school Chromebooks + tablets as the hardware floor, and hosts both
free exploration and in-world learning missions.

**Audience:** Senior engineers. Opinionated, concrete, versioned.
**Date:** 2026-06-30. **Facts verified via live web search (2025–2026 sources).**

---

## TL;DR

**Primary recommendation: React Three Fiber (R3F) v9 + drei v10 on three.js (WebGL2 renderer today),
architected so the renderer can be swapped to `three/webgpu` (WebGPURenderer + TSL) per-device
later.** This is the only stack that is simultaneously (a) already in the repo, (b) the
undisputed industry-standard React binding for 3D, (c) capable of the BOTW/Ori "premium stylized"
look via the mature `@react-three/postprocessing` + drei effect stack, and (d) able to degrade
cleanly to weak Chromebook/iPad integrated GPUs by staying on WebGL2 while opting stronger
devices into WebGPU.

**Hard prerequisite (blocking):** the repo is on React 18.3 / Next 14.2 / **R3F v8.17.10** today.
R3F **v8 is incompatible with React 19**; React 19 (and therefore Next 15) requires **R3F v9**.
Any Next 15 / React 19 upgrade must be done *together with* the R3F v8→v9 migration — they cannot
be decoupled. (Verified — see §1 and §8.)

**Fallback:** Babylon.js 8.x (Apache-2.0) if L3ARN later needs a batteries-included engine
(built-in physics, GUI, node material editor, scene inspector, WebGPU compute) more than it needs
tight React ergonomics — accepting a heavier bundle and a weaker React story. **Ruled out for the
primary path: PlayCanvas** (React binding and open-source story are real but the productive
workflow is the commercial cloud editor; weaker fit for an in-repo React-native codebase) and
**raw three.js without R3F** (throws away React state/lifecycle integration the rest of `apps/web`
already depends on).

---

## Current repo baseline (verified from `apps/web/package.json`)

| Dependency | In repo now | Target for React 19 |
|---|---|---|
| `next` | `^14.2.0` | 15.x |
| `react` / `react-dom` | `^18.3.0` | 19.x |
| `@react-three/fiber` | `^8.17.10` | **must move to `^9`** |
| `@react-three/drei` | `^9.109.2` | **must move to `^10`** |
| `three` | `^0.167.1` (r167) | `^0.180+` (r180+) |
| `@types/three` | `^0.167.0` | match three |
| `zustand` | present | unchanged (R3F uses zustand internally) |

The repo is a deliberate, low-risk position to build from: R3F/drei/three are already wired, so
this is an *upgrade + build*, not a green-field engine adoption.

---

## Comparison table

Legend: quality ceiling and Chromebook fit are 1–5 (5 = best). WebGPU/WebGL2 columns describe
2026 reality on the hardware floor.

| Criterion | **R3F v9 + drei (three.js)** | three.js raw (no R3F) | **three.js WebGPU (`three/webgpu` + TSL)** | Babylon.js 8.x | PlayCanvas Engine |
|---|---|---|---|---|---|
| Stylized quality ceiling (web) | 5 — same renderer as raw three + full pmndrs effect stack | 5 | 5 — highest headroom (compute, better AO/GI paths) | 5 — full PBR + node materials + built-in FX | 4–5 |
| React / Next App Router fit | **5 — industry standard, nothing close** | 2 — manual bridge to React state | 5 (via R3F once `three/webgpu` is passed as `gl`) | 3 — `react-babylonjs` exists, less mature | 2 — `@playcanvas/react` exists but editor-first workflow |
| SSR / `ssr:false` story | Well-trodden: `'use client'` + `next/dynamic({ssr:false})` in a client wrapper | Same underlying constraint | Same | Same class of issue | Same class of issue |
| Ecosystem maturity / docs | **5 — drei, postprocessing, controls, loaders, examples** | 5 (three core is huge) | 3 — core solid, effect ecosystem still porting | 4 — strong first-party docs, one vendor | 3–4 — good docs, smaller community |
| Post-processing (bloom/GTAO/AgX/TAA) | **5 — `@react-three/postprocessing` (pmndrs `postprocessing`): bloom, N8AO/GTAO, SMAA, TAA, tone mapping** | 5 (same libs, no React wrapper) | 3 — new TSL `PostProcessing`/RenderPipeline node stack; **EffectComposer does NOT run on WebGPU**, passes still porting | 4 — built-in DefaultRenderingPipeline (bloom, DoF, SSAO, FXAA/TAA) | 4 — built-in post FX |
| Shadow quality (CSM, contact) | 5 — drei `<AccumulativeShadows>`/`<ContactShadows>` + three-csm; **CSM addon is WebGL-only** | 5 | 4 — WebGPU uses `CSMShadowNode` (different API) | 5 — CSM + shadow generators built in | 4 |
| Lighting (HDRI/IBL, probes/GI) | 5 — drei `<Environment>` HDRI/IBL, `<Lightformer>`, light probes; GI via baking | 5 | 5 — best long-term GI headroom | 5 — reflection probes, IBL, some RT features | 4 |
| WebGPU readiness | Opt-in: pass `WebGPURenderer` as R3F `gl` | Native | **Production-ready since three r171 (Sep 2025); zero-config import; auto WebGL2 fallback** | Mature, feature-complete WebGPU + compute | WebGL2-first; WebGPU path maturing |
| WebGL2 fallback reality (Chromebooks/old iPads, 2026) | **5 — WebGL2 is universal; stay here for the floor** | 5 | 5 — auto-falls back to WebGL2 | 5 | 5 |
| Chromebook / weak-GPU fit | **5 — full control of draw calls, LOD, instancing** | 5 | 4 — WebGPU great where present, else identical to WebGL2 | 3 — heavier baseline (~1.4 MB) | 4 |
| Bundle size (core, gzip) | ~168 KB (three) + R3F/drei (tree-shakeable) | ~168 KB | ~168 KB + webgpu build | **~1.4 MB** | ~300 KB |
| License / cost | **MIT (all pmndrs) + MIT (three)** — free | MIT | MIT | **Apache-2.0** — free | Engine **MIT**; **cloud editor is commercial** |
| React 19 / Next 15 status | **v9 required (v8 incompatible)** — verified | n/a (no React coupling) | via R3F v9 | independent of React version | independent of React version |

**Version anchors (verified, 2025–2026):**
- three.js latest ≈ **r185** (monthly release cadence; repo is on r167). WebGPURenderer went
  production-ready at **r171 (Sep 2025)**.
- R3F **v9.x** (current line ~9.5.0) — React 19 compatibility release, works with React 19.0–19.2.
- drei **v10.x** (current ~10.7.x) — the v10 line carries the R3F v9 peer dependency.
- `@react-three/postprocessing` **v3.x** (the v2.16.x line was the last React-18 era; v3 pairs with R3F v9).
- Babylon.js **8.0** (Mar 2025) — native WGSL shaders, no more 3 MB conversion layer.

---

## Dimension-by-dimension analysis

### 1. React 19 / Next 15 compatibility — the blocking constraint (VERIFIED)

This is real and it is the single most important scheduling fact in this doc.

- **R3F v8 does not work on React 19.** v9 is explicitly the "compatibility release for React 19,"
  and R3F had to *bundle the react-reconciler* to track React's internal reconciler bumps —
  it is compatible with React **19.0 through 19.2** (including 19.2's `Activity`).
- **drei must move to v10** and **`@react-three/postprocessing` to v3** in the same step; the
  older drei v9 line had peer-dependency conflicts with R3F v9 that forced `--legacy-peer-deps`.
- Practical rule: **do the React 18→19 / Next 14→15 upgrade and the R3F v8→v9 + drei v9→v10
  migration as one atomic change**, behind CI. The v9 migration guide's breaking changes are
  mechanical (`Props`→`CanvasProps`, `MeshProps`→`ThreeElements['mesh']`, JSX auto-mapping of the
  three namespace) but touch every 3D component.

Sources:
[R3F v9 migration guide](https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide) ·
[R3F React19 compat issue](https://github.com/pmndrs/react-three-fiber/issues/3222) ·
[drei React19 compatibility #2260](https://github.com/pmndrs/drei/issues/2260) ·
[drei R3F-v9 peer dep #2253](https://github.com/pmndrs/drei/issues/2253)

### 2. Stylized-quality ceiling on the web

The "premium stylized" target (BOTW/Ori/AoE-IV) is **not GPU-bound at the renderer level** — it is
an *art-direction + post-processing* problem, and every candidate here can reach it because three,
Babylon, and PlayCanvas all expose full PBR + custom shaders. The look is achieved with: a
`MeshStandardMaterial`/toon hybrid base, strong HDRI-based ambient light, a warm ACES/AgX tone
curve, selective bloom on emissives, subtle ambient occlusion (N8AO/GTAO), soft baked/contact
shadows, and a rim-light pass — all of which R3F+drei+postprocessing deliver as declarative
components. The differentiator is not "can it look good" but "can the same scene *also run at 30–60
fps on a Chromebook*," which pushes the decision toward the lightest, most controllable renderer
(three.js) rather than the heaviest (Babylon).

### 3. Post-processing (bloom, GTAO/SSAO, tone mapping, TAA)

- **WebGL2 path (what ships first):** the pmndrs `postprocessing` library, wrapped by
  **`@react-three/postprocessing`**, is the mature, merged-pass pipeline: `Bloom`, `N8AO`
  (screen-space AO, the de-facto GTAO-quality option in R3F), `SSAO`, `SMAA`, `TAA`,
  `ToneMapping` (ACES Filmic and **AgX** are both available three tone-mapping operators), DoF,
  vignette, chromatic aberration. It merges compatible effects into a single fullscreen pass,
  which is exactly the frame-budget behavior you want on integrated GPUs.
- **WebGPU path (later):** **`EffectComposer` and its legacy passes do NOT run on
  `WebGPURenderer`.** three ships a new **TSL-based `PostProcessing`/RenderPipeline** node stack,
  but it "doesn't yet have the full ecosystem of ready-made passes" the WebGL system has. This is
  the strongest single argument for **staying WebGL2-first now** and treating WebGPU as an
  opt-in enhancement rather than the baseline.

Sources:
[three.js WebGPU migration checklist (utsubo)](https://www.utsubo.com/blog/webgpu-threejs-migration-guide) ·
[three.js post-processing 2026 overview (utsubo)](https://www.utsubo.com/blog/threejs-2026-what-changed) ·
[Field guide to TSL & WebGPU (Maxime Heckel)](https://blog.maximeheckel.com/posts/field-guide-to-tsl-and-webgpu/) ·
[AgX tone mapping in three.js #27362](https://github.com/mrdoob/three.js/issues/27362)

### 4. Shadow quality (CSM, contact shadows)

For a large explorable world, directional-sun shadows need **cascaded shadow maps (CSM)** to stay
crisp near-camera without blowing the shadow-map budget far away.

- three.js has an official CSM addon; **it is WebGLRenderer-only** — **WebGPU uses a separate
  `CSMShadowNode`.** Another reason the WebGL2 path is the stable baseline today.
- For hero props and characters, drei `<ContactShadows>` (cheap, great on weak GPUs) and
  `<AccumulativeShadows>` (baked soft shadows, near-zero runtime cost) give the "grounded, premium"
  feel without per-frame shadow-map cost — ideal for Chromebook mission scenes.

Sources:
[three-csm](https://github.com/StrandedKitty/three-csm) ·
[CSM docs (WebGL-only note)](https://threejs.org/docs/pages/CSM.html) ·
[CSM on WebGPU (CSMShadowNode) — three forum](https://discourse.threejs.org/t/cascaded-shadow-maps-csm-on-webgpu/84235)

### 5. Lighting (HDRI/IBL, light probes/GI)

drei `<Environment>` gives one-line HDRI image-based lighting (preset or custom `.hdr`), which is
the fastest route to the soft, warm, "stylized-realistic" ambient look. `<Lightformer>` shapes
studio-style reflections; light probes are supported. True runtime GI on Chromebook-class hardware
is **not realistic** — the correct move is **baked lighting / baked GI (lightmaps + irradiance
volumes authored in Blender)** loaded as textures, with IBL for the sky/ambient term. This is
renderer-agnostic and is the same answer for Babylon.

### 6. WebGPU readiness + WebGL2 fallback reality on the hardware floor (2026)

- **WebGPU is now broadly shipped** (Chrome/Edge desktop + ChromeOS since 113/2023, Safari 26 added
  it Sep 2025), and ~95% of browsers are WebGPU-capable *globally*. **But global ≠ your floor.**
  On **managed school Chromebooks and older iPads**, WebGPU is frequently unavailable or
  blocklisted: driver/GPU allowlists, older ChromeOS builds held back by device management, and
  weak integrated GPUs where WebGPU compute buys little. **Assume WebGL2 is the guaranteed baseline
  for L3ARN's audience and treat WebGPU as a per-device upgrade.**
- The good news: **three's WebGPURenderer auto-falls back to WebGL2**, and via R3F you can pass
  either renderer as the `gl` prop after a capability probe (`navigator.gpu` + a WebGPU init try).
  So a single codebase can render WebGPU on a modern teacher laptop and WebGL2 on a student
  Chromebook with no forked scene graph.

Sources:
[WebGPU supported in major browsers (web.dev)](https://web.dev/blog/webgpu-supported-major-browsers) ·
[caniuse: WebGPU](https://caniuse.com/webgpu) ·
[WebGPU hits critical mass (webgpu.com)](https://www.webgpu.com/news/webgpu-hits-critical-mass-all-major-browsers/) ·
[three.js 2026 — production WebGPU since r171 (utsubo)](https://www.utsubo.com/blog/threejs-2026-what-changed)

### 7. Next.js App Router / SSR integration & pitfalls

three touches browser-only APIs at import time, so the Canvas cannot be server-rendered. The
correct, well-documented pattern:

1. Put the R3F scene in a `'use client'` component (e.g. `WorldCanvas.tsx`).
2. In a **separate client wrapper**, `next/dynamic(() => import('./WorldCanvas'), { ssr: false })`.
   In App Router you **cannot** call `dynamic(..., { ssr:false })` directly inside a Server
   Component — the `ssr:false` import must live inside a Client Component, then be rendered from the
   Server Component/page. This wrapper indirection is the classic "ssr:false trap."
3. Gate WebGL/WebGPU acquisition behind an effect so nothing GPU-related runs during hydration,
   avoiding hydration-mismatch warnings.

This is identical work for Babylon/PlayCanvas — it is a browser-3D constraint, not an R3F one.

Sources:
[The ssr:false trap in Next App Router (Medium)](https://medium.com/@joshisagarm3/the-ssr-false-trap-in-next-js-app-router-and-how-i-escaped-it-74816bc7a778) ·
[three.js + Next.js integration guide 2026](https://threejsresources.com/frameworks/three-js-nextjs) ·
[R3F canvas-per-route architecture discussion](https://github.com/pmndrs/react-three-fiber/discussions/3221)

### 8. Licensing / cost

- **three.js — MIT. R3F, drei, `@react-three/postprocessing`, pmndrs `postprocessing` — MIT.**
  Zero cost, permissive, no attribution burden that matters for a product. This is the whole
  primary stack.
- **Babylon.js — Apache-2.0.** Free, permissive, patent grant. Fine for the fallback.
- **PlayCanvas — engine is MIT, but the productive workflow (the hosted cloud editor) is a paid
  commercial product.** You *can* use the engine standalone via npm, but you'd be giving up the
  thing that makes PlayCanvas attractive while keeping a weaker React story than R3F. Net: no
  licensing landmine, but poor cost/benefit for L3ARN.

---

## Primary Recommendation

**Adopt R3F v9 + drei v10 on three.js, render on WebGLRenderer (WebGL2) as the guaranteed
baseline, and design the renderer boundary so `WebGPURenderer` (`three/webgpu` + TSL) can be
opted-in per device.** Concretely:

1. **Standardize on the pmndrs stack already in the repo** — it is the industry-standard React
   3D binding, it is MIT, and it is the lowest-risk path because it's an *upgrade* of code that
   already exists in `apps/web`, not a new engine.
2. **Do the React 19 / Next 15 upgrade and the R3F v8→v9 + drei v9→v10 + postprocessing v2→v3
   migration as one gated change.** This is the top prerequisite and the top risk; it is
   mechanical but wide. Until it's done, the 3D world is pinned to React 18 / Next 14 (which is a
   perfectly fine place to *prototype* the world, but not to ship the App Router upgrade).
3. **WebGL2 is the floor; WebGPU is an enhancement.** School Chromebooks and old iPads must get a
   correct, performant WebGL2 render. Probe `navigator.gpu`, attempt WebGPU init, and only then
   pass `WebGPURenderer` as R3F's `gl`; otherwise use the default WebGL2 renderer. One scene
   graph, two renderers.
4. **Get the "premium stylized" look from post + baking, not raw GPU horsepower:** HDRI/IBL
   (`<Environment>`), ACES or AgX tone mapping, selective `Bloom`, `N8AO` (dial down/off on the
   weakest tier), `ContactShadows`/`AccumulativeShadows` + baked lightmaps, CSM only where the
   device budget allows. Author the world with aggressive LOD, GPU instancing, and draw-call
   discipline from day one — that discipline is what actually holds 30 fps on a Chromebook.

**Why not the alternatives, briefly:** Babylon's batteries-included power (physics, GUI, inspector,
node materials, mature WebGPU compute) is genuinely attractive, but its ~1.4 MB baseline and
weaker React integration are the wrong trade for an in-repo React app whose floor is weak GPUs.
PlayCanvas's real value is its commercial editor, which cuts against a code-first React monorepo.
Raw three.js discards the React state/lifecycle integration the rest of `apps/web` relies on.
Going **WebGPU-native as the baseline** is premature: the WebGPU post-processing/CSM ecosystems
are still porting, and the audience's floor devices can't be assumed to have WebGPU.

## Fallback

**Babylon.js 8.x** if a future phase makes engine breadth (built-in deterministic physics, a
scene inspector for content teams, node material editor for non-shader-authors, first-class WebGPU
compute) more valuable than React ergonomics and bundle weight. It is Apache-2.0, has the most
mature WebGPU backend of the candidates, and mirrors its WebGL API in WebGPU. Migration cost from
the primary stack is high (different scene graph, different React binding), so this is a
deliberate re-platform decision, not a drop-in — record it as an ADR if seriously considered.

---

## Top concrete recommendations for L3ARN

1. **Pin the target stack:** `next@15`, `react@19` / `react-dom@19`, `@react-three/fiber@^9`,
   `@react-three/drei@^10`, `@react-three/postprocessing@^3`, `three@^0.180+`, `@types/three`
   matched to `three`. Keep `zustand` (R3F depends on it internally).
2. **Treat the React 19 + R3F v9 migration as a blocking, atomic prerequisite** with its own CI
   gate. Follow the [R3F v9 migration guide](https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide);
   expect mechanical breaks (`CanvasProps`, `ThreeElements['mesh']`, three-namespace JSX mapping).
   Do NOT bump React 19 without bumping R3F to v9 in the same PR.
3. **Build a `<WorldCanvas>` client component + `ssr:false` dynamic wrapper** as the single mount
   point; never render the Canvas from a Server Component directly. Gate all GPU acquisition behind
   an effect to avoid hydration mismatch.
4. **Implement a renderer capability probe**: default WebGL2; opt into `three/webgpu`
   `WebGPURenderer` (passed as R3F `gl`) only after a successful `navigator.gpu` init. Ship the
   world on WebGL2 first; add the WebGPU branch as a non-blocking enhancement.
5. **Define an explicit device-tier system (e.g. `low` / `mid` / `high`)** driven by a startup
   benchmark + `navigator.gpu`/`gl.getParameter` capability check. Tier controls: post-processing
   (bloom/N8AO on/off), shadow strategy (baked+contact for `low`, CSM for `high`), texture
   resolution, LOD bias, and target frame rate. The Chromebook floor is `low` and must be tested
   as a first-class target, not an afterthought.
6. **Adopt baked lighting as the default:** author lightmaps/irradiance in Blender, load as
   textures, add HDRI IBL via drei `<Environment>`; reserve realtime dynamic GI for never. This is
   how you get the stylized-premium look at Chromebook cost.
7. **Standardize the post-processing recipe now** (WebGL2): `EffectComposer` (R3F) with
   `ToneMapping` (ACES Filmic or AgX), selective `Bloom`, optional `N8AO`, `SMAA`. Keep it a
   single merged pass; make every effect tier-toggleable.
8. **Do NOT build the post-processing pipeline against WebGPU's TSL `PostProcessing`/RenderPipeline
   yet** — `EffectComposer` does not run on WebGPU and the node-effect ecosystem is still porting.
   Revisit when the TSL effect library reaches parity.
9. **Enforce a frame-budget culture from commit #1:** GPU instancing for repeated world props,
   hard LOD, frustum + occlusion culling, draw-call caps per scene, texture atlasing. On weak
   integrated GPUs the bottleneck is draw calls and overdraw, not shader complexity.
10. **Record this as an ADR** ("3D renderer = R3F v9 / three.js WebGL2-first, WebGPU opt-in;
    Babylon fallback; PlayCanvas + raw-three ruled out") so the engine question doesn't silently
    reopen mid-build.

---

## Sources

- R3F v9 migration guide — https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide
- R3F React 19 / reconciler compatibility — https://github.com/pmndrs/react-three-fiber/issues/3222
- R3F releases (v9.x line) — https://github.com/pmndrs/react-three-fiber/releases
- R3F installation (v9 pairs with React 19) — https://r3f.docs.pmnd.rs/getting-started/installation
- drei React 19 compatibility #2260 — https://github.com/pmndrs/drei/issues/2260
- drei R3F-v9 peer dependency #2253 — https://github.com/pmndrs/drei/issues/2253
- @react-three/drei on npm (v10.x) — https://www.npmjs.com/package/@react-three/drei
- react-postprocessing — https://github.com/pmndrs/react-postprocessing
- three.js releases (r185 latest; monthly cadence) — https://github.com/mrdoob/three.js/releases
- three.js 2026 — production WebGPU since r171, new post stack — https://www.utsubo.com/blog/threejs-2026-what-changed
- three.js → WebGPU migration checklist — https://www.utsubo.com/blog/webgpu-threejs-migration-guide
- Field guide to TSL and WebGPU (Maxime Heckel) — https://blog.maximeheckel.com/posts/field-guide-to-tsl-and-webgpu/
- three.js AgX tone mapping #27362 — https://github.com/mrdoob/three.js/issues/27362
- three-csm (cascaded shadow maps) — https://github.com/StrandedKitty/three-csm
- three.js CSM docs (WebGL-only) — https://threejs.org/docs/pages/CSM.html
- CSM on WebGPU (CSMShadowNode) — https://discourse.threejs.org/t/cascaded-shadow-maps-csm-on-webgpu/84235
- three.js vs Babylon.js vs PlayCanvas (2026) — https://www.utsubo.com/blog/threejs-vs-babylonjs-vs-playcanvas-comparison
- Three.js vs Babylon.js (LogRocket) — https://blog.logrocket.com/three-js-vs-babylon-js/
- PlayCanvas engine (MIT; editor commercial) — https://playcanvas.com/products/engine
- PlayCanvas engine GitHub — https://github.com/playcanvas/engine
- WebGPU supported in major browsers (web.dev) — https://web.dev/blog/webgpu-supported-major-browsers
- caniuse: WebGPU — https://caniuse.com/webgpu
- WebGPU hits critical mass (all major browsers) — https://www.webgpu.com/news/webgpu-hits-critical-mass-all-major-browsers/
- The ssr:false trap in Next.js App Router — https://medium.com/@joshisagarm3/the-ssr-false-trap-in-next-js-app-router-and-how-i-escaped-it-74816bc7a778
- three.js + Next.js integration guide (2026) — https://threejsresources.com/frameworks/three-js-nextjs

---

*Verification note: three.js publishes on a near-monthly cadence; the current tag at time of
writing is ~r185 and the repo baseline is r167. Where a fast-fetch tool returned inconsistent
release **dates**, only the **version numbers** and feature-landing releases (notably WebGPU
production-ready at r171, Sep 2025) were treated as authoritative, cross-checked against the
release page and multiple 2025–2026 secondary sources cited above.*
