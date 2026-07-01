/**
 * Student session routes — backend-mediated writes for the child entry flow.
 *
 * Mounted at /api/student/session.
 *   POST /house                 — persist the House Calling result (academy_identities.house)
 *   POST /companion             — persist the chosen companion (companion_profiles)
 *   POST /calibration-signals   — persist House Calling trial trait scores (house_calling_signals)
 *   GET  /holdings              — read all unlocked mastery-gated buildings (world_holdings)
 *   POST /holdings              — unlock a mastery-gated building (world_holdings)
 *
 * Auth: every route requires Authorization: Bearer <childSessionToken> and is
 * validated through the shared fail-closed chokepoint (requireChildSession).
 * The frontend NEVER writes these tables directly — service_role only (ADR-031).
 *
 * Grounded in: ADR-007 (academy identity), ADR-011 (companion), ADR-031
 * (child session model), Hero Slice Integration (Agent 2), House Calling Ceremony (Agent 15).
 */

import { Router, type Router as ExpressRouter, type Request, type Response } from "express";
import { z } from "zod";
import {
  SetHouseRequestSchema,
  type SetHouseResponse,
  SelectCompanionRequestSchema,
  type SelectCompanionResponse,
  UnlockHoldingRequestSchema,
  type UnlockHoldingResponse,
  type GetHoldingsResponse,
} from "@l3arn/shared-types";
import { validateBody } from "../middleware/validate";
import { getSupabaseServiceClient } from "../lib/supabase";
import { requireChildSession } from "../lib/child-session";

const log = (level: string, msg: string, data?: object) =>
  console.log(
    JSON.stringify({
      level,
      system: "student-session",
      msg,
      timestamp: new Date().toISOString(),
      ...data,
    }),
  );

export const studentSessionRouter: ExpressRouter = Router();

/**
 * POST /api/student/session/house
 *
 * Body: { house: "Valkryn" | "Lyrion" | "Novari" | "Cytrex" }
 * Writes academy_identities.house for the session's identity. NEVER child_profiles.
 */
studentSessionRouter.post(
  "/house",
  validateBody(SetHouseRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { house } = req.body as { house: string };

    let supabase;
    try {
      supabase = getSupabaseServiceClient();
    } catch (err) {
      log("critical", "POST /house: Supabase client init failed", {
        error: (err as Error).message,
      });
      res.status(503).json({
        error: "SERVICE_UNAVAILABLE",
        message: "Session service is not configured. Contact support.",
      });
      return;
    }

    const session = await requireChildSession(req, res, supabase);
    if (!session) return;

    // Write the house onto the academy identity (the public identity row).
    const { data: updated, error: updateError } = await supabase
      .from("academy_identities")
      .update({ house })
      .eq("id", session.academy_identity_id)
      .select("display_name, house")
      .single();

    if (updateError || !updated) {
      log("error", "POST /house: failed to update academy_identities.house", {
        childSessionId: session.id,
        academyIdentityId: session.academy_identity_id,
        dbError: updateError?.message,
      });
      res.status(500).json({
        error: "HOUSE_WRITE_ERROR",
        message: "Could not save your house. Please try again.",
      });
      return;
    }

    // Best-effort: mark the Sorting Ceremony complete. Non-fatal if it fails —
    // the authoritative result (house) is already persisted.
    const { error: sortingError } = await supabase
      .from("child_profiles")
      .update({ sorting_complete: true })
      .eq("id", session.child_profile_id);

    if (sortingError) {
      log("warn", "POST /house: house saved but sorting_complete flag not set", {
        childProfileId: session.child_profile_id,
        dbError: sortingError.message,
      });
    }

    const identity = updated as { display_name: string; house: string };

    log("info", "POST /house: house persisted", {
      childSessionId: session.id,
      house: identity.house,
    });

    const response: SetHouseResponse = {
      success: true,
      academyIdentity: {
        displayName: identity.display_name,
        house: identity.house,
      },
    };

    res.status(200).json(response);
  },
);

