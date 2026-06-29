# L3ARN — Supabase Schema Reference

_Supabase is the protected source of truth for all persistent L3ARN data. Every write that crosses a service boundary must pass through RLS. Railway and Vercel connect as authenticated callers — never with unrestricted service-role access from the frontend._

_Grounded in: `L3ARN_MASTER_HANDOFF.md`, `architecture.md`, `shared_contracts_spec.md`, ADR-007, ADR-008, ADR-012, ADR-013, ADR-020, ADR-026, ADR-029, ADR-030, ADR-031_

---

## Design Principles

| Principle | Rationale |
|-----------|-----------|
| **Domain-based schema layout** | Tables are grouped by functional domain. Each migration owns one domain. |
| **RLS-first** | Every table has `ALTER TABLE … ENABLE ROW LEVEL SECURITY` before any policy is written. `FORCE ROW LEVEL SECURITY` is set on all tables that hold child or parent data. |
| **Service-role is not a bypass** | The Railway API and backend functions use the service role only for writes that cannot be done in a user context (e.g., writing world events, awarding Moolah). All such calls are recorded in `audit_logs`. |
| **No direct client reads of curriculum** | `mastery_domains`, `mastery_skills`, `standards`, `mission_patterns`, etc. are `SELECT` only via the service role / API. The client never reads curriculum tables directly. |
| **Child PII is separated** | `child_profiles` holds legal name, DOB, and grade. `academy_identities` holds only the public display name and house. The two are joined by `child_profile_id` but the join is only permitted to the owning parent. |
| **Consent before data** | `parent_consents` is the gate. Features that require COPPA consent check for an active consent row before operating. |
| **Immutable ledgers** | `moolah_ledger` and `audit_logs` are append-only. No UPDATE or DELETE policies exist on them. |
| **Soft deletes** | Child-owned records use `deleted_at` rather than hard deletes to preserve audit trails. |
| **updated_at automation** | A shared trigger function `set_updated_at()` is applied to every mutable table. |

---

## Schema Domains

### Domain 1 — Identity & Household (Migration 001)

Covers the full trust chain: parent account → household → child profile → academy identity, plus permissions, consents, sessions, and devices.

| Table | Purpose | PII Level |
|-------|---------|-----------|
| `parent_accounts` | Mirror of `auth.users` with profile data. | High — email, display name |
| `households` | Family unit owned by a parent. | Medium |
| `household_members` | Join table: which parent accounts belong to a household. | Medium |
| `child_profiles` | Legal identity record for a child (name, DOB, grade). | **Critical** — full PII |
| `academy_identities` | Public-facing in-Academy identity (display name + house only). | Low |
| `child_permissions` | Parent-set permission record per child. | Medium |
| `privacy_settings` | Per-child data retention and visibility tier (evidence_retention_days, session_log_retention_days, parent_visibility_tier). | Medium |
| `parent_consents` | Immutable COPPA/privacy consent log. | High |
| `child_sessions` | Active and historical child session records. | Medium |
| `trusted_devices` | Devices approved for avatar/PIN child login. | Medium |

**Trust Boundaries:**
- A parent can only read/write rows where `parent_account_id = auth.uid()`.
- A child session can only read its own `academy_identity` and `child_permissions` row. It cannot read `child_profiles` (legal PII).
- No cross-household access is possible through RLS.

---

### Domain 2 — Curriculum & Mastery Spine (Migration 002)

Covers the knowledge base: mastery domains, skills, prerequisites, standards mappings, mission patterns, rubric templates, AI literacy skills, and evidence templates.

| Table | Purpose | Client Access |
|-------|---------|---------------|
| `mastery_domains` | Top-level learning domains (Math, Literacy, AI Literacy, etc.). | Service-role only |
| `mastery_skills` | Individual skills within a domain, with grade band and metadata. | Service-role only |
| `skill_prerequisites` | Directed prerequisite graph between skills. | Service-role only |
| `standards` | Florida CPALMS + L3ARN internal mastery standards. | Service-role only |
| `standard_skill_mappings` | Maps Florida standards to L3ARN mastery skills. | Service-role only |
| `mission_patterns` | Reusable mission scaffolding templates used by the Mission Compiler. | Service-role only |
| `rubric_templates` | Mastery evidence rubrics referenced by evidence plans. | Service-role only |
| `ai_literacy_skills` | AI literacy sub-skills for Mission 001 and the AI Lab. | Service-role only |
| `evidence_templates` | Templates for evidence capture points, referenced by mission patterns. | Service-role only |

