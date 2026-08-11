'use strict';

// Testes executaveis (nao apenas checagem estatica de texto) para as
// correcoes feitas em assets/planner.js nesta sessao. planner.js nao e
// modular, entao carregamos o arquivo real num sandbox de vm minimo
// (tests/planner-sandbox.js) e chamamos as funcoes de producao diretamente.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadPlannerSandbox } = require('./planner-sandbox.js');

// Objetos criados dentro do sandbox de vm pertencem a um "realm" diferente do
// deste arquivo de teste: `Array`/`Object` do sandbox nao sao literalmente os
// mesmos construtores do processo Node, entao assert.deepStrictEqual falha por
// identidade de protótipo mesmo quando os valores sao estruturalmente iguais.
// Normalizamos via JSON (o mesmo caminho que os dados percorrem de verdade ao
// ir para localStorage/Supabase) antes de comparar.
const plain = value => JSON.parse(JSON.stringify(value));

test('merge de simuladoRuns: uniao por id, vence o updatedAt mais recente de qualquer lado', () => {
  const ctx = loadPlannerSandbox();
  const remote = {
    simuladoRuns: [
      { id: 'r1', updatedAt: '2026-01-01T00:00:00.000Z', foo: 'remoto-antigo' },
      { id: 'r3', updatedAt: '2026-03-01T00:00:00.000Z', foo: 'remoto-mais-novo' }
    ],
    simulados: [{ id: 's1', total: 10 }]
  };
  const local = {
    simuladoRuns: [
      { id: 'r1', updatedAt: '2026-02-01T00:00:00.000Z', foo: 'local-mais-novo' },
      { id: 'r2', updatedAt: '2026-01-15T00:00:00.000Z', foo: 'so-existe-local' },
      { id: 'r3', updatedAt: '2026-01-01T00:00:00.000Z', foo: 'local-antigo' }
    ],
    simulados: [{ id: 's2', total: 20 }]
  };
  const merged = ctx.mergePlannerActivityState(remote, local, false);
  const byId = Object.fromEntries(merged.simuladoRuns.map(run => [run.id, run]));
  assert.equal(merged.simuladoRuns.length, 3, 'nenhuma tentativa deve ser perdida ao mesclar');
  assert.equal(byId.r1.foo, 'local-mais-novo', 'a versao mais recente (local) deve vencer');
  assert.equal(byId.r2.foo, 'so-existe-local', 'tentativa exclusiva de um lado nao pode sumir');
  assert.equal(byId.r3.foo, 'remoto-mais-novo', 'o lado remoto tambem pode vencer quando e o mais novo');
  const simIds = plain(merged.simulados.map(sim => sim.id).sort());
  assert.deepStrictEqual(simIds, ['s1', 's2'], 'resumo legado deve unir os dois lados sem perder nenhum');
});

test('merge de materials: conteudo do lado mais recente, destaques (highlights) sempre unidos', () => {
  const ctx = loadPlannerSandbox();
  const remote = {
    materials: {
      'doc-a': { edited: true, content: 'versao remota antiga', updatedAt: '2026-01-01T00:00:00.000Z', lastReadAt: '2026-03-01T00:00:00.000Z', lastHeadingText: 'Conduta', highlights: [{ text: 'trecho-remoto', color: 'yellow', block: 1, occurrence: 0 }] }
    }
  };
  const local = {
    materials: {
      'doc-a': { edited: true, content: 'versao local nova', updatedAt: '2026-02-01T00:00:00.000Z', highlights: [{ text: 'trecho-local', color: 'green', block: 1, occurrence: 0 }] },
      'doc-b': { edited: true, content: 'documento so local', updatedAt: '2026-01-10T00:00:00.000Z', highlights: [] }
    }
  };
  const merged = ctx.mergePlannerActivityState(remote, local, false);
  assert.equal(merged.materials['doc-a'].content, 'versao local nova');
  const highlightTexts = plain(merged.materials['doc-a'].highlights.map(h => h.text).sort());
  assert.deepStrictEqual(highlightTexts, ['trecho-local', 'trecho-remoto'], 'grifos de ambos os lados devem sobreviver ao merge');
  assert.equal(merged.materials['doc-a'].lastHeadingText, 'Conduta', 'a posicao de leitura mais recente deve sobreviver sem trocar o conteudo editado');
  assert.equal(merged.materials['doc-b'].content, 'documento so local', 'documento exclusivo de um lado nao pode sumir');
});

test('merge de dailyTasks preserva exclusao mais recente e compacta duplicatas', () => {
  const ctx = loadPlannerSandbox();
  const remote = {
    dailyTasks: [
      { id: 'old-copy', templateId: 'task-1', occurrenceKey: 'task-occurrence:task-1:2026-07-18', date: '2026-07-18', text: 'Revisar pneumo', status: 'pending', updatedAt: '2026-07-18T10:00:00.000Z' }
    ]
  };
  const local = {
    dailyTasks: [
      { id: 'deleted-copy', templateId: 'task-1', occurrenceKey: 'task-occurrence:task-1:2026-07-18', date: '2026-07-18', text: 'Revisar pneumo', status: 'deleted', deletedAt: '2026-07-18T11:00:00.000Z', updatedAt: '2026-07-18T11:00:00.000Z' }
    ]
  };
  const merged = ctx.mergePlannerActivityState(remote, local, false);
  assert.equal(merged.dailyTasks.length, 1);
  assert.equal(merged.dailyTasks[0].status, 'deleted');
});

