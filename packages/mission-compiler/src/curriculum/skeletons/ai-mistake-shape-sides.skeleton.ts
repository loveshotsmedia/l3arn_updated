/**
 * Worked example skeleton — Mission 001's AI-literacy beat, made first-class.
 * Replaces the intent of the current hardcoded AIMistakeStep /
 * AI_MISTAKE_OPTIONS in MissionExperience.tsx with a rule-checkable skeleton.
 *
 * Concept: the AI companion claims a shape has a certain number of sides;
 * the claim is wrong. The child must identify which critique correctly
 * names the AI's mistake among several plausible-but-wrong critiques.
 *
 * masterySkillId below is a fixture placeholder for offline unit tests only
 * — it does not need to resolve against a live Supabase row. The real
 * skeleton row (with the true mastery_skills.id for
 * AI_LITERACY.VERIFY_AI_OUTPUT, seeded by Migration 002) is seeded by
 * supabase/migrations/013_lesson_task_skeletons.sql.
 *
 * Grounded in: docs/superpowers/specs/2026-07-19-lesson-engine-content-contract-design.md §5
 */

import type { LessonTaskSkeleton, SkeletonFill } from "@l3arn/shared-types";

export const AI_MISTAKE_SHAPE_SIDES_SKELETON_FIXTURE_ID = "00000000-0000-4000-8000-000000000001";
const PLACEHOLDER_MASTERY_SKILL_ID = "00000000-0000-4000-8000-0000000000f1";

export const AI_MISTAKE_SHAPE_SIDES_SKELETON: LessonTaskSkeleton = {
  id: AI_MISTAKE_SHAPE_SIDES_SKELETON_FIXTURE_ID,
  masterySkillId: PLACEHOLDER_MASTERY_SKILL_ID,
  l3arnMasteryLevel: "emerging",
  taskType: "ai-mistake-check",
  correctAnswerRule: { field: "claimedSides", op: "neq", compareField: "actualSides" },
  distractorRule: {
    count: 2,
    plausibilityRule: { field: "claimedSides", op: "eq", compareField: "actualSides" },
  },
  transferExampleRule: { field: "claimedSides", op: "neq", compareField: "actualSides" },
  hintLadder: [
    {
      tier: 1,
      kind: "nudge",
      content: "Look closely at what the companion said about the shape. Count carefully.",
      readAloudScript: "Look closely at what the companion said about the shape. Count carefully.",
    },
    {
      tier: 2,
      kind: "re-explain",
      content:
        "Count each straight edge of the shape one at a time, out loud, and compare your count to what the companion claimed.",
      readAloudScript:
        "Count each straight edge of the shape one at a time, out loud, and compare your count to what the companion claimed.",
    },
    {
      tier: 3,
      kind: "state-rule",
      content: "A shape's number of sides is the number of straight edges it has - count them to check any claim about it.",
      readAloudScript: "A shape's number of sides is the number of straight edges it has. Count them to check any claim about it.",
    },
  ],
  isActive: true,
  version: 1,
};

// The real, servable fixture fill for this skeleton — used by both the
// mission-001 lesson sequence (sub-project 2, adaptive lesson runtime) and
// this file's own test suite. Verified against the rules above:
//   correctAnswerRule:    { field: "claimedSides", op: "neq", compareField: "actualSides" }
//   distractorRule:       { count: 2, plausibilityRule: { field: "claimedSides", op: "eq", compareField: "actualSides" } }
//   transferExampleRule:  { field: "claimedSides", op: "neq", compareField: "actualSides" }
export const AI_MISTAKE_SHAPE_SIDES_FILL: SkeletonFill = {
  skeletonId: AI_MISTAKE_SHAPE_SIDES_SKELETON_FIXTURE_ID,
  variantKey: {
    skeletonId: AI_MISTAKE_SHAPE_SIDES_SKELETON_FIXTURE_ID,
    learningStyle: "reading-writing",
    readingTier: "grade-level",
    l3arnMasteryLevel: "emerging",
  },
  // Each option's presentationText states ONLY the companion's claim, never
  // the verdict ("that's correct" / "that's a mistake") — the child must
  // count the rendered shape's real sides themselves and compare it to the
  // claim. An earlier version of this copy stated the verdict outright in
  // the text, which meant there was nothing to actually figure out; found
  // live during manual testing. The gate's correctAnswerRule/distractorRule
  // still key off the same claimedSides/actualSides attributes, unchanged.
  storyFlavor:
    "The Sorting Computer studied a glowing crystal and reported its findings to you. Count the crystal's sides yourself — is the companion right?",
  correctItem: {
    itemId: "critique-correct",
    attributes: { claimedSides: 5, actualSides: 6 },
    presentationText: 'The companion said: "This crystal has 5 sides."',
    readAloudScript: "The companion said this crystal has 5 sides.",
  },
  distractorItems: [
    {
      itemId: "critique-distractor-a",
      attributes: { claimedSides: 6, actualSides: 6 },
      presentationText: 'The companion said: "This crystal has 6 sides."',
      readAloudScript: "The companion said this crystal has 6 sides.",
    },
    {
      itemId: "critique-distractor-b",
      attributes: { claimedSides: 4, actualSides: 4 },
      presentationText: 'The companion said: "This crystal has 4 sides."',
      readAloudScript: "The companion said this crystal has 4 sides.",
    },
  ],
  transferItem: {
    itemId: "critique-transfer",
    attributes: { claimedSides: 3, actualSides: 5 },
    presentationText: 'Now look at this NEW crystal. The companion said: "This one has 3 sides."',
    readAloudScript: "Now look at this new crystal. The companion said this one has 3 sides.",
  },
  hintLadderFill: AI_MISTAKE_SHAPE_SIDES_SKELETON.hintLadder,
  companionDialogueLine: "Wait... let's double check my math on that last one!",
};
