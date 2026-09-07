**# AGENT BRIEF — Rebuild the L3ARN Academy as a First-Person 3D World**

**\*\*Audience:\*\*** the coding agent working in \`E:\L3ARN\`.

**\*\*Status:\*\*** binding implementation brief. Follow it in order. Do not skip Part 1.

**\*\*Derived from:\*\*** frame-by-frame teardown of *\*"GPT-6 Astra Is Finally Here"\** (Matt Wolfe,

19:31). 2,343 frames sampled at 0.5 s. Seven separate 3D web builds appear in it. The

reference frames extracted from those builds live beside this file in \`frames\\\`.

**\*\*Reference frames — open these before writing code. They are the spec.\*\***

\| File | What it proves |

\|---|---|

\| \`frames\A1\_alexandria\_firstperson\_street.jpg\` | **\*\*The target.\*\*** True first-person educational walkthrough. Full HUD grammar. |

\| \`frames\A2\_alexandria\_mouseion\_ingame\_signage.jpg\` | Diegetic wayfinding; place label changes on zone entry. |

\| \`frames\A3\_alexandria\_narration\_player\_ai\_voice.jpg\` | **\*\*AI-voice narration player.\*\*** This is L3ARN's companion, already solved. |

\| \`frames\A4\_alexandria\_audio\_language\_toast.jpg\` | System-feedback toast; audio language switcher. |

\| \`frames\B1\_megabonk\_landing\_world\_as\_background.jpg\` | **\*\*Entry screen.\*\*** Live world as full-bleed page background. |

\| \`frames\B2\_megabonk\_gameplay\_hud.jpg\` | Flat-shaded low-poly recipe + full corner-HUD layout. |

\| \`frames\B3\_megabonk\_levelup\_three\_cards.jpg\` | **\*\*Mission-choice modal.\*\*** World blurred behind, not replaced. |

\| \`frames\C1\_whisperwood\_thirdperson\_open\_meadow\.jpg\` | Minimum-viable HUD; WASD + pointer-lock look. |

\| \`frames\C2\_whisperwood\_thirdperson\_canopy\_dapple.jpg\` | Dappled shadow = the whole forest effect, for free. |

\| \`frames\D1\_littleplanet\_district\_zonecard.jpg\` | **\*\*District model + progress chip + zone card.\*\*** |

\| \`frames\E1\_pelagic\_underwater\_fog\_identity.jpg\` | Fog hue as zone identity. |

\| \`frames\F1\_livingworld\_agent\_state\_overlay.jpg\` | Live agent-state readout (companion telemetry). |

\| \`frames\G1\_racing\_hud\_eyebrow\_bignumber.jpg\` | Eyebrow-label + big-numeral stat pattern. |

Provenance worth knowing: two of these worlds (\`E1\_pelagic\`, and the Unreal one behind

\`F1\`) were stated by their authors to be **\*\*single-prompt generations\*\***. The bar here is not

"a studio built this over months." It is reachable.

\---

**## Part 0 — Read this first: why the current build looks broken**

The current Academy is **\*\*not\*\*** a failed art pass. It is a correct-but-tiny scene rendered

into a **\*\*150-pixel-tall canvas\*\***, with **\*\*no sky and no fog\*\***, so everything that is not

floor is the page's background colour. Fix those three things and the same geometry will

already look dramatically better. Do that before you touch art.

Current world, as built:

\- \`packages/world-engine/src/scenes/GreatHall.tsx\` — a 30×30 plane, four boxes for walls,

  one box for the Sorting Computer, one avatar. Primitive by design; the file header says so.

\- \`packages/world-engine/src/render/CameraRig.tsx\` — constrained orbit, click-to-move,

  \`mouseButtons.left\`/\`right\` set to \`ACTION.NONE\`. **\*\*There is no first-person mode at all.\*\***

\- \`packages/world-engine/src/render/Lighting.tsx\` — \`\<Environment files="…" background={false} />\`.

  **\*\*No sky.\*\*** No \`\<fog>\` anywhere in the package. Hence the void.

\---

**## Part 1 — Three blocking defects. Fix these first, in this order, as one PR.**

Nothing else in this brief will look right until these three land.

**### Defect 1 — The canvas collapses to 300×150 (the grey strip in the screenshot)**

**\*\*Root cause, precisely.\*\*** The height chain is indefinite from the top down:

\`\`\`

shell         min-height: 100vh    <- min-height, NOT height, so the height stays indefinite

  main        flex: 1              <- flex-basis:0% against an indefinite parent behaves as \`content\`

    container flex: 1; height: calc(100vh - 52px)

                                   <- \`flex: 1\` sets flex-basis:0%, which governs the main

                                      axis; the \`height\` declaration is dead code

      Canvas  height: 100%         <- percentage of an indefinite parent resolves to \`auto\`

        \<canvas>                   <- falls back to its HTML intrinsic default: 300 x 150 px

\`\`\`

\`width: 100%\` resolves fine (widths always do), which is why the artefact is a

**\*\*full-width, \~150 px-tall band\*\*** rather than a small square. That band is the screenshot.

**\*\*Fix — three edits. Every link in the chain must become definite.\*\***

\`apps/web/src/app/(student)/layout.tsx\`

\`\`\`diff

   shell: {

\-    minHeight: "100vh",

\+    height: "100dvh",          // definite height; dvh so mobile browser chrome can't clip it

\+    overflow: "hidden",        // the world moves the camera, never the page

     display: "flex",

     flexDirection: "column",

\`\`\`

\`\`\`diff

   main: {

     flex: 1,

\+    minHeight: 0,              // REQUIRED: without it a flex child cannot size below its content

     display: "flex",

     flexDirection: "column",

   },

\`\`\`

\`apps/web/src/app/(student)/academy/page.tsx\`

\`\`\`diff

   canvasContainer: {

     flex: 1,

\+    minHeight: 0,

     position: "relative",

\-    height: "calc(100vh - 52px)",   // dead code: flex-basis:0% governs. Also hardcodes the header height.

   },

\`\`\`

**\*\*Verify by measurement, not by eye.\*\*** Add this to the Playwright suite and require it:

\`\`\`ts

const box = await page.locator('canvas').boundingBox();

expect(box!.height).toBeGreaterThan(600);   // fails today at \~150

expect(box!.width).toBeGreaterThan(900);

\`\`\`

**### Defect 2 — No sky and no fog, so the world has no atmosphere**

Every reference build gets most of its perceived quality from **\*\*sky + fog\*\***, not geometry.

\`E1\_pelagic\` is simple stone boxes; it reads as a drowned city purely because of

single-hue exponential fog. \`B2\_megabonk\` is cones on cylinders; it reads as a forest

because of a matched sky/fog pair and one sun.

In \`packages/world-engine/src/render/Lighting.tsx\`, add a sky-and-fog pair driven from one

per-zone token table:

\`\`\`ts

// The single most important rule: FOG COLOUR MUST MATCH SKY COLOUR AT THE HORIZON.

// If they differ you get a hard seam where the ground ends, and the illusion dies.

export const ZONE\_ATMOSPHERE = {

  'great-hall':    { sky: '#BFD9EE', fog: '#D8E6F0', near: 28, far: 150, sun: '#FFF4E0' },

  'math-meadow':   { sky: '#C6E0F2', fog: '#DCEAF2', near: 30, far: 160, sun: '#FFF6E2' },

  'reading-grove': { sky: '#A9C6D8', fog: '#BFD3DC', near: 18, far:  90, sun: '#FFE9C8' },

  'science-deep':  { sky: '#0E3B44', fog: '#12545C', near:  6, far:  55, sun: '#7FE3E0' }, // Pelagic-style

} as const;

\`\`\`

\`\`\`tsx

// inside \<Canvas>:

\<color attach="background" args={[atmos.sky]} />

\<fog   attach="fog"        args={[atmos.fog, atmos.near, atmos.far]} />

\`\`\`

Keep \`\<Environment … background={false} />\` — the HDRI is for *\*lighting\** only; the

\`\<color attach="background">\` above is what paints the sky. Confirm

\`/env/great-hall-dawn.hdr\` actually resolves under \`packages/world-engine/public/env/\`;

if it 404s, \`\<Environment preset="park" />\` is a visually fine stopgap.

**\*\*Zone identity comes from this table, not from new models.\*\*** Changing four hex values

gives you a believably different place. It is the cheapest quality lever available.

**### Defect 3 — The ground plane ends in mid-air**

A 30×30 plane with 10-unit walls has a visible terminating edge. Two changes:

1\. Grow the walkable ground to **\*\*120×120\*\*** and let fog swallow the edge (\`far: 150\`).

2\. Add a **\*\*backdrop ring\*\*** of instanced trees and low hills at radius 55–70, so the player

   never sees the terminator. Decorative only, no collision, one \`InstancedMesh\`.

\---

**## Part 2 — The camera decision, and an ADR conflict you must surface**

**\*\*You are being asked for first-person. The existing spec forbids it as the default.\*\***

\`docs/superpowers/specs/2026-06-30-3d-academy-world-design.md\`:

\- §6.4 — \*"**\*\*Not\*\*** a free-look/first-person default… First/third-person is a per-mission

  opt-in (ADR-004 'special missions'), not the default locomotion."\*

\- §8.5 — cites vestibular safety and calls it *\*"safety, not polish."\**

That concern is legitimate: smooth first-person locomotion causes motion sickness in a

meaningful minority of children. **\*\*It is not a reason to refuse the request.\*\*** It is a

reason to build first-person *\*with\** the comfort affordances, and to have Cameron ratify

the reversal explicitly.

**\*\*What to build:\*\***

1\. **\*\*Default camera mode: first-person.\*\*** Eye height **\*\*1.45 m\*\*** (child-scaled; the

   \`A1\_alexandria\` reference sits at roughly 1.6 m adult height). FOV **\*\*72\*\***.

2\. **\*\*Keep click-to-move as a first-class alternative\*\***, not a legacy path. This is what

   discharges §8.5: the existing \`CameraRig\` + \`setMoveTarget\` flow becomes \*\*Comfort

   mode\*\*, auto-selected when \`prefers-reduced-motion: reduce\` is set.

3\. **\*\*Three modes in the store, with exactly one rig mounted at a time.\*\*** \`CameraRig\` runs

   its own \`requestAnimationFrame\` loop and owns the camera; mounting it alongside a

   first-person controller makes them fight for the camera and produces jitter.

\`\`\`ts

// packages/world-engine/src/state/worldStore.ts

cameraMode: 'first-person' | 'third-person' | 'comfort-click'

\`\`\`

\`\`\`tsx

// packages/world-engine/src/WorldCanvas.tsx — mutually exclusive, never two at once

{cameraMode === 'comfort-click' && \<CameraRig />}

{cameraMode === 'first-person'  && \<FirstPersonRig eyeHeight={1.45} />}

{cameraMode === 'third-person'  && \<ThirdPersonRig distance={6} height={2.6} />}

\`\`\`

**### \`FirstPersonRig\` — required behaviour**

New file: \`packages/world-engine/src/render/FirstPersonRig.tsx\`

\- **\*\*Look:\*\*** drei \`\<PointerLockControls />\`. Engages on canvas click. Show a centred

  "Click to look around" plate until \`document.pointerLockElement\` is set; \`Esc\` releases.

  The browser shows its own "press Esc to show cursor" bar — visible at the top of

  \`E1\_pelagic\`. That is expected browser chrome, not a bug to hide.

\- **\*\*Move:\*\*** one \`useFrame\`. Read a keyboard-state **\*\*ref\*\***, never React state (state

  re-renders the tree on every keypress). Build the move vector from

  \`camera.getWorldDirection()\`, then **\*\*zero the Y component and re-normalise\*\*** — otherwise

  looking at the ground slows the player to a crawl. That is the classic first-person bug

  and it will be the first thing anyone notices.

  \`\`\`

  walk 2.6 m/s   sprint (Shift) 4.4 m/s   accel ramp 0.08 s   no jump in v1

  \`\`\`

\- **\*\*Collision:\*\*** do not add a physics engine. Keep an array of AABBs per scene, test the

  candidate position, reject-and-slide on hit. At this geometry count it is free.

\- **\*\*Comfort — all mandatory, all exposed in the pause menu:\*\***

  - mouse-sensitivity slider (default 0.0022 rad/px) and invert-Y

  - **\*\*head-bob OFF by default\*\***, opt-in only

  - a comfort vignette that fades in while moving (a radial CSS overlay whose opacity

    tracks speed)

  - \`prefers-reduced-motion\` forces \`comfort-click\`, and the choice is sticky per student

\- **\*\*Never let camera Y drift.\*\*** First-person Y is \`terrainHeight(x, z) + eyeHeight\`,

  recomputed every frame. Anything else sinks the player through the floor eventually.

**### \`ThirdPersonRig\`**

Match \`C1\_whisperwood\`: camera 6 m back, 2.6 m up, about 12° down. The character occupies

the lower-centre third of frame at roughly 15 % of frame height. Same pointer-lock look and

the same movement code — only the camera offset differs. Ship it as a \`V\` toggle.

**\*\*Deliverable for Cameron, not for you to decide:\*\*** open

\`docs/adr/ADR-004-supersede-first-person-default.md\` recording the reversal, the comfort

mitigations above, and that \`comfort-click\` remains the reduced-motion default. Flag it for

sign-off. Do not merge the camera PR without it.

\---

**## Part 3 — Art direction: switch style locks. This is the biggest decision in the brief.**

\*\*The spec's current art target (§7.1–7.7) is over-scoped, and that is why the world still

looks like grey boxes.\*\* It calls for painterly stylised-PBR, Gaea heightmaps, RGBA

splatmaps, baked Cycles lightmaps, octahedral impostors, 190k instanced trees, a

KTX2/Meshopt CI gate, and a shared Mixamo skeleton. That is a studio art pipeline. It is

months of work, and until it is *\*finished\** it renders as untextured primitives — precisely

the current state.

**\*\*Every reference build in the video reaches its quality with none of that.\*\*** They are

flat-shaded, **\*\*zero-texture\*\***, primitive-geometry scenes. \`B2\_megabonk\`'s trees are a cone

and an icosahedron on a cylinder. Their quality comes from four things achievable this week:

matched sky/fog, one sun with real shadows, a tightly limited palette, and disciplined

typography.

**\*\*Adopt "Style Lock B — flat-shaded low-poly" as the near-term target.\*\*** Keep

painterly-PBR as an explicitly deferred Phase 3+ option. Record this as an ADR alongside

the camera one.

**### The recipe, exactly as the references do it**

**\*\*Materials — the whole world, no exceptions in v1\*\***

\`\`\`tsx

// Zero textures. Zero image loads. Flat shading IS the look.

\<meshLambertMaterial color={c} flatShading />

// Use meshStandardMaterial only where the HDRI reflection matters (glass, water, metal):

\<meshStandardMaterial color={c} flatShading roughness={1} metalness={0} />

\`\`\`

\`flatShading\` is what produces the faceted planes. Without it, low-poly reads as "smooth

and cheap" instead of "stylised and deliberate."

**\*\*Ground — the trick that makes \`B2\_megabonk\` read as real terrain\*\***

Not a flat plane, and not a heightmap texture. Use \`PlaneGeometry(120, 120, 64, 64)\`, then

in a \`useMemo\`:

1\. displace each vertex's Y by low-amplitude value noise (±0.6 m) for gentle rolling;

2\. **\*\*assign a per-face colour\*\*** from a 3-tint green ramp, selected by a second, much

   lower-frequency noise sample. Write into a \`Float32BufferAttribute('color', …)\`;

3\. set \`flatShading\` and \`vertexColors: true\`.

That produces the large irregular flat colour patches visible in both \`B2\_megabonk\` and

\`D1\_littleplanet\`. It costs one mesh and one draw call.

**\*\*Props — three archetypes, varied by scale and rotation only\*\***

\| Prop | Geometry | Notes |

\|---|---|---|

\| Conifer | \`coneGeometry(r, h, 7)\` + \`cylinderGeometry(.12,.16,1,5)\` | 7 radial segments, not 32 |

\| Deciduous | \`icosahedronGeometry(r, 0)\` (20 faces) + trunk | detail **\*\*0\*\***, never 1 or higher |

\| Rock | \`dodecahedronGeometry(r, 0)\` | non-uniform scale + random rotation |

\| Grass tuft | 3 clustered \`coneGeometry(.05,.4,3)\` | dense near camera, thinning with distance |

\| Flowers | \`sphereGeometry(.05, 5, 4)\` | white/pink specks; pure set dressing, large payoff |

**\*\*Scatter must be seeded and deterministic.\*\*** Use \`mulberry32(zoneSeed)\`, never

\`Math.random()\`. Two reasons: SSR/client hydration mismatch, and — more importantly — a

student must be able to *\*learn the layout\** of their Academy. A world that reshuffles on

reload cannot be navigated or remembered.

**\*\*Instance everything repeated.\*\*** One \`InstancedMesh\` per archetype per zone. Budget:

**\*\*40 draw calls or fewer\*\*** for an entire zone. Verify with \`gl.info.render.calls\`, logged

through the FPS governor that already exists in

\`packages/world-engine/src/device/deviceTier.ts\`.

**\*\*Lighting — the existing rig is close to right; do not rebuild it\*\***

Keep the single shadow-casting \`directionalLight\` and the soft fill. Three changes:

\- shadow map **\*\*2048\*\*** on desktop, **\*\*1024\*\*** on \`LOW\` tier — read the tier the governor

  already classifies rather than hardcoding.

\- **\*\*Let tree canopies cast shadows onto the ground.\*\*** That one flag produces the dappled

  forest floor in \`C2\_whisperwood\`, the most expensive-looking effect in that entire build,

  at no additional cost.

\- Honour the spec's own QA rule: **\*\*no pure-black shadows.\*\*** Lift them by tinting

  \`ambientLight\` toward the sky colour instead of white.

**\*\*Interactable affordance:\*\*** every clickable object gets a **\*\*soft glowing puddle\*\*** on the

ground beneath it — a \`circleGeometry\` with an additive radial-gradient material, gently

pulsing. See the chests in \`B2\_megabonk\`. This replaces the current bare box and is how a

student knows what can be touched without being told.

\---

**## Part 4 — The eight HUD laws**

Derived by cross-referencing all seven builds. Every one of them obeys all eight. The

current \`hudHint\` pill obeys two.

1\. **\*\*The world is full-bleed; UI floats on top of it.\*\*** Never box the canvas. Never let the

   world occupy a strip. Canvas layer \`position: fixed; inset: 0\`; HUD layer

   \`pointer-events: none\` with \`pointer-events: auto\` re-enabled per control.

2\. **\*\*Everything lives in a corner, or in the exact bottom-centre.\*\*** Nothing sits in the

   middle of the screen except a transient toast. The centre of frame belongs to the world.

3\. **\*\*Two-tier labels, everywhere.\*\*** A tiny letterspaced-caps *\*eyebrow\** above a larger name.

   \`A1\`: \`THE CITY AROUND THE MOUSEION\` / *\*The broad street\**. \`D1\`: \`FARM · 02\` / \*Clover

   Fields\*. \`G1\`: \`LAP\` / **\*\*01\*\***. Make this the only label primitive you have.

4\. **\*\*Show the keys, always.\*\*** Bottom-centre, small bordered keycap chips with lowercase

   verbs: \`W A S D walk · shift run · E interact · V view · M map\`. Present in all four

   playable references. It is onboarding that costs one row and never needs a tutorial modal.

5\. **\*\*Brand lockup top-left:\*\*** glyph badge + letterspaced wordmark + tiny sub-line.

   \`A1\` is a temple glyph + \`ALEXANDRIA\` + \`CITY & MOUSEION · c.250 BCE\`. Yours becomes the

   L3ARN mark + \`L3ARN ACADEMY\` + the student's House.

6\. **\*\*Tools top-right,\*\*** as translucent pills with icon and label (\`A1\`: Audio / Texts / Map)

   or plain circles (\`B1\`, \`D1\`). Never a hamburger menu.

7\. **\*\*Modals blur the world; they never replace it.\*\*** \`B3\_megabonk\` uses heavy blur plus a

   tinted scrim, and the world stays legible and animating behind. \`MissionOverlay.tsx\`

   already does this correctly (\`backdropFilter: blur(6px)\`) — it simply has nothing worth

   seeing behind it yet. Raise it to \`blur(14px) saturate(0.85)\` once the world lands.

8\. **\*\*Wayfinding is diegetic.\*\*** \`A2\_alexandria\` puts \`← BOOK ROOM\`, \`← COPYING\` and

   \`LIBRARY ↑\` on wooden signposts **\*\*inside the world\*\***, not as HUD arrows. Do the same:

   signposts at every junction carrying subject names. Zero HUD cost, and it teaches

   map-reading as a side effect.

\---

**## Part 5 — Screen specs**

**### 5.1 Entry screen — \`/student/academy\` before the session starts**

Model: \`B1\_megabonk\_landing\_world\_as\_background.jpg\`

\- The **\*\*live 3D world is the page background\*\***, full-bleed and already animating. Not a

  screenshot, not a video, not a boxed hero. Pressing the CTA does **\*\*not\*\*** load a new page —

  it hides the overlay and hands control to the player. No loading screen, ever.

\- A **\*\*gradient scrim\*\*** darkens only the left third:

  \`linear-gradient(90deg, rgba(8,12,20,.82) 0%, rgba(8,12,20,.45) 38%, transparent 62%)\`.

  Text contrast without a solid panel.

\- Left column, top to bottom: eyebrow with a trailing hairline rule → oversized two-line

  display headline → two-line subhead → small muted body → a labelled section rule

  (\`CHOOSE YOUR COMPANION\` on the left, \`01 — 03\` on the right) → \*\*three selectable

  tiles\*\* (selected state = accent 1 px border plus a small accent check in the corner) →

  **\*\*a selection-dependent detail line\*\*** → a full-width solid accent CTA carrying its own

  keycap (\`ENTER\`) and a trailing \`→\` → tiny centred micro-copy.

\- Right side: a floating **\*\*mission card\*\*** — a large \`01\`, a two-line label, a flat vector

  banner drawn in the world's own palette, an eyebrow, a bold title, one line of flavour

  text, and a footer stat row with an icon.

\- Bottom edge: keycaps centred, version right, disclaimer left.

Mapping onto L3ARN: the hero is the student's House and name; the three tiles are today's

three missions (or companion selection); the right card is the next mission; the CTA is

"Enter the Academy."

**### 5.2 Explore HUD**

Model: \`C1\_whisperwood\` (minimum) escalating to \`B2\_megabonk\` (full)

Start at minimum. Add only what a student can act on.

\- top-left: brand lockup + \`HOUSE / ZONE\` breadcrumb (laws 3 and 5)

\- top-centre: eyebrow + the one thing that matters now — session time, or \`2 / 5 TASKS\`

\- top-right: pill row — Companion (voice on/off) · Map · Help · Pause

\- bottom-centre: keycaps (law 4)

\- bottom-left: \`YOUR SATCHEL\` — four slots holding earned tools, matching \`B2\`'s arsenal

\- bottom edge: a thin XP rail, \`LVL n\` left and \`n / m XP\` right

\- **\*\*No crosshair and no minimap in v1.\*\*** Both cost more than they return at this stage.

**### 5.3 Zone card — fires on crossing a zone boundary**

Model: \`D1\_littleplanet\_district\_zonecard.jpg\`

A bottom-left translucent dark card about 320 px wide. Slides up and fades in over 240 ms,

holds 4 s, fades out. Eyebrow \`MATH · 02\`, serif title *\*Fraction Falls\**, one line of

flavour. It is the cheapest "this is a real place" signal in the entire reference set.

Debounce it — never re-fire on re-entry within 60 s.

**### 5.4 Companion narration player — \*\*build this one; it is the whole product\*\***

Model: \`A3\_alexandria\_narration\_player\_ai\_voice.jpg\`

This single frame is L3ARN's core interaction already designed. Copy it closely.

\- Bottom-left, a **\*\*light cream card\*\*** floating on the world (\`#FBFAF7\`), square corners,

  soft shadow. Note that it is *\*light\** while the rest of the HUD is dark translucent — that

  inversion is what makes it feel like a document rather than a game widget.

\- \`×\` close, top-right of the card.

\- Eyebrow: \`COMPANION · AI VOICE\` (their wording: \`ROOM NARRATION · AI VOICE\`).

\- Title set in the serif: *\*"A place to think together."\**

\- A thin progress bar with \`0:02 / 0:34\` right-aligned.

\- Two buttons: a primary solid (\`Pause\`) and a secondary outline (**\*\*\`Transcript\`\*\***).

**\*\*The \`Transcript\` button is not optional.\*\*** It is simultaneously the accessibility story,

the COPPA/safety-audit story (spec §5.5–5.7 require reviewable companion output), and the

parent-visibility story. Wire it to the exact text the TTS consumed — not a paraphrase.

Add the bottom-centre **\*\*contextual verb\*\*** seen in \`A1\`/\`A2\`: the single quiet action for

wherever the student is standing — \`Guided audio tour\` out in the plaza, \`Listen to this

room\` once inside. One verb, changes per zone, no button chrome.

**### 5.5 Mission card — replace the current flat panel**

Model: \`B3\_megabonk\_levelup\_three\_cards.jpg\`

The current mission card is a dark panel on near-black. \`B3\` is the same idea done properly:

\- World behind: \`blur(14px)\` plus a scrim tinted toward the zone's fog colour.

\- Centred stack: gold eyebrow (\`A LITTLE STRONGER. A LOT MORE TROUBLE.\`) → a huge display

  headline with an **\*\*accent-coloured terminal period\*\*** → a one-line subhead.

\- Three equal cards, square corners, with **\*\*a 2 px accent rule along the top edge only\*\***:

  - type/rarity eyebrow at left, **\*\*a numeric keyboard-shortcut badge at right\*\*** (\`1\` \`2\` \`3\`)

  - a line-art icon inside a tinted square tile

  - bold title, tiny \`LEVEL 1\` caps, two lines of muted description

  - a hairline divider, then \`CHOOSE UPGRADE →\` — the whole card is the hit target

\- A muted centred voice-line beneath (\`☆ YOUR BUILD. YOUR BEAUTIFUL MESS.\`)

For L3ARN the three cards are the three task paths within a mission. \*\*Keep the number

badges and bind keys 1/2/3\*\* — it is faster for the student, and it is keyboard

accessibility for free.

**### 5.6 Companion state overlay — parent/founder view only**

Model: \`F1\_livingworld\_agent\_state\_overlay.jpg\`

\`LIVING WORLD / RESIDENTS\`, then counts, then per-agent intent lines (\`Mara / say\`,

\`Elias / build\`). This is exactly the observability panel the Founder Mission Control work

wants: what the companion is doing, right now, in plain text. Top-left, monospace, low

opacity. **\*\*Never show it to a student\*\*** — gate it behind the parent/founder role.

\---

**## Part 6 — Design tokens**

Put these in \`packages/world-engine/src/theme.ts\` and import them into both the R3F scenes

and the DOM HUD, so the world and the interface cannot drift apart.

\`\`\`ts

export const WORLD = {

  sky: '#BFD9EE', horizon: '#D8E6F0',

  grass: ['#9CC46A', '#86B558', '#6E9E4A'],        // the 3-tint ground ramp

  path: '#D8C79A',

  conifer: ['#3F6B45', '#325739'],

  canopy: ['#A8C361', '#C9CE5F'],

  trunk: '#6B4A34', stone: '#C8C2B4', water: '#5E9EA8', sun: '#FFF4E0',

};

export const UI = {

  ink: '#14181F', cream: '#F7F5EF',

  accent: '#6366F1',          // keep L3ARN indigo as the primary

  accentWarm: '#E8B04B',      // the reference gold — XP, rewards and emphasis only

  scrim: 'rgba(10,14,22,0.55)',

  panel: 'rgba(14,20,30,0.72)',

  hairline: 'rgba(255,255,255,0.14)',

  blur: 'blur(14px) saturate(0.85)',

};

\`\`\`

**\*\*Typography — three faces, no more\*\*** (load via \`next/font/google\` so they self-host):

\| Role | Face | Usage |

\|---|---|---|

\| Display | **\*\*Outfit\*\*** 800 | \`LEVEL UP.\` / \`MEGA BONK.\`-scale headlines. Tracking \`-0.02em\`. |

\| Place names | **\*\*Instrument Serif\*\*** 400 | *\*The broad street\**, *\*Clover Fields\**, *\*The outer reef\** |

\| UI and body | **\*\*Inter\*\*** 400/500/600 | everything else |

The **\*\*label primitive\*\*** — you will reach for this more than any other rule in this document:

\`\`\`css

.eyebrow {

  font-size: 11px; font-weight: 600; letter-spacing: .14em;

  text-transform: uppercase; opacity: .62;

}

\`\`\`

The keycap chip:

\`\`\`css

.key {

  font-size: 10px; font-weight: 600; letter-spacing: .08em; padding: 2px 6px;

  border: 1px solid rgba(255,255,255,.22); border-radius: 3px;

  background: rgba(255,255,255,.06);

}

\`\`\`

\---

**## Part 7 — Execution order. One task per PR. Gate each one.**

Follow the repo's existing one-task-at-a-time protocol. Do not batch tasks.

\| # | Task | Gate — must be evidence, not assertion |

\|---|---|---|

\| **\*\*1\*\*** | Part 1 defects: canvas height, sky + fog, ground extent | Playwright asserts canvas height > 600 px. Screenshot shows sky and a horizon. |

\| **\*\*2\*\*** | \`theme.ts\` tokens; fonts wired through \`next/font\` | Tokens imported by both a scene and a HUD component. |

\| **\*\*3\*\*** | Flat-shaded ground: noise displacement + per-face vertex colours | Screenshot matches \`B2\`'s patchwork. \`gl.info.render.calls\` logged. |

\| **\*\*4\*\*** | Instanced props: conifer / deciduous / rock / grass / flowers, seeded scatter | Two reloads produce a **\*\*pixel-identical\*\*** screenshot (proves determinism). 40 draw calls or fewer. |

\| **\*\*5\*\*** | Canopy shadows + lifted ambient | Dappled ground visible, as in \`C2\`. No pure-black pixel in shadow (existing QA rule). |

\| **\*\*6\*\*** | \`FirstPersonRig\` + \`cameraMode\` store + rig exclusivity | Pointer lock engages and releases. Looking down does not slow movement. Y never drifts. **\*\*ADR drafted.\*\*** |

\| **\*\*7\*\*** | Comfort layer: sensitivity, invert-Y, vignette, \`prefers-reduced-motion\` → \`comfort-click\` | Emulate \`prefers-reduced-motion\`; assert \`cameraMode === 'comfort-click'\`. |

\| **\*\*8\*\*** | HUD shell obeying all eight laws: lockup, breadcrumb, tool pills, keycaps | Visual diff against \`C1\`. HUD layer is \`pointer-events\:none\` except controls. |

\| **\*\*9\*\*** | Zone system: boundaries, atmosphere swap, zone card, diegetic signposts | Walk across a boundary; card fires once, fog hue changes. |

\| **\*\*10\*\*** | Companion narration player **\*\*including Transcript\*\*** | Transcript renders the exact TTS text. Fully keyboard-reachable. |

\| **\*\*11\*\*** | Mission card restyled to \`B3\`, keys 1/2/3 bound | Keys select. World legible and still animating behind the blur. |

\| **\*\*12\*\*** | Entry screen per \`B1\`; CTA hides the overlay with **\*\*no navigation\*\*** | No route change on enter. World never unmounts. |

\| **\*\*13\*\*** | \`ThirdPersonRig\` on \`V\` | Toggle round-trips with no camera fighting. |

\| **\*\*14\*\*** | Performance pass against the existing tier budgets | FPS floor held on \`LOW\` tier. Asset-budget CI gate green. |

Tasks 1–5 are pure art and plumbing, change no behaviour, and deliver most of the visible

win. Tasks 6–7 constitute the ADR-004 reversal and must not merge without sign-off. Tasks

8–12 install the UI grammar.

\---

**## Part 8 — Explicit prohibitions**

\- **\*\*Do not\*\*** add a physics engine (rapier, cannon) in v1. AABB reject-and-slide is enough.

\- **\*\*Do not\*\*** add textures, normal maps, or KTX2 in v1. Style Lock B is zero-texture; adding

  one texture forces the whole PBR pipeline and the build will stall again.

\- **\*\*Do not\*\*** use \`Math.random()\` anywhere in world generation. Seeded PRNG only.

\- **\*\*Do not\*\*** put per-frame values in React state. Refs plus \`useFrame\`.

\- **\*\*Do not\*\*** mount two camera controllers at once.

\- **\*\*Do not\*\*** add a crosshair, damage numbers, a health bar, or a minimap. This is a school,

  and each of those costs more than it returns right now.

\- **\*\*Do not\*\*** ship first-person without the comfort layer (task 7). That is a safety

  requirement in the existing spec, not a nice-to-have.

\- **\*\*Do not\*\*** ship "AI voice" without the \`Transcript\` control.