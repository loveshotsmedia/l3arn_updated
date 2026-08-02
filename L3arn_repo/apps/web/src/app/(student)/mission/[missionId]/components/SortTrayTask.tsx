"use client";

import { useState } from "react";
import type { LessonTaskSkeleton, SkeletonFill } from "@l3arn/shared-types";
import { sortByHash } from "./deterministic-order";

interface SortTrayTaskProps {
  skeleton: LessonTaskSkeleton;
  fill: SkeletonFill;
  onCorrect: () => void;
  onWrong: () => void;
  isTransferStep?: boolean;
}

const COLOR_HEX: Record<string, string> = { red: "#ef4444", blue: "#3b82f6", green: "#22c55e", purple: "#a855f7" };
const COLOR_EMOJI: Record<string, string> = { red: "🔴", blue: "🔵", green: "🟢", purple: "🟣" };

/**
 * Real color-sort discrimination — tap-then-select (not drag: dragging is
 * developmentally hard for this age band's motor skills, see design spec §3).
 * A mixed tray of colors is shown; the child taps the ONE that matches the
 * announced target bin. Never color-only: every crystal pairs its color
 * fill with a text label (colorblind-safe redundancy — the reframing from
 * "colored bins" to "single-target rounds" removed the bin element that
 * originally carried this redundancy in the approved mockup, so the label
 * moved onto the tray items themselves to preserve the same guarantee).
 *
 * Kinesthetic-style-specific animation (tap-and-fly vs. plain swap) is
 * deferred: no real learning-style signal exists yet to gate it on (see
 * this plan's "Before you start" note and the design spec §2.1's correction).
 * A single, modest scale transition on correct selection is used for every
 * child instead of a style-gated fork with nothing real to gate on.
 */
export function SortTrayTask({ skeleton, fill, onCorrect, onWrong, isTransferStep }: SortTrayTaskProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  const targetItem = isTransferStep ? fill.transferItem : fill.correctItem;
  const trayItems = isTransferStep ? [fill.transferItem] : [fill.correctItem, ...fill.distractorItems];

  // Deterministic-but-correctness-independent order: sort by a hash of each
  // itemId, not by itemId text itself. A plain alphabetical sort is NOT safe
  // here — the real sort-color-crystals fixture's "blue" round has itemIds
  // crystal-blue (correct) / crystal-red / crystal-green, and alphabetically
  // "crystal-blue" < "crystal-green" < "crystal-red", so the correct crystal
  // would render first in the tray on every single mount of that exact real
  // round, letting a child learn "always tap first" without reading any
  // crystal (see OptionListTask.tsx for the sibling component where this
  // exact bug pattern was first caught, on the ai-mistake-check fixture).
  // Hashing the id breaks that correlation while staying stable across
  // re-renders (same fill -> same order every time).
  const orderedTray = isTransferStep ? trayItems : sortByHash(trayItems);

  function handleTap(itemId: string) {
    if (resolved) return;
    setSelectedId(itemId);
    if (itemId === targetItem.itemId) {
      setResolved(true);
      onCorrect();
    } else {
      onWrong();
    }
  }

  return (
    <div style={sortTrayStyles.container}>
      <p style={sortTrayStyles.storyFlavor}>{fill.storyFlavor}</p>
      <p style={sortTrayStyles.trayLabel}>Tray — tap the crystal that belongs</p>
      <div style={sortTrayStyles.tray}>
        {orderedTray.map((item) => {
          const color = String(item.attributes.color ?? "red");
          const colorLabel = color.charAt(0).toUpperCase() + color.slice(1);
          const isSelected = selectedId === item.itemId;
          const isCorrect = item.itemId === targetItem.itemId;
          // aria-label fully overrides a button's accessible name, so the
          // visible ✓/✗ feedback below (rendered as sibling text content)
          // would otherwise never reach screen reader users once this prop
          // is present. Append the outcome once resolved/selected so the
          // announced name matches what sighted users see.
          const outcomeSuffix = isSelected ? (isCorrect ? " — correct!" : " — try again") : "";
          const crystalLabel = `${item.presentationText}${outcomeSuffix}`;
          return (
            <button
              key={item.itemId}
              aria-label={crystalLabel}
              onClick={() => handleTap(item.itemId)}
              disabled={resolved}
              style={{
                ...sortTrayStyles.crystalBtn,
                background: `${COLOR_HEX[color]}26`,
                borderColor: isSelected ? (isCorrect ? "#22c55e" : "#ef4444") : COLOR_HEX[color],
                cursor: resolved ? "default" : "pointer",
                transform: isSelected && isCorrect ? "scale(1.08)" : "scale(1)",
                transition: "transform 0.25s ease",
              }}
            >
              <span style={sortTrayStyles.crystalEmoji}>{COLOR_EMOJI[color]}</span>
              <span style={sortTrayStyles.crystalLabel}>{colorLabel}</span>
              {isSelected && <span>{isCorrect ? " ✓" : " ✗"}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const sortTrayStyles: Record<string, React.CSSProperties> = {
  container: { display: "flex", flexDirection: "column" },
  storyFlavor: { color: "#e2e8f0", fontWeight: 600, fontSize: "1.05rem", marginBottom: "0.5rem" },
  trayLabel: { color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem" },
  tray: { display: "flex", gap: "14px", flexWrap: "wrap" },
  crystalBtn: {
    width: "72px",
    minWidth: "72px",
    minHeight: "72px",
    borderRadius: "14px",
    border: "3px solid",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "2px",
    padding: "6px",
    fontSize: "1.6rem",
  },
  crystalEmoji: { fontSize: "1.6rem" },
  crystalLabel: { fontSize: "0.7rem", fontWeight: 700, color: "#e2e8f0" },
};
