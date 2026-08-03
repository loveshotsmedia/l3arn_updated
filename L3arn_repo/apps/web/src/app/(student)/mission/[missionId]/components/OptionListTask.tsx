"use client";

import { useState } from "react";
import type { LessonTaskSkeleton, SkeletonFill } from "@l3arn/shared-types";
import { sortByHash } from "./deterministic-order";
import { PolygonShape } from "./PolygonShape";

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

  // Deterministic-but-correctness-independent order: sort by a hash of each
  // itemId, not by itemId text itself. A plain alphabetical sort is NOT safe
  // here — real fixtures name items things like "critique-correct" vs.
  // "critique-distractor-a", and "correct" < "distractor" alphabetically, so
  // the correct answer would render first on every single mount, letting a
  // child learn "always tap first" without reading any option. Hashing the
  // id breaks that correlation while staying stable across re-renders (same
  // fill -> same order every time), so a wrong tap's visual feedback still
  // doesn't reorder the list under the child.
  const orderedOptions = isTransferStep ? options : sortByHash(options);

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
          // ai-mistake-check items carry a real actualSides count so the
          // child can verify a claim by counting, instead of the caption
          // just telling them the verdict outright.
          const actualSides = opt.attributes.actualSides;
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
              <span style={optionListStyles.optionRow}>
                {typeof actualSides === "number" && <PolygonShape sides={actualSides} />}
                <span>
                  {opt.presentationText}
                  {showCorrect && <span style={optionListStyles.checkIcon}> ✓</span>}
                  {showWrong && <span style={optionListStyles.xIcon}> ✗</span>}
                </span>
              </span>
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
  optionRow: { display: "flex", alignItems: "center", gap: "1rem" },
  checkIcon: { color: "#4ade80", fontWeight: 700 },
  xIcon: { color: "#f87171", fontWeight: 700 },
};
