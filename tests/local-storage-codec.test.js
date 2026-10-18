'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const codec=require('../assets/local-storage-codec');
const {loadPlannerSandbox}=require('./planner-sandbox');

test('compressão preserva exatamente JSON grande com acentos, imagens e anotações',()=>{
  const state={schedule:[{id:'aula'}],freeNotes:[{id:'n',content:'Olá 📝\n1. revisão\n**ação**'}],history:Array.from({length:25000},(_,id)=>({id,area:'Clínica Médica',result:'correto',updatedAt:'2026-10-17T12:00:00Z'}))};
  const plain=JSON.stringify(state),packed=codec.encode(plain);
  assert.ok(packed.length<plain.length/3);assert.deepEqual(codec.parse(packed),state);assert.deepEqual(codec.parse(plain),state);
});
test('recompactar a mesma chave nunca cria envelopes dentro de envelopes',()=>{
  let raw=codec.encode(JSON.stringify({content:'x'.repeat(2*1024*1024)}));
  const store={getItem:()=>raw,setItem:(key,value)=>{raw=value;}};
  for(let i=0;i<3;i++)codec.repack(store,'test');
  assert.equal(codec.parse(raw).content.length,2*1024*1024);
});
test('cópia danificada e falha de gravação mantêm a origem intacta',()=>{
  const plain=JSON.stringify({content:'revisão'.repeat(10000)}),env=JSON.parse(codec.encode(plain,{force:true}));env.checksum='invalid';
  const damaged=JSON.stringify(env);assert.throws(()=>codec.parse(damaged),/integridade/);
  let raw=plain;const store={getItem:()=>raw,setItem:()=>{throw new Error('QuotaExceededError');}};
  assert.throws(()=>codec.repack(store,'test'));assert.equal(raw,plain);
});
test('progresso maior que a quota é salvo, reaberto e isolado por conta sem apagar backups',()=>{
  const ctx=loadPlannerSandbox();const original=ctx.__getState();
  ctx.__setState({...original,largeHistory:'atividade '.repeat(650000),freeNotes:[{id:'n',content:'Anotação preservada'}]});
  const backup=JSON.stringify([{id:'b',data:{schedule:[{id:'anterior'}]}}]);
  ctx.localStorage.setItem('soqueromed-local-backups-v1',backup);
  const set=ctx.localStorage.setItem.bind(ctx.localStorage);let deletes=0;
  ctx.localStorage.setItem=(key,value)=>{if(value.length>5*1024*1024){const error=new Error('quota');error.name='QuotaExceededError';throw error;}set(key,value);};
  const remove=ctx.localStorage.removeItem.bind(ctx.localStorage);ctx.localStorage.removeItem=key=>{deletes++;remove(key);};
  assert.equal(ctx.writeLocalState(),true);assert.equal(deletes,0);assert.equal(ctx.localStorage.getItem('soqueromed-local-backups-v1'),backup);
  const durable=ctx.localStorage.getItem('enamed-planner-v3');assert.ok(durable.length<1024*1024);
  const reopened=loadPlannerSandbox({initialStorage:{'enamed-planner-v3':durable,'soqueromed-legacy-state-owner-v1':'a','soqueromed-active-account-v1':'a'}});
  assert.equal(reopened.__getState().largeHistory.length,6500000);assert.equal(reopened.__getState().freeNotes[0].content,'Anotação preservada');
  reopened.activateAccountState('b');assert.equal(reopened.__getState().largeHistory,undefined);
  reopened.activateAccountState('a');assert.equal(reopened.__getState().freeNotes[0].content,'Anotação preservada');
});
test('falha só no carimbo não transforma estado salvo em falso erro de perda',()=>{
  const ctx=loadPlannerSandbox();const set=ctx.localStorage.setItem.bind(ctx.localStorage);
  ctx.localStorage.setItem=(key,value)=>{if(key==='enamed-planner-state-updated-at')throw Object.assign(new Error('quota'),{name:'QuotaExceededError'});set(key,value);};
  assert.equal(ctx.writeLocalState(),true);assert.ok(codec.parse(ctx.localStorage.getItem('enamed-planner-v3')).syncMeta.lastSavedAt);
});
