## **L3ARN** 

# **Execution Blueprint + Parallel Agent Sprint Handoff** 

_Parent-Controlled AI Homeschool OS + True 3D Living Academy_ 

Prepared: June 14, 2026 

**Purpose:** This document consolidates the approved L3ARN product decisions, architecture, compliance posture, data model, GTM strategy, and sprint structure into a single handoff artifact for parallel coding, design, curriculum, AI, and growth agents. 

**Important operating note:** This artifact is designed for autonomous agent execution, but execution should remain gated by the architecture, privacy, child-safety, and mission-quality contracts defined here. 

## **1. Executive Summary** 

L3ARN is a parent-controlled AI homeschool operating system where children complete standards-aware missions inside a safe, networked, true 3D living Academy. The platform combines AI-powered curriculum generation, evidence-based mastery, parent-controlled customization, Houses, companions, Moolah, multiplayer learning, and a living world that changes as students learn. 

The strategic thesis is simple: AI unlocks truly personalized education, but that personalization must be governed by parent intent, child-specific learner modeling, and mastery/standards alignment. The 3D Academy is not decoration; it is the delivery system that makes rigorous learning feel like a world kids want to return to. 

## **1.1 Official MVP Identity** 

L3ARN MVP is a parent-controlled AI homeschool operating system where children complete standards-aware missions inside a safe networked learning world with Houses, companions, Moolah, and mastery-based progression. 

## **1.2 Non-Negotiables** 

- Networked student world is part of MVP, not a future feature. 

- True 3D Academy is part of MVP. 

- Parent controls and trust are foundational. 

- No webcam, no face capture, no facial recognition, no facial analysis. 

- Audio is optional, parent-controlled, push-to-talk only. 

- All child accounts are parent-owned for MVP. 

- Every instructional mission must satisfy parent intent, child personalization, and mastery/standards alignment. 

- Game progress and academic mastery are related but not identical. 

- AI can generate across all domains, but instructional missions must be grounded in a traceable academic target/source/pattern. 

- Raw child PII and sensitive content are not training data by default. 

## **1.3 Highest-Level Architecture** 

|**Layer**|**Approved Tool / Pattern**|**Responsibility**|
|---|---|---|
|Frontend App Shell|Next.js / React on Vercel|Parent app, student app shell, dashboards,<br>onboarding, consent, reports, app UI<br>overlays.|
|3D Academy World|Three.js + React Three Fiber|True 3D Academy, avatars, companions,<br>House halls, mission spaces, camera,<br>lighting, sceneinteractions.|
|Custom World Engine|L3ARN 3D World Engine|Scene orchestration, room contracts, avatar<br>controller, companion controller, interaction<br>zones,missiontriggers.|
|Realtime / Backend|Railway|WebSocket room server, live execution,<br>presence, chat relay, world events, AI<br>orchestration, scheduled jobs.|
|Protected Data|Supabase|Auth, parent/child records, consent, learner<br>profiles, mastery, Moolah, chat logs, world-<br>stateledger, storage.|
|Source Control|GitHub|Repo, branches, PRs, ADRs, deterministic<br>agentworkflows, CI/CD.|
|Local AI/3D Lab|RTX 5090|Local model experiments, asset<br>generation/prototyping, synthetic data, future<br>private-modelexploration.|



## **2. Approved Product Decisions** 

|**#**|**Decision**|**Approved Direction**|
|---|---|---|
|1|MVP Identity|Parent-controlled AI Homeschool OS +<br>standards-aware missions + safe networked<br>learningworld.|
|2|World Scope|Interactive social Academy world with<br>selectedliving-worldmechanics.|
|3|RenderingDirection|True 3Dbrowser-basedAcademy.|
|4|Tech Stack|Next.js/React, Three.js/R3F, Custom L3ARN<br>3D WorldEngine,Vercel,Railway,|



