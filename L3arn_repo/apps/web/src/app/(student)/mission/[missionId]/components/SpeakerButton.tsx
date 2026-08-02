"use client";

interface SpeakerButtonProps {
  text: string;
}

/**
 * Universal read-aloud affordance — always visible, child-toggled, never a
 * "struggling reader" mode (per docs/superpowers/specs/2026-07-19-lesson-
 * engine-content-contract-design.md §3.1). Uses the browser's built-in
 * SpeechSynthesis API — no external TTS service dependency for this sub-project.
 */
export function SpeakerButton({ text }: SpeakerButtonProps) {
  function handleTap() {
    if (
      typeof window === "undefined" ||
      !window.speechSynthesis ||
      !window.SpeechSynthesisUtterance
    ) {
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      // A known iOS Safari quirk: speak() called right after cancel() can
      // silently drop the utterance. We can't recover the read-aloud here,
      // but we must not let it throw uncaught — log for diagnostics and
      // fail safe (no user-facing error UI; out of scope for this fix).
      console.warn("SpeakerButton: speechSynthesis failed", error);
    }
  }

  return (
    <button type="button" aria-label="Read aloud" onClick={handleTap} style={speakerStyles.button}>
      🔊
    </button>
  );
}

const speakerStyles: Record<string, React.CSSProperties> = {
  button: {
    // Sized to the same large-touch-target standard as the other interactive
    // elements in this runtime (see design spec §3) — this is a control a
    // pre-reader may need to tap often, not a minor utility icon.
    width: "56px",
    height: "56px",
    minWidth: "56px",
    minHeight: "56px",
    borderRadius: "50%",
    border: "1px solid rgba(129,140,248,0.4)",
    background: "rgba(99,102,241,0.1)",
    fontSize: "1.3rem",
    cursor: "pointer",
  },
};
