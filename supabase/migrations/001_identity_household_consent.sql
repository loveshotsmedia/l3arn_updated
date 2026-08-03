-- =============================================================================
-- L3ARN Migration 001 — Identity, Household & Consent
-- =============================================================================
-- Domain: Identity / Auth
-- Tables: parent_accounts, households, household_members, child_profiles,
--         academy_identities, child_permissions, privacy_settings,
--         parent_consents, child_sessions, trusted_devices
--
-- Grounded in:
--   MASTER_HANDOFF §10 (data model), §9 (privacy/safety)
--   ADR-007 (child identity model)
--   ADR-008 (parent visibility model)
--   ADR-012 (parent curriculum approval)
--   ADR-027 (audio: push-to-talk only; default OFF)
--   ADR-029 (model improvement opt-out; default OFF)
--   ADR-030 (account ownership: parent-owned child profiles)
--   ADR-031 (child session model: parent-launch or avatar/PIN)
--   shared_contracts_spec.md Contract 1 (Identity Contract)
--
-- RLS Design:
--   supabase_rls_policy_plan.md §Migration 001
--
-- Schema rules enforced at the column / check level:
--   - audio_enabled defaults to FALSE (ADR-027)
--   - model_improvement_opt_in defaults to FALSE (ADR-029)
--   - parent_consents has no UPDATE or DELETE policy (COPPA audit trail)
--   - child_sessions are INSERT-only via service_role (ADR-031)
--   - legal PII (legal_first_name, legal_last_name, date_of_birth) lives
--     ONLY in child_profiles; academy_identities holds display_name only
--
-- RLS identity model:
--   parent_accounts.id == auth.uid() (canonical Supabase profiles pattern).
--   This ensures every downstream policy of the form
--   `parent_account_id = auth.uid()` resolves correctly without a subquery.
--   DO NOT change parent_accounts.id to gen_random_uuid() — that breaks all
--   household and child RLS policies.
-- =============================================================================

BEGIN;