/**
 * POST /api/student/session/companion
 *
 * Body: { companionKey, characterName, characterStyle?, teachingTone?, templateId? }
 * Upserts companion_profiles (one active companion per child). bond_level and
 * version are intentionally NOT in the payload so re-selecting a companion never
 * clobbers accumulated bond.
 */
studentSessionRouter.post(
  "/companion",
  validateBody(SelectCompanionRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { companionKey, characterName, characterStyle, teachingTone, templateId } =
      req.body as {
        companionKey: string;
        characterName: string;
        characterStyle?: string;
        teachingTone?: string;
        templateId?: string;
      };

    let supabase;
    try {
      supabase = getSupabaseServiceClient();
    } catch (err) {
      log("critical", "POST /companion: Supabase client init failed", {
        error: (err as Error).message,
      });
      res.status(503).json({
        error: "SERVICE_UNAVAILABLE",
        message: "Session service is not configured. Contact support.",
      });
      return;
    }

    const session = await requireChildSession(req, res, supabase);
    if (!session) return;

    const { data: companion, error: upsertError } = await supabase
      .from("companion_profiles")
      .upsert(
        {
          child_profile_id: session.child_profile_id,
          companion_key: companionKey,
          character_name: characterName,
          character_style: characterStyle ?? null,
          teaching_tone: teachingTone ?? null,
          template_id: templateId ?? null,
          is_active: true,
          selected_at: new Date().toISOString(),
        },
        { onConflict: "child_profile_id" },
      )
      .select("companion_key, character_name, bond_level, is_active")
      .single();

    if (upsertError || !companion) {
      log("error", "POST /companion: failed to upsert companion_profiles", {
        childSessionId: session.id,
        childProfileId: session.child_profile_id,
        dbError: upsertError?.message,
      });
      res.status(500).json({
        error: "COMPANION_WRITE_ERROR",
        message: "Could not save your companion. Please try again.",
      });
      return;
    }

    const row = companion as {
      companion_key: string;
      character_name: string;
      bond_level: number;
      is_active: boolean;
    };

    log("info", "POST /companion: companion persisted", {
      childSessionId: session.id,
      companionKey: row.companion_key,
    });

    const response: SelectCompanionResponse = {
      success: true,
      companion: {
        companionKey: row.companion_key,
        characterName: row.character_name,
        bondLevel: row.bond_level,
        isActive: row.is_active,
      },
    };

    res.status(200).json(response);
  },
);

// ── Calibration signal schema ─────────────────────────────────────────────────

const TraitScoresSchema = z.object({
  curiosity: z.number().int().min(0),
  courage: z.number().int().min(0),
  creativity: z.number().int().min(0),
  leadership: z.number().int().min(0),
  collaboration: z.number().int().min(0),
  resilience: z.number().int().min(0),
  independence: z.number().int().min(0),
});

const CalibrationSignalsRequestSchema = z.object({
  traitScores: TraitScoresSchema,
  recommendedHouse: z.enum(["Valkryn", "Lyrion", "Novari", "Cytrex"]),
  selectedHouse: z.enum(["Valkryn", "Lyrion", "Novari", "Cytrex"]),
  overrideUsed: z.boolean(),
});

/**
 * POST /api/student/session/calibration-signals
 *
 * Body: { traitScores, recommendedHouse, selectedHouse, overrideUsed }
 * Stores House Calling Trial results to house_calling_signals.
 * Also upserts house_memberships with ceremony_signal_summary.
 * Best-effort: a failure here MUST NOT block house acceptance.
 */
