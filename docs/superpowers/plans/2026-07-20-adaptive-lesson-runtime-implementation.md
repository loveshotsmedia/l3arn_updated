# Adaptive Lesson Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Mission 001's hardcoded, no-fail gameplay steps with a real, adaptive lesson runtime that renders genuine discrimination + transfer tasks from the sub-project 1 content contract, using hand-authored fixture content (no live AI generation yet — that's sub-project 4).

**Architecture:** A new Railway route (`GET /api/student/mission/:missionId/lesson`) serves a fixed, ordered sequence of `{skeleton, fill}` pairs built from hand-authored fixtures in `@l3arn/mission-compiler`. The frontend's existing phase state machine in `page.tsx` stays the same shape; its `step` phase renders from two shared, data-driven components (`SortTrayTask` for the color-sort discrimination pattern, `OptionListTask` for choice/apply-to-new/ai-mistake-check — all four task types share the identical `correctItem`/`distractorItems`/`transferItem` data shape from sub-project 1, so they need only two visual treatments, not four separate components). A hint button and a speaker/TTS button are shared across both. An exit button persists the current task index for resume.

**Tech Stack:** Next.js App Router (React, inline styles matching the existing file's convention), Express (Railway), Supabase (Postgres + RLS), Zod, Vitest + @testing-library/react (new — apps/web currently has zero test infrastructure), Jest (existing, mission-compiler).

---

## Before you start: two things this plan corrects from the spec

1. **Sort task shape.** The spec's mockup showed one big mixed tray with a free choice of item AND bin. The already-merged `SkeletonFill` contract from sub-project 1 (`correctItem` + `distractorItems` + `transferItem`) only models "pick the one right answer among wrong ones" — it has no concept of "which bin did they choose." This plan reframes the sort task as **3 task instances** (find the red one / find the blue one / find the green one — mirroring today's existing 3 crystal-sort steps), each a single-target selection among a mixed tray of distractor colors. This preserves every property that was actually approved (tap not drag, real distractors, color+label+icon-redundant target banner, large touch targets, genuine wrong-answer-possible) without reopening sub-project 1's contract.
2. **No real calibration signal exists yet.** Nothing in the codebase computes a VARK learning-style or reading-tier value today (confirmed by inspecting `startMission` and `house_calling_signals` — the latter stores House Calling trait scores, not a VARK classification). The new `/lesson` route therefore resolves a **fixed default variant-key** (`learningStyle: "reading-writing"`, `readingTier: "grade-level"`) rather than pretending to read a signal that doesn't exist. The route is structured so swapping in a real calibration-derived signal later is a one-line change, not a rewrite.

---

### Task 1: Shared-types — evidence capture types + mission-lesson response schema

**Files:**
- Modify: `packages/shared-types/src/evidence.schema.ts`
- Create: `packages/shared-types/src/lesson-runtime.schema.ts`
- Modify: `packages/shared-types/src/index.ts`

- [x] **Step 1: Add the two new evidence capture types**

In `packages/shared-types/src/evidence.schema.ts`, find:

```ts
export const EvidenceCaptureTypeSchema = z.enum([
  "decision-log",        // structured record of choices made during a mission task
  "sequence-completion", // ordered task completion record
  "ai-mistake-check",    // student identifies/corrects an AI error (Mission 001)
  "explanation",         // student explains a concept in their own words
  "reflection",          // post-mission reflection prompt response
  "artifact-upload",     // parent/student uploads external work product
  "audio-response",      // push-to-talk response; parent must have enabled audio (ADR-027)
  "structured-replay",   // system-generated replay of mission interaction steps
  "screenshot",          // 3D scene screenshot; no face data, no webcam
]);
```

Change it to:

```ts
export const EvidenceCaptureTypeSchema = z.enum([
  "decision-log",        // structured record of choices made during a mission task
  "sequence-completion", // ordered task completion record
  "ai-mistake-check",    // student identifies/corrects an AI error (Mission 001)
  "explanation",         // student explains a concept in their own words
  "reflection",          // post-mission reflection prompt response
  "artifact-upload",     // parent/student uploads external work product
  "audio-response",      // push-to-talk response; parent must have enabled audio (ADR-027)
  "structured-replay",   // system-generated replay of mission interaction steps
  "screenshot",          // 3D scene screenshot; no face data, no webcam
  "discrimination-check", // student chose correctly among genuine wrong options (sort/choice tasks)
  "transfer-check",       // student applied a learned rule to a novel, unseen example
]);
```

- [x] **Step 2: Create the mission-lesson response schema**

Create `packages/shared-types/src/lesson-runtime.schema.ts`:

```ts
/**
 * Mission Lesson Response Contract
 *
 * The shape returned by GET /api/student/mission/:missionId/lesson — an
 * ordered sequence of skeleton+fill pairs the adaptive lesson runtime
 * renders. Sub-project 2 of the lesson-engine redesign.
 *
 * Grounded in: docs/superpowers/specs/2026-07-20-adaptive-lesson-runtime-design.md
 */

import { z } from "zod";
import { LessonTaskSkeletonSchema, SkeletonFillSchema } from "./lesson-skeleton.schema";

export const MissionLessonTaskSchema = z.object({
  taskInstanceId: z.string().min(1),
  skeleton: LessonTaskSkeletonSchema,
  fill: SkeletonFillSchema,
});
export type MissionLessonTask = z.infer<typeof MissionLessonTaskSchema>;

export const MissionLessonResponseSchema = z.object({
  missionId: z.string().min(1),
  missionAttemptId: z.string().uuid(),
  tasks: z.array(MissionLessonTaskSchema).min(1),
  resumeFromTaskIndex: z.number().int().min(0),
});
export type MissionLessonResponse = z.infer<typeof MissionLessonResponseSchema>;
```

- [x] **Step 3: Export from the package index**

In `packages/shared-types/src/index.ts`, add after the `lesson-skeleton.schema` export block:

```ts
// ── Mission lesson runtime response (sub-project 2) ───────────────────────────
export * from "./lesson-runtime.schema";
```

- [x] **Step 4: Typecheck and build**

Run:
```bash
CI=true pnpm --filter @l3arn/shared-types typecheck
CI=true pnpm --filter @l3arn/shared-types build
```
Expected: both clean.

- [x] **Step 5: Commit**

```bash
git add packages/shared-types/src/evidence.schema.ts packages/shared-types/src/lesson-runtime.schema.ts packages/shared-types/src/index.ts
git commit -m "feat(shared-types): add discrimination/transfer evidence types and mission-lesson response schema"
```

---

### Task 2: Supabase migration — evidence type constraint + resume column

**Files:**
- Create: `supabase/migrations/014_lesson_runtime_evidence_and_resume.sql`

- [x] **Step 1: Write the migration**

Read `supabase/migrations/008_mission_runtime_companion.sql` first for the `mission_attempts` table shape and update-trigger convention (already read during planning — the table has no `current_task_index` column today).

Create `supabase/migrations/014_lesson_runtime_evidence_and_resume.sql`:

```sql
-- =============================================================================
-- L3ARN Migration 014 — Adaptive Lesson Runtime: evidence types + resume
-- =============================================================================
-- Domain: Evidence/Reports (extends Migration 005), Mission Runtime (extends 008)
--
-- Grounded in:
--   docs/superpowers/specs/2026-07-20-adaptive-lesson-runtime-design.md
--   (sub-project 2 of the lesson-engine redesign)
--
-- WHAT THIS ADDS:
--   1. Extends learning_evidence_events.event_type CHECK constraint with
--      'discrimination-check' and 'transfer-check' (mirrors the shared-types
--      EvidenceCaptureTypeSchema addition — this migration and that TS change
--      must stay in lockstep).
--   2. Adds mission_attempts.current_task_index so a child who exits mid-mission
--      resumes from the same task instead of restarting (previously there was
--      no exit affordance at all during gameplay).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Extend the evidence event_type constraint
-- ---------------------------------------------------------------------------

ALTER TABLE public.learning_evidence_events
  DROP CONSTRAINT learning_evidence_events_event_type_check;

ALTER TABLE public.learning_evidence_events
  ADD CONSTRAINT learning_evidence_events_event_type_check
  CHECK (event_type IN (
    'decision-log',
    'sequence-completion',
    'ai-mistake-check',
    'explanation',
    'reflection',
    'artifact-upload',
    'audio-response',
    'structured-replay',
    'screenshot',
    'discrimination-check',
    'transfer-check'
  ));

-- ---------------------------------------------------------------------------
-- 2. Resume support on mission_attempts
-- ---------------------------------------------------------------------------

ALTER TABLE public.mission_attempts
  ADD COLUMN IF NOT EXISTS current_task_index integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.mission_attempts.current_task_index IS
  'Index into the lesson task sequence (GET .../lesson tasks[]) the child was '
  'on when they last exited. 0 = has not started any task yet. Written by '
  'service_role only (Railway), on exit and on task-advance.';

COMMIT;
```

- [x] **Step 2: Apply the migration**

Run: `supabase db push`
Expected: migration `014_lesson_runtime_evidence_and_resume` applies with no errors.

- [x] **Step 3: Verify**

Query to confirm the constraint and column landed:
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'learning_evidence_events_event_type_check';

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'mission_attempts' AND column_name = 'current_task_index';
```
Expected: constraint definition includes `discrimination-check` and `transfer-check`; column exists, type `integer`, default `0`.

- [x] **Step 4: Commit**

```bash
git add supabase/migrations/014_lesson_runtime_evidence_and_resume.sql
git commit -m "feat(db): extend evidence event_type constraint and add mission_attempts resume column"
```

---

### Task 3: Ai-workers — accept the new evidence types at the API boundary

**Files:**
- Modify: `services/ai-workers/src/routes/mission-runtime.route.ts:118-128`

This is necessary because this route validates `evidenceCaptureType` against its own inline Zod enum — a duplicate of `@l3arn/shared-types`'s `EvidenceCaptureTypeSchema`, not an import of it. Missing this step means Task 1's new evidence types would be silently rejected by `validateBody` at the API boundary even though the DB and shared-types both accept them.

- [x] **Step 1: Extend the inline enum**

In `services/ai-workers/src/routes/mission-runtime.route.ts`, find:

```ts
const EvidenceCaptureRequestSchema = z.object({
  missionAttemptId: z.string().uuid(),
  taskId: z.string().min(1).max(100),
  evidenceCaptureType: z.enum([
    "decision-log",
    "sequence-completion",
    "ai-mistake-check",
    "explanation",
    "reflection",
    "structured-replay",
    "artifact-upload",
    "audio-response",
    "screenshot",
  ]),
  contentJson: z.record(z.unknown()).optional().default({}),
});
```

Change the `evidenceCaptureType` enum to:

```ts
  evidenceCaptureType: z.enum([
    "decision-log",
    "sequence-completion",
    "ai-mistake-check",
    "explanation",
    "reflection",
    "structured-replay",
    "artifact-upload",
    "audio-response",
    "screenshot",
    "discrimination-check",
    "transfer-check",
  ]),
