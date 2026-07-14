const STORAGE_KEY = 'enamed-planner-v3';
const THEME_KEY = 'enamed-theme';
const UI_TAB_KEY = 'enamed-planner-active-tab';
const SIDEBAR_KEY = 'enamed-planner-sidebar-collapsed';
const QUESTION_SIDEBAR_KEY = 'enamed-question-sidebar-collapsed';
const VIDEO_FOCUS_KEY = 'enamed-video-focus-mode';
const VIDEO_SOURCE_KEY = 'enamed-video-source-mode';
const VIDEO_RATE_KEY = 'enamed-video-playback-rate';
const R2_VIDEO_BASE_URL = 'https://pub-61c30ac3d3724992b527355137d4faa5.r2.dev';

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}
const LOCAL_PLANNER_URL = 'http://127.0.0.1:8765/enamed_planner.html?tab=aulas&videoSource=local';
const STUDY_TIMER_KEY = 'enamed-planner-study-timer';
const QUESTION_TIMER_KEY = 'enamed-planner-question-timer';
const POMODORO_KEY = 'enamed-planner-pomodoro';
// O navegador continua local-first; quando houver internet, sincroniza com o Supabase.
const OFFLINE_FIRST = false;
const SUPABASE_URL = 'https://wbxzptiacftymhvfkiyx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_XrBwqjkwlt4Mb4rdmE-xVw_7Vt3euvP';
const sbClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) || null;
const INITIAL_PARAMS = new URLSearchParams(window.location.search);
const LESSON_MIN_QUESTIONS = 10;
const LESSON_MIN_FLASHCARDS = 10;
const DAILY_QUESTION_TARGET = 20;
const DAILY_FLASHCARD_TARGET = 30;
const ENAMED_AREAS = ['Clínica Médica','Pediatria','Ginecologia e Obstetrícia','Cirurgia Geral','Medicina de Família e Comunidade'];
let questionBank = [];
let materialLibrary = [];
let videoCatalog = [];
let officialSchedule = [];
let videoCatalogStatus = 'Carregando videoaulas locais...';
let materialMarkdownCache = {};
let materialEditCache = new Map();
let materialImageCache = new Map();
let materialEditSaveTimers = new Map();
let materialEditLoading = new Set();
let materialDbPromise = null;
let materialLibraryStatus = 'Carregando resumos...';
let importedSimulados = [];
let importedSimuladosStatus = 'Carregando simulados importados...';
let questionBankLoadPromise = null;
let materialLibraryLoadPromise = null;
let importedSimuladosLoadPromise = null;
let pomodoroLastSavedSecond = -1;
const seed = JSON.parse(document.getElementById('seed').textContent);
let state = loadState();
normalizeOfficialScheduleNames();
ensureRestartFromBlockTen();
ensureDayLogs();
ensureSimTopics();
ensureFeynman();
ensureQuestionProgress();
let ui = { tab: INITIAL_PARAMS.get('tab') || sessionStorage.getItem(UI_TAB_KEY) || 'painel', search: '', area: 'Todas', status: 'Todos', scheduleBlock: 'Atual', refDate: localISODate(new Date()), analysisDate: localISODate(new Date()), qBlock: 'Todos', qSource: 'Todas', qTopic: 'Todos', qStatus: 'Não respondidas', qIndex: 0, justAnsweredId: '', highlightColor: 'yellow', suppressAnswerClick: false, highlightGestureUntil: 0, draftAnswers: {}, keyboardConfirmQuestion: '', keyboardConfirmUntil: 0, questionTimerOpen: false, materialBlock: 'Todos', materialScheduleId: '', materialSearch: '', materialDocId: '', materialEditMode:false, materialEditScope:'full', materialSectionIndex:0, materialHighlightColor:'yellow', flashcardFilter: 'Devidos', flashcardArea: 'Todas', flashcardSubarea: 'Todas', flashcardDeck: '', flashcardIndex: 0, flashcardShowLibrary: false, revealedCards: {}, activeSimRunId: '', prescriptionCaseId:'', prescriptionScreen:'home', prescriptionReviewOpen:false, prescriptionPen:'pen', videoFocusMode: localStorage.getItem(VIDEO_FOCUS_KEY) === '1', videoSourceMode: INITIAL_PARAMS.get('videoSource') || localStorage.getItem(VIDEO_SOURCE_KEY) || 'auto', videoPlaybackRate: Number(localStorage.getItem(VIDEO_RATE_KEY)) || 1 };
if(ui.tab === 'hoje') ui.tab = 'painel';
const restoredQuestionTimer = loadQuestionTimerSession();
if(restoredQuestionTimer?.ui) Object.assign(ui, restoredQuestionTimer.ui, {questionTimerOpen:true});
let questionTimer = restoredQuestionTimer?.timer || { mode: 'countdown', sessionActive: false, pausedByUser: false, running: false, interval: null, questionId: '', secondsLeft: 0, elapsedSeconds: 0, beeped: false, status: '', audioContext: null };
let studyTimeTracker = loadStudyTimerSession();
let pomodoroInterval = null;
let pomodoroAlarmInterval = null;
let pomodoroPanelCloseTimer = null;
let pomodoro = loadPomodoroSession();
let simuladoTimer = { interval: null, runId: '' };
let motivationRefreshInterval = null;
let motivationRenderedKey = '';
let dashboardCountdownInterval = null;
let highlightUndoStack = [];
let currentUser = null;
let syncTimer = null;
let syncInFlight = false;
let renderCache = { questionStats: new Map(), flashcardStats: new Map(), videoLessons: new Map(), videoDisplay: null, manualCards: null };
let questionSidebarCollapsed = localStorage.getItem(QUESTION_SIDEBAR_KEY) === '1';
const views = [
  ['painel','Dashboard','dashboard'], ['cronograma','Trilha','route'], ['pendencias','Pendências','alert'], ['aulas','Aulas','play'], ['questoes','Questões','brain'], ['analise','Análise','insight'], ['flashcards','Flashcards','cards'], ['materiais','Materiais','library'], ['simulados','Simulados','timer'], ['prescricao','Prescrição','prescription'], ['areas','Áreas','chart'], ['historico','Histórico','history'], ['feynman','Feynman','message']
];
applyTheme(localStorage.getItem(THEME_KEY) || 'light');
function loadState() {
  try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); if(saved?.schedule?.length) return saved; } catch(e) {}
  return structuredClone(seed);
}
function normalizeOfficialScheduleNames() {
  const officialNames = {
    'CofBasics - Vitalidade Fetal': 'CofBasics - Avaliação de Vitalidade Fetal (G.O)',
    'CofBasics - Semiologia Neurológica e Topografia': 'CofBasics - Semiologia Neurológica e Topografia da Lesão (Clínica Médica)',
    'CofBasics - Processo Saúde-Doença': 'CofBasics - Processo de Saúde e Doença (Saúde Coletiva)',
    'CofBasics - Bioestatística': 'CofBasics - Fundamentos de Bioestatística (Saúde Coletiva)',
    'CofBasics - Associação e Causalidade': 'CofBasics - Associação e Causalidade (Saúde Coletiva)',
    'CofBasics - Propedêutica Mamária': 'CofBasics - Propedêutica Mamária (G.O)',
    'CofBasics - Propedêutica Uroginecologia': 'CofBasics - Propedêutica em Uroginecologia (G.O)',
    'CofBasics: Psicofarmacologia': 'CofBasics: Psicofarmacologia (Saúde Mental)',
    'Abdome Agudo Obstrutivo/Perfurativo': 'Abdome agudo obstrutivo, perfurativo, vascular e hemorrágico',
    'Introdução à Geriatria e AGA': 'Introdução a Geriatria e Avaliação Geriátrica Ampla',
    'Síndromes Geriátricas e Vacinação Idoso': 'Síndromes Geriátricas, Vacinação do Idoso e Iatrogenia no Idoso',
    'DIP - Doença Inflamatória Pélvica': 'Doença Inflamatória Pélvica Aguda',
    'Dermatite Atópica e Lesões Benignas RN': 'Dermatite Atópica e Lesões Benignas do Recém-Nascido',
    'Abdome Agudo - Diverticulite': 'Abdome agudo inflamatório - diverticulite e abcesso hepático'
  };
  state.schedule = (state.schedule || []).map(item => officialNames[item.topic] ? { ...item, topic: officialNames[item.topic] } : item);
}
function addDays(date, days) { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + days); return localISODate(d); }
function weekdayName(date) { return ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][new Date(`${date}T12:00:00`).getDay()]; }
function nextWeekday(date) {
  let d = date;
  while([0,6].includes(new Date(`${d}T12:00:00`).getDay())) d = addDays(d, 1);
  return d;
}
function ensureRestartFromBlockTen() {
  const version = 'block10-restart-2026-07-13-v2';
  if(state.schedulePlanVersion === version) return;
  const startBlock = 10;
  const restartDate = '2026-07-13';
  const vacationUntil = '2026-08-09';
  const schedule = state.schedule || [];

  // O plano anterior levou o Bloco 9 para julho. Ele já foi estudado e volta
  // às datas originais para não reaparecer na Trilha do dia.
  schedule.filter(item => n(item.block) === 9).forEach(item => {
    if(item.originalDate) item.date = item.originalDate;
    item.day = weekdayName(item.date);
    item.catchUp = false;
  });

  const lessons = schedule.filter(item => n(item.block) >= startBlock).sort((a,b)=>n(a.block)-n(b.block) || n(a.lessonOrder)-n(b.lessonOrder) || n(a.row)-n(b.row) || byDate(a,b));
  let date = restartDate;
  let slot = 0;
  lessons.forEach((item, index) => {
    date = nextWeekday(date);
    const perDay = date <= vacationUntil ? 2 : 1;
    if(!item.originalDate) item.originalDate = item.date;
    item.date = date;
    item.day = weekdayName(date);
    item.catchUp = false;
    const weekIndex = Math.floor(index / 10) + 1;
    item.week = date <= vacationUntil ? `Férias.${weekIndex}` : `Aulas.${weekIndex}`;
    slot += 1;
    if(slot >= perDay) {
      slot = 0;
      date = addDays(date, 1);
    }
  });

  const catchUpPlan = [
    { topic:'Amenorreias', terms:['amenorre'], date:'2026-07-18' },
    { topic:'Síndrome dos Ovários Policísticos', terms:['sindrome','ovarios','policistic'], date:'2026-07-19' },
    { topic:'Gasometria Arterial', terms:['gasometria','arterial'], date:'2026-07-25' },
    { topic:'Distúrbios do Sódio e Potássio', terms:['disturbios','sodio','potassio'], date:'2026-07-26' }
  ];
  catchUpPlan.forEach(plan => {
    const target = schedule.find(item => {
      const topic = normalizedTopic(item.topic);
      return n(item.block) === 7 && plan.terms.every(term => topic.includes(normalizedTopic(term)));
    });
    if(!target) return;
    if(!target.originalDate) target.originalDate = target.date;
    target.date = plan.date;
    target.day = weekdayName(plan.date);
    target.week = 'Recuperação';
    target.catchUp = true;
  });
  state.reschedule = {
    ...(state.reschedule || {}),
    fromBlock: startBlock,
    restartDate,
    vacationUntil,
    classReturnDate: '2026-08-10',
    weekdaysOnly: true,
    weekendCatchUp: catchUpPlan,
    method: 'Blocos 10+ em ordem oficial, reiniciando em 13/07/2026. Até 2 aulas por dia útil nas férias; depois 1 aula por dia útil. Pendências do Bloco 7 distribuídas aos fins de semana.'
  };
  state.schedulePlanVersion = version;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function carryDayLogsToRestartDates(dateMoves) {
  if(!Array.isArray(state.dayLogs) || !dateMoves?.size) return;
  dateMoves.forEach((newDate, oldDate) => {
    const oldLog = state.dayLogs.find(log => log.date === oldDate);
    if(!oldLog) return;
    let newLog = state.dayLogs.find(log => log.date === newDate);
    if(!newLog) {
      newLog = defaultDayLog(newDate);
      state.dayLogs.push(newLog);
    }
    ['flashcards','flashcardMinutes','videos','lessonMinutes','questions','correct','wrong','questionMinutes'].forEach(field => {
      if(n(oldLog[field]) && !n(newLog[field])) newLog[field] = oldLog[field];
    });
    ['flashcardsOn','videosOn','questionsOn'].forEach(field => {
      if(oldLog[field] && !newLog[field]) newLog[field] = oldLog[field];
    });
    ['videoNames','notes','pace'].forEach(field => {
      if(oldLog[field] && !newLog[field]) newLog[field] = oldLog[field];
    });
    if(n(oldLog.mood) && !n(newLog.mood)) newLog.mood = oldLog.mood;
  });
}
function persist() { ensureDayLogs(); ensureSimTopics(); ensureFeynman(); ensureQuestionProgress(); reviveHiddenHistoryDates(); localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); scheduleCloudSave(); render(); }
function saveStateOnly() { ensureDayLogs(); ensureSimTopics(); ensureFeynman(); ensureQuestionProgress(); reviveHiddenHistoryDates(); localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); scheduleCloudSave(); }

function ensureQuestionProgress() {
  if(!state.questionProgress || typeof state.questionProgress !== 'object') state.questionProgress = {};
  if(!state.questionEdits || typeof state.questionEdits !== 'object') state.questionEdits = {};
  if(!state.questionLogged || typeof state.questionLogged !== 'object') state.questionLogged = {};
  if(!state.questionSettings || typeof state.questionSettings !== 'object') state.questionSettings = { secondsPerQuestion: 90 };
  if(!state.materials || typeof state.materials !== 'object') state.materials = {};
  if(!state.flashcardProgress || typeof state.flashcardProgress !== 'object') state.flashcardProgress = {};
  if(!state.questionFlashcards || typeof state.questionFlashcards !== 'object') state.questionFlashcards = {};
  if(!state.videoFlashcards || typeof state.videoFlashcards !== 'object') state.videoFlashcards = {};
  if(!state.flashcardSettings || typeof state.flashcardSettings !== 'object') state.flashcardSettings = {};
  if(!Array.isArray(state.flashcardReviewHistory)) state.flashcardReviewHistory = [];
  if(!state.importedQuestionTags || typeof state.importedQuestionTags !== 'object') state.importedQuestionTags = {};
  if(!state.dashboardSettings || typeof state.dashboardSettings !== 'object') state.dashboardSettings = {};
  if(!state.videoPlayer || typeof state.videoPlayer !== 'object') state.videoPlayer = {};
  if(!state.videoPlayer.bookmarks || typeof state.videoPlayer.bookmarks !== 'object') state.videoPlayer.bookmarks = {};
  if(!state.videoPlayer.resume || typeof state.videoPlayer.resume !== 'object') state.videoPlayer.resume = {};
  if(!state.videoPlayer.watched || typeof state.videoPlayer.watched !== 'object') state.videoPlayer.watched = {};
  if(!state.videoPlayer.watchedAt || typeof state.videoPlayer.watchedAt !== 'object') state.videoPlayer.watchedAt = {};
  if(!state.videoPlayer.pinned || typeof state.videoPlayer.pinned !== 'object') state.videoPlayer.pinned = { enabled:false, lessonId:'', sourceId:'' };
  if(!state.videoPlayer.lastOpen || typeof state.videoPlayer.lastOpen !== 'object') state.videoPlayer.lastOpen = { lessonId:'', sourceId:'' };
  if(!state.dailyCheckins || typeof state.dailyCheckins !== 'object') state.dailyCheckins = {};
  if(!state.prescriptionLab || typeof state.prescriptionLab !== 'object') state.prescriptionLab = {};
  if(!Array.isArray(state.prescriptionLab.cases)) state.prescriptionLab.cases = [];
  if(!state.prescriptionLab.library || typeof state.prescriptionLab.library !== 'object') state.prescriptionLab.library = {medications:[],exams:[],others:[]};
  ['medications','exams','others'].forEach(key => { if(!Array.isArray(state.prescriptionLab.library[key])) state.prescriptionLab.library[key]=[]; });
  if(!Array.isArray(state.hiddenHistoryDates)) state.hiddenHistoryDates = [];
  if(!state.dashboardSettings.countdownDate) {
    state.dashboardSettings.countdownDate = [...(state.schedule || [])].map(x => x.date).filter(Boolean).sort().at(-1) || '2026-11-01';
  }
  state.schedule.forEach(item => {
    if(item.manualQ === undefined) item.manualQ = n(item.q);
    if(item.manualFC === undefined) item.manualFC = n(item.fc);
    item.metaQ = Math.max(LESSON_MIN_QUESTIONS, n(item.metaQ));
    item.metaFC = Math.max(LESSON_MIN_FLASHCARDS, n(item.metaFC));
  });
  state.questionSettings.secondsPerQuestion = Math.max(15, n(state.questionSettings.secondsPerQuestion) || 90);
  state.questionSettings.fontSize = Math.max(14, Math.min(28, n(state.questionSettings.fontSize) || 16));
  if(state.questionSettings.fontAccessibilityVersion !== 'large-v1') {
    state.questionSettings.fontSize = Math.max(22, state.questionSettings.fontSize);
    state.questionSettings.fontAccessibilityVersion = 'large-v1';
  }
  state.flashcardSettings.newLimit = state.flashcardSettings.newLimit === 0 ? 0 : Math.max(0, n(state.flashcardSettings.newLimit) || 20);
  state.flashcardSettings.reviewLimit = state.flashcardSettings.reviewLimit === 0 ? 0 : Math.max(0, n(state.flashcardSettings.reviewLimit) || 120);
  Object.entries(state.flashcardProgress || {}).forEach(([id, progress]) => {
    if(!progress || typeof progress !== 'object') state.flashcardProgress[id] = {};
    const current = state.flashcardProgress[id];
    current.ease = Math.max(1.3, n(current.ease) || 2.5);
    current.interval = Math.max(0, n(current.interval) || 0);
    current.repetitions = Math.max(0, n(current.repetitions) || 0);
    current.reviews = Math.max(0, n(current.reviews) || 0);
    if(!current.nextReview) current.nextReview = localISODate(new Date());
  });
}

function normalizedTopic(value='') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
const TOPIC_ALIASES = {
  'dpoc': 'doenca pulmonar obstrutiva cronica dpoc',
  'trauma conceitos iniciais atls': 'trauma conceitos iniciais e atendimento inicial ao trauma atls',
  'diabetes diagnostico e abordagem ambulatorial': 'diabetes diagnostico e abordagem laboratorial',
  'diabetes classificacao fisiopatologia e diagnostico do dm': 'diabetes diagnostico e abordagem laboratorial',
  'diabetes tratamento e complicacoes cronicas': 'diabetes diagnostico e abordagem laboratorial',
  'avc isquemico e ait': 'neurovascular 1',
  'avc hemorragico e hsa': 'neurovascular 2',
  'cofbasics processo saude doenca': 'cofbasics processo de saude e doenca saude coletiva',
  'bronquiolite e turberculose': 'bronquiolite e tuberculose',
  'prevencao quaternaria e quinquenaria': 'niveis de prevencao',
  'abdome agudo vias biliares': 'abdome agudo inflamatorio vias biliares',
  'disturbios de sodio e potassio': 'disturbios do sodio e do potassio',
  'disturbios do sodio e potassio': 'disturbios do sodio e do potassio',
  'determinacao social saude doenca': 'determinacao social do processo saude doenca e promocao de saude',
  'abdome agudo apendicite': 'abdome agudo inflamatorio apendicite',
  'sangramentos 2 metade gestacao': 'sangramentos da segunda metade da gestacao',
  'r1 outros sangramentos de segunda metade da gestacao': 'sangramentos da segunda metade da gestacao',
  'sindrome dispeptica drge': 'sindrome dispeptica dispepsia fisiologia gastrica drge',
  'endometriose': 'sangramento uterino anormal',
  'convulsoes na emergencia e tce leve': 'convulsoes na emergencia e traumatismo cranioencefalico leve',
  'transtorno do desenvolvimento e aprendizagem': 'transtornos do desenvolvimento e aprendizagem',
  'abdome agudo diverticulite': 'abdome agudo inflamatorio diverticulite e abcesso hepatico',
  'abcesso hepatico': 'abscesso hepatico',
  'dip doenca inflamatoria pelvica': 'doenca inflamatoria pelvica aguda',
  'introducao a geriatria e aga': 'introducao a geriatria e avaliacao geriatrica ampla',
  'sindromes geriatricas e vacinacao idoso': 'sindromes geriatricas vacinacao do idoso e iatrogenia no idoso',
  'dermatite atopica e lesoes benignas rn': 'dermatite atopica e lesoes benignas do recem nascido',
  'cofbasics bioestatistica': 'cofbasics fundamentos de bioestatistica saude coletiva',
  'tecnica operatoria fios e anestesicos': 'tecnica operatoria aspectos gerais fios de sutura e anestesicos locais',
  'pals suporte avancado pediatria': 'suporte avancado de vida em pediatria pals',
  'itu e meningite pediatria': 'infeccao de trato urinario e meningite',
  'doencas relacionadas ao trabalho': 'principais doencas e agravos relacionados ao trabalho'
};
function canonicalTopic(value='') { const normalized = normalizedTopic(value); return TOPIC_ALIASES[normalized] || normalized; }
const VIDEO_SCHEDULE_OVERRIDES = {
  '8:cofbasics lesoes elementares pediatria': { block:9, topic:'CofBasics - Lesões Elementares (Pediatria)' },
  '9:dor pelvica': { block:12, topic:'Dor Pélvica' },
  '18:cofbasics propedeutica em uroginecologia': { block:18, order:8 }
};
function priorityClass(priority='') { return `priority-${normalizedTopic(priority) || 'baixa'}`; }
function priorityBar(item) { return `<span class="schedule-priority-bar ${priorityClass(item.priority)}" title="Prioridade ${escapeAttr(item.priority || 'Baixa')}"></span>`; }
function lessonDisplayTitle(item, fallback='') {
  const topic = item?.topic || fallback;
  const order = n(item?.lessonOrder);
  return order ? `${n(item.block)}.${order} - ${topic}` : topic;
}
function officialMatchScore(current, official) {
  const currentTopic = canonicalTopic(current.topic);
  const officialTopic = canonicalTopic(official.topic);
  if(currentTopic === officialTopic) return 1000;
  const words = officialTopic.split(' ').filter(word => word.length > 3);
  const overlap = words.filter(word => currentTopic.includes(word)).length;
  return (currentTopic.includes(officialTopic) || officialTopic.includes(currentTopic) ? 200 : 0) + overlap;
}
function applyOfficialSchedule() {
  const version = 'medplanner-text-order-v9';
  const aligned = officialSchedule.length === state.schedule.length && officialSchedule.every(official =>
    state.schedule.some(item => n(item.block) === n(official.block)
      && n(item.lessonOrder) === n(official.order)
      && canonicalTopic(item.topic) === canonicalTopic(official.topic))
  );
  if(!officialSchedule.length || (state.officialScheduleVersion === version && aligned)) return false;
  const used = new Set();
  const ordered = [];
  const datesByBlock = new Map(scheduleBlocks().map(block => [String(block), state.schedule.filter(item => String(item.block) === String(block)).map(item => item.date).filter(Boolean).sort()]));
  officialSchedule.sort((a,b)=>n(a.block)-n(b.block)||n(a.order)-n(b.order)).forEach((official, index) => {
    const inBlock = state.schedule.filter(item => n(item.block) === n(official.block) && !used.has(item.id));
    const exact = inBlock.map(item => ({ item, score: officialMatchScore(item, official) })).sort((a,b)=>b.score-a.score)[0];
    const fallback = inBlock.sort((a,b)=>n(a.row)-n(b.row)||byDate(a,b))[0];
    const current = exact?.score >= 2 ? exact.item : fallback;
    if(current) used.add(current.id);
    const blockDates = datesByBlock.get(String(official.block)) || [];
    const date = current?.date || blockDates[Math.min(n(official.order)-1, Math.max(blockDates.length-1,0))] || localISODate(new Date());
    ordered.push({
      ...(current || {}),
      id: current?.id || `cron-medplanner-${official.block}-${official.order}`,
      row: index + 1,
      lessonOrder: n(official.order),
      block: n(official.block),
      date,
      day: weekdayName(date),
      topic: official.topic,
      area: official.area,
      priority: official.priority,
      type: current?.type || 'Videoaula',
      week: date <= (state.reschedule?.vacationUntil || '2026-08-09') ? `Férias.${Math.floor(index / 10) + 1}` : `Aulas.${Math.floor(index / 10) + 1}`,
      q: n(current?.q), fc: n(current?.fc), hours: n(current?.hours),
      manualQ: current?.manualQ ?? n(current?.q), manualFC: current?.manualFC ?? n(current?.fc),
      metaQ: Math.max(LESSON_MIN_QUESTIONS, n(current?.metaQ)), metaFC: Math.max(LESSON_MIN_FLASHCARDS, n(current?.metaFC)), metaH: n(current?.metaH), notes: current?.notes || ''
    });
  });
  state.schedule = ordered;
  state.officialScheduleVersion = version;
  ensureDayLogs();
  saveStateOnly();
  return true;
}
function scheduleForQuestion(question) {
  if(question.scheduleId) {
    const linked = state.schedule.find(item => item.id === question.scheduleId);
    if(linked) return linked;
  }
  const sameBlock = state.schedule.filter(item => String(item.block) === String(question.collectionBlock));
  const candidates = [question.sourceLabel, question.topic, question.source].map(canonicalTopic).filter(Boolean);
  return sameBlock.find(item => candidates.includes(canonicalTopic(item.topic)))
    || sameBlock.find(item => candidates.some(candidate => {
      const topic = canonicalTopic(item.topic);
      return candidate.length >= 6 && (topic.includes(candidate) || candidate.includes(topic));
    }))
    || null;
}
function backfillQuestionScheduleLinks() {
  const version = 'question-schedule-linking-v2';
  if(state.questionScheduleLinkVersion === version) return 0;
  let linked = 0;
  questionBank.forEach(question => {
    const progress = state.questionProgress?.[question.id];
    if(!progress?.answeredAt || progress.scheduleId) return;
    const lesson = scheduleForQuestion(question);
    if(!lesson) return;
    progress.scheduleId = lesson.id;
    linked += 1;
  });
  state.questionScheduleLinkVersion = version;
  if(linked) saveStateOnly();
  return linked;
}
function questionStatsForSchedule(scheduleId) {
  if(renderCache.questionStats.has(scheduleId)) return renderCache.questionStats.get(scheduleId);
  const linked = questionBank.filter(question => {
    const result = questionResult(question);
    if(!result?.answeredAt) return false;
    return (result.scheduleId || scheduleForQuestion(question)?.id) === scheduleId;
  });
  const correct = linked.filter(question => questionResult(question)?.correct).length;
  const stats = { done: linked.length, correct, rate: linked.length ? correct / linked.length : 0 };
  renderCache.questionStats.set(scheduleId, stats);
  return stats;
}
function flashcardStatsForSchedule(scheduleId) {
  if(renderCache.flashcardStats.has(scheduleId)) return renderCache.flashcardStats.get(scheduleId);
  const cards = manualFlashcards().filter(card => card.scheduleId === scheduleId);
  const reviews = cards.reduce((sum, card) => sum + n(state.flashcardProgress[card.id]?.reviews), 0);
  const stats = { cards: cards.length, reviews };
  renderCache.flashcardStats.set(scheduleId, stats);
  return stats;
}
function completedQuestions(item) {
  return n(item.manualQ ?? item.q) + questionStatsForSchedule(item.id).done;
}
function completedFlashcards(item) {
  return n(item.manualFC ?? item.fc) + flashcardStatsForSchedule(item.id).reviews;
}

function applyTheme(theme) {
  const selected = theme === 'dark' ? 'dark' : 'light';
  document.body.classList.toggle('dark', selected === 'dark');
  localStorage.setItem(THEME_KEY, selected);
  const button = document.getElementById('themeToggle');
  if(button) {
    button.innerHTML = `${selected === 'dark' ? '☀' : '◐'}<span>Modo de exibição</span>`;
    button.title = selected === 'dark' ? 'Usar tema claro' : 'Usar tema escuro';
    button.setAttribute('aria-label', button.title);
  }
}

function setSyncStatus(text, kind='') {
  const box = document.getElementById('syncStatus');
  document.getElementById('syncText').textContent = text;
  box.className = `sync-status ${kind}`;
}
function scheduleCloudSave() {
  if(!currentUser || !sbClient) return;
  clearTimeout(syncTimer);
  setSyncStatus('Alterações pendentes', 'busy');
  syncTimer = setTimeout(pushCloudState, 900);
}
async function pushCloudState() {
  if(!currentUser || syncInFlight) return;
  syncInFlight = true;
  setSyncStatus('Sincronizando...', 'busy');
  const { error } = await sbClient.from('planner_states').upsert({
    user_id: currentUser.id,
    data: state,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });
  syncInFlight = false;
  if(error) {
    console.error('Falha ao sincronizar:', error);
    setSyncStatus('Erro ao sincronizar', 'error');
  } else {
    setSyncStatus(`Sincronizado ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`, 'online');
  }
}
async function pullCloudState({ firstLogin=false }={}) {
  if(!currentUser) return;
  setSyncStatus('Buscando dados...', 'busy');
  const { data, error } = await sbClient.from('planner_states').select('data, updated_at').eq('user_id', currentUser.id).maybeSingle();
  if(error) {
    console.error('Falha ao buscar dados:', error);
    setSyncStatus('Configure o banco', 'error');
    return;
  }
  if(data?.data?.schedule?.length) {
    state = data.data;
    normalizeOfficialScheduleNames();
    ensureRestartFromBlockTen();
    ensureDayLogs(); ensureSimTopics(); ensureFeynman(); ensureQuestionProgress();
    // A nuvem pode conter uma versao anterior sem a ordem bloco.aula.
    // Reaplica o cronograma oficial antes de exibir ou reenviar o estado.
    if(officialSchedule.length) applyOfficialSchedule();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    render();
    scheduleCloudSave();
    setSyncStatus('Dados atualizados', 'online');
  } else if(firstLogin) {
    await pushCloudState();
  } else {
    setSyncStatus('Sincronizado', 'online');
  }
}
function loadQuestionBank() {
  if(!questionBankLoadPromise) questionBankLoadPromise = loadQuestionBankNow();
  return questionBankLoadPromise;
}
async function loadQuestionBankNow() {
  await loadLocalQuestionBank();
  backfillQuestionScheduleLinks();
  const localQuestions = [...questionBank];
  // O banco publicado junto do planner e a fonte principal. Evita baixar e
  // normalizar novamente milhares de registros iguais vindos do Supabase.
  if(localQuestions.length) {
    if(['questoes','simulados','analise'].includes(ui.tab)) render();
    return;
  }
  if(!currentUser || !sbClient) {
    if(['questoes','simulados','analise'].includes(ui.tab)) render();
    return;
  }
  let { data, error } = await sbClient.from('question_bank').select('id,number,collection_block,document_block,area,topic,stem,options,answer,source,source_label,images,comment').order('collection_block').order('source_label').order('number');
  if(error && /images|source_label/i.test(error.message || '')) {
    const fallback = await sbClient.from('question_bank').select('id,number,collection_block,document_block,area,topic,stem,options,answer,source,comment').order('collection_block').order('number');
    data = fallback.data;
    error = fallback.error;
  }
  if(error) {
    console.error('Falha ao carregar questões:', error);
    if(!questionBank.length) questionBank = [];
    return;
  }
  const cloudQuestions = (data || []).map(question => normalizeQuestionRecord({
    id: question.id,
    number: question.number,
    collectionBlock: question.collection_block,
    documentBlock: question.document_block,
    area: question.area,
    topic: question.topic,
    stem: question.stem,
    options: question.options,
    answer: question.answer,
    source: question.source,
    sourceLabel: question.source_label || question.topic || question.source,
    images: Array.isArray(question.images) ? question.images : [],
    comment: question.comment || ''
  }));
  if(cloudQuestions.length >= questionBank.length) {
    const localBlocks = new Map();
    localQuestions.forEach(question => {
      if(question.collectionBlock === undefined || question.collectionBlock === null) return;
      if(!localBlocks.has(question.collectionBlock)) localBlocks.set(question.collectionBlock, []);
      localBlocks.get(question.collectionBlock).push(question);
    });
    if(localBlocks.size) {
      const cloudWithoutLocalBlocks = cloudQuestions.filter(question => !localBlocks.has(question.collectionBlock));
      const localBank = [...localBlocks.values()].flat();
      questionBank = deduplicateQuestions([...cloudWithoutLocalBlocks, ...localBank])
        .sort((a,b)=>questionCollectionSort(a)-questionCollectionSort(b) || String(a.sourceLabel || '').localeCompare(String(b.sourceLabel || '')) || n(a.number)-n(b.number));
    } else {
      questionBank = deduplicateQuestions(cloudQuestions);
    }
  }
  if(['questoes','simulados','analise'].includes(ui.tab)) render();
}
function loadQuestionBlockScript(src) {
  return new Promise(resolve => {
    if(document.querySelector(`script[data-question-block="${src}"]`)) return resolve();
    const script = document.createElement('script');
    script.src = `question_bank/${src}`;
    script.dataset.questionBlock = src;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}
async function loadLocalQuestionBank() {
  const index = window.ENAMED_LOCAL_QUESTION_INDEX;
  if(!index?.blocks?.length) return false;
  window.ENAMED_LOCAL_QUESTION_BANK = window.ENAMED_LOCAL_QUESTION_BANK || {};
  for(const block of index.blocks) {
    if(!window.ENAMED_LOCAL_QUESTION_BANK[block.block]) await loadQuestionBlockScript(block.script);
    // Entrega o controle ao navegador entre blocos para manter a interface fluida.
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  const blocks = index.blocks
    .map(block => window.ENAMED_LOCAL_QUESTION_BANK?.[block.block]?.questions || [])
    .flat();
  if(blocks.length) {
    questionBank = deduplicateQuestions(blocks.map(normalizeQuestionRecord)).sort((a,b)=>questionCollectionSort(a)-questionCollectionSort(b) || String(a.sourceLabel || '').localeCompare(String(b.sourceLabel || '')) || n(a.number)-n(b.number));
    return true;
  }
  return false;
}
function deduplicateQuestions(records) {
  const unique = new Map();
  const richness = question => n((question.comment || '').length) + n((question.images || []).length) * 2000 + Object.keys(question.options || {}).length * 20;
  records.forEach(question => {
    const key = `${question.collectionBlock ?? 'sem-bloco'}|${normalizedTopic(question.stem)}`;
    if(!question.stem || !unique.has(key)) { unique.set(key, question); return; }
    const current = unique.get(key);
    const keep = richness(question) > richness(current) ? question : current;
    const discard = keep === question ? current : question;
    const keptProgress = state.questionProgress?.[keep.id];
    const discardedProgress = state.questionProgress?.[discard.id];
    if(discardedProgress && (!keptProgress || String(discardedProgress.answeredAt || '') > String(keptProgress.answeredAt || ''))) {
      state.questionProgress[keep.id] = discardedProgress;
    }
    if(keep !== current) unique.set(key, keep);
  });
  return [...unique.values()];
}
function loadImportedSimulados() {
  if(!importedSimuladosLoadPromise) importedSimuladosLoadPromise = loadImportedSimuladosNow();
  return importedSimuladosLoadPromise;
}
async function loadImportedSimuladosNow() {
  try {
    const response = await fetch('imported_simulados/index.json', {cache:'no-store'});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const index = await response.json();
    const entries = Array.isArray(index.simulados) ? index.simulados : [];
    importedSimulados = await Promise.all(entries.map(async entry => {
      const detail = await fetch(`imported_simulados/${entry.file}`, {cache:'no-store'});
      if(!detail.ok) throw new Error(`HTTP ${detail.status}`);
      const sim = await detail.json();
      sim.questions = (sim.questions || []).map(question => ({...question, sourceType:'imported', importedSimId:sim.id}));
      return sim;
    }));
    importedSimuladosStatus = `${importedSimulados.length} ${importedSimulados.length===1?'simulado importado':'simulados importados'}`;
  } catch(error) {
    console.warn('Simulados importados ainda não disponíveis:', error);
    importedSimulados = [];
    importedSimuladosStatus = 'Nenhum simulado importado disponível';
  }
  if(ui.tab === 'simulados') renderSimulados();
  else if(ui.tab === 'analise') renderAnalise();
}
function updateAccountUI() {
  const panel = document.getElementById('authPanel');
  const button = document.getElementById('accountBtn');
  if(currentUser) {
    document.body.classList.remove('auth-locked');
    panel.classList.add('hidden');
    button.textContent = 'Sair';
    button.title = currentUser.email || 'Sair da conta';
  } else {
    document.body.classList.add('auth-locked');
    panel.classList.remove('hidden');
    button.textContent = 'Entrar';
    button.title = 'Entrar para sincronizar';
    setSyncStatus('Somente neste aparelho');
  }
}
function isLocalPlanner() {
  return location.protocol === 'file:' || ['localhost','127.0.0.1','::1'].includes(location.hostname);
}
async function initCloud() {
  if(OFFLINE_FIRST) {
    document.body.classList.remove('auth-locked');
    const button = document.getElementById('accountBtn');
    if(button) button.classList.add('hidden');
    setSyncStatus('Offline · dados locais', 'online');
    return;
  }
  if(!sbClient) {
    if(isLocalPlanner()) {
      document.body.classList.remove('auth-locked');
      setSyncStatus('Modo local offline', 'online');
    } else {
      setSyncStatus('Supabase indisponível', 'error');
    }
    return;
  }
  const { data } = await sbClient.auth.getSession();
  currentUser = data.session?.user || null;
  if(!currentUser && isLocalPlanner()) {
    document.body.classList.remove('auth-locked');
    setSyncStatus('Modo local neste aparelho');
  } else {
    updateAccountUI();
  }
  if(currentUser) await pullCloudState();
  sbClient.auth.onAuthStateChange((event, session) => {
    const wasLoggedOut = !currentUser;
    currentUser = session?.user || null;
    updateAccountUI();
    if(currentUser && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
      setTimeout(() => pullCloudState({firstLogin: wasLoggedOut}), 0);
    }
  });
}

function ensureDayLogs() {
  if(!Array.isArray(state.dayLogs)) state.dayLogs = [];
  const dates = new Set([...(state.schedule||[]).map(x=>x.date).filter(Boolean), ...(state.daily||[]).map(x=>x.date).filter(Boolean)]);
  dates.forEach(date => { if(!state.dayLogs.some(x=>x.date===date)) state.dayLogs.push(defaultDayLog(date)); });
  state.dayLogs = state.dayLogs.map(log => ({...defaultDayLog(log.date), ...log}));
  state.dayLogs.sort((a,b)=>a.date.localeCompare(b.date));
}
function defaultDayLog(date) { return { date, mood: 0, pace: '', flashcardsOn: false, flashcards: 0, flashcardMinutes: 0, videosOn: false, videos: 0, videoNames: '', lessonMinutes: 0, questionsOn: false, questions: 0, correct: 0, wrong: 0, questionMinutes: 0, materialMinutes: 0, simuladoMinutes: 0, notes: '' }; }
function dayLogHasActivity(log) {
  return n(log?.videos) + n(log?.flashcards) + n(log?.questions) + n(log?.lessonMinutes) + n(log?.flashcardMinutes) + n(log?.questionMinutes) + n(log?.materialMinutes) + n(log?.simuladoMinutes) > 0
    || Boolean(String(log?.videoNames || '').trim() || String(log?.notes || '').trim());
}
function reviveHiddenHistoryDates() {
  if(!Array.isArray(state.hiddenHistoryDates) || !state.hiddenHistoryDates.length) return;
  const activeDates = new Set((state.dayLogs || []).filter(dayLogHasActivity).map(log => log.date));
  state.hiddenHistoryDates = state.hiddenHistoryDates.filter(date => !activeDates.has(date));
}
function getDayLog(date) { ensureDayLogs(); let log = state.dayLogs.find(x=>x.date===date); if(!log) { log = defaultDayLog(date); state.dayLogs.push(log); } return log; }
function setDayLog(date, field, value) { const log = getDayLog(date); log[field] = value; persist(); }
function emptyStudyTimer() { return { kind:'', scheduleId:'', startedAt:0, elapsedSeconds:0, committedSeconds:0, lastSavedAt:0, interval:null, displayInterval:null }; }
function loadStudyTimerSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(STUDY_TIMER_KEY));
    if(!saved?.kind) return emptyStudyTimer();
    const elapsedSeconds = Math.max(0, Math.min(4 * 60 * 60, n(saved.elapsedSeconds)));
    return { ...emptyStudyTimer(), kind:saved.kind, scheduleId:saved.scheduleId || '', elapsedSeconds, committedSeconds:Math.min(elapsedSeconds,Math.max(0,n(saved.committedSeconds))), lastSavedAt:n(saved.savedAt) || Date.now() };
  } catch(error) { return emptyStudyTimer(); }
}
function emptyPomodoro() { return { mode:'', phase:'work', running:false, alarm:false, endAt:0, remaining:0, workSeconds:1500, breakSeconds:300 }; }
function loadPomodoroSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(POMODORO_KEY));
    if(!saved?.mode) return emptyPomodoro();
    const timer = { ...emptyPomodoro(), ...saved };
    if(timer.running && timer.endAt && timer.endAt <= Date.now()) {
      timer.running=false; timer.alarm=true; timer.endAt=0; timer.remaining=0;
    }
    return timer;
  } catch(error) { return emptyPomodoro(); }
}
function savePomodoro() {
  localStorage.setItem(POMODORO_KEY, JSON.stringify({ ...pomodoro, audioContext:undefined }));
}
function formatPomodoro(seconds) {
  const total = Math.max(0, Math.ceil(Number(seconds) || 0));
  return `${String(Math.floor(total / 60)).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`;
}
function beepPomodoro() {
  try {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880;
    gain.gain.value = 0.12;
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + .22);
    setTimeout(() => context.close?.(), 350);
  } catch(error) {}
}
function finishPomodoroPhase(timer=pomodoro) {
  timer.running = false;
  timer.alarm = true;
  timer.remaining = 0;
  timer.endAt = 0;
  if(pomodoroInterval) { clearInterval(pomodoroInterval); pomodoroInterval=null; }
  if(pomodoroAlarmInterval) clearInterval(pomodoroAlarmInterval);
  beepPomodoro();
  pomodoroAlarmInterval = setInterval(beepPomodoro, 900);
  savePomodoro();
  updatePomodoroWidget();
}
function startPomodoro(mode=25) {
  if(pomodoroAlarmInterval) { clearInterval(pomodoroAlarmInterval); pomodoroAlarmInterval=null; }
  const workSeconds = mode === 50 ? 3000 : 1500;
  const breakSeconds = mode === 50 ? 600 : 300;
  pomodoro = { ...emptyPomodoro(), mode, phase:'work', running:true, alarm:false, workSeconds, breakSeconds, remaining:workSeconds, endAt:Date.now()+workSeconds*1000 };
  if(pomodoroInterval) clearInterval(pomodoroInterval);
  pomodoroInterval = setInterval(updatePomodoro, 1000);
  savePomodoro(); updatePomodoroWidget();
}
function continuePomodoro() {
  if(pomodoroAlarmInterval) { clearInterval(pomodoroAlarmInterval); pomodoroAlarmInterval=null; }
  pomodoro.alarm=false;
  pomodoro.phase='break';
  pomodoro.remaining=pomodoro.breakSeconds;
  pomodoro.endAt=Date.now()+pomodoro.breakSeconds*1000;
  pomodoro.running=true;
  if(pomodoroInterval) clearInterval(pomodoroInterval);
  pomodoroInterval=setInterval(updatePomodoro,1000);
  savePomodoro(); updatePomodoroWidget();
}
function pausePomodoro() {
  if(!pomodoro.running) return;
  pomodoro.remaining=Math.max(0,Math.ceil((pomodoro.endAt-Date.now())/1000));
  pomodoro.running=false; pomodoro.endAt=0;
  if(pomodoroInterval) { clearInterval(pomodoroInterval); pomodoroInterval=null; }
  savePomodoro(); updatePomodoroWidget();
}
function resumePomodoro() {
  if(pomodoro.running || pomodoro.alarm || !pomodoro.mode) return;
  pomodoro.running=true; pomodoro.endAt=Date.now()+Math.max(1,pomodoro.remaining)*1000;
  if(pomodoroInterval) clearInterval(pomodoroInterval);
  pomodoroInterval=setInterval(updatePomodoro,1000);
  savePomodoro(); updatePomodoroWidget();
}
function resetPomodoro() {
  if(pomodoroInterval) clearInterval(pomodoroInterval);
  if(pomodoroAlarmInterval) clearInterval(pomodoroAlarmInterval);
  pomodoroInterval=null; pomodoroAlarmInterval=null; pomodoro=emptyPomodoro();
  localStorage.removeItem(POMODORO_KEY); updatePomodoroWidget();
}
function updatePomodoro() {
  if(!pomodoro.running) return updatePomodoroWidget();
  pomodoro.remaining=Math.max(0,Math.ceil((pomodoro.endAt-Date.now())/1000));
  if(pomodoro.remaining<=0) finishPomodoroPhase();
  else {
    // O horario final ja permite restaurar o cronometro. Uma gravacao a cada
    // dez segundos e suficiente e evita bloquear o navegador continuamente.
    if(pomodoro.remaining % 10 === 0 && pomodoro.remaining !== pomodoroLastSavedSecond) {
      pomodoroLastSavedSecond = pomodoro.remaining;
      savePomodoro();
    }
    updatePomodoroWidget();
  }
}
function ensurePomodoroWidget() {
  if(document.getElementById('globalPomodoro')) return;
  const widget=document.createElement('div');
  widget.id='globalPomodoro'; widget.className='global-pomodoro';
  widget.innerHTML='<button class="pomodoro-fruit" id="pomodoroFruit" type="button" title="Abrir pomodoro" aria-label="Abrir pomodoro" aria-expanded="false" aria-controls="pomodoroPanel">🍅<span class="pomodoro-mini-time">--:--</span></button><div class="pomodoro-panel" id="pomodoroPanel" hidden></div>';
  const headerActions=document.querySelector('.header-actions');
  const syncStatus=document.getElementById('syncStatus');
  if(headerActions && syncStatus) syncStatus.insertAdjacentElement('afterend',widget);
  else (headerActions||document.body).append(widget);
  document.getElementById('pomodoroFruit').onclick=()=>{
    const panel=document.getElementById('pomodoroPanel');
    setPomodoroPanelOpen(panel.hidden || !panel.classList.contains('is-open'));
    updatePomodoroWidget();
  };
}
function setPomodoroPanelOpen(open) {
  const fruit=document.getElementById('pomodoroFruit');
  const panel=document.getElementById('pomodoroPanel');
  if(!fruit || !panel) return;
  if(pomodoroPanelCloseTimer) clearTimeout(pomodoroPanelCloseTimer);
  fruit.setAttribute('aria-expanded', String(open));
  fruit.title=open?'Fechar pomodoro':'Abrir pomodoro';
  fruit.setAttribute('aria-label', fruit.title);
  if(open) {
    panel.hidden=false;
    panel.classList.remove('is-closing');
    requestAnimationFrame(()=>panel.classList.add('is-open'));
    return;
  }
  panel.classList.remove('is-open');
  panel.classList.add('is-closing');
  pomodoroPanelCloseTimer=setTimeout(()=>{
    panel.hidden=true;
    panel.classList.remove('is-closing');
  },180);
}
function updatePomodoroWidget() {
  ensurePomodoroWidget();
  const fruit=document.getElementById('pomodoroFruit'); const panel=document.getElementById('pomodoroPanel');
  if(!fruit || !panel) return;
  const seconds=pomodoro.running ? Math.max(0,Math.ceil((pomodoro.endAt-Date.now())/1000)) : pomodoro.remaining;
  fruit.classList.toggle('active', Boolean(pomodoro.running || pomodoro.alarm));
  fruit.classList.toggle('alarming', Boolean(pomodoro.alarm));
  fruit.querySelector('.pomodoro-mini-time').textContent=pomodoro.mode ? formatPomodoro(seconds) : '--:--';
  if(panel.hidden) return;
  const phase=pomodoro.phase==='work'?'Foco':'Pausa';
  if(!pomodoro.mode) panel.innerHTML='<strong>Pomodoro</strong><span class="muted">Escolha o ritmo do ciclo</span><div class="pomodoro-options"><button class="icon-btn primary" data-pomodoro-start="25">25 + 5</button><button class="icon-btn" data-pomodoro-start="50">50 + 10</button></div>';
  else if(pomodoro.alarm) panel.innerHTML=`<strong>Tempo encerrado</strong><span class="muted">${phase} concluído. O som continuará até você voltar.</span><button class="icon-btn primary" id="pomodoroContinue">Continuar · iniciar pausa</button><button class="tiny-btn" id="pomodoroReset">Encerrar ciclo</button>`;
  else panel.innerHTML=`<strong>${phase} · ${formatPomodoro(seconds)}</strong><span class="muted">${pomodoro.running?'Em andamento':'Pausado · use o botão Continuar'}</span><div class="pomodoro-options">${pomodoro.running?'<button class="icon-btn" id="pomodoroPause">Pausar</button>':'<button class="icon-btn primary" id="pomodoroResume">Continuar</button>'}<button class="tiny-btn" id="pomodoroReset">Encerrar</button></div>`;
  panel.querySelectorAll('[data-pomodoro-start]').forEach(button=>button.onclick=()=>startPomodoro(Number(button.dataset.pomodoroStart)));
  panel.querySelector('#pomodoroContinue')?.addEventListener('click',continuePomodoro);
  panel.querySelector('#pomodoroPause')?.addEventListener('click',pausePomodoro);
  panel.querySelector('#pomodoroResume')?.addEventListener('click',resumePomodoro);
  panel.querySelectorAll('#pomodoroReset').forEach(button=>button.addEventListener('click',resetPomodoro));
}
function persistStudyTimerSession() {
  if(!studyTimeTracker.kind) {
    localStorage.removeItem(STUDY_TIMER_KEY);
    return;
  }
  localStorage.setItem(STUDY_TIMER_KEY, JSON.stringify({
    kind:studyTimeTracker.kind,
    scheduleId:studyTimeTracker.scheduleId || '',
    elapsedSeconds:autoStudyElapsedSeconds(),
    committedSeconds:n(studyTimeTracker.committedSeconds),
    running:Boolean(studyTimeTracker.startedAt),
    savedAt:Date.now()
  }));
}
function autoStudyIsRunning(kind='') { return !!studyTimeTracker.startedAt && (!kind || studyTimeTracker.kind === kind); }
function updateAutoStudyIndicator() {
  const elapsed = autoStudyElapsedSeconds();
  document.querySelectorAll('[data-auto-study-clock]').forEach(node => {
    const prefix = node.dataset.autoStudyPrefix || 'Registrando';
    node.textContent = studyTimeTracker.startedAt ? `${prefix} ${formatClock(elapsed)}` : studyTimeTracker.kind ? `Pausado em ${formatClock(elapsed)}` : 'Tempo pausado';
  });
  if(studyTimeTracker.startedAt && elapsed % 5 === 0) persistStudyTimerSession();
  if(studyTimeTracker.startedAt && elapsed >= 30 && Date.now()-n(studyTimeTracker.lastSavedAt)>=30000) checkpointAutoStudyTime();
}
function autoStudyElapsedSeconds(now=Date.now()) {
  if(!studyTimeTracker.kind) return 0;
  // Evita que um computador suspenso vire uma sessão artificialmente longa.
  const activeSeconds = studyTimeTracker.startedAt ? Math.round((now - studyTimeTracker.startedAt) / 1000) : 0;
  return Math.max(0, Math.min(4 * 60 * 60, n(studyTimeTracker.elapsedSeconds) + activeSeconds));
}
function commitAutoStudyTime(tracker, seconds) {
  if(!tracker?.kind || !seconds) return 0;
  const log = getDayLog(localISODate(new Date()));
  const minutes = seconds / 60;
  if(tracker.kind === 'video') {
    log.videosOn = true;
    log.lessonMinutes = Math.round((n(log.lessonMinutes) + minutes) * 100) / 100;
  } else if(tracker.kind === 'flashcards') {
    log.flashcardsOn = true;
    log.flashcardMinutes = Math.round((n(log.flashcardMinutes) + minutes) * 100) / 100;
  } else if(tracker.kind === 'material') {
    log.materialMinutes = Math.round((n(log.materialMinutes) + minutes) * 100) / 100;
  } else if(tracker.kind === 'simulado') {
    log.questionsOn = true;
    log.simuladoMinutes = Math.round((n(log.simuladoMinutes) + minutes) * 100) / 100;
  } else {
    log.questionsOn = true;
    log.questionMinutes = Math.round((n(log.questionMinutes) + minutes) * 100) / 100;
  }
  const lesson = state.schedule.find(item => item.id === tracker.scheduleId);
  if(lesson) lesson.hours = Math.round((n(lesson.hours) + seconds / 3600) * 10000) / 10000;
  if(!Array.isArray(state.studySessions)) state.studySessions=[];
  state.studySessions.push({id:`study-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,date:localISODate(new Date()),kind:tracker.kind,scheduleId:tracker.scheduleId||'',seconds:Math.round(seconds),savedAt:new Date().toISOString()});
  if(state.studySessions.length>5000) state.studySessions=state.studySessions.slice(-5000);
  return seconds;
}
function checkpointAutoStudyTime(force=false) {
  if(!studyTimeTracker.kind) return 0;
  const totalSeconds=autoStudyElapsedSeconds();
  const seconds=Math.max(0,totalSeconds-n(studyTimeTracker.committedSeconds));
  if(!force && seconds<30) return 0;
  if(seconds<1) return 0;
  const snapshot={...studyTimeTracker};
  commitAutoStudyTime(snapshot,seconds);
  studyTimeTracker.committedSeconds=totalSeconds;
  studyTimeTracker.lastSavedAt=Date.now();
  persistStudyTimerSession();
  saveStateOnly();
  return seconds;
}
function startAutoStudy(kind, scheduleId='') {
  if(document.hidden) return;
  if(autoStudyIsRunning() && studyTimeTracker.kind === kind && studyTimeTracker.scheduleId === scheduleId) return;
  if(!studyTimeTracker.startedAt && studyTimeTracker.kind === kind && studyTimeTracker.scheduleId === scheduleId) {
    studyTimeTracker.startedAt = Date.now();
    studyTimeTracker.displayInterval = setInterval(updateAutoStudyIndicator, 1000);
    persistStudyTimerSession();
    updateAutoStudyIndicator();
    return;
  }
  stopAutoStudy();
  const now = Date.now();
  studyTimeTracker = { kind, scheduleId, startedAt:now, elapsedSeconds:0, committedSeconds:0, lastSavedAt:now, interval:null, displayInterval:setInterval(updateAutoStudyIndicator, 1000) };
  persistStudyTimerSession();
  updateAutoStudyIndicator();
}
function pauseAutoStudy(kind='') {
  if(!studyTimeTracker.kind || (kind && studyTimeTracker.kind !== kind) || !studyTimeTracker.startedAt) return;
  studyTimeTracker.elapsedSeconds = autoStudyElapsedSeconds();
  studyTimeTracker.startedAt = 0;
  if(studyTimeTracker.displayInterval) clearInterval(studyTimeTracker.displayInterval);
  studyTimeTracker.displayInterval = null;
  persistStudyTimerSession();
  updateAutoStudyIndicator();
}
function stopAutoStudy(kind='', askToSave=true) {
  if(!studyTimeTracker.kind || (kind && studyTimeTracker.kind !== kind)) return;
  const tracker = studyTimeTracker;
  const seconds = Math.max(0,autoStudyElapsedSeconds()-n(tracker.committedSeconds));
  if(studyTimeTracker.interval) clearInterval(studyTimeTracker.interval);
  if(studyTimeTracker.displayInterval) clearInterval(studyTimeTracker.displayInterval);
  studyTimeTracker = emptyStudyTimer();
  localStorage.removeItem(STUDY_TIMER_KEY);
  updateAutoStudyIndicator();
  if(seconds >= 1 && commitAutoStudyTime(tracker, seconds)) saveStateOnly();
}
function resumeAutoStudyForActiveView() {
  if(document.hidden) return;
  if(ui.tab === 'questoes') {
    const question = filteredQuestions()[ui.qIndex];
    if(question) startAutoStudy('questions', scheduleForQuestion(question)?.id || '');
  }
  if(ui.tab === 'aulas') {
    const video = document.getElementById('lessonVideo');
    const lesson = currentVideoLesson();
    if(video && !video.paused && lesson) startAutoStudy('video', videoScheduleForLesson(lesson)?.id || '');
  }
}
function dayScore(log) { const total = n(log.correct) + n(log.wrong); return total ? n(log.correct) / total : (n(log.questions) ? n(log.correct) / n(log.questions) : 0); }
function moodLabel(v) { return v==3 ? 'Motivado' : v==2 ? 'Mais ou menos' : v==1 ? 'Lento' : 'Sem humor'; }
function ensureSimTopics() {
  if(!Array.isArray(state.simulados)) state.simulados = [];
  state.simulados.forEach(sim => {
    if(!Array.isArray(sim.missedTopics)) sim.missedTopics = [];
    sim.missedTopics = sim.missedTopics.map((topic, idx) => ({ id: topic.id || `${sim.id}-miss-${idx}-${Date.now()}`, topic: topic.topic || '', scheduleId: topic.scheduleId || '', importance: topic.importance || 'Média', note: topic.note || '' }));
  });
  if(!Array.isArray(state.simuladoRuns)) state.simuladoRuns = [];
  state.simuladoRuns = state.simuladoRuns.map((run, idx) => ({
    id: run.id || `simrun-${idx}-${Date.now()}`,
    name: run.name || `Simulado ENAMED ${idx + 1}`,
    sourceType: run.sourceType || 'generated',
    importedSimId: run.importedSimId || '',
    createdAt: run.createdAt || new Date().toISOString(),
    startedAt: run.startedAt || '',
    finishedAt: run.finishedAt || '',
    durationMinutes: Math.max(10, n(run.durationMinutes) || 300),
    secondsLeft: Math.max(0, n(run.secondsLeft) || Math.max(10, n(run.durationMinutes) || 300) * 60),
    elapsedSeconds: Math.max(0, n(run.elapsedSeconds)),
    currentIndex: Math.max(0, n(run.currentIndex)),
    paused: run.paused !== false,
    questionIds: Array.isArray(run.questionIds) ? run.questionIds : [],
    answers: run.answers && typeof run.answers === 'object' ? run.answers : {},
    eliminated: run.eliminated && typeof run.eliminated === 'object' ? run.eliminated : {},
    highlights: run.highlights && typeof run.highlights === 'object' ? run.highlights : {},
    confidence: run.confidence && typeof run.confidence === 'object' ? run.confidence : {},
    questionSeconds: run.questionSeconds && typeof run.questionSeconds === 'object' ? run.questionSeconds : {},
    questionVisited: run.questionVisited && typeof run.questionVisited === 'object' ? run.questionVisited : {},
    activeQuestionId: run.activeQuestionId || '',
    questionTimingStart: Math.max(0, n(run.questionTimingStart)),
    areaTargets: run.areaTargets && typeof run.areaTargets === 'object' ? run.areaTargets : defaultSimuladoTargets()
  }));
}
function defaultSimuladoTargets() { return Object.fromEntries(ENAMED_AREAS.map(area => [area, 20])); }
function scheduleTopicOptions() {
  return state.schedule.map(x => ({ id: x.id, topic: x.topic, area: x.area, block: x.block, priority: x.priority })).sort((a,b)=>a.topic.localeCompare(b.topic));
}
function findScheduleByTopic(topic) {
  const clean = canonicalTopic(topic);
  if(!clean) return null;
  const exact = state.schedule.find(x => canonicalTopic(x.topic) === clean);
  if(exact) return exact;
  const words = clean.split(' ').filter(word => word.length > 2);
  return state.schedule
    .map(item => {
       const candidate = canonicalTopic(item.topic);
      const matches = words.filter(word => candidate.includes(word)).length;
      return { item, score: candidate.includes(clean) || clean.includes(candidate) ? 100 + matches : matches };
    })
    .filter(candidate => candidate.score > 0)
    .sort((a,b) => b.score - a.score || a.item.topic.localeCompare(b.item.topic))[0]?.item || null;
}
function importanceBadge(value) { return `<span class="importance ${escapeAttr(value)}">${escapeHtml(value)}</span>`; }
function ensureFeynman() {
  if(!Array.isArray(state.feynman)) state.feynman = [];
  state.feynman = state.feynman.map((item, idx) => ({ id: item.id || `feyn-${idx}-${Date.now()}`, topic: item.topic || '', scheduleId: item.scheduleId || '', area: item.area || '', explain: item.explain || '', gaps: item.gaps || '', analogy: item.analogy || '', nextStep: item.nextStep || '', mastery: n(item.mastery), reviewDate: item.reviewDate || localISODate(new Date()), updatedAt: item.updatedAt || localISODate(new Date()) }));
}
function feynmanPriority(item) {
  const due = item.reviewDate && item.reviewDate <= localISODate(new Date());
  if(due && n(item.mastery) <= 3) return 'Crítica';
  if(n(item.mastery) <= 2) return 'Alta';
  if(due || n(item.mastery) <= 3) return 'Média';
  return 'Baixa';
}
let MOTIVATION_BY_PERIOD = {"morning":["Bom dia, Isaac. Comece com calma e constância."],"afternoon":["Boa tarde, Isaac. Um bloco de cada vez."],"night":["Boa noite, Isaac. Feche o dia sem deixar a revisão para trás."],"rest":["Constância hoje, segurança clínica amanhã."]};
function motivationPeriod(hour) {
  if(hour >= 5 && hour < 11) return 'morning';
  if(hour >= 14 && hour < 19) return 'afternoon';
  if(hour >= 19 && hour < 22) return 'night';
  return 'rest';
}
function motivationMessage() {
  const now = new Date();
  const period = motivationPeriod(now.getHours());
  const messages = MOTIVATION_BY_PERIOD[period] || [];
  if(!messages.length) return 'Um passo de cada vez: abra o próximo assunto e comece.';
  const slot = Math.floor(now.getTime() / (10 * 60 * 1000));
  const periodSeed = [...period].reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
  return messages[(slot * 37 + periodSeed) % messages.length];
}
function motivationKey() {
  const now = new Date();
  return `${motivationPeriod(now.getHours())}:${Math.floor(now.getTime() / (10 * 60 * 1000))}`;
}
function renderMotivation() {
  const el = document.getElementById('motivationBar');
  const key = motivationKey();
  if(el?.firstElementChild && motivationRenderedKey === key) return;
  if(el) el.innerHTML = `<span class="motivation-pill"><span class="motivation-marquee">${escapeHtml(motivationMessage())}</span></span>`;
  motivationRenderedKey = key;
}
function startMotivationCycle() {
  if(motivationRefreshInterval) return;
  motivationRefreshInterval = setInterval(() => {
    if(motivationKey() !== motivationRenderedKey) renderMotivation();
  }, 30000);
}
async function loadMotivationMessages() {
  try {
    const response = await fetch('data/motivation_messages.json', {cache:'no-store'});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if(['morning','afternoon','night','rest'].every(period => Array.isArray(payload[period]) && payload[period].length)) {
      MOTIVATION_BY_PERIOD = payload;
      motivationRenderedKey = '';
      renderMotivation();
    }
  } catch(error) {
    console.warn('Mensagens motivacionais indisponíveis; usando mensagens locais.', error);
  }
}
function localISODate(d) { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0,10); }
function fmtDate(s) { if(!s) return ''; const [y,m,d]=s.split('-'); return `${d}/${m}/${y}`; }
function parsePlannerDate(value) {
  const text = String(value || '').trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if(!match) return '';
  const day=Number(match[1]), month=Number(match[2]), year=Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear()===year && date.getMonth()===month-1 && date.getDate()===day ? `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}` : '';
}
function bindPlannerDateInput(id, currentDate, apply) {
  const input=document.getElementById(id);
  if(!input) return;
  input.value=fmtDate(currentDate);
  const submit=() => { const date=parsePlannerDate(input.value); if(!date) { input.value=fmtDate(currentDate); return; } apply(date); };
  input.onkeydown = event => { if(event.key==='Enter') { event.preventDefault(); submit(); } };
  input.onblur = submit;
}
function n(v) { return Number.isFinite(Number(v)) ? Number(v) : 0; }
function debounce(callback, wait=180) {
  let timeout = null;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => callback(...args), wait);
  };
}
function pct(v) { return `${Math.round(n(v)*100)}%`; }
function clamp(v,min=0,max=1) { return Math.max(min, Math.min(max, n(v))); }
function lessonQuestionTarget(item) { return Math.max(LESSON_MIN_QUESTIONS, n(item?.metaQ)); }
function lessonFlashcardTarget(item) { return Math.max(LESSON_MIN_FLASHCARDS, n(item?.metaFC)); }
function statusOf(item) {
  const videoDone = scheduleVideoCompleted(item);
  if(videoDone && completedQuestions(item) >= lessonQuestionTarget(item) && completedFlashcards(item) >= lessonFlashcardTarget(item)) return 'Concluído';
  if(videoDone || n(item.hours) > 0 || completedQuestions(item) > 0 || completedFlashcards(item) > 0) return 'Aguardando';
  return 'Não Iniciado';
}
function progressOf(item) {
  if(statusOf(item)==='Concluído') return 1;
  return clamp(((scheduleVideoCompleted(item) ? 1 : 0) + clamp(completedQuestions(item)/lessonQuestionTarget(item)) + clamp(completedFlashcards(item)/lessonFlashcardTarget(item))) / 3);
}
function badgeStatus(s) { const cls = s==='Concluído'?'done':s==='Aguardando'?'wait':'no'; return `<span class="badge ${cls}">${s}</span>`; }
function byDate(a,b) { return a.date.localeCompare(b.date) || n(a.block)-n(b.block) || n(a.row)-n(b.row) || a.topic.localeCompare(b.topic); }
function byPendingBlockOrder(a,b) {
  const current = n(currentScheduleBlock());
  const aBlock = n(a.block);
  const bBlock = n(b.block);
  const aInCurrentPath = aBlock > 0 && (!current || aBlock <= current);
  const bInCurrentPath = bBlock > 0 && (!current || bBlock <= current);
  if(aInCurrentPath !== bInCurrentPath) return aInCurrentPath ? -1 : 1;
  return aBlock - bBlock || a.date.localeCompare(b.date) || a.topic.localeCompare(b.topic);
}
function totals() {
  const schedule = state.schedule;
  const completed = schedule.filter(x => statusOf(x)==='Concluído').length;
  const due = schedule.filter(x => x.date <= ui.refDate);
  const overdue = due.filter(x => statusOf(x)!=='Concluído');
  const debtQ = overdue.reduce((s,x)=>s+Math.max(0,n(x.metaQ)-completedQuestions(x)),0);
  const debtFC = overdue.reduce((s,x)=>s+Math.max(0,n(x.metaFC)-completedFlashcards(x)),0);
  return {
    total: schedule.length, completed, progress: completed / Math.max(schedule.length,1),
    q: schedule.reduce((s,x)=>s+completedQuestions(x),0), fc: schedule.reduce((s,x)=>s+completedFlashcards(x),0), hours: schedule.reduce((s,x)=>s+n(x.hours),0),
    due: due.length, overdue: overdue.length, debtQ, debtFC,
    next: schedule.filter(x => x.date >= ui.refDate && statusOf(x)!=='Concluído').sort(byDate)[0]
  };
}
function areaStats() {
  const map = new Map();
  state.schedule.forEach(x => {
    const k = x.area || 'Sem área';
    if(!map.has(k)) map.set(k, {area:k,total:0,done:0,q:0,metaQ:0,fc:0,metaFC:0,hours:0,items:[]});
    const m = map.get(k); m.total++; m.done += statusOf(x)==='Concluído'?1:0; m.q+=completedQuestions(x); m.metaQ+=n(x.metaQ); m.fc+=completedFlashcards(x); m.metaFC+=n(x.metaFC); m.hours+=n(x.hours); m.items.push(x);
  });
  return [...map.values()].map(x => ({...x, progress:x.done/Math.max(x.total,1), debtQ:Math.max(0,x.metaQ-x.q), debtFC:Math.max(0,x.metaFC-x.fc)})).sort((a,b)=>a.progress-b.progress || b.total-a.total);
}
function filteredSchedule() {
  const q = ui.search.toLowerCase().trim();
  const currentBlock = String(currentScheduleBlock());
  return state.schedule.filter(x => {
    const st = statusOf(x);
    const okText = !q || [x.topic,x.area,x.week,x.priority,x.notes,x.date].join(' ').toLowerCase().includes(q);
    const okArea = ui.area==='Todas' || x.area===ui.area;
    const okStatus = ui.status==='Todos' || st===ui.status;
    const okBlock = ui.scheduleBlock==='Todos' || (ui.scheduleBlock==='Atual' ? String(x.block)===currentBlock : String(x.block)===String(ui.scheduleBlock));
    return okText && okArea && okStatus && okBlock;
  }).sort(byDate);
}
function metric(label,value,foot='') { return `<div class="card metric-card"><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-foot">${foot}</div></div>`; }
function progress(label,value,foot='') { return `<div class="kpi-row"><div><strong>${label}</strong><div class="muted">${foot}</div></div><div>${pct(value)}</div></div><div class="progress"><span style="width:${pct(value)}"></span></div>`; }
function scheduleBlocks() { return [...new Set(state.schedule.map(x => x.block).filter(x => x !== undefined && x !== null).map(String))].sort((a,b)=>n(a)-n(b)); }
function currentScheduleBlock() {
  const asOf = ui.refDate || localISODate(new Date());
  const mainSchedule = state.schedule.filter(item => !item.catchUp);
  const reached = mainSchedule.filter(item => item.date && item.date <= asOf).sort((a,b)=>byDate(b,a))[0];
  if(reached?.block !== undefined) return reached.block;
  const next = mainSchedule.filter(item => item.date && item.date > asOf).sort(byDate)[0];
  return next?.block || scheduleBlocks()[0] || '';
}
function lastChangedLesson() {
  return state.schedule.filter(item => item.notes || n(item.manualQ)!==n(item.q) || n(item.manualFC)!==n(item.fc) || n(item.hours)>0).sort((a,b)=>byDate(b,a))[0] || null;
}
function blockStatus(block) {
  const items = state.schedule.filter(item => String(item.block) === String(block));
  if(!items.length) return 'future';
  if(items.every(item => statusOf(item) === 'Concluído')) return 'done';
  const blockEnd = items.map(item => item.date).sort().at(-1);
  if(blockEnd > ui.refDate) return 'future';
  return items.some(item => statusOf(item) !== 'Não Iniciado') ? 'pending' : 'not-started';
}
function blockStatusTitle(status) {
  return status === 'done' ? 'Bloco concluído'
    : status === 'pending' ? 'Bloco vencido com pendências'
    : status === 'not-started' ? 'Bloco vencido não iniciado'
    : 'Bloco futuro ou em andamento';
}
function renderBlockStrip() {
  const current = String(currentScheduleBlock());
  return `<div class="block-strip"><button class="block-chip ${ui.scheduleBlock==='Todos'?'active':''}" data-schedule-block="Todos">Todos</button>${scheduleBlocks().map(block => {
    const status = blockStatus(block);
    const weekCurrent = block === current;
    return `<button class="block-chip ${String(ui.scheduleBlock)===block?'active':''} ${status} ${weekCurrent?'week-current':''}" title="${escapeAttr(weekCurrent?'Bloco desta semana':blockStatusTitle(status))}" data-schedule-block="${escapeAttr(block)}">${escapeHtml(block)}</button>`;
  }).join('')}</div>`;
}
function dayRoadItems(date) {
  const lessons = state.schedule.filter(x => x.date === date).sort(byDate);
  const log = getDayLog(date);
  const dayVideoLessons = [...new Map(lessons.flatMap(item => videoLessonsForSchedule(item)).map(lesson => [lesson.id, lesson])).values()];
  const dayVideoFiles = dayVideoLessons.flatMap(lesson => lesson.videos || []);
  const dayVideoProgress = dayVideoLessons.reduce((total, lesson) => {
    const progress = videoLessonProgress(lesson);
    total.done += progress.done;
    total.target += progress.total;
    return total;
  }, { done:0, target:0 });
  const videoTarget = Math.max(1, dayVideoProgress.target || dayVideoLessons.length || lessons.length || 1);
  const videosDone = Math.min(videoTarget, dayVideoProgress.done);
  const questionTarget = DAILY_QUESTION_TARGET;
  const flashcardTarget = DAILY_FLASHCARD_TARGET;
  const lessonLabel = lessons.length
    ? lessons.slice(0,2).map(item => item.topic).join(' + ') + (lessons.length > 2 ? ` +${lessons.length - 2}` : '')
    : 'Abrir videoaula do dia';
  return [
    { id: 'daily-video', type: 'Aquecimento', icon: '▶', label: lessonLabel, done: videosDone >= videoTarget, progress: videosDone, target: videoTarget, unit: videoTarget === 1 ? 'aula' : 'aulas', foot: lessons.length ? `Bloco ${lessons[0].block} · ${dayVideoFiles.length ? `${dayVideoFiles.length} arquivos disponíveis` : lessons.map(item=>item.area).filter(Boolean).slice(0,2).join(' / ')}` : 'Primeiro trecho do caminho' },
    { id: 'daily-questions', type: 'Desafio', icon: 'Q', label: `${questionTarget} questões`, done: n(log.questions) >= questionTarget, progress: n(log.questions), target: questionTarget, unit: 'questões', foot: n(log.correct)+n(log.wrong) ? `${pct(dayScore(log))} de nota` : 'Meta mínima antes de liberar o check' },
    { id: 'daily-flashcards', type: 'Fixação', icon: 'FC', label: `${flashcardTarget} flashcards`, done: n(log.flashcards) >= flashcardTarget, progress: n(log.flashcards), target: flashcardTarget, unit: 'flashcards', foot: 'Fechamento do ciclo de revisão' }
  ];
}
function renderDailyRoad(date) {
  const items = dayRoadItems(date);
  const firstOpen = items.findIndex(item => !item.done);
  return `<div class="dashboard-road"><div class="section-title"><div><h2>Trilha do dia</h2><div class="muted">${fmtDate(date)} · complete a rota: aquecer com aulas, encarar questões e fechar com revisão.</div></div><input class="input" id="dashboardDate" inputmode="numeric" placeholder="dd/mm/aaaa"></div><div class="road-path">${items.map((item,index) => {
    const ratio = clamp(n(item.progress) / Math.max(n(item.target), 1));
    const partial = !item.done && n(item.progress) > 0;
    const statusText = item.done ? 'concluída' : partial ? 'em progresso' : 'na fila';
    return `<div class="road-step ${item.done?'complete':''} ${partial?'partial':''} ${index===firstOpen?'active':''}"><div class="road-step-head"><div class="road-dot">${item.done?'✓':index+1}</div><div><strong>${escapeHtml(item.type)}</strong><div class="road-mini">Etapa ${index+1} de ${items.length}</div></div><div class="road-icon">${escapeHtml(item.icon)}</div></div><div class="road-label">${escapeHtml(item.label)}</div><div class="road-sub muted">${escapeHtml(item.foot)}</div><div class="road-progress"><div class="road-progress-row"><span>${Math.round(n(item.progress))} / ${Math.round(n(item.target))} ${escapeHtml(item.unit)}</span><span>${pct(ratio)}</span></div><div class="progress"><span style="width:${pct(ratio)}"></span></div></div><div class="road-actions"><button class="tiny-btn" data-road-step="${escapeAttr(item.id)}">Abrir estação</button><span class="checkin-stamp ${item.done?'complete':''}">${statusText}</span></div></div>`;
  }).join('')}</div></div>`;
}
function toggleRoadCheckin(date, id) {
  if(!state.dailyCheckins || typeof state.dailyCheckins !== 'object') state.dailyCheckins = {};
  if(!state.dailyCheckins[date]) state.dailyCheckins[date] = {};
  if(state.dailyCheckins[date][id]) delete state.dailyCheckins[date][id];
  else state.dailyCheckins[date][id] = new Date().toISOString();
  persist();
}
function countdownParts(date) {
  const target = new Date(`${date || localISODate(new Date())}T23:59:59`);
  const diff = Math.max(0, target.getTime() - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const days = Math.floor(totalSeconds / 86400);
  return { months: Math.floor(days / 30), days: days % 30, totalDays: days, hours, minutes, seconds };
}
function countdownText(parts) {
  const chunks = [];
  if(parts.months) chunks.push(`${parts.months} ${parts.months === 1 ? 'mês' : 'meses'}`);
  if(parts.days || !chunks.length) chunks.push(`${parts.days} ${parts.days === 1 ? 'dia' : 'dias'}`);
  return chunks.join(' e ');
}
function countdownPrecision(parts) {
  return `${String(parts.hours).padStart(2,'0')}h ${String(parts.minutes).padStart(2,'0')}min ${String(parts.seconds).padStart(2,'0')}s`;
}
function renderCountdown() {
  const date = state.dashboardSettings?.countdownDate || '';
  const p = countdownParts(date);
  return `<div class="card countdown-card"><div class="countdown-ring"><div id="countdownValue"><strong>${escapeHtml(countdownText(p))}</strong><small>${escapeHtml(countdownPrecision(p))}</small></div></div><div><div class="section-title"><div><h2>Contagem regressiva</h2><div class="muted">Tempo restante até a data escolhida.</div></div></div><input class="input" id="countdownDate" inputmode="numeric" placeholder="dd/mm/aaaa"><div class="countdown-detail" id="countdownDetail">${p.totalDays} dias no total</div></div></div>`;
}
function startDashboardCountdown() {
  if(dashboardCountdownInterval) clearInterval(dashboardCountdownInterval);
  const update = () => {
    const el = document.getElementById('countdownValue');
    if(!el) return;
    const p = countdownParts(state.dashboardSettings?.countdownDate || '');
    el.innerHTML = `<strong>${escapeHtml(countdownText(p))}</strong><small>${escapeHtml(countdownPrecision(p))}</small>`;
    const detail = document.getElementById('countdownDetail');
    if(detail) detail.textContent = `${p.totalDays} dias no total`;
  };
  update();
  dashboardCountdownInterval = setInterval(update, 60000);
}
function renderTabs() {
  document.getElementById('tabs').innerHTML = views.map(([id,label,icon]) => `<button class="tab ${ui.tab===id?'active':''}" data-tab="${id}" title="${escapeAttr(label)}">${iconSvg(icon)}<span>${label}</span></button>`).join('');
  document.querySelectorAll('#tabs .tab').forEach(b => b.onclick = () => {
    if(autoStudyIsRunning()) stopAutoStudy();
    if(ui.tab === 'aulas') saveOpenVideoPosition();
    ui.tab=b.dataset.tab;
    if(ui.tab==='questoes') { ui.qFocusScheduleId=''; ui.qStatus='Não respondidas'; ui.qIndex=0; ui.justAnsweredId=''; resetKeyboardConfirmation(); }
    render();
  });
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id===ui.tab));
  if(window.matchMedia('(max-width: 820px)').matches) {
    requestAnimationFrame(() => document.querySelector('.tab.active')?.scrollIntoView({block:'nearest', inline:'center', behavior:'smooth'}));
  }
}
function setupSidebar() {
  const toggle = document.getElementById('sidebarToggle');
  const apply = collapsed => {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    if(toggle) {
      toggle.textContent = collapsed ? '›' : '‹';
      toggle.title = collapsed ? 'Expandir menu' : 'Recolher menu';
      toggle.setAttribute('aria-label', toggle.title);
      toggle.setAttribute('aria-expanded', String(!collapsed));
    }
  };
  apply(localStorage.getItem(SIDEBAR_KEY) === '1');
  if(toggle) toggle.onclick = () => {
    const collapsed = !document.body.classList.contains('sidebar-collapsed');
    localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
    apply(collapsed);
  };
}
function iconSvg(name) {
  const paths = {
    dashboard:'<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
    alert:'<path d="M12 2 3 6v6c0 5 3.8 8.7 9 10 5.2-1.3 9-5 9-10V6Z"/><path d="M12 8v5"/><path d="M12 17h.01"/>',
    route:'<circle cx="6" cy="19" r="3"/><path d="M9 19h3.5a4.5 4.5 0 0 0 0-9H11a4 4 0 0 1 0-8h4"/><circle cx="18" cy="5" r="3"/>',
    play:'<circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4Z"/>',
    brain:'<path d="M9.5 4A3.5 3.5 0 0 0 6 7.5v.2A3.5 3.5 0 0 0 4 11v1a3.5 3.5 0 0 0 2 3.2v.3A3.5 3.5 0 0 0 9.5 19H12V4Z"/><path d="M14.5 4A3.5 3.5 0 0 1 18 7.5v.2a3.5 3.5 0 0 1 2 3.3v1a3.5 3.5 0 0 1-2 3.2v.3a3.5 3.5 0 0 1-3.5 3.5H12V4Z"/><path d="M8 9h4M12 14h4"/>',
    cards:'<rect width="14" height="18" x="5" y="3" rx="2"/><path d="M9 7h6M9 11h6M9 15h3"/>',
    library:'<path d="m16 6 4 14M12 6v14M8 8v12M4 4v16"/><path d="M2 20h20"/>',
    timer:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
    chart:'<path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/>',
    insight:'<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/><path d="m4 7 6-4 6 6 5-5"/>',
    history:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    message:'<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 9h8M8 13h5"/>'
    ,prescription:'<path d="M9 3h6l1 3h3a2 2 0 0 1 2 2v12H3V8a2 2 0 0 1 2-2h3Z"/><path d="M9 6h6M8 11h8M8 15h5"/><path d="M16 15v5M13.5 17.5h5"/>'
  };
  return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.dashboard}</svg>`;
}
function renderDashboardMood(log) {
  return `<div class="card"><div class="section-title"><div><h2>Como você está hoje?</h2><div class="muted">Registre seu ritmo antes de começar.</div></div><span class="badge today">${fmtDate(log.date)}</span></div><div class="mood-row">${[[3,'🙂','Motivado'],[2,'😐','Mais ou menos'],[1,'😴','Lento']].map(([value,face,label]) => `<button class="mood-btn ${n(log.mood)===value?'active':''}" data-dashboard-mood="${value}">${face}<small>${label}</small></button>`).join('')}</div></div>`;
}
function formatDailyStudyTime(minutes) {
  const total = Math.max(0, Math.round(n(minutes)));
  const hours = Math.floor(total / 60);
  const remaining = total % 60;
  if(!hours) return `${remaining} min`;
  return remaining ? `${hours} h ${remaining} min` : `${hours} h`;
}
function dailyStudySnapshot(date) {
  const log = getDayLog(date);
  const minutes = {
    video:n(log.lessonMinutes),
    questions:n(log.questionMinutes),
    flashcards:n(log.flashcardMinutes),
    materials:n(log.materialMinutes),
    simulados:n(log.simuladoMinutes)
  };
  if(date === localISODate(new Date()) && studyTimeTracker.kind) {
    const activeMinutes = autoStudyElapsedSeconds() / 60;
    if(studyTimeTracker.kind === 'video') minutes.video += activeMinutes;
    else if(studyTimeTracker.kind === 'flashcards') minutes.flashcards += activeMinutes;
    else if(studyTimeTracker.kind === 'material') minutes.materials += activeMinutes;
    else if(studyTimeTracker.kind === 'simulado') minutes.simulados += activeMinutes;
    else minutes.questions += activeMinutes;
  }
  return {
    log,
    minutes,
    totalMinutes:minutes.video + minutes.questions + minutes.flashcards + minutes.materials + minutes.simulados,
    videos:Math.max(0, Math.round(n(log.videos))),
    questions:Math.max(0, Math.round(n(log.questions))),
    flashcards:Math.max(0, Math.round(n(log.flashcards)))
  };
}
function renderDailyAnalysis(date) {
  const snapshot = dailyStudySnapshot(date);
  const questionProgress = Math.min(100, Math.round(snapshot.questions / DAILY_QUESTION_TARGET * 100));
  const flashcardProgress = Math.min(100, Math.round(snapshot.flashcards / DAILY_FLASHCARD_TARGET * 100));
  const tiles = [
    { icon:'timer', label:'Tempo estudado', value:formatDailyStudyTime(snapshot.totalMinutes), foot:`${formatDailyStudyTime(snapshot.minutes.video)} aulas · ${formatDailyStudyTime(snapshot.minutes.questions)} questões · ${formatDailyStudyTime(snapshot.minutes.simulados)} simulados · ${formatDailyStudyTime(snapshot.minutes.materials)} materiais · ${formatDailyStudyTime(snapshot.minutes.flashcards)} revisão`, progress:null },
    { icon:'play', label:'Videoaulas', value:snapshot.videos, foot:snapshot.videos === 1 ? 'videoaula concluída hoje' : 'videoaulas concluídas hoje', progress:null },
    { icon:'brain', label:'Questões', value:snapshot.questions, foot:`Meta diária: ${DAILY_QUESTION_TARGET}`, progress:questionProgress },
    { icon:'cards', label:'Flashcards', value:snapshot.flashcards, foot:`Meta diária: ${DAILY_FLASHCARD_TARGET}`, progress:flashcardProgress }
  ];
  return `<section class="card daily-analysis"><div class="section-title"><div><span class="eyebrow">Seu desempenho</span><h2>Análise do dia</h2></div><span class="badge today">${fmtDate(date)}</span></div><div class="daily-analysis-grid">${tiles.map(tile => `<article class="daily-analysis-tile"><span class="daily-analysis-icon">${iconSvg(tile.icon)}</span><div><span class="daily-analysis-label">${tile.label}</span><strong>${tile.value}</strong><small>${tile.foot}</small>${tile.progress === null ? '' : `<div class="daily-analysis-progress" role="progressbar" aria-valuenow="${tile.progress}" aria-valuemin="0" aria-valuemax="100"><span style="width:${tile.progress}%"></span></div>`}</div></article>`).join('')}</div></section>`;
}
function renderManualStudyEntry(date) {
  const studyDate = ui.manualStudyDate || date;
  const lessons = state.schedule.filter(item => item.date === studyDate).sort(byDate);
  const options = lessons.length
    ? lessons.map(item => `<option value="${escapeAttr(item.id)}">B${item.block} · ${escapeHtml(item.topic)}</option>`).join('')
    : '<option value="">Escolha outra data com aulas</option>';
  return `<div class="card"><div class="section-title"><div><h2>Lançamento manual</h2><div class="muted">Registre estudo feito fora do planner, como Anki ou apostila.</div></div></div><div class="field-row"><input class="input full-field" id="manualStudyDate" inputmode="numeric" placeholder="Data de realização: dd/mm/aaaa"><select class="select full-field" id="manualStudyLesson">${options}</select><input class="input" id="manualStudyQuestions" type="number" min="0" step="1" placeholder="Questões"><input class="input" id="manualStudyFlashcards" type="number" min="0" step="1" placeholder="Flashcards"><button class="icon-btn primary" id="saveManualStudy" ${lessons.length?'':'disabled'}>Adicionar</button></div></div>`;
}
function bindManualStudyEntry(date) {
  bindPlannerDateInput('manualStudyDate', ui.manualStudyDate || date, value => { ui.manualStudyDate=value; render(); });
  const button=document.getElementById('saveManualStudy');
  if(!button) return;
  button.onclick=() => {
    const lesson=state.schedule.find(item => item.id===document.getElementById('manualStudyLesson')?.value);
    if(!lesson) return;
    const questions=Math.max(0,n(document.getElementById('manualStudyQuestions')?.value));
    const flashcards=Math.max(0,n(document.getElementById('manualStudyFlashcards')?.value));
    if(!questions && !flashcards) return;
    lesson.manualQ=n(lesson.manualQ)+questions;
    lesson.manualFC=n(lesson.manualFC)+flashcards;
    const log=getDayLog(ui.manualStudyDate || date);
    if(questions) { log.questionsOn=true; log.questions=n(log.questions)+questions; }
    if(flashcards) { log.flashcardsOn=true; log.flashcards=n(log.flashcards)+flashcards; }
    persist();
  };
}
function renderPainel() {
  const t = totals(); const areas = areaStats(); const next = t.next; const dashboardLog=getDayLog(ui.refDate);
  document.getElementById('painel').innerHTML = `
    ${renderDashboardMood(dashboardLog)}
    ${renderDailyAnalysis(ui.refDate)}
    <div class="card">${renderDailyRoad(ui.refDate)}</div>
    ${renderCountdown()}
    <div class="grid cards">
      ${metric('Mapa geral', pct(t.progress), `${t.completed} de ${t.total} aulas concluídas`)}
      ${metric('Questões feitas', Math.round(t.q), `${Math.round(t.debtQ)} ainda em aberto até ${fmtDate(ui.refDate)}`)}
      ${metric('Revisões', Math.round(t.fc), `${Math.round(t.debtFC)} flashcards para pagar`)}
      ${metric('Horas focadas', t.hours.toFixed(1), 'registradas no cronograma')}
      ${metric('Pendências abertas', t.overdue, `${t.due} itens vencidos/até referência`)}
      ${metric('Próximo alvo', next ? `Bloco ${next.block}` : 'Livre', next ? `${fmtDate(next.date)} · ${next.area}` : 'Nada pendente futuro')}
    </div>
    <div class="reschedule-note"><strong>Recomeço ajustado:</strong> blocos 10 a 30 redistribuídos a partir de 13/07/2026. Durante as férias: até 2 aulas por dia útil. A partir de 10/08: 1 aula por dia útil. Pendências antigas entram aos poucos nos fins de semana.</div>
    ${renderManualStudyEntry(ui.refDate)}
    <div class="grid two">
      <div class="card"><div class="section-title"><h2>Ritmo da semana</h2><input class="input" id="refDate" inputmode="numeric" placeholder="dd/mm/aaaa"></div>
        ${progress('Aulas concluídas', t.progress, 'Calculado por meta de questões + flashcards')}
        ${progress('Questões em dia', 1 - t.debtQ/Math.max(t.debtQ+t.q,1), `${Math.round(t.debtQ)} questões pendentes`)}
        ${progress('Flashcards em dia', 1 - t.debtFC/Math.max(t.debtFC+t.fc,1), `${Math.round(t.debtFC)} flashcards pendentes`)}
      </div>
      <div class="card"><div class="section-title"><h2>Fila para destravar</h2><button class="icon-btn" onclick="ui.tab='pendencias';render()">Ver pendências</button></div>
        <div class="list">${renderMiniList(state.schedule.filter(x => x.date <= ui.refDate && statusOf(x)!=='Concluído').sort(byPendingBlockOrder).slice(0,7))}</div>
      </div>
    </div>
    <div class="grid two">
      <div class="card"><div class="section-title"><h2>Radar de áreas</h2><button class="icon-btn" onclick="ui.tab='areas';render()">Ver áreas</button></div>${areas.slice(0,6).map(areaLine).join('')}</div>
      <div class="card"><div class="section-title"><h2>Simulados</h2><button class="icon-btn" onclick="ui.tab='simulados';render()">Abrir</button></div>${renderSimSummary()}</div>
    </div>`;
  bindPlannerDateInput('refDate', ui.refDate, date => { ui.refDate=date; render(); });
  bindPlannerDateInput('dashboardDate', ui.refDate, date => { ui.refDate=date; render(); });
  bindPlannerDateInput('countdownDate', state.dashboardSettings.countdownDate, date => { state.dashboardSettings.countdownDate=date; persist(); });
  bindManualStudyEntry(ui.refDate);
  document.querySelectorAll('[data-dashboard-mood]').forEach(button => button.onclick = event => setDayLog(ui.refDate, 'mood', n(event.currentTarget.dataset.dashboardMood)));
  startDashboardCountdown();
  document.querySelectorAll('[data-road-step]').forEach(button => button.onclick = e => {
    const target = e.currentTarget.dataset.roadStep;
    if(target === 'daily-questions') ui.tab = 'questoes';
    else if(target === 'daily-flashcards') ui.tab = 'flashcards';
    else { openDayVideos(ui.refDate); return; }
    render();
  });
  bindScheduleInputs();
}
function renderMiniList(items) {
  if(!items.length) return '<div class="empty">Sem pendências nesse filtro.</div>';
  return items.map(x => `<div class="item"><div class="date-chip">${fmtDate(x.date).slice(0,5)}</div><div><button class="schedule-topic-link" data-open-schedule-questions="${escapeAttr(x.id)}"><strong>${escapeHtml(x.topic)}</strong></button><div class="muted">Bloco ${x.block} · ${escapeHtml(x.area)} · faltam ${Math.max(0,n(x.metaQ)-completedQuestions(x))} questões e ${Math.max(0,n(x.metaFC)-completedFlashcards(x))} flashcards</div></div><div>${badgeStatus(statusOf(x))}</div></div>`).join('');
}
function areaLine(a) { return `<div class="area-bar"><strong>${escapeHtml(a.area)}</strong><div class="bar"><span style="width:${pct(a.progress)}"></span></div><span>${pct(a.progress)}</span></div>`; }
function renderPendencias() {
  const items = state.schedule.filter(x => x.date <= ui.refDate && statusOf(x)!=='Concluído').sort(byPendingBlockOrder);
  const t=totals();
  document.getElementById('pendencias').innerHTML = `<div class="grid cards">${metric('Aulas pendentes', items.length, `até ${fmtDate(ui.refDate)}`)}${metric('Questões pendentes', Math.round(t.debtQ), 'diferença entre meta e realizado')}${metric('Flashcards pendentes', Math.round(t.debtFC), 'diferença entre meta e realizado')}</div><div class="card"><div class="section-title"><div><h2>Pendências por bloco</h2><div class="muted">A revisão começa pelos blocos mais antigos. Cada aula conclui com vídeo, 10 questões e 10 flashcards.</div></div><input class="input" id="pendDate" type="date" value="${ui.refDate}"></div>${renderPendingLessons(items)}</div>`;
  document.getElementById('pendDate').onchange = e => { ui.refDate=e.target.value; render(); }; bindScheduleInputs();
}
function renderCronograma() {
  const areas = ['Todas', ...new Set(state.schedule.map(x=>x.area).filter(Boolean).sort())];
  const rows = filteredSchedule();
  const changed = lastChangedLesson();
  document.getElementById('cronograma').innerHTML = `<div class="card"><div class="section-title"><div><h2>Blocos do cronograma</h2><div class="muted">${changed ? `Última alteração: ${escapeHtml(changed.topic)} (${fmtDate(changed.date)})` : 'Acompanhe a semana pelos blocos.'}</div></div></div>${renderBlockStrip()}<div class="toolbar"><input class="input" id="search" placeholder="Buscar tema, área, data..." value="${escapeAttr(ui.search)}"><select class="select" id="areaFilter">${areas.map(a=>`<option ${a===ui.area?'selected':''}>${escapeHtml(a)}</option>`).join('')}</select><select class="select" id="statusFilter">${['Todos','Concluído','Aguardando','Não Iniciado'].map(s=>`<option ${s===ui.status?'selected':''}>${s}</option>`).join('')}</select><button class="icon-btn" id="clearFilters">Limpar filtros</button></div></div><div class="card"><div class="section-title"><h2>Cronograma editável</h2><span class="muted">${rows.length} itens</span></div>${renderScheduleTable(rows, true)}</div>`;
  enhanceScheduleStudyIcons();
  document.getElementById('search').oninput = debounce(e => {
    const value=e.target.value;
    const cursor=e.target.selectionStart;
    ui.search=value;
    renderCronograma();
    requestAnimationFrame(() => { const input=document.getElementById('search'); if(input) { input.focus(); input.setSelectionRange(cursor,cursor); } });
  }, 220);
  document.getElementById('areaFilter').onchange = e => { ui.area=e.target.value; render(); };
  document.getElementById('statusFilter').onchange = e => { ui.status=e.target.value; render(); };
  document.querySelectorAll('[data-schedule-block]').forEach(button => button.onclick = e => { ui.scheduleBlock = e.currentTarget.dataset.scheduleBlock; render(); });
  document.getElementById('clearFilters').onclick = () => { ui.search=''; ui.area='Todas'; ui.status='Todos'; ui.scheduleBlock='Atual'; render(); };
  bindScheduleInputs();
}
function renderPendingLessons(items) {
  if(!items.length) return '<div class="empty">Nenhuma pendência até esta data.</div>';
  return `<div class="pending-list">${items.map(item => {
    const videoAvailable = plannedVideoCountForSchedule(item) > 0;
    const videoDone = scheduleVideoCompleted(item);
    const questionStats = questionStatsForSchedule(item.id);
    const flashcardStats = flashcardStatsForSchedule(item.id);
    return `<div class="pending-lesson"><div><div class="pending-lesson-title">${priorityBar(item)}<button class="schedule-topic-link" data-open-schedule-questions="${escapeAttr(item.id)}"><strong>B${item.block} · ${escapeHtml(item.topic)}</strong></button></div><div class="muted">${escapeHtml(item.area)} · ${badgeStatus(statusOf(item))}</div></div><div class="pending-lesson-actions"><button class="pending-action ${videoDone?'done':''}" data-toggle-schedule-video="${escapeAttr(item.id)}" ${videoAvailable?'':'disabled'} title="Marcar videoaula como assistida"><span class="pending-symbol">▶</span><small>${videoDone?'vista':'vídeo'}</small></button><button class="pending-action" data-open-schedule-questions="${escapeAttr(item.id)}" title="Abrir questões desta aula"><span class="pending-symbol">Q</span><small>${questionStats.done}/${Math.round(n(item.metaQ))}</small></button><button class="pending-action" data-open-schedule-flashcards="${escapeAttr(item.id)}" title="Abrir flashcards desta aula"><span class="pending-symbol">▤</span><small>${flashcardStats.reviews}/${Math.round(n(item.metaFC))}</small></button></div></div>`;
  }).join('')}</div>`;
}
function renderScheduleTable(rows, editable=false) {
  if(!rows.length) return '<div class="empty">Nada para mostrar aqui.</div>';
  return `<div class="table-wrap"><table class="schedule-table"><thead><tr><th>Data</th><th>Bloco</th><th>Tema</th><th>Área</th><th>Status</th><th class="num">Questões</th><th class="num">Banco</th><th class="num">Flashcards</th><th class="num">Horas</th><th class="num">Progresso</th><th>Anotações</th></tr></thead><tbody>${rows.map(x => { const bank=questionStatsForSchedule(x.id); const cards=flashcardStatsForSchedule(x.id); const videoCount=plannedVideoCountForSchedule(x); const videoDone=scheduleVideoCompleted(x); return `<tr><td class="schedule-date-cell">${fmtDate(x.date)}<div class="muted">${x.day}</div></td><td class="schedule-block-cell">${x.block ?? ''}</td><td class="schedule-topic-cell"><div class="schedule-topic-line">${priorityBar(x)}<button class="schedule-topic-link" data-open-schedule-questions="${escapeAttr(x.id)}"><strong>${escapeHtml(x.topic)}</strong></button>${videoCount?` <button class="tiny-btn" data-open-schedule-videos="${escapeAttr(x.id)}" title="Abrir videoaula">▶</button><button class="tiny-btn" data-toggle-schedule-video="${escapeAttr(x.id)}" title="Marcar videoaula como vista">${videoDone?'Vídeo ✓':'Vídeo'}</button>`:''}</div><div class="schedule-meta muted">Meta: ${x.metaQ} questões · ${x.metaFC} flashcards · ${x.metaH} h${videoCount?` · ${videoCount} vídeo${videoCount===1?'':'s'}`:''}</div></td><td>${escapeHtml(x.area)}</td><td>${badgeStatus(statusOf(x))}</td><td class="num"><input class="mini-input" data-id="${x.id}" data-field="q" type="number" min="0" step="1" value="${completedQuestions(x)}"><div class="auto-progress">Banco ${bank.done}${n(x.manualQ) ? ` · manual ${n(x.manualQ)}` : ''}</div></td><td class="num"><button class="tiny-btn" data-open-schedule-questions="${escapeAttr(x.id)}">Abrir</button><div class="bank-result"><strong>${bank.done}</strong> feitas<br>${bank.correct} certas · ${bank.done?pct(bank.rate):'-'}</div></td><td class="num"><input class="mini-input" data-id="${x.id}" data-field="fc" type="number" min="0" step="1" value="${n(x.manualFC)}"><div class="auto-progress">+${cards.reviews} revisões</div></td><td class="num"><input class="mini-input" data-id="${x.id}" data-field="hours" type="number" min="0" step="0.25" value="${n(x.hours)}"></td><td class="num">${pct(progressOf(x))}</td><td><input class="notes-input" data-id="${x.id}" data-field="notes" value="${escapeAttr(x.notes)}"></td></tr>`; }).join('')}</tbody></table></div>`;
}
function enhanceScheduleStudyIcons() {
  const currentBlock=n(currentScheduleBlock());
  document.querySelectorAll('.schedule-table tbody tr').forEach(row => {
    const videoToggle=row.querySelector('[data-toggle-schedule-video]');
    const openVideo=row.querySelector('[data-open-schedule-videos]');
    const scheduleId=videoToggle?.dataset.toggleScheduleVideo || openVideo?.dataset.openScheduleVideos;
    const item=state.schedule.find(entry=>entry.id===scheduleId);
    const topicLine=row.querySelector('.schedule-topic-line');
    if(!item || !topicLine) return;
    videoToggle?.remove();
    openVideo?.remove();
    const colorable=n(item.block)<=currentBlock;
    const stateClass=done=>done?'done':colorable?'missing':'future';
    const videoDone=scheduleVideoCompleted(item);
    const questionDone=completedQuestions(item)>=lessonQuestionTarget(item);
    const flashcardDone=completedFlashcards(item)>=lessonFlashcardTarget(item);
    const icons=document.createElement('span');
    icons.className='schedule-study-icons';
    icons.innerHTML=`${plannedVideoCountForSchedule(item)>0?`<button class="schedule-study-icon ${stateClass(videoDone)}" data-open-schedule-videos="${escapeAttr(item.id)}" title="${videoDone?'Videoaula concluída':'Videoaula pendente'}" aria-label="Videoaula">${iconSvg('play')}</button>`:''}<button class="schedule-study-icon ${stateClass(questionDone)}" data-open-schedule-questions="${escapeAttr(item.id)}" title="${completedQuestions(item)}/${lessonQuestionTarget(item)} questões" aria-label="Questões">${iconSvg('brain')}</button><button class="schedule-study-icon ${stateClass(flashcardDone)}" data-open-schedule-flashcards="${escapeAttr(item.id)}" title="${completedFlashcards(item)}/${lessonFlashcardTarget(item)} flashcards" aria-label="Flashcards">${iconSvg('cards')}</button>`;
    topicLine.append(icons);
  });
}
function bindScheduleInputs() {
  document.querySelectorAll('[data-id][data-field]').forEach(el => el.onchange = e => { const item = state.schedule.find(x=>x.id===e.target.dataset.id); if(!item) return; const f=e.target.dataset.field; if(f==='q') item.manualQ=Math.max(0, n(e.target.value) - questionStatsForSchedule(item.id).done); else if(f==='fc') item.manualFC=n(e.target.value); else item[f] = f==='notes' ? e.target.value : n(e.target.value); persist(); });
  document.querySelectorAll('[data-open-schedule-questions]').forEach(button => button.onclick = e => openQuestionsForSchedule(e.currentTarget.dataset.openScheduleQuestions));
  document.querySelectorAll('[data-open-schedule-flashcards]').forEach(button => button.onclick = e => openFlashcardsForSchedule(e.currentTarget.dataset.openScheduleFlashcards));
  document.querySelectorAll('[data-open-schedule-videos]').forEach(button => button.onclick = e => openVideosForSchedule(e.currentTarget.dataset.openScheduleVideos));
  document.querySelectorAll('[data-toggle-schedule-video]').forEach(button => button.onclick = e => {
    const item = state.schedule.find(entry => entry.id === e.currentTarget.dataset.toggleScheduleVideo);
    if(item) setScheduleVideosWatched(item.id, !scheduleVideoCompleted(item));
  });
}
function renderSimulados() {
  ensureSimTopics();
  const active = state.simuladoRuns.find(run => run.id === ui.activeSimRunId) || state.simuladoRuns.find(run => !run.finishedAt) || state.simuladoRuns[0] || null;
  if(active && !ui.activeSimRunId) ui.activeSimRunId = active.id;
  document.getElementById('simulados').innerHTML = `${renderImportedSimulados()}${renderSimuladoGenerator()}${active ? renderSimuladoRun(active) : ''}<div class="grid two"><div class="card"><div class="section-title"><h2>Resumo dos simulados</h2></div>${renderSimSummary()}</div><div class="card"><div class="section-title"><h2>Próximo simulado</h2></div>${renderNextSim()}</div></div><div class="card"><div class="section-title"><h2>Histórico de provas geradas</h2><span class="muted">${state.simuladoRuns.length} provas</span></div>${renderSimuladoRunsList()}</div><div class="card"><div class="section-title"><h2>Registro editável</h2></div>${renderSimTable()}</div><div class="card"><div class="section-title"><h2>Temas que mais errei</h2><span class="muted">Pesquise aulas do cronograma ou digite um tema novo.</span></div>${renderMissedTopics()}</div>`;
  bindSimInputs();
  bindSimuladoInputs(active);
}
function renderImportedSimulados() {
  const cards = importedSimulados.map(sim => `<div class="sim-review-card"><div class="sim-review-head"><div><strong>${escapeHtml(sim.name)}</strong><div class="muted">${sim.questionCount || sim.questions?.length || 0} questões · comentários por questão · tags editáveis</div></div><button class="icon-btn primary" data-start-imported-sim="${escapeAttr(sim.id)}">Iniciar</button></div></div>`).join('');
  return `<div class="card"><div class="section-title"><div><h2>Simulados importados</h2><div class="muted">${escapeHtml(importedSimuladosStatus)}</div></div><span class="badge today">Separado dos blocos</span></div>${cards ? `<div class="sim-review-grid">${cards}</div>` : '<div class="empty">Nenhum simulado importado encontrado ainda.</div>'}</div>`;
}
function normalizeSimAreaName(value='') {
  const clean = normalizedTopic(value);
  if(/pedi|crianca|infantil|neonato|recem|rn|puberdade|crescimento/.test(clean)) return 'Pediatria';
  if(/g o|gine|obst|gest|parto|puerper|fetal|menstrual|ovari|vaginal|mama|prenatal|pre natal/.test(clean)) return 'Ginecologia e Obstetrícia';
  if(/cirurg|atls|trauma|abdome agudo|apendic|vias biliares|queimadura|politrauma|pancreat|obstrut/.test(clean)) return 'Cirurgia Geral';
  if(/mfc|familia|comunidade|saude coletiva|saude publica|sus|prevent|rastream|vacin|geriatria|ambulatorial|indicadores/.test(clean)) return 'Medicina de Família e Comunidade';
  return 'Clínica Médica';
}
function simQuestionArea(question) {
  if(question?.sourceType === 'imported') return questionTag(question).area;
  const linked = scheduleForQuestion(question);
  return normalizeSimAreaName(`${question.area || ''} ${question.topic || ''} ${linked?.area || ''} ${linked?.topic || ''}`);
}
function questionTag(question) {
  const override = state.importedQuestionTags?.[question.id] || {};
  return {
    area: override.area || question.area || 'Clínica Médica',
    topic: override.topic || question.topic || 'Tema a revisar',
    subtopic: override.subtopic || question.subtopic || ''
  };
}
function importedQuestionById(id) {
  for(const sim of importedSimulados) {
    const found = (sim.questions || []).find(question => question.id === id);
    if(found) return found;
  }
  return null;
}
function simRunQuestions(run) {
  if(run.sourceType === 'imported') {
    const sim = importedSimulados.find(item => item.id === run.importedSimId);
    const source = sim?.questions || [];
    return run.questionIds.map(id => source.find(question => question.id === id)).filter(Boolean);
  }
  return run.questionIds.map(id => questionBank.find(q => q.id === id)).filter(Boolean);
}
function shuffle(items) {
  const copy = [...items];
  for(let i=copy.length-1;i>0;i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function buildBalancedSimulado(targets) {
  const selected = [];
  const used = new Set();
  ENAMED_AREAS.forEach(area => {
    const pool = shuffle(questionBank.filter(question => simQuestionArea(question) === area && !used.has(question.id)));
    pool.slice(0, Math.max(0, n(targets[area]))).forEach(question => { selected.push(question); used.add(question.id); });
  });
  const totalTarget = Object.values(targets).reduce((sum,value)=>sum+n(value),0);
  if(selected.length < totalTarget) {
    shuffle(questionBank.filter(question => !used.has(question.id))).slice(0, totalTarget - selected.length).forEach(question => selected.push(question));
  }
  return shuffle(selected);
}
function renderSimuladoGenerator() {
  const targets = defaultSimuladoTargets();
  const counts = ENAMED_AREAS.map(area => `${area}: ${questionBank.filter(q => simQuestionArea(q) === area).length}`).join(' · ');
  return `<div class="card"><div class="section-title"><div><h2>Modo Simulado ENAMED</h2><div class="muted">Gera uma prova embaralhada, salva suas respostas e só corrige ao finalizar.</div></div><span class="badge today">${questionBank.length} questões no banco</span></div><div class="sim-command"><div><input class="input" id="simRunName" value="Simulado ENAMED ${state.simuladoRuns.length + 1}" aria-label="Nome do simulado"><div class="sim-targets">${ENAMED_AREAS.map(area => `<div class="sim-target"><label>${escapeHtml(area)}</label><input class="input" type="number" min="0" max="40" step="1" data-sim-target="${escapeAttr(area)}" value="${targets[area]}"></div>`).join('')}</div><div class="muted" style="margin-top:8px">${escapeHtml(counts)}</div></div><div><label class="muted" for="simDuration">Tempo total</label><input class="input" id="simDuration" type="number" min="30" step="15" value="300" title="Tempo total em minutos"><button class="icon-btn primary" id="generateSimulado" style="margin-top:8px;width:100%" ${questionBank.length?'':'disabled'}>Gerar prova</button></div></div></div>`;
}
function renderSimuladoRunsList() {
  if(!state.simuladoRuns.length) return '<div class="empty">Nenhuma prova gerada ainda.</div>';
  return `<div class="list">${state.simuladoRuns.map(run => {
    const result = simuladoResult(run);
    return `<div class="item"><div class="date-chip">${run.finishedAt ? pct(result.rate) : `${answeredSimCount(run)}/${run.questionIds.length}`}</div><div><strong>${escapeHtml(run.name)}</strong><div class="muted">${run.finishedAt ? `Finalizado em ${new Date(run.finishedAt).toLocaleString('pt-BR')}` : 'Em andamento'} · ${run.questionIds.length} questões</div></div><div><button class="icon-btn" data-open-sim="${run.id}">${run.finishedAt?'Revisar':'Continuar'}</button></div></div>`;
  }).join('')}</div>`;
}
function renderSimuladoRun(run) {
  const questions = simRunQuestions(run);
  if(!questions.length) return '<div class="card"><div class="empty">Este simulado não encontrou questões carregadas.</div></div>';
  run.currentIndex = Math.max(0, Math.min(n(run.currentIndex), questions.length - 1));
  const question = questions[run.currentIndex];
  return run.finishedAt ? renderSimuladoResult(run, questions) : renderSimuladoExam(run, questions, question);
}
function answeredSimCount(run) { return Object.values(run.answers || {}).filter(Boolean).length; }
function beginSimQuestionTiming(run, questionId) {
  if(!run || !questionId || run.activeQuestionId === questionId) return;
  finishSimQuestionTiming(run);
  run.activeQuestionId = questionId;
  run.questionTimingStart = n(run.elapsedSeconds);
  if(!run.questionVisited || typeof run.questionVisited !== 'object') run.questionVisited = {};
  run.questionVisited[questionId] = true;
}
function finishSimQuestionTiming(run) {
  const questionId = run?.activeQuestionId;
  if(!run || !questionId) return;
  const delta = Math.max(0, n(run.elapsedSeconds) - n(run.questionTimingStart));
  if(delta) {
    if(!run.questionSeconds || typeof run.questionSeconds !== 'object') run.questionSeconds = {};
    run.questionSeconds[questionId] = n(run.questionSeconds[questionId]) + delta;
  }
  run.activeQuestionId = '';
  run.questionTimingStart = n(run.elapsedSeconds);
}
function setSimQuestionIndex(run, index) {
  finishSimQuestionTiming(run);
  run.currentIndex = Math.max(0, Math.min(run.questionIds.length - 1, n(index)));
  beginSimQuestionTiming(run, run.questionIds[run.currentIndex]);
}
function renderSimuladoExam(run, questions, question) {
  beginSimQuestionTiming(run, question.id);
  const selected = run.answers?.[question.id] || '';
  const tag = questionTag(question);
  const broadArea = tag.area || simQuestionArea(question) || 'Área geral';
  const eliminated = Array.isArray(run.eliminated?.[question.id]) ? run.eliminated[question.id] : [];
  const highlights = Array.isArray(run.highlights?.[question.id]) ? run.highlights[question.id] : [];
  const options = Object.entries(question.options || {}).map(([letter,text]) => {
    const isEliminated = eliminated.includes(letter);
    return `<div class="sim-answer-row"><button class="eliminate-btn ${isEliminated?'active':''}" data-sim-eliminate="${letter}" title="Riscar alternativa ${letter}">×</button><button class="sim-answer ${selected===letter?'selected':''} ${isEliminated?'eliminated':''}" data-sim-answer="${letter}"><span class="answer-letter">${letter}</span><span class="sim-highlightable" style="font-size:${state.questionSettings.fontSize}px">${renderHighlightedText(text, highlights)}</span></button></div>`;
  }).join('');
  return `<div class="sim-run-layout"><aside class="card"><div class="section-title"><h2>${escapeHtml(run.name)}</h2><span class="badge ${run.paused?'wait':'done'}">${run.paused?'Pausado':'Rodando'}</span></div><div class="sim-clock" id="simuladoClock">${formatClock(run.secondsLeft)}</div><div class="muted">${answeredSimCount(run)} de ${questions.length} respondidas</div>${progress('Progresso', answeredSimCount(run)/Math.max(questions.length,1), 'sem correção durante a prova')}<div class="sim-palette">${questions.map((q,index) => `<button class="sim-dot ${run.answers?.[q.id]?'answered':''} ${index===run.currentIndex?'active':''}" data-sim-go="${index}">${index+1}</button>`).join('')}</div><div class="sim-side-actions"><button class="icon-btn primary" id="toggleSimuladoTimer">${run.paused?'Iniciar prova':'Pausar prova'}</button><button class="icon-btn" id="clearSimAnswer" ${selected?'':'disabled'}>Limpar resposta</button><button class="icon-btn" id="finishSimulado">Finalizar prova</button><button class="icon-btn" id="cancelSimulado">Cancelar simulado</button></div></aside><section class="card question-card"><div class="question-body"><div class="sim-exam-top"><div><span class="badge today">${run.currentIndex + 1} de ${questions.length}</span><span class="badge wait">${escapeHtml(broadArea)}</span></div><div class="highlight-tools">${['yellow','green','blue','red'].map(color => `<button class="marker-btn marker-${color} ${ui.highlightColor===color?'active':''}" data-sim-marker="${color}" title="Marca-texto ${highlightLabel(color)}"></button>`).join('')}<button class="tiny-btn" id="clearSimHighlights">Limpar marcações</button></div><div class="sim-tools"><button type="button" title="Imprimir">⎙</button><button type="button" title="Informações">i</button><button type="button" title="Alerta">!</button><button type="button" id="simFontUp" title="Aumentar fonte">A+</button><button type="button" id="simFontDown" title="Diminuir fonte">A−</button><button type="button" title="Favoritar">♡</button><button type="button" title="Marcar">⚑</button></div></div><div class="sim-question-head"><div><h2>Questão ${run.currentIndex + 1}</h2><div class="muted">${escapeHtml(broadArea)}</div></div><div><button class="icon-btn" id="simPrev" ${run.currentIndex===0?'disabled':''}>‹</button> <button class="icon-btn primary" id="simNext" ${run.currentIndex>=questions.length-1?'disabled':''}>›</button></div></div><div class="question-stem sim-highlightable" style="font-size:${state.questionSettings.fontSize}px">${renderHighlightedText(question.stem, highlights)}</div>${renderQuestionImages(question)}<div class="answer-list">${options}</div>${renderSimConfidence(run, question)}<div class="question-nav"><span class="muted">${selected ? `Marcada: ${selected}` : 'Sem resposta marcada'}</span></div></div></section></div>`;
}
function renderSimConfidence(run, question) {
  const selected = run.confidence?.[question.id] || '';
  const options = [
    ['red','Chutei / não sei'],
    ['yellow','Dúvida'],
    ['green','Certeza']
  ];
  return `<div class="sim-confidence"><div class="muted" style="margin-bottom:10px">Nível de segurança</div><div class="sim-confidence-track">${options.map(([value,label]) => `<button type="button" class="${selected===value?'active':''}" data-sim-confidence="${value}"><span class="sim-confidence-dot ${value}"></span><span>${label}</span></button>`).join('')}</div></div>`;
}
function simuladoResult(run) {
  const questions = simRunQuestions(run);
  const rows = questions.map(question => {
    const selected = run.answers?.[question.id] || '';
    const correct = selected && selected === question.answer;
    const tag = questionTag(question);
    const area = simQuestionArea(question);
    const confidence = run.confidence?.[question.id] || '';
    const seconds = n(run.questionSeconds?.[question.id]);
    return { question, selected, correct, area, topic: tag.topic || 'Sem tema', subtopic: tag.subtopic || '', confidence, seconds, skipped: !selected, guessed: confidence === 'red', overconfidentWrong: !correct && confidence === 'green' };
  });
  const correct = rows.filter(row => row.correct).length;
  const byArea = ENAMED_AREAS.map(area => {
    const areaRows = rows.filter(row => row.area === area);
    const ok = areaRows.filter(row => row.correct).length;
    return { area, total: areaRows.length, correct: ok, rate: areaRows.length ? ok / areaRows.length : 0 };
  });
  const topicMap = new Map();
  rows.forEach(row => {
    const weight = (!row.correct ? 3 : 0) + (row.skipped ? 1 : 0) + (row.guessed ? 1 : 0) + (row.overconfidentWrong ? 2 : 0) + (row.confidence === 'yellow' ? .5 : 0);
    if(!weight) return;
    if(!topicMap.has(row.topic)) topicMap.set(row.topic, { topic: row.topic, area: row.area, wrong: 0, score: 0, flags: [] });
    const entry = topicMap.get(row.topic);
    entry.wrong += row.correct ? 0 : 1;
    entry.score += weight;
    if(row.skipped) entry.flags.push('em branco');
    if(row.guessed) entry.flags.push('chute');
    if(row.overconfidentWrong) entry.flags.push('erro na certeza');
  });
  const confidenceCounts = rows.reduce((acc,row) => {
    acc[row.confidence || 'blank'] = (acc[row.confidence || 'blank'] || 0) + 1;
    return acc;
  }, { red: 0, yellow: 0, green: 0, blank: 0 });
  const timedRows = rows.filter(row => row.seconds > 0);
  return { rows, total: rows.length, correct, rate: rows.length ? correct / rows.length : 0, byArea, weakTopics: [...topicMap.values()].sort((a,b)=>b.score-a.score || b.wrong-a.wrong).slice(0,8), confidenceCounts, skipped: rows.filter(row=>row.skipped), guessed: rows.filter(row=>row.guessed), overconfidentWrong: rows.filter(row=>row.overconfidentWrong), timedRows, averageSeconds: timedRows.length ? timedRows.reduce((sum,row)=>sum+row.seconds,0)/timedRows.length : 0 };
}
function renderSimuladoResult(run, questions) {
  const result = simuladoResult(run);
  const weakText = result.weakTopics.length ? result.weakTopics.map(item => `${item.topic} (${item.wrong})`).join(' · ') : 'Nenhum tema crítico.';
  return `<div class="card"><div class="section-title"><div><h2>Resultado: ${escapeHtml(run.name)}</h2><div class="muted">${result.correct} de ${result.total} · ${Math.round(n(run.elapsedSeconds)/60)} min usados</div></div><button class="icon-btn" data-open-sim="${run.id}">Revisar prova</button></div><div class="sim-result-grid"><div class="sim-area-card"><strong>Nota final</strong><div class="metric-value">${pct(result.rate)}</div><div class="muted">${result.correct} acertos</div></div><div class="sim-area-card"><strong>Erros</strong><div class="metric-value">${result.total-result.correct}</div><div class="muted">questões para revisar</div></div><div class="sim-area-card"><strong>Em branco</strong><div class="metric-value">${result.skipped.length}</div><div class="muted">questões puladas</div></div><div class="sim-area-card"><strong>Chutes</strong><div class="metric-value">${result.guessed.length}</div><div class="muted">confiança vermelha</div></div><div class="sim-area-card"><strong>Errou na certeza</strong><div class="metric-value">${result.overconfidentWrong.length}</div><div class="muted">revisar conceito-base</div></div></div><div class="sim-result-grid">${result.byArea.map(area => `<div class="sim-area-card"><strong>${escapeHtml(area.area)}</strong><div class="metric-value">${pct(area.rate)}</div><div class="muted">${area.correct}/${area.total || 0} acertos</div></div>`).join('')}<div class="sim-area-card"><strong>Tempo médio</strong><div class="metric-value">${formatVideoTime(result.averageSeconds)}</div><div class="muted">por questão visitada</div></div></div><div class="sim-review-item" style="margin-top:14px"><div class="section-title"><h2>Foco de estudo</h2><button class="icon-btn" id="sendSimWeakToFeynman">Enviar temas para Feynman</button></div><div class="muted">${escapeHtml(weakText)}</div><div class="topic-source">Prioridade combina erro, questão em branco, chute, dúvida e erro marcado com certeza.</div></div>${renderSimuladoReview(run, result.rows)}</div>`;
}
function renderSimuladoReview(run, rows) {
  return `<div class="sim-review-list">${rows.map((row,index) => {
    const tag = questionTag(row.question);
    const profile = row.skipped ? 'Em branco' : row.overconfidentWrong ? 'Errou na certeza' : row.guessed ? 'Chute' : row.correct ? 'Certa' : 'Errada';
    return `<div class="sim-review-item ${row.correct?'':'wrong'}"><div class="sim-question-head"><div><strong>Questão ${index+1} · ${escapeHtml(tag.area)}</strong><div class="muted">${escapeHtml(tag.topic)}${tag.subtopic?` · ${escapeHtml(tag.subtopic)}`:''}</div></div><span class="badge ${row.correct?'done':'no'}">${profile}</span></div><div class="muted">Sua resposta: ${escapeHtml(row.selected || 'em branco')} · Gabarito: ${escapeHtml(row.question.answer)} · Tempo: ${row.seconds ? formatVideoTime(row.seconds) : 'não registrado'}</div><div class="field-row" style="margin-top:8px"><input class="input" data-imported-tag="${row.question.id}" data-field="area" value="${escapeAttr(tag.area)}" placeholder="Área ENAMED"><input class="input" data-imported-tag="${row.question.id}" data-field="topic" value="${escapeAttr(tag.topic)}" placeholder="Tema principal"><input class="input" data-imported-tag="${row.question.id}" data-field="subtopic" value="${escapeAttr(tag.subtopic)}" placeholder="Subtema"></div>${row.question.comment?`<details class="material-original-toggle" style="margin-top:8px"><summary>Comentário da questão</summary><div class="markdown-preview">${renderMarkdown(row.question.comment)}</div></details>`:''}</div>`;
  }).join('')}</div>`;
}
function bindSimuladoInputs(activeRun) {
  const generate = document.getElementById('generateSimulado');
  if(generate) generate.onclick = () => generateSimuladoRun();
  document.querySelectorAll('[data-start-imported-sim]').forEach(button => button.onclick = e => startImportedSimulado(e.currentTarget.dataset.startImportedSim));
  document.querySelectorAll('[data-open-sim]').forEach(button => button.onclick = e => { ui.activeSimRunId = e.currentTarget.dataset.openSim; render(); });
  if(!activeRun) return;
  document.querySelectorAll('[data-sim-go]').forEach(button => button.onclick = e => { setSimQuestionIndex(activeRun, n(e.currentTarget.dataset.simGo)); saveStateOnly(); render(); });
  document.querySelectorAll('[data-sim-answer]').forEach(button => button.onclick = e => {
    if(ui.suppressAnswerClick || Date.now() < n(ui.highlightGestureUntil)) {
      ui.suppressAnswerClick = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if((window.getSelection()?.toString() || '').trim().length > 1) return;
    const question = activeSimQuestion(activeRun);
    if(!question) return;
    activeRun.answers[question.id] = e.currentTarget.dataset.simAnswer;
    if(n(activeRun.currentIndex) < activeRun.questionIds.length - 1) setSimQuestionIndex(activeRun, n(activeRun.currentIndex) + 1);
    saveStateOnly();
    render();
  });
  document.querySelectorAll('[data-sim-confidence]').forEach(button => button.onclick = e => {
    const question = activeSimQuestion(activeRun);
    if(!question) return;
    if(!activeRun.confidence || typeof activeRun.confidence !== 'object') activeRun.confidence = {};
    activeRun.confidence[question.id] = e.currentTarget.dataset.simConfidence;
    saveStateOnly();
    render();
  });
  document.querySelectorAll('[data-sim-eliminate]').forEach(button => button.onclick = e => {
    e.preventDefault();
    e.stopPropagation();
    const question = activeSimQuestion(activeRun);
    if(question) toggleSimEliminated(activeRun, question, e.currentTarget.dataset.simEliminate);
  });
  document.querySelectorAll('[data-sim-marker]').forEach(button => button.onclick = e => { ui.highlightColor = e.currentTarget.dataset.simMarker; render(); });
  const clearHighlights = document.getElementById('clearSimHighlights');
  if(clearHighlights) clearHighlights.onclick = () => {
    const question = activeSimQuestion(activeRun);
    if(!question) return;
    const previous = Array.isArray(activeRun.highlights?.[question.id]) ? activeRun.highlights[question.id] : [];
    if(previous.length) rememberHighlightState({ context:'simulado', runId:activeRun.id, questionId:question.id, highlights:previous });
    activeRun.highlights[question.id] = [];
    persist();
  };
  document.querySelectorAll('.sim-highlightable').forEach(el => {
    el.onselectstart = () => {
      ui.suppressAnswerClick = true;
      ui.highlightGestureUntil = Date.now() + 800;
    };
    el.onmouseup = e => {
      const hasSelection = (window.getSelection()?.toString() || '').trim().length > 1;
      if(!hasSelection) return;
      ui.suppressAnswerClick = true;
      ui.highlightGestureUntil = Date.now() + 800;
      e.preventDefault();
      e.stopPropagation();
      const question = activeSimQuestion(activeRun);
      if(question) setTimeout(() => toggleSelectedSimHighlight(activeRun, question), 0);
      setTimeout(() => { ui.suppressAnswerClick = false; }, 850);
    };
    el.onclick = e => {
      if(Date.now() < n(ui.highlightGestureUntil)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
  });
  const clear = document.getElementById('clearSimAnswer');
  if(clear) clear.onclick = () => {
    const question = activeSimQuestion(activeRun);
    if(question) delete activeRun.answers[question.id];
    saveStateOnly();
    render();
  };
  const prev = document.getElementById('simPrev');
  const next = document.getElementById('simNext');
  const fontUp = document.getElementById('simFontUp');
  const fontDown = document.getElementById('simFontDown');
  if(prev) prev.onclick = () => { setSimQuestionIndex(activeRun, n(activeRun.currentIndex)-1); saveStateOnly(); render(); };
  if(next) next.onclick = () => { setSimQuestionIndex(activeRun, n(activeRun.currentIndex)+1); saveStateOnly(); render(); };
  if(fontUp) fontUp.onclick = () => setQuestionFontSize(2);
  if(fontDown) fontDown.onclick = () => setQuestionFontSize(-2);
  const toggle = document.getElementById('toggleSimuladoTimer');
  if(toggle) toggle.onclick = () => activeRun.paused ? startSimuladoTimer(activeRun) : pauseSimuladoTimer(activeRun);
  const finish = document.getElementById('finishSimulado');
  if(finish) finish.onclick = () => {
    if(confirm('Finalizar este simulado e corrigir agora?')) finishSimuladoRun(activeRun);
  };
  const cancel = document.getElementById('cancelSimulado');
  if(cancel) cancel.onclick = () => {
    if(confirm('Cancelar este simulado? As respostas serão apagadas e ele não será corrigido.')) cancelSimuladoRun(activeRun);
  };
  const sendWeak = document.getElementById('sendSimWeakToFeynman');
  if(sendWeak) sendWeak.onclick = () => sendSimWeakTopicsToFeynman(activeRun);
  document.querySelectorAll('[data-imported-tag][data-field]').forEach(input => {
    input.oninput = e => updateImportedQuestionTag(e.currentTarget);
    input.onchange = e => { updateImportedQuestionTag(e.currentTarget); render(); };
  });
  if(activeRun && !activeRun.finishedAt && !activeRun.paused) startSimuladoTimer(activeRun, false);
}
function updateImportedQuestionTag(input) {
  const questionId = input.dataset.importedTag;
  const field = input.dataset.field;
  if(!state.importedQuestionTags[questionId]) state.importedQuestionTags[questionId] = {};
  state.importedQuestionTags[questionId][field] = input.value;
  saveStateOnly();
}
function activeSimQuestion(run) {
  const questionId = run.questionIds[Math.max(0, Math.min(n(run.currentIndex), run.questionIds.length - 1))];
  return run.sourceType === 'imported' ? importedQuestionById(questionId) : questionBank.find(question => question.id === questionId) || null;
}
function startImportedSimulado(simId) {
  const sim = importedSimulados.find(item => item.id === simId);
  if(!sim?.questions?.length) { alert('Não encontrei questões neste simulado importado.'); return; }
  const duration = Math.max(30, n(sim.durationMinutes) || 300);
  const run = {
    id: `simrun-imported-${Date.now()}`,
    name: sim.name,
    sourceType: 'imported',
    importedSimId: sim.id,
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    finishedAt: '',
    durationMinutes: duration,
    secondsLeft: duration * 60,
    elapsedSeconds: 0,
    currentIndex: 0,
    paused: false,
    questionIds: sim.questions.map(question => question.id),
    answers: {},
    eliminated: {},
    highlights: {},
    confidence: {},
    areaTargets: {}
  };
  state.simuladoRuns.unshift(run);
  ui.activeSimRunId = run.id;
  persist();
  startSimuladoTimer(run, false);
}
function generateSimuladoRun() {
  const targets = defaultSimuladoTargets();
  document.querySelectorAll('[data-sim-target]').forEach(input => { targets[input.dataset.simTarget] = Math.max(0, n(input.value)); });
  const questions = buildBalancedSimulado(targets);
  if(!questions.length) { alert('Ainda não há questões carregadas para gerar o simulado.'); return; }
  const duration = Math.max(30, n(document.getElementById('simDuration')?.value) || 300);
  const run = {
    id: `simrun-${Date.now()}`,
    name: document.getElementById('simRunName')?.value?.trim() || `Simulado ENAMED ${state.simuladoRuns.length + 1}`,
    sourceType: 'generated',
    importedSimId: '',
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    finishedAt: '',
    durationMinutes: duration,
    secondsLeft: duration * 60,
    elapsedSeconds: 0,
    currentIndex: 0,
    paused: false,
    questionIds: questions.map(question => question.id),
    answers: {},
    eliminated: {},
    highlights: {},
    confidence: {},
    areaTargets: targets
  };
  state.simuladoRuns.unshift(run);
  ui.activeSimRunId = run.id;
  persist();
  startSimuladoTimer(run, false);
}
function startSimuladoTimer(run, shouldRender=true) {
  if(run.finishedAt) return;
  if(simuladoTimer.interval && simuladoTimer.runId === run.id) return;
  if(simuladoTimer.interval) clearInterval(simuladoTimer.interval);
  run.paused = false;
  startAutoStudy('simulado', '');
  simuladoTimer.runId = run.id;
  simuladoTimer.interval = setInterval(() => tickSimuladoTimer(run.id), 1000);
  if(shouldRender) persist();
}
function pauseSimuladoTimer(run, shouldRender=true) {
  if(simuladoTimer.interval) clearInterval(simuladoTimer.interval);
  simuladoTimer.interval = null;
  simuladoTimer.runId = '';
  run.paused = true;
  stopAutoStudy('simulado');
  if(shouldRender) persist();
}
function tickSimuladoTimer(runId) {
  const run = state.simuladoRuns.find(item => item.id === runId);
  if(!run || run.finishedAt || run.paused) return;
  run.secondsLeft = Math.max(0, n(run.secondsLeft) - 1);
  run.elapsedSeconds = Math.max(0, n(run.durationMinutes) * 60 - n(run.secondsLeft));
  const clock = document.getElementById('simuladoClock');
  if(clock) clock.textContent = formatClock(run.secondsLeft);
  if(run.secondsLeft % 15 === 0) saveStateOnly();
  if(run.secondsLeft <= 0) finishSimuladoRun(run);
}
function finishSimuladoRun(run) {
  if(simuladoTimer.interval && simuladoTimer.runId === run.id) clearInterval(simuladoTimer.interval);
  simuladoTimer.interval = null;
  simuladoTimer.runId = '';
  stopAutoStudy('simulado');
  finishSimQuestionTiming(run);
  run.paused = true;
  run.finishedAt = run.finishedAt || new Date().toISOString();
  run.elapsedSeconds = Math.max(n(run.elapsedSeconds), n(run.durationMinutes) * 60 - n(run.secondsLeft));
  const result = simuladoResult(run);
  run.score = result.rate;
  run.correct = result.correct;
  run.total = result.total;
  upsertManualSimFromRun(run, result);
  persist();
}
function cancelSimuladoRun(run) {
  if(simuladoTimer.interval && simuladoTimer.runId === run.id) clearInterval(simuladoTimer.interval);
  simuladoTimer.interval = null;
  simuladoTimer.runId = '';
  stopAutoStudy('simulado');
  state.simuladoRuns = state.simuladoRuns.filter(item => item.id !== run.id);
  if(ui.activeSimRunId === run.id) ui.activeSimRunId = state.simuladoRuns[0]?.id || '';
  persist();
}
function upsertManualSimFromRun(run, result) {
  const existing = state.simulados.find(sim => sim.id === `auto-${run.id}`);
  const weak = result.weakTopics.map(item => item.topic).join('; ');
  const payload = {
    id: `auto-${run.id}`,
    name: run.name,
    date: localISODate(new Date(run.finishedAt || Date.now())),
    coverage: 'Simulado gerado pelo banco de questões',
    total: result.total,
    correct: result.correct,
    strong: result.byArea.filter(area => area.rate >= .7).map(area => area.area).join('; '),
    weak,
    notes: `Tempo: ${Math.round(n(run.elapsedSeconds)/60)} min`,
    missedTopics: result.weakTopics.map((item, idx) => ({ id:`auto-${run.id}-miss-${idx}`, topic:item.topic, scheduleId:findScheduleByTopic(item.topic)?.id || '', importance:item.wrong >= 3 ? 'Crítica' : item.wrong >= 2 ? 'Alta' : 'Média', note:`${item.wrong} ${item.wrong===1?'erro':'erros'} em ${item.area}` }))
  };
  if(existing) Object.assign(existing, payload);
  else state.simulados.unshift(payload);
}
function sendSimWeakTopicsToFeynman(run) {
  const result = simuladoResult(run);
  result.weakTopics.forEach(item => {
    if(state.feynman.some(f => normalizedTopic(f.topic) === normalizedTopic(item.topic))) return;
    const linked = findScheduleByTopic(item.topic);
    state.feynman.unshift({ id:`feyn-sim-${Date.now()}-${Math.random().toString(16).slice(2)}`, topic:item.topic, scheduleId:linked?.id || '', area:item.area, explain:'', gaps:`Errei ${item.wrong} questão(ões) no simulado.`, analogy:'', nextStep:'Revisar resumo, refazer questões e criar flashcard se necessário.', mastery:1, reviewDate:localISODate(new Date()), updatedAt:localISODate(new Date()) });
  });
  persist();
}
function toggleSimEliminated(run, question, letter) {
  if(!run.eliminated || typeof run.eliminated !== 'object') run.eliminated = {};
  const current = Array.isArray(run.eliminated[question.id]) ? [...run.eliminated[question.id]] : [];
  run.eliminated[question.id] = current.includes(letter) ? current.filter(item => item !== letter) : [...current, letter];
  persist();
}
function toggleSelectedSimHighlight(run, question) {
  const selection = window.getSelection();
  const selected = selection ? selection.toString().replace(/\s+/g, ' ').trim() : '';
  if(!selected || selected.length < 2) return;
  const anchor = selection.anchorNode?.parentElement;
  if(!anchor?.closest('.sim-run-layout')) return;
  if(!run.highlights || typeof run.highlights !== 'object') run.highlights = {};
  const highlights = Array.isArray(run.highlights[question.id]) ? [...run.highlights[question.id]] : [];
  const existing = highlights.findIndex(item => item.text === selected);
  rememberHighlightState({ context:'simulado', runId:run.id, questionId:question.id, highlights });
  run.highlights[question.id] = existing >= 0
    ? highlights.filter((_, index) => index !== existing)
    : [...highlights, { text: selected, color: ui.highlightColor || 'yellow' }];
  selection.removeAllRanges();
  persist();
}
function simScore(s) { return n(s.total)>0 ? n(s.correct)/n(s.total) : 0; }
function renderSimSummary() { const done=state.simulados.filter(s=>n(s.correct)>0); const best=done.sort((a,b)=>simScore(b)-simScore(a))[0]; const avg=done.reduce((sum,s)=>sum+simScore(s),0)/Math.max(done.length,1); return `${progress('Média atual', avg, `${done.length} simulados preenchidos`)}${best ? `<div class="item"><div class="date-chip">${Math.round(simScore(best)*100)}%</div><div><strong>${escapeHtml(best.name)}</strong><div class="muted">${fmtDate(best.date)} · meta mínima 70%</div></div><div>${simScore(best)>=.7?'<span class="badge done">Meta</span>':'<span class="badge no">Abaixo</span>'}</div></div>` : '<div class="empty">Preencha os resultados para ver evolução.</div>'}`; }
function renderNextSim() { const next=state.simulados.filter(s=>s.date>=ui.refDate && n(s.correct)===0).sort((a,b)=>a.date.localeCompare(b.date))[0]; if(!next) return '<div class="empty">Nenhum simulado futuro aberto.</div>'; return `<div class="item"><div class="date-chip">${fmtDate(next.date).slice(0,5)}</div><div><strong>${escapeHtml(next.name)}</strong><div class="muted">${escapeHtml(next.coverage)}</div></div><span class="badge today">Próximo</span></div>`; }
function renderSimTable() { return `<div class="table-wrap"><table><thead><tr><th>Simulado</th><th>Data</th><th>Cobertura</th><th class="num">Total</th><th class="num">Certas</th><th class="num">%</th><th>Fortes</th><th>Fracas</th><th>Notas</th></tr></thead><tbody>${state.simulados.map(s=>`<tr><td><strong>${escapeHtml(s.name)}</strong></td><td>${fmtDate(s.date)}</td><td>${escapeHtml(s.coverage)}</td><td class="num"><input class="mini-input" data-sim="${s.id}" data-field="total" type="number" value="${n(s.total)}"></td><td class="num"><input class="mini-input" data-sim="${s.id}" data-field="correct" type="number" value="${n(s.correct)}"></td><td class="num">${pct(simScore(s))}</td><td><input class="notes-input" data-sim="${s.id}" data-field="strong" value="${escapeAttr(s.strong)}"></td><td><input class="notes-input" data-sim="${s.id}" data-field="weak" value="${escapeAttr(s.weak)}"></td><td><input class="notes-input" data-sim="${s.id}" data-field="notes" value="${escapeAttr(s.notes)}"></td></tr>`).join('')}</tbody></table></div>`; }
function renderMissedTopics() {
  const options = scheduleTopicOptions();
  const datalist = `<datalist id="scheduleTopicList">${options.map(x => `<option value="${escapeAttr(x.topic)}">${escapeHtml(`Bloco ${x.block} · ${x.area} · ${x.priority}`)}</option>`).join('')}</datalist>`;
  const cards = state.simulados.map(sim => `<div class="sim-review-card"><div class="sim-review-head"><div><strong>${escapeHtml(sim.name)}</strong><div class="muted">${fmtDate(sim.date)} · ${escapeHtml(sim.coverage)}</div></div><button class="icon-btn" data-add-missed="${sim.id}">+ Tema</button></div>${renderMissedRows(sim)}</div>`).join('');
  return `${datalist}<div class="sim-review-grid">${cards}</div>`;
}
function renderMissedRows(sim) {
  if(!sim.missedTopics.length) return '<div class="empty">Nenhum tema marcado ainda.</div>';
  return sim.missedTopics.map(topic => {
    const linked = topic.scheduleId ? state.schedule.find(x => x.id === topic.scheduleId) : findScheduleByTopic(topic.topic);
    const source = linked ? `Cronograma: Bloco ${linked.block} · ${linked.area} · Prioridade ${linked.priority}` : 'Tema novo fora do cronograma';
    return `<div class="missed-row"><div><input class="input" list="scheduleTopicList" data-missed-sim="${sim.id}" data-missed-id="${topic.id}" data-field="topic" value="${escapeAttr(topic.topic)}" placeholder="Pesquise uma aula ou digite novo tema"><div class="topic-source">${escapeHtml(source)}</div></div><div><select class="select" data-missed-sim="${sim.id}" data-missed-id="${topic.id}" data-field="importance">${['Baixa','Média','Alta','Crítica'].map(v => `<option value="${v}" ${topic.importance===v?'selected':''}>${v}</option>`).join('')}</select></div><input class="input" data-missed-sim="${sim.id}" data-missed-id="${topic.id}" data-field="note" value="${escapeAttr(topic.note)}" placeholder="Observação">${importanceBadge(topic.importance)}<button class="tiny-btn" data-remove-missed="${sim.id}" data-missed-id="${topic.id}" title="Remover">×</button></div>`;
  }).join('');
}
function bindSimInputs() {
  document.querySelectorAll('[data-sim]').forEach(el => el.onchange = e => { const sim=state.simulados.find(x=>x.id===e.target.dataset.sim); const f=e.target.dataset.field; sim[f]=['total','correct'].includes(f)?n(e.target.value):e.target.value; persist(); });
  document.querySelectorAll('[data-add-missed]').forEach(btn => btn.onclick = e => { const sim=state.simulados.find(x=>x.id===e.currentTarget.dataset.addMissed); if(!sim) return; sim.missedTopics.push({ id: `${sim.id}-miss-${Date.now()}`, topic: '', scheduleId: '', importance: 'Média', note: '' }); persist(); });
  document.querySelectorAll('[data-remove-missed]').forEach(btn => btn.onclick = e => { const sim=state.simulados.find(x=>x.id===e.currentTarget.dataset.removeMissed); if(!sim) return; sim.missedTopics = sim.missedTopics.filter(x => x.id !== e.currentTarget.dataset.missedId); persist(); });
  document.querySelectorAll('[data-missed-sim][data-missed-id][data-field]').forEach(el => {
    const update = (target, shouldRender) => {
      const sim=state.simulados.find(x=>x.id===target.dataset.missedSim);
      const topic=sim?.missedTopics.find(x=>x.id===target.dataset.missedId);
      if(!topic) return;
      const f=target.dataset.field;
      topic[f]=target.value;
      if(f==='topic') { const linked=findScheduleByTopic(target.value); topic.scheduleId = linked ? linked.id : ''; }
      shouldRender ? persist() : saveStateOnly();
    };
    if(el.dataset.field === 'topic') {
      el.oninput = e => {
        update(e.target, false);
        const query = normalizedTopic(e.target.value);
        const words = query.split(' ').filter(word => word.length > 2);
        const matches = scheduleTopicOptions().filter(option => {
          const candidate = normalizedTopic(option.topic);
          return !query || candidate.includes(query) || words.some(word => candidate.includes(word));
        }).slice(0, 20);
        const list = document.getElementById('scheduleTopicList');
        if(list) list.innerHTML = matches.map(x => `<option value="${escapeAttr(x.topic)}">${escapeHtml(`Bloco ${x.block} · ${x.area} · ${x.priority}`)}</option>`).join('');
      };
      el.onblur = e => update(e.target, true);
      el.onchange = e => update(e.target, true);
    } else {
      el.onchange = e => update(e.target, true);
    }
  });
}
function answerDate(value) {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? '' : localISODate(date);
}
function analysisConfidence(result={}) {
  return Math.max(0, Math.min(100, n(result.certainty) || n(result.confidence) || ({red:20,yellow:55,green:90}[result.confidenceLevel] || 0)));
}
function dailyQuestionRows(date) {
  const bankRows = questionBank.flatMap(question => {
    const result = questionResult(question);
    if(!result || answerDate(result.answeredAt) !== date) return [];
    const tag = questionTag(question);
    const linked = result.scheduleId ? state.schedule.find(item => item.id === result.scheduleId) : scheduleForQuestion(question);
    return [{
      key:`bank:${question.id}`, question, result, questionId:question.id, runId:'', source:question.sourceLabel || questionCollectionLabel(question.collectionBlock),
      area:simQuestionArea(question), topic:tag.topic || linked?.topic || 'Tema não classificado', correct:Boolean(result.correct), skipped:false,
      seconds:n(result.secondsSpent), confidence:analysisConfidence(result), confidenceLevel:result.confidenceLevel || '', guessed:result.correctMode === 'Chute' || result.confidenceLevel === 'red',
      missReason:result.missReason || '', timedOut:Boolean(result.timedOut), answeredAt:result.answeredAt
    }];
  });
  const simRows = (state.simuladoRuns || []).flatMap(run => {
    if(!run.finishedAt || answerDate(run.finishedAt) !== date) return [];
    return simRunQuestions(run).map((question,index) => {
      const selected = run.answers?.[question.id] || '';
      const level = run.confidence?.[question.id] || '';
      const tag = questionTag(question);
      return {
        key:`sim:${run.id}:${question.id}`, question, result:null, questionId:question.id, runId:run.id, source:run.name || 'Simulado',
        area:simQuestionArea(question), topic:tag.topic || 'Tema não classificado', correct:Boolean(selected && selected === question.answer), skipped:!selected,
        seconds:n(run.questionSeconds?.[question.id]), confidence:({red:20,yellow:55,green:90}[level] || 0), confidenceLevel:level,
        guessed:level === 'red', missReason:'', timedOut:false, answeredAt:run.finishedAt, position:index+1
      };
    });
  });
  return [...bankRows,...simRows].sort((a,b)=>String(a.answeredAt).localeCompare(String(b.answeredAt)));
}
function aggregateAnalysisRows(rows,key) {
  const map = new Map();
  rows.forEach(row => {
    const name = row[key] || 'Não classificado';
    if(!map.has(name)) map.set(name,{name,total:0,correct:0,wrong:0,seconds:0,timed:0});
    const item=map.get(name); item.total+=1; item.correct+=row.correct?1:0; item.wrong+=row.correct?0:1;
    if(row.seconds>0) { item.seconds+=row.seconds; item.timed+=1; }
  });
  return [...map.values()].map(item=>({...item,rate:item.correct/Math.max(1,item.total),averageSeconds:item.timed?item.seconds/item.timed:0}));
}
function analysisRisk(row,slowLimit) {
  if(row.skipped) return {score:6,label:'Em branco',className:'critical',action:'Revisar o conceito antes de refazer'};
  if(!row.correct && row.confidence>=80) return {score:6,label:'Erro com alta confiança',className:'critical',action:'Corrigir o modelo mental'};
  if(row.timedOut) return {score:5,label:'Tempo esgotado',className:'critical',action:'Revisar conteúdo e estratégia'};
  if(!row.correct && row.missReason==='Não saber') return {score:5,label:'Não sabia',className:'critical',action:'Estudar a base e criar flashcard'};
  if(!row.correct && (row.missReason==='Dúvida / já vi' || row.confidenceLevel==='yellow')) return {score:4,label:'Dúvida / já vi',className:'warning',action:'Revisão curta e nova questão'};
  if(!row.correct && row.missReason==='Desatenção') return {score:3,label:'Desatenção',className:'warning',action:'Ler comando e alternativas com método'};
  if(!row.correct) return {score:4,label:'Erro',className:'critical',action:'Revisar comentário e refazer'};
  if(row.guessed) return {score:3,label:'Acerto por chute',className:'warning',action:'Consolidar antes de avançar'};
  if(row.seconds>0 && row.seconds>slowLimit) return {score:2,label:'Acerto lento',className:'attention',action:'Treinar reconhecimento do padrão'};
  return {score:0,label:'Consolidado',className:'success',action:'Manter em revisão espaçada'};
}
function renderAnalysisBars(groups,emptyText) {
  if(!groups.length) return `<div class="empty">${escapeHtml(emptyText)}</div>`;
  return `<div class="analysis-bars">${groups.map(group=>`<div class="analysis-bar"><div><strong>${escapeHtml(group.name)}</strong><span>${group.correct}/${group.total} · ${pct(group.rate)}</span></div><div class="progress"><span style="width:${pct(group.rate)}"></span></div></div>`).join('')}</div>`;
}
function openQuestionFromAnalysis(questionId) {
  const question=questionBank.find(item=>item.id===questionId);
  if(!question) return;
  ui.tab='questoes'; ui.qFocusScheduleId=''; ui.qBlock=question.collectionBlock!==undefined?String(question.collectionBlock):'Todos'; ui.qSource='Todas'; ui.qTopic=question.topic || 'Todos'; ui.qStatus='Todas'; ui.justAnsweredId='';
  const list=filteredQuestions(); ui.qIndex=Math.max(0,list.findIndex(item=>item.id===questionId)); render();
}
function renderAnalise() {
  const date=ui.analysisDate || localISODate(new Date());
  const rows=dailyQuestionRows(date);
  const timed=rows.filter(row=>row.seconds>0);
  const sortedTimes=timed.map(row=>row.seconds).sort((a,b)=>a-b);
  const median=sortedTimes.length ? sortedTimes[Math.floor(sortedTimes.length/2)] : 0;
  const average=timed.length ? timed.reduce((sum,row)=>sum+row.seconds,0)/timed.length : 0;
  const slowLimit=Math.max(n(state.questionSettings.secondsPerQuestion)||90,median?median*1.5:0);
  const detailed=rows.map(row=>({...row,risk:analysisRisk(row,slowLimit)})).sort((a,b)=>b.risk.score-a.risk.score || b.seconds-a.seconds);
  const correct=rows.filter(row=>row.correct).length;
  const highConfidence=rows.filter(row=>row.confidence>=80);
  const highConfidenceCorrect=highConfidence.filter(row=>row.correct).length;
  const topicGroups=aggregateAnalysisRows(rows,'topic');
  const eligible=topicGroups.filter(item=>item.total>=2).length ? topicGroups.filter(item=>item.total>=2) : topicGroups;
  const strengths=[...eligible].filter(item=>item.correct>0).sort((a,b)=>b.rate-a.rate || b.total-a.total).slice(0,4);
  const weaknesses=[...eligible].filter(item=>item.wrong>0).sort((a,b)=>a.rate-b.rate || b.wrong-a.wrong || b.total-a.total).slice(0,4);
  const strongest=strengths[0]; const weakest=weaknesses[0];
  const executive=rows.length
    ? `${strongest?`Seu ponto mais forte foi ${strongest.name} (${pct(strongest.rate)}).`:''} ${weakest?`Priorize ${weakest.name}: ${weakest.wrong} ${weakest.wrong===1?'erro':'erros'} em ${weakest.total} ${weakest.total===1?'questão':'questões'}.`:'Nenhum ponto fraco relevante apareceu nesta amostra.'}`
    : 'Faça questões no banco ou finalize um simulado para gerar a leitura do dia.';
  const content=rows.length ? `<div class="analysis-kpis">
      <div class="analysis-kpi"><span>Questões analisadas</span><strong>${rows.length}</strong><small>${correct} acertos · ${rows.length-correct} erros</small></div>
      <div class="analysis-kpi primary"><span>Precisão</span><strong>${pct(correct/rows.length)}</strong><small>${rows.filter(row=>row.skipped).length} em branco</small></div>
      <div class="analysis-kpi"><span>Tempo médio</span><strong>${timed.length?formatVideoTime(average):'—'}</strong><small>${timed.length}/${rows.length} com tempo registrado</small></div>
      <div class="analysis-kpi"><span>Calibração</span><strong>${highConfidence.length?pct(highConfidenceCorrect/highConfidence.length):'—'}</strong><small>acerto quando confiança ≥ 80%</small></div>
      <div class="analysis-kpi"><span>Tempo total</span><strong>${timed.length?formatVideoTime(timed.reduce((sum,row)=>sum+row.seconds,0)):'—'}</strong><small>mediana ${median?formatVideoTime(median):'não registrada'}</small></div>
    </div><div class="grid two analysis-focus-grid"><div class="card analysis-focus strength"><div class="section-title"><div><span class="eyebrow">Ponto mais forte</span><h2>${escapeHtml(strongest?.name || 'Amostra insuficiente')}</h2></div><span class="badge done">${strongest?pct(strongest.rate):'—'}</span></div>${renderAnalysisBars(strengths,'Ainda não há um padrão forte.')}</div><div class="card analysis-focus weakness"><div class="section-title"><div><span class="eyebrow">Pontos mais fracos</span><h2>${escapeHtml(weakest?.name || 'Nenhum erro relevante')}</h2></div><span class="badge ${weakest?'no':'done'}">${weakest?`${weakest.wrong} ${weakest.wrong===1?'erro':'erros'}`:'estável'}</span></div>${renderAnalysisBars(weaknesses,'Nenhum tema fraco nesta amostra.')}</div></div>
    <div class="card"><div class="section-title"><div><h2>Fila inteligente de revisão</h2><div class="muted">Ordenada pelo risco de repetir o erro, não pela ordem das questões.</div></div><span class="badge today">${detailed.filter(row=>row.risk.score>0).length} prioridades</span></div><div class="table-wrap"><table class="analysis-table"><thead><tr><th>Questão</th><th>Área e tema</th><th>Leitura</th><th class="num">Confiança</th><th class="num">Tempo</th><th>Próxima ação</th><th></th></tr></thead><tbody>${detailed.map((row,index)=>`<tr><td><strong>${row.runId?`Simulado · ${row.position}`:`${escapeHtml(questionCollectionLabel(row.question.collectionBlock))} · ${row.question.number}`}</strong><div class="muted">${escapeHtml(row.source)}</div></td><td><strong>${escapeHtml(row.area)}</strong><div class="muted">${escapeHtml(row.topic)}</div></td><td><span class="analysis-signal ${row.risk.className}">${escapeHtml(row.risk.label)}</span></td><td class="num">${row.confidence?`${Math.round(row.confidence)}%`:'—'}</td><td class="num">${row.seconds?formatVideoTime(row.seconds):'—'}</td><td>${escapeHtml(row.risk.action)}</td><td>${row.runId?`<button class="tiny-btn" data-analysis-open-sim="${escapeAttr(row.runId)}">Revisar</button>`:`<button class="tiny-btn" data-analysis-open-question="${escapeAttr(row.questionId)}">Abrir</button>`}</td></tr>`).join('')}</tbody></table></div></div>` : `<div class="card empty analysis-empty"><strong>Nenhuma questão registrada em ${fmtDate(date)}</strong><span>Abra o Banco de Questões ou finalize um simulado. A análise aparecerá automaticamente.</span><button class="icon-btn primary" data-analysis-open-bank>Abrir questões</button></div>`;
  document.getElementById('analise').innerHTML=`<div class="card analysis-head"><div><span class="eyebrow">Inteligência de desempenho</span><h1>Análise diária de questões</h1><p>${escapeHtml(executive)}</p></div><div class="analysis-date-controls"><button class="icon-btn" data-analysis-day="-1" title="Dia anterior">‹</button><input class="input" id="analysisDate" inputmode="numeric" placeholder="dd/mm/aaaa"><button class="icon-btn" data-analysis-day="1" title="Dia seguinte">›</button><button class="tiny-btn" id="analysisToday">Hoje</button></div></div>${content}`;
  bindPlannerDateInput('analysisDate',date,value=>{ui.analysisDate=value;renderAnalise();});
  document.querySelectorAll('[data-analysis-day]').forEach(button=>button.onclick=()=>{ui.analysisDate=addDays(date,n(button.dataset.analysisDay));renderAnalise();});
  document.getElementById('analysisToday')?.addEventListener('click',()=>{ui.analysisDate=localISODate(new Date());renderAnalise();});
  document.querySelector('[data-analysis-open-bank]')?.addEventListener('click',()=>{ui.tab='questoes';ui.qStatus='Não respondidas';render();});
  document.querySelectorAll('[data-analysis-open-question]').forEach(button=>button.onclick=()=>openQuestionFromAnalysis(button.dataset.analysisOpenQuestion));
  document.querySelectorAll('[data-analysis-open-sim]').forEach(button=>button.onclick=()=>{ui.activeSimRunId=button.dataset.analysisOpenSim;ui.tab='simulados';render();});
}
function renderAreas() { const areas=areaStats(); document.getElementById('areas').innerHTML = `<div class="grid three">${areas.slice(0,3).map(a=>metric(a.area,pct(a.progress),`${a.done} de ${a.total} concluídas`)).join('')}</div><div class="card"><div class="section-title"><h2>Desempenho por área</h2></div>${areas.map(areaLine).join('')}</div><div class="card"><div class="section-title"><h2>Pendências por área</h2></div><div class="table-wrap"><table><thead><tr><th>Área</th><th class="num">Aulas pendentes</th><th class="num">Questões</th><th class="num">Flashcards</th><th class="num">Horas</th></tr></thead><tbody>${areas.map(a=>`<tr><td><strong>${escapeHtml(a.area)}</strong></td><td class="num">${a.total-a.done}</td><td class="num">${Math.round(a.debtQ)}</td><td class="num">${Math.round(a.debtFC)}</td><td class="num">${a.hours.toFixed(1)}</td></tr>`).join('')}</tbody></table></div></div>`; }
function historyRows() {
  ensureDayLogs();
  const hiddenDates = new Set(state.hiddenHistoryDates || []);
  return state.dayLogs.map(log => {
    const dayItems = state.schedule.filter(x => x.date === log.date);
    const doneItems = dayItems.filter(x => statusOf(x) === 'Concluído');
    const activity = n(log.videos) + n(log.flashcards) + n(log.questions) + n(log.lessonMinutes) + n(log.flashcardMinutes) + n(log.questionMinutes) + n(log.materialMinutes) + n(log.simuladoMinutes) + doneItems.length;
    return { log, dayItems, doneItems, activity };
  }).filter(x => !hiddenDates.has(x.log.date) && (x.activity > 0 || x.dayItems.some(item => completedQuestions(item)>0 || completedFlashcards(item)>0 || n(item.hours)>0))).sort((a,b)=>b.log.date.localeCompare(a.log.date));
}
function renderHistorico() {
  const rows = historyRows();
  document.getElementById('historico').innerHTML = `<div class="grid cards">${metric('Dias com registro', rows.length, 'dias com alguma atividade')}${metric('Aulas concluídas', rows.reduce((s,x)=>s+x.doneItems.length,0), 'no histórico por data')}${metric('Questões', Math.round(rows.reduce((s,x)=>s+n(x.log.questions),0)), 'registradas no dia')}${metric('Flashcards', Math.round(rows.reduce((s,x)=>s+n(x.log.flashcards),0)), 'registrados no dia')}${metric('Tempo estudado', `${Math.round(rows.reduce((s,x)=>s+n(x.log.lessonMinutes)+n(x.log.flashcardMinutes)+n(x.log.questionMinutes)+n(x.log.materialMinutes)+n(x.log.simuladoMinutes),0))} min`, 'todas as atividades acumuladas')}</div><div class="card"><div class="section-title"><h2>Atividades realizadas</h2><span class="muted">${rows.length} dias</span></div>${renderHistoryTable(rows)}</div>`;
  document.querySelectorAll('[data-remove-history]').forEach(button => button.onclick = event => removeHistoryRecord(event.currentTarget.dataset.removeHistory));
}
function removeHistoryRecord(date) {
  const log = state.dayLogs.find(item => item.date === date);
  if(!log) return;
  const confirmed = confirm(`Excluir o registro de ${fmtDate(date)} do Histórico?\n\nOs totais e tempos desse dia serão removidos. Respostas individuais, flashcards criados e vídeos marcados como assistidos continuarão salvos.`);
  if(!confirmed) return;
  state.dayLogs = state.dayLogs.filter(item => item.date !== date);
  state.dayLogs.push(defaultDayLog(date));
  state.hiddenHistoryDates = [...new Set([...(state.hiddenHistoryDates || []), date])];
  persist();
}
function renderHistoryTable(rows) {
  if(!rows.length) return '<div class="empty">Ainda não há atividade registrada.</div>';
  return `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Humor</th><th>Aulas e temas</th><th class="num">Vídeos</th><th class="num">Flashcards</th><th class="num">Questões</th><th class="num">Tempo</th><th>Anotações</th><th><span class="sr-only">Excluir</span></th></tr></thead><tbody>${rows.map(({log, dayItems, doneItems}) => {
    const topics = doneItems.length ? doneItems : dayItems.filter(x => completedQuestions(x)>0 || completedFlashcards(x)>0 || n(x.hours)>0).slice(0,4);
    const topicText = topics.length ? topics.map(x=>`Bloco ${x.block}: ${escapeHtml(x.topic)}`).join('<br>') : escapeHtml(log.videoNames || 'Registro manual');
    const pom = n(log.lessonMinutes)+n(log.flashcardMinutes)+n(log.questionMinutes)+n(log.materialMinutes)+n(log.simuladoMinutes);
    return `<tr><td>${fmtDate(log.date)}</td><td>${moodLabel(log.mood)}</td><td>${topicText}</td><td class="num">${n(log.videos)}</td><td class="num">${n(log.flashcards)}</td><td class="num">${n(log.questions)}<div class="muted">${n(log.correct)} acertos · ${n(log.wrong)} erros</div></td><td class="num">${Math.round(pom)} min</td><td>${escapeHtml(log.notes)}</td><td class="history-remove-cell"><button class="history-remove" data-remove-history="${escapeAttr(log.date)}" title="Excluir registro de ${escapeAttr(fmtDate(log.date))}" aria-label="Excluir registro de ${escapeAttr(fmtDate(log.date))}">×</button></td></tr>`;
  }).join('')}</tbody></table></div>`;
}
function renderFeynman() {
  ensureFeynman();
  const review = [...state.feynman].sort((a,b)=>n(a.mastery)-n(b.mastery) || String(a.reviewDate).localeCompare(String(b.reviewDate))).slice(0,6);
  document.getElementById('feynman').innerHTML = `<datalist id="feynmanTopicList">${scheduleTopicOptions().map(x => `<option value="${escapeAttr(x.topic)}">${escapeHtml(`Bloco ${x.block} · ${x.area} · ${x.priority}`)}</option>`).join('')}</datalist><div class="grid two"><div class="card"><div class="section-title"><h2>Revisar primeiro</h2><button class="icon-btn primary" id="addFeynman">+ Tema</button></div>${renderFeynmanReview(review)}</div><div class="card"><div class="section-title"><h2>Como usar</h2></div><div class="audit"><div class="audit-row"><div class="audit-icon">1</div><div><strong>Explique simples</strong><div class="muted">Como se fosse para alguém sem base.</div></div></div><div class="audit-row"><div class="audit-icon">2</div><div><strong>Ache lacunas</strong><div class="muted">O que travou, confundiu ou ficou decorado?</div></div></div><div class="audit-row"><div class="audit-icon">3</div><div><strong>Volte e revise</strong><div class="muted">Dê nota de domínio e marque o próximo passo.</div></div></div></div></div></div><div class="card"><div class="section-title"><h2>Cards Feynman</h2><span class="muted">${state.feynman.length} temas</span></div>${renderFeynmanCards()}</div>`;
  bindFeynmanInputs();
}
function renderFeynmanReview(items) {
  if(!items.length) return '<div class="empty">Adicione um tema para começar.</div>';
  return `<div class="list">${items.map(item => `<div class="item"><div class="date-chip">${n(item.mastery) || '-'}/5</div><div><strong>${escapeHtml(item.topic || 'Tema sem nome')}</strong><div class="muted">${escapeHtml(item.nextStep || 'Definir próximo passo')} · revisar em ${fmtDate(item.reviewDate)}</div></div>${importanceBadge(feynmanPriority(item))}</div>`).join('')}</div>`;
}
function renderFeynmanCards() {
  if(!state.feynman.length) return '<div class="empty">Nenhum card Feynman ainda. Clique em + Tema.</div>';
  return `<div class="feynman-grid">${state.feynman.map(item => {
    const linked = item.scheduleId ? state.schedule.find(x => x.id === item.scheduleId) : findScheduleByTopic(item.topic);
    const source = linked ? `Cronograma: Bloco ${linked.block} · ${linked.area} · Prioridade ${linked.priority}` : 'Tema livre';
    return `<div class="feynman-card"><div class="sim-review-head"><div><strong>${escapeHtml(item.topic || 'Novo tema')}</strong><div class="topic-source">${escapeHtml(source)}</div></div><button class="tiny-btn" data-remove-feynman="${item.id}">×</button></div><div class="feynman-fields"><input class="input" list="feynmanTopicList" data-feynman="${item.id}" data-field="topic" value="${escapeAttr(item.topic)}" placeholder="Tema ou aula"><input class="input" type="number" min="0" max="5" step="1" data-feynman="${item.id}" data-field="mastery" value="${n(item.mastery)}" title="Domínio 0 a 5"><input class="input" type="date" data-feynman="${item.id}" data-field="reviewDate" value="${escapeAttr(item.reviewDate)}"></div><div class="feynman-texts"><textarea class="textarea" data-feynman="${item.id}" data-field="explain" placeholder="Explique com palavras simples">${escapeHtml(item.explain)}</textarea><textarea class="textarea" data-feynman="${item.id}" data-field="gaps" placeholder="Onde travei? Quais lacunas?">${escapeHtml(item.gaps)}</textarea><textarea class="textarea" data-feynman="${item.id}" data-field="analogy" placeholder="Analogia ou exemplo clínico">${escapeHtml(item.analogy)}</textarea><textarea class="textarea" data-feynman="${item.id}" data-field="nextStep" placeholder="Próximo passo de revisão">${escapeHtml(item.nextStep)}</textarea></div><div class="review-strip">${importanceBadge(feynmanPriority(item))}<span class="badge today">Atualizado: ${fmtDate(item.updatedAt)}</span></div></div>`;
  }).join('')}</div>`;
}

const PRESCRIPTION_THEMES = ['Pneumonia adquirida na comunidade','Crise asmática','Pielonefrite','Hipertensão arterial','Síndrome coronariana aguda','Sepse','Dor abdominal','Paciente pós-operatório','Prescrição de internação'];
const PRESCRIPTION_EXAMS = ['Hemograma','Ureia','Creatinina','Sódio','Potássio','Magnésio','Cálcio','Glicemia','PCR','TGO','TGP','Bilirrubinas','Coagulograma','Gasometria arterial','Lactato','Troponina','Urina tipo I','Urocultura','Hemoculturas','Radiografia de tórax','Ultrassonografia','Tomografia','Ressonância magnética','Ecocardiograma','Doppler','Eletrocardiograma'];
const PRESCRIPTION_MEDICATIONS = ['Ceftriaxona','Azitromicina','Amoxicilina','Dipirona','Paracetamol','Salbutamol','Prednisona','Enoxaparina','Omeprazol','Ondansetrona','Insulina regular','Soro fisiológico 0,9%'];
function prescriptionLab() { ensureQuestionProgress(); return state.prescriptionLab; }
function prescriptionCase() { return prescriptionLab().cases.find(item => item.id === ui.prescriptionCaseId); }
function prescriptionPatient(population='adulto', sex='qualquer') {
  const male=['João Almeida','Carlos Ribeiro','Miguel Santos'];
  const female=['Maria Oliveira','Ana Martins','Helena Costa'];
  const selectedSex=sex==='qualquer' ? (Math.random()>.5?'Masculino':'Feminino') : sex;
  const names=selectedSex==='Masculino'?male:female;
  const age=population==='pediatrico'?Math.floor(Math.random()*14)+2:population==='idoso'?Math.floor(Math.random()*24)+65:Math.floor(Math.random()*43)+18;
  const weight=population==='pediatrico'?Math.round((age*2+8+Math.random()*5)*10)/10:Math.floor(Math.random()*45)+50;
  const allergy=['Nenhuma conhecida','Penicilina','Dipirona','AAS'][Math.floor(Math.random()*4)];
  const renal=['Sem alteração conhecida','DRC estágio 3','Creatinina 1,8 mg/dL'][Math.floor(Math.random()*3)];
  return {name:names[Math.floor(Math.random()*names.length)],sex:selectedSex,age,weight,height:'',allergies:allergy,pregnancy:selectedSex==='Feminino'?'Não informado':'Não aplicável',comorbidities:age>=65?'Hipertensão arterial':'Nenhuma informada',renal,liver:'Sem alteração conhecida',vitals:'',currentMedications:'',availableExams:'',notes:''};
}
function newPrescriptionCase(data={}) {
  const now=new Date().toISOString();
  return {id:`rx-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,createdAt:now,updatedAt:now,status:'incomplete',mode:data.mode||'free',theme:data.theme||'',initialProblem:data.initialProblem||'',diagnosis:data.diagnosis||'',setting:data.setting||'Ambulatório',patient:data.patient||prescriptionPatient(),reasoning:{problems:data.initialProblem||'',hypotheses:data.diagnosis||'',objectives:'',justification:''},items:[],drawing:{strokes:[]},review:null};
}
function prescriptionTypeLabel(type) { return ({medication:'Medicamento',exam:'Exame',procedure:'Cuidado ou procedimento',monitoring:'Monitorização',orientation:'Orientação',diet:'Dieta',note:'Anotação livre'})[type]||'Item'; }
function prescriptionSafetyBanner() { return `<div class="rx-safety"><strong>PACIENTE SIMULADO</strong><span>Ambiente educacional. Não utilizar para assistência, prescrição real ou tomada de decisão clínica. Não insira dados identificáveis.</span></div>`; }
function renderPrescription() {
  const mount=document.getElementById('prescricao');
  if(!mount) return;
  if(ui.prescriptionScreen==='new') mount.innerHTML=renderPrescriptionNew();
  else if(prescriptionCase()) mount.innerHTML=renderPrescriptionWorkspace(prescriptionCase());
  else mount.innerHTML=renderPrescriptionHome();
  bindPrescriptionEvents();
}
function renderPrescriptionHome() {
  const cases=[...prescriptionLab().cases].sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const complete=cases.filter(item=>item.status==='complete');
  const avg=complete.length?Math.round(complete.reduce((sum,item)=>sum+n(item.review?.overall),0)/complete.length):0;
  return `${prescriptionSafetyBanner()}<div class="rx-home-head"><div><span class="eyebrow">Laboratório clínico</span><h1>Simulador de Prescrição</h1><p class="muted">Treine a estrutura, a clareza e o raciocínio de prescrições em pacientes fictícios.</p></div><button class="icon-btn primary" id="rxNewCase">+ Novo caso</button></div><div class="grid cards rx-metrics">${metric('Casos salvos',cases.length,'armazenados no planner')}${metric('Finalizados',complete.length,'com revisão estrutural')}${metric('Média',`${avg}%`,'tentativas finalizadas')}</div><div class="card"><div class="section-title"><h2>Casos recentes</h2><span class="badge today">${cases.length}</span></div><div class="rx-case-list">${cases.map(item=>`<article class="rx-case-row"><button data-rx-open="${item.id}"><strong>${escapeHtml(item.theme||item.initialProblem||'Caso sem título')}</strong><span>${escapeHtml(item.patient?.name||'Paciente simulado')} · ${fmtDate(String(item.createdAt).slice(0,10))}</span></button><span class="badge ${item.status==='complete'?'done':'wait'}">${item.status==='complete'?'finalizado':'incompleto'}</span><button class="tiny-btn" data-rx-delete="${item.id}" title="Excluir caso">×</button></article>`).join('')||'<div class="empty">Nenhum caso criado. Comece por um tema clínico que deseja treinar.</div>'}</div></div>`;
}
function renderPrescriptionNew() {
  return `${prescriptionSafetyBanner()}<div class="card rx-new"><div class="section-title"><div><h1>Novo caso simulado</h1><div class="muted">Comece pelo problema; a hipótese pode permanecer aberta.</div></div><button class="icon-btn" id="rxCancelNew">Voltar</button></div><div class="rx-new-grid"><section><h2>1. Situação clínica</h2><label>Tema do treinamento<input class="input" id="rxTheme" list="rxThemeList" placeholder="Ex.: pneumonia"></label><datalist id="rxThemeList">${PRESCRIPTION_THEMES.map(x=>`<option value="${escapeAttr(x)}">`).join('')}</datalist><label>Problema clínico inicial<textarea class="textarea" id="rxProblem" placeholder="Ex.: febre, tosse e dispneia"></textarea></label><label>Hipótese diagnóstica<input class="input" id="rxDiagnosis" placeholder="Pode ficar em aberto"></label><div class="field-row"><label>Cenário<select class="select" id="rxSetting"><option>Ambulatório</option><option>Emergência</option><option>Internação</option></select></label><label>Modo<select class="select" id="rxMode"><option value="free">Livre</option><option value="challenge">Desafio</option></select></label><label>Faixa<select class="select" id="rxPopulation"><option value="adulto">Adulto</option><option value="pediatrico">Pediátrico</option><option value="idoso">Idoso</option></select></label></div></section><section><div class="section-title"><h2>2. Paciente fictício</h2><button class="tiny-btn" id="rxGeneratePatient">Gerar paciente</button></div><div class="field-row"><label>Identificação fictícia<input class="input" id="rxPatientName" placeholder="Paciente simulado"></label><label>Sexo<select class="select" id="rxPatientSex"><option>Qualquer</option><option>Masculino</option><option>Feminino</option></select></label><label>Idade<input class="input" id="rxPatientAge" type="number" min="0" max="120"></label></div><div class="field-row"><label>Peso (kg)<input class="input" id="rxPatientWeight" type="number" min="0" step="0.1"></label><label>Alergias<input class="input" id="rxPatientAllergies" placeholder="Nenhuma conhecida"></label><label>Função renal<input class="input" id="rxPatientRenal" placeholder="Sem alteração conhecida"></label></div><details><summary>Dados avançados</summary><div class="field-row"><label>Gestação<input class="input" id="rxPatientPregnancy"></label><label>Comorbidades<input class="input" id="rxPatientComorbidities"></label><label>Função hepática<input class="input" id="rxPatientLiver"></label></div></details></section></div><button class="icon-btn primary rx-create" id="rxCreateCase">Criar folha de prescrição</button></div>`;
}
function renderPrescriptionWorkspace(item) {
  const review=prescriptionReview(item);
  return `${prescriptionSafetyBanner()}<div class="rx-work-head"><button class="icon-btn" id="rxBackHome">‹ Casos</button><div><h1>${escapeHtml(item.theme||'Caso clínico')}</h1><div class="muted">${escapeHtml(item.setting)} · salvo automaticamente</div></div><div class="rx-head-actions"><button class="icon-btn" id="rxPrint">Imprimir</button><button class="icon-btn" id="rxReview">Revisar</button><button class="icon-btn primary" id="rxFinish">${item.status==='complete'?'Atualizar avaliação':'Finalizar'}</button></div></div><div class="rx-layout"><aside class="rx-patient">${renderPrescriptionPatient(item)}</aside><section class="rx-sheet">${renderPrescriptionSheet(item)}${ui.prescriptionReviewOpen?renderPrescriptionReview(review):''}</section><aside class="rx-tools">${renderPrescriptionTools(item)}</aside></div>`;
}
function renderPrescriptionPatient(item) {
  const p=item.patient||{};
  return `<span class="eyebrow">Paciente simulado</span><h2>${escapeHtml(p.name||'Sem identificação')}</h2><div class="rx-patient-summary">${escapeHtml(p.age||'?')} anos · ${escapeHtml(p.weight||'?')} kg · ${escapeHtml(p.sex||'')}</div><label>Alergias<input class="input" data-rx-patient="allergies" value="${escapeAttr(p.allergies||'')}"></label><label>Função renal<input class="input" data-rx-patient="renal" value="${escapeAttr(p.renal||'')}"></label><label>Função hepática<input class="input" data-rx-patient="liver" value="${escapeAttr(p.liver||'')}"></label><label>Gestação<input class="input" data-rx-patient="pregnancy" value="${escapeAttr(p.pregnancy||'')}"></label><label>Comorbidades<textarea class="textarea" data-rx-patient="comorbidities">${escapeHtml(p.comorbidities||'')}</textarea></label><details><summary>Dados clínicos</summary><label>Sinais vitais<textarea class="textarea" data-rx-patient="vitals">${escapeHtml(p.vitals||'')}</textarea></label><label>Medicamentos em uso<textarea class="textarea" data-rx-patient="currentMedications">${escapeHtml(p.currentMedications||'')}</textarea></label><label>Exames disponíveis<textarea class="textarea" data-rx-patient="availableExams">${escapeHtml(p.availableExams||'')}</textarea></label></details>`;
}
function renderPrescriptionSheet(item) {
  const r=item.reasoning||{};
  return `<header class="rx-paper-head"><div><strong>Folha de prescrição educacional</strong><span>${fmtDate(String(item.createdAt).slice(0,10))}</span></div><div>${escapeHtml(item.setting)} · ${escapeHtml(item.diagnosis||'Hipótese em construção')}</div></header><div class="rx-reasoning"><label>Problema principal<textarea class="textarea" data-rx-root="initialProblem">${escapeHtml(item.initialProblem||'')}</textarea></label><label>Hipóteses diagnósticas<textarea class="textarea" data-rx-reason="hypotheses">${escapeHtml(r.hypotheses||'')}</textarea></label><label>Objetivos da prescrição<textarea class="textarea" data-rx-reason="objectives">${escapeHtml(r.objectives||'')}</textarea></label><label>Justificativa clínica<textarea class="textarea" data-rx-reason="justification">${escapeHtml(r.justification||'')}</textarea></label></div><div class="section-title rx-items-title"><h2>Prescrição</h2><span class="badge today">${item.items.length} itens</span></div><div class="rx-items">${item.items.map((entry,index)=>renderPrescriptionItem(entry,index)).join('')||'<div class="empty">Use o painel Adicionar para montar a prescrição.</div>'}</div><div class="rx-handwriting"><div class="section-title"><div><h2>Anotações manuscritas</h2><div class="muted">Caneta escreve; o toque continua rolando a página.</div></div><div class="rx-pen-tools"><button class="tiny-btn ${ui.prescriptionPen==='pen'?'active':''}" data-rx-pen="pen">Caneta</button><button class="tiny-btn ${ui.prescriptionPen==='highlight'?'active':''}" data-rx-pen="highlight">Marca-texto</button><button class="tiny-btn ${ui.prescriptionPen==='eraser'?'active':''}" data-rx-pen="eraser">Borracha</button><button class="tiny-btn" id="rxUndoStroke">Desfazer</button><button class="tiny-btn" id="rxClearDrawing">Limpar</button></div></div><canvas id="rxCanvas" width="1000" height="420" aria-label="Área de escrita manual"></canvas></div>`;
}
function renderPrescriptionItem(entry,index) {
  const common=`<label>Instruções<textarea class="textarea" data-rx-item="${entry.id}" data-field="instructions">${escapeHtml(entry.instructions||'')}</textarea></label><label>Justificativa<input class="input" data-rx-item="${entry.id}" data-field="justification" value="${escapeAttr(entry.justification||'')}"></label>`;
  let fields='';
  if(entry.type==='medication') fields=`<div class="rx-item-grid"><label>Medicamento<input class="input" list="rxMedicationList" data-rx-item="${entry.id}" data-field="name" value="${escapeAttr(entry.name||'')}"></label><label>Apresentação<input class="input" data-rx-item="${entry.id}" data-field="presentation" value="${escapeAttr(entry.presentation||'')}"></label><label>Dose<input class="input" data-rx-item="${entry.id}" data-field="dose" value="${escapeAttr(entry.dose||'')}"></label><label>Unidade<input class="input" data-rx-item="${entry.id}" data-field="unit" value="${escapeAttr(entry.unit||'')}"></label><label>Via<input class="input" list="rxRouteList" data-rx-item="${entry.id}" data-field="route" value="${escapeAttr(entry.route||'')}"></label><label>Frequência<input class="input" data-rx-item="${entry.id}" data-field="frequency" value="${escapeAttr(entry.frequency||'')}"></label><label>Duração<input class="input" data-rx-item="${entry.id}" data-field="duration" value="${escapeAttr(entry.duration||'')}"></label><label>Diluição<input class="input" data-rx-item="${entry.id}" data-field="dilution" value="${escapeAttr(entry.dilution||'')}"></label><label>Tempo de infusão<input class="input" data-rx-item="${entry.id}" data-field="infusion" value="${escapeAttr(entry.infusion||'')}"></label></div>${common}`;
  else if(entry.type==='exam') fields=`<div class="rx-item-grid"><label>Exame<input class="input" list="rxExamList" data-rx-item="${entry.id}" data-field="name" value="${escapeAttr(entry.name||'')}"></label><label>Região ou material<input class="input" data-rx-item="${entry.id}" data-field="region" value="${escapeAttr(entry.region||'')}"></label><label>Incidências ou técnica<input class="input" data-rx-item="${entry.id}" data-field="technique" placeholder="Ex.: posteroanterior e perfil" value="${escapeAttr(entry.technique||'')}"></label></div><label>Indicação clínica<textarea class="textarea" data-rx-item="${entry.id}" data-field="indication">${escapeHtml(entry.indication||'')}</textarea></label>${common}`;
  else fields=`<div class="rx-item-grid"><label>${prescriptionTypeLabel(entry.type)}<input class="input" data-rx-item="${entry.id}" data-field="name" value="${escapeAttr(entry.name||'')}"></label><label>Frequência<input class="input" data-rx-item="${entry.id}" data-field="frequency" value="${escapeAttr(entry.frequency||'')}"></label></div>${common}`;
  return `<article class="rx-item"><div class="rx-item-head"><span>${index+1}</span><strong>${prescriptionTypeLabel(entry.type)}</strong><div><button class="tiny-btn" data-rx-save-model="${entry.id}">Salvar modelo</button><button class="tiny-btn" data-rx-remove-item="${entry.id}" title="Remover item">×</button></div></div>${fields}</article>`;
}
function renderPrescriptionTools(item) {
  const library=prescriptionLab().library;
  const models=[...library.medications,...library.exams,...library.others];
  return `<h2>Adicionar</h2><div class="rx-add-list">${[['medication','Medicamento'],['exam','Exame'],['procedure','Procedimento'],['monitoring','Monitorização'],['orientation','Orientação'],['diet','Dieta'],['note','Anotação livre']].map(([type,label])=>`<button data-rx-add="${type}">+ ${label}</button>`).join('')}</div><datalist id="rxMedicationList">${PRESCRIPTION_MEDICATIONS.map(x=>`<option value="${escapeAttr(x)}">`).join('')}</datalist><datalist id="rxExamList">${PRESCRIPTION_EXAMS.map(x=>`<option value="${escapeAttr(x)}">`).join('')}</datalist><datalist id="rxRouteList"><option value="VO"><option value="IV"><option value="IM"><option value="SC"><option value="Inalatória"><option value="Tópica"></datalist><div class="rx-library"><div class="section-title"><h3>Biblioteca pessoal</h3><span>${models.length}</span></div>${models.map(model=>`<div><button data-rx-use-model="${model.id}"><strong>${escapeHtml(model.name||prescriptionTypeLabel(model.type))}</strong><small>${prescriptionTypeLabel(model.type)}</small></button><button data-rx-delete-model="${model.id}">×</button></div>`).join('')||'<p class="muted">Salve itens que deseja reutilizar.</p>'}</div><div class="rx-tool-note"><strong>Checagem responsável</strong><p>A revisão avalia preenchimento e alertas simples. Não verifica interação, dose correta ou adequação terapêutica.</p></div>`;
}
function prescriptionReview(item) {
  const issues=[],safety=[],clarity=[]; let required=0,filled=0;
  const check=(value,label)=>{required++;if(String(value||'').trim())filled++;else issues.push(label);};
  item.items.forEach((entry,index)=>{const label=`Item ${index+1}`;check(entry.name,`${label}: informe o nome`);if(entry.type==='medication'){check(entry.dose,`${label}: informe a dose`);check(entry.unit,`${label}: informe a unidade`);check(entry.route,`${label}: informe a via`);check(entry.frequency,`${label}: informe a frequência`);if(/cef|penic|cillin|azitro|cipro|metro|vanco|antibi/i.test(entry.name||''))check(entry.duration,`${label}: informe a duração do antimicrobiano`);if(/\biv\b|intraven/i.test(entry.route||'')){check(entry.dilution,`${label}: informe a diluição IV`);check(entry.infusion,`${label}: informe o tempo de infusão`);}}if(entry.type==='exam')check(entry.indication,`${label}: informe a indicação clínica`);const text=Object.values(entry).join(' ');if(/\b1\s*ampola\b/i.test(text))clarity.push(`${label}: “1 ampola” exige concentração e volume`);if(/conforme orientação/i.test(text))clarity.push(`${label}: substitua “conforme orientação” por instrução explícita`);});
  const allergy=normalizedTopic(item.patient?.allergies||'');
  item.items.filter(x=>x.type==='medication').forEach(entry=>{const med=normalizedTopic(entry.name||'').split(' ')[0];if(med.length>3&&allergy.includes(med))safety.push(`Possível conflito entre ${entry.name} e a alergia registrada. Confirme manualmente.`);});
  if(item.items.some(x=>x.type==='medication')&&!/sem alteracao|normal|nao/i.test(normalizedTopic(item.patient?.renal||'')))safety.push('Função renal alterada ou incerta: confirme necessidade de ajuste de dose.');
  if(item.items.some(x=>x.type==='medication')&&/^sim/i.test(item.patient?.pregnancy||''))safety.push('Gestação registrada: confirme segurança de cada medicamento.');
  const coherenceFields=[item.initialProblem,item.reasoning?.hypotheses,item.reasoning?.objectives,item.reasoning?.justification];
  const coherence=Math.round(coherenceFields.filter(x=>String(x||'').trim()).length/coherenceFields.length*100);
  const completeness=required?Math.round(filled/required*100):(item.items.length?100:0);
  const scores={safety:Math.max(0,100-safety.length*25),completeness,coherence,clarity:Math.max(0,100-clarity.length*20)};
  return {...scores,overall:Math.round((scores.safety+scores.completeness+scores.coherence+scores.clarity)/4),issues,safety,clarity};
}
function renderPrescriptionReview(review) {
  const rows=[['Segurança',review.safety],['Completude',review.completeness],['Coerência',review.coherence],['Clareza',review.clarity]];
  const messages=[...review.safety,...review.issues,...review.clarity];
  return `<section class="rx-review"><div class="section-title"><div><h2>Revisão estrutural</h2><div class="muted">Não valida a correção clínica da conduta.</div></div><strong>${review.overall}%</strong></div><div class="rx-score-grid">${rows.map(([label,value])=>`<div><span>${label}</span><strong>${value}%</strong><i style="--score:${value}%"></i></div>`).join('')}</div><div class="rx-review-list">${messages.map(message=>`<p>${escapeHtml(message)}</p>`).join('')||'<p class="ok">Estrutura completa nos critérios automáticos disponíveis.</p>'}</div></section>`;
}
function restrictedPrescriptionData(values) { return values.some(value=>/\b\d{11}\b/.test(String(value||''))); }
function bindPrescriptionEvents() {
  document.getElementById('rxNewCase')?.addEventListener('click',()=>{ui.prescriptionScreen='new';renderPrescription();});
  document.getElementById('rxCancelNew')?.addEventListener('click',()=>{ui.prescriptionScreen='home';renderPrescription();});
  document.getElementById('rxGeneratePatient')?.addEventListener('click',()=>{const sex=(document.getElementById('rxPatientSex')?.value||'Qualquer').toLowerCase();const p=prescriptionPatient(document.getElementById('rxPopulation')?.value,sex==='qualquer'?'qualquer':sex==='masculino'?'masculino':'feminino');[['rxPatientName','name'],['rxPatientAge','age'],['rxPatientWeight','weight'],['rxPatientAllergies','allergies'],['rxPatientRenal','renal'],['rxPatientPregnancy','pregnancy'],['rxPatientComorbidities','comorbidities'],['rxPatientLiver','liver']].forEach(([id,key])=>{const el=document.getElementById(id);if(el)el.value=p[key]||'';});const sexEl=document.getElementById('rxPatientSex');if(sexEl)sexEl.value=p.sex;});
  document.getElementById('rxCreateCase')?.addEventListener('click',()=>{const value=id=>document.getElementById(id)?.value?.trim()||'';const values=['rxTheme','rxProblem','rxDiagnosis','rxPatientName','rxPatientAllergies','rxPatientRenal','rxPatientComorbidities'].map(value);if(restrictedPrescriptionData(values)){alert('Não insira CPF, prontuário ou outro número identificável. Use apenas um paciente fictício.');return;}if(!value('rxTheme')&&!value('rxProblem')){alert('Informe o tema ou o problema clínico inicial.');return;}const patient={...prescriptionPatient(),name:value('rxPatientName')||'Paciente simulado',sex:value('rxPatientSex'),age:value('rxPatientAge'),weight:value('rxPatientWeight'),allergies:value('rxPatientAllergies')||'Nenhuma conhecida',renal:value('rxPatientRenal')||'Sem alteração conhecida',pregnancy:value('rxPatientPregnancy'),comorbidities:value('rxPatientComorbidities'),liver:value('rxPatientLiver')};const item=newPrescriptionCase({theme:value('rxTheme')||value('rxProblem'),initialProblem:value('rxProblem'),diagnosis:value('rxDiagnosis'),setting:value('rxSetting'),mode:value('rxMode'),patient});prescriptionLab().cases.unshift(item);ui.prescriptionCaseId=item.id;ui.prescriptionScreen='case';persist();});
  document.querySelectorAll('[data-rx-open]').forEach(button=>button.onclick=()=>{ui.prescriptionCaseId=button.dataset.rxOpen;ui.prescriptionScreen='case';renderPrescription();});
  document.querySelectorAll('[data-rx-delete]').forEach(button=>button.onclick=()=>{if(!confirm('Excluir este caso simulado e suas anotações?'))return;prescriptionLab().cases=prescriptionLab().cases.filter(x=>x.id!==button.dataset.rxDelete);persist();});
  document.getElementById('rxBackHome')?.addEventListener('click',()=>{ui.prescriptionCaseId='';ui.prescriptionScreen='home';ui.prescriptionReviewOpen=false;renderPrescription();});
  const item=prescriptionCase(); if(!item)return;
  const touch=()=>{item.updatedAt=new Date().toISOString();saveStateOnly();};
  document.querySelectorAll('[data-rx-root]').forEach(el=>el.onchange=()=>{if(restrictedPrescriptionData([el.value])){alert('Remova dados identificáveis.');return;}item[el.dataset.rxRoot]=el.value;touch();});
  document.querySelectorAll('[data-rx-patient]').forEach(el=>el.onchange=()=>{if(restrictedPrescriptionData([el.value])){alert('Remova dados identificáveis.');return;}item.patient[el.dataset.rxPatient]=el.value;touch();});
  document.querySelectorAll('[data-rx-reason]').forEach(el=>el.onchange=()=>{item.reasoning[el.dataset.rxReason]=el.value;touch();});
  document.querySelectorAll('[data-rx-item]').forEach(el=>el.onchange=()=>{const entry=item.items.find(x=>x.id===el.dataset.rxItem);if(entry){entry[el.dataset.field]=el.value;touch();}});
  document.querySelectorAll('[data-rx-add]').forEach(button=>button.onclick=()=>{item.items.push({id:`rx-item-${Date.now()}`,type:button.dataset.rxAdd,name:'',instructions:'',justification:''});persist();});
  document.querySelectorAll('[data-rx-remove-item]').forEach(button=>button.onclick=()=>{if(confirm('Remover este item da prescrição?')){item.items=item.items.filter(x=>x.id!==button.dataset.rxRemoveItem);persist();}});
  document.querySelectorAll('[data-rx-save-model]').forEach(button=>button.onclick=()=>{const entry=item.items.find(x=>x.id===button.dataset.rxSaveModel);if(!entry||!entry.name){alert('Informe o nome antes de salvar o modelo.');return;}const bucket=entry.type==='medication'?'medications':entry.type==='exam'?'exams':'others';prescriptionLab().library[bucket].push({...entry,id:`rx-model-${Date.now()}`});persist();});
  document.querySelectorAll('[data-rx-use-model]').forEach(button=>button.onclick=()=>{const models=Object.values(prescriptionLab().library).flat();const model=models.find(x=>x.id===button.dataset.rxUseModel);if(model){item.items.push({...model,id:`rx-item-${Date.now()}`});persist();}});
  document.querySelectorAll('[data-rx-delete-model]').forEach(button=>button.onclick=()=>{if(!confirm('Excluir este modelo pessoal?'))return;Object.keys(prescriptionLab().library).forEach(key=>prescriptionLab().library[key]=prescriptionLab().library[key].filter(x=>x.id!==button.dataset.rxDeleteModel));persist();});
  document.getElementById('rxReview')?.addEventListener('click',()=>{ui.prescriptionReviewOpen=!ui.prescriptionReviewOpen;renderPrescription();});
  document.getElementById('rxFinish')?.addEventListener('click',()=>{const review=prescriptionReview(item);item.review={...review,at:new Date().toISOString()};item.status='complete';ui.prescriptionReviewOpen=true;persist();});
  document.getElementById('rxPrint')?.addEventListener('click',()=>{document.body.classList.add('prescription-print');const restore=()=>{document.body.classList.remove('prescription-print');window.removeEventListener('afterprint',restore);};window.addEventListener('afterprint',restore);window.print();});
  bindPrescriptionCanvas(item,touch);
}
function bindPrescriptionCanvas(item,touch) {
  const canvas=document.getElementById('rxCanvas');if(!canvas)return;const ctx=canvas.getContext('2d');const strokes=item.drawing?.strokes||(item.drawing={strokes:[]}).strokes;
  const redraw=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);strokes.forEach(stroke=>{ctx.save();ctx.globalCompositeOperation=stroke.mode==='eraser'?'destination-out':'source-over';ctx.strokeStyle=stroke.mode==='highlight'?'rgba(255,205,30,.38)':'#1261f5';ctx.lineWidth=stroke.mode==='highlight'?28:stroke.mode==='eraser'?34:5;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();stroke.points.forEach((point,index)=>{const x=point[0]*canvas.width,y=point[1]*canvas.height;index?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();ctx.restore();});};redraw();let active=null;
  const point=event=>{const rect=canvas.getBoundingClientRect();return[(event.clientX-rect.left)/rect.width,(event.clientY-rect.top)/rect.height];};
  canvas.onpointerdown=event=>{if(event.pointerType==='touch')return;canvas.setPointerCapture(event.pointerId);active={mode:ui.prescriptionPen,points:[point(event)]};strokes.push(active);redraw();};
  canvas.onpointermove=event=>{if(!active)return;active.points.push(point(event));redraw();};
  canvas.onpointerup=()=>{if(!active)return;active=null;touch();};
  document.querySelectorAll('[data-rx-pen]').forEach(button=>button.onclick=()=>{ui.prescriptionPen=button.dataset.rxPen;renderPrescription();});
  document.getElementById('rxUndoStroke')?.addEventListener('click',()=>{strokes.pop();touch();renderPrescription();});
  document.getElementById('rxClearDrawing')?.addEventListener('click',()=>{if(confirm('Apagar toda a anotação manuscrita?')){strokes.splice(0);touch();renderPrescription();}});
}
function bindFeynmanInputs() {
  const add = document.getElementById('addFeynman');
  if(add) add.onclick = () => { state.feynman.unshift({ id: `feyn-${Date.now()}`, topic: '', scheduleId: '', area: '', explain: '', gaps: '', analogy: '', nextStep: '', mastery: 0, reviewDate: localISODate(new Date()), updatedAt: localISODate(new Date()) }); persist(); };
  document.querySelectorAll('[data-remove-feynman]').forEach(btn => btn.onclick = e => { state.feynman = state.feynman.filter(x => x.id !== e.currentTarget.dataset.removeFeynman); persist(); });
  document.querySelectorAll('[data-feynman][data-field]').forEach(el => {
    const update = (target, shouldRender) => {
      const item = state.feynman.find(x => x.id === target.dataset.feynman);
      if(!item) return;
      const field = target.dataset.field;
      item[field] = target.type === 'number' ? n(target.value) : target.value;
      if(field === 'topic') { const linked = findScheduleByTopic(target.value); item.scheduleId = linked ? linked.id : ''; item.area = linked ? linked.area : item.area; }
      item.updatedAt = localISODate(new Date());
      shouldRender ? persist() : saveStateOnly();
    };
    if(['topic','explain','gaps','analogy','nextStep'].includes(el.dataset.field)) {
      el.oninput = e => update(e.target, false);
      el.onblur = e => update(e.target, true);
      el.onchange = e => update(e.target, true);
    } else {
      el.onchange = e => update(e.target, true);
    }
  });
}
function renderMateriais() {
  const allGroups = materialLibraryGroups();
  const blocks = [...new Set(materialLibrary.map(doc => String(doc.block)).filter(block => block && block !== '999'))].sort((a,b)=>n(a)-n(b));
  const groups = allGroups.filter(group => ui.materialBlock === 'Todos' || String(group.block) === String(ui.materialBlock));
  const selected = materialLibrary.find(doc => doc.id === ui.materialDocId) || null;
  const figures = materialLibrary.reduce((sum,doc)=>sum+n(doc.imageCount),0);
  document.getElementById('materiais').innerHTML = `<div class="library-overview"><div><span class="eyebrow">Biblioteca médica</span><h2>Materiais organizados pelos blocos do planner</h2><p>Escolha um bloco, abra a aula e consulte seus resumos em texto pesquisável.</p></div><div class="library-stats"><span><strong>${materialLibrary.length}</strong> resumos</span><span><strong>${new Set(materialLibrary.filter(doc=>doc.scheduleId).map(doc=>doc.scheduleId)).size}</strong> aulas</span><span><strong>${figures}</strong> figuras</span></div></div><section class="card material-block-browser"><div class="section-title"><div><span class="eyebrow">Blocos</span><h2>Escolha onde revisar</h2></div><span class="badge today">${ui.materialBlock === 'Todos' ? 'Todos' : `B${String(ui.materialBlock).padStart(2,'0')}`}</span></div><div class="qbank-block-grid material-block-grid"><button class="qbank-block-box ${ui.materialBlock==='Todos'?'active':''}" data-material-block-pick="Todos"><strong>Todos</strong><small>${materialLibrary.length} materiais</small></button>${blocks.map(block => { const docs=materialLibrary.filter(doc=>String(doc.block)===block); const lessons=new Set(docs.map(doc=>doc.scheduleId).filter(Boolean)).size; return `<button class="qbank-block-box ${String(ui.materialBlock)===block?'active':''}" data-material-block-pick="${block}"><strong>Bloco ${String(block).padStart(2,'0')}</strong><small>${lessons} aulas · ${docs.length} materiais</small></button>`; }).join('')}</div></section><div class="library-layout"><aside class="card library-sidebar"><div class="section-title"><div><span class="eyebrow">Aulas</span><h2>${ui.materialBlock==='Todos'?'Todos os materiais':`Materiais do Bloco ${String(ui.materialBlock).padStart(2,'0')}`}</h2></div><span class="badge today">${groups.length}</span></div><label class="search-field"><span aria-hidden="true">⌕</span><input class="input" id="materialSearch" value="${escapeAttr(ui.materialSearch)}" placeholder="Buscar tema, título ou subtítulo"></label><div class="library-folders">${groups.map(group => renderMaterialFolder(group, selected?.id)).join('') || '<div class="empty">Nenhum material disponível neste bloco.</div>'}</div></aside><section class="card material-reader">${renderMaterialReader(selected)}</section></div>`;
  document.querySelectorAll('[data-material-block-pick]').forEach(button => button.onclick = e => { ui.materialBlock=e.currentTarget.dataset.materialBlockPick; ui.materialScheduleId=''; ui.materialDocId=''; ui.materialSearch=''; renderMateriais(); });
  const search = document.getElementById('materialSearch');
  if(search) search.oninput = e => { ui.materialSearch=e.target.value; applyMaterialSearch(e.target.value); };
  document.querySelectorAll('[data-material-doc]').forEach(button => button.onclick = e => { ui.materialDocId=e.currentTarget.dataset.materialDoc; ui.materialScheduleId=materialLibrary.find(doc=>doc.id===ui.materialDocId)?.scheduleId || ''; renderMateriais(); });
  document.querySelectorAll('[data-material-heading]').forEach(button => button.onclick = e => document.getElementById(e.currentTarget.dataset.materialHeading)?.scrollIntoView({behavior:'smooth',block:'start'}));
  bindMaterialReader(selected);
  if(selected) {
    const readerHead=document.querySelector('#materiais .reader-head');
    if(readerHead) {
      const clock=document.createElement('span');
      clock.className='badge today';
      clock.dataset.autoStudyClock='';
      clock.dataset.autoStudyPrefix='Leitura ·';
      clock.textContent='Leitura · 00:00';
      readerHead.append(clock);
    }
    startAutoStudy('material', selected.scheduleId || '');
  }
  else stopAutoStudy('material');
  if(ui.materialSearch) applyMaterialSearch(ui.materialSearch);
}
function materialLibraryGroups() {
  const map = new Map();
  materialLibrary.forEach(doc => {
    const key = doc.scheduleId || 'outros';
    const schedule = doc.scheduleId ? state.schedule.find(item => item.id === doc.scheduleId) : null;
    if(!map.has(key)) map.set(key, { key, topic:schedule?.topic || 'Outros resumos', block:schedule?.block || 999, area:schedule?.area || '', documents:[] });
    map.get(key).documents.push(doc);
  });
  return [...map.values()].map(group => ({...group,documents:group.documents.sort((a,b)=>a.title.localeCompare(b.title))})).sort((a,b)=>n(a.block)-n(b.block)||a.topic.localeCompare(b.topic));
}
function renderMaterialFolder(group, selectedId) {
  const open = group.documents.some(doc => doc.id === selectedId) || group.key === ui.materialScheduleId || Boolean(ui.materialSearch);
  return `<details class="material-folder ${group.key===ui.materialScheduleId?'linked':''}" data-material-folder ${open?'open':''}><summary><span>${group.block===999?'':`B${String(group.block).padStart(2,'0')} · `}${escapeHtml(group.topic)}</span><span class="folder-count">${group.documents.length}</span></summary><div class="folder-options">${group.documents.map(doc => `<button class="material-choice ${doc.id===selectedId?'active':''}" data-material-doc="${doc.id}"><strong>${escapeHtml(doc.title)}</strong><span class="topic-source">${n(doc.imageCount) ? `${n(doc.imageCount)} figura${n(doc.imageCount)===1?'':'s'}` : 'Somente texto'}</span></button>`).join('')}</div></details>`;
}
function renderMaterialReader(doc) {
  if(!doc) {
    const linked = ui.materialScheduleId ? state.schedule.find(item => item.id === ui.materialScheduleId) : null;
    if(linked) return `<div class="reader-empty"><div><strong>Material ainda não disponível</strong><div>Não encontrei um resumo para ${escapeHtml(linked.topic)}. Você permanece no Bloco ${String(linked.block).padStart(2,'0')} para escolher outro material.</div></div></div>`;
    return `<div class="reader-empty"><div><strong>${escapeHtml(materialLibraryStatus)}</strong><div>Escolha uma aula e depois clique no material que deseja abrir.</div></div></div>`;
  }
  const sourceMarkdown = doc.markdown ? materialMarkdownCache[doc.id] : '';
  const markdown = effectiveMaterialMarkdown(doc, sourceMarkdown);
  if(doc.markdown && markdown === undefined) loadMaterialMarkdown(doc);
  loadMaterialImagesForMarkdown(doc, markdown || '');
  const toc = materialSections(markdown || '').filter(section => section.level >= 2).slice(0,40).map(section => ({text:section.title}));
  const markdownHtml = doc.markdown
    ? (markdown === undefined ? '<div class="empty">Carregando texto do resumo...</div>' : ui.materialEditMode ? renderMaterialEditor(doc, markdown) : `<article class="material-markdown material-reading-mode">${renderMaterialMarkdown(markdown, doc)}</article>`)
    : '<div class="empty">Texto estruturado ainda não gerado para este material.</div>';
  const tocItems = toc.map(item => ({...item,id:materialHeadingId(item.text)}));
  const meta = materialEditMeta(doc.id);
  const markers = ['yellow','green','blue','red'].map(color => `<button class="marker-btn marker-${color} ${ui.materialHighlightColor===color?'active':''}" data-material-marker="${color}" title="Marca-texto ${highlightLabel(color)}"></button>`).join('');
  return `<div class="reader-head"><div><span class="eyebrow">${doc.block?`Bloco ${String(doc.block).padStart(2,'0')}`:'Material complementar'} · ${escapeHtml(doc.area || 'Revisão')}</span><h2>${escapeHtml(doc.title)}</h2><div class="muted">Vinculado a ${escapeHtml(doc.topic || 'conteúdo complementar')}</div></div><span class="badge ${meta.edited?'wait':'done'}">${meta.edited?'Editado neste computador':n(doc.imageCount)?`${n(doc.imageCount)} figura${n(doc.imageCount)===1?'':'s'}`:'Texto limpo'}</span></div><div class="material-reader-toolbar"><div><button class="icon-btn primary" id="materialEditToggle">${ui.materialEditMode?'Concluir edição':'Editar Markdown'}</button><button class="icon-btn" id="materialExportMarkdown">Exportar .md</button>${meta.edited?'<button class="icon-btn" id="materialRestoreOriginal">Restaurar original</button>':''}</div><div class="material-highlight-toolbar"><span class="muted">Marca-texto</span>${markers}<button class="tiny-btn" id="clearMaterialHighlights">Limpar</button></div></div>${!ui.materialEditMode && tocItems.length?`<nav class="reader-toc" aria-label="Seções do resumo">${tocItems.map(item=>`<button class="tiny-btn" data-material-heading="${item.id}">${escapeHtml(item.text)}</button>`).join('')}</nav>`:''}${markdownHtml}`;
}
async function loadMaterialMarkdown(doc) {
  if(!doc?.markdown || materialMarkdownCache[doc.id] !== undefined) return;
  materialMarkdownCache[doc.id] = undefined;
  try {
    const response = await fetch(`materials_library/${doc.markdown}`, {cache:'no-store'});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    materialMarkdownCache[doc.id] = await response.text();
    if(materialEditMeta(doc.id).edited) loadMaterialEdit(doc);
  } catch(error) {
    console.warn('Markdown do material indisponível:', error);
    materialMarkdownCache[doc.id] = '';
  }
  if(ui.tab === 'materiais' && ui.materialDocId === doc.id) renderMateriais();
}
function materialEditMeta(docId) {
  if(!state.materials[docId] || typeof state.materials[docId] !== 'object') state.materials[docId] = {};
  if(!Array.isArray(state.materials[docId].highlights)) state.materials[docId].highlights = [];
  return state.materials[docId];
}
function cleanMaterialExtraction(text) {
  const lines = String(text || '').normalize('NFC').replace(/\u00a0/g,' ').split(/\r?\n/);
  const cleaned = lines.map((line,index) => {
    let value = line.replace(/[ \t]+/g,' ').replace(/\s+([,.;:!?])/g,'$1').trimEnd();
    const next = lines[index + 1] || '';
    const tableLike = value.includes('|') && /^\s*\|?\s*:?-{3,}/.test(next);
    if(value.includes('|') && !tableLike && !/^\s*\|?\s*:?-{3,}/.test(value)) value = value.replace(/\s*\|\s*/g,' ');
    if(/^\s*[|¦]+\s*$/.test(value)) return '';
    return value;
  }).join('\n');
  return cleaned.replace(/([A-Za-zÀ-ÖØ-öø-ÿ])-\n\s*([a-zà-öø-ÿ])/g,'$1$2').replace(/\n{3,}/g,'\n\n').trim() + '\n';
}
function effectiveMaterialMarkdown(doc, source=materialMarkdownCache[doc.id]) {
  if(materialEditCache.has(doc.id)) return materialEditCache.get(doc.id) ?? cleanMaterialExtraction(source || '');
  if(materialEditMeta(doc.id).edited) loadMaterialEdit(doc);
  if(source === undefined) return undefined;
  return cleanMaterialExtraction(source || '');
}
function materialSections(markdown) {
  const text = String(markdown || '');
  const matches = [...text.matchAll(/^(#{1,4})\s+(.+)$/gm)];
  if(!matches.length) return [{title:'Documento inteiro',level:1,start:0,end:text.length,content:text}];
  const sections = [];
  if(matches[0].index > 0) sections.push({title:'Introdução',level:1,start:0,end:matches[0].index,content:text.slice(0,matches[0].index)});
  matches.forEach((match,index) => {
    const start=match.index;
    const end=matches[index+1]?.index ?? text.length;
    sections.push({title:match[2].trim(),level:match[1].length,start,end,content:text.slice(start,end).trimEnd()+'\n'});
  });
  return sections;
}
function renderMaterialEditor(doc, markdown) {
  const sections = materialSections(markdown);
  ui.materialSectionIndex = Math.max(0,Math.min(n(ui.materialSectionIndex),sections.length-1));
  const section = sections[ui.materialSectionIndex] || sections[0];
  const editing = ui.materialEditScope === 'section' ? section.content : markdown;
  return `<div class="material-editor"><div class="material-editor-settings"><select class="select" id="materialEditScope"><option value="full" ${ui.materialEditScope==='full'?'selected':''}>Documento inteiro</option><option value="section" ${ui.materialEditScope==='section'?'selected':''}>Editar por seção</option></select>${ui.materialEditScope==='section'?`<select class="select" id="materialSectionSelect">${sections.map((item,index)=>`<option value="${index}" ${index===ui.materialSectionIndex?'selected':''}>${escapeHtml(item.title)}</option>`).join('')}</select>`:''}<button class="tiny-btn" id="cleanMaterialText">Limpar símbolos da extração</button><span class="material-autosave" id="materialAutosave">Salvo automaticamente</span></div><div class="material-markdown-tools"><button data-md-prefix="**" data-md-suffix="**" title="Negrito"><strong>B</strong></button><button data-md-prefix="*" data-md-suffix="*" title="Itálico"><em>I</em></button><button data-md-prefix="==" data-md-suffix="==" title="Destaque">Marca</button><button data-md-line="## " title="Título de seção">H2</button><button data-md-line="### " title="Subtítulo">H3</button><button data-md-line="- " title="Lista">Lista</button><button data-md-line="> " title="Citação">Citação</button><label title="Inserir imagem">Imagem<input type="file" id="materialImageInput" accept="image/*" hidden></label></div><div class="material-editor-layout"><textarea class="textarea material-markdown-input" id="materialMarkdownInput" spellcheck="true">${escapeHtml(editing)}</textarea><div class="material-editor-preview"><span class="eyebrow">Prévia</span><article class="material-markdown" id="materialMarkdownPreview">${renderMaterialMarkdown(editing,doc)}</article></div></div></div>`;
}
function openMaterialDb() {
  if(materialDbPromise) return materialDbPromise;
  materialDbPromise = new Promise((resolve,reject) => {
    const request=indexedDB.open('enamed-materials',1);
    request.onupgradeneeded=() => request.result.createObjectStore('records',{keyPath:'key'});
    request.onsuccess=() => resolve(request.result);
    request.onerror=() => reject(request.error);
  });
  return materialDbPromise;
}
async function materialDbGet(key) {
  try { const db=await openMaterialDb(); return await new Promise((resolve,reject) => { const req=db.transaction('records','readonly').objectStore('records').get(key); req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); }); } catch(error) { console.warn('Armazenamento local de materiais indisponível:',error); return null; }
}
async function materialDbPut(record) {
  const db=await openMaterialDb();
  return new Promise((resolve,reject) => { const tx=db.transaction('records','readwrite'); tx.objectStore('records').put(record); tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error); });
}
async function materialDbDelete(key) {
  try { const db=await openMaterialDb(); await new Promise((resolve,reject) => { const tx=db.transaction('records','readwrite'); tx.objectStore('records').delete(key); tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error); }); } catch(error) { console.warn('Não foi possível remover a edição local:',error); }
}
async function loadMaterialEdit(doc) {
  if(!doc || materialEditCache.has(doc.id) || materialEditLoading.has(doc.id)) return;
  materialEditLoading.add(doc.id);
  const record=await materialDbGet(`document:${doc.id}`);
  materialEditLoading.delete(doc.id);
  materialEditCache.set(doc.id,typeof record?.content==='string'?record.content:null);
  if(ui.tab==='materiais' && ui.materialDocId===doc.id) renderMateriais();
}
function queueMaterialEditSave(doc,markdown) {
  materialEditCache.set(doc.id,markdown);
  const meta=materialEditMeta(doc.id);
  meta.edited=true;
  meta.updatedAt=new Date().toISOString();
  const status=document.getElementById('materialAutosave');
  if(status) status.textContent='Salvando...';
  clearTimeout(materialEditSaveTimers.get(doc.id));
  materialEditSaveTimers.set(doc.id,setTimeout(async() => {
    try {
      await materialDbPut({key:`document:${doc.id}`,type:'markdown',docId:doc.id,content:markdown,updatedAt:Date.now()});
      saveStateOnly();
      const current=document.getElementById('materialAutosave');
      if(current) current.textContent='Salvo neste computador';
    } catch(error) {
      const current=document.getElementById('materialAutosave');
      if(current) current.textContent='Não foi possível salvar';
    }
  },300));
}
function insertMarkdownAtSelection(textarea,prefix,suffix='') {
  const start=textarea.selectionStart;
  const end=textarea.selectionEnd;
  const selected=textarea.value.slice(start,end);
  textarea.setRangeText(`${prefix}${selected}${suffix}`,start,end,'end');
  textarea.focus();
  textarea.dispatchEvent(new Event('input',{bubbles:true}));
}
function prefixMarkdownLine(textarea,prefix) {
  const start=textarea.value.lastIndexOf('\n',Math.max(0,textarea.selectionStart-1))+1;
  textarea.setRangeText(prefix,start,start,'end');
  textarea.focus();
  textarea.dispatchEvent(new Event('input',{bubbles:true}));
}
async function storeMaterialImage(file) {
  if(!file?.type?.startsWith('image/')) return '';
  if(file.size > 12*1024*1024) { alert('Escolha uma imagem com até 12 MB.'); return ''; }
  const dataUrl=await new Promise((resolve,reject) => { const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=()=>reject(reader.error); reader.readAsDataURL(file); });
  const id=`img-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  materialImageCache.set(id,dataUrl);
  await materialDbPut({key:`image:${id}`,type:'image',id,name:file.name,mime:file.type,dataUrl,createdAt:Date.now()});
  return id;
}
async function loadMaterialImagesForMarkdown(doc,markdown) {
  const ids=[...String(markdown||'').matchAll(/material-image:([\w-]+)/g)].map(match=>match[1]);
  const missing=[...new Set(ids)].filter(id=>!materialImageCache.has(id));
  if(!missing.length) return;
  await Promise.all(missing.map(async id => { const record=await materialDbGet(`image:${id}`); if(record?.dataUrl) materialImageCache.set(id,record.dataUrl); }));
  if(ui.tab==='materiais' && ui.materialDocId===doc.id) renderMateriais();
}
function exportMaterialMarkdown(doc,markdown) {
  const blob=new Blob([markdown],{type:'text/markdown;charset=utf-8'});
  const link=document.createElement('a');
  link.href=URL.createObjectURL(blob);
  link.download=`${doc.id}.md`;
  link.click();
  URL.revokeObjectURL(link.href);
}
async function restoreOriginalMaterial(doc) {
  if(!confirm('Restaurar o texto original? As marcações serão mantidas, mas a edição Markdown será apagada.')) return;
  clearTimeout(materialEditSaveTimers.get(doc.id));
  await materialDbDelete(`document:${doc.id}`);
  materialEditCache.delete(doc.id);
  const meta=materialEditMeta(doc.id);
  meta.edited=false;
  meta.updatedAt='';
  ui.materialEditMode=false;
  saveStateOnly();
  renderMateriais();
}
function toggleMaterialHighlight(doc) {
  const selection=window.getSelection();
  const selected=selection?.toString().replace(/\s+/g,' ').trim() || '';
  const anchor=selection?.anchorNode?.parentElement?.closest('[data-material-block]');
  const focus=selection?.focusNode?.parentElement?.closest('[data-material-block]');
  if(selected.length<2 || !anchor || anchor!==focus || !anchor.closest('.material-reading-mode')) return;
  const range=selection.getRangeAt(0);
  const beforeRange=range.cloneRange();
  beforeRange.selectNodeContents(anchor);
  beforeRange.setEnd(range.startContainer,range.startOffset);
  const before=beforeRange.toString().replace(/\s+/g,' ');
  const occurrence=(before.match(new RegExp(escapeRegExp(selected),'g'))||[]).length;
  const block=anchor.dataset.materialBlock;
  const meta=materialEditMeta(doc.id);
  const index=meta.highlights.findIndex(item=>item.text===selected && item.block===block && n(item.occurrence)===occurrence);
  rememberHighlightState({ context:'material', docId:doc.id, highlights:meta.highlights });
  meta.highlights=index>=0?meta.highlights.filter((_,position)=>position!==index):[...meta.highlights,{text:selected,color:ui.materialHighlightColor||'yellow',block,occurrence}];
  selection.removeAllRanges();
  saveStateOnly();
  renderMateriais();
}
function bindMaterialReader(doc) {
  if(!doc) return;
  document.getElementById('materialEditToggle')?.addEventListener('click',() => { ui.materialEditMode=!ui.materialEditMode; renderMateriais(); });
  document.getElementById('materialExportMarkdown')?.addEventListener('click',() => exportMaterialMarkdown(doc,effectiveMaterialMarkdown(doc)||''));
  document.getElementById('materialRestoreOriginal')?.addEventListener('click',() => restoreOriginalMaterial(doc));
  document.querySelectorAll('[data-material-marker]').forEach(button => button.onclick=() => { ui.materialHighlightColor=button.dataset.materialMarker; renderMateriais(); });
  document.getElementById('clearMaterialHighlights')?.addEventListener('click',() => {
    const meta=materialEditMeta(doc.id);
    if(meta.highlights.length) rememberHighlightState({ context:'material', docId:doc.id, highlights:meta.highlights });
    meta.highlights=[];
    saveStateOnly();
    renderMateriais();
  });
  const reading=document.querySelector('.material-reading-mode');
  if(reading) reading.onmouseup=event => { if((window.getSelection()?.toString()||'').trim().length>1) { event.preventDefault(); setTimeout(()=>toggleMaterialHighlight(doc),0); } };
  const scope=document.getElementById('materialEditScope');
  if(scope) scope.onchange=event => { ui.materialEditScope=event.target.value; ui.materialSectionIndex=0; renderMateriais(); };
  const section=document.getElementById('materialSectionSelect');
  if(section) section.onchange=event => { ui.materialSectionIndex=n(event.target.value); renderMateriais(); };
  const textarea=document.getElementById('materialMarkdownInput');
  if(!textarea) return;
  const editorFull=effectiveMaterialMarkdown(doc) || '';
  const editorSections=materialSections(editorFull);
  const editorSection=editorSections[Math.max(0,Math.min(ui.materialSectionIndex,editorSections.length-1))];
  const sectionPrefix=ui.materialEditScope==='section' && editorSection ? editorFull.slice(0,editorSection.start) : '';
  const sectionSuffix=ui.materialEditScope==='section' && editorSection ? editorFull.slice(editorSection.end) : '';
  const update=() => {
    const full=ui.materialEditScope==='section' ? `${sectionPrefix}${textarea.value.trimEnd()}\n${sectionSuffix}` : textarea.value;
    queueMaterialEditSave(doc,full);
    const preview=document.getElementById('materialMarkdownPreview');
    if(preview) preview.innerHTML=renderMaterialMarkdown(textarea.value,doc);
  };
  textarea.oninput=update;
  textarea.onpaste=async event => {
    const image=[...(event.clipboardData?.files||[])].find(file=>file.type.startsWith('image/'));
    if(!image) return;
    event.preventDefault();
    const id=await storeMaterialImage(image);
    if(id) insertMarkdownAtSelection(textarea,`\n\n![${image.name || 'Imagem'}](material-image:${id})\n\n`);
  };
  document.querySelectorAll('[data-md-prefix]').forEach(button => button.onclick=() => insertMarkdownAtSelection(textarea,button.dataset.mdPrefix,button.dataset.mdSuffix||''));
  document.querySelectorAll('[data-md-line]').forEach(button => button.onclick=() => prefixMarkdownLine(textarea,button.dataset.mdLine));
  document.getElementById('cleanMaterialText')?.addEventListener('click',() => { textarea.value=cleanMaterialExtraction(textarea.value); update(); });
  const imageInput=document.getElementById('materialImageInput');
  if(imageInput) imageInput.onchange=async event => { const file=event.target.files?.[0]; const id=await storeMaterialImage(file); if(id) insertMarkdownAtSelection(textarea,`\n\n![${file.name || 'Imagem'}](material-image:${id})\n\n`); event.target.value=''; };
}
function applyMaterialSearch(value) {
  const query = normalizedTopic(value);
  const visibleIds = new Set(materialLibrary.filter(doc => {
    const editedText=materialEditCache.has(doc.id) ? normalizedTopic(materialEditCache.get(doc.id) || '') : '';
    return !query || doc.searchText.includes(query) || editedText.includes(query) || normalizedTopic(doc.title).includes(query) || (doc.headings||[]).some(item => normalizedTopic(item.text).includes(query));
  }).map(doc=>doc.id));
  document.querySelectorAll('[data-material-doc]').forEach(button => button.classList.toggle('hidden', !visibleIds.has(button.dataset.materialDoc)));
  document.querySelectorAll('[data-material-folder]').forEach(folder => {
    const anyVisible = [...folder.querySelectorAll('[data-material-doc]')].some(button => !button.classList.contains('hidden'));
    folder.classList.toggle('hidden', !anyVisible);
    if(query && anyVisible) folder.open=true;
  });
}
function loadMaterialLibrary() {
  if(!materialLibraryLoadPromise) materialLibraryLoadPromise = loadMaterialLibraryNow();
  return materialLibraryLoadPromise;
}
async function openMaterialsForSchedule(scheduleId) {
  const item = state.schedule.find(row => row.id === scheduleId);
  if(!item) return;
  await loadMaterialLibrary();
  const documents = materialLibrary.filter(doc => doc.scheduleId === scheduleId);
  ui.tab = 'materiais';
  ui.materialBlock = String(item.block || 'Todos');
  ui.materialScheduleId = scheduleId;
  ui.materialDocId = documents[0]?.id || '';
  ui.materialSearch = '';
  ui.materialEditMode = false;
  render();
}
async function loadMaterialLibraryNow() {
  try {
    const response = await fetch('materials_library/index.json', {cache:'no-store'});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    materialLibrary = Array.isArray(payload.documents) ? payload.documents : [];
    materialLibraryStatus = `${materialLibrary.length} resumos disponíveis`;
  } catch(error) {
    console.warn('Biblioteca de materiais ainda não disponível:', error);
    materialLibrary = [];
    materialLibraryStatus = 'Biblioteca em preparação';
  }
  if(ui.tab === 'materiais') renderMateriais();
}
async function loadOfficialSchedule() {
  try {
    const response = await fetch('official_schedule.json', {cache:'no-store'});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    officialSchedule = Array.isArray(payload.items) ? payload.items : [];
    const changed = applyOfficialSchedule();
    if(changed) render();
  } catch(error) {
    console.warn('Cronograma oficial do Medplanner indisponível:', error);
  }
}
function videoAssetUrl(video) {
  const relativePath = String(video.relativePath || '').split('/').map(part => encodeURIComponent(part)).join('/');
  const localUrl = `video_library/media/${relativePath}`;
  // A cópia local continua funcionando sem internet; o site publicado usa o R2.
  const useR2 = usesR2VideoSource();
  return useR2 ? `${R2_VIDEO_BASE_URL}/video_library/media/${relativePath}` : localUrl;
}
function usesR2VideoSource() {
  return ui.videoSourceMode === 'online' || (ui.videoSourceMode === 'auto' && !isLocalPlanner());
}
function rememberVideoPlaybackRate(rate) {
  const allowed = [0.75,1,1.25,1.5,1.75,2];
  const selected = allowed.reduce((best, value) => Math.abs(value-rate) < Math.abs(best-rate) ? value : best, 1);
  ui.videoPlaybackRate = selected;
  localStorage.setItem(VIDEO_RATE_KEY, String(selected));
  const select = document.getElementById('videoPlaybackRate');
  if(select) select.value = String(selected);
  return selected;
}
function formatVideoTime(seconds=0) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
}
function parseVideoTime(value='') {
  const text = String(value).trim();
  if(/^\d+$/.test(text)) return Number(text);
  const parts = text.split(':').map(part => part.trim());
  if(parts.length < 2 || parts.length > 3 || parts.some(part => !/^\d+$/.test(part))) return null;
  const numbers = parts.map(Number);
  const seconds = parts.length === 3
    ? numbers[0] * 3600 + numbers[1] * 60 + numbers[2]
    : numbers[0] * 60 + numbers[1];
  return Number.isFinite(seconds) ? seconds : null;
}
function videoScheduleForLesson(lesson) {
  if(lesson?.scheduleId) return state.schedule.find(item => item.id === lesson.scheduleId) || null;
  const target = canonicalTopic(lesson.title);
  const override = VIDEO_SCHEDULE_OVERRIDES[`${n(lesson?.block)}:${target}`];
  if(override) return state.schedule.find(item => n(item.block)===n(override.block) && (override.order ? n(item.lessonOrder)===n(override.order) : canonicalTopic(item.topic)===canonicalTopic(override.topic))) || null;
  const candidates = state.schedule.filter(item => n(item.block) === n(lesson.block));
  return candidates.find(item => canonicalTopic(item.topic) === target)
    || candidates.find(item => target.length >= 6 && (canonicalTopic(item.topic).includes(target) || target.includes(canonicalTopic(item.topic))))
    || null;
}
function videoScheduleForVideo(lesson, video) {
  if(!lesson || !video) return null;
  const target = canonicalTopic(videoContentLabel(video));
  const override = VIDEO_SCHEDULE_OVERRIDES[`${n(lesson.block)}:${target}`];
  if(override) return state.schedule.find(item => n(item.block)===n(override.block) && (override.order ? n(item.lessonOrder)===n(override.order) : canonicalTopic(item.topic)===canonicalTopic(override.topic))) || null;
  const candidates = state.schedule.filter(item => n(item.block) === n(lesson.block));
  return candidates.find(item => canonicalTopic(item.topic) === target)
    || candidates.find(item => target.length >= 6 && (canonicalTopic(item.topic).includes(target) || target.includes(canonicalTopic(item.topic))))
    || null;
}
function displayVideoLessons() {
  if(renderCache.videoDisplay) return renderCache.videoDisplay;
  const groups = new Map();
  videoCatalog.forEach(raw => {
    raw.videos.forEach(video => {
      const schedule = videoScheduleForVideo(raw, video) || videoScheduleForLesson(raw);
      const key = schedule ? `schedule:${schedule.id}` : `video:${raw.id}`;
      if(!groups.has(key)) groups.set(key, {
        id: key,
        scheduleId: schedule?.id || '',
        lessonOrder: n(schedule?.lessonOrder),
        block: schedule?.block || raw.block,
        area: schedule?.area || raw.area,
        title: schedule?.topic || raw.title,
        fileTitles: [],
        videos: []
      });
      const group = groups.get(key);
      if(!group.fileTitles.includes(raw.title)) group.fileTitles.push(raw.title);
      if(!group.videos.some(current => current.id === video.id)) group.videos.push({ ...video, lessonTopic: raw.title, folderOrder:raw.folderOrder });
    });
  });
  // Os blocos finais já aparecem na rota de estudo mesmo antes do envio dos MP4s.
  state.schedule.filter(item => n(item.block) >= 25).forEach(schedule => {
    const key = `schedule:${schedule.id}`;
    if(groups.has(key)) return;
    groups.set(key, {
      id:key,
      scheduleId:schedule.id,
      lessonOrder:n(schedule.lessonOrder),
      block:schedule.block,
      area:schedule.area,
      title:schedule.topic,
      fileTitles:[],
      videos:[],
      placeholder:true
    });
  });
  renderCache.videoDisplay = [...groups.values()].map(lesson => ({ ...lesson, videos: lesson.videos.sort((a,b) => a.type.localeCompare(b.type) || a.title.localeCompare(b.title, 'pt-BR')) }));
  return renderCache.videoDisplay;
}
function videoContentLabel(video) {
  const cleaned = String(video?.title || '')
    .replace(/^\d+\s*[-.]\s*/i, '')
    .replace(/\bcof[\s_-]*express\b/ig, '')
    .replace(/\benamed\b/ig, '')
    .replace(/\s*[-.]\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const key = normalizedTopic(cleaned);
  if(key === 'diabetes classificacao fisiopatologia e diagnostico do dm') return 'Diabetes: Classificação, Fisiopatologia e Diagnóstico do DM';
  if(key === 'diabetes tratamento e complicacoes cronicas') return 'Diabetes: Tratamento e Complicações Crônicas';
  if(key === 'interrupcao legal da gestacao' || key === 'interrupcao legal da gravidez') return 'Interrupção Legal da Gravidez';
  if(key === 'violencia sexual') return 'Violência Sexual';
  if(key === 'cefaleias primarias sinais de alarme para secundarias') return 'Cefaleias';
  if(key.startsWith('diarreias agudas e cronicas')) return 'Diarreias Agudas e Crônicas';
  return cleaned || String(video?.lessonTopic || 'Aula').trim() || 'Aula';
}
function videoContentOrder(topic) {
  const key = normalizedTopic(topic);
  if(key === 'interrupcao legal da gravidez') return 1;
  if(key === 'violencia sexual') return 2;
  return 0;
}
const SUMMARY_EXPRESS_LESSONS = new Set(['vigilancia em saude', 'sindromes coronarianas agudas']);
function videoSummaryExpressVideos(lesson) {
  if(!SUMMARY_EXPRESS_LESSONS.has(canonicalTopic(lesson?.title))) return [];
  return (lesson?.videos || []).filter(video => video.type === 'express');
}
function videoDeclaredPartNumber(video) {
  const title = String(video?.title || '');
  const match = title.match(/\bparte\s*(\d+)\b|\b(\d+)\s*(?:a|o|ª|º)?\s*parte\b/i);
  return match ? Number(match[1] || match[2]) : 0;
}
function videoParts(lesson) {
  const allVideos = lesson?.videos || [];
  const summaryExpress = videoSummaryExpressVideos(lesson);
  const contentVideos = allVideos.filter(video => !summaryExpress.some(summary => summary.id === video.id));
  const completeCount = contentVideos.filter(video => video.type === 'complete').length;
  const expressCount = contentVideos.filter(video => video.type === 'express').length;
  if(summaryExpress.length) {
    const completeVideos = contentVideos.filter(video => video.type === 'complete').sort((a,b) => {
      const orderA = videoDeclaredPartNumber(a) || (/acessor/i.test(a.title) ? 99 : 1);
      const orderB = videoDeclaredPartNumber(b) || (/acessor/i.test(b.title) ? 99 : 1);
      return orderA-orderB || a.title.localeCompare(b.title, 'pt-BR');
    });
    return completeVideos.map((video, index) => ({ key:`part-${index+1}`, number:index+1, label:`Parte ${String(index+1).padStart(2,'0')}`, sortOrder:index+1, typeRank:0, videos:[video] }));
  }
  // Um par completo + COFEXPRESS é uma única aula, ainda que os arquivos tenham
  // prefixos editoriais diferentes (R1, R+PED, (2) etc.).
  if(completeCount <= 1 && expressCount <= 1 && contentVideos.length <= 2) {
    return contentVideos.length ? [{ key:'single', number:0, label:'Aula', typeRank:0, videos:[...contentVideos].sort((a,b)=>a.type.localeCompare(b.type) || a.title.localeCompare(b.title, 'pt-BR')) }] : [];
  }
  const groups = new Map();
  contentVideos.forEach(video => {
    const topic = videoContentLabel(video);
    const topicKey = normalizedTopic(topic) || 'aula';
    const match = topic.match(/\bparte\s*(\d+)\b|\b(\d+)\s*(?:a|o|ª|º)?\s*parte\b/i);
    const number = match ? Number(match[1] || match[2]) : (/\bparte$/i.test(topic) ? 1 : 0);
    const key = number ? `part-${topicKey}-${number}` : `topic-${topicKey}`;
    const label = number ? `Parte ${String(number).padStart(2,'0')}` : (topic || 'Aula');
    const sourceOrder = n(video.folderOrder) || 999;
    const contentOrder = videoContentOrder(topic) || sourceOrder;
    if(!groups.has(key)) groups.set(key, { key, number, label, sortOrder:contentOrder, videos: [] });
    const group = groups.get(key);
    group.sortOrder = Math.min(group.sortOrder, contentOrder);
    group.videos.push(video);
  });
  return [...groups.values()].map(part => ({ ...part, typeRank:part.videos.some(video=>video.type==='complete') ? 0 : 1, videos: part.videos.sort((a,b)=>a.type.localeCompare(b.type) || a.title.localeCompare(b.title, 'pt-BR')) })).sort((a,b)=> (a.number && b.number ? a.number-b.number : a.sortOrder-b.sortOrder) || a.typeRank-b.typeRank || a.label.localeCompare(b.label, 'pt-BR'));
}
function lessonVideoCompleted(lesson) {
  if(!(lesson?.videos || []).length) return false;
  const summaryExpress = videoSummaryExpressVideos(lesson);
  if(summaryExpress.some(video => state.videoPlayer.watched[video.id])) return true;
  return videoParts(lesson).every(part => part.videos.some(video => state.videoPlayer.watched[video.id]));
}
function lessonWatchedOnlyByCofexpress(lesson) {
  const videos = lesson?.videos || [];
  const watchedExpress = videos.some(video => video.type === 'express' && state.videoPlayer.watched[video.id]);
  const watchedComplete = videos.some(video => video.type === 'complete' && state.videoPlayer.watched[video.id]);
  return watchedExpress && !watchedComplete;
}
function videoLessonProgress(lesson) {
  const summaryExpress = videoSummaryExpressVideos(lesson);
  if(summaryExpress.length) return { total:1, done:lessonVideoCompleted(lesson) ? 1 : 0, remaining:lessonVideoCompleted(lesson) ? 0 : 1 };
  const parts = videoParts(lesson);
  const done = parts.filter(part => part.videos.some(video => state.videoPlayer.watched[video.id])).length;
  return { total:parts.length, done, remaining:Math.max(0, parts.length-done) };
}
function videoCountRing(lesson) {
  const progress = videoLessonProgress(lesson);
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const label = progress.remaining ? String(progress.remaining) : '✓';
  const title = progress.remaining
    ? `${progress.remaining} ${progress.remaining===1?'aula pendente':'aulas pendentes'} de ${progress.total}`
    : `${progress.total} ${progress.total===1?'aula concluída':'aulas concluídas'}`;
  return `<span class="video-count-ring" style="--video-progress:${percent}%" title="${escapeAttr(title)}"><span>${label}</span></span>`;
}
function renderVideoFlashcardEditor(source, lesson, schedule) {
  if(!source) return '';
  const cards = Array.isArray(state.videoFlashcards?.[source.id]) ? state.videoFlashcards[source.id] : [];
  const topic = videoContentLabel(source);
  return `<div class="flashcard-editor video-flashcards"><div class="section-title"><div><h3>Flashcards deste vídeo</h3><div class="muted">Crie somente o que merece voltar na revisão.</div></div><button class="icon-btn primary" id="addVideoFlashcard" ${cards.length>=2?'disabled':''}>+ Flashcard</button></div>${cards.length ? `<div class="flashcard-editor-list">${cards.map(card=>`<div class="flashcard-editor-item"><textarea class="textarea" data-video-card="${escapeAttr(source.id)}" data-card-id="${escapeAttr(card.id)}" data-card-field="front" placeholder="Frente: pergunta ou conceito">${escapeHtml(card.front || '')}</textarea><textarea class="textarea" data-video-card="${escapeAttr(source.id)}" data-card-id="${escapeAttr(card.id)}" data-card-field="back" placeholder="Verso: resposta curta">${escapeHtml(card.back || '')}</textarea><button class="tiny-btn" data-remove-video-card="${escapeAttr(source.id)}" data-card-id="${escapeAttr(card.id)}" title="Remover flashcard">×</button></div>`).join('')}</div>` : '<div class="empty">Até dois flashcards curtos para este vídeo.</div>'}<div class="topic-source">${cards.length}/2 flashcards · ${escapeHtml(schedule?.topic || lesson?.title || topic)} · ${escapeHtml(topic)}</div></div>`;
}
function addVideoFlashcard(source, lesson, schedule) {
  const cards = Array.isArray(state.videoFlashcards[source.id]) ? state.videoFlashcards[source.id] : [];
  if(cards.length >= 2) return;
  cards.push({ id:`video-card-${Date.now()}`, front:'', back:'', scheduleId:schedule?.id || '', block:schedule?.block || lesson?.block || '', area:schedule?.area || lesson?.area || 'Sem área', subarea:videoContentLabel(source), topic:schedule?.topic || lesson?.title || videoContentLabel(source), createdAt:new Date().toISOString() });
  state.videoFlashcards[source.id] = cards;
  renderCache.manualCards = null;
  persist();
}
function updateVideoFlashcard(input) {
  const cards = state.videoFlashcards?.[input.dataset.videoCard] || [];
  const card = cards.find(item => item.id === input.dataset.cardId);
  if(!card) return;
  card[input.dataset.cardField] = input.value;
  renderCache.manualCards = null;
  saveStateOnly();
}
function removeVideoFlashcard(videoId, cardId) {
  state.videoFlashcards[videoId] = (state.videoFlashcards[videoId] || []).filter(card => card.id !== cardId);
  delete state.flashcardProgress[cardId];
  delete ui.revealedCards[cardId];
  renderCache.manualCards = null;
  persist();
}
function videoLessonsForSchedule(item) {
  if(!item) return [];
  if(renderCache.videoLessons.has(item.id)) return renderCache.videoLessons.get(item.id);
  const lessons = displayVideoLessons().filter(lesson => lesson.scheduleId === item.id);
  renderCache.videoLessons.set(item.id, lessons);
  return lessons;
}
function videoSourcesForSchedule(item) {
  return videoLessonsForSchedule(item).flatMap(lesson => lesson.videos || []);
}
function plannedVideoCountForSchedule(item) {
  return videoLessonsForSchedule(item).filter(lesson => lesson.videos?.length).reduce((total, lesson) => total + (videoSummaryExpressVideos(lesson).length ? 1 : Math.max(1, videoParts(lesson).length)), 0);
}
function scheduleVideoCompleted(item) {
  const lessons = videoLessonsForSchedule(item);
  return lessons.length > 0 && lessons.every(lesson => lessonVideoCompleted(lesson));
}
function setVideoWatchedState(videoId, watched) {
  if(!videoId) return;
  const wasWatched = Boolean(state.videoPlayer.watched[videoId]);
  if(watched && !wasWatched) {
    const completedAt = new Date().toISOString();
    const date = completedAt.slice(0, 10);
    state.videoPlayer.watched[videoId] = true;
    state.videoPlayer.watchedAt[videoId] = completedAt;
    const log = getDayLog(date);
    log.videosOn = true;
    log.videos = n(log.videos) + 1;
    return;
  }
  if(!watched && wasWatched) {
    const completedDate = String(state.videoPlayer.watchedAt[videoId] || '').slice(0, 10);
    delete state.videoPlayer.watched[videoId];
    delete state.videoPlayer.watchedAt[videoId];
    if(completedDate) {
      const log = getDayLog(completedDate);
      log.videos = Math.max(0, n(log.videos) - 1);
      log.videosOn = n(log.videos) > 0 || n(log.lessonMinutes) > 0;
    }
  }
}
function setScheduleVideosWatched(scheduleId, watched) {
  const item = state.schedule.find(entry => entry.id === scheduleId);
  if(!item) return;
  videoLessonsForSchedule(item).forEach(lesson => {
    videoParts(lesson).forEach(part => {
      if(watched) {
        const preferred = part.videos.find(video => video.type === 'complete') || part.videos[0];
        if(preferred) setVideoWatchedState(preferred.id, true);
      } else {
        part.videos.forEach(video => setVideoWatchedState(video.id, false));
      }
    });
  });
  saveStateOnly();
  render();
}
function videoLessonSort(a, b) {
  const scheduleA = videoScheduleForLesson(a);
  const scheduleB = videoScheduleForLesson(b);
  if(Boolean(scheduleA) !== Boolean(scheduleB)) return scheduleA ? -1 : 1;
  if(scheduleA && scheduleB) return n(scheduleA.block)-n(scheduleB.block) || n(scheduleA.lessonOrder)-n(scheduleB.lessonOrder) || a.title.localeCompare(b.title, 'pt-BR');
  return n(a.block)-n(b.block) || a.area.localeCompare(b.area, 'pt-BR') || a.title.localeCompare(b.title, 'pt-BR');
}
function visibleVideoLessons() {
  const query = normalizedTopic(ui.videoSearch || '');
  return displayVideoLessons().filter(lesson => {
    const matchesBlock = !ui.videoBlock || ui.videoBlock === 'Todos' || String(lesson.block) === String(ui.videoBlock);
    const haystack = normalizedTopic(`${lesson.title} ${lesson.area} ${lesson.videos.map(video => video.title).join(' ')}`);
    return matchesBlock && (!query || haystack.includes(query));
  }).sort(videoLessonSort);
}
function openVideosForSchedule(scheduleId) {
  const item = state.schedule.find(row => row.id === scheduleId);
  const lessons = videoLessonsForSchedule(item);
  if(!lessons.length) { alert('Ainda não há vídeo local vinculado a esta aula.'); return; }
  const playableLessons = lessons.filter(lesson => lesson.videos?.length);
  if(!playableLessons.length) {
    ui.videoBlock = String(lessons[0].block);
    ui.videoSearch = '';
    ui.videoLessonId = lessons[0].id;
    ui.videoSourceId = '';
    ui.tab = 'aulas';
    render();
    return;
  }
  const lesson = playableLessons.find(entry => !lessonVideoCompleted(entry)) || playableLessons[0];
  const nextPart = videoParts(lesson).find(part => !part.videos.some(video => state.videoPlayer.watched[video.id])) || videoParts(lesson)[0];
  const nextSource = nextPart.videos.find(video => !state.videoPlayer.watched[video.id]) || nextPart.videos[0];
  ui.videoBlock = String(lesson.block);
  ui.videoSearch = '';
  ui.videoLessonId = lesson.id;
  ui.videoSourceId = nextSource.id;
  ui.tab = 'aulas';
  render();
}
function openDayVideos(date) {
  const lessons = state.schedule.filter(item => item.date === date).sort(byDate);
  const next = lessons.find(item => videoSourcesForSchedule(item).some(video => !state.videoPlayer.watched[video.id])) || lessons.find(item => videoSourcesForSchedule(item).length);
  if(next) openVideosForSchedule(next.id);
  else { ui.tab='aulas'; ui.videoBlock=String(currentScheduleBlock()); render(); }
}
function markAwaitingScheduleVideosWatched() {
  const version = 'awaiting-schedule-videos-2026-07-11-v2';
  if(state.videoPlayer.scheduleWatchVersion === version) return 0;
  let count = 0;
  state.schedule.filter(item => statusOf(item) === 'Aguardando').forEach(item => {
    videoLessonsForSchedule(item).forEach(lesson => {
      videoParts(lesson).forEach(part => {
      const video = part.videos.find(entry => entry.type === 'complete') || part.videos[0];
      if(!video) return;
      if(!state.videoPlayer.watched[video.id]) { state.videoPlayer.watched[video.id] = true; count += 1; }
      });
    });
  });
  state.videoPlayer.scheduleWatchVersion = version;
  if(count) saveStateOnly();
  return count;
}
function markCompletedLessonsThroughBlockNine() {
  const version = 'watched-lessons-through-block-09-2026-07-13-v1';
  if(state.videoPlayer.completedLessonMigration === version) return 0;
  const pendingTopics = ['amenorreias', 'sindrome dos ovarios policisticos', 'disturbios do sodio e potassio', 'gasometria arterial'];
  let count = 0;
  videoCatalog.filter(lesson => n(lesson.block) >= 1 && n(lesson.block) <= 9).forEach(lesson => {
    const title = normalizedTopic(lesson.title);
    if(pendingTopics.some(topic => title.includes(topic)) || (title.includes('disturbios') && title.includes('sodio') && title.includes('potassio'))) return;
    videoParts(lesson).forEach(part => {
      const preferred = part.videos.find(video => video.type === 'complete') || part.videos[0];
      if(preferred && !state.videoPlayer.watched[preferred.id]) {
        state.videoPlayer.watched[preferred.id] = true;
        count += 1;
      }
    });
  });
  state.videoPlayer.completedLessonMigration = version;
  saveStateOnly();
  return count;
}
function currentVideoLesson() {
  const pinned = state.videoPlayer?.pinned;
  if(pinned?.enabled) {
    const pinnedLesson = displayVideoLessons().find(lesson => lesson.id === pinned.lessonId);
    if(pinnedLesson) {
      ui.videoLessonId = pinnedLesson.id;
      ui.videoSourceId = pinnedLesson.videos.some(video => video.id === pinned.sourceId) ? pinned.sourceId : pinnedLesson.videos[0]?.id || '';
      return pinnedLesson;
    }
  }
  const lastOpen = state.videoPlayer?.lastOpen;
  if(!ui.videoLessonId && lastOpen?.lessonId) {
    const rememberedLesson = displayVideoLessons().find(lesson => lesson.id === lastOpen.lessonId);
    if(rememberedLesson) {
      ui.videoLessonId = rememberedLesson.id;
      ui.videoSourceId = rememberedLesson.videos.some(video => video.id === lastOpen.sourceId) ? lastOpen.sourceId : rememberedLesson.videos[0]?.id || '';
      return rememberedLesson;
    }
  }
  const visible = visibleVideoLessons();
  if(!visible.length) return null;
  if(!visible.some(lesson => lesson.id === ui.videoLessonId)) ui.videoLessonId = visible[0].id;
  return displayVideoLessons().find(lesson => lesson.id === ui.videoLessonId) || visible[0];
}
function currentVideoSource(lesson) {
  if(!lesson?.videos?.length) return null;
  if(!lesson.videos.some(video => video.id === ui.videoSourceId)) ui.videoSourceId = lesson.videos[0].id;
  return lesson.videos.find(video => video.id === ui.videoSourceId) || lesson.videos[0];
}
function saveOpenVideoPosition() {
  const video = document.getElementById('lessonVideo');
  const sourceId = ui.videoSourceId;
  if(!video || !sourceId) return;
  state.videoPlayer.resume[sourceId] = Math.floor(video.currentTime || 0);
  state.videoPlayer.lastOpen = { lessonId:ui.videoLessonId || '', sourceId };
  saveStateOnly();
}
function togglePinnedVideo(lesson, source) {
  if(!lesson || !source) return;
  const pinned = state.videoPlayer.pinned || {};
  if(pinned.enabled && pinned.lessonId === lesson.id && pinned.sourceId === source.id) {
    state.videoPlayer.pinned = { enabled:false, lessonId:'', sourceId:'' };
  } else {
    saveOpenVideoPosition();
    state.videoPlayer.pinned = { enabled:true, lessonId:lesson.id, sourceId:source.id };
  }
  saveStateOnly();
  renderAulas();
}
function renderAulas() {
  stopAutoStudy('questions');
  const mount = document.getElementById('aulas');
  if(!videoCatalog.length) {
    mount.innerHTML = `<div class="card video-empty"><div><strong>${escapeHtml(videoCatalogStatus)}</strong><div>Abra o planner pelo atalho offline para localizar os vídeos.</div></div></div>`;
    return;
  }
  const catalogLessons = displayVideoLessons();
  const blocks = [...new Set(catalogLessons.map(lesson => lesson.block))].sort((a,b)=>a-b);
  const visible = visibleVideoLessons();
  const lesson = currentVideoLesson();
  const source = currentVideoSource(lesson);
  const schedule = lesson ? videoScheduleForLesson(lesson) : null;
  const parts = lesson ? videoParts(lesson) : [];
  const summaryExpress = lesson ? videoSummaryExpressVideos(lesson) : [];
  const bookmarks = source ? (state.videoPlayer.bookmarks[source.id] || []) : [];
  const resume = source ? n(state.videoPlayer.resume[source.id]) : 0;
  const watched = source ? state.videoPlayer.watched[source.id] : false;
  const usingR2 = usesR2VideoSource();
  mount.innerHTML = `<div class="video-layout ${ui.videoFocusMode?'video-focus-mode':''}"><aside class="card video-sidebar"><div class="section-title"><div><h2>Videoaulas</h2><div class="muted">${catalogLessons.length} aulas locais · ordem do cronograma</div></div><span class="badge today">offline</span></div><div class="video-filter"><select class="select" id="videoBlock" aria-label="Filtrar bloco"><option value="Todos">Blocos</option>${blocks.map(block => `<option value="${block}" ${String(ui.videoBlock)===String(block)?'selected':''}>B${String(block).padStart(2,'0')}</option>`).join('')}</select><input class="input" id="videoSearch" value="${escapeAttr(ui.videoSearch || '')}" placeholder="Buscar aula ou tema"></div><div class="video-lesson-list">${visible.map(item => { const hasExpress=item.videos.some(video=>video.type==='express'); const linked=videoScheduleForLesson(item); const done=lessonVideoCompleted(item); return `<button class="video-lesson-choice ${item.id===lesson?.id?'active':''}" data-video-lesson="${escapeAttr(item.id)}"><span class="video-priority-bar ${priorityClass(linked?.priority)}"></span><span><strong>${escapeHtml(lessonDisplayTitle(linked, item.title))}</strong><small>B${String(item.block).padStart(2,'0')} · ${escapeHtml(item.area)}${linked ? ` · ${fmtDate(linked.date)}` : ''}</small></span><span class="video-lesson-state">${lessonWatchedOnlyByCofexpress(item)?'<span class="video-cof-marker" title="Assistida apenas pelo COFEXPRESS">COF</span>':''}<span class="badge ${done?'done':hasExpress?'today':'wait'}">${done?'✓':item.videos.length}</span></span></button>`; }).join('') || '<div class="empty">Nenhuma aula encontrada.</div>'}</div></aside><section class="card video-player-card">${!lesson || !source ? '<div class="video-empty">Escolha uma aula no painel ao lado.</div>' : `<div class="video-reader-head"><div><h2>${escapeHtml(lessonDisplayTitle(schedule, lesson.title))}</h2><div class="muted">Bloco ${lesson.block} · ${escapeHtml(lesson.area)}${schedule ? ` · ${lesson.videos.length} ${lesson.videos.length===1?'vídeo disponível':'vídeos disponíveis'}` : ''}</div></div><button class="tiny-btn video-focus-toggle" id="toggleVideoFocus" type="button" aria-pressed="${ui.videoFocusMode}" title="${ui.videoFocusMode?'Voltar ao layout completo':'Expandir o vídeo e manter os pontos importantes'}">${ui.videoFocusMode?'Sair do foco':'⛶ Foco'}</button><span class="badge today" data-auto-study-clock>Tempo pausado</span><span class="badge ${lessonVideoCompleted(lesson)?'done':'today'}">${lessonVideoCompleted(lesson)?'assistida':'em estudo'}</span></div><div class="video-tabs">${parts.map(part => `<div class="video-part">${parts.length>1 || part.number ? `<span class="video-part-label">${escapeHtml(part.label)}</span>` : ''}${part.videos.map(video => `<button class="video-tab ${video.id===source.id?'active':''}" data-video-source="${escapeAttr(video.id)}">${video.type==='express'?'COFEXPRESS':'Aula completa'}</button>`).join('')}</div>`).join('')}</div><video class="video-player" id="lessonVideo" controls preload="metadata" src="${escapeAttr(videoAssetUrl(source))}">Seu navegador não conseguiu abrir este vídeo local.</video><div class="video-controls"><button class="tiny-btn" id="videoBack10" title="Voltar 10 segundos">↶ 10 s</button><button class="tiny-btn" id="videoForward10" title="Avançar 10 segundos">10 s ↷</button><select class="select playback-rate" id="videoPlaybackRate" aria-label="Velocidade">${[0.75,1,1.25,1.5,1.75,2].map(rate => `<option value="${rate}" ${rate===1?'selected':''}>${String(rate).replace('.',',')}x</option>`).join('')}</select><button class="tiny-btn" id="videoMarkWatched">${watched?'Desmarcar assistida':'Marcar assistida'}</button>${schedule ? `<button class="tiny-btn" data-video-materials="${escapeAttr(schedule.id)}">Material da aula</button>` : ''}${lessonVideoCompleted(lesson) && schedule ? `<button class="tiny-btn" data-video-questions="${escapeAttr(schedule.id)}">Questões do assunto →</button>` : ''}<span class="muted">${resume ? `Retomar em ${formatVideoTime(resume)}` : 'Progresso salvo neste computador'}</span></div><div class="video-bookmarks"><div class="section-title"><div><h3>Pontos importantes</h3><div class="muted">Salve trechos como tratamento, diagnóstico ou conduta.</div></div></div><div class="video-bookmark-form"><span class="badge today" id="videoBookmarkTime">${formatVideoTime(resume)}</span><input class="input" id="videoBookmarkLabel" placeholder="Ex.: tratamento de primeira linha"><button class="icon-btn primary" id="addVideoBookmark">Salvar ponto</button></div><div class="video-bookmark-list">${bookmarks.map((bookmark, index) => `<div class="video-bookmark"><button type="button" data-video-seek="${bookmark.time}" title="Ir para este trecho">${formatVideoTime(bookmark.time)}</button><span>${escapeHtml(bookmark.label || 'Ponto importante')}</span><button class="delete-bookmark" data-video-bookmark-delete="${index}" title="Excluir ponto">×</button></div>`).join('') || '<div class="muted" style="margin-top:10px">Ainda não há pontos salvos nesta aula.</div>'}</div></div>${renderVideoFlashcardEditor(source, lesson, schedule)}`}</section></div>`;
  const sourceSwitch=document.createElement('div');
  sourceSwitch.className='video-source-switch';
  sourceSwitch.setAttribute('role','group');
  sourceSwitch.setAttribute('aria-label','Fonte das videoaulas');
  sourceSwitch.innerHTML=`<span>Fonte</span><button type="button" data-video-source-mode="local" class="${usingR2?'':'active'}" title="${isLocalPlanner()?'Usar os vídeos deste computador':'Abrir a versão local do planner'}">PC offline</button><button type="button" data-video-source-mode="online" class="${usingR2?'active':''}" title="Usar os vídeos disponíveis no R2">R2 online</button>`;
  mount.querySelector('.video-filter')?.append(sourceSwitch);
  const sourceBadge=mount.querySelector('.video-sidebar .section-title .badge');
  if(sourceBadge) {
    sourceBadge.textContent=usingR2?'R2 online':'PC offline';
    sourceBadge.className=`badge ${usingR2?'today':'done'}`;
  }
  mount.querySelectorAll('[data-video-source-mode]').forEach(button => button.onclick = event => {
    const mode=event.currentTarget.dataset.videoSourceMode;
    saveOpenVideoPosition();
    if(mode === 'local' && !isLocalPlanner()) {
      window.location.href=LOCAL_PLANNER_URL;
      return;
    }
    ui.videoSourceMode=mode;
    localStorage.setItem(VIDEO_SOURCE_KEY, mode);
    if(mode === 'online') pushCloudState();
    renderAulas();
  });
  const videoTitle = mount.querySelector('.video-reader-head h2');
  if(videoTitle) {
    const titleText = videoTitle.textContent.trim();
    videoTitle.classList.add('video-title-ticker');
    videoTitle.style.setProperty('--ticker-duration', `${Math.max(14, Math.min(34, titleText.length / 3))}s`);
    videoTitle.innerHTML = `<span class="video-title-track"><span>${escapeHtml(titleText)}</span><span aria-hidden="true">${escapeHtml(titleText)}</span></span>`;
  }
  if(lesson && !source) {
    const playerCard = mount.querySelector('.video-player-card');
    if(playerCard) playerCard.innerHTML = `<div class="video-empty"><div><h2>${escapeHtml(schedule?.topic || lesson.title)}</h2><div class="muted">Bloco ${lesson.block} · ${escapeHtml(schedule?.area || lesson.area)}</div><p>Ainda não há vídeo local para esta aula.</p></div></div>`;
  }
  document.querySelectorAll('[data-video-lesson]').forEach(button => {
    const listedLesson = visible.find(item => item.id === button.dataset.videoLesson);
    const badge = button.querySelector('.badge');
    if(listedLesson && badge) badge.outerHTML = listedLesson.videos?.length ? videoCountRing(listedLesson) : '<span class="badge wait">sem vídeo</span>';
  });
  const videoTabs = mount.querySelector('.video-tabs');
  if(videoTabs && summaryExpress.length) {
    const summary = document.createElement('div');
    summary.className = 'video-part video-summary-express';
    summary.innerHTML = `<span class="video-part-label">Revisão geral</span>${summaryExpress.map(video => `<button class="video-tab ${video.id===source?.id?'active':''}" data-video-source="${escapeAttr(video.id)}">COFEXPRESS</button>`).join('')}`;
    videoTabs.append(summary);
  }
  if(videoTabs && lesson) {
    videoTabs.querySelectorAll('[data-video-source]').forEach(button => {
      const listedVideo = lesson.videos.find(video => video.id === button.dataset.videoSource);
      if(!listedVideo) return;
      const kind = listedVideo.type === 'express' ? 'COFEXPRESS' : 'Aula completa';
      const assisted = state.videoPlayer.watched[listedVideo.id] ? '<span class="video-playlist-watched">Assistida</span>' : '';
      button.innerHTML = `<span class="video-playlist-kind">${kind}${assisted}</span><strong>${escapeHtml(videoContentLabel(listedVideo))}</strong>`;
      button.title = `${kind}: ${videoContentLabel(listedVideo)}`;
    });
  }
  document.querySelectorAll('[data-video-seek]').forEach((button, index) => {
    const timeInput = document.createElement('input');
    timeInput.className = 'video-bookmark-time';
    timeInput.type = 'text';
    timeInput.inputMode = 'numeric';
    timeInput.value = formatVideoTime(bookmarks[index]?.time || 0);
    timeInput.dataset.videoBookmarkTime = String(index);
    timeInput.title = 'Editar tempo do ponto';
    timeInput.setAttribute('aria-label', 'Tempo do ponto');
    button.insertAdjacentElement('afterend', timeInput);
  });
  const blockInput = document.getElementById('videoBlock');
  if(blockInput) blockInput.onchange = event => { ui.videoBlock=event.target.value; ui.videoLessonId=''; ui.videoSourceId=''; renderAulas(); };
  const searchInput = document.getElementById('videoSearch');
  if(searchInput) searchInput.oninput = debounce(event => {
    const value=event.target.value;
    const cursor=event.target.selectionStart;
    ui.videoSearch=value;
    ui.videoLessonId='';
    ui.videoSourceId='';
    renderAulas();
    requestAnimationFrame(() => { const input=document.getElementById('videoSearch'); if(input) { input.focus(); input.setSelectionRange(cursor,cursor); } });
  }, 220);
  document.querySelectorAll('[data-video-lesson]').forEach(button => button.onclick = event => {
    stopAutoStudy('video');
    saveOpenVideoPosition();
    ui.videoLessonId=event.currentTarget.dataset.videoLesson;
    const selectedLesson=displayVideoLessons().find(item => item.id===ui.videoLessonId);
    if(selectedLesson) ui.videoBlock=String(selectedLesson.block);
    ui.videoSearch='';
    ui.videoSourceId='';
    state.videoPlayer.lastOpen={lessonId:ui.videoLessonId,sourceId:''};
    saveStateOnly();
    renderAulas();
  });
  document.querySelectorAll('[data-video-source]').forEach(button => button.onclick = event => { stopAutoStudy('video'); saveOpenVideoPosition(); ui.videoSourceId=event.currentTarget.dataset.videoSource; state.videoPlayer.lastOpen={lessonId:ui.videoLessonId,sourceId:ui.videoSourceId}; saveStateOnly(); renderAulas(); });
  document.getElementById('toggleVideoFocus')?.addEventListener('click', () => {
    saveOpenVideoPosition();
    ui.videoFocusMode = !ui.videoFocusMode;
    localStorage.setItem(VIDEO_FOCUS_KEY, ui.videoFocusMode ? '1' : '0');
    renderAulas();
  });
  document.querySelectorAll('[data-video-questions]').forEach(button => button.onclick = event => openQuestionsForSchedule(event.currentTarget.dataset.videoQuestions));
  document.querySelectorAll('[data-video-materials]').forEach(button => button.onclick = event => openMaterialsForSchedule(event.currentTarget.dataset.videoMaterials));
  bindVideoPlayer(source, schedule, lesson);
  const watchedButton = document.getElementById('videoMarkWatched');
  if(watchedButton && lesson && source) {
    const pinButton = document.createElement('button');
    const pinned = state.videoPlayer.pinned || {};
    pinButton.className = 'tiny-btn';
    pinButton.id = 'toggleVideoPin';
    pinButton.textContent = pinned.enabled && pinned.lessonId === lesson.id && pinned.sourceId === source.id ? 'Desfixar vídeo' : 'Fixar vídeo';
    pinButton.title = 'Manter este vídeo aberto ao voltar para a aba';
    pinButton.onclick = () => togglePinnedVideo(lesson, source);
    watchedButton.insertAdjacentElement('afterend', pinButton);
  }
  const addVideoCard = document.getElementById('addVideoFlashcard');
  if(addVideoCard) addVideoCard.onclick = () => addVideoFlashcard(source, lesson, schedule);
  document.querySelectorAll('[data-video-card][data-card-id][data-card-field]').forEach(input => {
    input.oninput = event => updateVideoFlashcard(event.currentTarget);
    input.onchange = event => updateVideoFlashcard(event.currentTarget);
  });
  document.querySelectorAll('[data-remove-video-card]').forEach(button => button.onclick = event => removeVideoFlashcard(event.currentTarget.dataset.removeVideoCard, event.currentTarget.dataset.cardId));
}
function nextCompleteVideoSource(lesson, source) {
  if(!lesson || source?.type !== 'complete') return null;
  const completeVideos = videoParts(lesson).flatMap(part => part.videos.filter(video => video.type === 'complete'));
  if(completeVideos.length < 2) return null;
  const currentIndex = completeVideos.findIndex(video => video.id === source.id);
  if(currentIndex < 0) return null;
  return completeVideos.slice(currentIndex + 1).find(video => !state.videoPlayer.watched[video.id]) || null;
}
function showVideoContinuationPrompt(lesson, completedSource, nextSource) {
  const host = document.getElementById('aulas');
  if(!host || !lesson || !nextSource) return;
  host.querySelector('.video-continuation-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'video-continuation-overlay';
  overlay.innerHTML = `<div class="video-continuation-dialog" role="dialog" aria-modal="true" aria-labelledby="videoContinuationTitle"><span class="video-continuation-icon">✓</span><div><span class="eyebrow">Parte concluída</span><h2 id="videoContinuationTitle">Quer continuar nesta aula?</h2><p>Você terminou <strong>${escapeHtml(videoContentLabel(completedSource))}</strong>. A próxima é <strong>${escapeHtml(videoContentLabel(nextSource))}</strong>.</p></div><div class="video-continuation-actions"><button class="icon-btn" data-video-continuation="pause">Dar uma pausa</button><button class="icon-btn primary" data-video-continuation="next">Ir para a próxima</button></div></div>`;
  host.append(overlay);
  const pauseButton = overlay.querySelector('[data-video-continuation="pause"]');
  const nextButton = overlay.querySelector('[data-video-continuation="next"]');
  pauseButton.onclick = () => overlay.remove();
  nextButton.onclick = () => {
    ui.videoLessonId = lesson.id;
    ui.videoSourceId = nextSource.id;
    state.videoPlayer.lastOpen = { lessonId:lesson.id, sourceId:nextSource.id };
    saveStateOnly();
    renderAulas();
    requestAnimationFrame(() => {
      const nextVideo = document.getElementById('lessonVideo');
      nextVideo?.play().catch(() => {});
    });
  };
  nextButton.focus();
}
function bindVideoPlayer(source, schedule, lesson) {
  if(!source) return;
  const video = document.getElementById('lessonVideo');
  if(!video) return;
  let resume = n(state.videoPlayer.resume[source.id]);
  let lastCheckpoint = Math.floor(resume);
  let restoringPosition = false;
  let manualSeek = false;
  let restoringRate = false;
  const applyPreferredRate = () => {
    const rate = rememberVideoPlaybackRate(n(ui.videoPlaybackRate) || 1);
    if(Math.abs(video.playbackRate-rate) < .01) return;
    restoringRate = true;
    video.defaultPlaybackRate = rate;
    video.playbackRate = rate;
    setTimeout(() => { restoringRate=false; }, 0);
  };
  const setVideoTime = seconds => {
    const safeTarget = Math.max(0, Math.min(Number(seconds) || 0, Number.isFinite(video.duration) ? Math.max(0, video.duration - .1) : Number(seconds) || 0));
    restoringPosition = true;
    video.currentTime = safeTarget;
    setTimeout(() => { restoringPosition = false; }, 60);
    return safeTarget;
  };
  video.addEventListener('seeking', () => { if(!restoringPosition) manualSeek = true; });
  const applyResume = () => {
    if(!manualSeek && resume > 0 && resume < (video.duration || Infinity) - .1) setVideoTime(resume);
  };
  video.addEventListener('loadedmetadata', applyResume, {once:true});
  video.addEventListener('loadedmetadata', applyPreferredRate);
  video.addEventListener('canplay', applyPreferredRate);
  video.addEventListener('playing', applyPreferredRate);
  video.addEventListener('ratechange', () => {
    if(!restoringRate) rememberVideoPlaybackRate(video.playbackRate);
  });
  const saveProgress = () => { state.videoPlayer.resume[source.id] = Math.floor(video.currentTime || 0); saveStateOnly(); };
  video.addEventListener('play', () => startAutoStudy('video', schedule?.id || ''));
  video.addEventListener('pause', () => { pauseAutoStudy('video'); saveProgress(); });
  video.addEventListener('ended', () => {
    stopAutoStudy('video', false);
    state.videoPlayer.resume[source.id] = 0;
    setVideoWatchedState(source.id, true);
    const nextSource = nextCompleteVideoSource(lesson, source);
    saveStateOnly();
    renderAulas();
    if(nextSource) showVideoContinuationPrompt(lesson, source, nextSource);
  });
  video.addEventListener('timeupdate', () => {
    const currentSecond = Math.floor(video.currentTime || 0);
    const stamp=document.getElementById('videoBookmarkTime');
    if(stamp) stamp.textContent=formatVideoTime(currentSecond);
    const chapterButtons = [...document.querySelectorAll('[data-video-seek]')];
    let activeChapter = -1;
    chapterButtons.forEach((button, index) => {
      if(Number(button.dataset.videoSeek) <= currentSecond) activeChapter = index;
    });
    chapterButtons.forEach((button, index) => button.closest('.video-bookmark')?.classList.toggle('active', index === activeChapter));
    if(currentSecond >= lastCheckpoint + 10) {
      lastCheckpoint = currentSecond;
      state.videoPlayer.resume[source.id] = currentSecond;
      state.videoPlayer.lastOpen = { lessonId:ui.videoLessonId || '', sourceId:source.id };
      saveStateOnly();
    }
  });
  document.getElementById('videoBack10')?.addEventListener('click', () => { manualSeek=true; resume=setVideoTime(video.currentTime-10); state.videoPlayer.resume[source.id]=Math.floor(resume); saveStateOnly(); });
  document.getElementById('videoForward10')?.addEventListener('click', () => { manualSeek=true; resume=setVideoTime(video.currentTime+10); state.videoPlayer.resume[source.id]=Math.floor(resume); saveStateOnly(); });
  const rateSelect = document.getElementById('videoPlaybackRate');
  if(rateSelect) {
    rateSelect.value = String(rememberVideoPlaybackRate(n(ui.videoPlaybackRate) || 1));
    rateSelect.addEventListener('change', event => {
      const rate = rememberVideoPlaybackRate(Number(event.target.value));
      video.defaultPlaybackRate=rate;
      video.playbackRate=rate;
    });
  }
  document.getElementById('videoMarkWatched')?.addEventListener('click', () => { setVideoWatchedState(source.id, !state.videoPlayer.watched[source.id]); saveStateOnly(); renderAulas(); });
  document.getElementById('addVideoBookmark')?.addEventListener('click', () => {
    const label = document.getElementById('videoBookmarkLabel').value.trim();
    if(!label) { document.getElementById('videoBookmarkLabel').focus(); return; }
    const entries = state.videoPlayer.bookmarks[source.id] || [];
    entries.push({time:Math.floor(video.currentTime || 0),label});
    state.videoPlayer.bookmarks[source.id] = entries.sort((a,b)=>a.time-b.time);
    saveStateOnly(); renderAulas();
  });
  const seekToBookmark = seconds => {
    const target = Math.max(0, Number(seconds) || 0);
    // O ponto salvo passa a ser também a retomada. Assim o navegador não volta ao início
    // se recarregar os metadados do MP4 durante a busca.
    manualSeek = true;
    resume = target;
    state.videoPlayer.resume[source.id] = Math.floor(target);
    saveStateOnly();
    const seek = () => {
      const safeTarget = Math.min(target, Number.isFinite(video.duration) ? Math.max(0, video.duration - .1) : target);
      if(!Number.isFinite(safeTarget)) return;
      setVideoTime(safeTarget);
      // Alguns navegadores locais aplicam a primeira busca antes de estabilizar o MP4.
      setTimeout(() => { if(Math.abs((video.currentTime || 0) - safeTarget) > 1) setVideoTime(safeTarget); }, 180);
      setTimeout(() => { if(Math.abs((video.currentTime || 0) - safeTarget) > 1) setVideoTime(safeTarget); }, 700);
      const stamp = document.getElementById('videoBookmarkTime');
      if(stamp) stamp.textContent = formatVideoTime(safeTarget);
    };
    if(video.readyState < 2 || !video.seekable.length) {
      video.addEventListener('canplay', seek, { once:true });
      video.addEventListener('loadeddata', seek, { once:true });
    } else seek();
  };
  document.querySelectorAll('[data-video-seek]').forEach(button => button.onclick = event => { event.preventDefault(); event.stopPropagation(); seekToBookmark(event.currentTarget.dataset.videoSeek); });
  document.querySelectorAll('[data-video-bookmark-time]').forEach(input => {
    const saveBookmarkTime = () => {
      const entries = state.videoPlayer.bookmarks[source.id] || [];
      const index = Number(input.dataset.videoBookmarkTime);
      const bookmark = entries[index];
      const parsed = parseVideoTime(input.value);
      if(!bookmark || parsed === null || parsed < 0) {
        input.value = formatVideoTime(bookmark?.time || 0);
        return;
      }
      bookmark.time = Math.floor(Number.isFinite(video.duration) ? Math.min(parsed, Math.max(0, video.duration - .1)) : parsed);
      state.videoPlayer.bookmarks[source.id] = entries.sort((a,b) => a.time-b.time);
      saveStateOnly();
      renderAulas();
    };
    input.onchange = saveBookmarkTime;
    input.onkeydown = event => { if(event.key === 'Enter') { event.preventDefault(); input.blur(); } };
  });
  document.querySelectorAll('.video-bookmark').forEach(row => {
    const label = row.querySelector(':scope > span');
    const deleteButton = row.querySelector('[data-video-bookmark-delete]');
    if(!label || !deleteButton || row.querySelector('[data-video-bookmark-edit]')) return;
    label.classList.add('video-bookmark-label');
    const editButton = document.createElement('button');
    editButton.className = 'edit-bookmark';
    editButton.dataset.videoBookmarkEdit = deleteButton.dataset.videoBookmarkDelete;
    editButton.title = 'Editar nome do ponto';
    editButton.textContent = '⚙';
    deleteButton.insertAdjacentElement('beforebegin', editButton);
  });
  document.querySelectorAll('[data-video-bookmark-edit]').forEach(button => button.onclick = event => {
    const index = Number(event.currentTarget.dataset.videoBookmarkEdit);
    const entry = state.videoPlayer.bookmarks[source.id]?.[index];
    const row = event.currentTarget.closest('.video-bookmark');
    if(!entry || !row) return;
    const label = row.querySelector('.video-bookmark-label');
    if(!label) return;
    if(row.dataset.editing === '1') {
      const input = row.querySelector('.video-bookmark-label-input');
      entry.label = input?.value.trim() || 'Ponto importante';
      saveStateOnly();
      renderAulas();
      return;
    }
    row.dataset.editing = '1';
    const input = document.createElement('input');
    input.className = 'input video-bookmark-label-input';
    input.value = entry.label || 'Ponto importante';
    input.setAttribute('aria-label', 'Nome do ponto importante');
    label.replaceWith(input);
    event.currentTarget.textContent = '✓';
    event.currentTarget.title = 'Salvar nome do ponto';
    input.focus();
    input.select();
    input.onkeydown = keyEvent => { if(keyEvent.key === 'Enter') event.currentTarget.click(); };
  });
  document.querySelectorAll('[data-video-bookmark-delete]').forEach(button => button.onclick = event => { state.videoPlayer.bookmarks[source.id].splice(Number(event.currentTarget.dataset.videoBookmarkDelete),1); saveStateOnly(); renderAulas(); });
}
async function loadVideoCatalog() {
  try {
    const response = await fetch('video_library/catalog.json', {cache:'no-store'});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    videoCatalog = Array.isArray(payload.lessons) ? payload.lessons : [];
    videoCatalogStatus = `${videoCatalog.length} aulas locais disponíveis`;
    markCompletedLessonsThroughBlockNine();
  } catch(error) {
    console.warn('Catálogo de videoaulas indisponível:', error);
    videoCatalog = [];
    videoCatalogStatus = 'Não encontrei o catálogo de videoaulas locais';
  }
  if(ui.tab === 'aulas') renderAulas();
  else render();
}
function flashcardCreationAllowed(result) {
  if(!result) return false;
  if(!result.correct) return true;
  if(result.correctMode === 'Chute' || result.confidenceLevel === 'red') return true;
  const confidence = n(result.certainty) || n(result.confidence) || ({ yellow:55, green:90 }[result.confidenceLevel] || 0);
  return confidence < 90;
}
function flashcardCreationReason(result) {
  if(!result) return '';
  if(!result.correct && result.missReason === 'Dúvida / já vi') return 'Liberado porque você errou em dúvida/já vi.';
  if(!result.correct) return 'Liberado porque você errou a questão.';
  if(result.correctMode === 'Chute' || result.confidenceLevel === 'red') return 'Liberado porque o acerto foi um chute.';
  const confidence = n(result.certainty) || n(result.confidence) || ({ yellow:55, green:90 }[result.confidenceLevel] || 0);
  if(!confidence) return 'Liberado até você registrar pelo menos 90% de certeza.';
  if(confidence < 90) return `Liberado porque sua certeza foi de ${confidence}%, abaixo de 90%.`;
  return '';
}
function manualFlashcards() {
  if(renderCache.manualCards) return renderCache.manualCards;
  const questionCards = Object.entries(state.questionFlashcards || {}).flatMap(([questionId,cards]) => {
    const question = questionBank.find(item => item.id === questionId);
    const result = question ? questionResult(question) : null;
    const linked = result?.scheduleId ? state.schedule.find(item => item.id === result.scheduleId) : question ? scheduleForQuestion(question) : null;
    return (Array.isArray(cards) ? cards : []).filter(card => card.front && card.back).map(card => ({
      ...card,
      questionId,
      scheduleId: card.scheduleId || linked?.id || '',
      block: card.block || linked?.block || question?.collectionBlock || '',
      area: card.area || linked?.area || question?.area || 'Sem área',
      subarea: card.subarea || card.topic || linked?.topic || question?.topic || 'Sem subárea',
      topic: card.topic || linked?.topic || question?.topic || 'Sem aula vinculada'
    }));
  });
  const videoCards = Object.entries(state.videoFlashcards || {}).flatMap(([videoId,cards]) => (Array.isArray(cards) ? cards : []).filter(card => card.front && card.back).map(card => ({
    ...card,
    videoId,
    scheduleId: card.scheduleId || '',
    block: card.block || '',
    area: card.area || 'Sem área',
    subarea: card.subarea || card.topic || 'Sem subárea',
    topic: card.topic || 'Videoaula'
  })));
  renderCache.manualCards = [...questionCards, ...videoCards];
  return renderCache.manualCards;
}
function flashcardProgress(card) {
  const progress = state.flashcardProgress[card.id] || {};
  return {
    ease: Math.max(1.3, n(progress.ease) || 2.5),
    interval: Math.max(0, n(progress.interval) || 0),
    repetitions: Math.max(0, n(progress.repetitions) || 0),
    reviews: Math.max(0, n(progress.reviews) || 0),
    lapses: Math.max(0, n(progress.lapses) || 0),
    status: progress.status || 'Novo',
    lastReviewedAt: progress.lastReviewedAt || '',
    nextReview: progress.nextReview || localISODate(new Date())
  };
}
function isFlashcardDue(card, date=localISODate(new Date())) {
  return flashcardProgress(card).nextReview <= date;
}
function flashcardReviewsToday() {
  const today = localISODate(new Date());
  return Object.values(state.flashcardProgress || {}).filter(progress => String(progress.lastReviewedAt || '').slice(0,10) === today).length;
}
function flashcardNewToday() {
  const today = localISODate(new Date());
  return Object.values(state.flashcardProgress || {}).filter(progress => progress.firstReviewedAt && String(progress.firstReviewedAt).slice(0,10) === today).length;
}
function flashcardDueForecast(days=7) {
  const cards = manualFlashcards();
  const start = new Date(`${localISODate(new Date())}T12:00:00`);
  return Array.from({length:days}, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    const iso = localISODate(date);
    return { date: iso, count: cards.filter(card => flashcardProgress(card).nextReview <= iso).length };
  });
}
function flashcardStudyQueue(all=manualFlashcards()) {
  const today = localISODate(new Date());
  const newRemaining = Math.max(0, n(state.flashcardSettings.newLimit) - flashcardNewToday());
  const reviewRemaining = Math.max(0, n(state.flashcardSettings.reviewLimit) - flashcardReviewsToday());
  const base = filteredFlashcards(all);
  if(ui.flashcardFilter !== 'Devidos') return base;
  const reviews = base
    .filter(card => flashcardProgress(card).reviews > 0 && flashcardProgress(card).nextReview <= today)
    .sort((a,b)=>String(flashcardProgress(a).nextReview).localeCompare(String(flashcardProgress(b).nextReview)));
  const news = base.filter(card => !flashcardProgress(card).reviews);
  const buried = new Set();
  const burySiblings = cards => cards.filter(card => {
    const key = card.questionId || card.id;
    if(buried.has(key)) return false;
    buried.add(key);
    return true;
  });
  return [...burySiblings(reviews).slice(0, reviewRemaining), ...burySiblings(news).slice(0, newRemaining)];
}
function filteredFlashcards(all=manualFlashcards()) {
  const today = localISODate(new Date());
  return all.filter(card => {
    const progress = flashcardProgress(card);
    const filterOk = ui.flashcardFilter === 'Todos'
      || (ui.flashcardFilter === 'Devidos' && progress.nextReview <= today)
      || (ui.flashcardFilter === 'Novos' && !progress.reviews)
      || (ui.flashcardFilter === 'Maduros' && progress.interval >= 21)
      || (ui.flashcardFilter === 'Difíceis' && (progress.status === 'Difícil' || progress.ease < 2.2))
      || (ui.flashcardFilter === 'Suspensos' && progress.status === 'Suspenso');
    const areaOk = ui.flashcardArea === 'Todas' || card.area === ui.flashcardArea;
    const subareaOk = ui.flashcardSubarea === 'Todas' || card.subarea === ui.flashcardSubarea;
    const deckOk = !ui.flashcardDeck || `${card.area}|${card.subarea}` === ui.flashcardDeck;
    return filterOk && areaOk && subareaOk && deckOk;
  });
}
function renderFlashcards() {
  const all = manualFlashcards();
  const areas = ['Todas', ...new Set(all.map(card => card.area).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  if(!areas.includes(ui.flashcardArea)) ui.flashcardArea = 'Todas';
  const areaScoped = ui.flashcardArea === 'Todas' ? all : all.filter(card => card.area === ui.flashcardArea);
  const subareas = ['Todas', ...new Set(areaScoped.map(card => card.subarea).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  if(!subareas.includes(ui.flashcardSubarea)) ui.flashcardSubarea = 'Todas';
  const cards = flashcardStudyQueue(all);
  const today = localISODate(new Date());
  const due = all.filter(card => isFlashcardDue(card, today)).length;
  const reviewed = all.filter(card => flashcardProgress(card).reviews > 0).length;
  const mature = all.filter(card => flashcardProgress(card).interval >= 21).length;
  const reviewsToday = flashcardReviewsToday();
  const newToday = flashcardNewToday();
  const forecast = flashcardDueForecast(7);
  const decks = groupFlashcardDecks(all);
  ui.flashcardIndex = Math.max(0, Math.min(n(ui.flashcardIndex), Math.max(cards.length - 1, 0)));
  const study = cards[ui.flashcardIndex];
  const groups = groupFlashcards(cards);
  document.getElementById('flashcards').innerHTML = `<div class="grid cards">${metric('Flashcards criados', all.length, 'máximo de dois por questão')}${metric('Fila de hoje', cards.length, `${due} vencidos antes dos limites`)}${metric('Revisados hoje', reviewsToday, `${newToday} novos`) }${metric('Maduros', mature, 'intervalo de 21+ dias')}</div>
  <div class="card">
    <div class="flashcard-command">
      <div><h2>Flashcards</h2><div class="muted">Revisão do ENAMED por bloco, aula e questão. Espaço para evoluir sem sair do planner.</div></div>
      <button class="icon-btn" id="flashcardUndoBtn">Desfazer</button>
      <button class="icon-btn" id="flashcardBackupBtn">Backup JSON</button>
      <button class="icon-btn primary" id="ankiExportBtn">Exportar TSV</button>
    </div>
    <input class="hidden" id="ankiImportFile" type="file" accept=".tsv,.txt,.csv">
    <div class="flashcard-filters">
      <select class="select" id="flashcardFilter">${['Devidos','Todos','Novos','Difíceis','Maduros','Suspensos'].map(value => `<option ${ui.flashcardFilter===value?'selected':''}>${value}</option>`).join('')}</select>
      <select class="select" id="flashcardArea">${areas.map(value => `<option value="${escapeAttr(value)}" ${ui.flashcardArea===value?'selected':''}>${escapeHtml(value)}</option>`).join('')}</select>
      <select class="select" id="flashcardSubarea">${subareas.map(value => `<option value="${escapeAttr(value)}" ${ui.flashcardSubarea===value?'selected':''}>${escapeHtml(value)}</option>`).join('')}</select>
      <button class="icon-btn" id="flashcardClearDeck">Todos os baralhos</button>
    </div>
    <div class="flashcard-limits"><label>Novos/dia <input class="mini-input" id="flashcardNewLimit" type="number" min="0" step="1" value="${n(state.flashcardSettings.newLimit)}"></label><label>Revisões/dia <input class="mini-input" id="flashcardReviewLimit" type="number" min="0" step="1" value="${n(state.flashcardSettings.reviewLimit)}"></label><div class="muted">${forecast.map(item => `${fmtDate(item.date).slice(0,5)}: ${item.count}`).join(' · ')}</div></div>
  </div>
  <div class="flashcard-review-panel">
    <div class="card">${renderFlashcardStudy(study, cards)}</div>
    <aside class="card"><div class="section-title"><h2>Baralhos</h2><span class="badge today">${decks.length}</span></div><div class="flashcard-decks">${decks.map(renderFlashcardDeck).join('') || '<div class="empty">Crie flashcards nas questões para montar seus baralhos.</div>'}</div></aside>
  </div>
  <div class="card"><div class="section-title"><h2>Biblioteca filtrada</h2><button class="icon-btn" id="flashcardToggleLibrary">${ui.flashcardShowLibrary?'Ocultar':'Mostrar'} lista (${cards.length})</button></div>${ui.flashcardShowLibrary ? (groups.length ? groups.map(renderFlashcardGroup).join('') : '<div class="empty">Nenhum flashcard neste filtro. O editor aparece abaixo da questão quando você marca “Não saber” ou “Chute”.</div>') : '<div class="muted">A lista está recolhida para manter foco no cartão central.</div>'}</div>`;
  const filter = document.getElementById('flashcardFilter');
  if(filter) filter.onchange = e => { ui.flashcardFilter=e.target.value; ui.flashcardIndex=0; ui.revealedCards={}; renderFlashcards(); };
  const area = document.getElementById('flashcardArea');
  if(area) area.onchange = e => { ui.flashcardArea=e.target.value; ui.flashcardSubarea='Todas'; ui.flashcardDeck=''; ui.flashcardIndex=0; ui.revealedCards={}; renderFlashcards(); };
  const subarea = document.getElementById('flashcardSubarea');
  if(subarea) subarea.onchange = e => { ui.flashcardSubarea=e.target.value; ui.flashcardDeck=''; ui.flashcardIndex=0; ui.revealedCards={}; renderFlashcards(); };
  const clearDeck = document.getElementById('flashcardClearDeck');
  if(clearDeck) clearDeck.onclick = () => { ui.flashcardDeck=''; ui.flashcardIndex=0; ui.revealedCards={}; renderFlashcards(); };
  const toggleLibrary = document.getElementById('flashcardToggleLibrary');
  if(toggleLibrary) toggleLibrary.onclick = () => { ui.flashcardShowLibrary = !ui.flashcardShowLibrary; renderFlashcards(); };
  const exportBtn = document.getElementById('ankiExportBtn');
  if(exportBtn) exportBtn.onclick = exportAnkiTsv;
  const backupBtn = document.getElementById('flashcardBackupBtn');
  if(backupBtn) backupBtn.onclick = exportFlashcardBackup;
  const undoBtn = document.getElementById('flashcardUndoBtn');
  if(undoBtn) undoBtn.onclick = undoFlashcardReview;
  const newLimit = document.getElementById('flashcardNewLimit');
  if(newLimit) newLimit.onchange = e => { state.flashcardSettings.newLimit = Math.max(0,n(e.target.value)); persist(); };
  const reviewLimit = document.getElementById('flashcardReviewLimit');
  if(reviewLimit) reviewLimit.onchange = e => { state.flashcardSettings.reviewLimit = Math.max(0,n(e.target.value)); persist(); };
  document.querySelectorAll('[data-flashcard-deck]').forEach(button => button.onclick = e => { ui.flashcardDeck = e.currentTarget.dataset.flashcardDeck; const [areaValue, subareaValue] = ui.flashcardDeck.split('|'); ui.flashcardArea=areaValue || 'Todas'; ui.flashcardSubarea=subareaValue || 'Todas'; ui.flashcardIndex=0; ui.revealedCards={}; renderFlashcards(); });
  document.querySelectorAll('[data-reveal-card]').forEach(button => button.onclick = e => {
    ui.revealedCards[e.currentTarget.dataset.revealCard] = true;
    renderFlashcards();
  });
  document.querySelectorAll('[data-card-quality]').forEach(button => button.onclick = e => reviewFlashcard(e.currentTarget.dataset.cardId, n(e.currentTarget.dataset.cardQuality)));
  document.querySelectorAll('[data-card-suspend]').forEach(button => button.onclick = e => suspendFlashcard(e.currentTarget.dataset.cardSuspend));
  document.querySelectorAll('[data-flashcard-move]').forEach(button => button.onclick = e => moveFlashcardSession(n(e.currentTarget.dataset.flashcardMove), cards.length));
  document.querySelectorAll('[data-edit-flashcard]').forEach(button => button.onclick = e => { ui.editFlashcardId = e.currentTarget.dataset.editFlashcard; renderFlashcards(); });
  document.querySelectorAll('[data-close-flashcard-edit]').forEach(button => button.onclick = () => { ui.editFlashcardId = ''; renderFlashcards(); });
  document.querySelectorAll('[data-question-card][data-card-id][data-card-field]').forEach(input => {
    input.oninput = e => updateQuestionFlashcard(e.currentTarget);
    input.onchange = e => updateQuestionFlashcard(e.currentTarget);
  });
  if(study) startAutoStudy('flashcards', study.scheduleId || '');
  else stopAutoStudy('flashcards');
}
function groupFlashcardDecks(cards) {
  const map = new Map();
  cards.forEach(card => {
    const key = `${card.area}|${card.subarea}`;
    const progress = flashcardProgress(card);
    if(!map.has(key)) map.set(key,{key,area:card.area,subarea:card.subarea,total:0,due:0,mature:0});
    const deck = map.get(key);
    deck.total++;
    if(isFlashcardDue(card)) deck.due++;
    if(progress.interval >= 21) deck.mature++;
  });
  return [...map.values()].sort((a,b)=>b.due-a.due || a.area.localeCompare(b.area) || a.subarea.localeCompare(b.subarea));
}
function renderFlashcardDeck(deck) {
  return `<button class="flashcard-deck ${ui.flashcardDeck===deck.key?'active':''}" data-flashcard-deck="${escapeAttr(deck.key)}"><strong>${escapeHtml(deck.area)}</strong><div>${escapeHtml(deck.subarea)}</div><div class="flashcard-meta"><span class="sm2-pill">${deck.total} cards</span><span class="sm2-pill">${deck.due} hoje</span><span class="sm2-pill">${deck.mature} maduros</span></div></button>`;
}
function groupFlashcards(cards) {
  const map = new Map();
  cards.forEach(card => {
    const key = `${card.area}|${card.subarea}|${card.block}|${card.scheduleId || card.topic}`;
    if(!map.has(key)) map.set(key,{area:card.area,subarea:card.subarea,block:card.block,topic:card.topic,cards:[]});
    map.get(key).cards.push(card);
  });
  return [...map.values()].sort((a,b)=>a.area.localeCompare(b.area)||a.subarea.localeCompare(b.subarea)||n(a.block)-n(b.block)||a.topic.localeCompare(b.topic));
}
function renderFlashcardGroup(group) {
  return `<section class="flashcard-course-group"><div class="section-title"><h3>${escapeHtml(group.area)} · ${escapeHtml(group.subarea)}</h3><span class="badge today">Bloco ${escapeHtml(group.block || '-')} · ${group.cards.length}</span></div><div class="muted">${escapeHtml(group.topic)}</div><div class="flashcard-grid">${group.cards.map(renderFlashcard).join('')}</div></section>`;
}
function renderFlashcard(card) {
  const progress = flashcardProgress(card);
  const revealed = ui.revealedCards[card.id];
  return `<article class="flashcard"><div class="flashcard-head"><strong>${escapeHtml(card.front)}</strong><span class="muted">${progress.reviews} rev. · ${escapeHtml(progress.nextReview)}</span></div><div class="flashcard-meta"><span class="sm2-pill">EF ${progress.ease.toFixed(2)}</span><span class="sm2-pill">${progress.interval} dias</span><span class="sm2-pill">${progress.lapses} lapsos</span><span class="sm2-pill">${escapeHtml(progress.status)}</span></div>${renderFlashcardInlineEditor(card)}${revealed ? `<div class="flashcard-back">${renderMarkdown(card.back)}</div>${renderFlashcardRating(card.id)}` : `<button class="icon-btn primary" data-reveal-card="${card.id}">Mostrar resposta</button>`}</article>`;
}
function renderFlashcardStudy(card, queue=[]) {
  if(!card) return '<div class="flashcard-empty-session"><div><h2>Fim da sessão</h2><div class="muted">Nenhum flashcard neste filtro agora. Troque o filtro ou crie novos cards nas questões.</div></div></div>';
  const progress = flashcardProgress(card);
  const revealed = ui.revealedCards[card.id];
  return `<div class="flashcard-stage"><div class="flashcard-study-card"><div class="flashcard-study-top"><span class="badge today">${escapeHtml(card.area)}</span><span class="badge wait">${escapeHtml(card.subarea)}</span><span class="badge today" data-auto-study-clock>Tempo pausado</span><span class="sm2-pill">${ui.flashcardIndex + 1} de ${queue.length}</span></div><div class="flashcard-front">${escapeHtml(card.front)}</div><div class="flashcard-meta" style="justify-content:center"><span class="sm2-pill">Próxima: ${escapeHtml(progress.nextReview)}</span><span class="sm2-pill">${progress.reviews} revisões</span><span class="sm2-pill">${progress.lapses} lapsos</span><span class="sm2-pill">EF ${progress.ease.toFixed(2)}</span></div>${renderFlashcardInlineEditor(card)}${revealed ? `<div class="flashcard-back">${renderMarkdown(card.back)}</div>${renderFlashcardRating(card.id)}` : `<button class="icon-btn primary" data-reveal-card="${card.id}">Mostrar resposta</button>`}<div class="flashcard-session-nav"><button class="icon-btn" data-flashcard-move="-1" ${ui.flashcardIndex<=0?'disabled':''}>Anterior</button><button class="icon-btn" data-flashcard-move="1" ${ui.flashcardIndex>=queue.length-1?'disabled':''}>Próximo</button></div></div></div>`;
}
function renderFlashcardInlineEditor(card) {
  if(ui.editFlashcardId !== card.id) return `<div class="flashcard-edit-toggle"><button class="tiny-btn" data-edit-flashcard="${escapeAttr(card.id)}">Editar card</button></div>`;
  return `<div class="flashcard-inline-editor">
    <textarea class="textarea" data-question-card="${escapeAttr(card.questionId)}" data-card-id="${escapeAttr(card.id)}" data-card-field="front" placeholder="Frente">${escapeHtml(card.front || '')}</textarea>
    <textarea class="textarea" data-question-card="${escapeAttr(card.questionId)}" data-card-id="${escapeAttr(card.id)}" data-card-field="back" placeholder="Verso">${escapeHtml(card.back || '')}</textarea>
    <input class="input" data-question-card="${escapeAttr(card.questionId)}" data-card-id="${escapeAttr(card.id)}" data-card-field="area" value="${escapeAttr(card.area || '')}" placeholder="Área">
    <input class="input" data-question-card="${escapeAttr(card.questionId)}" data-card-id="${escapeAttr(card.id)}" data-card-field="subarea" value="${escapeAttr(card.subarea || '')}" placeholder="Subárea">
    <button class="tiny-btn" data-close-flashcard-edit="${escapeAttr(card.id)}">Fechar edição</button>
  </div>`;
}
function renderFlashcardRating(id) {
  return `<div class="flashcard-actions"><div class="flashcard-rating"><button class="icon-btn" data-card-quality="0" data-card-id="${id}">Errei</button><button class="icon-btn" data-card-quality="2" data-card-id="${id}">Difícil</button><button class="icon-btn" data-card-quality="3" data-card-id="${id}">Bom</button><button class="icon-btn primary" data-card-quality="5" data-card-id="${id}">Fácil</button></div><button class="icon-btn" data-card-suspend="${id}">Suspender</button></div>`;
}
function reviewFlashcard(id, quality) {
  const queueBefore = flashcardStudyQueue(manualFlashcards());
  const currentIndex = Math.max(0, queueBefore.findIndex(card => card.id === id));
  const nextId = queueBefore[currentIndex + 1]?.id || '';
  const current = state.flashcardProgress[id] || {};
  state.flashcardReviewHistory = Array.isArray(state.flashcardReviewHistory) ? state.flashcardReviewHistory : [];
  state.flashcardReviewHistory.push({ cardId:id, previous: {...current}, reviewedAt:new Date().toISOString() });
  state.flashcardReviewHistory = state.flashcardReviewHistory.slice(-50);
  const sm2 = nextSm2Progress(current, quality);
  const lapses = n(current.lapses) + (quality < 3 ? 1 : 0);
  const isLeech = lapses >= 8;
  const date = new Date();
  const fuzz = sm2.interval >= 7 ? Math.round((Math.random() - 0.5) * Math.max(2, sm2.interval * 0.1)) : 0;
  date.setDate(date.getDate() + Math.max(1, sm2.interval + fuzz));
  state.flashcardProgress[id] = {
    ...current,
    ...sm2,
    lapses,
    status: isLeech ? 'Suspenso' : quality < 3 ? 'Difícil' : quality >= 5 ? 'Fácil' : 'Bom',
    reviews: n(current.reviews) + 1,
    firstReviewedAt: current.firstReviewedAt || new Date().toISOString(),
    lastQuality: quality,
    lastReviewedAt: new Date().toISOString(),
    nextReview: isLeech ? '2099-12-31' : localISODate(date)
  };
  const log = getDayLog(localISODate(new Date()));
  log.flashcardsOn = true;
  log.flashcards = n(log.flashcards) + 1;
  delete ui.revealedCards[id];
  const queueAfter = flashcardStudyQueue(manualFlashcards());
  const nextIndex = nextId ? queueAfter.findIndex(card => card.id === nextId) : -1;
  ui.flashcardIndex = nextIndex >= 0 ? nextIndex : Math.min(currentIndex, Math.max(queueAfter.length - 1, 0));
  persist();
}
function undoFlashcardReview() {
  const last = Array.isArray(state.flashcardReviewHistory) ? state.flashcardReviewHistory.pop() : null;
  if(!last) { alert('Nenhuma revisão recente para desfazer.'); return; }
  if(last.previous && Object.keys(last.previous).length) state.flashcardProgress[last.cardId] = last.previous;
  else delete state.flashcardProgress[last.cardId];
  ui.revealedCards[last.cardId] = true;
  saveStateOnly();
  renderFlashcards();
}
function moveFlashcardSession(delta, total) {
  ui.flashcardIndex = Math.max(0, Math.min(Math.max(total - 1, 0), n(ui.flashcardIndex) + delta));
  ui.revealedCards = {};
  renderFlashcards();
}
function nextSm2Progress(current, quality) {
  const q = Math.max(0, Math.min(5, Math.round(n(quality))));
  let ease = Math.max(1.3, n(current.ease) || 2.5);
  let repetitions = Math.max(0, n(current.repetitions) || 0);
  let interval = Math.max(0, n(current.interval) || 0);
  if(q < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions += 1;
    if(repetitions === 1) interval = 1;
    else if(repetitions === 2) interval = 6;
    else interval = Math.max(1, Math.round(interval * ease));
  }
  ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  return { ease, repetitions, interval };
}
function suspendFlashcard(id) {
  const current = state.flashcardProgress[id] || {};
  state.flashcardProgress[id] = { ...current, status:'Suspenso', nextReview:'2099-12-31' };
  delete ui.revealedCards[id];
  persist();
}
function ankiEscape(value='') {
  return String(value).replace(/\r?\n/g, '<br>').replace(/\t/g, ' ');
}
function ankiUnescape(value='') {
  return String(value).replace(/<br\s*\/?>/gi, '\n');
}
function ankiTags(card) {
  return [
    'SOqueroMed',
    `Area::${card.area}`,
    `Subarea::${card.subarea}`,
    `Bloco::${card.block || 'Sem_bloco'}`
  ].map(tag => tag.replace(/\s+/g, '_').replace(/[;,\t]/g, '')).join(' ');
}
function exportAnkiTsv() {
  const cards = filteredFlashcards(manualFlashcards());
  if(!cards.length) { alert('Nenhum flashcard para exportar neste filtro.'); return; }
  const header = '#separator:tab\n#html:true\n#tags column:5\n';
  const rows = cards.map(card => [
    ankiEscape(card.front),
    ankiEscape(card.back),
    ankiEscape(card.area),
    ankiEscape(card.subarea),
    ankiTags(card)
  ].join('\t'));
  const blob = new Blob([header + rows.join('\n')], {type:'text/tab-separated-values;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `soqueromed-anki-${localISODate(new Date())}.tsv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
function exportFlashcardBackup() {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: 'SÓqueroMed',
    flashcards: state.questionFlashcards || {},
    progress: state.flashcardProgress || {},
    settings: state.flashcardSettings || {}
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `soqueromed-flashcards-backup-${localISODate(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
function importAnkiTsv(event) {
  const file = event.target.files?.[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const lines = String(reader.result || '').split(/\r?\n/).filter(line => line.trim() && !line.startsWith('#'));
    let imported = 0;
    lines.forEach((line, index) => {
      const cols = line.split('\t');
      const front = ankiUnescape(cols[0] || '').trim();
      const back = ankiUnescape(cols[1] || '').trim();
      if(!front || !back) return;
      const area = (cols[2] || 'Importado do Anki').trim();
      const subarea = (cols[3] || 'Sem subárea').trim();
      const questionId = `anki-import-${normalizedTopic(area)}-${normalizedTopic(subarea)}`;
      if(!Array.isArray(state.questionFlashcards[questionId])) state.questionFlashcards[questionId] = [];
      state.questionFlashcards[questionId].push({
        id: `card-anki-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
        front,
        back,
        scheduleId: '',
        block: '',
        area,
        subarea,
        topic: subarea,
        source: 'Anki',
        createdAt: new Date().toISOString()
      });
      imported++;
    });
    event.target.value = '';
    renderCache.manualCards = null;
    persist();
    alert(`${imported} ${imported===1?'flashcard importado':'flashcards importados'} do Anki.`);
  };
  reader.readAsText(file, 'utf-8');
}
function questionResult(question) {
  const progress = state.questionProgress[question.id];
  return progress?.answeredAt ? progress : null;
}
function questionConfidenceStats() {
  const rows = Object.values(state.questionProgress || {}).filter(item => item && item.answeredAt);
  const withConfidence = rows.filter(item => n(item.confidence));
  const avgConfidence = withConfidence.length ? Math.round(withConfidence.reduce((sum,item) => sum + n(item.confidence), 0) / withConfidence.length) : 0;
  const knownCorrect = rows.filter(item => item.correct && item.correctMode === 'Sabendo').length;
  const luckyCorrect = rows.filter(item => item.correct && item.correctMode === 'Chute').length;
  const attention = rows.filter(item => item.missReason === 'Desatenção').length;
  const memory = rows.filter(item => item.missReason === 'Dúvida / já vi' || item.missReason === 'Não lembrar').length;
  const knowledge = rows.filter(item => item.missReason === 'Não saber').length;
  return { avgConfidence, knownCorrect, luckyCorrect, attention, memory, knowledge };
}
function questionCollectionLabel(value) {
  if(String(value) === 'ineditas') return 'Inéditas por Macroárea';
  return `Bloco ${value}`;
}
function questionCollectionSort(questionOrBlock) {
  const value = typeof questionOrBlock === 'object' ? questionOrBlock.collectionBlock ?? questionOrBlock.block : questionOrBlock;
  return String(value) === 'ineditas' ? 999 : n(value);
}
function normalizeQuestionText(value='') {
  const source = normalizeMedicalTypography(value)
    .replace(/\r\n?/g, '\n')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/?(?:p|div|span)[^>]*>/gi, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
  return source.split(/\n\s*\n/).map(paragraph => paragraph
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim())
    .filter(Boolean)
    .join('\n\n');
}
function normalizeMedicalTypography(value='') {
  return String(value ?? '').normalize('NFC')
    .replace(/(\d)\s*oC\b/g, '$1 °C')
    .replace(/\bmm3\b/gi, 'mm³')
    .replace(/\bcm3\b/gi, 'cm³')
    .replace(/\b([kmgµ]g|mL|dL|km|cm|mm)\s*\/\s*(dL|mL|L|h|min)\b/gi, '$1/$2')
    .replace(/([\p{L}])-\s+([\p{L}])/gu, '$1-$2')
    .replace(/\bEntubaç/gi, match => match[0] === 'E' ? 'Intubaç' : 'intubaç')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([A-Za-zÀ-ÿ0-9])\s+:\s+/g, '$1: ');
}
function normalizeQuestionRecord(question) {
  const options = Object.fromEntries(Object.entries(question.options || {}).map(([letter,text]) => [String(letter).trim().toUpperCase(), normalizeQuestionText(text)]));
  return {...question, stem:normalizeQuestionText(question.stem), options, comment:normalizeMedicalTypography(question.comment || ''), answer:String(question.answer || '').trim().toUpperCase()};
}
function questionDataIssue(question) {
  const letters = Object.keys(question.options || {});
  if(letters.length < 2) return 'Questão discursiva ou alternativas ausentes na extração original.';
  if(!letters.includes(question.answer)) return `O gabarito ${question.answer || 'não informado'} não está entre as alternativas disponíveis.`;
  return '';
}
function applyQuestionEdits(question) {
  const edit = state.questionEdits?.[question.id];
  if(!edit) return question;
  return {
    ...question,
    stem: edit.stem ?? question.stem,
    options: edit.options && typeof edit.options === 'object' ? {...question.options, ...edit.options} : question.options,
    answer: edit.answer || question.answer,
    comment: edit.comment ?? question.comment,
    topic: edit.topic || question.topic,
    area: edit.area || question.area,
    edited: true
  };
}
function openQuestionsForSchedule(scheduleId) {
  const item = state.schedule.find(row => row.id === scheduleId);
  if(!item) return;
  const exact = questionBank.filter(question => String(question.collectionBlock) === String(item.block) && canonicalTopic(question.topic) === canonicalTopic(item.topic));
  const direct = questionBank.filter(question => question.scheduleId === item.id);
  const linked = exact.length ? exact : direct.length ? direct : questionBank.filter(question => scheduleForQuestion(question)?.id === item.id);
  ui.tab = 'questoes';
  ui.qFocusScheduleId = linked.length ? item.id : '';
  ui.qBlock = item.block ? String(item.block) : 'Todos';
  ui.qSource = 'Todas';
  ui.qTopic = exact.length ? item.topic : 'Todos';
  ui.qStatus = 'Não respondidas';
  ui.qIndex = 0;
  ui.justAnsweredId = '';
  resetKeyboardConfirmation();
  render();
}
function openFlashcardsForSchedule(scheduleId) {
  const item = state.schedule.find(row => row.id === scheduleId);
  if(!item) return;
  ui.tab = 'flashcards';
  ui.flashcardArea = item.area || 'Todas';
  ui.flashcardSubarea = item.topic || 'Todas';
  ui.flashcardFilter = 'Todos';
  ui.flashcardDeck = '';
  ui.flashcardIndex = 0;
  render();
}
function filteredQuestions() {
  return questionBank.filter(question => {
    const result = questionResult(question);
    const focusOk = !ui.qFocusScheduleId || scheduleForQuestion(question)?.id === ui.qFocusScheduleId;
    const blockOk = ui.qBlock === 'Todos' || String(question.collectionBlock) === String(ui.qBlock);
    const sourceOk = ui.qSource === 'Todas' || question.sourceLabel === ui.qSource;
    const topicOk = ui.qTopic === 'Todos' || question.topic === ui.qTopic;
    const statusOk = question.id === ui.justAnsweredId
      || ui.qStatus === 'Todas'
      || (ui.qStatus === 'Não respondidas' && !result)
      || (ui.qStatus === 'Erradas' && result && !result.correct)
      || (ui.qStatus === 'Certas' && result?.correct)
      || (ui.qStatus === 'Gabarito suspeito' && Boolean(state.questionProgress[question.id]?.answerKeyIssue));
    return focusOk && blockOk && sourceOk && topicOk && statusOk;
  });
}
function renderQuestionBank() {
  stopAutoStudy('video');
  ensureQuestionProgress();
  const answered = questionBank.filter(questionResult);
  const correct = answered.filter(q => questionResult(q).correct);
  const confidence = questionConfidenceStats();
  const flagged = questionBank.filter(question => state.questionProgress[question.id]?.answerKeyIssue).length;
  const focusItem = ui.qFocusScheduleId ? state.schedule.find(item => item.id === ui.qFocusScheduleId) : null;
  const blocks = ['Todos', ...new Set(questionBank.map(q => q.collectionBlock).filter(Boolean).map(String))]
    .sort((a,b)=>a === 'Todos' ? -1 : b === 'Todos' ? 1 : questionCollectionSort(a)-questionCollectionSort(b));
  const scopedByBlock = questionBank.filter(q => ui.qBlock === 'Todos' || String(q.collectionBlock) === String(ui.qBlock));
  const sources = ['Todas', ...new Set(scopedByBlock.map(q => q.sourceLabel || q.source).filter(Boolean))];
  if(ui.qSource !== 'Todas' && !sources.includes(ui.qSource)) ui.qSource = 'Todas';
  const scopedBySource = scopedByBlock.filter(q => ui.qSource === 'Todas' || q.sourceLabel === ui.qSource);
  const topics = ['Todos', ...new Set(scopedBySource.map(q => q.topic))];
  if(ui.qTopic !== 'Todos' && !topics.includes(ui.qTopic)) ui.qTopic = 'Todos';
  const questions = filteredQuestions();
  ui.qIndex = Math.max(0, Math.min(ui.qIndex, Math.max(questions.length - 1, 0)));
  const question = questions[ui.qIndex];
  const activeQuestion = question ? applyQuestionEdits(question) : null;
  document.getElementById('questoes').innerHTML = `<div class="grid question-layout qbank-mode ${questionSidebarCollapsed?'sidebar-collapsed':''}">
    <button class="icon-btn question-sidebar-reopen" id="reopenQuestionSidebar" title="Abrir painel do banco" aria-label="Abrir painel do banco">☰</button>
    <aside class="card question-sidebar">
      <div class="section-title"><h2>Banco privado</h2><div class="question-sidebar-actions"><span class="badge today">${questionBank.length} questões</span><button class="icon-btn" id="collapseQuestionSidebar" title="Fechar painel do banco" aria-label="Fechar painel do banco">×</button></div></div>
      <div class="muted">Organizado por blocos do planner e coleções especiais.</div>
      <div class="question-counts"><div><strong>${answered.length}</strong><span class="muted">Feitas</span></div><div><strong>${correct.length}</strong><span class="muted">Certas</span></div><div><strong>${answered.length-correct.length}</strong><span class="muted">Erros</span></div></div>
      <button class="question-issue-summary ${flagged?'has-items':''}" id="showQuestionIssues"><span>⚑</span><strong>${flagged}</strong><span>${flagged===1?'gabarito marcado':'gabaritos marcados'}</span></button>
      ${progress('Aproveitamento', correct.length/Math.max(answered.length,1), `${correct.length} de ${answered.length}`)}
      <div class="confidence-box"><strong>Confiança média: ${confidence.avgConfidence || '-'}%</strong><div class="muted">Sabendo: ${confidence.knownCorrect} · Chute: ${confidence.luckyCorrect}</div><div class="muted">Erros: ${confidence.attention} atenção · ${confidence.memory} dúvida/já vi · ${confidence.knowledge} base</div></div>
      ${focusItem ? `<div class="focus-box"><strong>Foco da pendência</strong><div>${escapeHtml(focusItem.topic)}</div><div class="muted">Bloco ${focusItem.block} · ${escapeHtml(focusItem.area)}</div><button class="tiny-btn" id="clearQuestionFocus">Ver todas</button></div>` : ''}
      <details class="question-filter-panel"><summary>Blocos <span>${escapeHtml(ui.qBlock === 'Todos' ? 'Todas' : questionCollectionLabel(ui.qBlock))}</span></summary>
      ${renderQuestionBlockOverview()}</details>
      <details class="question-filter-panel"><summary>Filtros <span>${escapeHtml(ui.qStatus)}</span></summary>
      <div class="question-filter">
        <select class="select" id="questionBlock">${blocks.map(block => `<option value="${escapeAttr(block)}" ${block===String(ui.qBlock)?'selected':''}>${block === 'Todos' ? 'Todas as questões' : escapeHtml(questionCollectionLabel(block))}</option>`).join('')}</select>
        <select class="select" id="questionSource">${sources.map(source => `<option value="${escapeAttr(source)}" ${source===ui.qSource?'selected':''}>${escapeHtml(source)}</option>`).join('')}</select>
        <select class="select" id="questionTopic">${topics.map(topic => `<option value="${escapeAttr(topic)}" ${topic===ui.qTopic?'selected':''}>${escapeHtml(topic)}</option>`).join('')}</select>
        <select class="select" id="questionStatus">${['Todas','Não respondidas','Erradas','Certas','Gabarito suspeito'].map(status => `<option ${status===ui.qStatus?'selected':''}>${status}</option>`).join('')}</select>
      </div></details>
    </aside>
    <div class="card question-card">${activeQuestion ? renderQuestion(activeQuestion, questions.length) : '<div class="empty">Nenhuma questão corresponde a este filtro.</div>'}</div>
  </div>`;
  document.getElementById('questionBlock').onchange = e => { ui.qFocusScheduleId=''; ui.qBlock=e.target.value; ui.qSource='Todas'; ui.qTopic='Todos'; ui.qIndex=0; ui.justAnsweredId=''; render(); };
  document.getElementById('collapseQuestionSidebar').onclick = () => { questionSidebarCollapsed=true; localStorage.setItem(QUESTION_SIDEBAR_KEY,'1'); render(); };
  document.getElementById('reopenQuestionSidebar').onclick = () => { questionSidebarCollapsed=false; localStorage.removeItem(QUESTION_SIDEBAR_KEY); render(); };
  document.getElementById('questionSource').onchange = e => { ui.qFocusScheduleId=''; ui.qSource=e.target.value; ui.qTopic='Todos'; ui.qIndex=0; ui.justAnsweredId=''; render(); };
  document.getElementById('questionTopic').onchange = e => { ui.qFocusScheduleId=''; ui.qTopic=e.target.value; ui.qIndex=0; ui.justAnsweredId=''; render(); };
  document.getElementById('questionStatus').onchange = e => { ui.qStatus=e.target.value; ui.qIndex=0; ui.justAnsweredId=''; render(); };
  document.getElementById('showQuestionIssues').onclick = () => { ui.qStatus='Gabarito suspeito'; ui.qIndex=0; ui.justAnsweredId=''; render(); };
  const clearFocus = document.getElementById('clearQuestionFocus');
  if(clearFocus) clearFocus.onclick = () => { ui.qFocusScheduleId=''; ui.qIndex=0; render(); };
  document.querySelectorAll('[data-qblock-pick]').forEach(button => button.onclick = e => { ui.qFocusScheduleId=''; ui.qBlock=e.currentTarget.dataset.qblockPick; ui.qSource='Todas'; ui.qTopic='Todos'; ui.qIndex=0; ui.justAnsweredId=''; render(); });
  bindQuestionActions(questions, activeQuestion);
  if(activeQuestion) startAutoStudy('questions', scheduleForQuestion(activeQuestion)?.id || '');
  else if(questionBank.length) stopAutoStudy('questions');
}
function renderQuestionBlockOverview() {
  const groups = [...new Set(questionBank.map(question => question.collectionBlock).filter(Boolean).map(String))]
    .sort((a,b)=>questionCollectionSort(a)-questionCollectionSort(b));
  if(!groups.length) return '<div class="empty">Carregue questões para ver os blocos.</div>';
  return `<div class="qbank-block-grid">${groups.map(block => {
    const questions = questionBank.filter(question => String(question.collectionBlock) === block);
    const done = questions.filter(questionResult).length;
    const active = String(ui.qBlock) === block;
    const label = block === 'ineditas' ? 'Inéditas' : block;
    return `<button class="qbank-block-box ${active?'active':''}" data-qblock-pick="${escapeAttr(block)}"><strong>${escapeHtml(label)}</strong><small>${done}/${questions.length}</small></button>`;
  }).join('')}</div>`;
}
function renderQuestion(question, total) {
  const savedProgress = state.questionProgress[question.id] || {};
  const result = questionResult(question);
  const linkedLesson = scheduleForQuestion(question);
  const isSpecialCollection = String(question.collectionBlock) === 'ineditas';
  const collectionLabel = question.collectionLabel || questionCollectionLabel(question.collectionBlock || '-');
  const draftAnswer = ui.draftAnswers[question.id] || '';
  const draftConfidence = savedProgress.draftConfidence || '';
  const highlights = savedProgress.textHighlights || [];
  const eliminated = savedProgress.eliminated || [];
  const dataIssue = questionDataIssue(question);
  const answerKeyIssue = Boolean(savedProgress.answerKeyIssue);
  const options = Object.entries(question.options).map(([letter,text], optionIndex) => {
    let cls = '';
    if(result) {
      if(letter === question.answer) cls = 'correct';
      else if(letter === result.selected) cls = 'wrong';
    } else if(letter === draftAnswer) {
      cls = 'selected';
    }
    const isEliminated = eliminated.includes(letter);
    const scope=`option-${letter}`;
    return `<div class="answer-row"><button class="eliminate-btn ${isEliminated?'active':''}" data-eliminate="${letter}" title="Riscar alternativa ${letter} com J">×</button><button class="answer-option ${cls} ${isEliminated?'eliminated':''}" data-question="${question.id}" data-answer="${letter}" title="Alternativa ${letter} · tecla ${optionIndex+1}" ${result?'disabled':''}><span class="answer-letter">${letter}</span><span class="highlightable" data-highlight-scope="${scope}" style="font-size:${state.questionSettings.fontSize}px">${renderHighlightedText(text, highlights, false, scope)}</span></button></div>`;
  }).join('');
  const timeoutText = result?.timedOut ? ' Tempo esgotado no modo contratempo.' : '';
  const feedback = result ? `<div class="question-feedback ${result.correct?'':'wrong'}"><div><strong>${result.correct?'Resposta correta.':'Resposta incorreta.'}</strong>${timeoutText} Gabarito: ${question.answer}.${!result.correct ? ' Marque este assunto para revisão.' : ''}</div>${!result.correct && linkedLesson ? `<button class="tiny-btn question-material-link" data-question-materials="${escapeAttr(linkedLesson.id)}">Revisar material da aula</button>` : ''}</div>` : '';
  const comment = result && question.comment ? renderQuestionCommentPanel(question, result, highlights) : '';
  const reviewButton = result && !result.correct ? `<button class="icon-btn" id="questionFeynman">Enviar tema para Feynman</button>` : '';
  return `<div class="question-topbar"><button class="icon-btn" id="questionTopPrev" ${ui.qIndex===0?'disabled':''}>‹</button><div><strong>${ui.qIndex+1} de ${total}</strong><div class="muted">${escapeHtml(question.sourceLabel || question.source || '')}</div></div><div class="question-tool-strip"><button class="tiny-btn" id="questionFontDown" title="Diminuir fonte">A−</button><span class="question-font-value">${state.questionSettings.fontSize}px</span><button class="tiny-btn" id="questionFontUp" title="Aumentar fonte">A+</button><button class="icon-btn question-timer-toggle ${questionTimer.running?'active':''}" id="questionTimerToggle" title="Abrir relógio">◷</button><button class="icon-btn question-key-issue ${answerKeyIssue?'active':''}" id="questionKeyIssue" title="${answerKeyIssue?'Remover marcação de gabarito suspeito':'Marcar gabarito suspeito'}" aria-pressed="${answerKeyIssue}">⚑</button><button class="icon-btn" id="questionEditToggle" title="Corrigir texto">Editar</button><button class="icon-btn" id="questionTopNext" ${ui.qIndex>=total-1?'disabled':''}>›</button></div></div>${renderQuestionTimer(question, result)}<div class="question-body">
    <div class="question-meta"><span class="badge today">${escapeHtml(collectionLabel)}</span><span class="badge today">Questão ${question.number}</span><span class="badge today" data-auto-study-clock data-auto-study-prefix="Questões ·">Questões · 00:00</span>${question.edited?'<span class="badge wait">Editada</span>':''}<span class="badge wait">${escapeHtml(question.area)}</span><span class="badge done">${escapeHtml(question.topic)}</span></div>
    ${ui.editQuestionId === question.id ? renderQuestionEditPanel(question) : ''}
    ${isSpecialCollection ? `<div class="linked-lesson"><strong>Coleção:</strong> questões inéditas por macroárea para treino livre.</div>` : linkedLesson ? `<div class="linked-lesson"><strong>Aula vinculada:</strong> Bloco ${linkedLesson.block} · ${escapeHtml(linkedLesson.topic)}</div>` : `<div class="linked-lesson"><strong>Aula vinculada:</strong> não encontrei uma correspondência no cronograma.</div>`}
    <div class="section-title"><h2>Questão ${question.number}</h2><div class="highlight-tools">${['yellow','green','blue','red'].map(color => `<button class="marker-btn marker-${color} ${ui.highlightColor===color?'active':''}" data-marker="${color}" title="Marca-texto ${highlightLabel(color)}"></button>`).join('')}<button class="tiny-btn" id="clearHighlights">Limpar</button></div></div>
    <div class="question-workspace"><div class="question-main">
      <div class="question-stem highlightable" data-highlight-scope="stem" style="font-size:${state.questionSettings.fontSize}px">${renderHighlightedText(question.stem, highlights, true, 'stem')}</div>
      ${renderQuestionImages(question)}
      ${dataIssue ? `<div class="question-data-warning"><strong>Revisar extração.</strong> ${escapeHtml(dataIssue)} Use “Editar” para corrigir com base no PDF.</div>` : ''}
      <div class="answer-list">${options}</div>
      ${!result && !dataIssue ? renderQuestionConfidenceLine(question, draftConfidence) : ''}
      ${!result && !dataIssue ? `<div class="answer-confirm"><span class="muted">${draftAnswer ? `Alternativa ${draftAnswer} selecionada` : 'Selecione uma alternativa e confirme.'}</span><button class="icon-btn primary" id="confirmQuestionAnswer" ${draftAnswer?'':'disabled'}>Confirmar resposta</button></div>` : ''}
      ${feedback}
      ${comment}
      ${result ? renderQuestionReflection(question, result) : ''}
      ${result ? renderQuestionFlashcardEditor(question, result) : ''}
      ${renderQuestionNotes(question, savedProgress)}
      <div class="question-nav"><div><button class="icon-btn" id="questionPrev" ${ui.qIndex===0?'disabled':''}>‹ Anterior</button> <button class="icon-btn" id="questionNext" ${ui.qIndex>=total-1?'disabled':''}>Próxima ›</button></div><div>${reviewButton} ${result?'<button class="icon-btn" id="questionRedo">Refazer</button>':''}</div></div>
    </div></div></div>`;
}
function renderQuestionImages(question) {
  if(!question.images?.length) return '';
  return `<div class="question-images">${question.images.map((src, index) => `<img loading="lazy" decoding="async" src="${escapeAttr(src)}" alt="Imagem da questão ${question.number}${question.images.length > 1 ? `.${index + 1}` : ''}">`).join('')}</div>`;
}
function renderQuestionEditPanel(question) {
  const optionLetters = ['A','B','C','D','E'].filter(letter => question.options?.[letter] !== undefined);
  return `<div class="question-edit-panel">
    <div class="section-title"><div><h3>Correção local da questão</h3><div class="muted">Corrige ortografia/texto só no seu planner.</div></div><button class="tiny-btn" id="questionEditClose">Fechar</button></div>
    <label>Enunciado<textarea class="textarea" data-question-edit="stem">${escapeHtml(question.stem || '')}</textarea></label>
    <div class="question-edit-options">${optionLetters.map(letter => `<label>${letter}<textarea class="textarea" data-question-edit-option="${letter}">${escapeHtml(question.options?.[letter] || '')}</textarea></label>`).join('')}</div>
    <div class="field-row"><label>Gabarito<select class="select" data-question-edit="answer">${optionLetters.map(letter => `<option value="${letter}" ${question.answer===letter?'selected':''}>${letter}</option>`).join('')}</select></label><label>Área<input class="input" data-question-edit="area" value="${escapeAttr(question.area || '')}"></label><label>Tema<input class="input" data-question-edit="topic" value="${escapeAttr(question.topic || '')}"></label></div>
    <label>Comentário<textarea class="textarea" data-question-edit="comment">${escapeHtml(question.comment || '')}</textarea></label>
    <div class="question-edit-actions"><button class="icon-btn primary" id="questionEditSave">Salvar correção</button><button class="icon-btn" id="questionEditReset">Restaurar original</button></div>
  </div>`;
}
function renderQuestionConfidenceLine(question, selected) {
  const options = [
    ['red','Chutei / não sei'],
    ['yellow','Na dúvida'],
    ['green','Na certeza']
  ];
  return `<div class="sim-confidence question-confidence"><div class="muted" style="margin-bottom:10px">Nível de segurança antes de corrigir</div><div class="sim-confidence-track">${options.map(([value,label]) => `<button type="button" class="${selected===value?'active':''}" data-question-confidence="${value}"><span class="sim-confidence-dot ${value}"></span><span>${label}</span></button>`).join('')}</div></div>`;
}
function questionCommentSections(question, result) {
  const comment = String(question.comment || '').trim();
  const parsed = parseStructuredComment(comment);
  const compact = comment.replace(/\s+/g, ' ').trim();
  const pearl = compact
    .replace(/^Gabarito:\s*[A-E]\)?\s*/i, '')
    .split(/(?<=[.!?])\s+/)
    .find(sentence => sentence.length > 45) || compact.slice(0, 220);
  const selectedText = question.options?.[result.selected] || '';
  const answerText = question.options?.[question.answer] || '';
  return {
    analysis: parsed.analysis || comment,
    pearl: parsed.pearl || pearl || 'Revise o conceito central desta questão.',
    error: result.correct
      ? (parsed.error || `Você acertou. Guarde por que a alternativa ${question.answer} resolve melhor o enunciado.`)
      : (parsed.error || `Você marcou ${result.selected || '-'}${selectedText ? ` (${selectedText})` : ''}. O gabarito é ${question.answer}${answerText ? ` (${answerText})` : ''}.`)
  };
}
function parseStructuredComment(comment) {
  const sections = {};
  const aliases = {
    analise: 'analysis',
    análise: 'analysis',
    analysis: 'analysis',
    perola: 'pearl',
    pérola: 'pearl',
    pearl: 'pearl',
    erro: 'error',
    'erro comum': 'error',
    armadilha: 'error',
    pegadinha: 'error',
    error: 'error'
  };
  const matches = [...comment.matchAll(/(?:^|\n)\s*(An[áa]lise|Analysis|P[ée]rola|Pearl|Erro(?: comum)?|Armadilha|Pegadinha|Error)\s*:\s*/gi)];
  matches.forEach((match, index) => {
    const key = aliases[normalizedTopic(match[1])];
    if(!key) return;
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? comment.length;
    sections[key] = comment.slice(start, end).trim();
  });
  return sections;
}
function renderQuestionCommentPanel(question, result, highlights=[]) {
  const current = state.questionProgress[question.id] || {};
  const allowedTabs = ['analysis','pearl','error'];
  const tab = allowedTabs.includes(current.commentTab) ? current.commentTab : 'pearl';
  const mastery = current.commentMastery || '';
  const sections = questionCommentSections(question, result);
  const tabs = [
    ['analysis','Análise','◉'],
    ['pearl','Pérola','✦'],
    ['error','Armadilha','!']
  ];
  const masteryOptions = [
    ['dominei','Dominei'],
    ['duvida','Dúvida'],
    ['vacilei','Vacilei'],
    ['nao-sabia','Não sabia']
  ];
  const nextDisabled = ui.qIndex >= filteredQuestions().length - 1 ? 'disabled' : '';
  return `<div class="question-comment-panel">
    <div class="comment-mastery">${masteryOptions.map(([value,label]) => `<button class="${mastery===value?'active':''} ${value}" data-comment-mastery="${value}">${escapeHtml(label)}</button>`).join('')}</div>
    <div class="comment-quick-nav"><button class="icon-btn" id="commentPrevQuestion" ${ui.qIndex===0?'disabled':''}>‹</button><button class="icon-btn primary" id="commentNextQuestion" ${nextDisabled}>Próx ›</button></div>
    <div class="comment-tabs">${tabs.map(([value,label,icon]) => `<button class="${tab===value?'active':''} ${value}" data-comment-tab="${value}"><span>${icon}</span>${escapeHtml(label)}</button>`).join('')}</div>
    <div class="question-comment-card ${escapeAttr(tab)}"><strong>${escapeHtml(tabs.find(item => item[0] === tab)?.[1] || 'Comentário')}</strong><div>${renderCommentSectionContent(tab, sections[tab] || sections.analysis, highlights)}</div></div>
  </div>`;
}
function renderCommentSectionContent(tab, text, highlights=[]) {
  const raw = String(text || '').trim();
  if(tab !== 'analysis') return renderHighlightedText(raw, highlights);
  const rows = raw.split(/\n+/).map(line => line.trim()).filter(Boolean);
  const labels = [
    ['Correta', 'correct'],
    ['Por que está certa', 'why'],
    ['Por que as outras estão erradas', 'wrong'],
    ['Ponto de prova', 'proof'],
    ['Flashcard sugerido', 'flashcard']
  ];
  const chunks = [];
  let current = null;
  rows.forEach(line => {
    const found = labels.find(([label]) => normalizedTopic(line).startsWith(normalizedTopic(label)));
    if(found) {
      current = {label: found[0], kind: found[1], text: line.replace(new RegExp(`^${escapeRegExp(found[0])}\\s*:?\\s*`, 'i'), '').trim()};
      chunks.push(current);
    } else if(current) {
      current.text += `${current.text ? '\n' : ''}${line}`;
    } else {
      chunks.push({label:'Comentário', kind:'note', text:line});
    }
  });
  if(!chunks.length) return renderHighlightedText(raw, highlights);
  return `<div class="analysis-grid">${chunks.map(chunk => `<div class="analysis-chip ${escapeAttr(chunk.kind)}"><span>${escapeHtml(chunk.label)}</span><p>${renderHighlightedText(chunk.text, highlights)}</p></div>`).join('')}</div>`;
}
function renderHighlightedText(text, highlights=[], paragraphs=false, scope='') {
  let html = escapeHtml(text);
  const unique = [...new Map((highlights || []).filter(item => item?.text && (item.scope===scope || (!item.scope && scope==='stem'))).map(item => [`${item.scope||'legacy'}|${item.occurrence||0}|${item.text}`, item])).values()]
    .sort((a,b) => b.text.length - a.text.length);
  unique.forEach(item => {
    const escapedText = escapeHtml(item.text);
    if(!escapedText) return;
    html = replaceHighlightedOccurrence(html,escapedText,item);
  });
  if(paragraphs) return html.split(/\n{2,}/).map(part => `<span class="text-paragraph">${part.replace(/\n/g, '<br>')}</span>`).join('');
  return html.replace(/\n/g, '<br>');
}
function renderQuestionTimer(question, result) {
  const seconds = state.questionSettings.secondsPerQuestion;
  const active = questionTimer.running && questionTimer.questionId === question.id;
  const mode = questionTimer.mode || 'countdown';
  const clock = mode === 'stopwatch'
    ? (questionTimer.questionId === question.id ? questionTimer.elapsedSeconds : 0)
    : (questionTimer.questionId === question.id && (active || questionTimer.secondsLeft > 0) ? questionTimer.secondsLeft : seconds);
  if(!ui.questionTimerOpen) return '';
  const sessionLabel = mode === 'countdown' && questionTimer.pausedByUser ? 'Sessão pausada' : mode === 'countdown' && questionTimer.sessionActive ? 'Sessão ativa' : mode === 'countdown' ? 'Por questão' : 'Cronômetro';
  return `<aside class="question-timer-popover compact">
    <div class="question-timer-head"><div><div class="question-clock ${mode==='countdown' && clock <= 15 ? 'danger' : ''}" id="questionClock">${formatClock(clock)}</div><div class="question-timer-mini-label">${escapeHtml(sessionLabel)}</div></div><button class="tiny-btn" id="closeQuestionTimer" title="Fechar">×</button></div>
    <div class="question-timer-fields compact">
      <select class="select" id="questionTimerMode"><option value="countdown" ${mode==='countdown'?'selected':''}>Contratempo</option><option value="stopwatch" ${mode==='stopwatch'?'selected':''}>Cronômetro</option></select>
      <input class="input" id="questionMinutes" type="number" min="0.25" step="0.25" value="${Math.round(seconds/15)/4}" ${mode==='stopwatch'?'disabled':''} title="Minutos por questão">
    </div>
    <div class="question-timer-status" id="questionTimerStatus">${escapeHtml(questionTimer.status || (active ? 'Em andamento' : 'Pronto'))}</div>
    <div class="question-timer-actions compact"><button class="icon-btn primary" id="startQuestionTimer" ${result?'disabled':''} title="Iniciar sessão">${questionTimer.running?'●':'▶'}</button><button class="icon-btn" id="pauseQuestionTimer" title="Pausar">Ⅱ</button><button class="icon-btn" id="saveQuestionTimer" title="Salvar tempo">✓</button><button class="icon-btn" id="discardQuestionTimer" title="Desativar">×</button></div>
  </aside>`;
}
function renderQuestionReflection(question, result) {
  const confidence = Math.max(0, Math.min(100, n(result.confidence)));
  const certainty = Math.max(0, Math.min(100, n(result.certainty)));
  const levelLabel = result.confidenceLevel === 'red' ? 'Chutei / não sei' : result.confidenceLevel === 'yellow' ? 'Na dúvida' : result.confidenceLevel === 'green' ? 'Na certeza' : 'Não marcado';
  if(result.correct) {
    return `<div class="question-reflection"><strong>Como foi esse acerto?</strong><div class="muted">Nível marcado antes de corrigir: ${escapeHtml(levelLabel)}</div><div class="field-row"><select class="select" data-progress-field="correctMode"><option value="">Marcar acerto</option>${['Sabendo','Chute'].map(option => `<option ${result.correctMode===option?'selected':''}>${option}</option>`).join('')}</select><input class="input" type="number" min="0" max="100" step="5" data-progress-field="certainty" value="${certainty || ''}" placeholder="% de certeza"><input class="input" type="number" min="0" max="100" step="5" data-progress-field="confidence" value="${confidence || ''}" placeholder="Confiança geral %"></div></div>`;
  }
  const missReason = result.missReason === 'Não lembrar' ? 'Dúvida / já vi' : result.missReason;
  return `<div class="question-reflection"><strong>Por que errei?</strong><div class="muted">Nível marcado antes de corrigir: ${escapeHtml(levelLabel)}</div><div class="field-row"><select class="select" data-progress-field="missReason"><option value="">Motivo do erro</option>${['Desatenção','Dúvida / já vi','Não saber'].map(option => `<option ${missReason===option?'selected':''}>${option}</option>`).join('')}</select><input class="input" type="number" min="0" max="100" step="5" data-progress-field="confidence" value="${confidence || ''}" placeholder="Confiança antes %"><input class="input" data-progress-field="reflection" value="${escapeAttr(result.reflection || '')}" placeholder="Comentário curto"></div></div>`;
}
function renderQuestionFlashcardEditor(question, result) {
  const cards = Array.isArray(state.questionFlashcards[question.id]) ? state.questionFlashcards[question.id] : [];
  const allowed = flashcardCreationAllowed(result);
  if(!allowed && !cards.length) return '';
  const reason = allowed ? flashcardCreationReason(result) : 'Flashcards já criados continuam disponíveis para edição.';
  return `<div class="flashcard-editor"><div class="section-title"><div><h3>Criar flashcards</h3><div class="muted">${escapeHtml(reason)}</div></div><button class="icon-btn primary" id="addQuestionFlashcard" ${cards.length>=2 || !allowed?'disabled':''}>+ Flashcard</button></div>${cards.length ? `<div class="flashcard-editor-list">${cards.map((card,index)=>`<div class="flashcard-editor-item"><textarea class="textarea" data-question-card="${question.id}" data-card-id="${card.id}" data-card-field="front" placeholder="Frente: escreva a pergunta ou conceito">${escapeHtml(card.front || '')}</textarea><textarea class="textarea" data-question-card="${question.id}" data-card-id="${card.id}" data-card-field="back" placeholder="Verso: escreva a resposta">${escapeHtml(card.back || '')}</textarea><button class="tiny-btn" data-remove-question-card="${question.id}" data-card-id="${card.id}" title="Remover flashcard">×</button><input class="input" data-question-card="${question.id}" data-card-id="${card.id}" data-card-field="area" value="${escapeAttr(card.area || question.area || '')}" placeholder="Área"><input class="input" data-question-card="${question.id}" data-card-id="${card.id}" data-card-field="subarea" value="${escapeAttr(card.subarea || card.topic || question.topic || '')}" placeholder="Subárea"></div>`).join('')}</div>` : '<div class="empty">Escreva até dois flashcards curtos desta questão.</div>'}<div class="topic-source">${cards.length}/2 flashcards · ${escapeHtml(question.collectionLabel || questionCollectionLabel(question.collectionBlock))} · ${escapeHtml(question.topic)}</div></div>`;
}
function renderQuestionNotes(question, result) {
  const notes = result?.notes || '';
  return `<div class="question-notes single"><textarea class="textarea" data-progress-field="notes" aria-label="Anotação da questão">${escapeHtml(notes)}</textarea></div>`;
}
function bindQuestionActions(questions, question) {
  if(!question) return;
  document.querySelectorAll('[data-question][data-answer]').forEach(button => button.onclick = e => {
    if(ui.suppressAnswerClick || Date.now() < n(ui.highlightGestureUntil)) {
      ui.suppressAnswerClick = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if((window.getSelection()?.toString() || '').trim().length > 1) return;
    ui.draftAnswers[question.id] = e.currentTarget.dataset.answer;
    resetKeyboardConfirmation();
    render();
  });
  const prev = document.getElementById('questionPrev');
  const next = document.getElementById('questionNext');
  const topPrev = document.getElementById('questionTopPrev');
  const topNext = document.getElementById('questionTopNext');
  const redo = document.getElementById('questionRedo');
  const feynman = document.getElementById('questionFeynman');
  const timerToggle = document.getElementById('questionTimerToggle');
  const closeTimer = document.getElementById('closeQuestionTimer');
  const timerMode = document.getElementById('questionTimerMode');
  const timerMinutes = document.getElementById('questionMinutes');
  const startTimer = document.getElementById('startQuestionTimer');
  const pauseTimer = document.getElementById('pauseQuestionTimer');
  const saveTimer = document.getElementById('saveQuestionTimer');
  const discardTimer = document.getElementById('discardQuestionTimer');
  const editToggle = document.getElementById('questionEditToggle');
  const editClose = document.getElementById('questionEditClose');
  const editSave = document.getElementById('questionEditSave');
  const editReset = document.getElementById('questionEditReset');
  const confirmAnswer = document.getElementById('confirmQuestionAnswer');
  const fontDown = document.getElementById('questionFontDown');
  const fontUp = document.getElementById('questionFontUp');
  const keyIssue = document.getElementById('questionKeyIssue');
  document.querySelectorAll('[data-question-materials]').forEach(button => button.onclick = e => openMaterialsForSchedule(e.currentTarget.dataset.questionMaterials));
  document.querySelectorAll('[data-question-confidence]').forEach(button => button.onclick = e => {
    const current = state.questionProgress[question.id] || {};
    state.questionProgress[question.id] = { ...current, draftConfidence: e.currentTarget.dataset.questionConfidence };
    saveStateOnly();
    render();
  });
  const goPrev = () => { stopQuestionTimer(true); resetKeyboardConfirmation(); ui.justAnsweredId=''; ui.qIndex=Math.max(0,ui.qIndex-1); render(); };
  const goNext = () => {
    stopQuestionTimer(true);
    resetKeyboardConfirmation();
    if(ui.justAnsweredId) ui.justAnsweredId='';
    else ui.qIndex=Math.min(questions.length-1,ui.qIndex+1);
    render();
  };
  if(prev) prev.onclick = goPrev;
  if(next) next.onclick = goNext;
  if(topPrev) topPrev.onclick = goPrev;
  if(topNext) topNext.onclick = goNext;
  if(redo) redo.onclick = () => {
    const previous = state.questionProgress[question.id] || {};
    state.questionProgress[question.id] = {
      notes: previous.notes || '',
      textHighlights: previous.textHighlights || [],
      eliminated: previous.eliminated || [],
      draftConfidence: previous.confidenceLevel || previous.draftConfidence || '',
      attempts: previous.attempts || 0
    };
    delete ui.draftAnswers[question.id];
    stopQuestionTimer(true);
    persist();
  };
  document.querySelectorAll('[data-marker]').forEach(button => button.onclick = e => { ui.highlightColor = e.currentTarget.dataset.marker; render(); });
  const clearHighlights = document.getElementById('clearHighlights');
  if(clearHighlights) clearHighlights.onclick = () => {
    const current = state.questionProgress[question.id] || {};
    if(current.textHighlights?.length) rememberHighlightState({ context:'question', questionId:question.id, highlights:current.textHighlights });
    state.questionProgress[question.id] = { ...current, textHighlights: [] };
    persist();
  };
  document.querySelectorAll('[data-eliminate]').forEach(button => button.onclick = e => {
    e.preventDefault();
    e.stopPropagation();
    toggleEliminated(question, e.currentTarget.dataset.eliminate);
  });
  document.querySelectorAll('.highlightable').forEach(el => {
    el.onselectstart = () => {
      ui.suppressAnswerClick = true;
      ui.highlightGestureUntil = Date.now() + 800;
    };
    el.onmouseup = e => {
      const hasSelection = (window.getSelection()?.toString() || '').trim().length > 1;
      if(!hasSelection) return;
      ui.suppressAnswerClick = true;
      ui.highlightGestureUntil = Date.now() + 800;
      e.preventDefault();
      e.stopPropagation();
      setTimeout(() => toggleSelectedHighlight(question), 0);
      setTimeout(() => { ui.suppressAnswerClick = false; }, 850);
    };
    el.onclick = e => {
      if(Date.now() < n(ui.highlightGestureUntil)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
  });
  if(timerToggle) timerToggle.onclick = () => { ui.questionTimerOpen=!ui.questionTimerOpen; render(); };
  if(closeTimer) closeTimer.onclick = () => {
    if(questionTimer.sessionActive) {
      questionTimer.status = 'Use × para desativar o contratempo';
      renderQuestionClock();
      return;
    }
    ui.questionTimerOpen=false;
    render();
  };
  if(timerMode) timerMode.onchange = e => setQuestionTimerMode(question, e.target.value);
  if(timerMinutes) timerMinutes.onchange = e => {
    state.questionSettings.secondsPerQuestion = Math.max(15, Math.round(n(e.target.value) * 60) || 90);
    if(questionTimer.mode==='countdown') {
      questionTimer.secondsLeft=state.questionSettings.secondsPerQuestion;
      questionTimer.elapsedSeconds=0;
      questionTimer.beeped=false;
    }
    saveStateOnly();
    persistQuestionTimerSession();
    renderQuestionClock();
  };
  if(startTimer) startTimer.onclick = () => startQuestionTimer(question);
  if(pauseTimer) pauseTimer.onclick = () => pauseQuestionTimer();
  if(saveTimer) saveTimer.onclick = () => saveQuestionTimerTime();
  if(discardTimer) discardTimer.onclick = () => discardQuestionTimer();
  if(editToggle) editToggle.onclick = () => { ui.editQuestionId = ui.editQuestionId === question.id ? '' : question.id; render(); };
  if(editClose) editClose.onclick = () => { ui.editQuestionId = ''; render(); };
  if(editSave) editSave.onclick = () => saveQuestionEdit(question);
  if(editReset) editReset.onclick = () => {
    if(confirm('Restaurar o texto original desta questão?')) {
      delete state.questionEdits[question.id];
      ui.editQuestionId = '';
      persist();
    }
  };
  if(confirmAnswer) confirmAnswer.onclick = () => {
    const selected = ui.draftAnswers[question.id];
    if(selected) answerQuestion(question, selected, false);
  };
  if(fontDown) fontDown.onclick = () => setQuestionFontSize(-2);
  if(fontUp) fontUp.onclick = () => setQuestionFontSize(2);
  if(keyIssue) keyIssue.onclick = () => {
    const current = state.questionProgress[question.id] || {};
    state.questionProgress[question.id] = { ...current, answerKeyIssue: !current.answerKeyIssue, answerKeyIssueAt: !current.answerKeyIssue ? new Date().toISOString() : '' };
    persist();
  };
  document.querySelectorAll('[data-progress-field]').forEach(input => {
    input.oninput = e => updateQuestionProgressField(question, e.currentTarget);
    input.onchange = e => {
      const field = e.currentTarget.dataset.progressField;
      updateQuestionProgressField(question, e.currentTarget);
      if(['missReason','correctMode','confidence','certainty'].includes(field)) requestAnimationFrame(() => render());
    };
  });
  const addFlashcard = document.getElementById('addQuestionFlashcard');
  if(addFlashcard) addFlashcard.onclick = () => addQuestionFlashcard(question);
  document.querySelectorAll('[data-comment-mastery]').forEach(button => button.onclick = e => {
    const current = state.questionProgress[question.id] || {};
    state.questionProgress[question.id] = { ...current, commentMastery: e.currentTarget.dataset.commentMastery };
    saveStateOnly();
    render();
  });
  document.querySelectorAll('[data-comment-tab]').forEach(button => button.onclick = e => {
    const current = state.questionProgress[question.id] || {};
    state.questionProgress[question.id] = { ...current, commentTab: e.currentTarget.dataset.commentTab };
    saveStateOnly();
    render();
  });
  const commentPrev = document.getElementById('commentPrevQuestion');
  if(commentPrev) commentPrev.onclick = () => { stopQuestionTimer(true); resetKeyboardConfirmation(); ui.justAnsweredId=''; ui.qIndex=Math.max(0,ui.qIndex-1); render(); };
  const commentNext = document.getElementById('commentNextQuestion');
  if(commentNext) commentNext.onclick = () => { stopQuestionTimer(true); resetKeyboardConfirmation(); ui.justAnsweredId=''; ui.qIndex=Math.min(questions.length-1,ui.qIndex+1); render(); };
  document.querySelectorAll('[data-question-card][data-card-id][data-card-field]').forEach(input => {
    input.oninput = e => updateQuestionFlashcard(e.currentTarget);
    input.onchange = e => updateQuestionFlashcard(e.currentTarget);
  });
  document.querySelectorAll('[data-remove-question-card]').forEach(button => button.onclick = e => removeQuestionFlashcard(e.currentTarget.dataset.removeQuestionCard, e.currentTarget.dataset.cardId));
  if(feynman) feynman.onclick = () => {
    if(!state.feynman.some(item => item.topic.toLowerCase() === question.topic.toLowerCase())) {
      state.feynman.unshift({ id:`feyn-${Date.now()}`, topic:question.topic, scheduleId:'', area:question.area, explain:'', gaps:`Errei a questão ${question.number} do banco.`, analogy:'', nextStep:'Revisar o tema e refazer a questão.', mastery:1, reviewDate:localISODate(new Date()), updatedAt:localISODate(new Date()) });
    }
    persist();
  };
  maybeAutoStartQuestionTimer(question);
}
function addQuestionFlashcard(question) {
  const cards = Array.isArray(state.questionFlashcards[question.id]) ? state.questionFlashcards[question.id] : [];
  if(cards.length >= 2) return;
  const linked = scheduleForQuestion(question);
  cards.push({
    id: `card-${question.id}-${Date.now()}`,
    front: '',
    back: '',
    scheduleId: linked?.id || '',
    block: linked?.block || question.collectionBlock,
    area: linked?.area || question.area || 'Sem área',
    subarea: linked?.topic || question.topic || 'Sem subárea',
    topic: linked?.topic || question.topic,
    createdAt: new Date().toISOString()
  });
  state.questionFlashcards[question.id] = cards;
  persist();
}
function saveQuestionEdit(question) {
  const edit = {
    stem: document.querySelector('[data-question-edit="stem"]')?.value || question.stem || '',
    answer: document.querySelector('[data-question-edit="answer"]')?.value || question.answer || '',
    area: document.querySelector('[data-question-edit="area"]')?.value || question.area || '',
    topic: document.querySelector('[data-question-edit="topic"]')?.value || question.topic || '',
    comment: document.querySelector('[data-question-edit="comment"]')?.value || question.comment || '',
    options: {}
  };
  document.querySelectorAll('[data-question-edit-option]').forEach(input => {
    edit.options[input.dataset.questionEditOption] = input.value;
  });
  state.questionEdits[question.id] = edit;
  ui.editQuestionId = '';
  persist();
}
function updateQuestionFlashcard(input) {
  const cards = state.questionFlashcards[input.dataset.questionCard] || [];
  const card = cards.find(item => item.id === input.dataset.cardId);
  if(!card) return;
  card[input.dataset.cardField] = input.value;
  if(input.dataset.cardField === 'subarea') card.topic = input.value;
  renderCache.manualCards = null;
  saveStateOnly();
}
function removeQuestionFlashcard(questionId, cardId) {
  const cards = state.questionFlashcards[questionId] || [];
  state.questionFlashcards[questionId] = cards.filter(card => card.id !== cardId);
  delete state.flashcardProgress[cardId];
  delete ui.revealedCards[cardId];
  persist();
}
function resetKeyboardConfirmation() {
  ui.keyboardConfirmQuestion = '';
  ui.keyboardConfirmUntil = 0;
  const button = document.getElementById('confirmQuestionAnswer');
  if(button) {
    button.classList.remove('keyboard-armed');
    button.title = 'Confirmar resposta';
  }
}
function armKeyboardConfirmation(question) {
  ui.keyboardConfirmQuestion = question.id;
  ui.keyboardConfirmUntil = Date.now() + 2200;
  const button = document.getElementById('confirmQuestionAnswer');
  if(button) {
    button.classList.add('keyboard-armed');
    button.title = 'Confirmação preparada';
  }
  setTimeout(() => {
    if(ui.keyboardConfirmQuestion === question.id && Date.now() >= ui.keyboardConfirmUntil) resetKeyboardConfirmation();
  }, 2250);
}
function handleQuestionKeyboard(event) {
  if(ui.tab === 'simulados') return handleSimuladoKeyboard(event);
  if(ui.tab === 'flashcards') return handleFlashcardKeyboard(event);
  if(ui.tab !== 'questoes' || event.ctrlKey || event.metaKey || event.altKey) return;
  const target = event.target;
  if(target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
  const questions = filteredQuestions();
  const question = questions[ui.qIndex] ? applyQuestionEdits(questions[ui.qIndex]) : null;
  if(!question || questionResult(question)) return;

  if(/^[1-5]$/.test(event.key)) {
    const letter = String.fromCharCode(64 + Number(event.key));
    if(!Object.prototype.hasOwnProperty.call(question.options || {}, letter)) return;
    event.preventDefault();
    ui.draftAnswers[question.id] = letter;
    resetKeyboardConfirmation();
    render();
    return;
  }

  if(event.key.toLowerCase() === 'j') {
    const selected = ui.draftAnswers[question.id];
    if(!selected) return;
    event.preventDefault();
    resetKeyboardConfirmation();
    toggleEliminated(question, selected);
    return;
  }

  if(event.code === 'Space') {
    const selected = ui.draftAnswers[question.id];
    if(!selected || event.repeat) return;
    event.preventDefault();
    if(ui.keyboardConfirmQuestion === question.id && Date.now() < ui.keyboardConfirmUntil) {
      resetKeyboardConfirmation();
      answerQuestion(question, selected, false);
    } else {
      armKeyboardConfirmation(question);
    }
  }
}
function handleFlashcardKeyboard(event) {
  if(event.ctrlKey || event.metaKey || event.altKey) return;
  const target = event.target;
  if(target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
  const cards = flashcardStudyQueue(manualFlashcards());
  const card = cards[ui.flashcardIndex];
  if(!card) return;
  if(event.key.toLowerCase() === 'u') {
    event.preventDefault();
    undoFlashcardReview();
    return;
  }
  if(event.code === 'Space') {
    event.preventDefault();
    if(ui.revealedCards[card.id]) {
      reviewFlashcard(card.id, 3);
    } else {
      ui.revealedCards[card.id] = true;
      renderFlashcards();
    }
    return;
  }
  if(/^[1-4]$/.test(event.key)) {
    if(!ui.revealedCards[card.id]) return;
    event.preventDefault();
    const quality = {1:0,2:2,3:3,4:5}[event.key];
    reviewFlashcard(card.id, quality);
  }
}
function handleSimuladoKeyboard(event) {
  if(event.ctrlKey || event.metaKey || event.altKey) return;
  const target = event.target;
  if(target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
  const run = state.simuladoRuns.find(item => item.id === ui.activeSimRunId);
  if(!run || run.finishedAt) return;
  const question = activeSimQuestion(run);
  if(!question) return;
  if(/^[1-5]$/.test(event.key)) {
    const letter = String.fromCharCode(64 + Number(event.key));
    if(!Object.prototype.hasOwnProperty.call(question.options || {}, letter)) return;
    event.preventDefault();
    run.answers[question.id] = letter;
    saveStateOnly();
    render();
    return;
  }
  if(event.key.toLowerCase() === 'j') {
    const selected = run.answers?.[question.id];
    if(!selected) return;
    event.preventDefault();
    toggleSimEliminated(run, question, selected);
    return;
  }
  if(event.code === 'Space' || event.key === 'ArrowRight') {
    event.preventDefault();
    run.currentIndex = Math.min(run.questionIds.length - 1, n(run.currentIndex) + 1);
    saveStateOnly();
    render();
    return;
  }
  if(event.key === 'ArrowLeft') {
    event.preventDefault();
    run.currentIndex = Math.max(0, n(run.currentIndex) - 1);
    saveStateOnly();
    render();
  }
}
function setQuestionFontSize(delta) {
  state.questionSettings.fontSize = Math.max(14, Math.min(28, n(state.questionSettings.fontSize) + delta));
  saveStateOnly();
  render();
}
function toggleEliminated(question, letter) {
  const current = state.questionProgress[question.id] || {};
  const eliminated = Array.isArray(current.eliminated) ? [...current.eliminated] : [];
  const next = eliminated.includes(letter) ? eliminated.filter(item => item !== letter) : [...eliminated, letter];
  state.questionProgress[question.id] = { ...current, eliminated: next };
  persist();
}
function toggleSelectedHighlight(question) {
  const selection = window.getSelection();
  const selected = selection ? selection.toString().replace(/\s+/g, ' ').trim() : '';
  if(!selected || selected.length < 2) return;
  const anchor = selection.anchorNode?.parentElement?.closest('.highlightable');
  const focus = selection.focusNode?.parentElement?.closest('.highlightable');
  if(!anchor || anchor!==focus || !anchor.closest('.question-card')) return;
  const range=selection.getRangeAt(0);
  const beforeRange=range.cloneRange();
  beforeRange.selectNodeContents(anchor);
  beforeRange.setEnd(range.startContainer,range.startOffset);
  const before=beforeRange.toString().replace(/\s+/g,' ');
  const occurrence=(before.match(new RegExp(escapeRegExp(selected),'g'))||[]).length;
  const scope=anchor.dataset.highlightScope || 'stem';
  const current = state.questionProgress[question.id] || {};
  const highlights = Array.isArray(current.textHighlights) ? [...current.textHighlights] : [];
  const existing = highlights.findIndex(item => item.text === selected && item.scope===scope && n(item.occurrence)===occurrence);
  rememberHighlightState({ context:'question', questionId:question.id, highlights });
  const next = existing >= 0 ? highlights.filter((_, index) => index !== existing) : [...highlights, { text: selected, color: ui.highlightColor || 'yellow', scope, occurrence }];
  state.questionProgress[question.id] = { ...current, textHighlights: next };
  selection.removeAllRanges();
  persist();
}
function loadQuestionTimerSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(QUESTION_TIMER_KEY));
    if(!saved?.timer || (!saved.timer.sessionActive && !saved.timer.questionId && !n(saved.timer.elapsedSeconds))) return null;
    const timer = {
      mode:saved.timer.mode === 'stopwatch' ? 'stopwatch' : 'countdown',
      sessionActive:Boolean(saved.timer.sessionActive),
      pausedByUser:Boolean(saved.timer.pausedByUser),
      running:false,
      interval:null,
      questionId:saved.timer.questionId || '',
      secondsLeft:Math.max(0,n(saved.timer.secondsLeft)),
      elapsedSeconds:Math.max(0,n(saved.timer.elapsedSeconds)),
      beeped:Boolean(saved.timer.beeped),
      status:saved.timer.status || 'Sessão recuperada',
      audioContext:null
    };
    if(saved.timer.running) {
      const gap = Math.max(0, Math.floor((Date.now() - n(saved.savedAt)) / 1000));
      if(gap <= 5 * 60) {
        timer.elapsedSeconds += gap;
        if(timer.mode === 'countdown') timer.secondsLeft = Math.max(1, timer.secondsLeft - gap);
        timer.pausedByUser = false;
        timer.status = 'Sessão retomada após atualização';
      } else {
        timer.pausedByUser = true;
        timer.status = 'Sessão recuperada e pausada';
      }
    }
    return { timer, ui:saved.ui || {} };
  } catch(error) { return null; }
}
function persistQuestionTimerSession() {
  const hasSession = questionTimer.sessionActive || questionTimer.questionId || n(questionTimer.elapsedSeconds);
  if(!hasSession) {
    localStorage.removeItem(QUESTION_TIMER_KEY);
    return;
  }
  localStorage.setItem(QUESTION_TIMER_KEY, JSON.stringify({
    savedAt:Date.now(),
    timer:{
      mode:questionTimer.mode,
      sessionActive:questionTimer.sessionActive,
      pausedByUser:questionTimer.pausedByUser,
      running:questionTimer.running,
      questionId:questionTimer.questionId,
      secondsLeft:questionTimer.secondsLeft,
      elapsedSeconds:questionTimer.elapsedSeconds,
      beeped:questionTimer.beeped,
      status:questionTimer.status
    },
    ui:{
      qBlock:ui.qBlock,
      qSource:ui.qSource,
      qTopic:ui.qTopic,
      qStatus:ui.qStatus,
      qIndex:ui.qIndex,
      qFocusScheduleId:ui.qFocusScheduleId || ''
    }
  }));
}
function answerQuestion(question, selected, timedOut=false) {
  const measuredSeconds = questionTimerElapsedSeconds();
  stopQuestionTimer(true);
  resetKeyboardConfirmation();
  const previous = state.questionProgress[question.id] || {};
  const linkedLesson = scheduleForQuestion(question);
  const correct = !timedOut && selected === question.answer;
  const draftConfidence = previous.draftConfidence || '';
  const confidenceMap = { red: 20, yellow: 55, green: 90 };
  const confidence = confidenceMap[draftConfidence] || n(previous.confidence) || 0;
  const autoCorrectMode = correct
    ? (draftConfidence === 'red' ? 'Chute' : draftConfidence === 'green' ? 'Sabendo' : previous.correctMode || '')
    : previous.correctMode || '';
  const autoMissReason = !correct
    ? (draftConfidence === 'red' ? 'Não saber' : draftConfidence === 'yellow' ? 'Dúvida / já vi' : previous.missReason || '')
    : previous.missReason || '';
  const firstLog = !state.questionLogged[question.id];
  const today = localISODate(new Date());
  state.questionProgress[question.id] = {
    ...previous,
    selected,
    correct,
    timedOut,
    confidenceLevel: draftConfidence,
    confidence,
    correctMode: autoCorrectMode,
    missReason: autoMissReason,
    certainty: correct && draftConfidence === 'green' ? 90 : correct && draftConfidence === 'red' ? 30 : previous.certainty,
    answeredAt: new Date().toISOString(),
    secondsSpent: measuredSeconds || previous.secondsSpent || 0,
    attempts: n(previous.attempts) + 1,
    scheduleId: linkedLesson?.id || previous.scheduleId || ''
  };
  ui.justAnsweredId=question.id;
  delete ui.draftAnswers[question.id];
  const log = getDayLog(today);
  if(measuredSeconds > 0 && !autoStudyIsRunning('questions')) {
    log.questionsOn = true;
    log.questionMinutes = Math.round((n(log.questionMinutes) + measuredSeconds / 60) * 100) / 100;
  }
  if(firstLog) {
    state.questionLogged[question.id] = today;
    log.questionsOn = true;
    log.questions = n(log.questions) + 1;
    if(correct) log.correct = n(log.correct) + 1;
    else log.wrong = n(log.wrong) + 1;
  }
  persist();
}
function updateQuestionProgressField(question, input) {
  const field = input.dataset.progressField;
  const current = state.questionProgress[question.id] || {};
  const value = input.type === 'number' ? n(input.value) : input.value;
  state.questionProgress[question.id] = { ...current, [field]: value };
  if(field === 'notes') {
    const preview = document.getElementById('questionNotesPreview');
    if(preview) preview.innerHTML = renderMarkdown(value);
  }
  saveStateOnly();
}
function resetQuestionTimerForQuestion(question) {
  const audioContext = questionTimer.audioContext;
  if(questionTimer.interval) clearInterval(questionTimer.interval);
  questionTimer = {
    ...questionTimer,
    interval: null,
    running: false,
    questionId: question.id,
    secondsLeft: questionTimer.mode === 'countdown' ? Math.max(15,n(state.questionSettings.secondsPerQuestion)||90) : 0,
    elapsedSeconds: 0,
    beeped: false,
    pausedByUser: false,
    status: questionTimer.mode === 'countdown' && questionTimer.sessionActive ? 'Contratempo ativo' : 'Pronto',
    audioContext
  };
  persistQuestionTimerSession();
}
function maybeAutoStartQuestionTimer(question) {
  if(!question || questionResult(question)) return;
  if(!ui.questionTimerOpen || questionTimer.mode !== 'countdown' || !questionTimer.sessionActive || questionTimer.pausedByUser) return;
  if(questionTimer.running && questionTimer.questionId === question.id) return;
  if(questionTimer.questionId !== question.id) resetQuestionTimerForQuestion(question);
  startQuestionTimer(question, {auto:true});
}
function startQuestionTimer(question) {
  if(questionTimer.running) return;
  if(questionTimer.questionId && questionTimer.questionId !== question.id) resetQuestionTimerForQuestion(question);
  questionTimer.questionId = question.id;
  if(questionTimer.mode === 'countdown') questionTimer.sessionActive = true;
  questionTimer.pausedByUser = false;
  if(questionTimer.mode === 'countdown' && questionTimer.secondsLeft <= 0) questionTimer.secondsLeft = Math.max(15,n(state.questionSettings.secondsPerQuestion)||90);
  questionTimer.running = true;
  questionTimer.status = questionTimer.mode === 'countdown' ? 'Contratempo ativo' : 'Em andamento';
  questionTimer.beeped = false;
  try {
    if(!questionTimer.audioContext) questionTimer.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  } catch(error) {}
  if(questionTimer.mode === 'countdown' && questionTimer.secondsLeft <= 15) {
    questionTimer.beeped=true;
    beepQuestionTimer();
  }
  renderQuestionClock();
  questionTimer.interval = setInterval(() => {
    questionTimer.elapsedSeconds += 1;
    if(questionTimer.mode === 'countdown') {
      questionTimer.secondsLeft -= 1;
      if(questionTimer.secondsLeft === 15 && !questionTimer.beeped) {
        questionTimer.beeped = true;
        beepQuestionTimer();
      }
    }
    renderQuestionClock();
    persistQuestionTimerSession();
    if(questionTimer.mode === 'countdown' && questionTimer.secondsLeft <= 0) {
      pauseQuestionTimer('Tempo esgotado', false);
      answerQuestion(question, '', true);
    }
  }, 1000);
  persistQuestionTimerSession();
}
function pauseQuestionTimer(status='Pausado', userPause=true) {
  if(questionTimer.interval) clearInterval(questionTimer.interval);
  questionTimer.interval = null;
  questionTimer.running = false;
  questionTimer.pausedByUser = userPause && questionTimer.sessionActive;
  questionTimer.status = status;
  const statusBox = document.getElementById('questionTimerStatus');
  if(statusBox) statusBox.textContent=status;
  persistQuestionTimerSession();
}
function setQuestionTimerMode(question, mode) {
  pauseQuestionTimer();
  questionTimer.mode = mode === 'stopwatch' ? 'stopwatch' : 'countdown';
  questionTimer.sessionActive = false;
  questionTimer.pausedByUser = false;
  questionTimer.questionId = question.id;
  questionTimer.elapsedSeconds = 0;
  questionTimer.secondsLeft = questionTimer.mode === 'countdown' ? Math.max(15,n(state.questionSettings.secondsPerQuestion)||90) : 0;
  questionTimer.beeped = false;
  questionTimer.status = 'Pronto';
  persistQuestionTimerSession();
  render();
}
function questionTimerElapsedSeconds() {
  if(!questionTimer.questionId) return 0;
  return Math.max(0,n(questionTimer.elapsedSeconds));
}
function saveQuestionTimerTime() {
  const seconds = questionTimerElapsedSeconds();
  if(seconds <= 0) {
    questionTimer.status='Nenhum tempo para salvar';
    renderQuestionClock();
    return;
  }
  pauseQuestionTimer();
  const log=getDayLog(localISODate(new Date()));
  if(!autoStudyIsRunning('questions')) {
    log.questionsOn=true;
    log.questionMinutes=Math.round((n(log.questionMinutes)+seconds/60)*100)/100;
  }
  const minutes=Math.max(1,Math.round(seconds/60));
  discardQuestionTimer(false,`${minutes} min salvos nas medições do dia`, true);
  persist();
}
function discardQuestionTimer(shouldRender=true,status='Tempo descartado',keepSession=false) {
  if(questionTimer.interval) clearInterval(questionTimer.interval);
  const mode=questionTimer.mode || 'countdown';
  const audioContext=questionTimer.audioContext;
  questionTimer={mode,sessionActive:keepSession ? questionTimer.sessionActive : false,pausedByUser:false,running:false,interval:null,questionId:'',secondsLeft:0,elapsedSeconds:0,beeped:false,status,audioContext};
  if(keepSession) persistQuestionTimerSession();
  else localStorage.removeItem(QUESTION_TIMER_KEY);
  if(shouldRender) render();
}
function stopQuestionTimer(keepSession=false) {
  if(questionTimer.interval) clearInterval(questionTimer.interval);
  const mode=questionTimer.mode || 'countdown';
  const audioContext=questionTimer.audioContext;
  questionTimer={mode,sessionActive:keepSession ? questionTimer.sessionActive : false,pausedByUser:keepSession ? questionTimer.pausedByUser : false,running:false,interval:null,questionId:'',secondsLeft:0,elapsedSeconds:0,beeped:false,status:keepSession && questionTimer.sessionActive ? 'Contratempo ativo' : '',audioContext};
  if(keepSession) persistQuestionTimerSession();
  else localStorage.removeItem(QUESTION_TIMER_KEY);
}
function renderQuestionClock() {
  const clock = document.getElementById('questionClock');
  const seconds = questionTimer.mode === 'stopwatch' ? questionTimer.elapsedSeconds : questionTimer.secondsLeft;
  if(clock) {
    clock.textContent = formatClock(Math.max(0, seconds));
    clock.classList.toggle('danger', questionTimer.mode === 'countdown' && seconds <= 15);
  }
  const status=document.getElementById('questionTimerStatus');
  if(status) status.textContent=questionTimer.status || (questionTimer.running?'Em andamento':'Pronto');
}
function beepQuestionTimer() {
  try {
    const context=questionTimer.audioContext || new (window.AudioContext || window.webkitAudioContext)();
    questionTimer.audioContext=context;
    const oscillator=context.createOscillator();
    const gain=context.createGain();
    oscillator.frequency.value=880;
    gain.gain.value=0.12;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime+0.18);
  } catch(error) {}
}
function formatClock(seconds) {
  const total = Math.max(0, n(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function highlightLabel(color) {
  return ({ yellow:'amarelo', green:'verde', blue:'azul', red:'vermelho' })[color] || color;
}
function rememberHighlightState(action) {
  highlightUndoStack.push({ ...action, highlights:structuredClone(action.highlights || []) });
  if(highlightUndoStack.length > 60) highlightUndoStack.shift();
}
function undoLastHighlight() {
  const context = ui.tab === 'questoes' ? 'question' : ui.tab === 'materiais' ? 'material' : ui.tab === 'simulados' ? 'simulado' : '';
  if(!context) return false;
  let index = -1;
  for(let position=highlightUndoStack.length-1; position>=0; position-=1) {
    if(highlightUndoStack[position].context === context) { index=position; break; }
  }
  if(index < 0) return false;
  const action = highlightUndoStack.splice(index,1)[0];
  if(context === 'question') {
    const current = state.questionProgress[action.questionId] || {};
    state.questionProgress[action.questionId] = { ...current, textHighlights:action.highlights };
  } else if(context === 'material') {
    materialEditMeta(action.docId).highlights = action.highlights;
  } else {
    const run = state.simuladoRuns.find(item => item.id === action.runId);
    if(!run) return false;
    if(!run.highlights || typeof run.highlights !== 'object') run.highlights = {};
    run.highlights[action.questionId] = action.highlights;
  }
  saveStateOnly();
  render();
  return true;
}
function handleHighlightUndoKeyboard(event) {
  if(!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey || event.key.toLowerCase() !== 'z') return;
  const target = event.target;
  if(target?.matches?.('input, textarea, select, [contenteditable="true"]') || target?.closest?.('[contenteditable="true"]')) return;
  if(undoLastHighlight()) event.preventDefault();
}
function renderMarkdown(text) {
  const escaped = escapeHtml(text || '');
  return escaped
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+|data:image\/[^)]+)\)/g, '<img loading="lazy" decoding="async" alt="$1" src="$2">')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}
function materialHeadingId(text) {
  return `material-heading-${normalizedTopic(text).replace(/\s+/g,'-').slice(0,72)}`;
}
function replaceHighlightedOccurrence(html,target,item) {
  let occurrence=0;
  const wanted=Math.max(0,n(item.occurrence));
  return html.replace(new RegExp(escapeRegExp(target),'g'),match => occurrence++===wanted ? `<span class="text-mark ${escapeAttr(item.color||'yellow')}">${match}</span>` : match);
}
function renderMaterialInlineMarkdown(text,doc,blockKey='') {
  let html=escapeHtml(String(text||'').replace(/\s*\|\s*/g,' '));
  const highlights=[...new Map((materialEditMeta(doc.id).highlights||[]).filter(item=>item?.text && item.block===blockKey).map(item=>[`${item.block}|${item.occurrence}|${item.text}`,item])).values()].sort((a,b)=>b.text.length-a.text.length);
  highlights.forEach(item => {
    const target=escapeHtml(item.text);
    if(target) html=replaceHighlightedOccurrence(html,target,item);
  });
  return html
    .replace(/==([^=]+)==/g,'<mark>$1</mark>')
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g,'<em>$1</em>')
    .replace(/~~([^~]+)~~/g,'<del>$1</del>')
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}
function materialImageHtml(doc,alt,path) {
  let src='';
  const local=String(path||'').match(/^material-image:([\w-]+)$/);
  if(local) src=materialImageCache.get(local[1]) || '';
  else if(/^(?:https?:|data:image\/)/.test(path)) src=path;
  else src=`materials_library/${doc.id}/${String(path||'').replace(/^\.\//,'')}`;
  if(!src) return `<div class="material-image-placeholder">Carregando imagem salva...</div>`;
  return `<figure><img loading="lazy" decoding="async" src="${escapeAttr(src)}" alt="${escapeAttr(alt||doc.title)}"><figcaption>${escapeHtml(alt||'Figura do material')}</figcaption></figure>`;
}
function renderMaterialMarkdown(text, doc) {
  const lines = String(text || '').split(/\r?\n/);
  let html = '';
  let listTag = '';
  let codeOpen = false;
  const closeList = () => { if(listTag) { html += `</${listTag}>`; listTag=''; } };
  const openList = tag => { if(listTag!==tag) { closeList(); html+=`<${tag}>`; listTag=tag; } };
  for(let index=0;index<lines.length;index+=1) {
    let raw=lines[index].trim();
    if(raw.startsWith('```')) { closeList(); codeOpen=!codeOpen; html+=codeOpen?'<pre><code>':'</code></pre>'; continue; }
    if(codeOpen) { html+=`${escapeHtml(lines[index])}\n`; continue; }
    if(!raw || raw.startsWith('<!--')) { closeList(); continue; }
    const next=(lines[index+1]||'').trim();
    const tableHeader=raw.includes('|') && /^\|?\s*:?-{3,}/.test(next);
    if(tableHeader) {
      closeList();
      const rows=[];
      const cells=value=>value.replace(/^\||\|$/g,'').split('|').map(cell=>cell.trim());
      rows.push(cells(raw));
      index+=2;
      while(index<lines.length && lines[index].includes('|')) { rows.push(cells(lines[index].trim())); index+=1; }
      index-=1;
      html+=`<div class="material-table-wrap"><table><thead><tr>${rows[0].map((cell,column)=>`<th data-material-block="table-${index}-0-${column}">${renderMaterialInlineMarkdown(cell,doc,`table-${index}-0-${column}`)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map((row,rowIndex)=>`<tr>${row.map((cell,column)=>`<td data-material-block="table-${index}-${rowIndex+1}-${column}">${renderMaterialInlineMarkdown(cell,doc,`table-${index}-${rowIndex+1}-${column}`)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      continue;
    }
    if(raw.includes('|')) raw=raw.replace(/\s*\|\s*/g,' ');
    if(raw==='---') { closeList(); html+='<hr>'; continue; }
    const heading=raw.match(/^(#{1,4})\s+(.+)$/);
    if(heading) { closeList(); const level=heading[1].length,title=heading[2].trim(),key=`heading-${index}`; html+=`<h${level}${level===2?` id="${materialHeadingId(title)}"`:''} data-material-block="${key}">${renderMaterialInlineMarkdown(title,doc,key)}</h${level}>`; continue; }
    if(raw.startsWith('> ')) { closeList(); const key=`quote-${index}`; html+=`<blockquote data-material-block="${key}">${renderMaterialInlineMarkdown(raw.slice(2),doc,key)}</blockquote>`; continue; }
    const image=raw.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if(image) { closeList(); html+=materialImageHtml(doc,image[1],image[2]); continue; }
    const task=raw.match(/^- \[([ xX])\]\s+(.+)$/);
    if(task) { openList('ul'); const key=`task-${index}`; html+=`<li class="material-task" data-material-block="${key}"><input type="checkbox" disabled ${task[1].toLowerCase()==='x'?'checked':''}>${renderMaterialInlineMarkdown(task[2],doc,key)}</li>`; continue; }
    if(raw.startsWith('- ')) { openList('ul'); const key=`list-${index}`; html+=`<li data-material-block="${key}">${renderMaterialInlineMarkdown(raw.slice(2),doc,key)}</li>`; continue; }
    const ordered=raw.match(/^\d+[.)]\s+(.+)$/);
    if(ordered) { openList('ol'); const key=`ordered-${index}`; html+=`<li data-material-block="${key}">${renderMaterialInlineMarkdown(ordered[1],doc,key)}</li>`; continue; }
    closeList();
    const key=`paragraph-${index}`;
    html+=`<p data-material-block="${key}">${renderMaterialInlineMarkdown(raw,doc,key)}</p>`;
  }
  closeList();
  if(codeOpen) html+='</code></pre>';
  return html;
}
function renderInlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}
function escapeHtml(s) { return String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function escapeAttr(s) { return escapeHtml(s).replace(/\n/g,' '); }
function escapeRegExp(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function ensureViewData(tab) {
  if(['questoes','simulados','analise'].includes(tab)) loadQuestionBank();
  if(['simulados','analise'].includes(tab)) loadImportedSimulados();
  if(tab === 'materiais') loadMaterialLibrary();
}
function render() {
  sessionStorage.setItem(UI_TAB_KEY, ui.tab);
  renderCache = { questionStats: new Map(), flashcardStats: new Map(), videoLessons: new Map(), videoDisplay: null, manualCards: null };
  ensureViewData(ui.tab);
  renderMotivation();
  renderTabs();
  const renderers = {
    painel: renderPainel,
    pendencias: renderPendencias,
    cronograma: renderCronograma,
    aulas: renderAulas,
    questoes: renderQuestionBank,
    flashcards: renderFlashcards,
    materiais: renderMateriais,
    simulados: renderSimulados,
    analise: renderAnalise,
    areas: renderAreas,
    historico: renderHistorico,
    feynman: renderFeynman,
    prescricao: renderPrescription
  };
  renderers[ui.tab]?.();
  ensurePomodoroWidget();
  updatePomodoroWidget();
}
document.getElementById('exportBtn').onclick = () => {
  checkpointAutoStudyTime(true);
  const backup=structuredClone(state);
  backup.backupInfo={format:'soqueromed-completo',version:2,exportedAt:new Date().toISOString(),includes:['cronograma','questões respondidas','videoaulas assistidas','horas e sessões','flashcards','simulados','atividades diárias']};
  const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`backup-completo-soqueromed-${localISODate(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};
document.getElementById('importFile').onchange = e => { const file=e.target.files[0]; if(!file) return; const reader=new FileReader(); reader.onload = () => { try { const data=JSON.parse(reader.result); if(!data.schedule?.length) throw new Error('Backup inválido'); state=data; normalizeOfficialScheduleNames(); ensureRestartFromBlockTen(); persist(); } catch(err) { alert('Não consegui importar este arquivo JSON.'); } }; reader.readAsText(file); };
document.getElementById('resetBtn').onclick = () => { if(confirm('Voltar aos dados originais importados do Excel? Esta alteração também será sincronizada.')) { state=structuredClone(seed); normalizeOfficialScheduleNames(); ensureRestartFromBlockTen(); persist(); } };
document.getElementById('printBtn').onclick = () => {
  const previousTab=ui.tab;
  ui.tab='painel';
  render();
  const restore=()=>{ window.removeEventListener('afterprint',restore); ui.tab=previousTab; render(); };
  window.addEventListener('afterprint',restore);
  requestAnimationFrame(()=>window.print());
};
document.getElementById('themeToggle').onclick = event => {
  event.preventDefault();
  event.stopPropagation();
  applyTheme(document.body.classList.contains('dark') ? 'light' : 'dark');
  updateAutoStudyIndicator();
  updatePomodoroWidget();
};
applyTheme(localStorage.getItem(THEME_KEY) || 'light');
document.addEventListener('keydown', event => {
  if(ui.tab !== 'aulas' || event.altKey || event.ctrlKey || event.metaKey) return;
  const target = event.target;
  if(target?.matches?.('input,textarea,select,[contenteditable="true"]')) return;
  const video = document.getElementById('lessonVideo');
  if(!video) return;
  const rates = [0.75,1,1.25,1.5,1.75,2];
  if(event.code === 'Space') { event.preventDefault(); video.paused ? video.play() : video.pause(); }
  else if(event.key === 'ArrowRight') { event.preventDefault(); document.getElementById('videoForward10')?.click(); }
  else if(event.key === 'ArrowLeft') { event.preventDefault(); document.getElementById('videoBack10')?.click(); }
  else if(event.key === '[') { event.preventDefault(); const next=rates.find(rate => rate > video.playbackRate + .01) || rates.at(-1); video.defaultPlaybackRate=next; video.playbackRate=next; rememberVideoPlaybackRate(next); }
  else if(event.key === '=') { event.preventDefault(); video.defaultPlaybackRate=1; video.playbackRate=1; rememberVideoPlaybackRate(1); }
});
document.getElementById('accountBtn').onclick = async () => {
  if(OFFLINE_FIRST) return;
  if(currentUser) {
    if(syncTimer) {
      clearTimeout(syncTimer);
      await pushCloudState();
    }
    await sbClient.auth.signOut();
    currentUser = null;
    questionBank = [];
    localStorage.removeItem(STORAGE_KEY);
    state = structuredClone(seed);
    render();
    updateAccountUI();
    return;
  }
  document.getElementById('authPanel').classList.toggle('hidden');
};
document.getElementById('signInBtn').onclick = async () => {
  if(OFFLINE_FIRST || !sbClient) return;
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const message = document.getElementById('authMessage');
  if(!email || !password) { message.textContent = 'Informe seu e-mail e sua senha.'; return; }
  message.textContent = 'Entrando...';
  const { error } = await sbClient.auth.signInWithPassword({ email, password });
  message.textContent = error ? `Não foi possível entrar: ${error.message}` : 'Conta conectada.';
};
document.addEventListener('visibilitychange', () => {
  if(document.visibilityState === 'hidden') {
    pauseAutoStudy();
    persistQuestionTimerSession();
  }
  if(document.visibilityState === 'visible') {
    if(currentUser) pullCloudState();
    resumeAutoStudyForActiveView();
  }
});
window.addEventListener('beforeunload', () => {
  pauseAutoStudy();
  persistStudyTimerSession();
  persistQuestionTimerSession();
  saveOpenVideoPosition();
});
window.addEventListener('online', () => {
  if(currentUser) pullCloudState();
});
document.addEventListener('keydown', handleHighlightUndoKeyboard);
document.addEventListener('keydown', handleQuestionKeyboard);
startMotivationCycle();
loadMotivationMessages();
setupSidebar();
render();
loadOfficialSchedule();
loadVideoCatalog();
initCloud();
