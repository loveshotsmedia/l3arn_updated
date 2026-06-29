/**
 * Calibration routes — child-session-authenticated learner calibration pipeline.
 *
 * Mounted at /api/student/calibration.
 *   POST /snapshot — compute + persist a calibration confidence snapshot
 *
 * Auth: Authorization: Bearer <childSessionToken> (shared fail-closed chokepoint).
 *
 * When to call this endpoint:
 *   - After House Calling ceremony completes (sorting-ceremony stage signal)
 *   - After Mission 001 completes (mission-001 stage signal)
 *   The frontend calls updateCalibration() from apps/web/src/lib/student-session.ts.
 *
 * The endpoint is best-effort: it always returns a result rather than failing
 * the calling flow. Callers should treat errors as non-fatal.
 *
 * Grounded in: architecture.md §9 (Learner Calibration Model),
 *   ADR-031 (child session auth), Migration 011 (calibration_snapshots table).
 */

import { Router, type Router as ExpressRouter, type Request, type Response } from "express";
import { getSupabaseServiceClient } from "../lib/supabase";
import { requireChildSession } from "../lib/child-session";
import { computeCalibrationSnapshot } from "../lib/calibration-engine";

const log = (level: string, msg: string, data?: object) =>
  console.log(
    JSON.stringify({
      level,
      system: "calibration-route",
      msg,
      timestamp: new Date().toISOString(),
      ...data,
    }),
  );

export const calibrationRouter: ExpressRouter = Router();

function serviceClientOr503(res: Response) {
  try {
    return getSupabaseServiceClient();
  } catch (err) {
    log("critical", "Supabase client init failed", { error: (err as Error).message });
    res.status(503).json({
      error: "SERVICE_UNAVAILABLE",
      message: "Calibration service is not configured.",
    });
    return null;
  }
}

/**
 * POST /api/student/calibration/snapshot
 *
 * Computes a learner calibration confidence snapshot from available signals
 * (house_calling_signals + learning_evidence_events) and persists it to
 * calibration_snapshots.
 *
 * Returns: { stage, confidenceScore, signalSources }
 *
 * Best-effort: computation errors result in an onboarding-stage snapshot
 * rather than a 500. Insert errors are logged but do not fail the response.
 */
calibrationRouter.post(
  "/snapshot",
  async (req: Request, res: Response): Promise<void> => {
    const supabase = serviceClientOr503(res);
    if (!supabase) return;

    const session = await requireChildSession(req, res, supabase);
    if (!session) return;

    log("info", "POST /snapshot: computing calibration snapshot", {
      childProfileId: session.child_profile_id,
      academyIdentityId: session.academy_identity_id,
    });

    // Compute snapshot from available signals (non-throwing)
    const snapshot = await computeCalibrationSnapshot(
      supabase,
      session.child_profile_id,
      session.academy_identity_id,
    );

    // Persist the snapshot to calibration_snapshots.
    // Non-fatal: a DB insert failure should not block the student's session.
    try {
      const { error: insertError } = await supabase
        .from("calibration_snapshots")
        .insert({
          child_profile_id: session.child_profile_id,
          academy_identity_id: session.academy_identity_id,
          confidence_score: snapshot.confidenceScore,
          calibration_stage: snapshot.stage,
          signal_sources: snapshot.signalSources,
          trait_profile: snapshot.traitProfile,
          calibration_signals: snapshot.calibrationSignals,
          computed_at: new Date().toISOString(),
        });

      if (insertError) {
        log("warn", "POST /snapshot: calibration_snapshots insert failed (non-fatal)", {
          childProfileId: session.child_profile_id,
          dbError: insertError.message,
        });
      } else {
        log("info", "POST /snapshot: calibration snapshot persisted", {
          childProfileId: session.child_profile_id,
          stage: snapshot.stage,
          confidenceScore: snapshot.confidenceScore,
        });
      }
    } catch (err) {
      log("warn", "POST /snapshot: unexpected error persisting snapshot (non-fatal)", {
        childProfileId: session.child_profile_id,
        error: (err as Error).message,
      });
    }

    // Always return the computed snapshot, even if the insert failed.
    res.status(200).json({
      stage: snapshot.stage,
      confidenceScore: snapshot.confidenceScore,
      signalSources: snapshot.signalSources,
    });
  },
);
