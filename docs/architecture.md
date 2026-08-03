# L3ARN — Architecture

_Extracted from L3ARN_MASTER_HANDOFF.md · Prepared June 2026_

---

## 1. System Overview

L3ARN is built as a **distributed but governed system**:

- The frontend app runs on **Vercel** (Next.js/React)
- The 3D Academy renders through **React Three Fiber / Three.js**
- **Railway** hosts realtime/game/backend orchestration
- **Supabase** is the protected source of truth

Every persistent child, academic, economy, chat, consent, and world-state record must be auditable and connected back to parent permissions.

---

## 2. Approved Tech Stack

| Layer | Tool / Pattern | Responsibility |
|-------|---------------|----------------|
| Frontend App Shell | Next.js / React on Vercel | Parent app, student app shell, dashboards, onboarding, consent, reports, app UI overlays |
| 3D Academy World | Three.js + React Three Fiber | True 3D Academy, avatars, companions, House halls, mission spaces, camera, lighting, scene interactions |
| Custom World Engine | L3ARN 3D World Engine | Scene orchestration, room contracts, avatar controller, companion controller, interaction zones, mission triggers |
| Realtime / Backend | Railway | WebSocket room server, live execution, presence, chat relay, world events, AI orchestration, scheduled jobs |
| Protected Data | Supabase | Auth, parent/child records, consent, learner profiles, mastery, Moolah, chat logs, world-state ledger, storage |
| Source Control | GitHub | Repo, branches, PRs, ADRs, deterministic agent workflows, CI/CD |
| Local AI/3D Lab | RTX 5090 | Local model experiments, asset generation/prototyping, synthetic data, future private-model exploration |

---

## 3. Runtime Components

| Component | Runs On | Description |
|-----------|---------|-------------|
| Parent Command Center | Vercel / React | Parent onboarding, child profiles, curriculum controls, reports, consent, privacy, billing later |
| Student App Shell | Vercel / React | Student dashboard shell, session entry, mission launcher, overlays |
| 3D Academy Client | React Three Fiber / Three.js | Full 3D Academy, avatars, rooms, companions, cameras, interactions |
| L3ARN 3D World Engine | Frontend + shared contracts | Scene manager, room loader, avatar/companion controllers, interaction zones, mission triggers |
| Realtime Room Server | Railway | Shared-room presence, movement state, room membership, live events |
| Chat + Moderation Relay | Railway | Hybrid chat, pre/post moderation, logs, parent visibility records |
| Mission Compiler API | Railway | AI generation, grounding, validation, parent plan/student output generation |
| Living Academy Engine | Railway + Supabase | Mission impact, House influence, Companion Grove evolution, Moolah Market, persistent world changes |
| Supabase Source of Truth | Supabase | Auth, RLS, child profiles, consent, learner data, mastery, Moolah, logs, storage |
| Learning Intelligence Layer | Railway / Supabase / Local Lab | De-identified learning signals, analytics, future model training datasets |

---

## 4. Repository Structure

```
/apps/web            — Next.js app: parent dashboard, student app, 3D client shell, landing page
/apps/realtime       — Railway WebSocket/game server: rooms, presence, chat relay, live events
/apps/api            — Backend API: mission compiler, reports, parent controls, integrations
/packages/world-engine   — R3F/Three.js scene contracts, avatar controller, room state adapter, interaction system
/packages/shared     — Shared types, schemas, zod validators, event definitions
/packages/ai         — AI orchestration, prompt templates, mission quality gates, moderation adapters
/packages/curriculum — Mastery map, standards mappings, mission patterns, evidence rubrics
/supabase            — Migrations, RLS policies, seed data, edge functions if used
/docs                — CONTEXT.md, architecture.md, ADRs, specs, sprint maps
/tests               — Integration, safety, RLS, mission compiler, realtime tests
```

---

## 5. World State Architecture

**Approved pattern: Hybrid event-sourced model**
- Railway executes and broadcasts world events in realtime
- Supabase is the authoritative ledger and snapshot store

**Master rule for world state writes:**
Every persistent world change must be:
- System-approved
- Reversible
- Logged
- Parent-visible when child-specific
- Connected to mastery, effort, House contribution, companion growth, or scheduled Academy events

---

## 6. Mission Compiler Architecture

