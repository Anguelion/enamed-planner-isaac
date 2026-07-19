/* ============================================================================
 * SÓqueroMed — Radiografia  (Build 1 / Núcleo de ensino sintético · híbrido)
 * Módulo autossuficiente, 100% offline. Espelha a arquitetura do EcgSim.
 *
 * Estratégia (decidida com o usuário):
 *   • Núcleo SINTÉTICO agora: Fundamentos, Método e Sinais desenhados em SVG.
 *   • HÍBRIDO: o Visualizador e o esquema de Caso já aceitam imagem real
 *     (campo `src`) OU esquema SVG (campo `svg`) — basta plugar o banco depois.
 *
 * Seções:
 *   1. UTIL       — helpers
 *   2. XRAY SVG   — motor de esquemas radiográficos (tórax/abdome/osso)
 *   3. CONTEÚDO   — Fundamentos · Densidades · Projeções · Sinais · Casos
 *   4. SRS        — repetição espaçada calibrada por confiança + métricas
 *   5. UI         — Início · Fundamentos · Método · Sinais · Casos · Desempenho
 *
 * Integra no planner via window.RadioSim.mount(container, bridge).
 * bridge = { getState, save, escapeHtml, iconSvg }
 * ==========================================================================*/
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1. UTIL
  // ---------------------------------------------------------------------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const addDaysISO = (d) => { const t = new Date(); t.setDate(t.getDate() + Math.round(d)); return t.toISOString().slice(0, 10); };
  const esc = (s) => String(s ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const U = { baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica' };

  // ---------------------------------------------------------------------------
  // 2. XRAY SVG — motor de esquemas radiográficos
  //    Estética de radiografia: fundo preto (ar), osso branco, partes moles cinza.
  //    Toda figura tem uma camada .anno (anotações), alternável no visualizador.
  // ---------------------------------------------------------------------------
  function ribCage(cx, top, h, wide) {
    let out = '';
    for (let i = 0; i < 7; i++) {
      const y = top + i * (h / 7);
      const w = wide * (0.55 + i * 0.06);
      out += `<path d="M${cx - w} ${y} Q${cx - w * 0.4} ${y + 14} ${cx} ${y + 16}" fill="none" stroke="#cfd8e2" stroke-width="2.2" opacity=".55"/>`;
      out += `<path d="M${cx + w} ${y} Q${cx + w * 0.4} ${y + 14} ${cx} ${y + 16}" fill="none" stroke="#cfd8e2" stroke-width="2.2" opacity=".55"/>`;
    }
    return out;
  }
  function vessels(cx) {
    let out = '';
    const seed = [[-1, 130, 60], [1, 130, 60], [-1, 150, 44], [1, 150, 44]];
    seed.forEach(([s, y, len]) => {
      out += `<path d="M${cx + s * 34} ${y} q${s * 26} ${len * 0.4} ${s * 42} ${len}" fill="none" stroke="#8894a2" stroke-width="1.4" opacity=".5"/>`;
      out += `<path d="M${cx + s * 40} ${y + 12} q${s * 20} ${len * 0.3} ${s * 30} ${len * 0.7}" fill="none" stroke="#8894a2" stroke-width="1.1" opacity=".4"/>`;
    });
    return out;
  }
  // Base de tórax PA. `patho` = camada de doença; `anno` = anotações.
  function chestBase(patho, anno, opt = {}) {
    const cx = 160;
    const heartFill = opt.heartWide ? 'M160 150 C 132 150 108 168 105 208 C 103 236 120 252 160 254 Z'
      : 'M160 152 C 138 152 120 168 118 206 C 117 232 132 246 160 248 Z';
    return `<svg viewBox="0 0 320 340" class="radio-xray" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="320" height="340" fill="#05070a"/>
      <!-- partes moles / contorno torácico -->
      <path d="M40 70 C 40 40 120 26 160 26 C 200 26 280 40 280 70 L 292 300 C 250 328 70 328 28 300 Z" fill="#0d1116"/>
      <!-- campos pulmonares (ar = escuro) -->
      <path d="M150 60 C 96 58 66 108 62 190 C 60 240 84 274 148 276 L 150 60Z" fill="#070a0e"/>
      <path d="M170 60 C 224 58 254 108 258 190 C 260 240 236 274 172 276 L 170 60Z" fill="#070a0e"/>
      ${opt.hideVessels ? '' : vessels(cx)}
      <!-- coluna -->
      <rect x="152" y="40" width="16" height="248" fill="#252d38" opacity=".7"/>
      <!-- traqueia -->
      <rect x="153" y="44" width="14" height="70" fill="#070a0e" stroke="#2a333f" stroke-width="1"/>
      <!-- clavículas -->
      <path d="M70 74 Q 118 64 152 78" fill="none" stroke="#e8edf2" stroke-width="4" opacity=".8"/>
      <path d="M250 74 Q 202 64 168 78" fill="none" stroke="#e8edf2" stroke-width="4" opacity=".8"/>
      ${ribCage(cx, 92, 150, 96)}
      <!-- silhueta cardíaca -->
      <path d="${heartFill}" fill="#3c4652" opacity=".92"/>
      <path d="M160 150 C 186 150 206 170 206 208 C 206 234 190 248 160 250" fill="#3c4652" opacity=".92"/>
      <!-- arco aórtico + mediastino -->
      <path d="M150 120 Q 138 108 140 96" fill="none" stroke="#4a5560" stroke-width="8" opacity=".8"/>
      <!-- hemidiafragmas + seios costofrênicos -->
      <path d="M60 268 Q 110 244 150 266 L 150 288 L 58 292 Z" fill="#2c3540" opacity=".9"/>
      <path d="M170 266 Q 214 246 260 270 L 262 292 L 170 288 Z" fill="#2c3540" opacity=".9"/>
      <!-- bolha gástrica -->
      <ellipse cx="196" cy="286" rx="16" ry="9" fill="#05070a" stroke="#26303a" stroke-width="1"/>
      ${patho || ''}
      <g class="anno">${anno || ''}</g>
    </svg>`;
  }
  // Base de abdome (decúbito dorsal, AP).
  function abdBase(patho, anno) {
    return `<svg viewBox="0 0 320 340" class="radio-xray" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="340" fill="#05070a"/>
      <path d="M46 26 C 120 14 200 14 274 26 L 288 300 C 210 322 110 322 32 300 Z" fill="#0d1116"/>
      <!-- coluna lombar -->
      <rect x="150" y="30" width="20" height="230" rx="3" fill="#2a333f" opacity=".8"/>
      ${[0, 1, 2, 3, 4].map(i => `<rect x="148" y="${44 + i * 42}" width="24" height="30" rx="4" fill="#e8edf2" opacity=".18"/>`).join('')}
      <!-- psoas -->
      <path d="M150 70 L 118 250" stroke="#39434f" stroke-width="3" fill="none" opacity=".6"/>
      <path d="M170 70 L 202 250" stroke="#39434f" stroke-width="3" fill="none" opacity=".6"/>
      <!-- gás cólico de fundo -->
      <path d="M70 90 Q 60 160 90 210 Q 150 250 230 210 Q 260 150 244 96" fill="none" stroke="#1b232c" stroke-width="16" opacity=".55"/>
      <!-- asas ilíacas / pelve -->
      <path d="M40 262 Q 90 250 150 262 M280 262 Q 230 250 170 262" fill="none" stroke="#e8edf2" stroke-width="5" opacity=".5"/>
      <path d="M120 292 Q 160 306 200 292" fill="none" stroke="#e8edf2" stroke-width="6" opacity=".55"/>
      ${patho || ''}
      <g class="anno">${anno || ''}</g>
    </svg>`;
  }
  // Base de osso longo (metáfise/diáfise) — para sinais tumorais.
  function boneBase(patho, anno) {
    return `<svg viewBox="0 0 200 340" class="radio-xray" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="340" fill="#05070a"/>
      <path d="M70 20 Q 60 60 78 96 L 78 250 Q 60 300 74 320 L 126 320 Q 140 300 122 250 L 122 96 Q 140 60 130 20 Z" fill="#20272f"/>
      <!-- cortical -->
      <path d="M78 96 L 78 250 M122 96 L 122 250" stroke="#e8edf2" stroke-width="5" opacity=".85"/>
      <!-- trabeculado medular -->
      <path d="M86 110 L 114 140 M86 150 L 114 120 M86 180 L 114 210 M86 220 L 114 190" stroke="#6b7683" stroke-width="1" opacity=".5"/>
      ${patho || ''}
      <g class="anno">${anno || ''}</g>
    </svg>`;
  }
  // Vértebra em perfil — para sinais de coluna.
  function spineBase(patho, anno) {
    return `<svg viewBox="0 0 200 340" class="radio-xray" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="340" fill="#05070a"/>
      ${[0, 1, 2, 3].map(i => `<g><rect x="60" y="${30 + i * 76}" width="66" height="56" rx="6" fill="#3a434e"/><rect x="126" y="${44 + i * 76}" width="34" height="30" rx="4" fill="#2c343d"/></g>`).join('')}
      ${patho || ''}
      <g class="anno">${anno || ''}</g>
    </svg>`;
  }

  // ---------------------------------------------------------------------------
  // 3. CONTEÚDO
  // ---------------------------------------------------------------------------

  // 3.1 Fundamentos — física essencial (cartões de alto rendimento)
  const FISICA = [
    { t: 'kVp — quilovoltagem', d: 'Controla a energia (penetração) do feixe e o CONTRASTE. kVp alto = mais penetração e escala de cinza longa (baixo contraste); kVp baixo = alto contraste (preto/branco).', tag: 'penetração/contraste' },
    { t: 'mAs — miliamperagem × tempo', d: 'Controla a QUANTIDADE de fótons, ou seja, o enegrecimento/densidade global e o ruído. mAs alto = menos ruído, porém mais dose.', tag: 'densidade/dose' },
    { t: 'Colimação', d: 'Restringe o campo à região de interesse. Reduz radiação espalhada (melhora contraste) e dose no paciente. É item de radioproteção cobrado na justificativa do exame.', tag: 'ALARA' },
    { t: 'Grade antidifusora', d: 'Absorve a radiação espalhada antes de chegar ao detector, aumentando o contraste. Usada em partes espessas (tórax, abdome). Exige mais dose.', tag: 'contraste' },
    { t: 'Efeito fotoelétrico × Compton', d: 'Fotoelétrico gera contraste (absorção dependente do número atômico → osso branco). Compton gera espalhamento (degrada a imagem e irradia o ambiente).', tag: 'interação' },
    { t: 'Magnificação (AP portátil)', d: 'Estrutura mais distante do detector amplia. No AP/portátil o coração fica mais próximo do tubo e mais longe do filme → parece MAIOR. Não confundir com cardiomegalia.', tag: 'armadilha' },
    { t: 'Princípio ALARA', d: 'As Low As Reasonably Achievable: justificar o exame, otimizar a técnica, colimar, evitar repetições e proteger gônadas/gestante. Radiografia sempre exige justificativa clínica.', tag: 'radioproteção' },
  ];

  // 3.2 Densidades radiográficas — referência + exercício interativo
  const DENSIDADES = [
    { k: 'ar', nome: 'Ar', cor: '#05070a', txt: '#cfd8e2', apar: 'Mais radiotransparente — preto', ex: 'Pulmões, gás intestinal, traqueia' },
    { k: 'gordura', nome: 'Gordura', cor: '#3a3f45', txt: '#e6ebf1', apar: 'Cinza-escuro', ex: 'Tecido subcutâneo, gordura pré-peritoneal' },
    { k: 'agua', nome: 'Água / partes moles', cor: '#5b6672', txt: '#fff', apar: 'Cinza intermediário', ex: 'Músculo, coração, sangue, vísceras' },
    { k: 'osso', nome: 'Cálcio / osso', cor: '#dfe6ee', txt: '#0b1016', apar: 'Branco', ex: 'Ossos, calcificações' },
    { k: 'metal', nome: 'Metal / contraste', cor: '#ffffff', txt: '#0b1016', apar: 'Muito branco', ex: 'Próteses, marca-passo, contraste iodado' },
  ];
  // Cena do exercício: regiões clicáveis com a densidade correta.
  const DENS_SCENE = [
    { id: 'r1', label: 'Campo pulmonar', ans: 'ar', shape: 'ellipse', cx: 92, cy: 150, rx: 34, ry: 70 },
    { id: 'r2', label: 'Silhueta cardíaca', ans: 'agua', shape: 'ellipse', cx: 178, cy: 200, rx: 40, ry: 46 },
    { id: 'r3', label: 'Costela', ans: 'osso', shape: 'rect', x: 60, y: 104, w: 40, h: 12 },
    { id: 'r4', label: 'Gerador do marca-passo', ans: 'metal', shape: 'rect', x: 210, y: 96, w: 30, h: 22 },
    { id: 'r5', label: 'Gordura subcutânea', ans: 'gordura', shape: 'rect', x: 30, y: 60, w: 16, h: 60 },
    { id: 'r6', label: 'Bolha gástrica', ans: 'ar', shape: 'ellipse', cx: 196, cy: 286, rx: 16, ry: 9 },
  ];

  // 3.3 Projeções e incidências
  const PROJECOES = [
    { nome: 'PA (póstero-anterior)', quando: 'Tórax de rotina, em ortostase e inspiração máxima.', chave: 'Feixe entra por trás; coração próximo ao detector → tamanho fiel. Escápulas fora dos campos pulmonares.', magn: 'Baixa' },
    { nome: 'AP (ântero-posterior)', quando: 'Acamado, UTI, portátil, criança pouco colaborativa.', chave: 'Coração longe do detector → magnificação da silhueta cardíaca; escápulas sobrepostas; muitas vezes em decúbito.', magn: 'Alta — cuidado com falsa cardiomegalia' },
    { nome: 'Perfil (lateral)', quando: 'Complementa o PA: espaço retroesternal/retrocardíaco, derrames pequenos, localização anteroposterior.', chave: 'Some ~200 mL de derrame já borra o seio costofrênico posterior antes do frontal.', magn: '—' },
    { nome: 'Decúbito lateral com raios horizontais', quando: 'Confirmar derrame pequeno (líquido livre escorre) ou pneumotórax em quem não fica em pé.', chave: 'Líquido pleural livre desce para a parede dependente; ar sobe para a não dependente.', magn: '—' },
    { nome: 'Lordótica (apical)', quando: 'Avaliar ápices pulmonares (ex.: tuberculose) e lobo médio.', chave: 'Clavículas projetadas acima dos ápices, liberando a visão apical.', magn: '—' },
    { nome: 'Incidência com carga (ortostática)', quando: 'Articulações de membros inferiores (joelho, tornozelo) sob peso.', chave: 'Revela redução do espaço articular que o decúbito mascara.', magn: '—' },
  ];

  // 3.4 Métodos de leitura
  const METODO_ABCDE = {
    nome: 'ABCDE — Tórax', sub: 'Sequência sistemática obrigatória no início. Evita a leitura aleatória (satisfaction of search).',
    steps: [
      ['A', 'Airway (vias aéreas)', 'Traqueia central? Carina e brônquios principais. Desvio traqueal aponta atelectasia (para o lado) ou efeito de massa/pneumotórax hipertensivo (para o lado oposto).'],
      ['B', 'Breathing (pulmões e pleuras)', 'Compare os campos zona a zona. Opacidade x hipertransparência, simetria da trama vascular, linha pleural, seios costofrênicos livres.'],
      ['C', 'Circulation (coração e mediastino)', 'Índice cardiotorácico < 0,5 (só confiável em PA). Contornos, arco aórtico, largura do mediastino, congestão vascular.'],
      ['D', 'Diaphragm (diafragma)', 'Hemicúpula direita ~1 costela acima da esquerda. Ar subdiafragmático (pneumoperitônio), seios costofrênicos.'],
      ['E', 'Everything else', 'Ossos (costelas, clavículas, úmeros), partes moles, e DISPOSITIVOS (tubo, SNG, cateteres) — trajeto e ponta.'],
    ],
  };
  const METODO_ABCS = {
    nome: 'ABCS — Musculoesquelético', sub: 'Leitura sistemática de osso e articulação. Sempre em duas incidências ortogonais.',
    steps: [
      ['A', 'Alignment (alinhamento)', 'Contorno ósseo contínuo, eixos e linhas de alinhamento (ex.: linha umeral anterior no cotovelo). Degraus = fratura/luxação.'],
      ['B', 'Bone (osso)', 'Cortical íntegra? Densidade (osteopenia/esclerose), lesões líticas/blásticas, reação periosteal.'],
      ['C', 'Cartilage (cartilagem/articulação)', 'Espaço articular (simétrico?), superfícies, presença de derrame/efusão.'],
      ['S', 'Soft tissues (partes moles)', 'Edema, corpo estranho, ar (enfisema de partes moles), coxim gorduroso deslocado (sinal indireto de fratura).'],
    ],
  };
  // Checklist de qualidade técnica (tórax) — veredito estruturado.
  const QUALIDADE_TORAX = [
    ['Identificação', 'Paciente, data e lateralidade conferidos.'],
    ['Projeção', 'PA (ideal) ou AP? Determina interpretação do índice cardiotorácico.'],
    ['Rotação', 'Extremidades mediais das clavículas simétricas em relação aos processos espinhosos.'],
    ['Inspiração', '8–10 arcos costais posteriores acima do diafragma. Pouca inspiração = falsa opacidade basal e coração alargado.'],
    ['Penetração', 'Coluna visível através do mediastino, discos torácicos apenas esboçados.'],
    ['Cobertura', 'Ápices e ambos os seios costofrênicos incluídos.'],
    ['Movimento/artefatos', 'Sem borramento; sem roupas, eletrodos ou cabelo sobre os campos.'],
  ];

  // 3.5 SINAIS RADIOLÓGICOS — atlas com esquema SVG (sem anotação + anotado)
  const SINAIS = [
    {
      id: 'broncograma', nome: 'Broncograma aéreo', regiao: 'Tórax', level: 2,
      def: 'Brônquios cheios de ar (pretos) tornam-se visíveis por estarem circundados por alvéolos preenchidos (brancos).',
      mec: 'Preenchimento do espaço aéreo alveolar por exsudato/transudato/sangue, com brônquios ainda pérvios.',
      doencas: ['Pneumonia (consolidação lobar)', 'Edema pulmonar', 'SDRA', 'Hemorragia alveolar', 'Carcinoma bronquíolo-alveolar'],
      ddx: ['Atelectasia (broncograma pode faltar se brônquio ocluído)'],
      obs: 'Confirma que a opacidade é ALVEOLAR (espaço aéreo), não pleural nem de partes moles.',
      svg: () => chestBase(
        `<path d="M172 90 C 226 88 250 130 252 186 C 253 224 234 258 176 262 Z" fill="#9aa6b3" opacity=".78"/>
         <path d="M176 118 L 210 150 M182 150 L 216 178 M180 186 L 214 210" stroke="#0a0d11" stroke-width="3.5" fill="none" opacity=".9" stroke-linecap="round"/>`,
        `<path d="M176 118 L 210 150" stroke="#ffd43b" stroke-width="2" fill="none"/><text x="212" y="150" fill="#ffd43b" font-size="11">brônquio aerado</text>
         <text x="150" y="300" fill="#ffd43b" font-size="11" text-anchor="middle">consolidação alveolar (direita)</text>`),
      quick: { q: 'Broncograma aéreo indica que a opacidade é de qual compartimento?', options: ['Alveolar (espaço aéreo)', 'Pleural', 'Intersticial puro', 'Óssea'], answer: 0, exp: 'Brônquios aerados dentro de opacidade = preenchimento alveolar com via aérea pérvia.' },
    },
    {
      id: 'silhueta', nome: 'Sinal da silhueta', regiao: 'Tórax', level: 2,
      def: 'Apagamento de um contorno normal indica que a opacidade contacta essa estrutura (mesma densidade, sem interface de ar).',
      mec: 'Duas densidades de água em contato perdem a interface. Localiza a lesão pelo contorno que some.',
      doencas: ['Pneumonia da língula (apaga borda cardíaca E)', 'Lobo médio (apaga borda cardíaca D)', 'Lobo inferior (apaga diafragma, mas preserva borda cardíaca)'],
      ddx: ['Gordura pericárdica', 'Derrame'],
      obs: 'Contorno apagado LOCALIZA: borda cardíaca direita = lobo médio; esquerda = língula; diafragma = lobo inferior.',
      svg: () => chestBase(
        `<path d="M118 176 C 110 210 128 244 160 246 L 160 176 Z" fill="#8f9ba8" opacity=".8"/>`,
        `<path d="M118 200 L 96 196" stroke="#ffd43b" stroke-width="2"/><text x="18" y="196" fill="#ffd43b" font-size="11">borda cardíaca</text>
         <text x="90" y="196" fill="#ffd43b" font-size="11">apagada</text>
         <text x="150" y="300" fill="#ffd43b" font-size="11" text-anchor="middle">língula (borda card. E some)</text>`),
      quick: { q: 'Opacidade que APAGA a borda cardíaca direita localiza-se em:', options: ['Lobo médio', 'Lobo inferior direito', 'Língula', 'Ápice'], answer: 0, exp: 'O lobo médio direito é anterior e contacta a borda cardíaca direita.' },
    },
    {
      id: 'borboleta', nome: 'Asa de borboleta (bat wing)', regiao: 'Tórax', level: 2,
      def: 'Opacidades alveolares peri-hilares bilaterais e simétricas, poupando a periferia.',
      mec: 'Acúmulo alveolar central, tipicamente por edema pulmonar cardiogênico agudo.',
      doencas: ['Edema pulmonar cardiogênico', 'Hemorragia alveolar', 'Proteinose alveolar', 'SDRA (pode ser mais periférico)'],
      ddx: ['Pneumonia bilateral', 'PCP'],
      obs: 'Some com cardiomegalia, redistribuição vascular, linhas B de Kerley e derrames.',
      svg: () => chestBase(
        `<path d="M132 150 C 96 148 78 180 96 214 C 128 232 148 214 150 190 Z" fill="#9aa6b3" opacity=".7"/>
         <path d="M188 150 C 224 148 242 180 224 214 C 192 232 172 214 170 190 Z" fill="#9aa6b3" opacity=".7"/>`,
        `<text x="150" y="300" fill="#ffd43b" font-size="11" text-anchor="middle">opacidade peri-hilar bilateral</text>`),
      quick: { q: 'A "asa de borboleta" clássica sugere:', options: ['Edema pulmonar cardiogênico', 'Pneumotórax', 'Enfisema', 'TEP'], answer: 0, exp: 'Padrão alveolar central bilateral simétrico, típico de edema agudo.' },
    },
    {
      id: 'menisco', nome: 'Sinal do menisco (parábola de Damoiseau)', regiao: 'Tórax', level: 1,
      def: 'Opacidade basal com borda superior côncava para cima, apagando o seio costofrênico.',
      mec: 'Líquido pleural livre se acumula na base e sobe pela parede lateral (menisco).',
      doencas: ['Derrame pleural'],
      ddx: ['Derrame subpulmonar (diafragma "elevado")', 'Espessamento pleural', 'Elevação diafragmática'],
      obs: 'Em ortostase, ~200–300 mL já apagam o seio costofrênico lateral; no perfil, o posterior some antes.',
      svg: () => chestBase(
        `<path d="M172 232 Q 216 208 260 250 L 262 292 L 170 288 Z" fill="#7f8b98" opacity=".85"/>
         <path d="M172 232 Q 216 214 258 236" fill="none" stroke="#b9c3cd" stroke-width="2"/>`,
        `<path d="M258 250 L 284 244" stroke="#ffd43b" stroke-width="2"/><text x="228" y="238" fill="#ffd43b" font-size="11">menisco</text>
         <text x="216" y="286" fill="#ffd43b" font-size="11" text-anchor="middle">seio apagado</text>`),
      quick: { q: 'O menisco côncavo para cima na base pulmonar indica:', options: ['Derrame pleural livre', 'Consolidação', 'Pneumotórax', 'Massa'], answer: 0, exp: 'Líquido livre forma borda côncava e apaga o seio costofrênico.' },
    },
    {
      id: 'sulco', nome: 'Sinal do sulco profundo (deep sulcus)', regiao: 'Tórax', level: 3, urgente: true,
      def: 'Seio costofrênico anormalmente profundo e radiotransparente no paciente em decúbito.',
      mec: 'Ar pleural sobe para a porção mais alta — que no supino é o seio costofrênico ântero-inferior.',
      doencas: ['Pneumotórax em decúbito (UTI/portátil)'],
      ddx: ['Bolha enfisematosa', 'Enfisema subcutâneo'],
      obs: 'No acamado o pneumotórax NÃO faz o ápice clássico; procurar seio muito escuro e profundo. Pode preceder pneumotórax hipertensivo.',
      svg: () => chestBase(
        `<path d="M172 266 Q 220 260 288 300 L 292 300 L 262 320 L 176 300 Z" fill="#05070a"/>
         <path d="M172 264 Q 224 268 280 296" fill="none" stroke="#9aa6b3" stroke-width="1.5" opacity=".6"/>`,
        `<path d="M276 300 L 300 300" stroke="#ffd43b" stroke-width="2"/><text x="196" y="316" fill="#ffd43b" font-size="11">seio profundo e escuro</text>`,
        { hideVessels: false }),
      quick: { q: 'Seio costofrênico profundo e muito escuro no paciente supino sugere:', options: ['Pneumotórax', 'Derrame', 'Consolidação basal', 'Elevação diafragmática'], answer: 0, exp: 'No decúbito o ar pleural migra para o seio ântero-inferior — sinal do sulco profundo.' },
    },
    {
      id: 'kerley', nome: 'Linhas B de Kerley', regiao: 'Tórax', level: 2,
      def: 'Linhas finas horizontais (~1–2 cm) perpendiculares à pleura, nas bases.',
      mec: 'Espessamento dos septos interlobulares por líquido (edema intersticial) ou infiltração.',
      doencas: ['Edema intersticial (ICC)', 'Linfangite carcinomatosa', 'Doença intersticial', 'Estenose mitral'],
      ddx: ['Fibrose'],
      obs: 'Estágio intersticial precede o alveolar no edema. Some com redistribuição vascular e cardiomegalia.',
      svg: () => chestBase(
        `<g stroke="#c3ccd6" stroke-width="1.6" opacity=".8">
         <path d="M64 250 L 82 250"/><path d="M62 258 L 82 258"/><path d="M66 266 L 84 266"/>
         <path d="M258 250 L 240 250"/><path d="M260 258 L 240 258"/><path d="M256 266 L 238 266"/></g>`,
        `<text x="150" y="305" fill="#ffd43b" font-size="11" text-anchor="middle">linhas B: septos espessados nas bases</text>`),
      quick: { q: 'Linhas B de Kerley representam:', options: ['Septos interlobulares espessados', 'Brônquios aerados', 'Vasos dilatados', 'Fissuras normais'], answer: 0, exp: 'Espessamento septal, mais comum no edema intersticial.' },
    },
    {
      id: 'graocafe', nome: 'Grão de café (coffee bean)', regiao: 'Abdome', level: 3, urgente: true,
      def: 'Alça distendida em U invertido com parede central espessa que simula a fenda de um grão de café.',
      mec: 'Volvo de sigmoide: alça fecha em torno do mesentério, distende maciçamente e aponta para o quadrante superior.',
      doencas: ['Volvo de sigmoide'],
      ddx: ['Volvo de ceco (aponta para QSE, ceco descomprimido)', 'Megacólon'],
      obs: 'Emergência: risco de isquemia/perfuração. Confirma-se com enema/TC; descompressão endoscópica se viável.',
      svg: () => abdBase(
        `<path d="M96 260 C 90 140 150 96 176 100 C 210 106 220 150 210 200 C 204 240 170 262 150 264" fill="none" stroke="#c3ccd6" stroke-width="10" opacity=".85"/>
         <path d="M150 100 L 150 258" stroke="#c3ccd6" stroke-width="6" opacity=".85"/>`,
        `<path d="M150 170 L 176 170" stroke="#ffd43b" stroke-width="2"/><text x="178" y="172" fill="#ffd43b" font-size="11">parede central</text>
         <text x="150" y="320" fill="#ffd43b" font-size="11" text-anchor="middle">alça em U invertido → volvo de sigmoide</text>`),
      quick: { q: 'O sinal do grão de café no abdome sugere:', options: ['Volvo de sigmoide', 'Íleo paralítico', 'Ascite', 'Pneumoperitônio'], answer: 0, exp: 'Alça sigmoide fechada e distendida em U invertido — urgência cirúrgica.' },
    },
    {
      id: 'duplabolha', nome: 'Dupla bolha (double bubble)', regiao: 'Abdome', level: 2,
      def: 'Duas bolhas de gás no andar superior do abdome, com ausência de gás distal.',
      mec: 'Gás no estômago (esquerda) e no duodeno proximal dilatado (direita), separados pelo piloro.',
      doencas: ['Atresia duodenal', 'Estenose/membrana duodenal', 'Pâncreas anular', 'Má-rotação com bandas de Ladd'],
      ddx: ['Distensão gástrica isolada'],
      obs: 'Clássica no RN. Ausência total de gás distal favorece atresia; gás distal escasso sugere obstrução parcial/má-rotação.',
      svg: () => abdBase(
        `<ellipse cx="118" cy="120" rx="30" ry="26" fill="#05070a" stroke="#c3ccd6" stroke-width="2.5"/>
         <ellipse cx="186" cy="126" rx="24" ry="22" fill="#05070a" stroke="#c3ccd6" stroke-width="2.5"/>`,
        `<text x="118" y="122" fill="#ffd43b" font-size="10" text-anchor="middle">estômago</text>
         <text x="186" y="128" fill="#ffd43b" font-size="10" text-anchor="middle">duodeno</text>
         <text x="150" y="230" fill="#ffd43b" font-size="11" text-anchor="middle">sem gás distal → atresia duodenal</text>`),
      quick: { q: 'A "dupla bolha" no RN com ausência de gás distal sugere:', options: ['Atresia duodenal', 'Enterocolite necrosante', 'Hérnia diafragmática', 'Íleo meconial'], answer: 0, exp: 'Gás em estômago + duodeno dilatado sem gás distal — obstrução duodenal completa.' },
    },
    {
      id: 'rigler', nome: 'Sinal de Rigler (dupla parede)', regiao: 'Abdome', level: 3, urgente: true,
      def: 'Parede intestinal visível dos dois lados (luz E cavidade peritoneal), por ar em ambas as faces.',
      mec: 'Pneumoperitônio: ar livre delineia a serosa externa, normalmente invisível.',
      doencas: ['Perfuração de víscera oca'],
      ddx: ['Alças justapostas (falso Rigler)', 'Sinal de Chilaiditi'],
      obs: 'Emergência cirúrgica. Em ortostase procurar ar subdiafragmático; no acamado, o Rigler e o ligamento falciforme ajudam.',
      svg: () => abdBase(
        `<path d="M96 170 h 60 M96 190 h 60" stroke="#dfe6ee" stroke-width="3"/>
         <path d="M96 170 v20 M156 170 v20" stroke="#dfe6ee" stroke-width="3"/>
         <ellipse cx="150" cy="150" rx="90" ry="70" fill="none" stroke="#4a5560" stroke-width="1" opacity=".4"/>`,
        `<path d="M60 180 L 92 180" stroke="#ffd43b" stroke-width="2"/><text x="10" y="182" fill="#ffd43b" font-size="11">ar peritoneal</text>
         <text x="150" y="250" fill="#ffd43b" font-size="11" text-anchor="middle">parede visível dos 2 lados → pneumoperitônio</text>`),
      quick: { q: 'O sinal de Rigler (parede intestinal visível dos dois lados) indica:', options: ['Pneumoperitônio', 'Obstrução simples', 'Ascite', 'Pneumatose sem perfuração'], answer: 0, exp: 'Ar livre na cavidade delineia a serosa externa — víscera perfurada.' },
    },
    {
      id: 'pneumatose', nome: 'Pneumatose intestinal', regiao: 'Abdome', level: 4, urgente: true,
      def: 'Ar dentro da PAREDE intestinal, como faixas lineares ou bolhas ao longo da alça.',
      mec: 'Gás intramural, frequentemente por isquemia/necrose da parede.',
      doencas: ['Enterocolite necrosante (RN)', 'Isquemia mesentérica', 'Colite grave'],
      ddx: ['Pneumatose benigna (cistoide)', 'Fezes com gás'],
      obs: 'Sinal de alarme, sobretudo se acompanhado de gás no sistema porta. NEC é a causa clássica no prematuro.',
      svg: () => abdBase(
        `<path d="M96 170 q 30 -30 60 0" fill="none" stroke="#c3ccd6" stroke-width="9" opacity=".6"/>
         <path d="M98 168 q 30 -26 56 0" fill="none" stroke="#05070a" stroke-width="2" stroke-dasharray="3 3"/>
         <path d="M100 176 q 28 -22 52 0" fill="none" stroke="#05070a" stroke-width="2" stroke-dasharray="2 3"/>`,
        `<text x="150" y="230" fill="#ffd43b" font-size="11" text-anchor="middle">gás linear na parede da alça</text>`),
      quick: { q: 'Gás linear DENTRO da parede intestinal define:', options: ['Pneumatose intestinal', 'Pneumoperitônio', 'Íleo', 'Volvo'], answer: 0, exp: 'Ar intramural — na NEC/isquemia é sinal de gravidade.' },
    },
    {
      id: 'raiossol', nome: 'Raios de sol (sunburst)', regiao: 'Osso', level: 3, urgente: true,
      def: 'Espículas ósseas finas irradiando perpendicularmente da cortical.',
      mec: 'Reação periosteal AGRESSIVA: o tumor cresce rápido e o periósteo se ossifica ao longo dos vasos perpendiculares.',
      doencas: ['Osteossarcoma', 'Metástases (algumas)'],
      ddx: ['Sarcoma de Ewing (costuma dar "casca de cebola")'],
      obs: 'Reação periosteal interrompida/agressiva sugere malignidade. Some com massa de partes moles e triângulo de Codman.',
      svg: () => boneBase(
        `<g stroke="#dfe6ee" stroke-width="2">
          <path d="M122 150 L 158 130"/><path d="M122 165 L 162 158"/><path d="M122 180 L 160 188"/><path d="M122 195 L 156 214"/><path d="M122 210 L 148 236"/></g>
         <path d="M92 150 L 122 150 L 122 210 L 92 210 Z" fill="#4a5560" opacity=".5"/>`,
        `<text x="130" y="120" fill="#ffd43b" font-size="11">espículas perpendiculares</text>`),
      quick: { q: 'Reação periosteal em "raios de sol" indica lesão:', options: ['Agressiva/maligna', 'Benigna e estável', 'Infecciosa apenas', 'Traumática antiga'], answer: 0, exp: 'Espículas perpendiculares = crescimento rápido, típico de osteossarcoma.' },
    },
    {
      id: 'codman', nome: 'Triângulo de Codman', regiao: 'Osso', level: 3,
      def: 'Ângulo de periósteo elevado e ossificado na borda da lesão, sem cobrir seu centro.',
      mec: 'O tumor cresce mais rápido que o periósteo consegue ossificar; só as bordas se ossificam.',
      doencas: ['Osteossarcoma', 'Sarcoma de Ewing', 'Osteomielite agressiva'],
      ddx: ['Reação laminar benigna'],
      obs: 'Também é reação periosteal AGRESSIVA (interrompida) — sugere malignidade, mas não é específico.',
      svg: () => boneBase(
        `<path d="M78 150 L 62 138 L 78 150" fill="none" stroke="#dfe6ee" stroke-width="3"/>
         <path d="M78 150 L 60 140 L 78 168 Z" fill="#dfe6ee" opacity=".8"/>
         <ellipse cx="100" cy="185" rx="20" ry="30" fill="#05070a" stroke="#6b7683" stroke-width="1.5"/>`,
        `<path d="M62 138 L 40 128" stroke="#ffd43b" stroke-width="2"/><text x="6" y="128" fill="#ffd43b" font-size="11">Codman</text>`),
      quick: { q: 'O triângulo de Codman corresponde a:', options: ['Periósteo elevado nas bordas da lesão', 'Fratura consolidada', 'Espaço articular reduzido', 'Cisto ósseo'], answer: 0, exp: 'Ossificação periosteal só nas margens — reação agressiva.' },
    },
    {
      id: 'bambu', nome: 'Coluna em bambu', regiao: 'Coluna', level: 3,
      def: 'Coluna com aspecto fundido e contínuo por sindesmófitos verticais que unem os corpos vertebrais.',
      mec: 'Ossificação do ânulo fibroso (sindesmófitos finos e verticais) na espondilite anquilosante.',
      doencas: ['Espondilite anquilosante'],
      ddx: ['DISH (osteófitos grosseiros, fluindo)', 'Espondilose'],
      obs: 'Some com sacroileíte bilateral, quadratura vertebral e "trilho de trem" (ossificação de ligamentos).',
      svg: () => spineBase(
        `<path d="M60 30 L 60 334 M126 30 L 126 334" stroke="#dfe6ee" stroke-width="3" opacity=".85"/>
         ${[86, 162, 238].map(y => `<rect x="60" y="${y}" width="66" height="6" fill="#dfe6ee" opacity=".7"/>`).join('')}`,
        `<text x="132" y="200" fill="#ffd43b" font-size="11">sindesmófitos verticais</text>`),
      quick: { q: 'A "coluna em bambu" é característica de:', options: ['Espondilite anquilosante', 'Osteoartrose', 'Metástase', 'Fratura de Chance'], answer: 0, exp: 'Sindesmófitos finos e verticais fundem os corpos vertebrais.' },
    },
    {
      id: 'marfim', nome: 'Vértebra em marfim (ivory vertebra)', regiao: 'Coluna', level: 3,
      def: 'Corpo vertebral difusamente esclerótico (branco), com tamanho e contorno preservados.',
      mec: 'Aumento da densidade óssea por infiltração blástica ou aposição.',
      doencas: ['Metástase osteoblástica (próstata, mama)', 'Linfoma', 'Doença de Paget'],
      ddx: ['Hemangioma (padrão em "veludo/corduroy")'],
      obs: 'Uma única vértebra muito branca merece investigação — contexto (idade, câncer conhecido) direciona.',
      svg: () => spineBase(
        `<rect x="60" y="106" width="66" height="56" rx="6" fill="#f2f6fa"/>
         <rect x="126" y="120" width="34" height="30" rx="4" fill="#dfe6ee"/>`,
        `<path d="M126 134 L 168 134" stroke="#ffd43b" stroke-width="2"/><text x="150" y="220" fill="#ffd43b" font-size="11" text-anchor="middle">corpo esclerótico isolado</text>`),
      quick: { q: 'Uma "vértebra em marfim" isolada num homem idoso deve levantar:', options: ['Metástase osteoblástica (ex.: próstata)', 'Osteoporose', 'Fratura aguda', 'Escoliose'], answer: 0, exp: 'Esclerose difusa de um corpo vertebral — pensar em metástase blástica, linfoma ou Paget.' },
    },
    {
      id: 'sailelbow', nome: 'Sinal da vela (sail sign) — cotovelo', regiao: 'Osso', level: 2,
      def: 'Coxim gorduroso anterior elevado e triangular ("vela") no perfil do cotovelo.',
      mec: 'Derrame/hematoma articular desloca a gordura anterior; o coxim posterior (normalmente invisível) pode aparecer.',
      doencas: ['Fratura da cabeça do rádio (adulto)', 'Fratura supracondiliana (criança)'],
      obs: 'Coxim gorduroso POSTERIOR visível é sempre patológico → assuma fratura mesmo sem traço evidente.',
      ddx: ['Derrame não traumático'],
      svg: () => `<svg viewBox="0 0 240 340" class="radio-xray" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <rect width="240" height="340" fill="#05070a"/>
        <path d="M60 30 L 84 150 Q 120 190 150 200 L 150 30 Z" fill="#2b333d"/>
        <path d="M96 205 L 70 320 M120 205 L 150 320" stroke="#2b333d" stroke-width="26" stroke-linecap="round"/>
        <path d="M96 150 L 118 120 L 118 165 Z" fill="#3a3f45" class="patho" opacity=".9"/>
        <g class="anno"><path d="M118 130 L 150 118" stroke="#ffd43b" stroke-width="2"/><text x="152" y="118" fill="#ffd43b" font-size="11">coxim anterior (vela)</text></g>
      </svg>`,
      quick: { q: 'O "sinal da vela" no cotovelo indica:', options: ['Derrame articular (frequentemente fratura oculta)', 'Osteoartrose', 'Luxação crônica', 'Normalidade'], answer: 0, exp: 'Coxim gorduroso elevado sinaliza efusão — na criança pensar em fratura supracondiliana.' },
    },
  ];
  const SINAL_MAP = Object.fromEntries(SINAIS.map((s) => [s.id, s]));

  // 3.6 CASOS (híbrido) — fluxo de 10 etapas. `image.svg` (sintético) OU `image.src` (real).
  const CASOS = [
    {
      id: 'ptx_hipertensivo', titulo: 'Dispneia súbita na emergência', nivel: 3,
      contexto: 'Homem, 68 anos, DPOC, dispneia súbita intensa e dor torácica direita. PA 88/54, taquicárdico, MV abolido à direita.',
      image: {
        // Híbrido: hoje um esquema SVG; troque por { src: 'url.jpg' } quando tiver a imagem real.
        svg: () => chestBase(
          `<path d="M172 60 C 232 62 262 120 262 200 C 262 250 236 276 176 276 Z" fill="#05070a"/>
           <path d="M176 60 C 172 130 178 220 176 276" stroke="#9aa6b3" stroke-width="1.6" opacity=".7" fill="none"/>
           <rect x="150" y="40" width="16" height="248" fill="#252d38" opacity=".4" transform="translate(20,0)"/>`,
          `<path d="M176 160 L 150 160" stroke="#ffd43b" stroke-width="2"/><text x="60" y="160" fill="#ffd43b" font-size="11">linha pleural</text>
           <text x="220" y="120" fill="#ffd43b" font-size="11">hipertransparência</text>
           <path d="M186 60 L 210 44" stroke="#ffd43b" stroke-width="2"/><text x="196" y="40" fill="#ffd43b" font-size="11">desvio do mediastino</text>`,
          { heartWide: false }),
        proj: 'AP portátil (leito)', lat: 'Direita',
      },
      tecnica: { q: 'A técnica é adequada para excluir cardiomegalia?', a: 1, opts: ['Sim, PA em ortostase', 'Não — é AP portátil, avalie com cautela o índice cardiotorácico', 'Sim, com carga', 'Não avaliável'] },
      alterado: true,
      local: { q: 'Onde está a principal alteração?', a: 'Hemitórax direito', opts: ['Hemitórax direito', 'Hemitórax esquerdo', 'Mediastino', 'Abdome'] },
      descricao: ['Hipertransparência à direita', 'Ausência de trama vascular na periferia', 'Linha pleural visível', 'Desvio do mediastino para a esquerda'],
      dx: { q: 'Diagnóstico mais provável:', a: 0, opts: ['Pneumotórax hipertensivo', 'Pneumonia lobar', 'Derrame pleural', 'Enfisema'] },
      urgencia: 'critica',
      laudoConceitos: ['pneumotórax', 'hipertensivo', 'desvio', 'mediastino', 'direita', 'drenagem', 'descompressão'],
      laudoRef: 'Pneumotórax hipertensivo à direita, com colapso pulmonar e desvio contralateral do mediastino. Achado crítico — descompressão imediata e drenagem torácica; comunicar a equipe.',
      correcao: 'Achado crítico. O desvio do mediastino diferencia o pneumotórax HIPERTENSIVO do simples e exige descompressão imediata (não espere a TC). Armadilha: em AP portátil o pneumotórax pode não fazer o ápice clássico — procure hipertransparência e o sinal do sulco profundo.',
      similares: ['sulco'],
    },
    {
      id: 'pneumoperitonio', titulo: 'Dor abdominal e abdome em tábua', nivel: 3,
      contexto: 'Mulher, 55 anos, dor epigástrica súbita há 4 h, abdome rígido. Histórico de úlcera péptica.',
      image: {
        svg: () => chestBase(
          `<path d="M60 258 Q 110 236 150 258 L 150 250 Q 108 232 62 252 Z" fill="#05070a" stroke="#9aa6b3" stroke-width="1.2"/>
           <path d="M170 256 Q 214 236 260 260 L 260 250 Q 214 230 170 248 Z" fill="#05070a" stroke="#9aa6b3" stroke-width="1.2"/>`,
          `<path d="M100 250 L 100 224" stroke="#ffd43b" stroke-width="2"/><text x="70" y="220" fill="#ffd43b" font-size="11">ar subdiafragmático</text>`),
        proj: 'Tórax PA em ortostase', lat: 'Bilateral',
      },
      tecnica: { q: 'Qual incidência melhor demonstra ar livre?', a: 0, opts: ['Tórax PA em ortostase (cúpulas incluídas)', 'Abdome em decúbito dorsal apenas', 'AP portátil deitado', 'Lordótica'] },
      alterado: true,
      local: { q: 'Onde procurar o achado?', a: 'Abaixo das hemicúpulas diafragmáticas', opts: ['Abaixo das hemicúpulas diafragmáticas', 'Ápices pulmonares', 'Seios costofrênicos', 'Mediastino'] },
      descricao: ['Ar subdiafragmático', 'Crescente radiotransparente sob a cúpula direita', 'Diafragma bem delineado por ar em ambas as faces'],
      dx: { q: 'Diagnóstico mais provável:', a: 0, opts: ['Pneumoperitônio (víscera perfurada)', 'Interposição de cólon (Chilaiditi)', 'Abscesso subfrênico', 'Hérnia diafragmática'] },
      urgencia: 'critica',
      laudoConceitos: ['pneumoperitônio', 'ar', 'subdiafragmático', 'perfuração', 'víscera', 'cirúrgico'],
      laudoRef: 'Ar livre subdiafragmático (pneumoperitônio), compatível com perfuração de víscera oca. Achado crítico — avaliação cirúrgica de urgência.',
      correcao: 'A ortostase (ou decúbito lateral com raios horizontais) é essencial: no decúbito dorsal o ar sobe e some. Armadilha: interposição do cólon (Chilaiditi) simula ar livre, mas mostra haustrações dentro do gás.',
      similares: ['rigler'],
    },
  ];
  const CASO_MAP = Object.fromEntries(CASOS.map((c) => [c.id, c]));

  // ---------------------------------------------------------------------------
  // 4. SRS + estado
  // ---------------------------------------------------------------------------
  function defaultState() {
    return {
      ui: { sub: 'inicio', sinalId: null, casoId: null, fundTab: 'fisica', metodoTab: 'abcde' },
      srs: {},          // por sinal: SM-2 lite
      log: [],          // tentativas { id, ok, conf, t }
      progress: {},     // marcadores de conclusão de módulos
      daily: { day: null, sinalOfDay: null },
      caseState: {},    // etapa atual por caso
    };
  }
  function ensureSrs(S, id) {
    if (!S.srs[id]) S.srs[id] = { reps: 0, ease: 2.3, dueISO: todayISO(), correct: 0, attempts: 0, prevInterval: 0 };
    return S.srs[id];
  }
  function scheduleNext(rec, grade, correct) {
    if (!correct || grade < 3) { rec.reps = 0; rec.dueISO = addDaysISO(grade <= 1 ? 0 : 1); }
    else {
      rec.reps += 1;
      rec.ease = clamp(rec.ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)), 1.3, 3.0);
      const interval = rec.reps === 1 ? 1 : rec.reps === 2 ? 4 : Math.round((rec.prevInterval || 4) * rec.ease);
      rec.prevInterval = interval; rec.dueISO = addDaysISO(interval);
    }
  }
  function logAttempt(S, id, ok, conf) { S.log.unshift({ id, ok, conf, t: Date.now() }); if (S.log.length > 500) S.log.length = 500; }
  function sinalOfDay(S) {
    const day = todayISO();
    if (S.daily.day === day && SINAL_MAP[S.daily.sinalOfDay]) return SINAL_MAP[S.daily.sinalOfDay];
    let h = 0; for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0;
    const s = SINAIS[h % SINAIS.length];
    S.daily = { day, sinalOfDay: s.id };
    return s;
  }

  // ---------------------------------------------------------------------------
  // 5. UI
  // ---------------------------------------------------------------------------
  let BRIDGE = null;
  function st() { return BRIDGE.getState().radio; }
  function save() { BRIDGE.save(); }
  function root() { return document.getElementById('radiografia'); }

  const SUBS = [
    ['inicio', 'Início'], ['fundamentos', 'Fundamentos'], ['metodo', 'Método'],
    ['sinais', 'Sinais'], ['casos', 'Casos'], ['desempenho', 'Desempenho'],
  ];

  function injectStyles() {
    if (document.getElementById('radio-sim-styles')) return;
    const style = document.createElement('style');
    style.id = 'radio-sim-styles';
    style.textContent = `
    .radio-wrap{display:flex;flex-direction:column;gap:16px}
    .radio-subnav{display:flex;flex-wrap:wrap;gap:6px}
    .radio-subnav button{border:1px solid var(--border,#dce1ec);background:var(--card,#fff);color:inherit;border-radius:999px;padding:7px 14px;font-size:13px;font-weight:600;cursor:pointer;transition:.15s}
    .radio-subnav button.active{background:var(--accent,#1261f5);color:#fff;border-color:transparent}
    .radio-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
    .radio-card{border:1px solid var(--border,#dce1ec);border-radius:14px;padding:14px;background:var(--card,#fff);display:flex;flex-direction:column;gap:8px}
    .radio-card h3{margin:0;font-size:15px}
    .radio-hero{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
    .radio-stat{border:1px solid var(--border,#dce1ec);border-radius:14px;padding:14px;background:var(--card,#fff)}
    .radio-stat b{font-size:24px;display:block}
    .radio-muted{color:var(--muted,#5b6472);font-size:13px}
    .radio-badge{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px}
    .radio-badge.baixa{background:#e6f4ea;color:#1a7f37}
    .radio-badge.media{background:#fff4e0;color:#a15c00}
    .radio-badge.alta{background:#ffe9e0;color:#b5411b}
    .radio-badge.critica{background:#ffe1e1;color:#c1121f}
    .radio-badge.reg{background:var(--chip,#eef1f7);color:var(--muted,#5b6472)}
    .radio-tags{display:flex;flex-wrap:wrap;gap:4px}
    .radio-tag{font-size:10.5px;background:var(--chip,#eef1f7);border-radius:6px;padding:2px 6px;color:var(--muted,#5b6472)}
    .radio-btn{border:none;border-radius:10px;padding:9px 14px;font-weight:600;font-size:13px;cursor:pointer;background:var(--accent,#1261f5);color:#fff}
    .radio-btn.ghost{background:transparent;border:1px solid var(--border,#dce1ec);color:inherit}
    .radio-btn.wide{width:100%}
    .radio-btn.sm{padding:6px 10px;font-size:12px}
    .radio-opts{display:grid;gap:8px}
    .radio-opt{text-align:left;border:1px solid var(--border,#dce1ec);background:var(--card,#fff);border-radius:10px;padding:11px 14px;font-size:14px;cursor:pointer;color:inherit;transition:.12s}
    .radio-opt:hover{border-color:var(--accent,#1261f5)}
    .radio-opt.correct{background:#e6f4ea;border-color:#1a7f37}
    .radio-opt.wrong{background:#ffe1e1;border-color:#c1121f}
    .radio-opt:disabled{cursor:default}
    .radio-figure{position:relative;border:1px solid var(--border,#dce1ec);border-radius:12px;overflow:hidden;background:#05070a}
    .radio-figure .radio-xray{display:block;width:100%;height:auto;transition:filter .15s, transform .15s;transform-origin:center}
    .radio-figure[data-anno="0"] .anno{opacity:0}
    .radio-figure[data-inv="1"] .radio-xray{filter:invert(1) hue-rotate(180deg)}
    .radio-figure[data-zoom="1"] .radio-xray{transform:scale(1.6)}
    .radio-viewer-bar{display:flex;flex-wrap:wrap;gap:6px;padding:8px;background:var(--card,#fff);border-top:1px solid var(--border,#dce1ec)}
    .radio-teach h4{margin:14px 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted,#5b6472)}
    .radio-teach ul{margin:4px 0;padding-left:18px}
    .radio-step{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border,#eef1f7)}
    .radio-step .n{flex:0 0 30px;height:30px;border-radius:8px;background:var(--accent,#1261f5);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px}
    .radio-dens-list{display:flex;flex-direction:column;gap:6px}
    .radio-dens-row{display:flex;align-items:center;gap:10px;border:1px solid var(--border,#dce1ec);border-radius:10px;padding:8px 10px}
    .radio-dens-swatch{flex:0 0 40px;height:28px;border-radius:6px;border:1px solid rgba(128,128,128,.3)}
    .radio-conf{display:flex;flex-wrap:wrap;gap:8px}
    .radio-two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:16px;align-items:start}
    @media(max-width:720px){.radio-two{grid-template-columns:1fr}}
    .radio-table{width:100%;border-collapse:collapse;font-size:13px}
    .radio-table th,.radio-table td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--border,#eef1f7);vertical-align:top}
    .radio-table th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted,#5b6472)}
    .radio-region-btn{cursor:pointer}
    .radio-hit{fill:rgba(255,212,59,.001);cursor:pointer}
    .radio-hit.sel{fill:rgba(255,212,59,.18);stroke:#ffd43b;stroke-width:2}
    .radio-feedback{border-radius:10px;padding:10px 12px;font-size:13px}
    .radio-feedback.ok{background:#e6f4ea;color:#1a7f37}
    .radio-feedback.no{background:#ffe1e1;color:#c1121f}
    .radio-textarea{width:100%;min-height:96px;border:1px solid var(--border,#dce1ec);border-radius:10px;padding:10px;font:inherit;font-size:13px;background:var(--card,#fff);color:inherit;resize:vertical}
    `;
    document.head.appendChild(style);
  }

  const badge = (u) => `<span class="radio-badge ${u}">${U[u] || u}</span>`;
  const regBadge = (r) => `<span class="radio-badge reg">${esc(r)}</span>`;

  function subnav() {
    const cur = st().ui.sub;
    return `<div class="radio-subnav">${SUBS.map(([id, label]) => `<button data-radio-sub="${id}" class="${cur === id ? 'active' : ''}">${label}</button>`).join('')}</div>`;
  }

  // ---- Visualizador reutilizável (híbrido: SVG sintético OU <img src>) ----
  function viewer(imgObj, opts = {}) {
    const inner = imgObj.svg ? imgObj.svg() : `<img src="${esc(imgObj.src)}" class="radio-xray" alt="radiografia"/>`;
    const meta = [imgObj.proj, imgObj.lat].filter(Boolean).join(' · ');
    return `<div class="radio-figure" data-anno="${opts.anno ? 1 : 0}" data-inv="0" data-zoom="0" data-radio-viewer>
      ${inner}
      <div class="radio-viewer-bar">
        <button class="radio-btn ghost sm" data-vw="anno">${opts.anno ? 'Ocultar' : 'Mostrar'} anotação</button>
        <button class="radio-btn ghost sm" data-vw="inv">Inverter</button>
        <button class="radio-btn ghost sm" data-vw="zoom">Zoom</button>
        ${meta ? `<span class="radio-muted" style="margin-left:auto;align-self:center">${esc(meta)}</span>` : ''}
      </div>
    </div>`;
  }
  function wireViewer(scope) {
    scope.querySelectorAll('[data-radio-viewer]').forEach((fig) => {
      fig.querySelectorAll('[data-vw]').forEach((b) => b.onclick = () => {
        const k = b.dataset.vw;
        if (k === 'anno') { const on = fig.dataset.anno === '1'; fig.dataset.anno = on ? '0' : '1'; b.textContent = (on ? 'Mostrar' : 'Ocultar') + ' anotação'; }
        if (k === 'inv') fig.dataset.inv = fig.dataset.inv === '1' ? '0' : '1';
        if (k === 'zoom') fig.dataset.zoom = fig.dataset.zoom === '1' ? '0' : '1';
      });
    });
  }

  // ---------- INÍCIO ----------
  function inicioHtml() {
    const S = st();
    const sod = sinalOfDay(S); save();
    const attempts = S.log.length;
    const acc = attempts ? Math.round(100 * S.log.filter((l) => l.ok).length / attempts) : 0;
    const dueSinais = SINAIS.filter((s) => { const r = S.srs[s.id]; return r && r.attempts > 0 && r.dueISO <= todayISO(); });
    const doneFund = Object.keys(S.progress).length;
    return `<div class="radio-hero">
        <div class="radio-stat"><span class="radio-muted">Tentativas</span><b>${attempts}</b></div>
        <div class="radio-stat"><span class="radio-muted">Acerto</span><b>${acc}%</b></div>
        <div class="radio-stat"><span class="radio-muted">Sinais a revisar</span><b>${dueSinais.length}</b></div>
        <div class="radio-stat"><span class="radio-muted">Módulos vistos</span><b>${doneFund}</b></div>
      </div>
      <div class="radio-grid">
        <div class="radio-card">
          <span class="radio-muted">Sinal do dia</span>
          <h3>${esc(sod.nome)}</h3>
          <p class="radio-muted">${esc(sod.def)}</p>
          <button class="radio-btn wide" data-radio-open-sinal="${sod.id}">Estudar sinal</button>
        </div>
        <div class="radio-card">
          <span class="radio-muted">Comece por aqui</span>
          <h3>Como ler uma radiografia</h3>
          <p class="radio-muted">Densidades → qualidade técnica → método ABCDE. A base antes de diagnosticar.</p>
          <button class="radio-btn wide" data-radio-goto="fundamentos">Ir para Fundamentos</button>
        </div>
        <div class="radio-card">
          <span class="radio-muted">Treine a interpretação</span>
          <h3>Casos guiados</h3>
          <p class="radio-muted">Fluxo completo: técnica → detecção → localização → laudo. O diagnóstico só aparece no fim.</p>
          <button class="radio-btn wide" data-radio-goto="casos">Abrir Casos</button>
        </div>
      </div>
      <p class="radio-muted">Build 1 · núcleo de ensino sintético. Esquemas são didáticos (SVG), não radiografias reais — o visualizador já aceita imagens reais quando o banco estiver pronto.</p>`;
  }

  // ---------- FUNDAMENTOS ----------
  function fundamentosHtml() {
    const tab = st().ui.fundTab;
    const tabs = [['fisica', 'Física'], ['densidades', 'Densidades'], ['projecoes', 'Projeções']];
    const nav = `<div class="radio-subnav" style="margin-bottom:4px">${tabs.map(([id, l]) => `<button data-radio-fund="${id}" class="${tab === id ? 'active' : ''}">${l}</button>`).join('')}</div>`;
    let body = '';
    if (tab === 'fisica') {
      body = `<div class="radio-grid">${FISICA.map((f) => `<div class="radio-card"><div class="radio-tags"><span class="radio-tag">${esc(f.tag)}</span></div><h3>${esc(f.t)}</h3><p class="radio-muted">${esc(f.d)}</p></div>`).join('')}</div>
        <button class="radio-btn ghost" data-radio-fund-done="fisica" style="margin-top:12px">Marcar módulo como visto</button>`;
    } else if (tab === 'densidades') {
      body = densidadesHtml();
    } else {
      body = `<p class="radio-muted">A projeção muda a aparência da anatomia — reconhecer isso evita erros (ex.: falsa cardiomegalia no AP).</p>
        <div class="radio-grid">${PROJECOES.map((p) => `<div class="radio-card"><h3>${esc(p.nome)}</h3><p class="radio-muted"><b>Quando:</b> ${esc(p.quando)}</p><p class="radio-muted"><b>Chave:</b> ${esc(p.chave)}</p><div class="radio-tags"><span class="radio-tag">magnificação: ${esc(p.magn)}</span></div></div>`).join('')}</div>
        <button class="radio-btn ghost" data-radio-fund-done="projecoes" style="margin-top:12px">Marcar módulo como visto</button>`;
    }
    return nav + body;
  }
  function densidadesHtml() {
    const rows = DENSIDADES.map((d) => `<div class="radio-dens-row"><span class="radio-dens-swatch" style="background:${d.cor}"></span><div><b>${esc(d.nome)}</b><div class="radio-muted">${esc(d.apar)} — ex.: ${esc(d.ex)}</div></div></div>`).join('');
    const scene = `<svg viewBox="0 0 320 340" class="radio-xray" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="340" fill="#05070a"/>
      <path d="M40 70 C 40 40 120 26 160 26 C 200 26 280 40 280 70 L 292 300 C 250 328 70 328 28 300 Z" fill="#22262b"/>
      <ellipse cx="92" cy="150" rx="34" ry="70" fill="#070a0e"/>
      <ellipse cx="200" cy="150" rx="34" ry="70" fill="#070a0e"/>
      <ellipse cx="178" cy="200" rx="40" ry="46" fill="#5b6672"/>
      <rect x="60" y="104" width="40" height="12" rx="3" fill="#dfe6ee"/>
      <rect x="210" y="96" width="30" height="22" rx="3" fill="#ffffff"/>
      <rect x="30" y="60" width="16" height="60" fill="#3a3f45"/>
      <ellipse cx="196" cy="286" rx="16" ry="9" fill="#05070a" stroke="#26303a"/>
      ${DENS_SCENE.map((r) => r.shape === 'ellipse'
        ? `<ellipse class="radio-hit" data-dens="${r.id}" cx="${r.cx}" cy="${r.cy}" rx="${r.rx}" ry="${r.ry}"/>`
        : `<rect class="radio-hit" data-dens="${r.id}" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"/>`).join('')}
    </svg>`;
    return `<div class="radio-two">
      <div>
        <h3 style="margin:0 0 8px">Escala de densidades</h3>
        <div class="radio-dens-list">${rows}</div>
      </div>
      <div>
        <h3 style="margin:0 0 8px">Exercício: toque e classifique</h3>
        <div class="radio-figure" data-anno="1" data-inv="0" data-zoom="0">${scene}</div>
        <div id="radioDensPrompt" class="radio-muted" style="margin:8px 0">Toque em uma estrutura destacada para classificar a densidade.</div>
        <div class="radio-opts" id="radioDensOpts"></div>
        <div id="radioDensFb"></div>
      </div>
    </div>`;
  }

  // ---------- MÉTODO ----------
  function metodoHtml() {
    const tab = st().ui.metodoTab;
    const tabs = [['abcde', 'ABCDE tórax'], ['abcs', 'ABCS osso'], ['qualidade', 'Qualidade técnica']];
    const nav = `<div class="radio-subnav" style="margin-bottom:8px">${tabs.map(([id, l]) => `<button data-radio-metodo="${id}" class="${tab === id ? 'active' : ''}">${l}</button>`).join('')}</div>`;
    if (tab === 'qualidade') {
      return nav + `<p class="radio-muted">Avalie a técnica ANTES de diagnosticar. Marque cada item e conclua o veredito.</p>
        <table class="radio-table"><thead><tr><th>Item</th><th>O que checar</th></tr></thead><tbody>
        ${QUALIDADE_TORAX.map(([t, d]) => `<tr><td><b>${esc(t)}</b></td><td class="radio-muted">${esc(d)}</td></tr>`).join('')}
        </tbody></table>
        <h4 class="radio-teach">Veredito estruturado</h4>
        <div class="radio-tags"><span class="radio-tag">Adequado</span><span class="radio-tag">Limitado, mas interpretável</span><span class="radio-tag">Inadequado</span><span class="radio-tag">Repetição necessária</span></div>`;
    }
    const m = tab === 'abcde' ? METODO_ABCDE : METODO_ABCS;
    return nav + `<h3 style="margin:0">${esc(m.nome)}</h3><p class="radio-muted">${esc(m.sub)}</p>
      <div>${m.steps.map(([k, t, d]) => `<div class="radio-step"><div class="n">${k}</div><div><b>${esc(t)}</b><div class="radio-muted">${esc(d)}</div></div></div>`).join('')}</div>`;
  }

  // ---------- SINAIS ----------
  function sinaisListHtml() {
    const byRegion = {};
    SINAIS.forEach((s) => { (byRegion[s.regiao] = byRegion[s.regiao] || []).push(s); });
    return Object.entries(byRegion).map(([reg, list]) => `
      <h4 class="radio-teach">${esc(reg)}</h4>
      <div class="radio-grid">${list.map((s) => {
        const r = st().srs[s.id];
        const acc = r && r.attempts ? Math.round(100 * r.correct / r.attempts) : null;
        return `<div class="radio-card radio-region-btn" data-radio-open-sinal="${s.id}">
          <div class="radio-tags">${regBadge(s.regiao)}<span class="radio-tag">nível ${s.level}</span>${s.urgente ? badge('alta') : ''}</div>
          <h3>${esc(s.nome)}</h3>
          <p class="radio-muted">${esc(s.def)}</p>
          ${acc != null ? `<span class="radio-muted">seu acerto: ${acc}%</span>` : ''}
        </div>`;
      }).join('')}</div>`).join('');
  }
  function sinalDetailHtml(s) {
    return `<button class="radio-btn ghost sm" data-radio-back-sinal>← Voltar aos sinais</button>
      <div class="radio-two" style="margin-top:12px">
        <div>${viewer({ svg: s.svg }, { anno: false })}
          <p class="radio-muted" style="margin-top:8px">Ative a anotação para ver o achado marcado.</p>
        </div>
        <div class="radio-teach">
          <div class="radio-tags">${regBadge(s.regiao)}<span class="radio-tag">nível ${s.level}</span>${s.urgente ? badge('alta') : ''}</div>
          <h3 style="margin:6px 0 0">${esc(s.nome)}</h3>
          <h4>Definição</h4><p class="radio-muted">${esc(s.def)}</p>
          <h4>Mecanismo</h4><p class="radio-muted">${esc(s.mec)}</p>
          <h4>Doenças associadas</h4><ul class="radio-muted">${s.doencas.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
          <h4>Diagnósticos diferenciais</h4><ul class="radio-muted">${s.ddx.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
          ${s.obs ? `<h4>Observação / limitação</h4><p class="radio-muted">${esc(s.obs)}</p>` : ''}
        </div>
      </div>
      <div class="radio-card" style="margin-top:16px">
        <h4 class="radio-teach" style="margin-top:0">Questão rápida</h4>
        <p style="margin:0 0 8px"><b>${esc(s.quick.q)}</b></p>
        <div class="radio-opts" id="radioSinalOpts">${s.quick.options.map((o, i) => `<button class="radio-opt" data-radio-sinal-opt="${i}">${esc(o)}</button>`).join('')}</div>
        <div id="radioSinalFb"></div>
      </div>`;
  }

  // ---------- CASOS ----------
  function casosListHtml() {
    return `<p class="radio-muted">Fluxo de interpretação completo. Descreva antes de ver o diagnóstico — é assim que se treina competência real.</p>
      <div class="radio-grid">${CASOS.map((c) => `<div class="radio-card radio-region-btn" data-radio-open-caso="${c.id}">
        <div class="radio-tags"><span class="radio-tag">nível ${c.nivel}</span>${badge(c.urgencia)}</div>
        <h3>${esc(c.titulo)}</h3><p class="radio-muted">${esc(c.contexto)}</p>
      </div>`).join('')}</div>`;
  }
  const CASE_STEPS = ['contexto', 'tecnica', 'deteccao', 'local', 'descricao', 'dx', 'urgencia', 'laudo', 'correcao'];
  function caseStep(S, id) { return S.caseState[id] || 0; }
  function casoDetailHtml(c) {
    const S = st();
    const step = caseStep(S, c.id);
    const stName = CASE_STEPS[step];
    let panel = '';
    const imgHtml = viewer(c.image, { anno: step >= 8 });
    if (stName === 'contexto') {
      panel = `<h4 class="radio-teach">Contexto clínico</h4><p>${esc(c.contexto)}</p>
        <p class="radio-muted">Analise a imagem à esquerda (zoom/inverter disponíveis) antes de avançar.</p>
        <button class="radio-btn" data-radio-caso-next>Avaliar a técnica →</button>`;
    } else if (stName === 'tecnica') {
      panel = mcqPanel('Técnica', c.tecnica, 'tec');
    } else if (stName === 'deteccao') {
      panel = `<h4 class="radio-teach">Detecção</h4><p><b>O exame é normal ou alterado?</b></p>
        <div class="radio-opts"><button class="radio-opt" data-radio-caso-det="1">Alterado</button><button class="radio-opt" data-radio-caso-det="0">Normal</button></div>
        <div id="radioCasoFb"></div>`;
    } else if (stName === 'local') {
      panel = mcqPanel('Localização', { q: c.local.q, opts: c.local.opts, a: c.local.opts.indexOf(c.local.a) }, 'loc');
    } else if (stName === 'descricao') {
      panel = `<h4 class="radio-teach">Descrição (padrão radiográfico)</h4><p class="radio-muted">Marque os achados que você identificou:</p>
        <div class="radio-opts" id="radioCasoDesc">${c.descricao.map((d, i) => `<button class="radio-opt" data-radio-desc="${i}">${esc(d)}</button>`).join('')}</div>
        <button class="radio-btn" style="margin-top:10px" data-radio-caso-next>Diagnóstico →</button>`;
    } else if (stName === 'dx') {
      panel = mcqPanel('Diagnóstico', c.dx, 'dx');
    } else if (stName === 'urgencia') {
      panel = `<h4 class="radio-teach">Classificação de urgência</h4><p><b>Qual o grau de urgência?</b></p>
        <div class="radio-opts">${['baixa', 'media', 'alta', 'critica'].map((u) => `<button class="radio-opt" data-radio-caso-urg="${u}">${U[u]}</button>`).join('')}</div>
        <div id="radioCasoFb"></div>`;
    } else if (stName === 'laudo') {
      panel = `<h4 class="radio-teach">Laudo — impressão diagnóstica</h4>
        <p class="radio-muted">Escreva a conclusão. A correção avalia CONCEITOS presentes, não palavras exatas.</p>
        <textarea class="radio-textarea" id="radioLaudo" placeholder="Ex.: Pneumotórax hipertensivo à direita com desvio do mediastino..."></textarea>
        <button class="radio-btn wide" style="margin-top:8px" data-radio-caso-laudo>Corrigir laudo →</button>
        <div id="radioLaudoFb"></div>`;
    } else if (stName === 'correcao') {
      const sim = (c.similares || []).map((sid) => SINAL_MAP[sid]).filter(Boolean);
      panel = `<h4 class="radio-teach">Correção</h4>
        <div class="radio-feedback ok" style="margin-bottom:10px">${esc(c.laudoRef)}</div>
        <p class="radio-muted"><b>Discussão:</b> ${esc(c.correcao)}</p>
        <h4 class="radio-teach">Urgência</h4><p>${badge(c.urgencia)}</p>
        ${sim.length ? `<h4 class="radio-teach">Sinais relacionados</h4><div class="radio-tags">${sim.map((s) => `<button class="radio-tag radio-region-btn" data-radio-open-sinal="${s.id}">${esc(s.nome)}</button>`).join('')}</div>` : ''}
        <button class="radio-btn ghost wide" style="margin-top:12px" data-radio-caso-restart>Refazer caso</button>`;
    }
    const pct = Math.round(100 * step / (CASE_STEPS.length - 1));
    return `<button class="radio-btn ghost sm" data-radio-back-caso>← Voltar aos casos</button>
      <div class="radio-tags" style="margin:10px 0">${badge(c.urgencia)}<span class="radio-tag">etapa ${step + 1}/${CASE_STEPS.length}</span><span class="radio-tag">${pct}%</span></div>
      <div class="radio-two">
        <div>${imgHtml}</div>
        <div id="radioCasoPanel">${panel}</div>
      </div>`;
  }
  function mcqPanel(title, obj, key) {
    return `<h4 class="radio-teach">${esc(title)}</h4><p><b>${esc(obj.q)}</b></p>
      <div class="radio-opts" id="radioMcq">${obj.opts.map((o, i) => `<button class="radio-opt" data-radio-mcq="${i}" data-radio-mcq-key="${key}" data-radio-mcq-a="${obj.a}">${esc(o)}</button>`).join('')}</div>
      <div id="radioCasoFb"></div>`;
  }

  // ---------- DESEMPENHO ----------
  function desempenhoHtml() {
    const S = st();
    const total = S.log.length;
    const ok = S.log.filter((l) => l.ok).length;
    const acc = total ? Math.round(100 * ok / total) : 0;
    // por região (via sinais)
    const regAgg = {};
    SINAIS.forEach((s) => {
      const r = S.srs[s.id]; if (!r || !r.attempts) return;
      const a = regAgg[s.regiao] = regAgg[s.regiao] || { c: 0, n: 0 };
      a.c += r.correct; a.n += r.attempts;
    });
    const regRows = Object.entries(regAgg).map(([reg, a]) => `<tr><td>${esc(reg)}</td><td>${Math.round(100 * a.c / a.n)}%</td><td>${a.n}</td></tr>`).join('') || `<tr><td colspan="3" class="radio-muted">Responda questões de sinais para ver o mapa por região.</td></tr>`;
    const due = SINAIS.filter((s) => { const r = S.srs[s.id]; return r && r.attempts > 0 && r.dueISO <= todayISO(); });
    return `<div class="radio-hero">
        <div class="radio-stat"><span class="radio-muted">Tentativas</span><b>${total}</b></div>
        <div class="radio-stat"><span class="radio-muted">Acerto global</span><b>${acc}%</b></div>
        <div class="radio-stat"><span class="radio-muted">Sinais a revisar hoje</span><b>${due.length}</b></div>
      </div>
      <h4 class="radio-teach">Desempenho por região</h4>
      <table class="radio-table"><thead><tr><th>Região</th><th>Acerto</th><th>Tentativas</th></tr></thead><tbody>${regRows}</tbody></table>
      <h4 class="radio-teach">Fila de revisão espaçada</h4>
      ${due.length ? `<div class="radio-tags">${due.map((s) => `<button class="radio-tag radio-region-btn" data-radio-open-sinal="${s.id}">${esc(s.nome)}</button>`).join('')}</div>` : `<p class="radio-muted">Nada vencido. As revisões são agendadas conforme seu acerto e confiança.</p>`}`;
  }

  // ---------- Roteador de corpo ----------
  function bodyHtml() {
    const S = st();
    switch (S.ui.sub) {
      case 'inicio': return inicioHtml();
      case 'fundamentos': return fundamentosHtml();
      case 'metodo': return metodoHtml();
      case 'sinais': return S.ui.sinalId && SINAL_MAP[S.ui.sinalId] ? sinalDetailHtml(SINAL_MAP[S.ui.sinalId]) : sinaisListHtml();
      case 'casos': return S.ui.casoId && CASO_MAP[S.ui.casoId] ? casoDetailHtml(CASO_MAP[S.ui.casoId]) : casosListHtml();
      case 'desempenho': return desempenhoHtml();
      default: return inicioHtml();
    }
  }
  function go(sub) { const S = st(); S.ui.sub = sub; if (sub !== 'sinais') S.ui.sinalId = null; if (sub !== 'casos') S.ui.casoId = null; save(); mountBody(); }
  function mountBody() {
    const el = root(); if (!el) return;
    el.querySelector('.radio-body').innerHTML = bodyHtml();
    el.querySelectorAll('.radio-subnav [data-radio-sub]').forEach((b) => b.classList.toggle('active', b.dataset.radioSub === st().ui.sub));
    wire();
  }

  // ---------- Eventos ----------
  function confRow(cb) {
    return `<div class="radio-conf" style="margin-top:10px"><span class="radio-muted" style="align-self:center">Confiança:</span>
      ${[['1', 'Muito inseguro'], ['2', 'Inseguro'], ['3', 'Seguro'], ['4', 'Muito seguro']].map(([g, l]) => `<button class="radio-btn ghost sm" data-radio-conf="${g}">${l}</button>`).join('')}</div>`;
  }
  function wire() {
    const el = root();
    el.querySelectorAll('[data-radio-sub]').forEach((b) => b.onclick = () => go(b.dataset.radioSub));
    el.querySelectorAll('[data-radio-goto]').forEach((b) => b.onclick = () => go(b.dataset.radioGoto));
    el.querySelectorAll('[data-radio-open-sinal]').forEach((b) => b.onclick = () => { const S = st(); S.ui.sub = 'sinais'; S.ui.sinalId = b.dataset.radioOpenSinal; save(); mountBody(); });
    el.querySelectorAll('[data-radio-back-sinal]').forEach((b) => b.onclick = () => { st().ui.sinalId = null; save(); mountBody(); });
    el.querySelectorAll('[data-radio-open-caso]').forEach((b) => b.onclick = () => { const S = st(); S.ui.sub = 'casos'; S.ui.casoId = b.dataset.radioOpenCaso; S.caseState[b.dataset.radioOpenCaso] = 0; save(); mountBody(); });
    el.querySelectorAll('[data-radio-back-caso]').forEach((b) => b.onclick = () => { st().ui.casoId = null; save(); mountBody(); });
    el.querySelectorAll('[data-radio-fund]').forEach((b) => b.onclick = () => { st().ui.fundTab = b.dataset.radioFund; save(); mountBody(); });
    el.querySelectorAll('[data-radio-metodo]').forEach((b) => b.onclick = () => { st().ui.metodoTab = b.dataset.radioMetodo; save(); mountBody(); });
    el.querySelectorAll('[data-radio-fund-done]').forEach((b) => b.onclick = () => { st().progress['fund:' + b.dataset.radioFundDone] = todayISO(); save(); b.textContent = 'Módulo marcado ✓'; b.disabled = true; });
    wireViewer(el);
    wireDensidades(el);
    wireSinalQuiz(el);
    wireCaso(el);
  }

  function wireDensidades(el) {
    const hits = el.querySelectorAll('[data-dens]');
    if (!hits.length) return;
    const prompt = el.querySelector('#radioDensPrompt');
    const optsBox = el.querySelector('#radioDensOpts');
    const fb = el.querySelector('#radioDensFb');
    hits.forEach((h) => h.onclick = () => {
      hits.forEach((x) => x.classList.remove('sel')); h.classList.add('sel');
      const region = DENS_SCENE.find((r) => r.id === h.dataset.dens);
      prompt.innerHTML = `<b>${esc(region.label)}</b> — qual a densidade radiográfica?`;
      fb.innerHTML = '';
      optsBox.innerHTML = DENSIDADES.map((d) => `<button class="radio-opt" data-dens-ans="${d.k}">${esc(d.nome)}</button>`).join('');
      optsBox.querySelectorAll('[data-dens-ans]').forEach((b) => b.onclick = () => {
        const ok = b.dataset.densAns === region.ans;
        optsBox.querySelectorAll('button').forEach((x) => { x.disabled = true; if (x.dataset.densAns === region.ans) x.classList.add('correct'); else if (x === b) x.classList.add('wrong'); });
        const ref = DENSIDADES.find((d) => d.k === region.ans);
        fb.innerHTML = `<div class="radio-feedback ${ok ? 'ok' : 'no'}" style="margin-top:8px">${ok ? 'Correto!' : 'Reveja: '} ${esc(region.label)} tem densidade de <b>${esc(ref.nome)}</b> (${esc(ref.apar)}).</div>`;
        const S = st(); logAttempt(S, 'dens:' + region.id, ok, 0); save();
      });
    });
  }

  function wireSinalQuiz(el) {
    const box = el.querySelector('#radioSinalOpts'); if (!box) return;
    const s = SINAL_MAP[st().ui.sinalId]; if (!s) return;
    const fb = el.querySelector('#radioSinalFb');
    box.querySelectorAll('[data-radio-sinal-opt]').forEach((b) => b.onclick = () => {
      const i = +b.dataset.radioSinalOpt;
      const ok = i === s.quick.answer;
      box.querySelectorAll('button').forEach((x, idx) => { x.disabled = true; if (idx === s.quick.answer) x.classList.add('correct'); else if (x === b) x.classList.add('wrong'); });
      fb.innerHTML = `<div class="radio-feedback ${ok ? 'ok' : 'no'}" style="margin-top:8px">${esc(s.quick.exp)}</div>${confRow()}`;
      fb.querySelectorAll('[data-radio-conf]').forEach((cb) => cb.onclick = () => {
        const grade = ok ? (+cb.dataset.radioConf >= 3 ? 5 : 3) : (+cb.dataset.radioConf >= 3 ? 1 : 2);
        const S = st(); const rec = ensureSrs(S, s.id); rec.attempts++; if (ok) rec.correct++;
        scheduleNext(rec, grade, ok); logAttempt(S, s.id, ok, +cb.dataset.radioConf); save();
        fb.querySelector('.radio-conf').outerHTML = `<p class="radio-muted" style="margin-top:8px">Registrado. Próxima revisão: <b>${rec.dueISO}</b>.</p>`;
      });
    });
  }

  function wireCaso(el) {
    const c = CASO_MAP[st().ui.casoId]; if (!c) return;
    const advance = () => { const S = st(); S.caseState[c.id] = Math.min(caseStep(S, c.id) + 1, CASE_STEPS.length - 1); save(); mountBody(); };
    const fb = el.querySelector('#radioCasoFb');
    el.querySelectorAll('[data-radio-caso-next]').forEach((b) => b.onclick = advance);
    el.querySelectorAll('[data-radio-caso-restart]').forEach((b) => b.onclick = () => { st().caseState[c.id] = 0; save(); mountBody(); });
    // MCQ genérico (técnica, localização, diagnóstico)
    el.querySelectorAll('[data-radio-mcq]').forEach((b) => b.onclick = () => {
      const a = +b.dataset.radioMcqA, i = +b.dataset.radioMcq, ok = i === a;
      el.querySelectorAll('[data-radio-mcq]').forEach((x, idx) => { x.disabled = true; if (idx === a) x.classList.add('correct'); else if (x === b) x.classList.add('wrong'); });
      logAttempt(st(), 'caso:' + c.id + ':' + b.dataset.radioMcqKey, ok, 0); save();
      fb.innerHTML = `<div class="radio-feedback ${ok ? 'ok' : 'no'}" style="margin-top:8px">${ok ? 'Correto.' : 'Resposta assinalada em verde.'}</div><button class="radio-btn" style="margin-top:8px" data-radio-caso-next>Continuar →</button>`;
      fb.querySelector('[data-radio-caso-next]').onclick = advance;
    });
    // Detecção
    el.querySelectorAll('[data-radio-caso-det]').forEach((b) => b.onclick = () => {
      const ok = (b.dataset.radioCasoDet === '1') === !!c.alterado;
      el.querySelectorAll('[data-radio-caso-det]').forEach((x) => x.disabled = true);
      b.classList.add(ok ? 'correct' : 'wrong');
      logAttempt(st(), 'caso:' + c.id + ':det', ok, 0); save();
      fb.innerHTML = `<div class="radio-feedback ${ok ? 'ok' : 'no'}" style="margin-top:8px">${ok ? 'Correto — exame alterado.' : 'Atenção: o exame É alterado.'}</div><button class="radio-btn" style="margin-top:8px" data-radio-caso-next>Localizar →</button>`;
      fb.querySelector('[data-radio-caso-next]').onclick = advance;
    });
    // Descrição (múltipla seleção)
    el.querySelectorAll('[data-radio-desc]').forEach((b) => b.onclick = () => b.classList.toggle('correct'));
    // Urgência
    el.querySelectorAll('[data-radio-caso-urg]').forEach((b) => b.onclick = () => {
      const ok = b.dataset.radioCasoUrg === c.urgencia;
      el.querySelectorAll('[data-radio-caso-urg]').forEach((x) => x.disabled = true);
      b.classList.add(ok ? 'correct' : 'wrong');
      logAttempt(st(), 'caso:' + c.id + ':urg', ok, 0); save();
      fb.innerHTML = `<div class="radio-feedback ${ok ? 'ok' : 'no'}" style="margin-top:8px">${ok ? 'Correto.' : 'Urgência correta: ' + U[c.urgencia] + '.'}</div><button class="radio-btn" style="margin-top:8px" data-radio-caso-next>Escrever laudo →</button>`;
      fb.querySelector('[data-radio-caso-next]').onclick = advance;
    });
    // Laudo por conceitos
    const laudoBtn = el.querySelector('[data-radio-caso-laudo]');
    if (laudoBtn) laudoBtn.onclick = () => {
      const txt = (el.querySelector('#radioLaudo').value || '').toLowerCase();
      const hits = c.laudoConceitos.filter((k) => txt.includes(k.toLowerCase()));
      const pct = Math.round(100 * hits.length / c.laudoConceitos.length);
      const missing = c.laudoConceitos.filter((k) => !txt.includes(k.toLowerCase()));
      const fbL = el.querySelector('#radioLaudoFb');
      logAttempt(st(), 'caso:' + c.id + ':laudo', pct >= 60, 0); save();
      fbL.innerHTML = `<div class="radio-feedback ${pct >= 60 ? 'ok' : 'no'}" style="margin-top:10px">Conceitos cobertos: <b>${pct}%</b> (${hits.length}/${c.laudoConceitos.length}).${missing.length ? ' Faltou citar: ' + missing.map(esc).join(', ') + '.' : ''}</div>
        <button class="radio-btn wide" style="margin-top:8px" data-radio-caso-next>Ver correção →</button>`;
      fbL.querySelector('[data-radio-caso-next]').onclick = advance;
    };
  }

  // ---------------------------------------------------------------------------
  // mount
  // ---------------------------------------------------------------------------
  function mount(container, bridge) {
    BRIDGE = bridge;
    injectStyles();
    const S = BRIDGE.getState();
    if (!S.radio) S.radio = defaultState();
    const d = defaultState();
    S.radio.ui = Object.assign({}, d.ui, S.radio.ui);
    ['srs', 'progress', 'caseState'].forEach((k) => { if (!S.radio[k]) S.radio[k] = {}; });
    if (!S.radio.log) S.radio.log = [];
    if (!S.radio.daily) S.radio.daily = d.daily;

    container.innerHTML = `<div class="radio-wrap">
      <div class="section-title" style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div><span class="eyebrow">Radiologia</span><h2 style="margin:0">Radiografia</h2>
        <p class="radio-muted" style="margin:4px 0 0">Aprender a interpretar — densidades, método, sinais e casos guiados. Funciona offline. Esquemas didáticos; visualizador pronto para imagens reais.</p></div>
      </div>
      ${subnav()}
      <div class="radio-body"></div>
    </div>`;
    container.querySelectorAll('.radio-subnav [data-radio-sub]').forEach((b) => b.onclick = () => go(b.dataset.radioSub));
    mountBody();
  }

  window.RadioSim = { mount, defaultState, SINAIS, CASOS };
})();
