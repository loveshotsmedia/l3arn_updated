# Agent 19 — AI Reliability Hardening

_Plan recreated 2026-09-07 from `docs/CODEX_HANDOFF.md` §15 + `docs/AI_HARDENING_BACKLOG.md` | Pre-Beta Hardening Wave, agent 1 of 5_

---

## Clearance

> **HELD 2026-09-07 (founder directive). Agent 19 is NOT cleared to implement.**
>
> Agents 19–23 are no longer started as a standalone wave. They are folded into the **Astra6 master build dependency graph** (`goal/complete-l3arn`) and none of them begins until Astra6 has produced `docs/L3ARN_COMPLETE_BUILD_PLAN.md` and it has been reviewed. Agent 22 remains process-only and may still run in parallel; Agent 23 remains the final beta gate.
>
> Additionally, **Task 1's 30-second timeout is withdrawn as a requirement** — see the amendment in Task 1. The measurement in Task 1 may be performed as evidence-gathering ahead of the build plan; the code change may not.

Within the wave's own ordering, Agent 19 is the **first** agent and runs before Agents 20, 21 and 23 (Agent 22 may run in parallel — it is docs/process only).

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
6. **No timeout value without measurement.** The 30s figure in `docs/AI_HARDENING_BACKLOG.md` is withdrawn as a requirement (founder directive, 2026-09-07). A per-attempt timeout may only be chosen from measured p95 provider latency plus a stated margin, and it must never convert a normal successful generation into a fallback. See Task 1.
7. Add to `docs/OPEN_QUESTIONS.md` rather than guessing.

---

## Current State (verified against `main`, 2026-09-07)

| Fact | Location | Status |
|---|---|---|
| **CORRECTED 2026-09-07** — the two rows this replaces were read from a stale checkout, not `main`. On `main` the Anthropic call **already has a per-attempt timeout**: `DEFAULT_AI_TIMEOUT_MS = 30_000`, env-tunable via `MISSION_AI_TIMEOUT_MS`, applied to `compile()` (`timeout:` on `messages.create`) and to `compileStart()` (explicit `AbortController` around a streamed request). Commits `e2c7768`, `22e0599`. | `packages/mission-compiler/src/compiler.ts:124-129, 349, 392-395, 544, 569-573` | **done** — the only open question is whether 30 s is the *right* value, which is exactly what Task 1's measurement decides |
| **CORRECTED 2026-09-07** — `maxRetries: 0` is **already set** on both call sites, with the reason in a comment. | `packages/mission-compiler/src/compiler.ts:393-396, 595-597` | **done** |
| Non-retryable short-circuit: a timeout/abort goes straight to the fallback instead of burning all 3 attempts (validation failures still retry 3×) | `packages/mission-compiler/src/retry/retry-engine.ts:52, 85` | done (`e2c7768`) |
| The live child path is `compileStart()` — streaming, `MISSION_START_MODEL` (measured 5.6–7 s on haiku, 13.6 s on sonnet in `22e0599`). The ~66 s figure in `CODEX_HANDOFF.md` §3 is the **full six-section `compile()`** behind `/api/missions` (`mission.route.ts:116`), which `apps/web` never calls. | `services/ai-workers/src/missions/mission-runtime.ts:101`, `services/ai-workers/src/routes/mission.route.ts:116` | **Task 1's measurement must record the two paths separately**; whether `/api/missions` survives at all is founder decision §M-9 in `L3ARN_COMPLETE_BUILD_ASSESSMENT.md` |
| Retry loop has **no delay** between attempts; the gap is flagged inline as an open question | `packages/mission-compiler/src/retry/retry-engine.ts:23-26`, loop at `:53` | open |
| A **second** retry implementation exists — shared by intent, separate in fact | `packages/safety/src/retry/ai-retry.helper.ts` (`withAIRetry`) | unresolved duplication |
| `max_tokens: 16000` with a documented reason (4096 truncated the `tool_use` JSON) | `packages/mission-compiler/src/compiler.ts:224-227` | leave alone |
| Production generation observed at ~66s — **unknown whether that is one provider call or already includes a retry** | `docs/CODEX_HANDOFF.md` §3, §23 | **must be measured before any timeout is chosen** |
| 30s timeout figure in the backlog | `docs/AI_HARDENING_BACKLOG.md` item 1 | **withdrawn as a requirement, 2026-09-07** |

