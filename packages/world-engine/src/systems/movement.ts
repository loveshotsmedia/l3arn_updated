import type { GameWorld } from '../core/world';
import { Position, MoveTarget } from '../core/world';

/** Units per fixed simulation step. At a 60hz fixed clock this is ~3 units/sec. */
const STEP_SPEED = 0.05;
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

    pos.x += dx * STEP_SPEED;
    pos.z += dz * STEP_SPEED;
  });
}