test('merge do cronograma preserva as datas oficiais locais e incorpora apenas o progresso remoto', () => {
  const ctx = loadPlannerSandbox();
  const remote = {
    schedule: [
      { id: 's1', date: '2026-07-28', day: 'Terça', block: 1, topic: 'Aula 1', manualQ: 8, manualFC: 4, hours: 2 },
      { id: 's2', date: '2026-07-28', day: 'Terça', block: 2, topic: 'Aula 2', manualQ: 0, manualFC: 0, hours: 0 }
    ]
  };
  const local = {
    schedule: [
      { id: 's1', date: '2026-04-09', day: 'Quinta', block: 1, topic: 'Aula 1', manualQ: 2, manualFC: 1, hours: 0 },
      { id: 's2', date: '2026-04-13', day: 'Segunda', block: 2, topic: 'Aula 2', manualQ: 0, manualFC: 0, hours: 0 }
    ]
  };

  const merged = ctx.mergePlannerActivityState(remote, local, false);
  assert.deepStrictEqual(
    plain(merged.schedule.map(item => item.date)),
    ['2026-04-09', '2026-04-13'],
    'uma data repetida vinda da nuvem não pode substituir o plano oficial deste aparelho'
  );
  assert.equal(merged.schedule[0].day, 'Quinta');
  assert.equal(merged.schedule[0].manualQ, 8, 'o progresso remoto continua sendo incorporado');
  assert.equal(merged.schedule[0].manualFC, 4);
  assert.equal(merged.schedule[0].hours, 2);
});

test('isEditingTextField: detecta textarea e input de texto, ignora checkbox e nada focado', () => {
  const ctx = loadPlannerSandbox();
  ctx.document.activeElement = { tagName: 'TEXTAREA' };
  assert.equal(ctx.isEditingTextField(), true);
  ctx.document.activeElement = { tagName: 'INPUT', type: 'text' };
  assert.equal(ctx.isEditingTextField(), true);
  ctx.document.activeElement = { tagName: 'INPUT', type: 'checkbox' };
  assert.equal(ctx.isEditingTextField(), false);
  ctx.document.activeElement = { tagName: 'DIV', isContentEditable: true };
  assert.equal(ctx.isEditingTextField(), true);
  ctx.document.activeElement = null;
  assert.equal(ctx.isEditingTextField(), false);
});

test('reconcileQuestionProgressForQuestion: gabarito editado recalcula o acerto de uma resposta ja dada', () => {
  const ctx = loadPlannerSandbox();
  const question = { id: 'q-teste-1', stem: 'Enunciado', options: { A: 'Um', B: 'Dois', C: 'Três', D: 'Quatro' }, answer: 'C', collectionBlock: '1' };
  ctx.__setQuestionBank([question]);
  const state = ctx.__getState();
  state.questionEdits = state.questionEdits || {};
  state.questionProgress = state.questionProgress || {};
  state.questionProgress[question.id] = { selected: 'A', correct: false, answeredAt: '2026-07-18T00:00:00.000Z', timedOut: false };

  const changedBeforeEdit = ctx.reconcileQuestionProgressForQuestion(question);
  assert.equal(changedBeforeEdit, false, 'sem edicao, o resultado ja e consistente e nada deve mudar');

  state.questionEdits[question.id] = { answer: 'A' };
  const changedAfterEdit = ctx.reconcileQuestionProgressForQuestion(question);
  assert.equal(changedAfterEdit, true, 'apos editar o gabarito para bater com a resposta dada, o resultado deve ser recalculado');
  assert.equal(state.questionProgress[question.id].correct, true);

  delete state.questionEdits[question.id];
  const changedAfterRestore = ctx.reconcileQuestionProgressForQuestion(question);
  assert.equal(changedAfterRestore, true, 'restaurar o gabarito original deve reverter a correcao');
  assert.equal(state.questionProgress[question.id].correct, false);
});

test('CLOUD_SYNC_ALLOWED: bloqueia origens desconhecidas e libera as origens reais conhecidas', () => {
  const untrusted = loadPlannerSandbox({ origin: 'http://127.0.0.1:8766' });
  assert.equal(untrusted.__getCloudSyncAllowed(), false, 'uma porta de teste desconhecida nao deve poder sincronizar');

  const offline = loadPlannerSandbox({ origin: 'http://127.0.0.1:8765' });
  assert.equal(offline.__getCloudSyncAllowed(), true, 'o servidor offline oficial deve continuar sincronizando');

  const online = loadPlannerSandbox({ origin: 'https://enamed-planner-isaac.pages.dev' });
  assert.equal(online.__getCloudSyncAllowed(), true, 'o deploy real deve continuar sincronizando');
});
