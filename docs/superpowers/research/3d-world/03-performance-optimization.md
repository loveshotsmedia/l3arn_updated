# 03 — Performance & Optimization for Low-End Devices

**Scope:** How L3ARN's browser-based "Academy" 3D world hits an Age-of-Empires-IV / painterly-realistic visual bar **while running smoothly on the hardware kids actually use** — school Chromebooks, iPads/tablets, and low-end laptops, frequently over home wifi.

**Audience:** Senior graphics engineer. This is opinionated. Where I state a budget as a hard number, treat it as a ship gate, not a suggestion.

**Verification date:** 2026-06-30. All claims cross-checked against 2025–2026 sources (linked inline and in Sources).

---

## 0. The governing reality: what "low-end" means in 2026

Three device facts dominate every decision below:

1. **The GPU is weak, but the CPU/main-thread is the real killer.** On a Chromebook or iPad the JS main thread does frustum culling, matrix updates, draw-call submission, and physics. Draw calls are a **CPU** cost. This is why "reduce draw calls" is the single highest-leverage lever — above 500 draw calls "even powerful GPUs struggle," and the target for low-end is **under 100 per frame** ([utsubo 100 tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips)).

2. **VRAM/RAM is tiny and shared, and running out = a crash, not a slowdown.** iOS Safari tabs crash and force-reload when memory climbs from ~256 MB toward 300–500 MB; WebKit does not reliably release texture memory; backgrounding Safari on iOS 16.7/17 fires `WebGL: context lost` ([WebKit #262628](https://bugs.webkit.org/show_bug.cgi?id=262628), [WebKit #261331](https://bugs.webkit.org/show_bug.cgi?id=261331)). A single **uncompressed 4K texture costs 64 MB+ of VRAM**; a 200 KB PNG can occupy **20 MB+ once decoded** ([utsubo](https://www.utsubo.com/blog/threejs-best-practices-100-tips)). Texture memory, not triangles, is what OOM-kills your app on a kid's tablet.

3. **Network is home wifi and the audience is impatient children.** Initial time-to-interactive is a retention cliff. Sketchfab's 2025 data: switching to glTF raised mobile viewer retention **+30%** purely from faster load ([MoldStud/Sketchfab](https://moldstud.com/articles/p-creating-lightweight-3d-assets-the-case-for-gltf-in-threejs)). Progressive loading cut a 56 MB asset to a **300 KB initial download** with ≤8 MB streamed after ([Needle gltf-progressive](https://engine.needle.tools/docs/gltf-progressive/)).

**Design consequence:** Build a *fixed frame budget + streaming-first + tiered* renderer. Never ship a single monolithic scene and hope the GPU copes. The world must be assembled from instanced, LOD'd, compressed, streamed chunks, and the renderer must self-govern quality at runtime.

---

## 1. Concrete performance budgets

These are **per-frame, per-device-tier ship gates.** "Triangles on screen" = rendered after culling, not total scene. All numbers synthesized from the cross-checked 2025–2026 sources cited below the table.

| Budget dimension | LOW tier (Chromebook / old iPad / integrated GPU) | MED tier (mainstream laptop / recent iPad / M1) | HIGH tier (discrete GPU / desktop) |
|---|---|---|---|
| **Target FPS** | **30 fps** locked (accept, don't fight) | 60 fps | 60 fps (120 where refresh allows) |
| **Frame budget** | 33.3 ms | 16.6 ms | 16.6 ms |
| **Draw calls / frame** | **< 100** (hard cap), ideal 50–80 | < 300 | < 1000 |
| **Triangles on screen** | **≤ 500 K** | ≤ 1.5 M | ≤ 3–5 M |
| **Active real-time lights** | **1** (sun) + baked everything | ≤ 3 | ≤ 5 |
| **Shadow-casting lights** | 1, CSM 1–2 cascades @ 1024 | 1, CSM 2–3 @ 1024–2048 | 1–2, CSM 3–4 @ 2048 |
| **GPU texture memory** | **≤ 128 MB** (leave headroom under the ~256 MB crash line) | ≤ 512 MB | ≤ 1–2 GB |
| **Largest single texture** | 1024² (KTX2/ASTC) | 2048² | 2048–4096² |
| **Total RAM ceiling (self-imposed)** | stay **< ~200 MB** total tab | < 512 MB | < 1 GB |
| **Initial download (blocking, to first interaction)** | **≤ 2–3 MB** | ≤ 5 MB | ≤ 8 MB |
| **Streamed budget (post-first-paint, per area)** | ≤ 8 MB / chunk | ≤ 15 MB / chunk | ≤ 30 MB / chunk |
| **Pixel ratio (DPR) cap** | **1.0** | 1.5 | 2.0 |
| **Post-processing** | OFF (or 1 cheap pass) | AO + tonemap | full stack, conditional |

**Sources for these numbers:** draw-call caps and VRAM figures from [utsubo 100 tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips) (<100 calls, 500-call ceiling, 64 MB/4K, 20 MB/PNG, ≤3 lights, 512–1024 shadow maps) and [R3F scaling](https://r3f.docs.pmnd.rs/advanced/scaling-performance) (keep draw calls below 1000, few hundred ideal). The ~40 K-triangle "stable with physics+post" and 2.1 MB / 27-mesh / 184-texture demo footprint come from [Codrops 2025](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/); note that number was a *single hero object* scene — a full world tier budget scales up but keeps the same per-frame draw-call and VRAM discipline. DPR caps (1.0 desktop / 1.5 mobile, drop 20% under load) also from Codrops. 30 fps floor for low-end from [three.js forum / WEBGL_debug_renderer_info tiering](https://discourse.threejs.org/t/is-there-a-way-to-adjust-quality-dynamically-based-on-performance/23328). Memory crash lines from [WebKit bug tracker](https://bugs.webkit.org/show_bug.cgi?id=262628).

> **Opinionated stance:** On LOW tier, **do not chase 60 fps.** Lock to 30, spend the saved budget on *looking good* (more baked GI, richer albedo, more instanced dressing). A steady, pretty 30 reads as "polished" to a kid; a stuttering 45→22 reads as "broken."

---

## 2. Draw-call reduction — the #1 lever

Draw calls are CPU-bound and the first thing that dies on Chromebooks. Attack in this order:

### 2.1 Instancing (`InstancedMesh`)
Same geometry, same material, thousands of transforms → **one draw call.** A real-estate demo went from **9,000 → 300 draw calls** by instancing chairs; instancing routinely removes **90%+** of calls ([utsubo](https://www.utsubo.com/blog/threejs-best-practices-100-tips), [Wael Yasmina](https://waelyasmina.net/articles/batchedmesh-for-high-performance-rendering-in-three-js/)). For the Academy: trees, grass tufts, fence posts, rocks, crates, torches, crowd/NPC filler, floor tiles — **everything repeated is instanced.**

### 2.2 Batching (`BatchedMesh`, three r156+)
Different geometries that **share a material** → still one draw call, and (unlike InstancedMesh) each instance can have its own geometry, plus **per-instance frustum culling and sorting are built in** ([BatchedMesh docs](https://threejs.org/docs/pages/BatchedMesh.html)). Use for a set of *distinct* props (5 barrel variants, 8 building kit-pieces) sharing one atlas material. This is the right tool for a modular building kit.

### 2.3 Static geometry merging
Truly static, never-moving geometry (terrain patches, static architecture) → `BufferGeometryUtils.mergeGeometries()` into few large meshes. Trade-off: you lose per-object culling (see §4), so merge **per spatial chunk**, not globally.

### 2.4 Material/texture atlasing
Draw calls also break on material switches. Atlas textures so a whole kit shares one material. Fewer materials = more instancing/batching headroom.

> **Caveat that matters for low-end (verify per device):** naive instancing is *not* always a win on weak GPUs. On a Quest 2, ~2,600 instances ran **85 fps naive vs 55 fps instanced** — until they used **one InstancedMesh per LOD level + frustum culling**, which nearly doubled the rate ([VR Me Up](https://vrmeup.com/devlog/devlog_10_threejs_instancedmesh_performance_optimizations.html)). Lesson: **instancing + LOD + culling together**, never instancing alone. Always measure with `renderer.info.render.calls`.

---

## 3. Level of Detail (LOD) & impostors

### 3.1 Mesh LOD
Use `THREE.LOD` / drei `<Detailed />` with distance (or better, **screen-density**) thresholds. Generate LOD chain with **meshoptimizer simplification**, each level ≈ half the triangles of the prior ([Needle](https://engine.needle.tools/docs/gltf-progressive/)). LOD alone buys **30–40% frame-rate improvement** ([utsubo](https://www.utsubo.com/blog/threejs-best-practices-100-tips)). Prefer **screen-space density over raw distance** so quality is consistent regardless of object size ([Needle gltf-progressive](https://engine.needle.tools/docs/gltf-progressive/)).

### 3.2 Impostors / billboards for the far field
Beyond a distance threshold, replace meshes with **octahedral impostors** — a pre-baked atlas of views projected onto an octahedron, giving smooth view transitions from a single quad (the Fortnite technique). A 2025 three.js library renders a **3072×3072 terrain with 200K trees** using `InstancedMesh2` + BVH frustum culling + meshopt LODs (distance 15–100) + octahedral impostors beyond that ([three.js forum: forest of octahedral impostors](https://discourse.threejs.org/t/a-forest-of-octahedral-impostors/85735), [octahedral impostor demo](https://octahedral-impostor.vercel.app/)). **This is the exact pattern for the Academy's forests/backdrops** — instanced near, impostor far.

**Academy LOD policy:**
- 0–15 m: full mesh (LOD0)
- 15–60 m: simplified mesh (LOD1/LOD2, meshopt)
- 60 m+: octahedral impostor / billboard, instanced
- Vegetation & distant crowd: impostor-first even at mid range on LOW tier.

---

## 4. Culling

three.js does **object-level frustum culling by default** — but a large mesh partially in view **renders fully**, and it does **no occlusion culling** ([Simplified Media](https://simplified.media/guides/webgl-threejs), [three.js forum](https://discourse.threejs.org/t/in-three-js-have-occlusion-culling/15076)). So:

- **Frustum (free, on by default):** keep it. Chunk large meshes so partial-view chunks cull. `InstancedMesh2`/`BatchedMesh` add **per-instance** frustum culling via BVH — essential for the 200K-tree case above.
- **Distance culling:** hard-cull anything past the LOD/impostor far plane; pair with fog so pop-in hides in atmosphere.
- **Occlusion culling (opt-in, higher tiers):** WebGL2 hardware occlusion queries or a GPU frustum+occlusion pass ([CodyJasonBennett/gpu-culling](https://github.com/CodyJasonBennett/gpu-culling), [WebGL2 occlusion example](https://tsherif.github.io/webgl2examples/occlusion.html)). Aggressive culling reports **up to 70% lower memory** (skipped allocations) and **~40% fewer vertex-shader invocations** on dense outdoor scenes ([Simplified Media](https://simplified.media/guides/webgl-threejs)). On LOW tier the query round-trip can cost more than it saves — **spatial partitioning + portals/rooms (design-time culling) beats runtime occlusion queries** for indoor Academy spaces.

> **Opinionated stance:** For the Academy, get 90% of culling wins from **scene design** — chunked terrain, room/portal separation, and aggressive far-plane + fog — before reaching for GPU occlusion queries.

---

## 5. Texture compression & memory (the crash-avoidance chapter)

**Ship every texture as KTX2 / Basis Universal. This is non-negotiable for low-end.**

- KTX2 transcodes to a **GPU-native** format (BC on desktop, **ASTC/ETC2 on mobile**) and **stays compressed in VRAM**, cutting texture memory **4×–8×** (utsubo cites ~10× vs PNG/JPEG) with faster GPU upload ([don mccurdy](https://www.donmccurdy.com/2024/02/11/web-texture-formats/), [utsubo](https://www.utsubo.com/blog/threejs-best-practices-100-tips)).
- **ETC1S** for most color textures (smallest); **UASTC** (≈BC7 quality) for the few that need it — hero albedo, normal maps ([View3D](https://naver.github.io/egjs-view3d/docs/tutorials/Compression/Basisu), [three.js Basis](https://threejs.org/examples/jsm/libs/basis/)).
- Load via **`KTX2Loader`** — set transcoder path and call `detectSupport(renderer)` before loading ([KTX2Loader docs](https://threejs.org/docs/pages/KTX2Loader.html)).
- **Mipmapping on** for everything sampled at distance (kills shimmer + improves cache/bandwidth). Powers-of-two dimensions (128/256/512/1024) for clean mip chains ([Codrops](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/)).
- **Memory budgeting:** stay under ~128 MB texture VRAM on LOW. Because iOS crashes near 256–300 MB, treat 128 MB as the working set and **dispose aggressively** — call `.dispose()` on off-screen textures/geometries/materials and watch `renderer.info.memory`; if counts only grow, you have a leak ([utsubo](https://www.utsubo.com/blog/threejs-best-practices-100-tips)).
- **Context-loss resilience (mandatory):** register `webglcontextlost`/`webglcontextrestored` handlers, `preventDefault()` on loss, and rebuild GPU resources on restore. This *will* fire on iOS Safari backgrounding ([WebKit #262628](https://bugs.webkit.org/show_bug.cgi?id=262628)); an unhandled loss = a blank/broken Academy for a kid who just tabbed away.

---

## 6. Geometry compression (download, not runtime)

Both cut wire size ~90%+; they trade download for CPU decode time and a worker library fetch.

| | **Draco** | **meshopt (MESHOPT_compression)** |
|---|---|---|
| Size reduction | **90–95%** | comparable, esp. with gzip |
| Decode speed | Slower CPU decode | **Faster decode**, designed for high decode speed |
| Morph targets / animation | **Discards** them | **Preserves** blend shapes + animation |
| Worker/library cost | Draco decoder in worker | Lighter client |

Sources: [utsubo](https://www.utsubo.com/blog/threejs-best-practices-100-tips), [Draco docs](https://threejs.org/examples/jsm/libs/draco/), [MESHOPT PR](https://github.com/KhronosGroup/glTF/pull/1702).

> **Opinionated stance for L3ARN:** default to **meshopt** — faster decode is exactly what a Chromebook CPU wants, and animated companions/NPCs need morph/skeletal data that Draco drops. Use Draco only for large *static* environment meshes where max ratio matters and decode is amortized during streaming. Run everything through the **`gltf-transform` CLI** (dedup, weld, meshopt, KTX2, resize) as a build step. Codrops hit **90% reduction / 2.1 MB total** via the gltfjsx `-S -T -t` pipeline ([Codrops](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/)).

---

## 7. Lighting & shadow cost control

Real-time lighting is the second-biggest GPU cost after overdraw. **Bake everything static.**

- **Baked lightmaps + AO** are essentially **free at render time** — pre-render GI/shadows into textures for all static architecture and terrain ([danthree](https://www.danthree.studio/en/glossary/lightmap)). Tools: Blender bake, or [`@react-three/lightmap`](https://unframework.com/portfolio/simple-global-illumination-lightmap-baker-for-threejs/) for an in-engine baker. This is how you get "painterly-realistic" GI on a Chromebook that cannot afford real-time GI.
- **Real-time lights: ≤3, and 1 on LOW** (the sun/key). Each `PointLight` shadow = **6 shadow-map renders** — avoid point-light shadows entirely on LOW ([utsubo](https://www.utsubo.com/blog/threejs-best-practices-100-tips)).
- **Shadows via CSM** (Cascaded Shadow Maps): high-res near, low-res far. `cascades: 2` mobile / `4` desktop; shadow map **512–1024 on mobile** — map size costs memory **quadratically** ([three-csm](https://github.com/StrandedKitty/three-csm), [utsubo](https://www.utsubo.com/blog/threejs-best-practices-100-tips)).
- **Environment maps / `Lightformer`** for pretty specular without dynamic light cost ([Codrops](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/)).
- **Dynamic shadows only on the hero characters** (companion, player), never on the whole scene, on LOW/MED.

---

## 8. Adaptive quality — the runtime governor

The renderer must **measure and self-tune** every second. This is what lets one build serve a Chromebook and an M-series iPad.

- **DPR ladder (primary lever):** start ~1.5, drop to 1 under load, rise to 2 with headroom; adjust in ~10–20% steps. Concretely: if FPS < 95% of target, `dpr *= 0.9`; if above target, `dpr *= 1.1` ([sbcode adaptive DPR](https://sbcode.net/tsl/adaptive-dpr/), [three.js forum](https://discourse.threejs.org/t/changing-pixelratio-based-on-fps-good-or-bad-idea/34563), [Codrops](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/)).
- **PerformanceMonitor pattern (drei):** averages FPS, fires `onIncline`/`onDecline` with a 0–1 `factor`; e.g. `setDpr(round(0.5 + 1.5 * factor, 1))`. Define **separate upper/lower bounds** to stop ping-pong ([R3F scaling](https://r3f.docs.pmnd.rs/advanced/scaling-performance)).
- **Movement regression:** call `regress()` during camera moves/interaction to temporarily cut quality (perf factor `min 0.1 → max 1`), debounce ~200 ms back to full ([R3F scaling](https://r3f.docs.pmnd.rs/advanced/scaling-performance)). Kids fling the camera; regression hides the cost.
- **On-demand rendering where possible:** `frameloop="demand"` + `invalidate()` for menus/config screens (companion chamber, learning map) — huge battery/thermal win on tablets. The live 3D world stays continuous, but non-world UI should not burn frames. Suspend on `visibilitychange` / `frameloop="never"` when tabbed away ([R3F scaling](https://r3f.docs.pmnd.rs/advanced/scaling-performance), [Codrops](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/)).
- **Tier detection at boot:** read `WEBGL_debug_renderer_info` (GPU string) to pick an **initial** tier, then let the FPS governor correct it. Target ≥30 fps on the detected low tier ([three.js forum](https://discourse.threejs.org/t/is-there-a-way-to-adjust-quality-dynamically-based-on-performance/23328)).
- **Cheap renderer defaults on LOW:** `antialias:false` (use FXAA/post if needed), `alpha:false`, `stencil:false`, `depth:false` where safe, `powerPreference:"high-performance"`, `timeStep={1/30}` physics ([Codrops](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/)).

---

## 9. Asset streaming, lazy & progressive loading

**Never block the child on a big download.** Ship a tiny playable core, stream the rest.

- **Progressive glTF:** tiny initial file with embedded **low-quality LOD proxies** (lowest LOD embedded for *instant* display), higher LODs streamed on demand by **screen density**. Demonstrated: **56 MB → 300 KB initial + ≤8 MB streamed**, up to 6 LOD levels ([Needle gltf-progressive](https://engine.needle.tools/docs/gltf-progressive/), [npm](https://www.npmjs.com/package/@needle-tools/gltf-progressive)).
- **World streaming:** chunk/spatial-partition the Academy; distance-based streaming + trigger volumes load neighbors, unload distant chunks (frees VRAM — see §5). Async loading off the main thread ([Medium: level streaming](https://medium.com/@business.sebastian1524/level-streaming-in-open-world-games-revolutionizing-immersive-experiences-0afdd8ffed88)).
- **Nested Suspense** for perceived speed: spinner → low-LOD → high-LOD as it arrives ([R3F scaling](https://r3f.docs.pmnd.rs/advanced/scaling-performance)).
- **Initial-load gate:** ≤2–3 MB blocking on LOW (see budget table). Everything past first-interaction is streamed. glTF over legacy formats gave **+30% mobile retention** ([MoldStud/Sketchfab](https://moldstud.com/articles/p-creating-lightweight-3d-assets-the-case-for-gltf-in-threejs)).

---

## 10. WebGL2 vs WebGPU in 2026, and the Chromebook/tablet reality

**Status (Jan 2026):** WebGPU is **Baseline** — Chrome/Edge v113+ (incl. **ChromeOS** since Chrome 118, so most current Chromebooks), Firefox 141+/145+, **Safari 26+ (iOS/iPadOS 26, macOS Tahoe)**. Coverage ≈ **95% of users have a WebGPU-capable browser; the other ~5% fall back to WebGL2** ([utsubo migration](https://www.utsubo.com/blog/webgpu-threejs-migration-guide), [vr.org](https://vr.org/articles/webgpu-baseline-2026-three-js-webxr-default), [byteiota](https://byteiota.com/webgpu-2026-70-browser-support-15x-performance-gains/)).

**Chromebook/tablet caveats (do not skip):**
- **ChromeOS** has WebGPU, but **older/cheaper school Chromebooks** may be stuck on ChromeOS builds without it, or on GPUs where the WebGL2 path is faster/more stable. **Assume WebGL2 fallback must be first-class, not an afterthought.**
- **Android WebGPU** arrived Chrome 121 but was initially limited to **Adreno 600-series+ / newer Mali** — budget Android tablets may not qualify and fall back ([digitalstrategyforce](https://digitalstrategyforce.com/journal/what-does-chrome-webgpu-support-mean-for-browser-3d/)).
- **iPads** only got WebGPU with **iPadOS 26** — anything older is WebGL2.

**three.js migration (nearly free):** `import * as THREE from 'three/webgpu'`, instantiate `WebGPURenderer`, **`await renderer.init()`** (async — differs from WebGL), and it **auto-falls back to WebGL2** with no manual feature detection ([utsubo migration](https://www.utsubo.com/blog/webgpu-threejs-migration-guide), [utsubo 2026 changes](https://www.utsubo.com/blog/threejs-2026-what-changed)). **TSL (Three.js Shading Language)** compiles one node graph to **both WGSL and GLSL** — write shaders once, run on both backends.

**Where WebGPU actually helps low-end:** lower **CPU draw-call overhead** (its binding model) — directly relevant to the Chromebook main-thread bottleneck — and **compute** (particles ~50K→1M+, physics bodies ~1K→100K+). For L3ARN, the draw-call-overhead reduction is the meaningful win; the million-particle headroom is a HIGH-tier flourish.

> **Opinionated stance:** Build on **`three/webgpu` with automatic WebGL2 fallback from day one**, author shaders in **TSL**. But **tune, budget, and QA against the WebGL2 path on a real low-end Chromebook and an older iPad** — that fallback is what a large slice of the actual school audience will run. WebGPU is the ceiling; WebGL2 is the floor you must not fall through.

---

## 11. Instrumentation (ship this in dev builds)

- `renderer.info.render.calls` / `.triangles` — draw-call & triangle gate check.
- `renderer.info.memory` (geometries, textures) — leak detector; must plateau.
- `stats.js` (vanilla) / `r3f-perf` (R3F) — live FPS/ms/mem HUD.
- `spector.js` — capture and inspect **individual draw calls** to find batching misses.
- CI budget assertion: fail the build if a scene exceeds tier draw-call/triangle/VRAM caps on a headless run.

Sources: [utsubo](https://www.utsubo.com/blog/threejs-best-practices-100-tips), [Codrops](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/).

---

## 12. Device-tier strategy (summary matrix)

| Feature | **LOW** (Chromebook / old iPad / Intel iGPU) | **MED** (mainstream laptop / recent iPad / M1) | **HIGH** (discrete GPU / desktop) |
|---|---|---|---|
| Target | 30 fps, DPR 1.0 | 60 fps, DPR 1.5 | 60 fps, DPR 2.0 |
| Renderer | WebGL2 (or WebGPU if present) | WebGPU, WebGL2 fallback | WebGPU |
| Antialias | off (optional FXAA) | MSAA/FXAA | MSAA + TAA |
| Real-time lights | 1 (sun), all else baked | ≤3 | ≤5 |
| Shadows | CSM 1–2 @ 1024, hero-only | CSM 2–3 @ 1024–2048 | CSM 3–4 @ 2048 |
| LOD / impostors | impostor-first, aggressive far-plane + fog | mesh LOD near, impostor far | full LOD, impostor far only |
| Instancing/Batching | mandatory everywhere | mandatory | mandatory |
| Occlusion culling | design-time (portals/chunks) only | design-time + optional GPU query | GPU occlusion query |
| Post-processing | off / 1 cheap pass | AO + tonemap | full stack (DoF, N8AO, bloom) conditional |
| Vegetation density | sparse, impostor | medium | full |
| Texture cap | 1024² KTX2, VRAM ≤128 MB | 2048², ≤512 MB | 2048–4096², ≤1–2 GB |
| Streaming | small chunks, tight radius | medium | large radius / prefetch |
| Rendering mode | continuous world, `demand` for UI | continuous | continuous |

**Tier assignment:** boot-detect via `WEBGL_debug_renderer_info` → assign initial tier → **FPS governor (§8) migrates the device up/down at runtime.** Always give users a manual quality override (kids' devices vary wildly and thermal-throttle mid-session).

---

## Top concrete recommendations for L3ARN

- **Lock LOW tier to a smooth 30 fps and spend the surplus on looks (baked GI, instanced dressing), not on chasing 60.** A steady pretty 30 reads as polished to a child; a stuttering 45 reads as broken.
- **Draw calls < 100/frame on LOW is the master gate.** Instance every repeated object (`InstancedMesh`), batch shared-material variety (`BatchedMesh`), atlas materials, and merge static geometry per chunk. Verify with `renderer.info.render.calls` in CI.
- **Ship 100% of textures as KTX2/Basis (ETC1S default, UASTC for hero/normals), mipmapped, POT.** Keep VRAM ≤128 MB on LOW — this is crash-avoidance, not just perf; iOS OOM-kills near 256–300 MB.
- **Handle `webglcontextlost`/`restored` from day one and dispose off-screen GPU resources aggressively.** iOS Safari *will* drop context on backgrounding; an unhandled loss is a broken Academy.
- **Bake all static lighting/AO into lightmaps; 1 real-time light on LOW (the sun), CSM 2 cascades @ 1024, dynamic shadows on hero characters only.** No point-light shadows on LOW (6 renders each).
- **LOD everything with meshoptimizer chains + octahedral impostors for the far field**, driven by screen density; combine with aggressive far-plane culling + fog to hide pop-in. (Instancing + LOD + culling *together* — instancing alone can regress on weak GPUs.)
- **Progressive/streaming glTF: ≤2–3 MB blocking initial download on LOW, lowest-LOD embedded for instant display, stream the rest by chunk.** Compress with meshopt (Draco only for big static meshes); run everything through `gltf-transform`.
- **Build a runtime quality governor now:** boot-tier from `WEBGL_debug_renderer_info`, then FPS-drive DPR (1.0/1.5/2.0 caps, ±10% steps), `regress()` on camera movement, `frameloop="demand"` for non-world UI, suspend on tab-hide. Expose a manual quality slider.
- **Adopt `three/webgpu` + TSL with automatic WebGL2 fallback — but budget, tune, and QA on the WebGL2 path using a real cheap Chromebook and a pre-iPadOS-26 iPad.** WebGPU is the ceiling; the WebGL2 fallback is the floor a large share of the school audience actually runs, so it must never fall through.

---

## Sources

- [100 Three.js Tips That Actually Improve Performance (2026) — utsubo](https://www.utsubo.com/blog/threejs-best-practices-100-tips)
- [Building Efficient Three.js Scenes (2025) — Codrops](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/)
- [Scaling performance — React Three Fiber docs](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
- [Migrate Three.js to WebGPU (2026) — utsubo](https://www.utsubo.com/blog/webgpu-threejs-migration-guide)
- [What's New in Three.js (2026) — utsubo](https://www.utsubo.com/blog/threejs-2026-what-changed)
- [WebGPU Baseline 2026 — vr.org](https://vr.org/articles/webgpu-baseline-2026-three-js-webxr-default)
- [WebGPU 2026: 70% Browser Support — byteiota](https://byteiota.com/webgpu-2026-70-browser-support-15x-performance-gains/)
- [What Chrome WebGPU support means — Digital Strategy Force](https://digitalstrategyforce.com/journal/what-does-chrome-webgpu-support-mean-for-browser-3d/)
- [BatchedMesh — three.js docs](https://threejs.org/docs/pages/BatchedMesh.html)
- [InstancedMesh — three.js docs](https://threejs.org/docs/pages/InstancedMesh.html)
- [BatchedMesh for High-Performance Rendering — Wael Yasmina](https://waelyasmina.net/articles/batchedmesh-for-high-performance-rendering-in-three-js/)
- [InstancedMesh Performance Optimizations (Quest 2 data) — VR Me Up](https://vrmeup.com/devlog/devlog_10_threejs_instancedmesh_performance_optimizations.html)
- [A forest of octahedral impostors — three.js forum](https://discourse.threejs.org/t/a-forest-of-octahedral-impostors/85735)
- [Octahedral impostor demo](https://octahedral-impostor.vercel.app/)
- [Optimizing Foliage at Scale: Imposters — InstaLOD](https://instalod.com/2025/04/07/optimizing-foliage-at-scale-imposters-with-instalod/)
- [Choosing texture formats for WebGL/WebGPU — Don McCurdy (2024)](https://www.donmccurdy.com/2024/02/11/web-texture-formats/)
- [KTX2Loader — three.js docs](https://threejs.org/docs/pages/KTX2Loader.html)
- [Basis Universal GPU Texture Compression — three.js](https://threejs.org/examples/jsm/libs/basis/)
- [Basis Universal (KTX2) — View3D](https://naver.github.io/egjs-view3d/docs/tutorials/Compression/Basisu)
- [Draco 3D Data Compression — three.js](https://threejs.org/examples/jsm/libs/draco/)
- [MESHOPT_compression — glTF PR #1702](https://github.com/KhronosGroup/glTF/pull/1702)
- [Cascaded Shadow Maps (three-csm) — StrandedKitty](https://github.com/StrandedKitty/three-csm)
- [Lightmap explained — danthree studio](https://www.danthree.studio/en/glossary/lightmap)
- [GI lightmap baker (@react-three/lightmap) — unframework](https://unframework.com/portfolio/simple-global-illumination-lightmap-baker-for-threejs/)
- [Adaptive DPR — sbcode TSL tutorial](https://sbcode.net/tsl/adaptive-dpr/)
- [Changing pixelRatio based on fps — three.js forum](https://discourse.threejs.org/t/changing-pixelratio-based-on-fps-good-or-bad-idea/34563)
- [Adjust quality dynamically / tiering — three.js forum](https://discourse.threejs.org/t/is-there-a-way-to-adjust-quality-dynamically-based-on-performance/23328)
- [GPU frustum & occlusion culling in WebGL — CodyJasonBennett/gpu-culling](https://github.com/CodyJasonBennett/gpu-culling)
- [WebGL2 Occlusion Culling example — tsherif](https://tsherif.github.io/webgl2examples/occlusion.html)
- [WebGL & Three.js performance — Simplified Media](https://simplified.media/guides/webgl-threejs)
- [gltf-progressive docs — Needle Engine](https://engine.needle.tools/docs/gltf-progressive/)
- [@needle-tools/gltf-progressive — npm](https://www.npmjs.com/package/@needle-tools/gltf-progressive)
- [Lightweight 3D Assets with glTF (Sketchfab +30% retention) — MoldStud](https://moldstud.com/articles/p-creating-lightweight-3d-assets-the-case-for-gltf-in-threejs)
- [Level Streaming in Open-World Games — Medium](https://medium.com/@business.sebastian1524/level-streaming-in-open-world-games-revolutionizing-immersive-experiences-0afdd8ffed88)
- [WebKit #262628 — WebGL: context lost, iOS 17 Safari](https://bugs.webkit.org/show_bug.cgi?id=262628)
- [WebKit #261331 — context lost on backgrounding, iPadOS 17](https://bugs.webkit.org/show_bug.cgi?id=261331)
- [Introducing glTF 2.1 with Complex Scenes — Khronos](https://www.khronos.org/blog/introducing-gltf-2.1-with-complex-scenes)
