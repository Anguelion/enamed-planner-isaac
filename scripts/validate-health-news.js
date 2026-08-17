const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', 'health-news', 'data', 'latest.json');
const issue = JSON.parse(fs.readFileSync(file, 'utf8'));
const required = ['id', 'title', 'publishedAt', 'generatedAt', 'readingMinutes', 'sourceUrl', 'lead', 'stories', 'quickTakes'];

for (const field of required) {
  if (issue[field] === undefined || issue[field] === null || issue[field] === '') {
    throw new Error(`Campo obrigatório ausente: ${field}`);
  }
}

if (!/^https:\/\/health\.thenews\.com\.br\/p\//.test(issue.sourceUrl)) {
  throw new Error('sourceUrl deve apontar para uma edição do the news health.');
}

if (!Array.isArray(issue.stories) || issue.stories.length < 1) {
  throw new Error('A edição precisa ter ao menos uma análise.');
}

for (const story of issue.stories) {
  for (const field of ['id', 'category', 'title', 'summary', 'clinicalNote', 'evidence', 'sourceUrl']) {
    if (!story[field]) throw new Error(`Notícia ${story.id || 'sem id'} sem ${field}.`);
  }
  if (!story.sourceUrl.startsWith('https://')) throw new Error(`Fonte inválida em ${story.id}.`);
}

console.log(`Radar Saúde válido: ${issue.id}, ${issue.stories.length} análises.`);
