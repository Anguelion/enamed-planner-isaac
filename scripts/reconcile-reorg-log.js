#!/usr/bin/env node
// Depois de uma execução que travou no meio, reconstrói o log de MOVE comparando
// o plano com o estado real do disco (arquivo já está no destino = foi movido).
// Uso: node scripts/reconcile-reorg-log.js "E:\MedCof 2026" 02 03 04 05

const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2];
const BLOCK_IDS = process.argv.slice(3);
const REPO = path.join(__dirname, '..');
const plan = JSON.parse(fs.readFileSync(path.join(REPO, 'video_library', 'reorg-plan.json'), 'utf8'));

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const logPath = path.join(REPO, 'video_library', `reorg-log-RECONCILED-${stamp}.txt`);
const log = [];

for (const blockId of BLOCK_IDS) {
  const blockPlan = plan.blocks[blockId];
  if (!blockPlan) continue;
  for (const lesson of blockPlan.lessons) {
    if (lesson.status === 'no-confident-match') continue;
    const fromDir = path.join(ROOT, lesson.currentDir);
    const toDir = path.join(ROOT, lesson.targetDir);
    const renameMap = new Map(lesson.videoRenames.map(v => [path.basename(v.from), v.toName]));

    // pega os nomes de arquivo originais esperados nessa pasta de aula (vídeos + materiais que
    // possam ter existido) a partir do que está listado no plano; para não-vídeo, olhamos os
    // dois lados (from/to) e comparamos com o que existe hoje.
    const expectedNames = new Set(renameMap.keys());
    for (const [origName, newName] of renameMap) {
      const stillAtSource = fs.existsSync(path.join(fromDir, origName));
      const atDest = fs.existsSync(path.join(toDir, newName));
      if (atDest && !stillAtSource) log.push(`MOVE|${path.join(fromDir, origName)}|${path.join(toDir, newName)}`);
    }
    // arquivos não-vídeo (materiais) que possam ter sido movidos mantendo o mesmo nome
    if (fs.existsSync(toDir)) {
      for (const entry of fs.readdirSync(toDir, { withFileTypes: true })) {
        if (expectedNames.has(entry.name) || [...renameMap.values()].includes(entry.name)) continue;
        if (!fs.existsSync(fromDir) || !fs.existsSync(path.join(fromDir, entry.name))) {
          log.push(`MOVE|${path.join(fromDir, entry.name)}|${path.join(toDir, entry.name)}`);
        }
      }
    }
  }
}

fs.writeFileSync(logPath, log.join('\n'), 'utf8');
console.log(`Reconciliado ${log.length} operações de MOVE.`);
console.log(`Log salvo em ${logPath}`);
