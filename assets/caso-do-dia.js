(function () {
  const TOTAL_HINTS = 6;
  const STOPWORDS = new Set(['de','da','do','das','dos','com','sem','por','para','em','no','na','nos','nas','ou','e','a','o','os','as','um','uma','uns','umas','ao','aos','à','às']);

  let CASES = [];
  let loadPromise = null;

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function keywordsOf(diagnosis) {
    return normalize(diagnosis).split(' ').filter(w => w.length >= 4 && !STOPWORDS.has(w));
  }

  function isCorrectGuess(guess, diagnosis) {
    const guessN = normalize(guess);
    if (!guessN) return false;
    const diagN = normalize(diagnosis);
    if (guessN === diagN) return true;
    if (diagN.includes(guessN) && guessN.length >= 6) return true;
    const keywords = keywordsOf(diagnosis);
    if (!keywords.length) return diagN.includes(guessN);
    const guessWords = new Set(guessN.split(' '));
    const hits = keywords.filter(k => guessWords.has(k) || guessN.includes(k)).length;
    const needed = Math.min(keywords.length, keywords.length <= 2 ? keywords.length : 2);
    return hits >= needed;
  }

  const START_DATE_ISO = '2026-07-29';
  const DAY_MS = 86400000;

  function daysSinceEpoch(date) {
    return Math.floor(date.getTime() / DAY_MS);
  }

  function todayCase(refDateISO) {
    if (!CASES.length) return null;
    const now = new Date();
    const d = refDateISO ? new Date(refDateISO) : new Date(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()));
    const start = new Date(START_DATE_ISO);
    const offset = daysSinceEpoch(d) - daysSinceEpoch(start);
    const idx = ((offset % CASES.length) + CASES.length) % CASES.length;
    return CASES[idx];
  }

  async function load() {
    if (loadPromise) return loadPromise;
    loadPromise = fetch('data/casos_do_dia.json', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        CASES = (Array.isArray(data) ? data : []).slice().sort((a, b) => (a.number || 0) - (b.number || 0));
        return CASES;
      })
      .catch(() => { CASES = []; return CASES; });
    return loadPromise;
  }

  function allDiagnoses() {
    const seen = new Set();
    const list = [];
    CASES.forEach(c => {
      const key = normalize(c.diagnosis);
      if (seen.has(key)) return;
      seen.add(key);
      list.push(c.diagnosis);
    });
    return list.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  function caseByNumber(number) {
    return CASES.find(item => Number(item.number) === Number(number)) || null;
  }

  function dateForCaseNumber(number) {
    const index = CASES.findIndex(item => Number(item.number) === Number(number));
    if(index < 0) return '';
    return dateForCaseIndex(index);
  }
  function dateForCaseIndex(index) {
    return new Date(Date.parse(START_DATE_ISO) + index*DAY_MS).toISOString().slice(0,10);
  }
  function availableCasesThrough(date) {
    const count = Math.max(0,Math.floor((Date.parse(date)-Date.parse(START_DATE_ISO))/DAY_MS)+1);
    return CASES.slice(0,count).map((item,index)=>({number:item.number,date:dateForCaseIndex(index)}));
  }

  window.CasoDoDia = { load, todayCase, isCorrectGuess, allDiagnoses, caseByNumber, dateForCaseNumber, availableCasesThrough, normalize, TOTAL_HINTS };
})();
