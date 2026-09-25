-- Torna reproduzível a tabela principal usada pelo planner e garante que cada
-- usuário autenticado só consiga acessar o próprio estado.
create table if not exists public.planner_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.planner_states enable row level security;

revoke all on public.planner_states from anon;
grant select, insert, update, delete on public.planner_states to authenticated;

drop policy if exists planner_states_own on public.planner_states;
create policy planner_states_own on public.planner_states
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
