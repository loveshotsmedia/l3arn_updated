-- =============================================================================
-- L3ARN Migration 010 — House Calling Ceremony Tables
-- =============================================================================
-- Domain: Academy Identity / Calibration
--
-- Why this migration exists:
--   The House Calling ceremony (Agent 15) replaces the simple house dropdown
--   with a multi-step identity event. This migration adds:
--
--   1. house_memberships     — Official ceremony record (append-only after insert).
--                              One row per child. Tracks recommended vs selected
--                              house, override usage, transfer lock, and the
--                              ceremony signal summary as a JSONB snapshot.
--
--   2. house_calling_signals — Raw trial trait scores from The Trial (7 questions).
--                              Multiple rows allowed per child (retry-safe).
--                              Used by the companion adaptation pipeline (Phase 4).
--
-- Trust model:
--   - Both tables are write-only from the frontend's perspective. The Railway
--     backend (service_role) performs all inserts/upserts via
--     POST /api/student/session/calibration-signals (ADR-031).
--   - Parents can read their own children's records via RLS.
--   - The frontend never touches these tables directly.
--
-- Grounded in: ADR-007 (academy identity), ADR-031 (backend writes),
--   Hero Slice Integration Phase C, House Calling Ceremony (Agent 15).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. house_memberships
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.house_memberships (
  id                                     uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id                       uuid         NOT NULL
                                           REFERENCES public.child_profiles(id)
                                           ON DELETE CASCADE,
  household_id                           uuid         NOT NULL
                                           REFERENCES public.households(id)
                                           ON DELETE CASCADE,
  academy_identity_id                    uuid
                                           REFERENCES public.academy_identities(id)
                                           ON DELETE SET NULL,

  -- Ceremony result
  recommended_house                      text         NOT NULL,
  selected_house                         text         NOT NULL,
  assignment_method                      text         NOT NULL DEFAULT 'house_calling',
  override_used                          boolean      NOT NULL DEFAULT false,

  -- Status & lifecycle
  membership_status                      text         NOT NULL DEFAULT 'active'
                                           CHECK (membership_status IN ('active', 'transferred', 'revoked')),
  child_accepted_at                      timestamptz,
  parent_confirmed_at                    timestamptz,
  joined_at                              timestamptz  NOT NULL DEFAULT now(),

  -- Transfer governance (parent must authorize any house change)
  transfer_locked                        boolean      NOT NULL DEFAULT true,
  transfer_requires_parent_authorization boolean      NOT NULL DEFAULT true,

  -- Calibration snapshot from The Trial
  ceremony_signal_summary                jsonb,

  created_at                             timestamptz  NOT NULL DEFAULT now(),
  updated_at                             timestamptz  NOT NULL DEFAULT now(),

  -- One active membership per child
  CONSTRAINT house_memberships_child_unique UNIQUE (child_profile_id)
);

COMMENT ON TABLE public.house_memberships IS
  'Official House Calling ceremony record. One row per child. '
  'Read-only after initial insert except for parent_confirmed_at and membership_status. '
  'Transfer requires parent authorization (transfer_requires_parent_authorization).';

-- ---------------------------------------------------------------------------
-- 2. house_calling_signals
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.house_calling_signals (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id    uuid         NOT NULL
                        REFERENCES public.child_profiles(id)
                        ON DELETE CASCADE,
  academy_identity_id uuid
                        REFERENCES public.academy_identities(id)
                        ON DELETE SET NULL,

  -- Trait scores from The Trial (7 questions, max 14 per trait)
  trait_scores        jsonb        NOT NULL,

  -- Ceremony outcome
  recommended_house   text         NOT NULL,
  selected_house      text         NOT NULL,
  override_used       boolean      NOT NULL DEFAULT false,

  recorded_at         timestamptz  NOT NULL DEFAULT now(),
  created_at          timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.house_calling_signals IS
  'Raw trait scores from the House Calling Trial (7 scenario questions). '
  'Used by the companion adaptation pipeline (Phase 4). '
  'Multiple rows allowed per child — retry-safe.';

-- ---------------------------------------------------------------------------
-- 3. Row-Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.house_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE public.house_calling_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_calling_signals FORCE ROW LEVEL SECURITY;

-- Parent can read their own children's records (uses existing auth_owns_child helper)
CREATE POLICY "parent_read_house_memberships"
  ON public.house_memberships
  FOR SELECT
  USING (auth_owns_child(child_profile_id));

CREATE POLICY "parent_read_house_calling_signals"
  ON public.house_calling_signals
  FOR SELECT
  USING (auth_owns_child(child_profile_id));

-- ---------------------------------------------------------------------------
-- 4. Service role grants (explicit — matches pattern from migration 009)
-- ---------------------------------------------------------------------------

GRANT ALL ON public.house_memberships TO service_role;
GRANT ALL ON public.house_calling_signals TO service_role;

-- ---------------------------------------------------------------------------
-- 5. updated_at trigger for house_memberships
-- ---------------------------------------------------------------------------

CREATE TRIGGER set_house_memberships_updated_at
  BEFORE UPDATE ON public.house_memberships
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Indexes for common lookups
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_house_memberships_child_profile_id
  ON public.house_memberships (child_profile_id);

CREATE INDEX IF NOT EXISTS idx_house_memberships_household_id
  ON public.house_memberships (household_id);

CREATE INDEX IF NOT EXISTS idx_house_calling_signals_child_profile_id
  ON public.house_calling_signals (child_profile_id);

COMMIT;
