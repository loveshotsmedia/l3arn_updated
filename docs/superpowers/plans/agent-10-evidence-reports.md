# Agent 10 — Evidence + Parent Reports

_Spec issued 2026-06-17 | Phase 1 — Evidence Capture + Unified First Learning Map_

---

## Clearance

Agent 10 is cleared to begin. Coordinate with Agent 8 (dashboard shell) and Agent 9 (rewards schema) — you will write to the reports surface Agent 8 established, and your mastery records will trigger rewards logic Agent 9 defined.

Read first:
- `docs/CONTEXT.md`
- `docs/architecture.md`
- `docs/sprint_map.md`
- `docs/agent_operating_rules.md`
- `docs/ADR/ADR-000-index.md`
- `docs/shared_contracts_spec.md`
- `docs/supabase_schema.md`
- `packages/shared-types/src/evidence.schema.ts`
- `packages/shared-types/src/mission.schema.ts`
- `packages/shared-types/src/ai.schema.ts`
- `packages/shared-types/src/identity.schema.ts`
- `packages/mission-compiler/src/compiler.ts` (understand the `evidenceRequirements` and `calibrationSignals` output)
- `packages/mission-compiler/src/outputs/calibration-signals.ts`
- `infra/supabase/migrations/001_identity_household_consent.sql` (RLS patterns)
- `infra/supabase/migrations/002_curriculum_mastery_spine.sql` (standards and mastery tables)
- `apps/web/src/app/(parent)/reports/[childId]/page.tsx` (existing shell — extend this)

---

## Wave 1 Guardrails

1. No webcam, face capture, biometric path. Evidence capture must not use any of these.
2. Evidence: structured learning events auto-captured; parent-consented highlights. No raw webcam/voice biometrics.
3. `noWebcam: z.literal(true)`, `noFaceCapture: z.literal(true)`, `noVoiceBiometrics: z.literal(true)` are invariants in `evidence.schema.ts` — every evidence event must respect them.
4. Raw AI output never reaches parent without validation envelope.
5. Evidence privacy: child data de-identified in any aggregate view; never expose legal name in evidence records.
6. `parentVisibilityTier` controls what the parent sees: `"full"` = all evidence; `"summary"` = aggregate only, no raw interaction logs; `"safety-override"` = full regardless of tier.
7. Add open questions instead of guessing.

---

## Product Decisions to Respect

From CONTEXT.md §6:
- **#29:** First Proof Report = Unified First Learning Map with evidence highlights.
- **#30:** Evidence capture = structured learning events auto-captured; parent-consented highlights; no webcam/face features.
- **#31:** Audio = parent-controlled push-to-talk only; no always-on mic, biometrics, voice ID.

From sprint_map.md Mission 001 spec:
> Evidence: Decision logs, completed sequence, AI-mistake check, explanation/reflection, optional audio response, structured replay/screenshot
> Parent output: Unified First Learning Map and Learner Calibration Score

---

## Scope

### Task 1 — Migration 005: Evidence + Reports Schema

File: `infra/supabase/migrations/005_evidence_reports.sql`

Create these tables (from architecture.md §8, Evidence / Reports domain):

**learning_evidence_events**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE`
- `mission_attempt_id UUID` (nullable — evidence can be standalone)
- `event_type TEXT NOT NULL` — matches `EvidenceCaptureType` from `evidence.schema.ts`: `decision-log | sequence-completion | ai-mistake-check | explanation | reflection | artifact-upload | audio-response | structured-replay | screenshot`
- `content_json JSONB` (structured event data — never raw AI output, never PII)
- `mastery_skill_id UUID` (optional FK to `mastery_skills` from migration 002)
- `confidence_score NUMERIC(4,3)` (0.000–1.000)
- `no_webcam BOOLEAN NOT NULL DEFAULT true` (mirrors `evidence.schema.ts` invariant)
- `no_face_capture BOOLEAN NOT NULL DEFAULT true`
- `no_voice_biometrics BOOLEAN NOT NULL DEFAULT true`
- `captured_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `parent_consented_highlight BOOLEAN NOT NULL DEFAULT false` (parent-approved portfolio item)

