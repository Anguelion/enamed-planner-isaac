#!/usr/bin/env node
// Regenera video_library/catalog.json a partir da estrutura real de pastas em E:\MedCof 2026.
// Não move nem renomeia nenhum arquivo de vídeo — só relê o disco e corrige o mapeamento.
//
// Estrutura esperada: <root>/Bloco NN/NN - Area/NN - Titulo da aula/*.mp4|*.mkv|*.avi
// Contêineres .ts precisam ser remultiplexados antes com remux-ts-videos.js;
// o navegador não os reproduz de forma portátil como arquivo avulso.
//
// Uso: node scripts/build-video-catalog.js "E:\MedCof 2026"

const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] || 'E:\\MedCof 2026';
const OUT = path.join(__dirname, '..', 'video_library', 'catalog.json');
const OFFICIAL_SCHEDULE = path.join(__dirname, '..', 'official_schedule.json');
const VIDEO_EXT = new Set(['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v']);
const REMUX_EXT = new Set(['.ts']);
const officialSchedule = JSON.parse(fs.readFileSync(OFFICIAL_SCHEDULE, 'utf8')).items || [];

// O caminho público no R2 é independente do nome atual no disco. Ao regenerar o
// catálogo, reaproveitamos a associação anterior por caminho exato ou por tamanho
// único do arquivo, para que renomear/mover uma aula não quebre o vídeo online.
let previous = null;
try { previous = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) {}
const previousVideos = previous?.lessons?.flatMap(lesson => lesson.videos || []) || [];
const previousByPath = new Map(previousVideos.map(video => [video.relativePath, video]));
const previousBySize = new Map();
for (const video of previousVideos) {
  const size = Number(video.size);
  if (!Number.isFinite(size) || size <= 0) continue;
  if (!previousBySize.has(size)) previousBySize.set(size, []);
  previousBySize.get(size).push(video);
}

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

function cleanVideoTopic(value) {
  const cleaned = stripVideoOrderPrefix(String(value || ''))
    .replace(/cof[\s_-]*express/ig, ' ')
    .replace(/\benamed\b/ig, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\beditado\b/ig, ' ');
  return slug(cleaned);
}

const DIRECT_TOPIC_ALIASES = new Map([
  ['vacina pneumococica 20v no sus', 'vacinacao']
]);

function scheduleMatch(block, value) {
  let target = cleanVideoTopic(value);
  target = DIRECT_TOPIC_ALIASES.get(target) || target;
  if (!target) return null;
  const candidates = officialSchedule.filter(item => Number(item.block) === Number(block));
  const exact = candidates.find(item => cleanVideoTopic(item.topic) === target);
  if (exact) return exact;
  const best = candidates
    .map(item => {
      const official = cleanVideoTopic(item.topic);
      const contains = target.length >= 6 && (official.includes(target) || target.includes(official));
      return { item, score: contains ? 1000 + Math.min(target.length, official.length) : 0 };
    })
    .sort((a, b) => b.score - a.score)[0];
  if (best?.score > 0) return best.item;
  // O provedor às vezes coloca a aula na pasta do bloco anterior/seguinte.
  // Só corrigimos entre blocos quando há uma correspondência global exata e
  // única, evitando associações aproximadas perigosas.
  const globalExact = officialSchedule.filter(item => cleanVideoTopic(item.topic) === target);
  return globalExact.length === 1 ? globalExact[0] : null;
}

function buildVideos(files, lessonPath, blockId, areaName, lessonTitle) {
  return files.map(file => {
    const extension = path.extname(file.name);
    const videoTitle = stripVideoOrderPrefix(file.name.slice(0, -extension.length));
    const absolutePath = path.join(lessonPath, file.name);
    const relativePath = path.relative(ROOT, absolutePath).split(path.sep).join('/');
    const size = fs.statSync(absolutePath).size;
    const type = /cofexpress/i.test(videoTitle) ? 'express' : 'complete';
    const priorByPath = previousByPath.get(relativePath);
    const priorBySize = previousBySize.get(size) || [];
    const prior = priorByPath || (priorBySize.length === 1 ? priorBySize[0] : null);
    const video = {
      id: prior?.onlinePath ? prior.id : `${blockId}|${areaName}|${lessonTitle}|${videoTitle}`,
      title: videoTitle,
      type,
      relativePath,
      extension,
      size
    };
    if (prior?.onlinePath) video.onlinePath = prior.onlinePath;
    return video;
  });
}

