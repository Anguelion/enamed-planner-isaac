const STORAGE_KEY = 'enamed-planner-v3';
const THEME_KEY = 'enamed-theme';
const UI_TAB_KEY = 'enamed-planner-active-tab';
const QUESTION_VIEW_KEY = 'enamed-planner-question-view';
const CADERNO_VIEW_KEY = 'enamed-planner-caderno-view';
const SIDEBAR_KEY = 'enamed-planner-sidebar-collapsed';
const QUESTION_SIDEBAR_KEY = 'enamed-question-sidebar-collapsed';
const QUESTION_TAGS_HIDDEN_KEY = 'enamed-question-tags-hidden';
const VIDEO_FOCUS_KEY = 'enamed-video-focus-mode';
const VIDEO_SOURCE_KEY = 'enamed-video-source-mode';
const VIDEO_RATE_KEY = 'enamed-video-playback-rate';
const QUESTION_BANK_ASSET_VERSION = '20260716-33';
const QUESTION_IMPORT_MAX = 200;
const QUESTION_IMPORT_DRAFT_KEY = 'soqueromed-question-import-draft';
const LOCAL_BACKUPS_KEY = 'soqueromed-local-backups-v1';
const LOCAL_BACKUP_LIMIT = 12;
const AUTO_BACKUP_RETENTION_DAYS = 7;
// O backup diário automático (feito ao virar o dia de estudo, 5h) precisa sobreviver
// pelo menos esse tempo mesmo que uma rajada de backups manuais/de segurança aconteça
// no mesmo dia — sem essa proteção, o corte por quantidade (LOCAL_BACKUP_LIMIT) podia
// derrubar o backup do dia antes mesmo de ele completar 24h.
const DAILY_BACKUP_PROTECT_DAYS = 2;
const R2_VIDEO_BASE_URL = 'https://pub-61c30ac3d3724992b527355137d4faa5.r2.dev';

// Apps instalados (PWA/WebAPK) no Android às vezes restauram a página antiga
// da memória (bfcache) em vez de rodar o JS do zero, mesmo depois de limpar os
// dados do app pelo sistema — o script continua de pé com referências para um
// armazenamento que já não existe mais, travando sem lançar nenhum erro.
window.addEventListener('pageshow', event => {
  if (event.persisted) location.reload();
});
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js', { updateViaCache:'none' })
      .then(registration => registration.update())
      .catch(() => {});
  });
}
const STUDY_TIMER_KEY = 'enamed-planner-study-timer';
const QUESTION_TIMER_KEY = 'enamed-planner-question-timer';
const POMODORO_KEY = 'enamed-planner-pomodoro';
const POMODORO_CYCLES_KEY = 'enamed-planner-pomodoro-cycles';
// Carimbo da última gravação local bem-sucedida. É ele que decide, ao abrir o
// planner, se o estado deste aparelho está na frente do que está na nuvem.
const LOCAL_STATE_STAMP_KEY = 'enamed-planner-state-updated-at';
// O navegador continua local-first; quando houver internet, sincroniza com o Supabase.
const OFFLINE_FIRST = false;
const SUPABASE_URL = 'https://wbxzptiacftymhvfkiyx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_XrBwqjkwlt4Mb4rdmE-xVw_7Vt3euvP';
const sbClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storage: window.localStorage, storageKey: 'soqueromed-auth' }
}) || null;
const MATERIAL_IMAGE_BUCKET = 'materials-images';
// As chaves acima sao fixas no codigo: qualquer copia destes arquivos (um
// servidor local de teste, uma porta nova, etc.) fala com o MESMO projeto
// Supabase de producao. Para evitar que uma sessao de teste grave dados
// reais por acidente, a sincronizacao com a nuvem so roda em origens
// conhecidas (o deploy real e o servidor offline oficial). Passe
// ?allowSync=1 na URL para autorizar explicitamente um teste pontual.
const KNOWN_SYNC_ORIGINS = ['https://enamed-planner-isaac.pages.dev', 'http://127.0.0.1:8765', 'http://localhost:8765'];
const CLOUD_SYNC_ALLOWED = KNOWN_SYNC_ORIGINS.includes(location.origin) || new URLSearchParams(location.search).get('allowSync') === '1';
const Gamification = window.ENAMED_GAMIFICATION || null;
const PlannerUX = window.ENAMED_PLANNER_UX || null;
const INITIAL_PARAMS = new URLSearchParams(window.location.search);
const INITIAL_ROUTE = PlannerUX?.parseRoute(window.location.hash) || {tab:''};
const LESSON_MIN_QUESTIONS = 10;
const LESSON_MIN_FLASHCARDS = 10;
const DAILY_QUESTION_TARGET = 20;
const DAILY_FLASHCARD_TARGET = 30;
const FLASHCARD_SPEED_TARGET_SECONDS = 30;
const FLASHCARD_SPEED_WARNING_SECONDS = 15;
const STUDY_DAY_START_HOUR = 5;
const ENAMED_AREAS = ['Clínica Médica','Pediatria','Ginecologia e Obstetrícia','Cirurgia Geral','Medicina de Família e Comunidade'];
let questionBank = [];
let materialLibrary = [];
let videoCatalog = [];
let officialSchedule = [];
let videoCatalogStatus = 'Carregando videoaulas locais...';
let materialMarkdownCache = {};
let materialImageCache = new Map();
let flashcardImageCache = new Map();
let materialEditSaveTimers = new Map();
let materialDbPromise = null;
let materialLibraryStatus = 'Carregando resumos...';
let importedSimulados = [];
let importedSimuladosStatus = 'Carregando simulados importados...';
let questionBankLoadPromise = null;
let questionImportDraft = loadQuestionImportDraft();
let materialLibraryLoadPromise = null;
let materialGlobalSearchTimer = null;
let materialReadingCleanup = null;
let materialReadingRestoreDocId = '';
let materialReadingLastSavedAt = 0;
let importedSimuladosLoadPromise = null;
let pomodoroLastSavedSecond = -1;
let pomodoroLastTickedSecond = -1;
// Essa é a primeira linha que executa de verdade no script. O JSON embutido no
// HTML (~160KB numa linha só) chega truncado em algumas redes móveis/aparelhos
// mais fracos; sem este try/catch, um JSON.parse malformado aqui derrubava o
// arquivo inteiro sem nenhum erro visível — nem os handlers de erro definidos
// mais abaixo chegam a existir quando isso acontece.
let seed;
try {
  seed = JSON.parse(document.getElementById('seed')?.textContent || '');
  if(!seed || typeof seed !== 'object' || !Array.isArray(seed.schedule)) throw new Error('seed sem cronograma válido');
} catch(error) {
  console.error('Falha ao carregar os dados iniciais (seed corrompido/truncado):', error);
  seed = { schedule: [] };
}
let state = loadState();
ensureGamificationState();
ensureImportedQuestions();
normalizeOfficialScheduleNames();
ensureRestartFromBlockTen();
ensureRestartFromCoagulopatia();
ensureDayLogs();
ensureDailyTasks();
ensureSimTopics();
ensureFeynman();
ensureQuestionProgress();
let ui = { tab: INITIAL_ROUTE.tab || INITIAL_PARAMS.get('tab') || sessionStorage.getItem(UI_TAB_KEY) || 'painel', search: '', area: 'Todas', status: 'Todos', priority: 'Todas', scheduleBlock: 'Atual', scheduleBlockPinned: false, scheduleBlockScrollLeft: 0, scheduleDay: '', scheduleWeekAnchor: studyDateKey(), refDate: studyDateKey(), analysisDate: studyDateKey(), weeklyMetric:'hours', weeklyWeekOffset:0, areaChartMetric:'hours', areaChartWeekOffset:0, qBlock: 'Todos', qSource: 'Todas', qTopic: 'Todos', qStatus: 'Não respondidas', qSearch: '', qIndex: 0, qQuestionId: INITIAL_ROUTE.questionId || '', qRouteRestorePending: Boolean(INITIAL_ROUTE.questionId), qFocusTarget: 0, qFocusQuestionIds: [], justAnsweredId: '', highlightColor: 'yellow', suppressAnswerClick: false, highlightGestureUntil: 0, draftAnswers: {}, keyboardConfirmQuestion: '', keyboardConfirmUntil: 0, questionTimerOpen: false, materialBlock: 'Todos', materialScheduleId: '', materialSearch: '', materialDocId: '', materialEditMode:false, materialFocusMode:false, materialEditScope:'full', materialSectionIndex:0, materialHighlightColor:'yellow', materialsSection:'apostila', materialSpecialty:'Todos', materialGlobalSearch:'', cadernoSearch: '', cadernoArea: 'Todas', cadernoEditId: '', flashcardFilter: 'Aprendendo', flashcardArea: 'Todas', flashcardSubarea: 'Todas', flashcardDeck: '', flashcardIndex: 0, flashcardSessionDone: false, flashcardShowLibrary: false, flashcardNewCardType: 'basic', flashcardFocusMode: false, flashcardFocusPaused: false, flashcardSpeedMode: false, flashcardCardStartedAt: 0, flashcardSpeedCardId: '', revealedCards: {}, activeSimRunId: INITIAL_ROUTE.attemptId || '', simulationLibraryOpen: !INITIAL_ROUTE.attemptId, personalTaskDate: studyDateKey(), personalTaskFilter:'all', personalTaskEditorMode:null, personalTaskEditorTrigger:'', videoLessonId:'', videoSourceId:INITIAL_ROUTE.videoId || '', prescriptionTab:'prescricao', prescriptionCaseId:'', prescriptionScreen:'home', prescriptionReviewOpen:false, prescriptionPen:'pen', videoFocusMode: localStorage.getItem(VIDEO_FOCUS_KEY) === '1', videoSourceMode: INITIAL_PARAMS.get('videoSource') || localStorage.getItem(VIDEO_SOURCE_KEY) || 'auto', videoPlaybackRate: Number(localStorage.getItem(VIDEO_RATE_KEY)) || 1 };
ui.legacyImportPreview = null;
try {
  const savedCadernoView = JSON.parse(localStorage.getItem(CADERNO_VIEW_KEY) || '{}');
  if(savedCadernoView.review) ui.cadernoReview = savedCadernoView.review;
} catch(error) {}
ui.cadernoReview ||= 'Agendadas';
ui.rankPromotion = null;
ui.simulationRewardSummary = null;
try { Object.assign(ui, JSON.parse(localStorage.getItem(QUESTION_VIEW_KEY) || '{}')); } catch(error) {}
if(ui.tab === 'hoje') ui.tab = 'painel';
if(ui.flashcardFilter === 'Devidos') ui.flashcardFilter = 'Aprendendo';
const restoredQuestionTimer = loadQuestionTimerSession();
if(restoredQuestionTimer?.ui) Object.assign(ui, restoredQuestionTimer.ui, {questionTimerOpen:true});
let questionTimer = restoredQuestionTimer?.timer || { mode: 'countdown', sessionActive: false, pausedByUser: false, running: false, interval: null, questionId: '', secondsLeft: 0, elapsedSeconds: 0, beeped: false, status: '', audioContext: null };
let studyTimeTracker = loadStudyTimerSession();
let pomodoroInterval = null;
let pomodoroAlarmInterval = null;
let pomodoroPanelCloseTimer = null;
let dailyMissionPanelCloseTimer = null;
let questionSearchRenderTimer = null;
let cadernoSearchRenderTimer = null;
let pomodoro = loadPomodoroSession();
let simuladoTimer = { interval: null, runId: '' };
let motivationRefreshInterval = null;
let motivationRenderedKey = '';
let activeVideoProgressCleanup = null;
let dashboardCountdownInterval = null;
let highlightUndoStack = [];
let highlightPopupDismissHandler = null;
let highlightPopupEscapeHandler = null;
let currentUser = null;
let syncTimer = null;
let syncInFlight = false;
let cloudDirty = false;
let cloudRevision = 0;
let lastCloudSyncAt = 0;
let cloudSyncPoll = null;
let cloudPushPoll = null;
let serverClockOffsetMs = 0;
let lastSyncConflictAt = 0;
let syncConflictCount = 0;
let timerAuditInterval = null;
let syncTelemetry = { pushCount: 0, pullCount: 0, mergeCount: 0, errorCount: 0, lastPushAt: 0, lastPullAt: 0 };
let autoRecoveryInterval = null;
let offlineStartedAt = 0;
let cloudBackups = [];
let cloudBackupsLoading = false;
let cloudBackupsReady = false;
let cloudBackupsError = '';
let localBackups = loadLocalBackups();
let renderCache = { questionStats: new Map(), questionAvailability: new Map(), questionStatsReady:false, questionAvailabilityReady:false, questionAvailabilityScheduleKey:'', questionFilterKey:'', questionFilterResults:null, questionBlockStats:null, questionSummary:null, flashcardStats: new Map(), videoLessons: new Map(), videoDisplay: null, manualCards: null };
let questionSidebarCollapsed = localStorage.getItem(QUESTION_SIDEBAR_KEY) === '1';
let questionTagsHidden = localStorage.getItem(QUESTION_TAGS_HIDDEN_KEY) === '1';
const views = [
  ['painel','Dashboard','dashboard'],
  ['cronograma','Missão','mission'], ['historico','Histórico','history'], ['areas','Áreas','areas'], ['analise','Análise','analysis'],
  ['aulas','Aulas','video'], ['questoes','Questões','question'], ['simulados','Simulados','simulation'], ['caderno-erros','Caderno de erros','caderno'], ['flashcards','Flashcards','flashcard'], ['materiais','Materiais','materials'],
  ['prescricao','Prescrição','prescription'], ['anatomia','Anatomia','xray'], ['semiologia','Semiologia','medical'], ['ecg','ECG','heart'], ['radiografia','Radiografia','xray'], ['feynman','Feynman','feynman'],
  ['importar-questoes','Adicionar questões','upload'],
  ['ferramentas','Ferramentas','settings']
];
const VIEW_GROUPS = {
  cronograma:'Meus estudos', historico:'Meus estudos', areas:'Meus estudos', analise:'Meus estudos',
  aulas:'Conteúdo', questoes:'Conteúdo', simulados:'Conteúdo', 'caderno-erros':'Conteúdo', flashcards:'Conteúdo', materiais:'Conteúdo',
  prescricao:'Habilidade', anatomia:'Habilidade', semiologia:'Habilidade', ecg:'Habilidade', radiografia:'Habilidade', feynman:'Habilidade',
  'importar-questoes':'Outros',
  ferramentas:'Configuração'
};
applyTheme(localStorage.getItem(THEME_KEY) || 'light');
// Toda gravação local passa por aqui. Antes, um localStorage cheio fazia o
// setItem lançar QuotaExceededError no meio de persist(): o restante do
// handler era abortado e, pior, nada mais era salvo até recarregar. Depois de
// horas de estudo, o F5 trazia de volta o último estado que coube no disco.
// `var` de propósito: writeLocalState é chamada durante o bootstrap (linha ~83),
// antes de este ponto do arquivo ser avaliado. Com `let`, a leitura cairia na
// zona morta temporal e abortaria a inicialização.
var localStorageWarningShown = false;
// Esta função roda no bootstrap, antes de várias declarações `let` deste
// arquivo, por isso todo acesso a estado externo fica protegido: um
// ReferenceError de zona morta aqui abortaria a inicialização do planner.
function localStateStampIso() {
  try { return new Date(Date.now() + serverClockOffsetMs).toISOString(); }
  catch(error) { return new Date().toISOString(); }
}
function dropOldestLocalBackups() {
  // Os backups locais são a maior massa descartável no armazenamento:
  // sacrificamos os mais antigos para que o estudo do dia caiba.
  try {
    if(!Array.isArray(localBackups) || !localBackups.length) return false;
    localBackups = localBackups.slice(0, Math.max(0, localBackups.length - Math.max(1, Math.ceil(localBackups.length / 2))));
    try { localStorage.setItem(LOCAL_BACKUPS_KEY, JSON.stringify(localBackups)); }
    catch(error) { try { localStorage.removeItem(LOCAL_BACKUPS_KEY); } catch(nested) {} }
    return true;
  } catch(error) {
    try { localStorage.removeItem(LOCAL_BACKUPS_KEY); return true; } catch(nested) { return false; }
  }
}
// `var` de propósito: writeLocalState roda no bootstrap antes desta linha ser
// avaliada; com `let` a leitura cai na zona morta temporal e derruba o app
// inteiro (foi exatamente isso que travou a tela em alguns aparelhos).
var allowLargeProgressDrop = false;
function progressFingerprint(s) {
  const sumLens = obj => Object.values(obj || {}).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
  return {
    flashcards: (Array.isArray(s?.flashcardLibrary) ? s.flashcardLibrary.length : 0) + sumLens(s?.questionFlashcards) + sumLens(s?.videoFlashcards),
    questions: Object.keys(s?.questionProgress || {}).length
  };
}
// Os incidentes de "sumiu progresso" sempre vieram de uma gravação silenciosa
// (merge com bug, cache velho, restauração ruim) por cima de dados maiores.
// Antes de sobrescrever, comparamos com o que já estava salvo: se a queda for
// grande, guardamos o estado maior em backup e avisamos, em vez de só apagar.
function guardAgainstSilentProgressLoss() {
  if(allowLargeProgressDrop) return;
  try {
    const previous = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if(!previous) return;
    const before = progressFingerprint(previous);
    const after = progressFingerprint(state);
    const bigDrop = (metric) => before[metric] >= 20 && after[metric] < before[metric] * 0.5;
    if(bigDrop('flashcards') || bigDrop('questions')) {
      localBackups = [
        { id:`local-backup-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, label:`Cópia de segurança automática (antes de queda de progresso)`, created_at:new Date().toISOString(), reason:'queda-detectada', data:{ ...previous, backupInfo:{ format:'soqueromed-completo', version:3, exportedAt:new Date().toISOString() } } },
        ...localBackups
      ].slice(0, LOCAL_BACKUP_LIMIT);
      saveLocalBackups();
      showStudyToast('Detectei uma queda grande em questões/flashcards e salvei uma cópia de segurança em Ferramentas > Backups locais antes de continuar.');
    }
  } catch(error) { console.warn('Falha ao checar queda de progresso:', error); }
}
function writeLocalState() {
  guardAgainstSilentProgressLoss();
  const payload = JSON.stringify(state);
  for(let attempt = 0; attempt < 4; attempt += 1) {
    try {
      localStorage.setItem(STORAGE_KEY, payload);
      localStorage.setItem(LOCAL_STATE_STAMP_KEY, localStateStampIso());
      // Se a tentativa anterior tinha ficado marcada como "Sem espaço", a
      // recuperação (descartar backups antigos) já resolveu — o indicador não
      // deve continuar preso num erro que não existe mais. currentUser pode não
      // existir ainda durante o bootstrap, por isso tudo aqui é best-effort.
      if(localStorageWarningShown) {
        try {
          if(currentUser && sbClient && CLOUD_SYNC_ALLOWED) scheduleCloudSave();
          else setSyncStatus('Local', '', 'Espaço liberado automaticamente');
        } catch(error) {}
      }
      localStorageWarningShown = false;
      return true;
    } catch(error) {
      if(dropOldestLocalBackups()) continue;
      console.error('Falha ao salvar no armazenamento local:', error);
      warnLocalStorageFull();
      return false;
    }
  }
  warnLocalStorageFull();
  return false;
}
function warnLocalStorageFull() {
  // Nunca falhar em silêncio: perder horas de estudo sem aviso foi o pior
  // sintoma do bug original.
  try {
    setSyncStatus('Sem espaço', 'error', 'Armazenamento do navegador cheio: o estudo não está sendo salvo neste aparelho');
    if(localStorageWarningShown) return;
    localStorageWarningShown = true;
    showStudyToast('Armazenamento do navegador cheio: apague backups locais em Ferramentas agora para não perder o estudo.');
    if(currentUser && CLOUD_SYNC_ALLOWED) { cloudDirty = true; pushCloudState(); }
  } catch(error) {
    // Bootstrap: DOM/estado de nuvem ainda podem não existir. O console basta.
    console.error('Armazenamento local cheio.', error);
  }
}
function localStateStamp() {
  return Date.parse(localStorage.getItem(LOCAL_STATE_STAMP_KEY) || '') || 0;
}
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(saved && typeof saved === 'object') {
      const base = structuredClone(seed);
      return {
        ...base,
        ...saved,
        schedule:Array.isArray(saved.schedule) && saved.schedule.length ? saved.schedule : base.schedule
      };
    }
  } catch(e) {}
  return structuredClone(seed);
}
function ensureGamificationState() {
  if(!state || typeof state !== 'object') return;
  if(!Gamification) {
    state.gamification = state.gamification && typeof state.gamification === 'object' ? state.gamification : {xpTransactions:[],importBatches:[],profile:{cachedTotalXP:0}};
    return;
  }
  state = Gamification.ensurePlannerState(state).state;
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
  writeLocalState();
}
function ensureRestartFromCoagulopatia() {
  const version = 'coagulopatia-restart-2026-08-05-v1';
  if(state.schedulePlanVersion2 === version) return;
  const restartDate = '2026-08-05';
  const vacationUntil = '2026-08-09';
  const schedule = state.schedule || [];
  const anchor = schedule.find(item => n(item.block) === 11 && normalizedTopic(item.topic).includes('coagulopatia'));
  if(!anchor) return;
  const cutoffOrder = n(anchor.lessonOrder);
  const lessons = schedule.filter(item => n(item.block) > 11 || (n(item.block) === 11 && n(item.lessonOrder) >= cutoffOrder))
    .sort((a,b)=>n(a.block)-n(b.block) || n(a.lessonOrder)-n(b.lessonOrder) || n(a.row)-n(b.row) || byDate(a,b));
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
  state.reschedule = {
    ...(state.reschedule || {}),
    fromBlock: 11,
    fromTopic: 'Coagulopatias',
    restartDate,
    vacationUntil,
    weekdaysOnly: true,
    method: 'Bloco 11 (a partir de Coagulopatias) em diante, reiniciando em 05/08/2026. Até 2 aulas por dia útil até 09/08/2026; depois 1 aula por dia útil.'
  };
  state.schedulePlanVersion2 = version;
  writeLocalState();
}
// Passe completo de normalização do estado. É caro: com o cronograma e o banco
// de questões carregados, reconcileCompletedBlockXP sozinho leva ~25 ms.
var lastStateNormalizeAt = 0;
function normalizePlannerState() {
  ensureImportedQuestions(); ensureDayLogs(); ensureDailyTasks(); ensureSimTopics(); ensureFeynman(); ensureQuestionProgress(); ensureGamificationState(); reconcileCompletedBlockXP(); reviveHiddenHistoryDates();
  lastStateNormalizeAt = Date.now();
}
function persist() { normalizePlannerState(); invalidateActivityRenderCache(); writeLocalState(); if(currentUser && sbClient) { cloudDirty = true; setSyncStatus('Não enviado', '', 'Use o botão Enviar para mandar para a nuvem'); } render(); }
let saveStateOnlyTimer = null;
let pendingCacheInvalidate = false;
function flushSaveStateOnly() {
  clearTimeout(saveStateOnlyTimer);
  saveStateOnlyTimer = null;
  // A normalização sempre acontece antes de gravar: o que muda é a frequência,
  // não a garantia de que o estado salvo está íntegro.
  normalizePlannerState();
  if(pendingCacheInvalidate) { invalidateActivityRenderCache(); pendingCacheInvalidate = false; }
  writeLocalState();
  scheduleCloudSave();
}
// Digitar dispara um saveStateOnly por tecla. O passe completo de normalização
// custava ~36 ms em cada uma delas e travava o campo de texto — pior ao segurar
// Backspace, que repete o evento dezenas de vezes por segundo. Aqui só marcamos
// o que está pendente; o trabalho pesado acontece uma única vez, no flush, que é
// o momento em que o estado realmente precisa estar íntegro para ser gravado.
function saveStateOnly(options={}) {
  if(options.invalidate !== false) pendingCacheInvalidate = true;
  clearTimeout(saveStateOnlyTimer);
  saveStateOnlyTimer = setTimeout(flushSaveStateOnly, 400);
}
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'hidden') { if(saveStateOnlyTimer) flushSaveStateOnly(); flushCloudSaveNow(); } });
window.addEventListener('beforeunload', () => { if(saveStateOnlyTimer) flushSaveStateOnly(); flushCloudSaveNow(); });

function ensureQuestionProgress() {
  if(!state.questionProgress || typeof state.questionProgress !== 'object') state.questionProgress = {};
  if(!state.questionProgressDeleted || typeof state.questionProgressDeleted !== 'object') state.questionProgressDeleted = {};
  if(!state.questionEdits || typeof state.questionEdits !== 'object') state.questionEdits = {};
  if(!state.questionDataRepairs || typeof state.questionDataRepairs !== 'object') state.questionDataRepairs = {};
  if(!state.questionDataRepairs.indicadoresSaudeV2) {
    const officialAnswers=['D','D','C','D','D','C','C','D','A','B','C','E','A','A'];
    officialAnswers.forEach((answer,index)=>{
      const questionId=`b10-indicadores-saude-q${String(index+1).padStart(2,'0')}`;
      const edit=state.questionEdits[questionId];
      if(edit) {
        edit.answer=answer;
        delete edit.comment;
      }
      const progress=state.questionProgress[questionId];
      if(progress?.answeredAt && progress.selected) {
        progress.correct=String(progress.selected).toUpperCase()===answer;
      }
    });
    state.questionDataRepairs.indicadoresSaudeV2=true;
  }
  if(!state.questionLogged || typeof state.questionLogged !== 'object') state.questionLogged = {};
  if(!state.questionSettings || typeof state.questionSettings !== 'object') state.questionSettings = { secondsPerQuestion: 90 };
  if(!state.materials || typeof state.materials !== 'object') state.materials = {};
  if(!state.flashcardProgress || typeof state.flashcardProgress !== 'object') state.flashcardProgress = {};
  if(!state.questionFlashcards || typeof state.questionFlashcards !== 'object') state.questionFlashcards = {};
  if(!state.videoFlashcards || typeof state.videoFlashcards !== 'object') state.videoFlashcards = {};
  if(!state.flashcardSettings || typeof state.flashcardSettings !== 'object') state.flashcardSettings = {};
  if(!Array.isArray(state.flashcardReviewHistory)) state.flashcardReviewHistory = [];
  if(!Array.isArray(state.flashcardLibrary)) state.flashcardLibrary = [];
  if(!state.flashcardSystem || typeof state.flashcardSystem !== 'object') state.flashcardSystem = {};
  if(!Array.isArray(state.flashcardSystem.reviewLogs)) state.flashcardSystem.reviewLogs = [];
  if(!Array.isArray(state.flashcardSystem.captureSessions)) state.flashcardSystem.captureSessions = [];
  if(!Array.isArray(state.flashcardSystem.versions)) state.flashcardSystem.versions = [];
  if(!Array.isArray(state.flashcardSystem.undoStack)) state.flashcardSystem.undoStack = [];
  if(!state.flashcardSystem.activeReviewSessionId) state.flashcardSystem.activeReviewSessionId = newFlashcardId('fc-session');
  if(!state.flashcardSystem.profile || typeof state.flashcardSystem.profile !== 'object') state.flashcardSystem.profile = {};
  state.flashcardSystem.profile = { targetRetention:0.9, maximumInterval:3650, fuzz:true, leechThreshold:8, ...state.flashcardSystem.profile };
  if(!state.importedQuestionTags || typeof state.importedQuestionTags !== 'object') state.importedQuestionTags = {};
  if(!state.dashboardSettings || typeof state.dashboardSettings !== 'object') state.dashboardSettings = {};
  if(!state.casoDoDia || typeof state.casoDoDia !== 'object') state.casoDoDia = {};
  if(!state.videoPlayer || typeof state.videoPlayer !== 'object') state.videoPlayer = {};
  if(!state.videoPlayer.bookmarks || typeof state.videoPlayer.bookmarks !== 'object') state.videoPlayer.bookmarks = {};
  Object.entries(state.videoPlayer.bookmarks).forEach(([sourceId,entries]) => {
    if(!Array.isArray(entries)) { state.videoPlayer.bookmarks[sourceId]=[]; return; }
    state.videoPlayer.bookmarks[sourceId]=entries.map((bookmark,index)=>({
      ...bookmark,
      id:bookmark.id || `bookmark-${normalizedTopic(sourceId).replace(/\s+/g,'-')}-${n(bookmark.time)}-${index}`
    }));
  });
  if(!state.videoPlayer.resume || typeof state.videoPlayer.resume !== 'object') state.videoPlayer.resume = {};
  if(!state.videoPlayer.resumeUpdatedAt || typeof state.videoPlayer.resumeUpdatedAt !== 'object') state.videoPlayer.resumeUpdatedAt = {};
  if(!state.videoPlayer.watched || typeof state.videoPlayer.watched !== 'object') state.videoPlayer.watched = {};
  if(!state.videoPlayer.watchedAt || typeof state.videoPlayer.watchedAt !== 'object') state.videoPlayer.watchedAt = {};
  if(!state.videoPlayer.progress || typeof state.videoPlayer.progress !== 'object') state.videoPlayer.progress = {};
  Object.keys(state.videoPlayer.resume).forEach(sourceId => {
    state.videoPlayer.progress[sourceId] = PlannerUX?.normalizeVideoProgress(state.videoPlayer.progress[sourceId], {
      videoId:sourceId,
      currentTime:state.videoPlayer.resume[sourceId],
      playbackRate:n(state.videoPlayer.progress[sourceId]?.playbackRate) || n(localStorage.getItem(VIDEO_RATE_KEY)) || 1,
      updatedAt:state.videoPlayer.resumeUpdatedAt[sourceId] || '',
      completed:Boolean(state.videoPlayer.watched[sourceId])
    }) || state.videoPlayer.progress[sourceId];
  });
  if(!state.videoPlayer.pinned || typeof state.videoPlayer.pinned !== 'object') state.videoPlayer.pinned = { enabled:false, lessonId:'', sourceId:'' };
  if(!state.videoPlayer.lastOpen || typeof state.videoPlayer.lastOpen !== 'object') state.videoPlayer.lastOpen = { lessonId:'', sourceId:'', updatedAt:'' };
  state.videoPlayer.lastOpen = { lessonId:'', sourceId:'', updatedAt:'', ...state.videoPlayer.lastOpen };
  state.videoPlayer.bookmarks = Object.fromEntries(Object.entries(state.videoPlayer.bookmarks).map(([sourceId, entries]) => [sourceId, entries.map(bookmark => ({ ...bookmark, updatedAt:bookmark.updatedAt || bookmark.createdAt || '' }))]));
  if(!state.dailyCheckins || typeof state.dailyCheckins !== 'object') state.dailyCheckins = {};
  if(!state.prescriptionLab || typeof state.prescriptionLab !== 'object') state.prescriptionLab = {};
  if(!Array.isArray(state.prescriptionLab.cases)) state.prescriptionLab.cases = [];
  if(!state.prescriptionLab.library || typeof state.prescriptionLab.library !== 'object') state.prescriptionLab.library = {medications:[],exams:[],others:[]};
  ['medications','exams','others'].forEach(key => { if(!Array.isArray(state.prescriptionLab.library[key])) state.prescriptionLab.library[key]=[]; });
  if(!Array.isArray(state.hiddenHistoryDates)) state.hiddenHistoryDates = [];
  if(!state.historyHiddenAt || typeof state.historyHiddenAt !== 'object') state.historyHiddenAt = {};
  state.hiddenHistoryDates.forEach(date => {
    if(!state.historyHiddenAt[date]) state.historyHiddenAt[date] = state.historyClearedAt || new Date().toISOString();
  });
  if(!state.dashboardSettings.countdownDate) {
    state.dashboardSettings.countdownDate = [...(state.schedule || [])].map(x => x.date).filter(Boolean).sort().at(-1) || '2026-11-01';
  }
  state.schedule.forEach(item => {
    if(item.manualQ === undefined) item.manualQ = n(item.q);
    if(item.manualFC === undefined) item.manualFC = n(item.fc);
    item.metaQ = LESSON_MIN_QUESTIONS;
    item.metaFC = LESSON_MIN_FLASHCARDS;
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
  state.flashcardLibrary.forEach(card => normalizeFlashcardRecord(card));
  reconcileQuestionDailyLog();
}

function setQuestionProgress(questionId, patch={}, updatedAt=new Date().toISOString()) {
  if(!state.questionProgress || typeof state.questionProgress !== 'object') state.questionProgress = {};
  if(!state.questionProgressDeleted || typeof state.questionProgressDeleted !== 'object') state.questionProgressDeleted = {};
  delete state.questionProgressDeleted[questionId];
  state.questionProgress[questionId] = { ...(state.questionProgress[questionId] || {}), ...patch, updatedAt };
  return state.questionProgress[questionId];
}
function removeQuestionProgress(questionId, deletedAt=new Date().toISOString()) {
  if(!state.questionProgress || typeof state.questionProgress !== 'object') state.questionProgress = {};
  if(!state.questionProgressDeleted || typeof state.questionProgressDeleted !== 'object') state.questionProgressDeleted = {};
  state.questionProgressDeleted[questionId] = deletedAt;
  delete state.questionProgress[questionId];
}

function reconcileQuestionDailyLog() {
  const byDate = {};
  Object.entries(state.questionLogged || {}).forEach(([questionId, date]) => {
    if(!date) return;
    const progress = state.questionProgress?.[questionId];
    if(!progress?.answeredAt) return;
    if(!byDate[date]) byDate[date] = { total:0, correct:0, wrong:0 };
    byDate[date].total += 1;
    if(progress.correct) byDate[date].correct += 1;
    else byDate[date].wrong += 1;
  });
  Object.entries(byDate).forEach(([date, counts]) => {
    const log = getDayLog(date);
    log.questionsOn = true;
    log.questions = Math.max(n(log.questions), counts.total);
    log.correct = Math.max(n(log.correct), counts.correct);
    log.wrong = Math.max(n(log.wrong), counts.wrong);
  });
}

function normalizedTopic(value='') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
const TOPIC_ALIASES = {
  'dpoc': 'doenca pulmonar obstrutiva cronica dpoc',
  'trauma conceitos iniciais atls': 'trauma conceitos iniciais e atendimento inicial ao trauma atls',
  'introducao ao sist reprodutor feminino': 'introducao ao sistema reprodutor feminino',
  'avaliacao das anemias': 'avaliacao do hemograma e anemias',
  'purpura trombocitopenica imune': 'avaliacao do hemograma e anemias',
  'anemia de doenca cronica': 'avaliacao do hemograma e anemias',
  'anemia e hemotransfusao': 'avaliacao do hemograma e anemias',
  'anemia ferropriva': 'avaliacao do hemograma e anemias',
  'anemia hemolitica autoimune': 'avaliacao do hemograma e anemias',
  'deficiencia de vitamina b12': 'avaliacao do hemograma e anemias',
  'hiperferritinemia': 'avaliacao do hemograma e anemias',
  'pancitopenia': 'avaliacao do hemograma e anemias',
  'cofbasics vitalidade fetal': 'cofbasics avaliacao de vitalidade fetal g o',
  'atls letra e e politrauma': 'atls letra e e seguimento do tratamento do politrauma',
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
  'sangramentos 1 metade gestacao': 'sangramentos da primeira metade da gestacao',
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
  'cofbasics propedeutica uroginecologia': 'cofbasics propedeutica em uroginecologia g o',
  'transtornos alimentares e de personalidade': 'transtornos alimentares somatoformes e de personalidade',
  'alergologia hipersensibilidade': 'alergologia reacoes de hipersensibilidade rinite e angioedema',
  'tecnica operatoria fios e anestesicos': 'tecnica operatoria aspectos gerais fios de sutura e anestesicos locais',
  'pals suporte avancado pediatria': 'suporte avancado de vida em pediatria pals',
  'itu e meningite pediatria': 'infeccao de trato urinario e meningite',
  'doencas relacionadas ao trabalho': 'principais doencas e agravos relacionados ao trabalho'
};
function canonicalTopic(value='') { const normalized = normalizedTopic(value); return TOPIC_ALIASES[normalized] || normalized; }
function repairUniformScheduleDates() {
  const schedule = Array.isArray(state.schedule) ? state.schedule : [];
  const dates = [...new Set(schedule.map(item => item.date).filter(Boolean))];
  if(schedule.length < 20 || dates.length !== 1 || state.scheduleRepairVersion === 'uniform-date-v1') return false;
  const seedSchedule = Array.isArray(seed.schedule) ? seed.schedule : [];
  const byOrder = new Map(seedSchedule.map(item => [`${n(item.block)}:${n(item.lessonOrder)}`, item]));
  const byTopic = new Map(seedSchedule.map(item => [`${n(item.block)}:${canonicalTopic(item.topic)}`, item]));
  const repaired = schedule.map(item => {
    const source = byOrder.get(`${n(item.block)}:${n(item.lessonOrder)}`) || byTopic.get(`${n(item.block)}:${canonicalTopic(item.topic)}`);
    if(!source?.date) return item;
    return { ...item, originalDate: source.date, date: source.date, day: weekdayName(source.date), catchUp: false };
  });
  const matched = repaired.filter((item,index) => item.date !== schedule[index].date).length;
  if(matched < Math.floor(schedule.length * 0.8)) return false;
  state.schedule = repaired;
  state.schedulePlanVersion = '';
  ensureRestartFromBlockTen();
  state.scheduleRepairVersion = 'uniform-date-v1';
  writeLocalState();
  return true;
}
const VIDEO_SCHEDULE_OVERRIDES = {
  '8:cofbasics lesoes elementares pediatria': { block:9, topic:'CofBasics - Lesões Elementares (Pediatria)' },
  '9:dor pelvica': { block:12, topic:'Dor Pélvica' },
  '18:cofbasics propedeutica em uroginecologia': { block:18, order:8 }
};
function priorityClass(priority='') { return `priority-${normalizedTopic(priority) || 'baixa'}`; }
function priorityLegend() {
  const items = [['alta','Alta'],['media','Média'],['baixa','Baixa']];
  return `<div class="priority-legend muted">Prioridade: ${items.map(([cls,label])=>`<span class="priority-legend-item"><span class="priority-legend-dot priority-${cls}"></span>${label}</span>`).join('')}</div>`;
}
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
      metaQ: LESSON_MIN_QUESTIONS, metaFC: LESSON_MIN_FLASHCARDS, metaH: n(current?.metaH), notes: current?.notes || ''
    });
  });
  state.schedule = ordered;
  state.officialScheduleVersion = version;
  ensureDayLogs();
  saveStateOnly();
  return true;
}
function questionMatchesSchedule(question, item) {
  if(!question || !item || String(question.collectionBlock) !== String(item.block)) return false;
  const candidates = [question.sourceLabel, question.topic, question.source].map(canonicalTopic).filter(Boolean);
  const target = canonicalTopic(item.topic);
  if(candidates.includes(target)) return true;
  // Evita ligar questões a uma aula apenas porque compartilham uma palavra curta
  // (por exemplo, "trauma" ou "diabetes") dentro do mesmo bloco.
  return candidates.some(candidate => candidate.length >= 12 && (target.includes(candidate) || candidate.includes(target)));
}
function scheduleForQuestion(question) {
  if(question.scheduleId) {
    const linked = state.schedule.find(item => item.id === question.scheduleId);
    if(linked && questionMatchesSchedule(question, linked)) return linked;
  }
  const sameBlock = state.schedule.filter(item => String(item.block) === String(question.collectionBlock));
  const candidates = [question.sourceLabel, question.topic, question.source].map(canonicalTopic).filter(Boolean);
  return sameBlock.find(item => candidates.includes(canonicalTopic(item.topic)))
    || sameBlock.find(item => candidates.some(candidate => {
      const topic = canonicalTopic(item.topic);
      return candidate.length >= 12 && (topic.includes(candidate) || candidate.includes(topic));
    }))
    || null;
}
function backfillQuestionScheduleLinks() {
  const version = 'question-schedule-linking-v3';
  if(state.questionScheduleLinkVersion === version) return 0;
  let linked = 0;
  questionBank.forEach(question => {
    const progress = state.questionProgress?.[question.id];
    if(!progress?.answeredAt) return;
    const existing = progress.scheduleId && state.schedule.find(item => item.id === progress.scheduleId);
    if(existing && questionMatchesSchedule(question, existing)) return;
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
  ensureQuestionStatsIndex();
  return renderCache.questionStats.get(scheduleId) || { done:0, correct:0, rate:0 };
}
function ensureQuestionStatsIndex() {
  const scheduleKey = (state.schedule || []).map(item => `${item.id}:${item.block}:${canonicalTopic(item.topic)}`).join('|');
  if(renderCache.questionAvailabilityScheduleKey !== scheduleKey) {
    renderCache.questionAvailabilityReady = false;
    renderCache.questionAvailabilityScheduleKey = scheduleKey;
  }
  if(renderCache.questionStatsReady && renderCache.questionAvailabilityReady) return;
  const buildStats = !renderCache.questionStatsReady;
  const buildAvailability = !renderCache.questionAvailabilityReady;
  if(buildStats) renderCache.questionStats.clear();
  if(buildAvailability) renderCache.questionAvailability.clear();
  const scheduleById = new Map((state.schedule || []).map(item => [item.id, item]));
  questionBank.forEach(question => {
    const result = questionResult(question);
    if(!buildAvailability && !result?.answeredAt) return;
    const direct = result?.scheduleId ? scheduleById.get(result.scheduleId) : null;
    const lesson = direct && String(question.collectionBlock) === String(direct.block) ? direct : scheduleForQuestion(question);
    if(!lesson) return;
    if(buildAvailability) renderCache.questionAvailability.set(lesson.id, n(renderCache.questionAvailability.get(lesson.id)) + 1);
    if(!buildStats || !result?.answeredAt) return;
    const stats = renderCache.questionStats.get(lesson.id) || { done:0, correct:0, rate:0 };
    stats.done += 1;
    if(result.correct) stats.correct += 1;
    renderCache.questionStats.set(lesson.id, stats);
  });
  renderCache.questionStats.forEach(stats => { stats.rate = stats.done ? stats.correct / stats.done : 0; });
  renderCache.questionStatsReady = true;
  renderCache.questionAvailabilityReady = true;
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

function gamificationUserId() { return currentUser?.id || 'local'; }
function gamificationTransactions() { ensureGamificationState(); return state.gamification.xpTransactions; }
function completedAcademicBlockIds() {
  const blocks=[...new Set((state.schedule || []).map(item=>n(item.block)).filter(block=>block>=1 && block<=30))];
  return blocks.filter(block=>{
    const lessons=state.schedule.filter(item=>n(item.block)===block);
    return lessons.length>0 && lessons.every(item=>statusOf(item)==='Concluído');
  }).map(String);
}
function awardGamificationXP(input) {
  if(!Gamification) return {transaction:null,duplicate:true};
  ensureGamificationState();
  const active=Gamification.getActiveElementMultipliers?.(state.gamification,input.activity_type,input.occurred_at || new Date()) || {multiplier:1,element:'',rewardId:''};
  const result=Gamification.awardXPIdempotently(state.gamification.xpTransactions,{...input,user_id:gamificationUserId(),multipliers:{...(input.multipliers||{}),element:active.multiplier},metadata:{...(input.metadata||{}),element:active.element||'',elementRewardId:active.rewardId||''}},state.gamification.rules);
  if(!result.duplicate) Gamification.refreshProfile(state.gamification);
  return result;
}
function latestQuestionXPTransaction(questionId) {
  return gamificationTransactions().filter(item=>item.activity_type==='question_answer' && item.source_type==='question' && item.source_id===questionId).sort((a,b)=>Date.parse(b.occurred_at||'')-Date.parse(a.occurred_at||''))[0] || null;
}
function awardQuestionAnswerXP(question,progress) {
  if(!Gamification || !question || !progress?.answeredAt) return;
  const previous=latestQuestionXPTransaction(question.id);
  const calculation=Gamification.calculateQuestionXP({correct:Boolean(progress.correct),occurredAt:progress.answeredAt,previousOccurredAt:previous?.occurred_at},state.gamification?.rules);
  awardGamificationXP({activity_type:'question_answer',source_type:'question',source_id:question.id,source_event_id:`answer:${question.id}:${progress.answeredAt}`,base_xp:calculation.finalBaseXP,reason:'question_answer',occurred_at:progress.answeredAt,metadata:{correct:Boolean(progress.correct),selected:progress.selected||'',answer:question.answer||'',attempt:n(progress.attempts),scheduleId:progress.scheduleId||'',repetitionMultiplier:calculation.repetitionMultiplier}});
}
function awardQuestionReviewXP(questionId,progress) {
  if(!progress || progress.correct || !progress.answeredAt || String(progress.postLearning||'').trim().length<20) return;
  awardGamificationXP({activity_type:'question_error_review',source_type:'question',source_id:questionId,source_event_id:`review:${questionId}:${progress.answeredAt}`,base_xp:3,reason:'question_error_reviewed',occurred_at:new Date().toISOString(),metadata:{reviewedError:true,answerEventAt:progress.answeredAt,scheduleId:progress.scheduleId||''}});
}
function awardVideoProgressXP(session) {
  if(!session?.id || n(session.seconds)<=0) return;
  const calculation=Gamification?.calculateVideoXP({seconds:session.seconds},state.gamification?.rules);
  if(!calculation) return;
  awardGamificationXP({activity_type:'video_progress',source_type:'video_session',source_id:session.scheduleId||session.id,source_event_id:session.id,base_xp:calculation.baseXP,reason:'video_active_minutes',occurred_at:session.savedAt||new Date().toISOString(),metadata:{seconds:Math.round(n(session.seconds)),scheduleId:session.scheduleId||''}});
}
function awardVideoCompletionXP(videoId,completedAt) {
  if(!videoId || !completedAt) return;
  awardGamificationXP({activity_type:'video_completion',source_type:'video',source_id:videoId,source_event_id:`completion:${videoId}`,base_xp:n(state.gamification?.rules?.video?.completionBonus)||5,reason:'video_completion_90',occurred_at:completedAt,metadata:{completionThreshold:0.9}});
}
function reconcileRankProgress(completedBlocks) {
  if(!Gamification?.evaluateRankPromotion) return;
  Gamification.applyRankAcceleration?.(state.gamification,completedBlocks);
  const result=Gamification.evaluateRankPromotion(state.gamification.rankPresentation,completedBlocks,state.gamification.rankProgress);
  state.gamification.rankPresentation=result.state;
  if(result.promotion) ui.rankPromotion=result.promotion;
}
function reconcileCompletedBlockXP() {
  if(!Gamification || !state?.schedule?.length || !videoCatalog.length || !questionBank.length) return;
  ensureGamificationState();
  const completed=completedAcademicBlockIds();
  reconcileRankProgress(completed.length);
  if(!Array.isArray(state.gamification.observedCompletedBlockIds)) {
    const ledgerBlocks=gamificationTransactions().filter(item=>item.activity_type==='block_completion').map(item=>String(item.source_id));
    state.gamification.observedCompletedBlockIds=[...new Set([...completed,...ledgerBlocks])];
    state.gamification.blockBaselineInitializedAt=new Date().toISOString();
    return;
  }
  const observed=new Set(state.gamification.observedCompletedBlockIds.map(String));
  completed.filter(blockId=>!observed.has(blockId)).forEach(blockId=>{
    const lessons=state.schedule.filter(item=>String(item.block)===blockId);
    awardGamificationXP({activity_type:'block_completion',source_type:'block',source_id:blockId,source_event_id:`block:${blockId}:first-completion`,base_xp:n(state.gamification?.rules?.block?.completionBonus)||100,reason:'block_completion',occurred_at:new Date().toISOString(),metadata:{academicProgress:true,lessonCount:lessons.length}});
    observed.add(blockId);
  });
  state.gamification.observedCompletedBlockIds=[...observed];
}
function mergeGamificationState(remoteGamification={},localGamification={}) {
  if(!Gamification) return localGamification || remoteGamification || {};
  const remote=Gamification.ensureState(structuredClone(remoteGamification || {}));
  const local=Gamification.ensureState(structuredClone(localGamification || {}));
  const transactions=new Map();
  [...remote.xpTransactions,...local.xpTransactions].forEach(transaction=>{
    const key=transaction.idempotency_key || Gamification.transactionKey(transaction);
    if(key && !transactions.has(key)) transactions.set(key,transaction);
  });
  const batches=new Map();
  [...remote.importBatches,...local.importBatches].forEach(batch=>{
    if(!batch?.id) return;
    const previous=batches.get(batch.id);
    if(!previous || Date.parse(batch.reverted_at||batch.committed_at||batch.created_at||0)>=Date.parse(previous.reverted_at||previous.committed_at||previous.created_at||0)) batches.set(batch.id,batch);
  });
  const mergeByKey=(items,keyOf)=>[...new Map(items.filter(Boolean).map(item=>[keyOf(item),item])).values()];
  const remoteProgress=remote.rankProgress || {};
  const localProgress=local.rankProgress || {};
  const fragmentEvents=mergeByKey([...(remoteProgress.fragmentEvents||[]),...(localProgress.fragmentEvents||[])],item=>item.eventKey || item.attemptId);
  const medallionEvents=mergeByKey([...(remoteProgress.medallionEvents||[]),...(localProgress.medallionEvents||[])],item=>item.eventKey || item.sourceFragmentEventKey);
  const promotionHistory=mergeByKey([...(remoteProgress.promotionHistory||[]),...(localProgress.promotionHistory||[])],item=>item.eventKey || `${item.type}:${item.rangeKey}`);
  const rankProgress={...remoteProgress,...localProgress,fragmentEvents,medallionEvents,promotionHistory,fragments:Math.max(n(remoteProgress.fragments),n(localProgress.fragments)),simulationMedallions:Math.max(n(remoteProgress.simulationMedallions),n(localProgress.simulationMedallions)),simulationMedallionsUsed:Math.max(n(remoteProgress.simulationMedallionsUsed),n(localProgress.simulationMedallionsUsed)),globalSubstitutionsUsed:Math.max(n(remoteProgress.globalSubstitutionsUsed),n(localProgress.globalSubstitutionsUsed))};
  const elementRewards=mergeByKey([...(remote.elementRewards||[]),...(local.elementRewards||[])],item=>item.eventKey || item.id);
  const legacyChests=mergeByKey([...(remote.legacyChests||[]),...(local.legacyChests||[])],item=>item.id || item.attemptId);
  const merged=Gamification.ensureState({...remote,...local,xpTransactions:[...transactions.values()],importBatches:[...batches.values()],rankProgress,elementRewards,legacyChests});
  Gamification.refreshProfile(merged);
  return merged;
}
async function ensureCloudImportBatch(batchId) {
  if(!Gamification?.FEATURE_FLAGS?.relationalSync) return false;
  const batch=state.gamification?.importBatches?.find(item=>item.id===batchId);
  if(!batch || !currentUser || !sbClient) return true;
  // A reversão relacional é feita exclusivamente pela RPC, após os lançamentos
  // originais chegarem ao servidor. Não antecipe o status do lote pelo cliente.
  const payload={id:batch.id,user_id:currentUser.id,status:'committed',source:batch.source||'planner',fingerprint:batch.fingerprint||batch.id,preview_json:batch.preview_json||{},committed_at:batch.committed_at||null,reverted_at:null,totals_json:batch.totals_json||{}};
  const {error}=await sbClient.from('import_batches').upsert(payload,{onConflict:'id'});
  return !error;
}
async function syncGamificationLedger(limit=40) {
  if(!Gamification?.FEATURE_FLAGS?.relationalSync) return {disabled:true,synced:0};
  const schemaUnavailableAt=n(state.gamification?.cloudSchemaUnavailableAt);
  if(!currentUser || !sbClient || !Gamification || (schemaUnavailableAt && Date.now()-schemaUnavailableAt<5*60*1000)) return;
  ensureGamificationState();
  const synced=state.gamification.cloudSyncedTransactionIds ||= {};
  const pending=state.gamification.xpTransactions.filter(transaction=>!synced[transaction.id]).slice(0,limit);
  for(const transaction of pending) {
    if(transaction.import_batch_id && !(await ensureCloudImportBatch(transaction.import_batch_id))) break;
    if(transaction.activity_type==='import_reversal' && transaction.import_batch_id) {
      const {error}=await sbClient.rpc('revert_gamification_import',{p_batch_id:transaction.import_batch_id});
      if(error) {
        if(/function|schema cache|does not exist/i.test(error.message||'')) state.gamification.cloudSchemaUnavailableAt=Date.now();
        break;
      }
      state.gamification.xpTransactions.filter(item=>item.import_batch_id===transaction.import_batch_id && item.activity_type==='import_reversal').forEach(item=>{synced[item.id]=true;});
      continue;
    }
    const event={activity_type:transaction.activity_type,source_type:transaction.source_type,source_id:transaction.source_id,source_event_id:transaction.source_event_id,reason:transaction.reason,occurred_at:transaction.occurred_at,metadata:transaction.metadata||{},import_batch_id:transaction.import_batch_id||null,is_legacy:Boolean(transaction.is_legacy)};
    const {error}=await sbClient.rpc('process_study_event',{p_event:event});
    if(error) {
      if(/function|schema cache|does not exist/i.test(error.message||'')) state.gamification.cloudSchemaUnavailableAt=Date.now();
      else console.warn('Falha ao sincronizar transação de XP:',error);
      break;
    }
    synced[transaction.id]=true;
    state.gamification.cloudSchemaUnavailableAt=0;
  }
  writeLocalState();
}

function applyTheme(theme) {
  const selected = theme === 'dark' ? 'dark' : 'light';
  document.body.classList.toggle('dark', selected === 'dark');
  localStorage.setItem(THEME_KEY, selected);
  const button = document.getElementById('themeToggle');
  if(button) {
    button.innerHTML = `${iconSvg(selected === 'dark' ? 'light' : 'theme')}<span>Modo de exibição</span>`;
    button.title = selected === 'dark' ? 'Usar tema claro' : 'Usar tema escuro';
    button.setAttribute('aria-label', button.title);
  }
}

function setSyncStatus(text, kind='', fullText='') {
  const box = document.getElementById('syncStatus');
  const label = document.getElementById('syncText');
  if(!box || !label) return;
  label.textContent = text;
  box.title = `${fullText || text} · clique para detalhes`;
  box.className = `sync-status ${kind}`;
}
function showStudyToast(message) {
  document.querySelector('.study-toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'study-toast';
  toast.setAttribute('role','status');
  toast.innerHTML = `<strong>✓ ${escapeHtml(message)}</strong><button type="button" aria-label="Fechar">×</button>`;
  const closeButton=toast.querySelector('button');
  if(closeButton) closeButton.onclick = () => toast.remove();
  document.body.append(toast);
  setTimeout(() => toast.remove(), 6500);
}
function scheduleIdentityKey(item) {
  if(!item || typeof item !== 'object') return '';
  const topic = canonicalTopic(item.topic || item.title || '');
  const area = canonicalTopic(item.area || '');
  const block = String(item.block ?? '').trim();
  const order = String(item.lessonOrder ?? item.row ?? '').trim();
  return `${block}|${order}|${topic}|${area}`;
}
function buildScheduleIdRemap(remoteSchedule, localSchedule) {
  const remap = new Map();
  const localItems = Array.isArray(localSchedule) ? localSchedule : [];
  const byExact = new Map(localItems.map(item => [scheduleIdentityKey(item), item]).filter(([key,item]) => key && item?.id));
  const byBlockTopic = new Map();
  const byTopicArea = new Map();
  localItems.forEach(item => {
    if(!item?.id) return;
    const blockTopic = `${String(item.block ?? '').trim()}|${canonicalTopic(item.topic || '')}`;
    const topicArea = `${canonicalTopic(item.topic || '')}|${canonicalTopic(item.area || '')}`;
    if(blockTopic !== '|') byBlockTopic.set(blockTopic, item);
    if(topicArea !== '|') byTopicArea.set(topicArea, item);
  });
  (Array.isArray(remoteSchedule) ? remoteSchedule : []).forEach(remoteItem => {
    if(!remoteItem?.id) return;
    let match = byExact.get(scheduleIdentityKey(remoteItem));
    if(!match) match = byBlockTopic.get(`${String(remoteItem.block ?? '').trim()}|${canonicalTopic(remoteItem.topic || '')}`);
    if(!match) match = byTopicArea.get(`${canonicalTopic(remoteItem.topic || '')}|${canonicalTopic(remoteItem.area || '')}`);
    if(match?.id) remap.set(remoteItem.id, match.id);
  });
  return remap;
}
function remapScheduleRecord(record, remap) {
  if(!record || typeof record !== 'object' || !remap?.size) return record;
  const scheduleId = record.scheduleId || record.lessonId;
  const mapped = scheduleId && remap.get(scheduleId);
  if(!mapped) return record;
  const clone = structuredClone(record);
  if(clone.scheduleId) clone.scheduleId = mapped;
  if(clone.lessonId) clone.lessonId = mapped;
  return clone;
}
function mergePlannerActivityState(remoteState, localState, preferLocal=false) {
  const remote = remoteState && typeof remoteState === 'object' ? structuredClone(remoteState) : {};
  const local = localState && typeof localState === 'object' ? localState : {};
  const merged = preferLocal ? { ...remote, ...local } : { ...local, ...remote };
  const remoteHiddenAt = remote.historyHiddenAt && typeof remote.historyHiddenAt === 'object' ? remote.historyHiddenAt : {};
  const localHiddenAt = local.historyHiddenAt && typeof local.historyHiddenAt === 'object' ? local.historyHiddenAt : {};
  merged.historyHiddenAt = {};
  new Set([...Object.keys(remoteHiddenAt), ...Object.keys(localHiddenAt)]).forEach(date => {
    const remoteTime = timestampOf(remoteHiddenAt[date]);
    const localTime = timestampOf(localHiddenAt[date]);
    merged.historyHiddenAt[date] = localTime >= remoteTime ? localHiddenAt[date] : remoteHiddenAt[date];
  });
  merged.hiddenHistoryDates = [...new Set([
    ...(Array.isArray(remote.hiddenHistoryDates) ? remote.hiddenHistoryDates : []),
    ...(Array.isArray(local.hiddenHistoryDates) ? local.hiddenHistoryDates : []),
    ...Object.keys(merged.historyHiddenAt)
  ])];
  merged.historyClearedAt = timestampOf(local.historyClearedAt) >= timestampOf(remote.historyClearedAt) ? (local.historyClearedAt || '') : (remote.historyClearedAt || '');
  const scheduleIdRemap = buildScheduleIdRemap(remote.schedule, local.schedule);
  if(scheduleIdRemap.size) {
    Object.keys(remote.questionProgress || {}).forEach(id => { remote.questionProgress[id] = remapScheduleRecord(remote.questionProgress[id], scheduleIdRemap); });
    remote.studySessions = (remote.studySessions || []).map(record => remapScheduleRecord(record, scheduleIdRemap));
    remote.flashcardLibrary = (remote.flashcardLibrary || []).map(record => remapScheduleRecord(record, scheduleIdRemap));
    remote.flashcardSystem = { ...(remote.flashcardSystem || {}), reviewLogs: (remote.flashcardSystem?.reviewLogs || []).map(record => remapScheduleRecord(record, scheduleIdRemap)) };
  }

  const remoteProgress = remote.questionProgress || {};
  const localProgress = local.questionProgress || {};
  const remoteDeleted = remote.questionProgressDeleted || {};
  const localDeleted = local.questionProgressDeleted || {};
  merged.questionProgress = {};
  merged.questionProgressDeleted = {};
  new Set([...Object.keys(remoteDeleted), ...Object.keys(localDeleted)]).forEach(id => {
    const remoteTime=Date.parse(remoteDeleted[id]||'')||0;
    const localTime=Date.parse(localDeleted[id]||'')||0;
    merged.questionProgressDeleted[id]=localTime>=remoteTime?localDeleted[id]:remoteDeleted[id];
  });
  new Set([...Object.keys(remoteProgress), ...Object.keys(localProgress), ...Object.keys(merged.questionProgressDeleted)]).forEach(id => {
    const record = PlannerUX?.mergeQuestionProgressRecord
      ? PlannerUX.mergeQuestionProgressRecord(remoteProgress[id],localProgress[id],preferLocal)
      : structuredClone(localProgress[id] || remoteProgress[id] || null);
    const recordTime=PlannerUX?.questionProgressTimestamp?.(record)||Date.parse(record?.updatedAt||record?.answeredAt||'')||0;
    const deletedTime=Date.parse(merged.questionProgressDeleted[id]||'')||0;
    if(record && (!merged.questionProgressDeleted[id] || recordTime>deletedTime)) {
      merged.questionProgress[id]=record;
      delete merged.questionProgressDeleted[id];
    }
  });

  const remoteLogged = remote.questionLogged || {};
  const localLogged = local.questionLogged || {};
  merged.questionLogged = {};
  new Set([...Object.keys(remoteLogged), ...Object.keys(localLogged)]).forEach(id => {
    const dates = [remoteLogged[id], localLogged[id]].filter(Boolean).sort();
    if(dates.length) merged.questionLogged[id] = dates.at(-1);
  });

  const remoteLogs = new Map((remote.dayLogs || []).map(log => [log.date, log]));
  const localLogs = new Map((local.dayLogs || []).map(log => [log.date, log]));
  merged.dayLogs = [...new Set([...remoteLogs.keys(), ...localLogs.keys()])].map(date => {
    const remoteLog = remoteLogs.get(date) || defaultDayLog(date);
    const localLog = localLogs.get(date) || defaultDayLog(date);
    const questionSource = n(localLog.questions) >= n(remoteLog.questions) ? localLog : remoteLog;
    const log = { ...remoteLog, ...localLog, date };
    ['flashcards','manualFlashcards','videos','flashcardMinutes','lessonMinutes','questionMinutes','materialMinutes','simuladoMinutes'].forEach(field => {
      log[field] = Math.max(n(remoteLog[field]), n(localLog[field]));
    });
    ['questions','correct','wrong'].forEach(field => { log[field] = n(questionSource[field]); });
    ['flashcardsOn','videosOn','questionsOn'].forEach(field => { log[field] = Boolean(remoteLog[field] || localLog[field]); });
    ['videoNames','notes','pace'].forEach(field => { log[field] = localLog[field] || remoteLog[field] || ''; });
    log.mood = n(localLog.mood) || n(remoteLog.mood);
    return log;
  }).sort((a,b) => a.date.localeCompare(b.date));

  merged.flashcardSystem = { ...(remote.flashcardSystem || {}), ...(local.flashcardSystem || {}) };
  merged.flashcardSystem.reviewLogs = mergeRecordsById(remote.flashcardSystem?.reviewLogs, local.flashcardSystem?.reviewLogs, preferLocal);
  // Mesma noção de "questão igual" usada ao montar o banco (bloco + enunciado),
  // não o contentHash: assim uma correção de gabarito/alternativa continua
  // sendo tratada como a mesma questão em vez de virar uma cópia divergente.
  const importedByKey = new Map();
  [...(remote.importedQuestions || []), ...(local.importedQuestions || [])].forEach(question => {
    if(!question?.id) return;
    const key = questionDuplicateKey(question);
    const previous = importedByKey.get(key);
    if(!previous) { importedByKey.set(key, question); return; }
    const previousTime = Date.parse(previous.updatedAt || previous.incorporatedAt || previous.createdAt || '') || 0;
    const currentTime = Date.parse(question.updatedAt || question.incorporatedAt || question.createdAt || '') || 0;
    importedByKey.set(key, currentTime >= previousTime ? question : previous);
  });
  merged.importedQuestions = [...importedByKey.values()];
  merged.deletedQuestions = { ...(remote.deletedQuestions || {}), ...(local.deletedQuestions || {}) };
  // Ao contrário do spread raso do topo (que faz um lado vencer por inteiro),
  // essas três dependem do id da questão: uniões por chave evitam que editar
  // uma questão num aparelho apague edições/flashcards/tags feitos no outro.
  merged.questionEdits = preferLocal ? { ...(remote.questionEdits || {}), ...(local.questionEdits || {}) } : { ...(local.questionEdits || {}), ...(remote.questionEdits || {}) };
  merged.importedQuestionTags = preferLocal ? { ...(remote.importedQuestionTags || {}), ...(local.importedQuestionTags || {}) } : { ...(local.importedQuestionTags || {}), ...(remote.importedQuestionTags || {}) };
  merged.questionFlashcards = {};
  new Set([...Object.keys(remote.questionFlashcards || {}), ...Object.keys(local.questionFlashcards || {})]).forEach(id => {
    const cards = mergeRecordsById(remote.questionFlashcards?.[id], local.questionFlashcards?.[id], preferLocal);
    if(cards.length) merged.questionFlashcards[id] = cards;
  });
  const incorporationById = new Map();
  [...(remote.incorporationHistory || []), ...(local.incorporationHistory || [])].forEach(entry => {
    if(!entry?.id) return;
    const previous = incorporationById.get(entry.id);
    incorporationById.set(entry.id, {...previous, ...entry, deletedAt: previous?.deletedAt || entry.deletedAt || ''});
  });
  merged.incorporationHistory = [...incorporationById.values()];

  const remoteTasks = Array.isArray(remote.dailyTasks) ? remote.dailyTasks : [];
  const localTasks = Array.isArray(local.dailyTasks) ? local.dailyTasks : [];
  const tasksById = new Map();
  [...remoteTasks, ...localTasks].forEach(task => {
    if(!task?.id || !String(task.text || '').trim()) return;
    const previous = tasksById.get(task.id);
    if(!previous || (Date.parse(task.updatedAt || task.completedAt || task.createdAt || '') || 0) >= (Date.parse(previous.updatedAt || previous.completedAt || previous.createdAt || '') || 0)) {
      tasksById.set(task.id, structuredClone(task));
    }
  });
  merged.dailyTasks = PlannerUX?.compactOccurrences ? PlannerUX.compactOccurrences([...tasksById.values()]) : [...tasksById.values()];

  // Datas, bloco, tema e ordem fazem parte do plano local/oficial e não são
  // atividade sincronizável. Manter a estrutura local impede que um cronograma
  // remoto corrompido (por exemplo, todas as aulas na mesma data) contamine
  // todos os aparelhos; da nuvem entram apenas os campos de progresso.
  const remoteSchedule = new Map((remote.schedule || []).map(item => [scheduleIdRemap.get(item.id) || item.id, item]));
  const scheduleBase = Array.isArray(local.schedule) && local.schedule.length ? local.schedule : (remote.schedule || []);
  merged.schedule = scheduleBase.map(item => {
    const remoteItem = remoteSchedule.get(item.id);
    if(!remoteItem) return structuredClone(item);
    return {
      ...item,
      manualQ: Math.max(n(item.manualQ ?? item.q), n(remoteItem.manualQ ?? remoteItem.q)),
      manualFC: Math.max(n(item.manualFC ?? item.fc), n(remoteItem.manualFC ?? remoteItem.fc)),
      hours: Math.max(n(item.hours), n(remoteItem.hours)),
      notes: preferLocal ? (item.notes || remoteItem.notes || '') : (remoteItem.notes || item.notes || '')
    };
  });

  merged.flashcardLibrary = mergeRecordsById(remote.flashcardLibrary, local.flashcardLibrary, preferLocal);
  merged.casoDoDia = {};
  new Set([...Object.keys(remote.casoDoDia || {}), ...Object.keys(local.casoDoDia || {})]).forEach(key => {
    const r = remote.casoDoDia?.[key] || {}, l = local.casoDoDia?.[key] || {};
    merged.casoDoDia[key] = { revealed: Math.max(n(r.revealed), n(l.revealed)), wrongCount: Math.max(n(r.wrongCount), n(l.wrongCount)), solved: Boolean(r.solved || l.solved), gaveUp: Boolean(r.gaveUp || l.gaveUp), explanationOpen: Boolean(l.explanationOpen || r.explanationOpen) };
  });
  merged.videoFlashcards = {};
  new Set([...Object.keys(remote.videoFlashcards || {}), ...Object.keys(local.videoFlashcards || {})]).forEach(id => {
    const cards = mergeRecordsById(remote.videoFlashcards?.[id], local.videoFlashcards?.[id], preferLocal);
    if(cards.length) merged.videoFlashcards[id] = cards;
  });
  merged.studySessions = mergeRecordsById(remote.studySessions, local.studySessions, preferLocal);
  merged.videoPlayer = mergeVideoPlayerState(remote.videoPlayer, local.videoPlayer, preferLocal);
  merged.gamification = mergeGamificationState(remote.gamification, local.gamification);

  const remoteRuns = Array.isArray(remote.simuladoRuns) ? remote.simuladoRuns : [];
  const localRuns = Array.isArray(local.simuladoRuns) ? local.simuladoRuns : [];
  const runsById = new Map();
  [...remoteRuns, ...localRuns].forEach(run => {
    if(!run?.id) return;
    const previous = runsById.get(run.id);
    if(!previous || timestampOf(run.updatedAt) >= timestampOf(previous.updatedAt)) runsById.set(run.id, run);
  });
  merged.simuladoRuns = [...runsById.values()];

  const remoteSims = Array.isArray(remote.simulados) ? remote.simulados : [];
  const localSims = Array.isArray(local.simulados) ? local.simulados : [];
  const simsById = new Map();
  [...remoteSims, ...localSims].forEach(sim => {
    if(!sim?.id) return;
    simsById.set(sim.id, sim);
  });
  merged.simulados = [...simsById.values()];

  const remoteMaterials = remote.materials && typeof remote.materials==='object' ? remote.materials : {};
  const localMaterials = local.materials && typeof local.materials==='object' ? local.materials : {};
  merged.materials = {};
  new Set([...Object.keys(remoteMaterials), ...Object.keys(localMaterials)]).forEach(docId => {
    const remoteDoc = remoteMaterials[docId] || {};
    const localDoc = localMaterials[docId] || {};
    const base = timestampOf(localDoc.updatedAt) >= timestampOf(remoteDoc.updatedAt) ? localDoc : remoteDoc;
    const reading = timestampOf(localDoc.lastReadAt) >= timestampOf(remoteDoc.lastReadAt) ? localDoc : remoteDoc;
    const highlightsByKey = new Map();
    [...(remoteDoc.highlights || []), ...(localDoc.highlights || [])].forEach(highlight => {
      highlightsByKey.set(`${highlight.text}|${highlight.color}|${highlight.block}|${highlight.occurrence}`, highlight);
    });
    merged.materials[docId] = {
      ...base,
      ...Object.fromEntries(['lastReadAt','lastHeadingId','lastHeadingText','lastScrollRatio','lastTitle','lastArea','lastBlock','lastCategory'].map(key => [key,reading[key]])),
      highlights: [...highlightsByKey.values()]
    };
  });

  return merged;
}
function timestampOf(value) { return Date.parse(value || '') || 0; }
// PC e celular podem ter relogios dessincronizados; sem isso, o merge por
// "quem tem o updatedAt mais novo" pode escolher errado (o aparelho com o
// relogio adiantado sempre "vence", mesmo com a edicao mais antiga).
function updateServerClockOffset(serverIso) {
  const serverAt = Date.parse(serverIso || '');
  if(!serverAt) return;
  serverClockOffsetMs = serverAt - Date.now();
}
function nowIso() { return new Date(Date.now() + serverClockOffsetMs).toISOString(); }
function mergeVideoPlayerState(remotePlayer={}, localPlayer={}, preferLocal=false) {
  const remote = remotePlayer && typeof remotePlayer === 'object' ? remotePlayer : {};
  const local = localPlayer && typeof localPlayer === 'object' ? localPlayer : {};
  const merged = preferLocal ? { ...remote, ...local } : { ...local, ...remote };
  const sourceIds = new Set([...Object.keys(remote.resume || {}), ...Object.keys(local.resume || {})]);
  merged.resume = {};
  merged.resumeUpdatedAt = {};
  sourceIds.forEach(sourceId => {
    const remoteTime = timestampOf(remote.resumeUpdatedAt?.[sourceId]);
    const localTime = timestampOf(local.resumeUpdatedAt?.[sourceId]);
    const useLocal = localTime > remoteTime || (localTime === remoteTime && preferLocal);
    merged.resume[sourceId] = n((useLocal ? local : remote).resume?.[sourceId]);
    merged.resumeUpdatedAt[sourceId] = (useLocal ? local : remote).resumeUpdatedAt?.[sourceId] || '';
  });
  merged.watched = { ...(remote.watched || {}), ...(local.watched || {}) };
  merged.watchedAt = { ...(remote.watchedAt || {}), ...(local.watchedAt || {}) };
  const bookmarkSources = new Set([...Object.keys(remote.bookmarks || {}), ...Object.keys(local.bookmarks || {})]);
  merged.bookmarks = {};
  bookmarkSources.forEach(sourceId => {
    const points = new Map();
    [...(remote.bookmarks?.[sourceId] || []), ...(local.bookmarks?.[sourceId] || [])].forEach((point,index) => {
      const id = point?.id || `legacy-${sourceId}-${n(point?.time)}-${index}`;
      const previous = points.get(id);
      if(!previous || timestampOf(point.updatedAt || point.createdAt) >= timestampOf(previous.updatedAt || previous.createdAt)) points.set(id, {...point, id});
    });
    merged.bookmarks[sourceId] = [...points.values()].sort((a,b) => n(a.time)-n(b.time));
  });
  const remoteOpen = remote.lastOpen || {};
  const localOpen = local.lastOpen || {};
  const useLocalOpen = timestampOf(localOpen.updatedAt) > timestampOf(remoteOpen.updatedAt) || (timestampOf(localOpen.updatedAt) === timestampOf(remoteOpen.updatedAt) && preferLocal);
  merged.lastOpen = {...(useLocalOpen ? localOpen : remoteOpen)};
  return merged;
}
function recordRecencyTimestamp(record) {
  return Date.parse(record?.updatedAt || record?.lastReviewedAt || record?.reviewedAt || record?.editedAt || record?.createdAt || '') || 0;
}
function mergeRecordsById(remoteRecords, localRecords, preferLocal=false) {
  const records = new Map();
  [...(remoteRecords || []).map(record => ({record, side:'remote'})), ...(localRecords || []).map(record => ({record, side:'local'}))]
    .forEach(({record, side}, index) => {
      const key = record?.id || `${record?.date || ''}|${record?.kind || ''}|${record?.savedAt || ''}|${index}`;
      const previous = records.get(key);
      if(!previous) { records.set(key, {record, side}); return; }
      const previousTime = recordRecencyTimestamp(previous.record);
      const currentTime = recordRecencyTimestamp(record);
      // Sem timestamp em nenhum dos dois lados não há como saber qual é mais
      // recente: cai no preferLocal, igual às demais uniões desta função de
      // merge, em vez de sempre manter o último item do array (que antes
      // deixava o dispositivo local vencer por acaso da ordem de spread).
      const useCurrent = currentTime !== previousTime
        ? currentTime > previousTime
        : (side === 'local' ? preferLocal : !preferLocal);
      if(useCurrent) records.set(key, {record, side});
    });
  return [...records.values()].map(({record}) => record);
}
// O backup diário (reason:'daily') não entra na disputa por espaço do corte por
// quantidade enquanto estiver dentro da janela de proteção — só backups
// manuais/de segurança são cortados quando o total passa de LOCAL_BACKUP_LIMIT.
// Depois da janela, quem decide se ele fica ou sai é maintainDailyLocalBackup
// (retenção por dias, um por dia).
function capBackupList(list) {
  const protectMs = DAILY_BACKUP_PROTECT_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const protectedDaily = [];
  const rest = [];
  (list || []).forEach(item => {
    const isProtected = item?.reason === 'daily' && (now - (Date.parse(item.created_at || '') || 0)) < protectMs;
    (isProtected ? protectedDaily : rest).push(item);
  });
  return [...protectedDaily, ...rest.slice(0, Math.max(0, LOCAL_BACKUP_LIMIT - protectedDaily.length))]
    .sort((a,b) => (Date.parse(b.created_at || '') || 0) - (Date.parse(a.created_at || '') || 0));
}
function loadLocalBackups() {
  try {
    const backups = JSON.parse(localStorage.getItem(LOCAL_BACKUPS_KEY) || '[]');
    return Array.isArray(backups) ? capBackupList(backups.filter(item => item?.id && item?.data)) : [];
  } catch(error) {
    return [];
  }
}
function saveLocalBackups() {
  let backups = capBackupList(localBackups);
  while(backups.length) {
    try {
      localStorage.setItem(LOCAL_BACKUPS_KEY, JSON.stringify(backups));
      localBackups = backups;
      return;
    } catch(error) {
      // Sem espaco no localStorage para todos os backups locais: reduz pela
      // metade e tenta de novo, em vez de falhar e nao salvar nenhum.
      backups = backups.slice(0, Math.floor(backups.length / 2));
    }
  }
  console.warn('Não foi possível salvar nenhum backup local: armazenamento cheio.');
}
function createLocalBackup(label='', {silent=false, reason='manual'}={}) {
  const payload = fullPlannerBackup();
  const createdAt = payload.backupInfo.exportedAt;
  localBackups = capBackupList([
    {
      id:`local-backup-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      label:String(label || '').trim() || `Backup local de ${backupDateTime(createdAt)}`,
      created_at:createdAt,
      reason,
      data:payload
    },
    ...localBackups
  ]);
  saveLocalBackups();
  if(!silent) showStudyToast('Backup local salvo neste aparelho.');
  if(ui.tab === 'ferramentas') renderFerramentas();
  return localBackups[0];
}
function createSafetyLocalBackup(reason='segurança') {
  try {
    if(!state?.schedule?.length) return null;
    return createLocalBackup(`Cópia automática · ${reason}`, {silent:true, reason});
  } catch(error) {
    console.warn('Falha ao criar backup local de segurança:', error);
    return null;
  }
}
function restoreLocalBackup(id) {
  const item = localBackups.find(backup => backup.id === id);
  if(!item?.data?.schedule?.length) { alert('Não consegui abrir esse backup local.'); return; }
  if(!confirm('Restaurar este backup local neste aparelho? O estado atual será salvo antes de restaurar.')) return;
  createSafetyLocalBackup('antes de restaurar backup local');
  allowLargeProgressDrop = true;
  state = structuredClone(item.data);
  normalizeOfficialScheduleNames();
  ensureRestartFromBlockTen();
  ensureDayLogs(); ensureDailyTasks(); ensureSimTopics(); ensureFeynman(); ensureQuestionProgress();
  invalidateActivityRenderCache();
  writeLocalState();
  allowLargeProgressDrop = false;
  cloudDirty = true;
  scheduleCloudSave();
  showStudyToast(`Backup local restaurado: ${item.label}.`);
  render();
}
function deleteLocalBackup(id) {
  if(!confirm('Excluir este backup local deste aparelho?')) return;
  localBackups = localBackups.filter(backup => backup.id !== id);
  saveLocalBackups();
  if(ui.tab === 'ferramentas') renderFerramentas();
}
function invalidateActivityRenderCache() {
  renderCache.questionStats.clear();
  renderCache.questionStatsReady = false;
  renderCache.questionFilterKey = '';
  renderCache.questionFilterResults = null;
  renderCache.questionBlockStats = null;
  renderCache.questionSummary = null;
  renderCache.flashcardStats.clear();
  renderCache.manualCards = null;
}
function invalidateQuestionBankRenderCache() {
  invalidateActivityRenderCache();
  renderCache.questionAvailability.clear();
  renderCache.questionAvailabilityReady = false;
  renderCache.questionAvailabilityScheduleKey = '';
}
const CLOUD_SYNC_DEBOUNCE_MS = 3 * 60 * 1000;
// Teto de espera: o debounce sozinho reinicia a cada gravação, então uma sessão
// contínua de estudo (que salva a cada poucos segundos) nunca chegava a enviar
// nada para a nuvem. Este relógio não é reiniciado enquanto houver algo pendente.
// Durante edição contínua, um envio completo a cada 45s gerava vários GB de
// egress porque o estado pessoal já passa de 3 MB. O debounce ainda envia após
// 3 min de inatividade; este teto só limita sessões sem pausa.
const CLOUD_SYNC_MAX_WAIT_MS = 5 * 60 * 1000;
let cloudMaxWaitTimer = null;
// Antes, um erro de rede ou do Supabase deixava o indicador travado em "Erro"
// até algum outro evento (digitar, trocar de aba) tentar de novo — na prática,
// horas de estudo podiam ficar sem subir para a nuvem sem que nada tentasse
// reenviar sozinho. Agora todo erro agenda uma nova tentativa, com backoff.
const CLOUD_SYNC_RETRY_BASE_MS = 5 * 1000;
const CLOUD_SYNC_RETRY_MAX_MS = 2 * 60 * 1000;
let cloudSyncRetryDelayMs = 0;
let cloudRetryTimer = null;
let cloudRetryCount = 0;
const CLOUD_SYNC_MAX_RETRIES = 8;
// Erro de permissão/sessão expirada não se resolve tentando de novo — ficar
// reagendando por até ~8min só atrasa o aviso de que é preciso entrar de novo.
function isRetryableSyncError(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  if(['42501','PGRST301','PGRST302'].includes(code)) return false;
  if(/jwt|permission denied|not authorized|unauthorized/.test(message)) return false;
  return true;
}
function scheduleCloudRetry(error) {
  cloudDirty = true;
  if(error && !isRetryableSyncError(error)) {
    console.error('Erro de sincronização não recuperável por retry:', error);
    recordSyncTelemetry('push', true);
    createSafetyLocalBackup('sessão ou permissão inválida ao sincronizar');
    setSyncStatus('Erro', 'error', 'Sessão ou permissão inválida — saia e entre novamente para sincronizar');
    cloudRetryCount = 0;
    cloudSyncRetryDelayMs = 0;
    clearTimeout(cloudRetryTimer);
    return;
  }
  cloudRetryCount += 1;
  if(cloudRetryCount > CLOUD_SYNC_MAX_RETRIES) {
    console.error('Max sync retries exceeded, creating safety backup');
    recordSyncTelemetry('push', true);
    createSafetyLocalBackup(`após ${cloudRetryCount} tentativas de sincronização`);
    setSyncStatus('Erro', 'error', 'Sincronização com falha — dados salvos localmente');
    cloudRetryCount = 0;
    return;
  }
  const jitter = Math.random() * 0.2;
  cloudSyncRetryDelayMs = cloudSyncRetryDelayMs ? Math.min(cloudSyncRetryDelayMs * 2, CLOUD_SYNC_RETRY_MAX_MS) : CLOUD_SYNC_RETRY_BASE_MS;
  const delayWithJitter = Math.round(cloudSyncRetryDelayMs * (1 + jitter));
  setSyncStatus('Erro', 'error', `Erro ao sincronizar — nova tentativa em ${Math.round(delayWithJitter/1000)}s (${cloudRetryCount}/${CLOUD_SYNC_MAX_RETRIES})`);
  clearTimeout(cloudRetryTimer);
  cloudRetryTimer = setTimeout(() => {
    cloudRetryTimer = null;
    if(currentUser && sbClient && CLOUD_SYNC_ALLOWED) pushCloudState();
  }, delayWithJitter);
}
function scheduleCloudSave({immediate=false}={}) {
  if(!currentUser || !sbClient) return;
  if(!CLOUD_SYNC_ALLOWED) { setSyncStatus('Nuvem off', 'error'); return; }
  cloudDirty = true;
  cloudRevision += 1;
  clearTimeout(syncTimer);
  setSyncStatus('Pendente', 'busy');
  syncTimer = setTimeout(pushCloudState, immediate ? 400 : CLOUD_SYNC_DEBOUNCE_MS);
  if(!cloudMaxWaitTimer) {
    cloudMaxWaitTimer = setTimeout(() => { cloudMaxWaitTimer = null; if(cloudDirty) { clearTimeout(syncTimer); pushCloudState(); } }, immediate ? 400 : CLOUD_SYNC_MAX_WAIT_MS);
  }
}
function flushCloudSaveNow() {
  if(!currentUser || !sbClient || !CLOUD_SYNC_ALLOWED) return;
  if(!cloudDirty && !syncTimer) return;
  clearTimeout(syncTimer);
  pushCloudState();
}
// Duas abas do mesmo navegador (ou dois processos) podem chamar pushCloudState
// quase ao mesmo tempo; sem coordenação, ambas leem a mesma versão remota,
// mesclam separadamente e uma sobrescreve o merge da outra ao gravar por
// último. A Web Locks API serializa isso entre abas da mesma origem — cada
// aba espera a vez antes de ler+mesclar+gravar na nuvem.
const CLOUD_SYNC_LOCK_NAME = 'enamed-planner-cloud-sync';
async function pushCloudState(opts) {
  if(!navigator.locks) return pushCloudStateImpl(opts);
  try { return await navigator.locks.request(CLOUD_SYNC_LOCK_NAME, () => pushCloudStateImpl(opts)); }
  catch(error) { return pushCloudStateImpl(opts); }
}
async function pushCloudStateImpl({skipRemoteMerge=false}={}) {
  if(!currentUser || !CLOUD_SYNC_ALLOWED) return;
  // Garante que o backup automático do dia de estudo já existe antes de qualquer
  // sincronização nova poder sobrescrever o estado local (idempotente: só cria se
  // ainda não existir um para o dia de estudo atual).
  maintainDailyLocalBackup();
  if(syncInFlight) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => pushCloudState({skipRemoteMerge}), 700);
    return;
  }
  syncInFlight = true;
  clearTimeout(cloudMaxWaitTimer);
  cloudMaxWaitTimer = null;
  const pushRevision = cloudRevision;
  setSyncStatus('Enviando', 'busy');
  try {
    if(!skipRemoteMerge) {
      // A linha completa tem vários MB. Primeiro consulta só o carimbo (poucos
      // bytes) e baixa `data` apenas quando outro aparelho realmente gravou uma
      // versão mais nova. Antes, cada push baixava o estado inteiro mesmo quando
      // nada remoto havia mudado, consumindo a franquia mensal de egress.
      const { data:remoteMeta, error:remoteMetaError } = await sbClient.from('planner_states').select('updated_at').eq('user_id', currentUser.id).maybeSingle();
      const remoteAt = Date.parse(remoteMeta?.updated_at || '') || 0;
      if(remoteMeta?.updated_at) updateServerClockOffset(remoteMeta.updated_at);
      if(!remoteMetaError && remoteAt > lastCloudSyncAt) {
        const { data:remoteRow, error:remoteError } = await sbClient.from('planner_states').select('data, updated_at').eq('user_id', currentUser.id).maybeSingle();
        if(!remoteError && remoteRow?.data) {
          if(remoteRow.updated_at) updateServerClockOffset(remoteRow.updated_at);
          state = mergePlannerActivityState(remoteRow.data, state, true);
          ensureDayLogs();
          ensureQuestionProgress();
          invalidateActivityRenderCache();
          writeLocalState();
        }
      }
    }
    const { data:savedRow, error } = await sbClient.from('planner_states').upsert({
      user_id: currentUser.id,
      data: state,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' }).select('updated_at').maybeSingle();
    if(error) {
      console.error('Falha ao sincronizar:', error);
      recordSyncTelemetry('push', true);
      scheduleCloudRetry(error);
    } else {
      recordSyncTelemetry('push', false);
      cloudSyncRetryDelayMs = 0;
      cloudRetryCount = 0;
      cloudDirty = cloudRevision !== pushRevision;
      // O servidor (via trigger) e quem decide o updated_at real — nao confiar no
      // relogio deste aparelho aqui, ou comparacoes entre aparelhos com relogios
      // dessincronizados podem falhar silenciosamente (ver migracao
      // 20260718_planner_states_server_updated_at.sql).
      if(savedRow?.updated_at) updateServerClockOffset(savedRow.updated_at);
      lastCloudSyncAt = Date.parse(savedRow?.updated_at || '') || Date.now();
      if(cloudDirty) {
        setSyncStatus('Pendente', 'busy');
        clearTimeout(syncTimer);
        syncTimer = setTimeout(pushCloudState, 350);
      } else {
        const stamp = new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
        setSyncStatus('Sincronizado', 'online', `Sincronizado ${stamp}`);
      }
      syncGamificationLedger();
    }
  } catch(error) {
    console.error('Falha ao sincronizar:', error);
    scheduleCloudRetry(error);
  } finally {
    syncInFlight = false;
  }
}
function isEditingTextField() {
  const active = document.activeElement;
  if(!active) return false;
  const tag = active.tagName;
  if(tag === 'TEXTAREA') return true;
  if(tag === 'INPUT') return !['checkbox','radio','button','submit','range','color','file'].includes((active.type || 'text').toLowerCase());
  return active.isContentEditable === true;
}
async function pullCloudState({ firstLogin=false }={}) {
  if(!currentUser || !CLOUD_SYNC_ALLOWED) return;
  maintainDailyLocalBackup();
  if(!firstLogin && isEditingTextField()) return;
  if(cloudDirty && !firstLogin) {
    await pushCloudState();
    return;
  }
  setSyncStatus('Buscando', 'busy');
  try {
    if(firstLogin) createSafetyLocalBackup('antes de buscar nuvem');
    const { data, error } = await sbClient.from('planner_states').select('data, updated_at').eq('user_id', currentUser.id).maybeSingle();
    if(error) {
      console.error('Falha ao buscar dados:', error);
      setSyncStatus('Erro', 'error', 'Configure o banco');
      return;
    }
    const remoteAt = Date.parse(data?.updated_at || '') || 0;
    if(data?.updated_at) updateServerClockOffset(data.updated_at);
    if(!firstLogin && remoteAt && remoteAt <= lastCloudSyncAt) {
      setSyncStatus('Sincronizado', 'online', `Sincronizado ${new Date(lastCloudSyncAt || remoteAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`);
      return;
    }
    if(data?.data?.schedule?.length) {
      // Ao abrir o planner, lastCloudSyncAt volta a zero e o merge padrão deixa a
      // nuvem vencer no spread raso. Se este aparelho gravou depois do último
      // envio aceito pelo servidor, o estudo local é o mais novo e precisa
      // vencer os campos que o merge não sabe reconciliar item a item.
      const validationErrors = validatePlannerStateIntegrity(data.data);
      if(validationErrors.length) {
        recordSyncConflict(`Invalid remote state: ${validationErrors.join('; ')}`);
        console.error('Remote state validation failed:', validationErrors);
        return;
      }
      const localAt = localStateStamp();
      const localIsAhead = Boolean(localAt && remoteAt && localAt > remoteAt);
      const hasSignificantTimestampDrift = remoteAt && Math.abs(remoteAt - Date.now()) > 60000;
      if(hasSignificantTimestampDrift) recordSyncConflict('Significant clock drift detected');
      recordSyncTelemetry('merge', false);
      state = mergePlannerActivityState(data.data, state, localIsAhead);
      recordSyncTelemetry('pull', false);
      cloudDirty = localIsAhead;
      lastCloudSyncAt = remoteAt || Date.now();
      normalizeOfficialScheduleNames();
      ensureRestartFromBlockTen();
      ensureDayLogs(); ensureDailyTasks(); ensureSimTopics(); ensureFeynman(); ensureQuestionProgress();
      invalidateActivityRenderCache();
      // A nuvem pode conter uma versao anterior sem a ordem bloco.aula.
      // Reaplica o cronograma oficial antes de exibir ou reenviar o estado.
      if(officialSchedule.length) applyOfficialSchedule();
      writeLocalState();
      if(firstLogin && state.videoPlayer?.lastOpen?.lessonId) {
        ui.videoLessonId = '';
        ui.videoSourceId = '';
      }
      render();
      scheduleCloudSave();
      setSyncStatus('Sincronizado', 'online', 'Dados atualizados');
    } else if(firstLogin) {
      await pushCloudState();
    } else {
      setSyncStatus('Sincronizado', 'online');
    }
  } catch(error) {
    console.error('Falha ao buscar dados:', error);
    recordSyncTelemetry('pull', true);
    setSyncStatus('Erro', 'error', 'Erro ao sincronizar');
  }
}
let remoteUpdateAvailableAt = 0;
// Em vez de puxar e mesclar sozinho em segundo plano (era a origem dos bugs de
// sincronização), só avisamos que há algo novo; quem decide puxar é a pessoa.
async function checkForRemoteUpdate() {
  if(!currentUser || !sbClient || !CLOUD_SYNC_ALLOWED || syncInFlight) return;
  try {
    const { data, error } = await sbClient.from('planner_states').select('updated_at').eq('user_id', currentUser.id).maybeSingle();
    if(error || !data?.updated_at) return;
    const remoteAt = Date.parse(data.updated_at) || 0;
    if(remoteAt > Math.max(lastCloudSyncAt || 0, localStateStamp())) {
      remoteUpdateAvailableAt = remoteAt;
      setSyncStatus('Nova versão', 'busy', 'Há uma versão mais nova na nuvem — clique para puxar');
    }
  } catch(error) { console.warn('Falha ao checar nuvem:', error); }
}
async function pullRemoteUpdateNow() {
  if(!currentUser || !sbClient || !CLOUD_SYNC_ALLOWED) return;
  remoteUpdateAvailableAt = 0;
  await pullCloudState({firstLogin:true});
  showStudyToast('Dados mais recentes da nuvem foram puxados para este aparelho.');
  if(ui.tab === 'ferramentas') renderFerramentas();
}
// Sincronização real (puxar/mesclar) é só manual (botões Enviar/Receber) — isso não
// muda. Mas sem nenhum aviso, o aparelho nunca fica sabendo que a nuvem tem algo mais
// novo. checkForRemoteUpdate só lê o updated_at (sem mesclar, sem gravar nada) e
// acende o indicador "Nova versão" — quem decide puxar continua sendo a pessoa.
function startCloudSyncPolling() {
  if(cloudSyncPoll) clearInterval(cloudSyncPoll);
  if(cloudPushPoll) clearInterval(cloudPushPoll);
  checkForRemoteUpdate();
  cloudSyncPoll = setInterval(checkForRemoteUpdate, 5 * 60 * 1000);
}
function fullPlannerBackup() {
  checkpointAutoStudyTime(true);
  const backup = structuredClone(state);
  backup.backupInfo = {
    format:'soqueromed-completo',
    version:3,
    exportedAt:new Date().toISOString(),
    includes:['cronograma','questões respondidas','videoaulas assistidas','posição dos vídeos','pontos importantes','horas e sessões','flashcards','simulados','atividades diárias','tarefas pessoais']
  };
  return backup;
}
function downloadBackupPayload(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
function downloadPlannerBackupFile() {
  downloadBackupPayload(fullPlannerBackup(), `backup-soqueromed-${localISODate(new Date())}.json`);
  showStudyToast('Backup completo salvo no computador.');
}
// Categorias do backup manual e seletivo (diferente dos automáticos, que são sempre
// completos): a pessoa escolhe o que exportar. Caderno de erros sozinho extrai só a
// reflexão escrita em cada questão (sem a resposta em si); marcando Questões junto, o
// registro completo (com resposta) já cobre tudo.
const PERSONAL_BACKUP_CATEGORIES = [
  {id:'hours', label:'Horas estudadas', hint:'Registros diários de tempo e sessões de estudo'},
  {id:'questions', label:'Questões', hint:'Respostas, edições e flashcards vinculados às questões'},
  {id:'caderno', label:'Caderno de erros', hint:'Anotações e revisões — sem as respostas, se "Questões" não estiver marcado'},
  {id:'flashcards', label:'Flashcards', hint:'Biblioteca de flashcards e flashcards de vídeo-aula'},
  {id:'videos', label:'Vídeo-aulas', hint:'Aulas assistidas, posição, marcadores e favoritos'},
  {id:'simulados', label:'Simulados', hint:'Tentativas e resumos de simulados realizados'}
];
function questionProgressForCaderno(progress) {
  const out = {};
  Object.entries(progress || {}).forEach(([id, record]) => {
    const hasReflection = record && (record.notes || record.preReasoning || record.postLearning || record.correctiveRule || record.missReason || record.nextReview || n(record.reviewCount));
    if(!hasReflection) return;
    out[id] = {
      notes: record.notes || '', preReasoning: record.preReasoning || '', postLearning: record.postLearning || '',
      correctiveRule: record.correctiveRule || '', missReason: record.missReason || '', nextReview: record.nextReview || '',
      reviewCount: n(record.reviewCount), confidence: n(record.confidence)
    };
  });
  return out;
}
function personalPlannerBackup(selectedIds) {
  checkpointAutoStudyTime(true);
  const ids = new Set(selectedIds || []);
  // O cronograma sempre entra: sem ele o arquivo não passa na validação de
  // "Restaurar do PC" (que exige schedule não-vazio) e fica sem contexto nenhum.
  const backup = { schedule: structuredClone(state.schedule || []) };
  if(ids.has('hours')) {
    backup.dayLogs = structuredClone(state.dayLogs || []);
    backup.studySessions = structuredClone(state.studySessions || []);
  }
  if(ids.has('questions')) {
    ['questionProgress','questionProgressDeleted','questionEdits','questionFlashcards','questionLogged','deletedQuestions','importedQuestionTags'].forEach(key => {
      backup[key] = structuredClone(state[key] || {});
    });
    backup.importedQuestions = structuredClone(state.importedQuestions || []);
  } else if(ids.has('caderno')) {
    backup.questionProgress = questionProgressForCaderno(state.questionProgress);
  }
  if(ids.has('flashcards')) {
    backup.flashcardLibrary = structuredClone(state.flashcardLibrary || []);
    backup.flashcardSystem = structuredClone(state.flashcardSystem || {});
    backup.flashcardProgress = structuredClone(state.flashcardProgress || {});
    backup.videoFlashcards = structuredClone(state.videoFlashcards || {});
  }
  if(ids.has('videos')) backup.videoPlayer = structuredClone(state.videoPlayer || {});
  if(ids.has('simulados')) {
    backup.simuladoRuns = structuredClone(state.simuladoRuns || []);
    backup.simulados = structuredClone(state.simulados || []);
  }
  backup.backupInfo = {
    format:'soqueromed-pessoal',
    version:1,
    exportedAt:new Date().toISOString(),
    categories:[...ids],
    includes: PERSONAL_BACKUP_CATEGORIES.filter(category => ids.has(category.id)).map(category => category.label)
  };
  return backup;
}
function downloadPersonalBackupFile() {
  const checked = [...document.querySelectorAll('[data-personal-backup-category]:checked')].map(input => input.dataset.personalBackupCategory);
  if(!checked.length) { showStudyToast('Marque ao menos uma categoria para baixar.'); return; }
  downloadBackupPayload(personalPlannerBackup(checked), `backup-soqueromed-pessoal-${localISODate(new Date())}.json`);
  showStudyToast('Backup personalizado salvo no computador.');
}
function downloadLocalBackupFile(id) {
  const item = localBackups.find(backup => backup.id === id);
  if(!item?.data) { showStudyToast('Não encontrei esse backup para baixar.'); return; }
  downloadBackupPayload(item.data, `backup-soqueromed-${localISODate(new Date(item.created_at || Date.now()))}-${item.id.slice(-6)}.json`);
  showStudyToast('Backup salvo no computador.');
}
function restorePlannerBackupFile(file) {
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(String(reader.result || ''));
      if(!imported || typeof imported !== 'object' || !Array.isArray(imported.schedule) || !imported.schedule.length) throw new Error('Backup sem cronograma');
      if(!confirm('Mesclar este backup neste aparelho? O estado atual será salvo em uma cópia automática; datas do cronograma e progresso serão combinados.')) return;
      createSafetyLocalBackup('antes de restaurar arquivo do PC');
      // O backup pode ter as datas antigas e conter progresso que não está mais
      // no aparelho. Mantemos a estrutura local corrigida e unimos os registros
      // de atividade dos dois estados, evitando apagar questões, tempo ou XP.
      state = mergePlannerActivityState(imported, state, true);
      normalizeOfficialScheduleNames();
      ensureRestartFromBlockTen();
      ensureDayLogs(); ensureDailyTasks(); ensureSimTopics(); ensureFeynman(); ensureQuestionProgress();
      invalidateActivityRenderCache();
      persist();
      showStudyToast('Backup restaurado deste computador.');
    } catch(error) {
      console.warn('Backup do computador inválido:', error);
      alert('Não consegui restaurar este arquivo. Escolha um backup JSON do SÓqueroMed.');
    }
  };
  reader.readAsText(file);
}
function restorePlannerBackupFileReplace(file) {
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(String(reader.result || ''));
      if(!imported || typeof imported !== 'object' || !Array.isArray(imported.schedule) || !imported.schedule.length) throw new Error('Backup sem cronograma');
      if(imported.backupInfo?.format === 'soqueromed-pessoal') {
        alert('Este é um backup personalizado (só algumas categorias) — substituir tudo apagaria o resto do seu estudo. Use "Restaurar do PC" (mesclar) em vez disso.');
        return;
      }
      if(!confirm('Substituir TUDO neste aparelho por este arquivo de backup, sem mesclar? Uma cópia do estado atual será salva antes.')) return;
      createSafetyLocalBackup('antes de substituir tudo pelo arquivo do PC');
      allowLargeProgressDrop = true;
      state = imported;
      normalizeOfficialScheduleNames();
      ensureRestartFromBlockTen();
      ensureDayLogs(); ensureDailyTasks(); ensureSimTopics(); ensureFeynman(); ensureQuestionProgress();
      invalidateActivityRenderCache();
      writeLocalState();
      allowLargeProgressDrop = false;
      cloudDirty = true;
      if(currentUser && sbClient) pushCloudState({skipRemoteMerge:true});
      showStudyToast('Backup restaurado por completo neste aparelho.');
      render();
    } catch(error) {
      console.warn('Backup do computador inválido:', error);
      alert('Não consegui restaurar este arquivo. Escolha um backup JSON do SÓqueroMed.');
    }
  };
  reader.readAsText(file);
}
window.restorePlannerBackupFileReplace = restorePlannerBackupFileReplace;
function backupDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Data indisponível' : date.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
}
async function loadCloudBackups({force=false}={}) {
  if(!currentUser || !sbClient || !CLOUD_SYNC_ALLOWED || (cloudBackupsLoading && !force)) return;
  cloudBackupsLoading = true;
  cloudBackupsError = '';
  const { data, error } = await sbClient.from('planner_backups').select('id,label,created_at').eq('user_id', currentUser.id).order('created_at',{ascending:false}).limit(24);
  cloudBackupsLoading = false;
  if(error) {
    cloudBackupsReady = false;
    cloudBackupsError = error.code === '42P01' ? 'A tabela de backups ainda não foi criada no Supabase.' : 'Não foi possível carregar os backups agora.';
    return;
  }
  cloudBackups = data || [];
  cloudBackupsReady = true;
}
async function forcePlannerSync() {
  if(!currentUser || !sbClient) { showStudyToast('Entre na sua conta para sincronizar entre aparelhos.'); return; }
  if(!CLOUD_SYNC_ALLOWED) { showStudyToast('Ambiente de teste: sincronização com a nuvem está desativada.'); return; }
  checkpointAutoStudyTime(true);
  saveStateOnly();
  await pushCloudState();
  await pullCloudState();
  await loadCloudBackups({force:true});
  if(ui.tab === 'ferramentas') renderFerramentas();
}
async function forcePushThisDeviceToCloud() {
  if(!currentUser || !sbClient) { showStudyToast('Entre na sua conta para enviar este aparelho para a nuvem.'); return; }
  if(!CLOUD_SYNC_ALLOWED) { showStudyToast('Ambiente de teste: sincronização com a nuvem está desativada.'); return; }
  if(!confirm('Enviar os dados deste aparelho para a nuvem agora? Use isto quando este aparelho estiver com a versão correta.')) return;
  createSafetyLocalBackup('antes de enviar aparelho para nuvem');
  checkpointAutoStudyTime(true);
  saveStateOnly();
  cloudDirty = true;
  cloudRevision += 1;
  await pushCloudState({skipRemoteMerge:true});
  await loadCloudBackups({force:true});
  showStudyToast('Dados deste aparelho enviados para a nuvem.');
  if(ui.tab === 'ferramentas') renderFerramentas();
}
async function createCloudBackup(label='') {
  const localCopy = createLocalBackup(label, {silent:true, reason:'manual'});
  if(!currentUser || !sbClient) { showStudyToast('Backup local salvo. Entre na sua conta para salvar também na nuvem.'); return; }
  if(!CLOUD_SYNC_ALLOWED) { showStudyToast('Backup local salvo. Neste ambiente, a nuvem está desativada.'); return; }
  const payload = fullPlannerBackup();
  setSyncStatus('Backup', 'busy');
  const { error } = await sbClient.from('planner_backups').insert({
    user_id: currentUser.id,
    label: String(label || '').trim() || localCopy.label || `Backup de ${backupDateTime(payload.backupInfo.exportedAt)}`,
    data: payload
  });
  if(error) {
    console.error('Falha ao criar backup:', error);
    cloudBackupsReady = false;
    cloudBackupsError = error.code === '42P01' ? 'Backup local salvo. A tabela de backups ainda não foi criada no Supabase.' : 'Backup local salvo. Não foi possível criar o backup na nuvem.';
    setSyncStatus('Erro', 'error', 'Erro no backup');
    if(ui.tab === 'ferramentas') renderFerramentas();
    return;
  }
  await loadCloudBackups({force:true});
  setSyncStatus('Sincronizado', 'online', 'Backup salvo na nuvem');
  showStudyToast('Backup salvo. Ele já pode ser recuperado em outro aparelho.');
  if(ui.tab === 'ferramentas') renderFerramentas();
}
async function restoreCloudBackup(id) {
  if(!currentUser || !sbClient || !id || !CLOUD_SYNC_ALLOWED) return;
  if(!confirm('Restaurar esta cópia neste aparelho? O estado atual será substituído e depois sincronizado.')) return;
  const { data, error } = await sbClient.from('planner_backups').select('data,label,created_at').eq('id',id).eq('user_id',currentUser.id).maybeSingle();
  if(error || !data?.data?.schedule?.length) { alert('Não consegui abrir esse backup.'); return; }
  createSafetyLocalBackup('antes de restaurar backup da nuvem');
  allowLargeProgressDrop = true;
  state = data.data;
  normalizeOfficialScheduleNames();
  ensureRestartFromBlockTen();
  ensureDayLogs(); ensureDailyTasks(); ensureSimTopics(); ensureFeynman(); ensureQuestionProgress();
  invalidateActivityRenderCache();
  writeLocalState();
  allowLargeProgressDrop = false;
  cloudDirty = true;
  await pushCloudState();
  showStudyToast(`Backup restaurado: ${data.label || backupDateTime(data.created_at)}.`);
  render();
}
async function deleteCloudBackup(id) {
  if(!currentUser || !sbClient || !id || !CLOUD_SYNC_ALLOWED || !confirm('Excluir este backup da nuvem?')) return;
  const { error } = await sbClient.from('planner_backups').delete().eq('id',id).eq('user_id',currentUser.id);
  if(error) { alert('Não consegui excluir o backup.'); return; }
  await loadCloudBackups({force:true});
  if(ui.tab === 'ferramentas') renderFerramentas();
}
function renderCloudBackupCard() {
  const online = Boolean(currentUser && sbClient);
  const localBody = localBackups.length
    ? `<div class="cloud-backup-list">${localBackups.map(item => `<div class="cloud-backup-row"><div><strong>${escapeHtml(item.label || 'Backup local')}</strong><small>${backupDateTime(item.created_at)} · neste aparelho</small></div><div class="cloud-backup-actions"><button class="tiny-btn" data-restore-local-backup="${escapeAttr(item.id)}">Restaurar</button><button class="icon-btn" title="Baixar este backup para o PC" data-download-local-backup="${escapeAttr(item.id)}">${iconSvg('download',{weight:'regular'})}</button><button class="icon-btn danger" title="Excluir backup local" data-delete-local-backup="${escapeAttr(item.id)}">${iconSvg('delete',{weight:'regular'})}</button></div></div>`).join('')}</div>`
    : '<div class="muted">Ainda não há backups locais neste aparelho.</div>';
  const body = !online
    ? '<div class="muted">Entre na conta para sincronizar e usar cópias de segurança entre PC, tablet e celular.</div>'
    : cloudBackupsLoading
      ? '<div class="muted">Carregando backups...</div>'
      : !cloudBackupsReady
        ? `<div class="backup-warning">${escapeHtml(cloudBackupsError || 'Os backups serão habilitados depois da configuração no Supabase.')}</div>`
        : cloudBackups.length
          ? `<div class="cloud-backup-list">${cloudBackups.map(item => `<div class="cloud-backup-row"><div><strong>${escapeHtml(item.label || 'Backup sem nome')}</strong><small>${backupDateTime(item.created_at)}</small></div><div class="cloud-backup-actions"><button class="tiny-btn" data-restore-cloud-backup="${escapeAttr(item.id)}">Restaurar</button><button class="icon-btn danger" title="Excluir backup" data-delete-cloud-backup="${escapeAttr(item.id)}">${iconSvg('delete',{weight:'regular'})}</button></div></div>`).join('')}</div>`
          : '<div class="muted">Ainda não há backups na nuvem.</div>';
  const personalBackupPicker = `<details class="backup-section personal-backup-picker"><summary class="tiny-btn">Backup personalizado (escolher o que baixar)</summary><div class="personal-backup-categories">${PERSONAL_BACKUP_CATEGORIES.map(category => `<label class="personal-backup-category"><input type="checkbox" data-personal-backup-category="${category.id}" checked><span><strong>${escapeHtml(category.label)}</strong><small>${escapeHtml(category.hint)}</small></span></label>`).join('')}</div><div class="personal-backup-note">O cronograma (datas e temas) sempre entra no arquivo, para ele ficar válido. Desmarque só as categorias que não quiser levar.</div><button class="icon-btn primary" id="downloadPersonalBackupBtn" type="button">${iconSvg('download')}<span>Baixar selecionados</span></button></details>`;
  return `<div class="card cloud-backup-card"><div class="section-title"><div><h2>Sincronização e backups</h2><div class="muted">O estudo salva automaticamente; crie cópias recuperáveis quando quiser.</div></div><span class="backup-status ${online?'online':'offline'}">${online?'Conta conectada':'Somente local'}</span></div><div class="cloud-backup-controls"><input class="input" id="cloudBackupLabel" maxlength="80" placeholder="Nome opcional do backup"><button class="icon-btn" id="syncNowBtn" type="button">${iconSvg('history')}<span>Sincronizar agora</span></button><button class="icon-btn" id="forcePushCloudBtn" type="button">${iconSvg('upload')}<span>Enviar</span></button><button class="icon-btn" id="receiveCloudBtn" type="button">${iconSvg('download')}<span>Receber</span></button><button class="icon-btn primary" id="createCloudBackup" type="button">${iconSvg('save')}<span>Salvar backup</span></button><button class="icon-btn" id="downloadBackupPcBtn" type="button">${iconSvg('download')}<span>Baixar no PC</span></button><button class="icon-btn" id="chooseBackupPcBtn" type="button">${iconSvg('upload')}<span>Restaurar do PC</span></button><input class="hidden" id="backupImportPcInput" type="file" accept=".json,application/json"><button class="icon-btn danger" id="chooseBackupPcReplaceBtn" type="button">${iconSvg('upload')}<span>Restaurar do PC (substituir tudo)</span></button><input class="hidden" id="backupImportPcReplaceInput" type="file" accept=".json,application/json"></div>${personalBackupPicker}<div class="backup-section"><strong>Backups locais</strong>${localBody}</div><div class="backup-section"><strong>Backups na nuvem</strong>${body}</div></div>`;
}
function bindCloudBackupCard() {
  document.getElementById('syncNowBtn')?.addEventListener('click', forcePlannerSync);
  document.getElementById('forcePushCloudBtn')?.addEventListener('click', forcePushThisDeviceToCloud);
  document.getElementById('receiveCloudBtn')?.addEventListener('click', () => {
    if(!currentUser || !sbClient) { showStudyToast('Entre na sua conta para receber dados da nuvem.'); return; }
    if(!confirm('Puxar e mesclar os dados mais recentes da nuvem neste aparelho?')) return;
    pullRemoteUpdateNow();
  });
  document.getElementById('createCloudBackup')?.addEventListener('click', () => createCloudBackup(document.getElementById('cloudBackupLabel')?.value));
  document.getElementById('downloadBackupPcBtn')?.addEventListener('click', downloadPlannerBackupFile);
  document.getElementById('downloadPersonalBackupBtn')?.addEventListener('click', downloadPersonalBackupFile);
  document.getElementById('chooseBackupPcBtn')?.addEventListener('click', () => document.getElementById('backupImportPcInput')?.click());
  document.getElementById('backupImportPcInput')?.addEventListener('change', event => {
    restorePlannerBackupFile(event.target.files?.[0]);
    event.target.value = '';
  });
  document.getElementById('chooseBackupPcReplaceBtn')?.addEventListener('click', () => document.getElementById('backupImportPcReplaceInput')?.click());
  document.getElementById('backupImportPcReplaceInput')?.addEventListener('change', event => {
    restorePlannerBackupFileReplace(event.target.files?.[0]);
    event.target.value = '';
  });
  document.querySelectorAll('[data-restore-cloud-backup]').forEach(button => button.addEventListener('click', event => restoreCloudBackup(event.currentTarget.dataset.restoreCloudBackup)));
  document.querySelectorAll('[data-delete-cloud-backup]').forEach(button => button.addEventListener('click', event => deleteCloudBackup(event.currentTarget.dataset.deleteCloudBackup)));
  document.querySelectorAll('[data-restore-local-backup]').forEach(button => button.addEventListener('click', event => restoreLocalBackup(event.currentTarget.dataset.restoreLocalBackup)));
  document.querySelectorAll('[data-download-local-backup]').forEach(button => button.addEventListener('click', event => downloadLocalBackupFile(event.currentTarget.dataset.downloadLocalBackup)));
  document.querySelectorAll('[data-delete-local-backup]').forEach(button => button.addEventListener('click', event => deleteLocalBackup(event.currentTarget.dataset.deleteLocalBackup)));
  if(currentUser && !cloudBackupsReady && !cloudBackupsLoading && !cloudBackupsError) loadCloudBackups().then(() => { if(ui.tab === 'ferramentas') renderFerramentas(); });
}
document.addEventListener('click', event => {
  const bar = event.target.closest('.dashboard-bars.weekly-bars>div>span');
  document.querySelectorAll('.dashboard-bars.weekly-bars>div>span.show-value').forEach(el => { if(el !== bar) el.classList.remove('show-value'); });
  if(bar) bar.classList.toggle('show-value');
});
function loadQuestionBank() {
  if(!questionBankLoadPromise) questionBankLoadPromise = loadQuestionBankNow();
  return questionBankLoadPromise;
}
async function loadQuestionBankNow() {
  await loadLocalQuestionBank();
  backfillQuestionScheduleLinks();
  reconcileQuestionProgressWithAnswers();
  const localQuestions = [...questionBank];
  // O banco publicado junto do planner e a fonte principal. Evita baixar e
  // normalizar novamente milhares de registros iguais vindos do Supabase.
  if(localQuestions.length) {
    if(['painel','cronograma','pendencias','questoes','simulados','analise'].includes(ui.tab)) render();
    return;
  }
  if(!currentUser || !sbClient) {
    if(['painel','cronograma','pendencias','questoes','simulados','analise'].includes(ui.tab)) render();
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
  invalidateQuestionBankRenderCache();
  reconcileQuestionProgressWithAnswers();
  if(['painel','cronograma','pendencias','questoes','simulados','analise'].includes(ui.tab)) render();
}
function loadQuestionBlockScript(src) {
  return new Promise(resolve => {
    if(document.querySelector(`script[data-question-block="${src}"]`)) return resolve();
    const script = document.createElement('script');
    script.src = `question_bank/${src}?v=${QUESTION_BANK_ASSET_VERSION}`;
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
  // Executar os 30 scripts no mesmo instante trava aparelhos mais modestos.
  // Pequenos lotes preservam a rolagem e os toques durante a carga inicial.
  const pending = index.blocks.filter(block => !window.ENAMED_LOCAL_QUESTION_BANK[block.block]);
  for(let start=0; start<pending.length; start+=4) {
    await Promise.all(pending.slice(start,start+4).map(block => loadQuestionBlockScript(block.script)));
    // requestAnimationFrame nunca dispara com a aba oculta/em segundo plano, o que travava o carregamento pela metade.
    await new Promise(resolve => (document.hidden ? setTimeout(resolve, 0) : requestAnimationFrame(() => resolve())));
  }
  const blocks = index.blocks
    .map(block => window.ENAMED_LOCAL_QUESTION_BANK?.[block.block]?.questions || [])
    .flat();
  ensureImportedQuestions();
  const imported = state.importedQuestions.map(normalizeQuestionRecord);
  if(blocks.length || imported.length) {
    const normalized=[...blocks.map(normalizeQuestionRecord), ...imported];
    const invalid=normalized.filter(question=>PlannerUX?.validateQuestionRecord?.(question)?.valid === false);
    if(invalid.length) console.warn(`${invalid.length} questões incompletas foram ignoradas para evitar alternativas ou gabaritos inválidos.`);
    const valid=normalized.filter(question=>PlannerUX?.validateQuestionRecord?.(question)?.valid !== false);
    const deduplicated=deduplicateQuestions(valid);
    questionBank = (PlannerUX?.ensureUniqueRecordIds?.(deduplicated) || deduplicated).sort((a,b)=>n(b.importPriority)-n(a.importPriority) || questionCollectionSort(a)-questionCollectionSort(b) || n(a.displayOrder)-n(b.displayOrder) || String(a.sourceLabel || '').localeCompare(String(b.sourceLabel || '')) || n(a.number)-n(b.number));
    invalidateQuestionBankRenderCache();
    reconcileCompletedBlockXP();
    return true;
  }
  return false;
}
function deduplicateQuestions(records) {
  const unique = new Map();
  const richness = question => n((question.comment || '').length) + n((question.images || []).length) * 2000 + Object.keys(question.options || {}).length * 20;
  records.forEach(question => {
    const key = questionDuplicateKey(question);
    if(!question.stem || !unique.has(key)) { unique.set(key, question); return; }
    const current = unique.get(key);
    const keep = richness(question) > richness(current) ? question : current;
    const discard = keep === question ? current : question;
    migrateOrphanedQuestionData(discard.id, keep.id);
    if(keep !== current) unique.set(key, keep);
  });
  return [...unique.values()].filter(question => !state.deletedQuestions?.[question.id]);
}
// Quando o dedup descarta uma cópia, os dados presos ao id dela (progresso,
// edições de texto, flashcards, tags e log diário) ficariam órfãos e
// invisíveis, já que apenas o id mantido continua aparecendo no banco.
function migrateOrphanedQuestionData(discardId, keepId) {
  if(!discardId || !keepId || discardId === keepId) return;
  const keptProgress = state.questionProgress?.[keepId];
  const discardedProgress = state.questionProgress?.[discardId];
  if(discardedProgress && (!keptProgress || String(discardedProgress.answeredAt || '') > String(keptProgress.answeredAt || ''))) {
    state.questionProgress[keepId] = discardedProgress;
  }
  if(state.questionEdits?.[discardId] && !state.questionEdits[keepId]) {
    state.questionEdits[keepId] = state.questionEdits[discardId];
  }
  if(Array.isArray(state.questionFlashcards?.[discardId]) && state.questionFlashcards[discardId].length) {
    state.questionFlashcards[keepId] = mergeRecordsById(state.questionFlashcards[keepId], state.questionFlashcards[discardId]);
  }
  if(state.questionLogged?.[discardId] && (!state.questionLogged[keepId] || state.questionLogged[discardId] > state.questionLogged[keepId])) {
    state.questionLogged[keepId] = state.questionLogged[discardId];
  }
  if(state.importedQuestionTags?.[discardId] && !state.importedQuestionTags[keepId]) {
    state.importedQuestionTags[keepId] = state.importedQuestionTags[discardId];
  }
}
function normalizeBlockKey(value) {
  const raw = String(value ?? '').trim();
  if(!raw) return 'sem-bloco';
  return /^\d+$/.test(raw) ? String(Number(raw)) : raw.toLowerCase();
}
function questionDuplicateKey(question={}) {
  return `${normalizeBlockKey(question.collectionBlock)}|${normalizedTopic(question.stem)}`;
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
  const logoutButton = document.getElementById('headerLogoutBtn');
  if(currentUser) {
    document.body.classList.remove('auth-locked');
    panel?.classList.add('hidden');
    if(button) {
      button.textContent = 'Sair';
      button.title = currentUser.email || 'Sair da conta';
    }
    logoutButton?.classList.remove('hidden');
    if(logoutButton) logoutButton.title = currentUser.email ? `Sair de ${currentUser.email}` : 'Sair da conta';
  } else if(isLocalPlanner()) {
    document.body.classList.remove('auth-locked');
    panel?.classList.add('hidden');
    button?.classList.add('hidden');
    logoutButton?.classList.add('hidden');
    setSyncStatus('Local', '', 'Modo local neste aparelho');
  } else {
    document.body.classList.add('auth-locked');
    panel?.classList.remove('hidden');
    if(button) {
      button.classList.remove('hidden');
      button.textContent = 'Entrar';
      button.title = 'Entrar para sincronizar';
    }
    logoutButton?.classList.add('hidden');
    setSyncStatus('Local', '', 'Somente neste aparelho');
  }
}
function isLocalPlanner() {
  return location.protocol === 'file:' || ['localhost','127.0.0.1','::1'].includes(location.hostname);
}
// Pede ao navegador para não descartar localStorage/IndexedDB sob pressão de
// espaço. O navegador pode recusar; best-effort, não bloqueia nada se falhar.
async function requestPersistentStorage() {
  try {
    if(!navigator.storage?.persist) return;
    const already = await navigator.storage.persisted?.();
    if(!already) await navigator.storage.persist();
  } catch(error) { console.warn('Não foi possível solicitar armazenamento persistente:', error); }
}
async function initCloud() {
  requestPersistentStorage();
  if(OFFLINE_FIRST) {
    document.body.classList.remove('auth-locked');
    const button = document.getElementById('accountBtn');
    if(button) button.classList.add('hidden');
    setSyncStatus('Local', 'online', 'Offline · dados locais');
    return;
  }
  if(!sbClient) {
    if(isLocalPlanner()) {
      document.body.classList.remove('auth-locked');
      setSyncStatus('Local', 'online', 'Modo local offline');
    } else {
      setSyncStatus('Erro', 'error', 'Supabase indisponível');
    }
    return;
  }
  const { data } = await sbClient.auth.getSession();
  currentUser = data.session?.user || null;
  if(!currentUser && isLocalPlanner()) {
    document.body.classList.remove('auth-locked');
    setSyncStatus('Local', '', 'Modo local neste aparelho');
  } else {
    updateAccountUI();
  }
  if(currentUser) {
    await pullCloudState({firstLogin:true});
    startCloudSyncPolling();
  }
  sbClient.auth.onAuthStateChange((event, session) => {
    const wasLoggedOut = !currentUser;
    currentUser = session?.user || null;
    updateAccountUI();
    if(currentUser) startCloudSyncPolling();
    else if(cloudSyncPoll) { clearInterval(cloudSyncPoll); cloudSyncPoll=null; }
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
  repairDailyActivityData();
}
function ensureDailyTasks() {
  if(!Array.isArray(state.dailyTasks)) state.dailyTasks = [];
  if(!Array.isArray(state.taskTemplates)) state.taskTemplates = [];
  state.dailyTasks = state.dailyTasks.map((task, index) => ({
    id: task.id || `daily-task-${index}-${Date.now()}`,
    templateId: task.templateId || `task-template-${task.id || index}`,
    occurrenceKey: task.occurrenceKey || PlannerUX?.occurrenceKey(task.templateId || `task-template-${task.id || index}`, task.date || studyDateKey()),
    date: task.date || studyDateKey(),
    text: String(task.text || '').trim(),
    done: Boolean(task.done),
    status: task.status || (task.done ? 'done' : 'pending'),
    priority: Math.min(3, Math.max(0, n(task.priority))),
    order: n(task.order) || index + 1,
    createdAt: task.createdAt || new Date().toISOString(),
    completedAt: task.completedAt || '',
    deletedAt: task.deletedAt || '',
    updatedAt: task.updatedAt || task.createdAt || new Date().toISOString(),
    postponedFrom:task.postponedFrom || '',
    postponedTo:task.postponedTo || ''
  })).filter(task => task.text);
  state.dailyTasks = PlannerUX?.compactOccurrences ? PlannerUX.compactOccurrences(state.dailyTasks) : state.dailyTasks;
  const templateIds=new Set(state.taskTemplates.map(template=>template.id));
  state.dailyTasks.forEach(task=>{
    if(templateIds.has(task.templateId)) return;
    state.taskTemplates.push({id:task.templateId,text:task.text,recurrence:'none',weekdays:[],date:task.date,startDate:task.date,priority:task.priority,order:task.order,active:true,createdAt:task.createdAt,updatedAt:task.updatedAt});
    templateIds.add(task.templateId);
  });
  state.taskTemplates=state.taskTemplates.map(template=>({...template,recurrence:['daily','weekdays'].includes(template.recurrence)?template.recurrence:'none',weekdays:Array.isArray(template.weekdays)?template.weekdays.map(Number):[],active:template.active!==false}));
}
function dailyTasksFor(date) {
  ensureDailyTasks();
  state.dailyTasks=PlannerUX?.ensureOccurrences(state.taskTemplates,state.dailyTasks,date,new Date().toISOString())||state.dailyTasks;
  return state.dailyTasks.filter(task => task.date === date && task.status !== 'deleted').sort((a,b) => {
    if(a.done !== b.done) return a.done ? 1 : -1;
    return n(b.priority) - n(a.priority) || n(a.order) - n(b.order) || (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0);
  });
}
function renderPersonalDailyTasks(date) {
  const selectedDate=ui.personalTaskDate||date;
  const filter=ui.personalTaskFilter||'all';
  const today=PlannerUX?.localDateKey(new Date())||studyDateKey();
  const tasks = dailyTasksFor(selectedDate).filter(task=>filter==='done'?task.done:filter==='pending'?!task.done&&task.status!=='postponed':filter==='overdue'?!task.done&&task.status!=='postponed'&&task.date<today:true);
  const completed = tasks.filter(task => task.done).length;
  const visibleTasks=tasks.slice(0,5);
  const taskRows = visibleTasks.map((task,index) => {
    const editing = ui.personalTaskEditId === task.id;
    const stars = [1,2,3].map(value => `<button class="personal-task-star ${value <= n(task.priority) ? 'active' : ''}" data-task-priority="${escapeAttr(task.id)}" data-priority-value="${value}" title="Prioridade ${value} de 3" aria-label="Prioridade ${value} de 3">★</button>`).join('');
    const editor = editing ? `<div class="personal-task-editor"><input class="input" data-task-edit-text="${escapeAttr(task.id)}" value="${escapeAttr(task.text)}" maxlength="180"><input class="input task-order-input" type="number" min="1" step="1" data-task-edit-order="${escapeAttr(task.id)}" value="${n(task.order) || index + 1}"><button class="tiny-btn" data-task-edit-save="${escapeAttr(task.id)}">Salvar</button><button class="tiny-btn" data-task-edit-cancel="${escapeAttr(task.id)}">Cancelar</button></div>` : '';
    return `<div class="personal-task-row ${task.done ? 'done' : ''} ${task.status==='postponed'?'postponed':''}"><div class="personal-task-main"><label><input type="checkbox" data-toggle-personal-task="${escapeAttr(task.id)}" ${task.done ? 'checked' : ''} ${task.status==='postponed'?'disabled':''}><span class="personal-task-text">${escapeHtml(task.text)}</span></label>${task.status==='postponed'?`<small class="muted">Adiada para ${fmtDate(task.postponedTo)}</small>`:''}${editor}</div><div class="personal-task-actions"><div class="personal-task-priority" title="Prioridade ${n(task.priority) || 0} de 3 estrelas">${stars}</div>${!task.done&&task.status!=='postponed'?`<button class="tiny-btn" type="button" data-task-postpone="${escapeAttr(task.id)}" title="Mover para o próximo dia" aria-label="Mover para o próximo dia">${iconSvg('next',{weight:'regular'})}</button>`:''}<button class="tiny-btn" type="button" data-task-edit="${escapeAttr(task.id)}" title="Editar tarefa" aria-label="Editar tarefa">✎</button><button class="tiny-btn danger personal-task-remove" type="button" title="Excluir tarefa" aria-label="Excluir tarefa" data-remove-personal-task="${escapeAttr(task.id)}">×</button></div></div>`;
  }).join('');
  const weekdays=['D','S','T','Q','Q','S','S'].map((label,index)=>`<label class="task-weekday" title="${['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'][index]}"><input type="checkbox" data-new-task-weekday="${index}" ${index>0&&index<6?'checked':''}><span>${label}</span></label>`).join('');
  const pending=tasks.filter(task=>!task.done&&task.status!=='postponed').length;
  const editorMode=ui.personalTaskEditorMode||'';
  const emptyState = `<div class="personal-task-empty"><strong>Seu dia está livre nesta data.</strong><span>Crie uma tarefa pontual ou uma rotina recorrente.</span><div><button class="tiny-btn primary" type="button" data-open-task-manager="single">Adicionar tarefa</button><button class="tiny-btn" type="button" data-open-task-manager="recurring">Criar recorrente</button></div></div>`;
  return `<div class="card personal-tasks-card dashboard-tasks-card ${editorMode?'is-expanded':''}" data-task-editor-mode="${escapeAttr(editorMode)}"><div class="section-title"><div><span class="eyebrow">Agenda pessoal</span><h2>Tarefas de hoje</h2></div><span class="personal-tasks-count">${completed}/${tasks.length || 0}</span></div><div class="dashboard-task-summary"><div><strong>${pending}</strong><span>Pendentes</span></div><div><strong>${completed}</strong><span>Concluídas</span></div></div>${tasks.length ? `<div class="personal-task-list">${taskRows}</div>${tasks.length>visibleTasks.length?`<div class="muted dashboard-task-more">+ ${tasks.length-visibleTasks.length} tarefa${tasks.length-visibleTasks.length===1?'':'s'}</div>`:''}` : emptyState}<details class="personal-task-manage" id="personalTaskManager" ${editorMode?'open':''}><summary>Adicionar ou escolher outra data</summary><div class="personal-task-manage-head">${editorMode?`<span class="eyebrow">Editor de tarefas</span><button class="tiny-btn" type="button" data-close-personal-task-editor aria-label="Fechar formulário de tarefas">Fechar</button>`:''}</div><div class="personal-task-date-tools"><button class="tiny-btn" id="personalTaskPrev" aria-label="Dia anterior">‹</button><label class="sr-only" for="personalTaskDate">Data das tarefas</label><input class="input" id="personalTaskDate" type="date" value="${escapeAttr(selectedDate)}"><button class="tiny-btn" id="personalTaskNext" aria-label="Dia seguinte">›</button><button class="tiny-btn" id="personalTaskToday">Hoje</button><label class="sr-only" for="personalTaskFilter">Filtrar tarefas</label><select class="select" id="personalTaskFilter"><option value="all" ${filter==='all'?'selected':''}>Todas</option><option value="pending" ${filter==='pending'?'selected':''}>Pendentes</option><option value="done" ${filter==='done'?'selected':''}>Concluídas</option><option value="overdue" ${filter==='overdue'?'selected':''}>Atrasadas</option></select></div><div class="personal-task-add"><label class="sr-only" for="personalTaskInput">Descrição da tarefa</label><input class="input" id="personalTaskInput" type="text" maxlength="180" placeholder="Ex.: revisar gasometria"><label class="sr-only" for="personalTaskRecurrence">Recorrência da tarefa</label><select class="select" id="personalTaskRecurrence"><option value="none">Uma vez</option><option value="daily">Todo dia</option><option value="weekdays">Dias escolhidos</option></select><fieldset class="task-weekdays"><legend>Dias da semana</legend>${weekdays}</fieldset><button class="icon-btn primary personal-task-add-button" id="addPersonalTask" type="button" title="Adicionar tarefa" aria-label="Adicionar tarefa">${iconSvg('plus')}</button></div></details></div>`;
}
function bindPersonalDailyTasks(date) {
  const selectedDate=ui.personalTaskDate||date;
  const input = document.getElementById('personalTaskInput');
  const addTask = () => {
    const text = String(input?.value || '').trim();
    if(!text) return;
    ensureDailyTasks();
    const now = new Date().toISOString();
    const templateId=`task-template-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    const recurrence=document.getElementById('personalTaskRecurrence')?.value||'none';
    const weekdays=[...document.querySelectorAll('[data-new-task-weekday]:checked')].map(box=>n(box.dataset.newTaskWeekday));
    state.taskTemplates.push({id:templateId,text,recurrence,weekdays,date:selectedDate,startDate:selectedDate,priority:0,order:state.dailyTasks.filter(task => task.date === selectedDate).length + 1,active:true,createdAt:now,updatedAt:now});
    state.dailyTasks=PlannerUX?.ensureOccurrences(state.taskTemplates,state.dailyTasks,selectedDate,now)||state.dailyTasks;
    persist();
  };
  document.getElementById('personalTaskPrev')?.addEventListener('click',()=>{ui.personalTaskDate=PlannerUX.addDays(selectedDate,-1);render();});
  document.getElementById('personalTaskNext')?.addEventListener('click',()=>{ui.personalTaskDate=PlannerUX.addDays(selectedDate,1);render();});
  document.getElementById('personalTaskToday')?.addEventListener('click',()=>{ui.personalTaskDate=PlannerUX.localDateKey(new Date());render();});
  document.getElementById('personalTaskDate')?.addEventListener('change',event=>{ui.personalTaskDate=event.target.value||selectedDate;render();});
  document.getElementById('personalTaskFilter')?.addEventListener('change',event=>{ui.personalTaskFilter=event.target.value;render();});
  document.getElementById('addPersonalTask')?.addEventListener('click', addTask);
  const focusTaskEditor=()=>requestAnimationFrame(()=>{
    const manager=document.getElementById('personalTaskManager');
    if(manager) manager.open=true;
    const recurrence=document.getElementById('personalTaskRecurrence');
    if(ui.personalTaskEditorMode==='create-recurring' && recurrence) recurrence.value='daily';
    document.getElementById('personalTaskInput')?.focus();
  });
  const closeTaskEditor=()=>{
    const trigger=ui.personalTaskEditorTrigger;
    ui.personalTaskEditorMode=null;
    ui.personalTaskEditId='';
    render();
    requestAnimationFrame(()=>document.querySelector(`[data-open-task-manager="${CSS.escape(trigger)}"]`)?.focus()||document.querySelector('#personalTaskManager summary')?.focus());
  };
  document.querySelectorAll('[data-open-task-manager]').forEach(button=>button.addEventListener('click',event=>{
    const mode=event.currentTarget.dataset.openTaskManager==='recurring'?'create-recurring':'create-once';
    ui.personalTaskEditorMode=mode;
    ui.personalTaskEditorTrigger=event.currentTarget.dataset.openTaskManager;
    render();
    focusTaskEditor();
  }));
  document.querySelector('[data-close-personal-task-editor]')?.addEventListener('click',closeTaskEditor);
  document.getElementById('personalTaskManager')?.addEventListener('toggle',event=>{
    if(event.currentTarget.open && !ui.personalTaskEditorMode) {
      ui.personalTaskEditorMode='create-once';
      ui.personalTaskEditorTrigger='summary';
      render();
      focusTaskEditor();
      return;
    }
    if(event.currentTarget.open || !ui.personalTaskEditorMode) return;
    closeTaskEditor();
  });
  input?.addEventListener('keydown', event => { if(event.key === 'Enter') { event.preventDefault(); addTask(); } });
  document.querySelectorAll('[data-toggle-personal-task]').forEach(box => box.addEventListener('change', event => {
    const task = state.dailyTasks.find(item => item.id === event.currentTarget.dataset.togglePersonalTask);
    if(!task) return;
    task.done = event.currentTarget.checked;
    task.status = task.done ? 'done' : 'pending';
    task.completedAt = task.done ? new Date().toISOString() : '';
    task.updatedAt = new Date().toISOString();
    persist();
  }));
  document.querySelectorAll('[data-remove-personal-task]').forEach(button => button.addEventListener('click', event => {
    const task = state.dailyTasks.find(item => item.id === event.currentTarget.dataset.removePersonalTask);
    if(!task || !confirm('Excluir esta tarefa pessoal?')) return;
    const now=new Date().toISOString();
    state.dailyTasks = PlannerUX?.deleteOccurrence ? PlannerUX.deleteOccurrence(state.dailyTasks,task.id,now) : state.dailyTasks.map(item=>item.id===task.id?{...item,status:'deleted',deletedAt:now,updatedAt:now}:item);
    const template=state.taskTemplates.find(item=>item.id===task.templateId);
    if(template?.recurrence==='none') { template.active=false; template.updatedAt=now; }
    persist(); render();
  }));
  document.querySelectorAll('[data-task-priority]').forEach(button => button.addEventListener('click', event => {
    const task = state.dailyTasks.find(item => item.id === event.currentTarget.dataset.taskPriority);
    if(!task) return;
    task.priority = n(event.currentTarget.dataset.priorityValue);
    const template=state.taskTemplates.find(item=>item.id===task.templateId);
    if(template) template.priority=task.priority;
    task.updatedAt = new Date().toISOString();
    persist();
  }));
  document.querySelectorAll('[data-task-postpone]').forEach(button=>button.addEventListener('click',event=>{
    const task=state.dailyTasks.find(item=>item.id===event.currentTarget.dataset.taskPostpone);
    if(!task) return;
    const nextDate=PlannerUX.addDays(task.date,1);
    const now=new Date().toISOString();
    state.dailyTasks=PlannerUX.postponeOccurrence(state.dailyTasks,task.id,nextDate,now);
    persist();
  }));
  document.querySelectorAll('[data-task-edit]').forEach(button => button.addEventListener('click', event => {
    ui.personalTaskEditId = event.currentTarget.dataset.taskEdit;
    ui.personalTaskEditorMode = 'edit';
    ui.personalTaskEditorTrigger = 'edit';
    render();
  }));
  document.querySelectorAll('[data-task-edit-cancel]').forEach(button => button.addEventListener('click', () => {
    ui.personalTaskEditId = '';
    closeTaskEditor();
  }));
  document.querySelectorAll('[data-task-edit-save]').forEach(button => button.addEventListener('click', event => {
    const id = event.currentTarget.dataset.taskEditSave;
    const task = state.dailyTasks.find(item => item.id === id);
    if(!task) return;
    const text = document.querySelector(`[data-task-edit-text="${CSS.escape(id)}"]`)?.value?.trim();
    if(!text) return;
    task.text = text;
    task.order = Math.max(1, n(document.querySelector(`[data-task-edit-order="${CSS.escape(id)}"]`)?.value) || 1);
    task.updatedAt = new Date().toISOString();
    const template=state.taskTemplates.find(item=>item.id===task.templateId);
    if(template) { template.text=task.text;template.order=task.order;template.updatedAt=task.updatedAt; }
    ui.personalTaskEditId = '';
    ui.personalTaskEditorMode = null;
    persist();
  }));
}
function defaultDayLog(date) { return { date, mood: 0, pace: '', flashcardsOn: false, flashcards: 0, manualFlashcards: 0, flashcardMinutes: 0, videosOn: false, videos: 0, videoNames: '', lessonMinutes: 0, questionsOn: false, questions: 0, correct: 0, wrong: 0, questionMinutes: 0, materialMinutes: 0, simuladoMinutes: 0, notes: '' }; }
function repairDailyActivityData() {
  if(!state.activityDataRepairs || typeof state.activityDataRepairs !== 'object') state.activityDataRepairs = {};
  stripSimuladoReminderMarkers();
  const today = studyDateKey();
  if(!today) return;
  const reviewsByDate = new Map();
  (state.flashcardSystem?.reviewLogs || []).forEach(review => {
    const date = studyDateKey(review.reviewedAt);
    if(date) reviewsByDate.set(date, n(reviewsByDate.get(date)) + 1);
  });
  // Do not carry accumulated totals into the current or a future study day.
  state.dayLogs.filter(log => log.date >= today).forEach(log => {
    const automatic = n(reviewsByDate.get(log.date));
    const manual = n(log.manualFlashcards);
    log.flashcards = automatic + manual;
    log.flashcardsOn = log.flashcards > 0 || n(log.flashcardMinutes) > 0;
  });
  state.activityDataRepairs.flashcardsDailyV2 = { repairedAt:new Date().toISOString(), studyDate:today };
  repairFutureBlockCompletionDates();
}
// Blocos concluídos ficavam registrados na "Atividades realizadas" com a data
// da última aula agendada no cronograma (podendo ser meses no futuro), em vez
// da data em que o bloco foi de fato concluído. Corrige o que já foi salvo.
function repairFutureBlockCompletionDates() {
  if(!state.activityDataRepairs || typeof state.activityDataRepairs !== 'object') state.activityDataRepairs = {};
  const now = new Date();
  (state.gamification?.xpTransactions || []).forEach(t => {
    if(t.activity_type !== 'block_completion') return;
    const occurred = new Date(t.occurred_at || '');
    if(!Number.isNaN(occurred.getTime()) && occurred.getTime() > now.getTime()) t.occurred_at = now.toISOString();
  });
  state.activityDataRepairs.blockCompletionDatesV1 = { repairedAt: now.toISOString() };
}
function dayLogHasActivity(log) {
  return n(log?.videos) + n(log?.flashcards) + n(log?.questions) + n(log?.lessonMinutes) + n(log?.flashcardMinutes) + n(log?.questionMinutes) + n(log?.materialMinutes) + n(log?.simuladoMinutes) > 0
    || Boolean(String(log?.videoNames || '').trim() || String(log?.notes || '').trim());
}
function reviveHiddenHistoryDates() {
  if(!Array.isArray(state.hiddenHistoryDates) || !state.hiddenHistoryDates.length) return;
  if(!state.historyHiddenAt || typeof state.historyHiddenAt !== 'object') state.historyHiddenAt = {};
  state.hiddenHistoryDates = state.hiddenHistoryDates.filter(date => {
    const hiddenAt = timestampOf(state.historyHiddenAt[date] || state.historyClearedAt);
    const latestActivityAt = latestHistoryActivityTimestamp(date);
    if(hiddenAt && latestActivityAt > hiddenAt) {
      return false;
    }
    return true;
  });
}
function latestHistoryActivityTimestamp(date) {
  let latest = 0;
  const include = value => {
    if(answerDate(value) !== date) return;
    const timestamp = timestampOf(value);
    if(timestamp > Date.now() + 5 * 60 * 1000) return;
    latest = Math.max(latest, timestamp);
  };
  Object.values(state.questionProgress || {}).forEach(progress => include(progress?.answeredAt));
  (state.simuladoRuns || []).forEach(run => include(run?.finishedAt));
  (state.flashcardSystem?.reviewLogs || []).forEach(log => include(log?.reviewedAt));
  (state.gamification?.xpTransactions || []).forEach(transaction => include(transaction?.occurred_at));
  (state.studySessions || []).forEach(session => include(session?.savedAt));
  (state.dayLogs || []).filter(log => log.date === date).forEach(log => include(log.updatedAt));
  return latest;
}
function hideHistoryDates(dates, hiddenAt=nowIso()) {
  if(!state.historyHiddenAt || typeof state.historyHiddenAt !== 'object') state.historyHiddenAt = {};
  const validDates = [...new Set((dates || []).filter(Boolean))];
  validDates.forEach(date => {
    if(timestampOf(hiddenAt) >= timestampOf(state.historyHiddenAt[date])) state.historyHiddenAt[date] = hiddenAt;
  });
  state.hiddenHistoryDates = [...new Set([...(state.hiddenHistoryDates || []), ...validDates])];
}
function getDayLog(date) { ensureDayLogs(); let log = state.dayLogs.find(x=>x.date===date); if(!log) { log = defaultDayLog(date); state.dayLogs.push(log); } return log; }
function setDayLog(date, field, value) { const log = getDayLog(date); log[field] = value; log.updatedAt = nowIso(); persist(); }
function emptyStudyTimer() { return { kind:'', scheduleId:'', startedAt:0, elapsedSeconds:0, committedSeconds:0, minimumSaveSeconds:0, lastSavedAt:0, interval:null, displayInterval:null }; }
function loadStudyTimerSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(STUDY_TIMER_KEY));
    if(!saved?.kind) return emptyStudyTimer();
    const elapsedSeconds = Math.max(0, Math.min(4 * 60 * 60, n(saved.elapsedSeconds)));
    return { ...emptyStudyTimer(), kind:saved.kind, scheduleId:saved.scheduleId || '', elapsedSeconds, committedSeconds:Math.min(elapsedSeconds,Math.max(0,n(saved.committedSeconds))), minimumSaveSeconds:Math.max(0,n(saved.minimumSaveSeconds)), lastSavedAt:n(saved.savedAt) || Date.now() };
  } catch(error) { return emptyStudyTimer(); }
}
function emptyPomodoro() { return { mode:'', phase:'work', running:false, alarm:false, endAt:0, remaining:0, workSeconds:1500, breakSeconds:300, tickEnabled:true }; }
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
function getPomodoroCycles() {
  const today = studyDateKey();
  try {
    const saved = JSON.parse(localStorage.getItem(POMODORO_CYCLES_KEY));
    if(saved?.date === today) return Math.max(0, Number(saved.count) || 0);
  } catch(error) {}
  return 0;
}
function bumpPomodoroCycles() {
  const count = getPomodoroCycles() + 1;
  localStorage.setItem(POMODORO_CYCLES_KEY, JSON.stringify({ date: studyDateKey(), count }));
  return count;
}
function formatPomodoro(seconds) {
  const total = Math.max(0, Math.ceil(Number(seconds) || 0));
  return `${String(Math.floor(total / 60)).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`;
}
function beepPomodoro() {
  // Sino suave: duas notas em harmonia (C6 -> G6) com decaimento exponencial,
  // bem menos agressivo do que o bipe seco anterior.
  try {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const now = context.currentTime;
    const chime = (freq, start, peak) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(peak, now + start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + 1.1);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.start(now + start); oscillator.stop(now + start + 1.15);
    };
    chime(1046.5, 0, 0.09);
    chime(1568, 0.16, 0.07);
    setTimeout(() => context.close?.(), 1500);
  } catch(error) {}
}
function beepPomodoroTick() {
  try {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 660;
    gain.gain.value = 0.05;
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + .09);
    setTimeout(() => context.close?.(), 200);
  } catch(error) {}
}
function finishPomodoroPhase(timer=pomodoro) {
  timer.running = false;
  timer.alarm = true;
  timer.remaining = 0;
  timer.endAt = 0;
  if(timer.phase === 'work') bumpPomodoroCycles();
  if(pomodoroInterval) { clearInterval(pomodoroInterval); pomodoroInterval=null; }
  if(pomodoroAlarmInterval) clearInterval(pomodoroAlarmInterval);
  beepPomodoro();
  pomodoroAlarmInterval = setInterval(beepPomodoro, 2200);
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
  // Encerrar durante o Foco também conta o ciclo. O alarme já contou ao terminar
  // sozinho, então só contamos quando a fase de foco ainda estava ativa/pausada.
  if(pomodoro.mode && pomodoro.phase==='work' && !pomodoro.alarm) bumpPomodoroCycles();
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
    if(pomodoro.tickEnabled && pomodoro.remaining<=10 && pomodoro.remaining !== pomodoroLastTickedSecond) {
      pomodoroLastTickedSecond = pomodoro.remaining;
      beepPomodoroTick();
    }
    updatePomodoroWidget();
  }
}
function ensurePomodoroWidget() {
  if(document.getElementById('globalPomodoro')) return;
  const widget=document.createElement('div');
  widget.id='globalPomodoro'; widget.className='global-pomodoro';
  widget.innerHTML='<button class="pomodoro-fruit" id="pomodoroFruit" type="button" title="Abrir pomodoro" aria-label="Abrir pomodoro" aria-expanded="false" aria-controls="pomodoroPanel"><svg class="pomodoro-ring" viewBox="0 0 44 44" aria-hidden="true"><circle class="pomodoro-ring-track" cx="22" cy="22" r="19"></circle><circle class="pomodoro-ring-fill" cx="22" cy="22" r="19"></circle></svg><span class="pomodoro-fruit-emoji">🍅</span><span class="pomodoro-mini-time">--:--</span></button><div class="pomodoro-panel" id="pomodoroPanel" hidden></div>';
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
  if(open) setDailyMissionPanelOpen(false);
  fruit.setAttribute('aria-expanded', String(open));
  fruit.title=open?'Fechar pomodoro':'Abrir pomodoro';
  fruit.setAttribute('aria-label', fruit.title);
  if(open) {
    const rect=fruit.getBoundingClientRect();
    const panelWidth=Math.min(280, Math.max(220, window.innerWidth - 24));
    const opensRight=(window.innerWidth - rect.right) >= panelWidth + 8;
    panel.style.setProperty('--pomodoro-mobile-top', `${Math.min(window.innerHeight - 16, rect.bottom + 8)}px`);
    panel.classList.toggle('open-right', opensRight);
    panel.classList.toggle('open-left', !opensRight);
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
  const phaseTotal=pomodoro.phase==='work'?(pomodoro.workSeconds||1500):(pomodoro.breakSeconds||300);
  const elapsedFraction=pomodoro.mode ? Math.min(1,Math.max(0,1-(seconds/Math.max(1,phaseTotal)))) : 0;
  fruit.classList.toggle('active', Boolean(pomodoro.running || pomodoro.alarm));
  fruit.classList.toggle('alarming', Boolean(pomodoro.alarm));
  fruit.dataset.phase=pomodoro.mode ? pomodoro.phase : 'idle';
  fruit.style.setProperty('--pomodoro-progress', String(pomodoro.alarm ? 1 : elapsedFraction));
  fruit.querySelector('.pomodoro-mini-time').textContent=pomodoro.mode ? formatPomodoro(seconds) : '--:--';
  if(panel.hidden) return;
  const phase=pomodoro.phase==='work'?'Foco':'Pausa';
  const phaseEmoji=pomodoro.phase==='work'?'🎯':'☕';
  panel.dataset.phase=pomodoro.mode ? pomodoro.phase : 'idle';
  const dial=(pct,label,sub)=>`<div class="pomo-dial" style="--pomo-progress:${pct}"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="pomo-dial-track" cx="60" cy="60" r="52"></circle><circle class="pomo-dial-fill" cx="60" cy="60" r="52"></circle></svg><div class="pomo-dial-center"><span class="pomo-dial-time">${label}</span><span class="pomo-dial-sub">${sub}</span></div></div>`;
  const cycles=getPomodoroCycles();
  const cycleTally=`<div class="pomo-cycles" title="Ciclos de foco concluídos hoje">${'🍅'.repeat(Math.min(cycles,8))||'<span class="pomo-cycles-empty">Nenhum ciclo hoje ainda</span>'}<span class="pomo-cycles-count">${cycles>8?`${cycles} hoje`:cycles>0?`${cycles} ${cycles===1?'ciclo':'ciclos'} hoje`:''}</span></div>`;
  if(!pomodoro.mode) panel.innerHTML=`<div class="pomo-head"><strong>Pomodoro</strong><span class="muted">Escolha o ritmo do ciclo de estudo</span></div><div class="pomodoro-options"><button class="pomo-choice" data-pomodoro-start="25"><strong>25<span>+5</span></strong><em>Clássico</em></button><button class="pomo-choice" data-pomodoro-start="50"><strong>50<span>+10</span></strong><em>Imersão</em></button></div>${cycleTally}`;
  else if(pomodoro.alarm) panel.innerHTML=`<div class="pomo-head"><strong>Tempo encerrado</strong><span class="muted">${phaseEmoji} ${phase} concluído · o som continua até você voltar</span></div>${dial(1,'00:00','feito')}${cycleTally}<div class="pomodoro-options"><button class="icon-btn primary" id="pomodoroContinue">${pomodoro.phase==='work'?'Iniciar pausa':'Retomar foco'}</button><button class="tiny-btn" id="pomodoroReset">Encerrar ciclo</button></div>`;
  else panel.innerHTML=`<div class="pomo-head"><strong>${phaseEmoji} ${phase}</strong><span class="pomo-status ${pomodoro.running?'is-running':''}">${pomodoro.running?'Em andamento':'Pausado'}</span></div>${dial(pomodoro.alarm?1:elapsedFraction,formatPomodoro(seconds),phase)}${cycleTally}<div class="pomodoro-options">${pomodoro.running?'<button class="icon-btn" id="pomodoroPause">⏸ Pausar</button>':'<button class="icon-btn primary" id="pomodoroResume">▶ Continuar</button>'}<button class="tiny-btn" id="pomodoroReset">Encerrar</button></div><label class="pomodoro-tick-toggle"><input type="checkbox" id="pomodoroTickToggle" ${pomodoro.tickEnabled?'checked':''}> Bipes nos últimos 10s</label>`;
  panel.querySelectorAll('[data-pomodoro-start]').forEach(button=>button.onclick=()=>startPomodoro(Number(button.dataset.pomodoroStart)));
  panel.querySelector('#pomodoroContinue')?.addEventListener('click',continuePomodoro);
  panel.querySelector('#pomodoroPause')?.addEventListener('click',pausePomodoro);
  panel.querySelector('#pomodoroResume')?.addEventListener('click',resumePomodoro);
  panel.querySelectorAll('#pomodoroReset').forEach(button=>button.addEventListener('click',resetPomodoro));
  panel.querySelector('#pomodoroTickToggle')?.addEventListener('change',event=>{ pomodoro.tickEnabled=event.target.checked; savePomodoro(); });
}
function ensureDailyMissionWidget() {
  if(document.getElementById('globalDailyMission')) return;
  const widget=document.createElement('div');
  widget.id='globalDailyMission'; widget.className='global-daily-mission';
  widget.innerHTML=`<button class="daily-mission-trigger" id="dailyMissionTrigger" type="button" title="Abrir trilha do dia" aria-label="Abrir trilha do dia" aria-expanded="false" aria-controls="dailyMissionPanel">${iconSvg('sparkle')}<span>Trilha do dia</span></button><div class="daily-mission-panel" id="dailyMissionPanel" hidden></div>`;
  const pomodoro=document.getElementById('globalPomodoro');
  const headerActions=document.querySelector('.header-actions');
  if(pomodoro) pomodoro.insertAdjacentElement('beforebegin',widget);
  else (headerActions||document.body).append(widget);
  document.getElementById('dailyMissionTrigger').onclick=()=>{
    const panel=document.getElementById('dailyMissionPanel');
    setDailyMissionPanelOpen(panel.hidden || !panel.classList.contains('is-open'));
  };
}
function setDailyMissionPanelOpen(open) {
  const trigger=document.getElementById('dailyMissionTrigger');
  const panel=document.getElementById('dailyMissionPanel');
  if(!trigger || !panel) return;
  if(dailyMissionPanelCloseTimer) clearTimeout(dailyMissionPanelCloseTimer);
  if(open) setPomodoroPanelOpen(false);
  trigger.setAttribute('aria-expanded', String(open));
  if(open) {
    panel.hidden=false;
    panel.classList.remove('is-closing');
    updateDailyMissionWidget();
    const rect=trigger.getBoundingClientRect();
    const panelWidth=Math.min(360, Math.max(260, window.innerWidth - 24));
    const opensRight=(window.innerWidth - rect.right) >= panelWidth + 8;
    panel.style.setProperty('--daily-mission-mobile-top',`${Math.min(window.innerHeight-16,rect.bottom+8)}px`);
    panel.classList.toggle('open-right', opensRight);
    panel.classList.toggle('open-left', !opensRight);
    requestAnimationFrame(()=>panel.classList.add('is-open'));
    return;
  }
  panel.classList.remove('is-open');
  panel.classList.add('is-closing');
  dailyMissionPanelCloseTimer=setTimeout(()=>{
    panel.hidden=true;
    panel.classList.remove('is-closing');
  },180);
}
function updateDailyMissionWidget() {
  ensureDailyMissionWidget();
  const panel=document.getElementById('dailyMissionPanel');
  if(!panel || panel.hidden) return;
  panel.innerHTML=renderDailyMissionPanel(ui.refDate || studyDateKey());
  panel.querySelector('.daily-mission-close')?.addEventListener('click', () => setDailyMissionPanelOpen(false));
  panel.querySelectorAll('[data-mission-step]').forEach(button => button.onclick = e => {
    const target=e.currentTarget.dataset.missionStep;
    const scheduleId=e.currentTarget.dataset.missionSchedule;
    setDailyMissionPanelOpen(false);
    if(target==='daily-questions' && scheduleId) { openQuestionsForSchedule(scheduleId); return; }
    if(target==='daily-flashcards' && scheduleId) { openFlashcardsForSchedule(scheduleId); return; }
    if(target==='daily-video' && scheduleId) { openVideosForSchedule(scheduleId); return; }
    if(target==='daily-questions') { navigateToTab('questoes'); return; }
    if(target==='daily-flashcards') { navigateToTab('flashcards'); return; }
    openDayVideos(ui.refDate);
  });
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
    minimumSaveSeconds:n(studyTimeTracker.minimumSaveSeconds),
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
  const speedClock = document.getElementById('flashcardSpeedClock');
  if(speedClock) {
    const target = n(speedClock.dataset.speedTarget) || FLASHCARD_SPEED_TARGET_SECONDS;
    const cardSeconds = ui.flashcardCardStartedAt ? Math.round((Date.now() - ui.flashcardCardStartedAt) / 1000) : 0;
    speedClock.textContent = `⚡ ${cardSeconds}s`;
    speedClock.classList.toggle('flashcard-speed-over', cardSeconds > target);
    const speedCardId = ui.flashcardSpeedCardId;
    if(speedCardId && !ui.revealedCards[speedCardId]) {
      const remaining = target - cardSeconds;
      if(remaining <= FLASHCARD_SPEED_WARNING_SECONDS && remaining > 0 && !ui.flashcardSpeedBeeped) {
        ui.flashcardSpeedBeeped = true;
        beepFlashcardSpeed();
      }
      if(cardSeconds >= target) {
        ui.revealedCards[speedCardId] = true;
        renderFlashcards();
      }
    }
  }
}
function autoStudyElapsedSeconds(now=Date.now()) {
  if(!studyTimeTracker.kind) return 0;
  // Evita que um computador suspenso vire uma sessão artificialmente longa.
  const activeSeconds = studyTimeTracker.startedAt ? Math.round((now - studyTimeTracker.startedAt) / 1000) : 0;
  return Math.max(0, Math.min(4 * 60 * 60, n(studyTimeTracker.elapsedSeconds) + activeSeconds));
}
function commitAutoStudyTime(tracker, seconds) {
  if(!tracker?.kind || !seconds) return 0;
  const studyDate = studyDateKey();
  const log = getDayLog(studyDate);
  log.updatedAt = nowIso();
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
  const session={id:`study-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,date:studyDate,kind:tracker.kind,scheduleId:tracker.scheduleId||'',seconds:Math.round(seconds),savedAt:new Date().toISOString()};
  state.studySessions.push(session);
  if(tracker.kind==='video') awardVideoProgressXP(session);
  if(state.studySessions.length>5000) state.studySessions=state.studySessions.slice(-5000);
  return seconds;
}
function checkpointAutoStudyTime(force=false) {
  if(!studyTimeTracker.kind) return 0;
  const totalSeconds=autoStudyElapsedSeconds();
  if(totalSeconds<n(studyTimeTracker.minimumSaveSeconds)) return 0;
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
function startAutoStudy(kind, scheduleId='', minimumSaveSeconds=0) {
  if(document.hidden) return;
  if(autoStudyIsRunning() && studyTimeTracker.kind === kind && studyTimeTracker.scheduleId === scheduleId) {
    studyTimeTracker.minimumSaveSeconds=Math.max(n(studyTimeTracker.minimumSaveSeconds),n(minimumSaveSeconds));
    return;
  }
  if(!studyTimeTracker.startedAt && studyTimeTracker.kind === kind && studyTimeTracker.scheduleId === scheduleId) {
    studyTimeTracker.minimumSaveSeconds=Math.max(n(studyTimeTracker.minimumSaveSeconds),n(minimumSaveSeconds));
    studyTimeTracker.startedAt = Date.now();
    studyTimeTracker.displayInterval = setInterval(updateAutoStudyIndicator, 1000);
    persistStudyTimerSession();
    updateAutoStudyIndicator();
    return;
  }
  stopAutoStudy();
  const now = Date.now();
  studyTimeTracker = { kind, scheduleId, startedAt:now, elapsedSeconds:0, committedSeconds:0, minimumSaveSeconds:Math.max(0,n(minimumSaveSeconds)), lastSavedAt:now, interval:null, displayInterval:setInterval(updateAutoStudyIndicator, 1000) };
  persistStudyTimerSession();
  updateAutoStudyIndicator();
}
function pauseAutoStudy(kind='') {
  if(!studyTimeTracker.kind || (kind && studyTimeTracker.kind !== kind) || !studyTimeTracker.startedAt) return;
  // Grava o que já foi estudado antes de parar o relógio. Sem isso, sair da aba
  // (ou fechar o navegador) descartava até 30 segundos e, se o usuário nunca
  // voltasse, a sessão inteira desde o último checkpoint.
  checkpointAutoStudyTime(true);
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
  const totalSeconds=autoStudyElapsedSeconds();
  const seconds = Math.max(0,totalSeconds-n(tracker.committedSeconds));
  if(studyTimeTracker.interval) clearInterval(studyTimeTracker.interval);
  if(studyTimeTracker.displayInterval) clearInterval(studyTimeTracker.displayInterval);
  studyTimeTracker = emptyStudyTimer();
  localStorage.removeItem(STUDY_TIMER_KEY);
  updateAutoStudyIndicator();
  if(totalSeconds>=n(tracker.minimumSaveSeconds) && seconds >= 1 && commitAutoStudyTime(tracker, seconds)) saveStateOnly();
}
function resumeAutoStudyForActiveView() {
  if(document.hidden) return;
  if(ui.tab === 'aulas') {
    const video = document.getElementById('lessonVideo');
    const lesson = currentVideoLesson();
    if(video && !video.paused && lesson) startAutoStudy('video', videoScheduleForLesson(lesson)?.id || '');
    return;
  }
  // Voltar para a aba (ou para o planner depois de um F5) retoma o mesmo
  // cronômetro de onde ele parou, em vez de deixá-lo congelado.
  if(ui.tab === 'flashcards' && ui.flashcardFocusMode && studyTimeTracker.kind === 'flashcards' && !ui.flashcardFocusPaused) {
    startAutoStudy('flashcards', studyTimeTracker.scheduleId || '');
    return;
  }
  if(ui.tab === 'questoes') ensureQuestionFocusStudyTimer();
}
function ensureQuestionFocusStudyTimer(question=null) {
  if(ui.tab !== 'questoes' || !questionSidebarCollapsed) return;
  const active = question || filteredQuestions()[ui.qIndex];
  if(active && !autoStudyIsRunning('questions')) {
    startAutoStudy('questions', scheduleForQuestion(active)?.id || '', 60);
  }
}
function ensureVideoFlashcardStudyTimer(source, schedule) {
  if(ui.tab !== 'aulas' || !source) return;
  if(!autoStudyIsRunning('video')) startAutoStudy('video', schedule?.id || '', 60);
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
  // Reconstruir um objeto novo para toda tentativa em toda chamada parecia
  // inofensivo, mas esta função roda a cada render (inclusive no flush
  // silencioso do saveStateOnly, que NÃO re-renderiza). Isso trocava a
  // identidade do objeto por baixo dos panos: os botões da prova (pausar,
  // responder, eliminar alternativa, avançar) ficavam presos a uma cópia
  // antiga, e o clique parava de fazer efeito sem nenhum erro visível — o
  // pior caso sendo o botão "Pausar prova", que simplesmente não pausava.
  // Por isso só reconstruímos quando falta algo de fato; do contrário,
  // devolvemos a MESMA referência para não invalidar closures já vinculadas.
  state.simuladoRuns = state.simuladoRuns.map((run, idx) => {
    const fixed = {
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
      paused: typeof run.paused === 'boolean' ? run.paused : true,
      questionIds: Array.isArray(run.questionIds) ? run.questionIds : [],
      answers: run.answers && typeof run.answers === 'object' ? run.answers : {},
      eliminated: run.eliminated && typeof run.eliminated === 'object' ? run.eliminated : {},
      highlights: run.highlights && typeof run.highlights === 'object' ? run.highlights : {},
      confidence: run.confidence && typeof run.confidence === 'object' ? run.confidence : {},
      firstAnswers: run.firstAnswers && typeof run.firstAnswers === 'object' ? run.firstAnswers : {},
      answerHistory: run.answerHistory && typeof run.answerHistory === 'object' ? run.answerHistory : {},
      openedCount: run.openedCount && typeof run.openedCount === 'object' ? run.openedCount : {},
      reviewFlags: run.reviewFlags && typeof run.reviewFlags === 'object' ? run.reviewFlags : {},
      reviewedErrors: run.reviewedErrors && typeof run.reviewedErrors === 'object' ? run.reviewedErrors : {},
      questionSeconds: run.questionSeconds && typeof run.questionSeconds === 'object' ? run.questionSeconds : {},
      questionVisited: run.questionVisited && typeof run.questionVisited === 'object' ? run.questionVisited : {},
      activeQuestionId: run.activeQuestionId || '',
      questionTimingStart: Math.max(0, n(run.questionTimingStart)),
      areaTargets: run.areaTargets && typeof run.areaTargets === 'object' ? run.areaTargets : defaultSimuladoTargets()
    };
    const unchanged = Object.keys(fixed).every(key => fixed[key] === run[key]);
    return unchanged ? run : { ...run, ...fixed };
  });
  ensureSimuladoSundaySchedule();
}
function ensureSimuladoSundaySchedule() {
  const version = 'simulados-domingos-2026-v1';
  if(state.dashboardSettings?.simuladoSundayVersion === version || !Array.isArray(state.simulados) || !state.simulados.length) return false;
  if(!state.dashboardSettings || typeof state.dashboardSettings !== 'object') state.dashboardSettings = {};
  const sims = [...state.simulados].sort((a,b) => String(a.date || '').localeCompare(String(b.date || '')));
  const start = new Date('2026-07-19T12:00:00');
  sims.forEach((sim, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index * 21);
    sim.date = localISODate(date);
  });
  state.dashboardSettings.simuladoSundayVersion = version;
  return true;
}
// Um simulado agendado (data futura, ainda não feito) não é uma atividade
// concluída. ensureSimuladoSundaySchedule já não grava esse marcador, mas
// versões antigas do estado (ex.: trazidas de volta por sync de outro
// dispositivo) ainda podem tê-lo — por isso isso roda a cada carregamento,
// não só uma vez.
function stripSimuladoReminderMarkers() {
  if(!Array.isArray(state.dayLogs)) return;
  state.dayLogs.forEach(log => {
    if(/SIMULADO/i.test(String(log.videoNames || ''))) {
      log.videoNames = String(log.videoNames).replace(/🏆\s*SIMULADO\s*\d+\s*→[^|]*/gi, '').replace(/\s{2,}/g, ' ').trim();
    }
  });
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
const GREETING_BY_PERIOD = {
  morning:["Bom dia, Isaac! Vai começar a luta?","Bom dia, Isaac! Bora atacar o cronograma de hoje.","Bom dia, Isaac! Café tomado, hora de estudar."],
  afternoon:["Boa tarde, Isaac! Como está indo o estudo hoje?","Boa tarde, Isaac! Ainda dá tempo de fechar mais um bloco.","Boa tarde, Isaac! Bora manter o ritmo."],
  evening:["Boa noite, Isaac! Ainda dá tempo de revisar mais um pouco.","Boa noite, Isaac! Fecha o dia com uma revisão rápida?","Boa noite, Isaac! Reta final do dia de estudos."],
  lateNight:["Boa noite, Isaac. Alguém está acordado até tarde estudando...","Isaac, já é tarde — vale a pena descansar também.","Boa madrugada, Isaac. Sua dedicação não passa despercebida."]
};
function greetingPeriod(hour) {
  if(hour >= 5 && hour < 12) return 'morning';
  if(hour >= 12 && hour < 18) return 'afternoon';
  if(hour >= 18 && hour < 23) return 'evening';
  return 'lateNight';
}
function greetingMessage() {
  const now = new Date();
  const period = greetingPeriod(now.getHours());
  const messages = GREETING_BY_PERIOD[period] || GREETING_BY_PERIOD.morning;
  const slot = Math.floor(now.getTime() / (30 * 60 * 1000));
  const periodSeed = [...period].reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
  return messages[(slot * 37 + periodSeed) % messages.length];
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
function validatePlannerStateIntegrity(stateToValidate) {
  const errors = [];
  if(!stateToValidate || typeof stateToValidate !== 'object') return ['Estado inválido: não é um objeto'];
  if(!Array.isArray(stateToValidate.schedule)) errors.push('Cronograma não é um array');
  if(!Array.isArray(stateToValidate.dayLogs)) errors.push('Day logs não é um array');
  if(typeof stateToValidate.questionProgress !== 'object') errors.push('Question progress não é um objeto');
  if(typeof stateToValidate.flashcardProgress !== 'object') errors.push('Flashcard progress não é um objeto');
  if(typeof stateToValidate.questionFlashcards !== 'object') errors.push('Question flashcards não é um objeto');
  if(!Array.isArray(stateToValidate.gamification?.xpTransactions)) errors.push('Gamification ledger não é um array');
  if(stateToValidate.dayLogs?.some(log => !log.date || !/^\d{4}-\d{2}-\d{2}$/.test(log.date))) errors.push('Day logs com datas inválidas');
  if(stateToValidate.schedule?.some(item => !item.id)) errors.push('Schedule items sem ID');
  return errors;
}
function recordSyncConflict(reason = 'unknown') {
  lastSyncConflictAt = Date.now();
  syncConflictCount += 1;
  console.warn(`Sync conflict detected: ${reason} (count: ${syncConflictCount})`);
  if(syncConflictCount > 5) {
    console.error('High conflict rate detected, creating backup');
    createSafetyLocalBackup('após múltiplos conflitos de sincronização');
  }
}
function auditActiveTimers() {
  const timers = {
    syncTimer: Boolean(syncTimer),
    cloudMaxWaitTimer: Boolean(cloudMaxWaitTimer),
    cloudRetryTimer: Boolean(cloudRetryTimer),
    pomodoroInterval: Boolean(pomodoroInterval),
    pomodoroAlarmInterval: Boolean(pomodoroAlarmInterval),
    pomodoroPanelCloseTimer: Boolean(pomodoroPanelCloseTimer),
    dailyMissionPanelCloseTimer: Boolean(dailyMissionPanelCloseTimer),
    questionSearchRenderTimer: Boolean(questionSearchRenderTimer),
    motivationRefreshInterval: Boolean(motivationRefreshInterval),
    dashboardCountdownInterval: Boolean(dashboardCountdownInterval),
    cloudSyncPoll: Boolean(cloudSyncPoll),
    studyTimeTrackerInterval: Boolean(studyTimeTracker?.displayInterval),
    materialEditSaveTimers: materialEditSaveTimers.size
  };
  const activeCount = Object.values(timers).filter(Boolean).length + (timers.materialEditSaveTimers || 0);
  if(activeCount > 8) {
    console.warn(`High number of active timers detected: ${activeCount}`, timers);
  }
  return timers;
}
function recordSyncTelemetry(event, isError = false) {
  if(event === 'push') { syncTelemetry.pushCount++; syncTelemetry.lastPushAt = Date.now(); }
  else if(event === 'pull') { syncTelemetry.pullCount++; syncTelemetry.lastPullAt = Date.now(); }
  else if(event === 'merge') syncTelemetry.mergeCount++;
  if(isError) syncTelemetry.errorCount++;
}
function startAutoRecovery() {
  if(autoRecoveryInterval) return;
  window.addEventListener('online', () => {
    console.log('Internet reconnected, attempting sync recovery');
    if(currentUser && cloudDirty) {
      setSyncStatus('Recuperando', 'busy');
      pushCloudState();
    }
  });
  window.addEventListener('offline', () => {
    console.warn('Internet disconnected');
    offlineStartedAt = Date.now();
    setSyncStatus('Offline', 'error', 'Modo offline - dados serão sincronizados ao reconectar');
  });
  autoRecoveryInterval = setInterval(async () => {
    if(!navigator.onLine) return;
    const health = await performHealthCheck();
    if(!health.healthy) {
      console.warn('Health check failed:', health);
      if(Date.now() - (health.telemetry?.lastPushAt || 0) > 600000) {
        console.warn('No successful sync in 10+ minutes, attempting recovery');
        if(currentUser && cloudDirty) pushCloudState();
      }
    }
  }, 120000);
}
function startTimerAudit() {
  if(timerAuditInterval) return;
  timerAuditInterval = setInterval(() => {
    const timers = auditActiveTimers();
    const errorRate = syncTelemetry.errorCount / Math.max(1, syncTelemetry.pushCount + syncTelemetry.pullCount);
    if(errorRate > 0.1) {
      console.warn(`High sync error rate: ${(errorRate*100).toFixed(1)}%`, syncTelemetry);
    }
  }, 300000);
}
async function performHealthCheck() {
  const report = { timestamp: new Date().toISOString(), checks: {} };
  try {
    if(!sbClient) {
      report.checks.supabase = { status: 'unavailable', reason: 'Client not initialized' };
      return report;
    }
    if(!CLOUD_SYNC_ALLOWED) {
      report.checks.supabase = { status: 'unavailable', reason: 'Sync desativado nesta origem' };
      return report;
    }
    const { data, error } = await sbClient.from('planner_states').select('count', { count: 'exact' }).limit(1);
    report.checks.supabase = error ? { status: 'error', reason: error.message } : { status: 'ok' };
  } catch(e) {
    report.checks.supabase = { status: 'error', reason: e.message };
  }
  try {
    const online = navigator.onLine;
    report.checks.network = { status: online ? 'ok' : 'offline' };
  } catch(e) {
    report.checks.network = { status: 'unknown' };
  }
  report.checks.storage = { status: 'ok', available: true };
  try {
    localStorage.setItem('_health_check', '1');
    localStorage.removeItem('_health_check');
  } catch(e) {
    report.checks.storage = { status: 'error', reason: 'Storage quota exceeded' };
  }
  report.telemetry = getSyncTelemetryReport();
  report.healthy = Object.values(report.checks).every(c => c.status === 'ok' || c.status === 'offline');
  return report;
}
function getSyncTelemetryReport() {
  return {
    ...syncTelemetry,
    errorRate: syncTelemetry.errorCount / Math.max(1, syncTelemetry.pushCount + syncTelemetry.pullCount),
    timeSinceLastPush: Date.now() - syncTelemetry.lastPushAt,
    timeSinceLastPull: Date.now() - syncTelemetry.lastPullAt,
    conflictRate: syncConflictCount / Math.max(1, syncTelemetry.pullCount),
    clockDriftMs: serverClockOffsetMs,
    retryCount: cloudRetryCount
  };
}
function toggleSyncTelemetryDashboard() {
  const existing = document.querySelector('[data-telemetry-panel]');
  if(existing) { existing.remove(); return; }
  showSyncTelemetryDashboard();
}
function showSyncTelemetryDashboard() {
  const report = getSyncTelemetryReport();
  const timers = auditActiveTimers();
  const html = `
    <div style="position:fixed;top:60px;right:20px;width:320px;background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:16px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:1000;font-size:12px;font-family:monospace">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <strong>Telemetria de Sync</strong>
        <button onclick="this.closest('[data-telemetry-panel]').remove()" style="border:0;background:transparent;cursor:pointer;font-size:16px">×</button>
      </div>
      <div style="display:grid;gap:6px;color:var(--muted)">
        <div>Push: ${report.pushCount} (${(report.errorRate*100).toFixed(1)}% erro)</div>
        <div>Pull: ${report.pullCount}</div>
        <div>Merge: ${report.mergeCount}</div>
        <div>Conflitos: ${syncConflictCount}</div>
        <div>Retry: ${report.retryCount}/${CLOUD_SYNC_MAX_RETRIES}</div>
        <div>Clock drift: ${report.clockDriftMs}ms</div>
        <div style="margin-top:8px;border-top:1px solid var(--line);padding-top:8px">
          <div>Timers ativos: ${Object.values(timers).filter(Boolean).length + (timers.materialEditSaveTimers || 0)}</div>
        </div>
      </div>
    </div>
  `;
  const existing = document.querySelector('[data-telemetry-panel]');
  if(existing) existing.remove();
  const panel = document.createElement('div');
  panel.setAttribute('data-telemetry-panel', 'true');
  panel.innerHTML = html;
  document.body.appendChild(panel);
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
function studyDateKey(value=new Date()) {
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return '';
  date.setHours(date.getHours() - STUDY_DAY_START_HOUR);
  return localISODate(date);
}
function fmtDate(s) { if(!s) return ''; const [y,m,d]=s.split('-'); return `${d}/${m}/${y}`; }
function nextErrorReviewDate(baseDate=studyDateKey(), intervalDays=1) {
  const date = new Date(`${baseDate}T12:00:00`);
  date.setDate(date.getDate() + Math.max(1, n(intervalDays) || 1));
  return studyDateKey(date);
}
// Usa o mesmo corte de dia de estudo (5h, STUDY_DAY_START_HOUR) que o resto do app usa
// para dayLogs, em vez da meia-noite do calendário: assim o backup automático nasce
// logo no início do dia de estudo, antes de qualquer sincronização nova mexer no
// estado, e não no meio de uma sessão que já passou da meia-noite.
function maintainDailyLocalBackup() {
  const now = Date.now();
  const today = studyDateKey();
  const retentionMs = AUTO_BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const latestByDay = new Set();
  localBackups = localBackups.filter(item => {
    if(item.reason !== 'daily') return true;
    const created = Date.parse(item.created_at || '') || 0;
    const day = created ? studyDateKey(new Date(created)) : '';
    if(!day || now - created > retentionMs) return false;
    if(latestByDay.has(day)) return false;
    latestByDay.add(day);
    return true;
  });
  const hasToday = localBackups.some(item => item.reason === 'daily' && studyDateKey(item.created_at) === today);
  if(!hasToday) createLocalBackup(`Backup automático · ${today}`, {silent:true, reason:'daily'});
  else saveLocalBackups();
}
function errorReviewInterval(reviewCount=0) {
  return [1, 7, 21, 60][Math.min(3, Math.max(0, n(reviewCount)))];
}
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
function formatStudyHours(hours) {
  const totalMinutes = Math.max(0, Math.round(n(hours) * 60));
  const h = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return h ? `${h}h${minutes ? ` ${minutes}min` : ''}` : `${minutes}min`;
}
function clamp(v,min=0,max=1) { return Math.max(min, Math.min(max, n(v))); }
function availableQuestionsForLesson(item) {
  if(!item || !questionBank.length) return null;
  ensureQuestionStatsIndex();
  return n(renderCache.questionAvailability.get(item.id));
}
function lessonQuestionTarget(item) {
  const available = availableQuestionsForLesson(item);
  return available === null ? LESSON_MIN_QUESTIONS : Math.min(LESSON_MIN_QUESTIONS, available);
}
function lessonFlashcardTarget() { return LESSON_MIN_FLASHCARDS; }
function statusOf(item) {
  const videoDone = scheduleVideoCompleted(item);
  if(videoDone && completedQuestions(item) >= lessonQuestionTarget(item) && completedFlashcards(item) >= lessonFlashcardTarget(item)) return 'Concluído';
  if(videoDone || n(item.hours) > 0 || completedQuestions(item) > 0 || completedFlashcards(item) > 0) return 'Aguardando';
  return 'Não Iniciado';
}
function progressOf(item) {
  if(statusOf(item)==='Concluído') return 1;
  const questionTarget = lessonQuestionTarget(item);
  const questionProgress = questionTarget ? clamp(completedQuestions(item)/questionTarget) : 1;
  return clamp(((scheduleVideoCompleted(item) ? 1 : 0) + questionProgress + clamp(completedFlashcards(item)/lessonFlashcardTarget(item))) / 3);
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
  const debtQ = overdue.reduce((s,x)=>s+Math.max(0,lessonQuestionTarget(x)-completedQuestions(x)),0);
  const debtFC = overdue.reduce((s,x)=>s+Math.max(0,lessonFlashcardTarget(x)-completedFlashcards(x)),0);
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
    const m = map.get(k); m.total++; m.done += statusOf(x)==='Concluído'?1:0; m.q+=completedQuestions(x); m.metaQ+=lessonQuestionTarget(x); m.fc+=completedFlashcards(x); m.metaFC+=lessonFlashcardTarget(x); m.hours+=n(x.hours); m.items.push(x);
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
    const okPriority = ui.priority==='Todas' || x.priority===ui.priority;
    const okBlock = ui.scheduleBlock==='Todos' || (ui.scheduleBlock==='Atual' ? String(x.block)===currentBlock : String(x.block)===String(ui.scheduleBlock));
    const okDay = !ui.scheduleDay || x.date===ui.scheduleDay;
    return okText && okArea && okStatus && okPriority && okBlock && okDay;
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
  const scheduleById = new Map((state.schedule || []).map(item => [item.id, item]));
  const activityBySchedule = new Map();
  const record = (scheduleId, value) => {
    const timestamp = timestampOf(value);
    if(!scheduleById.has(scheduleId) || !timestamp || timestamp > Date.now() + 5 * 60 * 1000) return;
    if(timestamp > n(activityBySchedule.get(scheduleId))) activityBySchedule.set(scheduleId, timestamp);
  };
  (state.studySessions || []).forEach(session => record(session.scheduleId, session.savedAt));
  Object.values(state.questionProgress || {}).forEach(progress => record(progress?.scheduleId, progress?.answeredAt || progress?.updatedAt));
  (state.flashcardSystem?.reviewLogs || []).forEach(review => record(review?.scheduleId, review?.reviewedAt));
  (state.gamification?.xpTransactions || []).forEach(transaction => record(transaction?.metadata?.scheduleId, transaction?.occurred_at));
  record(state.videoPlayer?.lastOpen?.lessonId, state.videoPlayer?.lastOpen?.updatedAt);
  const actual = [...activityBySchedule.entries()].sort((a,b) => b[1]-a[1])[0];
  if(actual) return { ...scheduleById.get(actual[0]), date:studyDateKey(new Date(actual[1])), activityAt:new Date(actual[1]).toISOString() };
  // Registros legados não têm horário da atividade. Nesse caso, só aceitamos
  // aulas cuja data planejada já chegou; uma aula futura nunca pode ser exibida
  // como "última aula".
  const today = studyDateKey();
  return state.schedule
    .filter(item => item.date && item.date <= today && (item.notes || n(item.manualQ)!==n(item.q) || n(item.manualFC)!==n(item.fc) || n(item.hours)>0))
    .sort((a,b)=>byDate(b,a))[0] || null;
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
  const pinned = Boolean(ui.scheduleBlockPinned) && ui.scheduleBlock!=='Todos';
  return `<div class="block-strip" role="toolbar" aria-label="Escolher bloco do cronograma"><button class="icon-btn block-pin-toggle ${pinned?'active':''}" id="blockPinToggle" type="button" title="${pinned?`Bloco ${escapeAttr(ui.scheduleBlock)} fixado — clique para destravar`:'Fixar o bloco selecionado'}" aria-label="${pinned?`Desfixar bloco ${escapeAttr(ui.scheduleBlock)}`:'Fixar o bloco selecionado'}" aria-pressed="${pinned}" ${ui.scheduleBlock==='Todos'?'disabled':''}>${iconSvg('flag',{weight:pinned?'duotone':'regular'})}</button><button class="block-chip block-chip-all ${ui.scheduleBlock==='Todos'?'active':''}" type="button" data-schedule-block="Todos" title="Ver todos os blocos" aria-label="Ver todos os blocos" aria-pressed="${ui.scheduleBlock==='Todos'}">${iconSvg('dashboard')}</button>${scheduleBlocks().map(block => {
    const status = blockStatus(block);
    const weekCurrent = block === current;
    const active = String(ui.scheduleBlock)===block || (ui.scheduleBlock==='Atual' && weekCurrent);
    return `<button class="block-chip ${active?'active':''} ${status} ${weekCurrent?'week-current':''}" type="button" title="${escapeAttr(weekCurrent?'Bloco atual':blockStatusTitle(status))}" data-schedule-block="${escapeAttr(block)}" aria-label="Bloco ${escapeAttr(block)} — ${escapeAttr(weekCurrent?'atual':blockStatusTitle(status).toLowerCase())}" aria-pressed="${active}"><span>${escapeHtml(block)}</span>${weekCurrent?'<small>Atual</small>':''}</button>`;
  }).join('')}</div>`;
}
function renderScheduleDayPicker() {
  const today=studyDateKey();
  const anchor=ui.scheduleWeekAnchor || today;
  const days=currentWeekDates(anchor);
  const labels=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  const currentBlock=String(currentScheduleBlock());
  const countForDay=day => state.schedule.filter(item => {
    const inBlock=ui.scheduleBlock==='Todos' || (ui.scheduleBlock==='Atual' ? String(item.block)===currentBlock : String(item.block)===String(ui.scheduleBlock));
    return item.date===day && inBlock;
  }).length;
  return `<div class="mission-days"><div class="mission-days-head"><div><h3>Aulas por dia</h3><span>Escolha uma data para ver somente as aulas daquele dia</span></div><button class="tiny-btn mission-day-all ${ui.scheduleDay?'':'active'}" type="button" data-schedule-day="" aria-pressed="${!ui.scheduleDay}">Todas as aulas</button></div><div class="mission-week"><button class="mission-week-nav" type="button" data-schedule-week="-7" aria-label="Semana anterior">${iconSvg('previous',{weight:'regular'})}</button>${days.map((day,index)=>{const count=countForDay(day);const selected=ui.scheduleDay===day;const isToday=day===today;return `<button class="mission-day ${selected?'active':''} ${isToday?'today':''}" type="button" data-schedule-day="${day}" aria-pressed="${selected}" aria-label="${labels[index]}, ${fmtDate(day)}: ${count} ${count===1?'aula':'aulas'}"><span>${labels[index]}</span><strong>${day.slice(8,10)}</strong><small>${isToday?'Hoje':`${count} ${count===1?'aula':'aulas'}`}</small></button>`;}).join('')}<button class="mission-week-nav" type="button" data-schedule-week="7" aria-label="Próxima semana">${iconSvg('next',{weight:'regular'})}</button><button class="tiny-btn mission-today-button" type="button" data-schedule-today>${iconSvg('calendar',{weight:'regular'})}<span>Ir para hoje</span></button></div></div>`;
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
    { id: 'daily-video', scheduleId: lessons[0]?.id || '', type: 'Videoaulas', icon: 'video', label: lessonLabel, done: videosDone >= videoTarget, progress: videosDone, target: videoTarget, unit: videoTarget === 1 ? 'aula' : 'aulas', foot: lessons.length ? `Bloco ${lessons[0].block} · ${dayVideoFiles.length ? `${dayVideoFiles.length} arquivos disponíveis` : lessons.map(item=>item.area).filter(Boolean).slice(0,2).join(' / ')}` : 'Aulas programadas para hoje' },
    { id: 'daily-questions', scheduleId: lessons[0]?.id || '', type: 'Questões', icon: 'question', label: `${questionTarget} questões`, done: n(log.questions) >= questionTarget, progress: n(log.questions), target: questionTarget, unit: 'questões', foot: n(log.correct)+n(log.wrong) ? `${pct(dayScore(log))} de aproveitamento` : 'Meta diária' },
    { id: 'daily-flashcards', scheduleId: lessons[0]?.id || '', type: 'Flashcards', icon: 'flashcard', label: `${flashcardTarget} flashcards`, done: n(log.flashcards) >= flashcardTarget, progress: n(log.flashcards), target: flashcardTarget, unit: 'flashcards', foot: 'Meta diária de revisão' }
  ];
}
function dailyStudyCandidates(date) {
  const today = state.schedule.filter(item => item.date === date).sort(byDate);
  const due = state.schedule
    .filter(item => item.date && item.date <= date && statusOf(item) !== 'Concluído')
    .sort(byPendingBlockOrder);
  const ordered = [...today, ...due.filter(item => !today.some(current => current.id === item.id))];
  const withVideos = ordered.filter(item => videoSourcesForSchedule(item).length);
  const video = withVideos.find(item => videoSourcesForSchedule(item).some(source => !state.videoPlayer.watched[source.id])) || withVideos[0];
  const questions = ordered.find(item => Math.max(0, lessonQuestionTarget(item) - completedQuestions(item)) > 0) || ordered[0];
  const flashcards = ordered.find(item => Math.max(0, lessonFlashcardTarget(item) - completedFlashcards(item)) > 0) || ordered[0];
  return { video, questions, flashcards };
}
function runDailyStudyChoice(button, date) {
  if(!button || button.dataset.rolling === '1') return;
  const candidates = dailyStudyCandidates(date);
  const available = ['video', 'questions', 'flashcards'].filter(kind => candidates[kind]);
  if(!available.length) {
    showStudyToast('Ainda não há uma atividade disponível para sortear.');
    return;
  }
  button.dataset.rolling = '1';
  button.disabled = true;
  button.classList.add('is-rolling');
  const labels = { video:'Videoaula', questions:'Questões', flashcards:'Flashcards' };
  let tick = 0;
  const roll = () => {
    const kind = available[tick % available.length];
    button.innerHTML = `${iconSvg('dice')}<span>${labels[kind]}...</span>`;
    tick += 1;
  };
  roll();
  const interval = setInterval(roll, 160);
  setTimeout(() => {
    clearInterval(interval);
    const kind = available[Math.floor(Math.random() * available.length)];
    const item = candidates[kind];
    button.innerHTML = `${iconSvg('dice')}<span>${labels[kind]} escolhidas</span>`;
    button.dataset.rolling = '0';
    button.disabled = false;
    button.classList.remove('is-rolling');
    showStudyToast(`${labels[kind]} escolhidas. Abrindo seu próximo passo.`);
    if(kind === 'video') openVideosForSchedule(item.id);
    else if(kind === 'questions') openQuestionsForSchedule(item.id);
    else openFlashcardsForSchedule(item.id);
  }, 2000);
}
function renderDailyRoad(date) {
  const items = dayRoadItems(date);
  const completedCount = items.filter(item => item.done).length;
  const totalProgress = items.reduce((total,item) => total + clamp(n(item.progress) / Math.max(n(item.target),1)),0) / Math.max(items.length,1);
  return `<div class="dashboard-road"><div class="daily-road-header"><div class="daily-road-heading"><span class="eyebrow">Seu plano de estudo</span><h2>Trilha do dia</h2><div class="muted">Três passos objetivos para manter o ritmo de hoje.</div></div><div class="daily-road-overview"><div class="daily-road-overview-copy"><span>Progresso de hoje</span><strong>${completedCount}<small>/${items.length} concluídos</small></strong></div><div class="daily-road-overall-progress" role="progressbar" aria-label="Progresso da trilha do dia" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(totalProgress*100)}"><span style="width:${pct(totalProgress)}"></span></div></div><div class="daily-road-tools"><button class="icon-btn daily-random-choice" id="dailyRandomChoice" type="button" title="Sortear o próximo estudo">${iconSvg('dice')}<span>Deixe-me escolher</span></button></div></div><div class="road-path">${items.map((item,index) => {
    const ratio = clamp(n(item.progress) / Math.max(n(item.target), 1));
    const partial = !item.done && n(item.progress) > 0;
    const statusText = item.done ? 'Concluído' : partial ? 'Em andamento' : 'Falta';
    const statusClass = item.done ? 'complete' : partial ? 'partial' : 'missing';
    const actionText = item.id === 'daily-video' ? 'Abrir aulas' : item.id === 'daily-questions' ? 'Fazer questões' : 'Revisar cards';
    return `<article class="road-step road-step-${index+1} ${statusClass}" style="--road-progress:${pct(ratio)}"><div class="road-step-accent" aria-hidden="true"></div><div class="road-step-head"><div class="road-icon">${iconSvg(item.icon)}</div><div class="road-step-title"><span>Passo ${String(index+1).padStart(2,'0')}</span><strong>${escapeHtml(item.type)}</strong></div><span class="road-status"><i></i>${statusText}</span></div><div class="road-content"><div class="road-label">${escapeHtml(item.label)}</div><div class="road-sub muted">${escapeHtml(item.foot)}</div></div><div class="road-progress"><div class="road-progress-row"><span>${Math.round(n(item.progress))} de ${Math.round(n(item.target))} ${escapeHtml(item.unit)}</span><strong>${pct(ratio)}</strong></div><div class="progress" role="progressbar" aria-label="Progresso em ${escapeAttr(item.type)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(ratio*100)}"><span style="width:${pct(ratio)}"></span></div></div><div class="road-actions"><button class="tiny-btn" data-road-step="${escapeAttr(item.id)}" data-road-schedule="${escapeAttr(item.scheduleId || '')}"><span>${actionText}</span>${iconSvg('next')}</button></div></article>`;
  }).join('')}</div></div>`;
}
function dailyMissionSteps(date) {
  return dayRoadItems(date);
}
function currentDailyMissionStep(date) {
  return dailyMissionSteps(date).find(item => !item.done) || null;
}
function currentWeekDates(date) {
  const weekday = PlannerUX.weekdayFor(date);
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  return Array.from({length:7}, (_, index) => PlannerUX.addDays(date, mondayOffset + index));
}
function dayHasActivity(date) {
  const log = state.dayLogs.find(x => x.date === date);
  if(!log) return false;
  return n(log.videos) + n(log.flashcards) + n(log.questions) + n(log.lessonMinutes) + n(log.flashcardMinutes) + n(log.questionMinutes) + n(log.materialMinutes) + n(log.simuladoMinutes) > 0;
}
function dailyMissionDayIcon(status) {
  if(status === 'done') return iconSvg('success');
  if(status === 'missed') return iconSvg('close');
  if(status === 'today-pending') return '<span class="daily-mission-day-dots"><span></span><span></span><span></span></span>';
  return '';
}
function renderDailyMissionPanel(date) {
  const week = currentWeekDates(date);
  const dayLetters = ['S','T','Q','Q','S','S','D'];
  const dayNames = ['segunda','terça','quarta','quinta','sexta','sábado','domingo'];
  const todayKey = studyDateKey();
  const weekRow = week.map((day, index) => {
    const active = dayHasActivity(day);
    let status;
    if(day === todayKey) status = active && !currentDailyMissionStep(day) ? 'done' : 'today-pending';
    else if(day < todayKey) status = active ? 'done' : 'missed';
    else status = 'future';
    const statusText = status === 'done' ? 'estudado' : status === 'missed' ? 'sem estudo' : status === 'today-pending' ? 'em andamento' : 'ainda não chegou';
    const content = status === 'future' ? `<span>${dayLetters[index]}</span>` : dailyMissionDayIcon(status);
    return `<span class="daily-mission-day ${status}" title="${escapeAttr(fmtDate(day))} — ${escapeAttr(dayNames[index])}, ${escapeAttr(statusText)}">${content}</span>`;
  }).join('');
  const steps = dailyMissionSteps(date);
  const step = currentDailyMissionStep(date);
  const stepIndex = step ? steps.findIndex(item => item.id === step.id) : steps.length;
  const actionLabel = step?.id === 'daily-video' ? 'Assistir aula' : step?.id === 'daily-questions' ? 'Fazer questões' : 'Revisar flashcards';
  let card;
  if(step) {
    const ratio = clamp(n(step.progress) / Math.max(n(step.target), 1));
    const remaining = Math.max(0, Math.round(n(step.target) - n(step.progress)));
    const rocketPos = Math.min(96, Math.max(3, Math.round(ratio * 100)));
    const statusTag = n(step.progress) > 0
      ? `<span class="daily-mission-tag status-progress">${iconSvg('energy')}Em andamento</span>`
      : `<span class="daily-mission-tag status-todo">${iconSvg('flag')}Não iniciado</span>`;
    card = `<div class="daily-mission-card"><div class="daily-mission-card-head"><span class="daily-mission-tag priority">${iconSvg('target')}Passo ${stepIndex+1} de ${steps.length}</span>${statusTag}</div><h3>${escapeHtml(step.type)}</h3><p class="muted">${escapeHtml(step.label)}</p><div class="daily-mission-stats"><span>↓ ${Math.round(n(step.progress))} ${escapeHtml(step.unit)} concluídas</span><span>↓ ${pct(ratio)} da meta</span></div><div class="daily-mission-track"><div class="progress"><span style="width:${pct(ratio)}"></span></div><span class="daily-mission-rocket ${ratio < 1 ? 'flying' : ''}" style="left:${rocketPos}%">🚀</span></div><div class="daily-mission-remaining">${remaining > 0 ? `Faltam ${remaining} ${escapeHtml(step.unit)} para a meta` : 'Meta batida! 🎉'}</div><div class="daily-mission-actions"><button class="daily-mission-cta" data-mission-step="${escapeAttr(step.id)}" data-mission-schedule="${escapeAttr(step.scheduleId||'')}">${actionLabel}${iconSvg('next')}</button></div></div>`;
  } else {
    card = `<div class="daily-mission-card daily-mission-done"><strong>Missão do dia concluída 🎉</strong><span class="muted">Você já cumpriu os 3 passos de hoje.</span></div>`;
  }
  return `<div class="daily-mission-panel-head"><h3>${iconSvg('sparkle')}Trilha do dia</h3><button class="daily-mission-close" type="button" aria-label="Fechar trilha do dia">${iconSvg('close')}</button></div><div class="daily-mission-week">${weekRow}</div>${card}`;
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
  return `<section class="dashboard-countdown-compact" aria-label="Contagem regressiva"><span class="dashboard-countdown-icon">${iconSvg('timer')}</span><div><span class="eyebrow">Contagem regressiva</span><div id="countdownValue"><strong>${escapeHtml(countdownText(p))}</strong><small>${escapeHtml(countdownPrecision(p))}</small></div></div><details class="dashboard-countdown-settings"><summary class="tiny-btn" title="Alterar data-alvo">Data-alvo</summary><div><input class="input" id="countdownDate" inputmode="numeric" placeholder="dd/mm/aaaa"><span class="countdown-detail" id="countdownDetail">${p.totalDays} dias no total</span></div></details></section>`;
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
const PLANNER_HISTORY_MAX_KEY = 'enamed-planner-history-max';
const initialPlannerHistoryIndex = Number(history.state?.plannerHistoryIndex);
const plannerHistoryRestored = Number.isFinite(initialPlannerHistoryIndex);
let plannerHistoryIndex = plannerHistoryRestored ? Math.max(0,initialPlannerHistoryIndex) : 0;
let plannerHistoryMax = plannerHistoryRestored ? Math.max(plannerHistoryIndex,Number(sessionStorage.getItem(PLANNER_HISTORY_MAX_KEY))||0) : 0;
if(!plannerHistoryRestored) sessionStorage.setItem(PLANNER_HISTORY_MAX_KEY,'0');
function updatePlannerHistoryButtons() {
  const back=document.getElementById('headerHistoryBack');
  const forward=document.getElementById('headerHistoryForward');
  if(back) back.disabled=plannerHistoryIndex<=0;
  if(forward) forward.disabled=plannerHistoryIndex>=plannerHistoryMax;
}
function pushPlannerHistoryState(hash) {
  plannerHistoryIndex+=1;
  plannerHistoryMax=plannerHistoryIndex;
  sessionStorage.setItem(PLANNER_HISTORY_MAX_KEY,String(plannerHistoryMax));
  history.pushState(navigationSnapshot(),'',hash);
  updatePlannerHistoryButtons();
}
function currentRouteState() {
  const activeRun=state.simuladoRuns?.find(run=>run.id===ui.activeSimRunId);
  return {
    tab:ui.tab,
    questionId:ui.tab==='questoes'?(ui.qQuestionId||filteredQuestions?.()?.[ui.qIndex]?.id||''):'',
    videoId:ui.tab==='aulas'?(ui.videoSourceId||state.videoPlayer?.lastOpen?.sourceId||''):'',
    simulationId:activeRun?.sourceSimulationId||activeRun?.importedSimId||'gerado',
    attemptId:ui.tab==='simulados'?activeRun?.id||'':'',
    questionIndex:activeRun?.currentIndex||0
  };
}
function navigationSnapshot() {
  return {
    plannerHistoryIndex,
    route:currentRouteState(),
    ui:{
      tab:ui.tab,qBlock:ui.qBlock,qSource:ui.qSource,qTopic:ui.qTopic,qStatus:ui.qStatus,qSearch:ui.qSearch,qIndex:ui.qIndex,qQuestionId:ui.qQuestionId,
      videoBlock:ui.videoBlock,videoSearch:ui.videoSearch,videoLessonId:ui.videoLessonId,videoSourceId:ui.videoSourceId,
      materialsSection:ui.materialsSection,materialBlock:ui.materialBlock,materialSpecialty:ui.materialSpecialty,materialScheduleId:ui.materialScheduleId,materialDocId:ui.materialDocId,materialSearch:ui.materialSearch,materialFocusMode:ui.materialFocusMode,
      activeSimRunId:ui.activeSimRunId,simulationLibraryOpen:ui.simulationLibraryOpen
    },
    scrollY:window.scrollY
  };
}
function syncRouteFromUI(mode='replace') {
  if(!PlannerUX) return;
  const route=currentRouteState();
  const hash=PlannerUX.buildRoute(route);
  const current=`${window.location.hash||''}`;
  if(mode==='push') {
    history.replaceState(navigationSnapshot(),'',window.location.href);
    pushPlannerHistoryState(hash);
  } else if(current!==hash) history.replaceState(navigationSnapshot(),'',hash);
  else history.replaceState(navigationSnapshot(),'',window.location.href);
  updatePlannerHistoryButtons();
}
function closeTransientPanels() {
  setPomodoroPanelOpen(false);
  setDailyMissionPanelOpen(false);
  document.querySelectorAll('.dashboard-gamification-popover[open]').forEach(details => details.removeAttribute('open'));
}
function pauseOpenVideo() {
  const video=document.getElementById('lessonVideo');
  if(!video) return;
  saveOpenVideoPosition();
  video.pause();
  // O <video> não é destruído ao trocar de aba (só fica escondido), então sem isso o
  // navegador continuava baixando o MP4 do R2 em segundo plano mesmo fora da aba
  // Aulas. O preload="auto" agressivo é intencional e deve continuar enquanto a aula
  // está aberta (protege de travar em internet fraca), só não faz sentido consumir
  // R2/dados do celular parado em outra aba. A posição já foi salva acima; ao reabrir
  // a aula, bindVideoPlayer recria o <video> com a fonte e retoma do mesmo ponto.
  video.removeAttribute('src');
  video.load();
}
function prepareViewTransition(nextTab,{confirmQuestion=true}={}) {
  if(ui.tab===nextTab) return true;
  if(confirmQuestion && ui.tab==='questoes' && nextTab!=='questoes' && !settleQuestionTimerBeforeLeave()) return false;
  if(autoStudyIsRunning()) stopAutoStudy();
  if(ui.tab==='aulas') pauseOpenVideo();
  closeTransientPanels();
  return true;
}
function isInteractiveTarget(target) {
  return Boolean(target?.matches?.('input,textarea,select,button,a,summary,video,audio,[role="button"],[contenteditable="true"]') || target?.closest?.('[contenteditable="true"]'));
}
function observePlannerHeaderHeight() {
  const header=document.querySelector('.app-header');
  if(!header) return;
  const update=()=>document.documentElement.style.setProperty('--app-header-height',`${Math.ceil(header.getBoundingClientRect().height)}px`);
  update();
  if('ResizeObserver' in window) new ResizeObserver(update).observe(header);
  else window.addEventListener('resize',update,{passive:true});
}
function navigateToTab(nextTab,{push=true}={}) {
  if(!nextTab) return false;
  if(ui.tab===nextTab) {
    syncRouteFromUI('replace');
    render();
    return true;
  }
  const previousSnapshot=navigationSnapshot();
  if(!prepareViewTransition(nextTab)) return false;
  history.replaceState(previousSnapshot,'',window.location.href);
  ui.tab=nextTab;
  if(nextTab==='simulados'&&ui.activeSimRunId) ui.simulationLibraryOpen=false;
  const hash=PlannerUX?.buildRoute(currentRouteState())||`#/${nextTab}`;
  if(push) pushPlannerHistoryState(hash);
  else history.replaceState(navigationSnapshot(),'',hash);
  render();
  requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'auto'}));
  return true;
}
function restoreNavigation(event) {
  const parsed=PlannerUX?.parseRoute(window.location.hash)||{tab:'painel'};
  const snapshot=event?.state;
  if(Number.isFinite(Number(snapshot?.plannerHistoryIndex))) {
    plannerHistoryIndex=Math.max(0,Number(snapshot.plannerHistoryIndex));
    plannerHistoryMax=Math.max(plannerHistoryMax,plannerHistoryIndex);
  }
  const nextTab=parsed.tab||snapshot?.ui?.tab||'painel';
  if(!prepareViewTransition(nextTab)) {
    history.forward();
    return;
  }
  if(snapshot?.ui) Object.assign(ui,snapshot.ui);
  ui.tab=nextTab;
  updatePlannerHistoryButtons();
  if(parsed.questionId) { ui.qQuestionId=parsed.questionId; ui.qRouteRestorePending=true; }
  if(parsed.videoId) ui.videoSourceId=parsed.videoId;
  if(parsed.attemptId) {
    ui.activeSimRunId=parsed.attemptId;
    ui.simulationLibraryOpen=false;
    const run=state.simuladoRuns?.find(item=>item.id===parsed.attemptId);
    if(run) run.currentIndex=Math.max(0,Math.min(run.questionIds.length-1,n(parsed.questionIndex)));
  }
  render();
  requestAnimationFrame(()=>window.scrollTo({top:Math.max(0,n(snapshot?.scrollY)),behavior:'auto'}));
}
function renderTabs() {
  let lastGroup;
  document.getElementById('tabs').innerHTML = views.map(([id,label,icon]) => {
    const group = VIEW_GROUPS[id] || null;
    const header = group && group !== lastGroup ? `<div class="tab-group-label">${escapeHtml(group)}</div>` : '';
    lastGroup = group;
    return `${header}<button class="tab tab-${id.replace(/[^a-z0-9]+/gi,'-')} ${ui.tab===id?'active':''}" data-tab="${id}" title="${escapeAttr(label)}"><span class="tab-icon">${iconSvg(icon)}</span><span class="tab-label">${label}</span></button>`;
  }).join('');
  document.querySelectorAll('#tabs .tab').forEach(b => b.onclick = () => navigateToTab(b.dataset.tab));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id===ui.tab));
  if(window.matchMedia('(max-width: 1180px)').matches) {
    requestAnimationFrame(() => {
      const active=document.querySelector('.tab.active');
      const tabs=document.getElementById('tabs');
      const vertical=tabs && getComputedStyle(tabs).flexDirection==='column';
      active?.scrollIntoView({block:vertical?'center':'nearest',inline:vertical?'nearest':'center',behavior:'auto'});
    });
  }
}
function resumePomodoroSession() {
  if(!pomodoro.mode) return;
  if(pomodoro.running) {
    pomodoro.remaining=Math.max(0,Math.ceil((pomodoro.endAt-Date.now())/1000));
    if(pomodoro.remaining<=0) {
      finishPomodoroPhase();
      return;
    }
    if(pomodoroInterval) clearInterval(pomodoroInterval);
    pomodoroInterval=setInterval(updatePomodoro,1000);
  }
  updatePomodoroWidget();
}
function setupSidebar() {
  const toggle = document.getElementById('sidebarToggle');
  const apply = collapsed => {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    if(toggle) {
      toggle.innerHTML = iconSvg(collapsed ? 'next' : 'previous',{weight:'regular'});
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
function iconSvg(name,options={}) {
  return window.ENAMED_ICONS?.AppIcon(name,options) || '';
}
function renderDashboardMood(log) {
  return `<section class="card dashboard-today-focus"><div class="dashboard-mood-copy"><div><span class="eyebrow">Hoje</span><h2>Como você está?</h2></div><span class="muted">Defina seu ritmo</span></div><div class="mood-row">${[[3,'🙂','Motivado'],[2,'😐','Mais ou menos'],[1,'😴','Lento']].map(([value,face,label]) => `<button class="mood-btn ${n(log.mood)===value?'active':''}" data-dashboard-mood="${value}" aria-pressed="${n(log.mood)===value}"><span>${face}</span><small>${label}</small></button>`).join('')}</div>${renderUpcomingReviews({compact:true})}</section>`;
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
  if(date === studyDateKey() && studyTimeTracker.kind) {
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
  return `<section class="card daily-analysis"><div class="section-title"><div><span class="eyebrow">Seu desempenho</span><h2>Análise do dia</h2></div></div><div class="daily-analysis-grid">${tiles.map(tile => `<article class="daily-analysis-tile"><span class="daily-analysis-icon">${iconSvg(tile.icon)}</span><div><span class="daily-analysis-label">${tile.label}</span><strong>${tile.value}</strong><small title="${escapeAttr(tile.foot)}">${tile.foot}</small>${tile.progress === null ? '' : `<div class="daily-analysis-progress" role="progressbar" aria-label="Progresso de ${escapeAttr(tile.label)}" aria-valuenow="${tile.progress}" aria-valuemin="0" aria-valuemax="100"><span style="width:${tile.progress}%"></span></div>`}</div></article>`).join('')}</div></section>`;
}

function latestDashboardActivity() {
  const candidates=[];
  const lastVideo=state.videoPlayer?.lastOpen;
  if(lastVideo?.lessonId && lastVideo?.updatedAt) {
    const lesson=displayVideoLessons().find(item=>item.id===lastVideo.lessonId);
    const source=lesson?.videos?.find(item=>item.id===lastVideo.sourceId);
    const progress=state.videoPlayer?.progress?.[lastVideo.sourceId] || {};
    const seconds=Math.max(0,n(progress.currentTime ?? state.videoPlayer?.resume?.[lastVideo.sourceId]));
    candidates.push({type:'video',icon:'play',title:source?.label||lesson?.title||'Videoaula',module:lesson?.title||'Videoaulas',updatedAt:lastVideo.updatedAt,position:seconds?`Retomar em ${formatVideoTime(seconds)}`:'Retomar do início',lessonId:lastVideo.lessonId,sourceId:lastVideo.sourceId});
  }
  Object.entries(state.questionProgress||{}).forEach(([questionId,progress])=>{
    if(!progress?.answeredAt) return;
    const question=questionBank.find(item=>item.id===questionId);
    candidates.push({type:'question',icon:'brain',title:question?.topic||question?.title||`Questão ${question?.number||''}`.trim(),module:`Bloco ${question?.block||progress.block||'—'} · Questões`,updatedAt:progress.answeredAt,position:question?.number?`Questão ${question.number}`:'Voltar à questão',questionId});
  });
  (state.simuladoRuns||[]).forEach(run=>{
    if(!run?.updatedAt) return;
    candidates.push({type:'simulado',icon:'simulations',title:run.name||'Simulado ENAMED',module:'Simulados',updatedAt:run.updatedAt,position:run.finishedAt?'Rever resultado':`Questão ${n(run.currentIndex)+1}`,runId:run.id});
  });
  (state.flashcardSystem?.reviewLogs||[]).forEach(review=>{
    if(!review?.reviewedAt) return;
    const card=state.flashcardLibrary?.find(item=>item.id===review.cardId);
    candidates.push({type:'flashcard',icon:'cards',title:card?.front||card?.question||'Revisão de flashcards',module:card?.deck||card?.topic||'Flashcards',updatedAt:review.reviewedAt,position:'Continuar revisão',cardId:review.cardId||''});
  });
  const lastMaterial=lastReadMaterialMeta();
  if(lastMaterial) candidates.push({
    type:'material',icon:'materials',title:lastMaterial.meta.lastTitle||'Material de estudo',
    module:lastMaterial.meta.lastArea||'Materiais',updatedAt:lastMaterial.meta.lastReadAt,
    position:lastMaterial.meta.lastHeadingText?`Retomar em ${lastMaterial.meta.lastHeadingText}`:'Continuar leitura',docId:lastMaterial.docId
  });
  return candidates.sort((a,b)=>(Date.parse(b.updatedAt)||0)-(Date.parse(a.updatedAt)||0))[0]||null;
}
function dashboardActivityTimestamp(value) {
  const date=new Date(value);
  if(Number.isNaN(date.getTime())) return 'Ainda sem horário registrado';
  return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(date);
}
function renderContinueStudying() {
  const activity=latestDashboardActivity();
  if(!activity) return `<section class="card continue-study-card is-empty"><span class="continue-study-icon">${iconSvg('play')}</span><div><span class="eyebrow">Prioridade</span><h2>Continuar estudando</h2><p>A primeira atividade que você abrir ficará disponível aqui para retomada.</p></div><button class="icon-btn primary" data-dashboard-continue="empty">Abrir trilha</button></section>`;
  return `<section class="card continue-study-card"><span class="continue-study-icon">${iconSvg(activity.icon)}</span><div class="continue-study-copy"><span class="eyebrow">Continuar estudando</span><h2>${escapeHtml(activity.title)}</h2><p>${escapeHtml(activity.module)} · ${escapeHtml(activity.position)}</p><small>Última atividade: ${escapeHtml(dashboardActivityTimestamp(activity.updatedAt))}</small></div><button class="icon-btn primary" data-dashboard-continue="${escapeAttr(activity.type)}" data-continue-lesson="${escapeAttr(activity.lessonId||'')}" data-continue-source="${escapeAttr(activity.sourceId||'')}" data-continue-question="${escapeAttr(activity.questionId||'')}" data-continue-run="${escapeAttr(activity.runId||'')}" data-continue-material="${escapeAttr(activity.docId||'')}">${iconSvg('next')}<span>Retomar</span></button></section>`;
}
async function openDashboardActivity(button) {
  const type=button.dataset.dashboardContinue;
  let nextTab='';
  if(type==='video') {
    ui.videoLessonId=button.dataset.continueLesson||'';
    ui.videoSourceId=button.dataset.continueSource||'';
    nextTab='aulas';
  } else if(type==='question') {
    ui.qQuestionId=button.dataset.continueQuestion||'';
    ui.qRouteRestorePending=true;
    ui.qStatus='Todas';
    nextTab='questoes';
  } else if(type==='simulado') {
    ui.activeSimRunId=button.dataset.continueRun||'';
    ui.simulationLibraryOpen=false;
    nextTab='simulados';
  } else if(type==='flashcard') {
    nextTab='flashcards';
  } else if(type==='material') {
    await loadMaterialLibrary();
    const doc=materialLibrary.find(item=>item.id===(button.dataset.continueMaterial||''));
    if(!doc) return;
    prepareMaterialDocOpen(doc,true);
    nextTab='materiais';
  } else {
    document.querySelector('.dashboard-road')?.scrollIntoView({behavior:'smooth',block:'start'});
    return;
  }
  navigateToTab(nextTab);
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
    if(flashcards) { log.flashcardsOn=true; log.manualFlashcards=n(log.manualFlashcards)+flashcards; log.flashcards=n(log.flashcards)+flashcards; }
    persist();
  };
}
function gamificationActivityLabel(transaction) {
  const labels={question_answer:'Questão respondida',question_error_review:'Erro revisado',video_progress:'Videoaula assistida',video_completion:'Videoaula concluída',flashcard_review:'Flashcard revisado',flashcard_session:'Sessão de flashcards',simulation_completion:'Simulado concluído',simulation_review:'Erros do simulado revisados',block_completion:'Bloco concluído',question_session:'Sessão de questões',import_reversal:'Importação desfeita'};
  return labels[transaction.activity_type] || transaction.activity_type || 'Atividade';
}
function elementLabel(element) { return ({fire:'Fogo',water:'Água',earth:'Terra',air:'Ar'})[element] || element || 'Sem elemento'; }
function simulationGamificationStats() {
  ensureGamificationState();
  const runs=(state.simuladoRuns||[]).map(run=>({run,eligibility:Gamification.evaluateSimulationEligibility(simulationGamificationSnapshot(run),state.gamification)}));
  const completed=runs.filter(item=>item.eligibility.isEligibleForCompletionXP);
  const reviewed=completed.filter(item=>item.eligibility.isFullyReviewed);
  const rankProgress=Gamification.ensureRankProgress(state.gamification);
  const rewards=state.gamification.elementRewards||[];
  const active=rewards.filter(reward=>reward.openedAt&&reward.expiresAt&&Date.parse(reward.expiresAt)>Date.now());
  return {completed:completed.length,reviewed:reviewed.length,average:completed.length?completed.reduce((sum,item)=>sum+n(item.eligibility.scorePercent),0)/completed.length:0,fragments:n(rankProgress.fragments),medallionsAvailable:Math.max(0,n(rankProgress.simulationMedallions)-n(rankProgress.simulationMedallionsUsed)),activeRewards:active,sealedRewards:rewards.filter(reward=>!reward.openedAt)};
}
function renderSimuladoEstatisticas() {
  if(!Gamification) return '';
  const stats=simulationGamificationStats();
  const active=stats.activeRewards.sort((a,b)=>Date.parse(a.expiresAt)-Date.parse(b.expiresAt))[0];
  const remaining=active?Math.max(0,Date.parse(active.expiresAt)-Date.now()):0;
  const hours=Math.floor(remaining/3600000);
  const minutes=Math.floor(remaining%3600000/60000);
  const elementCard=active?`<div class="gamification-sim-element"><span class="eyebrow">Buff elemental ativo</span><strong>${active.elements.map(elementLabel).join(' + ')} · ${escapeHtml(active.rarityLabel||active.rarity)}</strong><span>x${String(active.multiplier).replace('.',',')} · ${hours}h ${minutes}min restantes</span></div>`:`<div class="gamification-sim-element muted"><span class="eyebrow">Buff elemental</span><strong>Nenhum buff ativo</strong><span>Corrija integralmente um simulado para liberar uma recompensa.</span></div>`;
  return `<section class="card gamification-simulation-card"><div class="section-title"><div><span class="eyebrow">Jornada de simulados</span><h2>Estatísticas</h2></div></div><div class="gamification-sim-metrics"><div><strong>${stats.completed}</strong><span>concluídos</span></div><div><strong>${stats.reviewed}</strong><span>corrigidos</span></div><div><strong>${Math.round(stats.average)}%</strong><span>média</span></div><div><strong>${stats.fragments}/3</strong><span>fragmentos</span></div><div><strong>${stats.medallionsAvailable}</strong><span>medalhões livres</span></div></div>${elementCard}${stats.sealedRewards.length?`<button class="icon-btn primary" data-open-sealed-reward="${escapeAttr(stats.sealedRewards[0].id)}">Revelar ${stats.sealedRewards.length} recompensa${stats.sealedRewards.length===1?'':'s'}</button>`:''}</section>`;
}
function renderGamificationPopover() {
  return `<details class="dashboard-gamification-popover"><summary>${renderGamificationDashboard(true)}</summary><div>${renderGamificationDashboard(false)}</div></details>`;
}
function renderGamificationDashboard(compact=false) {
  ensureGamificationState();
  const profile=Gamification ? Gamification.refreshProfile(state.gamification) : {level:1,totalXP:0,xpWithinLevel:0,xpForNextLevel:100,remainingXP:100,progress:0};
  const blocks=completedAcademicBlockIds();
  const academicRank=Gamification?.getRankFromCompletedBlocks ? Gamification.getRankFromCompletedBlocks(blocks.length) : {name:'Aldeão',completedBlocks:blocks.length,nextRank:null,blocksForNextRank:0,progressPercent:0,isMaxRank:false,currentRangeStart:0};
  const rank=Gamification?.getRankFromProgress ? Gamification.getRankFromProgress(blocks.length,state.gamification.rankProgress) : academicRank;
  const history=[...(state.gamification.xpTransactions || [])].sort((a,b)=>Date.parse(b.occurred_at||'')-Date.parse(a.occurred_at||'')).slice(0,6);
  const classAsset=window.ENAMED_ICONS?.RpgAsset(rank.key,{label:`Personagem da classe ${rank.name}`,width:150,height:210,className:'rank-character'})||'';
  const progressText=rank.isMaxRank?'Classe máxima alcançada':rank.accelerated?`Classe acelerada por simulado · progresso acadêmico real: ${academicRank.name}`:`Faltam ${academicRank.blocksForNextRank} ${academicRank.blocksForNextRank===1?'bloco':'blocos'} para ${escapeHtml(academicRank.nextRank.name)}`;
  const segmentTotal=academicRank.isMaxRank?30:academicRank.nextRank.currentRangeStart-academicRank.currentRangeStart;
  const segmentDone=academicRank.isMaxRank?30:academicRank.completedBlocks-academicRank.currentRangeStart;
  const availableMedallions=Math.max(0,n(state.gamification.rankProgress?.simulationMedallions)-n(state.gamification.rankProgress?.simulationMedallionsUsed));
  if(compact) return `<section class="card gamification-card gamification-card--compact"><div class="gamification-compact-avatar">${classAsset}</div><div class="gamification-compact-info"><div class="section-title"><div><span class="eyebrow">Gamificação</span><h2>${escapeHtml(rank.name)} · Nível ${profile.level}</h2></div></div><strong class="compact-xp">${Math.round(n(profile.totalXP))} XP</strong><div class="progress"><span style="width:${pct(profile.progress)}"></span></div><div class="gamification-progress-label"><span>${Math.round(n(profile.xpWithinLevel))}/${Math.round(n(profile.xpForNextLevel))} XP</span><span>${academicRank.completedBlocks}/30 blocos</span></div><small class="compact-rank-next">${progressText}</small></div></section>`;
  return `<section class="card gamification-card"><div class="gamification-head"><div class="gamification-rank">${classAsset}<div><span class="eyebrow">Classe RPG</span><h2>${escapeHtml(rank.name)} <small>· Nível ${profile.level}</small></h2><p>Blocos acadêmicos: <strong>${academicRank.completedBlocks}/30</strong>${rank.accelerated?` · <strong>aceleração ativa</strong>`:''}</p></div></div><div class="gamification-progress"><div class="section-title"><div><span class="eyebrow">Experiência</span><h2>${Math.round(n(profile.totalXP))} XP acumulados</h2></div><span class="badge today">Nível ${profile.level}</span></div><div class="progress"><span style="width:${pct(profile.progress)}"></span></div><div class="gamification-progress-label"><span>${Math.round(n(profile.xpWithinLevel))}/${Math.round(n(profile.xpForNextLevel))} XP neste nível</span><span>faltam ${Math.round(n(profile.remainingXP))} XP</span></div></div></div><div class="rank-progress-panel"><div><strong>${rank.isMaxRank?'Imperador':`Próxima classe acadêmica: ${escapeHtml(academicRank.nextRank?.name||rank.nextRank?.name||'Imperador')}`}</strong><span>${progressText}</span></div><div class="progress" aria-label="Progresso acadêmico para a próxima classe"><span style="width:${academicRank.progressPercent}%"></span></div><small>${segmentDone}/${segmentTotal} blocos · ${availableMedallions} medalhão livre</small></div>${history.length?`<div class="xp-history-mini">${history.map(transaction=>`<div><span><strong>${escapeHtml(gamificationActivityLabel(transaction))}</strong><small>${fmtDate(String(transaction.occurred_at||'').slice(0,10))}${transaction.is_legacy?' · Legado':''}${transaction.metadata?.element?` · ${elementLabel(transaction.metadata.element)}`:''}</small></span><b class="${n(transaction.final_xp)<0?'negative':''}">${n(transaction.final_xp)>0?'+':''}${roundDisplayXP(transaction.final_xp)} XP</b></div>`).join('')}</div>`:'<div class="muted">O histórico de XP aparecerá após uma atividade nova ou uma importação retroativa confirmada.</div>'}</section>`;
}

function upcomingReviewGroups() {
  const now=Date.now();
  const cards=flashcardAllRecords().map(card=>({card,due:Date.parse(flashcardProgress(card).dueAt||`${flashcardProgress(card).nextReview||studyDateKey()}T05:00:00`)})).filter(item=>Number.isFinite(item.due)).sort((a,b)=>a.due-b.due);
  return [
    {label:'Aprendendo agora',count:cards.filter(item=>item.due<=now).length,foot:'estudar agora'},
    {label:'Nas próximas 2 h',count:cards.filter(item=>item.due>now&&item.due<=now+7200000).length,foot:'fila próxima'},
    {label:'Até amanhã',count:cards.filter(item=>item.due>now+7200000&&item.due<=now+86400000).length,foot:'programados'}
  ];
}
function renderUpcomingReviews({compact=false}={}) {
  const groups=upcomingReviewGroups();
  if(compact) {
    const due=groups[0];
    return `<div class="dashboard-review-compact"><div><span class="dashboard-review-icon tone-0">${iconSvg('cards')}</span><span><strong>${due.count} revisões devidas</strong><small>${due.count ? 'Sua fila de estudo está pronta.' : 'Nenhuma revisão vencida agora.'}</small></span></div><button class="tiny-btn" data-dashboard-open-flashcards>Estudar</button></div>`;
  }
  return `<section class="card dashboard-review-card"><div class="section-title"><div><span class="eyebrow">FSRS</span><h2>Próximas revisões</h2></div><button class="tiny-btn" data-dashboard-open-flashcards>Estudar</button></div><div class="dashboard-review-list">${groups.map((group,index)=>`<div><span class="dashboard-review-icon tone-${index}">${iconSvg('cards')}</span><strong>${group.count}</strong><span>${group.label}</span><small>${group.foot}</small></div>`).join('')}</div></section>`;
}
function weeklyDashboardData(date) {
  const todayDow=new Date(`${studyDateKey()}T12:00:00`).getDay();
  const sundayKey=PlannerUX.addDays(studyDateKey(),(-todayDow)+7*(ui.weeklyWeekOffset||0));
  const dates=Array.from({length:7},(_,index)=>PlannerUX.addDays(sundayKey,index));
  const snapshots=dates.map(day=>dailyStudySnapshot(day));
  const simulations=dates.map(day=>(state.simuladoRuns||[]).filter(run=>String(run.finishedAt||run.updatedAt||'').slice(0,10)===day && run.finishedAt && !run.abandonedAt).length);
  return {dates,snapshots,simulations};
}
function renderWeeklyPerformance(date) {
  const data=weeklyDashboardData(date);
  const todayKey=studyDateKey();
  const metrics={
    hours:{label:'Horas',values:data.snapshots.map(snapshot=>snapshot.totalMinutes),format:value=>formatDailyStudyTime(value),summary:data.snapshots.reduce((sum,snapshot)=>sum+snapshot.totalMinutes,0)},
    questions:{label:'Questões',values:data.snapshots.map(snapshot=>snapshot.questions),format:value=>`${Math.round(value)}`,summary:data.snapshots.reduce((sum,snapshot)=>sum+snapshot.questions,0)},
    flashcards:{label:'Revisões',values:data.snapshots.map(snapshot=>snapshot.flashcards),format:value=>`${Math.round(value)}`,summary:data.snapshots.reduce((sum,snapshot)=>sum+snapshot.flashcards,0)},
    videos:{label:'Aulas',values:data.snapshots.map(snapshot=>snapshot.videos),format:value=>`${Math.round(value)}`,summary:data.snapshots.reduce((sum,snapshot)=>sum+snapshot.videos,0)},
    simulados:{label:'Simulados',values:data.simulations,format:value=>`${Math.round(value)}`,summary:data.simulations.reduce((sum,value)=>sum+value,0)}
  };
  const metric=metrics[ui.weeklyMetric] || metrics['hours'];
  const max=Math.max(1,...metric.values);
  const summary=[
    ['Tempo',formatDailyStudyTime(metrics.hours.summary)],
    ['Questões',Math.round(metrics.questions.summary)],
    ['Revisões',Math.round(metrics.flashcards.summary)],
    ['Aulas',Math.round(metrics.videos.summary)]
  ];
  return `<section class="card dashboard-weekly-card"><div class="section-title"><div><span class="eyebrow">Semana</span><h2>Desempenho semanal</h2></div><div class="weekly-week-nav"><button class="tiny-btn" data-weekly-week-nav="-1" aria-label="Semana anterior">&larr;</button><span class="weekly-week-range">${escapeHtml(`${new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit'}).format(new Date(`${data.dates[0]}T12:00:00`))} - ${new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit'}).format(new Date(`${data.dates[6]}T12:00:00`))}`)}</span><button class="tiny-btn" data-weekly-week-nav="1" aria-label="Próxima semana" ${ui.weeklyWeekOffset>=0?'disabled':''}>&rarr;</button></div></div><div class="weekly-metric-tabs">${Object.entries(metrics).map(([key,item])=>`<button class="tiny-btn ${key===ui.weeklyMetric?'active':''}" data-weekly-metric="${key}" aria-pressed="${key===ui.weeklyMetric}">${item.label}</button>`).join('')}</div><div class="dashboard-bars weekly-bars">${data.dates.map((day,index)=>`<div class="${day===todayKey?'is-today':''}"><span style="height:${Math.max(8,Math.round(metric.values[index]/max*100))}%" title="${escapeAttr(metric.format(metric.values[index]))}" data-bar-value="${escapeAttr(metric.format(metric.values[index]))}"></span><small>${new Intl.DateTimeFormat('pt-BR',{weekday:'short'}).format(new Date(`${day}T12:00:00`)).replace('.','')}</small></div>`).join('')}</div></section><section class="card dashboard-weekly-summary"><span class="eyebrow">Resumo da semana</span><div>${summary.map(([label,value])=>`<article><strong>${escapeHtml(String(value))}</strong><small>${label}</small></article>`).join('')}</div><p class="muted">Exibindo ${escapeHtml(metric.label.toLowerCase())} no gráfico.</p></section>`;
}
function renderRadiografia() {
  const el = document.getElementById('radiografia');
  if(!window.RadioSim) { el.innerHTML = `<section class="card"><p class="muted">Carregando módulo de radiografia…</p></section>`; return; }
  if(!state.radio) state.radio = window.RadioSim.defaultState();
  window.RadioSim.mount(el, {
    getState: () => state,
    save: () => { try { writeLocalState(); } catch(e){} scheduleCloudSave(); },
    escapeHtml,
    iconSvg
  });
}
function renderSemiologia() {
  const el = document.getElementById('semiologia');
  if(!window.SemioSim) { el.innerHTML = `<section class="card"><p class="muted">Carregando módulo de semiologia…</p></section>`; return; }
  if(!state.semio) state.semio = window.SemioSim.defaultState();
  window.SemioSim.mount(el, {
    getState: () => state,
    save: () => { try { writeLocalState(); } catch(e){} scheduleCloudSave(); },
    escapeHtml,
    iconSvg
  });
}
function renderAnatomia() {
  const el = document.getElementById('anatomia');
  if(!window.AnatomiaCourse) { el.innerHTML = `<section class="card"><p class="muted">Carregando curso de anatomia…</p></section>`; return; }
  if(!state.anatomia) state.anatomia = window.AnatomiaCourse.defaultState();
  window.AnatomiaCourse.mount(el, {
    getState: () => state,
    save: () => { try { writeLocalState(); } catch(e){} scheduleCloudSave(); },
    escapeHtml,
    iconSvg
  });
}
function renderFerramentas() {
  document.getElementById('ferramentas').innerHTML = `<div class="dashboard-tools-grid">${renderManualStudyEntry(ui.refDate)}${renderLegacyImportCard()}${renderCloudBackupCard()}<section class="card dashboard-question-import-tool"><div><span class="eyebrow">Banco privado</span><h2>Adicionar questões</h2><p class="muted">Revise e incorpore novas questões sem misturar o fluxo diário.</p></div><button class="icon-btn" data-dashboard-open-question-import>${iconSvg('upload')}<span>Abrir importador</span></button></section></div><section class="card tool-danger-zone"><div><span class="eyebrow">Zona de perigo</span><h2>Restaurar dados originais</h2><p class="muted">Apaga todo o progresso salvo neste aparelho e na nuvem, voltando ao cronograma original importado do Excel. Esta ação também é sincronizada — não pode ser desfeita.</p></div><button class="icon-btn danger" id="resetBtn" type="button">${iconSvg('history')}<span>Restaurar dados originais</span></button></section>`;
  bindManualStudyEntry(ui.refDate);
  bindLegacyImportCard();
  bindCloudBackupCard();
  document.querySelector('[data-dashboard-open-question-import]')?.addEventListener('click',()=>navigateToTab('importar-questoes'));
  document.getElementById('resetBtn')?.addEventListener('click', () => {
    if(!confirm('Voltar aos dados originais importados do Excel? Esta alteração também será sincronizada.')) return;
    state=structuredClone(seed);
    normalizeOfficialScheduleNames();
    ensureRestartFromBlockTen();
    persist();
  });
}
// Um erro cometido DENTRO de um simulado nunca gravava em state.questionProgress
// (o simulado guarda tudo em run.answers/run.confidence), então essas questões
// jamais apareciam aqui, apesar do texto da tela prometer "todos os comentários
// e reflexões que você escreveu nas questões, reunidos num só lugar". Esta
// função sintetiza uma entrada por questão errada de cada simulado finalizado
// (não abandonado), ficando de fora quando já existe uma entrada "de verdade"
// vinda da prática avulsa para a mesma questão (que tem reflexão mais rica).
function simuladoErrorProgressById() {
  const map = new Map();
  (state.simuladoRuns || []).forEach(run => {
    if(!run.finishedAt || run.abandonedAt) return;
    simRunQuestions(run).forEach(question => {
      const selected = run.answers?.[question.id] || '';
      if(!selected || selected === question.answer) return;
      const existing = map.get(question.id);
      if(existing && Date.parse(existing.finishedAt || '') >= Date.parse(run.finishedAt || '')) return;
      const confidenceLevel = run.confidence?.[question.id] || '';
      const reviewed = Boolean(run.reviewedErrors?.[question.id]);
      // Sem isto, o erro do simulado aparecia no Caderno mas nunca entrava na
      // fila de "revisão pendente" (nunca ganhava nextReview) e ficava para
      // sempre invisível ao contador de pendências. "Marcar erro como
      // revisado" na tela do simulado já existe e agora conta como a revisão.
      map.set(question.id, {
        selected,
        correct: false,
        answeredAt: run.finishedAt,
        updatedAt: run.finishedAt,
        finishedAt: run.finishedAt,
        confidence: { red: 20, yellow: 55, green: 90 }[confidenceLevel] || 0,
        reviewed,
        nextReview: reviewed ? '' : studyDateKey(),
        eliminated: Array.isArray(run.eliminated?.[question.id]) ? run.eliminated[question.id] : [],
        missReason: '', notes: '', preReasoning: '', postLearning: '', correctiveRule: '',
        sourceRunId: run.id, sourceRunName: run.name
      });
    });
  });
  return map;
}
function cadernoErrosEntries() {
  // setQuestionProgress grava um registro assim que a resposta é apenas
  // rascunhada (tecla 1-5, antes de confirmar) — nesse momento não existe
  // "correct" ainda, então "!progress.correct" também era verdadeiro para
  // questões nunca respondidas de fato. Isso enchia o Caderno de Erros com
  // questões só espiadas, nunca confirmadas. Erro real exige answeredAt.
  const practice = Object.entries(state.questionProgress || {})
    .filter(([id, progress]) => (progress?.answeredAt && !progress?.correct) || String(progress?.notes || '').trim() || String(progress?.preReasoning || '').trim() || String(progress?.postLearning || '').trim() || String(progress?.correctiveRule || '').trim())
    .map(([id, progress]) => ({ id, progress, question: questionBank.find(q => q.id === id) || importedQuestionById(id) }))
    .filter(entry => entry.question);
  const practiceIds = new Set(practice.map(entry => entry.id));
  const simuladoErrors = [...simuladoErrorProgressById().entries()]
    .filter(([id]) => !practiceIds.has(id))
    .map(([id, progress]) => ({ id, progress, question: questionBank.find(q => q.id === id) || importedQuestionById(id) }))
    .filter(entry => entry.question);
  return [...practice, ...simuladoErrors]
    .sort((a, b) => Date.parse(b.progress.updatedAt || '') - Date.parse(a.progress.updatedAt || ''));
}
function renderCadernoErroCard(entry) {
  const { question, progress, id } = entry;
  const tag = questionTag(question);
  const source = question.sourceLabel || questionCollectionLabel(question.collectionBlock);
  const stem = String(question.stem || '').replace(/\s+/g, ' ').trim();
  const snippet = stem.length > 160 ? `${stem.slice(0, 160)}…` : stem;
  const answerCompare = progress.answeredAt ? `<div class="caderno-answer-compare"><span class="badge ${progress.correct ? 'done' : 'no'}">${escapeHtml(String(progress.selected || '—'))}</span><span>→</span><span class="badge done">${escapeHtml(String(question.answer || '—'))}</span></div>` : '';
  const savedAt = progress.updatedAt ? new Date(progress.updatedAt).toLocaleDateString('pt-BR') : '';
  const reviewDue = progress.nextReview && progress.nextReview <= studyDateKey();
  const reviewLabel = progress.nextReview ? (reviewDue ? 'Revisão pendente' : `Revisar em ${fmtDate(progress.nextReview)}`) : '';
  const reviewCountLabel = n(progress.reviewCount) ? `Revisões: ${n(progress.reviewCount)}` : '';
  const errorLabel = progress.missReason || progress.errorType || '';
  const noteBlock = String(progress.notes || '').trim() ? `<p class="caderno-erro-note">${escapeHtml(progress.notes)}</p>` : '';
  const ruleBlock = String(progress.correctiveRule || '').trim() ? `<div class="caderno-reflection-row"><span class="caderno-reflection-label">Regra para não errar novamente</span><p>${escapeHtml(progress.correctiveRule)}</p></div>` : '';
  const reflectionRows = [
    String(progress.preReasoning || '').trim() ? `<div class="caderno-reflection-row"><span class="caderno-reflection-label">O que eu achava antes</span><p>${escapeHtml(progress.preReasoning)}</p></div>` : '',
    String(progress.postLearning || '').trim() ? `<div class="caderno-reflection-row"><span class="caderno-reflection-label">O que sei agora</span><p>${escapeHtml(progress.postLearning)}</p></div>` : ''
  ].join('');
  // Motivo do erro, regra corretiva e anotação só eram editáveis pela tela de
  // resposta da aba Questões (renderQuestionReflection). Uma entrada vinda de
  // simulado não passa por lá — o botão "Acessar" leva de volta para a prova,
  // não para esse formulário — então nunca haveria como preencher esses
  // campos para ela. Este editor inline funciona para qualquer entrada.
  const editorOpen = ui.cadernoEditId === id;
  const cadernoErrorTypes = ['Desatenção','Dúvida / já vi','Não saber','Confusão entre conceitos','Interpretação inadequada','Falha de raciocínio clínico','Erro de conduta','Excesso de confiança'];
  const editor = editorOpen ? `<div class="caderno-erro-editor"><label class="field-label">Motivo do erro<select class="select" data-caderno-field="missReason" data-caderno-entry="${escapeAttr(id)}"><option value="">Escolher motivo</option>${cadernoErrorTypes.map(option => `<option ${progress.missReason===option?'selected':''}>${escapeHtml(option)}</option>`).join('')}</select></label><label class="field-label">Regra para não errar novamente<textarea class="textarea" data-caderno-field="correctiveRule" data-caderno-entry="${escapeAttr(id)}" placeholder="Ex.: Antes de marcar a conduta, verificar gravidade e contraindicações.">${escapeHtml(progress.correctiveRule || '')}</textarea></label><label class="field-label">Anotação<textarea class="textarea" data-caderno-field="notes" data-caderno-entry="${escapeAttr(id)}" placeholder="Comentário curto">${escapeHtml(progress.notes || '')}</textarea></label><button class="tiny-btn" data-caderno-edit-close="${escapeAttr(id)}">Fechar edição</button></div>` : '';
  const editToggle = `<button class="tiny-btn" data-caderno-edit-toggle="${escapeAttr(id)}">${editorOpen ? 'Fechar edição' : 'Editar motivo / regra / anotação'}</button>`;
  return `<div class="item caderno-erro-item"><div><div class="caderno-erro-head"><strong>${escapeHtml(source)}</strong><span class="muted">Salvo em ${escapeHtml(savedAt)}</span></div><div class="caderno-erro-tags"><span class="badge today">${escapeHtml(tag.area)}</span>${tag.topic ? `<span class="badge today">${escapeHtml(tag.topic)}</span>` : ''}${errorLabel ? `<span class="badge ${reviewDue ? 'no' : 'today'}">${escapeHtml(errorLabel)}</span>` : ''}${reviewLabel ? `<span class="badge ${reviewDue ? 'no' : 'today'}">${escapeHtml(reviewLabel)}</span>` : ''}${reviewCountLabel ? `<span class="badge today">${escapeHtml(reviewCountLabel)}</span>` : ''}${progress.sourceRunId ? `<span class="badge wait">Simulado: ${escapeHtml(progress.sourceRunName || '')}</span>` : ''}</div><p class="caderno-erro-stem">${escapeHtml(snippet)}</p>${noteBlock}${ruleBlock}${reflectionRows}${answerCompare}${editor}</div><div class="caderno-erro-actions"><button class="icon-btn" data-caderno-access="${escapeAttr(id)}" ${progress.sourceRunId ? `data-caderno-access-run="${escapeAttr(progress.sourceRunId)}"` : ''}>Acessar</button>${editToggle}${progress.correctiveRule ? `<button class="tiny-btn" data-create-rule-card="${escapeAttr(id)}">Gerar flashcard</button><button class="tiny-btn" data-generate-rule-prompts="${escapeAttr(id)}">Gerar perguntas</button>` : ''}</div></div>`;
}
function createRuleFlashcard(entryId) {
  const entry = cadernoErrosEntries().find(item => item.id === entryId);
  if(!entry || !String(entry.progress.correctiveRule || '').trim()) return;
  state.questionFlashcards ||= {};
  const cards = Array.isArray(state.questionFlashcards[entryId]) ? state.questionFlashcards[entryId] : [];
  if(cards.some(card => String(card.back || '').trim() === String(entry.progress.correctiveRule).trim())) {
    showStudyToast('Este flashcard já existe.');
    return;
  }
  const linked = scheduleForQuestion(entry.question);
  cards.unshift({
    id:`card-${entryId}-rule-${Date.now()}`,
    front:`Qual é a regra principal desta questão?`,
    back:String(entry.progress.correctiveRule).trim(),
    scheduleId:linked?.id || '', block:linked?.block || entry.question.collectionBlock,
    area:linked?.area || entry.question.area || 'Sem área', subarea:linked?.topic || entry.question.topic || 'Caderno de erros',
    topic:linked?.topic || entry.question.topic || 'Caderno de erros', createdAt:new Date().toISOString()
  });
  state.questionFlashcards[entryId] = cards;
  persist();
  showStudyToast('Flashcard criado a partir da regra corretiva.');
  renderCadernoErros();
}
function generateRulePrompts(entryId) {
  const entry = cadernoErrosEntries().find(item => item.id === entryId);
  if(!entry || !String(entry.progress.correctiveRule || '').trim()) return;
  state.questionFlashcards ||= {};
  const cards = Array.isArray(state.questionFlashcards[entryId]) ? state.questionFlashcards[entryId] : [];
  const linked = scheduleForQuestion(entry.question);
  const rule = String(entry.progress.correctiveRule).trim();
  const topic = entry.question.topic || entry.question.area || 'este tema';
  const prompts = [
    [`Qual é a regra principal para resolver questões sobre ${topic}?`, rule],
    [`Como aplicar essa regra em uma situação clínica?`, `${rule}\n\nExplique a decisão, os dados necessários e o principal risco de ignorá-la.`]
  ];
  let created = 0;
  prompts.forEach(([front, back], index) => {
    if(cards.some(card => String(card.front || '').trim() === front)) return;
    cards.unshift({id:`card-${entryId}-prompt-${Date.now()}-${index}`, front, back, scheduleId:linked?.id || '', block:linked?.block || entry.question.collectionBlock, area:linked?.area || entry.question.area || 'Sem área', subarea:linked?.topic || entry.question.topic || 'Caderno de erros', topic:linked?.topic || entry.question.topic || 'Caderno de erros', createdAt:new Date().toISOString()});
    created += 1;
  });
  if(!created) { showStudyToast('As perguntas deste erro já foram geradas.'); return; }
  state.questionFlashcards[entryId] = cards;
  persist();
  showStudyToast(`${created} pergunta${created === 1 ? '' : 's'} de recuperação gerada${created === 1 ? '' : 's'}.`);
  renderCadernoErros();
}
function exportCadernoErrosCsv() {
  const headers = ['Data','Área','Tema','Enunciado','Minha resposta','Resposta correta','Tipo de erro','Confiança','Regra corretiva','Próxima revisão','Anotação'];
  const rows = cadernoErrosEntries().map(({question, progress}) => [
    progress.updatedAt ? new Date(progress.updatedAt).toLocaleDateString('pt-BR') : '',
    questionTag(question).area || '', questionTag(question).topic || '', question.stem || '', progress.selected || '', question.answer || '',
    progress.missReason || '', progress.confidence || '', progress.correctiveRule || '', progress.nextReview || '', progress.notes || ''
  ]);
  const csv = [headers, ...rows].map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], {type:'text/csv;charset=utf-8'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `caderno-de-erros-${studyDateKey()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
function renderCadernoErros() {
  const allEntries = cadernoErrosEntries();
  const areas = ['Todas', ...new Set(allEntries.map(entry => questionTag(entry.question).area).filter(Boolean))].sort();
  const search = normalizedTopic(ui.cadernoSearch || '');
  const today = studyDateKey();
  const dueCount = allEntries.filter(entry => entry.progress.nextReview && entry.progress.nextReview <= today).length;
  const areaCounts = Object.entries(allEntries.reduce((acc, entry) => {
    const area = questionTag(entry.question).area || 'Sem área';
    acc[area] = (acc[area] || 0) + 1;
    return acc;
  }, {})).sort((a,b) => b[1] - a[1]).slice(0, 3);
  const typeCounts = Object.entries(allEntries.reduce((acc, entry) => {
    const type = entry.progress.missReason || 'Sem classificação';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {})).sort((a,b) => b[1] - a[1]).slice(0, 3);
  const overconfident = allEntries.filter(entry => !entry.progress.correct && n(entry.progress.confidence) >= 80).length;
  const unstable = allEntries.filter(entry => entry.progress.correct && n(entry.progress.confidence) > 0 && n(entry.progress.confidence) <= 40).length;
  const entries = allEntries.filter(entry => {
    const tag = questionTag(entry.question);
    if(ui.cadernoArea !== 'Todas' && tag.area !== ui.cadernoArea) return false;
    if(ui.cadernoReview === 'Pendentes' && !(entry.progress.nextReview && entry.progress.nextReview <= today)) return false;
    if(ui.cadernoReview === 'Agendadas' && !(entry.progress.nextReview && entry.progress.nextReview > today)) return false;
    if(!search) return true;
    const haystack = normalizedTopic(`${entry.question.stem || ''} ${entry.progress.notes || ''} ${entry.progress.preReasoning || ''} ${entry.progress.postLearning || ''} ${entry.progress.correctiveRule || ''} ${entry.progress.missReason || ''}`);
    return haystack.includes(search);
  });
  const insightCards = `<section class="grid three caderno-insights"><div class="card"><span class="eyebrow">Temas mais frequentes</span>${areaCounts.length ? areaCounts.map(([label,count]) => `<div class="stat-line"><span>${escapeHtml(label)}</span><strong>${count}</strong></div>`).join('') : '<p class="muted">Ainda sem dados.</p>'}</div><div class="card"><span class="eyebrow">Tipos de erro</span>${typeCounts.length ? typeCounts.map(([label,count]) => `<div class="stat-line"><span>${escapeHtml(label)}</span><strong>${count}</strong></div>`).join('') : '<p class="muted">Classifique seus erros para ver padrões.</p>'}</div><div class="card"><span class="eyebrow">Confiança versus desempenho</span><div class="stat-line"><span>Falsa segurança</span><strong>${overconfident}</strong></div><div class="stat-line"><span>Conhecimento instável</span><strong>${unstable}</strong></div><p class="muted">Confiança alta com erro e confiança baixa com acerto.</p></div></section>`;
  document.getElementById('caderno-erros').innerHTML = `<div class="library-overview"><div><span class="eyebrow">Meu caderno</span><h2>Caderno de erros</h2><p>Todos os comentários e reflexões que você escreveu nas questões, reunidos num só lugar.</p></div><div class="library-stats"><span><strong>${allEntries.length}</strong> anotações</span><span><strong>${dueCount}</strong> revisões pendentes</span><button class="icon-btn primary" id="startCadernoReview" ${dueCount?'':'disabled'}>Revisar pendentes</button><button class="icon-btn" id="exportCadernoCsv">Exportar CSV</button></div></div>${insightCards}<section class="card"><div class="section-title"><div><h2>Anotações</h2><div class="muted">${dueCount ? 'Comece pelas revisões pendentes.' : 'Nenhuma revisão está vencida.'}</div></div></div><div class="caderno-erros-filters"><label class="search-field"><span aria-hidden="true">⌕</span><input class="input" id="cadernoSearch" value="${escapeAttr(ui.cadernoSearch)}" placeholder="Buscar por enunciado, regra ou motivo"></label><select class="select" id="cadernoArea">${areas.map(area => `<option value="${escapeAttr(area)}" ${area === ui.cadernoArea ? 'selected' : ''}>${escapeHtml(area)}</option>`).join('')}</select><select class="select" id="cadernoReview"><option value="Todos" ${ui.cadernoReview === 'Todos' ? 'selected' : ''}>Todas as revisões</option><option value="Pendentes" ${ui.cadernoReview === 'Pendentes' ? 'selected' : ''}>Pendentes</option><option value="Agendadas" ${ui.cadernoReview === 'Agendadas' ? 'selected' : ''}>Agendadas</option></select></div><div class="list">${entries.length ? entries.map(renderCadernoErroCard).join('') : '<div class="empty">Nenhuma anotação encontrada para este filtro.</div>'}</div></section>`;
  bindCadernoErros();
}
function bindCadernoErros() {
  const search = document.getElementById('cadernoSearch');
  if(search) search.oninput = e => {
    ui.cadernoSearch = e.target.value;
    const selectionStart=e.target.selectionStart;
    const selectionEnd=e.target.selectionEnd;
    if(cadernoSearchRenderTimer) clearTimeout(cadernoSearchRenderTimer);
    cadernoSearchRenderTimer=setTimeout(()=>{
      renderCadernoErros();
      const restored=document.getElementById('cadernoSearch');
      restored?.focus({preventScroll:true});
      restored?.setSelectionRange?.(selectionStart,selectionEnd);
    },180);
  };
  const areaSelect = document.getElementById('cadernoArea');
  if(areaSelect) areaSelect.onchange = e => { ui.cadernoArea = e.target.value; renderCadernoErros(); };
  const reviewSelect = document.getElementById('cadernoReview');
  if(reviewSelect) reviewSelect.onchange = e => { ui.cadernoReview = e.target.value; localStorage.setItem(CADERNO_VIEW_KEY, JSON.stringify({review:ui.cadernoReview})); renderCadernoErros(); };
  document.getElementById('exportCadernoCsv')?.addEventListener('click', exportCadernoErrosCsv);
  document.getElementById('startCadernoReview')?.addEventListener('click', () => { ui.cadernoReview = 'Pendentes'; localStorage.setItem(CADERNO_VIEW_KEY, JSON.stringify({review:ui.cadernoReview})); renderCadernoErros(); window.scrollTo({top:0, behavior:'smooth'}); });
  document.querySelectorAll('[data-caderno-access]').forEach(button => button.onclick = e => {
    // Um erro sintetizado a partir de um simulado não tem state.questionProgress
    // (a resposta vive em run.answers): abrir isso na aba Questões mostraria a
    // questão como "nunca respondida", contradizendo o próprio card. Em vez
    // disso, "Acessar" leva de volta para a revisão daquele simulado.
    const runId = e.currentTarget.dataset.cadernoAccessRun;
    if(runId && state.simuladoRuns.some(run => run.id === runId)) {
      ui.activeSimRunId = runId;
      ui.simulationLibraryOpen = false;
      navigateToTab('simulados');
      return;
    }
    ui.qQuestionId = e.currentTarget.dataset.cadernoAccess;
    ui.qRouteRestorePending = true;
    ui.qFocusScheduleId = '';
    ui.qFocusQuestionIds = [];
    ui.qFocusTarget = 0;
    ui.qIndex = 0;
    ui.qSearch = '';
    ui.qSource = 'Todas';
    ui.qTopic = 'Todos';
    ui.justAnsweredId = '';
    ui.qStatus = 'Todas';
    navigateToTab('questoes');
  });
  document.querySelectorAll('[data-create-rule-card]').forEach(button => button.onclick = e => createRuleFlashcard(e.currentTarget.dataset.createRuleCard));
  document.querySelectorAll('[data-generate-rule-prompts]').forEach(button => button.onclick = e => generateRulePrompts(e.currentTarget.dataset.generateRulePrompts));
  document.querySelectorAll('[data-caderno-edit-toggle]').forEach(button => button.onclick = e => {
    const id = e.currentTarget.dataset.cadernoEditToggle;
    ui.cadernoEditId = ui.cadernoEditId === id ? '' : id;
    renderCadernoErros();
  });
  document.querySelectorAll('[data-caderno-edit-close]').forEach(button => button.onclick = () => {
    ui.cadernoEditId = '';
    renderCadernoErros();
  });
  document.querySelectorAll('[data-caderno-field]').forEach(el => {
    const entryId = el.dataset.cadernoEntry;
    const field = el.dataset.cadernoField;
    if(field === 'missReason') {
      el.onchange = () => { updateCadernoField(entryId, field, el.value); renderCadernoErros(); };
    } else {
      el.oninput = () => updateCadernoField(entryId, field, el.value, { commit: false });
      el.onblur = () => { updateCadernoField(entryId, field, el.value); renderCadernoErros(); };
    }
  });
}
function updateCadernoField(entryId, field, value, { commit = true } = {}) {
  // Uma entrada vinda de simulado só existe em memória (sintetizada a partir
  // de run.answers, não de state.questionProgress). O primeiro campo editado
  // nela precisa "promovê-la" copiando resposta/gabarito/origem também, senão
  // o card perde a comparação de resposta e o selo "Simulado: ..." assim que
  // vira uma entrada de verdade.
  if(!state.questionProgress[entryId]) {
    const synthesized = simuladoErrorProgressById().get(entryId);
    if(synthesized) setQuestionProgress(entryId, synthesized);
  }
  setQuestionProgress(entryId, { [field]: value });
  if(commit) persist(); else saveStateOnly({ invalidate: false });
}
function renderEcg() {
  const el = document.getElementById('ecg');
  if(!window.EcgSim) { el.innerHTML = `<section class="card"><p class="muted">Carregando simulador de ECG…</p></section>`; return; }
  if(!state.ecg) state.ecg = window.EcgSim.defaultState();
  window.EcgSim.mount(el, {
    getState: () => state,
    save: () => { try { writeLocalState(); } catch(e){} scheduleCloudSave(); },
    escapeHtml,
    iconSvg
  });
}
function renderRankPromotionModal() {
  const rank=ui.rankPromotion;
  if(!rank) return '';
  const classAsset=window.ENAMED_ICONS?.RpgAsset(rank.key,{label:`Personagem da nova classe ${rank.name}`,width:240,height:336,className:'rank-character rank-character--promotion'})||'';
  return `<div class="rank-promotion-overlay" role="dialog" aria-modal="true" aria-labelledby="rankPromotionTitle"><div class="rank-promotion-dialog">${classAsset}<span class="eyebrow">Promoção acadêmica</span><h2 id="rankPromotionTitle">Você agora é ${escapeHtml(rank.name)}</h2><p>${rank.completedBlocks} blocos concluídos. Sua classe mudou pelo avanço no cronograma, independentemente do XP.</p><button class="icon-btn primary" id="closeRankPromotion">Continuar estudando</button></div></div>`;
}
function roundDisplayXP(value) { const rounded=Math.round(n(value)*10)/10; return Number.isInteger(rounded)?String(rounded):rounded.toFixed(1).replace('.',','); }
function automaticLegacyPreview() {
  if(!Gamification) return null;
  const blockDates={};
  completedAcademicBlockIds().forEach(blockId=>{blockDates[blockId]=state.schedule.filter(item=>String(item.block)===blockId).map(item=>item.date).filter(Boolean).sort().at(-1)||new Date().toISOString();});
  return prepareLegacyPreview(Gamification.createAutomaticLegacyPreview({state,completedBlockIds:completedAcademicBlockIds(),blockDates,generatedAt:new Date().toISOString()},state.gamification?.rules));
}
function prepareLegacyPreview(preview) {
  if(!preview) return preview;
  const known=new Set(gamificationTransactions().map(transaction=>[transaction.source_type,transaction.source_id,transaction.reason,transaction.source_event_id].join('|')));
  const events=preview.events.filter(event=>!known.has([event.source_type,event.source_id,event.reason,event.source_event_id].join('|')));
  const duplicateBatch=(state.gamification.importBatches||[]).some(batch=>batch.fingerprint===preview.fingerprint);
  const accepted=duplicateBatch?[]:events;
  return {...preview,events:accepted,totalXP:accepted.reduce((sum,event)=>sum+n(event.base_xp),0),counts:accepted.reduce((counts,event)=>{counts[event.activity_type]=(counts[event.activity_type]||0)+1;return counts;},{}),duplicateBatch};
}
function renderLegacyImportCard() {
  ensureGamificationState();
  const preview=ui.legacyImportPreview;
  const batches=(state.gamification.importBatches || []).filter(batch=>batch.status==='committed').sort((a,b)=>Date.parse(b.committed_at||'')-Date.parse(a.committed_at||''));
  const previewRows=preview?.events?.reduce((rows,event)=>{const key=gamificationActivityLabel(event);rows[key]=(rows[key]||0)+1;return rows;},{});
  const previewSummary=preview && Gamification?.summarizePreview ? Gamification.summarizePreview(preview) : null;
  const categoryLabels={questions:'Questões',videos:'Videoaulas',flashcards:'Flashcards',simulations:'Simulados',blocks:'Blocos',other:'Outros'};
  const categoryDetails=previewSummary ? Object.entries(previewSummary.categories).map(([key,item])=>`${categoryLabels[key]}: ${item.count} evento${item.count===1?'':'s'} · ${roundDisplayXP(item.xp)} XP`).join(' · ') : '';
  return `<details class="card legacy-import-card"><summary><span><strong>Contabilizar estudo anterior</strong><small>Preview obrigatório, ledger idempotente e reversão por lote</small></span><span class="badge ${batches.length?'done':'today'}">${batches.length} lote${batches.length===1?'':'s'}</span></summary><div class="legacy-import-content"><div class="legacy-import-actions"><button class="icon-btn primary" id="previewAutomaticLegacy">Analisar dados existentes</button><span class="muted">Questões, vídeos, flashcards, simulados e blocos com histórico verificável.</span></div><div class="legacy-aggregate"><strong>Ou registrar um saldo conhecido</strong><div class="legacy-aggregate-fields"><input class="input" id="legacyDate" type="date" value="${studyDateKey()}"><input class="input" id="legacyQuestions" type="number" min="0" placeholder="Questões"><input class="input" id="legacyCorrect" type="number" min="0" placeholder="Acertos conhecidos"><input class="input" id="legacyReviewed" type="number" min="0" placeholder="Erros revisados"><input class="input" id="legacyVideoMinutes" type="number" min="0" step="1" placeholder="Minutos de vídeo"><input class="input" id="legacyFlashcards" type="number" min="0" placeholder="Flashcards"><input class="input" id="legacyBlocks" type="number" min="0" max="30" placeholder="Blocos concluídos"><input class="input" id="legacySimulations" type="number" min="0" placeholder="Simulados"><button class="icon-btn" id="previewAggregateLegacy">Pré-visualizar saldo</button></div></div>${preview?`<div class="legacy-preview"><div class="section-title"><div><h3>Prévia sem alterar seus dados</h3><div class="muted">${preview.events.length} eventos válidos · ${Object.entries(previewRows||{}).map(([label,count])=>`${count} ${label.toLowerCase()}`).join(' · ')||'nenhum evento'}</div><div class="muted">${escapeHtml(categoryDetails)}</div></div><strong>${roundDisplayXP(preview.totalXP)} XP legado</strong></div><div class="legacy-preview-actions"><button class="icon-btn primary" id="commitLegacyPreview" ${preview.events.length?'':'disabled'}>Confirmar importação</button><button class="tiny-btn" id="cancelLegacyPreview">Cancelar</button></div></div>`:''}${batches.length?`<div class="legacy-batches"><h3>Importações confirmadas</h3>${batches.map(batch=>`<div><span><strong>${escapeHtml(batch.source||'Importação')}</strong><small>${fmtDate(String(batch.committed_at||'').slice(0,10))} · ${roundDisplayXP(batch.totals_json?.xp)} XP</small></span><button class="tiny-btn danger" data-revert-legacy="${escapeAttr(batch.id)}">Desfazer lote</button></div>`).join('')}</div>`:''}</div></details>`;
}
function bindGamificationDashboard() {
  document.getElementById('closeRankPromotion')?.addEventListener('click',()=>{
    ui.rankPromotion=null;
    document.querySelector('.rank-promotion-overlay')?.remove();
  });
  document.querySelectorAll('[data-open-sealed-reward]').forEach(button=>button.addEventListener('click',event=>{
    const result=Gamification.openElementReward(state.gamification,event.currentTarget.dataset.openSealedReward,{now:new Date()});
    if(result.opened) { persist(); showStudyToast(`Recompensa ${result.reward.rarityLabel} revelada: ${result.reward.elements.map(elementLabel).join(' + ')}.`); }
  }));
}
function bindLegacyImportCard() {
  document.getElementById('previewAutomaticLegacy')?.addEventListener('click',()=>{ui.legacyImportPreview=automaticLegacyPreview();renderFerramentas();});
  document.getElementById('previewAggregateLegacy')?.addEventListener('click',()=>{
    ui.legacyImportPreview=prepareLegacyPreview(Gamification.createAggregateLegacyPreview({date:document.getElementById('legacyDate')?.value,questions:n(document.getElementById('legacyQuestions')?.value),correctAnswers:n(document.getElementById('legacyCorrect')?.value),reviewedErrors:n(document.getElementById('legacyReviewed')?.value),videoMinutes:n(document.getElementById('legacyVideoMinutes')?.value),flashcards:n(document.getElementById('legacyFlashcards')?.value),blocksCompleted:n(document.getElementById('legacyBlocks')?.value),simulations:n(document.getElementById('legacySimulations')?.value)},state.gamification?.rules));
    renderFerramentas();
  });
  document.getElementById('cancelLegacyPreview')?.addEventListener('click',()=>{ui.legacyImportPreview=null;renderFerramentas();});
  document.getElementById('commitLegacyPreview')?.addEventListener('click',()=>{
    if(!ui.legacyImportPreview) return;
    const result=Gamification.commitLegacyImport(state.gamification,ui.legacyImportPreview,{userId:gamificationUserId()});
    ui.legacyImportPreview=null;
    persist();
    showStudyToast(result.alreadyReverted?'Este mesmo lote já foi importado e desfeito; ele não será duplicado.':result.alreadyCommitted?'Esta importação já estava contabilizada.':`${result.transactions.length} eventos antigos contabilizados sem duplicação.`);
    syncGamificationLedger();
  });
  document.querySelectorAll('[data-revert-legacy]').forEach(button=>button.addEventListener('click',event=>{
    if(!confirm('Desfazer este lote? O histórico original será preservado e receberá lançamentos de reversão.')) return;
    const result=Gamification.revertLegacyImport(state.gamification,event.currentTarget.dataset.revertLegacy,{userId:gamificationUserId()});
    persist();
    showStudyToast(`${result.reversals.length} lançamentos revertidos com trilha de auditoria.`);
    syncGamificationLedger();
  }));
}
function splitCasoExplanationSentences(text) {
  return String(text || '')
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Þ])/)
    .map(s => s.trim())
    .filter(Boolean);
}
const CASO_QUADRO_RE = /(quadro cl[íi]nico|quadro cl[áa]ssico|apresenta[çc][ãa]o cl[íi]nica|apresenta[çc][ãa]o t[íi]pica|apresenta[çc][ãa]o cl[áa]ssica|sintomas? incluem|sinais incluem|achados? incluem|achados-chave (s[ãa]o|incluem)|manifesta-se|manifesta[çc][õo]es incluem|tr[íi]ade cl[áa]ssica|cursam? com|caracterizad[ao] por|conjunto [ée] (muito )?cl[áa]ssico|apresenta[çc][ãa]o (t[íi]pica |cl[áa]ssica )?combina|quadro costuma combinar|costuma combinar|combina sintomas)/i;
const CASO_TRAT_RE = /(\bo tratamento\b|\btratamento consiste\b|\btratamento inclui\b|\btratamento envolve\b|\btratamento de escolha\b|\btratamento padr[ãa]o\b|\btratamento inicial\b|\btratamento (?:é|deve)\b|\bo manejo\b|\bmanejo inclui\b|\bmanejo envolve\b|\bmanejo (?:é|consiste|deve)\b|\ba conduta\b|\bconduta inclui\b|\bconduta (?:é|envolve|inicial)\b|\babordagem inicial envolve\b|\babordagem envolve\b|\bo acompanhamento\b)/i;
const CASO_ESPECIAL_RE = /(\bem gestantes\b|\bem crian[çc]as\b|\bem idosos\b|\bem pacientes\b|\bnos casos\b|\bentretanto\b|\bcontudo\b|\b[ée] importante\b|\bvale destacar\b|\bvale ressaltar\b|\bcabe ressaltar\b|\buma exce[çc][ãa]o\b|\bsitua[çc][õo]es especiais\b|\bpor outro lado\b|\bj[áa] em\b|\bespecialmente em\b|\bdeve-se sempre\b|\b[ée] fundamental\b)/i;
function splitCasoExplanation(text) {
  const sentences = splitCasoExplanationSentences(text);
  const buckets = [[], [], [], []];
  let state = 0;
  sentences.forEach(s => {
    const incoming = state;
    if (incoming === 0 && CASO_QUADRO_RE.test(s)) state = 1;
    if (incoming <= 1 && CASO_TRAT_RE.test(s)) state = 2;
    if (incoming === 2 && CASO_ESPECIAL_RE.test(s)) state = 3;
    buckets[state].push(s);
  });
  return {
    concept: buckets[0].join(' ').trim(),
    quadro: buckets[1].join(' ').trim(),
    treatment: buckets[2].join(' ').trim(),
    special: buckets[3].join(' ').trim()
  };
}
function renderCasoExplanation(explanation, kids) {
  const { concept, quadro, treatment, special } = splitCasoExplanation(explanation);
  const block = (icon, label, text, extraClass) => text ? `<div class="caso-explanation-block ${extraClass||''}"><div class="caso-explanation-label"><span aria-hidden="true">${icon}</span>${label}</div><p>${escapeHtml(text)}</p></div>` : '';
  return `<div class="caso-explanation">${
    block('🧠','Conceito', concept)
  }${
    block('🩺','Quadro clínico', quadro, 'caso-explanation-quadro')
  }${
    block('💊','Tratamento', treatment, 'caso-explanation-treatment')
  }${
    block('⚠️','Casos especiais', special, 'caso-explanation-special')
  }${
    kids ? `<div class="caso-explanation-block caso-explanation-kids"><div class="caso-explanation-label"><span aria-hidden="true">🧒</span>Para uma criança de 10 anos</div><p>${escapeHtml(kids)}</p></div>` : ''
  }</div>`;
}
function casoDoDiaProgress(caseKey) {
  if(!state.casoDoDia[caseKey] || typeof state.casoDoDia[caseKey] !== 'object') {
    state.casoDoDia[caseKey] = { revealed:1, wrongCount:0, solved:false, gaveUp:false, explanationOpen:false };
  }
  return state.casoDoDia[caseKey];
}
function renderCasoDoDia() {
  const item = window.CasoDoDia?.todayCase(ui.refDate);
  if(!item) return `<section class="card caso-do-dia-card is-empty"><span class="eyebrow">Caso do dia</span><h2>Carregando caso clínico…</h2><p class="muted">O banco de casos está sendo preparado.</p></section>`;
  const caseKey = `caso-${item.number}`;
  const progress = casoDoDiaProgress(caseKey);
  const finished = progress.solved || progress.gaveUp;
  const revealed = Math.min(TOTAL_CASO_HINTS, Math.max(1, n(progress.revealed) || 1));
  const shown = finished ? TOTAL_CASO_HINTS : revealed;
  const dots = Array.from({length:TOTAL_CASO_HINTS}, (_,i) => `<span class="caso-dot ${i<shown?'is-lit':''} ${progress.solved && i===revealed-1?'is-win':''}"></span>`).join('');
  const hintsHtml = item.hints.slice(0, shown).map((text,i) => `<div class="caso-hint ${i===revealed-1 && !finished ? 'is-current':''}"><span class="caso-hint-num">${i+1}</span><span class="caso-hint-text">${escapeHtml(text)}</span></div>`).join('');
  let diagnosisTitle = '';
  if(progress.solved) {
    diagnosisTitle = `<div class="caso-diagnosis-title caso-diagnosis-title-win" role="status">
      <span class="caso-diagnosis-icon" aria-hidden="true">✓</span>
      <span class="caso-diagnosis-kicker">Você acertou!</span>
      <h2>${escapeHtml(item.diagnosis)}</h2>
    </div>`;
  } else if(progress.gaveUp) {
    diagnosisTitle = `<div class="caso-diagnosis-title caso-diagnosis-title-learn" role="status">
      <span class="caso-diagnosis-icon" aria-hidden="true">✦</span>
      <span class="caso-diagnosis-kicker">Aprenda hoje sobre:</span>
      <h2>${escapeHtml(item.diagnosis)}</h2>
    </div>`;
  }
  const answerForm = finished ? '' : `<div class="caso-answer-row"><div class="caso-guess-wrap"><input class="input" id="casoDoDiaGuess" placeholder="Qual é o diagnóstico?" autocomplete="off"><div class="caso-suggestions" id="casoDoDiaSuggestions" hidden></div></div><button class="icon-btn primary" id="casoDoDiaSubmit">Responder</button><button class="icon-btn" id="casoDoDiaSkip">${revealed>=TOTAL_CASO_HINTS?'Revelar':'Pular pista'}</button></div>`;
  const feedback = progress.lastFeedback ? `<div class="caso-feedback ${progress.lastFeedback.ok?'ok':'no'}">${escapeHtml(progress.lastFeedback.text)}</div>` : '';
  const wrongList = Array.isArray(progress.wrongGuesses) && progress.wrongGuesses.length
    ? `<div class="caso-wrong-guesses"><span class="caso-wrong-label">Tentativas erradas:</span><div class="caso-wrong-chips">${progress.wrongGuesses.map(g => `<span class="caso-wrong-chip">${escapeHtml(g)}</span>`).join('')}</div></div>`
    : '';
  const explanationToggle = finished ? `<button class="icon-btn caso-explain-toggle" id="casoDoDiaExplainToggle">${progress.explanationOpen?'Ocultar explicação':'Ver explicação'}</button>${progress.explanationOpen?renderCasoExplanation(item.explanation, item.kids):''}` : '';
  return `<section class="card caso-do-dia-card ${finished?'is-finished':''}">
    <div class="caso-head"><span class="eyebrow">Caso do dia · #${item.number}</span><div class="caso-dots">${dots}</div></div>
    ${diagnosisTitle}
    <h2 class="caso-question">${escapeHtml(item.question || 'Qual é o diagnóstico?')}</h2>
    <div class="caso-hints">${hintsHtml}</div>
    ${feedback}
    ${wrongList}
    ${answerForm}
    ${explanationToggle}
  </section>`;
}
const TOTAL_CASO_HINTS = 6;
document.addEventListener('click', event => {
  const box = document.getElementById('casoDoDiaSuggestions');
  if(!box || box.hidden) return;
  const wrap = document.getElementById('casoDoDiaGuess')?.closest('.caso-guess-wrap');
  if(wrap && wrap.contains(event.target)) return;
  box.hidden = true;
});
function bindCasoDoDia() {
  const item = window.CasoDoDia?.todayCase(ui.refDate);
  if(!item) return;
  const caseKey = `caso-${item.number}`;
  const progress = casoDoDiaProgress(caseKey);
  const finish = (won) => {
    if(won) progress.solved = true; else progress.gaveUp = true;
    persist();
  };
  const advance = () => {
    if(progress.revealed >= TOTAL_CASO_HINTS) { finish(false); return; }
    progress.revealed = Math.min(TOTAL_CASO_HINTS, n(progress.revealed) + 1);
    persist();
  };
  document.getElementById('casoDoDiaSubmit')?.addEventListener('click', () => {
    const input = document.getElementById('casoDoDiaGuess');
    const guess = input?.value || '';
    if(!guess.trim()) return;
    const correct = window.CasoDoDia?.isCorrectGuess(guess, item.diagnosis);
    if(correct) {
      progress.lastFeedback = { ok:true, text:'Boa! Diagnóstico correto.' };
      finish(true);
    } else {
      if(!Array.isArray(progress.wrongGuesses)) progress.wrongGuesses = [];
      const trimmed = guess.trim();
      if(trimmed && !progress.wrongGuesses.some(g => g.toLowerCase() === trimmed.toLowerCase())) progress.wrongGuesses.push(trimmed);
      if(progress.revealed >= TOTAL_CASO_HINTS) {
        progress.lastFeedback = null;
        finish(false);
      } else {
        progress.lastFeedback = { ok:false, text:'Não foi dessa vez — próxima pista liberada.' };
        advance();
      }
    }
  });
  document.getElementById('casoDoDiaGuess')?.addEventListener('keydown', event => {
    if(event.key === 'Enter') { document.getElementById('casoDoDiaSuggestions').hidden = true; document.getElementById('casoDoDiaSubmit')?.click(); }
    if(event.key === 'Escape') document.getElementById('casoDoDiaSuggestions').hidden = true;
  });
  const guessInput = document.getElementById('casoDoDiaGuess');
  const suggestionsBox = document.getElementById('casoDoDiaSuggestions');
  const renderSuggestions = () => {
    if(!guessInput || !suggestionsBox) return;
    const all = window.CasoDoDia?.allDiagnoses() || [];
    if(!all.length) { suggestionsBox.hidden = true; suggestionsBox.innerHTML = ''; return; }
    const raw = guessInput.value.trim();
    const q = window.CasoDoDia?.normalize(raw) || '';
    const matches = q ? all.filter(d => window.CasoDoDia.normalize(d).includes(q)) : all;
    if(!matches.length) { suggestionsBox.hidden = true; suggestionsBox.innerHTML = '<div class="caso-suggestion-empty">Nenhum diagnóstico encontrado.</div>'; suggestionsBox.hidden = false; return; }
    suggestionsBox.innerHTML = matches.map(d => `<button type="button" class="caso-suggestion-item" data-caso-suggestion="${escapeAttr(d)}">${escapeHtml(d)}</button>`).join('');
    suggestionsBox.hidden = false;
  };
  guessInput?.addEventListener('input', renderSuggestions);
  guessInput?.addEventListener('focus', renderSuggestions);
  suggestionsBox?.addEventListener('mousedown', event => {
    const button = event.target.closest('[data-caso-suggestion]');
    if(!button) return;
    event.preventDefault();
    event.stopPropagation();
    guessInput.value = button.dataset.casoSuggestion;
    suggestionsBox.hidden = true;
    guessInput.focus();
  });
  suggestionsBox?.addEventListener('click', event => {
    event.stopPropagation();
  });
  guessInput?.addEventListener('blur', () => { setTimeout(() => { if(suggestionsBox) suggestionsBox.hidden = true; }, 150); });
  document.getElementById('casoDoDiaSkip')?.addEventListener('click', () => {
    progress.lastFeedback = null;
    advance();
  });
  document.getElementById('casoDoDiaExplainToggle')?.addEventListener('click', () => {
    progress.explanationOpen = !progress.explanationOpen;
    persist();
  });
}
function renderPainel() {
  const dashboardLog=getDayLog(ui.refDate);
  document.getElementById('painel').innerHTML = `
    <div class="dashboard-global-head"><div class="dashboard-greeting"><h1>${escapeHtml(greetingMessage())}</h1></div><label class="dashboard-date-control"><span class="sr-only">Data do painel</span><div class="dashboard-date-input-row"><button class="tiny-btn" id="dashboardDatePrev" type="button" aria-label="Dia anterior">‹</button><input class="input" id="dashboardDate" inputmode="numeric" placeholder="dd/mm/aaaa"><button class="tiny-btn" id="dashboardDateNext" type="button" aria-label="Dia seguinte">›</button></div></label><div class="dashboard-head-tools">${renderCountdown()}</div></div>
    <div class="dashboard-desktop-grid">
      ${renderContinueStudying()}
      ${renderCasoDoDia()}
      ${renderPersonalDailyTasks(ui.refDate)}
      ${renderDashboardMood(dashboardLog)}
      <section class="card dashboard-road-region">${renderDailyRoad(ui.refDate)}</section>
      ${renderDailyAnalysis(ui.refDate)}
      ${renderWeeklyPerformance(ui.refDate)}
      ${renderGamificationPopover()}
    </div>
    ${renderRankPromotionModal()}`;
  bindPlannerDateInput('dashboardDate', ui.refDate, date => { ui.refDate=date; render(); });
  document.getElementById('dashboardDatePrev').onclick = () => { ui.refDate = PlannerUX.addDays(ui.refDate, -1); render(); };
  document.getElementById('dashboardDateNext').onclick = () => { ui.refDate = PlannerUX.addDays(ui.refDate, 1); render(); };
  bindPlannerDateInput('countdownDate', state.dashboardSettings.countdownDate, date => { state.dashboardSettings.countdownDate=date; persist(); });
  bindPersonalDailyTasks(ui.refDate);
  bindCasoDoDia();
  bindGamificationDashboard();
  document.querySelector('[data-dashboard-continue]')?.addEventListener('click',event=>openDashboardActivity(event.currentTarget));
  document.querySelectorAll('[data-dashboard-open-flashcards]').forEach(button=>button.addEventListener('click',()=>{ui.flashcardFilter='Aprendendo';navigateToTab('flashcards');}));
  document.querySelectorAll('[data-weekly-metric]').forEach(button=>button.addEventListener('click',event=>{ui.weeklyMetric=event.currentTarget.dataset.weeklyMetric;renderPainel();}));
  document.querySelectorAll('[data-weekly-week-nav]').forEach(button=>button.addEventListener('click',event=>{ui.weeklyWeekOffset=Math.min(0,(ui.weeklyWeekOffset||0)+Number(event.currentTarget.dataset.weeklyWeekNav));renderPainel();}));
  document.querySelectorAll('[data-dashboard-mood]').forEach(button => button.onclick = event => setDayLog(ui.refDate, 'mood', n(event.currentTarget.dataset.dashboardMood)));
  startDashboardCountdown();
  document.getElementById('dailyRandomChoice')?.addEventListener('click', event => runDailyStudyChoice(event.currentTarget, ui.refDate));
  document.querySelectorAll('[data-road-step]').forEach(button => button.onclick = e => {
    const target = e.currentTarget.dataset.roadStep;
    const scheduleId = e.currentTarget.dataset.roadSchedule;
    if(target === 'daily-questions' && scheduleId) { openQuestionsForSchedule(scheduleId); return; }
    if(target === 'daily-flashcards' && scheduleId) { openFlashcardsForSchedule(scheduleId); return; }
    if(target === 'daily-video' && scheduleId) { openVideosForSchedule(scheduleId); return; }
    if(target === 'daily-questions') { navigateToTab('questoes'); return; }
    else if(target === 'daily-flashcards') { navigateToTab('flashcards'); return; }
    else { openDayVideos(ui.refDate); return; }
  });
  bindScheduleInputs();
}
function renderPendencias() {
  const items = state.schedule.filter(x => x.date <= ui.refDate && statusOf(x)!=='Concluído').sort(byPendingBlockOrder);
  const t=totals();
  document.getElementById('pendencias').innerHTML = `<div class="grid cards">${metric('Aulas pendentes', items.length, `até ${fmtDate(ui.refDate)}`)}${metric('Questões pendentes', Math.round(t.debtQ), 'diferença entre meta e realizado')}${metric('Flashcards pendentes', Math.round(t.debtFC), 'diferença entre meta e realizado')}</div><div class="card"><div class="section-title"><div><h2>Pendências por bloco</h2><div class="muted">A revisão começa pelos blocos mais antigos. Cada aula conclui com vídeo, até 10 questões disponíveis e 10 flashcards.</div></div><input class="input" id="pendDate" type="date" value="${ui.refDate}"></div>${renderPendingLessons(items)}</div>`;
  document.getElementById('pendDate').onchange = e => { ui.refDate=e.target.value; render(); }; bindScheduleInputs();
}
function renderCronograma() {
  const areas = ['Todas', ...new Set(state.schedule.map(x=>x.area).filter(Boolean).sort())];
  const rows = filteredSchedule();
  const changed = lastChangedLesson();
  const currentBlock = String(currentScheduleBlock());
  const selectedBlock = ui.scheduleBlock==='Atual' ? currentBlock : String(ui.scheduleBlock);
  const selectedItems = selectedBlock==='Todos' ? state.schedule : state.schedule.filter(item => String(item.block)===selectedBlock);
  const selectedDone = selectedItems.filter(item => statusOf(item)==='Concluído').length;
  const selectedProgress = Math.round(selectedDone / Math.max(1,selectedItems.length) * 100);
  const filterCount = Number(Boolean(ui.search.trim())) + Number(ui.area!=='Todas') + Number(ui.status!=='Todos') + Number(ui.priority!=='Todas') + Number(Boolean(ui.scheduleDay));
  const statusOptions=['Todos','Concluído','Aguardando','Não Iniciado'];
  const priorityOptions=['Todas','Alta','Média','Baixa'];
  const toolbar=`<div class="schedule-toolbar" role="search" aria-label="Filtrar cronograma">
    <label class="schedule-search-field"><span class="sr-only">Buscar no cronograma</span>${iconSvg('search',{weight:'regular'})}<input class="input schedule-toolbar-search" id="search" placeholder="Buscar tema, área ou data" value="${escapeAttr(ui.search)}"></label>
    <div class="schedule-filter-group">
      <label class="schedule-filter"><span>Área</span><select class="select schedule-toolbar-select" id="areaFilter" aria-label="Filtrar por área">${areas.map(a=>`<option ${a===ui.area?'selected':''}>${escapeHtml(a)}</option>`).join('')}</select></label>
      <label class="schedule-filter"><span>Status</span><select class="select schedule-toolbar-select" id="statusFilter" aria-label="Filtrar por status">${statusOptions.map(s=>`<option ${s===ui.status?'selected':''}>${escapeHtml(s)}</option>`).join('')}</select></label>
      <label class="schedule-filter"><span>Prioridade</span><select class="select schedule-toolbar-select" id="priorityFilter" aria-label="Filtrar por prioridade">${priorityOptions.map(p=>`<option ${p===ui.priority?'selected':''}>${escapeHtml(p)}</option>`).join('')}</select></label>
    </div>
    <button class="icon-btn schedule-toolbar-clear ${filterCount?'has-filters':''}" id="clearFilters" type="button" ${filterCount?'': 'disabled'}>${iconSvg('close',{weight:'regular'})}<span>Limpar${filterCount?` (${filterCount})`:''}</span></button>
  </div>`;
  const missionLabel = selectedBlock==='Todos' ? 'Visão geral' : `Bloco ${selectedBlock}`;
  document.getElementById('cronograma').innerHTML = `<section class="card mission-card"><div class="mission-header"><div class="mission-heading"><span class="mission-heading-icon">${iconSvg('mission')}</span><div><span class="eyebrow">Missão</span><h2>Organize seu caminho até o ENAMED</h2><p>${changed ? `Última atividade: <strong>${escapeHtml(changed.topic)}</strong> · ${fmtDate(changed.date)}` : 'Escolha um bloco e avance aula por aula.'}</p></div></div><div class="mission-progress" aria-label="${selectedProgress}% concluído em ${escapeAttr(missionLabel)}"><div><span>${escapeHtml(missionLabel)}</span><strong>${selectedDone}<small>/${selectedItems.length}</small></strong><small>aulas concluídas</small></div><div class="mission-progress-ring" style="--mission-progress:${selectedProgress * 3.6}deg"><span>${selectedProgress}%</span></div></div></div><div class="mission-blocks"><div class="mission-blocks-head"><div><h3>Blocos do cronograma</h3><span>Selecione para ver apenas as aulas daquele bloco</span></div><div class="mission-legend" aria-label="Legenda dos blocos"><span class="done">Concluído</span><span class="pending">Pendente</span><span class="current">Atual</span></div></div>${renderBlockStrip()}</div>${renderScheduleDayPicker()}${toolbar}</section><div class="card schedule-list-card"><div class="section-title"><div><h2>${ui.scheduleDay?`Aulas de ${fmtDate(ui.scheduleDay)}`:'Cronograma editável'}</h2><span class="muted">${ui.scheduleDay?'Mostrando somente as aulas da data selecionada.':'Acompanhe e atualize o progresso de cada aula.'}</span></div><span class="schedule-result-count">${rows.length} ${rows.length===1?'item':'itens'}</span></div>${priorityLegend()}${renderScheduleTable(rows, true)}</div>`;
  enhanceScheduleStudyIcons();
  const blockStrip=document.querySelector('#cronograma .block-strip');
  if(blockStrip) {
    requestAnimationFrame(()=>{ blockStrip.scrollLeft=n(ui.scheduleBlockScrollLeft); });
    blockStrip.addEventListener('scroll',()=>{ ui.scheduleBlockScrollLeft=blockStrip.scrollLeft; },{passive:true});
  }
  document.getElementById('search').oninput = debounce(e => {
    const value=e.target.value;
    const cursor=e.target.selectionStart;
    ui.search=value;
    renderCronograma();
    requestAnimationFrame(() => { const input=document.getElementById('search'); if(input) { input.focus(); input.setSelectionRange(cursor,cursor); } });
  }, 220);
  document.getElementById('areaFilter').onchange = e => { ui.area=e.target.value; render(); };
  document.getElementById('statusFilter').onchange = e => { ui.status=e.target.value; render(); };
  document.getElementById('priorityFilter').onchange = e => { ui.priority=e.target.value; render(); };
  document.getElementById('blockPinToggle').onclick = () => {
    ui.scheduleBlockPinned = !ui.scheduleBlockPinned;
    render();
  };
  document.querySelectorAll('[data-schedule-block]').forEach(button => button.onclick = e => {
    if(ui.scheduleBlockPinned) return;
    ui.scheduleBlockScrollLeft=blockStrip?.scrollLeft || ui.scheduleBlockScrollLeft;
    ui.scheduleBlock = e.currentTarget.dataset.scheduleBlock;
    render();
    requestAnimationFrame(() => {
      const picked = document.querySelector(`[data-schedule-block="${CSS.escape(ui.scheduleBlock)}"]`);
      if(picked) { picked.classList.add('block-chip-pulse'); setTimeout(() => picked.classList.remove('block-chip-pulse'), 500); }
    });
  });
  document.querySelectorAll('[data-schedule-day]').forEach(button => button.onclick = e => {
    ui.scheduleDay=e.currentTarget.dataset.scheduleDay || '';
    if(ui.scheduleDay) ui.refDate=ui.scheduleDay;
    render();
  });
  document.querySelectorAll('[data-schedule-week]').forEach(button => button.onclick = e => {
    ui.scheduleWeekAnchor=PlannerUX.addDays(ui.scheduleWeekAnchor || studyDateKey(),n(e.currentTarget.dataset.scheduleWeek));
    render();
  });
  document.querySelector('[data-schedule-today]')?.addEventListener('click',()=>{
    ui.scheduleWeekAnchor=studyDateKey();
    ui.scheduleDay=studyDateKey();
    ui.refDate=studyDateKey();
    render();
  });
  document.getElementById('clearFilters').onclick = () => { ui.search=''; ui.area='Todas'; ui.status='Todos'; ui.priority='Todas'; ui.scheduleDay=''; if(!ui.scheduleBlockPinned) ui.scheduleBlock='Atual'; render(); };
  bindScheduleInputs();
}
function areaLine(a) { return `<div class="area-bar"><strong>${escapeHtml(a.area)}</strong><div class="bar"><span style="width:${pct(a.progress)}"></span></div><span>${pct(a.progress)}</span></div>`; }
function renderPendingLessons(items) {
  if(!items.length) return '<div class="empty">Nenhuma pendência até esta data.</div>';
  return `<div class="pending-list">${items.map(item => {
    const videoAvailable = plannedVideoCountForSchedule(item) > 0;
    const videoDone = scheduleVideoCompleted(item);
    const questionStats = questionStatsForSchedule(item.id);
    const flashcardStats = flashcardStatsForSchedule(item.id);
    return `<div class="pending-lesson"><div><div class="pending-lesson-title"><button class="schedule-topic-link priority-chip ${priorityClass(item.priority)}" data-open-schedule-questions="${escapeAttr(item.id)}"><strong>B${item.block} · ${escapeHtml(item.topic)}</strong></button></div><div class="muted">${escapeHtml(item.area)} · ${badgeStatus(statusOf(item))}</div></div><div class="pending-lesson-actions"><button class="pending-action ${videoDone?'done':''}" data-toggle-schedule-video="${escapeAttr(item.id)}" ${videoAvailable?'':'disabled'} title="Marcar videoaula como assistida"><span class="pending-symbol">▶</span><small>${videoDone?'vista':'vídeo'}</small></button><button class="pending-action" data-open-schedule-questions="${escapeAttr(item.id)}" title="Abrir questões desta aula"><span class="pending-symbol">Q</span><small>${questionStats.done}/${lessonQuestionTarget(item)}</small></button><button class="pending-action" data-open-schedule-flashcards="${escapeAttr(item.id)}" title="Abrir flashcards desta aula"><span class="pending-symbol">▤</span><small>${flashcardStats.reviews}/${lessonFlashcardTarget(item)}</small></button></div></div>`;
  }).join('')}</div>`;
}
function renderScheduleTable(rows, editable=false) {
  if(!rows.length) return '<div class="empty">Nada para mostrar aqui.</div>';
  return `<div class="table-wrap"><table class="schedule-table"><thead><tr><th>Data</th><th>Bloco</th><th>Tema</th><th>Área</th><th>Status</th><th class="num">Questões</th><th class="num">Banco</th><th class="num">Flashcards</th><th class="num">Horas</th><th class="num">Progresso</th><th>Anotações</th></tr></thead><tbody>${rows.map(x => { const bank=questionStatsForSchedule(x.id); const cards=flashcardStatsForSchedule(x.id); const videoCount=plannedVideoCountForSchedule(x); const videoDone=scheduleVideoCompleted(x); return `<tr><td class="schedule-date-cell">${fmtDate(x.date)}<div class="muted">${x.day}</div></td><td class="schedule-block-cell">${x.block ?? ''}</td><td class="schedule-topic-cell"><div class="schedule-topic-line"><button class="schedule-topic-link priority-chip ${priorityClass(x.priority)}" data-open-schedule-questions="${escapeAttr(x.id)}"><strong>${escapeHtml(x.topic)}</strong></button>${videoCount?` <button class="tiny-btn" data-open-schedule-videos="${escapeAttr(x.id)}" title="Abrir videoaula">▶</button><button class="tiny-btn" data-toggle-schedule-video="${escapeAttr(x.id)}" title="Marcar videoaula como vista">${videoDone?'Vídeo ✓':'Vídeo'}</button>`:''}</div><div class="schedule-meta muted">Meta: ${lessonQuestionTarget(x)} questões · ${lessonFlashcardTarget(x)} flashcards · ${x.metaH} h${videoCount?` · ${videoCount} vídeo${videoCount===1?'':'s'}`:''}</div></td><td>${escapeHtml(x.area)}</td><td>${badgeStatus(statusOf(x))}</td><td class="num"><input class="mini-input" data-id="${x.id}" data-field="q" type="number" min="0" step="1" value="${completedQuestions(x)}"><div class="auto-progress">Banco ${bank.done}${n(x.manualQ) ? ` · manual ${n(x.manualQ)}` : ''}</div></td><td class="num"><button class="tiny-btn" data-open-schedule-questions="${escapeAttr(x.id)}">Abrir</button><div class="bank-result"><strong>${bank.done}</strong> feitas<br>${bank.correct} certas · ${bank.done?pct(bank.rate):'-'}</div></td><td class="num"><input class="mini-input" data-id="${x.id}" data-field="fc" type="number" min="0" step="1" value="${n(x.manualFC)+cards.reviews}"><div class="auto-progress">Revisões ${cards.reviews}${n(x.manualFC) ? ` · manual ${n(x.manualFC)}` : ''}</div></td><td class="num"><input class="mini-input" data-id="${x.id}" data-field="hours" type="number" min="0" step="0.25" value="${n(x.hours)}"></td><td class="num">${pct(progressOf(x))}</td><td><input class="notes-input" data-id="${x.id}" data-field="notes" value="${escapeAttr(x.notes)}"></td></tr>`; }).join('')}</tbody></table></div>`;
}
function enhanceScheduleStudyIcons() {
  const currentBlock=n(currentScheduleBlock());
  const today=studyDateKey();
  const currentLesson=(state.schedule || [])
    .filter(item=>!item.catchUp && n(item.block)===currentBlock && statusOf(item)!=='Concluído')
    .sort((a,b)=>{
      const aFuture=a.date>=today;
      const bFuture=b.date>=today;
      if(aFuture!==bFuture) return aFuture?-1:1;
      return aFuture ? byDate(a,b) : byDate(b,a);
    })[0] || null;
  document.querySelectorAll('.schedule-table tbody tr').forEach(row => {
    const videoToggle=row.querySelector('[data-toggle-schedule-video]');
    const openVideo=row.querySelector('[data-open-schedule-videos]');
    const topicLine=row.querySelector('.schedule-topic-line');
    // A aula é identificada pelo link do tema (ou por qualquer input da linha), que
    // existem sempre. Antes o id vinha só dos botões de vídeo: quando a aula ficava
    // sem vídeo disponível, a linha inteira saía sem ícone de vídeo, questões E
    // flashcards. Questões e flashcards não dependem de vídeo e não podem sumir.
    const scheduleId=topicLine?.querySelector('[data-open-schedule-questions]')?.dataset.openScheduleQuestions
      || row.querySelector('[data-id]')?.dataset.id
      || videoToggle?.dataset.toggleScheduleVideo
      || openVideo?.dataset.openScheduleVideos;
    const item=state.schedule.find(entry=>entry.id===scheduleId);
    if(!item || !topicLine) return;
    const hoursInput=row.querySelector('[data-field="hours"]');
    if(hoursInput && !row.querySelector('.schedule-hours-readable')) {
      const readable=document.createElement('div');
      readable.className='schedule-hours-readable auto-progress';
      readable.textContent=`${formatStudyHours(item.hours)} vinculadas à aula`;
      hoursInput.insertAdjacentElement('afterend',readable);
    }
    const isToday=item.date===today;
    const isCurrent=!isToday && item.id===currentLesson?.id;
    if(isToday || isCurrent) {
      if(isToday) row.classList.add('schedule-today-row');
      else row.classList.add('schedule-current-row');
      const dateCell=row.querySelector('.schedule-date-cell');
      if(dateCell && !dateCell.querySelector('.schedule-today-marker')) {
        const marker=document.createElement('span');
        marker.className=`schedule-today-marker ${isCurrent?'current':''}`;
        marker.innerHTML=`<span>${isToday?'Hoje':'Aula atual'}</span><b aria-hidden="true">→</b>`;
        dateCell.prepend(marker);
      }
    }
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
  document.querySelectorAll('[data-id][data-field]').forEach(el => el.onchange = e => { const item = state.schedule.find(x=>x.id===e.target.dataset.id); if(!item) return; const f=e.target.dataset.field; if(f==='q') item.manualQ=Math.max(0, n(e.target.value) - questionStatsForSchedule(item.id).done); else if(f==='fc') item.manualFC=Math.max(0, n(e.target.value) - flashcardStatsForSchedule(item.id).reviews); else item[f] = f==='notes' ? e.target.value : n(e.target.value); persist(); });
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
  const active = state.simuladoRuns.find(run => run.id === ui.activeSimRunId) || state.simuladoRuns.find(run => !run.finishedAt&&!run.abandonedAt) || null;
  if(active && !ui.activeSimRunId) ui.activeSimRunId = active.id;
  const isLive=Boolean(active&&!active.finishedAt&&!active.abandonedAt);
  const libraryOpen=ui.simulationLibraryOpen||!active;
  const library=`<section class="sim-library ${libraryOpen?'open':'collapsed'}">${libraryOpen?`${renderImportedSimulados()}${renderSimuladoGenerator()}`:''}</section>`;
  const activeView=active?`<div class="sim-active-head"><div><span class="eyebrow">${isLive?'Tentativa em andamento':'Análise da tentativa'}</span><h2>${escapeHtml(active.name)}</h2></div><button class="tiny-btn" id="toggleSimulationLibrary">${libraryOpen?'Ocultar biblioteca':'Ver outras provas'}</button></div>${renderSimuladoRun(active)}`:'';
  const dashboard=`${renderSimuladosHero()}<div class="sim-overview-grid"><section class="card sim-overview-card"><div class="section-title"><div><span class="eyebrow">Seu ritmo</span><h2>Desempenho recente</h2></div></div>${renderSimSummary()}</section><section class="card sim-overview-card sim-next-card"><div class="section-title"><div><span class="eyebrow">Agenda</span><h2>Próximo simulado</h2></div></div>${renderNextSim()}</section></div>${library}${renderSimuladoEstatisticas()}<section class="card sim-history-card" id="simHistory"><div class="section-title"><div><span class="eyebrow">Linha do tempo</span><h2>Histórico de provas</h2></div><span class="sim-count-pill">${state.simuladoRuns.length} ${state.simuladoRuns.length===1?'prova':'provas'}</span></div>${renderSimuladoRunsList()}</section><details class="card sim-secondary-panel"><summary><span><strong>Registro detalhado</strong><small>Edite notas, pontos fortes e resultados manuais</small></span><span class="sim-summary-chevron" aria-hidden="true">⌄</span></summary><div class="sim-secondary-content">${renderSimTable()}</div></details><details class="card sim-secondary-panel"><summary><span><strong>Mapa de lacunas</strong><small>Organize os temas que precisam de uma nova revisão</small></span><span class="sim-summary-chevron" aria-hidden="true">⌄</span></summary><div class="sim-secondary-content">${renderMissedTopics()}</div></details>`;
  document.getElementById('simulados').innerHTML = `${renderSimulationRewardModal()}<div class="sim-page ${isLive?'focus-mode':''}">${isLive?`${activeView}${library}`:`${activeView}${dashboard}`}</div>`;
  bindSimInputs();
  bindSimuladoInputs(active);
}
function renderSimuladosHero() {
  const completed=(state.simuladoRuns||[]).filter(run=>run.finishedAt&&!run.abandonedAt);
  const results=completed.map(run=>simuladoResult(run));
  const average=results.length?Math.round(results.reduce((sum,result)=>sum+n(result.rate),0)/results.length*100):0;
  const best=results.length?Math.round(Math.max(...results.map(result=>n(result.rate)))*100):0;
  const reviewed=completed.filter(run=>simuladoResult(run).rows.filter(row=>!row.correct).every(row=>row.reviewed)).length;
  return `<header class="sim-hero"><div class="sim-hero-copy"><span class="sim-hero-kicker"><span></span> Central de performance</span><h1>Simulados</h1><p>Treine sob pressão, entenda seus padrões de erro e transforme cada prova em uma revisão mais inteligente.</p><div class="sim-hero-actions"><button class="icon-btn primary" type="button" data-sim-scroll="simGenerator">Criar novo simulado</button><button class="icon-btn sim-ghost-btn" type="button" data-sim-scroll="simHistory">Ver histórico</button></div></div><div class="sim-hero-score" aria-label="Média geral de acertos"><div class="sim-score-ring" style="--sim-score:${average}"><span><strong>${average}%</strong><small>média geral</small></span></div><div class="sim-score-caption"><strong>${completed.length?`${reviewed} de ${completed.length} revisados`:'Seu progresso começa aqui'}</strong><span>${completed.length?`Melhor resultado: ${best}%`:'Faça sua primeira prova para liberar insights.'}</span></div></div><div class="sim-hero-glow" aria-hidden="true"></div></header>`;
}
function renderSimulationRewardModal() {
  const summary=ui.simulationRewardSummary;
  if(!summary) return '';
  const reward=(state.gamification?.elementRewards||[]).find(item=>item.id===summary.reward?.id)||summary.reward;
  const progress=Gamification.ensureRankProgress(state.gamification);
  const rewardText=reward?.openedAt?`${reward.elements.map(elementLabel).join(' + ')} · ${reward.rarityLabel} · x${String(reward.multiplier).replace('.',',')}`:'Sua recompensa elemental já foi sorteada e salva. Revele quando quiser.';
  return `<div class="simulation-reward-overlay" role="dialog" aria-modal="true" aria-labelledby="simulationRewardTitle"><div class="simulation-reward-dialog"><span class="eyebrow">Correção concluída</span><h2 id="simulationRewardTitle">Simulado integralmente revisado</h2><div class="simulation-reward-metrics"><div><strong>+${roundDisplayXP(summary.xp)}</strong><span>XP de correção</span></div><div><strong>${summary.fragmentGranted?'1':'0'}</strong><span>fragmento obtido</span></div><div><strong>${progress.fragments}/3</strong><span>próximo medalhão</span></div></div><p>${escapeHtml(rewardText)}</p>${reward&&!reward.openedAt?`<button class="icon-btn primary" data-reveal-simulation-reward="${escapeAttr(reward.id)}">Revelar recompensa</button>`:''}${reward?.openedAt?`<div class="simulation-reward-revealed"><strong>${escapeHtml(rewardText)}</strong><span>${reward.durationHours} horas de duração</span></div>`:''}<button class="tiny-btn" id="closeSimulationReward">Continuar</button></div></div>`;
}
function renderImportedSimulados() {
  const cards = importedSimulados.map((sim,index) => `<article class="sim-library-card"><div class="sim-library-icon"><span>${String(index+1).padStart(2,'0')}</span></div><div class="sim-library-copy"><span class="sim-card-label">Prova importada</span><strong>${escapeHtml(sim.name)}</strong><div class="muted">${sim.questionCount || sim.questions?.length || 0} questões · correção comentada</div><div class="sim-card-features"><span>Tags editáveis</span><span>Análise por área</span></div></div><button class="icon-btn primary" data-start-imported-sim="${escapeAttr(sim.id)}">Iniciar prova <span aria-hidden="true">→</span></button></article>`).join('');
  return `<section class="card sim-library-panel" id="simLibrary"><div class="section-title"><div><span class="eyebrow">Biblioteca</span><h2>Provas prontas para começar</h2><div class="muted">${escapeHtml(importedSimuladosStatus)}</div></div><span class="sim-count-pill">${importedSimulados.length} disponíveis</span></div>${cards ? `<div class="sim-library-list">${cards}</div>` : '<div class="empty sim-empty-state"><strong>Sua biblioteca ainda está vazia</strong><span>Quando houver provas importadas, elas aparecerão organizadas aqui.</span></div>'}</section>`;
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
  // A questão e a aula do cronograma já trazem a área correta (uma das 5
  // ENAMED_AREAS) na maioria dos casos. Antes, essas áreas eram jogadas fora e
  // reconstruídas por palavra-chave a partir de área+tema colados — bastava o
  // tema ter uma palavra de outra especialidade (ex.: "rastreamento" tornando
  // uma questão de Clínica Médica em MFC) para trocar a área de 1 em cada 5
  // questões do banco. Agora só caímos no chute por palavra-chave quando nem
  // a questão nem a aula vinculada já têm uma área reconhecida.
  if(ENAMED_AREAS.includes(question.area)) return question.area;
  const linked = scheduleForQuestion(question);
  if(linked?.area && ENAMED_AREAS.includes(linked.area)) return linked.area;
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
  return `<section class="card sim-generator-card" id="simGenerator"><div class="section-title"><div><span class="eyebrow">Personalizar</span><h2>Monte seu próprio desafio</h2><div class="muted">Defina a distribuição por área. As questões são embaralhadas e a correção só aparece ao finalizar.</div></div><span class="sim-bank-status"><i></i>${questionBank.length} questões no banco</span></div><div class="sim-command"><div class="sim-generator-main"><label class="sim-field-label" for="simRunName">Nome da prova</label><input class="input sim-name-input" id="simRunName" value="Simulado ENAMED ${state.simuladoRuns.length + 1}" aria-label="Nome do simulado"><div class="sim-field-label sim-areas-label">Distribuição de questões</div><div class="sim-targets">${ENAMED_AREAS.map(area => `<div class="sim-target"><label>${escapeHtml(area)}</label><div class="sim-target-control"><input class="input" type="number" min="0" max="40" step="1" data-sim-target="${escapeAttr(area)}" value="${targets[area]}"><span>questões</span></div></div>`).join('')}</div><div class="sim-availability">Disponibilidade atual: ${escapeHtml(counts)}</div></div><aside class="sim-generator-aside"><div class="sim-duration-icon">◷</div><label class="sim-field-label" for="simDuration">Tempo total</label><div class="sim-duration-control"><input class="input" id="simDuration" type="number" min="30" step="15" value="300" title="Tempo total em minutos"><span>min</span></div><small>Aproximadamente 3 minutos por questão.</small><button class="icon-btn primary" id="generateSimulado" ${questionBank.length?'':'disabled'}>Gerar e iniciar <span aria-hidden="true">→</span></button></aside></div></section>`;
}
function renderSimuladoRunsList() {
  if(!state.simuladoRuns.length) return '<div class="empty sim-empty-state"><strong>Nenhuma prova realizada ainda</strong><span>Crie um simulado personalizado ou escolha uma prova da biblioteca.</span><button class="tiny-btn" type="button" data-sim-scroll="simGenerator">Criar primeira prova</button></div>';
  return `<div class="sim-history-list">${state.simuladoRuns.map(run => {
    const result = simuladoResult(run);
    const status=run.abandonedAt?'Abandonado':run.finishedAt?`Finalizado em ${new Date(run.finishedAt).toLocaleString('pt-BR')}`:'Em andamento';
    const score=run.finishedAt?Math.round(result.rate*100):Math.round(answeredSimCount(run)/Math.max(run.questionIds.length,1)*100);
    const tone=run.abandonedAt?'abandoned':run.finishedAt?(result.rate>=.7?'success':'attention'):'progress';
    return `<article class="sim-history-row ${tone}"><div class="sim-history-score"><strong>${score}%</strong><span>${run.finishedAt?'acertos':'progresso'}</span></div><div class="sim-history-info"><div><span class="sim-status-dot"></span><span>${escapeHtml(status)}</span></div><strong>${escapeHtml(run.name)}</strong><small>${run.questionIds.length} questões · ${run.sourceType==='imported'?'Prova importada':'Gerado pelo banco'}</small></div><div class="sim-run-history-actions"><button class="icon-btn" data-open-sim="${run.id}">${run.finishedAt?'Analisar resultado':run.abandonedAt?'Ver registro':'Continuar prova'}</button><button class="tiny-btn danger" data-delete-sim-run="${run.id}" title="Excluir este registro" aria-label="Excluir ${escapeAttr(run.name)}">×</button></div></article>`;
  }).join('')}</div>`;
}
function renderSimuladoRun(run) {
  const questions = simRunQuestions(run);
  if(!questions.length) return '<div class="card"><div class="empty">Este simulado não encontrou questões carregadas.</div></div>';
  if(run.abandonedAt) return `<div class="card"><div class="empty"><strong>Simulado abandonado</strong><br>Esta tentativa foi preservada no histórico, mas não concede XP de conclusão, fragmento ou recompensa elemental.</div></div>`;
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
  if(!run.openedCount || typeof run.openedCount !== 'object') run.openedCount = {};
  run.openedCount[questionId] = n(run.openedCount[questionId]) + 1;
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
  run.updatedAt = new Date().toISOString();
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
    return `<div class="sim-answer-row"><button class="eliminate-btn ${isEliminated?'active':''}" data-sim-eliminate="${letter}" title="Riscar alternativa ${letter}">×</button><button class="sim-answer ${selected===letter?'selected':''} ${isEliminated?'eliminated':''}" data-sim-answer="${letter}"><span class="answer-letter">${letter}</span><span style="font-size:${state.questionSettings.fontSize}px">${renderHighlightedText(text, [])}</span></button></div>`;
  }).join('');
  return `<div class="sim-run-layout"><aside class="card"><div class="section-title"><h2>${escapeHtml(run.name)}</h2><span class="badge ${run.paused?'wait':'done'}">${run.paused?'Pausado':'Rodando'}</span></div><div class="sim-clock" id="simuladoClock">${formatClock(run.secondsLeft)}</div><div class="muted">${answeredSimCount(run)} de ${questions.length} respondidas</div>${progress('Progresso', answeredSimCount(run)/Math.max(questions.length,1), 'sem correção durante a prova')}<div class="sim-palette">${questions.map((q,index) => `<button class="sim-dot ${run.answers?.[q.id]?'answered':''} ${index===run.currentIndex?'active':''}" data-sim-go="${index}">${index+1}</button>`).join('')}</div><div class="sim-side-actions"><button class="icon-btn primary" id="toggleSimuladoTimer">${run.paused?'Iniciar prova':'Pausar prova'}</button><button class="icon-btn" id="clearSimAnswer" ${selected?'':'disabled'}>Limpar resposta</button><button class="icon-btn" id="finishSimulado">Finalizar prova</button><button class="icon-btn" id="cancelSimulado">Cancelar simulado</button></div></aside><section class="card question-card"><div class="question-body"><div class="sim-exam-top"><div><span class="badge today">${run.currentIndex + 1} de ${questions.length}</span><span class="badge wait">${escapeHtml(broadArea)}</span></div><div class="sim-tools"><button type="button" title="Imprimir">⎙</button><button type="button" title="Informações">i</button><button type="button" title="Alerta">!</button><button type="button" id="simFontUp" title="Aumentar fonte">A+</button><button type="button" id="simFontDown" title="Diminuir fonte">A−</button><button type="button" title="Favoritar">♡</button><button type="button" title="Marcar">${iconSvg('flag',{weight:'regular'})}</button></div></div><div class="sim-question-head"><div><h2>Questão ${run.currentIndex + 1}</h2><div class="muted">${escapeHtml(broadArea)}</div></div><div><button class="icon-btn" id="simPrev" ${run.currentIndex===0?'disabled':''}>‹</button> <button class="icon-btn primary" id="simNext" ${run.currentIndex>=questions.length-1?'disabled':''}>›</button></div></div><div class="question-stem sim-highlightable" data-highlight-scope="stem" style="font-size:${state.questionSettings.fontSize}px">${renderHighlightedText(question.stem, highlights, false, 'stem')}</div>${renderQuestionImages(question)}<div class="answer-list">${options}</div>${renderSimConfidence(run, question)}<div class="question-nav"><span class="muted">${selected ? `Marcada: ${selected}` : 'Sem resposta marcada'}</span></div></div></section></div>`;
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
    const history = Array.isArray(run.answerHistory?.[question.id]) ? run.answerHistory[question.id] : [];
    const firstAnswer = run.firstAnswers?.[question.id] || selected;
    const changed = history.length > 0;
    const changedCorrectToWrong = changed && firstAnswer === question.answer && selected !== question.answer;
    const changedWrongToCorrect = changed && firstAnswer !== question.answer && selected === question.answer;
    const confidenceScore = { red:20, yellow:55, green:90 }[confidence] || 0;
    return { question, selected, correct, reviewed:Boolean(run.reviewedErrors?.[question.id]), area, topic: tag.topic || 'Sem tema', subtopic: tag.subtopic || '', confidence, confidenceScore, seconds, skipped: !selected, guessed: confidence === 'red', overconfidentWrong: !correct && confidence === 'green', changed, changedCorrectToWrong, changedWrongToCorrect, changes:history.length, opened:n(run.openedCount?.[question.id]) || (run.questionVisited?.[question.id] ? 1 : 0), firstAnswer };
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
  const totalSeconds = Math.max(n(run.elapsedSeconds), timedRows.reduce((sum,row)=>sum+row.seconds,0));
  const slowLimit = Math.max(120, totalSeconds / Math.max(1, rows.length) * 1.3);
  const adjustedPoints = rows.reduce((sum,row)=>sum + (row.correct ? ({ red:.3, yellow:.6, green:1 }[row.confidence] || .75) : 0), 0);
  const phaseSize = Math.max(1, Math.ceil(rows.length / 5));
  const phases = Array.from({length:Math.min(5, Math.ceil(rows.length / phaseSize))},(_,index)=>{
    const phaseRows = rows.slice(index*phaseSize,(index+1)*phaseSize);
    const phaseTimed = phaseRows.filter(row=>row.seconds>0);
    return { label:`${index*phaseSize+1}–${index*phaseSize+phaseRows.length}`, total:phaseRows.length, correct:phaseRows.filter(row=>row.correct).length, skipped:phaseRows.filter(row=>row.skipped).length, confidence:phaseRows.filter(row=>row.confidenceScore>0).length ? phaseRows.reduce((sum,row)=>sum+row.confidenceScore,0)/phaseRows.filter(row=>row.confidenceScore>0).length : 0, averageSeconds:phaseTimed.length ? phaseTimed.reduce((sum,row)=>sum+row.seconds,0)/phaseTimed.length : 0 };
  });
  const productiveRows = rows.filter(row=>row.correct || row.changedWrongToCorrect);
  const unproductiveRows = rows.filter(row=>(!row.correct && row.seconds>slowLimit) || row.changedCorrectToWrong);
  return { rows, total: rows.length, correct, rate: rows.length ? correct / rows.length : 0, adjustedRate: rows.length ? adjustedPoints / rows.length : 0, byArea, weakTopics: [...topicMap.values()].sort((a,b)=>b.score-a.score || b.wrong-a.wrong).slice(0,8), confidenceCounts, skipped: rows.filter(row=>row.skipped), guessed: rows.filter(row=>row.guessed), overconfidentWrong: rows.filter(row=>row.overconfidentWrong), timedRows, averageSeconds: timedRows.length ? timedRows.reduce((sum,row)=>sum+row.seconds,0)/timedRows.length : 0, totalSeconds, slowLimit, phases, productiveSeconds:productiveRows.reduce((sum,row)=>sum+row.seconds,0), unproductiveSeconds:unproductiveRows.reduce((sum,row)=>sum+row.seconds,0), changed:rows.filter(row=>row.changed), changedCorrectToWrong:rows.filter(row=>row.changedCorrectToWrong), changedWrongToCorrect:rows.filter(row=>row.changedWrongToCorrect), fragileCorrect:rows.filter(row=>row.correct && row.confidenceScore<80), matrix:{solid:rows.filter(row=>row.correct && row.confidenceScore>=80).length, fragile:rows.filter(row=>row.correct && row.confidenceScore<80).length, recognizedGap:rows.filter(row=>!row.correct && row.confidenceScore>0 && row.confidenceScore<80).length, dangerous:rows.filter(row=>!row.correct && row.confidenceScore>=80).length} };
}
function simResultClassification(row, result) {
  if(row.skipped) return 'Questão pulada';
  if(row.changedCorrectToWrong) return 'Mudança: certa → errada';
  if(row.changedWrongToCorrect) return 'Mudança: errada → certa';
  if(!row.correct && row.confidenceScore >= 80) return 'Erro consciente';
  if(!row.correct && row.confidenceScore > 0) return 'Erro por dúvida';
  if(!row.correct) return 'Erro por chute';
  if(row.guessed) return 'Acerto por chute';
  if(row.correct && row.seconds > result.slowLimit) return 'Acerto lento';
  return 'Acerto sólido';
}
function renderSimuladoResult(run, questions) {
  const result = simuladoResult(run);
  const errors = result.total - result.correct;
  const weakText = result.weakTopics.length ? result.weakTopics.slice(0,4).map(item => `${item.topic} (${item.wrong} erro${item.wrong===1?'':'s'})`).join(' · ') : 'Nenhum tema crítico.';
  const phases = result.phases.map(phase => `<div class="sim-phase-row"><strong>Q${phase.label}</strong><span>${phase.correct}/${phase.total} · ${pct(phase.correct/Math.max(1,phase.total))}</span><span>${phase.averageSeconds?formatVideoTime(phase.averageSeconds):'—'} méd.</span><span>${phase.confidence?Math.round(phase.confidence)+'%':'—'} confiança</span><span>${phase.skipped} em branco</span></div>`).join('');
  const matrix = [['Acerto sólido',result.matrix.solid,'success'],['Acerto frágil / chute',result.matrix.fragile,'warning'],['Erro reconhecido',result.matrix.recognizedGap,'warning'],['Erro perigoso na certeza',result.matrix.dangerous,'critical']].map(item=>`<div class="sim-matrix-cell ${item[2]}"><strong>${item[1]}</strong><span>${item[0]}</span></div>`).join('');
  const actions = [];
  if(result.overconfidentWrong.length) actions.push(`Revisar ${result.overconfidentWrong.length} erro${result.overconfidentWrong.length===1?'':'s'} com alta confiança: possível modelo mental incorreto.`);
  if(result.fragileCorrect.length) actions.push(`Revisar ${result.fragileCorrect.length} acerto${result.fragileCorrect.length===1?'':'s'} frágil${result.fragileCorrect.length===1?'':'eis'} antes de considerar o tema dominado.`);
  if(result.skipped.length) actions.push(`Retomar ${result.skipped.length} questão${result.skipped.length===1?'':'ões'} pulada${result.skipped.length===1?'':'s'} em uma segunda passagem cronometrada.`);
  if(result.changedCorrectToWrong.length) actions.push(`Investigar ${result.changedCorrectToWrong.length} mudança${result.changedCorrectToWrong.length===1?'':'s'} de certa para errada.`);
  if(!actions.length) actions.push('Manter revisão espaçada e treinar questões com o mesmo nível de dificuldade.');
  return `<div class="card sim-postmortem"><div class="section-title"><div><span class="eyebrow">Centro de análise pós-simulado</span><h2>${escapeHtml(run.name)}</h2><div class="muted">Diagnóstico de conhecimento, confiança, tempo e qualidade das decisões.</div></div><button class="icon-btn" data-open-sim="${run.id}">Revisar prova</button></div><div class="sim-result-grid"><div class="sim-area-card"><strong>Resultado bruto</strong><div class="metric-value">${pct(result.rate)}</div><div class="muted">${result.correct}/${result.total} acertos</div></div><div class="sim-area-card primary"><strong>Domínio ajustado</strong><div class="metric-value">${pct(result.adjustedRate)}</div><div class="muted">acertos ponderados pela confiança</div></div><div class="sim-area-card"><strong>Tempo total</strong><div class="metric-value">${formatVideoTime(result.totalSeconds)}</div><div class="muted">média ${result.averageSeconds?formatVideoTime(result.averageSeconds):'—'} por questão</div></div><div class="sim-area-card"><strong>Não respondidas</strong><div class="metric-value">${result.skipped.length}</div><div class="muted">questões puladas</div></div><div class="sim-area-card"><strong>Erro na certeza</strong><div class="metric-value">${result.overconfidentWrong.length}</div><div class="muted">prioridade máxima</div></div><div class="sim-area-card"><strong>Alterações</strong><div class="metric-value">${result.changed.reduce((sum,row)=>sum+row.changes,0)}</div><div class="muted">${result.changedWrongToCorrect.length} ajudaram · ${result.changedCorrectToWrong.length} prejudicaram</div></div></div><div class="sim-analysis-section"><div class="section-title"><h3>Matriz acerto × confiança</h3><span class="muted">O que importa é a robustez do acerto.</span></div><div class="sim-matrix">${matrix}</div></div><div class="sim-analysis-section"><div class="section-title"><h3>Tempo e queda de desempenho</h3><span class="muted">Tempo improdutivo estimado: ${formatVideoTime(result.unproductiveSeconds)}</span></div><div class="sim-phase-list">${phases}</div></div><div class="sim-analysis-section"><div class="section-title"><h3>Desempenho por área</h3></div><div class="sim-result-grid">${result.byArea.map(area => { const areaRows=result.rows.filter(row=>row.area===area.area); const dangerous=areaRows.filter(row=>row.overconfidentWrong).length; const fragile=areaRows.filter(row=>row.correct&&row.confidenceScore<80).length; return `<div class="sim-area-card"><strong>${escapeHtml(area.area)}</strong><div class="metric-value">${pct(area.rate)}</div><div class="muted">${area.correct}/${area.total||0} · ${dangerous} erro${dangerous===1?'':'s'} confiante${dangerous===1?'':'s'} · ${fragile} acerto${fragile===1?'':'s'} frágil${fragile===1?'':'eis'}</div></div>`; }).join('')}</div></div><div class="sim-review-item sim-action-plan"><div class="section-title"><h3>Plano prioritário</h3><button class="icon-btn" id="sendSimWeakToFeynman">Enviar temas para Feynman</button></div><ol>${actions.map(action=>`<li>${escapeHtml(action)}</li>`).join('')}</ol><div class="topic-source">Temas críticos: ${escapeHtml(weakText)}</div></div>${renderSimuladoReview(run, result.rows, result)}</div>`;
}
function renderSimuladoReview(run, rows, result) {
  const wrongRows=rows.filter(row=>!row.correct);
  const reviewedCount=wrongRows.filter(row=>row.reviewed).length;
  // Usa o mesmo slowLimit já calculado em simuladoResult (que considera a soma
  // dos tempos por questão, não só o cronômetro geral); recalcular aqui com uma
  // fórmula diferente fazia o rótulo "Acerto lento" de cada questão divergir do
  // tempo improdutivo mostrado no resumo do simulado.
  const slowLimit = result ? result.slowLimit : Math.max(120, n(run.elapsedSeconds)/Math.max(1,rows.length)*1.3);
  return `<div class="sim-review-list">${rows.map((row,index) => {
    const tag = questionTag(row.question);
    const profile = simResultClassification(row, {slowLimit});
    const changes = row.changes ? ` · ${row.changes} alteração${row.changes===1?'':'ões'} (${escapeHtml(row.firstAnswer || '—')} → ${escapeHtml(row.selected || '—')})` : '';
    const reviewAction=row.correct?'':`<button class="tiny-btn ${row.reviewed?'done':''}" data-review-sim-error="${escapeAttr(row.question.id)}">${row.reviewed?'Erro revisado ✓':'Marcar erro como revisado'}</button>`;
    return `<div class="sim-review-item ${row.correct?'':'wrong'}"><div class="sim-question-head"><div><strong>Questão ${index+1} · ${escapeHtml(tag.area)}</strong><div class="muted">${escapeHtml(tag.topic)}${tag.subtopic?` · ${escapeHtml(tag.subtopic)}`:''}</div></div><span class="badge ${row.correct?'done':'no'}">${escapeHtml(profile)}</span></div><div class="muted">Sua resposta: ${escapeHtml(row.selected || 'em branco')} · Gabarito: ${escapeHtml(row.question.answer)} · Tempo: ${row.seconds ? formatVideoTime(row.seconds) : 'não registrado'}${changes} · Reaberta: ${row.opened || 0}x</div>${reviewAction}<div class="field-row" style="margin-top:8px"><input class="input" data-imported-tag="${row.question.id}" data-field="area" value="${escapeAttr(tag.area)}" placeholder="Área ENAMED"><input class="input" data-imported-tag="${row.question.id}" data-field="topic" value="${escapeAttr(tag.topic)}" placeholder="Tema principal"><input class="input" data-imported-tag="${row.question.id}" data-field="subtopic" value="${escapeAttr(tag.subtopic)}" placeholder="Subtema"></div>${renderSimuladoCommentPanel(row)}${renderQuestionFlashcardEditor(row.question, row)}</div>`;
  }).join('')}<div class="sim-review-progress"><strong>Revisão dos erros: ${reviewedCount}/${wrongRows.length}</strong><span>${wrongRows.length===reviewedCount?'Revisão completa: fragmento e recompensa liberados.':'Leia os comentários e marque cada erro depois de revisá-lo.'}</span></div></div>`;
}
function renderSimuladoCommentPanel(row) {
  if(!row.question.comment) return '';
  const sections = questionCommentSections(row.question, row);
  const hasKids = Boolean(row.question.kids);
  const cards = [
    ['analysis','Análise'],
    ['pearl','Pérola'],
    ['error','Armadilha'],
    ...(hasKids ? [['kids','Explicação simples']] : [])
  ].map(([key,label]) => `<div class="question-comment-card ${key}"><strong>${escapeHtml(label)}</strong><div>${renderCommentSectionContent(key, sections[key], [])}</div></div>`).join('');
  return `<details class="material-original-toggle" style="margin-top:8px"><summary>Comentário da questão</summary><div class="sim-comment-stack">${cards}</div></details>`;
}
function bindSimuladoInputs(activeRun) {
  document.getElementById('toggleSimulationLibrary')?.addEventListener('click',()=>{ui.simulationLibraryOpen=!ui.simulationLibraryOpen;render();});
  document.getElementById('closeSimulationReward')?.addEventListener('click',()=>{ui.simulationRewardSummary=null;render();});
  document.querySelectorAll('[data-reveal-simulation-reward]').forEach(button=>button.addEventListener('click',event=>{
    const result=Gamification.openElementReward(state.gamification,event.currentTarget.dataset.revealSimulationReward,{now:new Date()});
    if(result.reward) ui.simulationRewardSummary={...ui.simulationRewardSummary,reward:result.reward};
    persist();
  }));
  const generate = document.getElementById('generateSimulado');
  if(generate) generate.onclick = () => generateSimuladoRun();
  document.querySelectorAll('[data-start-imported-sim]').forEach(button => button.onclick = e => startImportedSimulado(e.currentTarget.dataset.startImportedSim));
  document.querySelectorAll('[data-open-sim]').forEach(button => button.onclick = e => { ui.activeSimRunId = e.currentTarget.dataset.openSim; ui.simulationLibraryOpen=false; syncRouteFromUI('push'); render(); });
  document.querySelectorAll('[data-delete-sim-run]').forEach(button => button.onclick = e => {
    const run=state.simuladoRuns.find(item=>item.id===e.currentTarget.dataset.deleteSimRun);
    if(!run) return;
    const warning=run.finishedAt?'O resultado será removido da lista. O XP e as recompensas já concedidos permanecem no ledger para preservar a contabilidade.':'A tentativa e suas respostas serão apagadas definitivamente.';
    if(confirm(`Excluir "${run.name}"?\n\n${warning}`)) deleteSimuladoRun(run);
  });
  document.querySelectorAll('[data-question-card][data-card-id][data-card-field]').forEach(input => {
    input.oninput = e => updateQuestionFlashcard(e.currentTarget);
    input.onchange = e => updateQuestionFlashcard(e.currentTarget);
  });
  bindFlashcardMarkdownTools(document.getElementById('simulados') || document);
  document.querySelectorAll('[data-remove-question-card]').forEach(button => button.onclick = e => removeQuestionFlashcard(e.currentTarget.dataset.removeQuestionCard, e.currentTarget.dataset.cardId));
  document.querySelectorAll('[data-review-sim-error]').forEach(button=>button.onclick=e=>{
    const questionId=e.currentTarget.dataset.reviewSimError;
    activeRun.reviewedErrors ||= {};
    activeRun.reviewedErrors[questionId]=!activeRun.reviewedErrors[questionId];
    const summary=processSimulationReviewGamification(activeRun);
    persist();
    if(summary?.eligibility?.fullyReviewed) showStudyToast('Revisão do simulado concluída. Recompensas registradas sem duplicação.');
  });
  if(!activeRun) return;
  document.querySelectorAll('[data-sim-go]').forEach(button => button.onclick = e => { setSimQuestionIndex(activeRun, n(e.currentTarget.dataset.simGo)); saveStateOnly(); render(); });
  document.querySelectorAll('[data-sim-answer]').forEach(button => button.onclick = e => {
    if(highlightGestureShouldBlockClick(e)) {
      clearHighlightGestureState();
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    clearHighlightGestureState();
    const question = activeSimQuestion(activeRun);
    if(!question) return;
    const nextAnswer = e.currentTarget.dataset.simAnswer;
    // Riscar uma alternativa (eliminar) é o aluno dizendo "descartei esta".
    // Sem este bloqueio, um clique no meio do texto riscado ainda marcava a
    // alternativa como resposta final — contradizendo a própria eliminação.
    // É preciso desmarcar o risco (botão ×) antes de poder escolhê-la.
    const eliminated = Array.isArray(activeRun.eliminated?.[question.id]) ? activeRun.eliminated[question.id] : [];
    if(eliminated.includes(nextAnswer)) {
      showStudyToast('Esta alternativa está riscada. Clique no × para desfazer antes de escolhê-la.');
      return;
    }
    const previousAnswer = activeRun.answers?.[question.id] || '';
    if(!activeRun.firstAnswers[question.id]) activeRun.firstAnswers[question.id] = nextAnswer;
    if(previousAnswer && previousAnswer !== nextAnswer) {
      if(!Array.isArray(activeRun.answerHistory[question.id])) activeRun.answerHistory[question.id] = [];
      activeRun.answerHistory[question.id].push({ from:previousAnswer, to:nextAnswer, elapsedSeconds:n(activeRun.elapsedSeconds), at:new Date().toISOString() });
    }
    activeRun.answers[question.id] = nextAnswer;
    activeRun.updatedAt = new Date().toISOString();
    if(n(activeRun.currentIndex) < activeRun.questionIds.length - 1) setSimQuestionIndex(activeRun, n(activeRun.currentIndex) + 1);
    saveStateOnly({invalidate:false});
    render();
  });
  document.querySelectorAll('[data-sim-confidence]').forEach(button => button.onclick = e => {
    const question = activeSimQuestion(activeRun);
    if(!question) return;
    if(!activeRun.confidence || typeof activeRun.confidence !== 'object') activeRun.confidence = {};
    activeRun.confidence[question.id] = e.currentTarget.dataset.simConfidence;
    saveStateOnly({invalidate:false});
    render();
  });
  document.querySelectorAll('[data-sim-eliminate]').forEach(button => button.onclick = e => {
    e.preventDefault();
    e.stopPropagation();
    const question = activeSimQuestion(activeRun);
    if(question) toggleSimEliminated(activeRun, question, e.currentTarget.dataset.simEliminate);
  });
  if(textHighlightEnabled()) {
    bindPointerHighlighter(document.querySelectorAll('.sim-highlightable'),(descriptor,color)=>{
      const question=activeSimQuestion(activeRun);
      if(question) applySimHighlight(activeRun,question,descriptor,color);
    });
    bindSavedHighlightMenus(document.querySelector('.sim-run-layout'),(descriptor,color)=>{
      const question=activeSimQuestion(activeRun);
      if(question) applySimHighlight(activeRun,question,descriptor,color);
    });
  }
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
    if(confirm('Cancelar este simulado? A tentativa e todas as respostas serão apagadas definitivamente, como se você nunca tivesse feito.')) deleteSimuladoRun(activeRun,{cancelled:true});
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
  const existing=state.simuladoRuns.find(run=>run.sourceType==='imported'&&run.importedSimId===simId&&!run.finishedAt&&!run.abandonedAt);
  if(existing) {
    ui.activeSimRunId=existing.id;
    ui.simulationLibraryOpen=false;
    syncRouteFromUI('push');
    render();
    return;
  }
  const duration = Math.max(30, n(sim.durationMinutes) || 300);
  const now=new Date().toISOString();
  const run = {
    id: `simrun-imported-${Date.now()}`,
    name: sim.name,
    sourceType: 'imported',
    importedSimId: sim.id,
    sourceSimulationId: sim.id,
    createdAt: now,
    startedAt: now,
    updatedAt: now,
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
    firstAnswers: {},
    answerHistory: {},
    openedCount: {},
    reviewFlags: {},
    reviewedErrors: {},
    areaTargets: {}
  };
  state.simuladoRuns.unshift(run);
  ui.activeSimRunId = run.id;
  ui.simulationLibraryOpen=false;
  persist();
  syncRouteFromUI('push');
  startSimuladoTimer(run, false);
}
function generateSimuladoRun() {
  const targets = defaultSimuladoTargets();
  document.querySelectorAll('[data-sim-target]').forEach(input => { targets[input.dataset.simTarget] = Math.max(0, n(input.value)); });
  const questions = buildBalancedSimulado(targets);
  if(!questions.length) { alert('Ainda não há questões carregadas para gerar o simulado.'); return; }
  const duration = Math.max(30, n(document.getElementById('simDuration')?.value) || 300);
  const now=new Date().toISOString();
  const run = {
    id: `simrun-${Date.now()}`,
    name: document.getElementById('simRunName')?.value?.trim() || `Simulado ENAMED ${state.simuladoRuns.length + 1}`,
    sourceType: 'generated',
    importedSimId: '',
    sourceSimulationId: `generated:${Gamification?.stableHash?.(questions.map(question=>question.id).sort())||Date.now()}`,
    createdAt: now,
    startedAt: now,
    updatedAt: now,
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
    firstAnswers: {},
    answerHistory: {},
    openedCount: {},
    reviewFlags: {},
    reviewedErrors: {},
    areaTargets: targets
  };
  state.simuladoRuns.unshift(run);
  ui.activeSimRunId = run.id;
  ui.simulationLibraryOpen=false;
  persist();
  syncRouteFromUI('push');
  startSimuladoTimer(run, false);
}
function startSimuladoTimer(run, shouldRender=true) {
  if(run.finishedAt) return;
  if(simuladoTimer.interval && simuladoTimer.runId === run.id) return;
  if(simuladoTimer.interval) clearInterval(simuladoTimer.interval);
  run.paused = false;
  run.timerDeadlineAt = Date.now() + Math.max(0,n(run.secondsLeft)) * 1000;
  startAutoStudy('simulado', '');
  simuladoTimer.runId = run.id;
  simuladoTimer.interval = setInterval(() => tickSimuladoTimer(run.id), 1000);
  if(shouldRender) persist();
}
function pauseSimuladoTimer(run, shouldRender=true) {
  if(!run.paused && run.timerDeadlineAt) {
    run.secondsLeft=Math.max(0,Math.ceil((n(run.timerDeadlineAt)-Date.now())/1000));
    run.elapsedSeconds=Math.max(0,n(run.durationMinutes)*60-n(run.secondsLeft));
  }
  if(simuladoTimer.interval) clearInterval(simuladoTimer.interval);
  simuladoTimer.interval = null;
  simuladoTimer.runId = '';
  run.paused = true;
  run.timerDeadlineAt = 0;
  run.updatedAt = new Date().toISOString();
  stopAutoStudy('simulado');
  if(shouldRender) persist();
}
function tickSimuladoTimer(runId) {
  const run = state.simuladoRuns.find(item => item.id === runId);
  if(!run || run.finishedAt || run.paused) return;
  if(!run.timerDeadlineAt) run.timerDeadlineAt=Date.now()+Math.max(0,n(run.secondsLeft))*1000;
  run.secondsLeft = Math.max(0, Math.ceil((n(run.timerDeadlineAt)-Date.now())/1000));
  run.elapsedSeconds = Math.max(0, n(run.durationMinutes) * 60 - n(run.secondsLeft));
  run.updatedAt = new Date().toISOString();
  const clock = document.getElementById('simuladoClock');
  if(clock) clock.textContent = formatClock(run.secondsLeft);
  if(run.secondsLeft % 15 === 0) saveStateOnly();
  if(run.secondsLeft <= 0) finishSimuladoRun(run);
}
function simulationGamificationSnapshot(run) {
  const result=simuladoResult(run);
  return {id:run.id,attemptId:run.id,simulationId:run.sourceSimulationId||run.importedSimId||run.id,finishedAt:run.finishedAt,finished:Boolean(run.finishedAt),abandoned:Boolean(run.abandonedAt),totalQuestions:result.total,answeredQuestions:result.rows.filter(row=>Boolean(row.selected)).length,correctAnswers:result.correct,reviewedErrors:result.rows.filter(row=>!row.correct&&row.reviewed).length,questionResults:result.rows.map(row=>({questionId:row.question.id,selected:row.selected,answered:Boolean(row.selected),correct:row.correct,reviewed:row.reviewed}))};
}
function awardSimulationQuestionXP(run,result) {
  result.rows.filter(row=>row.selected).forEach(row=>{
    const previous=latestQuestionXPTransaction(row.question.id);
    const occurredAt=run.finishedAt||new Date().toISOString();
    const calculation=Gamification.calculateQuestionXP({correct:row.correct,occurredAt,previousOccurredAt:previous?.occurred_at},state.gamification?.rules);
    awardGamificationXP({activity_type:'question_answer',source_type:'question',source_id:row.question.id,source_event_id:`simulation:${run.id}:question:${row.question.id}`,base_xp:calculation.finalBaseXP,reason:'question_answer',occurred_at:occurredAt,metadata:{correct:row.correct,selected:row.selected,answer:row.question.answer||'',simulationAttemptId:run.id,repetitionMultiplier:calculation.repetitionMultiplier}});
  });
}
function processSimulationCompletionGamification(run) {
  if(!Gamification||!run?.finishedAt) return null;
  ensureGamificationState();
  const result=simuladoResult(run);
  const eligibility=Gamification.evaluateSimulationEligibility(simulationGamificationSnapshot(run),state.gamification);
  if(!eligibility.isEligibleForCompletionXP) return {eligibility};
  awardSimulationQuestionXP(run,result);
  const bonus=Gamification.calculateSimulationBonus({completed:true,totalQuestions:eligibility.totalQuestions,correctAnswers:eligibility.correctAnswers,reviewedErrors:0,rules:state.gamification.rules});
  const repeatWindowMs=Math.max(0,n(state.gamification.rules?.simulation?.repeatWindowDays)||30)*86400000;
  const finishedAt=Date.parse(run.finishedAt);
  const previousAttempts=gamificationTransactions().filter(item=>item.activity_type==='simulation_completion'&&item.source_id===eligibility.simulationId&&item.source_event_id!==`simulation-completion:${eligibility.attemptId}`&&finishedAt-Date.parse(item.occurred_at||0)>=0&&finishedAt-Date.parse(item.occurred_at||0)<=repeatWindowMs).length;
  const repeatMultiplier=previousAttempts?(n(state.gamification.rules?.simulation?.repeatXPMultiplier)||0.5):1;
  awardGamificationXP({activity_type:'simulation_completion',source_type:'simulation',source_id:eligibility.simulationId,source_event_id:`simulation-completion:${eligibility.attemptId}`,base_xp:bonus.completionXP*repeatMultiplier,reason:'simulation_completion',occurred_at:run.finishedAt,metadata:{attemptId:eligibility.attemptId,totalQuestions:eligibility.totalQuestions,correctAnswers:eligibility.correctAnswers,scorePercent:eligibility.scorePercent,repeatMultiplier,breakdown:{completionBase:bonus.completionBase,questionQuantityBonus:bonus.questionQuantityBonus,performanceBonus:bonus.performanceBonus,reviewedErrorsBonus:0,cappedValue:bonus.completionXP,finalXP:bonus.completionXP*repeatMultiplier}}});
  return processSimulationReviewGamification(run,{silent:eligibility.incorrectAnswers>0});
}
function processSimulationReviewGamification(run,{silent=false}={}) {
  if(!Gamification||!run?.finishedAt) return null;
  const eligibility=Gamification.evaluateSimulationEligibility(simulationGamificationSnapshot(run),state.gamification);
  if(!eligibility.isEligibleForFragment) return {eligibility};
  const bonus=Gamification.calculateSimulationBonus({completed:true,totalQuestions:eligibility.totalQuestions,correctAnswers:eligibility.correctAnswers,reviewedErrors:eligibility.reviewedErrors,rules:state.gamification.rules});
  const reviewAward=awardGamificationXP({activity_type:'simulation_review',source_type:'simulation',source_id:eligibility.simulationId,source_event_id:`simulation-review:${eligibility.attemptId}`,base_xp:bonus.reviewedErrorsBonus,reason:'simulation_errors_reviewed',occurred_at:new Date().toISOString(),metadata:{attemptId:eligibility.attemptId,reviewedErrors:eligibility.reviewedErrors,breakdown:{reviewedErrorsBonus:bonus.reviewedErrorsBonus,cappedValue:bonus.cappedValue,finalXP:bonus.reviewedErrorsBonus}}});
  const fragment=Gamification.grantSimulationFragment(state.gamification,eligibility);
  const reward=Gamification.createElementReward(state.gamification,eligibility);
  const acceleration=Gamification.applyRankAcceleration(state.gamification,completedAcademicBlockIds().length);
  reconcileRankProgress(completedAcademicBlockIds().length);
  const summary={attemptId:run.id,eligibility,xp:n(reviewAward.transaction?.final_xp),fragmentGranted:fragment.granted,medallionCreated:fragment.medallionCreated,reward:reward.reward,accelerated:acceleration.consumed};
  if(!silent&&(fragment.granted||reward.created||n(summary.xp)>0||acceleration.consumed)) ui.simulationRewardSummary=summary;
  return summary;
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
  processSimulationCompletionGamification(run);
  persist();
}
function deleteSimuladoRun(run,{cancelled=false}={}) {
  if(!run) return;
  if(simuladoTimer.interval && simuladoTimer.runId === run.id) clearInterval(simuladoTimer.interval);
  simuladoTimer.interval = null;
  simuladoTimer.runId = '';
  if(studyTimeTracker.kind==='simulado') stopAutoStudy('simulado');
  const cleaned=PlannerUX?.removeSimulationRecord?.(state.simuladoRuns,state.simulados,run.id) || {
    simuladoRuns:state.simuladoRuns.filter(item=>item.id!==run.id),
    simulados:state.simulados.filter(item=>item.id!==`auto-${run.id}`)
  };
  state.simuladoRuns=cleaned.simuladoRuns;
  state.simulados=cleaned.simulados;
  if(ui.activeSimRunId===run.id) ui.activeSimRunId='';
  ui.simulationLibraryOpen=true;
  persist();
  syncRouteFromUI('replace');
  showStudyToast(cancelled?'Simulado cancelado. A tentativa foi apagada.':'Registro do simulado excluído.');
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
function applySimHighlight(run, question, descriptor, color) {
  if(!descriptor?.text) return;
  const selected=descriptor.text;
  const occurrence=n(descriptor.occurrence);
  const scope=descriptor.scope || 'stem';
  if(!run.highlights || typeof run.highlights !== 'object') run.highlights = {};
  const highlights = Array.isArray(run.highlights[question.id]) ? [...run.highlights[question.id]] : [];
  const existing = highlights.findIndex(item => item.text === selected && (item.scope || 'stem')===scope && n(item.occurrence)===occurrence);
  rememberHighlightState({ context:'simulado', runId:run.id, questionId:question.id, highlights });
  if(color===null) run.highlights[question.id]=highlights.filter((_,index)=>index!==existing);
  else if(existing>=0) run.highlights[question.id]=highlights.map((item,index)=>index===existing ? {...item,color:normalizeHighlightColor(color),scope} : item);
  else run.highlights[question.id]=[...highlights,{text:selected,color:normalizeHighlightColor(color),scope,occurrence}];
  saveStateOnly();
  render();
}
function simScore(s) { return n(s.total)>0 ? n(s.correct)/n(s.total) : 0; }
// "Feito" precisa vir de total>0 (a prova tem questões registradas), não de
// correct>0: um simulado real onde o aluno zerou os acertos é raríssimo mas
// possível, e usar correct como proxy de conclusão o escondia da média (o que
// inflava a "Média atual" ao ignorar justamente o pior resultado) e o
// devolvia para "Próximo simulado" como se nunca tivesse sido feito.
function renderSimSummary() { const done=state.simulados.filter(s=>n(s.total)>0); const best=done.sort((a,b)=>simScore(b)-simScore(a))[0]; const avg=done.reduce((sum,s)=>sum+simScore(s),0)/Math.max(done.length,1); return `${progress('Média atual', avg, `${done.length} simulados preenchidos`)}${best ? `<div class="item"><div class="date-chip">${Math.round(simScore(best)*100)}%</div><div><strong>${escapeHtml(best.name)}</strong><div class="muted">${fmtDate(best.date)} · meta mínima 70%</div></div><div>${simScore(best)>=.7?'<span class="badge done">Meta</span>':'<span class="badge no">Abaixo</span>'}</div></div>` : '<div class="empty">Preencha os resultados para ver evolução.</div>'}`; }
function renderNextSim() { const next=state.simulados.filter(s=>s.date>=ui.refDate && n(s.total)===0).sort((a,b)=>a.date.localeCompare(b.date))[0]; if(!next) return '<div class="empty">Nenhum simulado futuro aberto.</div>'; return `<div class="item"><div class="date-chip">${fmtDate(next.date).slice(0,5)}</div><div><strong>${escapeHtml(next.name)}</strong><div class="muted">${escapeHtml(next.coverage)}</div></div><span class="badge today">Próximo</span></div>`; }
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
  document.querySelectorAll('[data-sim-scroll]').forEach(button=>button.addEventListener('click',()=>{
    document.getElementById(button.dataset.simScroll)?.scrollIntoView({behavior:'smooth',block:'start'});
  }));
  document.querySelectorAll('[data-open-sealed-reward]').forEach(button=>button.addEventListener('click',event=>{
    const result=Gamification.openElementReward(state.gamification,event.currentTarget.dataset.openSealedReward,{now:new Date()});
    if(result.opened) { persist(); showStudyToast(`Recompensa ${result.reward.rarityLabel} revelada: ${result.reward.elements.map(elementLabel).join(' + ')}.`); }
  }));
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
  return Number.isNaN(date.getTime()) ? '' : studyDateKey(date);
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
function analysisRateColor(rate) { return rate>=.7?'var(--green)':rate>=.4?'var(--amber)':'var(--red)'; }
function renderAreaBars(groups,emptyText) {
  if(!groups.length) return `<div class="empty">${escapeHtml(emptyText)}</div>`;
  return `<div class="analysis-bars">${groups.map(group=>`<div class="analysis-bar"><div><strong>${escapeHtml(group.name)}</strong><span>${group.correct}/${group.total} · ${pct(group.rate)}</span></div><div class="progress"><span style="width:${pct(group.rate)};background:${analysisRateColor(group.rate)}"></span></div></div>`).join('')}</div>`;
}
function questionDifficultyStats() {
  const levels=[
    {key:'facil',label:'Fácil',className:'easy'},
    {key:'media',label:'Média',className:'medium'},
    {key:'dificil',label:'Difícil',className:'hard'}
  ];
  const counts=Object.fromEntries(levels.map(level=>[level.key,0]));
  questionBank.forEach(question=>{
    const level=state.questionProgress?.[question.id]?.difficulty;
    if(Object.prototype.hasOwnProperty.call(counts,level)) counts[level]+=1;
  });
  const total=Object.values(counts).reduce((sum,value)=>sum+value,0);
  return {levels:levels.map(level=>({...level,count:counts[level.key],share:total?counts[level.key]/total:0})),total};
}
function renderQuestionDifficultyChart(stats) {
  if(!stats.total) return '<div class="empty">Classifique algumas questões como Fácil, Média ou Difícil para gerar este gráfico.</div>';
  return `<div class="question-difficulty-chart" role="img" aria-label="Distribuição das questões classificadas por dificuldade">${stats.levels.map(level=>`<div class="question-difficulty-row ${level.className}"><div class="question-difficulty-row-head"><strong>${level.label}</strong><span>${level.count} ${level.count===1?'questão':'questões'} · ${pct(level.share)}</span></div><div class="progress"><span style="width:${pct(level.share)}"></span></div></div>`).join('')}</div>`;
}
function areaWindowRows(daysBack) {
  const today=studyDateKey();
  const dates=[...Array(daysBack)].map((_,i)=>addDays(today,-i));
  return dates.flatMap(dailyQuestionRows);
}
function attentionMetrics(rows) {
  const BREAK_MINUTES=15;
  const timed=rows.filter(row=>row.answeredAt && !Number.isNaN(Date.parse(row.answeredAt))).sort((a,b)=>Date.parse(a.answeredAt)-Date.parse(b.answeredAt));
  const sessions=[];
  let current=null;
  timed.forEach(row=>{
    const t=Date.parse(row.answeredAt);
    if(!current || (t-current.lastTime)/60000>BREAK_MINUTES) { current={start:t,lastTime:t,questions:1,correct:row.correct?1:0}; sessions.push(current); }
    else { current.lastTime=t; current.questions+=1; current.correct+=row.correct?1:0; }
  });
  const longest=sessions.reduce((max,s)=>Math.max(max,(s.lastTime-s.start)/60000),0);
  const totalActive=sessions.reduce((sum,s)=>sum+(s.lastTime-s.start)/60000,0);
  const breaks=Math.max(0,sessions.length-1);
  const half=Math.floor(timed.length/2);
  const firstAcc=half?timed.slice(0,half).filter(row=>row.correct).length/half:null;
  const secondAcc=(timed.length-half)?timed.slice(half).filter(row=>row.correct).length/(timed.length-half):null;
  const decline=(firstAcc!==null && secondAcc!==null)?firstAcc-secondAcc:0;
  const secondsArr=timed.map(row=>row.seconds).filter(s=>s>0);
  const meanSec=secondsArr.length?secondsArr.reduce((a,b)=>a+b,0)/secondsArr.length:0;
  const variance=secondsArr.length?secondsArr.reduce((sum,s)=>sum+(s-meanSec)**2,0)/secondsArr.length:0;
  const cv=meanSec?Math.sqrt(variance)/meanSec:0;
  const continuityScore=Math.min(1,longest/45)*40;
  const consistencyScore=Math.max(0,1-Math.min(1,cv))*30;
  const stabilityScore=Math.max(0,1-Math.min(1,Math.max(0,decline)*2))*30;
  const score=timed.length?Math.round(continuityScore+consistencyScore+stabilityScore):null;
  return {sessions,longest,totalActive,breaks,decline,score,timed};
}
function attentionScoreLabel(score) {
  if(score===null) return {label:'Sem dados',className:''};
  if(score>=75) return {label:'Foco alto',className:'success'};
  if(score>=50) return {label:'Foco moderado',className:'attention'};
  if(score>=25) return {label:'Foco disperso',className:'warning'};
  return {label:'Atenção baixa',className:'critical'};
}
function svgAttentionTimeline(metrics) {
  const {timed}=metrics;
  if(timed.length<2) return '<div class="empty">Sem horários suficientes registrados nesta data.</div>';
  const start=Date.parse(timed[0].answeredAt), end=Date.parse(timed[timed.length-1].answeredAt);
  const span=Math.max(end-start,60000);
  const w=680,h=100,pad=12;
  const maxSec=Math.max(60,...timed.map(row=>row.seconds||0));
  const xOf=iso=>pad+((Date.parse(iso)-start)/span)*(w-2*pad);
  const points=timed.map(row=>({x:xOf(row.answeredAt),y:h-pad-((row.seconds||0)/maxSec)*(h-2*pad),correct:row.correct}));
  const BREAK_MS=15*60000;
  let gaps='';
  for(let i=1;i<timed.length;i++) {
    const gap=Date.parse(timed[i].answeredAt)-Date.parse(timed[i-1].answeredAt);
    if(gap>BREAK_MS) {
      const x1=xOf(timed[i-1].answeredAt), x2=xOf(timed[i].answeredAt);
      gaps+=`<rect x="${x1.toFixed(1)}" y="0" width="${Math.max(2,x2-x1).toFixed(1)}" height="${h}" fill="var(--muted)" opacity=".14"/>`;
    }
  }
  const path=points.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const dots=points.map(p=>`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="${p.correct?'var(--green)':'var(--red)'}"/>`).join('');
  return `<svg viewBox="0 0 ${w} ${h}" class="attention-chart" role="img" aria-label="Tempo por questão ao longo do dia, com pausas sombreadas">${gaps}<path d="${path}" fill="none" stroke="var(--blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>${dots}</svg>`;
}
function accuracyTrend(days) {
  ensureDayLogs();
  const today=studyDateKey();
  const dates=[...Array(days)].map((_,i)=>addDays(today,-(days-1-i)));
  return dates.map(date=>{
    const log=state.dayLogs.find(item=>item.date===date);
    const total=n(log?.correct)+n(log?.wrong);
    return {date,total,rate:total?n(log.correct)/total:null};
  });
}
function svgTrendLine(series) {
  const valid=series.filter(p=>p.rate!==null);
  if(valid.length<2) return '<div class="empty">Ainda não há dias suficientes para mostrar a tendência.</div>';
  const w=680,h=120,pad=14;
  const points=series.map((p,i)=>({...p,x:pad+(i/(series.length-1))*(w-2*pad),y:p.rate===null?null:h-pad-p.rate*(h-2*pad)}));
  const segments=[]; let seg=[];
  points.forEach(p=>{ if(p.y===null) { if(seg.length) segments.push(seg); seg=[]; } else seg.push(p); });
  if(seg.length) segments.push(seg);
  const paths=segments.map(s=>`<path d="${s.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}" fill="none" stroke="var(--teal)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  const dots=points.filter(p=>p.y!==null).map(p=>`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="var(--teal)"><title>${fmtDate(p.date)} · ${pct(p.rate)}</title></circle>`).join('');
  const grid=[0,.25,.5,.75,1].map(v=>{const y=(h-pad-v*(h-2*pad)).toFixed(1);return `<line x1="${pad}" x2="${w-pad}" y1="${y}" y2="${y}" stroke="var(--line)" stroke-width="1"/>`;}).join('');
  return `<svg viewBox="0 0 ${w} ${h}" class="attention-chart" role="img" aria-label="Tendência de precisão nos últimos ${series.length} dias">${grid}${paths}${dots}</svg>`;
}
function openQuestionFromAnalysis(questionId) {
  const question=questionBank.find(item=>item.id===questionId);
  if(!question) return;
  ui.qFocusScheduleId=''; ui.qFocusQuestionIds=[]; ui.qBlock=question.collectionBlock!==undefined?String(question.collectionBlock):'Todos'; ui.qSource='Todas'; ui.qTopic=question.topic || 'Todos'; ui.qStatus='Todas'; ui.justAnsweredId='';
  const list=filteredQuestions(); ui.qIndex=Math.max(0,list.findIndex(item=>item.id===questionId)); navigateToTab('questoes');
}
function renderAnalise() {
  const date=ui.analysisDate || studyDateKey();
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
  const metrics=attentionMetrics(rows);
  const scoreInfo=attentionScoreLabel(metrics.score);
  const trend=accuracyTrend(14);
  const difficultyStats=questionDifficultyStats();
  const windowRows=areaWindowRows(30);
  const areaGroupsAll=aggregateAnalysisRows(windowRows,'area');
  const areaGroups=(g=>g.length?g:areaGroupsAll)(areaGroupsAll.filter(item=>item.total>=3));
  const bestAreas=[...areaGroups].sort((a,b)=>b.rate-a.rate || b.total-a.total).slice(0,5);
  const worstAreas=[...areaGroups].sort((a,b)=>a.rate-b.rate || b.total-a.total).slice(0,5);
  const attentionCard=`<div class="card"><div class="section-title"><div><span class="eyebrow">Atenção e continuidade</span><h2>Quanto tempo você sustentou o foco</h2></div><span class="badge ${scoreInfo.className}">${metrics.score===null?'Sem dados':`${metrics.score}/100 · ${scoreInfo.label}`}</span></div><div class="analysis-kpis"><div class="analysis-kpi"><span>Maior sequência contínua</span><strong>${metrics.longest?formatVideoTime(metrics.longest*60):'—'}</strong><small>sem pausa acima de 15 min</small></div><div class="analysis-kpi"><span>Tempo ativo no dia</span><strong>${metrics.totalActive?formatVideoTime(metrics.totalActive*60):'—'}</strong><small>somando todos os blocos</small></div><div class="analysis-kpi"><span>Pausas</span><strong>${metrics.breaks}</strong><small>intervalos acima de 15 min</small></div><div class="analysis-kpi"><span>Queda de rendimento</span><strong>${metrics.decline>0?`-${pct(metrics.decline)}`:'estável'}</strong><small>2ª metade vs 1ª metade do dia</small></div></div>${svgAttentionTimeline(metrics)}</div>`;
  const skillCard=`<div class="card"><div class="section-title"><div><span class="eyebrow">Desenvolvimento de habilidades</span><h2>Tendência de precisão (14 dias)</h2></div></div>${svgTrendLine(trend)}</div><div class="grid two analysis-focus-grid"><div class="card analysis-focus strength"><div class="section-title"><div><span class="eyebrow">Melhores áreas · 30 dias</span><h2>${escapeHtml(bestAreas[0]?.name || 'Amostra insuficiente')}</h2></div></div>${renderAreaBars(bestAreas,'Ainda não há dados suficientes.')}</div><div class="card analysis-focus weakness"><div class="section-title"><div><span class="eyebrow">Piores áreas · 30 dias</span><h2>${escapeHtml(worstAreas[0]?.name || 'Nenhuma área crítica')}</h2></div></div>${renderAreaBars(worstAreas,'Ainda não há dados suficientes.')}</div></div>`;
  const executive=rows.length
    ? `${strongest?`Seu ponto mais forte foi ${strongest.name} (${pct(strongest.rate)}).`:''} ${weakest?`Priorize ${weakest.name}: ${weakest.wrong} ${weakest.wrong===1?'erro':'erros'} em ${weakest.total} ${weakest.total===1?'questão':'questões'}.`:'Nenhum ponto fraco relevante apareceu nesta amostra.'}`
    : 'Faça questões no banco ou finalize um simulado para gerar a leitura do dia.';
  const content=rows.length ? `<div class="analysis-kpis">
      <div class="analysis-kpi"><span>Questões analisadas</span><strong>${rows.length}</strong><small>${correct} acertos · ${rows.length-correct} erros</small></div>
      <div class="analysis-kpi primary"><span>Precisão</span><strong>${pct(correct/rows.length)}</strong><small>${rows.filter(row=>row.skipped).length} em branco</small></div>
      <div class="analysis-kpi"><span>Tempo médio</span><strong>${timed.length?formatVideoTime(average):'—'}</strong><small>${timed.length}/${rows.length} com tempo registrado</small></div>
      <div class="analysis-kpi"><span>Calibração</span><strong>${highConfidence.length?pct(highConfidenceCorrect/highConfidence.length):'—'}</strong><small>acerto quando confiança ≥ 80%</small></div>
      <div class="analysis-kpi"><span>Tempo total</span><strong>${timed.length?formatVideoTime(timed.reduce((sum,row)=>sum+row.seconds,0)):'—'}</strong><small>mediana ${median?formatVideoTime(median):'não registrada'}</small></div>
    </div><div class="card analysis-difficulty-card"><div class="section-title"><div><span class="eyebrow">Classificação do banco</span><h2>Dificuldade percebida</h2><div class="muted">Distribuição das questões classificadas no Banco de Questões.</div></div><span class="badge today">${difficultyStats.total} ${difficultyStats.total===1?'classificada':'classificadas'}</span></div>${renderQuestionDifficultyChart(difficultyStats)}</div><div class="grid two analysis-focus-grid"><div class="card analysis-focus strength"><div class="section-title"><div><span class="eyebrow">Ponto mais forte</span><h2>${escapeHtml(strongest?.name || 'Amostra insuficiente')}</h2></div><span class="badge done">${strongest?pct(strongest.rate):'—'}</span></div>${renderAnalysisBars(strengths,'Ainda não há um padrão forte.')}</div><div class="card analysis-focus weakness"><div class="section-title"><div><span class="eyebrow">Pontos mais fracos</span><h2>${escapeHtml(weakest?.name || 'Nenhum erro relevante')}</h2></div><span class="badge ${weakest?'no':'done'}">${weakest?`${weakest.wrong} ${weakest.wrong===1?'erro':'erros'}`:'estável'}</span></div>${renderAnalysisBars(weaknesses,'Nenhum tema fraco nesta amostra.')}</div></div>
    <div class="card"><div class="section-title"><div><h2>Fila inteligente de revisão</h2><div class="muted">Ordenada pelo risco de repetir o erro, não pela ordem das questões.</div></div><span class="badge today">${detailed.filter(row=>row.risk.score>0).length} prioridades</span></div><div class="table-wrap"><table class="analysis-table"><thead><tr><th>Questão</th><th>Área e tema</th><th>Leitura</th><th class="num">Confiança</th><th class="num">Tempo</th><th>Próxima ação</th><th></th></tr></thead><tbody>${detailed.map((row,index)=>`<tr><td><strong>${row.runId?`Simulado · ${row.position}`:`${escapeHtml(questionCollectionLabel(row.question.collectionBlock))} · ${row.question.number}`}</strong><div class="muted">${escapeHtml(row.source)}</div></td><td><strong>${escapeHtml(row.area)}</strong><div class="muted">${escapeHtml(row.topic)}</div></td><td><span class="analysis-signal ${row.risk.className}">${escapeHtml(row.risk.label)}</span></td><td class="num">${row.confidence?`${Math.round(row.confidence)}%`:'—'}</td><td class="num">${row.seconds?formatVideoTime(row.seconds):'—'}</td><td>${escapeHtml(row.risk.action)}</td><td>${row.runId?`<button class="tiny-btn" data-analysis-open-sim="${escapeAttr(row.runId)}">Revisar</button>`:`<button class="tiny-btn" data-analysis-open-question="${escapeAttr(row.questionId)}">Abrir</button>`}</td></tr>`).join('')}</tbody></table></div></div>` : `<div class="card empty analysis-empty"><strong>Nenhuma questão registrada em ${fmtDate(date)}</strong><span>Abra o Banco de Questões ou finalize um simulado. A análise aparecerá automaticamente.</span><button class="icon-btn primary" data-analysis-open-bank>Abrir questões</button></div>`;
  document.getElementById('analise').innerHTML=`<div class="card analysis-head"><div><span class="eyebrow">Inteligência de desempenho</span><h1>Análise diária de questões</h1><p>${escapeHtml(executive)}</p></div><div class="analysis-date-controls"><button class="icon-btn" data-analysis-day="-1" title="Dia anterior">‹</button><input class="input" id="analysisDate" inputmode="numeric" placeholder="dd/mm/aaaa"><button class="icon-btn" data-analysis-day="1" title="Dia seguinte">›</button><button class="tiny-btn" id="analysisToday">Hoje</button></div></div>${content}${attentionCard}${skillCard}`;
  bindPlannerDateInput('analysisDate',date,value=>{ui.analysisDate=value;renderAnalise();});
  document.querySelectorAll('[data-analysis-day]').forEach(button=>button.onclick=()=>{ui.analysisDate=addDays(date,n(button.dataset.analysisDay));renderAnalise();});
  document.getElementById('analysisToday')?.addEventListener('click',()=>{ui.analysisDate=studyDateKey();renderAnalise();});
  document.querySelector('[data-analysis-open-bank]')?.addEventListener('click',()=>{ui.qStatus='Não respondidas';navigateToTab('questoes');});
  document.querySelectorAll('[data-analysis-open-question]').forEach(button=>button.onclick=()=>openQuestionFromAnalysis(button.dataset.analysisOpenQuestion));
  document.querySelectorAll('[data-analysis-open-sim]').forEach(button=>button.onclick=()=>{ui.activeSimRunId=button.dataset.analysisOpenSim;navigateToTab('simulados');});
}
function areaChartData() {
  const todayDow=new Date(`${studyDateKey()}T12:00:00`).getDay();
  const sundayKey=PlannerUX.addDays(studyDateKey(),(-todayDow)+7*(ui.areaChartWeekOffset||0));
  const dates=Array.from({length:7},(_,index)=>PlannerUX.addDays(sundayKey,index));
  const snapshots=dates.map(day=>dailyStudySnapshot(day));
  const moods=dates.map(day=>n(getDayLog(day).mood));
  return {dates,snapshots,moods};
}
function renderAreaCharts() {
  const data=areaChartData();
  const todayKey=studyDateKey();
  const moodLabel=value=>value>=3?'Motivado':value===2?'Mais ou menos':value===1?'Lento':'Sem registro';
  const metrics={
    mood:{label:'Humor',values:data.moods,format:moodLabel},
    hours:{label:'Horas estudadas',values:data.snapshots.map(s=>s.totalMinutes),format:value=>formatDailyStudyTime(value)},
    flashcards:{label:'Flashcards estudados',values:data.snapshots.map(s=>s.flashcards),format:value=>`${Math.round(value)}`},
    videos:{label:'Videoaulas',values:data.snapshots.map(s=>s.videos),format:value=>`${Math.round(value)}`}
  };
  const key=metrics[ui.areaChartMetric]?ui.areaChartMetric:'hours';
  const metric=metrics[key];
  const max=Math.max(1,...metric.values);
  return `<section class="card area-charts-card"><div class="section-title"><div><span class="eyebrow">Semana</span><h2>Gráficos</h2></div><div class="weekly-week-nav"><button class="tiny-btn" data-area-chart-week-nav="-1" aria-label="Semana anterior">&larr;</button><span class="weekly-week-range">${escapeHtml(`${new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit'}).format(new Date(`${data.dates[0]}T12:00:00`))} - ${new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit'}).format(new Date(`${data.dates[6]}T12:00:00`))}`)}</span><button class="tiny-btn" data-area-chart-week-nav="1" aria-label="Próxima semana" ${ui.areaChartWeekOffset>=0?'disabled':''}>&rarr;</button></div></div><label class="area-chart-picker">Gráfico<select class="select" id="areaChartMetric">${Object.entries(metrics).map(([k,item])=>`<option value="${k}" ${k===key?'selected':''}>${item.label}</option>`).join('')}</select></label><div class="dashboard-bars weekly-bars">${data.dates.map((day,index)=>`<div class="${day===todayKey?'is-today':''}"><span style="height:${Math.max(8,Math.round(metric.values[index]/max*100))}%" title="${escapeAttr(metric.format(metric.values[index]))}" data-bar-value="${escapeAttr(metric.format(metric.values[index]))}"></span><small>${new Intl.DateTimeFormat('pt-BR',{weekday:'short'}).format(new Date(`${day}T12:00:00`)).replace('.','')}</small></div>`).join('')}</div></section>`;
}
function renderAreas() {
  const areas=areaStats();
  document.getElementById('areas').innerHTML = `<div class="grid three">${areas.slice(0,3).map(a=>metric(a.area,pct(a.progress),`${a.done} de ${a.total} concluídas`)).join('')}</div><div class="card"><div class="section-title"><h2>Pendências por área</h2></div><div class="table-wrap"><table><thead><tr><th>Área</th><th class="num">Aulas pendentes</th><th class="num">Questões</th><th class="num">Flashcards</th><th class="num">Horas</th></tr></thead><tbody>${areas.map(a=>`<tr><td><strong>${escapeHtml(a.area)}</strong></td><td class="num">${a.total-a.done}</td><td class="num">${Math.round(a.debtQ)}</td><td class="num">${Math.round(a.debtFC)}</td><td class="num">${a.hours.toFixed(1)}</td></tr>`).join('')}</tbody></table></div></div><div class="card"><div class="section-title"><h2>Desempenho por área</h2></div>${areas.map(areaLine).join('')}</div>${renderAreaCharts()}`;
  document.getElementById('areaChartMetric').onchange = event => { ui.areaChartMetric=event.target.value; renderAreas(); };
  document.querySelectorAll('[data-area-chart-week-nav]').forEach(button=>button.onclick=()=>{ ui.areaChartWeekOffset=Math.min(0,(ui.areaChartWeekOffset||0)+Number(button.dataset.areaChartWeekNav)); renderAreas(); });
}
function dailyFlashcardEvents(date) {
  const cards = flashcardAllRecords();
  return (state.flashcardSystem?.reviewLogs || []).filter(log => answerDate(log.reviewedAt) === date).map(log => {
    const card = cards.find(item => item.id === log.cardId);
    return { log, topic: card?.topic || card?.subject || card?.subarea || 'Flashcard' };
  });
}
function dailyVideoEvents(date) {
  return (state.gamification?.xpTransactions || []).filter(t => (t.activity_type === 'video_progress' || t.activity_type === 'video_completion') && answerDate(t.occurred_at) === date);
}
function dailyBlockCompletions(date) {
  return (state.gamification?.xpTransactions || []).filter(t => t.activity_type === 'block_completion' && answerDate(t.occurred_at) === date);
}
function topicForVideoEvent(t) {
  const scheduleId = t.metadata?.scheduleId || t.source_id;
  const item = scheduleId ? state.schedule.find(x => x.id === scheduleId) : null;
  return item ? `Bloco ${item.block}: ${item.topic}` : 'Videoaula';
}
function topicForBlockCompletion(t) {
  const item = state.schedule.find(x => String(x.block) === String(t.source_id));
  return item ? `Bloco ${t.source_id} concluído · ${item.area}` : `Bloco ${t.source_id} concluído`;
}
function buildHistoryRow(date) {
  const storedLog = getDayLog(date);
  const hiddenAt = timestampOf(state.historyHiddenAt?.[date]);
  const afterClear = value => !hiddenAt || timestampOf(value) > hiddenAt;
  const log = hiddenAt && !afterClear(storedLog.updatedAt) ? defaultDayLog(date) : storedLog;
  const qRows = dailyQuestionRows(date).filter(row => afterClear(row.answeredAt));
  const fcEvents = dailyFlashcardEvents(date).filter(event => afterClear(event.log?.reviewedAt));
  const videoEvents = dailyVideoEvents(date).filter(event => afterClear(event.occurred_at));
  const blockEvents = dailyBlockCompletions(date).filter(event => afterClear(event.occurred_at));
  const questionSeconds = qRows.reduce((s,r)=>s+n(r.seconds),0);
  const videoSeconds = videoEvents.filter(t=>t.activity_type==='video_progress').reduce((s,t)=>s+n(t.metadata?.seconds),0);
  const manualMinutes = n(log.lessonMinutes) + n(log.materialMinutes) + n(log.simuladoMinutes) + n(log.flashcardMinutes) + n(log.questionMinutes);
  const minutes = manualMinutes + questionSeconds/60 + videoSeconds/60;
  const topics = new Set();
  qRows.forEach(r => topics.add(r.topic));
  fcEvents.forEach(e => topics.add(e.topic));
  videoEvents.forEach(t => topics.add(topicForVideoEvent(t)));
  blockEvents.forEach(t => topics.add(topicForBlockCompletion(t)));
  if(!topics.size && log.videoNames) topics.add(log.videoNames);
  const videoIds = new Set(videoEvents.map(t => t.metadata?.scheduleId || t.source_id).filter(Boolean));
  const hasAutoQuestions = qRows.length > 0;
  const questions = Math.max(qRows.length, n(log.questions));
  const correct = hasAutoQuestions ? qRows.filter(r => r.correct).length : n(log.correct);
  const wrong = hasAutoQuestions ? qRows.length - qRows.filter(r => r.correct).length : n(log.wrong);
  const flashcards = Math.max(fcEvents.length, n(log.flashcards));
  const videos = Math.max(videoIds.size, n(log.videos));
  return { date, log, topics: [...topics], questions, correct, wrong, flashcards, videos, minutes };
}
function historyRows() {
  ensureDayLogs();
  const hiddenDates = new Set(state.hiddenHistoryDates || []);
  const today = studyDateKey();
  const dates = new Set();
  state.dayLogs.forEach(log => { if(dayLogHasActivity(log)) dates.add(log.date); });
  questionBank.forEach(question => { const result = questionResult(question); const d = result?.answeredAt ? answerDate(result.answeredAt) : ''; if(d) dates.add(d); });
  (state.simuladoRuns || []).forEach(run => { const d = run.finishedAt ? answerDate(run.finishedAt) : ''; if(d) dates.add(d); });
  (state.flashcardSystem?.reviewLogs || []).forEach(log => { const d = answerDate(log.reviewedAt); if(d) dates.add(d); });
  (state.gamification?.xpTransactions || []).forEach(t => { if(['video_progress','video_completion','block_completion'].includes(t.activity_type)) { const d = t.occurred_at ? answerDate(t.occurred_at) : ''; if(d) dates.add(d); } });
  return [...dates].filter(date => date <= today && !hiddenDates.has(date)).map(buildHistoryRow).sort((a,b) => b.date.localeCompare(a.date));
}
function renderRecentActivityCard() {
  const hiddenDates = new Set(state.hiddenHistoryDates || []);
  const transactions=[...(state.gamification?.xpTransactions||[])]
    .filter(item => {
      const timestamp = timestampOf(item.occurred_at);
      const date = answerDate(item.occurred_at);
      const hiddenAt = timestampOf(state.historyHiddenAt?.[date]);
      if(!timestamp || timestamp > Date.now() + 5 * 60 * 1000 || hiddenDates.has(date) || (hiddenAt && timestamp <= hiddenAt)) return false;
      return true;
    })
    .sort((a,b)=>Date.parse(b.occurred_at||'')-Date.parse(a.occurred_at||''))
    .slice(0,5);
  return `<section class="card"><div class="section-title"><div><span class="eyebrow">Ledger de XP</span><h2>Atividade recente</h2></div></div><div class="dashboard-recent-list">${transactions.length?transactions.map(item=>`<div><span>${iconSvg(item.activity_type==='video_progress'||item.activity_type==='video_completion'?'play':item.activity_type==='flashcard_review'?'cards':'brain')}</span><strong>${escapeHtml(gamificationActivityLabel(item))}</strong><time>${new Date(item.occurred_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</time></div>`).join(''):'<div class="muted">Suas próximas atividades aparecerão aqui.</div>'}</div></section>`;
}
function renderHistorico() {
  const rows = historyRows();
  document.getElementById('historico').innerHTML = `<div class="grid cards">${metric('Dias com registro', rows.length, 'dias com alguma atividade')}${metric('Questões respondidas', rows.reduce((s,x)=>s+x.questions,0), `${rows.reduce((s,x)=>s+x.correct,0)} acertos no total`)}${metric('Flashcards revisados', rows.reduce((s,x)=>s+x.flashcards,0), 'cards estudados')}${metric('Vídeoaulas', rows.reduce((s,x)=>s+x.videos,0), 'aulas com progresso registrado')}${metric('Tempo estudado', `${Math.round(rows.reduce((s,x)=>s+x.minutes,0))} min`, 'todas as atividades acumuladas')}</div>${renderRecentActivityCard()}<div class="card"><div class="section-title"><div><h2>Atividades realizadas</h2><span class="muted">${rows.length} dias</span></div><button class="tiny-btn critical" id="clearAllHistoryBtn">🗑 Limpar tudo</button></div>${renderHistoryTable(rows)}</div>`;
  document.querySelectorAll('[data-remove-history]').forEach(button => button.onclick = event => removeHistoryRecord(event.currentTarget.dataset.removeHistory));
  document.getElementById('clearAllHistoryBtn')?.addEventListener('click', clearAllHistory);
}
function removeHistoryRecord(date) {
  const confirmed = confirm(`Excluir o registro de ${fmtDate(date)} do Histórico?\n\nEle deixará de aparecer na lista de atividades. Respostas individuais, flashcards criados e vídeos marcados como assistidos continuarão salvos.`);
  if(!confirmed) return;
  const log = state.dayLogs.find(item => item.date === date);
  if(log) Object.assign(log, defaultDayLog(date));
  hideHistoryDates([date]);
  persist();
  renderHistorico();
}
function clearAllHistory() {
  const confirmed = confirm('⚠️ Deseja apagar TODO o histórico de atividades?\n\nIsso limpará todas as datas registradas. Respostas individuais, flashcards criados e vídeos marcados como assistidos continuarão salvos. Esta ação não pode ser desfeita.\n\nDeseja continuar?');
  if(!confirmed) return;
  const clearedAt = nowIso();
  hideHistoryDates(historyRows().map(row => row.date), clearedAt);
  state.historyClearedAt = clearedAt;
  state.dayLogs = [];
  persist();
  renderHistorico();
}
function renderHistoryTable(rows) {
  if(!rows.length) return '<div class="empty">Ainda não há atividade registrada.</div>';
  return `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Humor</th><th>Aulas e temas</th><th class="num">Vídeos</th><th class="num">Flashcards</th><th class="num">Questões</th><th class="num">Tempo</th><th>Anotações</th><th><span class="sr-only">Excluir</span></th></tr></thead><tbody>${rows.map(({date, log, topics, questions, correct, wrong, flashcards, videos, minutes}) => {
    const topicText = topics.length ? topics.slice(0,4).map(escapeHtml).join('<br>') : '<span class="muted">Sem tema identificado</span>';
    return `<tr><td>${fmtDate(date)}</td><td>${moodLabel(log.mood)}</td><td>${topicText}</td><td class="num">${videos}</td><td class="num">${flashcards}</td><td class="num">${questions}${questions?`<div class="muted">${correct} acertos · ${wrong} erros</div>`:''}</td><td class="num">${Math.round(minutes)} min</td><td>${escapeHtml(log.notes)}</td><td class="history-remove-cell"><button class="history-remove" data-remove-history="${escapeAttr(date)}" title="Excluir registro de ${escapeAttr(fmtDate(date))}" aria-label="Excluir registro de ${escapeAttr(fmtDate(date))}">×</button></td></tr>`;
  }).join('')}</tbody></table></div>`;
}
function renderFeynman() {
  ensureFeynman();
  const review = [...state.feynman].sort((a,b)=>n(a.mastery)-n(b.mastery) || String(a.reviewDate).localeCompare(String(b.reviewDate))).slice(0,6);
  document.getElementById('feynman').innerHTML = `<datalist id="feynmanTopicList">${scheduleTopicOptions().map(x => `<option value="${escapeAttr(x.topic)}">${escapeHtml(`Bloco ${x.block} · ${x.area} · ${x.priority}`)}</option>`).join('')}</datalist><div class="grid two"><div class="card"><div class="section-title"><h2>Revisar primeiro</h2><button class="icon-btn primary" id="addFeynman">+ Tema</button></div>${renderFeynmanReview(review)}</div><div class="card feynman-guide"><div class="section-title"><div><h2>Como usar a técnica Feynman</h2><div class="muted">Use de 5 a 10 minutos por tema.</div></div><span class="badge today">Método ativo</span></div><div class="feynman-guide-steps"><div class="feynman-guide-step"><span>1</span><div><strong>Escolha um tema</strong><p>Comece por uma questão errada, um chute ou um assunto que você não consegue explicar.</p></div></div><div class="feynman-guide-step"><span>2</span><div><strong>Explique sem consultar</strong><p>Escreva como se estivesse ensinando a um colega. Use frases simples e diga o porquê, não apenas a definição.</p></div></div><div class="feynman-guide-step"><span>3</span><div><strong>Marque as lacunas</strong><p>Registre o ponto em que você travou, confundiu condutas ou percebeu que só decorou.</p></div></div><div class="feynman-guide-step"><span>4</span><div><strong>Confira e simplifique</strong><p>Volte à aula, ao comentário ou ao material. Corrija sua explicação com a ideia central e uma armadilha de prova.</p></div></div><div class="feynman-guide-step"><span>5</span><div><strong>Teste novamente</strong><p>Dê uma nota de 0 a 5, escolha a próxima data e refaça uma questão do tema sem olhar a resposta.</p></div></div></div><div class="feynman-guide-tip"><strong>Regra prática:</strong> se você não consegue explicar sem usar “porque é assim”, ainda existe uma lacuna para revisar.</div></div></div><div class="card"><div class="section-title"><h2>Cards Feynman</h2><span class="muted">${state.feynman.length} temas</span></div>${renderFeynmanCards()}</div>`;
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
let prescriptionCatalog = { medications:[], conditions:[] };
let prescriptionCatalogPromise = null;
function prescriptionMedicationCatalog() { return prescriptionCatalog.medications.length ? prescriptionCatalog.medications : PRESCRIPTION_MEDICATIONS.map(name=>({name,className:'',presentation:''})); }
function prescriptionConditionCatalog() {
  const scheduleConditions=(state.schedule||[]).map(item=>({name:item.topic,cid:'',specialty:item.area||''}));
  const builtIn=PRESCRIPTION_THEMES.map(name=>({name,cid:'',specialty:''}));
  const merged=[...prescriptionCatalog.conditions,...scheduleConditions,...builtIn];
  const unique=new Map();
  merged.forEach(item=>{const key=normalizedTopic(item.name);if(key&&!unique.has(key))unique.set(key,item);});
  return [...unique.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}
function loadPrescriptionCatalog() {
  if(prescriptionCatalogPromise) return prescriptionCatalogPromise;
  prescriptionCatalogPromise=fetch('data/prescription_catalog.json',{cache:'no-store'}).then(response=>response.ok?response.json():null).then(data=>{
    if(data) prescriptionCatalog={medications:Array.isArray(data.medications)?data.medications:[],conditions:Array.isArray(data.conditions)?data.conditions:[]};
    if(ui.tab==='prescricao') renderPrescription();
    return prescriptionCatalog;
  }).catch(error=>{ console.warn('Catálogo de prescrição indisponível:',error); return prescriptionCatalog; });
  return prescriptionCatalogPromise;
}
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
  const tab=ui.prescriptionTab||'prescricao';
  const nav=`<div class="rx-subnav"><button class="rx-subnav-btn${tab==='prescricao'?' active':''}" data-rx-tab="prescricao">Prescrição</button><button class="rx-subnav-btn${tab==='metodos'?' active':''}" data-rx-tab="metodos">Métodos clínicos</button></div>`;
  if(tab==='metodos') {
    mount.innerHTML=`${nav}<div id="prescricaoMetodos"></div>`;
    document.querySelectorAll('[data-rx-tab]').forEach(button=>button.onclick=()=>{ui.prescriptionTab=button.dataset.rxTab;renderPrescription();});
    const host=document.getElementById('prescricaoMetodos');
    if(!window.ConsultaClinica) { host.innerHTML=`<section class="card"><p class="muted">Carregando módulo de métodos clínicos…</p></section>`; return; }
    if(!state.consulta) state.consulta=window.ConsultaClinica.defaultState();
    window.ConsultaClinica.mount(host, { getState:()=>state, save:()=>{ try{ writeLocalState(); }catch(e){} scheduleCloudSave(); }, escapeHtml, iconSvg });
    return;
  }
  mount.innerHTML=nav+'<div id="prescricaoSheet"></div>';
  const sheet=document.getElementById('prescricaoSheet');
  if(ui.prescriptionScreen==='new') sheet.innerHTML=renderPrescriptionNew();
  else if(prescriptionCase()) sheet.innerHTML=renderPrescriptionWorkspace(prescriptionCase());
  else sheet.innerHTML=renderPrescriptionHome();
  document.querySelectorAll('[data-rx-tab]').forEach(button=>button.onclick=()=>{ui.prescriptionTab=button.dataset.rxTab;renderPrescription();});
  bindPrescriptionEvents();
}
function renderPrescriptionHome() {
  const cases=[...prescriptionLab().cases].sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const complete=cases.filter(item=>item.status==='complete');
  const avg=complete.length?Math.round(complete.reduce((sum,item)=>sum+n(item.review?.overall),0)/complete.length):0;
  return `${prescriptionSafetyBanner()}<div class="rx-home-head"><div><span class="eyebrow">Laboratório clínico</span><h1>Simulador de Prescrição</h1><p class="muted">Treine a estrutura, a clareza e o raciocínio de prescrições em pacientes fictícios.</p></div><button class="icon-btn primary" id="rxNewCase">+ Novo caso</button></div><div class="grid cards rx-metrics">${metric('Casos salvos',cases.length,'armazenados no planner')}${metric('Finalizados',complete.length,'com revisão estrutural')}${metric('Média',`${avg}%`,'tentativas finalizadas')}</div><div class="card"><div class="section-title"><h2>Casos recentes</h2><span class="badge today">${cases.length}</span></div><div class="rx-case-list">${cases.map(item=>`<article class="rx-case-row"><button data-rx-open="${item.id}"><strong>${escapeHtml(item.theme||item.initialProblem||'Caso sem título')}</strong><span>${escapeHtml(item.patient?.name||'Paciente simulado')} · ${fmtDate(String(item.createdAt).slice(0,10))}</span></button><span class="badge ${item.status==='complete'?'done':'wait'}">${item.status==='complete'?'finalizado':'incompleto'}</span><button class="tiny-btn" data-rx-delete="${item.id}" title="Excluir caso">×</button></article>`).join('')||'<div class="empty">Nenhum caso criado. Comece por um tema clínico que deseja treinar.</div>'}</div></div>`;
}
function renderPrescriptionNew() {
  const conditions=prescriptionConditionCatalog();
  return `${prescriptionSafetyBanner()}<div class="card rx-new"><div class="section-title"><div><h1>Novo caso simulado</h1><div class="muted">Comece pelo problema; a hipótese pode permanecer aberta.</div></div><button class="icon-btn" id="rxCancelNew">Voltar</button></div><div class="rx-new-grid"><section><h2>1. Situação clínica</h2><label>Tema ou condição<input class="input" id="rxTheme" list="rxConditionList" placeholder="Pesquise uma doença ou condição"></label><datalist id="rxConditionList">${conditions.map(x=>`<option value="${escapeAttr(x.name)}">${escapeHtml([x.cid,x.specialty].filter(Boolean).join(' · '))}</option>`).join('')}</datalist><label>Problema clínico inicial<textarea class="textarea" id="rxProblem" placeholder="Ex.: febre, tosse e dispneia"></textarea></label><label>Hipótese diagnóstica<input class="input" id="rxDiagnosis" list="rxConditionList" placeholder="Pode ficar em aberto"></label><div class="field-row"><label>Cenário<select class="select" id="rxSetting"><option>Ambulatório</option><option>Emergência</option><option>Internação</option></select></label><label>Modo<select class="select" id="rxMode"><option value="free">Livre</option><option value="challenge">Desafio</option></select></label><label>Faixa<select class="select" id="rxPopulation"><option value="adulto">Adulto</option><option value="pediatrico">Pediátrico</option><option value="idoso">Idoso</option></select></label></div></section><section><div class="section-title"><h2>2. Paciente fictício</h2><button class="tiny-btn" id="rxGeneratePatient">Gerar paciente</button></div><div class="field-row"><label>Identificação fictícia<input class="input" id="rxPatientName" placeholder="Paciente simulado"></label><label>Sexo<select class="select" id="rxPatientSex"><option>Qualquer</option><option>Masculino</option><option>Feminino</option></select></label><label>Idade<input class="input" id="rxPatientAge" type="number" min="0" max="120"></label></div><div class="field-row"><label>Peso (kg)<input class="input" id="rxPatientWeight" type="number" min="0" step="0.1"></label><label>Alergias<input class="input" id="rxPatientAllergies" placeholder="Nenhuma conhecida"></label><label>Função renal<input class="input" id="rxPatientRenal" placeholder="Sem alteração conhecida"></label></div><details><summary>Dados avançados</summary><div class="field-row"><label>Gestação<input class="input" id="rxPatientPregnancy"></label><label>Comorbidades<input class="input" id="rxPatientComorbidities"></label><label>Função hepática<input class="input" id="rxPatientLiver"></label></div></details></section></div><button class="icon-btn primary rx-create" id="rxCreateCase">Criar folha de prescrição</button></div>`;
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
function prescriptionMedicationMatch(value='') {
  const key=normalizedTopic(value);
  return key ? prescriptionMedicationCatalog().find(item=>normalizedTopic(item.name)===key) || null : null;
}
function renderPrescriptionMedicationReference(value='',entryId='') {
  const medication=prescriptionMedicationMatch(value);
  if(!medication) return '<span class="muted">Selecione um medicamento da lista para ver apresentação e referências de uso.</span>';
  const details=[medication.className,medication.presentation].filter(Boolean).map(escapeHtml).join(' · ');
  const examples=Array.isArray(medication.posologyExamples)?medication.posologyExamples:[];
  return `<div class="rx-medication-reference-head"><strong>${escapeHtml(medication.name)}</strong><span>${details||'Catálogo auxiliar'}</span></div>${examples.length?`<div class="rx-posology-examples">${examples.map((example,index)=>`<div><span><strong>${escapeHtml(example.label)}</strong><small>${escapeHtml(example.instructions)}</small></span><button type="button" class="tiny-btn" data-rx-posology-example="${escapeAttr(entryId)}" data-example-index="${index}">Usar se vazio</button></div>`).join('')}</div>`:'<span class="muted">Sem exemplo de posologia neste arquivo. Preencha livremente.</span>'}`;
}
function renderPrescriptionItem(entry,index) {
  const common=`<label>Instruções<textarea class="textarea" data-rx-item="${entry.id}" data-field="instructions">${escapeHtml(entry.instructions||'')}</textarea></label><label>Justificativa<input class="input" data-rx-item="${entry.id}" data-field="justification" value="${escapeAttr(entry.justification||'')}"></label>`;
  let fields='';
  if(entry.type==='medication') fields=`<div class="rx-item-grid"><label>Medicamento<input class="input" list="rxMedicationList" data-rx-item="${entry.id}" data-rx-medication-input="${entry.id}" data-field="name" value="${escapeAttr(entry.name||'')}"></label><label>Apresentação<input class="input" data-rx-item="${entry.id}" data-rx-medication-presentation="${entry.id}" data-field="presentation" value="${escapeAttr(entry.presentation||'')}"></label><label>Dose<input class="input" data-rx-item="${entry.id}" data-field="dose" value="${escapeAttr(entry.dose||'')}"></label><label>Unidade<input class="input" data-rx-item="${entry.id}" data-field="unit" value="${escapeAttr(entry.unit||'')}"></label><label>Via<input class="input" list="rxRouteList" data-rx-item="${entry.id}" data-field="route" value="${escapeAttr(entry.route||'')}"></label><label>Frequência<input class="input" data-rx-item="${entry.id}" data-field="frequency" value="${escapeAttr(entry.frequency||'')}"></label><label>Duração<input class="input" data-rx-item="${entry.id}" data-field="duration" value="${escapeAttr(entry.duration||'')}"></label><label>Diluição<input class="input" data-rx-item="${entry.id}" data-field="dilution" value="${escapeAttr(entry.dilution||'')}"></label><label>Tempo de infusão<input class="input" data-rx-item="${entry.id}" data-field="infusion" value="${escapeAttr(entry.infusion||'')}"></label></div><div class="rx-medication-reference" data-rx-medication-help="${entry.id}">${renderPrescriptionMedicationReference(entry.name,entry.id)}</div>${common}`;
  else if(entry.type==='exam') fields=`<div class="rx-item-grid"><label>Exame<input class="input" list="rxExamList" data-rx-item="${entry.id}" data-field="name" value="${escapeAttr(entry.name||'')}"></label><label>Região ou material<input class="input" data-rx-item="${entry.id}" data-field="region" value="${escapeAttr(entry.region||'')}"></label><label>Incidências ou técnica<input class="input" data-rx-item="${entry.id}" data-field="technique" placeholder="Ex.: posteroanterior e perfil" value="${escapeAttr(entry.technique||'')}"></label></div><label>Indicação clínica<textarea class="textarea" data-rx-item="${entry.id}" data-field="indication">${escapeHtml(entry.indication||'')}</textarea></label>${common}`;
  else fields=`<div class="rx-item-grid"><label>${prescriptionTypeLabel(entry.type)}<input class="input" data-rx-item="${entry.id}" data-field="name" value="${escapeAttr(entry.name||'')}"></label><label>Frequência<input class="input" data-rx-item="${entry.id}" data-field="frequency" value="${escapeAttr(entry.frequency||'')}"></label></div>${common}`;
  return `<article class="rx-item"><div class="rx-item-head"><span>${index+1}</span><strong>${prescriptionTypeLabel(entry.type)}</strong><div><button class="tiny-btn" data-rx-save-model="${entry.id}">Salvar modelo</button><button class="tiny-btn" data-rx-remove-item="${entry.id}" title="Remover item">×</button></div></div>${fields}</article>`;
}
function renderPrescriptionTools(item) {
  const library=prescriptionLab().library;
  const models=[...library.medications,...library.exams,...library.others];
  const medications=prescriptionMedicationCatalog();
  return `<h2>Adicionar</h2><div class="rx-add-list">${[['medication','Medicamento'],['exam','Exame'],['procedure','Procedimento'],['monitoring','Monitorização'],['orientation','Orientação'],['diet','Dieta'],['note','Anotação livre']].map(([type,label])=>`<button data-rx-add="${type}">+ ${label}</button>`).join('')}</div><datalist id="rxMedicationList">${medications.map(x=>`<option value="${escapeAttr(x.name)}">${escapeHtml([x.className,x.presentation].filter(Boolean).join(' · '))}</option>`).join('')}</datalist><datalist id="rxExamList">${PRESCRIPTION_EXAMS.map(x=>`<option value="${escapeAttr(x)}">`).join('')}</datalist><datalist id="rxRouteList"><option value="VO"><option value="IV"><option value="IM"><option value="SC"><option value="Inalatória"><option value="Tópica"></datalist><div class="rx-catalog-note"><strong>Catálogo disponível</strong><span>${medications.length} medicamentos · pesquise pelo nome genérico, classe ou apresentação.</span></div><div class="rx-library"><div class="section-title"><h3>Biblioteca pessoal</h3><span>${models.length}</span></div>${models.map(model=>`<div><button data-rx-use-model="${model.id}"><strong>${escapeHtml(model.name||prescriptionTypeLabel(model.type))}</strong><small>${prescriptionTypeLabel(model.type)}</small></button><button data-rx-delete-model="${model.id}">×</button></div>`).join('')||'<p class="muted">Salve itens que deseja reutilizar.</p>'}</div><div class="rx-tool-note"><strong>Checagem responsável</strong><p>A revisão avalia preenchimento e alertas simples. Não verifica interação, dose correta ou adequação terapêutica.</p></div>`;
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
  const bindPosologyExamples=()=>document.querySelectorAll('[data-rx-posology-example]').forEach(button=>button.onclick=()=>{
    const entry=item.items.find(x=>x.id===button.dataset.rxPosologyExample); if(!entry) return;
    const medication=prescriptionMedicationMatch(entry.name);
    const example=medication?.posologyExamples?.[n(button.dataset.exampleIndex)]; if(!example) return;
    if(String(entry.instructions||'').trim()) { alert('Sua descrição foi mantida. Apague as instruções atuais para usar esta referência.'); return; }
    entry.instructions=example.instructions;
    if(!entry.presentation) entry.presentation=medication.presentation||'';
    touch(); renderPrescription();
  });
  document.querySelectorAll('[data-rx-medication-input]').forEach(el=>el.oninput=()=>{
    const entry=item.items.find(x=>x.id===el.dataset.rxItem); if(!entry) return;
    entry.name=el.value;
    const match=prescriptionMedicationCatalog().find(m=>normalizedTopic(m.name)===normalizedTopic(el.value));
    if(match && !entry.presentation) entry.presentation=match.presentation;
    touch();
    const presentation=document.querySelector(`[data-rx-medication-presentation="${CSS.escape(entry.id)}"]`);
    if(presentation && match && !presentation.value) presentation.value=match.presentation;
    const help=document.querySelector(`[data-rx-medication-help="${CSS.escape(entry.id)}"]`);
    if(help) { help.innerHTML=renderPrescriptionMedicationReference(el.value,entry.id); bindPosologyExamples(); }
  });
  bindPosologyExamples();
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
function especialidadesGroups(docs) {
  const map = new Map();
  docs.forEach(doc => {
    const key = `${doc.area}||${doc.topic}`;
    if(!map.has(key)) map.set(key, { key, specialty:doc.area, topic:doc.topic || 'Outros', documents:[] });
    map.get(key).documents.push(doc);
  });
  return [...map.values()].map(group => ({...group,documents:group.documents.sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'))})).sort((a,b)=>a.topic.localeCompare(b.topic,'pt-BR'));
}
function materialSearchHaystack(doc) {
  if(doc.__haystack === undefined) {
    const headings = (doc.headings||[]).map(item => item.text).join(' ');
    doc.__haystack = `${normalizedTopic(doc.title)} ${normalizedTopic(doc.area)} ${normalizedTopic(doc.topic)} ${normalizedTopic(headings)} ${doc.searchText||''}`;
  }
  return doc.__haystack;
}
function searchMaterialLibrary(query) {
  const q = normalizedTopic(query);
  if(!q) return [];
  const terms = q.split(' ').filter(Boolean);
  if(!terms.length) return [];
  const matches = materialLibrary.filter(doc => { const hay=materialSearchHaystack(doc); return terms.every(term => hay.includes(term)); });
  matches.sort((a,b) => {
    const at=normalizedTopic(a.title), bt=normalizedTopic(b.title);
    const aStarts=at.startsWith(q)?0:1, bStarts=bt.startsWith(q)?0:1;
    if(aStarts!==bStarts) return aStarts-bStarts;
    const aHit=at.includes(q)?0:1, bHit=bt.includes(q)?0:1;
    if(aHit!==bHit) return aHit-bHit;
    return at.length-bt.length;
  });
  return matches.slice(0,30);
}
function renderMaterialGlobalSearchResults(matches, query) {
  const box=document.getElementById('materialGlobalSearchResults');
  if(!box) return;
  if(!String(query||'').trim()) { box.hidden=true; box.innerHTML=''; return; }
  box.hidden=false;
  box.innerHTML = matches.length
    ? matches.map(doc => `<button type="button" class="materials-global-search-item" data-global-search-doc="${doc.id}"><strong>${escapeHtml(doc.title)}</strong><span>${doc.category==='especialidade'?'Especialidades':'Apostila'} · ${escapeHtml(doc.area||'')}${doc.topic?` · ${escapeHtml(doc.topic)}`:''}</span></button>`).join('')
    : `<div class="materials-global-search-empty">Nenhum resultado para "${escapeHtml(query)}"</div>`;
  box.querySelectorAll('[data-global-search-doc]').forEach(button => button.onclick = () => openMaterialDocGlobal(button.dataset.globalSearchDoc));
}
function lastReadMaterialMeta() {
  return Object.entries(state.materials||{}).map(([docId,meta])=>({docId,meta:meta||{}}))
    .filter(item=>item.meta.lastReadAt)
    .sort((a,b)=>timestampOf(b.meta.lastReadAt)-timestampOf(a.meta.lastReadAt))[0] || null;
}
function prepareMaterialDocOpen(doc, restore=true) {
  if(!doc) return;
  ui.materialDocId=doc.id;
  ui.materialSearch='';
  ui.materialFocusMode=false;
  ui.materialEditMode=false;
  ui.materialScheduleId=doc.scheduleId||'';
  if(doc.category==='especialidade') {
    ui.materialsSection='especialidades';
    ui.materialSpecialty=doc.area||'Todos';
  } else {
    ui.materialsSection='apostila';
    ui.materialBlock=doc.block?String(doc.block):'Todos';
  }
  materialReadingRestoreDocId=restore?doc.id:'';
}
function renderLastReadMaterialCard(currentDocId='') {
  const last=lastReadMaterialMeta();
  if(!last || last.docId===currentDocId) return '';
  const meta=last.meta;
  return `<aside class="material-resume-card"><span class="material-resume-icon">${iconSvg('materials')}</span><div><span class="eyebrow">Sua última leitura</span><strong>${escapeHtml(meta.lastTitle||'Material de estudo')}</strong><small>${meta.lastHeadingText?`Você parou em: ${escapeHtml(meta.lastHeadingText)}`:'Retome de onde parou'}</small></div><button type="button" class="icon-btn primary" data-material-resume="${escapeAttr(last.docId)}">Continuar leitura ${iconSvg('next')}</button></aside>`;
}
function openMaterialDocGlobal(docId) {
  const doc = materialLibrary.find(item => item.id === docId);
  if(!doc) return;
  ui.materialGlobalSearch='';
  prepareMaterialDocOpen(doc,true);
  stopAutoStudy('material');
  renderMateriais();
}
function renderEspecialidadeFolder(group, selectedId) {
  const open = group.documents.some(doc => doc.id === selectedId) || Boolean(ui.materialSearch);
  return `<details class="material-folder" data-material-folder ${open?'open':''}><summary><span>${escapeHtml(group.topic)}</span><span class="folder-count">${group.documents.length}</span></summary><div class="folder-options">${group.documents.map(doc => `<button class="material-choice ${doc.id===selectedId?'active':''}" data-material-doc="${doc.id}"><strong>${escapeHtml(doc.title)}</strong><span class="topic-source">${n(doc.imageCount) ? `${n(doc.imageCount)} figura${n(doc.imageCount)===1?'':'s'}` : 'Somente texto'}</span></button>`).join('')}</div></details>`;
}
function renderMateriais() {
  if(materialReadingCleanup) { materialReadingCleanup(); materialReadingCleanup=null; }
  const section = ui.materialsSection === 'especialidades' ? 'especialidades' : 'apostila';
  const baseDocs = materialLibrary.filter(doc => doc.category !== 'especialidade');
  const specialtyDocs = materialLibrary.filter(doc => doc.category === 'especialidade');
  const figures = materialLibrary.reduce((sum,doc)=>sum+n(doc.imageCount),0);
  const sectionTabs = `<div class="materials-section-tabs" role="tablist" aria-label="Coleções de materiais"><button class="materials-section-tab ${section==='apostila'?'active':''}" data-materials-section="apostila" role="tab" aria-selected="${section==='apostila'}"><span class="materials-tab-dot"></span><span><strong>Apostila</strong><small>${baseDocs.length} resumos por bloco</small></span></button><button class="materials-section-tab ${section==='especialidades'?'active':''}" data-materials-section="especialidades" role="tab" aria-selected="${section==='especialidades'}"><span class="materials-tab-dot"></span><span><strong>Especialidades</strong><small>${specialtyDocs.length} artigos clínicos</small></span></button></div>`;
  let filtersHtml = '', sidebar = '', reader = '', layoutOpen = false, selected = null;
  if(section === 'apostila') {
    const allGroups = materialLibraryGroups(baseDocs);
    const blocks = [...new Set(baseDocs.map(doc => String(doc.block)).filter(block => block && block !== '999'))].sort((a,b)=>n(a)-n(b));
    layoutOpen = ui.materialBlock !== 'Todos';
    const groups = layoutOpen ? allGroups.filter(group => String(group.block) === String(ui.materialBlock)) : [];
    selected = baseDocs.find(doc => doc.id === ui.materialDocId && layoutOpen && String(doc.block) === String(ui.materialBlock)) || null;
    const blockOptions = blocks.map(block => {
      const docs=baseDocs.filter(doc=>String(doc.block)===block);
      const lessons=new Set(docs.map(doc=>doc.scheduleId).filter(Boolean)).size;
      return `<option value="${escapeAttr(block)}" ${String(ui.materialBlock)===block?'selected':''}>Bloco ${String(block).padStart(2,'0')} · ${lessons} aulas · ${docs.length} materiais</option>`;
    }).join('');
    filtersHtml = `<label class="materials-filter"><span>Bloco</span><select class="select" id="materialBlockSelect"><option value="Todos">Todos os blocos</option>${blockOptions}</select></label><span class="muted materials-count">${baseDocs.length} resumos · ${figures} figuras</span>`;
    sidebar = layoutOpen ? `<aside class="card library-sidebar"><div class="section-title"><div><span class="eyebrow">Assuntos do bloco</span><h2>Bloco ${String(ui.materialBlock).padStart(2,'0')}</h2></div><span class="badge today">${groups.length}</span></div><label class="search-field"><span aria-hidden="true">⌕</span><input class="input" id="materialSearch" value="${escapeAttr(ui.materialSearch)}" placeholder="Buscar assunto neste bloco"></label><div class="library-folders">${groups.map(group => renderMaterialFolder(group, selected?.id)).join('') || '<div class="empty">Nenhum material disponível neste bloco.</div>'}</div></aside>` : '';
    const blockCards = blocks.map(block => {
      const docs=baseDocs.filter(doc=>String(doc.block)===block);
      const topics=new Set(docs.map(doc=>doc.scheduleId).filter(Boolean)).size;
      const imageCount=docs.reduce((sum,doc)=>sum+n(doc.imageCount),0);
      return `<button type="button" class="materials-collection-card" data-material-block="${escapeAttr(block)}"><span class="materials-card-index">${String(block).padStart(2,'0')}</span><span class="materials-card-copy"><strong>Bloco ${String(block).padStart(2,'0')}</strong><small>${topics} assunto${topics===1?'':'s'} · ${docs.length} resumo${docs.length===1?'':'s'}</small></span><span class="materials-card-meta">${imageCount?`${imageCount} figuras`:'Texto'} <b>→</b></span></button>`;
    }).join('');
    reader = layoutOpen ? renderMaterialReader(selected) : `<div class="materials-welcome"><div class="materials-welcome-head"><div><span class="eyebrow">Navegue pela trilha</span><h2>Escolha o próximo bloco</h2><p>Conteúdo organizado na mesma sequência do seu cronograma.</p></div><span class="materials-welcome-count">${blocks.length}<small>blocos</small></span></div><div class="materials-collection-grid">${blockCards}</div></div>`;
  } else {
    const specialties = [...new Set(specialtyDocs.map(doc=>doc.area))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    layoutOpen = ui.materialSpecialty !== 'Todos';
    const allGroups = especialidadesGroups(specialtyDocs);
    const groups = layoutOpen ? allGroups.filter(group => group.specialty === ui.materialSpecialty) : [];
    selected = specialtyDocs.find(doc => doc.id === ui.materialDocId && layoutOpen && doc.area === ui.materialSpecialty) || null;
    const specialtyOptions = specialties.map(spec => {
      const docs = specialtyDocs.filter(doc=>doc.area===spec);
      const subs = new Set(docs.map(doc=>doc.topic)).size;
      return `<option value="${escapeAttr(spec)}" ${ui.materialSpecialty===spec?'selected':''}>${escapeHtml(spec)} · ${subs} temas · ${docs.length} artigos</option>`;
    }).join('');
    filtersHtml = `<label class="materials-filter"><span>Especialidade</span><select class="select" id="materialSpecialtySelect"><option value="Todos">Todas as especialidades</option>${specialtyOptions}</select></label><span class="muted materials-count">${specialtyDocs.length} artigos · ${specialties.length} especialidades</span>`;
    sidebar = layoutOpen ? `<aside class="card library-sidebar"><div class="section-title"><div><span class="eyebrow">Temas · ${escapeHtml(ui.materialSpecialty)}</span><h2>${escapeHtml(ui.materialSpecialty)}</h2></div><span class="badge today">${groups.length}</span></div><label class="search-field"><span aria-hidden="true">⌕</span><input class="input" id="materialSearch" value="${escapeAttr(ui.materialSearch)}" placeholder="Buscar tema ou artigo"></label><div class="library-folders">${groups.map(group => renderEspecialidadeFolder(group, selected?.id)).join('') || '<div class="empty">Nenhum artigo disponível.</div>'}</div></aside>` : '';
    const specialtyCards = specialties.map((spec,index) => {
      const docs=specialtyDocs.filter(doc=>doc.area===spec);
      const topics=new Set(docs.map(doc=>doc.topic).filter(Boolean)).size;
      return `<button type="button" class="materials-collection-card specialty" data-material-specialty="${escapeAttr(spec)}"><span class="materials-card-index">${String(index+1).padStart(2,'0')}</span><span class="materials-card-copy"><strong>${escapeHtml(spec)}</strong><small>${topics} tema${topics===1?'':'s'} · ${docs.length} artigo${docs.length===1?'':'s'}</small></span><span class="materials-card-meta">Explorar <b>→</b></span></button>`;
    }).join('');
    reader = layoutOpen ? renderMaterialReader(selected) : `<div class="materials-welcome"><div class="materials-welcome-head"><div><span class="eyebrow">Biblioteca clínica</span><h2>Explore por especialidade</h2><p>Encontre referências rápidas por área e tema.</p></div><span class="materials-welcome-count">${specialties.length}<small>áreas</small></span></div><div class="materials-collection-grid">${specialtyCards}</div></div>`;
  }
  const globalSearchBar = `<div class="materials-global-search search-field" id="materialGlobalSearchWrap"><span aria-hidden="true">⌕</span><input class="input" id="materialGlobalSearch" type="search" autocomplete="off" placeholder="Pesquisar tema, assunto ou termo em todos os materiais" value="${escapeAttr(ui.materialGlobalSearch)}"><button type="button" class="materials-global-search-clear" id="materialGlobalSearchClear" aria-label="Limpar pesquisa" ${ui.materialGlobalSearch?'':'hidden'}>×</button><div class="materials-global-search-results" id="materialGlobalSearchResults" hidden></div></div>`;
  const totalTopics = new Set(materialLibrary.map(doc=>`${doc.area||''}|${doc.topic||doc.scheduleId||doc.title}`)).size;
  document.getElementById('materiais').innerHTML = `<div class="materials-shell ${ui.materialFocusMode?'material-focus-mode':''}"><header class="materials-topbar"><div class="materials-hero-main"><div class="materials-breadcrumb"><span>Biblioteca</span><b>•</b> Conteúdo para revisão</div><div class="materials-title-row"><span class="materials-icon">${iconSvg('materials')}</span><div><span class="eyebrow">Central de materiais</span><h1>Estude com tudo no lugar.</h1><p>Resumos e referências organizados para você encontrar, revisar e avançar sem perder tempo.</p></div></div>${globalSearchBar}</div><div class="materials-hero-stats"><div><strong>${materialLibrary.length}</strong><span>materiais</span></div><div><strong>${totalTopics}</strong><span>temas</span></div><div><strong>${figures}</strong><span>figuras</span></div></div><div class="materials-hero-controls">${sectionTabs}<div class="materials-filters">${filtersHtml}</div></div></header>${renderLastReadMaterialCard(selected?.id||'')}<div class="library-layout ${layoutOpen?'':'materials-block-only'}">${sidebar}<section class="card material-reader">${reader}</section></div></div>`;
  const globalSearchInput = document.getElementById('materialGlobalSearch');
  const globalSearchClear = document.getElementById('materialGlobalSearchClear');
  if(globalSearchInput) {
    globalSearchInput.oninput = e => {
      ui.materialGlobalSearch = e.target.value;
      if(globalSearchClear) globalSearchClear.hidden = !ui.materialGlobalSearch;
      clearTimeout(materialGlobalSearchTimer);
      materialGlobalSearchTimer = setTimeout(() => renderMaterialGlobalSearchResults(searchMaterialLibrary(ui.materialGlobalSearch), ui.materialGlobalSearch), 120);
    };
    globalSearchInput.onfocus = () => { if(ui.materialGlobalSearch) renderMaterialGlobalSearchResults(searchMaterialLibrary(ui.materialGlobalSearch), ui.materialGlobalSearch); };
    globalSearchInput.onkeydown = e => {
      if(e.key !== 'Escape') return;
      ui.materialGlobalSearch='';
      e.target.value='';
      if(globalSearchClear) globalSearchClear.hidden=true;
      renderMaterialGlobalSearchResults([],'');
    };
  }
  if(globalSearchClear) globalSearchClear.onclick = () => {
    ui.materialGlobalSearch='';
    if(globalSearchInput) { globalSearchInput.value=''; globalSearchInput.focus(); }
    globalSearchClear.hidden=true;
    renderMaterialGlobalSearchResults([],'');
  };
  if(ui.materialGlobalSearch) renderMaterialGlobalSearchResults(searchMaterialLibrary(ui.materialGlobalSearch), ui.materialGlobalSearch);
  document.querySelectorAll('[data-materials-section]').forEach(button => button.onclick = () => {
    ui.materialsSection = button.dataset.materialsSection;
    ui.materialDocId='';
    ui.materialSearch='';
    ui.materialFocusMode=false;
    stopAutoStudy('material');
    renderMateriais();
  });
  document.getElementById('materialBlockSelect')?.addEventListener('change', e => {
    ui.materialBlock=e.target.value;
    ui.materialScheduleId='';
    ui.materialDocId='';
    ui.materialSearch='';
    ui.materialFocusMode=false;
    stopAutoStudy('material');
    renderMateriais();
  });
  document.getElementById('materialSpecialtySelect')?.addEventListener('change', e => {
    ui.materialSpecialty=e.target.value;
    ui.materialDocId='';
    ui.materialSearch='';
    ui.materialFocusMode=false;
    stopAutoStudy('material');
    renderMateriais();
  });
  document.querySelectorAll('.materials-collection-card[data-material-block]').forEach(button => button.onclick = () => {
    ui.materialBlock=button.dataset.materialBlock;
    ui.materialScheduleId='';
    ui.materialDocId='';
    ui.materialSearch='';
    renderMateriais();
  });
  document.querySelectorAll('[data-material-specialty]').forEach(button => button.onclick = () => {
    ui.materialSpecialty=button.dataset.materialSpecialty;
    ui.materialDocId='';
    ui.materialSearch='';
    renderMateriais();
  });
  const search = document.getElementById('materialSearch');
  if(search) search.oninput = e => { ui.materialSearch=e.target.value; applyMaterialSearch(e.target.value); };
  document.querySelectorAll('[data-material-doc]').forEach(button => button.onclick = e => { const doc=materialLibrary.find(item=>item.id===e.currentTarget.dataset.materialDoc); prepareMaterialDocOpen(doc,true); stopAutoStudy('material'); renderMateriais(); });
  document.querySelector('[data-material-resume]')?.addEventListener('click',event=>openMaterialDocGlobal(event.currentTarget.dataset.materialResume));
  bindMaterialReader(selected);
  if(selected && ui.materialFocusMode) {
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
function materialLibraryGroups(docs=materialLibrary) {
  const map = new Map();
  docs.forEach(doc => {
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
function materialReadingHeadings(markdown) {
  return String(markdown||'').split(/\r?\n/).map((line,index)=>{
    const match=line.trim().match(/^(#{2,4})\s+(.+)$/);
    if(!match) return null;
    const text=match[2].trim();
    return {text,level:match[1].length,id:materialHeadingId(text,index)};
  }).filter(Boolean);
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
  const tocItems = materialReadingHeadings(markdown || '');
  const markdownHtml = doc.markdown
    ? (markdown === undefined ? '<div class="empty">Carregando texto do resumo...</div>' : ui.materialEditMode ? renderMaterialEditor(doc, markdown) : `<article class="material-markdown material-reading-mode">${renderMaterialMarkdown(markdown, doc)}</article>`)
    : '<div class="empty">Texto estruturado ainda não gerado para este material.</div>';
  const meta = materialEditMeta(doc.id);
  return `<div class="reader-head"><div><span class="eyebrow">${doc.block?`Bloco ${String(doc.block).padStart(2,'0')}`:'Material complementar'} · ${escapeHtml(doc.area || 'Revisão')}</span><h2>${escapeHtml(doc.title)}</h2><div class="muted">Vinculado a ${escapeHtml(doc.topic || 'conteúdo complementar')}</div></div><span class="badge ${meta.edited?'wait':'done'}">${meta.edited?'Editado neste computador':n(doc.imageCount)?`${n(doc.imageCount)} figura${n(doc.imageCount)===1?'':'s'}`:'Texto limpo'}</span></div><div class="material-reader-toolbar"><div><button class="icon-btn primary" id="materialEditToggle">${ui.materialEditMode?'Concluir edição':'Editar Markdown'}</button><button class="icon-btn" id="materialFocusToggle" aria-pressed="${ui.materialFocusMode}">${ui.materialFocusMode?'Sair do foco':'Foco'}</button><button class="icon-btn" id="materialExportMarkdown">Exportar .md</button>${meta.edited?'<button class="icon-btn" id="materialRestoreOriginal">Restaurar original</button>':''}</div><div class="material-highlight-toolbar"><span class="muted">Selecione um trecho para destacar.</span><button class="tiny-btn" id="clearMaterialHighlights">Limpar todos</button></div></div>${!ui.materialEditMode && tocItems.length?`<nav class="reader-toc" aria-label="Seções do resumo">${tocItems.map(item=>`<button class="tiny-btn" data-material-heading="${item.id}" aria-current="false">${escapeHtml(item.text)}</button>`).join('')}</nav>`:''}${markdownHtml}`;
}
async function loadMaterialMarkdown(doc) {
  if(!doc?.markdown || materialMarkdownCache[doc.id] !== undefined) return;
  materialMarkdownCache[doc.id] = undefined;
  try {
    const response = await fetch(`materials_library/${doc.markdown}`, {cache:'no-store'});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    materialMarkdownCache[doc.id] = await response.text();
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
function rememberMaterialReading(doc,heading,scrollRatio,force=false) {
  if(!doc) return;
  const meta=materialEditMeta(doc.id);
  const headingId=heading?.id||heading?.dataset?.materialHeadingAnchor||'';
  const headingText=heading?.text||heading?.dataset?.materialHeadingText||'';
  const headingChanged=Boolean(headingId && headingId!==meta.lastHeadingId);
  meta.lastReadAt=nowIso();
  meta.lastTitle=doc.title||meta.lastTitle||'';
  meta.lastArea=doc.area||meta.lastArea||'';
  meta.lastBlock=doc.block||meta.lastBlock||'';
  meta.lastCategory=doc.category||meta.lastCategory||'';
  if(headingId) meta.lastHeadingId=headingId;
  if(headingText) meta.lastHeadingText=headingText;
  if(Number.isFinite(scrollRatio)) meta.lastScrollRatio=Math.max(0,Math.min(1,scrollRatio));
  const now=Date.now();
  if(force||headingChanged||now-materialReadingLastSavedAt>5000) {
    materialReadingLastSavedAt=now;
    saveStateOnly({invalidate:false});
  }
}
function bindMaterialReadingProgress(doc) {
  const article=document.querySelector('#materiais .material-reading-mode');
  const toc=document.querySelector('#materiais .reader-toc');
  if(!article||!toc) return;
  const headings=[...article.querySelectorAll('[data-material-heading-anchor]')];
  const buttons=[...toc.querySelectorAll('[data-material-heading]')];
  if(!headings.length||!buttons.length) return;
  let frame=0;
  let activeId='';
  const ratio=()=>{
    const rect=article.getBoundingClientRect();
    const total=Math.max(1,rect.height-window.innerHeight);
    return Math.max(0,Math.min(1,(-rect.top)/total));
  };
  const activate=(heading,force=false)=>{
    if(!heading) return;
    const id=heading.dataset.materialHeadingAnchor||heading.id;
    const changed=id!==activeId;
    activeId=id;
    buttons.forEach(button=>{
      const current=button.dataset.materialHeading===id;
      button.classList.toggle('active',current);
      button.setAttribute('aria-current',current?'location':'false');
      if(current&&changed) toc.scrollTo({left:Math.max(0,button.offsetLeft-(toc.clientWidth-button.offsetWidth)/2),behavior:'smooth'});
    });
    rememberMaterialReading(doc,heading,ratio(),force||changed);
  };
  const update=()=>{
    frame=0;
    const headerHeight=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-header-height'))||104;
    const threshold=headerHeight+76;
    let current=headings[0];
    for(const heading of headings) {
      if(heading.getBoundingClientRect().top<=threshold) current=heading;
      else break;
    }
    activate(current);
  };
  const onScroll=()=>{ if(!frame) frame=requestAnimationFrame(update); };
  window.addEventListener('scroll',onScroll,{passive:true});
  buttons.forEach(button=>button.addEventListener('click',()=>{
    const heading=document.getElementById(button.dataset.materialHeading);
    if(!heading) return;
    materialReadingRestoreDocId='';
    activate(heading,true);
    heading.scrollIntoView({behavior:'smooth',block:'start'});
  }));
  materialReadingCleanup=()=>{
    window.removeEventListener('scroll',onScroll);
    if(frame) cancelAnimationFrame(frame);
    const current=headings.find(heading=>(heading.dataset.materialHeadingAnchor||heading.id)===activeId)||headings[0];
    rememberMaterialReading(doc,current,ratio(),true);
  };
  const restore=materialReadingRestoreDocId===doc.id;
  const savedMeta=materialEditMeta(doc.id);
  const initial=headings.find(heading=>(heading.dataset.materialHeadingAnchor||heading.id)===savedMeta.lastHeadingId)
    || headings.find(heading=>heading.dataset.materialHeadingText===savedMeta.lastHeadingText)
    || headings[0];
  activate(initial,true);
  if(restore) {
    materialReadingRestoreDocId='';
    requestAnimationFrame(()=>requestAnimationFrame(()=>initial.scrollIntoView({behavior:'auto',block:'start'})));
  } else requestAnimationFrame(update);
}
function cleanMaterialExtraction(text) {
  const lines = String(text || '').normalize('NFC').replace(/\u00a0/g,' ')
    .replace(/\\r\\n\\r\\n|\\n\\n|\\r\\r/g,'\n\n')
    .replace(/\\r\\n(?=\s*[-#>*])|\\[nr](?=\s*[-#>*])/g,'\n')
    .split(/\r?\n/);
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
  const meta=materialEditMeta(doc.id);
  if(meta.edited && typeof meta.content==='string') return meta.content;
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
function queueMaterialEditSave(doc,markdown) {
  const meta=materialEditMeta(doc.id);
  meta.edited=true;
  meta.content=markdown;
  meta.updatedAt=nowIso();
  const status=document.getElementById('materialAutosave');
  if(status) status.textContent='Salvando...';
  clearTimeout(materialEditSaveTimers.get(doc.id));
  materialEditSaveTimers.set(doc.id,setTimeout(() => {
    saveStateOnly();
    const current=document.getElementById('materialAutosave');
    if(current) current.textContent='Salvo e sincronizado';
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
async function compressImageForUpload(file, {maxDimension=1600, quality=0.82}={}) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
    return blob && blob.size < file.size ? blob : file;
  } catch(error) {
    console.warn('Não foi possível comprimir a imagem, usando o arquivo original:', error);
    return file;
  }
}
async function storeMaterialImage(file) {
  if(!file?.type?.startsWith('image/')) return '';
  if(file.size > 12*1024*1024) { alert('Escolha uma imagem com até 12 MB.'); return ''; }
  const compressed = await compressImageForUpload(file);
  const dataUrl=await new Promise((resolve,reject) => { const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=()=>reject(reader.error); reader.readAsDataURL(compressed); });
  const id=`img-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  materialImageCache.set(id,dataUrl);
  await materialDbPut({key:`image:${id}`,type:'image',id,name:file.name,mime:compressed.type||file.type,dataUrl,createdAt:Date.now()});
  if(currentUser && sbClient && CLOUD_SYNC_ALLOWED) {
    sbClient.storage.from(MATERIAL_IMAGE_BUCKET).upload(`${currentUser.id}/${id}.webp`, compressed, {contentType:'image/webp', upsert:true})
      .then(({error}) => { if(error) console.warn('Não foi possível sincronizar a imagem do material:', error); })
      .catch(error => console.warn('Não foi possível sincronizar a imagem do material:', error));
  }
  return id;
}
async function loadMaterialImagesForMarkdown(doc,markdown) {
  const ids=[...String(markdown||'').matchAll(/material-image:([\w-]+)/g)].map(match=>match[1]);
  const missing=[...new Set(ids)].filter(id=>!materialImageCache.has(id));
  if(!missing.length) return;
  await Promise.all(missing.map(async id => {
    const record=await materialDbGet(`image:${id}`);
    if(record?.dataUrl) { materialImageCache.set(id,record.dataUrl); return; }
    if(!currentUser || !sbClient || !CLOUD_SYNC_ALLOWED) return;
    try {
      const {data,error}=await sbClient.storage.from(MATERIAL_IMAGE_BUCKET).download(`${currentUser.id}/${id}.webp`);
      if(error || !data) return;
      const dataUrl=await new Promise((resolve,reject) => { const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=()=>reject(reader.error); reader.readAsDataURL(data); });
      materialImageCache.set(id,dataUrl);
      await materialDbPut({key:`image:${id}`,type:'image',id,mime:'image/webp',dataUrl,createdAt:Date.now()});
    } catch(error) {
      console.warn('Não foi possível baixar a imagem sincronizada do material:', error);
    }
  }));
  if(ui.tab==='materiais' && ui.materialDocId===doc.id) renderMateriais();
}
async function storeFlashcardImage(file) {
  if(!file?.type?.startsWith('image/')) return '';
  if(file.size > 12*1024*1024) { alert('Escolha uma imagem com até 12 MB.'); return ''; }
  const compressed = await compressImageForUpload(file);
  const dataUrl=await new Promise((resolve,reject) => { const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=()=>reject(reader.error); reader.readAsDataURL(compressed); });
  const id=`img-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  flashcardImageCache.set(id,dataUrl);
  await materialDbPut({key:`flashcard-image:${id}`,type:'image',id,name:file.name,mime:compressed.type||file.type,dataUrl,createdAt:Date.now()});
  if(currentUser && sbClient && CLOUD_SYNC_ALLOWED) {
    sbClient.storage.from(MATERIAL_IMAGE_BUCKET).upload(`${currentUser.id}/flashcards/${id}.webp`, compressed, {contentType:'image/webp', upsert:true})
      .then(({error}) => { if(error) console.warn('Não foi possível sincronizar a imagem do flashcard:', error); })
      .catch(error => console.warn('Não foi possível sincronizar a imagem do flashcard:', error));
  }
  return id;
}
async function loadFlashcardImagesForText(text) {
  const ids=[...String(text||'').matchAll(/flashcard-image:([\w-]+)/g)].map(match=>match[1]);
  const missing=[...new Set(ids)].filter(id=>!flashcardImageCache.has(id));
  if(!missing.length) return;
  await Promise.all(missing.map(async id => {
    const record=await materialDbGet(`flashcard-image:${id}`);
    if(record?.dataUrl) { flashcardImageCache.set(id,record.dataUrl); return; }
    if(!currentUser || !sbClient || !CLOUD_SYNC_ALLOWED) return;
    try {
      const {data,error}=await sbClient.storage.from(MATERIAL_IMAGE_BUCKET).download(`${currentUser.id}/flashcards/${id}.webp`);
      if(error || !data) return;
      const dataUrl=await new Promise((resolve,reject) => { const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=()=>reject(reader.error); reader.readAsDataURL(data); });
      flashcardImageCache.set(id,dataUrl);
      await materialDbPut({key:`flashcard-image:${id}`,type:'image',id,mime:'image/webp',dataUrl,createdAt:Date.now()});
    } catch(error) {
      console.warn('Não foi possível baixar a imagem sincronizada do flashcard:', error);
    }
  }));
  if(ui.tab==='flashcards') renderFlashcards();
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
  const meta=materialEditMeta(doc.id);
  meta.edited=false;
  meta.content='';
  meta.updatedAt=nowIso();
  ui.materialEditMode=false;
  saveStateOnly();
  renderMateriais();
}
function applyMaterialHighlight(doc, descriptor, color) {
  if(!descriptor?.text || !descriptor.element) return;
  const selected=descriptor.text;
  const occurrence=n(descriptor.occurrence);
  const block=descriptor.element.dataset.materialBlock || descriptor.block || '';
  if(!block) return;
  const meta=materialEditMeta(doc.id);
  const index=meta.highlights.findIndex(item=>item.text===selected && item.block===block && n(item.occurrence)===occurrence);
  rememberHighlightState({ context:'material', docId:doc.id, highlights:meta.highlights });
  if(color===null) meta.highlights=meta.highlights.filter((_,position)=>position!==index);
  else if(index>=0) meta.highlights=meta.highlights.map((item,position)=>position===index?{...item,color:normalizeHighlightColor(color)}:item);
  else meta.highlights=[...meta.highlights,{text:selected,color:normalizeHighlightColor(color),block,occurrence}];
  saveStateOnly();
  renderMateriais();
}
function bindMaterialReader(doc) {
  if(!doc) return;
  rememberMaterialReading(doc,null,undefined,true);
  document.getElementById('materialEditToggle')?.addEventListener('click',() => { ui.materialEditMode=!ui.materialEditMode; renderMateriais(); });
  document.getElementById('materialFocusToggle')?.addEventListener('click',() => { ui.materialFocusMode=!ui.materialFocusMode; renderMateriais(); });
  document.getElementById('materialExportMarkdown')?.addEventListener('click',() => exportMaterialMarkdown(doc,effectiveMaterialMarkdown(doc)||''));
  document.getElementById('materialRestoreOriginal')?.addEventListener('click',() => restoreOriginalMaterial(doc));
  document.getElementById('clearMaterialHighlights')?.addEventListener('click',() => {
    const meta=materialEditMeta(doc.id);
    if(meta.highlights.length) rememberHighlightState({ context:'material', docId:doc.id, highlights:meta.highlights });
    meta.highlights=[];
    saveStateOnly();
    renderMateriais();
  });
  const reading=document.querySelector('.material-reading-mode');
  if(reading) {
    bindPointerHighlighter(reading.querySelectorAll('[data-material-block]'),(descriptor,color)=>applyMaterialHighlight(doc,descriptor,color));
    bindSavedHighlightMenus(reading,(descriptor,color)=>applyMaterialHighlight(doc,descriptor,color));
    bindMaterialReadingProgress(doc);
  }
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
    const docMeta=state.materials[doc.id];
    const editedText=docMeta?.edited && typeof docMeta.content==='string' ? normalizedTopic(docMeta.content) : '';
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
  if(documents[0]) prepareMaterialDocOpen(documents[0],true);
  else {
    ui.materialBlock = String(item.block || 'Todos');
    ui.materialScheduleId = scheduleId;
    ui.materialDocId = '';
    ui.materialSearch = '';
    ui.materialEditMode = false;
    ui.materialFocusMode = false;
  }
  navigateToTab('materiais');
}
async function loadMaterialLibraryNow() {
  let baseDocs = [];
  try {
    const response = await fetch('materials_library/index.json', {cache:'no-store'});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    baseDocs = Array.isArray(payload.documents) ? payload.documents : [];
  } catch(error) {
    console.warn('Biblioteca de materiais ainda não disponível:', error);
  }
  let specialtyDocs = [];
  try {
    const response = await fetch('materials_library/especialidades-index.json', {cache:'no-store'});
    if(response.ok) {
      const payload = await response.json();
      specialtyDocs = Array.isArray(payload.documents) ? payload.documents : [];
    }
  } catch(error) {
    console.warn('Biblioteca de especialidades ainda não disponível:', error);
  }
  materialLibrary = [...baseDocs, ...specialtyDocs];
  materialLibraryStatus = materialLibrary.length ? `${materialLibrary.length} resumos disponíveis` : 'Biblioteca em preparação';
  if(ui.tab === 'materiais') renderMateriais();
}
async function loadOfficialSchedule() {
  try {
    const response = await fetch('official_schedule.json', {cache:'no-store'});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    officialSchedule = Array.isArray(payload.items) ? payload.items : [];
    const repaired = repairUniformScheduleDates();
    const changed = applyOfficialSchedule();
    if(repaired || changed) render();
  } catch(error) {
    console.warn('Cronograma oficial do Medplanner indisponível:', error);
  }
}
function videoAssetUrl(video) {
  const localPath = String(video.relativePath || '').split('/').map(part => encodeURIComponent(part)).join('/');
  const onlinePath = String(video.onlinePath || '').split('/').map(part => encodeURIComponent(part)).join('/');
  const localUrl = `video_library/media/${localPath}`;
  // A cópia local continua funcionando sem internet; o site publicado usa o R2.
  const useR2 = usesR2VideoSource();
  if(!useR2) return localUrl;
  // Sem onlinePath o arquivo não está no R2 neste momento. Devolver o caminho local
  // aqui só geraria um 404 disfarçado; melhor a aula ficar listada e avisar.
  return onlinePath ? `${R2_VIDEO_BASE_URL}/video_library/media/${onlinePath}` : '';
}
// Um vídeo pode estar no catálogo e não estar tocável agora (fora do R2 nesta rotação
// de 10 GB, ou sem cópia local). Continua contando para a lista, para as partes da
// aula e para "assistida" — só não reproduz.
function videoPlayableNow(video) {
  if(!video) return false;
  return usesR2VideoSource() ? Boolean(video.onlinePath) : Boolean(video.relativePath);
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
function persistCurrentVideoRate(video) {
  const lesson = currentVideoLesson();
  const source = lesson ? currentVideoSource(lesson) : null;
  if(!source || !video) return;
  saveVideoProgressRecord(source, video, videoScheduleForLesson(lesson), lesson);
  saveStateOnly({invalidate:false});
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
    // O catálogo é a lista completa de aulas, sempre. O R2 só guarda 10 GB por vez e
    // os arquivos entram e saem de lá; filtrar a lista por onlinePath fazia a aula
    // completa desaparecer, o que quebrava a contagem de "aula realizada" e apagava
    // os ícones do cronograma. O que falta no R2 aparece listado e marcável, só não toca.
    const availableVideos = raw.videos;
    availableVideos.forEach(video => {
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
  // Os blocos finais já aparecem na rota de estudo mesmo antes do envio dos MP4s,
  // online e offline — a lista de aulas é a mesma nos dois modos.
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
    // remove nosso prefixo de organização: "06 - ", "01.1 - " (COFEXPRESS) e "06 - 2 aula - "
    .replace(/^\d+(?:\.\d+)?\s*-\s*(?:\d+\s*aula\s*-\s*)?/i, '')
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
// Vídeos de aula completa às vezes usam "01 - 1 aula - Tema" / "01 - 2 aula - Tema"
// para numerar as partes. Esse número de ordem some depois da limpeza do prefixo em
// videoContentLabel, então quando os dois arquivos completos ficam com o mesmo texto
// restante (ex.: ambos terminam em "Parte" sem dígito), o agrupamento por número
// precisa recuperar essa ordem original em vez de assumir "parte 1" para os dois.
function videoDeclaredAulaOrder(video) {
  const match = String(video?.title || '').match(/^\d+(?:\.\d+)?\s*-\s*(\d+)\s*aula\s*-/i);
  return match ? Number(match[1]) : 0;
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
    // Vídeo completo e COFEXPRESS do mesmo trecho usam convenções de nome
    // diferentes ("Parte (1)" vs "Parte 1 COFEXPRESS", "1 aula - Tema" vs
    // "1 - Tema COFEXPRESS"). Extrai o número declarado em qualquer uma dessas
    // formas para poder juntar os dois sob a mesma parte, em vez de comparar o
    // texto restante (que nunca bate entre as duas convenções).
    const partMatch = topic.match(/\bparte\s*\(?\s*(\d+)\s*\)?/i)
      || topic.match(/\b(\d+)\s*(?:a|o|ª|º)?\s*parte\b/i)
      || topic.match(/\b(\d+)\s*(?:a|o|ª|º)?\s*aula\b/i)
      || topic.match(/^(\d+)\s*[-.]\s*/);
    const number = partMatch ? Number(partMatch[1]) : (/\bparte$/i.test(topic) ? (videoDeclaredAulaOrder(video) || 1) : 0);
    // Alguns arquivos de origem repetem o mesmo número por engano (dois
    // COFEXPRESS com o mesmo prefixo "01.1", por exemplo). Se a parte já tem
    // um vídeo do mesmo tipo, não mescla — cria uma parte própria pelo texto
    // restante, em vez de sobrepor um COFEXPRESS/aula completa pelo outro.
    let key = number ? `part-${number}` : `topic-${topicKey}`;
    if(number && groups.has(key) && groups.get(key).videos.some(v => v.type === video.type)) key = `part-${number}-${topicKey}`;
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
  const cards = flashcardsNewestFirst((Array.isArray(state.videoFlashcards?.[source.id]) ? state.videoFlashcards[source.id] : []).filter(card => !card.deletedAt));
  const topic = videoContentLabel(source);
  return `<div class="flashcard-editor video-flashcards"><div class="section-title"><div><h3>Flashcards deste vídeo</h3><div class="muted">Crie todos os cartões necessários. Selecione um trecho e use a barra para formatar, ou escolha o tipo Cloze para ocluir uma palavra.</div></div><button class="icon-btn primary" id="addVideoFlashcard">+ Flashcard</button></div>${cards.length ? `<div class="flashcard-editor-list">${cards.map(card=>{ const sourceAttr = `data-video-card="${escapeAttr(source.id)}"`; return `<div class="flashcard-editor-item">${renderClozeAwareFlashcardFields(sourceAttr,card,'Frente: pergunta ou conceito','Verso: resposta curta')}<button class="tiny-btn" data-remove-video-card="${escapeAttr(source.id)}" data-card-id="${escapeAttr(card.id)}" title="Remover flashcard">×</button></div>`; }).join('')}</div>` : '<div class="empty">Nenhum flashcard criado para este vídeo.</div>'}<div class="topic-source">${cards.length} ${cards.length===1?'flashcard':'flashcards'} · ${escapeHtml(schedule?.topic || lesson?.title || topic)} · ${escapeHtml(topic)}</div></div>`;
}
function addVideoFlashcard(source, lesson, schedule) {
  const video = document.getElementById('lessonVideo');
  const wasPlaying = Boolean(video && !video.paused);
  const currentTime = video ? Math.floor(video.currentTime || 0) : 0;
  const playbackRate = video?.playbackRate || 1;
  ensureVideoFlashcardStudyTimer(source, schedule);
  const cards = Array.isArray(state.videoFlashcards[source.id]) ? state.videoFlashcards[source.id] : [];
  cards.unshift({ id:`video-card-${Date.now()}`, front:'', back:'', scheduleId:schedule?.id || '', block:schedule?.block || lesson?.block || '', area:schedule?.area || lesson?.area || 'Sem área', subarea:videoContentLabel(source), topic:schedule?.topic || lesson?.title || videoContentLabel(source), createdAt:new Date().toISOString() });
  state.videoFlashcards[source.id] = cards;
  renderCache.manualCards = null;
  saveStateOnly();
  renderAulas();
  requestAnimationFrame(() => {
    const nextVideo = document.getElementById('lessonVideo');
    if(!nextVideo) return;
    nextVideo.currentTime = currentTime;
    nextVideo.defaultPlaybackRate = playbackRate;
    nextVideo.playbackRate = playbackRate;
    if(wasPlaying) {
      nextVideo.play().catch(() => {});
      startAutoStudy('video', schedule?.id || '');
    }
  });
}
function updateVideoFlashcard(input) {
  const cards = state.videoFlashcards?.[input.dataset.videoCard] || [];
  const card = cards.find(item => item.id === input.dataset.cardId);
  if(!card) return;
  const lesson = currentVideoLesson();
  ensureVideoFlashcardStudyTimer(
    lesson?.videos?.find(item => item.id === input.dataset.videoCard),
    videoScheduleForLesson(lesson)
  );
  card[input.dataset.cardField] = input.value;
  if(input.dataset.cardField === 'subarea') card.topic = input.value;
  renderCache.manualCards = null;
  saveStateOnly();
  if(input.dataset.cardField === 'cardType') renderAulas();
}
function removeVideoFlashcard(videoId, cardId) {
  const lesson = currentVideoLesson();
  ensureVideoFlashcardStudyTimer(
    lesson?.videos?.find(item => item.id === videoId),
    videoScheduleForLesson(lesson)
  );
  state.videoFlashcards[videoId] = (state.videoFlashcards[videoId] || []).map(card =>
    card.id === cardId ? {...card, deletedAt: new Date().toISOString()} : card
  );
  delete state.flashcardProgress[cardId];
  delete ui.revealedCards[cardId];
  renderCache.manualCards = null;
  persist();
  renderAulas();
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
    const date = studyDateKey(completedAt);
    state.videoPlayer.watched[videoId] = true;
    state.videoPlayer.watchedAt[videoId] = completedAt;
    awardVideoCompletionXP(videoId,completedAt);
    const log = getDayLog(date);
    log.videosOn = true;
    log.videos = n(log.videos) + 1;
    return;
  }
  if(!watched && wasWatched) {
    const completedDate = studyDateKey(state.videoPlayer.watchedAt[videoId] || '');
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
  if(!lessons.length) { alert('Ainda não há videoaula vinculada a esta aula no catálogo.'); return; }
  const playableLessons = lessons.filter(lesson => lesson.videos?.length);
  if(!playableLessons.length) {
    ui.videoBlock = String(lessons[0].block);
    ui.videoSearch = '';
    ui.videoLessonId = lessons[0].id;
    ui.videoSourceId = '';
    navigateToTab('aulas');
    return;
  }
  const lesson = playableLessons.find(entry => !lessonVideoCompleted(entry)) || playableLessons[0];
  const nextPart = videoParts(lesson).find(part => !part.videos.some(video => state.videoPlayer.watched[video.id])) || videoParts(lesson)[0];
  const nextSource = nextPart.videos.find(video => videoPlayableNow(video) && !state.videoPlayer.watched[video.id])
    || nextPart.videos.find(video => !state.videoPlayer.watched[video.id])
    || nextPart.videos.find(video => videoPlayableNow(video))
    || nextPart.videos[0];
  ui.videoBlock = String(lesson.block);
  ui.videoSearch = '';
  ui.videoLessonId = lesson.id;
  ui.videoSourceId = nextSource.id;
  navigateToTab('aulas');
}
function openDayVideos(date) {
  const lessons = state.schedule.filter(item => item.date === date).sort(byDate);
  const next = lessons.find(item => videoSourcesForSchedule(item).some(video => !state.videoPlayer.watched[video.id])) || lessons.find(item => videoSourcesForSchedule(item).length);
  if(next) openVideosForSchedule(next.id);
  else { ui.videoBlock=String(currentScheduleBlock()); navigateToTab('aulas'); }
}
function markCompletedLessonsThroughBlockNine() {
  const version = 'watched-lessons-through-block-09-2026-07-13-v1';
  if(state.videoPlayer.completedLessonMigration === version) return 0;
  const pendingTopics = ['amenorreias', 'sindrome dos ovarios policisticos', 'disturbios do sodio e potassio', 'gasometria arterial'];
  const administrativeCompletions = new Set(state.videoPlayer.autoCompletedVideoIds || []);
  let count = 0;
  videoCatalog.filter(lesson => n(lesson.block) >= 1 && n(lesson.block) <= 9).forEach(lesson => {
    const title = normalizedTopic(lesson.title);
    if(pendingTopics.some(topic => title.includes(topic)) || (title.includes('disturbios') && title.includes('sodio') && title.includes('potassio'))) return;
    videoParts(lesson).forEach(part => {
      const preferred = part.videos.find(video => video.type === 'complete') || part.videos[0];
      if(preferred && !state.videoPlayer.watched[preferred.id]) {
        state.videoPlayer.watched[preferred.id] = true;
        administrativeCompletions.add(preferred.id);
        count += 1;
      }
    });
  });
  state.videoPlayer.autoCompletedVideoIds = [...administrativeCompletions];
  state.videoPlayer.completedLessonMigration = version;
  saveStateOnly();
  return count;
}
function currentVideoLesson() {
  if(ui.videoSourceId) {
    const routedLesson=displayVideoLessons().find(item=>item.videos?.some(video=>video.id===ui.videoSourceId));
    if(routedLesson) {
      ui.videoLessonId=routedLesson.id;
      ui.videoBlock=String(routedLesson.block);
      ui.videoSearch='';
      return routedLesson;
    }
  }
  const pinned = state.videoPlayer?.pinned;
  if(pinned?.enabled && !ui.videoSearch) {
    const pinnedLesson = displayVideoLessons().find(lesson => lesson.id === pinned.lessonId);
    const blockAllowsPinned = !ui.videoBlock || ui.videoBlock === 'Todos' || String(pinnedLesson?.block) === String(ui.videoBlock);
    if(pinnedLesson && blockAllowsPinned) {
      ui.videoLessonId = pinnedLesson.id;
      ui.videoSourceId = pinnedLesson.videos.some(video => video.id === pinned.sourceId) ? pinned.sourceId : pinnedLesson.videos[0]?.id || '';
      ui.videoBlock = String(pinnedLesson.block);
      ui.videoSearch = '';
      return pinnedLesson;
    }
  }
  const lastOpen = state.videoPlayer?.lastOpen;
  if(!ui.videoLessonId && !ui.videoSearch && lastOpen?.lessonId) {
    const rememberedLesson = displayVideoLessons().find(lesson => lesson.id === lastOpen.lessonId);
    const blockAllowsLastOpen = !ui.videoBlock || ui.videoBlock === 'Todos' || String(rememberedLesson?.block) === String(ui.videoBlock);
    if(rememberedLesson && blockAllowsLastOpen) {
      ui.videoLessonId = rememberedLesson.id;
      ui.videoSourceId = rememberedLesson.videos.some(video => video.id === lastOpen.sourceId) ? lastOpen.sourceId : rememberedLesson.videos[0]?.id || '';
      ui.videoBlock = String(rememberedLesson.block);
      ui.videoSearch = '';
      return rememberedLesson;
    }
  }
  const selectedLesson = displayVideoLessons().find(lesson => lesson.id === ui.videoLessonId);
  if(selectedLesson) {
    ui.videoBlock = String(selectedLesson.block);
    return selectedLesson;
  }
  const visible = visibleVideoLessons();
  if(!visible.length) return null;
  if(!visible.some(lesson => lesson.id === ui.videoLessonId)) ui.videoLessonId = visible[0].id;
  return displayVideoLessons().find(lesson => lesson.id === ui.videoLessonId) || visible[0];
}
// Escolha automática: prefere um vídeo que toque agora, mas a escolha manual do
// usuário sempre vence — dá para abrir a aula completa fora do R2 só para marcá-la.
function preferredVideoSource(lesson) {
  const videos = lesson?.videos || [];
  if(!videos.length) return null;
  return videos.find(video => videoPlayableNow(video) && !state.videoPlayer.watched[video.id])
    || videos.find(video => videoPlayableNow(video))
    || videos[0];
}
function currentVideoSource(lesson) {
  if(!lesson?.videos?.length) return null;
  if(!lesson.videos.some(video => video.id === ui.videoSourceId)) ui.videoSourceId = preferredVideoSource(lesson).id;
  return lesson.videos.find(video => video.id === ui.videoSourceId) || preferredVideoSource(lesson);
}
function saveOpenVideoPosition() {
  const video = document.getElementById('lessonVideo');
  const sourceId = ui.videoSourceId;
  if(!video || !sourceId) return;
  const lesson=displayVideoLessons().find(item=>item.id===ui.videoLessonId);
  const source=lesson?.videos?.find(item=>item.id===sourceId)||{id:sourceId};
  const schedule=lesson?videoScheduleForLesson(lesson):null;
  saveVideoProgressRecord(source,video,schedule,lesson);
  setVideoLastOpen(ui.videoLessonId || '', sourceId);
  saveStateOnly();
}
function saveVideoResume(sourceId, seconds) {
  if(!sourceId) return;
  state.videoPlayer.resume[sourceId] = Math.max(0, Math.floor(n(seconds)));
  state.videoPlayer.resumeUpdatedAt[sourceId] = new Date().toISOString();
}
function setVideoLastOpen(lessonId, sourceId) {
  state.videoPlayer.lastOpen = { lessonId:lessonId || '', sourceId:sourceId || '', updatedAt:new Date().toISOString() };
}
function saveVideoProgressRecord(source,video,schedule,lesson,{completed}={}) {
  if(!source?.id||!video) return null;
  const previous=state.videoPlayer.progress?.[source.id]||{};
  const duration=Number.isFinite(video.duration)?video.duration:n(previous.duration);
  const progressData={
    ...previous,
    videoId:source.id,
    currentTime:video.currentTime||0,
    duration,
    playbackRate:video.playbackRate||previous.playbackRate||1,
    updatedAt:new Date().toISOString(),
    completed:completed===undefined?Boolean(previous.completed||state.videoPlayer.watched[source.id]):Boolean(completed),
    lessonId:lesson?.id||ui.videoLessonId||'',
    scheduleId:schedule?.id||'',
    block:lesson?.block||schedule?.block||0
  };
  const record=PlannerUX?.normalizeVideoProgress
    ? PlannerUX.normalizeVideoProgress(progressData)
    : progressData;
  state.videoPlayer.progress[source.id]=record;
  saveVideoResume(source.id,record.currentTime);
  setVideoLastOpen(record.lessonId,source.id);
  return record;
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
  const lesson = currentVideoLesson();
  const visible = visibleVideoLessons();
  const source = currentVideoSource(lesson);
  const schedule = lesson ? videoScheduleForLesson(lesson) : null;
  const parts = lesson ? videoParts(lesson) : [];
  const summaryExpress = lesson ? videoSummaryExpressVideos(lesson) : [];
  const bookmarks = source ? (state.videoPlayer.bookmarks[source.id] || []) : [];
  const progressRecord = source ? state.videoPlayer.progress?.[source.id] || {} : {};
  const resume = source ? (PlannerUX?.resumeTime(progressRecord) ?? n(state.videoPlayer.resume[source.id])) : 0;
  const watched = source ? state.videoPlayer.watched[source.id] : false;
  const pinnedState = state.videoPlayer.pinned || {};
  const pinnedActive = Boolean(lesson && source && pinnedState.enabled && pinnedState.lessonId === lesson.id && pinnedState.sourceId === source.id);
  const usingR2 = usesR2VideoSource();
  const sourcePlayable = source ? videoPlayableNow(source) : false;
  const sourceUrl = source ? videoAssetUrl(source) : '';
  const unavailableNote = source && !sourcePlayable
    ? `<div class="video-unavailable">${usingR2
        ? 'Este arquivo não está no R2 agora. A aula continua na lista: você pode marcá-la como assistida, salvar pontos e criar flashcards. Quando reenviar o vídeo com o mesmo nome, ele volta a tocar aqui.'
        : 'Não encontrei o arquivo local desta aula. Ela continua na lista e pode ser marcada como assistida.'}</div>`
    : '';
  const completedLessons = catalogLessons.filter(lessonItem => lessonVideoCompleted(lessonItem)).length;
  const completionPercent = catalogLessons.length ? Math.round((completedLessons / catalogLessons.length) * 100) : 0;
  const activeBlock = ui.videoBlock && ui.videoBlock !== 'Todos' ? `Bloco ${String(ui.videoBlock).padStart(2,'0')}` : 'Todos os blocos';
  const activeLessonProgress = lesson ? videoLessonProgress(lesson) : {done:0,total:0};
  mount.innerHTML = `<section class="video-command-center">
    <header class="video-hero">
      <div class="video-hero-copy"><span class="video-eyebrow">Sua central de aprendizado</span><h1>Aulas</h1><p>Assista, marque os pontos essenciais e transforme cada aula em revisão ativa.</p></div>
      <div class="video-hero-progress" aria-label="${completionPercent}% do catálogo concluído"><div class="video-hero-progress-copy"><span>Progresso geral</span><strong>${completedLessons}<small> / ${catalogLessons.length}</small></strong></div><div class="video-hero-ring" style="--video-course-progress:${completionPercent * 3.6}deg"><span>${completionPercent}%</span></div></div>
    </header>
    <div class="video-quick-stats" aria-label="Resumo das aulas"><div><span>${iconSvg('play',{weight:'duotone'})}</span><p><strong>${activeBlock}</strong><small>recorte atual</small></p></div><div><span>${iconSvg('success',{weight:'duotone'})}</span><p><strong>${completedLessons} concluídas</strong><small>${catalogLessons.length-completedLessons} para avançar</small></p></div><div><span>${iconSvg('timer',{weight:'duotone'})}</span><p><strong>${activeLessonProgress.done}/${activeLessonProgress.total || 0} partes</strong><small>na aula selecionada</small></p></div></div>
    <div class="video-layout ${ui.videoFocusMode?'video-focus-mode':''}">
      <aside class="card video-sidebar">
        <div class="video-sidebar-head"><div><span class="video-eyebrow">Biblioteca</span><h2>Trilha de aulas</h2><div class="muted">${visible.length} de ${catalogLessons.length} aulas</div></div><span class="badge today">${usingR2?'R2':'offline'}</span></div>
        <div class="video-filter"><label><span>Bloco</span><select class="select" id="videoBlock" aria-label="Filtrar bloco"><option value="Todos">Todos</option>${blocks.map(block => `<option value="${block}" ${String(ui.videoBlock)===String(block)?'selected':''}>Bloco ${String(block).padStart(2,'0')}</option>`).join('')}</select></label><label class="video-search-field"><span>Buscar</span><input class="input" id="videoSearch" value="${escapeAttr(ui.videoSearch || '')}" placeholder="Aula, tema ou área"></label></div>
        <div class="video-list-caption"><span>Em ordem do cronograma</span><span>${visible.length} resultados</span></div>
        <div class="video-lesson-list">${visible.map((item,index) => { const hasExpress=item.videos.some(video=>video.type==='express'); const linked=videoScheduleForLesson(item); const done=lessonVideoCompleted(item); return `<button class="video-lesson-choice ${item.id===lesson?.id?'active':''} ${done?'is-complete':''}" data-video-lesson="${escapeAttr(item.id)}" aria-pressed="${item.id===lesson?.id}"><span class="video-priority-bar ${priorityClass(linked?.priority)}"></span><span class="video-lesson-index">${String(index+1).padStart(2,'0')}</span><span class="video-lesson-copy"><strong>${escapeHtml(lessonDisplayTitle(linked, item.title))}</strong><small><b>B${String(item.block).padStart(2,'0')}</b><i></i>${escapeHtml(item.area)}${linked ? `<i></i>${fmtDate(linked.date)}` : ''}</small></span><span class="video-lesson-state">${lessonWatchedOnlyByCofexpress(item)?'<span class="video-cof-marker" title="Assistida apenas pelo COFEXPRESS">COF</span>':''}<span class="badge ${done?'done':hasExpress?'today':'wait'}">${done?'✓':item.videos.length}</span></span></button>`; }).join('') || '<div class="video-empty-list"><strong>Nenhuma aula encontrada</strong><span>Tente outro termo ou selecione todos os blocos.</span></div>'}</div>
      </aside>
      <section class="card video-player-card">${!lesson || !source ? '<div class="video-empty"><div><span class="video-empty-icon">▶</span><h2>Escolha uma aula</h2><p>Selecione um item da trilha para começar.</p></div></div>' : `<div class="video-reader-head"><div><div class="video-lesson-kicker"><span>Bloco ${String(lesson.block).padStart(2,'0')}</span><i></i><span>${escapeHtml(lesson.area)}</span></div><h2>${escapeHtml(lessonDisplayTitle(schedule, lesson.title))}</h2><div class="video-lesson-meta"><span>${lesson.videos.length} ${lesson.videos.length===1?'vídeo':'vídeos'}</span><span>${activeLessonProgress.done} de ${activeLessonProgress.total} partes concluídas</span></div></div><div class="video-reader-actions"><button class="icon-btn video-pin-toggle ${pinnedActive?'active':''}" id="toggleVideoPin" type="button" aria-pressed="${pinnedActive}" title="${pinnedActive?'Desfixar vídeo':'Fixar vídeo'}" aria-label="${pinnedActive?'Desfixar vídeo':'Fixar vídeo'}">📌</button><button class="tiny-btn video-focus-toggle" id="toggleVideoFocus" type="button" aria-pressed="${ui.videoFocusMode}" title="${ui.videoFocusMode?'Voltar ao layout completo':'Expandir o vídeo e manter os pontos importantes'}">${ui.videoFocusMode?'Sair do foco':`${iconSvg('focus',{weight:'regular'})} Modo foco`}</button><span class="badge today" data-auto-study-clock title="Clique para pausar ou retomar o cronômetro">Tempo pausado</span><span class="badge ${lessonVideoCompleted(lesson)?'done':'today'}">${lessonVideoCompleted(lesson)?'Concluída':'Em estudo'}</span></div></div><div class="video-tabs">${parts.map(part => `<div class="video-part">${parts.length>1 || part.number ? `<span class="video-part-label">${escapeHtml(part.label)}</span>` : ''}${part.videos.map(video => `<button class="video-tab ${video.id===source.id?'active':''}" data-video-source="${escapeAttr(video.id)}">${video.type==='express'?'COFEXPRESS':'Aula completa'}</button>`).join('')}</div>`).join('')}</div><video class="video-player ${sourcePlayable?'':'is-unavailable'}" id="lessonVideo" controls preload="metadata"${sourcePlayable?` src="${escapeAttr(sourceUrl)}"`:''}>Seu navegador não conseguiu abrir este vídeo.</video>${unavailableNote}<div class="video-controls"><div class="video-transport"><button class="icon-btn" id="videoBack10" title="Voltar 10 segundos" aria-label="Voltar 10 segundos"><span>−10</span></button><button class="icon-btn" id="videoForward10" title="Avançar 10 segundos" aria-label="Avançar 10 segundos"><span>+10</span></button><select class="select playback-rate" id="videoPlaybackRate" aria-label="Velocidade">${[0.75,1,1.25,1.5,1.75,2].map(rate => `<option value="${rate}" ${rate===ui.videoPlaybackRate?'selected':''}>${String(rate).replace('.',',')}x</option>`).join('')}</select></div><div class="video-study-actions"><button class="icon-btn video-watched-toggle ${watched?'active':''}" id="videoMarkWatched" aria-pressed="${watched}" title="${watched?'Desmarcar assistida':'Marcar assistida'}" aria-label="${watched?'Desmarcar assistida':'Marcar assistida'}">${iconSvg('success',{weight:watched?'duotone':'regular'})}<span>${watched?'Assistida':'Marcar assistida'}</span></button>${schedule ? `<button class="icon-btn video-material-button" data-video-materials="${escapeAttr(schedule.id)}" title="Material da aula" aria-label="Material da aula">${iconSvg('materials')}<span>Material</span></button>` : ''}${lessonVideoCompleted(lesson) && schedule ? `<button class="tiny-btn primary" data-video-questions="${escapeAttr(schedule.id)}">Praticar questões →</button>` : ''}</div>${resume ? `<span class="video-resume-label">Retomar em ${formatVideoTime(resume)}</span>` : ''}</div><div class="video-bookmarks"><div class="section-title"><div><span class="video-eyebrow">Caderno da aula</span><h3>Pontos importantes</h3><div class="muted">Salve o instante exato de uma conduta, diagnóstico ou tratamento.</div></div><span class="video-note-count">${bookmarks.length}</span></div><div class="video-bookmark-form"><span class="badge today" id="videoBookmarkTime">${formatVideoTime(resume)}</span><input class="input" id="videoBookmarkLabel" placeholder="Descreva o ponto-chave"><button class="icon-btn primary" id="addVideoBookmark">Salvar ponto</button></div><div class="video-bookmark-list">${bookmarks.map(bookmark => `<div class="video-bookmark ${bookmark.starred?'starred':''}" data-video-bookmark-id="${escapeAttr(bookmark.id)}"><button type="button" data-video-seek="${bookmark.time}" title="Ir para este trecho">${formatVideoTime(bookmark.time)}</button><span class="video-bookmark-label">${escapeHtml(bookmark.label || 'Ponto importante')}</span><button type="button" class="video-bookmark-star ${bookmark.starred?'active':''}" data-video-bookmark-star="${escapeAttr(bookmark.id)}" title="${bookmark.starred?'Desmarcar ponto-chave':'Marcar como ponto-chave'}" aria-label="${bookmark.starred?'Desmarcar ponto-chave':'Marcar ponto-chave'}">${iconSvg('xp',{weight:bookmark.starred?'duotone':'regular'})}</button><button class="delete-bookmark" data-video-bookmark-delete="${escapeAttr(bookmark.id)}" title="Excluir ponto">×</button></div>`).join('') || '<div class="video-bookmark-empty"><span>✦</span><strong>Seu caderno começa aqui</strong><p>Ao encontrar algo importante, salve o momento para revisar depois.</p></div>'}</div></div>${renderVideoFlashcardEditor(source, lesson, schedule)}`}</section>
    </div>
  </section>`;
  const renderedVideo=mount.querySelector('#lessonVideo');
  if(renderedVideo) {
    const stage=document.createElement('div');
    stage.className='video-stage is-paused';
    stage.id='lessonVideoStage';
    renderedVideo.replaceWith(stage);
    stage.append(renderedVideo);
    const centerPlay=document.createElement('div');
    centerPlay.className='video-center-play';
    centerPlay.innerHTML='<span>▶</span>';
    stage.append(centerPlay);
    const cleanFrameToggle=document.createElement('button');
    cleanFrameToggle.type='button';
    cleanFrameToggle.className='video-clean-frame-toggle';
    cleanFrameToggle.id='toggleVideoCleanFrame';
    cleanFrameToggle.innerHTML='<span>↩</span>';
    cleanFrameToggle.setAttribute('aria-label','Ocultar controles para capturar a imagem');
    cleanFrameToggle.title='Clique para ocultar os controles';
    stage.append(cleanFrameToggle);
    // O aviso de arquivo indisponível vira sobreposição dentro do palco: a coluna do
    // player é um grid fechado e um irmão solto empurraria os controles para fora.
    const unavailable=mount.querySelector('.video-unavailable');
    if(unavailable) stage.append(unavailable);
  }
  const sourceSwitch=document.createElement('div');
  sourceSwitch.className='video-source-switch';
  sourceSwitch.setAttribute('role','group');
  sourceSwitch.setAttribute('aria-label','Fonte das videoaulas');
  sourceSwitch.innerHTML=`<span>Fonte</span><button type="button" data-video-source-mode="local" class="${usingR2?'':'active'}" ${isLocalPlanner()?'':'disabled'} title="${isLocalPlanner()?'Usar os vídeos deste computador':'Disponível apenas no computador que executa o servidor offline'}">PC offline</button><button type="button" data-video-source-mode="online" class="${usingR2?'active':''}" title="Usar os vídeos disponíveis no R2">R2 online</button>`;
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
      showStudyToast('O modo PC offline só funciona no computador que está executando o servidor local.');
      return;
    }
    ui.videoSourceMode=mode;
    localStorage.setItem(VIDEO_SOURCE_KEY, mode);
    renderCache.videoDisplay=null;
    renderCache.videoLessons.clear();
    if(mode === 'online') pushCloudState();
    renderAulas();
  });
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
      const playable = videoPlayableNow(listedVideo);
      const offline = playable ? '' : `<span class="video-playlist-offline">${usingR2?'fora do R2':'sem arquivo'}</span>`;
      button.innerHTML = `<span class="video-playlist-kind">${kind}${assisted}${offline}</span><strong>${escapeHtml(videoContentLabel(listedVideo))}</strong>`;
      button.title = `${kind}: ${videoContentLabel(listedVideo)}${playable?'':' (arquivo indisponível agora — a aula continua marcável)'}`;
      button.classList.toggle('video-tab-unavailable', !playable);
    });
  }
  document.querySelectorAll('[data-video-seek]').forEach(button => {
    const bookmarkId=button.closest('[data-video-bookmark-id]')?.dataset.videoBookmarkId || '';
    const bookmark=bookmarks.find(item=>item.id===bookmarkId);
    const timeInput = document.createElement('input');
    timeInput.className = 'video-bookmark-time';
    timeInput.type = 'text';
    timeInput.inputMode = 'numeric';
    timeInput.value = formatVideoTime(bookmark?.time || 0);
    timeInput.dataset.videoBookmarkTime = bookmarkId;
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
    ui.videoSourceId=preferredVideoSource(selectedLesson)?.id||'';
    setVideoLastOpen(ui.videoLessonId, ui.videoSourceId);
    saveStateOnly();
    syncRouteFromUI('push');
    renderAulas();
  });
  document.querySelectorAll('[data-video-source]').forEach(button => button.onclick = event => { stopAutoStudy('video'); saveOpenVideoPosition(); ui.videoSourceId=event.currentTarget.dataset.videoSource; setVideoLastOpen(ui.videoLessonId, ui.videoSourceId); saveStateOnly(); syncRouteFromUI('push'); renderAulas(); });
  const setVideoFocusMode = enabled => {
    ui.videoFocusMode = enabled;
    localStorage.setItem(VIDEO_FOCUS_KEY, ui.videoFocusMode ? '1' : '0');
    const layout=mount.querySelector('.video-layout');
    const button=document.getElementById('toggleVideoFocus');
    layout?.classList.toggle('video-focus-mode',ui.videoFocusMode);
    if(button) {
      button.setAttribute('aria-pressed',String(ui.videoFocusMode));
      button.title=ui.videoFocusMode?'Voltar ao layout completo':'Expandir o vídeo e manter os pontos importantes';
      button.innerHTML=ui.videoFocusMode?'Sair do foco':`${iconSvg('focus',{weight:'regular'})} Modo foco`;
    }
  };
  document.getElementById('toggleVideoFocus')?.addEventListener('click', () => setVideoFocusMode(!ui.videoFocusMode));
  document.querySelectorAll('[data-video-questions]').forEach(button => button.onclick = event => openQuestionsForSchedule(event.currentTarget.dataset.videoQuestions));
  document.querySelectorAll('[data-video-materials]').forEach(button => button.onclick = event => openMaterialsForSchedule(event.currentTarget.dataset.videoMaterials));
  bindVideoPlayer(source, schedule, lesson);
  const pinButton = document.getElementById('toggleVideoPin');
  if(pinButton && lesson && source) pinButton.onclick = () => togglePinnedVideo(lesson, source);
  const addVideoCard = document.getElementById('addVideoFlashcard');
  if(addVideoCard) addVideoCard.onclick = () => addVideoFlashcard(source, lesson, schedule);
  document.querySelectorAll('[data-video-card][data-card-id][data-card-field]').forEach(input => {
    input.oninput = event => updateVideoFlashcard(event.currentTarget);
    input.onchange = event => updateVideoFlashcard(event.currentTarget);
  });
  bindFlashcardMarkdownTools(document.getElementById('aulas') || document);
  document.querySelectorAll('[data-remove-video-card]').forEach(button => button.onclick = event => {
    event.preventDefault();
    event.stopPropagation();
    removeVideoFlashcard(event.currentTarget.dataset.removeVideoCard, event.currentTarget.dataset.cardId);
  });
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
    setVideoLastOpen(lesson.id, nextSource.id);
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
  activeVideoProgressCleanup?.();
  activeVideoProgressCleanup=null;
  const video = document.getElementById('lessonVideo');
  if(!video) return;
  // Pede ao navegador para manter dados adiantados mesmo enquanto a aula está pausada.
  // O navegador ainda pode limitar o volume conforme a conexão, economia de dados ou servidor.
  video.preload='auto';
  if(video.readyState < 3) video.load();
  const videoStage=document.getElementById('lessonVideoStage');
  const cleanFrameToggle=document.getElementById('toggleVideoCleanFrame');
  let cleanFrame=false;
  const setCleanFrame=enabled => {
    cleanFrame=Boolean(enabled);
    video.controls=!cleanFrame;
    videoStage?.classList.toggle('clean-frame',cleanFrame);
    if(cleanFrameToggle) {
      cleanFrameToggle.setAttribute('aria-label',cleanFrame?'Clique para mostrar os controles':'Clique fora do centro para ocultar os controles');
      cleanFrameToggle.title=cleanFrame?'Clique para mostrar os controles':'Clique fora do centro para ocultar os controles, ou no centro para pausar/reproduzir';
    }
  };
  // Estilo YouTube: clicando fora do centro do vídeo, a interface some e deixa a
  // imagem livre; um novo clique (em qualquer ponto) traz a interface de volta.
  // Clicar no centro alterna play/pause sem mexer na interface.
  cleanFrameToggle?.addEventListener('click',event=>{
    event.preventDefault();
    event.stopPropagation();
    if(cleanFrame) { setCleanFrame(false); return; }
    const rect=cleanFrameToggle.getBoundingClientRect();
    const dx=event.clientX-(rect.left+rect.width/2);
    const dy=event.clientY-(rect.top+rect.height/2);
    const centerRadius=Math.min(rect.width,rect.height)*.18;
    if(Math.hypot(dx,dy)<=centerRadius) {
      if(video.paused) video.play().catch(()=>{});
      else video.pause();
      return;
    }
    setCleanFrame(true);
  });
  const storedProgress=state.videoPlayer.progress?.[source.id]||{};
  const progressResume=PlannerUX?.resumeTime(storedProgress) ?? n(storedProgress.currentTime);
  const checkpointResume=n(state.videoPlayer.resume[source.id]);
  const progressUpdatedAt=timestampOf(storedProgress.updatedAt);
  const checkpointUpdatedAt=timestampOf(state.videoPlayer.resumeUpdatedAt?.[source.id]);
  // O checkpoint e o registro completo coexistem por compatibilidade. Se uma busca
  // manual acabou de acontecer, o checkpoint pode ser mais novo que o registro
  // completo; nesse caso ele é a fonte correta para a retomada.
  let resume = checkpointUpdatedAt > progressUpdatedAt ? checkpointResume : progressResume;
  let lastCheckpoint = Math.floor(resume);
  let restoringPosition = false;
  let manualSeek = false;
  let restoringRate = false;
  let bookmarkTimeFrozen = null;
  const refreshVideoKeepingPlayback = () => {
    const currentTime = Math.floor(video.currentTime || 0);
    const wasPlaying = !video.paused;
    const playbackRate = video.playbackRate || 1;
    saveVideoResume(source.id, currentTime);
    setVideoLastOpen(ui.videoLessonId || '', source.id);
    saveStateOnly();
    renderAulas();
    requestAnimationFrame(() => {
      const nextVideo = document.getElementById('lessonVideo');
      if(!nextVideo) return;
      nextVideo.currentTime = currentTime;
      nextVideo.defaultPlaybackRate = playbackRate;
      nextVideo.playbackRate = playbackRate;
      if(wasPlaying) nextVideo.play().catch(() => {});
    });
  };
  const applyPreferredRate = () => {
    // ui.videoPlaybackRate é sempre atualizado a cada mudança real; storedProgress é só
    // uma foto tirada na abertura do vídeo e não deve prevalecer sobre uma escolha mais recente.
    const rate = rememberVideoPlaybackRate(n(ui.videoPlaybackRate) || n(storedProgress.playbackRate) || 1);
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
    // A busca inicial pode emitir `seeking` com atraso em arquivos locais grandes.
    // Mantemos a janela de restauração ativa até depois das tentativas de
    // estabilização, evitando confundir esse evento com uma busca do usuário.
    setTimeout(() => { restoringPosition = false; }, 1500);
    return safeTarget;
  };
  video.addEventListener('seeking', () => { if(!restoringPosition) manualSeek = true; });
  let resumeApplied = false;
  const applyResume = () => {
    if(resumeApplied || manualSeek || resume <= 0 || resume >= (video.duration || Infinity) - .1) return;
    resumeApplied = true;
    setVideoTime(resume);
    // Alguns MP4s locais aceitam a primeira busca antes de o índice do arquivo
    // estabilizar e voltam silenciosamente ao início. As verificações garantem a
    // retomada sem interferir se a pessoa já buscou outro trecho manualmente.
    [180,650].forEach(delay => setTimeout(() => {
      if(!manualSeek && Math.abs((video.currentTime || 0) - resume) > 1) setVideoTime(resume);
    }, delay));
  };
  video.addEventListener('loadedmetadata', applyResume, {once:true});
  video.addEventListener('loadeddata', applyResume, {once:true});
  video.addEventListener('canplay', applyResume, {once:true});
  if(video.readyState >= 1) queueMicrotask(applyResume);
  video.addEventListener('loadedmetadata', applyPreferredRate);
  video.addEventListener('canplay', applyPreferredRate);
  video.addEventListener('playing', applyPreferredRate);
  video.addEventListener('ratechange', () => {
    // Alguns navegadores resetam a velocidade sozinhos ao pausar ou buscar um trecho.
    // Em vez de gravar esse reset como se fosse escolha do usuário, apenas corrigimos de volta.
    if(!restoringRate) applyPreferredRate();
  });
  const saveProgress = () => { saveVideoProgressRecord(source,video,schedule,lesson); saveStateOnly({invalidate:false}); };
  video.addEventListener('play', () => { setCleanFrame(false); videoStage?.classList.remove('is-paused'); startAutoStudy('video', schedule?.id || ''); });
  video.addEventListener('pause', () => { videoStage?.classList.add('is-paused'); pauseAutoStudy('video'); saveProgress(); applyPreferredRate(); });
  video.addEventListener('seeked', () => { saveProgress(); applyPreferredRate(); });
  video.addEventListener('ended', () => {
    stopAutoStudy('video', false);
    saveVideoProgressRecord(source,video,schedule,lesson,{completed:true});
    setVideoWatchedState(source.id, true);
    const nextSource = nextCompleteVideoSource(lesson, source);
    saveStateOnly();
    renderAulas();
    if(nextSource) showVideoContinuationPrompt(lesson, source, nextSource);
  });
  video.addEventListener('timeupdate', () => {
    const currentSecond = Math.floor(video.currentTime || 0);
    const stamp=document.getElementById('videoBookmarkTime');
    if(stamp && bookmarkTimeFrozen === null) stamp.textContent=formatVideoTime(currentSecond);
    const chapterButtons = [...document.querySelectorAll('[data-video-seek]')];
    let activeChapter = -1;
    chapterButtons.forEach((button, index) => {
      if(Number(button.dataset.videoSeek) <= currentSecond) activeChapter = index;
    });
    chapterButtons.forEach((button, index) => button.closest('.video-bookmark')?.classList.toggle('active', index === activeChapter));
    if(currentSecond >= lastCheckpoint + 5) {
      lastCheckpoint = currentSecond;
      saveProgress();
    }
  });
  const saveWhenHidden=()=>{if(document.visibilityState==='hidden') saveProgress();};
  const saveOnPageHide=()=>saveProgress();
  document.addEventListener('visibilitychange',saveWhenHidden);
  window.addEventListener('pagehide',saveOnPageHide);
  activeVideoProgressCleanup=()=>{
    saveProgress();
    document.removeEventListener('visibilitychange',saveWhenHidden);
    window.removeEventListener('pagehide',saveOnPageHide);
  };
  document.getElementById('videoBack10')?.addEventListener('click', () => { manualSeek=true; resume=setVideoTime(video.currentTime-10); saveVideoResume(source.id, resume); saveStateOnly(); });
  document.getElementById('videoForward10')?.addEventListener('click', () => { manualSeek=true; resume=setVideoTime(video.currentTime+10); saveVideoResume(source.id, resume); saveStateOnly(); });
  const rateSelect = document.getElementById('videoPlaybackRate');
  if(rateSelect) {
    rateSelect.value = String(rememberVideoPlaybackRate(n(ui.videoPlaybackRate) || n(storedProgress.playbackRate) || 1));
    rateSelect.addEventListener('change', event => {
      const rate = rememberVideoPlaybackRate(Number(event.target.value));
      video.defaultPlaybackRate=rate;
      video.playbackRate=rate;
      saveVideoProgressRecord(source,video,schedule,lesson);
      saveStateOnly({invalidate:false});
    });
  }
  document.getElementById('videoMarkWatched')?.addEventListener('click', () => { setVideoWatchedState(source.id, !state.videoPlayer.watched[source.id]); saveStateOnly(); renderAulas(); });
  const bookmarkLabelInput = document.getElementById('videoBookmarkLabel');
  bookmarkLabelInput?.addEventListener('input', () => {
    const hasText = bookmarkLabelInput.value.trim().length > 0;
    const stamp = document.getElementById('videoBookmarkTime');
    if(hasText && bookmarkTimeFrozen === null) bookmarkTimeFrozen = Math.floor(video.currentTime || 0);
    if(!hasText) bookmarkTimeFrozen = null;
    if(stamp) stamp.textContent = formatVideoTime(bookmarkTimeFrozen ?? Math.floor(video.currentTime || 0));
  });
  bookmarkLabelInput?.addEventListener('keydown',event=>{
    if(event.key!=='Enter' || event.isComposing) return;
    event.preventDefault();
    document.getElementById('addVideoBookmark')?.click();
  });
  document.getElementById('addVideoBookmark')?.addEventListener('click', () => {
    const label = bookmarkLabelInput?.value.trim() || '';
    if(!label) { document.getElementById('videoBookmarkLabel').focus(); return; }
    const entries = state.videoPlayer.bookmarks[source.id] || [];
    const now = new Date().toISOString();
    entries.push({id:`bookmark-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,time:bookmarkTimeFrozen ?? Math.floor(video.currentTime || 0),label,starred:false,createdAt:now,updatedAt:now});
    state.videoPlayer.bookmarks[source.id] = entries.sort((a,b)=>a.time-b.time);
    // Atualiza a lista sem interromper o vídeo que já estava em reprodução.
    refreshVideoKeepingPlayback();
  });
  const seekToBookmark = seconds => {
    const target = Math.max(0, Number(seconds) || 0);
    // O ponto salvo passa a ser também a retomada. Assim o navegador não volta ao início
    // se recarregar os metadados do MP4 durante a busca.
    manualSeek = true;
    resume = target;
    saveVideoResume(source.id, target);
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
      const bookmark = entries.find(item=>item.id===input.dataset.videoBookmarkTime);
      const parsed = parseVideoTime(input.value);
      if(!bookmark || parsed === null || parsed < 0) {
        input.value = formatVideoTime(bookmark?.time || 0);
        return;
      }
      const nextTime = Math.floor(Number.isFinite(video.duration) ? Math.min(parsed, Math.max(0, video.duration - .1)) : parsed);
      // O nome pode ter acabado de ser editado na tela. Mesclamos somente o
      // tempo com o registro atual, sem reconstruir o ponto a partir de uma
      // cópia antiga nem redesenhar o vídeo.
      const visibleLabel = input.closest('.video-bookmark')?.querySelector('.video-bookmark-label')?.textContent?.trim();
      const updated = {...bookmark, time:nextTime, label:visibleLabel || bookmark.label || 'Ponto importante', updatedAt:new Date().toISOString()};
      state.videoPlayer.bookmarks[source.id] = entries.map(item => item.id === bookmark.id ? updated : item).sort((a,b) => a.time-b.time);
      const seekButton = input.previousElementSibling;
      if(seekButton?.matches?.('[data-video-seek]')) {
        seekButton.dataset.videoSeek = String(nextTime);
        seekButton.textContent = formatVideoTime(nextTime);
      }
      saveStateOnly();
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
    const bookmarkId=event.currentTarget.dataset.videoBookmarkEdit;
    const entry = state.videoPlayer.bookmarks[source.id]?.find(item=>item.id===bookmarkId);
    const row = event.currentTarget.closest('.video-bookmark');
    if(!entry || !row) return;
    const label = row.querySelector('.video-bookmark-label');
    if(!label) return;
    if(row.dataset.editing === '1') {
      const input = row.querySelector('.video-bookmark-label-input');
      entry.label = input?.value.trim() || 'Ponto importante';
      entry.updatedAt = new Date().toISOString();
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
  document.querySelectorAll('[data-video-bookmark-delete]').forEach(button => button.onclick = event => { const id=event.currentTarget.dataset.videoBookmarkDelete; state.videoPlayer.bookmarks[source.id]=state.videoPlayer.bookmarks[source.id].filter(item=>item.id!==id); saveStateOnly(); renderAulas(); });
  document.querySelectorAll('[data-video-bookmark-star]').forEach(button => button.onclick = event => { const id=event.currentTarget.dataset.videoBookmarkStar; const entries=state.videoPlayer.bookmarks[source.id] || []; const bookmark=entries.find(item=>item.id===id); if(!bookmark) return; bookmark.starred=!bookmark.starred; bookmark.updatedAt=new Date().toISOString(); saveStateOnly(); renderAulas(); });
}
async function loadVideoCatalog() {
  try {
    const response = await fetch('video_library/catalog.json', {cache:'no-store'});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    videoCatalog = Array.isArray(payload.lessons) ? payload.lessons : [];
    videoCatalogStatus = `${videoCatalog.length} aulas locais disponíveis`;
    markCompletedLessonsThroughBlockNine();
    reconcileCompletedBlockXP();
  } catch(error) {
    console.warn('Catálogo de videoaulas indisponível:', error);
    videoCatalog = [];
    videoCatalogStatus = 'Não encontrei o catálogo de videoaulas locais';
  }
  renderCache.videoDisplay = null;
  renderCache.videoLessons.clear();
  if(ui.tab === 'aulas') renderAulas();
  else render();
}
function flashcardCreationAllowed(result) {
  return Boolean(result);
}
function flashcardCreationReason(result) {
  if(!result) return '';
  if(!result.correct && result.missReason === 'Dúvida / já vi') return 'Liberado porque você errou em dúvida/já vi.';
  if(!result.correct) return 'Liberado porque você errou a questão.';
  return 'Liberado para transformar o acerto em revisão ativa.';
}
const FSRS_WEIGHTS = [0.4072,1.1829,3.1262,15.4722,7.2102,0.5316,1.0651,0.0234,1.616,0.1544,1.0824,1.9813,0.0953,0.2975,2.2042,0.2407,2.9466,0.5034,0.6567,0.1852,0.2007];
const FSRS_RATINGS = {again:1, hard:2, good:3, easy:4};
function newFlashcardId(prefix='fc') { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function flashcardCreatedTime(card) {
  const createdAt = Date.parse(card?.createdAt || '');
  if(Number.isFinite(createdAt)) return createdAt;
  const timestamp = String(card?.id || '').match(/(?:^|-)\d{13}(?:-|$)/)?.[0]?.replaceAll('-', '');
  return timestamp ? n(timestamp) : 0;
}
function flashcardsInBuildOrder(cards) {
  return [...cards].sort((a,b) => flashcardCreatedTime(a) - flashcardCreatedTime(b));
}
// Nos editores de captura (vídeo e questão) o card recém-criado precisa ficar à
// vista, no topo, em vez de empurrar a lista para baixo a cada novo flashcard.
function flashcardsNewestFirst(cards) {
  return [...cards].sort((a,b) => flashcardCreatedTime(b) - flashcardCreatedTime(a));
}
function renderFlashcardMarkdownToolbar() {
  return `<div class="flashcard-md-toolbar" role="toolbar" aria-label="Formatação do flashcard">
    <button type="button" class="flashcard-md-tool" data-fc-md-prefix="**" data-fc-md-suffix="**" title="Negrito"><strong>B</strong></button>
    <button type="button" class="flashcard-md-tool" data-fc-md-prefix="*" data-fc-md-suffix="*" title="Itálico"><em>I</em></button>
    <button type="button" class="flashcard-md-tool" data-fc-md-prefix="++" data-fc-md-suffix="++" title="Sublinhado"><u>S</u></button>
    <button type="button" class="flashcard-md-tool marker" data-fc-md-prefix="==" data-fc-md-suffix="==" title="Marca-texto">Marca</button>
    <button type="button" class="flashcard-md-tool color blue" data-fc-md-prefix="{{blue|" data-fc-md-suffix="}}" title="Texto azul" aria-label="Texto azul"></button>
    <button type="button" class="flashcard-md-tool color green" data-fc-md-prefix="{{green|" data-fc-md-suffix="}}" title="Texto verde" aria-label="Texto verde"></button>
    <button type="button" class="flashcard-md-tool color red" data-fc-md-prefix="{{red|" data-fc-md-suffix="}}" title="Texto vermelho" aria-label="Texto vermelho"></button>
    <label class="flashcard-md-tool" title="Inserir imagem">Imagem<input type="file" accept="image/*" class="hidden" data-fc-md-image></label>
  </div>`;
}
function renderFlashcardMarkdownField(attributes, value, placeholder) {
  return `<div class="flashcard-md-field">${renderFlashcardMarkdownToolbar()}<textarea class="textarea flashcard-markdown-input" ${attributes} placeholder="${escapeAttr(placeholder)}">${escapeHtml(value || '')}</textarea></div>`;
}
function renderClozeAwareFlashcardFields(sourceAttr, card, basicFrontPlaceholder, basicBackPlaceholder) {
  const isCloze = card.cardType === 'cloze';
  return `<label class="fc-card-type-field">Tipo de card<select class="input" ${sourceAttr} data-card-id="${escapeAttr(card.id)}" data-card-field="cardType"><option value="basic" ${isCloze?'':'selected'}>Básico (frente/verso)</option><option value="cloze" ${isCloze?'selected':''}>Cloze (ocluir palavra)</option></select></label>${renderFlashcardMarkdownField(`${sourceAttr} data-card-id="${escapeAttr(card.id)}" data-card-field="front" id="fcEdit-${escapeAttr(card.id)}-front"`,card.front,isCloze?'Texto com lacunas, ex.: {{c1::resposta}}':basicFrontPlaceholder)}${isCloze ? `<div class="fc-cloze-tools"><button type="button" class="tiny-btn" data-fc-insert-cloze-edit="${escapeAttr(card.id)}">Marcar seleção como lacuna</button><span class="muted">Selecione o trecho a esconder e clique, ou digite {{c1::texto}}. Use c2, c3... para lacunas independentes.</span></div>` : ''}${renderFlashcardMarkdownField(`${sourceAttr} data-card-id="${escapeAttr(card.id)}" data-card-field="back"`,card.back,isCloze?'Extra (opcional, só aparece na resposta)':basicBackPlaceholder)}`;
}
function bindFlashcardMarkdownTools(root=document) {
  root.querySelectorAll('[data-fc-md-prefix],[data-fc-md-line]').forEach(button => button.onclick = event => {
    event.preventDefault();
    const textarea = event.currentTarget.closest('.flashcard-md-field')?.querySelector('textarea');
    if(!textarea) return;
    if(event.currentTarget.dataset.fcMdLine !== undefined) prefixMarkdownLine(textarea,event.currentTarget.dataset.fcMdLine);
    else insertMarkdownAtSelection(textarea,event.currentTarget.dataset.fcMdPrefix || '',event.currentTarget.dataset.fcMdSuffix || '');
  });
  root.querySelectorAll('[data-fc-md-image]').forEach(input => input.onchange = async event => {
    const file = event.target.files?.[0];
    const textarea = event.currentTarget.closest('.flashcard-md-field')?.querySelector('textarea');
    event.target.value = '';
    if(!file || !textarea) return;
    const id = await storeFlashcardImage(file);
    if(id) insertMarkdownAtSelection(textarea, `![Imagem](flashcard-image:${id})`, '');
  });
  root.querySelectorAll('.flashcard-markdown-input').forEach(textarea => textarea.onpaste = async event => {
    const image = [...(event.clipboardData?.files || [])].find(file => file.type.startsWith('image/'));
    if(!image) return;
    event.preventDefault();
    const id = await storeFlashcardImage(image);
    if(id) insertMarkdownAtSelection(textarea, `![Imagem](flashcard-image:${id})`, '');
  });
  root.querySelectorAll('[data-fc-insert-cloze-edit]').forEach(button => button.onclick = () => {
    const textarea = document.getElementById(`fcEdit-${button.dataset.fcInsertClozeEdit}-front`);
    if(!textarea) return;
    const nextNumber = Math.max(0, ...flashcardClozeNumbers(textarea.value)) + 1;
    const hadSelection = textarea.selectionStart !== textarea.selectionEnd;
    const prefixLength = `{{c${nextNumber}::`.length;
    const insertStart = textarea.selectionStart;
    insertMarkdownAtSelection(textarea, `{{c${nextNumber}::`, `}}`);
    if(!hadSelection) textarea.setSelectionRange(insertStart + prefixLength, insertStart + prefixLength);
  });
}
function normalizeFlashcardRecord(card) {
  if(!card || typeof card !== 'object') return card;
  card.cardType = card.cardType === 'cloze' ? 'cloze' : 'basic';
  card.weeklyBlockId = String(card.weeklyBlockId ?? card.block ?? '');
  card.subjectId = String(card.subjectId ?? card.scheduleId ?? '');
  card.area = card.area || 'Sem área';
  card.subarea = card.subarea || card.topic || 'Sem assunto';
  card.subject = card.subject || card.subarea || card.topic || 'Sem assunto';
  card.sourceType = card.sourceType || (card.questionId ? 'question' : card.videoId ? 'video' : card.source === 'Anki' ? 'import' : 'manual');
  card.sourceReference = card.sourceReference || card.questionId || card.videoId || card.scheduleId || '';
  card.sourceLocator = card.sourceLocator || card.topic || '';
  card.tags = Array.isArray(card.tags) ? card.tags : String(card.tags || '').split(/[,;\s]+/).filter(Boolean);
  card.schedulerProfileId = card.schedulerProfileId || 'default';
  card.state = card.state || 'new';
  card.due = card.due || state.flashcardProgress?.[card.id]?.nextReview || localISODate(new Date());
  card.stability = Math.max(0, n(card.stability));
  card.difficulty = Math.max(1, Math.min(10, n(card.difficulty) || 5));
  card.scheduledDays = Math.max(0, n(card.scheduledDays));
  card.learningSteps = Math.max(0, n(card.learningSteps));
  card.reps = Math.max(0, n(card.reps) || n(state.flashcardProgress?.[card.id]?.reviews));
  card.lapses = Math.max(0, n(card.lapses) || n(state.flashcardProgress?.[card.id]?.lapses));
  card.lastReview = card.lastReview || state.flashcardProgress?.[card.id]?.lastReviewedAt || '';
  card.contentVersion = Math.max(1, n(card.contentVersion) || 1);
  card.rowVersion = Math.max(1, n(card.rowVersion) || 1);
  card.isSuspended = Boolean(card.isSuspended || state.flashcardProgress?.[card.id]?.status === 'Suspenso');
  return card;
}
function flashcardContentWarnings(card) {
  const warnings = [];
  const front = String(card?.front || '').trim();
  const back = String(card?.back || '').trim();
  if(front.split(/\s+/).filter(Boolean).length > 80) warnings.push('A frente está longa; tente deixar uma pergunta central.');
  if(back.split(/\s+/).filter(Boolean).length > 100) warnings.push('O verso está longo; considere dividir em dois cards.');
  if((front.match(/\?/g) || []).length > 1) warnings.push('Há mais de uma pergunta na frente.');
  if(/\be\/ou\b|\betc\.\b/i.test(front)) warnings.push('Evite perguntas vagas ou listas abertas.');
  return warnings;
}
function flashcardHasContent(card) {
  if(!card?.front) return false;
  if(card.cardType === 'cloze') return flashcardClozeNumbers(card.front).length > 0;
  return Boolean(card.back);
}
function flashcardAllRecords() {
  const records = [...manualFlashcards(), ...(state.flashcardLibrary || [])];
  const seen = new Set();
  return records.filter(card => {
    normalizeFlashcardRecord(card);
    if(!card.id || seen.has(card.id) || card.deletedAt) return false;
    seen.add(card.id);
    return flashcardHasContent(card);
  });
}
function mutableFlashcardRecord(id) {
  const sources = [
    ...Object.values(state.questionFlashcards || {}).flat(),
    ...Object.values(state.videoFlashcards || {}).flat(),
    ...(state.flashcardLibrary || [])
  ];
  return sources.find(card => card?.id === id) || null;
}
function fsrsIntervalDays(card, rating, nextStability) {
  const profile = state.flashcardSystem.profile;
  const retention = Math.max(0.7, Math.min(0.99, n(profile.targetRetention) || 0.9));
  if(rating === 1) return 0;
  const base = Math.max(0.25, nextStability * Math.log(retention) / Math.log(0.9));
  const multiplier = rating === 2 ? 0.7 : rating === 3 ? 1 : 1.35;
  const interval = Math.max(1, Math.round(base * multiplier));
  if(!profile.fuzz || interval < 7) return Math.min(n(profile.maximumInterval) || 3650, interval);
  const fuzz = Math.max(1, Math.round(interval * 0.08));
  return Math.min(n(profile.maximumInterval) || 3650, Math.max(1, interval + Math.round((Math.random() * 2 - 1) * fuzz)));
}
function nextFsrsProgress(card, rating) {
  const current = normalizeFlashcardRecord({...card});
  const r = Math.max(1, Math.min(4, n(rating) || 3));
  const oldStability = Math.max(0, n(current.stability));
  const oldDifficulty = Math.max(1, Math.min(10, n(current.difficulty) || 5));
  const first = !current.reps;
  const recall = r === 1 ? 0.15 : r === 2 ? 0.55 : r === 3 ? 0.82 : 0.95;
  let stability = first ? (r === 4 ? 3.5 : r === 3 ? 1.5 : 0.5) : oldStability * (r === 1 ? 0.35 : r === 2 ? 0.85 : r === 3 ? 1.65 : 2.45);
  stability = Math.max(0.5, stability + FSRS_WEIGHTS[5] * recall * 0.1);
  const difficulty = Math.max(1, Math.min(10, oldDifficulty + (5 - r) * 0.35 - (r === 4 ? 0.3 : 0)));
  const scheduledDays = fsrsIntervalDays(current, r, stability);
  const dueDate = new Date();
  if(scheduledDays < 1) dueDate.setMinutes(dueDate.getMinutes() + (r === 1 ? 10 : 20));
  else dueDate.setDate(dueDate.getDate() + scheduledDays);
  return { state:r === 1 ? 'relearning' : first ? 'learning' : 'review', stability, difficulty, scheduledDays, learningSteps:r === 1 ? 1 : 0, reps:n(current.reps) + 1, lapses:n(current.lapses) + (r === 1 ? 1 : 0), due:localISODate(dueDate), dueAt:dueDate.toISOString(), interval:scheduledDays, ease:Math.max(1.3, 2.5 - (difficulty - 5) * 0.08), status:r === 1 ? 'Difícil' : r === 2 ? 'Dúvida' : r === 4 ? 'Fácil' : 'Bom', lastRating:r };
}
function manualFlashcards() {
  if(renderCache.manualCards) return renderCache.manualCards;
  const questionCards = Object.entries(state.questionFlashcards || {}).flatMap(([questionId,cards]) => {
    const question = questionBank.find(item => item.id === questionId);
    const result = question ? questionResult(question) : null;
    const linked = result?.scheduleId ? state.schedule.find(item => item.id === result.scheduleId) : question ? scheduleForQuestion(question) : null;
    return flashcardsInBuildOrder(Array.isArray(cards) ? cards : []).filter(flashcardHasContent).map(card => ({
      ...card,
      questionId,
      scheduleId: card.scheduleId || linked?.id || '',
      block: card.block || linked?.block || question?.collectionBlock || '',
      area: card.area || linked?.area || question?.area || 'Sem área',
      subarea: card.subarea || card.topic || linked?.topic || question?.topic || 'Sem subárea',
      topic: card.topic || linked?.topic || question?.topic || 'Sem aula vinculada'
    }));
  });
  const videoCards = Object.entries(state.videoFlashcards || {}).flatMap(([videoId,cards]) => flashcardsInBuildOrder(Array.isArray(cards) ? cards : []).filter(flashcardHasContent).map(card => ({
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
let everGoodCardIdsCache = null;
let everGoodCardIdsCacheLen = -1;
function everGoodCardIds() {
  const logs = state.flashcardSystem?.reviewLogs || [];
  if(everGoodCardIdsCache && everGoodCardIdsCacheLen === logs.length) return everGoodCardIdsCache;
  const set = new Set();
  logs.forEach(log => { if(n(log.rating) >= 3) set.add(log.cardId); });
  everGoodCardIdsCache = set;
  everGoodCardIdsCacheLen = logs.length;
  return set;
}
function flashcardProgress(card) {
  const progress = state.flashcardProgress[card.id] || {};
  let dueAt = progress.dueAt || card.dueAt || '';
  if(!dueAt && n(progress.lastRating || progress.lastQuality) === 1 && progress.lastReviewedAt) {
    const reviewedAt = Date.parse(progress.lastReviewedAt);
    if(Number.isFinite(reviewedAt)) dueAt = new Date(reviewedAt + 10 * 60 * 1000).toISOString();
  }
  return {
    ease: Math.max(1.3, n(progress.ease) || n(card.ease) || 2.5),
    interval: Math.max(0, n(progress.interval) || n(card.scheduledDays)),
    repetitions: Math.max(0, n(progress.repetitions) || n(card.reps)),
    reviews: Math.max(0, n(progress.reviews) || n(card.reps)),
    lapses: Math.max(0, n(progress.lapses) || n(card.lapses)),
    stability: Math.max(0, n(progress.stability) || n(card.stability)),
    difficulty: Math.max(1, n(progress.difficulty) || n(card.difficulty) || 5),
    lastRating: n(progress.lastRating || progress.lastQuality),
    status: progress.status || (card.isSuspended ? 'Suspenso' : card.state === 'new' ? 'Novo' : 'Bom'),
    lastReviewedAt: progress.lastReviewedAt || '',
    nextReview: progress.nextReview || card.due || localISODate(new Date()),
    everGood: Boolean(progress.everGood) || everGoodCardIds().has(card.id),
    dueAt
  };
}
function isFlashcardDue(card, date=localISODate(new Date())) {
  const progress = flashcardProgress(card);
  if(progress.dueAt) {
    const timestamp = Date.parse(progress.dueAt);
    if(Number.isFinite(timestamp)) return timestamp <= Date.now();
  }
  return progress.nextReview <= date;
}
function flashcardReviewsToday() {
  const today = studyDateKey();
  return (state.flashcardSystem?.reviewLogs || []).filter(review => studyDateKey(review.reviewedAt) === today).length;
}
function flashcardNewToday() {
  const today = studyDateKey();
  return Object.values(state.flashcardProgress || {}).filter(progress => progress.firstReviewedAt && studyDateKey(progress.firstReviewedAt) === today).length;
}
function flashcardDueForecast(days=7) {
  const cards = flashcardAllRecords();
  const start = new Date(`${localISODate(new Date())}T12:00:00`);
  return Array.from({length:days}, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    const iso = localISODate(date);
    // Hoje absorve o que já está atrasado (como no Anki); os demais dias
    // contam só quem vence exatamente naquela data, senão o total nunca
    // caía e todo dia futuro mostrava o mesmo número acumulado.
    const count = index === 0
      ? cards.filter(card => flashcardProgress(card).nextReview <= iso).length
      : cards.filter(card => flashcardProgress(card).nextReview === iso).length;
    return { date: iso, count };
  });
}
function flashcardStudyQueue(all=manualFlashcards()) {
  const today = localISODate(new Date());
  const newRemaining = Math.max(0, n(state.flashcardSettings.newLimit) - flashcardNewToday());
  const reviewRemaining = Math.max(0, n(state.flashcardSettings.reviewLimit) - flashcardReviewsToday());
  const base = filteredFlashcards(all);
  if(ui.flashcardFilter !== 'Aprendendo') return base;
  const reviews = base
    .filter(card => flashcardProgress(card).reviews > 0 && isFlashcardDue(card, today))
    .sort((a,b)=>String(flashcardProgress(a).dueAt || flashcardProgress(a).nextReview).localeCompare(String(flashcardProgress(b).dueAt || flashcardProgress(b).nextReview)));
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
      || (ui.flashcardFilter === 'Aprendendo' && isFlashcardDue(card, today))
      || (ui.flashcardFilter === 'Revisando' && progress.everGood)
      || (ui.flashcardFilter === 'Novos' && !progress.reviews)
      || (ui.flashcardFilter === 'Maduros' && progress.interval >= 21)
      || (ui.flashcardFilter === 'Difíceis' && (progress.status === 'Difícil' || progress.ease < 2.2))
      || (ui.flashcardFilter === 'Suspensos' && progress.status === 'Suspenso');
    const areaOk = ui.flashcardArea === 'Todas' || card.area === ui.flashcardArea;
    const subareaOk = ui.flashcardSubarea === 'Todas' || card.subarea === ui.flashcardSubarea;
    const blockOk = !ui.flashcardBlock || ui.flashcardBlock === 'Todos' || String(card.weeklyBlockId || card.block) === String(ui.flashcardBlock);
    const subjectOk = !ui.flashcardSubject || (card.subject || card.subarea || card.topic) === ui.flashcardSubject;
    const deckOk = !ui.flashcardDeck || `${card.area}|${card.subarea}` === ui.flashcardDeck;
    return filterOk && areaOk && subareaOk && blockOk && subjectOk && deckOk;
  });
}
function renderFlashcards() {
  const all = flashcardAllRecords();
  const areas = ['Todas', ...new Set(all.map(card => card.area).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const blocks = ['Todos', ...new Set(all.map(card => card.weeklyBlockId || card.block).filter(Boolean))].sort((a,b)=>n(a)-n(b));
  if(!areas.includes(ui.flashcardArea)) ui.flashcardArea = 'Todas';
  const cards = flashcardStudyQueue(all);
  const today = localISODate(new Date());
  const due = all.filter(card => isFlashcardDue(card, today)).length;
  const reviewed = all.filter(card => flashcardProgress(card).reviews > 0).length;
  const mature = all.filter(card => flashcardProgress(card).interval >= 21).length;
  const reviewsToday = flashcardReviewsToday();
  const newToday = flashcardNewToday();
  const forecast = flashcardDueForecast(7);
  if(ui.flashcardCurrentCardId) {
    const anchoredIndex = cards.findIndex(card => card.id === ui.flashcardCurrentCardId);
    if(anchoredIndex >= 0) ui.flashcardIndex = anchoredIndex;
  }
  ui.flashcardIndex = Math.max(0, Math.min(n(ui.flashcardIndex), Math.max(cards.length - 1, 0)));
  const study = ui.flashcardSessionDone ? null : cards[ui.flashcardIndex];
  ui.flashcardCurrentCardId = study?.id || '';
  if(ui.flashcardSpeedMode && ui.flashcardFocusMode && study && !ui.flashcardFocusPaused) {
    if(ui.flashcardSpeedCardId !== study.id) { ui.flashcardSpeedCardId = study.id; ui.flashcardCardStartedAt = Date.now(); ui.flashcardSpeedBeeped = false; }
  } else if(!ui.flashcardFocusPaused) {
    ui.flashcardSpeedCardId = '';
    ui.flashcardCardStartedAt = 0;
  }
  const groups = groupFlashcards(cards);
  const selectedBlock = ui.flashcardBlock || 'Todos';
  const blockCards = selectedBlock === 'Todos' ? all : all.filter(card => String(card.weeklyBlockId || card.block) === String(selectedBlock));
  const subjects = [...new Set(blockCards.map(card => card.subject || card.subarea || card.topic).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  document.getElementById('flashcards').classList.toggle('flashcard-focus-mode', ui.flashcardFocusMode);
  document.getElementById('flashcards').innerHTML = `<div class="card flashcard-command"><div class="flashcard-command-copy"><span class="flashcard-command-icon" aria-hidden="true">${iconSvg('flashcard',{weight:'duotone'})}</span><div><div class="eyebrow">Revisão inteligente</div><h1>Flashcards</h1><div class="muted">Capture, organize e revise por bloco e assunto. Seu perfil FSRS busca ${Math.round(n(state.flashcardSystem.profile.targetRetention)*100)}% de retenção.</div></div></div><div class="flashcard-command-actions"><button class="icon-btn primary" id="newFlashcardBtn">${iconSvg('add',{weight:'bold'})}<span>Novo card</span></button><button class="icon-btn" id="flashcardUndoBtn">Desfazer</button><button class="icon-btn" id="flashcardBackupBtn">Backup</button><button class="icon-btn" id="ankiExportBtn">Exportar</button><button class="icon-btn" id="ankiImportBtn" title="Importar cards de um arquivo exportado do Anki (.tsv)">Importar do Anki</button></div></div>
  <div class="grid cards flashcard-metrics">${metric('Cards no ENAMED', all.length, 'na sua biblioteca')}${metric('Para revisar', due, due===1?'card pede atenção':'cards pedem atenção')}${metric('Revisados hoje', reviewsToday, `${newToday} ${newToday===1?'novo':'novos'}`) }${metric('Maduros', mature, 'intervalo de 21+ dias')}</div>
  <input class="hidden" id="ankiImportFile" type="file" accept=".tsv,.txt,.csv">
  <div class="card flashcard-filters"><label class="flashcard-filter-field"><span>Fila</span><select class="select" id="flashcardFilter">${['Aprendendo','Revisando','Todos','Novos','Difíceis','Maduros','Suspensos'].map(value => `<option ${ui.flashcardFilter===value?'selected':''}>${value}</option>`).join('')}</select></label><label class="flashcard-filter-field"><span>Área</span><select class="select" id="flashcardArea">${areas.map(value => `<option value="${escapeAttr(value)}" ${ui.flashcardArea===value?'selected':''}>${escapeHtml(value)}</option>`).join('')}</select></label><label class="flashcard-target"><span>Novos/dia</span><input class="mini-input" id="flashcardNewLimit" type="number" min="0" value="${n(state.flashcardSettings.newLimit)}"></label><label class="flashcard-target"><span>Revisões/dia</span><input class="mini-input" id="flashcardReviewLimit" type="number" min="0" value="${n(state.flashcardSettings.reviewLimit)}"></label><div class="flashcard-forecast-inline" aria-label="Previsão dos próximos sete dias"><span>Próximos 7 dias</span><strong>${forecast.reduce((sum,item)=>sum+item.count,0)}</strong></div></div>
  <div class="flashcards-workspace">
    <aside class="flashcards-panel flashcard-block-panel"><div class="section-title"><h3>Blocos</h3><span class="badge today">${blocks.length-1}</span></div><button class="flashcard-block-choice ${selectedBlock==='Todos'?'active':''}" data-fc-block="Todos">Todos os blocos <span>${all.length}</span></button>${blocks.slice(1).map(block => `<button class="flashcard-block-choice ${String(selectedBlock)===String(block)?'active':''}" data-fc-block="${escapeAttr(block)}">Bloco ${escapeHtml(block)} <span>${all.filter(card=>String(card.weeklyBlockId||card.block)===String(block)).length}</span></button>`).join('')}<div class="section-title flashcard-deck-title"><h3>Decks</h3>${ui.flashcardDeck?'<button class="tiny-btn" id="flashcardClearDeck">Limpar</button>':''}</div><div class="flashcard-deck-list">${groupFlashcardDecks(all).slice(0,12).map(renderFlashcardDeck).join('') || '<div class="muted">Os decks aparecem conforme você organiza cards por área e assunto.</div>'}</div><div class="muted flashcard-shortcuts">Espaço revela · 1–4 avalia<br>E edita · S suspende · Z desfaz</div></aside>
    <div class="flashcards-panel flashcard-review-column">${ui.flashcardEditorOpen ? renderFlashcardWorkspaceEditor() : renderFlashcardStudy(study, cards)}<div class="flashcard-subject-strip"><div class="section-title"><h3>Assuntos${selectedBlock==='Todos'?'':' · Bloco '+escapeHtml(selectedBlock)}</h3><span>${subjects.length}</span></div><div class="flashcard-subject-list">${subjects.map(subject => `<button class="flashcard-subject-chip" data-fc-subject="${escapeAttr(subject)}">${escapeHtml(subject)} <span>${blockCards.filter(card=>(card.subject||card.subarea||card.topic)===subject).length}</span></button>`).join('') || '<span class="muted">Os assuntos aparecerão aqui conforme os cards forem criados.</span>'}</div></div></div>
    <aside class="flashcards-panel flashcard-indicator-panel"><details class="flashcard-indicator-toggle" ${due>0?'open':''}><summary>Estatísticas e fila<span class="muted">${due>0?`${due} atrasados`:'tudo em dia'}</span></summary><div>${renderFlashcardIndicators(all, cards, reviewed, due)}<div class="section-title"><h3>Radar de fragilidade</h3></div>${renderFlashcardRadar(all)}<div class="section-title"><h3>Próximos dias</h3></div><div class="flashcard-forecast">${forecast.map(item=>`<div><span>${fmtDate(item.date).slice(0,5)}</span><strong>${item.count}</strong></div>`).join('')}</div></div></details></aside>
  </div>
  <div class="card flashcard-library-card"><div class="section-title"><h3>Biblioteca</h3><button class="icon-btn" id="flashcardToggleLibrary">${ui.flashcardShowLibrary?'Ocultar':'Mostrar'} cards (${cards.length})</button></div>${ui.flashcardShowLibrary ? (groups.length ? groups.map(renderFlashcardGroup).join('') : '<div class="empty">Nenhum card neste filtro.</div>') : '<div class="muted">A biblioteca fica recolhida durante a revisão para reduzir distrações.</div>'}</div>`;
  const filter = document.getElementById('flashcardFilter');
  if(filter) filter.onchange = e => { ui.flashcardFilter=e.target.value; ui.flashcardSubject=''; ui.flashcardIndex=0; ui.flashcardSessionDone=false; ui.revealedCards={}; renderFlashcards(); };
  const area = document.getElementById('flashcardArea');
  if(area) area.onchange = e => { ui.flashcardArea=e.target.value; ui.flashcardSubarea='Todas'; ui.flashcardDeck=''; ui.flashcardSubject=''; ui.flashcardIndex=0; ui.flashcardSessionDone=false; ui.revealedCards={}; renderFlashcards(); };
  const subarea = document.getElementById('flashcardSubarea');
  if(subarea) subarea.onchange = e => { ui.flashcardSubarea=e.target.value; ui.flashcardDeck=''; ui.flashcardSubject=''; ui.flashcardIndex=0; ui.flashcardSessionDone=false; ui.revealedCards={}; renderFlashcards(); };
  const clearDeck = document.getElementById('flashcardClearDeck');
  if(clearDeck) clearDeck.onclick = () => { ui.flashcardDeck=''; ui.flashcardIndex=0; ui.flashcardSessionDone=false; ui.revealedCards={}; renderFlashcards(); };
  const toggleLibrary = document.getElementById('flashcardToggleLibrary');
  if(toggleLibrary) toggleLibrary.onclick = () => { ui.flashcardShowLibrary = !ui.flashcardShowLibrary; renderFlashcards(); };
  const focusToggle = document.getElementById('flashcardFocusToggle');
  if(focusToggle) focusToggle.onclick = () => { ui.flashcardFocusMode = !ui.flashcardFocusMode; ui.flashcardFocusPaused = false; renderFlashcards(); };
  const speedToggle = document.getElementById('flashcardSpeedToggle');
  if(speedToggle) speedToggle.onclick = () => { ui.flashcardSpeedMode = !ui.flashcardSpeedMode; ui.flashcardSpeedCardId = ''; ui.flashcardCardStartedAt = 0; ui.flashcardSpeedBeeped = false; renderFlashcards(); };
  const exportBtn = document.getElementById('ankiExportBtn');
  if(exportBtn) exportBtn.onclick = exportAnkiTsv;
  document.getElementById('ankiImportBtn')?.addEventListener('click', () => document.getElementById('ankiImportFile')?.click());
  document.getElementById('ankiImportFile')?.addEventListener('change', importAnkiTsv);
  const backupBtn = document.getElementById('flashcardBackupBtn');
  if(backupBtn) backupBtn.onclick = exportFlashcardBackup;
  const undoBtn = document.getElementById('flashcardUndoBtn');
  if(undoBtn) undoBtn.onclick = undoFlashcardReview;
  const newLimit = document.getElementById('flashcardNewLimit');
  if(newLimit) newLimit.onchange = e => { state.flashcardSettings.newLimit = Math.max(0,n(e.target.value)); persist(); };
  const reviewLimit = document.getElementById('flashcardReviewLimit');
  if(reviewLimit) reviewLimit.onchange = e => { state.flashcardSettings.reviewLimit = Math.max(0,n(e.target.value)); persist(); };
  document.querySelectorAll('[data-fc-block]').forEach(button => button.onclick = e => { ui.flashcardBlock=e.currentTarget.dataset.fcBlock; ui.flashcardSubject=''; ui.flashcardIndex=0; ui.flashcardSessionDone=false; ui.revealedCards={}; renderFlashcards(); });
  document.querySelectorAll('[data-fc-subject]').forEach(button => button.onclick = e => { ui.flashcardSubject=e.currentTarget.dataset.fcSubject; ui.flashcardFilter='Todos'; ui.flashcardIndex=0; ui.flashcardSessionDone=false; renderFlashcards(); });
  const newCard = document.getElementById('newFlashcardBtn');
  if(newCard) newCard.onclick = () => { ui.flashcardEditorOpen=true; ui.flashcardNewCardType='basic'; renderFlashcards(); };
  document.querySelectorAll('[data-fc-save]').forEach(button => button.onclick = saveWorkspaceFlashcard);
  document.querySelectorAll('[data-fc-cancel]').forEach(button => button.onclick = () => { ui.flashcardEditorOpen=false; renderFlashcards(); });
  const newCardType = document.getElementById('fcNewCardType');
  if(newCardType) newCardType.onchange = e => { ui.flashcardNewCardType = e.target.value; renderFlashcards(); };
  const insertCloze = document.getElementById('fcInsertCloze');
  if(insertCloze) insertCloze.onclick = () => {
    const textarea = document.getElementById('fcNewCloze');
    if(!textarea) return;
    const nextNumber = Math.max(0, ...flashcardClozeNumbers(textarea.value)) + 1;
    const hadSelection = textarea.selectionStart !== textarea.selectionEnd;
    const prefixLength = `{{c${nextNumber}::`.length;
    const insertStart = textarea.selectionStart;
    insertMarkdownAtSelection(textarea, `{{c${nextNumber}::`, `}}`);
    if(!hadSelection) textarea.setSelectionRange(insertStart + prefixLength, insertStart + prefixLength);
  };
  document.getElementById('fcNewFront')?.addEventListener('input', updateFlashcardContentWarnings);
  document.getElementById('fcNewBack')?.addEventListener('input', updateFlashcardContentWarnings);
  updateFlashcardContentWarnings();
  document.querySelectorAll('[data-flashcard-deck]').forEach(button => button.onclick = e => { ui.flashcardDeck = e.currentTarget.dataset.flashcardDeck; const [areaValue, subareaValue] = ui.flashcardDeck.split('|'); ui.flashcardArea=areaValue || 'Todas'; ui.flashcardSubarea=subareaValue || 'Todas'; ui.flashcardIndex=0; ui.flashcardSessionDone=false; ui.revealedCards={}; renderFlashcards(); });
  document.querySelectorAll('[data-reveal-card]').forEach(button => button.onclick = e => {
    ui.revealedCards[e.currentTarget.dataset.revealCard] = true;
    renderFlashcards();
  });
  document.querySelectorAll('[data-card-quality]').forEach(button => button.onclick = e => reviewFlashcard(e.currentTarget.dataset.cardId, n(e.currentTarget.dataset.cardQuality)));
  document.querySelectorAll('[data-card-suspend]').forEach(button => button.onclick = e => suspendFlashcard(e.currentTarget.dataset.cardSuspend));
  document.querySelectorAll('[data-flashcard-move]').forEach(button => button.onclick = e => moveFlashcardSession(n(e.currentTarget.dataset.flashcardMove), cards.length));
  document.querySelectorAll('[data-edit-flashcard]').forEach(button => button.onclick = e => { ui.editFlashcardId = e.currentTarget.dataset.editFlashcard; renderFlashcards(); });
  document.querySelectorAll('[data-close-flashcard-edit]').forEach(button => button.onclick = event => {
    event.preventDefault();
    event.stopPropagation();
    ui.editFlashcardId = '';
    renderFlashcards();
  });
  document.querySelectorAll('[data-delete-flashcard]').forEach(button => button.onclick = event => {
    event.preventDefault();
    event.stopPropagation();
    deleteFlashcardFromEditor(event.currentTarget);
  });
  document.querySelectorAll('[data-question-card][data-card-id][data-card-field], [data-library-card][data-card-id][data-card-field]').forEach(input => {
    input.oninput = e => e.currentTarget.dataset.libraryCard ? updateLibraryFlashcard(e.currentTarget) : updateQuestionFlashcard(e.currentTarget);
    input.onchange = e => e.currentTarget.dataset.libraryCard ? updateLibraryFlashcard(e.currentTarget) : updateQuestionFlashcard(e.currentTarget);
  });
  document.querySelectorAll('[data-video-card][data-card-id][data-card-field]').forEach(input => {
    input.oninput = e => updateVideoFlashcard(e.currentTarget);
    input.onchange = e => updateVideoFlashcard(e.currentTarget);
  });
  bindFlashcardMarkdownTools(document.getElementById('flashcards') || document);
  // Flashcards so contam tempo durante o modo foco. Sair do foco pausa (sem
  // zerar) para que uma nova entrada continue exatamente de onde parou.
  if(ui.flashcardFocusMode && study && !ui.flashcardFocusPaused) startAutoStudy('flashcards', study.scheduleId || '');
  else pauseAutoStudy('flashcards');
  const focusClock = document.getElementById('flashcardFocusClock');
  if(focusClock && !ui.flashcardFocusMode) {
    focusClock.textContent = 'Tempo só no foco';
    focusClock.title = 'Entre no modo foco para iniciar o cronômetro';
  } else if(focusClock) {
    focusClock.onclick = () => {
      ui.flashcardFocusPaused = !ui.flashcardFocusPaused;
      renderFlashcards();
    };
  }
}
function renderFlashcardIndicators(all, queue, reviewed, due) {
  const retention = reviewed ? Math.round(all.filter(card => flashcardProgress(card).lastRating >= 3).length / reviewed * 100) : 0;
  return `<div class="fc-indicator"><span>Fila atual</span><strong>${queue.length}</strong><small>prioriza aprendendo, depois novos</small></div><div class="fc-indicator"><span>Retenção observada</span><strong>${retention}%</strong><small>acertos nas revisões registradas</small></div><div class="fc-indicator"><span>Atrasados</span><strong class="fc-alert">${due}</strong><small>cards que pedem atenção</small></div>`;
}
function renderFlashcardRadar(all) {
  const bySubject = new Map();
  all.forEach(card => { const key=card.subject||card.subarea||'Sem assunto'; if(!bySubject.has(key)) bySubject.set(key,{name:key,total:0,weak:0}); const row=bySubject.get(key); row.total++; const p=flashcardProgress(card); if(p.lapses>=2 || p.difficulty>=7 || p.status==='Difícil') row.weak++; });
  return [...bySubject.values()].sort((a,b)=>b.weak-a.weak).slice(0,5).map(row=>`<div class="fc-radar-row"><span>${escapeHtml(row.name)}</span><strong>${row.weak}/${row.total}</strong></div>`).join('') || '<div class="muted">O radar aparece após as primeiras revisões.</div>';
}
function renderFlashcardWorkspaceEditor() {
  const blocks = [...new Set((state.schedule||[]).map(item=>item.block).filter(Boolean))].sort((a,b)=>n(a)-n(b));
  const source=ui.flashcardCaptureSource || {};
  const cardType = ui.flashcardNewCardType === 'cloze' ? 'cloze' : 'basic';
  const contentFields = cardType === 'cloze'
    ? `<label>Texto com lacunas${renderFlashcardMarkdownField('id="fcNewCloze"','','Ex.: O agente mais comum da meningite bacteriana é {{c1::Streptococcus pneumoniae}}.')}</label><div class="fc-cloze-tools"><button type="button" class="tiny-btn" id="fcInsertCloze">Marcar seleção como lacuna</button><span class="muted">Selecione o trecho a esconder e clique, ou digite {{c1::texto}}. Use c2, c3... para lacunas independentes.</span></div><label>Extra (opcional, só aparece na resposta)${renderFlashcardMarkdownField('id="fcNewClozeExtra"','','Explicação adicional, mnemônico, referência...')}</label>`
    : `<label>Frente${renderFlashcardMarkdownField('id="fcNewFront"','','Pergunta, decisão clínica ou conceito discriminativo')}</label><label>Verso${renderFlashcardMarkdownField('id="fcNewBack"','','Resposta curta, objetiva e revisável')}</label>`;
  const warningsBox = cardType === 'basic' ? `<div class="fc-content-warnings" id="fcContentWarnings"></div>` : '';
  return `<div class="flashcard-editor workspace-editor"><div class="section-title"><div><h2>Novo flashcard</h2><div class="muted">Criação livre na aba Flashcards. Use uma ideia por card.${source.key?` Origem: ${escapeHtml(source.label||source.key)}.`:''}</div></div><button class="icon-btn" data-fc-cancel>Cancelar</button></div><div class="fc-editor-grid"><label>Tipo de card<select id="fcNewCardType"><option value="basic" ${cardType==='basic'?'selected':''}>Básico (frente/verso)</option><option value="cloze" ${cardType==='cloze'?'selected':''}>Cloze (lacunas)</option></select></label><label>Bloco<select id="fcNewBlock">${blocks.map(block=>`<option value="${escapeAttr(block)}" ${String(block)===String(source.block)?'selected':''}>Bloco ${escapeHtml(block)}</option>`).join('')}</select></label><label>Assunto<input id="fcNewSubject" class="input" value="${escapeAttr(source.subject||'')}" placeholder="Ex.: Diabetes: diagnóstico"></label><label>Tipo de origem<select id="fcNewSourceType"><option value="manual">Manual</option><option value="question" ${source.type==='question'?'selected':''}>Questão</option><option value="video" ${source.type==='video'?'selected':''}>Videoaula</option><option value="material" ${source.type==='material'?'selected':''}>Material</option></select></label><label>Referência<input id="fcNewSourceRef" class="input" value="${escapeAttr(source.reference||'')}" placeholder="Aula, questão ou material"></label></div>${contentFields}${warningsBox}<label>Tags<input id="fcNewTags" class="input" placeholder="ex.: diabetes diagnóstico alto-rendimento"></label><div class="muted">A origem fica registrada para você voltar ao ponto de estudo. O agendamento começa como card novo.</div><button class="icon-btn primary" data-fc-save>Salvar flashcard</button></div>`;
}
function updateFlashcardContentWarnings() {
  const box = document.getElementById('fcContentWarnings');
  if(!box) return;
  const warnings = flashcardContentWarnings({front: document.getElementById('fcNewFront')?.value, back: document.getElementById('fcNewBack')?.value});
  box.innerHTML = warnings.length ? warnings.map(text => `<div class="fc-content-warning">${iconSvg('warning',{weight:'regular'})}${escapeHtml(text)}</div>`).join('') : '';
}
function openQuickFlashcardCapture() {
  let source={type:'manual',key:`manual-${localISODate(new Date())}`,label:'Captura rápida'};
  if(ui.tab==='questoes') {
    const question=filteredQuestions()[ui.qIndex];
    if(question) source={type:'question',key:`question:${question.id}`,reference:question.id,subject:question.topic||'',block:question.collectionBlock||'',label:`Questão · ${question.topic||question.id}`};
  } else if(ui.tab==='aulas' && state.videoPlayer?.lastOpen?.lessonId) {
    const lesson=videoCatalog.find(item=>item.id===state.videoPlayer.lastOpen.lessonId);
    if(lesson) source={type:'video',key:`video:${lesson.id}`,reference:lesson.id,subject:lesson.title||'',block:lesson.block||'',label:`Vídeo · ${lesson.title||''}`};
  }
  const existing=(state.flashcardSystem.captureSessions||[]).find(item=>item.key===source.key);
  if(existing && n(existing.cardsCreated)>=2) { alert('Esta origem já tem dois cards de captura rápida. Edite ou divida um card na aba Flashcards.'); return; }
  state.flashcardSystem.captureSessions.push({key:source.key,cardsCreated:n(existing?.cardsCreated),maxCards:2,lastOpenedAt:new Date().toISOString()});
  state.flashcardSystem.captureSessions=state.flashcardSystem.captureSessions.filter((item,index,array)=>array.findIndex(other=>other.key===item.key)===index);
  ui.flashcardCaptureSource=source; ui.flashcardEditorOpen=true; sessionStorage.setItem(UI_TAB_KEY,'flashcards'); navigateToTab('flashcards');
}
function saveWorkspaceFlashcard() {
  const cardType = ui.flashcardNewCardType === 'cloze' ? 'cloze' : 'basic';
  let front, back;
  if(cardType === 'cloze') {
    front = document.getElementById('fcNewCloze')?.value.trim();
    back = document.getElementById('fcNewClozeExtra')?.value.trim() || '';
    if(!front || !flashcardClozeNumbers(front).length) { alert('Marque ao menos uma lacuna com {{c1::texto}} antes de salvar.'); return; }
  } else {
    front = document.getElementById('fcNewFront')?.value.trim();
    back = document.getElementById('fcNewBack')?.value.trim();
    if(!front || !back) { alert('Preencha frente e verso antes de salvar.'); return; }
  }
  const card=normalizeFlashcardRecord({id:newFlashcardId(),cardType,front,back,block:document.getElementById('fcNewBlock')?.value||'',weeklyBlockId:document.getElementById('fcNewBlock')?.value||'',subject:document.getElementById('fcNewSubject')?.value.trim()||'Sem assunto',subarea:document.getElementById('fcNewSubject')?.value.trim()||'Sem assunto',sourceType:document.getElementById('fcNewSourceType')?.value||'manual',sourceReference:document.getElementById('fcNewSourceRef')?.value.trim()||'',tags:String(document.getElementById('fcNewTags')?.value||'').split(/[,;\s]+/).filter(Boolean),createdAt:new Date().toISOString()});
  state.flashcardLibrary.push(card); const source=ui.flashcardCaptureSource; if(source?.key) { const session=state.flashcardSystem.captureSessions.find(item=>item.key===source.key); if(session) session.cardsCreated=n(session.cardsCreated)+1; card.sourceReference=source.reference||card.sourceReference; card.sourceLocator=source.label||card.sourceLocator; } state.flashcardSystem.versions.push({cardId:card.id,version:1,kind:'created',at:new Date().toISOString(),front:card.front,back:card.back}); ui.flashcardCaptureSource=null; ui.flashcardEditorOpen=false; renderCache.manualCards=null; persist();
}
function groupFlashcardDecks(cards) {
  const map = new Map();
  cards.forEach(card => {
    const area = card.area || 'Sem área';
    const subarea = card.subarea || 'Sem assunto';
    const key = `${area}|${subarea}`;
    const progress = flashcardProgress(card);
    if(!map.has(key)) map.set(key,{key,area,subarea,total:0,due:0,mature:0});
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
    if(!map.has(key)) map.set(key,{area:card.area||'Sem área',subarea:card.subarea||'Sem assunto',block:card.block||'',topic:card.topic||'',cards:[],newestCreatedTime:0});
    const group = map.get(key);
    group.cards.push(card);
    group.newestCreatedTime = Math.max(group.newestCreatedTime, flashcardCreatedTime(card));
  });
  return [...map.values()].map(group => ({...group, cards: flashcardsInBuildOrder(group.cards)}))
    .sort((a,b)=>b.newestCreatedTime-a.newestCreatedTime || a.area.localeCompare(b.area)||a.subarea.localeCompare(b.subarea)||n(a.block)-n(b.block)||a.topic.localeCompare(b.topic));
}
function renderFlashcardGroup(group) {
  return `<section class="flashcard-course-group"><div class="section-title"><h3>${escapeHtml(group.area)} · ${escapeHtml(group.subarea)}</h3><span class="badge today">Bloco ${escapeHtml(group.block || '-')} · ${group.cards.length}</span></div><div class="muted">${escapeHtml(group.topic)}</div><div class="flashcard-grid">${group.cards.map(renderFlashcard).join('')}</div></section>`;
}
function renderFlashcardFrontHtml(card) {
  if(card.cardType === 'cloze') return renderFlashcardMarkdown(card.front, {cloze:'hide'});
  return renderFlashcardMarkdown(card.front);
}
function renderFlashcardBackHtml(card) {
  if(card.cardType === 'cloze') {
    const revealed = renderFlashcardMarkdown(card.front, {cloze:'reveal'});
    const extra = String(card.back || '').trim();
    return extra ? `${revealed}<div class="flashcard-cloze-extra">${renderFlashcardMarkdown(card.back)}</div>` : revealed;
  }
  return renderFlashcardMarkdown(card.back);
}
function renderFlashcard(card) {
  const progress = flashcardProgress(card);
  const revealed = ui.revealedCards[card.id];
  return `<article class="flashcard"><div class="flashcard-head"><div class="flashcard-rich-text">${renderFlashcardFrontHtml(card)}</div><span class="muted">${progress.reviews} rev. · ${escapeHtml(progress.nextReview)}</span></div><div class="flashcard-meta"><span class="sm2-pill">EF ${progress.ease.toFixed(2)}</span><span class="sm2-pill">${progress.interval} dias</span><span class="sm2-pill">${progress.lapses} lapsos</span><span class="sm2-pill">${escapeHtml(progress.status)}</span></div>${renderFlashcardInlineEditor(card)}${revealed ? `<div class="flashcard-back flashcard-rich-text">${renderFlashcardBackHtml(card)}</div>${renderFlashcardRating(card.id)}` : `<button class="icon-btn primary" data-reveal-card="${card.id}">Mostrar resposta</button>`}</article>`;
}
function renderFlashcardStudy(card, queue=[]) {
  // No modo foco todo o resto da tela fica oculto. Sem um botão aqui, terminar a
  // sessão deixava o usuário preso na tela de fim, sem caminho de volta.
  if(!card) return `<div class="flashcard-empty-session"><div><h2>Fim da sessão</h2><div class="muted">Nenhum flashcard neste filtro agora. Troque o filtro ou crie novos cards nas questões.</div>${ui.flashcardFocusMode ? '<button class="icon-btn primary" id="flashcardFocusToggle" type="button">Sair do modo foco</button>' : ''}</div></div>`;
  const progress = flashcardProgress(card);
  const revealed = ui.revealedCards[card.id];
  return `<div class="flashcard-stage"><div class="flashcard-study-card"><div class="flashcard-study-top"><span class="badge today">${escapeHtml(card.area)}</span><span class="badge wait">${escapeHtml(card.subarea)}</span><span class="badge today flashcard-focus-clock" id="flashcardFocusClock" data-auto-study-clock title="Clique para pausar ou retomar o cronômetro" data-auto-study-prefix="${ui.flashcardFocusPaused ? 'Pausado ·' : 'Estudando ·'}" title="Clique para pausar/retomar o tempo">Tempo pausado</span>${ui.flashcardFocusMode && ui.flashcardSpeedMode ? `<span class="badge wait" id="flashcardSpeedClock" data-speed-target="${FLASHCARD_SPEED_TARGET_SECONDS}">⚡ 0s</span>` : ''}<span class="sm2-pill">${ui.flashcardIndex + 1} de ${queue.length}</span>${ui.flashcardFocusMode ? `<button class="tiny-btn flashcard-speed-toggle" id="flashcardSpeedToggle" type="button" aria-pressed="${ui.flashcardSpeedMode}">${ui.flashcardSpeedMode ? 'Sair do speed' : '⚡ Speed'}</button>` : ''}<button class="tiny-btn flashcard-focus-toggle" id="flashcardFocusToggle" type="button" aria-pressed="${ui.flashcardFocusMode}">${ui.flashcardFocusMode ? 'Sair do foco' : '⛶ Modo foco'}</button></div><div class="flashcard-front flashcard-rich-text">${renderFlashcardFrontHtml(card)}</div>${renderFlashcardInlineEditor(card)}${revealed ? `<div class="flashcard-back flashcard-rich-text">${renderFlashcardBackHtml(card)}</div>${renderFlashcardRating(card.id)}` : `<button class="icon-btn primary" data-reveal-card="${card.id}">Mostrar resposta</button>`}<div class="flashcard-session-nav"><button class="icon-btn" data-flashcard-move="-1" ${ui.flashcardIndex<=0?'disabled':''}>Anterior</button><button class="icon-btn" data-flashcard-move="1" ${ui.flashcardIndex>=queue.length-1?'disabled':''}>Próximo</button></div><details class="flashcard-stats-disclosure"><summary>Estatísticas do card</summary><div class="flashcard-meta"><span class="sm2-pill">Próxima: ${escapeHtml(progress.nextReview)}</span><span class="sm2-pill">${progress.reviews} revisões</span><span class="sm2-pill">${progress.lapses} lapsos</span><span class="sm2-pill">EF ${progress.ease.toFixed(2)}</span></div></details></div></div>`;
}
function renderFlashcardInlineEditor(card) {
  if(ui.editFlashcardId !== card.id) return `<div class="flashcard-edit-toggle"><button class="tiny-btn" data-edit-flashcard="${escapeAttr(card.id)}">Editar card</button></div>`;
  const sourceAttr = card.questionId ? `data-question-card="${escapeAttr(card.questionId)}"` : card.videoId ? `data-video-card="${escapeAttr(card.videoId)}"` : `data-library-card="${escapeAttr(card.id)}"`;
  const isCloze = card.cardType === 'cloze';
  return `<div class="flashcard-inline-editor">
    ${renderFlashcardMarkdownField(`${sourceAttr} data-card-id="${escapeAttr(card.id)}" data-card-field="front" id="fcEdit-${escapeAttr(card.id)}-front"`,card.front,isCloze?'Texto com lacunas, ex.: {{c1::resposta}}':'Frente')}
    ${isCloze ? `<div class="fc-cloze-tools"><button type="button" class="tiny-btn" data-fc-insert-cloze-edit="${escapeAttr(card.id)}">Marcar seleção como lacuna</button><span class="muted">Use c2, c3... para lacunas independentes.</span></div>` : ''}
    ${renderFlashcardMarkdownField(`${sourceAttr} data-card-id="${escapeAttr(card.id)}" data-card-field="back"`,card.back,isCloze?'Extra (opcional, só aparece na resposta)':'Verso')}
    <input class="input" ${sourceAttr} data-card-id="${escapeAttr(card.id)}" data-card-field="area" value="${escapeAttr(card.area || '')}" placeholder="Área">
    <input class="input" ${sourceAttr} data-card-id="${escapeAttr(card.id)}" data-card-field="subarea" value="${escapeAttr(card.subarea || '')}" placeholder="Assunto">
    <button type="button" class="tiny-btn" data-close-flashcard-edit="${escapeAttr(card.id)}">Fechar edição</button>
    <button type="button" class="tiny-btn danger" ${sourceAttr} data-card-id="${escapeAttr(card.id)}" data-delete-flashcard title="Excluir este flashcard permanentemente">Excluir card</button>
  </div>`;
}
function renderFlashcardRating(id) {
  const card = flashcardAllRecords().find(item => item.id === id) || {stability:1};
  const preview = [1,2,3,4].map(r => { const p=nextFsrsProgress(card,r); return `${r}:${p.scheduledDays < 1 ? '10 min' : p.scheduledDays+' d'}`; });
  return `<div class="flashcard-actions"><div class="flashcard-rating"><button class="icon-btn" data-card-quality="1" data-card-id="${id}"><strong>1</strong> Novamente <small>${preview[0].split(':')[1]}</small></button><button class="icon-btn" data-card-quality="2" data-card-id="${id}"><strong>2</strong> Difícil <small>${preview[1].split(':')[1]}</small></button><button class="icon-btn" data-card-quality="3" data-card-id="${id}"><strong>3</strong> Bom <small>${preview[2].split(':')[1]}</small></button><button class="icon-btn primary" data-card-quality="4" data-card-id="${id}"><strong>4</strong> Fácil <small>${preview[3].split(':')[1]}</small></button></div><button class="icon-btn" data-card-suspend="${id}">Suspender</button></div>`;
}
function reviewFlashcard(id, quality) {
  const queueBefore = flashcardStudyQueue(flashcardAllRecords());
  const currentIndex = Math.max(0, queueBefore.findIndex(card => card.id === id));
  const nextId = queueBefore[currentIndex + 1]?.id || '';
  const card = flashcardAllRecords().find(item => item.id === id);
  if(!card) return;
  const mutableCard = mutableFlashcardRecord(id);
  const current = state.flashcardProgress[id] || {};
  const reviewedAt = new Date().toISOString();
  const wasNew = n(current.reviews || current.repetitions || card.reps) === 0;
  const wasDue = isFlashcardDue({...card,...current});
  const beforeCard = {...(mutableCard || card)};
  state.flashcardReviewHistory = Array.isArray(state.flashcardReviewHistory) ? state.flashcardReviewHistory : [];
  state.flashcardReviewHistory.push({ cardId:id, previous: {...current}, reviewedAt });
  state.flashcardReviewHistory = state.flashcardReviewHistory.slice(-50);
  const fsrs = nextFsrsProgress({...card,...current,reps:n(current.reviews)||card.reps,stability:n(current.stability)||card.stability,difficulty:n(current.difficulty)||card.difficulty,lapses:n(current.lapses)||card.lapses}, quality);
  const isLeech = fsrs.lapses >= n(state.flashcardSystem.profile.leechThreshold || 8);
  state.flashcardProgress[id] = {
    ...current,
    ...fsrs,
    everGood: Boolean(current.everGood) || quality >= 3,
    status: isLeech ? 'Suspenso' : fsrs.status,
    reviews: fsrs.reps,
    firstReviewedAt: current.firstReviewedAt || reviewedAt,
    lastQuality: quality,
    lastRating: quality,
    lastReviewedAt: reviewedAt,
    nextReview: isLeech ? '2099-12-31' : fsrs.due,
    dueAt: isLeech ? '2099-12-31T23:59:59.000Z' : fsrs.dueAt
  };
  const cardUpdate = { ...fsrs, due:isLeech ? '2099-12-31' : fsrs.due, dueAt:isLeech ? '2099-12-31T23:59:59.000Z' : fsrs.dueAt, isSuspended:isLeech, contentVersion:Math.max(1,n(card.contentVersion)||1), rowVersion:Math.max(1,n(card.rowVersion)||1)+1 };
  Object.assign(card, cardUpdate);
  if(mutableCard) Object.assign(mutableCard, cardUpdate);
  const reviewLog={id:newFlashcardId('review'),cardId:id,rating:quality,reviewedAt,sessionId:state.flashcardSystem.activeReviewSessionId,wasDue,wasNew,legacy:false,before:beforeCard,after:{...card},scheduledDays:fsrs.scheduledDays};
  state.flashcardSystem.reviewLogs.push(reviewLog);
  state.flashcardSystem.reviewLogs = state.flashcardSystem.reviewLogs.slice(-500);
  state.flashcardSystem.undoStack.push({cardId:id,previousProgress:{...current},beforeCard,reviewId:reviewLog.id});
  state.flashcardSystem.undoStack = state.flashcardSystem.undoStack.slice(-20);
  adjustFlashcardDayCount(reviewedAt, 1);
  // Primeiro torna o log e o novo agendamento duráveis; só então concede XP.
  saveStateOnly({invalidate:false});
  const xpResult=Gamification?.awardFlashcardReviewXP(state.gamification,reviewLog,{userId:gamificationUserId()});
  reviewLog.xpEventKey=xpResult?.evaluation?.eventKey || '';
  reviewLog.xpAwarded=Boolean(xpResult?.awarded);
  delete ui.revealedCards[id];
  const wasLastCard = currentIndex >= queueBefore.length - 1;
  const queueAfter = flashcardStudyQueue(flashcardAllRecords());
  const nextIndex = nextId ? queueAfter.findIndex(card => card.id === nextId) : -1;
  if(nextIndex >= 0) {
    ui.flashcardIndex = nextIndex;
    ui.flashcardSessionDone = false;
  } else if(wasLastCard) {
    // Some filters (ex.: "Todos") nao removem o card revisado da fila, entao ela
    // nunca encolhe ate zero; sem essa marcacao explicita, o indice ficava preso
    // no ultimo card, repetindo-o indefinidamente.
    ui.flashcardIndex = Math.max(0, queueAfter.length - 1);
    ui.flashcardSessionDone = true;
  } else {
    ui.flashcardIndex = Math.min(currentIndex, Math.max(queueAfter.length - 1, 0));
    ui.flashcardSessionDone = false;
  }
  ui.flashcardCurrentCardId = ui.flashcardSessionDone ? '' : (queueAfter[ui.flashcardIndex]?.id || '');
  if(!queueAfter.length || ui.flashcardSessionDone) showStudyToast('Parabéns! Você concluiu os flashcards. Não há mais o que fazer agora.');
  persist();
}
function undoFlashcardReview() {
  const systemUndo = state.flashcardSystem?.undoStack?.pop();
  if(systemUndo) {
    const card = mutableFlashcardRecord(systemUndo.cardId);
    if(card) Object.assign(card, systemUndo.beforeCard);
    if(systemUndo.previousProgress && Object.keys(systemUndo.previousProgress).length) state.flashcardProgress[systemUndo.cardId] = systemUndo.previousProgress;
    else delete state.flashcardProgress[systemUndo.cardId];
    const review = state.flashcardSystem.reviewLogs.find(log => log.id === systemUndo.reviewId);
    state.flashcardSystem.reviewLogs = state.flashcardSystem.reviewLogs.filter(log => log.id !== systemUndo.reviewId);
    if(review?.xpAwarded) awardGamificationXP({activity_type:'flashcard_review_reversal',source_type:'flashcard_review',source_id:review.cardId,source_event_id:`flashcard-review-reversal:${review.id}`,base_xp:-1,reason:'flashcard_review_undone',occurred_at:new Date().toISOString(),metadata:{reviewLogId:review.id,reversesEventKey:review.xpEventKey||`flashcard-review:${review.id}`}});
    if(review?.reviewedAt) adjustFlashcardDayCount(review.reviewedAt, -1);
    ui.revealedCards[systemUndo.cardId] = true;
    ui.flashcardCurrentCardId = systemUndo.cardId;
    saveStateOnly();
    renderFlashcards();
    return;
  }
  const last = Array.isArray(state.flashcardReviewHistory) ? state.flashcardReviewHistory.pop() : null;
  if(!last) { alert('Nenhuma revisão recente para desfazer.'); return; }
  if(last.previous && Object.keys(last.previous).length) state.flashcardProgress[last.cardId] = last.previous;
  else delete state.flashcardProgress[last.cardId];
  ui.revealedCards[last.cardId] = true;
  saveStateOnly();
  renderFlashcards();
}
function adjustFlashcardDayCount(timestamp, delta) {
  const date = studyDateKey(timestamp);
  if(!date || !delta) return;
  const log = getDayLog(date);
  log.flashcards = Math.max(0, n(log.flashcards) + delta);
  log.flashcardsOn = n(log.flashcards) > 0 || n(log.flashcardMinutes) > 0;
}
function moveFlashcardSession(delta, total) {
  ui.flashcardIndex = Math.max(0, Math.min(Math.max(total - 1, 0), n(ui.flashcardIndex) + delta));
  ui.flashcardCurrentCardId = '';
  ui.flashcardSessionDone = false;
  ui.revealedCards = {};
  renderFlashcards();
}
function suspendFlashcard(id) {
  const current = state.flashcardProgress[id] || {};
  state.flashcardProgress[id] = { ...current, status:'Suspenso', nextReview:'2099-12-31' };
  delete ui.revealedCards[id];
  persist();
}
function deleteFlashcardFromEditor(el) {
  const cardId = el.dataset.cardId;
  if(!cardId || !confirm('Excluir este flashcard? Esta ação não pode ser desfeita.')) return;
  const now = new Date().toISOString();
  if(el.dataset.videoCard) {
    const cards = state.videoFlashcards[el.dataset.videoCard] || [];
    state.videoFlashcards[el.dataset.videoCard] = cards.map(card => card.id === cardId ? {...card, deletedAt:now} : card);
  } else if(el.dataset.questionCard) {
    const cards = state.questionFlashcards[el.dataset.questionCard] || [];
    state.questionFlashcards[el.dataset.questionCard] = cards.map(card => card.id === cardId ? {...card, deletedAt:now} : card);
  } else if(el.dataset.libraryCard) {
    const card = (state.flashcardLibrary || []).find(item => item.id === cardId);
    if(card) card.deletedAt = now;
  }
  delete state.flashcardProgress[cardId];
  delete ui.revealedCards[cardId];
  ui.editFlashcardId = '';
  renderCache.manualCards = null;
  persist();
  render();
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
  const cards = filteredFlashcards(flashcardAllRecords());
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
    library: state.flashcardLibrary || [],
    progress: state.flashcardProgress || {},
    settings: state.flashcardSettings || {},
    scheduler: state.flashcardSystem || {}
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
    const importTimestamp = Date.now();
    const importNonce = Math.random().toString(16).slice(2);
    lines.forEach((line, index) => {
      const cols = line.split('\t');
      const front = ankiUnescape(cols[0] || '').trim();
      const back = ankiUnescape(cols[1] || '').trim();
      if(!front || !back) return;
      const area = (cols[2] || 'Importado do Anki').trim();
      const subarea = (cols[3] || 'Sem subárea').trim();
      const questionId = `anki-import-${normalizedTopic(area)}-${normalizedTopic(subarea)}`;
      if(!Array.isArray(state.questionFlashcards[questionId])) state.questionFlashcards[questionId] = [];
      state.questionFlashcards[questionId].unshift({
        id: `card-anki-${importTimestamp}-${importNonce}-${index}`,
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
function reconcileQuestionProgressForQuestion(rawQuestion) {
  const question = applyQuestionEdits(rawQuestion);
  const progress = state.questionProgress?.[question.id];
  if(!progress?.answeredAt || !progress.selected) return false;
  const correct = !progress.timedOut && String(progress.selected).toUpperCase() === String(question.answer).toUpperCase();
  if(Boolean(progress.correct) === correct) return false;
  const date = state.questionLogged?.[question.id] || answerDate(progress.answeredAt);
  const log = date ? getDayLog(date) : null;
  if(log) {
    if(progress.correct) log.correct = Math.max(0, n(log.correct) - 1);
    else log.wrong = Math.max(0, n(log.wrong) - 1);
    if(correct) log.correct = n(log.correct) + 1;
    else log.wrong = n(log.wrong) + 1;
  }
  progress.correct = correct;
  return true;
}
function reconcileQuestionProgressWithAnswers() {
  let changed = false;
  questionBank.forEach(rawQuestion => {
    if(reconcileQuestionProgressForQuestion(rawQuestion)) changed = true;
  });
  if(changed) saveStateOnly();
}
function questionBankSummary() {
  if(renderCache.questionSummary) return renderCache.questionSummary;
  let answered = 0;
  let correct = 0;
  let flagged = 0;
  let confidenceTotal = 0;
  let confidenceCount = 0;
  let knownCorrect = 0;
  let luckyCorrect = 0;
  let attention = 0;
  let memory = 0;
  let knowledge = 0;
  questionBank.forEach(question => {
    const result = questionResult(question);
    if(!result) return;
    answered += 1;
    if(result.correct) correct += 1;
    if(result.answerKeyIssue) flagged += 1;
    if(n(result.confidence)) {
      confidenceTotal += n(result.confidence);
      confidenceCount += 1;
    }
    if(result.correct && result.correctMode === 'Sabendo') knownCorrect += 1;
    if(result.correct && result.correctMode === 'Chute') luckyCorrect += 1;
    if(result.missReason === 'Desatenção') attention += 1;
    if(result.missReason === 'Dúvida / já vi' || result.missReason === 'Não lembrar') memory += 1;
    if(result.missReason === 'Não saber') knowledge += 1;
  });
  renderCache.questionSummary = {
    answered,
    correct,
    flagged,
    confidence: {
      avgConfidence: confidenceCount ? Math.round(confidenceTotal / confidenceCount) : 0,
      knownCorrect,
      luckyCorrect,
      attention,
      memory,
      knowledge
    }
  };
  return renderCache.questionSummary;
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
function loadQuestionImportDraft() {
  try { return JSON.parse(localStorage.getItem(QUESTION_IMPORT_DRAFT_KEY) || '{}'); } catch { return {}; }
}
function saveQuestionImportDraft() {
  try { localStorage.setItem(QUESTION_IMPORT_DRAFT_KEY, JSON.stringify(questionImportDraft || {})); } catch {}
}
function uuidv7() {
  const now = Date.now();
  const random = new Uint8Array(10);
  crypto.getRandomValues(random);
  const time = now.toString(16).padStart(12, '0');
  const hex = `${time}${[...random].map(value => value.toString(16).padStart(2, '0')).join('')}`;
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-7${hex.slice(13,16)}-${(8 + (parseInt(hex.slice(16,18),16) % 4).toString(16))}${hex.slice(18,20)}-${hex.slice(20,32)}`;
}
function simpleContentHash(value) {
  let hash = 2166136261;
  for(const char of String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
function sanitizeImportedText(value='') {
  return String(value).replace(/<\/?script[^>]*>/gi, '').replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '').replace(/javascript\s*:/gi, '').trim();
}
function normalizeImportKey(key) {
  return String(key || '').trim().toLowerCase().replace(/[ -]+/g, '_');
}
function parseQuestionBatch(text, defaults={}) {
  const source = String(text || '').replace(/\r\n?/g, '\n');
  const chunks = [];
  const startRe = /@@QUESTION\b/gi;
  let match;
  while((match = startRe.exec(source))) {
    const end = source.indexOf('@@END', match.index);
    const chunkEnd = end >= 0 ? end : source.length;
    chunks.push({ text: source.slice(match.index + match[0].length, chunkEnd), start: source.slice(0, match.index).split('\n').length, closed: end >= 0 });
    if(end < 0) break;
    startRe.lastIndex = end + 5;
  }
  const report = { errors: [], warnings: [], markers: [], estimated: chunks.length };
  if(!chunks.length && source.trim()) report.errors.push({line:1, message:'Nenhum marcador @@QUESTION foi encontrado.'});
  const parsed = chunks.slice(0, QUESTION_IMPORT_MAX).map((chunk, index) => {
    const lines = chunk.text.split('\n');
    const meta = {...defaults};
    const sections = {stem:[], options:[], answer:[], comment:[], pearl:[], trap:[], source:[]};
    let section = 'meta';
    let option = null;
    lines.forEach((rawLine, offset) => {
      const line = rawLine.trimEnd();
      const header = line.match(/^\[([A-Z]+)\]\s*$/i);
      if(header) { section = normalizeImportKey(header[1]); option = null; return; }
      if(section === 'meta') {
        const field = line.match(/^([a-z][\w-]*)\s*:\s*(.*)$/i);
        if(field) meta[normalizeImportKey(field[1])] = sanitizeImportedText(field[2]);
        else if(line.trim()) report.warnings.push({line:chunk.start + offset, question:index + 1, message:'Linha fora do formato de metadado.'});
        return;
      }
      if(section === 'options') {
        const found = line.match(/^([A-Z])\.\s*(.*)$/);
        if(found) { option = found[1].toUpperCase(); sections.options.push({key:option, lines:[sanitizeImportedText(found[2])]}); }
        else if(line.trim() && option) sections.options.at(-1).lines.push(sanitizeImportedText(line));
        return;
      }
      if(sections[section]) sections[section].push(sanitizeImportedText(line));
      else if(line.trim()) report.warnings.push({line:chunk.start + offset, question:index + 1, message:`Seção [${section}] não é suportada.`});
    });
    const markers = [...sections.stem.join('\n').matchAll(/\[\[IMAGE:([^\]]+)\]\]/gi)].map(item => item[1].trim());
    markers.forEach(alias => report.markers.push({question:index + 1, alias, line:chunk.start}));
    const options = Object.fromEntries(sections.options.map(item => [item.key, item.lines.join('\n').trim()]));
    const answer = String((sections.answer.join('\n').match(/\b([A-E])\b/i) || [,''])[1]).toUpperCase();
    const requestedScheduleId = meta.schedule_id || defaults.schedule_id || '';
    const scheduledLesson = state.schedule.find(item => item.id === requestedScheduleId);
    const question = normalizeQuestionRecord({
      id: uuidv7(), number: meta.number || '', sourceNumber: meta.number || '', displayOrder:index + 1,
      scheduleId: scheduledLesson?.id || '',
      collectionBlock: meta.collection_block || meta.block || defaults.collection_block || defaults.block || scheduledLesson?.block || (meta.destination === 'simulado' || defaults.destination === 'simulado' ? `simulado:${meta.simulado_name || defaults.simulado_name || 'Novo simulado'}` : ''),
      collectionLabel: meta.collection || defaults.collection || (meta.destination === 'simulado' || defaults.destination === 'simulado' ? meta.simulado_name || defaults.simulado_name || 'Novo simulado' : ''), documentBlock: meta.document_block || '',
      sourceLabel: meta.source_label || defaults.source_label || meta.institution || defaults.institution || 'Importação manual',
      area: meta.area || defaults.area || scheduledLesson?.area || '', specialty: meta.specialty || '', topic: meta.topic || defaults.topic || scheduledLesson?.topic || '', subtopic: meta.subtopic || '',
      difficulty: meta.difficulty || defaults.difficulty || '', institution: meta.institution || defaults.institution || '', examYear: meta.year || defaults.year || '',
      tags: String(meta.tags || defaults.tags || '').split('|').map(tag => tag.trim()).filter(Boolean), stem: sections.stem.join('\n').replace(/\[\[IMAGE:[^\]]+\]\]/gi, '').trim(), options, answer,
      comment: sections.comment.join('\n').trim(), pearl: sections.pearl.join('\n').trim(), trap: sections.trap.join('\n').trim(), source: sections.source.join('\n').trim(),
      images: markers.map(alias => ({alias, assetId:null, pending:true}))
    });
    const errors = [];
    if(!question.stem) errors.push('Enunciado ausente.');
    if(Object.keys(options).length < 2) errors.push('São necessárias pelo menos duas alternativas.');
    if(new Set(Object.keys(options).map(key => key.toUpperCase())).size !== Object.keys(options).length) errors.push('Há letras de alternativas duplicadas.');
    if(!answer) errors.push('Gabarito ausente.');
    if(answer && !options[answer]) errors.push(`O gabarito ${answer} não corresponde a uma alternativa.`);
    if(meta.year && !/^\d{4}$/.test(String(meta.year))) errors.push('Ano inválido.');
    if(meta.difficulty && !['baixa','média','media','alta'].includes(String(meta.difficulty).toLowerCase())) errors.push('Dificuldade deve ser baixa, média ou alta.');
    if(markers.length !== new Set(markers.map(alias => alias.toLowerCase())).size) errors.push('Há marcadores de imagem duplicados.');
    if(question.stem.length > 50000) errors.push('Questão excede 50.000 caracteres.');
    if(!chunk.closed) errors.push('Falta @@END para esta questão.');
    question.contentHash = simpleContentHash([question.stem, ...Object.values(question.options), question.answer].join('|'));
    question.importStatus = errors.length ? 'draft' : markers.length ? 'needs_review' : (defaults.status || 'ready');
    question._errors = errors;
    if(errors.length) errors.forEach(message => report.errors.push({line:chunk.start, question:index + 1, message}));
    return question;
  });
  if(chunks.length > QUESTION_IMPORT_MAX) report.errors.push({line:1, message:`O lote excede o limite de ${QUESTION_IMPORT_MAX} questões.`});
  const seen = new Set();
  const existingKeys = new Set(questionBank.map(questionDuplicateKey));
  parsed.forEach((question, index) => {
    const duplicateKey = questionDuplicateKey(question);
    if(seen.has(duplicateKey)) { question._warnings = [...(question._warnings || []), 'Possível duplicata dentro deste lote.']; report.warnings.push({question:index + 1, line:1, message:'Possível duplicata dentro deste lote.'}); }
    seen.add(duplicateKey);
    if(existingKeys.has(duplicateKey)) {
      question._warnings = [...(question._warnings || []), 'Possível duplicata já existente neste bloco do banco.'];
      report.warnings.push({question:index + 1, line:1, message:'Possível duplicata já existente no banco.'});
    }
  });
  parseQuestionBatch.lastReport = report;
  return parsed;
}
function ensureImportedQuestions() {
  if(!Array.isArray(state.importedQuestions)) state.importedQuestions = [];
  if(!state.deletedQuestions || typeof state.deletedQuestions !== 'object') state.deletedQuestions = {};
  if(!Array.isArray(state.incorporationHistory)) state.incorporationHistory = [];
}
function normalizeQuestionRecord(question) {
  const options = Object.fromEntries(Object.entries(question.options || {}).map(([letter,text]) => [String(letter).trim().toUpperCase(), normalizeQuestionText(text)]));
  const answer = String(question.answer || '').trim().toUpperCase();
  const comment = normalizeMedicalTypography([
    question.comment || '',
    question.pearl ? `Pérola: ${question.pearl}` : '',
    question.trap ? `Armadilha: ${question.trap}` : ''
  ].filter(Boolean).join('\n\n'));
  const declaredAnswer = comment.match(/(?:^|\n)\s*(?:Correta|Gabarito)\s*:\s*([A-E])\b/i)?.[1]?.toUpperCase() || '';
  const safeComment = declaredAnswer && answer && declaredAnswer !== answer
    ? `Análise em revisão: o comentário declara ${declaredAnswer}, mas o gabarito desta questão é ${answer}. A explicação foi ocultada até a conferência no TXT-base do bloco.`
    : comment;
  return {...question, stem:normalizeQuestionText(question.stem), options, comment:safeComment, answer, tags:Array.isArray(question.tags) ? question.tags.map(tag => String(tag).trim()).filter(Boolean) : [], images:Array.isArray(question.images) ? question.images : []};
}
function questionDataIssue(question) {
  const validation=PlannerUX?.validateQuestionRecord?.(question);
  if(validation && !validation.valid) return validation.reasons.join(' ');
  const letters = Object.keys(question.options || {});
  if(letters.length < 4) return 'Questão discursiva ou alternativas ausentes na extração original.';
  if(!letters.includes(question.answer)) return `O gabarito ${question.answer || 'não informado'} não está entre as alternativas disponíveis.`;
  const blank = letters.filter(letter => !String(question.options?.[letter] || '').trim());
  if(blank.length) return `A extração original deixou ${blank.length === 1 ? 'a alternativa' : 'as alternativas'} ${blank.join(', ')} sem texto.`;
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
function questionLessonResumePlan() {
  const ordered = (state.schedule || []).filter(item => !item.catchUp).slice().sort(byDate);
  const lastId = state.questionSettings?.lastOpenedScheduleId || ui.qFocusScheduleId || '';
  const lastItem = ordered.find(item => item.id === lastId) || null;
  const lessonState = item => {
    const target = lessonQuestionTarget(item);
    const completed = completedQuestions(item);
    return { item, target, completed, remaining:Math.max(0,target-completed), pending:target>0 && completed<target };
  };
  const last = lastItem ? lessonState(lastItem) : null;
  if(last?.pending) return { ...last, kind:'resume', lastCompleted:false };

  const startIndex = lastItem ? ordered.findIndex(item => item.id === lastItem.id) + 1 : 0;
  const candidates = [...ordered.slice(startIndex), ...ordered.slice(0,startIndex)].map(lessonState);
  const currentBlock = String(currentScheduleBlock());
  const next = (!lastItem ? candidates.find(entry => String(entry.item.block)===currentBlock && entry.pending) : null)
    || candidates.find(entry => entry.pending)
    || null;
  if(next) return { ...next, kind:lastItem?'next':'start', lastCompleted:Boolean(lastItem) };
  return { item:lastItem, target:last?.target || 0, completed:last?.completed || 0, remaining:0, pending:false, kind:'complete', lastCompleted:Boolean(lastItem) };
}
function exploreQuestionBank() {
  ui.qFocusScheduleId='';
  ui.qFocusQuestionIds=[];
  ui.qFocusTarget=0;
  ui.qBlock='Todos';
  ui.qSource='Todas';
  ui.qTopic='Todos';
  ui.qStatus='Todas';
  ui.qSearch='';
  ui.qIndex=0;
  ui.qQuestionId='';
  ui.justAnsweredId='';
  resetKeyboardConfirmation();
  render();
}
function continueQuestionTraining() {
  const plan = questionLessonResumePlan();
  if(!plan.item || !plan.pending) {
    showStudyToast(plan.item ? `Você já concluiu a meta de questões de todas as aulas disponíveis.` : 'Ainda não há uma aula com questões disponível para continuar.');
    return;
  }
  if(plan.lastCompleted) showStudyToast(`Meta da última aula concluída. Abrindo a próxima: ${plan.item.topic}.`);
  openQuestionsForSchedule(plan.item.id);
}
function openQuestionsForSchedule(scheduleId) {
  const item = state.schedule.find(row => row.id === scheduleId);
  if(!item) return;
  const completed = completedQuestions(item);
  const target = lessonQuestionTarget(item);
  if(target === 0) {
    showStudyToast(`Ainda não há questões vinculadas a ${item.topic}.`);
    return;
  }
  if(completed >= target) {
    showStudyToast(`Parabéns, você já concluiu esta lista. ${completed} de ${target} questões realizadas em ${item.topic}.`);
    return;
  }
  const linkedByTopic = questionBank.filter(question => questionMatchesSchedule(question, item));
  const direct = questionBank.filter(question => question.scheduleId === item.id && String(question.collectionBlock) === String(item.block));
  // A ligação por bloco + tema é mais confiável do que um scheduleId legado
  // criado antes da normalização dos nomes das aulas.
  const linked = linkedByTopic.length ? linkedByTopic : direct;
  ui.qFocusScheduleId = linked.length ? item.id : '';
  ui.qFocusQuestionIds = linked.map(question => question.id);
  ui.qBlock = item.block ? String(item.block) : 'Todos';
  ui.qSource = 'Todas';
  ui.qTopic = 'Todos';
  ui.qStatus = 'Não respondidas';
  ui.qSearch = '';
  ui.qFocusTarget = target;
  ui.qIndex = 0;
  ui.qQuestionId = '';
  ui.justAnsweredId = '';
  state.questionSettings.lastOpenedScheduleId = item.id;
  state.questionSettings.lastOpenedAt = new Date().toISOString();
  saveStateOnly({invalidate:false});
  resetKeyboardConfirmation();
  navigateToTab('questoes');
}
function openFlashcardsForSchedule(scheduleId) {
  const item = state.schedule.find(row => row.id === scheduleId);
  if(!item) return;
  ui.flashcardBlock = item.block ? String(item.block) : 'Todos';
  ui.flashcardArea = item.area || 'Todas';
  ui.flashcardSubarea = item.topic || 'Todas';
  ui.flashcardSubject = item.topic || '';
  ui.flashcardDeck = '';
  ui.flashcardFilter = 'Todos';
  ui.flashcardDeck = '';
  ui.flashcardIndex = 0;
  navigateToTab('flashcards');
}
function filteredQuestions() {
  const focusQuestionIds = new Set(Array.isArray(ui.qFocusQuestionIds) ? ui.qFocusQuestionIds : []);
  const cacheKey = JSON.stringify([ui.qFocusScheduleId || '', [...focusQuestionIds], ui.qBlock, ui.qSource, ui.qTopic, ui.qStatus, normalizedTopic(ui.qSearch || ''), ui.justAnsweredId || '', n(ui.qFocusTarget), questionBank.length]);
  if(renderCache.questionFilterKey === cacheKey && Array.isArray(renderCache.questionFilterResults)) return renderCache.questionFilterResults;
  const focusItem = ui.qFocusScheduleId ? state.schedule.find(item => item.id === ui.qFocusScheduleId) : null;
  const filtered = questionBank.filter(question => {
    const result = questionResult(question);
    const query = normalizedTopic(ui.qSearch || '');
    const searchable = normalizedTopic([
      question.stem,
      question.area,
      question.topic,
      question.sourceLabel || question.source,
      ...(Array.isArray(question.tags) ? question.tags : [])
    ].filter(Boolean).join(' '));
    const searchOk = !query || searchable.includes(query);
    const focusOk = !ui.qFocusScheduleId || (focusQuestionIds.size ? focusQuestionIds.has(question.id) : questionMatchesSchedule(question, focusItem));
    const blockOk = ui.qBlock === 'Todos' || String(question.collectionBlock) === String(ui.qBlock);
    const sourceOk = ui.qSource === 'Todas' || question.sourceLabel === ui.qSource;
    const topicOk = ui.qTopic === 'Todos' || question.topic === ui.qTopic;
    const statusOk = question.id === ui.justAnsweredId
      || ui.qStatus === 'Todas'
      || (ui.qStatus === 'Não respondidas' && !result)
      || (ui.qStatus === 'Erradas' && result && !result.correct)
      || (ui.qStatus === 'Certas' && result?.correct)
      || (ui.qStatus === 'Gabarito suspeito' && Boolean(state.questionProgress[question.id]?.answerKeyIssue));
    return searchOk && focusOk && blockOk && sourceOk && topicOk && statusOk;
  });
  if(!ui.qFocusScheduleId || !n(ui.qFocusTarget)) {
    renderCache.questionFilterKey = cacheKey;
    renderCache.questionFilterResults = filtered;
    return filtered;
  }
  const completed = questionStatsForSchedule(focusItem.id).done;
  const remaining = Math.max(0, n(ui.qFocusTarget) - completed);
  // A questao recem-respondida so deve sair da lista quando o usuario avancar
  // (navigateQuestionBy limpa justAnsweredId); sem isso o slice a corta na hora,
  // antes de o usuario ver se acertou.
  const justAnsweredIndex = ui.justAnsweredId ? filtered.findIndex(question => question.id === ui.justAnsweredId) : -1;
  const sliceCount = justAnsweredIndex >= remaining ? justAnsweredIndex + 1 : remaining;
  const results = filtered.slice(0, sliceCount);
  renderCache.questionFilterKey = cacheKey;
  renderCache.questionFilterResults = results;
  return results;
}
function renderQuestionTags(question) {
  const tags = Array.isArray(question.tags) ? question.tags.filter(Boolean) : [];
  if(!tags.length) return '';
  const toggleBtn = `<button type="button" class="tiny-btn question-tag-toggle" id="questionTagsToggle" title="${questionTagsHidden?'Mostrar tags':'Ocultar tags'}" aria-pressed="${questionTagsHidden}">${questionTagsHidden?`Mostrar tags (${tags.length})`:'Ocultar tags'}</button>`;
  const list = questionTagsHidden ? '' : `<div class="question-tag-list" aria-label="Tags organizadas da questão">${tags.map((tag,index) => `<button type="button" class="question-tag tag-tone-${index%6}" data-question-tag-filter="${escapeAttr(tag)}" title="Pesquisar pela tag ${escapeAttr(tag)}"><span class="question-tag-order">${index+1}</span><span>${escapeHtml(tag)}</span></button>`).join('')}</div>`;
  return `<div class="question-tag-wrap">${toggleBtn}${list}</div>`;
}
function setQuestionTagsHidden(hidden) {
  questionTagsHidden = Boolean(hidden);
  localStorage.setItem(QUESTION_TAGS_HIDDEN_KEY, questionTagsHidden ? '1' : '0');
  render();
}
function bindQuestionTagFilters() {
  document.getElementById('questionTagsToggle')?.addEventListener('click', () => setQuestionTagsHidden(!questionTagsHidden));
  document.querySelectorAll('[data-question-tag-filter]').forEach(button => button.onclick = event => {
    ui.qSearch = event.currentTarget.dataset.questionTagFilter || '';
    ui.qIndex = 0;
    renderQuestionBank();
  });
}
function backToQuestionSelection() {
  ui.qFocusScheduleId = '';
  ui.qFocusQuestionIds = [];
  ui.qFocusTarget = 0;
  ui.qBlock = 'Todos';
  ui.qSource = 'Todas';
  ui.qTopic = 'Todos';
  ui.qStatus = 'Todas';
  ui.qSearch = '';
  ui.qIndex = 0;
  ui.qQuestionId = '';
  ui.justAnsweredId = '';
  resetKeyboardConfirmation();
  if(questionSidebarCollapsed) setQuestionFocusMode(false);
  syncRouteFromUI('push');
  render();
}
function renderQuestionEmptyState(message) {
  return `<div class="empty question-session-end"><div>${escapeHtml(message)}</div><button class="icon-btn primary" id="backToQuestionBlocksBtn" type="button">‹ Escolher novo bloco de questões</button></div>`;
}
function bindQuestionEmptyState() {
  document.getElementById('backToQuestionBlocksBtn')?.addEventListener('click', backToQuestionSelection);
}
function refreshQuestionSearchResults() {
  const searchInput = document.getElementById('questionSearch');
  const keepSearchFocus = document.activeElement === searchInput;
  const selectionStart = searchInput?.selectionStart ?? (ui.qSearch || '').length;
  const selectionEnd = searchInput?.selectionEnd ?? selectionStart;
  const questions = filteredQuestions();
  ui.qIndex = Math.max(0, Math.min(ui.qIndex, Math.max(questions.length - 1, 0)));
  const question = questions[ui.qIndex];
  const activeQuestion = question ? applyQuestionEdits(question) : null;
  const card = document.querySelector('#questoes .question-card');
  if(!card) return;
  card.innerHTML = activeQuestion ? renderQuestion(activeQuestion, questions.length) : renderQuestionEmptyState('Nenhuma questão corresponde a esta busca.');
  bindQuestionTagFilters();
  bindQuestionActions(questions, activeQuestion);
  bindQuestionEmptyState();
  updateAutoStudyIndicator();
  if(keepSearchFocus && searchInput?.isConnected) requestAnimationFrame(() => {
    searchInput.focus({ preventScroll:true });
    searchInput.setSelectionRange(selectionStart,selectionEnd);
  });
}
function setQuestionFocusMode(enabled) {
  const wasEnabled=questionSidebarCollapsed;
  questionSidebarCollapsed=Boolean(enabled);
  if(questionSidebarCollapsed) localStorage.setItem(QUESTION_SIDEBAR_KEY,'1');
  else localStorage.removeItem(QUESTION_SIDEBAR_KEY);
  document.querySelector('#questoes .question-layout')?.classList.toggle('sidebar-collapsed',questionSidebarCollapsed);
  const toggle=document.getElementById('questionFocusToggle');
  if(toggle) {
    toggle.textContent=questionSidebarCollapsed?'☰':'⛶';
    toggle.setAttribute('aria-pressed',String(questionSidebarCollapsed));
    toggle.setAttribute('aria-label',questionSidebarCollapsed?'Abrir painel do banco':'Ocultar painel e focar na questão');
    toggle.title=questionSidebarCollapsed?'Sair do modo foco e abrir painel':'Entrar no modo foco';
  }
  if(questionSidebarCollapsed && !wasEnabled) {
    const question=filteredQuestions()[ui.qIndex];
    if(question) startAutoStudy('questions',scheduleForQuestion(question)?.id || '',60);
  } else if(!questionSidebarCollapsed && wasEnabled) {
    stopAutoStudy('questions');
  }
}
function persistQuestionView() {
  if(ui.tab !== 'questoes') return;
  localStorage.setItem(QUESTION_VIEW_KEY, JSON.stringify({
    qBlock: ui.qBlock,
    qSource: ui.qSource,
    qTopic: ui.qTopic,
    qStatus: ui.qStatus,
    qSearch: ui.qSearch || '',
    qIndex: ui.qIndex,
    qQuestionId: ui.qQuestionId || '',
    qFocusScheduleId: ui.qFocusScheduleId || '',
    qFocusQuestionIds: Array.isArray(ui.qFocusQuestionIds) ? ui.qFocusQuestionIds : [],
    qFocusTarget: n(ui.qFocusTarget) || 0
  }));
}
function navigateQuestionBy(delta) {
  if(ui.tab !== 'questoes') return;
  const questions = filteredQuestions();
  if(!questions.length) return;
  const showingJustAnswered = Boolean(ui.justAnsweredId);
  if(delta > 0 && ui.qIndex >= questions.length - 1 && !showingJustAnswered) {
    showStudyToast('Parabéns! Você chegou ao fim das questões deste filtro.');
    return;
  }
  if(delta > 0 && ui.qIndex >= questions.length - 1 && showingJustAnswered) {
    ui.justAnsweredId = '';
    ui.qIndex = 0;
    ui.qQuestionId = '';
    syncRouteFromUI('push');
    render();
    showStudyToast('Parabéns! Você concluiu as questões deste filtro.');
    return;
  }
  if(!settleQuestionTimerBeforeLeave()) return;
  stopQuestionTimer(true);
  resetKeyboardConfirmation();
  ui.justAnsweredId = '';
  // No filtro "Não respondidas", a questão recém-corrigida fica temporariamente
  // na lista para exibir o comentário. Ao avançar, ela já sai da lista; manter
  // +1 nesse momento faria o celular pular a próxima questão.
  const effectiveDelta = showingJustAnswered && delta > 0 ? 0 : delta;
  ui.qIndex = Math.max(0, Math.min(questions.length - 1, ui.qIndex + effectiveDelta));
  ui.qQuestionId = questions[ui.qIndex]?.id || '';
  syncRouteFromUI('push');
  render();
}
function renderQuestionBank() {
  stopAutoStudy('video');
  if(ui.qRouteRestorePending && ui.qQuestionId) {
    const routedQuestion=questionBank.find(item=>item.id===ui.qQuestionId);
    if(routedQuestion) {
      ui.qStatus='Todas';
      ui.qBlock=routedQuestion.collectionBlock||ui.qBlock;
      ui.qSource='Todas';
      ui.qTopic='Todos';
      ui.qSearch='';
    }
    ui.qRouteRestorePending=false;
  }
  ensureQuestionProgress();
  const summary = questionBankSummary();
  const confidence = summary.confidence;
  const flagged = summary.flagged;
  const showingFlagged = ui.qStatus === 'Gabarito suspeito';
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
  if(ui.qQuestionId) {
    const savedIndex = questions.findIndex(item => item.id === ui.qQuestionId);
    if(savedIndex >= 0) ui.qIndex = savedIndex;
  }
  ui.qIndex = Math.max(0, Math.min(ui.qIndex, Math.max(questions.length - 1, 0)));
  const question = questions[ui.qIndex];
  ui.qQuestionId = question?.id || '';
  const activeQuestion = question ? applyQuestionEdits(question) : null;
  const answerRate = summary.answered ? Math.round((summary.correct / summary.answered) * 100) : 0;
  const pendingCount = Math.max(0, questionBank.length - summary.answered);
  const resumePlan = questionLessonResumePlan();
  const resumeTitle = resumePlan.kind === 'next' ? 'Próxima aula' : resumePlan.kind === 'complete' ? 'Meta concluída' : resumePlan.kind === 'start' ? 'Começar treino' : 'Continuar treino';
  const resumeDetail = resumePlan.item
    ? `${resumePlan.item.topic} · ${resumePlan.pending ? `${resumePlan.remaining} questões` : `${resumePlan.completed}/${resumePlan.target} feitas`}`
    : `${pendingCount.toLocaleString('pt-BR')} pendentes`;
  document.getElementById('questoes').innerHTML = `<div class="grid question-layout qbank-mode ${questionSidebarCollapsed?'sidebar-collapsed':''}">
    <header class="qbank-overview">
      <div class="qbank-overview-copy"><span class="qbank-eyebrow">Treino inteligente</span><h1>Central de questões</h1><p>Pratique com foco, acompanhe sua evolução e transforme erros em revisão.</p></div>
      <div class="qbank-overview-metrics" aria-label="Resumo do banco de questões">
        <div><span>Banco</span><strong>${questionBank.length.toLocaleString('pt-BR')}</strong><small>questões</small></div>
        <div><span>Progresso</span><strong>${summary.answered.toLocaleString('pt-BR')}</strong><small>resolvidas</small></div>
        <div class="${answerRate >= 70 ? 'positive' : ''}"><span>Precisão</span><strong>${answerRate}%</strong><small>${summary.correct} acertos</small></div>
      </div>
      <div class="qbank-quick-actions" role="group" aria-label="Filtros rápidos">
        <button type="button" class="qbank-quick-filter ${ui.qFocusScheduleId?'active':''}" id="continueQuestionTraining"><span class="quick-filter-dot pending"></span><strong>${escapeHtml(resumeTitle)}</strong><small title="${escapeAttr(resumeDetail)}">${escapeHtml(resumeDetail)}</small></button>
        <button type="button" class="qbank-quick-filter ${ui.qStatus==='Erradas'?'active':''}" data-question-quick-filter="Erradas"><span class="quick-filter-dot errors"></span><strong>Revisar erros</strong><small>${(summary.answered-summary.correct).toLocaleString('pt-BR')} para rever</small></button>
        <button type="button" class="qbank-quick-filter ${ui.qStatus==='Todas' && ui.qBlock==='Todos' && !ui.qFocusScheduleId && !ui.qSearch?'active':''}" id="exploreQuestionBank"><span class="quick-filter-dot all"></span><strong>Explorar banco</strong><small>Todos os blocos</small></button>
      </div>
    </header>
    <aside class="card question-sidebar">
      <div class="section-title"><div><span class="qbank-panel-eyebrow">Seu desempenho</span><h2>Visão geral</h2></div><div class="question-sidebar-actions"><button class="icon-btn" id="collapseQuestionSidebar" title="Ocultar painel e focar na questão" aria-label="Ocultar painel e focar na questão">${iconSvg('sidebar',{weight:'regular'})}</button></div></div>
      <div class="question-counts"><div><strong>${summary.answered}</strong><span class="muted">Feitas</span></div><div><strong>${summary.correct}</strong><span class="muted">Certas</span></div><div><strong>${summary.answered-summary.correct}</strong><span class="muted">Erros</span></div></div>
      <div class="question-issue-actions"><button class="question-issue-summary ${flagged?'has-items':''} ${showingFlagged?'active':''}" id="showQuestionIssues" aria-pressed="${showingFlagged}" ${flagged?'':'disabled'}><span>⚑</span><strong>${flagged}</strong><span>${showingFlagged ? 'gabaritos suspeitos exibidos' : flagged===1?'gabarito suspeito':'gabaritos suspeitos'}</span></button>${flagged?'<button class="icon-btn question-issue-clear" id="clearQuestionIssues" title="Limpar todas as marcações" aria-label="Limpar todas as marcações de gabarito suspeito">×</button>':''}</div>
      ${progress('Aproveitamento', summary.correct/Math.max(summary.answered,1), `${summary.correct} de ${summary.answered}`)}
      <div class="confidence-box"><strong>Confiança média: ${confidence.avgConfidence || '-'}%</strong><div class="muted">Sabendo: ${confidence.knownCorrect} · Chute: ${confidence.luckyCorrect}</div><div class="muted">Erros: ${confidence.attention} atenção · ${confidence.memory} dúvida/já vi · ${confidence.knowledge} base</div></div>
      ${focusItem ? (() => { const target=lessonQuestionTarget(focusItem); const completed=questionStatsForSchedule(focusItem.id).done; const remaining=Math.max(0,target-completed); return `<div class="focus-box"><strong>Foco da pendência</strong><div>${escapeHtml(focusItem.topic)}</div><div class="muted">Bloco ${focusItem.block} · ${escapeHtml(focusItem.area)}</div><div class="question-focus-progress"><strong>${remaining ? `Faltam ${remaining} questões` : 'Meta concluída'}</strong><span>${Math.min(completed,target)} de ${target}</span></div><button class="tiny-btn" id="clearQuestionFocus">Ver todas</button></div>`; })() : ''}
      <details class="question-filter-panel"><summary>Blocos <span>${escapeHtml(ui.qBlock === 'Todos' ? 'Todas' : questionCollectionLabel(ui.qBlock))}</span></summary>
      ${renderQuestionBlockOverview()}</details>
      <details class="question-filter-panel" open><summary>Filtros <span>${escapeHtml(ui.qStatus)}</span></summary>
      <div class="question-filter">
        <label class="search-field question-search-field"><span aria-hidden="true">⌕</span><input class="input" id="questionSearch" value="${escapeAttr(ui.qSearch)}" placeholder="Buscar enunciado, tema ou tag" autocomplete="off"></label>
        <label class="question-filter-field"><span>Coleção</span><select class="select" id="questionBlock">${blocks.map(block => `<option value="${escapeAttr(block)}" ${block===String(ui.qBlock)?'selected':''}>${block === 'Todos' ? 'Todas as questões' : escapeHtml(questionCollectionLabel(block))}</option>`).join('')}</select></label>
        <label class="question-filter-field"><span>Fonte</span><select class="select" id="questionSource">${sources.map(source => `<option value="${escapeAttr(source)}" ${source===ui.qSource?'selected':''}>${escapeHtml(source)}</option>`).join('')}</select></label>
        <label class="question-filter-field"><span>Tema</span><select class="select" id="questionTopic">${topics.map(topic => `<option value="${escapeAttr(topic)}" ${topic===ui.qTopic?'selected':''}>${escapeHtml(topic)}</option>`).join('')}</select></label>
        <label class="question-filter-field"><span>Status</span><select class="select" id="questionStatus">${['Todas','Não respondidas','Erradas','Certas','Gabarito suspeito'].map(status => `<option ${status===ui.qStatus?'selected':''}>${status}</option>`).join('')}</select></label>
        <button type="button" class="tiny-btn question-clear-filters" id="questionClearFilters">Limpar filtros</button>
      </div></details>
    </aside>
    <div class="card question-card">${activeQuestion ? renderQuestion(activeQuestion, questions.length) : renderQuestionEmptyState(ui.qFocusScheduleId ? 'Você concluiu as questões desta aula.' : 'Nenhuma questão corresponde a este filtro.')}</div>
  </div>`;
  document.getElementById('questionBlock').onchange = e => { ui.qFocusScheduleId=''; ui.qFocusQuestionIds=[]; ui.qBlock=e.target.value; ui.qSource='Todas'; ui.qTopic='Todos'; ui.qIndex=0; ui.justAnsweredId=''; render(); };
  document.getElementById('collapseQuestionSidebar').onclick = () => setQuestionFocusMode(true);
  document.getElementById('questionFocusToggle')?.addEventListener('click', () => setQuestionFocusMode(!questionSidebarCollapsed));
  document.getElementById('questionSource').onchange = e => { ui.qFocusScheduleId=''; ui.qFocusQuestionIds=[]; ui.qSource=e.target.value; ui.qTopic='Todos'; ui.qIndex=0; ui.justAnsweredId=''; render(); };
  document.getElementById('questionTopic').onchange = e => { ui.qFocusScheduleId=''; ui.qFocusQuestionIds=[]; ui.qTopic=e.target.value; ui.qIndex=0; ui.justAnsweredId=''; render(); };
  document.getElementById('questionStatus').onchange = e => { ui.qStatus=e.target.value; ui.qIndex=0; ui.justAnsweredId=''; render(); };
  document.querySelectorAll('[data-question-quick-filter]').forEach(button => button.onclick = e => { ui.qFocusScheduleId=''; ui.qFocusQuestionIds=[]; ui.qFocusTarget=0; ui.qStatus=e.currentTarget.dataset.questionQuickFilter; ui.qIndex=0; ui.qQuestionId=''; ui.justAnsweredId=''; render(); });
  document.getElementById('continueQuestionTraining').onclick = continueQuestionTraining;
  document.getElementById('exploreQuestionBank').onclick = exploreQuestionBank;
  document.getElementById('questionClearFilters').onclick = exploreQuestionBank;
  const questionSearch = document.getElementById('questionSearch');
  questionSearch.oninput = e => {
    ui.qSearch = e.target.value;
    ui.qIndex = 0;
    clearTimeout(questionSearchRenderTimer);
    questionSearchRenderTimer = setTimeout(refreshQuestionSearchResults,140);
  };
  document.getElementById('showQuestionIssues').onclick = () => { ui.qBlock='Todos'; ui.qSource='Todas'; ui.qTopic='Todos'; ui.qSearch=''; ui.qFocusScheduleId=''; ui.qFocusQuestionIds=[]; ui.qStatus='Gabarito suspeito'; ui.qIndex=0; ui.qQuestionId=''; ui.justAnsweredId=''; render(); };
  document.getElementById('clearQuestionIssues')?.addEventListener('click', () => {
    if(!confirm(`Limpar as ${flagged} marcações de gabarito suspeito?`)) return;
    questionBank.forEach(question => {
      const progress = state.questionProgress[question.id];
      if(!progress?.answerKeyIssue) return;
      setQuestionProgress(question.id,{ answerKeyIssue:false, answerKeyIssueAt:'' });
    });
    ui.qStatus='Todas'; ui.qIndex=0; ui.justAnsweredId=''; persist();
  });
  const clearFocus = document.getElementById('clearQuestionFocus');
  if(clearFocus) clearFocus.onclick = () => { ui.qFocusScheduleId=''; ui.qFocusQuestionIds=[]; ui.qFocusTarget=0; ui.qQuestionId=''; ui.qIndex=0; render(); };
  document.querySelectorAll('[data-qblock-pick]').forEach(button => button.onclick = e => { ui.qFocusScheduleId=''; ui.qFocusQuestionIds=[]; ui.qFocusTarget=0; ui.qBlock=e.currentTarget.dataset.qblockPick; ui.qSource='Todas'; ui.qTopic='Todos'; ui.qIndex=0; ui.qQuestionId=''; ui.justAnsweredId=''; render(); });
  bindQuestionTagFilters();
  bindQuestionActions(questions, activeQuestion);
  bindQuestionEmptyState();
  if(questionSidebarCollapsed && activeQuestion && !autoStudyIsRunning('questions')) startAutoStudy('questions',scheduleForQuestion(activeQuestion)?.id || '',60);
  updateAutoStudyIndicator();
}
function renderQuestionBlockOverview() {
  const groups = questionBlockStats();
  if(!groups.length) return '<div class="empty">Carregue questões para ver os blocos.</div>';
  return `<div class="qbank-block-grid">${groups.map(group => {
    const active = String(ui.qBlock) === group.block;
    const label = group.block === 'ineditas' ? 'Inéditas' : group.block;
    return `<button class="qbank-block-box ${active?'active':''}" data-qblock-pick="${escapeAttr(group.block)}"><strong>${escapeHtml(label)}</strong><small>${group.done}/${group.total}</small></button>`;
  }).join('')}</div>`;
}
function questionBlockStats() {
  if(Array.isArray(renderCache.questionBlockStats)) return renderCache.questionBlockStats;
  const groups = new Map();
  questionBank.forEach(question => {
    if(question.collectionBlock === undefined || question.collectionBlock === null || question.collectionBlock === '') return;
    const block = String(question.collectionBlock);
    const group = groups.get(block) || { block, total:0, done:0 };
    group.total += 1;
    if(questionResult(question)) group.done += 1;
    groups.set(block, group);
  });
  renderCache.questionBlockStats = [...groups.values()].sort((a,b)=>questionCollectionSort(a.block)-questionCollectionSort(b.block));
  return renderCache.questionBlockStats;
}
function importDefaultFields() {
  return {collection_block:'', collection:'', destination:'bank', simulado_name:'', schedule_id:'', area:'', specialty:'', topic:'', subtopic:'', institution:'ENAMED', year:'', difficulty:'', tags:'', status:'draft'};
}
function renderImportQuestionCard(question, index) {
  const errors = question._errors || [];
  const warnings = question._warnings || [];
  const images = question.images || [];
  return `<article class="import-question-card ${errors.length?'invalid':warnings.length?'warning':'valid'}" data-import-card="${index}">
    <div class="import-question-head"><div><strong>Questão ${escapeHtml(String(question.sourceNumber || question.number || index + 1))}</strong><span class="badge ${errors.length?'no':warnings.length?'wait':'done'}">${errors.length?'Inválida':warnings.length?'Aviso':'Válida'}</span></div><div class="import-card-actions"><button class="tiny-btn" data-import-move="up" data-import-index="${index}" ${index?'':'disabled'} title="Mover para cima">↑</button><button class="tiny-btn" data-import-move="down" data-import-index="${index}" title="Mover para baixo">↓</button><button class="tiny-btn" data-import-duplicate="${index}">Duplicar</button><button class="tiny-btn" data-import-remove="${index}" title="Remover do lote">×</button></div></div>
    ${errors.length?`<div class="import-errors">${errors.map(error => `<div>⚠ ${escapeHtml(error)}</div>`).join('')}</div>`:''}${warnings.length?`<div class="import-warnings">${warnings.map(warning => `<div>ⓘ ${escapeHtml(warning)}</div>`).join('')}</div>`:''}
    <div class="import-preview-meta"><span>${escapeHtml(question.area || 'Sem área')}</span><span>${escapeHtml(question.topic || 'Sem tema')}</span><span>${question.tags?.length ? escapeHtml(question.tags.join(' · ')) : 'Sem tags'}</span></div>
    <label>Enunciado<textarea class="textarea" data-import-edit="stem" data-import-index="${index}">${escapeHtml(question.stem || '')}</textarea></label>
    <div class="import-options">${Object.entries(question.options || {}).map(([key,value]) => `<label><b>${escapeHtml(key)}</b><textarea class="textarea" data-import-option="${escapeAttr(key)}" data-import-index="${index}">${escapeHtml(value)}</textarea></label>`).join('')}</div>
    <div class="field-row import-edit-fields"><label>Gabarito<select class="select" data-import-edit="answer" data-import-index="${index}">${Object.keys(question.options || {}).map(key => `<option value="${escapeAttr(key)}" ${question.answer===key?'selected':''}>${escapeHtml(key)}</option>`).join('')}</select></label><label>Tema<input class="input" data-import-edit="topic" data-import-index="${index}" value="${escapeAttr(question.topic || '')}"></label><label>Tags<input class="input" data-import-edit="tags" data-import-index="${index}" value="${escapeAttr((question.tags || []).join(' | '))}"></label></div>
    <label>Comentário<textarea class="textarea" data-import-edit="comment" data-import-index="${index}">${escapeHtml(question.comment || '')}</textarea></label>
    <div class="import-image-list">${images.length ? images.map(image => `<div class="import-image-item" data-import-drop="${escapeAttr(image.alias)}" data-import-index="${index}"><span>Imagem: <strong>${escapeHtml(image.alias)}</strong></span><span class="badge ${image.assetId?'done':'wait'}">${image.assetId?'anexada':'pendente'}</span><label class="tiny-btn">${image.assetId?'Trocar':'Selecionar arquivo'}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-import-image="${escapeAttr(image.alias)}" data-import-index="${index}" hidden></label></div>`).join('') : '<span class="muted">Sem imagens neste enunciado.</span>'}</div>
  </article>`;
}
function incorporationDestination(question) {
  const lesson = state.schedule.find(item => item.id === question.scheduleId);
  if(lesson) return `B${String(lesson.block).padStart(2,'0')} · ${lesson.topic}`;
  const block = question.collectionBlock ? `Bloco ${String(question.collectionBlock).padStart(2,'0')}` : 'Banco geral';
  return [block, question.topic || question.area].filter(Boolean).join(' · ');
}
function incorporationEntries() {
  ensureImportedQuestions();
  const recorded = new Map(state.incorporationHistory.map(entry => [entry.questionId, entry]));
  state.importedQuestions.forEach(question => {
    if(recorded.has(question.id)) return;
    recorded.set(question.id, {
      id: `legacy-${question.id}`,
      questionId: question.id,
      createdAt: question.incorporatedAt || question.createdAt || '',
      destination: incorporationDestination(question),
      scheduleId: question.scheduleId || '',
      block: question.collectionBlock || '',
      topic: question.topic || '',
      source: question.sourceLabel || 'Importação manual',
      priority: n(question.importPriority),
      displayOrder: n(question.displayOrder)
    });
  });
  return [...recorded.values()].sort((a,b) => n(b.priority) - n(a.priority) || n(a.displayOrder) - n(b.displayOrder) || (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0));
}
function renderIncorporationHistory() {
  const entries = incorporationEntries();
  const rows = entries.slice(0,80).map(entry => {
    const question = state.importedQuestions.find(item => item.id === entry.questionId);
    const removed = Boolean(entry.deletedAt) || !question;
    const label = question ? `Questão ${question.sourceNumber || question.number || 'sem número'}` : 'Questão excluída';
    const when = entry.createdAt ? new Date(entry.createdAt).toLocaleString('pt-BR', {dateStyle:'short', timeStyle:'short'}) : 'data anterior não registrada';
    const priority = n(entry.priority || question?.importPriority);
    const editing = ui.incorporationEditId === entry.questionId;
    const stars = [1,2,3].map(value => `<button class="incorporation-star ${value<=priority?'active':''}" data-incorporation-priority="${escapeAttr(entry.questionId)}" data-priority-value="${value}" title="Prioridade ${value} de 3" aria-label="Prioridade ${value} de 3">★</button>`).join('');
    const editor = editing && question ? `<div class="incorporation-editor"><label>Nome da lista<input class="input" data-incorporation-field="name" value="${escapeAttr(question.collectionLabel || question.sourceLabel || '')}" placeholder="Ex.: Questões de revisão"></label><label>Ordem<input class="input" type="number" min="1" step="1" data-incorporation-field="order" value="${n(question.displayOrder) || 1}"></label><button class="tiny-btn" data-incorporation-save="${escapeAttr(entry.questionId)}">Salvar</button><button class="tiny-btn" data-incorporation-cancel="${escapeAttr(entry.questionId)}">Cancelar</button></div>` : '';
    return `<div class="incorporation-row ${removed?'removed':''}"><div class="incorporation-details"><strong>${escapeHtml(label)}</strong><div class="muted">${escapeHtml(entry.destination || incorporationDestination(question || entry))}</div><small>${escapeHtml(question?.collectionLabel || entry.source || '')} · ${escapeHtml(when)}</small>${editor}</div><div class="incorporation-actions">${removed ? '<span class="badge no">excluída</span>' : `<div class="incorporation-priority" title="Prioridade: ${priority || 0} de 3">${stars}</div><button class="tiny-btn" data-incorporation-open="${escapeAttr(entry.questionId)}">Abrir</button><button class="tiny-btn" data-incorporation-edit="${escapeAttr(entry.questionId)}" title="Editar nome e ordem">Editar</button><button class="tiny-btn danger" data-incorporation-delete="${escapeAttr(entry.questionId)}" title="Excluir do banco">×</button>`}</div></div>`;
  }).join('');
  return `<section class="card incorporation-history"><div class="section-title"><div><h3>Histórico de incorporações</h3><div class="muted">Questões adicionadas ao banco, com o destino registrado para você revisar ou corrigir.</div></div><span class="badge today">${entries.filter(entry => !entry.deletedAt && state.importedQuestions.some(question => question.id === entry.questionId)).length} ativas</span></div><div class="incorporation-list">${rows || '<div class="empty">As questões que você incorporar aparecerão aqui.</div>'}</div></section>`;
}
function openIncorporatedQuestion(questionId) {
  const question = state.importedQuestions.find(item => item.id === questionId);
  if(!question) return;
  ui.qBlock = question.collectionBlock ? String(question.collectionBlock) : 'Todos';
  ui.qSource = 'Todas';
  ui.qTopic = 'Todos';
  ui.qStatus = 'Todas';
  ui.qQuestionId = question.id;
  ui.qIndex = 0;
  ui.qFocusScheduleId = '';
  ui.qFocusQuestionIds = [];
  ui.qFocusTarget = 0;
  navigateToTab('questoes');
}
function deleteIncorporatedQuestion(questionId) {
  const question = state.importedQuestions.find(item => item.id === questionId);
  if(!question) return;
  if(!confirm('Excluir esta questão do banco geral? Ela será removida em todos os dispositivos sincronizados.')) return;
  state.importedQuestions = state.importedQuestions.filter(item => item.id !== questionId);
  const history = state.incorporationHistory.find(entry => entry.questionId === questionId);
  if(history) { history.deletedAt = new Date().toISOString(); history.updatedAt = history.deletedAt; }
  removeQuestionProgress(questionId);
  delete state.questionEdits[questionId];
  delete state.questionFlashcards[questionId];
  delete state.questionLogged[questionId];
  questionBank = questionBank.filter(item => item.id !== questionId);
  invalidateQuestionBankRenderCache();
  persist();
  renderQuestionImporter();
  showStudyToast('Questão excluída do banco geral.');
}
function reorderQuestionBank() {
  questionBank.sort((a,b) => n(b.importPriority)-n(a.importPriority) || questionCollectionSort(a)-questionCollectionSort(b) || n(a.displayOrder)-n(b.displayOrder) || String(a.sourceLabel || '').localeCompare(String(b.sourceLabel || '')) || n(a.number)-n(b.number));
}
function updateIncorporationPriority(questionId, priority) {
  const question = state.importedQuestions.find(item => item.id === questionId);
  if(!question) return;
  const history = state.incorporationHistory.find(entry => entry.questionId === questionId);
  const value = n(priority);
  question.importPriority = value;
  question.updatedAt = new Date().toISOString();
  const bankQuestion = questionBank.find(item => item.id === questionId);
  if(bankQuestion) bankQuestion.importPriority = value;
  if(history) { history.priority = value; history.updatedAt = question.updatedAt; }
  reorderQuestionBank();
  invalidateQuestionBankRenderCache();
  persist();
  renderQuestionImporter();
}
function saveIncorporationEdit(questionId) {
  const question = state.importedQuestions.find(item => item.id === questionId);
  if(!question) return;
  const name = document.querySelector('[data-incorporation-field="name"]')?.value?.trim();
  const order = Math.max(1, n(document.querySelector('[data-incorporation-field="order"]')?.value) || 1);
  const history = state.incorporationHistory.find(entry => entry.questionId === questionId);
  if(name) question.collectionLabel = name;
  question.displayOrder = order;
  question.updatedAt = new Date().toISOString();
  const bankQuestion = questionBank.find(item => item.id === questionId);
  if(bankQuestion) { bankQuestion.collectionLabel = question.collectionLabel; bankQuestion.displayOrder = order; }
  if(history) { history.displayOrder = order; history.updatedAt = question.updatedAt; }
  reorderQuestionBank();
  ui.incorporationEditId = '';
  invalidateQuestionBankRenderCache();
  persist();
  renderQuestionImporter();
  showStudyToast('Nome e ordem da lista atualizados.');
}
function renderQuestionImporter() {
  const draft = questionImportDraft || {};
  const defaults = {...importDefaultFields(), ...(draft.defaults || {})};
  const questions = Array.isArray(draft.questions) ? draft.questions : [];
  const report = draft.report || {errors:[], warnings:[], markers:[], estimated:0};
  document.getElementById('importar-questoes').innerHTML = `<div class="importer-layout"><section class="card"><div class="section-title"><div><span class="eyebrow">Banco privado</span><h2>Adicionar questões</h2><div class="muted">Parser determinístico: cole o modelo, revise tudo e só então salve.</div></div><span class="badge today">até ${QUESTION_IMPORT_MAX} por lote</span></div><div class="import-step"><h3>1. Configurações gerais</h3><div class="field-row import-defaults"><label>Coleção / bloco<input class="input" data-import-default="collection_block" value="${escapeAttr(defaults.collection_block)}" placeholder="Ex.: 10 ou ENARE 2025"></label><label>Área<input class="input" data-import-default="area" value="${escapeAttr(defaults.area)}" placeholder="Clínica Médica"></label><label>Especialidade<input class="input" data-import-default="specialty" value="${escapeAttr(defaults.specialty)}"></label><label>Tema padrão<input class="input" data-import-default="topic" value="${escapeAttr(defaults.topic)}"></label><label>Instituição<input class="input" data-import-default="institution" value="${escapeAttr(defaults.institution)}"></label><label>Ano<input class="input" data-import-default="year" value="${escapeAttr(defaults.year)}" inputmode="numeric"></label><label>Dificuldade<select class="select" data-import-default="difficulty"><option value="">Não definida</option>${['baixa','média','alta'].map(value => `<option ${defaults.difficulty===value?'selected':''}>${value}</option>`).join('')}</select></label><label>Tags padrão<input class="input" data-import-default="tags" value="${escapeAttr(defaults.tags)}" placeholder="tema | revisão"></label><label>Status inicial<select class="select" data-import-default="status">${['draft','needs_review','ready','published'].map(value => `<option ${defaults.status===value?'selected':''}>${value}</option>`).join('')}</select></label></div></div><div class="import-step"><div class="section-title"><h3>2. Texto do lote</h3><div class="import-toolbar"><span class="muted" id="importCharCount">${String(draft.text || '').length} caracteres</span><button class="tiny-btn" id="importExample">Usar modelo</button><button class="tiny-btn" id="downloadImportTemplate">Baixar TXT</button><button class="tiny-btn" id="clearImportText">Limpar</button></div></div><textarea class="textarea import-source" id="importSource" placeholder="Cole aqui uma ou mais questões entre @@QUESTION e @@END">${escapeHtml(draft.text || '')}</textarea><div class="import-actions"><button class="icon-btn primary" id="parseQuestionBatch">Interpretar questões</button><button class="icon-btn" id="saveImportDraft">Salvar rascunho</button></div><div class="muted import-help">Obrigatórios: [STEM], [OPTIONS], [ANSWER] e pelo menos duas alternativas. Imagens usam [[IMAGE:nome]].</div></div></section><section class="card import-review"><div class="section-title"><div><h3>3. Revisão antes de salvar</h3><div class="muted">${questions.length} questões · ${questions.filter(q => !(q._errors || []).length).length} válidas · ${report.warnings?.length || 0} avisos · ${report.markers?.length || 0} imagens pendentes</div></div><button class="icon-btn primary" id="commitImportedQuestions" ${questions.length && questions.some(q => !(q._errors || []).length)?'':'disabled'}>Salvar questões</button></div>${report.errors?.length ? `<div class="import-report error"><strong>Erros de formatação</strong>${report.errors.slice(0,12).map(error => `<div>Linha ${error.line || '?'}${error.question?` · questão ${error.question}`:''}: ${escapeHtml(error.message)}</div>`).join('')}</div>` : ''}${report.warnings?.length ? `<div class="import-report warning"><strong>Avisos para revisão</strong>${report.warnings.slice(0,12).map(error => `<div>${error.question?`Questão ${error.question}: `:''}${escapeHtml(error.message)}</div>`).join('')}</div>` : ''}${questions.length ? `<div class="import-review-list">${questions.map(renderImportQuestionCard).join('')}</div>` : '<div class="empty">Interprete o texto para abrir a revisão visual.</div>'}</section></div>`;
  document.getElementById('importar-questoes').insertAdjacentHTML('beforeend', renderIncorporationHistory());
  enhanceQuestionImporterUi();
  bindQuestionImporter();
}
function importExampleText() { return `@@QUESTION\nnumber: 1\narea: Clínica Médica\ntopic: Síndrome Coronariana Aguda\ntags: cardiologia | emergência\n\n[STEM]\nPaciente com dor torácica há 40 minutos.\n\n[OPTIONS]\nA. Conduta inicial inadequada.\nB. Observar sem tratamento.\nC. Iniciar protocolo de síndrome coronariana aguda.\nD. Dar alta.\n\n[ANSWER]\nC\n\n[COMMENT]\nExplique aqui o raciocínio do gabarito e das alternativas.\n\n[PEARL]\nUma frase curta de alto rendimento.\n\n[TRAP]\nA pegadinha que não pode ser confundida.\n\n[SOURCE]\nFonte da questão.\n@@END` }
function updateImportDraftFromForm() {
  questionImportDraft = questionImportDraft || {};
  questionImportDraft.text = document.getElementById('importSource')?.value || questionImportDraft.text || '';
  questionImportDraft.defaults = [...document.querySelectorAll('[data-import-default]')].reduce((acc, input) => { acc[input.dataset.importDefault] = input.value; return acc; }, {...importDefaultFields(), ...(questionImportDraft.defaults || {})});
  saveQuestionImportDraft();
}
function refreshImportDraftReport() {
  const questions = questionImportDraft?.questions || [];
  questionImportDraft.report = {
    errors: questions.flatMap((q,index) => (q._errors || []).map(message => ({question:index + 1, line:1, message}))),
    warnings: questions.flatMap((q,index) => (q._warnings || []).map(message => ({question:index + 1, line:1, message}))),
    markers: questions.flatMap((q,index) => (q.images || []).filter(image => !image.assetId).map(image => ({question:index + 1, alias:image.alias, line:1}))),
    estimated: questions.length
  };
}
function cleanupImportDraft(mode) {
  const questions = questionImportDraft?.questions || [];
  if(mode === 'invalid') questionImportDraft.questions = questions.filter(question => !(question._errors || []).length);
  if(mode === 'duplicates') {
    const seen = new Set();
    const existing = new Set(questionBank.map(questionDuplicateKey));
    questionImportDraft.questions = questions.filter(question => {
      const key = questionDuplicateKey(question);
      if(seen.has(key) || existing.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  refreshImportDraftReport();
  saveQuestionImportDraft();
  renderQuestionImporter();
}
function enhanceQuestionImporterUi() {
  const defaults = document.querySelector('.import-defaults');
  if(defaults && !defaults.querySelector('[data-import-default="destination"]')) {
    defaults.insertAdjacentHTML('afterbegin', '<label>Destino<select class="select" data-import-default="destination"><option value="bank">Banco de questões</option><option value="simulado">Simulado separado</option></select></label><label>Nome do simulado<input class="input" data-import-default="simulado_name" placeholder="Ex.: ENARE 2024"></label>');
    const saved = questionImportDraft?.defaults || {};
    defaults.querySelector('[data-import-default="destination"]').value = saved.destination || 'bank';
    defaults.querySelector('[data-import-default="simulado_name"]').value = saved.simulado_name || '';
    defaults.insertAdjacentHTML('afterend', '<div class="muted import-help">Banco de questões deixa o conteúdo disponível nos blocos. “Simulado separado” cria uma coleção identificada pelo nome, sem misturar com os blocos de aula.</div>');
  }
  if(defaults && !defaults.querySelector('[data-import-default="schedule_id"]')) {
    const scheduleOptions = state.schedule.slice().sort((a,b) => n(a.block)-n(b.block) || n(a.lessonOrder)-n(b.lessonOrder) || byDate(a,b)).map(item => `<option value="${escapeAttr(item.id)}">B${String(item.block).padStart(2,'0')} · ${escapeHtml(item.topic)}</option>`).join('');
    defaults.insertAdjacentHTML('afterbegin', `<label class="import-schedule-link">Vincular à aula<select class="select" data-import-default="schedule_id"><option value="">Sem aula específica</option>${scheduleOptions}</select></label>`);
    const select = defaults.querySelector('[data-import-default="schedule_id"]');
    select.value = questionImportDraft?.defaults?.schedule_id || '';
    select.addEventListener('change', event => {
      const lesson = state.schedule.find(item => item.id === event.currentTarget.value);
      if(!lesson) { updateImportDraftFromForm(); return; }
      const setValue = (field,value) => { const input=defaults.querySelector(`[data-import-default="${field}"]`); if(input) input.value=value; };
      setValue('collection_block', String(lesson.block));
      setValue('area', lesson.area || '');
      setValue('topic', lesson.topic || '');
      updateImportDraftFromForm();
    });
  }
  if(defaults && !defaults.querySelector('[data-import-block-picker]')) {
    const blocks = (window.ENAMED_LOCAL_QUESTION_INDEX?.blocks || []).slice().sort((a,b) => questionCollectionSort(a.block) - questionCollectionSort(b.block));
    const blockOptions = blocks.map(block => `<option value="${escapeAttr(String(block.block))}">${escapeHtml(questionCollectionLabel(block.block))} · ${block.count} questões</option>`).join('');
    defaults.insertAdjacentHTML('afterbegin', `<label class="import-block-link">Incluir direto num bloco existente<select class="select" data-import-block-picker><option value="">Selecionar…</option>${blockOptions}</select></label>`);
    const blockPicker = defaults.querySelector('[data-import-block-picker]');
    blockPicker.addEventListener('change', event => {
      const picked = event.currentTarget.value;
      if(!picked) return;
      const blockField = defaults.querySelector('[data-import-default="collection_block"]');
      if(blockField) blockField.value = picked;
      event.currentTarget.value = '';
      updateImportDraftFromForm();
      showStudyToast(`Lote será incluído em ${questionCollectionLabel(picked)}.`);
    });
  }
  const commit = document.getElementById('commitImportedQuestions');
  if(commit && !document.getElementById('removeImportDuplicates')) {
    commit.insertAdjacentHTML('beforebegin', '<button class="tiny-btn" id="removeImportDuplicates" title="Remove cópias dentro do lote e questões que já existem no mesmo bloco">Limpar duplicadas</button><button class="tiny-btn" id="removeImportInvalid" title="Remove questões com erro de estrutura">Remover inválidas</button>');
  }
  document.querySelectorAll('[data-import-card]').forEach(card => {
    const index = n(card.dataset.importCard);
    const imageList = card.querySelector('.import-image-list');
    if(imageList && !imageList.querySelector('[data-import-add-image]')) imageList.insertAdjacentHTML('beforeend', `<label class="tiny-btn import-add-image">+ Colar/ adicionar imagem<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-import-add-image="${index}" hidden></label>`);
    (questionImportDraft.questions?.[index]?.images || []).forEach(image => {
      const row=imageList?.querySelector(`[data-import-drop="${CSS.escape(image.alias)}"]`);
      const url=window.ENAMED_IMPORTED_ASSET_URLS?.[image.assetId];
      if(row && url && !row.querySelector('.import-image-preview')) row.insertAdjacentHTML('afterbegin', `<img class="import-image-preview" src="${escapeAttr(url)}" alt="${escapeAttr(image.alias)}">`);
    });
  });
}
function bindQuestionImporter() {
  const source = document.getElementById('importSource');
  source?.addEventListener('input', () => { updateImportDraftFromForm(); const count=document.getElementById('importCharCount'); if(count) count.textContent=`${source.value.length} caracteres`; });
  document.querySelectorAll('[data-import-default]').forEach(input => input.addEventListener('change', updateImportDraftFromForm));
  document.getElementById('importExample')?.addEventListener('click', () => { source.value=importExampleText(); source.dispatchEvent(new Event('input')); });
  document.getElementById('clearImportText')?.addEventListener('click', () => { source.value=''; questionImportDraft.questions=[]; source.dispatchEvent(new Event('input')); renderQuestionImporter(); });
  document.getElementById('saveImportDraft')?.addEventListener('click', () => { updateImportDraftFromForm(); showStudyToast('Rascunho do lote salvo neste dispositivo.'); });
  document.getElementById('downloadImportTemplate')?.addEventListener('click', () => { const blob=new Blob([importExampleText()],{type:'text/plain;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='modelo-importacao-questoes.txt'; a.click(); URL.revokeObjectURL(a.href); });
  document.getElementById('parseQuestionBatch')?.addEventListener('click', () => { updateImportDraftFromForm(); const parsed=parseQuestionBatch(questionImportDraft.text, questionImportDraft.defaults); questionImportDraft.questions=parsed; questionImportDraft.report=parseQuestionBatch.lastReport; saveQuestionImportDraft(); renderQuestionImporter(); });
  document.querySelectorAll('[data-import-edit]').forEach(input => input.addEventListener('input', event => { const index=n(event.currentTarget.dataset.importIndex); const field=event.currentTarget.dataset.importEdit; const q=questionImportDraft.questions?.[index]; if(!q) return; q[field]=field==='tags'?String(event.currentTarget.value).split('|').map(tag=>tag.trim()).filter(Boolean):event.currentTarget.value; q.contentHash=simpleContentHash([q.stem,...Object.values(q.options||{}),q.answer].join('|')); saveQuestionImportDraft(); }));
  document.querySelectorAll('[data-import-option]').forEach(input => input.addEventListener('input', event => { const q=questionImportDraft.questions?.[n(event.currentTarget.dataset.importIndex)]; if(!q) return; q.options[event.currentTarget.dataset.importOption]=event.currentTarget.value; q.contentHash=simpleContentHash([q.stem,...Object.values(q.options||{}),q.answer].join('|')); saveQuestionImportDraft(); }));
  document.querySelectorAll('[data-import-remove]').forEach(button => button.onclick=() => { questionImportDraft.questions.splice(n(button.dataset.importRemove),1); saveQuestionImportDraft(); renderQuestionImporter(); });
  document.querySelectorAll('[data-import-duplicate]').forEach(button => button.onclick=() => { const q=structuredClone(questionImportDraft.questions[n(button.dataset.importDuplicate)]); q.id=uuidv7(); q.sourceNumber=''; q.displayOrder=questionImportDraft.questions.length+1; questionImportDraft.questions.splice(n(button.dataset.importDuplicate)+1,0,q); saveQuestionImportDraft(); renderQuestionImporter(); });
  document.querySelectorAll('[data-import-move]').forEach(button => button.onclick=() => { const index=n(button.dataset.importIndex); const target=button.dataset.importMove==='up'?index-1:index+1; if(target<0 || target>=questionImportDraft.questions.length) return; [questionImportDraft.questions[index],questionImportDraft.questions[target]]=[questionImportDraft.questions[target],questionImportDraft.questions[index]]; saveQuestionImportDraft(); renderQuestionImporter(); });
  const attachImportImage = (file, index, alias) => { const q=questionImportDraft.questions?.[index]; const image=q?.images?.find(item=>item.alias===alias); if(!file || !image) return; if(file.size>10*1024*1024 || !file.type.startsWith('image/')) { alert('Use uma imagem de até 10 MB.'); return; } image.assetId=uuidv7(); image.originalFilename=file.name; image.mimeType=file.type; image.sizeBytes=file.size; image.url=URL.createObjectURL(file); image.pending=false; window.ENAMED_IMPORTED_ASSET_URLS=window.ENAMED_IMPORTED_ASSET_URLS||{}; window.ENAMED_IMPORTED_ASSET_URLS[image.assetId]=image.url; saveQuestionImportDraft(); renderQuestionImporter(); };
  document.querySelectorAll('[data-import-image]').forEach(input => input.addEventListener('change', event => attachImportImage(event.currentTarget.files?.[0], n(event.currentTarget.dataset.importIndex), event.currentTarget.dataset.importImage)));
  document.querySelectorAll('[data-import-add-image]').forEach(input => input.addEventListener('change', event => {
    const index=n(event.currentTarget.dataset.importAddImage);
    const q=questionImportDraft.questions?.[index];
    if(!q) return;
    q.images=Array.isArray(q.images) ? q.images : [];
    const alias=`imagem-${q.images.length + 1}`;
    q.images.push({alias,assetId:null,pending:true});
    attachImportImage(event.currentTarget.files?.[0], index, alias);
  }));
  document.querySelectorAll('[data-import-drop]').forEach(drop => { drop.addEventListener('dragover', event => { event.preventDefault(); drop.classList.add('dragging'); }); drop.addEventListener('dragleave', () => drop.classList.remove('dragging')); drop.addEventListener('drop', event => { event.preventDefault(); drop.classList.remove('dragging'); attachImportImage(event.dataTransfer.files?.[0], n(drop.dataset.importIndex), drop.dataset.importDrop); }); });
  document.getElementById('importar-questoes')?.addEventListener('paste', event => {
    const file=[...(event.clipboardData?.items || [])].find(item => item.type.startsWith('image/'))?.getAsFile();
    if(!file) return;
    const focusedCard=document.activeElement?.closest?.('[data-import-card]');
    const index=focusedCard ? n(focusedCard.dataset.importCard) : 0;
    const q=questionImportDraft.questions?.[index];
    if(!q) return;
    q.images=Array.isArray(q.images) ? q.images : [];
    const pending=q.images.find(image => !image.assetId);
    const alias=pending?.alias || `imagem-${q.images.length + 1}`;
    if(!pending) q.images.push({alias,assetId:null,pending:true});
    event.preventDefault();
    attachImportImage(file,index,alias);
    showStudyToast(`Imagem anexada à questão ${index + 1}.`);
  });
  document.getElementById('removeImportDuplicates')?.addEventListener('click', () => cleanupImportDraft('duplicates'));
  document.getElementById('removeImportInvalid')?.addEventListener('click', () => cleanupImportDraft('invalid'));
  document.querySelectorAll('[data-incorporation-open]').forEach(button => button.onclick = () => openIncorporatedQuestion(button.dataset.incorporationOpen));
  document.querySelectorAll('[data-incorporation-priority]').forEach(button => button.onclick = () => updateIncorporationPriority(button.dataset.incorporationPriority, button.dataset.priorityValue));
  document.querySelectorAll('[data-incorporation-edit]').forEach(button => button.onclick = () => { ui.incorporationEditId = button.dataset.incorporationEdit; renderQuestionImporter(); });
  document.querySelectorAll('[data-incorporation-cancel]').forEach(button => button.onclick = () => { ui.incorporationEditId = ''; renderQuestionImporter(); });
  document.querySelectorAll('[data-incorporation-save]').forEach(button => button.onclick = () => saveIncorporationEdit(button.dataset.incorporationSave));
  document.querySelectorAll('[data-incorporation-delete]').forEach(button => button.onclick = () => deleteIncorporatedQuestion(button.dataset.incorporationDelete));
  document.getElementById('commitImportedQuestions')?.addEventListener('click', () => {
    if(!confirm(`Salvar ${questionImportDraft.questions.length} questões no banco privado?`)) return;
    const valid=questionImportDraft.questions.filter(q => !(q._errors||[]).length);
    if(!valid.length) return;
    ensureImportedQuestions();
    const existing=new Set(questionBank.map(questionDuplicateKey));
    const batch=new Set();
    const now=new Date().toISOString();
    const fresh=valid.filter(q=>{
      const key=questionDuplicateKey(q);
      if(existing.has(key) || batch.has(key)) return false;
      batch.add(key);
      return true;
    }).map((q,index)=>({
      ...q,
      displayOrder:state.importedQuestions.length+index+1,
      incorporatedAt:now,
      updatedAt:now,
      importStatus:q.importStatus==='published'?'published':q.importStatus||'ready',
      _errors:undefined,
      _warnings:undefined
    }));
    state.importedQuestions.push(...fresh);
    fresh.forEach(question => state.incorporationHistory.push({
      id:uuidv7(), questionId:question.id, createdAt:now, updatedAt:now,
      destination:incorporationDestination(question), scheduleId:question.scheduleId || '',
      block:question.collectionBlock || '', topic:question.topic || '', priority:0,
      displayOrder:question.displayOrder,
      source:question.sourceLabel || 'Importação manual'
    }));
    questionBank=deduplicateQuestions([...questionBank,...fresh]);
    questionImportDraft={text:'',defaults:importQuestionDefaults(),questions:[],report:{errors:[],warnings:[],markers:[],estimated:0}};
    saveQuestionImportDraft();
    invalidateQuestionBankRenderCache();
    persist();
    renderQuestionImporter();
    showStudyToast(`${fresh.length} questões adicionadas. ${valid.length-fresh.length} duplicatas ignoradas.`);
  });
}
function importQuestionDefaults() { return importDefaultFields(); }
function renderQuestion(question, total) {
  const savedProgress = state.questionProgress[question.id] || {};
  const result = questionResult(question);
  const linkedLesson = scheduleForQuestion(question);
  const isSpecialCollection = String(question.collectionBlock) === 'ineditas';
  const collectionLabel = question.collectionLabel || questionCollectionLabel(question.collectionBlock || '-');
  const draftAnswer = ui.draftAnswers[question.id] || savedProgress.draftAnswer || '';
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
    return `<div class="answer-row"><button class="answer-option ${cls} ${isEliminated?'eliminated':''}" data-question="${question.id}" data-answer="${letter}" title="Alternativa ${letter} · tecla ${optionIndex+1}" ${result?'disabled':''}><span class="answer-letter">${letter}</span><span style="font-size:${state.questionSettings.fontSize}px">${renderHighlightedText(text, [], false)}</span></button><button class="eliminate-btn ${isEliminated?'active':''}" data-eliminate="${letter}" title="Riscar alternativa ${letter} com J" aria-label="Riscar alternativa ${letter}">×</button></div>`;
  }).join('');
  const timeoutText = result?.timedOut ? ' Tempo esgotado no modo contratempo.' : '';
  const feedback = result ? `<div class="question-feedback ${result.correct?'':'wrong'}"><div><strong>${result.correct?'Resposta correta.':'Resposta incorreta.'}</strong>${timeoutText} Gabarito: ${question.answer}.${!result.correct ? ' Marque este assunto para revisão.' : ''}</div>${!result.correct && linkedLesson ? `<button class="tiny-btn question-material-link" data-question-materials="${escapeAttr(linkedLesson.id)}">Revisar material da aula</button>` : ''}</div>` : '';
  const comment = result && question.comment ? renderQuestionCommentPanel(question, result, highlights) : '';
  const reviewButton = result && !result.correct ? `<button class="icon-btn" id="questionFeynman">Enviar tema para Feynman</button>` : '';
  const difficulty = ['facil','media','dificil'];
  const difficultyLabels = { facil:'Fácil', media:'Média', dificil:'Difícil' };
  const difficultyPicker = `<div class="question-difficulty" role="group" aria-label="Dificuldade percebida da questão"><span class="question-difficulty-label">Dificuldade:</span>${difficulty.map(level => `<button type="button" class="tiny-btn question-difficulty-btn difficulty-${level} ${savedProgress.difficulty===level?'active':''}" data-question-difficulty="${level}" aria-pressed="${savedProgress.difficulty===level}">${difficultyLabels[level]}</button>`).join('')}</div>`;
  const questionInfo = `<div class="question-info-stack"><div class="question-meta" data-question-tags-for="${escapeAttr(question.id)}"><span class="badge today">${escapeHtml(collectionLabel)}</span><span class="badge today">Questão ${question.number}</span><span class="badge today" data-auto-study-clock title="Clique para pausar ou retomar o cronômetro" data-auto-study-prefix="Questões ·">Questões · 00:00</span>${question.edited?'<span class="badge wait">Editada</span>':''}<span class="badge wait">${escapeHtml(question.area)}</span><span class="badge done">${escapeHtml(question.topic)}</span></div>${renderQuestionTags(question)}</div>`;
  const focusInfo = questionSidebarCollapsed ? questionInfo : '';
  const bodyInfo = questionSidebarCollapsed ? '' : questionInfo;
  const sessionProgress = total ? Math.round(((ui.qIndex + 1) / total) * 100) : 0;
  return `<div class="question-topbar"><button class="icon-btn question-top-nav" id="questionTopPrev" aria-label="Questão anterior" ${ui.qIndex===0?'disabled':''}>‹</button><div class="question-heading"><div class="question-heading-line"><span class="qbank-eyebrow">Sessão atual</span><strong>${ui.qIndex+1} <span>de ${total}</span></strong></div><div class="muted">${escapeHtml(question.sourceLabel || question.source || 'Banco privado')}</div><div class="question-session-progress" aria-label="${sessionProgress}% desta sessão"><span style="width:${sessionProgress}%"></span></div>${focusInfo}</div><div class="question-tool-strip"><button class="icon-btn question-focus-toggle" id="questionFocusToggle" title="${questionSidebarCollapsed?'Abrir painel lateral':'Modo foco'}" aria-label="${questionSidebarCollapsed?'Abrir painel do banco':'Ocultar painel e focar na questão'}" aria-pressed="${questionSidebarCollapsed}">${iconSvg(questionSidebarCollapsed?'sidebar':'focus',{weight:'regular'})}</button><div class="question-font-control" aria-label="Tamanho do texto"><button class="tiny-btn" id="questionFontDown" title="Diminuir fonte">A−</button><span class="question-font-value">${state.questionSettings.fontSize}px</span><button class="tiny-btn" id="questionFontUp" title="Aumentar fonte">A+</button></div><button class="icon-btn question-timer-toggle ${questionTimer.running?'active':''}" id="questionTimerToggle" title="Cronômetro">${iconSvg('simulation',{weight:'regular'})}</button><button class="icon-btn question-key-issue ${answerKeyIssue?'active':''}" id="questionKeyIssue" title="${answerKeyIssue?'Remover marcação de gabarito suspeito':'Marcar gabarito suspeito'}" aria-pressed="${answerKeyIssue}">${iconSvg('flag',{weight:'regular'})}</button><button class="icon-btn question-edit-action" id="questionEditToggle" title="Corrigir texto">Editar</button><button class="icon-btn danger question-delete-action" id="questionDelete" title="Excluir questão">${iconSvg('delete',{weight:'regular'})}</button></div><button class="icon-btn question-top-nav" id="questionTopNext" aria-label="Próxima questão ou concluir">›</button></div>${renderQuestionTimer(question, result)}<div class="question-body">
    ${bodyInfo}
    ${ui.editQuestionId === question.id ? renderQuestionEditPanel(question) : ''}
    ${isSpecialCollection ? `<div class="linked-lesson"><strong>Coleção:</strong> questões inéditas por macroárea para treino livre.</div>` : linkedLesson ? `<div class="linked-lesson"><strong>Aula vinculada:</strong> Bloco ${linkedLesson.block} · ${escapeHtml(linkedLesson.topic)}<div class="question-lesson-links"><button type="button" class="tiny-btn" data-question-materials="${escapeAttr(linkedLesson.id)}">Ver material da aula</button><button type="button" class="tiny-btn" data-question-video="${escapeAttr(linkedLesson.id)}">Ver vídeo da aula</button></div></div>` : `<div class="linked-lesson"><strong>Aula vinculada:</strong> não encontrei uma correspondência no cronograma.</div>`}
     <div class="section-title"><h2>Questão ${question.number}</h2></div>
    <div class="question-workspace"><div class="question-main">
      <div class="question-stem highlightable" data-highlight-scope="stem" style="font-size:${state.questionSettings.fontSize}px">${renderHighlightedText(question.stem, highlights, true, 'stem')}</div>
      ${renderQuestionImages(question)}
      ${dataIssue ? `<div class="question-data-warning"><strong>Revisar extração.</strong> ${escapeHtml(dataIssue)} Use “Editar” para corrigir com base no PDF.</div>` : ''}
      <div class="answer-list">${options}</div>
      ${!result && !dataIssue ? renderQuestionPreReasoning(question, savedProgress) : ''}
      ${!result && !dataIssue ? `<div class="answer-confirm"><span class="muted">${draftAnswer ? `Alternativa ${draftAnswer} selecionada` : 'Selecione uma alternativa e confirme.'}</span><button class="icon-btn primary" id="confirmQuestionAnswer" data-selected-answer="${escapeAttr(draftAnswer)}" ${draftAnswer?'':'disabled'}>Confirmar resposta</button></div>` : ''}
      ${feedback}
      ${comment}
      ${result ? renderQuestionReflection(question, result) : ''}
      ${result ? renderQuestionFlashcardEditor(question, result) : ''}
      ${renderQuestionNotes(question, savedProgress)}
      <div class="question-nav"><div><button class="icon-btn" id="questionPrev" ${ui.qIndex===0?'disabled':''}>‹ Anterior</button> <button class="icon-btn" id="questionNext">Próxima ›</button></div><div>${reviewButton} ${result?'<button class="icon-btn" id="questionRedo">Refazer</button>':''}</div></div>
      ${difficultyPicker}
    </div></div></div>`;
}
function renderQuestionImages(question) {
  if(!question.images?.length) return '';
  const urls = window.ENAMED_IMPORTED_ASSET_URLS || {};
  return `<div class="question-images">${question.images.map((image, index) => { const src = typeof image === 'string' ? image : image.url || urls[image.assetId] || ''; return src ? `<img loading="lazy" decoding="async" src="${escapeAttr(src)}" alt="Imagem da questão ${question.number}${question.images.length > 1 ? `.${index + 1}` : ''}">` : `<div class="question-image-pending">Imagem pendente: ${escapeHtml(image.alias || 'sem nome')}</div>`; }).join('')}</div>`;
}
function renderQuestionEditPanel(question) {
  const optionLetters = ['A','B','C','D','E'].filter(letter => question.options?.[letter] !== undefined);
  return `<div class="question-edit-panel">
    <div class="section-title"><div><h3>Correção local da questão</h3><div class="muted">Corrige ortografia/texto só no seu planner.</div></div><button class="tiny-btn" id="questionEditClose">Fechar</button></div>
    <label>Enunciado<textarea class="textarea" data-question-edit="stem">${escapeHtml(question.stem || '')}</textarea></label>
    <div class="question-edit-options">${optionLetters.map(letter => `<label>${letter}<textarea class="textarea" data-question-edit-option="${letter}">${escapeHtml(question.options?.[letter] || '')}</textarea></label>`).join('')}</div>
    <div class="field-row"><label>Gabarito<select class="select" data-question-edit="answer">${optionLetters.map(letter => `<option value="${letter}" ${question.answer===letter?'selected':''}>${letter}</option>`).join('')}</select></label><label>Área<input class="input" data-question-edit="area" value="${escapeAttr(question.area || '')}"></label><label>Tema<input class="input" data-question-edit="topic" value="${escapeAttr(question.topic || '')}"></label></div>
    <label>Comentário<textarea class="textarea" data-question-edit="comment">${escapeHtml(question.comment || '')}</textarea></label>
    <div class="question-edit-actions"><button class="icon-btn primary" id="questionEditSave">Salvar correção</button><button class="icon-btn" id="copyFullQuestion" title="Copiar enunciado, alternativas, gabarito e comentário">Copiar questão</button><button class="icon-btn" id="questionEditReset">Restaurar original</button></div>
  </div>`;
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
      : (parsed.error || `Você marcou ${result.selected || '-'}${selectedText ? ` (${selectedText})` : ''}. O gabarito é ${question.answer}${answerText ? ` (${answerText})` : ''}.`),
    kids: question.kids || ''
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
  const hasKids = Boolean(question.kids);
  const allowedTabs = hasKids ? ['analysis','pearl','error','kids'] : ['analysis','pearl','error'];
  const tab = allowedTabs.includes(current.commentTab) ? current.commentTab : 'pearl';
  const sections = questionCommentSections(question, result);
  const tabs = [
    ['analysis','Análise','◉'],
    ['pearl','Pérola','✦'],
    ['error','Armadilha','!'],
    ...(hasKids ? [['kids','Criança','🧒']] : [])
  ];
  const nextDisabled = ui.qIndex >= filteredQuestions().length - 1 ? 'disabled' : '';
  const declaredAnswer = String(question.comment || '').match(/(?:^|\n)\s*(?:Correta|Gabarito)\s*:\s*([A-E])\b/i)?.[1]?.toUpperCase() || '';
  const auditedMismatch = question.answerAudit === 'official-source' && declaredAnswer && declaredAnswer !== question.answer;
  if(auditedMismatch) return `<div class="question-comment-panel">
    <div class="comment-quick-nav"><button class="icon-btn" id="commentPrevQuestion" ${ui.qIndex===0?'disabled':''}>‹</button><button class="icon-btn primary" id="commentNextQuestion">Próx ›</button></div>
    <div class="question-comment-card error"><strong>Comentário em revisão</strong><div>O gabarito ${escapeHtml(question.answer)} foi conferido na fonte original, mas o comentário anexado declara ${escapeHtml(declaredAnswer)} e provavelmente pertence a outra questão. A explicação foi ocultada para não induzir ao erro.</div></div>
  </div>`;
  return `<div class="question-comment-panel">
    <div class="comment-quick-nav"><button class="icon-btn" id="commentPrevQuestion" ${ui.qIndex===0?'disabled':''}>‹</button><button class="icon-btn primary" id="commentNextQuestion">Próx ›</button></div>
    <div class="comment-tabs">${tabs.map(([value,label,icon]) => `<button class="${tab===value?'active':''} ${value}" data-comment-tab="${value}"><span>${icon}</span>${escapeHtml(label)}</button>`).join('')}</div>
    <div class="question-comment-card ${escapeAttr(tab)}"><strong>${escapeHtml(tabs.find(item => item[0] === tab)?.[1] || 'Comentário')}</strong><div>${renderCommentSectionContent(tab, sections[tab] || sections.analysis, highlights)}</div></div>
  </div>`;
}
function renderCommentSectionContent(tab, text, highlights=[]) {
  // Separadores usados nos arquivos de comentarios nao devem aparecer na interface.
  const raw = String(text || '')
    .replace(/(?:^|\n)\s*-{3,}\s*(?=\n|$)/g, '\n')
    .trim();
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
    <div class="question-timer-head"><div><div class="question-clock ${mode==='countdown' && clock <= 15 ? 'danger' : ''}" id="questionClock">${formatClock(clock)}</div><div class="question-timer-mini-label">${escapeHtml(sessionLabel)}</div></div><button class="tiny-btn" id="closeQuestionTimer" title="Fechar">${iconSvg('close',{weight:'regular'})}</button></div>
    <div class="question-timer-fields compact">
      <select class="select" id="questionTimerMode"><option value="countdown" ${mode==='countdown'?'selected':''}>Contratempo</option><option value="stopwatch" ${mode==='stopwatch'?'selected':''}>Cronômetro</option></select>
      <input class="input" id="questionMinutes" type="number" min="0.25" step="0.25" value="${Math.round(seconds/15)/4}" ${mode==='stopwatch'?'disabled':''} title="Minutos por questão">
    </div>
    <div class="question-timer-status" id="questionTimerStatus">${escapeHtml(questionTimer.status || (active ? 'Em andamento' : 'Pronto'))}</div>
    <div class="question-timer-actions compact"><button class="icon-btn primary" id="startQuestionTimer" ${result?'disabled':''} title="${questionTimer.running?'Pausar contagem':'Iniciar contagem'}">${iconSvg(questionTimer.running?'pause':'play',{weight:'regular'})}</button><button class="icon-btn" id="saveQuestionTimer" title="Salvar tempo">${iconSvg('save',{weight:'regular'})}</button><button class="icon-btn" id="discardQuestionTimer" title="Descartar tempo">${iconSvg('delete',{weight:'regular'})}</button></div>
  </aside>`;
}
function renderQuestionPreReasoning(question, progress) {
  const value = progress?.preReasoning || '';
  return `<div class="question-pre-reasoning"><label class="field-label">Por que você acha que essa alternativa está correta?<textarea class="textarea" data-progress-field="preReasoning" placeholder="Escreva seu raciocínio antes de confirmar a resposta">${escapeHtml(value)}</textarea></label></div>`;
}
function renderQuestionReflection(question, result) {
  const confidence = Math.max(0, Math.min(100, n(result.confidence)));
  const certainty = Math.max(0, Math.min(100, n(result.certainty)));
  if(result.correct) {
    return `<div class="question-reflection"><strong>Como foi esse acerto?</strong><div class="field-row"><label class="field-label">Como você acertou<select class="select" data-progress-field="correctMode"><option value="">Marcar acerto</option>${['Sabendo','Chute'].map(option => `<option ${result.correctMode===option?'selected':''}>${option}</option>`).join('')}</select></label><label class="field-label">Certeza na resposta (%)<input class="input" type="number" min="0" max="100" step="5" data-progress-field="certainty" value="${certainty || ''}" placeholder="Ex.: 70"></label><label class="field-label">Confiança no tema (%)<input class="input" type="number" min="0" max="100" step="5" data-progress-field="confidence" value="${confidence || ''}" placeholder="Ex.: 90"></label></div><div class="reflection-writing"><label class="field-label">O que pensei antes de responder<textarea class="textarea" data-progress-field="preReasoning" placeholder="Escreva seu raciocínio antes de olhar o comentário">${escapeHtml(result.preReasoning || '')}</textarea></label><label class="field-label">O que aprendi depois do comentário<textarea class="textarea" data-progress-field="postLearning" placeholder="Explique com suas próprias palavras o que ficou da questão">${escapeHtml(result.postLearning || '')}</textarea></label></div><div class="reflection-help">Certeza = o quanto você confiava nesta resposta. Confiança = o quanto domina o tema de forma geral.</div></div>`;
  }
  const missReason = result.missReason === 'Não lembrar' ? 'Dúvida / já vi' : result.missReason;
  const errorTypes = ['Desatenção','Dúvida / já vi','Não saber','Confusão entre conceitos','Interpretação inadequada','Falha de raciocínio clínico','Erro de conduta','Excesso de confiança'];
  return `<div class="question-reflection"><strong>Por que errei?</strong><div class="field-row"><label class="field-label">Motivo do erro<select class="select" data-progress-field="missReason"><option value="">Escolher motivo</option>${errorTypes.map(option => `<option ${missReason===option?'selected':''}>${option}</option>`).join('')}</select></label><label class="field-label">Confiança antes da correção (%)<input class="input" type="number" min="0" max="100" step="5" data-progress-field="confidence" value="${confidence || ''}" placeholder="Ex.: 40"></label><label class="field-label">O que aconteceu?<input class="input" data-progress-field="reflection" value="${escapeAttr(result.reflection || '')}" placeholder="Comentário curto"></label></div><div class="reflection-writing"><label class="field-label">O que pensei antes de responder<textarea class="textarea" data-progress-field="preReasoning" placeholder="Escreva seu raciocínio antes de olhar o comentário">${escapeHtml(result.preReasoning || '')}</textarea></label><label class="field-label">O que aprendi depois do comentário<textarea class="textarea" data-progress-field="postLearning" placeholder="Explique com suas próprias palavras o que ficou da questão">${escapeHtml(result.postLearning || '')}</textarea></label><label class="field-label">Regra para não errar novamente<textarea class="textarea" data-progress-field="correctiveRule" placeholder="Ex.: Antes de marcar a conduta, verificar gravidade e contraindicações.">${escapeHtml(result.correctiveRule || '')}</textarea></label></div><div class="reflection-help">Este percentual registra o quanto você acreditava que estava certo antes de ver o gabarito.</div></div>`;
}
function renderQuestionFlashcardEditor(question, result) {
  ui.questionFlashcardEditorClosed ||= {};
  if(ui.questionFlashcardEditorClosed[question.id]) return `<div class="flashcard-edit-toggle"><button type="button" class="tiny-btn" data-open-question-flashcards="${escapeAttr(question.id)}">Abrir flashcards</button></div>`;
  const cards = flashcardsNewestFirst((Array.isArray(state.questionFlashcards[question.id]) ? state.questionFlashcards[question.id] : []).filter(card => !card.deletedAt));
  const allowed = flashcardCreationAllowed(result);
  if(!allowed && !cards.length) return '';
  const reason = allowed ? flashcardCreationReason(result) : 'Flashcards já criados continuam disponíveis para edição.';
  return `<div class="flashcard-editor"><div class="section-title"><div><h3>Criar flashcards</h3><div class="muted">${escapeHtml(reason)} Selecione um trecho e use a barra para formatar, ou escolha o tipo Cloze para ocluir uma palavra.</div></div><div class="flashcard-editor-actions"><button type="button" class="icon-btn primary" data-add-question-flashcard="${escapeAttr(question.id)}" ${cards.length>=2 || !allowed?'disabled':''}>+ Flashcard</button><button type="button" class="tiny-btn" data-close-question-flashcards="${escapeAttr(question.id)}" title="Fechar criador de flashcards">Fechar</button></div></div>${cards.length ? `<div class="flashcard-editor-list">${cards.map(card=>{ const sourceAttr = `data-question-card="${escapeAttr(question.id)}"`; return `<div class="flashcard-editor-item">${renderClozeAwareFlashcardFields(sourceAttr,card,'Frente: escreva a pergunta ou conceito','Verso: escreva a resposta')}<button type="button" class="tiny-btn" data-remove-question-card="${escapeAttr(question.id)}" data-card-id="${escapeAttr(card.id)}" title="Excluir flashcard">×</button><input class="input" data-question-card="${escapeAttr(question.id)}" data-card-id="${escapeAttr(card.id)}" data-card-field="area" value="${escapeAttr(card.area || question.area || '')}" placeholder="Área"><input class="input" data-question-card="${escapeAttr(question.id)}" data-card-id="${escapeAttr(card.id)}" data-card-field="subarea" value="${escapeAttr(card.subarea || card.topic || question.topic || '')}" placeholder="Subárea"></div>`; }).join('')}</div>` : '<div class="empty">Escreva até dois flashcards curtos desta questão.</div>'}<div class="topic-source">${cards.length}/2 flashcards · ${escapeHtml(question.collectionLabel || questionCollectionLabel(question.collectionBlock))} · ${escapeHtml(question.topic)}</div></div>`;
}
function renderQuestionNotes(question, result) {
  const notes = result?.notes || '';
  return `<div class="question-notes single"><div class="question-note-tools"><span class="muted">Modelo rápido:</span><button type="button" class="tiny-btn" data-note-template="caso">Caso clínico</button><button type="button" class="tiny-btn" data-note-template="osce">OSCE</button></div><textarea class="textarea" data-progress-field="notes" aria-label="Anotação da questão">${escapeHtml(notes)}</textarea></div>`;
}
function questionNoteTemplate(type) {
  if(type === 'osce') return 'CENÁRIO:\nObjetivo da estação:\nEtapas obrigatórias:\nFalhas cometidas:\nCondutas críticas:\nRed flags:\nChecklist para repetir:\n';
  return 'QUEIXA PRINCIPAL:\nDados relevantes:\nHipóteses diagnósticas:\nDiagnóstico mais provável:\nDiagnósticos diferenciais:\nExames indicados:\nConduta:\nPonto de decisão:\n';
}
function updateQuestionDraftUI(questionId, selected) {
  document.querySelectorAll('[data-question][data-answer]').forEach(button => {
    button.classList.toggle('selected', button.dataset.question === questionId && button.dataset.answer === selected);
  });
  const confirm = document.getElementById('confirmQuestionAnswer');
  if(confirm) {
    confirm.disabled = !selected;
    confirm.dataset.selectedAnswer = selected || '';
  }
  const status = document.querySelector('.answer-confirm .muted');
  if(status) status.textContent = selected ? `Alternativa ${selected} selecionada` : 'Selecione uma alternativa e confirme.';
}
function bindQuestionActions(questions, question) {
  if(!question) return;
  const chooseAnswer = (button, e) => {
    if(highlightGestureShouldBlockClick(e)) {
      clearHighlightGestureState();
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // A seleção do usuário é preservada de propósito: ele pode querer copiá-la
    // depois de marcar a alternativa.
    clearHighlightGestureState();
    const selected=e.currentTarget.dataset.answer;
    // Mesma lógica do simulado: uma alternativa riscada foi descartada pelo
    // aluno, então um clique nela não deve virar rascunho de resposta — ele
    // precisa desmarcar o risco (botão ×) primeiro.
    const eliminatedNow = Array.isArray(state.questionProgress[question.id]?.eliminated) ? state.questionProgress[question.id].eliminated : [];
    if(eliminatedNow.includes(selected)) {
      showStudyToast('Esta alternativa está riscada. Clique no × para desfazer antes de escolhê-la.');
      return;
    }
    ui.draftAnswers[question.id] = selected;
    const current=state.questionProgress[question.id] || {};
    setQuestionProgress(question.id,{ draftAnswer:selected });
    saveStateOnly({invalidate:false});
    resetKeyboardConfirmation();
    updateQuestionDraftUI(question.id, selected);
  };
  document.querySelectorAll('[data-question][data-answer]').forEach(button => {
    button.onclick = e => {
      if(button.dataset.pointerHandled === '1') {
        delete button.dataset.pointerHandled;
        e.preventDefault();
        return;
      }
      chooseAnswer(button, e);
    };
    button.onpointerup = e => {
      if(e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
      button.dataset.pointerHandled = '1';
      e.preventDefault();
      chooseAnswer(button, e);
    };
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
  const saveTimer = document.getElementById('saveQuestionTimer');
  const discardTimer = document.getElementById('discardQuestionTimer');
  const editToggle = document.getElementById('questionEditToggle');
  const editClose = document.getElementById('questionEditClose');
  const editSave = document.getElementById('questionEditSave');
  const editReset = document.getElementById('questionEditReset');
  const copyFullQuestion = document.getElementById('copyFullQuestion');
  const confirmAnswer = document.getElementById('confirmQuestionAnswer');
  const fontDown = document.getElementById('questionFontDown');
  const fontUp = document.getElementById('questionFontUp');
  const keyIssue = document.getElementById('questionKeyIssue');
  const deleteQuestion = document.getElementById('questionDelete');
  document.querySelectorAll('[data-question-difficulty]').forEach(button => button.onclick = e => {
    const difficulty = e.currentTarget.dataset.questionDifficulty;
    setQuestionProgress(question.id,{ difficulty });
    document.querySelectorAll('[data-question-difficulty]').forEach(item => {
      const active = item.dataset.questionDifficulty === difficulty;
      item.classList.toggle('active',active);
      item.setAttribute('aria-pressed',String(active));
    });
    saveStateOnly({invalidate:false});
  });
  document.querySelectorAll('[data-question-materials]').forEach(button => button.onclick = e => openMaterialsForSchedule(e.currentTarget.dataset.questionMaterials));
  document.querySelectorAll('[data-question-video]').forEach(button => button.onclick = e => openVideosForSchedule(e.currentTarget.dataset.questionVideo));
  const goPrev = () => navigateQuestionBy(-1);
  const goNext = () => navigateQuestionBy(1);
  if(prev) prev.onclick = goPrev;
  if(next) next.onclick = goNext;
  if(topPrev) topPrev.onclick = goPrev;
  if(topNext) topNext.onclick = goNext;
  if(deleteQuestion) deleteQuestion.onclick = () => deleteQuestionFromPlanner(question);
  if(redo) redo.onclick = () => {
    const previous = state.questionProgress[question.id] || {};
    setQuestionProgress(question.id,{
      notes: previous.notes || '',
      textHighlights: previous.textHighlights || [],
      eliminated: previous.eliminated || [],
      draftConfidence: '',
      attempts: previous.attempts || 0,
      selected: '',
      correct: false,
      timedOut: false,
      answeredAt: '',
      confidenceLevel: '',
      confidence: 0,
      correctMode: '',
      missReason: '',
      certainty: 0,
      secondsSpent: 0
    });
    delete ui.draftAnswers[question.id];
    stopQuestionTimer(true);
    persist();
  };
  document.querySelectorAll('[data-eliminate]').forEach(button => button.onclick = e => {
    e.preventDefault();
    e.stopPropagation();
    toggleEliminated(question, e.currentTarget.dataset.eliminate);
  });
  if(textHighlightEnabled()) {
    bindPointerHighlighter(document.querySelectorAll('.question-stem.highlightable[data-highlight-scope="stem"]'),(descriptor,color)=>applyQuestionHighlight(question,descriptor,color));
    bindSavedHighlightMenus(document.querySelector('.qbank-mode .question-card'),(descriptor,color)=>applyQuestionHighlight(question,descriptor,color));
  }
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
  if(startTimer) startTimer.onclick = () => questionTimer.running ? pauseQuestionTimer() : startQuestionTimer(question);
  if(saveTimer) saveTimer.onclick = () => saveQuestionTimerTime();
  if(discardTimer) discardTimer.onclick = () => discardQuestionTimer();
  if(editToggle) editToggle.onclick = () => { ui.editQuestionId = ui.editQuestionId === question.id ? '' : question.id; render(); };
  if(editClose) editClose.onclick = () => { ui.editQuestionId = ''; render(); };
  if(editSave) editSave.onclick = () => saveQuestionEdit(question);
  if(copyFullQuestion) copyFullQuestion.onclick = () => copyFullQuestionText(question);
  if(editReset) editReset.onclick = () => {
    if(confirm('Restaurar o texto original desta questão?')) {
      delete state.questionEdits[question.id];
      reconcileQuestionProgressForQuestion(questionBank.find(item => item.id === question.id) || question);
      ui.editQuestionId = '';
      persist();
    }
  };
  if(confirmAnswer) confirmAnswer.onclick = () => {
    const selected = confirmAnswer.dataset.selectedAnswer
      || ui.draftAnswers[question.id]
      || state.questionProgress[question.id]?.draftAnswer;
    if(selected) answerQuestion(question, selected, false);
  };
  if(fontDown) fontDown.onclick = () => setQuestionFontSize(-2);
  if(fontUp) fontUp.onclick = () => setQuestionFontSize(2);
  if(keyIssue) keyIssue.onclick = () => {
    const current = state.questionProgress[question.id] || {};
    setQuestionProgress(question.id,{ answerKeyIssue: !current.answerKeyIssue, answerKeyIssueAt: !current.answerKeyIssue ? new Date().toISOString() : '' });
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
  document.querySelectorAll('[data-note-template]').forEach(button => button.onclick = e => {
    const textarea = document.querySelector('[data-progress-field="notes"]');
    if(!textarea) return;
    const template = questionNoteTemplate(e.currentTarget.dataset.noteTemplate);
    textarea.value = textarea.value.trim() ? `${textarea.value.trim()}\n\n${template}` : template;
    updateQuestionProgressField(question, textarea);
    textarea.focus();
  });
  document.querySelectorAll('[data-comment-tab]').forEach(button => button.onclick = e => {
    const current = state.questionProgress[question.id] || {};
    setQuestionProgress(question.id,{ commentTab: e.currentTarget.dataset.commentTab });
    saveStateOnly();
    render();
  });
  const commentPrev = document.getElementById('commentPrevQuestion');
  if(commentPrev) commentPrev.onclick = () => { stopQuestionTimer(true); resetKeyboardConfirmation(); ui.justAnsweredId=''; ui.qIndex=Math.max(0,ui.qIndex-1); render(); };
  const commentNext = document.getElementById('commentNextQuestion');
  if(commentNext) commentNext.onclick = () => {
    const showingJustAnswered = Boolean(ui.justAnsweredId);
    if(!showingJustAnswered && ui.qIndex >= questions.length - 1) {
      showStudyToast('Parabéns! Você chegou ao fim das questões deste filtro.');
      return;
    }
    if(showingJustAnswered && ui.qIndex >= questions.length - 1) {
      ui.justAnsweredId = '';
      ui.qIndex = 0;
      ui.qQuestionId = '';
      syncRouteFromUI('push');
      render();
      showStudyToast('Parabéns! Você concluiu as questões deste filtro.');
      return;
    }
    stopQuestionTimer(true);
    resetKeyboardConfirmation();
    ui.justAnsweredId = '';
    ui.qIndex = Math.min(questions.length - 1, ui.qIndex + (showingJustAnswered ? 0 : 1));
    render();
  };
  document.querySelectorAll('[data-question-card][data-card-id][data-card-field]').forEach(input => {
    input.oninput = e => updateQuestionFlashcard(e.currentTarget);
    input.onchange = e => updateQuestionFlashcard(e.currentTarget);
  });
  bindFlashcardMarkdownTools(document.getElementById('questoes') || document);
  document.querySelectorAll('[data-close-question-flashcards]').forEach(button => button.onclick = event => {
    event.preventDefault();
    ui.questionFlashcardEditorClosed ||= {};
    ui.questionFlashcardEditorClosed[question.id] = true;
    render();
  });
  document.querySelectorAll('[data-open-question-flashcards]').forEach(button => button.onclick = event => {
    event.preventDefault();
    ui.questionFlashcardEditorClosed ||= {};
    delete ui.questionFlashcardEditorClosed[question.id];
    render();
  });
  document.querySelectorAll('[data-remove-question-card]').forEach(button => button.onclick = e => removeQuestionFlashcard(e.currentTarget.dataset.removeQuestionCard, e.currentTarget.dataset.cardId));
  if(feynman) feynman.onclick = () => {
    if(!state.feynman.some(item => item.topic.toLowerCase() === question.topic.toLowerCase())) {
      state.feynman.unshift({ id:`feyn-${Date.now()}`, topic:question.topic, scheduleId:'', area:question.area, explain:'', gaps:`Errei a questão ${question.number} do banco.`, analogy:'', nextStep:'Revisar o tema e refazer a questão.', mastery:1, reviewDate:localISODate(new Date()), updatedAt:localISODate(new Date()) });
    }
    persist();
  };
}
function addQuestionFlashcard(question) {
  const cards = Array.isArray(state.questionFlashcards[question.id]) ? state.questionFlashcards[question.id] : [];
  if(cards.length >= 2) return;
  const linked = scheduleForQuestion(question);
  cards.unshift({
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
  ensureQuestionFocusStudyTimer(question);
  persist();
}
function deleteQuestionFromPlanner(question) {
  if(!question?.id) return;
  ensureImportedQuestions();
  const importedIndex = state.importedQuestions.findIndex(item => item.id === question.id);
  const imported = importedIndex >= 0;
  const message = imported
    ? 'Excluir esta questão importada do seu banco? Esta ação também será sincronizada.'
    : 'Ocultar esta questão do seu banco em todos os aparelhos? O arquivo original local não será apagado.';
  if(!confirm(message)) return;
  if(imported) {
    state.importedQuestions.splice(importedIndex, 1);
    const history = state.incorporationHistory?.find(entry => entry.questionId === question.id);
    if(history) { history.deletedAt = new Date().toISOString(); history.updatedAt = history.deletedAt; }
  }
  else state.deletedQuestions[question.id] = new Date().toISOString();
  removeQuestionProgress(question.id);
  delete state.questionEdits[question.id];
  delete state.questionFlashcards[question.id];
  delete state.questionLogged[question.id];
  delete ui.draftAnswers[question.id];
  questionBank = questionBank.filter(item => item.id !== question.id);
  invalidateQuestionBankRenderCache();
  ui.qQuestionId = '';
  ui.qIndex = Math.max(0, ui.qIndex - 1);
  persist();
  showStudyToast(imported ? 'Questão importada excluída.' : 'Questão ocultada do seu banco.');
}
async function copyFullQuestionText(question) {
  const stem = document.querySelector('[data-question-edit="stem"]')?.value?.trim() || question.stem || '';
  const answer = document.querySelector('[data-question-edit="answer"]')?.value?.trim() || question.answer || '';
  const area = document.querySelector('[data-question-edit="area"]')?.value?.trim() || question.area || '';
  const topic = document.querySelector('[data-question-edit="topic"]')?.value?.trim() || question.topic || '';
  const comment = document.querySelector('[data-question-edit="comment"]')?.value?.trim() || question.comment || '';
  const options = Object.keys(question.options || {}).map(letter => {
    const edited = document.querySelector(`[data-question-edit-option="${letter}"]`)?.value?.trim();
    return `${letter}. ${edited || question.options[letter] || ''}`;
  });
  const parts = [
    `QUESTÃO ${question.number || ''}`.trim(),
    [area,topic].filter(Boolean).join(' · '),
    '',
    'ENUNCIADO',
    stem,
    '',
    'ALTERNATIVAS',
    ...options,
    '',
    `GABARITO: ${answer || 'Não informado'}`,
    comment ? `\nCOMENTÁRIO\n${comment}` : '',
    question.pearl ? `\nPÉROLA\n${question.pearl}` : '',
    question.trap ? `\nARMADILHA\n${question.trap}` : ''
  ].filter(Boolean).join('\n');
  try {
    await navigator.clipboard.writeText(parts);
  } catch(error) {
    const textarea = document.createElement('textarea');
    textarea.value = parts;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }
  showStudyToast('Questão completa copiada para a área de transferência.');
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
  reconcileQuestionProgressForQuestion(questionBank.find(item => item.id === question.id) || question);
  ui.editQuestionId = '';
  persist();
}
function updateQuestionFlashcard(input) {
  const cards = state.questionFlashcards[input.dataset.questionCard] || [];
  const card = cards.find(item => item.id === input.dataset.cardId);
  if(!card) return;
  ensureQuestionFocusStudyTimer(questionBank.find(item => item.id === input.dataset.questionCard));
  card[input.dataset.cardField] = input.value;
  if(input.dataset.cardField === 'subarea') card.topic = input.value;
  card.updatedAt = new Date().toISOString();
  renderCache.manualCards = null;
  saveStateOnly();
  if(input.dataset.cardField === 'cardType') requestAnimationFrame(() => render());
}
function updateLibraryFlashcard(input) {
  const card = (state.flashcardLibrary || []).find(item => item.id === input.dataset.cardId);
  if(!card) return;
  const field = input.dataset.cardField;
  card[field] = input.value;
  if(field === 'subarea') { card.topic=input.value; card.subject=input.value; }
  normalizeFlashcardRecord(card);
  recordLibraryFlashcardVersion(card, field, input.value);
  renderCache.manualCards = null;
  saveStateOnly();
}
// Antes, cada tecla digitada empilhava um registro de versão. Editar uma frente
// de card gerava dezenas de entradas idênticas, que iam para o localStorage e
// para a nuvem — peso morto que ajudava a estourar o armazenamento. Agora a
// edição contínua do mesmo campo colapsa em um único registro.
const LIBRARY_VERSION_COALESCE_MS = 4000;
function recordLibraryFlashcardVersion(card, field, value) {
  if(!Array.isArray(state.flashcardSystem?.versions)) return;
  const versions = state.flashcardSystem.versions;
  const last = versions[versions.length - 1];
  const now = Date.now();
  if(last && last.kind === 'correction' && last.cardId === card.id && last.field === field
     && now - (Date.parse(last.at || '') || 0) < LIBRARY_VERSION_COALESCE_MS) {
    last.value = value;
    last.at = new Date(now).toISOString();
    last.version = card.contentVersion;
    return;
  }
  versions.push({cardId:card.id,version:card.contentVersion,kind:'correction',at:new Date(now).toISOString(),field,value});
  if(versions.length > 2000) state.flashcardSystem.versions = versions.slice(-2000);
}
function removeQuestionFlashcard(questionId, cardId) {
  const cards = state.questionFlashcards[questionId] || [];
  state.questionFlashcards[questionId] = cards.map(card =>
    card.id === cardId ? {...card, deletedAt: new Date().toISOString()} : card
  );
  delete state.flashcardProgress[cardId];
  delete ui.revealedCards[cardId];
  ensureQuestionFocusStudyTimer(questionBank.find(item => item.id === questionId));
  persist();
  render();
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
  if(isInteractiveTarget(target)) return;
  if(event.key === 'ArrowRight') { event.preventDefault(); navigateQuestionBy(1); return; }
  if(event.key === 'ArrowLeft') { event.preventDefault(); navigateQuestionBy(-1); return; }
  if(event.key === 'ArrowDown') { event.preventDefault(); window.scrollBy({ top: Math.max(280, window.innerHeight * .72), behavior: 'smooth' }); return; }
  if(event.key === 'ArrowUp') { event.preventDefault(); window.scrollBy({ top: -Math.max(280, window.innerHeight * .72), behavior: 'smooth' }); return; }
  const questions = filteredQuestions();
  const question = questions[ui.qIndex] ? applyQuestionEdits(questions[ui.qIndex]) : null;
  if(!question || questionResult(question)) return;

  if(/^[1-5]$/.test(event.key)) {
    const letter = String.fromCharCode(64 + Number(event.key));
    if(!Object.prototype.hasOwnProperty.call(question.options || {}, letter)) return;
    const eliminatedNow = Array.isArray(state.questionProgress[question.id]?.eliminated) ? state.questionProgress[question.id].eliminated : [];
    if(eliminatedNow.includes(letter)) {
      event.preventDefault();
      showStudyToast('Esta alternativa está riscada. Aperte J sobre ela ou clique no × para desfazer antes de escolhê-la.');
      return;
    }
    event.preventDefault();
    ui.draftAnswers[question.id] = letter;
    const current = state.questionProgress[question.id] || {};
    setQuestionProgress(question.id,{ draftAnswer:letter });
    saveStateOnly({invalidate:false});
    resetKeyboardConfirmation();
    updateQuestionDraftUI(question.id, letter);
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
    if(event.repeat) return;
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
  if(isInteractiveTarget(target)) return;
  // Saída garantida do modo foco, inclusive quando a fila acaba e a tela de fim
  // de sessão não mostra mais os controles.
  if(event.key === 'Escape' && ui.flashcardFocusMode) {
    event.preventDefault();
    ui.flashcardFocusMode = false;
    ui.flashcardFocusPaused = false;
    renderFlashcards();
    return;
  }
  const cards = flashcardStudyQueue(flashcardAllRecords());
  const card = cards[ui.flashcardIndex];
  if(!card) return;
  if(event.key.toLowerCase() === 'u' || event.key.toLowerCase() === 'z') {
    event.preventDefault();
    undoFlashcardReview();
    return;
  }
  if(event.key.toLowerCase() === 'e') {
    event.preventDefault();
    ui.editFlashcardId = ui.editFlashcardId === card.id ? '' : card.id;
    renderFlashcards();
    return;
  }
  if(event.key.toLowerCase() === 's') {
    event.preventDefault();
    suspendFlashcard(card.id);
    return;
  }
  if(event.code === 'Space') {
    if(event.repeat) return;
    event.preventDefault();
    // Espaço só revela. Antes, apertar Espaço de novo com a resposta já
    // revelada avaliava o card como "Bom" (3) sem aviso nenhum — bastava
    // apertar a tecla duas vezes por hábito para distorcer o agendamento
    // do card sem querer. Avaliação agora só acontece pelas teclas 1–4.
    if(!ui.revealedCards[card.id]) {
      ui.revealedCards[card.id] = true;
      renderFlashcards();
    }
    return;
  }
  if(/^[1-4]$/.test(event.key)) {
    if(!ui.revealedCards[card.id]) return;
    event.preventDefault();
    const quality = {1:1,2:2,3:3,4:4}[event.key];
    reviewFlashcard(card.id, quality);
  }
}
function handleSimuladoKeyboard(event) {
  if(event.ctrlKey || event.metaKey || event.altKey) return;
  const target = event.target;
  if(isInteractiveTarget(target)) return;
  const run = state.simuladoRuns.find(item => item.id === ui.activeSimRunId);
  if(!run || run.finishedAt) return;
  const question = activeSimQuestion(run);
  if(!question) return;
  if(/^[1-5]$/.test(event.key)) {
    const letter = String.fromCharCode(64 + Number(event.key));
    if(!Object.prototype.hasOwnProperty.call(question.options || {}, letter)) return;
    // Mesma trava do clique: tecla numérica não deve marcar uma alternativa
    // já riscada (o atalho de teclado ficava fora da correção feita para o
    // mouse, então dava pra contornar a trava simplesmente digitando 1-5).
    const eliminatedNow = Array.isArray(run.eliminated?.[question.id]) ? run.eliminated[question.id] : [];
    if(eliminatedNow.includes(letter)) {
      event.preventDefault();
      showStudyToast('Esta alternativa está riscada. Aperte J sobre ela ou clique no × para desfazer antes de escolhê-la.');
      return;
    }
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
  setQuestionProgress(question.id,{ eliminated: next });
  persist();
}
function applyQuestionHighlight(question, descriptor, color) {
  if(!descriptor?.text) return;
  const selected=descriptor.text;
  const occurrence=n(descriptor.occurrence);
  const scope=descriptor.scope || 'stem';
  const current = state.questionProgress[question.id] || {};
  const highlights = Array.isArray(current.textHighlights) ? [...current.textHighlights] : [];
  const existing = highlights.findIndex(item => item.text === selected && (item.scope || 'stem')===scope && n(item.occurrence)===occurrence);
  rememberHighlightState({ context:'question', questionId:question.id, highlights });
  let next=highlights;
  if(color===null) next=highlights.filter((_,index)=>index!==existing);
  else if(existing>=0) next=highlights.map((item,index)=>index===existing ? {...item,color:normalizeHighlightColor(color),scope} : item);
  else next=[...highlights,{text:selected,color:normalizeHighlightColor(color),scope,occurrence}];
  setQuestionProgress(question.id,{ textHighlights: next });
  saveStateOnly();
  render();
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
      qFocusScheduleId:ui.qFocusScheduleId || '',
      qFocusQuestionIds:Array.isArray(ui.qFocusQuestionIds)?ui.qFocusQuestionIds:[]
    }
  }));
}
function answerQuestion(question, selected, timedOut=false) {
  const measuredSeconds = questionTimerElapsedSeconds();
  stopQuestionTimer(true);
  resetKeyboardConfirmation();
  const previous = state.questionProgress[question.id] || {};
  const wasAnswered = Boolean(previous.answeredAt);
  const linkedLesson = scheduleForQuestion(question);
  const questionsDoneBefore = linkedLesson ? questionStatsForSchedule(linkedLesson.id).done : 0;
  const correct = !timedOut && selected === question.answer;
  const draftConfidence = '';
  const confidenceMap = { red: 20, yellow: 55, green: 90 };
  const confidence = confidenceMap[draftConfidence] || n(previous.confidence) || 0;
  const autoCorrectMode = correct
    ? (draftConfidence === 'red' ? 'Chute' : draftConfidence === 'green' ? 'Sabendo' : previous.correctMode || '')
    : previous.correctMode || '';
  const autoMissReason = !correct
    ? (draftConfidence === 'red' ? 'Não saber' : draftConfidence === 'yellow' ? 'Dúvida / já vi' : previous.missReason || '')
    : previous.missReason || '';
  const today = studyDateKey();
  // Uma questao pode ser revisada em varios dias: conte-a uma vez em cada dia,
  // sem duplicar o mesmo registro quando apenas a resposta e editada.
  const firstLog = state.questionLogged[question.id] !== today;
  setQuestionProgress(question.id,{
    selected,
    correct,
    timedOut,
    confidenceLevel: draftConfidence,
    draftAnswer: '',
    confidence,
    correctMode: autoCorrectMode,
    missReason: autoMissReason,
    certainty: correct && draftConfidence === 'green' ? 90 : correct && draftConfidence === 'red' ? 30 : previous.certainty,
    answeredAt: new Date().toISOString(),
    secondsSpent: measuredSeconds || previous.secondsSpent || 0,
    attempts: n(previous.attempts) + 1,
    scheduleId: linkedLesson?.id || previous.scheduleId || '',
    nextReview: !correct
      ? nextErrorReviewDate(today, 1)
      : (previous.nextReview && previous.nextReview <= today ? nextErrorReviewDate(today, errorReviewInterval(n(previous.reviewCount) + 1)) : previous.nextReview || ''),
    // Errar uma revisão pendente ainda somava +1 aqui, então duas questões
    // erradas seguidas (uma revisão que falhou, depois um acerto) já entravam
    // no degrau de 21 dias em vez do primeiro degrau de 7 — o oposto do que
    // uma questão problemática precisa. Errar agora zera a caixa (Leitner),
    // igual o reset de nextReview logo acima já faz.
    reviewCount: !correct ? 0 : n(previous.reviewCount) + (previous.nextReview && previous.nextReview <= today ? 1 : 0),
    lastReviewAt: previous.nextReview && previous.nextReview <= today ? new Date().toISOString() : previous.lastReviewAt || ''
  });
  awardQuestionAnswerXP(question,state.questionProgress[question.id]);
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
  const questionsDoneAfter = linkedLesson ? questionsDoneBefore + (wasAnswered ? 0 : 1) : 0;
  const questionTarget = linkedLesson ? lessonQuestionTarget(linkedLesson) : LESSON_MIN_QUESTIONS;
  persist();
  if(linkedLesson && questionTarget > 0 && questionsDoneBefore < questionTarget && questionsDoneAfter >= questionTarget) {
    showStudyToast(`Parabéns! Você concluiu as ${questionTarget} questões disponíveis de ${linkedLesson.topic}.`);
  }
}
function updateQuestionProgressField(question, input) {
  const field = input.dataset.progressField;
  const current = state.questionProgress[question.id] || {};
  const value = input.type === 'number' ? n(input.value) : input.value;
  const patch = { [field]: value };
  if(['notes','postLearning','correctiveRule'].includes(field) && String(value || '').trim() && !current.nextReview) {
    patch.nextReview = nextErrorReviewDate(studyDateKey(), 1);
  }
  setQuestionProgress(question.id, patch);
  if(field === 'postLearning') awardQuestionReviewXP(question.id,state.questionProgress[question.id]);
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
  let lastTickAt=Date.now();
  questionTimer.interval = setInterval(() => {
    const now=Date.now();
    const elapsedTick=Math.max(1,Math.floor((now-lastTickAt)/1000));
    lastTickAt=now;
    questionTimer.elapsedSeconds += elapsedTick;
    if(questionTimer.mode === 'countdown') {
      const previousSeconds=questionTimer.secondsLeft;
      questionTimer.secondsLeft = Math.max(0,questionTimer.secondsLeft-elapsedTick);
      if(previousSeconds > 15 && questionTimer.secondsLeft <= 15 && !questionTimer.beeped) {
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
function settleQuestionTimerBeforeLeave() {
  const seconds=questionTimerElapsedSeconds();
  if(questionTimer.running) {
    const shouldSave=confirm(`A contagem está ativa em ${formatClock(seconds)}.\n\nOK: salvar o tempo e sair.\nCancelar: permanecer nesta questão com a contagem ativa.`);
    if(!shouldSave) return false;
  }
  if(seconds>0) saveQuestionTimerTime();
  else if(questionTimer.running || questionTimer.questionId) discardQuestionTimer(false,'',false);
  return true;
}
function saveQuestionTimerTime() {
  const seconds = questionTimerElapsedSeconds();
  if(seconds <= 0) {
    questionTimer.status='Nenhum tempo para salvar';
    renderQuestionClock();
    return;
  }
  pauseQuestionTimer();
  const log=getDayLog(studyDateKey());
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
function beepFlashcardSpeed() {
  try {
    const context = ui.flashcardSpeedAudioContext || new (window.AudioContext || window.webkitAudioContext)();
    ui.flashcardSpeedAudioContext = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 660;
    gain.gain.value = 0.12;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.18);
  } catch(error) {}
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
function textHighlightEnabled() {
  return true;
}
// O marca-texto só existe no enunciado; as alternativas são elementos irmãos.
// Bloquear o clique por "tempo desde o último gesto" ou por "existe seleção na
// página" fazia a alternativa parar de responder depois de qualquer marcação —
// e só voltava quando um render limpava a seleção (daí o truque de abrir e
// fechar "Editar"). Agora só engolimos o clique que acontece dentro da própria
// área destacável, que é o único caso em que ele é fim de um arrasto.
function highlightGestureShouldBlockClick(event) {
  if(!textHighlightEnabled()) return false;
  if(!event?.target?.closest?.('.highlightable, .sim-highlightable')) return false;
  if(ui.suppressAnswerClick || Date.now() < n(ui.highlightGestureUntil)) return true;
  return (window.getSelection()?.toString() || '').trim().length > 1;
}
function clearHighlightGestureState() {
  ui.suppressAnswerClick = false;
  ui.highlightGestureUntil = 0;
}
const HIGHLIGHT_MENU_COLORS=['yellow','red','blue'];
function normalizeHighlightColor(color) {
  return HIGHLIGHT_MENU_COLORS.includes(color) ? color : 'yellow';
}
function highlightNodeElement(node) {
  return node?.nodeType===Node.TEXT_NODE ? node.parentElement : node;
}
function highlightSelectionDescriptor(element) {
  const selection=window.getSelection();
  if(!selection || selection.rangeCount<1 || selection.isCollapsed) return null;
  const selected=selection.toString().replace(/\s+/g,' ').trim();
  if(selected.length<2) return null;
  const anchor=highlightNodeElement(selection.anchorNode);
  const focus=highlightNodeElement(selection.focusNode);
  if(!anchor || !focus || !element.contains(anchor) || !element.contains(focus)) return null;
  const range=selection.getRangeAt(0);
  const beforeRange=range.cloneRange();
  beforeRange.selectNodeContents(element);
  beforeRange.setEnd(range.startContainer,range.startOffset);
  const before=beforeRange.toString().replace(/\s+/g,' ');
  const occurrence=(before.match(new RegExp(escapeRegExp(selected),'g'))||[]).length;
  const rect=range.getBoundingClientRect();
  return {text:selected,occurrence,element,scope:element.dataset.highlightScope||'stem',block:element.dataset.materialBlock||'',rect};
}
function closeHighlightPopup() {
  if(highlightPopupDismissHandler) document.removeEventListener('pointerdown',highlightPopupDismissHandler);
  if(highlightPopupEscapeHandler) document.removeEventListener('keydown',highlightPopupEscapeHandler);
  highlightPopupDismissHandler=null;
  highlightPopupEscapeHandler=null;
  document.querySelector('.highlight-popup')?.remove();
}
function positionHighlightPopup(popup,rect) {
  const margin=8;
  const box=popup.getBoundingClientRect();
  const center=rect.left+(rect.width/2);
  const left=Math.max(margin,Math.min(window.innerWidth-box.width-margin,center-(box.width/2)));
  let top=rect.top-box.height-10;
  if(top<margin) top=Math.min(window.innerHeight-box.height-margin,rect.bottom+10);
  popup.style.left=`${Math.round(left)}px`;
  popup.style.top=`${Math.round(Math.max(margin,top))}px`;
}
function copyHighlightSelection(fallbackText='') {
  const text=String((window.getSelection()?.toString() || fallbackText || '')).trim();
  if(!text) return;
  const done=()=>showStudyToast('Trecho copiado.');
  if(navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(()=>copyHighlightSelectionFallback(text,done));
    return;
  }
  copyHighlightSelectionFallback(text,done);
}
function copyHighlightSelectionFallback(text,done) {
  // navigator.clipboard falha em contexto não seguro (http://) e em alguns
  // navegadores móveis; o textarea temporário cobre esses casos.
  const area=document.createElement('textarea');
  area.value=text;
  area.setAttribute('readonly','');
  area.style.cssText='position:fixed;top:-1000px;opacity:0';
  document.body.appendChild(area);
  const previous=window.getSelection()?.rangeCount ? window.getSelection().getRangeAt(0).cloneRange() : null;
  area.select();
  let copied=false;
  try { copied=document.execCommand('copy'); } catch(error) { copied=false; }
  area.remove();
  if(previous) { const selection=window.getSelection(); selection?.removeAllRanges(); selection?.addRange(previous); }
  if(copied) done?.();
  else showStudyToast('Não consegui copiar automaticamente. Use Ctrl+C com o trecho selecionado.');
}
function showHighlightPopup({rect,editing=false,onColor,onDelete,copyText=''}) {
  closeHighlightPopup();
  const popup=document.createElement('div');
  popup.className='highlight-popup';
  popup.setAttribute('role','dialog');
  popup.setAttribute('aria-label',editing?'Alterar destaque':'Escolher cor do destaque');
  popup.innerHTML=`<span class="highlight-popup-label">${editing?'Alterar':'Destacar'}</span>${HIGHLIGHT_MENU_COLORS.map(color=>`<button type="button" class="highlight-popup-color ${color}" data-highlight-popup-color="${color}" aria-label="${highlightLabel(color)}" title="${highlightLabel(color)}"></button>`).join('')}<button type="button" class="highlight-popup-copy" data-highlight-popup-copy aria-label="Copiar trecho" title="Copiar trecho">Copiar</button>${editing?'<button type="button" class="highlight-popup-delete" data-highlight-popup-delete aria-label="Apagar destaque" title="Apagar destaque">×</button>':''}`;
  popup.addEventListener('pointerdown',event=>event.stopPropagation());
  popup.addEventListener('click',event=>{
    event.stopPropagation();
    const color=event.target.closest('[data-highlight-popup-color]')?.dataset.highlightPopupColor;
    const remove=event.target.closest('[data-highlight-popup-delete]');
    const copy=event.target.closest('[data-highlight-popup-copy]');
    if(copy) {
      // Copiar não altera o destaque nem desfaz a seleção: o usuário pode
      // colar o trecho e ainda escolher uma cor em seguida.
      copyHighlightSelection(copyText||'');
      return;
    }
    if(!color&&!remove) return;
    closeHighlightPopup();
    window.getSelection()?.removeAllRanges();
    if(remove) onDelete?.();
    else onColor?.(color);
  });
  document.body.appendChild(popup);
  positionHighlightPopup(popup,rect);
  highlightPopupDismissHandler=event=>{
    if(!popup.contains(event.target)) closeHighlightPopup();
  };
  highlightPopupEscapeHandler=event=>{
    if(event.key==='Escape') {
      closeHighlightPopup();
      window.getSelection()?.removeAllRanges();
    }
  };
  setTimeout(()=>document.addEventListener('pointerdown',highlightPopupDismissHandler),0);
  document.addEventListener('keydown',highlightPopupEscapeHandler);
}
// No toque, o navegador ainda ajusta a seleção por um tempo depois do
// pointerup (alças de seleção sendo arrastadas). Um atraso fixo às vezes
// pegava a seleção pela metade — vinha vazia (parecia que não tinha
// marcado nada, exigindo repetir o gesto) ou incompleta (marcava a palavra
// errada). Em vez de adivinhar um tempo fixo, esperamos a seleção parar de
// mudar entre duas leituras seguidas, com um teto de tentativas para nunca
// travar o popup indefinidamente.
function waitForStableSelection(element,pointerType,callback,attempt=0) {
  const maxAttempts = pointerType==='touch' ? 8 : 3;
  const delay = pointerType==='touch' ? 45 : 16;
  const read=()=>(window.getSelection()?.toString()||'').replace(/\s+/g,' ').trim();
  const previous=read();
  setTimeout(()=>{
    const current=read();
    if((current && current===previous) || attempt>=maxAttempts) { callback(highlightSelectionDescriptor(element)); return; }
    waitForStableSelection(element,pointerType,callback,attempt+1);
  },delay);
}
function bindPointerHighlighter(elements,onHighlight) {
  elements.forEach(element => {
    let pointer={id:null,type:'',x:0,y:0,moved:false};
    const finish = event => {
      if(pointer.id!==null&&event.pointerId!==pointer.id) return;
      const pointerType=event.pointerType||pointer.type||'mouse';
      pointer={id:null,type:'',x:0,y:0,moved:false};
      ui.suppressAnswerClick=true;
      ui.highlightGestureUntil=Date.now()+900;
      waitForStableSelection(element,pointerType,descriptor=>{
        if(descriptor) showHighlightPopup({rect:descriptor.rect,copyText:descriptor.text,onColor:color=>onHighlight(descriptor,color)});
      });
      setTimeout(()=>{ui.suppressAnswerClick=false;},950);
    };
    if(window.PointerEvent) {
      element.addEventListener('pointerdown',event=>{
        pointer={id:event.pointerId,type:event.pointerType||'mouse',x:event.clientX,y:event.clientY,moved:false};
      });
      element.addEventListener('pointermove',event=>{
        if(pointer.id!==event.pointerId) return;
        if(Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)>8) pointer.moved=true;
      },{passive:true});
      element.addEventListener('pointerup',finish);
      element.addEventListener('pointercancel',()=>{pointer={id:null,type:'',x:0,y:0,moved:false};});
    } else element.addEventListener('mouseup',finish);
    element.addEventListener('selectstart',()=>{
      ui.suppressAnswerClick=true;
      ui.highlightGestureUntil=Date.now()+500;
      setTimeout(()=>{ui.suppressAnswerClick=false;},550);
    });
  });
}
function bindSavedHighlightMenus(root,onChange) {
  if(!root) return;
  root.querySelectorAll('.text-mark[data-saved-highlight]').forEach(mark=>mark.addEventListener('click',event=>{
    const selection=window.getSelection();
    if(selection&&!selection.isCollapsed&&selection.toString().trim()) return;
    event.preventDefault();
    event.stopPropagation();
    ui.suppressAnswerClick=true;
    ui.highlightGestureUntil=Date.now()+750;
    const element=mark.closest('[data-material-block]') || mark.closest('.sim-highlightable, .highlightable') || mark.parentElement || mark;
    const descriptor={
      text:mark.textContent.replace(/\s+/g,' ').trim(),
      occurrence:n(mark.dataset.highlightOccurrence),
      scope:mark.dataset.highlightScope||element.dataset.highlightScope||'stem',
      block:element.dataset.materialBlock||'',
      element,
      rect:mark.getBoundingClientRect()
    };
    showHighlightPopup({
      rect:descriptor.rect,
      editing:true,
      copyText:descriptor.text,
      onColor:color=>onChange(descriptor,color),
      onDelete:()=>onChange(descriptor,null)
    });
    setTimeout(()=>{ui.suppressAnswerClick=false;},800);
  }));
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
    setQuestionProgress(action.questionId,{ textHighlights:action.highlights });
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
  if(isInteractiveTarget(target)) return;
  if(undoLastHighlight()) event.preventDefault();
}
function handleFlashcardUndoKeyboard(event) {
  if(ui.tab !== 'flashcards' || !(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey || event.key.toLowerCase() !== 'z') return;
  const target = event.target;
  if(isInteractiveTarget(target)) return;
  event.preventDefault();
  if(event.repeat) return;
  undoFlashcardReview();
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
const FLASHCARD_CLOZE_PATTERN = /\{\{c(\d+)::((?:(?!\}\}).)+?)(?:::((?:(?!\}\}).)+?))?\}\}/g;
function flashcardClozeNumbers(text) {
  return [...new Set([...String(text || '').matchAll(FLASHCARD_CLOZE_PATTERN)].map(match => n(match[1])))].sort((a,b)=>a-b);
}
function renderFlashcardMarkdown(text, {cloze}={}) {
  if(/flashcard-image:/.test(text || '')) loadFlashcardImagesForText(text);
  const inline = value => {
    let html = escapeHtml(value || '');
    if(cloze) html = html.replace(FLASHCARD_CLOZE_PATTERN, (match, num, hidden, hint) => cloze === 'reveal'
      ? `<mark class="flashcard-cloze-reveal">${hidden}</mark>`
      : `<span class="flashcard-cloze-blank">[${hint || '...'}]</span>`);
    return html
      .replace(/!\[([^\]]*)\]\(flashcard-image:([\w-]+)\)/g, (match, alt, id) => {
        const src = flashcardImageCache.get(id);
        return src ? `<img class="flashcard-image" loading="lazy" decoding="async" src="${src}" alt="${alt.replace(/\n/g,' ')}">` : `<span class="flashcard-image-pending">Carregando imagem...</span>`;
      })
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\+\+([^+]+)\+\+/g, '<u>$1</u>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/==([^=]+)==/g, '<mark>$1</mark>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\{\{(blue|green|red)\|([^{}]+)\}\}/g, '<span class="flashcard-text-$1">$2</span>');
  };
  return String(text || '').split(/\r?\n/).map(line => {
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if(heading) return `<div class="flashcard-md-heading level-${heading[1].length}">${inline(heading[2])}</div>`;
    return inline(line);
  }).join('<br>');
}
function materialHeadingId(text,index='') {
  const suffix=index===''?'':`-${index}`;
  return `material-heading-${normalizedTopic(text).replace(/\s+/g,'-').slice(0,64)}${suffix}`;
}
function replaceHighlightedOccurrence(html,target,item) {
  let occurrence=0;
  const wanted=Math.max(0,n(item.occurrence));
  const color=escapeAttr(item.color||'yellow');
  const scope=escapeAttr(item.scope||'stem');
  return html.replace(new RegExp(escapeRegExp(target),'g'),match => occurrence++===wanted ? `<span class="text-mark ${color}" data-saved-highlight="true" data-highlight-color="${color}" data-highlight-occurrence="${wanted}" data-highlight-scope="${scope}">${match}</span>` : match);
}
function renderMaterialInlineMarkdown(text,doc,blockKey='') {
  let html=escapeHtml(String(text||'').replace(/\s*\|\s*/g,' '));
  const highlights=[...new Map((materialEditMeta(doc.id).highlights||[]).filter(item=>item?.text && item.block===blockKey).map(item=>[`${item.block}|${item.occurrence}|${item.text}`,item])).values()].sort((a,b)=>b.text.length-a.text.length);
  highlights.forEach(item => {
    const target=escapeHtml(item.text);
    if(target) html=replaceHighlightedOccurrence(html,target,item);
  });
  return html
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g,'<span class="material-fraction"><span>$1</span><span>$2</span></span>')
    .replace(/\\(Delta|delta|theta|Theta|alpha|beta|gamma|mu|sigma|pi|times|rightarrow)\b/g,(match,name)=>({Delta:'Δ',delta:'δ',theta:'θ',Theta:'Θ',alpha:'α',beta:'β',gamma:'γ',mu:'μ',sigma:'σ',pi:'π',times:'×',rightarrow:'→'}[name]||match))
    .replace(/\^\\circ\b/g,'°')
    .replace(/\\([*|>])/g,'$1')
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
      const tableLine=index;
      const rows=[];
      const cells=value=>value.replace(/^\||\|$/g,'').split('|').map(cell=>cell.trim());
      rows.push(cells(raw));
      index+=2;
      while(index<lines.length && lines[index].includes('|')) { rows.push(cells(lines[index].trim())); index+=1; }
      index-=1;
      const columnCount=rows[0].length;
      const normalizedRows=rows.slice(1).map(row=>row.length>columnCount?[...row.slice(0,columnCount-1),row.slice(columnCount-1).join(' ')]:[...row,...Array(Math.max(0,columnCount-row.length)).fill('')]);
      html+=`<div class="material-table-wrap"><table><thead><tr>${rows[0].map((cell,column)=>`<th data-material-block="table-${tableLine}-0-${column}">${renderMaterialInlineMarkdown(cell,doc,`table-${tableLine}-0-${column}`)}</th>`).join('')}</tr></thead><tbody>${normalizedRows.map((row,rowIndex)=>`<tr>${row.map((cell,column)=>`<td data-material-block="table-${tableLine}-${rowIndex+1}-${column}">${renderMaterialInlineMarkdown(cell,doc,`table-${tableLine}-${rowIndex+1}-${column}`)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      continue;
    }
    if(raw.includes('|')) raw=raw.replace(/\s*\|\s*/g,' ');
    if(raw==='---') { closeList(); html+='<hr>'; continue; }
    const heading=raw.match(/^(#{1,4})\s+(.+)$/);
    if(heading) { closeList(); const level=heading[1].length,title=heading[2].trim(),key=`heading-${index}`,headingAttrs=level>=2?` id="${materialHeadingId(title,index)}" data-material-heading-anchor="${materialHeadingId(title,index)}" data-material-heading-text="${escapeAttr(title)}"`:''; html+=`<h${level}${headingAttrs} data-material-block="${key}">${renderMaterialInlineMarkdown(title,doc,key)}</h${level}>`; continue; }
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
function escapeHtml(s) { return String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function escapeAttr(s) { return escapeHtml(s).replace(/\n/g,' '); }
function escapeRegExp(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
async function ensureViewData(tab) {
  if(['questoes','simulados','analise'].includes(tab)) await loadQuestionBank();
  if(['simulados','analise'].includes(tab)) await loadImportedSimulados();
  if(tab === 'materiais') await loadMaterialLibrary();
  if(tab === 'prescricao') await loadPrescriptionCatalog();
}
async function render() {
  sessionStorage.setItem(UI_TAB_KEY, ui.tab);
  await ensureViewData(ui.tab);
  if(ui.tab!=='materiais'&&materialReadingCleanup) { materialReadingCleanup(); materialReadingCleanup=null; }
  renderMotivation();
  renderTabs();
  const renderers = {
    painel: renderPainel,
    pendencias: renderPendencias,
    cronograma: renderCronograma,
    aulas: renderAulas,
    questoes: renderQuestionBank,
    'importar-questoes': renderQuestionImporter,
    flashcards: renderFlashcards,
    materiais: renderMateriais,
    simulados: renderSimulados,
    analise: renderAnalise,
    areas: renderAreas,
    historico: renderHistorico,
    feynman: renderFeynman,
    prescricao: renderPrescription,
    anatomia: renderAnatomia,
    ferramentas: renderFerramentas,
    'caderno-erros': renderCadernoErros,
    ecg: renderEcg,
    radiografia: renderRadiografia,
    semiologia: renderSemiologia
  };
  // Um cronômetro só continua correndo na aba a que ele pertence. Pausar (em vez
  // de parar) preserva o acumulado para quando o usuário voltar.
  if(ui.tab !== 'flashcards') pauseAutoStudy('flashcards');
  if(ui.tab !== 'aulas') pauseAutoStudy('video');
  if(ui.tab !== 'questoes') pauseAutoStudy('questions');
  renderers[ui.tab]?.();
  persistQuestionView();
  syncRouteFromUI('replace');
  ensurePomodoroWidget();
  updatePomodoroWidget();
  ensureDailyMissionWidget();
  updateDailyMissionWidget();
}
document.getElementById('exportBtn')?.addEventListener('click', () => {
  const backup=fullPlannerBackup();
  const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`backup-completo-soqueromed-${localISODate(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById('importFile')?.addEventListener('change', e => { const file=e.target.files[0]; if(!file) return; const reader=new FileReader(); reader.onload = () => { try { const data=JSON.parse(reader.result); if(!data.schedule?.length) throw new Error('Backup inválido'); createSafetyLocalBackup('antes de importar JSON'); state=data; normalizeOfficialScheduleNames(); ensureRestartFromBlockTen(); ensureDailyTasks(); persist(); } catch(err) { alert('Não consegui importar este arquivo JSON.'); } }; reader.readAsText(file); });
document.getElementById('printBtn')?.addEventListener('click', () => {
  const previousTab=ui.tab;
  ui.tab='painel';
  render();
  const restore=()=>{ window.removeEventListener('afterprint',restore); ui.tab=previousTab; render(); };
  window.addEventListener('afterprint',restore);
  requestAnimationFrame(()=>window.print());
});
document.getElementById('themeToggle')?.addEventListener('click', event => {
  event.preventDefault();
  event.stopPropagation();
  applyTheme(document.body.classList.contains('dark') ? 'light' : 'dark');
  updateAutoStudyIndicator();
  updatePomodoroWidget();
});
applyTheme(localStorage.getItem(THEME_KEY) || 'light');
document.addEventListener('keydown', event => {
  if(event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && (event.key==='ArrowLeft' || event.key==='ArrowRight')) {
    event.preventDefault();
    if(event.repeat) return;
    const button=document.getElementById(event.key==='ArrowLeft'?'headerHistoryBack':'headerHistoryForward');
    if(button && !button.disabled) button.click();
    return;
  }
  if((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'l') {
    event.preventDefault();
    if(event.repeat) return;
    applyTheme(document.body.classList.contains('dark') ? 'light' : 'dark');
    updateAutoStudyIndicator();
    updatePomodoroWidget();
    return;
  }
  if((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'f' && (ui.tab==='aulas' || ui.tab==='questoes')) {
    event.preventDefault();
    if(event.repeat) return;
    if(ui.tab==='aulas') document.getElementById('toggleVideoFocus')?.click();
    else setQuestionFocusMode(!questionSidebarCollapsed);
    return;
  }
  if((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'f') {
    event.preventDefault();
    openQuickFlashcardCapture();
    return;
  }
  if(ui.tab !== 'aulas' || event.altKey || event.ctrlKey || event.metaKey) return;
  const target = event.target;
  if(isInteractiveTarget(target)) return;
  const video = document.getElementById('lessonVideo');
  if(!video) return;
  const rates = [0.75,1,1.25,1.5,1.75,2];
  const key=event.key.toLowerCase();
  if(event.code === 'Space') { event.preventDefault(); event.stopPropagation(); video.paused ? video.play() : video.pause(); }
  else if(event.key === 'ArrowRight') { event.preventDefault(); event.stopPropagation(); document.getElementById('videoForward10')?.click(); }
  else if(event.key === 'ArrowLeft') { event.preventDefault(); event.stopPropagation(); document.getElementById('videoBack10')?.click(); }
  else if(key === 'f' || event.key === '[') { event.preventDefault(); event.stopPropagation(); const next=rates.find(rate => rate > video.playbackRate + .01) || rates.at(-1); video.defaultPlaybackRate=next; video.playbackRate=next; rememberVideoPlaybackRate(next); persistCurrentVideoRate(video); }
  else if(key === 'j' || event.key === '=') { event.preventDefault(); event.stopPropagation(); video.defaultPlaybackRate=1; video.playbackRate=1; rememberVideoPlaybackRate(1); persistCurrentVideoRate(video); }
}, true);
document.getElementById('headerPomodoroBtn')?.addEventListener('click', () => { ui.pomodoroOpen=!ui.pomodoroOpen; navigateToTab('painel'); });
document.getElementById('headerHistoryBack')?.addEventListener('click', () => { if(plannerHistoryIndex>0) history.back(); });
document.getElementById('headerHistoryForward')?.addEventListener('click', () => { if(plannerHistoryIndex<plannerHistoryMax) history.forward(); });
document.getElementById('headerSendBtn')?.addEventListener('click', () => forcePushThisDeviceToCloud());
document.getElementById('headerReceiveBtn')?.addEventListener('click', () => {
  if(!currentUser || !sbClient) { showStudyToast('Entre na sua conta para receber dados da nuvem.'); return; }
  if(!confirm('Puxar e mesclar os dados mais recentes da nuvem neste aparelho?')) return;
  pullRemoteUpdateNow();
});
document.getElementById('syncStatus')?.addEventListener('click', () => {
  if(remoteUpdateAvailableAt) { pullRemoteUpdateNow(); return; }
  toggleSyncTelemetryDashboard();
});
document.getElementById('headerLogoutBtn')?.addEventListener('click', async () => {
  if(!currentUser) { alert('Você não está logado.'); return; }
  const confirmed = confirm('Tem certeza que deseja sair?\n\nSeus dados locais continuarão salvos. Você precisará fazer login novamente para sincronizar.');
  if(!confirmed) return;
  if(syncTimer) clearTimeout(syncTimer);
  await sbClient.auth.signOut();
});
document.getElementById('accountBtn')?.addEventListener('click', async () => {
  if(OFFLINE_FIRST) return;
  if(currentUser) {
    if(syncTimer) {
      clearTimeout(syncTimer);
      await pushCloudState();
    }
    createSafetyLocalBackup('antes de sair da conta');
    await sbClient.auth.signOut();
    currentUser = null;
    render();
    updateAccountUI();
    return;
  }
  document.getElementById('authPanel').classList.toggle('hidden');
});
document.getElementById('authForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  if(OFFLINE_FIRST || !sbClient) return;
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const message = document.getElementById('authMessage');
  if(!email || !password) { message.textContent = 'Informe seu e-mail e sua senha.'; return; }
  message.textContent = 'Entrando...';
  const { error } = await sbClient.auth.signInWithPassword({ email, password });
  message.textContent = error ? 'Não foi possível entrar. Confira o e-mail e a senha e tente novamente.' : 'Conta conectada.';
});
document.addEventListener('visibilitychange', () => {
  if(document.visibilityState === 'hidden') {
    pauseAutoStudy();
    persistQuestionTimerSession();
  }
  if(document.visibilityState === 'visible') {
    resumeAutoStudyForActiveView();
  }
});
window.addEventListener('beforeunload', event => {
  // pauseAutoStudy já grava o tempo pendente; o flush local garante que ele (e
  // qualquer edição ainda no debounce) chegue ao disco antes do recarregamento.
  pauseAutoStudy();
  persistStudyTimerSession();
  persistQuestionTimerSession();
  saveOpenVideoPosition();
  flushSaveStateOnly();
  if(questionTimer.running && questionTimerElapsedSeconds()>0) {
    event.preventDefault();
    event.returnValue='';
  }
});
// No celular o beforeunload muitas vezes não dispara; o pagehide é o último
// evento garantido para gravar o estudo antes de a aba ser descartada.
window.addEventListener('pagehide', () => {
  pauseAutoStudy();
  persistStudyTimerSession();
  persistQuestionTimerSession();
  saveOpenVideoPosition();
  flushSaveStateOnly();
  flushCloudSaveNow();
});
window.addEventListener('popstate', restoreNavigation);
document.addEventListener('keydown', handleHighlightUndoKeyboard);
document.addEventListener('click', event => {
  const autoStudyClock=event.target.closest?.('[data-auto-study-clock]');
  if(autoStudyClock) {
    if(studyTimeTracker.startedAt) pauseAutoStudy();
    else if(studyTimeTracker.kind) startAutoStudy(studyTimeTracker.kind, studyTimeTracker.scheduleId, studyTimeTracker.minimumSaveSeconds);
    return;
  }
  const addQuestionCardButton=event.target.closest?.('[data-add-question-flashcard]');
  if(addQuestionCardButton) {
    const questionId=addQuestionCardButton.dataset.addQuestionFlashcard;
    const question=questionBank.find(item=>item.id===questionId) || importedQuestionById(questionId);
    if(question) addQuestionFlashcard(question);
    return;
  }
  if(!event.target.closest?.('#globalPomodoro')) setPomodoroPanelOpen(false);
  if(!event.target.closest?.('#globalDailyMission')) setDailyMissionPanelOpen(false);
  const box = document.getElementById('materialGlobalSearchResults');
  const wrap = document.getElementById('materialGlobalSearchWrap');
  if(box && !box.hidden && wrap && !wrap.contains(event.target)) box.hidden = true;
});
document.addEventListener('input', event => {
  const input=event.target;
  if(!input?.matches?.('input[placeholder="dd/mm/aaaa"]')) return;
  const digits=input.value.replace(/\D/g,'').slice(0,8);
  input.value=[digits.slice(0,2),digits.slice(2,4),digits.slice(4,8)].filter(Boolean).join('/');
});
document.addEventListener('keydown', event => {
  if(event.key!=='Escape') return;
  closeTransientPanels();
  document.querySelectorAll('.rank-promotion-overlay,.simulation-reward-overlay,.video-continuation-overlay').forEach(overlay=>overlay.querySelector('button')?.click());
});
document.addEventListener('keydown', handleFlashcardUndoKeyboard);
document.addEventListener('keydown', handleQuestionKeyboard);
startMotivationCycle();
loadMotivationMessages();
window.CasoDoDia?.load().then(() => { if(ui.tab === 'painel') renderPainel(); });
setupSidebar();
observePlannerHeaderHeight();
resumePomodoroSession();
function showBootFailureRecovery(error, extraNote) {
  console.error('Falha ao iniciar o app:', error);
  const root = document.getElementById('app') || document.body;
  root.innerHTML = `<div style="max-width:520px;margin:15vh auto;padding:24px;font-family:system-ui,sans-serif;text-align:center">
    <h2>Não consegui abrir o app agora</h2>
    <p>Isso costuma acontecer quando o cache do navegador fica com uma versão incompleta. Seu progresso está salvo — só o carregamento falhou.</p>
    ${extraNote ? `<p>${extraNote}</p>` : ''}
    <button id="recoveryReloadBtn" style="padding:12px 20px;font-size:16px;border-radius:8px;border:none;background:#2563eb;color:#fff;cursor:pointer">Limpar cache e tentar de novo</button>
  </div>`;
  document.getElementById('recoveryReloadBtn')?.addEventListener('click', async () => {
    try {
      const regs = await navigator.serviceWorker?.getRegistrations?.() || [];
      await Promise.all(regs.map(reg => reg.unregister()));
      const keys = await caches?.keys?.() || [];
      await Promise.all(keys.map(key => caches.delete(key)));
    } catch(cleanupError) { console.warn('Falha ao limpar cache:', cleanupError); }
    location.reload();
  });
}
window.addEventListener('unhandledrejection', event => {
  if(document.getElementById('recoveryReloadBtn')) return;
  const bodyHasContent = (document.getElementById('app') || document.body).children.length > 5;
  if(bodyHasContent) return;
  showBootFailureRecovery(event.reason, 'Se preferir, entre novamente com sua conta para continuar de onde parou.');
});
render().catch(error => showBootFailureRecovery(error));
maintainDailyLocalBackup();
// Se o planner ficar aberto atravessando a virada do dia de estudo (5h), o backup
// automático não pode esperar o próximo F5 — reavalia periodicamente.
setInterval(maintainDailyLocalBackup, 15 * 60 * 1000);
if('requestIdleCallback' in window) requestIdleCallback(() => loadQuestionBank(), {timeout:700});
else setTimeout(() => loadQuestionBank(), 120);
loadOfficialSchedule();
loadVideoCatalog();
initCloud();
startTimerAudit();
startAutoRecovery();
if('requestIdleCallback' in window) requestIdleCallback(performHealthCheck, {timeout:2000});
else setTimeout(performHealthCheck, 500);
