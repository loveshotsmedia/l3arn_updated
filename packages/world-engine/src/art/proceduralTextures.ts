/**
 * proceduralTextures — runtime-generated textures for the stylized-PBR look
 * (spec §7 art direction). Generated on a canvas at mount time, so they cost
 * zero download bytes, need no licensing/manifest entry, and never touch the
 * Task 9 asset CI gate (which scans shipped .glb files only).
 *
 * Determinism: uses a seeded PRNG (mulberry32), never Math.random, so the
 * floor looks identical on every load and screenshot diffs stay meaningful.
 */
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

/** Small deterministic PRNG — good enough for tile tint jitter. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface StoneTileOptions {
  /** Canvas resolution (square). */
  size?: number;
  /** Tiles per canvas edge. */
  tiles?: number;
  /** Texture repeats across the floor plane. */
  repeat?: number;
  /** PRNG seed — same seed, same floor. */
  seed?: number;
}

/**
 * Warm stone-tile floor texture: two-tone tiles with per-tile tint jitter and
 * dark grout lines. Returns null in non-DOM environments (SSR, node tests) —
 * callers pass `map={texture ?? undefined}` and the material falls back to
 * its flat color.
 */
export function createStoneTileTexture(options: StoneTileOptions = {}): CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const { size = 512, tiles = 8, repeat = 4, seed = 1337 } = options;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const rand = mulberry32(seed);
  const tileSize = size / tiles;

  // Grout base
  ctx.fillStyle = '#443d35';
  ctx.fillRect(0, 0, size, size);

  for (let ty = 0; ty < tiles; ty++) {
    for (let tx = 0; tx < tiles; tx++) {
      // Warm stone base with per-tile jitter (value ±8%, slight hue drift)
      const v = 0.92 + rand() * 0.16; // 0.92–1.08 value multiplier
      const r = Math.round(0x6f * v);
      const g = Math.round(0x62 * v);
      const b = Math.round(0x54 * v);
      ctx.fillStyle = `rgb(${r},${g},${b})`;

      const inset = 2 + rand() * 2; // slightly irregular grout width
      ctx.fillRect(
        tx * tileSize + inset,
        ty * tileSize + inset,
        tileSize - inset * 2,
        tileSize - inset * 2,
      );

      // A few speckles per tile for worn-stone texture
      const speckles = 4 + Math.floor(rand() * 5);
      for (let s = 0; s < speckles; s++) {
        const sv = 0.8 + rand() * 0.35;
        ctx.fillStyle = `rgba(${Math.round(r * sv)},${Math.round(g * sv)},${Math.round(b * sv)},0.5)`;
        const sx = tx * tileSize + inset + rand() * (tileSize - inset * 2);
        const sy = ty * tileSize + inset + rand() * (tileSize - inset * 2);
        const sr = 1 + rand() * 3;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
