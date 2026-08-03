# Adaptive Lesson Content Contract — Design Specification

**Status:** Draft for review
**Date:** 2026-07-19
**Owner:** Founder (Cameron Watson)
**Type:** Foundational content-model spec (sub-project 1 of 5 in the lesson-engine redesign)
**Builds on:** ADR-014 (Mission Compiler Constraint), ADR-015 (Conflict Resolution), ADR-016 (Mission Output Model), ADR-054 (AI Output Validation/Retry/Fallback Policy)
**Source brainstorm:** `docs/superpowers/handoffs/2026-07-05-lesson-engine-redesign-brainstorm-handoff.md`

---

## 0. How to read this document

### 0.1 What this is

This spec defines the **content model and generation contract** for L3ARN's adaptive lesson/mission engine — the schema and rules that determine what a lesson *is*, before any rendering, tutoring, or delivery-pipeline mechanics are built. It answers: what does a lesson need to contain, and where does each piece of it come from (human-authored vs. AI-generated), such that a lesson can genuinely teach — adapting to the child's learning style, the parent's preferences, and the subject's standard competency level — rather than being a clickthrough wrapped in an AI-generated story.

### 0.2 What this is NOT

This spec does **not** cover:
- The frontend runtime that renders lesson instances (replacing the hardcoded `MissionExperience.tsx` steps) — sub-project 2
- The live companion tutor's runtime hint-timing/escalation logic — sub-project 3 (this spec defines the hint *content* skeletons author, not when the tutor fires them)
- The generation/config pipeline's operational mechanics (queueing, retries-in-practice, monitoring) beyond the correctness gate itself — sub-project 4
- Evolving the mastery/evidence measurement pipeline beyond what's needed to consume this contract's evidence output — sub-project 5

Each of the above is a follow-on spec that consumes this contract as its foundation.

### 0.3 The problem this replaces

As documented in the source brainstorm (§2), today's Mission 001 has two disconnected systems: an AI-generated **story** (briefing screen only, via `compileStart()`) and six **hardcoded** React gameplay steps in `MissionExperience.tsx` that are identical for every child, contain no real discrimination (a single no-fail sort button), and ignore reading level, learning style, and the AI mission entirely. The `AIRawMissionOutputSchema` (`packages/mission-compiler/src/validation/mission-output.schema.ts`) already defines a richer six-output shape (parentPlan, student3dMission, interactiveLite, textAudioOffline, evidencePlan, rewardPlan) than the UI uses — this spec extends that existing contract rather than replacing it, closing the gap between the schema's ambition and the hardcoded reality.

### 0.4 The north star (non-negotiable)

> "If the lessons don't teach according to the child's learning style as well as the parent's learning preferences, as well as the standard level of competency for the subject, we have failed miserably." — Founder

Effectiveness is the point. A fun, engaging interaction that produces no real evidence of learning is a failure by this standard, full stop.

---

## 1. The effectiveness bar

A task instance counts as genuine mastery evidence only when the child clears **both** of the following:

1. **Discrimination** — chooses correctly among genuine wrong options (not a single no-fail button; real distractors the child could plausibly pick).
2. **Transfer** — applies the same rule correctly to a **new example the lesson has not shown them**, proving the concept generalized rather than being pattern-matched from the immediate context.

Verbal self-justification ("why did you pick that?") does **not** satisfy the bar on its own — a child can parrot reasoning without having generalized the rule. Transfer-to-a-new-example is the actual test.

This bar is what every authored skeleton (§4) must be built to produce evidence for, and it directly extends the existing `learning_evidence_events` / `mastery_records` pipeline — it changes what counts as a valid capture, not the pipeline's mechanics.

---

## 2. Learning-style adaptation

### 2.1 Dimensions

The contract adapts along **VARK-lite**: visual, auditory, reading-writing, kinesthetic. Each child has an inferred primary style (and optionally a secondary) derived from House Calling calibration signals (`house_calling_signals`) plus observed in-lesson behavior over time — not a one-time parent-entered label. This is consistent with the app's existing principle: parent config is the starting hypothesis, student behavior is ground truth.

