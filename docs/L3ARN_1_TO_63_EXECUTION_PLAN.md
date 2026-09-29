# L3ARN 1 → 63 EXECUTION PLAN

**Canonical sequential execution index**  
**Detailed task specs:** `docs/L3ARN_COMPLETE_BUILD_PLAN.md`  
**Master objective:** `docs/L3ARN_MASTER_GOAL.md`

This document gives the coding agent one numbered path from the current production codebase to the beta-ready L3ARN core.

## Execution rules

- Each numbered item is one bounded implementation task/PR unless the detailed build plan explicitly permits grouping.
- Always branch from current `origin/main`.
- Never silently change approved architecture.
- Child-facing work requires automated tests **and** real-browser visual QA.
- Founder-decision gates are explicit.
- Parallel-safe tasks may run together, but their PRs must still satisfy individual gates.
- The detailed file list, exact acceptance criteria, and visual gates for each item live under the matching `P#.x` task in `L3ARN_COMPLETE_BUILD_PLAN.md`.

---

# PHASE 0 — FOUNDATION & HYGIENE

### 1. P0.1 — Fix Pause dead-end
**Goal:** Pause/resume/entry cannot strand a valid child session.  
**Gate:** Playwright confirms Pause → child entry works and session remains valid.

### 2. P0.2 — Companion choice enters Academy
**Goal:** After companion choice, child lands in the Great Hall; Mission 001 begins in-world.  
**Gate:** first-time child sees Academy before Mission 001 presentation.

### 3. P0.3 — Establish E2E harness
**Goal:** Playwright + CI coverage for login → session → entry → Academy.  
**Gate:** green baseline, canvas coverage assertion, zero relevant console errors.

### 4. P0.4 — Central theme tokens and fonts
**Goal:** one visual token system shared by world and HUD.  
**Gate:** tokens imported by both R3F scene and DOM HUD; fonts self-hosted.

### 5. P0.5 — Architecture decision records
**Goal:** record first-person supersession, staged fidelity, deferred physics, companion voice, student world prefs.  
**Gate:** ADR index updated; first-person decision aligned to `L3ARN_FOUNDER_DECISIONS.md`.

### 6. P0.6 — Eliminate N8AO warning flood
**Goal:** clean Academy console without losing intended AO on capable devices.  
**Gate:** warnings = 0 under normal target tier.

### 7. P0.7 — Resolve stale adaptive-runtime PR disposition
**Goal:** prevent stale branch/migration collisions.  
**Gate:** decision recorded; only required changes integrated.

### 8. P0.8 — Remove or guard unused full-compile mission route
**Goal:** avoid stale expensive AI path if unused.  
**Gate:** caller audit complete; route removed or explicitly founder-gated.

**Parallel group:** Tasks 1–8 may largely run in parallel, except where file collisions are identified.

---

# PHASE 1 — WORLD SHELL & ZONES

### 9. P1.1 — Full-bleed child world shell
**Goal:** Academy owns the viewport; HUD floats above it.  
**Gate:** canvas fills essentially the entire usable viewport at target sizes.

### 10. P1.2 — Scene registry and transitions
**Goal:** coherent scene architecture with controlled transitions/spawn points.  
**Gate:** deterministic scene swap with transition test.

### 11. P1.3 — Zone system and atmosphere
**Goal:** zones drive sky/fog/identity and entry events.  
**Gate:** boundary crossing changes atmosphere and emits one debounced event.

### 12. P1.4 — Academy Grounds exterior
**Goal:** create a readable explorable exterior using deterministic, performant world dressing.  
**Gate:** deterministic screenshots, draw-call budget, no visible world terminator.

### 13. P1.5 — Interaction system and affordances
**Goal:** reusable focus/interact language for objects.  
**Gate:** object focus + contextual verb + keyboard/click interactions work.

### 14. P1.6 — Entry screen over live world
**Goal:** remove dead webpage handoff; world is already alive behind entry UI.  
**Gate:** CTA hands control to world without unnecessary page navigation/unmount.

---

# PHASE 2 — CAMERA & CONTROLS

### 15. P2.1 — Camera mode store and rig exclusivity
**Goal:** first-person / third-person / comfort-click with exactly one active rig.  
**Gate:** unit tests prove no camera fighting.

### 16. P2.2 — First-person rig
**Goal:** polished child-scaled movement and pointer-lock look.  
**Gate:** measured speeds, no pitch slowdown, no Y drift, pointer lock works.

### 17. P2.3 — Collision
**Goal:** reliable walkable spaces without unnecessary physics complexity.  
**Gate:** cannot pass through walls/props; slide behavior tested.

### 18. P2.4 — Comfort layer
**Goal:** reduced-motion and camera comfort controls.  
**Gate:** reduced-motion automatically chooses comfort-click; preferences work.

### 19. P2.5 — Third-person mode
**Goal:** optional third-person exploration.  
**Gate:** V toggle round-trips without jitter/camera conflicts.

### 20. P2.6 — Persist student world preferences
**Goal:** camera/comfort preferences survive sessions securely.  
**Gate:** server-backed persistence + RLS; no localStorage authority.

