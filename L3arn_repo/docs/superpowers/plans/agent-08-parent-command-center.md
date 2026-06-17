# Agent 8 — Parent Command Center

_Spec issued 2026-06-17 | Phase 0 → Phase 1 bridge_

---

## Clearance

Agent 8 is cleared to begin. No blockers remain.

Read first:
- `docs/CONTEXT.md`
- `docs/architecture.md`
- `docs/sprint_map.md`
- `docs/agent_operating_rules.md`
- `docs/ADR/ADR-000-index.md`
- `docs/shared_contracts_spec.md`
- `docs/supabase_schema.md`
- `docs/supabase_rls_policy_plan.md`
- `packages/shared-types/src/identity.schema.ts`
- `packages/shared-types/src/ai.schema.ts`
- `apps/web/src/app/(parent)/dashboard/page.tsx` (existing — extend this)
- `apps/web/src/app/(parent)/reports/[childId]/page.tsx` (existing — extend this)
- `apps/web/src/app/(parent)/onboarding/permissions/page.tsx` (existing — understand what's wired)
- `services/ai-workers/src/utils/visibility-tier.helper.ts` (new — YOUR source of truth for parentVisibilityTier defaults)

---

## Wave 1 Guardrails

1. Next.js App Router is canonical — no pages/ directory.
2. House belongs on `academy_identities.house`, never `child_profiles`.
3. `pre_sorting` is the pre-ceremony house state — display it gracefully (e.g. "Awaiting Sorting Ceremony").
4. AI outputs must use structured output + Zod validation before reaching any parent-visible surface.
5. AI retry limit is 3. Safe fallback must never be AI-generated.
6. No webcam, face capture, biometric path, or always-on microphone anywhere.
7. **parentVisibilityTier is backend-assigned** (see §OQ-C below — critical for this agent).
8. `/api/missions/compile` requires auth before staging — do not call it unauthenticated from parent app.
9. Add open questions instead of guessing. Do not redesign product architecture.

---

## OQ-C Resolution — parentVisibilityTier (Critical for Agent 8)

`parentVisibilityTier` is **not** a DB DEFAULT. It is assigned by the Railway backend at child-profile creation and onboarding completion using this function:

```typescript
// services/ai-workers/src/utils/visibility-tier.helper.ts
resolveDefaultVisibilityTier(gradeLevel: string, hasActiveSafetyFlag = false): VisibilityTier
// K–5 → "full" | 6–8 → "summary" | safety flag active → always "full"
```

**Agent 8 rules:**
- Display parentVisibilityTier from `child_permissions.parent_visibility_tier` (read from Supabase).
- If the column is NULL for a row (existing data from Phase 0 before the function was wired), derive display using `resolveDefaultVisibilityTier(grade, false)` as a frontend fallback — never store the derived value from the frontend.
- Parent may override to a **stricter** tier only. Never allow the parent to choose a looser tier than the backend default.
- Permitted override direction: `full → summary`, `full → safety-override`, `summary → safety-override`. Never `summary → full` unless a backend admin action clears a safety flag.
- When the parent changes their visibility preference, POST it to the Railway API (Sprint 1). In Phase 1, write directly to `child_permissions.parent_visibility_tier` via Supabase only if a server action or Edge Function validates the override direction. Do not allow a raw frontend write of `full` when the default is `summary`.

---

## Scope

Build only this. Do not touch rewards, evidence, or admin surfaces.

### Task 1 — Extend parent dashboard child cards

File: `apps/web/src/app/(parent)/dashboard/page.tsx`

The existing dashboard fetches `child_profiles` + `academy_identities`. Extend it to also fetch `child_permissions` and `parent_curriculum_prefs` for each child.

Add to each child card:
1. **Visibility tier badge** — show "Full View" (green) / "Summary View" (amber) / "Safety Override" (red) based on `child_permissions.parent_visibility_tier`. If NULL, derive using `resolveDefaultVisibilityTier`.
2. **Curriculum snapshot** — 2-line summary: subject focus (from `parent_curriculum_prefs.subject_focus[]`) + approval mode (from `parent_curriculum_prefs.curriculum_approval_mode`). Link to full curriculum settings.
3. **House badge** — existing behavior is correct; add display text for `pre_sorting` ("Awaiting Sorting").
4. **Start Session** — keep the existing Phase 1 placeholder but make it visually clear it's not yet active. Do not remove the placeholder — Agent 10 or a later agent will wire it.

**Acceptance criteria:**
- [ ] Dashboard loads children with their visibility tiers
- [ ] NULL visibility tier is displayed using the derived default (no blank/crash)
- [ ] `pre_sorting` house displays "Awaiting Sorting" instead of "House pre_sorting"
- [ ] Curriculum subject focus and approval mode show for children with `parent_curriculum_prefs` rows (gracefully handles NULL/no row yet)
- [ ] RLS: parent only sees their own children's data (existing RLS already enforces this — verify it holds for `child_permissions` and `parent_curriculum_prefs` joins)

### Task 2 — Visibility tier override panel

File: `apps/web/src/app/(parent)/dashboard/page.tsx` (or extract to a child settings panel)

Add a "Settings" or "Configure" action on each child card. Opens an inline panel or modal with:
1. Visibility tier selector — radio group: Full / Summary / Safety Override. Only show options that are stricter than or equal to the current default for that child's grade.
2. Save button writes to `child_permissions.parent_visibility_tier` via Supabase (client-side, service-role NOT needed here — parent owns the row via RLS).

**Validation to enforce:**
- If `resolveDefaultVisibilityTier(grade)` returns `"summary"`, hide the `"full"` option entirely.
- Always show the current value as selected.

**Acceptance criteria:**
- [ ] Parent can change visibility from "full" to "summary" for K–5 child
- [ ] Parent cannot select "full" for Grade 7 child (default is "summary")
- [ ] Save updates `child_permissions.parent_visibility_tier` in Supabase
- [ ] Page reflects new value after save without full reload

### Task 3 — Reports page shell

File: `apps/web/src/app/(parent)/reports/[childId]/page.tsx`

Read the existing file first. Evaluate what's already there.

The full Unified First Learning Map is Agent 10's deliverable. Agent 8's job here is to:
1. Ensure the reports page loads the child's name, house, grade, and visibility tier correctly.
2. Add a placeholder section for "Learning Progress" and "Evidence Highlights" with a note "Evidence and reports will appear here after Mission 001 completion" — do not hardcode fake data.
3. Show curriculum preferences summary (subjects, approval mode) — data is available from `parent_curriculum_prefs`.
4. Show current visibility tier with a link to change it (linking to the settings panel from Task 2).

**Acceptance criteria:**
- [ ] Reports page shows correct child identity (display name, house, grade)
- [ ] Visibility tier is displayed correctly
- [ ] Curriculum preferences are shown if the row exists
- [ ] No fake evidence data — placeholder sections only
- [ ] Page does not crash if child has no `parent_curriculum_prefs` row

### Task 4 — Curriculum preferences edit link

The existing `apps/web/src/app/(parent)/onboarding/curriculum/page.tsx` is the canonical curriculum edit screen. Add a link from the dashboard child card and from the reports page to:
```
/parent/onboarding/curriculum?childId=<uuid>
```
(The curriculum page may need to accept a `childId` query param — check the existing implementation and add it if missing.)

**Acceptance criteria:**
- [ ] Dashboard child card has a "Curriculum settings" link
- [ ] Reports page has a "Curriculum settings" link
- [ ] Both link to the correct child's curriculum settings

---

## What Agent 8 Must NOT Do

- Do not build reward display (Agent 9 scope)
- Do not build evidence/mastery records display (Agent 10 scope)
- Do not build Founder Mission Control (Agent 11 scope)
- Do not create new Supabase migrations (existing tables are sufficient for this scope)
- Do not allow parent to set `full` visibility for Grade 6–8 children via frontend
- Do not store `parentVisibilityTier` derived values from the frontend

---

## Open Questions to Document (Do Not Guess)

If you encounter any of these, add an open question to `docs/OPEN_QUESTIONS.md` instead of inventing an answer:

- Session launch API contract (what does POST `/sessions/start` return?)
- `parent_curriculum_prefs` upsert flow when parent edits during post-onboarding (create or update?)
- Whether visibility tier override should fire a parent notification or audit log entry
- Whether `child_permissions.parent_visibility_tier` column exists in migration 001 — verify before writing

---

## Files Agent 8 May Touch

```
apps/web/src/app/(parent)/dashboard/page.tsx         — extend
apps/web/src/app/(parent)/reports/[childId]/page.tsx  — extend
apps/web/src/app/(parent)/onboarding/curriculum/page.tsx — minor (add childId param support)
docs/OPEN_QUESTIONS.md                                — add new OQs
docs/ADR/ADR-000-index.md                             — if any new decisions are made
```

Do not create new pages or routes for this sprint.
