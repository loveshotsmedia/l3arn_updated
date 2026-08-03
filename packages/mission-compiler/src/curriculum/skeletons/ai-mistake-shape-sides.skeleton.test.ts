import { validateSkeletonFill } from "../../validation/skeleton-fill-gate";
import {
  AI_MISTAKE_SHAPE_SIDES_SKELETON,
  AI_MISTAKE_SHAPE_SIDES_SKELETON_FIXTURE_ID,
} from "./ai-mistake-shape-sides.skeleton";
import type { SkeletonFill } from "@l3arn/shared-types";

function makeValidFill(overrides: Partial<SkeletonFill> = {}): SkeletonFill {
  return {
    skeletonId: AI_MISTAKE_SHAPE_SIDES_SKELETON_FIXTURE_ID,
    variantKey: {
      skeletonId: AI_MISTAKE_SHAPE_SIDES_SKELETON_FIXTURE_ID,
      learningStyle: "visual",
      readingTier: "grade-level",
      l3arnMasteryLevel: "emerging",
    },
    storyFlavor: "The Sorting Computer studied a glowing crystal and reported its findings to you.",
    correctItem: {
      itemId: "critique-correct",
      attributes: { claimedSides: 5, actualSides: 6 },
      presentationText:
        "The companion said: \"This crystal has 5 sides.\" But count them yourself — it actually has 6. The companion made a mistake!",
      readAloudScript:
        "The companion said this crystal has 5 sides. But if you count them yourself, it actually has 6. The companion made a mistake!",
    },
    distractorItems: [
      {
        itemId: "critique-distractor-a",
        attributes: { claimedSides: 6, actualSides: 6 },
        presentationText: "The companion said: \"This crystal has 6 sides,\" and it does have 6 sides. That's correct, not a mistake.",
        readAloudScript: "The companion said this crystal has 6 sides, and it does have 6 sides. That is correct, not a mistake.",
      },
      {
        itemId: "critique-distractor-b",
        attributes: { claimedSides: 4, actualSides: 4 },
        presentationText: "The companion said: \"This crystal has 4 sides,\" and it does have 4 sides. That's correct, not a mistake.",
        readAloudScript: "The companion said this crystal has 4 sides, and it does have 4 sides. That is correct, not a mistake.",
      },
    ],
    transferItem: {
      itemId: "critique-transfer",
      attributes: { claimedSides: 3, actualSides: 5 },
      presentationText:
        "Now look at this NEW crystal. The companion said: \"This one has 3 sides.\" Count the real crystal — is the companion right this time?",
      readAloudScript:
        "Now look at this new crystal. The companion said this one has 3 sides. Count the real crystal. Is the companion right this time?",
    },
    hintLadderFill: AI_MISTAKE_SHAPE_SIDES_SKELETON.hintLadder,
    companionDialogueLine: "Wait... let's double check my math on that last one!",
    ...overrides,
  };
}

describe("AI_MISTAKE_SHAPE_SIDES_SKELETON (worked example)", () => {
  it("is a valid LessonTaskSkeleton with task type ai-mistake-check", () => {
    expect(AI_MISTAKE_SHAPE_SIDES_SKELETON.taskType).toBe("ai-mistake-check");
    expect(AI_MISTAKE_SHAPE_SIDES_SKELETON.hintLadder).toHaveLength(3);
  });

  it("passes the correctness gate for a realistic, fully correct fill", () => {
    const result = validateSkeletonFill(AI_MISTAKE_SHAPE_SIDES_SKELETON, makeValidFill());
    expect(result).toEqual({ valid: true, failures: [] });
  });

  it("fails the gate when the 'correct' critique actually points at a claim that was true (no real mistake)", () => {
    const badFill = makeValidFill({
      correctItem: {
        itemId: "critique-not-actually-wrong",
        attributes: { claimedSides: 6, actualSides: 6 },
        presentationText: "The companion said this crystal has 6 sides. That's a mistake!",
        readAloudScript: "The companion said this crystal has 6 sides. That's a mistake!",
      },
    });
    const result = validateSkeletonFill(AI_MISTAKE_SHAPE_SIDES_SKELETON, badFill);
    expect(result.valid).toBe(false);
    expect(result.failures.map((f) => f.code)).toContain("correct-item-fails-rule");
  });

  it("fails the gate when a distractor critique actually does describe a real AI mistake", () => {
    const badFill = makeValidFill({
      distractorItems: [
        {
          itemId: "critique-secretly-correct",
          attributes: { claimedSides: 5, actualSides: 7 },
          presentationText: "The companion said 5 sides but it's actually 7 — that IS a mistake, mislabeled as a distractor.",
          readAloudScript: "The companion said 5 sides but it's actually 7.",
        },
        {
          itemId: "critique-distractor-b",
          attributes: { claimedSides: 4, actualSides: 4 },
          presentationText: "x",
          readAloudScript: "x",
        },
      ],
    });
    const result = validateSkeletonFill(AI_MISTAKE_SHAPE_SIDES_SKELETON, badFill);
    expect(result.valid).toBe(false);
    expect(result.failures.map((f) => f.code)).toContain("distractor-fails-plausibility");
  });
});
