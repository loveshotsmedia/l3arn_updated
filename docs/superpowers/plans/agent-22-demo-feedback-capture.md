# Agent 22 — Demo Feedback Capture

_Plan recreated 2026-09-07 from `docs/CODEX_HANDOFF.md` §15 + `docs/AI_HARDENING_BACKLOG.md` | Pre-Beta Hardening Wave, agent 4 of 5_

---

## Clearance

Agent 22 is cleared to begin **immediately and may run in parallel** with Agents 19–21. `docs/CODEX_HANDOFF.md` §25 lists it as the one item in this wave with no ordering dependency.

**This agent is docs and process only.** §15 states it plainly: "Docs/process only." Agent 22 writes **no application code**, adds **no** migration, adds **no** UI, and creates **no** table. If this agent finds itself editing anything under `apps/`, `services/` or `packages/`, it has left its mandate.

Its purpose: give the founder a structured instrument for capturing what happens when a real human is put in front of the live Hero Slice — starting with the founder's own manual walkthrough, which §3 records as **NOT YET COMPLETED** and §25 lists as step 1 of the whole sequence, ahead of Agent 19.

Read first:
- `docs/CODEX_HANDOFF.md` — especially §3 (Current readiness labels), §11 (Mission 001 canonical sequence), §13 (First Learning Map), §16 (Founder Manual Test Still Required), §25 (expected next sequence), §26 (Current Milestone Definition)
- `docs/superpowers/plans/agent-12-gtm-beta-ops.md` — beta applicant scoring already exists; the demo scoring here must not contradict or duplicate it
- `docs/CONTEXT.md` §9 (Beta Launch Sequencing and Wave Strategy)
- `docs/agent_operating_rules.md` — demo data rules

---

## Guardrails

1. **No application code.** No tables, no routes, no components, no migrations. Markdown deliverables only.
2. **No new product scope** (§24) — this agent is the least likely to violate that and the most likely to be tempted to "just add a quick feedback form." Do not.
3. **No real family data.** Demo sessions use fake/sample child data only, per `agent_operating_rules.md` and the Agent 12 guardrails. If a real family is ever observed, the notes must be de-identified at capture time — not later.
4. **Do not treat demo credentials as repository documentation** (§24). No credentials in any file this agent creates.
5. **Automated verification is not product approval** (§16). This instrument exists precisely because the two are different; do not build anything that lets a passing E2E run substitute for an observed human reaction.
6. **Feedback is evidence, not a mandate.** Captured friction feeds the founder's decisions; it does not authorise a new build during this wave.

---

## Current State (verified against `main`, 2026-09-07)

- The Hero Slice is live and production-verified end-to-end at `https://l3arnupdated.vercel.app` (§3), with the 16-step verification listed there.
- **Founder manual product walkthrough: NOT YET COMPLETED** (§3). This is the gap Agent 22 serves.
- Internal guided demo: READY. Real-family beta: NOT CLEARED.
- No feedback-capture artefact exists in the repo: `docs/` contains no demo-feedback, walkthrough or scoring document.
- Mission 001's canonical interactive sequence (§11) is Briefing → Red/Blue/Green crystal sorts → AI Mistake Check → Explain Rule → Reflection → Done. The capture instrument must follow this exact sequence so friction can be attributed to a specific step.
- Production real-AI generation runs ~66 seconds (§3, §23) — long enough that observers will react to the wait. Latency perception is one of the things this instrument must capture, since §23 defers perceived-latency work to a later, separate decision that will need this evidence.

---

## Required Capture Dimensions

From `docs/CODEX_HANDOFF.md` §15, Agent 22 must capture:

- parent reaction
- child excitement
- friction
- mission confusion
- report clarity
- guided-demo readiness scoring

§16 adds the founder's own qualitative questions, which must appear verbatim in the instrument:
- Does the experience feel magical?
- Does House Calling feel important enough?
- Does Mission 001 feel like actual learning?
- Does the companion feel alive?
- Does the report make sense immediately to a parent?

---

## Scope

### Task 1 — The founder walkthrough script

New file: `docs/demo/FOUNDER_WALKTHROUGH.md`

A step-by-step script for the founder's own manual pass, ordered exactly as §16 lists it: login → parent dashboard → Start Session → child entry → House Calling → companion selection → Mission 001 → rewards → First Learning Map → Founder Mission Control.

For each step, three fields and no more: **what to do**, **what should happen**, **what actually happened**. Keep it short enough to complete in one sitting while the app is open — an instrument that takes longer than the walkthrough itself will not get used, and an unused instrument is worse than none.

Each step also carries the §16 qualitative prompt that applies to it, so the felt reaction is captured in the moment rather than reconstructed afterwards.

### Task 2 — The observed-session capture template

New file: `docs/demo/DEMO_FEEDBACK_TEMPLATE.md`

One copy per observed session, for guided demos with someone other than the founder. Sections, mapped to the six required dimensions:

