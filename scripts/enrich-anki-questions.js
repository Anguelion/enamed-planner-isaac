'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const QUESTION_BANK = path.join(ROOT, 'question_bank');
const DEFAULT_REPORT = path.join(ROOT, 'tmp', 'question-enrichment-report.json');
const DEFAULT_STATE = path.join(ROOT, 'reports', 'question-enrichment', 'hematology-state.json');
const DEFAULT_REVIEW = path.join(ROOT, 'reports', 'question-enrichment', 'hematology-review.json');
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36';
const SOURCE_LABEL = 'Estratégia MED';

function parseArgs(argv) {
  const args = {
    area: '',
    limit: 5,
    write: false,
    report: DEFAULT_REPORT,
    state: '',
    review: '',
    delay: 2500,
    questionId: '',
    sourceUrl: '',
    allowAnswerChanges: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === '--write') args.write = true;
    else if (item === '--allow-answer-changes') args.allowAnswerChanges = true;
    else if (item === '--area') args.area = argv[++index] || '';
    else if (item === '--limit') args.limit = Number(argv[++index]);
    else if (item === '--delay') args.delay = Number(argv[++index]);
    else if (item === '--report') args.report = path.resolve(ROOT, argv[++index] || '');
    else if (item === '--state') args.state = path.resolve(ROOT, argv[++index] || '');
    else if (item === '--review') args.review = path.resolve(ROOT, argv[++index] || '');
    else if (item === '--question-id') args.questionId = argv[++index] || '';
    else if (item === '--source-url') args.sourceUrl = argv[++index] || '';
    else if (item === '--help' || item === '-h') args.help = true;
    else throw new Error(`Opção desconhecida: ${item}`);
  }
  if (!Number.isInteger(args.limit) || args.limit < 1) throw new Error('--limit deve ser um inteiro positivo.');
  if (!Number.isFinite(args.delay) || args.delay < 0) throw new Error('--delay deve ser zero ou positivo.');
  if (args.sourceUrl && !args.questionId) throw new Error('--source-url exige --question-id.');
  return args;
}

function printHelp() {
  console.log(`Uso:
  node scripts/enrich-anki-questions.js --area Hematologia --limit 5
  node scripts/enrich-anki-questions.js --area Hematologia --limit 5 --write
  node scripts/enrich-anki-questions.js --area Hematologia --limit 12 --write --state reports/question-enrichment/hematology-state.json
  node scripts/enrich-anki-questions.js --question-id ID --source-url URL

Por padrão, apenas gera um relatório em tmp/question-enrichment-report.json.
--write acrescenta comentários e tags somente quando o gabarito local coincide.
--state faz os lotes retomarem do ponto anterior sem repetir buscas recentes.
--allow-answer-changes permite corrigir divergências verificadas (use com --write).`);
}

