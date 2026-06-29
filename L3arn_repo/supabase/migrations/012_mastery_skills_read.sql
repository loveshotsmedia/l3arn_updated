-- Migration 012: allow authenticated users to read the mastery_skills catalog.
--
-- WHY: The parent "First Learning Map" report joins mastery_records ->
-- mastery_skills to show human-readable skill names (e.g. "Can catch AI
-- mistakes") instead of raw skill UUIDs. The report runs in the browser with
-- the parent's authenticated client, so RLS applies. mastery_skills had RLS
-- enabled but no SELECT policy, so the client query returned 0 rows and the UI
-- fell back to showing the UUID.
--
-- mastery_skills is non-sensitive REFERENCE DATA (skill code, name,
-- parent_friendly_name, description, grade band). It contains no child-specific
-- or PII data, so it is safe for any authenticated user to read.
--
-- Idempotent: safe to re-run.

alter table public.mastery_skills enable row level security;

drop policy if exists "mastery_skills_authenticated_read" on public.mastery_skills;

create policy "mastery_skills_authenticated_read"
  on public.mastery_skills
  for select
  to authenticated
  using (true);