**Trust Boundaries:**
- No client (frontend Vercel app, child session) has direct SELECT access to any curriculum table.
- The Railway Mission Compiler API reads these via the service role.
- INSERT/UPDATE on curriculum tables is restricted to the `l3arn_curriculum_admin` role.
- All curriculum writes are recorded in `audit_logs`.

---

### Migration 003 — Hero Slice Runtime
_Spans domains: Learner Model, Mission System, Evidence & Reports, Rewards & Economy, and Security Audit._
_Purpose: Support the first full Hero Slice — parent setup → child onboarding → Sorting Computer → House/companion → Mission 001 → evidence → rewards → First Learning Map._

**Learner Model tables:**

| Table | Purpose | Client Access |
|-------|---------|---------------|
| `learner_profiles` | Persistent learner model per child — delivery preferences, support style, calibration state. | Service-role only |
| `learner_calibration_events` | Structured calibration signals captured during Mission 001 (step interactions, choices). | Service-role only |
| `learner_signal_events` | Ongoing structured signals from subsequent missions (persistence, hint usage, mastery). | Service-role only |
| `delivery_mode_preferences` | Derived delivery mode preference record (updated by Mission Compiler from signals). | Service-role only |
| `support_recommendations` | AI-generated support style recommendations, versioned, attached to learner profile. | Service-role only |

**Mission System tables:**

| Table | Purpose | Client Access |
|-------|---------|---------------|
| `mission_instances` | A compiled mission record — the Mission Compiler output for one child + one attempt context. | Service-role only |
| `mission_steps` | Individual steps within a mission instance, with state and evidence refs. | Service-role only |
| `mission_attempts` | Attempt records per child per mission instance. | Service-role only |
| `mission_completion_events` | Immutable event when a mission attempt reaches completion or abandonment. | Service-role only |

**Evidence & Reports tables:**

| Table | Purpose | Client Access |
|-------|---------|---------------|
| `learning_evidence_events` | Structured evidence events captured during mission steps (decisions, sequences, explanations). | Service-role only |
| `mission_replay_events` | Replay-safe event log for in-session step-by-step audit (not full replay video). | Service-role only |
| `parent_reports` | Compiled parent-facing reports — First Learning Map, progress summaries. | Service-role only (parent reads via API) |
| `first_learning_maps` | The child's initial calibrated learner model snapshot generated after Mission 001. | Service-role only |

**Rewards & Economy tables:**

| Table | Purpose | Client Access |
|-------|---------|---------------|
| `moolah_ledger` | Append-only Moolah transaction log. No UPDATE or DELETE. | Service-role only |
| `xp_events` | XP earned events per child per mission/step. | Service-role only |
| `house_point_events` | House points awarded events (contributes to house leaderboard). | Service-role only |
| `companion_profiles` | The child's chosen companion — name, species, bond level. | Service-role only |
| `companion_growth_events` | Bond increases, milestone events, form evolution records. | Service-role only |

**Security Audit table:**

| Table | Purpose | Client Access |
|-------|---------|---------------|
| `security_audit_events` | Core sensitive event audit trail: child data access, consent changes, permission changes, model-improvement opt-out, evidence access, export/delete requests, system safety events, Founder Mission Control admin logs. Append-only. | Service-role only (write); Founder/Safety-Admin only (read) |

**Trust Boundaries:**
- All tables in this migration are service_role-only for client access. No authenticated or anon client reads these tables directly.
- The Railway API mediates all reads and writes on behalf of authenticated parents and child sessions.
- `moolah_ledger`, `mission_completion_events`, `learning_evidence_events`, and `security_audit_events` are append-only (no UPDATE/DELETE policies).
- `security_audit_events` replaces `audit_logs` for sensitive events in Migrations 001–003. A separate `admin_audit_logs` table covers admin console actions in Migration 007.

---

### Migration 004 — World State / Living Academy _(future)_

`world_state_events`, `room_state_snapshots`, `academy_unlocks`, `house_world_modifiers`, `npc_schedules`, `seasonal_event_configs`

---

### Migration 005 — Chat / Safety / Moderation _(future)_

`room_sessions`, `presence_events`, `chat_messages`, `moderation_events`, `escalation_records`

---

### Migration 006 — AI Logs / Learning Intelligence _(future)_

