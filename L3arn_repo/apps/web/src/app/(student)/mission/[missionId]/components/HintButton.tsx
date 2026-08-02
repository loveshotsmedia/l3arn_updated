"use client";

import { useState } from "react";
import type { HintLadder } from "@l3arn/shared-types";

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

  function handleTap() {
    setTier((prev) => Math.min(prev + 1, 3));
  }

  const activeHint = tier > 0 ? hintLadder[tier - 1] : null;

  return (
    <div style={hintStyles.container}>
      <button style={hintStyles.button} onClick={handleTap}>
        I&apos;m stuck?
      </button>
      {activeHint && <p style={hintStyles.hintText}>{activeHint.content}</p>}
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
  hintText: {
    marginTop: "0.75rem",
    color: "#c7d2fe",
    fontStyle: "italic",
    lineHeight: 1.6,
  },
};
