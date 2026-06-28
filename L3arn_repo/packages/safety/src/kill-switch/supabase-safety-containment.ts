/**
 * SupabaseSafetyContainment
 *
 * Production implementation of SafetyContainmentTrigger.
 * Writes containment records to audit_logs and safety_escalations via
 * an injected Supabase service-role client.
 *
 * Injection design (non-negotiable):
 *   The safety package must remain free of direct Supabase SDK imports.
 *   The client is injected as a typed interface so the package does not
 *   take a compile-time dependency on @supabase/supabase-js.
 *   The infrastructure layer (apps/web or services/ai-workers) constructs
 *   the real client and injects it here.
 *
 * Phase 1 contract:
 *   - Actions in event.actions are logged only (not enforced).
 *     Phase 2 will wire real halt logic (freeze world state, end session, etc.).
 *   - Records are ALWAYS written to audit_logs and safety_escalations,
 *     even when enforcement is Noop. This is the "log even when not enforced"
 *     rule from the spec.
 *   - Promise always resolves — never rejects. Internal errors are caught
 *     and logged to stdout; they do NOT surface to the child or parent.
 *
 * Phase 2 TODOs (flagged inline):
 *   - Execute containment actions for real (end session, freeze world state, etc.)
 *   - Send FOUNDER_ALERT_EMAIL notification
 *   - Wire to founder_sessions for dashboard alert
 *
 * Grounded in: ADR-047 (amended), ADR-048, ADR-046.
 */

import type {
  SafetyContainmentTrigger,
  SafetyContainmentEvent,
} from "./safety-containment.interface";

// ─── Injected Client Interface ────────────────────────────────────────────────
//
// We do NOT import from @supabase/supabase-js here. The safety package must
// remain infrastructure-free. The injected client only needs to support:
//   client.from(table).insert(rows)
//   client.from(table).insert(rows) returning data/error
//
// The real Supabase service-role client satisfies this interface automatically.

export interface SupabaseInsertResult {
  error: { message: string; code?: string } | null;
}

export interface SupabaseTableClient {
  insert(
    rows: Record<string, unknown> | Record<string, unknown>[],
  ): Promise<SupabaseInsertResult>;
}

export interface SupabaseServiceClient {
  from(table: string): SupabaseTableClient;
}

// ─── SupabaseSafetyContainment ────────────────────────────────────────────────

export class SupabaseSafetyContainment implements SafetyContainmentTrigger {
  private readonly client: SupabaseServiceClient;

  /**
   * @param supabaseServiceClient
   *   Supabase service-role client from the infrastructure layer.
   *   Must use the service role key (not the anon key).
   *   Must have INSERT access to audit_logs and safety_escalations.
   */
  constructor(supabaseServiceClient: SupabaseServiceClient) {
    this.client = supabaseServiceClient;
  }

