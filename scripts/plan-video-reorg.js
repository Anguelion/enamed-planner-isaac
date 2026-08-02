#!/usr/bin/env node
// PLANEJA (não executa) a reorganização das pastas de vídeo em E:\MedCof 2026,
// replicando o padrão que o usuário aplicou manualmente no Bloco 01.
//
// Casa cada pasta de aula do disco com um item do cronograma (official_schedule.json)
// pelo TÍTULO (não pela numeração da pasta, que reinicia dentro de cada área e por
// isso não é confiável para casar entre blocos). Só entra no plano de execução
// quando a confiança do casamento é alta; o resto fica marcado para revisão manual.
//
// Uso: node scripts/plan-video-reorg.js "E:\MedCof 2026"

const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] || 'E:\\MedCof 2026';
const REPO = path.join(__dirname, '..');
const schedule = JSON.parse(fs.readFileSync(path.join(REPO, 'official_schedule.json'), 'utf8')).items;
const catalog = JSON.parse(fs.readFileSync(path.join(REPO, 'video_library', 'catalog.json'), 'utf8')).lessons;

const AREA_RENAME = { 'G.O': 'GO' };
function areaFolderName(area) { return AREA_RENAME[area] || area; }

// Windows não aceita < > : " / \ | ? * em nomes de arquivo/pasta, nem espaço/ponto no final.
function sanitizeName(name) {
  return String(name).replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().replace(/\.+$/, '');
}