**mission_replay_events** (sequence of what happened during a mission, for parent review)
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE`
- `mission_attempt_id UUID NOT NULL`
- `sequence_index INTEGER NOT NULL`
- `event_type TEXT NOT NULL`
- `payload_json JSONB`
- `occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()`

**mastery_records** (persistent achievement records)
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE`
- `mastery_skill_id UUID NOT NULL REFERENCES mastery_skills(id)`
- `mastery_level TEXT NOT NULL` — matches `MasteryLevel`: `emerging | developing | proficient | advanced`
- `evidence_event_ids UUID[] NOT NULL DEFAULT '{}'` (proof chain)
- `assessed_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `assessed_by TEXT NOT NULL DEFAULT 'mission-compiler'` (who/what determined this)
- UNIQUE(`child_profile_id, mastery_skill_id`) — one record per child per skill, update in place

**parent_reports** (generated Unified First Learning Map)
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE`
- `report_type TEXT NOT NULL DEFAULT 'unified-first-learning-map'`
- `generated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `mission_attempt_id UUID`
- `content_json JSONB NOT NULL` (structured report — never raw AI output)
- `ai_output_envelope_id UUID` (FK to the audit envelope that produced this — nullable for manually assembled reports)
- `visibility_tier_at_generation TEXT NOT NULL` (snapshot of parentVisibilityTier when generated)

**portfolio_items** (parent-consented highlights)
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE`
- `evidence_event_id UUID REFERENCES learning_evidence_events(id)`
- `title TEXT NOT NULL`
- `description TEXT`
- `parent_consented BOOLEAN NOT NULL DEFAULT false`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

**RLS policies:**
- Child session: read own `learning_evidence_events` and `mission_replay_events` (for in-session use); no write (service role only writes evidence)
- Parent: read `learning_evidence_events`, `mastery_records`, `parent_reports`, `portfolio_items` for their children
- Parent: CANNOT read `learning_evidence_events` where `parent_visibility_tier = "summary"` unless `parent_consented_highlight = true` — implement this as a policy condition
- Service role: insert/update all tables

**Acceptance criteria:**
- [ ] Migration runs cleanly
- [ ] All tables created with correct constraints
- [ ] `no_webcam`, `no_face_capture`, `no_voice_biometrics` columns default to `true` and cannot be set to `false` by client
- [ ] Parent cannot read raw interaction logs when their visibility tier is "summary" (RLS enforced)
- [ ] Service role can write evidence events

### Task 2 — Evidence Zod contracts in shared-types

File: `packages/shared-types/src/evidence.schema.ts` (extend existing file)

Read the existing file. It already defines `LearningEvidenceEventSchema`, `MasteryRecordSchema`, `ArtifactSchema`, `PortfolioItemSchema`, `MissionReplayEventSchema`. Verify:
- All schemas match migration 005 table structure
- `EvidenceCaptureTypeSchema` is exported
- `MasteryLevelSchema` is exported (canonical source — it exists in `mission.schema.ts`, re-exported from `evidence.schema.ts`)

Add if missing:
- `ParentReportSchema` / `ParentReport`
- `ParentReportTypeSchema: z.enum(["unified-first-learning-map"])`

**Acceptance criteria:**
- [ ] All evidence types exported from `@l3arn/shared-types`
- [ ] No duplicate type definitions

### Task 3 — Mission 001 evidence capture helper

File: `packages/mission-compiler/src/evidence/mission-001-evidence-capture.ts` (new)

Define the structured evidence schema for each Mission 001 task (matching the evidence plan from `compiler.ts` output). This is a static spec — no AI calls.

```typescript
interface Mission001EvidenceSpec {
  taskId: string;
  taskName: string;
  evidenceCaptureType: EvidenceCaptureType;
  masterySkillTarget: string;      // mastery_skills.skill_key (e.g. "ai-literacy-mistakes")
  parentVisible: boolean;
  consentRequired: boolean;
  retentionDays: number;           // 0 = session only, 365 = 1 year, -1 = permanent
}
```

Produce the spec array for all Mission 001 tasks (use the calibration signals from `calibration-signals.ts` as reference — the tasks map to: sort-red, explain-rule, plus sequence/reflection tasks).

