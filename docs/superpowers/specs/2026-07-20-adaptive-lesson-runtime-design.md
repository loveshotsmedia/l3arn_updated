# Adaptive Lesson Runtime — Design Specification

**Status:** Draft for review
**Date:** 2026-07-20
**Owner:** Founder (Cameron Watson)
**Type:** Frontend rendering spec (sub-project 2 of 5 in the lesson-engine redesign)
**Builds on:** `docs/superpowers/specs/2026-07-19-lesson-engine-content-contract-design.md` (sub-project 1 — the content contract this runtime renders)
**Source brainstorm:** this session (superpowers:brainstorming), following on from `docs/superpowers/handoffs/2026-07-05-lesson-engine-redesign-brainstorm-handoff.md`

---

## 0. How to read this document

### 0.1 What this is

This spec defines the **frontend runtime that renders real, adaptive lesson interactions** from the content contract sub-project 1 built — replacing the six hardcoded gameplay steps that currently live in `apps/web/src/app/(student)/mission/[missionId]/page.tsx` (a single file; there is no longer a separate `MissionExperience.tsx` — that structure existed at the time of the original handoff but the code has since been consolidated into `page.tsx`, functionally unchanged: still six hardcoded steps, still a single no-fail sort button, still no exit, still no learning-style adaptation).

### 0.2 What this is NOT

This spec does **not** cover:
- The live companion tutor's runtime hint-*timing*/escalation logic (sub-project 3) — this spec renders the authored hint ladder and lets the *child* trigger escalation by tapping a button; deciding *when* to auto-escalate based on behavior is sub-project 3's job
- The real AI generation pipeline, its retry/fallback mechanics, or the variant-key cache's operational behavior (sub-project 4) — this spec consumes **hand-authored fixture `SkeletonFill`s**, not live-generated content
- Evolving the mastery/evidence measurement pipeline beyond adding the two new evidence capture types this spec needs (sub-project 5 owns the rest of that evolution)
- Generalizing to any mission beyond Mission 001 — this spec is explicitly scoped to replacing Mission 001's specific flow, mirroring how sub-project 1's worked example was also Mission-001-specific

### 0.3 The problem this replaces

Today, `page.tsx` renders six hardcoded React components (`CrystalSortStep` ×3, `AIMistakeStep`, `ExplainRuleStep`, `ReflectionStep`). The crystal-sort steps are single-button, no-fail — the child cannot be wrong, so nothing is actually discriminated or evidenced. There is no reading-level adaptation, no learning-style adaptation, no read-aloud, and no exit button during gameplay (the child is trapped until completion). This spec fixes all of that for Mission 001 specifically, proving the sub-project 1 content contract renders correctly on real content before generalizing further.

### 0.4 A note on how this spec got here

The first design pass for the sort task used invented, abstract content ("4-sided/6-sided" shapes) to compare interaction mechanics, and separately proposed color-only bin coding. Both were wrong in ways that mattered: the abstract content obscured what was actually being taught, and color-only encoding would silently fail colorblind children (~8% of boys). Both were caught and corrected before this spec was written, using (a) the real, already-live Mission 001 narrative (color-sorting crystals, companion line "what do all the crystals in that group have in common") and (b) real early-childhood/accessibility UX research, cited in §3. This spec reflects the corrected, grounded design — the process is noted here because it directly shaped the final answer, not as a retrospective aside.

---

## 1. Architecture

### 1.1 New backend route

`GET /api/student/mission/:missionId/lesson` (Railway, `services/ai-workers`) — a new, separate route. The existing `/api/student/mission/start` keeps generating the AI story/briefing exactly as today (the already-tuned `contentSource:"ai"` ~5s fast-start path is untouched — zero regression risk to something that already works).

Server-side, this route:
1. Derives the child's learning style (VARK-lite) and reading tier from calibration data — same source pattern `compileStart()` already uses for personalization
2. Looks up the fixture `SkeletonFill` matching the relevant skeleton + variant-key (`(skeletonId, learningStyle, readingTier, l3arnMasteryLevel)`, per sub-project 1 §7)
3. Returns it as JSON

The frontend does not know or care that the content is a fixture. When sub-project 4 ships, only this route's internals change (fixture lookup → real generation + correctness gate + cache); the frontend contract defined in this spec does not change.

### 1.2 Fixture content (built as part of this sub-project)

Two additional hand-authored `LessonTaskSkeleton` + `SkeletonFill` pairs, following the exact pattern of sub-project 1's `AI_MISTAKE_SHAPE_SIDES_SKELETON` worked example:
- **sort-categorize**: color-sorting, targeting `REASONING.USE_EVIDENCE_TO_DECIDE` (a real Mission 001 skill) — "uses available evidence... rather than guessing," which is exactly what sorting-by-color-not-guessing demonstrates. Correct rule: item's color matches the target bin's color. Real crystal colors (red/blue/green), matching the existing narrative.
- **apply-to-new**: the transfer check for the same skill — a crystal in a color already used in the sort tray, never shown during the sort itself, testing whether the child generalized "group by color" as a rule rather than memorizing specific items.

