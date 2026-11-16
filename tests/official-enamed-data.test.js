const test = require('node:test');
const assert = require('node:assert/strict');
const index = require('../imported_simulados/index.json');

const official = index.simulados.filter(sim => sim.type === 'official_inep');

test('cadernos ENAMED oficiais mantêm 100 posições e apontam para as fontes do Inep', () => {
  assert.deepEqual(official.map(sim => sim.examYear), [2025, 2026]);
  for (const {file, ...meta} of official) {
    const {questions, ...storedMeta} = require(`../imported_simulados/${file}`);
    assert.deepEqual(storedMeta, meta);
    assert.equal(meta.booklet, '01');
    assert.equal(meta.questionCount, 100);
    assert.equal(meta.durationMinutes, 300);
    for (const url of [meta.source, meta.answerKeySource]) {
      assert.equal(new URL(url).origin, 'https://download.inep.gov.br');
      assert.match(url, /\/enamed\/provas_e_gabaritos\/.*\.pdf$/);
    }
    assert.equal(questions.length, 100);
    assert.equal(questions.filter(question => !question.annulled).length, meta.scoredQuestionCount);
    questions.forEach((question, ix) => {
      const number = ix + 1;
      assert.equal(question.number, number);
      assert.equal(question.id, `${meta.id}-q${String(number).padStart(3, '0')}`);
      assert.ok(Number.isInteger(question.sourcePage) && question.sourcePage >= 3 && question.sourcePage <= 26);
      assert.ok(ix === 0 || question.sourcePage >= questions[ix - 1].sourcePage);
      assert.equal(question.annulled, question.answer === '');
      assert.match(question.answer, /^(?:[A-D])?$/);
      assert.deepEqual(Object.keys(question).sort(), [
        'annulled', 'answer', 'id', 'number', ...(question.annulled ? ['officialStatus'] : []), 'sourcePage'
      ]);
    });
  }
});

test('2025 usa o definitivo revisado e 2026 usa o preliminar da aplicação regular', () => {
  const definitive = require('../imported_simulados/enamed-2025-inep-caderno-01.json');
  assert.equal(definitive.answerKeyStatus, 'definitive');
  assert.match(definitive.answerKeySource, /2025_gabarito_caderno_1_v2\.pdf$/);
  const excluded = definitive.questions.filter(question => question.annulled);
  assert.deepEqual(excluded.map(question => [question.number, question.officialStatus]), [
    [2, 'excluded'], [7, 'annulled'], [9, 'annulled'], [10, 'administratively_annulled'],
    [11, 'annulled'], [40, 'excluded'], [43, 'annulled'], [76, 'annulled'], [88, 'excluded'], [100, 'annulled']
  ]);
  assert.equal(definitive.scoredQuestionCount, 90);

  const preliminary = require('../imported_simulados/enamed-2026-inep-caderno-01.json');
  assert.equal(preliminary.answerKeyStatus, 'preliminary');
  assert.match(preliminary.answerKeySource, /2026_gabarito_caderno_1_preliminar\.pdf$/);
  assert.equal(preliminary.scoredQuestionCount, 100);
});
