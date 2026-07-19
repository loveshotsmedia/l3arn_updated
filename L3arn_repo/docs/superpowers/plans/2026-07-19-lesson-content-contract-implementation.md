# Adaptive Lesson Content Contract — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the content model and correctness gate defined in `docs/superpowers/specs/2026-07-19-lesson-engine-content-contract-design.md` — the schemas and deterministic validation that let a lesson task be human-authored as a "skeleton" (with a checkable correct-answer rule) and AI-filled with concrete content that is verified, not trusted, before it could ever reach a child.

**Architecture:** New Zod schemas in `@l3arn/shared-types` define the skeleton, its rule-predicate DSL, and the AI-fill shape. A new pure-function rule evaluator and a deterministic correctness gate live in `@l3arn/mission-compiler`, alongside one fully worked example skeleton (the AI-mistake-check beat from Mission 001, made first-class per spec §5). A new Supabase migration adds durable storage for authored skeletons and the variant-key fill cache from spec §7. No frontend rendering, live-tutor runtime, or generation-pipeline wiring is touched — those are sub-projects 2–4, out of scope here (spec §0.2, §12).

**Tech Stack:** TypeScript, Zod 3.25, Jest + ts-jest (new to this package), Postgres/Supabase migrations, pnpm workspaces.

---

## Before you start

This plan touches two existing packages (`@l3arn/shared-types`, `@l3arn/mission-compiler`) and adds one new Supabase migration. Read the committed spec first — every task below cites the spec section it implements; if anything here seems to contradict the spec, the spec wins and this plan has a bug.

**A pre-existing gap you'll fix in Task 1:** `packages/mission-compiler/package.json` has a `test` script (`node --experimental-vm-modules node_modules/.bin/jest`) but `jest` was never added as a dependency — running `pnpm --filter @l3arn/mission-compiler test` today fails with `Cannot find module '...\node_modules\.bin\jest'`. There is one pre-existing test file (`src/rewards/mission-001-reward-rules.test.ts`) that has apparently never actually run. Task 1 fixes this — every later task in this plan depends on a working test runner.

---

### Task 1: Fix mission-compiler test infrastructure

**Files:**
- Modify: `packages/mission-compiler/package.json`
- Create: `packages/mission-compiler/jest.config.cjs`

This is an infrastructure fix, not new behavior — there's no new logic to write a failing test for. Instead, verify the fix by getting the existing (currently non-functional) test suite to actually run and pass.

- [ ] **Step 1: Add jest, ts-jest, and @types/jest as devDependencies**

Run:
```bash
pnpm add -D jest@^29.7.0 ts-jest@^29.1.0 @types/jest@^29.5.0 --filter @l3arn/mission-compiler
```

- [ ] **Step 2: Create the Jest config**

Create `packages/mission-compiler/jest.config.cjs`:

```js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.test.ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        // Override the package's own ESNext/bundler tsconfig for the test
        // run only — ts-jest needs CommonJS output to run under plain `jest`
        // (no --experimental-vm-modules). Production builds are unaffected;
        // tsup (not this config) builds the published cjs+esm output.
        tsconfig: { module: "CommonJS", moduleResolution: "Node" },
      },
    ],
  },
};
```

- [ ] **Step 3: Simplify the test script**

In `packages/mission-compiler/package.json`, change:
```json
"test": "node --experimental-vm-modules node_modules/.bin/jest"
```
to:
```json
"test": "jest"
```

- [ ] **Step 4: Run the existing test suite to confirm the fix**

Run: `pnpm --filter @l3arn/mission-compiler test`
Expected: `mission-001-reward-rules.test.ts` runs and all tests pass (this file already exists and was never previously able to execute — this step is the first time it actually runs).

- [ ] **Step 5: Commit**

```bash
git add packages/mission-compiler/package.json packages/mission-compiler/jest.config.cjs pnpm-lock.yaml
git commit -m "fix(mission-compiler): install jest so the package's test script actually runs"
```

---

### Task 2: Shared-types — extend task types and add the lesson skeleton content contract

**Files:**
- Modify: `packages/shared-types/src/mission.schema.ts:112`
- Create: `packages/shared-types/src/lesson-skeleton.schema.ts`
- Modify: `packages/shared-types/src/index.ts`

Implements spec §4 (skeleton shape), §5 (task types), §6 (rule predicate — the checkable correctness DSL), §7 (variant-key), §8 (hint ladder). These are pure Zod schema declarations verified by typecheck and by consumption in Task 3–5's behavioral tests (this package has no test runner of its own — see the note at the end of this task).

- [ ] **Step 1: Extend `MissionTaskSchema.interactionType`**

In `packages/shared-types/src/mission.schema.ts`, find (around line 112):

```ts
export const MissionTaskSchema = z.object({
  id: z.string(),
  description: z.string(),
  interactionType: z.enum(["click", "drag", "choice", "text-input", "observe", "sequence"]),
  assetRefs: z.array(z.string()).optional(),
  isEvidenceCapturePoint: z.boolean(),
});
```

Change the `interactionType` line to:

```ts
  interactionType: z.enum([
    "click",
    "drag",
    "choice",
    "text-input",
    "observe",
    "sequence",
    "sort-categorize",
    "apply-to-new",
    "ai-mistake-check",
  ]),
```

