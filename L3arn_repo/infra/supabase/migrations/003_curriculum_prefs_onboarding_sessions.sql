-- =============================================================================
-- L3ARN Migration 003 — House Pre-Sorting, Curriculum Prefs, Onboarding Sessions
-- =============================================================================
-- Grounded in:
--   Wave 1 OQ Resolutions (June 2026):
--     OQ-7  → Add pre_sorting to house_name enum
--     OQ-10 → Create parent_curriculum_prefs (not child_permissions.focus_subjects)
--     OQ-15 → Create onboarding_sessions (server-side onboarding token)
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Add pre_sorting to house_name enum
-- ---------------------------------------------------------------------------
-- pre_sorting is the value set for academy_identities.house before the
-- Sorting Ceremony. Never display it as a real House name in the UI.
-- Restoration to a real House requires founder/admin review.

ALTER TYPE public.house_name ADD VALUE IF NOT EXISTS 'pre_sorting' BEFORE 'Valkryn';

-- Update academy_identities default so new inserts before Sorting Ceremony
-- get pre_sorting automatically.
ALTER TABLE public.academy_identities
  ALTER COLUMN house SET DEFAULT 'pre_sorting';

-- ---------------------------------------------------------------------------
-- 2. parent_curriculum_prefs table
-- ---------------------------------------------------------------------------
-- Curriculum preferences are parent-owned and household-scoped.
-- Kept separate from child_permissions (which is access control, not curriculum).
-- Owned by: parent / household admin.
-- Access: authenticated parent via household RLS.

CREATE TABLE IF NOT EXISTS public.parent_curriculum_prefs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id          UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  household_id              UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,

  -- Curriculum focus
  focus_subjects            JSONB NOT NULL DEFAULT '[]',   -- e.g. ["math", "science"]
  blocked_topics            JSONB NOT NULL DEFAULT '[]',   -- mirrors child_permissions; curriculum-specific additions
  parent_goals              JSONB NOT NULL DEFAULT '[]',   -- free-form parent goals text

  -- Delivery preferences
  preferred_delivery_modes  JSONB NOT NULL DEFAULT '["3d"]',  -- subset of delivery_mode enum values
  outside_time_preference   TEXT,                             -- e.g. "evenings only"
  screen_time_preference    TEXT,                             -- e.g. "1 hour max per session"

  -- Approval mode (mirrors child_permissions.curriculum_approval_mode for curriculum context)
  approval_mode             public.approval_mode NOT NULL DEFAULT 'balanced',

  -- Optional sensitive preferences
  religious_or_secular_preference TEXT,    -- e.g. "secular only" or "faith-integrated"
  custom_notes              TEXT,           -- free-form parent notes for the AI

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (child_profile_id)  -- one prefs record per child
);

-- RLS: parent may only access their own household's curriculum prefs
ALTER TABLE public.parent_curriculum_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parent_curriculum_prefs_select"
  ON public.parent_curriculum_prefs FOR SELECT
  USING (
    household_id IN (
      SELECT id FROM public.households WHERE parent_account_id = auth.uid()
    )
  );

CREATE POLICY "parent_curriculum_prefs_insert"
  ON public.parent_curriculum_prefs FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT id FROM public.households WHERE parent_account_id = auth.uid()
    )
  );

CREATE POLICY "parent_curriculum_prefs_update"
  ON public.parent_curriculum_prefs FOR UPDATE
  USING (
    household_id IN (
      SELECT id FROM public.households WHERE parent_account_id = auth.uid()
    )
  );

-- No DELETE policy — soft-delete only (set a flag if needed in future).

-- ---------------------------------------------------------------------------
-- 3. onboarding_sessions table
-- ---------------------------------------------------------------------------
-- Server-side onboarding token. Replaces fragile sessionStorage flow.
-- Each onboarding attempt for a child gets a short-lived token.
-- Token expires after completion or ONBOARDING_SESSION_TTL_MINUTES (default 60).

DO $$ BEGIN
  CREATE TYPE public.onboarding_status AS ENUM (
    'in-progress',
    'completed',
    'expired',
    'abandoned'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id      UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  child_profile_id  UUID REFERENCES public.child_profiles(id) ON DELETE CASCADE,

  -- Token: short-lived, sent to the client as a URL param or secure cookie
  -- The token itself is stored hashed (sha256) to prevent theft from DB reads.
  -- The Railway API compares hash(incoming_token) against this column.
  token_hash        TEXT NOT NULL UNIQUE,

  status            public.onboarding_status NOT NULL DEFAULT 'in-progress',

  -- Tracks where in the onboarding flow the user is
  current_step      TEXT NOT NULL DEFAULT 'household',

  -- TTL: expires_at is set at INSERT time; API rejects expired tokens
  expires_at        TIMESTAMPTZ NOT NULL,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: only the owning parent may read/update their onboarding session
ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onboarding_sessions_select"
  ON public.onboarding_sessions FOR SELECT
  USING (
    household_id IN (
      SELECT id FROM public.households WHERE parent_account_id = auth.uid()
    )
  );

CREATE POLICY "onboarding_sessions_insert"
  ON public.onboarding_sessions FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT id FROM public.households WHERE parent_account_id = auth.uid()
    )
  );

CREATE POLICY "onboarding_sessions_update"
  ON public.onboarding_sessions FOR UPDATE
  USING (
    household_id IN (
      SELECT id FROM public.households WHERE parent_account_id = auth.uid()
    )
  );

-- No DELETE policy.

-- Service role may also INSERT onboarding sessions on behalf of the parent
-- (used by Railway API when the parent creates a new child onboarding flow).
CREATE POLICY "onboarding_sessions_service_role_all"
  ON public.onboarding_sessions FOR ALL
  USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 4. Updated-at trigger helper (shared pattern)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER parent_curriculum_prefs_updated_at
  BEFORE UPDATE ON public.parent_curriculum_prefs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER onboarding_sessions_updated_at
  BEFORE UPDATE ON public.onboarding_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
