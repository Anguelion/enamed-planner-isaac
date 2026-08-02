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
  ctx.startAutoStudy('flashcards', 'sched-1');
  const tracker = ctx.__getStudyTimeTracker();
  tracker.startedAt -= 90 * 1000; // finge 90s de estudo decorridos
  assert.equal(ctx.autoStudyElapsedSeconds(), 90);
  ctx.pauseAutoStudy('flashcards');
  assert.equal(ctx.autoStudyIsRunning('flashcards'), false, 'pausar para de contar');
  assert.equal(ctx.autoStudyElapsedSeconds(), 90, 'pausar nao pode zerar o tempo ja estudado — esse era o bug do modo foco');
  ctx.startAutoStudy('flashcards', 'sched-1');
  assert.equal(ctx.autoStudyIsRunning('flashcards'), true);
  assert.equal(ctx.autoStudyElapsedSeconds(), 90, 'retomar continua exatamente de onde parou, sem perder nem duplicar tempo');
  ctx.stopAutoStudy();
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
