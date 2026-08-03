/**
 * @l3arn/world-engine — Barrel export
 *
 * Public surface of the L3ARN 3D World Engine package.
 * Consumers import from here — never from internal module paths.
 */

// Main canvas wrapper
export { WorldCanvas } from './WorldCanvas';

// Scenes (exported for direct scene mounting if needed)
export { GreatHall } from './scenes/GreatHall';

// Objects (exported for use in custom scenes or tests)
export { SortingComputer } from './objects/SortingComputer';
export { PlayerAvatar } from './objects/PlayerAvatar';

// Types
export type {
  SceneKey,
  CameraMode,
  WorldEvent,
  SceneProps,
} from './types';

export {
  SceneKeySchema,
  CameraModeSchema,
  WorldEventSchema,
  HOUSE_COLORS,
} from './types';

export * from "./state/worldStore";
