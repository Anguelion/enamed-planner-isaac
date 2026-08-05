'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// planner.js nao e modular (sem exports) e depende de globais de navegador.
// Este sandbox fornece stubs minimos e permissivos apenas para permitir que o
// arquivo termine de carregar (topo do arquivo registra listeners e pega
// elementos do DOM); nenhuma funcao de rede/DOM real e exercida pelos testes.
function makeElementStub() {
  const el = {};
  return new Proxy(el, {
    get(target, prop) {
      if(prop in target) return target[prop];
      if(prop === 'classList') return { toggle(){}, add(){}, remove(){}, contains(){ return false; } };
      if(prop === 'dataset') return {};
      if(prop === 'style') return {};
      const noopMethods = ['addEventListener','removeEventListener','setAttribute','getAttribute','removeAttribute','appendChild','removeChild','append','remove','focus','blur','click','scrollIntoView','setSelectionRange'];
      if(noopMethods.includes(prop)) return () => {};
      if(prop === 'matches' || prop === 'closest') return () => false;
      if(prop === 'querySelector') return () => null;
      if(prop === 'querySelectorAll') return () => [];
      if(prop === 'cloneNode') return () => makeElementStub();
      return undefined;
    },
    set(target, prop, value) { target[prop] = value; return true; }
  });
}

