'use strict';

// Testes de regressao para os problemas relatados pelo usuario nesta sessao:
// ordem dos flashcards, perda de estado no F5 (merge + gravacao local +
// digitacao lenta), clique nas alternativas bloqueado pelo marca-texto, saida
// do modo foco e retry automatico de sincronizacao. Usa o mesmo sandbox de vm
// que tests/planner-merge.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadPlannerSandbox } = require('./planner-sandbox.js');

// Objetos vindos do sandbox de vm pertencem a outro "realm": seus Array/Object
// nao sao os mesmos construtores deste processo, entao assert.deepEqual falha
// por identidade de protótipo mesmo com valores iguais. Mesma tecnica usada em
// tests/planner-merge.test.js.
const plain = value => JSON.parse(JSON.stringify(value));

test('limpeza de materiais preserva todas as linhas de tabelas Markdown', () => {
  const ctx = loadPlannerSandbox();
  const source = '| Parâmetro | Ferropriva | Doença Crônica |\n| --- | --- | --- |\n| Ferritina | Baixa | Normal/Alta |\n| TIBC | Alto | Baixo |\n\nTexto após a tabela | sem virar coluna';
  const cleaned = ctx.cleanMaterialExtraction(source);
  assert.match(cleaned,/\| Ferritina \| Baixa \| Normal\/Alta \|/);
  assert.match(cleaned,/\| TIBC \| Alto \| Baixo \|/);
  assert.match(cleaned,/Texto após a tabela sem virar coluna/);
  const html = ctx.renderMaterialMarkdown(cleaned,{id:'table-test'});
  assert.match(html,/<tbody><tr><td[^>]*>Ferritina<\/td><td[^>]*>Baixa<\/td><td[^>]*>Normal\/Alta<\/td><\/tr>/);
});

test('índice de materiais encontra aula, subtítulo e palavras do conteúdo', () => {
  const ctx = loadPlannerSandbox();
  const doc = {
    id:'busca-material',
    title:'Anemias Microcíticas',
    topic:'Avaliação do Hemograma',
    area:'Clínica Médica',
    headings:[{text:'Diagnóstico diferencial pela ferritina'}],
    searchText:'hepcidina ferroportina reticulocitos tratamento'
  };
  const entry=ctx.buildMaterialSearchEntry(doc);
  assert.equal(ctx.materialSearchEntryMatches(entry,['anemias']),true);
  assert.equal(ctx.materialSearchEntryMatches(entry,['hemograma']),true);
  assert.equal(ctx.materialSearchEntryMatches(entry,['diagnostico','ferritina']),true);
  assert.equal(ctx.materialSearchEntryMatches(entry,['hepcidina','tratamento']),true);
  assert.equal(ctx.materialSearchEntryMatches(entry,['cardiologia']),false);
});

test('anotações do material reúnem destaques sem repetir trechos', () => {
  const ctx = loadPlannerSandbox();
  const highlights = [
    { text:'Ferritina baixa sugere deficiência de ferro.' },
    { text:'VCM reduzido exige diagnóstico diferencial.' },
    { text:'Ferritina baixa sugere deficiência de ferro.' }
  ];
  const first = ctx.mergeMaterialNotesWithHighlights('Revisar antes do simulado.', highlights);
  assert.match(first,/Revisar antes do simulado\./);
  assert.equal((first.match(/Ferritina baixa/g)||[]).length,1);
  assert.equal((first.match(/VCM reduzido/g)||[]).length,1);
  assert.equal(ctx.mergeMaterialNotesWithHighlights(first,highlights),first,'clicar novamente deve ser idempotente');
});

test('flashcardsNewestFirst: card recem-criado aparece primeiro na tela de captura', () => {
  const ctx = loadPlannerSandbox();
  const cards = [
    { id: 'a', front: 'primeiro', createdAt: '2026-07-27T10:00:00.000Z' },
    { id: 'b', front: 'segundo', createdAt: '2026-07-27T11:00:00.000Z' },
    { id: 'c', front: 'terceiro', createdAt: '2026-07-27T12:00:00.000Z' }
  ];
  assert.deepEqual(plain(ctx.flashcardsNewestFirst(cards).map(c => c.front)), ['terceiro', 'segundo', 'primeiro']);
  // A ordem de estudo (fila de revisao) nao pode ser afetada: so a tela de
  // captura inverte, a fila continua cronologica.
  assert.deepEqual(plain(ctx.flashcardsInBuildOrder(cards).map(c => c.front)), ['primeiro', 'segundo', 'terceiro']);
});

