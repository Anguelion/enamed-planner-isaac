(function(root){
  'use strict';

  const BASE = 'assets/anatomia/';
  const SECTIONS = ['Introdução','Sistemas','Regiões','Neuroanatomia','Radiologia','Patologia'];
  const SECTION_META = {
    'Introdução': { label:'Fundamentos', note:'Linguagem, planos, eixos e organização do corpo.', icon:'graduation' },
    'Sistemas': { label:'Sistemas', note:'Órgãos e aparelhos estudados de forma integrada.', icon:'medical' },
    'Regiões': { label:'Anatomia regional', note:'Cabeça, pescoço, tronco, membros e pelve.', icon:'xray' },
    'Neuroanatomia': { label:'Neuroanatomia', note:'Sistema nervoso central, periférico e sentidos.', icon:'brain' },
    'Radiologia': { label:'Anatomia radiológica', note:'Anatomia aplicada aos exames de imagem.', icon:'xray' },
    'Patologia': { label:'Anatomia clínica', note:'Correlação anatômica com alterações e doenças.', icon:'heart' }
  };
  const articleCache = new Map();
  let catalogPromise = null;
  let bridge = null;
  let host = null;
  let ui = { section:'Todas', status:'all', search:'', articleId:null, limit:24, loading:false, error:'', lightbox:null };

  function defaultState(){
    return { completed:{}, favorites:{}, recent:[], highlights:{}, lastArticleId:null, startedAt:new Date().toISOString() };
  }

  function store(){
    const state = bridge.getState();
    if(!state.anatomia || typeof state.anatomia !== 'object') state.anatomia = defaultState();
    state.anatomia.completed ||= {};
    state.anatomia.favorites ||= {};
    state.anatomia.highlights ||= {};
    state.anatomia.recent = Array.isArray(state.anatomia.recent) ? state.anatomia.recent : [];
    return state.anatomia;
  }

  function save(){ bridge.save(); }
  function esc(value){ return bridge.escapeHtml ? bridge.escapeHtml(value) : String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char])); }
  function icon(name){ return bridge.iconSvg ? bridge.iconSvg(name) : '' }
  function normalize(value){ return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
  function imageUrl(path){ return path ? `${BASE}${String(path).replace(/^\.\.\/\.\.\//,'').replace(/^\//,'')}` : ''; }

  async function loadCatalog(){
    if(!catalogPromise) catalogPromise = fetch(`${BASE}catalog.json`).then(response => {
      if(!response.ok) throw new Error(`Catálogo indisponível (${response.status})`);
      return response.json();
    });
    return catalogPromise;
  }

  function progress(data){
    const completed = data.articles.filter(article => store().completed[article.id]).length;
    return { completed, total:data.articles.length, percent:data.articles.length ? Math.round(completed / data.articles.length * 100) : 0 };
  }

  function sectionArticles(data, section){
    return data.articles.filter(article => section === 'Todas' || article.memberships.some(item => item.section === section));
  }

  function filteredArticles(data){
    const query = normalize(ui.search);
    return sectionArticles(data, ui.section).filter(article => {
      if(ui.status === 'done' && !store().completed[article.id]) return false;
      if(ui.status === 'todo' && store().completed[article.id]) return false;
      if(ui.status === 'favorite' && !store().favorites[article.id]) return false;
      return !query || normalize(`${article.title} ${article.section}`).includes(query);
    });
  }

  function topbar(data){
    const p = progress(data);
    return `<header class="anat-topbar">
      <button class="anat-brand" type="button" data-anat-home aria-label="Página inicial de Anatomia">
        <span class="anat-brand-mark">${icon('xray')}</span><span><small>Habilidade</small><strong>Anatomia</strong></span>
      </button>
      <div class="anat-progress-compact"><span><b>${p.percent}%</b> concluído</span><div><i style="width:${p.percent}%"></i></div></div>
      <button class="anat-icon-button" type="button" data-anat-catalog aria-label="Abrir catálogo" title="Catálogo">${icon('library')}</button>
    </header>`;
  }

  function sectionCard(data, section){
    const articles = sectionArticles(data, section);
    const done = articles.filter(article => store().completed[article.id]).length;
    const meta = SECTION_META[section];
    const cover = articles.find(article => article.cover)?.cover;
    return `<button class="anat-section-card" type="button" data-anat-section="${esc(section)}">
      <span class="anat-section-cover ${cover ? '' : 'is-empty'}" ${cover ? `style="background-image:url('${imageUrl(cover)}')"` : ''}><i>${icon(meta.icon)}</i></span>
      <span class="anat-section-copy"><span class="anat-kicker">${esc(meta.label)}</span><strong>${esc(section)}</strong><small>${esc(meta.note)}</small>
      <span class="anat-section-foot"><b>${articles.length} páginas</b><i>${done}/${articles.length}</i></span></span>
    </button>`;
  }

  function homeView(data){
    const p = progress(data);
    const recent = store().recent.map(id => data.articles.find(article => article.id === id)).filter(Boolean).slice(0,3);
    const next = data.articles.find(article => !store().completed[article.id]) || data.articles[0];
    const heroImages = SECTIONS.map(section => sectionArticles(data, section).find(article => article.cover)).filter(Boolean).slice(0,3);
    return `${topbar(data)}<div class="anat-home">
      <section class="anat-hero">
        <div class="anat-hero-copy"><span class="anat-kicker">Atlas visual · curso completo</span><h1>Conheça o corpo.<br><em>Entenda a clínica.</em></h1>
          <p>Um percurso visual por anatomia humana, organizado do essencial às aplicações clínicas e radiológicas.</p>
          <div class="anat-hero-actions"><button class="anat-primary" type="button" data-anat-open="${next.id}">${p.completed ? 'Continuar estudando' : 'Começar o curso'} ${icon('next')}</button><button class="anat-secondary" type="button" data-anat-catalog>Explorar catálogo</button></div>
          <div class="anat-hero-stats"><span><b>${data.summary.articleCount}</b> páginas</span><span><b>${data.summary.imageCount.toLocaleString('pt-BR')}</b> imagens</span><span><b>${p.percent}%</b> concluído</span></div>
        </div>
        <div class="anat-hero-gallery">${heroImages.map((article,index) => `<button type="button" data-anat-open="${article.id}" class="anat-hero-image image-${index+1}" style="background-image:url('${imageUrl(article.cover)}')"><span>${esc(article.title)}</span></button>`).join('')}</div>
      </section>
      <section class="anat-section-heading"><div><span class="anat-kicker">Percurso de aprendizagem</span><h2>Estude por grandes áreas</h2></div><button type="button" data-anat-catalog>Ver todas as páginas ${icon('next')}</button></section>
      <div class="anat-section-grid">${SECTIONS.map(section => sectionCard(data, section)).join('')}</div>
      ${recent.length ? `<section class="anat-recent"><div class="anat-section-heading"><div><span class="anat-kicker">Retome de onde parou</span><h2>Vistos recentemente</h2></div></div><div class="anat-recent-grid">${recent.map(article => articleCard(article)).join('')}</div></section>` : ''}
    </div>`;
  }

  function articleCard(article){
    const completed = !!store().completed[article.id];
    const favorite = !!store().favorites[article.id];
    return `<article class="anat-article-card ${completed ? 'is-complete' : ''}">
      <button class="anat-card-cover ${article.cover ? '' : 'is-empty'}" type="button" data-anat-open="${article.id}" ${article.cover ? `style="background-image:url('${imageUrl(article.cover)}')"` : ''}><span>${icon(SECTION_META[article.section]?.icon || 'medical')}</span>${completed ? `<i class="anat-done">${icon('success')}</i>` : ''}</button>
      <div class="anat-card-copy"><span class="anat-kicker">${esc(article.section)}</span><h3><button type="button" data-anat-open="${article.id}">${esc(article.title)}</button></h3><div><span>${article.readingMinutes} min · ${article.imageCount} ${article.imageCount === 1 ? 'imagem' : 'imagens'}</span><button type="button" data-anat-favorite="${article.id}" aria-label="${favorite ? 'Remover dos favoritos' : 'Favoritar'}" class="${favorite ? 'active' : ''}">${icon('heart')}</button></div></div>
    </article>`;
  }

  function catalogView(data){
    const list = filteredArticles(data);
    const visible = list.slice(0, ui.limit);
    return `${topbar(data)}<div class="anat-catalog">
      <section class="anat-catalog-head"><div><button class="anat-back-link" type="button" data-anat-home>${icon('previous')} Início</button><span class="anat-kicker">Biblioteca anatômica</span><h1>${ui.section === 'Todas' ? 'Todo o curso' : esc(ui.section)}</h1><p>${list.length} ${list.length === 1 ? 'página encontrada' : 'páginas encontradas'}</p></div>
        <label class="anat-search">${icon('search')}<input type="search" value="${esc(ui.search)}" placeholder="Buscar osso, músculo, órgão…" data-anat-search></label></section>
      <nav class="anat-filter-row" aria-label="Áreas de anatomia"><button class="${ui.section === 'Todas' ? 'active' : ''}" type="button" data-anat-section="Todas">Todas</button>${SECTIONS.map(section => `<button class="${ui.section === section ? 'active' : ''}" type="button" data-anat-section="${esc(section)}">${esc(section)}</button>`).join('')}</nav>
      <nav class="anat-status-row" aria-label="Progresso"><button class="${ui.status === 'all' ? 'active' : ''}" type="button" data-anat-status="all">Todas</button><button class="${ui.status === 'todo' ? 'active' : ''}" type="button" data-anat-status="todo">Para estudar</button><button class="${ui.status === 'done' ? 'active' : ''}" type="button" data-anat-status="done">Concluídas</button><button class="${ui.status === 'favorite' ? 'active' : ''}" type="button" data-anat-status="favorite">Favoritas</button></nav>
      ${visible.length ? `<div class="anat-article-grid">${visible.map(articleCard).join('')}</div>${visible.length < list.length ? `<button class="anat-load-more" type="button" data-anat-more>Mostrar mais <span>${visible.length} de ${list.length}</span></button>` : ''}` : `<div class="anat-empty">${icon('search')}<h2>Nenhuma página encontrada</h2><p>Tente outro termo ou ajuste os filtros.</p></div>`}
    </div>`;
  }

  function cleanArticleHtml(raw, data){
    const documentCopy = new DOMParser().parseFromString(raw, 'text/html');
    documentCopy.querySelectorAll('script,style,iframe,form,nav,link,meta').forEach(node => node.remove());
    documentCopy.querySelectorAll('*').forEach(node => [...node.attributes].forEach(attribute => {
      if(/^on/i.test(attribute.name)) node.removeAttribute(attribute.name);
      if(attribute.name === 'style' && /position\s*:\s*(fixed|sticky)/i.test(attribute.value)) node.removeAttribute('style');
    }));
    documentCopy.querySelectorAll('img').forEach(image => {
      const src = image.getAttribute('src') || '';
      if(src.startsWith('../../media/')) image.src = imageUrl(src);
      image.removeAttribute('srcset');
      image.loading = 'lazy';
      image.decoding = 'async';
      image.setAttribute('data-anat-image', image.src);
    });
    documentCopy.querySelectorAll('a[href]').forEach(link => {
      const href = link.href;
      const match = data.articles.find(article => href.replace(/\/$/,'') === article.originalUrl.replace(/\/$/,''));
      if(match){ link.href = '#'; link.setAttribute('data-anat-open', match.id); }
      else { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
    });
    return documentCopy.body.innerHTML;
  }

  async function fetchArticle(article, data){
    if(articleCache.has(article.id)) return articleCache.get(article.id);
    const response = await fetch(`${BASE}${article.folder}/content.html`);
    if(!response.ok) throw new Error(`Não foi possível abrir esta página (${response.status}).`);
    const html = cleanArticleHtml(await response.text(), data);
    articleCache.set(article.id, html);
    return html;
  }

  function readerView(data, article, html){
    const related = sectionArticles(data, article.section);
    const currentIndex = related.findIndex(item => item.id === article.id);
    const previous = related[currentIndex - 1];
    const next = related[currentIndex + 1];
    const completed = !!store().completed[article.id];
    const favorite = !!store().favorites[article.id];
    return `${topbar(data)}<div class="anat-reader-shell">
      <aside class="anat-reader-nav"><button type="button" data-anat-catalog>${icon('previous')} Voltar ao catálogo</button><span class="anat-kicker">${esc(article.section)}</span><h2>Conteúdo da trilha</h2><div>${related.map((item,index) => `<button type="button" data-anat-open="${item.id}" class="${item.id === article.id ? 'active' : ''} ${store().completed[item.id] ? 'complete' : ''}"><i>${store().completed[item.id] ? icon('success') : index + 1}</i><span>${esc(item.title)}</span></button>`).join('')}</div></aside>
      <section class="anat-reader"><header><div><span class="anat-kicker">${esc(article.section)} · ${article.readingMinutes} min de leitura</span><h1>${esc(article.title)}</h1><p>${article.imageCount} ${article.imageCount === 1 ? 'ilustração anatômica' : 'ilustrações anatômicas'} nesta página</p><small class="anat-highlight-hint">Selecione um trecho para destacar e, se quiser, comentar.</small></div><button type="button" data-anat-favorite="${article.id}" class="anat-reader-favorite ${favorite ? 'active' : ''}">${icon('heart')}<span>${favorite ? 'Favorita' : 'Favoritar'}</span></button></header>
        <article class="anat-content">${html}</article>
        <footer class="anat-reader-footer"><button type="button" data-anat-complete="${article.id}" class="${completed ? 'complete' : ''}">${completed ? icon('success') + ' Página concluída' : 'Marcar como concluída'}</button><nav>${previous ? `<button type="button" data-anat-open="${previous.id}">${icon('previous')} Anterior</button>` : '<span></span>'}${next ? `<button type="button" data-anat-open="${next.id}">Próxima ${icon('next')}</button>` : '<span></span>'}</nav></footer>
      </section></div>${ui.lightbox ? `<div class="anat-lightbox" data-anat-close-lightbox><button type="button" aria-label="Fechar">×</button><img src="${esc(ui.lightbox)}" alt="Imagem anatômica ampliada"></div>` : ''}`;
  }

  function anatomyTextOffset(block, node, offset){
    let total = 0;
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    let current;
    while((current = walker.nextNode())){
      if(current === node) return total + offset;
      total += current.textContent.length;
    }
    return total;
  }
  function wrapAnatomyRange(block, mark, index){
    const start = Math.max(0, Number(mark.s) || 0);
    const end = Math.min(block.textContent.length, Number(mark.e) || 0);
    if(end <= start) return;
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    let total = 0, startNode = null, endNode = null, startOffset = 0, endOffset = 0, node;
    while((node = walker.nextNode())){
      const next = total + node.textContent.length;
      if(!startNode && start >= total && start <= next){ startNode = node; startOffset = start - total; }
      if(end >= total && end <= next){ endNode = node; endOffset = end - total; break; }
      total = next;
    }
    if(!startNode || !endNode) return;
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    const highlight = document.createElement('mark');
    highlight.className = `anat-saved-highlight skill-hl-${mark.c || 'yellow'}${mark.n ? ' skill-hl-has-note' : ''}`;
    highlight.dataset.anatHighlightIndex = index;
    highlight.style.background = root.SkillHighlighter?.colorHex(mark.c) || '#ffe066';
    if(mark.n) highlight.title = mark.n;
    try { highlight.appendChild(range.extractContents()); range.insertNode(highlight); } catch(error) { /* conteúdo importado pode ter estruturas não marcáveis */ }
  }
  function repaintAnatomyArticle(data, article, pageScrollTop){
    host.innerHTML = readerView(data, article, articleCache.get(article.id));
    wireAnatomyHighlighter(data, article);
    const restore = () => { if(document.scrollingElement) document.scrollingElement.scrollTop = pageScrollTop; };
    restore(); requestAnimationFrame(restore);
  }
  function wireAnatomyHighlighter(data, article){
    const content = host.querySelector('.anat-content');
    if(!content || !root.SkillHighlighter) return;
    const articleMarks = store().highlights[article.id] || {};
    const blocks = [...content.querySelectorAll('p,li,h2,h3,h4,blockquote,td,th')].filter(block => block.textContent.trim());
    blocks.forEach((block, blockIndex) => {
      block.dataset.anatHlBlock = blockIndex;
      const marks = Array.isArray(articleMarks[blockIndex]) ? articleMarks[blockIndex] : [];
      marks.map((mark,index) => ({mark,index})).sort((a,b) => (Number(b.mark.s) || 0) - (Number(a.mark.s) || 0)).forEach(item => wrapAnatomyRange(block, item.mark, item.index));
    });
    content.addEventListener('mouseup', () => setTimeout(() => {
      const selection = window.getSelection();
      if(!selection || selection.isCollapsed || !selection.rangeCount) return;
      const range = selection.getRangeAt(0);
      const startElement = range.startContainer.nodeType === 3 ? range.startContainer.parentElement : range.startContainer;
      const endElement = range.endContainer.nodeType === 3 ? range.endContainer.parentElement : range.endContainer;
      const block = startElement?.closest?.('[data-anat-hl-block]');
      if(!block || block !== endElement?.closest?.('[data-anat-hl-block]') || !content.contains(block)) return;
      const start = anatomyTextOffset(block, range.startContainer, range.startOffset);
      const end = anatomyTextOffset(block, range.endContainer, range.endOffset);
      if(start === end || Math.abs(end - start) > 1200) return;
      const rect = range.getBoundingClientRect();
      root.SkillHighlighter.open({ rect, onSave:(color,note) => {
        const pageScrollTop = document.scrollingElement?.scrollTop || window.scrollY || 0;
        const state = store();
        state.highlights[article.id] ||= {};
        state.highlights[article.id][block.dataset.anatHlBlock] ||= [];
        state.highlights[article.id][block.dataset.anatHlBlock].push({ s:Math.min(start,end), e:Math.max(start,end), c:color, n:note });
        selection.removeAllRanges(); save(); repaintAnatomyArticle(data, article, pageScrollTop);
      }});
    }, 0));
    content.querySelectorAll('[data-anat-highlight-index]').forEach(markElement => markElement.addEventListener('click', event => {
      event.stopPropagation();
      const block = markElement.closest('[data-anat-hl-block]');
      const list = store().highlights[article.id]?.[block.dataset.anatHlBlock];
      const index = Number(markElement.dataset.anatHighlightIndex);
      const mark = list?.[index];
      if(!mark) return;
      root.SkillHighlighter.open({ rect:markElement.getBoundingClientRect(), color:mark.c, note:mark.n, editing:true,
        onSave:(color,note) => { const pageScrollTop = document.scrollingElement?.scrollTop || window.scrollY || 0; list[index] = {...mark,c:color,n:note}; save(); repaintAnatomyArticle(data,article,pageScrollTop); },
        onDelete:() => { const pageScrollTop = document.scrollingElement?.scrollTop || window.scrollY || 0; list.splice(index,1); save(); repaintAnatomyArticle(data,article,pageScrollTop); }
      });
    }));
  }

  async function openArticle(id, data){
    const article = data.articles.find(item => item.id === Number(id));
    if(!article) return;
    ui.articleId = article.id;
    ui.loading = true;
    ui.error = '';
    host.innerHTML = `${topbar(data)}<div class="anat-reader-loading"><span></span><h2>Abrindo ${esc(article.title)}</h2><p>Preparando texto e imagens…</p></div>`;
    const currentId = article.id;
    try {
      const html = await fetchArticle(article, data);
      if(ui.articleId !== currentId) return;
      const state = store();
      state.lastArticleId = article.id;
      state.recent = [article.id, ...state.recent.filter(item => item !== article.id)].slice(0, 12);
      save();
      ui.loading = false;
      host.innerHTML = readerView(data, article, html);
      wireAnatomyHighlighter(data, article);
      host.scrollIntoView({ behavior:'smooth', block:'start' });
    } catch(error) {
      ui.loading = false;
      ui.error = error.message;
      host.innerHTML = `${topbar(data)}<div class="anat-empty"><h2>Não consegui abrir esta página</h2><p>${esc(error.message)}</p><button class="anat-primary" type="button" data-anat-catalog>Voltar ao catálogo</button></div>`;
    }
  }

  function renderData(data){
    if(ui.articleId){ openArticle(ui.articleId, data); return; }
    host.innerHTML = ui.section === 'home' ? homeView(data) : catalogView(data);
  }

  function bindEvents(data){
    host.onclick = event => {
      const target = event.target.closest('button,a,img');
      if(!target) return;
      const open = target.closest('[data-anat-open]');
      if(open){ event.preventDefault(); openArticle(open.dataset.anatOpen, data); return; }
      if(target.closest('[data-anat-home]')){ ui = {...ui, section:'home', articleId:null, search:'', status:'all', limit:24}; renderData(data); return; }
      if(target.closest('[data-anat-catalog]')){ ui = {...ui, section:'Todas', articleId:null, limit:24}; renderData(data); return; }
      const section = target.closest('[data-anat-section]');
      if(section){ ui.section = section.dataset.anatSection; ui.articleId = null; ui.limit = 24; renderData(data); return; }
      const status = target.closest('[data-anat-status]');
      if(status){ ui.status = status.dataset.anatStatus; ui.limit = 24; renderData(data); return; }
      const favorite = target.closest('[data-anat-favorite]');
      if(favorite){ const id = Number(favorite.dataset.anatFavorite); store().favorites[id] ? delete store().favorites[id] : store().favorites[id] = new Date().toISOString(); save(); ui.articleId ? openArticle(id, data) : renderData(data); return; }
      const complete = target.closest('[data-anat-complete]');
      if(complete){ const id = Number(complete.dataset.anatComplete); store().completed[id] ? delete store().completed[id] : store().completed[id] = new Date().toISOString(); save(); openArticle(id, data); return; }
      if(target.closest('[data-anat-more]')){ ui.limit += 24; renderData(data); return; }
      const image = target.closest('[data-anat-image]');
      if(image){ ui.lightbox = image.dataset.anatImage; const article = data.articles.find(item => item.id === ui.articleId); host.innerHTML = readerView(data, article, articleCache.get(article.id)); wireAnatomyHighlighter(data, article); return; }
      if(target.closest('[data-anat-close-lightbox]')){ ui.lightbox = null; const article = data.articles.find(item => item.id === ui.articleId); host.innerHTML = readerView(data, article, articleCache.get(article.id)); wireAnatomyHighlighter(data, article); }
    };
    host.oninput = event => {
      if(!event.target.matches('[data-anat-search]')) return;
      ui.search = event.target.value;
      ui.limit = 24;
      const caret = event.target.selectionStart;
      host.innerHTML = catalogView(data);
      const input = host.querySelector('[data-anat-search]');
      input?.focus();
      input?.setSelectionRange(caret, caret);
    };
  }

  async function mount(container, nextBridge){
    host = container;
    bridge = nextBridge;
    store();
    ui.section = 'home';
    host.innerHTML = `<div class="anat-reader-loading"><span></span><h2>Preparando o Atlas de Anatomia</h2><p>Organizando páginas e imagens do curso…</p></div>`;
    try {
      const data = await loadCatalog();
      bindEvents(data);
      renderData(data);
    } catch(error) {
      host.innerHTML = `<div class="anat-empty"><h2>Curso indisponível</h2><p>${esc(error.message)}</p></div>`;
    }
  }

  root.AnatomiaCourse = { defaultState, mount };
})(typeof window !== 'undefined' ? window : globalThis);
