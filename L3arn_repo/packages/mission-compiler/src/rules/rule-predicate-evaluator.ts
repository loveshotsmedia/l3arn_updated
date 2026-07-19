/**
 * Rule Predicate Evaluator
 *
 * Deterministic evaluator for the RulePredicate DSL (@l3arn/shared-types).
 * This is the programmatic half of the correctness gate — it never calls
 * the AI; it checks whether a generated item's attributes satisfy an
 * authored, checkable rule.
 *
 * Grounded in: docs/superpowers/specs/2026-07-19-lesson-engine-content-contract-design.md §6
 */

import type { ItemAttributes, RulePredicate, RulePredicateLeaf } from "@l3arn/shared-types";

function isLeaf(predicate: RulePredicate): predicate is RulePredicateLeaf {
  return "field" in predicate;
}

function resolveExpected(leaf: RulePredicateLeaf, attributes: ItemAttributes): unknown {
  return leaf.compareField !== undefined ? attributes[leaf.compareField] : leaf.value;
}

function evaluateLeaf(leaf: RulePredicateLeaf, attributes: ItemAttributes): boolean {
  const actual = attributes[leaf.field];
  const expected = resolveExpected(leaf, attributes);

  switch (leaf.op) {
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "gt":
      return typeof actual === "number" && typeof expected === "number" && actual > expected;
    case "gte":
      return typeof actual === "number" && typeof expected === "number" && actual >= expected;
    case "lt":
      return typeof actual === "number" && typeof expected === "number" && actual < expected;
    case "lte":
      return typeof actual === "number" && typeof expected === "number" && actual <= expected;
    case "in":
      return Array.isArray(expected) && (expected as unknown[]).includes(actual);
    default:
      return false;
  }
}

/**
 * Evaluates a RulePredicate against an item's attributes. Pure, synchronous,
 * no AI call — this is what makes the correctness gate deterministic.
 */
export function evaluateRulePredicate(predicate: RulePredicate, attributes: ItemAttributes): boolean {
  if (isLeaf(predicate)) {
    return evaluateLeaf(predicate, attributes);
  }
  if ("allOf" in predicate) {
    return predicate.allOf.every((p) => evaluateRulePredicate(p, attributes));
  }
  if ("anyOf" in predicate) {
    return predicate.anyOf.some((p) => evaluateRulePredicate(p, attributes));
  }
  return !evaluateRulePredicate(predicate.not, attributes);
}