|||Supabase, GitHub, RTX 5090.|
|---|---|---|
|5|Camera Model|Sims-style angled camera with click/tap<br>movement for main Academy; first/third-<br>person special missions.|
|6|Multiplayer|Shared-room multiplayer.|
|7|Student Chat|Hybrid chat: Quick Chat for younger<br>students, parent-approved moderated free<br>text for older students.|
|8|Child Identity|Parent-approved Academy Display Name +<br>House identifier; real full names hidden by<br>default.|
|9|Parent Visibility|Tiered visibility; K-5 full visibility default;<br>grades 6-8 summary + expand; safety<br>overrides.|
|10|Student AI Interaction|Age-tiered hybrid AI: guided for young<br>students, controlled companion chat for<br>older students.|
|11|Academic Progress|Evidence-based mastery model.|
|12|Rewards|Split reward economy: effort rewards plus<br>mastery-gated major progression.|
|13|Parent Approval|High-Control, Balanced, or Autopilot<br>curriculum approval modes.|
|14|Standards Model|L3ARN Mastery Map + Florida K-8<br>standards mapping where applicable.|
|15|Curriculum Scope|Universal domain-agnostic Mission Compiler<br>capable of teaching across all domains.|
|16|Mission Constraint|Parent intent + child personalization +<br>mastery/standards alignment.|
|17|Conflict Resolution|Safety/legal -> parent boundaries -><br>mastery/standards -> personalization -><br>child theme/preference.|
|18|Mission Output|Multi-modal: parent plan, 3D mission,<br>simplified interactive mode, text/audio/offline<br>mode.|
|19|Delivery Mode Control|System recommends, parent governs,<br>student chooses within boundaries.|
|20|World Map|Full Core Academy: Great Hall, House Halls,<br>Mission Commons, Companion Grove,<br>Moolah Market, AI Lab, Outdoor Grounds,<br>Event Arena, Parent Portal/Report Room.|
|21|Academy Liveliness|Fully Living Academy with governed<br>persistent world state.|
|22|Living Systems|House Influence, Companion Grove<br>Evolution, Moolah Market Economy, Mission<br>Impact.|
|23|World State Truth|Hybrid event-sourced model: Railway<br>executes/broadcasts; Supabase<br>authoritative ledger/snapshots.|
|24|Curriculum Truth|Hybrid curriculum grounding layer; every<br>instructional mission traceable to approved<br>target/source/pattern.|
|25|Knowledge Base v1|Minimal but complete spine: Mastery Map,<br>Florida standards, mission patterns,<br>evidence rubrics, AI overlay, parent-material<br>rules.|
|26|First Build Path|End-to-end Hero Slice.|
|27|First Mission|Repair the Sorting Computer + Learner<br>Calibration.|
|28|Benchmarking|Architect for Florida, national, global; v1<br>reports only Florida + L3ARN internal<br>mastery.|
|29|First Proof Report|Unified First Learning Map with evidence<br>highlights.|
|30|Evidence Capture|Structured learning events auto-captured;<br>parent-consented highlights; no<br>webcam/face features.|
|31|Audio|Parent-controlled push-to-talk only; no<br>always-on mic, biometrics, voice ID, emotion<br>detection.|
|32|AI Model Strategy|Cloud production models initially + future<br>proprietary L3ARN learning model via<br>privacy-preserving intelligence layer.|
|33|Model Improvement Data|De-identified structured + privacy-filtered<br>interaction signals; no raw sensitive data by|



|||default.|
|---|---|---|
|34|Parent Opt-Out|Parents can fully opt out of broader model<br>improvement/research.|
|35|Account Ownership|Parent-owned child profiles for K-8 MVP.|
|36|Child Session Model|Parent launch + avatar/PIN trusted-device<br>login.|
|37|Pricing|Beta: $30/month per family. Public target:<br>one full-access family price around $100-<br>$150/month; recommended $129.|
|38|Founding Pricing|Founding families get permanent discount<br>after beta, not lifetime $30.|
|39|Beta Model|Founding Family Beta+Inner Circle Cohort.|
|40|First Beta Audience|Current homeschool families, AI/STEAM-<br>curious families, co-ops/microschool pods.|
|41|Acquisition Strategy|Local events + online homeschool<br>communities + direct co-op outreach first;<br>paid ads/show funnel later.|
|42|Demo Assets|Landing page + Hero Slice demo video +<br>interactive guided demo; Charli/Loomi trailer<br>later.|
|43|Landing Promise|Parents run a personalized AI-powered<br>homeschool while children learn through<br>standards-aware missions inside a living 3D<br>Academy.|
|44|Primary CTA|Apply for Founding Family Beta.|
|45|Beta Application|Medium 10-15 question application.|
|46|Applicant Scoring|Founding Family Fit Score+manual review.|
|47|Beta Feedback Commitment|Light feedback for Founding Family Beta;<br>active 2-3x/week feedback for Inner Circle.|
|48|Hero Slice Demo Priority|Demo must prove parent value and student<br>magic before paid ads or show funnel<br>scaling.|



## **3. Recommended Remaining Decisions Executed Autonomously** 

Per instruction, the remaining unresolved branches are resolved here using the recommended path unless later overridden. These decisions should be treated as provisional ADRs that can be changed only with explicit review. 

