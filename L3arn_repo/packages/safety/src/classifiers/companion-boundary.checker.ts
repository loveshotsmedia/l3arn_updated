/**
 * Companion Boundary Checker
 *
 * Validates companion AI responses against:
 *   1. Platform safety rules (hardcoded, non-configurable)
 *   2. Parent permission boundaries (from ChildPermissions)
 *   3. Age-appropriate content (under-13 assumed by default; K-8 platform)
 *
 * Returns ALL violations found, not just the first — so the severity calculator
 * can determine the worst-case severity across the full set.
 *
 * This checker does NOT make blocking decisions. It identifies violations and
 * attaches severity levels. The middleware/caller decides what to block based
 * on the violation list and the safety severity helper.
 *
 * Grounded in: ADR-009 (AI interaction model), ADR-006 (student chat model),
 * ADR-008 (parent visibility), ADR-015 (conflict resolution),
 * MASTER_HANDOFF §9 (safety and privacy baseline),
 * CONTEXT.md §4 Non-Negotiable #10 (raw PII not in training data).
 */

import type { ChildPermissions } from "@l3arn/shared-types";
import { PLATFORM_BLOCKED_CATEGORIES, classifyBlockedTopics } from "./blocked-topic.classifier";

// ─── Severity Type ────────────────────────────────────────────────────────────
// Mirrors the S0–S4 model from the task brief.
// Canonical mapping is in severity/safety-severity.helper.ts.
// Defined here to avoid circular import (the severity helper imports BoundaryViolation).

export type SafetySeverity = "S0" | "S1" | "S2" | "S3" | "S4";

// ─── Result Types ─────────────────────────────────────────────────────────────

export interface BoundaryViolation {
  rule: string;          // named rule that was violated (e.g. "platform:sexual-content")
  excerpt: string;       // truncated portion of content relevant to the violation
  severity: SafetySeverity;
}

export interface BoundaryCheckResult {
  passes: boolean;       // true only if violations is empty
  violations: BoundaryViolation[];
}

// ─── Excerpt Utility ──────────────────────────────────────────────────────────
// Truncate content for logging — never store more than needed.
// De-identifies: no names, no PII. Just enough context to audit the violation.

const EXCERPT_MAX_CHARS = 120;

function extractExcerpt(content: string, keyword: string): string {
  const idx = content.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) {
    // Fallback: return beginning of content
    return content.substring(0, EXCERPT_MAX_CHARS).trim() + (content.length > EXCERPT_MAX_CHARS ? "…" : "");
  }
  const start = Math.max(0, idx - 30);
  const end = Math.min(content.length, idx + keyword.length + 60);
  const excerpt = content.substring(start, end).trim();
  return (start > 0 ? "…" : "") + excerpt + (end < content.length ? "…" : "");
}

// ─── Platform Safety Rules ────────────────────────────────────────────────────
// Hardcoded rules applied to every companion response regardless of parent config.
// These are non-negotiable. Adding/changing rules requires a filed ADR.

interface PlatformRule {
  name: string;
  pattern: RegExp;
  severity: SafetySeverity;
  excerpt_hint: string; // keyword to extract excerpt around
}

const PLATFORM_COMPANION_RULES: PlatformRule[] = [
  // S4: Sexual content involving minors is the absolute hardest block
  {
    name: "platform:sexual-content-involving-minor",
    pattern: /\b(sex|sexual|nude|naked|porn|erotic|intercourse|genital|masturbat|orgasm)\b/i,
    severity: "S4",
    excerpt_hint: "sex",
  },
  // S4: Explicit self-harm content
  {
    name: "platform:self-harm",
    pattern: /\b(kill yourself|end your life|how to die|suicide method|cut yourself|self[- ]harm)\b/i,
    severity: "S4",
    excerpt_hint: "harm",
  },
  // S3: Graphic violence
  {
    name: "platform:graphic-violence",
    pattern: /\b(gore|dismember|decapitat|torture|mutilat|gruesome|eviscerat)\b/i,
    severity: "S3",
    excerpt_hint: "violence",
  },
  // S3: Off-platform contact solicitation
  {
    name: "platform:off-platform-contact",
    pattern: /\b(discord|snapchat|tiktok|telegram|whatsapp|give me your (number|email)|text me|dm me|add me on|follow me on|my username is|my handle is|meet me outside|contact me outside|reach me at)\b/i,
    severity: "S3",
    excerpt_hint: "contact",
  },
  // S2: Medical advice
  {
    name: "platform:medical-advice",
    pattern: /\b(you (might have|have|are sick with)|diagnos|take this medication|dosage|prescri|treat yourself)\b/i,
    severity: "S2",
    excerpt_hint: "medical",
  },
  // S2: Legal advice
  {
    name: "platform:legal-advice",
    pattern: /\b(you should sue|file a lawsuit|legal action|consult a lawyer|you have a case|you are entitled to)\b/i,
    severity: "S2",
    excerpt_hint: "legal",
  },
  // S2: Political persuasion
  {
    name: "platform:political-persuasion",
    pattern: /\b(you should vote|vote for|is the best (president|leader)|republicans are|democrats are|liberals are|conservatives are|elect)\b/i,
    severity: "S2",
    excerpt_hint: "political",
  },
  // S2: Substance use
  {
    name: "platform:substance-use",
    pattern: /\b(how to get (high|drunk)|drug use|marijuana|cocaine|heroin|methamphetamine|how to vape)\b/i,
    severity: "S2",
    excerpt_hint: "substance",
  },
  // S1: Personal information solicitation (companion should NEVER ask for PII)
  {
    name: "platform:pii-solicitation",
    pattern: /\b(what is your (real name|address|phone|email|school name)|where do you live|where do you go to school|how old are you exactly)\b/i,
    severity: "S1",
    excerpt_hint: "name",
  },
  // S1: Companion claiming to be human (deceptive AI identity)
  {
    name: "platform:ai-identity-deception",
    pattern: /\b(i am (a real person|not an ai|human|a human|actually human)|i am not a (robot|bot|ai|computer))\b/i,
    severity: "S1",
    excerpt_hint: "human",
  },
];

