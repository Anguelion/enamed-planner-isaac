#!/usr/bin/env node
// Executa o plano gerado por plan-video-reorg.js, só para os blocos passados na linha de
// comando. Todo passo é logado num .txt (formato simples "AÇÃO|de|para") para poder desfazer.
//
// Uso: node scripts/execute-video-reorg.js "E:\MedCof 2026" 02 03 04 05

const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2];
const BLOCK_IDS = process.argv.slice(3); // ex.: ['02','03','04','05']
if (!ROOT || !BLOCK_IDS.length) {
  console.error('Uso: node scripts/execute-video-reorg.js "E:\\MedCof 2026" 02 03 04 05');
  process.exit(1);
}

const REPO = path.join(__dirname, '..');
const plan = JSON.parse(fs.readFileSync(path.join(REPO, 'video_library', 'reorg-plan.json'), 'utf8'));

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const logPath = path.join(REPO, 'video_library', `reorg-log-${stamp}.txt`);
fs.writeFileSync(logPath, '', 'utf8');
function record(line) { fs.appendFileSync(logPath, line + '\n', 'utf8'); console.log(line); }

const dirsTouched = new Set();

for (const blockId of BLOCK_IDS) {
  const blockPlan = plan.blocks[blockId];
  if (!blockPlan) { console.warn(`Bloco ${blockId} não está no plano, pulando.`); continue; }

  for (const lesson of blockPlan.lessons) {
    if (lesson.status === 'no-confident-match') continue;
    const fromDir = path.join(ROOT, lesson.currentDir);
    const toDir = path.join(ROOT, lesson.targetDir);
    try {
      if (!fs.existsSync(fromDir)) { record(`AVISO|pasta de origem sumiu, pulando|${fromDir}`); continue; }

      fs.mkdirSync(toDir, { recursive: true });
      dirsTouched.add(fromDir);

      // move todo o conteúdo da pasta de aula (vídeos + qualquer subpasta tipo Materiais)
      const renameMap = new Map(lesson.videoRenames.map(v => [path.basename(v.from), v.toName]));
      const entries = fs.readdirSync(fromDir, { withFileTypes: true });
      for (const entry of entries) {
        const fromPath = path.join(fromDir, entry.name);
        const newName = renameMap.get(entry.name) || entry.name;
        const toPath = path.join(toDir, newName);
        if (path.resolve(fromPath) === path.resolve(toPath)) continue;
        if (fs.existsSync(toPath)) { record(`AVISO|destino já existe, pulando|${toPath}`); continue; }
        fs.renameSync(fromPath, toPath);
        record(`MOVE|${fromPath}|${toPath}`);
      }
    } catch (error) {
      record(`ERRO|${lesson.topic}|${error.message}`);
      continue;
    }
  }
}

// remove pastas de aula/área que ficaram vazias
function removeIfEmpty(dir) {
  if (!fs.existsSync(dir)) return;
  const remaining = fs.readdirSync(dir);
  if (remaining.length === 0) {
    fs.rmdirSync(dir);
    record(`RMDIR|${dir}|`);
    removeIfEmpty(path.dirname(dir));
  }
}
for (const dir of dirsTouched) removeIfEmpty(dir);

console.log(`\nLog salvo em ${logPath}`);
console.log('Rode "node scripts/build-video-catalog.js" para atualizar o catálogo depois de conferir.');
