import { validateSkeletonFill } from "./skeleton-fill-gate";
import type { LessonTaskSkeleton, SkeletonFill } from "@l3arn/shared-types";

const SKELETON_ID = "11111111-1111-4111-8111-111111111111";
const MASTERY_SKILL_ID = "22222222-2222-4222-8222-222222222222";

function makeSkeleton(overrides: Partial<LessonTaskSkeleton> = {}): LessonTaskSkeleton {
  return {
    id: SKELETON_ID,
    masterySkillId: MASTERY_SKILL_ID,
    l3arnMasteryLevel: "emerging",
    taskType: "sort-categorize",
    correctAnswerRule: { field: "sides", op: "eq", value: 4 },
    distractorRule: {
      count: 2,
      plausibilityRule: { field: "sides", op: "neq", value: 4 },
    },
    transferExampleRule: { field: "sides", op: "eq", value: 4 },
    hintLadder: [
      { tier: 1, kind: "nudge", content: "Count the straight edges.", readAloudScript: "Count the straight edges." },
      {
        tier: 2,
        kind: "re-explain",
        content: "A square-like shape has 4 equal straight sides.",
        readAloudScript: "A square-like shape has 4 equal straight sides.",
      },
      {
        tier: 3,
        kind: "state-rule",
        content: "The rule: it belongs in the 4-sided bin only if it has exactly 4 sides.",
        readAloudScript: "The rule: it belongs in the 4-sided bin only if it has exactly 4 sides.",
      },
    ],
    isActive: true,
    version: 1,
    ...overrides,
  };
}

function makeValidFill(overrides: Partial<SkeletonFill> = {}): SkeletonFill {
  return {
    skeletonId: SKELETON_ID,
    variantKey: {
      skeletonId: SKELETON_ID,
      learningStyle: "visual",
      readingTier: "grade-level",
      l3arnMasteryLevel: "emerging",
    },
    storyFlavor: "Sort the crystal into the correct bin.",
    correctItem: {
      itemId: "item-square",
      attributes: { sides: 4 },
      presentationText: "A blue crystal with 4 straight sides.",
      readAloudScript: "A blue crystal with 4 straight sides.",
    },
    distractorItems: [
      {
        itemId: "item-triangle",
        attributes: { sides: 3 },
        presentationText: "A red crystal with 3 straight sides.",
        readAloudScript: "A red crystal with 3 straight sides.",
      },
      {
        itemId: "item-hexagon",
        attributes: { sides: 6 },
        presentationText: "A green crystal with 6 straight sides.",
        readAloudScript: "A green crystal with 6 straight sides.",
      },
    ],
    transferItem: {
      itemId: "item-square-2",
      attributes: { sides: 4 },
      presentationText: "A NEW purple crystal — does it belong in the 4-sided bin?",
      readAloudScript: "A new purple crystal. Does it belong in the 4-sided bin?",
    },
    hintLadderFill: [
      { tier: 1, kind: "nudge", content: "Count the straight edges.", readAloudScript: "Count the straight edges." },
      {
        tier: 2,
        kind: "re-explain",
        content: "A square-like shape has 4 equal straight sides.",
        readAloudScript: "A square-like shape has 4 equal straight sides.",
      },
      {
        tier: 3,
        kind: "state-rule",
        content: "The rule: it belongs in the 4-sided bin only if it has exactly 4 sides.",
        readAloudScript: "The rule: it belongs in the 4-sided bin only if it has exactly 4 sides.",
      },
    ],
    companionDialogueLine: "Let's figure out where this one goes!",
    ...overrides,
  };
}

