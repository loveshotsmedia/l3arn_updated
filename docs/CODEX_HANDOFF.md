# L3ARN — Codex Handoff

**Purpose:** Canonical development handoff for Codex and future coding agents.  
**Last updated:** 2026-09-06  
**Status:** Production Hero Slice verified end-to-end. Internal guided demo ready. Real-family beta is **not** yet cleared.

---

## 1. Read This First

You are taking over active development of **L3ARN**, an AI-powered homeschool operating system and safe, living 3D Academy.

Do **not** redesign the product from scratch. Do **not** silently replace approved architecture. Do **not** assume unfinished ideas are implementation requirements.

Before modifying code, read these repository files in this order:

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
11. `docs/superpowers/plans/`

Then inspect current `main`, recent git history, migrations, production environment contracts, and tests. Do not change code until this review is complete.

---

## 2. Product Definition

L3ARN is a **parent-controlled AI homeschool OS** where children complete standards-aware learning missions inside a safe, networked, living 3D Academy.

The product combines:
- standards-aware personalized learning
- AI-generated/adapted missions
- evidence-based mastery
- evolving learner calibration
- parent-visible progress
- Houses
- companions
- Moolah/rewards
- shared-world social experiences
- a persistent Academy that can eventually react to learning and community events

The goal is not a normal LMS with a game skin.

The intended experience is:

> A child enters a living Academy, develops an identity, belongs to a House, grows with a companion, completes meaningful missions, earns rewards, builds mastery, and returns to a world that remembers their progress.

The parent remains the governing adult.

---

## 3. Current Product Stage

### Production status

The Hero Slice is live and production-verified end-to-end.

Production web: `https://l3arnupdated.vercel.app`  
Production API: `https://l3arnupdated-production.up.railway.app`

The production verification passed:
1. parent login
2. parent dashboard
3. start child session
4. child token entry
5. The House Calling
6. House recommendation / child choice
7. oath
8. transfer-locked House membership
9. companion selection
10. real AI Mission 001 generation
11. 6-step interactive Mission 001
12. evidence capture
13. rewards
14. learner calibration update
15. First Learning Map
16. founder/non-founder access controls

Real AI verification:
- provider: Anthropic
- production model currently verified: `claude-sonnet-4-6`
- `content_source=ai`
- Zod validation passed
- fallback was not used
- companion name fidelity was verified (`Spark`, not an invented replacement)
- generation observed around ~66 seconds in production

### Current readiness labels

- Automated / agent production verification: **PASS**
- Internal guided demo: **READY**
- Founder manual product walkthrough: **NOT YET COMPLETED**
- Real-family beta: **NOT YET CLEARED**

Do not mark the product beta-ready until the founder personally walks through it and the Pre-Beta Hardening Wave is completed and reviewed.

---

## 4. Core Stack

### Frontend
- Vercel
- Next.js
- React
- Three.js
- React Three Fiber
- custom L3ARN World Engine

### Backend / AI / realtime
- Railway
- Node/TypeScript services
- AI workers
- backend-mediated child sessions

### Data / auth
- Supabase
- Postgres
- Supabase Auth
- RLS-first architecture
- service-role backend writes where appropriate

### Source control
- GitHub monorepo

### Local AI research
- RTX 5090
- local model experimentation is planned
- local model is not the production source of truth today

Lovable is **not** part of the active stack.

---

## 5. Product Governance Rules

### Parent governance
- Parent owns the K–8 child profile.
- AI supports; parent governs.
- Parent controls permissions and curriculum authority.
- Child email/password login is not part of the K–8 model.
- Child sessions are backend-mediated.

### Curriculum decision priority
When constraints conflict:
1. safety / legal
2. parent boundaries
3. mastery / standards
4. child personalization
5. child theme / preference

### Curriculum approval modes
- high-control
- balanced
- autopilot

The parent remains the authority.

