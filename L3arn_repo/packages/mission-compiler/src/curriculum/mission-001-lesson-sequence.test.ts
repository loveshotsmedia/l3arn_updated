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