The existing sub-project 1 `AI_MISTAKE_SHAPE_SIDES_SKELETON` fixture is reused as-is for the `ai-mistake-check` task type — no change needed there; this spec's frontend renderer just needs to handle that task type correctly.

### 1.3 Frontend structure

`page.tsx`'s phase state machine (`loading → briefing → step → completing → done → error → dev-fallback`) keeps its current shape. What changes is what `step` phase renders: instead of the four hardcoded step components, a small set of **task-type renderer components**, one per `LessonTaskTypeSchema` value (`sort-categorize`, `choice`, `apply-to-new`, `ai-mistake-check`), each taking a `LessonTaskSkeleton` + its `SkeletonFill` as props and rendering the appropriate interaction.

Mission 001's real task sequence becomes: **sort-categorize → apply-to-new → ai-mistake-check → reflection** (reflection is not a graded content-contract task type — it stays as today's ungraded, no-right-answer reflection prompt, unchanged).

---

## 2. Task-type renderers

### 2.1 `sort-categorize`

- A mixed tray of 6 crystals (2 each of red/blue/green) and all 3 bins visible simultaneously, so a wrong placement is a real, possible mistake — not a trick, an honest test of "did you use color as evidence."
- **Interaction: tap-then-tap-bin** (select a crystal, then tap its bin) — not drag-and-drop. This is a research-grounded choice, not a preference: fine motor dexterity for dragging takes years to develop reliably in this age band, while tapping large targets is accessible across the whole K-8 range (see §3 for sources).
- **Every bin renders with three redundant signals**: a background color fill, a text label ("Red Bin"), and a distinct shape icon (▲ ● ■) — never color alone, so a colorblind child (~8% of boys, most commonly red-green) can still succeed via label or shape.
- **Touch targets sized generously** (~64px+ for both tray items and bins), consistent with research recommending targets roughly 4× the adult-standard size for children's still-developing motor control.
- A wrong tap is logged as genuine discrimination evidence (capture type `discrimination-check`, §5) — not silently blocked or auto-corrected.
- **Kinesthetic-style adaptation**: rather than real drag-and-drop (rejected — see the tension noted below), a kinesthetic-preferring child gets a more physical *feel* within the same tap mechanic: a tap-and-fly animation (the crystal visibly arcs into the bin with motion/sound feedback) versus a plainer instant-swap for other styles. Physicality lives in the feedback/animation layer, not the input mechanic, so no child is asked to perform a harder gesture than their motor skills support.

**Note on a spec correction:** sub-project 1's content-contract spec (§2.2) described kinesthetic learners getting "drag/manipulate-first interaction affordances." This sub-project's research shows real drag-and-drop is developmentally risky for this age band regardless of learning-style preference — motor-skill readiness and learning-style preference are not the same signal, and giving the sub-group most associated with "wants to manipulate things" the objectively harder gesture would be a real accessibility regression. This spec supersedes that detail: kinesthetic adaptation is expressed as animation/feedback richness, not a harder input mechanic.

### 2.2 `choice`, `apply-to-new`, `ai-mistake-check`

