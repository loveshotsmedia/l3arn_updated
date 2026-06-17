import { type Request, type Response, type NextFunction } from "express";

const log = (level: string, msg: string, data?: object) =>
  console.log(JSON.stringify({ level, system: "mission-auth", msg, timestamp: new Date().toISOString(), ...data }));

/**
 * requireMissionAuth — gates POST /api/missions/compile before external testing.
 *
 * Approved auth methods (product decision 2026-06-17):
 *   1. Backend-issued child session token — future, Phase 1 (ADR-031)
 *   2. Valid parent Supabase JWT         — future, Phase 1
 *   3. Internal service token            — Authorization: Bearer <MISSION_SERVICE_TOKEN>
 *
 * Phase 0 / development (NODE_ENV !== "production"):
 *   Passes through with a warning log. Any call is allowed locally.
 *
 * Production:
 *   Enforces service token until full Supabase JWT/session auth is wired in Sprint 1.
 *   Return 503 if MISSION_SERVICE_TOKEN is not configured (fail-safe).
 *   Return 401 if no Authorization header.
 *   Return 403 if token is wrong.
 *
 * Replace MISSION_SERVICE_TOKEN check in Sprint 1 with Supabase JWT verification
 * so parent sessions and backend service calls both work natively.
 *
 * Grounded in:
 *   - ADR-031 (child-session-model)
 *   - services/ai-workers/.env.example (MISSION_SERVICE_TOKEN)
 */
export function requireMissionAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const isProduction = process.env.NODE_ENV === "production";
  const serviceToken = process.env.MISSION_SERVICE_TOKEN;

  if (!isProduction) {
    log("warn", "requireMissionAuth: unauthenticated request allowed in non-production environment", {
      path: req.path,
      reminder: "POST /api/missions/compile MUST be authenticated before staging/beta",
    });
    next();
    return;
  }

  // Production: fail-safe if token not configured
  if (!serviceToken) {
    log("critical", "requireMissionAuth: MISSION_SERVICE_TOKEN not set in production — endpoint cannot serve requests safely");
    res.status(503).json({ error: "Service not configured" });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authorization required" });
    return;
  }

  const token = authHeader.slice(7);
  if (token !== serviceToken) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  next();
}
