'use strict';

const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const offlineHtml=path.join(root,'enamed_planner.html');
const htmlPath=fs.existsSync(offlineHtml) ? offlineHtml : path.join(root,'index.html');
const html=fs.readFileSync(htmlPath,'utf8');
const required=[
  'assets/planner.css',
  'assets/gamification.js',
  'assets/planner.js',
  'manifest.webmanifest',
  'service-worker.js',
  'question_bank/index.js'
];

const failures=[];
for(const relative of required) {
  if(!fs.existsSync(path.join(root,relative))) failures.push(`arquivo ausente: ${relative}`);
  if(relative!=='service-worker.js' && !html.includes(relative)) failures.push(`referência ausente no HTML: ${relative}`);
}
const scriptOrder=['assets/gamification.js','assets/planner.js'];
if(html.indexOf(scriptOrder[0])>html.indexOf(scriptOrder[1])) failures.push('gamification.js deve carregar antes de planner.js');
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
for(const relative of ['assets/planner.css','assets/gamification.js','assets/planner.js']) {
  if(!sw.includes(relative)) failures.push(`asset não versionado no service worker: ${relative}`);
}
if(failures.length) {
  console.error(failures.join('\n'));
  process.exitCode=1;
} else {
  console.log(`Build estático verificado: ${required.length} arquivos e ordem de carregamento válidos.`);
}
