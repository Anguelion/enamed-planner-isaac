'use strict';

// Testes executaveis (nao apenas checagem estatica de texto) para as
// correcoes feitas em assets/planner.js nesta sessao. planner.js nao e
// modular, entao carregamos o arquivo real num sandbox de vm minimo
// (tests/planner-sandbox.js) e chamamos as funcoes de producao diretamente.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadPlannerSandbox } = require('./planner-sandbox.js');

// Objetos criados dentro do sandbox de vm pertencem a um "realm" diferente do
// deste arquivo de teste: `Array`/`Object` do sandbox nao sao literalmente os
// mesmos construtores do processo Node, entao assert.deepStrictEqual falha por
// identidade de protótipo mesmo quando os valores sao estruturalmente iguais.
// Normalizamos via JSON (o mesmo caminho que os dados percorrem de verdade ao
// ir para localStorage/Supabase) antes de comparar.
const plain = value => JSON.parse(JSON.stringify(value));

test('merge de simuladoRuns: uniao por id, vence o updatedAt mais recente de qualquer lado', () => {
  const ctx = loadPlannerSandbox();
  const remote = {
    simuladoRuns: [
      { id: 'r1', updatedAt: '2026-01-01T00:00:00.000Z', foo: 'remoto-antigo' },
      { id: 'r3', updatedAt: '2026-03-01T00:00:00.000Z', foo: 'remoto-mais-novo' }
    ],
    simulados: [{ id: 's1', total: 10 }]
  };
  const local = {
    simuladoRuns: [
      { id: 'r1', updatedAt: '2026-02-01T00:00:00.000Z', foo: 'local-mais-novo' },
      { id: 'r2', updatedAt: '2026-01-15T00:00:00.000Z', foo: 'so-existe-local' },
      { id: 'r3', updatedAt: '2026-01-01T00:00:00.000Z', foo: 'local-antigo' }
    ],
    simulados: [{ id: 's2', total: 20 }]
  };
  const merged = ctx.mergePlannerActivityState(remote, local, false);
  const byId = Object.fromEntries(merged.simuladoRuns.map(run => [run.id, run]));
  assert.equal(merged.simuladoRuns.length, 3, 'nenhuma tentativa deve ser perdida ao mesclar');
  assert.equal(byId.r1.foo, 'local-mais-novo', 'a versao mais recente (local) deve vencer');
  assert.equal(byId.r2.foo, 'so-existe-local', 'tentativa exclusiva de um lado nao pode sumir');
  assert.equal(byId.r3.foo, 'remoto-mais-novo', 'o lado remoto tambem pode vencer quando e o mais novo');
  const simIds = plain(merged.simulados.map(sim => sim.id).sort());
  assert.deepStrictEqual(simIds, ['s1', 's2'], 'resumo legado deve unir os dois lados sem perder nenhum');
});

test('merge de materials: conteudo do lado mais recente, destaques (highlights) sempre unidos', () => {
  const ctx = loadPlannerSandbox();
  const remote = {
    materials: {
      'doc-a': { edited: true, content: 'versao remota antiga', updatedAt: '2026-01-01T00:00:00.000Z', lastReadAt: '2026-03-01T00:00:00.000Z', lastHeadingText: 'Conduta', highlights: [{ text: 'trecho-remoto', color: 'yellow', block: 1, occurrence: 0 }] }
    }
  };
  const local = {
    materials: {
      'doc-a': { edited: true, content: 'versao local nova', updatedAt: '2026-02-01T00:00:00.000Z', highlights: [{ text: 'trecho-local', color: 'green', block: 1, occurrence: 0 }] },
      'doc-b': { edited: true, content: 'documento so local', updatedAt: '2026-01-10T00:00:00.000Z', highlights: [] }
    }
  };
  const merged = ctx.mergePlannerActivityState(remote, local, false);
  assert.equal(merged.materials['doc-a'].content, 'versao local nova');
  const highlightTexts = plain(merged.materials['doc-a'].highlights.map(h => h.text).sort());
  assert.deepStrictEqual(highlightTexts, ['trecho-local', 'trecho-remoto'], 'grifos de ambos os lados devem sobreviver ao merge');
  assert.equal(merged.materials['doc-a'].lastHeadingText, 'Conduta', 'a posicao de leitura mais recente deve sobreviver sem trocar o conteudo editado');
  assert.equal(merged.materials['doc-b'].content, 'documento so local', 'documento exclusivo de um lado nao pode sumir');
});

