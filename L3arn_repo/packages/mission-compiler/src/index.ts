/**
 * @l3arn/mission-compiler
 *
 * Mission Compiler package — pure logic, no HTTP server.
 *
 * Primary export: MissionCompiler class.
 * Secondary exports: Input/Output types, constants, sub-schemas, fallback data.
 *
 * Usage:
 *   import { MissionCompiler } from "@l3arn/mission-compiler";
 *   const compiler = new MissionCompiler();
 *   const output = await compiler.compile(input);
 */

// ── Primary: compiler class and its I/O types ─────────────────────────────────
export {
  MissionCompiler,
  MISSION_COMPILER_VERSION,
  type MissionCompilerInput,
  type MissionCompilerOutput,
  type ParentReportSeed,
} from "./compiler";

// ── Validation schema (Zod schema for raw AI output) ─────────────────────────
export {
  AIRawMissionOutputSchema,
  type AIRawMissionOutput,
} from "./validation/mission-output.schema";

// ── Retry engine ──────────────────────────────────────────────────────────────
export { withAIRetry } from "./retry/retry-engine";

// ── Safe fallback ─────────────────────────────────────────────────────────────
export {
  MISSION_001_FALLBACK,
  MISSION_001_FALLBACK_ID,
} from "./fallbacks/mission-001.fallback";

// ── Output builders and types ─────────────────────────────────────────────────
export {
  buildParentPlanOutput,
  type ParentPlanOutput,
} from "./outputs/parent-plan";

export {
  buildMission001CalibrationSignals,
  type CalibrationSignal,
} from "./outputs/calibration-signals";

export {
  buildEvidenceRequirements,
  type EvidenceRequirement,
} from "./outputs/evidence-requirements";

// ── Prompt template ───────────────────────────────────────────────────────────
export {
  buildMission001SystemPrompt,
  buildMission001UserMessage,
  MISSION_001_PROMPT_TEMPLATE_VERSION,
  type Mission001PromptInput,
} from "./prompts/mission-001.prompt";
