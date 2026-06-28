-- =============================================================================
-- L3ARN Migration 005 — Evidence & Reports
-- =============================================================================
-- Domain: Evidence / Reports
-- Tables: learning_evidence_events, mission_replay_events, mastery_records,
--         parent_reports, portfolio_items
--
-- Grounded in:
--   MASTER_HANDOFF §10 (data model — Evidence/Reports domain)
--   ADR-010 (academic progress model — evidence-based mastery)
--   ADR-026 (evidence capture: structured learning events, no webcam/face/biometrics)
--   ADR-027 (audio: push-to-talk only; no always-on mic, no voice biometrics)
--   ADR-008 (parent visibility model — full / summary / safety-override)
--   ADR-029 (model improvement opt-out — no raw child PII in pipelines)
--   shared_contracts_spec.md Contract 3 (Evidence Contract)
--   packages/shared-types/src/evidence.schema.ts
--   packages/shared-types/src/parent-report.schema.ts
--
-- Privacy invariants enforced at SCHEMA LEVEL (not application level):
--   - no_webcam: NOT NULL DEFAULT true, CHECK (no_webcam = true)
--     → structurally impossible for client to set to false
--   - no_face_capture: NOT NULL DEFAULT true, CHECK (no_face_capture = true)
--     → structurally impossible for client to set to false
--   - no_voice_biometrics: NOT NULL DEFAULT true, CHECK (no_voice_biometrics = true)
--     → structurally impossible for client to set to false
--
-- RLS Design:
--   - Service role (Railway) is the ONLY writer for all evidence tables
--   - Parent reads their own children's evidence, mastery records, reports, portfolio
--   - Summary visibility tier: parent CANNOT read raw learning_evidence_events
--     unless parent_consented_highlight = true (enforced in the SELECT policy)
--   - Child session: no direct read/write (Railway API mediates all child access)
--
-- REQUIRES:
--   Migration 001 (child_profiles, visibility_tier ENUM, auth_owns_child helper)
--   Migration 002 (mastery_skills table)
--
-- NOTE: Migration numbering — supabase_schema.md §planning had 005 reserved for
--   Chat/Safety/Moderation. Evidence tables were originally planned for Migration
--   003, but Mig 003 only created parent_curriculum_prefs + onboarding_sessions.
--   This migration takes the next available sequential number per spec directive
--   (005_evidence_reports.sql). The Chat/Safety migration will take 006.
--   See OPEN_QUESTIONS.md OQ-A10-001 for tracking.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. learning_evidence_events
-- ---------------------------------------------------------------------------
-- The atomic unit of academic proof. Auto-captured during a mission attempt
-- by the Railway service (service_role only writes).
--
-- Privacy invariants are CHECK-enforced at the database level:
--   no_webcam, no_face_capture, no_voice_biometrics can only ever be true.
--   Client code cannot set them false even if it tried.
--
-- Visibility gate:
--   Parent SELECT policy restricts raw event reads to "full" or "safety-override"
--   visibility tier. When parent_visibility_tier = "summary", only rows where
--   parent_consented_highlight = true are readable by the parent.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.learning_evidence_events (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id          UUID NOT NULL
                              REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  mission_attempt_id        UUID,               -- nullable: evidence may be standalone
  event_type                TEXT NOT NULL,       -- mirrors EvidenceCaptureTypeSchema values
  content_json              JSONB,              -- structured event data; never raw AI output, never PII
  mastery_skill_id          UUID                -- optional FK to mastery_skills
                              REFERENCES public.mastery_skills(id) ON DELETE SET NULL,
  confidence_score          NUMERIC(4,3)        -- 0.000–1.000 (4 digits, 3 decimal places)
                              CHECK (confidence_score IS NULL
                                     OR (confidence_score >= 0.000 AND confidence_score <= 1.000)),
  -- Privacy invariants (ADR-026, MASTER_HANDOFF §9.2):
  -- CHECK constraints make it structurally impossible to store false.
  no_webcam                 BOOLEAN NOT NULL DEFAULT true
                              CHECK (no_webcam = true),
  no_face_capture           BOOLEAN NOT NULL DEFAULT true
                              CHECK (no_face_capture = true),
  no_voice_biometrics       BOOLEAN NOT NULL DEFAULT true
                              CHECK (no_voice_biometrics = true),
  captured_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  parent_consented_highlight BOOLEAN NOT NULL DEFAULT false
                              -- true = parent has approved this item for portfolio/highlights
);

