import { createWorld, trait, type ConfigurableTrait, type Entity, type QueryParameter } from 'koota';

// ─── Traits (ECS "components") ────────────────────────────────────────────
// Keep traits minimal and data-only. Behavior lives in systems/, never here.

export const Position = trait({ x: 0, y: 0, z: 0 });
export const Velocity = trait({ x: 0, y: 0, z: 0 });
export const MoveTarget = trait({ x: 0, y: 0, z: 0, active: false });
export const HouseTint = trait({ color: '#64748b' });

/**
 * Thin wrapper around Koota's world. We keep our own function names
 * (spawn, destroy, query) so the rest of the codebase is isolated from
 * Koota's exact API surface. Notably, Koota's own `World.destroy()` takes
 * no arguments and destroys the *world*, not an entity — per-entity
 * destruction is `entity.destroy()`. Our `destroy(entity)` below bridges
 * that so callers can destroy entities through the world handle.
 */
export function createGameWorld() {
  const world = createWorld();

  return {
    spawn: (...traits: ConfigurableTrait[]): Entity => world.spawn(...traits),
    destroy: (entity: Entity): void => entity.destroy(),
    query: <T extends QueryParameter[]>(...parameters: T) => world.query(...parameters),
    raw: world,
  };
}

export type GameWorld = ReturnType<typeof createGameWorld>;