function norm(text) {
  return String(text || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokenSet(text) { return new Set(norm(text).split(' ').filter(Boolean)); }

function similarity(a, b) {
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  // recall do conjunto de palavras do título MAIS CURTO contra o mais longo:
  // cobre bem casos de título abreviado ("Trauma - Conceitos iniciais ATLS")
  // vs título completo do cronograma, sem falso-positivar em temas parecidos
  // que só compartilham uma palavra comum (ex.: "Diabetes ...").
  const ta = tokenSet(a), tb = tokenSet(b);
  const [shorter, longer] = ta.size <= tb.size ? [ta, tb] : [tb, ta];
  if (!shorter.size) return 0;
  const inter = [...shorter].filter(t => longer.has(t)).length;
  return inter / shorter.size;
}

function cleanVideoTitle(title) {
  let cleaned = title.trim();
  // idempotência: se o arquivo já tiver sido processado antes (ex.: "01 - 1 aula - Título"),
  // remove nosso próprio prefixo antes de tentar limpar o que sobrou do nome original.
  cleaned = cleaned.replace(/^\d{1,2}(?:\.\d+)?\s*-\s*(?:\d+\s*aula\s*-\s*)?/i, '');
  // remove prefixos numéricos residuais do material original: "1.2.1.2 ", "1. ", "06 - "
  cleaned = cleaned.replace(/^[\d]+(?:\.[\d]+)*\s*[-.]?\s*/, '');
  // remove sufixo tipo " (2)" quando é só um número entre parênteses no final (artefato de duplicata)
  cleaned = cleaned.replace(/\s*\(\d+\)\s*$/, '').trim();
  // limpa pontuação solta que tenha sobrado no início (ex.: ". Título")
  cleaned = cleaned.replace(/^[\s.\-]+/, '').trim();
  return cleaned || title.trim();
}

const isBonus = l => l.area === 'CofBasics' || /^cofbasics/i.test(l.title);

const scheduleByBlock = new Map();
for (const item of schedule) {
  if (!scheduleByBlock.has(item.block)) scheduleByBlock.set(item.block, []);
  scheduleByBlock.get(item.block).push(item);
}
for (const items of scheduleByBlock.values()) items.sort((a, b) => a.order - b.order);

const catalogByBlock = new Map();
for (const lesson of catalog) {
  if (!catalogByBlock.has(lesson.block)) catalogByBlock.set(lesson.block, []);
  catalogByBlock.get(lesson.block).push(lesson);
}

const CONFIDENCE_THRESHOLD = 0.85;
const plan = { blocks: {}, bonusLessonsUntouched: [], lowConfidence: [] };

for (const [block, items] of scheduleByBlock) {
  const candidates = (catalogByBlock.get(block) || []).filter(l => !isBonus(l));
  const used = new Set();
  const blockId = String(block).padStart(2, '0');

  // pontua todos os pares (item do cronograma x pasta candidata) e atribui greedy pelo maior score
  const pairs = [];
  items.forEach((item, itemIdx) => {
    candidates.forEach((lesson, lessonIdx) => {
      pairs.push({ itemIdx, lessonIdx, score: similarity(item.topic, lesson.title) });
    });
  });
  pairs.sort((a, b) => b.score - a.score);
  const assignedItem = new Array(items.length).fill(null);
  const usedLesson = new Set();
  for (const pair of pairs) {
    if (assignedItem[pair.itemIdx] !== null) continue;
    if (usedLesson.has(pair.lessonIdx)) continue;
    if (pair.score < CONFIDENCE_THRESHOLD) continue;
    assignedItem[pair.itemIdx] = pair.lessonIdx;
    usedLesson.add(pair.lessonIdx);
  }

  const areaOrders = new Map();
  let nextAreaNum = 1;
  for (const item of items) if (!areaOrders.has(item.area)) areaOrders.set(item.area, nextAreaNum++);

  const blockPlan = { areas: {}, lessons: [] };
  items.forEach((item, itemIdx) => {
    const lessonIdx = assignedItem[itemIdx];
    const areaNum = areaOrders.get(item.area);
    const areaFolder = sanitizeName(`${String(areaNum).padStart(2, '0')} - ${areaFolderName(item.area)}`);
    const lessonFolder = sanitizeName(`${String(item.order).padStart(2, '0')} - ${item.topic}`);
    const targetLessonDir = path.join(ROOT, `Bloco ${blockId}`, areaFolder, lessonFolder);

    if (lessonIdx === null) {
      // sem vídeo correspondente com confiança suficiente
      const bestGuess = pairs.find(p => p.itemIdx === itemIdx);
      blockPlan.lessons.push({
        order: item.order, topic: item.topic, area: item.area,
        status: 'no-confident-match',
        bestGuessTitle: bestGuess ? candidates[bestGuess.lessonIdx]?.title : null,
        bestGuessScore: bestGuess ? Number(bestGuess.score.toFixed(2)) : 0
      });
      return;
    }

    const lesson = candidates[lessonIdx];
    const currentDir = path.dirname(path.join(ROOT, lesson.videos[0].relativePath));
    const needsMove = path.resolve(currentDir) !== path.resolve(targetLessonDir);

    const completeVideos = lesson.videos.filter(v => v.type === 'complete');
    const expressVideos = lesson.videos.filter(v => v.type === 'express');
    const videoRenames = [];
    completeVideos.forEach((v, idx) => {
      const cleaned = cleanVideoTitle(v.title);
      const prefix = completeVideos.length > 1 ? `${String(item.order).padStart(2, '0')} - ${idx + 1} aula - ` : `${String(item.order).padStart(2, '0')} - `;
      videoRenames.push({ from: v.relativePath, toName: sanitizeName(prefix + cleaned) + v.extension });
    });
    expressVideos.forEach(v => {
      const cleaned = cleanVideoTitle(v.title);
      videoRenames.push({ from: v.relativePath, toName: sanitizeName(`${String(item.order).padStart(2, '0')}.1 - ${cleaned}`) + v.extension });
    });

    blockPlan.lessons.push({
      order: item.order,
      topic: item.topic,
      scheduleArea: item.area,
      matchedTitle: lesson.title,
      matchScore: Number(similarity(item.topic, lesson.title).toFixed(2)),
      currentArea: lesson.area,
      currentDir: path.relative(ROOT, currentDir),
      targetDir: path.relative(ROOT, targetLessonDir),
      needsMove,
      videoRenames
    });
  });

  plan.blocks[blockId] = blockPlan;

  candidates.forEach((lesson, idx) => {
    if (!usedLesson.has(idx)) plan.lowConfidence.push({ block, title: lesson.title, area: lesson.area });
  });
}

for (const lessons of catalogByBlock.values()) {
  for (const lesson of lessons) {
    if (isBonus(lesson)) plan.bonusLessonsUntouched.push({ block: lesson.block, title: lesson.title, area: lesson.area });
  }
}

fs.writeFileSync(path.join(REPO, 'video_library', 'reorg-plan.json'), JSON.stringify(plan, null, 2), 'utf8');

let totalMoves = 0, totalRenames = 0, totalNoMatch = 0;
for (const b of Object.values(plan.blocks)) {
  for (const l of b.lessons) {
    if (l.status === 'no-confident-match') { totalNoMatch++; continue; }
    if (l.needsMove) totalMoves++;
    totalRenames += l.videoRenames.length;
  }
}
console.log(`Blocos processados: ${Object.keys(plan.blocks).length}`);
console.log(`Aulas casadas com confiança e prontas pro plano: ${Object.values(plan.blocks).reduce((s, b) => s + b.lessons.filter(l => l.status !== 'no-confident-match').length, 0)}`);
console.log(`  - das quais precisam mudar de pasta/área: ${totalMoves}`);
console.log(`  - arquivos de vídeo a renomear: ${totalRenames}`);
console.log(`Itens do cronograma SEM casamento confiável (revisão manual): ${totalNoMatch}`);
console.log(`Pastas no disco sobrando sem uso (não casaram com nada, não tocadas): ${plan.lowConfidence.length}`);
console.log(`Aulas bônus CofBasics (não tocadas): ${plan.bonusLessonsUntouched.length}`);
console.log('Plano completo salvo em video_library/reorg-plan.json');
