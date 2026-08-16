import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

  it("calls cancel() before speak() so the latest tap wins over any queued utterance", () => {
    render(<SpeakerButton text="Read this aloud." />);
    fireEvent.click(screen.getByLabelText("Read aloud"));

    const cancelMock = globalThis.speechSynthesis.cancel as ReturnType<typeof vi.fn>;
    const speakMock = globalThis.speechSynthesis.speak as ReturnType<typeof vi.fn>;

    expect(cancelMock).toHaveBeenCalledTimes(1);
    expect(speakMock).toHaveBeenCalledTimes(1);
    expect(cancelMock.mock.invocationCallOrder[0]).toBeLessThan(
      speakMock.mock.invocationCallOrder[0],
    );
  });
});

describe("SpeakerButton when SpeechSynthesis is unsupported", () => {
  let originalSpeechSynthesis: unknown;
  let originalSpeechSynthesisUtterance: unknown;

  beforeEach(() => {
    originalSpeechSynthesis = (globalThis as { speechSynthesis?: unknown }).speechSynthesis;
    originalSpeechSynthesisUtterance = (
      globalThis as unknown as { SpeechSynthesisUtterance?: unknown }
    ).SpeechSynthesisUtterance;

    delete (globalThis as { speechSynthesis?: unknown }).speechSynthesis;
    delete (globalThis as unknown as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;
  });

  afterEach(() => {
    (globalThis as { speechSynthesis?: unknown }).speechSynthesis = originalSpeechSynthesis;
    (globalThis as unknown as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance =
      originalSpeechSynthesisUtterance;
  });

  it("is a safe no-op when window.speechSynthesis is missing", () => {
    render(<SpeakerButton text="Read this aloud." />);
    expect(() => fireEvent.click(screen.getByLabelText("Read aloud"))).not.toThrow();
  });
});
