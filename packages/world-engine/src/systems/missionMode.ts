export type WorldMode = 'explore' | 'mission';

export interface MissionModeCallbacks {
  /** Fired once, on the explore -> mission transition. Pause ambient systems, swap to the quiet post profile, dampen MoMO's animation here. */
  onEnterMission: () => void;
  /** Fired once, on the mission -> explore transition. Resume ambient systems, restore the explore post profile. */
  onExitMission: () => void;
}

export interface MissionModeController {
  setMode: (mode: WorldMode) => void;
  getMode: () => WorldMode;
}

export function createMissionModeController(
  callbacks: MissionModeCallbacks,
): MissionModeController {
  let current: WorldMode = 'explore';

  return {
    setMode(mode) {
      if (mode === current) return;
      current = mode;
      if (mode === 'mission') {
        callbacks.onEnterMission();
      } else {
        callbacks.onExitMission();
      }
    },
    getMode() {
      return current;
    },
  };
}