### AI output policy
- Production model/provider must be environment-configured.
- No production model should be hardcoded as an architectural assumption.
- Structured/tool output should be used where available.
- Outputs must be validated.
- Invalid output must not reach the child.
- Safe static fallback must remain available.
- Repeated failures should become regression tests.

---

## 6. Identity, Child Sessions, and Access

Canonical parent identity pattern:

`parent_accounts.id = auth.users.id`

Do not revert to random unrelated UUID profile identity.

Child sessions are backend/API mediated.

Known routes include:
- `POST /api/sessions/start`
- `/api/sessions/verify`

The runtime should fail closed.

Current direction:
- younger child: parent-launched
- future older K–8: parent-approved trusted-device avatar/PIN
- no child email/password

Never trust `localStorage` as production identity authority.

---

## 7. Houses — Canonical Active Set

There are currently **four active Houses** in implementation.

Do not casually introduce a fifth House without an explicit product-wide decision and migration plan.

### Valkryn
- sports / courage / disciplined action
- Storm Griffin

### Lyrion
- arts / expression / creativity
- Songweaver Serpent

### Novari
- science / discovery / curiosity
- Ember Phoenix

### Cytrex
- technology / innovation / building
- Circuit Wyvern

`pre_sorting` is a valid pre-ceremony state.

---

## 8. The House Calling

The old simple House chooser has been replaced.

Canonical ceremony name: **The House Calling**.

It is intended to feel like a major identity moment, not an onboarding dropdown.

Current production flow:
1. Pre-Ceremony Invitation
2. House Lore Preview
3. 7-question Trial
4. Recommendation
5. child may accept or override
6. Oath
7. Companion Unlock Gateway

Trial traits currently include:
- curiosity
- courage
- creativity
- leadership
- collaboration
- resilience
- independence

The oath includes:

> “I will not quit simply because the road gets hard.”

### House permanence rule
House membership is transfer-locked by default.

The child cannot casually switch Houses. Future transfer requires parent authorization.

Do not implement retry/re-entry behavior that overwrites an already accepted active House membership.

### House recommendation
System recommends. Child ultimately chooses.

Do not change this into system-assigned House membership unless explicitly approved.

---

## 9. Companion Rules

Companion selection happens **after** House acceptance.

Companions are meant to grow with the child and eventually unlock abilities/tools.

The selected companion identity must propagate through the mission-generation pipeline.

Do not allow the AI to rename the child’s selected companion.

Production verification confirmed this fix using `Spark`.

---

## 10. Mission Compiler

The Mission Compiler is domain-agnostic.

Every mission should reconcile:
1. parent intent
2. child personalization
3. mastery / standards alignment

Supported delivery direction:
- parent/educator plan
- immersive 3D mission
- simplified interactive mode
- text/audio/offline-friendly mode

The system may recommend a delivery mode. Parent governs. Child may choose among allowed modes.

---

## 11. Mission 001 — Canonical First Mission

Canonical mission: **Repair the Sorting Computer + Learner Calibration**.

Current interactive sequence:
1. Briefing
2. Red / Blue / Green crystal sorts
3. AI Mistake Check
4. Explain Rule
5. Reflection
6. Done

Companion dialogue appears through the mission. Evidence is captured from real interactions.

### Canonical skill keys
Application/domain keys:
- `ai_literacy.verify_ai_output`
- `logic.sequence_steps`
- `comprehension.follow_multistep_instructions`
- `reasoning.use_evidence_to_decide`
- `learner.calibration_initial_profile`

Database mastery keys:
- `AI_LITERACY.VERIFY_AI_OUTPUT`
- `LOGIC.SEQUENCE_STEPS`
- `COMPREHENSION.FOLLOW_MULTISTEP_INSTRUCTIONS`
- `REASONING.USE_EVIDENCE_TO_DECIDE`
- `LEARNER_CALIBRATION.INITIAL_PROFILE`

