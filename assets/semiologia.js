/* ============================================================================
 * SÓqueroMed — Semiologia  (Build 1 / Núcleo de ensino + treino clínico)
 * Módulo autossuficiente, 100% offline. Espelha a arquitetura de EcgSim/RadioSim.
 *
 * Baseado no Método Semio3D e no briefing mestre de plataforma de Semiologia.
 * Princípios: do normal ao patológico · técnica ligada à finalidade · raciocínio
 * probabilístico (LR) · segurança do paciente · red flags · documentação.
 *
 * Seções internas (subnav):
 *   • Início      — visão geral + progresso
 *   • Aulas       — módulos → tópicos (texto corrido, marca-texto, modo foco)
 *   • Manobras    — banco de manobras com finalidade/execução/interpretação/LR + quiz
 *   • Casos       — casos clínicos guiados (representação → hipóteses → red flag → conduta)
 *   • Fichas      — revisão rápida (sequência, achados normais, red flags, prontuário)
 *   • Desempenho  — SRS calibrado por confiança + métricas
 *
 * Integra no planner via window.SemioSim.mount(container, bridge).
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

  let BRIDGE = null;
  const st = () => BRIDGE.getState().semio;
  const save = () => BRIDGE.save();

  // ---------------------------------------------------------------------------
  // 2. BANCO DE MANOBRAS — técnica ligada à finalidade + evidência
  // ---------------------------------------------------------------------------
  const MANOBRAS = [
    {
      id: 'ftv', nome: 'Frêmito toracovocal (FTV)', sistema: 'Respiratório',
      finalidade: 'Avaliar a transmissão da vibração vocal pela parede torácica para diferenciar consolidação (transmite mais) de derrame/pneumotórax (transmite menos).',
      quando: 'Suspeita de doença pleuropulmonar unilateral: pneumonia, derrame, pneumotórax.',
      execucao: 'Palpe com a borda ulnar ou a palma, comparando pontos homólogos dos dois hemitórax, enquanto o paciente repete "trinta e três".',
      positivo: 'Aumentado sobre consolidação; diminuído/abolido sobre derrame pleural ou pneumotórax.',
      erros: 'Não comparar lados homólogos; paciente falando baixo demais; confundir vibração muscular com FTV.',
      lr: 'Isolado tem valor modesto; ganha força combinado (macicez + som brônquico + egofonia = síndrome de consolidação).',
      quiz: { p: 'FTV abolido + percussão maciça "de pedra" + MV abolido na base sugerem:', ops: ['Consolidação', 'Derrame pleural', 'Pneumotórax', 'Asma'], correct: 1, exp: 'Líquido isola a vibração e abafa o som: macicez intensa + FTV/MV abolidos = derrame pleural.' },
    },
    {
      id: 'egofonia', nome: 'Egofonia / broncofonia', sistema: 'Respiratório',
      finalidade: 'Detectar consolidação pela transmissão vocal alterada.',
      quando: 'Suspeita de pneumonia/consolidação.',
      execucao: 'Ausculte enquanto o paciente diz "i" prolongado; na consolidação o "i" soa como "é" (egofonia). Broncofonia = voz mais nítida; pectorilóquia = sussurro audível.',
      positivo: 'Transformação do "i" em "é" sobre a área consolidada.',
      erros: 'Não comparar com área sã; interpretar sobre grandes vias (onde é normal).',
      lr: 'Egofonia tem LR+ em torno de 4–5 para consolidação — um dos sinais úteis do exame torácico.',
      quiz: { p: 'A egofonia (o "i" vira "é") indica principalmente:', ops: ['Derrame', 'Pneumotórax', 'Consolidação pulmonar', 'DPOC'], correct: 2, exp: 'Pulmão sólido transmite melhor a voz — egofonia aponta consolidação.' },
    },
    {
      id: 'murphy', nome: 'Sinal de Murphy', sistema: 'Abdome',
      finalidade: 'Detectar inflamação da vesícula (colecistite aguda).',
      quando: 'Dor em hipocôndrio direito, febre, náusea.',
      execucao: 'Palpe o rebordo costal D na linha hemiclavicular e peça inspiração profunda; positivo se houver parada abrupta da inspiração por dor.',
      positivo: 'Interrupção súbita da inspiração por dor ao contato da vesícula inflamada com os dedos.',
      erros: 'Não pedir inspiração; confundir com dor de parede; não comparar com o lado esquerdo (controle).',
      lr: 'Murphy positivo tem LR+ razoável para colecistite; o Murphy ultrassonográfico é ainda mais específico.',
      quiz: { p: 'Parada inspiratória dolorosa ao palpar o hipocôndrio D sugere:', ops: ['Apendicite', 'Colecistite', 'Pancreatite', 'Pielonefrite'], correct: 1, exp: 'É o sinal de Murphy — inflamação vesicular.' },
    },
    {
      id: 'blumberg', nome: 'Descompressão dolorosa (Blumberg)', sistema: 'Abdome',
      finalidade: 'Detectar irritação peritoneal.',
      quando: 'Suspeita de peritonite/abdome agudo (ex.: apendicite na FID).',
      execucao: 'Comprima lentamente e retire a mão de forma súbita; positivo se a dor à retirada for maior que à compressão.',
      positivo: 'Dor intensa no momento da descompressão brusca.',
      erros: 'Manobra dolorosa e pouco específica; a rigidez involuntária e a percussão dolorosa são mais confiáveis e menos cruéis.',
      lr: 'Blumberg isolado tem valor limitado; rigidez involuntária e dor à tosse/movimento têm melhor desempenho para peritonite.',
      quiz: { p: 'Para peritonite, qual costuma ser MAIS confiável que o Blumberg?', ops: ['Rigidez involuntária', 'Ruídos aumentados', 'Timpanismo', 'Piparote'], correct: 0, exp: 'A rigidez involuntária (defesa reflexa) é mais específica de peritonite.' },
    },
    {
      id: 'macicez-movel', nome: 'Macicez móvel de decúbito', sistema: 'Abdome',
      finalidade: 'Detectar ascite (líquido livre na cavidade).',
      quando: 'Abdome distendido, hepatopatia, ICC, suspeita de ascite.',
      execucao: 'Percuta do umbigo aos flancos marcando a transição timpanismo→macicez; vire o paciente para um lado e repercuta: a linha de macicez se desloca.',
      positivo: 'Deslocamento da interface timpanismo/macicez ao mudar o decúbito.',
      erros: 'Percutir rápido demais; confundir com macicez fixa de massa/bexiga cheia.',
      lr: 'Macicez móvel é o sinal mais sensível de ascite; o piparote é mais específico porém menos sensível.',
      quiz: { p: 'O sinal MAIS sensível para ascite é:', ops: ['Piparote', 'Macicez móvel de decúbito', 'Sinal de Jobert', 'Circulação colateral'], correct: 1, exp: 'A macicez móvel detecta volumes menores que o piparote.' },
    },
    {
      id: 'babinski', nome: 'Sinal de Babinski', sistema: 'Neurológico',
      finalidade: 'Detectar lesão do trato corticoespinhal (1º neurônio motor).',
      quando: 'Suspeita de lesão central (AVC, mielopatia, ELA).',
      execucao: 'Estimule a borda lateral da planta do pé, de trás para frente, com objeto rombo; observe o hálux.',
      positivo: 'Extensão (dorsiflexão) do hálux ± abertura em leque dos dedos.',
      erros: 'Estímulo doloroso demais (gera retirada voluntária); normal até ~2 anos.',
      lr: 'Alta especificidade para lesão piramidal (presente pesa muito); sensibilidade limitada (ausente não exclui).',
      quiz: { p: 'Babinski presente em um adulto indica:', ops: ['Lesão do 2º neurônio', 'Lesão do trato corticoespinhal (1º neurônio)', 'Doença muscular', 'Achado normal'], correct: 1, exp: 'É sinal de 1º neurônio (via piramidal).' },
    },
    {
      id: 'meningeos', nome: 'Sinais meníngeos (rigidez de nuca, Kernig, Brudzinski)', sistema: 'Neurológico',
      finalidade: 'Detectar irritação meníngea (meningite, HSA).',
      quando: 'Febre + cefaleia; cefaleia thunderclap; alteração de consciência.',
      execucao: 'Rigidez: flexão passiva do pescoço. Kernig: extensão do joelho com coxa fletida. Brudzinski: flexão involuntária dos joelhos ao fletir o pescoço.',
      positivo: 'Resistência/dor à flexão da nuca; dor ou flexão reflexa nas manobras.',
      erros: 'Confiar na AUSÊNCIA para excluir meningite — erro grave.',
      lr: 'Sensibilidade BAIXA: ausentes NÃO excluem meningite. Presentes ajudam, mas a decisão de puncionar é clínica.',
      quiz: { p: 'Sobre os sinais meníngeos na meningite do adulto:', ops: ['Ausentes excluem meningite', 'São muito sensíveis', 'Ausentes NÃO excluem meningite', 'Substituem a punção lombar'], correct: 2, exp: 'Têm baixa sensibilidade — ausência não afasta o diagnóstico.' },
    },
    {
      id: 'ortostatica', nome: 'Pressão arterial ortostática', sistema: 'Sinais vitais',
      finalidade: 'Detectar hipotensão ortostática (causa de tontura, síncope, quedas).',
      quando: 'Tontura postural, síncope, idoso em uso de anti-hipertensivo/diurético, suspeita de hipovolemia.',
      execucao: 'Meça PA e FC deitado; peça para levantar e reafira aos 1 e 3 min.',
      positivo: 'Queda ≥ 20 mmHg na sistólica ou ≥ 10 mmHg na diastólica ao ortostatismo.',
      erros: 'Não esperar o tempo correto; não medir a FC (taquicardia compensatória é pista de hipovolemia).',
      lr: 'Útil sobretudo em idosos e hipovolêmicos; combinar com clínica (mucosas, turgor, débito urinário).',
      quiz: { p: 'Define hipotensão ortostática uma queda sistólica de pelo menos:', ops: ['5 mmHg', '10 mmHg', '20 mmHg', '40 mmHg'], correct: 2, exp: '≥ 20 mmHg na sistólica (ou ≥ 10 na diastólica) ao levantar.' },
    },
    {
      id: 'b3', nome: 'Terceira bulha (B3)', sistema: 'Cardiovascular',
      finalidade: 'Detectar disfunção sistólica / elevação da pressão de enchimento (ICC).',
      quando: 'Dispneia, suspeita de insuficiência cardíaca.',
      execucao: 'Ausculte o foco mitral (ictus) com a campânula, paciente em decúbito lateral esquerdo, na expiração.',
      positivo: 'Som protodiastólico surdo após B2 ("Ken-tu-cky"); em adulto/idoso é patológico.',
      erros: 'Confundir com desdobramento de B2; usar o diafragma (a B3 é grave, ouve-se melhor na campânula).',
      lr: 'B3 em adulto tem LR+ elevado para ICC/disfunção ventricular; pouco sensível (ausência não exclui).',
      quiz: { p: 'B3 em um adulto com dispneia sugere fortemente:', ops: ['Estenose aórtica', 'ICC/disfunção ventricular', 'Pneumotórax', 'Achado normal'], correct: 1, exp: 'B3 patológica pesa muito a favor de insuficiência cardíaca.' },
    },
    {
      id: 'valsalva-cmh', nome: 'Manobras dinâmicas (Valsalva/agachamento)', sistema: 'Cardiovascular',
      finalidade: 'Diferenciar sopros pela resposta à variação de retorno venoso e pós-carga.',
      quando: 'Caracterização de qualquer sopro; suspeita de cardiomiopatia hipertrófica (CMH) ou prolapso mitral.',
      execucao: 'Valsalva/ortostatismo reduzem o retorno venoso; agachamento/handgrip o aumentam. Ausculte antes e durante.',
      positivo: 'Valsalva AUMENTA o sopro da CMH e do prolapso e DIMINUI quase todos os outros.',
      erros: 'Não padronizar a manobra; auscultar só depois; esquecer que inspiração aumenta sopros do lado direito.',
      lr: 'O aumento com Valsalva é quase específico de CMH/prolapso — pista de cabeceira muito útil.',
      quiz: { p: 'Um sopro que AUMENTA com Valsalva sugere:', ops: ['Estenose aórtica', 'Insuficiência mitral', 'Cardiomiopatia hipertrófica', 'CIV'], correct: 2, exp: '↓ retorno venoso aumenta a obstrução dinâmica da CMH (e o prolapso).' },
    },
  ];
  const MANOBRA_MAP = Object.fromEntries(MANOBRAS.map((m) => [m.id, m]));

  // ---------------------------------------------------------------------------
  // 3. CASOS CLÍNICOS GUIADOS
  //    Fluxo: representação → hipóteses → red flag → conduta (feedback a cada passo)
  // ---------------------------------------------------------------------------
  const CASOS = [
    {
      id: 'caso-dispneia', titulo: 'Dispneia progressiva no idoso', nivel: 'Intermediário', sistema: 'Cardiovascular',
      vinheta: 'Homem, 68 anos, hipertenso, com dispneia aos esforços há 3 semanas, ortopneia (dorme com 3 travesseiros) e edema de tornozelos ao fim do dia. Ao exame: estertores crepitantes em bases, turgência jugular a 45°, B3 no ictus e edema de MMII 2+/4+.',
      repr: { p: 'Qual a melhor representação do problema?',
        ops: [
          'Idoso hipertenso com dispneia aguda e febre — provável pneumonia.',
          'Idoso hipertenso com dispneia progressiva + ortopnéia + turgência jugular + B3 + edema — síndrome congestiva (ICC).',
          'Adulto jovem com dor pleurítica súbita — provável TEP.',
        ], correct: 1, exp: 'A tríade congestiva (ortopneia + turgência + B3 + estertores + edema) define síndrome de insuficiência cardíaca.' },
      hip: { p: 'Qual hipótese principal e qual "não pode passar"?',
        ops: [
          'Principal: ICC descompensada; não-pode-passar: síndrome coronariana como gatilho.',
          'Principal: crise de ansiedade; não-pode-passar: nenhuma.',
          'Principal: DPOC exacerbada; não-pode-passar: rinite.',
        ], correct: 0, exp: 'ICC descompensada é a hipótese; sempre investigar SCA/arritmia/infecção como fatores desencadeantes.' },
      redflag: { p: 'Qual achado é o sinal de alarme mais importante aqui?',
        ops: ['Edema de tornozelo', 'Ortopneia leve', 'Dispneia em repouso com estertores ascendendo (edema agudo)', 'B3'], correct: 2, exp: 'Congestão que ascende com dispneia de repouso indica edema agudo de pulmão — emergência.' },
      conduta: { p: 'Próximo passo mais apropriado à beira do leito?',
        ops: ['Alta com orientação', 'Sinais vitais + SpO₂ + ECG + avaliar necessidade de O₂/diurético e chamar supervisão', 'Apenas solicitar radiografia e aguardar'], correct: 1, exp: 'Estabilizar (O₂, monitorização), ECG para excluir SCA/arritmia e acionar supervisão.' },
    },
    {
      id: 'caso-abdome', titulo: 'Dor abdominal que migra', nivel: 'Básico', sistema: 'Abdome',
      vinheta: 'Mulher, 22 anos, com dor que começou periumbilical há 18h e migrou para a fossa ilíaca direita, com anorexia, náusea e febre baixa. Ao exame: dor e defesa na FID, Blumberg positivo e Rovsing positivo.',
      repr: { p: 'Melhor representação do problema?',
        ops: [
          'Mulher jovem com dor periumbilical que migra para FID + anorexia + febre + irritação peritoneal localizada.',
          'Mulher jovem com dor epigástrica em queimação relacionada a refeições.',
          'Mulher jovem com cólica lombar irradiando para genitália.',
        ], correct: 0, exp: 'Migração periumbilical→FID + anorexia + irritação peritoneal é o roteiro clássico da apendicite.' },
      hip: { p: 'Hipótese principal e diferencial que não pode passar?',
        ops: [
          'Principal: apendicite aguda; não-pode-passar: gravidez ectópica.',
          'Principal: constipação; não-pode-passar: nenhuma.',
          'Principal: gastrite; não-pode-passar: enxaqueca.',
        ], correct: 0, exp: 'Em mulher em idade fértil, sempre afastar gravidez ectópica (β-hCG) e considerar causas ginecológicas.' },
      redflag: { p: 'Qual dado indica maior gravidade?',
        ops: ['Náusea', 'Febre baixa', 'Rigidez involuntária difusa / piora súbita da dor (perfuração)', 'Anorexia'], correct: 2, exp: 'Rigidez difusa/piora súbita sugere perfuração e peritonite generalizada.' },
      conduta: { p: 'Conduta inicial mais apropriada?',
        ops: ['Analgésico e alta', 'Jejum, avaliação cirúrgica, β-hCG e exames; não retardar a avaliação', 'Laxante'], correct: 1, exp: 'Suspeita de apendicite → jejum, β-hCG, avaliação cirúrgica precoce.' },
    },
    {
      id: 'caso-cefaleia', titulo: 'A pior cefaleia da vida', nivel: 'Avançado', sistema: 'Neurológico',
      vinheta: 'Homem, 45 anos, com cefaleia de início súbito e intensidade máxima desde o começo ("como se algo estourasse") há 2h, com náusea e fotofobia. Ao exame: consciência preservada, discreta rigidez de nuca, sem déficit focal.',
      repr: { p: 'Melhor representação do problema?',
        ops: [
          'Cefaleia crônica tensional habitual.',
          'Cefaleia thunderclap (súbita, máxima no início) com sinais meníngeos discretos.',
          'Enxaqueca com aura típica de repetição.',
        ], correct: 1, exp: 'Início súbito e máximo desde o começo = thunderclap, padrão de alto risco.' },
      hip: { p: 'Qual o diagnóstico que não pode ser perdido?',
        ops: ['Cefaleia tensional', 'Hemorragia subaracnóidea (HSA)', 'Sinusite'], correct: 1, exp: 'Thunderclap é HSA até prova em contrário — investigação imediata.' },
      redflag: { p: 'Sobre a rigidez de nuca ausente/discreta, o correto é:',
        ops: ['Sua ausência exclui HSA', 'Sinais meníngeos têm baixa sensibilidade — não excluem', 'Basta observar em casa'], correct: 1, exp: 'Sinais meníngeos podem faltar; a suspeita clínica manda investigar.' },
      conduta: { p: 'Conduta apropriada?',
        ops: ['Analgésico e alta', 'TC de crânio urgente ± punção lombar; acionar supervisão', 'Repouso e reavaliar em 1 semana'], correct: 1, exp: 'TC precoce e, se negativa com forte suspeita, punção lombar.' },
    },
  ];
  const CASO_MAP = Object.fromEntries(CASOS.map((c) => [c.id, c]));

  // ---------------------------------------------------------------------------
  // 4. FICHAS DE REVISÃO RÁPIDA
  // ---------------------------------------------------------------------------
  const FICHAS = [
    { id: 'f-resp', titulo: 'Tórax — síndromes num relance', sistema: 'Respiratório', linhas: [
      ['Consolidação', 'FTV ↑ · macicez · som brônquico + crepitações + egofonia'],
      ['Derrame pleural', 'FTV ↓ · macicez "de pedra" · MV abolido'],
      ['Pneumotórax', 'FTV ↓ · hipertimpanismo · MV abolido'],
      ['Atelectasia', 'MV ↓ · macicez · desvio do mediastino para o lado doente'],
    ], redflag: 'FR > 30, SpO₂ < 90%, musculatura acessória, cianose, hipertimpanismo + desvio de traqueia + instabilidade (pneumotórax hipertensivo).',
      doc: '"Tórax simétrico, expansibilidade preservada, FTV normal, som claro pulmonar, MV presente bilateral sem ruídos adventícios."' },
    { id: 'f-cardio', titulo: 'Ausculta cardíaca essencial', sistema: 'Cardiovascular', linhas: [
      ['B3', 'ICC/disfunção sistólica (adulto)'],
      ['B4', 'ventrículo rígido (HAS, hipertrofia, isquemia)'],
      ['Sopro sistólico p/ carótida', 'estenose aórtica'],
      ['Sopro holossistólico p/ axila', 'insuficiência mitral'],
      ['↑ com Valsalva', 'cardiomiopatia hipertrófica / prolapso'],
    ], redflag: 'Síncope aos esforços + sopro aórtico, sopro diastólico (sempre patológico), sopro novo + febre (endocardite).',
      doc: '"RCR 2T, BNF, sem sopros, sem B3/B4, sem atrito. Pulsos simétricos, perfusão preservada, sem edemas."' },
    { id: 'f-abdome', titulo: 'Abdome — sequência e sinais', sistema: 'Abdome', linhas: [
      ['Ordem', 'Inspeção → Ausculta → Percussão → Palpação'],
      ['Murphy', 'colecistite'],
      ['McBurney/Rovsing', 'apendicite'],
      ['Giordano', 'pielonefrite/cólica renal'],
      ['Macicez móvel', 'ascite'],
    ], redflag: 'Rigidez difusa, dor desproporcional ao exame (isquemia mesentérica), massa pulsátil (aneurisma), instabilidade.',
      doc: '"Abdome plano, RHA+, timpânico, indolor, sem defesa/descompressão. Vísceras não palpáveis. Sem ascite."' },
    { id: 'f-neuro', titulo: 'Neuro — 1º × 2º neurônio', sistema: 'Neurológico', linhas: [
      ['1º neurônio (central)', 'hipertonia · hiper-reflexia · Babinski+ · sem atrofia'],
      ['2º neurônio (periférico)', 'hipotonia · hiporreflexia · atrofia · fasciculações'],
      ['Glasgow ≤ 8', 'coma → proteger via aérea'],
      ['Sinais meníngeos', 'baixa sensibilidade — ausência não exclui'],
    ], redflag: 'Anisocoria nova + rebaixamento (herniação), Glasgow ≤ 8, déficit focal súbito (AVC), febre + cefaleia + sinal neurológico.',
      doc: '"Glasgow 15, pupilas isocóricas fotorreagentes, força V simétrica, reflexos normais, Babinski ausente, sem sinais meníngeos, marcha normal."' },
    { id: 'f-vitais', titulo: 'Sinais vitais — armadilhas', sistema: 'Sinais vitais', linhas: [
      ['PA', 'manguito adequado, repouso 5 min, medir 2 braços'],
      ['Ortostática', 'queda ≥ 20/10 mmHg ao levantar'],
      ['FR', 'contar sem avisar; 1º sinal a alterar na deterioração'],
      ['SpO₂', 'checar curva; CO e pele pigmentada enganam'],
    ], redflag: 'FR > 24 mantida, SpO₂ < 90%, diferença de PA > 20 mmHg entre braços, hipotensão + taquicardia (choque).',
      doc: '"PA 120/80 (MSD, sentado), FC 76 rítmico, FR 16, Tax 36,5 °C, SpO₂ 98% em ar ambiente."' },
  ];

  // ---------------------------------------------------------------------------
  // 4b. CORPO SEMIOLÓGICO — figura interativa (SVG original) para estudar sinais
  //     Cada sinal tem um hotspot (x,y) sobre a figura + conteúdo + quiz.
  // ---------------------------------------------------------------------------
  const CORPO_SINAIS = [
    { id: 'facies', nome: 'Fácies', cat: 'Inspeção', x: 110, y: 40,
      oQue: 'Conjunto de expressão e traços do rosto que, em algumas doenças, forma um padrão reconhecível.',
      comoPesquisar: 'Observe à distância, antes de tocar: simetria, expressividade, edema, cor e o olhar.',
      significado: 'Orienta hipóteses: mixedematosa (hipotireoidismo), basedowiana (hipertireoidismo), em lua cheia (Cushing), parkinsoniana (em máscara), hipocrática (doença grave/terminal).',
      quiz: { p: 'Face inchada, pele seca e pálpebras edemaciadas sugerem qual fácies?', ops: ['Basedowiana', 'Mixedematosa', 'Em lua cheia', 'Parkinsoniana'], correct: 1, exp: 'Fácies mixedematosa = hipotireoidismo.' } },
    { id: 'ictericia', nome: 'Icterícia de esclera', cat: 'Inspeção', x: 99, y: 34,
      oQue: 'Coloração amarelada das escleras e mucosas pelo acúmulo de bilirrubina.',
      comoPesquisar: 'Avalie a esclera sob luz natural (a artificial mascara). Aparece antes na esclera que na pele.',
      significado: 'Detectável clinicamente quando a bilirrubina passa de ~2–3 mg/dL. Causas: hemólise, hepatopatia, obstrução biliar.',
      quiz: { p: 'A icterícia costuma ser percebida PRIMEIRO onde e sob qual luz?', ops: ['Na pele, sob luz artificial', 'Na esclera, sob luz natural', 'Nas unhas, sob qualquer luz', 'Nas palmas, sob luz azul'], correct: 1, exp: 'Esclera + luz natural — a luz artificial pode mascarar o amarelo.' } },
    { id: 'jugular', nome: 'Turgência jugular', cat: 'Inspeção', x: 128, y: 76,
      oQue: 'Estimativa visual da pressão venosa central pela distensão da veia jugular interna.',
      comoPesquisar: 'Paciente a 45°, cabeça levemente virada; observe o ponto máximo de pulsação em relação ao ângulo esternal.',
      significado: 'Turgência a 45° indica pressão venosa elevada → congestão sistêmica (ICC direita, tamponamento, cor pulmonale).',
      quiz: { p: 'Em que angulação o paciente deve ficar para avaliar a turgência jugular?', ops: ['0° (deitado)', '45°', '90° (sentado ereto)', 'Em pé'], correct: 1, exp: 'A 45° — referência clássica para estimar a pressão venosa.' } },
    { id: 'tireoide', nome: 'Tireoide / bócio', cat: 'Palpação', x: 92, y: 80,
      oQue: 'Avaliação do volume, consistência e mobilidade da glândula tireoide.',
      comoPesquisar: 'Palpe por trás ou por frente e peça ao paciente para deglutir: a tireoide sobe com a deglutição (diferencia de outros nódulos cervicais).',
      significado: 'Aumento difuso (bócio), nódulos, dor (tireoidite). Sopro sobre a glândula sugere hiperfluxo (Graves).',
      quiz: { p: 'O que confirma que uma massa cervical é tireoidiana?', ops: ['Some à vitropressão', 'Sobe com a deglutição', 'É pulsátil', 'Não é palpável'], correct: 1, exp: 'A tireoide se eleva com a deglutição.' } },
    { id: 'aranha', nome: 'Aranha vascular (spider)', cat: 'Inspeção', x: 112, y: 116,
      oQue: 'Telangiectasia com arteríola central e finos vasos radiados, que empalidece à compressão central.',
      comoPesquisar: 'Comprima o ponto central: os vasos somem e enchem do centro para fora ao soltar.',
      significado: 'No território da veia cava superior, em número aumentado, sugere hepatopatia crônica/hiperestrogenismo (também gestação).',
      quiz: { p: 'Ao comprimir o centro de uma aranha vascular, os vasos radiados:', ops: ['Ficam mais visíveis', 'Empalidecem e reenchem do centro', 'Não mudam', 'Ficam roxos'], correct: 1, exp: 'A arteríola central alimenta os vasos — comprimindo, eles somem.' } },
    { id: 'ictus', nome: 'Ictus cordis', cat: 'Palpação', x: 133, y: 150,
      oQue: 'Impulso apical do ventrículo esquerdo palpável na parede torácica.',
      comoPesquisar: 'Palpe o 5º EIC na linha hemiclavicular; localize, meça a extensão e o caráter.',
      significado: 'Desviado para baixo/esquerda e amplo → dilatação (sobrecarga de volume); sustentado sem desvio → hipertrofia (sobrecarga de pressão).',
      quiz: { p: 'Ictus desviado para baixo e para a esquerda, amplo e difuso indica:', ops: ['Hipertrofia por sobrecarga de pressão', 'Dilatação por sobrecarga de volume', 'Coração normal', 'Derrame pericárdico'], correct: 1, exp: 'Deslocamento + amplitude = dilatação do VE (volume).' } },
    { id: 'ascite', nome: 'Ascite', cat: 'Percussão', x: 110, y: 210,
      oQue: 'Líquido livre na cavidade peritoneal.',
      comoPesquisar: 'Macicez móvel de decúbito (mais sensível): a interface timpanismo/macicez desloca ao virar o paciente. Piparote é mais específico, menos sensível.',
      significado: 'Hipertensão portal (cirrose), ICC, síndrome nefrótica, carcinomatose. Sinal semilunar de macicez em flancos.',
      quiz: { p: 'Qual manobra é a MAIS sensível para detectar ascite?', ops: ['Piparote', 'Macicez móvel de decúbito', 'Circulação colateral', 'Sinal de Murphy'], correct: 1, exp: 'A macicez móvel detecta volumes menores que o piparote.' } },
    { id: 'baqueteamento', nome: 'Baqueteamento digital', cat: 'Inspeção', x: 32, y: 300,
      oQue: 'Alargamento das falanges distais com perda do ângulo ungueal (>180°).',
      comoPesquisar: 'Sinal de Schamroth: unir o dorso das unhas dos indicadores — o losango normal desaparece no baqueteamento.',
      significado: 'Hipoxemia crônica, doenças pulmonares (fibrose, câncer, bronquiectasia), cardiopatias cianóticas, hepatopatia.',
      quiz: { p: 'O sinal de Schamroth positivo (perda do losango entre as unhas) indica:', ops: ['Cianose periférica', 'Baqueteamento digital', 'Edema', 'Icterícia'], correct: 1, exp: 'A perda do losango de Schamroth confirma baqueteamento.' } },
    { id: 'perfusao', nome: 'Enchimento capilar', cat: 'Palpação', x: 188, y: 300,
      oQue: 'Tempo para o leito ungueal reperfundir após compressão.',
      comoPesquisar: 'Comprima a polpa/unha por ~5 s, solte e conte o tempo de retorno da cor.',
      significado: 'Normal ≤ 2 s. Prolongado sugere má perfusão periférica (choque, desidratação, vasoconstrição/frio).',
      quiz: { p: 'Qual é o tempo de enchimento capilar considerado normal?', ops: ['≤ 2 segundos', '≤ 5 segundos', '≤ 8 segundos', 'Não importa o tempo'], correct: 0, exp: 'Até ~2 s é normal; acima sugere hipoperfusão.' } },
    { id: 'edema', nome: 'Edema de MMII (cacifo)', cat: 'Palpação', x: 96, y: 415,
      oQue: 'Acúmulo de líquido no interstício, pesquisado pela digitopressão.',
      comoPesquisar: 'Pressione a região pré-tibial/maleolar contra o osso por alguns segundos; observe a depressão (cacifo/godet) e gradue de 1+ a 4+.',
      significado: 'Bilateral → causa sistêmica (ICC, hepatopatia, nefropatia). Unilateral com dor/calor → suspeitar TVP.',
      quiz: { p: 'Edema UNILATERAL de membro inferior com dor e calor deve levantar suspeita de:', ops: ['ICC', 'Síndrome nefrótica', 'Trombose venosa profunda', 'Cirrose'], correct: 2, exp: 'Assimetria + dor/calor = pensar em TVP.' } },
    // ---- anteriores adicionais ----
    { id: 'cianose-central', nome: 'Cianose central', cat: 'Inspeção', view: 'ant', x: 110, y: 53,
      oQue: 'Coloração azulada de lábios, língua e mucosas por hipoxemia (Hb reduzida > 5 g/dL).',
      comoPesquisar: 'Observe lábios e língua sob boa luz. Central = mucosas quentes; periférica = extremidades frias.',
      significado: 'Central aponta doença cardiopulmonar (hipoxemia arterial ou shunt). Diferente da periférica, que é por má perfusão/frio.',
      quiz: { p: 'Cianose de lábios e LÍNGUA, com extremidades quentes, é do tipo:', ops: ['Periférica', 'Central', 'Fisiológica', 'Por frio'], correct: 1, exp: 'Língua/mucosas acometidas = cianose central (hipoxemia).' } },
    { id: 'linfonodo-cervical', nome: 'Linfonodos cervicais', cat: 'Palpação', view: 'ant', x: 138, y: 70,
      oQue: 'Cadeias linfáticas do pescoço; avalia-se tamanho, consistência, mobilidade e dor.',
      comoPesquisar: 'Palpe com as polpas em movimentos circulares, bilateral e comparativo, percorrendo as cadeias.',
      significado: 'Doloroso, móvel e fibroelástico → inflamatório/infeccioso. Endurecido, aderido e indolor → alerta para neoplasia.',
      quiz: { p: 'Qual conjunto de características do linfonodo mais preocupa por malignidade?', ops: ['Doloroso e móvel', 'Endurecido, aderido e indolor', 'Fibroelástico e pequeno', 'Quente e flutuante'], correct: 1, exp: 'Pétreo, fixo e indolor sugere neoplasia.' } },
    { id: 'circulacao-colateral', nome: 'Circulação colateral', cat: 'Inspeção', view: 'ant', x: 110, y: 176,
      oQue: 'Veias dilatadas visíveis na parede abdominal por desvio de fluxo.',
      comoPesquisar: 'Inspeção; a manobra de esvaziamento venoso mostra o sentido do fluxo (afastando-se do umbigo na porta).',
      significado: 'Padrão "cabeça de medusa" (irradiando do umbigo) sugere hipertensão portal; padrão em cava indica obstrução da veia cava.',
      quiz: { p: 'Circulação colateral em "cabeça de medusa" ao redor do umbigo sugere:', ops: ['Obstrução de cava inferior', 'Hipertensão portal', 'Trombose de MMII', 'Aneurisma de aorta'], correct: 1, exp: 'Fluxo irradiando do umbigo = hipertensão portal.' } },
    { id: 'hepatomegalia', nome: 'Hepatomegalia', cat: 'Palpação', view: 'ant', x: 128, y: 196,
      oQue: 'Aumento do fígado, avaliado por palpação da borda e percussão do limite superior.',
      comoPesquisar: 'Palpe subindo da fossa ilíaca D ao rebordo costal pedindo inspiração; meça a que cm do RCD e descreva a borda.',
      significado: 'Lisa e dolorosa → congestão (ICC)/hepatite; nodular e endurecida → cirrose/neoplasia. Sempre confirmar com percussão (evita falso aumento por rebaixamento).',
      quiz: { p: 'Fígado palpável 4 cm do RCD, borda nodular e endurecida, sugere:', ops: ['Congestão por ICC', 'Cirrose/neoplasia', 'Hepatite aguda', 'Fígado normal'], correct: 1, exp: 'Superfície nodular e dura aponta doença crônica/neoplásica.' } },
    { id: 'esplenomegalia', nome: 'Esplenomegalia', cat: 'Palpação', view: 'ant', x: 92, y: 196,
      oQue: 'Aumento do baço, que normalmente NÃO é palpável.',
      comoPesquisar: 'Palpe do QID em direção ao hipocôndrio E na inspiração; se difícil, use o decúbito lateral direito (Schuster). Percuta o espaço de Traube.',
      significado: 'Baço palpável já indica aumento (≈2–3×). Causas: hipertensão portal, infecções, doenças hematológicas.',
      quiz: { p: 'Sobre o baço no exame físico:', ops: ['É palpável normalmente', 'Só se torna palpável quando bem aumentado', 'Nunca é palpável mesmo aumentado', 'É percutido no epigástrio'], correct: 1, exp: 'O baço normal não é palpável; palpá-lo já significa aumento.' } },
    { id: 'eritema-palmar', nome: 'Eritema palmar', cat: 'Inspeção', view: 'ant', x: 176, y: 320,
      oQue: 'Vermelhidão simétrica das eminências tenar e hipotenar, poupando o centro da palma.',
      comoPesquisar: 'Inspeção das palmas; empalidece à pressão e retorna.',
      significado: 'Associado a hepatopatia crônica e hiperestrogenismo (também gestação e hipertireoidismo). Compõe os estigmas de doença hepática com aranhas vasculares.',
      quiz: { p: 'Eritema palmar + aranhas vasculares em homem de meia-idade sugere:', ops: ['Anemia', 'Estigmas de hepatopatia crônica', 'Insuficiência renal', 'Hipotireoidismo'], correct: 1, exp: 'Ambos são estigmas de hepatopatia/hiperestrogenismo.' } },
    { id: 'tremor', nome: 'Tremor / flapping', cat: 'Inspeção', view: 'ant', x: 48, y: 270,
      oQue: 'Movimento involuntário oscilatório; o flapping (asterixis) é a perda súbita e intermitente do tônus.',
      comoPesquisar: 'Peça para estender os braços e dorsifletir as mãos ("parar o trânsito"): no asterixis surgem quedas bruscas em batida de asa.',
      significado: 'Asterixis → encefalopatia metabólica (hepática, urêmica, hipercápnica). Tremor de repouso → parkinsonismo; tremor de ação → essencial/cerebelar.',
      quiz: { p: 'O "flapping" (asterixis) com as mãos estendidas indica principalmente:', ops: ['Parkinson', 'Encefalopatia metabólica', 'Ansiedade', 'Hipertireoidismo'], correct: 1, exp: 'Asterixis aponta encefalopatia (hepática, urêmica, hipercápnica).' } },
    { id: 'varizes', nome: 'Varizes / insuficiência venosa', cat: 'Inspeção', view: 'ant', x: 128, y: 378,
      oQue: 'Veias superficiais dilatadas e tortuosas por incompetência valvular.',
      comoPesquisar: 'Inspeção com o paciente em pé (as varizes ingurgitam). Avalie hiperpigmentação ocre, edema e úlceras maleolares.',
      significado: 'Insuficiência venosa crônica; complica com dermatite ocre, lipodermatoesclerose e úlcera venosa (maléolo medial).',
      quiz: { p: 'A úlcera da insuficiência venosa crônica localiza-se tipicamente:', ops: ['Ponta dos dedos', 'Maléolo medial', 'Calcâneo', 'Dorso do pé'], correct: 1, exp: 'Úlcera venosa é clássica no maléolo medial.' } },
    { id: 'tvp-panturrilha', nome: 'Sinais de TVP (panturrilha)', cat: 'Palpação', view: 'ant', x: 118, y: 420,
      oQue: 'Achados de trombose venosa profunda: assimetria, dor, calor e empastamento da panturrilha.',
      comoPesquisar: 'Meça a circunferência das duas panturrilhas; palpe empastamento. O sinal de Homans (dor à dorsiflexão) tem baixo valor.',
      significado: 'Suspeita clínica exige escore (Wells) e exame de imagem — o exame físico isolado NÃO exclui TVP.',
      quiz: { p: 'Sobre o sinal de Homans para TVP, o correto é:', ops: ['Confirma TVP se positivo', 'Exclui TVP se negativo', 'Tem baixo valor diagnóstico isolado', 'Substitui o Doppler'], correct: 2, exp: 'Homans é pouco sensível/específico; não decide sozinho.' } },
    // ---- posteriores ----
    { id: 'linfonodo-supraclavicular', nome: 'Linfonodo supraclavicular (Virchow)', cat: 'Palpação', view: 'post', x: 130, y: 92,
      oQue: 'Gânglio na fossa supraclavicular esquerda (gânglio de Virchow / sinal de Troisier).',
      comoPesquisar: 'Palpe a fossa supraclavicular pedindo ao paciente para inspirar/fazer Valsalva, que traz o gânglio à superfície.',
      significado: 'Adenopatia supraclavicular E é sinal de alarme para neoplasia abdominal/torácica (estômago, pâncreas, pulmão).',
      quiz: { p: 'Um gânglio endurecido em fossa supraclavicular esquerda (Virchow) sugere:', ops: ['Infecção de garganta', 'Neoplasia abdominal/torácica', 'Reação vacinal', 'Achado normal'], correct: 1, exp: 'Gânglio de Virchow é bandeira vermelha para malignidade.' } },
    { id: 'expansibilidade-posterior', nome: 'Expansibilidade torácica', cat: 'Palpação', view: 'post', x: 88, y: 150,
      oQue: 'Amplitude de expansão do tórax na respiração, avaliada no dorso.',
      comoPesquisar: 'Apoie as mãos nas bases com os polegares na coluna e peça inspiração profunda; observe a simetria da abertura dos polegares.',
      significado: 'Redução unilateral no lado doente: derrame, consolidação extensa, pneumotórax, atelectasia.',
      quiz: { p: 'Expansibilidade reduzida em UM hemitórax indica que a doença está:', ops: ['No lado que expande mais', 'No lado que expande menos', 'Nos dois lados', 'Não localiza'], correct: 1, exp: 'O lado doente expande menos.' } },
    { id: 'macicez-base', nome: 'Macicez de base (derrame)', cat: 'Percussão', view: 'post', x: 132, y: 185,
      oQue: 'Som maciço à percussão da base pulmonar, com FTV e MV reduzidos.',
      comoPesquisar: 'Percuta do ápice à base comparando lados; delimite o nível superior da macicez.',
      significado: 'Macicez basal + FTV/MV abolidos = derrame pleural. Diferencia-se da consolidação (que tem FTV aumentado e som brônquico).',
      quiz: { p: 'Base com macicez + FTV abolido + MV abolido corresponde a:', ops: ['Consolidação', 'Derrame pleural', 'Pneumotórax', 'Asma'], correct: 1, exp: 'Líquido abole vibração e som: derrame.' } },
    { id: 'escoliose', nome: 'Escoliose / curvaturas', cat: 'Inspeção', view: 'post', x: 110, y: 162,
      oQue: 'Desvio lateral da coluna; avaliam-se também cifose e lordose.',
      comoPesquisar: 'Inspecione a coluna com o paciente em pé e no teste de Adams (inclinação anterior), que revela a gibosidade da escoliose estrutural.',
      significado: 'Escoliose estrutural mantém a gibosidade na flexão; a postural desaparece. Cifose acentuada no idoso sugere fraturas vertebrais/osteoporose.',
      quiz: { p: 'No teste de Adams, a escoliose ESTRUTURAL se caracteriza por:', ops: ['Sumir na inclinação', 'Manter a gibosidade na inclinação', 'Só aparecer deitado', 'Não ter relação com a coluna'], correct: 1, exp: 'A gibosidade persiste na flexão anterior (escoliose estrutural).' } },
    { id: 'giordano', nome: 'Punho-percussão lombar (Giordano)', cat: 'Percussão', view: 'post', x: 128, y: 208,
      oQue: 'Percussão da loja renal para pesquisar dor.',
      comoPesquisar: 'Com a mão espalmada sobre o ângulo costovertebral, golpeie com a borda ulnar da outra mão; compare os lados.',
      significado: 'Giordano positivo (dor) sugere acometimento renal — pielonefrite, cólica/obstrução ureteral.',
      quiz: { p: 'Giordano (punho-percussão lombar) positivo sugere:', ops: ['Apendicite', 'Colecistite', 'Pielonefrite / doença renal', 'Pancreatite'], correct: 2, exp: 'Dor na loja renal aponta rim (pielonefrite, obstrução).' } },
    { id: 'edema-sacral', nome: 'Edema sacral', cat: 'Palpação', view: 'post', x: 110, y: 236,
      oQue: 'Edema que se acumula no sacro do paciente acamado (área mais baixa).',
      comoPesquisar: 'No paciente deitado, pesquise cacifo na região sacral, não só nos tornozelos.',
      significado: 'No acamado, o edema gravitacional migra para o sacro; sua ausência nos MMII não exclui sobrecarga de volume.',
      quiz: { p: 'Em um paciente acamado, onde o edema por sobrecarga tende a se acumular?', ops: ['Face', 'Região sacral', 'Mãos', 'Ápices pulmonares'], correct: 1, exp: 'A gravidade leva o edema para o sacro no acamado.' } },
    { id: 'lesao-pressao', nome: 'Lesão por pressão', cat: 'Inspeção', view: 'post', x: 110, y: 250,
      oQue: 'Dano à pele/tecidos sobre proeminências ósseas por pressão prolongada.',
      comoPesquisar: 'Inspecione sacro, calcâneos, trocânteres e occipício. Estágio 1 = eritema que NÃO empalidece à digitopressão.',
      significado: 'Marcador de imobilidade e risco assistencial; prevenção com mudança de decúbito. Eritema não-branqueável já é estágio 1.',
      quiz: { p: 'Eritema que NÃO empalidece à digitopressão sobre o sacro indica lesão por pressão:', ops: ['Estágio 1', 'Apenas pele normal', 'Estágio 4', 'Cicatrizada'], correct: 0, exp: 'Eritema não-branqueável = estágio 1.' } },
    // ---- vista MÃOS (zoom) ----
    { id: 'cianose-periferica', nome: 'Cianose periférica', cat: 'Inspeção', view: 'maos', x: 108, y: 60,
      oQue: 'Coloração azulada restrita às extremidades, que costumam estar frias.',
      comoPesquisar: 'Compare a cor das pontas dos dedos com as mucosas; aqueça a mão — a periférica melhora, a central não.',
      significado: 'Por má perfusão/vasoconstrição (frio, choque, insuficiência arterial). Mucosas normais a diferenciam da central (hipoxemia).',
      quiz: { p: 'Cianose apenas nas extremidades frias, com mucosas rosadas, é do tipo:', ops: ['Central', 'Periférica', 'Mista obrigatória', 'Fisiológica em adulto'], correct: 1, exp: 'Extremidades frias + mucosas normais = periférica (perfusão).' } },
    { id: 'leuconiquia', nome: 'Leuconíquia', cat: 'Inspeção', view: 'maos', x: 86, y: 74,
      oQue: 'Esbranquiçamento das unhas (difuso ou em faixas, como linhas de Muehrcke).',
      comoPesquisar: 'Inspecione o leito ungueal sob boa luz, sem esmalte.',
      significado: 'Leuconíquia difusa associa-se a hipoalbuminemia (hepatopatia, síndrome nefrótica, desnutrição).',
      quiz: { p: 'Unhas difusamente esbranquiçadas (leuconíquia) associam-se a:', ops: ['Hipoalbuminemia', 'Hipertensão', 'Hipertireoidismo', 'Anemia ferropriva'], correct: 0, exp: 'Leuconíquia difusa reflete hipoalbuminemia.' } },
    { id: 'coiloniquia', nome: 'Coiloníquia (unha em colher)', cat: 'Inspeção', view: 'maos', x: 130, y: 70,
      oQue: 'Unha côncava, "em colher", capaz de reter uma gota d\'água.',
      comoPesquisar: 'Inspeção de perfil; a concavidade central é evidente.',
      significado: 'Clássica da anemia ferropriva (também hemocromatose, trauma ocupacional).',
      quiz: { p: 'A coiloníquia (unha em colher) é clássica de qual condição?', ops: ['Anemia ferropriva', 'Endocardite', 'Cirrose', 'Hipotireoidismo'], correct: 0, exp: 'Unha em colher = deficiência de ferro.' } },
    { id: 'splinter', nome: 'Hemorragias em estilha', cat: 'Inspeção', view: 'maos', x: 151, y: 90,
      oQue: 'Finas linhas avermelhadas/acastanhadas longitudinais sob a unha (microêmbolos).',
      comoPesquisar: 'Inspecione o leito ungueal; são lineares, no sentido do crescimento da unha.',
      significado: 'Podem ser fenômeno embólico da endocardite infecciosa (mas também trauma comum). Somam-se a Osler, Janeway e Roth.',
      quiz: { p: 'Hemorragias em estilha somadas a febre e sopro novo devem lembrar:', ops: ['Trauma isolado', 'Endocardite infecciosa', 'Anemia', 'Psoríase'], correct: 1, exp: 'No contexto de febre + sopro, sugerem endocardite.' } },
    { id: 'osler-janeway', nome: 'Nódulos de Osler / lesões de Janeway', cat: 'Inspeção', view: 'maos', x: 112, y: 195,
      oQue: 'Fenômenos periféricos da endocardite: Osler = nódulos DOLOROSOS na polpa digital; Janeway = máculas INDOLORES em palmas/plantas.',
      comoPesquisar: 'Inspeção e palpação da polpa dos dedos e das palmas.',
      significado: 'Compõem os critérios de Duke (menores). Osler dói (imunológico); Janeway não dói (embólico).',
      quiz: { p: 'Nódulos DOLOROSOS na polpa dos dedos na endocardite são:', ops: ['Lesões de Janeway', 'Nódulos de Osler', 'Manchas de Roth', 'Petéquias'], correct: 1, exp: 'Osler = dolorosos ("Osler = Ouch"); Janeway = indolores.' } },
    { id: 'dupuytren', nome: 'Contratura de Dupuytren', cat: 'Palpação', view: 'maos', x: 90, y: 205,
      oQue: 'Espessamento e retração da fáscia palmar, fletindo tipicamente o 4º e 5º dedos.',
      comoPesquisar: 'Palpe cordões fibrosos na palma; peça extensão dos dedos (fica limitada).',
      significado: 'Associada a etilismo/hepatopatia, diabetes e predisposição genética.',
      quiz: { p: 'Retração fibrosa da fáscia palmar com flexão do 4º/5º dedos é:', ops: ['Contratura de Dupuytren', 'Baqueteamento', 'Coiloníquia', 'Artrite'], correct: 0, exp: 'É a contratura de Dupuytren (ligada a etilismo/DM).' } },
    // ---- vista CABEÇA/OLHOS (zoom) ----
    { id: 'palidez-conjuntival', nome: 'Palidez conjuntival', cat: 'Inspeção', view: 'cabeca', x: 92, y: 108,
      oQue: 'Redução da coloração rósea da conjuntiva palpebral inferior.',
      comoPesquisar: 'Everta suavemente a pálpebra inferior e compare com o esperado sob luz natural.',
      significado: 'Sugere anemia; a palidez conjuntival tem melhor correlação clínica do que a palidez cutânea isolada.',
      quiz: { p: 'A palidez avaliada na conjuntiva palpebral inferior sugere:', ops: ['Icterícia', 'Anemia', 'Cianose', 'Desidratação'], correct: 1, exp: 'Palidez conjuntival aponta anemia.' } },
    { id: 'arco-corneano', nome: 'Arco corneano (gerontoxon)', cat: 'Inspeção', view: 'cabeca', x: 148, y: 96,
      oQue: 'Anel branco-acinzentado na periferia da córnea, separado do limbo por faixa clara.',
      comoPesquisar: 'Inspeção da córnea; é periférico e bilateral.',
      significado: 'No idoso é senil (benigno); antes dos ~45 anos (arcus juvenil) levanta dislipidemia.',
      quiz: { p: 'Arco corneano em paciente JOVEM (<45 anos) sugere:', ops: ['Envelhecimento normal', 'Dislipidemia', 'Glaucoma', 'Catarata'], correct: 1, exp: 'Arcus precoce → investigar dislipidemia.' } },
    { id: 'xantelasma', nome: 'Xantelasma', cat: 'Inspeção', view: 'cabeca', x: 100, y: 82,
      oQue: 'Placas amareladas de depósito lipídico nas pálpebras, sobretudo no canto medial.',
      comoPesquisar: 'Inspeção das pálpebras.',
      significado: 'Associado a dislipidemia (embora possa ocorrer com lipídios normais); marcador de risco cardiovascular.',
      quiz: { p: 'Placas amareladas nas pálpebras (xantelasma) associam-se a:', ops: ['Anemia', 'Dislipidemia', 'Hipotireoidismo', 'Icterícia'], correct: 1, exp: 'Xantelasma = depósito lipídico, ligado a dislipidemia.' } },
    { id: 'pupilas', nome: 'Pupilas (anisocoria e reflexos)', cat: 'Inspeção', view: 'cabeca', x: 92, y: 94,
      oQue: 'Avaliação de tamanho, simetria e reatividade das pupilas.',
      comoPesquisar: 'Em penumbra, observe simetria; teste o reflexo fotomotor direto e consensual.',
      significado: 'Anisocoria nova + rebaixamento = herniação (emergência). Miose puntiforme → opioides/ponte; midríase fixa → lesão do III par/anóxia.',
      quiz: { p: 'Anisocoria nova com rebaixamento do nível de consciência sugere:', ops: ['Enxaqueca', 'Herniação cerebral', 'Conjuntivite', 'Cansaço'], correct: 1, exp: 'É sinal de herniação — emergência neurológica.' } },
    { id: 'desvio-rima', nome: 'Desvio de rima (paralisia facial)', cat: 'Inspeção', view: 'cabeca', x: 148, y: 165,
      oQue: 'Assimetria da face com desvio da comissura labial para o lado são.',
      comoPesquisar: 'Peça para sorrir, mostrar os dentes, fechar os olhos com força e franzir a testa.',
      significado: 'Central (AVC) POUPA a fronte (enruga dos dois lados); periférica (Bell) acomete a fronte do lado afetado.',
      quiz: { p: 'Paralisia facial que POUPA a fronte (enruga normalmente) é do tipo:', ops: ['Periférica (Bell)', 'Central', 'Miastênica', 'Nenhuma'], correct: 1, exp: 'A central poupa a fronte (inervação bilateral do frontal).' } },
    { id: 'mucosa-hidratacao', nome: 'Hidratação de mucosas', cat: 'Inspeção', view: 'cabeca', x: 120, y: 168,
      oQue: 'Avaliação do estado de hidratação pela mucosa oral e turgor.',
      comoPesquisar: 'Inspecione mucosa oral/língua (secas?) e teste o turgor cutâneo (prega que desfaz lentamente).',
      significado: 'Mucosas secas + turgor lentificado + olhos fundos + oligúria compõem o quadro de desidratação.',
      quiz: { p: 'Mucosa oral seca com turgor cutâneo lentificado indica:', ops: ['Hipervolemia', 'Desidratação', 'Anemia', 'Icterícia'], correct: 1, exp: 'São sinais de desidratação/hipovolemia.' } },
  ];
  const SINAL_MAP = Object.fromEntries(CORPO_SINAIS.map((s) => [s.id, s]));

  // Ilustrações ORIGINAIS (SVG próprio) por sinal — sem uso de imagens de terceiros.
  const F = (vb, inner) => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" class="semio-sign-svg" role="img">${inner}</svg>`;
  const SIGN_FIG = {
    baqueteamento: F('0 0 240 130', `
      <text x="60" y="16" font-size="11" fill="#667085" text-anchor="middle">Normal (~160°)</text>
      <path d="M20 70 L86 70 Q98 70 100 60 L102 52 Q103 46 97 46 L90 47 Q84 48 84 56 L84 70" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <rect x="86" y="48" width="12" height="9" rx="2" fill="#f3e6d6" stroke="#c9ac8f"/>
      <text x="180" y="16" font-size="11" fill="#667085" text-anchor="middle">Baqueteamento (&gt;180°)</text>
      <path d="M140 74 L196 74 Q222 74 226 58 Q228 44 214 40 Q198 37 190 46 Q186 52 186 62 L186 74" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <path d="M196 46 Q214 40 222 52 Q214 62 200 60 Z" fill="#f3e6d6" stroke="#c9ac8f"/>
      <text x="130" y="118" font-size="10" fill="#c0392b" text-anchor="middle">Schamroth: o losango entre as unhas desaparece</text>`),
    coiloniquia: F('0 0 200 110', `
      <text x="55" y="16" font-size="11" fill="#667085" text-anchor="middle">Normal</text>
      <path d="M25 60 q30 -14 60 0 q-30 10 -60 0" fill="#f3e6d6" stroke="#c9ac8f" stroke-width="1.6"/>
      <text x="150" y="16" font-size="11" fill="#667085" text-anchor="middle">Em colher</text>
      <path d="M118 55 q30 18 60 0 q-30 -6 -60 0" fill="#f3e6d6" stroke="#c9ac8f" stroke-width="1.6"/>
      <path d="M150 58 q4 6 0 10" fill="none" stroke="#3a6ea5" stroke-width="1"/>
      <ellipse cx="150" cy="60" rx="9" ry="3" fill="#bcd4ec" opacity=".7"/>
      <text x="100" y="100" font-size="10" fill="#c0392b" text-anchor="middle">Concavidade retém uma gota — anemia ferropriva</text>`),
    leuconiquia: F('0 0 200 100', `
      <ellipse cx="100" cy="50" rx="46" ry="30" fill="#f3e6d6" stroke="#c9ac8f" stroke-width="1.6"/>
      <path d="M70 40 q30 -6 60 0" stroke="#fff" stroke-width="5" fill="none" opacity=".9"/>
      <path d="M66 54 q34 -6 68 0" stroke="#fff" stroke-width="5" fill="none" opacity=".9"/>
      <text x="100" y="92" font-size="10" fill="#667085" text-anchor="middle">Faixas brancas — hipoalbuminemia</text>`),
    splinter: F('0 0 200 100', `
      <ellipse cx="100" cy="48" rx="44" ry="30" fill="#f3e6d6" stroke="#c9ac8f" stroke-width="1.6"/>
      <g stroke="#7a1f1f" stroke-width="2" stroke-linecap="round">
        <line x1="86" y1="30" x2="90" y2="60"/><line x1="100" y1="26" x2="103" y2="62"/><line x1="114" y1="32" x2="116" y2="58"/></g>
      <text x="100" y="92" font-size="10" fill="#667085" text-anchor="middle">Linhas subungueais — microêmbolos</text>`),
    aranha: F('0 0 180 120', `
      <g stroke="#c0392b" stroke-width="1.4"><circle cx="90" cy="60" r="5" fill="#c0392b"/>
      <line x1="90" y1="60" x2="60" y2="40"/><line x1="90" y1="60" x2="120" y2="40"/>
      <line x1="90" y1="60" x2="55" y2="66"/><line x1="90" y1="60" x2="125" y2="66"/>
      <line x1="90" y1="60" x2="70" y2="88"/><line x1="90" y1="60" x2="110" y2="88"/></g>
      <text x="90" y="110" font-size="10" fill="#667085" text-anchor="middle">Arteríola central + vasos radiados</text>`),
    ictericia: F('0 0 200 110', `
      <ellipse cx="100" cy="55" rx="70" ry="34" fill="#f7e9a8" stroke="#c9ac8f" stroke-width="1.6"/>
      <circle cx="100" cy="55" r="17" fill="#7b5a3a"/><circle cx="100" cy="55" r="8" fill="#2b2b2b"/>
      <circle cx="95" cy="51" r="3" fill="#fff"/>
      <text x="100" y="100" font-size="10" fill="#667085" text-anchor="middle">Esclera amarelada (luz natural)</text>`),
    'palidez-conjuntival': F('0 0 200 110', `
      <path d="M40 55 Q100 25 160 55 Q100 85 40 55 Z" fill="#fff" stroke="#c9ac8f" stroke-width="1.6"/>
      <circle cx="100" cy="55" r="15" fill="#7b5a3a"/><circle cx="100" cy="55" r="7" fill="#2b2b2b"/>
      <path d="M60 70 Q100 84 140 70" fill="#f2d9cf" stroke="#d9a99a" stroke-width="6" stroke-linecap="round"/>
      <text x="100" y="102" font-size="10" fill="#667085" text-anchor="middle">Conjuntiva inferior pálida — anemia</text>`),
    'arco-corneano': F('0 0 200 110', `
      <ellipse cx="100" cy="55" rx="70" ry="34" fill="#fdfdfd" stroke="#c9ac8f" stroke-width="1.6"/>
      <circle cx="100" cy="55" r="24" fill="none" stroke="#cbd5e1" stroke-width="5"/>
      <circle cx="100" cy="55" r="15" fill="#7b8ea3"/><circle cx="100" cy="55" r="7" fill="#2b2b2b"/>
      <text x="100" y="100" font-size="10" fill="#667085" text-anchor="middle">Anel periférico — arcus</text>`),
    xantelasma: F('0 0 200 110', `
      <path d="M40 60 Q100 30 160 60 Q100 88 40 60 Z" fill="#fff" stroke="#c9ac8f" stroke-width="1.6"/>
      <circle cx="105" cy="58" r="14" fill="#7b5a3a"/><circle cx="105" cy="58" r="6" fill="#2b2b2b"/>
      <ellipse cx="62" cy="46" rx="12" ry="6" fill="#f2d16b" stroke="#d9b53f"/>
      <text x="100" y="102" font-size="10" fill="#667085" text-anchor="middle">Placa amarelada no canto medial</text>`),
    'cianose-periferica': F('0 0 200 110', `
      <path d="M60 90 L60 40 Q60 26 78 26 Q94 26 94 42 L94 90 Z" fill="#9fb4c9" stroke="#6b8199" stroke-width="1.6"/>
      <path d="M60 40 Q60 26 78 26 Q94 26 94 42 Q77 50 60 40 Z" fill="#5b7fa6"/>
      <rect x="66" y="30" width="14" height="10" rx="3" fill="#3f5d80"/>
      <text x="100" y="102" font-size="10" fill="#667085" text-anchor="middle">Extremidade azulada e fria</text>`),
    edema: F('0 0 200 120', `
      <rect x="40" y="60" width="120" height="34" rx="6" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <circle cx="100" cy="60" r="14" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <path d="M92 60 q8 14 16 0" fill="#d8c2ab"/>
      <text x="100" y="112" font-size="10" fill="#c0392b" text-anchor="middle">Cacifo (godet): depressão que persiste</text>`),
    varizes: F('0 0 140 130', `
      <rect x="52" y="14" width="34" height="104" rx="14" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <path d="M62 22 q14 14 -2 28 q-14 14 4 28 q16 12 -2 28 q-8 8 2 16" fill="none" stroke="#3b5aa0" stroke-width="3.4"/>
      <text x="70" y="128" font-size="10" fill="#667085" text-anchor="middle">Veias tortuosas e dilatadas</text>`),
  };
  const CAT_COR = { 'Inspeção': '#3a6ea5', 'Palpação': '#2f7d6f', 'Percussão': '#b45309', 'Ausculta': '#8b5cf6' };

  const signsInView = (view) => CORPO_SINAIS.filter((s) => (s.view || 'ant') === view);
  const VIEW_LABEL = { ant: 'anterior', post: 'posterior', maos: 'mãos e unhas', cabeca: 'cabeça e olhos' };

  function figureFor(view) {
    const skin = 'fill="#e7d3bf" stroke="#b89c82" stroke-width="1.4" stroke-linejoin="round"';
    if (view === 'maos') {
      return { vb: '0 0 220 260', inner: `<g ${skin}>
        <rect x="66" y="150" width="94" height="86" rx="26"/>
        <rect x="78" y="66" width="18" height="98" rx="9"/>
        <rect x="101" y="52" width="18" height="112" rx="9"/>
        <rect x="124" y="62" width="18" height="102" rx="9"/>
        <rect x="147" y="82" width="17" height="82" rx="8"/>
        <rect x="40" y="150" width="17" height="60" rx="8" transform="rotate(-38 48 178)"/>
        </g>
        <g fill="#f3e6d6" stroke="#c9ac8f" stroke-width="1">
        <rect x="80" y="68" width="14" height="12" rx="4"/>
        <rect x="103" y="54" width="14" height="12" rx="4"/>
        <rect x="126" y="64" width="14" height="12" rx="4"/>
        <rect x="148" y="84" width="13" height="11" rx="4"/>
        </g>` };
    }
    if (view === 'cabeca') {
      return { vb: '0 0 240 220', inner: `<g ${skin}>
        <path d="M58 96 Q60 20 120 18 Q180 20 182 96 Q182 170 120 200 Q58 170 58 96 Z"/>
        <path d="M56 96 q-14 2 -12 20 q2 14 14 12"/>
        <path d="M184 96 q14 2 12 20 q-2 14 -14 12"/>
        </g>
        <g fill="none" stroke="#c9ac8f" stroke-width="1.4">
        <path d="M72 92 Q92 80 112 92 Q92 104 72 92 Z"/>
        <path d="M128 92 Q148 80 168 92 Q148 104 128 92 Z"/>
        <path d="M118 100 L114 138 Q120 142 126 138"/>
        <path d="M100 166 Q120 176 140 166"/>
        <path d="M70 74 Q88 66 108 74"/><path d="M132 74 Q152 66 170 74"/>
        </g>
        <circle cx="92" cy="92" r="5" fill="#5b4636"/><circle cx="148" cy="92" r="5" fill="#5b4636"/>` };
    }
    // corpo inteiro (anterior/posterior) — silhueta simétrica reaproveitada
    const body = `<g ${skin}>
        <ellipse cx="110" cy="40" rx="25" ry="29"/>
        <path d="M101 66 h18 v14 q-9 5 -18 0 Z"/>
        <path d="M74 92 C 82 82 138 82 146 92 L160 132 L150 148 L142 130 L146 214 Q110 230 74 214 L78 130 L70 148 L60 132 Z"/>
        <path d="M60 132 L44 214 L36 296 q10 6 16 0 L58 216 L74 150 Z"/>
        <path d="M160 132 L176 214 L184 296 q-10 6 -16 0 L162 216 L146 150 Z"/>
        <ellipse cx="44" cy="302" rx="11" ry="14"/>
        <ellipse cx="176" cy="302" rx="11" ry="14"/>
        <path d="M78 216 L74 330 L84 430 q9 5 16 0 L104 300 L108 224 Z"/>
        <path d="M142 216 L146 330 L136 430 q-9 5 -16 0 L116 300 L112 224 Z"/>
        <ellipse cx="90" cy="440" rx="12" ry="9"/>
        <ellipse cx="130" cy="440" rx="12" ry="9"/>
      </g>`;
    const detail = view === 'post'
      ? `<g fill="none" stroke="#cbb79f" stroke-width="1.2">
          <line x1="110" y1="96" x2="110" y2="236" stroke-width="1.6"/>
          <path d="M96 120 q-14 6 -18 24"/><path d="M124 120 q14 6 18 24"/>
          <line x1="90" y1="238" x2="130" y2="238"/>
        </g>`
      : `<line x1="110" y1="88" x2="110" y2="222" stroke="#cbb79f" stroke-width="1" stroke-dasharray="3 4"/>`;
    return { vb: '0 0 220 470', inner: body + detail };
  }

  function bodySvg(activeId, testeMode, view) {
    const list = signsInView(view);
    const hotspots = list.map((s, i) => {
      const on = s.id === activeId;
      const cor = CAT_COR[s.cat] || '#2f7d6f';
      const label = testeMode ? '?' : (i + 1);
      return `<g class="semio-hot ${on ? 'on' : ''}" data-sign="${esc(s.id)}" style="cursor:pointer">
        <circle cx="${s.x}" cy="${s.y}" r="${on ? 11 : 9}" fill="${cor}" stroke="#fff" stroke-width="2" opacity="${on ? 1 : .88}"/>
        <text x="${s.x}" y="${s.y + 3.5}" font-size="10" fill="#fff" text-anchor="middle" font-weight="700">${label}</text>
      </g>`;
    }).join('');
    const fig = figureFor(view);
    return `<svg viewBox="${fig.vb}" xmlns="http://www.w3.org/2000/svg" class="semio-body-svg" role="img" aria-label="Figura (${VIEW_LABEL[view] || 'anterior'}) com sinais semiológicos">
      ${fig.inner}${hotspots}
    </svg>`;
  }

  // ---------------------------------------------------------------------------
  // 5. ESTADO PADRÃO + SRS
  // ---------------------------------------------------------------------------
  function defaultState() {
    return {
      ui: { sub: 'inicio', aulaModId: null, aulaTopicoId: null, manobraId: null, casoId: null, focus: false, fichaSistema: 'Todos', corpoSignId: null, corpoTeste: false, corpoTesteId: null, corpoView: 'ant' },
      srs: {}, progress: {}, caseState: {}, highlights: {}, log: [],
      daily: { date: todayISO(), studied: 0 },
    };
  }

  function ensureState() {
    const S = BRIDGE.getState();
    if (!S.semio) S.semio = defaultState();
    const d = defaultState();
    S.semio.ui = Object.assign({}, d.ui, S.semio.ui);
    ['srs', 'progress', 'caseState', 'highlights'].forEach((k) => { if (!S.semio[k]) S.semio[k] = {}; });
    if (!Array.isArray(S.semio.log)) S.semio.log = [];
    if (!S.semio.daily || S.semio.daily.date !== todayISO()) S.semio.daily = { date: todayISO(), studied: 0 };
  }

  function logAttempt(key, ok, conf) {
    const S = st();
    S.log.push({ key, ok: !!ok, conf: conf ?? null, at: Date.now() });
    if (S.log.length > 500) S.log = S.log.slice(-500);
    // SRS calibrado por confiança: acerto confiante espaça mais; erro reduz intervalo.
    const cur = S.srs[key] || { ease: 2.3, interval: 0, due: todayISO(), reps: 0 };
    if (ok) {
      const bump = conf === 'alta' ? 1.0 : conf === 'media' ? 0.7 : 0.4;
      cur.reps += 1;
      cur.ease = clamp(cur.ease + (conf === 'alta' ? 0.05 : 0) - (conf === 'baixa' ? 0.1 : 0), 1.4, 3.0);
      cur.interval = cur.interval < 1 ? 1 : Math.round(cur.interval * cur.ease * bump);
    } else {
      cur.reps = 0; cur.ease = clamp(cur.ease - 0.2, 1.4, 3.0); cur.interval = 0;
    }
    cur.due = addDaysISO(cur.interval);
    S.srs[key] = cur;
  }

  function metrics() {
    const S = st();
    const total = S.log.length;
    const ok = S.log.filter((l) => l.ok).length;
    const acc = total ? Math.round((ok / total) * 100) : 0;
    const dueCount = Object.values(S.srs).filter((s) => s.due <= todayISO()).length;
    // calibração: acerto quando confiança alta vs erro quando confiança alta
    const conf = S.log.filter((l) => l.conf);
    const overconf = conf.filter((l) => l.conf === 'alta' && !l.ok).length;
    return { total, acc, dueCount, overconf };
  }

  // ---------------------------------------------------------------------------
  // 6. RENDER — helpers de bloco de aula
  // ---------------------------------------------------------------------------
  function blockHtml(b, topId, idx) {
    const S = st();
    const marks = (S.highlights[topId] || {});
    switch (b.t) {
      case 'h': return `<h3 class="semio-h">${esc(b.x)}</h3>`;
      case 'tip': return `<div class="semio-callout tip"><span class="semio-callout-ic">💡</span><div>${esc(b.x)}</div></div>`;
      case 'warn': return `<div class="semio-callout warn"><span class="semio-callout-ic">⚠️</span><div>${esc(b.x)}</div></div>`;
      case 'ev': return `<div class="semio-callout ev"><span class="semio-callout-ic">📊</span><div><b>Evidência:</b> ${esc(b.x)}</div></div>`;
      case 'doc': return `<div class="semio-doc"><span class="semio-doc-tag">Prontuário</span><code>${esc(b.x)}</code></div>`;
      case 'ul': return `<ul class="semio-ul">${b.x.map((li) => `<li>${esc(li)}</li>`).join('')}</ul>`;
      case 'svg': return `<figure class="semio-fig">${b.x}${b.cap ? `<figcaption>${esc(b.cap)}</figcaption>` : ''}</figure>`;
      case 'p':
      default: {
        const id = topId + ':' + idx;
        const inner = marks[id] != null ? marks[id] : esc(b.x);
        return `<p class="semio-p" data-hl-id="${esc(id)}">${inner}</p>`;
      }
    }
  }

  // ---- Início ----
  function inicioHtml() {
    const S = st();
    const mods = (window.SemioAulas && window.SemioAulas.MODULOS) || [];
    const m = metrics();
    const topicsTotal = mods.reduce((n, mod) => n + mod.topicos.length, 0);
    const topicsDone = Object.keys(S.progress).filter((k) => k.startsWith('aula:')).length;
    return `<div class="semio-hero">
        <div><span class="semio-eyebrow">Habilidade clínica</span>
        <h2 style="margin:2px 0 0">Semiologia — Build 1</h2>
        <p class="semio-muted">Aprender a examinar de verdade: do normal ao patológico, com finalidade, interpretação, evidência (LR) e red flags. Funciona offline.</p></div>
      </div>
      <div class="semio-grid3">
        <div class="semio-stat"><span>${topicsDone}/${topicsTotal}</span><small>tópicos lidos</small></div>
        <div class="semio-stat"><span>${m.acc}%</span><small>acerto no treino</small></div>
        <div class="semio-stat ${m.dueCount ? 'due' : ''}"><span>${m.dueCount}</span><small>revisões devidas</small></div>
      </div>
      <div class="semio-cards">
        <button class="semio-card" data-go="aulas"><b>📚 Aulas</b><span>7 módulos · das bases do método aos sistemas</span></button>
        <button class="semio-card" data-go="manobras"><b>🩺 Manobras</b><span>técnica + finalidade + evidência + quiz</span></button>
        <button class="semio-card" data-go="casos"><b>🧩 Casos guiados</b><span>representação → hipóteses → red flag → conduta</span></button>
        <button class="semio-card" data-go="fichas"><b>⚡ Fichas rápidas</b><span>revisão de véspera e beira-leito</span></button>
      </div>
      <p class="semio-note">Build 1 cobre o núcleo do briefing (Fundamentos, Anamnese, Exame geral, Respiratório, Cardiovascular, Abdome, Neurológico). Próximas builds: demais sistemas, OSCE, banco de questões e repetição espaçada avançada.</p>`;
  }

  // ---- Aulas ----
  function aulasModulosHtml() {
    const S = st();
    const mods = (window.SemioAulas && window.SemioAulas.MODULOS) || [];
    return `<div class="semio-list">${mods.map((mod) => {
      const done = mod.topicos.filter((t) => S.progress['aula:' + mod.id + ':' + t.id]).length;
      return `<button class="semio-mod" data-mod="${mod.id}">
        <div class="semio-mod-num">${mod.id}</div>
        <div class="semio-mod-body"><b>${esc(mod.nome)}</b><span>${esc(mod.resumo)}</span>
          <div class="semio-progress"><div style="width:${Math.round((done / mod.topicos.length) * 100)}%"></div></div>
          <small>${done}/${mod.topicos.length} tópicos</small></div></button>`;
    }).join('')}</div>`;
  }
  function aulasTopicosHtml(mod) {
    const S = st();
    return `<button class="semio-btn ghost sm" data-back-mods>← Módulos</button>
      <h2 class="semio-topic-title">${esc(mod.nome)}</h2>
      <div class="semio-list">${mod.topicos.map((t) => {
        const done = S.progress['aula:' + mod.id + ':' + t.id];
        return `<button class="semio-topic" data-topico="${esc(t.id)}"><span>${esc(t.titulo)}</span>${done ? '<i class="semio-check">✓</i>' : ''}</button>`;
      }).join('')}</div>`;
  }
  function aulasDetailHtml(mod, topico) {
    const S = st();
    const focus = S.ui.focus ? ' semio-focus' : '';
    const parts = topico.blocks.map((b, i) => blockHtml(b, mod.id + ':' + topico.id, i)).join('');
    return `<button class="semio-btn ghost sm" data-back-topicos>← ${esc(mod.nome)}</button>
      <div class="semio-topic-head"><h2>${esc(topico.titulo)}</h2>
        <div class="semio-topic-tools">
          <button class="semio-btn ghost sm" data-focus-toggle>🎯 Modo foco</button>
          <span class="semio-muted sm">Selecione um trecho de texto para marcá-lo. Clique numa marcação para remover.</span>
        </div></div>
      <article class="semio-flow${focus}">${parts}</article>
      <button class="semio-btn wide" data-mark-read="${esc(mod.id + ':' + topico.id)}">✓ Marcar tópico como lido</button>`;
  }
  function aulasHtml() {
    const S = st();
    const mods = (window.SemioAulas && window.SemioAulas.MODULOS) || [];
    const mod = mods.find((m) => m.id === S.ui.aulaModId);
    if (!mod) return aulasModulosHtml();
    const topico = mod.topicos.find((t) => t.id === S.ui.aulaTopicoId);
    if (!topico) return aulasTopicosHtml(mod);
    return aulasDetailHtml(mod, topico);
  }

  // ---- Manobras ----
  function manobrasListHtml() {
    const sistemas = [...new Set(MANOBRAS.map((m) => m.sistema))];
    return `<h2 class="semio-topic-title">Banco de manobras</h2>
      <p class="semio-muted">Cada manobra: para que serve, quando fazer, como executar, o que é positivo, erros comuns, evidência (LR) e um quiz.</p>
      ${sistemas.map((s) => `<h3 class="semio-h">${esc(s)}</h3>
        <div class="semio-list">${MANOBRAS.filter((m) => m.sistema === s).map((m) => {
          const done = st().progress['manobra:' + m.id];
          return `<button class="semio-topic" data-manobra="${esc(m.id)}"><span>${esc(m.nome)}</span>${done ? '<i class="semio-check">✓</i>' : ''}</button>`;
        }).join('')}</div>`).join('')}`;
  }
  function manobraDetailHtml(m) {
    return `<button class="semio-btn ghost sm" data-back-manobras>← Manobras</button>
      <div class="semio-topic-head"><h2>${esc(m.nome)}</h2><span class="semio-tag">${esc(m.sistema)}</span></div>
      <div class="semio-def"><b>Finalidade</b><p>${esc(m.finalidade)}</p></div>
      <div class="semio-def"><b>Quando fazer</b><p>${esc(m.quando)}</p></div>
      <div class="semio-def"><b>Execução</b><p>${esc(m.execucao)}</p></div>
      <div class="semio-def"><b>Resultado positivo</b><p>${esc(m.positivo)}</p></div>
      <div class="semio-callout warn"><span class="semio-callout-ic">⚠️</span><div><b>Erros comuns:</b> ${esc(m.erros)}</div></div>
      <div class="semio-callout ev"><span class="semio-callout-ic">📊</span><div><b>Evidência (LR):</b> ${esc(m.lr)}</div></div>
      <div class="semio-quiz" data-quiz-manobra="${esc(m.id)}">
        <b>${esc(m.quiz.p)}</b>
        <div class="semio-opts">${m.quiz.ops.map((o, i) => `<button class="semio-opt" data-opt="${i}">${esc(o)}</button>`).join('')}</div>
        <div class="semio-fb"></div>
        <div class="semio-conf" hidden><span>Confiança:</span>
          <button data-conf="baixa">Baixa</button><button data-conf="media">Média</button><button data-conf="alta">Alta</button></div>
      </div>`;
  }
  function manobrasHtml() {
    const S = st();
    if (S.ui.manobraId && MANOBRA_MAP[S.ui.manobraId]) return manobraDetailHtml(MANOBRA_MAP[S.ui.manobraId]);
    return manobrasListHtml();
  }

  // ---- Casos ----
  function casosListHtml() {
    return `<h2 class="semio-topic-title">Casos clínicos guiados</h2>
      <p class="semio-muted">Você decide passo a passo. O feedback explica o raciocínio, não só a resposta.</p>
      <div class="semio-list">${CASOS.map((c) => {
        const done = st().caseState[c.id]?.done;
        return `<button class="semio-mod" data-caso="${esc(c.id)}">
          <div class="semio-mod-num">🧩</div>
          <div class="semio-mod-body"><b>${esc(c.titulo)}</b><span>${esc(c.sistema)} · ${esc(c.nivel)}</span></div>
          ${done ? '<i class="semio-check">✓</i>' : ''}</button>`;
      }).join('')}</div>`;
  }
  const CASO_STEPS = ['repr', 'hip', 'redflag', 'conduta'];
  const CASO_LABEL = { repr: 'Representação do problema', hip: 'Hipóteses', redflag: 'Red flag', conduta: 'Conduta' };
  function casoDetailHtml(c) {
    const S = st();
    const cs = S.caseState[c.id] || { step: 0, answers: {} };
    const step = CASO_STEPS[cs.step] || 'repr';
    const q = c[step];
    const stepIdx = cs.step || 0;
    if (cs.done) {
      return `<button class="semio-btn ghost sm" data-back-casos>← Casos</button>
        <div class="semio-topic-head"><h2>${esc(c.titulo)}</h2><span class="semio-tag">concluído ✓</span></div>
        <div class="semio-vinheta">${esc(c.vinheta)}</div>
        ${CASO_STEPS.map((s) => `<div class="semio-def"><b>${esc(CASO_LABEL[s])}</b><p>${esc(c[s].ops[c[s].correct])}</p><small class="semio-muted">${esc(c[s].exp)}</small></div>`).join('')}
        <button class="semio-btn wide" data-caso-restart="${esc(c.id)}">↻ Refazer caso</button>`;
    }
    return `<button class="semio-btn ghost sm" data-back-casos>← Casos</button>
      <div class="semio-topic-head"><h2>${esc(c.titulo)}</h2><span class="semio-tag">${esc(c.sistema)} · ${esc(c.nivel)}</span></div>
      <div class="semio-vinheta">${esc(c.vinheta)}</div>
      <div class="semio-steps">${CASO_STEPS.map((s, i) => `<span class="${i === stepIdx ? 'on' : i < stepIdx ? 'ok' : ''}">${esc(CASO_LABEL[s])}</span>`).join('')}</div>
      <div class="semio-quiz" data-quiz-caso="${esc(c.id)}" data-step="${esc(step)}">
        <b>${esc(q.p)}</b>
        <div class="semio-opts">${q.ops.map((o, i) => `<button class="semio-opt" data-opt="${i}">${esc(o)}</button>`).join('')}</div>
        <div class="semio-fb"></div>
      </div>`;
  }
  function casosHtml() {
    const S = st();
    if (S.ui.casoId && CASO_MAP[S.ui.casoId]) return casoDetailHtml(CASO_MAP[S.ui.casoId]);
    return casosListHtml();
  }

  // ---- Fichas ----
  function fichasHtml() {
    const S = st();
    const sistemas = ['Todos', ...new Set(FICHAS.map((f) => f.sistema))];
    const sel = S.ui.fichaSistema || 'Todos';
    const list = FICHAS.filter((f) => sel === 'Todos' || f.sistema === sel);
    return `<h2 class="semio-topic-title">Fichas de revisão rápida</h2>
      <p class="semio-muted">Para a véspera e a beira do leito. Não substituem avaliação médica presencial.</p>
      <div class="semio-chips">${sistemas.map((s) => `<button class="semio-chip ${s === sel ? 'on' : ''}" data-ficha-sis="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      ${list.map((f) => `<section class="semio-ficha">
        <h3>${esc(f.titulo)}</h3>
        <table class="semio-tbl">${f.linhas.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</table>
        <div class="semio-callout warn"><span class="semio-callout-ic">⚠️</span><div><b>Red flags:</b> ${esc(f.redflag)}</div></div>
        <div class="semio-doc"><span class="semio-doc-tag">Prontuário normal</span><code>${esc(f.doc)}</code></div>
      </section>`).join('')}`;
  }

  // ---- Corpo Semiológico ----
  function corpoSignDetailHtml(s) {
    const cor = CAT_COR[s.cat] || '#2f7d6f';
    return `<div class="semio-sign-detail">
      <div class="semio-sign-head"><span class="semio-cat" style="background:${cor}">${esc(s.cat)}</span><h3>${esc(s.nome)}</h3></div>
      ${SIGN_FIG[s.id] ? `<figure class="semio-sign-fig">${SIGN_FIG[s.id]}<figcaption>Ilustração original — esquema didático</figcaption></figure>` : ''}
      <div class="semio-def"><b>O que é</b><p>${esc(s.oQue)}</p></div>
      <div class="semio-def"><b>Como pesquisar</b><p>${esc(s.comoPesquisar)}</p></div>
      <div class="semio-def"><b>Significado clínico</b><p>${esc(s.significado)}</p></div>
      <div class="semio-quiz" data-quiz-sign="${esc(s.id)}">
        <b>${esc(s.quiz.p)}</b>
        <div class="semio-opts">${s.quiz.ops.map((o, i) => `<button class="semio-opt" data-opt="${i}">${esc(o)}</button>`).join('')}</div>
        <div class="semio-fb"></div>
      </div></div>`;
  }
  function corpoHtml() {
    const S = st();
    if (S.ui.corpoTeste) return corpoTesteHtml();
    const view = S.ui.corpoView || 'ant';
    const active = S.ui.corpoSignId;
    const s = active && SINAL_MAP[active];
    const list = signsInView(view);
    const done = Object.keys(S.progress).filter((k) => k.startsWith('sign:')).length;
    return `<div class="semio-topic-head"><h2>Corpo Semiológico</h2>
      <button class="semio-btn ghost sm" data-corpo-teste>🎯 Modo teste</button></div>
      <div class="semio-chips" style="margin-top:2px">
        <button class="semio-chip ${view === 'ant' ? 'on' : ''}" data-corpo-view="ant">Anterior</button>
        <button class="semio-chip ${view === 'post' ? 'on' : ''}" data-corpo-view="post">Posterior</button>
        <button class="semio-chip ${view === 'maos' ? 'on' : ''}" data-corpo-view="maos">Mãos e unhas</button>
        <button class="semio-chip ${view === 'cabeca' ? 'on' : ''}" data-corpo-view="cabeca">Cabeça e olhos</button>
      </div>
      <p class="semio-muted">Toque num ponto da figura (ou na lista) para estudar o sinal. ${done}/${CORPO_SINAIS.length} sinais praticados no total.</p>
      <div class="semio-corpo">
        <div class="semio-corpo-fig">${bodySvg(active, false, view)}
          <div class="semio-legend">${Object.entries(CAT_COR).filter(([k]) => list.some((x) => x.cat === k)).map(([k, v]) => `<span><i style="background:${v}"></i>${esc(k)}</span>`).join('')}</div>
        </div>
        <div class="semio-corpo-side">
          ${s ? corpoSignDetailHtml(s) : `<ol class="semio-sign-list">${list.map((x, i) => `<li><button data-sign="${esc(x.id)}"><span class="semio-num" style="background:${CAT_COR[x.cat]}">${i + 1}</span>${esc(x.nome)}${st().progress['sign:' + x.id] ? ' <i class="semio-check">✓</i>' : ''}</button></li>`).join('')}</ol>`}
        </div>
      </div>`;
  }
  function corpoTesteHtml() {
    const S = st();
    if (!S.ui.corpoTesteId) S.ui.corpoTesteId = CORPO_SINAIS[Math.floor(Math.random() * CORPO_SINAIS.length)].id;
    const s = SINAL_MAP[S.ui.corpoTesteId];
    const view = s.view || 'ant';
    return `<div class="semio-topic-head"><h2>Corpo Semiológico — teste</h2>
      <button class="semio-btn ghost sm" data-corpo-estudo>← Voltar ao estudo</button></div>
      <p class="semio-muted">O ponto destacado na figura (${VIEW_LABEL[view] || 'anterior'}) corresponde a um sinal. Responda:</p>
      <div class="semio-corpo">
        <div class="semio-corpo-fig">${bodySvg(s.id, true, view)}</div>
        <div class="semio-corpo-side">
          <div class="semio-quiz" data-quiz-teste="${esc(s.id)}">
            <b>${esc(s.quiz.p)}</b>
            <div class="semio-opts">${s.quiz.ops.map((o, i) => `<button class="semio-opt" data-opt="${i}">${esc(o)}</button>`).join('')}</div>
            <div class="semio-fb"></div>
          </div>
        </div>
      </div>`;
  }

  // ---- Desempenho ----
  function desempenhoHtml() {
    const S = st();
    const m = metrics();
    const bySis = {};
    S.log.forEach((l) => { const s = l.key.split(':')[0]; bySis[s] = bySis[s] || { t: 0, ok: 0 }; bySis[s].t++; if (l.ok) bySis[s].ok++; });
    const due = Object.entries(S.srs).filter(([, v]) => v.due <= todayISO());
    return `<h2 class="semio-topic-title">Desempenho e revisões</h2>
      <div class="semio-grid3">
        <div class="semio-stat"><span>${m.total}</span><small>respostas</small></div>
        <div class="semio-stat"><span>${m.acc}%</span><small>acerto</small></div>
        <div class="semio-stat ${m.dueCount ? 'due' : ''}"><span>${m.dueCount}</span><small>a revisar</small></div>
      </div>
      ${m.overconf ? `<div class="semio-callout warn"><span class="semio-callout-ic">⚠️</span><div><b>Excesso de confiança:</b> ${m.overconf} erro(s) marcados como "alta confiança". Reveja esses temas — é onde o risco de erro clínico se esconde.</div></div>` : ''}
      <h3 class="semio-h">Por atividade</h3>
      <table class="semio-tbl">${Object.entries(bySis).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v.ok}/${v.t} (${Math.round((v.ok / v.t) * 100)}%)</td></tr>`).join('') || '<tr><td colspan="2" class="semio-muted">Sem dados ainda — responda quizzes e casos.</td></tr>'}</table>
      ${due.length ? `<h3 class="semio-h">Revisões devidas hoje</h3><div class="semio-list">${due.map(([k]) => `<div class="semio-topic static"><span>${esc(k)}</span></div>`).join('')}</div>` : '<p class="semio-muted">Nenhuma revisão pendente. 👏</p>'}`;
  }

  // ---------------------------------------------------------------------------
  // 7. ROTEADOR + MOUNT
  // ---------------------------------------------------------------------------
  const SUBS = [['inicio', 'Início'], ['aulas', 'Aulas'], ['corpo', 'Corpo'], ['manobras', 'Manobras'], ['casos', 'Casos'], ['fichas', 'Fichas'], ['desempenho', 'Desempenho']];
  function subnav() {
    const cur = st().ui.sub;
    return `<div class="semio-subnav">${SUBS.map(([k, l]) => `<button class="semio-sub ${k === cur ? 'on' : ''}" data-sub="${k}">${l}</button>`).join('')}</div>`;
  }
  function bodyHtml() {
    switch (st().ui.sub) {
      case 'aulas': return aulasHtml();
      case 'corpo': return corpoHtml();
      case 'manobras': return manobrasHtml();
      case 'casos': return casosHtml();
      case 'fichas': return fichasHtml();
      case 'desempenho': return desempenhoHtml();
      default: return inicioHtml();
    }
  }

  let ROOT = null;
  function paint() {
    if (!ROOT) return;
    ROOT.querySelector('.semio-subnav-slot').innerHTML = subnav();
    ROOT.querySelector('.semio-body').innerHTML = bodyHtml();
    bind();
  }
  function go(sub) { const S = st(); S.ui.sub = sub; if (sub !== 'aulas') { S.ui.aulaModId = null; S.ui.aulaTopicoId = null; } if (sub !== 'manobras') S.ui.manobraId = null; if (sub !== 'casos') S.ui.casoId = null; if (sub !== 'corpo') { S.ui.corpoSignId = null; S.ui.corpoTeste = false; S.ui.corpoTesteId = null; } save(); paint(); }

  function bind() {
    const S = st();
    ROOT.querySelectorAll('.semio-sub[data-sub]').forEach((b) => b.onclick = () => go(b.dataset.sub));
    ROOT.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => go(b.dataset.go));

    // Aulas
    ROOT.querySelectorAll('[data-mod]').forEach((b) => b.onclick = () => { S.ui.aulaModId = +b.dataset.mod; S.ui.aulaTopicoId = null; save(); paint(); });
    ROOT.querySelector('[data-back-mods]')?.addEventListener('click', () => { S.ui.aulaModId = null; save(); paint(); });
    ROOT.querySelectorAll('[data-topico]').forEach((b) => b.onclick = () => { S.ui.aulaTopicoId = b.dataset.topico; save(); paint(); });
    ROOT.querySelector('[data-back-topicos]')?.addEventListener('click', () => { S.ui.aulaTopicoId = null; save(); paint(); });
    ROOT.querySelector('[data-focus-toggle]')?.addEventListener('click', () => { S.ui.focus = !S.ui.focus; save(); paint(); });
    ROOT.querySelector('[data-mark-read]')?.addEventListener('click', (e) => { S.progress['aula:' + e.target.dataset.markRead] = true; save(); paint(); });
    // marca-texto: seleciona qualquer trecho do parágrafo para marcar
    ROOT.querySelectorAll('.semio-p[data-hl-id]').forEach((p) => {
      p.addEventListener('mouseup', () => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        if (!p.contains(range.commonAncestorContainer)) return;
        if (range.startContainer.nodeType !== Node.TEXT_NODE || range.endContainer.nodeType !== Node.TEXT_NODE) return;
        const mark = document.createElement('mark');
        mark.className = 'semio-hl-mark';
        try { range.surroundContents(mark); } catch (err) { return; }
        sel.removeAllRanges();
        const topId = S.ui.aulaModId + ':' + S.ui.aulaTopicoId;
        S.highlights[topId] = S.highlights[topId] || {};
        S.highlights[topId][p.dataset.hlId] = p.innerHTML;
        save();
      });
    });
    ROOT.querySelectorAll('.semio-hl-mark').forEach((mk) => mk.onclick = (e) => {
      e.stopPropagation();
      const p = mk.closest('.semio-p[data-hl-id]');
      if (!p) return;
      mk.replaceWith(...mk.childNodes);
      p.normalize();
      const topId = S.ui.aulaModId + ':' + S.ui.aulaTopicoId;
      S.highlights[topId] = S.highlights[topId] || {};
      S.highlights[topId][p.dataset.hlId] = p.innerHTML;
      save();
    });

    // Manobras
    ROOT.querySelectorAll('[data-manobra]').forEach((b) => b.onclick = () => { S.ui.manobraId = b.dataset.manobra; save(); paint(); });
    ROOT.querySelector('[data-back-manobras]')?.addEventListener('click', () => { S.ui.manobraId = null; save(); paint(); });
    bindQuizManobra();

    // Casos
    ROOT.querySelectorAll('[data-caso]').forEach((b) => b.onclick = () => { S.ui.casoId = b.dataset.caso; save(); paint(); });
    ROOT.querySelector('[data-back-casos]')?.addEventListener('click', () => { S.ui.casoId = null; save(); paint(); });
    ROOT.querySelector('[data-caso-restart]')?.addEventListener('click', (e) => { S.caseState[e.target.dataset.casoRestart] = { step: 0, answers: {} }; save(); paint(); });
    bindQuizCaso();

    // Fichas
    ROOT.querySelectorAll('[data-ficha-sis]').forEach((b) => b.onclick = () => { S.ui.fichaSistema = b.dataset.fichaSis; save(); paint(); });

    // Corpo
    ROOT.querySelectorAll('[data-sign]').forEach((b) => b.onclick = () => { S.ui.corpoSignId = b.dataset.sign; save(); paint(); });
    ROOT.querySelectorAll('[data-corpo-view]').forEach((b) => b.onclick = () => { S.ui.corpoView = b.dataset.corpoView; S.ui.corpoSignId = null; save(); paint(); });
    ROOT.querySelector('[data-corpo-teste]')?.addEventListener('click', () => { S.ui.corpoTeste = true; S.ui.corpoTesteId = null; save(); paint(); });
    ROOT.querySelector('[data-corpo-estudo]')?.addEventListener('click', () => { S.ui.corpoTeste = false; S.ui.corpoTesteId = null; save(); paint(); });
    bindQuizSign();
    bindQuizTeste();
  }

  function bindQuizSign() {
    const box = ROOT.querySelector('[data-quiz-sign]');
    if (!box) return;
    const s = SINAL_MAP[box.dataset.quizSign];
    const fb = box.querySelector('.semio-fb');
    let answered = false;
    box.querySelectorAll('.semio-opt').forEach((btn) => btn.onclick = () => {
      if (answered) return; answered = true;
      const i = +btn.dataset.opt; const ok = i === s.quiz.correct;
      box.querySelectorAll('.semio-opt').forEach((b, j) => { if (j === s.quiz.correct) b.classList.add('correct'); if (j === i && !ok) b.classList.add('wrong'); b.disabled = true; });
      logAttempt('sign:' + s.id, ok, null);
      st().progress['sign:' + s.id] = true; st().daily.studied++; save();
      fb.innerHTML = `<div class="semio-feedback ${ok ? 'ok' : 'no'}">${ok ? 'Correto! ' : 'Reveja: '}${esc(s.quiz.exp)}</div>`;
    });
  }

  function bindQuizTeste() {
    const box = ROOT.querySelector('[data-quiz-teste]');
    if (!box) return;
    const S = st();
    const s = SINAL_MAP[box.dataset.quizTeste];
    const fb = box.querySelector('.semio-fb');
    let answered = false;
    box.querySelectorAll('.semio-opt').forEach((btn) => btn.onclick = () => {
      if (answered) return; answered = true;
      const i = +btn.dataset.opt; const ok = i === s.quiz.correct;
      box.querySelectorAll('.semio-opt').forEach((b, j) => { if (j === s.quiz.correct) b.classList.add('correct'); if (j === i && !ok) b.classList.add('wrong'); b.disabled = true; });
      logAttempt('sign:' + s.id, ok, null);
      st().progress['sign:' + s.id] = true; st().daily.studied++; save();
      fb.innerHTML = `<div class="semio-feedback ${ok ? 'ok' : 'no'}">${ok ? 'Correto! ' : 'Reveja: '}<b>${esc(s.nome)}</b> — ${esc(s.quiz.exp)}</div>
        <button class="semio-btn wide" data-teste-next>Próximo sinal →</button>`;
      fb.querySelector('[data-teste-next]').onclick = () => { S.ui.corpoTesteId = null; save(); paint(); };
    });
  }

  function bindQuizManobra() {
    const box = ROOT.querySelector('[data-quiz-manobra]');
    if (!box) return;
    const m = MANOBRA_MAP[box.dataset.quizManobra];
    const fb = box.querySelector('.semio-fb');
    const confRow = box.querySelector('.semio-conf');
    let answered = false;
    box.querySelectorAll('.semio-opt').forEach((btn) => btn.onclick = () => {
      if (answered) return; answered = true;
      const i = +btn.dataset.opt; const ok = i === m.quiz.correct;
      box.querySelectorAll('.semio-opt').forEach((b, j) => { if (j === m.quiz.correct) b.classList.add('correct'); if (j === i && !ok) b.classList.add('wrong'); b.disabled = true; });
      fb.innerHTML = `<div class="semio-feedback ${ok ? 'ok' : 'no'}">${ok ? 'Correto! ' : 'Reveja: '}${esc(m.quiz.exp)}</div>`;
      confRow.hidden = false;
      confRow.querySelectorAll('[data-conf]').forEach((cb) => cb.onclick = () => {
        logAttempt('manobra:' + m.id, ok, cb.dataset.conf);
        st().progress['manobra:' + m.id] = true; st().daily.studied++; save();
        confRow.innerHTML = '<span class="semio-muted sm">Registrado na revisão espaçada ✓</span>';
      });
    });
  }

  function bindQuizCaso() {
    const box = ROOT.querySelector('[data-quiz-caso]');
    if (!box) return;
    const S = st();
    const c = CASO_MAP[box.dataset.quizCaso];
    const step = box.dataset.step;
    const q = c[step];
    const fb = box.querySelector('.semio-fb');
    let answered = false;
    box.querySelectorAll('.semio-opt').forEach((btn) => btn.onclick = () => {
      if (answered) return; answered = true;
      const i = +btn.dataset.opt; const ok = i === q.correct;
      box.querySelectorAll('.semio-opt').forEach((b, j) => { if (j === q.correct) b.classList.add('correct'); if (j === i && !ok) b.classList.add('wrong'); b.disabled = true; });
      logAttempt('caso:' + c.id + ':' + step, ok, null);
      fb.innerHTML = `<div class="semio-feedback ${ok ? 'ok' : 'no'}">${ok ? 'Correto. ' : 'Resposta correta em verde. '}${esc(q.exp)}</div>
        <button class="semio-btn wide" data-caso-next>Continuar →</button>`;
      fb.querySelector('[data-caso-next]').onclick = () => {
        const cs = S.caseState[c.id] || { step: 0, answers: {} };
        cs.answers[step] = i;
        cs.step = (cs.step || 0) + 1;
        if (cs.step >= CASO_STEPS.length) { cs.done = true; st().daily.studied++; }
        S.caseState[c.id] = cs; save(); paint();
      };
    });
  }

  function mount(container, bridge) {
    BRIDGE = bridge;
    injectStyles();
    ensureState();
    ROOT = container;
    container.innerHTML = `<div class="semio-wrap">
      <div class="semio-subnav-slot"></div>
      <div class="semio-body"></div>
    </div>`;
    paint();
  }

  // ---------------------------------------------------------------------------
  // 8. ESTILOS (namespace semio-*)
  // ---------------------------------------------------------------------------
  function injectStyles() {
    if (document.getElementById('semio-styles')) return;
    const s = document.createElement('style');
    s.id = 'semio-styles';
    s.textContent = `
    .semio-wrap{--semio-acc:#2f7d6f;--semio-acc2:#1f5a50;max-width:860px}
    .semio-muted{color:var(--muted,#667085);margin:4px 0 0}.semio-muted.sm{font-size:.82rem}
    .semio-eyebrow{font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:var(--semio-acc);font-weight:700}
    .semio-subnav{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;position:sticky;top:0;background:var(--bg,#fff);padding:6px 0;z-index:2}
    .semio-sub{border:1px solid var(--border,#e2e8f0);background:var(--card,#fff);color:var(--text,#1e293b);padding:7px 14px;border-radius:999px;cursor:pointer;font-size:.86rem;font-weight:600}
    .semio-sub.on{background:var(--semio-acc);color:#fff;border-color:var(--semio-acc)}
    .semio-hero{margin-bottom:12px}
    .semio-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:10px 0}
    .semio-stat{background:var(--card,#f8fafc);border:1px solid var(--border,#e2e8f0);border-radius:14px;padding:14px;text-align:center}
    .semio-stat span{display:block;font-size:1.5rem;font-weight:800;color:var(--semio-acc2)}
    .semio-stat small{color:var(--muted,#667085);font-size:.74rem}
    .semio-stat.due span{color:#c05621}
    .semio-cards{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:8px 0}
    .semio-card{text-align:left;background:var(--card,#fff);border:1px solid var(--border,#e2e8f0);border-radius:14px;padding:14px;cursor:pointer}
    .semio-card b{display:block;margin-bottom:2px}.semio-card span{font-size:.8rem;color:var(--muted,#667085)}
    .semio-card:hover{border-color:var(--semio-acc)}
    .semio-note{font-size:.8rem;color:var(--muted,#667085);border-left:3px solid var(--semio-acc);padding-left:10px;margin-top:14px}
    .semio-list{display:flex;flex-direction:column;gap:8px;margin:8px 0}
    .semio-mod{display:flex;align-items:center;gap:12px;text-align:left;background:var(--card,#fff);border:1px solid var(--border,#e2e8f0);border-radius:12px;padding:12px;cursor:pointer}
    .semio-mod:hover{border-color:var(--semio-acc)}
    .semio-mod-num{flex:none;width:34px;height:34px;border-radius:9px;background:var(--semio-acc);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800}
    .semio-mod-body{flex:1}.semio-mod-body b{display:block}.semio-mod-body span{font-size:.8rem;color:var(--muted,#667085)}
    .semio-progress{height:5px;background:var(--border,#e2e8f0);border-radius:3px;margin:6px 0 2px;overflow:hidden}
    .semio-progress>div{height:100%;background:var(--semio-acc)}
    .semio-topic{display:flex;justify-content:space-between;align-items:center;gap:10px;text-align:left;background:var(--card,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:11px 13px;cursor:pointer;width:100%}
    .semio-topic:hover{border-color:var(--semio-acc)}.semio-topic.static{cursor:default}
    .semio-check{color:var(--semio-acc);font-style:normal;font-weight:800}
    .semio-topic-title{margin:2px 0 4px}
    .semio-topic-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;margin:10px 0 4px}
    .semio-topic-head h2{margin:0}
    .semio-topic-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .semio-tag{font-size:.72rem;background:var(--semio-acc);color:#fff;padding:3px 9px;border-radius:999px;font-weight:700;white-space:nowrap}
    .semio-btn{border:1px solid var(--semio-acc);background:var(--semio-acc);color:#fff;border-radius:10px;padding:9px 14px;cursor:pointer;font-weight:600;font-size:.86rem}
    .semio-btn.ghost{background:transparent;color:var(--semio-acc)}
    .semio-btn.sm{padding:5px 10px;font-size:.8rem}.semio-btn.wide{width:100%;margin-top:12px}
    .semio-flow{line-height:1.62;margin:6px 0}
    .semio-h{margin:18px 0 6px;font-size:1.05rem;color:var(--semio-acc2)}
    .semio-p{margin:9px 0;border-radius:4px}
    .semio-hl-mark{background:rgba(255,214,79,.6);border-radius:2px;padding:0 1px;cursor:pointer}
    .semio-hl-mark:hover{background:rgba(255,193,7,.75)}
    .semio-ul{margin:8px 0;padding-left:20px}.semio-ul li{margin:5px 0}
    .semio-callout{display:flex;gap:10px;padding:11px 13px;border-radius:12px;margin:10px 0;font-size:.9rem;line-height:1.5}
    .semio-callout-ic{flex:none}
    .semio-callout.tip{background:rgba(47,125,111,.09);border:1px solid rgba(47,125,111,.25)}
    .semio-callout.warn{background:rgba(220,80,40,.09);border:1px solid rgba(220,80,40,.28)}
    .semio-callout.ev{background:rgba(60,110,200,.08);border:1px solid rgba(60,110,200,.25)}
    .semio-doc{margin:10px 0}.semio-doc-tag{display:inline-block;font-size:.68rem;text-transform:uppercase;letter-spacing:.05em;color:var(--semio-acc2);font-weight:700;margin-bottom:3px}
    .semio-doc code{display:block;background:var(--card,#f1f5f9);border:1px dashed var(--border,#cbd5e1);border-radius:8px;padding:10px;font-size:.84rem;white-space:pre-wrap;line-height:1.5}
    .semio-fig{margin:12px 0;text-align:center}.semio-fig-svg{max-width:320px;width:100%;height:auto}
    .semio-fig figcaption{font-size:.8rem;color:var(--muted,#667085);margin-top:6px;text-align:left}
    .semio-def{margin:9px 0}.semio-def b{color:var(--semio-acc2)}.semio-def p{margin:2px 0 0;line-height:1.5}
    .semio-quiz{margin-top:14px;background:var(--card,#f8fafc);border:1px solid var(--border,#e2e8f0);border-radius:12px;padding:14px}
    .semio-opts{display:flex;flex-direction:column;gap:7px;margin-top:9px}
    .semio-opt{text-align:left;border:1px solid var(--border,#cbd5e1);background:var(--bg,#fff);border-radius:9px;padding:10px 12px;cursor:pointer;font-size:.88rem}
    .semio-opt:hover:not(:disabled){border-color:var(--semio-acc)}
    .semio-opt.correct{border-color:#2f9e6f;background:rgba(47,158,111,.14)}
    .semio-opt.wrong{border-color:#dc5028;background:rgba(220,80,40,.12)}
    .semio-feedback{margin-top:10px;padding:10px;border-radius:9px;font-size:.86rem;line-height:1.5}
    .semio-feedback.ok{background:rgba(47,158,111,.12)}.semio-feedback.no{background:rgba(220,80,40,.1)}
    .semio-conf{display:flex;gap:8px;align-items:center;margin-top:10px;font-size:.84rem;flex-wrap:wrap}
    .semio-conf button{border:1px solid var(--semio-acc);background:transparent;color:var(--semio-acc);border-radius:8px;padding:5px 12px;cursor:pointer}
    .semio-vinheta{background:rgba(60,110,200,.06);border:1px solid rgba(60,110,200,.2);border-radius:12px;padding:13px;line-height:1.55;margin:8px 0}
    .semio-steps{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}
    .semio-steps span{font-size:.74rem;padding:4px 10px;border-radius:999px;background:var(--card,#eef2f6);color:var(--muted,#667085)}
    .semio-steps span.on{background:var(--semio-acc);color:#fff}.semio-steps span.ok{background:rgba(47,158,111,.2);color:var(--semio-acc2)}
    .semio-chips{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}
    .semio-chip{border:1px solid var(--border,#cbd5e1);background:var(--bg,#fff);border-radius:999px;padding:5px 12px;cursor:pointer;font-size:.82rem}
    .semio-chip.on{background:var(--semio-acc);color:#fff;border-color:var(--semio-acc)}
    .semio-ficha{margin:12px 0;border:1px solid var(--border,#e2e8f0);border-radius:14px;padding:14px;background:var(--card,#fff)}
    .semio-ficha h3{margin:0 0 8px;color:var(--semio-acc2)}
    .semio-tbl{width:100%;border-collapse:collapse;font-size:.86rem}
    .semio-tbl td{border-bottom:1px solid var(--border,#eef2f6);padding:7px 6px;vertical-align:top}
    .semio-tbl td:first-child{font-weight:600;white-space:nowrap;color:var(--semio-acc2);width:34%}
    .semio-corpo{display:grid;grid-template-columns:220px 1fr;gap:16px;align-items:start;margin-top:8px}
    .semio-corpo-fig{position:sticky;top:56px}
    .semio-body-svg{width:100%;max-width:220px;height:auto;background:var(--card,#f8fafc);border:1px solid var(--border,#e2e8f0);border-radius:14px}
    .semio-hot text{pointer-events:none}
    .semio-hot:hover circle{opacity:1;r:11}
    .semio-legend{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;font-size:.72rem;color:var(--muted,#667085)}
    .semio-legend span{display:flex;align-items:center;gap:4px}.semio-legend i{width:10px;height:10px;border-radius:3px;display:inline-block}
    .semio-sign-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
    .semio-sign-list button{display:flex;align-items:center;gap:9px;width:100%;text-align:left;background:var(--card,#fff);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:9px 11px;cursor:pointer;font-size:.88rem}
    .semio-sign-list button:hover{border-color:var(--semio-acc)}
    .semio-num{flex:none;width:22px;height:22px;border-radius:6px;color:#fff;display:flex;align-items:center;justify-content:center;font-size:.76rem;font-weight:700}
    .semio-sign-head{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:4px}.semio-sign-head h3{margin:0}
    .semio-cat{font-size:.7rem;color:#fff;padding:3px 9px;border-radius:999px;font-weight:700}
    .semio-sign-fig{margin:6px 0 10px;text-align:center;background:var(--card,#f8fafc);border:1px solid var(--border,#e2e8f0);border-radius:12px;padding:10px}
    .semio-sign-svg{width:100%;max-width:260px;height:auto}
    .semio-sign-fig figcaption{font-size:.72rem;color:var(--muted,#667085);margin-top:4px}
    @media(max-width:640px){.semio-corpo{grid-template-columns:1fr}.semio-corpo-fig{position:static;max-width:200px;margin:0 auto}}
    .semio-focus .semio-callout,.semio-focus .semio-doc{opacity:1}
    @media(max-width:560px){.semio-grid3{grid-template-columns:1fr 1fr}.semio-cards{grid-template-columns:1fr}.semio-tbl td:first-child{white-space:normal}}
    `;
    document.head.appendChild(s);
  }

  window.SemioSim = { mount, defaultState, MANOBRAS, CASOS, FICHAS };
})();
