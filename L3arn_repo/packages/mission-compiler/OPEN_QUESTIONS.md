# Mission Compiler — Open Questions

_Filed by Agent 6, Phase 0 — June 2026_

---

## OQ-001: Retry delay / backoff between AI attempts

**File:** `src/retry/retry-engine.ts`

**Question:** Should retry attempts use a delay (e.g. 500ms, 1000ms exponential backoff) between calls to Claude? Currently no delay is added between attempts. If Claude rate-limits under burst load, a brief delay between retries would reduce failure cascades.

**Needs:** Decision before production load testing. If backoff is adopted, add a `retryDelayMs` config option to `withAIRetry`.

---

## OQ-002: AI prompt format — structured output vs. raw JSON in text

**File:** `src/prompts/mission-001.prompt.ts`

**Question:** The prompt currently asks Claude to return raw JSON in the text content block. Claude's tool_use / response_format API supports structured JSON output natively, which eliminates JSON parse errors as a source of retry failures. Should Mission 001 be refactored to use tool_use structured output?

**Needs:** Decision on whether to adopt structured output for the mission compiler. If yes, the prompt template and the `generate()` function in `compiler.ts` must be updated, and `promptTemplateVersion` bumped to `0.2.0`.

---

## OQ-003: Model version hardcoded — needs config or ADR

**File:** `src/compiler.ts`

**Question:** `MODEL_VERSION = "claude-3-5-sonnet-20241022"` is hardcoded. If the project adopts a model alias pointing to the latest Sonnet, or upgrades to a newer model family, this constant needs updating. There is no ADR covering which Claude model version the Mission Compiler should target.

**Needs:** ADR covering Mission Compiler model selection policy. Should this be a Railway env var (`MISSION_COMPILER_MODEL`) so it can be changed without a code deploy?

---

## OQ-004: CalibrationSignal not in shared-types

**File:** `src/outputs/calibration-signals.ts`

**Question:** `CalibrationSignal` is defined locally in this package. If the learner-model agent (or Agent D / data agent) defines a canonical `CalibrationSignalSchema` or `CalibrationEventSchema` in `@l3arn/shared-types`, this local definition should be replaced with an import.

**Needs:** Coordination with the learner-model / data agent to confirm the canonical location of calibration signal types.

---

## OQ-005: ParentReportSeed not in shared-types

**File:** `src/compiler.ts`

**Question:** `ParentReportSeed` is defined locally in the compiler output type. If the parent-report agent defines a canonical schema in `@l3arn/shared-types`, this interface should be replaced with an import.

**Needs:** Coordination with the parent-report agent to confirm the canonical shape.

---

## OQ-006: AIOutputEnvelopeSchema validation — `childSessionId` is optional

**File:** `src/compiler.ts`

**Question:** `AIOutputEnvelopeSchema.childSessionId` is `z.string().uuid().optional()`. In Phase 0 (mock data), there is no real child session ID. When DB integration lands in Phase 1, the session ID should be required for all mission compile calls (a mission always runs inside a session). The schema should be updated to `z.string().uuid()` (required) at that point.

**Needs:** Phase 1 DB integration — update `childSessionId` to required and add session lookup to the mission route.

---

## OQ-007: ADR-054 notification delivery mechanism undefined

**File:** `src/compiler.ts`, `src/retry/retry-engine.ts`

**Question:** ADR-054 confirmed that fallback notifications use the tiered `AIFallbackNotificationLevelSchema` (`none | soft-notice | safety-alert`), but the delivery mechanism (email, in-app alert, or both) is not yet specified. The compiler currently logs a `console.warn` and marks the notification level in the envelope, but does not send any notification.

**Needs:** ADR-054 completion — delivery mechanism decision. Once decided, add a `notifyParent()` call in `compiler.ts` where the TODO comment is placed.

---

## OQ-008: Mission 001 fallback content — MissionOutputSchema parse gap

**File:** `src/fallbacks/mission-001.fallback.ts`, `src/compiler.ts`

**Question:** The fallback `content` field is a JSON string that is parsed and validated against `MissionOutputSchema` at runtime in `compiler.ts`. The `student3dMission.companionDialogue` uses `"default-companion"` as `companionId`, which is a placeholder and not a valid UUID. `MissionTaskSchema.companionId` is `z.string()` (not `.uuid()`), so this passes validation — but it should reference a real companion ID once the companion system is defined.

**Needs:** Update fallback content when the companion system is defined (Phase 1 or 2). The `default-companion` string should be replaced with the fallback companion's real UUID.

---

## OQ-009: MissionOutputSchema gap — `assetRefs` as `z.array(z.string()).optional()`

**File:** `src/validation/mission-output.schema.ts`

**Question:** In `AI3dMissionSchema`, `assetRefs` is optional. The fallback content uses empty arrays (`[]`) for `assetRefs`. When the 3D asset pipeline is defined, should `assetRefs` be validated against a known asset registry, or remain an unconstrained string array?

**Needs:** Decision from the 3D world engine / asset agent on whether asset IDs should be validated at mission compile time or deferred to render time.

---

## OQ-010: Workspace protocol — `workspace:*` requires pnpm or Yarn Berry

**File:** `packages/mission-compiler/package.json`

**Question:** `"@l3arn/shared-types": "workspace:*"` uses the pnpm/Yarn Berry workspace protocol. If the repo uses npm workspaces, this syntax is invalid and should be changed to `"*"` or a `file:` reference. The root `package.json` does not exist in this repo yet (no monorepo root `package.json` was found during Agent 6's Phase 0 scan).

**Needs:** Monorepo root `package.json` with workspace configuration. Confirm package manager (pnpm, Yarn Berry, or npm) before running `install`.

---

_End of Open Questions — Agent 6, Phase 0_