### 2.2 What concretely changes per style

For a given task, the **rule, correct answer, and evidence requirement are identical across styles** — only the presentation and interaction affordance change:

| Style | What changes |
|---|---|
| Visual | Imagery/diagram-first presentation; items rendered with strong visual distinguishing features |
| Auditory | Read-aloud is the primary channel (see §3); companion dialogue carries more of the explanatory weight |
| Reading-writing | Text-first presentation at full density for the child's tier; written prompts carry the explanatory weight |
| Kinesthetic | Drag/manipulate-first interaction affordances preferred over tap/click where the task type allows it |

Style is one axis of the **variant-key** (§7) that determines which generated lesson instance a child receives for a given skeleton.

---

## 3. Accessibility: reading level and read-aloud

### 3.1 Read-aloud (TTS)

Read-aloud is **always available on every task, child-toggled, regardless of assessed reading level or learning style.** It is a universal affordance, not a "struggling reader" mode — this avoids stigma and serves kids who process audio faster than text regardless of reading ability. Every task's authored skeleton (§4) must supply a `readAloudScript` for its prompt (the schema already has this field on `AITextAudioOfflineSchema`; this contract extends it to every task, not just the offline output).

### 3.2 Text tiers

Three text-complexity tiers, assigned by **assessed reading level**, not raw grade:

- **Pre-reader/emerging** — icon+audio primary, minimal text, short sentences
- **Grade-level** — standard complexity for the child's grade
- **Advanced** — richer vocabulary/longer sentences for a child reading above grade

Assessed level comes from House Calling calibration plus observed behavior (e.g., time-to-comprehend, read-aloud usage pattern), so a 3rd grader reading at a 1st-grade level gets the pre-reader tier, and a 1st grader reading ahead gets the advanced tier. Reading tier is the second axis of the variant-key (§7).

---

## 4. The authoring model: skeletons + AI fill

This is the central architectural decision. **Curriculum content is hybrid-authored:**

- **Humans author a skeleton** per `(masterySkillId, l3arnMasteryLevel)` pair. A skeleton defines:
  - Task type (§5)
  - A **correct-answer rule**, expressed as a checkable predicate — not free text (e.g., "the correct bin is the one where `sides === 4`"), so it can be verified programmatically, not just described
  - A **distractor-generation rule** (what makes a wrong option plausible, not a random miss)
  - A **transfer-example rule** (what makes a valid "new example" for the transfer check)
  - A **3-tier hint ladder** (§8)
  - The standards mapping (`masterySkillId`, `masteryDomainId`, `floridaStandardCode`, `l3arnMasteryLevel`)

- **The AI fills in concrete specifics** constrained by the skeleton: the actual items, the actual distractor content, the actual transfer example, story flavor, and companion dialogue lines. The AI does **not** invent the rule, the pedagogy, or what counts as correct — it fills a mold.

This is what makes the correctness gate (§6) tractable: verifying that a generated item *satisfies an already-known-good rule* is a solved, deterministic problem. Verifying that AI-invented pedagogy is *itself correct* is not.

### 4.1 Why not fully AI-generated, and why not fully authored

- **Fully AI-generated per child** (structure + content + correct answers all invented fresh) maximizes personalization but makes the correctness gate responsible for validating pedagogy the AI invented from scratch — a categorically harder and less reliable problem, and one where a hallucinated "correct answer" becomes a live risk on every generation.
- **Fully authored** (humans write every item, no AI fill) is safest but has high authoring burden and shallow personalization — every child gets the same underlying items, just reworded.
- **Hybrid** keeps the correctness-critical part (the rule) authored and verifiable while getting AI-scale personalization on everything else (specific items, story, tone, per-child variant).

---

## 5. Task types (V1)

Four first-class task types, added to/extending the existing `MissionTaskSchema.interactionType` enum (`click | drag | choice | text-input | observe | sequence`):