**The duplication matters and is the subtlest part of this task.** `retry-engine.ts` and `ai-retry.helper.ts` both implement the ADR-054 3-attempt policy. `compiler.ts` imports `withAIRetry`, while the header comment on `ai-retry.helper.ts` claims it is "shared … used by both the Mission Compiler (Agent 6) and companion AI generation." Establish which is actually live on each path **by reading the imports, not the comments**, before changing either file.

---

## Scope

### Task 1 — Measure real single-attempt latency, THEN select the timeout from evidence

> **AMENDED 2026-09-07 (founder directive). The 30-second timeout is NOT pre-approved.**
>
> `docs/AI_HARDENING_BACKLOG.md` prescribes "Anthropic request timeout via `AbortSignal` (30s)". That number is **not** cleared for implementation. Production Mission 001 generation has already been observed at **around 66 seconds** (`docs/CODEX_HANDOFF.md` §3, §23). Shipping a 30s per-attempt timeout against a workload that legitimately runs ~66s would convert **normal, successful generations into safe-fallbacks** — a regression wearing the costume of a hardening, and one that would show up to families as degraded missions rather than as an error anyone would notice.
>
> **Do not implement a timeout value until it has been measured. Do not implement Agent 19 yet.**

#### Required sequence (all steps, in order, before any timeout lands)

1. **Measure at least 20 real Anthropic Mission 001 generations** using the **production** model and config (`ANTHROPIC_MODEL` as set in Railway, production prompt, production `max_tokens: 16000`, production tool-use schema). Not local dev defaults — `packages/mission-compiler/src/compiler.ts:85` falls back to `claude-sonnet-4-6` as a dev default, which may not be the production model, and measuring the wrong model produces a number that is worse than no number.
2. **Record, across those runs:**
   - minimum
   - median
   - p90
   - p95
   - maximum
3. **Separate the two latencies** — they have different causes and different fixes, and conflating them is how a bad timeout gets chosen:
   - **provider response latency** — wall time of the `messages.create` call itself
   - **validation / retry latency** — Zod validation, attempt bookkeeping, and any backoff waiting
   A per-attempt timeout may only ever be sized against **provider response latency**. Validation time sits outside the provider call and must not inflate the chosen value.
4. **Recommend a per-attempt timeout from measured p95 behaviour plus a reasonable safety margin.** State the margin and the reasoning explicitly. A recommendation without the measurement table behind it is not a recommendation.
5. **Do not choose a timeout that causes normal successful requests to become fallbacks.** This is the binding constraint and it outranks any target number, including 30s. If the evidence says the right value is 90s or 120s, the right value is 90s or 120s.
6. **Preserve the 3-attempt cap** (`AI_MAX_RETRY_ATTEMPTS = 3`, ADR-054).
7. **Preserve the safe fallback** — `MISSION_001_FALLBACK` stays reachable on genuine failure.
8. **Preserve SDK `maxRetries: 0`** (Task 2).
9. **Preserve controlled backoff** (Task 3).
10. **Update this plan file with the measured recommendation before implementation.** The measurement table and the chosen value get written into this document, and only then does the timeout get built.

**Note the interaction with the worst case.** Three attempts at the chosen timeout plus 1500ms of backoff is the ceiling before fallback. At 30s that is ~93s; at a measured 120s it is ~363s. That ceiling must be checked against the Railway request timeout and the Vercel function limit — a per-attempt timeout that lets the total exceed the platform's own timeout means the platform kills the request first and the safe-fallback path never runs. Record both platform limits alongside the measurement.

#### Implementation notes (apply once the value is chosen, not before)

File: `packages/mission-compiler/src/compiler.ts`

