/**
 * Rewards Contract
 *
 * Covers the Moolah economy, XP, companion growth, badges, and House points.
 *
 * Key rule (ADR-011): reward economy is split into two distinct tracks:
 *   - Effort rewards (Moolah, XP, companion bond): unconditional on mission completion
 *   - Mastery rewards (major progression, form evolutions, rare items): gated on
 *     mastery evidence — students cannot grind their way through academic gateposts
 *
 * Grounded in: ADR-011 (reward economy), ADR-019 (living academy model),
 * MASTER_HANDOFF §8.2 (Living Academy Engine), architecture.md §8.
 */

import { z } from "zod";
import { HouseSchema } from "./identity.schema";

// ─── Moolah Wallet ────────────────────────────────────────────────────────────
// One wallet per child. Balance is always non-negative (spending is validated
// before the ledger entry is written).
// Maps to: moolah_wallets table

export const MoolahWalletSchema = z.object({
  id: z.string().uuid(),
  childProfileId: z.string().uuid(),
  balance: z.number().int().nonnegative(),
  lifetimeEarned: z.number().int().nonnegative().optional(),
  updatedAt: z.string().datetime(),
});
export type MoolahWallet = z.infer<typeof MoolahWalletSchema>;

// ─── Moolah Ledger Entry ─────────────────────────────────────────────────────
// Append-only. Every Moolah change is a row — no in-place balance updates.
// Positive delta = earned; negative delta = spent.
// Maps to: moolah_ledger table

export const MoolahReasonSchema = z.enum([
  "mission-effort",    // effort reward: unconditional on completion
  "mission-mastery",   // mastery reward: gated on evidence
  "house-bonus",       // House-level collective reward
  "event-reward",      // seasonal or Academy event reward
  "purchase",          // Moolah Market spend (negative delta)
  "admin-adjustment",  // system correction; logged and parent-visible
]);
export type MoolahReason = z.infer<typeof MoolahReasonSchema>;

export const MoolahLedgerEntrySchema = z.object({
  id: z.string().uuid(),
  walletId: z.string().uuid(),
  childProfileId: z.string().uuid(),
  delta: z.number().int(),               // positive = earned, negative = spent
  reason: MoolahReasonSchema,
  referenceId: z.string().optional(),    // missionAttemptId, eventId, itemId, etc.
  idempotencyKey: z.string().optional(), // prevents duplicate reward events; maps to moolah_ledger.idempotency_key
  occurredAt: z.string().datetime(),
});
export type MoolahLedgerEntry = z.infer<typeof MoolahLedgerEntrySchema>;

// ─── XP Event ────────────────────────────────────────────────────────────────
// Experience points track longitudinal engagement and effort.
// Maps to: xp_events table

export const XpEventSchema = z.object({
  id: z.string().uuid(),
  childProfileId: z.string().uuid(),
  amount: z.number().int().positive(),
  reason: z.enum([
    "mission-effort",
    "mission-mastery",
    "daily-streak",
    "companion-interaction",
  ]),
  referenceId: z.string().optional(),
  occurredAt: z.string().datetime(),
});
export type XpEvent = z.infer<typeof XpEventSchema>;

// ─── Companion Growth Event ───────────────────────────────────────────────────
// Companion bond increases are effort-based.
// Form evolutions and milestones may be mastery-gated. (ADR-011)
// Maps to: companion_growth_events table

export const CompanionGrowthTypeSchema = z.enum([
  "bond-increase",
  "form-evolution", // major visual/behavioral upgrade; typically mastery-gated
  "milestone",
]);
export type CompanionGrowthType = z.infer<typeof CompanionGrowthTypeSchema>;

export const CompanionGrowthEventSchema = z.object({
  id: z.string().uuid(),
  childProfileId: z.string().uuid(),
  companionId: z.string().uuid(),
  growthType: CompanionGrowthTypeSchema,
  previousBondLevel: z.number().int().nonnegative(),
  newBondLevel: z.number().int().nonnegative(),
  newFormId: z.string().optional(),         // set when a form evolution occurs
  masteryRequired: z.boolean(),             // true = this growth required mastery evidence
  masteryRecordId: z.string().uuid().optional(),
  triggerMissionAttemptId: z.string().uuid().optional(),
  occurredAt: z.string().datetime(),
});
export type CompanionGrowthEvent = z.infer<typeof CompanionGrowthEventSchema>;

