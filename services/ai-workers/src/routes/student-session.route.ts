/**
 * Student session routes — backend-mediated writes for the child entry flow.
 *
 * Mounted at /api/student/session.
 *   POST /house     — persist the Sorting Ceremony result (academy_identities.house)
 *   POST /companion — persist the chosen companion (companion_profiles)
 *
 * Auth: every route requires Authorization: Bearer <childSessionToken> and is
 * validated through the shared fail-closed chokepoint (requireChildSession).
 * The frontend NEVER writes these tables directly — service_role only (ADR-031).
 *
 * Grounded in: ADR-007 (academy identity), ADR-011 (companion), ADR-031
 * (child session model), Hero Slice Integration (Agent 2).
 */

import { Router, type Router as ExpressRouter, type Request, type Response } from "express";
import {
  SetHouseRequestSchema,
  type SetHouseResponse,
  SelectCompanionRequestSchema,
  type SelectCompanionResponse,
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
