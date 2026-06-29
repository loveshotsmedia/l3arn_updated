/**
 * JSON Schema representation of AIRawMissionOutputSchema.
 *
 * Used as the `input_schema` for the Claude tool_use (structured output) call.
 * Generated from the Zod schema using zod-to-json-schema so the two stay in sync.
 *
 * Claude fills this schema directly — no JSON.parse() needed. Zod still validates
 * the result for runtime safety.
 */

import { zodToJsonSchema } from "zod-to-json-schema";
import { AIRawMissionOutputSchema } from "./mission-output.schema";

// Export as a plain object — this is passed directly to the Anthropic SDK tools array.
// The SDK requires `type: "object"` at the root of input_schema.
// We pass `target: "openApi3"` to get a flat schema (no $ref/$defs wrapping).
export const MISSION_OUTPUT_JSON_SCHEMA = zodToJsonSchema(
  AIRawMissionOutputSchema,
  { target: "openApi3", errorMessages: false }
) as { type: "object"; [key: string]: unknown };
