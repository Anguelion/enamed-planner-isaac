# ENAMED Planner — Relatório de Handoff (atualizado 2026-09-17)

Documento de contexto completo para qualquer programa/agente retomar o trabalho do zero.

## 1. O que é o projeto

PWA local-first (HTML/CSS/JS puro, sem framework/build step) que Isaac Sotero (estudante
de medicina) está construindo sozinho para se preparar para o ENAMED 2026. Não é apenas
um planner de estudos: inclui banco de questões, simulados, flashcards (SRS/SM-2),
gamificação (XP/RPG), biblioteca de materiais (PDFs convertidos em Markdown com figuras),
biblioteca de vídeos, simulador de ECG e módulo de radiografia — todos construídos do zero
pelo próprio Isaac (não são bibliotecas de terceiros).

## 2. Localização e as 3 "versões" do app

| Versão | Caminho / URL | Observações |
|---|---|---|
| Repo canônico (editar aqui) | `D:\Usuário\Isaac Sotero\Documents\ENAMED-GitHub` | git repo, `github.com/Anguelion/enamed-planner-isaac`, branch `main` |
| Offline | `D:\Usuário\Isaac Sotero\Documents\ENAMED\enamed_planner.html` (fora deste git repo) | gerado por `npm run offline:sync`; servido em `http://127.0.0.1:8765/enamed_planner.html` via `tools/offline_server.py` (fora deste repo), iniciado por `iniciar_planner_offline.bat` |
| Online | `https://enamed-planner-isaac.pages.dev/#/painel` | Cloudflare Pages, auto-deploy no push para `origin/main` (algo já commita/pusha automaticamente durante as sessões — não é o Claude fazendo isso) |

Isaac usa as 3: **o tablet (Galaxy Tab S9+) é o dispositivo principal de estudo**, além de
celular Android. Objetivo final é sync bidirecional completo entre offline/online — ainda
não 100% pronto (ver seção 6).

## 3. Estrutura de pastas do repo

```
ENAMED-GitHub/
├── index.html                  # ÚNICA fonte HTML canônica — nunca editar enamed_planner.html
├── service-worker.js           # PWA offline caching
├── manifest.webmanifest
├── official_schedule.json      # cronograma oficial do curso (30 blocos)
├── package.json                # scripts: lint, test, build, offline:sync, questions:audit
├── assets/                     # todo o JS/CSS da aplicação (sem módulos ES, tudo globals)
│   ├── planner.js              # arquivo principal — state, render, toda lógica (maior arquivo)
│   ├── planner-ux.js           # UX helpers (ENAMED_PLANNER_UX)
│   ├── gamification.js         # XP/RPG (ENAMED_GAMIFICATION)
│   ├── app-icons.js            # ícones (ENAMED_ICONS)
│   ├── planner.css             # todo o CSS
│   ├── ecg-simulator.js        # simulador de ECG próprio
│   ├── radiografia.js / radiografia-aulas.js
│   ├── semiologia.js / semiologia-aulas.js
│   └── audio/ ecg-real/ fonts/ icons/ radio-real/ rpg/ semiologia-real/
├── question_bank/              # 50.465 questões válidas; .js consumidos pelo app e .json usados pela importação/auditoria
├── imported_simulados/         # simulados completos de provas passadas (ENARE 2022-24, ENAMED autoral, etc.) + index.json (só o que está listado aqui aparece no app)
├── materials_library/          # 1021 pastas, uma por tópico/material (ex: alimentacao-infantil/), cada uma com content.md + document.json + figuras .webp
├── video_library/catalog.json  # catálogo de vídeo-aulas (referencia arquivos .mp4 que ficam fora do repo, hospedados/consumidos via Cloudflare R2)
├── data/                       # motivation_messages.json, prescription_catalog.json
├── docs/                       # gamification-audit.md, gamification-handoff.md, local-first-architecture.md (+ este arquivo)
├── scripts/                    # audit-question-bank.js, build-icons.js, sync-offline-entry.js, import-medevo-especialidades.js
├── tools/                      # audit_question_answers.js, scripts Python de extração/importação de questões
├── tests/                      # *.test.js (Node --test), planner-sandbox.js, verify-static-build.js
├── supabase/migrations/        # gamificação experimental, timestamp de sync, perfil do tutor IA e RLS de planner_states
├── supabase_backups_setup.sql / supabase_materials_storage_setup.sql  # SQL rodado manualmente por Isaac no console Supabase
├── imported_simulados/, archive/, trash/, tmp/  # pastas de apoio/histórico
└── .claude/launch.json         # configs de dev server local (portas 8765-8768, 8793-8795)
```

