"use client";

import { useState } from "react";
import type { LessonTaskSkeleton, SkeletonFill } from "@l3arn/shared-types";

interface OptionListTaskProps {
  skeleton: LessonTaskSkeleton;
  fill: SkeletonFill;
  onCorrect: () => void;
  onWrong: () => void;
  isTransferStep?: boolean;
}

/**
 * Renders choice / apply-to-new / ai-mistake-check tasks — all three share
 * the identical correctItem/distractorItems/transferItem data shape from
 * the content contract, so one component handles all three visually.
 *
 * Touch targets sized per children's-motor-development research (see
 * docs/superpowers/specs/2026-07-20-adaptive-lesson-runtime-design.md §3) —
 * larger than the pre-sub-project-2 option buttons.
 */
export function OptionListTask({ skeleton, fill, onCorrect, onWrong, isTransferStep }: OptionListTaskProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  const options = isTransferStep
    ? [fill.transferItem]
    : [fill.correctItem, ...fill.distractorItems];

  const correctItemId = isTransferStep ? fill.transferItem.itemId : fill.correctItem.itemId;

  // Stable order per render (not re-shuffled on re-render, so a wrong tap's
  // visual feedback doesn't reorder the list under the child).
  const orderedOptions = isTransferStep ? options : [...options].sort((a, b) => a.itemId.localeCompare(b.itemId));

  function handleSelect(itemId: string) {
    if (resolved) return;
    setSelectedId(itemId);
    if (itemId === correctItemId) {
      setResolved(true);
      onCorrect();
    } else {
      onWrong();
    }
  }

  return (
    <div style={optionListStyles.container}>
      <p style={optionListStyles.storyFlavor}>{fill.storyFlavor}</p>
      <div style={optionListStyles.optionList}>
        {orderedOptions.map((opt) => {
          const isSelected = selectedId === opt.itemId;
          const isCorrectAnswer = opt.itemId === correctItemId;
          const showCorrect = isSelected && isCorrectAnswer;
          const showWrong = isSelected && !isCorrectAnswer;
          return (
            <button
              key={opt.itemId}
              style={{
                ...optionListStyles.optionBtn,
                background: showCorrect ? "rgba(34,197,94,0.2)" : showWrong ? "rgba(239,68,68,0.15)" : "rgba(30,41,59,0.95)",
                borderColor: showCorrect ? "rgba(34,197,94,0.6)" : showWrong ? "rgba(239,68,68,0.5)" : "rgba(99,102,241,0.3)",
                cursor: resolved ? "default" : "pointer",
              }}
              onClick={() => handleSelect(opt.itemId)}
              disabled={resolved}
            >
              {opt.presentationText}
              {showCorrect && <span style={optionListStyles.checkIcon}> ✓</span>}
              {showWrong && <span style={optionListStyles.xIcon}> ✗</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const optionListStyles: Record<string, React.CSSProperties> = {
  container: { display: "flex", flexDirection: "column" },
  storyFlavor: { color: "#94a3b8", lineHeight: 1.7, marginBottom: "1.25rem" },
  optionList: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  optionBtn: {
    width: "100%",
    minHeight: "68px",
    padding: "1.1rem 1.25rem",
    borderRadius: "12px",
    border: "1px solid",
    textAlign: "left",
    color: "#e2e8f0",
    fontSize: "1rem",
    cursor: "pointer",
    transition: "all 0.2s ease",
    lineHeight: 1.5,
  },
  checkIcon: { color: "#4ade80", fontWeight: 700 },
  xIcon: { color: "#f87171", fontWeight: 700 },
};
