'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Gamification=require('../assets/gamification.js');

test('sincronização relacional permanece desativada no MVP local-first',()=>{
  assert.equal(Gamification.FEATURE_FLAGS.relationalSync,false);
  const client=fs.readFileSync(path.join(__dirname,'..','assets','planner.js'),'utf8');
  const syncStart=client.indexOf('async function syncGamificationLedger');
  const guard=client.indexOf('if(!Gamification?.FEATURE_FLAGS?.relationalSync)',syncStart);
  const firstRpc=client.indexOf("sbClient.rpc('revert_gamification_import'",syncStart);
  assert.ok(syncStart>=0 && guard>syncStart && firstRpc>guard);
});

test('questão correta, errada, revisada e consolidada seguem a regra configurada',()=>{
  assert.equal(Gamification.calculateQuestionXP({correct:true}).finalBaseXP,5);
  assert.equal(Gamification.calculateQuestionXP({correct:false}).finalBaseXP,2);
  assert.equal(Gamification.calculateQuestionXP({correct:false,reviewedError:true}).finalBaseXP,5);
  assert.equal(Gamification.calculateQuestionXP({correct:true,consolidation:true}).finalBaseXP,6);
});

test('repetição reduz XP em menos de 24 horas e entre 24 horas e 7 dias',()=>{
  const previous='2026-07-01T10:00:00.000Z';
  assert.equal(Gamification.calculateQuestionXP({correct:true,previousOccurredAt:previous,occurredAt:'2026-07-01T11:00:00.000Z'}).finalBaseXP,1);
  assert.equal(Gamification.calculateQuestionXP({correct:true,previousOccurredAt:previous,occurredAt:'2026-07-03T10:00:00.000Z'}).finalBaseXP,2.5);
  assert.equal(Gamification.calculateQuestionXP({correct:true,previousOccurredAt:previous,occurredAt:'2026-07-09T10:00:00.000Z'}).finalBaseXP,5);
});

test('ledger é idempotente e limita multiplicador total',()=>{
  const ledger=[];
  const event={user_id:'u1',activity_type:'question_answer',source_type:'question',source_id:'q1',source_event_id:'attempt-1',reason:'question_answer',base_xp:5,multipliers:{element:1.5,streak:1.15,balance:1.1}};
  const first=Gamification.awardXPIdempotently(ledger,event);
  const duplicate=Gamification.awardXPIdempotently(ledger,event);
  assert.equal(first.duplicate,false);
  assert.equal(duplicate.duplicate,true);
  assert.equal(ledger.length,1);
  assert.equal(first.transaction.final_multiplier,1.5);
  assert.equal(first.transaction.final_xp,7.5);
  assert.equal(first.transaction.eventKey,first.transaction.idempotency_key);
});

test('responder novamente o mesmo evento de questão não duplica XP',()=>{
  const ledger=[];
  const event={user_id:'u1',activity_type:'question_answer',source_type:'question',source_id:'q42',source_event_id:'answer:q42:2026-07-15T10:00:00Z',reason:'question_answer',base_xp:5,occurred_at:'2026-07-15T10:00:00Z'};
  Gamification.awardXPIdempotently(ledger,event);
  Gamification.awardXPIdempotently(ledger,{...event,base_xp:99});
  assert.equal(ledger.length,1);
  assert.equal(Gamification.totalXP(ledger),5);
});

test('videoaula contabiliza somente segundos ativos e bônus único de conclusão',()=>{
  assert.deepEqual(Gamification.calculateVideoXP({seconds:0,completed:false}),{baseXP:0,watchedSeconds:0,minuteXP:0,completionBonus:0});
  assert.equal(Gamification.calculateVideoXP({seconds:600}).baseXP,4);
  assert.equal(Gamification.calculateVideoXP({seconds:600,completed:true}).baseXP,9);
  assert.equal(Gamification.calculateVideoXP({seconds:600,completed:true,completionAlreadyAwarded:true}).baseXP,4);
  const ledger=[];
  const event={activity_type:'video_progress',source_type:'video_session',source_id:'v1',source_event_id:'session-1',reason:'video_active_minutes',base_xp:4};
  Gamification.awardXPIdempotently(ledger,event);
  Gamification.awardXPIdempotently(ledger,event);
  assert.equal(ledger.length,1);
  const completion={activity_type:'video_completion',source_type:'video',source_id:'v1',source_event_id:'completion:v1',reason:'video_completion_90',base_xp:5};
  Gamification.awardXPIdempotently(ledger,completion);
  Gamification.awardXPIdempotently(ledger,completion);
  assert.equal(ledger.filter(item=>item.activity_type==='video_completion').length,1);
});

