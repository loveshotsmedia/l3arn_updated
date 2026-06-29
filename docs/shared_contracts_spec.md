# L3ARN — Shared Contracts Specification

_Source of truth for cross-system data contracts. All schemas live in `packages/shared-types/src/`._

_Prepared: June 2026 · Grounded in: `L3ARN_MASTER_HANDOFF.md`, `architecture.md`, ADR-001 through ADR-041_

---

## Purpose

Every service in L3ARN (Vercel frontend, Railway realtime/API, Supabase, world engine) must speak the same language. These contracts prevent the most dangerous class of bug in a distributed system: silent type divergence between services that never talk to each other directly.

**Rules:**

1. Zod schemas are the single source of truth. TypeScript types are inferred from them — never written by hand.
2. Any persistent data shape that crosses a service boundary must have a schema here.
3. Privacy rules encoded as contract invariants (e.g., `noWebcam: z.literal(true)`) are non-negotiable — breaking them requires an explicit architectural review.
4. No schema may invent a concept not approved in the MASTER\_HANDOFF or architecture docs.

---

## Dependency Graph

```
identity.schema.ts            ← foundation; no external deps
    ├── mission.schema.ts     ← imports House, Grade, DeliveryMode, ApprovalMode
    ├── world-event.schema.ts ← imports House
    ├── rewards.schema.ts     ← imports House
    └── permissions.schema.ts ← imports VisibilityTierSchema

evidence.schema.ts            ← string IDs only; no cross-schema imports
parent-report.schema.ts       ← string IDs only; no cross-schema imports
moderation.schema.ts          ← string IDs only; no cross-schema imports
ai.schema.ts                  ← string IDs only; no cross-schema imports
```

No circular dependencies. `identity.schema.ts` is the root. The four right-side schemas (`evidence`, `parent-report`, `moderation`, `ai`) are fully self-contained — they reference other schema domains by string ID only, letting each service validate the referenced entity independently.

---

## Contract 1: Identity Contract (`identity.schema.ts`)

**What it covers:** Every entity that has an account, a session, or a permission in L3ARN.

**Key design decisions grounded in ADRs:**

| Schema | ADR | Rule |
|--------|-----|------|
| `AcademyIdentitySchema` | ADR-007 | Public identity = Display Name + House only. Real name never exposed in public channels. |
| `ChildPermissionsSchema` | ADR-012, ADR-027, ADR-009 | `audioEnabled` = push-to-talk only if `true`. Never always-on. `modelImprovementOptIn` defaults to `false`. |
| `ChildSessionSchema` | ADR-031 | Entry method is `"parent-launch"` or `"avatar-pin-trusted-device"`. No other entry paths. |
| `ParentConsentSchema` | COPPA baseline | Every consent is a row: type, granted/revoked, timestamp, parent account. |
| `ChatModeSchema` | ADR-006 | K-5 = `"quick-chat-only"`. Grades 6-8 = `"moderated-free-text"` with explicit parent approval. |

**Enums defined here (imported by other schemas):**
- `HouseSchema` — `"Valkryn" | "Lyrion" | "Novari" | "Cytrex"`
- `GradeSchema` — `"K" | "1" | ... | "8"`
- `ApprovalModeSchema` — `"high-control" | "balanced" | "autopilot"`
- `DeliveryModeSchema` — `"3d" | "interactive-lite" | "text-audio-offline"`

---

## Contract 2: Mission Contract (`mission.schema.ts`)

**What it covers:** The three-part constraint, mission output shape, and mission attempt records.

**Key design decisions grounded in ADRs:**

| Schema | ADR | Rule |
|--------|-----|------|
| `ParentIntentSchema` | ADR-014 | One of three required constraint dimensions. |
| `ChildPersonalizationSchema` | ADR-014 | One of three required constraint dimensions. |
| `StandardsAlignmentSchema` | ADR-013, ADR-014 | One of three required constraint dimensions. Every mission must carry a traceable mastery objective. |
| `MissionOutputSchema` | ADR-016 | All six output types are always compiled. Consumer decides which to render. |
| `EvidencePlanSchema` | ADR-026 | `noWebcam: z.literal(true)` and `noFaceCapture: z.literal(true)` are compile-time invariants. |
| `RewardPlanSchema` | ADR-011 | `masteryGated: boolean` separates effort rewards (always given) from mastery progression (conditional). |

**Conflict resolution** (ADR-015) is not encoded as a schema — it is encoded as Mission Compiler logic. The output schema simply represents the result after conflict resolution has been applied.