| Task type | Purpose | Evidence produced |
|---|---|---|
| **sort / categorize** | Genuine multi-bin discrimination — replaces the current single-button `CrystalSortStep` | Discrimination evidence |
| **choice** | Multiple-choice with authored plausible distractors (not one right answer + throwaway wrong ones) | Discrimination evidence |
| **apply-to-new** | The transfer check — child applies the rule to an example not shown during teaching | Transfer evidence (§1) |
| **ai-mistake-check** | The AI-literacy beat — child critiques a flawed AI-generated output against authored plausible-but-wrong critiques | Discrimination evidence, tagged separately for AI-literacy tracking |

`ai-mistake-check` becomes a first-class, generatable, adaptive task type (its authored skeleton specifies the flawed output, the correct critique, and distractor critiques) rather than remaining the current hardcoded `AIMistakeStep`/`AI_MISTAKE_OPTIONS`. This preserves the AI-literacy beat as a core, trackable pedagogical thread rather than folding it into generic `choice` and losing that signal.

Free-response-graded text-input and drag-to-match/sequence primitives are explicitly **out of scope for V1** — the four above are sufficient to satisfy the effectiveness bar (§1) for the classification-style content Mission 001 already represents, and additional primitives should be added when a specific subject/skill genuinely needs them, not speculatively.

A single mission is composed of an ordered sequence of task instances (each referencing one skeleton), mirroring today's step-based structure but with each step now schema-driven and rule-verified instead of hardcoded.

---

## 6. Correctness gate

**A hallucinated "correct answer" is a catastrophic failure.** The gate is deterministic wherever possible, not another AI call grading an AI call:

1. **Schema validation** (Zod) — shape correctness, per the existing ADR-054 pattern. Extends `AIRawMissionOutputSchema` to cover the new per-task fields (rule references, distractor content, transfer examples, hint ladder fill, read-aloud scripts).
2. **Programmatic rule-check** — a deterministic function evaluates each AI-generated item against the skeleton's authored correct-answer rule (e.g., verifying a generated shape actually has the required number of sides before it's presented as the correct sort target). Because the rule is authored as a checkable predicate (§4), this check does not require another AI call and does not itself carry hallucination risk.
3. **Fails closed** — on rule-check or schema failure: retry generation (bounded, per existing ADR-054 retry policy), and if retries are exhausted, fall back to an authored example for that skeleton rather than serving unverified content. A child never sees an item that hasn't passed the gate.

This gate structure only works because of the authoring model in §4 — it validates AI output *against a known-good rule*, not AI-invented pedagogy against nothing.

---

## 7. Generation economics: variant-keys and caching

A lesson instance is generated **on-demand**, not pre-generated for every possible combination. The **variant-key** is:

```
(skeletonId, learningStyle, readingTier, l3arnMasteryLevel)
```

The first child to request a given skeleton at a given variant-key triggers generation; the validated result — including story flavor and companion dialogue — is cached and reused as-is for any other child who lands on the same key. This is a deliberate trade: per-child story personalization beyond the variant-key axes is out of scope for V1, in exchange for keeping generation cost and count bounded as the student base grows. If per-child story variation is wanted later, it is an additional variant-key axis for a follow-on spec to add, not a hedge in this one.

