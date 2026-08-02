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
