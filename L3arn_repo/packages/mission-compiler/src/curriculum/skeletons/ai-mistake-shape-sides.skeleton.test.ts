import { validateSkeletonFill } from "../../validation/skeleton-fill-gate";
import {
  AI_MISTAKE_SHAPE_SIDES_SKELETON,
  AI_MISTAKE_SHAPE_SIDES_SKELETON_FIXTURE_ID,
  AI_MISTAKE_SHAPE_SIDES_FILL,
} from "./ai-mistake-shape-sides.skeleton";
import type { SkeletonFill } from "@l3arn/shared-types";

// Builds test variants (valid / deliberately-broken) from the real,
// production AI_MISTAKE_SHAPE_SIDES_FILL fixture rather than duplicating its
// content — `overrides` lets individual tests below swap in a broken
// correctItem/distractorItems to exercise the gate's failure paths. The
// `learningStyle: "visual"` override is this test suite's own choice (the
// production fixture uses "reading-writing"); it's preserved here since it
// isn't relevant to what these tests are checking (attribute-rule
// correctness, not variantKey selection).
function makeValidFill(overrides: Partial<SkeletonFill> = {}): SkeletonFill {
  return {
    ...AI_MISTAKE_SHAPE_SIDES_FILL,
    skeletonId: AI_MISTAKE_SHAPE_SIDES_SKELETON_FIXTURE_ID,
    variantKey: {
      ...AI_MISTAKE_SHAPE_SIDES_FILL.variantKey,
      skeletonId: AI_MISTAKE_SHAPE_SIDES_SKELETON_FIXTURE_ID,
      learningStyle: "visual",
    },
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
