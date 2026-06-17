/**
 * AI Retry Helper
 *
 * Shared retry wrapper used by both the Mission Compiler (Agent 6) and companion AI
 * generation. Implements the 3-attempt retry policy (ADR-054 — confirmed June 2026).
 *
 * Flow:
 *   1. Call generate() to get raw AI output
 *   2. Call validate(raw) to parse and validate the output
 *   3. If validation succeeds → return validated AIOutputResult
 *   4. If validation fails → record AIValidationAttempt, retry
 *   5. After AI_MAX_RETRY_ATTEMPTS (3) failures → call getFallback() and return
 *      a failed-with-fallback AIOutputResult
 *
 * This helper is pure logic — no side effects, no DB writes, no HTTP calls.
 * Logging is the caller's responsibility.
 *
 * OPEN QUESTION: Should this helper accept an optional logger argument so callers
 * can plug in structured logging without the helper depending on a logging package?
 * Current approach: no logging here; callers log the returned AIOutputResult.
 * — Agent 7, Phase 0
 *
 * Grounded in: ADR-054 (confirmed June 2026), ai.schema.ts.
 */

import {
  AI_MAX_RETRY_ATTEMPTS,
  type AIOutputResult,
  type AIValidationAttempt,
  type SafeFallback,
  type SafeFallbackContext,
} from "@l3arn/shared-types";

/**
 * withAIRetry — shared retry helper for all AI generation points.
 *
 * @param generate   - Async function that calls the AI model and returns raw output
 * @param validate   - Pure function that parses and validates raw output; throws on failure
 * @param getFallback - Returns the pre-defined safe fallback for this context
 * @param context    - SafeFallbackContext for the fallback record
 * @returns          AIOutputResult (either "validated" or "failed-with-fallback")
 */
export async function withAIRetry<T>(
  generate: () => Promise<unknown>,
  validate: (raw: unknown) => T,
  getFallback: () => SafeFallback,
  context: SafeFallbackContext,
): Promise<AIOutputResult> {
  const attempts: AIValidationAttempt[] = [];

  for (let attemptNumber = 1; attemptNumber <= AI_MAX_RETRY_ATTEMPTS; attemptNumber++) {
    let raw: unknown;

    try {
      raw = await generate();
    } catch (generateError) {
      // Generation itself failed (network error, provider error, etc.)
      const failureReason =
        generateError instanceof Error
          ? `generation-error: ${generateError.message}`
          : "generation-error: unknown";

      attempts.push({
        attemptNumber,
        failureReason,
        failedAt: new Date().toISOString(),
      });

      // Do not retry generation errors beyond what AI_MAX_RETRY_ATTEMPTS allows
      if (attemptNumber === AI_MAX_RETRY_ATTEMPTS) {
        break;
      }
      continue;
    }

    try {
      const validated = validate(raw);
      return {
        status: "validated",
        data: validated,
        attemptsUsed: attemptNumber,
        validatedAt: new Date().toISOString(),
      };
    } catch (validationError) {
      const failureReason =
        validationError instanceof Error
          ? `validation-error: ${validationError.message}`
          : "validation-error: unknown";

      attempts.push({
        attemptNumber,
        failureReason,
        failedAt: new Date().toISOString(),
      });
    }
  }

  // All attempts exhausted — use safe fallback
  // IMPORTANT: Safe fallbacks are NEVER AI-generated (ai.schema.ts invariant).
  const fallback = getFallback();

  // AIOutputResultSchema requires exactly 3 attempts for failed-with-fallback.
  // Pad with a sentinel if generate() failed before all 3 attempts (should not happen
  // in normal flow, but defensive against unexpected early-exit paths).
  const paddedAttempts = padAttempts(attempts);

  // Determine notification level based on context.
  // Companion dialogue failures: soft-notice (child sees pre-written fallback).
  // Mission output failures: safety-alert (blocked mission affects child experience).
  // OPEN QUESTION: Should notification level be passed in by the caller rather than
  // inferred here? The caller has richer context about whether this is a safety issue
  // or a quality issue. Revisit in Phase 1 when the notification delivery mechanism
  // is confirmed (ADR-054 open question). — Agent 7, Phase 0
  const notificationLevel =
    context === "companion-dialogue" ? "soft-notice" : "safety-alert";

  return {
    status: "failed-with-fallback",
    attemptsUsed: 3,
    attempts: paddedAttempts,
    fallbackId: fallback.id,
    fallbackUsedAt: new Date().toISOString(),
    notificationLevel,
  };
}

// ─── Pad attempts to exactly 3 ────────────────────────────────────────────────
// AIOutputResultSchema requires exactly 3 AIValidationAttempt records in the
// failed-with-fallback branch. This pads if generation errored before all
// attempts were made (rare edge case).

function padAttempts(
  attempts: AIValidationAttempt[],
): [AIValidationAttempt, AIValidationAttempt, AIValidationAttempt] {
  const now = new Date().toISOString();
  const padded: AIValidationAttempt[] = [...attempts];

  while (padded.length < 3) {
    padded.push({
      attemptNumber: (padded.length + 1) as 1 | 2 | 3,
      failureReason: "attempt-not-reached: earlier failure halted retry loop",
      failedAt: now,
    });
  }

  return [padded[0], padded[1], padded[2]] as [
    AIValidationAttempt,
    AIValidationAttempt,
    AIValidationAttempt,
  ];
}