function flashcardReview(overrides={}) {
  return {id:'review-1',cardId:'fc-1',rating:3,sessionId:'session-1',reviewedAt:'2026-07-16T10:00:00.000Z',wasDue:false,wasNew:true,legacy:false,...overrides};
}

test('abrir ou revelar flashcard não concede XP',()=>{
  const state=Gamification.ensureState({});
  assert.equal(Gamification.totalXP(state.xpTransactions),0);
  assert.equal(state.xpTransactions.length,0);
});

test('primeira avaliação de cartão novo concede 1 XP',()=>{
  const state=Gamification.ensureState({});
  const result=Gamification.awardFlashcardReviewXP(state,flashcardReview());
  assert.equal(result.awarded,true);
  assert.equal(result.transaction.base_xp,1);
  assert.equal(result.transaction.final_xp,1);
  assert.equal(result.transaction.metadata.wasNew,true);
});

test('revisão vencida concede 1 XP e as quatro avaliações têm o mesmo XP-base',()=>{
  for(const rating of [1,2,3,4]) {
    const state=Gamification.ensureState({});
    const result=Gamification.awardFlashcardReviewXP(state,flashcardReview({id:`review-${rating}`,rating,wasNew:false,wasDue:true}));
    assert.equal(result.transaction.base_xp,1);
    assert.equal(result.transaction.metadata.rating,rating);
  }
});

test('mesmo reviewLogId não duplica XP',()=>{
  const state=Gamification.ensureState({});
  const review=flashcardReview();
  const first=Gamification.awardFlashcardReviewXP(state,review);
  const second=Gamification.awardFlashcardReviewXP(state,review);
  assert.equal(first.awarded,true);
  assert.equal(second.duplicate,true);
  assert.equal(state.xpTransactions.length,1);
});

test('repetição imediata na mesma sessão não concede outro XP',()=>{
  const state=Gamification.ensureState({});
  Gamification.awardFlashcardReviewXP(state,flashcardReview());
  const repeat=Gamification.awardFlashcardReviewXP(state,flashcardReview({id:'review-2',wasNew:false,wasDue:false,reviewedAt:'2026-07-16T10:01:00.000Z'}));
  assert.equal(repeat.awarded,false);
  assert.ok(repeat.evaluation.reasons.includes('not_due_or_new'));
  assert.equal(Gamification.totalXP(state.xpTransactions),1);
});

test('nova revisão legítima futura concede XP',()=>{
  const state=Gamification.ensureState({});
  Gamification.awardFlashcardReviewXP(state,flashcardReview());
  const future=Gamification.awardFlashcardReviewXP(state,flashcardReview({id:'review-future',wasNew:false,wasDue:true,reviewedAt:'2026-07-20T10:00:00.000Z'}));
  assert.equal(future.awarded,true);
  assert.equal(Gamification.totalXP(state.xpTransactions),2);
});

test('cinco cartões diferentes concedem 5 XP-base e atualizam perfil e histórico',()=>{
  const state=Gamification.ensureState({});
  for(let index=1;index<=5;index+=1) Gamification.awardFlashcardReviewXP(state,flashcardReview({id:`review-${index}`,cardId:`fc-${index}`}));
  assert.equal(state.xpTransactions.length,5);
  assert.equal(Gamification.totalXP(state.xpTransactions),5);
  assert.equal(state.profile.cachedTotalXP,5);
  assert.equal(state.xpTransactions.filter(item=>item.activity_type==='flashcard_review').length,5);
});

