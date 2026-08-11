'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const planner = fs.readFileSync(path.join(root, 'assets/planner.js'), 'utf8');

test('caso concluido informa em quantas das seis pistas houve o acerto', () => {
  assert.match(planner, /class="caso-hint-score"[^>]*>\(\$\{revealed\} de \$\{TOTAL_CASO_HINTS\}\)<\/strong>/);
  assert.match(planner, /aria-label="Acertou com \$\{revealed\} de \$\{TOTAL_CASO_HINTS\} pistas"/);
});
