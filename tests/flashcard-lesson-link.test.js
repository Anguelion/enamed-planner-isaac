'use strict';

// Regressao da reestruturacao dos flashcards: vinculo real com a aula do
// cronograma (scheduleId), importacao em duas etapas com aula de destino e
// modos adicionar/substituir, e o bug que escondia da fila todos os cards
// importados menos um.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadPlannerSandbox } = require('./planner-sandbox.js');

// `state`, `ui` e `renderCache` sao `let` de topo de arquivo: so chegam aos
// testes pelos getters que o sandbox injeta.
const stateOf = ctx => ctx.__getState();
const uiOf = ctx => ctx.__getUi();
// Objetos vindos do vm pertencem a outro realm: deepEqual compara prototipo.
const plain = value => JSON.parse(JSON.stringify(value));

function withLesson(ctx) {
  const lesson = {
    id:'sched-onco-11',
    block:11,
    area:'Clínica Médica',
    topic:'Leucemias agudas',
    date:'2026-08-20',
    day:'Quinta'
  };
  stateOf(ctx).schedule.push(lesson);
  return lesson;
}

test('vincular um card a uma aula herda bloco, área e assunto', () => {
  const ctx = loadPlannerSandbox();
  const lesson = withLesson(ctx);
  const card = ctx.normalizeFlashcardRecord({ id:'c1', front:'Frente', back:'Verso' });
  ctx.applyScheduleToFlashcard(card, lesson.id);
  assert.equal(card.scheduleId, lesson.id);
  assert.equal(card.weeklyBlockId, '11');
  assert.equal(card.block, '11');
  assert.equal(card.area, 'Clínica Médica');
  assert.equal(card.subarea, 'Leucemias agudas');
  ctx.applyScheduleToFlashcard(card, '');
  assert.equal(card.scheduleId, '', 'desvincular limpa o scheduleId');
});

test('parser lê o TSV do Anki com colunas de deck e tags', () => {
  const ctx = loadPlannerSandbox();
  const file = [
    '#separator:tab',
    '#html:true',
    '#deck column:1',
    '#tags column:4',
    'Onco-Hemato::LMA\tQual o achado do bastonete de Auer?\tLeucemia mieloide aguda\themato lma',
    'Onco-Hemato::LMA\tCloze {{c1::teste}}\t\themato',
    'Onco-Hemato::LMA\t\t\tvazio'
  ].join('\n');
  const rows = ctx.parseFlashcardImportFile(file, 'anki.txt');
  assert.equal(rows.length, 2, 'linha sem frente é descartada');
  assert.equal(rows[0].deck, 'Onco-Hemato::LMA');
  assert.equal(rows[0].front, 'Qual o achado do bastonete de Auer?');
  assert.equal(rows[0].back, 'Leucemia mieloide aguda');
  assert.deepEqual(plain(Array.from(rows[0].tags)), ['hemato','lma']);
  assert.equal(rows[0].cardType, 'basic');
  assert.equal(rows[1].cardType, 'cloze', 'card só com lacuna é aceito sem verso');
});

test('importar para uma aula específica vincula todos os cards e conta na meta', () => {
  const ctx = loadPlannerSandbox();
  const lesson = withLesson(ctx);
  const rows = ctx.parseFlashcardImportFile('Frente A\tVerso A\nFrente B\tVerso B', 'lote.tsv');
  uiOf(ctx).flashcardImport = {
    fileName:'lote.tsv',
    total: rows.length,
    groups: ctx.buildFlashcardImportGroups(rows, lesson.id),
    lockedScheduleId: lesson.id
  };
  ctx.commitFlashcardImport();
  const linked = ctx.flashcardsForSchedule(lesson.id);
  assert.equal(linked.length, 2);
  assert.ok(linked.every(card => card.weeklyBlockId === '11'));
  assert.equal(ctx.flashcardStatsForSchedule(lesson.id).cards, 2, 'a aula enxerga os cards da biblioteca');
  assert.equal(ctx.unlinkedFlashcards().length, 0);
});

