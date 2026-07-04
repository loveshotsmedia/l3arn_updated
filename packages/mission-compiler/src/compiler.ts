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
  Student3dMission,
  Student3dMissionSchema,
} from "@l3arn/shared-types";

import {
  buildMission001SystemPrompt,
  buildMission001UserMessage,
  MISSION_001_PROMPT_TEMPLATE_VERSION,
} from "./prompts/mission-001.prompt";
import { buildMission0013dSystemPrompt } from "./prompts/mission-001-3d.prompt";
import {
  MISSION_001_FALLBACK,
  getMission001FallbackStudent3d,
} from "./fallbacks/mission-001.fallback";
import { withAIRetry } from "./retry/retry-engine";
import {
  AI3dMissionSchema,
  AIRawMissionOutputSchema,
} from "./validation/mission-output.schema";
import { MISSION_OUTPUT_JSON_SCHEMA } from "./validation/mission-output.json-schema";
import { MISSION_3D_JSON_SCHEMA } from "./validation/mission-3d.json-schema";
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

/**
 * Per-request wall-clock ceiling for the Anthropic mission-generation call.
 *
 * Without this, a slow or stuck upstream request never rejects, so withAIRetry's
 * retry→fallback safety net (which only fires on a *thrown* error) never engages —
 * the student is left on "Preparing your mission…" indefinitely (the SDK's own
 * default timeout is 10 minutes). With it, a request that exceeds the ceiling is
 * aborted and rejects with APIConnectionTimeoutError, which flows straight to the
 * pre-built static fallback (a valid Mission 001) so the student always gets a
 * mission promptly.
 *
 * Env-tunable via MISSION_AI_TIMEOUT_MS so ops can adjust for observed generation
 * latency without a redeploy. Default 30s: the fast-start call generates only the
 * student3dMission section, so it finishes well under this; a hard bound on the
 * degraded case.
 */
const DEFAULT_AI_TIMEOUT_MS = 30_000; // small student3dMission call; rarely approached
function resolveAiTimeoutMs(): number {
  const raw = process.env.MISSION_AI_TIMEOUT_MS;
  if (!raw) return DEFAULT_AI_TIMEOUT_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_AI_TIMEOUT_MS;
}

/**
 * A generation error that retrying the identical call cannot fix: a request
 * timeout or a user/programmatic abort. Detected by both instanceof AND
 * name/message duck-typing — in the Railway runtime the SDK timeout did NOT
 * match instanceof alone (PR #20 prod miss), so it retried 3× instead of
 * short-circuiting. These go straight to the safe fallback; validation
 * (ZodError) failures are still retried.
 *
 * Note: the message match also short-circuits transient server-side 504/408
 * gateway timeouts — intentional, to bound worst-case wall-clock latency; the
 * fallback is a safe, valid mission, so recovering via retry isn't worth the wait.
 */
