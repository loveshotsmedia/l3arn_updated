# Design Spec: Mission Generation Latency — fast start, AI by default

**Date:** 2026-07-04
**Status:** Draft for review
**Owner:** Cameron (product) / build agent (implementation)
**Related:** PR #20 (AI timeout/fallback), ADR-016 (mission output model), ADR-054 (AI validation/retry/fallback)

---

## 1. Problem

When a student starts Mission 001, they wait **90–270 seconds** on "Preparing your mission…", and then usually get the **static fallback** mission instead of AI-personalized content.

Both symptoms have **one root cause**. `MissionCompiler.compile()` asks Claude to generate the **entire mission in a single blocking `tool_use` call**: all six output sections (3 delivery formats + 3 plans, ~8–12k output tokens) before the student sees anything. That generation runs past the request timeout, gets aborted, and the code falls back to static content. So: **too much generated at once → too slow → hits the timeout → fallback.** Making it fast and making it reliably-AI are therefore the *same* fix.

Observed in a live prod E2E (2026-07-04): mission start returned the fallback after ~270s (the 3×90s retry path; PR #20 bounded the hang but its retry-predicate did not short-circuit in prod — see §8).

## 2. Key finding: the runtime consumes 1 of the 6 generated sections

`MissionOutputSchema` (packages/shared-types/src/mission.schema.ts:202) has six sections:

| Section | Generated at start today | Actually consumed by the runtime |
|---|---|---|
| `student3dMission` | yes | **YES** — the only section the start screen uses |
| `studentInteractiveLite` | yes | no (runtime hardcodes `delivery_mode: "3d"`) |
| `studentTextAudioOffline` | yes | no |
| `evidencePlan` | yes | no — completion uses the static `MISSION_001_EVIDENCE_SPEC` |
| `rewardPlan` | yes | no — completion uses the `computeMission001Rewards()` rules engine |
| `parentPlan` | yes | no — completion writes the parent report deterministically |

Evidence:
- `services/ai-workers/src/missions/mission-runtime.ts:145` — start reads only `output.missionData.student3dMission` and returns `{storyHook, tasks, rewardPreviewLabel}`.
- `mission-runtime.ts:257–263` — completion rewards/evidence come from `MISSION_001_EVIDENCE_SPEC` + `computeMission001Rewards()`, not the AI plans.
- `StartMissionResponseSchema` (session.schema.ts:200) — the wire contract to the student is only `{missionAttemptId, missionId, contentSource, storyHook, tasks[], rewardPreviewLabel}`.

**Five of the six generated sections are discarded.** So the fix is not to defer them to a background job — it's to **stop generating them** until something consumes them.

## 3. Goals / Non-goals

**Goals**
- Mission start returns in **~3–6s** (down from 90–270s).
- **AI-personalized content is the default** (~99%); the static fallback is a true rare last-resort (real API failure), not a timeout artifact.
- No regression to the completion flow, rewards, evidence, mastery, or the Task 14 holding unlock.

**Non-goals (v1)**
- Streaming/progressive render (Phase 2).
- Pre-generation / warming at session launch (Phase 3).
- Generating the two alternate delivery formats or the AI plans (deferred until a runtime actually consumes them).
- Changing the mission *content* or the gameplay.

## 4. Design — v1: generate only what's consumed

### 4.1 Compiler: a "start" generation that produces only `student3dMission`
- Add a compile path that calls Claude with a **tool `input_schema` scoped to `Student3dMissionSchema`** (not `MISSION_OUTPUT_JSON_SCHEMA`). Output drops from ~8–12k tokens to ~1.5–3k → generation finishes well inside a short timeout.
- Validate the result against `Student3dMissionSchema` (not the full `MissionOutputSchema`). The current `compile()` internally does `MissionOutputSchema.parse(result.data)` (compiler.ts:288) — the new path validates the narrower schema.
- Keep the full-mission path available but unused by the runtime (opt-in), so the schema, prompt, and fallback for the other five sections are not deleted — just not invoked. This preserves the option to generate them when `studentInteractiveLite` / AI parent reports / etc. actually ship.

### 4.2 Fallback becomes narrow and rare
- On failure of the `student3dMission` generation, fall back to the **`student3dMission` slice of `MISSION_001_FALLBACK`** only (extract that section from the existing fallback content), not the whole mission.
- Because the call is now small and fast, the fallback fires only on a genuine API error/outage, not on a timeout of a bloated request. `contentSource: "ai"` becomes the norm.

### 4.3 Config / levers (in scope for v1)
- **Prompt caching:** mark the fixed system prompt + tool schema as cacheable (`cache_control`) so repeat calls skip re-processing the static prompt.
- **Timeout:** lower `MISSION_AI_TIMEOUT_MS` default to ~30s (small call; rarely approached). Keep it env-tunable.
- **#20 retry-predicate fix (fold in):** make `isNonRetryableAiError` match the timeout/abort reliably in the Railway runtime — do not rely on `instanceof Anthropic.APIConnectionTimeoutError` alone (it did not match in prod, causing the 3×90s path). Also match by duck-typing: `error?.name === "AbortError"` / `error?.name === "APIConnectionTimeoutError"` / message contains "timed out" / "aborted". This bounds worst-case to ~1×timeout.
- **Model:** keep the current model initially (the small call is fast even on Sonnet). `ANTHROPIC_MODEL` stays the switch; Haiku is a follow-on lever if we want extra margin — not required for v1.

### 4.4 What does NOT change (v1)
- `StartMissionResponse` wire contract, the mission gameplay UI, the completion path (rules engine + static specs), rewards, evidence, mastery, and the Task 14 holding unlock are all untouched.
- The audit envelope (`AIOutputEnvelope`) still records provenance/retry/fallback; its `result.data` now carries the `student3dMission`-shaped payload.

## 5. Data flow (v1)

```
POST /mission/start
  → requireChildSession
  → MissionCompiler.compileStart(input)         // student3dMission only, prompt-cached, ~30s timeout
       → Claude tool_use (Student3dMissionSchema input_schema)
       → validate Student3dMissionSchema
       → on failure → student3dMission slice of MISSION_001_FALLBACK
  → insert mission_attempts (content_source = ai | fallback)
  → return { missionAttemptId, storyHook, tasks[], rewardPreviewLabel, contentSource }

POST /mission/complete   (UNCHANGED)
  → rules engine + static evidence/skill/badge specs
  → rewards, evidence, mastery, parent report, Task 14 holding unlock
```

## 6. Phase 2 (designed-in, built only if ~5s still feels slow): streaming
- Stream the `tool_use` partial JSON; render `storyHook` as soon as it arrives (~2s), let `tasks[]` fill in while the child reads the briefing (they spend ~10–20s before "Begin"). Requires an SSE/chunked response from Railway and progressive render in `MissionExperience.tsx`.
- No schema change from v1 — same `student3dMission` payload, revealed progressively.

## 7. Phase 3 (designed-in, optional): pre-warm at session launch
- When the parent hits **Start Session** (or the student **Enters**), fire `compileStart` in the background keyed to the session, cache the result (e.g., on `mission_attempts` pre-created, or a short-lived cache). `POST /mission/start` checks the cache first → ~0s when warm, falls through to live `compileStart` when cold.
- Only worthwhile once v1 makes generation fast enough to finish inside the ~20–40s pre-click window (a slow generation would not be ready in time — which is exactly why v1 comes first).
- Speculative token cost is negligible (pennies/mission; most launched sessions are played).

## 8. Error handling & edge cases
- **AI error/outage:** narrow `student3dMission` fallback; `contentSource: "fallback"`; existing warn-level structured log so ops can alert on fallback rate.
- **Timeout:** short-circuits to fallback after one attempt (retry-predicate fix), not 3×.
- **Validation failure (ZodError):** still retried up to `AI_MAX_RETRY_ATTEMPTS` (transient truncation is worth retrying); the smaller output makes truncation far less likely.
- **Completion unaffected** by start provenance — it is deterministic regardless of whether start used AI or fallback.

## 9. Testing / verification
- **Unit (mission-compiler):** `compileStart` returns a valid `Student3dMissionSchema`; on injected API error → returns the `student3dMission` fallback slice; retry-predicate matches an `AbortError`/timeout shape and short-circuits (regression for the #20 prod miss).
- **Contract:** `StartMissionResponse` shape unchanged (existing consumers keep working).
- **Latency:** measure `compileStart` wall-clock on Railway; assert typical start < ~6s and `contentSource === "ai"` on the happy path.
- **Live E2E (regression):** the 2026-07-04 prod flow — fresh child → mission start → 6 gameplay steps → complete → `POST /holdings` 200 → Observatory appears + persists — must still pass, now with a fast start and `contentSource: "ai"`.
- **Completion regression:** rewards/evidence/mastery/badges/holding-unlock unchanged.

## 10. Open decisions (for review)
1. **v1 timeout default** — 30s proposed. Lower (e.g., 20s) once we measure real `compileStart` latency.
2. **Model** — keep current for v1; revisit Haiku only if latency margin is thin.
3. **Fallback slice source** — extract `student3dMission` from the existing `MISSION_001_FALLBACK.content`, vs. author a dedicated small `student3dMission` fallback constant. (Proposed: extract, to keep one source of truth.)
4. **Do the alternate formats / AI plans have a near-term consumer?** If `studentInteractiveLite` (non-3d delivery) or AI-authored parent reports are imminent, we design their generation as separate on-demand calls then; if not, they stay dormant.

---

*This spec is deliberately scoped to v1 (decompose the start generation). Streaming (Phase 2) and pre-warm (Phase 3) are documented so the request flow and data model don't need rework to add them later.*
