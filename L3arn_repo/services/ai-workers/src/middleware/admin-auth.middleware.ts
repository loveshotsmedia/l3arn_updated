/**
 * Admin Auth Middleware
 *
 * Guards internal-only endpoints that must never be publicly accessible.
 * Requires Authorization: Bearer <SAFETY_ADMIN_TOKEN>.
 *
 * SAFETY_ADMIN_TOKEN must be set in Railway environment variables for all
 * non-local environments. In local dev, a warning is logged if absent.
 *
 * Grounded in: ADR-048, ADR-049 (provisional admin access model).
 */

import { type Request, type Response, type NextFunction } from "express";

const SAFETY_ADMIN_TOKEN = process.env.SAFETY_ADMIN_TOKEN;

if (!SAFETY_ADMIN_TOKEN) {
  if (process.env.NODE_ENV === "production") {
    console.error(
      "[AdminAuth] CRITICAL: SAFETY_ADMIN_TOKEN is not set. " +
      "Admin-gated endpoints are DISABLED (fail-closed: every request returns 503) until it is set. " +
      "Set SAFETY_ADMIN_TOKEN in Railway."
    );
  } else {
    console.warn(
      "[AdminAuth] SAFETY_ADMIN_TOKEN not set — admin-gated endpoints will return 503 (fail-closed) " +
      "until you set SAFETY_ADMIN_TOKEN in your .env file."
    );
  }
}

export function requireAdminAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // If no token is configured, block all access (safest default)
  if (!SAFETY_ADMIN_TOKEN) {
    res.status(503).json({
      error: "Admin auth not configured. Set SAFETY_ADMIN_TOKEN.",
    });
    return;
  }

  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: Bearer token required" });
    return;
  }

  const token = authHeader.slice("Bearer ".length);
  if (token !== SAFETY_ADMIN_TOKEN) {
    res.status(403).json({ error: "Forbidden: invalid admin token" });
    return;
  }

  next();
}
