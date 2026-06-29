/**
 * Safety Severity Helper
 *
 * Maps BoundaryViolation types and context to severity levels S0–S4.
 *
 * Severity model (from task brief):
 *   S0: Informational — logged, no action
 *   S1: Low concern — logged, parent notified
 *   S2: Moderate concern — blocked, safe fallback shown, parent notified
 *   S3: High concern — blocked, session flagged, parent alerted
 *   S4: Critical — blocked, kill-switch triggered, platform admin notified
 *
 * Hard S4 rules (non-negotiable):
 *   - Any sexual content involving minors
 *   - Any explicit self-harm content
 *
 * S3 rules:
 *   - Graphic violence
 *   - Off-platform contact solicitation
 *
 * S2 rules:
 *   - Parent blocked topics
 *   - Political persuasion
 *   - Medical/legal advice
 *
 * S1 rules:
 *   - Mild off-topic content
 *   - Low-confidence matches
 *   - PII solicitation by companion
 *   - AI identity deception
 *
 * S0: Informational only
 *
 * Context modifiers: parent-report context elevates some S1 violations to S2
 * because data integrity for parent reports is a higher-stakes concern.
 *
 * OPEN QUESTION: Should context elevation rules be confirmed with founder/product
 * before building notification dispatch? The rules here are conservative defaults.
 * — Agent 7, Phase 0
 *
 * Grounded in: ADR-046 (S0–S4 provisional), ADR-047 (kill-switch),
 * CONTEXT.md §10 (S0–S4 severity model), agent_operating_rules.md.
 */

import type { BoundaryViolation, SafetySeverity } from "../classifiers/companion-boundary.checker";

// SafetySeverity is defined in companion-boundary.checker.ts to avoid circular imports.
// Re-exported here for convenience so callers can import from this module.
export type { SafetySeverity };

export type SafetyContext =
  | "companion-dialogue"
  | "mission-output"
  | "parent-report";

// ─── Rule → Base Severity Map ─────────────────────────────────────────────────
// Rule names are prefixed with source:
//   platform:*  — hardcoded platform rules
//   parent:*    — parent-configured boundaries
//
// The BoundaryViolation already carries a severity (set by the platform rule or
// the permission checker). determineSeverity RESPECTS that severity but may
// elevate it based on context.

/**
 * Determines the worst-case safety severity for a set of violations in a given
 * context. Returns the highest severity level across all violations, with
 * optional context-based elevation.
 *
 * When violations is empty, returns "S0" (informational — nothing to action).
 */
export function determineSeverity(
  violations: BoundaryViolation[],
  context: SafetyContext,
): SafetySeverity {
  if (violations.length === 0) {
    return "S0";
  }

  // Find the worst severity from violations as-declared
  let worst: SafetySeverity = "S0";
  for (const violation of violations) {
    worst = maxSeverity(worst, violation.severity);
  }

  // Context elevation: parent-report context elevates S1 → S2 because
  // a corrupted or unsafe parent report can damage parent trust and potentially
  // expose the child's learning history in unsafe ways.
  if (context === "parent-report" && worst === "S1") {
    return "S2";
  }

  // Mission output context: any blocked topic (S2) in a mission is treated as
  // at least S2 regardless of confidence level (mission content that a parent
  // blocked should never appear in a mission, even at low confidence).
  if (context === "mission-output") {
    const hasBlockedTopic = violations.some((v) =>
      v.rule.startsWith("parent:blocked-topic:"),
    );
    if (hasBlockedTopic && worst === "S1") {
      return "S2";
    }
  }

  return worst;
}

// ─── Severity Ordering ────────────────────────────────────────────────────────

const SEVERITY_ORDER: SafetySeverity[] = ["S0", "S1", "S2", "S3", "S4"];

function maxSeverity(a: SafetySeverity, b: SafetySeverity): SafetySeverity {
  const aIdx = SEVERITY_ORDER.indexOf(a);
  const bIdx = SEVERITY_ORDER.indexOf(b);
  return aIdx >= bIdx ? a : b;
}

// ─── Severity Decision Helpers ────────────────────────────────────────────────
// Convenience predicates used by middleware and event creator.

/** Returns true if severity warrants immediately blocking the response. */
export function shouldBlock(severity: SafetySeverity): boolean {
  return severity === "S2" || severity === "S3" || severity === "S4";
}

/** Returns true if severity warrants triggering the kill switch. */
export function shouldTriggerKillSwitch(severity: SafetySeverity): boolean {
  return severity === "S4";
}

/** Returns true if severity warrants active parent notification. */
export function shouldNotifyParent(severity: SafetySeverity): boolean {
  return severity === "S1" || severity === "S2" || severity === "S3" || severity === "S4";
}

/** Returns true if severity warrants platform admin (founder) escalation. */
export function shouldEscalateToAdmin(severity: SafetySeverity): boolean {
  return severity === "S4";
}
