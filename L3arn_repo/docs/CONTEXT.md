# L3ARN — Project Context

_Extracted from L3ARN_MASTER_HANDOFF.md · Prepared June 2026_

---

## 1. What L3ARN Is

L3ARN is a **parent-controlled AI homeschool operating system** where children complete standards-aware missions inside a safe, networked, true 3D living Academy.

It combines:
- AI-powered curriculum generation
- Evidence-based mastery tracking
- Parent-controlled customization
- Houses, companions, Moolah, multiplayer learning
- A living world that visibly changes as students learn

---

## 2. Official MVP Identity

> **L3ARN MVP** is a parent-controlled AI homeschool OS where children complete standards-aware missions inside a safe networked learning world with Houses, companions, Moolah, and mastery-based progression.

---

## 3. Strategic Thesis

AI unlocks truly personalized education, but that personalization must be governed by:
- Parent intent
- Child-specific learner modeling
- Mastery and standards alignment

The 3D Academy is not decoration — it is the **delivery system** that makes rigorous learning feel like a world kids want to return to.

---

## 4. Non-Negotiables

| # | Rule |
|---|------|
| 1 | Networked student world is part of MVP — not a future feature. |
| 2 | True 3D Academy is part of MVP. |
| 3 | Parent controls and trust are foundational. |
| 4 | No webcam, no face capture, no facial recognition, no facial analysis. |
| 5 | Audio is optional, parent-controlled, push-to-talk only. |
| 6 | All child accounts are parent-owned for MVP. |
| 7 | Every instructional mission must satisfy parent intent, child personalization, AND mastery/standards alignment. |
| 8 | Game progress and academic mastery are related but not identical. |
| 9 | AI can generate across all domains, but instructional missions must be grounded in a traceable academic target/source/pattern. |
| 10 | Raw child PII and sensitive content are not training data by default. |

---

## 5. Approved Tech Stack

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

## 6. Approved Product Decisions (Summary)

