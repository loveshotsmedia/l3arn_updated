# L3ARN GAME EXPERIENCE BIBLE

_Canonical planning artifact 1 of 5 (`docs/L3ARN_MASTER_GOAL.md` §19). Defines what the child experiences. `L3ARN_WORLD_ARCHITECTURE.md` defines how it is built; `L3ARN_COMPLETE_BUILD_PLAN.md` defines when. Written 2026-09-07._

References: `docs/references/target/` (the bar), `docs/references/current-bad/` (what to stop doing), `docs/L3ARN_3D_WORLD_IMPLEMENTATION_SPEC.md` Parts 2–8 (adopted; Parts 0–1 superseded by `L3ARN_COMPLETE_BUILD_ASSESSMENT.md` §A).

---

## 1. The standard

> A child enters L3ARN and immediately feels like they entered somewhere. They want to move. They want to explore. Their companion feels present. The world responds to them. Learning is embedded inside what they do. The Academy celebrates their progress. The parent can see meaningful learning evidence behind the experience. The child wants to come back. — `MASTER_GOAL` §23

Everything in this document serves that paragraph. "It works" is not done.

## 2. Pillars (in priority order when they conflict)

1. **Safe** — no webcam, no face, no biometrics, no always-on mic; parent governs; unvalidated AI never reaches the child. Never traded for spectacle.
2. **Present** — the child stands *in* the Academy at child eye-height; the world is full-bleed; the HUD floats.
3. **Responsive** — every action produces world feedback within 100 ms: light, motion, sound, companion reaction.
4. **Embedded learning** — the mastery/evidence/calibration record is produced by what the child *does in the world*, never by a form. Rigor is preserved exactly (§13).
5. **Alive** — the companion is a character; the machine sparks; the hall celebrates; the world remembers.
6. **Legible** — corner HUD, two-tier labels, keycaps always shown, one idea at a time, copy tiered by development level.
7. **Ceremonial** — identity moments (House Calling, oath, companion unlock, mission completion) are staged, not clicked through.

## 3. Visual target

**Premium stylized-realism real-time 3D** as the final target; **Style Lock B (flat-shaded low-poly, zero-texture)** as the implementation style until hero assets are uplifted (Assessment §M-2). Not photoreal, not cheap, not generic edtech.

Non-negotiable visual rules (from the references, all seven builds obey them):

- Sky and fog are one matched pair per zone; fog colour = sky colour at the horizon. Zone identity comes from that table before it comes from any model.
- One shadow-casting sun; shadows lifted into colour, never pure black (existing QA rule).
- Believable scale: the child is ~1.45 m; doors are tall; the Great Hall ceiling is far away; the grounds continue past the fog.
- Every interactable has a soft pulsing glow puddle beneath it. The child knows what can be touched without being told.
- Flat shading is the deliberate look in Style Lock B: `flatShading` on, 7-segment cones, detail-0 icosahedra, dodecahedron rocks, vertex-coloured ground with 3-tint ramps. Never "smooth and cheap."
- Diegetic wayfinding: signposts inside the world carry zone names. HUD arrows are forbidden.

## 4. The world is the interface

| Prefer | Over |
|---|---|
| gameplay | forms |
| spatial interaction | buttons |
| animation | explanation |
| environmental feedback | progress bars |
| companion guidance | instruction panels |
| world transformation | "Success!" dialogs |

Concretely for Mission 001: the child sees a glowing crystal, picks it up, carries it, places it in a bin that hums and lights — the checklist "Drag the red crystals into the red bin" (current `05` capture) does not exist.

## 5. Camera and controls

Default: **first-person**, eye height **1.45 m**, FOV **72**. Requires founder ratification of the ADR-004 supersession (Assessment §M-1) — the camera PR does not merge without it.

| Mode | Look | Move | When |
|---|---|---|---|
| `first-person` (default) | pointer lock, sensitivity 0.0022 rad/px default, invert-Y option | WASD walk 2.6 m/s, Shift run 4.4 m/s, 0.08 s accel ramp, no jump v1 | desktop/laptop with mouse |
| `third-person` (`V` toggle) | same pointer lock | same movement; camera 6 m back, 2.6 m up, ~12° down; character in lower-centre third | alternative; **tablet default** with on-screen stick |
| `comfort-click` | constrained orbit (existing `CameraRig`) | click/tap to move (existing) | `prefers-reduced-motion: reduce`, **phone default**, and any child who chooses it |