test('mergePlannerActivityState com carimbo local mais novo: o estudo feito no aparelho nao pode ser apagado pela nuvem desatualizada', () => {
  const ctx = loadPlannerSandbox();
  const remote = { schedule: [{ id: 's1' }], videoFlashcards: {}, flashcardLibrary: [], questionProgress: {} };
  const local = {
    schedule: [{ id: 's1' }],
    videoFlashcards: { v1: [{ id: 'fc1', front: 'feito hoje' }] },
    flashcardLibrary: [{ id: 'lib1' }],
    questionProgress: { q1: { selected: 'C', answeredAt: '2026-07-27T20:00:00.000Z' } }
  };
  // videoFlashcards e flashcardLibrary agora sao unidos por id (mergeRecordsById),
  // nao um spread raso — o estudo feito no aparelho sobrevive nos dois casos,
  // com ou sem preferLocal, porque a nuvem simplesmente nao tem esses ids ainda.
  const semPreferencia = ctx.mergePlannerActivityState(remote, local, false);
  assert.equal(Object.keys(semPreferencia.videoFlashcards).length, 1, 'sem preferLocal, o flashcard de video feito no aparelho ainda sobrevive (uniao por id)');
  assert.equal(semPreferencia.flashcardLibrary.length, 1, 'sem preferLocal, a biblioteca de flashcards ainda sobrevive (uniao por id)');
  // Regra nova: quando o carimbo local e mais novo que o remoto, pullCloudState
  // agora chama o merge com preferLocal=true.
  const comPreferencia = ctx.mergePlannerActivityState(remote, local, true);
  assert.equal(Object.keys(comPreferencia.videoFlashcards).length, 1, 'com preferLocal, o flashcard de video feito no aparelho sobrevive');
  assert.equal(comPreferencia.flashcardLibrary.length, 1, 'com preferLocal, a biblioteca de flashcards sobrevive');
  // Campos reconciliados por chave (questionProgress) sao seguros nos dois casos.
  assert.ok(semPreferencia.questionProgress.q1, 'questionProgress e mesclado por id em ambos os casos');
  assert.ok(comPreferencia.questionProgress.q1);
});

test('highlightGestureShouldBlockClick: so bloqueia o clique quando o gesto de marcacao aconteceu dentro da area destacavel', () => {
  const ctx = loadPlannerSandbox();
  const ui = ctx.__getUi();
  ui.suppressAnswerClick = true;
  ui.highlightGestureUntil = Date.now() + 750;
  const closest = target => ({ closest: selector => (selector.includes(target) ? {} : null) });
  const stemTarget = { target: { closest: sel => (sel.includes('highlightable') ? {} : null) } };
  const optionTarget = { target: { closest: () => null } };
  assert.equal(ctx.highlightGestureShouldBlockClick(stemTarget), true, 'clique dentro do enunciado destacavel continua bloqueado durante o gesto');
  assert.equal(ctx.highlightGestureShouldBlockClick(optionTarget), false, 'clique na alternativa (elemento irmao, fora da area destacavel) nunca deve ser bloqueado — este era o bug relatado');
  ctx.clearHighlightGestureState();
  assert.equal(ui.suppressAnswerClick, false);
  assert.equal(ui.highlightGestureUntil, 0);
  assert.equal(ctx.highlightGestureShouldBlockClick(stemTarget), false, 'apos limpar o estado do gesto, nem o proprio enunciado bloqueia mais');
});

