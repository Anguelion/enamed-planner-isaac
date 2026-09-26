(function initAppLoader(){
  'use strict';

  const SUPABASE_URL='https://wbxzptiacftymhvfkiyx.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY='sb_publishable_XrBwqjkwlt4Mb4rdmE-xVw_7Vt3euvP';
  const VERSION='20260926-6';
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

  function registerServiceWorker(){
    if(!('serviceWorker' in navigator) || !(location.protocol==='https:' || isLocal)) return;
    navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'}).then(registration=>registration.update()).catch(()=>{});
  }

  function scheduleMascot(){
    const load=()=>Promise.all([loadStyle('assets/mascote-ia.css'),loadScript('assets/mascote-ia.js')]).catch(error=>console.warn('Tutor não carregado:',error));
    if('requestIdleCallback' in window) requestIdleCallback(load,{timeout:3500});
    else setTimeout(load,900);
  }

  function bootFullApp(){
    if(bootPromise) return bootPromise;
    document.body.classList.add('app-loading','authenticated');
    const form=document.getElementById('authForm');
    if(form && form.__appLoaderSubmit) form.removeEventListener('submit',form.__appLoaderSubmit);
    bootPromise=Promise.all([
      loadStyle('assets/planner.css'),
      loadStyle('assets/planner-refresh.css')
    ]).then(async()=>{
      for(const script of [
        'question_bank/index.js',
        'assets/app-icons.js',
        'assets/gamification.js',
        'assets/planner-ux.js',
        'assets/skill-highlighter.js',
        'assets/caso-do-dia.js',
        'assets/planner.js'
      ]) await loadScript(script);
      document.body.classList.remove('app-loading','authenticated');
      scheduleMascot();
    }).catch(error=>{
      bootPromise=null;
      document.body.classList.remove('app-loading','authenticated');
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
      const {error}=await authClient.auth.signInWithPassword({email,password});
      if(error) { setMessage('Não foi possível entrar. Confira o e-mail e a senha e tente novamente.'); return; }
      setMessage('Conta conectada. Preparando seu plano…');
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
    authClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,storage:window.localStorage,storageKey:'soqueromed-auth'}
    });
    const form=document.getElementById('authForm');
    if(form) {
      form.__appLoaderSubmit=handleLogin;
      form.addEventListener('submit',handleLogin);
    }
    try {
      const {data}=await authClient.auth.getSession();
      if(data.session) await bootFullApp();
      else document.body.classList.remove('app-loading');
    } catch(error) {
      console.error('Falha ao verificar a sessão:',error);
      setMessage('Não foi possível verificar sua sessão. Tente entrar novamente.');
    }
  }

  start();
})();
