# Agent 23 — Beta Readiness Checklist

_Plan recreated 2026-09-07 from `docs/CODEX_HANDOFF.md` §15 + `docs/AI_HARDENING_BACKLOG.md` | Pre-Beta Hardening Wave, agent 5 of 5 — the final gate_

---

## Clearance

Agent 23 **runs last**. `docs/CODEX_HANDOFF.md` §15: "Must not declare beta ready until Agents 19–21 are complete and verified."

Agent 23 builds and executes the gate that decides whether L3ARN opens to real families. §26 defines the current milestone as exactly this: "Personally validate the live Hero Slice, harden safety/reliability, then determine whether L3ARN is ready for the first 25-family Inner Circle."

**Agent 23's job is to be hard to pass, not to pass.** Its output is a verdict with evidence, and "not ready, here is what is missing" is a fully successful outcome. The failure mode for this agent is not blocking the beta — it is waving it through.

This agent implements **no features**. It verifies, gates and documents. If it discovers a gap, it files and routes the gap; it does not fix it.

Read first, in this order:
- `docs/CODEX_HANDOFF.md` — all of it; especially §3 (readiness labels), §15, §16 (founder manual test), §22 (architecture governance and test categories), §23 (open questions), §24 (Do Not list), §26 (milestone)
- `docs/AI_HARDENING_BACKLOG.md` — every unchecked box is a candidate blocker
- `docs/OPEN_QUESTIONS.md` — same
- `docs/superpowers/plans/agent-19-ai-reliability-hardening.md`, `agent-20-safety-containment-enforcement.md`, `agent-21-parent-safety-flags-report-trust.md`, `agent-22-demo-feedback-capture.md` — each plan's Definition of Done is this agent's input
- `docs/superpowers/plans/agent-12-gtm-beta-ops.md` — beta application and applicant scoring already exist
- `docs/CONTEXT.md` §9 (Beta Launch Sequencing and Wave Strategy)
- `docs/supabase_rls_policy_plan.md`

---

## Guardrails

1. **Do not mark beta ready because automated tests passed.** `docs/CODEX_HANDOFF.md` §24, verbatim. Every safety and isolation claim needs observed evidence from the live system, not a green suite.
2. **Do not confuse automated E2E verification with founder product approval** (§16). They are separate gates and both are required.
3. **Do not accept an agent's self-reported completion at face value.** Agent 23 re-verifies the claims of Agents 19–21 independently. A prior agent reporting "done" is the input to verification, not a substitute for it.
4. **Do not implement.** Route every gap; fix nothing. §24 forbids new scope during this wave, and a gate that patches what it finds cannot honestly report what it found.
5. **Report unfinished items in full.** Every unmet criterion gets: what is not done, why, and the recommended fix. No open loops, no gaps named without a recommendation attached.
6. **The verdict is the founder's to make.** Agent 23 produces the evidence and a recommendation. It does not authorise the beta itself.

---

## Current State (verified against `main`, 2026-09-07)

Readiness labels per §3:

| Gate | Status |
|---|---|
| Automated / agent production verification | **PASS** |
| Internal guided demo | **READY** |
| Founder manual product walkthrough | **NOT YET COMPLETED** |
| Real-family beta | **NOT YET CLEARED** |
| Pre-Beta Hardening Wave (Agents 19–23) | **NOT STARTED** — plans only |

Known blockers already on record:
- All four AI-hardening items in `docs/AI_HARDENING_BACKLOG.md` are unchecked (Agents 19 and 21 own them).
- Safety containment is **log-only**, not enforced — `packages/safety/src/kill-switch/supabase-safety-containment.ts:16-18`. Agent 20 owns it.
- Parent report surfaces **no** safety flags — `apps/web/src/app/(parent)/reports/[childId]/page.tsx` has no safety query. Agent 21 owns it.
- `RAILWAY_AI_WORKERS_URL` is not set in Vercel, so Mission Control's Safety Status link falls back to a placeholder — `apps/web/src/app/(admin)/mission-control/page.tsx:328`, and the page renders an explicit "[RAILWAY_AI_WORKERS_URL not set — using placeholder URL]" warning at `:770-772`. Also filed as **OQ-A11-005** in `docs/OPEN_QUESTIONS.md:452`. **This one is an env-var setting, not a code change** — it is the cheapest open blocker on the list and should not still be open at the gate.
- No world-write enforcement point exists (§23), so `freeze-world-state` can only ever be interface-ready at this gate.
- `moderation_events` are not fully persisted in the intended mature form (§23).
- Production real-AI generation runs ~66s (§3).

