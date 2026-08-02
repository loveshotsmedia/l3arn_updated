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

import type { MissionLessonTask, SkeletonFill } from "@l3arn/shared-types";
import {
  SORT_COLOR_CRYSTALS_SKELETON,
  SORT_ROUND_RED_FILL,
  SORT_ROUND_BLUE_FILL,
  SORT_ROUND_GREEN_FILL,
} from "./skeletons/sort-color-crystals.skeleton";
import { APPLY_TO_NEW_COLOR_SKELETON, APPLY_TO_NEW_COLOR_FILL } from "./skeletons/apply-to-new-color.skeleton";
import { AI_MISTAKE_SHAPE_SIDES_SKELETON } from "./skeletons/ai-mistake-shape-sides.skeleton";

// The sub-project 1 worked example didn't export a matching production
// fixture fill (only a test-local makeValidFill() helper) — this fill is
// the real, servable equivalent for this task type.
//
// Verified against the real AI_MISTAKE_SHAPE_SIDES_SKELETON's rules
// (packages/mission-compiler/src/curriculum/skeletons/ai-mistake-shape-sides.skeleton.ts):
//   correctAnswerRule:    { field: "claimedSides", op: "neq", compareField: "actualSides" }
//   distractorRule:       { count: 2, plausibilityRule: { field: "claimedSides", op: "eq", compareField: "actualSides" } }
//   transferExampleRule:  { field: "claimedSides", op: "neq", compareField: "actualSides" }
// These match what the plan snippet assumed (keyed on claimedSides/actualSides),
// so no data corrections were needed here — unlike Task 5, this fill's literal
// values already satisfy the real skeleton's real rules as written.
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
