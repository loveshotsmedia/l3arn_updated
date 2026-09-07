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

export interface StoneBlockOptions {
  size?: number;
  /** Block courses (rows) per canvas. */
  courses?: number;
  repeatX?: number;
  repeatY?: number;
  seed?: number;
}

/**
 * Coursed stone-block wall texture: offset rows of blocks in a cool
 * lavender-stone tone (matches the hall palette), mortar lines, per-block
 * tint jitter. Same determinism + SSR rules as the floor texture.
 */
export function createStoneBlockTexture(options: StoneBlockOptions = {}): CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const { size = 512, courses = 6, repeatX = 5, repeatY = 1.65, seed = 4242 } = options;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const rand = mulberry32(seed);
  const rowH = size / courses;
  const blocksPerRow = 4;
  const blockW = size / blocksPerRow;

  // Mortar base
  ctx.fillStyle = '#3a3448';
  ctx.fillRect(0, 0, size, size);

  for (let row = 0; row < courses; row++) {
    const offset = row % 2 === 0 ? 0 : blockW / 2;
    for (let b = -1; b < blocksPerRow + 1; b++) {
      const v = 0.9 + rand() * 0.2;
      const r = Math.round(0x5d * v);
      const g = Math.round(0x54 * v);
      const bl = Math.round(0x74 * v);
      ctx.fillStyle = `rgb(${r},${g},${bl})`;

      const inset = 2.5 + rand() * 2;
      ctx.fillRect(
        b * blockW + offset + inset,
        row * rowH + inset,
        blockW - inset * 2,
        rowH - inset * 2,
      );

      // Worn edge highlight along the block top — cheap bevel read
      ctx.fillStyle = `rgba(255,255,255,${0.04 + rand() * 0.05})`;
      ctx.fillRect(b * blockW + offset + inset, row * rowH + inset, blockW - inset * 2, 3);
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export interface RunnerOptions {
  width?: number;
  height?: number;
  seed?: number;
}

/**
 * Ceremonial carpet-runner texture: deep indigo field, gold double border,
 * subtle diamond weave. Drawn once for a long strip (no repeat).
 */
export function createRunnerTexture(options: RunnerOptions = {}): CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const { width = 256, height = 1024, seed = 909 } = options;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const rand = mulberry32(seed);

  // Indigo field with faint value noise so it reads as fabric, not plastic
  ctx.fillStyle = '#2b2455';
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.015 + rand() * 0.02})`;
    ctx.fillRect(rand() * width, rand() * height, 2 + rand() * 3, 2 + rand() * 3);
  }

  // Diamond weave down the center
  ctx.strokeStyle = 'rgba(129, 140, 248, 0.16)';
  ctx.lineWidth = 2;
  const step = 64;
  for (let y = -step; y < height + step; y += step) {
    ctx.beginPath();
    ctx.moveTo(width * 0.5, y);
    ctx.lineTo(width * 0.78, y + step / 2);
    ctx.lineTo(width * 0.5, y + step);
    ctx.lineTo(width * 0.22, y + step / 2);
    ctx.closePath();
    ctx.stroke();
  }

  // Gold double border
  ctx.strokeStyle = '#c9a24a';
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, width - 28, height - 28);
  ctx.lineWidth = 4;
  ctx.strokeRect(34, 34, width - 68, height - 68);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
