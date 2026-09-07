# L3ARN ASSET MANIFEST

_Canonical planning artifact 3 of 5 (`docs/L3ARN_MASTER_GOAL.md` §19). Every asset the complete build needs, with its sourcing tier under the §10 asset policy, its status on `main` @ `85ef14a`, and the phase that consumes it. Production recipes are in `L3ARN_ASSET_FACTORY.md`. Written 2026-09-07._

**Sourcing tiers (§10, in order — never skip a tier):** **P** procedural (Three.js/R3F/shaders, seeded) · **G** generated concept/turnaround art → bespoke 3D · **C** properly licensed free/CC0 · **$** paid — **requires explicit founder approval with the six-point justification**. Nothing on this manifest is tier **$**. No asset pack defines art direction.

**Inventory on `main` today:** 1 HDRI (`packages/world-engine/public/env/great-hall-dawn.hdr`, Poly Haven CC0, recorded in `public/env/ASSET_MANIFEST.md`) · 0 GLB (`public/models/.gitkeep`) · procedural canvas textures (`src/art/proceduralTextures.ts`) · 13 procedural object modules · 0 fonts via `next/font` · 0 audio · 0 icons · 0 sigils · 0 creature art.

Budgets: ≤ 8 MB GLB per zone (CI gate `scripts/check-glb-budget.mjs`), ≤ 40 draw calls per zone, Style Lock B = zero textures until Phase 8.

---

## 1. Characters

| ID | Asset | Tier | Style Lock B (interim) | Uplift (Phase 8) | Status | Phase |
|---|---|---|---|---|---|---|
| CH-01 | Player avatar, child-scaled (1.45 m eye), House-coloured | P → G | procedural capsule+head with heading (exists: `objects/PlayerAvatar.tsx`) | GLTF rig, idle/walk/run/interact clips, 4 House palettes | exists (P) | 2 (third-person visible), 8 |
| CH-02 | Companion **Spark** (curious-inventor; darts) | P → G | procedural silhouette: small floating body, spark particles, distinct colour | GLTF rig, 8 state clips | missing | 4, 8 |
| CH-03 | Companion **Luna** (calm-guide; glides) | P → G | procedural: crescent body, soft trail | GLTF rig, 8 state clips | missing | 4, 8 |
| CH-04..n | Additional companions | G | — | per founder roster decision (§M-4) | decision | 8 |
| CR-01 | Storm Griffin (Valkryn) | G | banner silhouette + animated light form | hero GLTF, manifest/idle/roar clips | missing | 6, 8 |
| CR-02 | Songweaver Serpent (Lyrion) | G | same | same, sing clip | missing | 6, 8 |
| CR-03 | Ember Phoenix (Novari) | G | same | same, flare clip | missing | 6, 8 |
| CR-04 | Circuit Wyvern (Cytrex) | G | same | same, spark clip | missing | 6, 8 |

Companion and creature rigs are the **only genuine hero-asset work** in the build. Concept → turnaround → model → rig → clips; see Factory §3.

## 2. Environments

| ID | Asset | Tier | Status | Phase |
|---|---|---|---|---|
| EN-01 | Great Hall interior (walls, floor, columns, rafters, runner, hearth, tables, shelves, chandeliers, tapestries, torches, windows, dais) | P | **exists** (`scenes/GreatHall.tsx` + 13 objects) — keep | 1 (doors, mission props added) |
| EN-02 | Great Hall doors ×3 (grounds, chamber, grove), open-on-approach | P | missing | 1 |
| EN-03 | Academy Grounds exterior: vertex-coloured rolling ground 120×120, path, backdrop ring (hills + instanced trees), seeded scatter (conifer/deciduous/rock/grass/flower) | P | missing | 1 |
| EN-04 | Calling Chamber: circular hall, four banner alcoves, dais, one light shaft, fog | P | missing | 6 |
| EN-05 | Companion Grove: clearing, grove door, pedestals ×n | P (extend `objects/GroveNook.tsx`) | partial | 4, 6 |
| EN-06 | Mission Commons stub (door + sign only) | P | missing | out of scope; door only |
| EN-07 | Fractions Observatory (holding) | P | **exists** (`objects/MasteryBuilding.tsx`) — add rise animation | 5 |
| EN-08 | Signposts (diegetic wayfinding), per junction | P + text | missing | 1 |
| EN-09 | HDRI per zone (hall dawn exists; grounds day; chamber dusk) | C (Poly Haven CC0, 1k) | 1 of 3 | 1, 6 |

## 3. Mission 001 objects