studentSessionRouter.post(
  "/calibration-signals",
  validateBody(CalibrationSignalsRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { traitScores, recommendedHouse, selectedHouse, overrideUsed } = req.body as {
      traitScores: {
        curiosity: number;
        courage: number;
        creativity: number;
        leadership: number;
        collaboration: number;
        resilience: number;
        independence: number;
      };
      recommendedHouse: string;
      selectedHouse: string;
      overrideUsed: boolean;
    };

    let supabase;
    try {
      supabase = getSupabaseServiceClient();
    } catch (err) {
      log("critical", "POST /calibration-signals: Supabase client init failed", {
        error: (err as Error).message,
      });
      res.status(503).json({
        error: "SERVICE_UNAVAILABLE",
        message: "Session service is not configured. Contact support.",
      });
      return;
    }

    const session = await requireChildSession(req, res, supabase);
    if (!session) return;

    // Insert into house_calling_signals (migration 010)
    const { error: signalError } = await supabase.from("house_calling_signals").insert({
      child_profile_id: session.child_profile_id,
      academy_identity_id: session.academy_identity_id,
      trait_scores: traitScores,
      recommended_house: recommendedHouse,
      selected_house: selectedHouse,
      override_used: overrideUsed,
    });

    if (signalError) {
      log("error", "POST /calibration-signals: failed to insert house_calling_signals", {
        childSessionId: session.id,
        dbError: signalError.message,
      });
      // Best-effort: do not fail the request — house was already accepted
    }

    // Upsert house_memberships — pull household_id from child_profiles
    const { data: profileRow } = await supabase
      .from("child_profiles")
      .select("household_id")
      .eq("id", session.child_profile_id)
      .single();

    const householdId = (profileRow as { household_id: string } | null)?.household_id ?? null;

    if (householdId) {
      // Retry guard: if the child already has an active accepted membership, skip the
      // upsert entirely. The house_memberships row is effectively append-once after
      // child_accepted_at is set — re-running the ceremony must not overwrite it.
      const { data: existingMembership } = await supabase
        .from("house_memberships")
        .select("id, membership_status, child_accepted_at")
        .eq("child_profile_id", session.child_profile_id)
        .eq("membership_status", "active")
        .not("child_accepted_at", "is", null)
        .limit(1)
        .maybeSingle();

      if (existingMembership) {
        log("warn", "POST /calibration-signals: membership already accepted, skipping upsert", {
          childProfileId: session.child_profile_id,
          existingMembershipId: (existingMembership as { id: string }).id,
        });
      } else {
        const { error: membershipError } = await supabase.from("house_memberships").upsert(
          {
            child_profile_id: session.child_profile_id,
            household_id: householdId,
            academy_identity_id: session.academy_identity_id,
            recommended_house: recommendedHouse,
            selected_house: selectedHouse,
            override_used: overrideUsed,
            assignment_method: "house_calling",
            child_accepted_at: new Date().toISOString(),
            ceremony_signal_summary: traitScores,
          },
          { onConflict: "child_profile_id" },
        );

        if (membershipError) {
          log("warn", "POST /calibration-signals: house_memberships upsert failed (non-fatal)", {
            childSessionId: session.id,
            dbError: membershipError.message,
          });
        }
      }
    } else {
      log("warn", "POST /calibration-signals: could not resolve household_id for membership upsert", {
        childProfileId: session.child_profile_id,
      });
    }

    log("info", "POST /calibration-signals: signals recorded", {
      childSessionId: session.id,
      selectedHouse,
      overrideUsed,
    });

    res.status(200).json({ ok: true });
  },
);

/**
 * GET /api/student/session/holdings
 *
 * Returns every holding the current child has unlocked. Used to hydrate the
 * 3D world's MasteryBuilding components on load.
 */