Comfort layer — **all mandatory before first-person ships** (`3D_SPEC` Part 2; design spec §8.5 "safety, not polish"):

- head-bob **off** by default, opt-in only
- comfort vignette that fades in with speed
- sensitivity slider and invert-Y in the pause menu
- `prefers-reduced-motion` forces `comfort-click`; the choice is sticky per student (stored server-side with the session, never `localStorage` as authority)
- "Click to look around" plate until pointer lock engages; `Esc` releases; browser's own "press Esc" bar is expected chrome
- camera Y is always `terrainHeight(x,z) + eyeHeight`; never drifts
- never two rigs mounted at once

Never require twitch precision for any learning action (§17). Every mission interaction must be completable in comfort-click mode with the same evidence produced.

## 6. HUD grammar — the eight laws

Adopted from `3D_SPEC` Part 4; every screen obeys all eight.

1. The world is full-bleed; UI floats on top (`position: fixed; inset: 0` canvas; HUD `pointer-events: none`, re-enabled per control). No header bar.
2. Everything lives in a corner or the exact bottom-centre. The centre belongs to the world; only transient toasts may cross it.
3. Two-tier labels everywhere: 11 px letterspaced-caps eyebrow over a larger name. The only label primitive.
4. Show the keys, always: bottom-centre keycap chips — `W A S D walk · shift run · E interact · V view · M map` (map deferred; omit until it exists).
5. Brand lockup top-left: L3ARN mark + `L3ARN ACADEMY` + the student's House as the sub-line.
6. Tools top-right as translucent pills with icon + label: Companion (voice on/off) · Help · Pause. Never a hamburger.
7. Modals blur the world (`blur(14px) saturate(.85)` + zone-fog-tinted scrim); the world stays visible and animating behind. They never replace it.
8. Wayfinding is diegetic — signposts in the world.

HUD inventory per state (from `3D_SPEC` Part 5, `B2`/`C1`/`D1`/`G1`):

- **Explore:** lockup; `HOUSE / ZONE` breadcrumb; top-centre eyebrow + the one thing that matters now (`2 / 5 TASKS` or session time); pills; keycaps; bottom-left `YOUR SATCHEL` (4 slots); thin XP rail with `LVL n` / `n / m XP`. **No crosshair, no minimap, no health bar, no damage numbers.**
- **Zone card:** bottom-left 320 px translucent card on zone entry — eyebrow `GREAT HALL · 01`, serif name, one flavour line; 240 ms in, 4 s hold, fade; debounced 60 s.
- **Companion narration player:** bottom-left **light cream** card (`#FBFAF7`) — the one light element on a dark HUD; eyebrow `SPARK · COMPANION`; serif title line; progress bar `0:02 / 0:34`; `Pause` primary + `Transcript` secondary. **Transcript is not optional** — it is the accessibility, safety-audit and parent-visibility story, and it shows the exact text any TTS consumed.
- **Contextual verb:** bottom-centre single quiet action for where the child stands — `Repair the Sorting Computer`, `Talk to Spark`, `Enter the Calling Chamber`. One verb, changes per zone/object, no button chrome.
- **Choice card modal (mission choices, trial questions):** `B3` — gold eyebrow, display headline with accent period, three equal cards with a 2 px accent top rule, numeric key badges `1` `2` `3` bound to keys, line-art icon tile, bold title, two muted lines, hairline, `CHOOSE →`; the whole card is the hit target. Four options are allowed where pedagogy needs them (`1`–`4`).
- **Pause menu:** `B4` — small centred stack over the blurred live world: Resume · Camera & comfort · Sound · Ask a grown-up (ends session cleanly to child entry with the session **kept**). Never a dead end.
- **Founder/parent only:** companion state overlay (`F1`) top-left monospace — never shown to a child.

## 7. Child UX by developmental level

Tier is derived from grade (K–2 younger · 3–5 core · 6–8 advanced) and adjusted by calibration (`learner.calibration_initial_profile`, chunk size, hint needs). Same world, different presentation.

| | Younger (K–2) | Core (3–5) | Advanced (6–8) |
|---|---|---|---|
| Reading load | ≤ 8 words per line, always voiced/iconed | ≤ 14 words, short conversational | full sentences, fewer prompts |
| Guidance | companion points and walks the child there | companion hints on hesitation | environmental clues only until asked |
| Targets | large (≥ 64 px equivalent), forgiving snap radius | standard | standard |
| Choices | 2–3 visual options | 3–4 with icons | 3–4, may be text |
| Failure | gentle rejection + immediate hint, never a wrong-answer count | gentle rejection + hint after 2 | gentle rejection; hint on request |
| Reflection | pick-a-picture / sentence assembly | selectable explanation or sentence assembly | short text (optional) or selectable |

