'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const planner = fs.readFileSync(path.join(root, 'assets/planner.js'), 'utf8');

test('caso concluido informa em quantas das seis pistas houve o acerto', () => {
  assert.match(planner, /progress\.solvedAtHint = Math\.min\(TOTAL_CASO_HINTS/);
  assert.match(planner, /class="caso-hint-score"[^>]*>\(\$\{solvedAtHint\} de \$\{TOTAL_CASO_HINTS\}\)<\/strong>/);
  assert.match(planner, /aria-label="Acertou com \$\{solvedAtHint\} de \$\{TOTAL_CASO_HINTS\} pistas"/);
});

test('sincronizacao preserva a pista exata do acerto', () => {
  assert.match(planner, /const solvedAtHints = \[n\(r\.solvedAtHint\), n\(l\.solvedAtHint\)\]/);
  assert.match(planner, /solvedAtHint: solvedAtHints\.length \? Math\.min\(\.\.\.solvedAtHints\) : 0/);
});
