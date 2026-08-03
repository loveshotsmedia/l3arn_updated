# 02 — Art & Asset Production Pipeline for Photoreal/Painterly Browser 3D

**Research angle:** How to actually achieve Age-of-Empires-IV-quality visuals for the L3ARN Academy inside a Next.js / Three.js browser app, and the concrete end-to-end art-production workflow a small team can follow.

**Audience:** senior technical artist / rendering-minded engineer.

**Benchmark decoded:** The "Fable 5 demo" that produced a game-quality in-browser RTS world is the [`Braffolk/fable5-world-demo`](https://github.com/Braffolk/fable5-world-demo) (LAAS). It is worth internalising because it is the single most honest proof of what a browser can do in 2026, and it sets the bar we are targeting. Its headline numbers: a **4×4 km** open world, **190,000 procedurally-grown trees + 450,000 understory instances + ~1M grass blades**, **4-cascade shadows with PCSS + contact shadows**, **terrain-relative irradiance probes for GI**, **Hillaire LUT atmosphere + raymarched volumetric clouds**, **froxel volumetrics**, **131,072 GPU particles**, TAA, GPU auto-exposure and filmic time-of-day grading — all on **three.js `WebGPURenderer` + TSL + raw WGSL compute**, TypeScript, Vite, **zero bundled assets (everything generated at boot)**, and explicitly **no WebGL fallback**. That last point is the key strategic signal: the frontier of "game-quality in browser" now assumes WebGPU.

The critical framing for L3ARN: **AoE IV is not photoreal — it is painterly stylised-realism built for readability.** AoE IV's look derives from concept painter **Craig Mullins**' style, art-directed for *clarity at RTS zoom with hundreds of units on screen* rather than pore-level realism ([PCGamesN](https://www.pcgamesn.com/age-of-empires-4/graphics), [AoE forums](https://forums.ageofempires.com/t/those-who-have-confusion-on-artstyle-please-check-the-artist-craig-mullins/165115)). This is *excellent* news for a browser target and for a kids/teen product: readable painterly-realism is dramatically cheaper than photoreal, art-directs better with free CC0 asset libraries, ages well, and is safer/friendlier for the audience. **We should explicitly target "painterly-realistic / stylised-PBR," not photoreal.** Every recommendation below is tuned to that target.

---

## 1. PBR Materials & Texturing

### Workflow: metal/rough, not spec/gloss
Standardise on the **metallic-roughness** workflow. It is the glTF-native model, is what every web renderer and every AI-3D generator exports, and needs fewer maps than specular-glossiness ([Polyforge](https://polyforge.xyz/learn/pbr-materials-metallic-roughness-specular-glossiness), [danthree](https://www.danthree.studio/en/glossary/metalness-map)). Rules a TA already knows but must enforce on a mixed free-asset pipeline:

- **Metallic is binary in practice** — 0 (dielectric) or 1 (metal). Grey values 0.2–0.8 read as fake "semiconductor" surfaces; only use them at the transition pixels of rust/paint edges ([danthree](https://www.danthree.studio/en/glossary/metalness-map)).
- **Author/bake at ship resolution, then downscale.** Painting 4K and shipping 1K beats painting native 1K ([Texturize](https://texturize.app/blog/texture-atlases-explained)).
- **BaseColor should carry no baked lighting** (no AO multiplied in, no directional highlights) — lighting is the renderer's job. This is the #1 defect in scraped/AI assets and in Mixamo/marketplace grabs; budget cleanup time for it.

### Channel packing (mandatory for web)
Pack the three scalar maps into one RGB texture — the ORM convention: **R = ambient Occlusion, G = Roughness, B = Metallic**. glTF's `KHR_materials` and three.js read exactly this: `aoMap`/`roughnessMap`/`metalnessMap` can all point at one texture using `.r`/`.g`/`.b`. This **halves texture count and memory bandwidth** vs separate maps ([Texturize](https://texturize.app/blog/texture-atlases-explained), [jMonkey](https://hub.jmonkeyengine.org/t/pbr-texture-packing/41212)). Height, if used, goes in a 4th channel or a separate map. Standardise ORM order project-wide so shaders and the compression pipeline are uniform.

### Trim sheets + tiling base materials (the AoE-scale trick)
The environment strategy that makes large worlds cheap and coherent: **tiling base materials for large surfaces (ground, walls, roofs) + a shared trim-sheet atlas for edges, borders, planks, trims, and small unique details.** One trim texture atlas is reused across dozens of meshes → collapses draw calls and unifies the palette, which is precisely how you get a "designed, coherent" painterly world instead of a kitbash ([Texturize](https://texturize.app/blog/texture-atlases-explained)). For L3ARN's Academy buildings, author **2–3 trim sheets** (stone/timber/metal-trim) + **~6 tiling materials** and you can build the whole campus.

### Detail & macro variation
Kill obvious tiling on ground with (a) a low-frequency macro-variation multiply, (b) detail-normal at a second UV scale, (c) vertex-colour tinting. This is the same "colored masks overlaid via shader to prevent visible tiling" that Gaea recommends for terrain ([polycount](https://polycount.com/discussion/229218/gaea-world-creator-workflow)).

---

## 2. Terrain

Terrain is the load-bearing wall of an RTS-style world. Two viable tiers:

### Tier A (recommended for L3ARN v1): authored heightmap + splatmap, GPU-blended
1. **Author terrain in a dedicated tool**, not by hand. **Gaea 2** (QuadSpinner) is the strongest value pick; **World Creator** (real-time, GPU) and **World Machine** ("Hurricane Ridge" 2025 release, new erosion model) are the alternatives ([Gaea](https://quadspinner.com/), [World Creator](https://www.world-creator.com/), [World Machine](https://www.world-machine.com/)).
2. **Export three products** (all three tools do this natively): a **RAW16 heightmap**, a **splatmap** (up to 4 material weights packed into RGBA — R/G/B/A = 4 layers), and greyscale **flow/curvature masks** ([World Machine workflow](http://www.world-machine.com/learn.php?page=workflow&workflow=wfunity), [World Creator export](https://docs.world-creator.com/reference/export/conventional-export)).
3. **In-engine**, displace a grid mesh from the heightmap and write a **splat shader** that blends 4 tiling PBR materials by the splatmap weights, biased by slope and height (grass on flats, rock on cliffs, sand at waterline). Height-blend (not linear-lerp) the transitions for crisp material boundaries. The classic three.js pattern and its 8-bit-index extension to 256 materials are documented on the three.js forum ([multi-textured terrain thread](https://discourse.threejs.org/t/how-to-create-a-multiple-textured-terrain/5069)).
4. **LOD:** use geometry chunking. For a large world, a **CDLOD / geometry-clipmap quadtree with crack-free skirts** is the proven approach — this is exactly what the Fable5 demo used ("CDLOD quadtree meshing with crack-free skirts, 4+ km"). For a bounded campus you can start with a static tessellated mesh + a couple of manual LOD rings and add clipmaps later.

### Cliffs & rock (the perennial terrain weak spot)
Heightmap terrain cannot express overhangs and looks soft at cliffs. **Solution: drop separate tiling rock meshes / cliff modules onto steep slopes** and blend their base into the terrain splat. Use CC0 photoscanned rocks (Poly Haven Namaqualand scans — 30+ desert rocks/debris) or stylised rock kits (Quaternius/KayKit) and instance them ([Poly Haven](https://polyhaven.com/), [CG Channel Namaqualand](https://www.cgchannel.com/2024/10/download-poly-havens-free-namaqualand-3d-scan-library/)). This "meshes on slopes + splat blend" combo is how shipped games hide the heightmap.

### Tier B (later / hero moments): Gaussian splatting
For a fixed hero vista or a scanned real location, **3D Gaussian Splatting** now runs well in-browser via WebGPU. [mkkellogg/GaussianSplats3D](https://github.com/mkkellogg/GaussianSplats3D) is the mature three.js viewer; 2026 research engines (WebSplatter, Visionary — packaged as a three.js plug-in, claims up to 135× faster than WebGL viewers) show the trajectory ([utsubo GS guide](https://www.utsubo.com/blog/gaussian-splatting-guide), [WebSplatter](https://arxiv.org/html/2602.03207v1), [Visionary](https://arxiv.org/html/2512.08478v1)). **Verdict:** not for a walkable, gameplay-interactive campus in v1 (splats aren't cheap to collide/animate/edit), but excellent for a photoreal skybox-distance backdrop or a "portal" set-piece. Keep in the toolbox, not the critical path.

---

## 3. Vegetation

The single biggest "wow-per-dollar" system for a natural world, and the biggest performance trap. Layered strategy:

### Grass — instanced blades in the vertex shader
- **Geometry:** each blade is a tapered triangle-strip along a quadratic Bézier, ~7 verts at low LOD; scatter with `InstancedMesh` so hundreds of thousands of blades are **one draw call** ([Codrops fluffiest grass](https://tympanus.net/codrops/2025/02/04/how-to-make-the-fluffiest-grass-with-three-js/), [al-ro grass](https://al-ro.github.io/projects/grass/)).
- **Wind:** compute entirely in the vertex shader — sum of **3 layered sine frequencies + a scrolling noise texture** so motion isn't uniform ([Codrops](https://tympanus.net/codrops/2025/02/04/how-to-make-the-fluffiest-grass-with-three-js/)).
- **LOD + culling:** reduce blade vert count with distance; frustum-cull tiles; only grow grass in a radius around the camera. On WebGPU, do the scatter with a **compute pass** — see [CK42BB/procedural-grass-threejs](https://github.com/CK42BB/procedural-grass-threejs) (WebGPU compute with automatic WebGL2 fallback) and the [interactive-grass forum build](https://discourse.threejs.org/t/interactive-grass-with-multi-player-physics-and-wind-fps-friendly-and-suitable-for-games/87994).

### Trees & shrubs — instancing + octahedral impostors
This is the make-or-break system and it is now solved on the web:
- **Use [`@three.ez/instanced-mesh` (InstancedMesh2)](https://github.com/agargaro/instanced-mesh)** as the backbone. It adds **per-instance frustum culling, a dynamic BVH, sorting, per-instance visibility, and built-in LOD + shadow-LOD** on top of `InstancedMesh` — i.e. it does the hard parts of a foliage system for you ([InstancedMesh2 docs](https://agargaro.github.io/instanced-mesh/getting-started/00-introduction/)).
- **LOD chain:** full mesh (near) → meshoptimizer-decimated mesh (mid) → **octahedral impostor** (far). An octahedral impostor bakes the tree into ~8 view-faces on a few polys and reads as a real 3D tree from distance. There is a working three.js implementation and a public demo of **200k trees** using InstancedMesh2 + BVH + two LODs + octahedral impostor ([forest of octahedral impostors](https://discourse.threejs.org/t/a-forest-of-octahedral-impostors/85735), [octahedral impostors for three.js](https://discourse.threejs.org/t/octahedral-impostors-for-three-js/80318)). The Fable5 demo used the identical pattern ("cluster-card foliage, octahedral impostors, ~190k trees").
- **Placement:** don't hand-place. Use **Poisson-disk / clustered scatter** driven by the terrain splatmap (trees follow the "forest" material weight, avoid paths/water), ideally on GPU. Fable5's "GPU clustered-Poisson scatter with per-frame culled indirect draws" is the north star.

### Assets & tools for foliage
- **Stylised, CC0, game-ready (best fit for L3ARN):** **Quaternius** nature packs and **KayKit Forest/Nature** (stylised low-poly trees, rocks, grass, all CC0) ([Quaternius](https://quaternius.com/), [KayKit nature](https://github.com/KayKit-Game-Assets)).
- **Photoscanned / realistic:** Poly Haven models + Namaqualand plant scans (CC0) ([Poly Haven](https://polyhaven.com/)).
- **Procedural tree authoring (if we want unique species):** grow trees in a tree tool and export glTF for baking — the Fable5 "procedural branching grammar, 6 species" approach. For a small team, buy/download a handful of species and rely on **per-instance scale/rotation/tint variation** to hide repetition rather than authoring dozens.

---

## 4. Realistic Lighting

The lighting model is what separates "primitive Three.js scene" from "AoE-quality." Adopt a **hybrid: baked static GI + real-time key light + IBL + filmic tone mapping.**

### IBL / HDRI environment (do this first — biggest single quality jump)
- Load an **HDRI** as the scene environment; it drives ambient colour, reflections, and correct highlight temperature. Poly Haven ships **2000+ CC0 HDRIs at 16k, newer ones 20k+** ([Poly Haven HDRIs](https://polyhaven.com/hdris)). Downsample to 1–2k equirect for runtime.
- In three.js: run it through **PMREM** for pre-filtered mip-based specular; set `scene.environment` (and optionally `scene.background`). In R3F this is one line: drei `<Environment />` ([drei](https://github.com/pmndrs/drei), [three.js HDR env example](https://threejs.org/examples/webgl_materials_envmaps_hdr.html)).

### Baked lightmaps for static geometry
Bake GI into **lightmaps** for everything static (buildings, terrain hero areas). Lightmaps are essentially **free at render time** and give soft, grounded, painterly light that real-time can't afford at scale ([100-tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips), [lightmap vs baked-texture thread](https://discourse.threejs.org/t/whats-the-difference-between-a-light-map-and-a-baked-image-texture-with-lighting-information/41417)). Bake in **Blender (Cycles)** → export the lightmap → apply via `aoMap`/`lightMap` slot on a second UV channel. **Rule for the audience-facing product: no pure-black shadows** — the Fable5 demo enforces a "no-black-shadows rule by automated pixel sampling"; replicate that as a QA check. Painterly/kids look wants lifted, coloured shadow tones, never crushed black.

### Real-time layer
- **One directional key light** (the sun) with **Cascaded Shadow Maps (CSM)**, 2–4 cascades (4 for desktop, 2 for mobile). Shadow map size **1024–2048 desktop, 512–1024 mobile** ([100-tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips)).
- **Keep total real-time lights ≤ 3**, and **avoid `PointLight` shadows** — a shadowed point light is ~6× the cost of a directional ([100-tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips)). Fake local "lights" (torches, windows) with emissive materials + baked bounce, not real shadow-casters.
- **AO:** add screen-space **GTAO** for contact darkening the lightmaps miss.
- **(WebGPU tier) dynamic GI:** the Fable5 route is a **terrain-relative irradiance-probe field + screen-space bounce** — a realistic upgrade path once on WebGPU, giving moving objects correct bounce lighting without full real-time GI.

### Tone mapping & exposure (the "cheap film-grade" step)
- Set `renderer.toneMapping = ACESFilmicToneMapping` (or the newer **AgX**, which three.js now ships and which handles saturated highlights more gracefully — evaluate both) with `toneMappingExposure` tuned per time-of-day ([tone mapping overview](https://discourse.threejs.org/t/tone-mapping-overview/75204)).
- Work in **linear** throughout; only tonemap at the end. **If using post-processing, disable renderer tone mapping and apply it as the final post pass** to keep colour correct ([100-tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips)).
- **GPU auto-exposure** (histogram-based) for time-of-day scenes is a strong polish item and is in the Fable5 stack.

---

## 5. Characters / Units & Animation

### Base characters
For a kids/teen product, **stylised low-poly humanoids beat realistic** on cost, safety, and charm. Sources:
- **KayKit Adventurers / Skeletons / Character packs** — CC0, rigged **and animated**, purpose-built low-poly ([KayKit characters](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0)).
- **Quaternius** ultimate character/animal packs — CC0, rigged ([Quaternius](https://quaternius.com/)).
- **AI-generated with auto-rig** (see §7) when you need a *specific* companion design — Meshy has native auto-rigging.

### Animation
- **Mixamo** remains the fastest way to get a humanoid animation library: auto-rig any humanoid, download **60fps FBX or glTF**, animations retarget to any compatible humanoid rig ([Mixamo + three.js](https://threejsresources.com/tool/mixamo)). Import to three.js via `GLTFLoader` + `AnimationMixer`. Standardise on **one skeleton** (either the Mixamo rig or a KayKit rig) so every clip is interchangeable — mismatched skeletons are the main source of retargeting pain ([retargeting thread](https://discourse.threejs.org/t/retargeting-animation-to-mixamo-rig/6172)).
- Clean-up: Mixamo clips have **root motion baked into the hips** — strip or handle it depending on whether you move the character in-engine or via animation.

### Crowds (many units on screen — the RTS requirement)
Skinned-mesh instancing is not first-class in stock three.js, but is solved by libraries:
- **`@three.ez/instanced-mesh` supports skinning** and is the recommended path for animated crowds with per-instance culling/LOD ([InstancedMesh2](https://github.com/agargaro/instanced-mesh)).
- Technique: bake skeletal animation into a **bone/VAT (vertex-animation) texture** and sample it per instance in the vertex shader → hundreds of animated units in a handful of draw calls. For distant crowds, drop to **animated impostors**. Reserve full skinned meshes for the few hero characters near camera.

---

## 6. Delivery Pipeline (glTF + compression) — non-negotiable for web

**Everything ships as `.glb` (binary glTF).** It is *the* web-3D standard; one file carries geometry, all PBR maps, animations, and skinning ([Polyvia](https://www.polyvia3d.com/formats/glb-gltf), [three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html)). The compression stack, in order:

### Geometry: Meshopt (default) or Draco
- **Meshopt** = `KHR_mesh_quantization` + `EXT_meshopt_compression`. Comparable or better ratios than Draco with a **much faster decoder**, and — critically — **preserves morph targets and animation** that Draco discards. **Default to Meshopt** for animated/character assets ([gltf delivery pipeline](https://www.polyvia3d.com/formats/glb-gltf), [gltf-transform](https://gltf-transform.dev/)).
- **Draco** (`KHR_draco_mesh_compression`) still wins on raw ratio for **large static meshes** (60–95% vertex reduction) — use it for terrain chunks and static props where there's no animation ([Axel Cuevas](https://www.axl-devhub.me/en/blog/optimizing-3d-models), [100-tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips)).
- Either way, host the **decoder** (`draco/` or meshopt) and wire it into `GLTFLoader` (`setDRACOLoader` / `setMeshoptDecoder`).

### Textures: KTX2 / Basis Universal (this is the memory win)
The single most important web-3D texture fact: **a 200 KB PNG can occupy 20 MB+ of VRAM; KTX2/Basis stays GPU-compressed → ~4–10× less VRAM** ([100-tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips), [gltf pipeline search](https://www.polyvia3d.com/formats/glb-gltf)). Two codecs, and **choosing correctly per map type matters**:
- **UASTC** — high quality, use for **normal maps, ORM/packed maps, and hero base-colors** (high-contrast, differing RGB channels) ([Khronos KTX Artist Guide](https://github.com/KhronosGroup/3D-Formats-Guidelines/blob/main/KTXArtistGuide.md)).
- **ETC1S** — aggressive, use for **diffuse/albedo, UI, and secondary textures** (solid colours, monochromatic) ([Khronos KTX Artist Guide](https://github.com/KhronosGroup/3D-Formats-Guidelines/blob/main/KTXArtistGuide.md)).
- Delivered via `KHR_texture_basisu`; wire a **`KTX2Loader`** into `GLTFLoader`.

### The one tool that does all of it: **glTF-Transform**
[glTF-Transform](https://gltf-transform.dev/) (CLI + JS SDK by Don McCurdy) is the pipeline hub — dedupe, weld, quantize, Draco/Meshopt, KTX2/Basis, texture-resize, atlas, prune. Concrete commands (from Khronos/gltf-transform docs):
```bash
# Geometry: meshopt (default) OR draco for static
gltf-transform meshopt in.glb out.glb
gltf-transform draco   in.glb out.glb --method edgebreaker

# Textures: UASTC for normal + packed maps...
gltf-transform uastc out.glb out2.glb \
  --slots "{normalTexture,occlusionTexture,metallicRoughnessTexture}" --level 4 --zstd 18
# ...ETC1S for base color
gltf-transform etc1s out2.glb final.glb --quality 255
# or the higher-level pattern form:
gltf-transform texture-compress in.glb out.glb --pattern "*_Normal*" --uastc --normal-map
```
Notes that bite: to maximise quality **disable RDO** (`--rdo false`) — RDO trades quality for filesize ([gltf-transform discussion #1614](https://github.com/donmccurdy/glTF-Transform/discussions/1614), [KTX guide](https://github.com/KhronosGroup/3D-Formats-Guidelines/blob/main/KTXArtistGuide.md)). Alternative all-in-one: **`gltfpack`** (meshopt author's tool) does meshopt + KTX2 in one binary.

### Atlasing & instancing at export
- **Atlas** small textures together and **merge/instance** repeated geometry to hit the draw-call budget (below). glTF-Transform can dedupe materials and prune unused data automatically.

### Loading, LOD & budgets in-app (React Three Fiber)
- `useGLTF` + **`useGLTF.preload()`** to warm assets; drei **`<Environment/>`** for IBL; drei **`<Detailed/>`** for multi-resolution LOD swaps (30–40% frame gains in big scenes); **`<PerformanceMonitor/>`** to adapt quality to the device; **`three-mesh-bvh` / `MeshBVH`** for fast raycast/picking on complex geometry ([drei](https://github.com/pmndrs/drei), [R3F scaling perf](https://r3f.docs.pmnd.rs/advanced/scaling-performance), [Medium/Drei tips](https://medium.com/@ertugrulyaman99/react-three-fiber-enhancing-scene-quality-with-drei-performance-tips-976ba3fba67a)).
- **Hard budgets:** target **< 100 draw calls/frame** for stable 60fps; instance identical geometry (1000 trees → 1 call); **always dispose** geometries/materials/textures and watch `renderer.info.memory` for leaks ([100-tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips)).
- **Dev tooling:** `stats-gl` (WebGL+WebGPU FPS/GPU), `Spector.js` (frame capture), `lil-gui` (live tuning) ([100-tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips)).

---

## 7. AI 3D-Asset Generators (2026 assessment)

These have crossed from novelty to *genuinely usable* for concept/kitbash and, with cleanup, for shipped stylised assets. They are ideal for L3ARN's **bespoke companion characters and unique props** where no CC0 asset exists. Assessed on quality / topology / web-readiness / licensing:

| Tool | Strength (2026) | Topology | Rig | Web-ready export | Commercial licence | Price |
|---|---|---|---|---|---|---|
| **Meshy (v6)** | **Safest all-rounder for game assets**; text+image→3D, PBR, topology controls, **native auto-rig**, broad export ([Meshy game-assets](https://www.meshy.ai/blog/best-ai-tools-for-3d-game-assets)) | Good, controllable | **Yes (built-in)** | GLB/glTF/FBX/OBJ | **Yes on paid (Pro+)** | ~$14.50/mo Pro |
| **Tripo (v3)** | **Cleanest game topology**; auto-retopo, mesh-opt, multi-view; cheapest paid ([Tripo guide](https://lorphic.com/tripo-ai-pricing-3d-models-full-guide-and-review/)) | **Best / quad-based** | No native | GLB/glTF/FBX(paid)/OBJ | **Yes on paid** | ~$12/mo; API $0.01/credit, 2000 free |
| **Rodin / Hyper3D (Gen-2)** | **Highest photoreal fidelity**, 4K PBR, 10B-param diffusion transformer ([comparisons](https://www.3daistudio.com/3d-generator-ai-comparison-alternatives-guide/best-3d-generation-tools-2026/best-tool-for-generating-3d-models-with-ai-2026)) | Dense (needs retopo) | No native | GLB/glTF/OBJ | Yes on paid | ~$120/mo Business (pro-viz tier) |
| **Luma Genie** | **NeRF/scan from video** — real-world capture, not generative | Scan mesh | No | GLB/OBJ | Paid options | ~$1/scene |
| **TRELLIS (open)** | Top **visual fidelity**, open-source/self-hostable | Varies | No | GLB/glTF | Self-host (check weights licence) | Free (compute) |
| **CSM / Sloyd / Kaedim** | Parametric/controllable, human-in-loop cleanup | Good | Varies | GLB | Paid | Varies |

**Verdict for L3ARN:**
- **Default AI generator: Meshy** (auto-rig + practical pipeline) for **companion characters**; **Tripo** for **props/environment kit** (cleaner topology, cheaper). ([Meshy](https://www.meshy.ai/blog/best-ai-tools-for-3d-game-assets), [Tripo](https://lorphic.com/tripo-ai-pricing-3d-models-full-guide-and-review/))
- **Rodin** only when a single hero asset needs maximum fidelity and you'll retopo it.
- **Licensing caution (important):** commercial rights generally require a **paid plan** (Meshy Pro+, Tripo paid, Hyper3D paid) — **free-tier output is typically not cl-eared for commercial/shipping use.** Verify the current ToS per tool before shipping, and record the licence per asset ([3DAI Studio APIs](https://www.3daistudio.com/blog/best-3d-model-generation-apis-2026), [sloyd price comparison](https://www.sloyd.ai/blog/3d-ai-price-comparison)). For a kids' product, also keep a **provenance/consent note** on any AI-generated likeness.
- **Web-readiness reality:** all export GLB, but AI output routinely needs **retopo, UV/normal fixes, baked-lighting removal from base color, and the full glTF-Transform compression pass** before it's web-safe. Treat AI generators as **concept + base-mesh factories**, not final-asset factories.

---

## 8. Asset SOURCES — recommended library stack

**Free / CC0 (build the world from these first):**
- **Poly Haven** — 2000+ CC0 HDRIs (16k–20k+), 8k PBR textures, photoscanned models incl. Namaqualand plant/rock scans. **The default for HDRIs, tiling textures, and realistic nature.** ([polyhaven.com](https://polyhaven.com/), [license](https://polyhaven.com/license))
- **Quaternius** — thousands of CC0 stylised low-poly models, many rigged+animated (characters, animals, nature, buildings). **The default for stylised kit.** ([quaternius.com](https://quaternius.com/))
- **KayKit** — CC0 stylised low-poly rigged+animated characters + nature/dungeon kits. **The default for playable characters + modular buildings.** ([KayKit](https://github.com/KayKit-Game-Assets))
- **Kenney** — 60,000+ CC0 assets (more 2D-heavy, but useful 3D kits, audio, UI). ([kenney.itch.io](https://kenney.itch.io/kenney-game-assets))
- **`madjin/awesome-cc0`** — curated index of CC0 sources to mine. ([awesome-cc0](https://github.com/madjin/awesome-cc0))

**Paid / marketplace (fill specific gaps):**
- **Fab** (Epic's unified marketplace — absorbed Sketchfab, Quixel/Megascans, UE Marketplace, ArtStation). Offers **CC-BY and Standard** licences; ships **UE, Unity, and multiple 3D formats**. **Megascans (Quixel) is the standout** for photoscanned surfaces/props. Note: legacy Sketchfab **Editorial-licensed** models were **not eligible for Fab migration**, and Editorial = non-commercial — **only use Standard/CC licences for a shipping commercial product** ([Fab launch](https://sketchfab.com/blogs/community/epics-unified-marketplace-fab-launches-today/), [Fab licences](https://dev.epicgames.com/documentation/en-us/fab/licenses-and-pricing-in-fab), [choosing a licence](https://support.fab.com/s/article/Choosing-your-model-s-license?language=en_US)).
- **Convertibility:** Unity/Unreal-marketplace assets are usually **FBX/textures under the hood → convert to GLB** via Blender or glTF-Transform. This is legal **only if the licence permits redistribution in a web runtime** — many engine-marketplace licences are engine-scoped; **read before converting.**

**Licensing discipline (mandatory):** maintain an **asset manifest** (CSV/JSON in-repo) with per-asset: source URL, licence (CC0 / CC-BY / Standard / AI-paid), attribution string if required, and date. CC-BY requires attribution in-app/credits; CC0 does not; AI tools require the paid-plan grant. This is cheap now and unblocks a clean legal review before launch.

---

## 9. Concrete end-to-end art-production WORKFLOW (small team)

A repeatable pipeline from concept to shipped web asset:

**Phase 0 — Style lock (once).** Write a 1-page **art bible**: "painterly stylised-PBR, Craig-Mullins-adjacent, high readability, lifted coloured shadows, warm friendly palette." Lock target draw-call/tri/texture budgets. Build a **grey-box + single reference material** to prove the lighting model before any hero art.

**Phase 1 — Environment shell.**
1. Author terrain in **Gaea** → export RAW16 height + RGBA splat + masks.
2. Build the **splat terrain shader** (4 materials, slope/height bias, height-blend) in-engine.
3. Set up **IBL** (Poly Haven HDRI → PMREM/`<Environment/>`) + **ACES/AgX tone mapping** + auto-exposure. This alone should make the scene look "real." 

**Phase 2 — Kit & buildings.**
4. Author **2–3 trim sheets + ~6 tiling materials**; build Academy buildings from the trim kit (modular).
5. **Bake lightmaps** (Blender Cycles) for static buildings/hero terrain; apply on 2nd UV. Enforce **no-black-shadows** QA.

**Phase 3 — Nature.**
6. Grass: instanced vertex-shader blades with 3-freq wind, camera-radius growth.
7. Trees/shrubs: pull Quaternius/KayKit species → build **LOD chain (full → meshopt → octahedral impostor)** → scatter via **InstancedMesh2 + Poisson** driven by the splatmap.
8. Cliffs: instance CC0 rock meshes on steep slopes, blend into splat.

**Phase 4 — Characters.**
9. Standardise **one skeleton**. Pull KayKit/Quaternius rigged characters or generate companions in **Meshy** (auto-rig). Retarget a **Mixamo** clip library onto that skeleton. Bake to VAT texture for crowds; keep skinned meshes for hero units.

**Phase 5 — Compression gate (every asset, automated).**
10. Run **glTF-Transform** in CI: dedupe → weld → **Meshopt** (or Draco for static terrain) → **KTX2** (UASTC for normal/ORM, ETC1S for albedo, RDO off) → texture-resize → prune. Fail the build if any `.glb` exceeds size/texture budgets.
11. Wire **DRACOLoader/MeshoptDecoder + KTX2Loader** once in the app; `useGLTF.preload`; `<Detailed/>` LODs; `<PerformanceMonitor/>` for adaptive quality.

**Phase 6 — Polish pass.** GTAO, CSM tuning, TAA, bloom, filmic time-of-day grade, water (clipmap + SSR). Verify with `stats-gl` against budgets on a mid-tier laptop **and** a phone.

**Governance:** every asset lands with a manifest row (source + licence + attribution); baked-lighting-in-basecolor is a review reject; all merges through the compression gate. Test each system on **3 devices** (desktop, mid laptop, phone) before calling it done.

---

## 10. Strategic note on renderer target (WebGPU vs WebGL2)

The 2026 frontier assumes **WebGPU**: the Fable5 benchmark is WebGPU-only by design, and WebGPU now ships in all major browsers (**Safari 26, Sept 2025**) ([100-tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips)). WebGPU unlocks the compute-driven scatter, VAT crowds, probe-GI, and volumetrics that make the look. **Recommendation:** architect for **`WebGPURenderer` + TSL** as the primary path (so shaders are portable and you get compute), while keeping the *asset* pipeline (glTF/KTX2/Meshopt/instancing/LOD) 100% renderer-agnostic. Ship a **reduced-quality WebGL2 fallback** only if analytics show meaningful un-migrated traffic in the kid/school device base (older Chromebooks are the real risk) — otherwise follow the benchmark and go WebGPU-first.

---

## Top concrete recommendations for L3ARN

- **Target "painterly stylised-PBR," not photoreal.** AoE IV itself is stylised-for-readability (Craig Mullins look); this is cheaper, safer for kids/teens, ages better, and maps directly onto free CC0 libraries.
- **Do IBL first.** A Poly Haven HDRI → PMREM/`<Environment/>` + **ACES (evaluate AgX) tone mapping** + auto-exposure is the single biggest jump from "primitive scene" to "AoE-quality," and it's ~an afternoon.
- **Hybrid lighting: bake static GI into lightmaps + one CSM sun + IBL.** Cap real-time lights at ≤3, no `PointLight` shadows, and enforce a **no-pure-black-shadows** QA rule (coloured, lifted shadows for the painterly/kid look).
- **Terrain = authored heightmap + RGBA splatmap, GPU-blended (slope/height biased), with rock meshes on cliffs.** Author in **Gaea**; add CDLOD clipmaps for the big world later.
- **Vegetation on `@three.ez/instanced-mesh` (InstancedMesh2)** with a **full → meshopt → octahedral-impostor** LOD chain and **Poisson scatter driven by the splatmap**; instanced vertex-shader grass with 3-frequency wind. This is proven at 190k–200k trees in-browser.
- **Standardise metallic-roughness + ORM channel packing + a trim-sheet-and-tiling material system.** Reject any asset with baked lighting in its base color.
- **Every asset ships as `.glb` through a mandatory glTF-Transform CI gate:** Meshopt geometry (Draco for static terrain), **KTX2** textures (UASTC for normal/ORM, ETC1S for albedo, RDO off). Enforce **<100 draw calls/frame** and per-asset size budgets.
- **Characters: one shared skeleton + Mixamo clip library**; KayKit/Quaternius for stock, **Meshy (auto-rig)** for bespoke companions; **VAT/bone-texture instancing** for crowds.
- **Build the world from CC0 first (Poly Haven + Quaternius + KayKit)**; use **Fab/Megascans** for gaps; use **AI generators (Meshy/Tripo) as concept+base-mesh factories** — always retopo + de-light + compress before shipping.
- **Maintain an in-repo asset manifest** (source + licence + attribution) from day one; commercial use of AI generators requires a **paid plan** and free-tier output is generally not ship-clear.
- **Architect WebGPU-first (`WebGPURenderer` + TSL)** — that's where the benchmark and the future are — with a renderer-agnostic asset pipeline and an optional reduced WebGL2 fallback only if Chromebook analytics demand it.

---

## Recommended default asset & tooling stack

**Runtime rendering:** three.js **`WebGPURenderer` + TSL** (WebGL2 fallback optional) · React Three Fiber + **drei** (`<Environment/>`, `<Detailed/>`, `<PerformanceMonitor/>`, `useGLTF`) · **`@three.ez/instanced-mesh` (InstancedMesh2)** for foliage/crowds · **`three-mesh-bvh`** for picking · **`mkkellogg/GaussianSplats3D`** reserved for hero splat backdrops.

**Compression / delivery:** **glTF-Transform** (CLI in CI) — Meshopt (`EXT_meshopt_compression`) default, Draco for static terrain, **KTX2/Basis** (UASTC normal+ORM, ETC1S albedo) · `gltfpack` as all-in-one alt · `KTX2Loader` + `DRACOLoader`/`MeshoptDecoder` wired into `GLTFLoader`.

**Authoring / DCC:** **Blender** (modeling, retopo, **lightmap baking in Cycles**, FBX→GLB conversion) · **Substance Painter/Designer** or free equivalents for trim sheets & materials · **Gaea 2** (terrain; alts World Creator / World Machine) · **Mixamo** (auto-rig + animation library).

**Asset libraries (default):** **Poly Haven** (HDRI + tiling textures + photoscanned nature, CC0) · **Quaternius** (stylised kit, CC0, rigged) · **KayKit** (characters + modular buildings, CC0, rigged+animated) · **Kenney** (extras, CC0) · **Fab/Megascans** (paid gap-fill, Standard/CC-BY only).

**AI 3D generators:** **Meshy (Pro)** — companion characters (native auto-rig) · **Tripo (paid)** — props/env kit (clean topology, cheapest) · **Rodin/Hyper3D** — occasional hero asset (retopo required) · **Luma Genie** — real-world scan capture. *(Paid plans only for commercial rights; log licence per asset.)*

**Dev/QA tooling:** `stats-gl` · `Spector.js` · `lil-gui` · Playwright headless-WebGPU screenshot verification (Fable5's approach) · in-repo **asset manifest** (source/licence/attribution) · CI **compression gate** with size/draw-call budgets.
