-- ============================================================
-- L3ARN Platform — Migration 00002: Canonical Schema
-- Adds: parent_profiles, parent_onboarding_status, students,
--        child_learning_prefs, child_schedule_prefs,
--        companion_configs, tool_executions, ai_outputs
-- Updates: profiles (add default_tenant_id)
-- ============================================================

-- ── Add default_tenant_id to profiles ───────────────────────

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS default_tenant_id UUID REFERENCES tenants(id);

-- ── Parent Profiles ─────────────────────────────────────────
-- Canonical parent data. One per parent user per tenant.

CREATE TABLE parent_profiles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL,
    first_name      TEXT,
    last_name       TEXT,
    phone           TEXT,
    email           TEXT,
    city            TEXT,
    state           TEXT,
    country         TEXT DEFAULT 'US',
    timezone        TEXT DEFAULT 'America/New_York',
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, tenant_id)
);

CREATE INDEX idx_parent_profiles_tenant ON parent_profiles (tenant_id);
CREATE INDEX idx_parent_profiles_user ON parent_profiles (user_id);

-- ── Parent Onboarding Status ────────────────────────────────

CREATE TABLE parent_onboarding_status (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL,
    current_step    TEXT NOT NULL DEFAULT 'profile',
    steps_completed JSONB NOT NULL DEFAULT '[]',
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, tenant_id)
);

CREATE INDEX idx_onboarding_tenant ON parent_onboarding_status (tenant_id);

-- ── Students ────────────────────────────────────────────────
-- Canonical student table. Replaces any `children` table.

CREATE TABLE students (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    parent_user_id  UUID NOT NULL,
    first_name      TEXT NOT NULL,
    last_name       TEXT,
    nickname        TEXT,
    date_of_birth   DATE,
    grade_level     TEXT,
    avatar_url      TEXT,
    metadata        JSONB DEFAULT '{}',
    active          BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_students_tenant ON students (tenant_id);
CREATE INDEX idx_students_parent ON students (parent_user_id);

-- ── Child Learning Prefs ────────────────────────────────────

CREATE TABLE child_learning_prefs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    learning_style  TEXT,
    interests       JSONB DEFAULT '[]',
    strengths       JSONB DEFAULT '[]',
    challenges      JSONB DEFAULT '[]',
    goals           JSONB DEFAULT '[]',
    weekly_target_minutes INT DEFAULT 300,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id)
);

CREATE INDEX idx_learning_prefs_tenant ON child_learning_prefs (tenant_id);
CREATE INDEX idx_learning_prefs_student ON child_learning_prefs (student_id);

-- ── Child Schedule Prefs ────────────────────────────────────

CREATE TABLE child_schedule_prefs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    preferred_days  JSONB DEFAULT '[]',
    preferred_times JSONB DEFAULT '{}',
    session_duration_minutes INT DEFAULT 45,
    breaks_between  INT DEFAULT 10,
    blackout_dates  JSONB DEFAULT '[]',
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id)
);

CREATE INDEX idx_schedule_prefs_tenant ON child_schedule_prefs (tenant_id);
CREATE INDEX idx_schedule_prefs_student ON child_schedule_prefs (student_id);

-- ── Companion Configs ───────────────────────────────────────
-- Parent seeds initial config; student picks character later.

CREATE TABLE companion_configs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    character_name  TEXT,
    character_style TEXT,
    teaching_tone   TEXT DEFAULT 'encouraging',
    reinforcement_style TEXT DEFAULT 'positive',
    parent_seed     JSONB DEFAULT '{}',
    student_choice  JSONB DEFAULT '{}',
    version         INT NOT NULL DEFAULT 1,
    active          BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_companion_tenant ON companion_configs (tenant_id);
CREATE INDEX idx_companion_student ON companion_configs (student_id);

-- ── Tool Executions ─────────────────────────────────────────
-- Machine-level deterministic tool run log.

CREATE TABLE tool_executions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL,
    tool_name       TEXT NOT NULL,
    tool_version    TEXT,
    input_payload   JSONB NOT NULL DEFAULT '{}',
    output_payload  JSONB DEFAULT '{}',
    success         BOOLEAN NOT NULL DEFAULT false,
    error_message   TEXT,
    duration_ms     INT,
    trace_id        TEXT NOT NULL,
    request_id      TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tool_exec_tenant ON tool_executions (tenant_id);
CREATE INDEX idx_tool_exec_trace ON tool_executions (trace_id);
CREATE INDEX idx_tool_exec_tool ON tool_executions (tool_name);
CREATE INDEX idx_tool_exec_created ON tool_executions (created_at DESC);

-- ── AI Outputs ──────────────────────────────────────────────
-- Logs prompt metadata, model info, safety flags, and output.

CREATE TABLE ai_outputs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL,
    tool_execution_id UUID REFERENCES tool_executions(id),
    model_provider  TEXT NOT NULL DEFAULT 'anthropic',
    model_version   TEXT NOT NULL DEFAULT 'claude-3-5-sonnet',
    prompt_type     TEXT NOT NULL,
    prompt_metadata JSONB DEFAULT '{}',
    output_text     TEXT,
    output_metadata JSONB DEFAULT '{}',
    safety_flags    JSONB DEFAULT '[]',
    token_usage     JSONB DEFAULT '{}',
    duration_ms     INT,
    trace_id        TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_outputs_tenant ON ai_outputs (tenant_id);
CREATE INDEX idx_ai_outputs_trace ON ai_outputs (trace_id);
CREATE INDEX idx_ai_outputs_model ON ai_outputs (model_provider, model_version);
CREATE INDEX idx_ai_outputs_created ON ai_outputs (created_at DESC);

-- ── Triggers ────────────────────────────────────────────────

CREATE TRIGGER trg_parent_profiles_updated_at
    BEFORE UPDATE ON parent_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_onboarding_updated_at
    BEFORE UPDATE ON parent_onboarding_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_learning_prefs_updated_at
    BEFORE UPDATE ON child_learning_prefs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_schedule_prefs_updated_at
    BEFORE UPDATE ON child_schedule_prefs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_companion_configs_updated_at
    BEFORE UPDATE ON companion_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
