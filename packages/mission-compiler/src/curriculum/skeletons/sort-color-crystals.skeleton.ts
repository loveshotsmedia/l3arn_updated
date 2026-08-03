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
