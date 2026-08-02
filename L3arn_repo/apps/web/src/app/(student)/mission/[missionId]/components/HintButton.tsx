"use client";

import { useEffect, useState } from "react";
import type { HintLadder } from "@l3arn/shared-types";
import { SpeakerButton } from "./SpeakerButton";

interface HintButtonProps {
  hintLadder: HintLadder;
  /**
   * Called exactly once each time the tier genuinely advances (i.e. a tap
   * actually increases the tier). Not called for a tap that occurs once the
   * ladder is already capped at tier 3 — that tap is a no-op escalation-wise
   * and must not be double-counted by telemetry consumers (e.g. the
   * mission-wide `hintsUsed` counter feeding the calibration engine's
   * "hint-frequency" signal).
   */
  onEscalate?: () => void;
}

/**
 * Child-triggered hint escalation. Timing/auto-detection of struggle is
 * explicitly sub-project 3's job (the live tutor) — this only renders the
 * authored ladder and lets the child themselves ask for more help.
 */
export function HintButton({ hintLadder, onEscalate }: HintButtonProps) {
  const [tier, setTier] = useState(0); // 0 = not yet requested

  // Reset escalation whenever a new task's hint ladder arrives so a child who
  // reached tier 3 on the previous task doesn't see stale/advanced hint
  // content before tapping again on the new task. This makes the component
  // correct even if a future integrator forgets to force a remount via `key`.
  useEffect(() => {
    setTier(0);
  }, [hintLadder]);

  function handleTap() {
    // Read `tier` directly (not a functional setState updater) so the
    // escalation callback — a side effect — is invoked exactly once per
    // genuine advance, not subject to React re-invoking an updater function.
    if (tier >= 3) return; // already capped: no-op, do not double-count
    setTier(tier + 1);
    onEscalate?.();
  }

  const activeHint = tier > 0 ? hintLadder[tier - 1] : null;

  return (
    <div style={hintStyles.container}>
      <button style={hintStyles.button} onClick={handleTap}>
        I&apos;m stuck?
      </button>
      {activeHint && (
        <div style={hintStyles.hintRow}>
          <p style={hintStyles.hintText} aria-live="polite">
            {activeHint.content}
          </p>
          <SpeakerButton text={activeHint.readAloudScript} />
        </div>
      )}
    </div>
  );
}

const hintStyles: Record<string, React.CSSProperties> = {
  container: { marginTop: "1rem" },
  button: {
    minHeight: "56px",
    padding: "0.75rem 1.25rem",
    borderRadius: "10px",
    border: "1px solid rgba(129,140,248,0.4)",
    background: "rgba(99,102,241,0.1)",
    color: "#a5b4fc",
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  hintRow: {
    marginTop: "0.75rem",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  hintText: {
    color: "#c7d2fe",
    fontStyle: "italic",
    lineHeight: 1.6,
    margin: 0,
  },
};
