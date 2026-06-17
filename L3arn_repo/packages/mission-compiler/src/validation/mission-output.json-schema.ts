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
// The SDK expects a JSON Schema object with type "object" at the root.
export const MISSION_OUTPUT_JSON_SCHEMA = zodToJsonSchema(
  AIRawMissionOutputSchema,
  { name: "AIRawMissionOutput", errorMessages: false }
) as Record<string, unknown>;
