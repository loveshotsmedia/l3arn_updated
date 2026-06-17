-- =============================================================================
-- L3ARN Migration 002 — Curriculum & Mastery Spine
-- =============================================================================
-- Domain: Curriculum Spine
-- Tables: mastery_domains, mastery_skills, skill_prerequisites, standards,
--         standard_skill_mappings, mission_patterns, rubric_templates,
--         ai_literacy_skills, evidence_templates
--
-- Grounded in:
--   MASTER_HANDOFF §6 (Mission Compiler), §10 (data model — Curriculum Spine)
--   ADR-013 (standards model: L3ARN Mastery Map + Florida K-8 standards)
--   ADR-014 (mission compiler constraint: three-part required)
--   ADR-021 (curriculum grounding layer: every mission traceable)
--   ADR-022 (knowledge base v1: Mastery Map, Florida standards, mission patterns,
--             evidence rubrics, AI overlay, parent-material rules)
--   ADR-024 (first hero mission: Repair the Sorting Computer)
--   ADR-025 (benchmarking: Florida + L3ARN internal mastery in v1)
--   shared_contracts_spec.md Contract 2 (Mission Contract)
--
-- RLS Design:
--   supabase_rls_policy_plan.md §Migration 002
--
-- ACCESS RULES:
--   - NO authenticated or anon client reads any table in this migration.
--   - All reads happen via Railway API using the service_role key.
--   - INSERT/UPDATE is restricted to the l3arn_curriculum_admin role.
--   - No DELETE policy: deprecated skills use is_active = false.
--   - All curriculum writes are recorded in audit_logs (Migration 008).
--
-- REQUIRES:
--   Migration 001 must have run (grade_level type must exist).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Role: l3arn_curriculum_admin
-- Granted manually to trusted admin accounts. Never granted to application
-- service accounts or the authenticated role.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'l3arn_curriculum_admin') THEN
    CREATE ROLE l3arn_curriculum_admin NOLOGIN;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Types (curriculum-specific)
-- ---------------------------------------------------------------------------

CREATE TYPE IF NOT EXISTS public.mastery_level AS ENUM (
  'emerging',
  'developing',
  'proficient',
  'advanced'
);

CREATE TYPE IF NOT EXISTS public.standards_source AS ENUM (
  'florida-cpalms',   -- Official Florida K-8 standards (ADR-025)
  'l3arn-internal',   -- L3ARN Mastery Map standards
  'ccss',             -- Common Core (future)
  'ngss'              -- Next Gen Science Standards (future)
);

CREATE TYPE IF NOT EXISTS public.mission_output_type AS ENUM (
  'parent-plan',
  'student-3d-mission',
  'student-interactive-lite',
  'student-text-audio-offline',
  'evidence-plan',
  'reward-plan'
);

CREATE TYPE IF NOT EXISTS public.evidence_capture_type AS ENUM (
  'decision-log',
  'sequence-completion',
  'ai-mistake-check',
  'explanation',
  'reflection',
  'artifact-upload',
  'audio-response',         -- push-to-talk only (ADR-027)
  'structured-replay',
  'screenshot'              -- no face/webcam data (ADR-026)
);

