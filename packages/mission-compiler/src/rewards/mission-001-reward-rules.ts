/**
 * Mission 001 Reward Rules Engine
 *
 * Pure deterministic function that computes what rewards a child earns from
 * Mission 001 (Repair the Sorting Computer / Learner Calibration).
 *
 * This function has NO side effects — it does not write to Supabase, call any
 * API, or produce any observable output beyond its return value. The Railway
 * backend calls this function and then writes the resulting reward records to
 * the database via service_role.
 *
 * Grounded in:
 *   - ADR-011 (split reward economy: effort rewards + mastery-gated progression)
 *   - Agent 9 spec §Task 3
 *   - sprint_map.md Mission 001 spec (reward rules)
 *
 * Rules:
 *   - Effort XP: 50 XP for any attempt; +25 XP if all tasks completed
 *   - Starter Moolah: 25 Moolah for any completion
 *   - First AI literacy badge: only if masteryThresholdMet === true
 *   - Mission completion badge: only if completedAllTasks === true
 *   - House points: 10 points for completion; +5 if evidence captured
 *   - Companion bond: +15 delta on completion; +5 more if mastery met
 *
 * Badge keys awarded here must match the badge_key values seeded in Migration 004.
 */

// ─── Result Type ─────────────────────────────────────────────────────────────

/**
 * The deterministic reward result for one Mission 001 completion.
 * All values are additive deltas — the backend applies them to the wallet/ledger.
 */
export interface Mission001RewardResult {
  /** Moolah earned this mission. Always >= 0. */
  moolahEarned: number;

  /** XP earned this mission. Always > 0 for any attempt. */
  xpEarned: number;

  /**
   * Badge keys to award. Each key must exist in the badges table.
   * Empty array = no badges awarded this completion.
   * Mastery-gated badges (ai-literacy-1) only appear if masteryThresholdMet.
   * Completion badges (mission-001-complete) only appear if completedAllTasks.
   */
  badgesAwarded: string[];

  /** House points contributed this mission. Always >= 0. */
  housePointsEarned: number;

  /**
   * Companion bond delta. Always >= 0.
   * Bond-increases are effort-based; form evolutions are handled separately
   * by the companion evolution subsystem (ADR-011, ADR-019).
   */
  companionBondDelta: number;
}

// ─── Input Type ───────────────────────────────────────────────────────────────

export interface Mission001RewardParams {
  /** True if the child completed all mission tasks (not just attempted). */
  completedAllTasks: boolean;

  /** True if at least one piece of qualifying evidence was captured. */
  evidenceCaptured: boolean;

  /**
   * True if the mastery threshold was met — i.e., the child demonstrated
   * understanding (e.g., AI can be wrong and must be checked).
   * Gates the mastery-gated badge award per ADR-011.
   */
  masteryThresholdMet: boolean;

  /** Which delivery mode the child used for this mission. */
  deliveryMode: "three-d" | "interactive-lite" | "text-audio-offline";
}

// ─── Badge Keys ───────────────────────────────────────────────────────────────

/**
 * Badge keys that Mission 001 can award. These MUST match badge_key values
 * in the badges table seeded by Migration 004.
 */
export const MISSION_001_BADGE_KEYS = {
  /** Awarded when completedAllTasks === true. Mastery-gated. */
  MISSION_COMPLETE: "mission-001-complete",

  /** Awarded when masteryThresholdMet === true. Mastery-gated. */
  AI_LITERACY_1: "ai-literacy-1",
} as const;

// ─── Reward Constants ─────────────────────────────────────────────────────────

const BASE_XP = 50;
const COMPLETION_XP_BONUS = 25;
const BASE_MOOLAH = 25;
const BASE_HOUSE_POINTS = 10;
const EVIDENCE_HOUSE_POINTS_BONUS = 5;
const BASE_COMPANION_BOND_DELTA = 15;
const MASTERY_COMPANION_BOND_BONUS = 5;

// ─── Pure Reward Function ────────────────────────────────────────────────────

/**
 * Compute the Mission 001 reward result from a set of completion parameters.
 *
 * This function is deterministic and pure:
 * - Same inputs always produce the same output.
 * - No network calls, no DB writes, no side effects.
 * - All values are non-negative.
 *
 * @param params - Mission 001 completion parameters
 * @returns Mission001RewardResult - all reward deltas to apply
 */
export function computeMission001Rewards(
  params: Mission001RewardParams,
): Mission001RewardResult {
  const { completedAllTasks, evidenceCaptured, masteryThresholdMet } = params;

  // ── XP ─────────────────────────────────────────────────────────────────────
  // Effort XP: 50 for any attempt; +25 if all tasks completed.
  let xpEarned = BASE_XP;
  if (completedAllTasks) {
    xpEarned += COMPLETION_XP_BONUS;
  }

  // ── Moolah ─────────────────────────────────────────────────────────────────
  // 25 Moolah for any completion (effort reward — unconditional per ADR-011).
  const moolahEarned = BASE_MOOLAH;

  // ── Badges ─────────────────────────────────────────────────────────────────
  // Mastery-gated badges require masteryThresholdMet (ADR-011).
  const badgesAwarded: string[] = [];

  if (completedAllTasks) {
    // Mission completion badge: awarded when all tasks done.
    // Still marked mastery_gated in DB because it requires meaningful engagement,
    // but the gate here is task completion, not masteryThresholdMet.
    badgesAwarded.push(MISSION_001_BADGE_KEYS.MISSION_COMPLETE);
  }

  if (masteryThresholdMet) {
    // AI literacy badge: awarded only when the mastery evidence exists.
    badgesAwarded.push(MISSION_001_BADGE_KEYS.AI_LITERACY_1);
  }

  // ── House Points ───────────────────────────────────────────────────────────
  // 10 points for completion; +5 if evidence was captured.
  let housePointsEarned = BASE_HOUSE_POINTS;
  if (evidenceCaptured) {
    housePointsEarned += EVIDENCE_HOUSE_POINTS_BONUS;
  }

  // ── Companion Bond ─────────────────────────────────────────────────────────
  // +15 bond delta on completion; +5 more if mastery threshold met.
  let companionBondDelta = BASE_COMPANION_BOND_DELTA;
  if (masteryThresholdMet) {
    companionBondDelta += MASTERY_COMPANION_BOND_BONUS;
  }

  return {
    moolahEarned,
    xpEarned,
    badgesAwarded,
    housePointsEarned,
    companionBondDelta,
  };
}
