/**
 * MissionCompiler
 *
 * The main entry point for mission generation. Takes a MissionCompilerInput
 * (three-part constraint: parent intent + child personalization + mastery targets)
 * and returns a MissionCompilerOutput containing all six mission output types,
 * evidence requirements, reward rules, a parent report seed, and calibration signals.
 *
 * AI output is validated with Zod and retried up to AI_MAX_RETRY_ATTEMPTS (3) times.
 * If all retries fail, the pre-built safe fallback is used (MISSION_001_FALLBACK).
 *
 * Uses the Anthropic SDK (@anthropic-ai/sdk) to call Claude.
 *
 * Grounded in:
 *   - ADR-014 (three-part mission constraint)
 *   - ADR-015 (conflict resolution — encoded in the prompt, not here)
 *   - ADR-016 (mission output model)
 *   - ADR-054 (AI output validation / retry / fallback — confirmed June 2026)
 *   - ADR-028 (AI audit envelope)
 *   - ai.schema.ts, mission.schema.ts (from @l3arn/shared-types)
 *
 * OPEN QUESTION: ANTHROPIC_API_KEY is read from process.env. In Railway, this
 * must be set as an environment variable. A future phase should validate the key
 * at startup and emit a health check failure if absent, rather than failing at
 * compile time. — Agent 6, Phase 0
 *
 * RESOLVED: Model version is now read from the ANTHROPIC_MODEL env var via
 * resolveModelVersion(). In production (NODE_ENV=production) the env var is
 * required and the compiler throws if absent. In non-production environments
 * it falls back to "claude-sonnet-4-6" with a console warning. — Wave 1 OQ Resolution
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  AI_MAX_RETRY_ATTEMPTS,
  AIOutputEnvelope,
  AIOutputResult,
  MissionOutput,
  MissionOutputSchema,
  RewardPlan,
} from "@l3arn/shared-types";

import {
  buildMission001SystemPrompt,
  buildMission001UserMessage,
  MISSION_001_PROMPT_TEMPLATE_VERSION,
} from "./prompts/mission-001.prompt";
import { MISSION_001_FALLBACK } from "./fallbacks/mission-001.fallback";
import { withAIRetry } from "./retry/retry-engine";
import { AIRawMissionOutputSchema } from "./validation/mission-output.schema";
import { MISSION_OUTPUT_JSON_SCHEMA } from "./validation/mission-output.json-schema";
import {
  buildParentPlanOutput,
  ParentPlanOutput,
} from "./outputs/parent-plan";
import {
  buildMission001CalibrationSignals,
  CalibrationSignal,
} from "./outputs/calibration-signals";
import {
  buildEvidenceRequirements,
  EvidenceRequirement,
} from "./outputs/evidence-requirements";
import { v4 as uuidv4 } from "uuid";

// ─── Compiler Version ─────────────────────────────────────────────────────────

export const MISSION_COMPILER_VERSION = "0.1.0";
const SCHEMA_VERSION = "mission-output-v0.1.0";
const MODEL_PROVIDER = "anthropic";

function resolveModelVersion(): string {
  const model = process.env.ANTHROPIC_MODEL;
  if (!model) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[MissionCompiler] CRITICAL: ANTHROPIC_MODEL env var is not set. " +
        "No production mission generation path may use a hardcoded model. " +
        "Set ANTHROPIC_MODEL in Railway environment variables."
      );
      throw new Error(
        "ANTHROPIC_MODEL environment variable is required in production"
      );
    }
    const DEV_DEFAULT = "claude-sonnet-4-6";
    console.warn(
      `[MissionCompiler] ANTHROPIC_MODEL not set — using dev default: ${DEV_DEFAULT}. ` +
      "Set ANTHROPIC_MODEL in your .env file."
    );
    return DEV_DEFAULT;
  }
  return model;
}

// ─── Input / Output Types ─────────────────────────────────────────────────────

/**
 * The three-part constraint input for the Mission Compiler.
 * Must supply all three dimensions — see ADR-014.
 */
export interface MissionCompilerInput {
  /** Dimension 1: What the parent wants taught */
  parentIntent: {
    curriculumGoals: string[];
    gradeLevel: string;
    blockedTopics: string[];
    subjectFocus: string[];
  };

  /** Dimension 2: Who the child is and how they learn */
  childPersonalization: {
    displayName: string;
    houseAffiliation: string;
    companionName?: string;
    companionPersonality: string;
    learningPrefs: string[];
    audioEnabled?: boolean;
  };

