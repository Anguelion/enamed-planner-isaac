'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const UX=require('../assets/planner-ux.js');

test('rotas reproduzem questão, vídeo e tentativa de simulado',()=>{
  const routes=[
    {tab:'questoes',questionId:'bloco 10:q1'},
    {tab:'aulas',videoId:'video/parte-1'},
    {tab:'simulados',simulationId:'enare-2024',attemptId:'run-7',questionIndex:18}
  ];
  routes.forEach(route=>assert.deepEqual(UX.parseRoute(UX.buildRoute(route)),route));
});

test('hash vazio preserva a precedência da query e Semiologia possui rota estável',()=>{
  assert.deepEqual(UX.parseRoute(''),{tab:''});
  assert.deepEqual(UX.parseRoute(UX.buildRoute({tab:'semiologia'})),{tab:'semiologia'});
});

test('data local respeita America/Fortaleza',()=>{
  assert.equal(UX.localDateKey(new Date('2026-07-17T01:30:00.000Z')),'2026-07-16');
});

test('ocorrências recorrentes são idempotentes e preservam o histórico concluído',()=>{
  const template={id:'hidratar',text:'Hidratar',recurrence:'daily',startDate:'2026-07-16',active:true};
  let occurrences=UX.ensureOccurrences([template],[],'2026-07-16','2026-07-16T10:00:00Z');
  occurrences[0].done=true;
  occurrences[0].status='done';
  occurrences=UX.ensureOccurrences([template],occurrences,'2026-07-16','2026-07-16T11:00:00Z');
  assert.equal(occurrences.length,1);
  assert.equal(occurrences[0].done,true);
  occurrences=UX.ensureOccurrences([template],occurrences,'2026-07-17','2026-07-17T10:00:00Z');
  assert.equal(occurrences.length,2);
  assert.equal(occurrences.find(item=>item.date==='2026-07-17').done,false);
});

test('recorrência por dias da semana só cria datas selecionadas',()=>{
  const template={id:'seg-qua',text:'Revisão',recurrence:'weekdays',weekdays:[1,3],startDate:'2026-07-13',active:true};
  assert.equal(UX.ensureOccurrences([template],[],'2026-07-13').length,1);
  assert.equal(UX.ensureOccurrences([template],[],'2026-07-14').length,0);
  assert.equal(UX.ensureOccurrences([template],[],'2026-07-15').length,1);
});

test('excluir ocorrência recorrente impede recriação no mesmo dia',()=>{
  const template={id:'rotina',text:'Revisar flashcards',recurrence:'daily',startDate:'2026-07-16',active:true};
  let occurrences=UX.ensureOccurrences([template],[],'2026-07-16','2026-07-16T10:00:00Z');
  occurrences=UX.deleteOccurrence(occurrences,occurrences[0].id,'2026-07-16T11:00:00Z');
  occurrences=UX.ensureOccurrences([template],occurrences,'2026-07-16','2026-07-16T12:00:00Z');
  assert.equal(occurrences.length,1);
  assert.equal(occurrences[0].status,'deleted');
  assert.equal(occurrences[0].deletedAt,'2026-07-16T11:00:00Z');
});

test('excluir uma tarefa duplicada apaga a ocorrência inteira',()=>{
  const first={id:'a',templateId:'rotina',occurrenceKey:UX.occurrenceKey('rotina','2026-07-16'),date:'2026-07-16',text:'Revisar flashcards',status:'pending',updatedAt:'2026-07-16T10:00:00Z'};
  const second={...first,id:'b',updatedAt:'2026-07-16T10:05:00Z'};
  const occurrences=UX.deleteOccurrence([first,second],'a','2026-07-16T11:00:00Z');
  assert.equal(occurrences.length,1);
  assert.equal(occurrences[0].status,'deleted');
});

test('adiar preserva a origem e não duplica o destino',()=>{
  const original={id:'occ-t-2026-07-16',templateId:'t',occurrenceKey:UX.occurrenceKey('t','2026-07-16'),date:'2026-07-16',text:'Revisar',done:false,status:'pending'};
  let occurrences=UX.postponeOccurrence([original],original.id,'2026-07-17','2026-07-16T22:00:00Z');
  assert.equal(occurrences.length,2);
  assert.equal(occurrences[0].status,'postponed');
  assert.equal(occurrences[1].postponedFrom,'2026-07-16');
  occurrences=UX.postponeOccurrence(occurrences,original.id,'2026-07-17','2026-07-16T22:05:00Z');
  assert.equal(occurrences.length,2);
});

