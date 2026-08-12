'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  applyEnrichment,
  compareQuestion,
  extractStrategyUrls,
  mergeTags,
  retryDelayDays,
  shouldAttempt,
  tokenSimilarity
} = require('../scripts/enrich-anki-questions.js');

test('similaridade tolera acentos, caixa e pontuação', () => {
  assert.equal(tokenSimilarity('Trombocitopenia induzida pela heparina.', 'trombocitopenia INDUZIDA pela HEPARINA'), 1);
});

test('extrai e remove duplicatas de links do Estratégia MED', () => {
  const target = 'https://med.estrategia.com/public/questoes/homem-78-anos-obeso3862dcbaf3/';
  const html = `<a href="//duckduckgo.com/l/?uddg=${encodeURIComponent(target)}">a</a> ${target}`;
  assert.deepEqual(extractStrategyUrls(html), [target]);
});

test('comparação usa enunciado e alternativas', () => {
  const local = { stem: 'Paciente com anemia ferropriva.', options: { A: 'Dar ferro oral.', B: 'Observar.' } };
  const remote = {
    statement_text: 'Paciente com anemia ferropriva',
    alternatives: [{ body: 'dar ferro oral' }, { body: 'observar' }]
  };
  assert.deepEqual(compareQuestion(local, remote), { stem: 1, options: 1, combined: 1 });
});

test('não sobrescreve gabarito divergente sem autorização', () => {
  const question = { answer: 'D', comment: '', tags: ['Hematologia'] };
  const result = {
    answerMismatch: true,
    remoteAnswer: 'B',
    comment: 'Comentário verificado',
    tags: ['Hemostasia'],
    sourceUrl: 'https://med.estrategia.com/public/questoes/exemplo/',
    sourceQuestionId: '1',
    matchedAt: '2026-08-12T00:00:00.000Z',
    similarity: { combined: 1 }
  };
  assert.equal(applyEnrichment(question, result, false), false);
  assert.equal(question.answer, 'D');
  assert.equal(question.comment, '');
});

test('acrescenta tags sem duplicar e registra a fonte', () => {
  const question = { answer: 'B', comment: '', tags: ['Hematologia'] };
  const result = {
    answerMismatch: false,
    remoteAnswer: 'B',
    comment: 'Comentário verificado',
    tags: ['Hematologia ', 'Hemostasia'],
    sourceUrl: 'https://med.estrategia.com/public/questoes/exemplo/',
    sourceQuestionId: '1',
    matchedAt: '2026-08-12T00:00:00.000Z',
    similarity: { combined: 1 }
  };
  assert.equal(applyEnrichment(question, result, false), true);
  assert.deepEqual(question.tags, ['Hematologia', 'Hemostasia', 'Estratégia MED']);
  assert.equal(question.enrichment.sourceQuestionId, '1');
});

test('preserva comentário existente ao acrescentar tags e fonte', () => {
  const question = { answer: 'B', comment: 'Explicação original mais completa.', tags: ['Hematologia'] };
  const result = {
    answerMismatch: false,
    remoteAnswer: 'B',
    comment: 'Resumo automático',
    tags: ['Hemostasia'],
    sourceUrl: 'https://med.estrategia.com/public/questoes/exemplo/',
    sourceQuestionId: '1',
    matchedAt: '2026-08-12T00:00:00.000Z',
    similarity: { combined: 1 }
  };
  assert.equal(applyEnrichment(question, result, false), true);
  assert.equal(question.comment, 'Explicação original mais completa.');
});

test('mergeTags trata versões com e sem acento como a mesma tag', () => {
  assert.deepEqual(mergeTags(['Clinica Medica'], ['Clínica Médica']), ['Clinica Medica', 'Estratégia MED']);
});

test('estado do lote pula buscas recentes e libera tentativas vencidas', () => {
  const state = { questions: {
    recente: { nextAttemptAt: '2026-08-20T00:00:00.000Z' },
    vencida: { nextAttemptAt: '2026-08-01T00:00:00.000Z' }
  } };
  const now = Date.parse('2026-08-12T00:00:00.000Z');
  assert.equal(shouldAttempt('recente', state, now), false);
  assert.equal(shouldAttempt('vencida', state, now), true);
  assert.equal(shouldAttempt('nova', state, now), true);
});

test('divergência de gabarito permanece na revisão por longo prazo', () => {
  assert.equal(retryDelayDays('answer_mismatch', 1), 365);
  assert.equal(retryDelayDays('not_found', 1), 7);
  assert.equal(retryDelayDays('not_found', 3), 21);
});
