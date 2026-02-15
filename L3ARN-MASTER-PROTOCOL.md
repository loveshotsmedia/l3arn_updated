# L3ARN Master Protocol (Updated Stack)

## Lovable (Frontend) + Supabase (DB/Auth) + Railway (API/Jobs) + Claude Code (Dev) + GHL (Backup Only)

## 0) What L3ARN is (Vision)

L3ARN is a **parent-led + student-driven** learning platform where:

* Parents onboard and set initial learning structure (goals, schedule, boundaries).
* Students learn through an **AI Companion** that:
  * starts with parent seed preferences,
  * but **evolves from student interaction data**,
  * adapting teaching tone/approach and reinforcement style over time.
* Teachers provide availability, sessions, and interventions.
* The system outputs daily plans, logs progress, and eventually supports compliance-style reporting (hours/days) by jurisdiction.

Core principle: **Parent config is the starting hypothesis; student behavior becomes ground truth.**

---

## 1) Stack Layout

### Frontend (Lovable)

* UI, routes, forms, state, navigation
* Calls Supabase directly for:
  * Auth
  * DB reads/writes (with RLS)
  * Storage
* Calls Railway for:
  * AI Help (rewrite suggestions)
  * Companion adaptation jobs
  * Compliance recommendation engine
  * Integrations

### Backend (Railway)

* API service + background workers/cron
* "Brains" layer for:
  * AI tools
  * adaptation pipelines
  * integrations (including GHL backup)

### Data + Auth (Supabase)

* Source of truth DB
* Auth & session handling
* RLS policies enforce ownership and role-based access

### Backup CRM (GoHighLevel)

* Only parent contact backup + minimal tags
* Never the source of truth

---

## 2) DOE Framework

### A) DIRECTIVES (Non-negotiables)

#### D1 — Roles + Ownership

* Roles: parent | student | teacher | admin
* Parents can only access:
  * their profile
  * their students
  * their students' prefs/schedules/companion config
* Teachers only access assigned students

#### D2 — Companion Evolution

* Parent sets initial "seed preferences"
* Student chooses the character
* Companion adapts continuously from interaction telemetry
* Changes are versioned + reversible

#### D3 — Testing Rule

Every change must include:

* **Build**
* **Test**
* **Pass/Fail criteria**
* **Rollback** (if applicable)

#### D4 — UX Non-Negotiables

* Every screen has a **Back** option (top-left) on desktop + mobile
* Every edit form:
  * pre-fills existing values
  * has **Save**
  * warns on unsaved changes

#### D5 — No "magic writes"

* Critical updates are logged (audit trail)

---

### B) OPERATORS (User flows)

#### O1 — Parent flow

* Signup/Login
* Parent onboarding wizard
* Add student(s)
* Set goals + schedule
* Parent chooses companion preferences
* Student chooses companion character
* Dashboard shows real stored data
* Edit preferences = prefilled + Save + warning

#### O2 — Student flow

* Select companion character
* Start sessions
* Interaction events logged (for adaptation)

#### O3 — Teacher flow

* Availability setup
* View assigned students
* Session notes + interventions

#### O4 — AI Help

* "AI Help" next to any free-text field
* 3 rewrite variants → parent picks → field fills

---

### C) ENGINE (Execution layer)

#### E1 — Supabase (Auth + RLS + DB)

* Direct Lovable→Supabase reads/writes permitted by RLS

#### E2 — Railway API

* AI Help endpoint
* Companion adaptation endpoint + background worker
* Compliance rules endpoint
* GHL sync job

#### E3 — Events

* Onboarding submitted
* Preferences updated
* Session completed
* Companion adjustment applied

---

## 3) Feature Map

### Phase 1 (Core MVP)

* Supabase Auth
* Parent onboarding wizard
* Parent dashboard (real data)
* Student creation + preferences + schedule
* Companion initial config
* Back button + save UX + unsaved warning

### Phase 2 (AI Help + Student Companion Selection)

* AI Help modal/service
* Student picks companion character
* Store config to DB

### Phase 3 (Sessions + Telemetry)

* Learning sessions
* Interaction stream events

### Phase 4 (Companion evolves)

* Adaptation pipeline + versioning + rollback

### Phase 5 (Teachers + compliance + reporting)

* Teacher availability + matching
* Compliance library (jurisdiction defaults)
* Reporting exports

---

## 4) Data Model (Supabase)

**Directive:** Use *one canonical student table* to avoid "children vs students" confusion.

### Canonical tables

* `profiles` (role + identity)
* `parent_profiles` (parent details)
* `parent_onboarding_status`
* `students` (canonical child table)
* `student_learning_prefs`
* `student_schedule_prefs`
* `companion_templates`
* `companion_configs`
* `companion_config_versions`
* `learning_sessions`
* `student_interactions`
* `ai_help_requests`
* `audit_log`

**Directive:** Deprecate `children` if it exists. Either:

* migrate to `students`, or
* turn `children` into a view, or
* delete after migration.

---

## 5) Screen Map (Lovable Routes)

### Parent

* `/dashboard/parent`
* `/onboarding/parent`
* `/settings/parent`
* `/students/new`
* `/students/:id`
* `/students/:id/preferences`
* `/students/:id/schedule`
* `/students/:id/companion`

### Student

* `/student/select-companion`
* `/student/session/:id`
* `/student/home`

### Teacher

* `/dashboard/teacher`
* `/availability`
* `/students/assigned`

### Admin

* `/admin/users`
* `/admin/audit`
* `/admin/companion-templates`

---

## 6) UX Rules to Implement in Lovable

* Back button **top-left** always
* Edit preferences:
  * **prefill**
  * Save button
  * Unsaved warning
* Phone number required
* Country dropdown changes state options (reset states)
* "Weekly target minutes" renamed to:
  * **Weekly learning target (minutes)** with tooltip:
  * "Used to plan sessions. We'll recommend defaults based on your state later."

---

## 7) Railway API Contracts

* `GET /health`
* `POST /ai/help` (rewrite suggestions)
* `GET /compliance/recommendations`
* `POST /companion/adapt`
* `POST /integrations/ghl/sync-parent`

---

## 8) Naming + File Architecture (Lovable Project)

Lovable will generate the app structure, but enforce:

* `src/lib/supabase.ts` → creates client
* `src/lib/api.ts` → Railway API wrapper
* `src/lib/domain/*` → parent/student/session/companion logic
* `src/types/*` → shared types
* `src/components/*` → reusable UI components
* `src/pages/*` or `src/routes/*` → page-level components (Lovable's convention)

---

## 9) Build Roadmap (Where we should be building next)

### Phase 0 — Foundation Reset (NOW)

**Goal:** Make the platform stable and predictable with the new stack.

#### 0.1 Supabase baseline schema + RLS

**Build**

* Create canonical tables (above)
* Add RLS policies
* Add profile bootstrap trigger (optional)

**Test**

* Signup/login works
* Parent can insert/select their own parent_profile
* Parent cannot read another user's data

#### 0.2 Railway API skeleton

**Build**

* `/health`
* `/ai/help` stub

**Test**

* /health returns 200
* /ai/help returns JSON

#### 0.3 Lovable frontend baseline

**Build**

* Login/signup pages
* Route guard
* Parent dashboard page connected to Supabase

**Test**

* login persists session
* dashboard loads profile for current user
