# Auditoria de gamificação

## Arquitetura encontrada

- Aplicação PWA estática em HTML, CSS e JavaScript vanilla.
- Estado principal em `localStorage`, sob a chave `enamed-planner-v3`.
- Sincronização do estado completo em JSONB pela tabela Supabase `planner_states`.
- Autenticação pelo Supabase Auth; não há ORM, backend próprio nem sistema de rotas de servidor.
- Questões, vídeos, flashcards, simulados e cronograma são módulos do mesmo estado e dos catálogos estáticos.
- O projeto não possuía suíte automatizada, gerenciador de build, lint ou typecheck configurados.

## Decisão técnica

A fundação foi adicionada sem substituir o estado existente: um módulo de domínio puro calcula XP e nível, enquanto o estado local guarda uma cópia local-first do ledger. Uma migration aditiva cria o ledger autoritativo e funções RPC no Supabase. As RPCs recalculam XP no servidor e ignoram valores finais enviados pelo cliente.

O progresso acadêmico continua derivado dos critérios existentes do planner. XP não conclui aulas ou blocos. A retroatividade usa prévia explícita, lotes idempotentes e reversões compensatórias, preservando o histórico imutável.

## Lacunas anteriores relevantes

- Total de XP editável não seria auditável; por isso foi adotado ledger.
- O único armazenamento remoto era um documento JSONB, sem garantia relacional por evento.
- Não havia endpoint seguro para validar regras de XP.
- Não havia mecanismo de dry-run, idempotência ou reversão de importação histórica.
- Não havia comandos automatizados de teste ou validação do pacote estático.
