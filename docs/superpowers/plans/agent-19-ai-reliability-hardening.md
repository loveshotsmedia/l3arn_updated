# Agent 19 — AI Reliability Hardening

_Plan recreated 2026-09-07 from `docs/CODEX_HANDOFF.md` §15 + `docs/AI_HARDENING_BACKLOG.md` | Pre-Beta Hardening Wave, agent 1 of 5_

---

## Clearance

Agent 19 is cleared to begin. This is the **first** agent of the Pre-Beta Hardening Wave and it runs before Agents 20, 21 and 23 (Agent 22 may run in parallel — it is docs/process only).

Agent 19 hardens the **reliability** of the AI generation path. It does not change what the AI produces, does not touch prompts, and does not add product scope. Per `docs/CODEX_HANDOFF.md` §24, creating new product scope during the Pre-Beta Hardening Wave is explicitly forbidden.

Read first, in this order:
- `docs/CODEX_HANDOFF.md` — all of it; especially §5 (AI output policy), §15 (this wave), §23 (Known Open Questions — "AI retry engines", "AI latency"), §24 (Do Not list)
- `docs/AI_HARDENING_BACKLOG.md` — items 1 and 2 are this agent's mandate
- `docs/AI_PRODUCTION_SETUP.md` — the `ANTHROPIC_MODEL` contract and current production model guidance
- `docs/ADR/ADR-000-index.md` — **ADR-054** (3-attempt AI output validation + retry policy) is the governing decision
- `docs/agent_operating_rules.md`
- `docs/shared_contracts_spec.md` — `AIOutputResult` / `AIValidationAttempt` shapes are a frozen contract

---

## Guardrails

1. **Do not weaken validation or fallback to buy latency.** `docs/CODEX_HANDOFF.md` §23 states this directly: "Do not solve latency by bypassing validation or weakening fallback safety." Invalid model output must never reach the child.
2. **Do not hardcode a production model.** The model stays environment-configured (`ANTHROPIC_MODEL`). §24: "Do not hardcode a production AI model as architecture."
3. **The attempt cap stays at 3.** `AI_MAX_RETRY_ATTEMPTS = 3` is a hard cap from ADR-054, and the `AIOutputResult` schema asserts exactly 3 attempt records in the failed-with-fallback branch. Do not raise it.
4. **The safe static fallback must remain reachable.** `MISSION_001_FALLBACK` is the last line of defence; every new failure mode must terminate in it, not in a thrown 500.
5. **No new scope.** No prompt rewrites, no model swaps, no perceived-latency UX work. Those are separate, later decisions.
6. Add to `docs/OPEN_QUESTIONS.md` rather than guessing.

---

## Current State (verified against `main`, 2026-09-07)

| Fact | Location | Status |
|---|---|---|
| `messages.create` called with **no** `AbortSignal` and no per-attempt timeout | `packages/mission-compiler/src/compiler.ts:221` | open |
| Anthropic client constructed with only `apiKey` — the SDK default `maxRetries` (2) is in effect | `packages/mission-compiler/src/compiler.ts:185-187` | open |
| Retry loop has **no delay** between attempts; the gap is flagged inline as an open question | `packages/mission-compiler/src/retry/retry-engine.ts:23-26`, loop at `:53` | open |
| A **second** retry implementation exists — shared by intent, separate in fact | `packages/safety/src/retry/ai-retry.helper.ts` (`withAIRetry`) | unresolved duplication |
| `max_tokens: 16000` with a documented reason (4096 truncated the `tool_use` JSON) | `packages/mission-compiler/src/compiler.ts:224-227` | leave alone |
| Production generation observed at ~66s | `docs/CODEX_HANDOFF.md` §3, §23 | context |

**The duplication matters and is the subtlest part of this task.** `retry-engine.ts` and `ai-retry.helper.ts` both implement the ADR-054 3-attempt policy. `compiler.ts` imports `withAIRetry`, while the header comment on `ai-retry.helper.ts` claims it is "shared … used by both the Mission Compiler (Agent 6) and companion AI generation." Establish which is actually live on each path **by reading the imports, not the comments**, before changing either file.

---

## Scope

### Task 1 — 30s per-attempt timeout via `AbortSignal`

File: `packages/mission-compiler/src/compiler.ts`

Pass an abort signal into the `messages.create` call inside the `generate()` closure so a hung provider call fails fast into the existing retry/fallback path instead of holding the request open.

- Use `AbortSignal.timeout(30_000)`. Node 18+ has this natively; confirm the `services/ai-workers` Node version supports it (check `services/ai-workers/package.json` engines and the Railway runtime) and fall back to an `AbortController` + `setTimeout` pair if not.
- **Create a fresh signal per attempt.** A signal constructed once outside the retry loop is already aborted on attempts 2 and 3 — this is the single most likely bug in this task. The signal must be created inside the per-attempt closure.
- Clear the timer on success where an `AbortController` is used, so a settled request does not leave a dangling timer holding the event loop.
- 30s is the timeout for **one attempt**, not for the whole compile. Three timed-out attempts plus backoff is a ~33s worst case before fallback; that is intended and must be stated in the function's doc comment.
- A timeout must surface as a normal `failureReason` on the `AIValidationAttempt` record (e.g. `timeout-30s`), not as an unhandled rejection.

### Task 2 — `maxRetries: 0` on the Anthropic client

File: `packages/mission-compiler/src/compiler.ts:185`

```ts
this.client = new Anthropic({
  apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY,
  maxRetries: 0, // app-controlled retries only — ADR-054 owns the retry policy
});
```

