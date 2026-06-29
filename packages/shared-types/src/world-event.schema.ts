/**
 * World Event Contract — Foundation
 *
 * Covers every event that flows through the Railway → Supabase
 * hybrid event-sourced world state system.
 *
 * Pattern: `WorldEventSchema` is the generic envelope stored in Supabase and
 * broadcast by Railway. Consumers discriminate on `event.type`, then parse
 * `event.payload` using the per-type payload schemas defined below.
 *
 * Grounded in: ADR-019 (living academy model), ADR-020 (world state source of truth),
 * ADR-008 (parent visibility), ADR-011 (reward economy),
 * architecture.md §5 (World State Architecture).
 *
 * Master rule (architecture.md §5): every persistent world change must be
 * system-approved, reversible, logged, parent-visible when child-specific, and
 * connected to mastery, effort, House contribution, companion growth, or a
 * scheduled Academy event.
 */

import { z } from "zod";
import { HouseSchema } from "./identity.schema";

// ─── Event Type Registry ──────────────────────────────────────────────────────

export const WorldEventTypeSchema = z.enum([
  // Presence
  "room.joined",
  "room.left",
  "avatar.moved",
  // Mission lifecycle
  "mission.started",
  "mission.step-completed",
  "mission.completed",
  "mission.abandoned",
  // Economy
  "moolah.earned",
  "moolah.spent",
  "xp.earned",
  "badge.awarded",
  // House
  "house.points-earned",
  "house.leaderboard-updated",
  // Companion
  "companion.bond-increased",
  "companion.milestone-reached",
  // Living Academy (ADR-019)
  "academy.unlock-triggered",
  "academy.seasonal-event-started",
  "academy.seasonal-event-ended",
  "world.repair-completed",
  "world.decoration-placed",
]);
export type WorldEventType = z.infer<typeof WorldEventTypeSchema>;

// ─── Universal Envelope ───────────────────────────────────────────────────────
// Every event — whether broadcast by Railway or persisted to Supabase — has
// this envelope shape.
//
// `auditLogged: z.literal(true)` enforces that no world event can be emitted
// without being logged. This is a compile-time invariant. (ADR-020)
//
// `reversible` and `parentVisible` are declared per event. Movement events
// are not persisted; unlock events are. Presence events are parent-visible;
// avatar movement ticks are not.

export const WorldEventSchema = z.object({
  id: z.string().uuid(),
  type: WorldEventTypeSchema,

  // Actor — null for Academy-wide events (seasonal, House leaderboard)
  childProfileId: z.string().uuid().optional(),
  childSessionId: z.string().uuid().optional(),
  academyIdentityId: z.string().uuid().optional(),

  roomId: z.string().optional(),
  occurredAt: z.string().datetime(),

  // Every persistent change must be reversible (architecture.md §5)
  reversible: z.boolean(),

  // Whether this event appears in parent reports/visibility (ADR-008)
  parentVisible: z.boolean(),

  // Compile-time invariant: all world events are audit-logged (ADR-020)
  auditLogged: z.literal(true),

  // Typed payload — parse using the per-type schemas below
  payload: z.record(z.unknown()),
});
export type WorldEvent = z.infer<typeof WorldEventSchema>;

// ─── Per-Type Payload Schemas ─────────────────────────────────────────────────
// Parse event.payload using the schema that matches event.type.
// Example:
//   if (event.type === "room.joined") {
//     const payload = RoomJoinedPayloadSchema.parse(event.payload);
//   }

// Presence
export const RoomJoinedPayloadSchema = z.object({
  roomId: z.string(),
  academyIdentityId: z.string().uuid(),
});
export type RoomJoinedPayload = z.infer<typeof RoomJoinedPayloadSchema>;

export const RoomLeftPayloadSchema = z.object({
  roomId: z.string(),
  academyIdentityId: z.string().uuid(),
  durationSeconds: z.number().int().nonnegative(),
});
export type RoomLeftPayload = z.infer<typeof RoomLeftPayloadSchema>;

