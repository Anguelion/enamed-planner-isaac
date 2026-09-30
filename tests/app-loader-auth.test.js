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

test('login abre o aplicativo mesmo quando getSession fica pendente no Android', async () => {
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
      signInWithPassword: async () => ({ data: { session: { user: { id: 'usuario-1' } } }, error: null })
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
    console,
    setTimeout,
    clearTimeout,
    requestIdleCallback: window.requestIdleCallback
  });

  vm.runInContext(source, context, { filename: 'app-loader.js' });
  assert.equal(createClientCalls, 1);
  assert.equal(window.__SOQUEROMED_SUPABASE_CLIENT__, authClient, 'o cliente deve ficar disponível para o planner reutilizar');
  assert.equal(typeof authStateCallback, 'function', 'o listener precisa existir antes de getSession terminar');

  authStateCallback('SIGNED_IN', { user: { id: 'usuario-1' }, access_token: 'token' });
  for(let attempt=0; attempt<50 && !appendedScripts.some(src => src?.includes('assets/planner.js')); attempt+=1) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  await new Promise(resolve => setTimeout(resolve, 20));

  assert.ok(appendedScripts.some(src => src?.includes('assets/planner.js?v=20260930-7')), JSON.stringify(appendedScripts));
  assert.equal(bodyClasses.contains('auth-locked'), false);
  assert.equal(bodyClasses.contains('app-loading'), false);
  assert.equal(panelClasses.contains('hidden'), true);
});
