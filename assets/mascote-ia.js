(function initMascotChat() {
  'use strict';

  const STORAGE_KEY = 'soqueromed-mascot-chat-v1';
  const MAX_HISTORY_MESSAGES = 8;
  const MAX_QUESTION_LENGTH = 1200;
  let history = loadHistory();
  let sending = false;

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
          <div><strong>Dr. Sotero</strong><small>Seu mascote tutor</small></div>
          <button class="ai-mascot-clear" type="button" title="Limpar conversa" aria-label="Limpar conversa">Limpar</button>
          <button class="ai-mascot-close" type="button" title="Fechar" aria-label="Fechar">×</button>
        </header>
        <div class="ai-mascot-messages" aria-live="polite"></div>
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
      appendMessage('model', 'Oi! Eu sou o Dr. Sotero. Posso explicar conceitos, revisar alternativas e ajudar você a raciocinar para o ENAMED. Qual é a sua dúvida?');
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
        body: { question, history: priorHistory, context: currentContext() },
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

      history.push({ role: 'model', text: plainText(data.answer) });
      history = history.slice(-MAX_HISTORY_MESSAGES);
      saveHistory();
      renderMessages();
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
      input.disabled = false;
      submitButton.disabled = false;
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
    renderMessages();
    input.focus();
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
})();
