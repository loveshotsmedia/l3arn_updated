# L3ARN — Sprint Map

_Extracted from L3ARN_MASTER_HANDOFF.md · Prepared June 2026_

---

## Sprint Sequence

| Sprint | Goal | Agents |
|--------|------|--------|
| **Sprint 0 — Alignment** | Create CONTEXT.md, architecture.md, ADR index, repo skeleton, contracts, shared vocabulary | A with all branches reviewing |
| **Sprint 1 — Spine** | Auth/data skeleton, learner profile, curriculum spine, Mission Compiler interfaces, world engine shell | A, B, C, D, E, F, G |
| **Sprint 2 — Hero Slice Core** | Parent setup → child entry → Sorting Ceremony → House/companion → Mission 001 → evidence → report | B, C, D, E, G, I, J, M |
| **Sprint 3 — Living/Network Layer** | Shared-room presence, hybrid chat, Moolah, companion growth, House points, world-state ledger | B, C, D, H, J |
| **Sprint 4 — Trust/GTM Assets** | Landing page, demo video script, interactive guided demo, beta application, privacy/consent copy | I, K, H, A |
| **Sprint 5 — Beta Readiness** | QA, performance, moderation tests, onboarding emails, support ops, beta scoring dashboard | All branches |

---

## Agent Roster

| Agent | Branch | Primary Outputs |
|-------|--------|----------------|
| A | Architecture Lead | CONTEXT.md, architecture.md, ADRs, repo structure, security baseline, CI/CD, data boundaries |
| B | 3D World Engine | world_engine_architecture.md, room contracts, R3F scenes, camera controls, avatar/companion controllers |
| C | Realtime / Backend | Railway WebSocket server, room state, chat relay, live events, world event cache, APIs |
| D | Supabase / Data | schema.sql, RLS policies, migrations, source-of-truth tables, audit logs |
| E | Mission Compiler / AI | mission_compiler_spec.md, prompt library, quality gates, grounding layer, output schemas |
| F | Curriculum Knowledge Base | L3ARN Mastery Map, Florida standards map, mission patterns, rubrics, AI literacy overlay |
| G | Learner Model | Onboarding diagnostics, calibration score, learner profile schema, personalization rules |
| H | Safety / Moderation | Chat rules, AI moderation, escalation, evidence privacy, model-improvement consent, COPPA/FERPA posture |
| I | Parent UX | Parent command center, controls matrix, reports, beta application, consent, billing later |
| J | Student UX / Game Loop | Sorting Ceremony, Houses, companions, Moolah, Mission 001, rewards, student session flow |
| K | GTM / Growth | Landing page, beta application, outreach, demo scripts, event playbook, co-op pipeline |
| L | Character / IP | Houses lore, AI teacher characters, companion canon, Charli/Loomi future show bridge |
| M | QA / Acceptance | Hero Slice tests, RLS tests, safety tests, mission quality tests, load/performance checks |

---

## Hero Slice Specification

The Hero Slice is the first end-to-end product path. It is the integration target for architecture, curriculum, game, AI, safety, and GTM.

### Hero Slice Steps

1. Parent creates account and accepts required consent/privacy flows.
2. Parent creates child profile and sets initial curriculum, AI, chat, audio, model-improvement, and delivery-mode boundaries.
3. Child enters through parent-launched or trusted avatar/PIN session.
4. Child enters Great Hall and completes avatar creation.
5. Sorting Computer ceremony gathers interests, choices, motivation signals, and early learner data.
6. Sorting Computer recommends a House; child chooses final House.
7. Child chooses a companion and Academy Display Name.
8. Mission Compiler generates Mission 001: Repair the Sorting Computer + Calibrate the Learner Core.
9. Child completes mission in 3D, simplified, or text/audio/offline mode depending on settings and choice.
10. System captures structured evidence events and approved highlights.
11. Reward engine awards effort XP/Moolah and mastery-gated companion/House progress.
12. Parent receives Unified First Learning Map with academic proof, learner calibration, game progress, evidence highlights, and next path.

---

## Mission 001: Repair the Sorting Computer + Calibrate the Learner Core

| Dimension | Specification |
|-----------|---------------|
| Narrative | The Sorting Computer glitches after the student ceremony. The child helps repair it with their companion while learning that AI is powerful but must be checked. |
| Location | Great Hall Computer Core / AI Lab |
| Academic targets | AI literacy, logic, sequencing, reading/listening comprehension, evidence-based reasoning, pattern recognition |
| Hidden personalization targets | Reading mode preference, cognitive load tolerance, attention/persistence, help-seeking style, AI readiness, delivery-mode fit |
| Evidence | Decision logs, completed sequence, AI-mistake check, explanation/reflection, optional audio response, structured replay/screenshot |
| Rewards | Starter Moolah, first AI literacy badge, companion bond increase, House contribution, first world impact |
| Parent output | Unified First Learning Map and Learner Calibration Score |