| # | Decision | Direction |
|---|----------|-----------|
| 1 | MVP Identity | Parent-controlled AI Homeschool OS + standards-aware missions + safe networked learning world |
| 2 | World Scope | Interactive social Academy world with selected living-world mechanics |
| 3 | Rendering Direction | True 3D browser-based Academy |
| 4 | Tech Stack | Next.js/React, Three.js/R3F, Custom L3ARN 3D World Engine, Vercel, Railway, Supabase, GitHub, RTX 5090 |
| 5 | Camera Model | Sims-style angled camera with click/tap movement for main Academy; first/third-person for special missions |
| 6 | Multiplayer | Shared-room multiplayer |
| 7 | Student Chat | Hybrid: Quick Chat for younger students, parent-approved moderated free text for older students |
| 8 | Child Identity | Parent-approved Academy Display Name + House identifier; real full names hidden by default |
| 9 | Parent Visibility | Tiered: K-5 full visibility default; grades 6-8 summary + expand; safety overrides always available |
| 10 | Student AI Interaction | Age-tiered hybrid AI: guided for young students, controlled companion chat for older students |
| 11 | Academic Progress | Evidence-based mastery model |
| 12 | Rewards | Split reward economy: effort rewards + mastery-gated major progression |
| 13 | Parent Approval | High-Control, Balanced, or Autopilot curriculum approval modes |
| 14 | Standards Model | L3ARN Mastery Map + Florida K-8 standards mapping where applicable |
| 15 | Curriculum Scope | Universal domain-agnostic Mission Compiler capable of teaching across all domains |
| 16 | Mission Constraint | Parent intent + child personalization + mastery/standards alignment |
| 17 | Conflict Resolution | Safety/legal → parent boundaries → mastery/standards → personalization → child theme/preference |
| 18 | Mission Output | Multi-modal: parent plan, 3D mission, simplified interactive mode, text/audio/offline mode |
| 19 | Delivery Mode Control | System recommends, parent governs, student chooses within boundaries |
| 20 | World Map | Full Core Academy: Great Hall, House Halls, Mission Commons, Companion Grove, Moolah Market, AI Lab, Outdoor Grounds, Event Arena, Parent Portal/Report Room |
| 21 | Academy Liveliness | Fully Living Academy with governed persistent world state |
| 22 | Living Systems | House Influence, Companion Grove Evolution, Moolah Market Economy, Mission Impact |
| 23 | World State Truth | Hybrid event-sourced: Railway executes/broadcasts; Supabase authoritative ledger/snapshots |
| 24 | Curriculum Truth | Hybrid grounding layer; every instructional mission traceable to approved target/source/pattern |
| 25 | Knowledge Base v1 | Minimal but complete spine: Mastery Map, Florida standards, mission patterns, evidence rubrics, AI overlay, parent-material rules |
| 26 | First Build Path | End-to-end Hero Slice |
| 27 | First Mission | Repair the Sorting Computer + Learner Calibration |
| 28 | Benchmarking | Architect for Florida, national, global; v1 reports only Florida + L3ARN internal mastery |
| 29 | First Proof Report | Unified First Learning Map with evidence highlights |
| 30 | Evidence Capture | Structured learning events auto-captured; parent-consented highlights; no webcam/face features |
| 31 | Audio | Parent-controlled push-to-talk only; no always-on mic, biometrics, voice ID, emotion detection |
| 32 | AI Model Strategy | Cloud production models initially + future proprietary L3ARN learning model via privacy-preserving intelligence layer |
| 33 | Model Improvement Data | De-identified structured + privacy-filtered interaction signals; no raw sensitive data by default |
| 34 | Parent Opt-Out | Parents can fully opt out of broader model improvement/research |
| 35 | Account Ownership | Parent-owned child profiles for K-8 MVP |
| 36 | Child Session Model | Parent launch + avatar/PIN trusted-device login |
| 37 | Pricing | Beta: $30/month per family. Public target: ~$129/month per family |
| 38 | Founding Pricing | Founding families get permanent discount after beta, not lifetime $30 |
| 39 | Beta Model | Founding Family Beta + Inner Circle Cohort |
| 40 | First Beta Audience | Current homeschool families, AI/STEAM-curious families, co-ops/microschool pods |
| 41 | Acquisition Strategy | Local events + online homeschool communities + direct co-op outreach first; paid ads/show funnel later |
| 42 | Demo Assets | Landing page + Hero Slice demo video + interactive guided demo; Charli/Loomi trailer later |
| 43 | Landing Promise | Parents run a personalized AI-powered homeschool while children learn through standards-aware missions inside a living 3D Academy |
| 44 | Primary CTA | Apply for Founding Family Beta |
| 45 | Beta Application | Medium 10-15 question application |
| 46 | Applicant Scoring | Founding Family Fit Score + manual review |
| 47 | Beta Feedback Commitment | Light feedback for Founding Family Beta; active 2-3x/week for Inner Circle |
| 48 | Hero Slice Demo Priority | Demo must prove parent value and student magic before paid ads or show funnel scaling |

---

## 7. Safety and Privacy Baseline

### Hard Privacy Rules
- No webcam feature
- No face capture
- No facial recognition or facial analysis
- No child video recording from device camera
- Audio is optional, parent-controlled, push-to-talk only
- No always-on microphone
- No voice biometrics, voice ID, emotion detection, or surveillance
- All K-8 child profiles are parent-owned
- Parents can fully opt out of broader model improvement/research
- Raw child PII and sensitive data are not training data by default

### Child Social Safety Rules
- No private DMs in MVP
- No images/files/links in student chat
- No phone numbers, addresses, social handles, or external contact sharing
- K-5 default to Quick Chat
- Grades 6-8 may use moderated free text only with parent approval
- All K-8 messages are logged, parent-visible, moderated, and never disappearing
- Public identity uses Academy Display Name + House identifier only

### Compliance Anchors
- **COPPA**: Applies to child-directed online services; requires strong parental consent and data-use practices
- **FERPA/SPPO**: Student privacy guidance for educational records and de-identification
- **Florida CPALMS**: Official source for Florida standards
- **Florida Statute 1002.41**: Home education statute governing annual evaluation/portfolio requirements

---

## 8. GTM + Positioning

- **Primary promise:** L3ARN helps parents run a personalized AI-powered homeschool while children learn through standards-aware missions inside a living 3D Academy.
- **Primary CTA:** Apply for Founding Family Beta
- **Beta cap (provisional):** 100 Founding Families + 25-50 Inner Circle families
- **Pricing:** $30/month beta → ~$129/month public launch (includes up to 2 children; additional child ~$20/month)
- **No superiority claims** until validated by real data; use "designed to support mastery" and "standards-aware" language

---

## 9. Beta Launch Sequencing and Wave Strategy

### Beta Capacity (ADR-042)
- **Wave 1:** 100 Founding Families + 25–50 Inner Circle families
- All Inner Circle families manually reviewed before acceptance
- Founding families receive permanent discount after beta; not lifetime $30

