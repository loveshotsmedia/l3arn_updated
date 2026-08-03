/**
 * Child session token validation (shared, fail-closed).
 *
 * This is the single chokepoint that turns an opaque childSessionToken into a
 * verified child_sessions row. /api/sessions/verify, /api/student/session/house,
 * and /api/student/session/companion ALL route through here so token rules can
 * never drift between endpoints.
 *
 * Trust boundary (ADR-031, OQ-A8-001):
 *   - The token is the ONLY authority for a child session. localStorage is never
 *     trusted; the URL/query is never trusted as identity.
 *   - The token travels in `Authorization: Bearer <token>` (not the URL) so it
 *     does not leak into access logs, referrers, or browser history.
 *
 * Fail-closed: anything other than a live, unexpired, unrevoked, unended row is
 * a denial. A DB error denies (503, retryable) — it never grants.
 */

import type { Request, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";

/** The validated child_sessions row fields downstream handlers need. */
export interface ChildSessionRow {
  id: string;
  child_profile_id: string;
  academy_identity_id: string;
  expires_at: string;
  revoked_at: string | null;
  ended_at: string | null;
}

export type ValidateSessionResult =
  | { ok: true; session: ChildSessionRow }
  | { ok: false; status: number; error: string; message: string };

const log = (level: string, msg: string, data?: object) =>
  console.log(
    JSON.stringify({
      level,
      system: "child-session",
      msg,
      timestamp: new Date().toISOString(),
      ...data,
    }),
  );

/**
 * Extract a bearer token from the Authorization header.
 * Returns null if absent or malformed. (No token = denial upstream.)
 */
export function extractBearerToken(req: Request): string | null {
  const header = req.headers["authorization"];
  if (typeof header !== "string") return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return null;
  const token = match[1].trim();
  return token.length > 0 ? token : null;
}

/**
 * Validate an opaque session token against child_sessions.
 * Pure-ish: performs one read, returns a discriminated result. Never throws for
 * expected denial cases; a thrown/DB error is converted to a fail-closed 503.
 */
export async function validateSessionToken(
  supabase: SupabaseClient,
  token: string | null,
): Promise<ValidateSessionResult> {
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "SESSION_TOKEN_MISSING",
      message: "No session token was provided.",
    };
  }

  const { data, error } = await supabase
    .from("child_sessions")
    .select("id, child_profile_id, academy_identity_id, expires_at, revoked_at, ended_at")
    .eq("session_token", token)
    .maybeSingle();

  // DB error → fail closed (deny), but signal retryable so a transient blip
  // doesn't read as "invalid token forever".
  if (error) {
    log("error", "validateSessionToken: child_sessions lookup failed", {
      dbError: error.message,
    });
    return {
      ok: false,
      status: 503,
      error: "SESSION_LOOKUP_FAILED",
      message: "Could not verify the session right now. Please try again.",
    };
  }

  // Unknown token → invalid session.
  if (!data) {
    return {
      ok: false,
      status: 401,
      error: "SESSION_INVALID",
      message: "This session token is not valid.",
    };
  }

  const row = data as ChildSessionRow;

  if (row.revoked_at) {
    return {
      ok: false,
      status: 410,
      error: "SESSION_REVOKED",
      message: "This session has been ended by a parent.",
    };
  }

  if (row.ended_at) {
    return {
      ok: false,
      status: 410,
      error: "SESSION_ENDED",
      message: "This session has already ended.",
    };
  }

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return {
      ok: false,
      status: 410,
      error: "SESSION_EXPIRED",
      message: "This session has expired. Ask a parent to start a new one.",
    };
  }

  return { ok: true, session: row };
}

/**
 * Express convenience: pull the bearer token off the request, validate it, and
 * on failure write the structured error response and return null. On success
 * returns the verified session row. Handlers should `return` immediately when
 * this returns null.
 */
export async function requireChildSession(
  req: Request,
  res: Response,
  supabase: SupabaseClient,
): Promise<ChildSessionRow | null> {
  const token = extractBearerToken(req);
  const result = await validateSessionToken(supabase, token);

  if (!result.ok) {
    res.status(result.status).json({
      error: result.error,
      message: result.message,
    });
    return null;
  }

  return result.session;
}
