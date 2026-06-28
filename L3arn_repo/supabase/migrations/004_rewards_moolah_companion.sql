-- =============================================================================
-- L3ARN Migration 004 — Rewards / Moolah / Companion Growth
-- =============================================================================
-- Domain: Rewards & Economy
-- Tables: moolah_wallets, moolah_ledger, xp_events, badges, child_badges,
--         house_points, companion_growth_events
--
-- Grounded in:
--   Agent 9 Spec (agent-09-rewards-moolah-companion.md)
--   ADR-011 (reward economy — split model: effort rewards + mastery-gated progression)
--   ADR-019 (living academy model)
--   supabase_schema.md §Rewards / Economy domain
--   supabase_rls_policy_plan.md (RLS patterns from Migration 001)
--   CONTEXT.md §6 decisions #12, #22
--
-- RLS Design:
--   - Child can read their own rows (future: via child session JWT claim)
--   - Parent can read rows for their children (via auth_owns_child() helper)
--   - Service role only for INSERT/UPDATE on ledger, xp_events, companion_growth_events
--   - No client writes to moolah_ledger, xp_events, companion_growth_events
--
-- Key invariants:
--   - moolah_wallets.balance is always non-negative (CHECK constraint)
--   - moolah_ledger is APPEND-ONLY (no UPDATE or DELETE policy)
--   - xp_events is APPEND-ONLY (no UPDATE or DELETE policy)
--   - companion_growth_events is APPEND-ONLY (no UPDATE or DELETE policy)
--   - moolah_ledger.amount may be negative (spend) but balance_after must remain >= 0
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. moolah_wallets
-- ---------------------------------------------------------------------------
-- One wallet per child. Single source of truth for current balance.
-- Balance is always non-negative; spending is validated before any ledger
-- entry is written. Updated by service_role when ledger entries are inserted.

CREATE TABLE IF NOT EXISTS public.moolah_wallets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id  UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  balance           INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned   INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (child_profile_id)
);

ALTER TABLE public.moolah_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moolah_wallets FORCE ROW LEVEL SECURITY;

-- Parent may read their child's wallet
CREATE POLICY "moolah_wallets_parent_select"
  ON public.moolah_wallets FOR SELECT
  USING (public.auth_owns_child(child_profile_id));

-- Child session may read their own wallet (defense-in-depth for future direct access)
CREATE POLICY "moolah_wallets_child_session_select"
  ON public.moolah_wallets FOR SELECT
  USING (
    child_profile_id = NULLIF(
      current_setting('app.child_profile_id', true), ''
    )::uuid
  );

-- No authenticated client INSERT/UPDATE — service_role only
-- (service_role bypasses RLS by default in Supabase)

CREATE TRIGGER moolah_wallets_updated_at
  BEFORE UPDATE ON public.moolah_wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. moolah_ledger
-- ---------------------------------------------------------------------------
-- Append-only Moolah transaction log. Positive amount = earned, negative = spent.
-- No UPDATE or DELETE policy — this is an immutable ledger (ADR-011).
-- All writes are via service_role (Railway backend) only.
--
-- SECURITY: moolah_ledger has NO INSERT policy for authenticated clients.
-- All writes go through service_role (Railway API only).
-- The trigger update_moolah_wallet_balance() runs as SECURITY DEFINER (service-level).
-- Direct client writes to moolah_wallets.balance are blocked by RLS.

