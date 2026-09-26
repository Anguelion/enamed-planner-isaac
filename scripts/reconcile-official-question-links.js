'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const bankRoot = path.join(root, 'question_bank');
const shouldWrite = process.argv.includes('--write');
const shouldCheck = process.argv.includes('--check');

function normalizedTopic(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function loadTopicAliases() {
  const source = fs.readFileSync(path.join(root, 'assets', 'planner.js'), 'utf8');
  const match = source.match(/const TOPIC_ALIASES = (\{[\s\S]*?\n\});/);
  if(!match) throw new Error('TOPIC_ALIASES não encontrado em assets/planner.js.');
  return vm.runInNewContext(`(${match[1]})`, Object.create(null));
}

function extractSeed() {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tag = html.match(/<script[^>]*id=["']seed["'][^>]*>/);
  if(!tag) throw new Error('Seed do planner não encontrado em index.html.');
  const start = html.indexOf(tag[0]) + tag[0].length;
  const end = html.indexOf('</script>', start);
  return JSON.parse(html.slice(start, end));
}

function loadIndex() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(bankRoot, 'index.js'), 'utf8'), context, { filename: 'question_bank/index.js' });
  return context.window.ENAMED_LOCAL_QUESTION_INDEX;
}

function loadCollection(entry) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(bankRoot, entry.script), 'utf8'), context, { filename: entry.script });
  return context.window.ENAMED_LOCAL_QUESTION_BANK[String(entry.block)];
}

