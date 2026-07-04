import { describe, it, expect } from 'vitest';
import { yawToward } from './avatarHeading';

describe('yawToward', () => {
  it('faces +z (toward camera default) as yaw 0', () => {
    expect(yawToward(0, 0, 0, 5, 0, Math.PI)).toBeCloseTo(0, 5);
  });

  it('faces +x as yaw PI/2', () => {
    expect(yawToward(0, 0, 5, 0, 0, Math.PI)).toBeCloseTo(Math.PI / 2, 5);
  });

  it('faces -z as yaw PI (or -PI — same heading)', () => {
    const yaw = yawToward(0, 0, 0, -5, 0, Math.PI);
    expect(Math.abs(Math.abs(yaw) - Math.PI)).toBeLessThan(1e-5);
  });

  it('returns current yaw unchanged when the target is effectively the current position', () => {
    expect(yawToward(3, 3, 3, 3, 1.234, Math.PI)).toBe(1.234);
    expect(yawToward(3, 3, 3.0001, 3.0001, 1.234, Math.PI)).toBe(1.234);
  });

  it('clamps rotation to maxStep per call', () => {
    // Current yaw 0, target directly behind (yaw PI), maxStep 0.1 → move exactly 0.1
    const stepped = yawToward(0, 0, 0, -5, 0, 0.1);
    expect(Math.abs(stepped)).toBeCloseTo(0.1, 5);
  });

  it('takes the short way around the circle', () => {
    // Current yaw just above -PI, target yaw just below +PI: shortest path crosses ±PI,
    // so a small step should move AWAY from zero, not sweep across it.
    const current = -Math.PI + 0.05;
    const target = { x: Math.sin(Math.PI - 0.05), z: Math.cos(Math.PI - 0.05) };
    const next = yawToward(0, 0, target.x, target.z, current, 0.02);
    expect(Math.abs(next)).toBeGreaterThan(Math.abs(current) - 1e-6);
  });

  it('is deterministic', () => {
    expect(yawToward(1, 2, 3, 4, 0.5, 0.2)).toBe(yawToward(1, 2, 3, 4, 0.5, 0.2));
  });
});
