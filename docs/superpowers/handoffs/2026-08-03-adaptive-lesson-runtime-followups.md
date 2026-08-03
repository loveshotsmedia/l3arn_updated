# Adaptive Lesson Runtime — Follow-up Register

Branch: `feature/adaptive-lesson-runtime` (25+ commits off `main` @ `8eb494d`)
Source: consolidated from every subagent-driven task review + a final whole-branch
review conducted before merge. All three merge-blocking items found by the final
review have been fixed and re-verified (see commits `f9c13d8`, `de7720b`, `ab10e72`,
`ea4dd68`). Everything below is a non-blocking fast-follow, ranked by priority.

## High-value fast-follow

1. **Evidence-type enum is quadruplicated, and one copy has already drifted.**
   `apps/web/src/lib/student-session.ts`'s `EvidenceCapturePayload["evidenceCaptureType"]`
   is missing `discrimination-check`/`transfer-check` (the two types this branch
   exists to add) — it isn't caught by typecheck because `page.tsx`'s `tryCapture`
   dynamic-import shim casts the callee to an untyped signature, erasing the union.
   Fix: import `EvidenceCaptureType` from `@l3arn/shared-types` in `student-session.ts`
   instead of re-declaring it; derive the ai-workers route's inline `z.enum` from
   `EvidenceCaptureTypeSchema` too, collapsing 3-4 independently-maintained lists to 1.

2. **`tryCapture`'s dynamic-import shim in `page.tsx` is stale and silently swallows
   every evidence-capture failure.** `captureEvidence` has been a plain static export
   of `student-session.ts` for a while — the `await import(...)` + `typeof === "function"`
   probe + bare `catch {}` is vestigial. Replace with a direct import and log failures
   (don't let evidence capture fail invisibly).

3. **Zero test coverage of `page.tsx`'s state machine.** All 3 post-hoc bugs found
   during live verification (key-prop state leak, missing resume mechanism, stuck-loading
   on lesson-fetch failure) lived in this untested layer. Recommend ~6 integration tests:
   fresh mount, resumed mount, lesson-fetch failure on both the resumed and non-resumed
   paths, task advance, exit-persistence. Also: no `.github/workflows` exist anywhere in
   this repo, and `apps/web` has no ESLint config (`next lint` drops into an interactive
   setup prompt) — wiring `typecheck`+`test` into CI would have caught several of the
   dead-code items below automatically.

4. **Apply-to-new transfer step (Step 4) is unmissable.** `SortTrayTask` renders only
   `[fill.transferItem]` when `isTransferStep` — a single always-correct button. The
   fixture's two distractors are authored but never rendered, and `storyFlavor` still
   says "The Purple Bin needs a crystal" while the only option is orange. This is
   plan-conformant (the plan's own reference code does this), but it means one of the
   two headline "genuine transfer, not no-fail" claims currently ships as a no-fail tap.
   Needs a product decision: should the transfer step show 1 target among distractors,
   like the sort rounds do, or is single-item confirmation intentional for this step type?

5. **`completeMission` writes evidence for a task the runtime no longer has.**
   `MISSION_001_EVIDENCE_SPEC` still includes `task-explain-rule`/`explanation`
   ("Explain the Sorting Rule") — a step this branch deleted from `page.tsx` — and
   upserts a mastery record off the back of it. Meanwhile the real gameplay evidence
   (`discrimination-check`/`transfer-check`, written by `/evidence`) never gets
   `mastery_skill_id` set even though `LessonTaskSkeleton` carries one, so the genuine
   evidence this branch exists to produce doesn't join any mastery record yet. Mastery
   measurement is explicitly a separate sub-project — just flagging so a parent report
   doesn't silently assert a deleted step happened.

## Tracked, lower priority

6. Enforce `taskInstanceId` uniqueness in `MissionLessonResponseSchema` (a `.superRefine`)
   before sub-project 4's generation pipeline lands — `key={taskInstanceId}` is now the
   only thing preventing the key-prop soft-lock bug from recurring, and nothing currently
   enforces the IDs it depends on are actually unique.
7. Propagate the per-component fixes that didn't fully generalize: `HintButton`'s
   self-healing `useEffect`-based reset (independent of caller remembering a `key`) never
   got applied to any future task-type renderer's design pattern; `type="button"` was only
   added to `SpeakerButton`, not `HintButton`/exit-dialog/option buttons; `SortTrayTask`'s
   aria-label outcome-suffix pattern was never applied to `OptionListTask`'s bare ✓/✗ glyphs.
8. `totalAttempts`/`hintsUsed` semantics changed silently when hint-tap wiring was rebuilt
   (a hint tap used to bump both counters; now only `hintsUsed`). `calibration-engine.ts`
   still maps `totalAttempts` to the `persistence` signal — confirm this redefinition is
   intentional. Related: `calibration-engine.ts` picks its structured-replay row via
   `.find()` over an unordered query spanning the child's whole history — which row wins
   when multiple exist is arbitrary; should be ordered/filtered deterministically.
9. `mission-control-data.ts`'s doc comment ("every attempt row is a start") is now
   inaccurate post-resume (a row can be a multi-session run) — update the comment and
   re-derive `totalStarted`/`completionRatePct`'s meaning if they're used in a parent-facing
   or founder-facing metric.
10. Exit-handler in `page.tsx` discards `updateTaskIndex`'s `ApiOutcome` and navigates away
    regardless of success — a 403/500 on that call currently loses progress silently on
    the one path whose entire job is preserving it.
11. Rewrite the ai-mistake-check fill's option text — both distractors end "...not a
    mistake," the correct option ends "The companion made a mistake!" — pattern-matchable
    without actually counting anything, and no crystal is visually rendered to count despite
    "count them yourself" language.
12. Remove dead code: `page.tsx`'s unused `isTransferStep` state (the actual `isTransferStep`
    JSX prop is an unrelated boolean-shorthand literal); unused `skeleton` prop in both
    `SortTrayTask`/`OptionListTask`.
13. Add a partial unique index (`mission_attempts (child_profile_id, mission_id) WHERE
    status='started'`) to close the check-then-insert/check-then-update race documented
    in `startMission`'s own comments — currently a narrow, non-corrupting but real race.
14. `SpeakerButton`'s known iOS Safari `cancel()`→`speak()` race is caught and logged, not
    recovered — needs a real-device smoke test before relying on it broadly.
15. Confirm `reactStrictMode`'s dev-mode double-invoke of `startMission`'s effect doesn't
    do anything unexpected in production (single-invoke there) — it didn't cause problems
    during live verification, but wasn't explicitly stress-tested for it.
16. No staleness cutoff exists on resumable mission attempts (a `started` attempt from
    weeks ago is exactly as resumable as one from 5 minutes ago) — intentionally deferred
    per this branch's scope, but worth a real product decision at some point.
17. Update the plan doc's checkboxes (`docs/superpowers/plans/2026-07-20-adaptive-lesson-runtime-implementation.md`)
    and `MEMORY.md`'s note that sub-project 2 "needs its own brainstorm first" — it's built.
