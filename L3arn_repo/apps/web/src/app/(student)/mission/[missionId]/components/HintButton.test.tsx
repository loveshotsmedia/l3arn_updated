import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HintButton } from "./HintButton";
import type { HintLadder } from "@l3arn/shared-types";

const ladder: HintLadder = [
  { tier: 1, kind: "nudge", content: "Tier one nudge.", readAloudScript: "Tier one nudge." },
  { tier: 2, kind: "re-explain", content: "Tier two re-explain.", readAloudScript: "Tier two re-explain." },
  { tier: 3, kind: "state-rule", content: "Tier three rule.", readAloudScript: "Tier three rule." },
];

describe("HintButton", () => {
  it("shows the stuck button and no hint text initially", () => {
    render(<HintButton hintLadder={ladder} />);
    expect(screen.getByText("I'm stuck?")).toBeInTheDocument();
    expect(screen.queryByText("Tier one nudge.")).not.toBeInTheDocument();
  });

  it("shows tier 1 on first tap, tier 2 on second, tier 3 on third", () => {
    render(<HintButton hintLadder={ladder} />);
    const button = screen.getByText("I'm stuck?");
    fireEvent.click(button);
    expect(screen.getByText("Tier one nudge.")).toBeInTheDocument();
    fireEvent.click(button);
    expect(screen.getByText("Tier two re-explain.")).toBeInTheDocument();
    expect(screen.queryByText("Tier one nudge.")).not.toBeInTheDocument();
    fireEvent.click(button);
    expect(screen.getByText("Tier three rule.")).toBeInTheDocument();
  });

  it("stays on tier 3 after a fourth tap (no further escalation)", () => {
    render(<HintButton hintLadder={ladder} />);
    const button = screen.getByText("I'm stuck?");
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    expect(screen.getByText("Tier three rule.")).toBeInTheDocument();
  });
});
