/**
 * Unit tests for Mission 001 reward rules engine.
 *
 * Tests that computeMission001Rewards() is:
 *   - Pure (same inputs → same outputs)
 *   - Correct for each rule case
 *   - Mastery-gating enforced (badges only awarded when appropriate)
 *
 * These tests run without any Supabase connection or API calls.
 */

import {
  computeMission001Rewards,
  MISSION_001_BADGE_KEYS,
  type Mission001RewardParams,
  type Mission001RewardResult,
} from "./mission-001-reward-rules";

// ─── Helper ───────────────────────────────────────────────────────────────────

function makeParams(overrides: Partial<Mission001RewardParams> = {}): Mission001RewardParams {
  return {
    completedAllTasks: false,
    evidenceCaptured: false,
    masteryThresholdMet: false,
    deliveryMode: "three-d",
    ...overrides,
  };
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe("computeMission001Rewards", () => {
  // ── Purity ────────────────────────────────────────────────────────────────

  describe("purity", () => {
    it("returns identical results for the same inputs called twice", () => {
      const params = makeParams({
        completedAllTasks: true,
        evidenceCaptured: true,
        masteryThresholdMet: true,
      });
      const result1 = computeMission001Rewards(params);
      const result2 = computeMission001Rewards(params);
      expect(result1).toEqual(result2);
    });

    it("does not mutate the input params object", () => {
      const params = makeParams({ completedAllTasks: true });
      const paramsBefore = { ...params };
      computeMission001Rewards(params);
      expect(params).toEqual(paramsBefore);
    });
  });

  // ── XP Rules ─────────────────────────────────────────────────────────────

  describe("XP rules", () => {
    it("awards 50 base XP for any attempt (partial completion)", () => {
      const result = computeMission001Rewards(makeParams({ completedAllTasks: false }));
      expect(result.xpEarned).toBe(50);
    });

    it("awards 75 XP (50 base + 25 completion bonus) when all tasks complete", () => {
      const result = computeMission001Rewards(makeParams({ completedAllTasks: true }));
      expect(result.xpEarned).toBe(75);
    });

    it("XP is always > 0 regardless of delivery mode or mastery", () => {
      const modes: Mission001RewardParams["deliveryMode"][] = [
        "three-d",
        "interactive-lite",
        "text-audio-offline",
      ];
      for (const deliveryMode of modes) {
        const result = computeMission001Rewards(makeParams({ deliveryMode }));
        expect(result.xpEarned).toBeGreaterThan(0);
      }
    });
  });

  // ── Moolah Rules ──────────────────────────────────────────────────────────

  describe("Moolah rules", () => {
    it("awards 25 Moolah for any completion (effort reward)", () => {
      const result = computeMission001Rewards(makeParams());
      expect(result.moolahEarned).toBe(25);
    });

    it("Moolah earned is the same regardless of mastery status", () => {
      const withMastery = computeMission001Rewards(makeParams({ masteryThresholdMet: true }));
      const withoutMastery = computeMission001Rewards(makeParams({ masteryThresholdMet: false }));
      expect(withMastery.moolahEarned).toBe(withoutMastery.moolahEarned);
    });

    it("Moolah earned is always non-negative", () => {
      const result = computeMission001Rewards(makeParams());
      expect(result.moolahEarned).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Badge Rules ───────────────────────────────────────────────────────────

  describe("badge rules", () => {
    it("awards no badges when partial completion and no mastery", () => {
      const result = computeMission001Rewards(
        makeParams({ completedAllTasks: false, masteryThresholdMet: false })
      );
      expect(result.badgesAwarded).toHaveLength(0);
    });

    it("awards mission-001-complete badge when all tasks are complete", () => {
      const result = computeMission001Rewards(
        makeParams({ completedAllTasks: true, masteryThresholdMet: false })
      );
      expect(result.badgesAwarded).toContain(MISSION_001_BADGE_KEYS.MISSION_COMPLETE);
    });

    it("does NOT award ai-literacy-1 badge when mastery threshold not met", () => {
      const result = computeMission001Rewards(
        makeParams({ completedAllTasks: true, masteryThresholdMet: false })
      );
      expect(result.badgesAwarded).not.toContain(MISSION_001_BADGE_KEYS.AI_LITERACY_1);
    });

    it("awards ai-literacy-1 badge when mastery threshold is met", () => {
      const result = computeMission001Rewards(
        makeParams({ masteryThresholdMet: true })
      );
      expect(result.badgesAwarded).toContain(MISSION_001_BADGE_KEYS.AI_LITERACY_1);
    });

    it("awards both badges when all tasks complete AND mastery met", () => {
      const result = computeMission001Rewards(
        makeParams({ completedAllTasks: true, masteryThresholdMet: true })
      );
      expect(result.badgesAwarded).toContain(MISSION_001_BADGE_KEYS.MISSION_COMPLETE);
      expect(result.badgesAwarded).toContain(MISSION_001_BADGE_KEYS.AI_LITERACY_1);
      expect(result.badgesAwarded).toHaveLength(2);
    });

    it("awards ai-literacy-1 without mission-complete when mastery met but not all tasks complete", () => {
      const result = computeMission001Rewards(
        makeParams({ completedAllTasks: false, masteryThresholdMet: true })
      );
      expect(result.badgesAwarded).toContain(MISSION_001_BADGE_KEYS.AI_LITERACY_1);
      expect(result.badgesAwarded).not.toContain(MISSION_001_BADGE_KEYS.MISSION_COMPLETE);
    });

    it("badge keys match the seeded badge_key values in Migration 004", () => {
      expect(MISSION_001_BADGE_KEYS.MISSION_COMPLETE).toBe("mission-001-complete");
      expect(MISSION_001_BADGE_KEYS.AI_LITERACY_1).toBe("ai-literacy-1");
    });
  });

  // ── House Points Rules ────────────────────────────────────────────────────

  describe("house points rules", () => {
    it("awards 10 base house points for completion", () => {
      const result = computeMission001Rewards(makeParams({ evidenceCaptured: false }));
      expect(result.housePointsEarned).toBe(10);
    });

    it("awards 15 house points (10 + 5 bonus) when evidence is captured", () => {
      const result = computeMission001Rewards(makeParams({ evidenceCaptured: true }));
      expect(result.housePointsEarned).toBe(15);
    });

    it("house points are always non-negative", () => {
      const result = computeMission001Rewards(makeParams());
      expect(result.housePointsEarned).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Companion Bond Rules ──────────────────────────────────────────────────

  describe("companion bond rules", () => {
    it("awards 15 base companion bond delta on completion", () => {
      const result = computeMission001Rewards(makeParams({ masteryThresholdMet: false }));
      expect(result.companionBondDelta).toBe(15);
    });

    it("awards 20 companion bond delta (15 + 5) when mastery threshold is met", () => {
      const result = computeMission001Rewards(makeParams({ masteryThresholdMet: true }));
      expect(result.companionBondDelta).toBe(20);
    });

    it("companion bond delta is always non-negative", () => {
      const result = computeMission001Rewards(makeParams());
      expect(result.companionBondDelta).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Named Scenarios ──────────────────────────────────────────────────────

  describe("named scenarios", () => {
    it("scenario: all tasks complete + mastery met", () => {
      const result = computeMission001Rewards(
        makeParams({
          completedAllTasks: true,
          evidenceCaptured: true,
          masteryThresholdMet: true,
          deliveryMode: "three-d",
        })
      );
      const expected: Mission001RewardResult = {
        moolahEarned: 25,
        xpEarned: 75,
        badgesAwarded: [
          MISSION_001_BADGE_KEYS.MISSION_COMPLETE,
          MISSION_001_BADGE_KEYS.AI_LITERACY_1,
        ],
        housePointsEarned: 15,
        companionBondDelta: 20,
      };
      expect(result).toEqual(expected);
    });

    it("scenario: all tasks complete + no mastery", () => {
      const result = computeMission001Rewards(
        makeParams({
          completedAllTasks: true,
          evidenceCaptured: false,
          masteryThresholdMet: false,
          deliveryMode: "interactive-lite",
        })
      );
      const expected: Mission001RewardResult = {
        moolahEarned: 25,
        xpEarned: 75,
        badgesAwarded: [MISSION_001_BADGE_KEYS.MISSION_COMPLETE],
        housePointsEarned: 10,
        companionBondDelta: 15,
      };
      expect(result).toEqual(expected);
    });

    it("scenario: partial completion (no tasks complete, no mastery)", () => {
      const result = computeMission001Rewards(
        makeParams({
          completedAllTasks: false,
          evidenceCaptured: false,
          masteryThresholdMet: false,
          deliveryMode: "text-audio-offline",
        })
      );
      const expected: Mission001RewardResult = {
        moolahEarned: 25,
        xpEarned: 50,
        badgesAwarded: [],
        housePointsEarned: 10,
        companionBondDelta: 15,
      };
      expect(result).toEqual(expected);
    });

    it("scenario: partial completion but mastery met (edge case)", () => {
      const result = computeMission001Rewards(
        makeParams({
          completedAllTasks: false,
          evidenceCaptured: true,
          masteryThresholdMet: true,
        })
      );
      const expected: Mission001RewardResult = {
        moolahEarned: 25,
        xpEarned: 50,
        badgesAwarded: [MISSION_001_BADGE_KEYS.AI_LITERACY_1],
        housePointsEarned: 15,
        companionBondDelta: 20,
      };
      expect(result).toEqual(expected);
    });
  });
});
