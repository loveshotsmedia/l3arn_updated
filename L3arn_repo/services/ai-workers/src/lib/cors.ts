/**
 * Minimal, dependency-free CORS middleware.
 *
 * Why this exists: the Vercel frontend calls this Railway service cross-origin
 * (NEXT_PUBLIC_RAILWAY_API_URL, no Next.js rewrite). Without CORS headers the
 * browser blocks every call — including the already-built parent "Start Session".
 *
 * Posture:
 *   - Allowed origins come from ALLOWED_ORIGINS (comma-separated exact origins).
 *   - Non-production with ALLOWED_ORIGINS unset: reflect the request origin
 *     (developer convenience only).
 *   - Production with ALLOWED_ORIGINS unset: send NO CORS headers (fail closed)
 *     and log critical — set ALLOWED_ORIGINS to the Vercel origin(s).
 *   - Auth is via Authorization: Bearer (no cookies), so credentials are not
 *     enabled. Allowed headers include Authorization and X-Parent-Id.
 */

import type { Request, Response, NextFunction } from "express";

const ALLOWED_HEADERS = "Content-Type, Authorization, X-Parent-Id";
const ALLOWED_METHODS = "GET, POST, OPTIONS";

function parseAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw) return [];
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
}

/** Resolve the Access-Control-Allow-Origin value for this request, or null to deny. */
function resolveAllowedOrigin(requestOrigin: string | undefined): string | null {
  const allowed = parseAllowedOrigins();
  const isProduction = process.env.NODE_ENV === "production";

  if (allowed.length > 0) {
    if (requestOrigin && allowed.includes(requestOrigin)) return requestOrigin;
    return null; // configured allowlist, origin not on it → deny
  }

  // No allowlist configured.
  if (!isProduction) {
    // Dev convenience: reflect whatever origin called.
    return requestOrigin ?? "*";
  }

  // Production + no allowlist → fail closed.
  console.error(
    JSON.stringify({
      level: "critical",
      system: "cors",
      msg: "ALLOWED_ORIGINS is not set in production — cross-origin browser calls will be blocked. Set ALLOWED_ORIGINS to the Vercel origin(s).",
      timestamp: new Date().toISOString(),
    }),
  );
  return null;
}

export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestOrigin = req.headers.origin;
  const allowOrigin = resolveAllowedOrigin(requestOrigin);

  if (allowOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowOrigin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", ALLOWED_METHODS);
    res.setHeader("Access-Control-Allow-Headers", ALLOWED_HEADERS);
    res.setHeader("Access-Control-Max-Age", "86400");
  }

  // Preflight: answer and stop here.
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
}