test('merge de materials preserva anotações e conclusão por seus próprios carimbos', () => {
  const ctx = loadPlannerSandbox();
  const remote = { materials: { doc: {
    content:'texto remoto novo', updatedAt:'2026-08-11T14:00:00.000Z',
    notes:'anotação remota antiga', notesUpdatedAt:'2026-08-11T10:00:00.000Z',
    completed:true, completedAt:'2026-08-11T13:00:00.000Z', completedUpdatedAt:'2026-08-11T13:00:00.000Z'
  } } };
  const local = { materials: { doc: {
    content:'texto local antigo', updatedAt:'2026-08-11T12:00:00.000Z',
    notes:'anotação local nova', notesUpdatedAt:'2026-08-11T15:00:00.000Z',
    completed:false, completedAt:'', completedUpdatedAt:'2026-08-11T11:00:00.000Z'
  } } };
  const merged=ctx.mergePlannerActivityState(remote,local,false).materials.doc;
  assert.equal(merged.content,'texto remoto novo');
  assert.equal(merged.notes,'anotação local nova','a anotação mais recente não pode ser substituída junto com o conteúdo');
  assert.equal(merged.completed,true,'a conclusão mais recente deve sobreviver independentemente da anotação');
  assert.equal(merged.completedAt,'2026-08-11T13:00:00.000Z');
});

test('merge de dailyTasks preserva exclusao mais recente e compacta duplicatas', () => {
  const ctx = loadPlannerSandbox();
  const remote = {
    dailyTasks: [
      { id: 'old-copy', templateId: 'task-1', occurrenceKey: 'task-occurrence:task-1:2026-07-18', date: '2026-07-18', text: 'Revisar pneumo', status: 'pending', updatedAt: '2026-07-18T10:00:00.000Z' }
    ]
  };
  const local = {
    dailyTasks: [
      { id: 'deleted-copy', templateId: 'task-1', occurrenceKey: 'task-occurrence:task-1:2026-07-18', date: '2026-07-18', text: 'Revisar pneumo', status: 'deleted', deletedAt: '2026-07-18T11:00:00.000Z', updatedAt: '2026-07-18T11:00:00.000Z' }
    ]
  };
  const merged = ctx.mergePlannerActivityState(remote, local, false);
  assert.equal(merged.dailyTasks.length, 1);
  assert.equal(merged.dailyTasks[0].status, 'deleted');
});

test('merge do cronograma preserva as datas oficiais locais e incorpora apenas o progresso remoto', () => {
  const ctx = loadPlannerSandbox();
  const remote = {
    schedule: [
      { id: 's1', date: '2026-07-28', day: 'Terça', block: 1, topic: 'Aula 1', manualQ: 8, manualFC: 4, hours: 2, starred: true, starredUpdatedAt: '2026-08-10T10:00:00.000Z' },
      { id: 's2', date: '2026-07-28', day: 'Terça', block: 2, topic: 'Aula 2', manualQ: 0, manualFC: 0, hours: 0 }
    ]
  };
  const local = {
    schedule: [
      { id: 's1', date: '2026-04-09', day: 'Quinta', block: 1, topic: 'Aula 1', manualQ: 2, manualFC: 1, hours: 0 },
      { id: 's2', date: '2026-04-13', day: 'Segunda', block: 2, topic: 'Aula 2', manualQ: 0, manualFC: 0, hours: 0 }
    ]
  };

  const merged = ctx.mergePlannerActivityState(remote, local, false);
  assert.deepStrictEqual(
    plain(merged.schedule.map(item => item.date)),
    ['2026-04-09', '2026-04-13'],
    'uma data repetida vinda da nuvem não pode substituir o plano oficial deste aparelho'
  );
  assert.equal(merged.schedule[0].day, 'Quinta');
  assert.equal(merged.schedule[0].manualQ, 8, 'o progresso remoto continua sendo incorporado');
  assert.equal(merged.schedule[0].manualFC, 4);
  assert.equal(merged.schedule[0].hours, 2);
  assert.equal(merged.schedule[0].starred, true, 'a estrela mais recente deve sincronizar sem alterar a data oficial local');
});