-- Event type constraint: restrict to known EvidenceCaptureType values
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
    'screenshot'
  ));

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_learning_evidence_events_child
  ON public.learning_evidence_events (child_profile_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_evidence_events_attempt
  ON public.learning_evidence_events (mission_attempt_id)
  WHERE mission_attempt_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_learning_evidence_events_consented
  ON public.learning_evidence_events (child_profile_id, parent_consented_highlight)
  WHERE parent_consented_highlight = true;

-- RLS
ALTER TABLE public.learning_evidence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_evidence_events FORCE ROW LEVEL SECURITY;

-- Parent SELECT policy with visibility tier gate:
--   "full" / "safety-override" tier → parent sees all events for their children
--   "summary" tier → parent sees ONLY events where parent_consented_highlight = true
CREATE POLICY "lee_parent_select"
  ON public.learning_evidence_events FOR SELECT
  USING (
    auth_owns_child(child_profile_id)
    AND (
      -- Full visibility: parent sees all
      (SELECT parent_visibility_tier
         FROM public.privacy_settings
        WHERE child_profile_id = learning_evidence_events.child_profile_id
        LIMIT 1
      ) IN ('full', 'safety-override')
      OR
      -- Summary visibility: only parent-consented highlights
      (
        (SELECT parent_visibility_tier
           FROM public.privacy_settings
          WHERE child_profile_id = learning_evidence_events.child_profile_id
          LIMIT 1
        ) = 'summary'
        AND parent_consented_highlight = true
      )
    )
  );

-- No client INSERT/UPDATE/DELETE — service_role only
-- (service_role bypasses RLS; no explicit policy needed for service_role writes)

-- ---------------------------------------------------------------------------
-- 2. mission_replay_events
-- ---------------------------------------------------------------------------
-- Replay-safe structured event log of what happened step-by-step during a
-- mission attempt. Used by parents to review the sequence of interactions.
-- Not a full video replay — structured event payloads only (ADR-026).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.mission_replay_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id    UUID NOT NULL
                        REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  mission_attempt_id  UUID NOT NULL,
  sequence_index      INTEGER NOT NULL,    -- ordering within the attempt
  event_type          TEXT NOT NULL,       -- step type: 'step-start', 'step-complete', 'hint-requested', etc.
  payload_json        JSONB,               -- structured step payload; no raw PII, no AI output
  occurred_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- No audio content, no webcam content, no face capture in replay payloads
  CONSTRAINT mission_replay_events_sequence_non_negative
    CHECK (sequence_index >= 0)
);

CREATE INDEX IF NOT EXISTS idx_mission_replay_events_child
  ON public.mission_replay_events (child_profile_id, mission_attempt_id, sequence_index);

-- RLS
ALTER TABLE public.mission_replay_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_replay_events FORCE ROW LEVEL SECURITY;

-- Parent can read replay events for their own children (full visibility tier)
-- Summary-tier parents see replay events only for consented highlights
-- (replay events themselves don't have a consent flag, so we gate on the parent tier)
CREATE POLICY "mre_parent_select"
  ON public.mission_replay_events FOR SELECT
  USING (
    auth_owns_child(child_profile_id)
    AND (
      (SELECT parent_visibility_tier
         FROM public.privacy_settings
        WHERE child_profile_id = mission_replay_events.child_profile_id
        LIMIT 1
      ) IN ('full', 'safety-override')
    )
  );

-- ---------------------------------------------------------------------------
-- 3. mastery_records
-- ---------------------------------------------------------------------------
-- The persistent achievement record for one child on one mastery skill.
-- Evidence-based: every mastery claim carries its proof chain (ADR-010).
-- One record per child per skill; UPDATE in place when skill level changes.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.mastery_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id    UUID NOT NULL
                        REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  mastery_skill_id    UUID NOT NULL
                        REFERENCES public.mastery_skills(id) ON DELETE RESTRICT,
  mastery_level       TEXT NOT NULL,        -- mirrors MasteryLevelSchema values
  evidence_event_ids  UUID[] NOT NULL DEFAULT '{}',  -- proof chain: IDs of learning_evidence_events
  assessed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  assessed_by         TEXT NOT NULL DEFAULT 'mission-compiler',  -- who/what determined this
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One record per child per skill — UPDATE in place when level advances
  UNIQUE (child_profile_id, mastery_skill_id)
);

ALTER TABLE public.mastery_records
  ADD CONSTRAINT mastery_records_level_check
  CHECK (mastery_level IN ('emerging', 'developing', 'proficient', 'advanced'));

CREATE INDEX IF NOT EXISTS idx_mastery_records_child
  ON public.mastery_records (child_profile_id);

CREATE INDEX IF NOT EXISTS idx_mastery_records_skill
  ON public.mastery_records (mastery_skill_id);

CREATE TRIGGER mastery_records_updated_at
  BEFORE UPDATE ON public.mastery_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.mastery_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastery_records FORCE ROW LEVEL SECURITY;

-- Parent can always read mastery records for their children
-- (mastery records are aggregate; not restricted by visibility tier)
CREATE POLICY "mastery_records_parent_select"
  ON public.mastery_records FOR SELECT
  USING (auth_owns_child(child_profile_id));