### Wave 1 Success Scorecard (ADR-044) — Needs Source Confirmation
_Metrics and thresholds that define Wave 1 beta success. Confirmation required before these are treated as build targets._

### Wave 2 Readiness Gate (ADR-043) — Needs Source Confirmation
_Gate criteria that must be satisfied before opening Wave 2 enrollment. Confirmation required._

---

## 10. Operations, Safety, and Engineering Contracts

### S0–S4 Severity Model (ADR-046) — Needs Source Confirmation

A four-tier incident severity model governs how the team responds to platform issues:

| Tier | Label | Description |
|------|-------|-------------|
| S0 | Critical child safety | Immediate halt; founder escalation; no auto-recovery |
| S1 | Data/privacy breach | Emergency response; notify affected parents |
| S2 | Core feature down | Rapid fix; parent-facing status update |
| S3 | Degraded experience | Fix within sprint; no notification required |
| S4 | Cosmetic / minor | Normal backlog; no escalation |

_Tier definitions and escalation triggers require source confirmation._

### Kill Switch Authority (ADR-047) — Needs Source Confirmation
_Named roles and invocation conditions for platform kill switches are provisional. Founders retain authority. Confirmation required before build._

### Founder Mission Control (ADR-048) — Needs Source Confirmation
_An operational dashboard for founder oversight of the beta: enrollment, safety flags, incident status, world-state health, and escalation queue. Confirmation required._

### Admin Access Model (ADR-049) — Needs Source Confirmation
_Admin roles, permission levels, and audit trail requirements are provisional. No admin role may bypass RLS or view raw child PII without audit logging. Confirmation required._

### Monorepo-First Repo Strategy (ADR-050)
GitHub monorepo. All packages and apps live in one repo. Parallel agent branches each work off this shared trunk.

```
/apps/web            — Next.js parent + student app
/apps/realtime       — Railway WebSocket / game server
/apps/api            — Mission Compiler, reports, parent controls
/packages/world-engine   — R3F/Three.js scene contracts
/packages/shared     — Types, schemas, Zod validators, event definitions
/packages/ai         — AI orchestration, prompt templates, quality gates
/packages/curriculum — Mastery map, standards, mission patterns, rubrics
/supabase            — Migrations, RLS policies, seed data
/docs                — CONTEXT.md, architecture.md, ADRs, specs, sprint maps
/tests               — Integration, safety, RLS, mission compiler, realtime tests
```

### Agent Branch Strategy (ADR-051)
13 parallel agent branches (A–M). Each branch:
- Builds against shared contracts, not assumptions
- Files ADRs for any decision it makes
- Outputs acceptance tests with every deliverable
- Does not merge until contracts are satisfied

### Foundation Contracts (ADR-052) — Needs Source Confirmation
Shared type/event contracts in `/packages/shared` must be established before any branch builds against cross-branch interfaces. Confirmation required on which contracts are pre-conditions for Sprint 1.

### Zod Contract Validation (ADR-053) — Needs Source Confirmation
Zod is the candidate validation layer for shared schemas, event types, and cross-agent contracts. Confirmation required before it is declared the approved standard.

### AI Output Validation / Retry / Fallback Policy (ADR-054) — Needs Source Confirmation
Policy covering how the Mission Compiler and other AI-touching components handle output failures, retry logic, and safe fallback paths. Confirmation required.

### Agent Testing Strategy (ADR-055)
Every agent branch must produce acceptance tests. Required test categories before Sprint 5:
- Hero Slice end-to-end tests
- RLS policy tests (child cannot access parent or sibling data)
- Safety tests (chat, privacy, identity)
- Mission quality gate tests
- Load and performance checks

### PR Merge Gate (ADR-056) — Needs Source Confirmation
Required checks before any branch PR merges to main. Confirmation required on exact CI checks and required reviewer rules.

### Agent Conflict Resolution (ADR-057) — Needs Source Confirmation
Process for resolving schema, contract, or build conflicts between parallel agent branches. Confirmation required.

---

## 11. Open Questions

_See `docs/ADR/ADR-000-index.md` "Needs Source Confirmation" section for the 13 decisions (ADR-043 through ADR-060) that require founding-team sign-off before Sprint 2 builds against them._

---

_Source: `docs/source/L3ARN_MASTER_HANDOFF.md` + agent context (decisions ADR-042–060)_