function directLessons(files, lessonPath, block, blockId, fallbackArea = '', fallbackTitle = '') {
  const grouped = new Map();
  files
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .forEach(file => {
      const extension = path.extname(file.name);
      const videoTitle = stripVideoOrderPrefix(file.name.slice(0, -extension.length));
      const match = scheduleMatch(block, videoTitle);
      const area = match?.area || fallbackArea || 'Sem área definida';
      const title = match?.topic || fallbackTitle || videoTitle.replace(/cof[\s_-]*express/ig, '').trim();
      const key = match ? `schedule:${match.block}:${match.order}` : `${slug(area)}:${slug(title)}`;
      if (!grouped.has(key)) grouped.set(key, { area, title, match, files: [] });
      grouped.get(key).files.push(file);
    });

  return [...grouped.values()].map(group => {
    const targetBlock = Number(group.match?.block || block);
    const targetBlockId = `b${String(targetBlock).padStart(2, '0')}`;
    return {
      id: `${targetBlockId}|${slug(group.area)}|${slug(group.title)}`,
      block: targetBlock,
      area: group.area,
      title: group.title,
      folderOrder: group.match?.order ?? 0,
      ...(group.match ? { scheduleOrder: Number(group.match.order) } : {}),
      videos: buildVideos(group.files, lessonPath, targetBlockId, group.area, group.title)
    };
  });
}

const issues = { missingExpected: [], orphanFiles: [], badBlockFolders: [], emptyLessons: [], unconvertedVideos: [] };
const lessons = [];

const blockDirs = fs.readdirSync(ROOT, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && /^bloco\s+\d+/i.test(entry.name))
  .sort((a, b) => blockNumber(a.name) - blockNumber(b.name));

