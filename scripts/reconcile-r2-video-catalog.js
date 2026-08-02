#!/usr/bin/env node
// Correlaciona os objetos já presentes no Cloudflare R2 com os vídeos locais.
// O vínculo usa o caminho exato quando possível e, após renomeações, o tamanho
// único do arquivo. Nenhum vídeo remoto é movido, apagado ou reenviado.
//
// Uso:
//   node scripts/reconcile-r2-video-catalog.js
//   node scripts/reconcile-r2-video-catalog.js --write

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.join(__dirname, '..');
const CATALOG_PATH = path.join(REPO, 'video_library', 'catalog.json');
const REPORT_PATH = path.join(REPO, 'video_library', 'r2-reconciliation-report.json');
const REMOTE = process.env.ENAMED_R2_REMOTE || 'cloudflare:enamed-videos';
const REMOTE_PREFIX = 'video_library/media/';
const shouldWrite = process.argv.includes('--write');

function normalizeRemotePath(remotePath) {
  return String(remotePath || '').replaceAll('\\', '/').replace(/^\/+/, '');
}

function relativeOnlinePath(remotePath) {
  const normalized = normalizeRemotePath(remotePath);
  return normalized.startsWith(REMOTE_PREFIX) ? normalized.slice(REMOTE_PREFIX.length) : normalized;
}

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const localVideos = [];
for (const lesson of catalog.lessons || []) {
  for (const video of lesson.videos || []) {
    const absolutePath = path.join(catalog.source, ...String(video.relativePath).split('/'));
    let size = 0;
    try { size = fs.statSync(absolutePath).size; } catch (error) {}
    video.size = size;
    localVideos.push({ lesson, video, size });
  }
}

const remoteObjects = JSON.parse(execFileSync('rclone', [
  'lsjson', REMOTE, '--recursive', '--files-only'
], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }));

const localByPath = new Map(localVideos.map(entry => [normalizeRemotePath(entry.video.relativePath), entry]));
const localBySize = new Map();
for (const entry of localVideos) {
  if (!entry.size) continue;
  if (!localBySize.has(entry.size)) localBySize.set(entry.size, []);
  localBySize.get(entry.size).push(entry);
}

const matchedLocal = new Set();
const report = {
  generatedAt: new Date().toISOString(),
  remote: REMOTE,
  remoteObjects: remoteObjects.length,
  localVideos: localVideos.length,
  matchedExact: [],
  matchedBySize: [],
  ambiguousBySize: [],
  remoteOrphans: [],
  localWithoutR2: []
};

for (const object of remoteObjects) {
  const onlinePath = relativeOnlinePath(object.Path);
  let match = localByPath.get(onlinePath);
  let method = 'exact';
  if (!match) {
    const candidates = localBySize.get(Number(object.Size)) || [];
    if (candidates.length === 1) {
      match = candidates[0];
      method = 'size';
    } else if (candidates.length > 1) {
      report.ambiguousBySize.push({
        remotePath: object.Path,
        size: object.Size,
        candidates: candidates.map(entry => entry.video.relativePath)
      });
      continue;
    }
  }
  if (!match) {
    report.remoteOrphans.push({ remotePath: object.Path, size: object.Size });
    continue;
  }
  match.video.onlinePath = onlinePath;
  matchedLocal.add(match.video);
  report[method === 'exact' ? 'matchedExact' : 'matchedBySize'].push({
    remotePath: object.Path,
    localPath: match.video.relativePath,
    videoId: match.video.id,
    size: object.Size
  });
}

report.localWithoutR2 = localVideos
  .filter(entry => !matchedLocal.has(entry.video))
  .map(entry => ({ path: entry.video.relativePath, videoId: entry.video.id, size: entry.size }));

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');
if (shouldWrite) {
  catalog.r2 = {
    remote: REMOTE,
    prefix: REMOTE_PREFIX,
    reconciledAt: report.generatedAt,
    availableVideos: matchedLocal.size
  };
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
}

console.log(`R2: ${remoteObjects.length} objetos | catálogo local: ${localVideos.length} vídeos`);
console.log(`Vínculos exatos: ${report.matchedExact.length}`);
console.log(`Vínculos recuperados pelo tamanho após renomeação: ${report.matchedBySize.length}`);
console.log(`Ambíguos: ${report.ambiguousBySize.length} | órfãos no R2: ${report.remoteOrphans.length}`);
console.log(`Vídeos locais ainda sem cópia no R2: ${report.localWithoutR2.length}`);
console.log(shouldWrite ? 'Catálogo atualizado com os caminhos online estáveis.' : 'Simulação concluída; use --write para atualizar o catálogo.');
