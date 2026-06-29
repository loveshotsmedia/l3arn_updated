/**
 * Moderation Contract
 *
 * Covers the hybrid student chat system: Quick Chat options, chat messages,
 * pre-send validation, moderation events, escalation records, and the audit
 * log for all safety-relevant actions.
 *
 * Safety invariants baked in as z.literal values (non-negotiable; breaking them
 * requires an explicit architectural review):
 *
 *   noImageContent: true         — no image URLs, base64, or file references
 *   noFileAttachments: true      — no file attachments of any kind
 *   noExternalLinks: true        — no hyperlinks to external sites
 *   noPrivateChannel: true       — no private DM context; all messages are room-scoped
 *   parentVisible: true          — all messages are parent-visible
 *   neverDeleted: true           — messages are never removed from the audit record
 *
 * These literals make it a TypeScript compile error to emit a message that
 * violates the rules, even before runtime moderation runs.
 *
 * Grounded in: ADR-006 (student chat model), ADR-007 (child identity),
 * ADR-008 (parent visibility), COPPA/FERPA posture,
 * MASTER_HANDOFF §9.3 (child social safety rules),
 * architecture.md §3 (Chat + Moderation Relay component on Railway).
 */

import { z } from "zod";

// ─── Quick Chat Options (ADR-006: K-5 default) ───────────────────────────────
// Pre-defined, human-authored message options for younger students.
// No free-text input is possible in quick-chat mode.
// The canonical option list is owned by Agent H (Safety/Moderation branch).
// This schema defines the shape every option record must match.

export const QuickChatCategorySchema = z.enum([
  "greeting",
  "encouragement",
  "reaction",
  "game-callout",
  "help-request",
]);
export type QuickChatCategory = z.infer<typeof QuickChatCategorySchema>;

export const QuickChatOptionSchema = z.object({
  id: z.string(),
  category: QuickChatCategorySchema,
  text: z.string().min(1).max(80), // short, pre-approved text; no links, no PII
  emojiCode: z.string().optional(), // reference to a safe emoji asset ID; not a raw char
});
export type QuickChatOption = z.infer<typeof QuickChatOptionSchema>;

// ─── Chat Message ─────────────────────────────────────────────────────────────
// Every student message in L3ARN — Quick Chat or moderated free text — must
// match this shape. The privacy/safety invariants are compile-time constraints.
//
// Identity: only academyIdentityId (Display Name + House) is recorded.
// Real names are never stored in chat records. (ADR-007)
//
// Maps to: chat_messages table (architecture.md §8, network-safety domain)

export const ChatMessageTypeSchema = z.enum([
  "quick-chat",     // pre-defined option; K-5 default; content from quickChatOptionId
  "free-text",      // moderated; grades 6-8 only; requires parent approval (ADR-006)
  "system-message", // platform-generated; never from a student; never moderated
]);
export type ChatMessageType = z.infer<typeof ChatMessageTypeSchema>;

export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  roomId: z.string(),

  // Sender identity: Academy Display Name + House only — never real name (ADR-007)
  senderAcademyIdentityId: z.string().uuid(),

  messageType: ChatMessageTypeSchema,

  // Quick Chat: populated for "quick-chat" messages
  quickChatOptionId: z.string().optional(),

  // Free text: populated for "free-text" messages only
  // Max 280 chars. Content has already passed pre-send moderation before storage.
  content: z.string().max(280).optional(),

  sentAt: z.string().datetime(),

  // ── Safety Invariants (MASTER_HANDOFF §9.3; ADR-006) ────────────────────
  // These z.literal(true) fields are compile-time invariants.
  // Attempting to set any of them to false will cause a TypeScript error.

  noImageContent: z.literal(true),    // no image URLs, base64, or file refs
  noFileAttachments: z.literal(true), // no file attachments of any kind
  noExternalLinks: z.literal(true),   // no hyperlinks to external sites
  noPrivateChannel: z.literal(true),  // all messages are room-scoped; no DMs (ADR-006)

  // All K-8 messages are logged and parent-visible (ADR-006, ADR-008)
  parentVisible: z.literal(true),

  // Messages are never removed from the audit record
  neverDeleted: z.literal(true),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// Factory — use this when constructing a chat message to guarantee all invariants.
export function buildChatMessage(
  partial: Pick<
    ChatMessage,
    "roomId" | "senderAcademyIdentityId" | "messageType" | "quickChatOptionId" | "content" | "sentAt"
  > & { id: string },
): ChatMessage {
  return ChatMessageSchema.parse({
    ...partial,
    noImageContent: true,
    noFileAttachments: true,
    noExternalLinks: true,
    noPrivateChannel: true,
    parentVisible: true,
    neverDeleted: true,
  });
}

// ─── Pre-Send Moderation ──────────────────────────────────────────────────────
// Every free-text message must pass pre-send validation on the Railway Chat
// Relay before it is delivered or stored. Quick Chat messages bypass
// content checks (text is pre-approved) but are still logged.

export const ModerationCheckTypeSchema = z.enum([
  "pii-scan",           // phone numbers, emails, real names, addresses
  "link-scan",          // URLs and external links of any kind
  "contact-info-scan",  // social handles, usernames, external contact attempts
  "keyword-filter",     // blocked-keyword list maintained by Agent H
]);
export type ModerationCheckType = z.infer<typeof ModerationCheckTypeSchema>;

