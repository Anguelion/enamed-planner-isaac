-- SÓqueroMed / ENAMED - Gamificação MVP (Fases 1 e base da Fase 2)
-- Execute no Supabase SQL Editor. A migration é aditiva e não altera planner_states.

create extension if not exists pgcrypto;

create table if not exists public.gamification_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cached_total_xp numeric(14,2) not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  streak_shields integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gamification_rules (
  rule_key text not null,
  version text not null,
  value jsonb not null,
  active_from timestamptz not null default now(),
  active_to timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  primary key (rule_key, version)
);

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('preview','committed','reverted','failed')),
  source text not null,
  original_filename text,
  fingerprint text not null,
  preview_json jsonb not null default '{}'::jsonb,
  committed_at timestamptz,
  reverted_at timestamptz,
  totals_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, fingerprint)
);

create table if not exists public.import_rows (
  id bigint generated always as identity primary key,
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  row_number integer not null,
  raw_json jsonb not null default '{}'::jsonb,
  normalized_json jsonb not null default '{}'::jsonb,
  status text not null check (status in ('accepted','rejected','committed','reverted')),
  error_message text,
  external_key text,
  unique (import_batch_id, row_number)
);

create table if not exists public.xp_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null,
  source_type text not null,
  source_id text not null,
  source_event_id text not null,
  base_xp numeric(12,2) not null,
  element_multiplier numeric(6,4) not null default 1,
  streak_multiplier numeric(6,4) not null default 1,
  balance_multiplier numeric(6,4) not null default 1,
  final_multiplier numeric(6,4) not null default 1,
  final_xp numeric(12,2) not null,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  import_batch_id uuid references public.import_batches(id),
  is_legacy boolean not null default false,
  unique (user_id, source_type, source_id, reason, source_event_id)
);

create index if not exists xp_transactions_user_occurred_idx on public.xp_transactions (user_id, occurred_at desc);
create index if not exists xp_transactions_user_source_idx on public.xp_transactions (user_id, source_type, source_id, occurred_at desc);
create index if not exists xp_transactions_import_batch_idx on public.xp_transactions (import_batch_id) where import_batch_id is not null;

insert into public.gamification_rules (rule_key, version, value, metadata) values
  ('question.answer','mvp-1','2'::jsonb,'{"unit":"xp"}'::jsonb),
  ('question.correct','mvp-1','3'::jsonb,'{"unit":"xp"}'::jsonb),
  ('question.reviewed_error','mvp-1','3'::jsonb,'{"unit":"xp"}'::jsonb),
  ('question.consolidation','mvp-1','1'::jsonb,'{"unit":"xp"}'::jsonb),
  ('question.repeat_under_24h','mvp-1','0.2'::jsonb,'{"unit":"multiplier"}'::jsonb),
  ('question.repeat_under_7d','mvp-1','0.5'::jsonb,'{"unit":"multiplier"}'::jsonb),
  ('flashcard.due_review','mvp-1','1'::jsonb,'{"unit":"xp"}'::jsonb),
  ('video.per_minute','mvp-1','0.4'::jsonb,'{"unit":"xp"}'::jsonb),
  ('video.completion','mvp-1','5'::jsonb,'{"unit":"xp","threshold":0.9}'::jsonb),
  ('simulation.completion_base','mvp-1','50'::jsonb,'{"unit":"xp"}'::jsonb),
  ('simulation.per_question','mvp-1','0.5'::jsonb,'{"unit":"xp"}'::jsonb),
  ('simulation.review_per_error','mvp-1','2'::jsonb,'{"unit":"xp"}'::jsonb),
  ('simulation.review_cap','mvp-1','100'::jsonb,'{"unit":"xp"}'::jsonb),
  ('simulation.bonus_cap','mvp-1','300'::jsonb,'{"unit":"xp"}'::jsonb),
  ('block.completion','mvp-1','100'::jsonb,'{"unit":"xp"}'::jsonb),
  ('multiplier.cap','mvp-1','1.5'::jsonb,'{"unit":"multiplier"}'::jsonb)
on conflict (rule_key, version) do nothing;

alter table public.gamification_profiles enable row level security;
alter table public.xp_transactions enable row level security;
alter table public.import_batches enable row level security;
alter table public.import_rows enable row level security;
alter table public.gamification_rules enable row level security;

revoke all on public.gamification_profiles, public.xp_transactions, public.import_batches, public.import_rows from anon;
revoke insert, update, delete on public.xp_transactions from authenticated;
grant select on public.gamification_profiles, public.xp_transactions, public.gamification_rules to authenticated;
grant select, insert, update on public.import_batches, public.import_rows to authenticated;