test('modo substituir apaga os cards antigos da aula antes de importar', () => {
  const ctx = loadPlannerSandbox();
  const lesson = withLesson(ctx);
  ctx.confirm = () => true;
  const first = ctx.parseFlashcardImportFile('Antigo\tVerso antigo', 'v1.tsv');
  uiOf(ctx).flashcardImport = { fileName:'v1.tsv', total:1, groups: ctx.buildFlashcardImportGroups(first, lesson.id), lockedScheduleId: lesson.id };
  ctx.commitFlashcardImport();
  assert.equal(ctx.flashcardsForSchedule(lesson.id).length, 1);

  const second = ctx.parseFlashcardImportFile('Novo\tVerso novo', 'v2.tsv');
  const groups = ctx.buildFlashcardImportGroups(second, lesson.id);
  groups[0].mode = 'replace';
  uiOf(ctx).flashcardImport = { fileName:'v2.tsv', total:1, groups, lockedScheduleId: lesson.id };
  ctx.commitFlashcardImport();

  const linked = ctx.flashcardsForSchedule(lesson.id);
  assert.equal(linked.length, 1, 'substituir não acumula');
  assert.equal(linked[0].front, 'Novo');
});

test('exclusão em lote remove os cards e some da aula', () => {
  const ctx = loadPlannerSandbox();
  const lesson = withLesson(ctx);
  const rows = ctx.parseFlashcardImportFile('A\t1\nB\t2', 'x.tsv');
  uiOf(ctx).flashcardImport = { fileName:'x.tsv', total:2, groups: ctx.buildFlashcardImportGroups(rows, lesson.id), lockedScheduleId: lesson.id };
  ctx.commitFlashcardImport();
  const ids = ctx.flashcardsForSchedule(lesson.id).map(card => card.id);
  assert.equal(ctx.deleteFlashcardsByIds(ids), 2);
  assert.equal(ctx.flashcardsForSchedule(lesson.id).length, 0);
});

test('cards importados não escondem uns aos outros na fila de estudo', () => {
  const ctx = loadPlannerSandbox();
  // Formato antigo: todo o lote compartilhava um questionId sintético, e o
  // burying de irmãos deixava passar apenas um card por lote.
  stateOf(ctx).questionFlashcards['anki-import-hemato-lma'] = [1,2,3,4,5].map(index => ({
    id:`card-anki-legacy-${index}`,
    front:`Frente ${index}`,
    back:`Verso ${index}`,
    area:'Importado do Anki',
    subarea:'Sem subárea',
    createdAt:'2026-08-01T10:00:00.000Z'
  }));
  ctx.invalidateActivityRenderCache();
  uiOf(ctx).flashcardFilter = 'Aprendendo';
  uiOf(ctx).flashcardArea = 'Todas';
  uiOf(ctx).flashcardSubarea = 'Todas';
  uiOf(ctx).flashcardBlock = '';
  uiOf(ctx).flashcardSubject = '';
  uiOf(ctx).flashcardDeck = '';
  uiOf(ctx).flashcardLesson = '';
  const queue = ctx.flashcardStudyQueue(ctx.flashcardAllRecords());
  assert.equal(queue.length, 5, 'todos os cards importados devem entrar na fila');
});

test('filtro por aula usa o vínculo, não o texto do assunto', () => {
  const ctx = loadPlannerSandbox();
  const lesson = withLesson(ctx);
  const linked = ctx.normalizeFlashcardRecord({ id:'linked', front:'F', back:'V' });
  ctx.applyScheduleToFlashcard(linked, lesson.id);
  const loose = ctx.normalizeFlashcardRecord({ id:'loose', front:'F2', back:'V2', area:'Clínica Médica', subarea:'Leucemias agudas' });
  stateOf(ctx).flashcardLibrary.push(linked, loose);
  ctx.invalidateActivityRenderCache();
  uiOf(ctx).flashcardFilter = 'Todos';
  uiOf(ctx).flashcardArea = 'Todas';
  uiOf(ctx).flashcardSubarea = 'Todas';
  uiOf(ctx).flashcardBlock = '';
  uiOf(ctx).flashcardSubject = '';
  uiOf(ctx).flashcardDeck = '';

  uiOf(ctx).flashcardLesson = lesson.id;
  assert.deepEqual(plain(ctx.filteredFlashcards(ctx.flashcardAllRecords()).map(card => card.id)), ['linked']);

  uiOf(ctx).flashcardLesson = '__sem_aula__';
  assert.deepEqual(plain(ctx.filteredFlashcards(ctx.flashcardAllRecords()).map(card => card.id)), ['loose']);
});