  /** Dimension 3: What mastery target this mission must satisfy */
  masteryTargets: {
    standardIds: string[];
    targetSkills: string[];
  };

  /** Child profile ID — used in the audit envelope */
  childProfileId: string;

  /** Optional child session ID — used in the audit envelope */
  childSessionId?: string;
}

/**
 * Re-export of ParentReportSeed used in MissionCompilerOutput.
 * Minimal seed for the parent report generated alongside the mission.
 *
 * OPEN QUESTION: ParentReportSeed is not yet defined in shared-types.
 * When the parent-report agent defines a canonical schema, this interface
 * should be replaced with an import from @l3arn/shared-types. — Agent 6, Phase 0
 */
export interface ParentReportSeed {
  masteryObjective: string;
  standardsAlignmentSummary: string;
  evidenceSummary: string;
  whyChosen: string;
  isPersonalized: boolean;
  fallbackUsed: boolean;
}

/**
 * The full output produced by one call to MissionCompiler.compile().
 */
export interface MissionCompilerOutput {
  /** The six mission output types (all always present — ADR-016) */
  missionData: MissionOutput;

  /** Structured parent-plan subset for easy access */
  parentPlan: ParentPlanOutput;

  /** Evidence capture requirements for this mission */
  evidenceRequirements: EvidenceRequirement[];

  /** Reward rules extracted from the mission output */
  rewardRules: RewardPlan;

  /** Seed data for the parent report generated after the mission */
  parentReportSeed: ParentReportSeed;

  /** Calibration signals Mission 001 is designed to capture */
  calibrationSignals: CalibrationSignal[];

  /** The full AI output envelope (includes audit trail, retry count, fallback status) */
  envelope: AIOutputEnvelope;

  /** True if the safe fallback was used instead of AI-generated content */
  usedFallback: boolean;
}

// ─── MissionCompiler Class ────────────────────────────────────────────────────

export class MissionCompiler {
  private readonly client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Compile a mission from a three-part constraint input.
   *
   * Calls Claude → validates with Zod → retries up to AI_MAX_RETRY_ATTEMPTS
   * → falls back to MISSION_001_FALLBACK if all attempts fail.
   *
   * Returns a MissionCompilerOutput including the audit envelope.
   */
  async compile(input: MissionCompilerInput): Promise<MissionCompilerOutput> {
    const modelVersion = resolveModelVersion();
    const traceId = uuidv4();
    const requestedAt = new Date().toISOString();

    const systemPrompt = buildMission001SystemPrompt();
    const userMessage = buildMission001UserMessage({
      parentIntent: input.parentIntent,
      childPersonalization: {
        displayName: input.childPersonalization.displayName,
        houseAffiliation: input.childPersonalization.houseAffiliation,
        companionName: input.childPersonalization.companionName,
        companionPersonality: input.childPersonalization.companionPersonality,
        learningPrefs: input.childPersonalization.learningPrefs,
      },
      masteryTargets: input.masteryTargets,
    });

    // ── Generate + Validate with retry ────────────────────────────────────────

    const result: AIOutputResult = await withAIRetry(
      // generate(): call Claude via tool_use (structured output) — no JSON.parse() needed
      async () => {
        const response = await this.client.messages.create({
          // A full Mission 001 (6 delivery formats + evidence/reward/parent plans)
          // exceeds 4096 output tokens; at 4096 the tool_use JSON was truncated,
          // dropping later required fields (evidencePlan, rewardPlan, …) → ZodError
          // → fallback every time. 16000 leaves ample headroom. (Verified 2026-06-28.)
          model: modelVersion,
          max_tokens: 16000,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
          tools: [
            {
              name: "generate_mission",
              description:
                "Generate a complete L3ARN mission output including all six delivery formats, " +
                "evidence plan, reward plan, and parent plan.",
              input_schema: MISSION_OUTPUT_JSON_SCHEMA,
            },
          ],
          tool_choice: { type: "tool", name: "generate_mission" },
        });

        // Extract the tool_use block — SDK parses JSON for us
        const toolUseBlock = response.content.find(
          (block) => block.type === "tool_use"
        );
        if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
          throw new Error(
            "Claude did not return a tool_use block for generate_mission"
          );
        }

        // toolUseBlock.input is already a parsed JS object — pass directly to validator
        return toolUseBlock.input;
      },

      // validate(): apply strict Zod schema
      (raw: unknown) => {
        return AIRawMissionOutputSchema.parse(raw);
      },

      // getFallback(): the pre-built safe fallback for Mission 001
      () => MISSION_001_FALLBACK,
    );

