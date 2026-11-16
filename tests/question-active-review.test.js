const test = require('node:test');
const assert = require('node:assert/strict');
const {loadPlannerSandbox} = require('./planner-sandbox');

function reviewFixture() {
  const ctx = loadPlannerSandbox();
  ctx.__setOfficialSchedule(require('../official_schedule.json').items);
  ctx.applyOfficialSchedule();
  ctx.navigateToTab = () => {};
  ctx.renderCadernoErros = () => {};
  ctx.persist = () => {};
  ctx.showStudyToast = () => {};
  const state = ctx.__getState();
  state.questionProgress = {};
  const item = state.schedule.find(row=>row.block===1 && row.lessonOrder===1);
  const question = (id,fields={})=>({
    id,collectionBlock:'1',scheduleId:item.id,topic:item.topic,answer:'A',
    options:{A:'Resposta correta',B:'Alternativa incorreta'},...fields
  });
  const today = ctx.studyDateKey();
  const answeredAt = `${ctx.addDays(today,-2)}T15:00:00Z`;
  return {ctx,state,item,question,today,answeredAt};
}

test('a revisão diária recupera acertos frágeis antigos sem tratar a confiança vazia como chute',()=>{
  const {ctx,state,question,today,answeredAt} = reviewFixture();
  const ids = ['erro','chute','incerto','sem-confianca','futuro','rascunho','gabarito','excluida'];
  ctx.__setQuestionBank(ids.map(id=>question(id)));
  Object.assign(state.questionProgress,{
    erro:{answeredAt,selected:'B',correct:false,confidence:90},
    chute:{answeredAt,selected:'A',correct:true,correctMode:'Chute'},
    incerto:{answeredAt,selected:'A',correct:true,certainty:25},
    'sem-confianca':{answeredAt,selected:'A',correct:true,confidence:0},
    futuro:{answeredAt,selected:'A',correct:true,confidence:30,nextReview:ctx.addDays(today,1)},
    rascunho:{correct:false,draftAnswer:'B'},
    gabarito:{answeredAt,selected:'B',correct:false,answerKeyIssue:true},
    excluida:{answeredAt,selected:'B',correct:false}
  });
  state.deletedQuestions.excluida = answeredAt;
  assert.deepEqual(Array.from(ctx.dailyDueErrorProgress(today),([id])=>id),['erro','chute','incerto']);
  assert.deepEqual(Array.from(ctx.cadernoDueEntries(today),entry=>entry.id),['erro','chute','incerto']);
});

test('errar uma recuperação de um acerto inicial preserva a resposta e remarca para o dia seguinte',()=>{
  const {ctx,state,question,today,answeredAt} = reviewFixture();
  const item = question('fragil');
  ctx.__setQuestionBank([item]);
  state.questionProgress[item.id] = {answeredAt,selected:'A',correct:true,correctMode:'Chute',confidence:30,attempts:1};
  ctx.openCadernoReviewEntries([item.id]);
  Object.assign(ctx.__getUi(),{cadernoSessionAnswer:'B',cadernoSessionConfidence:90,cadernoSessionRevealed:true});
  ctx.completeCadernoReviewStep();
  const result = state.questionProgress[item.id];
  assert.equal(result.correct,true);
  assert.equal(result.selected,'A');
  assert.equal(result.answeredAt,answeredAt);
  assert.equal(result.attempts,1);
  assert.equal(result.lastReviewCorrect,false);
  assert.equal(result.lastReviewSelected,'B');
  assert.equal(result.nextReview,ctx.addDays(today,1));
  assert.equal(state.questionReviewHistory.at(-1).selected,'B');
  assert.equal(ctx.questionReviewOutcome(result,true,30,today).nextReview,ctx.addDays(today,1));
  assert.equal(ctx.questionReviewOutcome(result,true,90,today).nextReview,ctx.addDays(today,7));
});

test('marcar um acerto como chute na reflexão antecipa sua próxima revisão',()=>{
  const {ctx,state,question,today,answeredAt} = reviewFixture();
  const item = question('chute-editado');
  state.questionProgress[item.id] = {answeredAt,selected:'A',correct:true};
  ctx.updateQuestionProgressField(item,{dataset:{progressField:'correctMode'},value:'Chute'});
  const progress = state.questionProgress[item.id];
  assert.equal(progress.correct,true);
  assert.equal(progress.nextReview,ctx.addDays(today,1));
});

test('o atalho de tema inclui o acerto frágil e o modo Hoje revê questões quando acabam as inéditas',async()=>{
  const {ctx,state,item,question,answeredAt} = reviewFixture();
  const bank = [question('chute'),question('nova')];
  ctx.__setQuestionBank(bank);
  state.questionProgress.chute = {answeredAt,selected:'A',correct:true,correctMode:'Chute'};
  const sessions = [];
  ctx.openCadernoReviewEntries = ids=>sessions.push(Array.from(ids));
  await ctx.openQuestionsForSchedule(item.id,{review:true});
  assert.deepEqual(sessions,[['chute']]);

  state.questionProgress.chute.nextReview = ctx.addDays(ctx.studyDateKey(),7);
  state.questionProgress.nova = {answeredAt,selected:'A',correct:true};
  await ctx.openQuestionsForSchedule(item.id,{reviewWhenDone:true});
  assert.deepEqual(sessions.at(-1),['chute','nova']);
});

test('limitar as questões normais mantém o alvo absoluto e não abre uma sessão de revisão',async()=>{
  const {ctx,state,item,question,answeredAt} = reviewFixture();
  const bank = ['respondida','nova-1','nova-2','nova-3','nova-4'].map(id=>question(id));
  ctx.__setQuestionBank(bank);
  state.questionProgress.respondida = {answeredAt,selected:'A',correct:true};
  await ctx.openQuestionsForSchedule(item.id,{maxQuestions:2,reviewWhenDone:true});
  assert.equal(ctx.__getUi().qFocusTarget,3);
  assert.deepEqual(Array.from(ctx.filteredQuestions(),entry=>entry.id),['nova-1','nova-2']);
});

test('uma sessão limitada não usa os itens de provas com folha de respostas separada',async()=>{
  const {ctx,state,question,answeredAt} = reviewFixture();
  const bank = [question('erro'),question('chute'),question('oficial',{officialStatus:'gabarito',answerSheetOnly:true})];
  ctx.__setQuestionBank(bank);
  ctx.questionBankCatalogStatus = ()=>({complete:true});
  state.questionProgress.erro = {answeredAt,selected:'B',correct:false,confidence:90};
  state.questionProgress.chute = {answeredAt,selected:'A',correct:true,correctMode:'Chute'};
  state.simuladoRuns = [{id:'prova',finishedAt:answeredAt,questionIds:['oficial'],answers:{oficial:'B'}}];
  let session;
  ctx.openCadernoReviewEntries = ids=>{session=Array.from(ids);};
  await ctx.startCadernoReviewSession({limit:1});
  assert.deepEqual(session,['erro']);
  await ctx.startCadernoReviewSession();
  assert.deepEqual(session,['erro','chute']);
});