test('histórico de revisões não é mais cortado em 500 eventos e compacta conteúdo antigo', () => {
  const ctx = loadPlannerSandbox();
  const state = stateOf(ctx);
  state.flashcardSystem.reviewLogs = Array.from({length:620}, (_,index) => ({
    id:`review-${index}`,
    cardId:`card-${index}`,
    rating:index%4+1,
    reviewedAt:'2026-08-10T10:00:00.000Z',
    before:{front:`Frente ${index}`,area:'Clínica'},
    after:{front:`Frente ${index}`,area:'Clínica',subarea:'Cardiologia'}
  }));
  state.flashcardSystem.undoStack = Array.from({length:20}, (_,index) => ({reviewId:`review-${600+index}`}));
  ctx.compactFlashcardReviewLogs();
  assert.equal(state.flashcardSystem.reviewLogs.length, 620, 'nenhum evento histórico pode ser descartado');
  assert.equal(state.flashcardSystem.reviewLogs[0].after, undefined, 'eventos antigos perdem a cópia pesada do card');
  assert.equal(state.flashcardSystem.reviewLogs[0].cardSnapshot.front, 'Frente 0', 'uma fotografia leve continua disponível para auditoria');
  assert.ok(state.flashcardSystem.reviewLogs[619].after, 'a janela de desfazer preserva o estado completo recente');
});

test('retenção observada usa todas as respostas do período e considera Difícil como lembrado', () => {
  const ctx = loadPlannerSandbox();
  const now = new Date().toISOString();
  stateOf(ctx).flashcardSystem.reviewLogs = [1,2,3,4].map(rating => ({id:`r${rating}`,cardId:`c${rating}`,rating,reviewedAt:now}));
  assert.deepEqual(plain(ctx.flashcardObservedRetention(30)), {total:4,value:75});
});

test('mapa de calor combina eventos detalhados com o total diário legado', () => {
  const ctx = loadPlannerSandbox();
  const state = stateOf(ctx);
  state.flashcardSystem.reviewLogs = [
    {id:'r1',cardId:'c1',rating:1,reviewedAt:'2026-08-10T10:00:00.000Z'},
    {id:'r2',cardId:'c2',rating:3,reviewedAt:'2026-08-10T11:00:00.000Z'}
  ];
  state.dayLogs = [{date:'2026-08-10',flashcards:7,flashcardMinutes:18}];
  const row = ctx.flashcardReviewDailySeries().get('2026-08-10');
  assert.equal(row.count, 7, 'o agregado legado cobre períodos anteriores ao histórico detalhado');
  assert.equal(row.again, 1);
  assert.equal(row.remembered, 1);
  assert.equal(row.minutes, 18);
});

test('cards suspensos ficam fora dos vencidos e da fila normal', () => {
  const ctx = loadPlannerSandbox();
  const state = stateOf(ctx);
  const ui = uiOf(ctx);
  const card = ctx.normalizeFlashcardRecord({id:'suspenso-1',front:'F',back:'V',createdAt:'2026-08-01T10:00:00.000Z'});
  state.flashcardLibrary.push(card);
  state.flashcardProgress[card.id] = {reviews:2,status:'Bom',nextReview:'2026-08-01',dueAt:'2026-08-01T10:00:00.000Z'};
  ui.flashcardFilter = 'Aprendendo';
  ui.flashcardArea = 'Todas';
  ui.flashcardSubarea = 'Todas';
  ui.flashcardBlock = '';
  ui.flashcardSubject = '';
  ui.flashcardDeck = '';
  ui.flashcardLesson = '';
  assert.equal(ctx.isFlashcardDue(card), true);
  state.flashcardProgress[card.id] = {...state.flashcardProgress[card.id],status:'Suspenso',nextReview:'2099-12-31',dueAt:'2099-12-31T23:59:59.000Z'};
  card.isSuspended = true;
  assert.equal(ctx.isFlashcardDue(card), false);
  assert.equal(ctx.flashcardStudyQueue(ctx.flashcardAllRecords()).length, 0);
});

