# L3ARN ASSET FACTORY

_Canonical planning artifact 4 of 5 (`docs/L3ARN_MASTER_GOAL.md` §19). How each asset class in `L3ARN_ASSET_MANIFEST.md` is produced, checked and shipped — so that "we need a model" never becomes "buy a pack." Written 2026-09-07._

Order of operations for any missing asset (§10): **1 generate concept → 2 procedural → 3 bespoke 3D from concept → 4 CC0 → 5 paid (founder approval)**. This document is the factory floor for tiers 1–4.

---

## 1. Directory and naming

```
packages/world-engine/public/
  env/      <zone>-<time>.hdr            + ASSET_MANIFEST.md (exists)
  models/   <class>-<name>-v<n>.glb      + ASSET_MANIFEST.md
  audio/    <bucket>/<event>.ogg|.mp3    + LICENSES.md
  ui/       sigil-<house>.svg, mark.svg, icon-<name>.svg
docs/art/
  concepts/<asset-id>/                   generated concept sheets + prompts.md
  turnarounds/<asset-id>/                front/side/back/3-4 views
  qa/<asset-id>/                         in-engine screenshots (light/dark zone, LOW tier)
```

`scripts/sync-world-engine-public.mjs` (exists) already copies `packages/world-engine/public` into the web app on `dev`/`build` — new folders ride along.

## 2. Procedural pipeline (tier P) — the default for environments, props, VFX

Recipes, all seeded and deterministic (`mulberry32(seed)`; never `Math.random()` — hydration mismatch and unlearnable layouts):

| Class | Recipe |
|---|---|
| Ground | `PlaneGeometry(120,120,64,64)`; displace Y by value noise ±0.6 m; per-face colour from a 3-tint ramp picked by low-frequency noise into `Float32BufferAttribute('color')`; `flatShading`, `vertexColors` |
| Conifer | `coneGeometry(r,h,7)` + `cylinderGeometry(.12,.16,1,5)`; 7 radial segments, not 32 |
| Deciduous | `icosahedronGeometry(r,0)` + trunk; detail **0** |
| Rock | `dodecahedronGeometry(r,0)`, non-uniform scale + random rotation |
| Grass tuft | 3 clustered `coneGeometry(.05,.4,3)`, density falls with distance |
| Flowers | `sphereGeometry(.05,5,4)`, white/pink specks |
| Architecture | boxes/cylinders with the existing `proceduralTextures.ts` canvas textures (stone tile, block, runner) — the Great Hall is the reference implementation |
| Crystals | `octahedronGeometry` (red), `dodecahedronGeometry` (blue), `coneGeometry×2` mirrored (green) — **shape differs per colour** for the non-colour cue; emissive + `MeshPhysicalMaterial` transmission on HIGH, `meshStandardMaterial` emissive on LOW |
| Bins | `cylinderGeometry` open top, glyph decal via canvas texture, emissive rim |
| Sorting Computer states | one group, state → material emissive/colour + child visibility toggles + spark emitter on/off |
| Glow puddle | `circleGeometry` + `ShaderMaterial` radial gradient, additive, `sin(t)` pulse |
| Sparks / motes / arcs | `Points` with per-point lifetime in a `BufferAttribute`, updated in the ECS; arcs as `Line2` with noise |
| Banner unfurl | plane with 20 segments, vertex shader roll-down by progress uniform |
| Creature manifest (interim) | dissolve shader on a billboard silhouette from the concept art (tier G 2D → P) |

Materials in Style Lock B: `meshLambertMaterial({ flatShading })` everywhere; `meshStandardMaterial({ flatShading, roughness:1, metalness:0 })` only where HDRI reflection matters (glass, metal, water). Zero image textures except the existing canvas-generated ones.

Instancing: one `InstancedMesh` per archetype per zone; gate: ≤ 40 draw calls per zone (`gl.info.render.calls` via the FPS governor).

## 3. Generated concept → bespoke 3D (tier G) — companions, creatures, sigils, badges, mark

