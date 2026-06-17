# L3ARN Open Questions — Phase 0 Build Wave 1

Aggregated from Agents 4, 5, 6, and 7 after the first parallel build wave.
Each item needs a decision before the relevant Sprint 2 work begins.

---

## Critical (block Sprint 2 work)

### ADR-047 vs S4 Kill-Switch Conflict
**Source:** Agent 7 (OQ-005)
**Filed:** 2026-06-16

ADR-047 says "no automated kill switch." But S4 severity events (CSAM, explicit self-harm) require immediate automated blocking — by definition these cannot wait for a human review step. The current implementation includes a `KillSwitchTrigger` interface and `NoopKillSwitch` placeholder. The founding team must resolve whether:
- ADR-047 is amended to carve out S4 events, OR
- A "graduated automated response" is defined (auto-block session, human review within N minutes for escalation)

**Blocks:** Any S4 event handling. Currently the NoopKillSwitch just logs.

---

### ADR-054: Retry Count and Fallback Notification Mechanism
**Source:** Agents 6, 7 (OQ-007)
**Filed:** 2026-06-16

ADR-054 is provisional. The 3-retry constant (`AI_MAX_RETRY_ATTEMPTS = 3`) is applied but needs founding-team source confirmation. More importantly, the parent notification mechanism when a safe fallback is used (email, in-app alert, or both) is not yet specified. The Mission Compiler logs a warning but does not send a notification.

**Blocks:** Parent notification flows in Sprint 2.

---

### Model Version Configuration
**Source:** Agent 6 (OQ-003)
**Filed:** 2026-06-16

The Mission Compiler hardcodes `claude-3-5-sonnet-20241022` as the model. This must be an environment variable or ADR before Sprint 2, as model versions change and the choice affects cost, latency, and output quality.

**Recommendation:** Add `ANTHROPIC_MODEL` Railway env var; default to `claude-sonnet-4-6`.

---

## Architecture Decisions Needed

### Vite vs Next.js App Router
**Source:** Agents 4, 5
**Filed:** 2026-06-16

The L3ARN repo now has BOTH structures:
- `apps/web/src/app/` — Next.js 14 App Router (Agent 4, recommended by spec)
- `apps/web/src/pages/` — Vite/React Router component copies (Agent 5 originals, now superseded)

**Decision needed:** Confirm Next.js 14 App Router as the canonical frontend. The `src/pages/student/` directory can be deleted once confirmed. The `src/app/(student)/` routes are the active ones.

---

### Prompt Format: Raw JSON vs. Claude Tool Use (Structured Output)
**Source:** Agent 6 (OQ-002)
**Filed:** 2026-06-16

The Mission Compiler currently asks Claude to return raw JSON in its text response, then calls `JSON.parse()`. A JSON parse error counts as a retry attempt. Using Claude's `tool_use` / structured output would eliminate this failure mode entirely. The tradeoff is slightly more complex prompt engineering.

**Recommendation:** Switch to `tool_use` structured output before Sprint 2 load testing.

---

### `house_affiliation` Field Location
**Source:** Agent 5
**Filed:** 2026-06-16

`ChildProfileSchema` in `identity.schema.ts` does NOT have a `house_affiliation` field. House lives on `AcademyIdentitySchema.house`. The correct Supabase write target for house selection is `academy_identities.house`, not `child_profiles`. The student onboarding write is currently a placeholder console.log.

**Action required:** Agent D (Supabase/Data) confirm: is `academy_identities.house` the correct write path? Is there a `sorting_pending` state needed pre-Sorting Ceremony?

---

### `academy_identities.house` NOT NULL Before Sorting Ceremony
**Source:** Agent 4 (OQ-PARENT-001)
**Filed:** 2026-06-16

`academy_identities.house` is `NOT NULL` in the DB schema, but house is unknown until the Sorting Ceremony. The onboarding flow currently inserts a placeholder `"Novari"`.

**Options:**
- (a) Make `house` nullable with a `sorting_pending` boolean
- (b) Add a `pre_sorting` enum value to `HouseSchema`
- (c) Defer `academy_identities` row creation until after the Sorting Ceremony

---

## Schema Gaps

### `ModerationEventSchema` — Chat vs AI Output Mismatch
**Source:** Agent 7 (OQ-004)
**Filed:** 2026-06-16

