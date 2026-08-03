# Open Questions — @l3arn/safety Package

_Filed by Agent 7 (L3ARN AI Safety + Moderation), Phase 0_
_Date: June 2026_

---

## OQ-001: Keyword maps should they be DB-backed?

**File:** `src/classifiers/blocked-topic.classifier.ts`

**Question:** Should the platform category keyword maps be sourced from a versioned, admin-managed database instead of being hardcoded in this package? A DB-backed list would allow rapid response to emerging threats without a deploy. However, this introduces a runtime dependency into a package that is deliberately pure/stateless.

**Impact:** Safety pipeline response time to new threats; deploy cycle dependency.

**Recommendation:** Keep hardcoded for Phase 0/1. In Phase 2, consider a versioned keyword list fetched at service startup and cached in memory, with the hardcoded list as a fallback. This preserves statelessness during a request while allowing operator updates.

**Owner:** Agent 7 / Safety Admin role (ADR-049)

---

## OQ-002: Classifier returns first match — should it return all matches?

**File:** `src/classifiers/blocked-topic.classifier.ts`

**Question:** `classifyBlockedTopics()` short-circuits on the first match. The companion boundary checker already collects all violations. For mission output (which uses the classifier directly), should we collect all blocked topics rather than stopping at the first?

**Impact:** Audit completeness vs. performance. In Phase 0 the difference is negligible, but a mission with multiple violations should ideally record all of them.

**Recommendation:** Add an `collectAll: boolean` option in Phase 1 when moderation event batching is wired.

**Owner:** Agent 7

---

## OQ-003: Notification level should be caller-determined, not inferred

**File:** `src/retry/ai-retry.helper.ts`

**Question:** The retry helper infers notification level from `SafeFallbackContext` (companion-dialogue → soft-notice; anything else → safety-alert). The caller has richer context about whether a fallback is a safety issue or a quality issue. ADR-054 has an open question on delivery mechanism — notification level assignment may need to move to the caller.

**Blocking ADR:** ADR-054 (delivery mechanism for soft-notice and safety-alert is not yet specified).

**Recommendation:** Accept an optional `notificationLevel` parameter in `withAIRetry` so callers can override the default. Implement in Phase 1 when the delivery mechanism is confirmed.

**Owner:** Agent 7 / Agent 6

---

## OQ-004: ModerationEventSchema gap — AI output vs. chat output

**File:** `src/events/moderation-event.creator.ts`

**Question:** `ModerationEventSchema` in `moderation.schema.ts` is structured around chat message moderation. It has `chatMessageId`, `roomId`, and `messageType` which do not naturally apply to AI output violations. The current implementation uses sentinel values (`"AI_OUTPUT:<triggeredBy>"` for `roomId`, `"system-message"` for `messageType`, `undefined` for `chatMessageId`).

**Impact:** DB queries against `moderation_events` that filter by `roomId` or `messageType` will not work correctly for AI output events without special-casing. Parent-facing reports that surface moderation events may show confusing data.

**Recommended fix:** In Phase 1, add a discriminated union to `ModerationEventSchema` (or a separate `AIOutputModerationEventSchema`) to cleanly represent both event types. This is a schema gap in `moderation.schema.ts` that Agent 7 cannot unilaterally change — requires Agent A (Architecture Lead) coordination per ADR-057.

**Owner:** Agent 7 (files gap) / Agent A (schema arbitration)

---

## OQ-005: Kill switch and automated S4 invocation — design tension with ADR-047

**File:** `src/kill-switch/kill-switch.interface.ts`

**Question:** ADR-047 states "no automated system may invoke a kill switch without founder approval." However, the S4 severity rule (sexual content involving minors, explicit self-harm) arguably requires immediate automated blocking — waiting for human approval is unacceptable for child safety.

**Design tension:** The safety middleware currently calls `killSwitch.trigger()` automatically on S4 detection. The NoopKillSwitch only logs — so in Phase 0, no real kill switch is triggered. When the real implementation is wired in Phase 2, this tension must be resolved.

**Recommended resolution:** Define a two-tier kill switch:
1. **Automatic session-level halt** — always fires immediately for S4, no founder approval needed. Blocks AI generation for the specific child session.
2. **Platform-wide kill switch** — requires founder approval (satisfying ADR-047). Invoked manually from Founder Mission Control dashboard (ADR-048).