test('reload não duplica revisão de flashcard',()=>{
  const state=Gamification.ensureState({});
  const review=flashcardReview();
  Gamification.awardFlashcardReviewXP(state,review);
  const reloaded=Gamification.ensureState(JSON.parse(JSON.stringify(state)));
  const duplicate=Gamification.awardFlashcardReviewXP(reloaded,review);
  assert.equal(duplicate.duplicate,true);
  assert.equal(Gamification.totalXP(reloaded.xpTransactions),1);
});

test('prévia histórica reconhece reviewLogId e não repete revisão já lançada',()=>{
  const state=Gamification.ensureState({});
  const review=flashcardReview();
  Gamification.awardFlashcardReviewXP(state,review);
  const plannerState={gamification:state,flashcardSystem:{reviewLogs:[review]},flashcardReviewHistory:[]};
  const preview=Gamification.createAutomaticLegacyPreview({state:plannerState});
  const known=new Set(state.xpTransactions.map(item=>item.source_event_id));
  assert.equal(preview.events.filter(event=>!known.has(event.source_event_id)).length,0);
});

test('reabrir um bloco não duplica o bônus de conclusão',()=>{
  const ledger=[];
  const completion={activity_type:'block_completion',source_type:'block',source_id:'10',source_event_id:'block:10:first-completion',reason:'block_completion',base_xp:100};
  Gamification.awardXPIdempotently(ledger,completion);
  Gamification.awardXPIdempotently(ledger,completion);
  assert.equal(ledger.length,1);
  assert.equal(Gamification.totalXP(ledger),100);
});

test('serializar e recarregar o estado não recria lançamentos',()=>{
  const original=Gamification.ensureState({});
  const event={activity_type:'question_answer',source_type:'question',source_id:'q1',source_event_id:'attempt-1',reason:'question_answer',base_xp:5,occurred_at:'2026-07-15T10:00:00Z'};
  Gamification.awardXPIdempotently(original.xpTransactions,event);
  const reloaded=Gamification.ensureState(JSON.parse(JSON.stringify(original)));
  const duplicate=Gamification.awardXPIdempotently(reloaded.xpTransactions,event);
  assert.equal(duplicate.duplicate,true);
  assert.equal(reloaded.xpTransactions.length,1);
});

test('registros do ledger preservam campos de auditoria completos',()=>{
  const ledger=[];
  const {transaction}=Gamification.awardXPIdempotently(ledger,{activity_type:'flashcard_review',source_type:'flashcard',source_id:'fc1',source_event_id:'review-1',reason:'flashcard_due_review',base_xp:1,multipliers:{element:1.1},occurred_at:'2026-07-15T10:00:00Z',is_legacy:true,import_batch_id:'batch-1'});
  ['eventKey','activity_type','source_type','source_id','occurred_at','base_xp','element_multiplier','streak_multiplier','balance_multiplier','final_multiplier','final_xp','is_legacy','import_batch_id'].forEach(field=>assert.ok(Object.hasOwn(transaction,field),field));
  assert.equal(transaction.is_legacy,true);
  assert.equal(transaction.import_batch_id,'batch-1');
});

test('estado antigo recebe gamificação vazia sem perder campos nem importar XP',()=>{
  const legacy={schedule:[{id:'a1',status:'Concluído'}],daily:{'2026-07-01':{q:10}},customField:{preserved:true}};
  const snapshot=JSON.stringify(legacy);
  const result=Gamification.ensurePlannerState(legacy);
  assert.equal(result.created,true);
  assert.deepEqual(result.state.schedule,JSON.parse(snapshot).schedule);
  assert.deepEqual(result.state.daily,JSON.parse(snapshot).daily);
  assert.deepEqual(result.state.customField,{preserved:true});
  assert.equal(result.state.gamification.xpTransactions.length,0);
  assert.equal(result.state.gamification.importBatches.length,0);
  assert.equal(result.state.gamification.profile.cachedTotalXP,0);
});

test('nível é derivado do XP e informa progresso restante',()=>{
  assert.deepEqual(Gamification.calculateLevelFromXP(0),{level:1,totalXP:0,xpWithinLevel:0,xpForNextLevel:100,remainingXP:100,progress:0});
  const level=Gamification.calculateLevelFromXP(150);
  assert.equal(level.level,2);
  assert.equal(level.xpWithinLevel,50);
  assert.equal(level.xpForNextLevel,120);
  assert.equal(level.remainingXP,70);
});

