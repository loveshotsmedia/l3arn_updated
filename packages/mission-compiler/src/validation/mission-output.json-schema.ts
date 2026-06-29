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
//
// Anthropic's tool `input_schema` validator REJECTS the OpenAPI 3.0 dialect
// (target: "openApi3") with HTTP 400 "JSON schema is invalid. It must match JSON
// Schema draft 2020-12". Verified against the live API (2026-06-28): of the
// zod-to-json-schema targets, only "jsonSchema7" output is accepted; "openApi3",
// "jsonSchema2019-09", and "jsonSchema2020-12" are all rejected. `$refStrategy:
// "none"` inlines sub-schemas so the result stays flat (no $ref/$defs wrapping),
// preserving the original intent while passing the validator.
export const MISSION_OUTPUT_JSON_SCHEMA = zodToJsonSchema(
  AIRawMissionOutputSchema,
  { target: "jsonSchema7", $refStrategy: "none", errorMessages: false }
) as { type: "object"; [key: string]: unknown };
