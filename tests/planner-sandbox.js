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
  const sandbox = {
    window: {},
    document: documentStub,
    navigator: { serviceWorker: undefined },
    location: locationStub,
    localStorage: storage(),
    sessionStorage: storage(),
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
  sandbox.window.addEventListener = () => {};
  sandbox.window.removeEventListener = () => {};
  sandbox.window.supabase = undefined;
  sandbox.window.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
  sandbox.window.getComputedStyle = () => ({ getPropertyValue: () => '' });
  sandbox.window.scrollTo = () => {};
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
  const syncAnchor = "const CLOUD_SYNC_ALLOWED = KNOWN_SYNC_ORIGINS.includes(location.origin) || new URLSearchParams(location.search).get('allowSync') === '1';";
  if(!plannerSource.includes(syncAnchor)) throw new Error('planner-sandbox: ancora de CLOUD_SYNC_ALLOWED nao encontrada — planner.js mudou de forma inesperada.');
  plannerSource = plannerSource.replace(syncAnchor, `${syncAnchor}\nglobalThis.__getCloudSyncAllowed=()=>CLOUD_SYNC_ALLOWED;\nglobalThis.__getKnownSyncOrigins=()=>KNOWN_SYNC_ORIGINS;\n`);
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