  async contain(event: SafetyContainmentEvent): Promise<void> {
    // ── 1. Structured CRITICAL log to stdout ──────────────────────────────────
    // Always log first — even if DB writes fail, stdout captures the event.
    this.logCritical("safety-containment triggered", {
      severity: event.severity,
      actions: event.actions,
      childProfileId: event.childProfileId,
      sessionId: event.sessionId,
      reason: event.reason,
      triggeredAt: event.triggeredAt,
      requiresFounderReview: true,
      phase1Note:
        "Phase 1: actions logged only — real enforcement wired in Phase 2",
    });

    // ── 2. Phase 1: Execute actions (logging only) ────────────────────────────
    // Phase 2 TODO: execute each action for real:
    //   "block-content"      → instruct session layer to block response
    //   "end-session"        → call Railway API to terminate child session
    //   "force-quick-chat"   → update child_permissions via service_role
    //   "force-guided-ai"    → update child_permissions via service_role
    //   "disable-audio"      → update child_permissions via service_role
    //   "disable-evidence"   → update child_permissions via service_role
    //   "freeze-moolah"      → call economy service to freeze Moolah
    //   "freeze-world-state" → call Railway world-state service to freeze writes
    for (const action of event.actions) {
      this.logCritical(`Phase 1: action logged (not enforced): ${action}`, {
        action,
        childProfileId: event.childProfileId,
        sessionId: event.sessionId,
      });
    }

    // ── 3. Write to audit_logs ────────────────────────────────────────────────
    // Never throws — error is caught and logged.
    await this.writeAuditLog(event);

    // ── 4. Write to safety_escalations ───────────────────────────────────────
    // Never throws — error is caught and logged.
    await this.writeSafetyEscalation(event);

    // Phase 2 TODO: Send FOUNDER_ALERT_EMAIL notification.
    // Phase 2 TODO: Create in-platform alert in founder_sessions or alerts table.
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  private async writeAuditLog(event: SafetyContainmentEvent): Promise<void> {
    try {
      const row = {
        event_type: "containment-triggered",
        actor_role: "safety-containment",
        actor_id: "safety-containment",
        target_type: "session",
        target_id: event.sessionId ?? null,
        justification: null, // automated event — no human justification required
        payload_json: {
          // De-identified payload — no raw PII, no raw AI output
          severity: event.severity,
          actions: event.actions,
          childProfileId: event.childProfileId, // UUID only — never legal name
          sessionId: event.sessionId ?? null,
          reason: event.reason, // sanitized rule names only (enforced upstream)
          triggeredAt: event.triggeredAt,
          requiresFounderReview: true,
          phase: "1",
        },
        created_at: event.triggeredAt,
      };

      const result = await this.client.from("audit_logs").insert(row);

      if (result.error) {
        this.logCritical("audit_logs write failed", {
          error: result.error.message,
          code: result.error.code,
          childProfileId: event.childProfileId,
          triggeredAt: event.triggeredAt,
        });
      } else {
        this.logCritical("audit_logs write succeeded", {
          childProfileId: event.childProfileId,
          triggeredAt: event.triggeredAt,
        });
      }
    } catch (err) {
      // Catch all — never let DB errors reject the Promise or surface to the child
      this.logCritical("audit_logs write threw unexpected error", {
        error: err instanceof Error ? err.message : String(err),
        childProfileId: event.childProfileId,
      });
    }
  }

  private async writeSafetyEscalation(
    event: SafetyContainmentEvent,
  ): Promise<void> {
    try {
      // Build de-identified violation_summary from event.reason.
      // event.reason comes from upstream safety pipeline and contains
      // sanitized rule names only (see moderation-event.creator.ts).
      // We do NOT store raw AI output or raw chat content here.
      const violationSummary = this.buildViolationSummary(event);

      const row = {
        child_profile_id: event.childProfileId,
        session_id: event.sessionId ?? null,
        severity: event.severity,
        trigger_source: this.inferTriggerSource(event),
        containment_actions: event.actions,
        violation_summary: violationSummary,
        status: "pending-review",
        reviewed_by: null,
        reviewed_at: null,
        review_notes: null,
        requires_founder_review: true,
        created_at: event.triggeredAt,
        updated_at: event.triggeredAt,
      };

      const result = await this.client
        .from("safety_escalations")
        .insert(row);

      if (result.error) {
        this.logCritical("safety_escalations write failed", {
          error: result.error.message,
          code: result.error.code,
          childProfileId: event.childProfileId,
          triggeredAt: event.triggeredAt,
        });
      } else {
        this.logCritical("safety_escalations write succeeded", {
          childProfileId: event.childProfileId,
          severity: event.severity,
          triggeredAt: event.triggeredAt,
        });
      }
    } catch (err) {
      // Catch all — never let DB errors reject the Promise or surface to the child
      this.logCritical("safety_escalations write threw unexpected error", {
        error: err instanceof Error ? err.message : String(err),
        childProfileId: event.childProfileId,
      });
    }
  }

  /**
   * Build a de-identified violation summary for storage in safety_escalations.
   * Contains rule names and sanitized reason text only.
   * Never stores raw AI output, raw chat content, or legal PII.
   */
  private buildViolationSummary(event: SafetyContainmentEvent): string {
    // event.reason comes from upstream and should contain sanitized rule names.
    // Truncate to 1000 chars as a hard cap — no raw content should ever
    // be long enough to represent a full AI response.
    const sanitizedReason = event.reason.substring(0, 1000);
    return (
      `[${event.severity}] Automated containment triggered. ` +
      `Actions: ${event.actions.join(", ")}. ` +
      `Reason: ${sanitizedReason}`
    );
  }

  /**
   * Infer trigger_source from event context.
   * Phase 1: defaults to "ai-output" since containment is triggered post-AI-pipeline.
   * Phase 2 TODO: pass explicit trigger_source in SafetyContainmentEvent.
   */
  private inferTriggerSource(
    event: SafetyContainmentEvent,
  ): "user-input" | "ai-output" | "companion-response" {
    const reason = event.reason.toLowerCase();
    if (reason.includes("user-input")) return "user-input";
    if (reason.includes("companion")) return "companion-response";
    return "ai-output"; // safe default
  }

  /**
   * Structured CRITICAL log to stdout.
   * Phase 0/1: console.log with JSON structure.
   * Phase 2 TODO: replace with structured logging service (DataDog, Railway, etc.).
   */
  private logCritical(
    message: string,
    meta: Record<string, unknown>,
  ): void {
    console.log(
      JSON.stringify({
        level: "CRITICAL",
        system: "supabase-safety-containment",
        message,
        timestamp: new Date().toISOString(),
        ...meta,
      }),
    );
  }
}