**Why this is required, not cosmetic:** the SDK's default `maxRetries: 2` multiplies against the app's 3 attempts, giving up to 9 provider calls, and the SDK's internal retries are invisible to the `AIValidationAttempt` audit records — so the audit envelope would understate real provider load. Retries are app-controlled; the SDK must not add its own.

### Task 3 — Retry backoff: 500ms → 1000ms (2000ms documented, not used)

File: `packages/mission-compiler/src/retry/retry-engine.ts`

Add a delay **between** attempts and replace the now-answered OPEN QUESTION comment at lines 23–26 with the decision (do not simply delete it).

- Gap after attempt 1 → **500ms**
- Gap after attempt 2 → **1000ms**
- **2000ms is reserved and documented only.** With a hard cap of 3 attempts there are exactly 2 gaps, so a third delay is unreachable. Encode the schedule as `const RETRY_BACKOFF_MS = [500, 1000, 2000] as const` indexed by gap, with a comment saying index 2 is reserved for a future cap expansion and is dead today. Do not raise the cap to make it reachable.
- **Do not sleep after the final attempt.** Delaying before the fallback adds latency for zero benefit. Guard the sleep with the existing `attempt === AI_MAX_RETRY_ATTEMPTS` early-out.
- The sleep must be cancellable and must not outlive the request.

### Task 4 — Resolve or deliberately document the duplicate retry engines

Files: `packages/mission-compiler/src/retry/retry-engine.ts`, `packages/safety/src/retry/ai-retry.helper.ts`

`docs/CODEX_HANDOFF.md` §23 assigns this to Agent 19 and permits either outcome. Pick one and be explicit:

- **Option A — consolidate.** Make one the single implementation and have the other re-export it. Preferred if both genuinely implement identical ADR-054 semantics. Requires proving the semantics match on: attempt-record shape, generate-failure vs validate-failure handling, and the exactly-3-records assertion.
- **Option B — document the split deliberately.** If the companion path needs different behaviour (different fallback context, different validation), keep both, add a header comment to each naming the other and stating what differs and why, and record it as an ADR entry.

**Either way, the backoff and timeout fixes must land on whichever path production actually uses.** Fixing only `retry-engine.ts` while `compiler.ts` calls `withAIRetry` from `packages/safety` would ship a no-op. Verify the live import chain first.

### Task 5 — Tests

Per `docs/CODEX_HANDOFF.md` §22 the expected test categories include contract, safety and regression, and §5 requires that repeated failures become regression tests.

Add:
1. **Timeout test** — mock a provider call that never settles; assert the attempt fails at ~30s with a timeout `failureReason`, that attempts 2 and 3 still run (proving a fresh signal per attempt), and that the fallback is returned.
2. **Backoff test** — fake timers; assert delays of exactly 500ms and 1000ms between attempts and **no** delay after attempt 3.
3. **`maxRetries` test** — assert the constructed client reports `maxRetries === 0`, or assert via a mocked transport that exactly 3 provider calls occur across 3 failing attempts (not 9).
4. **Fallback-preserved regression** — the existing all-attempts-fail → `MISSION_001_FALLBACK` behaviour is unchanged, with exactly 3 attempt records.

---

## Verification

Do not report this agent complete on unit tests alone.

1. `pnpm -r test` (or the repo's configured runner) — green, including the four new tests.
2. `pnpm -r typecheck` / build — green.
3. **Live run against real Anthropic** with `ANTHROPIC_MODEL` set as in production: one real Mission 001 generation reaching `content_source=ai` with fallback unused, proving the timeout did not break the happy path.
4. **Induced-timeout run** — temporarily lower the timeout constant (e.g. 100ms) against the real provider, confirm all 3 attempts fail fast and the safe fallback is delivered to the child without a 500, then restore 30s.
5. Confirm the audit envelope's attempt count matches the actual number of provider calls.

State plainly which of these were run and what they output. Per `docs/CODEX_HANDOFF.md` §24: do not mark anything ready because automated tests passed.

---

## Definition of Done

- [ ] Fresh `AbortSignal.timeout(30_000)` per attempt on the Anthropic call
- [ ] `maxRetries: 0` on the Anthropic client, with the reason in a comment
- [ ] 500ms / 1000ms gaps; 2000ms present but documented as reserved and unreachable
- [ ] No sleep after the final attempt
- [ ] Duplicate retry engines consolidated **or** deliberately documented in both files plus an ADR
- [ ] Safe fallback path unchanged and still reachable
- [ ] Attempt cap still exactly 3; `AIOutputResult` contract unchanged
- [ ] Four new tests green; full suite green
- [ ] Live real-AI run and induced-timeout run both observed
- [ ] `docs/AI_HARDENING_BACKLOG.md` items 1 and 2 checked off with the commit SHA
- [ ] Any new uncertainty filed in `docs/OPEN_QUESTIONS.md`

---

## Open Questions to File (do not guess)

- Should the 30s timeout be environment-configurable (`AI_REQUEST_TIMEOUT_MS`) rather than a constant? A constant is the assumption here; a configurable value risks a production setting that defeats the purpose.
- Does the ~66s observed production generation time mean a single attempt can legitimately exceed 30s? **This is the highest-risk assumption in this plan.** If one honest generation can take longer than 30s, a 30s per-attempt timeout converts slow-but-valid generations into fallbacks — a regression, not a hardening. Measure the real single-attempt distribution before accepting 30s; if attempts genuinely run long, raise the constant and record the measurement rather than shipping 30s because the backlog said so.
