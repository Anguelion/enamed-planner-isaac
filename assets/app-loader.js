(function initAppLoader(){
  'use strict';

  const SUPABASE_URL='https://wbxzptiacftymhvfkiyx.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY='sb_publishable_XrBwqjkwlt4Mb4rdmE-xVw_7Vt3euvP';
  const SUPABASE_CLIENT_KEY='__SOQUEROMED_SUPABASE_CLIENT__';
  const VERSION='20260930-7';
  const isLocal=location.protocol==='file:' || ['localhost','127.0.0.1','::1'].includes(location.hostname);
  let bootPromise=null;
  let authClient=null;

  const versioned=path=>`${path}?v=${VERSION}`;
  const loadStyle=href=>new Promise((resolve,reject)=>{
    if(document.querySelector(`link[href^="${href}"]`)) { resolve(); return; }
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=versioned(href);
    link.onload=resolve;
    link.onerror=()=>reject(new Error(`Falha ao carregar ${href}`));
    document.head.appendChild(link);
  });
  const loadScript=src=>new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=versioned(src);
    script.async=false;
    script.onload=resolve;
    script.onerror=()=>reject(new Error(`Falha ao carregar ${src}`));
    document.body.appendChild(script);
  });
  const setMessage=value=>{
    const node=document.getElementById('authMessage');
    if(node) node.textContent=value;
  };

  function showAuthenticatedShell(){
    document.body.classList.remove('auth-locked');
    document.getElementById('authPanel')?.classList.add('hidden');
  }

  function showLoginShell(){
    document.body.classList.add('auth-locked');
    document.getElementById('authPanel')?.classList.remove('hidden');
  }

  function registerServiceWorker(){
    if(!('serviceWorker' in navigator) || !(location.protocol==='https:' || isLocal)) return;
    const hadController=Boolean(navigator.serviceWorker.controller);
    if(hadController) {
      let refreshing=false;
      navigator.serviceWorker.addEventListener('controllerchange',()=>{
        if(refreshing) return;
        refreshing=true;
        location.reload();
      },{once:true});
    }
    navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'}).then(registration=>registration.update()).catch(()=>{});
  }

  function scheduleMascot(){
    if(!window.ENAMED_PERSONAL_UI.read(window.localStorage).mascot) return;
    if(window.__personalMascotScheduled) return;
    window.__personalMascotScheduled=true;
    const load=()=>Promise.all([loadStyle('assets/mascote-ia.css'),loadScript('assets/mascote-ia.js')]).catch(error=>console.warn('Tutor não carregado:',error));
    if('requestIdleCallback' in window) requestIdleCallback(load,{timeout:3500});
    else setTimeout(load,900);
  }

  function bootFullApp(){
    if(bootPromise) return bootPromise;
    showAuthenticatedShell();
    document.body.classList.add('app-loading','authenticated');
    const form=document.getElementById('authForm');
    if(form && form.__appLoaderSubmit) form.removeEventListener('submit',form.__appLoaderSubmit);
    bootPromise=Promise.all([
      loadStyle('assets/planner.css'),
      loadStyle('assets/planner-refresh.css')
    ]).then(async()=>{
      for(const script of [
        'question_bank/index.js',
        'assets/personal-ui.js',
        'assets/app-icons.js',
        'assets/gamification.js',
        'assets/planner-ux.js',
        'assets/skill-highlighter.js',
        'assets/caso-do-dia.js',
        'assets/planner.js'
      ]) await loadScript(script);
      window.ENAMED_ICONS?.hydrateIcons(document);
      document.body.classList.remove('app-loading','authenticated');
      scheduleMascot();
    }).catch(error=>{
      bootPromise=null;
      document.body.classList.remove('app-loading','authenticated');
      showLoginShell();
      setMessage('Não foi possível abrir o aplicativo. Atualize a página e tente novamente.');
      console.error('Falha no carregamento do aplicativo:',error);
      throw error;
    });
    return bootPromise;
  }

  async function handleLogin(event){
    event.preventDefault();
    if(!authClient) { setMessage('O serviço de acesso está indisponível. Tente novamente.'); return; }
    const email=document.getElementById('authEmail')?.value.trim() || '';
    const password=document.getElementById('authPassword')?.value || '';
    if(!email || !password) { setMessage('Informe seu e-mail e sua senha.'); return; }
    const button=document.getElementById('signInBtn');
    if(button) button.disabled=true;
    setMessage('Entrando…');
    try {
      const {data,error}=await authClient.auth.signInWithPassword({email,password});
      if(error) { setMessage('Não foi possível entrar. Confira o e-mail e a senha e tente novamente.'); return; }
      if(!data?.session) { setMessage('A conta respondeu, mas a sessão não foi confirmada. Tente novamente.'); return; }
      setMessage('Conta conectada. Preparando seu plano…');
      showAuthenticatedShell();
      await bootFullApp();
    } catch(error) {
      console.error('Falha no acesso:',error);
      setMessage('Não foi possível conectar agora. Confira sua internet e tente novamente.');
    } finally {
      if(button) button.disabled=false;
    }
  }

  async function start(){
    registerServiceWorker();
    if(isLocal) { await bootFullApp(); return; }
    if(!window.supabase?.createClient) { setMessage('O serviço de acesso não carregou. Atualize a página.'); return; }
    authClient=window[SUPABASE_CLIENT_KEY] || window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,storage:window.localStorage,storageKey:'soqueromed-auth'}
    });
    window[SUPABASE_CLIENT_KEY]=authClient;
    // Registre antes de getSession(): em alguns WebViews Android a leitura da
    // sessão pode demorar. O evento de login ainda precisa conseguir abrir o app.
    authClient.auth.onAuthStateChange((event,session)=>{
      if(!session || bootPromise || !['INITIAL_SESSION','SIGNED_IN','TOKEN_REFRESHED'].includes(event)) return;
      setMessage('Conta conectada. Preparando seu plano…');
      showAuthenticatedShell();
      setTimeout(()=>bootFullApp().catch(()=>{}),0);
    });
    const form=document.getElementById('authForm');
    if(form) {
      form.__appLoaderSubmit=handleLogin;
      form.addEventListener('submit',handleLogin);
    }
    try {
      const {data}=await authClient.auth.getSession();
      if(data.session) {
        showAuthenticatedShell();
        await bootFullApp();
      } else {
        document.body.classList.remove('app-loading');
        showLoginShell();
      }
    } catch(error) {
      console.error('Falha ao verificar a sessão:',error);
      document.body.classList.remove('app-loading','authenticated');
      showLoginShell();
      setMessage('Não foi possível verificar sua sessão. Tente entrar novamente.');
    }
  }

  window.addEventListener('personal-mascot-enable',scheduleMascot);
  start();
})();
