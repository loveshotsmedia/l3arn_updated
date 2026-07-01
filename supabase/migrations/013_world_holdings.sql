-- =============================================================================
-- L3ARN Migration 013 — World Holdings
-- =============================================================================
-- Domain: 3D Academy World / Mastery-Gated Progression
--
-- Why this migration exists:
--   World holdings are mastery-gated buildings unlocked in the 3D Academy.
--   A holding unlocks on demonstrated mastery of a specific mission/objective,
--   never on points or currency (ADR-011 mastery-gated progression / ADR-019
--   living world state / spec §3.4 "Mastery Makes the World").
--
-- Trust model:
--   - Service role (Railway) is the ONLY writer — the frontend never writes
--     this table directly (ADR-031 pattern, same as academy_identities /
--     companion_profiles).
--   - Parents can read their own children's holdings via the existing
--     auth_owns_child() helper (ADR-008 parent visibility), matching the
--     established pattern used in migrations 004, 005, 008, 010, 011.
--
-- REQUIRES:
--   Migration 001 (child_profiles, auth_owns_child helper)
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. world_holdings
-- ---------------------------------------------------------------------------
-- One row per unlocked holding per child. holding_id is a stable slug (e.g.
-- 'fractions-observatory') matching MasteryBuilding's holdingId prop in the
-- 3D world engine. unique (child_profile_id, holding_id) makes re-unlock
-- attempts idempotent (upsert with ignoreDuplicates from Railway).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.world_holdings (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id        uuid        NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  -- Stable slug, e.g. 'fractions-observatory' — matches MasteryBuilding's holdingId prop
  holding_id              text        NOT NULL,
  unlocked_by_mission_id  text        NOT NULL,
  unlocked_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_profile_id, holding_id)
);

COMMENT ON TABLE public.world_holdings IS
  'Mastery-gated buildings unlocked in the 3D Academy world per child. '
  'A holding unlocks on demonstrated mastery of a specific mission/objective, '
  'never on points or currency. Service-role write only. '
  'ADR-011 (mastery-gated progression) / ADR-019 (living world state) / '
  'spec §3.4 "Mastery Makes the World".';

COMMENT ON COLUMN public.world_holdings.holding_id IS
  'Stable slug identifying the holding, e.g. "fractions-observatory". '
  'Matches the MasteryBuilding component''s holdingId prop in the world engine.';

COMMENT ON COLUMN public.world_holdings.unlocked_by_mission_id IS
  'The mission/objective id whose demonstrated mastery unlocked this holding.';

-- ---------------------------------------------------------------------------
-- 2. Row-Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.world_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_holdings FORCE ROW LEVEL SECURITY;

-- Parent can read holdings for their own children
CREATE POLICY "parent_read_world_holdings"
  ON public.world_holdings
  FOR SELECT
  USING (auth_owns_child(child_profile_id));

-- ---------------------------------------------------------------------------
-- 3. Service role grant (explicit — matches pattern from migrations 010/011)
-- ---------------------------------------------------------------------------

GRANT ALL ON public.world_holdings TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Indexes for common lookups
-- ---------------------------------------------------------------------------

-- Primary lookup: all holdings for a child, newest first (world hydration on load)
CREATE INDEX IF NOT EXISTS idx_world_holdings_child_profile_id
  ON public.world_holdings (child_profile_id, unlocked_at DESC);

COMMIT;
