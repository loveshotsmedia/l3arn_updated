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
  z.array(z.union([z.string(), z.number()])).min(1),
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
  .refine(
    (ladder) =>
      ladder[0].tier === 1 &&
      ladder[1].tier === 2 &&
      ladder[2].tier === 3 &&
      ladder[0].kind === "nudge" &&
      ladder[1].kind === "re-explain" &&
      ladder[2].kind === "state-rule",
    {
      message: "Hint ladder must be exactly 3 tiers in order: 1 (nudge), 2 (re-explain), 3 (state-rule)",
    },
  );
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
