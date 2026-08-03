/**
 * Worked example skeleton — the transfer check following the color-sort
 * rounds (sort-color-crystals.skeleton.ts). Tests whether the child
 * generalized "match by color" as a rule, using a purple crystal — a color
 * never shown during the red/blue/green teaching rounds — rather than
 * memorizing the three specific gems already seen.
 *
 * The fixture's own `transferItem` deliberately uses a THIRD color (orange)
 * distinct from both the prior red/blue/green rounds AND this fixture's own
 * tray (purple/red/blue) — not a repeat of the just-taught purple. Task 4's
 * transferItem repeated the correct item's color (different itemId only),
 * which a code review flagged as a weak, itemId-only novelty check. This
 * fixture's own test (`apply-to-new-color.skeleton.test.ts`) asserts novelty
 * at the attribute (color) level, so the transferItem must not be reachable
 * by copying correctItem's color — it has to be genuinely new content, which
 * is why "orange" (never used anywhere in this file) was chosen instead of
 * reusing "purple".
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
  // NOTE: page.tsx currently renders this task type with isTransferStep
  // hardcoded true (never false), so correctItem/distractorItems below are
  // never actually shown to a child today — only transferItem is. storyFlavor
  // must therefore stand on its own for the transfer-only presentation; it
  // must NOT reference "the Purple Bin" (or any teaching-round detail a child
  // never sees), which an earlier version of this copy did. Found live: the
  // fixture's own comment above still describes a two-phase teaching+transfer
  // flow that the current wiring doesn't actually deliver — see the follow-up
  // register for the larger design question of whether this task type should
  // present real distractors instead of a single always-correct tap.
  storyFlavor: "A brand-new crystal appeared! Does the color-matching rule you just learned still work — even for a color you've never seen before?",
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
    itemId: "crystal-orange",
    attributes: { color: "orange", isTargetMatch: true },
    presentationText: "A brand-new orange crystal you've never seen before — does the same rule tell you where it belongs?",
    readAloudScript: "A brand-new orange crystal you've never seen before. Does the same rule tell you where it belongs?",
  },
  hintLadderFill: SORT_COLOR_CRYSTALS_SKELETON.hintLadder,
  companionDialogueLine: "You've never seen this color before — but do you remember the rule?",
};
