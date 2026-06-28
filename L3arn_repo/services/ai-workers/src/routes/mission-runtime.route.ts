/**
 * Mission runtime routes — child-session-authenticated Mission 001 flow.
 *
 * Mounted at /api/student/mission.
 *   POST /start    — compile Mission 001 (validated/fallback) + create attempt
 *   POST /complete — record completion + run reward/evidence/mastery/report pipeline
 *
 * Auth: Authorization: Bearer <childSessionToken> (shared fail-closed chokepoint).
 *
 * Grounded in: ADR-031 (child session), ADR-054 (validated AI / fallback),
 * Hero Slice Integration (Agents 3/4/5).
 */

import { Router, type Router as ExpressRouter, type Request, type Response } from "express";
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