test('saveStateOnly nao normaliza o estado inteiro a cada tecla; flushSaveStateOnly normaliza uma unica vez', () => {
  const ctx = loadPlannerSandbox();
  let chamadas = 0;
  const originalEnsure = ctx.ensureDayLogs;
  ctx.ensureDayLogs = (...args) => { chamadas++; return originalEnsure(...args); };
  // Simula uma rajada de Backspace: dezenas de saveStateOnly em sequencia.
  for(let i = 0; i < 40; i += 1) ctx.saveStateOnly();
  assert.equal(chamadas, 0, 'nenhuma tecla da rajada deve rodar o passe completo de normalizacao');
  ctx.flushSaveStateOnly();
  assert.equal(chamadas, 1, 'o flush (debounce) roda a normalizacao uma unica vez, nao uma vez por tecla');
});

test('persist deixa a resposta visual acontecer antes da normalizacao e preserva o flush imediato', () => {
  const ctx = loadPlannerSandbox();
  let chamadas = 0;
  const originalEnsure = ctx.ensureDayLogs;
  ctx.ensureDayLogs = (...args) => { chamadas++; return originalEnsure(...args); };
  ctx.persist();
  assert.equal(chamadas, 0, 'o manipulador de clique nao deve bloquear esperando a normalizacao completa');
  ctx.flushSaveStateOnly();
  assert.equal(chamadas, 1, 'o flush ainda normaliza e grava o estado integralmente');
});

test('resetActivityStateFromDate limpa atividade de 11/08 em diante sem alterar o histórico anterior', () => {
  const ctx = loadPlannerSandbox();
  const target = {
    schedule: [
      {id:'antes',date:'2026-08-10',q:3,fc:2,manualQ:3,manualFC:2,hours:2},
      {id:'depois',date:'2026-08-11',q:30,fc:20,manualQ:30,manualFC:20,hours:4}
    ],
    dayLogs: [
      {date:'2026-08-10',questions:3,questionMinutes:5},
      {date:'2026-08-11',questions:30,correct:20,wrong:10,questionMinutes:45,lessonMinutes:90}
    ],
    questionProgress: {
      anterior:{answeredAt:'2026-08-10T18:00:00.000Z',selected:'A'},
      indevida:{answeredAt:'2026-08-11T18:00:00.000Z',selected:'B'}
    },
    questionLogged:{anterior:'2026-08-10',indevida:'2026-08-11'},
    questionProgressDeleted:{},
    studySessions:[
      {id:'s1',date:'2026-08-10',seconds:300},
      {id:'s2',date:'2026-08-11',scheduleId:'antes',seconds:3600}
    ],
    flashcardLibrary:[{id:'fc1',front:'Frente',back:'Verso',reps:5}],
    flashcardProgress:{fc1:{reviews:5,lastReviewedAt:'2026-08-11T19:00:00.000Z'}},
    flashcardReviewHistory:[{cardId:'fc1',reviewedAt:'2026-08-11T19:00:00.000Z'}],
    flashcardSystem:{reviewLogs:[{id:'r1',cardId:'fc1',reviewedAt:'2026-08-11T19:00:00.000Z',before:{id:'fc1',front:'Frente',back:'Verso',reps:0}}],undoStack:[{reviewId:'r1'}]},
    videoPlayer:{watched:{v1:true},watchedAt:{v1:'2026-08-11T20:00:00.000Z'},progress:{},resume:{},resumeUpdatedAt:{},bookmarks:{}},
    simuladoRuns:[{id:'run1',finishedAt:'2026-08-11T21:00:00.000Z'}],
    simulados:[{id:'sim1',date:'2026-08-11',total:100,correct:80,strong:'x',weak:'y',notes:'z',missedTopics:[{id:'m1'}]}],
    gamification:{xpTransactions:[{id:'xp0',occurred_at:'2026-08-10T12:00:00.000Z'},{id:'xp1',occurred_at:'2026-08-11T21:00:00.000Z'}],importBatches:[],rankProgress:{},elementRewards:[]}
  };
  const summary=ctx.resetActivityStateFromDate(target,'2026-08-11','2026-08-11T22:00:00.000Z');
  assert.equal(summary.changed,true);
  assert.equal(target.schedule[0].manualQ,3,'atividade anterior ao corte deve permanecer');
  assert.equal(target.schedule[0].hours,1,'minutos indevidos devem ser retirados até de uma aula antiga');
  assert.deepEqual({q:target.schedule[1].manualQ,fc:target.schedule[1].manualFC,hours:target.schedule[1].hours},{q:0,fc:0,hours:0});
  assert.equal(target.dayLogs[0].questions,3);
  assert.equal(target.dayLogs[1].questions,0);
  assert.ok(target.questionProgress.anterior);
  assert.equal(target.questionProgress.indevida,undefined);
  assert.equal(target.questionProgressDeleted.indevida,'9999-12-31T23:59:59.999Z');
  assert.deepEqual(target.studySessions.map(item=>item.id),['s1']);
  assert.equal(target.flashcardSystem.reviewLogs.length,0);
  assert.equal(target.flashcardProgress.fc1,undefined);
  assert.equal(target.videoPlayer.watched.v1,undefined);
  assert.equal(target.simuladoRuns.length,0);
  assert.equal(target.simulados[0].total,0);
  assert.deepEqual(target.gamification.xpTransactions.map(item=>item.id),['xp0']);
  assert.equal(target.activityReset.version,'activity-from-2026-08-11-v1');
});

