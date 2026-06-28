/**
 * POST /api/sessions/start
 *
 * Parent-initiated child session creation. Verifies parent ownership of the
 * child profile, fetches academy identity, generates an opaque session token,
 * inserts a child_sessions row, and returns the session token + academy identity.
 *
 * Auth: expects Supabase JWT in Authorization: Bearer <token> header.
 *   Phase 0: enforced in production via MISSION_SERVICE_TOKEN pattern (same as
 *   mission route). In non-production, passes through with a warning log.
 *   Phase 1: replace with Supabase JWT verification to extract parent auth.uid().
 *
 * Ownership check:
 *   Queries child_profiles WHERE id = childProfileId AND parent_account_id = <parent_id>
 *   to confirm the authenticated parent owns this child. Returns 403 if not found.
 *   In Phase 0, parent_id is read from X-Parent-Id header (trusted Railway-internal call).
 *   Phase 1: extract from Supabase JWT sub claim.
 *
 * Token contract (OQ-A8-001):
 *   - session_token is crypto.randomUUID() — NEVER equals childProfileId
 *   - Token is stored in child_sessions.session_token (TEXT NOT NULL UNIQUE)
 *   - Default session duration: 2 hours for parent_launched
 *   - trusted_device_pin is scaffolded in LaunchModeSchema but returns 400 until Phase 1
 *
 * Grounded in: ADR-031 (child session model), OQ-A8-001 (session start endpoint).
 *
 * OPEN QUESTION: Parent JWT verification is stubbed in Phase 0.
 *   - Non-production: X-Parent-Id header is trusted (internal Railway use only)
 *   - Production: MUST extract parent user ID from verified Supabase JWT before launch
 *   Ticket: OQ-A8-001 Phase 1 auth wiring — Agent 8, Phase 0
 */