The Mission Compiler is the heart of L3ARN. It turns parent intent, child personalization, and mastery/standards alignment into a playable, explainable, evidence-producing learning mission.

### Three-Part Constraint

Every mission must satisfy all three:

1. **Parent intent** — what the parent wants taught, emphasized, blocked, or modified
2. **Child personalization** — how this child can best access the learning right now
3. **Mastery/standards alignment** — what skill, evidence, and standard/mastery objective the mission must satisfy

### Conflict Resolution Order

1. Safety/legal boundaries always win
2. Parent-set boundaries come next
3. Required mastery/standards cannot be discarded — they are reformatted
4. Child personalization decides delivery format and scaffolding
5. Child preference/theme decorates the mission

### Mission Output Schema

| Output | Purpose |
|--------|---------|
| `parent_plan` | Objective, standards/mastery alignment, materials, steps, safety, evidence, mastery threshold, why chosen |
| `student_3d_mission` | Story hook, world location, companion dialogue, 3D objects, tasks, rewards, evidence capture |
| `student_interactive_lite` | Cards, illustrations, audio, simplified interactions, lower-stimulation mode |
| `student_text_audio_offline` | Plain steps, read-aloud, printable/offline task, artifact upload later |
| `evidence_plan` | What gets captured, why, retention, parent visibility, portfolio inclusion |
| `reward_plan` | Effort rewards, mastery rewards, companion growth, House contribution |

---

## 7. 3D Academy World

### Camera Model
- Main Academy: Sims-style angled camera with click/tap movement
- Special missions: first/third-person available

### Full Core Academy Map

| Room | Core Purpose | Living-System Hooks |
|------|-------------|---------------------|
| Great Hall | Arrival, announcements, Sorting Computer, major Academy rituals | House banners, ceremonies, weekly winner displays, seasonal events |
| Valkryn Hall | Sports, movement, courage, discipline. Mascot: Storm Griffin | Storm energy, wellness challenges, House trophies |
| Lyrion Hall | Music, arts, storytelling, expression. Mascot: Songweaver Serpent | Sound/light installations, creative showcases |
| Novari Hall | Science, discovery, nature, transformation. Mascot: Ember Phoenix | Ecosystem growth, discovery exhibits, phoenix effects |
| Cytrex Hall | Technology, AI, coding, systems. Mascot: Circuit Wyvern | Machine repairs, AI lab unlocks, signal towers |
| Mission Commons | Daily missions, recommended paths, team missions, mastery checkpoints | Personalized mission board, challenge drops, House quests |
| Companion Grove | Companion selection/evolution/reflection | Grove blooms, companion milestones, rare forms |
| Moolah Market | Rewards, cosmetics, companion accessories, House items | Rotating inventory, seasonal items, mastery-gated goods |
| AI Lab | Prompting, AI safety, coding, responsible AI use | Repair states, machine activation, AI challenge stations |
| Outdoor Grounds | Wellness, movement, nature, outside-learning bridge | Seasonal changes, gardens, obstacle courses |
| Event Arena | House competitions, live events, showcases | Event themes, leaderboards, trophies, countdowns |
| Parent Portal / Report Room | Student-safe progress/portfolio view | Mastery badge walls, evidence highlights, show-parent moments |

### Living Academy Systems

- **House Influence** — Academy spaces reflect House performance and collective points
- **Companion Grove Evolution** — companion milestones visibly affect the Grove
- **Moolah Market Economy** — rotating inventory and mastery-gated rewards reinforce return habits
- **Mission Impact** — learning visibly repairs, grows, unlocks, decorates, powers, or transforms approved parts of the world

---

## 8. Data Model

