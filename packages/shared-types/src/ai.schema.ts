/**
 * AI Contract
 *
 * Covers the AI output validation pipeline, retry/fallback policy, safe
 * fallback content model, AI output audit envelopes, de-identified learning
 * events, dataset eligibility, and model improvement consent.
 *
 * Validation policy (ADR-054 — confirmed June 2026):
 *   1. Validate AI output against target schema
 *   2. If validation fails, regenerate — up to 3 attempts total (hard cap)
 *   3. If all 3 attempts fail, use a pre-defined safe fallback
 *   4. Safe fallbacks are NEVER AI-generated (z.literal(false) invariant)
 *   5. Parent notification level depends on whether the failure affects child experience
 *
 * De-identification rules (ADR-029, ADR-028 — confirmed June 2026):
 *   - No raw child PII enters the learning intelligence pipeline
 *   - Production child ID replaced with a rotating pseudonymous learner key
 *   - Join-back mapping stored separately in a restricted-access table; not
 *     available to model-training jobs; rotation quarterly or at dataset export
 *   - Only structured interaction signals — no free text, no audio content
 *   - Model improvement requires explicit parent opt-in; default is opted out
 *
 * Grounded in: ADR-028 (AI model strategy), ADR-029 (model improvement opt-out),
 * ADR-054 (AI output validation/retry/fallback),
 * MASTER_HANDOFF §9.2 (hard privacy rules), MASTER_HANDOFF §10 (data model),
 * architecture.md §10 (AI model strategy), architecture.md §11 (AI output rules),
 * architecture.md §12 (learning intelligence domain).
 */

import { z } from "zod";

// ─── Retry Policy Constants ───────────────────────────────────────────────────
// These are constants, not configuration — they are part of the contract.
// Changing AI_MAX_RETRY_ATTEMPTS requires a filed ADR.

export const AI_MAX_RETRY_ATTEMPTS = 3 as const;

// ─── Validation Attempt Record ────────────────────────────────────────────────
// One record per failed validation attempt. Populated before fallback is used.

export const AIValidationAttemptSchema = z.object({
  attemptNumber: z.number().int().min(1).max(AI_MAX_RETRY_ATTEMPTS),
  failureReason: z.string(),       // human-readable; logged for debugging
  failedAt: z.string().datetime(),
});
export type AIValidationAttempt = z.infer<typeof AIValidationAttemptSchema>;

// ─── Fallback Notification Level ─────────────────────────────────────────────
// Governs whether and how parents are notified when a safe fallback is used.
// Not every fallback warrants active notification — only failures that affect
// the child's experience, mission availability, report accuracy, or safety.
//
// none:          Fallback used invisibly; no child/session impact; internal repair succeeded
//                from the child's perspective. No active parent notification sent.
// soft-notice:   Fallback visible to child (e.g. simplified mission, delayed report section).
//                Parent informed in-app or in next report.
//                Example: "L3ARN adjusted this mission to a safe approved version because
//                the original AI-generated version did not pass quality checks."
// safety-alert:  Unsafe AI output detected, parent boundary violated, child-facing response
//                blocked, or evidence/report integrity affected. Immediate parent notification.

export const AIFallbackNotificationLevelSchema = z.enum([
  "none",
  "soft-notice",
  "safety-alert",
]);
export type AIFallbackNotificationLevel = z.infer<typeof AIFallbackNotificationLevelSchema>;

// ─── AI Output Result ─────────────────────────────────────────────────────────
// Discriminated union that ALL AI output consumers must accept.
// Consumers must handle both branches — TypeScript exhaustiveness checking
// ensures the fallback path is never silently ignored.
//
// Usage:
//   const result = await validateAIOutput(rawOutput, MissionOutputSchema);
//   if (result.status === 'validated') {
//     use(result.data);
//   } else {
//     showFallback(result.fallbackId);
//   }

export const AIOutputResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("validated"),
    data: z.unknown(),   // strongly typed by each consumer's target schema
    attemptsUsed: z.number().int().min(1).max(AI_MAX_RETRY_ATTEMPTS),
    validatedAt: z.string().datetime(),
  }),
  z.object({
    status: z.literal("failed-with-fallback"),
    attemptsUsed: z.literal(3),
    attempts: z.array(AIValidationAttemptSchema).length(3),
    fallbackId: z.string(),                   // references a SafeFallbackSchema record
    fallbackUsedAt: z.string().datetime(),
    notificationLevel: AIFallbackNotificationLevelSchema, // see AIFallbackNotificationLevelSchema
  }),
]);
export type AIOutputResult = z.infer<typeof AIOutputResultSchema>;