test('merge com aparelho antigo não ressuscita atividade removida e preserva estudo novo do estado limpo', () => {
  const ctx = loadPlannerSandbox();
  const clean = {
    activityReset:{version:'activity-from-2026-08-11-v1',cutoff:'2026-08-11',appliedAt:'2026-08-11T12:00:00.000Z'},
    schedule:[{id:'aula',date:'2026-08-11',manualQ:2,manualFC:0,hours:0}],
    dayLogs:[{date:'2026-08-11',questions:2,correct:2,questionMinutes:3}],
    questionProgress:{nova:{answeredAt:'2026-08-11T15:00:00.000Z',updatedAt:'2026-08-11T15:00:00.000Z',selected:'A',correct:true}},
    questionProgressDeleted:{},questionLogged:{nova:'2026-08-11'},studySessions:[],flashcardSystem:{reviewLogs:[]},flashcardProgress:{},gamification:{xpTransactions:[],importBatches:[]}
  };
  const stale = {
    schedule:[{id:'aula',date:'2026-08-11',manualQ:99,manualFC:99,hours:9}],
    dayLogs:[{date:'2026-08-11',questions:99,correct:50,wrong:49,questionMinutes:120}],
    questionProgress:{fantasma:{answeredAt:'2026-08-20T15:00:00.000Z',updatedAt:'2026-08-20T15:00:00.000Z',selected:'B'}},
    questionProgressDeleted:{},questionLogged:{fantasma:'2026-08-20'},studySessions:[{id:'fake',date:'2026-08-20',seconds:7200}],flashcardSystem:{reviewLogs:[]},flashcardProgress:{},gamification:{xpTransactions:[],importBatches:[]}
  };
  const merged=ctx.mergePlannerActivityState(clean,stale,false);
  assert.ok(merged.questionProgress.nova,'a resposta legítima criada depois da limpeza deve sobreviver');
  assert.equal(merged.questionProgress.fantasma,undefined,'a resposta do aparelho antigo não pode voltar');
  assert.equal(merged.dayLogs.find(log=>log.date==='2026-08-11').questions,2);
  assert.equal(merged.schedule[0].manualQ,2);
  assert.equal(merged.studySessions.length,0);
  assert.equal(merged.activityReset.version,'activity-from-2026-08-11-v1');
});

test('recordLibraryFlashcardVersion: edicao continua do mesmo campo colapsa em um unico registro de versao', () => {
  const ctx = loadPlannerSandbox();
  const state = ctx.__getState();
  state.flashcardLibrary = [{ id: 'lib-teste', front: '', back: 'x', area: 'Clínica', subarea: 'Teste', cardType: 'basic', contentVersion: 1 }];
  state.flashcardSystem = state.flashcardSystem || {};
  state.flashcardSystem.versions = [];
  const card = state.flashcardLibrary[0];
  const texto = 'Meningite bacteriana';
  for(let i = 1; i <= texto.length; i += 1) {
    card.front = texto.slice(0, i);
    ctx.recordLibraryFlashcardVersion(card, 'front', card.front);
  }
  assert.equal(state.flashcardSystem.versions.length, 1, 'digitar 20 letras no mesmo campo nao pode empilhar 20 registros de versao');
  assert.equal(state.flashcardSystem.versions[0].value, 'Meningite bacteriana', 'o valor final deve ser preservado no registro colapsado');
  // Um campo diferente sempre gera um registro novo, mesmo dentro da janela de coalescimento.
  ctx.recordLibraryFlashcardVersion(card, 'back', 'S. pneumoniae');
  assert.equal(state.flashcardSystem.versions.length, 2, 'um campo diferente do card deve gerar seu proprio registro');
});

