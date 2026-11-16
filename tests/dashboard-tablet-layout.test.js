'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const planner = fs.readFileSync(path.join(root, 'assets/planner.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/planner.css'), 'utf8');

test('a pauta de hoje e a trilha do cabeçalho usam a mesma ação e o mesmo orçamento', () => {
  assert.match(planner, /class="daily-budget"/);
  assert.match(planner, /id="dailyRandomChoice"[^>]*type="button"/);
  assert.match(planner, /renderDailyStudyBudget\(date,\{compact:true\}\)/);
  assert.match(css, /#painel \.dashboard-desktop-grid>\.study-plan-day\{grid-column:1\/-1;grid-row:1\}/);
});

test('gamificação ocupa o espaço ao lado de continuar estudando no tablet', () => {
  assert.match(css, /@media\(min-width:768px\) and \(max-width:1199px\)\{[\s\S]*?#painel \.dashboard-desktop-grid>\.continue-study-card\{grid-column:1;grid-row:2\}/);
  assert.match(css, /@media\(min-width:768px\) and \(max-width:1199px\)\{[\s\S]*?#painel \.dashboard-desktop-grid>\.dashboard-gamification-popover\{grid-column:2;grid-row:2;min-height:0\}/);
});
