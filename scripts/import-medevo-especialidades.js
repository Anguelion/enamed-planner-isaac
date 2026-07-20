// One-off importer: converts the offline Medevo "Especialidades" article export
// (D:\Estudo\MedwayPlaywright\Medevo Offline) into the planner's materials_library
// format so it can be read through the existing Apostila reader/highlighter.
'use strict';
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = process.argv[2] || 'D:\\Estudo\\MedwayPlaywright\\Medevo Offline';
const REPO_ROOT = path.join(__dirname, '..');
const TARGET_LIB_DIR = path.join(REPO_ROOT, 'materials_library');
const INDEX_OUT = path.join(TARGET_LIB_DIR, 'especialidades-index.json');

const DIACRITICS_RE = new RegExp('[̀-ͯ]', 'g');
function normalizedTopic(value) {
  return String(value || '').normalize('NFD').replace(DIACRITICS_RE, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function slugify(value) {
  return normalizedTopic(value).replace(/\s+/g, '-').replace(/^-+|-+$/g, '') || 'artigo';
}
function decodeEntities(text) {
  return String(text || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}
function stripAttrsKeepInline(html) {
  // links first (need href before generic strip)
  let out = String(html || '')
    .replace(/<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (m, href, inner) => `[${inner}](${href})`)
    .replace(/<mark\b[^>]*>([\s\S]*?)<\/mark>/gi, '==$1==')
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/(strong|b)>/gi, '**$2**')
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/(em|i)>/gi, '*$2*')
    .replace(/<br\s*\/?>/gi, '\n');
  out = out.replace(/<[^>]+>/g, '');
  out = decodeEntities(out);
  return out.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, ' ').trim();
}
function cellText(html) {
  return stripAttrsKeepInline(html).replace(/\|/g, '/');
}
function extractAttr(tag, name) {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i'));
  return m ? m[1] : '';
}

function convertTable(tableHtml) {
  const rows = [...tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m => {
    return [...m[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(c => cellText(c[1]));
  }).filter(row => row.length);
  if (!rows.length) return '';
  const width = Math.max(...rows.map(r => r.length));
  const pad = row => { const r = [...row]; while (r.length < width) r.push(''); return r; };
  const header = pad(rows[0]);
  const body = rows.slice(1).map(pad);
  const lines = [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...body.map(r => `| ${r.join(' | ')} |`)
  ];
  return `\n\n${lines.join('\n')}\n\n`;
}
function convertFigure(figureHtml) {
  const imgTag = figureHtml.match(/<img\b[^>]*>/i)?.[0] || '';
  const src = extractAttr(imgTag, 'src');
  if (!src) return '';
  const figcaption = figureHtml.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i);
  const alt = figcaption ? stripAttrsKeepInline(figcaption[1]) : extractAttr(imgTag, 'alt');
  const caption = (alt || 'Figura do material').replace(/[[\]]/g, '').replace(/\(/g, '（').replace(/\)/g, '）');
  return `\n\n![${caption}](${src})\n\n`;
}

function htmlToMarkdown(mainHtml) {
  let html = mainHtml
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<div class="offline-source"[\s\S]*?<\/div>/gi, '')
    // drop decorative empty dividers
    .replace(/<div class="h[1-4]-decoration[^"]*"[^>]*><\/div>/gi, '');

  // remove the leading <h1> (title is already the doc title / markdown # heading)
  html = html.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i, '');

  const placeholders = [];
  const stash = markdown => { placeholders.push(markdown); return `\n\n@@BLOCK_${placeholders.length - 1}@@\n\n`; };

  html = html.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, m => stash(convertTable(m)));
  html = html.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, m => stash(convertFigure(m)));
  html = html.replace(/<img\b[^>]*>/gi, m => {
    const src = extractAttr(m, 'src');
    if (!src) return '';
    return stash(`\n\n![${extractAttr(m, 'alt') || 'Figura do material'}](${src})\n\n`);
  });

  html = html
    .replace(/<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (m, href, inner) => `[${stripAttrsKeepInline(inner)}](${href})`)
    .replace(/<mark\b[^>]*>([\s\S]*?)<\/mark>/gi, '==$1==')
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**')
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*')
    .replace(/<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (m, level, inner) => `\n\n${'#'.repeat(Number(level))} ${stripAttrsKeepInline(inner)}\n\n`)
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<\/li>/gi, '')
    .replace(/<\/?(ul|ol)\b[^>]*>/gi, '\n')
    .replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (m, inner) => `\n\n> ${stripAttrsKeepInline(inner)}\n\n`)
    .replace(/<hr\s*\/?>/gi, '\n\n---\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p\b[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '');

  html = decodeEntities(html);
  html = html.replace(/@@BLOCK_(\d+)@@/g, (m, i) => placeholders[Number(i)]);
  return html
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n';
}