// Avatar movement — Railway only; NOT persisted to Supabase (ephemeral)
export const AvatarMovedPayloadSchema = z.object({
  academyIdentityId: z.string().uuid(),
  roomId: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  }),
});
export type AvatarMovedPayload = z.infer<typeof AvatarMovedPayloadSchema>;

// Mission lifecycle
export const MissionStartedPayloadSchema = z.object({
  missionId: z.string().uuid(),
  missionAttemptId: z.string().uuid(),
  deliveryMode: z.enum(["3d", "interactive-lite", "text-audio-offline"]),
});
export type MissionStartedPayload = z.infer<typeof MissionStartedPayloadSchema>;

export const MissionStepCompletedPayloadSchema = z.object({
  missionAttemptId: z.string().uuid(),
  stepId: z.string(),
  evidenceCaptured: z.boolean(),
});
export type MissionStepCompletedPayload = z.infer<typeof MissionStepCompletedPayloadSchema>;

export const MissionCompletedPayloadSchema = z.object({
  missionId: z.string().uuid(),
  missionAttemptId: z.string().uuid(),
  deliveryMode: z.enum(["3d", "interactive-lite", "text-audio-offline"]),
  masteryAchieved: z.boolean(),
  masteryEvidenceScore: z.number().min(0).max(1),
});
export type MissionCompletedPayload = z.infer<typeof MissionCompletedPayloadSchema>;

export const MissionAbandonedPayloadSchema = z.object({
  missionAttemptId: z.string().uuid(),
  lastStepId: z.string().optional(),
});
export type MissionAbandonedPayload = z.infer<typeof MissionAbandonedPayloadSchema>;

// Economy
export const MoolahEarnedPayloadSchema = z.object({
  walletId: z.string().uuid(),
  amount: z.number().int().positive(),
  reason: z.enum([
    "mission-effort",
    "mission-mastery",
    "house-bonus",
    "event-reward",
  ]),
  referenceId: z.string().optional(), // missionAttemptId, eventId, etc.
});
export type MoolahEarnedPayload = z.infer<typeof MoolahEarnedPayloadSchema>;

export const MoolahSpentPayloadSchema = z.object({
  walletId: z.string().uuid(),
  amount: z.number().int().positive(),
  itemId: z.string(),
  itemType: z.enum(["cosmetic", "companion-accessory", "house-item"]),
});
export type MoolahSpentPayload = z.infer<typeof MoolahSpentPayloadSchema>;

export const XpEarnedPayloadSchema = z.object({
  amount: z.number().int().positive(),
  reason: z.enum([
    "mission-effort",
    "mission-mastery",
    "daily-streak",
    "companion-interaction",
  ]),
  referenceId: z.string().optional(),
});
export type XpEarnedPayload = z.infer<typeof XpEarnedPayloadSchema>;

export const BadgeAwardedPayloadSchema = z.object({
  badgeId: z.string(),
  missionAttemptId: z.string().uuid().optional(),
  masteryRecordId: z.string().uuid().optional(),
});
export type BadgeAwardedPayload = z.infer<typeof BadgeAwardedPayloadSchema>;

// House
export const HousePointsEarnedPayloadSchema = z.object({
  house: HouseSchema,
  points: z.number().int().positive(),
  contributingChildProfileId: z.string().uuid(),
  reason: z.enum([
    "mission-mastery",
    "mission-effort",
    "event-participation",
    "companion-growth",
  ]),
  referenceId: z.string().optional(),
});
export type HousePointsEarnedPayload = z.infer<typeof HousePointsEarnedPayloadSchema>;

export const HouseLeaderboardUpdatedPayloadSchema = z.object({
  period: z.enum(["weekly", "monthly", "all-time"]),
  rankings: z.array(z.object({
    house: HouseSchema,
    totalPoints: z.number().int().nonnegative(),
    rank: z.number().int().positive(),
  })),
});
export type HouseLeaderboardUpdatedPayload = z.infer<typeof HouseLeaderboardUpdatedPayloadSchema>;

