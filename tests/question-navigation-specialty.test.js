'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadPlannerSandbox } = require('./planner-sandbox.js');

test('Próxima avança uma posição quando a questão respondida continua no filtro', () => {
  const ctx = loadPlannerSandbox();
  const questions = [{id:'q1'},{id:'q2'},{id:'q3'}];
  assert.equal(ctx.questionNavigationTarget(questions,questions,1,1),2);
});

test('Próxima não pula quando a questão respondida sai de Não respondidas', () => {
  const ctx = loadPlannerSandbox();
  const before = [{id:'q1'},{id:'q2'},{id:'q3'}];
  const after = [{id:'q1'},{id:'q3'}];
  assert.equal(ctx.questionNavigationTarget(before,after,1,1),1);
  assert.equal(after[1].id,'q3');
});

test('Anterior encontra a vizinha correta mesmo se a respondida saiu do filtro', () => {
  const ctx = loadPlannerSandbox();
  const before = [{id:'q1'},{id:'q2'},{id:'q3'}];
  const after = [{id:'q1'},{id:'q3'}];
  assert.equal(ctx.questionNavigationTarget(before,after,1,-1),0);
});

test('especialidades de GO aparecem em um único grupo sem alterar outros nomes', () => {
  const ctx = loadPlannerSandbox();
  for(const alias of ['Ginecologia','Obstetrícia','Ginecologia e Obstetrícia','G.O.','GO','Gineco-Obstetrícia']) {
    assert.equal(ctx.questionSpecialtyGroup(alias),'Ginecologia e Obstetrícia',alias);
  }
  assert.equal(ctx.questionSpecialtyGroup('Cardiologia'),'Cardiologia');
  assert.equal(ctx.questionSpecialtyGroup({specialty:'Obstetrícia',area:'Cirurgia'}),'Ginecologia e Obstetrícia');
});