function readJson(file, fallback) {
  if (!file || !fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function writeJson(file, value) {
  if (!file) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function retryDelayDays(status, attempts) {
  if (status === 'answer_mismatch') return 365;
  if (status === 'low_confidence' || status === 'answer_missing') return 60;
  if (status === 'error') return Math.min(7, Math.max(1, attempts));
  return Math.min(30, 7 * Math.max(1, attempts));
}

function shouldAttempt(questionId, state, now = Date.now()) {
  const record = state.questions?.[questionId];
  if (!record?.nextAttemptAt) return true;
  return Date.parse(record.nextAttemptAt) <= now;
}

function updateAttemptState(state, question, result, now = new Date()) {
  state.questions = state.questions || {};
  const previous = state.questions[question.id] || {};
  const attempts = Number(previous.attempts || 0) + 1;
  const delayDays = retryDelayDays(result.status, attempts);
  state.questions[question.id] = {
    number: question.number,
    status: result.status,
    attempts,
    lastAttemptAt: now.toISOString(),
    nextAttemptAt: new Date(now.getTime() + delayDays * 86400000).toISOString(),
    sourceUrl: result.sourceUrl || null,
    localAnswer: result.localAnswer || null,
    remoteAnswer: result.remoteAnswer || null
  };
  state.updatedAt = now.toISOString();
}

function updateReview(review, question, result) {
  review.items = review.items || {};
  if (!['answer_mismatch', 'low_confidence', 'answer_missing'].includes(result.status)) return;
  review.items[question.id] = {
    id: question.id,
    number: question.number,
    status: result.status,
    localAnswer: result.localAnswer || null,
    remoteAnswer: result.remoteAnswer || null,
    sourceUrl: result.sourceUrl || null,
    similarity: result.similarity || result.bestSimilarity || null,
    tags: result.tags || [],
    suggestedComment: result.comment || '',
    reviewedAt: result.matchedAt || new Date().toISOString()
  };
  review.updatedAt = new Date().toISOString();
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function stripHtml(value) {
  return decodeHtml(String(value || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function normalize(value) {
  return stripHtml(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokenSimilarity(left, right) {
  const a = new Set(normalize(left).split(' ').filter(Boolean));
  const b = new Set(normalize(right).split(' ').filter(Boolean));
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return (2 * intersection) / (a.size + b.size);
}

function compareQuestion(local, remote) {
  const remoteStem = remote.statement_text || remote.statement || '';
  const stem = tokenSimilarity(local.stem, remoteStem);
  const letters = Object.keys(local.options || {});
  const optionScores = letters.map((letter, index) => {
    const candidate = remote.alternatives?.[index]?.body || '';
    return tokenSimilarity(local.options[letter], candidate);
  });
  const options = optionScores.length
    ? optionScores.reduce((sum, score) => sum + score, 0) / optionScores.length
    : 0;
  return { stem, options, combined: (stem * 0.7) + (options * 0.3) };
}

function searchExcerpt(stem, limit = 12) {
  const words = stripHtml(stem).split(/\s+/).filter(Boolean);
  return words.slice(0, limit).join(' ');
}

function extractStrategyUrls(html) {
  const decoded = decodeHtml(html);
  const found = [];
  for (const match of decoded.matchAll(/[?&]uddg=([^&"']+)/g)) {
    try { found.push(decodeURIComponent(match[1])); } catch { /* ignora URL inválida */ }
  }
  for (const match of decoded.matchAll(/https:\/\/med\.estrategia\.com\/public\/questoes\/[A-Za-z0-9%._~!$&'()*+,;=:@\/-]+/g)) {
    found.push(match[0]);
  }
  for (const match of decoded.matchAll(/https%3A%2F%2Fmed(?:\.|%2E)estrategia(?:\.|%2E)com%2Fpublic%2Fquestoes%2F[^"'<>\s&]+/gi)) {
    try { found.push(decodeURIComponent(match[0])); } catch { /* ignora URL inválida */ }
  }
  return [...new Set(found
    .map(url => url.replace(/[?#].*$/, ''))
    .filter(url => /^https:\/\/med\.estrategia\.com\/public\/questoes\/[^/]+\/?$/i.test(url))
    .map(url => url.endsWith('/') ? url : `${url}/`))];
}

async function fetchText(url, options = {}, attempts = 3) {
  const { timeoutMs = 20000, ...fetchOptions } = options;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: { 'user-agent': USER_AGENT, 'accept-language': 'pt-BR,pt;q=0.9', ...(fetchOptions.headers || {}) },
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(error.status === 429 ? attempt * 3000 : attempt * 700);
    }
  }
  throw lastError;
}

async function discoverCandidates(stem) {
  const exactExcerpt = searchExcerpt(stem, 12);
  const shortExcerpt = searchExcerpt(stem, 8);
  const urls = [];
  for (const query of [`"${exactExcerpt}"`, `"${shortExcerpt}"`, exactExcerpt]) {
    try {
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const html = await fetchText(searchUrl, { timeoutMs: 7000 }, 1);
      urls.push(...extractStrategyUrls(html));
    } catch {
      // Se o buscador limitar as consultas, tenta a fonte alternativa abaixo.
    }
    if (urls.length) break;
  }
  if (!urls.length) {
    try {
      const searchUrl = `https://search.brave.com/search?q=${encodeURIComponent(exactExcerpt)}&source=web`;
      urls.push(...extractStrategyUrls(await fetchText(searchUrl, { timeoutMs: 7000 }, 1)));
    } catch {
      return [];
    }
  }
  return [...new Set(urls)].slice(0, 5);
}

function parseNuxtQuestion(html) {
  const match = html.match(/<script>window\.__NUXT__=([\s\S]*?)<\/script>/i);
  if (!match) throw new Error('Dados públicos da questão não encontrados.');
  const sandbox = { window: {} };
  vm.runInNewContext(`window.__NUXT__=${match[1]}`, sandbox, { timeout: 1000 });
  const entries = Object.values(sandbox.window.__NUXT__?.fetch || {});
  const entry = entries.find(item => item && item.question);
  if (!entry?.question) throw new Error('Questão ausente nos dados públicos.');
  return entry.question;
}

function correctAnswer(remote) {
  const index = (remote.alternatives || []).findIndex(option => option.correct === true);
  return index >= 0 ? String.fromCharCode(65 + index) : '';
}

function sourceTags(remote) {
  const tags = [];
  for (const topic of remote.topics || []) {
    const segments = String(topic.path || topic.name || '').split('[$$]');
    for (const segment of segments) {
      const clean = stripHtml(segment);
      if (clean && !tags.some(tag => normalize(tag) === normalize(clean))) tags.push(clean);
    }
  }
  return tags;
}

function conciseComment(remote, answer, tags) {
  const index = answer.charCodeAt(0) - 65;
  const option = stripHtml(remote.alternatives?.[index]?.body || '');
  const subject = tags.at(-1) || tags.at(-2) || 'tema da questão';
  return `Gabarito confirmado: ${answer}. Assunto: ${subject}. Conduta/resposta: ${option}`.trim();
}

function mergeTags(localTags, remoteTags) {
  const merged = [...(localTags || [])];
  for (const tag of [...remoteTags, SOURCE_LABEL]) {
    if (!merged.some(existing => normalize(existing) === normalize(tag))) merged.push(tag);
  }
  return merged;
}

function applyEnrichment(question, result, allowAnswerChanges) {
  if (result.answerMismatch && !allowAnswerChanges) return false;
  question.answer = result.remoteAnswer;
  if (!String(question.comment || '').trim()) question.comment = result.comment;
  question.tags = mergeTags(question.tags, result.tags);
  question.enrichment = {
    source: SOURCE_LABEL,
    sourceUrl: result.sourceUrl,
    sourceQuestionId: result.sourceQuestionId,
    matchedAt: result.matchedAt,
    confidence: result.similarity.combined
  };
  return true;
}

function questionFiles(area) {
  const needle = normalize(area);
  return fs.readdirSync(QUESTION_BANK)
    .filter(name => name.endsWith('.json') && !name.endsWith('.import-report.json'))
    .map(name => path.join(QUESTION_BANK, name))
    .filter(file => !needle || normalize(path.basename(file)).includes(needle));
}

function loadScriptData(jsonFile) {
  const scriptFile = jsonFile.replace(/\.json$/i, '.js');
  if (!fs.existsSync(scriptFile)) return { scriptFile, data: null };
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(scriptFile, 'utf8'), sandbox, { timeout: 2000 });
  const banks = Object.values(sandbox.window.ENAMED_LOCAL_QUESTION_BANK || {});
  return { scriptFile, data: banks[0] || null };
}

function writeScriptData(scriptFile, data) {
  const block = JSON.stringify(data.block);
  const payload = JSON.stringify(data);
  fs.writeFileSync(
    scriptFile,
    `window.ENAMED_LOCAL_QUESTION_BANK=window.ENAMED_LOCAL_QUESTION_BANK||{};window.ENAMED_LOCAL_QUESTION_BANK[${block}]=${payload};\n`,
    'utf8'
  );
}

function loadTargets(args, state = { questions: {} }) {
  const targets = [];
  for (const file of questionFiles(args.area)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const mirror = loadScriptData(file);
    const mirrorById = new Map((mirror.data?.questions || []).map(question => [question.id, question]));
    for (const question of data.questions || []) {
      if (args.questionId && question.id !== args.questionId) continue;
      if (!args.questionId && !shouldAttempt(question.id, state)) continue;
      const mirrorQuestion = mirrorById.get(question.id) || null;
      if (String(mirrorQuestion?.comment || '').trim().length > String(question.comment || '').trim().length) {
        question.comment = mirrorQuestion.comment;
      }
      const jsonEnriched = question.enrichment?.source === SOURCE_LABEL;
      const mirrorEnriched = mirrorQuestion?.enrichment?.source === SOURCE_LABEL;
      if (!args.questionId && jsonEnriched && (!mirrorQuestion || mirrorEnriched)) continue;
      targets.push({ file, data, question, scriptFile: mirror.scriptFile, scriptData: mirror.data, mirrorQuestion });
      if (targets.length >= args.limit) return targets;
    }
  }
  return targets;
}

async function enrichTarget(target, sourceUrl = '') {
  const candidates = sourceUrl ? [sourceUrl] : await discoverCandidates(target.question.stem);
  if (!candidates.length) return { status: 'not_found', candidates: [] };
  let best = null;
  for (const url of candidates) {
    try {
      const remote = parseNuxtQuestion(await fetchText(url));
      const similarity = compareQuestion(target.question, remote);
      if (!best || similarity.combined > best.similarity.combined) best = { url, remote, similarity };
    } catch (error) {
      // Um resultado defeituoso não impede a análise dos demais candidatos.
    }
  }
  if (!best || best.similarity.stem < 0.86 || best.similarity.options < 0.72 || best.similarity.combined < 0.84) {
    return { status: 'low_confidence', candidates, bestSimilarity: best?.similarity || null };
  }
  const remoteAnswer = correctAnswer(best.remote);
  if (!remoteAnswer) return { status: 'answer_missing', candidates, sourceUrl: best.url };
  const tags = sourceTags(best.remote);
  const localAnswer = String(target.question.answer || '').trim().toUpperCase();
  const answerMismatch = localAnswer !== remoteAnswer;
  return {
    status: answerMismatch ? 'answer_mismatch' : 'matched',
    sourceUrl: best.url,
    sourceQuestionId: String(best.remote.id || ''),
    matchedAt: new Date().toISOString(),
    similarity: best.similarity,
    localAnswer,
    remoteAnswer,
    answerMismatch,
    tags,
    comment: conciseComment(best.remote, remoteAnswer, tags),
    candidates
  };
}

function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return printHelp();
  if (!args.area && !args.questionId) throw new Error('Informe --area ou --question-id.');
  if (args.allowAnswerChanges && !args.write) throw new Error('--allow-answer-changes exige --write.');

  const state = readJson(args.state, { area: args.area || null, questions: {} });
  const reviewPath = args.review || (args.state ? DEFAULT_REVIEW : '');
  const review = readJson(reviewPath, { area: args.area || null, items: {} });
  const targets = loadTargets(args, state);
  const report = {
    generatedAt: new Date().toISOString(),
    area: args.area || null,
    mode: args.write ? 'write' : 'dry-run',
    allowAnswerChanges: args.allowAnswerChanges,
    inspected: targets.length,
    changed: 0,
    results: []
  };
  const dirtyFiles = new Set();

  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    process.stdout.write(`[${index + 1}/${targets.length}] ${target.question.number || target.question.id}… `);
    try {
      const result = await enrichTarget(target, args.sourceUrl);
      let changed = false;
      if (args.write && (result.status === 'matched' || (result.status === 'answer_mismatch' && args.allowAnswerChanges))) {
        changed = applyEnrichment(target.question, result, args.allowAnswerChanges);
        if (changed && target.mirrorQuestion) applyEnrichment(target.mirrorQuestion, result, args.allowAnswerChanges);
        if (changed) {
          dirtyFiles.add(target.file);
          report.changed += 1;
        }
      }
      report.results.push({
        id: target.question.id,
        number: target.question.number,
        file: path.relative(ROOT, target.file).replaceAll('\\', '/'),
        changed,
        ...result
      });
      if (args.state) updateAttemptState(state, target.question, result);
      if (reviewPath) updateReview(review, target.question, result);
      console.log(result.status);
    } catch (error) {
      report.results.push({
        id: target.question.id,
        number: target.question.number,
        file: path.relative(ROOT, target.file).replaceAll('\\', '/'),
        changed: false,
        status: 'error',
        error: error.message
      });
      if (args.state) updateAttemptState(state, target.question, { status: 'error' });
      console.log(`erro: ${error.message}`);
    }
    if (index + 1 < targets.length && args.delay) await sleep(args.delay);
  }

  if (args.write) {
    for (const file of dirtyFiles) {
      const target = targets.find(item => item.file === file);
      target.data.count = target.data.questions.length;
      fs.writeFileSync(file, `${JSON.stringify(target.data, null, 2)}\n`, 'utf8');
      if (target.scriptData) writeScriptData(target.scriptFile, target.scriptData);
    }
  }
  writeJson(args.report, report);
  if (args.state) writeJson(args.state, state);
  if (reviewPath) writeJson(reviewPath, review);
  console.log(`Relatório: ${path.relative(ROOT, args.report)}`);
  console.log(`Correspondências: ${report.results.filter(item => item.status === 'matched').length}; divergências: ${report.results.filter(item => item.status === 'answer_mismatch').length}; alteradas: ${report.changed}.`);
}

if (require.main === module) {
  main().catch(error => {
    console.error(`Erro: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  applyEnrichment,
  compareQuestion,
  conciseComment,
  extractStrategyUrls,
  mergeTags,
  normalize,
  parseNuxtQuestion,
  retryDelayDays,
  shouldAttempt,
  sourceTags,
  tokenSimilarity,
  updateAttemptState,
  updateReview
};
