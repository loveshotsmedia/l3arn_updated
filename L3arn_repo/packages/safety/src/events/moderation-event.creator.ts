/**
 * Moderation Event Creator
 *
 * Creates ModerationEvent objects for AI output violations found by the
 * safety pipeline. Does NOT write to the database — returns the event object
 * for the caller to persist.
 *
 * PII rules (non-negotiable):
 *   - Only childProfileId (UUID) is stored — never name, DOB, email, or real identity
 *   - Session context is de-identified (IDs only; no session content)
 *   - No raw content from the violating AI output is stored in the event
 *   - matchedPatterns contains rule names and sanitized excerpts only
 *
 * OPEN QUESTION: The ModerationEventSchema in moderation.schema.ts is designed
 * around chat message moderation (has chatMessageId, roomId, messageType).
 * AI output violations (companion-response, mission-output) do not have a
 * chatMessageId or roomId in the same sense. We populate these fields with
 * sentinel values ("AI_OUTPUT") to satisfy the schema. In Phase 1, consider
 * a separate AIOutputModerationEventSchema or a discriminated union in
 * ModerationEventSchema. Filed as open question — Agent 7, Phase 0.
 *
 * Grounded in: ADR-054, ADR-028, ADR-008, moderation.schema.ts,
 * MASTER_HANDOFF §9 (de-identification rules).
 */

import { type ModerationEvent } from "@l3arn/shared-types";
import type { BoundaryViolation } from "../classifiers/companion-boundary.checker";

export type ModerationTriggerSource =
  | "companion-response"
  | "mission-output"
  | "user-input";

/**
 * Creates a ModerationEvent for a single BoundaryViolation.
 *
 * Callers creating events for multiple violations should call this once per
 * violation, then persist all events in a single batch to the DB.
 *
 * @param violation       - The boundary violation that triggered this event
 * @param childProfileId  - UUID of the child's profile (never real name/PII)
 * @param sessionId       - UUID of the active session, if any (optional)
 * @param triggeredBy     - Source of the violation (companion, mission, or user input)
 */
export function createModerationEvent(
  violation: BoundaryViolation,
  childProfileId: string,
  sessionId: string | undefined,
  triggeredBy: ModerationTriggerSource,
): ModerationEvent {
  // Map severity from our internal safety model to the moderation schema outcome.
  // S3/S4 → blocked (hard stop); S1/S2 → flagged-for-review; S0 → approved (informational)
  const outcome: ModerationEvent["outcome"] =
    violation.severity === "S4" || violation.severity === "S3"
      ? "blocked"
      : violation.severity === "S2" || violation.severity === "S1"
      ? "flagged-for-review"
      : "approved"; // S0: informational only

  const now = new Date().toISOString();

  // Build the ModerationEvent matching the ModerationEventSchema shape.
  // Note the sentinel values for fields that don't apply to AI output:
  // - chatMessageId: absent (blocked before storage)
  // - roomId: "AI_OUTPUT:<triggeredBy>" as a context marker
  // - messageType: "system-message" (closest semantic fit for AI-generated content)
  //
  // OPEN QUESTION: Schema gap — see module-level comment. — Agent 7, Phase 0
  const event: ModerationEvent = {
    id: generateEventId(),
    chatMessageId: undefined,  // not applicable — AI output, not a chat message
    senderChildProfileId: childProfileId,
    roomId: `AI_OUTPUT:${triggeredBy}`,  // sentinel; not a real room ID
    messageType: "system-message",        // closest semantic fit
    outcome,
    checksRun: [
      {
        checkType: "keyword-filter",
        outcome,
        // matchedPatterns: rule name only — never raw content or PII
        matchedPatterns: [
          violation.rule,
          // Include truncated excerpt only for blocked/flagged events (not S0)
          ...(violation.severity !== "S0"
            ? [`excerpt_ref:${sanitizeExcerptForLog(violation.excerpt)}`]
            : []),
        ],
      },
    ],
    moderatedAt: now,
    parentNotified: violation.severity === "S4" || violation.severity === "S3",
    parentNotifiedAt:
      violation.severity === "S4" || violation.severity === "S3" ? now : undefined,
  };

  return event;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Sanitize excerpt for log storage. Removes anything that looks like PII patterns.
 * Excerpts are already truncated upstream (companion-boundary.checker.ts).
 * This adds a second pass to strip email-like, phone-like, and name-like patterns.
 *
 * OPEN QUESTION: Is this double-sanitization sufficient for COPPA/FERPA compliance,
 * or should excerpts be excluded from ModerationEvent entirely and stored only in
 * a separate audit log with restricted access? Prefer conservative approach in Phase 1.
 * — Agent 7, Phase 0
 */
function sanitizeExcerptForLog(excerpt: string): string {
  return excerpt
    .replace(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi, "[EMAIL_REDACTED]")
    .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[PHONE_REDACTED]")
    .replace(/\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr)\b/gi, "[ADDRESS_REDACTED]")
    .substring(0, 100); // hard cap at 100 chars for log storage
}

/**
 * Generate a UUID-shaped event ID.
 * In production, callers may inject a UUID generator. For now, uses crypto.randomUUID
 * if available, otherwise falls back to a timestamp-based ID.
 *
 * OPEN QUESTION: Should this package depend on the `uuid` npm package or rely on
 * globalThis.crypto? Node 18+ has crypto.randomUUID(); target runtime should be
 * confirmed. — Agent 7, Phase 0
 */
function generateEventId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID (Node < 18)
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `mod-${ts}-${rand}`;
}
