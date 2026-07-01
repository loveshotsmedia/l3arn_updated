export interface FixedClockOptions {
  /** Hard cap on simulation steps run in a single tick() call — prevents the
   * "spiral of death" when the tab was backgrounded and delta is huge. */
  maxStepsPerTick?: number;
}

export interface FixedClock {
  /**
   * Advance the clock by `deltaSeconds` of wall-clock time, running `step()`
   * once per fixed simulation tick (may be 0, 1, or many times). After all
   * steps run, calls `render(alpha)` with the leftover-time interpolation
   * factor (0..1) so the caller can blend visuals between the last two
   * simulation states.
   */
  tick(deltaSeconds: number, step: () => void, render?: (alpha: number) => void): void;
}

export function createFixedClock(stepSeconds: number, options: FixedClockOptions = {}): FixedClock {
  const maxStepsPerTick = options.maxStepsPerTick ?? 5;
  let accumulator = 0;

  return {
    tick(deltaSeconds, step, render) {
      accumulator += deltaSeconds;

      let stepsRun = 0;
      while (accumulator >= stepSeconds && stepsRun < maxStepsPerTick) {
        step();
        accumulator -= stepSeconds;
        stepsRun += 1;
      }

      // If we hit the cap, drop the remaining backlog rather than let it
      // compound into the next tick.
      if (stepsRun >= maxStepsPerTick) {
        accumulator = 0;
      }

      render?.(accumulator / stepSeconds);
    },
  };
}
