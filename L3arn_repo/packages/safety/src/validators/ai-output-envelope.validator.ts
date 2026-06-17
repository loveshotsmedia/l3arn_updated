/**
 * AI Output Envelope Validator
 *
 * Validates raw AI output envelopes against AIOutputEnvelopeSchema from ai.schema.ts.
 * Throws ZodError if the envelope is malformed.
 *
 * This is the entry point for all AI output entering the safety pipeline.
 * No AI output may reach a child or parent without passing through here first.
 *
 * Grounded in: ADR-054 (AI output validation/retry/fallback — confirmed June 2026),
 * ADR-028 (AI audit envelope fields — confirmed June 2026).
 */

import { AIOutputEnvelopeSchema } from "@l3arn/shared-types";

// Re-export the inferred type so consumers don't need a direct import from shared-types
export type { AIOutputEnvelope } from "@l3arn/shared-types";

/**
 * Validates a raw (unknown) value as an AIOutputEnvelope.
 *
 * Throws: ZodError — if validation fails (contains detailed field-level errors).
 * Returns: AIOutputEnvelope — fully typed and validated.
 *
 * Callers must handle the thrown ZodError as a hard failure:
 *   - Do NOT show raw error details to the child or parent
 *   - Log the ZodError for internal debugging
 *   - Trigger the retry/fallback path (see ai-retry.helper.ts)
 */
export function validateAIOutputEnvelope(
  raw: unknown,
): ReturnType<typeof AIOutputEnvelopeSchema.parse> {
  // Zod .parse() throws ZodError on failure — callers catch and route to fallback
  return AIOutputEnvelopeSchema.parse(raw);
}