`ai_output_audit_logs`, `deidentified_events`, `pseudonymous_key_map` _(restricted)_, `feature_records`, `dataset_eligibility`, `model_improvement_consent`, `training_dataset_versions`

---

### Migration 007 — Admin / Beta Operations _(future)_

`admin_users`, `admin_sessions`, `admin_audit_logs`, `kill_switch_states`, `incident_records`, `beta_cohort_members`, `founder_approvals`

**Note:** `admin_audit_logs` covers admin console actions, kill switch actions, incident review, support notes, and founder approvals. It is separate from `security_audit_events` (Migration 003) which covers core child data access events.

---

## Roles

| Role | Source | Permissions |
|------|--------|-------------|
| `authenticated` | Supabase Auth JWT | Standard parent/child access gated by RLS |
| `anon` | Unauthenticated | No access to any data tables; landing page reads only |
| `service_role` | Railway backend / Edge Functions | Bypasses RLS; all actions must log to `audit_logs` |
| `l3arn_curriculum_admin` | Granted manually to admins | INSERT/UPDATE on curriculum tables (Domain 2) |

---

## Shared Helpers

Every migration uses these shared helpers, defined once in Migration 001:

```sql
-- Automatic updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Parent ownership helper: returns true if the authenticated user owns the household
CREATE OR REPLACE FUNCTION auth_owns_household(hh_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM households
    WHERE id = hh_id
    AND parent_account_id = auth.uid()
    AND deleted_at IS NULL
  );
$$;

-- Parent owns child helper
CREATE OR REPLACE FUNCTION auth_owns_child(cp_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM child_profiles
    WHERE id = cp_id
    AND parent_account_id = auth.uid()
    AND deleted_at IS NULL
  );
$$;
```

---

## Key Constraints Summary

| Constraint | Enforcement |
|------------|-------------|
| No child can read another child's `child_profile` | RLS policy: `parent_account_id = auth.uid()` |
| No child session can read legal PII | `child_profiles` has no child-session SELECT policy |
| No client can read curriculum tables | `mastery_domains`, `mastery_skills`, etc. have no `authenticated`/`anon` SELECT policy |
| Consents cannot be deleted | No DELETE policy on `parent_consents` |
| Moolah ledger is append-only | No UPDATE or DELETE policy on `moolah_ledger` (Migration 006) |
| Audit log is append-only | No UPDATE or DELETE policy on `audit_logs` (Migration 008) |
| `model_improvement_opt_in` defaults to `false` | Column default; ADR-029 |
| `audio_enabled` defaults to `false` | Column default; ADR-027 |

---

## Table Reference — Migration 001 (Identity & Household)

### `parent_accounts`
_PII Level: HIGH. One row per authenticated parent. `id` = `auth.users.id` = `auth.uid()` (canonical Supabase profiles pattern — required for all downstream RLS to work)._

| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| `id` | `uuid` | PK, FK → auth.users.id | Equals `auth.uid()`. Never `gen_random_uuid()`. |
| `display_name` | `text` | NOT NULL, 1–100 chars | Shown in parent dashboard |
| `email` | `text` | NOT NULL, regex validated | Synced from auth.users on trigger |
| `timezone` | `text` | NOT NULL, DEFAULT `'America/New_York'` | Used for schedule display |
| `onboarding_complete` | `boolean` | NOT NULL, DEFAULT false | Gates dashboard unlock |
| `deleted_at` | `timestamptz` | nullable | Soft-delete only; closure is service_role operation |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | — |
| `updated_at` | `timestamptz` | NOT NULL, auto-set by trigger | — |

**Auth trigger:** `handle_new_auth_user()` fires on `auth.users` INSERT, writes `id = NEW.id` (preserving the identity invariant).

---

### `households`
_PII Level: MEDIUM. `parent_account_id` FK → `parent_accounts.id` which equals `auth.uid()`, so direct `parent_account_id = auth.uid()` comparisons in RLS are valid._

| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| `id` | `uuid` | PK, gen_random_uuid() | — |
| `parent_account_id` | `uuid` | NOT NULL, FK → parent_accounts.id | References `id` which = `auth.uid()` |
| `name` | `text` | NOT NULL, 1–100 chars | Family display name |
| `state_code` | `char(2)` | nullable | e.g. `'FL'` for Florida standards filtering |
| `deleted_at` | `timestamptz` | nullable | Soft-delete |
| `created_at` / `updated_at` | `timestamptz` | NOT NULL | — |

---