The Hero Slice merge/deploy item in `docs/AI_HARDENING_BACKLOG.md` appears satisfied — the Hero Slice is merged and production-verified per §3, and the backlog text describing production as predating it is stale. **Verify this against the live deployment rather than trusting either document**, and correct the stale backlog text as part of this agent's work.

---

## Scope

### Task 1 — The checklist document

New file: `docs/BETA_READINESS_CHECKLIST.md`

The canonical gate. Every item is binary — met or not met — with an evidence field that must name a commit SHA, a screenshot, a query result or a log line. **"Looks fine" is not evidence.** An item with an empty evidence field counts as not met.

Sections:

**A. Upstream wave completion (hard prerequisite)**
- Agent 19 complete and independently re-verified
- Agent 20 complete and independently re-verified
- Agent 21 complete and independently re-verified, **including founder copy sign-off**
- Agent 22 instrument exists and the founder walkthrough is logged

**B. Founder product approval (§16 — cannot be delegated to an agent)**
- Founder personally completed the 10-step walkthrough on live production
- Founder's answers recorded for all five §16 qualitative questions
- Founder explicitly states the experience is good enough for real families

**C. AI reliability (Agent 19's output, re-verified)**
- 30s per-attempt timeout live, with a fresh signal per attempt
- SDK `maxRetries: 0`
- 500ms/1000ms backoff live
- Safe fallback still reachable; invalid output provably never reaches the child
- Duplicate retry engines resolved or deliberately documented
- Production model environment-configured, not hardcoded
- All four `docs/AI_HARDENING_BACKLOG.md` items checked off with SHAs

**D. Safety enforcement (Agent 20's output, re-verified)**
- Containment actions **enforced**, not just logged — observed live
- `child_permissions` provably never overwritten by containment
- Stricter-wins resolution verified in both directions, including that containment cannot grant a withheld capability
- `end-session` fails closed at `/api/sessions/start` and `/api/sessions/verify`
- Restoration requires founder/admin review; no automated restoration anywhere
- Every containment action honestly labelled enforced vs interface-ready — `freeze-world-state` **must** be listed as interface-ready
- Kill switch verified

**E. Parent trust (Agent 21's output, re-verified)**
- Safety notices reach parents without exposing founder-only tables or moderation internals
- Calm quality language vs paused/reviewing language correctly separated
- Founder-signed-off copy in place
- Cross-parent isolation verified live as a real second parent account

**F. Data isolation and RLS (independent of the wave — verify regardless)**
- RLS enabled **and forced** on every table holding child data
- Parent A cannot read parent B's children — verified live with real accounts, not by reading policies
- Founder-only tables (`safety_escalations`, `audit_logs`, `child_containment_state`) unreachable by parent and anonymous roles
- No client-side wallet balance writes (§24); Moolah ledger is source of truth
- `localStorage` is not identity authority anywhere (§24)
- Child sessions backend-mediated and failing closed

**G. Production environment**
- `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` set in Railway
- `RAILWAY_AI_WORKERS_URL` set in Vercel for **all** targets — the placeholder warning at `mission-control/page.tsx:770` is gone
- All migrations through the latest applied to Cloud Supabase **and** present as repo files
- No secrets or management tokens committed (§24)
- Rollback path known and stated for both Railway and Vercel

**H. Hero Slice end-to-end regression**
- The full 16-step §3 verification re-run on production **after** Agents 19–21 have landed. The hardening work touches the AI path, the permission path and the report — the exact three surfaces that sequence covers, so a pre-wave pass does not carry forward.
- `content_source=ai`, fallback unused, companion name fidelity preserved
- Rewards idempotent; a repeated completion does not double-grant
- House transfer-lock intact; an accepted House cannot be overwritten

**I. Beta operations readiness**
- Beta application live and accepting (Agent 12)
- Applicant scoring process exists
- Inner Circle cap decided (§26: first 25 families)
- A defined path for a family to report a safety concern, and a named human who receives it. **A beta with no inbound safety channel is not ready regardless of every other box** — an automated containment that no human is watching is observability theatre.
- Support/escalation contact defined

**J. Known-accepted limitations (explicit, not hidden)**
- `freeze-world-state` interface-ready only (§23)
- `moderation_events` not fully persisted (§23)
- ~66s AI generation latency (§3, §23)
- Any other gap the founder consciously accepts

Section J is not a loophole. Each entry needs an explicit founder acknowledgement; a limitation nobody accepted in writing is a blocker, not a limitation.

### Task 2 — Execute the checklist

Run it. Fill every evidence field. Do not pre-fill anything from a prior agent's report without independently re-verifying it.

Where verification requires the live system, use the live system: real accounts, real requests, real Supabase queries, headless browser checks with screenshots.

### Task 3 — The verdict

New file: `docs/BETA_READINESS_VERDICT.md`

- **READY** — every section A–I met with evidence, and section J explicitly acknowledged; or
- **NOT READY** — with every unmet item listed as: what is not done, why, and the recommended fix or the specific next action.

Also record: date, commit SHA verified, production URLs, who verified what, and which items were verified live versus by test only.

**A NOT READY verdict is a successful outcome for this agent.** Say it plainly, with the list, and route each item.

### Task 4 — Update the readiness labels

Update `docs/CODEX_HANDOFF.md` §3's four readiness labels to match reality, and correct the stale Hero Slice deploy text in `docs/AI_HARDENING_BACKLOG.md` (see Current State). Check off completed backlog items with their SHAs. Leave `docs/OPEN_QUESTIONS.md` entries open unless they were genuinely resolved — closing an open question to tidy the gate is exactly the failure this agent exists to prevent.

---

## Verification

Agent 23 is itself verified by:

1. Every checklist item carries real evidence — a SHA, a query result, a screenshot or a log line. Spot-check that no evidence field is a restatement of the criterion.
2. Every live-verification item was actually performed live. State which items were test-only, and treat any safety or isolation item verified only by test as **not met**.
3. The verdict is unambiguous, with no unmet item lacking a recommendation.
4. `git diff --stat` shows only documentation changes — this agent implements nothing.
5. The founder has read the verdict. Agent 23 does not open the beta; the founder does.

---

## Definition of Done

- [ ] `docs/BETA_READINESS_CHECKLIST.md` exists with sections A–J and evidence fields
- [ ] Checklist fully executed; no empty evidence fields
- [ ] Agents 19–21 independently re-verified, not accepted on self-report
- [ ] Founder manual walkthrough confirmed complete with the five §16 answers recorded
- [ ] Live RLS / cross-parent isolation verified with real accounts
- [ ] `RAILWAY_AI_WORKERS_URL` set in Vercel and the placeholder warning gone
- [ ] Full 16-step Hero Slice verification re-run on production **post-hardening**
- [ ] Inbound safety-concern channel defined with a named human recipient
- [ ] `docs/BETA_READINESS_VERDICT.md` written with a clear READY / NOT READY and per-item recommendations
- [ ] `docs/CODEX_HANDOFF.md` §3 labels and `docs/AI_HARDENING_BACKLOG.md` updated to match reality
- [ ] Section J limitations explicitly acknowledged by the founder
- [ ] `git diff --stat` confirms docs-only
- [ ] Nothing implemented; every gap routed

---

## Open Questions to File (do not guess)

- **Does the Inner Circle 25 need a separate, lighter gate than a full public beta?** §26 frames the decision as the first 25 families specifically. A smaller, closely-watched cohort might justify accepting a documented limitation that a public beta would not. This plan assumes one gate for both; a founder call.
- **What is the rollback plan if a safety incident occurs during the beta?** Distinct from a deploy rollback. Should exist before families are admitted, and this plan does not assume it does.
- **Who other than the founder can sign off on section B?** Currently nobody — §16 makes it personal to the founder. Confirm this stays a single point of approval.
- **Is a load/concurrency check required before 25 families?** No such verification exists on record, and 25 families is small — but 25 simultaneous ~66s AI generations is not obviously safe on the current retry and pool settings. Worth measuring rather than assuming.
