/**
 * Minimal, dependency-free CORS middleware.
 *
 * Why this exists: the Vercel frontend calls this Railway service cross-origin
 * (NEXT_PUBLIC_RAILWAY_API_URL, no Next.js rewrite). Without CORS headers the
 * browser blocks every call — including the parent "Start Session".
 *
 * Posture:
 *   - Exact origins  → ALLOWED_ORIGINS (comma-separated). Stable prod domains.
 *   - Pattern origins → ALLOWED_ORIGIN_PATTERNS (comma-separated regexes). For
 *     Vercel PREVIEW deploys, whose URLs are dynamic
 *     (e.g. l3arnupdated-<hash>-love-shots-media.vercel.app). ALWAYS scope the
 *     regex to your project AND team — never a bare `.*\.vercel\.app`, which
 *     would let any Vercel app on the platform call this backend.
 *   - Non-production with neither set: reflect the request origin (dev only).
 *   - Production with neither set: send NO CORS headers (fail closed) + log.
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

/**
 * Regex allowlist from ALLOWED_ORIGIN_PATTERNS (comma-separated). Patterns are
 * operator-controlled config (trusted) and should be fully anchored (^…$).
 * Invalid patterns are skipped (and logged) rather than crashing the service.
 */
function parseAllowedOriginPatterns(): RegExp[] {
  const raw = process.env.ALLOWED_ORIGIN_PATTERNS;
  if (!raw) return [];
  const out: RegExp[] = [];
  for (const part of raw.split(",").map((s) => s.trim()).filter((s) => s.length > 0)) {
    try {
      out.push(new RegExp(part));
    } catch {
      console.error(
        JSON.stringify({
          level: "error",
          system: "cors",
          msg: `Invalid regex in ALLOWED_ORIGIN_PATTERNS, skipping: ${part}`,
          timestamp: new Date().toISOString(),
        }),
      );
    }
  }
  return out;
}

/** Resolve the Access-Control-Allow-Origin value for this request, or null to deny. */
function resolveAllowedOrigin(requestOrigin: string | undefined): string | null {
  const allowed = parseAllowedOrigins();
  const patterns = parseAllowedOriginPatterns();
  const configured = allowed.length > 0 || patterns.length > 0;
  const isProduction = process.env.NODE_ENV === "production";

  // Exact match or scoped-pattern match → allow (echo the caller's origin).
  if (requestOrigin) {
    if (allowed.includes(requestOrigin)) return requestOrigin;
    if (patterns.some((p) => p.test(requestOrigin))) return requestOrigin;
  }

  // An allowlist exists but this origin isn't on it → deny.
  if (configured) return null;

  // Nothing configured.
  if (!isProduction) {
    // Dev convenience: reflect whatever origin called.
    return requestOrigin ?? "*";
  }

  // Production + nothing configured → fail closed.
  console.error(
    JSON.stringify({
      level: "critical",
      system: "cors",
      msg: "No ALLOWED_ORIGINS / ALLOWED_ORIGIN_PATTERNS set in production — cross-origin browser calls will be blocked.",
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
