'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const planner = fs.readFileSync(path.join(root, 'assets/planner.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/planner.css'), 'utf8');

test('próxima melhor ação fica explícita e acessível', () => {
  assert.match(planner, /class="daily-prescription"/);
  assert.match(planner, /id="dailyRandomChoice"[^>]*type="button"/);
  assert.match(planner, /Próxima melhor ação/);
  assert.match(css, /\.daily-prescription \.daily-random-choice\{flex:0 0 auto;min-width:170px;justify-content:center\}/);
});

test('gamificação ocupa o espaço ao lado de continuar estudando no tablet', () => {
  assert.match(css, /@media\(min-width:768px\) and \(max-width:1199px\)\{[\s\S]*?#painel \.dashboard-desktop-grid>\.continue-study-card\{grid-column:1;grid-row:1\}/);
  assert.match(css, /@media\(min-width:768px\) and \(max-width:1199px\)\{[\s\S]*?#painel \.dashboard-desktop-grid>\.dashboard-gamification-popover\{grid-column:2;grid-row:1;min-height:0\}/);
});
