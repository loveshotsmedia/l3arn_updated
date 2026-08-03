-- =============================================================================
-- L3ARN Migration 007 — Beta Operations: Beta Applications Table
-- =============================================================================
-- Domain: GTM / Beta Ops (public-facing acquisition; no child data)
-- Tables: beta_applications
--
-- Grounded in:
--   docs/CONTEXT.md §8 (GTM + Positioning), §9 (Beta Launch Sequencing)
--   docs/agent_operating_rules.md (Provisional Decisions: beta applicant scoring)
--   ADR-034 (beta-cohort-model)
--   ADR-040 (beta-application)
--   ADR-041 (beta-scoring)
--   Agent 12 spec: docs/superpowers/plans/agent-12-gtm-beta-ops.md
--
-- RLS Design:
--   - NO public read or update (anon and authenticated roles cannot read)
--   - service_role INSERT only (Next.js Server Action uses SUPABASE_SERVICE_ROLE_KEY)
--   - Founder reads all rows via service_role (Supabase dashboard / admin scripts)
--   - No child data, no raw PII beyond email + first_name
--
-- Fit Score:
--   Computed server-side only in the Server Action (apps/web/src/app/apply/actions.ts).
--   Never computed client-side. Score is stored in fit_score column.
--
-- Privacy:
--   No child names, birthdates, legal names, or school records stored here.
--   grade_levels is an array of grade-band strings (e.g. ['K', '2', '5']) —
--   no child identity attached.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. beta_applications
-- ---------------------------------------------------------------------------
-- Sensitivity: MEDIUM — applicant PII (email, first name) + program fit data
-- No child PII stored here. grade_levels are parent-reported family data only.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.beta_applications (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Contact / identity (PII)
  email                   TEXT          NOT NULL,
  first_name              TEXT          NOT NULL,
  -- Application questions
  child_count             INTEGER       CHECK (child_count >= 0),
  grade_levels            TEXT[],       -- e.g. ARRAY['K', '2', '5'] — no child identity
  family_type             TEXT          CHECK (family_type IN (
                                          'full-time-homeschool',
                                          'hybrid',
                                          'afterschool-enrichment',
                                          'microschool',
                                          'co-op-pod'
                                        )),
  teaching_style          TEXT          CHECK (teaching_style IN (
                                          'structured',
                                          'flexible',
                                          'eclectic',
                                          'still-figuring-it-out'
                                        )),
  ai_curiosity_score      INTEGER       CHECK (ai_curiosity_score BETWEEN 1 AND 5),
  current_subjects        TEXT,         -- free-text, short
  biggest_challenge       TEXT,         -- free-text, short
  three_d_excitement      INTEGER       CHECK (three_d_excitement BETWEEN 1 AND 5),
  inner_circle_willing    TEXT          CHECK (inner_circle_willing IN ('yes', 'maybe', 'no')),
  referral_source         TEXT,
  -- Scoring and review (founder-only)
  fit_score               INTEGER       CHECK (fit_score BETWEEN 0 AND 100),
  inner_circle_candidate  BOOLEAN       NOT NULL DEFAULT false,
  status                  TEXT          NOT NULL DEFAULT 'pending-review'
                                        CHECK (status IN (
                                          'pending-review',
                                          'accepted-founding',
                                          'accepted-inner-circle',
                                          'waitlisted',
                                          'declined'
                                        )),
  reviewed_by             TEXT,         -- founder identifier (not a FK — founder may not have a parent_account)
  reviewed_at             TIMESTAMPTZ,
  review_notes            TEXT,
  -- Timestamps
  submitted_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- UNIQUE constraint on email: blocks duplicate submissions
  CONSTRAINT beta_applications_email_unique UNIQUE (email)
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.beta_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_applications FORCE ROW LEVEL SECURITY;

-- NO SELECT policy for authenticated or anon roles.
-- service_role bypasses RLS by default in Supabase — founder reads via dashboard
-- or admin scripts using SUPABASE_SERVICE_ROLE_KEY.

-- NO authenticated read: applicants cannot look up their own or others' applications.
-- This prevents enumeration attacks and protects applicant data.

-- NO anon read: public internet cannot query this table at all.

-- The Server Action uses the service_role client (SUPABASE_SERVICE_ROLE_KEY)
-- for INSERT. The service_role bypasses RLS, so no INSERT policy is needed for
-- the server action path. We add an explicit anon INSERT block to be safe.

-- Explicit DENY for anon and authenticated SELECT/INSERT/UPDATE/DELETE:
-- (In Supabase, when RLS is enabled with no matching policy, the default is DENY.
-- We rely on this default and do NOT add any permissive policies for anon or authenticated.)

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Primary lookup for founder review queue
CREATE INDEX IF NOT EXISTS idx_beta_applications_status
  ON public.beta_applications (status, submitted_at DESC);

-- Index for fit score ranking
CREATE INDEX IF NOT EXISTS idx_beta_applications_fit_score
  ON public.beta_applications (fit_score DESC NULLS LAST);

-- Index for inner circle candidates
CREATE INDEX IF NOT EXISTS idx_beta_applications_inner_circle
  ON public.beta_applications (inner_circle_candidate)
  WHERE inner_circle_candidate = true;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
-- No grants to anon or authenticated roles for this table.
-- service_role has full access by default in Supabase (bypasses RLS).
-- authenticated role gets NO access — RLS default DENY applies.
-- ---------------------------------------------------------------------------

-- Explicitly revoke all on anon and authenticated to make intent clear:
REVOKE ALL ON public.beta_applications FROM anon;
REVOKE ALL ON public.beta_applications FROM authenticated;

COMMIT;
