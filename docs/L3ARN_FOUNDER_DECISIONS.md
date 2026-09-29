# L3ARN FOUNDER DECISIONS — COMPLETE BUILD

**Purpose:** Resolve or explicitly track decisions that block implementation.  
**Authority:** Founder decisions here override older conflicting planning prose.

## Approved

### FD-01 — Default child camera
**Decision:** First-person is the desired normal child experience.

Required safety/comfort layer:
- comfort-click remains available
- `prefers-reduced-motion` defaults to comfort-click
- third-person remains available
- sensitivity control
- invert-Y
- head-bob off by default

Implementation must create/supersede the relevant ADR before merge.

### FD-02 — Final visual target
**Decision:** Final target is **premium stylized-realism real-time 3D**.

An interim low-complexity / low-poly / zero-texture phase is acceptable to establish:
- world composition
- game feel
- performance
- interaction
- lighting
- atmosphere

It is not the permanent fidelity ceiling.

### FD-03 — Asset generation policy
**Decision:** AI-first asset production.

Priority:
1. ChatGPT/OpenAI image-generation capability when available for concepts, turnarounds, UI art, icons, decals, textures/reference art
2. procedural generation / Blender scripting / Three.js
3. bespoke 3D conversion/creation
4. properly licensed free/CC0 assets
5. paid assets only with explicit founder approval

## Open — agent must not guess

### FD-04 — PR #38 / adaptive lesson runtime
Inspect latest `main` first. If the relevant changes are still absent, do not blindly merge 37 stale commits. Prefer the smallest safe integration needed by the current task. Record the final disposition before Mission 001 controller/runtime work.

### FD-05 — v1 companion roster
Current known names include Spark and Luna. The final v1 roster/count is not approved here. Do not invent canonical companions or remove existing selected companion identity.

### FD-06 — companion voice/TTS provider
Companion output voice is desired as a product capability, but no paid provider is approved in this document. Build text/transcript architecture first. Any paid provider requires founder approval.

### FD-07 — tablet/phone beta support
Do not assume portrait phone parity with desktop. Implement desktop/laptop first with deliberate accessibility fallbacks. Present a device-support recommendation before committing major touch-specific scope.

### FD-08 — complete-build boundary after first beta gate
The current 1-to-63 plan completes the beta-ready core and first-family readiness gate. Shared-room multiplayer, broad mission catalog expansion, and later living-world systems remain follow-on tracks unless the founder explicitly pulls them into this build.

### FD-09 — legacy full `/api/missions` compile route
Inspect actual callers and production behavior. If unused, propose deletion or founder-gating. Do not preserve an expensive stale route solely because it exists.

## Rule
If a new founder decision emerges, add it here before implementation rather than burying it in chat or a PR comment.
