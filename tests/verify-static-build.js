'use strict';

const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const offlineHtml=path.join(root,'enamed_planner.html');
const htmlPath=fs.existsSync(offlineHtml) ? offlineHtml : path.join(root,'index.html');
const html=fs.readFileSync(htmlPath,'utf8');
const required=[
  'assets/planner.css',
  'assets/app-icons.js',
  'assets/icons/phosphor-sprite.svg',
  'assets/gamification.js',
  'assets/planner-ux.js',
  'assets/planner.js',
  'manifest.webmanifest',
  'service-worker.js',
  'question_bank/index.js'
];

const failures=[];
for(const relative of required) {
  if(!fs.existsSync(path.join(root,relative))) failures.push(`arquivo ausente: ${relative}`);
  if(!['service-worker.js','assets/icons/phosphor-sprite.svg'].includes(relative) && !html.includes(relative)) failures.push(`referência ausente no HTML: ${relative}`);
}
const scriptOrder=['assets/app-icons.js','assets/gamification.js','assets/planner-ux.js','assets/planner.js'];
for(let index=1;index<scriptOrder.length;index++) if(html.indexOf(scriptOrder[index-1])>html.indexOf(scriptOrder[index])) failures.push(`${scriptOrder[index-1]} deve carregar antes de ${scriptOrder[index]}`);
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
for(const relative of ['assets/planner.css','assets/app-icons.js','assets/icons/phosphor-sprite.svg','assets/gamification.js','assets/planner-ux.js','assets/planner.js',...['fire','water','earth','air'].map(name=>`assets/rpg/element-${name}.svg`),...['aldeao','aprendiz','escudeiro','soldado','cavaleiro','capitao','barao','duque','rei','imperador'].map(name=>`assets/rpg/classes/${name}.png`)]) {
  if(!sw.includes(relative)) failures.push(`asset não versionado no service worker: ${relative}`);
}
const iconRuntime=fs.readFileSync(path.join(root,'assets/app-icons.js'),'utf8');
if(/(?:unpkg|jsdelivr|iconify|https?:\/\/[^'" ]+\.(?:svg|js))/i.test(iconRuntime)) failures.push('sistema de ícones contém dependência externa de runtime');
if(failures.length) {
  console.error(failures.join('\n'));
  process.exitCode=1;
} else {
  console.log(`Build estático verificado: ${required.length} arquivos e ordem de carregamento válidos.`);
}