Important: use `LEARNER_CALIBRATION.INITIAL_PROFILE`. Do **not** reintroduce the older incorrect learner key.

---

## 12. Evidence, Mastery, Calibration, and Rewards

### Mission evidence
Mission 001 currently emits interaction-derived evidence including:
- decision-log
- sequence-completion
- AI-mistake-check
- explanation
- reflection
- structured-replay

Production verification observed 21 evidence events.

### Calibration
Calibration is no longer hardcoded.

Current stages include:
- `sorting-ceremony`
- `mission-001`

Observed progression:
- sorting ceremony confidence approximately `0.40–0.55`
- Mission 001 confidence approximately `0.60–0.75`
- production verification reached `0.750`

### Rewards
Production verification observed:
- 25 Moolah
- 75 XP
- 15 House Points
- +20 Companion Bond
- 2 badges

Rewards must remain idempotent.

Moolah ledger is source of truth. Wallet balance is updated atomically by DB logic; do not introduce direct client-side balance writes.

---

## 13. First Learning Map

The first parent report is the **Unified First Learning Map**.

It should communicate:
- what the child learned
- evidence
- learner calibration
- game/reward/companion progress
- next recommended path

Production fixes already verified:
- XP displays correctly
- companion displays human-readable name
- mastery skills display human-readable names instead of raw UUIDs
- calibration displays

Evidence highlights may eventually include screenshots, structured replay clips, transcript snippets, optional push-to-talk audio, and created artifacts.

Private to parent by default.

No webcam/face capture.

---

## 14. Safety and Privacy

### Never implement
- webcam requirement
- face capture
- facial recognition
- biometric identification
- always-on microphone

Optional audio direction:
- parent-controlled
- push-to-talk only

### Safety administration
Admin model includes:
- founder / super admin
- safety admin
- support admin
- curriculum admin
- technical admin
- AI agent operator

AI agent operators cannot make final safety decisions or override consent.

### Automated containment
Approved direction allows predefined automated containment for severe child-safety events.

Potential actions include:
- block content
- end/freeze child session
- force Guided AI
- force Quick Chat
- disable audio
- disable evidence highlights
- freeze Moolah
- freeze world writes when a real world-write enforcement point exists

Restoration requires founder/admin review.

Older notes contain some severity-label inconsistency. Follow the active safety plan/spec rather than inferring semantics from old labels alone.

---

## 15. Pre-Beta Hardening Wave

The plans exist. **Implementation has not yet been completed.**

### Agent 19 — AI Reliability Hardening
Plan: `docs/superpowers/plans/agent-19-ai-reliability-hardening.md`

Required:
- 30s Anthropic timeout / AbortSignal
- app-controlled retries
- safe fallback preserved
- SDK `maxRetries: 0`
- resolve/document duplicate retry engines

Retry plan:
- gap 1: 500ms
- gap 2: 1000ms
- 2000ms reserved/documented for future cap expansion

### Agent 20 — Safety Containment Enforcement
Plan: `docs/superpowers/plans/agent-20-safety-containment-enforcement.md`

Approved design:
- containment layers over `child_permissions`
- do not overwrite parent permission source-of-truth
- use session-scoped override model
- planned table: `child_containment_state`
- runtime resolves “stricter wins”
- restoration clears containment override
- founder/admin review required

Open question: no mature world-write service enforcement point exists yet. Do not pretend world-write freezing is implemented if it is only interface-ready.

### Agent 21 — Parent Safety Flags + Report Trust
Plan: `docs/superpowers/plans/agent-21-parent-safety-flags-report-trust.md`

Approved design:
- parent-facing notices are separate from founder-only `safety_escalations`
- do not expose raw moderation internals
- routine validation fallback should use calm quality language
- true serious events may use “paused/reviewing” language
- final parent-facing copy requires founder sign-off

### Agent 22 — Demo Feedback Capture
Plan: `docs/superpowers/plans/agent-22-demo-feedback-capture.md`

Docs/process only.

