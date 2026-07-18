-- Faz o Postgres ser a unica fonte de verdade para planner_states.updated_at,
-- em vez de confiar no relogio de cada aparelho (PC/celular podem estar
-- dessincronizados, o que pode fazer um aparelho decidir "nao ha nada novo"
-- e nunca puxar uma edicao mais recente feita em outro aparelho).
create or replace function public.set_planner_states_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_planner_states_updated_at on public.planner_states;

create trigger trg_planner_states_updated_at
before insert or update on public.planner_states
for each row execute function public.set_planner_states_updated_at();