test('sincronização entre abas nunca reduz os contadores de uma aula concluída', () => {
  const ctx = loadPlannerSandbox();
  ctx.render=()=>{};
  const state = ctx.__getState();
  state.schedule = [{ id:'bloco-10-aula', block:10, lessonOrder:1, topic:'Indicadores de Saúde', area:'Saúde Coletiva', manualQ:10, manualFC:10, hours:2 }];
  const staleTab = {
    ...JSON.parse(JSON.stringify(state)),
    schedule:[{ id:'id-antigo', block:10, lessonOrder:1, topic:'Indicadores de Saúde', area:'Saúde Coletiva', manualQ:10, manualFC:0, hours:2 }]
  };

  const recovered = ctx.applyCrossTabPlannerState(staleTab);
  const lesson = ctx.__getState().schedule[0];
  assert.equal(recovered, true, 'a aba com progresso maior precisa sinalizar que recuperou dados');
  assert.equal(lesson.manualQ, 10);
  assert.equal(lesson.manualFC, 10, 'uma aba antiga não pode zerar os flashcards que concluíram o bloco');
  assert.equal(lesson.hours, 2);
});

test('cronograma versiona cada campo como o Anki: edição mais nova vence, legado sem carimbo usa o maior valor', () => {
  const ctx = loadPlannerSandbox();
  const remote = { schedule:[{ id:'s1', block:10, topic:'Aula', area:'Clínica Médica', manualQ:10, manualFC:0, hours:1, manualFCUpdatedAt:'2026-08-12T11:00:00.000Z' }] };
  const local = { schedule:[{ id:'s1', block:10, topic:'Aula', area:'Clínica Médica', manualQ:4, manualFC:10, hours:2, manualFCUpdatedAt:'2026-08-12T10:00:00.000Z' }] };
  const merged = ctx.mergePlannerActivityState(remote, local, true).schedule[0];
  assert.equal(merged.manualQ, 10, 'sem carimbo, a migração preserva o maior contador legado');
  assert.equal(merged.manualFC, 0, 'com carimbo, uma redução intencional mais recente deve vencer');
  assert.equal(merged.hours, 2, 'horas legadas também não diminuem durante a migração');
  assert.equal(merged.manualFCUpdatedAt, '2026-08-12T11:00:00.000Z');
});

test('dois aparelhos somam atividades distintas do mesmo dia a partir dos eventos, sem duplicar o que já era comum', () => {
  const ctx=loadPlannerSandbox();
  const date='2026-09-26';
  const remote={
    schedule:[{id:'aula',topic:'ACLS',block:12}],
    dayLogs:[{...ctx.defaultDayLog(date),questions:1,correct:1,flashcards:1,videos:1,lessonMinutes:20}],
    questionProgress:{q1:{answeredAt:`${date}T10:00:00.000Z`,updatedAt:`${date}T10:00:00.000Z`,correct:true}},
    questionLogged:{q1:date},
    flashcardSystem:{reviewLogs:[{id:'review-1',cardId:'fc-1',reviewedAt:`${date}T10:10:00.000Z`}]},
    videoPlayer:{watched:{v1:true},watchedAt:{v1:`${date}T10:20:00.000Z`}},
    studySessions:[{id:'session-1',date,kind:'video',seconds:1200,savedAt:`${date}T10:40:00.000Z`}]
  };
  const local={
    schedule:[{id:'aula',topic:'ACLS',block:12}],
    dayLogs:[{...ctx.defaultDayLog(date),questions:1,wrong:1,flashcards:1,videos:1,lessonMinutes:15}],
    questionProgress:{q2:{answeredAt:`${date}T11:00:00.000Z`,updatedAt:`${date}T11:00:00.000Z`,correct:false}},
    questionLogged:{q2:date},
    flashcardSystem:{reviewLogs:[{id:'review-2',cardId:'fc-2',reviewedAt:`${date}T11:10:00.000Z`}]},
    videoPlayer:{watched:{v2:true},watchedAt:{v2:`${date}T11:20:00.000Z`}},
    studySessions:[{id:'session-2',date,kind:'video',seconds:900,savedAt:`${date}T11:40:00.000Z`}]
  };
  const merged=ctx.mergePlannerActivityState(remote,local,true);
  const log=merged.dayLogs.find(item=>item.date===date);
  assert.deepEqual({questions:log.questions,correct:log.correct,wrong:log.wrong},{questions:2,correct:1,wrong:1});
  assert.equal(log.flashcards,2);
  assert.equal(log.videos,2);
  assert.equal(log.lessonMinutes,35,'sessões com ids diferentes devem ser somadas uma única vez');
});