// ─── Safe Fallback ────────────────────────────────────────────────────────────
// Pre-defined, human-authored content used when AI generation fails all retries.
// These are a static library — they are NEVER AI-generated.
// isAIGenerated: z.literal(false) is a compile-time invariant.

export const SafeFallbackContextSchema = z.enum([
  "mission-generation",    // Mission Compiler failed; pre-built starter mission used
  "mission-step",          // One step failed; simplified static alternative shown
  "companion-dialogue",    // Companion AI failed; pre-written dialogue shown
  "parent-plan",           // Parent plan generation failed; generic template shown
  "evidence-summary",      // Evidence summary failed; placeholder shown
  "calibration-summary",   // Calibration narrative failed; generic progress note shown
  "user-input",            // Input moderation fallback; safe guided response shown
]);
export type SafeFallbackContext = z.infer<typeof SafeFallbackContextSchema>;

export const SafeFallbackSchema = z.object({
  id: z.string(),
  context: SafeFallbackContextSchema,
  title: z.string(),
  content: z.string(),
  parentNote: z.string(),          // plain-language note explaining what happened
  parentVisible: z.literal(true),  // fallback usage is always parent-visible
  isAIGenerated: z.literal(false), // invariant: safe fallbacks are NEVER AI-generated
});
export type SafeFallback = z.infer<typeof SafeFallbackSchema>;

// ─── AI Output Envelope ───────────────────────────────────────────────────────
// Every AI-generated artifact that crosses a service boundary must travel in
// this envelope. It records the validation result, the model provider, and
// the full audit trail required by ADR-028 (confirmed June 2026).
// Consumers must inspect result.status before using data.
//
// Retry count and fallback status are captured in result.attemptsUsed and result.status.
// Maps to: AI output audit log (learning-intelligence domain)

export const AIOutputEnvelopeSchema = z.object({
  id: z.string().uuid(),
  traceId: z.string().uuid(),           // unique trace ID for cross-service debugging
  generationContext: z.string(),        // e.g. "mission-compiler", "companion-dialogue"
  childProfileId: z.string().uuid(),
  childSessionId: z.string().uuid().optional(),
  requestedAt: z.string().datetime(),
  result: AIOutputResultSchema,
  modelProvider: z.string(),            // e.g. "anthropic", "openai" — provider, not model
  modelVersion: z.string().optional(),  // model name + version if available
  promptTemplateVersion: z.string().optional(),  // version of the prompt template used
  schemaVersion: z.string(),            // version of the validation schema applied
  safetyPolicyVersion: z.string().optional(),    // safety policy version; populated when applicable
  missionCompilerVersion: z.string().optional(), // populated when generationContext is mission-related
  parentVisible: z.boolean(),
});
export type AIOutputEnvelope = z.infer<typeof AIOutputEnvelopeSchema>;

// ─── De-identified Learning Event ─────────────────────────────────────────────
// Structured interaction signals that may enter the learning intelligence
// pipeline for future model improvement — subject to opt-in.
//
// De-identification rules (all enforced as z.literal invariants):
//   - containsRawPii: false         — no name, DOB, email, address, household ID
//   - containsAudioContent: false   — push-to-talk audio is never included
//   - containsFreeTextContent: false — free text from chat or artifacts is never included
//   - Only structured, categorical signals (step type, outcome, time buckets)
//
// Maps to: deidentified_events table (learning-intelligence domain)

export const DeidentifiedEventTypeSchema = z.enum([
  "mission-step-interaction", // step type, interaction type, outcome, time-on-task bucket
  "delivery-mode-choice",     // which delivery mode the student selected
  "hint-requested",           // hint usage signal (boolean + sequence position)
  "persistence-signal",       // time-on-task / retry count (bucketed, not exact)
  "mastery-signal",           // mastery achieved / not achieved (no skill name in record)
  "calibration-signal",       // which calibration stage, no identifying data
]);
export type DeidentifiedEventType = z.infer<typeof DeidentifiedEventTypeSchema>;

