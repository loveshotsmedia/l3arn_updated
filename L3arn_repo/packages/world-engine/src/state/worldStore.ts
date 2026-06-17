/**
 * World State Store (Zustand)
 *
 * Holds the single source of truth for the 3D world's runtime state.
 * Components dispatch actions; subscribers re-render reactively.
 *
 * Avatar movement flow:
 *   1. User clicks floor → GreatHall dispatches avatar-move-requested WorldEvent
 *   2. WorldCanvas (or scene) calls worldStore.getState().setMoveTarget(x, y, z)
 *   3. PlayerAvatar subscribes to moveTarget and lerps toward it each frame
 */

import { create } from "zustand";

interface WorldState {
  /** Target position for avatar lerp movement. null = no pending movement. */
  moveTarget: { x: number; y: number; z: number } | null;

  /** Current scene key */
  currentScene: string | null;

  /** Whether a world-state freeze is active (safety containment) */
  worldStateFrozen: boolean;

  // ── Actions ──────────────────────────────────────────────────────────────

  setMoveTarget: (x: number, y: number, z: number) => void;
  clearMoveTarget: () => void;
  setCurrentScene: (scene: string) => void;
  freezeWorldState: () => void;
  unfreezeWorldState: () => void;
}

export const useWorldStore = create<WorldState>((set) => ({
  moveTarget: null,
  currentScene: null,
  worldStateFrozen: false,

  setMoveTarget: (x, y, z) =>
    set((state) => {
      if (state.worldStateFrozen) return state; // ignore moves during freeze
      return { moveTarget: { x, y, z } };
    }),

  clearMoveTarget: () => set({ moveTarget: null }),

  setCurrentScene: (scene) => set({ currentScene: scene }),

  freezeWorldState: () => set({ worldStateFrozen: true }),

  unfreezeWorldState: () => set({ worldStateFrozen: false }),
}));