describe("validateSkeletonFill", () => {
  it("passes for a fully correct fill", () => {
    const result = validateSkeletonFill(makeSkeleton(), makeValidFill());
    expect(result).toEqual({ valid: true, failures: [] });
  });

  it("fails closed when the fill targets a different skeleton", () => {
    const result = validateSkeletonFill(
      makeSkeleton(),
      makeValidFill({ skeletonId: "99999999-9999-4999-8999-999999999999" }),
    );
    expect(result.valid).toBe(false);
    expect(result.failures[0].code).toBe("skeleton-id-mismatch");
  });

  it("fails when the correct item does not actually satisfy the rule (hallucinated correct answer)", () => {
    const badFill = makeValidFill({
      correctItem: { itemId: "item-bad", attributes: { sides: 5 }, presentationText: "x", readAloudScript: "x" },
    });
    const result = validateSkeletonFill(makeSkeleton(), badFill);
    expect(result.valid).toBe(false);
    expect(result.failures.map((f) => f.code)).toContain("correct-item-fails-rule");
  });

  it("fails closed when the correct item's attributes omit a field the rule references", () => {
    const badFill = makeValidFill({
      correctItem: { itemId: "item-missing-field", attributes: {}, presentationText: "x", readAloudScript: "x" },
    });
    const result = validateSkeletonFill(makeSkeleton(), badFill);
    expect(result.valid).toBe(false);
    expect(result.failures.map((f) => f.code)).toContain("correct-item-fails-rule");
  });

  it("fails when a distractor actually satisfies the correct-answer rule", () => {
    const badFill = makeValidFill({
      distractorItems: [
        { itemId: "item-oops", attributes: { sides: 4 }, presentationText: "x", readAloudScript: "x" },
        { itemId: "item-hexagon", attributes: { sides: 6 }, presentationText: "x", readAloudScript: "x" },
      ],
    });
    const result = validateSkeletonFill(makeSkeleton(), badFill);
    expect(result.valid).toBe(false);
    expect(result.failures.map((f) => f.code)).toContain("distractor-satisfies-rule");
  });

  it("fails when a distractor is implausible (fails the plausibility rule)", () => {
    const skeleton = makeSkeleton({
      distractorRule: { count: 2, plausibilityRule: { field: "sides", op: "gt", value: 2 } },
    });
    const badFill = makeValidFill({
      distractorItems: [
        { itemId: "item-degenerate", attributes: { sides: 1 }, presentationText: "x", readAloudScript: "x" },
        { itemId: "item-hexagon", attributes: { sides: 6 }, presentationText: "x", readAloudScript: "x" },
      ],
    });
    const result = validateSkeletonFill(skeleton, badFill);
    expect(result.valid).toBe(false);
    expect(result.failures.map((f) => f.code)).toContain("distractor-fails-plausibility");
  });

  it("fails when the distractor count does not match the authored count", () => {
    const badFill = makeValidFill({
      distractorItems: [{ itemId: "item-triangle", attributes: { sides: 3 }, presentationText: "x", readAloudScript: "x" }],
    });
    const result = validateSkeletonFill(makeSkeleton(), badFill);
    expect(result.valid).toBe(false);
    expect(result.failures.map((f) => f.code)).toContain("distractor-count-mismatch");
  });

  it("fails when the transfer item does not satisfy the transfer rule", () => {
    const badFill = makeValidFill({
      transferItem: { itemId: "item-square-2", attributes: { sides: 5 }, presentationText: "x", readAloudScript: "x" },
    });
    const result = validateSkeletonFill(makeSkeleton(), badFill);
    expect(result.valid).toBe(false);
    expect(result.failures.map((f) => f.code)).toContain("transfer-item-fails-rule");
  });

  it("fails when the transfer item is not actually novel (same id as the correct item)", () => {
    const badFill = makeValidFill({
      transferItem: { itemId: "item-square", attributes: { sides: 4 }, presentationText: "x", readAloudScript: "x" },
    });
    const result = validateSkeletonFill(makeSkeleton(), badFill);
    expect(result.valid).toBe(false);
    expect(result.failures.map((f) => f.code)).toContain("transfer-item-not-novel");
  });

  it("collects multiple simultaneous failures rather than stopping at the first", () => {
    const badFill = makeValidFill({
      correctItem: { itemId: "item-bad", attributes: { sides: 5 }, presentationText: "x", readAloudScript: "x" },
      transferItem: { itemId: "item-bad-2", attributes: { sides: 5 }, presentationText: "x", readAloudScript: "x" },
    });
    const result = validateSkeletonFill(makeSkeleton(), badFill);
    expect(result.failures.map((f) => f.code)).toEqual(
      expect.arrayContaining(["correct-item-fails-rule", "transfer-item-fails-rule"]),
    );
  });
});
