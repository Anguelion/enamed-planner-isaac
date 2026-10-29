'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function classList(initial = []) {
  const values = new Set(initial);
  return {
    add: (...names) => names.forEach(name => values.add(name)),
    remove: (...names) => names.forEach(name => values.delete(name)),
    contains: name => values.has(name),
    values
  };
}

function createAuthHarness(authOverrides = {}) {
  const root = path.resolve(__dirname, '..');
  const source = fs.readFileSync(path.join(root, 'assets/app-loader.js'), 'utf8');
  const bodyClasses = classList(['offline-priority', 'auth-locked', 'app-loading']);
  const panelClasses = classList();
  const listeners = new Map();
  const appendedScripts = [];
  let authStateCallback = null;
  let createClientCalls = 0;

  const elements = {
    authPanel: { classList: panelClasses },
    authMessage: { textContent: '' },
    authEmail: { value: 'aluno@example.com' },
    authPassword: { value: 'segredo' },
    signInBtn: { disabled: false },
    authForm: {
      addEventListener(type, handler) { listeners.set(type, handler); },
      removeEventListener(type, handler) { if(listeners.get(type) === handler) listeners.delete(type); }
    }
  };
  const body = {
    classList: bodyClasses,
    appendChild(node) {
      appendedScripts.push(node.src);
      setTimeout(() => node.onload?.(), 0);
    }
  };
  const document = {
    body,
    head: { appendChild(node) { setTimeout(() => node.onload?.(), 0); } },
    getElementById: id => elements[id] || null,
    querySelector: () => null,
    createElement: () => ({})
  };
  const authClient = {
    auth: {
      onAuthStateChange(callback) { authStateCallback = callback; return { data: { subscription: { unsubscribe() {} } } }; },
      getSession() { return new Promise(() => {}); },
      signInWithPassword: async () => ({ data: { session: { user: { id: 'usuario-1' } } }, error: null }),
      ...authOverrides
    }
  };
  const window = {
    localStorage: {},
    supabase: { createClient() { createClientCalls += 1; return authClient; } },
    requestIdleCallback() {}
  };
  window.addEventListener = () => {};
  window.ENAMED_PERSONAL_UI = require('../assets/personal-ui.js');
  const context = vm.createContext({
    window,
    document,
    navigator: {},
    location: { protocol: 'https:', hostname: 'enamed-planner-isaac.pages.dev', reload() {} },
    console: { ...console, error() {} },
    setTimeout,
    clearTimeout,
    requestIdleCallback: window.requestIdleCallback
  });

  vm.runInContext(source, context, { filename: 'app-loader.js' });
  assert.equal(createClientCalls, 1);
  assert.equal(window.__SOQUEROMED_SUPABASE_CLIENT__, authClient, 'o cliente deve ficar disponível para o planner reutilizar');
  assert.equal(typeof authStateCallback, 'function', 'o listener precisa existir antes de getSession terminar');

  return { elements, listeners, appendedScripts, bodyClasses, panelClasses, authStateCallback };
}

test('login abre o aplicativo mesmo quando getSession fica pendente no Android', async () => {
  const { appendedScripts, bodyClasses, panelClasses, authStateCallback } = createAuthHarness();

  authStateCallback('SIGNED_IN', { user: { id: 'usuario-1' }, access_token: 'token' });
  for(let attempt=0; attempt<50 && !appendedScripts.some(src => src?.includes('assets/planner.js')); attempt+=1) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  await new Promise(resolve => setTimeout(resolve, 20));

  assert.ok(appendedScripts.some(src => /^assets\/planner\.js\?v=[\w-]+$/.test(src)), JSON.stringify(appendedScripts));
  assert.ok(appendedScripts.findIndex(src=>src?.startsWith('assets/study-workspace.js?'))<appendedScripts.findIndex(src=>src?.startsWith('assets/planner.js?')));
  assert.equal(bodyClasses.contains('auth-locked'), false);
  assert.equal(bodyClasses.contains('app-loading'), false);
  assert.equal(panelClasses.contains('hidden'), true);
});

const failureCases = [
  { name: 'DNS ou rede indisponível', error: { name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' }, expected: /conectar ao serviço de acesso/ },
  { name: 'erro de rede retornado pelo navegador', error: { name: 'TypeError', message: 'Failed to fetch' }, expected: /conectar ao serviço de acesso/ },
  { name: 'serviço em manutenção', error: { status: 503, message: 'Service unavailable' }, expected: /temporariamente indisponível/ },
  { name: 'cota do serviço', error: { status: 402, message: 'Payment required' }, expected: /temporariamente indisponível/ },
  { name: 'limite de tentativas', error: { status: 429 }, expected: /Muitas tentativas/ },
  { name: 'senha incorreta', error: { status: 400, code: 'invalid_credentials' }, expected: /Confira o e-mail e a senha/ },
  { name: 'credenciais inválidas na API anterior', error: { status: 400, message: 'Invalid login credentials' }, expected: /Confira o e-mail e a senha/ },
  { name: 'e-mail não confirmado', error: { status: 403, code: 'email_not_confirmed' }, expected: /Confirme seu e-mail/ },
  { name: 'erro não identificado', error: { status: 400, message: 'Unexpected response' }, expected: /Não foi possível concluir o acesso/ }
];

for(const scenario of failureCases) {
  test(`login informa corretamente: ${scenario.name}`, async () => {
    const { elements, listeners, appendedScripts, bodyClasses } = createAuthHarness({
      signInWithPassword: async () => ({ data: null, error: scenario.error })
    });
    await listeners.get('submit')({ preventDefault() {} });
    assert.match(elements.authMessage.textContent, scenario.expected);
    assert.equal(elements.signInBtn.disabled, false, 'deve permitir tentar novamente');
    assert.equal(bodyClasses.contains('auth-locked'), true, 'falhas não liberam o app');
    assert.equal(appendedScripts.length, 0);
  });
}

test('falha de rede lançada libera o botão e permite um login posterior', async () => {
  let attempts = 0;
  const { elements, listeners, appendedScripts, bodyClasses } = createAuthHarness({
    signInWithPassword: async () => {
      attempts += 1;
      if(attempts === 1) throw new TypeError('Failed to fetch');
      return { data: { session: { user: { id: 'usuario-1' } } }, error: null };
    }
  });
  const submit = listeners.get('submit');
  await submit({ preventDefault() {} });
  assert.match(elements.authMessage.textContent, /conectar ao serviço de acesso/);
  assert.equal(elements.signInBtn.disabled, false);
  await submit({ preventDefault() {} });
  assert.ok(appendedScripts.some(src => src.startsWith('assets/planner.js?')));
  assert.equal(bodyClasses.contains('auth-locked'), false);
});

test('erro ao recuperar sessão informa indisponibilidade e mantém login disponível', async () => {
  const { elements, listeners, bodyClasses } = createAuthHarness({
    getSession: async () => ({ data: null, error: { name: 'AuthRetryableFetchError', status: 0 } })
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.match(elements.authMessage.textContent, /conectar ao serviço de acesso/);
  assert.equal(bodyClasses.contains('auth-locked'), true);
  assert.equal(bodyClasses.contains('app-loading'), false);
  assert.equal(typeof listeners.get('submit'), 'function');
});