test('navegador pesquisa conteúdo, assunto e tags na coleção completa', () => {
  const ctx = loadPlannerSandbox();
  const state = stateOf(ctx);
  const ui = uiOf(ctx);
  state.flashcardLibrary.push(
    ctx.normalizeFlashcardRecord({id:'nav-1',front:'Critérios de pré-eclâmpsia',back:'PA e proteinúria',area:'G.O.',subarea:'Hipertensão',tags:['obstetrícia']}),
    ctx.normalizeFlashcardRecord({id:'nav-2',front:'Tratamento da asma',back:'Corticoide inalatório',area:'Clínica Médica',subarea:'Pneumologia',tags:['respiratório']})
  );
  ui.flashcardBrowserSearch = 'pre eclampsia obstetricia';
  ui.flashcardBrowserStatus = 'Todos';
  ui.flashcardBrowserArea = 'Todas';
  ui.flashcardBrowserSort = 'front';
  assert.deepEqual(plain(ctx.flashcardBrowserRecords(ctx.flashcardAllRecords()).map(card=>card.id)), ['nav-1']);
});

test('navegador combina filtro de estado e área e ordena pelos lapsos', () => {
  const ctx = loadPlannerSandbox();
  const state = stateOf(ctx);
  const ui = uiOf(ctx);
  state.flashcardLibrary.push(
    ctx.normalizeFlashcardRecord({id:'nav-a',front:'A',back:'1',area:'Clínica Médica'}),
    ctx.normalizeFlashcardRecord({id:'nav-b',front:'B',back:'2',area:'Clínica Médica'}),
    ctx.normalizeFlashcardRecord({id:'nav-c',front:'C',back:'3',area:'Pediatria'})
  );
  state.flashcardProgress['nav-a']={reviews:3,interval:4,lapses:1,status:'Bom',nextReview:'2026-08-20'};
  state.flashcardProgress['nav-b']={reviews:5,interval:6,lapses:4,status:'Difícil',nextReview:'2026-08-21'};
  state.flashcardProgress['nav-c']={reviews:4,interval:5,lapses:5,status:'Difícil',nextReview:'2026-08-22'};
  ui.flashcardBrowserSearch='';
  ui.flashcardBrowserStatus='Difíceis';
  ui.flashcardBrowserArea='Clínica Médica';
  ui.flashcardBrowserSort='lapses';
  assert.deepEqual(plain(ctx.flashcardBrowserRecords(ctx.flashcardAllRecords()).map(card=>card.id)), ['nav-b']);
});

test('suspensão em lote preserva e restaura o agendamento anterior', () => {
  const ctx = loadPlannerSandbox();
  const state = stateOf(ctx);
  const card = ctx.normalizeFlashcardRecord({id:'bulk-suspend',front:'F',back:'V'});
  state.flashcardLibrary.push(card);
  state.flashcardProgress[card.id]={reviews:4,status:'Bom',nextReview:'2026-08-20',dueAt:'2026-08-20T10:00:00.000Z'};
  assert.equal(ctx.setFlashcardSuspended(card.id,true), true);
  assert.equal(state.flashcardProgress[card.id].status,'Suspenso');
  assert.equal(card.isSuspended,true);
  assert.equal(ctx.setFlashcardSuspended(card.id,false), true);
  assert.equal(state.flashcardProgress[card.id].status,'Bom');
  assert.equal(state.flashcardProgress[card.id].nextReview,'2026-08-20');
  assert.equal(state.flashcardProgress[card.id].dueAt,'2026-08-20T10:00:00.000Z');
  assert.equal(card.isSuspended,false);
});

test('perfil de agendamento migra valores antigos e protege faixas seguras', () => {
  const ctx = loadPlannerSandbox();
  const profile = ctx.normalizeFlashcardSchedulerProfile({targetRetention:1.2,maximumInterval:2,relearningMinutes:0,leechThreshold:200,fuzz:false});
  assert.equal(profile.targetRetention,0.97);
  assert.equal(profile.maximumInterval,30);
  assert.equal(profile.relearningMinutes,10);
  assert.equal(profile.leechThreshold,99);
  assert.equal(profile.fuzz,false);
  assert.equal(profile.autoSuspendLeeches,true);
});

