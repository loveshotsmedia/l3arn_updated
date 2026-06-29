# Agent 9 — Rewards / Moolah / Companion Growth

_Spec issued 2026-06-17 | Phase 1 — Rewards Economy Foundation_

---

## Clearance

Agent 9 is cleared to begin. Read Agent 8's spec first to understand the parent dashboard surface that will display reward data.

Read first:
- `docs/CONTEXT.md`
- `docs/architecture.md`
- `docs/sprint_map.md`
- `docs/agent_operating_rules.md`
- `docs/ADR/ADR-000-index.md`
- `docs/shared_contracts_spec.md`
- `docs/supabase_schema.md` §Rewards / Economy domain
- `docs/supabase_rls_policy_plan.md`
- `packages/shared-types/src/identity.schema.ts`
- `packages/shared-types/src/mission.schema.ts`
- `packages/shared-types/src/evidence.schema.ts`
- `infra/supabase/migrations/001_identity_household_consent.sql` (identity domain — RLS patterns to follow)
- `infra/supabase/migrations/002_curriculum_mastery_spine.sql` (curriculum domain — pattern reference)

---

## Wave 1 Guardrails

1. Next.js App Router is canonical.
2. Game progress and academic mastery are related but NOT identical (CONTEXT.md non-negotiable #8).
3. Rewards economy: split model — effort rewards (always available) + mastery-gated major progression.
4. No webcam, face capture, biometric path.
5. All persistent world changes must be: system-approved, reversible, logged, parent-visible when child-specific.
6. Add open questions instead of guessing.

---

## Product Decisions to Respect

From CONTEXT.md §6 (Approved Product Decisions):
- **#8:** Game progress and academic mastery are related but not identical.
- **#11:** Evidence-based mastery model drives academic progress.
- **#12:** Split reward economy: effort rewards + mastery-gated major progression.
- **#22:** Living Academy systems include Companion Grove Evolution, Moolah Market Economy, House Influence.

From architecture.md §8 (Data Model):
> Rewards / Economy: `moolah_wallets`, `moolah_ledger`, `xp_events`, `companion_growth_events`, `badges`, `house_points`

These tables do not yet exist — Agent 9 creates them.

---

## Scope

### Task 1 — Migration 004: Rewards Economy Schema

File: `infra/supabase/migrations/004_rewards_economy.sql`

Create these tables (follow the domain organization from migrations 001-003):

**moolah_wallets**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE`
- `balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0)`
- `lifetime_earned INTEGER NOT NULL DEFAULT 0`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- UNIQUE(`child_profile_id`)

**moolah_ledger**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE`
- `amount INTEGER NOT NULL` (positive = earned, negative = spent)
- `reason TEXT NOT NULL` (human-readable: "Mission 001 completion", "Companion accessory purchase")
- `source_type TEXT NOT NULL` (e.g. "mission-completion", "effort-reward", "mastery-unlock", "purchase", "admin-correction")
- `source_id UUID` (references mission_attempts, purchases, etc. — nullable initially)
- `balance_after INTEGER NOT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- Index on `child_profile_id, created_at DESC`

**xp_events**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE`
- `xp_amount INTEGER NOT NULL CHECK (xp_amount > 0)`
- `reason TEXT NOT NULL`
- `source_type TEXT NOT NULL` (e.g. "mission-attempt", "evidence-captured", "mastery-achieved", "streak")
- `source_id UUID`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

**badges**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `badge_key TEXT NOT NULL UNIQUE` (e.g. "ai-literacy-1", "mission-001-complete", "first-evidence")
- `name TEXT NOT NULL`
- `description TEXT NOT NULL`
- `mastery_gated BOOLEAN NOT NULL DEFAULT false` (if true, only awarded when mastery evidence exists)
- `house TEXT` (optional house affiliation)
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

**child_badges** (earned badge records, not in architecture.md but needed for normalization)
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE`
- `badge_id UUID NOT NULL REFERENCES badges(id)`
- `awarded_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `source_id UUID` (mission_attempts, mastery_records, etc.)
- UNIQUE(`child_profile_id, badge_id`)