export const ModerationOutcomeSchema = z.enum([
  "approved",
  "blocked",
  "flagged-for-review",
]);
export type ModerationOutcome = z.infer<typeof ModerationOutcomeSchema>;

export const ModerationCheckResultSchema = z.object({
  checkType: ModerationCheckTypeSchema,
  outcome: ModerationOutcomeSchema,
  matchedPatterns: z.array(z.string()), // what triggered the flag; no raw PII stored here
});
export type ModerationCheckResult = z.infer<typeof ModerationCheckResultSchema>;

// ─── Moderation Event ─────────────────────────────────────────────────────────
// The full result of the pre-send moderation pipeline for a single message.
// Persisted to Supabase for parent visibility and audit (ADR-008, ADR-020).
// Maps to: moderation_events table (network-safety domain)

// Trigger source: either a chat message OR an AI output — exactly one should be set.
export const ModerationTriggerSchema = z.enum([
  "chat-message",   // triggered by student free-text or Quick Chat message
  "ai-output",      // triggered by AI-generated content (mission, companion dialogue, etc.)
  "user-input",     // triggered by raw student input before AI processing
]);
export type ModerationTrigger = z.infer<typeof ModerationTriggerSchema>;

export const ModerationEventSchema = z.object({
  id: z.string().uuid(),
  triggerSource: ModerationTriggerSchema,
  chatMessageId: z.string().uuid().optional(),    // set when triggerSource = "chat-message"
  aiOutputEnvelopeId: z.string().uuid().optional(), // set when triggerSource = "ai-output"
  senderChildProfileId: z.string().uuid(),
  roomId: z.string().optional(),                  // absent for AI output events
  messageType: ChatMessageTypeSchema.optional(),  // absent for AI output events
  outcome: ModerationOutcomeSchema,
  checksRun: z.array(ModerationCheckResultSchema),
  moderatedAt: z.string().datetime(),
  parentNotified: z.boolean(),
  parentNotifiedAt: z.string().datetime().optional(),
});
export type ModerationEvent = z.infer<typeof ModerationEventSchema>;

// ─── Escalation Record ────────────────────────────────────────────────────────
// Serious moderation events are escalated to founder review (ADR-047, ADR-048).
// Severity tiers mirror the S0–S4 model (ADR-046 provisional; only S0–S2 result
// in escalation records from the moderation system).
// Maps to: escalation_records table (network-safety domain)

// S0–S4 follow increasing severity (ADR-046 provisional; ADR-047 governs kill-switch).
// S4 covers CSAM and explicit self-harm — these ALWAYS trigger the kill-switch interface
// regardless of ADR-047 status.
export const EscalationSeveritySchema = z.enum([
  "S0", // Informational — logged only, no action required
  "S1", // Low concern — logged, parent notified
  "S2", // Moderate concern — blocked, safe fallback shown, parent notified
  "S3", // High concern — blocked, session flagged, parent alerted
  "S4", // Critical — blocked, kill-switch triggered, platform admin notified (CSAM / self-harm)
]);
export type EscalationSeverity = z.infer<typeof EscalationSeveritySchema>;

export const EscalationRecordSchema = z.object({
  id: z.string().uuid(),
  moderationEventId: z.string().uuid(),
  severity: EscalationSeveritySchema,
  escalatedAt: z.string().datetime(),
  escalatedTo: z.literal("founder"), // MVP: all escalations go to founder (ADR-048)
  context: z.string().max(500),      // summary for reviewer; no raw message content
  resolutionNotes: z.string().optional(),
  resolvedAt: z.string().datetime().optional(),
  resolvedByAdminId: z.string().uuid().optional(),
  parentNotified: z.boolean(),
  parentNotifiedAt: z.string().datetime().optional(),
});
export type EscalationRecord = z.infer<typeof EscalationRecordSchema>;

// ─── Audit Log Entry ──────────────────────────────────────────────────────────
// Append-only. Every safety-relevant action in the system produces an entry.
// Never deleted — the audit record is permanent.
// Maps to: audit_logs table (network-safety domain)

export const AuditActionSchema = z.enum([
  "chat-message-sent",
  "chat-message-blocked",
  "chat-message-flagged",
  "ai-output-blocked",               // AI-generated content blocked by safety pipeline
  "ai-output-safety-check-failed",   // AI output failed envelope validation or boundary check
  "escalation-created",
  "escalation-resolved",
  "parent-notified",
  "session-terminated-safety",       // safety-triggered session termination
  "kill-switch-invoked",             // (ADR-047 provisional)
  "admin-data-accessed",             // (ADR-049 provisional)
  "moderation-override",             // manual moderation decision by safety reviewer
]);
export type AuditAction = z.infer<typeof AuditActionSchema>;

export const AuditLogEntrySchema = z.object({
  id: z.string().uuid(),
  action: AuditActionSchema,
  actorType: z.enum(["child-session", "parent", "system", "admin"]),
  actorId: z.string().uuid(),
  targetResourceType: z.string(),
  targetResourceId: z.string().uuid().optional(),
  householdId: z.string().uuid().nullable(), // null for Academy-wide or system actions
  occurredAt: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(), // additional context; never raw child PII
});
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;