|**Area**|**Autonomous Recommendation**|**Why**|
|---|---|---|
|Beta applicant scoring|Use Fit Score + manual review. Score<br>homeschool/co-op relevance, AI/STEAM<br>curiosity, age fit, pain urgency, feedback<br>commitment, 3D excitement, Inner Circle<br>potential.|Balances quality with throughput.|
|First beta cap|Start with 100 Founding Families and 25-50<br>Inner Circle families.|Enough scale for feedback without<br>overwhelming support and safety operations.|
|Founder review gate|All Inner Circle families manually reviewed<br>before acceptance.|Early cohort quality matters more than<br>volume.|
|Demo data|Interactive demo uses fake/sample child<br>data only.|Prevents accidental exposure of real child<br>data.|
|Initial state launch geography|Florida-first standards/reporting, national<br>beta allowed if positioned as L3ARN Mastery<br>Map+Florida reference only.|Maintains legitimacy while allowing broader<br>early interest.|
|Minimum launch proof|Launch waitlist only after landing page + 2-4<br>minute Hero Slice demo are present. Launch<br>paid acquisition only after interactive demo is<br>stable.|Trust-first sequencing.|
|Public claims|No superiority claims until validated by real<br>data. Use “designed to support mastery” and<br>“standards-aware”language.|Avoids unsupported education claims.|
|Support channel|Start with founder/AI-assisted support via<br>email/chat. No phone support until cohort<br>size justifies it.|Manageable and auditable.|
|Incident escalation|Founder review for serious safety, privacy,<br>model, or child-interaction flags.|Child-safety accountability stays centralized<br>early.|



## **4. Product Architecture** 

## **4.1 System Overview** 

L3ARN is built as a distributed but governed system. The frontend app runs on Vercel, the 3D Academy is rendered through React Three Fiber/Three.js, Railway hosts realtime/game/backend orchestration, and Supabase is the protected source of truth. Every persistent child, academic, economy, chat, consent, and world-state record must be auditable and connected back to parent permissions. 

## **4.2 Runtime Components** 

|**Component**|**Runs On**|**Description**|
|---|---|---|
|Parent Command Center|Vercel / React|Parent onboarding, child profiles, curriculum<br>controls, reports, consent, privacy, billing<br>later.|
|Student App Shell|Vercel / React|Student dashboard shell, session entry,<br>mission launcher, overlays.|
|3D Academy Client|React Three Fiber / Three.js|Full 3D Academy, avatars, rooms,<br>companions, cameras, interactions.|
|L3ARN 3D World Engine|Frontend + shared contracts|Scene manager, room loader,<br>avatar/companion controllers, interaction<br>zones, mission triggers.|
|Realtime Room Server|Railway|Shared-room presence, movement state,<br>room membership, live events.|
|Chat + Moderation Relay|Railway|Hybrid chat, pre/post moderation, logs,<br>parent visibility records.|
|Mission Compiler API|Railway|AI generation, grounding, validation, parent<br>plan/student output generation.|
|Living Academy Engine|Railway + Supabase|Mission impact, House influence,<br>Companion Grove evolution, Moolah Market,<br>persistent world changes.|
|Supabase Source of Truth|Supabase|Auth, RLS, child profiles, consent, learner<br>data, mastery, Moolah, logs, storage.|
|Learning Intelligence Layer|Railway/Supabase/Local Lab|De-identified learning signals, analytics,<br>future model training datasets.|



## **4.3 Repo Structure Recommendation** 

- **/apps/web** - Next.js app: parent dashboard, student app, 3D client shell, landing page. 

- **/apps/realtime** - Railway WebSocket/game server for rooms, presence, chat relay, live events. 

- **/apps/api** - Backend API for mission compiler, reports, parent controls, integrations. 

- **/packages/world-engine** - R3F/Three.js scene contracts, avatar controller, room state adapter, interaction system. 

- **/packages/shared** - Shared types, schemas, zod validators, event definitions. 

- **/packages/ai** - AI orchestration, prompt templates, mission quality gates, moderation adapters. 

- **/packages/curriculum** - Mastery map, standards mappings, mission patterns, evidence rubrics. 

- **/supabase** - migrations, RLS policies, seed data, edge functions if used. 

- **/docs** - CONTEXT.md, architecture.md, ADRs, specs, sprint maps. 

- **/tests** - integration, safety, RLS, mission compiler, realtime tests. 

## **5. Hero Slice Specification** 