### `household_members`
_PII Level: MEDIUM. Co-parent roster. MVP has one primary parent only. `INSERT/UPDATE/DELETE` via backend (Railway co-parent invitation flow)._

| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| `id` | `uuid` | PK | — |
| `household_id` | `uuid` | NOT NULL, FK → households.id | — |
| `parent_account_id` | `uuid` | NOT NULL, FK → parent_accounts.id | The co-parent's account |
| `role` | `text` | NOT NULL, CHECK IN ('primary','co-parent','observer') | — |
| `invited_at` | `timestamptz` | NOT NULL | — |
| `accepted_at` | `timestamptz` | nullable | Set when co-parent accepts invitation |

**Unique constraint:** `(household_id, parent_account_id)`

---

### `child_profiles`
_PII Level: CRITICAL. Legal identity. Child sessions have NO SELECT policy here — legal PII is parent-eyes only. DOB retained for COPPA age verification only, never returned to UI._

| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| `id` | `uuid` | PK | — |
| `household_id` | `uuid` | NOT NULL, FK → households.id | — |
| `parent_account_id` | `uuid` | NOT NULL, FK → parent_accounts.id | Owning parent |
| `legal_first_name` | `text` | NOT NULL, 1–100 chars | Never exposed to child JWT |
| `legal_last_name` | `text` | NOT NULL, 1–100 chars | Never exposed to child JWT |
| `date_of_birth` | `date` | NOT NULL | COPPA verification only; never in API response |
| `grade` | `grade_level` | NOT NULL | `'K' \| '1' \| … \| '8'` |
| `onboarding_complete` | `boolean` | NOT NULL, DEFAULT false | — |
| `sorting_complete` | `boolean` | NOT NULL, DEFAULT false | Mission 001 gate |
| `deleted_at` | `timestamptz` | nullable | Soft-delete |
| `created_at` / `updated_at` | `timestamptz` | NOT NULL | — |

**FORCE ROW LEVEL SECURITY** is set on this table.

---

### `academy_identities`
_PII Level: LOW. Public in-Academy identity — display name + house only. No real name. No face data. Child session reads its own row via JWT claim `app.academy_identity_id`._

| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| `id` | `uuid` | PK | — |
| `child_profile_id` | `uuid` | NOT NULL, UNIQUE, FK → child_profiles.id | One identity per child |
| `display_name` | `text` | NOT NULL, 2–32 chars, UNIQUE (Academy-wide) | e.g. `"StarBlazer7"` |
| `house` | `house_name` | NOT NULL | `'Valkryn' \| 'Lyrion' \| 'Novari' \| 'Cytrex'` |
| `avatar_asset_id` | `text` | nullable | Pre-built asset ref; no face capture data |
| `deleted_at` | `timestamptz` | nullable | — |
| `created_at` / `updated_at` | `timestamptz` | NOT NULL | — |

---

### `child_permissions`
_PII Level: MEDIUM. Parent-controlled permissions per child. Child session can read own row (to know allowed modes). Written only by parent._

| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| `id` | `uuid` | PK | — |
| `child_profile_id` | `uuid` | NOT NULL, UNIQUE, FK → child_profiles.id | — |
| `chat_mode` | `chat_mode` | NOT NULL, DEFAULT `'quick-chat-only'` | `'quick-chat-only' \| 'moderated-free-text'` |
| `audio_enabled` | `boolean` | NOT NULL, DEFAULT **false** | ADR-027: push-to-talk is opt-in, never default |
| `ai_interaction_enabled` | `boolean` | NOT NULL, DEFAULT true | ADR-009 |
| `allowed_delivery_modes` | `delivery_mode[]` | NOT NULL, DEFAULT all modes | ADR-017 |
| `curriculum_approval_mode` | `approval_mode` | NOT NULL, DEFAULT `'balanced'` | ADR-012 |
| `model_improvement_opt_in` | `boolean` | NOT NULL, DEFAULT **false** | ADR-029: safe default is opted out |
| `screen_limit_minutes_per_day` | `integer` | nullable, CHECK > 0 | Optional screen time cap |
| `blocked_topics` | `text[]` | NOT NULL, DEFAULT `'{}'` | Parent-blocked topic list |
| `updated_by_parent_account_id` | `uuid` | NOT NULL, FK → parent_accounts.id | Audit field |
| `created_at` / `updated_at` | `timestamptz` | NOT NULL | — |

---

### `privacy_settings`
_PII Level: MEDIUM. Per-child data retention and visibility tier. Governs HOW data is retained (separate from behavioral permissions)._

| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| `id` | `uuid` | PK | — |
| `child_profile_id` | `uuid` | NOT NULL, UNIQUE, FK → child_profiles.id | — |
| `parent_visibility_tier` | `visibility_tier` | NOT NULL, DEFAULT `'full'` | `'full' \| 'summary' \| 'safety-override'`. ADR-008: K-5 = full; 6-8 = summary |
| `evidence_retention_days` | `integer` | NOT NULL, DEFAULT 365, 90–2190 | Portfolio support: max 6 years |
| `session_log_retention_days` | `integer` | NOT NULL, DEFAULT 90, 30–365 | Presence logs only |
| `parent_reviewed_at` | `timestamptz` | nullable | Set when parent acknowledges privacy settings |
| `created_at` / `updated_at` | `timestamptz` | NOT NULL | — |

---

### `parent_consents`
_PII Level: HIGH. COPPA audit trail. APPEND-ONLY: no UPDATE or DELETE policy exists. Revocation = new INSERT with `granted = false`. `ip_address` and `user_agent` retained for COPPA audit; never returned to UI._

| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| `id` | `uuid` | PK | — |
| `parent_account_id` | `uuid` | NOT NULL, FK → parent_accounts.id | — |
| `child_profile_id` | `uuid` | nullable, FK → child_profiles.id | null = account-level consent (e.g. base COPPA) |
| `consent_type` | `consent_type` | NOT NULL | See ENUM below |
| `granted` | `boolean` | NOT NULL | false = revoked |
| `granted_at` | `timestamptz` | NOT NULL, DEFAULT now() | — |
| `ip_address` | `inet` | nullable | COPPA audit only; never in API response |
| `user_agent` | `text` | nullable | COPPA audit only |
| `revoked_at` | `timestamptz` | nullable | Set when this row is superseded (historical marker) |

**`consent_type` ENUM:** `coppa-data-collection`, `audio-push-to-talk`, `ai-interaction`, `model-improvement`, `moderated-free-text-chat`, `visibility-reduction`

---

### `trusted_devices`
_PII Level: MEDIUM. Parent-approved devices for child avatar/PIN login (ADR-031). Hashes stored; raw fingerprint and PIN never stored._

| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| `id` | `uuid` | PK | — |
| `child_profile_id` | `uuid` | NOT NULL, FK → child_profiles.id | — |
| `parent_account_id` | `uuid` | NOT NULL, FK → parent_accounts.id | Approving parent |
| `device_fingerprint_hash` | `text` | NOT NULL | Raw fingerprint hashed by Railway before INSERT |
| `pin_hash` | `text` | NOT NULL | Raw PIN hashed server-side; never stored plain |
| `nickname` | `text` | nullable, max 50 chars | Parent-set device name |
| `approved_at` | `timestamptz` | NOT NULL | — |
| `last_used_at` | `timestamptz` | nullable | — |
| `revoked_at` | `timestamptz` | nullable | Set by parent to revoke; no DELETE |

**Unique constraint:** `(child_profile_id, device_fingerprint_hash)`

---

### `child_sessions`
_PII Level: MEDIUM. Session audit trail. Created by Railway (service_role) only — no client INSERT. In MVP, the child browser does NOT query this table directly — all reads go through the Railway API. The child-facing SELECT policy exists as defense-in-depth for future direct access._

| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| `id` | `uuid` | PK | Opaque session ID, also used as Railway session token reference |
| `child_profile_id` | `uuid` | NOT NULL, FK → child_profiles.id | — |
| `academy_identity_id` | `uuid` | NOT NULL, FK → academy_identities.id | — |
| `entry_method` | `session_entry_method` | NOT NULL | `'parent-launch' \| 'avatar-pin-trusted-device'` |
| `trusted_device_id` | `uuid` | nullable, FK → trusted_devices.id | Set for avatar/PIN entries |
| `started_at` | `timestamptz` | NOT NULL | — |
| `expires_at` | `timestamptz` | **NOT NULL** | Required. Backend sets: 2h for parent-launched, 4h for trusted-device PIN. Parent revoke sets `revoked_at`. |
| `revoked_at` | `timestamptz` | nullable | Set by backend when parent revokes active session. Backend rejects any token referencing a revoked session. |
| `ended_at` | `timestamptz` | nullable | Set by Railway when session closes gracefully |
| `current_room_id` | `text` | nullable | Opaque room reference (Railway-managed) |
| `railway_session_ref` | `text` | nullable | Cross-system reconciliation; no PII |

