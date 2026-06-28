-- =============================================================================
-- L3ARN Migration 008 — Mission Runtime & Companion Profiles (Hero Slice)
-- =============================================================================
-- Domain: Mission Runtime / Companion Identity
-- Tables: mission_attempts, companion_profiles
--
-- Why this migration exists:
--   Migrations 004 (rewards) and 005 (evidence/reports) reference a
--   `mission_attempts` table as the anchor row for a single mission run
--   (moolah_ledger.source_id, learning_evidence_events.mission_attempt_id,
--   mission_replay_events.mission_attempt_id, parent_reports.mission_attempt_id,
--   and services/ai-workers/.../unified-first-learning-map.ts all read it).
--   That table was never created. This migration creates it so the Hero Slice
--   completion pipeline (Phase B) has a canonical anchor.
--
--   Companion selection had no persistence target. companion_growth_events
--   (Migration 004) logs bond *changes* keyed by companion_key but there is no
--   row that stores the child's *chosen* companion. companion_profiles is that
--   row (one active companion per child), and its companion_key matches
--   companion_growth_events.companion_key for downstream growth writes.
--
-- Grounded in:
--   ADR-011 (effort + mastery rewards), ADR-016/017 (delivery modes),
--   ADR-031 (child session model),
--   shared_contracts_spec.md (mission + companion contracts),
--   Hero Slice Integration (Agents 2 & 3).
--
-- Schema rules enforced:
--   - mission_attempts and companion_profiles are written by service_role only
--     (Railway). Clients may read via RLS; no client INSERT/UPDATE/DELETE.
--   - completed_at is nullable; a non-null value marks a completed run
--     (matches MissionAttemptRow consumer in the report assembler).
--   - companion_profiles is one-active-row-per-child (UNIQUE child_profile_id).
--   - Reuses existing helpers: set_updated_at(), auth_owns_child(),
--     current_child_session_id() — defined in Migration 001.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. mission_attempts
-- ---------------------------------------------------------------------------
-- Sensitivity: MEDIUM — one row per mission run for a child. No legal PII.
-- Anchor row referenced by rewards (004), evidence/reports (005), and the
-- First Learning Map assembler. Service_role writes only.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.mission_attempts (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id      uuid        NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  -- Session that launched this attempt (audit + scoping). SET NULL keeps the
  -- attempt row (and its evidence/rewards) if the session row is later removed.
  child_session_id      uuid        REFERENCES public.child_sessions(id) ON DELETE SET NULL,
  academy_identity_id   uuid        REFERENCES public.academy_identities(id) ON DELETE SET NULL,
  -- Canonical mission identifier, e.g. "mission-001". Free text so the mission
  -- library can grow without an enum migration.
  mission_id            text        NOT NULL,
  -- Optional link to the curriculum mission_patterns row this run was built from.
  mission_pattern_id    uuid        REFERENCES public.mission_patterns(id) ON DELETE SET NULL,
  -- Which delivery surface the child used (ADR-016/017).
  delivery_mode         text        CHECK (delivery_mode IN ('3d', 'interactive-lite', 'text-audio-offline')),
  -- Lifecycle status. 'started' on creation; 'completed' or 'abandoned' later.
  status                text        NOT NULL DEFAULT 'started'
                          CHECK (status IN ('started', 'completed', 'abandoned')),
  -- Provenance of the mission content delivered to the child:
  --   'ai'       — compiled by the Mission Compiler and Zod-validated
  --   'fallback' — static, human-authored safe fallback (no AI output reached child)
  content_source        text        CHECK (content_source IN ('ai', 'fallback')),
  -- Optional link to the AI output audit envelope (when content_source = 'ai').
  ai_output_envelope_id uuid,
  -- Mastery outcome for this run (effort vs. mastery, ADR-011).
  mastery_achieved      boolean     NOT NULL DEFAULT false,
  -- 0.000–1.000 evidence-weighted mastery score; nullable until assessed.
  mastery_evidence_score numeric(4,3) CHECK (mastery_evidence_score IS NULL
                          OR (mastery_evidence_score >= 0 AND mastery_evidence_score <= 1)),
  started_at            timestamptz NOT NULL DEFAULT now(),
  -- NULL = in progress / abandoned; non-NULL = completed (consumer contract).
  completed_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mission_attempts_child_profile_id
  ON public.mission_attempts (child_profile_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_mission_attempts_child_session_id
  ON public.mission_attempts (child_session_id);

CREATE INDEX IF NOT EXISTS idx_mission_attempts_mission_id
  ON public.mission_attempts (mission_id);

CREATE INDEX IF NOT EXISTS idx_mission_attempts_completed
  ON public.mission_attempts (child_profile_id)
  WHERE completed_at IS NOT NULL;

CREATE TRIGGER trg_mission_attempts_updated_at
  BEFORE UPDATE ON public.mission_attempts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.mission_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_attempts FORCE ROW LEVEL SECURITY;

-- Parent may read their child's mission attempts (parent report / dashboard).
CREATE POLICY "mission_attempts_parent_select"
  ON public.mission_attempts FOR SELECT
  TO authenticated
  USING (public.auth_owns_child(child_profile_id));

-- Child session may read its own attempts (defense-in-depth; backend uses
-- service_role for the live student flow). Mirrors companion_growth_events.
CREATE POLICY "mission_attempts_child_session_select"
  ON public.mission_attempts FOR SELECT
  TO authenticated
  USING (
    child_profile_id = NULLIF(
      current_setting('app.child_profile_id', true), ''
    )::uuid
  );

-- No INSERT/UPDATE/DELETE policy for authenticated clients — service_role only.

-- ---------------------------------------------------------------------------
-- 2. companion_profiles
-- ---------------------------------------------------------------------------
-- Sensitivity: LOW — the child's chosen companion (display + teaching style).
-- One active row per child. companion_key matches
-- companion_growth_events.companion_key so growth writes (Migration 004) line up.
-- Service_role writes only; parent and child session may read.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.companion_profiles (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id  uuid        NOT NULL UNIQUE REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  -- Stable key used across growth/rewards events, e.g. "comp-001-spark".
  companion_key     text        NOT NULL,
  -- Display name the child sees, e.g. "Spark".
  character_name    text        NOT NULL CHECK (char_length(character_name) BETWEEN 1 AND 48),
  -- Personality/teaching style descriptors (seeded from the chosen template).
  character_style   text,
  teaching_tone     text,
  -- Original template id the selection came from (provenance).
  template_id       text,
  -- Snapshot of current bond level (denormalized from companion_growth_events
  -- for fast reads; resolves OQ-A10-005). Bond never decreases in MVP.
  bond_level        integer     NOT NULL DEFAULT 0 CHECK (bond_level >= 0),
  -- Companion config version (for future companion evolution/versioning).
  version           integer     NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_active         boolean     NOT NULL DEFAULT true,
  selected_at       timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companion_profiles_child_profile_id
  ON public.companion_profiles (child_profile_id);

CREATE TRIGGER trg_companion_profiles_updated_at
  BEFORE UPDATE ON public.companion_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.companion_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companion_profiles FORCE ROW LEVEL SECURITY;

-- Parent may read their child's companion profile.
CREATE POLICY "companion_profiles_parent_select"
  ON public.companion_profiles FOR SELECT
  TO authenticated
  USING (public.auth_owns_child(child_profile_id));

-- Child session may read its own companion profile (defense-in-depth).
CREATE POLICY "companion_profiles_child_session_select"
  ON public.companion_profiles FOR SELECT
  TO authenticated
  USING (
    child_profile_id = NULLIF(
      current_setting('app.child_profile_id', true), ''
    )::uuid
  );

-- No INSERT/UPDATE/DELETE policy for authenticated clients — service_role only.

-- ---------------------------------------------------------------------------
-- Grants
-- Authenticated role gets SELECT; RLS controls rows. Writes are service_role
-- only (Railway), which bypasses RLS. Neither table is exposed to anon.
-- ---------------------------------------------------------------------------

GRANT SELECT ON public.mission_attempts   TO authenticated;
GRANT SELECT ON public.companion_profiles TO authenticated;

COMMIT;