test('progresso de flashcards é unido por card e o registro mais recente vence apenas o mesmo card', () => {
  const ctx=loadPlannerSandbox();
  const merged=ctx.mergePlannerActivityState(
    {flashcardProgress:{a:{reviews:2,lastReviewedAt:'2026-09-26T10:00:00.000Z'},b:{reviews:1,lastReviewedAt:'2026-09-26T09:00:00.000Z'}}},
    {flashcardProgress:{a:{reviews:3,lastReviewedAt:'2026-09-26T11:00:00.000Z'},c:{reviews:1,lastReviewedAt:'2026-09-26T09:30:00.000Z'}}},
    false
  );
  assert.deepEqual(Object.keys(merged.flashcardProgress).sort(),['a','b','c']);
  assert.equal(merged.flashcardProgress.a.reviews,3);
});

test('player mantém progresso independente por vídeo e respeita desmarcação mais recente', () => {
  const ctx=loadPlannerSandbox();
  const merged=ctx.mergeVideoPlayerState(
    {
      resume:{v1:120},resumeUpdatedAt:{v1:'2026-09-26T10:00:00.000Z'},progress:{v1:{currentTime:120,updatedAt:'2026-09-26T10:00:00.000Z'}},
      watched:{v1:true},watchedAt:{v1:'2026-09-26T10:10:00.000Z'},watchedUpdatedAt:{v1:'2026-09-26T10:10:00.000Z'}
    },
    {
      resume:{v2:240},resumeUpdatedAt:{v2:'2026-09-26T11:00:00.000Z'},progress:{v2:{currentTime:240,updatedAt:'2026-09-26T11:00:00.000Z'}},
      watched:{v1:false},watchedAt:{v1:''},watchedUpdatedAt:{v1:'2026-09-26T12:00:00.000Z'}
    },
    true
  );
  assert.deepEqual(Object.keys(merged.progress).sort(),['v1','v2']);
  assert.equal(merged.resume.v1,120);
  assert.equal(merged.resume.v2,240);
  assert.equal(merged.watched.v1,false,'uma desmarcação explícita não pode ser ressuscitada por outro aparelho');
});

test('armazenamento local é isolado por conta no mesmo navegador', () => {
  const ctx=loadPlannerSandbox();
  assert.equal(ctx.activateAccountState('conta-a'),true);
  ctx.__setState({schedule:[{id:'aula-a'}],questionProgress:{qa:{answeredAt:'2026-09-26T10:00:00.000Z'}}});
  ctx.writeLocalState();
  assert.equal(ctx.activateAccountState('conta-b'),true);
  assert.equal(Boolean(ctx.__getState().questionProgress?.qa),false,'a conta B não pode herdar atividade da conta A');
  ctx.__setState({schedule:[{id:'aula-b'}],questionProgress:{qb:{answeredAt:'2026-09-26T11:00:00.000Z'}}});
  ctx.writeLocalState();
  assert.equal(ctx.activateAccountState('conta-a'),true);
  assert.ok(ctx.__getState().questionProgress.qa,'a conta A deve recuperar somente seu próprio estado');
  assert.equal(ctx.__getState().questionProgress.qb,undefined);
});

test('exclusões sincronizadas não ressuscitam questão importada nem revisão desfeita',()=>{
  const ctx=loadPlannerSandbox();
  const deletedAt='2026-09-26T12:00:00.000Z';
  const merged=ctx.mergePlannerActivityState(
    {
      importedQuestions:[{id:'importada-1',stem:'Questão antiga',createdAt:'2026-09-26T09:00:00.000Z'}],
      flashcardSystem:{
        reviewLogs:[{id:'review-1',cardId:'fc-1',reviewedAt:'2026-09-26T10:00:00.000Z'}],
        sessionReports:[{id:'session-1',endedAt:'2026-09-26T10:05:00.000Z'}]
      }
    },
    {
      deletedQuestions:{'importada-1':deletedAt},
      flashcardSystem:{
        reviewLogsDeleted:{'review-1':deletedAt},
        sessionReportsDeleted:{'session-1':deletedAt}
      }
    },
    true
  );
  assert.equal(merged.importedQuestions.some(question=>question.id==='importada-1'),false);
  assert.equal(merged.flashcardSystem.reviewLogs.some(review=>review.id==='review-1'),false);
  assert.equal(merged.flashcardSystem.sessionReports.some(report=>report.id==='session-1'),false);
  assert.equal(merged.deletedQuestions['importada-1'],deletedAt);
});

