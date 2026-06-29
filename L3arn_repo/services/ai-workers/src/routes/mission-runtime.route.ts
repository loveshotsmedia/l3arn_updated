/**
 * Mission runtime routes — child-session-authenticated Mission 001 flow.
 *
 * Mounted at /api/student/mission.
 *   POST /start    — compile Mission 001 (validated/fallback) + create attempt
 *   POST /complete — record completion + run reward/evidence/mastery/report pipeline
 *   POST /evidence — capture an in-mission evidence event (per-task interaction)
 *
 * Auth: Authorization: Bearer <childSessionToken> (shared fail-closed chokepoint).
 *
 * Grounded in: ADR-031 (child session), ADR-054 (validated AI / fallback),
 * ADR-026 (evidence capture: structured learning events, no webcam/face/biometrics),
 * Hero Slice Integration (Agents 3/4/5/14).
 */

import { Router, type Router as ExpressRouter, type Request, type Response } from "express";
import { z } from "zod";
import {
  StartMissionRequestSchema,
  CompleteMissionRequestSchema,
} from "@l3arn/shared-types";
import { validateBody } from "../middleware/validate";
import { getSupabaseServiceClient } from "../lib/supabase";
import { requireChildSession } from "../lib/child-session";
import { startMission, completeMission, MissionRuntimeError } from "../missions/mission-runtime";

const log = (level: string, msg: string, data?: object) =>
  console.log(
    JSON.stringify({ level, system: "mission-runtime-route", msg, timestamp: new Date().toISOString(), ...data }),
  );

export const studentMissionRouter: ExpressRouter = Router();

function serviceClientOr503(res: Response) {
  try {
    return getSupabaseServiceClient();
  } catch (err) {
    log("critical", "Supabase client init failed", { error: (err as Error).message });
    res.status(503).json({ error: "SERVICE_UNAVAILABLE", message: "Mission service is not configured." });
    return null;
  }
}

/** POST /api/student/mission/start */
studentMissionRouter.post(
  "/start",
  validateBody(StartMissionRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { missionId } = req.body as { missionId: string };
    const supabase = serviceClientOr503(res);
    if (!supabase) return;

    const session = await requireChildSession(req, res, supabase);
    if (!session) return;

    try {
      const result = await startMission(supabase, session, missionId);
      res.status(200).json(result);
    } catch (err) {
      if (err instanceof MissionRuntimeError) {
        res.status(err.status).json({ error: err.code, message: err.message });
        return;
      }
      log("error", "POST /start: unexpected error", {
        childSessionId: session.id,
        error: (err as Error).message,
      });
      res.status(500).json({
        error: "MISSION_START_ERROR",
        message: "Mission could not be started. Please try again.",
      });
    }
  },
);

/** POST /api/student/mission/complete */
studentMissionRouter.post(
  "/complete",
  validateBody(CompleteMissionRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as {
      missionAttemptId: string;
      completedAllTasks: boolean;
      masteryThresholdMet: boolean;
      masteryEvidenceScore?: number;
    };
    const supabase = serviceClientOr503(res);
    if (!supabase) return;

    const session = await requireChildSession(req, res, supabase);
    if (!session) return;

    try {
      const result = await completeMission(supabase, session, body);
      res.status(200).json(result);
    } catch (err) {
      if (err instanceof MissionRuntimeError) {
        res.status(err.status).json({ error: err.code, message: err.message });
        return;
      }
      log("error", "POST /complete: unexpected error", {
        childSessionId: session.id,
        error: (err as Error).message,
      });
      res.status(500).json({
        error: "MISSION_COMPLETE_ERROR",
        message: "Mission completion could not be recorded. Please try again.",
      });
    }
  },
);

// ─── Evidence capture ─────────────────────────────────────────────────────────

const EvidenceCaptureRequestSchema = z.object({
  missionAttemptId: z.string().uuid(),
  taskId: z.string().min(1).max(100),
  evidenceCaptureType: z.enum([
    "decision-log",
    "sequence-completion",
    "ai-mistake-check",
    "explanation",
    "reflection",
    "structured-replay",
    "artifact-upload",
    "audio-response",
    "screenshot",
  ]),
  contentJson: z.record(z.unknown()).optional().default({}),
});

type EvidenceCaptureRequest = z.infer<typeof EvidenceCaptureRequestSchema>;

/** POST /api/student/mission/evidence */
studentMissionRouter.post(
  "/evidence",
  validateBody(EvidenceCaptureRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as EvidenceCaptureRequest;
    const supabase = serviceClientOr503(res);
    if (!supabase) return;

    const session = await requireChildSession(req, res, supabase);
    if (!session) return;

    // Verify the missionAttemptId belongs to this child.
    const { data: attempt, error: attemptError } = await supabase
      .from("mission_attempts")
      .select("id, child_profile_id")
      .eq("id", body.missionAttemptId)
      .eq("child_profile_id", session.child_profile_id)
      .maybeSingle();

    if (attemptError) {
      log("error", "POST /evidence: mission_attempts lookup failed", {
        childSessionId: session.id,
        missionAttemptId: body.missionAttemptId,
        dbError: attemptError.message,
      });
      res.status(503).json({
        error: "EVIDENCE_LOOKUP_FAILED",
        message: "Could not verify mission attempt. Please try again.",
      });
      return;
    }

    if (!attempt) {
      log("warn", "POST /evidence: attempt not found or not owned by child", {
        childSessionId: session.id,
        childProfileId: session.child_profile_id,
        missionAttemptId: body.missionAttemptId,
      });
      res.status(403).json({
        error: "ATTEMPT_NOT_OWNED",
        message: "This mission attempt does not belong to your session.",
      });
      return;
    }

    // Insert the evidence event. Privacy invariants (no_webcam, no_face_capture,
    // no_voice_biometrics) are enforced by CHECK constraints at the DB level;
    // we pass true explicitly to be unambiguous.
    const { data: inserted, error: insertError } = await supabase
      .from("learning_evidence_events")
      .insert({
        child_profile_id: session.child_profile_id,
        mission_attempt_id: body.missionAttemptId,
        event_type: body.evidenceCaptureType,
        content_json: body.contentJson ?? {},
        no_webcam: true,
        no_face_capture: true,
        no_voice_biometrics: true,
        captured_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      log("error", "POST /evidence: insert into learning_evidence_events failed", {
        childSessionId: session.id,
        childProfileId: session.child_profile_id,
        missionAttemptId: body.missionAttemptId,
        taskId: body.taskId,
        evidenceCaptureType: body.evidenceCaptureType,
        dbError: insertError?.message ?? "no row returned",
      });
      res.status(500).json({
        error: "EVIDENCE_INSERT_FAILED",
        message: "Evidence could not be recorded. Please try again.",
      });
      return;
    }

    log("info", "POST /evidence: evidence event captured", {
      childSessionId: session.id,
      childProfileId: session.child_profile_id,
      missionAttemptId: body.missionAttemptId,
      taskId: body.taskId,
      evidenceCaptureType: body.evidenceCaptureType,
      evidenceId: inserted.id,
    });

    res.status(200).json({ ok: true, evidenceId: inserted.id });
  },
);
