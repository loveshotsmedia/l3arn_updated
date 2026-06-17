/**
 * Safety Middleware — Express
 *
 * Post-generation safety gate for all AI output in the ai-workers service.
 *
 * Pipeline per request type:
 *
 *   Companion response:
 *     1. validateAIOutputEnvelope(raw) → ZodError if malformed
 *     2. checkCompanionBoundaries(content, childPermissions)
 *     3. If violations: determineSeverity → block if S2+ → createModerationEvent
 *        → trigger kill switch if S4 → return safe fallback to client
 *
 *   Mission output:
 *     1. validateAIOutputEnvelope(raw) → ZodError if malformed
 *     2. classifyBlockedTopics(content, parentBlockedTopics)
 *     3. If blocked: createModerationEvent → return safe fallback to client
 *
 * Hard rule: NO unvalidated AI output reaches the child or parent. EVER.
 * Children always receive a safe fallback — never an error screen.
 *
 * Logging: console.log (structured JSON) for Phase 0.
 * Phase 2: replace with structured logging service + Supabase audit write.
 *
 * OPEN QUESTION: This middleware currently receives childPermissions and
 * parentBlockedTopics from request context (res.locals). The caller (route handler
 * or upstream middleware) must populate res.locals.childPermissions before this
 * middleware runs. The mechanism for fetching ChildPermissions from Supabase mid-request
 * is not yet defined for the ai-workers service. Agent 6 (Mission Compiler) owns
 * the child session context — confirm handoff point. — Agent 7, Phase 0
 *
 * OPEN QUESTION: res.locals.safetyContext must be set by the caller as
 * "companion-dialogue" | "mission-output". If absent, defaults to "mission-output"
 * (stricter). This default should be confirmed. — Agent 7, Phase 0
 *
 * Grounded in: ADR-054 (confirmed), ADR-046 (provisional), ADR-047 (provisional).
 */

import type { Request, Response, NextFunction } from "express";
import type { ChildPermissions } from "@l3arn/shared-types";
import {
  validateAIOutputEnvelope,
  checkCompanionBoundaries,
  classifyBlockedTopics,
  createModerationEvent,
  determineSeverity,
  shouldBlock,
  shouldTriggerKillSwitch,
  type BoundaryViolation,
  type SafetyContext,
  NoopKillSwitch,
} from "@l3arn/safety";
import type { KillSwitchTrigger } from "@l3arn/safety";

// ─── Kill Switch Instance ─────────────────────────────────────────────────────
// Phase 0: NoopKillSwitch. Phase 2: inject real implementation.
// In production, this would be provided via dependency injection, not constructed here.
const killSwitch: KillSwitchTrigger = new NoopKillSwitch();

// ─── Safe Fallback Response ───────────────────────────────────────────────────
// What the client sees when AI output is blocked.
// Children NEVER see error screens. They see guided fallback content.
// The specific content is sourced from the SafeFallback catalog (Phase 1).
//
// OPEN QUESTION: This returns a hardcoded placeholder. Phase 1 must wire this to
// the SafeFallback catalog managed by Agent 6 or a shared fallback service.
// — Agent 7, Phase 0

