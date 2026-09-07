# Current-build captures — ANTI-REFERENCES

**These are what L3ARN must stop looking like.** Per `docs/L3ARN_MASTER_GOAL.md` §2, every
screen here is an anti-reference: do not preserve these presentations because they exist.

Captured 2026-09-07 from **production** (`https://l3arnupdated.vercel.app`, `main` @ `85ef14a`)
with headless Playwright at 1440×900 unless the filename says otherwise. Test household: the founder-owned browser test account (details in the founder's private notes, not in this repo)
(StarBlazer7 played Mission 001; QuasarKid3 ran the House
Calling). No real family data appears anywhere.

## Measured facts (not impressions)

| Measurement | Value | Consequence |
|---|---|---|
| Academy canvas at 1440×900 | 1440×838 — **93 %** of viewport | The 3D spec's "canvas collapses to 300×150" defect (`L3ARN_3D_WORLD_IMPLEMENTATION_SPEC.md` Part 1, Defect 1) **does not reproduce on production**. Fixed by visual pass 1 (`86fd86d`, "canvas-strip fix"). Do not re-plan it. |
| Canvas at 1280×720 / 1024×768 / 390×844 | 91 % / 92 % / 93 % | Full-bleed everywhere; the missing 7 % is the 62 px header bar. |
| Student header | 62 px SaaS bar: brand text left, `Pause` right | Law 1 (world is full-bleed, HUD floats) violated by the only persistent chrome. |
| Console on Academy load | 186× `GL_INVALID_OPERATION: glBlitFramebuffer … depth stencil` | Known N8AO upstream bug (memory: 3D Academy Task 8). Not visual. Noisy enough to hide real errors. |
| Mission 001 first paint | "Preparing your mission…" → briefing in **< 6 s** | `compileStart` on `MISSION_START_MODEL` (haiku) works. The ~66 s figure in `CODEX_HANDOFF.md` §3 is the *full* `compile()` path, which the web app never calls. |
| Pause button | navigates to `/student/enter` → **"Can't enter yet"** dead end; session lost | The fix (`46706b2`) sits on `feature/adaptive-lesson-runtime`, merged into `docs/3d-academy-world-spec` (PR #38) — **never reached `main`**. Live defect. |
| Companion choice → | `router.push("/student/mission/mission-001")` — the **standalone** mission route, not the Academy | A first-time child never sees the Great Hall before Mission 001. Only returning children get the in-world overlay. |

## Files

| # | File | What it shows | Why it is an anti-reference |
|---|---|---|---|
| 01 | `01-parent-session-launched.png` | Parent "Session Started" card | Parent side — fine as parent UX; here only as flow context. |
| 02 | `02-child-entry.png` | Child entry: "Welcome back StarBlazer7 · Enter the Academy" | Dark flat background, centred card, no world behind it. Compare target `B1` (live world as page background). |
| 03 | `03-academy-first-load.png` | Great Hall, Sims-style angled camera | **Not** a failed art pass — lit, propped, dust motes, warm HDRI. What is wrong: fixed isometric orbit, no first-person presence, SaaS header, a single hint pill as the whole HUD, no companion in the world, no zone label, no keycaps. |
| 04 | `04-mission-001-overlay-open.png` | "Preparing your mission…" | Blank wait state; no world reaction, no companion, no diegetic cue. |
| 05 | `05-mission-001-after-6s.png` | Mission 001 briefing card | 720 px centred card over blurred world; long paragraph; **"YOUR TASKS" as a numbered worksheet list** ("Drag the red crystals into the red bin" — while the actual interaction is one button). Rewards box. This is the §4 "task list" the master goal names explicitly. |
| 06–08 | `06-…sort-red`, `07-…blue`, `08-…green` | The three sort steps | Three glowing gem sprites and **one button: "Red Bin — click to sort"**. No pick-up, no carry, no placement, no machine response. ~40 % of the card is empty. |
| 09–10 | `09/10-…the-ai-made-a-mistake` | AI Mistake Check | Four-option **multiple-choice quiz** (A/B/C/D). The world does nothing. |
| 11 | `11-…what-did-you-learn` | Reflection | Another A/B/C/D quiz. |
| 12 | `12-mission-step.png` | "Saving your progress…" | Blank wait state #2. |
| 13 | `13-mission-001-complete-rewards.png` | "Nice work!" + four stat tiles + badge chips | Reward numbers are right (+25/+75/+15/+20). Presentation is a **dashboard**: no machine restoration, no lighting sweep, no House symbols, no companion celebration, no environmental payoff. Badges shown as raw keys (`mission-001-complete`, `ai-literacy-1`). |
| 14 | `14-world-after-mission.png` | Great Hall after "Return to the Academy" | Identical to 03 — the world did not visibly change. (Holdings unlock exists in data; nothing celebrates it.) |
| 15 | `15-pause-result.png` | "Can't enter yet" | Dead end. Live defect, see table above. |
| 16 | `16-parent-report-first-learning-map.png` | Parent First Learning Map (full page) | Parent surface — mostly *good*: mastery with parent-friendly names, evidence counts, calibration. Kept for the report-trust criterion (A0) — the tier copy now reads "Full detail shown." |
| 17 | `17-quasarkid3-after-enter.png` | House Calling intro card | A paragraph in a box on a dark gradient. The "major identity moment" is a modal. |
| 18 | `18-housecalling-the-four-houses.png` | Four House cards | Cards with **placeholder blurred blobs where creatures should be**, chips, quote, growth challenge. Content is strong; presentation is a pricing page. |
| 19–25 | `19…25-housecalling-…question-N-of-7` | The 7-question Trial | Seven A/B/C/D screens. Questions are good. It is a survey. |
| 26 | `26-housecalling-our-calling.png` | Recommendation reveal: **Novari** | The dramatic reveal is a centred card with a green word. No creature, no banner, no atmosphere, no sound. |
| 27 | `27-housecalling-house-novari.png` | Oath | The oath text in a card; "I Accept the Calling". |
| 28 | `28-housecalling-house-novari.png` | Accepted → "Enter the Companion Chamber →" | Card. |
| 29 | `29-housecalling-choose-your-companion.png` | Companion selection (Spark ⚡ / Luna 🌙) | Two emoji cards. The companion — "must become a game character, not a text box" (§8) — is introduced as an emoji. |
| 30 | `30-after-companion-choice.png` | Standalone `/student/mission/mission-001` | Same briefing as 05 but **with no world behind it at all** — the first-time child's first mission is a page. |
| 31 | `31-academy-{desktop,laptop,tablet,phone}.png` | Same Great Hall at four viewports | Proves the canvas fills every viewport (so the spec's Defect 1 is closed) and that the camera framing was never designed for portrait. |
| — | `academy-console-warnings.log` | 187 console warnings | The N8AO signature, verbatim. |

## What is NOT wrong (so nobody "fixes" it)

- The Great Hall geometry, lighting rig, HDRI, hemisphere bounce, shadow setup, dust motes and
  procedural textures are real work and reusable (`packages/world-engine/src/objects/*`, `render/Lighting.tsx`).
- Canvas sizing is correct.
- Mission 001's **learning logic, evidence capture, calibration and reward writes are correct** and
  must be preserved (`L3ARN_MASTER_GOAL.md` §7 — "rebuild its presentation as actual gameplay").
- The House Calling **content** (four Houses, creatures, mottos, growth challenges, seven trial
  questions, recommendation + child override, oath, transfer lock) is canonical and stays.