    // ── Build the audit envelope ───────────────────────────────────────────────

    const envelope: AIOutputEnvelope = {
      id: uuidv4(),
      traceId,
      generationContext: "mission-compiler",
      childProfileId: input.childProfileId,
      childSessionId: input.childSessionId,
      requestedAt,
      result,
      modelProvider: MODEL_PROVIDER,
      modelVersion: modelVersion,
      promptTemplateVersion: MISSION_001_PROMPT_TEMPLATE_VERSION,
      schemaVersion: SCHEMA_VERSION,
      safetyPolicyVersion: undefined,
      missionCompilerVersion: MISSION_COMPILER_VERSION,
      parentVisible: true,
    };

    // ── Handle both result branches ────────────────────────────────────────────

    if (result.status === "validated") {
      // Parse the validated data against the canonical MissionOutputSchema
      const missionData = MissionOutputSchema.parse(result.data);

      const calibrationSignals = buildMission001CalibrationSignals(
        input.childPersonalization.audioEnabled ?? false,
      );

      return {
        missionData,
        parentPlan: buildParentPlanOutput(missionData.parentPlan),
        evidenceRequirements: buildEvidenceRequirements(
          missionData.evidencePlan.capturePoints,
        ),
        rewardRules: missionData.rewardPlan,
        parentReportSeed: {
          masteryObjective:
            missionData.parentPlan.standardsAlignment.masteryObjective,
          standardsAlignmentSummary: [
            missionData.parentPlan.standardsAlignment.masteryDomainId,
            missionData.parentPlan.standardsAlignment.masterySkillId,
            missionData.parentPlan.standardsAlignment.floridaStandardCode,
          ]
            .filter(Boolean)
            .join(" · "),
          evidenceSummary: missionData.parentPlan.evidenceSummary,
          whyChosen: missionData.parentPlan.whyChosen,
          isPersonalized: true,
          fallbackUsed: false,
        },
        calibrationSignals,
        envelope,
        usedFallback: false,
      };
    } else {
      // status === "failed-with-fallback"
      // TODO: ADR-054 — fire parent notification here once the delivery mechanism
      // is confirmed (email / in-app alert / both). Notification level is
      // result.notificationLevel ("soft-notice" for mission generation failures).
      // Mechanism is TBD per ADR-054 open question. — Agent 6, Phase 0
      console.warn(
        `[MissionCompiler] Fallback used for childProfileId=${input.childProfileId}. ` +
          `Notification level: ${result.notificationLevel}. ` +
          `FallbackId: ${result.fallbackId}. ` +
          `TraceId: ${traceId}.`,
      );

      // Parse fallback content (the fallback content field is a JSON string)
      let fallbackMissionData: MissionOutput;
      try {
        fallbackMissionData = MissionOutputSchema.parse(
          JSON.parse(MISSION_001_FALLBACK.content),
        );
      } catch (parseError) {
        // This should never happen — the fallback content is human-authored and
        // has been validated at build time. If it does, it is a programmer error.
        throw new Error(
          `[MissionCompiler] CRITICAL: Safe fallback content failed MissionOutputSchema validation. ` +
            `This is a build-time invariant violation. TraceId: ${traceId}. ` +
            `Error: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        );
      }

      const calibrationSignals = buildMission001CalibrationSignals(
        input.childPersonalization.audioEnabled ?? false,
      );

      return {
        missionData: fallbackMissionData,
        parentPlan: buildParentPlanOutput(fallbackMissionData.parentPlan),
        evidenceRequirements: buildEvidenceRequirements(
          fallbackMissionData.evidencePlan.capturePoints,
        ),
        rewardRules: fallbackMissionData.rewardPlan,
        parentReportSeed: {
          masteryObjective:
            fallbackMissionData.parentPlan.standardsAlignment.masteryObjective,
          standardsAlignmentSummary: [
            fallbackMissionData.parentPlan.standardsAlignment.masteryDomainId,
            fallbackMissionData.parentPlan.standardsAlignment.masterySkillId,
          ]
            .filter(Boolean)
            .join(" · "),
          evidenceSummary: fallbackMissionData.parentPlan.evidenceSummary,
          whyChosen: MISSION_001_FALLBACK.parentNote,
          isPersonalized: false,
          fallbackUsed: true,
        },
        calibrationSignals,
        envelope,
        usedFallback: true,
      };
    }
  }
}
