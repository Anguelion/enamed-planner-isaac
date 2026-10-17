(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.StudyWorkspace=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const stamp=note=>Date.parse(note?.updatedAt||note?.createdAt||'')||0;
  function mergeNotes(remote=[],local=[]){
    const byId=new Map();
    for(const note of [...(Array.isArray(remote)?remote:[]),...(Array.isArray(local)?local:[])]) {
      if(!note || typeof note.id!=='string') continue;
      if(!byId.has(note.id)||stamp(note)>=stamp(byId.get(note.id))) byId.set(note.id,{...note});
    }
    return [...byId.values()];
  }
  function formatNote(text){
    const inline=value=>esc(value).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>').replace(/`([^`]+)`/g,'<code>$1</code>');
    let html='',list='';
    for(const line of String(text||'').split('\n')){
      const bullet=line.match(/^\s*[-*]\s+(.*)$/),number=line.match(/^\s*\d+[.)]\s+(.*)$/),heading=line.match(/^(#{1,3})\s+(.*)$/);
      const type=bullet?'ul':number?'ol':'';
      if(type!==list){if(list)html+=`</${list}>`;if(type)html+=`<${type}>`;list=type;}
      if(type)html+=`<li>${inline((bullet||number)[1])}</li>`;
      else if(heading)html+=`<h${heading[1].length+1}>${inline(heading[2])}</h${heading[1].length+1}>`;
      else html+=`<div>${inline(line)||'<br>'}</div>`;
    }
    return html+(list?`</${list}>`:'');
  }
  const tabKeys=['1','2','3','4','5','6','7','8','9','r','b','d','h','s','e','g','v','u','t','q','z','a','c'];
  let app,opened=[],active='',folder='',query='',saveTimer,dirty=false,ownerState=null,paletteReturn;
  let focusMode='none',focusSession=null,focusToken='',focusReady=false,focusMessage='Verificando fixação no Windows…',heartbeat,busy=false,focusFullscreen=false,focusAttempt=0;
  const esc=text=>String(text??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function notes(){const s=app.getState();if(!Array.isArray(s.freeNotes)) s.freeNotes=[];return s.freeNotes;}
  function current(){return notes().find(note=>note.id===active&&!note.archived);}
  function dateKey(){return new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
  function dateLabel(day){return /^\d{4}-\d{2}-\d{2}$/.test(day)?day.split('-').reverse().join('/'):'Sem data';}
  function status(text){const el=document.getElementById('noteSaveStatus');if(el) el.textContent=text;}
  function flush(){
    clearTimeout(saveTimer);
    if(!dirty)return true;
    const success=app.save();
    dirty=!success;
    status(success?'Salvo automaticamente neste aparelho':'Não foi possível salvar. Exporte a anotação antes de sair.');
    return success;
  }
  function changed(){dirty=true;status('Salvando…');clearTimeout(saveTimer);saveTimer=setTimeout(flush,450);}
  function updateNote(fields){const note=current();if(!note)return;Object.assign(note,fields,{updatedAt:new Date().toISOString()});changed();}
  function openNote(id){flush();active=id;if(!opened.includes(id))opened.push(id);folder=current()?.date||folder;renderNotes();}
  function newNote(){
    if(!app.navigate('anotacoes'))return;
    if(ownerState!==app.account()){opened=[];active='';folder='';ownerState=app.account();}
    flush();const now=new Date().toISOString();
    const note={id:crypto.randomUUID(),title:'Nova anotação',content:'',date:dateKey(),createdAt:now,updatedAt:now};
    notes().push(note);dirty=true;flush();openNote(note.id);
    const title=document.getElementById('noteTitle');title?.focus();title?.select();
  }
  function insert(kind){
    const field=document.getElementById('noteContent');if(!field)return;
    const start=field.selectionStart,end=field.selectionEnd,text=field.value.slice(start,end);
    let replacement=kind==='bold'?`**${text||'texto'}**`:kind==='italic'?`*${text||'texto'}*`:kind==='heading'?`\n## ${text||'Título'}\n`:text.split('\n').map((line,i)=>`${kind==='number'?`${i+1}.`:'-'} ${line}`).join('\n');
    field.setRangeText(replacement,start,end,'select');field.dispatchEvent(new Event('input',{bubbles:true}));field.focus();
  }
  function exportNote(){const note=current();if(!note)return;const url=URL.createObjectURL(new Blob([`# ${note.title}\n\n${note.content}`],{type:'text/markdown;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`${note.date}-${note.title.replace(/[<>:"/\\|?*]/g,'_')}.md`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function renderNotes(){
    const host=document.getElementById('anotacoes');if(!host)return;
    // A sincronização troca o objeto de estado; os IDs continuam válidos. Ao mudar
    // de conta, limpe apenas a seleção da interface, nunca o conteúdo salvo.
    const account=app.account();if(ownerState!==account){opened=[];active='';folder='';ownerState=account;}
    const all=notes().filter(note=>!note.archived).sort((a,b)=>stamp(b)-stamp(a));
    opened=opened.filter(id=>all.some(note=>note.id===id));
    const days=[...new Set(all.map(note=>note.date||String(note.createdAt||'').slice(0,10)))].sort().reverse();
    if(!folder)folder=days[0]||dateKey();
    const note=current(),matching=all.filter(n=>(!query?n.date===folder:`${n.title} ${n.content}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())));
    host.innerHTML=`<section class="card notebook"><div class="section-title"><div><span class="eyebrow">Seu espaço livre</span><h2>Anotações</h2><p class="muted">Pastas pela data de criação · salvamento automático · listas e enumeração</p></div><button class="icon-btn primary" id="noteNew" title="Nova anotação (Alt + Shift + N)">＋ Nova anotação</button></div><div class="notebook-grid"><aside class="note-explorer" aria-label="Explorador de anotações"><label>Buscar anotações<input class="input" id="noteSearch" value="${esc(query)}" placeholder="Título ou conteúdo"></label><nav class="note-folders" aria-label="Pastas por data">${days.map(day=>`<button class="note-folder ${day===folder?'selected':''}" data-note-date="${esc(day)}" aria-pressed="${day===folder}">📁 ${dateLabel(day)} <small>${all.filter(n=>n.date===day).length}</small></button>`).join('')||'<p class="muted">Suas pastas aparecerão aqui.</p>'}</nav><div class="note-files">${matching.map(n=>`<button class="note-file ${n.id===active?'selected':''}" data-note-open="${esc(n.id)}">📝 <span>${esc(n.title||'Sem título')}<small>${dateLabel(n.date)}</small></span></button>`).join('')||'<p class="muted">Nenhuma anotação nesta pasta.</p>'}</div></aside><div class="note-workspace"><div class="note-tabs" role="tablist" aria-label="Anotações abertas">${opened.map(id=>{const n=all.find(n=>n.id===id);return `<span class="note-tab"><button role="tab" aria-selected="${id===active}" data-note-open="${esc(id)}">${esc(n.title||'Sem título')}</button><button data-note-close="${esc(id)}" aria-label="Fechar aba ${esc(n.title)}" title="Fecha somente a aba; a anotação continua salva">×</button></span>`;}).join('')}<button class="tiny-btn" id="noteTabNew" aria-label="Abrir nova anotação">＋</button></div>${note?`<label class="note-title-label">Nome da anotação<input id="noteTitle" aria-label="Nome da anotação" class="input note-title" value="${esc(note.title)}" maxlength="160"></label><div class="note-tools" aria-label="Formatação"><button class="tiny-btn" data-note-format="bold"><b>Negrito</b></button><button class="tiny-btn" data-note-format="italic"><i>Itálico</i></button><button class="tiny-btn" data-note-format="heading">Título</button><button class="tiny-btn" data-note-format="bullet">• Lista</button><button class="tiny-btn" data-note-format="number">1. Enumeração</button><button class="tiny-btn" id="noteExport">Exportar .md</button></div><div class="note-writing"><label>Escreva livremente<textarea id="noteContent" aria-label="Escreva livremente" class="textarea" spellcheck="true" placeholder="Escreva aqui. Use - para listas e 1. para enumeração.">${esc(note.content)}</textarea></label><article id="notePreview" class="markdown-preview" aria-label="Prévia formatada">${app.markdown(note.content||'Sua anotação formatada aparecerá aqui.')}</article></div><small id="noteSaveStatus" role="status">${dirty?'Salvando…':'Salvo automaticamente neste aparelho'}</small>`:'<div class="note-empty"><span>📝</span><h3>Um lugar para suas ideias</h3><p>Abra uma pasta e clique em uma anotação ou crie uma nova aba.</p></div>'}</div></div></section>`;
    host.querySelector('#noteNew').onclick=newNote;host.querySelector('#noteTabNew').onclick=newNote;
    host.querySelectorAll('[data-note-open]').forEach(b=>b.onclick=()=>openNote(b.dataset.noteOpen));
    host.querySelectorAll('[data-note-date]').forEach(b=>b.onclick=()=>{flush();folder=b.dataset.noteDate;query='';renderNotes();});
    host.querySelectorAll('[data-note-close]').forEach(b=>b.onclick=()=>{flush();opened=opened.filter(id=>id!==b.dataset.noteClose);if(active===b.dataset.noteClose)active=opened.at(-1)||'';renderNotes();});
    host.querySelector('#noteSearch').oninput=e=>{const pos=e.target.selectionStart;query=e.target.value;renderNotes();const input=document.getElementById('noteSearch');input.focus();input.setSelectionRange(pos,pos);};
    const title=host.querySelector('#noteTitle'),body=host.querySelector('#noteContent');
    if(title)title.oninput=e=>{updateNote({title:e.target.value});host.querySelectorAll(`[data-note-open="${active}"]`).forEach(b=>{if(b.getAttribute('role')==='tab')b.textContent=e.target.value||'Sem título';else b.innerHTML=`📝 <span>${esc(e.target.value||'Sem título')}<small>${dateLabel(current().date)}</small></span>`;});host.querySelector(`[data-note-close="${active}"]`)?.setAttribute('aria-label',`Fechar aba ${e.target.value||'Sem título'}`);};
    if(body){body.oninput=e=>{updateNote({content:e.target.value});host.querySelector('#notePreview').innerHTML=app.markdown(e.target.value);};body.onkeydown=e=>{if((e.ctrlKey||e.metaKey)&&['b','i','s'].includes(e.key.toLowerCase())){e.preventDefault();e.stopPropagation();e.key.toLowerCase()==='s'?flush():insert(e.key.toLowerCase()==='b'?'bold':'italic');}};}
    host.querySelectorAll('[data-note-format]').forEach(b=>b.onclick=()=>insert(b.dataset.noteFormat));
    const exp=host.querySelector('#noteExport');if(exp)exp.onclick=exportNote;
  }
  function visible(el){return !el.disabled && !el.closest('[hidden],[inert]') && el.getClientRects().length>0;}
  function actions(){
    const result=app.tabs.map(([id,label],index)=>({label:`Abrir aba: ${label}`,shortcut:`Alt + Shift + ${tabKeys[index].toUpperCase()}`,run:()=>app.navigate(id)}));
    result.push({label:'Nova anotação',shortcut:'Alt + Shift + N',run:newNote});
    document.querySelectorAll('button,a[href],input:not([type="hidden"]),select,textarea,summary,[role="button"]').forEach(el=>{
      if(!visible(el)||el.closest('#commandPalette,#authPanel'))return;
      const label=el.getAttribute('aria-label')||el.getAttribute('title')||el.labels?.[0]?.textContent||el.textContent||el.placeholder;
      if(!String(label||'').trim())return;
      const name=String(label).trim().replace(/\s+/g,' ').slice(0,140);
      result.push({label:name,shortcut:'',run:()=>{if(!el.isConnected)return;if(el.matches('input:not([type="checkbox"]):not([type="radio"]),select,textarea'))el.focus();else el.click();}});
    });
    return result.map((item,i)=>({...item,number:i+1}));
  }
  function openCommands(){
    if(document.getElementById('commandPalette'))return;
    paletteReturn=document.activeElement;const commands=actions();
    const dialog=document.createElement('dialog');dialog.id='commandPalette';dialog.className='command-palette';
    dialog.innerHTML='<form method="dialog"><div class="section-title"><h2>Atalhos e ações</h2><button class="tiny-btn" aria-label="Fechar central de atalhos">×</button></div></form><p>Ctrl + K abre esta central. Digite o número da ação ou busque pelo nome e pressione Enter. ↑ e ↓ selecionam; Esc fecha.</p><label>Buscar ação ou número<input id="commandSearch" class="input" autocomplete="off"></label><div id="commandResults" role="listbox" aria-label="Ações disponíveis"></div><p class="muted">No vídeo: Espaço pausa · J acelera · F desacelera · 0 restaura 1×. Na anotação: Ctrl+B negrito · Ctrl+I itálico · Ctrl+S salva.</p>';
    document.body.appendChild(dialog);let selected=0,filtered=commands,execute=null;
    const draw=()=>{const q=dialog.querySelector('input').value.trim().toLocaleLowerCase();filtered=commands.filter(c=>/^\d+$/.test(q)?c.number===Number(q):c.label.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(q.normalize('NFD').replace(/[\u0300-\u036f]/g,'')));selected=Math.min(selected,Math.max(0,filtered.length-1));dialog.querySelector('#commandResults').innerHTML=filtered.map((c,i)=>`<button type="button" role="option" aria-selected="${i===selected}" data-command="${c.number}"><kbd>${c.number}</kbd><span>${esc(c.label)}</span><small>${esc(c.shortcut||`Ctrl+K → ${c.number} → Enter`)}</small></button>`).join('')||'<p>Nenhuma ação encontrada.</p>';dialog.querySelectorAll('[data-command]').forEach(b=>b.onclick=()=>run(commands.find(c=>c.number===Number(b.dataset.command))));};
    const run=c=>{if(!c)return;execute=c.run;dialog.close();};
    dialog.addEventListener('close',()=>{dialog.remove();paletteReturn?.focus?.();execute?.();});
    dialog.querySelector('input').oninput=()=>{selected=0;draw();};
    dialog.querySelector('input').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();run(filtered[selected]);}if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();selected=Math.max(0,Math.min(filtered.length-1,selected+(e.key==='ArrowDown'?1:-1)));draw();dialog.querySelector('[aria-selected="true"]')?.scrollIntoView({block:'nearest'});}};
    draw();dialog.showModal();dialog.querySelector('input').focus();
  }
  async function focusRequest(action,data={}){
    const response=await fetch(`/__focus/${action}`,{method:action==='capabilities'?'GET':'POST',cache:'no-store',headers:{'Content-Type':'application/json','X-Focus-Token':focusToken},body:action==='capabilities'?undefined:JSON.stringify(data)});
    if(!response.ok)throw new Error('Componente de fixação indisponível. Reinicie pelo Abrir-Planner.bat.');
    const result=await response.json();if(result.error)throw new Error(result.error);return result;
  }
  async function checkFocus(){
    if(!['localhost','127.0.0.1'].includes(location.hostname)){focusMessage='A fixação do Windows funciona ao abrir o programa por Abrir-Planner.bat neste computador.';app.refreshPomodoro();return;}
    try{const result=await focusRequest('capabilities');focusToken=result.token;focusReady=result.available;focusMessage=result.message;}catch{focusMessage='Para fixar no Windows, reinicie o servidor pelo Abrir-Planner.bat atualizado.';}
    app.refreshPomodoro();
  }
  function focusOptions(){return `<fieldset class="pomo-pin-options"><legend>Fixação durante o foco (opcional)</legend>${[['screen','Fixar esta tela'],['app','Fixar aplicativo']].map(([value,label])=>`<label><input type="checkbox" data-focus-mode="${value}" ${focusMode===value?'checked':''} ${focusReady?'':'disabled'}> ${label}</label>`).join('')}<small>Tela mantém a aba atual; aplicativo permite navegar entre as abas.</small><small>${esc(focusMessage)}${focusReady?' Escolha uma opção. Pausar ou encerrar libera o Windows. Emergência: Ctrl + Alt + Shift + F12.':''}</small></fieldset>`;}
  function bindFocus(panel){panel.querySelectorAll('[data-focus-mode]').forEach(el=>el.onchange=()=>{focusMode=el.checked?el.dataset.focusMode:'none';app.refreshPomodoro();});}
  async function beginFocus(){
    if(focusMode==='none')return true;
    if(busy)return false;busy=true;
    const attempt=++focusAttempt;
    try{
      if(!document.hasFocus())throw new Error('Clique no programa antes de iniciar a fixação.');
      if(!document.fullscreenElement){focusFullscreen=true;await document.documentElement.requestFullscreen();}
      if(attempt!==focusAttempt)return false;
      const result=await focusRequest('start',{mode:focusMode});
      if(attempt!==focusAttempt){await focusRequest('stop',{session:result.session});return false;}
      focusSession={id:result.session,mode:focusMode,tab:app.getTab()};
      document.body.classList.add('pomodoro-pinned');
      heartbeat=setInterval(async()=>{
        if(!focusSession)return;
        try{const r=await focusRequest('heartbeat',{session:focusSession.id});if(!r.active)throw new Error('A fixação foi liberada.');}catch{app.pause();releaseFocus();app.toast('Fixação liberada. O Pomodoro foi pausado.');}
      },3000);
      return true;
    }catch(error){app.toast(error.message);releaseFocus();return false;}finally{busy=false;}
  }
  function releaseFocus(){
    focusAttempt++;
    const session=focusSession;focusSession=null;clearInterval(heartbeat);document.body.classList.remove('pomodoro-pinned');
    if(session)focusRequest('stop',{session:session.id}).catch(()=>{});
    if(focusFullscreen&&document.fullscreenElement)document.exitFullscreen().catch(()=>{});
    focusFullscreen=false;
  }
  function allowTab(next){if(focusSession?.mode==='screen'&&next!==focusSession.tab){app.toast('Tela fixada. Pause ou encerre o Pomodoro para trocar de aba.');return false;}return true;}
  function enforceTab(){return focusSession?.mode==='screen'?focusSession.tab:'';}
  function focusStatus(){return focusSession?(focusSession.mode==='screen'?'🔒 Esta tela está fixada':'🔒 Aplicativo fixado'):'';}
  function init(adapter){
    if(app)return;app=adapter;
    document.getElementById('headerNotesBtn')?.addEventListener('click',()=>app.navigate('anotacoes'));
    document.getElementById('headerShortcutsBtn')?.addEventListener('click',openCommands);
    document.addEventListener('keydown',e=>{
      if(e.isComposing||e.repeat)return;
      if((e.ctrlKey||e.metaKey)&&!e.altKey&&!e.shiftKey&&e.key.toLowerCase()==='k'){e.preventDefault();e.stopImmediatePropagation();openCommands();return;}
      if(!e.altKey||!e.shiftKey||e.ctrlKey||e.metaKey)return;
      const key=/^Digit[1-9]$/.test(e.code)?e.code.slice(5):e.key.toLowerCase(),index=tabKeys.indexOf(key);
      if(index>=0&&app.tabs[index]){e.preventDefault();e.stopImmediatePropagation();flush();app.navigate(app.tabs[index][0]);}
      else if(key==='n'){e.preventDefault();newNote();}
      else if(key==='p'){e.preventDefault();document.getElementById('pomodoroFruit')?.click();}
      else if(key===' '){e.preventDefault();app.timer().running?app.pause():app.resume();}
      else if(key==='x'){e.preventDefault();app.reset();}
      else if(key==='i'||key==='o'){e.preventDefault();app.start(key==='i'?25:50);}
    },true);
    window.addEventListener('pagehide',()=>{flush();releaseFocus();});
    window.addEventListener('beforeunload',flush);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)flush();});
    document.addEventListener('fullscreenchange',()=>{if(focusSession&&!document.fullscreenElement){app.pause();releaseFocus();}});
    setInterval(()=>{if(dirty)flush();},60000);checkFocus().catch(()=>{});
  }
  return {mergeNotes,formatNote,init,renderNotes,newNote,flush,focusOptions,bindFocus,beginFocus,releaseFocus,allowTab,enforceTab,focusStatus,tabKeys};
});