Capture:
- parent reaction
- child excitement
- friction
- mission confusion
- report clarity
- guided-demo readiness scoring

### Agent 23 — Beta Readiness Checklist
Plan: `docs/superpowers/plans/agent-23-beta-readiness-checklist.md`

Runs last. Must not declare beta ready until Agents 19–21 are complete and verified.

---

## 16. Founder Manual Test Still Required

The founder has **not yet personally clicked through the current production app**.

Do not confuse automated E2E verification with founder product approval.

Before opening Wave 1 to real families, the founder should manually evaluate:
- login flow
- parent dashboard
- Start Session
- child entry
- House Calling
- companion selection
- Mission 001
- rewards
- First Learning Map
- Founder Mission Control

The manual review is not just “does it work?” Evaluate:
- Does the experience feel magical?
- Does House Calling feel important enough?
- Does Mission 001 feel like actual learning?
- Does the companion feel alive?
- Does the report make sense immediately to a parent?
- Is anything ugly, slow, confusing, thin, or embarrassing?
- Would we confidently show this exact experience to a real family?

---

## 17. Beta Model

### Price
- beta: $30/month per family
- public launch direction: one full-access family price, discussed around $129/month
- no early feature-tier fragmentation
- founders receive a permanent post-beta discount, not $30 forever

### Groups

#### Inner Circle Cohort
Wave 1:
- 25 families
- active feedback expectation

#### Founding Family Beta
Wave 2:
- up to 100 families
- lighter feedback expectation

Wave 2 only opens after readiness gates pass.

### Early success targets
- 80% parent onboarding
- 75% child onboarding / House Calling
- 70% Mission 001 completion
- 70% parent First Learning Map clear/useful
- 60% children want to return
- 0 unresolved critical safety/privacy issues
- 50% second session / next mission

---

## 18. Learning Intelligence Direction

Long term, L3ARN should build a proprietary **Learning Intelligence Layer**.

Goal: outperform general frontier models on narrow education/personalization tasks, not general intelligence.

Permitted improvement signals should be structured, privacy-preserving, de-identified/pseudonymous, and filtered.

Parent can opt out of broader model-improvement/research use.

Raw child PII, raw audio, custody/health information, and identifiable artifacts are not default training data.

---

## 19. Living Academy Direction

The Academy is intended to become a persistent, governed world.

Long-term systems include:
- House Influence
- Companion Grove evolution
- Moolah Market economy
- Mission Impact
- shared-room multiplayer
- persistent world changes

Persistent changes must be governed, reversible, logged, and tied to learning/events.

World-state architecture direction:
- Railway executes/broadcasts live state
- Supabase remains authoritative ledger/snapshot/history
- hybrid event-sourced approach

Do not fake authoritative persistence with local-only state.

---

## 20. Database Migration State

Migrations through `012` are applied to production.

- `001` identity / household / consent
- `002` curriculum / mastery spine
- `003` curriculum preferences / onboarding / sessions
- `004` rewards / Moolah / companion
- `005` evidence / reports
- `006` Founder Mission Control
- `007` beta operations
- `008` mission runtime / companion (`mission_attempts`, `companion_profiles`)
- `009` service-role grants
- `010` House Calling (`house_memberships`, `house_calling_signals`)
- `011` calibration snapshots (`calibration_snapshots`)
- `012` parent-readable mastery skill reference policy

Migration `012` is applied in production and verified. Authenticated parents can resolve mastery skill UUID references to human-readable skill names.

---

## 21. Production Verification Snapshot

### Railway
Health returned:

```json
{
  "status": "ok",
  "anthropicKeyPresent": true,
  "anthropicModelPresent": true,
  "missionAiReady": true
}
```

### Environment
Required production variables were audited as present, including Anthropic config, retry setting, AI provider, Supabase config, mission service token, safety admin token, CORS, founder alert email, and the Vercel Railway worker URL.

