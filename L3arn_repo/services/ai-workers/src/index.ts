/**
 * L3ARN AI Workers — HTTP Service Entry Point
 *
 * Lightweight Express service deployed on Railway. Hosts the mission compilation
 * endpoint and future AI worker routes.
 *
 * Environment variables:
 *   PORT              — HTTP port (default: 3001)
 *   ANTHROPIC_API_KEY — Required for Claude API calls via MissionCompiler
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

const app: Express = express();
const PORT = parseInt(process.env.PORT ?? "3001", 10);

// ─── Guard: ANTHROPIC_API_KEY ─────────────────────────────────────────────────
if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    "[ai-workers] FATAL: ANTHROPIC_API_KEY environment variable is not set. " +
      "Mission compilation will fail. Set this variable in Railway before starting.",
  );
  // Do not exit — allow the process to start so health checks can respond,
  // but the mission compile endpoint will fail at call time.
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "ai-workers",
    timestamp: new Date().toISOString(),
    anthropicKeyPresent: !!process.env.ANTHROPIC_API_KEY,
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/missions", missionRouter);
app.use("/api/safety", moderationRouter);

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
});

export default app;
