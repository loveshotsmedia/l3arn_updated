# Target references — game-feel bar, not art-style copies

Source: *"GPT-6 Astra Is Finally Here (And It's REALLY Good)"* — Matt Wolfe, 19:31, 1080p30.
Seven separate real-time 3D web builds appear in it; every frame below is one of them. The
MP4 itself is **not** committed (227 MB; `C:\Users\cjwil\Downloads\`). Frames were extracted
2026-09-07 with `ffmpeg -ss <t> -frames:v 1 -q:v 2` at native 1920×1080 after reviewing the
whole video at 8 s and then 1–2 s granularity around each build.

**How to use these.** Per `docs/L3ARN_MASTER_GOAL.md` §3, these define the bar for environmental
presence, movement, responsiveness, atmosphere, interaction, HUD, animation density and game
feel. They do **not** prescribe an art style — Alexandria is untextured architectural, MegaBonk is
flat-shaded low-poly, Whisperwood is Unreal-realistic, Pelagic is stylised-fog. What they share is
what L3ARN must share: full-bleed world, corner HUD, diegetic wayfinding, matched sky/fog, one
sun with real shadows, and modals that blur the world instead of replacing it.

Filenames match the table in `docs/L3ARN_3D_WORLD_IMPLEMENTATION_SPEC.md` so that spec's
references resolve. Every frame carries the presenter's webcam bubble bottom-right; ignore it —
it is the video's overlay, not part of any build.

| File | t (s) | Build | What it proves |
|---|---|---|---|
| `A1_alexandria_firstperson_street.jpg` | 1011 | Alexandria | **The target.** True first-person educational walkthrough. Brand lockup top-left, eyebrow + serif place name top-centre, tool pills top-right, keycaps bottom-centre. Believable scale, fog-softened horizon. |
| `A2_alexandria_mouseion_ingame_signage.jpg` | 1013 | Alexandria | Diegetic wayfinding — `LIBRARY ↑` on a signpost *inside the world*. Language toast bottom-centre. Place label changed on zone entry. |
| `A3_alexandria_narration_player_ai_voice.jpg` | 1018 | Alexandria | **The companion, already solved.** Light cream card on a dark world; eyebrow, serif title *"A place to think together"*, progress bar, `Pause` + `Transcript`. |
| `B1_megabonk_landing_world_as_background.jpg` | 456 | MegaBonk | **Entry screen.** Live animating world as full-bleed page background; left-third gradient scrim; oversized display headline; 3 selectable tiles; floating mission card right. |
| `B2_megabonk_gameplay_hud.jpg` | 506 | MegaBonk | Flat-shaded low-poly recipe (cone + icosahedron trees, patchwork ground) + full corner HUD + ground ring as interaction affordance. |
| `B3_megabonk_levelup_three_cards.jpg` | 514 | MegaBonk | **Mission-choice modal.** World blurred and still animating behind; three equal cards, accent top-rule, keyboard-shortcut badges. |
| `B4_megabonk_pause_menu_world_blurred.jpg` | 484 | MegaBonk | Pause menu as a small centred stack over the blurred live world — never a blank page. |
| `C1_whisperwood_thirdperson_open_meadow.jpg` | 836 | Whisperwood | Minimum-viable HUD (zone label top-left, keycaps bottom); third-person camera ~6 m back, character in lower-centre third. WASD + pointer-lock. |
| `C2_whisperwood_thirdperson_canopy_dapple.jpg` | 864 | Whisperwood | Dappled canopy shadow on the ground is the whole forest effect — one shadow-casting sun. |
| `C3_whisperwood_pond_water_reflection.jpg` | 844 | Whisperwood | Water with sun reflection; environmental scale; the world extends past the frame in every direction. |
| `D1_littleplanet_district_zonecard.jpg` | 909 | Little Planet | District model + progress chip + bottom-left zone card (*Fernwood*). Flat-shaded low-poly reads as a real place. |
| `E1_pelagic_underwater_fog_identity.jpg` | 996 | Pelagic | Single-hue exponential fog as zone identity; serif zone title *The Sunken Causeway*; big-numeral stats bottom-left. Simple stone boxes read as a drowned city. |
| `F1_livingworld_agent_state_overlay.jpg` | 974 | Living World (Unreal) | Live agent-state readout top-left, monospace, low opacity — companion telemetry for the founder/parent view only. Subtitled dialogue bottom. |
| `G1_racing_hud_eyebrow_bignumber.jpg` | 1004 | Azure Break | Eyebrow-label + big-numeral stat pattern (`LAP` / **01**), centred contextual verb, minimap bottom-left. |

Not included, deliberately: the Fall Guys–style obstacle course (t≈944) and the Backrooms
corridor (t≈940) — neither is the register L3ARN is aiming for; the Orbis planet (t≈570–690) is a
data-viz page, not a walkable world. They were reviewed and rejected, not missed.