The Hero Slice is the first end-to-end product path agents should build. It is the integration target for architecture, curriculum, game, AI, safety, and GTM. 

1. Parent creates account and accepts required consent/privacy flows. 

2. Parent creates child profile and sets initial curriculum, AI, chat, audio, model-improvement, and delivery-mode boundaries. 3. Child enters through parent-launched or trusted avatar/PIN session. 

4. Child enters Great Hall and completes avatar creation. 

5. Sorting Computer ceremony gathers interests, choices, motivation signals, and early learner data. 

6. Sorting Computer recommends a House; child chooses final House. 

7. Child chooses a companion and Academy Display Name. 

8. Mission Compiler generates Mission 001: Repair the Sorting Computer + Calibrate the Learner Core. 

9. Child completes mission in 3D, simplified, or text/audio/offline mode depending on settings and choice. 

10. System captures structured evidence events and approved highlights. 

11. Reward engine awards effort XP/Moolah and mastery-gated companion/House progress. 

12. Parent receives Unified First Learning Map with academic proof, learner calibration, game progress, evidence highlights, and next path. 

## **5.1 Mission 001: Repair the Sorting Computer + Calibrate the Learner Core** 

|**Dimension**|**Specification**|
|---|---|
|Narrative|The Sorting Computer glitches after the student ceremony. The child<br>helps repair it with their companion while learning that AI is powerful<br>butmust be checked.|
|Location|GreatHallComputerCore /AI Lab.|
|Academic targets|AI literacy, logic, sequencing, reading/listening comprehension,<br>evidence-basedreasoning, pattern recognition.|
|Hidden personalization targets|Reading mode preference, cognitive load tolerance,<br>attention/persistence, help-seeking style, AI readiness, delivery-<br>modefit.|
|Evidence|Decision logs, completed sequence, AI-mistake check,<br>explanation/reflection, optional audio response, structured<br>replay/screenshot.|
|Rewards|Starter Moolah, first AI literacy badge, companion bond increase,<br>House contribution,firstworldimpact.|
|Parent output|UnifiedFirstLearningMap andLearnerCalibrationScore.|



## **6. Mission Compiler Architecture** 

The Mission Compiler is the heart of L3ARN. It turns parent intent, child personalization, and mastery/standards alignment into a playable, explainable, evidence-producing learning mission. 

## **6.1 Three-Part Constraint** 

- **Parent intent** - what the parent wants taught, emphasized, blocked, or modified. 

- **Child personalization** - how this child can best access the learning right now. 

- **Mastery/standards alignment** - what skill, evidence, and standard/mastery objective the mission must satisfy. 

## **6.2 Conflict Resolution** 

13. Safety/legal boundaries always win. 

14. Parent-set boundaries come next. 

15. Required mastery/standards cannot be discarded; they are reformatted. 

16. Child personalization decides delivery format and scaffolding. 

17. Child preference/theme decorates the mission. 

## **6.3 Mission Output Schema** 

|**Output**|**Purpose**|
|---|---|
|parent_plan|Objective, standards/mastery alignment, materials, steps, safety,<br>evidence,mastery threshold,why chosen.|
|student_3d_mission|Story hook, world location, companion dialogue, 3D objects, tasks,<br>rewards, evidence capture.|
|student_interactive_lite|Cards, illustrations, audio, simplified interactions, lower-stimulation<br>mode.|
|student_text_audio_offline|Plainsteps,read-aloud, printable/offline task, artifact uploadlater.|
|evidence_plan|What gets captured, why, retention, parent visibility, portfolio<br>inclusion.|
|reward_plan|Effort rewards, mastery rewards, companion growth, House<br>contribution.|



## **7. Learner Model + Personalization** 

## **7.1 Learner Calibration Score** 

L3ARN should not claim to fully know a child on day one. It should show a calibration score that improves through onboarding, the Sorting Ceremony, Mission 001, and the first 7-14 days of mission data. 

|**Stage**|**Expected Calibration**|**Signals Added**|
|---|---|---|
|Parent onboarding|20-35%|Age, grade, state, goals, boundaries, known<br>concerns, screen/audio/socialsettings.|
|Sorting Ceremony|40-55%|House choice, interests, companion choice,<br>motivationsignals, choice behavior.|
|Mission 001|60-75%|Reading/listening behavior, cognitive load,<br>AI readiness, persistence, delivery mode,<br>mastery evidence.|
|First 7-14 days|80-90%|Progression, retention, frustration/help<br>signals, parent edits, companion usage,<br>mission mode performance.|



## **7.2 Key Learner Profile Fields** 

