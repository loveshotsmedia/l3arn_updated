import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HintButton } from "./HintButton";
import type { HintLadder } from "@l3arn/shared-types";

const ladder: HintLadder = [
  { tier: 1, kind: "nudge", content: "Tier one nudge.", readAloudScript: "Tier one nudge." },
  { tier: 2, kind: "re-explain", content: "Tier two re-explain.", readAloudScript: "Tier two re-explain." },
  { tier: 3, kind: "state-rule", content: "Tier three rule.", readAloudScript: "Tier three rule." },
];

const secondLadder: HintLadder = [
  { tier: 1, kind: "nudge", content: "Task two tier one nudge.", readAloudScript: "Task two tier one nudge." },
  {
    tier: 2,
    kind: "re-explain",
    content: "Task two tier two re-explain.",
    readAloudScript: "Task two tier two re-explain.",
  },
  {
    tier: 3,
    kind: "state-rule",
    content: "Task two tier three rule.",
    readAloudScript: "Task two tier three rule.",
  },
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

  it("calls onEscalate exactly once per genuine tier advance, and not again once capped at tier 3", () => {
    const onEscalate = vi.fn();
    render(<HintButton hintLadder={ladder} onEscalate={onEscalate} />);
    const button = screen.getByText("I'm stuck?");

    fireEvent.click(button); // tier 0 -> 1
    expect(onEscalate).toHaveBeenCalledTimes(1);
    fireEvent.click(button); // tier 1 -> 2
    expect(onEscalate).toHaveBeenCalledTimes(2);
    fireEvent.click(button); // tier 2 -> 3
    expect(onEscalate).toHaveBeenCalledTimes(3);

    // 4th+ tap: already capped at tier 3, no genuine advance — must not
    // increment the caller's counter again.
    fireEvent.click(button);
    expect(onEscalate).toHaveBeenCalledTimes(3);
    fireEvent.click(button);
    expect(onEscalate).toHaveBeenCalledTimes(3);
  });

  it("resets tier back to 0 when the hintLadder prop changes on the same instance", () => {
    const { rerender } = render(<HintButton hintLadder={ladder} />);
    const button = screen.getByText("I'm stuck?");

    // Escalate to tier 3 on the first task's ladder.
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    expect(screen.getByText("Tier three rule.")).toBeInTheDocument();

    // Simulate a parent advancing to a new task and passing a new hintLadder
    // to the SAME component instance (no key change / no unmount).
    rerender(<HintButton hintLadder={secondLadder} />);

    // No stale tier-3 content from the old ladder should remain, and the new
    // ladder's content should not appear until the child taps again.
    expect(screen.queryByText("Tier three rule.")).not.toBeInTheDocument();
    expect(screen.queryByText("Task two tier one nudge.")).not.toBeInTheDocument();
    expect(screen.queryByText("Task two tier two re-explain.")).not.toBeInTheDocument();
    expect(screen.queryByText("Task two tier three rule.")).not.toBeInTheDocument();

    // Tapping now should start the new ladder from tier 1, proving the tier
    // counter itself was reset rather than just the visible content changing.
    fireEvent.click(button);
    expect(screen.getByText("Task two tier one nudge.")).toBeInTheDocument();
  });

  it("shows a read-aloud (SpeakerButton) control only once a hint tier is active, exactly once per tier", () => {
    render(<HintButton hintLadder={ladder} />);
    const button = screen.getByText("I'm stuck?");

    // Before any hint is requested: no read-aloud control for hint content.
    expect(screen.queryByLabelText("Read aloud")).not.toBeInTheDocument();

    // Tier 1: exactly one read-aloud control appears (not accumulating).
    fireEvent.click(button);
    expect(screen.getByText("Tier one nudge.")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Read aloud")).toHaveLength(1);

    // Tier 2: still exactly one — the tier 1 control does not linger.
    fireEvent.click(button);
    expect(screen.getByText("Tier two re-explain.")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Read aloud")).toHaveLength(1);

    // Tier 3: still exactly one.
    fireEvent.click(button);
    expect(screen.getByText("Tier three rule.")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Read aloud")).toHaveLength(1);
  });
});
