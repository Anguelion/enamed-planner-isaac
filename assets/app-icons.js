(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  if(root) root.ENAMED_ICONS=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  /** @typedef {'fire'|'water'|'earth'|'air'|'xp'|'simulation'|'success'|'warning'|'error'|'neutral'} IconTone */
  /** @typedef {'duotone'|'regular'} IconWeight */

  const SPRITE_PATH='assets/icons/phosphor-sprite.svg';
  const ICON_MAP=Object.freeze({
    dashboard:{icon:'squares-four',tone:'neutral'}, mission:{icon:'trophy',tone:'xp'}, pending:{icon:'warning-octagon',tone:'warning'},
    video:{icon:'play-circle',tone:'water'}, question:{icon:'brain',tone:'fire'}, flashcard:{icon:'cards-three',tone:'air'},
    reading:{icon:'book-open-text',tone:'earth'}, summary:{icon:'notebook',tone:'earth'}, materials:{icon:'books',tone:'earth'},
    simulation:{icon:'timer',tone:'simulation'}, xp:{icon:'star',tone:'xp'}, achievement:{icon:'medal',tone:'xp'},
    streak:{icon:'fire',tone:'fire'}, settings:{icon:'gear-six',tone:'neutral'}, analysis:{icon:'chart-line-up',tone:'simulation'},
    history:{icon:'clock-counter-clockwise',tone:'neutral'}, feynman:{icon:'chat-centered-text',tone:'earth'},
    upload:{icon:'upload-simple',tone:'neutral'}, download:{icon:'download-simple',tone:'neutral'}, prescription:{icon:'first-aid-kit',tone:'success'}, areas:{icon:'chart-line-up',tone:'water'},
    caderno:{icon:'note-pencil',tone:'error'}, xray:{icon:'bone',tone:'neutral'},
    add:{icon:'plus',tone:'neutral',weight:'regular'}, close:{icon:'x',tone:'neutral',weight:'regular'}, dice:{icon:'dice-five',tone:'simulation'},
    fire:{icon:'fire',tone:'fire'}, water:{icon:'drop',tone:'water'}, earth:{icon:'mountains',tone:'earth'}, air:{icon:'wind',tone:'air'},
    class:{icon:'crown',tone:'xp'}, medal:{icon:'medal',tone:'xp'}, success:{icon:'check-circle',tone:'success'},
    warning:{icon:'warning',tone:'warning'}, error:{icon:'warning-octagon',tone:'error'}, info:{icon:'info',tone:'neutral'},
    time:{icon:'timer',tone:'simulation'}, refresh:{icon:'arrows-clockwise',tone:'neutral',weight:'regular'}, logout:{icon:'sign-out',tone:'neutral',weight:'regular'},
    previous:{icon:'arrow-left',tone:'neutral',weight:'regular'}, next:{icon:'arrow-right',tone:'neutral',weight:'regular'},
    focus:{icon:'arrows-out',tone:'neutral',weight:'regular'}, sidebar:{icon:'sidebar-simple',tone:'neutral',weight:'regular'},
    flag:{icon:'flag',tone:'warning',weight:'regular'}, edit:{icon:'pencil-simple',tone:'neutral',weight:'regular'},
    delete:{icon:'trash',tone:'error',weight:'regular'}, pause:{icon:'pause',tone:'neutral',weight:'regular'},
    play:{icon:'play',tone:'water',weight:'regular'}, save:{icon:'floppy-disk',tone:'success',weight:'regular'},
    decrease:{icon:'minus',tone:'neutral',weight:'regular'}, font:{icon:'text-aa',tone:'neutral',weight:'regular'},
    theme:{icon:'moon-stars',tone:'neutral'}, light:{icon:'sun',tone:'xp'}, energy:{icon:'lightning',tone:'xp'},
    target:{icon:'target',tone:'fire'}, trend:{icon:'trend-up',tone:'success'}, calendar:{icon:'calendar-check',tone:'water'},
    tasks:{icon:'list-checks',tone:'success'}, medical:{icon:'stethoscope',tone:'water'}, heart:{icon:'heart',tone:'error'}, graduation:{icon:'graduation-cap',tone:'simulation'},
    sparkle:{icon:'sparkle',tone:'xp'}, shield:{icon:'shield-check',tone:'success'}
  });

  const LEGACY_MAP=Object.freeze({
    alert:'pending',route:'feynman',trophy:'mission',brain:'question',cards:'flashcard',library:'materials',timer:'simulation',
    chart:'areas',insight:'analysis',message:'feynman',plus:'add',x:'close'
  });
  const RPG_ASSET_MAP=Object.freeze({
    fire:'assets/rpg/element-fire.svg',water:'assets/rpg/element-water.svg',earth:'assets/rpg/element-earth.svg',air:'assets/rpg/element-air.svg',
    medal:'assets/rpg/medal-block.svg',class:'assets/rpg/class-crown.svg',rarity:'assets/rpg/rarity-gem.svg',
    aldeao:'assets/rpg/classes/aldeao.png',aprendiz:'assets/rpg/classes/aprendiz.png',escudeiro:'assets/rpg/classes/escudeiro.png',
    soldado:'assets/rpg/classes/soldado.png',cavaleiro:'assets/rpg/classes/cavaleiro.png',capitao:'assets/rpg/classes/capitao.png',
    barao:'assets/rpg/classes/barao.png',duque:'assets/rpg/classes/duque.png',rei:'assets/rpg/classes/rei.png',imperador:'assets/rpg/classes/imperador.png'
  });

  function escapeAttribute(value){return String(value??'').replace(/[&<>'"]/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));}
  function resolveIcon(name){const semantic=LEGACY_MAP[name]||name;return {semantic,...(ICON_MAP[semantic]||ICON_MAP.info)};}

  /**
   * Componente de ícone central da aplicação.
   * @param {string} name função semântica registrada em ICON_MAP
   * @param {{tone?:IconTone,weight?:IconWeight,label?:string,decorative?:boolean,size?:number|string,className?:string}} options
   */
  function AppIcon(name,options={}){
    const resolved=resolveIcon(name);
    const tone=options.tone||resolved.tone||'neutral';
    const weight=options.weight||resolved.weight||'duotone';
    const label=String(options.label||'').trim();
    const decorative=options.decorative!==false && !label;
    const size=options.size?` style="--icon-size:${escapeAttribute(options.size)}${typeof options.size==='number'?'px':''}"`:'';
    const className=['app-icon',`app-icon--${tone}`,`app-icon--${weight}`,options.className||''].filter(Boolean).join(' ');
    const accessibility=decorative?'aria-hidden="true" focusable="false"':`role="img" aria-label="${escapeAttribute(label)}"`;
    return `<svg class="${escapeAttribute(className)}"${size} ${accessibility}><use href="${SPRITE_PATH}#ph-${escapeAttribute(resolved.icon)}-${weight}"></use></svg>`;
  }

  /** Componente para assets RPG multicoloridos locais. */
  function RpgAsset(name,options={}){
    const source=RPG_ASSET_MAP[name]||RPG_ASSET_MAP.medal;
    const label=String(options.label||'').trim();
    const size=Number(options.size)||32;
    const width=Number(options.width)||size;
    const height=Number(options.height)||size;
    const className=['rpg-asset',options.className||''].filter(Boolean).join(' ');
    return `<img class="${escapeAttribute(className)}" src="${source}" width="${width}" height="${height}" alt="${escapeAttribute(label)}"${label?'':' aria-hidden="true"'} loading="eager" decoding="async">`;
  }

  function hydrateIcons(scope){
    const root=scope||globalThis.document;
    if(!root?.querySelectorAll) return;
    root.querySelectorAll('[data-app-icon]').forEach(element=>{
      const label=element.getAttribute('aria-label')||'';
      element.innerHTML=AppIcon(element.dataset.appIcon,{weight:element.dataset.iconWeight||undefined,label:element.dataset.iconStandalone==='true'?label:'',decorative:element.dataset.iconStandalone!=='true'});
    });
  }

  if(typeof document!=='undefined') document.addEventListener('DOMContentLoaded',()=>hydrateIcons(document));

  return {AppIcon,RpgAsset,hydrateIcons,ICON_MAP,LEGACY_MAP,RPG_ASSET_MAP,SPRITE_PATH,resolveIcon};
});
