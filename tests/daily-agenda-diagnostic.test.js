'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {loadPlannerSandbox} = require('./planner-sandbox');

test('tempo realizado soma apenas a parcela do cronômetro que ainda não foi gravada', () => {
  const ctx = loadPlannerSandbox();
  const date = ctx.studyDateKey();
  const log = ctx.getDayLog(date);
  Object.assign(log,{lessonMinutes:7,questionMinutes:0,flashcardMinutes:0,materialMinutes:0,simuladoMinutes:0});
  ctx.__setStudyTimeTracker({kind:'video',elapsedSeconds:600,committedSeconds:420});
  assert.equal(ctx.dailyStudySnapshot(date).totalMinutes,10);
});

test('pauta mantém os minutos originais de prática quando o vídeo é concluído', () => {
  const ctx = loadPlannerSandbox();
  ctx.__setOfficialSchedule(require('../official_schedule.json').items);
  ctx.__setVideoCatalog(require('../video_library/catalog.json').lessons);
  ctx.normalizeSyncedPlannerState();
  const date='2026-11-16';
  const [{item,slot}] = ctx.plannedStudyEntries(date);
  assert.equal(ctx.dailyStudyAction(date).type,'video');
  ctx.__getState().videoPlayer.watched[slot.videoId]=true;
  ctx.getDayLog(date).lessonMinutes=56;
  assert.equal(ctx.dailyStudyTargets(date).remaining,64);
  assert.equal(ctx.dailyStudyAction(date).type,'questions');
  assert.match(ctx.renderStudyPlanDay(date),/56 min de conteúdo · 49 min de questões e flashcards da aula/);
  ctx.__getUi().shortStudySession={date,target:81};
  const short = ctx.dailyStudyAction(date);
  assert.equal(short.type,'previous');
  assert.equal(short.minutes,25);
  assert.equal(item.topic,'Medidas de Associação');
});

test('diagnóstico exclui itens respondidos ou repetidos e cobre Saúde Mental e Saúde Coletiva', () => {
  const ctx = loadPlannerSandbox();
  const question = (id,area,stem) => ({id,area,stem,source:'Banco de teste',options:{A:'A1',B:'B1'},answer:'A',comment:'Comentário suficiente para o diagnóstico com correção.'});
  const source = [
    question('seen','Clínica Médica','Enunciado já resolvido'),
    question('same-stem','Clínica Médica','Enunciado já resolvido!'),
    question('other-seen','Pediatria','Questão já vista em outro simulado'),
    question('mental','Saúde Mental','Questão nova de saúde mental'),
    question('public','Saúde Coletiva','Questão nova de saúde coletiva'),
    question('clinical','Clínica Médica','Questão nova de clínica médica')
  ];
  ctx.__setQuestionBank(source);
  const state = ctx.__getState();
  state.questionProgress={seen:{answeredAt:'2026-11-15T12:00:00Z',correct:true}};
  state.simuladoRuns=[{answers:{'other-seen':'A'}}];
  const selected=ctx.buildDiagnosticSimulado(12);
  assert.deepEqual(Array.from(selected,q=>q.id).sort(),['clinical','mental','public']);
  const result=ctx.simuladoResult({sourceType:'generated',questionIds:Array.from(selected,q=>q.id),answers:{mental:'A'}});
  assert.equal(result.byArea.find(area=>area.area==='Saúde Mental').correct,1);
  assert.equal(result.byArea.find(area=>area.area==='Saúde Coletiva').total,1);
});

test('cartão-resposta do Inep corrige só itens válidos e mantém o número original', () => {
  const ctx = loadPlannerSandbox();
  const exam = structuredClone(require('../imported_simulados/enamed-2025-inep-caderno-01.json'));
  exam.questions.forEach(q=>{q.answerSheetOnly=true;q.sourceType='imported';q.importedSimId=exam.id;});
  ctx.exam = exam;
  vm.runInContext('importedSimulados=[exam];',ctx);
  const run={sourceType:'imported',importedSimId:exam.id,questionIds:exam.questions.map(q=>q.id),answers:{[exam.questions[0].id]:'A',[exam.questions[1].id]:'B'}};
  const result=ctx.simuladoResult(run);
  assert.equal(result.total,90);
  assert.equal(result.correct,1);
  assert.equal(result.skipped.length,89);
  assert.match(ctx.renderSimuladoResult(run,exam.questions),/10 itens fora da pontuação/);
  assert.match(ctx.renderSimuladoExam(run,exam.questions,exam.questions[0]),/Abrir PDF na página da questão/);
});
