// Carregado apenas ao abrir o Radar Saúde. Usa os helpers do planner.
let radarSaudeIssueCache = null;
function radarSaudeDate(value) {
  const date=new Date(`${value}T12:00:00-03:00`);
  if(Number.isNaN(date.getTime())) return String(value||'');
  return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'long',year:'numeric'}).format(date);
}
function radarSaudeStoryDetail(story) {
  const deep=story.deepDive||{};
  return `<div class="planner-radar-study-body"><section><h4>Cenário e relevância epidemiológica</h4><p>${escapeHtml(deep.whatHappened||story.summary||'')}</p></section><section><h4>Mecanismo e fisiopatologia</h4><p>${escapeHtml(deep.howItWorks||'')}</p></section><section><h4>Aplicação clínica e conduta</h4><p>${escapeHtml(deep.clinicalMeaning||story.clinicalNote||'')}</p></section><section><h4>Força da evidência e limitações</h4><p><strong>Base:</strong> ${escapeHtml(story.evidence||'Não informada')}.</p><p>${escapeHtml(deep.limitations||'')}</p></section></div><div class="planner-radar-exam"><div><span>Pontos de prova e revisão ativa</span><ul>${(Array.isArray(deep.examFocus)?deep.examFocus:[]).map(point=>`<li>${escapeHtml(point)}</li>`).join('')}</ul></div><a href="${escapeAttr(story.sourceUrl)}" target="_blank" rel="noopener noreferrer">Fonte consultada ↗</a></div>`;
}
function radarSaudeMarkup(issue) {
  const stories=Array.isArray(issue.stories)?issue.stories:[];
  const innovations=Array.isArray(issue.innovations)?issue.innovations:[];
  const protocols=Array.isArray(issue.protocolUpdates)?issue.protocolUpdates:[];
  const quiz=Array.isArray(issue.dailyQuiz)?issue.dailyQuiz:[];
  const lead=issue.lead||{};
  const editionAge=PersonalUI.editionAge(issue.publishedAt,studyDateKey());
  const editionNotice=editionAge===null?'A data desta edição não pôde ser verificada.':editionAge>14?`Edição publicada há ${editionAge} dias. Consulte as fontes para verificar atualizações.`:'';
  return `<div class="planner-radar-shell">${editionNotice?`<p class="personal-edition-notice" role="status">${escapeHtml(editionNotice)}</p>`:''}
    <header class="planner-radar-hero">
      <div><span class="eyebrow">Clipping médico pessoal</span><h1>Radar <em>Saúde</em></h1><p>Newsletter, inovações e atualizações de PCDT reunidas dentro do seu planner.</p></div>
      <div class="planner-radar-edition"><span>Edição monitorada</span><strong>${escapeHtml(radarSaudeDate(issue.publishedAt))}</strong><small>${Math.max(1,n(issue.readingMinutes))} min de leitura</small></div>
    </header>
    <nav class="planner-radar-nav" aria-label="Canais do Radar Saúde"><a href="#planner-radar-news">Newsletter</a><a href="#planner-radar-innovation">Inovações</a><a href="#planner-radar-pcdt">PCDT</a><a href="#planner-radar-quiz">5 questões</a><button type="button" id="radarSaudeRefresh">Atualizar</button></nav>
    <section class="planner-radar-lead" id="planner-radar-news">
      <div><span>Destaque da edição</span><h2>${escapeHtml(lead.title||issue.title)}</h2><p>${escapeHtml(lead.summary||'')}</p></div>
      <aside><strong>Olhar clínico</strong><p>${escapeHtml(lead.clinicalNote||'')}</p><a href="${escapeAttr(lead.sourceUrl||issue.sourceUrl)}" target="_blank" rel="noopener noreferrer">Consultar fonte ↗</a></aside>
    </section>
    <section class="planner-radar-section">
      <div class="planner-radar-heading"><div><span class="eyebrow">Leitura completa</span><h2>Entenda a edição</h2></div><span class="planner-radar-self-contained">Tudo o que você precisa saber está aqui</span></div>
      <div class="planner-radar-study-list">${stories.map((story,index)=>`<article class="planner-radar-study"><header><span>${String(index+1).padStart(2,'0')}</span><div><small>${escapeHtml(story.category)} · ${escapeHtml(story.evidence)}</small><h3>${escapeHtml(story.title)}</h3><p>${escapeHtml(story.summary)}</p></div></header><div class="planner-radar-clinical-snapshot"><strong>Aplicação clínica</strong><p>${escapeHtml(story.clinicalNote||'')}</p></div><button class="planner-radar-expand" type="button" data-radar-story-expand="${index}" aria-expanded="false">Aprofundar raciocínio clínico</button><div class="planner-radar-story-detail" data-radar-story-detail="${index}" hidden></div></article>`).join('')}</div>
    </section>
    <section class="planner-radar-section" id="planner-radar-innovation">
      <div class="planner-radar-heading"><div><span class="eyebrow">Tecnologia e acesso</span><h2>Inovações em saúde</h2></div><small>Da pesquisa à oferta no SUS</small></div>
      <div class="planner-radar-grid">${innovations.map(item=>`<article class="planner-radar-card planner-radar-innovation"><div class="planner-radar-card-meta"><span class="planner-radar-emoji">${escapeHtml(item.icon)}</span><b>${escapeHtml(item.stage)}</b></div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary)}</p><div class="planner-radar-note"><strong>Impacto potencial</strong><span>${escapeHtml(item.impact)}</span></div><footer><a href="${escapeAttr(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">Fonte oficial ↗</a></footer></article>`).join('')}</div>
    </section>
    <section class="planner-radar-section planner-radar-protocols" id="planner-radar-pcdt">
      <div class="planner-radar-heading"><div><span class="eyebrow">Conduta no SUS</span><h2>Atualizações de PCDT</h2></div><a href="https://www.gov.br/conitec/pt-br/assuntos/avaliacao-de-tecnologias-em-saude/protocolos-clinicos-e-diretrizes-terapeuticas/pcdt" target="_blank" rel="noopener noreferrer">Catálogo oficial ↗</a></div>
      <p class="planner-radar-warning">Consultas e documentos em elaboração não substituem o protocolo vigente. Confirme sempre a portaria e a versão oficial.</p>
      <div class="planner-radar-protocol-list">${protocols.map(item=>`<article><time datetime="${escapeAttr(item.date)}">${escapeHtml(radarSaudeDate(item.date))}</time><div><span class="planner-radar-status planner-radar-status-${item.tone==='published'?'published':'attention'}">${escapeHtml(item.status)}</span><small>${escapeHtml(item.type)}</small><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary)}</p></div><a href="${escapeAttr(item.sourceUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir documento oficial">↗</a></article>`).join('')}</div>
    </section>
    <section class="planner-radar-section planner-radar-quiz" id="planner-radar-quiz">
      <div class="planner-radar-heading"><div><span class="eyebrow">Fixação do dia</span><h2>5 questões comentadas</h2></div><strong id="radarQuizScore">0 de ${quiz.length} acertos</strong></div>
      <p class="planner-radar-warning">Responda com base na leitura desta edição. O comentário aparece logo após cada resposta.</p>
      <div class="planner-radar-quiz-list">${quiz.map((item,index)=>`<article class="planner-radar-question" data-radar-question="${index}"><header><span>Questão ${index+1}</span><h3>${escapeHtml(item.question)}</h3></header><div class="planner-radar-options">${item.options.map((option,optionIndex)=>`<button type="button" data-radar-option="${optionIndex}"><b>${String.fromCharCode(65+optionIndex)}</b><span>${escapeHtml(option)}</span></button>`).join('')}</div><div class="planner-radar-answer" hidden><strong></strong><p>${escapeHtml(item.explanation)}</p></div></article>`).join('')}</div>
      <button class="planner-radar-quiz-reset" type="button" id="radarQuizReset">Refazer as 5 questões</button>
    </section>
    <p class="planner-radar-disclaimer">Conteúdo para atualização e estudo. Não substitui avaliação clínica, protocolo vigente ou orientação médica individual.</p>
  </div>`;
}
function bindRadarSaudeStories(issue) {
  const stories=Array.isArray(issue.stories)?issue.stories:[];
  document.querySelectorAll('[data-radar-story-expand]').forEach(button=>button.addEventListener('click',()=>{
    const index=n(button.dataset.radarStoryExpand);
    const story=stories[index];
    const detail=document.querySelector(`[data-radar-story-detail="${index}"]`);
    if(!story||!detail) return;
    if(!detail.dataset.rendered) {
      detail.innerHTML=radarSaudeStoryDetail(story);
      detail.dataset.rendered='true';
    }
    const expanded=button.getAttribute('aria-expanded')==='true';
    button.setAttribute('aria-expanded',String(!expanded));
    button.textContent=expanded?'Aprofundar raciocínio clínico':'Recolher análise';
    detail.hidden=expanded;
  }));
}
function bindRadarSaudeQuiz(issue) {
  const questions=Array.isArray(issue.dailyQuiz)?issue.dailyQuiz:[];
  const answered=new Set();
  let score=0;
  const scoreNode=document.getElementById('radarQuizScore');
  const updateScore=()=>{ if(scoreNode) scoreNode.textContent=`${score} de ${questions.length} acertos`; };
  document.querySelectorAll('.planner-radar-question').forEach(card=>{
    const questionIndex=n(card.dataset.radarQuestion);
    const question=questions[questionIndex];
    card.querySelectorAll('[data-radar-option]').forEach(button=>button.addEventListener('click',()=>{
      if(answered.has(questionIndex)||!question) return;
      answered.add(questionIndex);
      const selected=n(button.dataset.radarOption);
      const correct=n(question.answerIndex);
      card.querySelectorAll('[data-radar-option]').forEach((option,index)=>{ option.disabled=true; if(index===correct) option.classList.add('correct'); });
      if(selected===correct) { score+=1; card.classList.add('answered-correct'); }
      else { button.classList.add('wrong'); card.classList.add('answered-wrong'); }
      const answer=card.querySelector('.planner-radar-answer');
      if(answer) { answer.hidden=false; answer.querySelector('strong').textContent=selected===correct?'Resposta correta':'Resposta incorreta'; }
      updateScore();
    }));
  });
  document.getElementById('radarQuizReset')?.addEventListener('click',()=>{ if(radarSaudeIssueCache) { const root=document.getElementById('radar-saude'); root.innerHTML=radarSaudeMarkup(radarSaudeIssueCache); document.getElementById('radarSaudeRefresh')?.addEventListener('click',()=>renderRadarSaude(true)); bindRadarSaudeStories(radarSaudeIssueCache); bindRadarSaudeQuiz(radarSaudeIssueCache); document.getElementById('planner-radar-quiz')?.scrollIntoView({behavior:'smooth',block:'start'}); } });
  updateScore();
}
function renderRadarSaude(force=false) {
  const root=document.getElementById('radar-saude');
  if(!root) return;
  const show=issue=>{
    if(ui.tab!=='radar-saude') return;
    root.innerHTML=radarSaudeMarkup(issue);
    root.querySelectorAll('.planner-radar-nav a').forEach(link=>link.addEventListener('click',event=>{
      event.preventDefault();
      const target=document.getElementById(link.getAttribute('href').slice(1));
      target?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
    }));
    document.getElementById('radarSaudeRefresh')?.addEventListener('click',()=>renderRadarSaude(true));
    bindRadarSaudeStories(issue);
    bindRadarSaudeQuiz(issue);
  };
  if(radarSaudeIssueCache&&!force) { show(radarSaudeIssueCache); return; }
  root.innerHTML='<section class="card empty"><strong>Atualizando o Radar Saúde…</strong><span>Buscando a edição mais recente e os documentos oficiais.</span></section>';
  fetch('health-news/data/latest.json',{cache:force?'no-store':'default'})
    .then(response=>{ if(!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
    .then(issue=>{ radarSaudeIssueCache=issue; show(issue); })
    .catch(()=>{ if(ui.tab==='radar-saude') root.innerHTML='<section class="card empty"><strong>Não foi possível abrir o Radar Saúde.</strong><span>Confira sua conexão e tente novamente.</span><button class="tiny-btn" type="button" id="radarSaudeRetry">Tentar novamente</button></section>'; document.getElementById('radarSaudeRetry')?.addEventListener('click',()=>renderRadarSaude(true)); });
}
