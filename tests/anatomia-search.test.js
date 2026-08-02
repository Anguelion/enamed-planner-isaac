'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

require('../assets/anatomia.js');

const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'anatomia', 'catalog.json'), 'utf8'));
const searchIndex = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'anatomia', 'search-index.json'), 'utf8'));
const matchesSearch = globalThis.AnatomiaCourse.test.matchesSearch;

test('índice textual cobre todos os assuntos de Anatomia', () => {
  assert.equal(Object.keys(searchIndex).length, catalog.articles.length);
  for(const article of catalog.articles) assert.equal(typeof searchIndex[article.id], 'string');
});

test('busca encontra expressão presente apenas dentro do conteúdo do assunto', () => {
  const article = catalog.articles.find(item => item.id === 52265);
  assert.ok(article);
  assert.equal(article.title.toLowerCase().includes('fluxo sanguíneo insuficiente'), false);
  assert.equal(matchesSearch(article, searchIndex[article.id], 'fluxo sanguíneo insuficiente'), true);
});

test('busca ignora acentos e aceita termos separados', () => {
  const article = catalog.articles.find(item => item.id === 52265);
  assert.equal(matchesSearch(article, searchIndex[article.id], 'encefalo isquemia'), true);
});