// Companion
export const CompanionBondIncreasedPayloadSchema = z.object({
  companionId: z.string().uuid(),
  bondIncrease: z.number().int().positive(),
  newBondLevel: z.number().int().nonnegative(),
  reason: z.enum(["mission-completed", "daily-interaction", "mastery-milestone"]),
});
export type CompanionBondIncreasedPayload = z.infer<typeof CompanionBondIncreasedPayloadSchema>;

export const CompanionMilestoneReachedPayloadSchema = z.object({
  companionId: z.string().uuid(),
  milestoneId: z.string(),
  newFormId: z.string().optional(), // visual form evolution
  masteryRequired: z.boolean(),
  masteryRecordId: z.string().uuid().optional(),
});
export type CompanionMilestoneReachedPayload = z.infer<typeof CompanionMilestoneReachedPayloadSchema>;

// Living Academy (ADR-019)
export const AcademyUnlockTriggeredPayloadSchema = z.object({
  unlockId: z.string(),
  unlockType: z.enum([
    "room-decoration",
    "npc-activation",
    "grove-bloom",
    "market-item",
    "ai-lab-repair",
    "outdoor-grounds-change",
  ]),
  triggerReason: z.string(), // e.g. "Cytrex House reached 500 collective points"
  affectedRoomId: z.string().optional(),
});
export type AcademyUnlockTriggeredPayload = z.infer<typeof AcademyUnlockTriggeredPayloadSchema>;

export const AcademySeasonalEventPayloadSchema = z.object({
  seasonalEventId: z.string(),
  eventName: z.string(),
  affectedRoomIds: z.array(z.string()),
});
export type AcademySeasonalEventPayload = z.infer<typeof AcademySeasonalEventPayloadSchema>;

export const WorldRepairCompletedPayloadSchema = z.object({
  repairTargetId: z.string(),
  roomId: z.string(),
  triggeredByMissionId: z.string().uuid().optional(),
});
export type WorldRepairCompletedPayload = z.infer<typeof WorldRepairCompletedPayloadSchema>;

export const WorldDecorationPlacedPayloadSchema = z.object({
  decorationId: z.string(),
  roomId: z.string(),
  placedByChildProfileId: z.string().uuid().optional(),
  houseSource: HouseSchema.optional(),
});
export type WorldDecorationPlacedPayload = z.infer<typeof WorldDecorationPlacedPayloadSchema>;

// ─── Payload Schema Map ───────────────────────────────────────────────────────
// Use this to look up the correct payload schema at runtime.
// Every entry in WorldEventTypeSchema must have a corresponding entry here.

export const WORLD_EVENT_PAYLOAD_SCHEMAS = {
  "room.joined": RoomJoinedPayloadSchema,
  "room.left": RoomLeftPayloadSchema,
  "avatar.moved": AvatarMovedPayloadSchema,
  "mission.started": MissionStartedPayloadSchema,
  "mission.step-completed": MissionStepCompletedPayloadSchema,
  "mission.completed": MissionCompletedPayloadSchema,
  "mission.abandoned": MissionAbandonedPayloadSchema,
  "moolah.earned": MoolahEarnedPayloadSchema,
  "moolah.spent": MoolahSpentPayloadSchema,
  "xp.earned": XpEarnedPayloadSchema,
  "badge.awarded": BadgeAwardedPayloadSchema,
  "house.points-earned": HousePointsEarnedPayloadSchema,
  "house.leaderboard-updated": HouseLeaderboardUpdatedPayloadSchema,
  "companion.bond-increased": CompanionBondIncreasedPayloadSchema,
  "companion.milestone-reached": CompanionMilestoneReachedPayloadSchema,
  "academy.unlock-triggered": AcademyUnlockTriggeredPayloadSchema,
  "academy.seasonal-event-started": AcademySeasonalEventPayloadSchema,
  "academy.seasonal-event-ended": AcademySeasonalEventPayloadSchema,
  "world.repair-completed": WorldRepairCompletedPayloadSchema,
  "world.decoration-placed": WorldDecorationPlacedPayloadSchema,
} as const satisfies Record<WorldEventType, z.ZodType>;
