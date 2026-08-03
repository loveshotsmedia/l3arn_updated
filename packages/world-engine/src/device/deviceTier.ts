/**
 * Device tier detection + runtime FPS governor (spec §8.1/8.3). Boot-time
 * classification from WEBGL_debug_renderer_info sets the starting budget;
 * the governor then adjusts DPR down/up based on measured frame time, so a
 * device that thermal-throttles mid-session degrades gracefully instead of
 * staying pinned to a budget it can no longer hit.
 */

export type DeviceTier = 'LOW' | 'MED' | 'HIGH';

const HIGH_MARKERS = ['nvidia', 'geforce', 'rtx', 'gtx', 'radeon', 'rx '];
const MED_MARKERS = ['apple m', 'adreno 6', 'adreno 7', 'mali-g7', 'mali-g9'];

export function classifyDeviceTier(rendererString: string | null): DeviceTier {
  if (!rendererString) return 'LOW';
  const lower = rendererString.toLowerCase();

  if (lower.includes('swiftshader') || lower.includes('llvmpipe')) return 'LOW';
  if (HIGH_MARKERS.some((marker) => lower.includes(marker))) return 'HIGH';
  if (MED_MARKERS.some((marker) => lower.includes(marker))) return 'MED';
  return 'LOW'; // unknown integrated GPUs (Intel HD/UHD, older Adreno/Mali) — never assume capability
}

/** Reads WEBGL_debug_renderer_info off a live WebGL context. Returns null in non-browser/test environments. */
export function detectRendererString(gl: WebGLRenderingContext | WebGL2RenderingContext): string | null {
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  if (!ext) return null;
  return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string;
}

export const TIER_DPR_CAP: Record<DeviceTier, number> = {
  LOW: 1.0,
  MED: 1.5,
  HIGH: 2.0,
};

export interface FpsGovernorOptions {
  targetFps: number;
  /** Never drop DPR below this floor, even under sustained low FPS. */
  minDpr?: number;
}

export interface FpsGovernor {
  /** Feed a frame's delta time (seconds); returns the DPR to use this frame. */
  sample(deltaSeconds: number): number;
}

/**
 * A simple hysteresis governor: averages FPS over a rolling window and steps
 * DPR down by 10% when consistently under target, up by 10% when consistently
 * well over target — never oscillates on a single noisy frame.
 */
export function createFpsGovernor(startingDpr: number, options: FpsGovernorOptions): FpsGovernor {
  const minDpr = options.minDpr ?? 0.75;
  let dpr = startingDpr;
  let samples: number[] = [];
  const WINDOW = 60;

  return {
    sample(deltaSeconds) {
      const fps = deltaSeconds > 0 ? 1 / deltaSeconds : options.targetFps;
      samples.push(fps);
      if (samples.length < WINDOW) return dpr;

      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      samples = [];

      if (avg < options.targetFps * 0.85) {
        dpr = Math.max(minDpr, dpr * 0.9);
      } else if (avg > options.targetFps * 1.15) {
        dpr = Math.min(2.0, dpr * 1.1);
      }
      return dpr;
    },
  };
}