> **Pre-deploy note:** `expires_at` and `revoked_at` must be added to `migration 001` before first deploy. Migration 001 was written before this decision was finalized.

---

## Table Reference — Migration 002 (Curriculum & Mastery Spine)

> All tables in this migration are service_role-only for SELECT. No authenticated or anon client reads curriculum tables directly.

### `mastery_domains`
_Top-level learning domains. Root of the L3ARN Mastery Map (ADR-022)._

| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| `id` | `uuid` | PK | — |
| `code` | `text` | NOT NULL, UNIQUE, `^[A-Z][A-Z0-9_]{1,29}$` | e.g. `'AI_LITERACY'` |
| `name` | `text` | NOT NULL, 1–100 chars | — |
| `description` | `text` | nullable | — |
| `display_order` | `integer` | NOT NULL, DEFAULT 0 | — |
| `is_active` | `boolean` | NOT NULL, DEFAULT true | Soft-deprecated via false |
| `version` | `integer` | NOT NULL, DEFAULT 1 | For curriculum versioning |
| `created_at` / `updated_at` | `timestamptz` | NOT NULL | — |

---

### `mastery_skills`
_Individual skills within a domain. Grade-banded. Mission Compiler uses these to ground missions (ADR-021)._

| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| `id` | `uuid` | PK | — |
| `domain_id` | `uuid` | NOT NULL, FK → mastery_domains.id | — |
| `code` | `text` | NOT NULL, UNIQUE, `^[A-Z][A-Z0-9_.]{1,49}$` | Uppercase DB key; app layer uses lowercase canonical key |
| `name` | `text` | NOT NULL, 1–200 chars | — |
| `description` | `text` | NOT NULL | — |
| `grade_band_min` | `grade_level` | NOT NULL | Lowest appropriate grade |
| `grade_band_max` | `grade_level` | NOT NULL | Highest appropriate grade |
| `proficiency_level` | `mastery_level` | NOT NULL, DEFAULT `'proficient'` | Target level for this skill |
| `mastery_evidence_descriptor` | `text` | NOT NULL | What evidence demonstrates mastery (ADR-021) |
| `parent_friendly_name` | `text` | NOT NULL | Plain language for parent reports |
| `is_ai_literacy` | `boolean` | NOT NULL, DEFAULT false | AI Literacy overlay flag |
| `display_order` / `is_active` / `version` | — | standard | — |

**Mission 001 canonical skills (OQ-A10-003 resolved, seeded in Migration 002):**

| DB `code` | App canonical key (`masterySkillTarget`) | Domain | Description |
|-----------|------------------------------------------|--------|-------------|
| `AI_LITERACY.VERIFY_AI_OUTPUT` | `ai_literacy.verify_ai_output` | AI Literacy | Student can verify AI output is correct and identify when AI makes mistakes |
| `LOGIC.SEQUENCE_STEPS` | `logic.sequence_steps` | Logic / Sequencing | Student can order steps in a logical sequence to accomplish a goal |
| `COMPREHENSION.FOLLOW_MULTISTEP_INSTRUCTIONS` | `comprehension.follow_multistep_instructions` | Reading/Listening | Student can follow multi-step instructions to completion |
| `REASONING.USE_EVIDENCE_TO_DECIDE` | `reasoning.use_evidence_to_decide` | Evidence-Based Reasoning | Student uses evidence (not guessing) to make decisions |
| `LEARNER_CALIBRATION.INITIAL_PROFILE` | `learner.calibration_initial_profile` | Learner Calibration | Initial calibration of learning style, cognitive load, and AI readiness |

The Mission Compiler resolves `masterySkillTarget` (lowercase) to `mastery_skill.id` at runtime by looking up `UPPER(key)` → `mastery_skills.code`.

---

### `skill_prerequisites`
_Directed prerequisite graph. Mission Compiler uses to sequence learning paths (ADR-021)._

| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| `skill_id` | `uuid` | NOT NULL, FK → mastery_skills.id | The downstream skill |
| `prerequisite_id` | `uuid` | NOT NULL, FK → mastery_skills.id | Must complete before skill_id |
| `strength` | `text` | NOT NULL, CHECK IN ('soft','hard') | `hard` = blocking prerequisite |
| `notes` | `text` | nullable | — |

**Constraints:** `UNIQUE(skill_id, prerequisite_id)`, `CHECK (skill_id <> prerequisite_id)`

