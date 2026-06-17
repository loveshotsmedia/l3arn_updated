# L3ARN — Supabase RLS Policy Plan

_Row-Level Security design for all tables across all migrations. Policies are written before any application code touches them._

_Grounded in: `L3ARN_MASTER_HANDOFF.md` §1.2, §4, §9; ADR-007, ADR-008, ADR-029, ADR-030, ADR-031_

---

## Security Model Overview

L3ARN uses three caller identities against Supabase:

```
┌───────────────────────────┬──────────────────────────────────────────────────────┐
│ Caller                    │ Identity in Supabase                                 │
├───────────────────────────┼──────────────────────────────────────────────────────┤
│ Parent browser (Vercel)   │ auth.uid() = parent_account_id (JWT from Supabase   │
│                           │ Auth). Bound by household RLS.                       │
├───────────────────────────┼──────────────────────────────────────────────────────┤
│ Child browser (Vercel)    │ MVP: does NOT query Supabase directly. Child app     │
│ [MVP: API-mediated]       │ calls the Railway backend using a child session token│
│                           │ issued by Railway after parent launches the session. │
│                           │ Railway enforces scope and writes to Supabase via    │
│                           │ service_role. Child-facing RLS policies exist in the │
│                           │ schema as defense-in-depth for future direct access. │
├───────────────────────────┼──────────────────────────────────────────────────────┤
│ Railway backend / API     │ service_role key. Bypasses RLS.                      │
│                           │ EVERY service_role write must INSERT into audit_logs │
│                           │ in the same transaction.                             │
└───────────────────────────┴──────────────────────────────────────────────────────┘
```

**The anon role has no SELECT access to any data table in this system.**

---

## Policy Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Policy exists and is the expected path |
| ❌ | No policy exists — operation is denied by default |
| 🔒 | Compile-time invariant — deny enforced at schema level (NOT NULL, CHECK) |
| 🛡️ | Service-role only — bypasses RLS but must audit-log |
| ⚠️ | Requires explicit parent consent row before granting |

---

## Migration 001 — Identity & Household

### `parent_accounts`

| Operation | Who | Condition | Notes |
|-----------|-----|-----------|-------|
| SELECT | authenticated | `id = auth.uid()` | Parent reads only their own row |
| INSERT | authenticated | `id = auth.uid()` | Created automatically via auth trigger |
| UPDATE | authenticated | `id = auth.uid()` | Display name, timezone, etc. |
| DELETE | ❌ | — | Soft-delete only; account closure is a service-role operation |
| service_role | 🛡️ | all rows | Must audit-log all writes |

**Policy names:** `parent_accounts_self_select`, `parent_accounts_self_update`

---

### `households`

| Operation | Who | Condition | Notes |
|-----------|-----|-----------|-------|
| SELECT | authenticated | `parent_account_id = auth.uid()` | Parent reads own household |
| INSERT | authenticated | `parent_account_id = auth.uid()` | Parent creates household |
| UPDATE | authenticated | `parent_account_id = auth.uid()` | Update household name |
| DELETE | ❌ | — | No client delete; admin-only via service_role + audit |
| service_role | 🛡️ | all rows | — |

**Policy names:** `households_owner_select`, `households_owner_insert`, `households_owner_update`

---

### `household_members`

| Operation | Who | Condition | Notes |
|-----------|-----|-----------|-------|
| SELECT | authenticated | `household_id IN (SELECT id FROM households WHERE parent_account_id = auth.uid())` | Parent sees their household members |
| INSERT | 🛡️ service_role | — | Adding co-parents is a backend operation |
| UPDATE | ❌ | — | — |
| DELETE | ❌ | — | — |

**Policy names:** `household_members_household_owner_select`

---

### `child_profiles` ⚠️ CRITICAL PII

| Operation | Who | Condition | Notes |
|-----------|-----|-----------|-------|
| SELECT | authenticated | `parent_account_id = auth.uid() AND deleted_at IS NULL` | **Only owning parent** can see legal name / DOB |
| INSERT | authenticated | `parent_account_id = auth.uid()` | Parent creates child profile |
| UPDATE | authenticated | `parent_account_id = auth.uid() AND deleted_at IS NULL` | Parent updates grade, legal name |
| DELETE | ❌ | — | Soft-delete via `deleted_at` only |
| Child session | ❌ | — | Child JWT **cannot** read `child_profiles` under any circumstance |
| service_role | 🛡️ | all rows | Must audit-log |

