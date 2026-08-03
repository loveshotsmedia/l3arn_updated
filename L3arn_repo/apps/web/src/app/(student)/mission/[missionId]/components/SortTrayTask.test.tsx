import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SortTrayTask, COLOR_HEX, COLOR_EMOJI, FALLBACK_COLOR_HEX, FALLBACK_COLOR_EMOJI } from "./SortTrayTask";
import type { LessonTaskSkeleton, SkeletonFill } from "@l3arn/shared-types";

// jsdom's CSSOM canonicalizes hex colors to `rgb(r, g, b)` in the serialized
// style attribute, so the raw-attribute assertions below compare against
// this, not the literal "#rrggbb" strings from COLOR_HEX/FALLBACK_COLOR_HEX.
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

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

// Regression fixture — mirrors the real apply-to-new-color transfer step
// (packages/mission-compiler/src/curriculum/skeletons/apply-to-new-color.skeleton.ts),
// whose transferItem deliberately uses "orange": a color never shown in the
// preceding red/blue/green teaching rounds, so the transfer check is a
// genuine generalization test rather than a repeat of an already-seen color.
// Before this fix, "orange" had no COLOR_HEX/COLOR_EMOJI entry, so the
// rendered crystal had `background: "undefined26"` (invalid CSS, silently
// dropped), an undefined borderColor (browser default), and a blank emoji —
// confirmed via verification-screenshots/10-apply-to-new-transfer-step4.png.
const orangeTransferFill: SkeletonFill = {
  skeletonId: skeleton.id,
  variantKey: fill.variantKey,
  storyFlavor: "A brand-new crystal appeared. The Purple Bin needs a crystal — which one belongs?",
  correctItem: { itemId: "crystal-purple", attributes: { color: "purple", isTargetMatch: true }, presentationText: "A purple crystal.", readAloudScript: "A purple crystal." },
  distractorItems: [
    { itemId: "crystal-red-2", attributes: { color: "red", isTargetMatch: false }, presentationText: "A red crystal.", readAloudScript: "A red crystal." },
    { itemId: "crystal-blue-2", attributes: { color: "blue", isTargetMatch: false }, presentationText: "A blue crystal.", readAloudScript: "A blue crystal." },
  ],
  transferItem: { itemId: "crystal-orange", attributes: { color: "orange", isTargetMatch: true }, presentationText: "A brand-new orange crystal.", readAloudScript: "A brand-new orange crystal." },
  hintLadderFill: skeleton.hintLadder,
  companionDialogueLine: "You've never seen this color before — but do you remember the rule?",
};

