# Ajustes para uso pessoal — 30/09/2026

- A abertura não executa a limpeza de atividades desde 11/08. A ação permanece disponível explicitamente nas ferramentas, com confirmação e backup obrigatório.
- Exclusões já registradas em aparelhos antigos continuam sendo respeitadas pelo merge da sincronização.
- Navegação principal: Hoje, Blocos, Revisões, Simulados, Progresso, Biblioteca e Ferramentas. Recursos associados ficam em grupos expansíveis; o celular tem cinco atalhos e o menu Mais.
- Painel essencial por padrão. Gamificação, tutor e mensagens motivacionais são opcionais em Ferramentas, por aparelho; dados existentes são preservados.
- Radar Saúde separado em JS/CSS carregados sob demanda, com data e aviso após 14 dias. Atualizar relê a edição disponível; não produz notícias novas.
- SDK Supabase 2.57.4 distribuído localmente com sua licença MIT e precacheado. A abertura offline continua dependendo de ter aberto o site e seus módulos online anteriormente; login novo precisa de rede.
- Mensagens de salvamento alinhadas com sincronização automática.
- Ícones carregados após DOMContentLoaded são preenchidos imediatamente.
- Cache de navegação não é substituído por respostas HTTP de erro. Atualizações removem apenas caches do próprio planner.
- Relatório de curadoria: `reports/question-duplicates-review.json`. São 673 repetições em 630 grupos; 404 grupos têm diferenças no enunciado literal, alternativas ou gabarito. Nenhuma questão foi excluída, evitando quebrar IDs associados ao histórico.

## Validação

Executar `npm test`, `npm run lint`, `npm run build` e `npm run health-news:check`. O build confere os módulos novos. Testes incluem preservação de respostas recentes, preferências inválidas, rotas, SDK local, fallback offline e erros HTTP.

As alterações são locais. Não foi realizada publicação ou modificação do banco Supabase. A reorganização ampla do restante de planner.js e a curadoria clínica dos grupos divergentes exigem trabalho específico; a modularização desta rodada cobre a apresentação pessoal e o Radar Saúde.
