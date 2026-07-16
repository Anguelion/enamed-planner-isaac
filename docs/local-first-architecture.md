# Arquitetura local-first do MVP

## Fonte oficial

A única pasta de desenvolvimento é:

`D:\Usuário\Isaac Sotero\Documents\ENAMED-GitHub\`

O arquivo `index.html` é a única entrada canônica. A cópia `enamed_planner.html` da pasta
offline é um artefato gerado por `pnpm offline:sync` e não deve ser editada manualmente.

## Fonte de verdade

O estado de gamificação vive exclusivamente em `state.gamification`. Ele é salvo no
armazenamento local junto do restante do planner e, quando há conta conectada, viaja dentro
do campo JSON `planner_states.data`. XP, importações e reversões funcionam sem tabelas ou
RPCs adicionais.

## Ledger relacional experimental

A flag `ENAMED_GAMIFICATION.FEATURE_FLAGS.relationalSync` permanece desativada por
padrão. A migration `supabase/migrations/20260715_gamification_mvp.sql` é experimental,
não foi aplicada e não é requisito do MVP. Não a execute no Supabase nesta fase.
