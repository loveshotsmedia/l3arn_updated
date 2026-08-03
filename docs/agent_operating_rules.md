# L3ARN — Agent Operating Rules

_Extracted from L3ARN_MASTER_HANDOFF.md · Prepared June 2026_

---

## Core Operating Principle

Execution is autonomous, but **every branch must build against contracts, not vibes**.

Architecture, privacy, child-safety, and mission-quality contracts defined in this document are not negotiable. Every agent must:
- Update docs
- Surface decisions as ADRs
- Output acceptance tests

---

## Every Agent Must Answer These Questions Before Building

| # | Question |
|---|----------|
| 1 | What data does this branch create, read, update, or delete? |
| 2 | Who owns the data? |
| 3 | What trust boundary does this branch touch? |
| 4 | What can go wrong for a child, parent, or educator? |
| 5 | What should never happen? |
| 6 | What is parent-visible? |
| 7 | What requires audit logging? |
| 8 | What events does this branch emit? |
| 9 | What tests prove the branch is safe and correct? |
| 10 | Which ADRs/docs does the branch update? |

---

## Non-Negotiable Execution Boundaries

These are hard stops. No agent may proceed past them without explicit override documentation:

### Privacy Absolutes
- No webcam feature — anywhere
- No face capture — anywhere
- No facial recognition or facial analysis — anywhere
- No child video recording from device camera
- Audio is optional, parent-controlled, push-to-talk only
- No always-on microphone
- No voice biometrics, voice ID, emotion detection, or surveillance
- All K-8 child profiles are parent-owned
- Parents can fully opt out of broader model improvement/research
- Raw child PII and sensitive data are not training data by default

### Child Social Safety Absolutes
- No private DMs in MVP
- No images/files/links in student chat
- No phone numbers, addresses, social handles, or external contact sharing
- K-5 default to Quick Chat
- Grades 6-8 may use moderated free text only with parent approval
- All K-8 messages are logged, parent-visible, moderated, and never disappearing
- Public identity uses Academy Display Name + House identifier only

### Mission Quality Absolutes
- Every instructional mission must satisfy: parent intent + child personalization + mastery/standards alignment
- No instructional mission without a traceable academic target/source/pattern
- Game progress and academic mastery are related but not identical

### World State Absolutes
- Every persistent world change must be: system-approved, reversible, logged
- Every persistent world change must be parent-visible when child-specific
- Every persistent world change must connect to: mastery, effort, House contribution, companion growth, or scheduled Academy events

---

## Conflict Resolution Protocol

When decisions conflict, apply this order:

1. **Safety/legal boundaries** — always win
2. **Parent-set boundaries** — come next
3. **Required mastery/standards** — cannot be discarded; they are reformatted
4. **Child personalization** — decides delivery format and scaffolding
5. **Child preference/theme** — decorates the mission

---

## ADR Protocol

Every architecture decision that deviates from, extends, or clarifies the approved design must:
1. Be written as an ADR in `/docs/ADR/`
2. Be indexed in `/docs/ADR/ADR-000-index.md`
3. Follow the status lifecycle: `Proposed → Accepted → Superseded`
4. Reference the original decision from `L3ARN_MASTER_HANDOFF.md` where applicable
5. Note what, why, and what was rejected

---

## Provisional Decisions (Treat as Accepted, Override Requires Explicit Review)

These decisions were resolved autonomously per the handoff and require documented review to change:

| Area | Provisional Decision |
|------|---------------------|
| Beta applicant scoring | Fit Score + manual review. Score: homeschool/co-op relevance, AI/STEAM curiosity, age fit, pain urgency, feedback commitment, 3D excitement, Inner Circle potential |
| First beta cap | 100 Founding Families + 25-50 Inner Circle families |
| Founder review gate | All Inner Circle families manually reviewed before acceptance |
| Demo data | Interactive demo uses fake/sample child data only |
| Initial geography | Florida-first standards/reporting; national beta allowed if positioned as L3ARN Mastery Map + Florida reference only |
| Minimum launch proof | Launch waitlist only after landing page + 2-4 minute Hero Slice demo are present. Paid acquisition only after interactive demo is stable |
| Public claims | No superiority claims until validated by real data. Use "designed to support mastery" and "standards-aware" language |
| Support channel | Founder/AI-assisted support via email/chat. No phone support until cohort size justifies it |
| Incident escalation | Founder review for serious safety, privacy, model, or child-interaction flags |

---

## Required ADR Set

The following ADRs must be created before Sprint 2 begins. See `/docs/ADR/ADR-000-index.md` for status tracking.

| ADR | Title |
|-----|-------|
| ADR-001 | stack |
| ADR-002 | mvp-identity |
| ADR-003 | world-rendering |
| ADR-004 | camera-model |
| ADR-005 | multiplayer-model |
| ADR-006 | student-chat-model |
| ADR-007 | child-identity-model |
| ADR-008 | parent-visibility-model |
| ADR-009 | ai-interaction-model |
| ADR-010 | academic-progress-model |
| ADR-011 | reward-economy |
| ADR-012 | parent-curriculum-approval |
| ADR-013 | standards-model |
| ADR-014 | mission-compiler-constraint |
| ADR-015 | conflict-resolution |
| ADR-016 | mission-output-model |
| ADR-017 | delivery-mode-control |
| ADR-018 | core-academy-map |
| ADR-019 | living-academy-model |
| ADR-020 | world-state-source-of-truth |
| ADR-021 | curriculum-grounding-layer |
| ADR-022 | knowledge-base-v1 |
| ADR-023 | first-build-path |
| ADR-024 | first-hero-mission |
| ADR-025 | benchmarking-model |
| ADR-026 | evidence-capture |
| ADR-027 | audio-response-model |
| ADR-028 | ai-model-strategy |
| ADR-029 | model-improvement-opt-out |
| ADR-030 | account-ownership-model |
| ADR-031 | child-session-model |
| ADR-032 | pricing-model |
| ADR-033 | founding-pricing |
| ADR-034 | beta-cohort-model |
| ADR-035 | beta-audience |
| ADR-036 | acquisition-strategy |
| ADR-037 | demo-assets |
| ADR-038 | landing-positioning |
| ADR-039 | primary-cta |
| ADR-040 | beta-application |
| ADR-041 | beta-scoring |

