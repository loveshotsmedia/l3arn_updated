import { describe, it, expect } from 'vitest';
import { classifyDeviceTier } from './deviceTier';

describe('classifyDeviceTier', () => {
  it('classifies a known integrated-GPU renderer string as LOW', () => {
    expect(classifyDeviceTier('Intel(R) HD Graphics 620')).toBe('LOW');
  });

  it('classifies Apple M-series GPUs as MED', () => {
    expect(classifyDeviceTier('Apple M1')).toBe('MED');
    expect(classifyDeviceTier('Apple M3 Pro')).toBe('MED');
  });

  it('classifies a discrete NVIDIA/AMD GPU as HIGH', () => {
    expect(classifyDeviceTier('NVIDIA GeForce RTX 4070')).toBe('HIGH');
    expect(classifyDeviceTier('AMD Radeon RX 7800')).toBe('HIGH');
  });

  it('defaults unknown/unavailable renderer strings to LOW (never assume capability)', () => {
    expect(classifyDeviceTier(null)).toBe('LOW');
    expect(classifyDeviceTier('SwiftShader')).toBe('LOW');
  });
});