Copy voice — short, warm, active, playful, intelligent, specific. Companion speaks as a character in first person. Banned: numbered task lists, `A)`–`D)` letters, "Step 4 of 6" as the only structure, raw identifiers (`mission-001-complete`), "Continue to…", generic AI enthusiasm ("Great job!" ×N), educational bureaucracy ("Reflection", "Your Tasks").

## 8. Child journey (canonical)

### 8.1 Entry (`B1`)
The live Great Hall is already rendering behind a left-third gradient scrim. Eyebrow `WELCOME BACK` · display headline `StarBlazer7.` · sub-line House + companion · CTA `Enter the Academy ⏎` with keycap. Pressing it fades the scrim and hands control — **no navigation, no loading screen, the world never unmounts.** First-time children get the same screen with `Your Calling awaits.` and are walked to the Calling Chamber by the companion-to-be (a light) instead of choosing a companion from cards.

### 8.2 Great Hall arrival
Child stands at the entrance at eye height. Zone card fires. Companion greets by name (one line, voiced if enabled, transcript available). Contextual verb points at the obvious thing. The Sorting Computer on the dais is **visibly malfunctioning**: sparks, flicker, unstable energy arcs, three crystals scattered on the floor glowing wrong colours, half the hall's lights dimmed. The companion reacts ("Something's wrong with the Sorting Computer…").

### 8.3 Mission 001 — Repair the Sorting Computer (gameplay beat sheet)
Preserve every learning, evidence, calibration and reward call exactly (`MissionExperience.tsx` logic → headless controller). Rebuild the presentation:

| Beat | Child does | World does | Evidence emitted (unchanged) |
|---|---|---|---|
| **Arrival** | walks to the dais; contextual verb `Repair the Sorting Computer`; `E` | camera settles (existing settle), machine panel opens, companion: "Let's figure this out together. Which crystal goes first?" | `mission.started`, briefing captured |
| **Sort red / blue / green** | picks up a crystal (`E` or click; assisted toss in comfort mode), carries it (it floats ahead, hums), places it in a bin (snap when near) | correct: snap animation, energy pulse up the bin's conduit, machine repair meter +⅓, hall lights restore one bank, chime, companion cheers. wrong: bin rejects with a soft bounce, companion hint, bin of the right colour pulses brighter | `decision-log`, `sequence-completion` per crystal (same shapes as today) |
| **Sequencing** | the machine's three conduits must be powered in order; child pulls physical levers/switches on the machine | conduits light in order; out-of-order lever sparks and resets with a hint | `sequence-completion` |
| **AI Mistake Check** | the repaired computer announces (voice + screen) its sort result — one crystal is in the wrong bin; child must find it and move it | the machine confidently displays "ALL SORTED ✓"; the wrong crystal has a subtle flicker; on correction the machine says "You're right. I was wrong." and a plaque lights: **AI can be wrong. Check its work.** | `AI-mistake-check` |
| **Explain** | tier-appropriate: pick-a-picture / sentence assembly / selectable explanation / short text — rendered as a `B3`-style choice modal over the live hall | companion listens, nods, repeats back | `explanation` |
| **Reflection** | one choice modal ("What did the machine teach you?") | companion reflects | `reflection`, `structured-replay` |
| **Completion** | nothing — watches | machine fully restored; lighting sweep across the hall; House banners unfurl; energy flows into the floor runner; companion celebration animation; rewards rise out of the machine as animated Moolah/XP/House-point motes into the HUD rail; badges appear as real badge art on the satchel; the Fractions Observatory (holding) **visibly rises** outside the window with a fanfare | completion → rewards/mastery/report writes exactly as today |
| **Return** | walks the hall | the hall stays repaired and lit on every return (persisted state) | — |

Delivery modes: `3d` is the above. `interactive-lite` and `text-audio-offline` (ADR-016, parent-governed) continue to use the DOM card path, restyled to the choice-card grammar — they are not deleted.

### 8.4 House Calling (ceremony beat sheet)
Content unchanged (four Houses, creatures, mottos, growth challenges, seven trial questions, recommendation, child override, oath, transfer lock). Presentation:

| Beat | Staging |
|---|---|
| Invitation | the companion-light leads the child from the Great Hall through a door that opens on approach into the **Calling Chamber**: circular, four banners in shadow, a dais, cool fog, one shaft of light |
| Lore preview | the child walks to each banner; on approach it lights, the creature **manifests** as an animated silhouette-to-form above it, the motto is spoken; the growth challenge appears as a diegetic plaque |
| Trial (7 questions) | each question is a `B3` choice modal over the live chamber; the four banners pulse with the House each answer leans toward (never revealing the tally) |
| Recommendation | the fog drops, one banner blazes, its creature descends to the dais — dramatic reveal with sound; eyebrow `YOUR CALLING` · display `Novari.` · motto |
| Choice | `Accept` or `Choose differently` (walk to another banner; that creature manifests; accept there) |
| Oath | child stands on the dais; the oath is spoken line by line by the companion-light with the child pressing to affirm each; the House colour floods the chamber; the creature roars/sings |
| Companion unlock | a grove door opens; companions step out as **characters**, not cards; child walks to one; it turns, looks, greets by name; `Choose Spark` |
| Exit | door back to the Great Hall; the child's banner in the hall is now lit; the Sorting Computer sparks — Mission 001 begins in the world |

### 8.5 Pause / leave
Pause menu over the blurred live world. "Ask a grown-up" returns to child entry with the session intact.

### 8.6 Return visits
Zone card, companion greets, the world remembers: repaired machine, lit banner, risen observatory, satchel contents. Empty-state for "no mission yet" is the companion suggesting exploration, never a blank.

## 9. Companion as character (§8)

States: `idle`, `follow`, `move-to`, `look-at-player`, `look-at-objective`, `point`, `excited`, `concerned`, `celebrate`, `hint`, `talk`, `teleport` (fallback when > 12 m or stuck). Proximity: stays 1.5–3 m, never blocks the path, re-positions to the child's forward-left.

Dialogue: multi-line per mission from the compiler (currently one line — extend the prompt contract), plus a scripted bank per state. **AI never renames the companion** (verified today; keep the test). Every voiced line has a transcript entry with the exact text.

Voice: optional TTS behind a parent-controlled flag (Assessment §M-5). Text + narration player ships regardless.

Roster: Spark, Luna exist; canonical roster is a founder decision (§M-4). Each companion has a distinct silhouette, colour, movement personality (Spark darts; Luna glides), and greeting.

## 10. World response and celebration

Every meaningful learning event has a world consequence: correct placement → light bank; mission complete → hall restored + holding rises; House points → banner glow intensity; bond → companion visibly grows a trait (aura, accessory) at milestones. Consequences persist (holdings already do; extend the pattern).

## 11. Audio

Ambient per zone (hall: fire crackle, distant murmur; chamber: low choir pad, wind; grounds: birds, leaves), UI (hover, select, confirm, reject), machine (spark, hum, conduit charge, restore), celebration (fanfare, motes), companion (footsteps, vocal chirps, optional TTS). Spatialised where it has a position. Captions for every voiced line. Master/voice/sfx controls in Pause. Muted until first gesture (browser policy). No microphone.

## 12. Accessibility and comfort (§17)

Keyboard-only path for everything; reduced motion → comfort-click and no vignette-inducing motion; captions; non-colour cues (crystals also differ by shape and glyph; bins carry the glyph); readable type (Inter ≥ 14 px UI, ≥ 18 px child copy); targets ≥ 44 px; deliberate tablet/phone behaviour (§5). No learning action requires twitch precision.

## 13. Anti-references

Everything in `docs/references/current-bad/README.md`. In one line each: centred cards on dark voids; numbered task lists; A)–D) quizzes; single "click to sort" buttons; a header bar; emoji companions; blurred placeholder blobs for creatures; a green word as a reveal; raw badge keys; a dead-end Pause; a silent world; an unchanged hall after victory.

## 14. Acceptance — how a child-facing milestone is judged (§18)

1. Run it. 2. Play it in a real browser. 3. Screenshot; video where animation matters. 4. Compare with `docs/references/target/`. 5. Find dead space. 6. Find SaaS UI. 7. Find excessive text. 8. Find missing feedback. 9. Fix. 10. Only then call it complete. Route existing, button working, TypeScript passing, DB row written, placeholder appearing — none of these is completion.
