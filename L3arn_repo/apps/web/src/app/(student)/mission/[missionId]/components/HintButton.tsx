"use client";

import { useEffect, useState } from "react";
import type { HintLadder } from "@l3arn/shared-types";
import { SpeakerButton } from "./SpeakerButton";

interface HintButtonProps {
  hintLadder: HintLadder;
}

/**
 * Child-triggered hint escalation. Timing/auto-detection of struggle is
 * explicitly sub-project 3's job (the live tutor) — this only renders the
 * authored ladder and lets the child themselves ask for more help.
 */
export function HintButton({ hintLadder }: HintButtonProps) {
  const [tier, setTier] = useState(0); // 0 = not yet requested

  // Reset escalation whenever a new task's hint ladder arrives so a child who
  // reached tier 3 on the previous task doesn't see stale/advanced hint
  // content before tapping again on the new task. This makes the component
  // correct even if a future integrator forgets to force a remount via `key`.
  useEffect(() => {
    setTier(0);
  }, [hintLadder]);

  function handleTap() {
    setTier((prev) => Math.min(prev + 1, 3));
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
