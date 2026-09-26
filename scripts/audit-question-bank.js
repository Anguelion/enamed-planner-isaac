'use strict';

const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const bankRoot=path.join(root,'question_bank');
const indexPath=path.join(bankRoot,'index.json');
const index=JSON.parse(fs.readFileSync(indexPath,'utf8'));
const context=vm.createContext({window:{}});
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const canonical=value=>{
  if(Array.isArray(value)) return value.map(canonical);
  if(value&&typeof value==='object') return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
  return value;
};
const sameContent=(left,right)=>JSON.stringify(canonical(left))===JSON.stringify(canonical(right));
const preserveKeyOrder=(source,existing={})=>{
  if(!source||typeof source!=='object'||Array.isArray(source)) return source;
  const ordered={};
  for(const key of Object.keys(existing||{})) if(Object.hasOwn(source,key)) ordered[key]=source[key];
  for(const key of Object.keys(source)) if(!Object.hasOwn(ordered,key)) ordered[key]=source[key];
  return ordered;
};
const validQuestion=question=>{
  const options=Object.entries(question.options||{}).filter(([,text])=>String(text||'').trim());
  const letters=options.map(([letter])=>String(letter).trim().toUpperCase());
  const answer=String(question.answer||'').trim().toUpperCase();
  const pendingAnswer=!answer&&question.answerPending===true;
  return Boolean(String(question.stem||'').trim())&&options.length>=2&&(letters.includes(answer)||pendingAnswer);
};

let rawTotal=0;
let validTotal=0;
let invalidTotal=0;
let duplicateIdTotal=0;
let duplicateContentTotal=0;
let mirrorMismatchTotal=0;
let repairedMirrorTotal=0;
const blockReport=[];
for(const entry of index.blocks){
  vm.runInContext(fs.readFileSync(path.join(bankRoot,entry.script),'utf8'),context,{filename:entry.script});
  const questions=context.window.ENAMED_LOCAL_QUESTION_BANK?.[entry.block]?.questions||[];
  let mirrorQuestions=JSON.parse(JSON.stringify(questions));
  if(entry.commentsScript){
    vm.runInContext(fs.readFileSync(path.join(bankRoot,entry.commentsScript),'utf8'),context,{filename:entry.commentsScript});
    const comments=context.window.ENAMED_LOCAL_QUESTION_COMMENTS?.[entry.block]||{};
    mirrorQuestions=mirrorQuestions.map(question=>{
      if(!question.commentDeferred) return question;
      const hydrated={...question,comment:comments[question.id]||''};
      delete hydrated.commentDeferred;
      return hydrated;
    });
  }
  const mirrorPath=path.join(bankRoot,entry.file);
  let mirror=null;
  try { mirror=JSON.parse(fs.readFileSync(mirrorPath,'utf8')); } catch(error) {}
  const mirrorMismatch=!mirror||!Array.isArray(mirror.questions)||mirror.count!==mirrorQuestions.length||!sameContent(mirror.questions,mirrorQuestions);
  if(mirrorMismatch){
    mirrorMismatchTotal+=1;
    if(process.argv.includes('--fix-mirrors')){
      const existingQuestions=new Map((mirror?.questions||[]).map(question=>[String(question.id||''),question]));
      const orderedQuestions=mirrorQuestions.map(question=>preserveKeyOrder(question,existingQuestions.get(String(question.id||''))));
      const repaired=preserveKeyOrder({...(mirror&&typeof mirror==='object'?mirror:{}),block:mirror?.block??entry.block,count:mirrorQuestions.length,questions:orderedQuestions},mirror);
      fs.writeFileSync(mirrorPath,`${JSON.stringify(repaired,null,2)}\n`);
      repairedMirrorTotal+=1;
    }
  }
  const valid=questions.filter(validQuestion);
  const ids=new Set();
  const contents=new Set();
  let duplicateIds=0;
  let duplicateContents=0;
  for(const question of valid){
    const id=String(question.id||'');
    const content=`${entry.block}|${normalize(question.stem)}`;
    if(id&&ids.has(id)) duplicateIds+=1;
    else if(id) ids.add(id);
    if(contents.has(content)) duplicateContents+=1;
    else contents.add(content);
  }
  rawTotal+=questions.length;
  validTotal+=valid.length;
  invalidTotal+=questions.length-valid.length;
  duplicateIdTotal+=duplicateIds;
  duplicateContentTotal+=duplicateContents;
  blockReport.push({block:entry.block,raw:questions.length,valid:valid.length,invalid:questions.length-valid.length,duplicateIds,duplicateContents,mirrorCount:mirror?.questions?.length??null,mirrorMismatch});
}

const metadataMismatch=index.total!==validTotal||index.blocks.some((entry,position)=>entry.count!==blockReport[position].valid);
if(process.argv.includes('--fix-index')){
  index.generatedAt=new Date().toISOString();
  index.total=validTotal;
  index.blocks=index.blocks.map((entry,position)=>({...entry,count:blockReport[position].valid}));
  const json=JSON.stringify(index);
  fs.writeFileSync(indexPath,`${json}\n`);
  fs.writeFileSync(path.join(bankRoot,'index.js'),`window.ENAMED_LOCAL_QUESTION_INDEX=${json};\n`);
}

console.log(JSON.stringify({rawTotal,validTotal,invalidIgnored:invalidTotal,duplicateIds:duplicateIdTotal,duplicateContents:duplicateContentTotal,metadataMismatch,mirrorMismatches:mirrorMismatchTotal,repairedMirrors:repairedMirrorTotal,blocks:blockReport},null,2));
if(metadataMismatch&&!process.argv.includes('--fix-index')){
  console.error('Os totais do índice não correspondem às questões válidas. Execute com --fix-index.');
  process.exitCode=1;
}
if(duplicateIdTotal){
  console.error(`O banco contém ${duplicateIdTotal} ID(s) duplicado(s). Corrija antes de publicar.`);
  process.exitCode=1;
}
if(mirrorMismatchTotal&&!process.argv.includes('--fix-mirrors')){
  console.error(`${mirrorMismatchTotal} espelho(s) JSON divergem dos scripts do banco. Execute com --fix-mirrors.`);
  process.exitCode=1;
}
