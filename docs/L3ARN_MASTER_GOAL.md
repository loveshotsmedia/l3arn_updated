# L3ARN MASTER GOAL — COMPLETE THE BUILD

## Mission

Complete L3ARN from its current production-verified Hero Slice into a cohesive, premium, beta-ready AI learning game.

The child product must stop feeling like a web app with a small 3D scene embedded inside it.

The target experience is:

**Premium stylized-realism first-person 3D educational adventure.**

The Academy is the primary interface. The world fills the screen. Learning happens through gameplay, environmental interaction, companions, missions, animation, sound, feedback, and world response.

Do not treat “it works” as the definition of done.

---

## 1. Read before changing code

Read these files in order:

1. `docs/CODEX_HANDOFF.md`
2. `docs/CONTEXT.md`
3. `docs/architecture.md`
4. `docs/ADR/ADR-000-index.md`
5. `docs/agent_operating_rules.md`
6. `docs/shared_contracts_spec.md`
7. `docs/supabase_schema.md`
8. `docs/supabase_rls_policy_plan.md`
9. `docs/HERO_SLICE_PHASE_C_HANDOFF.md`
10. `docs/AI_HARDENING_BACKLOG.md`
11. `docs/L3ARN_3D_WORLD_IMPLEMENTATION_SPEC.md`
12. `docs/superpowers/plans/agent-19-ai-reliability-hardening.md`
13. `docs/superpowers/plans/agent-20-safety-containment-enforcement.md`
14. `docs/superpowers/plans/agent-21-parent-safety-flags-report-trust.md`
15. `docs/superpowers/plans/agent-22-demo-feedback-capture.md`
16. `docs/superpowers/plans/agent-23-beta-readiness-checklist.md`
17. all relevant visual references under `docs/references/`

Then inspect the actual repository:

- latest `main`
- recent git history
- frontend routes
- world engine
- React Three Fiber / Three.js code
- current Academy scenes
- camera code
- AI workers
- Mission Compiler
- House Calling
- companion system
- Mission 001
- evidence
- calibration
- rewards
- parent reports
- safety
- Supabase migrations and RLS
- production deployment configuration
- test suites

Do not redesign working production architecture merely because you would have chosen something else.

---

## 2. Current screenshots are anti-references

Current L3ARN screenshots showing:

- giant blank/empty areas
- tiny or collapsed 3D viewport
- dark flat backgrounds
- centered SaaS cards
- text-heavy mission panels
- worksheet-style instructions
- static companion copy
- excessive buttons
- weak animation
- little environmental interaction

are **ANTI-REFERENCES**.

Do not preserve those presentations simply because they currently exist.

---

## 3. Visual target

Final visual target:

**Premium stylized-realism real-time 3D.**

Not photorealistic military/FPS.

Not cheap low-poly as the permanent final style.

Not generic educational software.

Target:

- believable scale
- strong world composition
- full-screen 3D
- first-person presence
- responsive movement
- polished camera behavior
- cinematic real-time lighting
- atmospheric fog
- shadows
- PBR-capable materials
- environmental reflections where useful
- environmental VFX
- particles
- animation
- spatial/environmental audio
- polished transitions
- strong visual hierarchy
- child-friendly interaction
- game-native HUD

Reference video/screenshots define the bar for:

- environmental presence
- movement
- responsiveness
- atmosphere
- interaction
- HUD
- animation density
- game feel

They do not require copying one exact art style.

Low-poly / zero-texture geometry may be used as an early implementation strategy to establish game feel quickly. It is not the permanent fidelity ceiling.

---

## 4. World is the interface

Prefer:

- gameplay over forms
- spatial interaction over buttons
- animation over explanation
- environmental feedback over progress bars
- companion guidance over instruction panels
- world transformation over “Success!” dialogs

Do not tell a child “drag the red crystal into the red bin” in a task list if the child can see a glowing crystal, pick it up, move it, and place it into a responsive receptacle in the world.

The child should feel like they entered L3ARN Academy.