---

### `standards`
_Florida CPALMS + L3ARN internal mastery standards (ADR-013, ADR-025). Schema supports national/global standards expansion._

| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| `source` | `standards_source` | NOT NULL | `'florida-cpalms' \| 'l3arn-internal' \| 'ccss' \| 'ngss'` |
| `code` | `text` | NOT NULL | e.g. `'MAFS.K.CC.1.1'` |
| `grade_level` | `grade_level` | NOT NULL | — |
| `subject_area` | `text` | NOT NULL, 1–100 chars | — |
| `strand` | `text` | nullable | e.g. `'Number Sense'` |
| `description` | `text` | NOT NULL | Official standard text |
| `plain_description` | `text` | nullable | Parent-friendly version |
| `is_active` / `version` | — | standard | — |

**Unique constraint:** `(source, code, grade_level)`

---

### `standard_skill_mappings`
_Maps standards to L3ARN mastery skills. Many-to-many. Mission Compiler uses for traceable evidence (ADR-021)._

| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| `standard_id` | `uuid` | NOT NULL, FK → standards.id | — |
| `skill_id` | `uuid` | NOT NULL, FK → mastery_skills.id | — |
| `alignment_type` | `text` | CHECK IN ('primary','supporting') | primary = main alignment |
| `notes` | `text` | nullable | — |

**Unique constraint:** `(standard_id, skill_id)`

---

### `mission_patterns`
_Reusable scaffolding templates. Defines structural shape of a mission class — not content. Content is compiled by the Mission Compiler using the three-part constraint (ADR-022)._

| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| `code` | `text` | UNIQUE, `^[A-Z][A-Z0-9_]{1,49}$` | e.g. `'MISSION_001_SORTING_COMPUTER'` |
| `supported_modes` | `delivery_mode[]` | NOT NULL | ADR-016/017 |
| `grade_band_min` / `grade_band_max` | `grade_level` | NOT NULL | — |
| `primary_domain_id` | `uuid` | nullable, FK → mastery_domains.id | null = domain-agnostic |
| `estimated_duration_min` | `integer` | NOT NULL, 5–120 | — |
| `step_template` | `jsonb` | NOT NULL | `{ steps: [{ id, type, description }] }` |
| `default_evidence_types` | `evidence_capture_type[]` | NOT NULL | — |
| `requires_parent_approval` | `boolean` | NOT NULL, DEFAULT false | ADR-012 gate flag |
| `parent_preview_notes` | `text` | nullable | Shown to parent before approval |

---

### `rubric_templates`
_Mastery evidence rubrics. Referenced by Mission Compiler when building evidence_plan output (ADR-016, ADR-026)._

| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| `skill_id` | `uuid` | NOT NULL, FK → mastery_skills.id | The skill being assessed |
| `criteria` | `jsonb` | NOT NULL | `{ emerging, developing, proficient, advanced }` descriptions |
| `passing_level` | `mastery_level` | NOT NULL, DEFAULT `'developing'` | Minimum to consider mission complete |
| `applicable_evidence_types` | `evidence_capture_type[]` | NOT NULL | — |
| `evidence_retention_days` | `integer` | NOT NULL, DEFAULT 365, 90–2190 | — |

---

### `ai_literacy_skills`
_Extension table for AI Literacy skills in Mission 001 and the AI Lab. Carries AI safety category, age-appropriate explanations (ADR-009), and mission step linkage (ADR-024)._

| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| `mastery_skill_id` | `uuid` | NOT NULL, UNIQUE, FK → mastery_skills.id | Links to the base skill |
| `ai_lab_room_id` | `text` | NOT NULL, DEFAULT `'ai-lab'` | Contextual room link |
| `mission_001_step_id` | `text` | nullable | Which Mission 001 step this skill first appears in |
| `ai_safety_category` | `text` | NOT NULL, CHECK | `'ai-error-detection' \| 'ai-bias-awareness' \| 'responsible-prompting' \| 'ai-vs-human-judgment' \| 'data-privacy' \| 'ai-literacy-general'` |
| `student_explanation` | `text` | NOT NULL | Age-appropriate for student |
| `parent_explanation` | `text` | NOT NULL | For parent reports |

---

### `evidence_templates`
_Templates for evidence capture points. Privacy invariants enforced at schema level: `webcam_required` and `face_capture_required` are `NOT NULL DEFAULT false` with `CHECK (= false)` — structurally impossible to enable (ADR-026)._

| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| `code` | `text` | UNIQUE, `^[A-Z][A-Z0-9_]{1,49}$` | e.g. `'EVT_DECISION_LOG'` |
| `capture_type` | `evidence_capture_type` | NOT NULL | See ENUM |
| `description` | `text` | NOT NULL | Internal description |
| `student_instructions` | `text` | NOT NULL | Shown to child at capture point |
| `parent_label` | `text` | NOT NULL | Shown in parent reports |
| `default_retention_days` | `integer` | NOT NULL, DEFAULT 365, 90–2190 | May be overridden by rubric |
| `parent_visible_default` | `boolean` | NOT NULL, DEFAULT true | — |
| `portfolio_eligible` | `boolean` | NOT NULL, DEFAULT false | Requires parent consent to enter portfolio |
| `audio_required` | `boolean` | NOT NULL, DEFAULT false | Only for `audio-response` type; Mission Compiler checks `audio_enabled` first |
| `webcam_required` | `boolean` | NOT NULL, DEFAULT false, **CHECK (= false)** | Privacy invariant: cannot be true |
| `face_capture_required` | `boolean` | NOT NULL, DEFAULT false, **CHECK (= false)** | Privacy invariant: cannot be true |

**`evidence_capture_type` ENUM:** `decision-log`, `sequence-completion`, `ai-mistake-check`, `explanation`, `reflection`, `artifact-upload`, `audio-response`, `structured-replay`, `screenshot`

---

## Shared ENUMs (Migration 001)

| ENUM | Values |
|------|--------|
| `house_name` | `'Valkryn'`, `'Lyrion'`, `'Novari'`, `'Cytrex'` |
| `grade_level` | `'K'`, `'1'` … `'8'` |
| `approval_mode` | `'high-control'`, `'balanced'`, `'autopilot'` |
| `delivery_mode` | `'3d'`, `'interactive-lite'`, `'text-audio-offline'` |
| `chat_mode` | `'quick-chat-only'`, `'moderated-free-text'` |
| `visibility_tier` | `'full'`, `'summary'`, `'safety-override'` |
| `session_entry_method` | `'parent-launch'`, `'avatar-pin-trusted-device'` |
| `consent_type` | `'coppa-data-collection'`, `'audio-push-to-talk'`, `'ai-interaction'`, `'model-improvement'`, `'moderated-free-text-chat'`, `'visibility-reduction'` |

---

## Open Questions

| # | Question | Blocking | Status |
|---|----------|---------|--------|
| OQ-001 | **Migration 003 table list** | Blocks Phase 1 learner adaptation | ✅ **RESOLVED** — Hero Slice Runtime table list confirmed (see Migration 003 section above). |
| OQ-002 | **Audit log table location** | Blocks admin tooling | ✅ **RESOLVED** — Two layers: `security_audit_events` in Migration 003 (core child data/safety events), `admin_audit_logs` in Migration 007 (admin console, kill switch, incident review). |
| OQ-003 | **Audit trigger sequencing** | Phase 0 launch risk | ✅ **RESOLVED** — Service-layer audit writes first. DB triggers added first for: parent consent changes, child permission changes, privacy settings changes, model-improvement preference changes, evidence deletion, child profile deletion. App/service-layer writes for all other events. |
| OQ-004 | **Co-parent invitation flow** | Multi-adult households | ✅ **RESOLVED** — MVP supports one primary parent/guardian only. `household_members` exists structurally. Co-parent invitation and custody-complexity flows are future features. No co-parent invitation in Hero Slice. |
| OQ-005 | **`state_code` validation** | Low risk | Open — API-level validation is acceptable. No DB CHECK constraint required for now. |
| OQ-006 | **Pseudonymous learner key rotation** | ADR-029 full compliance | ✅ **RESOLVED** — Export-batch pseudonymous learner keys. Production `child_profile_id` never enters model-training datasets. Join-back mapping in `pseudonymous_key_map` (Migration 006, restricted access). Quarterly rotation to be evaluated after first export batch. |
| OQ-007 | **`child_sessions.expires_at` in Migration 001** | Phase 1 child sessions | Open — `expires_at NOT NULL` and `revoked_at` must be added to `child_sessions` in Migration 001 before first deploy. Migration 001 predates this decision. |

---

_Migrations are numbered sequentially. Each migration is idempotent (uses `IF NOT EXISTS`). Never edit a deployed migration — write a new numbered migration instead._
