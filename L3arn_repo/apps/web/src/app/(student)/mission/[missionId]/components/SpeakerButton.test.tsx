import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SpeakerButton } from "./SpeakerButton";

describe("SpeakerButton", () => {
  beforeEach(() => {
    // jsdom has no SpeechSynthesis — stub it so the component can call it.
    (globalThis as { speechSynthesis?: unknown }).speechSynthesis = { speak: vi.fn(), cancel: vi.fn() };
    (globalThis as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = vi
      .fn()
      .mockImplementation((text: string) => ({ text }));
  });

  it("renders a speaker icon button, always visible", () => {
    render(<SpeakerButton text="Read this aloud." />);
    expect(screen.getByLabelText("Read aloud")).toBeInTheDocument();
  });

  it("calls speechSynthesis.speak with the given text when tapped", () => {
    render(<SpeakerButton text="Read this aloud." />);
    fireEvent.click(screen.getByLabelText("Read aloud"));
    expect(globalThis.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    const utterance = (globalThis.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(utterance.text).toBe("Read this aloud.");
  });
});