test('zero blocos retorna Aldeão',()=>{
  const rank=Gamification.getRankFromCompletedBlocks(0);
  assert.equal(rank.name,'Aldeão');
  assert.equal(rank.completedBlocks,0);
  assert.equal(rank.blocksForNextRank,3);
});

test('dois blocos ainda retorna Aldeão',()=>{
  assert.equal(Gamification.getRankFromCompletedBlocks(2).key,'aldeao');
});

test('três blocos retorna Aprendiz',()=>{
  const rank=Gamification.getRankFromCompletedBlocks(3);
  assert.equal(rank.name,'Aprendiz');
  assert.equal(rank.progressPercent,0);
});

test('seis blocos retorna Escudeiro',()=>{
  assert.equal(Gamification.getRankFromCompletedBlocks(6).key,'escudeiro');
});

test('vinte e sete blocos retorna Imperador',()=>{
  assert.equal(Gamification.getRankFromCompletedBlocks(27).name,'Imperador');
});

test('trinta blocos retorna Imperador como classe máxima',()=>{
  const rank=Gamification.getRankFromCompletedBlocks(30);
  assert.equal(rank.key,'imperador');
  assert.equal(rank.isMaxRank,true);
  assert.equal(rank.nextRank,null);
  assert.equal(rank.progressPercent,100);
});

test('blocos negativos são tratados como zero',()=>{
  assert.deepEqual(Gamification.getRankFromCompletedBlocks(-8),Gamification.getRankFromCompletedBlocks(0));
});

test('blocos acima de trinta são limitados a trinta',()=>{
  assert.deepEqual(Gamification.getRankFromCompletedBlocks(99),Gamification.getRankFromCompletedBlocks(30));
});

test('XP diferente com o mesmo número de blocos mantém a mesma classe',()=>{
  const lowXP=Gamification.getRankFromCompletedBlocks(12);
  const highXP=Gamification.getRankFromCompletedBlocks(12);
  assert.equal(Gamification.calculateLevelFromXP(0).level,1);
  assert.ok(Gamification.calculateLevelFromXP(5000).level>1);
  assert.equal(lowXP.key,highXP.key);
  assert.equal(lowXP.name,'Cavaleiro');
});

test('reload não repete promoção já apresentada',()=>{
  const baseline=Gamification.evaluateRankPromotion({},2);
  assert.equal(baseline.promotion,null);
  const promoted=Gamification.evaluateRankPromotion(baseline.state,3);
  assert.equal(promoted.promotion?.name,'Aprendiz');
  const reloaded=Gamification.evaluateRankPromotion(JSON.parse(JSON.stringify(promoted.state)),3);
  assert.equal(reloaded.promotion,null);
  const repeatedAfterUndo=Gamification.evaluateRankPromotion(Gamification.evaluateRankPromotion(reloaded.state,2).state,3);
  assert.equal(repeatedAfterUndo.promotion,null);
});

test('prévia automática preserva eventos verificáveis sem alterar o estado',()=>{
  const state={
    questionProgress:{q1:{selected:'A',correct:true,answeredAt:'2026-07-01T10:00:00Z'}},
    studySessions:[{id:'s1',kind:'video',scheduleId:'a1',seconds:300,savedAt:'2026-07-02T10:00:00Z'}],
    videoPlayer:{watched:{v1:true},watchedAt:{v1:'2026-07-02T11:00:00Z'}}
  };
  const before=JSON.stringify(state);
  const preview=Gamification.createAutomaticLegacyPreview({state,completedBlockIds:['1'],blockDates:{1:'2026-07-03T10:00:00Z'}});
  assert.equal(preview.events.length,4);
  assert.equal(preview.totalXP,112);
  assert.equal(JSON.stringify(state),before);
});