**Acceptance criteria:**
- [ ] Function returns typed array of `Mission001EvidenceSpec`
- [ ] Each task has a `masterySkillTarget` that matches an expected `mastery_skills.skill_key`
- [ ] `consentRequired: true` for any audio response item
- [ ] All items have `parentVisible: true` except internal diagnostic events

### Task 4 — Unified First Learning Map assembly

File: `services/ai-workers/src/reports/unified-first-learning-map.ts` (new)

A function that assembles the Unified First Learning Map from structured data. This is NOT an AI call — it assembles from evidence records and the AI output envelope.

```typescript
async function assembleUnifiedFirstLearningMap(params: {
  childProfileId: string;
  missionAttemptId: string;
  parentVisibilityTier: VisibilityTier;
}): Promise<ParentReport>
```

What it includes (from sprint_map.md):
1. Academic proof: mastery records for Mission 001 skills (standards aligned)
2. Learner calibration: calibration signals from the mission attempt (cognitive load, AI readiness, persistence, delivery mode preference)
3. Game progress: Moolah earned, XP, badges awarded, House points, companion bond delta
4. Evidence highlights: parent-consented items from `portfolio_items` (if any)
5. Next path: recommended next missions (static for Mission 001 — output "continue to Mission 002")

**Visibility gate:** if `parentVisibilityTier === "summary"`, exclude raw interaction logs; include only aggregate mastery level and calibration summary.

**Acceptance criteria:**
- [ ] Function assembles report from real Supabase data (no fake data)
- [ ] Summary tier excludes raw interaction logs
- [ ] Full tier includes calibration signals and evidence highlights
- [ ] Function is callable from the Railway API (export it from the service)
- [ ] No raw AI output in the report (all AI output enters via `AIOutputEnvelope`)

### Task 5 — Parent reports page: Unified First Learning Map display

File: `apps/web/src/app/(parent)/reports/[childId]/page.tsx`

Read the existing file first. Replace placeholder sections with real data from `parent_reports` + `mastery_records` + `child_badges` (from Agent 9's migration 004).

Display:
1. Child info header (display name, house, grade) — already in Agent 8's shell
2. Academic proof section: mastery records table (skill name, mastery level, evidence count)
3. Calibration summary: 3–4 signal summaries (reading vs. listening preference, cognitive load, AI readiness, persistence) — summary view shows text only; full view shows values
4. Game progress: Moolah balance, XP, badges, house points — read from Agent 9's tables
5. Evidence highlights: portfolio items list (title, description, type)
6. Next path: static "Next: Mission 002 — [to be announced]" until mission library is built

Gate every section: if no `parent_reports` row exists for this child, show "Mission 001 not yet completed." Do not hardcode fake data.

**Acceptance criteria:**
- [ ] Page renders real mastery records when they exist
- [ ] Page shows "Mission 001 not yet completed" when no report row exists
- [ ] Summary visibility tier hides raw interaction logs
- [ ] Full visibility tier shows calibration signal values
- [ ] No crash if Agent 9 tables (moolah, badges) don't have rows yet

---

## What Agent 10 Must NOT Do

- Do not build learning intelligence / de-identification pipeline (future phase)
- Do not build real-time evidence streaming (Sprint 3+)
- Do not store audio recordings without explicit parent consent marker (`consentRequired` check)
- Do not allow client-side evidence event writes (service role only)
- Do not set `no_webcam`, `no_face_capture`, `no_voice_biometrics` to false anywhere

---

## Files Agent 10 May Touch

```
infra/supabase/migrations/005_evidence_reports.sql                    — new
packages/shared-types/src/evidence.schema.ts                          — extend
packages/shared-types/src/index.ts                                    — add exports
packages/mission-compiler/src/evidence/mission-001-evidence-capture.ts — new
services/ai-workers/src/reports/unified-first-learning-map.ts         — new
apps/web/src/app/(parent)/reports/[childId]/page.tsx                  — extend
docs/OPEN_QUESTIONS.md                                                — add new OQs
docs/ADR/ADR-000-index.md                                             — if decisions made
```