**Model choice:** skeleton-fill (pedagogy-bearing content — items, distractors, transfer examples) uses a **stronger model** than the existing fast story/briefing path, since the fill still has to invent factually-correct content (e.g., correctly noting a generated shape's side count) even though the rule-check catches wrong final answers. The existing fast model (`MISSION_START_MODEL=claude-haiku-4-5`) continues to handle only the ~5s story/briefing generation — this contract does not touch or regress that latency-critical path (`docs/superpowers/handoffs/2026-07-04-mission-fast-start-live-e2e-handoff.md`). Because skeleton-fill is cached by variant-key rather than generated live on every child's screen, its higher latency is acceptable — it happens once per variant-key, not once per session.

---

## 8. Companion hint hooks (authored, not runtime-generated)

Each task's skeleton authors a **fixed 3-tier hint ladder**, tied to the same correct-answer rule:

1. **Tier 1 — nudge**: gentle re-focus of attention, no new information
2. **Tier 2 — re-explain**: re-explains the rule a different way
3. **Tier 3 — state the rule**: states the rule directly

The content of each tier is authored (or AI-filled and rule-checked, same as other skeleton content) at generation time — **not improvised live by a runtime tutor**. This closes off a correctness risk (a live AI inventing an explanation of the rule mid-hint, with no gate) while still leaving the *decision of when to escalate through the tiers* to the future live-tutor runtime (sub-project 3), which observes the child's actual wrong-answer pattern. This spec fixes the hint *content*; the future spec owns hint *timing*.

---

## 9. Standards mapping and exceeding the benchmark

Each `masterySkillId` has an **authored ladder of skeletons**, one per `l3arnMasteryLevel` (`emerging → developing → proficient → advanced`), each tagged with its standards alignment (`masteryDomainId`, `floridaStandardCode`, `masteryObjective`). A child starts at the skeleton matching their assessed level for that skill. Clearing the effectiveness bar (§1) at one level unlocks the next skeleton up the ladder for that same skill.

**"Exceeding the benchmark"** — the founder's explicit local → state → national → world framing — is operationalized as **climbing further up an authored ladder per skill**, not as the AI improvising harder content on the fly. This keeps benchmark-exceedance auditable (a child's position on an authored ladder is a concrete, inspectable fact) and keeps the correctness gate's guarantees intact at every level, including the hardest ones.

---

## 10. Parent's role

Parent preferences (`parent_curriculum_prefs`: `focus_subjects`, `approval_mode`) act at the **selection and gating** layer, not the content layer:

- `focus_subjects` narrows the pool of eligible skeletons a child can be served next
- `approval_mode` determines whether a generated lesson instance requires parent approval before a child plays it

Parents do not edit pedagogical content directly — the authored rule and the AI fill remain in charge of *how* a concept is taught. This preserves a single source of pedagogical truth (the skeleton) rather than forking it per-parent, while still giving parents real control over scope and delivery.

---

## 11. Forward compatibility (hooks for sub-projects 2–5, not built here)

This contract is designed so later specs can consume it without a breaking rework:

- **Task-level IDs** (already present on `MissionTaskSchema`) give the future adaptive runtime (sub-project 2) what it needs for exit/save/resume at task granularity.
- **The 3-tier hint ladder** (§8) gives the future live-tutor runtime (sub-project 3) authored content to select from; it only needs to add timing/escalation logic, not content generation.
- **The variant-key structure** (§7) gives the future generation/config pipeline (sub-project 4) a concrete caching unit to build operational mechanics (queueing, monitoring, pre-warming popular keys) around.
- **Evidence-capture types already distinguish `ai-mistake-check`** and the discrimination/transfer split from §1, giving the future mastery-measurement evolution (sub-project 5) richer, truer evidence than today's single no-fail-button captures.

---

## 12. Explicitly out of scope for this spec

- Frontend rendering of any of the above (sub-project 2)
- Live tutor timing/escalation decisions (sub-project 3)
- Operational generation pipeline mechanics — queueing, monitoring, pre-warming (sub-project 4)
- Mastery/evidence pipeline schema evolution beyond consuming this contract's new evidence types (sub-project 5)
- Free-response-graded, drag-to-match, and sequence/ordering task types (deferred until a concrete skill needs them)
- Multi-language content (not raised in the source brainstorm; assumed English-only for V1)

---

## 13. Open questions carried forward

None blocking — all design questions raised in the source brainstorm's agenda (§3, items 1–8, 10) that fall within this sub-project's scope were resolved above. Items 4 (companion-as-live-tutor *runtime*), 9 (exit/save/resume *runtime*), and 11 (generation *pipeline* operational mechanics beyond the correctness gate) are explicitly deferred to their respective follow-on specs per §0.2, with this contract's hooks (§11) designed to support them.
