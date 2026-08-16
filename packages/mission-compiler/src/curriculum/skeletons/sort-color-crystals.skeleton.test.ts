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
