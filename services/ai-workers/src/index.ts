/**
 * L3ARN AI Workers — HTTP Service Entry Point
 *
 * Lightweight Express service deployed on Railway. Hosts the mission compilation
 * endpoint and future AI worker routes.
 *
 * Environment variables:
 *   PORT                      — HTTP port (default: 3001)
 *   ANTHROPIC_API_KEY         — Required for Claude API calls via MissionCompiler
 *   SUPABASE_URL              — Required for session/student/report routes
 *   SUPABASE_SERVICE_ROLE_KEY — Required for session/student/report routes
 *   ALLOWED_ORIGINS           — Comma-separated Vercel origin(s) for CORS.
 *                               REQUIRED in production (browser→Railway calls
 *                               fail closed without it). e.g.
 *                               "https://app.l3arn.example,https://l3arn.vercel.app"
 *
 * Grounded in: ADR-050 (monorepo), architecture.md §3 (Mission Compiler API runs on Railway),
 * CONTEXT.md §5 (Railway = AI orchestration, backend).
 *
 * OPEN QUESTION: Authentication middleware is absent in Phase 0.
 * Before production, all routes must be protected by a Railway-internal
 * service token or Supabase JWT validation. — Agent 6, Phase 0
 *
 * OPEN QUESTION: This service currently has no health check endpoint.
 * Railway expects a health check (e.g. GET /health → 200) for deployment
 * health monitoring. Add before first Railway deploy. — Agent 6, Phase 0
 */

import express, { type Express } from "express";
import { missionRouter } from "./routes/mission.route";
import { moderationRouter } from "./routes/moderation.route";
import { createReportsRouter } from "./reports/unified-first-learning-map";
import { sessionsRouter } from "./routes/sessions.route";
import { studentSessionRouter } from "./routes/student-session.route";
import { studentMissionRouter } from "./routes/mission-runtime.route";
import { calibrationRouter } from "./routes/calibration.route";
import { corsMiddleware } from "./lib/cors";

const app: Express = express();
const PORT = parseInt(process.env.PORT ?? "3001", 10);

// ─── Guard: ANTHROPIC_API_KEY ─────────────────────────────────────────────────
if (!process.env.ANTHROPIC_API_KEY) {
  // Structured JSON so Railway log alerting can filter on level="fatal".
  console.log(
    JSON.stringify({
      level: "fatal",
      system: "startup",
      msg: "ANTHROPIC_API_KEY is not set — all mission compile calls will use static fallback content",
      action: "Set ANTHROPIC_API_KEY in Railway environment variables before starting",
    }),
  );
  // Do not exit — allow the process to start so health checks can respond,
  // but the mission compile endpoint will return fallback content at call time.
}

// ─── Guard: ANTHROPIC_MODEL ───────────────────────────────────────────────────
if (!process.env.ANTHROPIC_MODEL) {
  if (process.env.NODE_ENV === "production") {
    // In production, compiler.ts throws if ANTHROPIC_MODEL is absent — log
    // this at startup so the failure is traceable before the first request.
    console.log(
      JSON.stringify({
        level: "fatal",
        system: "startup",
        msg: "ANTHROPIC_MODEL is not set in production — mission compile calls will throw at call time (500)",
        action: "Set ANTHROPIC_MODEL in Railway environment variables (e.g. claude-haiku-4-5-20251001)",
      }),
    );
  } else {
    console.log(
      JSON.stringify({
        level: "warn",
        system: "startup",
        msg: "ANTHROPIC_MODEL not set — compiler will use dev default (claude-sonnet-4-6)",
        action: "Set ANTHROPIC_MODEL in .env for explicit control",
      }),
    );
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────
// CORS first so preflight (OPTIONS) is answered before body parsing / routing.
app.use(corsMiddleware);
app.use(express.json({ limit: "1mb" }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  const anthropicKeyPresent = !!process.env.ANTHROPIC_API_KEY;
  const anthropicModelPresent = !!process.env.ANTHROPIC_MODEL;
  res.status(200).json({
    status: "ok",
    service: "ai-workers",
    timestamp: new Date().toISOString(),
    // Both must be true for real AI mission generation.
    // If either is false, all missions will use static fallback content.
    anthropicKeyPresent,
    anthropicModelPresent,
    missionAiReady: anthropicKeyPresent && anthropicModelPresent,
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/missions", missionRouter);
app.use("/api/safety", moderationRouter);
app.use("/api/reports", createReportsRouter());
app.use("/api/sessions", sessionsRouter);
app.use("/api/student/session", studentSessionRouter);
app.use("/api/student/mission", studentMissionRouter);
app.use("/api/student/calibration", calibrationRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: "The requested route does not exist on this service.",
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("[ai-workers] Unhandled error:", err);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
    });
  },
);

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[ai-workers] Listening on port ${PORT}`);
  console.log(`[ai-workers] Health check: GET /health`);
  console.log(`[ai-workers] Mission compile: POST /api/missions/compile`);
  console.log(`[ai-workers] Safety status: GET /api/safety/status`);
  console.log(`[ai-workers] Safety check (internal): POST /api/safety/check`);
  console.log(`[ai-workers] First Learning Map: POST /api/reports/first-learning-map`);
  console.log(`[ai-workers] Session start: POST /api/sessions/start`);
  console.log(`[ai-workers] Session verify: POST /api/sessions/verify`);
  console.log(`[ai-workers] Set house: POST /api/student/session/house`);
  console.log(`[ai-workers] Select companion: POST /api/student/session/companion`);
  console.log(`[ai-workers] Calibration signals: POST /api/student/session/calibration-signals`);
  console.log(`[ai-workers] Mission start: POST /api/student/mission/start`);
  console.log(`[ai-workers] Mission complete: POST /api/student/mission/complete`);
  console.log(`[ai-workers] Mission evidence: POST /api/student/mission/evidence`);
  console.log(`[ai-workers] Calibration snapshot: POST /api/student/calibration/snapshot`);
});

export default app;