function buildSafeFallbackResponse(
  reason: string,
  context: SafetyContext,
): {
  blocked: true;
  reason: string;
  fallback: { title: string; content: string };
} {
  return {
    blocked: true,
    reason,
    fallback: {
      title: context === "companion-dialogue"
        ? "Your companion has something else to say!"
        : "Your mission is ready — let's get started!",
      content: context === "companion-dialogue"
        ? "I'd love to keep exploring this topic with you! Let's try something else for now."
        : "Great news — we have a specially selected mission ready for you today.",
    },
  };
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * safetyMiddleware — attach to routes that produce AI output.
 *
 * Expects on res.locals:
 *   - rawAIOutput: unknown        — the raw AI generation result (required)
 *   - childPermissions: ChildPermissions — from Supabase (required for companion checks)
 *   - childProfileId: string      — UUID of the child profile (required)
 *   - sessionId: string | undefined — active session UUID (optional)
 *   - safetyContext: SafetyContext — "companion-dialogue" | "mission-output" (optional; defaults to "mission-output")
 *
 * On violation: writes JSON safe-fallback response (HTTP 200, child-facing).
 * On pass: calls next() — downstream handler sends the validated output.
 */
export async function safetyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const rawAIOutput: unknown = res.locals.rawAIOutput;
  const childPermissions: ChildPermissions | undefined = res.locals.childPermissions;
  const childProfileId: string | undefined = res.locals.childProfileId;
  const sessionId: string | undefined = res.locals.sessionId;
  const safetyContext: SafetyContext =
    res.locals.safetyContext ?? "mission-output";

  // Guard: childProfileId is required for audit trail
  if (!childProfileId) {
    logSafetyEvent("error", "safetyMiddleware: missing childProfileId in res.locals", {});
    res.status(400).json({ error: "Bad request: missing child profile context" });
    return;
  }

  // Guard: rawAIOutput must be present
  if (rawAIOutput === undefined || rawAIOutput === null) {
    logSafetyEvent("warn", "safetyMiddleware: rawAIOutput is missing", { childProfileId });
    res.json(buildSafeFallbackResponse("ai-output-missing", safetyContext));
    return;
  }

  // ── Step 1: Validate AI Output Envelope ──────────────────────────────────
  let envelope: ReturnType<typeof validateAIOutputEnvelope>;
  try {
    envelope = validateAIOutputEnvelope(rawAIOutput);
  } catch (zodError) {
    logSafetyEvent("warn", "safetyMiddleware: AI output failed envelope validation", {
      childProfileId,
      error: zodError instanceof Error ? zodError.message : String(zodError),
    });
    // Do not propagate ZodError — child sees fallback, not a parse error
    res.json(buildSafeFallbackResponse("envelope-validation-failed", safetyContext));
    return;
  }

  // If the envelope already carries a failed-with-fallback result (from the retry
  // helper), skip content checks and return the fallback directly.
  if (envelope.result.status === "failed-with-fallback") {
    logSafetyEvent("info", "safetyMiddleware: envelope carries failed-with-fallback result", {
      childProfileId,
      fallbackId: envelope.result.fallbackId,
    });
    res.json(buildSafeFallbackResponse("ai-generation-exhausted-retries", safetyContext));
    return;
  }

  // ── Step 2: Extract content for safety checks ─────────────────────────────
  // The content is inside result.data — its exact shape depends on context.
  // We extract a string representation for pattern-matching.
  const contentString = extractContentString(envelope.result.data);

  // ── Step 3: Run context-appropriate safety checks ─────────────────────────
  let violations: BoundaryViolation[] = [];

  if (safetyContext === "companion-dialogue") {
    if (!childPermissions) {
      logSafetyEvent("error", "safetyMiddleware: companion-dialogue requires childPermissions", {
        childProfileId,
      });
      res.json(buildSafeFallbackResponse("missing-permissions-context", safetyContext));
      return;
    }
    const boundaryResult = checkCompanionBoundaries(contentString, childPermissions);
    violations = boundaryResult.violations;
  } else {
    // mission-output: use blocked topic classifier
    const parentBlockedTopics = childPermissions?.blockedTopics ?? [];
    const topicResult = classifyBlockedTopics(contentString, parentBlockedTopics);
    if (topicResult.blocked && topicResult.matchedTopic) {
      violations = [
        {
          rule: `${topicResult.source ?? "platform"}:${topicResult.matchedTopic}`,
          excerpt: contentString.substring(0, 120),
          severity: topicResult.source === "parent" ? "S2" : "S3",
        },
      ];
    }
  }

  // ── Step 4: Handle violations ─────────────────────────────────────────────
  if (violations.length > 0) {
    const severity = determineSeverity(violations, safetyContext);

    logSafetyEvent("warn", "safetyMiddleware: safety violations detected", {
      childProfileId,
      sessionId,
      severity,
      violationCount: violations.length,
      rules: violations.map((v) => v.rule),
    });

    // Create and log moderation events (one per violation)
    // Phase 2: persist these to Supabase moderation_events table
    for (const violation of violations) {
      const moderationEvent = createModerationEvent(
        violation,
        childProfileId,
        safetyContext === "companion-dialogue" ? "companion-response" : "mission-output",
      );
      logSafetyEvent("info", "safetyMiddleware: moderation event created (not yet persisted)", {
        moderationEventId: moderationEvent.id,
        outcome: moderationEvent.outcome,
        checksRun: moderationEvent.checksRun.map((c) => c.checkType),
      });
    }

    // Trigger kill switch for S4 events
    if (shouldTriggerKillSwitch(severity)) {
      await killSwitch.trigger({
        severity: "S4",
        childProfileId,
        sessionId,
        reason: violations.map((v) => v.rule).join("; "),
        triggeredAt: new Date().toISOString(),
      });
    }

    // Block if severity warrants it (S2+)
    if (shouldBlock(severity)) {
      res.json(buildSafeFallbackResponse(`safety-blocked:${severity}`, safetyContext));
      return;
    }
    // S1: log and continue (parent notified via moderation event)
  }

  // ── Step 5: Pass — attach validated envelope to res.locals for downstream ──
  res.locals.validatedEnvelope = envelope;
  next();
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Extract a string from AI result data for content-matching.
 * Handles: string, object with content/text/body/dialogue fields, JSON.stringify fallback.
 */
function extractContentString(data: unknown): string {
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    for (const key of ["content", "text", "body", "dialogue", "response", "output"]) {
      if (typeof d[key] === "string") return d[key] as string;
    }
    try {
      return JSON.stringify(data);
    } catch {
      return "";
    }
  }
  return String(data ?? "");
}

/**
 * Structured log emitter.
 * Phase 0: console.log with JSON structure.
 * Phase 2: replace with structured logging service (DataDog, Railway logs, etc.).
 */
function logSafetyEvent(
  level: "info" | "warn" | "error",
  message: string,
  meta: Record<string, unknown>,
): void {
  console.log(
    JSON.stringify({
      level,
      system: "safety-middleware",
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }),
  );
}
