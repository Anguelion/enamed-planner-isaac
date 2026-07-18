'use strict';

// Testes executaveis (nao apenas checagem estatica de texto) para as
// correcoes feitas em assets/planner.js nesta sessao. planner.js nao e
// modular, entao carregamos o arquivo real num sandbox de vm minimo
// (tests/planner-sandbox.js) e chamamos as funcoes de producao diretamente.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadPlannerSandbox } = require('./planner-sandbox.js');

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
  const simIds = merged.simulados.map(sim => sim.id).sort();
  assert.deepEqual(simIds, ['s1', 's2'], 'resumo legado deve unir os dois lados sem perder nenhum');
});

test('merge de materials: conteudo do lado mais recente, destaques (highlights) sempre unidos', () => {
  const ctx = loadPlannerSandbox();
  const remote = {
    materials: {
      'doc-a': { edited: true, content: 'versao remota antiga', updatedAt: '2026-01-01T00:00:00.000Z', highlights: [{ text: 'trecho-remoto', color: 'yellow', block: 1, occurrence: 0 }] }
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
  const highlightTexts = merged.materials['doc-a'].highlights.map(h => h.text).sort();
  assert.deepEqual(highlightTexts, ['trecho-local', 'trecho-remoto'], 'grifos de ambos os lados devem sobreviver ao merge');
  assert.equal(merged.materials['doc-b'].content, 'documento so local', 'documento exclusivo de um lado nao pode sumir');
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