test('isEditingTextField: detecta textarea e input de texto, ignora checkbox e nada focado', () => {
  const ctx = loadPlannerSandbox();
  ctx.document.activeElement = { tagName: 'TEXTAREA' };
  assert.equal(ctx.isEditingTextField(), true);
  ctx.document.activeElement = { tagName: 'INPUT', type: 'text' };
  assert.equal(ctx.isEditingTextField(), true);
  ctx.document.activeElement = { tagName: 'INPUT', type: 'checkbox' };
  assert.equal(ctx.isEditingTextField(), false);
  ctx.document.activeElement = { tagName: 'DIV', isContentEditable: true };
  assert.equal(ctx.isEditingTextField(), true);
  ctx.document.activeElement = null;
  assert.equal(ctx.isEditingTextField(), false);
});

test('reconcileQuestionProgressForQuestion: gabarito editado recalcula o acerto de uma resposta ja dada', () => {
  const ctx = loadPlannerSandbox();
  const question = { id: 'q-teste-1', stem: 'Enunciado', options: { A: 'Um', B: 'Dois', C: 'Três', D: 'Quatro' }, answer: 'C', collectionBlock: '1' };
  ctx.__setQuestionBank([question]);
  const state = ctx.__getState();
  state.questionEdits = state.questionEdits || {};
  state.questionProgress = state.questionProgress || {};
  state.questionProgress[question.id] = { selected: 'A', correct: false, answeredAt: '2026-07-18T00:00:00.000Z', timedOut: false };

  const changedBeforeEdit = ctx.reconcileQuestionProgressForQuestion(question);
  assert.equal(changedBeforeEdit, false, 'sem edicao, o resultado ja e consistente e nada deve mudar');

  state.questionEdits[question.id] = { answer: 'A' };
  const changedAfterEdit = ctx.reconcileQuestionProgressForQuestion(question);
  assert.equal(changedAfterEdit, true, 'apos editar o gabarito para bater com a resposta dada, o resultado deve ser recalculado');
  assert.equal(state.questionProgress[question.id].correct, true);

  delete state.questionEdits[question.id];
  const changedAfterRestore = ctx.reconcileQuestionProgressForQuestion(question);
  assert.equal(changedAfterRestore, true, 'restaurar o gabarito original deve reverter a correcao');
  assert.equal(state.questionProgress[question.id].correct, false);
});

test('supabaseHealthStatus: consulta uma coluna real e respeita a linha do usuario autenticado', async () => {
  const ctx = loadPlannerSandbox();
  const calls = [];
  const query = {
    select(column,options) { calls.push(['select',column,options]); return this; },
    eq(column,value) { calls.push(['eq',column,value]); return Promise.resolve({error:null}); }
  };
  const client = {
    from(table) { calls.push(['from',table]); return query; },
    auth: { getSession: async () => ({error:null}) }
  };

  const authenticated = await ctx.supabaseHealthStatus(client,{id:'usuario-1'});
  assert.equal(authenticated.status,'ok');
  assert.equal(JSON.stringify(calls),JSON.stringify([
    ['from','planner_states'],
    ['select','user_id',{count:'exact',head:true}],
    ['eq','user_id','usuario-1']
  ]));

  calls.length = 0;
  const anonymous = await ctx.supabaseHealthStatus(client,null);
  assert.equal(anonymous.status,'ok');
  assert.equal(calls.length,0,'sem sessao, a checagem nao deve tentar ler uma tabela protegida por RLS');
});

test('CLOUD_SYNC_ALLOWED: bloqueia origens desconhecidas e libera as origens reais conhecidas', () => {
  const untrusted = loadPlannerSandbox({ origin: 'http://127.0.0.1:8766' });
  assert.equal(untrusted.__getCloudSyncAllowed(), false, 'uma porta de teste desconhecida nao deve poder sincronizar');

  const offline = loadPlannerSandbox({ origin: 'http://127.0.0.1:8765' });
  assert.equal(offline.__getCloudSyncAllowed(), true, 'o servidor offline oficial deve continuar sincronizando');

  const online = loadPlannerSandbox({ origin: 'https://enamed-planner-isaac.pages.dev' });
  assert.equal(online.__getCloudSyncAllowed(), true, 'o deploy real deve continuar sincronizando');

  const githubPages = loadPlannerSandbox({ origin: 'https://anguelion.github.io' });
  assert.equal(githubPages.__getCloudSyncAllowed(), true, 'o deploy do GitHub Pages deve sincronizar');
});