---

## Safety Severity Model (ADR-046) — Needs Source Confirmation

When incidents occur, agents and founders should triage using this provisional severity model. Tier definitions and escalation triggers require source confirmation before Sprint 2.

| Tier | Label | Response |
|------|-------|----------|
| S0 | Critical child safety | Immediate platform halt; founder escalation; no auto-recovery; parent notification |
| S1 | Data / privacy breach | Emergency response; affected parents notified; postmortem required |
| S2 | Core feature down | Rapid fix target; parent-facing status update |
| S3 | Degraded experience | Fix within sprint; no customer notification required |
| S4 | Cosmetic / minor | Normal backlog; no escalation |

_Do not build automated escalation around S0–S4 until tiers are confirmed._

---

## Kill Switch Authority (ADR-047) — Needs Source Confirmation

A kill switch is the ability to halt a subsystem (chat relay, AI generation, world state writes, etc.) without a full deployment. Provisional rules:

- Only founders may invoke a kill switch
- Kill switches must be reversible and logged
- A kill switch invocation triggers at minimum an S1 review
- No automated system may invoke a kill switch without founder approval

_Named roles, invocation conditions, and rollback scope require source confirmation._

---

## Founder Mission Control (ADR-048) — Needs Source Confirmation

During beta, founders need operational visibility across enrollment, safety flags, incident status, world-state health, and the escalation queue. A Founder Mission Control dashboard is planned. Until it is built, founders should maintain manual visibility via Supabase audit logs and Railway logs.

_Dashboard design, access model, and alerting require source confirmation._

---

## Admin Access Model (ADR-049) — Needs Source Confirmation

Provisional admin access rules (require confirmation):

- No admin role may bypass RLS
- No admin role may view raw child PII without audit logging
- Admin access must be traceable to a named person and reason
- Admin sessions must time out
- Admin actions on child or parent data require a logged justification

_Full role matrix, permission levels, and audit trail requirements require source confirmation._

---

## Engineering Contract Rules

### Foundation Contracts (ADR-052) — Needs Source Confirmation

Before any agent branch builds against cross-branch interfaces, `/packages/shared` must export the relevant foundation contracts. An agent branch may not consume an interface that does not yet exist in `/packages/shared`. If a needed contract is missing, the branch must file an ADR and wait for Agent A or the shared-contracts branch to publish it.

### Zod Validation (ADR-053) — Needs Source Confirmation

Zod is the provisional standard for runtime validation of shared schemas and event types. Until confirmed, branches may define internal validators but must not ship cross-branch validators in non-Zod formats that would need migration.

### AI Output Validation (ADR-054) — Needs Source Confirmation

Any branch that consumes AI output must implement:
1. Schema validation on the output before it reaches a child session
2. A defined retry path
3. A safe fallback (what the student or parent sees on failure)

Do not ship AI-consuming code without all three.

### PR Merge Gate (ADR-056) — Needs Source Confirmation

Until the formal gate is confirmed, branches should treat the following as the minimum merge bar:
- No merge without passing acceptance tests for the branch's own domain
- No merge if RLS tests fail
- No merge if safety absolutes are violated

### Agent Conflict Resolution (ADR-057) — Needs Source Confirmation

When two branches produce conflicting schemas, contracts, or build outputs:
1. Neither branch merges until the conflict is resolved
2. The conflict is filed as a blocking item in the ADR index
3. Agent A (Architecture Lead) arbitrates; a new or amended ADR is filed
4. Both branches re-verify after resolution

_Formal arbitration process requires source confirmation._

---

## Database Migration Rules

### Migration Sequencing (ADR-059)

Migrations must run in this order. No UI code is considered complete until the corresponding RLS policies exist and pass tests:

1. Identity / Auth domain migrations
2. Curriculum Spine domain migrations
3. RLS policies for both domains
4. Remaining domains (per Agent D sprint schedule)

### Curriculum Table Access (ADR-060) — Needs Source Confirmation

Curriculum domain tables are not intended for direct client reads. Until source confirmation defines whether this is an RLS rule, an API gateway rule, or both — agents building UI should treat curriculum data as API-only and route all reads through the Mission Compiler API.

---

## What Agents Must Not Do

- Do not redesign L3ARN without filing an ADR and getting explicit review
- Do not invent new product decisions outside the approved handoff
- Do not build features that violate the privacy or child-safety absolutes above
- Do not store raw child PII in any model training pipeline
- Do not build any webcam, microphone (non-PTT), face, or biometric feature
- Do not allow private messaging between students in MVP
- Do not allow children's real names to be visible in shared Academy spaces
- Do not build any world state persistence without audit logging
- Do not build RLS policies after UI — RLS must exist before UI is considered complete
- Do not launch paid acquisition before the interactive demo is stable
- Do not build automated S0–S4 escalation until severity tiers are source-confirmed
- Do not bypass RLS in any admin role
- Do not ship AI-consuming code without output validation, retry logic, and a safe fallback
- Do not merge a branch PR if it conflicts with another branch's contracts until ADR-057 resolution is complete
- Do not expose curriculum tables directly to clients until ADR-060 is source-confirmed

---

_Source: `docs/source/L3ARN_MASTER_HANDOFF.md` + agent context (ADR-042–060)_