---

## Contract 3: World Event Contract (`world-event.schema.ts`)

**What it covers:** Every event that flows through the Railway → Supabase hybrid event-sourced world state system.

**Key design decisions grounded in ADRs:**

| Field | ADR | Rule |
|-------|-----|------|
| `reversible` | ADR-020, ADR-019 | Every persistent world change must be reversible. Events declare this explicitly. |
| `parentVisible` | ADR-008 | Events declare whether the parent's visibility tier includes this event. |
| `auditLogged: z.literal(true)` | ADR-020 | Every world event is always audit-logged. Cannot be set to `false`. |

**Pattern:** The `WorldEventSchema` is the generic envelope used by Railway for broadcast and by Supabase for persistence. Consumers parse `event.payload` using the per-type payload schemas (`RoomJoinedPayloadSchema`, `MissionCompletedPayloadSchema`, etc.) after discriminating on `event.type`.

**Event type categories:**
- Presence: `room.joined`, `room.left`, `avatar.moved`
- Mission: `mission.started`, `mission.step-completed`, `mission.completed`, `mission.abandoned`
- Economy: `moolah.earned`, `moolah.spent`, `xp.earned`, `badge.awarded`
- House: `house.points-earned`, `house.leaderboard-updated`
- Companion: `companion.bond-increased`, `companion.milestone-reached`
- Living Academy: `academy.unlock-triggered`, `academy.seasonal-event-started`, `academy.seasonal-event-ended`, `world.repair-completed`, `world.decoration-placed`

---

## Contract 4: Evidence Contract (`evidence.schema.ts`)

**What it covers:** Every structured learning event, artifact, mastery record, and portfolio item.

**Key design decisions grounded in ADRs:**

| Schema | ADR | Rule |
|--------|-----|------|
| `LearningEvidenceEventSchema` | ADR-026 | `noWebcam`, `noFaceCapture`, `noVoiceBiometrics` are all `z.literal(true)`. Non-negotiable. |
| `ArtifactSchema` | ADR-026 | `parentApproved: boolean` — highlights require parent consent before entering the portfolio. |
| `MasteryRecordSchema` | ADR-010 | Mastery is evidence-based. `evidenceEventIds` is the proof chain. |
| `PortfolioItemSchema` | ADR-026, ADR-029 | `parentConsentedAt` is required. No portfolio item without explicit parent consent. |

---

## Contract 5: Rewards Contract (`rewards.schema.ts`)

**What it covers:** Moolah wallets, ledger, XP, companion growth, badges, and House points.

**Key design decisions grounded in ADRs:**

| Schema | ADR | Rule |
|--------|-----|------|
| `MoolahLedgerEntrySchema` | ADR-011 | Immutable. `delta` is positive (earned) or negative (spent). No deletion. |
| `CompanionGrowthEventSchema` | ADR-011 | `masteryRequired: boolean` — form evolutions and milestones may gate on mastery evidence. |
| `RewardPlanSchema` (in mission) | ADR-011 | Effort rewards are unconditional. Mastery rewards require evidence. |

---

## Contract 6: Parent Report Contract (`parent-report.schema.ts`)

**What it covers:** The Unified First Learning Map and other parent-facing report types.

**Key design decisions grounded in Section 5.1 of MASTER\_HANDOFF:**

| Schema | Rule |
|--------|------|
| `LearnerCalibrationScoreSchema` | Carries a `confidence` score — L3ARN never overclaims to know a child on day one. |
| `GameProgressSummarySchema` | Separate from mastery progress — game progress and academic mastery are related but not identical (ADR-011). |
| `ParentReportSchema` | `noWebcamContent: z.literal(true)`, `noFaceCaptureContent: z.literal(true)` — reports never contain biometric content. |
| `ParentVisibilityModeSchema` | Three modes: `"full"` (K-5 default), `"summary"` (6-8 default), `"safety-override"` (always available). |

---

## Contract 7: Permissions Contract (`permissions.schema.ts`)

**What it covers:** Cross-cutting trust boundaries, data access scopes, parent visibility flags, and the admin access model.

**Key design decisions grounded in ADRs:**