drop policy if exists gamification_profiles_select_own on public.gamification_profiles;
create policy gamification_profiles_select_own on public.gamification_profiles for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists xp_transactions_select_own on public.xp_transactions;
create policy xp_transactions_select_own on public.xp_transactions for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists gamification_rules_read on public.gamification_rules;
create policy gamification_rules_read on public.gamification_rules for select to authenticated using (true);
drop policy if exists import_batches_own on public.import_batches;
create policy import_batches_own on public.import_batches for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists import_rows_own on public.import_rows;
create policy import_rows_own on public.import_rows for all to authenticated
using (exists (select 1 from public.import_batches b where b.id=import_batch_id and b.user_id=(select auth.uid())))
with check (exists (select 1 from public.import_batches b where b.id=import_batch_id and b.user_id=(select auth.uid())));

create or replace function public.block_xp_transaction_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'xp_transactions é um ledger imutável; use uma transação de reversão';
end;
$$;

drop trigger if exists xp_transactions_immutable on public.xp_transactions;
create trigger xp_transactions_immutable before update or delete on public.xp_transactions
for each row execute function public.block_xp_transaction_mutation();

create or replace function public.process_study_event(p_event jsonb)
returns public.xp_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_activity text := nullif(trim(p_event->>'activity_type'),'');
  v_source_type text := nullif(trim(p_event->>'source_type'),'');
  v_source_id text := nullif(trim(p_event->>'source_id'),'');
  v_source_event text := nullif(trim(p_event->>'source_event_id'),'');
  v_reason text := nullif(trim(p_event->>'reason'),'');
  v_occurred timestamptz := coalesce(nullif(p_event->>'occurred_at','')::timestamptz, now());
  v_metadata jsonb := coalesce(p_event->'metadata','{}'::jsonb);
  v_base numeric(12,2) := 0;
  v_repeat numeric(6,4) := 1;
  v_previous timestamptz;
  v_batch uuid := nullif(p_event->>'import_batch_id','')::uuid;
  v_legacy boolean := coalesce((p_event->>'is_legacy')::boolean,false);
  v_result public.xp_transactions;
  v_question_answer numeric := coalesce((select (value #>> '{}')::numeric from public.gamification_rules where rule_key='question.answer' and active_from<=now() and (active_to is null or active_to>now()) order by active_from desc limit 1),2);
  v_question_correct numeric := coalesce((select (value #>> '{}')::numeric from public.gamification_rules where rule_key='question.correct' and active_from<=now() and (active_to is null or active_to>now()) order by active_from desc limit 1),3);
  v_question_review numeric := coalesce((select (value #>> '{}')::numeric from public.gamification_rules where rule_key='question.reviewed_error' and active_from<=now() and (active_to is null or active_to>now()) order by active_from desc limit 1),3);
  v_question_consolidation numeric := coalesce((select (value #>> '{}')::numeric from public.gamification_rules where rule_key='question.consolidation' and active_from<=now() and (active_to is null or active_to>now()) order by active_from desc limit 1),1);
  v_repeat_24 numeric := coalesce((select (value #>> '{}')::numeric from public.gamification_rules where rule_key='question.repeat_under_24h' and active_from<=now() and (active_to is null or active_to>now()) order by active_from desc limit 1),0.2);
  v_repeat_7d numeric := coalesce((select (value #>> '{}')::numeric from public.gamification_rules where rule_key='question.repeat_under_7d' and active_from<=now() and (active_to is null or active_to>now()) order by active_from desc limit 1),0.5);
  v_flashcard_review numeric := coalesce((select (value #>> '{}')::numeric from public.gamification_rules where rule_key='flashcard.due_review' and active_from<=now() and (active_to is null or active_to>now()) order by active_from desc limit 1),1);
  v_video_minute numeric := coalesce((select (value #>> '{}')::numeric from public.gamification_rules where rule_key='video.per_minute' and active_from<=now() and (active_to is null or active_to>now()) order by active_from desc limit 1),0.4);
  v_video_completion numeric := coalesce((select (value #>> '{}')::numeric from public.gamification_rules where rule_key='video.completion' and active_from<=now() and (active_to is null or active_to>now()) order by active_from desc limit 1),5);
  v_block_completion numeric := coalesce((select (value #>> '{}')::numeric from public.gamification_rules where rule_key='block.completion' and active_from<=now() and (active_to is null or active_to>now()) order by active_from desc limit 1),100);
  v_simulation_base numeric := coalesce((select (value #>> '{}')::numeric from public.gamification_rules where rule_key='simulation.completion_base' and active_from<=now() and (active_to is null or active_to>now()) order by active_from desc limit 1),50);
  v_simulation_per_question numeric := coalesce((select (value #>> '{}')::numeric from public.gamification_rules where rule_key='simulation.per_question' and active_from<=now() and (active_to is null or active_to>now()) order by active_from desc limit 1),0.5);
  v_simulation_review_per_error numeric := coalesce((select (value #>> '{}')::numeric from public.gamification_rules where rule_key='simulation.review_per_error' and active_from<=now() and (active_to is null or active_to>now()) order by active_from desc limit 1),2);
  v_simulation_review_cap numeric := coalesce((select (value #>> '{}')::numeric from public.gamification_rules where rule_key='simulation.review_cap' and active_from<=now() and (active_to is null or active_to>now()) order by active_from desc limit 1),100);
  v_simulation_bonus_cap numeric := coalesce((select (value #>> '{}')::numeric from public.gamification_rules where rule_key='simulation.bonus_cap' and active_from<=now() and (active_to is null or active_to>now()) order by active_from desc limit 1),300);
  v_total_questions numeric := 0;
  v_correct_answers numeric := 0;
  v_reviewed_errors numeric := 0;
  v_performance_bonus numeric := 0;
begin
  if v_user is null then raise exception 'Autenticação obrigatória'; end if;
  if v_activity is null or v_source_type is null or v_source_id is null or v_source_event is null or v_reason is null then
    raise exception 'Evento de estudo incompleto';
  end if;
  if v_occurred > now() + interval '5 minutes' then raise exception 'Data do evento inválida'; end if;
  if v_batch is not null and not exists (
    select 1 from public.import_batches where id=v_batch and user_id=v_user
  ) then
    raise exception 'Lote de importação não pertence ao usuário autenticado';
  end if;

  select * into v_result from public.xp_transactions
  where user_id=v_user and source_type=v_source_type and source_id=v_source_id and reason=v_reason and source_event_id=v_source_event;
  if found then return v_result; end if;

  if v_activity in ('question_answer','question_session') then
    if v_activity='question_session' and v_legacy then
      v_base := greatest(0,coalesce((v_metadata->>'questions')::numeric,0))*v_question_answer
        + greatest(0,coalesce((v_metadata->>'correctAnswers')::numeric,0))*v_question_correct
        + greatest(0,coalesce((v_metadata->>'reviewedErrors')::numeric,0))*v_question_review;
    else
      v_base := v_question_answer;
      if coalesce((v_metadata->>'correct')::boolean,false) then v_base := v_base+v_question_correct;
      elsif coalesce((v_metadata->>'reviewedError')::boolean,false) then v_base := v_base+v_question_review;
      end if;
      if coalesce((v_metadata->>'consolidation')::boolean,false) then v_base := v_base+v_question_consolidation; end if;
      select occurred_at into v_previous from public.xp_transactions
      where user_id=v_user and source_type='question' and source_id=v_source_id and activity_type='question_answer' and occurred_at<v_occurred
      order by occurred_at desc limit 1;
      if v_previous is not null and v_occurred-v_previous<interval '24 hours' then v_repeat:=v_repeat_24;
      elsif v_previous is not null and v_occurred-v_previous<interval '7 days' then v_repeat:=v_repeat_7d;
      end if;
    end if;
  elsif v_activity='question_error_review' then
    if not coalesce((v_metadata->>'reviewedError')::boolean,false) then raise exception 'Revisão de erro inválida'; end if;
    v_base := v_question_review;
  elsif v_activity in ('flashcard_review','flashcard_session') then
    if v_activity='flashcard_session' and v_legacy then
      v_base := greatest(0,coalesce((v_metadata->>'flashcards')::numeric,0))*v_flashcard_review;
    else
      v_base := v_flashcard_review;
    end if;
  elsif v_activity='video_progress' then
    if v_source_type='legacy_aggregate' then
      v_base := greatest(0,coalesce((v_metadata->>'minutes')::numeric,0))*v_video_minute;
    else
      v_base := least(14400,greatest(0,coalesce((v_metadata->>'seconds')::numeric,0)))/60*v_video_minute;
    end if;
  elsif v_activity='video_completion' then
    v_base := v_video_completion;
  elsif v_activity='simulation_completion' then
    if v_source_type='legacy_aggregate' then
      v_base := greatest(0,coalesce((v_metadata->>'simulations')::numeric,0))*v_simulation_base;
    else
      if not coalesce((v_metadata->>'completed')::boolean,false) then raise exception 'Simulado não concluído'; end if;
      v_total_questions := greatest(0,coalesce((v_metadata->>'totalQuestions')::numeric,0));
      v_correct_answers := least(v_total_questions,greatest(0,coalesce((v_metadata->>'correctAnswers')::numeric,0)));
      v_reviewed_errors := greatest(0,coalesce((v_metadata->>'reviewedErrors')::numeric,0));
      v_performance_bonus := case
        when v_total_questions=0 then 0
        when v_correct_answers/v_total_questions>=0.9 then 50
        when v_correct_answers/v_total_questions>=0.8 then 40
        when v_correct_answers/v_total_questions>=0.7 then 30
        when v_correct_answers/v_total_questions>=0.6 then 20
        when v_correct_answers/v_total_questions>=0.5 then 10
        else 0 end;
      v_base := least(v_simulation_bonus_cap,v_simulation_base+v_simulation_per_question*v_total_questions+v_performance_bonus+least(v_simulation_review_cap,v_reviewed_errors*v_simulation_review_per_error));
    end if;
  elsif v_activity='block_completion' then
    v_base := case when v_source_type='legacy_aggregate' then greatest(0,coalesce((v_metadata->>'blocksCompleted')::numeric,0))*v_block_completion else v_block_completion end;
  elsif v_activity='import_reversal' then
    if not v_legacy or v_batch is null then raise exception 'Reversão inválida'; end if;
    v_base := least(0,coalesce((v_metadata->>'reversalXP')::numeric,0));
  else
    raise exception 'Tipo de atividade não permitido no MVP: %',v_activity;
  end if;

  v_base := round(v_base*v_repeat,2);
  insert into public.xp_transactions (
    user_id,activity_type,source_type,source_id,source_event_id,base_xp,
    element_multiplier,streak_multiplier,balance_multiplier,final_multiplier,final_xp,
    reason,metadata,occurred_at,import_batch_id,is_legacy
  ) values (
    v_user,v_activity,v_source_type,v_source_id,v_source_event,v_base,
    1,1,1,1,v_base,v_reason,v_metadata || jsonb_build_object('repetitionMultiplier',v_repeat),v_occurred,v_batch,v_legacy
  ) on conflict (user_id,source_type,source_id,reason,source_event_id) do nothing
  returning * into v_result;

  if v_result.id is null then
    select * into v_result from public.xp_transactions
    where user_id=v_user and source_type=v_source_type and source_id=v_source_id and reason=v_reason and source_event_id=v_source_event;
  end if;

  insert into public.gamification_profiles (user_id,cached_total_xp,updated_at)
  values (v_user,(select coalesce(sum(final_xp),0) from public.xp_transactions where user_id=v_user),now())
  on conflict (user_id) do update set cached_total_xp=excluded.cached_total_xp,updated_at=now();
  return v_result;
end;
$$;

create or replace function public.revert_gamification_import(p_batch_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_batch public.import_batches;
  v_count integer := 0;
  original public.xp_transactions;
begin
  if v_user is null then raise exception 'Autenticação obrigatória'; end if;
  select * into v_batch from public.import_batches where id=p_batch_id and user_id=v_user for update;
  if not found then raise exception 'Lote não encontrado'; end if;
  if v_batch.reverted_at is not null then return 0; end if;
  for original in select * from public.xp_transactions where import_batch_id=p_batch_id and activity_type<>'import_reversal' loop
    insert into public.xp_transactions (user_id,activity_type,source_type,source_id,source_event_id,base_xp,final_xp,reason,metadata,occurred_at,import_batch_id,is_legacy)
    values (v_user,'import_reversal','import_batch',p_batch_id::text,'revert:'||original.id,-original.final_xp,-original.final_xp,'legacy_import_reverted',jsonb_build_object('reversesTransactionId',original.id),now(),p_batch_id,true)
    on conflict (user_id,source_type,source_id,reason,source_event_id) do nothing;
    if found then v_count:=v_count+1; end if;
  end loop;
  update public.import_batches set status='reverted',reverted_at=now() where id=p_batch_id;
  insert into public.gamification_profiles (user_id,cached_total_xp,updated_at)
  values (v_user,(select coalesce(sum(final_xp),0) from public.xp_transactions where user_id=v_user),now())
  on conflict (user_id) do update set cached_total_xp=excluded.cached_total_xp,updated_at=now();
  return v_count;
end;
$$;

revoke all on function public.process_study_event(jsonb) from public;
revoke all on function public.revert_gamification_import(uuid) from public;
grant execute on function public.process_study_event(jsonb) to authenticated;
grant execute on function public.revert_gamification_import(uuid) to authenticated;