function extractSeedJson(root) {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tagMatch = html.match(/<script[^>]*id=["']seed["'][^>]*>/);
  const start = html.indexOf(tagMatch[0]) + tagMatch[0].length;
  const end = html.indexOf('</script>', start);
  return html.slice(start, end);
}

function loadPlannerSandbox({ origin = 'http://localhost:8766' } = {}) {
  const root = path.resolve(__dirname, '..');
  const seedJson = extractSeedJson(root);
  const storage = () => {
    const map = new Map();
    return {
      getItem: key => (map.has(key) ? map.get(key) : null),
      setItem: (key, value) => { map.set(key, String(value)); },
      removeItem: key => { map.delete(key); }
    };
  };
  const documentStub = {
    getElementById: id => id === 'seed' ? { textContent: seedJson } : makeElementStub(),
    querySelector: () => makeElementStub(),
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
    createElement: () => makeElementStub(),
    head: makeElementStub(),
    body: makeElementStub(),
    hidden: false,
    visibilityState: 'visible',
    activeElement: null
  };
  const originUrl = new URL(origin);
  const locationStub = { protocol: originUrl.protocol, hostname: originUrl.hostname, search: '', hash: '', href: `${origin}/`, origin };
  const historyStub = {
    state: null,
    pushState(state) { this.state = state; },
    replaceState(state) { this.state = state; },
    back() {},
    forward() {}
  };
  const sandbox = {
    window: {},
    document: documentStub,
    navigator: { serviceWorker: undefined },
    location: locationStub,
    localStorage: storage(),
    sessionStorage: storage(),
    history: historyStub,
    console,
    URLSearchParams,
    URL,
    Date,
    Math,
    JSON,
    crypto: globalThis.crypto,
    setTimeout, clearTimeout, setInterval, clearInterval,
    requestAnimationFrame: cb => setTimeout(cb, 0),
    fetch: async () => ({ ok: false, status: 599, json: async () => ({}), text: async () => '' }),
    structuredClone: globalThis.structuredClone,
    Intl
  };
  sandbox.window.location = locationStub;
  sandbox.window.history = historyStub;
  sandbox.window.addEventListener = () => {};
  sandbox.window.removeEventListener = () => {};
  sandbox.window.supabase = undefined;
  sandbox.window.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
  sandbox.window.getComputedStyle = () => ({ getPropertyValue: () => '' });
  sandbox.window.scrollTo = () => {};
  sandbox.window.getSelection = () => ({ toString: () => '', rangeCount: 0, isCollapsed: true, removeAllRanges(){}, getRangeAt(){ return null; } });
  sandbox.window.innerWidth = 1280;
  sandbox.window.innerHeight = 800;
  sandbox.self = sandbox.window;
  const context = vm.createContext(sandbox);

  const uxSource = fs.readFileSync(path.join(root, 'assets/planner-ux.js'), 'utf8');
  vm.runInContext(uxSource, context, { filename: 'planner-ux.js' });
  const gamificationSource = fs.readFileSync(path.join(root, 'assets/gamification.js'), 'utf8');
  vm.runInContext(gamificationSource, context, { filename: 'gamification.js' });
  // O wrapper UMD de cada arquivo anexa em `root.ENAMED_X`, e `root` resolve para
  // o proprio objeto de contexto (globalThis dentro do vm), nao para `window`.
  sandbox.window.ENAMED_PLANNER_UX = context.ENAMED_PLANNER_UX;
  sandbox.window.ENAMED_GAMIFICATION = context.ENAMED_GAMIFICATION;

  let plannerSource = fs.readFileSync(path.join(root, 'assets/planner.js'), 'utf8');
  // `let`/`const` de topo de arquivo nao viram propriedades do objeto global
  // do vm (isso reflete o comportamento real do JS em <script> classicas).
  // Para os testes conseguirem inspecionar/ajustar `state` e `questionBank`
  // (ambas `let` internas), expomos getters/setters logo apos a declaracao,
  // dentro do MESMO script, para compartilhar o escopo lexical.
  const anchor = 'let state = loadState();';
  if(!plannerSource.includes(anchor)) throw new Error('planner-sandbox: ancora "let state = loadState();" nao encontrada — planner.js mudou de forma inesperada.');
  plannerSource = plannerSource.replace(anchor, `${anchor}\nglobalThis.__getState=()=>state;\nglobalThis.__setState=(value)=>{state=value;};\nglobalThis.__getQuestionBank=()=>questionBank;\nglobalThis.__setQuestionBank=(value)=>{questionBank=value;};\n`);
  const uiObjAnchor = /let ui = \{[^]*?\};\r?\n/;
  if(!uiObjAnchor.test(plannerSource)) throw new Error('planner-sandbox: ancora do objeto ui nao encontrada — planner.js mudou de forma inesperada.');
  plannerSource = plannerSource.replace(uiObjAnchor, match => `${match}globalThis.__getUi=()=>ui;\n`);
  const syncAnchor = "const CLOUD_SYNC_ALLOWED = KNOWN_SYNC_ORIGINS.includes(location.origin) || new URLSearchParams(location.search).get('allowSync') === '1';";
  if(!plannerSource.includes(syncAnchor)) throw new Error('planner-sandbox: ancora de CLOUD_SYNC_ALLOWED nao encontrada — planner.js mudou de forma inesperada.');
  plannerSource = plannerSource.replace(syncAnchor, `${syncAnchor}\nglobalThis.__getCloudSyncAllowed=()=>CLOUD_SYNC_ALLOWED;\nglobalThis.__getKnownSyncOrigins=()=>KNOWN_SYNC_ORIGINS;\n`);
  // Mesma tecnica do anchor de `state`: expoe `let`s internas que os testes
  // desta sessao precisam ler/escrever diretamente (nao sao propriedades do
  // objeto global do vm porque `let`/`var` de topo de <script> classica nao viram
  // propriedades enumeraveis do global, exceto `var`, que vira mas sem setter
  // dedicado — por uniformidade expomos todas via getter/setter explicito).
  const uiAnchor = 'let studyTimeTracker = loadStudyTimerSession();';
  if(!plannerSource.includes(uiAnchor)) throw new Error('planner-sandbox: ancora de studyTimeTracker nao encontrada — planner.js mudou de forma inesperada.');
  plannerSource = plannerSource.replace(uiAnchor, `${uiAnchor}\nglobalThis.__getStudyTimeTracker=()=>studyTimeTracker;\nglobalThis.__setStudyTimeTracker=(value)=>{studyTimeTracker=value;};\n`);
  const cloudDirtyAnchor = 'let cloudDirty = false;';
  if(!plannerSource.includes(cloudDirtyAnchor)) throw new Error('planner-sandbox: ancora de cloudDirty nao encontrada — planner.js mudou de forma inesperada.');
  plannerSource = plannerSource.replace(cloudDirtyAnchor, `${cloudDirtyAnchor}\nglobalThis.__getCloudDirty=()=>cloudDirty;\nglobalThis.__setCloudDirty=(value)=>{cloudDirty=value;};\n`);
  const localBackupsAnchor = 'let localBackups = loadLocalBackups();';
  if(!plannerSource.includes(localBackupsAnchor)) throw new Error('planner-sandbox: ancora de localBackups nao encontrada — planner.js mudou de forma inesperada.');
  plannerSource = plannerSource.replace(localBackupsAnchor, `${localBackupsAnchor}\nglobalThis.__getLocalBackups=()=>localBackups;\nglobalThis.__setLocalBackups=(value)=>{localBackups=value;};\n`);
  const retryTimerAnchor = 'let cloudRetryTimer = null;';
  if(!plannerSource.includes(retryTimerAnchor)) throw new Error('planner-sandbox: ancora de cloudRetryTimer nao encontrada — planner.js mudou de forma inesperada.');
  plannerSource = plannerSource.replace(retryTimerAnchor, `${retryTimerAnchor}\nglobalThis.__getCloudRetryDelay=()=>cloudSyncRetryDelayMs;\nglobalThis.__setCloudRetryDelay=(value)=>{cloudSyncRetryDelayMs=value;};\nglobalThis.__getCloudRetryTimer=()=>cloudRetryTimer;\nglobalThis.__clearCloudRetryTimer=()=>{clearTimeout(cloudRetryTimer);cloudRetryTimer=null;};\n`);
  try {
    vm.runInContext(plannerSource, context, { filename: 'planner.js' });
  } catch(error) {
    // As declaracoes de funcao no topo do arquivo ja foram hoisted e ficam
    // disponiveis mesmo que o bootstrap final (render() inicial, timers,
    // fetch de dados) falhe por causa de um stub de DOM incompleto. So
    // avisamos, porque isso nao afeta as funcoes puras que os testes chamam.
    console.warn('[planner-sandbox] bootstrap final nao concluiu (esperado no sandbox):', error.message);
  }
  return context;
}

module.exports = { loadPlannerSandbox };