test('retenção desejada maior produz intervalos menores para a mesma memória', () => {
  const ctx = loadPlannerSandbox();
  const state = stateOf(ctx);
  state.flashcardSystem.profile={...state.flashcardSystem.profile,fuzz:false,targetRetention:0.85};
  const relaxed=ctx.fsrsIntervalDays({reps:5},3,30);
  state.flashcardSystem.profile={...state.flashcardSystem.profile,targetRetention:0.95};
  const intensive=ctx.fsrsIntervalDays({reps:5},3,30);
  assert.ok(intensive < relaxed, `${intensive} deveria ser menor que ${relaxed}`);
});

test('reaprendizagem usa o tempo configurado ao responder Novamente', () => {
  const ctx = loadPlannerSandbox();
  const state = stateOf(ctx);
  state.flashcardSystem.profile={...state.flashcardSystem.profile,relearningMinutes:37,fuzz:false};
  const before=Date.now();
  const next=ctx.nextFsrsProgress({id:'relearn',reps:4,stability:12,difficulty:5},1);
  const minutes=(Date.parse(next.dueAt)-before)/60000;
  assert.equal(next.scheduledDays,0);
  assert.ok(minutes>=36.9 && minutes<=37.1, `tempo calculado: ${minutes}`);
});

test('limites de novos e revisões são separados e a ordem da fila é configurável', () => {
  const ctx = loadPlannerSandbox();
  const state = stateOf(ctx);
  const ui = uiOf(ctx);
  const due=ctx.normalizeFlashcardRecord({id:'queue-due',front:'Vencido',back:'V'});
  const fresh=ctx.normalizeFlashcardRecord({id:'queue-new',front:'Novo',back:'V'});
  state.flashcardLibrary.push(due,fresh);
  state.flashcardProgress[due.id]={reviews:3,nextReview:'2020-01-01',dueAt:'2020-01-01T10:00:00.000Z'};
  state.flashcardSystem.reviewLogs=[{id:'new-today',cardId:'other',reviewedAt:new Date().toISOString(),wasNew:true,rating:3}];
  state.flashcardSettings.newLimit=1;
  state.flashcardSettings.reviewLimit=1;
  state.flashcardSettings.newOrder='beforeReviews';
  ui.flashcardFilter='Aprendendo'; ui.flashcardArea='Todas'; ui.flashcardSubarea='Todas'; ui.flashcardBlock=''; ui.flashcardSubject=''; ui.flashcardDeck=''; ui.flashcardLesson='';
  assert.deepEqual(plain(ctx.flashcardStudyQueue(ctx.flashcardAllRecords()).map(card=>card.id)),['queue-new','queue-due']);
  state.flashcardSettings.newOrder='afterReviews';
  assert.deepEqual(plain(ctx.flashcardStudyQueue(ctx.flashcardAllRecords()).map(card=>card.id)),['queue-due','queue-new']);
});

test('preset intensivo configura retenção, limites e proteção contra cards problemáticos', () => {
  const ctx = loadPlannerSandbox();
  const state = stateOf(ctx);
  assert.equal(ctx.applyFlashcardSchedulerPreset('intensivo'),true);
  assert.equal(state.flashcardSystem.profile.targetRetention,0.95);
  assert.equal(state.flashcardSystem.profile.relearningMinutes,5);
  assert.equal(state.flashcardSystem.profile.autoSuspendLeeches,true);
  assert.equal(state.flashcardSettings.newLimit,15);
  assert.equal(state.flashcardSettings.reviewLimit,200);
  assert.equal(state.flashcardSettings.newOrder,'mixed');
  assert.equal(ctx.flashcardSchedulerPresetId(),'intensivo');
});

test('suspensão automática de card problemático respeita a preferência do usuário', () => {
  const ctx = loadPlannerSandbox();
  const state = stateOf(ctx);
  state.flashcardSystem.profile={...state.flashcardSystem.profile,leechThreshold:3,autoSuspendLeeches:true};
  assert.equal(ctx.flashcardShouldAutoSuspend(2),false);
  assert.equal(ctx.flashcardShouldAutoSuspend(3),true);
  state.flashcardSystem.profile.autoSuspendLeeches=false;
  assert.equal(ctx.flashcardShouldAutoSuspend(20),false);
});