---

## 5. First-person direction

Desired normal child experience:

- first-person exploration
- responsive mouse look
- child-scaled eye height
- smooth movement
- collision
- contextual interaction
- appropriate HUD
- full-screen world

Also preserve:

- third-person alternative
- comfort-click alternative
- reduced-motion support
- sensitivity controls
- invert-Y
- head-bob OFF by default

If existing ADR/spec conflicts with first-person as default, create a superseding ADR for founder approval.

Do not silently violate safety decisions.

---

## 6. Child UX

L3ARN serves children.

Adapt presentation by developmental level.

### Younger learners
- minimal reading
- large interaction targets
- visual/voice guidance
- one idea at a time
- forgiving interaction
- strong immediate feedback

### Core learners
- short conversational instructions
- environmental clues
- interactive challenges
- companion guidance
- limited menus

### Advanced learners
- deeper problems
- greater independence
- richer choices
- less hand-holding

Child-facing copy must be:

- short
- warm
- active
- playful
- intelligent
- specific

Avoid generic AI enthusiasm and educational bureaucracy.

---

## 7. Mission 001

Preserve existing Mission 001 learning, evidence, calibration, and reward logic.

Rebuild its presentation as actual gameplay.

Canonical experience:

### Arrival
The child enters the Great Hall and immediately sees that the Sorting Computer is malfunctioning.

Use:
- sparks
- flicker
- unstable energy
- misplaced crystals
- partial power loss
- companion reaction

### Crystal sorting
The child interacts with crystals spatially.

Possible mechanics:
- grab
- carry
- click-to-pick-up
- place
- assisted toss
- accessible alternatives

Correct action should produce:
- snap/placement animation
- energy pulse
- machine repair progress
- light change
- sound
- companion reaction
- evidence event

Wrong action should produce:
- gentle rejection
- hint
- clearer environmental cue
- no harsh punishment

### Sequencing
Use physical machine components rather than a worksheet list.

### AI Mistake Check
The Sorting Computer confidently makes an incorrect suggestion.

The child must identify/correct it through the world interaction.

Teach:
**AI can be wrong. Verify its answer.**

### Explain
Use age-appropriate response modes:
- selectable explanation
- visual reasoning
- sentence assembly
- optional short text
- future parent-approved push-to-talk

### Completion
The Great Hall visibly reacts.

Use:
- machine restoration
- lighting sweep
- House symbols
- energy flow
- companion celebration
- animated rewards
- environmental payoff

Do not end as a boring web page.

---

## 8. Companion

The companion must become a game character, not primarily a text box.

Build the foundation for:

- idle
- follow
- movement
- look-at player
- look-at objective
- pointing
- excitement
- concern
- celebration
- contextual hints
- proximity behavior
- dialogue
- teleport/reposition fallback
- animation states

The AI must never rename the selected companion.

Transcript must preserve the exact text used for any AI/TTS narration where relevant to safety/accessibility.

---

## 9. House Calling

Preserve:

- four Houses only
- system recommendation
- child final choice
- oath
- transfer-locked membership
- parent-authorized future transfer

Houses:
- Valkryn
- Lyrion
- Novari
- Cytrex

Do not add a fifth House.

Rebuild House Calling to feel ceremonial:

- dedicated ceremonial environment
- House banners/symbols
- creature manifestations
- House-specific atmosphere
- animation
- sound
- dramatic recommendation reveal
- meaningful acceptance
- companion unlock reveal

Do not reduce it to cards/forms.

---

## 10. Asset policy

Do **not** default to buying assets.

For every missing asset, evaluate in this order:

1. Generate visual/concept assets with available image-generation tools.
2. Procedurally create suitable geometry/assets with Three.js, React Three Fiber, Blender scripting, shaders, or repo-compatible methods.
3. Create/convert bespoke game-ready 3D assets from generated references.
4. Use properly licensed free/CC0 assets where appropriate.
5. Paid assets require explicit founder approval.

Before requesting a paid asset, state:

- why generation is insufficient
- why procedural creation is insufficient
- why no suitable free/licensed asset exists
- price
- license
- concrete quality/time advantage

Never let an asset pack define L3ARN's art direction.

For hero assets such as companions, House creatures, and signature Academy architecture, generated concept/turnaround art should feed the 3D production workflow.

---

## 11. Technical game systems

Continue with the approved web stack unless a real blocker is proven:

- Next.js
- React
- Three.js
- React Three Fiber
- L3ARN World Engine
- Railway
- Supabase

Do not silently migrate to Unity, Unreal, Godot, etc.

Evaluate/build as needed:

- full-screen Canvas
- first-person controller
- pointer lock
- collision
- interaction raycasting
- animation state machines
- GLTF animation
- skeletal animation
- lighting
- shadows
- atmosphere
- particles/VFX
- postprocessing
- audio manager
- spatial audio
- scene loading
- transition system
- mission interaction state
- contextual HUD
- zone system
- object highlighting
- performance tiers
- LOD/instancing
- asset streaming

Do not permanently prohibit a physics engine.

For simple locomotion, use the simplest sufficient collision solution.

If later mission mechanics genuinely require throwing, stacking, pushing, rolling, moving platforms, or collision-driven puzzles, evaluate a physics engine through an ADR.

---

## 12. HUD rules

The world is full-bleed.

HUD floats above it.

Keep the center primarily for the world.

Use:
- corner-aligned status
- bottom-center contextual action/controls
- diegetic signage
- restrained overlays
- blurred live world behind modals

Avoid:
- permanent giant panels
- dashboard layouts
- endless center cards
- blank backgrounds

---

## 13. Learning architecture must remain real

Do not sacrifice educational rigor for spectacle.

Every mission remains traceable to:

- mastery
- standards where applicable
- evidence
- calibration
- parent intent
- child personalization

The child can feel like they are repairing a magical machine while the platform records genuine evidence for:

- sequencing
- comprehension
- evidence reasoning
- AI verification
- learner calibration

---

## 14. Parent experience

Parent experience is not the child HUD.

Parent UI should be:

- calm
- premium
- trustworthy
- clear
- academically serious

Parent should understand:
- what child learned
- evidence
- struggle
- calibration
- next recommended path
- rewards/progress
- relevant safety information

Never claim safety events are surfaced unless the report actually fetches and renders the parent-safe notice data.

Do not expose founder-only `safety_escalations` directly to parents.

---

## 15. Safety

Never introduce:

- webcam requirement
- face capture
- facial recognition
- biometrics
- always-on microphone

Child sessions remain backend-mediated.

Do not trust localStorage as identity authority.

Unvalidated AI output never reaches children.

Preserve:
- RLS
- service boundaries
- safe fallback
- parent governance
- child_permissions as canonical parent source of truth

Temporary containment must layer over parent permissions rather than overwriting them.

---

## 16. Pre-Beta Hardening

Agents 19–23 are inputs to this complete build.

Do not launch them as a competing orchestration system.

Incorporate them into the dependency graph.

Important correction for Agent 19:

The 30-second timeout is NOT automatically approved.

Production Mission 001 has already been observed around ~66 seconds.

Before selecting timeout:
- measure real single-attempt production-model latency
- record min/median/p90/p95/max
- choose timeout based on evidence
- do not turn normal successful generations into fallbacks

Preserve:
- 3-attempt cap
- safe fallback
- app-controlled retry policy
- SDK `maxRetries: 0`
- controlled backoff

Agent 23 remains the final beta-readiness gate.

---

## 17. Performance and accessibility

This is web-delivered real-time 3D.

Audit:
- draw calls
- geometry
- GLTF size
- textures
- shaders
- particles
- animation count
- scene loading
- memory disposal
- LOD
- instancing
- lazy loading
- device tiers

Support:
- keyboard/mouse
- reduced motion
- captions
- audio controls
- non-color-only cues
- readable type
- generous interaction targets
- deliberate tablet/mobile behavior

