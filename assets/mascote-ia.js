(function initMascotChat() {
  'use strict';

  const STORAGE_KEY = 'soqueromed-mascot-chat-v2';
  const USAGE_STORAGE_KEY = 'soqueromed-mascot-usage-v2';
  const PROFILE_STORAGE_KEY = 'soqueromed-mascot-profile-v1';
  const DAILY_TOKEN_LIMIT = 50000;
  const MAX_HISTORY_MESSAGES = 6;
  const MAX_QUESTION_LENGTH = 1200;
  let history = loadHistory();
  let profile = loadProfile();
  let sending = false;
  let activeReviewId = null;
  let profileSyncTimer = null;
  let profileCloudUnavailable = false;

  const REVIEW_INTERVALS = [1, 3, 7, 14, 30];

  function loadProfile() {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || '{}');
      return {
        events: Array.isArray(saved.events) ? saved.events.slice(-200) : [],
        reviews: Array.isArray(saved.reviews) ? saved.reviews.slice(-100) : [],
        updatedAt: saved.updatedAt || '',
      };
    } catch {
      return { events: [], reviews: [], updatedAt: '' };
    }
  }

  function saveProfile() {
    profile.updatedAt = new Date().toISOString();
    try { localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile)); } catch {}
    scheduleProfileSync();
  }

  function scheduleProfileSync() {
    if (profileCloudUnavailable || typeof sbClient === 'undefined' || !sbClient) return;
    clearTimeout(profileSyncTimer);
    profileSyncTimer = window.setTimeout(syncProfileToCloud, 1200);
  }

  async function syncProfileToCloud() {
    try {
      const { data: sessionData } = await sbClient.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return;
      const { error } = await sbClient.from('ai_tutor_profiles').upsert({ user_id: userId, state: profile, updated_at: profile.updatedAt || new Date().toISOString() });
      if (error) profileCloudUnavailable = true;
    } catch {
      profileCloudUnavailable = true;
    }
  }

  async function loadProfileFromCloud() {
    if (typeof sbClient === 'undefined' || !sbClient) return;
    try {
      const { data: sessionData } = await sbClient.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return;
      const { data, error } = await sbClient.from('ai_tutor_profiles').select('state,updated_at').eq('user_id', userId).maybeSingle();
      if (error) {
        profileCloudUnavailable = true;
        return;
      }
      const remote = data?.state;
      if (remote && new Date(remote.updatedAt || data.updated_at).getTime() > new Date(profile.updatedAt || 0).getTime()) {
        profile = {
          events: Array.isArray(remote.events) ? remote.events.slice(-200) : [],
          reviews: Array.isArray(remote.reviews) ? remote.reviews.slice(-100) : [],
          updatedAt: remote.updatedAt || data.updated_at,
        };
        try { localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile)); } catch {}
        renderReviews();
      }
    } catch {
      profileCloudUnavailable = true;
    }
  }

  function loadHistory() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved.slice(-MAX_HISTORY_MESSAGES) : [];
    } catch {
      return [];
    }
  }

  function saveHistory() {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX_HISTORY_MESSAGES)));
  }

  function currentContext() {
    const view = document.querySelector('.view.active');
    const heading = view?.querySelector('h1, h2, .view-title, .section-title');
    return [view?.id, heading?.textContent?.trim()].filter(Boolean).join(' — ').slice(0, 300);
  }

  function plainText(value) {
    return String(value || '')
      .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[^\n]*\n?/g, ''))
      .replace(/^\s{0,3}#{1,6}\s*/gm, '')
      .replace(/^\s{0,3}>\s?/gm, '')
      .replace(/^\s*(?:[-*_]\s*){3,}$/gm, '')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+[.)]\s+/gm, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/\*([^*\n]+)\*/g, '$1')
      .replace(/_([^_\n]+)_/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function createInterface() {
    const root = document.createElement('div');
    root.className = 'ai-mascot-root';
    root.innerHTML = `
      <button class="ai-mascot-launcher" type="button" aria-label="Conversar com o mascote" aria-expanded="false">
        <span class="ai-mascot-face" aria-hidden="true"><img src="assets/dr-sotero.png" alt=""></span>
        <span class="ai-mascot-launcher-label">Tire uma dúvida</span>
      </button>
      <section class="ai-mascot-panel" role="dialog" aria-label="Mascote tutor" aria-hidden="true">
        <header class="ai-mascot-header">
          <div class="ai-mascot-avatar" aria-hidden="true"><img src="assets/dr-sotero.png" alt=""></div>
          <div><strong>Dr. Sotero</strong><small>Seu mascote tutor</small><span class="ai-mascot-usage" aria-live="polite"></span></div>
          <button class="ai-mascot-clear" type="button" title="Limpar conversa" aria-label="Limpar conversa">Limpar</button>
          <button class="ai-mascot-close" type="button" title="Fechar" aria-label="Fechar">×</button>
        </header>
        <div class="ai-mascot-controls">
          <label>Modo<select class="ai-mascot-mode">
            <option value="tutor">Tutor</option><option value="socratic">Socrático</option><option value="preceptor">Preceptor</option>
            <option value="osce">OSCE</option><option value="case">Caso clínico</option><option value="recall">Active recall</option>
            <option value="compare">Comparar</option><option value="redflags">Red flags</option><option value="exam">Prova</option>
          </select></label>
          <label>Ajuda<select class="ai-mascot-intervention">
            <option value="complete">Resposta completa</option><option value="partial">Explicação parcial</option>
            <option value="progressive_hints">Pistas graduais</option><option value="small_hints">Pista pequena</option><option value="questions">Só perguntas</option>
          </select></label>
          <label>Nível<select class="ai-mascot-difficulty"><option>1</option><option selected>2</option><option>3</option><option>4</option><option>5</option></select></label>
          <div class="ai-mascot-control-actions"><button class="ai-mascot-review" type="button">Revisões: 0</button><button class="ai-mascot-profile" type="button">Perfil</button></div>
        </div>
        <div class="ai-mascot-messages" aria-live="polite"></div>
        <div class="ai-mascot-reflection" hidden>
          <small>Como foi sua recuperação?</small>
          <button type="button" data-correct="true" data-confidence="high">Acertei com certeza</button>
          <button type="button" data-correct="true" data-confidence="low">Acertei com dúvida</button>
          <button type="button" data-correct="false" data-confidence="low">Errei com dúvida</button>
          <button type="button" data-correct="false" data-confidence="high">Errei com certeza</button>
        </div>
        <div class="ai-mascot-status" role="status"></div>
        <form class="ai-mascot-form">
          <label class="sr-only" for="aiMascotInput">Digite sua dúvida</label>
          <textarea id="aiMascotInput" rows="2" maxlength="${MAX_QUESTION_LENGTH}" placeholder="Pergunte sobre medicina ou seus estudos…"></textarea>
          <button type="submit">Enviar</button>
        </form>
        <p class="ai-mascot-disclaimer">Tutor educacional · não substitui avaliação médica</p>
      </section>`;
    document.body.appendChild(root);
    return root;
  }

  const root = createInterface();
  const launcher = root.querySelector('.ai-mascot-launcher');
  const panel = root.querySelector('.ai-mascot-panel');
  const closeButton = root.querySelector('.ai-mascot-close');
  const clearButton = root.querySelector('.ai-mascot-clear');
  const messages = root.querySelector('.ai-mascot-messages');
  const status = root.querySelector('.ai-mascot-status');
  const form = root.querySelector('.ai-mascot-form');
  const input = root.querySelector('#aiMascotInput');
  const submitButton = form.querySelector('button');
  const usage = root.querySelector('.ai-mascot-usage');
  const modeSelect = root.querySelector('.ai-mascot-mode');
  const interventionSelect = root.querySelector('.ai-mascot-intervention');
  const difficultySelect = root.querySelector('.ai-mascot-difficulty');
  const reviewButton = root.querySelector('.ai-mascot-review');
  const profileButton = root.querySelector('.ai-mascot-profile');
  const reflection = root.querySelector('.ai-mascot-reflection');

  function usageToday() {
    const now = new Date();
    const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
    try {
      const saved = JSON.parse(localStorage.getItem(USAGE_STORAGE_KEY) || '{}');
      return saved.date === today && Number.isFinite(saved.tokens) ? saved : { date: today, tokens: 0 };
    } catch {
      return { date: today, tokens: 0 };
    }
  }

  function renderUsage() {
    const current = usageToday();
    usage.textContent = `${Math.max(0, DAILY_TOKEN_LIMIT - current.tokens).toLocaleString('pt-BR')} tokens restantes hoje`;
    const exhausted = current.tokens >= DAILY_TOKEN_LIMIT;
    input.disabled = exhausted || sending;
    submitButton.disabled = exhausted || sending;
    return !exhausted;
  }

  function registerTokens(amount) {
    const current = usageToday();
    current.tokens += Math.max(1, Math.round(amount));
    try { localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(current)); } catch {}
    renderUsage();
  }

  function dueReviews() {
    const now = Date.now();
    return profile.reviews.filter((item) => !item.completed && new Date(item.dueAt).getTime() <= now);
  }

  function renderReviews() {
    const count = dueReviews().length;
    reviewButton.textContent = `Revisões: ${count}`;
    reviewButton.classList.toggle('has-due', count > 0);
  }

  function learnerProfileSummary() {
    const recent = profile.events.slice(-40);
    if (!recent.length) return '';
    const errors = recent.filter((event) => !event.correct);
    const overconfident = errors.filter((event) => event.confidence === 'high');
    const topics = new Map();
    errors.forEach((event) => topics.set(event.topic, (topics.get(event.topic) || 0) + 1));
    const weakest = [...topics.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([topic, count]) => `${topic} (${count} erros)`).join(', ');
    return `Últimas ${recent.length} autoavaliações: ${errors.length} erros, ${overconfident.length} erros com alta confiança. Fragilidades recorrentes: ${weakest || 'ainda não identificadas'}.`;
  }

  function topicForCurrentTurn() {
    const userTurn = [...history].reverse().find((message) => message.role === 'user')?.text || 'Revisão médica';
    return plainText(userTurn).replace(/\s+/g, ' ').slice(0, 90);
  }

  function recordReflection(correct, confidence) {
    const topic = topicForCurrentTurn();
    const now = new Date();
    profile.events.push({ topic, correct, confidence, mode: modeSelect.value, at: now.toISOString() });
    profile.events = profile.events.slice(-200);

    if (activeReviewId) {
      const review = profile.reviews.find((item) => item.id === activeReviewId);
      if (review) {
        review.step = correct ? Math.min(REVIEW_INTERVALS.length, Number(review.step || 0) + 1) : 0;
        if (review.step >= REVIEW_INTERVALS.length) review.completed = true;
        else {
          const due = new Date(now);
          due.setDate(due.getDate() + REVIEW_INTERVALS[review.step]);
          review.dueAt = due.toISOString();
        }
      }
      activeReviewId = null;
    } else if (!correct || confidence === 'low') {
      const firstDelay = !correct && confidence === 'high' ? 1 : !correct ? 3 : 7;
      const due = new Date(now);
      due.setDate(due.getDate() + firstDelay);
      profile.reviews.push({ id: `${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`, prompt: topic, dueAt: due.toISOString(), step: 0, completed: false });
      profile.reviews = profile.reviews.slice(-100);
    }
    saveProfile();
    reflection.hidden = true;
    renderReviews();
  }

  function appendMessage(role, text) {
    const message = document.createElement('div');
    message.className = `ai-mascot-message ${role === 'model' ? 'is-mascot' : 'is-user'}`;
    const label = document.createElement('small');
    label.textContent = role === 'model' ? 'Dr. Sotero' : 'Você';
    const content = document.createElement('div');
    content.textContent = plainText(text);
    message.append(label, content);
    messages.appendChild(message);
  }

  function renderMessages() {
    messages.replaceChildren();
    if (!history.length) {
      appendMessage('model', 'Digite sua dúvida sobre medicina ou seus estudos.');
    } else {
      history.forEach((message) => appendMessage(message.role, message.text));
    }
    messages.scrollTop = messages.scrollHeight;
  }

  function setOpen(open) {
    root.classList.toggle('is-open', open);
    launcher.setAttribute('aria-expanded', String(open));
    panel.setAttribute('aria-hidden', String(!open));
    if (open) window.setTimeout(() => input.focus(), 80);
  }

  function setSending(active, text = '') {
    sending = active;
    input.disabled = active;
    submitButton.disabled = active;
    status.textContent = text;
    status.classList.toggle('is-active', Boolean(text));
  }

  async function sendQuestion(question) {
    if (sending || !question) return;
    if (!renderUsage()) {
      status.textContent = `Limite diário de ${DAILY_TOKEN_LIMIT.toLocaleString('pt-BR')} tokens atingido. Tente novamente amanhã.`;
      status.className = 'ai-mascot-status is-error';
      return;
    }
    const priorHistory = history.slice(-MAX_HISTORY_MESSAGES);
    history.push({ role: 'user', text: question });
    history = history.slice(-MAX_HISTORY_MESSAGES);
    saveHistory();
    renderMessages();
    setSending(true, 'Dr. Sotero está pensando…');

    try {
      if (typeof sbClient === 'undefined' || !sbClient) throw new Error('O serviço de login não está disponível.');
      const { data: sessionData } = await sbClient.auth.getSession();
      if (!sessionData?.session) throw new Error('Entre na sua conta para conversar com o mascote.');

      const { data, error } = await sbClient.functions.invoke('mascote-ia', {
        body: {
          question,
          history: priorHistory,
          context: currentContext(),
          mode: modeSelect.value,
          intervention: interventionSelect.value,
          difficulty: Number(difficultySelect.value),
          learnerProfile: learnerProfileSummary(),
        },
      });
      if (error) {
        let message = 'Não consegui responder agora. Tente novamente.';
        const statusCode = Number(error.context?.status || 0);
        if (statusCode === 404) message = 'A função mascote-ia ainda não foi publicada no Supabase.';
        if (statusCode === 401) message = 'Sua sessão expirou. Saia e entre novamente no aplicativo.';
        if (statusCode === 402) message = 'O Supabase restringiu a função por limite de uso. Verifique o painel de cobrança.';
        try {
          const details = await error.context?.json();
          if (details?.error) message = details.error;
        } catch {}
        throw new Error(message);
      }
      if (!data?.answer) throw new Error(data?.error || 'O mascote não retornou uma resposta.');

      const measuredTokens = Number(data.usage?.totalTokens) || Math.ceil((question.length + String(data.answer).length) / 4);
      registerTokens(measuredTokens);

      history.push({ role: 'model', text: plainText(data.answer) });
      history = history.slice(-MAX_HISTORY_MESSAGES);
      saveHistory();
      renderMessages();
      reflection.hidden = false;
    } catch (error) {
      // Não deixe uma pergunta que falhou no histórico: repetir após um erro
      // criaria dois turnos "user" seguidos e o Gemini pode rejeitar a conversa.
      if (history.at(-1)?.role === 'user' && history.at(-1)?.text === question) {
        history.pop();
        saveHistory();
        renderMessages();
      }
      status.textContent = error instanceof Error ? error.message : 'Não consegui responder agora.';
      status.classList.add('is-error');
    } finally {
      sending = false;
      renderUsage();
      if (!status.classList.contains('is-error')) status.textContent = '';
      status.classList.toggle('is-active', Boolean(status.textContent));
      input.focus();
    }
  }

  launcher.addEventListener('click', () => setOpen(!root.classList.contains('is-open')));
  closeButton.addEventListener('click', () => setOpen(false));
  clearButton.addEventListener('click', () => {
    history = [];
    saveHistory();
    status.textContent = '';
    status.className = 'ai-mascot-status';
    reflection.hidden = true;
    renderMessages();
    input.focus();
  });
  reviewButton.addEventListener('click', () => {
    const review = dueReviews()[0];
    if (!review) {
      status.textContent = 'Nenhuma revisão pendente hoje.';
      status.className = 'ai-mascot-status is-active';
      return;
    }
    activeReviewId = review.id;
    modeSelect.value = 'recall';
    interventionSelect.value = 'questions';
    input.value = `Faça uma revisão por recuperação ativa sobre: ${review.prompt}`;
    input.focus();
  });
  profileButton.addEventListener('click', () => {
    status.textContent = learnerProfileSummary() || 'O perfil será formado após suas autoavaliações.';
    status.className = 'ai-mascot-status is-active';
  });
  reflection.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-correct]');
    if (!button) return;
    recordReflection(button.dataset.correct === 'true', button.dataset.confidence);
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) return;
    input.value = '';
    status.className = 'ai-mascot-status';
    sendQuestion(question);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root.classList.contains('is-open')) setOpen(false);
  });

  renderMessages();
  renderUsage();
  renderReviews();
  loadProfileFromCloud();
})();
