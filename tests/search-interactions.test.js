'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const UI=require('../assets/personal-ui');
const {loadPlannerSandbox}=require('./planner-sandbox');

function field(document,value='') {
  return {
    value,isConnected:true,selectionStart:2,selectionEnd:5,selectionDirection:'backward',
    closest:()=>({classList:{contains:()=>true}}),
    focus(){document.activeElement=this;},
    setSelectionRange(start,end,direction){this.selectionStart=start;this.selectionEnd=end;this.selectionDirection=direction;}
  };
}

test('busca agrupa digitação rápida e atualiza o texto antes do filtro',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const input=field({},'');
  let draft='';
  let renders=0;
  UI.bindLiveSearch(input,value=>{draft=value;},()=>renders++,220);
  for(const value of ['d','di','diarreia']) {input.value=value;input.oninput({});t.mock.timers.tick(50);}
  assert.equal(draft,'diarreia');
  assert.equal(renders,0);
  t.mock.timers.tick(220);
  assert.equal(renders,1);
});

test('composição de texto não filtra nem refoca até finalizar a palavra',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const input=field({},'infec');
  let draft='';
  let renders=0;
  UI.bindLiveSearch(input,value=>{draft=value;},()=>renders++);
  input.oncompositionstart();
  input.value='infecção';input.oninput({isComposing:true});
  t.mock.timers.tick(500);
  assert.equal(draft,'infecção');
  assert.equal(renders,0);
  input.oncompositionend();t.mock.timers.tick(180);
  assert.equal(renders,1);
});

test('filtro atrasado é descartado quando campo sai da tela ou texto é limpo',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const input=field({},'diarreia');
  let renders=0;
  UI.bindLiveSearch(input,()=>{},()=>renders++);
  input.oninput({});input.isConnected=false;t.mock.timers.tick(180);
  input.isConnected=true;input.oninput({});input.value='';t.mock.timers.tick(180);
  input.value='diarreia';input.oninput({});input.closest=()=>({classList:{contains:()=>false}});t.mock.timers.tick(180);
  assert.equal(renders,0);
});

test('rerender mantém o mesmo campo, seleção e direção, sem roubar foco de outro controle',()=>{
  const document={body:{},activeElement:null};
  const original=field(document,'diarreia');
  let current=original;
  document.getElementById=()=>current;
  document.activeElement=original;
  const restore=UI.preserveSearchFields(document,['search']);
  const replacement={value:'diarreia',replaceWith(input){current=input;input.isConnected=true;}};
  current=replacement;original.isConnected=false;document.activeElement=document.body;
  restore();
  assert.equal(current,original);
  assert.equal(document.activeElement,original);
  assert.deepEqual([original.selectionStart,original.selectionEnd,original.selectionDirection],[2,5,'backward']);
  document.activeElement={id:'areaFilter'};
  const otherControl=document.activeElement;
  const restoreAfterBlur=UI.preserveSearchFields(document,['search']);
  current={...replacement,value:''};restoreAfterBlur();
  assert.equal(original.value,'','limpar filtros também precisa limpar o campo preservado');
  assert.equal(document.activeElement,otherControl);
});

test('busca da Missão modifica somente os resultados e mantém a barra de filtros',()=>{
  const ctx=loadPlannerSandbox();
  const ui=ctx.__getUi();
  ui.search='Diarreia';ui.scheduleBlock='Todos';
  const input=field(ctx.document,'Diarreia');
  const results={innerHTML:''};
  ctx.document.getElementById=id=>id==='search' ? input : null;
  ctx.document.querySelector=selector=>selector==='#cronograma .schedule-list-card' ? results : null;
  ctx.enhanceScheduleStudyIcons=()=>{};
  ctx.renderCronograma(true);
  assert.match(results.innerHTML,/Diarreia/);
  assert.equal(ctx.document.getElementById('search'),input);
});