**house_points**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE`
- `house TEXT NOT NULL`
- `points INTEGER NOT NULL CHECK (points >= 0)`
- `reason TEXT NOT NULL`
- `source_type TEXT NOT NULL`
- `source_id UUID`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- Index on `house, created_at DESC` (for house leaderboard queries)

**companion_growth_events**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `child_profile_id UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE`
- `companion_key TEXT NOT NULL` (matches companion_configs, e.g. "loomi", "charli")
- `event_type TEXT NOT NULL` (e.g. "bond-increase", "milestone-reached", "form-unlocked")
- `bond_delta INTEGER` (positive only)
- `bond_total INTEGER` (running total after event)
- `milestone_key TEXT` (optional: e.g. "first-mission", "100-bond", "trust-form")
- `source_id UUID`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

**RLS policies to write for all tables:**
- Child can read their own rows (child session scope via `current_child_profile_id()`)
- Parent can read rows for their children (via household ownership)
- Service role can insert/update all (Railway API only — no client writes to ledger)
- No client-side writes to `moolah_ledger` or `xp_events` — service role only

**Seed data:**
Insert the Mission 001 badge: `{ badge_key: "mission-001-complete", name: "Sorted!", description: "Completed Mission 001: Repair the Sorting Computer", mastery_gated: true }` and the first AI literacy badge: `{ badge_key: "ai-literacy-1", name: "AI Apprentice", description: "Demonstrated understanding that AI can be wrong and must be checked", mastery_gated: true }`.

**Acceptance criteria:**
- [ ] Migration runs cleanly against a fresh Supabase database
- [ ] All 6 tables created with correct constraints
- [ ] RLS policies prevent child session from reading sibling data
- [ ] RLS policies prevent direct client writes to `moolah_ledger`, `xp_events`, `companion_growth_events`
- [ ] Parent can read their children's wallets, ledger entries, badges, house points via Supabase RLS
- [ ] Seed badges inserted

### Task 2 — Zod contracts for rewards in shared-types

File: `packages/shared-types/src/rewards.schema.ts` (may already exist — read it first)

If the file exists, read it and verify it covers the above tables. If it's missing tables, extend it.

Must export (at minimum):
- `MoolahLedgerEntrySchema` / `MoolahLedgerEntry`
- `XPEventSchema` / `XPEvent`
- `BadgeSchema` / `Badge`
- `ChildBadgeSchema` / `ChildBadge`
- `HousePointEventSchema` / `HousePointEvent`
- `CompanionGrowthEventSchema` / `CompanionGrowthEvent`
- `MoolahWalletSchema` / `MoolahWallet`

Re-export from `packages/shared-types/src/index.ts`.

**Acceptance criteria:**
- [ ] All reward types are exported from `@l3arn/shared-types`
- [ ] Schemas match the migration table structure
- [ ] No duplicate type definitions across packages

### Task 3 — Mission 001 reward rules engine

File: `packages/mission-compiler/src/rewards/mission-001-reward-rules.ts` (new)

The Mission Compiler already produces a `reward_plan` output (see `compiler.ts`). Create a deterministic reward rules function for Mission 001:

```typescript
interface Mission001RewardResult {
  moolahEarned: number;
  xpEarned: number;
  badgesAwarded: string[];       // badge_keys
  housePointsEarned: number;
  companionBondDelta: number;
}

function computeMission001Rewards(params: {
  completedAllTasks: boolean;
  evidenceCaptured: boolean;
  masteryThresholdMet: boolean;
  deliveryMode: 'three-d' | 'interactive-lite' | 'text-audio-offline';
}): Mission001RewardResult
```

Rules (from sprint_map.md Mission 001 spec):
- Effort XP: 50 XP for any attempt; +25 XP if all tasks completed
- Starter Moolah: 25 Moolah for any completion
- First AI literacy badge: only if `masteryThresholdMet` is true
- Mission completion badge: only if `completedAllTasks` is true
- House points: 10 points for completion; +5 if evidence captured
- Companion bond: +15 delta on completion; +5 more if mastery met

**Acceptance criteria:**
- [ ] Function is pure (no side effects, no Supabase calls)
- [ ] Returns consistent results for the same inputs
- [ ] Mastery-gated badges only awarded when `masteryThresholdMet` is true
- [ ] Unit tests cover: all tasks complete + mastery, all tasks + no mastery, partial completion

### Task 4 — Reward display on parent dashboard (minimal)

Add to `apps/web/src/app/(parent)/dashboard/page.tsx`:
- Fetch `moolah_wallets` balance for each child
- Show Moolah balance on the child card ("🪙 25 Moolah")
- Show most recent badge earned (join `child_badges` + `badges`, order by `awarded_at DESC`, limit 1)

This requires migration 004 to be applied. Gate the display: if no wallet row exists, show "No rewards yet."

**Acceptance criteria:**
- [ ] Moolah balance shown on dashboard child card
- [ ] Most recent badge name shown (or "No badges yet")
- [ ] No crash if wallet/badge rows are absent

---

## What Agent 9 Must NOT Do

- Do not build the Moolah Market storefront (Sprint 3+)
- Do not build companion selection UI (that belongs to the student onboarding flow)
- Do not build house leaderboard (Sprint 3+)
- Do not allow client-side writes to `moolah_ledger` — only service role (Railway)
- Do not build any webcam/biometric feature

---

## Files Agent 9 May Touch

```
infra/supabase/migrations/004_rewards_economy.sql          — new
packages/shared-types/src/rewards.schema.ts                — new or extend
packages/shared-types/src/index.ts                         — add reward exports
packages/mission-compiler/src/rewards/mission-001-reward-rules.ts — new
apps/web/src/app/(parent)/dashboard/page.tsx               — minor reward display
docs/OPEN_QUESTIONS.md                                     — add new OQs
docs/ADR/ADR-000-index.md                                  — if decisions made
```
