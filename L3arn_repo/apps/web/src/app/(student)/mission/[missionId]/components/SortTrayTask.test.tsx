import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SortTrayTask } from "./SortTrayTask";
import type { LessonTaskSkeleton, SkeletonFill } from "@l3arn/shared-types";

const skeleton: LessonTaskSkeleton = {
  id: "11111111-1111-4111-8111-111111111111",
  masterySkillId: "22222222-2222-4222-8222-222222222222",
  l3arnMasteryLevel: "emerging",
  taskType: "sort-categorize",
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
  storyFlavor: "The Red Bin needs a crystal — which one belongs?",
  correctItem: { itemId: "crystal-red", attributes: { color: "red", isTargetMatch: true }, presentationText: "A red crystal.", readAloudScript: "A red crystal." },
  distractorItems: [
    { itemId: "crystal-blue", attributes: { color: "blue", isTargetMatch: false }, presentationText: "A blue crystal.", readAloudScript: "A blue crystal." },
    { itemId: "crystal-green", attributes: { color: "green", isTargetMatch: false }, presentationText: "A green crystal.", readAloudScript: "A green crystal." },
  ],
  transferItem: { itemId: "crystal-red-2", attributes: { color: "red", isTargetMatch: true }, presentationText: "A new red crystal.", readAloudScript: "A new red crystal." },
  hintLadderFill: skeleton.hintLadder,
  companionDialogueLine: "Which crystal matches the red bin?",
};

// Real sort-color-crystals fixture, "blue" round (see
// packages/mission-compiler/src/curriculum/skeletons/sort-color-crystals.skeleton.ts
// SORT_ROUND_BLUE_FILL). Alphabetically, "crystal-blue" < "crystal-green" <
// "crystal-red" — and in THIS round the correct item is crystal-blue, so a
// naive itemId.localeCompare sort would render the correct crystal FIRST in
// the tray on every single mount of this exact real round, letting a child
// learn "always tap first" without reading any crystal. (Note: the red and
// green rounds don't happen to reproduce this specific ordering, but the
// blue round does, and the underlying sort pattern is unsafe regardless.)
const blueRoundFill: SkeletonFill = {
  skeletonId: skeleton.id,
  variantKey: fill.variantKey,
  storyFlavor: "The Blue Bin needs a crystal — which one belongs?",
  correctItem: { itemId: "crystal-blue", attributes: { color: "blue", isTargetMatch: true }, presentationText: "A blue crystal.", readAloudScript: "A blue crystal." },
  distractorItems: [
    { itemId: "crystal-red", attributes: { color: "red", isTargetMatch: false }, presentationText: "A red crystal.", readAloudScript: "A red crystal." },
    { itemId: "crystal-green", attributes: { color: "green", isTargetMatch: false }, presentationText: "A green crystal.", readAloudScript: "A green crystal." },
  ],
  transferItem: { itemId: "crystal-blue-2", attributes: { color: "blue", isTargetMatch: true }, presentationText: "A new blue crystal.", readAloudScript: "A new blue crystal." },
  hintLadderFill: skeleton.hintLadder,
  companionDialogueLine: "Look closely — which crystal matches the blue bin?",
};

describe("SortTrayTask", () => {
  it("renders the target-bin banner and all crystals in the tray", () => {
    render(<SortTrayTask skeleton={skeleton} fill={fill} onCorrect={vi.fn()} onWrong={vi.fn()} />);
    expect(screen.getByText("The Red Bin needs a crystal — which one belongs?")).toBeInTheDocument();
    expect(screen.getByLabelText("A red crystal.")).toBeInTheDocument();
    expect(screen.getByLabelText("A blue crystal.")).toBeInTheDocument();
    expect(screen.getByLabelText("A green crystal.")).toBeInTheDocument();
  });

  it("labels every crystal with its color name as text, not color alone (colorblind-safe redundancy)", () => {
    render(<SortTrayTask skeleton={skeleton} fill={fill} onCorrect={vi.fn()} onWrong={vi.fn()} />);
    expect(screen.getByText("Red")).toBeInTheDocument();
    expect(screen.getByText("Blue")).toBeInTheDocument();
    expect(screen.getByText("Green")).toBeInTheDocument();
  });

  it("calls onCorrect when the matching crystal is tapped", () => {
    const onCorrect = vi.fn();
    render(<SortTrayTask skeleton={skeleton} fill={fill} onCorrect={onCorrect} onWrong={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("A red crystal."));
    expect(onCorrect).toHaveBeenCalledTimes(1);
  });

  it("calls onWrong when a non-matching crystal is tapped", () => {
    const onWrong = vi.fn();
    render(<SortTrayTask skeleton={skeleton} fill={fill} onCorrect={vi.fn()} onWrong={onWrong} />);
    fireEvent.click(screen.getByLabelText("A blue crystal."));
    expect(onWrong).toHaveBeenCalledTimes(1);
  });

  it("renders the transferItem crystal when isTransferStep is true", () => {
    render(<SortTrayTask skeleton={skeleton} fill={fill} onCorrect={vi.fn()} onWrong={vi.fn()} isTransferStep />);
    expect(screen.getByLabelText("A new red crystal.")).toBeInTheDocument();
  });

  it("does not render the real blue-round tray in alphabetical order (regression: correct crystal must not always land first)", () => {
    render(<SortTrayTask skeleton={skeleton} fill={blueRoundFill} onCorrect={vi.fn()} onWrong={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    const renderedOrder = buttons.map((btn) => btn.getAttribute("aria-label"));
    const alphabeticalOrder = ["A blue crystal.", "A green crystal.", "A red crystal."];
    expect(renderedOrder).not.toEqual(alphabeticalOrder);
    // The correct crystal (blue) specifically must not be first, matching the
    // concrete failure mode this real round's itemIds would otherwise produce.
    expect(renderedOrder[0]).not.toBe("A blue crystal.");
  });
});
