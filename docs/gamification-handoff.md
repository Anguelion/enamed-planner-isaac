# Gamificação ENAMED - handoff

## Arquitetura ativa

- Fonte de verdade: `state.gamification`, persistida junto ao estado local do planner.
- Tentativas reais de simulado: `state.simuladoRuns`.
- `state.simulados`: resumo editável e compatibilidade com dados antigos; não determina recompensas novas.
- Ledger: `state.gamification.xpTransactions`, com idempotência por evento.
- Supabase relacional: desativado por `FEATURE_FLAGS.relationalSync = false`; nenhuma migration ou RPC é requisito.

## Campos confiáveis de uma tentativa

As tentativas em `state.simuladoRuns` possuem:

- `id`: identificador único da tentativa (`attemptId`).
- `sourceSimulationId` ou `importedSimId`: identifica o simulado de origem.
- `questionIds`: questões da prova.
- `answers`: resposta marcada por questão.
- `finishedAt`: conclusão efetiva.
- `abandonedAt`: cancelamento sem recompensa.
- `elapsedSeconds`, `questionSeconds`: tempo total e por questão.
- `reviewedErrors`: marcação explícita por questão errada.
- `confidence`, `firstAnswers` e `answerHistory`: confiança e qualidade da decisão.

Acertos, erros e nota são derivados das respostas e do gabarito pelo `simuladoResult()`. Abrir o resultado não marca erros como revisados.

## Eventos idempotentes

- Conclusão: `simulation-completion:{attemptId}`.
- Correção integral: `simulation-review:{attemptId}`.
- Fragmento: `simulation-fragment:{attemptId}`.
- Recompensa: `simulation-element-reward:{attemptId}`.
- Questão interna: `simulation:{attemptId}:question:{questionId}`.

## Regras implementadas

- Mínimo de 10 questões e todas respondidas para o bônus de conclusão.
- Tentativa abandonada ou incompleta não concede bônus, fragmento ou recompensa.
- Bônus específico limitado a 300 XP, com breakdown no ledger.
- Repetição do mesmo simulado dentro da janela configurada recebe multiplicador reduzido.
- Cada erro precisa ser marcado explicitamente; somente a correção integral libera fragmento e roleta.
- Três fragmentos formam um medalhão automaticamente.
- Um medalhão pode substituir no máximo um bloco por faixa, até três vezes globalmente.
- Imperador exige 30 blocos acadêmicos reais.
- Recompensas elementais são sorteadas uma vez, salvas seladas e ativadas somente ao revelar.
- Buffs usam o maior multiplicador da categoria, respeitam abertura/expiração e cap global x1,50.
- Simulados históricos não ativam buffs automaticamente; Baús Legado exigem preview e confirmação.

## Elementos

- Fogo: questões.
- Água: videoaulas.
- Terra: leituras e resumos.
- Ar: flashcards.

Atividades sem mapeamento elemental, incluindo o próprio bônus do simulado, não recebem buff.

## Limitações intencionais

- Sem streak completo, Prestígio, marketplace, multiplayer ou ranking.
- Sem animação complexa e sem arte final das classes.
- Baús Legado possuem serviço de domínio e testes, mas não ganharam um fluxo visual dedicado nesta fase.
- A sincronização continua sendo a do objeto `state`; não há ledger relacional ativo.