| Schema | ADR | Rule |
|--------|-----|------|
| `ChildSessionScopeSchema` | ADR-031, ADR-006, ADR-060 | `canAccessParentDashboard: z.literal(false)`, `canSendPrivateMessages: z.literal(false)`, `canReadCurriculumTablesDirectly: z.literal(false)` are compile-time invariants. |
| `ParentVisibilityFlagsSchema` | ADR-008 | Reusable metadata block applied to any record that crosses into parent-visible reporting. Carries `visibilityTier` and `retentionDays`. |
| `AdminAccessRoleSchema` | ADR-049 (confirmed) | Six roles: `founder`, `safety-admin`, `support-admin`, `curriculum-admin`, `technical-admin`, `ai-agent-operator`. Role matrix is founder-confirmed June 2026. See schema comment for per-role capabilities. |
| `AdminAccessRecordSchema` | ADR-049 (provisional) | Every admin action on child data requires a logged justification before access. |
| `DataDomainSchema` | ADR-058 | Canonical nine-domain list from `architecture.md §12`. Any new domain requires a filed ADR. |

**`buildChildSessionScope` factory** — call this to produce a `ChildSessionScope` from a session's IDs. It guarantees all literal invariants are set correctly without relying on call-site discipline.

**Open questions:** ✅ Admin role matrix confirmed (ADR-049). Pending: admin session timeout duration; curriculum access enforcement mechanism (RLS vs API gateway — ADR-060).

---

## Contract 8: Moderation Contract (`moderation.schema.ts`)

**What it covers:** Quick Chat options, chat messages, pre-send moderation checks, moderation events, escalation records, and the audit log.

**Key design decisions grounded in ADRs:**

| Schema | ADR | Rule |
|--------|-----|------|
| `ChatMessageSchema` | ADR-006, ADR-007 | `noImageContent`, `noFileAttachments`, `noExternalLinks`, `noPrivateChannel`, `parentVisible`, `neverDeleted` are all `z.literal(true)` — compile-time safety invariants. |
| `ChatMessageSchema.senderAcademyIdentityId` | ADR-007 | Sender identity is Academy Display Name + House only. Real names are never stored in chat records. |
| `QuickChatOptionSchema` | ADR-006 | Pre-defined options for K-5; text is pre-approved, max 80 chars; no links, no PII possible. |
| `EscalationRecordSchema.escalatedTo` | ADR-048 (provisional) | `z.literal("founder")` — MVP always escalates to founder. Compile error if any code routes to someone else. |
| `AuditLogEntrySchema` | ADR-020 | Append-only. Every safety-relevant action is logged. `kill-switch-invoked` and `admin-data-accessed` audit actions are included for ADR-047/049. |

**`buildChatMessage` factory** — call this when constructing any chat message. It injects all six `z.literal(true)` safety invariants, preventing accidental omission.

**Escalation severity** maps to the S0–S4 model (ADR-046 provisional); only S0–S3 appear in moderation escalation records.

---

## Contract 9: AI Contract (`ai.schema.ts`)

**What it covers:** AI output validation pipeline, retry/fallback policy, safe fallback content model, AI output audit envelopes, de-identified learning events, dataset eligibility, and model improvement consent.

**Key design decisions grounded in ADRs:**

| Schema | ADR | Rule |
|--------|-----|------|
| `AI_MAX_RETRY_ATTEMPTS = 3` | ADR-054 (confirmed) | Exported constant. Hard cap — confirmed June 2026. Changing it requires a filed ADR. |
| `AIOutputResultSchema` | ADR-054 (confirmed) | Discriminated union: `"validated"` or `"failed-with-fallback"`. TypeScript exhaustiveness checking forces consumers to handle both branches. |
| `SafeFallbackSchema.isAIGenerated` | ADR-054 (confirmed) | `z.literal(false)` — compile-time invariant. Safe fallbacks are NEVER AI-generated. |
| `SafeFallbackSchema.parentVisible` | ADR-008 | `z.literal(true)` — fallback records are always accessible to parents who look (audit visibility). Separate from active notification. |
| `AIFallbackNotificationLevelSchema` | ADR-054 (confirmed) | Tiered: `"none"` \| `"soft-notice"` \| `"safety-alert"`. Active notification only when failure affects child experience, mission availability, report/evidence accuracy, safety, or requires parent action. |
| `AIOutputResultSchema` (fallback branch) `.notificationLevel` | ADR-054 (confirmed) | Uses `AIFallbackNotificationLevelSchema`. Replaces the former `parentNotificationRequired: z.literal(true)` invariant — notification is now conditional on impact. |
| `AIOutputEnvelopeSchema` (audit fields) | ADR-028 (confirmed) | Logs: `traceId`, `modelProvider`, `modelVersion`, `promptTemplateVersion`, `schemaVersion`, `safetyPolicyVersion`, `missionCompilerVersion`. Retry count in `result.attemptsUsed`; fallback in `result.status`. |
| `DeidentifiedEventSchema` | ADR-029 (confirmed) | `containsRawPii`, `containsAudioContent`, `containsFreeTextContent` all `z.literal(false)`. Rotating pseudonymous learner keys; join-back mapping stored separately with restricted access; rotation quarterly or at dataset export. |
| `ModelImprovementConsentSchema.granted` | ADR-029 (confirmed) | Default is `false`. Explicit opt-in required. Revocation is immediate. |
| `DatasetEligibilitySchema` | ADR-029 (confirmed) | Child data only enters model improvement datasets if `eligible: true`, which requires a non-null `parentConsentRecordId`. |