```

- [x] **Step 2: Typecheck**

Run: `CI=true pnpm --filter @l3arn/ai-workers typecheck`
Expected: clean.

- [x] **Step 3: Commit**

```bash
git add services/ai-workers/src/routes/mission-runtime.route.ts
git commit -m "feat(ai-workers): accept discrimination-check and transfer-check at the evidence API boundary"
```

---

### Task 4: Mission-compiler — sort-categorize fixture (skeleton + 3 fills)

**Files:**
- Create: `packages/mission-compiler/src/curriculum/skeletons/sort-color-crystals.skeleton.ts`
- Test: `packages/mission-compiler/src/curriculum/skeletons/sort-color-crystals.skeleton.test.ts`

The skeleton's rule is deliberately generic (`isTargetMatch === true`) rather than hardcoded to one color, because `lesson_task_skeletons` has a `UNIQUE (mastery_skill_id, l3arn_mastery_level, task_type)` constraint — only one `sort-categorize` row can exist for this skill/level. The three color "rounds" (red/blue/green) are three different `SkeletonFill`s validated against this one skeleton; which color is the actual target for a given round lives in the fill's presentation content (`storyFlavor`), not in the rule.

- [x] **Step 1: Write the failing test**

Create `packages/mission-compiler/src/curriculum/skeletons/sort-color-crystals.skeleton.test.ts`:

```ts
import { validateSkeletonFill } from "../../validation/skeleton-fill-gate";
import {
  SORT_COLOR_CRYSTALS_SKELETON,
  SORT_COLOR_CRYSTALS_SKELETON_FIXTURE_ID,
  SORT_ROUND_RED_FILL,
  SORT_ROUND_BLUE_FILL,
  SORT_ROUND_GREEN_FILL,
} from "./sort-color-crystals.skeleton";

