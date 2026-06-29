-- =============================================================================
-- L3ARN Migration 006 — Founder Mission Control
-- =============================================================================
-- Domain: Network / Safety (Admin Operations)
-- Tables: audit_logs, safety_escalations, founder_sessions
--
-- Grounded in:
--   agent-11-founder-mission-control.md
--   ADR-048 (Founder Mission Control — provisional)
--   ADR-049 (Admin Access Model — provisional)
--   ADR-047 (Kill Switch Authority — amended June 2026)
--   supabase_schema.md §Network / Safety domain
--   agent_operating_rules.md (Founder Mission Control section)
--
-- RLS Design:
--   audit_logs        — service_role INSERT; founder SELECT; NO UPDATE; NO DELETE
--   safety_escalations — service_role INSERT; founder SELECT/UPDATE; no parent/child
--   founder_sessions   — service_role only
--
-- Security invariants enforced here:
--   - audit_logs is append-only (no UPDATE or DELETE policy on any role)
--   - No parent or child role can read any row in these tables
--   - safety_escalations.violation_summary holds de-identified summaries only
--     (no raw AI output, no raw chat content, no legal PII)
--   - The `founder` role check uses the admin_users table (see section 4b below).
--     NEXT_PUBLIC_FOUNDER_EMAILS email-list check was removed (OQ-A11-001 resolved).
--
-- IMPORTANT: The `founder` role referenced in comments below is NOT a Postgres
-- role. It is enforced at the application layer (Next.js Server Component +
-- admin_users table lookup via service_role). See apps/web/src/lib/admin-auth.ts.
-- Supabase RLS on these tables grants access to `service_role` only — the admin
-- dashboard reads via service_role on the server.
-- No authenticated parent or child JWT ever has SELECT on these tables.
--
-- Migration sequencing note:
--   Migrations 004 and 005 are reserved (world-state and chat/safety).
--   This migration is 006 per the canonical migration map override
--   (canonical name: 006_founder_mission_control.sql).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. audit_logs (append-only event trail for admin/founder actions)
-- ---------------------------------------------------------------------------
-- NOTE: A `security_audit_events` table already exists in Migration 003 for
-- core child data events and sensitive service_role writes. This table covers
-- admin console actions, kill-switch invocations, containment events, and
-- Founder Mission Control review actions — per OQ-002 resolution in
-- supabase_schema.md (two-layer audit architecture).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What happened
  event_type    TEXT NOT NULL,
  -- Examples: "kill-switch-invoked", "containment-triggered",
  --           "admin-access", "visibility-override", "child-profile-modified"

  -- Who did it
  actor_role    TEXT NOT NULL,
  -- Examples: "founder", "service-role", "safety-containment"

  actor_id      TEXT,
  -- founder auth.users.id, or service name for automated events (e.g. "safety-containment")

  -- What was affected
  target_type   TEXT,
  -- Examples: "child_profile", "session", "household", "safety_escalation"

  target_id     UUID,
  -- UUID of the affected entity

  -- Why (required for founder actions on child/parent data per ADR-049)
  justification TEXT,

  -- De-identified event payload — NO raw PII, NO raw AI output
  payload_json  JSONB,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()

  -- NO updated_at — this table is append-only by design
);

-- Enforce append-only at the policy level (see RLS section below).
-- No UPDATE or DELETE policies are created. Any attempt to UPDATE or DELETE
-- will be blocked by the default-deny RLS posture.

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Index for dashboard queries (last 50, ordered by created_at DESC)
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx
  ON public.audit_logs (created_at DESC);

-- Index for filtering by event_type (kill-switch queries)
CREATE INDEX IF NOT EXISTS audit_logs_event_type_idx
  ON public.audit_logs (event_type);

-- Index for filtering by actor_id (founder-specific action views)
CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx
  ON public.audit_logs (actor_id);

