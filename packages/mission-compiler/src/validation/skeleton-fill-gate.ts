/**
 * Skeleton Fill Correctness Gate
 *
 * The deterministic half of the correctness gate: verifies that an
 * AI-filled lesson instance actually satisfies its authored skeleton's rules
 * before anything reaches a child. Fails closed — callers must treat any
 * `valid: false` result as "do not serve this content" and retry generation
 * or fall back to an authored example (wiring that retry/fallback loop into
 * the live generation pipeline is a separate, later task — out of scope here).
 *
 * Grounded in: docs/superpowers/specs/2026-07-19-lesson-engine-content-contract-design.md §6
 */

import type { LessonTaskSkeleton, SkeletonFill } from "@l3arn/shared-types";
import { evaluateRulePredicate } from "../rules/rule-predicate-evaluator";

export type GateFailureCode =
  | "skeleton-id-mismatch"
  | "correct-item-fails-rule"
  | "distractor-count-mismatch"
  | "distractor-satisfies-rule"
  | "distractor-fails-plausibility"
  | "transfer-item-fails-rule"
  | "transfer-item-not-novel";

export interface GateFailure {
  code: GateFailureCode;
  message: string;
}

export interface GateResult {
  valid: boolean;
  failures: GateFailure[];
}

export function validateSkeletonFill(skeleton: LessonTaskSkeleton, fill: SkeletonFill): GateResult {
  if (fill.skeletonId !== skeleton.id) {
    return {
      valid: false,
      failures: [
        {
          code: "skeleton-id-mismatch",
          message: `Fill targets skeleton ${fill.skeletonId}, expected ${skeleton.id}`,
        },
      ],
    };
  }

  const failures: GateFailure[] = [];

  if (!evaluateRulePredicate(skeleton.correctAnswerRule, fill.correctItem.attributes)) {
    failures.push({
      code: "correct-item-fails-rule",
      message: `correctItem "${fill.correctItem.itemId}" does not satisfy the skeleton's correct-answer rule`,
    });
  }

  if (fill.distractorItems.length !== skeleton.distractorRule.count) {
    failures.push({
      code: "distractor-count-mismatch",
      message: `Expected ${skeleton.distractorRule.count} distractors, got ${fill.distractorItems.length}`,
    });
  }

  for (const distractor of fill.distractorItems) {
    if (evaluateRulePredicate(skeleton.correctAnswerRule, distractor.attributes)) {
      failures.push({
        code: "distractor-satisfies-rule",
        message: `distractor "${distractor.itemId}" incorrectly satisfies the correct-answer rule`,
      });
    }
    if (
      skeleton.distractorRule.plausibilityRule &&
      !evaluateRulePredicate(skeleton.distractorRule.plausibilityRule, distractor.attributes)
    ) {
      failures.push({
        code: "distractor-fails-plausibility",
        message: `distractor "${distractor.itemId}" does not satisfy the plausibility rule`,
      });
    }
  }

  if (!evaluateRulePredicate(skeleton.transferExampleRule, fill.transferItem.attributes)) {
    failures.push({
      code: "transfer-item-fails-rule",
      message: `transferItem "${fill.transferItem.itemId}" does not satisfy the transfer-example rule`,
    });
  }
  if (fill.transferItem.itemId === fill.correctItem.itemId) {
    failures.push({
      code: "transfer-item-not-novel",
      message: "transferItem must be a different item than correctItem (novelty requirement)",
    });
  }

  return { valid: failures.length === 0, failures };
}