`AI_FALLBACK_MODEL` is intentionally not active. Do not add it back merely because it appears in old documentation.

---

## 22. Repo / Agent Operating Model

The project uses multiple coding agents. Architecture must remain deterministic.

### Monorepo
Use monorepo-first architecture unless there is a real reason to split.

### Contracts
Shared contracts use Zod + inferred TypeScript types.

Important domains include:
- Identity
- Mission
- World Event
- Evidence
- Rewards
- Parent Report
- Permissions
- Moderation
- AI
- Calibration
- Session

### Architecture governance
- ADRs are source-of-truth for significant architecture decisions.
- Shared contracts are source-of-truth for inter-service shape.
- Agents must not silently override architecture.
- Important deviations require explicit documentation.
- Troubleshooting/failure knowledge should remain living documentation.

### Tests
Expected categories:
- contract
- safety
- Hero Slice integration
- regressions
- browser E2E

---

## 23. Known Open Questions

### AI retry engines
There are near-duplicate mission vs. companion retry paths. Agent 19 should resolve or deliberately document their relationship.

### Moderation persistence
`moderation_events` are not fully persisted in the intended mature form today.

### World-write containment
There is no complete world-write service enforcement point yet. Containment may expose an interface/future enforcement contract, but do not claim full world-state freeze until a real write path exists.

### AI latency
Production Mission 001 real-AI generation has been observed around ~66 seconds. Reliability hardening should address timeout/retry behavior. Performance/product work may later address perceived latency separately.

Do not solve latency by bypassing validation or weakening fallback safety.

---

## 24. Explicit “Do Not” List

Do not:
- add a fifth House without explicit approval
- make Houses casually switchable
- system-assign a House without child final choice
- let AI rename the selected companion
- let raw unvalidated model output reach the child
- trust localStorage as child identity authority
- overwrite parent permission rows for temporary safety containment
- expose founder-only safety tables directly to parents
- implement webcam/face/biometric features
- add always-on audio
- hardcode a production AI model as architecture
- bypass Supabase RLS casually
- write wallet balances directly from the client
- mark beta ready because automated tests passed
- treat demo credentials as repository documentation
- commit secrets or management tokens
- create new product scope during the Pre-Beta Hardening Wave
- estimate development purely from conventional human-engineer timelines

---

## 25. What Codex Should Do on First Entry

After reading the required docs and inspecting the repo, report:

### Product understanding
- what L3ARN is
- who controls the child experience
- how missions, Houses, companions, evidence, mastery, calibration, and reports connect

### Current state
- what is live
- what production verification already passed
- what remains unimplemented

### Architecture state
- important services
- authoritative data paths
- active contracts
- current migrations

### Safety state
- what is enforced
- what is still only planned
- which containment gaps remain

### Next work
Recommend the next task based on repository reality.

At the moment, expected next sequence:
1. founder manually tests the live product
2. record demo feedback
3. Agent 19 — AI reliability
4. Agent 20 — containment
5. Agent 21 — parent safety/report trust
6. Agent 22 — feedback process may run in parallel
7. Agent 23 — final beta readiness gate

Do not begin broad new feature work before the founder’s manual walkthrough unless explicitly instructed.

---

## 26. Current Milestone Definition

The current milestone is **not** “build more features.”

It is:

> Personally validate the live Hero Slice, harden safety/reliability, then determine whether L3ARN is ready for the first 25-family Inner Circle.

The Hero Slice exists.

The next job is to make sure it deserves real families.

---

## 27. Handoff Command for Codex

Use this as the first prompt after opening the repository:

> You are taking over active development of L3ARN. Read `docs/CODEX_HANDOFF.md` first, then follow its required repository reading order. Inspect the current `main` branch, migrations, recent git history, contracts, tests, and production integration points. Do not modify code yet. First report your understanding of the product, current production state, safety state, unresolved beta blockers, and the next recommended task. Do not redesign approved architecture or introduce new scope.