Do not require twitch-level precision for core learning.

---

## 18. Visual QA is mandatory

Automated tests are necessary but not sufficient.

For every child-facing milestone:

1. run feature
2. play in real browser
3. capture screenshots
4. capture video if animation matters
5. compare against target references
6. identify dead space
7. identify SaaS UI
8. identify excessive text
9. identify missing feedback
10. fix before calling complete

Do not declare a feature complete because:
- a route exists
- a button works
- TypeScript passes
- database state changes
- a placeholder object appears

---

## 19. Planning artifacts required before coding

Before large-scale implementation, create/update these canonical documents:

1. `docs/L3ARN_GAME_EXPERIENCE_BIBLE.md`
2. `docs/L3ARN_WORLD_ARCHITECTURE.md`
3. `docs/L3ARN_ASSET_MANIFEST.md`
4. `docs/L3ARN_ASSET_FACTORY.md`
5. `docs/L3ARN_COMPLETE_BUILD_PLAN.md`

`L3ARN_COMPLETE_BUILD_PLAN.md` is the execution source of truth.

It must contain:

- complete remaining build
- dependency graph
- implementation phases
- parallel workstreams
- shared-file collision risks
- exact systems/files involved
- technical acceptance criteria
- visual acceptance criteria
- gameplay acceptance criteria
- browser QA
- tests
- performance gates
- production gates
- beta-readiness gate
- definition of done

Do not create competing contradictory planning systems.

---

## 20. First response required

Do not immediately modify product code.

First return:

# L3ARN COMPLETE BUILD ASSESSMENT

## A. Current Product Reality
What is genuinely complete vs only technically wired.

## B. Current Child Experience Problems
Specific findings from live product/screenshots.

## C. World Engine Assessment
What is reusable, what must change.

## D. Visual Quality Gap
Difference between current experience and target references.

## E. UX/Copy Gap
Child-hostile UI/copy.

## F. Companion Gap

## G. Asset Gap

## H. Technical Risks
Including browser performance and AI latency.

## I. Final Experience Architecture

## J. Execution Plan
Optimized phases and dependency graph.

## K. Parallel Workstreams

## L. Definition of Done

## M. Founder Decisions Required
Only decisions that cannot be inferred from existing approved documentation.

Then create the five canonical planning documents.

Stop before large-scale implementation and wait for:

**EXECUTE THE BUILD**

---

## 21. Execution command

When the founder sends:

**EXECUTE THE BUILD**

Use `docs/L3ARN_COMPLETE_BUILD_PLAN.md` as the source of truth.

Begin with highest-dependency foundation work.

Parallelize independent workstreams safely.

Use bounded branches/PRs.

Continue through the plan unless:

1. founder decision is required
2. safety/architecture conflict is discovered
3. external credentials/access block execution
4. paid purchase would be required

For those cases, stop and ask.

Otherwise continue executing.

---

## 22. Absolute prohibitions

Do not:

- turn child experience into SaaS
- solve gameplay with more cards
- solve learning with long instruction panels
- shrink the Academy to a small viewport
- add a fifth House
- allow casual House switching
- remove child final House choice
- let AI rename companions
- bypass mastery/evidence/calibration
- weaken parent authority
- weaken RLS
- use webcam/face tracking
- use always-on microphone
- remove AI validation/fallback
- trust localStorage for production identity
- overwrite parent permissions for temporary containment
- expose founder safety tables directly to parents
- let availability of asset packs dictate art direction
- recommend paid assets by default
- declare visual work done without browser QA
- estimate the build solely using conventional human-engineer timelines

---

## 23. Final standard

The product standard is not:

**“It works.”**

The standard is:

A child enters L3ARN and immediately feels like they entered somewhere.

They want to move.

They want to explore.

Their companion feels present.

The world responds to them.

Learning is embedded inside what they do.

The Academy celebrates their progress.

The parent can see meaningful learning evidence behind the experience.

The child wants to come back.

Build that product.
