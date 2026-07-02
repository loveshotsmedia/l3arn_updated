import { describe, it, expect, vi } from 'vitest';
import { createMissionModeController } from './missionMode';

describe('createMissionModeController', () => {
  it('calls onEnterMission exactly once when transitioning explore -> mission', () => {
    const onEnterMission = vi.fn();
    const onExitMission = vi.fn();
    const controller = createMissionModeController({ onEnterMission, onExitMission });

    controller.setMode('explore');
    controller.setMode('mission');

    expect(onEnterMission).toHaveBeenCalledTimes(1);
    expect(onExitMission).not.toHaveBeenCalled();
  });

  it('calls onExitMission exactly once when transitioning mission -> explore', () => {
    const onEnterMission = vi.fn();
    const onExitMission = vi.fn();
    const controller = createMissionModeController({ onEnterMission, onExitMission });

    controller.setMode('mission');
    controller.setMode('explore');

    expect(onExitMission).toHaveBeenCalledTimes(1);
  });

  it('is idempotent — setting the same mode twice does not re-fire callbacks', () => {
    const onEnterMission = vi.fn();
    const onExitMission = vi.fn();
    const controller = createMissionModeController({ onEnterMission, onExitMission });

    controller.setMode('mission');
    controller.setMode('mission');

    expect(onEnterMission).toHaveBeenCalledTimes(1);
  });
});
