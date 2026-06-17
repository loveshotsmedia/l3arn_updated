# L3ARN — ADR Index

_Architecture Decision Records for the L3ARN platform_

All decisions here are sourced from `L3ARN_MASTER_HANDOFF.md` unless noted otherwise.

Status lifecycle: `Proposed` → `Accepted` → `Superseded`

---

## How to Read This Index

- **Accepted** — decision is final and binding; override requires documented review
- **Provisional** — resolved autonomously per handoff; can be changed with explicit team review
- **Proposed** — filed but not yet reviewed; do not build against until Accepted

---

## ADR List

| ADR | Title | Status | Notes |
|-----|-------|--------|-------|
| [ADR-001](ADR-001-stack.md) | Tech Stack | Accepted | Next.js/React/Vercel, Three.js/R3F, L3ARN World Engine, Railway, Supabase, GitHub, RTX 5090 |
| [ADR-002](ADR-002-mvp-identity.md) | MVP Identity | Accepted | Parent-controlled AI Homeschool OS + standards-aware missions + safe networked learning world |
| [ADR-003](ADR-003-world-rendering.md) | World Rendering | Accepted | True 3D browser-based Academy |
| [ADR-004](ADR-004-camera-model.md) | Camera Model | Accepted | Sims-style angled camera + click/tap; first/third-person for special missions |
| [ADR-005](ADR-005-multiplayer-model.md) | Multiplayer Model | Accepted | Shared-room multiplayer |
| [ADR-006](ADR-006-student-chat-model.md) | Student Chat Model | Accepted | Hybrid: Quick Chat (K-5 default) + moderated free text (6-8, parent approval) |
| [ADR-007](ADR-007-child-identity-model.md) | Child Identity Model | Accepted | Academy Display Name + House identifier; real names hidden by default |
| [ADR-008](ADR-008-parent-visibility-model.md) | Parent Visibility Model | Accepted | Tiered: K-5 full; 6-8 summary + expand; safety overrides always |
| [ADR-009](ADR-009-ai-interaction-model.md) | AI Interaction Model | Accepted | Age-tiered hybrid AI: guided (young), controlled companion chat (older) |
| [ADR-010](ADR-010-academic-progress-model.md) | Academic Progress Model | Accepted | Evidence-based mastery model |
| [ADR-011](ADR-011-reward-economy.md) | Reward Economy | Accepted | Split: effort rewards + mastery-gated major progression |
| [ADR-012](ADR-012-parent-curriculum-approval.md) | Parent Curriculum Approval | Accepted | High-Control, Balanced, or Autopilot modes |
| [ADR-013](ADR-013-standards-model.md) | Standards Model | Accepted | L3ARN Mastery Map + Florida K-8 standards mapping |
| [ADR-014](ADR-014-mission-compiler-constraint.md) | Mission Compiler Constraint | Accepted | Parent intent + child personalization + mastery/standards alignment (all three required) |
| [ADR-015](ADR-015-conflict-resolution.md) | Conflict Resolution | Accepted | Safety/legal → parent → mastery/standards → personalization → theme |
| [ADR-016](ADR-016-mission-output-model.md) | Mission Output Model | Accepted | Multi-modal: parent_plan, student_3d_mission, student_interactive_lite, student_text_audio_offline, evidence_plan, reward_plan |
| [ADR-017](ADR-017-delivery-mode-control.md) | Delivery Mode Control | Accepted | System recommends, parent governs, student chooses within boundaries |
| [ADR-018](ADR-018-core-academy-map.md) | Core Academy Map | Accepted | Great Hall, 4 House Halls, Mission Commons, Companion Grove, Moolah Market, AI Lab, Outdoor Grounds, Event Arena, Parent Portal/Report Room |
| [ADR-019](ADR-019-living-academy-model.md) | Living Academy Model | Accepted | Fully Living Academy with governed persistent world state |
| [ADR-020](ADR-020-world-state-source-of-truth.md) | World State Source of Truth | Accepted | Hybrid event-sourced: Railway executes/broadcasts; Supabase authoritative ledger |
| [ADR-021](ADR-021-curriculum-grounding-layer.md) | Curriculum Grounding Layer | Accepted | Hybrid; every instructional mission traceable to approved target/source/pattern |
| [ADR-022](ADR-022-knowledge-base-v1.md) | Knowledge Base v1 | Accepted | Mastery Map, Florida standards, mission patterns, evidence rubrics, AI overlay, parent-material rules |
| [ADR-023](ADR-023-first-build-path.md) | First Build Path | Accepted | End-to-end Hero Slice |
| [ADR-024](ADR-024-first-hero-mission.md) | First Hero Mission | Accepted | Repair the Sorting Computer + Learner Calibration |
| [ADR-025](ADR-025-benchmarking-model.md) | Benchmarking Model | Accepted | Architect for Florida/national/global; v1 reports only Florida + L3ARN internal mastery |
| [ADR-026](ADR-026-evidence-capture.md) | Evidence Capture | Accepted | Structured learning events auto-captured; parent-consented highlights; no webcam/face |
| [ADR-027](ADR-027-audio-response-model.md) | Audio Response Model | Accepted | Parent-controlled push-to-talk only; no always-on mic, biometrics, voice ID, emotion detection |
| [ADR-028](ADR-028-ai-model-strategy.md) | AI Model Strategy | Accepted | Cloud production models initially; future proprietary L3ARN model via privacy-preserving intelligence layer |
| [ADR-029](ADR-029-model-improvement-opt-out.md) | Model Improvement Opt-Out | Accepted | Parents can fully opt out; raw child PII never used for training by default |
| [ADR-030](ADR-030-account-ownership-model.md) | Account Ownership Model | Accepted | Parent-owned child profiles for K-8 MVP |
| [ADR-031](ADR-031-child-session-model.md) | Child Session Model | Accepted | Parent launch + avatar/PIN trusted-device login |
| [ADR-032](ADR-032-pricing-model.md) | Pricing Model | Accepted | Beta $30/month; public target ~$129/month per family (up to 2 children); +$20/month per additional child |
| [ADR-033](ADR-033-founding-pricing.md) | Founding Pricing | Accepted | Founding families get permanent discount after beta; not lifetime $30 |
| [ADR-034](ADR-034-beta-cohort-model.md) | Beta Cohort Model | Accepted | Founding Family Beta + Inner Circle Cohort |
| [ADR-035](ADR-035-beta-audience.md) | Beta Audience | Accepted | Current homeschool families, AI/STEAM-curious families, co-ops/microschool pods |
| [ADR-036](ADR-036-acquisition-strategy.md) | Acquisition Strategy | Accepted | Local events + online homeschool communities + direct co-op outreach first; paid ads/show funnel later |
| [ADR-037](ADR-037-demo-assets.md) | Demo Assets | Accepted | Landing page + Hero Slice demo video + interactive guided demo (Charli/Loomi trailer later) |
| [ADR-038](ADR-038-landing-positioning.md) | Landing Positioning | Accepted | "Parents run a personalized AI-powered homeschool while children learn through standards-aware missions inside a living 3D Academy" |
| [ADR-039](ADR-039-primary-cta.md) | Primary CTA | Accepted | Apply for Founding Family Beta |
| [ADR-040](ADR-040-beta-application.md) | Beta Application | Accepted | Medium 10-15 question application |
| [ADR-041](ADR-041-beta-scoring.md) | Beta Scoring | Provisional | Founding Family Fit Score (100 pts): homeschool/co-op relevance (0-20), AI/STEAM curiosity (0-15), child age fit (0-15), pain urgency (0-15), feedback commitment (0-20), 3D excitement (0-10), Inner Circle potential (0-5) |
| [ADR-042](ADR-042-beta-capacity.md) | Beta Capacity | Provisional | 100 Founding Families + 25–50 Inner Circle; all IC families manually reviewed before acceptance |
| [ADR-043](ADR-043-wave2-readiness-gate.md) | Wave 2 Readiness Gate | Provisional — Needs Source Confirmation | Gate criteria before opening Wave 2 enrollment after Wave 1 success |
| [ADR-044](ADR-044-wave1-success-scorecard.md) | Wave 1 Success Scorecard | Provisional — Needs Source Confirmation | Metrics and thresholds defining Wave 1 beta success |
| [ADR-045](ADR-045-critical-safety-blockers.md) | Critical Safety Blockers | Provisional — Needs Source Confirmation | Pre-launch safety requirements that block any release |
| [ADR-046](ADR-046-severity-model.md) | S0–S4 Severity Model | Provisional — Needs Source Confirmation | Incident severity tiers: S0 (critical child safety) through S4 (cosmetic) |
| [ADR-047](ADR-047-kill-switch-authority.md) | Kill Switch Authority | Provisional — Needs Source Confirmation | Who can invoke kill switches and under what conditions |
| [ADR-048](ADR-048-founder-mission-control.md) | Founder Mission Control | Provisional — Needs Source Confirmation | Founder operational dashboard and process for beta oversight |
| [ADR-049](ADR-049-admin-access-model.md) | Admin Access Model | Provisional — Needs Source Confirmation | Admin roles, access levels, and audit requirements |
| [ADR-050](ADR-050-monorepo-strategy.md) | Monorepo-First Repo Strategy | Accepted | GitHub monorepo: /apps/web, /apps/realtime, /apps/api, /packages/*, /supabase, /docs, /tests |
| [ADR-051](ADR-051-agent-branch-strategy.md) | Agent Branch Strategy | Accepted | 13 parallel agent branches (A–M); each builds against contracts, files ADRs, outputs acceptance tests |
| [ADR-052](ADR-052-foundation-contracts.md) | Foundation Contracts | Provisional — Needs Source Confirmation | Shared type/event contracts in /packages/shared must exist before any branch builds against them |
| [ADR-053](ADR-053-zod-validation.md) | Zod Contract Validation | Provisional — Needs Source Confirmation | Zod as the validation layer for shared schemas, event types, and cross-agent contracts |
| [ADR-054](ADR-054-ai-output-policy.md) | AI Output Validation / Retry / Fallback Policy | Provisional — Needs Source Confirmation | How the system handles AI output failures, retries, and safe fallback paths |
| [ADR-055](ADR-055-testing-strategy.md) | Agent Testing Strategy | Provisional | Each branch must output acceptance tests; Hero Slice, RLS, safety, mission quality, and load tests required before Sprint 5 |
| [ADR-056](ADR-056-pr-merge-gate.md) | PR Merge Gate | Provisional — Needs Source Confirmation | Required checks before any branch PR merges to main |
| [ADR-057](ADR-057-agent-conflict-resolution.md) | Agent Conflict Resolution | Provisional — Needs Source Confirmation | Process for resolving schema, contract, or build conflicts between parallel agent branches |
| [ADR-058](ADR-058-supabase-schema-domains.md) | Domain-Based Supabase Schema | Accepted | 9 schema domains: Identity/Auth, Learner Model, Curriculum Spine, Mission System, Evidence/Reports, Rewards/Economy, World State, Network/Safety, Learning Intelligence |
| [ADR-059](ADR-059-first-migrations.md) | First Migrations: Identity + Curriculum | Accepted | Supabase migrations for identity/consent/child profiles and curriculum spine created before any UI; RLS policies must precede UI completion |
| [ADR-060](ADR-060-curriculum-api-scope.md) | Curriculum Tables Scoped Through API Only | Provisional — Needs Source Confirmation | Curriculum domain tables not directly exposed to clients; all reads/writes route through Mission Compiler API |

---

## Provisional Decisions (Require Explicit Review to Change)

| Decision | Value |
|----------|-------|
| First beta cap | 100 Founding Families + 25–50 Inner Circle families (formalized as ADR-042) |
| Founder review gate | All Inner Circle families manually reviewed before acceptance |
| Demo data policy | Interactive demo uses fake/sample child data only |
| Launch geography | Florida-first; national beta allowed with L3ARN Mastery Map + Florida reference framing |
| Minimum launch proof | Waitlist requires landing page + Hero Slice demo. Paid acquisition requires stable interactive demo. |
| Public claims language | "Designed to support mastery" and "standards-aware" — no superiority claims until validated |
| Support channel | Email/chat; no phone until cohort size justifies |
| Incident escalation | Founder review for safety, privacy, model, or child-interaction flags |

---

## Needs Source Confirmation

The following ADRs (043–049, 052–054, 056–057, 060) capture decisions provided in agent context but not yet traceable to a specific section of `L3ARN_MASTER_HANDOFF.md`. They are preserved as Provisional. Before any branch builds against them, the founding team should confirm and promote to Accepted or file a superseding ADR.

| ADR | Decision Needing Confirmation |
|-----|-------------------------------|
| ADR-043 | Wave 2 Readiness Gate — gate criteria and success thresholds |
| ADR-044 | Wave 1 Success Scorecard — exact metrics and pass/fail thresholds |
| ADR-045 | Critical Safety Blockers — enumerated list of pre-launch blockers |
| ADR-046 | S0–S4 Severity Model — tier definitions and escalation triggers |
| ADR-047 | Kill Switch Authority — named roles, invocation conditions, rollback scope |
| ADR-048 | Founder Mission Control — dashboard design, access model, alerting |
| ADR-049 | Admin Access Model — roles, permissions, audit trail requirements |
| ADR-052 | Foundation Contracts — which contracts are required before each sprint |
| ADR-053 | Zod Validation — whether Zod is the approved validator or an alternative |
| ADR-054 | AI Output Policy — retry count, fallback behavior, parent notification rules |
| ADR-056 | PR Merge Gate — exact CI checks and required reviewer rules |
| ADR-057 | Agent Conflict Resolution — arbitration process for cross-branch conflicts |
| ADR-060 | Curriculum API Scope — whether this is an RLS rule, API gateway rule, or both |

---

## Open Questions

_None at this time. See "Needs Source Confirmation" section above for decisions that require founding-team sign-off before Sprint 2._

---

_ADR files to be written individually as Sprint 0 continues. Index covers the full approved set (ADR-001 through ADR-041, sourced from `L3ARN_MASTER_HANDOFF.md`) plus decisions ADR-042 through ADR-060 added from agent context and requiring confirmation where noted._

_Source: `docs/source/L3ARN_MASTER_HANDOFF.md` + agent context (ADR-042–060)_
