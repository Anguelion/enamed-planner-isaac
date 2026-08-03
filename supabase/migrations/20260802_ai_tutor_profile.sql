create table if not exists public.ai_tutor_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{"events":[],"reviews":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.ai_tutor_profiles enable row level security;
revoke all on public.ai_tutor_profiles from anon;
grant select, insert, update on public.ai_tutor_profiles to authenticated;

drop policy if exists ai_tutor_profiles_own on public.ai_tutor_profiles;
create policy ai_tutor_profiles_own on public.ai_tutor_profiles
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

