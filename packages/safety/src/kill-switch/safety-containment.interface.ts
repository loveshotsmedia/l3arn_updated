/**
 * Safety Containment Interface
 *
 * Defines automated safety containment for predefined severe child-safety events.
 *
 * ADR-047 (amended June 2026):
 *   Automated kill switches ARE allowed for predefined safety-critical events.
 *   These actions must degrade the product into a safer mode, log the incident,
 *   notify Founder Mission Control, and require founder/admin review before restoration.
 *
 * This is NOT "AI randomly shuts down the platform." It is:
 *   Predefined automated safety containment for severe child-safety events.
 *
 * Approved automated actions for S3/S4 events:
 *   - block-content          : block the unsafe content before delivery
 *   - end-session            : terminate the child session
 *   - force-quick-chat       : restrict chat to Quick Chat only
 *   - force-guided-ai        : restrict AI to Guided Mode only
 *   - disable-audio          : disable push-to-talk for this session
 *   - disable-evidence       : disable evidence capture for this session
 *   - freeze-moolah          : freeze Moolah transactions
 *   - freeze-world-state     : freeze world-state writes
 *
 * Restoration:
 *   ANY containment action requires founder/admin review before the
 *   affected capability is restored. No automated restoration.
 *
 * Grounded in: ADR-047 (amended), ADR-048, ADR-046.
 */

// ─── Containment Actions ──────────────────────────────────────────────────────

export type SafetyContainmentAction =
  | "block-content"
  | "end-session"
  | "force-quick-chat"
  | "force-guided-ai"
  | "disable-audio"
  | "disable-evidence"
  | "freeze-moolah"
  | "freeze-world-state";

// ─── Containment Event ────────────────────────────────────────────────────────

export interface SafetyContainmentEvent {
  /** Severity that triggered containment. S4 is CSAM/self-harm; S3 is high concern. */
  severity: "S3" | "S4";

  /** Actions the system has taken or will take. */
  actions: SafetyContainmentAction[];

  /** Child profile UUID. Never real name or PII. */
  childProfileId: string;

  /** Active session UUID, if known. */
  sessionId: string | undefined;

  /** Human-readable reason for the containment event. */
  reason: string;

  /** ISO 8601 timestamp. */
  triggeredAt: string;

  /** Restoration always requires a human review step. Compile-time invariant. */
  requiresFounderReview: true;
}

// ─── SafetyContainmentTrigger Interface ───────────────────────────────────────

export interface SafetyContainmentTrigger {
  /**
   * Execute automated safety containment for a severe safety event.
   *
   * Implementation MUST:
   *   - Execute all actions in the event.actions array
   *   - Write a containment record to audit_logs with action: "kill-switch-invoked"
   *   - Notify Founder Mission Control (email + in-platform alert)
   *   - Never surface errors to the child or parent as UI errors
   *   - Return a resolved Promise regardless of internal errors
   *
   * The implementation is provided by the infrastructure layer (Phase 2).
   * In Phase 0/1, inject NoopSafetyContainment.
   */
  contain(event: SafetyContainmentEvent): Promise<void>;
}

// ─── NoopSafetyContainment ───────────────────────────────────────────────────
// Phase 0/1 implementation. Logs the event. Does NOT take action.
// Replace by injecting a real implementation in Phase 2.

export class NoopSafetyContainment implements SafetyContainmentTrigger {
  async contain(event: SafetyContainmentEvent): Promise<void> {
    console.log(
      JSON.stringify({
        level: "CRITICAL",
        system: "safety-containment",
        message: `NOOP containment triggered for ${event.severity} — no action taken in Phase 0`,
        severity: event.severity,
        actions: event.actions,
        childProfileId: event.childProfileId,
        sessionId: event.sessionId,
        reason: event.reason,
        triggeredAt: event.triggeredAt,
        requiresFounderReview: true,
      })
    );
  }
}