**Policy names:** `child_profiles_parent_select`, `child_profiles_parent_insert`, `child_profiles_parent_update`

**Note:** FORCE ROW LEVEL SECURITY is set on this table. Even service_role calls in the wrong context cannot bypass this without explicit bypass. Service_role bypasses RLS by default in Supabase — this is intentional for the backend API only. The frontend client never holds the service_role key.

---

### `academy_identities`

| Operation | Who | Condition | Notes |
|-----------|-----|-----------|-------|
| SELECT (own) | authenticated (parent) | `child_profile_id IN (SELECT id FROM child_profiles WHERE parent_account_id = auth.uid())` | Parent sees their children's academy identities |
| SELECT (child session) | authenticated (child) | `id = current_setting('app.academy_identity_id')::uuid` | Child sees only their own identity; display name + house only |
| INSERT | authenticated (parent) | owns child_profile_id | Parent creates academy identity |
| UPDATE | authenticated (parent) | owns child_profile_id | Parent updates display name / house |
| DELETE | ❌ | — | Soft-delete only |
| Public SELECT (display name + house only) | ❌ | — | Other students see display names **only** via realtime room presence — never via a raw Supabase SELECT from another child |

**Policy names:** `academy_identities_parent_select`, `academy_identities_parent_insert`, `academy_identities_parent_update`, `academy_identities_child_session_select`

**Implementation note:** The child session JWT carries a custom claim `app.academy_identity_id` set by the Railway session minter when the child logs in. This allows RLS to scope the child's reads without exposing `child_profile_id`.

---

### `child_permissions`

| Operation | Who | Condition | Notes |
|-----------|-----|-----------|-------|
| SELECT | authenticated (parent) | owns child_profile_id | Parent reads permissions |
| SELECT | authenticated (child) | child_profile_id matches session claim | Child reads own permissions to know allowed modes |
| INSERT | authenticated (parent) | owns child_profile_id | Parent creates permission record |
| UPDATE | authenticated (parent) | owns child_profile_id | Parent changes permissions |
| DELETE | ❌ | — | — |
| service_role | 🛡️ | — | — |

**Policy names:** `child_permissions_parent_select`, `child_permissions_parent_insert`, `child_permissions_parent_update`, `child_permissions_child_select`

---

### `privacy_settings`

| Operation | Who | Condition | Notes |
|-----------|-----|-----------|-------|
| SELECT | authenticated (parent) | owns child_profile_id | Parent manages privacy settings |
| INSERT | authenticated (parent) | owns child_profile_id | — |
| UPDATE | authenticated (parent) | owns child_profile_id | — |
| DELETE | ❌ | — | — |

**Policy names:** `privacy_settings_parent_select`, `privacy_settings_parent_insert`, `privacy_settings_parent_update`

---

### `parent_consents` ⚠️ IMMUTABLE LEDGER

| Operation | Who | Condition | Notes |
|-----------|-----|-----------|-------|
| SELECT | authenticated (parent) | `parent_account_id = auth.uid()` | Parent sees their own consents |
| INSERT | authenticated (parent) | `parent_account_id = auth.uid()` | Parent grants consent |
| UPDATE | ❌ | — | **Consents are never updated** — revocation is a new INSERT with `granted = false` |
| DELETE | ❌ | — | **Consents are never deleted** — COPPA audit trail |
| service_role | 🛡️ | SELECT only | Backend reads consent status; must not write without parent action |

**Policy names:** `parent_consents_parent_select`, `parent_consents_parent_insert`

**Critical:** The absence of an UPDATE policy is the enforcement mechanism. Changing a consent always creates a new row. This preserves the COPPA audit chain.

---

### `child_sessions`

| Operation | Who | Condition | Notes |
|-----------|-----|-----------|-------|
| SELECT | authenticated (parent) | owns child_profile_id | Parent sees all sessions for their child |
| SELECT (self) | authenticated (child) | `id = current_setting('app.child_session_id')::uuid` | Child reads own active session |
| INSERT | 🛡️ service_role | — | Sessions are opened by the backend, not the client |
| UPDATE | 🛡️ service_role | — | `ended_at` is set by the backend |
| DELETE | ❌ | — | — |

**Policy names:** `child_sessions_parent_select`, `child_sessions_self_select`