// ─── Badge ────────────────────────────────────────────────────────────────────
// Badge definitions. Separate from badge awards (see BadgeAwardSchema).
// Maps to: badges table (reference data)

export const BadgeCategorySchema = z.enum([
  "mastery",
  "effort",
  "house",
  "ai-literacy",
  "exploration",
  "companion",
]);
export type BadgeCategory = z.infer<typeof BadgeCategorySchema>;

export const BadgeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  iconAssetId: z.string(),
  category: BadgeCategorySchema,
  masteryGated: z.boolean(), // true = earning requires verified mastery evidence
});
export type Badge = z.infer<typeof BadgeSchema>;

// ─── Badge Award ─────────────────────────────────────────────────────────────
// Records when a badge was awarded to a specific child.
// Maps to: a join / award record in the rewards domain

export const BadgeAwardSchema = z.object({
  id: z.string().uuid(),
  childProfileId: z.string().uuid(),
  badgeId: z.string(),
  awardedAt: z.string().datetime(),
  missionAttemptId: z.string().uuid().optional(),
  masteryRecordId: z.string().uuid().optional(),
});
export type BadgeAward = z.infer<typeof BadgeAwardSchema>;

// ─── House Points Record ──────────────────────────────────────────────────────
// Individual contributions to a House's collective point total.
// The Academy world state reflects aggregate House points. (ADR-019)
// Maps to: house_points table

export const HousePointsReasonSchema = z.enum([
  "mission-mastery",
  "mission-effort",
  "event-participation",
  "companion-growth",
]);
export type HousePointsReason = z.infer<typeof HousePointsReasonSchema>;

export const HousePointsRecordSchema = z.object({
  id: z.string().uuid(),
  house: HouseSchema,
  points: z.number().int().positive(),
  contributingChildProfileId: z.string().uuid(),
  reason: HousePointsReasonSchema,
  referenceId: z.string().optional(),
  occurredAt: z.string().datetime(),
});
export type HousePointsRecord = z.infer<typeof HousePointsRecordSchema>;

// ─── ChildBadge ───────────────────────────────────────────────────────────────
// Maps the child_badges table — a child's earned badge records.
// Alias for BadgeAwardSchema to satisfy the spec contract name (ChildBadge).
// Maps to: child_badges table in Migration 004

export const ChildBadgeSchema = z.object({
  id: z.string().uuid(),
  childProfileId: z.string().uuid(),
  badgeId: z.string().uuid(),
  awardedAt: z.string().datetime(),
  sourceId: z.string().uuid().optional(),  // mission_attempts.id, mastery_records.id, etc.
});
export type ChildBadge = z.infer<typeof ChildBadgeSchema>;

// ─── XPEvent (alias for spec contract name) ──────────────────────────────────
// XpEventSchema / XpEvent are the canonical internal names.
// XPEventSchema / XPEvent are the spec-required export names.
// Both are exported to avoid duplication.

export const XPEventSchema = XpEventSchema;
export type XPEvent = XpEvent;

// ─── HousePointEvent (alias for spec contract name) ───────────────────────────
// HousePointsRecordSchema is the canonical internal name.
// HousePointEventSchema / HousePointEvent are the spec-required export names.
// Both are exported.

export const HousePointEventSchema = HousePointsRecordSchema;
export type HousePointEvent = HousePointsRecord;

// ─── House Leaderboard Snapshot ───────────────────────────────────────────────
// Periodic snapshots of House standings. Drives the Academy's visual
// House Influence system (ADR-019).

export const HouseLeaderboardPeriodSchema = z.enum(["weekly", "monthly", "all-time"]);
export type HouseLeaderboardPeriod = z.infer<typeof HouseLeaderboardPeriodSchema>;

export const HouseRankingSchema = z.object({
  house: HouseSchema,
  totalPoints: z.number().int().nonnegative(),
  rank: z.number().int().positive(),
});
export type HouseRanking = z.infer<typeof HouseRankingSchema>;

export const HouseLeaderboardSnapshotSchema = z.object({
  id: z.string().uuid(),
  period: HouseLeaderboardPeriodSchema,
  rankings: z.array(HouseRankingSchema).length(4), // exactly 4 Houses
  recordedAt: z.string().datetime(),
});
export type HouseLeaderboardSnapshot = z.infer<typeof HouseLeaderboardSnapshotSchema>;