for (const blockDir of blockDirs) {
  const block = blockNumber(blockDir.name);
  if (!block) { issues.badBlockFolders.push(blockDir.name); continue; }
  const blockPath = path.join(ROOT, blockDir.name);
  const blockId = `b${String(block).padStart(2, '0')}`;

  // Relate explicitamente os arquivos que existem, mas ainda não podem entrar
  // no player. Isso impede que uma nova leva em .ts volte a parecer ausente.
  const pending = [blockPath];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(absolute);
      else if (entry.isFile() && REMUX_EXT.has(path.extname(entry.name).toLowerCase())) {
        const mp4 = absolute.slice(0, -path.extname(absolute).length) + '.mp4';
        if (!fs.existsSync(mp4)) issues.unconvertedVideos.push(path.relative(ROOT, absolute));
      }
    }
  }

  // Os blocos finais vieram também com MP4s diretamente na raiz do bloco.
  // Cada arquivo é associado ao tópico oficial para que versões completa,
  // COFEXPRESS e complementares apareçam juntas e na ordem do cronograma.
  const blockDirectFiles = fs.readdirSync(blockPath, { withFileTypes: true })
    .filter(entry => entry.isFile() && VIDEO_EXT.has(path.extname(entry.name).toLowerCase()));
  lessons.push(...directLessons(blockDirectFiles, blockPath, block, blockId));

  const areaDirs = fs.readdirSync(blockPath, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  for (const areaDir of areaDirs) {
    const { name: areaName } = stripOrderPrefix(areaDir.name);
    const areaPath = path.join(blockPath, areaDir.name);

    // Alguns extras CofBasics vieram como uma pasta de aula diretamente dentro
    // do bloco, sem a camada intermediária <área>/<aula>. Inclua esses vídeos
    // sem mover a biblioteca original do usuário.
    const directFiles = fs.readdirSync(areaPath, { withFileTypes: true })
      .filter(entry => entry.isFile() && VIDEO_EXT.has(path.extname(entry.name).toLowerCase()));
    if (directFiles.length) {
      const cofbasicMatch = areaName.match(/^(CofBasics)\s*-\s*(.+)$/i);
      const directAreaName = cofbasicMatch ? 'CofBasics' : areaName;
      const directLessonTitle = cofbasicMatch ? cofbasicMatch[2].trim() : areaName;
      if (cofbasicMatch) {
        lessons.push({
          id: `${blockId}|${slug(directAreaName)}|${slug(directLessonTitle)}`,
          block,
          area: directAreaName,
          title: directLessonTitle,
          folderOrder: 0,
          videos: buildVideos(directFiles, areaPath, blockId, directAreaName, directLessonTitle)
        });
      } else {
        lessons.push(...directLessons(directFiles, areaPath, block, blockId, directAreaName, directLessonTitle));
      }
    }

    const lessonDirs = fs.readdirSync(areaPath, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    for (const lessonDir of lessonDirs) {
      const { order: folderOrder, name: lessonTitle } = stripOrderPrefix(lessonDir.name);
      const lessonPath = path.join(areaPath, lessonDir.name);

      const files = fs.readdirSync(lessonPath, { withFileTypes: true })
        .filter(entry => entry.isFile() && VIDEO_EXT.has(path.extname(entry.name).toLowerCase()));

      if (!files.length) continue;

      const videos = buildVideos(files, lessonPath, blockId, areaName, lessonTitle);

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
const mergedLessons = [...mergedByKey.values()]
  .sort((a, b) => {
    const orderA = Number(a.scheduleOrder || scheduleMatch(a.block, a.title)?.order) || 999;
    const orderB = Number(b.scheduleOrder || scheduleMatch(b.block, b.title)?.order) || 999;
    return a.block - b.block
      || orderA - orderB
      || (a.folderOrder || 0) - (b.folderOrder || 0)
      || a.area.localeCompare(b.area, 'pt-BR')
      || a.title.localeCompare(b.title, 'pt-BR');
  });
issues.splitAcrossFolders = splitAcrossFolders;
// A pasta oficial pode conter apenas PDFs enquanto seus vídeos ficam na raiz
// do bloco. Nos blocos finais, que chegam nesse formato avulso, calcule a
// cobertura após a mesclagem para não chamar essas aulas de vazias.
const availableLessonKeys = new Set(mergedLessons.map(lesson => `${lesson.block}|${slug(lesson.title)}`));
issues.emptyLessons = officialSchedule
  .filter(item => Number(item.block) >= 26)
  .filter(item => !availableLessonKeys.has(`${Number(item.block)}|${slug(item.topic)}`))
  .map(item => `Bloco ${String(item.block).padStart(2, '0')} | ${String(item.order).padStart(2, '0')} | ${item.topic}`);
const finalScheduleCount = officialSchedule.filter(item => Number(item.block) >= 26).length;
issues.finalScheduleCoverage = {
  fromBlock: 26,
  scheduledLessons: finalScheduleCount,
  lessonsWithVideo: finalScheduleCount - issues.emptyLessons.length,
  lessonsWithoutVideo: issues.emptyLessons.length
};

// Compara com o catálogo anterior para reportar o que sumiu/apareceu.
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
if (previous?.r2) {
  catalog.r2 = {
    ...previous.r2,
    availableVideos: mergedLessons.reduce((total, lesson) => total + lesson.videos.filter(video => video.onlinePath).length, 0)
  };
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
if (previous) fs.writeFileSync(OUT + '.bak', JSON.stringify(previous, null, 2), 'utf8');
fs.writeFileSync(OUT, JSON.stringify(catalog, null, 2), 'utf8');

const totalVideos = mergedLessons.reduce((sum, l) => sum + l.videos.length, 0);
console.log(`Blocos encontrados: ${blockDirs.length}`);
console.log(`Aulas: ${mergedLessons.length}  |  Vídeos: ${totalVideos}`);
if (issues.badBlockFolders.length) console.log(`Pastas de bloco com nome inesperado: ${issues.badBlockFolders.join(', ')}`);
if (issues.emptyLessons.length) console.log(`Aulas dos blocos finais sem nenhum vídeo (${issues.emptyLessons.length}):\n  - ${issues.emptyLessons.join('\n  - ')}`);
if (issues.unconvertedVideos.length) console.log(`Vídeos .ts aguardando conversão para MP4 (${issues.unconvertedVideos.length}):\n  - ${issues.unconvertedVideos.join('\n  - ')}`);
if (issues.splitAcrossFolders.length) console.log(`Aulas com arquivos espalhados em pastas diferentes, mescladas no catálogo (${issues.splitAcrossFolders.length}):\n  - ${issues.splitAcrossFolders.map(s => `Bloco ${s.block} "${s.title}": ${s.areas.join(' + ')}`).join('\n  - ')}`);
if (previous) {
  console.log(`Vídeos que sumiram do catálogo anterior (${issues.missingExpected.length})`);
  console.log(`Vídeos novos que não estavam no catálogo anterior (${issues.orphanFiles.length})`);
}
fs.writeFileSync(path.join(__dirname, '..', 'video_library', 'catalog-report.json'), JSON.stringify(issues, null, 2), 'utf8');
console.log('Relatório completo salvo em video_library/catalog-report.json');