-- ---------------------------------------------------------------------------
-- 4. parent_reports
-- ---------------------------------------------------------------------------
-- Compiled parent-facing reports. The Unified First Learning Map (Mission 001)
-- is the primary report type.
--
-- content_json holds the structured ParentReport — never raw AI output.
-- All AI-sourced content has already been validated through an AIOutputEnvelope
-- before reaching this table.
--
-- ai_output_envelope_id: nullable FK reference to the audit envelope that
-- produced the AI portions of this report (not a DB FK to avoid cross-domain
-- coupling; validated at the application layer).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.parent_reports (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id            UUID NOT NULL
                                REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  report_type                 TEXT NOT NULL DEFAULT 'unified-first-learning-map',
  generated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  mission_attempt_id          UUID,           -- nullable: report may cover multiple attempts
  content_json                JSONB NOT NULL, -- structured ParentReport; never raw AI output
  ai_output_envelope_id       UUID,           -- nullable: FK to AI audit envelope (app-layer validated)
  visibility_tier_at_generation TEXT NOT NULL  -- snapshot of parentVisibilityTier when generated
);

ALTER TABLE public.parent_reports
  ADD CONSTRAINT parent_reports_type_check
  CHECK (report_type IN (
    'unified-first-learning-map',
    'weekly-summary',
    'mission-completion',
    'portfolio'
  ));

ALTER TABLE public.parent_reports
  ADD CONSTRAINT parent_reports_visibility_tier_check
  CHECK (visibility_tier_at_generation IN ('full', 'summary', 'safety-override'));

CREATE INDEX IF NOT EXISTS idx_parent_reports_child
  ON public.parent_reports (child_profile_id, generated_at DESC);

-- RLS
ALTER TABLE public.parent_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_reports FORCE ROW LEVEL SECURITY;

-- Parent reads their own children's reports
CREATE POLICY "parent_reports_parent_select"
  ON public.parent_reports FOR SELECT
  USING (auth_owns_child(child_profile_id));

-- ---------------------------------------------------------------------------
-- 5. portfolio_items
-- ---------------------------------------------------------------------------
-- Parent-consented highlights from the evidence record.
-- Requires explicit parent consent (parent_consented = true) before any
-- item is surfaced to the parent or included in reports.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id    UUID NOT NULL
                        REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  evidence_event_id   UUID
                        REFERENCES public.learning_evidence_events(id) ON DELETE SET NULL,
  title               TEXT NOT NULL,
  description         TEXT,
  parent_consented    BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_items_child
  ON public.portfolio_items (child_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_portfolio_items_consented
  ON public.portfolio_items (child_profile_id, parent_consented)
  WHERE parent_consented = true;

-- RLS
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items FORCE ROW LEVEL SECURITY;

-- Parent reads portfolio items for their children
-- Only consented items are exposed through the default select policy
CREATE POLICY "portfolio_items_parent_select"
  ON public.portfolio_items FOR SELECT
  USING (
    auth_owns_child(child_profile_id)
    AND parent_consented = true
  );

-- Parent can mark consent (UPDATE parent_consented = true on their child's items)
CREATE POLICY "portfolio_items_parent_consent_update"
  ON public.portfolio_items FOR UPDATE
  USING (auth_owns_child(child_profile_id))
  WITH CHECK (auth_owns_child(child_profile_id));

-- ---------------------------------------------------------------------------
-- 6. Comments on privacy invariants (for pg_dump readers)
-- ---------------------------------------------------------------------------

COMMENT ON COLUMN public.learning_evidence_events.no_webcam IS
  'Privacy invariant (ADR-026): always true. CHECK constraint prevents false. '
  'No webcam content is ever captured in evidence events.';

COMMENT ON COLUMN public.learning_evidence_events.no_face_capture IS
  'Privacy invariant (ADR-026): always true. CHECK constraint prevents false. '
  'No face capture or facial recognition data is ever stored.';

COMMENT ON COLUMN public.learning_evidence_events.no_voice_biometrics IS
  'Privacy invariant (ADR-027): always true. CHECK constraint prevents false. '
  'Push-to-talk audio responses are never processed for voice ID, emotion '
  'detection, or any biometric purpose.';

COMMENT ON TABLE public.learning_evidence_events IS
  'Atomic academic proof events. Service-role write only. '
  'Parent visibility gated by privacy_settings.parent_visibility_tier.';

COMMENT ON TABLE public.mastery_records IS
  'Persistent evidence-based mastery achievement per child per skill. '
  'One row per child/skill pair; updated in place as level advances.';

COMMENT ON TABLE public.parent_reports IS
  'Compiled parent-facing reports (Unified First Learning Map, etc.). '
  'content_json holds structured ParentReport — never raw AI output.';

COMMIT;
