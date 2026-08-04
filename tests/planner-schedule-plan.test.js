'use strict';

// Testes do plano de recuperacao a partir de Coagulopatias (Bloco 11), que
// reagenda o cronograma a partir de 04/08/2026 contando os fins de semana.
// Usa o mesmo sandbox de vm dos outros testes do planner.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadPlannerSandbox } = require('./planner-sandbox.js');

const plain = value => JSON.parse(JSON.stringify(value));
const RESTART = '2026-08-04';
const VACATION_UNTIL = '2026-08-09';
const weekday = date => new Date(`${date}T12:00:00`).getDay();

function lessonsFrom(ctx) {
  const state = plain(ctx.__getState());
  const schedule = state.schedule;
  const byPlanOrder = (a, b) => (a.block || 0) - (b.block || 0)
    || (a.lessonOrder || 0) - (b.lessonOrder || 0)
    || (a.row || 0) - (b.row || 0)
    || String(a.date || '').localeCompare(String(b.date || ''));
  const fromBlock11 = schedule.filter(item => (item.block || 0) >= 11).sort(byPlanOrder);
  const startIndex = fromBlock11.findIndex(item => /coagulopatias/i.test(item.topic));
  return { state, schedule, fromBlock11, startIndex, pending: fromBlock11.slice(startIndex) };
}

test('plano de recuperacao: o cronograma volta a andar em 04/08/2026 na aula de Coagulopatias', () => {
  const ctx = loadPlannerSandbox();
  const { fromBlock11, startIndex, pending } = lessonsFrom(ctx);
  assert.ok(startIndex >= 0, 'a aula de Coagulopatias precisa existir no Bloco 11');
  assert.equal(pending[0].date, RESTART, 'Coagulopatias e a primeira aula do dia de retomada');
  assert.equal(pending.length, 133, 'todas as aulas de Coagulopatias em diante entram no plano');

  // O que veio antes de Coagulopatias ja foi estudado: continua nas datas antigas.
  fromBlock11.slice(0, startIndex).forEach(item => {
    assert.ok(item.date < RESTART, `${item.topic} nao deveria ter sido movida para depois da retomada`);
  });

  // Datas sempre crescentes e nenhuma aula antes do dia da retomada.
  pending.forEach((item, index) => {
    assert.ok(item.date >= RESTART, `${item.topic} caiu antes de ${RESTART}`);
    if(index > 0) assert.ok(item.date >= pending[index - 1].date, 'as aulas precisam ficar em ordem de data');
    assert.equal(item.day, ctx.weekdayName(item.date), 'o nome do dia precisa acompanhar a data');
  });
});

test('plano de recuperacao: fins de semana entram no ritmo e dias de simulado ficam livres', () => {
  const ctx = loadPlannerSandbox();
  const { state, pending } = lessonsFrom(ctx);

  const perDay = new Map();
  pending.forEach(item => perDay.set(item.date, (perDay.get(item.date) || 0) + 1));

  const saturdays = [...perDay.keys()].filter(date => weekday(date) === 6);
  const sundays = [...perDay.keys()].filter(date => weekday(date) === 0);
  assert.ok(saturdays.length >= 10, `o plano precisa usar os sabados (usou ${saturdays.length})`);
  assert.ok(sundays.length >= 5, `o plano precisa usar os domingos livres de simulado (usou ${sundays.length})`);

  const simuladoDates = new Set(state.simulados.map(sim => sim.date));
  simuladoDates.forEach(date => {
    assert.ok(!perDay.has(date), `o simulado de ${date} nao pode dividir o dia com aula nova`);
  });

  perDay.forEach((count, date) => {
    const limit = date <= VACATION_UNTIL ? 3 : (weekday(date) === 0 ? 1 : 2);
    assert.ok(count <= limit, `${date} ficou com ${count} aulas (limite ${limit})`);
  });

  // Ritmo de ferias ate 09/08, carga reduzida depois da volta as aulas.
  assert.equal(perDay.get('2026-08-04'), 3, 'nas ferias o dia leva 3 aulas');
  assert.equal(perDay.get('2026-08-10'), 2, 'com a faculdade de volta, o dia util leva 2 aulas');
  assert.equal(perDay.get('2026-08-16'), 1, 'domingo fica mais leve, com 1 aula');
  assert.equal(pending.at(-1).date, '2026-10-13', 'a ultima videoaula do plano cai em 13/10/2026');

  assert.equal(state.reschedule.includeWeekends, true);
  assert.equal(state.reschedule.weekdaysOnly, false);
  assert.equal(state.reschedule.fromTopic, 'Coagulopatias');
  assert.equal(state.reschedule.restartDate, RESTART);
});

test('plano de recuperacao: rodar de novo nao mexe nas datas nem perde a data original', () => {
  const ctx = loadPlannerSandbox();
  const before = lessonsFrom(ctx).pending.map(item => `${item.topic}@${item.date}`);
  ctx.ensureSchedulePlan();
  const after = lessonsFrom(ctx).pending;
  assert.deepEqual(after.map(item => `${item.topic}@${item.date}`), before, 'o plano e idempotente');
  after.forEach(item => {
    assert.ok(item.originalDate, `${item.topic} precisa guardar a data original do cronograma oficial`);
  });
});

test('planWeekLabel: os rotulos de semana continuam a contagem do plano anterior', () => {
  const ctx = loadPlannerSandbox();
  assert.equal(ctx.planWeekLabel('2026-08-04', VACATION_UNTIL), 'Férias.4');
  assert.equal(ctx.planWeekLabel('2026-08-10', VACATION_UNTIL), 'Aulas.5');
  assert.equal(ctx.planWeekLabel('2026-08-16', VACATION_UNTIL), 'Aulas.5');
  assert.equal(ctx.planWeekLabel('2026-08-17', VACATION_UNTIL), 'Aulas.6');
});
