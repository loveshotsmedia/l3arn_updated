-- =============================================================================
-- L3ARN Migration 009 — Guarantee service_role privileges on public schema
-- =============================================================================
-- Domain: Platform / Grants
--
-- Why this migration exists:
--   The backend (Railway ai-workers) connects as `service_role` for every
--   read/write. Migrations 001–008 GRANT to `authenticated` explicitly but rely
--   on Supabase's IMPLICIT default privileges to cover `service_role`. Supabase
--   Cloud applies those defaults automatically, but a clean local CLI stack /
--   CI / self-hosted Postgres does NOT — leaving service_role with only
--   TRUNCATE/REFERENCES/TRIGGER and no SELECT/INSERT/UPDATE/DELETE. That makes
--   the whole backend return "permission denied for table …" on a fresh DB.
--
--   This migration makes the grant EXPLICIT so the backend works identically in
--   every environment. It is idempotent and a no-op where the grants already
--   exist (e.g. Supabase Cloud).
--
-- Safety:
--   service_role is the trusted server-side role and already bypasses RLS; it is
--   never exposed to the browser. Granting it DML on public tables changes no
--   trust boundary — it only removes reliance on implicit defaults.
--
-- Grounded in: ADR-031 (backend-mediated writes via service_role),
--   verified during Hero Slice Phase A acceptance (local stack lacked these).
-- =============================================================================

BEGIN;

GRANT USAGE ON SCHEMA public TO service_role;

-- Cover every existing public table/sequence (migrations 001–008).
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Cover tables/sequences created by future migrations run as this role.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;

COMMIT;
