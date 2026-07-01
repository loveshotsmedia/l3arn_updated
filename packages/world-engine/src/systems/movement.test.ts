import { describe, it, expect } from 'vitest';
import { createGameWorld, Position, MoveTarget } from '../core/world';
import { stepMovement } from './movement';

describe('stepMovement', () => {
  it('moves an entity toward its active MoveTarget at a fixed rate per step', () => {
    const world = createGameWorld();
    world.spawn(
      Position({ x: 0, y: 0.9, z: 0 }),
      MoveTarget({ x: 10, y: 0.9, z: 0, active: true }),
    );

    stepMovement(world);

    let x = -1;
    world.query(Position).updateEach(([pos]) => {
      x = pos.x;
    });

    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThan(10); // moved toward, didn't teleport
  });

  it('does nothing when MoveTarget is not active', () => {
    const world = createGameWorld();
    world.spawn(Position({ x: 5, y: 0.9, z: 5 }), MoveTarget({ x: 0, y: 0, z: 0, active: false }));

    stepMovement(world);

    let x = -1;
    let z = -1;
    world.query(Position).updateEach(([pos]) => {
      x = pos.x;
      z = pos.z;
    });

    expect(x).toBe(5);
    expect(z).toBe(5);
  });

  it('snaps and deactivates once within arrival tolerance', () => {
    const world = createGameWorld();
    world.spawn(
      Position({ x: 9.99, y: 0.9, z: 0 }),
      MoveTarget({ x: 10, y: 0.9, z: 0, active: true }),
    );

    stepMovement(world);

    let x = -1;
    let active = true;
    world.query(Position, MoveTarget).updateEach(([pos, target]) => {
      x = pos.x;
      active = target.active;
    });

    expect(x).toBe(10);
    expect(active).toBe(false);
  });
});
