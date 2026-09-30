'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {loadPlannerSandbox}=require('./planner-sandbox');
const plain=value=>JSON.parse(JSON.stringify(value));

function readyPlanner(options) {
  const ctx=loadPlannerSandbox(options);
  ctx.render=()=>{};
  ctx.normalizeSyncedPlannerState();
  const state=ctx.__getState();
  ctx.__setState(ctx.mergePlannerActivityState(state,state,true));
  ctx.normalizeSyncedPlannerState();
  return ctx;
}
function readyCloudPlanner() {
  let ctx;
  const supabaseClient={from(){return {select(){return this;},eq(){return this;},async maybeSingle(){return ctx.remoteResponse;}};}};
  ctx=readyPlanner({origin:'https://enamed-planner-isaac.pages.dev',supabaseClient});
  vm.runInContext("currentUser={id:'sync-test'};",ctx);
  return ctx;
}

test('estado repetido, propriedades reordenadas e metadados de outra aba não criam eco',()=>{
  const ctx=readyPlanner();
  let writes=0;let renders=0;
  ctx.writeLocalState=()=>{writes++;return true;};
  ctx.render=()=>renders++;
  const incoming=Object.fromEntries(Object.entries(plain(ctx.__getState())).reverse());
  incoming.syncMeta={devices:{other:{id:'other',lastSeenAt:'2026-09-30T12:00:00Z'}}};
  assert.equal(ctx.applyCrossTabPlannerState(incoming),false);
  assert.equal(ctx.applyCrossTabPlannerState(plain(ctx.__getState())),false);
  assert.equal(writes,0,'a recepção não deve gerar outra gravação/evento storage');
  assert.equal(renders,0,'receber o mesmo conteúdo não deve recriar a tela');
});

test('progresso realmente novo vindo de outra aba é exibido uma vez e não reenviado',()=>{
  const ctx=readyPlanner();
  let writes=0;let renders=0;
  ctx.writeLocalState=()=>{writes++;return true;};
  ctx.render=()=>renders++;
  const incoming=plain(ctx.__getState());
  incoming.schedule[0].manualQ=17;
  incoming.schedule[0].manualQUpdatedAt='2026-09-30T12:00:00Z';
  assert.equal(ctx.applyCrossTabPlannerState(incoming),false);
  assert.equal(ctx.__getState().schedule[0].manualQ,17);
  assert.equal(renders,1);
  assert.equal(ctx.applyCrossTabPlannerState(plain(ctx.__getState())),false);
  assert.equal(renders,1);
  assert.equal(writes,0);
});

test('normalização sem novo estudo preserva datas de perfil e de reparos',()=>{
  const ctx=readyPlanner();
  const state=ctx.__getState();
  const original='2026-09-28T12:00:00.000Z';
  state.gamification.profile.updatedAt=original;
  state.activityDataRepairs.flashcardsDailyV2.repairedAt=original;
  state.activityDataRepairs.blockCompletionDatesV1.repairedAt=original;
  ctx.ensureGamificationState();
  ctx.normalizeSyncedPlannerState();
  assert.equal(state.gamification.profile.updatedAt,original);
  assert.equal(state.activityDataRepairs.flashcardsDailyV2.repairedAt,original);
  assert.equal(state.activityDataRepairs.blockCompletionDatesV1.repairedAt,original);
});

test('receber estado idêntico da nuvem não agenda upload nem avança carimbo local',async()=>{
  const ctx=readyCloudPlanner();
  const updatedAt=new Date().toISOString();
  ctx.remoteResponse={data:{data:plain(ctx.__getState()),updated_at:updatedAt},error:null};
  let saves=0;let renders=0;
  const writes=[];
  ctx.maintainDailyLocalBackup=()=>{};
  ctx.scheduleCloudSave=()=>saves++;
  ctx.writeLocalState=options=>{writes.push(options);return true;};
  ctx.render=()=>renders++;
  await ctx.pullCloudState();
  assert.equal(saves,0);
  assert.equal(renders,0);
  assert.equal(ctx.__getCloudDirty(),false);
  assert.equal(writes.length,1);
  assert.equal(writes[0].touch,false);
  assert.equal(writes[0].stamp,updatedAt);
});

test('progresso local ausente na nuvem continua pendente e é preservado no próximo envio',async()=>{
  const ctx=readyCloudPlanner();
  const incoming=plain(ctx.__getState());
  const localCount=Number(incoming.schedule[0].manualFC||0)+23;
  ctx.__getState().schedule[0].manualFC=localCount;
  let saves=0;
  ctx.remoteResponse={data:{data:incoming,updated_at:new Date().toISOString()},error:null};
  ctx.maintainDailyLocalBackup=()=>{};
  ctx.scheduleCloudSave=()=>saves++;
  ctx.writeLocalState=()=>true;
  await ctx.pullCloudState();
  assert.equal(ctx.__getState().schedule[0].manualFC,localCount);
  assert.equal(ctx.__getCloudDirty(),true);
  assert.equal(saves,1);
});