- Pass an abort signal into the `messages.create` call inside the `generate()` closure so a genuinely hung provider call fails into the existing retry/fallback path instead of holding the request open. The goal is catching *hung* calls, not *slow* ones.
- Use `AbortSignal.timeout(<measured value>)`. Node 18+ has this natively; confirm the `services/ai-workers` Node version supports it (check `services/ai-workers/package.json` engines and the Railway runtime) and fall back to an `AbortController` + `setTimeout` pair if not.
- **Create a fresh signal per attempt.** A signal constructed once outside the retry loop is already aborted on attempts 2 and 3 — this is the single most likely bug in this task. The signal must be created inside the per-attempt closure.
- Clear the timer on success where an `AbortController` is used, so a settled request does not leave a dangling timer holding the event loop.
- The value is the timeout for **one attempt**, not for the whole compile. State the resulting worst case in the function's doc comment, with the measured value named.
- A timeout must surface as a normal `failureReason` on the `AIValidationAttempt` record (e.g. `timeout-<value>ms`), not as an unhandled rejection.
- Record the measured distribution in a comment next to the constant, with the date measured. A bare number invites the next agent to "tune" it without evidence.

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
1. **Timeout test** — mock a provider call that never settles; assert the attempt fails at the **measured, plan-recorded** timeout value with a timeout `failureReason`, that attempts 2 and 3 still run (proving a fresh signal per attempt), and that the fallback is returned. Assert against the named constant, never a hardcoded literal, so re-measuring later cannot silently break the test.
1a. **No-false-fallback test** — a generation that completes just under the chosen timeout must return `content_source=ai`, not a fallback. This is the regression test for the whole reason Task 1 was amended, and it is the one test that would have caught a premature 30s.
2. **Backoff test** — fake timers; assert delays of exactly 500ms and 1000ms between attempts and **no** delay after attempt 3.
3. **`maxRetries` test** — assert the constructed client reports `maxRetries === 0`, or assert via a mocked transport that exactly 3 provider calls occur across 3 failing attempts (not 9).
4. **Fallback-preserved regression** — the existing all-attempts-fail → `MISSION_001_FALLBACK` behaviour is unchanged, with exactly 3 attempt records.

---

## Verification

Do not report this agent complete on unit tests alone.

1. `pnpm -r test` (or the repo's configured runner) — green, including the four new tests.
2. `pnpm -r typecheck` / build — green.
3. **Live run against real Anthropic** with `ANTHROPIC_MODEL` set as in production: one real Mission 001 generation reaching `content_source=ai` with fallback unused, proving the timeout did not break the happy path.
4. **Induced-timeout run** — temporarily lower the timeout constant (e.g. 100ms) against the real provider, confirm all 3 attempts fail fast and the safe fallback is delivered to the child without a 500, then restore the measured value.
5. **The latency measurement itself** — at least 20 real production-config generations, with min / median / p90 / p95 / max recorded, provider latency separated from validation latency, and the table written into this plan file. **This is a verification artefact, not a preliminary.** Agent 19 cannot be reported complete without it.
5. Confirm the audit envelope's attempt count matches the actual number of provider calls.

State plainly which of these were run and what they output. Per `docs/CODEX_HANDOFF.md` §24: do not mark anything ready because automated tests passed.

---

## Definition of Done

- [ ] **≥20 real production-config generations measured**, with min / median / p90 / p95 / max recorded and provider latency separated from validation/retry latency
- [ ] **Timeout value recommended from measured p95 + stated safety margin, and written into this plan file — before any implementation**
- [ ] Chosen value provably does **not** turn normal successful generations into fallbacks (no-false-fallback test green)
- [ ] Worst-case total (3 attempts + backoff) checked against the Railway request timeout and Vercel function limit, both recorded
- [ ] Fresh `AbortSignal.timeout(<measured value>)` per attempt on the Anthropic call, with the measured distribution and date in a comment beside the constant
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

- Should the timeout be environment-configurable (`AI_REQUEST_TIMEOUT_MS`) rather than a constant? A constant is the assumption here; a configurable value risks a production setting that defeats the purpose. If the measurement shows latency varies materially by model, configurable becomes the better answer — decide after measuring, not before.
- ~~Does the ~66s observed production generation time mean a single attempt can legitimately exceed 30s?~~ **Resolved 2026-09-07 by founder directive: the 30s value is withdrawn as a requirement.** Task 1 is now measure-first. The open question that replaces it: **what does the measured p95 actually turn out to be, and does the resulting worst case fit inside the Railway and Vercel platform timeouts?** That is answered by running the measurement, not by discussion.
- Is ~66s a single provider call, or does it already include a validation retry? The existing observation does not say, and the answer changes the target materially — a 66s figure that already contains a failed attempt plus a retry implies a much faster single call. Step 3's provider/validation split exists to settle this.