- Academic: grade, reading estimate, comprehension, math baseline, AI readiness, writing stamina, mastery map. 

- Cognitive/pacing: instruction chunk size, time-on-task, hint needs, reread/replay behavior, frustration triggers. 

- Engagement: House, companion, interests, mission types, solo/team preference, competition response. 

- Accessibility: audio support, visual support, parent read-aloud, low-text mode, movement/outdoor preferences. 

- Parent controls: approval mode, social settings, AI settings, screen limits, blocked topics, outside-time goals. 

- Confidence score per field: every learner model claim should carry confidence and data-source tags. 

## **8. 3D Academy World + Living Systems** 

## **8.1 Full Core Academy Map** 

|**Room**|**Core Purpose**|**Living-System Hooks**|
|---|---|---|
|Great Hall|Arrival, announcements, Sorting Computer,<br>major Academyrituals.|House banners, ceremonies, weekly winner<br>displays, seasonalevents.|
|Valkryn Hall|Sports, movement, courage, discipline.<br>Mascot:StormGriffin.|Storm energy, wellness challenges, House<br>trophies.|
|Lyrion Hall|Music, arts, storytelling, expression. Mascot:<br>SongweaverSerpent.|Sound/light installations, creative<br>showcases.|
|Novari Hall|Science, discovery, nature, transformation.<br>Mascot: Ember Phoenix.|Ecosystem growth, discovery exhibits,<br>phoenixeffects.|
|Cytrex Hall|Technology, AI, coding, systems. Mascot:<br>CircuitWyvern.|Machine repairs, AI lab unlocks, signal<br>towers.|
|Mission Commons|Daily missions, recommended paths, team<br>missions,mastery checkpoints.|Personalized mission board, challenge<br>drops,House quests.|
|Companion Grove|Companion selection/evolution/reflection.|Grove blooms, companion milestones, rare<br>forms.|
|Moolah Market|Rewards, cosmetics, companion<br>accessories,Houseitems.|Rotating inventory, seasonal items, mastery-<br>gated goods.|
|AI Lab|Prompting, AI safety, coding, responsible AI<br>use.|Repair states, machine activation, AI<br>challenge stations.|
|Outdoor Grounds|Wellness, movement, nature, outside-<br>learning bridge.|Seasonal changes, gardens, obstacle<br>courses.|
|Event Arena|House competitions, live events, showcases.|Event themes, leaderboards, trophies,<br>countdowns.|
|Parent Portal / Report Room|Student-safe progress/portfolio view.|Mastery badge walls, evidence highlights,<br>show-parentmoments.|



## **8.2 Living Academy Engine** 

- **House Influence** - Academy spaces reflect House performance and collective points. 

- **Companion Grove Evolution** - companion milestones visibly affect the Grove. 

- **Moolah Market Economy** - rotating inventory and mastery-gated rewards reinforce return habits. 

- **Mission Impact** - learning visibly repairs, grows, unlocks, decorates, powers, or transforms approved parts of the school world. 

Master rule: every persistent world change must be system-approved, reversible, logged, parent-visible when child-specific, and connected to mastery, effort, House contribution, companion growth, or scheduled Academy events. 

## **9. Safety, Privacy, Compliance, and Trust Baseline** 

## **9.1 Official External Anchors** 

COPPA applies to operators of child-directed websites or online services and operators with actual knowledge that they collect personal information online from children under 13; it requires strong parental-consent and data-use practices. The U.S. Department of Education administers FERPA and student privacy guidance for educational records and de-identification. Florida CPALMS is the official source for Florida standards, and Florida home education resources describe parent responsibilities such as notice, annual evaluation, and termination steps. See Sources section. 

## **9.2 Hard Product Privacy Rules** 

- No webcam feature. 

- No face capture. 

- No facial recognition or facial analysis. 

- No child video recording from device camera. 

- Audio is optional, parent-controlled, push-to-talk only. 

- No always-on microphone. 

- No voice biometrics, voice ID, emotion detection, or surveillance. 

- All K-8 child profiles are parent-owned. 

- Parents can fully opt out of broader model improvement/research. 

- Raw child PII and sensitive data are not training data by default. 

## **9.3 Child Social Safety Rules** 

- No private DMs in MVP. 

- No images/files/links in student chat. 

- No phone numbers, addresses, social handles, or external contact sharing. 

- K-5 default to Quick Chat. 

- Grades 6-8 may use moderated free text only with parent approval. 

- All K-8 messages are logged, parent-visible, moderated, and never disappearing. 

- Public identity uses Academy Display Name + House identifier only. 

