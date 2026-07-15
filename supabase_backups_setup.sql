-- Execute uma vez no Supabase: SQL Editor > New query > Run.
create table if not exists public.planner_backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Backup do planner',
  data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists planner_backups_user_created_idx
  on public.planner_backups (user_id, created_at desc);

alter table public.planner_backups enable row level security;

revoke all on table public.planner_backups from anon;
grant select, insert, update, delete on table public.planner_backups to authenticated;

drop policy if exists "Ler os proprios backups" on public.planner_backups;
create policy "Ler os proprios backups"
on public.planner_backups for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Criar os proprios backups" on public.planner_backups;
create policy "Criar os proprios backups"
on public.planner_backups for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Atualizar os proprios backups" on public.planner_backups;
create policy "Atualizar os proprios backups"
on public.planner_backups for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Apagar os proprios backups" on public.planner_backups;
create policy "Apagar os proprios backups"
on public.planner_backups for delete
to authenticated
using ((select auth.uid()) = user_id);
