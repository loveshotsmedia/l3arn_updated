-- ============================================================
-- L3ARN Platform — Dev Seed Data
-- For local development only. Never run in production.
-- ============================================================

-- Create a dev tenant
INSERT INTO tenants (id, name, slug) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Dev School', 'dev-school');

-- Note: In production, profiles and memberships are created
-- via the API after Supabase Auth signup. The user_id values
-- below are placeholders — replace with real auth.users IDs
-- when testing with actual Supabase Auth.

-- Example profile (placeholder user_id)
INSERT INTO profiles (id, user_id, tenant_id, display_name, role) VALUES
    ('b0000000-0000-0000-0000-000000000001',
     'c0000000-0000-0000-0000-000000000001',
     'a0000000-0000-0000-0000-000000000001',
     'Dev Admin', 'owner');

-- Example membership
INSERT INTO tenant_memberships (id, user_id, tenant_id, role) VALUES
    ('d0000000-0000-0000-0000-000000000001',
     'c0000000-0000-0000-0000-000000000001',
     'a0000000-0000-0000-0000-000000000001',
     'owner');

-- Example audit log entry
INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, trace_id, request_id) VALUES
    ('a0000000-0000-0000-0000-000000000001',
     'c0000000-0000-0000-0000-000000000001',
     'tenant.created', 'tenant', 'a0000000-0000-0000-0000-000000000001',
     'seed-trace-001', 'seed-request-001');