// Hypothetical fixture — a color that does NOT exist anywhere in either map
// or in any real fixture today. Stands in for a color a future (not-yet-built)
// content-generation pipeline might author. Proves the generic fallback keeps
// rendering safe rather than crashing or leaking "undefined" into a style
// string, without asserting it gets the same treatment as a color with a real
// explicit entry.
const unmappedColorFill: SkeletonFill = {
  skeletonId: skeleton.id,
  variantKey: fill.variantKey,
  storyFlavor: "The Teal Bin needs a crystal — which one belongs?",
  correctItem: { itemId: "crystal-teal", attributes: { color: "teal", isTargetMatch: true }, presentationText: "A teal crystal.", readAloudScript: "A teal crystal." },
  distractorItems: [
    { itemId: "crystal-red", attributes: { color: "red", isTargetMatch: false }, presentationText: "A red crystal.", readAloudScript: "A red crystal." },
    { itemId: "crystal-blue", attributes: { color: "blue", isTargetMatch: false }, presentationText: "A blue crystal.", readAloudScript: "A blue crystal." },
  ],
  transferItem: { itemId: "crystal-teal-2", attributes: { color: "teal", isTargetMatch: true }, presentationText: "A new teal crystal.", readAloudScript: "A new teal crystal." },
  hintLadderFill: skeleton.hintLadder,
  companionDialogueLine: "Which crystal matches the teal bin?",
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

  // Regression: aria-label fully overrides a button's accessible name, so the
  // visible ✓/✗ feedback rendered as sibling text content is invisible to
  // screen readers unless the label itself is updated. These two tests
  // confirm the accessible name — not just the visible text — reflects the
  // outcome after a tap.
  it("appends a correct-outcome suffix to the aria-label once the matching crystal is tapped", () => {
    render(<SortTrayTask skeleton={skeleton} fill={fill} onCorrect={vi.fn()} onWrong={vi.fn()} />);
    const redCrystal = screen.getByLabelText("A red crystal.");
    fireEvent.click(redCrystal);
    expect(redCrystal).toHaveAttribute("aria-label", "A red crystal. — correct!");
  });

  it("appends a try-again suffix to the aria-label once a non-matching crystal is tapped", () => {
    render(<SortTrayTask skeleton={skeleton} fill={fill} onCorrect={vi.fn()} onWrong={vi.fn()} />);
    const blueCrystal = screen.getByLabelText("A blue crystal.");
    fireEvent.click(blueCrystal);
    expect(blueCrystal).toHaveAttribute("aria-label", "A blue crystal. — try again");
  });

  // Regression: real apply-to-new-color transfer step (see orangeTransferFill
  // comment above). The orange transfer crystal must render with its real,
  // explicit color/emoji — not the generic fallback — now that COLOR_HEX and
  // COLOR_EMOJI both carry an "orange" entry.
  it("renders the real orange transfer crystal with its explicit color and emoji, not the generic fallback", () => {
    render(<SortTrayTask skeleton={skeleton} fill={orangeTransferFill} onCorrect={vi.fn()} onWrong={vi.fn()} isTransferStep />);
    const orangeCrystal = screen.getByLabelText("A brand-new orange crystal.");
    expect(orangeCrystal).toBeInTheDocument();
    expect(screen.getByText("Orange")).toBeInTheDocument();
    // Check the raw inline style attribute string directly (not the
    // jsdom-parsed CSSOM, which can re-normalize an 8-digit hex `background`
    // shorthand in ways unrelated to what we're verifying here) — it must
    // contain the real explicit hex, and must never contain "undefined".
    const styleAttr = orangeCrystal.getAttribute("style") ?? "";
    expect(styleAttr).toContain(hexToRgb(COLOR_HEX.orange));
    expect(styleAttr).not.toContain("undefined");
    // The distinct explicit orange emoji, not the generic fallback mark.
    expect(screen.getByText(COLOR_EMOJI.orange)).toBeInTheDocument();
    expect(screen.queryByText(FALLBACK_COLOR_EMOJI)).not.toBeInTheDocument();
  });

  // Regression (generic-fallback half of the fix): a color with NO entry in
  // either map anywhere — standing in for a future, not-yet-built
  // content-generation pipeline authoring an arbitrary color — must still
  // render safely: no crash, no literal "undefined" leaking into a style
  // string, and the documented generic fallback color/emoji used instead.
  it("renders an unmapped color safely with the generic fallback, never leaking 'undefined' into a style string", () => {
    render(<SortTrayTask skeleton={skeleton} fill={unmappedColorFill} onCorrect={vi.fn()} onWrong={vi.fn()} />);
    const tealCrystal = screen.getByLabelText("A teal crystal.");
    expect(tealCrystal).toBeInTheDocument();
    const styleAttr = tealCrystal.getAttribute("style") ?? "";
    expect(styleAttr).not.toContain("undefined");
    expect(styleAttr).toContain(hexToRgb(FALLBACK_COLOR_HEX));
    expect(screen.getByText(FALLBACK_COLOR_EMOJI)).toBeInTheDocument();
  });

  // Coverage check: every color literal actually used across the real
  // fixtures served via MISSION_001_LESSON_SEQUENCE
  // (packages/mission-compiler/src/curriculum/mission-001-lesson-sequence.ts)
  // must have an explicit COLOR_HEX/COLOR_EMOJI entry, so no real,
  // already-shipped fixture ever silently falls back to the generic
  // placeholder. This list is hand-verified against a grep of every literal
  // `color:` attribute in packages/mission-compiler/src/curriculum/skeletons/*.ts
  // as of this fix:
  //   sort-color-crystals.skeleton.ts       -> red, blue, green
  //   apply-to-new-color.skeleton.ts        -> purple (correctItem), orange (transferItem)
  //   ai-mistake-shape-sides.skeleton.ts    -> no color attribute (not a SortTrayTask fixture)
  // NOTE: this list is NOT auto-derived from the fixtures (mission-compiler
  // isn't a dependency of @l3arn/web), so it must be updated by hand if a
  // future fixture introduces a new color literal — this is exactly the kind
  // of check that would have caught this bug before it shipped.
  it("has an explicit COLOR_HEX/COLOR_EMOJI entry for every color literal used in the real curriculum fixtures", () => {
    const realFixtureColors = ["red", "blue", "green", "purple", "orange"];
    for (const color of realFixtureColors) {
      expect(COLOR_HEX[color], `COLOR_HEX is missing an explicit entry for "${color}"`).toBeDefined();
      expect(COLOR_EMOJI[color], `COLOR_EMOJI is missing an explicit entry for "${color}"`).toBeDefined();
    }
  });
});