-- ---------------------------------------------------------------------------
-- 1. mastery_domains
-- Top-level learning domains. The root of the L3ARN Mastery Map (ADR-022).
-- Examples: Literacy, Mathematics, Science, AI Literacy, Arts, Social Studies.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.mastery_domains (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text    NOT NULL UNIQUE CHECK (code ~ '^[A-Z][A-Z0-9_]{1,29}$'),
  name            text    NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  description     text,
  display_order   integer NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  -- Metadata for future AI overlay and curriculum versioning (ADR-022)
  version         integer NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mastery_domains ENABLE ROW LEVEL SECURITY;
-- No SELECT for authenticated or anon — service_role only
-- No INSERT/UPDATE for authenticated — l3arn_curriculum_admin only

CREATE TRIGGER trg_mastery_domains_updated_at
  BEFORE UPDATE ON public.mastery_domains
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "mastery_domains_curriculum_admin_insert"
  ON public.mastery_domains FOR INSERT
  TO l3arn_curriculum_admin
  WITH CHECK (true);

CREATE POLICY "mastery_domains_curriculum_admin_update"
  ON public.mastery_domains FOR UPDATE
  TO l3arn_curriculum_admin
  USING (true)
  WITH CHECK (true);

-- No SELECT policy for authenticated/anon (denied by default).
-- No DELETE policy (use is_active = false).

GRANT SELECT ON public.mastery_domains TO l3arn_curriculum_admin;
GRANT INSERT, UPDATE ON public.mastery_domains TO l3arn_curriculum_admin;

-- ---------------------------------------------------------------------------
-- 2. mastery_skills
-- Individual skills within a domain.
-- Each skill carries grade band, mastery level targets, and metadata for
-- Mission Compiler grounding (ADR-021) and Florida standards mapping (ADR-013).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.mastery_skills (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id           uuid          NOT NULL REFERENCES public.mastery_domains(id),
  code                text          NOT NULL UNIQUE CHECK (code ~ '^[A-Z][A-Z0-9_.]{1,49}$'),
  name                text          NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  description         text          NOT NULL,
  -- Grade band this skill is appropriate for
  grade_band_min      grade_level   NOT NULL,
  grade_band_max      grade_level   NOT NULL,
  -- Mastery target level for this skill at proficiency
  proficiency_level   mastery_level NOT NULL DEFAULT 'proficient',
  -- For Mission Compiler: what evidence demonstrates mastery (ADR-021)
  mastery_evidence_descriptor text  NOT NULL,
  -- For parent-facing reports: plain-language skill name
  parent_friendly_name text         NOT NULL,
  -- AI Literacy overlay flag (ADR-022: ai literacy overlay)
  is_ai_literacy      boolean       NOT NULL DEFAULT false,
  display_order       integer       NOT NULL DEFAULT 0,
  is_active           boolean       NOT NULL DEFAULT true,
  version             integer       NOT NULL DEFAULT 1,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.mastery_skills ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_mastery_skills_domain_id
  ON public.mastery_skills (domain_id);

CREATE INDEX IF NOT EXISTS idx_mastery_skills_grade_band
  ON public.mastery_skills (grade_band_min, grade_band_max);

CREATE INDEX IF NOT EXISTS idx_mastery_skills_is_active
  ON public.mastery_skills (is_active) WHERE is_active = true;

CREATE TRIGGER trg_mastery_skills_updated_at
  BEFORE UPDATE ON public.mastery_skills
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "mastery_skills_curriculum_admin_insert"
  ON public.mastery_skills FOR INSERT
  TO l3arn_curriculum_admin
  WITH CHECK (true);

CREATE POLICY "mastery_skills_curriculum_admin_update"
  ON public.mastery_skills FOR UPDATE
  TO l3arn_curriculum_admin
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.mastery_skills TO l3arn_curriculum_admin;
GRANT INSERT, UPDATE ON public.mastery_skills TO l3arn_curriculum_admin;

-- ---------------------------------------------------------------------------
-- 3. skill_prerequisites
-- Directed prerequisite edges between mastery skills.
-- The Mission Compiler uses this graph to sequence learning paths (ADR-021).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.skill_prerequisites (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id          uuid    NOT NULL REFERENCES public.mastery_skills(id) ON DELETE CASCADE,
  prerequisite_id   uuid    NOT NULL REFERENCES public.mastery_skills(id) ON DELETE CASCADE,
  -- soft = "helpful to have"; hard = "required before attempting"
  strength          text    NOT NULL DEFAULT 'soft'
                            CHECK (strength IN ('soft', 'hard')),
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (skill_id, prerequisite_id),
  -- A skill cannot be its own prerequisite
  CHECK (skill_id <> prerequisite_id)
);

ALTER TABLE public.skill_prerequisites ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_skill_prerequisites_skill_id
  ON public.skill_prerequisites (skill_id);

CREATE INDEX IF NOT EXISTS idx_skill_prerequisites_prerequisite_id
  ON public.skill_prerequisites (prerequisite_id);

CREATE POLICY "skill_prerequisites_curriculum_admin_insert"
  ON public.skill_prerequisites FOR INSERT
  TO l3arn_curriculum_admin
  WITH CHECK (true);

CREATE POLICY "skill_prerequisites_curriculum_admin_update"
  ON public.skill_prerequisites FOR UPDATE
  TO l3arn_curriculum_admin
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.skill_prerequisites TO l3arn_curriculum_admin;
GRANT INSERT, UPDATE ON public.skill_prerequisites TO l3arn_curriculum_admin;

-- ---------------------------------------------------------------------------
-- 4. standards
-- Florida CPALMS and L3ARN internal mastery standards. (ADR-013, ADR-025)
-- v1 reports support Florida + L3ARN internal mastery only.
-- Schema is designed to support national/global standards later (ADR-025).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.standards (
  id              uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  source          standards_source  NOT NULL,
  code            text              NOT NULL,
  grade_level     grade_level       NOT NULL,
  subject_area    text              NOT NULL CHECK (char_length(subject_area) BETWEEN 1 AND 100),
  strand          text,
  description     text              NOT NULL,
  -- Parent-facing plain language version
  plain_description text,
  is_active       boolean           NOT NULL DEFAULT true,
  version         integer           NOT NULL DEFAULT 1,
  created_at      timestamptz       NOT NULL DEFAULT now(),
  updated_at      timestamptz       NOT NULL DEFAULT now(),
  UNIQUE (source, code, grade_level)
);

ALTER TABLE public.standards ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_standards_source_grade
  ON public.standards (source, grade_level);

CREATE INDEX IF NOT EXISTS idx_standards_subject
  ON public.standards (subject_area);

CREATE INDEX IF NOT EXISTS idx_standards_active
  ON public.standards (is_active) WHERE is_active = true;

CREATE TRIGGER trg_standards_updated_at
  BEFORE UPDATE ON public.standards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "standards_curriculum_admin_insert"
  ON public.standards FOR INSERT
  TO l3arn_curriculum_admin
  WITH CHECK (true);

CREATE POLICY "standards_curriculum_admin_update"
  ON public.standards FOR UPDATE
  TO l3arn_curriculum_admin
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.standards TO l3arn_curriculum_admin;
GRANT INSERT, UPDATE ON public.standards TO l3arn_curriculum_admin;

-- ---------------------------------------------------------------------------
-- 5. standard_skill_mappings
-- Maps Florida CPALMS standards to L3ARN mastery skills. (ADR-013)
-- A standard can map to multiple skills; a skill can map to multiple standards.
-- The Mission Compiler uses this to generate Florida-traceable evidence. (ADR-021)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.standard_skill_mappings (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id     uuid    NOT NULL REFERENCES public.standards(id) ON DELETE CASCADE,
  skill_id        uuid    NOT NULL REFERENCES public.mastery_skills(id) ON DELETE CASCADE,
  -- primary = this standard is the main alignment; supporting = contextual coverage
  alignment_type  text    NOT NULL DEFAULT 'primary'
                          CHECK (alignment_type IN ('primary', 'supporting')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (standard_id, skill_id)
);

ALTER TABLE public.standard_skill_mappings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_standard_skill_mappings_standard_id
  ON public.standard_skill_mappings (standard_id);

CREATE INDEX IF NOT EXISTS idx_standard_skill_mappings_skill_id
  ON public.standard_skill_mappings (skill_id);

CREATE POLICY "standard_skill_mappings_curriculum_admin_insert"
  ON public.standard_skill_mappings FOR INSERT
  TO l3arn_curriculum_admin
  WITH CHECK (true);

CREATE POLICY "standard_skill_mappings_curriculum_admin_update"
  ON public.standard_skill_mappings FOR UPDATE
  TO l3arn_curriculum_admin
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.standard_skill_mappings TO l3arn_curriculum_admin;
GRANT INSERT, UPDATE ON public.standard_skill_mappings TO l3arn_curriculum_admin;

-- ---------------------------------------------------------------------------
-- 6. mission_patterns
-- Reusable scaffolding templates used by the Mission Compiler. (ADR-022)
-- Every instructional mission must be grounded in a traceable pattern. (ADR-021)
-- Patterns define the structural shape of a mission class — not the content.
-- Content is generated by the Mission Compiler using the three-part constraint.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.mission_patterns (
  id                    uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  text              NOT NULL UNIQUE CHECK (code ~ '^[A-Z][A-Z0-9_]{1,49}$'),
  name                  text              NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  description           text              NOT NULL,
  -- Which delivery modes this pattern supports (ADR-016, ADR-017)
  supported_modes       delivery_mode[]   NOT NULL DEFAULT ARRAY['3d', 'interactive-lite', 'text-audio-offline']::delivery_mode[],
  -- Grade band suitability
  grade_band_min        grade_level       NOT NULL,
  grade_band_max        grade_level       NOT NULL,
  -- Domain focus (optional: null = domain-agnostic, ADR-015)
  primary_domain_id     uuid              REFERENCES public.mastery_domains(id),
  -- Estimated mission duration in minutes
  estimated_duration_min integer          NOT NULL CHECK (estimated_duration_min BETWEEN 5 AND 120),
  -- Step structure template stored as JSONB
  -- Schema: { steps: [{ id, type, instructions, evidence_required }] }
  step_template         jsonb             NOT NULL DEFAULT '{"steps": []}',
  -- Which evidence capture types this pattern uses by default (ADR-026)
  default_evidence_types evidence_capture_type[] NOT NULL DEFAULT '{}',
  -- Parent-material rules flags (ADR-022: parent-material rules in knowledge base)
  requires_parent_approval boolean        NOT NULL DEFAULT false,
  parent_preview_notes  text,
  is_active             boolean           NOT NULL DEFAULT true,
  version               integer           NOT NULL DEFAULT 1,
  created_at            timestamptz       NOT NULL DEFAULT now(),
  updated_at            timestamptz       NOT NULL DEFAULT now()
);

ALTER TABLE public.mission_patterns ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_mission_patterns_grade_band
  ON public.mission_patterns (grade_band_min, grade_band_max);

CREATE INDEX IF NOT EXISTS idx_mission_patterns_domain_id
  ON public.mission_patterns (primary_domain_id);

CREATE INDEX IF NOT EXISTS idx_mission_patterns_active
  ON public.mission_patterns (is_active) WHERE is_active = true;

CREATE TRIGGER trg_mission_patterns_updated_at
  BEFORE UPDATE ON public.mission_patterns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "mission_patterns_curriculum_admin_insert"
  ON public.mission_patterns FOR INSERT
  TO l3arn_curriculum_admin
  WITH CHECK (true);

CREATE POLICY "mission_patterns_curriculum_admin_update"
  ON public.mission_patterns FOR UPDATE
  TO l3arn_curriculum_admin
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.mission_patterns TO l3arn_curriculum_admin;
GRANT INSERT, UPDATE ON public.mission_patterns TO l3arn_curriculum_admin;

-- ---------------------------------------------------------------------------
-- 7. rubric_templates
-- Mastery evidence rubrics. The Mission Compiler references these when
-- building the evidence_plan output (ADR-016, ADR-026).
-- A rubric defines what evidence at each mastery level looks like.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.rubric_templates (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  code                text          NOT NULL UNIQUE CHECK (code ~ '^[A-Z][A-Z0-9_]{1,49}$'),
  name                text          NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  skill_id            uuid          NOT NULL REFERENCES public.mastery_skills(id),
  -- Evidence criteria at each mastery level
  -- Schema: { emerging: "...", developing: "...", proficient: "...", advanced: "..." }
  criteria            jsonb         NOT NULL,
  -- What the Mission Compiler needs: minimum mastery level to consider a mission complete
  passing_level       mastery_level NOT NULL DEFAULT 'developing',
  -- Evidence types that this rubric can assess (ADR-026)
  applicable_evidence_types evidence_capture_type[] NOT NULL DEFAULT '{}',
  -- Retention period for evidence evaluated by this rubric (days)
  evidence_retention_days integer   NOT NULL DEFAULT 365
                                    CHECK (evidence_retention_days BETWEEN 90 AND 2190),
  is_active           boolean       NOT NULL DEFAULT true,
  version             integer       NOT NULL DEFAULT 1,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.rubric_templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_rubric_templates_skill_id
  ON public.rubric_templates (skill_id);

CREATE TRIGGER trg_rubric_templates_updated_at
  BEFORE UPDATE ON public.rubric_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "rubric_templates_curriculum_admin_insert"
  ON public.rubric_templates FOR INSERT
  TO l3arn_curriculum_admin
  WITH CHECK (true);

CREATE POLICY "rubric_templates_curriculum_admin_update"
  ON public.rubric_templates FOR UPDATE
  TO l3arn_curriculum_admin
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.rubric_templates TO l3arn_curriculum_admin;
GRANT INSERT, UPDATE ON public.rubric_templates TO l3arn_curriculum_admin;

-- ---------------------------------------------------------------------------
-- 8. ai_literacy_skills
-- AI Literacy sub-skills for Mission 001 and the AI Lab room. (ADR-022, ADR-024)
-- These are a specialised extension of mastery_skills — they carry extra
-- metadata specific to AI safety, responsible AI use, and AI Lab integration.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_literacy_skills (
  id                      uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  mastery_skill_id        uuid    NOT NULL UNIQUE REFERENCES public.mastery_skills(id) ON DELETE CASCADE,
  -- AI Lab room context (architecture.md §7: AI Lab)
  ai_lab_room_id          text    NOT NULL DEFAULT 'ai-lab',
  -- Which Mission 001 step this skill first appears in (ADR-024)
  mission_001_step_id     text,
  -- AI safety / responsible AI classification
  ai_safety_category      text    NOT NULL
                                  CHECK (ai_safety_category IN (
                                    'ai-error-detection',
                                    'ai-bias-awareness',
                                    'responsible-prompting',
                                    'ai-vs-human-judgment',
                                    'data-privacy',
                                    'ai-literacy-general'
                                  )),
  -- Age-appropriate explanation for this skill (ADR-009: age-tiered AI interaction)
  student_explanation     text    NOT NULL,
  parent_explanation      text    NOT NULL,
  is_active               boolean NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_literacy_skills ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ai_literacy_skills_mastery_skill_id
  ON public.ai_literacy_skills (mastery_skill_id);

CREATE INDEX IF NOT EXISTS idx_ai_literacy_skills_category
  ON public.ai_literacy_skills (ai_safety_category);

CREATE TRIGGER trg_ai_literacy_skills_updated_at
  BEFORE UPDATE ON public.ai_literacy_skills
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "ai_literacy_skills_curriculum_admin_insert"
  ON public.ai_literacy_skills FOR INSERT
  TO l3arn_curriculum_admin
  WITH CHECK (true);

CREATE POLICY "ai_literacy_skills_curriculum_admin_update"
  ON public.ai_literacy_skills FOR UPDATE
  TO l3arn_curriculum_admin
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.ai_literacy_skills TO l3arn_curriculum_admin;
GRANT INSERT, UPDATE ON public.ai_literacy_skills TO l3arn_curriculum_admin;

-- ---------------------------------------------------------------------------
-- 9. evidence_templates
-- Templates for evidence capture points, referenced by mission_patterns.
-- The Mission Compiler uses these to build the evidence_plan output. (ADR-016)
-- Encodes privacy rules at the data level: webcam and face capture are
-- structurally excluded. (ADR-026)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.evidence_templates (
  id                      uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  code                    text                  NOT NULL UNIQUE CHECK (code ~ '^[A-Z][A-Z0-9_]{1,49}$'),
  name                    text                  NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  capture_type            evidence_capture_type NOT NULL,
  -- Human-readable description of what this evidence point captures
  description             text                  NOT NULL,
  -- Instructions surfaced to the student at the capture point
  student_instructions    text                  NOT NULL,
  -- What the parent sees in reports for this evidence type
  parent_label            text                  NOT NULL,
  -- Default retention period (may be overridden by rubric_templates)
  default_retention_days  integer               NOT NULL DEFAULT 365
                                                CHECK (default_retention_days BETWEEN 90 AND 2190),
  parent_visible_default  boolean               NOT NULL DEFAULT true,
  portfolio_eligible      boolean               NOT NULL DEFAULT false,
  -- Privacy invariants: these columns are NOT NULL and DEFAULT false for webcam/face.
  -- The schema makes it structurally impossible to enable face/webcam capture. (ADR-026)
  -- audio_required: true only for 'audio-response' capture type, and only when
  -- parent has enabled audio (ADR-027). The Mission Compiler checks child_permissions
  -- before including any audio-response evidence template.
  audio_required          boolean               NOT NULL DEFAULT false,
  -- Webcam and face capture are NEVER enabled — stored as NOT NULL false columns
  -- to make the intent explicit and auditable.
  webcam_required         boolean               NOT NULL DEFAULT false
                                                CHECK (webcam_required = false),
  face_capture_required   boolean               NOT NULL DEFAULT false
                                                CHECK (face_capture_required = false),
  is_active               boolean               NOT NULL DEFAULT true,
  version                 integer               NOT NULL DEFAULT 1,
  created_at              timestamptz           NOT NULL DEFAULT now(),
  updated_at              timestamptz           NOT NULL DEFAULT now()
);

ALTER TABLE public.evidence_templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_evidence_templates_capture_type
  ON public.evidence_templates (capture_type);

CREATE INDEX IF NOT EXISTS idx_evidence_templates_active
  ON public.evidence_templates (is_active) WHERE is_active = true;

CREATE TRIGGER trg_evidence_templates_updated_at
  BEFORE UPDATE ON public.evidence_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "evidence_templates_curriculum_admin_insert"
  ON public.evidence_templates FOR INSERT
  TO l3arn_curriculum_admin
  WITH CHECK (true);

CREATE POLICY "evidence_templates_curriculum_admin_update"
  ON public.evidence_templates FOR UPDATE
  TO l3arn_curriculum_admin
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.evidence_templates TO l3arn_curriculum_admin;
GRANT INSERT, UPDATE ON public.evidence_templates TO l3arn_curriculum_admin;

-- ---------------------------------------------------------------------------
-- Seed Data: Mission 001 Foundation
-- "Repair the Sorting Computer + Calibrate the Learner Core" (ADR-024)
-- Seeded here so Mission Compiler v0 has something to ground against.
-- ---------------------------------------------------------------------------

-- Seed: AI Literacy domain
INSERT INTO public.mastery_domains (code, name, description, display_order)
VALUES (
  'AI_LITERACY',
  'AI Literacy',
  'Understanding AI systems, their limitations, responsible use, and safety practices.',
  1
)
ON CONFLICT (code) DO NOTHING;

-- Seed: Mission 001 pattern
WITH domain AS (
  SELECT id FROM public.mastery_domains WHERE code = 'AI_LITERACY' LIMIT 1
)
INSERT INTO public.mission_patterns (
  code,
  name,
  description,
  supported_modes,
  grade_band_min,
  grade_band_max,
  primary_domain_id,
  estimated_duration_min,
  step_template,
  default_evidence_types,
  requires_parent_approval,
  parent_preview_notes
)
SELECT
  'MISSION_001_SORTING_COMPUTER',
  'Repair the Sorting Computer + Calibrate the Learner Core',
  'The Sorting Computer glitches after the student ceremony. The child helps repair it with their companion while learning that AI is powerful but must be checked. Simultaneously calibrates the learner profile through structured choices and interactions.',
  ARRAY['3d', 'interactive-lite', 'text-audio-offline']::delivery_mode[],
  'K',
  '8',
  domain.id,
  30,
  '{
    "steps": [
      {"id": "step_001", "type": "narrative", "description": "Sorting Computer glitch narrative introduction"},
      {"id": "step_002", "type": "choice", "description": "Student chooses repair approach with companion"},
      {"id": "step_003", "type": "sequence", "description": "Student sequences repair steps"},
      {"id": "step_004", "type": "ai-check", "description": "Student identifies AI mistake in the Computer output"},
      {"id": "step_005", "type": "explanation", "description": "Student explains why the AI was wrong"},
      {"id": "step_006", "type": "reflection", "description": "Student reflects on what they learned about AI"},
      {"id": "step_007", "type": "calibration", "description": "System captures learner signals from all interactions"}
    ]
  }',
  ARRAY['decision-log', 'sequence-completion', 'ai-mistake-check', 'explanation', 'reflection']::evidence_capture_type[],
  false,
  'Mission 001 is the first experience. It assesses AI literacy foundations, reading/listening preferences, and help-seeking behaviour to calibrate the learner profile. No parent approval required by default.'
FROM domain
ON CONFLICT (code) DO NOTHING;

-- Seed: evidence templates for Mission 001 evidence types
INSERT INTO public.evidence_templates (code, name, capture_type, description, student_instructions, parent_label)
VALUES
  (
    'EVT_DECISION_LOG',
    'Choice Decision Log',
    'decision-log',
    'Records the student''s choices and reasoning during interactive decision points.',
    'Make your choice and we''ll remember what you decided.',
    'Decision record: choices your child made during the mission'
  ),
  (
    'EVT_SEQUENCE_COMPLETION',
    'Step Sequence Completion',
    'sequence-completion',
    'Records whether the student completed a task sequence in the correct order.',
    'Put the steps in the right order to fix the computer!',
    'Sequencing task: how your child ordered the repair steps'
  ),
  (
    'EVT_AI_MISTAKE_CHECK',
    'AI Error Detection',
    'ai-mistake-check',
    'Records whether the student identified and corrected an AI error.',
    'The computer made a mistake. Can you find it and fix it?',
    'AI check: whether your child caught the AI''s error'
  ),
  (
    'EVT_EXPLANATION',
    'Explanation Response',
    'explanation',
    'Records the student''s explanation of a concept in their own words.',
    'Tell us in your own words why the AI was wrong.',
    'Explanation: your child''s understanding of AI limitations'
  ),
  (
    'EVT_REFLECTION',
    'Post-Mission Reflection',
    'reflection',
    'Records the student''s reflection on what they learned.',
    'What did you learn from fixing the Sorting Computer?',
    'Reflection: what your child took away from this mission'
  )
ON CONFLICT (code) DO NOTHING;

COMMIT;
