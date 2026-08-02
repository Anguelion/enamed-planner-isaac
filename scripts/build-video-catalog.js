#!/usr/bin/env node
// Regenera video_library/catalog.json a partir da estrutura real de pastas em E:\MedCof 2026.
// Não move nem renomeia nenhum arquivo de vídeo — só relê o disco e corrige o mapeamento.
//
// Estrutura esperada: <root>/Bloco NN/NN - Area/NN - Titulo da aula/*.mp4|*.mkv|*.avi
//
// Uso: node scripts/build-video-catalog.js "E:\MedCof 2026"

const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] || 'E:\\MedCof 2026';
const OUT = path.join(__dirname, '..', 'video_library', 'catalog.json');
const VIDEO_EXT = new Set(['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v']);

function slug(text) {
  return String(text || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function stripOrderPrefix(name) {
  const match = name.match(/^(\d+)\s*-\s*(.+)$/);
  if (match) return { order: parseInt(match[1], 10), name: match[2].trim() };
  return { order: null, name: name.trim() };
}

// O provedor do curso reorganiza e renomeia os arquivos de vídeo periodicamente
// (ex.: "01 - 1 aula - Tema" vira "01 - Tema Parte 1" meses depois). Se o prefixo
// numérico entrar no id/title do vídeo, cada reorganização muda o id e orfaniza
// flashcards, progresso e bookmarks já salvos (que referenciam o título "limpo").
// Por isso o vídeo usa o mesmo corte de prefixo das pastas — só o relativePath
// mantém o nome de arquivo real, que é o que precisa bater com o disco.
function stripVideoOrderPrefix(name) {
  return name.replace(/^\d+(?:\.\d+)?\s*-\s*(?:\d+\s*aula\s*-\s*)?/i, '').trim() || name.trim();
}

function blockNumber(name) {
  const match = name.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

const issues = { missingExpected: [], orphanFiles: [], badBlockFolders: [], emptyLessons: [] };
const lessons = [];

const blockDirs = fs.readdirSync(ROOT, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && /^bloco\s+\d+/i.test(entry.name))
  .sort((a, b) => blockNumber(a.name) - blockNumber(b.name));

for (const blockDir of blockDirs) {
  const block = blockNumber(blockDir.name);
  if (!block) { issues.badBlockFolders.push(blockDir.name); continue; }
  const blockPath = path.join(ROOT, blockDir.name);
  const blockId = `b${String(block).padStart(2, '0')}`;

  const areaDirs = fs.readdirSync(blockPath, { withFileTypes: true })
    .filter(entry => entry.isDirectory());

  for (const areaDir of areaDirs) {
    const { name: areaName } = stripOrderPrefix(areaDir.name);
    const areaPath = path.join(blockPath, areaDir.name);

    const lessonDirs = fs.readdirSync(areaPath, { withFileTypes: true })
      .filter(entry => entry.isDirectory());

    for (const lessonDir of lessonDirs) {
      const { order: folderOrder, name: lessonTitle } = stripOrderPrefix(lessonDir.name);
      const lessonPath = path.join(areaPath, lessonDir.name);

      const files = fs.readdirSync(lessonPath, { withFileTypes: true })
        .filter(entry => entry.isFile() && VIDEO_EXT.has(path.extname(entry.name).toLowerCase()));

      if (!files.length) {
        issues.emptyLessons.push(path.relative(ROOT, lessonPath));
        continue;
      }

      const videos = files.map(file => {
        const extension = path.extname(file.name);
        const videoTitle = stripVideoOrderPrefix(file.name.slice(0, -extension.length));
        const relativePath = path.relative(ROOT, path.join(lessonPath, file.name)).split(path.sep).join('/');
        const type = /cofexpress/i.test(videoTitle) ? 'express' : 'complete';
        return {
          id: `${blockId}|${areaName}|${lessonTitle}|${videoTitle}`,
          title: videoTitle,
          type,
          relativePath,
          extension
        };
      });

      lessons.push({
        id: `${blockId}|${slug(areaName)}|${slug(lessonTitle)}`,
        block,
        area: areaName,
        title: lessonTitle,
        folderOrder: folderOrder ?? 0,
        videos
      });
    }
  }
}

// Mescla aulas que acabaram espalhadas em mais de uma pasta (mesmo bloco + mesmo título,
// mas em áreas/pastas diferentes) — bagunça pré-existente comum quando um vídeo COFEXPRESS
// foi baixado numa pasta de área duplicada/errada separada da aula principal.
const mergedByKey = new Map();
const splitAcrossFolders = [];
for (const lesson of lessons) {
  const key = `${lesson.block}|${slug(lesson.title)}`;
  if (!mergedByKey.has(key)) { mergedByKey.set(key, lesson); continue; }
  const existing = mergedByKey.get(key);
  if (existing.area !== lesson.area) {
    splitAcrossFolders.push({ block: lesson.block, title: lesson.title, areas: [existing.area, lesson.area] });
  }
  // a pasta com o vídeo "complete" é a canônica; se a que já estava no mapa só tem
  // vídeo "express" (órfão) e a nova tem o completo, a nova vira a base da mesclagem.
  const existingHasComplete = existing.videos.some(v => v.type === 'complete');
  const incomingHasComplete = lesson.videos.some(v => v.type === 'complete');
  if (!existingHasComplete && incomingHasComplete) {
    lesson.videos.push(...existing.videos);
    mergedByKey.set(key, lesson);
  } else {
    existing.videos.push(...lesson.videos);
  }
}
const mergedLessons = [...mergedByKey.values()];
issues.splitAcrossFolders = splitAcrossFolders;

// Compara com o catálogo anterior para reportar o que sumiu/apareceu.
let previous = null;
try { previous = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) {}
if (previous) {
  const prevVideoIds = new Set(previous.lessons.flatMap(l => l.videos.map(v => v.id)));
  const newVideoIds = new Set(mergedLessons.flatMap(l => l.videos.map(v => v.id)));
  for (const id of prevVideoIds) if (!newVideoIds.has(id)) issues.missingExpected.push(id);
  for (const id of newVideoIds) if (!prevVideoIds.has(id)) issues.orphanFiles.push(id);
}

const catalog = {
  generatedAt: new Date().toISOString(),
  source: ROOT,
  lessons: mergedLessons
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
if (previous) fs.writeFileSync(OUT + '.bak', JSON.stringify(previous, null, 2), 'utf8');
fs.writeFileSync(OUT, JSON.stringify(catalog, null, 2), 'utf8');

const totalVideos = mergedLessons.reduce((sum, l) => sum + l.videos.length, 0);
console.log(`Blocos encontrados: ${blockDirs.length}`);
console.log(`Aulas: ${mergedLessons.length}  |  Vídeos: ${totalVideos}`);
if (issues.badBlockFolders.length) console.log(`Pastas de bloco com nome inesperado: ${issues.badBlockFolders.join(', ')}`);
if (issues.emptyLessons.length) console.log(`Aulas sem nenhum vídeo (${issues.emptyLessons.length}):\n  - ${issues.emptyLessons.join('\n  - ')}`);
if (issues.splitAcrossFolders.length) console.log(`Aulas com arquivos espalhados em pastas diferentes, mescladas no catálogo (${issues.splitAcrossFolders.length}):\n  - ${issues.splitAcrossFolders.map(s => `Bloco ${s.block} "${s.title}": ${s.areas.join(' + ')}`).join('\n  - ')}`);
if (previous) {
  console.log(`Vídeos que sumiram do catálogo anterior (${issues.missingExpected.length})`);
  console.log(`Vídeos novos que não estavam no catálogo anterior (${issues.orphanFiles.length})`);
}
fs.writeFileSync(path.join(__dirname, '..', 'video_library', 'catalog-report.json'), JSON.stringify(issues, null, 2), 'utf8');
console.log('Relatório completo salvo em video_library/catalog-report.json');