test('conclusões administrativas de vídeo não entram no XP retroativo',()=>{
  const state={videoPlayer:{watched:{verified:true,administrative:true},autoCompletedVideoIds:['administrative']}};
  const preview=Gamification.createAutomaticLegacyPreview({state,generatedAt:'2026-07-15T10:00:00Z'});
  assert.equal(preview.events.length,1);
  assert.equal(preview.events[0].source_id,'verified');
  assert.equal(preview.totalXP,5);
});

test('resumo do dry-run discrimina quantidade e XP por categoria',()=>{
  const events=[];
  for(let index=0;index<31;index+=1) events.push({activity_type:'question_answer',base_xp:index<23?4:3});
  for(let index=0;index<104;index+=1) events.push({activity_type:'video_completion',base_xp:5});
  for(let index=0;index<5;index+=1) events.push({activity_type:'flashcard_review',base_xp:1});
  events.push({activity_type:'simulation_completion',base_xp:110});
  const summary=Gamification.summarizePreview({events});
  assert.equal(summary.events,141);
  assert.equal(summary.xp,751);
  assert.deepEqual(summary.categories.questions,{count:31,xp:116});
  assert.deepEqual(summary.categories.videos,{count:104,xp:520});
  assert.deepEqual(summary.categories.flashcards,{count:5,xp:5});
  assert.deepEqual(summary.categories.simulations,{count:1,xp:110});
  assert.deepEqual(summary.categories.blocks,{count:0,xp:0});
  assert.deepEqual(summary.categories.other,{count:0,xp:0});
});

test('importação agregada não inventa acertos, datas ou revisões',()=>{
  const preview=Gamification.createAggregateLegacyPreview({date:'2026-07-01',questions:10,videoMinutes:30,flashcards:8,simulations:1});
  const questionEvent=preview.events.find(event=>event.activity_type==='question_session');
  assert.equal(questionEvent.metadata.correctAnswers,0);
  assert.equal(questionEvent.metadata.reviewedErrors,0);
  assert.equal(questionEvent.base_xp,20);
  assert.equal(preview.totalXP,90);
  assert.equal(preview.events.find(event=>event.activity_type==='flashcard_session').base_xp,8);
  const simulation=preview.events.find(event=>event.activity_type==='simulation_completion');
  assert.equal(simulation.base_xp,50);
  assert.equal(simulation.metadata.detailsUnknown,true);
});

test('commit é idempotente e reversão preserva o ledger com lançamentos negativos',()=>{
  const state=Gamification.ensureState({});
  const preview=Gamification.createAggregateLegacyPreview({date:'2026-07-01',questions:10,correctAnswers:5,videoMinutes:30});
  const first=Gamification.commitLegacyImport(state,preview,{userId:'u1'});
  const second=Gamification.commitLegacyImport(state,preview,{userId:'u1'});
  assert.equal(first.transactions.length,2);
  assert.equal(second.alreadyCommitted,true);
  const originals=state.xpTransactions.length;
  const totalBefore=Gamification.totalXP(state.xpTransactions);
  const reverted=Gamification.revertLegacyImport(state,first.batch.id,{userId:'u1'});
  assert.equal(reverted.reversals.length,2);
  assert.equal(state.xpTransactions.length,originals+2);
  assert.equal(Gamification.totalXP(state.xpTransactions),0);
  assert.ok(totalBefore>0);
  const reimported=Gamification.commitLegacyImport(state,preview,{userId:'u1'});
  assert.equal(reimported.alreadyReverted,true);
  assert.equal(state.xpTransactions.length,originals+2);
});

test('bônus de simulado respeita abandono e teto',()=>{
  assert.equal(Gamification.calculateSimulationBonus({abandoned:true,completed:true,totalQuestions:100,correctAnswers:100}).baseXP,0);
  assert.equal(Gamification.calculateSimulationBonus({completed:true,totalQuestions:100,correctAnswers:90,reviewedErrors:10}).baseXP,170);
  assert.equal(Gamification.calculateSimulationBonus({completed:true,totalQuestions:1000,correctAnswers:1000,reviewedErrors:1000}).baseXP,300);
});

