"use client";

/**
 * Crystal & bin glyphs — instructionally relevant visuals for the mission
 * surfaces (Mayer-compliant: static, calm; this surface is Mission mode,
 * spec §4). Extracted from MissionExperience.tsx (main's PR #37, "visual
 * answer options") so the data-driven task renderers (SortTrayTask etc.)
 * can share them instead of drawing emoji circles.
 *
 * These are the interim 2D representation. The in-world 3D crystal/pedestal
 * treatment (the agreed direction for the sort-crystal screen) replaces
 * them on that surface when it lands; they remain useful for briefing /
 * evidence recaps and any student_interactive_lite fallback.
 */

/** A gem crystal sitting in a bin — THE visual for "which crystal is in which bin". */
export function CrystalInBin({ crystal, bin, size = 46 }: { crystal: string; bin: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M8 20l4 18h20l4-18" stroke={bin} strokeWidth="2.4" fill={`${bin}26`} strokeLinejoin="round" />
      <path d="M22 4l8 10-8 10-8-10z" fill={crystal} stroke="rgba(15,23,42,0.55)" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M18 9.5h8M22 4v20" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
    </svg>
  );
}

/** A standalone faceted gem crystal with a soft glow (used for the sorting tray). */
export function Gem({ hex, glow, size = 54 }: { hex: string; glow: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      style={{ filter: `drop-shadow(0 0 8px ${glow})` }}
    >
      <path d="M20 3l11 13-11 21L9 16z" fill={hex} stroke="rgba(15,23,42,0.5)" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M9 16h22M20 3L14 16l6 21M20 3l6 13-6 21" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

/** An open bin (used inside a sort/target button). */
export function BinGlyph({ hex, size = 30 }: { hex: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M4 8l3.5 18h15L26 8" stroke={hex} strokeWidth="2.2" fill={`${hex}26`} strokeLinejoin="round" />
      <path d="M2.5 8h25" stroke={hex} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
