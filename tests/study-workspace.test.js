'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const workspace=require('../assets/study-workspace');
const {loadPlannerSandbox}=require('./planner-sandbox');

test('anotações sincronizam por ID, preservam datas e a edição mais recente de cada lado',()=>{
  const remote=[{id:'a',title:'antigo',date:'2026-10-01',updatedAt:'2026-10-01T10:00:00Z'},{id:'b',content:'só remoto',updatedAt:'2026-10-04T10:00:00Z'}];
  const local=[{id:'a',title:'renomeado',content:'1. texto',date:'2026-10-01',updatedAt:'2026-10-05T10:00:00Z'},{id:'c',content:'só local'}];
  const merged=workspace.mergeNotes(remote,local);
  assert.equal(merged.length,3);assert.equal(merged[0].title,'renomeado');assert.equal(merged[0].date,'2026-10-01');
  assert.deepEqual(workspace.mergeNotes(local,remote).sort((a,b)=>a.id.localeCompare(b.id)),merged.sort((a,b)=>a.id.localeCompare(b.id)));
  assert.equal(remote[0].title,'antigo');
});
test('merge completo do planner preserva anotações junto com o progresso existente',()=>{
  const ctx=loadPlannerSandbox();
  const merged=ctx.mergePlannerActivityState({freeNotes:[{id:'a',content:'antigo',updatedAt:'2026-10-01'}]}, {freeNotes:[{id:'a',content:'novo',updatedAt:'2026-10-02'},{id:'b',content:'outra'}],questionProgress:{q1:{selected:'A',answeredAt:'2026-10-01T12:00:00Z'}}},true);
  assert.equal(merged.freeNotes.length,2);assert.equal(merged.freeNotes[0].content,'novo');assert.equal(merged.questionProgress.q1.selected,'A');
});
test('prévia forma listas reais, enumeração e títulos, escapando HTML sem executar scripts',()=>{
  const html=workspace.formatNote('## Revisão\n- um\n- dois\n\n1. primeiro\n2. segundo\n**forte** e *ênfase*\n<script>alert(1)</script>');
  assert.match(html,/<h3>Revisão<\/h3>/);assert.match(html,/<ul><li>um<\/li><li>dois<\/li><\/ul>/);assert.match(html,/<ol><li>primeiro/);assert.match(html,/<strong>forte<\/strong>/);assert.ok(!html.includes('<script>'));assert.match(html,/&lt;script&gt;/);
});
test('cada aba tem combinação exclusiva, incluindo Anotações e rotas recarregáveis',()=>{
  const ctx=loadPlannerSandbox();const fs=require('node:fs');const source=fs.readFileSync(require.resolve('../assets/planner.js'),'utf8');
  const definitions=source.slice(source.indexOf('const views = ['),source.indexOf('const VIEW_GROUPS'));
  const tabs=[...definitions.matchAll(/\['([^']+)'/g)].map(m=>m[1]);
  assert.equal(tabs.length,workspace.tabKeys.length);assert.equal(new Set(workspace.tabKeys).size,tabs.length);assert.equal(workspace.tabKeys[tabs.indexOf('anotacoes')],'m');
  assert.equal(ctx.window.ENAMED_PLANNER_UX.parseRoute('#/anotacoes').tab,'anotacoes');
});

async function focusHarness(){
  const vm=require('node:vm'),fs=require('node:fs');const callbacks=new Map(),requests=[],messages=[];let paused=false,fail=false;
  const doc={fullscreenElement:null,hasFocus:()=>true,getElementById:()=>null,addEventListener(){},body:{classList:{add(){},remove(){}}},documentElement:{async requestFullscreen(){doc.fullscreenElement={};}},async exitFullscreen(){doc.fullscreenElement=null;}};
  const context=vm.createContext({document:doc,window:{addEventListener(){}},location:{hostname:'localhost'},Intl,Date,crypto,console,setTimeout,clearTimeout,setInterval:(fn,ms)=>{callbacks.set(ms,fn);return ms;},clearInterval:ms=>callbacks.delete(ms),fetch:async(url,opts)=>{
    requests.push({url,opts});if(fail&&url.endsWith('/start'))throw Error('Falha de teste');
    return {ok:true,json:async()=>url.endsWith('/capabilities')?{available:true,token:'token',message:'OK'}:url.endsWith('/start')?{session:'session',active:true}:{active:false}};
  }});
  vm.runInContext(fs.readFileSync(require.resolve('../assets/study-workspace'),'utf8'),context);
  const api=context.StudyWorkspace;
  api.init({getState:()=>({}),account:()=>'',getTab:()=> 'anotacoes',tabs:[],refreshPomodoro(){},toast:t=>messages.push(t),pause:()=>{paused=true;}});
  await new Promise(resolve=>setImmediate(resolve));
  const choose=mode=>{const el={checked:true,dataset:{focusMode:mode}};api.bindFocus({querySelectorAll:()=>[el]});el.onchange();};
  return {api,choose,doc,requests,messages,callbacks,paused:()=>paused,fail:()=>{fail=true;}};
}
test('tela bloqueia troca de aba; parar libera tela cheia e notifica somente a sessão proprietária',async()=>{
  const h=await focusHarness();h.choose('screen');assert.equal(await h.api.beginFocus(),true);
  assert.equal(h.api.allowTab('anotacoes'),true);assert.equal(h.api.allowTab('painel'),false);assert.equal(h.api.enforceTab(),'anotacoes');
  h.api.releaseFocus();assert.equal(h.api.allowTab('painel'),true);assert.equal(h.doc.fullscreenElement,null);
  const stop=h.requests.find(r=>r.url.endsWith('/stop'));assert.equal(JSON.parse(stop.opts.body).session,'session');assert.equal(stop.opts.headers['X-Focus-Token'],'token');
});
test('aplicativo permite abas internas; heartbeat perdido pausa e libera a fixação',async()=>{
  const h=await focusHarness();h.choose('app');assert.equal(await h.api.beginFocus(),true);assert.equal(h.api.allowTab('painel'),true);
  await h.callbacks.get(3000)();assert.equal(h.paused(),true);assert.equal(h.doc.fullscreenElement,null);assert.equal(h.api.enforceTab(),'');
});
test('falha do componente impede início e não deixa a janela presa',async()=>{
  const h=await focusHarness();h.choose('screen');h.fail();assert.equal(await h.api.beginFocus(),false);assert.equal(h.doc.fullscreenElement,null);assert.ok(h.messages.length);
});
