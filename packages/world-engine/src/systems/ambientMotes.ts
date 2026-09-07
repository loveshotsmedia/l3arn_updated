/**
 * ambientMotes — pure, deterministic dust-mote drift math (spec §6.10:
 * ambient is Explore-only; the render component freezes the drift the moment
 * worldMode === 'mission', same gate as the torch flicker).
 *
 * Each mote rises slowly with a gentle sinusoidal sway, wrapping back to the
 * bottom band when it reaches the top. Fully deterministic per (index, time)
 * so screenshot diffs and tests stay meaningful — no Math.random.
 */

/** Hall-interior drift volume. Slightly inset from the 30×30 walls. */
export const MOTE_BOUNDS = {
  x: 13,
  z: 13,
  yMin: 0.6,
  yMax: 8.2,
} as const;

/** Small deterministic hash → [0, 1) for per-mote parameters. */
function hash01(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Position of mote `index` at time `t` seconds: [x, y, z].
 * Rise speed, sway phase, and home position all derive from the index.
 */
export function motePosition(index: number, t: number): [number, number, number] {
  const h1 = hash01(index + 1);
  const h2 = hash01(index + 101);
  const h3 = hash01(index + 211);

  const homeX = (h1 * 2 - 1) * MOTE_BOUNDS.x * 0.92;
  const homeZ = (h2 * 2 - 1) * MOTE_BOUNDS.z * 0.92;

  const riseSpeed = 0.12 + h3 * 0.18; // units/sec
  const span = MOTE_BOUNDS.yMax - MOTE_BOUNDS.yMin;
  const y = MOTE_BOUNDS.yMin + (((h3 * span) + t * riseSpeed) % span);

  const swayAmp = 0.35 + h2 * 0.4;
  const x = homeX + Math.sin(t * (0.25 + h1 * 0.3) + h1 * 6.283) * swayAmp;
  const z = homeZ + Math.cos(t * (0.2 + h2 * 0.3) + h2 * 6.283) * swayAmp;

  // Clamp the sway so the guarantees in MOTE_BOUNDS hold exactly.
  return [
    Math.max(-MOTE_BOUNDS.x, Math.min(MOTE_BOUNDS.x, x)),
    y,
    Math.max(-MOTE_BOUNDS.z, Math.min(MOTE_BOUNDS.z, z)),
  ];
}
