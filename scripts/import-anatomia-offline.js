'use strict';

const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const sourceRoot = path.resolve(process.argv[2] || 'C:\\Anatomiaoffline\\output');
const destinationRoot = path.join(projectRoot, 'assets', 'anatomia');

function assertDirectory(target, label) {
  if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
    throw new Error(`${label} não encontrado: ${target}`);
  }
}

function normalizedSection(memberships = []) {
  const names = memberships.map(item => item?.section).filter(Boolean);
  if (names.includes('Patologia')) return 'Patologia';
  return names[0] || 'Outros';
}

assertDirectory(sourceRoot, 'Acervo de anatomia');
assertDirectory(path.join(sourceRoot, 'articles'), 'Pasta de artigos');
assertDirectory(path.join(sourceRoot, 'media'), 'Pasta de imagens');

const sourceIndex = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'articles-index.json'), 'utf8'));
const catalog = sourceIndex.map(item => {
  const articleJsonPath = path.join(sourceRoot, item.folder, 'article.json');
  const article = JSON.parse(fs.readFileSync(articleJsonPath, 'utf8'));
  const cover = (article.media || []).find(media => media.type === 'image' && media.localFile);
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    section: normalizedSection(article.memberships),
    memberships: article.memberships || [],
    folder: item.folder.replace(/\\/g, '/'),
    cover: cover ? cover.localFile.replace(/\\/g, '/') : '',
    imageCount: (article.media || []).filter(media => media.type === 'image').length,
    readingMinutes: Math.max(2, Math.ceil(Number(article.stats?.editorialChars || 0) / 900)),
    originalUrl: article.originalUrl || '',
    modified: article.modified || ''
  };
}).sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));

fs.mkdirSync(destinationRoot, { recursive: true });
fs.cpSync(path.join(sourceRoot, 'media'), path.join(destinationRoot, 'media'), { recursive: true, force: true });

for (const article of catalog) {
  const source = path.join(sourceRoot, article.folder, 'content.html');
  const destination = path.join(destinationRoot, article.folder, 'content.html');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

const summary = {
  generatedAt: new Date().toISOString(),
  source: sourceRoot,
  articleCount: catalog.length,
  imageCount: catalog.reduce((total, item) => total + item.imageCount, 0),
  sections: [...new Set(catalog.map(item => item.section))]
};

fs.writeFileSync(path.join(destinationRoot, 'catalog.json'), `${JSON.stringify({ summary, articles: catalog }, null, 2)}\n`);
console.log(`Anatomia importada: ${summary.articleCount} páginas e ${summary.imageCount} referências de imagem.`);