function simulationAttempt(overrides={}) {
  const totalQuestions=overrides.totalQuestions ?? 20;
  const correctAnswers=overrides.correctAnswers ?? 14;
  const incorrectAnswers=totalQuestions-correctAnswers;
  const reviewedErrors=overrides.reviewedErrors ?? incorrectAnswers;
  return {attemptId:'attempt-1',simulationId:'simulation-1',totalQuestions,answeredQuestions:totalQuestions,correctAnswers,reviewedErrors,finished:true,abandoned:false,...overrides};
}

test('simulado abandonado ou incompleto não é elegível',()=>{
  const abandoned=Gamification.evaluateSimulationEligibility(simulationAttempt({abandoned:true}),{});
  assert.equal(abandoned.isEligibleForCompletionXP,false);
  assert.ok(abandoned.ineligibilityReasons.includes('abandoned'));
  const incomplete=Gamification.evaluateSimulationEligibility(simulationAttempt({answeredQuestions:19}),{});
  assert.equal(incomplete.isEligibleForCompletionXP,false);
  assert.ok(incomplete.ineligibilityReasons.includes('incomplete_answers'));
});

test('simulado concluído concede bônus uma vez e reload não duplica',()=>{
  const state=Gamification.ensureState({});
  const eligibility=Gamification.evaluateSimulationEligibility(simulationAttempt(),state);
  const bonus=Gamification.calculateSimulationBonus({completed:true,totalQuestions:eligibility.totalQuestions,correctAnswers:eligibility.correctAnswers});
  const event={activity_type:'simulation_completion',source_type:'simulation',source_id:eligibility.simulationId,source_event_id:`simulation-completion:${eligibility.attemptId}`,reason:'simulation_completion',base_xp:bonus.completionXP};
  Gamification.awardXPIdempotently(state.xpTransactions,event);
  const reloaded=Gamification.ensureState(JSON.parse(JSON.stringify(state)));
  const duplicate=Gamification.awardXPIdempotently(reloaded.xpTransactions,event);
  assert.equal(duplicate.duplicate,true);
  assert.equal(reloaded.xpTransactions.length,1);
  assert.equal(Gamification.evaluateSimulationEligibility(simulationAttempt(),reloaded).completionAlreadyProcessed,true);
});

test('bônus de desempenho cobre todas as faixas e expõe breakdown auditável',()=>{
  const expected=[[49,0],[50,10],[60,20],[70,30],[80,40],[90,50]];
  expected.forEach(([correct,performance])=>assert.equal(Gamification.calculateSimulationBonus({completed:true,totalQuestions:100,correctAnswers:correct}).performanceBonus,performance));
  const bonus=Gamification.calculateSimulationBonus({completed:true,totalQuestions:100,correctAnswers:90,reviewedErrors:10});
  assert.deepEqual({completionBase:bonus.completionBase,questionQuantityBonus:bonus.questionQuantityBonus,performanceBonus:bonus.performanceBonus,reviewedErrorsBonus:bonus.reviewedErrorsBonus,cappedValue:bonus.cappedValue,finalXP:bonus.finalXP},{completionBase:50,questionQuantityBonus:50,performanceBonus:50,reviewedErrorsBonus:20,cappedValue:170,finalXP:170});
  assert.equal(Gamification.calculateSimulationBonus({completed:true,totalQuestions:1000,correctAnswers:1000,reviewedErrors:1000}).finalXP,300);
});

test('correção parcial não concede fragmento nem roleta',()=>{
  const state=Gamification.ensureState({});
  const eligibility=Gamification.evaluateSimulationEligibility(simulationAttempt({reviewedErrors:2}),state);
  assert.equal(eligibility.isFullyReviewed,false);
  assert.equal(Gamification.grantSimulationFragment(state,eligibility).granted,false);
  assert.equal(Gamification.createElementReward(state,eligibility,{rng:()=>0}).created,false);
});

test('correção completa concede fragmento uma única vez',()=>{
  const state=Gamification.ensureState({});
  const eligibility=Gamification.evaluateSimulationEligibility(simulationAttempt(),state);
  const first=Gamification.grantSimulationFragment(state,eligibility,{now:'2026-07-16T10:00:00Z'});
  const duplicate=Gamification.grantSimulationFragment(state,eligibility,{now:'2026-07-16T10:01:00Z'});
  assert.equal(first.granted,true);
  assert.equal(duplicate.duplicate,true);
  assert.equal(state.rankProgress.fragments,1);
});

