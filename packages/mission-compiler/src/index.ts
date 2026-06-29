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

// ── Reward rules (pure; backend hydrates into DB writes) ──────────────────────
export {
  computeMission001Rewards,
  MISSION_001_BADGE_KEYS,
  type Mission001RewardParams,
  type Mission001RewardResult,
} from "./rewards/mission-001-reward-rules";

// ── Curriculum: canonical skill-key ↔ DB-code lookup ──────────────────────────
// NOTE: Mission001SkillKey is the canonical type — exported from here only.
// (mission-001-evidence-capture also declares it; do NOT re-export it there.)
export {
  resolveSkillDbCode,
  resolveSkillAppKey,
  SKILL_KEY_MAP,
  type Mission001SkillKey,
  type MasterySkillDbCode,
} from "./curriculum/skill-key-lookup";

// ── Evidence capture spec (static, typed) ─────────────────────────────────────
export {
  MISSION_001_EVIDENCE_SPEC,
  MISSION_001_REQUIRED_SKILL_KEYS,
  getParentVisibleEvidence,
  getConsentRequiredEvidence,
  getEvidenceSpecForTask,
  type Mission001EvidenceSpec,
} from "./evidence/mission-001-evidence-capture";