`ModerationEventSchema` was originally designed for chat moderation. Agent 7 added `triggerSource` + `aiOutputEnvelopeId` to support AI output events, making `roomId` and `messageType` optional. The discriminated union approach (one schema per trigger type) would be cleaner but is deferred to Phase 1.

**Current state:** Schema extended with `triggerSource` enum. Sentinel values no longer needed.

---

### `CalibrationSignal` Canonical Location
**Source:** Agent 6 (OQ-004)
**Filed:** 2026-06-16

`CalibrationSignal` is now in `packages/shared-types/src/calibration.schema.ts` (resolved in this build wave). The `mission-compiler` package should be updated to import from `@l3arn/shared-types` instead of its local definition.

**Action:** Update `packages/mission-compiler/src/outputs/calibration-signals.ts` to import `CalibrationSignal` from `@l3arn/shared-types` in Sprint 2.

---

### `focus_subjects` Not in DB Schema
**Source:** Agent 4 (OQ-PARENT-005)
**Filed:** 2026-06-16

The curriculum setup onboarding step captures `focusSubjects` in the UI, but `child_permissions` has no `focus_subjects` column. The data is captured but not persisted.

**Action required:** Add `focus_subjects jsonb` column to `child_permissions`, OR create a new `parent_curriculum_prefs` table.

---

## Implementation Placeholders (Wire in Sprint 2)

### Supabase Writes in Student Onboarding
**Source:** Agent 5
All student onboarding Supabase writes (house selection → `academy_identities`, companion selection → `companion_configs`) are `console.log` placeholders. They require an authenticated child session ID and Supabase client scoped to `ChildSessionScope`.

### Parent Notification on AI Fallback
**Source:** Agents 6, 7
When `result.status === "failed-with-fallback"`, the Mission Compiler and safety middleware log a warning but do not notify the parent. The notification mechanism (email, in-app) is TBD per ADR-054.

### `/api/safety/check` Admin Auth Gate
**Source:** Agent 7 (OQ-008)
The `POST /api/safety/check` endpoint is for internal testing only. It must have an admin auth gate before Phase 1 production. Currently it is unprotected.

### Child Session Verification on `/student/enter`
**Source:** Agent 5
The `EnterAcademy` page reads `displayName` from `localStorage`. In production it must verify a valid `child_sessions` row in Supabase before rendering. `localStorage` is a placeholder until the session model (ADR-031) is wired.

### Grade-based `parentVisibilityTier` Default
**Source:** Agent 4 (OQ-PARENT-004)
`parentVisibilityTier` should default to `"full"` for K-5 and `"summary"` for grades 6-8. This logic belongs in a DB trigger or Railway function that fires after `child_profiles` INSERT. Currently defaults to `"full"` for all grades.

### Onboarding State Token
**Source:** Agent 4 (OQ-PARENT-002)
`child_profile_id` is passed through the onboarding flow via `sessionStorage`. This is fragile across tab refreshes. Replace with a server-side onboarding token or URL param in Sprint 2.

### Avatar Move-To Wiring (World Engine)
**Source:** Agent 5
`PlayerAvatar.tsx` has a lerp-based `moveTo` target but it is not yet wired to the floor-click `avatar-move-requested` WorldEvent. Needs a zustand store or imperative ref callback.

### Scene Transition Animations
**Source:** Agent 5
`WorldCanvas` hard-swaps scenes. Fade-in/out transitions are a placeholder for Sprint 2.

### `crypto.randomUUID()` — Node 18+ Requirement
**Source:** Agent 7 (OQ-007)
`moderation-event.creator.ts` uses `crypto.randomUUID()`. The Node engines field in `services/ai-workers/package.json` must be pinned to `>=18.0.0`. Currently only the root `package.json` specifies `node: ">=18.0.0"`.

---

## ADR Status

| ADR | Topic | Status |
|-----|-------|--------|
| ADR-029 | Model improvement opt-out | Applied — safe default = opted out ✓ |
| ADR-047 | Kill-switch policy | Conflict with S4 — needs founding team resolution |
| ADR-054 | AI retry/fallback | Provisional — retry count and notification TBD |
| ADR-028 | AI model strategy | Model version hardcoded — needs env var |
| ADR-031 | Child session auth | Not yet implemented — placeholder localStorage |
| ADR-006 | Student chat model | Schema updated for AI output events ✓ |
