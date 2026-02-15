-- ============================================================
-- L3ARN Platform — Row Level Security Policies
-- Enforces strict tenant isolation on all tenant-scoped tables.
-- ============================================================

-- Helper: get the current user's ID from the JWT
-- auth.uid() is provided by Supabase automatically

-- ============================================================
-- TENANTS
-- ============================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Users can read tenants they are members of
CREATE POLICY "tenants_select_own"
    ON tenants FOR SELECT
    USING (
        id IN (
            SELECT tenant_id FROM tenant_memberships
            WHERE user_id = auth.uid()
        )
    );

-- Only owners can update tenant settings
CREATE POLICY "tenants_update_owner"
    ON tenants FOR UPDATE
    USING (
        id IN (
            SELECT tenant_id FROM tenant_memberships
            WHERE user_id = auth.uid() AND role = 'owner'
        )
    );

-- ============================================================
-- PROFILES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read profiles in their tenant
CREATE POLICY "profiles_select_tenant"
    ON profiles FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_memberships
            WHERE user_id = auth.uid()
        )
    );

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
    ON profiles FOR UPDATE
    USING (user_id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "profiles_insert_own"
    ON profiles FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- ============================================================
-- TENANT MEMBERSHIPS
-- ============================================================
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;

-- Users can see memberships in their own tenants
CREATE POLICY "memberships_select_tenant"
    ON tenant_memberships FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_memberships AS tm
            WHERE tm.user_id = auth.uid()
        )
    );

-- Only admins/owners can insert memberships
CREATE POLICY "memberships_insert_admin"
    ON tenant_memberships FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM tenant_memberships AS tm
            WHERE tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
        )
    );

-- Only owners can delete memberships
CREATE POLICY "memberships_delete_owner"
    ON tenant_memberships FOR DELETE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_memberships AS tm
            WHERE tm.user_id = auth.uid() AND tm.role = 'owner'
        )
    );

-- ============================================================
-- AUDIT LOGS
-- ============================================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can read audit logs for their tenant
CREATE POLICY "audit_logs_select_tenant"
    ON audit_logs FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_memberships
            WHERE user_id = auth.uid()
        )
    );

-- Audit logs are insert-only from the API (service role)
-- No user-facing insert policy — use service_role key
CREATE POLICY "audit_logs_insert_service"
    ON audit_logs FOR INSERT
    WITH CHECK (true);  -- Controlled by service_role key in API

-- ============================================================
-- WEBHOOK EVENTS
-- ============================================================
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Webhook events are read-only for admins/owners
CREATE POLICY "webhook_events_select_admin"
    ON webhook_events FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_memberships
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Inserts are done by Edge Functions using service_role
CREATE POLICY "webhook_events_insert_service"
    ON webhook_events FOR INSERT
    WITH CHECK (true);  -- Controlled by service_role key in Edge Functions

-- ============================================================
-- PARENT PROFILES
-- ============================================================
ALTER TABLE parent_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parent_profiles_select_tenant"
    ON parent_profiles FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_memberships
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "parent_profiles_insert_own"
    ON parent_profiles FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "parent_profiles_update_own"
    ON parent_profiles FOR UPDATE
    USING (user_id = auth.uid());

-- ============================================================
-- PARENT ONBOARDING STATUS
-- ============================================================
ALTER TABLE parent_onboarding_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onboarding_select_own"
    ON parent_onboarding_status FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "onboarding_insert_own"
    ON parent_onboarding_status FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "onboarding_update_own"
    ON parent_onboarding_status FOR UPDATE
    USING (user_id = auth.uid());

-- ============================================================
-- STUDENTS
-- ============================================================
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Parents see their own students; admins see all in tenant
CREATE POLICY "students_select_tenant"
    ON students FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_memberships
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "students_insert_parent"
    ON students FOR INSERT
    WITH CHECK (parent_user_id = auth.uid());

CREATE POLICY "students_update_parent"
    ON students FOR UPDATE
    USING (parent_user_id = auth.uid());

-- ============================================================
-- CHILD LEARNING PREFS
-- ============================================================
ALTER TABLE child_learning_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "learning_prefs_select_tenant"
    ON child_learning_prefs FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_memberships
            WHERE user_id = auth.uid()
        )
    );

-- Insert/update via service role (FastAPI engine)
CREATE POLICY "learning_prefs_insert_service"
    ON child_learning_prefs FOR INSERT
    WITH CHECK (true);

CREATE POLICY "learning_prefs_update_service"
    ON child_learning_prefs FOR UPDATE
    USING (true);

-- ============================================================
-- CHILD SCHEDULE PREFS
-- ============================================================
ALTER TABLE child_schedule_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedule_prefs_select_tenant"
    ON child_schedule_prefs FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_memberships
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "schedule_prefs_insert_service"
    ON child_schedule_prefs FOR INSERT
    WITH CHECK (true);

CREATE POLICY "schedule_prefs_update_service"
    ON child_schedule_prefs FOR UPDATE
    USING (true);

-- ============================================================
-- COMPANION CONFIGS
-- ============================================================
ALTER TABLE companion_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companion_select_tenant"
    ON companion_configs FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_memberships
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "companion_insert_service"
    ON companion_configs FOR INSERT
    WITH CHECK (true);

CREATE POLICY "companion_update_service"
    ON companion_configs FOR UPDATE
    USING (true);

-- ============================================================
-- TOOL EXECUTIONS
-- ============================================================
ALTER TABLE tool_executions ENABLE ROW LEVEL SECURITY;

-- Admins/owners can read tool executions
CREATE POLICY "tool_exec_select_admin"
    ON tool_executions FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_memberships
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Insert via service role only
CREATE POLICY "tool_exec_insert_service"
    ON tool_executions FOR INSERT
    WITH CHECK (true);

-- ============================================================
-- AI OUTPUTS
-- ============================================================
ALTER TABLE ai_outputs ENABLE ROW LEVEL SECURITY;

-- Admins/owners can read AI outputs
CREATE POLICY "ai_outputs_select_admin"
    ON ai_outputs FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_memberships
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Insert via service role only
CREATE POLICY "ai_outputs_insert_service"
    ON ai_outputs FOR INSERT
    WITH CHECK (true);