(This is additive only — confirmed in the spec's grounding research that no existing code exhaustively switches on `interactionType`; `services/ai-workers/src/missions/mission-runtime.ts:161` only passes it through.)

- [ ] **Step 2: Create the lesson skeleton content contract schema**

Create `packages/shared-types/src/lesson-skeleton.schema.ts`:

```ts
/**
 * Lesson Task Skeleton Contract
 *
 * The adaptive lesson content model: humans author a "skeleton" per
 * (masterySkillId, l3arnMasteryLevel) carrying a checkable correct-answer
 * rule, a distractor rule, a transfer-example rule, and a 3-tier hint
 * ladder. The AI fills in concrete items constrained by that rule — it
 * never invents the rule itself.
 *
 * Grounded in: docs/superpowers/specs/2026-07-19-lesson-engine-content-contract-design.md
 * (sub-project 1 of the lesson-engine redesign), ADR-014, ADR-054.
 */

import { z } from "zod";
import { MasteryLevelSchema } from "./mission.schema";

// ─── Rule Predicate (checkable correctness DSL) ───────────────────────────────
// A leaf compares one item attribute against either a literal value or
// another attribute on the same item (compareField) — exactly one of the two
// must be set. compareField is what makes ai-mistake-check rules possible
// (e.g. "claimedSides neq actualSides"). Compound predicates combine leaves
// with allOf / anyOf / not.

const RulePredicateValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.union([z.string(), z.number()])),
]);

export const RulePredicateLeafSchema = z
  .object({
    field: z.string().min(1),
    op: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "in"]),
    value: RulePredicateValueSchema.optional(),
    compareField: z.string().min(1).optional(),
  })
  .refine((leaf) => (leaf.value !== undefined) !== (leaf.compareField !== undefined), {
    message: "Exactly one of `value` or `compareField` must be set on a rule predicate leaf",
  });
export type RulePredicateLeaf = z.infer<typeof RulePredicateLeafSchema>;

export type RulePredicate =
  | RulePredicateLeaf
  | { allOf: RulePredicate[] }
  | { anyOf: RulePredicate[] }
  | { not: RulePredicate };

export const RulePredicateSchema: z.ZodType<RulePredicate> = z.lazy(() =>
  z.union([
    RulePredicateLeafSchema,
    z.object({ allOf: z.array(RulePredicateSchema).min(1) }),
    z.object({ anyOf: z.array(RulePredicateSchema).min(1) }),
    z.object({ not: RulePredicateSchema }),
  ]),
);

// ─── Item Attributes ───────────────────────────────────────────────────────────
// The structured facts about a generated item that rule predicates evaluate
// against — e.g. { sides: 6, color: "blue" }. Primitives only.

export const ItemAttributesSchema = z.record(z.union([z.string(), z.number(), z.boolean()]));
export type ItemAttributes = z.infer<typeof ItemAttributesSchema>;

// ─── Learning Style / Reading Tier / Task Type (spec §2, §3, §5) ─────────────

export const LearningStyleSchema = z.enum(["visual", "auditory", "reading-writing", "kinesthetic"]);
export type LearningStyle = z.infer<typeof LearningStyleSchema>;

export const ReadingTierSchema = z.enum(["pre-reader", "grade-level", "advanced"]);
export type ReadingTier = z.infer<typeof ReadingTierSchema>;

export const LessonTaskTypeSchema = z.enum([
  "sort-categorize",
  "choice",
  "apply-to-new",
  "ai-mistake-check",
]);
export type LessonTaskType = z.infer<typeof LessonTaskTypeSchema>;

// ─── Variant Key (spec §7 — the generation cache key) ─────────────────────────

export const VariantKeySchema = z.object({
  skeletonId: z.string().uuid(),
  learningStyle: LearningStyleSchema,
  readingTier: ReadingTierSchema,
  l3arnMasteryLevel: MasteryLevelSchema,
});
export type VariantKey = z.infer<typeof VariantKeySchema>;

// ─── Hint Ladder (spec §8 — authored, 3 fixed tiers) ──────────────────────────

export const HintTierSchema = z.object({
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  kind: z.enum(["nudge", "re-explain", "state-rule"]),
  content: z.string().min(1),
  readAloudScript: z.string().min(1),
});
export type HintTier = z.infer<typeof HintTierSchema>;

export const HintLadderSchema = z
  .tuple([HintTierSchema, HintTierSchema, HintTierSchema])
  .refine((ladder) => ladder[0].tier === 1 && ladder[1].tier === 2 && ladder[2].tier === 3, {
    message: "Hint ladder must be exactly 3 tiers in order: 1 (nudge), 2 (re-explain), 3 (state-rule)",
  });
export type HintLadder = z.infer<typeof HintLadderSchema>;

// ─── Distractor Rule ───────────────────────────────────────────────────────────

export const DistractorRuleSchema = z.object({
  count: z.number().int().min(1).max(6),
  plausibilityRule: RulePredicateSchema.optional(),
});
export type DistractorRule = z.infer<typeof DistractorRuleSchema>;

// ─── Lesson Task Skeleton (spec §4) ────────────────────────────────────────────
// Human-authored per (masterySkillId, l3arnMasteryLevel). The unit the AI
// fill and the deterministic correctness gate both operate against.

export const LessonTaskSkeletonSchema = z.object({
  id: z.string().uuid(),
  masterySkillId: z.string().uuid(),
  l3arnMasteryLevel: MasteryLevelSchema,
  taskType: LessonTaskTypeSchema,
  correctAnswerRule: RulePredicateSchema,
  distractorRule: DistractorRuleSchema,
  transferExampleRule: RulePredicateSchema,
  hintLadder: HintLadderSchema,
  isActive: z.boolean(),
  version: z.number().int().positive(),
});
export type LessonTaskSkeleton = z.infer<typeof LessonTaskSkeletonSchema>;

// ─── Skeleton Fill (AI-generated, pre-gate) ───────────────────────────────────
// What the AI must produce for a given skeleton + variant-key. Never trusted
// until it passes validateSkeletonFill() (packages/mission-compiler).

export const SkeletonFillItemSchema = z.object({
  itemId: z.string().min(1),
  attributes: ItemAttributesSchema,
  presentationText: z.string().min(1),
  readAloudScript: z.string().min(1),
});
export type SkeletonFillItem = z.infer<typeof SkeletonFillItemSchema>;

export const SkeletonFillSchema = z.object({
  skeletonId: z.string().uuid(),
  variantKey: VariantKeySchema,
  storyFlavor: z.string().min(1),
  correctItem: SkeletonFillItemSchema,
  distractorItems: z.array(SkeletonFillItemSchema).min(1),
  transferItem: SkeletonFillItemSchema,
  hintLadderFill: HintLadderSchema,
  companionDialogueLine: z.string().min(1),
});
export type SkeletonFill = z.infer<typeof SkeletonFillSchema>;
```

- [ ] **Step 3: Export the new schema from the package index**

In `packages/shared-types/src/index.ts`, add a new export block. Insert after the `// ── Secondary contracts` block (after the `evidence.schema` / `rewards.schema` / `parent-report.schema` exports):

```ts
// ── Lesson content contract (adaptive lesson skeletons — sub-project 1) ──────
export * from "./lesson-skeleton.schema";
```

- [ ] **Step 4: Typecheck the package**

Run: `pnpm --filter @l3arn/shared-types typecheck`
Expected: no errors.

- [ ] **Step 5: Build the package**

Run: `pnpm --filter @l3arn/shared-types build`
Expected: `dist/index.js`, `dist/index.mjs`, `dist/index.d.ts` regenerated. Downstream packages (`@l3arn/mission-compiler`) resolve `@l3arn/shared-types` via `dist/`, not `src/` — this build step is required before Task 3 can import the new types.

- [ ] **Step 6: Commit**

```bash
git add packages/shared-types/src/mission.schema.ts packages/shared-types/src/lesson-skeleton.schema.ts packages/shared-types/src/index.ts packages/shared-types/dist
git commit -m "feat(shared-types): add adaptive lesson skeleton content contract schema"
```

**Note on test coverage for this task:** `@l3arn/shared-types` has no Jest setup of its own (no test files exist in the package today), and these are declarative Zod schemas with no branching logic to unit-test in isolation. Verification here is typecheck (Step 4) plus behavioral exercise: every schema added in this task is imported and exercised against real fixtures in Task 3, 4, and 5's test suites in `@l3arn/mission-compiler`. Do not add a second package's test infrastructure just to cover this — it would be redundant with those tasks.

---

### Task 3: Rule predicate evaluator

**Files:**
- Create: `packages/mission-compiler/src/rules/rule-predicate-evaluator.ts`
- Test: `packages/mission-compiler/src/rules/rule-predicate-evaluator.test.ts`

Implements spec §6's deterministic half of the correctness gate: a pure function that checks whether a generated item's attributes satisfy an authored `RulePredicate` — no AI call, no randomness.

- [ ] **Step 1: Write the failing test**

Create `packages/mission-compiler/src/rules/rule-predicate-evaluator.test.ts`:

```ts
import { evaluateRulePredicate } from "./rule-predicate-evaluator";
import type { RulePredicate } from "@l3arn/shared-types";

describe("evaluateRulePredicate", () => {
  describe("leaf predicates — literal value", () => {
    it("eq: true when attribute equals the literal value", () => {
      const predicate: RulePredicate = { field: "sides", op: "eq", value: 4 };
      expect(evaluateRulePredicate(predicate, { sides: 4 })).toBe(true);
    });

    it("eq: false when attribute does not equal the literal value", () => {
      const predicate: RulePredicate = { field: "sides", op: "eq", value: 4 };
      expect(evaluateRulePredicate(predicate, { sides: 3 })).toBe(false);
    });

    it("neq: true when attribute differs from the literal value", () => {
      const predicate: RulePredicate = { field: "sides", op: "neq", value: 4 };
      expect(evaluateRulePredicate(predicate, { sides: 3 })).toBe(true);
    });

    it("gt/gte/lt/lte compare numbers correctly", () => {
      expect(evaluateRulePredicate({ field: "sides", op: "gt", value: 3 }, { sides: 4 })).toBe(true);
      expect(evaluateRulePredicate({ field: "sides", op: "gt", value: 4 }, { sides: 4 })).toBe(false);
      expect(evaluateRulePredicate({ field: "sides", op: "gte", value: 4 }, { sides: 4 })).toBe(true);
      expect(evaluateRulePredicate({ field: "sides", op: "lt", value: 4 }, { sides: 3 })).toBe(true);
      expect(evaluateRulePredicate({ field: "sides", op: "lte", value: 4 }, { sides: 4 })).toBe(true);
    });

    it("gt: false when the attribute is not a number", () => {
      const predicate: RulePredicate = { field: "color", op: "gt", value: 1 };
      expect(evaluateRulePredicate(predicate, { color: "red" })).toBe(false);
    });

    it("in: true when attribute is one of the listed values", () => {
      const predicate: RulePredicate = { field: "color", op: "in", value: ["red", "blue"] };
      expect(evaluateRulePredicate(predicate, { color: "blue" })).toBe(true);
    });

    it("in: false when attribute is not in the listed values", () => {
      const predicate: RulePredicate = { field: "color", op: "in", value: ["red", "blue"] };
      expect(evaluateRulePredicate(predicate, { color: "green" })).toBe(false);
    });
  });

  describe("leaf predicates — compareField (field-to-field, e.g. AI-mistake detection)", () => {
    it("neq: true when two attributes on the same item differ", () => {
      const predicate: RulePredicate = { field: "claimedSides", op: "neq", compareField: "actualSides" };
      expect(evaluateRulePredicate(predicate, { claimedSides: 5, actualSides: 6 })).toBe(true);
    });

    it("neq: false when two attributes on the same item are equal", () => {
      const predicate: RulePredicate = { field: "claimedSides", op: "neq", compareField: "actualSides" };
      expect(evaluateRulePredicate(predicate, { claimedSides: 6, actualSides: 6 })).toBe(false);
    });
  });

  describe("compound predicates", () => {
    it("allOf: true only when every sub-predicate is true", () => {
      const predicate: RulePredicate = {
        allOf: [
          { field: "sides", op: "eq", value: 4 },
          { field: "color", op: "eq", value: "blue" },
        ],
      };
      expect(evaluateRulePredicate(predicate, { sides: 4, color: "blue" })).toBe(true);
      expect(evaluateRulePredicate(predicate, { sides: 4, color: "red" })).toBe(false);
    });

    it("anyOf: true when at least one sub-predicate is true", () => {
      const predicate: RulePredicate = {
        anyOf: [
          { field: "sides", op: "eq", value: 4 },
          { field: "sides", op: "eq", value: 6 },
        ],
      };
      expect(evaluateRulePredicate(predicate, { sides: 6 })).toBe(true);
      expect(evaluateRulePredicate(predicate, { sides: 5 })).toBe(false);
    });

    it("not: inverts the inner predicate", () => {
      const predicate: RulePredicate = { not: { field: "sides", op: "eq", value: 4 } };
      expect(evaluateRulePredicate(predicate, { sides: 4 })).toBe(false);
      expect(evaluateRulePredicate(predicate, { sides: 3 })).toBe(true);
    });

    it("nested compound: allOf containing an anyOf", () => {
      const predicate: RulePredicate = {
        allOf: [
          { anyOf: [{ field: "sides", op: "eq", value: 4 }, { field: "sides", op: "eq", value: 6 }] },
          { field: "color", op: "neq", value: "red" },
        ],
      };
      expect(evaluateRulePredicate(predicate, { sides: 6, color: "blue" })).toBe(true);
      expect(evaluateRulePredicate(predicate, { sides: 6, color: "red" })).toBe(false);
      expect(evaluateRulePredicate(predicate, { sides: 5, color: "blue" })).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @l3arn/mission-compiler test -- rule-predicate-evaluator`
Expected: FAIL — `Cannot find module './rule-predicate-evaluator'`

- [ ] **Step 3: Write the minimal implementation**

Create `packages/mission-compiler/src/rules/rule-predicate-evaluator.ts`:

```ts
/**
 * Rule Predicate Evaluator
 *
 * Deterministic evaluator for the RulePredicate DSL (@l3arn/shared-types).
 * This is the programmatic half of the correctness gate (spec §6) — it never
 * calls the AI; it checks whether a generated item's attributes satisfy an
 * authored, checkable rule.
 *
 * Grounded in: docs/superpowers/specs/2026-07-19-lesson-engine-content-contract-design.md §6
 */

import type { ItemAttributes, RulePredicate, RulePredicateLeaf } from "@l3arn/shared-types";

function isLeaf(predicate: RulePredicate): predicate is RulePredicateLeaf {
  return "field" in predicate;
}

function resolveExpected(leaf: RulePredicateLeaf, attributes: ItemAttributes): unknown {
  return leaf.compareField !== undefined ? attributes[leaf.compareField] : leaf.value;
}

function evaluateLeaf(leaf: RulePredicateLeaf, attributes: ItemAttributes): boolean {
  const actual = attributes[leaf.field];
  const expected = resolveExpected(leaf, attributes);

  switch (leaf.op) {
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "gt":
      return typeof actual === "number" && typeof expected === "number" && actual > expected;
    case "gte":
      return typeof actual === "number" && typeof expected === "number" && actual >= expected;
    case "lt":
      return typeof actual === "number" && typeof expected === "number" && actual < expected;
    case "lte":
      return typeof actual === "number" && typeof expected === "number" && actual <= expected;
    case "in":
      return Array.isArray(expected) && (expected as unknown[]).includes(actual);
    default:
      return false;
  }
}

/**
 * Evaluates a RulePredicate against an item's attributes. Pure, synchronous,
 * no AI call — this is what makes the correctness gate deterministic.
 */
export function evaluateRulePredicate(predicate: RulePredicate, attributes: ItemAttributes): boolean {
  if (isLeaf(predicate)) {
    return evaluateLeaf(predicate, attributes);
  }
  if ("allOf" in predicate) {
    return predicate.allOf.every((p) => evaluateRulePredicate(p, attributes));
  }
  if ("anyOf" in predicate) {
    return predicate.anyOf.some((p) => evaluateRulePredicate(p, attributes));
  }
  return !evaluateRulePredicate(predicate.not, attributes);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @l3arn/mission-compiler test -- rule-predicate-evaluator`
Expected: PASS, all 12 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/mission-compiler/src/rules
git commit -m "feat(mission-compiler): add deterministic rule predicate evaluator"
```

---

### Task 4: Skeleton-fill correctness gate

**Files:**
- Create: `packages/mission-compiler/src/validation/skeleton-fill-gate.ts`
- Test: `packages/mission-compiler/src/validation/skeleton-fill-gate.test.ts`

Implements spec §6 end to end: given a skeleton and an AI-produced fill, verify the fill actually satisfies the skeleton's rules. Fails closed — every failure mode is collected, not just the first one, so a caller can log/retry with full information.

- [ ] **Step 1: Write the failing test**

Create `packages/mission-compiler/src/validation/skeleton-fill-gate.test.ts`:

```ts
import { validateSkeletonFill } from "./skeleton-fill-gate";
import type { LessonTaskSkeleton, SkeletonFill } from "@l3arn/shared-types";

const SKELETON_ID = "11111111-1111-4111-8111-111111111111";
const MASTERY_SKILL_ID = "22222222-2222-4222-8222-222222222222";

function makeSkeleton(overrides: Partial<LessonTaskSkeleton> = {}): LessonTaskSkeleton {
  return {
    id: SKELETON_ID,
    masterySkillId: MASTERY_SKILL_ID,
    l3arnMasteryLevel: "emerging",
    taskType: "sort-categorize",
    correctAnswerRule: { field: "sides", op: "eq", value: 4 },
    distractorRule: {
      count: 2,
      plausibilityRule: { field: "sides", op: "neq", value: 4 },
    },
    transferExampleRule: { field: "sides", op: "eq", value: 4 },
    hintLadder: [
      { tier: 1, kind: "nudge", content: "Count the straight edges.", readAloudScript: "Count the straight edges." },
      {
        tier: 2,
        kind: "re-explain",
        content: "A square-like shape has 4 equal straight sides.",
        readAloudScript: "A square-like shape has 4 equal straight sides.",
      },
      {
        tier: 3,
        kind: "state-rule",
        content: "The rule: it belongs in the 4-sided bin only if it has exactly 4 sides.",
        readAloudScript: "The rule: it belongs in the 4-sided bin only if it has exactly 4 sides.",
      },
    ],
    isActive: true,
    version: 1,
    ...overrides,
  };
}

function makeValidFill(overrides: Partial<SkeletonFill> = {}): SkeletonFill {
  return {
    skeletonId: SKELETON_ID,
    variantKey: {
      skeletonId: SKELETON_ID,
      learningStyle: "visual",
      readingTier: "grade-level",
      l3arnMasteryLevel: "emerging",
    },
    storyFlavor: "Sort the crystal into the correct bin.",
    correctItem: {
      itemId: "item-square",
      attributes: { sides: 4 },
      presentationText: "A blue crystal with 4 straight sides.",
      readAloudScript: "A blue crystal with 4 straight sides.",
    },
    distractorItems: [
      {
        itemId: "item-triangle",
        attributes: { sides: 3 },
        presentationText: "A red crystal with 3 straight sides.",
        readAloudScript: "A red crystal with 3 straight sides.",
      },
      {
        itemId: "item-hexagon",
        attributes: { sides: 6 },
        presentationText: "A green crystal with 6 straight sides.",
        readAloudScript: "A green crystal with 6 straight sides.",
      },
    ],
    transferItem: {
      itemId: "item-square-2",
      attributes: { sides: 4 },
      presentationText: "A NEW purple crystal — does it belong in the 4-sided bin?",
      readAloudScript: "A new purple crystal. Does it belong in the 4-sided bin?",
    },
    hintLadderFill: [
      { tier: 1, kind: "nudge", content: "Count the straight edges.", readAloudScript: "Count the straight edges." },
      {
        tier: 2,
        kind: "re-explain",
        content: "A square-like shape has 4 equal straight sides.",
        readAloudScript: "A square-like shape has 4 equal straight sides.",
      },
      {
        tier: 3,
        kind: "state-rule",
        content: "The rule: it belongs in the 4-sided bin only if it has exactly 4 sides.",
        readAloudScript: "The rule: it belongs in the 4-sided bin only if it has exactly 4 sides.",
      },
    ],
    companionDialogueLine: "Let's figure out where this one goes!",
    ...overrides,
  };
}

describe("validateSkeletonFill", () => {
  it("passes for a fully correct fill", () => {
    const result = validateSkeletonFill(makeSkeleton(), makeValidFill());
    expect(result).toEqual({ valid: true, failures: [] });
  });

  it("fails closed when the fill targets a different skeleton", () => {
    const result = validateSkeletonFill(
      makeSkeleton(),
      makeValidFill({ skeletonId: "99999999-9999-4999-8999-999999999999" }),
    );
    expect(result.valid).toBe(false);
    expect(result.failures[0].code).toBe("skeleton-id-mismatch");
  });

  it("fails when the correct item does not actually satisfy the rule (hallucinated correct answer)", () => {
    const badFill = makeValidFill({
      correctItem: { itemId: "item-bad", attributes: { sides: 5 }, presentationText: "x", readAloudScript: "x" },
    });
    const result = validateSkeletonFill(makeSkeleton(), badFill);
    expect(result.valid).toBe(false);
    expect(result.failures.map((f) => f.code)).toContain("correct-item-fails-rule");
  });

  it("fails when a distractor actually satisfies the correct-answer rule", () => {
    const badFill = makeValidFill({
      distractorItems: [
        { itemId: "item-oops", attributes: { sides: 4 }, presentationText: "x", readAloudScript: "x" },
        { itemId: "item-hexagon", attributes: { sides: 6 }, presentationText: "x", readAloudScript: "x" },
      ],
    });
    const result = validateSkeletonFill(makeSkeleton(), badFill);
    expect(result.valid).toBe(false);
    expect(result.failures.map((f) => f.code)).toContain("distractor-satisfies-rule");
  });

  it("fails when a distractor is implausible (fails the plausibility rule)", () => {
    const skeleton = makeSkeleton({
      distractorRule: { count: 2, plausibilityRule: { field: "sides", op: "gt", value: 2 } },
    });
    const badFill = makeValidFill({
      distractorItems: [
        { itemId: "item-degenerate", attributes: { sides: 1 }, presentationText: "x", readAloudScript: "x" },
        { itemId: "item-hexagon", attributes: { sides: 6 }, presentationText: "x", readAloudScript: "x" },
      ],
    });
    const result = validateSkeletonFill(skeleton, badFill);
    expect(result.valid).toBe(false);
    expect(result.failures.map((f) => f.code)).toContain("distractor-fails-plausibility");
  });

  it("fails when the distractor count does not match the authored count", () => {
    const badFill = makeValidFill({
      distractorItems: [{ itemId: "item-triangle", attributes: { sides: 3 }, presentationText: "x", readAloudScript: "x" }],
    });
    const result = validateSkeletonFill(makeSkeleton(), badFill);
    expect(result.valid).toBe(false);
    expect(result.failures.map((f) => f.code)).toContain("distractor-count-mismatch");
  });

  it("fails when the transfer item does not satisfy the transfer rule", () => {
    const badFill = makeValidFill({
      transferItem: { itemId: "item-square-2", attributes: { sides: 5 }, presentationText: "x", readAloudScript: "x" },
    });
    const result = validateSkeletonFill(makeSkeleton(), badFill);
    expect(result.valid).toBe(false);
    expect(result.failures.map((f) => f.code)).toContain("transfer-item-fails-rule");
  });

  it("fails when the transfer item is not actually novel (same id as the correct item)", () => {
    const badFill = makeValidFill({
      transferItem: { itemId: "item-square", attributes: { sides: 4 }, presentationText: "x", readAloudScript: "x" },
    });
    const result = validateSkeletonFill(makeSkeleton(), badFill);
    expect(result.valid).toBe(false);
    expect(result.failures.map((f) => f.code)).toContain("transfer-item-not-novel");
  });

  it("collects multiple simultaneous failures rather than stopping at the first", () => {
    const badFill = makeValidFill({
      correctItem: { itemId: "item-bad", attributes: { sides: 5 }, presentationText: "x", readAloudScript: "x" },
      transferItem: { itemId: "item-bad-2", attributes: { sides: 5 }, presentationText: "x", readAloudScript: "x" },
    });
    const result = validateSkeletonFill(makeSkeleton(), badFill);
    expect(result.failures.map((f) => f.code)).toEqual(
      expect.arrayContaining(["correct-item-fails-rule", "transfer-item-fails-rule"]),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @l3arn/mission-compiler test -- skeleton-fill-gate`
Expected: FAIL — `Cannot find module './skeleton-fill-gate'`

- [ ] **Step 3: Write the minimal implementation**

Create `packages/mission-compiler/src/validation/skeleton-fill-gate.ts`:

```ts
/**
 * Skeleton Fill Correctness Gate
 *
 * The deterministic half of the correctness gate (spec §6): verifies that an
 * AI-filled lesson instance actually satisfies its authored skeleton's rules
 * before anything reaches a child. Fails closed — callers must treat any
 * `valid: false` result as "do not serve this content" and retry generation
 * or fall back to an authored example (wiring that retry/fallback loop into
 * the live generation pipeline is sub-project 4, out of scope here).
 *
 * Grounded in: docs/superpowers/specs/2026-07-19-lesson-engine-content-contract-design.md §6
 */

import type { LessonTaskSkeleton, SkeletonFill } from "@l3arn/shared-types";
import { evaluateRulePredicate } from "../rules/rule-predicate-evaluator";

export type GateFailureCode =
  | "skeleton-id-mismatch"
  | "correct-item-fails-rule"
  | "distractor-count-mismatch"
  | "distractor-satisfies-rule"
  | "distractor-fails-plausibility"
  | "transfer-item-fails-rule"
  | "transfer-item-not-novel";

export interface GateFailure {
  code: GateFailureCode;
  message: string;
}

export interface GateResult {
  valid: boolean;
  failures: GateFailure[];
}

export function validateSkeletonFill(skeleton: LessonTaskSkeleton, fill: SkeletonFill): GateResult {
  if (fill.skeletonId !== skeleton.id) {
    return {
      valid: false,
      failures: [
        {
          code: "skeleton-id-mismatch",
          message: `Fill targets skeleton ${fill.skeletonId}, expected ${skeleton.id}`,
        },
      ],
    };
  }

  const failures: GateFailure[] = [];

  if (!evaluateRulePredicate(skeleton.correctAnswerRule, fill.correctItem.attributes)) {
    failures.push({
      code: "correct-item-fails-rule",
      message: `correctItem "${fill.correctItem.itemId}" does not satisfy the skeleton's correct-answer rule`,
    });
  }

  if (fill.distractorItems.length !== skeleton.distractorRule.count) {
    failures.push({
      code: "distractor-count-mismatch",
      message: `Expected ${skeleton.distractorRule.count} distractors, got ${fill.distractorItems.length}`,
    });
  }

  for (const distractor of fill.distractorItems) {
    if (evaluateRulePredicate(skeleton.correctAnswerRule, distractor.attributes)) {
      failures.push({
        code: "distractor-satisfies-rule",
        message: `distractor "${distractor.itemId}" incorrectly satisfies the correct-answer rule`,
      });
    }
    if (
      skeleton.distractorRule.plausibilityRule &&
      !evaluateRulePredicate(skeleton.distractorRule.plausibilityRule, distractor.attributes)
    ) {
      failures.push({
        code: "distractor-fails-plausibility",
        message: `distractor "${distractor.itemId}" does not satisfy the plausibility rule`,
      });
    }
  }

  if (!evaluateRulePredicate(skeleton.transferExampleRule, fill.transferItem.attributes)) {
    failures.push({
      code: "transfer-item-fails-rule",
      message: `transferItem "${fill.transferItem.itemId}" does not satisfy the transfer-example rule`,
    });
  }
  if (fill.transferItem.itemId === fill.correctItem.itemId) {
    failures.push({
      code: "transfer-item-not-novel",
      message: "transferItem must be a different item than correctItem (novelty requirement)",
    });
  }

  return { valid: failures.length === 0, failures };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @l3arn/mission-compiler test -- skeleton-fill-gate`
Expected: PASS, all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/mission-compiler/src/validation/skeleton-fill-gate.ts packages/mission-compiler/src/validation/skeleton-fill-gate.test.ts
git commit -m "feat(mission-compiler): add deterministic skeleton-fill correctness gate"
```

---

### Task 5: Worked example — the AI-mistake-check skeleton, made first-class

**Files:**
- Create: `packages/mission-compiler/src/curriculum/skeletons/ai-mistake-shape-sides.skeleton.ts`
- Test: `packages/mission-compiler/src/curriculum/skeletons/ai-mistake-shape-sides.skeleton.test.ts`

Implements spec §5's flagship decision: the AI-literacy "catch the AI's mistake" beat becomes a first-class, rule-checkable skeleton instead of the current hardcoded `AIMistakeStep`/`AI_MISTAKE_OPTIONS`. This task proves the schema and gate work end to end on realistic content, not just synthetic fixtures.

- [ ] **Step 1: Write the failing test**

Create `packages/mission-compiler/src/curriculum/skeletons/ai-mistake-shape-sides.skeleton.test.ts`:

```ts
import { validateSkeletonFill } from "../../validation/skeleton-fill-gate";
import {
  AI_MISTAKE_SHAPE_SIDES_SKELETON,
  AI_MISTAKE_SHAPE_SIDES_SKELETON_FIXTURE_ID,
} from "./ai-mistake-shape-sides.skeleton";
import type { SkeletonFill } from "@l3arn/shared-types";

function makeValidFill(overrides: Partial<SkeletonFill> = {}): SkeletonFill {
  return {
    skeletonId: AI_MISTAKE_SHAPE_SIDES_SKELETON_FIXTURE_ID,
    variantKey: {
      skeletonId: AI_MISTAKE_SHAPE_SIDES_SKELETON_FIXTURE_ID,
      learningStyle: "visual",
      readingTier: "grade-level",
      l3arnMasteryLevel: "emerging",
    },
    storyFlavor: "The Sorting Computer studied a glowing crystal and reported its findings to you.",
    correctItem: {
      itemId: "critique-correct",
      attributes: { claimedSides: 5, actualSides: 6 },
      presentationText:
        "The companion said: \"This crystal has 5 sides.\" But count them yourself — it actually has 6. The companion made a mistake!",
      readAloudScript:
        "The companion said this crystal has 5 sides. But if you count them yourself, it actually has 6. The companion made a mistake!",
    },
    distractorItems: [
      {
        itemId: "critique-distractor-a",
        attributes: { claimedSides: 6, actualSides: 6 },
        presentationText: "The companion said: \"This crystal has 6 sides,\" and it does have 6 sides. That's correct, not a mistake.",
        readAloudScript: "The companion said this crystal has 6 sides, and it does have 6 sides. That is correct, not a mistake.",
      },
      {
        itemId: "critique-distractor-b",
        attributes: { claimedSides: 4, actualSides: 4 },
        presentationText: "The companion said: \"This crystal has 4 sides,\" and it does have 4 sides. That's correct, not a mistake.",
        readAloudScript: "The companion said this crystal has 4 sides, and it does have 4 sides. That is correct, not a mistake.",
      },
    ],
    transferItem: {
      itemId: "critique-transfer",
      attributes: { claimedSides: 3, actualSides: 5 },
      presentationText:
        "Now look at this NEW crystal. The companion said: \"This one has 3 sides.\" Count the real crystal — is the companion right this time?",
      readAloudScript:
        "Now look at this new crystal. The companion said this one has 3 sides. Count the real crystal. Is the companion right this time?",
    },
    hintLadderFill: AI_MISTAKE_SHAPE_SIDES_SKELETON.hintLadder,
    companionDialogueLine: "Wait... let's double check my math on that last one!",
    ...overrides,
  };
}

describe("AI_MISTAKE_SHAPE_SIDES_SKELETON (worked example)", () => {
  it("is a valid LessonTaskSkeleton with task type ai-mistake-check", () => {
    expect(AI_MISTAKE_SHAPE_SIDES_SKELETON.taskType).toBe("ai-mistake-check");
    expect(AI_MISTAKE_SHAPE_SIDES_SKELETON.hintLadder).toHaveLength(3);
  });

  it("passes the correctness gate for a realistic, fully correct fill", () => {
    const result = validateSkeletonFill(AI_MISTAKE_SHAPE_SIDES_SKELETON, makeValidFill());
    expect(result).toEqual({ valid: true, failures: [] });
  });

  it("fails the gate when the 'correct' critique actually points at a claim that was true (no real mistake)", () => {
    const badFill = makeValidFill({
      correctItem: {
        itemId: "critique-not-actually-wrong",
        attributes: { claimedSides: 6, actualSides: 6 },
        presentationText: "The companion said this crystal has 6 sides. That's a mistake!",
        readAloudScript: "The companion said this crystal has 6 sides. That's a mistake!",
      },
    });
    const result = validateSkeletonFill(AI_MISTAKE_SHAPE_SIDES_SKELETON, badFill);
    expect(result.valid).toBe(false);
    expect(result.failures.map((f) => f.code)).toContain("correct-item-fails-rule");
  });

  it("fails the gate when a distractor critique actually does describe a real AI mistake", () => {
    const badFill = makeValidFill({
      distractorItems: [
        {
          itemId: "critique-secretly-correct",
          attributes: { claimedSides: 5, actualSides: 7 },
          presentationText: "The companion said 5 sides but it's actually 7 — that IS a mistake, mislabeled as a distractor.",
          readAloudScript: "The companion said 5 sides but it's actually 7.",
        },
        {
          itemId: "critique-distractor-b",
          attributes: { claimedSides: 4, actualSides: 4 },
          presentationText: "x",
          readAloudScript: "x",
        },
      ],
    });
    const result = validateSkeletonFill(AI_MISTAKE_SHAPE_SIDES_SKELETON, badFill);
    expect(result.valid).toBe(false);
    expect(result.failures.map((f) => f.code)).toContain("distractor-fails-plausibility");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @l3arn/mission-compiler test -- ai-mistake-shape-sides`
Expected: FAIL — `Cannot find module './ai-mistake-shape-sides.skeleton'`

- [ ] **Step 3: Write the minimal implementation**

Create `packages/mission-compiler/src/curriculum/skeletons/ai-mistake-shape-sides.skeleton.ts`:

```ts
/**
 * Worked example skeleton — Mission 001's AI-literacy beat, made first-class
 * (spec §5). Replaces the intent of the current hardcoded AIMistakeStep /
 * AI_MISTAKE_OPTIONS in MissionExperience.tsx with a rule-checkable skeleton.
 *
 * Concept: the AI companion claims a shape has a certain number of sides;
 * the claim is wrong. The child must identify which critique correctly
 * names the AI's mistake among several plausible-but-wrong critiques.
 *
 * masterySkillId below is a fixture placeholder for offline unit tests only
 * — it does not need to resolve against a live Supabase row. The real
 * skeleton row (with the true mastery_skills.id for
 * AI_LITERACY.VERIFY_AI_OUTPUT, seeded by Migration 002) is seeded by
 * supabase/migrations/013_lesson_task_skeletons.sql.
 *
 * Grounded in: docs/superpowers/specs/2026-07-19-lesson-engine-content-contract-design.md §5
 */

import type { LessonTaskSkeleton } from "@l3arn/shared-types";

export const AI_MISTAKE_SHAPE_SIDES_SKELETON_FIXTURE_ID = "00000000-0000-4000-8000-000000000001";
const PLACEHOLDER_MASTERY_SKILL_ID = "00000000-0000-4000-8000-0000000000f1";

export const AI_MISTAKE_SHAPE_SIDES_SKELETON: LessonTaskSkeleton = {
  id: AI_MISTAKE_SHAPE_SIDES_SKELETON_FIXTURE_ID,
  masterySkillId: PLACEHOLDER_MASTERY_SKILL_ID,
  l3arnMasteryLevel: "emerging",
  taskType: "ai-mistake-check",
  correctAnswerRule: { field: "claimedSides", op: "neq", compareField: "actualSides" },
  distractorRule: {
    count: 2,
    plausibilityRule: { field: "claimedSides", op: "eq", compareField: "actualSides" },
  },
  transferExampleRule: { field: "claimedSides", op: "neq", compareField: "actualSides" },
  hintLadder: [
    {
      tier: 1,
      kind: "nudge",
      content: "Look closely at what the companion said about the shape. Count carefully.",
      readAloudScript: "Look closely at what the companion said about the shape. Count carefully.",
    },
    {
      tier: 2,
      kind: "re-explain",
      content:
        "Count each straight edge of the shape one at a time, out loud, and compare your count to what the companion claimed.",
      readAloudScript:
        "Count each straight edge of the shape one at a time, out loud, and compare your count to what the companion claimed.",
    },
    {
      tier: 3,
      kind: "state-rule",
      content: "A shape's number of sides is the number of straight edges it has - count them to check any claim about it.",
      readAloudScript: "A shape's number of sides is the number of straight edges it has. Count them to check any claim about it.",
    },
  ],
  isActive: true,
  version: 1,
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @l3arn/mission-compiler test -- ai-mistake-shape-sides`
Expected: PASS, all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/mission-compiler/src/curriculum/skeletons
git commit -m "feat(mission-compiler): add worked-example ai-mistake-check skeleton"
```

---

### Task 6: Export the new public API and run full regression

**Files:**
- Modify: `packages/mission-compiler/src/index.ts`

- [ ] **Step 1: Add exports**

In `packages/mission-compiler/src/index.ts`, add after the existing `// ── Evidence capture spec` export block:

```ts
// ── Rule predicate evaluator (deterministic correctness gate, part 1) ────────
export { evaluateRulePredicate } from "./rules/rule-predicate-evaluator";

// ── Skeleton-fill correctness gate (deterministic correctness gate, part 2) ──
export {
  validateSkeletonFill,
  type GateFailure,
  type GateFailureCode,
  type GateResult,
} from "./validation/skeleton-fill-gate";

// ── Worked example: AI-mistake-check skeleton (spec §5) ──────────────────────
export {
  AI_MISTAKE_SHAPE_SIDES_SKELETON,
  AI_MISTAKE_SHAPE_SIDES_SKELETON_FIXTURE_ID,
} from "./curriculum/skeletons/ai-mistake-shape-sides.skeleton";
```

- [ ] **Step 2: Run the full mission-compiler test suite**

Run: `pnpm --filter @l3arn/mission-compiler test`
Expected: PASS — all test files (`mission-001-reward-rules.test.ts`, `rule-predicate-evaluator.test.ts`, `skeleton-fill-gate.test.ts`, `ai-mistake-shape-sides.skeleton.test.ts`) green.

- [ ] **Step 3: Typecheck and build the package**

Run:
```bash
pnpm --filter @l3arn/mission-compiler typecheck
pnpm --filter @l3arn/mission-compiler build
```
Expected: both succeed with no errors.

- [ ] **Step 4: Typecheck the whole workspace to confirm nothing downstream broke**

Run: `pnpm -r typecheck`
Expected: all packages pass (this confirms the `interactionType` enum extension in Task 2 didn't break `services/ai-workers` or `apps/web`, consistent with the grounding check that no code exhaustively switches on it).

- [ ] **Step 5: Commit**

```bash
git add packages/mission-compiler/src/index.ts
git commit -m "feat(mission-compiler): export lesson skeleton content contract public API"
```

---

### Task 7: Supabase migration — skeleton storage and the variant-key fill cache

**Files:**
- Create: `supabase/migrations/013_lesson_task_skeletons.sql`

Implements spec §4 (durable skeleton storage) and §7 (the variant-key cache table). Follows the exact RLS/admin-role/versioning conventions established in `supabase/migrations/002_curriculum_mastery_spine.sql`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/013_lesson_task_skeletons.sql`:

```sql
-- =============================================================================
-- L3ARN Migration 013 — Lesson Task Skeletons (Adaptive Lesson Content Contract)
-- =============================================================================
-- Domain: Curriculum Spine (extends Migration 002)
-- Tables: lesson_task_skeletons, lesson_instance_fill_cache
--
-- Grounded in:
--   docs/superpowers/specs/2026-07-19-lesson-engine-content-contract-design.md
--   (sub-project 1 of the lesson-engine redesign)
--   ADR-014 (mission compiler constraint), ADR-054 (AI output validation/retry/fallback)
--   Migration 002 (curriculum_mastery_spine — mastery_domains, mastery_skills)
--
-- WHAT THIS ADDS:
--   lesson_task_skeletons — human-authored skeletons: one row per
--     (mastery_skill_id, l3arn_mastery_level, task_type). Carries a checkable
--     correct-answer rule, a distractor rule, a transfer-example rule, and a
--     3-tier hint ladder. The AI fills concrete content constrained by these
--     rules; it never invents them (spec §4).
--   lesson_instance_fill_cache — validated AI fills, cached by variant-key
--     (skeleton_id, learning_style, reading_tier, l3arn_mastery_level) so
--     generation happens once per variant-key and is reused across children
--     who land on the same key (spec §7).
--
-- ACCESS RULES (same model as Migration 002):
--   - lesson_task_skeletons: curriculum content. Reads/writes via Railway API
--     (service_role) or l3arn_curriculum_admin. No authenticated/anon access.
--   - lesson_instance_fill_cache: runtime-generated data, written by Railway
--     (service_role) after a fill passes the correctness gate
--     (packages/mission-compiler validateSkeletonFill). No authenticated/anon
--     access; no curriculum_admin write policy — this table is not
--     hand-authored.
--
-- REQUIRES:
--   Migration 002 must have run (mastery_skills, mastery_level type,
--   l3arn_curriculum_admin role, public.set_updated_at() function).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.lesson_task_type AS ENUM (
    'sort-categorize',
    'choice',
    'apply-to-new',
    'ai-mistake-check'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.learning_style_dimension AS ENUM (
    'visual',
    'auditory',
    'reading-writing',
    'kinesthetic'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.reading_tier AS ENUM (
    'pre-reader',
    'grade-level',
    'advanced'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 1. lesson_task_skeletons
-- Human-authored per (mastery_skill_id, l3arn_mastery_level, task_type). The
-- unit the AI fill and the deterministic correctness gate both operate
-- against. Rule fields are JSONB encodings of the RulePredicate DSL
-- (@l3arn/shared-types lesson-skeleton.schema.ts) — validated at the
-- application layer (Zod) before insert, not re-validated by a DB CHECK,
-- matching the existing mission_patterns.step_template convention.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.lesson_task_skeletons (
  id                      uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  mastery_skill_id        uuid              NOT NULL REFERENCES public.mastery_skills(id),
  l3arn_mastery_level     mastery_level     NOT NULL,
  task_type               lesson_task_type  NOT NULL,
  -- RulePredicate JSONB (see @l3arn/shared-types RulePredicateSchema)
  correct_answer_rule     jsonb             NOT NULL,
  -- { count: int, plausibilityRule?: RulePredicate }
  distractor_rule         jsonb             NOT NULL,
  transfer_example_rule   jsonb             NOT NULL,
  -- Array of exactly 3 HintTier objects (tier 1/2/3 in order)
  hint_ladder             jsonb             NOT NULL
                                            CHECK (jsonb_array_length(hint_ladder) = 3),
  is_active               boolean           NOT NULL DEFAULT true,
  version                 integer           NOT NULL DEFAULT 1,
  created_at              timestamptz       NOT NULL DEFAULT now(),
  updated_at              timestamptz       NOT NULL DEFAULT now(),
  -- A skill can have both a discrimination skeleton and a paired
  -- apply-to-new skeleton at the same mastery level (spec §1: effectiveness
  -- requires discrimination + transfer as two task instances).
  UNIQUE (mastery_skill_id, l3arn_mastery_level, task_type)
);

ALTER TABLE public.lesson_task_skeletons ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_lesson_task_skeletons_mastery_skill_id
  ON public.lesson_task_skeletons (mastery_skill_id);

CREATE INDEX IF NOT EXISTS idx_lesson_task_skeletons_active
  ON public.lesson_task_skeletons (is_active) WHERE is_active = true;

CREATE TRIGGER trg_lesson_task_skeletons_updated_at
  BEFORE UPDATE ON public.lesson_task_skeletons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "lesson_task_skeletons_curriculum_admin_insert"
  ON public.lesson_task_skeletons FOR INSERT
  TO l3arn_curriculum_admin
  WITH CHECK (true);

CREATE POLICY "lesson_task_skeletons_curriculum_admin_update"
  ON public.lesson_task_skeletons FOR UPDATE
  TO l3arn_curriculum_admin
  USING (true)
  WITH CHECK (true);

-- No SELECT policy for authenticated/anon (denied by default). Railway reads
-- via service_role, which bypasses RLS. No DELETE policy (use is_active = false).

GRANT SELECT ON public.lesson_task_skeletons TO l3arn_curriculum_admin;
GRANT INSERT, UPDATE ON public.lesson_task_skeletons TO l3arn_curriculum_admin;

-- ---------------------------------------------------------------------------
-- 2. lesson_instance_fill_cache
-- Runtime-generated, gate-validated AI fills, cached by variant-key so the
-- first child to hit a (skeleton, learning-style, reading-tier, mastery-level)
-- combination triggers generation and every later child on the same key
-- reuses it (spec §7). Written by Railway (service_role) only — never by
-- l3arn_curriculum_admin, since this is not hand-authored content.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.lesson_instance_fill_cache (
  id                      uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  skeleton_id             uuid                      NOT NULL REFERENCES public.lesson_task_skeletons(id) ON DELETE CASCADE,
  learning_style          learning_style_dimension  NOT NULL,
  reading_tier            reading_tier              NOT NULL,
  l3arn_mastery_level     mastery_level             NOT NULL,
  -- The validated SkeletonFill JSONB (see @l3arn/shared-types
  -- SkeletonFillSchema). Only fills that passed validateSkeletonFill()
  -- (packages/mission-compiler) are ever written here — the gate runs before
  -- this insert, not after.
  validated_fill          jsonb                     NOT NULL,
  model_used              text                      NOT NULL,
  generated_at            timestamptz               NOT NULL DEFAULT now(),
  UNIQUE (skeleton_id, learning_style, reading_tier, l3arn_mastery_level)
);

ALTER TABLE public.lesson_instance_fill_cache ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_lesson_instance_fill_cache_skeleton_id
  ON public.lesson_instance_fill_cache (skeleton_id);

-- No policies: authenticated/anon denied by default; Railway writes and reads
-- via service_role, which bypasses RLS (same access model as Migration 002).

-- ---------------------------------------------------------------------------
-- Seed: worked example skeleton — Mission 001's AI-literacy beat, made
-- first-class (spec §5). Mirrors the fixture in
-- packages/mission-compiler/src/curriculum/skeletons/ai-mistake-shape-sides.skeleton.ts
-- but with the real mastery_skills.id for AI_LITERACY.VERIFY_AI_OUTPUT
-- (seeded by Migration 002) instead of a test placeholder UUID.
-- ---------------------------------------------------------------------------

INSERT INTO public.lesson_task_skeletons (
  mastery_skill_id,
  l3arn_mastery_level,
  task_type,
  correct_answer_rule,
  distractor_rule,
  transfer_example_rule,
  hint_ladder
)
SELECT
  ms.id,
  'emerging',
  'ai-mistake-check',
  '{"field": "claimedSides", "op": "neq", "compareField": "actualSides"}'::jsonb,
  '{"count": 2, "plausibilityRule": {"field": "claimedSides", "op": "eq", "compareField": "actualSides"}}'::jsonb,
  '{"field": "claimedSides", "op": "neq", "compareField": "actualSides"}'::jsonb,
  '[
    {"tier": 1, "kind": "nudge", "content": "Look closely at what the companion said about the shape. Count carefully.", "readAloudScript": "Look closely at what the companion said about the shape. Count carefully."},
    {"tier": 2, "kind": "re-explain", "content": "Count each straight edge of the shape one at a time, out loud, and compare your count to what the companion claimed.", "readAloudScript": "Count each straight edge of the shape one at a time, out loud, and compare your count to what the companion claimed."},
    {"tier": 3, "kind": "state-rule", "content": "A shape has as many sides as it has straight edges - count them to check any claim about it.", "readAloudScript": "A shape has as many sides as it has straight edges. Count them to check any claim about it."}
  ]'::jsonb
FROM public.mastery_skills ms
WHERE ms.code = 'AI_LITERACY.VERIFY_AI_OUTPUT'
ON CONFLICT (mastery_skill_id, l3arn_mastery_level, task_type) DO NOTHING;

COMMIT;
```

- [ ] **Step 2: Apply the migration**

Run: `supabase db push`
Expected: migration `013_lesson_task_skeletons` applies with no errors.

- [ ] **Step 3: Verify the tables and seed row**

Run: `mcp__claude_ai_Supabase__list_tables` (or `supabase db diff` locally if the MCP tool is unavailable)
Expected: `lesson_task_skeletons` and `lesson_instance_fill_cache` present under `public`.

Then confirm the seed row landed:
```sql
SELECT lts.task_type, ms.code
FROM public.lesson_task_skeletons lts
JOIN public.mastery_skills ms ON ms.id = lts.mastery_skill_id
WHERE lts.task_type = 'ai-mistake-check';
```
Expected: one row with `code = 'AI_LITERACY.VERIFY_AI_OUTPUT'`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/013_lesson_task_skeletons.sql
git commit -m "feat(db): add lesson_task_skeletons and lesson_instance_fill_cache tables"
```

---

## What this plan does NOT do (by design — see spec §0.2, §12)

- No frontend rendering of skeletons/fills (sub-project 2 — replacing `MissionExperience.tsx`'s hardcoded steps)
- No live-tutor runtime that decides *when* to escalate through the authored hint ladder (sub-project 3)
- No wiring of `validateSkeletonFill` into the actual Anthropic API generation path, `compiler.ts`, or `retry-engine.ts` — no live AI calls are made or changed by this plan (sub-project 4: generation pipeline operational mechanics)
- No changes to the mastery/evidence measurement pipeline beyond the new `LessonTaskType` values existing in the type system (sub-project 5)
- Only one worked example skeleton (`ai-mistake-check`) is seeded — authoring the full skeleton library across skills/mastery levels is ongoing curriculum work, not part of this plan

Each of these is a follow-on plan, and per the brainstorming skill's discipline, each needs its own `superpowers:brainstorming` design session before it gets a plan of its own — do not skip straight to implementation on any of them.
