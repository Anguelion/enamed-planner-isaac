'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const UI=require('../assets/personal-ui');
const UX=require('../assets/planner-ux');
const {loadPlannerSandbox}=require('./planner-sandbox');

test('preferências inválidas não ativam recursos nem quebram abertura',()=>{
  for(const raw of ['null','{','[]','{"mascot":"false","gamification":1}']) {
    assert.deepEqual(UI.read({getItem:()=>raw}),UI.defaults);
  }
  assert.equal(UI.read({getItem:()=>'{"mascot":true}'}).mascot,true);
});
test('Radar diferencia edição antiga, recente e data desconhecida',()=>{
  assert.equal(UI.editionAge('2026-08-28','2026-09-30'),33);
  assert.equal(UI.editionAge('2026-09-30','2026-09-30'),0);
  assert.equal(UI.editionAge('', '2026-09-30'),null);
  assert.equal(UI.editionAge('2026-10-01','2026-09-30'),null);
});
test('Biblioteca e nomes pessoais preservam rotas existentes',()=>{
  for(const [route,tab] of [['biblioteca','biblioteca'],['blocos','cronograma'],['revisoes','flashcards'],['progresso','analise'],['missao','cronograma']]) {
    assert.equal(UX.parseRoute(`#/${route}`).tab,tab);
  }
});
test('abertura mantém atividades recentes do seed sem realizar limpeza histórica',()=>{
  const ctx=loadPlannerSandbox({initialState:{schedule:[],dayLogs:[{date:'2026-09-29',questions:7}],questionProgress:{recent:{answeredAt:'2026-09-29T12:00:00Z',selected:'A',correct:true}}}});
  const state=ctx.__getState();
  assert.equal(state.activityReset,undefined);
  assert.ok(state.questionProgress.recent,'a resposta recente deve continuar presente');
  assert.equal(ctx.__getLocalBackups().some(backup=>String(backup.reason||'').includes('limpar atividades')),false);
});