Fora deste repo, no PC do Isaac:
- `D:\Usuário\Isaac Sotero\Documents\ENAMED\` — cópia offline (`enamed_planner.html`) + `tools/offline_server.py` + `iniciar_planner_offline.bat`.
- Pasta separada (não documentada em detalhe) com o curso pago completo de 30 blocos (vídeo-aulas + materiais originais em PDF/vídeo) — fonte de onde `materials_library/` e `video_library/catalog.json` foram extraídos/curados. `video_library/catalog.json` cita `"source": "E:\\MedCof 2026"`.
- Cloudflare R2 bucket com os vídeos essenciais (não o curso completo, por causa do custo).

## 4. Stack técnica

- **Frontend**: vanilla JS (sem módulos ES — tudo via globals), vanilla CSS, HTML gerado dinamicamente por `planner.js` em 21 `<section class="view">` vazias no `index.html` (roteamento client-side por `ui.tab`).
- **Persistência**: `state` único em `localStorage['enamed-planner-v3']`, sincronizado como JSONB para a tabela Supabase `planner_states` (merge last-write-wins por campo top-level via `mergePlannerActivityState`).
- **Backend**: Supabase (Auth + Postgres). Sem servidor próprio.
- **Build/test**: Node.js puro (`node --test`, `node --check` para lint), sem bundler/transpiler. `npm run build` roda `build-icons` + `audit-question-bank` + `verify-static-build`.
- **Deploy**: Cloudflare Pages (auto-deploy on push; configuração principal provavelmente no dashboard). Há GitHub Actions para enriquecer questões de Hematologia e validar lint, testes e build antes de publicar o lote.
- **Package manager**: npm (não pnpm — resolvido ambiguidade em 2026-07-23).

## 5. Como rodar localmente

```bash
npm install
npm test          # roda tests/*.test.js
npm run lint       # node --check em todos os arquivos principais
npm run build      # build-icons + audit-question-bank + verify-static-build
```

Servidores de dev configurados em `.claude/launch.json` (todos via `py -3 -m http.server`):
- `planner-offline` (porta 8765) — serve a cópia offline fora do repo, com suporte a Range requests para vídeo.
- `planner-repo-dev`/`dev2`/`dev3` (portas 8766-8768) — servem este repo (mas `fetch()` para `imported_simulados/index.json` etc. só funciona se servido, não abrindo o `index.html` direto do disco).
- `ecg-dev` (8793), `radio-dev`/`radio-dev2` (8794/8795) — dev de módulos isolados.

## 6. Estado conhecido / pendências (ver memória `project_architecture.md` para detalhes técnicos linha-a-linha)

Resolvidos recentemente: allowlist de origem para cloud sync, suíte automatizada de testes,
consolidação de 4 gerações de `:root` CSS, mensagem de erro de login
genérica, bug de digitação sendo interrompida por polling de sync, bug do botão "Refazer"
não resetando estado da questão, sync de `simuladoRuns`/`simulados` corrigido, sync de
texto e imagens da aba "materiais" corrigido, recálculo de acerto depois de editar um
gabarito, banco sem IDs duplicados e `pnpm-lock.yaml` órfão removido.

Pendências abertas:
- A primeira execução da nova sincronização offline cria `.enamed-offline-sync-manifest.json`. Depois disso, ela remove com segurança somente arquivos obsoletos que constavam no manifesto anterior; arquivos pessoais fora do manifesto são preservados. Resíduos anteriores à primeira execução ainda podem exigir conferência manual única.
- O banco tem 673 conteúdos repetidos, tratados como aviso de curadoria; IDs duplicados agora interrompem a auditoria e a publicação automática.
- A migração `20260917_planner_states_rls.sql` versiona a proteção por usuário da tabela `planner_states`, mas ainda precisa ser aplicada ao Supabase de produção pelo responsável do projeto.
- `__restore_backup.json` está versionado no Git e contém um backup pessoal. Remover apenas o arquivo atual não apaga o histórico; uma limpeza de histórico exige autorização explícita e coordenação antes de reescrever o repositório remoto.
- Schema relacional experimental de gamificação (`supabase/migrations/20260715_gamification_mvp.sql`) existe mas está **desativado** (`FEATURE_FLAGS.relationalSync = false`) — não aplicar sem instrução explícita.

## 7. Convenções de trabalho já validadas com o Isaac

- Sempre verificar/entender a causa raiz contra o código-fonte antes de propor um fix (não assumir).
- Mudanças de layout/comportamento relevantes devem ser validadas nas versões offline E online, não só uma.
- Anunciar explicitamente quando uma tarefa/missão está concluída.

---
*Gerado automaticamente a pedido do Isaac para dar contexto de retomada a qualquer outro programa/agente. Fonte: leitura direta do repositório + memória de sessões anteriores (verificar código atual antes de confiar em qualquer afirmação específica de arquivo/linha, pois pode ter mudado).*
