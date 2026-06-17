/**
 * Kill Switch Interface
 *
 * Defines the contract for kill-switch invocation. The implementation is
 * provided by the infrastructure layer (Phase 2). During Phase 0/1, the
 * NoopKillSwitch is used, which logs the event without taking action.
 *
 * Kill-switch rules (ADR-047 — provisional):
 *   - Only founders may invoke a kill switch
 *   - Kill switches must be reversible and logged
 *   - A kill switch invocation triggers at minimum an S1 review
 *   - No automated system may invoke a kill switch without founder approval
 *
 * This interface allows the safety middleware to call trigger() without
 * depending on any specific infrastructure implementation. The DI pattern
 * here is intentional — the safety package must remain pure and infrastructure-free.
 *
 * OPEN QUESTION: ADR-047 states "no automated system may invoke a kill switch
 * without founder approval." The S4 severity rule in determineSeverity() would
 * trigger the NoopKillSwitch automatically. This is a design tension: S4 events
 * (e.g., sexual content involving minors) arguably cannot wait for human approval.
 * Resolution needed before Phase 2 implementation. Filed for founder review.
 * — Agent 7, Phase 0
 *
 * Grounded in: ADR-047 (kill-switch authority — provisional),
 * CONTEXT.md §10 (Kill Switch Authority).
 */

// ─── Kill Switch Event ────────────────────────────────────────────────────────

export interface KillSwitchEvent {
  severity: "S4";
  childProfileId: string;
  sessionId: string | undefined;
  reason: string;
  triggeredAt: string; // ISO 8601 datetime
}

// ─── Kill Switch Interface ────────────────────────────────────────────────────

export interface KillSwitchTrigger {
  /**
   * Trigger the kill switch for a critical (S4) event.
   * Implementation must:
   *   - Log the event with full audit trail
   *   - Halt the relevant subsystem (AI generation for this session, at minimum)
   *   - Notify the platform admin (founder, per ADR-047)
   *   - Return a resolved Promise regardless — kill-switch errors must not
   *     surface to the child or parent as UI errors
   */
  trigger(event: KillSwitchEvent): Promise<void>;
}

// ─── NoopKillSwitch ───────────────────────────────────────────────────────────
// Development/Phase 0 implementation.
// Logs the event to console and resolves immediately.
// Replace by injecting a real implementation from the infrastructure layer.
//
// Usage:
//   const killSwitch: KillSwitchTrigger = new NoopKillSwitch();
//   await killSwitch.trigger(event);

export class NoopKillSwitch implements KillSwitchTrigger {
  async trigger(event: KillSwitchEvent): Promise<void> {
    // Structured log — infrastructure layer will replace this with a real alert
    console.log(
      JSON.stringify({
        level: "CRITICAL",
        system: "kill-switch",
        message: "S4 kill-switch triggered (NOOP — no action taken in Phase 0)",
        event,
      }),
    );
    // In Phase 2: halt AI generation, notify founder via incident channel,
    // write to audit_logs table with action: "kill-switch-invoked"
  }
}
