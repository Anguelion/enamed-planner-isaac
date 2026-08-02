'use strict';

const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const anatomyRoot = path.join(projectRoot, 'assets', 'anatomia');
const catalogPath = path.join(anatomyRoot, 'catalog.json');
const outputPath = path.join(anatomyRoot, 'search-index.json');

function decodeEntities(value) {
  const named = { amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", nbsp:' ' };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code) => {
    if(code[0] === '#') {
      const hexadecimal = code[1]?.toLowerCase() === 'x';
      const number = Number.parseInt(code.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      return Number.isFinite(number) ? String.fromCodePoint(number) : entity;
    }
    return named[code.toLowerCase()] ?? ' ';
  });
}

function plainText(html) {
  return decodeEntities(String(html)
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const index = {};
for(const article of catalog.articles) {
  const contentPath = path.join(anatomyRoot, article.folder, 'content.html');
  index[article.id] = plainText(fs.readFileSync(contentPath, 'utf8'));
}

fs.writeFileSync(outputPath, `${JSON.stringify(index)}\n`);
console.log(`Índice de Anatomia gerado: ${Object.keys(index).length} assuntos.`);
