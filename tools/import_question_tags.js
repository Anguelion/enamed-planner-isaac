const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const bankDir = path.join(root, 'question_bank');
const medcofRoot = 'E:\\MedCof 2026';
const report = {
  generatedAt: new Date().toISOString(),
  source: medcofRoot,
  blocks: [],
  totals: { files: 0, entries: 0, applied: 0, unmatched: 0 }
};

function parseTagsFile(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const entries = [];
  const pattern = /^\s*(\d+)\)\s+([^\r\n]+)\r?\nTags:\s*([^\r\n]+)\s*$/gm;
  let match;
  while ((match = pattern.exec(text))) {
    const number = Number(match[1]);
    const tags = match[3].split('|').map(tag => tag.trim()).filter(Boolean);
    entries.push({ number, stem: match[2].trim(), tags });
  }
  return entries;
}

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function tokens(value) {
  return new Set(normalize(value).split(' ').filter(token => token.length > 2));
}

function overlapScore(left, right) {
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const token of left) if (right.has(token)) overlap += 1;
  const recall = overlap / left.size;
  const jaccard = overlap / (left.size + right.size - overlap);
  return recall * 0.78 + jaccard * 0.22;
}

function entryQuestionScore(entry, question) {
  const entryStem = normalize(entry.stem);
  const questionStem = normalize(question.stem);
  const exactPrefix = entryStem.length > 10 && (questionStem.startsWith(entryStem) || entryStem.startsWith(questionStem));
  const stemScore = exactPrefix ? 1 : overlapScore(tokens(entry.stem), tokens(question.stem));
  const metadata = [question.id, question.area, question.topic, question.sourceLabel, question.source].join(' ');
  const metadataScore = overlapScore(tokens(entry.tags.join(' ')), tokens(metadata));
  return stemScore * 0.86 + metadataScore * 0.14;
}

for (let block = 1; block <= 30; block += 1) {
  const blockLabel = String(block).padStart(2, '0');
  const blockDir = path.join(medcofRoot, `Bloco ${blockLabel}`);
  if (!fs.existsSync(blockDir)) continue;
  const tagCandidates = fs.readdirSync(blockDir)
    .filter(name => /^Tags.*\.txt$/i.test(name))
    .sort((a, b) => (a.toLowerCase() === 'tags.txt' ? -1 : b.toLowerCase() === 'tags.txt' ? 1 : a.localeCompare(b)));
  if (!tagCandidates.length) continue;
  const tagsFile = path.join(blockDir, tagCandidates[0]);

  const jsonFile = path.join(bankDir, `bloco_${blockLabel}.json`);
  const jsFile = path.join(bankDir, `bloco_${blockLabel}.js`);
  if (!fs.existsSync(jsonFile)) throw new Error(`Banco ausente para o Bloco ${blockLabel}: ${jsonFile}`);

  const entries = parseTagsFile(tagsFile);
  const bank = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  const uniqueNumbers = new Set(bank.questions.map(question => Number(question.number))).size === bank.questions.length;
  const availableQuestions = new Set(bank.questions);
  const matchedEntries = new Set();
  const matchScores = [];
  let applied = 0;

  for (const question of bank.questions) {
    delete question.tags;
    delete question.tagSource;
  }

  if (uniqueNumbers) {
    const entriesByNumber = new Map(entries.map(entry => [entry.number, entry]));
    for (const question of bank.questions) {
      const entry = entriesByNumber.get(Number(question.number));
      if (!entry?.tags?.length) continue;
      question.tags = entry.tags;
      question.tagSource = tagCandidates[0];
      availableQuestions.delete(question);
      matchedEntries.add(entry);
      matchScores.push(1);
      applied += 1;
    }
  } else {
    const candidates = [];
    for (const entry of entries) {
      for (const question of bank.questions) {
        const score = entryQuestionScore(entry, question);
        if (score >= 0.78) candidates.push({ entry, question, score });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    for (const candidate of candidates) {
      if (matchedEntries.has(candidate.entry) || !availableQuestions.has(candidate.question)) continue;
      candidate.question.tags = candidate.entry.tags;
      candidate.question.tagSource = tagCandidates[0];
      availableQuestions.delete(candidate.question);
      matchedEntries.add(candidate.entry);
      matchScores.push(candidate.score);
      applied += 1;
    }
  }

  for (const question of bank.questions) {
    if (!question.tags?.length) continue;
    question.tagSource = 'Tags.txt';
  }

  const unmatchedEntries = entries.filter(entry => !matchedEntries.has(entry)).map(entry => entry.number);
  const untaggedQuestions = [...availableQuestions].map(question => question.id);
  bank.count = bank.questions.length;
  fs.writeFileSync(jsonFile, `${JSON.stringify(bank, null, 2)}\n`, 'utf8');
  const wrapper = `window.ENAMED_LOCAL_QUESTION_BANK = window.ENAMED_LOCAL_QUESTION_BANK || {};\nwindow.ENAMED_LOCAL_QUESTION_BANK[${JSON.stringify(String(block))}] = ${JSON.stringify(bank)};\n`;
  fs.writeFileSync(jsFile, wrapper, 'utf8');

  report.blocks.push({ block, file: tagCandidates[0], entries: entries.length, questions: bank.questions.length, applied, unmatchedEntries, untaggedQuestions, minimumMatchScore: matchScores.length ? Math.min(...matchScores) : null });
  report.totals.files += 1;
  report.totals.entries += entries.length;
  report.totals.applied += applied;
  report.totals.unmatched += unmatchedEntries.length;
}

const reportDir = path.join(root, 'archive', 'reports');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'question_tags_import.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(JSON.stringify(report, null, 2));
