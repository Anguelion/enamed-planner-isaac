#!/usr/bin/env node
// PLANEJA (não executa) a reorganização das pastas de vídeo em E:\MedCof 2026,
// replicando o padrão que o usuário aplicou manualmente no Bloco 01:
//   - pasta de área renumerada na ordem cronológica do cronograma (official_schedule.json)
//   - aula movida para a área correta quando a pasta atual está categorizada errado
//   - arquivo de vídeo principal renomeado para "NN - <título original limpo>.ext"
//   - COFEXPRESS ao lado do vídeo (não em subpasta), renomeado "NN.1 - <título> COFEXPRESS.ext"
//   - quando há 2+ vídeos "completos" na mesma aula: "NN - 1 aula - ...", "NN - 2 aula - ..."
//
// Este script só GERA um plano em JSON. Nada é movido/renomeado aqui.
// Uso: node scripts/plan-video-reorg.js "E:\MedCof 2026"

const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] || 'E:\\MedCof 2026';
const REPO = path.join(__dirname, '..');
const schedule = JSON.parse(fs.readFileSync(path.join(REPO, 'official_schedule.json'), 'utf8')).items;
const catalog = JSON.parse(fs.readFileSync(path.join(REPO, 'video_library', 'catalog.json'), 'utf8')).lessons;

const AREA_RENAME = { 'G.O': 'GO' }; // grafia adotada pelo usuário no Bloco 01
function areaFolderName(area) { return AREA_RENAME[area] || area; }

function cleanVideoTitle(title) {
  // remove prefixos numéricos residuais tipo "1.2.1.2 ", "06 - ", "05.1 - "
  let cleaned = title.replace(/^[\d]+(?:\.[\d]+)*\s*-?\s*/, '').trim();
  // remove sufixo tipo " (2)" quando é só um número entre parênteses no final (artefato de duplicata)
  cleaned = cleaned.replace(/\s*\(\d+\)\s*$/, '').trim();
  return cleaned || title.trim();
}

// Agrupa schedule por bloco, na ordem
const scheduleByBlock = new Map();
for (const item of schedule) {
  if (!scheduleByBlock.has(item.block)) scheduleByBlock.set(item.block, []);
  scheduleByBlock.get(item.block).push(item);
}
for (const items of scheduleByBlock.values()) items.sort((a, b) => a.order - b.order);

// Para cada bloco, calcula a numeração de área pela primeira aparição na ordem do cronograma
function areaOrderMap(blockItems) {
  const map = new Map();
  let next = 1;
  for (const item of blockItems) {
    if (!map.has(item.area)) { map.set(item.area, next); next++; }
  }
  return map;
}

const catalogByBlockOrder = new Map();
for (const lesson of catalog) catalogByBlockOrder.set(lesson.block + '|' + lesson.folderOrder, lesson);

const plan = { blocks: {}, unmatchedLessons: [] };

for (const [block, items] of scheduleByBlock) {
  const areaOrders = areaOrderMap(items);
  const blockId = String(block).padStart(2, '0');
  const blockPlan = { areas: {}, lessons: [] };

  for (const item of items) {
    const key = block + '|' + item.order;
    const lesson = catalogByBlockOrder.get(key);
    const areaNum = areaOrders.get(item.area);
    const areaFolder = `${String(areaNum).padStart(2, '0')} - ${areaFolderName(item.area)}`;
    const lessonFolder = `${String(item.order).padStart(2, '0')} - ${item.topic}`;
    const targetLessonDir = path.join(ROOT, `Bloco ${blockId}`, areaFolder, lessonFolder);

    if (!lesson) {
      blockPlan.lessons.push({ order: item.order, topic: item.topic, area: item.area, status: 'no-video-yet', targetDir: path.relative(ROOT, targetLessonDir) });
      continue;
    }

    const currentDir = path.dirname(path.join(ROOT, lesson.videos[0].relativePath));
    const needsMove = path.resolve(currentDir) !== path.resolve(targetLessonDir);

    const completeVideos = lesson.videos.filter(v => v.type === 'complete');
    const expressVideos = lesson.videos.filter(v => v.type === 'express');
    const videoRenames = [];
    completeVideos.forEach((v, idx) => {
      const cleaned = cleanVideoTitle(v.title);
      const prefix = completeVideos.length > 1 ? `${String(item.order).padStart(2, '0')} - ${idx + 1} aula - ` : `${String(item.order).padStart(2, '0')} - `;
      videoRenames.push({ from: v.relativePath, toName: prefix + cleaned + v.extension });
    });
    expressVideos.forEach(v => {
      const cleaned = cleanVideoTitle(v.title);
      videoRenames.push({ from: v.relativePath, toName: `${String(item.order).padStart(2, '0')}.1 - ${cleaned}${v.extension}` });
    });

    blockPlan.lessons.push({
      order: item.order,
      topic: item.topic,
      scheduleArea: item.area,
      currentArea: lesson.area,
      currentDir: path.relative(ROOT, currentDir),
      targetDir: path.relative(ROOT, targetLessonDir),
      needsMove,
      videoRenames
    });
  }

  plan.blocks[blockId] = blockPlan;
}

// Lições no catálogo que não bateram com nenhum item do cronograma (ex.: CofBasics extra)
for (const lesson of catalog) {
  const key = lesson.block + '|' + lesson.folderOrder;
  if (!scheduleByBlock.get(lesson.block)?.some(it => it.order === lesson.folderOrder)) {
    plan.unmatchedLessons.push({ block: lesson.block, folderOrder: lesson.folderOrder, title: lesson.title, area: lesson.area });
  }
}

fs.writeFileSync(path.join(REPO, 'video_library', 'reorg-plan.json'), JSON.stringify(plan, null, 2), 'utf8');

// Resumo no console
let totalMoves = 0, totalRenames = 0, totalNoVideo = 0;
for (const b of Object.values(plan.blocks)) {
  for (const l of b.lessons) {
    if (l.status === 'no-video-yet') { totalNoVideo++; continue; }
    if (l.needsMove) totalMoves++;
    totalRenames += l.videoRenames.length;
  }
}
console.log(`Blocos processados: ${Object.keys(plan.blocks).length}`);
console.log(`Aulas com pasta a mover (área errada): ${totalMoves}`);
console.log(`Arquivos de vídeo a renomear: ${totalRenames}`);
console.log(`Aulas do cronograma sem vídeo ainda: ${totalNoVideo}`);
console.log(`Aulas no disco sem correspondência no cronograma (não tocadas): ${plan.unmatchedLessons.length}`);
console.log('Plano completo salvo em video_library/reorg-plan.json');