export const DeidentifiedEventSchema = z.object({
  id: z.string().uuid(),

  // De-identification: no real child profile ID, no household ID.
  // deidentifiedTokenId is a rotating pseudonymous learner key issued by the
  // learning intelligence domain. It cannot be joined back to a production child
  // record by model-training or analytics systems. The join-back mapping between
  // child profile ID and pseudonymous learner key is stored in a separate,
  // restricted-access table that is not available to model-training jobs.
  // Rotation occurs quarterly or at each dataset export boundary. (ADR-029)
  deidentifiedTokenId: z.string(),

  eventType: DeidentifiedEventTypeSchema,
  gradeLevel: z.string(),  // e.g. "K", "3" — cohort-level signal, not individual

  // Structured categorical features only; no free text, no audio, no PII
  features: z.record(z.union([z.string(), z.number(), z.boolean()])),

  occurredAt: z.string().datetime(),
  datasetEligibilityId: z.string().uuid(), // links to the consent record that authorized this

  // De-identification invariants — compile-time constraints
  containsRawPii: z.literal(false),
  containsAudioContent: z.literal(false),
  containsFreeTextContent: z.literal(false),
});
export type DeidentifiedEvent = z.infer<typeof DeidentifiedEventSchema>;

// ─── Dataset Eligibility ──────────────────────────────────────────────────────
// Whether data from a specific child profile may enter model improvement
// datasets. Eligibility = parent opt-in + active consent version.
// Default state is not eligible. Parent revocation takes effect immediately.
// Maps to: dataset_eligibility table (learning-intelligence domain)

export const DatasetEligibilitySchema = z.object({
  id: z.string().uuid(),
  childProfileId: z.string().uuid(),
  householdId: z.string().uuid(),
  eligible: z.boolean(),               // true only with parent model improvement opt-in
  parentConsentRecordId: z.string().uuid().nullable(), // null when opted out
  datasetVersionId: z.string(),        // which training dataset version this consent covers
  assessedAt: z.string().datetime(),
  revokedAt: z.string().datetime().optional(), // set when parent opts out
});
export type DatasetEligibility = z.infer<typeof DatasetEligibilitySchema>;

// ─── Model Improvement Consent ────────────────────────────────────────────────
// Explicit parent consent record for model improvement participation.
// Separate from base COPPA data-collection consent. (ADR-029)
// Parents can fully opt out at any time; revocation is immediate.
// Safe default: not granted.
// Maps to: model_improvement_consent table (learning-intelligence domain)

export const ModelImprovementConsentSchema = z.object({
  id: z.string().uuid(),
  parentAccountId: z.string().uuid(),
  childProfileId: z.string().uuid(),
  granted: z.boolean(),                   // false = opted out (safe default)
  grantedAt: z.string().datetime().nullable(),
  revokedAt: z.string().datetime().nullable(),
  consentVersion: z.string(),             // versioned so updates can require re-consent
  scopeDescription: z.string(),           // plain-language description of what was consented to
});
export type ModelImprovementConsent = z.infer<typeof ModelImprovementConsentSchema>;

// ─── Resolved Questions (June 2026 — founder-confirmed) ──────────────────────
// 1. ✅ ADR-054: 3-attempt limit is confirmed. AI_MAX_RETRY_ATTEMPTS = 3 is the hard cap.
//    After 3 failed attempts: use safe fallback, log failure, add to troubleshooting backlog.
// 2. ✅ ADR-054: Notification is tiered via AIFallbackNotificationLevelSchema, not always-on.
//    Notify only when failure affects child experience, mission availability, report/evidence
//    accuracy, safety, or requires parent action. See AIFallbackNotificationLevelSchema.
// 3. ✅ ADR-029: Rotating pseudonymous learner keys used in learning intelligence datasets.
//    Production child IDs never enter model-training datasets. Join-back mapping stored
//    separately with restricted access. Rotation: quarterly or at dataset export boundary.
// 4. ✅ ADR-028: AI envelopes log provider, model name/version, prompt template version,
//    schema version, safety policy version, mission compiler version, trace ID, and timestamp.
//    Retry count and fallback status captured in result.attemptsUsed / result.status.
//
// ─── Remaining Open Questions ─────────────────────────────────────────────────
// • ADR-054: Parent notification delivery mechanism (email, in-app alert, or both)
//   for soft-notice and safety-alert levels is not yet specified.
// • ADR-028: Model version logging guarantee — modelVersion is optional because not
//   all providers surface the version in their API response. Implementation must log
//   what is available and flag when absent.