### 21. P2.7 — Touch input
**Goal:** deliberate tablet/mobile control path after device-support decision.  
**Gate:** supported mobile emulation completes core entry/interact flow.

**Dependency:** Task 15 begins after Phase 1 foundation. Tasks 16–21 build on 15.

---

# PHASE 3 — HUD & CHILD COPY

### 22. P3.1 — Game-native HUD shell
**Goal:** implement the eight HUD laws: corners/bottom-center, minimal center obstruction, world-first presentation.  
**Gate:** visual QA against references; pointer events correct.

### 23. P3.2 — Zone card
**Goal:** make places feel named and memorable.  
**Gate:** timed/debounced zone card animation.

### 24. P3.3 — Choice modal
**Goal:** reusable blurred-live-world choice surface with keyboard shortcuts.  
**Gate:** keyboard-only selection; world stays visible/alive.

### 25. P3.4 — Companion narration player
**Goal:** accessible companion/narration surface with exact Transcript.  
**Gate:** transcript equals spoken/source text; keyboard reachable.

### 26. P3.5 — Developmental copy tiers
**Goal:** K–2, 3–5, 6–8 language density and interaction rules.  
**Gate:** copy-length/lint tests; eliminate school-test formatting from child flow.

---

# PHASE 4 — COMPANION AS CHARACTER

### 27. P4.1 — Companion entity/controller
**Goal:** companion exists spatially and reacts as a character.  
**Gate:** follow, reposition, look-at and state-machine tests.

### 28. P4.2 — Companion dialogue contract
**Goal:** bounded contextual dialogue while preserving selected name.  
**Gate:** compiler tests; no companion renaming.

### 29. P4.3 — Companion speaks through narration/captions
**Goal:** connect dialogue to the in-world narration experience.  
**Gate:** every line has transcript/caption coverage.

### 30. P4.4 — Optional TTS
**Goal:** parent-governed output voice only after provider decision.  
**Gate:** disabled means zero provider calls; enabled means audio/transcript exact match.

### 31. P4.5 — Founder companion state overlay
**Goal:** observability for founder/admin, never child-facing.  
**Gate:** role-gated tests.

---

# PHASE 5 — MISSION 001 AS REAL GAMEPLAY

### 32. P5.1 — Extract headless Mission 001 controller
**Goal:** separate learning/evidence logic from current presentation.  
**Gate:** identical evidence/reward payloads before/after refactor.

### 33. P5.2 — Build mission objects
**Goal:** crystals, bins, Sorting Computer states, lever, plaque, initial VFX.  
**Gate:** all states visually distinguishable.

### 34. P5.3 — Broken Great Hall arrival
**Goal:** mission begins as an environmental problem, not a web card.  
**Gate:** uncompleted child sees malfunctioning world state on arrival.

### 35. P5.4 — Pick / carry / place crystal gameplay
**Goal:** embody sorting in the world.  
**Gate:** correct/wrong feedback, evidence parity, all supported camera modes.

### 36. P5.5 — Sequencing levers
**Goal:** physical sequence reasoning with contextual hints.  
**Gate:** evidence emitted; retry/hint behavior verified.

### 37. P5.6 — In-world AI Mistake Check
**Goal:** child corrects a visibly wrong computer/AI claim.  
**Gate:** existing AI-verification evidence preserved.

### 38. P5.7 — Explain + reflect interaction
**Goal:** age-appropriate reasoning without giant essay UI.  
**Gate:** evidence parity; keyboard accessibility; no A/B/C/D test feel.

### 39. P5.8 — Mission completion ceremony
**Goal:** world visibly celebrates repair and rewards.  
**Gate:** rewards/mastery/report writes unchanged; completion video passes visual review.

### 40. P5.9 — Mission world persistence
**Goal:** repaired world remains repaired for that child.  
**Gate:** reload persists state; other households unaffected.

### 41. P5.10 — Lite/offline delivery modes
**Goal:** preserve alternate learning delivery without abandoning world identity.  
**Gate:** alternate modes complete with equivalent evidence.

---

# PHASE 6 — HOUSE CALLING AS CEREMONY

### 42. P6.1 — Calling Chamber scene
**Goal:** dedicated ceremonial place with distinct atmosphere.  
**Gate:** navigable transition and visual QA.

### 43. P6.2 — In-world House lore
**Goal:** learn Houses by moving through representations, not four SaaS cards.  
**Gate:** all four Houses reachable; approved content preserved.

### 44. P6.3 — Trial in game-native choice flow
**Goal:** preserve 7-question scoring while improving presentation.  
**Gate:** exact scoring parity and keyboard completion.

### 45. P6.4 — Recommendation reveal
**Goal:** dramatic system recommendation while preserving child final choice.  
**Gate:** both accept and override paths tested.

### 46. P6.5 — Oath
**Goal:** meaningful House acceptance with locked membership.  
**Gate:** existing backend payload and transfer-lock semantics preserved.

