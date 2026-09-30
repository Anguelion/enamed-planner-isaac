'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const index=JSON.parse(fs.readFileSync(path.join(root,'question_bank/index.json'),'utf8'));
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const groups=[];
for(const block of index.blocks){
  const file=JSON.parse(fs.readFileSync(path.join(root,'question_bank',block.file),'utf8'));
  const byStem=new Map();
  for(const question of file.questions){
    const key=normalize(question.stem);
    if(!key) continue;
    if(!byStem.has(key)) byStem.set(key,[]);
    byStem.get(key).push(question);
  }
  for(const questions of byStem.values()){
    if(questions.length<2) continue;
    const signatures=questions.map(question=>JSON.stringify({stem:question.stem,options:question.options,answer:question.answer}));
    groups.push({block:block.block,file:block.file,classification:new Set(signatures).size===1?'same-question':'review-options-or-answer',ids:questions.map(question=>question.id),stem:questions[0].stem});
  }
}
const output=path.join(root,'reports/question-duplicates-review.json');
fs.mkdirSync(path.dirname(output),{recursive:true});
const report={duplicateItems:groups.reduce((sum,group)=>sum+group.ids.length-1,0),groups:groups.length,needsReview:groups.filter(group=>group.classification==='review-options-or-answer').length,items:groups};
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(`${report.duplicateItems} repetições em ${report.groups} grupos; ${report.needsReview} grupos exigem comparação de alternativas ou gabarito. Nenhuma questão foi alterada.`);