| Domain | Key Tables / Objects |
|--------|---------------------|
| Identity / Auth | `parent_accounts`, `households`, `child_profiles`, `academy_identities`, `child_permissions`, `trusted_devices`, `child_sessions`, `parent_consents` |
| Learner Model | `learner_profiles`, `learner_profile_fields`, `calibration_events`, `personalization_confidence`, `support_preferences` |
| Curriculum Spine | `mastery_domains`, `mastery_skills`, `skill_prerequisites`, `standards`, `standard_skill_mappings`, `mission_patterns`, `rubrics` |
| Mission System | `missions`, `mission_versions`, `mission_outputs`, `mission_steps`, `mission_attempts`, `evidence_requirements`, `mastery_checks` |
| Evidence / Reports | `learning_evidence_events`, `mission_replay_events`, `artifacts`, `parent_reports`, `portfolio_items`, `mastery_records` |
| Rewards / Economy | `moolah_wallets`, `moolah_ledger`, `xp_events`, `companion_growth_events`, `badges`, `house_points` |
| World State | `world_state_events`, `room_state_snapshots`, `academy_unlocks`, `house_world_modifiers`, `npc_schedules`, `seasonal_event_configs` |
| Network / Safety | `room_sessions`, `presence_events`, `chat_messages`, `moderation_events`, `escalation_records`, `audit_logs` |
| Learning Intelligence | `deidentified_events`, `feature_records`, `dataset_eligibility`, `model_improvement_consent`, `training_dataset_versions` |

---

## 9. Learner Calibration Model

L3ARN does not claim to fully know a child on day one. Calibration improves progressively:

| Stage | Expected Calibration | Signals Added |
|-------|---------------------|---------------|
| Parent onboarding | 20-35% | Age, grade, state, goals, boundaries, known concerns, screen/audio/social settings |
| Sorting Ceremony | 40-55% | House choice, interests, companion choice, motivation signals, choice behavior |
| Mission 001 | 60-75% | Reading/listening behavior, cognitive load, AI readiness, persistence, delivery mode, mastery evidence |
| First 7-14 days | 80-90% | Progression, retention, frustration/help signals, parent edits, companion usage, mission mode performance |

### Key Learner Profile Fields

- **Academic:** grade, reading estimate, comprehension, math baseline, AI readiness, writing stamina, mastery map
- **Cognitive/pacing:** instruction chunk size, time-on-task, hint needs, reread/replay behavior, frustration triggers
- **Engagement:** House, companion, interests, mission types, solo/team preference, competition response
- **Accessibility:** audio support, visual support, parent read-aloud, low-text mode, movement/outdoor preferences
- **Parent controls:** approval mode, social settings, AI settings, screen limits, blocked topics, outside-time goals
- **Confidence scoring:** every learner model claim carries confidence and data-source tags

---

## 10. AI Model Strategy

- **Phase 1 (MVP):** Cloud production models
- **Phase 2 (Future):** Proprietary L3ARN learning model via privacy-preserving intelligence layer
- Training data: de-identified structured + privacy-filtered interaction signals only
- No raw sensitive data by default
- Parents can fully opt out of model improvement/research participation

---

## 11. Monorepo and Engineering Contracts

### Monorepo-First Strategy (ADR-050)

All packages and apps live in one GitHub repository. Parallel agent branches share this trunk. No split repos.

```
/apps/web            — Next.js app: parent dashboard, student app, 3D client shell, landing page
/apps/realtime       — Railway WebSocket/game server: rooms, presence, chat relay, live events
/apps/api            — Backend API: mission compiler, reports, parent controls, integrations
/packages/world-engine   — R3F/Three.js scene contracts, avatar controller, room state adapter
/packages/shared     — Shared types, schemas, Zod validators, event definitions
/packages/ai         — AI orchestration, prompt templates, mission quality gates, moderation adapters
/packages/curriculum — Mastery map, standards mappings, mission patterns, evidence rubrics
/supabase            — Migrations, RLS policies, seed data, edge functions if used
/docs                — CONTEXT.md, architecture.md, ADRs, specs, sprint maps
/tests               — Integration, safety, RLS, mission compiler, realtime tests
```

### Agent Branch Strategy (ADR-051)

13 parallel agent branches (A–M) run concurrently. Rules:

- Every branch builds against shared contracts, not internal assumptions
- Every branch files ADRs for any decision it makes
- Every branch outputs acceptance tests with every deliverable
- No branch merges until its contracts are satisfied and tests pass

### Foundation Contracts (ADR-052) — Needs Source Confirmation

`/packages/shared` must provide foundational contracts before cross-branch work begins. Candidate contracts:

- Shared event type definitions
- Cross-domain Zod schemas (child profile, mission output, world state event)
- API surface types between Railway and Vercel
- RLS-boundary-aware data access types

_Which contracts are pre-conditions for Sprint 1 requires source confirmation._

### Zod Contract Validation (ADR-053) — Needs Source Confirmation