**Rationale:** Child sessions are created server-side (Railway) after verifying parent launch or trusted-device PIN. The client cannot self-create a session row.

---

### `trusted_devices`

| Operation | Who | Condition | Notes |
|-----------|-----|-----------|-------|
| SELECT | authenticated (parent) | `parent_account_id = auth.uid()` | Parent manages trusted devices |
| INSERT | authenticated (parent) | `parent_account_id = auth.uid()` | Parent approves a device |
| UPDATE | authenticated (parent) | revoke / rename only | Parent can revoke a device |
| DELETE | ❌ | — | Soft-revoke via `revoked_at` |
| service_role | 🛡️ | SELECT for PIN verification | Backend verifies PIN + device fingerprint |

**Policy names:** `trusted_devices_parent_select`, `trusted_devices_parent_insert`, `trusted_devices_parent_update`

---

## Migration 002 — Curriculum & Mastery Spine

**Global rule for all curriculum tables:**

```sql
-- No authenticated or anon client reads curriculum tables directly.
-- All reads go through the Railway API (service_role).
-- INSERT/UPDATE is restricted to l3arn_curriculum_admin role.
```

| Table | SELECT (authenticated) | SELECT (anon) | INSERT/UPDATE | DELETE |
|-------|----------------------|---------------|---------------|--------|
| `mastery_domains` | ❌ | ❌ | l3arn_curriculum_admin only | ❌ |
| `mastery_skills` | ❌ | ❌ | l3arn_curriculum_admin only | ❌ |
| `skill_prerequisites` | ❌ | ❌ | l3arn_curriculum_admin only | ❌ |
| `standards` | ❌ | ❌ | l3arn_curriculum_admin only | ❌ |
| `standard_skill_mappings` | ❌ | ❌ | l3arn_curriculum_admin only | ❌ |
| `mission_patterns` | ❌ | ❌ | l3arn_curriculum_admin only | ❌ |
| `rubric_templates` | ❌ | ❌ | l3arn_curriculum_admin only | ❌ |
| `ai_literacy_skills` | ❌ | ❌ | l3arn_curriculum_admin only | ❌ |
| `evidence_templates` | ❌ | ❌ | l3arn_curriculum_admin only | ❌ |

**Why no client reads?**
The Mission Compiler runs on Railway. It receives the three-part constraint, reads curriculum tables via the service role, and returns a compiled `MissionOutput` to the frontend. The frontend never needs raw access to the mastery skill graph, pattern templates, or rubrics. This prevents:
1. Curriculum IP exposure to unauthenticated parties
2. Frontend manipulation of mission quality gates
3. Clients constructing missions that bypass the three-part constraint

**Curriculum admin write policy (all Migration 002 tables):**
```sql
-- Policy applied per table:
CREATE POLICY "curriculum_admin_insert" ON <table>
  FOR INSERT TO l3arn_curriculum_admin WITH CHECK (true);

CREATE POLICY "curriculum_admin_update" ON <table>
  FOR UPDATE TO l3arn_curriculum_admin USING (true) WITH CHECK (true);
-- No DELETE policy -- curriculum is soft-deprecated via is_active = false
```

---

## Cross-Cutting RLS Rules

### Rule 1: Household Isolation
No authenticated user can ever JOIN through to another household's child data. Every policy that touches `child_profiles`, `academy_identities`, or `child_permissions` enforces `parent_account_id = auth.uid()` either directly or via the helper functions `auth_owns_household()` or `auth_owns_child()`.

### Rule 2: Child Session Scope (MVP: Backend-Mediated)

**MVP design:** Child browsers do NOT query Supabase directly. When a parent launches a child session or a child enters via trusted-device PIN, the Railway backend:

1. Validates the entry method (parent JWT or device fingerprint + PIN hash)
2. Creates a `child_sessions` row (via service_role) with `expires_at` set
3. Issues a child session token (opaque to Supabase) used by the child app to call Railway API endpoints
4. Railway enforces scope on all subsequent reads/writes using service_role

The child app never holds a Supabase JWT. All child data flows through Railway.

**Session expiry enforcement:**
- `child_sessions.expires_at` is required (NOT NULL). Backend sets: 2h for parent-launched, 4h for trusted-device PIN.
- `child_sessions.revoked_at` is nullable. Parent can revoke an active session; backend rejects any token referencing a revoked or expired row.
- Backend checks both `expires_at` and `revoked_at` on every API request.

