# AGENTS.md — L3ARN Complete Build

## Read this first

You are working on the complete L3ARN build.

Before modifying code, read:

1. `docs/START_HERE_COMPLETE_BUILD.md`
2. `docs/L3ARN_MASTER_GOAL.md`
3. `docs/L3ARN_1_TO_63_EXECUTION_PLAN.md`
4. `docs/L3ARN_COMPLETE_BUILD_PLAN.md`
5. `docs/L3ARN_COMPLETE_BUILD_ASSESSMENT.md`
6. `docs/L3ARN_GAME_EXPERIENCE_BIBLE.md`
7. `docs/L3ARN_WORLD_ARCHITECTURE.md`
8. `docs/L3ARN_ASSET_MANIFEST.md`
9. `docs/L3ARN_ASSET_FACTORY.md`
10. `docs/L3ARN_3D_WORLD_IMPLEMENTATION_SPEC.md`
11. `docs/L3ARN_FOUNDER_DECISIONS.md`

Then follow the complete reading order in `docs/START_HERE_COMPLETE_BUILD.md`.

## Current execution model

- `docs/L3ARN_1_TO_63_EXECUTION_PLAN.md` is the numbered build sequence.
- `docs/L3ARN_COMPLETE_BUILD_PLAN.md` is the detailed technical source of truth for each task.
- `docs/L3ARN_FOUNDER_DECISIONS.md` overrides older conflicting planning prose.
- Use the latest production code, migrations, tests, and explicit founder decisions over stale historical docs.

## Product target

L3ARN child experience:

**Premium stylized-realism first-person 3D educational adventure.**

The world is the interface.

Do not turn the child experience into SaaS.

Preserve parent governance, child safety, RLS, backend-mediated child sessions, four Houses, child final House choice, companion identity, evidence/mastery/calibration/rewards, validated AI output, and safe fallback.

## Build command

Do not begin broad implementation until the founder says:

**EXECUTE THE BUILD**

After that:
- begin with Task 1 in `docs/L3ARN_1_TO_63_EXECUTION_PLAN.md`
- respect dependencies and parallel groups
- use bounded branches/PRs
- run automated tests
- perform real-browser QA for child-facing work
- capture visual evidence
- do not mark a feature complete on code/tests alone

## Stop conditions

Stop and ask only if:
1. a founder decision is required
2. a safety/architecture conflict is discovered
3. external credentials/access block progress
4. a paid purchase is required

Otherwise continue through the plan.
