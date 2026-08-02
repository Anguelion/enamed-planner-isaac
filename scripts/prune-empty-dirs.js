#!/usr/bin/env node
// Remove pastas vazias deixadas para trás por uma execução que travou no meio
// (o removeIfEmpty só roda no final da execução completa). Protege qualquer pasta
// que ainda seja um destino válido do plano (mesmo que hoje esteja vazia por não
// ter vídeo ainda).
// Uso: node scripts/prune-empty-dirs.js "E:\MedCof 2026" 02 03 04 05

const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2];
const BLOCK_IDS = process.argv.slice(3);
const REPO = path.join(__dirname, '..');
const plan = JSON.parse(fs.readFileSync(path.join(REPO, 'video_library', 'reorg-plan.json'), 'utf8'));

const protectedDirs = new Set();
for (const blockId of BLOCK_IDS) {
  const blockPlan = plan.blocks[blockId];
  if (!blockPlan) continue;
  for (const lesson of blockPlan.lessons) {
    if (lesson.status === 'no-confident-match') continue;
    const target = path.resolve(ROOT, lesson.targetDir);
    protectedDirs.add(target);
    protectedDirs.add(path.dirname(target));
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) walk(path.join(dir, entry.name));
  }
  const remaining = fs.readdirSync(dir);
  if (remaining.length === 0 && !protectedDirs.has(path.resolve(dir))) {
    fs.rmdirSync(dir);
    console.log(`REMOVIDA (vazia, não protegida): ${dir}`);
  }
}

for (const blockId of BLOCK_IDS) {
  const blockDir = path.join(ROOT, `Bloco ${blockId}`);
  const areaDirs = fs.existsSync(blockDir) ? fs.readdirSync(blockDir, { withFileTypes: true }).filter(e => e.isDirectory()) : [];
  for (const areaDir of areaDirs) walk(path.join(blockDir, areaDir.name));
}
console.log('Concluído.');
