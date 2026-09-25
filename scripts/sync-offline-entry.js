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
const manifestName='.enamed-offline-sync-manifest.json';

function gitExecutable(){
  const candidates=[process.env.GIT_EXECUTABLE,'git'];
  if(process.platform==='win32'){
    candidates.push(
      path.join(process.env.ProgramFiles||'C:\\Program Files','Git','cmd','git.exe'),
      path.join(process.env.LOCALAPPDATA||'','Programs','Git','cmd','git.exe'),
    );
    const desktopRoot=path.join(process.env.LOCALAPPDATA||'','GitHubDesktop');
    if(fs.existsSync(desktopRoot)){
      const desktopVersions=fs.readdirSync(desktopRoot,{withFileTypes:true})
        .filter(entry=>entry.isDirectory()&&entry.name.startsWith('app-'))
        .map(entry=>entry.name)
        .sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));
      for(const version of desktopVersions) {
        candidates.push(path.join(desktopRoot,version,'resources','app','git','cmd','git.exe'));
      }
    }
  }
  for(const candidate of candidates.filter(Boolean)){
    try {
      childProcess.execFileSync(candidate,['--version'],{stdio:'ignore'});
      return candidate;
    } catch(error) {}
  }
  throw new Error('Git não encontrado. Instale o Git ou defina GIT_EXECUTABLE com o caminho de git.exe.');
}

function resolveInside(rootDirectory,relative){
  const rootPath=path.resolve(rootDirectory);
  const target=path.resolve(rootPath,...String(relative||'').split('/'));
  if(target===rootPath||!target.startsWith(`${rootPath}${path.sep}`)) {
    throw new Error(`Caminho fora do pacote offline: ${relative}`);
  }
  return target;
}

function readGeneratedManifest(manifestPath){
  if(!fs.existsSync(manifestPath)) return [];
  try {
    const parsed=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
    return Array.isArray(parsed.files) ? parsed.files.filter(item=>typeof item==='string') : [];
  } catch(error) {
    console.warn(`Manifesto offline inválido; nenhum arquivo antigo será removido: ${error.message}`);
    return [];
  }
}

function removeStaleGeneratedFiles(rootDirectory,previousFiles,currentFiles){
  const current=new Set(currentFiles);
  let removed=0;
  for(const relative of previousFiles){
    if(current.has(relative)) continue;
    const stale=resolveInside(rootDirectory,relative);
    if(!fs.existsSync(stale)) continue;
    const entry=fs.lstatSync(stale);
    if(!entry.isFile()&&!entry.isSymbolicLink()) continue;
    fs.unlinkSync(stale);
    removed+=1;
  }
  return removed;
}

function main(){
  if(!fs.existsSync(source)) throw new Error(`Entrada canônica não encontrada: ${source}`);
  fs.mkdirSync(offlineRoot,{recursive:true});
  fs.copyFileSync(source,target);
  fs.copyFileSync(source,path.join(offlineRoot,'index.html'));

  const tracked=childProcess.execFileSync(gitExecutable(),['-c',`safe.directory=${root.replaceAll('\\','/')}`,'ls-files','-z'],{cwd:root,encoding:'utf8'})
    .split('\0')
    .filter(Boolean)
    .filter(relative=>publicFiles.has(relative)||publicRoots.has(relative.split('/')[0]));
  const generatedFiles=[...new Set([...tracked,path.basename(target),'index.html'])].sort();
  const manifestPath=path.join(offlineRoot,manifestName);
  const previousFiles=readGeneratedManifest(manifestPath);
  let copiedBytes=0;
  for(const relative of tracked){
    const from=path.join(root,...relative.split('/'));
    if(!fs.existsSync(from)||!fs.statSync(from).isFile()) continue;
    const to=resolveInside(offlineRoot,relative);
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
  const removed=removeStaleGeneratedFiles(offlineRoot,previousFiles,generatedFiles);
  fs.writeFileSync(manifestPath,`${JSON.stringify({version:1,generatedAt:new Date().toISOString(),files:generatedFiles},null,2)}\n`);
  console.log(`Pacote offline sincronizado: ${tracked.length+2} arquivos (${(copiedBytes/1024/1024).toFixed(1)} MiB), ${removed} obsoleto(s) removido(s), em ${offlineRoot}`);
}

if(require.main===module) main();

module.exports={gitExecutable,readGeneratedManifest,removeStaleGeneratedFiles,resolveInside};