-- ---------------------------------------------------------------------------
-- 2. safety_escalations (S3/S4 events requiring founder review)
-- ---------------------------------------------------------------------------
-- Contains de-identified safety events only. No raw AI output, no raw chat
-- content, no legal name, no parent email, no household address.
-- child_profile_id is a UUID reference — never joined to legal PII in this table.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.safety_escalations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Child reference (UUID only — never legal name or other PII)
  child_profile_id        UUID NOT NULL,
  -- FK to child_profiles.id — enforced below after table creation
  -- (FK is intentionally a soft reference here; child_profiles is in Migration 001
  --  and the FK can be added if the migrations run in order)

  -- Session reference (UUID only — no session content)
  session_id              UUID,

  -- Severity tier
  severity                TEXT NOT NULL CHECK (severity IN ('S3', 'S4')),

  -- What triggered the containment
  trigger_source          TEXT NOT NULL CHECK (trigger_source IN (
                            'user-input',
                            'ai-output',
                            'companion-response'
                          )),

  -- Actions taken automatically by the safety containment system
  containment_actions     TEXT[] NOT NULL,
  -- Examples: ["block-content", "end-session"]

  -- De-identified summary: rule names + sanitized excerpt only
  -- NO raw AI output. NO raw chat content. NO legal name. NO email.
  violation_summary       TEXT NOT NULL,

  -- Review status lifecycle
  status                  TEXT NOT NULL DEFAULT 'pending-review'
                          CHECK (status IN (
                            'pending-review',
                            'reviewed-resolved',
                            'reviewed-escalated',
                            'false-positive'
                          )),

  -- Founder review fields
  reviewed_by             TEXT,     -- founder user ID (from auth.users.id or email)
  reviewed_at             TIMESTAMPTZ,
  review_notes            TEXT,     -- required when status changes from pending-review

  -- Founder review gate — always true for S3/S4 per ADR-047 amendment
  requires_founder_review BOOLEAN NOT NULL DEFAULT true,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.safety_escalations ENABLE ROW LEVEL SECURITY;

-- Auto-update updated_at on review actions (the one case where UPDATE is allowed)
-- Uses the shared set_updated_at() trigger function from Migration 001.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_safety_escalations'
  ) THEN
    CREATE TRIGGER set_updated_at_safety_escalations
      BEFORE UPDATE ON public.safety_escalations
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;

-- Indexes for dashboard queries
CREATE INDEX IF NOT EXISTS safety_escalations_status_idx
  ON public.safety_escalations (status)
  WHERE status = 'pending-review';

CREATE INDEX IF NOT EXISTS safety_escalations_created_at_idx
  ON public.safety_escalations (created_at DESC);

CREATE INDEX IF NOT EXISTS safety_escalations_severity_idx
  ON public.safety_escalations (severity);

CREATE INDEX IF NOT EXISTS safety_escalations_child_profile_idx
  ON public.safety_escalations (child_profile_id);

-- ---------------------------------------------------------------------------
-- 3. founder_sessions (admin session tracking)
-- ---------------------------------------------------------------------------
-- Tracks founder dashboard sessions for audit and session timeout enforcement.
-- Service role only — never accessible to parent or child roles.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.founder_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_user_id     TEXT NOT NULL,
  -- auth.users.id of the founder; TEXT to support future OIDC/non-Supabase auth
  session_token_hash  TEXT NOT NULL UNIQUE,
  -- hashed session token — raw token is never stored
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at          TIMESTAMPTZ NOT NULL,
  last_used_at        TIMESTAMPTZ,
  revoked_at          TIMESTAMPTZ
);

ALTER TABLE public.founder_sessions ENABLE ROW LEVEL SECURITY;

-- Index for active session lookups
CREATE INDEX IF NOT EXISTS founder_sessions_token_hash_idx
  ON public.founder_sessions (session_token_hash);

CREATE INDEX IF NOT EXISTS founder_sessions_founder_user_id_idx
  ON public.founder_sessions (founder_user_id);

-- ---------------------------------------------------------------------------
-- 4. RLS Policies
-- ---------------------------------------------------------------------------
--
-- Security model:
--   - These tables are service_role-only for all production access.
--   - The Founder Mission Control dashboard reads these via service_role in
--     Next.js Server Components (never via the browser client or anon key).
--   - No authenticated parent JWT has any policy on these tables.
--   - No child session JWT has any policy on these tables.
--   - No anon role has any policy on these tables.
--
-- Append-only enforcement for audit_logs:
--   Only INSERT is allowed. No UPDATE. No DELETE. Period.
--
-- ---------------------------------------------------------------------------

-- ── audit_logs ────────────────────────────────────────────────────────────────

-- Service role may insert audit records
CREATE POLICY "audit_logs_service_role_insert"
  ON public.audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Service role may select audit records (for dashboard reads via server component)
CREATE POLICY "audit_logs_service_role_select"
  ON public.audit_logs
  FOR SELECT
  TO service_role
  USING (true);

-- NO UPDATE policy — audit_logs is append-only (enforced by absence of policy)
-- NO DELETE policy — audit_logs is append-only (enforced by absence of policy)
-- Authenticated role (parent/child JWT): no policy → blocked by default-deny RLS
-- Anon role: no policy → blocked by default-deny RLS

-- ── safety_escalations ───────────────────────────────────────────────────────

