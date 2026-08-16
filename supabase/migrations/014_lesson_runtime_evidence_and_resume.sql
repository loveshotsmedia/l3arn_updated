-- =============================================================================
-- L3ARN Migration 014 — Adaptive Lesson Runtime: evidence types + resume
-- =============================================================================
-- Domain: Evidence/Reports (extends Migration 005), Mission Runtime (extends 008)
--
-- Grounded in:
--   docs/superpowers/specs/2026-07-20-adaptive-lesson-runtime-design.md
--   (sub-project 2 of the lesson-engine redesign)
--
-- WHAT THIS ADDS:
--   1. Extends learning_evidence_events.event_type CHECK constraint with
--      'discrimination-check' and 'transfer-check' (mirrors the shared-types
--      EvidenceCaptureTypeSchema addition — this migration and that TS change
--      must stay in lockstep).
--   2. Adds mission_attempts.current_task_index so a child who exits mid-mission
--      resumes from the same task instead of restarting (previously there was
--      no exit affordance at all during gameplay).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Extend the evidence event_type constraint
-- ---------------------------------------------------------------------------

ALTER TABLE public.learning_evidence_events
  DROP CONSTRAINT learning_evidence_events_event_type_check;

ALTER TABLE public.learning_evidence_events
  ADD CONSTRAINT learning_evidence_events_event_type_check
  CHECK (event_type IN (
    'decision-log',
    'sequence-completion',
    'ai-mistake-check',
    'explanation',
    'reflection',
    'artifact-upload',
    'audio-response',
    'structured-replay',
    'screenshot',
    'discrimination-check',
    'transfer-check'
  ));

-- ---------------------------------------------------------------------------
-- 2. Resume support on mission_attempts
-- ---------------------------------------------------------------------------

ALTER TABLE public.mission_attempts
  ADD COLUMN IF NOT EXISTS current_task_index integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.mission_attempts.current_task_index IS
  'Index into the lesson task sequence (GET .../lesson tasks[]) the child was '
  'on when they last exited. 0 = has not started any task yet. Written by '
  'service_role only (Railway), on exit and on task-advance.';

COMMIT;
