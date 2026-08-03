import { describe, it, expect } from 'vitest';
import { createGameWorld, Position, Velocity } from './world';

describe('createGameWorld', () => {
  it('spawns an entity with Position and Velocity traits and queries it back', () => {
    const world = createGameWorld();
    world.spawn(Position({ x: 1, y: 0, z: 2 }), Velocity({ x: 0, y: 0, z: 0 }));

    const results: Array<{ x: number; z: number }> = [];
    world.query(Position).updateEach(([pos]) => {
      results.push({ x: pos.x, z: pos.z });
    });

    expect(results).toEqual([{ x: 1, z: 2 }]);
  });

  it('destroy() removes the entity from future queries', () => {
    const world = createGameWorld();
    const entity = world.spawn(Position({ x: 0, y: 0, z: 0 }));
    world.destroy(entity);

    let count = 0;
    world.query(Position).updateEach(() => {
      count += 1;
    });

    expect(count).toBe(0);
  });
});
