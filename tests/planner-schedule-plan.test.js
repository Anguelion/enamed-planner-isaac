'use strict';

// Testes do plano de retomada a partir de Coagulopatias (Bloco 11), que
// reagenda o cronograma a partir de 04/08/2026 contando os fins de semana, num
// ritmo sustentavel (nao um sprint) porque o ENAMED e em 13/09/2026 e o
// cronograma inteiro nao cabe ate a prova. Usa o mesmo sandbox de vm dos
// outros testes do planner.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadPlannerSandbox } = require('./planner-sandbox.js');

const plain = value => JSON.parse(JSON.stringify(value));
const RESTART = '2026-08-04';
const EXAM_DATE = '2026-09-13';
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

test('plano de retomada: o cronograma volta a andar em 04/08/2026 na aula de Coagulopatias', () => {
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

test('plano de retomada: ritmo sustentavel (2 aulas em dia util, 1 no fim de semana) e dias de simulado ficam livres', () => {
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

  // Sem o "modo ferias" de 3 aulas por dia: o ritmo agora e uniforme, porque
  // forcar mais nao cabe ate a prova sem queimar o Isaac antes dela.
  perDay.forEach((count, date) => {
    const limit = weekday(date) === 0 || weekday(date) === 6 ? 1 : 2;
    assert.ok(count <= limit, `${date} ficou com ${count} aulas (limite ${limit})`);
  });

  assert.equal(perDay.get('2026-08-04'), 2, 'dia util leva 2 aulas, mesmo logo na retomada');
  assert.equal(perDay.get('2026-08-09'), undefined, '09/08 e dia de simulado, sem aula nova');
  assert.equal(weekday('2026-08-08'), 6);
  assert.equal(perDay.get('2026-08-08'), 1, 'sabado leva 1 aula');

  assert.equal(state.reschedule.includeWeekends, true);
  assert.equal(state.reschedule.weekdaysOnly, false);
  assert.equal(state.reschedule.fromTopic, 'Coagulopatias');
  assert.equal(state.reschedule.restartDate, RESTART);
  assert.equal(state.reschedule.examDate, EXAM_DATE);
});

test('plano de retomada: o cronograma nao cabe ate a prova, e isso fica explicito no estado (sem forcar o ritmo)', () => {
  const ctx = loadPlannerSandbox();
  const { state, pending } = lessonsFrom(ctx);
  const untilExam = pending.filter(item => item.date < EXAM_DATE);
  const afterExam = pending.filter(item => item.date >= EXAM_DATE);

  assert.ok(untilExam.length < pending.length, 'no ritmo sustentavel, nao dá tempo de ver tudo antes da prova');
  assert.ok(afterExam.length > 0, 'o que sobra fica agendado depois da prova, em vez de desaparecer');
  assert.equal(state.reschedule.lessonsBeforeExam, untilExam.length);
  assert.equal(state.reschedule.lastBlockBeforeExam, untilExam.at(-1).block);

  // A contagem regressiva do painel aponta para a prova, nao para o fim do cronograma.
  assert.equal(state.dashboardSettings.countdownDate, EXAM_DATE);
});

test('plano de retomada: o ensaio (simulado) antes da prova cai antes de 13/09, nao depois', () => {
  const ctx = loadPlannerSandbox();
  const state = plain(ctx.__getState());
  const sims = [...state.simulados].sort((a, b) => a.date.localeCompare(b.date));
  const lastBeforeExam = [...sims].reverse().find(sim => sim.date < EXAM_DATE);
  const firstAfterExam = sims.find(sim => sim.date > EXAM_DATE);
  assert.ok(lastBeforeExam, 'precisa haver pelo menos um simulado antes da prova, para servir de ensaio final');
  assert.ok(firstAfterExam, 'os simulados de blocos que so terminam depois da prova continuam existindo, so que depois dela');
  // A cobertura de cada simulado antes da prova reflete o que de fato foi
  // estudado até aquela data (nao um recorte fixo herdado do plano antigo).
  sims.filter(sim => sim.date <= EXAM_DATE).forEach(sim => {
    assert.match(sim.coverage, /Blocos 1–\d+/, `${sim.name} precisa ter uma cobertura de blocos calculada`);
  });
});

test('plano de retomada: rodar de novo nao mexe nas datas nem perde a data original', () => {
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
  const VACATION_UNTIL = '2026-08-09';
  assert.equal(ctx.planWeekLabel('2026-08-04', VACATION_UNTIL), 'Férias.4');
  assert.equal(ctx.planWeekLabel('2026-08-10', VACATION_UNTIL), 'Aulas.5');
  assert.equal(ctx.planWeekLabel('2026-08-16', VACATION_UNTIL), 'Aulas.5');
  assert.equal(ctx.planWeekLabel('2026-08-17', VACATION_UNTIL), 'Aulas.6');
});