test('writeLocalState: quota estourada descarta backups antigos e recupera sozinho quando o espaco volta', () => {
  const ctx = loadPlannerSandbox();
  ctx.__setState({ schedule: [{ id: 's1' }] });
  ctx.__setLocalBackups(Array.from({ length: 6 }, (_, i) => ({ id: `b${i}`, label: `Backup ${i}`, created_at: new Date().toISOString(), data: { schedule: [{ id: 's' }] } })));
  const nativeSetItem = ctx.localStorage.setItem.bind(ctx.localStorage);
  let falhas = 0;
  ctx.localStorage.setItem = (key, value) => {
    if(key === 'enamed-planner-v3' && falhas < 2) { falhas += 1; const e = new Error('Quota exceeded'); e.name = 'QuotaExceededError'; throw e; }
    return nativeSetItem(key, value);
  };
  const ok = ctx.writeLocalState();
  assert.equal(ok, true, 'apos descartar backups antigos, a gravacao deve suceder');
  assert.ok(ctx.__getLocalBackups().length < 6, 'backups antigos devem ter sido descartados para liberar espaco');
  assert.ok(ctx.localStorage.getItem('enamed-planner-v3'), 'o estado deve estar de fato gravado no fim');
});

test('writeLocalState: quando o espaco nunca volta, falha de forma visivel em vez de silenciosa', () => {
  const ctx = loadPlannerSandbox();
  ctx.__setState({ schedule: [{ id: 's1' }] });
  ctx.__setLocalBackups([]);
  ctx.localStorage.setItem = () => { const e = new Error('Quota exceeded'); e.name = 'QuotaExceededError'; throw e; };
  const ok = ctx.writeLocalState();
  assert.equal(ok, false, 'sem espaco e sem backup para descartar, a gravacao deve reportar falha em vez de fingir sucesso');
});

test('scheduleCloudRetry: erro de sincronizacao agenda nova tentativa com backoff exponencial, sem travar', () => {
  const ctx = loadPlannerSandbox();
  ctx.__setCloudRetryDelay(0);
  ctx.__clearCloudRetryTimer();
  const primeiraTentativa = (() => { ctx.scheduleCloudRetry(); return ctx.__getCloudRetryDelay(); })();
  const segundaTentativa = (() => { ctx.scheduleCloudRetry(); return ctx.__getCloudRetryDelay(); })();
  const terceiraTentativa = (() => { ctx.scheduleCloudRetry(); return ctx.__getCloudRetryDelay(); })();
  assert.equal(primeiraTentativa, 5000, 'primeira tentativa de reenvio em 5s');
  assert.equal(segundaTentativa, primeiraTentativa * 2, 'cada falha subsequente dobra o tempo de espera');
  assert.equal(terceiraTentativa, segundaTentativa * 2);
  assert.equal(ctx.__getCloudDirty(), true, 'o estado continua marcado como pendente enquanto o retry nao tiver sucesso');
  ctx.__clearCloudRetryTimer();
});

test('scheduleCloudRetry: nao ultrapassa o teto de espera mesmo apos muitas falhas seguidas', () => {
  const ctx = loadPlannerSandbox();
  ctx.__setCloudRetryDelay(0);
  ctx.__clearCloudRetryTimer();
  for(let i = 0; i < 10; i += 1) ctx.scheduleCloudRetry();
  assert.equal(ctx.__getCloudRetryDelay(), 2 * 60 * 1000, 'o backoff deve parar de crescer no teto de 2 minutos');
  ctx.__clearCloudRetryTimer();
});

