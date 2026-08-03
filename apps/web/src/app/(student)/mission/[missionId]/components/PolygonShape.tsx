"use client";

interface PolygonShapeProps {
  sides: number;
  size?: number;
}

/**
 * Renders a regular polygon with exactly `sides` straight edges, so a child
 * can actually count them — used by ai-mistake-check so "count them
 * yourself" has something real to count instead of just trusting the
 * caption's own verdict.
 */
export function PolygonShape({ sides, size = 88 }: PolygonShapeProps) {
  const clampedSides = Math.max(3, Math.round(sides));
  const radius = size / 2 - 6;
  const center = size / 2;
  const points = Array.from({ length: clampedSides }, (_, i) => {
    // Start pointing up (-90deg) so shapes read consistently across counts.
    const angle = (Math.PI * 2 * i) / clampedSides - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`A shape with ${clampedSides} sides`}
      style={{ flexShrink: 0 }}
    >
      <polygon points={points} fill="rgba(99,102,241,0.18)" stroke="#a5b4fc" strokeWidth={2.5} strokeLinejoin="round" />
    </svg>
  );
}
