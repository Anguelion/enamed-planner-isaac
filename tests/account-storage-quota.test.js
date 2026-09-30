'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadPlannerSandbox}=require('./planner-sandbox');
const STATE='enamed-planner-v3';
const OWNER='soqueromed-legacy-state-owner-v1';
const ACTIVE='soqueromed-active-account-v1';
const BACKUPS='soqueromed-local-backups-v1';
const scoped=(key,id='conta-a')=>`${key}:account:${id}`;
const previous={schedule:[{id:'aula-legado',block:10,topic:'Aula preservada'}],questionProgress:{qa:{answeredAt:'2026-09-29T12:00:00.000Z',correct:true}}};

function denyCopy(ctx,key) {
  const setItem=ctx.localStorage.setItem.bind(ctx.localStorage);
  ctx.localStorage.setItem=(storageKey,value)=>{
    if(storageKey===key) {const error=new Error('Sem espaço para duplicar');error.name='QuotaExceededError';throw error;}
    setItem(storageKey,value);
  };
}

test('quota na cópia do estado não interrompe a conta nem perde progresso ou backups',()=>{
  const ctx=loadPlannerSandbox({initialState:previous});
  const backups=[{id:'backup-legado',created_at:new Date().toISOString(),data:previous}];
  ctx.localStorage.setItem(BACKUPS,JSON.stringify(backups));
  denyCopy(ctx,scoped(STATE));
  assert.equal(ctx.activateAccountState('conta-a'),true);
  assert.equal(ctx.localStorage.getItem(OWNER),'conta-a');
  assert.equal(ctx.localStorage.getItem(ACTIVE),'conta-a');
  assert.ok(ctx.__getState().questionProgress.qa);
  assert.ok(ctx.__getLocalBackups().some(backup=>backup.id==='backup-legado'));
  assert.equal(ctx.ownedAccountStorageKey(STATE,'conta-a'),STATE);
  assert.ok(ctx.localStorage.getItem(STATE),'a cópia original continua durável');
  assert.equal(ctx.localStorage.getItem(scoped(STATE)),null);
  assert.equal(ctx.writeLocalState(),true,'continuar estudando deve salvar na original vinculada à conta');
  assert.ok(JSON.parse(ctx.localStorage.getItem(STATE)).questionProgress.qa);
});

test('reabrir a conta após quota recupera o legado e outra conta continua isolada',()=>{
  const ctx=loadPlannerSandbox({initialStorage:{[STATE]:JSON.stringify(previous),[OWNER]:'conta-a',[ACTIVE]:'conta-a'}});
  assert.ok(ctx.__getState().questionProgress.qa);
  assert.equal(ctx.activateAccountState('conta-a'),false,'a conta já ativa deve continuar na chave original');
  assert.equal(ctx.activateAccountState('conta-b'),true);
  assert.equal(ctx.__getState().questionProgress.qa,undefined,'a conta B não pode acessar o legado da A');
  assert.equal(ctx.ownedAccountStorageKey(STATE,'conta-b'),scoped(STATE,'conta-b'));
  assert.equal(ctx.activateAccountState('conta-a'),true);
  assert.ok(ctx.__getState().questionProgress.qa);
});

test('migração bem-sucedida remove somente a cópia idêntica depois de gravar o destino',()=>{
  const ctx=loadPlannerSandbox({initialState:previous});
  const payload=ctx.localStorage.getItem(STATE);
  const removeItem=ctx.localStorage.removeItem.bind(ctx.localStorage);
  ctx.localStorage.removeItem=key=>{
    if(key===STATE) assert.equal(ctx.localStorage.getItem(scoped(STATE)),payload,'a origem não pode sair antes da cópia durável');
    removeItem(key);
  };
  assert.equal(ctx.activateAccountState('conta-a'),true);
  assert.equal(ctx.localStorage.getItem(STATE),null);
  assert.ok(JSON.parse(ctx.localStorage.getItem(scoped(STATE))).questionProgress.qa);
});

test('quota somente nos backups mantém as cópias originais associadas ao dono',()=>{
  const ctx=loadPlannerSandbox({initialState:previous});
  const payload=JSON.stringify([{id:'backup-legado',created_at:new Date().toISOString(),data:previous}]);
  ctx.localStorage.setItem(BACKUPS,payload);
  denyCopy(ctx,scoped(BACKUPS));
  assert.equal(ctx.activateAccountState('conta-a'),true);
  assert.equal(ctx.localStorage.getItem(BACKUPS),payload);
  assert.equal(ctx.ownedAccountStorageKey(BACKUPS,'conta-a'),BACKUPS);
  assert.equal(ctx.ownedAccountStorageKey(BACKUPS,'conta-b'),scoped(BACKUPS,'conta-b'));
  assert.ok(ctx.__getLocalBackups().some(backup=>backup.id==='backup-legado'));
});
