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
const blockReport=[];
for(const entry of index.blocks){
  vm.runInContext(fs.readFileSync(path.join(bankRoot,entry.script),'utf8'),context,{filename:entry.script});
  const questions=context.window.ENAMED_LOCAL_QUESTION_BANK?.[entry.block]?.questions||[];
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
  blockReport.push({block:entry.block,raw:questions.length,valid:valid.length,invalid:questions.length-valid.length,duplicateIds,duplicateContents});
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

console.log(JSON.stringify({rawTotal,validTotal,invalidIgnored:invalidTotal,duplicateIds:duplicateIdTotal,duplicateContents:duplicateContentTotal,metadataMismatch,blocks:blockReport},null,2));
if(metadataMismatch&&!process.argv.includes('--fix-index')){
  console.error('Os totais do índice não correspondem às questões válidas. Execute com --fix-index.');
  process.exitCode=1;
}
