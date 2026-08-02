import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OptionListTask } from "./OptionListTask";
import type { LessonTaskSkeleton, SkeletonFill } from "@l3arn/shared-types";

const skeleton: LessonTaskSkeleton = {
  id: "11111111-1111-4111-8111-111111111111",
  masterySkillId: "22222222-2222-4222-8222-222222222222",
  l3arnMasteryLevel: "emerging",
  taskType: "choice",
  correctAnswerRule: { field: "isTargetMatch", op: "eq", value: true },
  distractorRule: { count: 2, plausibilityRule: { field: "isTargetMatch", op: "eq", value: false } },
  transferExampleRule: { field: "isTargetMatch", op: "eq", value: true },
  hintLadder: [
    { tier: 1, kind: "nudge", content: "Nudge.", readAloudScript: "Nudge." },
    { tier: 2, kind: "re-explain", content: "Re-explain.", readAloudScript: "Re-explain." },
    { tier: 3, kind: "state-rule", content: "Rule.", readAloudScript: "Rule." },
  ],
  isActive: true,
  version: 1,
};

const fill: SkeletonFill = {
  skeletonId: skeleton.id,
  variantKey: { skeletonId: skeleton.id, learningStyle: "reading-writing", readingTier: "grade-level", l3arnMasteryLevel: "emerging" },
  storyFlavor: "Pick the right one.",
  correctItem: { itemId: "opt-correct", attributes: { isTargetMatch: true }, presentationText: "The correct option.", readAloudScript: "The correct option." },
  distractorItems: [
    { itemId: "opt-wrong-1", attributes: { isTargetMatch: false }, presentationText: "A wrong option.", readAloudScript: "A wrong option." },
    { itemId: "opt-wrong-2", attributes: { isTargetMatch: false }, presentationText: "Another wrong option.", readAloudScript: "Another wrong option." },
  ],
  transferItem: { itemId: "opt-transfer", attributes: { isTargetMatch: true }, presentationText: "A new correct option.", readAloudScript: "A new correct option." },
  hintLadderFill: skeleton.hintLadder,
  companionDialogueLine: "Which one is right?",
};

describe("OptionListTask", () => {
  it("renders the story flavor and all three options (correct + 2 distractors) in random-stable order", () => {
    render(<OptionListTask skeleton={skeleton} fill={fill} onCorrect={vi.fn()} onWrong={vi.fn()} />);
    expect(screen.getByText("Pick the right one.")).toBeInTheDocument();
    expect(screen.getByText("The correct option.")).toBeInTheDocument();
    expect(screen.getByText("A wrong option.")).toBeInTheDocument();
    expect(screen.getByText("Another wrong option.")).toBeInTheDocument();
  });

  it("calls onCorrect when the correct option is tapped", () => {
    const onCorrect = vi.fn();
    render(<OptionListTask skeleton={skeleton} fill={fill} onCorrect={onCorrect} onWrong={vi.fn()} />);
    fireEvent.click(screen.getByText("The correct option."));
    expect(onCorrect).toHaveBeenCalledTimes(1);
  });

  it("calls onWrong (not onCorrect) when a distractor is tapped", () => {
    const onCorrect = vi.fn();
    const onWrong = vi.fn();
    render(<OptionListTask skeleton={skeleton} fill={fill} onCorrect={onCorrect} onWrong={onWrong} />);
    fireEvent.click(screen.getByText("A wrong option."));
    expect(onWrong).toHaveBeenCalledTimes(1);
    expect(onCorrect).not.toHaveBeenCalled();
  });

  it("renders the transferItem instead of the teaching items when isTransferStep is true", () => {
    render(<OptionListTask skeleton={skeleton} fill={fill} onCorrect={vi.fn()} onWrong={vi.fn()} isTransferStep />);
    expect(screen.getByText("A new correct option.")).toBeInTheDocument();
    expect(screen.queryByText("The correct option.")).not.toBeInTheDocument();
  });
});
