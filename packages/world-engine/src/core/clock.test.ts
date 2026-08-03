import { describe, it, expect } from 'vitest';
import { createFixedClock } from './clock';

describe('createFixedClock', () => {
  it('runs exactly one step for a delta equal to the step size', () => {
    const clock = createFixedClock(1 / 60);
    let steps = 0;
    clock.tick(1 / 60, () => {
      steps += 1;
    });
    expect(steps).toBe(1);
  });

  it('accumulates partial deltas across multiple ticks', () => {
    const clock = createFixedClock(1 / 60);
    let steps = 0;
    clock.tick(1 / 120, () => steps++); // half a step
    clock.tick(1 / 120, () => steps++); // now a full step accumulated
    expect(steps).toBe(1);
  });

  it('clamps a huge delta (e.g. tab was backgrounded) to avoid a spiral of death', () => {
    const clock = createFixedClock(1 / 60, { maxStepsPerTick: 5 });
    let steps = 0;
    clock.tick(10, () => steps++); // 10 seconds of "lag" at 60hz would be 600 steps
    expect(steps).toBe(5);
  });

  it('passes the alpha (interpolation factor) to the render callback', () => {
    const clock = createFixedClock(1 / 60);
    let capturedAlpha = -1;
    clock.tick(1 / 60 + 1 / 120, () => {}, (alpha) => {
      capturedAlpha = alpha;
    });
    expect(capturedAlpha).toBeGreaterThan(0);
    expect(capturedAlpha).toBeLessThan(1);
  });
});