**Validation flow expected from consumers:**
```typescript
const envelope = await compileWithValidation(input, MissionOutputSchema);
if (envelope.result.status === "validated") {
  const mission = MissionOutputSchema.parse(envelope.result.data);
  // use mission
} else {
  const fallback = getSafeFallback(envelope.result.fallbackId);
  notifyParent(envelope.childProfileId, fallback.parentNote);
  // show fallback
}
```

**Resolved (founder-confirmed June 2026):**
1. ✅ ADR-054: 3-attempt limit confirmed. `AI_MAX_RETRY_ATTEMPTS = 3` is the hard cap.
2. ✅ ADR-054: Notification now tiered via `AIFallbackNotificationLevelSchema`. Active notification only when failure affects child experience, mission availability, report/evidence accuracy, safety, or requires parent action.
3. ✅ ADR-029: Rotating pseudonymous learner keys for learning intelligence. Production child IDs never in model-training datasets. Join-back mapping restricted-access only; rotation quarterly or at dataset export.
4. ✅ ADR-028: Envelope audit fields confirmed — see `AIOutputEnvelopeSchema`.

**Remaining open questions:**
- ADR-054: Delivery mechanism for `soft-notice` and `safety-alert` (email, in-app alert, or both) not yet specified.
- ADR-028: `modelVersion` is optional because not all providers surface the version in their API response.

---

## Contract 10: Session Contract (`session.schema.ts`)

**What it covers:** The `POST /api/sessions/start` request/response contract for parent-initiated child sessions.

**Key design decisions grounded in ADRs:**

| Schema | ADR | Rule |
|--------|-----|------|
| `StartSessionRequestSchema` | ADR-031 | Parent must own the child profile. Ownership check enforced by Railway (not client). |
| `LaunchModeSchema` | ADR-031 | `"parent_launched"` only in Phase 0. `"trusted_device_pin"` is scaffolded; returns 400 if requested. |
| `StartSessionResponseSchema.childSessionToken` | ADR-031 | Token is OPAQUE — `crypto.randomUUID()`. MUST NOT equal `childProfileId`. |
| `AcademyIdentityResponseSchema` | ADR-007 | Response carries display name + house only. No legal name, no PII. |

**Token rules:**
- `childSessionToken` is stored in `child_sessions.session_token` (TEXT NOT NULL UNIQUE)
- Default session duration: 2 hours for `parent_launched`
- Railway rejects any API call where `expires_at < now()` OR `revoked_at IS NOT NULL`

**Dependency:** `session.schema.ts` has no imports from other schema files — fully self-contained.

---

## Adding New Schemas

1. Ground every field in an approved ADR or the MASTER\_HANDOFF data model.
2. Infer the TypeScript type from the Zod schema — do not write `interface` or `type` by hand.
3. If the schema crosses a service boundary, add it to this spec doc.
4. If the schema encodes a non-negotiable rule (privacy, safety, audit), encode it as a `z.literal(true)` or constrained type — not as a comment.
5. Export the schema and its inferred type from `packages/shared-types/src/index.ts`.
6. Update the dependency graph above if the new schema imports from another schema file.
7. If the schema encodes a rule that is Provisional (ADR-04x or ADR-05x range), add an Open Questions note in the schema file and a corresponding entry in the "Needs Source Confirmation" section of `docs/ADR/ADR-000-index.md`.

---

_Source: `docs/source/L3ARN_MASTER_HANDOFF.md` · ADR-006, ADR-007, ADR-008, ADR-010, ADR-011, ADR-012, ADR-013, ADR-014, ADR-016, ADR-019, ADR-020, ADR-026, ADR-027, ADR-028, ADR-029, ADR-030, ADR-031, ADR-049 (provisional — session timeout pending), ADR-053 (provisional), ADR-054, ADR-058, ADR-060 (provisional)_
