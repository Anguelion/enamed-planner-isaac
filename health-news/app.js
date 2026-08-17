const state = { issue: null };

const formatDate = (value) => new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo',
}).format(new Date(`${value}T12:00:00-03:00`));

function renderLead(lead) {
  const root = document.querySelector('#leadStory');
  root.replaceChildren();

  const article = document.createElement('div');
  const kicker = document.createElement('span');
  kicker.className = 'lead-kicker';
  kicker.textContent = 'DESTAQUE DA EDIÇÃO';
  const title = document.createElement('h2');
  title.textContent = lead.title;
  const summary = document.createElement('p');
  summary.textContent = lead.summary;
  article.append(kicker, title, summary);

  const aside = document.createElement('div');
  aside.className = 'lead-aside';
  const noteLabel = document.createElement('span');
  noteLabel.textContent = 'OLHAR CLÍNICO';
  const note = document.createElement('p');
  note.textContent = lead.clinicalNote;
  const link = document.createElement('a');
  link.href = lead.sourceUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Consultar fonte original ↗';
  aside.append(noteLabel, note, link);
  root.append(article, aside);
}

function renderStories(stories, issueId) {
  const root = document.querySelector('#storyGrid');
  const template = document.querySelector('#storyTemplate');
  const readKey = `radar-saude:${issueId}:read`;
  const readStories = new Set(JSON.parse(localStorage.getItem(readKey) || '[]'));
  root.replaceChildren();

  stories.forEach((story, index) => {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector('.story-card');
    card.dataset.storyId = story.id;
    if (readStories.has(story.id)) card.classList.add('is-read');
    fragment.querySelector('.story-number').textContent = String(index + 1).padStart(2, '0');
    fragment.querySelector('.story-category').textContent = story.category;
    fragment.querySelector('h3').textContent = story.title;
    fragment.querySelector('.story-summary').textContent = story.summary;
    fragment.querySelector('.clinical-note p').textContent = story.clinicalNote;
    fragment.querySelector('.evidence-tag').textContent = story.evidence;
    const link = fragment.querySelector('.story-footer a');
    link.href = story.sourceUrl;
    link.addEventListener('click', () => {
      readStories.add(story.id);
      localStorage.setItem(readKey, JSON.stringify([...readStories]));
      card.classList.add('is-read');
    });
    root.append(fragment);
  });

  document.querySelector('#markAllRead').addEventListener('click', () => {
    stories.forEach((story) => readStories.add(story.id));
    localStorage.setItem(readKey, JSON.stringify([...readStories]));
    root.querySelectorAll('.story-card').forEach((card) => card.classList.add('is-read'));
  });
}

function renderQuick(items) {
  const root = document.querySelector('#quickList');
  root.replaceChildren();
  items.forEach((item) => {
    const link = document.createElement('a');
    link.className = 'quick-item';
    link.href = item.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const icon = document.createElement('span');
    icon.className = 'quick-icon';
    icon.textContent = item.icon;
    const title = document.createElement('span');
    title.className = 'quick-title';
    title.textContent = item.title;
    const source = document.createElement('span');
    source.className = 'quick-source';
    source.textContent = `${item.source} ↗`;
    link.append(icon, title, source);
    root.append(link);
  });
}

async function loadEdition() {
  try {
    const response = await fetch('data/latest.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const issue = await response.json();
    state.issue = issue;
    document.querySelector('#readingTime').textContent = `${issue.readingMinutes} min`;
    document.querySelector('#editionDate').textContent = formatDate(issue.publishedAt);
    document.querySelector('#editionTitle').textContent = issue.title;
    document.querySelector('#storyCount').textContent = `${issue.stories.length} análises selecionadas`;
    document.querySelector('#originalEdition').href = issue.sourceUrl;
    renderLead(issue.lead);
    renderStories(issue.stories, issue.id);
    renderQuick(issue.quickTakes);
  } catch (error) {
    const root = document.querySelector('#leadStory');
    root.className = 'error-card';
    root.textContent = 'Não foi possível carregar a edição. Tente atualizar a página em alguns instantes.';
  }
}

loadEdition();
