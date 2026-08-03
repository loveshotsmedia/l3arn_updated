import type { GameWorld } from '../core/world';
import { Position, MoveTarget } from '../core/world';

/**
 * Fraction of the REMAINING distance covered per fixed simulation step
 * (exponential ease-out), matching the old render-loop `LERP_SPEED = 0.05`
 * per-frame lerp. This is NOT a constant speed: velocity is proportional to
 * distance from the target (~3 × distance units/sec at a 60hz fixed clock),
 * so do not derive units/sec or time-to-arrival from this value directly.
 */
const APPROACH_FACTOR = 0.05;
const ARRIVAL_TOLERANCE = 0.02;

export function stepMovement(world: GameWorld): void {
  world.query(Position, MoveTarget).updateEach(([pos, target]) => {
    if (!target.active) return;

    const dx = target.x - pos.x;
    const dz = target.z - pos.z;
    const distSq = dx * dx + dz * dz;

    if (distSq <= ARRIVAL_TOLERANCE * ARRIVAL_TOLERANCE) {
      pos.x = target.x;
      pos.z = target.z;
      target.active = false;
      return;
    }

    pos.x += dx * APPROACH_FACTOR;
    pos.z += dz * APPROACH_FACTOR;
  });
}