1. **Session context** — date, observer, sample child age band, device, browser, connection. No real names, no credentials.
2. **Parent reaction** — captured at three moments: dashboard, mission-in-progress, First Learning Map. Verbatim quotes preferred over paraphrase; a parent's actual words are the highest-value artefact in this whole instrument.
3. **Child excitement** — per Mission 001 step (§11 sequence), plus House Calling and companion selection separately, since those are identity moments rather than learning moments and can succeed or fail independently.
4. **Friction** — every hesitation, wrong click, re-read, or moment of waiting. Record where the observer had to explain something: **an explanation given is a friction point**, and it is the one observers most reliably forget to write down. Note the ~66s generation wait explicitly and what the parent and child did during it.
5. **Mission confusion** — which of the six steps, and what the confusion was about (instruction, mechanic, or purpose — these have different fixes).
6. **Report clarity** — can the parent state what their child learned, unprompted, within 30 seconds of seeing the First Learning Map? Yes/no plus their words. This is the sharpest single question in the instrument.
7. **Guided-demo readiness score** — see Task 3.
8. **Blockers observed** — anything that would embarrass the product in front of a real family.

### Task 3 — Guided-demo readiness scoring

New file: `docs/demo/GUIDED_DEMO_READINESS.md`

A small, explicit rubric. Keep it coarse — a fine-grained score invites false precision from a sample of one or two sessions.

- Score each of five dimensions 1–5: **magic**, **identity weight** (House Calling), **learning credibility** (Mission 001), **companion aliveness**, **parent report clarity**. These are §16's questions turned into scored dimensions, deliberately.
- Record the score with a one-line justification per dimension. **A score with no justification is not data** and should be treated as missing.
- Define the readiness threshold as a founder judgement informed by the scores, **not** an arithmetic gate. §24 forbids marking beta ready because a metric passed, and a mean score is exactly the kind of metric that invites that error.
- **Do not duplicate Agent 12's beta applicant Fit Score.** That scores *applicants*; this scores *the demo experience*. Add an explicit note in the file distinguishing them so a future reader does not conflate the two.

### Task 4 — Feedback log and the routing rule

New file: `docs/demo/DEMO_FEEDBACK_LOG.md`

A running index: one row per session — date, observer, readiness scores, top three friction points, link to the filled template.

Include the routing rule, and state it as a rule rather than a suggestion:

- **Reliability friction** (timeouts, failures, the wait) → evidence for Agent 19; do not fix here.
- **Safety-adjacent friction** → Agents 20/21.
- **Report comprehension friction** → Agent 21.
- **Product/scope desires** ("it should also do X") → `docs/OPEN_QUESTIONS.md`, **not** implemented. §24: no new product scope during this wave. This is the routing rule most likely to be broken, because a compelling piece of demo feedback is the most tempting reason to break it.
- **Beta-readiness blockers** → Agent 23's checklist.

### Task 5 — Wire the instrument into the handoff

Add a short pointer in `docs/CODEX_HANDOFF.md` §15 under Agent 22 and in §16, naming the four new files so the next agent entering the repo finds the instrument instead of reinventing it. Keep the edit minimal — this agent does not rewrite the handoff.

---

## Verification

This agent has no test suite. Verification is that the instrument survives real use:

1. **The founder actually completes `FOUNDER_WALKTHROUGH.md`** against the live production app, with the "what actually happened" column filled in. Until that happens, Agent 22 has produced an untested instrument, and it should be reported that way.
2. At least one filled `DEMO_FEEDBACK_TEMPLATE.md` exists (the founder's own session counts).
3. `DEMO_FEEDBACK_LOG.md` has its first row.
4. Every captured item is routed per Task 4, with nothing implemented during this wave.
5. No file this agent created contains credentials, real child data, or a real family name.
6. `git diff --stat` shows changes only under `docs/` — proof the docs-only mandate held.

---

## Definition of Done

- [ ] `docs/demo/FOUNDER_WALKTHROUGH.md` — all 10 §16 steps, with the qualitative prompts inline
- [ ] `docs/demo/DEMO_FEEDBACK_TEMPLATE.md` — all six required dimensions from §15
- [ ] `docs/demo/GUIDED_DEMO_READINESS.md` — five scored dimensions, justification required, no arithmetic gate, distinguished from Agent 12's Fit Score
- [ ] `docs/demo/DEMO_FEEDBACK_LOG.md` — index plus the routing rule
- [ ] `docs/CODEX_HANDOFF.md` §15/§16 point to the new files
- [ ] Founder walkthrough **completed** and logged (or explicitly reported as still outstanding)
- [ ] No credentials, no real child data anywhere in the new files
- [ ] `git diff --stat` confirms docs-only
- [ ] Anything captured that implies new scope is filed in `docs/OPEN_QUESTIONS.md`, not built

---

## Open Questions to File (do not guess)

- **Should observed-session feedback eventually be captured in-product rather than in markdown?** Probably yes, and it is new scope — file it, do not build it during this wave.
- **How many observed sessions before the Inner Circle 25 opens?** §26 frames the milestone as deciding whether L3ARN is ready for the first 25 families, but does not set a sample size. A founder call.
- **Who may run a guided demo besides the founder?** Affects whether the template needs de-identification instructions for third-party observers. Assumed founder-only for now.
- **Does the ~66s generation wait need a holding experience before any guided demo happens?** This instrument will produce the evidence; §23 keeps the decision separate and later.