function extractHeadings(markdown) {
  return [...markdown.matchAll(/^(#{2,3})\s+(.+)$/gm)].slice(0, 30).map(m => ({ text: m[2].trim() }));
}
function buildSearchText(title, area, subarea, markdown) {
  const plain = markdown.replace(/[#>*=`_-]/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ');
  return normalizedTopic(`${title} ${title} ${area} ${subarea} ${plain}`);
}
function countImages(markdown) {
  return (markdown.match(/!\[[^\]]*\]\([^)]+\)/g) || []).length;
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function main() {
  const manifestPath = path.join(SOURCE_DIR, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const entries = manifest.filter(e => e.status === 'success' && e.htmlRelativePath);
  console.log(`Found ${entries.length} articles in manifest.`);

  const usedIds = new Set();
  const documents = [];
  let converted = 0, skipped = 0;

  for (const entry of entries) {
    const htmlPath = path.join(SOURCE_DIR, entry.htmlRelativePath);
    if (!fs.existsSync(htmlPath)) { skipped += 1; continue; }
    const raw = fs.readFileSync(htmlPath, 'utf8');
    const mainMatch = raw.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
    const bodyMatch = raw.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
    const contentHtml = mainMatch ? mainMatch[1] : (bodyMatch ? bodyMatch[1] : raw);

    const title = entry.title || entry.mappedTitle || 'Artigo';
    let markdown = `# ${title}\n\n${htmlToMarkdown(contentHtml)}`;

    let id = `esp-${slugify(title).slice(0, 60)}-${(entry.uuid || '').slice(0, 8)}`;
    if (!id.slice(-8).match(/[0-9a-f]{8}/i)) id = `esp-${slugify(title).slice(0, 60)}-${converted}`;
    while (usedIds.has(id)) id += 'x';
    usedIds.add(id);

    const targetDir = path.join(TARGET_LIB_DIR, id);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'content.md'), markdown, 'utf8');

    const sourceTopicDir = path.join(SOURCE_DIR, entry.relativeDirectory);
    copyDir(path.join(sourceTopicDir, 'assets'), path.join(targetDir, 'assets'));

    documents.push({
      id,
      title,
      scheduleId: '',
      topic: entry.subspecialty || 'Outros',
      block: 0,
      area: entry.specialty || 'Especialidades',
      category: 'especialidade',
      headings: extractHeadings(markdown),
      markdown: `${id}/content.md`,
      imageCount: countImages(markdown),
      figures: [],
      pages: [],
      searchText: buildSearchText(title, entry.specialty, entry.subspecialty, markdown),
      sourceHash: entry.uuid || ''
    });
    converted += 1;
  }

  fs.mkdirSync(TARGET_LIB_DIR, { recursive: true });
  fs.writeFileSync(INDEX_OUT, JSON.stringify({ generatedAt: new Date().toISOString(), count: documents.length, documents }, null, 0), 'utf8');
  console.log(`Converted ${converted} articles, skipped ${skipped}.`);
  console.log(`Wrote ${INDEX_OUT}`);
}

main();
