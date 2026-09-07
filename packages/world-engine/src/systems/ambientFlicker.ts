/**
 * ambientFlicker — pure, deterministic torch-flame flicker math.
 *
 * Ambient-system logic per spec §6.10 (`ambient` is Explore-only); the
 * mission-mode gate lives in the render component (TorchSconces) which stops
 * calling this the moment worldMode === 'mission'. Kept pure and framework-
 * free so it unit-tests in the package's node vitest environment.
 *
 * The output is a sum of three incommensurate sine frequencies — cheap,
 * deterministic (no Math.random — same discipline as the rest of the sim),
 * and guaranteed bounded: the three weights sum to 1, so the composite wave
 * stays within ±1 before scaling by `amplitude`.
 */

/**
 * Flame emissive intensity at time `t` for the flame identified by `seed`.
 *
 * @param timeSeconds elapsed time (e.g. clock.elapsedTime)
 * @param seed        per-flame phase offset — different seeds decorrelate flames
 * @param base        center intensity (default tuned for bloom threshold 0.8)
 * @param amplitude   max deviation from base; output ∈ [base - amplitude, base + amplitude]
 */
export function flickerIntensity(
  timeSeconds: number,
  seed: number,
  base = 2.2,
  amplitude = 0.55,
): number {
  const s = seed * 12.9898;
  const wave =
    Math.sin(timeSeconds * 7.3 + s) * 0.5 +
    Math.sin(timeSeconds * 13.7 + s * 1.7) * 0.3 +
    Math.sin(timeSeconds * 23.9 + s * 2.3) * 0.2;
  return base + wave * amplitude;
}
