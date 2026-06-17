/**
 * POST /api/missions/compile
 *
 * Validates the request body, builds the three-part MissionCompilerInput,
 * calls MissionCompiler.compile(), and returns an AIOutputEnvelope-wrapped response.
 *
 * Phase 0: parent intent and child personalization come from the request body
 * (mock data). Phase 1 will replace this with DB lookups (child profile,
 * parent config, learner prefs) via Supabase.
 *
 * On fallback:
 *   - Sets notificationLevel in the envelope result
 *   - Logs a warning (notification mechanism is TBD — see ADR-054 open question)
 *   - TODO: ADR-054 — fire parent notification once delivery mechanism is confirmed
 *
 * Grounded in:
 *   - ADR-054 (AI output validation / retry / fallback)
 *   - ADR-028 (AI output audit envelope)
 *   - ADR-014 (three-part mission constraint)
 *   - ai.schema.ts (AIOutputEnvelopeSchema from @l3arn/shared-types)
 *
 * OPEN QUESTION: The request body currently requires the full three-part constraint
 * inline. In Phase 1, only `childProfileId` and `parentConfigId` should be required —
 * the compiler will load the rest from Supabase. — Agent 6, Phase 0
 *
 * OPEN QUESTION: Authentication is not enforced on this route in Phase 0.
 * Before this service is exposed in production, all routes must require a
 * valid Railway-internal service token or Supabase JWT. — Agent 6, Phase 0
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  MissionCompiler,
  MissionCompilerInput,
} from "@l3arn/mission-compiler";
import { validateBody } from "../middleware/validate";

// ─── Request Body Schema ──────────────────────────────────────────────────────

const MissionCompileRequestSchema = z.object({
  /** The child's profile ID (UUID). Required for audit envelope. */
  childProfileId: z.string().uuid({ message: "childProfileId must be a valid UUID" }),

  /** Optional child session ID (UUID). Used in audit envelope when available. */
  childSessionId: z.string().uuid().optional(),

  /**
   * Dimension 1: Parent intent.
   * Phase 0: supplied inline. Phase 1: loaded from DB via parentConfigId.
   */
  parentIntent: z.object({
    curriculumGoals: z.array(z.string()).default([]),
    gradeLevel: z.string().min(1),
    blockedTopics: z.array(z.string()).default([]),
    subjectFocus: z.array(z.string()).default([]),
  }),

  /**
   * Dimension 2: Child personalization.
   * Phase 0: supplied inline. Phase 1: loaded from learner profile in DB.
   */
  childPersonalization: z.object({
    displayName: z.string().min(1).max(32),
    houseAffiliation: z.enum(["Valkryn", "Lyrion", "Novari", "Cytrex"]),
    companionPersonality: z.string().min(1),
    learningPrefs: z.array(z.string()).default([]),
    audioEnabled: z.boolean().optional(),
  }),

  /**
   * Dimension 3: Mastery targets.
   * Phase 0: supplied inline. Phase 1: loaded from curriculum spine in DB.
   */
  masteryTargets: z.object({
    standardIds: z.array(z.string()).default(["L3ARN-SORT-001"]),
    targetSkills: z.array(z.string()).default([
      "Sort by one attribute",
      "Explain sorting logic",
    ]),
  }),
});

type MissionCompileRequest = z.infer<typeof MissionCompileRequestSchema>;

// ─── Router ───────────────────────────────────────────────────────────────────

export const missionRouter = Router();

/**
 * POST /api/missions/compile
 *
 * Compile a mission from the three-part constraint.
 * Returns an AIOutputEnvelope-structured response.
 */
missionRouter.post(
  "/compile",
  validateBody(MissionCompileRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as MissionCompileRequest;

    const input: MissionCompilerInput = {
      childProfileId: body.childProfileId,
      childSessionId: body.childSessionId,
      parentIntent: body.parentIntent,
      childPersonalization: body.childPersonalization,
      masteryTargets: body.masteryTargets,
    };

    const compiler = new MissionCompiler();

    let output;
    try {
      output = await compiler.compile(input);
    } catch (err) {
      // Unexpected error — not a retry/fallback failure (those are handled inside compile()).
      // Log and return 500. Do not expose internal error details to the caller.
      console.error(
        `[mission.route] Unexpected error compiling mission for childProfileId=${body.childProfileId}:`,
        err,
      );
      res.status(500).json({
        error: "MISSION_COMPILE_ERROR",
        message:
          "Mission compilation failed unexpectedly. Please try again or contact support.",
      });
      return;
    }

    // If fallback was used, log warning.
    // TODO: ADR-054 — fire parent notification once delivery mechanism is confirmed
    // (email, in-app alert, or both). Notification level: output.envelope.result.notificationLevel
    // Mechanism is TBD per ADR-054 open question. — Agent 6, Phase 0
    if (output.usedFallback) {
      const notificationLevel =
        output.envelope.result.status === "failed-with-fallback"
          ? output.envelope.result.notificationLevel
          : "none";

      console.warn(
        `[mission.route] Fallback used. childProfileId=${body.childProfileId} ` +
          `notificationLevel=${notificationLevel} ` +
          `fallbackId=${
            output.envelope.result.status === "failed-with-fallback"
              ? output.envelope.result.fallbackId
              : "n/a"
          } ` +
          `traceId=${output.envelope.traceId}`,
      );
    }

    // Return the full compiler output wrapped with the audit envelope.
    // The envelope.result.status discriminated union tells the consumer
    // whether the data is AI-generated ("validated") or a safe fallback
    // ("failed-with-fallback").
    res.status(200).json({
      envelope: output.envelope,
      missionData: output.missionData,
      parentPlan: output.parentPlan,
      evidenceRequirements: output.evidenceRequirements,
      rewardRules: output.rewardRules,
      parentReportSeed: output.parentReportSeed,
      calibrationSignals: output.calibrationSignals,
      usedFallback: output.usedFallback,
    });
  },
);