test('progresso de vídeo restaura posição e velocidade',()=>{
  const progress=UX.normalizeVideoProgress({videoId:'v1',currentTime:415.4,duration:1200,playbackRate:1.75});
  assert.equal(UX.resumeTime(progress),415.4);
  assert.equal(progress.playbackRate,1.75);
});

test('vídeo concluído perto do final recomeça sem cair nos últimos segundos',()=>{
  assert.equal(UX.resumeTime({currentTime:1195,duration:1200,completed:true}),0);
  assert.equal(UX.resumeTime({currentTime:900,duration:1200,completed:true}),900);
});

test('cancelar simulado remove a tentativa e o resumo automático sem afetar os demais',()=>{
  const runs=[{id:'run-1',name:'Cancelar'},{id:'run-2',name:'Preservar'}];
  const summaries=[{id:'auto-run-1'},{id:'auto-run-2'},{id:'manual-1'}];
  const result=UX.removeSimulationRecord(runs,summaries,'run-1');
  assert.deepEqual(result.simuladoRuns,[runs[1]]);
  assert.deepEqual(result.simulados,[summaries[1],summaries[2]]);
});

test('validação rejeita questões incompletas e gabaritos incompatíveis',()=>{
  assert.equal(UX.validateQuestionRecord({stem:'Caso',options:{A:'Um',B:'Dois',C:'Três'},answer:'A'}).valid,false);
  assert.equal(UX.validateQuestionRecord({stem:'Caso',options:{A:'Um',B:'Dois',C:'Três',D:'Quatro'},answer:'E'}).valid,false);
  assert.equal(UX.validateQuestionRecord({stem:'Caso',options:{A:'Um',B:'Dois',C:'Três',D:'Quatro'},answer:'D'}).valid,true);
});

test('progresso mais novo preserva edições posteriores à resposta',()=>{
  const remote={answeredAt:'2026-07-16T10:00:00Z',updatedAt:'2026-07-16T10:05:00Z',notes:'remota',attempts:1,secondsSpent:20};
  const local={answeredAt:'2026-07-16T10:00:00Z',updatedAt:'2026-07-16T10:10:00Z',notes:'local',attempts:2,secondsSpent:15};
  const merged=UX.mergeQuestionProgressRecord(remote,local);
  assert.equal(merged.notes,'local');
  assert.equal(merged.attempts,2);
  assert.equal(merged.secondsSpent,20);
});

test('questionProgressTimestamp não quebra quando o registro mesclado é null',()=>{
  const merged=UX.mergeQuestionProgressRecord(undefined,undefined);
  assert.equal(merged,null);
  assert.equal(UX.questionProgressTimestamp(merged),0);
  assert.equal(UX.questionProgressTimestamp(null),0);
  assert.equal(UX.questionProgressTimestamp(undefined),0);
});

test('IDs duplicados recebem sufixo estável sem descartar questões diferentes',()=>{
  const records=UX.ensureUniqueRecordIds([
    {id:'q1',stem:'Primeira',number:1,collectionBlock:2},
    {id:'q1',stem:'Segunda',number:2,collectionBlock:2}
  ]);
  assert.equal(records.length,2);
  assert.equal(records[0].id,'q1');
  assert.match(records[1].id,/^q1-dup-/);
  assert.equal(records[1].duplicateSourceId,'q1');
});

