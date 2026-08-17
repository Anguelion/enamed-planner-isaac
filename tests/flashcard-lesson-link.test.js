'use strict';

// Regressao da reestruturacao dos flashcards: vinculo real com a aula do
// cronograma (scheduleId), importacao em duas etapas com aula de destino e
// modos adicionar/substituir, e o bug que escondia da fila todos os cards
// importados menos um.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadPlannerSandbox } = require('./planner-sandbox.js');

function withLesson(ctx) {
  const lesson = {
    id:'sched-onco-11',
    block:11,
    area:'Clínica Médica',
    topic:'Leucemias agudas',
    date:'2026-08-20',
    day:'Quinta'
  };
  ctx.state.schedule.push(lesson);
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
  assert.deepEqual(Array.from(rows[0].tags), ['hemato','lma']);
  assert.equal(rows[0].cardType, 'basic');
  assert.equal(rows[1].cardType, 'cloze', 'card só com lacuna é aceito sem verso');
});

test('importar para uma aula específica vincula todos os cards e conta na meta', () => {
  const ctx = loadPlannerSandbox();
  const lesson = withLesson(ctx);
  const rows = ctx.parseFlashcardImportFile('Frente A\tVerso A\nFrente B\tVerso B', 'lote.tsv');
  ctx.ui.flashcardImport = {
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
  ctx.window.confirm = () => true;
  const first = ctx.parseFlashcardImportFile('Antigo\tVerso antigo', 'v1.tsv');
  ctx.ui.flashcardImport = { fileName:'v1.tsv', total:1, groups: ctx.buildFlashcardImportGroups(first, lesson.id), lockedScheduleId: lesson.id };
  ctx.commitFlashcardImport();
  assert.equal(ctx.flashcardsForSchedule(lesson.id).length, 1);

  const second = ctx.parseFlashcardImportFile('Novo\tVerso novo', 'v2.tsv');
  const groups = ctx.buildFlashcardImportGroups(second, lesson.id);
  groups[0].mode = 'replace';
  ctx.ui.flashcardImport = { fileName:'v2.tsv', total:1, groups, lockedScheduleId: lesson.id };
  ctx.commitFlashcardImport();

  const linked = ctx.flashcardsForSchedule(lesson.id);
  assert.equal(linked.length, 1, 'substituir não acumula');
  assert.equal(linked[0].front, 'Novo');
});

test('exclusão em lote remove os cards e some da aula', () => {
  const ctx = loadPlannerSandbox();
  const lesson = withLesson(ctx);
  const rows = ctx.parseFlashcardImportFile('A\t1\nB\t2', 'x.tsv');
  ctx.ui.flashcardImport = { fileName:'x.tsv', total:2, groups: ctx.buildFlashcardImportGroups(rows, lesson.id), lockedScheduleId: lesson.id };
  ctx.commitFlashcardImport();
  const ids = ctx.flashcardsForSchedule(lesson.id).map(card => card.id);
  assert.equal(ctx.deleteFlashcardsByIds(ids), 2);
  assert.equal(ctx.flashcardsForSchedule(lesson.id).length, 0);
});

test('cards importados não escondem uns aos outros na fila de estudo', () => {
  const ctx = loadPlannerSandbox();
  // Formato antigo: todo o lote compartilhava um questionId sintético, e o
  // burying de irmãos deixava passar apenas um card por lote.
  ctx.state.questionFlashcards['anki-import-hemato-lma'] = [1,2,3,4,5].map(index => ({
    id:`card-anki-legacy-${index}`,
    front:`Frente ${index}`,
    back:`Verso ${index}`,
    area:'Importado do Anki',
    subarea:'Sem subárea',
    createdAt:'2026-08-01T10:00:00.000Z'
  }));
  ctx.renderCache.manualCards = null;
  ctx.ui.flashcardFilter = 'Aprendendo';
  ctx.ui.flashcardArea = 'Todas';
  ctx.ui.flashcardSubarea = 'Todas';
  ctx.ui.flashcardBlock = '';
  ctx.ui.flashcardSubject = '';
  ctx.ui.flashcardDeck = '';
  ctx.ui.flashcardLesson = '';
  const queue = ctx.flashcardStudyQueue(ctx.flashcardAllRecords());
  assert.equal(queue.length, 5, 'todos os cards importados devem entrar na fila');
});

test('filtro por aula usa o vínculo, não o texto do assunto', () => {
  const ctx = loadPlannerSandbox();
  const lesson = withLesson(ctx);
  const linked = ctx.normalizeFlashcardRecord({ id:'linked', front:'F', back:'V' });
  ctx.applyScheduleToFlashcard(linked, lesson.id);
  const loose = ctx.normalizeFlashcardRecord({ id:'loose', front:'F2', back:'V2', area:'Clínica Médica', subarea:'Leucemias agudas' });
  ctx.state.flashcardLibrary.push(linked, loose);
  ctx.renderCache.manualCards = null;
  ctx.ui.flashcardFilter = 'Todos';
  ctx.ui.flashcardArea = 'Todas';
  ctx.ui.flashcardSubarea = 'Todas';
  ctx.ui.flashcardBlock = '';
  ctx.ui.flashcardSubject = '';
  ctx.ui.flashcardDeck = '';

  ctx.ui.flashcardLesson = lesson.id;
  assert.deepEqual(ctx.filteredFlashcards(ctx.flashcardAllRecords()).map(card => card.id), ['linked']);

  ctx.ui.flashcardLesson = '__sem_aula__';
  assert.deepEqual(ctx.filteredFlashcards(ctx.flashcardAllRecords()).map(card => card.id), ['loose']);
});
