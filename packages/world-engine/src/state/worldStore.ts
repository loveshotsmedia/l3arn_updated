/**
 * World State Store (Zustand)
 *
 * Holds the single source of truth for the 3D world's runtime state,
 * including the shared ECS world instance (core/world.ts).
 *
 * Avatar movement flow:
 *   1. User clicks floor → GreatHall calls setMoveTarget(x, y, z)
 *   2. setMoveTarget writes the target onto the player entity's MoveTarget trait
 *   3. SimLoop's fixed-timestep tick runs systems/movement.ts, advancing Position
 *   4. PlayerAvatar reads Position from the ECS each frame and writes it to its ref
 */

import { create } from 'zustand';
import { createGameWorld, Position, MoveTarget, HouseTint, type GameWorld } from '../core/world';
import { createMissionModeController } from '../systems/missionMode';
import type { DeviceTier } from '../device/deviceTier';

interface WorldState {
  world: GameWorld;
  /** The single player-avatar entity id, created once on first mount. */
  playerEntity: number | null;

  /** Target position for avatar lerp movement. null = no pending movement. */
  moveTarget: { x: number; y: number; z: number } | null;

  /** Explore vs Mission — the two-modes law (spec §4). */
  worldMode: 'explore' | 'mission';

  currentScene: string | null;
  worldStateFrozen: boolean;

  qualityTier: DeviceTier;
  dpr: number;

  ensurePlayerEntity: (initialPosition: [number, number, number], houseColor: string) => number;
  setMoveTarget: (x: number, y: number, z: number) => void;
  clearMoveTarget: () => void;
  setCurrentScene: (scene: string) => void;
  freezeWorldState: () => void;
  unfreezeWorldState: () => void;
  enterMissionMode: () => void;
  exitMissionMode: () => void;
  setQualityTier: (tier: DeviceTier) => void;
  setDpr: (dpr: number) => void;
}

const missionModeController = createMissionModeController({
  onEnterMission: () => {
    // Registered listeners (post-processing profile, ambient systems) read
    // worldMode directly via useWorldStore — this controller's job is only
    // to guarantee enter/exit fire exactly once per transition, for any
    // future system (e.g. companion animation damping) that needs a single
    // imperative hook rather than a reactive subscription.
  },
  onExitMission: () => {},
});

export const useWorldStore = create<WorldState>((set, get) => ({
  world: createGameWorld(),
  playerEntity: null,
  moveTarget: null,
  worldMode: 'explore',
  currentScene: null,
  worldStateFrozen: false,

  qualityTier: 'MED',
  dpr: 1.5,

  ensurePlayerEntity: (initialPosition, houseColor) => {
    const existing = get().playerEntity;
    if (existing !== null) return existing;

    const [x, y, z] = initialPosition;
    const entity = get().world.spawn(
      Position({ x, y, z }),
      MoveTarget({ x, y, z, active: false }),
      HouseTint({ color: houseColor }),
    );
    set({ playerEntity: entity });
    return entity;
  },

  setMoveTarget: (x, y, z) =>
    set((state) => {
      if (state.worldStateFrozen || state.worldMode === 'mission') return state;
      if (state.playerEntity !== null) {
        state.world.query(MoveTarget).updateEach(([target]) => {
          target.x = x;
          target.y = y;
          target.z = z;
          target.active = true;
        });
      }
      return { moveTarget: { x, y, z } };
    }),

  clearMoveTarget: () => set({ moveTarget: null }),
  setCurrentScene: (scene) => set({ currentScene: scene }),
  freezeWorldState: () => set({ worldStateFrozen: true }),
  unfreezeWorldState: () => set({ worldStateFrozen: false }),

  enterMissionMode: () => {
    missionModeController.setMode('mission');
    set({ worldMode: 'mission' });
  },
  exitMissionMode: () => {
    missionModeController.setMode('explore');
    set({ worldMode: 'explore' });
  },

  setQualityTier: (tier) => set({ qualityTier: tier }),
  setDpr: (dpr) => set({ dpr }),
}));
