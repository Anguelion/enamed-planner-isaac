#!/usr/bin/env node
// Extract/rebuild helper for question_bank/*.comments.js files.
// Usage:
//   node scripts/comments-tools.js extract <path-to-comments.js> <out.json>
//   node scripts/comments-tools.js rebuild <path-to-comments.js> <in.json>
//   node scripts/comments-tools.js verify <path-to-comments.js>
'use strict';
const fs = require('fs');
const path = require('path');

function loadCommentsModule(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const m = src.match(/window\.ENAMED_LOCAL_QUESTION_COMMENTS\[("(?:[^"\\]|\\.)*")\]\s*=\s*(\{[\s\S]*\});?\s*$/);
  if (!m) throw new Error('Could not locate comments object literal in ' + filePath);
  const key = JSON.parse(m[1]);
  const objLiteral = m[2].replace(/;\s*$/, '');
  const obj = Function('"use strict"; return (' + objLiteral + ');')();
  return { key, obj };
}

function extract(filePath, outPath) {
  const { key, obj } = loadCommentsModule(filePath);
  fs.writeFileSync(outPath, JSON.stringify({ __key: key, entries: obj }, null, 2), 'utf8');
  console.log(`Extracted ${Object.keys(obj).length} entries -> ${outPath}`);
}

function rebuild(filePath, inPath) {
  const data = JSON.parse(fs.readFileSync(inPath, 'utf8'));
  const key = data.__key;
  const entries = data.entries;
  const body = JSON.stringify(entries);
  const out = `window.ENAMED_LOCAL_QUESTION_COMMENTS=window.ENAMED_LOCAL_QUESTION_COMMENTS||{};window.ENAMED_LOCAL_QUESTION_COMMENTS[${JSON.stringify(key)}]=${body};\n`;
  fs.writeFileSync(filePath, out, 'utf8');
  console.log(`Rebuilt ${Object.keys(entries).length} entries -> ${filePath}`);
}

function verify(filePath) {
  const { key, obj } = loadCommentsModule(filePath);
  console.log(`${filePath}: key=${key} entries=${Object.keys(obj).length}`);
}

const [, , cmd, a, b] = process.argv;
if (cmd === 'extract') extract(a, b);
else if (cmd === 'rebuild') rebuild(a, b);
else if (cmd === 'verify') verify(a);
else {
  console.error('Usage: extract|rebuild|verify <comments.js> [json]');
  process.exit(1);
}