test('flashcards: sair do modo foco pausa o cronometro sem zera-lo, e retomar continua do mesmo ponto', () => {
  const ctx = loadPlannerSandbox();
  const ui = ctx.__getUi();
  ctx.startAutoStudy('flashcards', 'sched-1');
  const tracker = ctx.__getStudyTimeTracker();
  tracker.startedAt -= 90 * 1000; // finge 90s de estudo decorridos
  assert.equal(ctx.autoStudyElapsedSeconds(), 90);
  ctx.pauseAutoStudy('flashcards');
  assert.equal(ctx.autoStudyIsRunning('flashcards'), false, 'pausar para de contar');
  assert.equal(ctx.autoStudyElapsedSeconds(), 90, 'pausar nao pode zerar o tempo ja estudado — esse era o bug do modo foco');
  ui.tab = 'flashcards';
  ui.flashcardFocusMode = false;
  ui.flashcardFocusPaused = false;
  ctx.resumeAutoStudyForActiveView();
  assert.equal(ctx.autoStudyIsRunning('flashcards'), false, 'fora do modo foco o tempo nao pode voltar a correr');
  ui.flashcardFocusMode = true;
  ctx.resumeAutoStudyForActiveView();
  assert.equal(ctx.autoStudyIsRunning('flashcards'), true);
  assert.equal(ctx.autoStudyElapsedSeconds(), 90, 'retomar continua exatamente de onde parou, sem perder nem duplicar tempo');
  ctx.stopAutoStudy();
});

test('questoes: cronometro automatico roda somente com o modo foco ativo', () => {
  const ctx = loadPlannerSandbox();
  const ui = ctx.__getUi();
  ui.tab = 'questoes';
  ctx.setQuestionFocusMode(false);
  ctx.ensureQuestionFocusStudyTimer();
  assert.equal(ctx.autoStudyIsRunning('questions'), false, 'painel aberto nao deve contabilizar tempo de questoes');
  ctx.setQuestionFocusMode(true);
  ctx.ensureQuestionFocusStudyTimer({ id:'question-focus-test' });
  assert.equal(ctx.autoStudyIsRunning('questions'), true, 'entrar no modo foco deve iniciar a contagem');
  ctx.setQuestionFocusMode(false);
  assert.equal(ctx.autoStudyIsRunning('questions'), false, 'sair do modo foco deve encerrar a contagem');
});

test('Missão abre as questões restantes depois que a meta de 10 da aula foi concluída', () => {
  const ctx = loadPlannerSandbox();
  const state = ctx.__getState();
  const lesson = { id:'lesson-extra', block:99, topic:'Cardiologia avançada', area:'Clínica Médica', manualQ:0, q:0 };
  state.schedule = [lesson];
  state.questionProgress = {};
  const questions = Array.from({length:15}, (_,index) => ({
    id:`extra-${index+1}`,
    collectionBlock:99,
    topic:lesson.topic,
    sourceLabel:lesson.topic,
    stem:`Questão ${index+1}`,
    options:{A:'A',B:'B',C:'C',D:'D'},
    answer:'A'
  }));
  questions.slice(0,10).forEach(question => {
    state.questionProgress[question.id] = { answeredAt:'2026-08-11T10:00:00.000Z', selected:'A', correct:true, scheduleId:lesson.id };
  });
  ctx.__setQuestionBank(questions);
  ctx.invalidateQuestionBankRenderCache();

  const plan = ctx.questionSessionPlan(lesson, questions);
  assert.equal(plan.target, 10, 'a meta visual da aula continua limitada a 10');
  assert.equal(plan.openingExtras, true, 'ao concluir a meta, a sessão passa para as questões extras');
  assert.equal(plan.focusTarget, 15, 'o novo alvo alcança o fim do banco vinculado à aula');
  assert.deepEqual(plain(plan.unanswered.map(question => question.id)), ['extra-11','extra-12','extra-13','extra-14','extra-15']);
});

