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
  return {STORAGE_KEY,defaults,navigation,read,write,editionAge};
});
