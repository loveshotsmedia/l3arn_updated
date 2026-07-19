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
