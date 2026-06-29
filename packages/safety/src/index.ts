/**
 * @l3arn/safety — Barrel Export
 *
 * Pure logic, stateless safety pipeline for L3ARN AI output.
 * No database access, no HTTP calls, no side effects.
 *
 * Import order reflects dependency direction:
 *   classifiers ← (no internal deps)
 *   validators  ← (no internal deps)
 *   severity    ← imports BoundaryViolation from classifiers
 *   events      ← imports BoundaryViolation from classifiers
 *   retry       ← imports from @l3arn/shared-types only
 *   kill-switch ← (no internal deps)
 */

// ─── Classifiers ─────────────────────────────────────────────────────────────
export {
  classifyBlockedTopics,
  PLATFORM_BLOCKED_CATEGORIES,
  type BlockedCategory,
  type BlockedTopicResult,
  type BlockedTopicConfidence,
} from "./classifiers/blocked-topic.classifier";

export {
  checkCompanionBoundaries,
  type BoundaryCheckResult,
  type BoundaryViolation,
  type SafetySeverity,
} from "./classifiers/companion-boundary.checker";

// ─── Validators ───────────────────────────────────────────────────────────────
export {
  validateAIOutputEnvelope,
  type AIOutputEnvelope,
} from "./validators/ai-output-envelope.validator";

// ─── Retry Helper ─────────────────────────────────────────────────────────────
export { withAIRetry } from "./retry/ai-retry.helper";

// ─── Moderation Event Creator ─────────────────────────────────────────────────
export {
  createModerationEvent,
  type ModerationTriggerSource,
} from "./events/moderation-event.creator";

// ─── Safety Severity ──────────────────────────────────────────────────────────
// Note: SafetySeverity type is exported from classifiers above (its canonical home).
export {
  determineSeverity,
  shouldBlock,
  shouldTriggerKillSwitch,
  shouldNotifyParent,
  shouldEscalateToAdmin,
  type SafetyContext,
} from "./severity/safety-severity.helper";

// ─── Kill Switch ──────────────────────────────────────────────────────────────
export {
  NoopKillSwitch,
  type KillSwitchTrigger,
  type KillSwitchEvent,
} from "./kill-switch/kill-switch.interface";
export * from "./kill-switch/safety-containment.interface";

// ─── Supabase Safety Containment (Phase 1+ production implementation) ────────
// Inject in production; use NoopSafetyContainment in dev/test.
// The safety package does NOT import @supabase/supabase-js directly.
// The infrastructure layer constructs the real client and injects it.
export {
  SupabaseSafetyContainment,
  type SupabaseServiceClient,
  type SupabaseTableClient,
  type SupabaseInsertResult,
} from "./kill-switch/supabase-safety-containment";