## **10. Data Model Overview** 

|**Domain**|**Key Tables / Objects**|
|---|---|
|Identity/Auth|parent_accounts, households, child_profiles, academy_identities,<br>child_permissions, trusted_devices, child_sessions,<br>parent_consents.|
|Learner Model|learner_profiles, learner_profile_fields, calibration_events,<br>personalization_confidence, support_preferences.|
|Curriculum Spine|mastery_domains, mastery_skills, skill_prerequisites, standards,<br>standard_skill_mappings, mission_patterns, rubrics.|
|Mission System|missions, mission_versions, mission_outputs, mission_steps,<br>mission_attempts, evidence_requirements, mastery_checks.|
|Evidence/Reports|learning_evidence_events, mission_replay_events, artifacts,<br>parent_reports, portfolio_items, mastery_records.|
|Rewards/Economy|moolah_wallets, moolah_ledger, xp_events,<br>companion_growth_events, badges, house_points.|
|World State|world_state_events, room_state_snapshots, academy_unlocks,<br>house_world_modifiers, npc_schedules, seasonal_event_configs.|
|Network/Safety|room_sessions, presence_events, chat_messages,<br>moderation_events, escalation_records, audit_logs.|
|Learning Intelligence|deidentified_events, feature_records, dataset_eligibility,<br>model_improvement_consent, training_dataset_versions.|



## **11. Parallel Agent Sprint System** 

The rest of the work should run as parallel branches, but every branch must build against contracts, not vibes. Each agent must update docs, surface decisions as ADRs, and output acceptance tests. 

|**Agent**|**Branch**|**Primary Outputs**|
|---|---|---|
|A|Architecture Lead|CONTEXT.md, architecture.md, ADRs, repo<br>structure, security baseline, CI/CD, data<br>boundaries.|
|B|3D World Engine|world_engine_architecture.md, room<br>contracts, R3F scenes, camera controls,<br>avatar/companion controllers.|
|C|Realtime/Backend|Railway WebSocket server, room state, chat<br>relay, live events, world event cache, APIs.|
|D|Supabase/Data|schema.sql, RLS policies, migrations,<br>source-of-truth tables, audit logs.|
|E|Mission Compiler/AI|mission_compiler_spec.md, prompt library,<br>quality gates, grounding layer, output<br>schemas.|
|F|Curriculum Knowledge Base|L3ARN Mastery Map, Florida standards<br>map, mission patterns, rubrics, AI literacy<br>overlay.|
|G|Learner Model|onboarding diagnostics, calibration score,<br>learner profile schema, personalization rules.|
|H|Safety/Moderation|chat rules, AI moderation, escalation,<br>evidence privacy, model-improvement<br>consent, COPPA/FERPA posture.|
|I|Parent UX|parent command center, controls matrix,<br>reports, beta application, consent, billing<br>later.|
|J|Student UX/Game Loop|Sorting Ceremony, Houses, companions,<br>Moolah, Mission 001, rewards, student<br>session flow.|
|K|GTM/Growth|landing page, beta application, outreach,<br>demo scripts, event playbook, co-op<br>pipeline.|
|L|Character/IP|Houses lore, AI teacher characters,<br>companion canon, Charli/Loomi future show<br>bridge.|
|M|QA/Acceptance|Hero Slice tests, RLS tests, safety tests,<br>mission quality tests, load/performance<br>checks.|



## **11.1 Sprint Sequencing** 

|**Sprint**|**Goal**|**Agents**|
|---|---|---|
|Sprint 0 - Alignment|Create CONTEXT.md, architecture.md, ADR<br>index, repo skeleton, contracts, shared<br>vocabulary.|A with all branches reviewing.|
|Sprint 1 - Spine|Build auth/data skeleton, learner profile,<br>curriculum spine, Mission Compiler<br>interfaces,world engine shell.|A, B, C, D, E, F, G.|
|Sprint 2 - Hero Slice Core|Parent setup -> child entry -> Sorting<br>Ceremony -> House/companion -> Mission<br>001 ->evidence-> report.|B, C, D, E, G, I, J, M.|
|Sprint 3 - Living/Network Layer|Shared-room presence, hybrid chat, Moolah,<br>companion growth, House points, world-<br>stateledger.|B, C, D, H, J.|
|Sprint 4 - Trust/GTM Assets|Landing page, demo video script, interactive<br>guided demo, beta application,<br>privacy/consent copy.|I, K, H, A.|
|Sprint 5 - Beta Readiness|QA, performance, moderation tests,<br>onboarding emails, support ops, beta<br>scoring dashboard.|All branches.|