function saveCollection(entry, payload) {
  const key = String(entry.block);
  fs.writeFileSync(
    path.join(bankRoot, entry.script),
    `window.ENAMED_LOCAL_QUESTION_BANK = window.ENAMED_LOCAL_QUESTION_BANK || {};\nwindow.ENAMED_LOCAL_QUESTION_BANK[${JSON.stringify(key)}] = ${JSON.stringify(payload)};\n`
  );
  const jsonPath = path.join(bankRoot, entry.script.replace(/\.js$/i, '.json'));
  fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function officialMatchScore(current, official, canonicalTopic) {
  const currentTopic = canonicalTopic(current.topic);
  const officialTopic = canonicalTopic(official.topic);
  if(currentTopic === officialTopic) return 1000;
  const words = officialTopic.split(' ').filter(word => word.length > 3);
  const overlap = words.filter(word => currentTopic.includes(word)).length;
  return (currentTopic.includes(officialTopic) || officialTopic.includes(currentTopic) ? 200 : 0) + overlap;
}

function buildEffectiveSchedule(seedSchedule, officialItems, canonicalTopic) {
  const used = new Set();
  const ordered = [];
  officialItems.slice().sort((a,b) => Number(a.block)-Number(b.block) || Number(a.order)-Number(b.order)).forEach((official, index) => {
    const inBlock = seedSchedule.filter(item => Number(item.block) === Number(official.block) && !used.has(item.id));
    const exact = inBlock.map(item => ({ item, score:officialMatchScore(item, official, canonicalTopic) })).sort((a,b) => b.score-a.score)[0];
    const fallback = inBlock.slice().sort((a,b) => Number(a.row)-Number(b.row) || String(a.date || '').localeCompare(String(b.date || '')))[0];
    const current = exact?.score >= 2 ? exact.item : fallback;
    if(current) used.add(current.id);
    ordered.push({
      ...(current || {}),
      id:current?.id || `cron-medplanner-${official.block}-${official.order}`,
      row:index + 1,
      lessonOrder:Number(official.order),
      block:Number(official.block),
      topic:official.topic,
      area:official.area,
      priority:official.priority
    });
  });
  return ordered;
}

const aliases = loadTopicAliases();
const canonicalTopic = value => aliases[normalizedTopic(value)] || normalizedTopic(value);
const seed = extractSeed();
const officialItems = JSON.parse(fs.readFileSync(path.join(root, 'official_schedule.json'), 'utf8')).items || [];
const schedule = buildEffectiveSchedule(seed.schedule || [], officialItems, canonicalTopic)
  .filter(item => Number(item.block) >= 1 && Number(item.block) <= 30);
const scheduleById = new Map(schedule.map(item => [String(item.id), item]));
const scheduleByBlock = new Map();
schedule.forEach(item => {
  const key = String(item.block);
  if(!scheduleByBlock.has(key)) scheduleByBlock.set(key, []);
  scheduleByBlock.get(key).push(item);
});

const manualQuestionTargets = new Map([
  ['b01-semanais-q80', { block:1, topic:'Trauma - Conceitos iniciais ATLS' }],
  ['b01-semanais-q84', { block:1, topic:'Trauma - Conceitos iniciais ATLS' }],
  ['b01-semanais-q93', { block:1, topic:'Aleitamento Materno' }],
  ['b02-semanais-q157', { block:2, topic:'CofBasics - Vitalidade Fetal' }],
  ['b04-semanais-q39', { block:4, topic:'Assistência ao Parto' }],
  ['b04-semanais-q101', { block:4, topic:'Estática Fetal' }],
  ['b09-semanais-q108', { block:9, topic:'Introdução a Geriatria e Avaliação Geriátrica Ampla' }],
  ['b09-semanais-q111', { block:9, topic:'Síndromes Geriátricas, Vacinação do Idoso e Iatrogenia no Idoso' }],
  ['b09-semanais-q117', { block:7, topic:'Abdome Agudo - Vias Biliares' }],
  ['b09-semanais-q119', { block:7, topic:'Abdome Agudo - Vias Biliares' }],
  ['b09-semanais-q127', { block:9, topic:'Dermatoses e Infecções de Partes Moles' }],
  ['b09-semanais-q130', { block:9, topic:'Dermatoses e Infecções de Partes Moles' }],
  ['b09-semanais-q138', { block:9, topic:'Corrimentos Vaginais' }],
  ['b09-semanais-q150', { block:9, topic:'Úlceras Genitais' }],
  ['b10-semanais-q60', { block:10, topic:'Artrites' }],
  ['b10-semanais-q65', { block:10, topic:'Artrites' }],
  ['b10-semanais-q73', { block:10, topic:'Fibromialgia' }],
  ['b10-semanais-q79', { block:10, topic:'Infecção de Vias Aéreas Superiores' }],
  ['b10-semanais-q80', { block:10, topic:'Infecção de Vias Aéreas Superiores' }],
  ['b10-semanais-q81', { block:10, topic:'Infecção de Vias Aéreas Superiores' }],
  ['b14-semanais-q20', { block:14, topic:'Esôfago no ENAMED' }],
  ['b14-semanais-q95', { block:14, topic:'Dislipidemia: classificação, diagnóstico e tratamento' }],
  ['b14-semanais-q96', { block:14, topic:'Dislipidemia: classificação, diagnóstico e tratamento' }],
  ['b14-semanais-q97', { block:14, topic:'Dislipidemia: classificação, diagnóstico e tratamento' }],
  ['b14-semanais-q98', { block:14, topic:'Dislipidemia: classificação, diagnóstico e tratamento' }],
  ['b14-semanais-q104', { block:14, topic:'Dislipidemia: classificação, diagnóstico e tratamento' }],
  ['b14-semanais-q111', { block:14, topic:'PALS - Suporte Avançado Pediatria' }],
  ['b14-semanais-q114', { block:14, topic:'PALS - Suporte Avançado Pediatria' }],
  ['b14-semanais-q115', { block:14, topic:'PALS - Suporte Avançado Pediatria' }],
  ['b14-semanais-q119', { block:14, topic:'Cetoacidose Diabética na Pediatria' }],
  ['b14-semanais-q120', { block:14, topic:'Cetoacidose Diabética na Pediatria' }],
  ['b14-semanais-q121', { block:14, topic:'Cetoacidose Diabética na Pediatria' }],
  ['b14-semanais-q140', { block:14, topic:'Atenção Primária à Saúde' }],
  ['b15-semanais-q96', { block:15, topic:'Cefaleias' }],
  ['b15-semanais-q123', { block:15, topic:'Ferramentas da APS' }],
  ['b18-semanais-q95', { block:18, topic:'Uroginecologia' }]
]);
for(let number = 1; number <= 10; number += 1) {
  manualQuestionTargets.set(`b08-lesoes-elementares-pediatricas-q${number}`, { block:9, topic:'CofBasics - Lesões Elementares (Pediatria)' });
}

const index = loadIndex();
const entries = (index.blocks || []).filter(entry => !entry.special && /^\d+$/.test(String(entry.block)) && Number(entry.block) >= 1 && Number(entry.block) <= 30);
const changes = [];
const unresolved = new Map();
const unresolvedDetails = [];

for(const entry of entries) {
  const payload = loadCollection(entry);
  let changedInBlock = 0;
  for(const question of payload.questions || []) {
    const manualTarget = manualQuestionTargets.get(question.id);
    if(manualTarget) {
      const matches = (scheduleByBlock.get(String(manualTarget.block)) || []).filter(item => canonicalTopic(item.topic) === canonicalTopic(manualTarget.topic));
      if(matches.length !== 1) throw new Error(`Correlato manual ambíguo ou ausente para ${question.id}.`);
      const expected = matches[0].id;
      if(question.scheduleId !== expected || question.scheduleLinkVerified !== true) {
        changes.push({ block:String(entry.block), id:question.id, topic:question.topic || '', from:question.scheduleId || '', to:expected, verified:true });
        question.scheduleId = expected;
        question.scheduleLinkVerified = true;
        changedInBlock += 1;
      }
      continue;
    }
    const candidates = [...new Set([question.topic, question.sourceLabel, question.source].filter(Boolean).map(canonicalTopic))];
    const matches = (scheduleByBlock.get(String(entry.block)) || []).filter(item => candidates.includes(canonicalTopic(item.topic)));
    if(matches.length !== 1) {
      const current = scheduleById.get(String(question.scheduleId || ''));
      if(current && String(current.block) === String(entry.block)) continue;
      const label = question.topic || question.sourceLabel || question.source || '(sem tópico)';
      unresolved.set(`${entry.block}:${label}`, (unresolved.get(`${entry.block}:${label}`) || 0) + 1);
      unresolvedDetails.push({ block:String(entry.block), id:question.id, topic:label, scheduleId:question.scheduleId || '' });
      continue;
    }
    const expected = matches[0].id;
    if(question.scheduleId === expected) continue;
    changes.push({ block:String(entry.block), id:question.id, topic:question.topic || '', from:question.scheduleId || '', to:expected });
    question.scheduleId = expected;
    changedInBlock += 1;
  }
  if(shouldWrite && changedInBlock) saveCollection(entry, payload);
}

const changedByBlock = changes.reduce((map, change) => {
  map[change.block] = (map[change.block] || 0) + 1;
  return map;
}, {});
const unresolvedQuestions = [...unresolved.values()].reduce((sum, count) => sum + count, 0);

console.log(JSON.stringify({
  mode: shouldWrite ? 'write' : shouldCheck ? 'check' : 'dry-run',
  officialCollections: entries.length,
  scheduleItems: schedule.length,
  changedQuestions: changes.length,
  changedByBlock,
  unresolvedQuestions,
  unresolvedTopics: unresolved.size,
  sampleChanges: changes.slice(0, 20),
  sampleUnresolved: [...unresolved.entries()].slice(0, 20).map(([topic, count]) => ({ topic, count })),
  unresolvedDetails: unresolvedDetails.slice(0, 50)
}, null, 2));

if(shouldCheck && changes.length) process.exitCode = 1;
