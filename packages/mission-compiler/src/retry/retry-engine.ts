/**
 * Retry Engine
 *
 * Implements the 3-attempt AI output validation + retry policy from ADR-054.
 *
 * Contract:
 *   - Attempt 1, 2, 3 in sequence (never more — AI_MAX_RETRY_ATTEMPTS = 3 is the hard cap)
 *   - Each attempt: generate → validate with Zod → on failure, log attempt record
 *   - After 3 failures: return AIOutputResult with status "failed-with-fallback"
 *   - On success: return AIOutputResult with status "validated"
 *
 * The caller provides:
 *   - generate(): calls the AI and returns raw unknown output
 *   - validate(): parses with Zod; throws ZodError if invalid
 *   - getFallback(): returns the SafeFallback to use if all retries fail
 *
 * The returned AIOutputResult is always compliant with AIOutputResultSchema from
 * @l3arn/shared-types. Consumers must handle both branches (validated / failed-with-fallback).
 *
 * Grounded in: ADR-054 (confirmed June 2026), ai.schema.ts (AI_MAX_RETRY_ATTEMPTS,
 * AIOutputResultSchema, AIValidationAttemptSchema, SafeFallbackSchema).
 *
 * OPEN QUESTION: Should retry attempts use exponential backoff between calls to Claude?
 * Currently no delay between attempts. If Claude rate-limits under burst load, a
 * brief delay (e.g. 500ms, 1000ms) between retries would be appropriate.
 * This needs a decision before production load testing. — Agent 6, Phase 0
 */

import {
  AI_MAX_RETRY_ATTEMPTS,
  AIOutputResult,
  AIValidationAttempt,
  SafeFallback,
} from "@l3arn/shared-types";

import { ZodError } from "zod";

/**
 * Run up to AI_MAX_RETRY_ATTEMPTS attempts to generate and validate AI output.
 *
 * @param generate  Async function that calls the AI and returns raw unknown output.
 * @param validate  Synchronous function that applies Zod parsing; must throw ZodError on failure.
 * @param getFallback  Returns the safe fallback content to use after all retries fail.
 * @returns AIOutputResult — always either "validated" or "failed-with-fallback"
 */
export async function withAIRetry<T>(
  generate: () => Promise<unknown>,
  validate: (raw: unknown) => T,
  getFallback: () => SafeFallback,
): Promise<AIOutputResult> {
  const failedAttempts: AIValidationAttempt[] = [];

  for (let attempt = 1; attempt <= AI_MAX_RETRY_ATTEMPTS; attempt++) {
    let raw: unknown;

    try {
      raw = await generate();
    } catch (generationError) {
      // Generation itself failed (network error, API error, etc.)
      const failureReason =
        generationError instanceof Error
          ? `AI generation error: ${generationError.message}`
          : "AI generation error: unknown failure";

      failedAttempts.push({
        attemptNumber: attempt as 1 | 2 | 3,
        failureReason,
        failedAt: new Date().toISOString(),
      });

      console.error(
        `[retry-engine] Attempt ${attempt}/${AI_MAX_RETRY_ATTEMPTS} — generation failed: ${failureReason}`,
      );

      // If this was the last attempt, fall through to fallback
      if (attempt === AI_MAX_RETRY_ATTEMPTS) {
        break;
      }
      continue;
    }

    try {
      const validated = validate(raw);

      // Validation succeeded — structured log so operators can confirm AI path is active
      console.log(
        JSON.stringify({
          level: "info",
          system: "mission-compiler",
          msg: "AI generation succeeded",
          attemptsUsed: attempt,
          contentSource: "ai",
        }),
      );
      return {
        status: "validated",
        data: validated,
        attemptsUsed: attempt as 1 | 2 | 3,
        validatedAt: new Date().toISOString(),
      };
    } catch (validationError) {
      // Validation failed — log attempt and try again
      let failureReason: string;

      if (validationError instanceof ZodError) {
        const issues = validationError.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ");
        failureReason = `ZodError — ${issues}`;
      } else if (validationError instanceof Error) {
        failureReason = `Validation error: ${validationError.message}`;
      } else {
        failureReason = "Validation error: unknown failure";
      }

      failedAttempts.push({
        attemptNumber: attempt as 1 | 2 | 3,
        failureReason,
        failedAt: new Date().toISOString(),
      });

      console.error(
        `[retry-engine] Attempt ${attempt}/${AI_MAX_RETRY_ATTEMPTS} — validation failed: ${failureReason}`,
      );

      // If this was the last attempt, fall through to fallback
      if (attempt === AI_MAX_RETRY_ATTEMPTS) {
        break;
      }
    }
  }

  // All AI_MAX_RETRY_ATTEMPTS attempts failed — use safe fallback
  const fallback = getFallback();

  // Structured log so Railway/Datadog/log alerting can filter on level="warn"
  // and system="mission-compiler" to detect silent AI fallback in production.
  console.log(
    JSON.stringify({
      level: "warn",
      system: "mission-compiler",
      msg: "AI generation failed — using static fallback content",
      fallbackId: fallback.id,
      attemptCount: AI_MAX_RETRY_ATTEMPTS,
      errorSummary: failedAttempts.map((a) => `[${a.attemptNumber}] ${a.failureReason}`).join(" | "),
    }),
  );

  // The AIOutputResultSchema requires exactly 3 attempts in the failed-with-fallback branch.
  // This assertion is safe because we only reach here after AI_MAX_RETRY_ATTEMPTS (3) loops.
  if (failedAttempts.length !== AI_MAX_RETRY_ATTEMPTS) {
    // Defensive: pad if generation errors caused fewer records than expected.
    // Should not happen under normal conditions.
    console.error(
      `[retry-engine] Unexpected attempt count: ${failedAttempts.length}. Expected ${AI_MAX_RETRY_ATTEMPTS}.`,
    );
  }

  // Ensure we have exactly 3 attempt records (schema requires .length(3))
  const threeAttempts = failedAttempts.slice(0, 3) as [
    AIValidationAttempt,
    AIValidationAttempt,
    AIValidationAttempt,
  ];

  while (threeAttempts.length < 3) {
    threeAttempts.push({
      attemptNumber: (threeAttempts.length + 1) as 1 | 2 | 3,
      failureReason: "Attempt not reached due to prior generation error",
      failedAt: new Date().toISOString(),
    });
  }

  return {
    status: "failed-with-fallback",
    attemptsUsed: 3,
    attempts: threeAttempts,
    fallbackId: fallback.id,
    fallbackUsedAt: new Date().toISOString(),
    // Mission generation failures are always at least soft-notice because the student
    // sees the fallback mission instead of a personalized one.
    // TODO: ADR-054 — delivery mechanism for soft-notice notifications is TBD (ADR-054 open question).
    notificationLevel: "soft-notice",
  };
}