1. **Concept sheet** — image-generation tool (founder decision §M-6; RTX 5090 lab may run a local model). Prompt template lives in `docs/art/concepts/<id>/prompts.md`; record tool, seed, prompt, date. Direction: stylized-realism, readable silhouette at 64 px, child-friendly, House palette. Generate 6–12, pick 1–2, iterate.
2. **Turnaround** — front / side / back / ¾ from the chosen concept (same tool, consistent seed/reference image). Save to `docs/art/turnarounds/<id>/`.
3. **Interim in-engine stand-in** — Style Lock B procedural silhouette matching the concept's read (colour, proportion, motion personality) so gameplay never waits on modelling. Ships in Phases 4–6.
4. **Model** — image-to-3D tool or Blender from the turnaround (tool is a founder call; Blender scripting is always available). Target ≤ 8k tris companions, ≤ 15k creatures, one material, flat-shaded or vertex-coloured in B; PBR maps only in Phase 8.
5. **Rig + clips** — Blender: simple humanoid/creature armature; clips named after the state machine: `idle`, `follow`, `move`, `look`, `point`, `excited`, `concerned`, `celebrate`, `talk`, `manifest`, `roar`. Export GLB with animations.
6. **Optimise** — `gltf-transform` (already a dev dependency): `dedup`, `prune`, `weld`, `quantize`, `draco` or `meshopt`; KTX2 textures only in Phase 8. Run `scripts/check-glb-budget.mjs`.
7. **Load** — drei `useGLTF` + `useAnimations`; preload per scene; dispose on scene exit.
8. **QA** — in-engine screenshots in two zones and on LOW tier into `docs/art/qa/<id>/`; silhouette test at 64 px; read against `docs/references/target/`.

2D (sigils, mark, badges, icons): generate → vectorise (Inkscape/potrace or redraw) → SVG, currentColor where possible → `public/ui/`.

## 4. CC0 / licensed (tier C)

| Class | Source | Licence | Notes |
|---|---|---|---|
| HDRIs | Poly Haven | CC0 | 1k is enough (existing `great-hall-dawn.hdr` is the pattern) |
| Base rigs / props if procedural fails | Quaternius, Kenney | CC0 | retexture/recolour to palette; never let the pack's look lead |
| Fonts | Google Fonts (Outfit, Instrument Serif, Inter) | OFL | via `next/font/google`, self-hosted at build |
| Icons | Lucide | ISC | tree-shaken imports |
| SFX / ambient | freesound.org (CC0 filter), Kenney audio | CC0 | normalise −16 LUFS, trim, OGG+MP3 |

Rules: record every file in the folder's manifest (file, URL, licence, author, date, modifications). No CC-NC. No "free for personal use." Attribution page in the parent app footer if any CC-BY slips in.

## 5. Audio production

Ambient: layer 2–3 CC0 loops, 60–90 s, seamless crossfade points marked; or generate with a local model and record the prompt. SFX: 8–24 bit, mono for spatial emitters, ≤ 1 s for UI; families share a timbre (machine = electrical/glass; companion = soft synth; ceremony = brass/choir). Companion voice: **not** produced as files — runtime TTS behind the parent flag with transcript (`L3ARN_WORLD_ARCHITECTURE.md` §10); provider per §M-5. Never any microphone capture.

## 6. Quality gates per asset

- Reads at 64 px and at 4 m in first-person.
- Zero pure-black pixels in shadow in the QA screenshots.
- Draw-call and triangle budget per zone still met after adding it.
- GLB budget CI gate green (`.github/workflows/asset-gate.yml`).
- Deterministic: two reloads → identical placement (scatter) / identical pose (idle start frame).
- Licence recorded.
- Screenshot pair committed to `docs/art/qa/<id>/`.

## 7. Throughput plan

Phase 0–1: fonts, tokens, sigils v1 (2D), glow puddle, scatter archetypes, grounds HDRI. Phase 4: two companion procedural stand-ins + concept sheets started. Phase 5: all Mission 001 props + VFX (procedural). Phase 6: chamber + banners + creature silhouettes/billboards; creature concepts. Phase 7: audio library. Phase 8: companion and creature rigs from concepts; Sorting Computer and banners uplifted to stylized-realism; PBR/KTX2 introduced with the asset gate now gating real files.

## 8. What the factory refuses to do

Buy first. Let a pack's style lead. Ship an untextured placeholder as "final." Use `Math.random()` in placement. Add a texture in Style Lock B. Skip the licence record. Skip the in-engine QA screenshot.
