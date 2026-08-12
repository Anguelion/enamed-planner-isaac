'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const planner = fs.readFileSync(path.join(root, 'assets/planner.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/planner.css'), 'utf8');

test('sorteio da trilha fica compacto e acessível', () => {
  assert.match(planner, /id="dailyRandomChoice"[^>]*title="Deixe-me escolher"[^>]*aria-label="Deixe-me escolher"/);
  assert.match(css, /\.daily-road-tools \.daily-random-choice\{width:36px;height:36px;min-height:36px;padding:0;border-radius:10px\}/);
  assert.match(css, /\.daily-road-tools \.daily-random-choice span\{display:none\}/);
});

test('gamificação ocupa o espaço ao lado de continuar estudando no tablet', () => {
  assert.match(css, /@media\(min-width:768px\) and \(max-width:1199px\)\{[\s\S]*?#painel \.dashboard-desktop-grid>\.continue-study-card\{grid-column:1;grid-row:1\}/);
  assert.match(css, /@media\(min-width:768px\) and \(max-width:1199px\)\{[\s\S]*?#painel \.dashboard-desktop-grid>\.dashboard-gamification-popover\{grid-column:2;grid-row:1;min-height:0\}/);
});
