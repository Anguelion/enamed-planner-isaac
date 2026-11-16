'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadPlannerSandbox } = require('./planner-sandbox');

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

test('quadro de casos inclui apenas publicados sem desfecho e prioriza os iniciados', async () => {
  const ctx = loadPlannerSandbox();
  ctx.fetch=async()=>({ok:true,json:async()=>[1,2,3,4,5].map(number=>({number}))});
  vm.runInContext(fs.readFileSync(path.join(root,'assets/caso-do-dia.js'),'utf8'),ctx);
  await ctx.window.CasoDoDia.load();
  const state = ctx.__getState();
  state.casoDoDia = {
    'caso-1':{solved:true},
    'caso-2':{revealed:3},
    'caso-3':{gaveUp:true},
    'caso-4':{revealed:1}
  };
  assert.equal(ctx.window.CasoDoDia.todayCase('2026-08-01').number,4);
  assert.deepEqual(Array.from(ctx.pendingDashboardCases('2026-08-01'),item=>[item.number,item.started]),[[2,true],[4,false]]);
  const board = ctx.renderDashboardPendingBoard('2026-08-01');
  assert.match(board,/<details[^>]+id="dashboardPendingBoard"[^>]*>/);
  assert.match(board,/data-open-pending-case="2"/);
  assert.doesNotMatch(board,/data-open-pending-case="[135]"/);
});