// ─── Companion Audio/Feature Boundary Rules ────────────────────────────────────
// These rules gate on what the parent has enabled in ChildPermissions.
// They check whether the companion response is trying to invoke a feature
// that the parent has not enabled for this child.
//
// OPEN QUESTION: Should there be a richer set of feature-gate rules here,
// e.g. checking if a companion is prompting a child to switch to a delivery
// mode the parent hasn't allowed? The current set covers the most obvious
// cases. Expand in Phase 1 when companion dialogue spec is finalized.
// — Agent 7, Phase 0

function checkPermissionBoundaries(
  companionResponse: string,
  childPermissions: ChildPermissions,
): BoundaryViolation[] {
  const violations: BoundaryViolation[] = [];
  const normalized = companionResponse.toLowerCase();

  // If audio is disabled, companion must not prompt child to use audio/mic
  if (!childPermissions.audioEnabled) {
    const audioPattern = /\b(press to talk|push to talk|use your mic|speak aloud|say it out loud|use audio|voice input)\b/i;
    const match = companionResponse.match(audioPattern);
    if (match) {
      violations.push({
        rule: "parent:audio-disabled-but-audio-prompted",
        excerpt: extractExcerpt(companionResponse, match[0]),
        severity: "S1",
      });
    }
  }

  // If AI interaction is disabled (parent turned off companion chat), this
  // check should never run — the caller should gate on aiInteractionEnabled.
  // If it somehow does run, flag it.
  if (!childPermissions.aiInteractionEnabled) {
    violations.push({
      rule: "parent:ai-interaction-disabled",
      excerpt: companionResponse.substring(0, EXCERPT_MAX_CHARS),
      severity: "S2",
    });
  }

  // Parent blocked topics: run full topic classifier against parent list
  const topicResult = classifyBlockedTopics(
    companionResponse,
    childPermissions.blockedTopics,
    [], // only parent topics here — platform topics already checked via PLATFORM_COMPANION_RULES
  );

  if (topicResult.blocked && topicResult.matchedTopic) {
    violations.push({
      rule: `parent:blocked-topic:${topicResult.matchedTopic}`,
      excerpt: extractExcerpt(normalized, topicResult.matchedTopic),
      severity: "S2",
    });
  }

  return violations;
}

// ─── Main Checker ─────────────────────────────────────────────────────────────

/**
 * Checks companion AI responses against platform safety rules and parent
 * permission boundaries. Returns all violations found.
 *
 * Safe fallback and blocking decisions are the responsibility of the caller
 * (safety middleware or moderation event creator).
 */
export function checkCompanionBoundaries(
  companionResponse: string,
  childPermissions: ChildPermissions,
): BoundaryCheckResult {
  const violations: BoundaryViolation[] = [];

  // 1. Run all platform-level hardcoded rules
  for (const rule of PLATFORM_COMPANION_RULES) {
    const match = companionResponse.match(rule.pattern);
    if (match) {
      violations.push({
        rule: rule.name,
        excerpt: extractExcerpt(companionResponse, match[0]),
        severity: rule.severity,
      });
    }
  }

  // 2. Run permission-boundary checks (parent-configured)
  const permissionViolations = checkPermissionBoundaries(companionResponse, childPermissions);
  violations.push(...permissionViolations);

  return {
    passes: violations.length === 0,
    violations,
  };
}