studentSessionRouter.get(
  "/holdings",
  async (req: Request, res: Response): Promise<void> => {
    let supabase;
    try {
      supabase = getSupabaseServiceClient();
    } catch (err) {
      log("critical", "GET /holdings: Supabase client init failed", {
        error: (err as Error).message,
      });
      res.status(503).json({
        error: "SERVICE_UNAVAILABLE",
        message: "Session service is not configured. Contact support.",
      });
      return;
    }

    const session = await requireChildSession(req, res, supabase);
    if (!session) return;

    const { data, error } = await supabase
      .from("world_holdings")
      .select("holding_id, unlocked_by_mission_id, unlocked_at")
      .eq("child_profile_id", session.child_profile_id);

    if (error) {
      log("error", "GET /holdings: failed to read world_holdings", {
        childProfileId: session.child_profile_id,
        dbError: error.message,
      });
      res.status(500).json({ error: "HOLDINGS_READ_ERROR", message: "Could not load your Academy." });
      return;
    }

    const rows = (data ?? []) as Array<{
      holding_id: string;
      unlocked_by_mission_id: string;
      unlocked_at: string;
    }>;

    const response: GetHoldingsResponse = {
      holdings: rows.map((row) => ({
        holdingId: row.holding_id,
        unlockedByMissionId: row.unlocked_by_mission_id,
        unlockedAt: row.unlocked_at,
      })),
    };

    res.status(200).json(response);
  },
);

/**
 * POST /api/student/session/holdings
 *
 * Body: { holdingId, unlockedByMissionId }
 * Idempotent — re-unlocking an already-unlocked holding is a no-op success
 * (the unique constraint on (child_profile_id, holding_id) enforces this).
 */
studentSessionRouter.post(
  "/holdings",
  validateBody(UnlockHoldingRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { holdingId, unlockedByMissionId } = req.body as {
      holdingId: string;
      unlockedByMissionId: string;
    };

    let supabase;
    try {
      supabase = getSupabaseServiceClient();
    } catch (err) {
      log("critical", "POST /holdings: Supabase client init failed", {
        error: (err as Error).message,
      });
      res.status(503).json({
        error: "SERVICE_UNAVAILABLE",
        message: "Session service is not configured. Contact support.",
      });
      return;
    }

    const session = await requireChildSession(req, res, supabase);
    if (!session) return;

    // ignoreDuplicates maps to INSERT ... ON CONFLICT DO NOTHING — when the
    // conflict path is taken (already unlocked), Postgres returns zero rows.
    // Don't chain .select().single() onto the upsert itself (that would turn
    // the idempotent no-op into a false PGRST116 error, same reason the
    // child_badges upsert in mission-runtime.ts only checks { error }). Instead,
    // upsert first, then read back the row separately — it's guaranteed to
    // exist afterward whether this call inserted it or it already existed.
    const { error: upsertError } = await supabase.from("world_holdings").upsert(
      {
        child_profile_id: session.child_profile_id,
        holding_id: holdingId,
        unlocked_by_mission_id: unlockedByMissionId,
      },
      { onConflict: "child_profile_id,holding_id", ignoreDuplicates: true },
    );

    if (upsertError) {
      log("error", "POST /holdings: failed to upsert world_holdings", {
        childProfileId: session.child_profile_id,
        holdingId,
        dbError: upsertError.message,
      });
      res.status(500).json({ error: "HOLDING_WRITE_ERROR", message: "Could not save your progress." });
      return;
    }

    const { data: holding, error: readError } = await supabase
      .from("world_holdings")
      .select("holding_id, unlocked_by_mission_id, unlocked_at")
      .eq("child_profile_id", session.child_profile_id)
      .eq("holding_id", holdingId)
      .single();

    if (readError || !holding) {
      log("error", "POST /holdings: upsert succeeded but read-back failed", {
        childProfileId: session.child_profile_id,
        holdingId,
        dbError: readError?.message,
      });
      res.status(500).json({ error: "HOLDING_WRITE_ERROR", message: "Could not save your progress." });
      return;
    }

    const row = holding as { holding_id: string; unlocked_by_mission_id: string; unlocked_at: string };

    log("info", "POST /holdings: holding unlocked", {
      childSessionId: session.id,
      holdingId: row.holding_id,
    });

    const response: UnlockHoldingResponse = {
      success: true,
      holding: {
        holdingId: row.holding_id,
        unlockedByMissionId: row.unlocked_by_mission_id,
        unlockedAt: row.unlocked_at,
      },
    };

    res.status(200).json(response);
  },
);