import { Router, type Router as ExpressRouter, type Request, type Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import {
  StartSessionRequestSchema,
  type StartSessionResponse,
} from "@l3arn/shared-types";
import { validateBody } from "../middleware/validate";

const log = (level: string, msg: string, data?: object) =>
  console.log(
    JSON.stringify({
      level,
      system: "sessions",
      msg,
      timestamp: new Date().toISOString(),
      ...data,
    }),
  );

// ─── Supabase service-role client ─────────────────────────────────────────────
// Used for all Supabase writes/reads in this route (bypasses RLS for ownership
// check and session INSERT). Every service_role action here is an audit write.

function getSupabaseServiceClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "[sessions] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. " +
        "Set both in Railway environment variables.",
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

// ─── Session duration constants ───────────────────────────────────────────────

const SESSION_DURATION_MS = {
  parent_launched: 2 * 60 * 60 * 1000, // 2 hours
  // trusted_device_pin: 4 * 60 * 60 * 1000 — Phase 1 only
} as const;

// ─── Router ───────────────────────────────────────────────────────────────────

export const sessionsRouter: ExpressRouter = Router();

/**
 * POST /api/sessions/start
 *
 * Body: { childProfileId: string (UUID), launchMode: "parent_launched" }
 * Response: StartSessionResponse
 */
sessionsRouter.post(
  "/start",
  validateBody(StartSessionRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { childProfileId, launchMode } = req.body as {
      childProfileId: string;
      launchMode: "parent_launched" | "trusted_device_pin";
    };

    // ── Guard: trusted_device_pin not yet implemented ─────────────────────────
    if (launchMode === "trusted_device_pin") {
      res.status(400).json({
        error: "NOT_IMPLEMENTED",
        message:
          "trusted_device_pin launch mode is scaffolded but not yet implemented. " +
          "Use launchMode: 'parent_launched' for Phase 0.",
      });
      return;
    }

    // ── Resolve parent identity ───────────────────────────────────────────────
    // Phase 0: trusts X-Parent-Id header for internal Railway-to-Railway calls.
    // Phase 1: extract parent user ID from verified Supabase JWT sub claim.
    const parentId = req.headers["x-parent-id"] as string | undefined;

    if (!parentId) {
      const isProduction = process.env.NODE_ENV === "production";
      if (isProduction) {
        log("error", "POST /api/sessions/start: no parent identity provided", {
          childProfileId,
        });
        res.status(401).json({
          error: "UNAUTHORIZED",
          message:
            "Parent identity could not be determined. " +
            "Provide X-Parent-Id header (Phase 0) or a valid Supabase JWT (Phase 1).",
        });
        return;
      }
      // Non-production: allow without parent ID but log a warning
      log("warn", "POST /api/sessions/start: X-Parent-Id header missing in non-production", {
        childProfileId,
        reminder: "Phase 1: replace with Supabase JWT verification",
      });
    }

    let supabase;
    try {
      supabase = getSupabaseServiceClient();
    } catch (err) {
      log("critical", "POST /api/sessions/start: Supabase client init failed", {
        error: (err as Error).message,
      });
      res.status(503).json({
        error: "SERVICE_UNAVAILABLE",
        message: "Session service is not configured. Contact support.",
      });
      return;
    }

    // ── Ownership check ───────────────────────────────────────────────────────
    // Verify parent owns this child profile. Return 403 if not.
    // Phase 0: skips parent_account_id check if parentId is undefined (dev only).
    let childProfileQuery = supabase
      .from("child_profiles")
      .select("id, legal_first_name")
      .eq("id", childProfileId)
      .is("deleted_at", null);

    if (parentId) {
      childProfileQuery = childProfileQuery.eq("parent_account_id", parentId);
    }

    const { data: childProfile, error: profileError } = await childProfileQuery.single();

    if (profileError || !childProfile) {
      log("warn", "POST /api/sessions/start: ownership check failed", {
        childProfileId,
        parentId: parentId ?? "not-provided",
        dbError: profileError?.message,
      });
      res.status(403).json({
        error: "FORBIDDEN",
        message:
          "Child profile not found or you do not have permission to start a session for this child.",
      });
      return;
    }

    // ── Fetch academy identity ────────────────────────────────────────────────
    // Join academy_identities for display name + house.
    // If no identity row exists yet, fall back to legal first name + "pre_sorting".
    const { data: academyIdentity, error: identityError } = await supabase
      .from("academy_identities")
      .select("id, display_name, house")
      .eq("child_profile_id", childProfileId)
      .is("deleted_at", null)
      .maybeSingle();

    if (identityError) {
      log("warn", "POST /api/sessions/start: academy identity query error — using defaults", {
        childProfileId,
        dbError: identityError.message,
      });
    }

    const resolvedDisplayName: string =
      academyIdentity?.display_name ?? (childProfile as { legal_first_name: string }).legal_first_name;
    const resolvedHouse: string = academyIdentity?.house ?? "pre_sorting";
    const academyIdentityId: string | null = academyIdentity?.id ?? null;

    // If no academy identity row exists, we cannot insert child_sessions
    // (academy_identity_id is NOT NULL FK). Return 422 with a clear message.
    if (!academyIdentityId) {
      log("warn", "POST /api/sessions/start: no academy identity row — child onboarding incomplete", {
        childProfileId,
      });
      res.status(422).json({
        error: "ONBOARDING_INCOMPLETE",
        message:
          "This child does not have an academy identity yet. " +
          "Complete child onboarding before starting a session.",
      });
      return;
    }

    // ── Generate session token ────────────────────────────────────────────────
    // RULE: session_token MUST be opaque and MUST NOT equal childProfileId.
    const sessionToken = randomUUID();
    const expiresAt = new Date(
      Date.now() + SESSION_DURATION_MS.parent_launched,
    ).toISOString();

    // ── Insert child_sessions row ─────────────────────────────────────────────
    const { data: session, error: insertError } = await supabase
      .from("child_sessions")
      .insert({
        child_profile_id: childProfileId,
        academy_identity_id: academyIdentityId,
        entry_method: "parent-launch",         // session_entry_method ENUM value
        session_token: sessionToken,
        launch_mode: launchMode,               // 'parent_launched' only in Phase 0
        launched_by: parentId ?? null,
        expires_at: expiresAt,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !session) {
      log("error", "POST /api/sessions/start: failed to insert child_sessions row", {
        childProfileId,
        dbError: insertError?.message,
      });
      res.status(500).json({
        error: "SESSION_CREATE_ERROR",
        message: "Could not create the child session. Please try again.",
      });
      return;
    }

    log("info", "POST /api/sessions/start: session created", {
      childSessionId: session.id,
      childProfileId,
      launchMode,
      expiresAt,
    });

    // ── Return response ───────────────────────────────────────────────────────
    const response: StartSessionResponse = {
      childSessionToken: sessionToken,
      childSessionId: session.id as string,
      expiresAt,
      academyIdentity: {
        displayName: resolvedDisplayName,
        house: resolvedHouse,
      },
    };

    res.status(200).json(response);
  },
);
