(function(root){
  'use strict';

  const COLORS = [
    { id:'yellow', label:'Amarelo', hex:'#ffe066' },
    { id:'red', label:'Vermelho', hex:'#ff9b9b' },
    { id:'blue', label:'Azul', hex:'#91c8ff' },
  ];
  let popup = null;
  let outsideHandler = null;
  let escapeHandler = null;

  function escapeHtml(value){
    return String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  }
  function colorHex(id){ return (COLORS.find(color => color.id === id) || COLORS[0]).hex; }
  function close(){
    popup?.remove();
    popup = null;
    if(outsideHandler) document.removeEventListener('pointerdown', outsideHandler, true);
    if(escapeHandler) document.removeEventListener('keydown', escapeHandler, true);
    outsideHandler = null;
    escapeHandler = null;
  }
  function injectStyles(){
    if(document.getElementById('skill-highlighter-styles')) return;
    const style = document.createElement('style');
    style.id = 'skill-highlighter-styles';
    style.textContent = `
      .skill-hl-popup{position:fixed;z-index:4200;width:min(330px,calc(100vw - 20px));padding:14px;border:1px solid rgba(255,255,255,.12);border-radius:15px;background:#20242b;color:#fff;box-shadow:0 18px 55px rgba(5,13,20,.38);font:13px/1.35 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .skill-hl-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.skill-hl-head strong{font-size:13px}.skill-hl-close{border:0;background:transparent;color:#cfd5de;font-size:20px;line-height:1;cursor:pointer;padding:0 3px}
      .skill-hl-colors{display:flex;align-items:center;gap:9px;margin-bottom:11px}.skill-hl-colors>span{color:#bfc6d0;font-size:11px;margin-right:auto}.skill-hl-swatch{width:27px;height:27px;border:2px solid rgba(255,255,255,.42);border-radius:50%;cursor:pointer;padding:0;transition:.15s}.skill-hl-swatch:hover{transform:scale(1.08);border-color:#fff}.skill-hl-swatch.active{border-color:#fff;box-shadow:0 0 0 3px rgba(255,255,255,.16)}
      .skill-hl-note{display:block;width:100%;min-height:66px;max-height:150px;resize:vertical;box-sizing:border-box;border:1px solid rgba(255,255,255,.16);border-radius:10px;background:#15191f;color:#fff;padding:9px 10px;outline:0;font:12px/1.45 inherit}.skill-hl-note:focus{border-color:#91c8ff}.skill-hl-note::placeholder{color:#87909d}
      .skill-hl-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:11px}.skill-hl-actions button{border:0;border-radius:9px;padding:8px 12px;font-weight:750;cursor:pointer}.skill-hl-save{background:#f4f6f8;color:#20242b}.skill-hl-delete{margin-right:auto;background:rgba(255,111,111,.13);color:#ffb0b0}.skill-hl-has-note{outline:1px dotted rgba(22,40,55,.48);outline-offset:2px}
      .skill-hl-guide{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 22px;padding:12px 14px;border:1px solid rgba(39,101,91,.2);border-radius:12px;background:rgba(39,101,91,.065);color:#526763;font:12px/1.4 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.skill-hl-guide strong{color:#205f56}.skill-hl-guide-colors{display:flex;gap:5px}.skill-hl-guide-colors i{display:block;width:14px;height:14px;border-radius:50%;border:1px solid rgba(20,35,38,.16)}.skill-hl-guide small{font-size:11px;color:inherit}.skill-hl-guide b{margin-left:auto;color:#205f56;font-size:11px}
      @media(max-width:560px){.skill-hl-popup{left:10px!important;right:10px!important;bottom:10px!important;top:auto!important;width:auto}}
    `;
    document.head.appendChild(style);
  }
  function open(options){
    injectStyles();
    close();
    let selectedColor = COLORS.some(color => color.id === options.color) ? options.color : 'yellow';
    const panel = document.createElement('div');
    panel.className = 'skill-hl-popup';
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-label', options.editing ? 'Editar marcação' : 'Criar marcação');
    panel.innerHTML = `<div class="skill-hl-head"><strong>${options.editing ? 'Editar marcação' : 'Salvar marcação'}</strong><button type="button" class="skill-hl-close" aria-label="Fechar">×</button></div>
      <div class="skill-hl-colors"><span>Cor</span>${COLORS.map(color => `<button type="button" class="skill-hl-swatch ${color.id === selectedColor ? 'active' : ''}" data-skill-hl-color="${color.id}" style="background:${color.hex}" aria-label="${color.label}" title="${color.label}"></button>`).join('')}</div>
      <textarea class="skill-hl-note" maxlength="1000" placeholder="Comentário opcional…">${escapeHtml(options.note || '')}</textarea>
      <div class="skill-hl-actions">${options.onDelete ? '<button type="button" class="skill-hl-delete">Excluir</button>' : ''}<button type="button" class="skill-hl-save">Salvar</button></div>`;
    document.body.appendChild(panel);
    popup = panel;
    const rect = options.rect || { left:window.innerWidth / 2, right:window.innerWidth / 2, top:window.innerHeight / 2, bottom:window.innerHeight / 2, width:0 };
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    panel.style.left = Math.max(10, Math.min(window.innerWidth - width - 10, rect.left + (rect.width || 0) / 2 - width / 2)) + 'px';
    panel.style.top = (rect.top > height + 14 ? rect.top - height - 10 : Math.min(window.innerHeight - height - 10, rect.bottom + 10)) + 'px';
    panel.querySelectorAll('[data-skill-hl-color]').forEach(button => button.addEventListener('click', event => {
      event.stopPropagation();
      selectedColor = button.dataset.skillHlColor;
      panel.querySelectorAll('[data-skill-hl-color]').forEach(item => item.classList.toggle('active', item === button));
    }));
    panel.querySelector('.skill-hl-save').addEventListener('click', event => {
      event.stopPropagation();
      const note = panel.querySelector('.skill-hl-note').value.trim();
      options.onSave?.(selectedColor, note);
      close();
    });
    panel.querySelector('.skill-hl-delete')?.addEventListener('click', event => { event.stopPropagation(); options.onDelete?.(); close(); });
    panel.querySelector('.skill-hl-close').addEventListener('click', close);
    panel.addEventListener('pointerdown', event => event.stopPropagation());
    outsideHandler = event => { if(popup && !popup.contains(event.target)) close(); };
    escapeHandler = event => { if(event.key === 'Escape') close(); };
    setTimeout(() => document.addEventListener('pointerdown', outsideHandler, true), 0);
    document.addEventListener('keydown', escapeHandler, true);
    return panel;
  }

  function guideHtml(){
    injectStyles();
    return `<div class="skill-hl-guide" aria-label="Marca-texto disponível"><strong>✒ Marca-texto</strong><span class="skill-hl-guide-colors" aria-hidden="true">${COLORS.map(color => `<i style="background:${color.hex}"></i>`).join('')}</span><small>Selecione um trecho para escolher a cor e escrever um comentário.</small><b>Salvamento automático</b></div>`;
  }

  root.SkillHighlighter = { COLORS, colorHex, guideHtml, open, close };
})(typeof window !== 'undefined' ? window : globalThis);