## **12. Agent Execution Contracts** 

## **12.1 Every Agent Must Answer** 

18. What data does this branch create, read, update, or delete? 

19. Who owns the data? 

20. What trust boundary does this branch touch? 

21. What can go wrong for a child, parent, or educator? 

22. What should never happen? 

23. What is parent-visible? 

24. What requires audit logging? 

25. What events does this branch emit? 

26. What tests prove the branch is safe and correct? 

27. Which ADRs/docs does the branch update? 

## **12.2 Required ADR Set** 

- ADR-001-stack.md 

- ADR-002-mvp-identity.md 

- ADR-003-world-rendering.md 

- ADR-004-camera-model.md 

- ADR-005-multiplayer-model.md 

- ADR-006-student-chat-model.md 

- ADR-007-child-identity-model.md 

- ADR-008-parent-visibility-model.md 

- ADR-009-ai-interaction-model.md 

- ADR-010-academic-progress-model.md 

- ADR-011-reward-economy.md 

- ADR-012-parent-curriculum-approval.md 

- ADR-013-standards-model.md 

- ADR-014-mission-compiler-constraint.md 

- ADR-015-conflict-resolution.md 

- ADR-016-mission-output-model.md 

- ADR-017-delivery-mode-control.md 

- ADR-018-core-academy-map.md 

- ADR-019-living-academy-model.md 

- ADR-020-world-state-source-of-truth.md 

- ADR-021-curriculum-grounding-layer.md 

- ADR-022-knowledge-base-v1.md 

- ADR-023-first-build-path.md 

- ADR-024-first-hero-mission.md 

- ADR-025-benchmarking-model.md 

- ADR-026-evidence-capture.md 

- ADR-027-audio-response-model.md 

- ADR-028-ai-model-strategy.md 

- ADR-029-model-improvement-opt-out.md 

- ADR-030-account-ownership-model.md 

- ADR-031-child-session-model.md 

- ADR-032-pricing-model.md 

- ADR-033-founding-pricing.md 

- ADR-034-beta-cohort-model.md 

- ADR-035-beta-audience.md 

- ADR-036-acquisition-strategy.md 

- ADR-037-demo-assets.md 

- ADR-038-landing-positioning.md 

- ADR-039-primary-cta.md 

- ADR-040-beta-application.md 

- ADR-041-beta-scoring.md 

## **13. GTM + Beta Operations** 

## **13.1 Positioning** 

Primary promise: L3ARN helps parents run a personalized AI-powered homeschool while children learn through standardsaware missions inside a living 3D Academy. 

## **13.2 Pricing** 

- Founding Family Beta: $30/month per family. 

- Public launch target: one full-access family subscription around $100-$150/month; recommended starting point $129/month per family. 

- Includes up to two children; additional child add-on recommended at $20/month after beta. 

- Founding families receive a permanent discount after beta, not lifetime $30. 

- Avoid feature-gated tiers early; one price for the whole experience. 

## **13.3 Beta Application + Scoring** 

Use a 10-15 question application to segment families into current homeschool, AI/STEAM-curious, co-op/pod, or consideringleaving-school tracks. Score using a 100-point Founding Family Fit Score. 

|**Scoring Category**|**Points**|
|---|---|
|Homeschool/co-op relevance|0-20|
|AI/STEAM curiosity|0-15|
|Child age fit|0-15|
|Pain urgency|0-15|
|Feedback commitment|0-20|
|3D Academy excitement|0-10|
|Inner Circle potential|0-5|



## **13.4 Acquisition Channels** 

- Local physical trust-building events: homeschool meetups, library demos, STEAM nights, co-op visits, community workshops. 

- Online homeschool communities: Facebook groups, forums, local homeschool groups, AI parenting groups, STEAM education groups. 

- Direct co-op/microschool outreach: demo calls and group pilot offers. 

- Paid ads after demo assets are strong. 

- Charli/Loomi show funnel later, after the Hero Slice visually proves the product. 

## **14. Demo Asset Stack** 

|**Asset**|**Purpose**|**Status**|
|---|---|---|
|Landing page|Explain L3ARN, capture beta applications,<br>show trust and promise.|Build for beta.|
|Hero Slice demo video|2-4 minute walkthrough: parent setup, child<br>enters Academy, Sorting, mission, reward,<br>report.|Build before outreach scale.|
|Interactive guided demo|Sample child profile, guided Academy flow,<br>fake data only, CTA at end.|Build for events/co-ops.|
|Charli/Loomi trailer|Emotional kid-pull and show/product bridge.|Later, after product demo is strong.|



