(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.ENAMED_PERSONAL_UI=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const STORAGE_KEY='enamed-personal-ui-v1';
  const defaults={gamification:false,mascot:false,motivation:false,compactDashboard:true};
  const navigation=[
    {id:'painel',label:'Hoje',icon:'dashboard',children:[]},
    {id:'cronograma',label:'Blocos',icon:'mission',children:['aulas','questoes','materiais']},
    {id:'aulas',label:'Videoaulas',icon:'video',children:[]},
    {id:'questoes',label:'Questões',icon:'question',children:[]},
    {id:'flashcards',label:'Revisões',icon:'flashcard',children:['caderno-erros','feynman']},
    {id:'simulados',label:'Simulados',icon:'simulation',children:[]},
    {id:'analise',label:'Progresso',icon:'analysis',children:['areas','historico']},
    {id:'biblioteca',label:'Biblioteca',icon:'materials',children:['anatomia','semiologia','ecg','radiografia','prescricao','radar-saude']},
    {id:'ferramentas',label:'Ferramentas',icon:'settings',children:['importar-questoes']}
  ];
  function read(storage){
    try {
      const saved=JSON.parse(storage.getItem(STORAGE_KEY)||'{}');
      return Object.fromEntries(Object.entries(defaults).map(([key,value])=>[key,typeof saved?.[key]==='boolean'?saved[key]:value]));
    } catch {return {...defaults};}
  }
  function write(storage,preferences){storage.setItem(STORAGE_KEY,JSON.stringify(preferences));}
  function editionAge(publishedAt,today){
    const parse=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value))?Date.parse(`${value}T12:00:00Z`):NaN;
    const age=Math.floor((parse(today)-parse(publishedAt))/86400000);
    return Number.isFinite(age)&&age>=0?age:null;
  }
  function preserveSearchFields(document,ids){
    const fields=ids.map(id=>{
      const input=document.getElementById(id);
      return input ? {id,input,focused:document.activeElement===input,start:input.selectionStart,end:input.selectionEnd,direction:input.selectionDirection} : null;
    }).filter(Boolean);
    return ()=>fields.forEach(({id,input,focused,start,end,direction})=>{
      const replacement=document.getElementById(id);
      if(!replacement || replacement===input) return;
      // Reutilizar o campo mantém a composição de texto e os seus listeners.
      if(input.value!==replacement.value) input.value=replacement.value;
      replacement.replaceWith(input);
      if(focused && input.isConnected && (!document.activeElement || document.activeElement===document.body || document.activeElement===replacement)) {
        input.focus({preventScroll:true});
        input.setSelectionRange(start,end,direction);
      }
    });
  }
  function bindLiveSearch(input,onValue,render,delay=180){
    if(!input) return;
    let timer=null;
    let composing=false;
    const update=()=>{
      clearTimeout(timer);
      const value=input.value;
      onValue(value);
      if(composing) return;
      timer=setTimeout(()=>{
        const view=input.closest('.view');
        if(!input.isConnected || input.value!==value || (view && !view.classList.contains('active'))) return;
        render();
      },delay);
    };
    input.oncompositionstart=()=>{composing=true;clearTimeout(timer);};
    input.oncompositionend=()=>{composing=false;update();};
    input.oninput=event=>{
      if(event.isComposing) {clearTimeout(timer);onValue(input.value);return;}
      update();
    };
  }
  return {STORAGE_KEY,defaults,navigation,read,write,editionAge,preserveSearchFields,bindLiveSearch};
});
