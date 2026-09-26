'use strict';

const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const offlineHtml=path.join(root,'enamed_planner.html');
const htmlPath=fs.existsSync(offlineHtml) ? offlineHtml : path.join(root,'index.html');
const html=fs.readFileSync(htmlPath,'utf8');
const plannerRuntime=fs.readFileSync(path.join(root,'assets/planner.js'),'utf8');
const appLoader=fs.readFileSync(path.join(root,'assets/app-loader.js'),'utf8');
const referenceSource=`${html}\n${plannerRuntime}\n${appLoader}`;
const required=[
  'assets/auth-shell.css',
  'assets/app-loader.js',
  'assets/planner.css',
  'assets/anatomia.css',
  'assets/planner-refresh.css',
  'assets/anatomia/search-index.json',
  'assets/app-icons.js',
  'assets/icons/phosphor-sprite.svg',
  'assets/gamification.js',
  'assets/planner-ux.js',
  'assets/anatomia.js',
  'assets/planner.js',
  'manifest.webmanifest',
  'service-worker.js',
  'question_bank/index.js'
];

const failures=[];
for(const relative of required) {
  if(!fs.existsSync(path.join(root,relative))) failures.push(`arquivo ausente: ${relative}`);
  if(!['service-worker.js','assets/icons/phosphor-sprite.svg','assets/anatomia/search-index.json'].includes(relative) && !referenceSource.includes(relative)) failures.push(`referência ausente no HTML ou runtime: ${relative}`);
}
const scriptOrder=['question_bank/index.js','assets/app-icons.js','assets/gamification.js','assets/planner-ux.js','assets/planner.js'];
for(let index=1;index<scriptOrder.length;index++) if(appLoader.indexOf(scriptOrder[index-1])>appLoader.indexOf(scriptOrder[index])) failures.push(`${scriptOrder[index-1]} deve carregar antes de ${scriptOrder[index]}`);
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
for(const relative of ['assets/auth-shell.css','assets/app-loader.js']) {
  if(!sw.includes(relative)) failures.push(`asset não versionado no service worker: ${relative}`);
}
const deferredAppAssets=['assets/planner.css','assets/planner-refresh.css','assets/app-icons.js','assets/gamification.js','assets/planner-ux.js','assets/skill-highlighter.js','assets/caso-do-dia.js','assets/planner.js','assets/mascote-ia.css','assets/mascote-ia.js','question_bank/index.js'];
const appShellSource=sw.slice(0,sw.indexOf("self.addEventListener('install'"));
for(const relative of deferredAppAssets) {
  if(!fs.existsSync(path.join(root,relative))) failures.push(`asset do aplicativo ausente: ${relative}`);
  if(!appLoader.includes(relative)) failures.push(`asset do aplicativo sem referência no carregador: ${relative}`);
  if(html.includes(relative)) failures.push(`asset pesado voltou ao carregamento inicial: ${relative}`);
  if(appShellSource.includes(relative)) failures.push(`asset pesado voltou ao precache inicial: ${relative}`);
}
const lazyAssets=['assets/anatomia.css','assets/anatomia.js','assets/ecg-simulator.js','assets/radiografia-aulas.js','assets/radiografia.js','assets/semiologia-aulas.js','assets/semiologia.js','assets/consulta-doencas.js','assets/consulta-clinica.js'];
for(const relative of lazyAssets) {
  if(!fs.existsSync(path.join(root,relative))) failures.push(`asset sob demanda ausente: ${relative}`);
  if(!plannerRuntime.includes(relative)) failures.push(`asset sob demanda sem referência no runtime: ${relative}`);
  if(html.includes(relative)) failures.push(`asset sob demanda voltou ao carregamento inicial: ${relative}`);
  if(appShellSource.includes(relative)) failures.push(`asset sob demanda voltou ao precache inicial: ${relative}`);
}
if(appShellSource.includes('assets/ecg-real/')) failures.push('imagens de ECG não devem bloquear a instalação inicial do app');
// O service worker cacheia cada script/CSS com sua própria query "?v=..."; se essa
// versão ficar desatualizada em relação ao index.html, o app instalado continua
// servindo offline uma versão antiga do arquivo até o usuário limpar o cache — um
// tipo de bug silencioso que já aconteceu aqui (ver docs/PROJECT_HANDOFF.md e o
// histórico de auditoria). Falhar o build nesse caso obriga a versão do service
// worker a andar junto com a do index.html a cada deploy.
const versionedAssets=['assets/auth-shell.css','assets/app-loader.js'];
for(const relative of versionedAssets) {
  const htmlMatch=referenceSource.match(new RegExp(`${relative.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(\\?v=[\\w-]+)?`));
  const swMatch=sw.match(new RegExp(`\\./${relative.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(\\?v=[\\w-]+)?`));
  const htmlVersion=htmlMatch?.[1]||'';
  const swVersion=swMatch?.[1]||'';
  if(htmlVersion!==swVersion) failures.push(`versão divergente entre index.html e service-worker.js para ${relative}: html="${htmlVersion}" sw="${swVersion}"`);
}
if(!/const VERSION='[\w-]+'/.test(appLoader)) failures.push('carregador do aplicativo precisa versionar os assets dinâmicos');
const iconRuntime=fs.readFileSync(path.join(root,'assets/app-icons.js'),'utf8');
if(/(?:unpkg|jsdelivr|iconify|https?:\/\/[^'" ]+\.(?:svg|js))/i.test(iconRuntime)) failures.push('sistema de ícones contém dependência externa de runtime');
if(failures.length) {
  console.error(failures.join('\n'));
  process.exitCode=1;
} else {
  console.log(`Build estático verificado: ${required.length} arquivos e ordem de carregamento válidos.`);
}