test('renderFlashcardStudy: tela de fim de sessao no modo foco oferece saida; fora do foco nao exibe o botao', () => {
  const ctx = loadPlannerSandbox();
  const ui = ctx.__getUi();
  ui.flashcardFocusMode = true;
  const comFoco = ctx.renderFlashcardStudy(null, []);
  assert.ok(comFoco.includes('flashcardFocusToggle'), 'a tela de fim de sessao no modo foco precisa de um jeito de sair — sem isso o usuario ficava preso');
  ui.flashcardFocusMode = false;
  const semFoco = ctx.renderFlashcardStudy(null, []);
  assert.ok(!semFoco.includes('flashcardFocusToggle'), 'fora do modo foco o botao extra nao deve poluir a tela');
});

test('historico: Limpar tudo cria marcadores persistentes e o merge da nuvem nao ressuscita datas antigas', () => {
  const ctx = loadPlannerSandbox();
  const state = ctx.__getState();
  state.dayLogs = [
    { ...ctx.defaultDayLog('2025-12-29'), questions: 12, correct: 8, wrong: 4, updatedAt: '2025-12-29T18:00:00.000Z' }
  ];
  state.hiddenHistoryDates = [];
  state.historyHiddenAt = {};
  ctx.confirm = () => true;

  assert.equal(ctx.historyRows().length, 1, 'o registro antigo existe antes da limpeza');
  ctx.clearAllHistory();
  assert.equal(ctx.historyRows().length, 0, 'a lista fica vazia imediatamente apos Limpar tudo');
  assert.ok(state.hiddenHistoryDates.includes('2025-12-29'), 'a data apagada fica marcada para nao ser reconstruida');

  const merged = ctx.mergePlannerActivityState(
    { schedule: state.schedule, dayLogs: [{ ...ctx.defaultDayLog('2025-12-29'), questions: 12, updatedAt: '2025-12-29T18:00:00.000Z' }] },
    state,
    true
  );
  ctx.__setState(merged);
  ctx.normalizePlannerState();
  assert.equal(ctx.historyRows().length, 0, 'um registro velho vindo da nuvem continua oculto');
});

test('historico ignora atividades datadas no futuro', () => {
  const ctx = loadPlannerSandbox();
  const state = ctx.__getState();
  state.dayLogs = [{ ...ctx.defaultDayLog('2027-12-29'), questions: 10, updatedAt: '2027-12-29T18:00:00.000Z' }];
  state.hiddenHistoryDates = [];
  state.historyHiddenAt = {};
  assert.equal(ctx.historyRows().length, 0, 'uma atividade futura incorreta nunca deve aparecer na tabela');
});

test('ultima aula usa a data real da atividade e ignora progresso apenas agendado no futuro', () => {
  const ctx = loadPlannerSandbox();
  const state = ctx.__getState();
  state.schedule = [
    { id: 'aula-passada', topic: 'Aula realmente estudada', date: '2026-07-20', q: 0, manualQ: 1, fc: 0, manualFC: 0, hours: 0, notes: '' },
    { id: 'adrenal-futura', topic: 'Adrenal e Cushing', date: '2027-01-10', q: 0, manualQ: 0, fc: 0, manualFC: 0, hours: 3, notes: '' }
  ];
  state.studySessions = [];
  state.questionProgress = {};
  state.flashcardSystem = { ...(state.flashcardSystem || {}), reviewLogs: [] };
  state.gamification = { ...(state.gamification || {}), xpTransactions: [] };
  state.videoPlayer = { ...(state.videoPlayer || {}), lastOpen: { lessonId:'', sourceId:'', updatedAt:'' } };

  assert.equal(ctx.lastChangedLesson().id, 'aula-passada', 'uma aula futura nao pode vencer so por ter horas no cronograma');

  state.studySessions = [{ id:'sessao-real', scheduleId:'adrenal-futura', savedAt:'2026-08-04T18:30:00.000Z', seconds:600 }];
  const changed = ctx.lastChangedLesson();
  assert.equal(changed.id, 'adrenal-futura', 'aula futura pode ser a ultima quando existe atividade real vinculada');
  assert.equal(changed.date, '2026-08-04', 'a data exibida vem da atividade, nao do agendamento de 2027');
});
