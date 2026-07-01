/**
 * SimLoop — the ONE useFrame for the whole world. Every other system that
 * needs to run per-frame plugs in here, never in its own separate useFrame.
 * This is what keeps the simulation deterministic and off the React render
 * path (spec §6.2/§6.3).
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { createFixedClock } from '../core/clock';
import type { GameWorld } from '../core/world';
import { stepMovement } from '../systems/movement';

const FIXED_STEP = 1 / 60;

interface SimLoopProps {
  world: GameWorld;
}

export function SimLoop({ world }: SimLoopProps) {
  const clockRef = useRef(createFixedClock(FIXED_STEP));

  useFrame((_state, delta) => {
    // Clamp raw delta before it ever reaches the accumulator — a second line
    // of defense against spiral-of-death on top of the clock's own cap.
    const safeDelta = Math.min(delta, 0.25);
    clockRef.current.tick(safeDelta, () => {
      stepMovement(world);
    });
  });

  return null;
}
