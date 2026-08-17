const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', 'health-news', 'data', 'latest.json');
const issue = JSON.parse(fs.readFileSync(file, 'utf8'));
const required = ['id', 'title', 'publishedAt', 'generatedAt', 'readingMinutes', 'sourceUrl', 'lead', 'stories', 'quickTakes', 'innovations', 'protocolUpdates', 'dailyQuiz'];

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
  const deepDiveFields = ['whatHappened', 'howItWorks', 'clinicalMeaning', 'limitations', 'examFocus'];
  for (const field of deepDiveFields) if (!story.deepDive?.[field]) throw new Error(`Notícia ${story.id} sem aprofundamento ${field}.`);
  if (!Array.isArray(story.deepDive.examFocus) || story.deepDive.examFocus.length < 3) throw new Error(`Notícia ${story.id} precisa de ao menos três pontos de prova.`);
}

for (const [collection, fields] of [
  [issue.innovations, ['id', 'icon', 'stage', 'title', 'summary', 'impact', 'sourceUrl']],
  [issue.protocolUpdates, ['id', 'date', 'status', 'tone', 'type', 'title', 'summary', 'sourceUrl']],
]) {
  if (!Array.isArray(collection) || collection.length < 1) throw new Error('Canal complementar sem itens.');
  for (const item of collection) {
    for (const field of fields) if (!item[field]) throw new Error(`Item ${item.id || 'sem id'} sem ${field}.`);
    if (!item.sourceUrl.startsWith('https://')) throw new Error(`Fonte inválida em ${item.id}.`);
  }
}

if (!Array.isArray(issue.dailyQuiz) || issue.dailyQuiz.length !== 5) {
  throw new Error('A edição precisa ter exatamente cinco questões no quiz diário.');
}
for (const question of issue.dailyQuiz) {
  for (const field of ['id', 'question', 'options', 'explanation']) if (!question[field]) throw new Error(`Questão ${question.id || 'sem id'} sem ${field}.`);
  if (!Array.isArray(question.options) || question.options.length !== 4) throw new Error(`Questão ${question.id} precisa de quatro alternativas.`);
  if (!Number.isInteger(question.answerIndex) || question.answerIndex < 0 || question.answerIndex >= question.options.length) throw new Error(`Gabarito inválido em ${question.id}.`);
}

console.log(`Radar Saúde válido: ${issue.id}, ${issue.stories.length} análises.`);
