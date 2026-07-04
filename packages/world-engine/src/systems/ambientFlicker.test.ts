import { describe, it, expect } from 'vitest';
import { flickerIntensity } from './ambientFlicker';

describe('flickerIntensity', () => {
  it('is deterministic — same inputs always produce the same output', () => {
    const a = flickerIntensity(1.234, 7);
    const b = flickerIntensity(1.234, 7);
    expect(a).toBe(b);
  });

  it('stays bounded within [base - amplitude, base + amplitude] across a long time sweep', () => {
    const base = 2.2;
    const amplitude = 0.55;
    for (let i = 0; i < 5000; i++) {
      const t = i * 0.0173; // irregular step so we don't sample a sine period harmonically
      const v = flickerIntensity(t, 3, base, amplitude);
      expect(v).toBeGreaterThanOrEqual(base - amplitude);
      expect(v).toBeLessThanOrEqual(base + amplitude);
    }
  });

  it('actually flickers — output varies over time rather than holding constant', () => {
    const samples = new Set<number>();
    for (let i = 0; i < 50; i++) {
      samples.add(flickerIntensity(i * 0.1, 1));
    }
    expect(samples.size).toBeGreaterThan(40);
  });

  it('different seeds decorrelate — two flames at the same instant differ', () => {
    let differing = 0;
    for (let i = 0; i < 100; i++) {
      const t = i * 0.21;
      if (Math.abs(flickerIntensity(t, 1) - flickerIntensity(t, 2)) > 1e-6) differing++;
    }
    expect(differing).toBeGreaterThan(90);
  });

  it('respects a custom base and amplitude', () => {
    const v = flickerIntensity(0.5, 1, 10, 0.1);
    expect(v).toBeGreaterThanOrEqual(9.9);
    expect(v).toBeLessThanOrEqual(10.1);
  });
});
