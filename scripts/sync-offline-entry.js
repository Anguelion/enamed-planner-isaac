'use strict';

const fs=require('node:fs');
const path=require('node:path');
const childProcess=require('node:child_process');

const root=path.resolve(__dirname,'..');
const source=path.join(root,'index.html');
const target=path.resolve(process.argv[2] || path.join(root,'..','ENAMED','enamed_planner.html'));
const offlineRoot=path.dirname(target);
const publicRoots=new Set(['assets','data','imported_simulados','materials_library','question_bank','video_library']);
const publicFiles=new Set(['manifest.webmanifest','service-worker.js']);

if(!fs.existsSync(source)) throw new Error(`Entrada canônica não encontrada: ${source}`);
fs.mkdirSync(offlineRoot,{recursive:true});
fs.copyFileSync(source,target);
fs.copyFileSync(source,path.join(offlineRoot,'index.html'));

const tracked=childProcess.execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'})
  .split('\0')
  .filter(Boolean)
  .filter(relative=>publicFiles.has(relative)||publicRoots.has(relative.split('/')[0]));
let copiedBytes=0;
for(const relative of tracked){
  const from=path.join(root,...relative.split('/'));
  if(!fs.existsSync(from)||!fs.statSync(from).isFile()) continue;
  const to=path.join(offlineRoot,...relative.split('/'));
  fs.mkdirSync(path.dirname(to),{recursive:true});
  fs.copyFileSync(from,to);
  const canonical=fs.readFileSync(from);
  const generated=fs.readFileSync(to);
  if(!canonical.equals(generated)) throw new Error(`A cópia offline divergiu de ${relative}.`);
  copiedBytes+=canonical.length;
}

const canonical=fs.readFileSync(source);
const generated=fs.readFileSync(target);
if(!canonical.equals(generated)) throw new Error('A cópia offline divergiu de index.html.');
console.log(`Pacote offline sincronizado: ${tracked.length+2} arquivos (${(copiedBytes/1024/1024).toFixed(1)} MiB) em ${offlineRoot}`);
