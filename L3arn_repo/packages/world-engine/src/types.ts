/**
 * World Engine Types
 *
 * Local type definitions for the L3ARN 3D World Engine.
 * WorldEvent wraps the WorldEventSchema shape from shared-contracts.
 * SceneKey and CameraMode are world-engine-internal enums.
 */

import { z } from 'zod';

// ─── Scene Keys ───────────────────────────────────────────────────────────────
// Each value maps to a loadable scene component.
// Keep scenes modular — each SceneKey corresponds to exactly one scene component.

export const SceneKeySchema = z.enum([
  'great-hall',
  'mission-room',
  'sorting-computer-room',
]);
export type SceneKey = z.infer<typeof SceneKeySchema>;

// ─── Camera Modes ─────────────────────────────────────────────────────────────

export const CameraModeSchema = z.enum(['isometric', 'follow']);
export type CameraMode = z.infer<typeof CameraModeSchema>;

// ─── World Event (local envelope) ─────────────────────────────────────────────
// This is the client-side world event type used within the world engine.
// It mirrors the WorldEventSchema shape from shared-contracts but is kept
// self-contained here to avoid a hard dependency from the 3D package on
// the full contracts layer.
//
// Open Question (ADR-052): Once Foundation Contracts are confirmed, this type
// should import WorldEvent from @l3arn/shared-contracts rather than re-defining
// the envelope shape. For now it is a minimal local definition.

export const WorldEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('object-interact'),
    objectId: z.string(),
    roomId: z.string().optional(),
  }),
  z.object({
    type: z.literal('avatar-move-requested'),
    targetPosition: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  }),
  z.object({
    type: z.literal('scene-transition'),
    fromScene: SceneKeySchema,
    toScene: SceneKeySchema,
  }),
  z.object({
    type: z.literal('mission-trigger'),
    missionId: z.string(),
    triggeredBy: z.string(), // objectId that triggered the mission
  }),
]);
export type WorldEvent = z.infer<typeof WorldEventSchema>;

// ─── Scene Props ──────────────────────────────────────────────────────────────

export interface SceneProps {
  onEvent: (event: WorldEvent) => void;
  /** Academy Display Name shown on the player avatar (ADR-007: never legal name). */
  displayName?: string;
  /** House selection drives avatar color tint. */
  house?: 'Valkryn' | 'Lyrion' | 'Novari' | 'Cytrex';
}

// ─── House Colors ─────────────────────────────────────────────────────────────
// Placeholder palette — final art direction is pending (Agent L / Character IP branch).

export const HOUSE_COLORS: Record<string, string> = {
  Valkryn: '#ef4444', // red / storm
  Lyrion: '#a855f7',  // purple / song
  Novari: '#22c55e',  // green / nature
  Cytrex: '#3b82f6',  // blue / tech
};
