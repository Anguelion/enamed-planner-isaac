/* ============================================================================
 * SÓqueroMed — Simulador de ECG  (Fase 1 / MVP)
 * Módulo autossuficiente, 100% offline.
 *
 * Arquitetura:
 *   1. ENGINE   — síntese de forma de onda + renderização em papel milimetrado
 *   2. CONDITIONS — biblioteca de condições de alto rendimento (ritmo+morfologia+ensino)
 *   3. CALIPERS — régua/compasso digital sobre o traçado
 *   4. SRS      — repetição espaçada (calibrada por confiança) + métricas
 *   5. UI       — Início · Método · Banco · Treino · Revisão · Desempenho
 *
 * Integra no planner via window.EcgSim.mount(container, bridge).
 * bridge = { getState, save, escapeHtml, iconSvg }
 * ==========================================================================*/
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 0. Utilidades
  // ---------------------------------------------------------------------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const gauss = (x, s) => Math.exp(-(x * x) / (2 * s * s));
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const addDaysISO = (d) => {
    const t = new Date();
    t.setDate(t.getDate() + Math.round(d));
    return t.toISOString().slice(0, 10);
  };
  const esc = (s) => String(s ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  function smoothPulse(x, a, b) {
    // 1 dentro de [a,b] com bordas suaves
    const edge = 0.018;
    if (x < a - edge || x > b + edge) return 0;
    if (x < a) return 0.5 * (1 + Math.cos(Math.PI * (a - x) / edge));
    if (x > b) return 0.5 * (1 + Math.cos(Math.PI * (x - b) / edge));
    return 1;
  }
  // ruído pseudo-aleatório determinístico (para reprodutibilidade por semente)
  function noiseAt(t, seed) {
    const x = Math.sin((t * 137.13 + seed * 51.7)) * 43758.5453;
    return (x - Math.floor(x)) * 2 - 1;
  }

  // ---------------------------------------------------------------------------
  // 1. ENGINE — geometria do papel
  // ---------------------------------------------------------------------------
  // Padrão: 25 mm/s (eixo tempo) · 10 mm/mV (eixo voltagem)
  const MM_PER_S = 25;
  const MM_PER_MV = 10;

  const LEADS = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];

  // Tabela de amplitudes do ECG normal (mV) — reproduz morfologia clássica:
  // aVR invertido, progressão de R de V1→V6, rS em V1, qR em V6.
  const NORMAL = {
    I:   { p: 0.10, q: -0.04, r: 0.70, s: -0.08, t: 0.20 },
    II:  { p: 0.15, q: -0.04, r: 1.10, s: -0.08, t: 0.30 },
    III: { p: 0.07, q: -0.03, r: 0.50, s: -0.12, t: 0.12 },
    aVR: { p: -0.12, q: 0.00, r: 0.10, s: -0.85, t: -0.25 },
    aVL: { p: 0.06, q: -0.03, r: 0.45, s: -0.10, t: 0.12 },
    aVF: { p: 0.12, q: -0.04, r: 0.80, s: -0.08, t: 0.20 },
    V1:  { p: 0.08, q: 0.00, r: 0.25, s: -0.95, t: -0.05 },
    V2:  { p: 0.10, q: 0.00, r: 0.45, s: -1.35, t: 0.45 },
    V3:  { p: 0.10, q: 0.00, r: 0.70, s: -0.95, t: 0.50 },
    V4:  { p: 0.10, q: -0.03, r: 1.20, s: -0.45, t: 0.50 },
    V5:  { p: 0.10, q: -0.05, r: 1.30, s: -0.22, t: 0.40 },
    V6:  { p: 0.10, q: -0.05, r: 1.05, s: -0.08, t: 0.30 },
  };

  function baseAmps(lead) {
    return Object.assign(
      { p: 0, q: 0, r: 0, s: 0, t: 0, st: 0, width: 1, delta: 0, tSigma: 0.052, tCenter: 0.30, rprime: 0, extraS: 0 },
      NORMAL[lead]
    );
  }
  function getAmps(cond, lead) {
    const a = baseAmps(lead);
    if (cond.shape) cond.shape(lead, a, cond);
    return a;
  }

  // Forma de um complexo QRS-T num instante dt (s) a partir do início do QRS.
  function complexValue(a, dt, absT, cond, morph) {
    let w = a.width;
    if (morph === 'wide' || morph === 'pvc' || morph === 'torsades') w = Math.max(w, 1.7);
    const rC = 0.040 * w;
    const qC = rC - 0.024 * w;
    const sC = rC + 0.026 * w;
    let v = 0;
    // Onda delta (pré-excitação): empastamento inicial do QRS
    if (a.delta) v += a.delta * smoothPulse(dt, -0.03 * w, rC - 0.01) * 0.6;
    v += a.q * gauss(dt - qC, 0.007 * w);
    v += a.r * gauss(dt - rC, 0.011 * w);
    v += a.s * gauss(dt - sC, 0.011 * w);
    if (a.rprime) v += a.rprime * gauss(dt - (sC + 0.030 * w), 0.010 * w); // R' (rSR')
    if (a.extraS) v += a.extraS * gauss(dt - (sC + 0.028 * w), 0.014 * w); // S empastado
    // Segmento ST (elevação/depressão) entre ponto J e início da onda T
    const jPoint = sC + 0.010 * w;
    v += a.st * smoothPulse(dt, jPoint, a.tCenter - 0.06);
    // Onda T
    v += a.t * gauss(dt - a.tCenter, a.tSigma);
    // Onda U discreta (fisiológica)
    v += (a.t > 0 ? 0.03 : 0) * gauss(dt - (a.tCenter + 0.13), 0.05);
    // Torsades: envelope de amplitude "torcendo"
    if (morph === 'torsades') {
      const env = 0.35 + 0.9 * Math.abs(Math.sin(Math.PI * absT / 2.2));
      const sign = Math.sin(2 * Math.PI * absT / 2.2) >= 0 ? 1 : -1;
      v *= env * sign;
    }
    return v;
  }

  function pValue(a, dt, cond) {
    return a.p * gauss(dt, 0.021) * (cond.pMul == null ? 1 : cond.pMul);
  }

  // Ondas de base (fibrilação, flutter, FV)
  function baselineValue(baseline, lead, t) {
    if (!baseline || baseline.type === 'flat') return 0;
    if (baseline.type === 'afib') {
      const amp = /V1|V2|II/.test(lead) ? 0.06 : 0.03;
      return amp * (Math.sin(2 * Math.PI * 6.3 * t) + 0.7 * Math.sin(2 * Math.PI * 8.9 * t + 1.1) + 0.5 * Math.sin(2 * Math.PI * 11.7 * t + 2.3)) / 2.2 + amp * 0.4 * noiseAt(t, 3);
    }
    if (baseline.type === 'flutter') {
      // dente-de-serra ~300/min; negativo em II/III/aVF, positivo em V1
      const f = 300 / 60;
      const phase = (t * f) % 1;
      const saw = phase < 0.7 ? -(phase / 0.7) : ((phase - 0.7) / 0.3) * 2 - 1; // rampa lenta + retorno
      if (/II|III|aVF/.test(lead)) return 0.16 * saw;
      if (/V1/.test(lead)) return -0.12 * saw;
      if (/I\b|aVL|V6/.test(lead)) return 0.04 * saw;
      return 0.06 * saw;
    }
    if (baseline.type === 'vf') {
      const drift = 3.5 + 2 * Math.sin(2 * Math.PI * 0.4 * t);
      return 0.42 * (Math.sin(2 * Math.PI * drift * t) + 0.6 * Math.sin(2 * Math.PI * (drift * 1.8) * t + t) + 0.4 * Math.sin(2 * Math.PI * (drift * 2.7) * t + 2)) / 1.8;
    }
    return 0;
  }

  // Constrói o "cronograma" de ativações atriais (P) e ventriculares (QRS-T).
  function buildBeats(cond, dur, seed) {
    const beats = { pWaves: [], complexes: [], baseline: cond.baseline || { type: 'flat' } };
    const rate = cond.rate || 72;
    const rr = 60 / rate;
    const jit = () => (cond.rrJitter ? (noiseAt(seed++, 7) * cond.rrJitter) : 0);
    let t;
    switch (cond.rhythm) {
      case 'sinus':
        for (t = 0.45; t < dur; t += rr * (1 + jit())) {
          beats.pWaves.push({ t: t - (cond.pr || 0.16) });
          beats.complexes.push({ t, morph: cond.morph || 'normal' });
        }
        break;
      case 'afib':
        t = 0.3;
        while (t < dur) {
          beats.complexes.push({ t, morph: cond.morph || 'normal' });
          t += rr * (0.55 + Math.abs(noiseAt(seed++, 9)) * 1.0);
        }
        break;
      case 'flutter': {
        const aRR = 60 / 300, ratio = cond.ratio || 2;
        let i = 0;
        for (t = 0.2; t < dur; t += aRR) { i++; if (i % ratio === 0) beats.complexes.push({ t: t + 0.02, morph: 'normal' }); }
        break;
      }
      case 'svt':
        for (t = 0.3; t < dur; t += rr) beats.complexes.push({ t, morph: cond.morph || 'normal' });
        break;
      case 'firstdegree':
        for (t = 0.45; t < dur; t += rr) {
          beats.pWaves.push({ t: t - (cond.pr || 0.28) });
          beats.complexes.push({ t, morph: 'normal' });
        }
        break;
      case 'mobitz1': {
        const aRR = 60 / (cond.atrialRate || 78), cyc = cond.cycleLen || 4;
        let pr = 0.16, n = 0;
        for (t = 0.4; t < dur; t += aRR) {
          beats.pWaves.push({ t });
          if (n % cyc === cyc - 1) { pr = 0.16; } // batimento bloqueado (P sem QRS)
          else { beats.complexes.push({ t: t + pr, morph: 'normal' }); pr += 0.055; }
          n++;
        }
        break;
      }
      case 'mobitz2': {
        const aRR = 60 / (cond.atrialRate || 80), ratio = cond.ratio || 3;
        let n = 0;
        for (t = 0.4; t < dur; t += aRR) {
          beats.pWaves.push({ t });
          if (n % ratio !== ratio - 1) beats.complexes.push({ t: t + 0.16, morph: 'normal' });
          n++;
        }
        break;
      }
      case 'cavt': {
        const aRR = 60 / (cond.atrialRate || 82);
        for (t = 0.35; t < dur; t += aRR) beats.pWaves.push({ t });
        const vRR = 60 / (cond.rate || 38);
        for (t = 0.6; t < dur; t += vRR) beats.complexes.push({ t, morph: 'wide' });
        break;
      }
      case 'pvc': {
        let i = 0;
        for (t = 0.45; t < dur; t += rr) {
          i++;
          if (i % (cond.every || 4) === 0) {
            beats.complexes.push({ t: t - 0.14, morph: 'pvc' }); // precoce, largo, bizarro
          } else {
            beats.pWaves.push({ t: t - 0.16 });
            beats.complexes.push({ t, morph: 'normal' });
          }
        }
        break;
      }
      case 'vt':
        for (t = 0.2; t < dur; t += 60 / (cond.rate || 170)) beats.complexes.push({ t, morph: 'wide' });
        break;
      case 'vf':
        beats.baseline = { type: 'vf' };
        break;
      case 'torsades':
        for (t = 0.2; t < dur; t += 60 / (cond.rate || 230)) beats.complexes.push({ t, morph: 'torsades' });
        break;
      default:
        for (t = 0.45; t < dur; t += rr) { beats.pWaves.push({ t: t - 0.16 }); beats.complexes.push({ t, morph: 'normal' }); }
    }
    return beats;
  }

  // Amostra a voltagem (mV) de uma derivação no instante t.
  function sampleLead(lead, t, beats, cond, ampCache) {
    let v = baselineValue(beats.baseline, lead, t);
    if (beats.baseline.type === 'vf') return v; // FV domina o sinal
    for (const p of beats.pWaves) {
      const dt = t - p.t;
      if (dt > -0.08 && dt < 0.10) v += pValue(ampCache[lead], dt, cond);
    }
    for (const c of beats.complexes) {
      const dt = t - c.t;
      if (dt > -0.06 && dt < 0.52) {
        let a = ampCache[lead];
        if (c.morph === 'pvc') a = pvcAmps(lead); // PVC ignora tabela normal
        v += complexValue(a, dt, c.t, cond, c.morph);
      }
    }
    return v;
  }

  function pvcAmps(lead) {
    // Extrassístole ventricular: monofásica larga, T discordante.
    const rightish = /V1|V2|III|aVF/.test(lead);
    const a = baseAmps(lead);
    a.p = 0; a.width = 1.9; a.q = 0; a.rprime = 0; a.extraS = 0;
    if (rightish) { a.r = -1.4; a.s = 0; a.t = 0.5; }
    else { a.r = 1.6; a.s = 0; a.t = -0.55; }
    a.tCenter = 0.40; a.tSigma = 0.07; a.st = 0;
    return a;
  }

  // ---------------------------------------------------------------------------
  // 1b. RENDERIZAÇÃO
  // ---------------------------------------------------------------------------
  function drawGrid(ctx, x, y, w, h, pxmm, dark) {
    const minor = dark ? 'rgba(240,90,90,0.16)' : 'rgba(220,70,70,0.20)';
    const major = dark ? 'rgba(240,90,90,0.34)' : 'rgba(210,60,60,0.42)';
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.lineWidth = 1;
    for (let gx = x; gx <= x + w + 0.5; gx += pxmm) {
      const major5 = Math.round((gx - x) / pxmm) % 5 === 0;
      ctx.strokeStyle = major5 ? major : minor;
      ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke();
    }
    for (let gy = y; gy <= y + h + 0.5; gy += pxmm) {
      const major5 = Math.round((gy - y) / pxmm) % 5 === 0;
      ctx.strokeStyle = major5 ? major : minor;
      ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke();
    }
    ctx.restore();
  }

  function drawLeadTrace(ctx, lead, beats, cond, ampCache, x0, yBase, tStart, tDur, pxmm, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const step = 0.0025;
    const clampV = (v) => clamp(v, -2.4, 2.4);
    let first = true;
    // Marca de calibração (10mm) no início
    for (let t = tStart; t <= tStart + tDur + 1e-9; t += step) {
      const v = clampV(sampleLead(lead, t, beats, cond, ampCache));
      const px = x0 + (t - tStart) * MM_PER_S * pxmm;
      const py = yBase - v * MM_PER_MV * pxmm;
      if (first) { ctx.moveTo(px, py); first = false; } else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Renderiza o ECG de 12 derivações (layout 3x4 + tira de ritmo) ou tira única.
  function renderECG(canvas, cond, opts) {
    opts = opts || {};
    const seed = opts.seed || 1;
    const dark = document.body.classList.contains('dark'); // segue o tema do planner (body.dark)
    const paper = dark ? '#1c1416' : '#fff7f6';
    const traceColor = dark ? '#ffd9d0' : '#111';
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = canvas.clientWidth || opts.width || 900;

    const ampCache = {};
    LEADS.forEach((l) => (ampCache[l] = getAmps(cond, l)));
    const dur = 11;
    const beats = buildBeats(cond, dur, seed);

    if (opts.mode === 'strip') {
      const lead = opts.lead || 'II';
      const pxmm = opts.pxmm || Math.max(3.2, cssW / (10 * MM_PER_S + 12));
      const stripDur = opts.stripDur || 10;
      const h = opts.height || 150;
      canvas.width = cssW * dpr; canvas.height = h * dpr;
      canvas.style.height = h + 'px';
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = paper; ctx.fillRect(0, 0, cssW, h);
      drawGrid(ctx, 0, 0, cssW, h, pxmm, dark);
      drawLeadTrace(ctx, lead, beats, cond, ampCache, 6, h / 2, opts.tStart || 0, stripDur, pxmm, traceColor);
      ctx.fillStyle = traceColor; ctx.font = '600 12px system-ui'; ctx.fillText(lead, 8, 16);
      canvas._ecgMap = { x0: 6, yBase: h / 2, pxmm, tStart: opts.tStart || 0 };
      return;
    }

    // 12 derivações
    const cols = [['I', 'aVR', 'V1', 'V4'], ['II', 'aVL', 'V2', 'V5'], ['III', 'aVF', 'V3', 'V6']];
    const colWindow = 2.5;
    const marginL = 4, gap = 2;
    const colW = (cssW - marginL - gap * 3) / 4;
    const pxmm = colW / (colWindow * MM_PER_S + 2);
    const rowH = 46 * pxmm; // altura de cada célula em px
    const stripH = 42 * pxmm;
    const totalH = rowH * 3 + stripH + 14;
    canvas.width = cssW * dpr; canvas.height = totalH * dpr;
    canvas.style.height = totalH + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = paper; ctx.fillRect(0, 0, cssW, totalH);
    drawGrid(ctx, 0, 0, cssW, totalH, pxmm, dark);

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const lead = cols[r][c];
        const x0 = marginL + c * (colW + gap);
        const yBase = r * rowH + rowH / 2 + 6;
        const tStart = c * colWindow;
        ctx.fillStyle = traceColor; ctx.font = '600 11px system-ui';
        ctx.fillText(lead, x0 + 3, r * rowH + 14);
        drawLeadTrace(ctx, lead, beats, cond, ampCache, x0, yBase, tStart, colWindow, pxmm, traceColor);
        // separador de coluna sutil
        if (c > 0) { ctx.strokeStyle = dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)'; ctx.beginPath(); ctx.moveTo(x0 - gap / 2, r * rowH + 6); ctx.lineTo(x0 - gap / 2, r * rowH + rowH); ctx.stroke(); }
      }
    }
    // Tira de ritmo (DII) — 10s
    const yStrip = 3 * rowH + stripH / 2 + 8;
    ctx.fillStyle = traceColor; ctx.font = '600 11px system-ui';
    ctx.fillText('II (ritmo)', marginL + 3, 3 * rowH + 16);
    drawLeadTrace(ctx, 'II', beats, cond, ampCache, marginL, yStrip, 0, 10, pxmm, traceColor);
    canvas._ecgMap = { x0: marginL, yBase: yStrip, pxmm, tStart: 0 };
  }

  // ---------------------------------------------------------------------------
  // 2. CONDITIONS — biblioteca de alto rendimento
  // ---------------------------------------------------------------------------
  const U = { baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica' };

  const CONDITIONS = [
    {
      id: 'sinus_normal', name: 'Ritmo sinusal normal', category: 'Ritmos sinusais', level: 1,
      rate: 74, rhythm: 'sinus', rrJitter: 0.02, urgency: 'baixa',
      tags: ['normal', 'QRS estreito', 'onda P presente'],
      quick: { dx: 'Ritmo sinusal normal', findings: ['P positiva em DII precedendo cada QRS', 'FC 60–100 bpm', 'PR e QRS normais'], urgency: 'baixa' },
      teach: {
        qualidade: 'Traçado sem artefatos, calibração 10 mm/mV, 25 mm/s.',
        freq: 'FC ~74 bpm.', ritmo: 'Sinusal: cada QRS precedido de P de morfologia normal, P positiva em DII/aVF e negativa em aVR.',
        eixo: 'Eixo normal (0° a +90°).', intervalos: 'PR 120–200 ms, QRS <120 ms, QTc normal.',
        morfologia: 'Progressão de R normal, sem alterações de ST-T.',
        criterios: ['P sinusal (+ em DII, − em aVR)', 'FC 60–100', 'Relação P:QRS 1:1'],
        ddx: ['Taquicardia atrial (P de morfologia diferente)', 'Ritmo atrial ectópico'],
        armadilhas: ['Ver "muita doença" em todo ECG — o normal é a referência.'],
        conduta: ['Nenhuma. Referência de normalidade.'], ref: 'Referência de normalidade.'
      }
    },
    {
      id: 'sinus_brady', name: 'Bradicardia sinusal', category: 'Ritmos sinusais', level: 1,
      rate: 46, rhythm: 'sinus', rrJitter: 0.02, urgency: 'baixa',
      tags: ['bradicardia', 'QRS estreito', 'onda P presente'],
      quick: { dx: 'Bradicardia sinusal', findings: ['Ritmo sinusal com FC <60 bpm', 'P precedendo cada QRS'], urgency: 'baixa' },
      teach: {
        qualidade: 'Adequada.', freq: 'FC ~46 bpm.', ritmo: 'Sinusal, apenas lento.',
        eixo: 'Normal.', intervalos: 'PR e QRS normais.', morfologia: 'Sem alterações de repolarização.',
        criterios: ['Ritmo sinusal', 'FC < 60 bpm'],
        ddx: ['BAV de alto grau (dissociação P-QRS)', 'Ritmo juncional (P ausente/retrógrada)'],
        armadilhas: ['Bradicardia fisiológica em atletas x patológica sintomática.'],
        conduta: ['Assintomático: observar.', 'Instável (hipotensão, síncope): atropina, considerar marca-passo (algoritmo de bradicardia).'], ref: 'AHA ACLS Bradicardia.'
      }
    },
    {
      id: 'sinus_tachy', name: 'Taquicardia sinusal', category: 'Ritmos sinusais', level: 1,
      rate: 125, rhythm: 'sinus', rrJitter: 0.015, urgency: 'media',
      tags: ['taquicardia', 'QRS estreito', 'onda P presente'],
      quick: { dx: 'Taquicardia sinusal', findings: ['FC >100 com P sinusal', 'QRS estreito, RR regular'], urgency: 'media' },
      teach: {
        qualidade: 'Adequada.', freq: 'FC ~125 bpm.', ritmo: 'Sinusal, rápido; P pode "montar" na T precedente.',
        eixo: 'Normal.', intervalos: 'PR normal, QRS estreito.', morfologia: 'Sem alterações isquêmicas agudas.',
        criterios: ['P sinusal antes de cada QRS', 'FC > 100'],
        ddx: ['Flutter 2:1 (FC ~150 fixa)', 'Taquicardia atrial', 'TSV'],
        armadilhas: ['É quase sempre secundária — procure a causa (dor, febre, hipovolemia, TEP, anemia, hipertireoidismo).'],
        conduta: ['Tratar a causa de base, não a FC isoladamente.'], ref: '—'
      }
    },
    {
      id: 'afib', name: 'Fibrilação atrial', category: 'Ritmos atriais', level: 2,
      rate: 130, rhythm: 'afib', baseline: { type: 'afib' }, urgency: 'alta',
      tags: ['irregular', 'QRS estreito', 'ausência de P', 'emergência'],
      quick: { dx: 'Fibrilação atrial (resposta ventricular rápida)', findings: ['RR irregularmente irregular', 'Ausência de onda P', 'Linha de base fibrilatória'], urgency: 'alta' },
      teach: {
        qualidade: 'Diferenciar ondas f de artefato de tremor.', freq: 'Resposta ventricular ~130 bpm (rápida).',
        ritmo: 'Irregularmente irregular, sem P organizadas; ondulações fibrilatórias.',
        eixo: 'Variável.', intervalos: 'QRS estreito (salvo aberrância).', morfologia: 'Sem P; RR caótico.',
        criterios: ['Ausência de P', 'RR irregularmente irregular'],
        ddx: ['Flutter com condução variável', 'Taquicardia atrial multifocal (≥3 morfologias de P)', 'Artefato'],
        armadilhas: ['FA pré-excitada (WPW): irregular, largo e MUITO rápido — não usar bloqueador do nó AV.', 'Confirmação exige interpretação visual do traçado.'],
        conduta: ['Instável: cardioversão elétrica sincronizada.', 'Estável: controle de FC (betabloqueador/BCC), anticoagulação por risco (CHA₂DS₂-VASc).'], ref: 'Diretriz de FA.'
      }
    },
    {
      id: 'flutter', name: 'Flutter atrial (2:1)', category: 'Ritmos atriais', level: 2,
      rate: 150, rhythm: 'flutter', ratio: 2, baseline: { type: 'flutter' }, urgency: 'alta',
      tags: ['regular', 'QRS estreito', 'ondas F', 'emergência'],
      quick: { dx: 'Flutter atrial com condução 2:1', findings: ['Ondas F em dente-de-serra (~300/min)', 'FC ventricular ~150 fixa'], urgency: 'alta' },
      teach: {
        qualidade: 'Procurar ondas F em DII/DIII/aVF.', freq: 'Atrial ~300/min; ventricular ~150 (2:1).',
        ritmo: 'Atividade atrial organizada em dente-de-serra; condução regular.', eixo: 'Normal.',
        intervalos: 'QRS estreito.', morfologia: 'Dente-de-serra clássico na parede inferior.',
        criterios: ['Ondas F ~300/min', 'FC ventricular ~150 sugere 2:1'],
        ddx: ['Taquicardia sinusal (FC ~150 é suspeita de flutter 2:1)', 'TSV'],
        armadilhas: ['FC exatamente ~150 → sempre pensar em flutter 2:1. Manobra vagal/adenosina desmascara as ondas F.'],
        conduta: ['Instável: cardioversão sincronizada (baixa energia).', 'Estável: controle de FC/ritmo; anticoagulação semelhante à FA.'], ref: 'Diretriz de arritmias supraventriculares.'
      }
    },
    {
      id: 'svt', name: 'TSV (reentrada nodal)', category: 'Taquicardias supraventriculares', level: 3,
      rate: 185, rhythm: 'svt', urgency: 'alta',
      tags: ['taquicardia', 'QRS estreito', 'regular', 'sem P visível', 'emergência'],
      quick: { dx: 'Taquicardia supraventricular (AVNRT)', findings: ['QRS estreito regular ~180', 'Sem P visível (ou pseudo-r\' em V1)'], urgency: 'alta' },
      teach: {
        qualidade: 'Adequada.', freq: 'FC ~180–200 bpm.', ritmo: 'Regular, QRS estreito, P não identificável (dentro do QRS).',
        eixo: 'Normal.', intervalos: 'RP muito curto.', morfologia: 'Pseudo-onda s em inferiores / pseudo-r\' em V1 pode aparecer.',
        criterios: ['QRS estreito regular', 'FC ~150–250', 'Ausência de P visível'],
        ddx: ['Flutter 2:1', 'Taquicardia atrial', 'TV (se QRS largo)'],
        armadilhas: ['QRS largo + regular: tratar como TV até prova em contrário.'],
        conduta: ['Instável: cardioversão sincronizada.', 'Estável: manobra vagal → adenosina.'], ref: 'ACLS Taquicardia.'
      }
    },
    {
      id: 'pvc', name: 'Extrassístole ventricular', category: 'Ritmos ventriculares', level: 2,
      rate: 72, rhythm: 'pvc', every: 4, rrJitter: 0.02, urgency: 'baixa',
      tags: ['extrassístole', 'QRS largo', 'batimento precoce'],
      quick: { dx: 'Extrassístoles ventriculares (EV)', findings: ['Batimento largo, precoce, sem P precedente', 'Pausa compensatória', 'T discordante'], urgency: 'baixa' },
      teach: {
        qualidade: 'Adequada.', freq: 'FC de base normal.', ritmo: 'Sinusal com batimentos ectópicos ventriculares intercalados.',
        eixo: '—.', intervalos: 'QRS do batimento ectópico largo (>120 ms).', morfologia: 'QRS bizarro, T em oposição ao QRS, pausa compensatória.',
        criterios: ['QRS largo precoce', 'Sem P precedente', 'T discordante'],
        ddx: ['Batimento de escape (tardio, não precoce)', 'Aberrância de condução'],
        armadilhas: ['Fenômeno R sobre T pode deflagrar TV/FV.', 'Bigeminismo = 1 EV a cada batimento sinusal.'],
        conduta: ['Isoladas em coração normal: geralmente benignas.', 'Investigar se muito frequentes/sintomáticas ou cardiopatia.'], ref: '—'
      }
    },
    {
      id: 'vt', name: 'Taquicardia ventricular monomórfica', category: 'Taquicardias ventriculares', level: 3,
      rate: 175, rhythm: 'vt', urgency: 'critica',
      tags: ['taquicardia', 'QRS largo', 'regular', 'emergência', 'parada iminente'],
      shape(lead, a) { // concordância positiva precordial, T discordante
        if (/V/.test(lead)) { a.r = 1.5; a.s = -0.1; a.q = 0; a.t = -0.5; }
        a.width = 1.9; a.tCenter = 0.42; a.tSigma = 0.07;
      },
      quick: { dx: 'Taquicardia ventricular monomórfica', findings: ['QRS largo regular ~170', 'Dissociação AV / concordância', 'Sem P'], urgency: 'critica' },
      teach: {
        qualidade: 'Adequada.', freq: 'FC ~150–200 bpm.', ritmo: 'Taquicardia regular de QRS largo, sem P conduzidas.',
        eixo: 'Frequente desvio extremo ("noroeste").', intervalos: 'QRS >120 ms.', morfologia: 'Monomórfica; buscar dissociação AV, batimentos de captura e fusão.',
        criterios: ['Dissociação AV', 'Batimentos de captura/fusão', 'Concordância precordial', 'Critérios de Brugada/Vereckei'],
        ddx: ['TSV com aberrância', 'Taquicardia pré-excitada', 'Ritmo estimulado'],
        armadilhas: ['Taquicardia de QRS largo em adulto → TV até prova em contrário, sobretudo se história de cardiopatia.'],
        conduta: ['Com pulso instável: cardioversão sincronizada.', 'Sem pulso: desfibrilação + RCP (algoritmo de PCR).', 'Estável: antiarrítmico (amiodarona) e preparo para cardioversão.'], ref: 'ACLS 2025.'
      }
    },
    {
      id: 'vf', name: 'Fibrilação ventricular', category: 'Ritmos de parada', level: 3,
      rate: 300, rhythm: 'vf', baseline: { type: 'vf' }, urgency: 'critica',
      tags: ['parada', 'caótico', 'emergência', 'ritmo chocável'],
      quick: { dx: 'Fibrilação ventricular', findings: ['Ondulações caóticas, sem QRS identificável', 'Sem débito — PCR'], urgency: 'critica' },
      teach: {
        qualidade: 'Excluir artefato: paciente sem pulso é FV.', freq: 'Indeterminável.', ritmo: 'Caótico, sem complexos organizados.',
        eixo: '—.', intervalos: '—.', morfologia: 'Ondulações amplas (FV grosseira) ou finas.',
        criterios: ['Ausência de QRS organizado', 'Paciente sem pulso'],
        ddx: ['Artefato de movimento (paciente consciente/com pulso)', 'TV polimórfica'],
        armadilhas: ['"FV fina" pode ser confundida com assistolia — checar ganho e derivações.'],
        conduta: ['Ritmo CHOCÁVEL: desfibrilação imediata + RCP de alta qualidade + adrenalina/amiodarona (algoritmo de PCR).'], ref: 'AHA 2025 PCR.'
      }
    },
    {
      id: 'torsades', name: 'Torsades de pointes', category: 'Taquicardias ventriculares', level: 4,
      rate: 230, rhythm: 'torsades', urgency: 'critica',
      tags: ['polimórfica', 'QRS largo', 'QT longo', 'emergência'],
      quick: { dx: 'Torsades de pointes (TV polimórfica com QT longo)', findings: ['QRS que "torce" em torno da linha de base', 'Contexto de QT longo'], urgency: 'critica' },
      teach: {
        qualidade: 'Adequada.', freq: '~200–250 bpm.', ritmo: 'TV polimórfica com variação cíclica da amplitude/eixo.',
        eixo: 'Rotação contínua.', intervalos: 'QT longo no ritmo de base.', morfologia: 'Complexos "torcendo" ao redor da linha isoelétrica.',
        criterios: ['TV polimórfica', 'QT longo prévio'],
        ddx: ['TV polimórfica isquêmica (QT normal)', 'FV'],
        armadilhas: ['Buscar causas de QT longo: fármacos (macrolídeos, antipsicóticos, metadona), hipoK, hipoMg.'],
        conduta: ['Sulfato de magnésio IV.', 'Instável/sem pulso: desfibrilação.', 'Suspender fármacos que alargam QT; corrigir eletrólitos.'], ref: '—'
      }
    },
    {
      id: 'avb1', name: 'BAV de 1º grau', category: 'Distúrbios de condução', level: 2,
      rate: 66, rhythm: 'firstdegree', pr: 0.30, rrJitter: 0.02, urgency: 'baixa',
      tags: ['PR longo', 'QRS estreito', 'onda P presente'],
      quick: { dx: 'BAV de 1º grau', findings: ['PR fixo e prolongado (>200 ms)', 'Todo P conduz'], urgency: 'baixa' },
      teach: {
        qualidade: 'Adequada.', freq: 'Normal.', ritmo: 'Sinusal, cada P seguida de QRS, mas com PR longo.',
        eixo: 'Normal.', intervalos: 'PR >200 ms, constante.', morfologia: 'Sem outras alterações.',
        criterios: ['PR > 200 ms', 'Relação 1:1 P:QRS'],
        ddx: ['BAV 2º grau (aqui não há P bloqueada)'],
        armadilhas: ['Isolado costuma ser benigno.'],
        conduta: ['Assintomático: observar.'], ref: '—'
      }
    },
    {
      id: 'mobitz1', name: 'BAV 2º grau Mobitz I (Wenckebach)', category: 'Distúrbios de condução', level: 3,
      rhythm: 'mobitz1', atrialRate: 78, cycleLen: 4, urgency: 'media',
      tags: ['PR variável', 'batimento bloqueado', 'onda P presente'],
      quick: { dx: 'BAV 2º grau Mobitz I', findings: ['PR aumenta progressivamente até P bloqueada', 'RR encurta antes da pausa'], urgency: 'media' },
      teach: {
        qualidade: 'Adequada.', freq: 'Ventricular < atrial.', ritmo: 'Alongamento progressivo do PR até um P não conduzir; ciclo reinicia.',
        eixo: 'Normal.', intervalos: 'PR crescente; QRS estreito.', morfologia: 'Agrupamento de batimentos.',
        criterios: ['PR progressivamente maior', 'P bloqueada', 'Pausa < 2 RR'],
        ddx: ['Mobitz II (PR fixo antes da queda)'],
        armadilhas: ['Geralmente supra-Hissiano/benigno; melhora com atropina.'],
        conduta: ['Assintomático: observar.', 'Sintomático: atropina.'], ref: '—'
      }
    },
    {
      id: 'mobitz2', name: 'BAV 2º grau Mobitz II', category: 'Distúrbios de condução', level: 3,
      rhythm: 'mobitz2', atrialRate: 80, ratio: 3, urgency: 'alta',
      tags: ['PR fixo', 'batimento bloqueado', 'risco de BAVT'],
      quick: { dx: 'BAV 2º grau Mobitz II', findings: ['PR fixo com P subitamente bloqueada', 'Risco de progredir para BAVT'], urgency: 'alta' },
      teach: {
        qualidade: 'Adequada.', freq: 'Ventricular < atrial.', ritmo: 'PR constante; falha súbita de condução (P sem QRS).',
        eixo: 'Normal.', intervalos: 'PR fixo; QRS pode ser largo (bloqueio infra-Hissiano).', morfologia: 'Queda súbita.',
        criterios: ['PR fixo', 'P bloqueada sem alongamento prévio'],
        ddx: ['Mobitz I (PR crescente)'],
        armadilhas: ['Infra-Hissiano → risco de BAVT/assistolia. Não confiar em atropina.'],
        conduta: ['Marca-passo (transcutâneo/transvenoso → definitivo).'], ref: 'AHA Bradicardia.'
      }
    },
    {
      id: 'cavt', name: 'BAV total (3º grau)', category: 'Distúrbios de condução', level: 3,
      rhythm: 'cavt', atrialRate: 88, rate: 38, urgency: 'critica',
      tags: ['dissociação AV', 'bradicardia', 'QRS largo', 'emergência'],
      quick: { dx: 'BAV total (BAVT)', findings: ['Dissociação AV completa', 'P e QRS independentes', 'Escape lento'], urgency: 'critica' },
      teach: {
        qualidade: 'Adequada.', freq: 'Atrial normal, ventricular ~30–45 (escape).', ritmo: 'P regulares e QRS regulares, porém dissociados.',
        eixo: '—.', intervalos: 'PR "variável" (sem relação real).', morfologia: 'Escape juncional (estreito) ou ventricular (largo).',
        criterios: ['Dissociação AV completa', 'Ritmo de escape independente'],
        ddx: ['Dissociação AV isorrítmica', 'BAV avançado'],
        armadilhas: ['Não é o mesmo que "PR longo" — as ondas P marcham independentes dos QRS.'],
        conduta: ['Marca-passo (transcutâneo de imediato se instável → definitivo). Atropina costuma falhar em escape ventricular.'], ref: 'AHA Bradicardia.'
      }
    },
    {
      id: 'rbbb', name: 'Bloqueio de ramo direito', category: 'Distúrbios de condução', level: 2,
      rate: 72, rhythm: 'sinus', rrJitter: 0.02, urgency: 'baixa',
      shape(lead, a) {
        a.width = 1.55;
        if (/V1|V2/.test(lead)) { a.r = 0.35; a.s = -0.5; a.rprime = 0.9; a.t = -0.25; a.tCenter = 0.34; }
        if (/I\b|V6|aVL/.test(lead)) { a.extraS = -0.35; a.s = -0.2; }
      },
      tags: ['QRS largo', 'rSR\' em V1', 'onda P presente'],
      quick: { dx: 'Bloqueio completo de ramo direito', findings: ['QRS ≥120 ms', 'rSR\' ("orelhas de coelho") em V1', 'S empastada em DI/V6'], urgency: 'baixa' },
      teach: {
        qualidade: 'Adequada.', freq: 'Normal.', ritmo: 'Sinusal.', eixo: 'Geralmente normal.',
        intervalos: 'QRS ≥120 ms.', morfologia: 'rSR\' em V1-V2; S larga em DI, V5-V6; T discordante em V1-V3.',
        criterios: ['QRS ≥120 ms', 'rSR\' em V1', 'S empastada lateral'],
        ddx: ['BRD incompleto (QRS 110–120 ms)', 'Padrão de Brugada (avaliar V1-V2 elevadas)'],
        armadilhas: ['BRD não impede a leitura de isquemia (ao contrário do BRE).'],
        conduta: ['Isolado: sem tratamento específico; contextualizar (novo BRD + dor torácica pode indicar isquemia/TEP).'], ref: '—'
      }
    },
    {
      id: 'lbbb', name: 'Bloqueio de ramo esquerdo', category: 'Distúrbios de condução', level: 2,
      rate: 74, rhythm: 'sinus', rrJitter: 0.02, urgency: 'media',
      shape(lead, a) {
        a.width = 1.7; a.q = 0;
        if (/V1|V2|III/.test(lead)) { a.r = 0.05; a.s = -1.5; a.t = 0.35; a.st = 0.12; a.tCenter = 0.36; }
        if (/I\b|V5|V6|aVL/.test(lead)) { a.r = 1.3; a.s = 0; a.t = -0.35; a.st = -0.1; a.tCenter = 0.36; }
      },
      tags: ['QRS largo', 'discordância ST-T', 'onda P presente'],
      quick: { dx: 'Bloqueio completo de ramo esquerdo', findings: ['QRS ≥120 ms', 'R larga/entalhada em DI, V5-V6; QS em V1', 'ST-T discordante'], urgency: 'media' },
      teach: {
        qualidade: 'Adequada.', freq: 'Normal.', ritmo: 'Sinusal.', eixo: 'Frequente desvio à esquerda.',
        intervalos: 'QRS ≥120 ms.', morfologia: 'R monofásica larga e entalhada em DI/V5/V6; QS ou rS profundo em V1; discordância apropriada de ST-T.',
        criterios: ['QRS ≥120 ms', 'Ausência de q em DI/V6', 'ST-T discordante'],
        ddx: ['Ritmo de marca-passo (espícula precede QRS)', 'IAM com BRE'],
        armadilhas: ['BRE mascara isquemia → usar critérios de Sgarbossa (concordância de ST, ou discordância desproporcional).'],
        conduta: ['Novo BRE + dor torácica: aplicar Sgarbossa; tratar como possível IAM.'], ref: 'Sgarbossa.'
      }
    },
    {
      id: 'stemi_inf', name: 'IAM com supra — parede inferior', category: 'Isquemia e infarto', level: 3,
      rate: 58, rhythm: 'sinus', rrJitter: 0.02, urgency: 'critica',
      shape(lead, a) {
        if (/II|III|aVF/.test(lead)) { a.st = 0.32; a.t = Math.max(a.t, 0.35); a.tCenter = 0.31; }
        if (/I\b|aVL/.test(lead)) { a.st = -0.16; } // recíproca
      },
      tags: ['supra de ST', 'parede inferior', 'emergência', 'oclusão coronária'],
      quick: { dx: 'IAM com supra de ST inferior (DII, DIII, aVF)', findings: ['Supra de ST em DII/DIII/aVF', 'Infra recíproca em DI/aVL', 'Bradicardia frequente'], urgency: 'critica' },
      teach: {
        qualidade: 'Adequada.', freq: 'Bradicardia comum (comprometimento do nó / reflexo vagal).',
        ritmo: 'Sinusal (atenção a BAV associado).', eixo: '—.', intervalos: '—.',
        morfologia: 'Supra de ST côncavo→convexo em DII, DIII, aVF; infra recíproca em DI/aVL.',
        criterios: ['Supra ST ≥1 mm em ≥2 derivações contíguas inferiores', 'Recíproca em DI/aVL'],
        ddx: ['Pericardite (supra difuso, sem recíproca)', 'Repolarização precoce'],
        armadilhas: ['SEMPRE pedir V3R-V4R (infarto de VD) e V7-V9 (posterior) — DIII > DII e infra V1-V3 sugerem VD/posterior.', 'Infarto de VD: evitar nitrato/depletores de volume.'],
        conduta: ['Ativar reperfusão (angioplastia primária x trombólise conforme tempo).', 'AAS + 2º antiplaquetário, anticoagulação; cuidado com hipotensão no VD.'], ref: 'Diretriz SCA.'
      }
    },
    {
      id: 'stemi_ant', name: 'IAM com supra — parede anterior', category: 'Isquemia e infarto', level: 3,
      rate: 96, rhythm: 'sinus', rrJitter: 0.02, urgency: 'critica',
      shape(lead, a) {
        if (/V1|V2|V3|V4/.test(lead)) { a.st = 0.38; a.t = Math.max(a.t, 0.5); a.tCenter = 0.30; }
        if (/II|III|aVF/.test(lead)) { a.st = -0.10; } // recíproca discreta
      },
      tags: ['supra de ST', 'parede anterior', 'emergência', 'oclusão da DA'],
      quick: { dx: 'IAM com supra de ST anterior (V1–V4)', findings: ['Supra de ST em precordiais V1–V4', 'Ondas T hiperagudas', 'Oclusão da descendente anterior'], urgency: 'critica' },
      teach: {
        qualidade: 'Adequada.', freq: 'Taquicardia pode indicar disfunção de VE.', ritmo: 'Sinusal.',
        eixo: '—.', intervalos: '—.', morfologia: 'Supra de ST e T hiperagudas em precordiais; perda de progressão de R.',
        criterios: ['Supra ST em ≥2 precordiais contíguas', 'T hiperagudas / De Winter como equivalente'],
        ddx: ['Repolarização precoce', 'Aneurisma de VE (supra persistente + Q)', 'BRE'],
        armadilhas: ['Padrão de De Winter (infra ascendente + T apiculada em V1-V6) = oclusão proximal da DA — equivalente de STEMI.', 'Wellens (T bifásica/invertida em V2-V3) = estenose crítica da DA, alto risco.'],
        conduta: ['Reperfusão imediata; antiagregação e anticoagulação.'], ref: 'Diretriz SCA.'
      }
    },
    {
      id: 'hyperk', name: 'Hipercalemia', category: 'Eletrólitos e fármacos', level: 3,
      rate: 70, rhythm: 'sinus', pMul: 0.25, rrJitter: 0.02, urgency: 'alta',
      shape(lead, a) {
        a.t = (a.t >= 0 ? 1 : 1) * Math.sign(a.t || 1) * Math.max(Math.abs(a.t) * 2.4, 0.6);
        a.tSigma = 0.032; a.tCenter = 0.28; a.width = 1.3;
      },
      tags: ['onda T apiculada', 'QRS alargado', 'P achatada', 'emergência'],
      quick: { dx: 'Hipercalemia', findings: ['Ondas T altas, apiculadas e de base estreita', 'P achatada, PR longo', 'QRS alargado (grave)'], urgency: 'alta' },
      teach: {
        qualidade: 'Adequada.', freq: 'Normal ou bradicardia.', ritmo: 'Sinusal, com P progressivamente apagada.',
        eixo: '—.', intervalos: 'QRS alarga conforme piora; PR longo.', morfologia: 'T apiculada e simétrica → alargamento do QRS → onda sinusoidal (pré-parada).',
        criterios: ['T apiculada estreita', 'Achatamento de P', 'Alargamento de QRS'],
        ddx: ['IAM (T hiperaguda é mais larga e assimétrica)', 'Repolarização precoce'],
        armadilhas: ['Padrão sinusoidal é pré-parada — emergência absoluta.'],
        conduta: ['Gluconato de cálcio (estabiliza membrana) + insulina/glicose, beta-2, e remoção do potássio.'], ref: '—'
      }
    },
    {
      id: 'pericarditis', name: 'Pericardite aguda', category: 'Pericárdio/pulmão/sistêmico', level: 3,
      rate: 96, rhythm: 'sinus', rrJitter: 0.02, urgency: 'media',
      shape(lead, a) {
        if (!/aVR|V1/.test(lead)) { a.st = 0.14; }
        if (/aVR/.test(lead)) { a.st = -0.1; }
      },
      tags: ['supra de ST difuso', 'PR deprimido', 'côncavo'],
      quick: { dx: 'Pericardite aguda', findings: ['Supra de ST difuso e côncavo', 'Depressão de PR', 'Sem distribuição coronária / sem recíproca'], urgency: 'media' },
      teach: {
        qualidade: 'Adequada.', freq: 'Taquicardia sinusal comum.', ritmo: 'Sinusal.',
        eixo: 'Normal.', intervalos: 'PR deprimido (elevado em aVR).', morfologia: 'Supra de ST côncavo difuso, sem imagem em espelho.',
        criterios: ['Supra difuso côncavo', 'Depressão de PR', 'Evolução em estágios'],
        ddx: ['IAM (supra localizado + recíproca)', 'Repolarização precoce (sem evolução/depressão de PR)'],
        armadilhas: ['A ausência de recíprocas e a difusão do supra ajudam a separar de IAM.'],
        conduta: ['AINE + colchicina; investigar etiologia e derrame/tamponamento.'], ref: '—'
      }
    },
    {
      id: 'early_repol', name: 'Repolarização precoce', category: 'Variantes normais', level: 2,
      rate: 62, rhythm: 'sinus', rrJitter: 0.03, urgency: 'baixa',
      shape(lead, a) {
        if (/V2|V3|V4|II|aVF/.test(lead)) { a.st = 0.14; a.t = Math.max(a.t, 0.5); }
      },
      tags: ['ponto J elevado', 'variante normal', 'supra côncavo'],
      quick: { dx: 'Repolarização precoce (variante)', findings: ['Elevação do ponto J com entalhe', 'Supra côncavo, T ampla', 'Jovem assintomático'], urgency: 'baixa' },
      teach: {
        qualidade: 'Adequada.', freq: 'Bradicardia leve.', ritmo: 'Sinusal.', eixo: 'Normal.',
        intervalos: 'Normais.', morfologia: 'Entalhe/empastamento do ponto J, supra côncavo, T alta e concordante.',
        criterios: ['Entalhe J', 'Supra côncavo', 'Estável ao longo do tempo'],
        ddx: ['IAM', 'Pericardite'],
        armadilhas: ['Diagnóstico de exclusão — na dúvida com dor torácica, tratar como isquemia até seriar ECG/troponina.'],
        conduta: ['Nenhuma se benigna; algumas formas inferolaterais têm relevância arrítmica (contexto).'], ref: '—'
      }
    },
    {
      id: 'wpw', name: 'Pré-excitação (WPW)', category: 'Pré-excitação e canalopatias', level: 3,
      rate: 72, rhythm: 'sinus', pr: 0.10, rrJitter: 0.02, urgency: 'media',
      shape(lead, a) { a.delta = (a.r >= 0 ? 0.22 : -0.18); a.width = 1.35; },
      tags: ['PR curto', 'onda delta', 'QRS alargado'],
      quick: { dx: 'Padrão de Wolff-Parkinson-White', findings: ['PR curto (<120 ms)', 'Onda delta (empastamento inicial do QRS)', 'QRS alargado'], urgency: 'media' },
      teach: {
        qualidade: 'Adequada.', freq: 'Normal.', ritmo: 'Sinusal com pré-excitação.', eixo: 'Variável conforme via.',
        intervalos: 'PR < 120 ms, QRS alargado à custa da delta.', morfologia: 'Onda delta; alterações secundárias de ST-T.',
        criterios: ['PR curto', 'Onda delta', 'QRS largo'],
        ddx: ['BRE/BRD', 'Isquemia (pseudo-Q por delta negativa)'],
        armadilhas: ['FA em WPW: cuidado — bloqueadores do nó AV podem acelerar a via acessória (usar cardioversão/procainamida).'],
        conduta: ['Assintomático: acompanhamento.', 'Taquiarritmia: conforme mecanismo; encaminhar para estudo eletrofisiológico/ablação.'], ref: '—'
      }
    },
    {
      id: 'pe_s1q3t3', name: 'TEP — sobrecarga aguda de VD (S1Q3T3)', category: 'Pericárdio/pulmão/sistêmico', level: 4,
      rate: 112, rhythm: 'sinus', rrJitter: 0.02, urgency: 'alta',
      shape(lead, a) {
        if (/I\b/.test(lead)) { a.s = -0.6; }
        if (/III/.test(lead)) { a.q = -0.18; a.t = -0.2; a.tCenter = 0.32; }
        if (/V1|V2|V3/.test(lead)) { a.t = -0.25; a.tCenter = 0.32; }
      },
      tags: ['taquicardia', 'S1Q3T3', 'sobrecarga de VD', 'T invertida V1-V3'],
      quick: { dx: 'Padrão sugestivo de TEP', findings: ['Taquicardia sinusal (mais comum)', 'S1Q3T3', 'T invertida em V1–V3 (sobrecarga de VD)'], urgency: 'alta' },
      teach: {
        qualidade: 'Adequada.', freq: 'Taquicardia sinusal.', ritmo: 'Sinusal (FA pode ocorrer).', eixo: 'Desvio à direita.',
        intervalos: '—.', morfologia: 'S em DI, Q e T invertida em DIII (S1Q3T3), T invertida precordial direita, às vezes BRD novo.',
        criterios: ['Sinais de sobrecarga aguda de VD', 'T invertida V1-V3'],
        ddx: ['SCA', 'Sobrecarga crônica de VD'],
        armadilhas: ['ECG normal NÃO exclui TEP; a taquicardia sinusal é o achado mais frequente.'],
        conduta: ['Estratificar risco (instabilidade → trombólise), anticoagulação, confirmar com angio-TC.'], ref: '—'
      }
    },
    {
      id: 'lvh', name: 'Hipertrofia ventricular esquerda', category: 'Sobrecargas', level: 2,
      rate: 70, rhythm: 'sinus', rrJitter: 0.02, urgency: 'baixa',
      shape(lead, a) {
        if (/V1|V2/.test(lead)) a.s *= 1.5;
        if (/V5|V6/.test(lead)) { a.r *= 1.4; a.st = -0.1; a.t = -0.25; a.tCenter = 0.34; } // strain
        if (/I\b|aVL/.test(lead)) { a.r *= 1.3; a.t = Math.min(a.t, -0.12); }
      },
      tags: ['alta voltagem', 'strain', 'sobrecarga de VE'],
      quick: { dx: 'Hipertrofia ventricular esquerda', findings: ['Voltagem aumentada (Sokolow-Lyon)', 'Padrão de strain (infra ST + T invertida em V5-V6/DI/aVL)'], urgency: 'baixa' },
      teach: {
        qualidade: 'Adequada.', freq: 'Normal.', ritmo: 'Sinusal.', eixo: 'Frequente desvio à esquerda.',
        intervalos: '—.', morfologia: 'Alta voltagem + strain lateral.',
        criterios: ['Sokolow-Lyon (S V1 + R V5/V6 ≥ 35 mm)', 'Cornell', 'Romhilt-Estes'],
        ddx: ['Alta voltagem do jovem magro (sem strain)', 'BRE'],
        armadilhas: ['ECG sugere, mas confirmação de hipertrofia é ecocardiográfica.', 'Strain pode simular/ mascarar isquemia.'],
        conduta: ['Investigar causa (HAS, valvopatia); ecocardiograma.'], ref: '—'
      }
    },
    {
      id: 'low_voltage', name: 'Baixa voltagem', category: 'Pericárdio/pulmão/sistêmico', level: 2,
      rate: 92, rhythm: 'sinus', rrJitter: 0.02, urgency: 'media',
      shape(lead, a) { a.r *= 0.4; a.s *= 0.4; a.t *= 0.5; a.p *= 0.6; },
      tags: ['baixa voltagem', 'QRS pequeno'],
      quick: { dx: 'Baixa voltagem generalizada', findings: ['QRS < 5 mm nos membros / < 10 mm nas precordiais', 'Considerar derrame, obesidade, DPOC, amiloidose'], urgency: 'media' },
      teach: {
        qualidade: 'Excluir calibração incorreta.', freq: 'Taquicardia possível (tamponamento).', ritmo: 'Sinusal.',
        eixo: '—.', intervalos: '—.', morfologia: 'Amplitudes reduzidas de forma difusa; buscar alternância elétrica (tamponamento).',
        criterios: ['QRS < 5 mm (membros) e/ou < 10 mm (precordiais)'],
        ddx: ['Erro de calibração', 'Derrame pericárdico/pleural', 'DPOC/obesidade', 'Amiloidose'],
        armadilhas: ['Baixa voltagem + taquicardia + alternância elétrica = pensar em tamponamento.'],
        conduta: ['Contextualizar; ecocardiograma se suspeita de derrame/tamponamento.'], ref: '—'
      }
    },
  ];

  const CONDITION_MAP = Object.fromEntries(CONDITIONS.map((c) => [c.id, c]));
  const CATEGORIES = [...new Set(CONDITIONS.map((c) => c.category))];

  // Grupos de confundíveis para gerar distratores realistas no quiz
  const CONFUSABLES = {
    sinus_tachy: ['flutter', 'svt', 'afib'],
    flutter: ['sinus_tachy', 'svt', 'afib'],
    svt: ['flutter', 'vt', 'sinus_tachy'],
    afib: ['flutter', 'sinus_tachy', 'pvc'],
    vt: ['svt', 'torsades', 'vf'],
    vf: ['vt', 'torsades'],
    torsades: ['vt', 'vf'],
    stemi_inf: ['pericarditis', 'early_repol', 'stemi_ant'],
    stemi_ant: ['early_repol', 'pericarditis', 'hyperk'],
    pericarditis: ['stemi_inf', 'early_repol', 'stemi_ant'],
    early_repol: ['pericarditis', 'stemi_ant', 'stemi_inf'],
    hyperk: ['stemi_ant', 'stemi_inf', 'early_repol'],
    lbbb: ['rbbb', 'wpw', 'vt'],
    rbbb: ['lbbb', 'wpw'],
    wpw: ['rbbb', 'lbbb', 'vt'],
    mobitz1: ['mobitz2', 'avb1', 'cavt'],
    mobitz2: ['mobitz1', 'cavt', 'avb1'],
    cavt: ['mobitz2', 'sinus_brady', 'mobitz1'],
    avb1: ['mobitz1', 'sinus_normal'],
    lvh: ['lbbb', 'sinus_normal'],
    pe_s1q3t3: ['sinus_tachy', 'rbbb', 'stemi_inf'],
    low_voltage: ['pericarditis', 'sinus_tachy'],
    sinus_brady: ['cavt', 'sinus_normal'],
    sinus_normal: ['sinus_brady', 'avb1', 'sinus_tachy'],
    pvc: ['afib', 'vt', 'sinus_normal'],
  };

  // ---------------------------------------------------------------------------
  // 3. MÉTODO SISTEMÁTICO (checklist obrigatório)
  // ---------------------------------------------------------------------------
  const METHOD_STEPS = [
    ['Contexto', 'Identificação do paciente e cenário clínico.'],
    ['Qualidade técnica', 'Artefatos, linha de base, tremor, mau contato.'],
    ['Velocidade e calibração', '25 mm/s e 10 mm/mV? Marca de calibração de 10 mm.'],
    ['Frequência cardíaca', 'Regra dos 300 (1500 quadradinhos) ou contagem em 6 s.'],
    ['Regularidade', 'RR regular, regularmente irregular ou irregularmente irregular?'],
    ['Origem do ritmo', 'Sinusal? Atrial? Juncional? Ventricular?'],
    ['Onda P', 'Presente? Morfologia (+ DII, − aVR)? Relação com QRS.'],
    ['Intervalo PR', '120–200 ms? Fixo, variável, longo, curto?'],
    ['QRS', 'Largura (<120 ms?), morfologia, voltagem.'],
    ['Eixo elétrico', 'DI e aVF: normal, desviado à esquerda/direita/extremo.'],
    ['Progressão de R', 'Transição precordial (V3–V4).'],
    ['Ondas Q', 'Patológicas (> 40 ms ou > 25% do R)?'],
    ['Segmento ST', 'Elevação/depressão; côncavo x convexo; recíprocas.'],
    ['Onda T', 'Simetria, apiculamento, inversão, hiperaguda.'],
    ['QT/QTc', 'Bazett/Fridericia; QT longo/curto?'],
    ['Onda U', 'Presente (hipoK)?'],
    ['Comparação', 'Confrontar com ECG anterior, quando houver.'],
    ['Síntese', 'Diagnóstico eletrocardiográfico integrado.'],
    ['Gravidade/conduta', 'Urgência e conduta imediata.'],
  ];

  const CONFIDENCE = [
    { id: 'nao_sabia', label: 'Não sabia', grade: 0 },
    { id: 'duvida', label: 'Reconheci com dúvida', grade: 3 },
    { id: 'raciocinio', label: 'Acertei por raciocínio', grade: 4 },
    { id: 'seguranca', label: 'Reconheci com segurança', grade: 5 },
    { id: 'chute', label: 'Acertei no chute', grade: 2 },
  ];

  // ---------------------------------------------------------------------------
  // 4. SRS + estado
  // ---------------------------------------------------------------------------
  function defaultState() {
    return {
      ui: { sub: 'inicio', bankCat: 'all', bankId: null, quizMode: null, viewer: null, lesson: null },
      srs: {},        // por condição: { reps, ease, dueISO, correct, attempts, times:[], confusion:{}, highConfWrong }
      daily: { day: null, ecgOfDay: null },
      trilha: { done: {}, current: null }, // progresso da trilha de estudo
      log: [],        // histórico de tentativas
      seenIntro: false,
    };
  }
  function ensureSrs(st, id) {
    if (!st.srs[id]) st.srs[id] = { reps: 0, ease: 2.3, dueISO: todayISO(), correct: 0, attempts: 0, times: [], confusion: {}, highConfWrong: 0 };
    return st.srs[id];
  }
  function scheduleNext(rec, grade, correct) {
    // SM-2 simplificado, calibrado por confiança
    if (!correct || grade < 3) {
      rec.reps = 0;
      rec.dueISO = addDaysISO(grade <= 1 ? 0 : 1); // erro perigoso (alta confiança) revisa hoje
    } else {
      rec.reps += 1;
      rec.ease = clamp(rec.ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)), 1.3, 3.0);
      const interval = rec.reps === 1 ? 1 : rec.reps === 2 ? 4 : Math.round((rec.prevInterval || 4) * rec.ease);
      rec.prevInterval = interval;
      rec.dueISO = addDaysISO(interval);
    }
  }
  function dueList(st) {
    const t = todayISO();
    return CONDITIONS.filter((c) => { const r = st.srs[c.id]; return r && r.attempts > 0 && r.dueISO <= t; });
  }
  function weakest(st) {
    let worst = null, worstAcc = 2;
    CONDITIONS.forEach((c) => {
      const r = st.srs[c.id];
      if (r && r.attempts >= 2) { const acc = r.correct / r.attempts; if (acc < worstAcc) { worstAcc = acc; worst = c; } }
    });
    return worst;
  }
  function pickEcgOfDay(st) {
    const day = todayISO();
    if (st.daily.day === day && st.daily.ecgOfDay && CONDITION_MAP[st.daily.ecgOfDay]) return CONDITION_MAP[st.daily.ecgOfDay];
    // pseudo-aleatório estável por dia
    let h = 0; for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0;
    const c = CONDITIONS[h % CONDITIONS.length];
    st.daily = { day, ecgOfDay: c.id };
    return c;
  }

  // ---------------------------------------------------------------------------
  // 4b. CICLO CARDÍACO — identificação ao clicar no traçado
  //     Mapeia um instante do traçado para a onda/segmento e a fase mecânica
  //     (sístole atrial, sístole ventricular, diástole).
  // ---------------------------------------------------------------------------
  const CYCLE = {
    P:  { wave: 'Onda P', electrical: 'Despolarização atrial', mechanical: 'Sístole atrial — os átrios se contraem e terminam de encher os ventrículos ("chute atrial").', phase: 'Sístole atrial', color: '#7b5cff' },
    PR: { wave: 'Segmento PR', electrical: 'Condução pelo nó AV (atraso fisiológico)', mechanical: 'Transição: os átrios já contraíram; o estímulo está "esperando" no nó AV antes de ativar os ventrículos.', phase: 'Transição', color: '#00a6a6' },
    QRS: { wave: 'Complexo QRS', electrical: 'Despolarização ventricular', mechanical: 'Início da sístole ventricular — contração isovolumétrica; logo em seguida os ventrículos ejetam o sangue.', phase: 'Sístole ventricular', color: '#e0483b' },
    ST: { wave: 'Segmento ST', electrical: 'Ventrículos totalmente despolarizados (platô do potencial de ação)', mechanical: 'Sístole ventricular — fase de ejeção: o sangue está sendo bombeado para a aorta e a artéria pulmonar.', phase: 'Sístole ventricular', color: '#e0733b' },
    T:  { wave: 'Onda T', electrical: 'Repolarização ventricular', mechanical: 'Início da diástole ventricular — os ventrículos relaxam e começam a se encher de novo.', phase: 'Diástole', color: '#2f9e44' },
    TP: { wave: 'Segmento TP (linha de base)', electrical: 'Coração eletricamente em repouso', mechanical: 'Diástole — enchimento ventricular passivo; o coração descansa até o próximo batimento.', phase: 'Diástole', color: '#4c6ef5' },
    FIB: { wave: 'Linha de base fibrilatória', electrical: 'Atividade atrial caótica (fibrilação)', mechanical: 'Não há sístole atrial organizada; os ventrículos batem de forma irregular.', phase: 'Sem sístole atrial', color: '#9c36b5' },
    FLUT: { wave: 'Ondas F (flutter)', electrical: 'Circuito de reentrada atrial (~300/min)', mechanical: 'Átrios "tremulam" em dente-de-serra; apenas parte dos estímulos passa para os ventrículos.', phase: 'Flutter atrial', color: '#9c36b5' },
  };

  // Retorna a fase do ciclo no instante t, usando o cronograma de batimentos.
  function phaseAt(t, beats, cond) {
    // 1) Perto de uma onda P?
    for (const p of beats.pWaves) {
      if (Math.abs(t - p.t) < 0.055) return CYCLE.P;
    }
    // 2) Dentro de um complexo QRS-T?
    let host = null, rel = 0;
    for (const c of beats.complexes) {
      const r = t - c.t;
      if (r >= -0.03 && r < 0.42) { host = c; rel = r; break; }
    }
    if (host) {
      if (rel < 0.10) return CYCLE.QRS;
      if (rel < 0.24) return CYCLE.ST;
      if (rel < 0.40) return CYCLE.T;
    }
    // 3) Linha de base
    if (beats.baseline && beats.baseline.type === 'afib') return CYCLE.FIB;
    if (beats.baseline && beats.baseline.type === 'flutter') return CYCLE.FLUT;
    // 4) Entre uma P e o próximo QRS → segmento PR; senão → TP (diástole)
    for (const p of beats.pWaves) {
      if (t > p.t && t - p.t < 0.22) return CYCLE.PR;
    }
    return CYCLE.TP;
  }

  // ---------------------------------------------------------------------------
  // 4c. TRILHA DE ESTUDO — do leigo ao avançado, na ordem certa
  //     Cada lição tem didática em camadas (base → aprofundar), traçado de
  //     demonstração e prática opcional.
  // ---------------------------------------------------------------------------
  const LEVEL_LABEL = { leigo: 'Do zero', basico: 'Básico', intermediario: 'Intermediário', avancado: 'Avançado' };
  const TRILHA = [
    {
      module: '1 · Fundamentos (comece aqui)', level: 'leigo',
      lessons: [
        {
          id: 't1', title: 'O que é o ECG, sem susto', level: 'leigo',
          base: 'O coração é uma bomba, e cada batida começa com um pequeno "choque" elétrico que ele mesmo gera. O eletrocardiograma (ECG) é só um gráfico dessa eletricidade ao longo do tempo — como um sismógrafo capta um tremor. Ele NÃO mostra entupimento diretamente, nem "dá o diagnóstico sozinho": mostra o sinal elétrico, e a partir dele a gente interpreta.',
          deep: 'Os eletrodos na pele captam a diferença de potencial gerada pela despolarização e repolarização das células cardíacas. Cada par de eletrodos forma uma "derivação" — um ponto de vista diferente do mesmo coração. Por isso o ECG padrão tem 12 derivações: 12 câmeras olhando o coração de ângulos distintos.',
          demo: 'sinus_normal'
        },
        {
          id: 't2', title: 'O papel: quadradinhos, tempo e voltagem', level: 'leigo',
          base: 'O ECG é impresso num papel quadriculado que anda a uma velocidade fixa. Como a velocidade é conhecida, a distância no papel vira tempo, e a altura vira voltagem (força do sinal). É isso que permite medir tudo.',
          deep: 'Padrão: 25 mm/s e 10 mm/mV. Então 1 quadradinho (1 mm) = 0,04 s na horizontal e 0,1 mV na vertical. 1 quadradão (5 mm) = 0,20 s. A marca de calibração no início do traçado (um "degrau" de 10 mm) confirma o ganho. Use a régua digital do simulador para praticar essas medidas.',
          demo: 'sinus_normal', measure: true
        },
        {
          id: 't3', title: 'As três ondas: P, QRS e T', level: 'leigo',
          base: 'Cada batida desenha três coisas: uma ondinha (P), um pico alto (QRS) e outra ondinha (T). A P é os átrios "acordando", o QRS é os ventrículos (a parte forte da bomba) "acordando", e a T é o coração "recarregando" para a próxima batida.',
          deep: 'P = despolarização atrial. QRS = despolarização ventricular (é alto porque a massa muscular ventricular é grande). T = repolarização ventricular. A repolarização atrial fica escondida dentro do QRS. Clique no traçado no modo "Explorar ondas" para ver cada uma nomeada.',
          demo: 'sinus_normal', explore: true
        },
        {
          id: 't4', title: 'Sístole e diástole no traçado', level: 'leigo',
          base: 'Sístole = contração (aperta e ejeta o sangue). Diástole = relaxamento (enche de sangue). Dá para "ver" isso no ECG: logo após a P os átrios contraem; durante o QRS-ST os ventrículos contraem e ejetam; na onda T e depois dela o coração relaxa e enche.',
          deep: 'P → sístole atrial. QRS → começo da sístole ventricular (contração isovolumétrica). Segmento ST → ejeção. Onda T → início da diástole ventricular. Segmento TP (a linha reta entre batidas) → diástole plena, enchimento. Abra "Animar" para ver o traçado correndo com a fase marcada em tempo real.',
          demo: 'sinus_normal', explore: true, animate: true
        },
        {
          id: 't5', title: 'As 12 derivações: as câmeras do coração', level: 'basico',
          base: 'Cada derivação enxerga o coração de um ângulo. As das pernas/braços (DI, DII, DIII, aVR, aVL, aVF) olham no plano vertical; as do peito (V1 a V6) olham no plano horizontal, do lado direito ao esquerdo.',
          deep: 'Inferior: DII, DIII, aVF. Lateral: DI, aVL, V5, V6. Anterosseptal: V1–V4. aVR olha "de dentro/de cima" e por isso é quase tudo negativo no normal. Saber qual derivação vê qual parede é o que permite localizar um infarto.',
          demo: 'sinus_normal'
        },
      ]
    },
    {
      module: '2 · Leitura sistemática', level: 'basico',
      lessons: [
        {
          id: 't6', title: 'Frequência cardíaca', level: 'basico',
          base: 'Frequência é quantas batidas por minuto. O jeito rápido: conte os quadradões entre duas batidas (dois QRS) e divida 300 por esse número.',
          deep: 'Regra dos 300: 300 ÷ (nº de quadradões entre RR). Alternativa para ritmos irregulares: conte os QRS em 6 segundos (30 quadradões) e multiplique por 10. Normal: 60–100 bpm. <60 bradicardia, >100 taquicardia.',
          demo: 'sinus_normal', measure: true
        },
        {
          id: 't7', title: 'Ritmo e regularidade', level: 'basico',
          base: 'Antes de nomear qualquer coisa: as batidas são regulares (espaçadas igualzinho) ou irregulares? E vêm de onde — do "marca-passo natural" (nó sinusal) ou de outro lugar?',
          deep: 'Ritmo sinusal = P positiva em DII antes de cada QRS, com FC 60–100 e RR regular. Irregularmente irregular sem P = pense em fibrilação atrial. Compare o traçado normal com a FA no modo Explorar para sentir a diferença.',
          demo: 'sinus_normal'
        },
        {
          id: 't8', title: 'O método dos 19 passos', level: 'basico',
          base: 'Interpretar ECG bem é seguir SEMPRE a mesma ordem, sem pular etapas e sem "chutar" o diagnóstico de cara. Isso é o que mais aumenta o acerto na literatura.',
          deep: 'Contexto → qualidade → calibração → frequência → regularidade → ritmo → P → PR → QRS → eixo → progressão de R → Q → ST → T → QT → U → comparação → síntese → conduta. Veja a lista completa na aba Método e aplique-a em cada traçado do Banco.',
          demo: 'sinus_normal', gotoMethod: true
        },
      ]
    },
    {
      module: '3 · Reconhecendo o anormal', level: 'intermediario',
      lessons: [
        {
          id: 't9', title: 'Bradi e taquicardia sinusais', level: 'intermediario',
          base: 'Mesmo ritmo normal (sinusal), só que mais lento (bradi) ou mais rápido (taqui). Quase sempre é uma resposta do corpo a algo — não um problema do coração em si.',
          deep: 'Taquicardia sinusal: procure a causa (dor, febre, hipovolemia, TEP, anemia, hipertireoidismo). Bradicardia: fisiológica em atletas, ou por fármacos/isquemia/BAV. Trate a causa, não só o número.',
          demo: 'sinus_tachy', quiz: ['sinus_brady', 'sinus_tachy', 'sinus_normal']
        },
        {
          id: 't10', title: 'Fibrilação e flutter atrial', level: 'intermediario',
          base: 'Duas arritmias atriais muito comuns. Na fibrilação, os átrios "tremem" de forma caótica e o pulso fica totalmente irregular. No flutter, há um circuito organizado que faz ondas em "dente-de-serra".',
          deep: 'FA: sem onda P, RR irregularmente irregular, linha de base fibrilatória. Flutter: ondas F ~300/min; com condução 2:1 a FC fica ~150 (fixa!). FC exatamente ~150 → sempre pense em flutter 2:1. Use Explorar para ver as ondas F.',
          demo: 'flutter', explore: true, quiz: ['afib', 'flutter', 'sinus_tachy', 'svt']
        },
        {
          id: 't11', title: 'Bloqueios AV', level: 'intermediario',
          base: 'É quando o "sinal" tem dificuldade de passar dos átrios para os ventrículos. Vai do leve (só um atraso) até o total (átrio e ventrículo batendo independentes).',
          deep: '1º grau: PR longo e fixo, todo P conduz. Mobitz I: PR aumenta até uma P bloquear. Mobitz II: PR fixo e uma P "cai" de repente (perigoso). BAVT: dissociação AV completa, escape lento. Mobitz II e BAVT costumam precisar de marca-passo.',
          demo: 'mobitz1', quiz: ['avb1', 'mobitz1', 'mobitz2', 'cavt']
        },
        {
          id: 't12', title: 'Bloqueios de ramo (BRD e BRE)', level: 'intermediario',
          base: 'Quando um dos "cabos" que levam o estímulo aos ventrículos está interrompido, o QRS fica largo e com forma característica.',
          deep: 'BRD: rSR\' ("orelhas de coelho") em V1, S larga em DI/V6. BRE: R larga e entalhada em DI/V5/V6, QS em V1, ST-T discordante. Importante: o BRE atrapalha a leitura de isquemia (use Sgarbossa).',
          demo: 'rbbb', quiz: ['rbbb', 'lbbb', 'wpw']
        },
      ]
    },
    {
      module: '4 · Emergências que não podem passar', level: 'avancado',
      lessons: [
        {
          id: 't13', title: 'Isquemia e IAM com supra de ST', level: 'avancado',
          base: 'O achado mais crítico: quando uma artéria entope, a área do coração sofre e o segmento ST "sobe" nas derivações que olham aquela parede. É corrida contra o tempo.',
          deep: 'Supra de ST ≥1 mm em ≥2 derivações contíguas. Inferior (DII, DIII, aVF) → peça V3R-V4R (VD) e V7-V9 (posterior). Anterior (V1–V4) → oclusão da DA. Procure recíprocas (espelho). Padrões-equivalentes: De Winter, Wellens. Conduta: reperfusão imediata.',
          demo: 'stemi_inf', explore: true, quiz: ['stemi_inf', 'stemi_ant', 'pericarditis', 'early_repol']
        },
        {
          id: 't14', title: 'Taquicardias de QRS largo (TV)', level: 'avancado',
          base: 'Batimentos largos e rápidos. Em adulto, até prova em contrário, trate como taquicardia ventricular (TV) — a mais perigosa.',
          deep: 'TV: regular, QRS largo, dissociação AV, batimentos de captura/fusão, concordância precordial. Diferencie de TSV com aberrância e de pré-excitação. Instável → cardioversão; sem pulso → desfibrilação.',
          demo: 'vt', quiz: ['vt', 'svt', 'torsades', 'afib']
        },
        {
          id: 't15', title: 'Ritmos de parada', level: 'avancado',
          base: 'Os ritmos da parada cardíaca. Dois são "chocáveis" (FV e TV sem pulso) — o choque salva. Outros dois não (assistolia e AESP).',
          deep: 'FV: ondulações caóticas sem QRS → desfibrilar já. TV sem pulso → desfibrilar. Torsades → magnésio. Sempre RCP de alta qualidade. Siga os algoritmos vigentes da AHA.',
          demo: 'vf', quiz: ['vf', 'vt', 'torsades']
        },
        {
          id: 't16', title: 'Hipercalemia (o grande imitador)', level: 'avancado',
          base: 'Potássio alto muda o ECG e pode matar rápido. Começa com ondas T altas e pontudas e pode terminar num traçado "sinusoidal" de pré-parada.',
          deep: 'T apiculada e estreita → achatamento da P → alargamento do QRS → onda sinusoidal. Conduta: gluconato de cálcio (estabiliza a membrana) + insulina/glicose + remover o potássio.',
          demo: 'hyperk', explore: true, quiz: ['hyperk', 'stemi_ant', 'early_repol']
        },
      ]
    },
    {
      module: '5 · Aprofundando (armadilhas e diferenciais)', level: 'avancado',
      lessons: [
        {
          id: 't17', title: 'Pericardite × repolarização precoce × IAM', level: 'avancado',
          base: 'Três causas de "ST elevado" que se confundem. Saber diferenciar evita tanto perder um infarto quanto tratar demais um quadro benigno.',
          deep: 'Pericardite: supra difuso e côncavo, depressão de PR, SEM recíproca. Repolarização precoce: entalhe do ponto J, estável, jovem. IAM: supra localizado numa parede + recíproca. Na dúvida com dor torácica → trate como isquemia e seria ECG/troponina.',
          demo: 'pericarditis', quiz: ['pericarditis', 'early_repol', 'stemi_inf', 'stemi_ant']
        },
        {
          id: 't18', title: 'Pré-excitação (WPW) e TEP', level: 'avancado',
          base: 'Dois padrões que aparecem em prova e no plantão. WPW tem um "atalho" elétrico (onda delta). O TEP costuma dar taquicardia e sinais de sobrecarga do coração direito.',
          deep: 'WPW: PR curto + onda delta + QRS largo (cuidado com FA pré-excitada). TEP: taquicardia sinusal é o mais comum; S1Q3T3 e T invertida em V1–V3 sugerem sobrecarga aguda de VD. ECG normal não exclui TEP.',
          demo: 'wpw', quiz: ['wpw', 'pe_s1q3t3', 'rbbb', 'lbbb']
        },
        {
          id: 't19', title: 'Sobrecargas e baixa voltagem', level: 'avancado',
          base: 'O ECG sugere quando uma câmara está "grande" (hipertrofia) ou quando algo abafa o sinal (derrame, obesidade). Sugere — a confirmação costuma ser o ecocardiograma.',
          deep: 'HVE: alta voltagem (Sokolow-Lyon) + strain lateral. Baixa voltagem: QRS pequeno difuso → derrame/obesidade/DPOC/amiloidose; com taquicardia e alternância elétrica, pense em tamponamento.',
          demo: 'lvh', quiz: ['lvh', 'low_voltage', 'lbbb']
        },
      ]
    },
  ];
  const TRILHA_LESSONS = TRILHA.flatMap((m) => m.lessons);

  // ---------------------------------------------------------------------------
  // 5. UI
  // ---------------------------------------------------------------------------
  let BRIDGE = null;
  function st() { return BRIDGE.getState().ecg; }
  function save() { BRIDGE.save(); }
  function root() { return document.getElementById('ecg'); }

  const SUBS = [
    ['inicio', 'Início'],
    ['trilha', 'Trilha'],
    ['metodo', 'Método'],
    ['banco', 'Banco'],
    ['treino', 'Treino'],
    ['revisao', 'Revisão'],
    ['desempenho', 'Desempenho'],
  ];

  function injectStyles() {
    if (document.getElementById('ecg-sim-styles')) return;
    const style = document.createElement('style');
    style.id = 'ecg-sim-styles';
    // Usa as variáveis de tema do planner (--panel/--ink/--muted/--line/--soft-blue),
    // que já respondem a body.dark. Evita cores claras fixas que sumiam no modo escuro.
    style.textContent = `
    #ecg .ecg-wrap{display:flex;flex-direction:column;gap:16px;color:var(--ink)}
    .ecg-subnav{display:flex;flex-wrap:wrap;gap:6px}
    .ecg-subnav button{border:1px solid var(--line,#dce1ec);background:var(--panel,#fff);color:var(--ink);border-radius:999px;padding:7px 14px;font-size:13px;font-weight:600;cursor:pointer;transition:.15s}
    .ecg-subnav button.active{background:var(--accent,#1261f5);color:#fff;border-color:transparent}
    .ecg-canvas-shell{border:1px solid var(--line,#dce1ec);border-radius:12px;overflow:hidden;background:var(--panel,#fff7f6)}
    .ecg-canvas-shell canvas{display:block;width:100%}
    .ecg-grid-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
    .ecg-card{border:1px solid var(--line,#dce1ec);border-radius:14px;padding:14px;background:var(--panel,#fff);color:var(--ink);display:flex;flex-direction:column;gap:8px}
    .ecg-card h3{margin:0;font-size:15px;color:var(--ink)}
    .ecg-badge{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px}
    .ecg-badge.baixa{background:#1a7f37;color:#fff}
    .ecg-badge.media{background:#b7791f;color:#fff}
    .ecg-badge.alta{background:#c05621;color:#fff}
    .ecg-badge.critica{background:#c1121f;color:#fff}
    .ecg-tags{display:flex;flex-wrap:wrap;gap:4px}
    .ecg-tag{font-size:10.5px;background:var(--soft-blue,#eef1f7);border-radius:6px;padding:2px 6px;color:var(--muted,#5b6472)}
    .ecg-btn{border:none;border-radius:10px;padding:9px 14px;font-weight:600;font-size:13px;cursor:pointer;background:var(--accent,#1261f5);color:#fff}
    .ecg-btn.ghost{background:transparent;border:1px solid var(--line,#dce1ec);color:var(--ink)}
    .ecg-btn.wide{width:100%}
    .ecg-opts{display:grid;gap:8px}
    .ecg-opt{text-align:left;border:1px solid var(--line,#dce1ec);background:var(--panel,#fff);border-radius:10px;padding:11px 14px;font-size:14px;cursor:pointer;color:var(--ink);transition:.12s}
    .ecg-opt:hover{border-color:var(--accent,#1261f5)}
    .ecg-opt.correct{background:var(--soft-green,#e6f4ea);border-color:#1a7f37;color:var(--ink)}
    .ecg-opt.wrong{background:var(--soft-red,#ffe1e1);border-color:#c1121f;color:var(--ink)}
    .ecg-opt:disabled{cursor:default}
    .ecg-hero{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
    .ecg-stat{border:1px solid var(--line,#dce1ec);border-radius:14px;padding:14px;background:var(--panel,#fff);color:var(--ink)}
    .ecg-stat b{font-size:24px;display:block;color:var(--ink)}
    .ecg-muted{color:var(--muted,#5b6472);font-size:13px}
    .ecg-method-step{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--line,#eef1f7)}
    .ecg-method-step .n{flex:0 0 28px;height:28px;border-radius:50%;background:var(--accent,#1261f5);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px}
    .ecg-teach{color:var(--ink)}
    .ecg-teach h4{margin:14px 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted,#5b6472)}
    .ecg-teach ul{margin:4px 0;padding-left:18px}
    .ecg-conf{display:flex;flex-wrap:wrap;gap:8px}
    .ecg-toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;color:var(--ink)}
    .ecg-caliper-read{font-variant-numeric:tabular-nums;font-weight:700;color:var(--ink)}
    .ecg-select{border:1px solid var(--line,#dce1ec);border-radius:10px;padding:8px 10px;background:var(--panel,#fff);color:var(--ink);font-size:13px}
    .ecg-table{width:100%;border-collapse:collapse;font-size:13px;color:var(--ink)}
    .ecg-table th,.ecg-table td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line,#eef1f7)}
    .ecg-table th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted,#5b6472)}
    `;
    document.head.appendChild(style);
  }

  function badge(u) { return `<span class="ecg-badge ${u}">${U[u] || u}</span>`; }
  function tagRow(tags) { return `<div class="ecg-tags">${(tags || []).map((t) => `<span class="ecg-tag">${esc(t)}</span>`).join('')}</div>`; }

  function subnav() {
    const cur = st().ui.sub;
    return `<div class="ecg-subnav">${SUBS.map(([id, label]) => `<button data-ecg-sub="${id}" class="${cur === id ? 'active' : ''}">${label}</button>`).join('')}</div>`;
  }

  function go(sub) { st().ui.sub = sub; save(); mountBody(); }

  // ---- Início ---------------------------------------------------------------
  function viewInicio() {
    const S = st();
    const eod = pickEcgOfDay(S);
    const due = dueList(S);
    const weak = weakest(S);
    const totalAtt = S.log.length;
    const totalCorrect = S.log.filter((l) => l.correct).length;
    const acc = totalAtt ? Math.round((totalCorrect / totalAtt) * 100) : 0;
    save();
    return `
    <div class="ecg-hero">
      <div class="ecg-stat"><span class="ecg-muted">Precisão total</span><b>${acc}%</b><span class="ecg-muted">${totalAtt} interpretações</span></div>
      <div class="ecg-stat"><span class="ecg-muted">Revisões pendentes</span><b>${due.length}</b><span class="ecg-muted">${due.length ? 'Abra a aba Revisão' : 'Em dia'}</span></div>
      <div class="ecg-stat"><span class="ecg-muted">Tema mais fraco</span><b style="font-size:16px">${weak ? esc(weak.name) : '—'}</b><span class="ecg-muted">${weak ? 'Priorize no treino' : 'Sem dados ainda'}</span></div>
      <div class="ecg-stat"><span class="ecg-muted">Condições no banco</span><b>${CONDITIONS.length}</b><span class="ecg-muted">${CATEGORIES.length} categorias</span></div>
    </div>
    <div class="ecg-card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
        <h3>ECG do dia — ${esc(eod.name)} ${badge(eod.urgency)}</h3>
        <button class="ecg-btn ghost" data-ecg-open="${eod.id}">Ver interpretação</button>
      </div>
      <div class="ecg-canvas-shell"><canvas data-ecg-canvas="${eod.id}"></canvas></div>
      <p class="ecg-muted">Aplique o método sistemático antes de revelar o laudo.</p>
    </div>
    <div class="ecg-grid-cards">
      <div class="ecg-card"><h3>Treino rápido (5 min)</h3><p class="ecg-muted">Reconhecimento com traçados sorteados e correção em camadas.</p><button class="ecg-btn" data-ecg-start-quiz="mixed">Começar treino</button></div>
      <div class="ecg-card"><h3>Revisão adaptativa</h3><p class="ecg-muted">${due.length ? `${due.length} condição(ões) no ponto de revisão.` : 'Nada vencido — volte amanhã.'}</p><button class="ecg-btn ghost" data-ecg-sub-go="revisao">Abrir revisão</button></div>
      <div class="ecg-card"><h3>Método de leitura</h3><p class="ecg-muted">A sequência de 19 passos que o simulador cobra nos níveis iniciais.</p><button class="ecg-btn ghost" data-ecg-sub-go="metodo">Ver método</button></div>
    </div>`;
  }

  // ---- Método ---------------------------------------------------------------
  function viewMetodo() {
    return `
    <div class="ecg-card">
      <h3>Método universal de interpretação</h3>
      <p class="ecg-muted">Siga sempre a mesma sequência. Métodos sistemáticos têm o maior impacto educacional na interpretação de ECG.</p>
      <div>${METHOD_STEPS.map(([t, d], i) => `<div class="ecg-method-step"><div class="n">${i + 1}</div><div><b>${esc(t)}</b><div class="ecg-muted">${esc(d)}</div></div></div>`).join('')}</div>
    </div>
    <div class="ecg-card">
      <h3>Referência rápida de valores</h3>
      <table class="ecg-table">
        <tr><th>Parâmetro</th><th>Normal</th></tr>
        <tr><td>Frequência</td><td>60–100 bpm</td></tr>
        <tr><td>PR</td><td>120–200 ms (3–5 quadradinhos)</td></tr>
        <tr><td>QRS</td><td>&lt; 120 ms (&lt; 3 quadradinhos)</td></tr>
        <tr><td>QTc (Bazett)</td><td>♂ &lt; 450 ms · ♀ &lt; 460 ms</td></tr>
        <tr><td>Eixo</td><td>−30° a +90°</td></tr>
        <tr><td>Papel</td><td>1 mm = 0,04 s · 5 mm = 0,20 s · 10 mm = 1 mV</td></tr>
      </table>
    </div>`;
  }

  // ---- Banco ----------------------------------------------------------------
  function viewBanco() {
    const S = st();
    // (o detalhe da condição é roteado em bodyHtml conforme S.ui.viewer)
    const cat = S.ui.bankCat || 'all';
    const list = CONDITIONS.filter((c) => cat === 'all' || c.category === cat);
    const catOptions = ['all', ...CATEGORIES].map((c) => `<option value="${esc(c)}" ${cat === c ? 'selected' : ''}>${c === 'all' ? 'Todas as categorias' : esc(c)}</option>`).join('');
    return `
    <div class="ecg-toolbar"><select class="ecg-select" data-ecg-bankcat>${catOptions}</select><span class="ecg-muted">${list.length} condições</span></div>
    <div class="ecg-grid-cards">
      ${list.map((c) => {
      const r = S.srs[c.id];
      const acc = r && r.attempts ? Math.round((r.correct / r.attempts) * 100) + '%' : '—';
      return `<div class="ecg-card"><div style="display:flex;justify-content:space-between;gap:6px"><h3>${esc(c.name)}</h3>${badge(c.urgency)}</div>
        <span class="ecg-muted">${esc(c.category)} · precisão ${acc}</span>
        ${tagRow(c.tags)}
        <button class="ecg-btn ghost wide" data-ecg-open="${c.id}">Abrir traçado</button></div>`;
    }).join('')}
    </div>`;
  }

  function teachBlock(c) {
    const t = c.teach;
    const listOf = (arr) => `<ul>${(arr || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    return `
    <div class="ecg-teach">
      <h4>Resposta rápida</h4>
      <p><b>${esc(c.quick.dx)}</b> — urgência ${badge(c.quick.urgency)}</p>
      ${listOf(c.quick.findings)}
      <h4>Qualidade</h4><p>${esc(t.qualidade)}</p>
      <h4>Frequência</h4><p>${esc(t.freq)}</p>
      <h4>Ritmo</h4><p>${esc(t.ritmo)}</p>
      <h4>Eixo</h4><p>${esc(t.eixo)}</p>
      <h4>Intervalos</h4><p>${esc(t.intervalos)}</p>
      <h4>Morfologia / ST-T</h4><p>${esc(t.morfologia)}</p>
      <h4>Critérios</h4>${listOf(t.criterios)}
      <h4>Diagnósticos diferenciais</h4>${listOf(t.ddx)}
      <h4>Armadilhas</h4>${listOf(t.armadilhas)}
      <h4>Conduta inicial (educacional)</h4>${listOf(t.conduta)}
      <p class="ecg-muted" style="margin-top:10px">Referência: ${esc(t.ref || '—')} · Conteúdo educacional; condutas seguem algoritmos vigentes e não substituem avaliação clínica.</p>
    </div>`;
  }

  function viewerToolbar(c, active) {
    const b = (mode, label) => `<button class="ecg-btn ${active === mode ? '' : 'ghost'}" data-ecg-viewer="${mode}">${label}</button>`;
    return `<div class="ecg-toolbar">
      <button class="ecg-btn ghost" data-ecg-back="banco">← Voltar</button>
      <h3 style="margin:0">${esc(c.name)}</h3>${badge(c.urgency)}
      <span style="margin-left:auto"></span>
      ${b('trace', 'Traçado')}${b('explore', 'Explorar ondas')}${b('animate', 'Animar')}${b('measure', 'Régua')}
      <button class="ecg-btn ghost" data-ecg-regen="${c.id}">Nova variação</button>
    </div>`;
  }

  function viewCondition(c) {
    return `${viewerToolbar(c, 'trace')}
    <div class="ecg-canvas-shell"><canvas data-ecg-canvas="${c.id}"></canvas></div>
    <div class="ecg-card">${teachBlock(c)}</div>`;
  }

  // ---- Régua / compasso -----------------------------------------------------
  function viewMeasure(c) {
    return `${viewerToolbar(c, 'measure')}
    <p class="ecg-muted">Clique e arraste sobre a tira para medir. Horizontal → intervalo (ms) e frequência; vertical incluída no cálculo de amplitude.</p>
    <div class="ecg-toolbar">
      <span class="ecg-caliper-read" data-ecg-read>Δt: — ms · FC: — bpm · Δ: — mV</span>
      <button class="ecg-btn ghost" data-ecg-caliper-clear>Limpar</button>
    </div>
    <div class="ecg-canvas-shell" style="position:relative">
      <canvas data-ecg-strip="${c.id}"></canvas>
      <canvas data-ecg-overlay style="position:absolute;inset:0;width:100%"></canvas>
    </div>
    <p class="ecg-muted">1 quadradinho = 0,04 s (40 ms) e 0,1 mV. 1 quadradão = 0,20 s. FC ≈ 60 / (Δt em s).</p>`;
  }

  // ---- Explorar ondas (clicar para identificar) -----------------------------
  function viewExplore(c) {
    return `${viewerToolbar(c, 'explore')}
    <p class="ecg-muted">Clique em qualquer ponto do traçado para identificar a onda/segmento e o que está acontecendo no coração naquele instante (sístole ou diástole).</p>
    <div class="ecg-canvas-shell" style="position:relative">
      <canvas data-ecg-explore="${c.id}"></canvas>
      <canvas data-ecg-explore-ov style="position:absolute;inset:0;width:100%;cursor:crosshair"></canvas>
    </div>
    <div class="ecg-card" data-ecg-explore-info>
      <p class="ecg-muted">👆 Toque no traçado para começar. Dica: clique na ondinha antes do pico (P), no pico alto (QRS) e na onda arredondada depois (T).</p>
    </div>`;
  }

  // ---- Animar (traçado em tempo real, tipo monitor) -------------------------
  function viewAnimate(c) {
    return `${viewerToolbar(c, 'animate')}
    <p class="ecg-muted">O traçado corre em tempo real, como num monitor de beira de leito. Acompanhe a fase do ciclo cardíaco mudando a cada batida.</p>
    <div class="ecg-toolbar">
      <button class="ecg-btn" data-ecg-anim-toggle>⏸ Pausar</button>
      <label class="ecg-muted" style="display:flex;align-items:center;gap:6px">Velocidade
        <select class="ecg-select" data-ecg-anim-speed><option value="0.5">0,5×</option><option value="1" selected>1×</option><option value="2">2×</option></select>
      </label>
      <span class="ecg-anim-phase" data-ecg-anim-phase>—</span>
      <span class="ecg-muted" data-ecg-anim-hr></span>
    </div>
    <div class="ecg-canvas-shell"><canvas data-ecg-animate="${c.id}" style="background:#0c0f14"></canvas></div>
    <p class="ecg-muted">Verde = diástole (relaxa/enche) · Vermelho = sístole (contrai/ejeta). Derivação DII.</p>`;
  }

  // ---- Trilha de estudo -----------------------------------------------------
  function viewTrilha() {
    const S = st();
    const done = S.trilha.done || {};
    const total = TRILHA_LESSONS.length;
    const doneCount = TRILHA_LESSONS.filter((l) => done[l.id]).length;
    const pct = Math.round((doneCount / total) * 100);
    // primeira lição não concluída = "próxima"
    const next = TRILHA_LESSONS.find((l) => !done[l.id]) || TRILHA_LESSONS[0];
    let html = `
    <div class="ecg-card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <div><h3 style="margin:0">Sua trilha de ECG</h3><p class="ecg-muted" style="margin:4px 0 0">Do zero ao avançado, na ordem certa. ${doneCount}/${total} lições concluídas.</p></div>
        <button class="ecg-btn" data-ecg-lesson="${next.id}">${doneCount ? 'Continuar' : 'Começar'} →</button>
      </div>
      <div style="height:8px;border-radius:99px;background:var(--line);overflow:hidden;margin-top:12px"><div style="height:100%;width:${pct}%;background:var(--accent,#1261f5)"></div></div>
    </div>`;
    TRILHA.forEach((mod) => {
      const modDone = mod.lessons.filter((l) => done[l.id]).length;
      html += `<div class="ecg-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h3 style="margin:0;font-size:14px">${esc(mod.module)}</h3><span class="ecg-tag">${modDone}/${mod.lessons.length}</span></div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:6px">
        ${mod.lessons.map((l) => {
          const isDone = !!done[l.id];
          return `<button class="ecg-opt" data-ecg-lesson="${l.id}" style="display:flex;align-items:center;gap:10px">
            <span style="flex:0 0 22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:800;background:${isDone ? '#1a7f37' : 'var(--line)'};color:${isDone ? '#fff' : 'var(--muted)'}">${isDone ? '✓' : ''}</span>
            <span style="flex:1">${esc(l.title)}</span>
            <span class="ecg-tag">${LEVEL_LABEL[l.level]}</span></button>`;
        }).join('')}
        </div></div>`;
    });
    return html;
  }

  function viewLesson(lesson) {
    const S = st();
    const idx = TRILHA_LESSONS.findIndex((l) => l.id === lesson.id);
    const prev = TRILHA_LESSONS[idx - 1], nxt = TRILHA_LESSONS[idx + 1];
    const isDone = !!(S.trilha.done && S.trilha.done[lesson.id]);
    const demo = lesson.demo && CONDITION_MAP[lesson.demo];
    let actions = '';
    if (demo) {
      if (lesson.explore) actions += `<button class="ecg-btn ghost" data-ecg-open2="${demo.id}:explore">Explorar ondas neste traçado</button>`;
      if (lesson.animate) actions += `<button class="ecg-btn ghost" data-ecg-open2="${demo.id}:animate">Ver em movimento (animar)</button>`;
      if (lesson.measure) actions += `<button class="ecg-btn ghost" data-ecg-open2="${demo.id}:measure">Medir com a régua</button>`;
      actions += `<button class="ecg-btn ghost" data-ecg-open2="${demo.id}:trace">Abrir no banco</button>`;
    }
    if (lesson.gotoMethod) actions += `<button class="ecg-btn ghost" data-ecg-sub-go="metodo">Ver o método completo</button>`;
    const quiz = (lesson.quiz || []).filter((id) => CONDITION_MAP[id]);
    return `
    <div class="ecg-toolbar"><button class="ecg-btn ghost" data-ecg-sub-go="trilha">← Trilha</button>
      <h3 style="margin:0">${esc(lesson.title)}</h3><span class="ecg-tag">${LEVEL_LABEL[lesson.level]}</span></div>
    ${demo ? `<div class="ecg-canvas-shell"><canvas data-ecg-canvas="${demo.id}"></canvas></div>` : ''}
    <div class="ecg-card">
      <h4 style="margin:0 0 4px;text-transform:uppercase;font-size:12px;letter-spacing:.04em;color:var(--muted)">Para começar</h4>
      <p style="margin:0 0 12px">${esc(lesson.base)}</p>
      <h4 style="margin:0 0 4px;text-transform:uppercase;font-size:12px;letter-spacing:.04em;color:var(--muted)">Aprofundando</h4>
      <p style="margin:0">${esc(lesson.deep)}</p>
      ${actions ? `<div class="ecg-conf" style="margin-top:14px">${actions}</div>` : ''}
    </div>
    ${quiz.length ? `<div class="ecg-card"><h3 style="margin:0 0 6px;font-size:15px">Praticar agora</h3><p class="ecg-muted" style="margin:0 0 10px">Fixe com um treino rápido dos padrões desta lição.</p><button class="ecg-btn" data-ecg-lesson-quiz="${quiz.join(',')}">Treinar (${quiz.length})</button></div>` : ''}
    <div class="ecg-toolbar" style="margin-top:4px">
      ${prev ? `<button class="ecg-btn ghost" data-ecg-lesson="${prev.id}">← Anterior</button>` : ''}
      <button class="ecg-btn" data-ecg-lesson-done="${lesson.id}" style="margin-left:auto">${isDone ? '✓ Concluída' : 'Concluir'}${nxt ? ' e avançar →' : ''}</button>
    </div>`;
  }

  // ---- Treino / Revisão -----------------------------------------------------
  function startQuiz(mode, pool) {
    const S = st();
    S.ui.quizMode = mode;
    S.ui.sub = mode === 'revisao' ? 'revisao' : 'treino';
    S._quiz = { pool: pool.map((c) => c.id), i: 0, answered: false, picked: null, correct: false, startedAt: Date.now() };
    save();
    mountBody();
  }
  function currentQuizCond() {
    const q = st()._quiz;
    if (!q) return null;
    return CONDITION_MAP[q.pool[q.i]];
  }
  function quizOptions(c) {
    const conf = (CONFUSABLES[c.id] || []).filter((id) => CONDITION_MAP[id]);
    const opts = new Set([c.id]);
    conf.forEach((id) => { if (opts.size < 4) opts.add(id); });
    const others = CONDITIONS.map((x) => x.id).filter((id) => id !== c.id);
    while (opts.size < 4 && others.length) { const id = others.splice(Math.floor(Math.random() * others.length), 1)[0]; opts.add(id); }
    const arr = [...opts];
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  }
  function viewQuiz(kind) {
    const S = st();
    const q = S._quiz;
    if (!q || !q.pool.length) {
      const label = kind === 'revisao' ? 'revisão' : 'treino';
      return `<div class="ecg-card"><h3>Sem itens de ${label}</h3><p class="ecg-muted">${kind === 'revisao' ? 'Nenhuma condição vencida hoje. Faça treinos para alimentar a revisão espaçada.' : 'Escolha um modo abaixo.'}</p>
        <div class="ecg-conf">
          <button class="ecg-btn" data-ecg-start-quiz="mixed">Treino misto</button>
          <button class="ecg-btn ghost" data-ecg-start-quiz="emergency">Só emergências</button>
          <button class="ecg-btn ghost" data-ecg-start-quiz="weak">Focar meus pontos fracos</button>
        </div></div>`;
    }
    if (q.i >= q.pool.length) {
      const done = q._results || [];
      const ok = done.filter((r) => r).length;
      return `<div class="ecg-card"><h3>Sessão concluída</h3><p><b>${ok}/${done.length}</b> corretas.</p>
        <div class="ecg-conf"><button class="ecg-btn" data-ecg-start-quiz="mixed">Nova sessão</button><button class="ecg-btn ghost" data-ecg-sub-go="desempenho">Ver desempenho</button></div></div>`;
    }
    const c = currentQuizCond();
    if (!q._opts) q._opts = quizOptions(c);
    const opts = q._opts;
    const progress = `Questão ${q.i + 1}/${q.pool.length}`;
    let optsHtml;
    if (!q.answered) {
      optsHtml = opts.map((id) => `<button class="ecg-opt" data-ecg-answer="${id}">${esc(CONDITION_MAP[id].name)}</button>`).join('');
    } else {
      optsHtml = opts.map((id) => {
        let cls = '';
        if (id === c.id) cls = 'correct';
        else if (id === q.picked) cls = 'wrong';
        return `<button class="ecg-opt ${cls}" disabled>${esc(CONDITION_MAP[id].name)}</button>`;
      }).join('');
    }
    return `
    <div class="ecg-toolbar"><span class="ecg-muted">${progress}</span>${kind === 'revisao' ? '<span class="ecg-tag">revisão espaçada</span>' : ''}<button class="ecg-btn ghost" data-ecg-quiz-quit style="margin-left:auto">Encerrar</button></div>
    <h3>Qual é o diagnóstico principal?</h3>
    <div class="ecg-canvas-shell"><canvas data-ecg-canvas="${c.id}" data-ecg-seed="${q.i + 1}"></canvas></div>
    <div class="ecg-opts">${optsHtml}</div>
    ${q.answered ? `
      <div class="ecg-card">
        <p><b>${q.correct ? '✔ Correto' : '✗ Incorreto'}</b> — ${esc(c.quick.dx)} ${badge(c.quick.urgency)}</p>
        ${teachBlock(c)}
        <h4 style="margin-top:8px">Como você chegou nessa resposta?</h4>
        <div class="ecg-conf">${CONFIDENCE.map((cf) => `<button class="ecg-btn ghost" data-ecg-confidence="${cf.id}">${cf.label}</button>`).join('')}</div>
      </div>` : ''}`;
  }

  function answerQuiz(id) {
    const S = st();
    const q = S._quiz;
    if (!q || q.answered) return;
    const c = currentQuizCond();
    q.answered = true;
    q.picked = id;
    q.correct = id === c.id;
    q._elapsed = (Date.now() - q.startedAt) / 1000;
    save();
    mountBody();
  }
  function rateConfidence(confId) {
    const S = st();
    const q = S._quiz;
    if (!q || !q.answered) return;
    const c = currentQuizCond();
    const cf = CONFIDENCE.find((x) => x.id === confId) || CONFIDENCE[0];
    const rec = ensureSrs(S, c.id);
    rec.attempts += 1;
    if (q.correct) rec.correct += 1;
    rec.times.push(Math.round(q._elapsed || 0));
    if (rec.times.length > 20) rec.times.shift();
    if (!q.correct) { rec.confusion[q.picked] = (rec.confusion[q.picked] || 0) + 1; if (cf.grade >= 4) rec.highConfWrong += 1; }
    scheduleNext(rec, cf.grade, q.correct);
    S.log.push({ id: c.id, correct: q.correct, conf: confId, t: q._elapsed || 0, day: todayISO() });
    if (S.log.length > 500) S.log.shift();
    q._results = q._results || [];
    q._results.push(q.correct);
    q.i += 1; q.answered = false; q.picked = null; q._opts = null; q.startedAt = Date.now();
    save();
    mountBody();
  }

  // ---- Desempenho -----------------------------------------------------------
  function statusOf(acc, attempts) {
    if (attempts < 2) return ['—', ''];
    if (acc >= 0.85) return ['Dominado', 'baixa'];
    if (acc >= 0.6) return ['Revisar', 'media'];
    return ['Prioridade', 'alta'];
  }
  function viewDesempenho() {
    const S = st();
    const rows = CONDITIONS.map((c) => {
      const r = S.srs[c.id];
      if (!r || !r.attempts) return null;
      const acc = r.correct / r.attempts;
      const avg = r.times.length ? Math.round(r.times.reduce((a, b) => a + b, 0) / r.times.length) : 0;
      const [status, u] = statusOf(acc, r.attempts);
      return { c, acc, avg, status, u, attempts: r.attempts, highConfWrong: r.highConfWrong };
    }).filter(Boolean).sort((a, b) => a.acc - b.acc);

    // matriz de confusão (top confusões)
    const confusions = [];
    CONDITIONS.forEach((c) => {
      const r = S.srs[c.id];
      if (r && r.confusion) Object.entries(r.confusion).forEach(([wid, n]) => { if (CONDITION_MAP[wid]) confusions.push({ real: c.name, picked: CONDITION_MAP[wid].name, n }); });
    });
    confusions.sort((a, b) => b.n - a.n);

    const dangerous = rows.filter((x) => x.highConfWrong > 0);

    if (!rows.length) return `<div class="ecg-card"><h3>Sem dados ainda</h3><p class="ecg-muted">Faça alguns treinos para o simulador mapear seus pontos fortes e fracos por tema.</p><button class="ecg-btn" data-ecg-start-quiz="mixed">Começar treino</button></div>`;

    return `
    <div class="ecg-card"><h3>Desempenho por condição</h3>
      <table class="ecg-table"><tr><th>Tema</th><th>Precisão</th><th>Tempo médio</th><th>Situação</th></tr>
      ${rows.map((x) => `<tr><td>${esc(x.c.name)}</td><td>${Math.round(x.acc * 100)}% <span class="ecg-muted">(${x.attempts})</span></td><td>${x.avg}s</td><td>${x.status !== '—' ? badge(x.u) + ' ' + x.status : '—'}</td></tr>`).join('')}
      </table></div>
    ${dangerous.length ? `<div class="ecg-card"><h3>⚠ Erros com alta confiança</h3><p class="ecg-muted">Erro confiante é mais perigoso que erro com dúvida — priorizado na revisão.</p>
      <ul>${dangerous.map((x) => `<li>${esc(x.c.name)} — ${x.highConfWrong}x</li>`).join('')}</ul></div>` : ''}
    ${confusions.length ? `<div class="ecg-card"><h3>Matriz de confusão</h3><table class="ecg-table"><tr><th>Era</th><th>Você marcou</th><th>Vezes</th></tr>
      ${confusions.slice(0, 8).map((c) => `<tr><td>${esc(c.real)}</td><td>${esc(c.picked)}</td><td>${c.n}</td></tr>`).join('')}</table></div>` : ''}`;
  }

  // ---------------------------------------------------------------------------
  // Render de corpo + canvases
  // ---------------------------------------------------------------------------
  // Desenha assim que o canvas tiver largura. Não depende de requestAnimationFrame
  // (que fica pausado quando a aba está em segundo plano) — usa ResizeObserver.
  function drawWhenReady(cv, draw) {
    if (cv._ecgObserver) { cv._ecgObserver.disconnect(); cv._ecgObserver = null; }
    if (cv.clientWidth > 40) { draw(); return; }
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(() => {
        if (cv.clientWidth > 40) { ro.disconnect(); cv._ecgObserver = null; draw(); }
      });
      ro.observe(cv);
      cv._ecgObserver = ro;
    } else {
      let tries = 0;
      const poll = () => { if (cv.clientWidth > 40) draw(); else if (tries++ < 40) setTimeout(poll, 60); };
      setTimeout(poll, 60);
    }
  }
  function renderCanvases() {
    root().querySelectorAll('canvas[data-ecg-canvas]').forEach((cv) => {
      const cond = CONDITION_MAP[cv.dataset.ecgCanvas];
      if (!cond) return;
      const seed = parseInt(cv.dataset.ecgSeed || '1', 10);
      drawWhenReady(cv, () => renderECG(cv, cond, { seed }));
    });
    root().querySelectorAll('canvas[data-ecg-strip]').forEach((cv) => {
      const cond = CONDITION_MAP[cv.dataset.ecgStrip];
      if (!cond) return;
      drawWhenReady(cv, () => { renderECG(cv, cond, { mode: 'strip', height: 180, stripDur: 10 }); setupCalipers(cv); });
    });
    root().querySelectorAll('canvas[data-ecg-explore]').forEach((cv) => {
      const cond = CONDITION_MAP[cv.dataset.ecgExplore];
      if (!cond) return;
      drawWhenReady(cv, () => { renderECG(cv, cond, { mode: 'strip', height: 200, stripDur: 8 }); setupExplore(cv, cond); });
    });
    root().querySelectorAll('canvas[data-ecg-animate]').forEach((cv) => {
      const cond = CONDITION_MAP[cv.dataset.ecgAnimate];
      if (!cond) return;
      drawWhenReady(cv, () => startAnimation(cv, cond));
    });
  }

  function bodyHtml() {
    const S = st();
    const sub = S.ui.sub;
    // Lição da trilha aberta?
    if (sub === 'trilha' && S.ui.lesson) {
      const lesson = TRILHA_LESSONS.find((l) => l.id === S.ui.lesson);
      if (lesson) return viewLesson(lesson);
    }
    // Visualizador de condição (banco) com modo selecionado
    if (S.ui.bankId && CONDITION_MAP[S.ui.bankId] && (sub === 'banco')) {
      const c = CONDITION_MAP[S.ui.bankId];
      switch (S.ui.viewer) {
        case 'measure': return viewMeasure(c);
        case 'explore': return viewExplore(c);
        case 'animate': return viewAnimate(c);
        default: return viewCondition(c);
      }
    }
    switch (sub) {
      case 'inicio': return viewInicio();
      case 'trilha': return viewTrilha();
      case 'metodo': return viewMetodo();
      case 'banco': return viewBanco();
      case 'treino': return viewQuiz('treino');
      case 'revisao': return viewQuiz('revisao');
      case 'desempenho': return viewDesempenho();
      default: return viewInicio();
    }
  }

  function mountBody() {
    stopAnimation(); // encerra qualquer animação da tela anterior
    const el = root();
    if (!el) return;
    el.querySelector('.ecg-body').innerHTML = bodyHtml();
    el.querySelectorAll('.ecg-subnav button').forEach((b) => b.classList.toggle('active', b.dataset.ecgSub === st().ui.sub));
    wireBody();
    renderCanvases();
  }

  // ---------------------------------------------------------------------------
  // Régua / calipers
  // ---------------------------------------------------------------------------
  function setupCalipers(stripCanvas) {
    const overlay = root().querySelector('canvas[data-ecg-overlay]');
    if (!overlay || !stripCanvas._ecgMap) return;
    const map = stripCanvas._ecgMap;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = stripCanvas.clientWidth, h = stripCanvas.clientHeight;
    overlay.width = w * dpr; overlay.height = h * dpr; overlay.style.height = h + 'px';
    const ctx = overlay.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let dragging = false, ax = 0, ay = 0, bx = 0, by = 0;
    const readEl = root().querySelector('[data-ecg-read]');
    const pxToTime = (px) => (px - map.x0) / (MM_PER_S * map.pxmm);
    const pxToMv = (py) => (map.yBase - py) / (MM_PER_MV * map.pxmm);
    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = '#1261f5'; ctx.lineWidth = 1.4; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(ax, 0); ctx.lineTo(ax, h); ctx.moveTo(bx, 0); ctx.lineTo(bx, h); ctx.stroke();
      ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      const dt = Math.abs(pxToTime(bx) - pxToTime(ax));
      const dmv = Math.abs(pxToMv(by) - pxToMv(ay));
      const bpm = dt > 0.02 ? Math.round(60 / dt) : '—';
      if (readEl) readEl.textContent = `Δt: ${Math.round(dt * 1000)} ms · FC: ${bpm} bpm · Δ: ${dmv.toFixed(2)} mV`;
    }
    const pos = (e) => { const r = overlay.getBoundingClientRect(); const p = e.touches ? e.touches[0] : e; return [p.clientX - r.left, p.clientY - r.top]; };
    overlay.style.cursor = 'crosshair';
    overlay.onmousedown = overlay.ontouchstart = (e) => { e.preventDefault(); [ax, ay] = pos(e); [bx, by] = [ax, ay]; dragging = true; draw(); };
    overlay.onmousemove = overlay.ontouchmove = (e) => { if (!dragging) return; e.preventDefault(); [bx, by] = pos(e); draw(); };
    window.addEventListener('mouseup', () => (dragging = false));
    overlay.ontouchend = () => (dragging = false);
    const clearBtn = root().querySelector('[data-ecg-caliper-clear]');
    if (clearBtn) clearBtn.onclick = () => { ctx.clearRect(0, 0, w, h); if (readEl) readEl.textContent = 'Δt: — ms · FC: — bpm · Δ: — mV'; };
  }

  // ---------------------------------------------------------------------------
  // Explorar ondas — clique identifica onda/segmento + fase do ciclo
  // ---------------------------------------------------------------------------
  function setupExplore(stripCanvas, cond) {
    const overlay = root().querySelector('canvas[data-ecg-explore-ov]');
    const info = root().querySelector('[data-ecg-explore-info]');
    if (!overlay || !stripCanvas._ecgMap) return;
    const map = stripCanvas._ecgMap;
    const beats = buildBeats(cond, 11, 1);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = stripCanvas.clientWidth, h = stripCanvas.clientHeight;
    overlay.width = w * dpr; overlay.height = h * dpr; overlay.style.height = h + 'px';
    const ctx = overlay.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pxToTime = (px) => map.tStart + (px - map.x0) / (MM_PER_S * map.pxmm);
    const timeToPx = (t) => map.x0 + (t - map.tStart) * MM_PER_S * map.pxmm;
    function markAt(px) {
      const t = pxToTime(px);
      const ph = phaseAt(t, beats, cond);
      // faixa destacando a região da fase
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = ph.color + '33';
      ctx.fillRect(px - 14, 0, 28, h);
      ctx.strokeStyle = ph.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke();
      // rótulo
      ctx.fillStyle = ph.color; ctx.font = '700 12px system-ui';
      const lbl = ph.wave;
      const tw = ctx.measureText(lbl).width;
      let lx = clamp(px - tw / 2, 2, w - tw - 6);
      ctx.fillRect(lx - 4, 4, tw + 8, 18); ctx.fillStyle = '#fff'; ctx.fillText(lbl, lx, 17);
      if (info) {
        const isS = ph.phase.indexOf('Sístole') === 0;
        info.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span class="ecg-badge" style="background:${ph.color};color:#fff">${esc(ph.wave)}</span>
            <span class="ecg-badge" style="background:${isS ? '#c1121f' : '#1a7f37'};color:#fff">${esc(ph.phase)}</span>
          </div>
          <p style="margin:10px 0 4px"><b>Elétrica:</b> ${esc(ph.electrical)}.</p>
          <p style="margin:0"><b>No coração:</b> ${esc(ph.mechanical)}</p>`;
      }
    }
    const pos = (e) => { const r = overlay.getBoundingClientRect(); const p = e.touches ? e.touches[0] : e; return p.clientX - r.left; };
    overlay.onmousedown = overlay.ontouchstart = (e) => { e.preventDefault(); markAt(pos(e)); };
    overlay.onmousemove = (e) => { if (e.buttons === 1) markAt(pos(e)); };
  }

  // ---------------------------------------------------------------------------
  // Animar — traçado correndo em tempo real (tipo monitor de leito)
  // ---------------------------------------------------------------------------
  // Usa setInterval (não rAF): rAF é pausado pelo navegador quando a aba
  // perde o foco/fica oculta, o que travaria o "monitor" ao trocar de app.
  let ANIM = { timer: 0, running: false };
  function stopAnimation() {
    if (ANIM.timer) clearInterval(ANIM.timer);
    ANIM = { timer: 0, running: false };
  }
  function startAnimation(canvas, cond) {
    stopAnimation();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = canvas.clientWidth || 900;
    const h = 220;
    canvas.width = cssW * dpr; canvas.height = h * dpr; canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0c0f14'; ctx.fillRect(0, 0, cssW, h);
    const beats = buildBeats(cond, 300, 1); // cronograma longo
    const ampCache = {}; ampCache.II = getAmps(cond, 'II');
    const pxmm = Math.max(3, cssW / (MM_PER_S * 6)); // ~6 s visíveis
    const yBase = h / 2;
    const winDur = cssW / (MM_PER_S * pxmm); // segundos visíveis
    const phaseEl = root().querySelector('[data-ecg-anim-phase]');
    const hrEl = root().querySelector('[data-ecg-anim-hr]');
    const toggleBtn = root().querySelector('[data-ecg-anim-toggle]');
    const speedSel = root().querySelector('[data-ecg-anim-speed]');
    let speed = speedSel ? parseFloat(speedSel.value) : 1;
    if (speedSel) speedSel.onchange = () => { speed = parseFloat(speedSel.value); };
    ANIM.running = true;
    if (toggleBtn) toggleBtn.onclick = () => {
      ANIM.running = !ANIM.running;
      toggleBtn.textContent = ANIM.running ? '⏸ Pausar' : '▶ Retomar';
      if (ANIM.running) startWall = performance.now() - (lastT / speed) * 1000; // não pula tempo ao retomar
    };
    // grade leve (em toda a tela ou só numa faixa)
    function grid(x0, x1) {
      x0 = x0 || 0; x1 = x1 == null ? cssW : x1;
      ctx.strokeStyle = 'rgba(80,200,120,0.12)'; ctx.lineWidth = 1;
      for (let gx = Math.ceil(x0 / (pxmm * 5)) * pxmm * 5; gx <= x1; gx += pxmm * 5) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
      for (let gy = 0; gy <= h; gy += pxmm * 5) { ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x1, gy); ctx.stroke(); }
    }
    grid();
    let lastT = 0, startWall = performance.now(), prevX = -1, prevY = yBase;
    const OFF = 0.5; // desloca o início para não começar no meio de um batimento
    function loop() {
      if (!ANIM.running) return;
      let tNow = ((performance.now() - startWall) / 1000) * speed;
      // se a aba ficou muito tempo oculta/em segundo plano, não tenta "recuperar" tudo de uma vez
      if (tNow - lastT > 2) { startWall = performance.now() - (lastT / speed) * 1000; tNow = lastT + 2; }
      const step = 0.004;
      for (let t = lastT; t <= tNow; t += step) {
        const x = (t % winDur) * MM_PER_S * pxmm;
        const v = clamp(sampleLead('II', t + OFF, beats, cond, ampCache), -2, 2);
        const y = yBase - v * MM_PER_MV * pxmm;
        if (x < prevX) prevX = -1; // deu a volta → recomeça da esquerda sem traço atravessando
        // barra de varredura: apaga logo à frente e repõe a grade ali
        ctx.fillStyle = '#0c0f14'; ctx.fillRect(x + 1, 0, 12, h); grid(x + 1, x + 13);
        if (prevX < 0) { ctx.beginPath(); ctx.moveTo(x, y); }
        else { ctx.strokeStyle = '#37d67a'; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.lineTo(x, y); ctx.stroke(); }
        prevX = x; prevY = y;
      }
      lastT = tNow;
      const ph = phaseAt(tNow + OFF, beats, cond);
      if (phaseEl) {
        const isS = ph.phase.indexOf('Sístole') === 0;
        phaseEl.textContent = ph.phase;
        phaseEl.style.color = isS ? '#ff5a5a' : '#37d67a';
        phaseEl.style.fontWeight = '800';
      }
      if (hrEl) hrEl.textContent = cond.rate ? `≈ ${cond.rate} bpm` : '';
    }
    loop();
    ANIM.timer = setInterval(loop, 40); // ~25 fps; setInterval não é pausado em aba oculta como o rAF
  }

  // ---------------------------------------------------------------------------
  // Eventos
  // ---------------------------------------------------------------------------
  function openCondition(id, viewer) {
    const S = st(); S.ui.sub = 'banco'; S.ui.bankId = id; S.ui.viewer = viewer || null; S.ui.lesson = null; save(); mountBody();
  }
  function wireBody() {
    const el = root();
    el.querySelectorAll('[data-ecg-sub]').forEach((b) => (b.onclick = () => { const S = st(); S.ui.viewer = null; S.ui.bankId = null; S.ui.lesson = null; S._quiz = null; go(b.dataset.ecgSub); }));
    el.querySelectorAll('[data-ecg-sub-go]').forEach((b) => (b.onclick = () => { const S = st(); S.ui.viewer = null; S.ui.bankId = null; S.ui.lesson = null; go(b.dataset.ecgSubGo); }));
    el.querySelectorAll('[data-ecg-open]').forEach((b) => (b.onclick = () => openCondition(b.dataset.ecgOpen, null)));
    // abrir condição num modo específico (usado pela trilha): "id:modo"
    el.querySelectorAll('[data-ecg-open2]').forEach((b) => (b.onclick = () => { const [id, mode] = b.dataset.ecgOpen2.split(':'); openCondition(id, mode === 'trace' ? null : mode); }));
    el.querySelectorAll('[data-ecg-back]').forEach((b) => (b.onclick = () => { const S = st(); S.ui.bankId = null; S.ui.viewer = null; save(); mountBody(); }));
    el.querySelectorAll('[data-ecg-viewer]').forEach((b) => (b.onclick = () => { const S = st(); S.ui.viewer = b.dataset.ecgViewer === 'trace' ? null : b.dataset.ecgViewer; save(); mountBody(); }));
    el.querySelectorAll('[data-ecg-bankcat]').forEach((sel) => (sel.onchange = () => { st().ui.bankCat = sel.value; st().ui.bankId = null; save(); mountBody(); }));
    el.querySelectorAll('[data-ecg-regen]').forEach((b) => (b.onclick = () => { const cv = el.querySelector(`canvas[data-ecg-canvas="${b.dataset.ecgRegen}"]`); if (cv) { cv.dataset.ecgSeed = String(Math.floor(Math.random() * 9999)); renderECG(cv, CONDITION_MAP[b.dataset.ecgRegen], { seed: parseInt(cv.dataset.ecgSeed, 10) }); } }));
    // Trilha
    el.querySelectorAll('[data-ecg-lesson]').forEach((b) => (b.onclick = () => { const S = st(); S.ui.sub = 'trilha'; S.ui.lesson = b.dataset.ecgLesson; S.ui.bankId = null; S.ui.viewer = null; save(); mountBody(); }));
    el.querySelectorAll('[data-ecg-lesson-done]').forEach((b) => (b.onclick = () => {
      const S = st(); const id = b.dataset.ecgLessonDone;
      S.trilha.done = S.trilha.done || {}; S.trilha.done[id] = true;
      const idx = TRILHA_LESSONS.findIndex((l) => l.id === id);
      const nxt = TRILHA_LESSONS[idx + 1];
      S.ui.lesson = nxt ? nxt.id : id; // avança
      if (!nxt) S.ui.lesson = null; // última → volta para a lista
      save(); mountBody();
    }));
    el.querySelectorAll('[data-ecg-lesson-quiz]').forEach((b) => (b.onclick = () => {
      const ids = b.dataset.ecgLessonQuiz.split(',').filter((id) => CONDITION_MAP[id]);
      startQuiz('trilha', shuffle(ids.map((id) => CONDITION_MAP[id])));
    }));
    el.querySelectorAll('[data-ecg-start-quiz]').forEach((b) => (b.onclick = () => {
      const mode = b.dataset.ecgStartQuiz;
      let pool;
      if (mode === 'emergency') pool = CONDITIONS.filter((c) => c.urgency === 'alta' || c.urgency === 'critica');
      else if (mode === 'weak') { const S = st(); pool = CONDITIONS.filter((c) => { const r = S.srs[c.id]; return r && r.attempts >= 2 && r.correct / r.attempts < 0.7; }); if (!pool.length) pool = CONDITIONS.slice(); }
      else pool = CONDITIONS.slice();
      pool = shuffle(pool).slice(0, 10);
      startQuiz(mode, pool);
    }));
    el.querySelectorAll('[data-ecg-answer]').forEach((b) => (b.onclick = () => answerQuiz(b.dataset.ecgAnswer)));
    el.querySelectorAll('[data-ecg-confidence]').forEach((b) => (b.onclick = () => rateConfidence(b.dataset.ecgConfidence)));
    el.querySelectorAll('[data-ecg-quiz-quit]').forEach((b) => (b.onclick = () => { const S = st(); S._quiz = null; save(); mountBody(); }));
  }
  function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // Entrada de revisão: ao abrir aba Revisão, montar quiz com itens vencidos
  function maybeAutoRevisao() {
    const S = st();
    if (S.ui.sub === 'revisao' && !S._quiz) {
      const due = dueList(S);
      if (due.length) startQuiz('revisao', shuffle(due).slice(0, 15));
    }
  }

  // ---------------------------------------------------------------------------
  // Montagem principal
  // ---------------------------------------------------------------------------
  function mount(container, bridge) {
    BRIDGE = bridge;
    injectStyles();
    const S = BRIDGE.getState();
    if (!S.ecg) S.ecg = defaultState();
    // migração defensiva
    const d = defaultState();
    S.ecg.ui = Object.assign({}, d.ui, S.ecg.ui);
    if (!S.ecg.srs) S.ecg.srs = {};
    if (!S.ecg.log) S.ecg.log = [];
    if (!S.ecg.daily) S.ecg.daily = d.daily;
    if (!S.ecg.trilha) S.ecg.trilha = d.trilha;
    if (!S.ecg.trilha.done) S.ecg.trilha.done = {};

    container.innerHTML = `<div class="ecg-wrap">
      <div class="section-title" style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div><span class="eyebrow">Cardiologia</span><h2 style="margin:0">Simulador de ECG</h2><p class="ecg-muted" style="margin:4px 0 0">Traçados gerados por síntese de forma de onda — funciona offline. Curso · reconhecimento · simulação · revisão adaptativa.</p></div>
      </div>
      ${subnav()}
      <div class="ecg-body"></div>
    </div>`;
    // subnav (fora do body para persistir estado ativo)
    container.querySelectorAll('.ecg-subnav button').forEach((b) => (b.onclick = () => { const s = st(); s.ui.viewer = null; s.ui.bankId = null; s.ui.lesson = null; s._quiz = null; go(b.dataset.ecgSub); }));
    maybeAutoRevisao();
    mountBody();
    // redesenhar canvases ao redimensionar
    if (!window.__ecgResizeHooked) {
      window.__ecgResizeHooked = true;
      let rt;
      window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (document.getElementById('ecg')?.classList.contains('active') || document.getElementById('ecg')?.offsetParent) renderCanvases(); }, 200); });
    }
    // redesenhar canvases quando o tema (body.dark) muda — a cor do papel/traçado segue o tema
    if (!window.__ecgThemeHooked && typeof MutationObserver === 'function') {
      window.__ecgThemeHooked = true;
      let lastDark = document.body.classList.contains('dark');
      new MutationObserver(() => {
        const nowDark = document.body.classList.contains('dark');
        if (nowDark !== lastDark) {
          lastDark = nowDark;
          const ecg = document.getElementById('ecg');
          if (ecg && (ecg.classList.contains('active') || ecg.offsetParent)) renderCanvases();
        }
      }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
  }

  window.EcgSim = { mount, defaultState, CONDITIONS };
})();
