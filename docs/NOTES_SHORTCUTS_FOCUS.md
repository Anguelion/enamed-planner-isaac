# Anotações, atalhos e fixação do Pomodoro

Abra **📝 Anotações** na barra superior de qualquer tela. O painel lateral aparece sobre sua atividade, mantendo a aba, a posição e o vídeo atuais. Escreva e feche com **Esc** ou **×** para continuar imediatamente. **Alt+Shift+A** abre ou fecha o painel; **Alt+Shift+N** cria uma nota rápida. O seletor permite voltar a notas anteriores sem sair da atividade.

Use **Abrir pastas e abas** no painel ou **Alt+Shift+M** para abrir o explorador completo. Crie quantas anotações quiser, dê um nome e escreva livremente. As pastas usam a data de criação; renomear ou editar não muda a pasta. Cada documento pode ficar aberto em uma aba. Fechar a aba mantém o documento salvo na pasta. A busca encontra título e conteúdo em todas as datas.

O texto aceita listas `- item`, enumeração `1. item`, títulos `## Título`, negrito `**texto**` e itálico `*texto*`; os botões inserem essas marcações e a prévia mostra o resultado. Ctrl+B e Ctrl+I formatam a seleção. Exportar .md guarda uma cópia independente.

As alterações entram no estado da conta imediatamente e são gravadas após 450 ms sem digitação, ao fechar o painel/sair da página e na verificação periódica de 60 segundos. O indicador confirma a gravação local e avisa falhas. Estados grandes e backups usam compressão GZIP local sem remover campos; cópias antigas em JSON continuam legíveis. Os arquivos exportados e a nuvem permanecem em JSON comum. A recuperação de quota compacta backups anteriores sem apagá-los. As anotações participam do backup completo, da sincronização existente e da mesclagem por ID/data da edição mais recente. A nuvem depende de login e conexão, como o restante do programa.

## Teclado

**Ctrl+K** abre a central de atalhos, lista todas as abas e os controles disponíveis na tela. Cada ação recebe um número: Ctrl+K, número, Enter. Também é possível buscar pelo nome e selecionar com ↑/↓. Campos recebem foco; botões executam sua ação; ações que exigiam confirmação continuam exigindo.

Cada aba tem um atalho direto **Alt+Shift+tecla**, listado na central:

| Tecla | Aba | Tecla | Aba |
|---|---|---|---|
| 1 | Hoje | 2 | Radar Saúde |
| 3 | Plano de estudo | 4 | Videoaulas |
| 5 | Materiais | 6 | Questões |
| 7 | Simulados | 8 | Feynman |
| 9 | Caderno de erros | R | Flashcards |
| B | Biblioteca | D | Prescrição |
| H | Anatomia | S | Semiologia |
| E | ECG | G | Radiografia |
| V | Análise | U | Áreas |
| T | Histórico | Q | Adicionar questões |
| Z | Ferramentas | M | Explorador de anotações |
| C | Pendências | | |

- Alt+Shift+A: abrir/fechar anotações rápidas sem sair da atividade.
- Alt+Shift+N: nova anotação rápida.
- Alt+Shift+P: abrir/fechar Pomodoro.
- Alt+Shift+I / O: iniciar 25 / 50 minutos, quando não existe ciclo ativo.
- Alt+Shift+Espaço: pausar/continuar ciclo.
- Alt+Shift+X: encerrar ciclo.
- Ctrl+S no texto da anotação: gravar imediatamente.
- No vídeo, fora dos campos de edição: Espaço pausa; J acelera; F desacelera; 0 restaura 1×; ←/→ avançam ou recuam 10 segundos.
- Alt+←/→: histórico; Ctrl+Shift+L: tema; Ctrl+Shift+F: captura rápida de flashcard.

## Fixação no Windows

Inicie o servidor atualizado com **Abrir-Planner.bat**. O servidor compila automaticamente o companion local usando o compilador .NET do Windows; não exige instalação de pacotes, privilégio de administrador nem alterações permanentes nas políticas do sistema.

Antes de iniciar o ciclo, marque uma das caixas no Pomodoro:

- **Fixar esta tela**: mantém a aba atual e a janela do programa em tela cheia.
- **Fixar aplicativo**: mantém a janela em tela cheia, permitindo navegar pelas abas do programa.

Selecionar uma caixa desmarca a outra; ambas começam desmarcadas ao abrir o programa. O ciclo só inicia após a confirmação do componente local. Pausar, encerrar ou completar o foco libera a janela e o cursor. O intervalo fica livre; retomar o foco aplica a opção selecionada. Esc sai da tela cheia e pausa o ciclo.

O companion temporário bloqueia atalhos de troca de janela, restringe o cursor à janela e a mantém em primeiro plano. **Ctrl+Alt+Shift+F12** libera em emergência; o Pomodoro pausa ao detectar a liberação. Se a página ou servidor deixar de responder, o companion libera em até 12 segundos sem heartbeat. Os comandos locais exigem origem local, token temporário e identificador de sessão. Nenhuma tecla digitada é armazenada.

Esta é uma fixação de concentração, não um quiosque de segurança: Ctrl+Alt+Del e a área segura continuam sob controle do Windows. Na versão hospedada, o navegador não impede a troca de aplicativos; a interface informa que o recurso exige o iniciador local.