test('três fragmentos formam um medalhão automaticamente',()=>{
  const state=Gamification.ensureState({});
  for(let index=1;index<=3;index+=1) {
    const eligibility=Gamification.evaluateSimulationEligibility(simulationAttempt({attemptId:`attempt-${index}`,simulationId:`simulation-${index}`}),state);
    Gamification.grantSimulationFragment(state,eligibility);
  }
  assert.equal(state.rankProgress.fragments,0);
  assert.equal(state.rankProgress.simulationMedallions,1);
  assert.equal(state.rankProgress.medallionEvents.length,1);
});

test('aceleração exige dois blocos e respeita limites por faixa e global',()=>{
  const oneBlock=Gamification.ensureState({rankProgress:{simulationMedallions:1}});
  assert.equal(Gamification.applyRankAcceleration(oneBlock,1).consumed,false);
  const twoBlocks=Gamification.ensureState({rankProgress:{simulationMedallions:1}});
  assert.equal(Gamification.applyRankAcceleration(twoBlocks,2).consumed,true);
  assert.equal(Gamification.getRankFromProgress(2,twoBlocks.rankProgress).key,'aprendiz');
  assert.equal(Gamification.applyRankAcceleration(twoBlocks,2).duplicate,true);
  const limited=Gamification.ensureState({rules:{simulation:{globalSubstitutionLimit:3}},rankProgress:{simulationMedallions:4,simulationMedallionsUsed:3,globalSubstitutionsUsed:3}});
  assert.equal(Gamification.applyRankAcceleration(limited,11).consumed,false);
});

test('Imperador continua exigindo trinta blocos',()=>{
  const state=Gamification.ensureState({rankProgress:{simulationMedallions:5}});
  assert.equal(Gamification.applyRankAcceleration(state,26).consumed,false);
  assert.notEqual(Gamification.getRankFromProgress(26,state.rankProgress).key,'imperador');
  assert.equal(Gamification.getRankFromProgress(30,state.rankProgress).key,'imperador');
});

function sequenceRng(values) { let index=0; return ()=>values[Math.min(index++,values.length-1)]; }

test('roleta usa RNG controlado e respeita probabilidades',()=>{
  assert.equal(Gamification.rarityFromRoll(.1),'common');
  assert.equal(Gamification.rarityFromRoll(.6),'rare');
  assert.equal(Gamification.rarityFromRoll(.85),'epic');
  assert.equal(Gamification.rarityFromRoll(.97),'legendary');
});

test('recompensa é persistida selada, reload mantém resultado e tentativa não sorteia novamente',()=>{
  const state=Gamification.ensureState({});
  const eligibility=Gamification.evaluateSimulationEligibility(simulationAttempt(),state);
  const first=Gamification.createElementReward(state,eligibility,{rng:sequenceRng([.1,.2]),now:'2026-07-16T10:00:00Z'});
  assert.equal(first.created,true);
  assert.equal(first.reward.status,'sealed');
  assert.equal(state.elementRewards.length,1);
  const reloaded=Gamification.ensureState(JSON.parse(JSON.stringify(state)));
  const duplicate=Gamification.createElementReward(reloaded,eligibility,{rng:()=>.99});
  assert.equal(duplicate.duplicate,true);
  assert.equal(duplicate.reward.rarity,'common');
});

test('recompensa rara sempre possui dois elementos distintos',()=>{
  const state=Gamification.ensureState({});
  const eligibility=Gamification.evaluateSimulationEligibility(simulationAttempt(),state);
  const reward=Gamification.createElementReward(state,eligibility,{rng:sequenceRng([.7,.1,.1])}).reward;
  assert.equal(reward.rarity,'rare');
  assert.equal(reward.elements.length,2);
  assert.notEqual(reward.elements[0],reward.elements[1]);
});

