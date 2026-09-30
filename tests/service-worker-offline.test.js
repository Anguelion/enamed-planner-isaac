'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');

function worker(){
  const listeners={};
  const entries=new Map();
  let online=true;
  let status=200;
  const key=request=>typeof request==='string'?request:request.url;
  const cache={
    addAll:async paths=>paths.forEach(path=>entries.set(path,new Response('shell'))),
    put:async (request,response)=>entries.set(key(request),response),
  };
  const context={
    self:{location:{origin:'http://localhost:8766'},addEventListener:(name,fn)=>listeners[name]=fn,skipWaiting(){},clients:{claim:async()=>{}}},
    caches:{open:async()=>cache,keys:async()=>[],delete:async()=>true,match:async request=>entries.get(key(request))?.clone()},
    URL,
    fetch:async()=>{if(!online) throw new Error('offline');return new Response('network',{status});}
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../service-worker.js'),'utf8'),context);
  async function request(url,mode='cors'){
    let response;const pending=[];
    listeners.fetch({request:{method:'GET',url,mode},respondWith:promise=>response=promise,waitUntil:promise=>pending.push(promise)});
    const result=await response;await Promise.all(pending);return result;
  }
  return {listeners,entries,request,setOnline:value=>online=value,setStatus:value=>status=value};
}
test('login possui SDK local no shell offline e não depende do CDN',async()=>{
  const sw=worker();let install;
  sw.listeners.install({waitUntil:promise=>install=promise});await install;
  assert.ok(sw.entries.has('./assets/vendor/supabase.js'));
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.match(html,/src="assets\/vendor\/supabase\.js"/);
  assert.doesNotMatch(html,/cdn\.jsdelivr\.net\/npm\/@supabase/);
});
test('módulo pessoal previamente aberto é recuperado do cache sem rede',async()=>{
  const sw=worker();const url='http://localhost:8766/assets/personal-ui.js?v=20260930-1';
  assert.equal(await (await sw.request(url)).text(),'network');
  sw.setOnline(false);
  assert.equal(await (await sw.request(url)).text(),'network');
});
test('resposta de erro não substitui página de navegação já cacheada',async()=>{
  const sw=worker();const url='http://localhost:8766/';
  await sw.request(url,'navigate');
  sw.setStatus(503);await sw.request(url,'navigate');
  sw.setOnline(false);
  assert.equal((await sw.request(url,'navigate')).status,200);
});