describe("SORT_COLOR_CRYSTALS_SKELETON (worked example)", () => {
  it("is a valid LessonTaskSkeleton with task type sort-categorize", () => {
    expect(SORT_COLOR_CRYSTALS_SKELETON.taskType).toBe("sort-categorize");
    expect(SORT_COLOR_CRYSTALS_SKELETON.hintLadder).toHaveLength(3);
  });

  it("the red round fixture passes the correctness gate", () => {
    const result = validateSkeletonFill(SORT_COLOR_CRYSTALS_SKELETON, SORT_ROUND_RED_FILL);
    expect(result).toEqual({ valid: true, failures: [] });
  });

  it("the blue round fixture passes the correctness gate", () => {
    const result = validateSkeletonFill(SORT_COLOR_CRYSTALS_SKELETON, SORT_ROUND_BLUE_FILL);
    expect(result).toEqual({ valid: true, failures: [] });
  });

  it("the green round fixture passes the correctness gate", () => {
    const result = validateSkeletonFill(SORT_COLOR_CRYSTALS_SKELETON, SORT_ROUND_GREEN_FILL);
    expect(result).toEqual({ valid: true, failures: [] });
  });

  it("each round's correctItem carries the announced target color as a rendering attribute", () => {
    expect(SORT_ROUND_RED_FILL.correctItem.attributes.color).toBe("red");
    expect(SORT_ROUND_BLUE_FILL.correctItem.attributes.color).toBe("blue");
    expect(SORT_ROUND_GREEN_FILL.correctItem.attributes.color).toBe("green");
  });

  it("fails the gate if a distractor is mislabeled as matching the target (hallucinated-fill guard)", () => {
    const badFill = {
      ...SORT_ROUND_RED_FILL,
      distractorItems: [
        { ...SORT_ROUND_RED_FILL.distractorItems[0], attributes: { color: "blue", isTargetMatch: true } },
        SORT_ROUND_RED_FILL.distractorItems[1],
      ],
    };
    const result = validateSkeletonFill(SORT_COLOR_CRYSTALS_SKELETON, badFill);
    expect(result.valid).toBe(false);
    expect(result.failures.map((f) => f.code)).toContain("distractor-satisfies-rule");
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `CI=true pnpm --filter @l3arn/mission-compiler test -- sort-color-crystals`
Expected: FAIL — `Cannot find module './sort-color-crystals.skeleton'`

- [x] **Step 3: Write the implementation**

Create `packages/mission-compiler/src/curriculum/skeletons/sort-color-crystals.skeleton.ts`:

```ts
/**
 * Worked example skeleton — Mission 001's color-sort discrimination task.
 * Replaces the intent of the current hardcoded, no-fail CrystalSortStep
 * (a single "Blue Bin — click to sort" button) with a rule-checkable
 * skeleton where a wrong answer is genuinely possible.
 *
 * Concept: a tray shows crystals of several colors; the child is told which
 * color bin needs a crystal and must pick the one that matches, out of a
 * mixed tray of distractor colors. Real discrimination (multiple colors
 * visible at once), targeting REASONING.USE_EVIDENCE_TO_DECIDE — "uses
 * available evidence [color] to decide, rather than guessing."
 *
 * The rule is deliberately generic (isTargetMatch === true), not hardcoded
 * to one color, because lesson_task_skeletons has a UNIQUE
 * (mastery_skill_id, l3arn_mastery_level, task_type) constraint — only one
 * sort-categorize row can exist for this skill/level. Three color "rounds"
 * (red/blue/green) are three different SkeletonFills validated against this
 * one skeleton; which color is the target for a given round lives in the
 * fill's presentation content, not in the rule.
 *
 * masterySkillId below is a fixture placeholder for offline unit tests only
 * — the real skeleton row (with the true mastery_skills.id for
 * REASONING.USE_EVIDENCE_TO_DECIDE) is seeded by a future curriculum
 * migration, following the same pattern as
 * supabase/migrations/013_lesson_task_skeletons.sql's ai-mistake-check seed.
 *
 * Grounded in: docs/superpowers/specs/2026-07-20-adaptive-lesson-runtime-design.md §1.2, §2.1
 */

import type { LessonTaskSkeleton, SkeletonFill } from "@l3arn/shared-types";

export const SORT_COLOR_CRYSTALS_SKELETON_FIXTURE_ID = "00000000-0000-4000-8000-000000000002";
const PLACEHOLDER_MASTERY_SKILL_ID = "00000000-0000-4000-8000-0000000000f2";

export const SORT_COLOR_CRYSTALS_SKELETON: LessonTaskSkeleton = {
  id: SORT_COLOR_CRYSTALS_SKELETON_FIXTURE_ID,
  masterySkillId: PLACEHOLDER_MASTERY_SKILL_ID,
  l3arnMasteryLevel: "emerging",
  taskType: "sort-categorize",
  correctAnswerRule: { field: "isTargetMatch", op: "eq", value: true },
  distractorRule: {
    count: 2,
    plausibilityRule: { field: "isTargetMatch", op: "eq", value: false },
  },
  transferExampleRule: { field: "isTargetMatch", op: "eq", value: true },
  hintLadder: [
    {
      tier: 1,
      kind: "nudge",
      content: "Look closely at the color of each crystal in the tray.",
      readAloudScript: "Look closely at the color of each crystal in the tray.",
    },
    {
      tier: 2,
      kind: "re-explain",
      content: "Find the crystal whose color matches the bin's color — not the shape, not the size, just the color.",
      readAloudScript: "Find the crystal whose color matches the bin's color. Not the shape, not the size, just the color.",
    },
    {
      tier: 3,
      kind: "state-rule",
      content: "The rule: a crystal belongs in the bin that shares its exact color.",
      readAloudScript: "The rule: a crystal belongs in the bin that shares its exact color.",
    },
  ],
  isActive: true,
  version: 1,
};

function makeRoundFill(color: "red" | "blue" | "green", otherColors: [string, string]): SkeletonFill {
  return {
    skeletonId: SORT_COLOR_CRYSTALS_SKELETON_FIXTURE_ID,
    variantKey: {
      skeletonId: SORT_COLOR_CRYSTALS_SKELETON_FIXTURE_ID,
      learningStyle: "reading-writing",
      readingTier: "grade-level",
      l3arnMasteryLevel: "emerging",
    },
    storyFlavor: `The ${color[0].toUpperCase()}${color.slice(1)} Bin needs a crystal — which one belongs?`,
    correctItem: {
      itemId: `crystal-${color}`,
      attributes: { color, isTargetMatch: true },
      presentationText: `A ${color} crystal.`,
      readAloudScript: `A ${color} crystal.`,
    },
    distractorItems: otherColors.map((c) => ({
      itemId: `crystal-${c}`,
      attributes: { color: c, isTargetMatch: false },
      presentationText: `A ${c} crystal.`,
      readAloudScript: `A ${c} crystal.`,
    })),
    transferItem: {
      itemId: `crystal-${color}-2`,
      attributes: { color, isTargetMatch: true },
      presentationText: `A NEW ${color} crystal — does it belong in the ${color} bin?`,
      readAloudScript: `A new ${color} crystal. Does it belong in the ${color} bin?`,
    },
    hintLadderFill: SORT_COLOR_CRYSTALS_SKELETON.hintLadder,
    companionDialogueLine: `Look closely — which crystal matches the ${color} bin?`,
  };
}

export const SORT_ROUND_RED_FILL: SkeletonFill = makeRoundFill("red", ["blue", "green"]);
export const SORT_ROUND_BLUE_FILL: SkeletonFill = makeRoundFill("blue", ["red", "green"]);
export const SORT_ROUND_GREEN_FILL: SkeletonFill = makeRoundFill("green", ["red", "blue"]);
```

- [x] **Step 4: Run the test to verify it passes**

Run: `CI=true pnpm --filter @l3arn/mission-compiler test -- sort-color-crystals`
Expected: PASS, all 5 tests green.

- [x] **Step 5: Commit**

```bash
git add packages/mission-compiler/src/curriculum/skeletons/sort-color-crystals.skeleton.ts packages/mission-compiler/src/curriculum/skeletons/sort-color-crystals.skeleton.test.ts
git commit -m "feat(mission-compiler): add color-sort discrimination skeleton with 3 round fixtures"
```

---

### Task 5: Mission-compiler — apply-to-new fixture (transfer check)

**Files:**
- Create: `packages/mission-compiler/src/curriculum/skeletons/apply-to-new-color.skeleton.ts`
- Test: `packages/mission-compiler/src/curriculum/skeletons/apply-to-new-color.skeleton.test.ts`

- [x] **Step 1: Write the failing test**

Create `packages/mission-compiler/src/curriculum/skeletons/apply-to-new-color.skeleton.test.ts`:

```ts
import { validateSkeletonFill } from "../../validation/skeleton-fill-gate";
import {
  APPLY_TO_NEW_COLOR_SKELETON,
  APPLY_TO_NEW_COLOR_SKELETON_FIXTURE_ID,
  APPLY_TO_NEW_COLOR_FILL,
} from "./apply-to-new-color.skeleton";

describe("APPLY_TO_NEW_COLOR_SKELETON (worked example)", () => {
  it("is a valid LessonTaskSkeleton with task type apply-to-new", () => {
    expect(APPLY_TO_NEW_COLOR_SKELETON.taskType).toBe("apply-to-new");
  });

  it("the fixture fill passes the correctness gate", () => {
    const result = validateSkeletonFill(APPLY_TO_NEW_COLOR_SKELETON, APPLY_TO_NEW_COLOR_FILL);
    expect(result).toEqual({ valid: true, failures: [] });
  });

  it("the transfer item uses a color never shown in the teaching tray (genuine novelty)", () => {
    const trayColors = [
      APPLY_TO_NEW_COLOR_FILL.correctItem.attributes.color,
      ...APPLY_TO_NEW_COLOR_FILL.distractorItems.map((d) => d.attributes.color),
    ];
    expect(trayColors).not.toContain(APPLY_TO_NEW_COLOR_FILL.transferItem.attributes.color);
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `CI=true pnpm --filter @l3arn/mission-compiler test -- apply-to-new-color`
Expected: FAIL — `Cannot find module './apply-to-new-color.skeleton'`

- [x] **Step 3: Write the implementation**

Create `packages/mission-compiler/src/curriculum/skeletons/apply-to-new-color.skeleton.ts`:

```ts
/**
 * Worked example skeleton — the transfer check following the color-sort
 * rounds (sort-color-crystals.skeleton.ts). Tests whether the child
 * generalized "match by color" as a rule, using a purple crystal — a color
 * never shown during the red/blue/green teaching rounds — rather than
 * memorizing the three specific gems already seen.
 *
 * Grounded in: docs/superpowers/specs/2026-07-19-lesson-engine-content-contract-design.md §1
 * (the effectiveness bar: discrimination + transfer to a genuinely new example)
 */

import type { LessonTaskSkeleton, SkeletonFill } from "@l3arn/shared-types";
import { SORT_COLOR_CRYSTALS_SKELETON } from "./sort-color-crystals.skeleton";

export const APPLY_TO_NEW_COLOR_SKELETON_FIXTURE_ID = "00000000-0000-4000-8000-000000000003";
const PLACEHOLDER_MASTERY_SKILL_ID = "00000000-0000-4000-8000-0000000000f2";

export const APPLY_TO_NEW_COLOR_SKELETON: LessonTaskSkeleton = {
  id: APPLY_TO_NEW_COLOR_SKELETON_FIXTURE_ID,
  masterySkillId: PLACEHOLDER_MASTERY_SKILL_ID,
  l3arnMasteryLevel: "emerging",
  taskType: "apply-to-new",
  correctAnswerRule: { field: "isTargetMatch", op: "eq", value: true },
  distractorRule: {
    count: 2,
    plausibilityRule: { field: "isTargetMatch", op: "eq", value: false },
  },
  transferExampleRule: { field: "isTargetMatch", op: "eq", value: true },
  hintLadder: SORT_COLOR_CRYSTALS_SKELETON.hintLadder,
  isActive: true,
  version: 1,
};

export const APPLY_TO_NEW_COLOR_FILL: SkeletonFill = {
  skeletonId: APPLY_TO_NEW_COLOR_SKELETON_FIXTURE_ID,
  variantKey: {
    skeletonId: APPLY_TO_NEW_COLOR_SKELETON_FIXTURE_ID,
    learningStyle: "reading-writing",
    readingTier: "grade-level",
    l3arnMasteryLevel: "emerging",
  },
  storyFlavor: "A brand-new crystal appeared. The Purple Bin needs a crystal — which one belongs?",
  correctItem: {
    itemId: "crystal-purple",
    attributes: { color: "purple", isTargetMatch: true },
    presentationText: "A purple crystal.",
    readAloudScript: "A purple crystal.",
  },
  distractorItems: [
    {
      itemId: "crystal-red-2",
      attributes: { color: "red", isTargetMatch: false },
      presentationText: "A red crystal.",
      readAloudScript: "A red crystal.",
    },
    {
      itemId: "crystal-blue-2",
      attributes: { color: "blue", isTargetMatch: false },
      presentationText: "A blue crystal.",
      readAloudScript: "A blue crystal.",
    },
  ],
  transferItem: {
    itemId: "crystal-purple-2",
    attributes: { color: "purple", isTargetMatch: true },
    presentationText: "Another new purple crystal — does it belong in the purple bin too?",
    readAloudScript: "Another new purple crystal. Does it belong in the purple bin too?",
  },
  hintLadderFill: SORT_COLOR_CRYSTALS_SKELETON.hintLadder,
  companionDialogueLine: "You've never seen this color before — but do you remember the rule?",
};
```

- [x] **Step 4: Run the test to verify it passes**

Run: `CI=true pnpm --filter @l3arn/mission-compiler test -- apply-to-new-color`
Expected: PASS, all 3 tests green.

- [x] **Step 5: Commit**

```bash
git add packages/mission-compiler/src/curriculum/skeletons/apply-to-new-color.skeleton.ts packages/mission-compiler/src/curriculum/skeletons/apply-to-new-color.skeleton.test.ts
git commit -m "feat(mission-compiler): add apply-to-new transfer-check skeleton and fixture"
```

---

### Task 6: Mission-compiler — export the fixtures and the full Mission 001 lesson sequence

**Files:**
- Create: `packages/mission-compiler/src/curriculum/mission-001-lesson-sequence.ts`
- Test: `packages/mission-compiler/src/curriculum/mission-001-lesson-sequence.test.ts`
- Modify: `packages/mission-compiler/src/index.ts`

- [x] **Step 1: Write the failing test**

Create `packages/mission-compiler/src/curriculum/mission-001-lesson-sequence.test.ts`:

```ts
import { validateSkeletonFill } from "../validation/skeleton-fill-gate";
import { MISSION_001_LESSON_SEQUENCE } from "./mission-001-lesson-sequence";

describe("MISSION_001_LESSON_SEQUENCE", () => {
  it("has exactly 5 task instances in the expected order", () => {
    const taskTypes = MISSION_001_LESSON_SEQUENCE.map((t) => t.skeleton.taskType);
    expect(taskTypes).toEqual([
      "sort-categorize",
      "sort-categorize",
      "sort-categorize",
      "apply-to-new",
      "ai-mistake-check",
    ]);
  });

  it("every task instance has a unique taskInstanceId", () => {
    const ids = MISSION_001_LESSON_SEQUENCE.map((t) => t.taskInstanceId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every task instance's fill passes the correctness gate against its own skeleton", () => {
    for (const task of MISSION_001_LESSON_SEQUENCE) {
      const result = validateSkeletonFill(task.skeleton, task.fill);
      expect(result).toEqual({ valid: true, failures: [] });
    }
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `CI=true pnpm --filter @l3arn/mission-compiler test -- mission-001-lesson-sequence`
Expected: FAIL — `Cannot find module './mission-001-lesson-sequence'`

- [x] **Step 3: Write the implementation**

Create `packages/mission-compiler/src/curriculum/mission-001-lesson-sequence.ts`:

```ts
/**
 * Mission 001's fixed lesson task sequence — sub-project 2 (adaptive lesson
 * runtime). This is the fixture-backed content served by
 * GET /api/student/mission/:missionId/lesson, standing in for the real
 * generation pipeline (sub-project 4) until it exists.
 *
 * Order: 3 color-sort discrimination rounds (red, blue, green) → 1
 * apply-to-new transfer check (a novel color) → the existing sub-project 1
 * worked example for the AI-literacy beat.
 *
 * Grounded in: docs/superpowers/specs/2026-07-20-adaptive-lesson-runtime-design.md §1.3
 */

import type { MissionLessonTask } from "@l3arn/shared-types";
import type { SkeletonFill } from "@l3arn/shared-types";
import {
  SORT_COLOR_CRYSTALS_SKELETON,
  SORT_ROUND_RED_FILL,
  SORT_ROUND_BLUE_FILL,
  SORT_ROUND_GREEN_FILL,
} from "./skeletons/sort-color-crystals.skeleton";
import { APPLY_TO_NEW_COLOR_SKELETON, APPLY_TO_NEW_COLOR_FILL } from "./skeletons/apply-to-new-color.skeleton";
import {
  AI_MISTAKE_SHAPE_SIDES_SKELETON,
} from "./skeletons/ai-mistake-shape-sides.skeleton";

// The sub-project 1 worked example didn't export a matching production
// fixture fill (only a test-local makeValidFill() helper) — this fill is
// the real, servable equivalent for this task type.
const AI_MISTAKE_FIXTURE_FILL: SkeletonFill = {
  skeletonId: AI_MISTAKE_SHAPE_SIDES_SKELETON.id,
  variantKey: {
    skeletonId: AI_MISTAKE_SHAPE_SIDES_SKELETON.id,
    learningStyle: "reading-writing",
    readingTier: "grade-level",
    l3arnMasteryLevel: "emerging",
  },
  storyFlavor: "The Sorting Computer studied a glowing crystal and reported its findings to you.",
  correctItem: {
    itemId: "critique-correct",
    attributes: { claimedSides: 5, actualSides: 6 },
    presentationText:
      'The companion said: "This crystal has 5 sides." But count them yourself — it actually has 6. The companion made a mistake!',
    readAloudScript:
      "The companion said this crystal has 5 sides. But if you count them yourself, it actually has 6. The companion made a mistake!",
  },
  distractorItems: [
    {
      itemId: "critique-distractor-a",
      attributes: { claimedSides: 6, actualSides: 6 },
      presentationText: 'The companion said: "This crystal has 6 sides," and it does have 6 sides. That\'s correct, not a mistake.',
      readAloudScript: "The companion said this crystal has 6 sides, and it does have 6 sides. That is correct, not a mistake.",
    },
    {
      itemId: "critique-distractor-b",
      attributes: { claimedSides: 4, actualSides: 4 },
      presentationText: 'The companion said: "This crystal has 4 sides," and it does have 4 sides. That\'s correct, not a mistake.',
      readAloudScript: "The companion said this crystal has 4 sides, and it does have 4 sides. That is correct, not a mistake.",
    },
  ],
  transferItem: {
    itemId: "critique-transfer",
    attributes: { claimedSides: 3, actualSides: 5 },
    presentationText:
      'Now look at this NEW crystal. The companion said: "This one has 3 sides." Count the real crystal — is the companion right this time?',
    readAloudScript:
      "Now look at this new crystal. The companion said this one has 3 sides. Count the real crystal. Is the companion right this time?",
  },
  hintLadderFill: AI_MISTAKE_SHAPE_SIDES_SKELETON.hintLadder,
  companionDialogueLine: "Wait... let's double check my math on that last one!",
};

// Reuses @l3arn/shared-types' MissionLessonTask (the GET .../lesson response
// item shape) rather than declaring a structurally-identical local type —
// this sequence IS served as that response's tasks[], so it should be typed
// as exactly that from the start, not a coincidentally-matching duplicate.
export const MISSION_001_LESSON_SEQUENCE: MissionLessonTask[] = [
  { taskInstanceId: "mission-001-sort-red", skeleton: SORT_COLOR_CRYSTALS_SKELETON, fill: SORT_ROUND_RED_FILL },
  { taskInstanceId: "mission-001-sort-blue", skeleton: SORT_COLOR_CRYSTALS_SKELETON, fill: SORT_ROUND_BLUE_FILL },
  { taskInstanceId: "mission-001-sort-green", skeleton: SORT_COLOR_CRYSTALS_SKELETON, fill: SORT_ROUND_GREEN_FILL },
  { taskInstanceId: "mission-001-apply-to-new", skeleton: APPLY_TO_NEW_COLOR_SKELETON, fill: APPLY_TO_NEW_COLOR_FILL },
  { taskInstanceId: "mission-001-ai-mistake-check", skeleton: AI_MISTAKE_SHAPE_SIDES_SKELETON, fill: AI_MISTAKE_FIXTURE_FILL },
];
```

- [x] **Step 4: Run the test to verify it passes**

Run: `CI=true pnpm --filter @l3arn/mission-compiler test -- mission-001-lesson-sequence`
Expected: PASS, all 3 tests green.

- [x] **Step 5: Export from the package index**

In `packages/mission-compiler/src/index.ts`, add:

```ts
// ── Mission 001 adaptive lesson sequence (sub-project 2) ──────────────────────
export { MISSION_001_LESSON_SEQUENCE } from "./curriculum/mission-001-lesson-sequence";
```

- [x] **Step 6: Full package regression**

Run:
```bash
CI=true pnpm --filter @l3arn/mission-compiler test
CI=true pnpm --filter @l3arn/mission-compiler typecheck
CI=true pnpm --filter @l3arn/mission-compiler build
```
Expected: all test suites pass (should now be 8 suites — the 4 from sub-project 1 plus this task's 3 new fixture files), typecheck and build clean.

- [x] **Step 7: Commit**

```bash
git add packages/mission-compiler/src/curriculum/mission-001-lesson-sequence.ts packages/mission-compiler/src/curriculum/mission-001-lesson-sequence.test.ts packages/mission-compiler/src/index.ts
git commit -m "feat(mission-compiler): assemble and export Mission 001's fixed lesson task sequence"
```

---

### Task 7: Ai-workers — GET /lesson route

**Files:**
- Create: `services/ai-workers/src/missions/mission-lesson.ts`
- Modify: `services/ai-workers/src/routes/mission-runtime.route.ts`

- [x] **Step 1: Write the lesson-fetch logic**

Create `services/ai-workers/src/missions/mission-lesson.ts`:

```ts
/**
 * Mission lesson fetch — sub-project 2 (adaptive lesson runtime).
 *
 * Serves the fixed, hand-authored fixture lesson sequence for a mission
 * attempt. Stands in for the real generation pipeline (sub-project 4).
 *
 * No real learning-style/reading-tier calibration signal exists in the
 * codebase yet (confirmed: startMission's personalization uses grade/house/
 * companion only; house_calling_signals stores trait scores, not a VARK
 * classification) — this resolves a fixed default variant-key rather than
 * pretending to read a signal that doesn't exist. Swapping in a real signal
 * later only touches resolveVariantKey() below.
 *
 * Grounded in: docs/superpowers/specs/2026-07-20-adaptive-lesson-runtime-design.md §1.1
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { MISSION_001_LESSON_SEQUENCE } from "@l3arn/mission-compiler";
import type { MissionLessonResponse } from "@l3arn/shared-types";
import type { ChildSessionRow } from "../lib/child-session";
import { MissionRuntimeError } from "./mission-runtime";

/** No real calibration signal exists yet — see file header. */
function resolveVariantKey() {
  return { learningStyle: "reading-writing" as const, readingTier: "grade-level" as const };
}

const MISSION_LESSON_SEQUENCES: Record<string, typeof MISSION_001_LESSON_SEQUENCE> = {
  "mission-001": MISSION_001_LESSON_SEQUENCE,
};

export async function getMissionLesson(
  supabase: SupabaseClient,
  session: ChildSessionRow,
  missionId: string,
  missionAttemptId: string,
): Promise<MissionLessonResponse> {
  const sequence = MISSION_LESSON_SEQUENCES[missionId];
  if (!sequence) {
    throw new MissionRuntimeError(404, "LESSON_NOT_FOUND", `No lesson sequence configured for mission '${missionId}'.`);
  }

  const { data: attempt, error } = await supabase
    .from("mission_attempts")
    .select("id, current_task_index")
    .eq("id", missionAttemptId)
    .eq("child_profile_id", session.child_profile_id)
    .maybeSingle();

  if (error) {
    throw new MissionRuntimeError(503, "LESSON_LOOKUP_FAILED", "Could not verify mission attempt. Please try again.");
  }
  if (!attempt) {
    throw new MissionRuntimeError(403, "ATTEMPT_NOT_OWNED", "This mission attempt does not belong to your session.");
  }

  // resolveVariantKey() is called for future-compatibility (this is where a
  // real generation pipeline would branch on style/tier); today's fixed
  // fixture sequence doesn't vary by it.
  resolveVariantKey();

  return {
    missionId,
    missionAttemptId,
    tasks: sequence,
    resumeFromTaskIndex: (attempt as { current_task_index: number }).current_task_index,
  };
}

export async function updateMissionTaskIndex(
  supabase: SupabaseClient,
  session: ChildSessionRow,
  missionAttemptId: string,
  taskIndex: number,
): Promise<void> {
  const { error } = await supabase
    .from("mission_attempts")
    .update({ current_task_index: taskIndex })
    .eq("id", missionAttemptId)
    .eq("child_profile_id", session.child_profile_id);

  if (error) {
    throw new MissionRuntimeError(500, "TASK_INDEX_UPDATE_FAILED", "Could not save your progress. Please try again.");
  }
}
```

- [x] **Step 2: Add the routes**

In `services/ai-workers/src/routes/mission-runtime.route.ts`, add the import:

```ts
import { getMissionLesson, updateMissionTaskIndex } from "../missions/mission-lesson";
```

Then add, after the `/complete` route block (before the `// ─── Evidence capture` section):

```ts
/** GET /api/student/mission/:missionId/lesson */
studentMissionRouter.get(
  "/:missionId/lesson",
  async (req: Request, res: Response): Promise<void> => {
    const { missionId } = req.params;
    const missionAttemptId = req.query.missionAttemptId as string | undefined;
    if (!missionAttemptId) {
      res.status(400).json({ error: "MISSING_MISSION_ATTEMPT_ID", message: "missionAttemptId query param is required." });
      return;
    }

    const supabase = serviceClientOr503(res);
    if (!supabase) return;

    const session = await requireChildSession(req, res, supabase);
    if (!session) return;

    try {
      const result = await getMissionLesson(supabase, session, missionId, missionAttemptId);
      res.status(200).json(result);
    } catch (err) {
      if (err instanceof MissionRuntimeError) {
        res.status(err.status).json({ error: err.code, message: err.message });
        return;
      }
      log("error", "GET /:missionId/lesson: unexpected error", {
        childSessionId: session.id,
        error: (err as Error).message,
      });
      res.status(500).json({ error: "LESSON_FETCH_ERROR", message: "Lesson could not be loaded. Please try again." });
    }
  },
);

const UpdateTaskIndexRequestSchema = z.object({
  missionAttemptId: z.string().uuid(),
  taskIndex: z.number().int().min(0),
});

/** POST /api/student/mission/task-index — persists resume position (exit flow) */
studentMissionRouter.post(
  "/task-index",
  validateBody(UpdateTaskIndexRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { missionAttemptId, taskIndex } = req.body as { missionAttemptId: string; taskIndex: number };
    const supabase = serviceClientOr503(res);
    if (!supabase) return;

    const session = await requireChildSession(req, res, supabase);
    if (!session) return;

    try {
      await updateMissionTaskIndex(supabase, session, missionAttemptId, taskIndex);
      res.status(200).json({ ok: true });
    } catch (err) {
      if (err instanceof MissionRuntimeError) {
        res.status(err.status).json({ error: err.code, message: err.message });
        return;
      }
      res.status(500).json({ error: "TASK_INDEX_UPDATE_ERROR", message: "Could not save your progress." });
    }
  },
);
```

- [x] **Step 3: Typecheck**

Run: `CI=true pnpm --filter @l3arn/ai-workers typecheck`
Expected: clean.

- [x] **Step 4: Commit**

```bash
git add services/ai-workers/src/missions/mission-lesson.ts services/ai-workers/src/routes/mission-runtime.route.ts
git commit -m "feat(ai-workers): add GET .../lesson and POST .../task-index routes"
```

---

### Task 8: Apps/web — set up component test infrastructure

**Files:**
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/src/test/setup.ts`
- Modify: `apps/web/package.json`

Apps/web currently has zero test infrastructure (no test script, no test libraries). This is necessary before any task-type renderer component can have a test.

- [x] **Step 1: Add dependencies**

Run:
```bash
CI=true pnpm add -D vitest@^2.1.0 @vitejs/plugin-react@^4.3.0 @testing-library/react@^16.0.0 @testing-library/jest-dom@^6.5.0 jsdom@^25.0.0 --filter @l3arn/web
```

- [x] **Step 2: Create the Vitest config**

Create `apps/web/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.tsx", "src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [x] **Step 3: Create the test setup file**

Create `apps/web/src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [x] **Step 4: Add the test script**

In `apps/web/package.json`, add to `"scripts"`:

```json
    "test": "vitest run"
```

- [x] **Step 5: Verify the setup with a smoke test**

Create `apps/web/src/test/smoke.test.tsx` (temporary — deleted in Step 6):

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

describe("vitest + RTL setup", () => {
  it("renders a basic element", () => {
    render(<div>hello</div>);
    expect(screen.getByText("hello")).toBeInTheDocument();
  });
});
```

Run: `CI=true pnpm --filter @l3arn/web test`
Expected: PASS, 1 test green.

- [x] **Step 6: Delete the smoke test**

```bash
rm apps/web/src/test/smoke.test.tsx
```

- [x] **Step 7: Commit**

```bash
git add apps/web/vitest.config.ts apps/web/src/test/setup.ts apps/web/package.json pnpm-lock.yaml
git commit -m "chore(web): add Vitest + React Testing Library test infrastructure"
```

---

### Task 9: Apps/web — shared task-instance types + student-session fetch functions

**Files:**
- Modify: `apps/web/src/lib/student-session.ts`

- [x] **Step 1: Add the fetch functions**

In `apps/web/src/lib/student-session.ts`, add near `completeMission`:

```ts
import type { MissionLessonResponse } from "@l3arn/shared-types";

/** Fetch the adaptive lesson task sequence for a mission attempt. */
export function fetchMissionLesson(
  missionId: string,
  missionAttemptId: string,
): Promise<ApiOutcome<MissionLessonResponse>> {
  return authedGet<MissionLessonResponse>(
    `/api/student/mission/${missionId}/lesson?missionAttemptId=${encodeURIComponent(missionAttemptId)}`,
  );
}

/** Persist which task the child was on, for resume-on-re-entry. */
export function updateTaskIndex(
  missionAttemptId: string,
  taskIndex: number,
): Promise<ApiOutcome<{ ok: true }>> {
  return authedPost<{ ok: true }>("/api/student/mission/task-index", { missionAttemptId, taskIndex });
}
```

- [x] **Step 2: Add an `authedGet` helper**

No `authedGet` helper exists yet — only `authedPost` (confirmed by reading `apps/web/src/lib/student-session.ts:233-266`). Add this new function immediately after the existing `authedPost` function, mirroring its exact header/token/error-handling pattern:

```ts
async function authedGet<T>(path: string): Promise<ApiOutcome<T>> {
  const base = railwayBaseUrl();
  if (!base) return NOT_CONFIGURED;

  const token = getSessionToken();
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "SESSION_TOKEN_MISSING",
      message: "Your session could not be found. Ask a parent to start a new one.",
    };
  }

  try {
    const res = await fetch(`${base}${path}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const { error, message } = await parseError(res);
      return { ok: false, status: res.status, error, message };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return {
      ok: false,
      status: 0,
      error: "NETWORK_ERROR",
      message: "Could not reach the Academy. Check your connection and try again.",
    };
  }
}
```

- [x] **Step 3: Typecheck**

Run: `CI=true pnpm --filter @l3arn/web typecheck`
Expected: clean.

- [x] **Step 4: Commit**

```bash
git add apps/web/src/lib/student-session.ts
git commit -m "feat(web): add fetchMissionLesson and updateTaskIndex to student-session lib"
```

---

### Task 10: Apps/web — `OptionListTask` component (choice / apply-to-new / ai-mistake-check)

**Files:**
- Create: `apps/web/src/app/(student)/mission/[missionId]/components/OptionListTask.tsx`
- Test: `apps/web/src/app/(student)/mission/[missionId]/components/OptionListTask.test.tsx`

All three of these task types share the identical `correctItem`/`distractorItems` data shape and the "pick the right one from a list" interaction — this is the reusable renderer for that pattern, built first since it's structurally simpler than the sort-tray visual (it's the existing option-button pattern, upgraded).

- [x] **Step 1: Write the failing test**

Create `apps/web/src/app/(student)/mission/[missionId]/components/OptionListTask.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OptionListTask } from "./OptionListTask";
import type { LessonTaskSkeleton, SkeletonFill } from "@l3arn/shared-types";

const skeleton: LessonTaskSkeleton = {
  id: "11111111-1111-4111-8111-111111111111",
  masterySkillId: "22222222-2222-4222-8222-222222222222",
  l3arnMasteryLevel: "emerging",
  taskType: "choice",
  correctAnswerRule: { field: "isTargetMatch", op: "eq", value: true },
  distractorRule: { count: 2, plausibilityRule: { field: "isTargetMatch", op: "eq", value: false } },
  transferExampleRule: { field: "isTargetMatch", op: "eq", value: true },
  hintLadder: [
    { tier: 1, kind: "nudge", content: "Nudge.", readAloudScript: "Nudge." },
    { tier: 2, kind: "re-explain", content: "Re-explain.", readAloudScript: "Re-explain." },
    { tier: 3, kind: "state-rule", content: "Rule.", readAloudScript: "Rule." },
  ],
  isActive: true,
  version: 1,
};

const fill: SkeletonFill = {
  skeletonId: skeleton.id,
  variantKey: { skeletonId: skeleton.id, learningStyle: "reading-writing", readingTier: "grade-level", l3arnMasteryLevel: "emerging" },
  storyFlavor: "Pick the right one.",
  correctItem: { itemId: "opt-correct", attributes: { isTargetMatch: true }, presentationText: "The correct option.", readAloudScript: "The correct option." },
  distractorItems: [
    { itemId: "opt-wrong-1", attributes: { isTargetMatch: false }, presentationText: "A wrong option.", readAloudScript: "A wrong option." },
    { itemId: "opt-wrong-2", attributes: { isTargetMatch: false }, presentationText: "Another wrong option.", readAloudScript: "Another wrong option." },
  ],
  transferItem: { itemId: "opt-transfer", attributes: { isTargetMatch: true }, presentationText: "A new correct option.", readAloudScript: "A new correct option." },
  hintLadderFill: skeleton.hintLadder,
  companionDialogueLine: "Which one is right?",
};

describe("OptionListTask", () => {
  it("renders the story flavor and all three options (correct + 2 distractors) in random-stable order", () => {
    render(<OptionListTask skeleton={skeleton} fill={fill} onCorrect={vi.fn()} onWrong={vi.fn()} />);
    expect(screen.getByText("Pick the right one.")).toBeInTheDocument();
    expect(screen.getByText("The correct option.")).toBeInTheDocument();
    expect(screen.getByText("A wrong option.")).toBeInTheDocument();
    expect(screen.getByText("Another wrong option.")).toBeInTheDocument();
  });

  it("calls onCorrect when the correct option is tapped", () => {
    const onCorrect = vi.fn();
    render(<OptionListTask skeleton={skeleton} fill={fill} onCorrect={onCorrect} onWrong={vi.fn()} />);
    fireEvent.click(screen.getByText("The correct option."));
    expect(onCorrect).toHaveBeenCalledTimes(1);
  });

  it("calls onWrong (not onCorrect) when a distractor is tapped", () => {
    const onCorrect = vi.fn();
    const onWrong = vi.fn();
    render(<OptionListTask skeleton={skeleton} fill={fill} onCorrect={onCorrect} onWrong={onWrong} />);
    fireEvent.click(screen.getByText("A wrong option."));
    expect(onWrong).toHaveBeenCalledTimes(1);
    expect(onCorrect).not.toHaveBeenCalled();
  });

  it("renders the transferItem instead of the teaching items when isTransferStep is true", () => {
    render(<OptionListTask skeleton={skeleton} fill={fill} onCorrect={vi.fn()} onWrong={vi.fn()} isTransferStep />);
    expect(screen.getByText("A new correct option.")).toBeInTheDocument();
    expect(screen.queryByText("The correct option.")).not.toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `CI=true pnpm --filter @l3arn/web test -- OptionListTask`
Expected: FAIL — `Cannot find module './OptionListTask'`

- [x] **Step 3: Write the implementation**

Create `apps/web/src/app/(student)/mission/[missionId]/components/OptionListTask.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { LessonTaskSkeleton, SkeletonFill } from "@l3arn/shared-types";

interface OptionListTaskProps {
  skeleton: LessonTaskSkeleton;
  fill: SkeletonFill;
  onCorrect: () => void;
  onWrong: () => void;
  isTransferStep?: boolean;
}

/**
 * Renders choice / apply-to-new / ai-mistake-check tasks — all three share
 * the identical correctItem/distractorItems/transferItem data shape from
 * the content contract, so one component handles all three visually.
 *
 * Touch targets sized per children's-motor-development research (see
 * docs/superpowers/specs/2026-07-20-adaptive-lesson-runtime-design.md §3) —
 * larger than the pre-sub-project-2 option buttons.
 */
export function OptionListTask({ skeleton, fill, onCorrect, onWrong, isTransferStep }: OptionListTaskProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  const options = isTransferStep
    ? [fill.transferItem]
    : [fill.correctItem, ...fill.distractorItems];

  const correctItemId = isTransferStep ? fill.transferItem.itemId : fill.correctItem.itemId;

  // Stable order per render (not re-shuffled on re-render, so a wrong tap's
  // visual feedback doesn't reorder the list under the child).
  const orderedOptions = isTransferStep ? options : [...options].sort((a, b) => a.itemId.localeCompare(b.itemId));

  function handleSelect(itemId: string) {
    if (resolved) return;
    setSelectedId(itemId);
    if (itemId === correctItemId) {
      setResolved(true);
      onCorrect();
    } else {
      onWrong();
    }
  }

  return (
    <div style={optionListStyles.container}>
      <p style={optionListStyles.storyFlavor}>{fill.storyFlavor}</p>
      <div style={optionListStyles.optionList}>
        {orderedOptions.map((opt) => {
          const isSelected = selectedId === opt.itemId;
          const isCorrectAnswer = opt.itemId === correctItemId;
          const showCorrect = isSelected && isCorrectAnswer;
          const showWrong = isSelected && !isCorrectAnswer;
          return (
            <button
              key={opt.itemId}
              style={{
                ...optionListStyles.optionBtn,
                background: showCorrect ? "rgba(34,197,94,0.2)" : showWrong ? "rgba(239,68,68,0.15)" : "rgba(30,41,59,0.95)",
                borderColor: showCorrect ? "rgba(34,197,94,0.6)" : showWrong ? "rgba(239,68,68,0.5)" : "rgba(99,102,241,0.3)",
                cursor: resolved ? "default" : "pointer",
              }}
              onClick={() => handleSelect(opt.itemId)}
              disabled={resolved}
            >
              {opt.presentationText}
              {showCorrect && <span style={optionListStyles.checkIcon}> ✓</span>}
              {showWrong && <span style={optionListStyles.xIcon}> ✗</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const optionListStyles: Record<string, React.CSSProperties> = {
  container: { display: "flex", flexDirection: "column" },
  storyFlavor: { color: "#94a3b8", lineHeight: 1.7, marginBottom: "1.25rem" },
  optionList: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  optionBtn: {
    width: "100%",
    minHeight: "68px",
    padding: "1.1rem 1.25rem",
    borderRadius: "12px",
    border: "1px solid",
    textAlign: "left",
    color: "#e2e8f0",
    fontSize: "1rem",
    cursor: "pointer",
    transition: "all 0.2s ease",
    lineHeight: 1.5,
  },
  checkIcon: { color: "#4ade80", fontWeight: 700 },
  xIcon: { color: "#f87171", fontWeight: 700 },
};
```

- [x] **Step 4: Run the test to verify it passes**

Run: `CI=true pnpm --filter @l3arn/web test -- OptionListTask`
Expected: PASS, all 4 tests green.

- [x] **Step 5: Commit**

```bash
git add apps/web/src/app/\(student\)/mission/\[missionId\]/components/OptionListTask.tsx apps/web/src/app/\(student\)/mission/\[missionId\]/components/OptionListTask.test.tsx
git commit -m "feat(web): add OptionListTask renderer for choice/apply-to-new/ai-mistake-check"
```

---

### Task 11: Apps/web — `SortTrayTask` component (color-sort discrimination)

**Files:**
- Create: `apps/web/src/app/(student)/mission/[missionId]/components/SortTrayTask.tsx`
- Test: `apps/web/src/app/(student)/mission/[missionId]/components/SortTrayTask.test.tsx`

- [x] **Step 1: Write the failing test**

Create `apps/web/src/app/(student)/mission/[missionId]/components/SortTrayTask.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SortTrayTask } from "./SortTrayTask";
import type { LessonTaskSkeleton, SkeletonFill } from "@l3arn/shared-types";

const skeleton: LessonTaskSkeleton = {
  id: "11111111-1111-4111-8111-111111111111",
  masterySkillId: "22222222-2222-4222-8222-222222222222",
  l3arnMasteryLevel: "emerging",
  taskType: "sort-categorize",
  correctAnswerRule: { field: "isTargetMatch", op: "eq", value: true },
  distractorRule: { count: 2, plausibilityRule: { field: "isTargetMatch", op: "eq", value: false } },
  transferExampleRule: { field: "isTargetMatch", op: "eq", value: true },
  hintLadder: [
    { tier: 1, kind: "nudge", content: "Nudge.", readAloudScript: "Nudge." },
    { tier: 2, kind: "re-explain", content: "Re-explain.", readAloudScript: "Re-explain." },
    { tier: 3, kind: "state-rule", content: "Rule.", readAloudScript: "Rule." },
  ],
  isActive: true,
  version: 1,
};

const fill: SkeletonFill = {
  skeletonId: skeleton.id,
  variantKey: { skeletonId: skeleton.id, learningStyle: "reading-writing", readingTier: "grade-level", l3arnMasteryLevel: "emerging" },
  storyFlavor: "The Red Bin needs a crystal — which one belongs?",
  correctItem: { itemId: "crystal-red", attributes: { color: "red", isTargetMatch: true }, presentationText: "A red crystal.", readAloudScript: "A red crystal." },
  distractorItems: [
    { itemId: "crystal-blue", attributes: { color: "blue", isTargetMatch: false }, presentationText: "A blue crystal.", readAloudScript: "A blue crystal." },
    { itemId: "crystal-green", attributes: { color: "green", isTargetMatch: false }, presentationText: "A green crystal.", readAloudScript: "A green crystal." },
  ],
  transferItem: { itemId: "crystal-red-2", attributes: { color: "red", isTargetMatch: true }, presentationText: "A new red crystal.", readAloudScript: "A new red crystal." },
  hintLadderFill: skeleton.hintLadder,
  companionDialogueLine: "Which crystal matches the red bin?",
};

describe("SortTrayTask", () => {
  it("renders the target-bin banner and all crystals in the tray", () => {
    render(<SortTrayTask skeleton={skeleton} fill={fill} onCorrect={vi.fn()} onWrong={vi.fn()} />);
    expect(screen.getByText("The Red Bin needs a crystal — which one belongs?")).toBeInTheDocument();
    expect(screen.getByLabelText("A red crystal.")).toBeInTheDocument();
    expect(screen.getByLabelText("A blue crystal.")).toBeInTheDocument();
    expect(screen.getByLabelText("A green crystal.")).toBeInTheDocument();
  });

  it("labels every crystal with its color name as text, not color alone (colorblind-safe redundancy)", () => {
    render(<SortTrayTask skeleton={skeleton} fill={fill} onCorrect={vi.fn()} onWrong={vi.fn()} />);
    expect(screen.getByText("Red")).toBeInTheDocument();
    expect(screen.getByText("Blue")).toBeInTheDocument();
    expect(screen.getByText("Green")).toBeInTheDocument();
  });

  it("calls onCorrect when the matching crystal is tapped", () => {
    const onCorrect = vi.fn();
    render(<SortTrayTask skeleton={skeleton} fill={fill} onCorrect={onCorrect} onWrong={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("A red crystal."));
    expect(onCorrect).toHaveBeenCalledTimes(1);
  });

  it("calls onWrong when a non-matching crystal is tapped", () => {
    const onWrong = vi.fn();
    render(<SortTrayTask skeleton={skeleton} fill={fill} onCorrect={vi.fn()} onWrong={onWrong} />);
    fireEvent.click(screen.getByLabelText("A blue crystal."));
    expect(onWrong).toHaveBeenCalledTimes(1);
  });

  it("renders the transferItem crystal when isTransferStep is true", () => {
    render(<SortTrayTask skeleton={skeleton} fill={fill} onCorrect={vi.fn()} onWrong={vi.fn()} isTransferStep />);
    expect(screen.getByLabelText("A new red crystal.")).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `CI=true pnpm --filter @l3arn/web test -- SortTrayTask`
Expected: FAIL — `Cannot find module './SortTrayTask'`

- [x] **Step 3: Write the implementation**

Create `apps/web/src/app/(student)/mission/[missionId]/components/SortTrayTask.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { LessonTaskSkeleton, SkeletonFill } from "@l3arn/shared-types";

interface SortTrayTaskProps {
  skeleton: LessonTaskSkeleton;
  fill: SkeletonFill;
  onCorrect: () => void;
  onWrong: () => void;
  isTransferStep?: boolean;
}

const COLOR_HEX: Record<string, string> = { red: "#ef4444", blue: "#3b82f6", green: "#22c55e", purple: "#a855f7" };
const COLOR_EMOJI: Record<string, string> = { red: "🔴", blue: "🔵", green: "🟢", purple: "🟣" };

/**
 * Real color-sort discrimination — tap-then-select (not drag: dragging is
 * developmentally hard for this age band's motor skills, see design spec §3).
 * A mixed tray of colors is shown; the child taps the ONE that matches the
 * announced target bin. Never color-only: every crystal pairs its color
 * fill with a text label (colorblind-safe redundancy — the reframing from
 * "colored bins" to "single-target rounds" removed the bin element that
 * originally carried this redundancy in the approved mockup, so the label
 * moved onto the tray items themselves to preserve the same guarantee).
 *
 * Kinesthetic-style-specific animation (tap-and-fly vs. plain swap) is
 * deferred: no real learning-style signal exists yet to gate it on (see
 * this plan's "Before you start" note and the design spec §2.1's correction).
 * A single, modest scale transition on correct selection is used for every
 * child instead of a style-gated fork with nothing real to gate on.
 */
export function SortTrayTask({ skeleton, fill, onCorrect, onWrong, isTransferStep }: SortTrayTaskProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  const targetItem = isTransferStep ? fill.transferItem : fill.correctItem;
  const trayItems = isTransferStep ? [fill.transferItem] : [fill.correctItem, ...fill.distractorItems];
  const orderedTray = [...trayItems].sort((a, b) => a.itemId.localeCompare(b.itemId));

  function handleTap(itemId: string) {
    if (resolved) return;
    setSelectedId(itemId);
    if (itemId === targetItem.itemId) {
      setResolved(true);
      onCorrect();
    } else {
      onWrong();
    }
  }

  return (
    <div style={sortTrayStyles.container}>
      <p style={sortTrayStyles.storyFlavor}>{fill.storyFlavor}</p>
      <p style={sortTrayStyles.trayLabel}>Tray — tap the crystal that belongs</p>
      <div style={sortTrayStyles.tray}>
        {orderedTray.map((item) => {
          const color = String(item.attributes.color ?? "red");
          const colorLabel = color.charAt(0).toUpperCase() + color.slice(1);
          const isSelected = selectedId === item.itemId;
          const isCorrect = item.itemId === targetItem.itemId;
          return (
            <button
              key={item.itemId}
              aria-label={item.presentationText}
              onClick={() => handleTap(item.itemId)}
              disabled={resolved}
              style={{
                ...sortTrayStyles.crystalBtn,
                background: `${COLOR_HEX[color]}26`,
                borderColor: isSelected ? (isCorrect ? "#22c55e" : "#ef4444") : COLOR_HEX[color],
                cursor: resolved ? "default" : "pointer",
                transform: isSelected && isCorrect ? "scale(1.08)" : "scale(1)",
                transition: "transform 0.25s ease",
              }}
            >
              <span style={sortTrayStyles.crystalEmoji}>{COLOR_EMOJI[color]}</span>
              <span style={sortTrayStyles.crystalLabel}>{colorLabel}</span>
              {isSelected && <span>{isCorrect ? " ✓" : " ✗"}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const sortTrayStyles: Record<string, React.CSSProperties> = {
  container: { display: "flex", flexDirection: "column" },
  storyFlavor: { color: "#e2e8f0", fontWeight: 600, fontSize: "1.05rem", marginBottom: "0.5rem" },
  trayLabel: { color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem" },
  tray: { display: "flex", gap: "14px", flexWrap: "wrap" },
  crystalBtn: {
    width: "72px",
    minWidth: "72px",
    minHeight: "72px",
    borderRadius: "14px",
    border: "3px solid",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "2px",
    padding: "6px",
    fontSize: "1.6rem",
  },
  crystalEmoji: { fontSize: "1.6rem" },
  crystalLabel: { fontSize: "0.7rem", fontWeight: 700, color: "#e2e8f0" },
};
```

- [x] **Step 4: Run the test to verify it passes**

Run: `CI=true pnpm --filter @l3arn/web test -- SortTrayTask`
Expected: PASS, all 4 tests green.

- [x] **Step 5: Commit**

```bash
git add apps/web/src/app/\(student\)/mission/\[missionId\]/components/SortTrayTask.tsx apps/web/src/app/\(student\)/mission/\[missionId\]/components/SortTrayTask.test.tsx
git commit -m "feat(web): add SortTrayTask renderer for color-sort discrimination"
```

---

### Task 12: Apps/web — `HintButton` component (escalating tiers)

**Files:**
- Create: `apps/web/src/app/(student)/mission/[missionId]/components/HintButton.tsx`
- Test: `apps/web/src/app/(student)/mission/[missionId]/components/HintButton.test.tsx`

- [x] **Step 1: Write the failing test**

Create `apps/web/src/app/(student)/mission/[missionId]/components/HintButton.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HintButton } from "./HintButton";
import type { HintLadder } from "@l3arn/shared-types";

const ladder: HintLadder = [
  { tier: 1, kind: "nudge", content: "Tier one nudge.", readAloudScript: "Tier one nudge." },
  { tier: 2, kind: "re-explain", content: "Tier two re-explain.", readAloudScript: "Tier two re-explain." },
  { tier: 3, kind: "state-rule", content: "Tier three rule.", readAloudScript: "Tier three rule." },
];

describe("HintButton", () => {
  it("shows the stuck button and no hint text initially", () => {
    render(<HintButton hintLadder={ladder} />);
    expect(screen.getByText("I'm stuck?")).toBeInTheDocument();
    expect(screen.queryByText("Tier one nudge.")).not.toBeInTheDocument();
  });

  it("shows tier 1 on first tap, tier 2 on second, tier 3 on third", () => {
    render(<HintButton hintLadder={ladder} />);
    const button = screen.getByText("I'm stuck?");
    fireEvent.click(button);
    expect(screen.getByText("Tier one nudge.")).toBeInTheDocument();
    fireEvent.click(button);
    expect(screen.getByText("Tier two re-explain.")).toBeInTheDocument();
    expect(screen.queryByText("Tier one nudge.")).not.toBeInTheDocument();
    fireEvent.click(button);
    expect(screen.getByText("Tier three rule.")).toBeInTheDocument();
  });

  it("stays on tier 3 after a fourth tap (no further escalation)", () => {
    render(<HintButton hintLadder={ladder} />);
    const button = screen.getByText("I'm stuck?");
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    expect(screen.getByText("Tier three rule.")).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `CI=true pnpm --filter @l3arn/web test -- HintButton`
Expected: FAIL — `Cannot find module './HintButton'`

- [x] **Step 3: Write the implementation**

Create `apps/web/src/app/(student)/mission/[missionId]/components/HintButton.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { HintLadder } from "@l3arn/shared-types";

interface HintButtonProps {
  hintLadder: HintLadder;
}

/**
 * Child-triggered hint escalation. Timing/auto-detection of struggle is
 * explicitly sub-project 3's job (the live tutor) — this only renders the
 * authored ladder and lets the child themselves ask for more help.
 */
export function HintButton({ hintLadder }: HintButtonProps) {
  const [tier, setTier] = useState(0); // 0 = not yet requested

  function handleTap() {
    setTier((prev) => Math.min(prev + 1, 3));
  }

  const activeHint = tier > 0 ? hintLadder[tier - 1] : null;

  return (
    <div style={hintStyles.container}>
      <button style={hintStyles.button} onClick={handleTap}>
        I&apos;m stuck?
      </button>
      {activeHint && <p style={hintStyles.hintText}>{activeHint.content}</p>}
    </div>
  );
}

const hintStyles: Record<string, React.CSSProperties> = {
  container: { marginTop: "1rem" },
  button: {
    minHeight: "56px",
    padding: "0.75rem 1.25rem",
    borderRadius: "10px",
    border: "1px solid rgba(129,140,248,0.4)",
    background: "rgba(99,102,241,0.1)",
    color: "#a5b4fc",
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  hintText: {
    marginTop: "0.75rem",
    color: "#c7d2fe",
    fontStyle: "italic",
    lineHeight: 1.6,
  },
};
```

- [x] **Step 4: Run the test to verify it passes**

Run: `CI=true pnpm --filter @l3arn/web test -- HintButton`
Expected: PASS, all 3 tests green.

- [x] **Step 5: Commit**

```bash
git add apps/web/src/app/\(student\)/mission/\[missionId\]/components/HintButton.tsx apps/web/src/app/\(student\)/mission/\[missionId\]/components/HintButton.test.tsx
git commit -m "feat(web): add child-triggered escalating HintButton component"
```

---

### Task 13: Apps/web — `SpeakerButton` component (universal read-aloud)

**Files:**
- Create: `apps/web/src/app/(student)/mission/[missionId]/components/SpeakerButton.tsx`
- Test: `apps/web/src/app/(student)/mission/[missionId]/components/SpeakerButton.test.tsx`

- [x] **Step 1: Write the failing test**

Create `apps/web/src/app/(student)/mission/[missionId]/components/SpeakerButton.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SpeakerButton } from "./SpeakerButton";

describe("SpeakerButton", () => {
  beforeEach(() => {
    // jsdom has no SpeechSynthesis — stub it so the component can call it.
    (globalThis as { speechSynthesis?: unknown }).speechSynthesis = { speak: vi.fn(), cancel: vi.fn() };
    (globalThis as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = vi
      .fn()
      .mockImplementation((text: string) => ({ text }));
  });

  it("renders a speaker icon button, always visible", () => {
    render(<SpeakerButton text="Read this aloud." />);
    expect(screen.getByLabelText("Read aloud")).toBeInTheDocument();
  });

  it("calls speechSynthesis.speak with the given text when tapped", () => {
    render(<SpeakerButton text="Read this aloud." />);
    fireEvent.click(screen.getByLabelText("Read aloud"));
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    const utterance = (globalThis.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(utterance.text).toBe("Read this aloud.");
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `CI=true pnpm --filter @l3arn/web test -- SpeakerButton`
Expected: FAIL — `Cannot find module './SpeakerButton'`

- [x] **Step 3: Write the implementation**

Create `apps/web/src/app/(student)/mission/[missionId]/components/SpeakerButton.tsx`:

```tsx
"use client";

interface SpeakerButtonProps {
  text: string;
}

/**
 * Universal read-aloud affordance — always visible, child-toggled, never a
 * "struggling reader" mode (per docs/superpowers/specs/2026-07-19-lesson-
 * engine-content-contract-design.md §3.1). Uses the browser's built-in
 * SpeechSynthesis API — no external TTS service dependency for this sub-project.
 */
export function SpeakerButton({ text }: SpeakerButtonProps) {
  function handleTap() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <button aria-label="Read aloud" onClick={handleTap} style={speakerStyles.button}>
      🔊
    </button>
  );
}

const speakerStyles: Record<string, React.CSSProperties> = {
  button: {
    // Sized to the same large-touch-target standard as the other interactive
    // elements in this runtime (see design spec §3) — this is a control a
    // pre-reader may need to tap often, not a minor utility icon.
    width: "56px",
    height: "56px",
    minWidth: "56px",
    minHeight: "56px",
    borderRadius: "50%",
    border: "1px solid rgba(129,140,248,0.4)",
    background: "rgba(99,102,241,0.1)",
    fontSize: "1.3rem",
    cursor: "pointer",
  },
};
```

- [x] **Step 4: Run the test to verify it passes**

Run: `CI=true pnpm --filter @l3arn/web test -- SpeakerButton`
Expected: PASS, both tests green.

- [x] **Step 5: Commit**

```bash
git add apps/web/src/app/\(student\)/mission/\[missionId\]/components/SpeakerButton.tsx apps/web/src/app/\(student\)/mission/\[missionId\]/components/SpeakerButton.test.tsx
git commit -m "feat(web): add universal read-aloud SpeakerButton component"
```

---

### Task 14: Apps/web — wire `page.tsx` to the new lesson sequence, exit button, and resume

**Files:**
- Modify: `apps/web/src/app/(student)/mission/[missionId]/page.tsx`

This is the integration task — replacing the four hardcoded step components (`CrystalSortStep`, `AIMistakeStep`, `ExplainRuleStep`; `ReflectionStep` is kept as-is, it is not a graded content-contract task type) with the two new renderers, fetched from the real `/lesson` endpoint, with an exit button and resume.

- [x] **Step 1: Read the current file in full**

Read `apps/web/src/app/(student)/mission/[missionId]/page.tsx` in full before editing — it's ~1000 lines and this task touches the state machine, the step-rendering block, and adds new state. Do not guess at surrounding code; every edit below must be applied against the actual current content.

- [x] **Step 2: Add new imports and state**

Add imports:
```ts
import { fetchMissionLesson, updateTaskIndex } from "../../../../lib/student-session";
import type { MissionLessonTask } from "@l3arn/shared-types";
import { SortTrayTask } from "./components/SortTrayTask";
import { OptionListTask } from "./components/OptionListTask";
import { HintButton } from "./components/HintButton";
import { SpeakerButton } from "./components/SpeakerButton";
```

Add new state alongside the existing `stepIndex`/`mission`/`result` state:
```ts
const [lessonTasks, setLessonTasks] = useState<MissionLessonTask[]>([]);
const [taskIndex, setTaskIndex] = useState(0);
const [isTransferStep, setIsTransferStep] = useState(false);
const [showExitConfirm, setShowExitConfirm] = useState(false);
```

- [x] **Step 3: Fetch the lesson sequence after briefing loads**

In the existing `useEffect` that calls `startMission` (the one that sets `phase` to `"briefing"` on success), add a lesson fetch right after the mission loads successfully:

```ts
void startMission(missionId).then((outcome) => {
  if (cancelled) return;
  if (outcome.ok) {
    setMission(outcome.data);
    setPhase("briefing");
    void fetchMissionLesson(missionId, outcome.data.missionAttemptId).then((lessonOutcome) => {
      if (cancelled || !lessonOutcome.ok) return;
      setLessonTasks(lessonOutcome.data.tasks);
      setTaskIndex(lessonOutcome.data.resumeFromTaskIndex);
    });
    return;
  }
  // ...unchanged error/dev-fallback handling below
});
```

- [x] **Step 4: Replace the gameplay-step render block**

Find the `// ── Render: Gameplay steps` block (the section with `if (stepIndex <= 2)`, the AI Mistake / Explain Rule / Reflection branches). Replace the sort/choice/apply-to-new branches — **keep the existing `ReflectionStep` branch exactly as-is** (it's the final, ungraded step and stays hardcoded per the design spec):

```tsx
  // ── Render: Gameplay steps (content-contract tasks) ─────────────────────────
  if (phase === "step" && mission && lessonTasks.length > 0) {
    const missionAttemptId = mission.missionAttemptId;
    const currentTask = lessonTasks[taskIndex];

    if (currentTask) {
      const handleTaskCorrect = async () => {
        // ai-mistake-check keeps its own existing, more specific evidence
        // type (already valid pre-sub-project-2) rather than being folded
        // into the new generic discrimination-check.
        const captureType =
          currentTask.skeleton.taskType === "apply-to-new"
            ? "transfer-check"
            : currentTask.skeleton.taskType === "ai-mistake-check"
              ? "ai-mistake-check"
              : "discrimination-check";
        await tryCapture(missionAttemptId, currentTask.taskInstanceId, captureType, {
          taskType: currentTask.skeleton.taskType,
          correct: true,
        });
        const next = taskIndex + 1;
        setTaskIndex(next);
        void updateTaskIndex(missionAttemptId, next);
      };
      const handleTaskWrong = () => {
        setTotalAttempts((p) => p + 1);
      };

      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <ProgressBar current={taskIndex} total={lessonTasks.length + 1} />
            <button style={styles.exitBtn} onClick={() => setShowExitConfirm(true)}>
              Exit mission
            </button>
            {showExitConfirm && (
              <div style={styles.exitConfirmBox}>
                <p>Leave this mission? Your progress on this task is saved.</p>
                <button
                  onClick={async () => {
                    await updateTaskIndex(missionAttemptId, taskIndex);
                    router.push("/student/academy");
                  }}
                >
                  Leave
                </button>
                <button onClick={() => setShowExitConfirm(false)}>Stay</button>
              </div>
            )}
            <SpeakerButton text={currentTask.fill.storyFlavor} />
            {currentTask.skeleton.taskType === "sort-categorize" && (
              <SortTrayTask skeleton={currentTask.skeleton} fill={currentTask.fill} onCorrect={handleTaskCorrect} onWrong={handleTaskWrong} />
            )}
            {currentTask.skeleton.taskType === "apply-to-new" && (
              <SortTrayTask
                skeleton={currentTask.skeleton}
                fill={currentTask.fill}
                onCorrect={handleTaskCorrect}
                onWrong={handleTaskWrong}
                isTransferStep
              />
            )}
            {currentTask.skeleton.taskType === "ai-mistake-check" && (
              <OptionListTask skeleton={currentTask.skeleton} fill={currentTask.fill} onCorrect={handleTaskCorrect} onWrong={handleTaskWrong} />
            )}
            <HintButton hintLadder={currentTask.skeleton.hintLadder} />
          </div>
        </div>
      );
    }

    // All content-contract tasks done — fall through to the existing
    // ReflectionStep (unchanged, kept exactly as today).
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <ProgressBar current={lessonTasks.length} total={lessonTasks.length + 1} />
          <ReflectionStep missionAttemptId={missionAttemptId} onComplete={() => void handleComplete()} />
        </div>
      </div>
    );
  }
```

Note: `apply-to-new` reuses `SortTrayTask` with `isTransferStep` because Mission 001's apply-to-new instance is a color-transfer check (the same visual as the sort rounds); a future mission whose apply-to-new instance follows a `choice`-type teaching task would use `OptionListTask` with `isTransferStep` instead — the branch is on `skeleton.taskType` combined with which teaching task preceded it, not a hardcoded assumption.

- [x] **Step 5: Add the new styles**

Add to the `styles` object:
```ts
  exitBtn: {
    alignSelf: "flex-end",
    padding: "0.5rem 1rem",
    minHeight: "52px",
    borderRadius: "8px",
    border: "1px solid rgba(148,163,184,0.3)",
    background: "transparent",
    color: "#94a3b8",
    fontSize: "0.85rem",
    cursor: "pointer",
    marginBottom: "1rem",
  },
  exitConfirmBox: {
    padding: "1rem",
    borderRadius: "10px",
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.25)",
    marginBottom: "1rem",
  },
```

- [x] **Step 6: Remove the now-unused hardcoded step components and their data**

Delete the `CrystalSortStep` function and `CRYSTAL_STEPS` constant, the `AIMistakeStep` function and `AI_MISTAKE_OPTIONS` constant, and the `ExplainRuleStep` function and `EXPLAIN_OPTIONS` constant. **Keep `ReflectionStep` and `REFLECTION_OPTIONS`** — unchanged, still used.

- [x] **Step 7: Typecheck**

Run: `CI=true pnpm --filter @l3arn/web typecheck`
Expected: clean (no dangling references to the deleted components).

- [x] **Step 8: Commit**

```bash
git add apps/web/src/app/\(student\)/mission/\[missionId\]/page.tsx
git commit -m "feat(web): wire Mission 001 to the adaptive lesson runtime, add exit/resume"
```

---

### Task 15: Live verification

This repo has no committed Playwright test suite (confirmed: no `playwright.config.*`, no `apps/web` test devDependency for it) — prior verification work in this repo uses the Playwright MCP tools for one-off, screenshotted live verification passes rather than a persisted `.spec.ts` file. Follow that established practice here rather than introducing new CI infrastructure this plan doesn't need.

- [x] **Step 1: Start the dev server**

Run: `pnpm --filter @l3arn/web dev` (background)

- [x] **Step 2: Drive the full flow with Playwright MCP tools**

Using `mcp__plugin_playwright_playwright__browser_navigate` and related tools (or the currently-available Playwright MCP tool names — search via ToolSearch if the exact names have changed since this plan was written):
1. Log in as an existing test child account (see project memory for test-account creds), start Mission 001
2. Complete the 3 sort-categorize rounds — verify a deliberate wrong tap shows real wrong feedback (not silently accepted)
3. Complete the apply-to-new transfer step
4. Complete the ai-mistake-check step
5. Verify the reflection step still renders and completes the mission
6. Screenshot each step
7. Separately: start a fresh attempt, tap "Exit mission" mid-sort-round, confirm exit, re-enter the mission, and verify it resumes on the same task rather than restarting

- [x] **Step 3: Write a short TEST_RESULTS report**

Following the `testing-mandate` skill's convention, write `TEST_RESULTS_adaptive-lesson-runtime.md` documenting what was verified live, with screenshots referenced, before declaring this plan complete.