export function isNonRetryableAiError(error: unknown): boolean {
  if (error instanceof Anthropic.APIConnectionTimeoutError) return true;
  if (error instanceof Anthropic.APIUserAbortError) return true;
  const name = (error as { name?: unknown } | null)?.name;
  if (
    typeof name === "string" &&
    ["APIConnectionTimeoutError", "APIUserAbortError", "AbortError", "TimeoutError"].includes(name)
  ) {
    return true;
  }
  const message = (error as { message?: unknown } | null)?.message;
  if (typeof message === "string" && /timed out|timeout|aborted|abort/i.test(message)) return true;
  return false;
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

/**
 * The fast-start compiler output — only the section the runtime consumes at start.
 * Produced by compileStart(): a ~4-6× smaller generation than the full six-section
 * compile(), so it finishes inside the timeout and AI content is the norm.
 */
export interface MissionStartCompilerOutput {
  /** The student-facing 3D mission section (the only section needed at start) */
  student3dMission: Student3dMission;

  /** True if the safe fallback slice was used instead of AI-generated content */
  usedFallback: boolean;

  /** The full AI output envelope (identical shape to compile()'s envelope) */
  envelope: AIOutputEnvelope;
}

// ─── MissionCompiler Class ────────────────────────────────────────────────────

export class MissionCompiler {
  private readonly client: Anthropic;

  constructor(apiKey?: string, client?: Anthropic) {
    this.client =
      client ??
      new Anthropic({
        apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY,
      });
  }

  /**
   * Build the AI audit envelope (ADR-028). Extracted so compile() and
   * compileStart() produce an identical envelope shape from the same code path.
   * Generates a fresh envelope id; traceId, requestedAt, result, and modelVersion
   * are threaded through from the calling compile path.
   */
  private buildEnvelope(
    traceId: string,
    requestedAt: string,
    result: AIOutputResult,
    modelVersion: string,
    input: MissionCompilerInput,
  ): AIOutputEnvelope {
    return {
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
    const aiTimeoutMs = resolveAiTimeoutMs();
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
        }, {
          // Bound the request so a slow/stuck generation aborts and flows into the
          // retry→fallback path instead of hanging (SDK default timeout is 10 min).
          // maxRetries: 0 — withAIRetry is the single retry authority; the SDK's own
          // retries would multiply the wall-clock wait on top of it.
          timeout: aiTimeoutMs,
          maxRetries: 0,
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

      // A request timeout/abort can't be fixed by retrying — go straight to fallback.
      isNonRetryableAiError,
    );

    // ── Build the audit envelope ───────────────────────────────────────────────

    const envelope = this.buildEnvelope(
      traceId,
      requestedAt,
      result,
      modelVersion,
      input,
    );

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

  /**
   * Fast-start compile: generate ONLY the student3dMission section (the single
   * section the runtime consumes at mission start). ~4-6× smaller than the full
   * six-section compile(), so it finishes inside the timeout and AI content is
   * the norm, not the fallback. Falls back to the student3dMission slice of
   * MISSION_001_FALLBACK on a genuine API failure.
   */
  async compileStart(
    input: MissionCompilerInput,
  ): Promise<MissionStartCompilerOutput> {
    const modelVersion = resolveModelVersion();
    const aiTimeoutMs = resolveAiTimeoutMs();
    const traceId = uuidv4();
    const requestedAt = new Date().toISOString();

    const systemPrompt = buildMission0013dSystemPrompt();
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

    const result: AIOutputResult = await withAIRetry(
      // generate(): request only the narrow student3dMission tool
      async () => {
        const response = await this.client.messages.create(
          {
            // Only one section → 4000 output tokens is ample headroom.
            model: modelVersion,
            max_tokens: 4000,
            system: systemPrompt,
            messages: [{ role: "user", content: userMessage }],
            tools: [
              {
                name: "generate_student_3d_mission",
                description:
                  "Generate the student-facing 3D mission for Mission 001: story hook, " +
                  "companion dialogue, ordered tasks, and reward preview.",
                input_schema: MISSION_3D_JSON_SCHEMA,
              },
            ],
            tool_choice: { type: "tool", name: "generate_student_3d_mission" },
          },
          {
            // Same request-bounding contract as compile(): withAIRetry is the
            // single retry authority (SDK maxRetries: 0).
            timeout: aiTimeoutMs,
            maxRetries: 0,
          },
        );

        const toolUseBlock = response.content.find(
          (block) => block.type === "tool_use",
        );
        if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
          throw new Error(
            "Claude did not return a tool_use block for generate_student_3d_mission",
          );
        }
        return toolUseBlock.input;
      },

      // validate(): narrow 3D-only Zod schema
      (raw: unknown) => AI3dMissionSchema.parse(raw),

      // getFallback(): the pre-built safe fallback for Mission 001
      () => MISSION_001_FALLBACK,

      // A request timeout/abort can't be fixed by retrying — go straight to fallback.
      isNonRetryableAiError,
    );

    const envelope = this.buildEnvelope(
      traceId,
      requestedAt,
      result,
      modelVersion,
      input,
    );

    if (result.status === "validated") {
      const student3dMission = Student3dMissionSchema.parse(result.data);
      return { student3dMission, usedFallback: false, envelope };
    }

    console.warn(
      `[MissionCompiler] compileStart fallback for childProfileId=${input.childProfileId}. ` +
        `Notification: ${result.notificationLevel}. FallbackId: ${result.fallbackId}. TraceId: ${traceId}.`,
    );
    return {
      student3dMission: getMission001FallbackStudent3d(),
      usedFallback: true,
      envelope,
    };
  }
}
