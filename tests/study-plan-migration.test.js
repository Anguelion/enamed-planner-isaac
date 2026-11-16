'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadPlannerSandbox } = require('./planner-sandbox');

const legacyVersion = 'block12-duration-2026-11-16-v1';
const firstDay = '2026-11-16';
const nextDay = '2026-11-17';
const plain = value=>JSON.parse(JSON.stringify(value));

function plannerWithLegacyDay() {
  const ctx = loadPlannerSandbox();
  ctx.__setOfficialSchedule(require('../official_schedule.json').items);
  ctx.__setVideoCatalog(require('../video_library/catalog.json').lessons);
  ctx.applyOfficialSchedule();
  const state = ctx.__getState();
  const [first,second] = state.schedule.filter(item=>item.block===12);
  const {video} = ctx.studyPlanParts(first)[0];
  for(const item of [first,second]) {
    const part = ctx.studyPlanParts(item)[0].video;
    item.date=firstDay;
    item.studySlots=[{date:firstDay,videoId:part.id,start:0,end:part.durationSeconds,minutes:Math.ceil(part.durationSeconds/60)}];
  }
  state.schedulePlanVersion=legacyVersion;
  state.reschedule={version:legacyVersion,restartDate:firstDay,dailyMinutes:120};
  return {ctx,state,first,second,video};
}

test('migra o trecho pendente do vídeo e mantém a parte estudada na data anterior',()=>{
  const {ctx,state,first,second,video} = plannerWithLegacyDay();
  const priorReview = {done:true,updatedAt:'2026-11-16T16:30:00Z'};
  state.previousBlockReviews={'1:1':priorReview};
  state.videoPlayer.resume[video.id]=650;
  state.videoPlayer.progress[video.id]={currentTime:700};
  first.notes='Minha anotação';
  first.hours=1;
  const originalId=first.id;
  assert.equal(ctx.ensureDurationStudyPlan(nextDay),true);
  assert.equal(state.reschedule.effectiveFrom,nextDay);
  assert.equal(first.id,originalId);
  assert.equal(first.notes,'Minha anotação');
  assert.equal(first.hours,1);
  assert.equal(state.previousBlockReviews['1:1'],priorReview);
  assert.equal(first.studySlots[0].date,firstDay);
  assert.equal(first.studySlots[0].end,700);
  assert.equal(first.studySlots[1].date,nextDay);
  assert.equal(first.studySlots[1].start,700);
  assert.equal(first.studySlots[1].end,video.durationSeconds);
  assert.ok(second.date>=nextDay);
  assert.equal(state.videoPlayer.resume[video.id],650);
  assert.equal(state.videoPlayer.progress[video.id].currentTime,700);
  assert.equal(ctx.ensureDurationStudyPlan(nextDay),false);
  for(const {date,minutes} of ctx.previousBlockReviewSchedule()) {
    if(date<nextDay) continue;
    const planned = ctx.plannedStudyEntries(date).filter(({slot})=>!slot.practice).reduce((sum,{slot})=>sum+slot.minutes,0);
    assert.ok(planned<=90);
    assert.ok(120-planned-minutes>=20);
  }
});

test('mantém o dia já iniciado e aplica os limites a partir do próximo dia útil',()=>{
  const {ctx,state,first,second,video} = plannerWithLegacyDay();
  const slots=plain([first.studySlots,second.studySlots]);
  state.videoPlayer.resume[video.id]=600;
  assert.equal(ctx.ensureDurationStudyPlan(firstDay),true);
  assert.equal(state.reschedule.effectiveFrom,nextDay);
  assert.deepEqual(plain([first.studySlots,second.studySlots]),slots);
});

test('um plano anterior na sincronização não restaura slots removidos pelo novo plano',()=>{
  const {ctx,state,first,video} = plannerWithLegacyDay();
  first.studySlots[0].date=nextDay;
  first.date=nextDay;
  const oldPlan=structuredClone(state);
  state.videoPlayer.watched[video.id]=true;
  first.manualQ=10;
  first.manualFC=10;
  ctx.ensureDurationStudyPlan(firstDay);
  assert.equal(first.studySlots,undefined);
  const merged=ctx.mergePlannerActivityState(state,oldPlan,true);
  const fromOld=ctx.mergePlannerActivityState(oldPlan,state,false);
  assert.equal(merged.schedulePlanVersion,state.schedulePlanVersion);
  assert.equal(fromOld.schedulePlanVersion,state.schedulePlanVersion);
  for(const result of [merged,fromOld]) {
    const lesson=result.schedule.find(item=>item.id===first.id);
    assert.equal(lesson.studySlots,undefined);
    assert.equal(lesson.manualQ,10);
    assert.equal(result.videoPlayer.watched[video.id],true);
  }
});

test('na migração vence a posição mais recente de uma retomada de vídeo',()=>{
  const {ctx,state,first,video} = plannerWithLegacyDay();
  state.videoPlayer.progress[video.id]={currentTime:900,updatedAt:'2026-11-16T16:10:00Z'};
  state.videoPlayer.resume[video.id]=600;
  state.videoPlayer.resumeUpdatedAt[video.id]='2026-11-16T16:15:00Z';
  ctx.ensureDurationStudyPlan(nextDay);
  assert.equal(first.studySlots[0].end,600);
  assert.equal(first.studySlots[1].start,600);
});

test('dois aparelhos que migraram separadamente adotam as datas da primeira migração',()=>{
  const {ctx,state,first} = plannerWithLegacyDay();
  ctx.ensureDurationStudyPlan(firstDay);
  state.reschedule.migratedAt='2026-11-16T16:00:00Z';
  const other=structuredClone(state);
  other.reschedule.migratedAt='2026-11-17T16:00:00Z';
  other.reschedule.effectiveFrom=nextDay;
  const otherFirst=other.schedule.find(item=>item.id===first.id);
  otherFirst.date=nextDay;
  otherFirst.studySlots[0].date=nextDay;
  const synced=ctx.mergePlannerActivityState(state,other,true);
  assert.equal(synced.reschedule.effectiveFrom,firstDay);
  assert.equal(synced.schedule.find(item=>item.id===first.id).studySlots[0].date,firstDay);
});