CREATE TABLE IF NOT EXISTS public.moolah_ledger (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id  UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  wallet_id         UUID REFERENCES public.moolah_wallets(id) ON DELETE SET NULL,  -- FK for efficient trigger join
  amount            INTEGER NOT NULL,             -- positive = earned, negative = spent
  reason            TEXT    NOT NULL,             -- human-readable: "Mission 001 completion"
  source_type       TEXT    NOT NULL,             -- "mission-completion" | "effort-reward" | "mastery-unlock" | "purchase" | "admin-correction" | "system-adjustment"
  source_id         UUID,                         -- references mission_attempts, purchases, etc.
  balance_after     INTEGER CHECK (balance_after >= 0),  -- set by trigger; NULL until trigger fires
  idempotency_key   TEXT UNIQUE,                  -- nullable; when provided, prevents duplicate reward events
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS moolah_ledger_child_created_idx
  ON public.moolah_ledger (child_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS moolah_ledger_wallet_idx
  ON public.moolah_ledger (wallet_id);

CREATE INDEX IF NOT EXISTS moolah_ledger_source_idx
  ON public.moolah_ledger (source_type, source_id);

CREATE INDEX IF NOT EXISTS moolah_ledger_idempotency_idx
  ON public.moolah_ledger (idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.moolah_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moolah_ledger FORCE ROW LEVEL SECURITY;

-- Parent may read their child's ledger entries
CREATE POLICY "moolah_ledger_parent_select"
  ON public.moolah_ledger FOR SELECT
  USING (public.auth_owns_child(child_profile_id));

-- Child session may read their own ledger entries (defense-in-depth)
CREATE POLICY "moolah_ledger_child_session_select"
  ON public.moolah_ledger FOR SELECT
  USING (
    child_profile_id = NULLIF(
      current_setting('app.child_profile_id', true), ''
    )::uuid
  );

-- IMPORTANT: No INSERT, UPDATE, or DELETE policies for authenticated clients.
-- moolah_ledger is service_role-only for writes (Railway backend).
-- The absence of an INSERT policy for 'authenticated' is the enforcement mechanism.

-- ---------------------------------------------------------------------------
-- 3. xp_events
-- ---------------------------------------------------------------------------
-- XP earned events. Append-only. Service_role writes only.
-- XP is the longitudinal engagement and effort tracking signal.

CREATE TABLE IF NOT EXISTS public.xp_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id  UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  xp_amount         INTEGER NOT NULL CHECK (xp_amount > 0),
  reason            TEXT    NOT NULL,
  source_type       TEXT    NOT NULL,             -- "mission-attempt" | "evidence-captured" | "mastery-achieved" | "streak"
  source_id         UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS xp_events_child_profile_created_at_idx
  ON public.xp_events (child_profile_id, created_at DESC);

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_events FORCE ROW LEVEL SECURITY;

-- Parent may read their child's XP events
CREATE POLICY "xp_events_parent_select"
  ON public.xp_events FOR SELECT
  USING (public.auth_owns_child(child_profile_id));

-- Child session may read their own XP events (defense-in-depth)
CREATE POLICY "xp_events_child_session_select"
  ON public.xp_events FOR SELECT
  USING (
    child_profile_id = NULLIF(
      current_setting('app.child_profile_id', true), ''
    )::uuid
  );

-- No INSERT/UPDATE/DELETE for authenticated clients — service_role only.

-- ---------------------------------------------------------------------------
-- 4. badges
-- ---------------------------------------------------------------------------
-- Badge definition catalogue. Reference data managed by service_role.
-- Contains the set of achievable badges. Child-earned badges are in child_badges.

CREATE TABLE IF NOT EXISTS public.badges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_key       TEXT NOT NULL UNIQUE,           -- e.g. "mission-001-complete", "ai-literacy-1"
  name            TEXT NOT NULL,
  description     TEXT NOT NULL,
  mastery_gated   BOOLEAN NOT NULL DEFAULT false, -- true = awarded only when mastery evidence exists
  house           TEXT,                           -- optional house affiliation (Valkryn/Lyrion/Novari/Cytrex)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

-- Authenticated parents and child sessions may read the badge catalogue
CREATE POLICY "badges_authenticated_select"
  ON public.badges FOR SELECT
  TO authenticated
  USING (true);

-- No client INSERT/UPDATE/DELETE — badge definitions managed by service_role / curriculum admin

-- ---------------------------------------------------------------------------
-- 5. child_badges
-- ---------------------------------------------------------------------------
-- Records which badges each child has earned. One row per child per badge.
-- Service_role writes only. Parent and child session may read.

CREATE TABLE IF NOT EXISTS public.child_badges (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id  UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  badge_id          UUID NOT NULL REFERENCES public.badges(id),
  awarded_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_id         UUID,                         -- mission_attempts.id, mastery_records.id, etc.

  UNIQUE (child_profile_id, badge_id)
);

CREATE INDEX IF NOT EXISTS child_badges_child_profile_awarded_at_idx
  ON public.child_badges (child_profile_id, awarded_at DESC);

ALTER TABLE public.child_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_badges FORCE ROW LEVEL SECURITY;

-- Parent may read their child's earned badges
CREATE POLICY "child_badges_parent_select"
  ON public.child_badges FOR SELECT
  USING (public.auth_owns_child(child_profile_id));

-- Child session may read their own badges (defense-in-depth)
CREATE POLICY "child_badges_child_session_select"
  ON public.child_badges FOR SELECT
  USING (
    child_profile_id = NULLIF(
      current_setting('app.child_profile_id', true), ''
    )::uuid
  );

-- No INSERT/UPDATE/DELETE for authenticated clients — service_role only.

-- ---------------------------------------------------------------------------
-- 6. house_points
-- ---------------------------------------------------------------------------
-- Individual contributions to a House's collective point total.
-- Service_role writes only. Parent may read their child's contributions.
-- Index on (house, created_at DESC) supports house leaderboard queries.

CREATE TABLE IF NOT EXISTS public.house_points (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id  UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  house             TEXT NOT NULL,                -- must match house_name enum values
  points            INTEGER NOT NULL CHECK (points >= 0),
  reason            TEXT NOT NULL,
  source_type       TEXT NOT NULL,               -- "mission-completion" | "effort-reward" | "mastery-unlock" | "event"
  source_id         UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS house_points_house_created_at_idx
  ON public.house_points (house, created_at DESC);

CREATE INDEX IF NOT EXISTS house_points_child_profile_created_at_idx
  ON public.house_points (child_profile_id, created_at DESC);

ALTER TABLE public.house_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_points FORCE ROW LEVEL SECURITY;

-- Parent may read their child's house point contributions
CREATE POLICY "house_points_parent_select"
  ON public.house_points FOR SELECT
  USING (public.auth_owns_child(child_profile_id));

-- Child session may read their own house point events (defense-in-depth)
CREATE POLICY "house_points_child_session_select"
  ON public.house_points FOR SELECT
  USING (
    child_profile_id = NULLIF(
      current_setting('app.child_profile_id', true), ''
    )::uuid
  );

-- No INSERT/UPDATE/DELETE for authenticated clients — service_role only.

-- ---------------------------------------------------------------------------
-- 7. companion_growth_events
-- ---------------------------------------------------------------------------
-- Append-only log of companion bond increases and milestone events.
-- Service_role writes only. Parent and child session may read.
-- Bond increases are effort-based; form evolutions may be mastery-gated (ADR-011).

CREATE TABLE IF NOT EXISTS public.companion_growth_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id  UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  companion_key     TEXT NOT NULL,                -- matches companion_configs, e.g. "loomi", "charli"
  event_type        TEXT NOT NULL,               -- "bond-increase" | "milestone-reached" | "form-unlocked"
  bond_delta        INTEGER CHECK (bond_delta >= 0),    -- positive only (bond never decreases in MVP)
  bond_total        INTEGER CHECK (bond_total >= 0),    -- running total after event
  milestone_key     TEXT,                        -- optional: "first-mission", "100-bond", "trust-form"
  source_id         UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS companion_growth_events_child_profile_created_at_idx
  ON public.companion_growth_events (child_profile_id, created_at DESC);

ALTER TABLE public.companion_growth_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companion_growth_events FORCE ROW LEVEL SECURITY;

-- Parent may read their child's companion growth events
CREATE POLICY "companion_growth_events_parent_select"
  ON public.companion_growth_events FOR SELECT
  USING (public.auth_owns_child(child_profile_id));

-- Child session may read their own companion growth events (defense-in-depth)
CREATE POLICY "companion_growth_events_child_session_select"
  ON public.companion_growth_events FOR SELECT
  USING (
    child_profile_id = NULLIF(
      current_setting('app.child_profile_id', true), ''
    )::uuid
  );

-- No INSERT/UPDATE/DELETE for authenticated clients — service_role only.

-- ---------------------------------------------------------------------------
-- 8. Moolah wallet balance update trigger
-- ---------------------------------------------------------------------------
-- Called BEFORE every INSERT to moolah_ledger.
-- Atomically updates moolah_wallets.balance and lifetime_earned.
-- Prevents negative balance for non-system transactions.
-- Sets NEW.balance_after so the ledger row stores the post-transaction balance.
-- Uses FOR UPDATE to prevent race conditions under concurrent writes.
-- SECURITY DEFINER: runs with service-level permissions regardless of caller role.

CREATE OR REPLACE FUNCTION public.update_moolah_wallet_balance()
RETURNS TRIGGER AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  -- Lock the wallet row for this transaction (prevents concurrent balance corruption)
  SELECT balance INTO current_balance
  FROM public.moolah_wallets
  WHERE child_profile_id = NEW.child_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No moolah wallet found for child_profile_id: %', NEW.child_profile_id;
  END IF;

  -- Prevent negative balance unless source_type is an approved system correction
  IF (current_balance + NEW.amount) < 0 AND NEW.source_type NOT IN ('admin-correction', 'system-adjustment') THEN
    RAISE EXCEPTION 'Insufficient balance: current=%, attempted=%, source=%',
      current_balance, NEW.amount, NEW.source_type;
  END IF;

  -- Update wallet balance and lifetime_earned atomically
  UPDATE public.moolah_wallets
  SET
    balance        = current_balance + NEW.amount,
    lifetime_earned = CASE
                        WHEN NEW.amount > 0 THEN lifetime_earned + NEW.amount
                        ELSE lifetime_earned
                      END,
    updated_at     = now()
  WHERE child_profile_id = NEW.child_profile_id;

  -- Write computed balance_after into the ledger row before it is stored
  NEW.balance_after := current_balance + NEW.amount;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER moolah_ledger_update_wallet
  BEFORE INSERT ON public.moolah_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.update_moolah_wallet_balance();

-- ---------------------------------------------------------------------------
-- 8b. Wallet auto-creation trigger on child_profile INSERT
-- ---------------------------------------------------------------------------
-- Ensures every child always has a moolah wallet on creation.
-- Prevents "No moolah wallet found" errors when the first ledger entry fires.
-- ON CONFLICT DO NOTHING makes this idempotent (safe on re-run).

CREATE OR REPLACE FUNCTION public.create_moolah_wallet_for_child()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.moolah_wallets (child_profile_id)
  VALUES (NEW.id)
  ON CONFLICT (child_profile_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_create_moolah_wallet
  AFTER INSERT ON public.child_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_moolah_wallet_for_child();

-- ---------------------------------------------------------------------------
-- 9. Seed data — Badge catalogue
-- ---------------------------------------------------------------------------
-- Insert the two founding badges for Mission 001.
-- ON CONFLICT DO NOTHING makes this idempotent.

INSERT INTO public.badges (badge_key, name, description, mastery_gated, house)
VALUES
  (
    'mission-001-complete',
    'Sorted!',
    'Completed Mission 001: Repair the Sorting Computer',
    true,  -- mastery_gated: evidence required
    NULL   -- no house affiliation
  ),
  (
    'ai-literacy-1',
    'AI Apprentice',
    'Demonstrated understanding that AI can be wrong and must be checked',
    true,  -- mastery_gated: AI literacy evidence required
    NULL
  )
ON CONFLICT (badge_key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Note: moolah_wallets updated_at trigger was created in section 1 above.
-- set_updated_at() is the canonical function from Migration 001.
-- ---------------------------------------------------------------------------

COMMIT;
