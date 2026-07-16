'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const Gamification=require('../assets/gamification.js');

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
});

test('nível é derivado do XP e informa progresso restante',()=>{
  assert.deepEqual(Gamification.calculateLevelFromXP(0),{level:1,totalXP:0,xpWithinLevel:0,xpForNextLevel:100,remainingXP:100,progress:0});
  const level=Gamification.calculateLevelFromXP(150);
  assert.equal(level.level,2);
  assert.equal(level.xpWithinLevel,50);
  assert.equal(level.xpForNextLevel,120);
  assert.equal(level.remainingXP,70);
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