These reuse the existing option-button pattern already live in the codebase (`AIMistakeStep`/`ExplainRuleStep`'s button list, which already pairs color with ✓/✗ icons — reasonable redundancy). Two changes:
1. **Touch targets enlarged.** Today's option buttons are roughly 45-50px tall (padding `0.875rem 1rem`, no explicit min-height) — below the research-recommended range for this age band. Padding increases to meet the same touch-target guidance as the sort bins.
2. **`apply-to-new` renders the same choice/selection UI as `choice`**, but the presented item is the fill's `transferItem` (the novel, unseen-during-teaching example) rather than one of the teaching items — the UI doesn't need new interaction code, just a different data source and a distinct evidence capture type (`transfer-check`, §5).

### 2.3 Accessibility (applies to every task type)

- A speaker icon button next to every prompt and every hint tier, always visible, child-toggled — per sub-project 1's spec, never a "struggling reader" mode, just a universal affordance
- Text rendered at the child's assessed reading tier (pre-reader: icon+minimal text; grade-level: standard; advanced: richer vocabulary) — sourced from the `SkeletonFill`'s per-tier content, per sub-project 1 §3
- Right/wrong feedback never relies on red/green alone (a specifically risky pairing for the most common form of colorblindness) — pairs with the existing ✓/✗ icons

---

## 3. Research grounding (why, not just what)

This section exists because the first design pass for §2 skipped this step and produced content that obscured the lesson rather than teaching it. The following findings directly shaped §2's decisions:

- **Tapping large targets is accessible across the K-8 range; dragging is a fine-motor-skill-demanding gesture that takes years to develop reliably in young children.** Recommended touch targets for young children are roughly 4× the adult-standard size. This is why §2.1 specifies tap-then-tap-bin over drag-and-drop, and why §2.1 explicitly revises sub-project 1's kinesthetic-drag assumption. ([Design for Kids Based on Their Stage of Physical Development, NN/g](https://www.nngroup.com/articles/children-ux-physical-development/); [Touch Targets on Touchscreens, NN/g](https://www.nngroup.com/articles/touch-target-size/); [Touchscreen Prompts for Preschoolers, ACM/UW](https://dl.acm.org/doi/10.1145/2771839.2771851); [Selection of touch gestures for children's applications](https://www.researchgate.net/publication/261167268_Selection_of_touch_gestures_for_children's_applications))
- **Color-coding must never be the only signal** — it must be paired with a redundant cue (text label, icon, or shape), because a meaningful fraction of any classroom (most commonly boys, red-green) cannot reliably distinguish color-only encoding. Red/green specifically as a right/wrong pairing is a known trap for the same reason. This is why §2.1's bins carry three redundant signals, and why §2.3 avoids red/green-only feedback. ([Don't use color alone to convey information, Access Guide](https://www.accessguide.io/guide/colorblind); [Accessible UI Design for Color Blindness, rgblind.com](https://rgblind.com/blog/accessible-ui-design-for-color-blindness))
- **Classification by a shared visual attribute (like color) is developmentally appropriate for this audience** — preschool card-sorting research shows 4-year-olds reliably classify by an abstract shared attribute when the task is well-structured, well within reach of L3ARN's stated K-8 range. This confirms color-sorting is a sound task design, not a developmentally risky one, as long as the interaction itself follows the guidance above. ([Card sorting activities with preschool children](https://www.researchgate.net/publication/221437152_Card_sorting_activities_with_preschool_children))

---

## 4. Hints

Each task renders a visible **"I'm stuck?"** button, reading the skeleton's authored 3-tier hint ladder from the `SkeletonFill` (sub-project 1 §8 — content is authored, this spec only renders it). Tapping it escalates: first tap → tier 1 (nudge), second tap → tier 2 (re-explain), third tap → tier 3 (state the rule). Escalation is purely child-triggered — there is no auto-detection of struggle or wrong-answer-pattern-based timing; that decision logic is explicitly sub-project 3's job. This is a real, useful placeholder behavior (strictly better than today's static companion lines) that sub-project 3 can later replace with auto-triggered escalation without changing how hints are displayed.

---

## 5. Evidence capture

Two new values are added to `EvidenceCaptureTypeSchema` (`packages/shared-types/src/evidence.schema.ts`):
- **`discrimination-check`** — used for `sort-categorize` and `choice` task completions
- **`transfer-check`** — used for `apply-to-new` task completions

`ai-mistake-check` already exists in the schema and is reused as-is. This is a small, additive schema change, made now rather than deferred to sub-project 5, because mapping these onto an existing-but-wrong type (e.g., `decision-log` or `explanation`) would mean every evidence record this sub-project writes mislabels what it actually proved — exactly the kind of gap between "looks done" and "is done" this whole project exists to close.

Each task completion writes a `LearningEvidenceEvent` (existing shape from `packages/shared-types/src/evidence.schema.ts`) using the correct capture type, replacing today's ad-hoc `tryCapture` calls (which currently use `sequence-completion` for the crystal sort and `decision-log`/`explanation`/`reflection` for the other steps, none of which map correctly to the new task types' actual semantics).

---

## 6. Exit and resume

A visible exit button is added during gameplay — today there is none; the child is trapped until mission completion, a gap explicitly named in the original handoff. Tapping it shows a "leave mission?" confirmation (preventing an accidental exit mid-task), then persists the mission attempt's current task index. Re-entering the same mission resumes from that exact task rather than restarting from the beginning. This is a small, bounded piece of state (one integer: which task the child was on) — not a full step-level interaction-state snapshot.

---

## 7. Testing

- **Component-level tests per task-type renderer**: render a fixture `SkeletonFill` → simulate a tap sequence → assert correct/incorrect routing and the shape of the evidence payload produced.
- **One end-to-end Playwright pass through the full Mission 001 flow**: briefing → sort-categorize → apply-to-new → ai-mistake-check → reflection → completion, including a mid-mission exit and re-entry, verifying resume-from-exit actually lands on the correct task.

---

## 8. Explicitly out of scope for this spec

- Hint escalation *timing*/auto-detection (sub-project 3)
- Real AI generation, the correctness gate's live operational behavior, retry/fallback, and cache population (sub-project 4) — this spec consumes hand-authored fixtures only
- Any evolution of the mastery/evidence measurement pipeline beyond the two new evidence capture types this spec needs (sub-project 5)
- Generalizing the runtime to missions beyond Mission 001
- Real drag-and-drop as an interaction mode (explicitly rejected per §2.1 and §3, not merely deferred)

---

## 9. Open questions carried forward

None blocking. All design questions raised during this session were resolved above, including one correction to sub-project 1's spec (§2.1's kinesthetic-adaptation note) and one small, additive schema change proposed and accepted in-session (§5's two new evidence capture types).