---

## Hero Slice Build Acceptance Tests

- [ ] Parent can create account and child profile
- [ ] Parent can set consent, AI, audio, chat, model improvement, and delivery-mode controls
- [ ] Child can enter through parent-launched or trusted avatar/PIN session
- [ ] Child can enter true 3D Great Hall with Sims-style camera and click/tap movement
- [ ] Sorting Computer ceremony runs and writes learner-profile calibration events
- [ ] Child can choose House, companion, and Academy Display Name
- [ ] Mission Compiler generates Mission 001 with parent plan and student delivery modes
- [ ] Child can complete Mission 001 in at least 3D and simplified mode
- [ ] System stores structured evidence events and generates at least one parent-visible highlight
- [ ] Moolah/XP/companion/House rewards update through ledger rules
- [ ] World-state event writes to Supabase and broadcasts through Railway
- [ ] Parent receives Unified First Learning Map
- [ ] Hybrid chat rules enforce no DMs, no links, no external contact, parent-visible logs
- [ ] RLS prevents child session from accessing parent dashboard or sibling/other-child data
- [ ] Model-improvement opt-out excludes child from broader learning intelligence datasets
- [ ] No webcam, face capture, facial recognition, or always-on audio exists anywhere in the product

---

## Immediate Next Actions (Sprint 0 → Sprint 1)

1. Create repository skeleton and docs folder with CONTEXT.md, architecture.md, ADR index, and sprint map ← _This sprint_
2. Create Supabase migrations for identity, consent, child profiles, learner model, world state, mission, evidence, and rewards tables
3. Implement RLS policies before any UI is considered complete
4. Build Next.js app shell with parent dashboard route, student route, landing page route, and demo route
5. Build R3F Great Hall proof scene with camera, click-to-move, avatar placeholder, companion placeholder, and Sorting Computer object
6. Build Railway realtime service with room join/leave, presence, simple movement event, and world-state event broadcast
7. Build Mission Compiler v0 with hardcoded Mission 001 template grounded to Knowledge Base v1 spine
8. Build parent onboarding controls and consent screens
9. Build Sorting Ceremony and learner calibration event capture
10. Build Unified First Learning Map report with evidence highlights using structured events/replay placeholders
11. Build beta landing page and application form with Fit Score logic
12. Prepare Hero Slice demo script and interactive guided demo plan

---

## Wave 1 Success Scorecard (ADR-044) — Needs Source Confirmation

Wave 1 is the Founding Family Beta (100 families + 25–50 Inner Circle). The scorecard below is provisional — exact metrics and pass/fail thresholds require founding-team confirmation before being used as build targets.

| Dimension | Candidate Metric | Notes |
|-----------|-----------------|-------|
| Onboarding completion | % of enrolled families who complete parent setup + child entry | Target TBD |
| Mission 001 completion | % of enrolled children who complete Mission 001 | Target TBD |
| Hero Slice end-to-end | Pass rate on Hero Slice acceptance checklist | Must be 100% |
| Safety incidents | Count of S0/S1 incidents during Wave 1 | Target: 0 |
| Parent-visible evidence | % of Mission 001 completions generating a Unified First Learning Map | Target TBD |
| Inner Circle feedback | 2-3x/week active engagement from IC families | Per ADR-034 commitment |
| Retention signal | Families still active at 2-week mark | Target TBD |

_Requires founding-team sign-off before Sprint 5 QA planning._

---

## Wave 2 Readiness Gate (ADR-043) — Needs Source Confirmation

Wave 2 opens only after Wave 1 success is confirmed against the scorecard above. Gate conditions are provisional:

| Gate | Condition |
|------|-----------|
| Safety gate | Zero unresolved S0/S1 incidents from Wave 1 |
| Hero Slice stability | Hero Slice acceptance tests green for 2 consecutive weeks |
| Support ops | Support queue manageable without founder triage for 1 week |
| Demo assets | Interactive guided demo stable (per ADR-037 sequence) |
| Pricing readiness | Public pricing and billing infrastructure in place |
| Parent feedback | Wave 1 IC families have completed at least one feedback cycle |

_Requires founding-team sign-off before Wave 2 enrollment opens._

---

_Source: `docs/source/L3ARN_MASTER_HANDOFF.md` + agent context (ADR-042–060)_
