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

  const MODULE_ART = {
    1: 'assets/semiologia-real/01-anatomia-semiologica/14.jpg',
    2: 'assets/semiologia-real/anamnese-focada-oficial/1.jpg',
    3: 'assets/semiologia-real/01-exame-fisico-geral-parte-01-e-02/12.png',
    4: 'assets/semiologia-real/01-exame-geral-cranio-e-face/109.png',
    5: 'assets/semiologia-real/01-pontos-anatomicos-pneumotorax-derrame-pleural-posicao-do-iot/12.jpg',
    6: 'assets/semiologia-real/01-anatomia-vascular-central-e-anatomia-arterial/12.jpg',
    7: 'assets/semiologia-real/06-figado-baco-rins-e-bexiga/29.jpg',
    8: 'assets/semiologia-real/07-semiologia-dermatologica-pt-1/12.jpg',
    9: 'assets/semiologia-real/01-exame-do-membro-superior/12.jpg',
    10: 'assets/semiologia-real/02-metodos-de-exame/12.jpg',
  };
  const moduleArt = (id) => MODULE_ART[id] || MODULE_ART[1];

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
  // As fotos das manobras também ficam sob controle do estudante.
  const MANOBRA_FOTO = {};

  // ---------------------------------------------------------------------------
  // 2b. BANCO DE AUSCULTA — sons reais (Littmann) com achados e quiz
  // ---------------------------------------------------------------------------
  const AUSCULTA = [
    { id: 's1-fisiologica', nome: 'B1 (primeira bulha) — normal', sistema: 'Cardíaco', arquivo: 'assets/audio/ausculta/coracao/s1-fisiologica.mp3',
      onde: 'Foco mitral/tricúspide, com o diafragma.',
      achado: 'Fechamento das valvas mitral e tricúspide, marca o início da sístole. Som de referência normal.',
      quiz: { p: 'A B1 (primeira bulha) corresponde a:', ops: ['Fechamento das valvas mitral e tricúspide', 'Fechamento das valvas aórtica e pulmonar', 'Abertura da valva mitral', 'Contração atrial'], correct: 0, exp: 'B1 = fechamento das valvas atrioventriculares (mitral/tricúspide), início da sístole.' } },
    { id: 's3-fisiologica', nome: 'B3 fisiológica', sistema: 'Cardíaco', arquivo: 'assets/audio/ausculta/coracao/s3-fisiologica.mp3',
      onde: 'Foco mitral, com a campânula, decúbito lateral esquerdo.',
      achado: 'Som protodiastólico grave logo após B2, pelo enchimento ventricular rápido. Comum e normal em crianças, jovens e gestantes — diferente da B3 patológica do adulto com ICC.',
      quiz: { p: 'B3 ouvida em uma gestante jovem e assintomática é, na maioria das vezes:', ops: ['Sempre patológica', 'Um achado fisiológico do alto débito/enchimento rápido', 'Sinal de estenose mitral', 'Indicação de ecocardiograma urgente'], correct: 1, exp: 'Em jovens/gestantes, B3 costuma ser fisiológica; em adultos com dispneia, pensar em ICC (ver manobra "Terceira bulha (B3)").' } },
    { id: 's4', nome: 'B4 (quarta bulha)', sistema: 'Cardíaco', arquivo: 'assets/audio/ausculta/coracao/s4.mp3',
      onde: 'Foco mitral, com a campânula.',
      achado: 'Som pré-sistólico (antes de B1), gerado pela contração atrial contra um ventrículo pouco complacente/hipertrofiado. Sugere HAS, cardiomiopatia hipertrófica ou isquemia. Ritmo "Te-le-ssístole" (Tennessee).',
      quiz: { p: 'A B4 é causada por:', ops: ['Fechamento valvar', 'Contração atrial contra ventrículo pouco complacente', 'Regurgitação valvar', 'Abertura da mitral'], correct: 1, exp: 'B4 = contração atrial vencendo um ventrículo rígido/hipertrofiado — nunca ocorre em fibrilação atrial (não há contração atrial coordenada).' } },
    { id: 'click-mesossistolico', nome: 'Click mesossistólico (prolapso mitral)', sistema: 'Cardíaco', arquivo: 'assets/audio/ausculta/coracao/click-mesossistolico.mp3',
      onde: 'Foco mitral/ápice.',
      achado: 'Estalido protomesossistólico, às vezes seguido de sopro telessistólico — síndrome do click-murmúrio do prolapso da valva mitral. Manobras que reduzem o volume ventricular (Valsalva, ortostatismo) antecipam o click e alongam o sopro.',
      quiz: { p: 'O click mesossistólico seguido de sopro telessistólico é característico de:', ops: ['Estenose aórtica', 'Prolapso da valva mitral', 'CIV', 'Pericardite'], correct: 1, exp: 'É a síndrome do click-murmúrio do prolapso mitral.' } },
    { id: 'estenose-mitral', nome: 'Sopro diastólico — Estenose mitral', sistema: 'Cardíaco', arquivo: 'assets/audio/ausculta/coracao/estenose-mitral.mp3',
      onde: 'Foco mitral, com a campânula, decúbito lateral esquerdo, após exercício leve.',
      achado: 'Ruflar (rumble) diastólico de baixa frequência, com reforço pré-sistólico (se ritmo sinusal), frequentemente precedido de estalido de abertura.',
      quiz: { p: 'O ruflar diastólico mitral se ausculta melhor:', ops: ['Com o diafragma, sentado', 'Com a campânula, em decúbito lateral esquerdo', 'Em pé, apneia inspiratória', 'No foco aórtico'], correct: 1, exp: 'É um som grave — a campânula e o decúbito lateral esquerdo aproximam o ápice do tórax.' } },
    { id: 'regurgitacao-mitral', nome: 'Sopro sistólico — Regurgitação mitral', sistema: 'Cardíaco', arquivo: 'assets/audio/ausculta/coracao/regurgitacao-mitral.mp3',
      onde: 'Foco mitral, irradiando para a axila.',
      achado: 'Sopro holossistólico (em platô), de timbre em "jato de vapor", irradiando classicamente para a axila esquerda.',
      quiz: { p: 'O sopro da regurgitação mitral irradia classicamente para:', ops: ['Carótidas', 'Axila esquerda', 'Dorso', 'Região epigástrica'], correct: 1, exp: 'Irradiação típica: foco mitral → axila.' } },
    { id: 'regurgitacao-aortica', nome: 'Sopro diastólico — Regurgitação aórtica', sistema: 'Cardíaco', arquivo: 'assets/audio/ausculta/coracao/regurgitacao-aortica.mp3',
      onde: 'Foco aórtico acessório (Erb, 3º EIC esquerdo), paciente sentado, inclinado à frente, em apneia expiratória.',
      achado: 'Sopro diastólico decrescente, aspirativo ("em decrescendo"), logo após B2.',
      quiz: { p: 'Para auscultar melhor a regurgitação aórtica, o paciente deve:', ops: ['Deitar em decúbito lateral esquerdo', 'Sentar, inclinar-se à frente e prender a expiração', 'Fazer Valsalva', 'Deitar em decúbito dorsal e inspirar fundo'], correct: 1, exp: 'Essa posição aproxima a via de saída da aorta da parede torácica, realçando o sopro diastólico aspirativo.' } },
    { id: 'defeito-septal-atrial', nome: 'CIA — Comunicação interatrial', sistema: 'Cardíaco', arquivo: 'assets/audio/ausculta/coracao/defeito-septal-atrial.mp3',
      onde: 'Foco pulmonar.',
      achado: 'Sopro sistólico ejetivo em foco pulmonar (por hiperfluxo) associado ao achado clássico de desdobramento FIXO de B2 (não varia com a respiração).',
      quiz: { p: 'O achado auscultatório mais característico da CIA é:', ops: ['Desdobramento fixo de B2', 'Estalido de abertura', 'B4 proeminente', 'Sopro diastólico aspirativo'], correct: 0, exp: 'O hiperfluxo pulmonar crônico causa o clássico desdobramento fixo (não respirodependente) de B2.' } },
    { id: 'defeito-septal-ventricular', nome: 'CIV — Comunicação interventricular', sistema: 'Cardíaco', arquivo: 'assets/audio/ausculta/coracao/defeito-septal-ventricular.mp3',
      onde: 'Borda esternal esquerda baixa (3º–4º EIC).',
      achado: 'Sopro holossistólico "em banda", de alta intensidade, frequentemente acompanhado de frêmito palpável no local — quanto menor o defeito, mais alto costuma soar o sopro.',
      quiz: { p: 'O sopro da CIV é mais bem auscultado em:', ops: ['Foco aórtico', 'Borda esternal esquerda baixa', 'Foco mitral', 'Base do pescoço'], correct: 1, exp: 'É o local de maior turbulência do shunt interventricular.' } },
    { id: 'ruido-normal-vesicular', nome: 'Murmúrio vesicular normal', sistema: 'Pulmonar', arquivo: 'assets/audio/ausculta/pulmao/ruido-normal-vesicular.mp3',
      onde: 'Campos pulmonares periféricos.',
      achado: 'Som suave e grave, audível principalmente na inspiração (a expiração é quase silenciosa) — o ruído normal do parênquima pulmonar.',
      quiz: { p: 'No murmúrio vesicular normal:', ops: ['A expiração é mais audível que a inspiração', 'A inspiração é mais audível e a expiração é quase silenciosa', 'Inspiração e expiração têm igual duração e intensidade', 'É um som tubular e áspero'], correct: 1, exp: 'É o padrão inverso do som brônquico/traqueal — inspiração > expiração.' } },
    { id: 'ruido-normal-traqueia', nome: 'Ruído traqueal/brônquico normal', sistema: 'Pulmonar', arquivo: 'assets/audio/ausculta/pulmao/ruido-normal-traqueia.mp3',
      onde: 'Sobre a traqueia e grandes vias aéreas.',
      achado: 'Som mais áspero e tubular que o vesicular, com inspiração e expiração de duração semelhante — normal nesse local, mas patológico (som brônquico) se ouvido na periferia do pulmão.',
      quiz: { p: 'Ouvir um som tubular como esse na PERIFERIA do pulmão sugere:', ops: ['Normalidade', 'Consolidação (som brônquico ectópico)', 'Derrame pleural', 'Pneumotórax'], correct: 1, exp: 'Consolidação transmite melhor o som das grandes vias — é o "sopro tubário"/ruído brônquico fora do lugar.' } },
    { id: 'ruido-bronquial', nome: 'Ruído brônquico (em área periférica)', sistema: 'Pulmonar', arquivo: 'assets/audio/ausculta/pulmao/ruido-bronquial.mp3',
      onde: 'Área pulmonar periférica onde normalmente se ouviria apenas o murmúrio vesicular.',
      achado: 'Som tubular, alto, com inspiração ≈ expiração, transmitido de vias aéreas centrais através de tecido consolidado — compõe a síndrome de consolidação junto com FTV aumentado e macicez.',
      quiz: { p: 'Ruído brônquico numa base pulmonar, junto com FTV aumentado e macicez, forma a síndrome de:', ops: ['Derrame pleural', 'Consolidação pulmonar', 'Pneumotórax', 'DPOC'], correct: 1, exp: 'É a tríade clássica da consolidação (ex.: pneumonia).' } },
    { id: 'crepitacoes-finas', nome: 'Crepitações finas ("velcro")', sistema: 'Pulmonar', arquivo: 'assets/audio/ausculta/pulmao/crepitacoes-finas.mp3',
      onde: 'Bases pulmonares, final da inspiração.',
      achado: 'Estalidos curtos, de alta frequência, ao final da inspiração, lembrando o som de velcro sendo aberto — clássicos de fibrose pulmonar; também surgem nas fases iniciais do edema pulmonar/ICC.',
      quiz: { p: 'Crepitações finas em "velcro" nas bases, bilaterais e persistentes, sugerem fortemente:', ops: ['Asma', 'Fibrose pulmonar', 'Pneumotórax', 'Derrame pleural volumoso'], correct: 1, exp: 'É o achado auscultatório clássico da fibrose pulmonar (também presente na ICC).' } },
    { id: 'crepitacoes-finas-sons-bronquiais', nome: 'Crepitações finas + sons bronquiais', sistema: 'Pulmonar', arquivo: 'assets/audio/ausculta/pulmao/crepitacoes-finas-sons-bronquiais.mp3',
      onde: 'Área de consolidação com secreção associada.',
      achado: 'Combinação de crepitações finas com ruído brônquico transmitido — sugere consolidação (pneumonia) com componente de secreção nas vias aéreas menores.',
      quiz: { p: 'A combinação de crepitações finas com som brônquico numa área pulmonar sugere:', ops: ['Pulmão normal', 'Consolidação com secreção associada', 'Pneumotórax hipertensivo', 'Ausência de doença'], correct: 1, exp: 'É comum em pneumonias — som brônquico pela consolidação, crepitações pela secreção/exsudato alveolar.' } },
    { id: 'crepitacoes-fortes', nome: 'Crepitações grossas/bolhosas', sistema: 'Pulmonar', arquivo: 'assets/audio/ausculta/pulmao/crepitacoes-fortes.mp3',
      onde: 'Vias aéreas de maior calibre, ambas as fases respiratórias.',
      achado: 'Sons mais graves e "úmidos", de bolhas maiores, por secreção em vias aéreas de maior calibre — presentes em pneumonia mais avançada, bronquiectasias e edema pulmonar mais franco.',
      quiz: { p: 'Crepitações grossas/bolhosas, diferente das finas em velcro, indicam secreção em:', ops: ['Alvéolos apenas', 'Vias aéreas de maior calibre', 'Pleura', 'Mediastino'], correct: 1, exp: 'O timbre mais grave e as bolhas maiores refletem secreção em brônquios de maior calibre.' } },
    { id: 'estridor-inspiratorio', nome: 'Estridor inspiratório', sistema: 'Pulmonar', arquivo: 'assets/audio/ausculta/pulmao/estridor-inspiratorio.mp3',
      onde: 'Audível mesmo sem estetoscópio, sobre laringe/traqueia.',
      achado: 'Som agudo, musical, predominantemente inspiratório, por obstrução de via aérea SUPERIOR (laringe/traqueia) — crupe, corpo estranho, epiglotite, edema de glote. É sinal de alarme.',
      quiz: { p: 'O estridor inspiratório indica obstrução:', ops: ['De pequenas vias aéreas (asma)', 'De via aérea superior (laringe/traqueia)', 'Alveolar difusa', 'Pleural'], correct: 1, exp: 'Diferente do sibilo (vias baixas), o estridor é típico de obstrução alta — emergência potencial.' } },
    { id: 'roncos', nome: 'Roncos', sistema: 'Pulmonar', arquivo: 'assets/audio/ausculta/pulmao/roncos.mp3',
      onde: 'Vias aéreas de maior calibre, ambas as fases respiratórias.',
      achado: 'Som grave, contínuo, "ronronado", causado por secreção espessa ou estreitamento de vias aéreas maiores — típico de bronquite/DPOC; costuma mudar ou desaparecer com a tosse.',
      quiz: { p: 'Um som grave e contínuo que muda de característica após a tosse é típico de:', ops: ['Sibilo por broncoespasmo fixo', 'Roncos por secreção em vias aéreas maiores', 'Estridor laríngeo', 'Atrito pleural'], correct: 1, exp: 'Roncos mudam/desaparecem com a tosse por serem causados por secreção mobilizável.' } },
    { id: 'sibilos', nome: 'Sibilos', sistema: 'Pulmonar', arquivo: 'assets/audio/ausculta/pulmao/sibilos.mp3',
      onde: 'Predominam na expiração, por todo o tórax.',
      achado: 'Sons agudos, musicais, contínuos, por obstrução/estreitamento de pequenas vias aéreas — marca registrada de asma e DPOC/broncoespasmo. Predominam na expiração.',
      quiz: { p: 'Sibilos difusos, predominantemente expiratórios, são a marca registrada de:', ops: ['Obstrução de via aérea superior', 'Broncoespasmo (asma/DPOC)', 'Derrame pleural', 'Fibrose pulmonar'], correct: 1, exp: 'Estreitamento de pequenas vias aéreas gera esse som agudo e musical, mais audível na expiração.' } },
    { id: 'atrito-pleural', nome: 'Atrito pleural', sistema: 'Pulmonar', arquivo: 'assets/audio/ausculta/pulmao/atrito-pleural.mp3',
      onde: 'Área de dor pleurítica, ambas as fases respiratórias.',
      achado: 'Som áspero, de "couro rangendo" ou "pisar na neve", por atrito entre folhetos pleurais inflamados — desaparece se um derrame se acumular entre eles.',
      quiz: { p: 'O atrito pleural desaparece quando:', ops: ['O paciente tosse', 'Se acumula líquido (derrame) entre os folhetos pleurais', 'O paciente inspira fundo', 'Nunca desaparece'], correct: 1, exp: 'O líquido separa os folhetos inflamados, eliminando o atrito entre eles.' } },
  ];
  const AUSCULTA_MAP = Object.fromEntries(AUSCULTA.map((a) => [a.id, a]));

  const MF = (vb, inner) => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" class="semio-sign-svg" role="img">${inner}</svg>`;
  const MANOBRA_FIG = {
    ftv: MF('0 0 220 130', `
      <path d="M30 20 Q110 4 190 20 L196 108 Q110 128 24 108 Z" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <g stroke="#3a6ea5" stroke-width="1.4" fill="none">
        <path d="M64 40 q6 8 0 16"/><path d="M74 40 q6 8 0 16"/>
        <path d="M146 40 q6 8 0 16"/><path d="M156 40 q6 8 0 16"/></g>
      <text x="70" y="76" font-size="10" fill="#667085" text-anchor="middle">"trinta e três"</text>
      <text x="150" y="76" font-size="10" fill="#667085" text-anchor="middle">comparar lados</text>`),
    egofonia: MF('0 0 220 130', `
      <path d="M30 20 Q110 4 190 20 L196 108 Q110 128 24 108 Z" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <circle cx="150" cy="60" r="14" fill="none" stroke="#c0392b" stroke-width="2"/>
      <text x="150" y="64" font-size="12" fill="#c0392b" text-anchor="middle" font-weight="700">É</text>
      <text x="150" y="100" font-size="10" fill="#667085" text-anchor="middle">"i" soa como "é"</text>`),
    murphy: MF('0 0 200 130', `
      <path d="M40 20 Q100 6 160 20 L166 108 Q100 128 34 108 Z" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <ellipse cx="125" cy="55" rx="14" ry="18" fill="#7a9a5b" stroke="#5a7a3b" stroke-width="1.4"/>
      <path d="M115 40 v-16" stroke="#c0392b" stroke-width="2"/>
      <text x="100" y="122" font-size="10" fill="#667085" text-anchor="middle">Inspiração + palpação do HD → parada</text>`),
    blumberg: MF('0 0 200 130', `
      <path d="M40 20 Q100 6 160 20 L166 108 Q100 128 34 108 Z" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <circle cx="150" cy="86" r="8" fill="#c0392b" opacity=".55"/>
      <path d="M150 60 v18" stroke="#3a6ea5" stroke-width="2"/>
      <text x="100" y="122" font-size="10" fill="#667085" text-anchor="middle">Dor à retirada súbita da mão (FID)</text>`),
    'macicez-movel': MF('0 0 200 130', `
      <ellipse cx="100" cy="60" rx="66" ry="40" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <path d="M50 70 Q100 88 150 70 L150 84 Q100 102 50 84 Z" fill="#9fc3e0" opacity=".8"/>
      <text x="100" y="118" font-size="10" fill="#c0392b" text-anchor="middle">Interface desloca ao mudar decúbito</text>`),
    babinski: MF('0 0 200 120', `
      <path d="M60 100 L60 40 Q80 20 130 40 L140 90 Q100 108 60 100 Z" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <path d="M70 90 L50 70" stroke="#3a6ea5" stroke-width="2"/>
      <path d="M115 44 q10 -14 0 -22" stroke="#c0392b" stroke-width="2.4" fill="none"/>
      <text x="100" y="114" font-size="10" fill="#667085" text-anchor="middle">Extensão do hálux (positivo)</text>`),
    meningeos: MF('0 0 200 120', `
      <ellipse cx="100" cy="40" rx="26" ry="28" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <path d="M100 66 q0 20 0 40" stroke="#8a6a4a" stroke-width="10" stroke-linecap="round"/>
      <path d="M78 60 q22 20 44 0" stroke="#c0392b" stroke-width="2" fill="none"/>
      <text x="100" y="112" font-size="10" fill="#667085" text-anchor="middle">Flexão passiva da nuca — resistência/dor</text>`),
    ortostatica: MF('0 0 200 120', `
      <rect x="86" y="16" width="28" height="60" rx="8" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <text x="100" y="8" font-size="10" fill="#667085" text-anchor="middle">Deitado</text>
      <rect x="150" y="30" width="20" height="70" rx="8" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <text x="160" y="20" font-size="10" fill="#667085" text-anchor="middle">Em pé (1' e 3')</text>
      <text x="100" y="112" font-size="10" fill="#c0392b" text-anchor="middle">Queda ≥ 20/10 mmHg = positivo</text>`),
    b3: MF('0 0 200 100', `
      <path d="M20 50 q10 -6 20 0 q10 6 20 0 q10 -30 20 0 q10 30 20 0 q10 -6 20 0 q10 -22 20 0 q10 6 20 0" fill="none" stroke="#3a6ea5" stroke-width="2"/>
      <text x="55" y="70" font-size="9" fill="#667085" text-anchor="middle">B1</text>
      <text x="105" y="70" font-size="9" fill="#667085" text-anchor="middle">B2</text>
      <text x="150" y="86" font-size="9" fill="#c0392b" text-anchor="middle">B3 (surda, protodiastólica)</text>`),
    'valsalva-cmh': MF('0 0 200 110', `
      <path d="M20 60 h40 q6 -34 12 0 h30 q6 12 12 0 h40" fill="none" stroke="#3a6ea5" stroke-width="2"/>
      <text x="100" y="20" font-size="10" fill="#667085" text-anchor="middle">↓ retorno venoso (Valsalva)</text>
      <text x="100" y="98" font-size="10" fill="#c0392b" text-anchor="middle">Sopro AUMENTA na CMH/prolapso</text>`),
  };

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
    facies: F('0 0 200 110', `
      <ellipse cx="100" cy="55" rx="52" ry="46" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <circle cx="82" cy="46" r="5" fill="#2b2b2b"/><circle cx="118" cy="46" r="5" fill="#2b2b2b"/>
      <path d="M84 74 Q100 82 116 74" fill="none" stroke="#8a6a4a" stroke-width="2.4" stroke-linecap="round"/>
      <text x="100" y="102" font-size="10" fill="#667085" text-anchor="middle">Expressão, simetria e cor do rosto</text>`),
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
    ascite: F('0 0 200 140', `
      <path d="M40 30 Q100 14 160 30 L170 110 Q100 132 30 110 Z" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <path d="M46 88 Q100 108 154 88 L160 105 Q100 126 40 105 Z" fill="#9fc3e0" opacity=".75"/>
      <path d="M35 55 q4 -4 8 0" stroke="#3a6ea5" stroke-width="1.4" fill="none"/>
      <text x="100" y="16" font-size="10" fill="#667085" text-anchor="middle">Decúbito dorsal → lateral</text>
      <text x="100" y="132" font-size="10" fill="#c0392b" text-anchor="middle">Nível líquido se desloca (macicez móvel)</text>`),
    hepatomegalia: F('0 0 200 140', `
      <path d="M40 30 Q100 14 160 30 L165 100 Q100 120 35 100 Z" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <path d="M108 40 Q150 44 152 76 Q150 96 112 92 Q92 88 96 62 Q98 46 108 40 Z" fill="#9a5b45" stroke="#7a4433" stroke-width="1.4"/>
      <path d="M120 30 L114 96" stroke="#c9ac8f" stroke-width="1" stroke-dasharray="3 3"/>
      <text x="100" y="132" font-size="10" fill="#667085" text-anchor="middle">Borda a X cm do rebordo costal D</text>`),
    esplenomegalia: F('0 0 200 140', `
      <path d="M40 30 Q100 14 160 30 L165 100 Q100 120 35 100 Z" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <ellipse cx="70" cy="58" rx="22" ry="30" fill="#6b3f6b" stroke="#4d2c4d" stroke-width="1.4" transform="rotate(-18 70 58)"/>
      <text x="100" y="132" font-size="10" fill="#667085" text-anchor="middle">Palpável = já aumentado (2–3×)</text>`),
    ictus: F('0 0 200 140', `
      <path d="M40 26 Q100 12 160 26 L166 108 Q100 128 34 108 Z" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <path d="M78 60 C70 46 96 40 100 56 C104 40 130 46 122 60 C114 76 100 88 100 88 C100 88 86 76 78 60 Z" fill="#b23b3b"/>
      <circle cx="86" cy="88" r="4" fill="none" stroke="#c0392b" stroke-width="1.4"/>
      <text x="100" y="130" font-size="10" fill="#667085" text-anchor="middle">5º EIC, linha hemiclavicular</text>`),
    jugular: F('0 0 200 130', `
      <ellipse cx="100" cy="34" rx="30" ry="32" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <path d="M84 60 L78 118" stroke="#3b5aa0" stroke-width="9" stroke-linecap="round" opacity=".8"/>
      <line x1="40" y1="118" x2="160" y2="70" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3 3"/>
      <text x="100" y="128" font-size="10" fill="#667085" text-anchor="middle">45° — distensão acima do esperado</text>`),
    tireoide: F('0 0 200 120', `
      <ellipse cx="100" cy="30" rx="26" ry="28" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <path d="M78 66 q22 -10 44 0 q-4 20 -22 20 q-18 0 -22 -20 Z" fill="#c97a63" stroke="#a35a45" stroke-width="1.4"/>
      <text x="100" y="112" font-size="10" fill="#667085" text-anchor="middle">Sobe com a deglutição</text>`),
    'linfonodo-cervical': F('0 0 200 120', `
      <ellipse cx="100" cy="30" rx="26" ry="28" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <circle cx="130" cy="60" r="8" fill="#d9b3a8" stroke="#b17f6f" stroke-width="1.4"/>
      <circle cx="140" cy="76" r="6" fill="#d9b3a8" stroke="#b17f6f" stroke-width="1.4"/>
      <text x="100" y="112" font-size="10" fill="#667085" text-anchor="middle">Cadeias cervicais — comparar bilateral</text>`),
    'cianose-central': F('0 0 200 110', `
      <path d="M70 40 Q100 34 130 40 Q128 62 100 66 Q72 62 70 40 Z" fill="#6b8fae" stroke="#4d6c88" stroke-width="1.6"/>
      <text x="100" y="98" font-size="10" fill="#667085" text-anchor="middle">Lábios/língua azulados — hipoxemia</text>`),
    'circulacao-colateral': F('0 0 200 130', `
      <path d="M40 26 Q100 12 160 26 L166 108 Q100 128 34 108 Z" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <circle cx="100" cy="70" r="5" fill="#8a6a4a"/>
      <g stroke="#3b5aa0" stroke-width="2" fill="none">
        <path d="M100 65 q-20 -20 -40 -14"/><path d="M100 65 q20 -20 40 -14"/>
        <path d="M100 75 q-20 20 -40 14"/><path d="M100 75 q20 20 40 14"/></g>
      <text x="100" y="126" font-size="10" fill="#667085" text-anchor="middle">"Cabeça de medusa" — hipertensão portal</text>`),
    'eritema-palmar': F('0 0 180 120', `
      <path d="M60 100 L60 40 Q60 26 90 26 Q120 26 120 44 L120 100 Z" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <ellipse cx="72" cy="90" rx="10" ry="7" fill="#c0392b" opacity=".55"/>
      <ellipse cx="108" cy="90" rx="10" ry="7" fill="#c0392b" opacity=".55"/>
      <text x="90" y="114" font-size="10" fill="#667085" text-anchor="middle">Eminências avermelhadas, centro poupado</text>`),
    tremor: F('0 0 200 120', `
      <path d="M50 90 L54 40" stroke="#e7d3bf" stroke-width="16" stroke-linecap="round"/>
      <path d="M150 90 L146 40" stroke="#e7d3bf" stroke-width="16" stroke-linecap="round"/>
      <path d="M50 40 q3 10 -3 18" stroke="#c0392b" stroke-width="2" fill="none"/>
      <path d="M150 40 q-3 10 3 18" stroke="#c0392b" stroke-width="2" fill="none"/>
      <text x="100" y="112" font-size="10" fill="#667085" text-anchor="middle">Asterixis — queda súbita ("flapping")</text>`),
    perfusao: F('0 0 200 100', `
      <rect x="75" y="30" width="20" height="46" rx="9" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <rect x="80" y="60" width="10" height="14" fill="#c0392b" opacity=".5"/>
      <text x="60" y="92" font-size="10" fill="#667085" text-anchor="middle">Comprime</text>
      <path d="M110 50 h30" stroke="#94a3b8" stroke-width="1.6"/>
      <text x="150" y="46" font-size="10" fill="#667085">≤ 2s = normal</text>`),
    'macicez-movel': F('0 0 200 130', `
      <ellipse cx="100" cy="70" rx="66" ry="40" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <path d="M50 78 Q100 96 150 78 L150 92 Q100 110 50 92 Z" fill="#9fc3e0" opacity=".8"/>
      <text x="100" y="20" font-size="10" fill="#667085" text-anchor="middle">Muda de posição →</text>
      <text x="100" y="122" font-size="10" fill="#c0392b" text-anchor="middle">Interface timpânico/maciço se desloca</text>`),
    'edema-sacral': F('0 0 200 110', `
      <path d="M60 20 L60 90 Q100 100 140 90 L140 20" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <ellipse cx="100" cy="70" rx="24" ry="14" fill="#d8c2ab"/>
      <text x="100" y="102" font-size="10" fill="#c0392b" text-anchor="middle">Sacro — área mais baixa no acamado</text>`),
    'lesao-pressao': F('0 0 200 100', `
      <ellipse cx="100" cy="50" rx="60" ry="30" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <circle cx="100" cy="50" r="18" fill="#d98a7c"/>
      <text x="100" y="92" font-size="10" fill="#667085" text-anchor="middle">Eritema não-branqueável — estágio 1</text>`),
    escoliose: F('0 0 140 160', `
      <path d="M70 12 C40 40 100 70 60 100 C30 130 90 148 70 150" fill="none" stroke="#8a6a4a" stroke-width="8" stroke-linecap="round"/>
      <text x="70" y="12" font-size="0"/>
      <text x="70" y="20" font-size="10" fill="#667085" text-anchor="middle">↑</text>
      <text x="70" y="158" font-size="10" fill="#667085" text-anchor="middle">Curva em "S"</text>`),
    dupuytren: F('0 0 180 130', `
      <path d="M60 110 L60 50 Q60 34 90 34 Q120 34 120 52 L120 110 Z" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <path d="M72 108 Q78 78 96 70" stroke="#8a6a4a" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M96 108 Q100 80 112 70" stroke="#8a6a4a" stroke-width="4" fill="none" stroke-linecap="round"/>
      <text x="90" y="124" font-size="10" fill="#667085" text-anchor="middle">Cordão fibroso — flexão do 4º/5º dedo</text>`),
    'osler-janeway': F('0 0 180 120', `
      <path d="M60 100 L60 40 Q60 26 90 26 Q120 26 120 44 L120 100 Z" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <circle cx="72" cy="86" r="6" fill="#c0392b"/><circle cx="100" cy="90" r="5" fill="#c0392b"/>
      <text x="90" y="114" font-size="10" fill="#667085" text-anchor="middle">Osler (dolorosos) / Janeway (indolores)</text>`),
    'expansibilidade-posterior': F('0 0 200 130', `
      <path d="M40 30 Q100 14 160 30 L165 108 Q100 128 35 108 Z" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <line x1="100" y1="35" x2="100" y2="105" stroke="#8a6a4a" stroke-width="2"/>
      <path d="M60 60 h-14" stroke="#3a6ea5" stroke-width="2"/><path d="M140 60 h14" stroke="#3a6ea5" stroke-width="2"/>
      <text x="100" y="126" font-size="10" fill="#667085" text-anchor="middle">Polegares se afastam simetricamente</text>`),
    'macicez-base': F('0 0 200 130', `
      <path d="M40 30 Q100 14 160 30 L165 108 Q100 128 35 108 Z" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <path d="M46 88 Q100 105 154 88 L160 106 Q100 124 40 106 Z" fill="#3a6ea5" opacity=".5"/>
      <text x="100" y="126" font-size="10" fill="#667085" text-anchor="middle">Macicez basal — derrame pleural</text>`),
    giordano: F('0 0 200 130', `
      <path d="M40 30 Q100 14 160 30 L165 108 Q100 128 35 108 Z" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <circle cx="130" cy="66" r="10" fill="none" stroke="#c0392b" stroke-width="2"/>
      <path d="M130 46 v-14" stroke="#c0392b" stroke-width="2"/>
      <text x="100" y="126" font-size="10" fill="#667085" text-anchor="middle">Punho-percussão da loja renal</text>`),
    'linfonodo-supraclavicular': F('0 0 200 120', `
      <path d="M40 26 Q100 12 160 26 L165 100 Q100 118 35 100 Z" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <circle cx="132" cy="42" r="8" fill="#d9b3a8" stroke="#b17f6f" stroke-width="1.4"/>
      <text x="100" y="114" font-size="10" fill="#667085" text-anchor="middle">Gânglio de Virchow — fossa supraclavicular E</text>`),
    'tvp-panturrilha': F('0 0 140 150', `
      <path d="M55 20 L55 100 Q70 120 55 140" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <path d="M95 20 L102 100 Q88 120 100 140" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <ellipse cx="100" cy="80" rx="14" ry="20" fill="#c0392b" opacity=".4"/>
      <text x="70" y="148" font-size="10" fill="#667085" text-anchor="middle">Assimetria + empastamento</text>`),
    pupilas: F('0 0 200 100', `
      <circle cx="70" cy="50" r="26" fill="#fff" stroke="#c9ac8f" stroke-width="1.6"/>
      <circle cx="70" cy="50" r="10" fill="#2b2b2b"/>
      <circle cx="140" cy="50" r="26" fill="#fff" stroke="#c9ac8f" stroke-width="1.6"/>
      <circle cx="140" cy="50" r="16" fill="#2b2b2b"/>
      <text x="100" y="92" font-size="10" fill="#c0392b" text-anchor="middle">Anisocoria — assimetria pupilar</text>`),
    'desvio-rima': F('0 0 200 120', `
      <ellipse cx="100" cy="55" rx="55" ry="50" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <circle cx="80" cy="45" r="5" fill="#2b2b2b"/><circle cx="120" cy="45" r="5" fill="#2b2b2b"/>
      <path d="M75 78 Q95 70 130 84" fill="none" stroke="#7a4433" stroke-width="3" stroke-linecap="round"/>
      <text x="100" y="116" font-size="10" fill="#667085" text-anchor="middle">Comissura desviada para o lado são</text>`),
    'mucosa-hidratacao': F('0 0 200 100', `
      <ellipse cx="100" cy="50" rx="55" ry="34" fill="#e7d3bf" stroke="#b89c82" stroke-width="1.6"/>
      <ellipse cx="100" cy="58" rx="30" ry="12" fill="#c97a63"/>
      <path d="M78 58 h44" stroke="#8a4a3a" stroke-width="1" stroke-dasharray="2 2"/>
      <text x="100" y="92" font-size="10" fill="#667085" text-anchor="middle">Mucosa seca + turgor lentificado</text>`),
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
      ui: { sub: 'inicio', aulaModId: null, aulaTopicoId: null, manobraId: null, auscultaId: null, casoId: null, focus: false, fichaSistema: 'Todos', corpoSignId: null, corpoTeste: false, corpoTesteId: null, corpoView: 'ant' },
      srs: {}, progress: {}, caseState: {}, highlights: {}, images: {}, log: [],
      daily: { date: todayISO(), studied: 0 },
    };
  }

  function ensureState() {
    const S = BRIDGE.getState();
    if (!S.semio) S.semio = defaultState();
    const d = defaultState();
    S.semio.ui = Object.assign({}, d.ui, S.semio.ui);
    ['srs', 'progress', 'caseState', 'highlights', 'images'].forEach((k) => { if (!S.semio[k]) S.semio[k] = {}; });
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
  // troca jpg<->png automaticamente se o arquivo real usar outra extensão; some se nenhuma existir
  const imgFallback = `(function(im){var t=im.dataset.try||0;t=+t+1;im.dataset.try=t;var src=im.getAttribute('src');var alt=src.replace(/\\.(jpg|png)$/i,t===1?'.png':'.jpg');if(t<=1){im.src=alt;}else{im.closest('figure').style.display='none';}})(this)`;

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
      case 'img': return `<figure class="semio-fig semio-fig-photo"><button type="button" class="semio-image-button" data-semio-lightbox="${esc(b.x)}" aria-label="Ampliar imagem: ${esc(b.cap || 'Imagem da aula')}"><img src="${esc(b.x)}" alt="${esc(b.cap || 'Imagem da aula')}" loading="lazy" onerror="${imgFallback}"></button>${b.cap ? `<figcaption>${esc(b.cap)}</figcaption>` : ''}</figure>`;
      case 'imggrid': return `<details class="semio-atlas"><summary><span><b>Atlas visual complementar</b><small>${b.x.length} imagens desta aula, organizadas em sequência</small></span><i aria-hidden="true">+</i></summary><div class="semio-atlas-grid">${b.x.map((image, imageIndex) => `<figure class="semio-fig semio-fig-photo"><button type="button" class="semio-image-button" data-semio-lightbox="${esc(image.src)}" aria-label="Ampliar ${esc(image.cap || `imagem ${imageIndex + 1}`)}"><img src="${esc(image.src)}" alt="${esc(image.cap || `Imagem ${imageIndex + 1}`)}" loading="lazy" onerror="${imgFallback}"></button><figcaption>${esc(image.cap || `Imagem ${imageIndex + 1}`)}</figcaption></figure>`).join('')}</div></details>`;
      case 'placeholder':
      case 'manualimg': return '';
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
    const pct = topicsTotal ? Math.round((topicsDone / topicsTotal) * 100) : 0;
    return `<section class="semio-hero">
        <div class="semio-hero-copy">
          <span class="semio-eyebrow">Habilidade clínica essencial</span>
          <h1>Do sintoma ao sinal.<br>Do sinal ao diagnóstico.</h1>
          <p>Aprenda a observar, perguntar e examinar com método — conectando técnica, raciocínio clínico e segurança do paciente.</p>
          <div class="semio-hero-actions">
            <button class="semio-btn semio-btn-primary" data-go="aulas">Explorar as aulas <span aria-hidden="true">→</span></button>
            <button class="semio-btn ghost" data-go="manobras">Treinar manobras</button>
          </div>
        </div>
        <div class="semio-hero-art" aria-hidden="true">
          <div class="semio-art-main"><img src="${moduleArt(1)}" alt=""></div>
          <div class="semio-art-small"><img src="${moduleArt(7)}" alt=""></div>
          <div class="semio-art-seal"><strong>${mods.length}</strong><span>módulos<br>clínicos</span></div>
        </div>
      </section>
      <section class="semio-progress-strip" aria-label="Seu progresso em Semiologia">
        <div class="semio-progress-copy"><span>Seu percurso</span><strong>${pct}% concluído</strong></div>
        <div class="semio-progress semio-progress-large"><div style="width:${pct}%"></div></div>
        <div class="semio-progress-metrics">
          <span><strong>${topicsDone}</strong> de ${topicsTotal} tópicos</span>
          <span><strong>${m.acc}%</strong> de acerto</span>
          <span class="${m.dueCount ? 'is-due' : ''}"><strong>${m.dueCount}</strong> revisões</span>
        </div>
      </section>
      <section class="semio-home-section">
        <div class="semio-section-heading"><div><span class="semio-eyebrow">Prática orientada</span><h2>Escolha como estudar hoje</h2></div><p>Conteúdo teórico e treino clínico reunidos em uma única trilha.</p></div>
        <div class="semio-feature-grid">
          <button class="semio-feature-card is-wide" data-go="aulas"><span class="semio-feature-icon">A</span><span><b>Aulas por sistemas</b><small>${mods.length} módulos, do método clínico ao exame neurológico</small></span><i>→</i></button>
          <button class="semio-feature-card" data-go="corpo"><span class="semio-feature-icon">C</span><span><b>Corpo semiológico</b><small>Explore sinais por região</small></span><i>→</i></button>
          <button class="semio-feature-card" data-go="manobras"><span class="semio-feature-icon">M</span><span><b>Manobras</b><small>Técnica, utilidade e evidência</small></span><i>→</i></button>
          <button class="semio-feature-card" data-go="ausculta"><span class="semio-feature-icon">Au</span><span><b>Ausculta</b><small>Reconheça sons e achados</small></span><i>→</i></button>
          <button class="semio-feature-card" data-go="casos"><span class="semio-feature-icon">Ca</span><span><b>Casos guiados</b><small>Decida passo a passo</small></span><i>→</i></button>
          <button class="semio-feature-card" data-go="fichas"><span class="semio-feature-icon">F</span><span><b>Fichas rápidas</b><small>Revisão para o beira-leito</small></span><i>→</i></button>
        </div>
      </section>
      <section class="semio-home-section semio-module-preview">
        <div class="semio-section-heading"><div><span class="semio-eyebrow">Conteúdo da trilha</span><h2>Estude por módulos</h2></div><button class="semio-text-link" data-go="aulas">Ver todos <span>→</span></button></div>
        ${aulasModulosHtml(true)}
      </section>`;
  }

  // ---- Aulas ----
  function aulasModulosHtml(compact = false) {
    const S = st();
    const mods = (window.SemioAulas && window.SemioAulas.MODULOS) || [];
    const list = compact ? mods.slice(0, 4) : mods;
    return `${compact ? '' : `<div class="semio-catalog-head"><span class="semio-eyebrow">Biblioteca clínica</span><h1>Aulas de Semiologia</h1><p>Do primeiro encontro com o paciente ao exame físico de cada sistema.</p></div>`}<div class="semio-module-grid">${list.map((mod) => {
      const done = mod.topicos.filter((t) => S.progress['aula:' + mod.id + ':' + t.id]).length;
      const pct = Math.round((done / mod.topicos.length) * 100);
      return `<button class="semio-module-card" data-mod="${mod.id}">
        <span class="semio-module-cover"><img src="${moduleArt(mod.id)}" alt=""><i>${String(mod.id).padStart(2, '0')}</i></span>
        <span class="semio-module-content"><small>Módulo ${String(mod.id).padStart(2, '0')}</small><b>${esc(mod.nome)}</b><span>${esc(mod.resumo)}</span>
          <span class="semio-module-progress"><span style="width:${pct}%"></span></span><em>${done}/${mod.topicos.length} tópicos concluídos</em></span></button>`;
    }).join('')}</div>`;
  }
  function aulasTopicosHtml(mod) {
    const S = st();
    const done = mod.topicos.filter((t) => S.progress['aula:' + mod.id + ':' + t.id]).length;
    return `<div class="semio-topic-catalog-head" style="--semio-cover:url('${moduleArt(mod.id)}')"><button class="semio-back-link" data-back-mods>← Todos os módulos</button><span class="semio-eyebrow">Módulo ${String(mod.id).padStart(2, '0')}</span><h1>${esc(mod.nome)}</h1><p>${esc(mod.resumo)}</p><span>${done}/${mod.topicos.length} tópicos concluídos</span></div>
      <div class="semio-topic-catalog">${mod.topicos.map((t, index) => {
        const done = S.progress['aula:' + mod.id + ':' + t.id];
        return `<button class="semio-topic-card" data-topico="${esc(t.id)}"><span class="semio-topic-index">${String(index + 1).padStart(2, '0')}</span><span class="semio-topic-card-copy"><small>Aula ${index + 1}</small><b>${esc(t.titulo)}</b></span><i class="${done ? 'is-done' : ''}">${done ? '✓' : '→'}</i></button>`;
    }).join('')}</div>`;
  }
  const aulaImageKey = (mod, topico) => `${mod.id}:${topico.id}`;
  const imageId = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `semio-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  function semioImageHtml(image) {
    const alt = image.name || 'Imagem da aula';
    if (typeof materialImageHtml === 'function') return materialImageHtml({ id: 'semiologia', title: 'Imagem da aula' }, alt, `material-image:${image.id}`);
    return `<div class="semio-image-loading">Carregando imagem salva...</div>`;
  }
  function aulaImagesHtml(S, key) {
    const images = Array.isArray(S.images?.[key]) ? S.images[key] : [];
    if (!images.length) return '';
    return `<div class="semio-custom-images"><div class="semio-custom-images-head"><b>Imagens desta aula</b><span class="semio-muted sm">${images.length} ${images.length === 1 ? 'imagem' : 'imagens'}</span></div>${images.map(image => `<figure class="semio-custom-image" data-semio-image-id="${esc(image.id)}">${semioImageHtml(image)}<button type="button" class="semio-btn ghost sm" data-semio-remove-image="${esc(image.id)}">Excluir imagem</button></figure>`).join('')}</div>`;
  }
  async function addSemioImage(file, key) {
    if (!file?.type?.startsWith('image/')) return;
    if (file.size > 12 * 1024 * 1024) { alert('Escolha uma imagem de até 12 MB.'); return; }
    if (typeof storeMaterialImage !== 'function') { alert('O recurso de imagens ainda está carregando. Tente novamente.'); return; }
    const id = await storeMaterialImage(file);
    if (!id) return;
    const S = st();
    S.images[key] = Array.isArray(S.images[key]) ? S.images[key] : [];
    S.images[key].push({ id, name: file.name || 'Imagem da aula' });
    save();
    paint();
  }
  function aulasDetailHtml(mod, topico) {
    const S = st();
    const focus = S.ui.focus ? ' semio-focus' : '';
    const imageKey = aulaImageKey(mod, topico);
    const parts = topico.blocks.map((b, i) => blockHtml(b, mod.id + ':' + topico.id, i)).join('');
    const topicIndex = mod.topicos.findIndex((t) => t.id === topico.id);
    const isDone = !!S.progress['aula:' + mod.id + ':' + topico.id];
    return `<div class="semio-reader-shell">
      <aside class="semio-reader-nav">
        <button class="semio-back-link" data-back-mods>← Voltar aos módulos</button>
        <span class="semio-eyebrow">Módulo ${String(mod.id).padStart(2, '0')}</span><h2>${esc(mod.nome)}</h2>
        <div class="semio-reader-topic-list">${mod.topicos.map((t, index) => {
          const done = S.progress['aula:' + mod.id + ':' + t.id];
          return `<button class="${t.id === topico.id ? 'is-current' : ''}" data-topico="${esc(t.id)}"><span>${index + 1}</span><b>${esc(t.titulo)}</b>${done ? '<i>✓</i>' : ''}</button>`;
        }).join('')}</div>
      </aside>
      <section class="semio-reader">
        <header class="semio-reader-head">
          <div><span class="semio-eyebrow">Módulo ${String(mod.id).padStart(2, '0')} · Aula ${topicIndex + 1}</span><h1>${esc(topico.titulo)}</h1><p>Leitura clínica orientada</p></div>
          <div class="semio-reader-actions"><button class="semio-btn ghost sm" data-focus-toggle>Modo foco</button><label class="semio-btn ghost sm" title="Adicionar imagem à aula">Adicionar imagem<input type="file" accept="image/*" data-semio-image-input="${esc(imageKey)}" hidden></label></div>
        </header>
        <article class="semio-flow${focus}" data-semio-image-scope="${esc(imageKey)}">${aulaImagesHtml(S, imageKey)}${parts}<p class="semio-image-help">Dica: selecione um trecho para marcá-lo. Você também pode colar uma imagem aqui com Ctrl+V.</p></article>
        <footer class="semio-reader-footer"><button class="semio-btn ghost" data-back-topicos>← Ver tópicos</button><button class="semio-btn semio-btn-primary" data-mark-read="${esc(mod.id + ':' + topico.id)}">${isDone ? '✓ Tópico concluído' : 'Marcar como concluído'}</button></footer>
      </section>
    </div>`;
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
  const manobraImageKey = (m) => 'manobra:' + m.id;
  function manobraDetailHtml(m) {
    const S = st();
    const imageKey = manobraImageKey(m);
    const hasCustomImages = Array.isArray(S.images?.[imageKey]) && S.images[imageKey].length > 0;
    return `<button class="semio-btn ghost sm" data-back-manobras>← Manobras</button>
      <div class="semio-topic-head"><h2>${esc(m.nome)}</h2><span class="semio-tag">${esc(m.sistema)}</span>
        <div class="semio-topic-tools"><label class="semio-btn ghost sm" title="Adicionar imagem à manobra">🖼️ Adicionar imagem<input type="file" accept="image/*" data-semio-image-input="${esc(imageKey)}" hidden></label></div>
      </div>
      <div data-semio-image-scope="${esc(imageKey)}">${aulaImagesHtml(S, imageKey)}
      ${!hasCustomImages && MANOBRA_FIG[m.id] ? `<figure class="semio-sign-fig">${MANOBRA_FIG[m.id]}<figcaption>Esquema didático próprio</figcaption></figure>` : ''}
      ${!hasCustomImages && MANOBRA_FOTO[m.id] ? `<figure class="semio-fig semio-fig-photo"><img src="${esc(MANOBRA_FOTO[m.id].src)}" alt="${esc(MANOBRA_FOTO[m.id].cap)}" loading="lazy" onerror="${imgFallback}"/><figcaption>${esc(MANOBRA_FOTO[m.id].cap)}</figcaption></figure>` : ''}
      <p class="semio-image-help">Cole uma imagem com Ctrl+V ou use "Adicionar imagem" para trocar o esquema padrão pela sua própria foto ou ilustração.</p></div>
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

  // ---- Ausculta (áudios reais) ----
  function auscultaHtml() {
    const S = st();
    if (S.ui.auscultaId && AUSCULTA_MAP[S.ui.auscultaId]) return auscultaDetailHtml(AUSCULTA_MAP[S.ui.auscultaId]);
    return auscultaListHtml();
  }
  function auscultaListHtml() {
    const sistemas = [...new Set(AUSCULTA.map((a) => a.sistema))];
    return `<h2 class="semio-topic-title">Ausculta — sons reais (Littmann)</h2>
      <p class="semio-muted">Ouça cada som, leia onde e como auscultar, e teste seu reconhecimento no quiz.</p>
      ${sistemas.map((s) => `<h3 class="semio-h">${esc(s)}</h3>
        <div class="semio-list">${AUSCULTA.filter((a) => a.sistema === s).map((a) => {
          const done = st().progress['ausculta:' + a.id];
          return `<button class="semio-topic" data-ausculta="${esc(a.id)}"><span>${esc(a.nome)}</span>${done ? '<i class="semio-check">✓</i>' : ''}</button>`;
        }).join('')}</div>`).join('')}`;
  }
  function auscultaDetailHtml(a) {
    return `<button class="semio-btn ghost sm" data-back-ausculta>← Ausculta</button>
      <div class="semio-topic-head"><h2>${esc(a.nome)}</h2><span class="semio-tag">${esc(a.sistema)}</span></div>
      <audio class="semio-audio" controls loop preload="none" src="${esc(a.arquivo)}"></audio>
      <p class="semio-muted" style="margin-top:-4px">🔁 O som repete em loop automaticamente — use pausar ou saia da tela para parar.</p>
      <div class="semio-def"><b>Onde auscultar</b><p>${esc(a.onde)}</p></div>
      <div class="semio-def"><b>O que se ouve / significado</b><p>${esc(a.achado)}</p></div>
      <div class="semio-quiz" data-quiz-ausculta="${esc(a.id)}">
        <b>${esc(a.quiz.p)}</b>
        <div class="semio-opts">${a.quiz.ops.map((o, i) => `<button class="semio-opt" data-opt="${i}">${esc(o)}</button>`).join('')}</div>
        <div class="semio-fb"></div>
      </div>`;
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
  const SUBS = [['inicio', 'Início'], ['aulas', 'Aulas'], ['corpo', 'Corpo'], ['manobras', 'Manobras'], ['ausculta', 'Ausculta'], ['casos', 'Casos'], ['fichas', 'Fichas'], ['desempenho', 'Desempenho']];
  function subnav() {
    const cur = st().ui.sub;
    return `<header class="semio-topbar"><button class="semio-brand semio-sub" data-sub="inicio"><span class="semio-brand-mark">S</span><span><small>Habilidade</small><b>Semiologia</b></span></button><nav class="semio-subnav" aria-label="Navegação de Semiologia">${SUBS.map(([k, l]) => `<button class="semio-sub ${k === cur ? 'on' : ''}" data-sub="${k}">${l}</button>`).join('')}</nav></header>`;
  }
  function bodyHtml() {
    const sub = st().ui.sub;
    let html;
    switch (sub) {
      case 'aulas': html = aulasHtml(); break;
      case 'corpo': html = corpoHtml(); break;
      case 'manobras': html = manobrasHtml(); break;
      case 'ausculta': html = auscultaHtml(); break;
      case 'casos': html = casosHtml(); break;
      case 'fichas': html = fichasHtml(); break;
      case 'desempenho': html = desempenhoHtml(); break;
      default: html = inicioHtml();
    }
    const isReader = sub === 'aulas' && !!st().ui.aulaTopicoId;
    return `<div class="semio-view semio-view-${esc(sub)}${isReader ? ' is-reader' : ''}">${html}</div>`;
  }

  let ROOT = null;
  const semioHydratedImageIds = new Set();
  function hydrateSemioImages() {
    const ids = Object.values(st().images || {}).flat().map(image => image?.id).filter(Boolean).filter(id => !semioHydratedImageIds.has(id));
    if (!ids.length || typeof loadMaterialImagesForMarkdown !== 'function') return;
    ids.forEach(id => semioHydratedImageIds.add(id));
    loadMaterialImagesForMarkdown(ids.map(id => `![Imagem](material-image:${id})`).join('\n')).then(() => paint());
  }
  function paint() {
    if (!ROOT) return;
    ROOT.querySelector('.semio-subnav-slot').innerHTML = subnav();
    ROOT.querySelector('.semio-body').innerHTML = bodyHtml();
    bind();
    hydrateSemioImages();
  }
  function go(sub) { const S = st(); S.ui.sub = sub; if (sub !== 'aulas') { S.ui.aulaModId = null; S.ui.aulaTopicoId = null; } if (sub !== 'manobras') S.ui.manobraId = null; if (sub !== 'ausculta') S.ui.auscultaId = null; if (sub !== 'casos') S.ui.casoId = null; if (sub !== 'corpo') { S.ui.corpoSignId = null; S.ui.corpoTeste = false; S.ui.corpoTesteId = null; } save(); paint(); }

  function bind() {
    const S = st();
    ROOT.querySelectorAll('.semio-sub[data-sub]').forEach((b) => b.onclick = () => go(b.dataset.sub));
    ROOT.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => go(b.dataset.go));

    // Aulas
    ROOT.querySelectorAll('[data-mod]').forEach((b) => b.onclick = () => { S.ui.sub = 'aulas'; S.ui.aulaModId = +b.dataset.mod; S.ui.aulaTopicoId = null; save(); paint(); });
    ROOT.querySelector('[data-back-mods]')?.addEventListener('click', () => { S.ui.aulaModId = null; S.ui.aulaTopicoId = null; save(); paint(); });
    ROOT.querySelectorAll('[data-topico]').forEach((b) => b.onclick = () => { S.ui.aulaTopicoId = b.dataset.topico; save(); paint(); });
    ROOT.querySelector('[data-back-topicos]')?.addEventListener('click', () => { S.ui.aulaTopicoId = null; save(); paint(); });
    ROOT.querySelector('[data-focus-toggle]')?.addEventListener('click', () => { S.ui.focus = !S.ui.focus; save(); paint(); });
    ROOT.querySelectorAll('[data-semio-image-input]').forEach((input) => input.addEventListener('change', (event) => {
      addSemioImage(event.currentTarget.files?.[0], event.currentTarget.dataset.semioImageInput);
      event.currentTarget.value = '';
    }));
    ROOT.querySelectorAll('[data-semio-lightbox]').forEach((button) => button.addEventListener('click', () => {
      const image = button.querySelector('img');
      const src = image?.currentSrc || image?.src || button.dataset.semioLightbox;
      if (!src) return;
      const lightbox = document.createElement('div');
      lightbox.className = 'semio-lightbox';
      lightbox.innerHTML = `<button type="button" aria-label="Fechar imagem ampliada">×</button><img src="${esc(src)}" alt="${esc(image?.alt || 'Imagem clínica ampliada')}">`;
      lightbox.addEventListener('click', (event) => { if (event.target === lightbox || event.target.closest('button')) lightbox.remove(); });
      document.addEventListener('keydown', function closeSemioLightbox(event) { if (event.key === 'Escape') { lightbox.remove(); document.removeEventListener('keydown', closeSemioLightbox); } });
      document.body.appendChild(lightbox);
    }));
    ROOT.querySelectorAll('[data-semio-remove-image]').forEach((button) => button.addEventListener('click', () => {
      const scope = ROOT.querySelector('[data-semio-image-scope]')?.dataset.semioImageScope;
      if (!scope) return;
      S.images[scope] = (S.images[scope] || []).filter(image => image.id !== button.dataset.semioRemoveImage);
      save(); paint();
    }));
    const semioImageScope = ROOT.querySelector('[data-semio-image-scope]');
    semioImageScope?.addEventListener('paste', (event) => {
      const image = [...(event.clipboardData?.files || [])].find(file => file.type.startsWith('image/'));
      if (!image) return;
      event.preventDefault();
      addSemioImage(image, semioImageScope.dataset.semioImageScope);
    });
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

    // Ausculta
    ROOT.querySelectorAll('[data-ausculta]').forEach((b) => b.onclick = () => { S.ui.auscultaId = b.dataset.ausculta; save(); paint(); });
    ROOT.querySelector('[data-back-ausculta]')?.addEventListener('click', () => { S.ui.auscultaId = null; save(); paint(); });
    bindQuizAusculta();

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

  function bindQuizAusculta() {
    const box = ROOT.querySelector('[data-quiz-ausculta]');
    if (!box) return;
    const a = AUSCULTA_MAP[box.dataset.quizAusculta];
    const fb = box.querySelector('.semio-fb');
    let answered = false;
    box.querySelectorAll('.semio-opt').forEach((btn) => btn.onclick = () => {
      if (answered) return; answered = true;
      const i = +btn.dataset.opt; const ok = i === a.quiz.correct;
      box.querySelectorAll('.semio-opt').forEach((b, j) => { if (j === a.quiz.correct) b.classList.add('correct'); if (j === i && !ok) b.classList.add('wrong'); b.disabled = true; });
      logAttempt('ausculta:' + a.id, ok, null);
      st().progress['ausculta:' + a.id] = true; st().daily.studied++; save();
      fb.innerHTML = `<div class="semio-feedback ${ok ? 'ok' : 'no'}">${ok ? 'Correto! ' : 'Reveja: '}${esc(a.quiz.exp)}</div>`;
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
    .semio-wrap{--semio-acc:#1f675c;--semio-acc2:#164b44;--semio-cream:#f4f0e7;--semio-paper:#fffdf8;--semio-ink:#172526;max-width:none;margin:0;width:100%;min-width:0;color:var(--semio-ink)}
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
    .semio-fig-photo img{max-width:100%;width:auto;max-height:420px;border-radius:10px;border:1px solid var(--border,#cbd5e1);background:#fff}
    .semio-image-button{display:block;width:100%;padding:0;border:0;background:transparent;cursor:zoom-in}.semio-image-button img{display:block;margin:0 auto}
    .semio-atlas{margin:30px 0;border:1px solid #dbe4df;border-radius:16px;background:color-mix(in srgb,var(--semio-paper) 88%,#dceae4);overflow:hidden}.semio-atlas>summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px 20px;cursor:pointer;color:var(--semio-acc2)}.semio-atlas>summary::-webkit-details-marker{display:none}.semio-atlas>summary span b,.semio-atlas>summary span small{display:block}.semio-atlas>summary span b{font:700 1.05rem Georgia,serif}.semio-atlas>summary span small{font-size:.7rem;color:var(--muted,#667085);margin-top:4px}.semio-atlas>summary>i{width:30px;height:30px;border:1px solid #a8beb5;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:1.2rem;transition:transform .2s}.semio-atlas[open]>summary>i{transform:rotate(45deg)}.semio-atlas-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:0 14px 16px;max-height:720px;overflow:auto}.semio-atlas-grid .semio-fig{margin:0;padding:8px;border:1px solid #e1e5e1;border-radius:11px;background:var(--semio-paper)}.semio-atlas-grid .semio-fig img{width:100%;height:170px;object-fit:contain;border:0}.semio-atlas-grid .semio-fig figcaption{text-align:center;font-size:.65rem;margin:6px 0 0}
    .semio-lightbox{position:fixed;inset:0;z-index:3000;background:rgba(7,18,16,.94);display:grid;place-items:center;padding:30px;cursor:zoom-out}.semio-lightbox img{max-width:min(95vw,1500px);max-height:90vh;object-fit:contain;border-radius:8px;background:#fff}.semio-lightbox>button{position:fixed;right:22px;top:20px;width:44px;height:44px;border:1px solid rgba(255,255,255,.35);border-radius:50%;background:rgba(255,255,255,.12);color:#fff;font-size:1.7rem;cursor:pointer}
    .semio-ph-box{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:120px;border:2px dashed var(--border,#cbd5e1);border-radius:10px;color:var(--muted,#667085);font-size:1.4rem;background:rgba(120,120,120,.05)}
    .semio-ph-box span{font-size:.78rem;font-weight:600}
    .semio-fig-placeholder figcaption{text-align:center}
    .semio-fig-row{display:flex;flex-wrap:wrap;gap:12px;margin:12px 0;justify-content:center}
    .semio-fig-row .semio-fig{margin:0;flex:1 1 220px;max-width:280px}
    .semio-custom-images{margin:14px 0;padding:12px;border:1px solid var(--border,#e2e8f0);border-radius:12px;background:var(--card,#fff)}
    .semio-custom-images-head{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:8px}
    .semio-custom-image{margin:12px 0;text-align:center}.semio-custom-image figure{margin:0}.semio-custom-image img{max-width:100%;max-height:560px;border:1px solid var(--border,#cbd5e1);border-radius:10px}.semio-custom-image .semio-btn{margin-top:7px}
    .semio-image-help{padding:9px 11px;border:1px dashed var(--border,#cbd5e1);border-radius:8px;color:var(--muted,#667085);font-size:.8rem}
    .semio-def{margin:9px 0}.semio-def b{color:var(--semio-acc2)}.semio-def p{margin:2px 0 0;line-height:1.5}
    .semio-quiz{margin-top:14px;background:var(--card,#f8fafc);border:1px solid var(--border,#e2e8f0);border-radius:12px;padding:14px}
    .semio-audio{width:100%;margin:10px 0}
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

    /* Nova experiência editorial de Semiologia */
    .semio-wrap button,.semio-wrap label{font:inherit}
    .semio-subnav-slot{position:sticky;top:0;z-index:20;margin:-4px 0 0}
    .semio-topbar{min-height:70px;display:flex;align-items:center;gap:24px;padding:10px 24px;border:1px solid color-mix(in srgb,var(--semio-acc) 16%,transparent);border-radius:18px;background:color-mix(in srgb,var(--bg,#fff) 92%,transparent);box-shadow:0 12px 35px rgba(27,58,52,.08);backdrop-filter:blur(16px)}
    .semio-brand{display:flex;align-items:center;gap:10px;border:0;background:transparent;color:var(--semio-ink);padding:0;cursor:pointer;flex:none;text-align:left}
    .semio-brand-mark{width:38px;height:38px;border-radius:12px;background:var(--semio-acc);color:#fff;display:grid;place-items:center;font:700 1.35rem Georgia,serif;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}
    .semio-brand small,.semio-brand b{display:block;line-height:1.05}.semio-brand small{text-transform:uppercase;letter-spacing:.13em;font-size:.58rem;color:var(--semio-acc);font-weight:800;margin-bottom:4px}.semio-brand b{font:700 1rem Georgia,serif}
    .semio-subnav{display:flex;gap:4px;flex-wrap:nowrap;overflow-x:auto;margin:0;padding:2px;position:static;background:transparent;scrollbar-width:none;flex:1;justify-content:flex-start}
    .semio-subnav::-webkit-scrollbar{display:none}.semio-sub{white-space:nowrap;border:0;background:transparent;color:var(--muted,#667085);padding:9px 11px;border-radius:9px;font-size:.79rem}.semio-sub:hover{color:var(--semio-acc);background:rgba(31,103,92,.07)}.semio-sub.on{background:rgba(31,103,92,.11);color:var(--semio-acc2);box-shadow:none}
    .semio-body{min-width:0}.semio-view{width:100%;min-width:0}.semio-view:not(.is-reader){max-width:1240px;margin:0 auto;padding:28px 12px 50px}
    .semio-eyebrow{font-size:.7rem;letter-spacing:.15em;color:var(--semio-acc);font-weight:800}

    .semio-hero{min-height:480px;margin:0;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(380px,.95fr);align-items:center;gap:42px;padding:50px 58px;border-radius:28px;background:linear-gradient(135deg,#173e38 0%,#215f55 60%,#2f7569 100%);color:#fff;overflow:hidden;position:relative}
    .semio-hero:before{content:"";position:absolute;width:420px;height:420px;border:1px solid rgba(255,255,255,.09);border-radius:50%;left:-190px;bottom:-260px}
    .semio-hero-copy{position:relative;z-index:1;max-width:650px}.semio-hero .semio-eyebrow{color:#c8d8ae}.semio-hero h1{font:500 clamp(2.7rem,5vw,5.1rem)/.96 Georgia,serif;letter-spacing:-.045em;margin:16px 0 22px}.semio-hero-copy>p{font-size:1.02rem;line-height:1.7;color:#dbe8e4;max-width:590px;margin:0}
    .semio-hero-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:30px}.semio-btn{border-radius:11px;padding:10px 15px}.semio-btn-primary{background:#efe7d7;color:#183d38;border-color:#efe7d7}.semio-btn-primary:hover{background:#fff8e9}.semio-hero .semio-btn.ghost{border-color:rgba(255,255,255,.35);color:#fff;background:rgba(255,255,255,.05)}
    .semio-hero-art{height:390px;position:relative}.semio-art-main,.semio-art-small{position:absolute;overflow:hidden;border-radius:26px;border:7px solid rgba(255,255,255,.92);box-shadow:0 22px 50px rgba(4,25,21,.28);background:#e9eee9}.semio-art-main{inset:0 76px 38px 0;transform:rotate(-2deg)}.semio-art-small{width:42%;height:46%;right:2px;bottom:0;transform:rotate(4deg)}.semio-art-main img,.semio-art-small img{width:100%;height:100%;object-fit:cover}.semio-art-main img{object-position:center}.semio-art-small img{object-position:center 35%}
    .semio-art-seal{position:absolute;right:3px;top:4px;width:105px;height:105px;border-radius:50%;display:grid;place-content:center;text-align:center;background:#cbd8aa;color:#173e38;box-shadow:0 12px 30px rgba(4,25,21,.22);transform:rotate(6deg)}.semio-art-seal strong{font:700 2rem/.9 Georgia,serif}.semio-art-seal span{font-size:.62rem;line-height:1.25;text-transform:uppercase;letter-spacing:.09em;margin-top:4px;font-weight:800}
    .semio-progress-strip{display:grid;grid-template-columns:170px minmax(180px,1fr) auto;align-items:center;gap:24px;margin:18px 0 50px;padding:20px 28px;border-radius:17px;background:var(--semio-paper);border:1px solid #e6e0d5;box-shadow:0 10px 30px rgba(44,56,52,.05)}.semio-progress-copy span,.semio-progress-copy strong{display:block}.semio-progress-copy span{font-size:.68rem;text-transform:uppercase;letter-spacing:.12em;color:var(--muted,#667085);font-weight:800}.semio-progress-copy strong{font:700 1.15rem Georgia,serif;margin-top:3px}.semio-progress-large{height:8px;margin:0;background:#e6e4dd}.semio-progress-large>div{background:linear-gradient(90deg,#1f675c,#6d9b84)}.semio-progress-metrics{display:flex;gap:20px;color:var(--muted,#667085);font-size:.75rem}.semio-progress-metrics strong{color:var(--semio-ink);font-size:.92rem}.semio-progress-metrics .is-due strong{color:#b04f2d}
    .semio-home-section{margin:0 0 54px}.semio-section-heading{display:flex;justify-content:space-between;align-items:end;gap:24px;margin-bottom:20px}.semio-section-heading h2,.semio-catalog-head h1,.semio-topic-catalog-head h1{font-family:Georgia,serif;color:var(--semio-ink);letter-spacing:-.025em}.semio-section-heading h2{font-size:clamp(1.8rem,3vw,2.65rem);margin:7px 0 0}.semio-section-heading>p{max-width:410px;color:var(--muted,#667085);line-height:1.55;margin:0}.semio-text-link{border:0;background:none;color:var(--semio-acc);font-weight:800;cursor:pointer;white-space:nowrap}
    .semio-feature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.semio-feature-card{display:grid;grid-template-columns:48px 1fr auto;align-items:center;gap:14px;text-align:left;padding:20px;border:1px solid #e5e1d8;border-radius:16px;background:var(--semio-paper);color:var(--semio-ink);cursor:pointer;transition:transform .18s,border-color .18s,box-shadow .18s}.semio-feature-card:hover{transform:translateY(-2px);border-color:#94b5aa;box-shadow:0 12px 26px rgba(35,68,61,.08)}.semio-feature-card.is-wide{grid-column:span 2}.semio-feature-icon{width:48px;height:48px;display:grid;place-items:center;border-radius:14px;background:#e1ece7;color:var(--semio-acc);font:700 .95rem Georgia,serif}.semio-feature-card b,.semio-feature-card small{display:block}.semio-feature-card b{font-size:.96rem}.semio-feature-card small{font-size:.75rem;color:var(--muted,#667085);margin-top:4px;line-height:1.4}.semio-feature-card>i{font-style:normal;color:var(--semio-acc);font-size:1.15rem}
    .semio-module-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.semio-module-card{display:grid;grid-template-columns:150px 1fr;min-height:168px;padding:0;text-align:left;overflow:hidden;border:1px solid #e4ded2;border-radius:18px;background:var(--semio-paper);color:var(--semio-ink);cursor:pointer;transition:transform .18s,box-shadow .18s}.semio-module-card:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(40,62,56,.09)}.semio-module-cover{position:relative;min-height:168px;background:#dfe8e3}.semio-module-cover:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 45%,rgba(16,49,43,.56))}.semio-module-cover img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}.semio-module-cover i{position:absolute;left:13px;bottom:11px;z-index:1;color:#fff;font:700 1.5rem Georgia,serif;font-style:normal}.semio-module-content{display:flex;flex-direction:column;padding:20px;min-width:0}.semio-module-content>small{text-transform:uppercase;letter-spacing:.12em;color:var(--semio-acc);font-size:.62rem;font-weight:800}.semio-module-content>b{font:700 1.12rem/1.2 Georgia,serif;margin:6px 0}.semio-module-content>span:not(.semio-module-progress){font-size:.73rem;color:var(--muted,#667085);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.semio-module-progress{height:4px;background:#e2e4df;border-radius:99px;overflow:hidden;margin:auto 0 5px}.semio-module-progress>span{height:100%;display:block;background:var(--semio-acc)}.semio-module-content>em{font-size:.65rem;color:var(--muted,#667085);font-style:normal}
    .semio-catalog-head{padding:30px 5px 26px;max-width:740px}.semio-catalog-head h1{font-size:clamp(2.5rem,5vw,4.4rem);line-height:1;margin:10px 0 14px}.semio-catalog-head p{font-size:1rem;color:var(--muted,#667085);line-height:1.6}.semio-topic-catalog-head{min-height:310px;padding:32px 38px;margin-bottom:18px;border-radius:24px;display:flex;flex-direction:column;justify-content:end;color:#fff;position:relative;overflow:hidden;background:linear-gradient(90deg,rgba(17,52,46,.96),rgba(25,76,67,.72)),var(--semio-cover) center/cover}.semio-topic-catalog-head .semio-back-link{position:absolute;top:25px;left:30px;color:#fff}.semio-topic-catalog-head .semio-eyebrow{color:#cfdbb5}.semio-topic-catalog-head h1{color:#fff;font-size:clamp(2.2rem,5vw,4rem);max-width:760px;margin:9px 0}.semio-topic-catalog-head p{max-width:680px;color:#d9e5e1;margin:0 0 10px;line-height:1.5}.semio-topic-catalog-head>span:last-child{font-size:.72rem;color:#cfdbb5;font-weight:700}
    .semio-back-link{border:0;background:transparent;padding:0;color:var(--semio-acc);font-size:.76rem;font-weight:800;cursor:pointer;text-align:left}.semio-topic-catalog{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.semio-topic-card{display:grid;grid-template-columns:44px 1fr auto;align-items:center;gap:14px;min-height:90px;text-align:left;padding:16px 18px;border:1px solid #e5e1d8;border-radius:15px;background:var(--semio-paper);color:var(--semio-ink);cursor:pointer}.semio-topic-card:hover{border-color:#91b2a7}.semio-topic-index{font:700 1.2rem Georgia,serif;color:#97a5a0}.semio-topic-card-copy small,.semio-topic-card-copy b{display:block}.semio-topic-card-copy small{font-size:.61rem;text-transform:uppercase;letter-spacing:.1em;color:var(--semio-acc);margin-bottom:4px}.semio-topic-card-copy b{font-size:.86rem;line-height:1.35}.semio-topic-card>i{font-style:normal;color:var(--semio-acc)}.semio-topic-card>i.is-done{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:#dfece6}
    .semio-view.is-reader{padding:18px 0 40px}.semio-reader-shell{display:grid;grid-template-columns:280px minmax(0,1fr);gap:18px;align-items:start;max-width:1460px;margin:0 auto}.semio-reader-nav{position:sticky;top:92px;max-height:calc(100vh - 110px);overflow:auto;padding:24px;border:1px solid #e4e0d7;border-radius:18px;background:var(--semio-paper)}.semio-reader-nav>.semio-eyebrow{display:block;margin:28px 0 8px}.semio-reader-nav>h2{font:700 1.28rem/1.15 Georgia,serif;margin:0 0 20px}.semio-reader-topic-list{display:flex;flex-direction:column;gap:4px}.semio-reader-topic-list button{display:grid;grid-template-columns:25px 1fr auto;align-items:start;gap:9px;padding:10px 8px;border:0;border-radius:9px;text-align:left;background:transparent;color:var(--muted,#667085);cursor:pointer}.semio-reader-topic-list button:hover,.semio-reader-topic-list button.is-current{background:#e7efeb;color:var(--semio-acc2)}.semio-reader-topic-list button>span{width:22px;height:22px;border:1px solid #d3ddd8;border-radius:50%;display:grid;place-items:center;font-size:.62rem}.semio-reader-topic-list button>b{font-size:.72rem;line-height:1.35}.semio-reader-topic-list button>i{font-style:normal;color:var(--semio-acc)}
    .semio-reader{border:1px solid #e4e0d7;border-radius:22px;background:var(--semio-paper);overflow:hidden;min-width:0}.semio-reader-head{min-height:245px;padding:50px clamp(34px,7vw,96px) 34px;border-bottom:1px solid #e6e1d7;display:flex;justify-content:space-between;align-items:start;gap:24px}.semio-reader-head h1{font:500 clamp(2.7rem,5vw,4.9rem)/.98 Georgia,serif;letter-spacing:-.045em;margin:15px 0;color:var(--semio-ink);max-width:850px}.semio-reader-head p{color:var(--muted,#667085);font-size:.85rem;margin:0}.semio-reader-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.semio-reader-actions .semio-btn{white-space:nowrap}.semio-flow{max-width:900px;margin:0 auto;padding:48px clamp(34px,6vw,76px) 38px;font-size:1.02rem;line-height:1.78;color:#243132}.semio-flow .semio-h{font:700 1.55rem/1.2 Georgia,serif;margin:32px 0 12px;color:var(--semio-acc2)}.semio-flow .semio-p{margin:0 0 19px}.semio-flow .semio-ul{margin:8px 0 22px}.semio-flow .semio-ul li{margin:8px 0}.semio-flow .semio-callout{padding:17px 19px;margin:23px 0;border-radius:14px}.semio-reader-footer{display:flex;justify-content:space-between;gap:14px;align-items:center;border-top:1px solid #e6e1d7;padding:22px clamp(34px,6vw,76px)}
    .semio-reader-head h1{font-size:clamp(2.5rem,4vw,4.15rem)}
    .semio-view:not(.semio-view-inicio):not(.semio-view-aulas)>.semio-topic-title:first-child{font:700 clamp(2rem,4vw,3.4rem) Georgia,serif;margin:22px 0 8px}.semio-view:not(.semio-view-inicio):not(.semio-view-aulas){max-width:1120px}
    body.dark .semio-wrap{--semio-paper:#1b2524;--semio-ink:#edf4f1;--semio-cream:#16201f}.dark .semio-topbar,.dark .semio-module-card,.dark .semio-feature-card,.dark .semio-progress-strip,.dark .semio-reader,.dark .semio-reader-nav{border-color:#34413e}.dark .semio-hero{background:linear-gradient(135deg,#122b27,#1b4a42)}.dark .semio-module-progress,.dark .semio-progress-large{background:#35413f}.dark .semio-topic-catalog{color:#edf4f1}.dark .semio-flow{color:#dce6e2}
    @media(max-width:1050px){.semio-topbar{display:block}.semio-brand{margin-bottom:8px}.semio-subnav{justify-content:flex-start}.semio-hero{grid-template-columns:1fr minmax(300px,.75fr);padding:42px}.semio-reader-shell{grid-template-columns:240px minmax(0,1fr)}.semio-reader-head{display:block}.semio-reader-actions{justify-content:flex-start;margin-top:22px}}
    @media(max-width:780px){.semio-view:not(.is-reader){padding:18px 0 36px}.semio-topbar{border-radius:14px;padding:10px 14px}.semio-hero{grid-template-columns:1fr;min-height:auto;padding:42px 28px}.semio-hero-art{height:300px}.semio-progress-strip{grid-template-columns:1fr;gap:12px;margin-bottom:38px}.semio-progress-metrics{justify-content:space-between;flex-wrap:wrap}.semio-section-heading{display:block}.semio-section-heading>p{margin-top:10px}.semio-feature-grid,.semio-module-grid,.semio-topic-catalog{grid-template-columns:1fr}.semio-feature-card.is-wide{grid-column:auto}.semio-reader-shell{display:block}.semio-reader-nav{position:static;max-height:none;margin-bottom:12px;padding:18px}.semio-reader-nav>h2{margin-bottom:12px}.semio-reader-topic-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.semio-reader-head{min-height:0;padding:34px 26px}.semio-flow{padding:34px 26px;font-size:.98rem}.semio-reader-footer{padding:20px 26px}.semio-topic-catalog-head{padding:30px 26px}.semio-topic-catalog-head .semio-back-link{left:25px}.semio-module-card{grid-template-columns:125px 1fr}}
    @media(max-width:520px){.semio-hero{padding:34px 22px}.semio-hero h1{font-size:2.55rem}.semio-hero-art{height:250px}.semio-art-main{right:45px}.semio-art-seal{width:82px;height:82px}.semio-progress-strip{padding:18px}.semio-progress-metrics{gap:10px}.semio-module-card{grid-template-columns:100px 1fr}.semio-module-content{padding:15px}.semio-module-content>span:not(.semio-module-progress){display:none}.semio-reader-topic-list{grid-template-columns:1fr}.semio-reader-head h1{font-size:2.45rem}.semio-reader-actions{display:grid}.semio-reader-footer{align-items:stretch;flex-direction:column-reverse}.semio-reader-footer .semio-btn{width:100%}}
    @media(max-width:520px){.semio-atlas-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.semio-atlas-grid .semio-fig img{height:130px}}
    `;
    document.head.appendChild(s);
  }

  window.SemioSim = { mount, defaultState, MANOBRAS, AUSCULTA, CASOS, FICHAS };
})();