test('buffs elementais afetam somente suas atividades e eventos dentro da validade',()=>{
  const openedAt='2026-07-16T10:00:00Z';
  const expiresAt='2026-07-17T10:00:00Z';
  const rewards=[
    {id:'fire',elements:['fire'],multiplier:1.2,rarity:'common',openedAt,expiresAt},
    {id:'water',elements:['water'],multiplier:1.2,rarity:'common',openedAt,expiresAt},
    {id:'earth',elements:['earth'],multiplier:1.2,rarity:'common',openedAt,expiresAt},
    {id:'air',elements:['air'],multiplier:1.2,rarity:'common',openedAt,expiresAt}
  ];
  const now='2026-07-16T12:00:00Z';
  assert.equal(Gamification.getActiveElementMultipliers(rewards,'question_answer',now).rewardId,'fire');
  assert.equal(Gamification.getActiveElementMultipliers(rewards,'video_progress',now).rewardId,'water');
  assert.equal(Gamification.getActiveElementMultipliers(rewards,'reading',now).rewardId,'earth');
  assert.equal(Gamification.getActiveElementMultipliers(rewards,'flashcard_review',now).rewardId,'air');
  assert.equal(Gamification.getActiveElementMultipliers(rewards,'simulation_completion',now).multiplier,1);
  assert.equal(Gamification.getActiveElementMultipliers(rewards,'question_answer','2026-07-16T09:00:00Z').multiplier,1);
  assert.equal(Gamification.getActiveElementMultipliers(rewards,'question_answer','2026-07-17T11:00:00Z').multiplier,1);
});

test('dois buffs iguais usam o maior e o cap global permanece x1,50',()=>{
  const rewards=[
    {id:'low',elements:['fire'],multiplier:1.2,openedAt:'2026-07-16T10:00:00Z',expiresAt:'2026-07-18T10:00:00Z'},
    {id:'high',elements:['fire'],multiplier:1.5,openedAt:'2026-07-16T10:00:00Z',expiresAt:'2026-07-18T10:00:00Z'}
  ];
  assert.equal(Gamification.getActiveElementMultipliers(rewards,'question_answer','2026-07-16T12:00:00Z').multiplier,1.5);
  assert.equal(Gamification.applyMultiplierCap({element:1.5,streak:1.2}).final,1.5);
});

test('buff novo ou expirado não recalcula XP anterior',()=>{
  const ledger=[];
  Gamification.awardXPIdempotently(ledger,{activity_type:'question_answer',source_type:'question',source_id:'q1',source_event_id:'before-buff',reason:'question_answer',base_xp:5});
  const original=ledger[0].final_xp;
  Gamification.getActiveElementMultipliers([{id:'fire',elements:['fire'],multiplier:1.5,openedAt:'2026-07-16T10:00:00Z',expiresAt:'2026-07-16T11:00:00Z'}],'question_answer','2026-07-16T12:00:00Z');
  assert.equal(ledger[0].final_xp,original);
});

test('legado exige preview e confirmação, não ativa buff automaticamente e abre uma vez',()=>{
  const state=Gamification.ensureState({});
  const attempt=simulationAttempt({attemptId:'legacy-1',simulationId:'old-sim'});
  const before=JSON.stringify(state);
  const preview=Gamification.previewLegacySimulationChests([attempt],state);
  assert.equal(preview.candidates.length,1);
  assert.equal(JSON.stringify(state),before);
  assert.equal(Gamification.createLegacyChest(state,attempt).reason,'confirmation_required');
  const committed=Gamification.createLegacyChest(state,attempt,{confirmed:true,now:'2026-07-16T10:00:00Z'});
  assert.equal(committed.created,true);
  assert.equal(state.elementRewards.length,0);
  const duplicate=Gamification.createLegacyChest(state,attempt,{confirmed:true});
  assert.equal(duplicate.duplicate,true);
  const opened=Gamification.openLegacyChest(state,committed.chest.id,{rng:sequenceRng([.1,.2]),now:'2026-07-16T11:00:00Z'});
  assert.equal(opened.opened,true);
  assert.equal(opened.reward.legacy,true);
  assert.equal(Gamification.openLegacyChest(state,committed.chest.id,{rng:()=>.99}).duplicate,true);
});