-- Defer SQL function body validation so forward-referencing helper functions
-- (auth_owns_household, auth_owns_child) can be defined before their tables.
SET LOCAL check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- 0. Shared Enums
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.house_name AS ENUM (
    'Valkryn',   -- Sports, movement, courage, discipline
    'Lyrion',    -- Music, arts, storytelling, expression
    'Novari',    -- Science, discovery, nature, transformation
    'Cytrex'     -- Technology, AI, coding, systems
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.grade_level AS ENUM (
    'K','1','2','3','4','5','6','7','8'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.approval_mode AS ENUM (
    'high-control',
    'balanced',
    'autopilot'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.delivery_mode AS ENUM (
    '3d',
    'interactive-lite',
    'text-audio-offline'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.chat_mode AS ENUM (
    'quick-chat-only',       -- K-5 default (ADR-006)
    'moderated-free-text'    -- grades 6-8, requires parent consent (ADR-006)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.visibility_tier AS ENUM (
    'full',            -- K-5 default: parent sees everything (ADR-008)
    'summary',         -- grades 6-8 default (ADR-008)
    'safety-override'  -- always available regardless of tier (ADR-008)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.session_entry_method AS ENUM (
    'parent-launch',
    'avatar-pin-trusted-device'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.consent_type AS ENUM (
    'coppa-data-collection',
    'audio-push-to-talk',
    'ai-interaction',
    'model-improvement',
    'moderated-free-text-chat',
    'visibility-reduction'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 0.1 Shared trigger: set_updated_at
-- Applied to every mutable table.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 0.2 Ownership helper functions
-- SECURITY DEFINER so the functions can read base tables, but callers cannot
-- bypass RLS by querying through them.
--
-- These functions assume parent_accounts.id = auth.uid() (Supabase profiles
-- pattern). If that invariant ever changes, update these functions first.
-- ---------------------------------------------------------------------------

-- Returns TRUE if auth.uid() owns the given household
CREATE OR REPLACE FUNCTION public.auth_owns_household(hh_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.households
    WHERE id = hh_id
      AND parent_account_id = auth.uid()
      AND deleted_at IS NULL
  );
$$;

-- Returns TRUE if auth.uid() owns the given child_profile
CREATE OR REPLACE FUNCTION public.auth_owns_child(cp_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.child_profiles
    WHERE id = cp_id
      AND parent_account_id = auth.uid()
      AND deleted_at IS NULL
  );
$$;

-- Returns the child_profile_id from the active session JWT.
-- Railway mints child session tokens with these custom JWT claims:
--   app.child_profile_id, app.academy_identity_id, app.child_session_id
-- See: supabase_rls_policy_plan.md §Cross-Cutting Rule 2 (Child JWT Scope)
CREATE OR REPLACE FUNCTION public.current_child_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::jsonb ->> 'app.child_profile_id',
    ''
  )::uuid;
$$;

-- Returns the academy_identity_id from the active session JWT.
CREATE OR REPLACE FUNCTION public.current_academy_identity_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::jsonb ->> 'app.academy_identity_id',
    ''
  )::uuid;
$$;

-- Returns the child_session_id from the active session JWT.
CREATE OR REPLACE FUNCTION public.current_child_session_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::jsonb ->> 'app.child_session_id',
    ''
  )::uuid;
$$;

-- ---------------------------------------------------------------------------
-- 1. parent_accounts
-- ---------------------------------------------------------------------------
-- Sensitivity: HIGH — email, display name
-- Mirror of auth.users with L3ARN-specific profile fields.
-- One row per authenticated parent; created by auth trigger on sign-up.
--
-- IDENTITY INVARIANT: id = auth.users.id = auth.uid()
-- This is the canonical Supabase profiles pattern. The RLS policies on
-- households, child_profiles, and all downstream tables resolve correctly
-- because parent_account_id FKs point to this table's id, which equals
-- auth.uid(). Never add DEFAULT gen_random_uuid() to this column.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.parent_accounts (
  -- id matches auth.users.id exactly — this is intentional (not gen_random_uuid())
  id                  uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name        text        NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 100),
  email               text        NOT NULL CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  timezone            text        NOT NULL DEFAULT 'America/New_York',
  onboarding_complete boolean     NOT NULL DEFAULT false,
  deleted_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.parent_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_accounts FORCE ROW LEVEL SECURITY;

CREATE TRIGGER trg_parent_accounts_updated_at
  BEFORE UPDATE ON public.parent_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS Policies
CREATE POLICY "parent_accounts_self_select"
  ON public.parent_accounts FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "parent_accounts_self_insert"
  ON public.parent_accounts FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "parent_accounts_self_update"
  ON public.parent_accounts FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- No DELETE policy: account closure is a service_role-only operation (must audit-log).

-- ---------------------------------------------------------------------------
-- Auth trigger: create parent_account row on Supabase Auth sign-up.
-- id is set to NEW.id (auth.users.id) — preserving the identity invariant.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.parent_accounts (id, display_name, email)
  VALUES (
    NEW.id,  -- id = auth.users.id — intentional; preserves auth.uid() == id
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- 2. households
-- ---------------------------------------------------------------------------
-- Sensitivity: MEDIUM — family unit metadata
-- A family unit owned by a parent account. One per parent in MVP (ADR-030).
-- parent_account_id references parent_accounts.id which equals auth.uid(),
-- so `parent_account_id = auth.uid()` resolves correctly in RLS.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.households (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_account_id   uuid        NOT NULL REFERENCES public.parent_accounts(id) ON DELETE CASCADE,
  name                text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  -- State code for standards filtering (e.g. 'FL' for Florida CPALMS)
  state_code          char(2),
  deleted_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households FORCE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_households_parent_account_id
  ON public.households (parent_account_id);

CREATE TRIGGER trg_households_updated_at
  BEFORE UPDATE ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS Policies
CREATE POLICY "households_owner_select"
  ON public.households FOR SELECT
  TO authenticated
  USING (parent_account_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "households_owner_insert"
  ON public.households FOR INSERT
  TO authenticated
  WITH CHECK (parent_account_id = auth.uid());

CREATE POLICY "households_owner_update"
  ON public.households FOR UPDATE
  TO authenticated
  USING (parent_account_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (parent_account_id = auth.uid());

-- No DELETE policy: soft-delete via deleted_at.

-- ---------------------------------------------------------------------------
-- 3. household_members
-- ---------------------------------------------------------------------------
-- Sensitivity: MEDIUM — co-parent roster
-- Co-parent or observer adults in a household. MVP: one primary parent only.
-- Role column supports future co-parent expansion without schema migration.
-- INSERT/UPDATE via backend only — co-parent invitation is a Railway flow.
-- role: 'primary' = household owner, 'co-parent' = full access, 'observer' = read-only
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.household_members (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id        uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  parent_account_id   uuid        NOT NULL REFERENCES public.parent_accounts(id) ON DELETE CASCADE,
  role                text        NOT NULL DEFAULT 'co-parent'
                                  CHECK (role IN ('primary', 'co-parent', 'observer')),
  invited_at          timestamptz NOT NULL DEFAULT now(),
  accepted_at         timestamptz,
  UNIQUE (household_id, parent_account_id)
);

ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members FORCE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_household_members_household_id
  ON public.household_members (household_id);

CREATE INDEX IF NOT EXISTS idx_household_members_parent_account_id
  ON public.household_members (parent_account_id);

-- RLS: parent can see members of their own household
CREATE POLICY "household_members_household_owner_select"
  ON public.household_members FOR SELECT
  TO authenticated
  USING (public.auth_owns_household(household_id));

-- INSERT/UPDATE/DELETE are service_role only — co-parent invitation is a backend flow.

-- ---------------------------------------------------------------------------
-- 4. child_profiles
-- ---------------------------------------------------------------------------
-- Sensitivity: CRITICAL — legal name, date of birth, grade (full PII)
-- Parent-owned. NEVER exposed to child sessions, other parents, or other
-- households. Child session JWT has NO SELECT policy on this table.
-- DOB is retained for COPPA age verification only; not surfaced in any API response.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.child_profiles (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id        uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  parent_account_id   uuid        NOT NULL REFERENCES public.parent_accounts(id) ON DELETE CASCADE,
  -- Legal PII — parent eyes only
  legal_first_name    text        NOT NULL CHECK (char_length(legal_first_name) BETWEEN 1 AND 100),
  legal_last_name     text        NOT NULL CHECK (char_length(legal_last_name) BETWEEN 1 AND 100),
  date_of_birth       date        NOT NULL,  -- COPPA age verification; never returned to UI
  grade               grade_level NOT NULL,
  -- Profile lifecycle
  onboarding_complete boolean     NOT NULL DEFAULT false,
  sorting_complete    boolean     NOT NULL DEFAULT false,
  deleted_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_profiles FORCE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_child_profiles_parent_account_id
  ON public.child_profiles (parent_account_id);

CREATE INDEX IF NOT EXISTS idx_child_profiles_household_id
  ON public.child_profiles (household_id);

CREATE TRIGGER trg_child_profiles_updated_at
  BEFORE UPDATE ON public.child_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS Policies
-- Only the owning parent can read legal PII. No child session policy here.
CREATE POLICY "child_profiles_parent_select"
  ON public.child_profiles FOR SELECT
  TO authenticated
  USING (
    parent_account_id = auth.uid()
    AND deleted_at IS NULL
  );

CREATE POLICY "child_profiles_parent_insert"
  ON public.child_profiles FOR INSERT
  TO authenticated
  WITH CHECK (parent_account_id = auth.uid());

CREATE POLICY "child_profiles_parent_update"
  ON public.child_profiles FOR UPDATE
  TO authenticated
  USING (
    parent_account_id = auth.uid()
    AND deleted_at IS NULL
  )
  WITH CHECK (parent_account_id = auth.uid());

-- No DELETE policy — soft-delete only via deleted_at.
-- No child session SELECT policy — child JWT must NEVER see legal_first_name / date_of_birth.

-- ---------------------------------------------------------------------------
-- 5. academy_identities
-- ---------------------------------------------------------------------------
-- Sensitivity: LOW — public-facing in-Academy identity (ADR-007)
-- Display name + house + avatar asset reference ONLY. Real name is NEVER stored here.
-- display_name must be unique across the Academy (no two children share a name).
-- No face data; avatar_asset_id references a pre-built, platform-approved asset.
-- Child session reads ONLY its own row via JWT claim.
-- Other students see display_name + house only via realtime room presence (Railway) —
-- never via a raw cross-child Supabase SELECT.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.academy_identities (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id    uuid        NOT NULL UNIQUE REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  display_name        text        NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 32),
  house               house_name  NOT NULL,
  avatar_asset_id     text,       -- Pre-built asset reference; no face capture data (ADR-026)
  deleted_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (display_name)           -- Unique display names across the Academy
);

ALTER TABLE public.academy_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_identities FORCE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_academy_identities_child_profile_id
  ON public.academy_identities (child_profile_id);

CREATE INDEX IF NOT EXISTS idx_academy_identities_house
  ON public.academy_identities (house);

CREATE TRIGGER trg_academy_identities_updated_at
  BEFORE UPDATE ON public.academy_identities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS Policies

-- Parent reads their children's academy identities
CREATE POLICY "academy_identities_parent_select"
  ON public.academy_identities FOR SELECT
  TO authenticated
  USING (
    public.auth_owns_child(child_profile_id)
    AND deleted_at IS NULL
  );

CREATE POLICY "academy_identities_parent_insert"
  ON public.academy_identities FOR INSERT
  TO authenticated
  WITH CHECK (public.auth_owns_child(child_profile_id));

CREATE POLICY "academy_identities_parent_update"
  ON public.academy_identities FOR UPDATE
  TO authenticated
  USING (public.auth_owns_child(child_profile_id))
  WITH CHECK (public.auth_owns_child(child_profile_id));

-- Child session reads ONLY its own identity row via JWT claim app.academy_identity_id
CREATE POLICY "academy_identities_child_session_select"
  ON public.academy_identities FOR SELECT
  TO authenticated
  USING (id = public.current_academy_identity_id());

-- ---------------------------------------------------------------------------
-- 6. child_permissions
-- ---------------------------------------------------------------------------
-- Sensitivity: MEDIUM — behavioral settings; parent writes; child reads own
-- Controls what features a child may access (ADR-006, ADR-012, ADR-017, ADR-027).
-- One row per child. Child session can read own permissions to know allowed modes.
-- audio_enabled defaults FALSE (ADR-027: push-to-talk is opt-in).
-- model_improvement_opt_in defaults FALSE (ADR-029: opt-out by default).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.child_permissions (
  id                            uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id              uuid            NOT NULL UNIQUE REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  chat_mode                     chat_mode       NOT NULL DEFAULT 'quick-chat-only',
  -- ADR-027: push-to-talk audio is parent-controlled and opt-in; never always-on
  audio_enabled                 boolean         NOT NULL DEFAULT false,
  -- ADR-009: AI companion chat interaction
  ai_interaction_enabled        boolean         NOT NULL DEFAULT true,
  -- ADR-017: parent governs which delivery modes the child can choose from
  allowed_delivery_modes        delivery_mode[] NOT NULL DEFAULT ARRAY['3d', 'interactive-lite', 'text-audio-offline']::delivery_mode[],
  -- ADR-012: curriculum approval mode
  curriculum_approval_mode      approval_mode   NOT NULL DEFAULT 'balanced',
  -- ADR-029: model improvement participation; safe default is NOT opted in
  model_improvement_opt_in      boolean         NOT NULL DEFAULT false,
  -- Optional screen time limit
  screen_limit_minutes_per_day  integer         CHECK (screen_limit_minutes_per_day > 0),
  -- Topics the parent has blocked from AI generation and mission selection
  blocked_topics                text[]          NOT NULL DEFAULT '{}',
  updated_by_parent_account_id  uuid            NOT NULL REFERENCES public.parent_accounts(id),
  created_at                    timestamptz     NOT NULL DEFAULT now(),
  updated_at                    timestamptz     NOT NULL DEFAULT now()
);

ALTER TABLE public.child_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_permissions FORCE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_child_permissions_child_profile_id
  ON public.child_permissions (child_profile_id);

CREATE TRIGGER trg_child_permissions_updated_at
  BEFORE UPDATE ON public.child_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS Policies
CREATE POLICY "child_permissions_parent_select"
  ON public.child_permissions FOR SELECT
  TO authenticated
  USING (public.auth_owns_child(child_profile_id));

CREATE POLICY "child_permissions_parent_insert"
  ON public.child_permissions FOR INSERT
  TO authenticated
  WITH CHECK (public.auth_owns_child(child_profile_id));

CREATE POLICY "child_permissions_parent_update"
  ON public.child_permissions FOR UPDATE
  TO authenticated
  USING (public.auth_owns_child(child_profile_id))
  WITH CHECK (public.auth_owns_child(child_profile_id));

-- Child session can read its own permissions to determine what modes are available
CREATE POLICY "child_permissions_child_session_select"
  ON public.child_permissions FOR SELECT
  TO authenticated
  USING (child_profile_id = public.current_child_profile_id());

-- ---------------------------------------------------------------------------
-- 7. privacy_settings
-- ---------------------------------------------------------------------------
-- Sensitivity: MEDIUM — data retention and visibility policy per child
-- Governs HOW data is retained and WHO can see it (separate from behavioral
-- permissions). Aligns with COPPA data minimization requirements.
-- parent_visibility_tier: ADR-008 tiered visibility model.
-- evidence_retention_days: how long learning evidence is kept before purge.
-- session_log_retention_days: shorter window for session presence logs.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.privacy_settings (
  id                          uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id            uuid              NOT NULL UNIQUE REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  -- ADR-008: K-5 defaults to full; 6-8 defaults to summary
  parent_visibility_tier      visibility_tier   NOT NULL DEFAULT 'full',
  -- Minimum 90 days; maximum 6 years (portfolio support)
  evidence_retention_days     integer           NOT NULL DEFAULT 365
                                                CHECK (evidence_retention_days BETWEEN 90 AND 2190),
  session_log_retention_days  integer           NOT NULL DEFAULT 90
                                                CHECK (session_log_retention_days BETWEEN 30 AND 365),
  -- Parent has explicitly reviewed and acknowledged privacy settings
  parent_reviewed_at          timestamptz,
  created_at                  timestamptz       NOT NULL DEFAULT now(),
  updated_at                  timestamptz       NOT NULL DEFAULT now()
);

ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_settings FORCE ROW LEVEL SECURITY;

CREATE TRIGGER trg_privacy_settings_updated_at
  BEFORE UPDATE ON public.privacy_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS Policies
CREATE POLICY "privacy_settings_parent_select"
  ON public.privacy_settings FOR SELECT
  TO authenticated
  USING (public.auth_owns_child(child_profile_id));

CREATE POLICY "privacy_settings_parent_insert"
  ON public.privacy_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.auth_owns_child(child_profile_id));

CREATE POLICY "privacy_settings_parent_update"
  ON public.privacy_settings FOR UPDATE
  TO authenticated
  USING (public.auth_owns_child(child_profile_id))
  WITH CHECK (public.auth_owns_child(child_profile_id));

-- ---------------------------------------------------------------------------
-- 8. parent_consents
-- ---------------------------------------------------------------------------
-- Sensitivity: HIGH — COPPA consent audit trail
-- APPEND-ONLY. No UPDATE or DELETE policies — the absence of those policies is
-- the enforcement mechanism. Revocation = a new INSERT row with granted = false.
-- ip_address and user_agent retained for COPPA audit; never returned to UI or API.
-- consent_type enum mirrors ConsentTypeSchema from identity.schema.ts.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.parent_consents (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_account_id   uuid          NOT NULL REFERENCES public.parent_accounts(id) ON DELETE CASCADE,
  -- null = account-level consent (e.g. base COPPA data collection)
  child_profile_id    uuid          REFERENCES public.child_profiles(id) ON DELETE SET NULL,
  consent_type        consent_type  NOT NULL,
  granted             boolean       NOT NULL,
  granted_at          timestamptz   NOT NULL DEFAULT now(),
  -- Retained for COPPA audit. NEVER surfaced in any API response or UI.
  ip_address          inet,
  user_agent          text,
  -- Set when a prior consent row is superseded (not when this row is changed)
  revoked_at          timestamptz
);

ALTER TABLE public.parent_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_consents FORCE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_parent_consents_parent_account_id
  ON public.parent_consents (parent_account_id);

CREATE INDEX IF NOT EXISTS idx_parent_consents_child_profile_id
  ON public.parent_consents (child_profile_id);

-- Composite index: efficient lookup for "does consent X exist for parent Y + child Z?"
CREATE INDEX IF NOT EXISTS idx_parent_consents_lookup
  ON public.parent_consents (parent_account_id, child_profile_id, consent_type, granted);

-- RLS Policies
CREATE POLICY "parent_consents_parent_select"
  ON public.parent_consents FOR SELECT
  TO authenticated
  USING (parent_account_id = auth.uid());

-- Parent inserts consent rows when granting or when revoking (new row with granted=false)
CREATE POLICY "parent_consents_parent_insert"
  ON public.parent_consents FOR INSERT
  TO authenticated
  WITH CHECK (parent_account_id = auth.uid());

-- NO UPDATE POLICY — consent rows are immutable once written (COPPA audit chain).
-- NO DELETE POLICY — consent history is permanent.

-- ---------------------------------------------------------------------------
-- 9. trusted_devices
-- ---------------------------------------------------------------------------
-- Sensitivity: MEDIUM — device approval records for child PIN/avatar login
-- Parent-approved devices that allow child avatar/PIN login (ADR-031).
-- device_fingerprint_hash: fingerprint is hashed by Railway before storage.
-- pin_hash: PIN is hashed server-side; never stored plain anywhere.
-- revoked_at: set when parent revokes a device; null = still trusted.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.trusted_devices (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id        uuid        NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  parent_account_id       uuid        NOT NULL REFERENCES public.parent_accounts(id) ON DELETE CASCADE,
  -- Backend hashes the raw fingerprint before INSERT
  device_fingerprint_hash text        NOT NULL,
  -- Backend hashes the PIN before INSERT; raw PIN never leaves the client
  pin_hash                text        NOT NULL,
  nickname                text        CHECK (char_length(nickname) <= 50),
  approved_at             timestamptz NOT NULL DEFAULT now(),
  last_used_at            timestamptz,
  revoked_at              timestamptz,
  UNIQUE (child_profile_id, device_fingerprint_hash)
);

ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_devices FORCE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_trusted_devices_parent_account_id
  ON public.trusted_devices (parent_account_id);

CREATE INDEX IF NOT EXISTS idx_trusted_devices_child_profile_id
  ON public.trusted_devices (child_profile_id);

-- RLS Policies
CREATE POLICY "trusted_devices_parent_select"
  ON public.trusted_devices FOR SELECT
  TO authenticated
  USING (parent_account_id = auth.uid());

CREATE POLICY "trusted_devices_parent_insert"
  ON public.trusted_devices FOR INSERT
  TO authenticated
  WITH CHECK (parent_account_id = auth.uid());

-- Parent can revoke (set revoked_at) or rename (update nickname) a device
CREATE POLICY "trusted_devices_parent_update"
  ON public.trusted_devices FOR UPDATE
  TO authenticated
  USING (parent_account_id = auth.uid())
  WITH CHECK (parent_account_id = auth.uid());

-- No DELETE policy: revoke via revoked_at (preserves audit trail).
-- Service_role reads this for PIN + fingerprint verification — bypasses RLS by design.

-- ---------------------------------------------------------------------------
-- 10. child_sessions
-- ---------------------------------------------------------------------------
-- Sensitivity: MEDIUM — session audit trail; links child to academy identity
-- Sessions are CREATED by the Railway backend only (service_role INSERT).
-- MVP: child browser does NOT query Supabase directly. All child data flows
-- through the Railway API (backend-mediated child sessions).
-- The parent browser can SELECT child sessions for the session history view.
-- Child-facing RLS policies exist as defense-in-depth for a future phase
-- where child sessions may hold direct Supabase JWTs.
--
-- Session expiry (founder-approved June 2026):
--   expires_at: required NOT NULL. Railway sets at creation:
--     - parent-launched: +2 hours from started_at
--     - trusted-device PIN: +4 hours from started_at
--   revoked_at: nullable. Set by Railway when parent revokes an active session.
--   Backend rejects API requests for sessions where:
--     expires_at < now() OR revoked_at IS NOT NULL
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.child_sessions (
  id                    uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id      uuid                  NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  academy_identity_id   uuid                  NOT NULL REFERENCES public.academy_identities(id),
  entry_method          session_entry_method  NOT NULL,
  trusted_device_id     uuid                  REFERENCES public.trusted_devices(id) ON DELETE SET NULL,
  started_at            timestamptz           NOT NULL DEFAULT now(),
  -- expires_at: required. Railway provides the value on INSERT (no DEFAULT here).
  -- 2h for parent-launched, 4h for trusted-device PIN.
  expires_at            timestamptz           NOT NULL,
  -- revoked_at: set by Railway when parent terminates an active session.
  revoked_at            timestamptz,
  ended_at              timestamptz,
  current_room_id       text,
  -- Opaque Railway session reference for cross-system reconciliation; no PII
  railway_session_ref   text,

  -- OQ-A8-001: session token + launch metadata (added before first deploy)
  -- session_token: opaque token issued by Railway. NEVER equal to child_profile_id.
  -- Generated via crypto.randomUUID(). Child app uses this to authenticate API calls.
  session_token         text                  NOT NULL DEFAULT gen_random_uuid()::text UNIQUE,
  -- launch_mode: how the session was initiated. Scaffolds trusted_device_pin for Phase 1.
  launch_mode           text                  NOT NULL DEFAULT 'parent_launched'
                          CHECK (launch_mode IN ('parent_launched', 'trusted_device_pin')),
  -- launched_by: auth.users.id of the parent who initiated the session (audit trail).
  launched_by           text
);

ALTER TABLE public.child_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_sessions FORCE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_child_sessions_child_profile_id
  ON public.child_sessions (child_profile_id);

CREATE INDEX IF NOT EXISTS idx_child_sessions_started_at
  ON public.child_sessions (started_at DESC);

CREATE INDEX IF NOT EXISTS idx_child_sessions_expires_at
  ON public.child_sessions (expires_at)
  WHERE revoked_at IS NULL AND ended_at IS NULL; -- active session expiry lookup

-- OQ-A8-001: token lookup index — Railway verifies tokens on every child API call
CREATE INDEX IF NOT EXISTS child_sessions_token_idx
  ON public.child_sessions (session_token);

-- RLS Policies

-- Parent sees all sessions for their children
CREATE POLICY "child_sessions_parent_select"
  ON public.child_sessions FOR SELECT
  TO authenticated
  USING (public.auth_owns_child(child_profile_id));

-- Child session sees only its own active session row via JWT claim
CREATE POLICY "child_sessions_self_select"
  ON public.child_sessions FOR SELECT
  TO authenticated
  USING (id = public.current_child_session_id());

-- NO INSERT policy for authenticated role.
-- Sessions are INSERT-only via service_role (Railway).
-- The frontend cannot self-open a session row.

-- ---------------------------------------------------------------------------
-- Grants
-- Authenticated role gets table-level access; RLS controls rows.
-- Service_role has full access by default in Supabase (bypasses RLS).
-- No table in this migration is accessible to the anon role.
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE ON public.parent_accounts      TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.households           TO authenticated;
GRANT SELECT                 ON public.household_members    TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.child_profiles       TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.academy_identities   TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.child_permissions    TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.privacy_settings     TO authenticated;
GRANT SELECT, INSERT         ON public.parent_consents      TO authenticated; -- No UPDATE/DELETE
GRANT SELECT                 ON public.child_sessions       TO authenticated; -- No INSERT from client
GRANT SELECT, INSERT, UPDATE ON public.trusted_devices      TO authenticated;

-- Sequence grants for gen_random_uuid() tables
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMIT;
