#!/usr/bin/env node
// Desfaz um log gerado por execute-video-reorg.js, na ordem inversa.
// Uso: node scripts/undo-video-reorg.js "video_library/reorg-log-2026-08-02T....txt"

const fs = require('fs');
const path = require('path');

const logPath = process.argv[2];
if (!logPath) { console.error('Uso: node scripts/undo-video-reorg.js <arquivo-de-log>'); process.exit(1); }

const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean).reverse();

for (const line of lines) {
  const [action, a, b] = line.split('|');
  if (action === 'MOVE') {
    const from = b, to = a; // desfazer: volta de b (destino) pra a (origem original)
    if (!fs.existsSync(from)) { console.warn(`AVISO: ${from} não existe mais, pulando.`); continue; }
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.renameSync(from, to);
    console.log(`DESFEITO: ${from} -> ${to}`);
  } else if (action === 'RMDIR') {
    fs.mkdirSync(a, { recursive: true });
    console.log(`RECRIADO: ${a}`);
  }
}
console.log('Desfazer concluído.');
