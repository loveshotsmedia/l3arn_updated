/**
 * Narrow tool `input_schema` for the fast mission-start path: the student3dMission
 * section only. Same generator settings as MISSION_OUTPUT_JSON_SCHEMA (jsonSchema7,
 * $refStrategy: "none") so the Anthropic tool validator accepts it (draft 2020-12,
 * flat, no $ref) — verified against the live API for the full schema on 2026-06-28.
 */

import { zodToJsonSchema } from "zod-to-json-schema";
import { AI3dMissionSchema } from "./mission-output.schema";

export const MISSION_3D_JSON_SCHEMA = zodToJsonSchema(
  AI3dMissionSchema,
  { target: "jsonSchema7", $refStrategy: "none", errorMessages: false }
) as { type: "object"; properties: Record<string, unknown>; [key: string]: unknown };