test('integração mantém Pointer Events e Fazedor de questões no fim',()=>{
  const root=path.resolve(__dirname,'..');
  const planner=fs.readFileSync(path.join(root,'assets/planner.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'assets/planner.css'),'utf8');
  assert.match(planner,/function bindPointerHighlighter/);
  assert.match(planner,/event\.pointerType/);
  assert.match(css,/\.highlightable,.sim-highlightable\{[^}]*user-select:text/s);
  const views=planner.match(/const views = \[([\s\S]*?)\n\];/)?.[1]||'';
  assert.ok(views.includes("['importar-questoes'"));
  const groups=planner.match(/const VIEW_GROUPS = \{([\s\S]*?)\n\};/)?.[1]||'';
  assert.match(groups,/'importar-questoes':'Outros'/);
});

test('integração móvel mantém correções de autenticação, flashcard e layouts estreitos',()=>{
  const root=path.resolve(__dirname,'..');
  const planner=fs.readFileSync(path.join(root,'assets/planner.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'assets/planner.css'),'utf8');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(html,/id="authForm"/);
  assert.match(planner,/if\(button\)\s*\{\s*button\.textContent = 'Sair'/);
  assert.doesNotMatch(planner,/id="addQuestionFlashcard"/);
  assert.match(planner,/data-add-question-flashcard=/);
  assert.match(css,/@media\(max-width:1024px\)\{[\s\S]*?\.video-layout,\.video-focus-mode\{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(css,/\.qbank-mode \.question-card\{overflow:visible\}/);
});

test('marca-texto usa seletor flutuante único e permite editar marcações salvas',()=>{
  const root=path.resolve(__dirname,'..');
  const planner=fs.readFileSync(path.join(root,'assets/planner.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'assets/planner.css'),'utf8');
  assert.match(planner,/const HIGHLIGHT_MENU_COLORS=\['yellow','red','blue'\]/);
  assert.match(planner,/function showHighlightPopup/);
  assert.match(planner,/function bindSavedHighlightMenus/);
  assert.match(planner,/data-saved-highlight="true"/);
  assert.match(planner,/onDelete:\(\)=>onChange\(descriptor,null\)/);
  assert.doesNotMatch(planner,/data-(?:sim-marker|material-marker|marker)=/);
  assert.match(css,/\.highlight-popup\{position:fixed;/);
  assert.match(css,/@media\(pointer:coarse\)\{\.highlight-popup/);
});

test('parágrafos do material não recebem a navegação dos cartões de bloco',()=>{
  const root=path.resolve(__dirname,'..');
  const planner=fs.readFileSync(path.join(root,'assets/planner.js'),'utf8');
  assert.match(planner,/querySelectorAll\('\.materials-collection-card\[data-material-block\]'\)/);
  assert.doesNotMatch(planner,/querySelectorAll\('\[data-material-block\]'\)\.forEach\(button => button\.onclick/);
});

test('leitor de materiais salva a seção ativa, oferece retomada e normaliza tabelas',()=>{
  const root=path.resolve(__dirname,'..');
  const planner=fs.readFileSync(path.join(root,'assets/planner.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'assets/planner.css'),'utf8');
  assert.match(planner,/function bindMaterialReadingProgress/);
  assert.match(planner,/lastHeadingId/);
  assert.match(planner,/data-material-resume=/);
  assert.match(planner,/data-dashboard-continue="\$\{escapeAttr\(activity\.type\)\}"[\s\S]*data-continue-material=/);
  assert.match(planner,/const normalizedRows=rows\.slice\(1\)/);
  assert.match(planner,/replace\(\/\\\\r\\\\n\\\\r\\\\n\|\\\\n\\\\n\|\\\\r\\\\r\/g/);
  assert.match(css,/\.reader-toc \.tiny-btn\.active/);
  assert.match(css,/\.material-resume-card\{/);
  assert.match(css,/\.material-table-wrap th,.material-table-wrap td\{/);
});

test('Missão centraliza somente a seleção nova e pesquisa em todos os blocos',()=>{
  const root=path.resolve(__dirname,'..');
  const planner=fs.readFileSync(path.join(root,'assets/planner.js'),'utf8');
  assert.match(planner,/ui\.scheduleBlockFocusPending=ui\.scheduleBlock/);
  assert.match(planner,/active\.offsetLeft-\(blockStrip\.clientWidth-active\.offsetWidth\)\/2/);
  assert.match(planner,/blockStrip\.addEventListener\('scroll',\(\)=>\{ ui\.scheduleBlockScrollLeft=blockStrip\.scrollLeft; \}/);
  assert.doesNotMatch(planner,/if\(ui\.scheduleBlockPinned\) return;/);
  assert.match(planner,/if\(value\.trim\(\)&&ui\.scheduleBlock!=='Todos'\) \{[\s\S]*?ui\.scheduleBlock='Todos';[\s\S]*?ui\.scheduleBlockPinned=false;/);
  assert.match(planner,/ui\.scheduleWeekFocusPending=ui\.scheduleDay\|\|'Todos'/);
  assert.match(planner,/weekStrip\.addEventListener\('scroll'/);
});

test('cabeçalho desktop oferece histórico interno com voltar, avançar e atalhos',()=>{
  const root=path.resolve(__dirname,'..');
  const planner=fs.readFileSync(path.join(root,'assets/planner.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'assets/planner.css'),'utf8');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(html,/id="headerHistoryBack"[^>]*disabled/);
  assert.match(html,/id="headerHistoryForward"[^>]*disabled/);
  assert.match(planner,/function updatePlannerHistoryButtons/);
  assert.match(planner,/history\.back\(\)/);
  assert.match(planner,/history\.forward\(\)/);
  assert.match(planner,/event\.altKey[\s\S]*?event\.key==='ArrowLeft'/);
  assert.match(css,/\.header-history\{display:inline-flex/);
  assert.match(css,/@media\(max-width:1024px\)\{[\s\S]*?\.header-history\{display:none\}/);
});