This preserves the spirit of ADR-047 (no automated platform-wide halt) while ensuring child safety is protected immediately.

**Owner:** Agent 7 (files tension) / Founder review required before Phase 2 implementation.

---

## OQ-006: res.locals.childPermissions handoff from Agent 6

**File:** `services/ai-workers/src/middleware/safety.middleware.ts`

**Question:** The safety middleware expects `res.locals.childPermissions` to be populated before it runs. For companion responses, this requires fetching `ChildPermissions` from Supabase during the request. The mechanism for this lookup in the ai-workers service is not yet defined — Agent 6 (Mission Compiler) owns the child session context pipeline.

**Impact:** Companion boundary checks silently skip if `childPermissions` is absent (falls back to blocked-topic-only check). This is the conservative behavior, but it should be deliberate.

**Recommendation:** Agree on a shared session-context middleware pattern with Agent 6 before Phase 1. The middleware should be: `loadChildContext → safetyMiddleware → routeHandler`.

**Owner:** Agent 7 (safety) / Agent 6 (session context)

---

## OQ-007: crypto.randomUUID() availability — Node version requirement

**File:** `src/events/moderation-event.creator.ts`

**Question:** `generateEventId()` uses `globalThis.crypto.randomUUID()` which requires Node 18+. The Railway deployment target Node version should be pinned in `package.json` engines field or confirmed in the Railway service config.

**Recommendation:** Add `"engines": { "node": ">=18" }` to `packages/safety/package.json` and `services/ai-workers/package.json`. The `uuid` npm package (already in ai-workers dependencies) could alternatively be used for compatibility with older Node versions.

**Owner:** Agent 7 / Infrastructure (Railway config)

---

## OQ-008: /api/safety/check endpoint access control

**File:** `services/ai-workers/src/routes/moderation.route.ts`

**Question:** The POST `/api/safety/check` endpoint exposes raw classifier results including matched rule names. In Phase 0 this is acceptable (internal test use only). Before Phase 1 production deployment, this route must be protected.

**Options:**
1. Remove from production build (test-only route, excluded via NODE_ENV check)
2. Gate behind `AdminAccessRole` auth middleware (safety-admin or founder only)
3. Move to a separate internal-only service

**Recommendation:** Gate behind admin auth middleware in Phase 1. Use option (2) — consistent with the admin access model (ADR-049).

**Owner:** Agent 7 / Infrastructure

---

## Schema Gaps Discovered in moderation.schema.ts and ai.schema.ts

### moderation.schema.ts
1. **`ModerationEventSchema` does not support AI output events.** (See OQ-004 above.) Fields `chatMessageId`, `roomId`, `messageType` assume a chat message origin. AI output violations need a clean schema representation. Suggested: add `source: z.enum(["chat", "ai-output"])` discriminator field with optional chat-specific fields.

2. **`EscalationSeveritySchema` tops out at S3.** The schema defines `"S0" | "S1" | "S2" | "S3"` but the AI safety model uses S4 for critical events (sexual content involving minors, self-harm). If an AI output S4 event results in an escalation record, the schema cannot represent it accurately. Recommend adding `"S4"` to `EscalationSeveritySchema`.

3. **`AuditActionSchema` does not have an entry for AI output blocks.** Current values are chat-oriented (`chat-message-blocked`, etc.). Add `"ai-output-blocked"` and `"ai-output-safety-check-failed"` to support AI safety audit logging.

### ai.schema.ts
1. **`SafeFallbackContextSchema` is missing `"user-input"` context.** The moderation trigger source includes `"user-input"` (for chat moderation), but `SafeFallbackContextSchema` only covers AI generation contexts. If user input triggers a fallback, there is no matching SafeFallbackContext.

2. **`AIOutputEnvelopeSchema.parentVisible` is `z.boolean()` rather than `z.literal(true)`.** Based on ADR-008 and the design intent, every AI output envelope should be parent-visible. The boolean field allows `false`, which could silently create non-visible envelopes. Consider whether this should be a `z.literal(true)` invariant (like the similar field in `SafeFallbackSchema`), or whether there are legitimate cases where an envelope is not parent-visible.

---

_All open questions logged per agent_operating_rules.md ADR Protocol. These items require either founder confirmation or Agent A (Architecture Lead) arbitration before Phase 1 build. None are blockers for Phase 0 delivery._