## **15. Build Acceptance Tests** 

- Parent can create account and child profile. 

- Parent can set consent, AI, audio, chat, model improvement, and delivery-mode controls. 

- Child can enter through parent-launched or trusted avatar/PIN session. 

- Child can enter true 3D Great Hall with Sims-style camera and click/tap movement. 

- Sorting Computer ceremony runs and writes learner-profile calibration events. 

- Child can choose House, companion, and Academy Display Name. 

- Mission Compiler generates Mission 001 with parent plan and student delivery modes. 

- Child can complete Mission 001 in at least 3D and simplified mode. 

- System stores structured evidence events and generates at least one parent-visible highlight. 

- Moolah/XP/companion/House rewards update through ledger rules. 

- World-state event writes to Supabase and broadcasts through Railway. 

- Parent receives Unified First Learning Map. 

- Hybrid chat rules enforce no DMs, no links, no external contact, parent-visible logs. 

- RLS prevents child session from accessing parent dashboard or sibling/other-child data. 

- Model-improvement opt-out excludes child from broader learning intelligence datasets. 

- No webcam, face capture, facial recognition, or always-on audio exists anywhere in the product. 

## **16. Immediate Next Actions for Parallel Agents** 

28. Create repository skeleton and docs folder with CONTEXT.md, architecture.md, ADR index, and sprint map. 

29. Create Supabase migrations for identity, consent, child profiles, learner model, world state, mission, evidence, and rewards tables. 

30. Implement RLS policies before any UI is considered complete. 

31. Build Next.js app shell with parent dashboard route, student route, landing page route, and demo route. 

32. Build R3F Great Hall proof scene with camera, click-to-move, avatar placeholder, companion placeholder, and Sorting Computer object. 

33. Build Railway realtime service with room join/leave, presence, simple movement event, and world-state event broadcast. 

34. Build Mission Compiler v0 with hardcoded Mission 001 template grounded to Knowledge Base v1 spine. 

35. Build parent onboarding controls and consent screens. 

36. Build Sorting Ceremony and learner calibration event capture. 

37. Build Unified First Learning Map report with evidence highlights using structured events/replay placeholders. 

38. Build beta landing page and application form with Fit Score logic. 

39. Prepare Hero Slice demo script and interactive guided demo plan. 

## **17. Sources and Reference Notes** 

|**Source**|**Use in Blueprint**|**URL**|
|---|---|---|
|FTC COPPA Rule|COPPA imposes requirements on operators<br>of websites/online services directed to<br>children under 13 or with actual knowledge<br>of collecting personal information from<br>children under 13.|https://www.ftc.gov/legal-library/browse/<br>rules/childrens-online-privacy-protection-<br>rule-coppa|
|FTC 2025 COPPA update|FTC announced final changes to COPPA in<br>2025, including limiting companies ability to<br>monetize kids data and emphasizing<br>verifiable parental consent and data limits.|https://www.ftc.gov/news-events/news/<br>press-releases/2025/01/ftc-finalizes-<br>changes-childrens-privacy-rule-limiting-<br>companies-ability-monetize-kids-data|
|U.S. Department of Education Student<br>Privacy Policy Office|SPPO administers and enforces student<br>privacy laws including FERPA and PPRA<br>and provides technical assistance.|https://www.ed.gov/about/ed-offices/opepd/<br>student-privacy-policy-office|
|StudentPrivacy.ed.gov Guidance|Provides FERPA-related guidance, including<br>de-identification resources.|https://studentprivacy.ed.gov/guidance|
|CPALMS|Florida official source for standards<br>information and course descriptions.|https://www.cpalms.org/|
|Florida Department of Education Standards|States CPALMS is the official source for<br>Florida standards across subject areas and<br>grade levels.|https://www.fldoe.org/academics/standards/|
|Florida Parent Home Education Resources|Describes parent home education<br>responsibilities, including notice, annual<br>evaluation, and termination.|https://www.fldoe.org/schools/school-<br>choice/home-edu/parent-resources.stml|
|Florida Statute 1002.41|Home education statute and annual<br>evaluation/portfolio requirements.|https://www.leg.state.fl.us/Statutes/<br>index.cfm?<br>App_mode=Display_Statute&URL=1000-<br>1099%2F1002%2FSections%2F1002.41.ht<br>ml|



Note: The product plan also incorporates the user-provided mentor transcript describing browser-based 3D museum/game demos and the strategic pivot toward a true 3D Academy experience. 

