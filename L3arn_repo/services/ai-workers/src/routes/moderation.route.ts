/**
 * Moderation Route
 *
 * GET  /api/safety/status
 *   Health check for the safety subsystem. Returns version and status.
 *   Used by monitoring, CI checks, and the Founder Mission Control dashboard (ADR-048).
 *
 * POST /api/safety/check
 *   Ad-hoc content safety check for internal testing and admin tooling.
 *   Accepts { content: string; context: string } and runs all classifiers.
 *   NOT intended to be exposed to child or parent sessions — admin/test use only.
 *
 * IMPORTANT: The /api/safety/check route MUST be protected by admin authentication
 * before Phase 1. In Phase 0, it is restricted to internal/test use.
 *
 * OPEN QUESTION: The /api/safety/check endpoint returns raw classifier results
 * including matched rule names. This is acceptable for internal testing, but
 * should it be gated behind AdminAccessRole in Phase 1, or removed from the
 * production build entirely? — Agent 7, Phase 0
 *
 * Grounded in: ADR-048 (Founder Mission Control — provisional),
 * ADR-049 (admin access model — provisional).
 */

import { Router, type Request, type Response } from "express";
import {
  classifyBlockedTopics,
  checkCompanionBoundaries,
  determineSeverity,
  type SafetyContext,
} from "@l3arn/safety";
import { PLATFORM_BLOCKED_CATEGORIES } from "@l3arn/safety";

// Safety package version — increment when safety policy changes
const SAFETY_VERSION = "0.1.0";

export const moderationRouter = Router();

// ─── GET /api/safety/status ───────────────────────────────────────────────────

moderationRouter.get("/status", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    safetyVersion: SAFETY_VERSION,
    platformBlockedCategories: PLATFORM_BLOCKED_CATEGORIES,
    timestamp: new Date().toISOString(),
  });
});

// ─── POST /api/safety/check ───────────────────────────────────────────────────
// Internal/admin testing endpoint only.
// Runs the blocked-topic classifier against provided content.
// Does NOT run the companion boundary checker (requires a full ChildPermissions object).

moderationRouter.post("/check", (req: Request, res: Response) => {
  const { content, context } = req.body as {
    content?: unknown;
    context?: unknown;
  };

  if (typeof content !== "string" || content.trim().length === 0) {
    res.status(400).json({
      error: "Bad request: 'content' must be a non-empty string",
    });
    return;
  }

  const resolvedContext: SafetyContext =
    context === "companion-dialogue" || context === "mission-output" || context === "parent-report"
      ? (context as SafetyContext)
      : "mission-output";

  // Run platform blocked-topic check (no parent topics in this test endpoint)
  const topicResult = classifyBlockedTopics(
    content,
    [],  // no parent topics for this test
    [...PLATFORM_BLOCKED_CATEGORIES],
  );

  const violations = topicResult.blocked && topicResult.matchedTopic
    ? [
        {
          rule: `${topicResult.source ?? "platform"}:${topicResult.matchedTopic}`,
          excerpt: content.substring(0, 120),
          severity: (topicResult.source === "parent" ? "S2" : "S3") as "S2" | "S3",
        },
      ]
    : [];

  const severity = determineSeverity(violations, resolvedContext);

  res.json({
    safetyVersion: SAFETY_VERSION,
    context: resolvedContext,
    blocked: topicResult.blocked,
    severity,
    topicResult,
    violations,
    checkedAt: new Date().toISOString(),
    note: "This endpoint runs the platform blocked-topic classifier only. " +
          "Full companion boundary checks require a ChildPermissions object and " +
          "are run by the safety middleware, not this route.",
  });
});