**Child-facing RLS policies** (`academy_identities_child_session_select`, `child_permissions_child_session_select`, `child_sessions_self_select`) exist in Migration 001 as **defense-in-depth** for a future phase where child app sessions may use Supabase JWTs directly. In that future phase, Railway would mint a short-lived Supabase JWT with these custom claims:
```json
{
  "sub": "<child_session_id>",
  "role": "authenticated",
  "app.child_session_id": "<uuid>",
  "app.child_profile_id": "<uuid>",
  "app.academy_identity_id": "<uuid>"
}
```
Until that phase, these policies are not exercised by live traffic.

### Rule 3: Service Role Must Audit-Log
Any Railway backend call using the service role that writes to child data tables must record the action in `security_audit_events` (Migration 003). In MVP, this is enforced at the service layer (application code) for most events. PostgreSQL triggers are added first for the highest-risk writes: parent consent changes, child permission changes, privacy settings changes, model-improvement preference changes, evidence deletion, and child profile deletion. All service_role writes that lack an in-transaction audit entry are a compliance failure.

### Rule 4: No Cross-Child Reads
A child session JWT scoped to `child_profile_id = X` cannot read any row where `child_profile_id = Y`. No policy grants cross-child access.

### Rule 5: Consent Gate
Features that require COPPA consent (audio, AI interaction, model improvement opt-in, moderated chat) must query `parent_consents` before activating. The backend enforces this in application logic; Supabase RLS does not enforce feature gates — it enforces data access gates.

---

## Testing Requirements

Every RLS policy must be tested by the QA agent (Agent M) before any migration is considered complete:

```
[ ] Parent A cannot see Parent B's child_profiles
[ ] Parent A cannot see Parent B's academy_identities
[ ] Child session cannot read child_profiles (legal PII)
[ ] Child session can read own academy_identity
[ ] Child session can read own child_permissions
[ ] Child session cannot read another child's child_permissions
[ ] Unauthenticated client gets 0 rows from all tables
[ ] Unauthenticated client gets 0 rows from curriculum tables
[ ] Authenticated parent cannot INSERT into curriculum tables
[ ] parent_consents has no UPDATE or DELETE policy
[ ] child_sessions cannot be INSERT'd by the client
[ ] service_role writes for consent/permissions/privacy/model-improvement/evidence-deletion fire security_audit_events (Migration 003 trigger)
```

---

## Open Questions

| # | Question | Blocking | Status |
|---|----------|---------|--------|
| OQ-RLS-001 | **Child JWT minting contract** | Blocks child login | ✅ **RESOLVED** — MVP child sessions are backend-mediated. Child browser calls Railway API; Railway uses service_role. Custom child JWTs are a future phase. Child-facing RLS policies exist as defense-in-depth. See Cross-Cutting Rule 2. |
| OQ-RLS-002 | **Audit trigger for service_role writes** | Compliance | ✅ **RESOLVED** — Service-layer writes first. DB triggers first for: consent changes, permission changes, privacy settings, model-improvement preferences, evidence deletion, child profile deletion. `security_audit_events` table lands in Migration 003. No Migration 008. |
| OQ-RLS-003 | **Co-parent RLS scope** | Multi-adult households | ✅ **RESOLVED** — MVP: one primary parent/guardian. Co-parent rows in `household_members` exist structurally but co-parent invitation flow is future. No co-parent RLS scope required for Hero Slice. |
| OQ-RLS-004 | **Child session expiry** | Security | ✅ **RESOLVED** — `child_sessions.expires_at` is required (NOT NULL). `revoked_at` nullable. Backend rejects expired or revoked sessions on every API request. Parent can revoke active sessions. Defaults: 2h parent-launched, 4h trusted-device PIN. |
| OQ-RLS-005 | **Migration 008** | Migration sequencing | ✅ **RESOLVED** — No Migration 008. Migration path ends at 007. Audit tables: `security_audit_events` in 003, `admin_audit_logs` in 007. |
| OQ-RLS-006 | **`child_sessions.expires_at` in Migration 001** | Pre-deploy | Open — `expires_at NOT NULL` and `revoked_at` columns must be added to the `child_sessions` table in Migration 001 before first deploy. Migration 001 predates this decision. |

---

_RLS policy SQL is embedded in the migration files. This document is the design spec — migration files are the implementation._