### 47. P6.6 — Companion unlock in Companion Grove
**Goal:** choose companion spatially after House acceptance.  
**Gate:** existing companion selection API unchanged.

### 48. P6.7 — Retire DOM-only ceremony pages
**Goal:** route shells enter in-world ceremony rather than separate web-form experience.  
**Gate:** deep links still work; no alternate DOM-only ceremony remains.

---

# PHASE 7 — AUDIO

### 49. P7.1 — Audio manager and UI sounds
**Goal:** centralized audio categories, captions, controls and gesture-safe playback.  
**Gate:** independent buckets, caption path, parent/user controls.

### 50. P7.2 — Zone ambience and spatial emitters
**Goal:** world sounds spatial and alive.  
**Gate:** crossfades and distance attenuation work.

### 51. P7.3 — Mission and ceremony SFX
**Goal:** every important gameplay beat has deliberate audio feedback.  
**Gate:** experience-bible beats covered and licenses recorded.

---

# PHASE 8 — ASSETS & FIDELITY

### 52. P8.1 — Generate concept art and turnarounds
**Goal:** establish bespoke L3ARN hero asset direction with AI-first pipeline.  
**Gate:** concept sheets/prompts committed; founder selects hero directions.

### 53. P8.2 — Source free/CC0 supporting assets
**Goal:** fill non-hero needs without letting packs dictate art direction.  
**Gate:** source/license manifest complete.

### 54. P8.3 — Produce hero rigs
**Goal:** game-ready companions/House creatures with required animation clips.  
**Gate:** engine budgets, clip naming, in-engine visual QA.

### 55. P8.4 — Stylized-realism fidelity uplift
**Goal:** upgrade signature objects/materials/characters after gameplay foundation is stable.  
**Gate:** performance floor preserved; visual target achieved on hero assets.

---

# PHASE 9 — PRE-BETA HARDENING

### 56. P9.1 — AI reliability hardening / Agent 19
**Goal:** measure real latency first; then tune timeout/retry safely, resolve duplicate retry logic.  
**Gate:** Agent 19 DoD; 3-attempt cap and safe fallback preserved.

### 57. P9.2 — Safety containment enforcement / Agent 20
**Goal:** real session-scoped containment with stricter-wins semantics.  
**Gate:** induced severe-event test; parent permissions remain untouched.

### 58. P9.3 — Parent safety/report trust / Agent 21
**Goal:** parent-safe notice surface separate from founder escalation internals.  
**Gate:** report shows only truthful, appropriately worded parent-facing notices.

### 59. P9.4 — Demo feedback capture / Agent 22
**Goal:** instrument founder/manual walkthrough and feedback process.  
**Gate:** walkthrough template + evidence capture complete.

---

# PHASE 10 — PERFORMANCE, ACCESSIBILITY, REGRESSION

### 60. P10.1 — Performance budgets
**Goal:** production-quality performance across device tiers.  
**Gate:** draw-call/asset/memory/FPS budgets measured and passing.

### 61. P10.2 — Accessibility
**Goal:** keyboard, reduced motion, captions, non-color cues, readable targets, deliberate device paths.  
**Gate:** automated axe + recorded manual keyboard/reduced-motion run.

### 62. P10.3 — Full production regression
**Goal:** prove complete Hero Slice and rebuilt game experience together.  
**Gate:** full production E2E, clean console, recorded journey.

---

# PHASE 11 — BETA READINESS

### 63. P11.1 — Final beta gate / Agent 23
**Goal:** execute A–J beta-readiness checklist and founder approval gate.  
**Gate:** explicit READY / NOT READY verdict with evidence; no unresolved critical safety/privacy blocker.

---

# Parallel execution summary

After dependencies are satisfied, use these major workstreams:

- **World:** 9–21
- **HUD/Copy:** 22–26
- **Companion:** 27–31
- **Mission:** 32–41
- **Ceremony:** 42–48
- **Audio:** 49–51
- **Assets:** 52–55
- **Hardening:** 56–59
- **Convergence:** 60–63

Do not parallelize tasks that edit the same core controller/store/scene without an explicit integration owner.

# Critical path

**1–8 foundation → 9–14 world → 15–21 camera → 32–41 Mission 001 → 60–62 convergence → 63 beta gate**

HUD, companion, ceremony, audio, assets, and hardening should run in parallel when their dependencies permit.

# Definition of complete for this program

The 63-task program is complete only when:
- child enters a full-screen coherent Academy
- first-person/comfort camera paths work
- House Calling is a real ceremony
- companion is spatial and animated
- Mission 001 is embodied gameplay
- evidence/mastery/calibration/rewards remain correct
- parent report remains truthful and clear
- safety containment is enforced
- AI reliability is hardened based on measured latency
- accessibility/performance gates pass
- production E2E passes
- founder walkthrough is complete
- Agent 23 issues an evidence-backed beta-readiness verdict

Post-beta expansion tracks such as broad mission catalog, shared-room multiplayer, advanced living-world economy, and proprietary learning-model expansion remain separate programs unless explicitly pulled into scope by the founder.