| ID | Asset | Tier | Status | Phase |
|---|---|---|---|---|
| MO-01 | Sorting Computer, 6 states: `broken`, `partial-1/2/3`, `repaired`, `celebrating` (panel, conduits ×3, levers ×3, screen) | P | exists as single static hero prop (`objects/SortingComputer.tsx`) — extend | 5 |
| MO-02 | Crystals ×3 colours, **each also distinct by shape + glyph** (non-colour cue) | P | missing (sprites exist in DOM only) | 5 |
| MO-03 | Bins ×3 with glyph, snap zone, conduit, accept/reject glow | P | missing | 5 |
| MO-04 | Machine plaque "AI can be wrong. Check its work." (lights on mistake correction) | P + text | missing | 5 |
| MO-05 | Reward motes (Moolah / XP / House-point particles → HUD rail) | P (shader particles) | missing | 5 |
| MO-06 | Badge art ×2 (`mission-001-complete`, `ai-literacy-1`) | G (2D) | missing (raw keys shown today) | 5 |

## 4. VFX

| ID | Asset | Tier | Phase |
|---|---|---|---|
| FX-01 | Sparks (machine broken) | P (points + additive) | 5 |
| FX-02 | Electrical arcs / unstable energy | P (line + noise shader) | 5 |
| FX-03 | Energy pulse along conduit | P (animated emissive) | 5 |
| FX-04 | Glow puddle affordance (generalised from dais ring) | P | 1 |
| FX-05 | Lighting sweep (hall restore) | P (light intensity choreography) | 5 |
| FX-06 | Banner unfurl | P (skinned plane / morph) | 5, 6 |
| FX-07 | Creature manifest (silhouette → form) | P (dissolve shader) | 6 |
| FX-08 | House colour flood (oath) | P (fog/light lerp) | 6 |
| FX-09 | Dust motes | P — **exists** (`objects/DustMotes.tsx`) | — |
| FX-10 | Comfort vignette | DOM overlay | 2 |
| FX-11 | Zone fog/sky lerp | P | 1 |

## 5. UI

| ID | Asset | Tier | Status | Phase |
|---|---|---|---|---|
| UI-01 | Fonts: **Outfit** 800 (display), **Instrument Serif** 400 (place names), **Inter** 400/500/600 (UI) via `next/font/google` (self-hosted) | C (OFL) | missing | 0 |
| UI-02 | L3ARN mark (lockup glyph) | G (2D SVG) | missing (text only) | 3 |
| UI-03 | House sigils ×4 (SVG) | G (2D) | missing | 3, 6 |
| UI-04 | Icon set: companion, help, pause, sound, camera, transcript, satchel slots, keycap glyphs | C (Lucide, ISC) | missing (emoji today) | 3 |
| UI-05 | Design tokens `theme.ts` (WORLD + UI + ZONE_ATMOSPHERE) | P | missing | 0 |
| UI-06 | Choice-card icons (line art tiles) | C (Lucide) | missing | 3 |

## 6. Audio

| ID | Asset | Tier | Phase |
|---|---|---|---|
| AU-01 | Ambient: Great Hall (fire, murmur) | C (freesound CC0) or G (generated) | 7 |
| AU-02 | Ambient: Calling Chamber (choir pad, wind) | C / G | 7 |
| AU-03 | Ambient: Grounds (birds, leaves) | C / G | 7 |
| AU-04 | UI ×8: hover, select, confirm, reject, open, close, key, toast | C / G | 7 |
| AU-05 | Machine ×6: spark, hum, conduit charge, lever, error, restore | C / G | 7 |
| AU-06 | Celebration: fanfare, mote chime, banner unfurl | C / G | 7 |
| AU-07 | Companion: footsteps/glide, vocal chirps ×6 | G | 7 |
| AU-08 | Creature: manifest ×4, roar/sing/flare/spark | G | 7 |
| AU-09 | Companion voice (TTS) | provider — **founder decision §M-5** | 7 (optional) |

All audio OGG + MP3, mono for spatial emitters, ≤ 200 KB each; licence recorded per file in `public/audio/LICENSES.md`.

## 7. Parent / founder surfaces

No new visual assets — parent UI stays calm/premium on the existing token set; Founder Mission Control gains the companion-state overlay (DOM only).

## 8. Licence register

Every non-procedural asset is recorded in `packages/world-engine/public/<type>/ASSET_MANIFEST.md` (pattern already exists for `env/`): file, source URL, licence, author, date, modifications. CC0 preferred; CC-BY allowed with attribution page; no CC-NC (commercial product); no assets with unclear terms. Generated assets record the tool and prompt.

## 9. Paid assets

**None planned.** If a phase concludes a paid asset is needed, it stops and files the §10 six-point justification (why generation fails, why procedural fails, why no CC0 exists, price, licence, concrete advantage) for founder approval. Expected candidates that might reach that point: a high-quality child rig with clean retarget-able skeleton (CH-01 uplift); a curated SFX library. Both have CC0 routes (Quaternius/Kenney rigs; freesound) to exhaust first.
