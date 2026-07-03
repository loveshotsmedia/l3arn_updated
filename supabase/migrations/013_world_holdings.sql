-- supabase/migrations/013_world_holdings.sql
-- World holdings: mastery-gated buildings unlocked in the 3D Academy.
-- ADR-011 (mastery-gated progression) / ADR-019 (living world state) /
-- spec §3.4 "Mastery Makes the World" — a holding unlocks on demonstrated
-- mastery of a specific mission/objective, never on points or currency.

create table if not exists world_holdings (
  id uuid primary key default gen_random_uuid(),
  child_profile_id uuid not null references child_profiles(id) on delete cascade,
  holding_id text not null,          -- e.g. 'fractions-observatory' — matches MasteryBuilding's holdingId prop
  unlocked_by_mission_id text not null,
  unlocked_at timestamptz not null default now(),
  unique (child_profile_id, holding_id)
);

alter table world_holdings enable row level security;

-- Service role only — the frontend never writes this table directly (ADR-031
-- pattern, same as academy_identities/companion_profiles).
create policy world_holdings_service_role_all
  on world_holdings
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Parents can read their own child's holdings (ADR-008 parent visibility).
-- Uses public.auth_owns_household(household_id) over child_profiles — the same
-- SECURITY DEFINER helper household_members' own parent-read policy uses
-- (001_identity_household_consent.sql:369). NOTE: the plan's original snippet
-- joined household_members.user_id, which does NOT exist on that table
-- (its columns are id, household_id, parent_account_id, role, invited_at,
-- accepted_at — see 001:347). auth_owns_household is the correct abstraction.
create policy world_holdings_parent_read
  on world_holdings
  for select
  using (
    child_profile_id in (
      select id from public.child_profiles
      where public.auth_owns_household(household_id)
    )
  );
