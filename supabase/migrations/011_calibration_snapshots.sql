-- =============================================================================
-- L3ARN Migration 011 — Calibration Snapshots
-- =============================================================================
-- Domain: Learner Calibration Model
--
-- Why this migration exists:
--   The architecture.md §9 defines a Learner Calibration Model with staged
--   confidence levels. This migration creates the calibration_snapshots table
--   that stores computed calibration confidence at each stage:
--
--     onboarding        → 0.20–0.35 (parent onboarding only)
--     sorting-ceremony  → 0.40–0.55 (adds House Calling trial trait scores)
--     mission-001       → 0.60–0.75 (adds mission interaction evidence)
--     days-7-14         → 0.80–0.90 (future phase)
--
--   Snapshots are computed by the Railway backend (calibration-engine.ts) and
--   written after significant learning events (House Calling, Mission 001 complete).
--
-- Trust model:
--   - Service role (Railway) is the ONLY writer.
--   - Parents can read calibration snapshots for their own children via RLS.
--   - The frontend never touches this table directly.
--
-- Grounded in: architecture.md §9 (Learner Calibration Model),
--   ADR-031 (backend writes), CONTEXT.md §6 Decision 27,
--   Migration 010 (house_calling_signals — signal source),
--   Migration 005 (learning_evidence_events — signal source).
--
-- REQUIRES:
--   Migration 001 (child_profiles, auth_owns_child helper)
--   Migration 007/008 (academy_identities)
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. calibration_snapshots
-- ---------------------------------------------------------------------------
-- Stores a point-in-time calibration confidence snapshot for one child.
-- Inserted (not upserted) after each calibration-triggering event so that
-- the full confidence trajectory is preserved for analytics.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.calibration_snapshots (
  id                    uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id      uuid         NOT NULL
                          REFERENCES public.child_profiles(id)
                          ON DELETE CASCADE,
  academy_identity_id   uuid
                          REFERENCES public.academy_identities(id)
                          ON DELETE SET NULL,

  -- Confidence level (0.0–1.0, maps to architecture.md §9 percentages)
  confidence_score      numeric(4,3) NOT NULL
                          CHECK (confidence_score BETWEEN 0 AND 1),

  -- Calibration stage (matches architecture.md §9)
  calibration_stage     text         NOT NULL
                          CHECK (calibration_stage IN (
                            'onboarding',
                            'sorting-ceremony',
                            'mission-001',
                            'days-7-14'
                          )),

  -- Signal sources that contributed to this snapshot
  -- e.g. ["house_calling_signals", "learning_evidence_events"]
  signal_sources        jsonb        NOT NULL DEFAULT '[]',

  -- Trait profile (from house_calling_signals or derived from evidence)
  -- e.g. { curiosity: 0.8, courage: 0.6, ... }
  trait_profile         jsonb,

  -- Calibration signals (maps to CalibrationSignalTypeSchema)
  -- Keys: reading_vs_listening, cognitive_load, ai_readiness, persistence,
  --       delivery_mode_preference, hint_frequency
  calibration_signals   jsonb,

  computed_at           timestamptz  NOT NULL DEFAULT now(),
  created_at            timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.calibration_snapshots IS
  'Point-in-time learner calibration confidence snapshots. '
  'Written by Railway after House Calling completion and Mission 001 completion. '
  'Service-role write only. Architecture.md §9 maps stages to confidence ranges.';

COMMENT ON COLUMN public.calibration_snapshots.confidence_score IS
  'Calibration confidence (0.0–1.0). Stage ranges: '
  'onboarding=0.20-0.35, sorting-ceremony=0.40-0.55, '
  'mission-001=0.60-0.75, days-7-14=0.80-0.90.';

COMMENT ON COLUMN public.calibration_snapshots.signal_sources IS
  'Array of table names whose data was read to produce this snapshot. '
  'e.g. ["house_calling_signals", "learning_evidence_events"]';

COMMENT ON COLUMN public.calibration_snapshots.calibration_signals IS
  'Structured signal observations keyed by CalibrationSignalType: '
  'ai_readiness, persistence, hint_frequency, delivery_mode_preference, '
  'reading_vs_listening, cognitive_load. Values are "signal-present", '
  '"not-observed", or a numeric observation.';

-- ---------------------------------------------------------------------------
-- 2. Row-Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.calibration_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibration_snapshots FORCE ROW LEVEL SECURITY;

-- Parent can read calibration snapshots for their own children
CREATE POLICY "parent_read_calibration_snapshots"
  ON public.calibration_snapshots
  FOR SELECT
  USING (auth_owns_child(child_profile_id));

-- ---------------------------------------------------------------------------
-- 3. Service role grant (explicit — matches pattern from migration 010)
-- ---------------------------------------------------------------------------

GRANT ALL ON public.calibration_snapshots TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Indexes for common lookups
-- ---------------------------------------------------------------------------

-- Primary lookup: all snapshots for a child, newest first
CREATE INDEX IF NOT EXISTS idx_calibration_snapshots_child_profile_id
  ON public.calibration_snapshots (child_profile_id, computed_at DESC);

-- Stage-specific lookup: latest snapshot at a given stage for a child
CREATE INDEX IF NOT EXISTS idx_calibration_snapshots_stage
  ON public.calibration_snapshots (child_profile_id, calibration_stage);

COMMIT;
