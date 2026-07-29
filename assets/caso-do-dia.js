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

  function daysSinceEpoch(date) {
    return Math.floor(date.getTime() / 86400000);
  }

  function todayCase(refDateISO) {
    if (!CASES.length) return null;
    const d = refDateISO ? new Date(refDateISO + 'T00:00:00') : new Date();
    const start = new Date(START_DATE_ISO + 'T00:00:00');
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

  window.CasoDoDia = { load, todayCase, isCorrectGuess, allDiagnoses, normalize, TOTAL_HINTS };
})();