Zod is the candidate runtime validation layer for shared schemas, event types, and cross-agent API contracts. Zod validators live in `/packages/shared` and are imported by all branches. _Confirmation required before this is the declared standard._

### AI Output Validation / Retry / Fallback Policy (ADR-054) — Needs Source Confirmation

The Mission Compiler and all AI-touching components must define:

- Output schema validation (what constitutes a valid mission output)
- Retry logic (how many times, with what backoff)
- Safe fallback paths (what the student sees when AI output fails)
- Parent notification rules (when does a failure surface to the parent)

_Policy details require source confirmation._

### Agent Testing Strategy (ADR-055)

Required test categories across all branches before Sprint 5 beta readiness:

| Category | Scope |
|----------|-------|
| Hero Slice | End-to-end parent setup → child entry → mission → report |
| RLS | Child session cannot read parent or sibling data; no cross-household access |
| Safety | Chat rules, private DM blocking, identity hiding |
| Mission quality | Parent plan, student output, evidence capture, mastery threshold |
| Load / performance | Room server under concurrent users; 3D scene frame rate |

### PR Merge Gate (ADR-056) — Needs Source Confirmation

Required checks before any branch PR merges to main. _Exact CI checks and required reviewer rules require source confirmation._

### Agent Conflict Resolution (ADR-057) — Needs Source Confirmation

When parallel agent branches produce conflicting schemas, contracts, or build outputs, a resolution process is needed. _Process and arbitration rules require source confirmation._

---

## 12. Database Migration Strategy

### Domain-Based Supabase Schema (ADR-058)

All tables are organized into 9 schema domains. No table lives outside its domain without a filed ADR:

| Domain | Tables (sample) |
|--------|----------------|
| Identity / Auth | `parent_accounts`, `households`, `child_profiles`, `academy_identities`, `child_permissions`, `trusted_devices`, `child_sessions`, `parent_consents` |
| Learner Model | `learner_profiles`, `learner_profile_fields`, `calibration_events`, `personalization_confidence`, `support_preferences` |
| Curriculum Spine | `mastery_domains`, `mastery_skills`, `skill_prerequisites`, `standards`, `standard_skill_mappings`, `mission_patterns`, `rubrics` |
| Mission System | `missions`, `mission_versions`, `mission_outputs`, `mission_steps`, `mission_attempts`, `evidence_requirements`, `mastery_checks` |
| Evidence / Reports | `learning_evidence_events`, `mission_replay_events`, `artifacts`, `parent_reports`, `portfolio_items`, `mastery_records` |
| Rewards / Economy | `moolah_wallets`, `moolah_ledger`, `xp_events`, `companion_growth_events`, `badges`, `house_points` |
| World State | `world_state_events`, `room_state_snapshots`, `academy_unlocks`, `house_world_modifiers`, `npc_schedules`, `seasonal_event_configs` |
| Network / Safety | `room_sessions`, `presence_events`, `chat_messages`, `moderation_events`, `escalation_records`, `audit_logs` |
| Learning Intelligence | `deidentified_events`, `feature_records`, `dataset_eligibility`, `model_improvement_consent`, `training_dataset_versions` |

### First Migrations: Identity + Curriculum (ADR-059)

Migration order is non-negotiable:

1. **Identity / Auth domain** — `parent_accounts`, `households`, `child_profiles`, `academy_identities`, `child_permissions`, `trusted_devices`, `child_sessions`, `parent_consents`
2. **Curriculum Spine domain** — `mastery_domains`, `mastery_skills`, `skill_prerequisites`, `standards`, `standard_skill_mappings`, `mission_patterns`, `rubrics`
3. **RLS policies** — must be written and verified before any UI is considered complete
4. All remaining domains follow in Sprint 1 per Agent D (Supabase/Data branch)

### Curriculum Tables Scoped Through API Only (ADR-060) — Needs Source Confirmation

Curriculum domain tables (`mastery_domains`, `mastery_skills`, `mission_patterns`, etc.) are not intended for direct client access. All reads and writes should route through the Mission Compiler API on Railway. Whether this is enforced via RLS alone, API gateway rules, or both requires source confirmation.

---

_Source: `docs/source/L3ARN_MASTER_HANDOFF.md` + agent context (ADR-042–060)_