-- Service role may insert safety escalation records (from Railway containment)
CREATE POLICY "safety_escalations_service_role_insert"
  ON public.safety_escalations
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Service role may select all escalations (for dashboard reads)
CREATE POLICY "safety_escalations_service_role_select"
  ON public.safety_escalations
  FOR SELECT
  TO service_role
  USING (true);

-- Service role may update (for "Mark Reviewed" action from dashboard)
-- The dashboard writes reviewed_by, reviewed_at, review_notes, status via service_role.
CREATE POLICY "safety_escalations_service_role_update"
  ON public.safety_escalations
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- NO DELETE policy — safety records must be retained for compliance audit trail
-- Authenticated role (parent/child JWT): no policy → blocked by default-deny RLS
-- Anon role: no policy → blocked by default-deny RLS

-- ── founder_sessions ─────────────────────────────────────────────────────────

-- Service role only — full CRUD for session management
CREATE POLICY "founder_sessions_service_role_all"
  ON public.founder_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated role: no policy → blocked by default-deny RLS
-- Anon role: no policy → blocked by default-deny RLS

-- ---------------------------------------------------------------------------
-- 4b. admin_users (source of truth for admin role authorization)
-- ---------------------------------------------------------------------------
-- Replaces NEXT_PUBLIC_FOUNDER_EMAILS email-list check from Phase 1.
-- All admin role authorization must use this table server-side via service_role.
-- No authenticated JWT (parent, child, or anon) ever has SELECT on this table.
-- email column is display-only — authorization is based on user_id (auth.users.id).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admin_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL UNIQUE,  -- references auth.users.id
  email       TEXT NOT NULL,         -- display only, NOT authorization source
  role        TEXT NOT NULL CHECK (role IN (
                'founder',
                'safety_admin',
                'support_admin',
                'curriculum_admin',
                'technical_admin',
                'ai_agent_operator'
              )),
  granted_by  TEXT,                  -- admin user_id who granted this role
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at  TIMESTAMPTZ,
  notes       TEXT
);

CREATE INDEX IF NOT EXISTS admin_users_user_id_idx ON public.admin_users(user_id);
CREATE INDEX IF NOT EXISTS admin_users_role_idx ON public.admin_users(role);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users FORCE ROW LEVEL SECURITY;

-- Only service_role can read/write admin_users — no authenticated client access
-- No INSERT, SELECT, UPDATE, or DELETE policies for authenticated or anon roles.
-- The default-deny RLS posture blocks all non-service-role access.

COMMENT ON TABLE public.admin_users IS
  'Source of truth for admin role authorization. '
  'Read/write via service_role only. '
  'email column is display-only — authorization is based on user_id. '
  'Replaces NEXT_PUBLIC_FOUNDER_EMAILS email-list check (Phase 1 → Wave 1). '
  'Migration: 006_founder_mission_control.sql';

COMMENT ON COLUMN public.admin_users.email IS
  'Display-only. NOT used for authorization. Authorization key is user_id.';

COMMENT ON COLUMN public.admin_users.revoked_at IS
  'Non-null = this admin role has been revoked. Soft-delete pattern — never hard-delete.';

-- ---------------------------------------------------------------------------
-- 5. Comments (for schema documentation in Supabase dashboard)
-- ---------------------------------------------------------------------------

COMMENT ON TABLE public.audit_logs IS
  'Append-only admin audit trail. Covers kill-switch invocations, containment events, '
  'admin-access logs, and Founder Mission Control review actions. '
  'NO raw PII — de-identified event data only. '
  'Companion table to security_audit_events (Migration 003) per OQ-002 resolution. '
  'Migration: 006_founder_mission_control.sql';

COMMENT ON TABLE public.safety_escalations IS
  'S3/S4 safety events requiring founder review. '
  'Contains de-identified violation summaries only — NO raw AI output, '
  'NO raw chat content, NO legal name, NO parent email, NO household address. '
  'child_profile_id is a UUID reference only. '
  'Migration: 006_founder_mission_control.sql';

COMMENT ON TABLE public.founder_sessions IS
  'Founder admin session tracking. Service role only. '
  'session_token_hash stores hash of session token — raw token is never stored. '
  'Migration: 006_founder_mission_control.sql';

COMMENT ON COLUMN public.audit_logs.payload_json IS
  'De-identified event payload. Must NOT contain legal name, DOB, email, '
  'address, raw AI output, or raw chat content. Contains: event metadata, '
  'action codes, UUID references, and sanitized excerpts only.';

COMMENT ON COLUMN public.safety_escalations.violation_summary IS
  'De-identified violation summary. Contains rule names and sanitized excerpt '
  'references only. No raw AI output. No raw chat content. No legal PII.';

COMMIT;
