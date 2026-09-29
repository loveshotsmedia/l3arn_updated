# L3ARN COMPLETE BUILD — START HERE

**Branch:** `goal/complete-l3arn`  
**Purpose:** Single entry point for any coding agent taking over L3ARN.  
**Status:** Planning bundle is complete. Implementation begins only when the founder says **EXECUTE THE BUILD**.

## 1. First instruction to the coding agent

Read this file first. Then read the following in order:

1. `docs/L3ARN_MASTER_GOAL.md`
2. `docs/L3ARN_1_TO_63_EXECUTION_PLAN.md`
3. `docs/L3ARN_COMPLETE_BUILD_PLAN.md`
4. `docs/L3ARN_COMPLETE_BUILD_ASSESSMENT.md`
5. `docs/L3ARN_GAME_EXPERIENCE_BIBLE.md`
6. `docs/L3ARN_WORLD_ARCHITECTURE.md`
7. `docs/L3ARN_ASSET_MANIFEST.md`
8. `docs/L3ARN_ASSET_FACTORY.md`
9. `docs/L3ARN_3D_WORLD_IMPLEMENTATION_SPEC.md`
10. `docs/L3ARN_FOUNDER_DECISIONS.md`
11. `docs/CODEX_HANDOFF.md`
12. `docs/CONTEXT.md`
13. `docs/architecture.md`
14. `docs/ADR/ADR-000-index.md`
15. `docs/agent_operating_rules.md`
16. `docs/shared_contracts_spec.md`
17. `docs/supabase_schema.md`
18. `docs/supabase_rls_policy_plan.md`
19. `docs/HERO_SLICE_PHASE_C_HANDOFF.md`
20. `docs/AI_HARDENING_BACKLOG.md`
21. `docs/superpowers/plans/agent-19-ai-reliability-hardening.md`
22. `docs/superpowers/plans/agent-20-safety-containment-enforcement.md`
23. `docs/superpowers/plans/agent-21-parent-safety-flags-report-trust.md`
24. `docs/superpowers/plans/agent-22-demo-feedback-capture.md`
25. `docs/superpowers/plans/agent-23-beta-readiness-checklist.md`
26. `docs/references/README.md`

Then inspect the actual repository and latest `origin/main` before modifying code.

## 2. Source-of-truth hierarchy

When documents conflict, use this order:

1. latest production code + migrations + tests
2. explicit founder decisions in `L3ARN_FOUNDER_DECISIONS.md`
3. `L3ARN_MASTER_GOAL.md`
4. `L3ARN_1_TO_63_EXECUTION_PLAN.md`
5. `L3ARN_COMPLETE_BUILD_PLAN.md`
6. architecture/ADR/shared contracts
7. older handoffs and historical plans

Do not let stale historical docs override current production reality.

## 3. Current product direction

The child experience must become a **premium stylized-realism first-person 3D educational adventure**.

The world is the primary interface.

Do not turn the child product into SaaS.

Do not solve gameplay with more cards, forms, long paragraphs, or giant empty screens.

Preserve:
- parent governance
- backend-mediated child sessions
- four Houses only
- child final House choice
- transfer-locked Houses
- companion identity
- evidence/mastery/calibration/rewards
- RLS
- safe AI validation/fallback
- safety and privacy boundaries

## 4. Execution rule

`docs/L3ARN_1_TO_63_EXECUTION_PLAN.md` is the sequential execution index.

`docs/L3ARN_COMPLETE_BUILD_PLAN.md` contains the detailed implementation specification for each task.

For every numbered task:
1. confirm dependencies
2. create a bounded branch/worktree from current `origin/main`
3. implement only that task
4. run relevant automated tests
5. perform real-browser QA for child-facing work
6. capture screenshots/video where required
7. compare against the visual target
8. open PR
9. verify gates
10. merge only when gates pass

Parallel work is allowed only where the 1-to-63 plan marks tasks parallel-safe.

## 5. Asset rule

Do not default to purchasing assets.

Order:
1. image generation / concept generation
2. procedural creation
3. bespoke 3D creation/conversion
4. properly licensed free/CC0 assets
5. paid assets only after explicit founder approval

Do not let asset packs define L3ARN's visual identity.

## 6. Visual references

The original analyzed reference video was:

`GPT-6 Astra Is Finally Here (And It's REALLY Good) - Matt Wolfe (1080p).mp4`

The repo does not require the full video binary to execute the plan. The derived visual/gameplay requirements are captured in:
- `L3ARN_3D_WORLD_IMPLEMENTATION_SPEC.md`
- `L3ARN_GAME_EXPERIENCE_BIBLE.md`
- `docs/references/README.md`

If target screenshots are later added to `docs/references/target/`, treat them as quality/game-feel references, not exact art-style copies.

## 7. Start command

After reading the bundle and confirming the branch/repo state, the coding agent should wait for:

**EXECUTE THE BUILD**

Then begin with Task 1 in `L3ARN_1_TO_63_EXECUTION_PLAN.md`, respecting parallel groups and founder-decision gates.

## 8. Stop conditions

Stop and ask the founder only if:
- a founder decision is explicitly required
- a safety/architecture conflict is discovered
- external credentials/access block the task
- a paid purchase is required

Otherwise continue through the plan.
