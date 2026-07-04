import { describe, it, expect } from 'vitest';
import { motePosition, MOTE_BOUNDS } from './ambientMotes';

describe('motePosition', () => {
  it('is deterministic — same mote index and time always produce the same position', () => {
    const a = motePosition(7, 12.5);
    const b = motePosition(7, 12.5);
    expect(a).toEqual(b);
  });

  it('stays inside the hall bounds across a long time sweep', () => {
    for (let i = 0; i < 40; i++) {
      for (let s = 0; s < 400; s++) {
        const [x, y, z] = motePosition(i, s * 0.37);
        expect(x).toBeGreaterThanOrEqual(-MOTE_BOUNDS.x);
        expect(x).toBeLessThanOrEqual(MOTE_BOUNDS.x);
        expect(y).toBeGreaterThanOrEqual(MOTE_BOUNDS.yMin);
        expect(y).toBeLessThanOrEqual(MOTE_BOUNDS.yMax);
        expect(z).toBeGreaterThanOrEqual(-MOTE_BOUNDS.z);
        expect(z).toBeLessThanOrEqual(MOTE_BOUNDS.z);
      }
    }
  });

  it('drifts — position changes over time', () => {
    const p0 = motePosition(3, 0);
    const p1 = motePosition(3, 5);
    const moved = Math.abs(p0[0] - p1[0]) + Math.abs(p0[1] - p1[1]) + Math.abs(p0[2] - p1[2]);
    expect(moved).toBeGreaterThan(0.01);
  });

  it('rises — y increases with time until it wraps back to the bottom', () => {
    const y0 = motePosition(5, 1)[1];
    const y1 = motePosition(5, 3)[1];
    // Either it rose, or it wrapped (in which case it must be near the bottom band)
    if (y1 <= y0) {
      expect(y1).toBeLessThan(MOTE_BOUNDS.yMin + (MOTE_BOUNDS.yMax - MOTE_BOUNDS.yMin) * 0.5);
    } else {
      expect(y1).toBeGreaterThan(y0);
    }
  });

  it('different motes occupy different positions at the same instant', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      seen.add(motePosition(i, 10).map((v) => v.toFixed(3)).join(','));
    }
    expect(seen.size).toBe(30);
  });
});
