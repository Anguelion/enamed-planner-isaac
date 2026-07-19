/* ============================================================================
 * SÓqueroMed — Radiografia · Aulas (conteúdo real, adaptado do guia próprio)
 * Módulo de dados puro (sem UI) — consumido por assets/radiografia.js.
 *
 * 7 módulos, 43 tópicos, imagens reais em assets/radio-real/moduloN/.
 * Cobre Rx + TC + RM + USG (o guia de origem trata os métodos de forma
 * comparativa, não apenas radiografia isolada).
 *
 * window.RadioAulas = { MODULOS: [...] }
 * ==========================================================================*/
(function () {
  'use strict';

  const IMG = (p) => 'assets/radio-real/' + p;

  const MODULOS = [
    {
      id: 1, nome: 'Bases da Radiologia', resumo: 'Física essencial, comparação entre métodos e o passo a passo de leitura.',
      topicos: [
        {
          id: 'm1-formacao', titulo: 'Como a imagem é formada (Rx, USG, TC)',
          bullets: [
            'Radiografia: o tubo gera elétrons no cátodo, que colidem com um alvo de tungstênio no ânodo giratório, produzindo o feixe de raios X que atravessa o paciente e sensibiliza o detector — quanto mais denso o tecido, mais o feixe é atenuado e mais clara (branca) fica a imagem.',
            'As 5 densidades radiográficas clássicas, do mais escuro ao mais claro: ar, gordura, água/partes moles, osso e metal.',
            'Ultrassonografia: o transdutor emite ondas sonoras que refletem (eco) ao encontrar interfaces de tecido; o tempo de retorno do eco forma a imagem.',
            'Efeito Doppler: mede a variação de frequência entre a onda emitida e a refletida por algo em movimento (hemácias) — permite estimar direção e velocidade de fluxo. Convenção: vermelho = fluxo que se aproxima do transdutor; azul = fluxo que se afasta.',
            'Tomografia computadorizada: o tubo gira ao redor do paciente e os detectores registram a atenuação em cada voxel, convertida em unidades Hounsfield (UH).',
            'Escala de Hounsfield (referências): ar ≈ −1000, gordura ≈ −30, água = 0, partes moles ≈ +30 a +60, sangue ≈ +60, osso cortical ≈ +1000.',
            'Fases do contraste iodado na TC (ex.: fígado): sem contraste → arterial (realce inicial de lesões hipervasculares) → portal (parênquima hepático mais realçado) → equilíbrio (lavagem do contraste, útil para caracterizar lesões).',
          ],
          imagens: [IMG('modulo1/p003_x10.webp'), IMG('modulo1/p003_x12.webp'), IMG('modulo1/p003_x14.webp'), IMG('modulo1/p004_x18.webp'), IMG('modulo1/p005_x22.webp'), IMG('modulo1/p005_x24.webp'), IMG('modulo1/p006_x29.webp'), IMG('modulo1/p006_x31.webp'), IMG('modulo1/p006_x33.webp'), IMG('modulo1/p006_x35.webp'), IMG('modulo1/p006_x37.webp')],
        },
        {
          id: 'm1-indicacoes', titulo: 'Indicações, vantagens e desvantagens de cada método',
          bullets: [
            'Radiografia — indicações: abdome agudo (perfurativo/obstrutivo), dispneia/dor torácica, fraturas, lesões ósseas, estudos contrastados (refluxo vesicoureteral, disfagia, estenose de uretra).',
            'Radiografia — vantagens: disponível, barata, acessível, portátil, rápida. Desvantagens: sobreposição de estruturas, baixa resolução de contraste, radiação ionizante.',
            'Ultrassonografia — indicações: partes moles (tireoide, testículo, mamas), dor abdominal (apendicite, colecistite), trauma (E-FAST), avaliação ginecológica/obstétrica, protocolo BLUE/POCUS, avaliação vascular.',
            'Ultrassonografia — vantagens: sem radiação, barata, portátil, rápida. Desvantagens: limitada por obesidade, gás e calcificações; muito operador-dependente.',
            'Tomografia — indicações: excelente para a maioria dos casos de emergência (abdome agudo, cefaleia, trauma, dispneia, avaliação vascular de aorta/TEP, estadiamento oncológico).',
            'Tomografia — vantagens: alta resolução anatômica, aquisição rápida. Desvantagens: radiação ionizante, pouca portabilidade, custo elevado, risco de reação ao contraste iodado e nefropatia.',
            'Ressonância magnética — indicações: avaliação osteoarticular, sistema nervoso central, mamas, lesões focais hepáticas/pancreáticas, estadiamento e resposta a tratamento.',
            'Ressonância — vantagens: melhor diferenciação de partes moles, sem radiação, contraste (gadolínio) com menor risco alérgico/renal. Desvantagens: alto custo, pouca disponibilidade, exame longo (sedação/claustrofobia). Contraindicações: marcapasso, expansores mamários, próteses penianas, implantes cocleares.',
          ],
          imagens: [],
        },
        {
          id: 'm1-passopasso', titulo: 'Passo a passo para interpretação + anatomia normal',
          bullets: [
            'Regra de ouro: sistematize a ordem de leitura e SEMPRE siga a mesma sequência em todo exame — seguindo a anatomia, de estruturas externas para internas, ou deixando a área de maior suspeita por último.',
            'Antes de procurar a doença, avalie a qualidade técnica: inclusão de toda a área de interesse, incidência correta, fase de aquisição adequada, inspiração/posição adequadas, alinhamento, penetração, artefatos e fase correta do contraste.',
            'Anatomia normal do tórax (PA e perfil): clavícula, escápula, úmero, arcos costais anterior/posterior, corpo vertebral, esterno, mama, prega axilar; lobos superior/médio/inferior delimitados pelas fissuras horizontal e oblíqua.',
            'Anatomia mediastinal em perfil: aorta torácica, arco médio (tronco da artéria pulmonar), átrios e ventrículos, veia cava inferior, linha paratraqueal direita (veia cava superior).',
            'Anatomia normal do abdome (Rx simples): fígado, baço, rins direito/esquerdo, músculos psoas, bolha gástrica, alças delgadas centrais, cólon periférico.',
          ],
          imagens: [IMG('modulo1/p009_x45.webp'), IMG('modulo1/p009_x46.webp'), IMG('modulo1/p010_x50.webp'), IMG('modulo1/p010_x51.webp'), IMG('modulo1/p010_x53.webp'), IMG('modulo1/p010_x54.webp'), IMG('modulo1/p010_x56.webp'), IMG('modulo1/p010_x57.webp'), IMG('modulo1/p010_x59.webp')],
        },
      ],
    },
    {
      id: 2, nome: 'Radiologia de Tórax — Dispneia', resumo: 'Pneumonias, TB, DPOC/asma, derrame, pneumotórax, IC e TEP.',
      topicos: [
        {
          id: 'm2-atendimento', titulo: 'Atendimento à dispneia (aguda x crônica)',
          bullets: [
            'Dispneia aguda (minutos a horas): pensar em IAM, ICC descompensada, tamponamento cardíaco, broncoespasmo, TEP, pneumotórax, infecção pulmonar, obstrução de vias aéreas superiores (anafilaxia, corpo estranho).',
            'Dispneia crônica: avaliação combinada clínica + imagem + laboratório. Iniciais: hemoglobina/hematócrito, glicose, ureia/creatinina, TSH, Rx de tórax, ECG, BNP.',
            'Principais causas crônicas: asma/DPOC, insuficiência cardíaca, doença pulmonar intersticial, obesidade.',
          ],
          imagens: [],
        },
        {
          id: 'm2-padroes', titulo: 'Atlas dos principais padrões radiológicos',
          bullets: [
            'Padrão alveolar focal x difuso: opacidade por preenchimento do espaço aéreo (pneumonia, edema), localizada ou bilateral.',
            'Padrão intersticial: nodular, reticulonodular, linear ou com faveolamento — pensar em doenças intersticiais difusas, edema intersticial, infecção atípica.',
            'Nodular: um ou múltiplos nódulos (infeccioso, neoplásico, granulomatoso).',
            'Atelectasia: perda de volume com desvio de estruturas para o lado colapsado.',
            'Derrame pleural: opacidade basal com menisco.',
            'Pneumotórax: hipertransparência sem trama vascular, com linha pleural visível.',
            'Alargamento mediastinal e hemitórax opaco também entram no atlas de padrões básicos que orientam a hipótese diagnóstica antes de qualquer detalhe fino.',
          ],
          imagens: [IMG('modulo2/p013_x72.webp'), IMG('modulo2/p013_x73.webp'), IMG('modulo2/p013_x74.webp'), IMG('modulo2/p013_x75.webp'), IMG('modulo2/p013_x77.webp'), IMG('modulo2/p013_x78.webp'), IMG('modulo2/p013_x79.webp'), IMG('modulo2/p013_x80.webp'), IMG('modulo2/p013_x81.webp'), IMG('modulo2/p013_x82.webp'), IMG('modulo2/p013_x85.webp'), IMG('modulo2/p013_x86.webp')],
        },
        {
          id: 'm2-pneumonia', titulo: 'Pneumonias: clínica, tratamento e subtipos',
          bullets: [
            'Clínica: febre de início agudo, tosse com/sem escarro, dispneia; ao exame — crepitações, roncos, aumento do FTV, egofonia, macicez à percussão.',
            'Imagem: Rx de tórax PA/perfil na maioria dos casos. TC reservada para falha de tratamento, obesidade, Rx duvidoso ou imunossuprimidos.',
            'Decisão de internação por escores como CURB-65/PSI-PORT; ≤ 2 pontos costuma permitir tratamento domiciliar.',
            'Ambulatorial x internado (enfermaria/UTI) muda o esquema antibiótico — em linhas gerais, associação de betalactâmico + macrolídeo, ou quinolona respiratória isolada, escalonando com gravidade.',
            'Subtipos radiológicos: pneumonia lobar (consolidação de um lobo inteiro), broncopneumonia (opacidades multifocais peribrônquicas), pneumonia necrosante e abscesso pulmonar (cavitação), pneumonia viral/atípica (padrão mais intersticial).',
          ],
          imagens: [IMG('modulo2/p015_x93.webp'), IMG('modulo2/p015_x94.webp'), IMG('modulo2/p016_x100.webp'), IMG('modulo2/p016_x101.webp'), IMG('modulo2/p016_x102.webp'), IMG('modulo2/p016_x103.webp'), IMG('modulo2/p016_x104.webp'), IMG('modulo2/p016_x105.webp'), IMG('modulo2/p017_x108.webp')],
        },
        {
          id: 'm2-tb', titulo: 'Tuberculose pulmonar',
          bullets: [
            'Clínica clássica: tosse ≥ 3 semanas, sudorese noturna, emagrecimento.',
            'TB primária (mais em crianças) x pós-primária/reativação (mais em adultos, tipicamente em ápices).',
            'Padrão miliar: micronódulos difusos — sugere disseminação hematogênica, mais comum em imunocomprometidos.',
            'Diagnóstico: baciloscopia direta, TRM-TB (alta sensibilidade), cultura (padrão-ouro, mais demorada).',
            'Mnemônico ISCAVOU para cavitações pulmonares — diferenciais de imagem cavitária: Infeccioso (TB, pneumonia necrosante, abscesso), Silicose/Sarcoidose, Câncer, Autoimune (artrite reumatoide), Vasculites, Outros organismos (fungos, MBNT), Usuário de drogas (embolia séptica).',
            'Complicações/achados associados: tuberculose ganglionar, bola fúngica (aspergiloma) colonizando cavidade prévia.',
          ],
          imagens: [IMG('modulo2/p019_x115.webp'), IMG('modulo2/p019_x116.webp'), IMG('modulo2/p019_x117.webp'), IMG('modulo2/p020_x122.webp'), IMG('modulo2/p020_x123.webp'), IMG('modulo2/p020_x124.webp'), IMG('modulo2/p020_x125.webp')],
        },
        {
          id: 'm2-dpoc', titulo: 'DPOC e asma (hiperinsuflação)',
          bullets: [
            'Sinais radiográficos de hiperinsuflação: aumento do diâmetro AP do tórax, retificação das cúpulas diafragmáticas, aumento do espaço retroesternal e intercostal, mais de 10 costelas posteriores visíveis, pulmões hipertransparentes, horizontalização das costelas, coração em "gota".',
            'Bronquite crônica: tosse produtiva ≥ 3 meses/ano por 2 anos consecutivos, outras causas excluídas.',
            'Enfisema: destruição das paredes dos espaços aéreos — subtipos centrolobular (relacionado ao tabagismo, predomina em lobos superiores) e parasseptal (subpleural, associado a bolhas/pneumotórax espontâneo) e panlobular (déficit de alfa-1-antitripsina, predomina em bases).',
            'Asma: aprisionamento aéreo dinâmico — hiperinsuflação mais evidente na expiração do que na inspiração.',
          ],
          imagens: [IMG('modulo2/p022_x133.webp'), IMG('modulo2/p022_x134.webp'), IMG('modulo2/p022_x135.webp'), IMG('modulo2/p022_x136.webp'), IMG('modulo2/p023_x141.webp'), IMG('modulo2/p023_x142.webp'), IMG('modulo2/p023_x143.webp')],
        },
        {
          id: 'm2-derrame', titulo: 'Derrame pleural',
          bullets: [
            'Investigação inicial: Rx de tórax e USG torácico; TC quando a etiologia é duvidosa, o derrame é loculado ou há suspeita de malignidade.',
            'Toracocentese indicada em todo derrame novo não óbvio — para alívio sintomático e para prevenir complicações; contraindicada se líquido insuficiente, infecção no local da punção ou coagulopatia não corrigida.',
            'Transudatos: atelectasia, ICC, hidrotórax hepático, hipoalbuminemia (inclui síndrome nefrótica), diálise peritoneal, urinotórax.',
            'Exsudatos: infeccioso, perfuração esofágica, hemotórax, quilotórax, malignidade, pancreatite, TEP, sarcoidose, doenças autoimunes.',
            'Critérios de Light (exsudato se qualquer um): proteína líquido/soro > 0,5; DHL líquido/soro > 0,6; DHL líquido > 2/3 do limite superior normal sérico.',
            'Derrame parapneumônico complicado/empiema: pH < 7,2, cultura/Gram positivos, glicose < 40, ou derrame loculado com espessamento pleural — critérios que mudam a conduta para drenagem.',
            'Nos três métodos de imagem (Rx, USG, TC) o derrame aparece como opacidade/coleção dependente de gravidade, com a USG sendo útil para guiar punção e diferenciar loculações.',
          ],
          imagens: [IMG('modulo2/p026_x808.webp'), IMG('modulo2/p026_x150.webp'), IMG('modulo2/p026_x151.webp'), IMG('modulo2/p027_x156.webp'), IMG('modulo2/p027_x157.webp'), IMG('modulo2/p027_x158.webp'), IMG('modulo2/p027_x159.webp'), IMG('modulo2/p028_x164.webp'), IMG('modulo2/p028_x166.webp'), IMG('modulo2/p028_x167.webp'), IMG('modulo2/p028_x168.webp')],
        },
        {
          id: 'm2-ptx', titulo: 'Pneumotórax',
          bullets: [
            'Classificação: traumático x espontâneo (primário, em jovens saudáveis, relacionado a blebs; ou secundário, associado a DPOC/fibrose cística/asma/TB/tabagismo) — e simples x hipertensivo x aberto.',
            'Pneumotórax hipertensivo: desvio do mediastino, compressão pulmonar bilateral, acotovelamento das veias cavas → hipóxia, baixo débito, choque. Ao exame: ausculta abolida, jugulares túrgidas, timpanismo — é diagnóstico CLÍNICO, não espere a imagem.',
            'Conduta no hipertensivo: punção de alívio imediata no 5º espaço intercostal (linha axilar média/anterior), seguida de drenagem torácica definitiva.',
            'Pneumotórax aberto: curativo de 3 pontas (selo unidirecional) permite saída de ar na expiração e evita entrada na inspiração, até a drenagem definitiva.',
            'Critérios para drenagem no pneumotórax simples: sintomático, ocupação > 1/3 do volume pleural, necessidade de ventilação mecânica, transporte aéreo ou anestesia geral programada — caso contrário, conduta expectante.',
            'Ultrassonografia: pneumotórax mostra ausência do sinal da praia (substituído pelo sinal do código de barras) e ausência de deslizamento pleural.',
          ],
          imagens: [IMG('modulo2/p030_x174.webp'), IMG('modulo2/p031_x179.webp'), IMG('modulo2/p031_x181.webp'), IMG('modulo2/p031_x183.webp'), IMG('modulo2/p031_x185.webp'), IMG('modulo2/p031_x186.webp'), IMG('modulo2/p031_x188.webp'), IMG('modulo2/p031_x190.webp'), IMG('modulo2/p031_x192.webp'), IMG('modulo2/p032_x196.webp'), IMG('modulo2/p032_x198.webp'), IMG('modulo2/p032_x199.webp'), IMG('modulo2/p033_x204.webp'), IMG('modulo2/p033_x205.webp'), IMG('modulo2/p033_x207.webp'), IMG('modulo2/p035_x213.webp'), IMG('modulo2/p035_x215.webp'), IMG('modulo2/p036_x219.webp')],
        },
        {
          id: 'm2-ic', titulo: 'Insuficiência cardíaca — achados radiológicos',
          bullets: [
            'Sequência clássica de achados na radiografia (nem sempre todos presentes): cardiomegalia → edema intersticial pulmonar → edema alveolar pulmonar → derrame pleural → achados abdominais (hepatomegalia, dilatação de veias hepáticas/cava inferior, ascite).',
            'Edema intersticial: linhas B de Kerley, espessamento peribrônquico, perda da nitidez vascular.',
            'Edema alveolar: opacidades algodonosas, frequentemente em "asa de borboleta" perihilar bilateral.',
            'Cardiomegalia: aumento de câmaras direitas e/ou esquerdas, avaliado pelo índice cardiotorácico (só confiável em incidência PA).',
          ],
          imagens: [IMG('modulo2/p038_x227.webp'), IMG('modulo2/p038_x228.webp'), IMG('modulo2/p038_x229.webp'), IMG('modulo2/p038_x230.webp'), IMG('modulo2/p038_x231.webp'), IMG('modulo2/p039_x237.webp'), IMG('modulo2/p039_x238.webp'), IMG('modulo2/p039_x239.webp'), IMG('modulo2/p039_x240.webp')],
        },
        {
          id: 'm2-tep', titulo: 'TEP e hipertensão pulmonar',
          bullets: [
            'Clínica do TEP: dispneia súbita, dor pleurítica, taquipneia, taquicardia; se instável — hipotensão, choque, PCR.',
            'Estratificação por escore de Wells: baixo (<2), intermediário (2–6) e alto (>6) — orienta se segue com D-dímero (baixo/intermediário) ou vai direto para angio-TC (alto).',
            'Regra PERC: se todos os critérios negativos (idade <50, FC <100, SatO2 ≥95%, sem hemoptise, sem uso de estrogênio, sem TVP/TEP prévio, sem edema unilateral, sem cirurgia/trauma recente) — TEP praticamente excluído sem necessidade de D-dímero.',
            'sPESI (gravidade): pontuação 0 permite considerar tratamento ambulatorial; ≥1 indica internação com avaliação ecocardiográfica/BNP.',
            'Tratamento: estável → anticoagulação; instável (choque) → trombólise.',
            'Sinais radiográficos clássicos de TEP (baixa sensibilidade — não servem para excluir o diagnóstico): sinal de Westermark (oligoemia focal), corcova de Hampton (opacidade periférica em cunha por infarto pulmonar), sinal de Palla.',
            'TC com contraste: método de escolha para confirmar — mostra falha de enchimento nas artérias pulmonares e seus ramos, e áreas de infarto pulmonar.',
            'Hipertensão pulmonar: triada pelo ecocardiograma (VRT ≥ 3,5 = alta probabilidade); diferenciais incluem IC, DAC, doença hepática (Budd-Chiari).',
          ],
          imagens: [IMG('modulo2/p045_x255.webp'), IMG('modulo2/p045_x256.webp'), IMG('modulo2/p045_x257.webp'), IMG('modulo2/p045_x258.webp'), IMG('modulo2/p046_x261.webp'), IMG('modulo2/p046_x262.webp'), IMG('modulo2/p046_x264.webp'), IMG('modulo2/p046_x265.webp')],
        },
      ],
    },
    {
      id: 3, nome: 'Radiologia de Tórax — Dor torácica', resumo: 'Síndrome coronariana, dissecção de aorta, pericárdio e pneumomediastino.',
      topicos: [
        {
          id: 'm3-sindrome-coronariana', titulo: 'Síndrome coronariana crônica',
          bullets: [
            'Estratificação por probabilidade pré-teste (PPT): baixa → teste ergométrico; intermediária → TC de coronária ou teste funcional; alta → considerar cateterismo direto.',
            'Escore de cálcio coronário (CAC) ajuda a definir meta de LDL em prevenção primária: CAC 0 = risco baixo (LDL <130); CAC 1–99 = risco intermediário/alto conforme outros fatores; CAC ≥100 = alto risco (LDL <70); CAC ≥400 = risco muito alto (LDL <50 + AAS).',
            'Graduação da estenose na angio-TC de coronárias: sem DAC, mínima (1–24%), leve (25–49%), moderada (50–69%), grave (≥70%) — obstrutiva costuma ser definida a partir de 50%.',
          ],
          imagens: [IMG('modulo3/p049_x273.webp')],
        },
        {
          id: 'm3-disseccao', titulo: 'Síndrome aórtica aguda e dissecção',
          bullets: [
            'Clínica de alarme: dor torácica em facada/lancinante, de início abrupto, irradiando para as costas.',
            'Classificação de Stanford: tipo A envolve a aorta ascendente (emergência cirúrgica, risco de tamponamento, IAM, AVC); tipo B poupa a ascendente (tratamento inicialmente conservador com controle de dor, FC <60 e PAS 100–120 mmHg).',
            'Escore ADD-RS combina fatores de risco (Marfan, aneurisma conhecido, cirurgia aórtica prévia), características da dor (início súbito, lancinante, intensa) e achados de exame (déficit de pulso, sopro de insuficiência aórtica, déficit neurológico focal) para estimar risco.',
            'D-dímero tem alto valor preditivo negativo: ADD-RS ≤1 + D-dímero <500 praticamente exclui dissecção.',
            'Achado radiográfico clássico: alargamento do mediastino no Rx de tórax — inespecífico, mas levanta a suspeita para angio-TC.',
            'Indicação cirúrgica: todo Stanford A; Stanford B só se houver complicação (dor refratária, isquemia de órgão, ruptura, expansão do lúmen falso apesar do tratamento clínico).',
          ],
          imagens: [IMG('modulo3/p051_x279.webp'), IMG('modulo3/p051_x280.webp'), IMG('modulo3/p051_x281.webp')],
        },
        {
          id: 'm3-pericardite', titulo: 'Pericardite e derrame pericárdico',
          bullets: [
            'Pericardite aguda: diagnóstico com ≥2 de 4 critérios — dor que melhora ao inclinar-se para frente, atrito pericárdico, alterações eletrocardiográficas típicas, derrame pericárdico novo/piora.',
            'Tratamento: restrição de atividades + AINE + colchicina (esta por 3 meses, reduz recorrência).',
            'Tamponamento cardíaco: tríade de Beck (hipotensão + turgência jugular + bulhas abafadas), pulso paradoxal; ao ecocardiograma — colapso diastólico do átrio direito e colapso sistólico do ventrículo direito.',
            'Tratamento do tamponamento: pericardiocentese ou drenagem cirúrgica.',
            'Pericardite constritiva: espessamento pericárdico na TC, com sinais indiretos de restrição ao enchimento ventricular.',
          ],
          imagens: [IMG('modulo3/p054_x291.webp'), IMG('modulo3/p054_x292.webp'), IMG('modulo3/p054_x294.webp'), IMG('modulo3/p054_x296.webp'), IMG('modulo3/p055_x301.webp'), IMG('modulo3/p055_x302.webp'), IMG('modulo3/p055_x303.webp'), IMG('modulo3/p055_x304.webp')],
        },
        {
          id: 'm3-pneumomediastino', titulo: 'Pneumomediastino',
          bullets: [
            'Definição: presença de ar no mediastino, espontâneo ou secundário — mecanismo de Macklin (ruptura alveolar → ar disseca ao longo da bainha broncovascular até o mediastino).',
            'Sinais e sintomas: dor torácica retroesternal, dispneia, enfisema subcutâneo, sinal de Hamman (estalo sincrônico com os batimentos cardíacos).',
            'Espontâneo: tosse intensa, asma grave, esforço/vômito, uso de drogas inalatórias — geralmente autolimitado, conduta conservadora (O2 em alto fluxo, analgesia, observação 24–48h).',
            'Secundário (grave): trauma torácico, ruptura traqueobrônquica ou esofágica (síndrome de Boerhaave), ventilação mecânica com PEEP elevada, procedimentos invasivos — exige avaliação de urgência e eventual cirurgia.',
          ],
          imagens: [IMG('modulo3/p058_x314.webp'), IMG('modulo3/p058_x315.webp'), IMG('modulo3/p058_x317.webp'), IMG('modulo3/p058_x318.webp'), IMG('modulo3/p058_x319.webp')],
        },
        {
          id: 'm3-asma-intersticial', titulo: 'Asma e doença intersticial (comparativo)',
          bullets: [
            'Comparação de imagem: a asma tende a hiperinsuflação com aprisionamento aéreo, enquanto a doença intersticial mostra padrão reticular/reticulonodular, frequentemente com faveolamento em estágios avançados.',
            'Ambas podem cursar com dor torácica e dispneia, mas os padrões radiológicos são opostos (hipertransparência x opacidade fina difusa) — útil como exercício de diagnóstico diferencial de imagem.',
          ],
          imagens: [IMG('modulo3/p059_x323.webp'), IMG('modulo3/p059_x324.webp')],
        },
      ],
    },
    {
      id: 4, nome: 'Radiologia de Abdome — Dor abdominal', resumo: 'Abdome agudo inflamatório, obstrutivo, perfurativo, vascular e pancreatite.',
      topicos: [
        {
          id: 'm4-definindo', titulo: 'Definindo o abdome agudo (anamnese e sinais)',
          bullets: [
            'As 5 categorias de abdome agudo: inflamatório, vascular/isquêmico, hemorrágico, perfurativo e obstrutivo.',
            'Anamnese dirigida: sexo, idade, característica da dor (súbita/insidiosa/intensa), localização, duração, sintomas associados, cirurgias prévias, hábitos, medicações.',
            'Sinais semiológicos clássicos: Blumberg (piora à descompressão em McBurney → apendicite), Murphy (interrupção da inspiração à palpação do hipocôndrio direito → colecistite), Jobert (timpanismo hepático → pneumoperitônio), Cullen/Grey-Turner (equimose periumbilical/flancos → sangramento retroperitoneal, ex. pancreatite hemorrágica).',
            'Pistas por localização: dor em QSD → colecistite/pancreatite; QSE → pancreatite/causas cardiovasculares; FID em jovem → apendicite; FIE em idoso → diverticulite.',
            'Exames de imagem iniciais: Rx de tórax AP, Rx de abdome em ortostase e em decúbito dorsal, USG de abdome (conforme hipótese); TC de abdome com contraste costuma dar o diagnóstico definitivo.',
          ],
          imagens: [IMG('modulo4/p061_x330.webp'), IMG('modulo4/p061_x332.webp'), IMG('modulo4/p063_x337.webp')],
        },
        {
          id: 'm4-inflamatorio', titulo: 'Abdome agudo inflamatório',
          bullets: [
            'Colecistite aguda: obstrução do ducto cístico (cálculo em 90–95%) → distensão vesicular, isquemia de parede, supercrescimento bacteriano. Tratamento inicial: hidratação + analgesia + antibiótico; colecistectomia videolaparoscópica idealmente nas primeiras 72h.',
            'Colangite aguda: obstrução biliar (coledocolitíase é a causa mais comum) com translocação bacteriana — emergência potencialmente fatal. Tratamento: suporte + antibiótico + descompressão biliar urgente (CPRE é o método de escolha).',
            'Apendicite aguda: obstrução da luz apendicular (fecalito, hiperplasia linfoide) → isquemia → necrose/perfuração se não tratada. Padrão-ouro: apendicectomia (preferencialmente vídeo).',
            'Apendagite epiploica: trombose/torção de apêndice epiploico, autolimitada (resolve em 5–10 dias); pode mimetizar apendicite ou diverticulite — tratamento conservador com AINE.',
          ],
          imagens: [IMG('modulo4/p066_x345.webp'), IMG('modulo4/p066_x347.webp'), IMG('modulo4/p066_x349.webp'), IMG('modulo4/p066_x351.webp'), IMG('modulo4/p066_x353.webp'), IMG('modulo4/p066_x355.webp'), IMG('modulo4/p066_x357.webp'), IMG('modulo4/p067_x363.webp'), IMG('modulo4/p067_x365.webp')],
        },
        {
          id: 'm4-anatomia-obstrutivo', titulo: 'Anatomia do TGI e introdução ao obstrutivo',
          bullets: [
            'Sequência anatômica: estômago → duodeno → jejuno/íleo (delgado, central, com pregas coniventes) → ceco/apêndice → cólon ascendente/transverso/descendente/sigmoide (periférico, com haustrações) → reto/canal anal.',
            'Diferenciação-chave na imagem: delgado é central com pregas finas (válvulas coniventes) atravessando toda a luz; grosso é periférico com haustrações que não atravessam completamente.',
            'A válvula ileocecal pode ser competente (não refluxa, favorece maior distensão colônica) ou incompetente (alivia pressão refluindo para o delgado).',
          ],
          imagens: [IMG('modulo4/p068_x369.webp'), IMG('modulo4/p068_x370.webp'), IMG('modulo4/p068_x372.webp'), IMG('modulo4/p069_x375.webp'), IMG('modulo4/p069_x377.webp'), IMG('modulo4/p069_x379.webp')],
        },
        {
          id: 'm4-fisiopatologia', titulo: 'Fisiopatologia e pistas da obstrução intestinal',
          bullets: [
            'Cascata fisiopatológica: hiperperistalse inicial → fadiga intestinal → dilatação → aumento da pressão intraluminal → queda de perfusão → isquemia → perfuração (se não tratada); em paralelo, aumento de líquido intraluminal → diarreia/vômitos → desidratação.',
            'Manifestações clínicas centrais: parada de eliminação de fezes/flatos, vômitos, distensão abdominal, e fatores de risco como cirurgia prévia ou massa inguinal.',
            'Mnemônico "DICA" por etiologia: cirurgia abdominal prévia → bridas; fezes afiladas/sangramento anal → neoplasia colorretal; história de litíase biliar → íleo biliar; abaulamento inguinal → hérnia; pediátrico → íleo meconial/intussuscepção; pós-operatório recente → íleo paralítico; paciente grave de UTI → síndrome de Ogilvie; acamado/idoso → fecaloma; sinal do grão de café → volvo de sigmoide.',
            'Manejo específico: volvo de sigmoide → descompressão colonoscópica (cirurgia se isquemia/perfuração); fecaloma → retirada manual; Ogilvie → neostigmina (após excluir obstrução mecânica); bridas/íleo paralítico → manejo geral expectante; hérnias e íleo biliar → cirurgia.',
          ],
          imagens: [],
        },
        {
          id: 'm4-obstrucao', titulo: 'Obstrução alta x baixa (achados radiográficos)',
          bullets: [
            'Obstrução alta (delgado): vômitos precoces, parada de flatos/fezes tardia, distensão discreta/moderada, cólicas frequentes. Etiologias: bridas, hérnias, íleo biliar. Imagem: distensão central com "empilhamento de moedas" (pregas coniventes).',
            'Obstrução baixa (grosso): vômitos tardios, parada de flatos/fezes precoce, distensão extensa, cólicas esparsas. Etiologias: câncer de cólon, vólvulo, diverticulite. Imagem: distensão periférica com haustrações.',
            'Exemplos clássicos de imagem: câncer de cólon obstrutivo e vólvulo de ceco (alça dilatada deslocada tipicamente para o quadrante superior esquerdo/central).',
          ],
          imagens: [IMG('modulo4/p073_x391.webp'), IMG('modulo4/p073_x393.webp'), IMG('modulo4/p073_x395.webp'), IMG('modulo4/p073_x397.webp'), IMG('modulo4/p074_x402.webp'), IMG('modulo4/p074_x404.webp')],
        },
        {
          id: 'm4-perfurativo', titulo: 'Abdome agudo perfurativo',
          bullets: [
            'Achados clínicos clássicos: dor súbita, abdome em tábua, sinal de Jobert (timpanismo hepático por ar livre); história de úlcera péptica/uso de AINEs aponta para perfuração gástrica/duodenal.',
            'Vísceras que podem perfurar: esôfago (com pneumomediastino), estômago, delgado, cólon, vesícula biliar.',
            'Achados de imagem principais: pneumoperitônio, úlcera gástrica perfurada, corpo estranho, hérnia estrangulada, diverticulite/apendicite perfuradas.',
            'Conduta: laparoscopia/laparotomia de urgência, com correção dirigida à etiologia (ulcerorrafia, apendicectomia, sigmoidectomia).',
          ],
          imagens: [IMG('modulo4/p076_x411.webp'), IMG('modulo4/p076_x412.webp'), IMG('modulo4/p076_x413.webp'), IMG('modulo4/p076_x414.webp'), IMG('modulo4/p076_x415.webp'), IMG('modulo4/p076_x416.webp')],
        },
        {
          id: 'm4-isquemia', titulo: 'Isquemia mesentérica / abdome vascular',
          bullets: [
            'Mecanismos: embólica (arritmia, ex. FA), trombótica arterial (aterosclerose, DAP), trombose venosa (cirrose, trombofilias), mista (estrangulamento/volvo), não oclusiva (baixo fluxo).',
            'Exame inicial de escolha na suspeita de abdome agudo vascular: AngioTC.',
            'Sinais indiretos na TC: espessamento parietal, densificação da gordura mesentérica.',
            'Sinais diretos (mais graves): oclusão vascular visível, hipocontrastação das alças, pneumatose intestinal — este último já indica sofrimento/necrose de parede.',
            'Manifestações clínicas: dor abdominal intensa (desproporcional ao exame físico), podendo cursar com sangramento digestivo, peritonite e acidose metabólica (hiperlactatemia).',
          ],
          imagens: [IMG('modulo4/p078_x422.webp'), IMG('modulo4/p079_x427.webp'), IMG('modulo4/p079_x429.webp'), IMG('modulo4/p079_x431.webp'), IMG('modulo4/p079_x433.webp'), IMG('modulo4/p079_x435.webp'), IMG('modulo4/p079_x437.webp'), IMG('modulo4/p080_x442.webp')],
        },
        {
          id: 'm4-pancreatite', titulo: 'Pancreatite aguda',
          bullets: [
            'Diagnóstico (critérios de Atlanta 2012): pelo menos 2 de 3 — dor característica, amilase/lipase elevadas (>3x o limite), achados de imagem compatíveis.',
            'Atenção: a imagem pode ser NORMAL nas primeiras 48–72h — não espere a TC para tratar clinicamente.',
            'Gravidade: leve (sem falência orgânica/complicação local), moderada (falência transitória <48h e/ou complicação local), grave (falência orgânica persistente >48h).',
            'Manejo geral: analgesia, hidratação/correção hidroeletrolítica, jejum inicial (<48h), liberar dieta assim que houver melhora da dor, ausência de vômitos e fome. Antibiótico só se houver infecção confirmada.',
            'Pancreatite edematosa (realce normal do parênquima) x necrosante (ausência de realce em áreas de necrose) — coleções evoluem de agudas (<4 semanas: coleção líquida peripancreática/coleção necrótica aguda) para organizadas (>4 semanas: pseudocisto/necrose delimitada — WON).',
          ],
          imagens: [IMG('modulo4/p082_x449.webp'), IMG('modulo4/p082_x451.webp'), IMG('modulo4/p082_x455.webp'), IMG('modulo4/p082_x458.webp'), IMG('modulo4/p082_x461.webp')],
        },
      ],
    },
    {
      id: 5, nome: 'Radiologia de Abdome — Vias urinárias', resumo: 'Lesões renais, nefrolitíase e cólica renal.',
      topicos: [
        {
          id: 'm5-alteracoes-renais', titulo: 'Atendimento às alterações renais',
          bullets: [
            'Primeira pergunta: IRA ou DRC? Depois, se a etiologia não é clara, investigar causas pré-renais (hipovolemia), renais (sepse, nefrotóxicos) e pós-renais — estas exigem imagem para excluir obstrução.',
            'Achados que sugerem cronicidade (DRC): anemia, hiperparatireoidismo secundário, perda da diferenciação corticomedular à USG.',
            'USG de rins é o exame inicial de triagem para causas obstrutivas.',
          ],
          imagens: [],
        },
        {
          id: 'm5-lesoes-renais', titulo: 'Lesões renais (TC x RM x USG)',
          bullets: [
            'Cisto renal simples: arredondado, homogêneo, hipoatenuante (0–20 UH) na TC sem contraste, sem realce após contraste, hipersinal homogêneo em T2 na RM, anecoico com reforço acústico posterior na USG — parede fina, sem septos ou nódulos.',
            'Cisto renal complexo: septos espessos, calcificações grosseiras, nódulo sólido mural ou realce ao contraste — critérios que aumentam a suspeita de malignidade e mudam a conduta de "observar" para investigar/operar.',
            'Comparar os 4 métodos lado a lado é o exercício central desse tópico: a mesma lesão muda de aparência conforme TC sem/com contraste, RM em T2 e USG.',
            'Outras condições renais: pielonefrite aguda, doença renal crônica (redução de tamanho, perda de diferenciação) e infarto renal (área em cunha sem realce).',
          ],
          imagens: [IMG('modulo5/p085_x489.webp'), IMG('modulo5/p085_x490.webp'), IMG('modulo5/p085_x491.webp'), IMG('modulo5/p085_x492.webp'), IMG('modulo5/p085_x493.webp'), IMG('modulo5/p085_x494.webp'), IMG('modulo5/p085_x495.webp'), IMG('modulo5/p085_x498.webp'), IMG('modulo5/p086_x503.webp'), IMG('modulo5/p086_x505.webp'), IMG('modulo5/p086_x507.webp'), IMG('modulo5/p086_x509.webp')],
        },
        {
          id: 'm5-nefrolitiase', titulo: 'Nefrolitíase (tipos de cálculo)',
          bullets: [
            'Epidemiologia: homens:mulheres ≈ 3:1; fatores de risco incluem baixo débito urinário e baixo consumo de água.',
            'Tipos de cálculo por radiopacidade: oxalato de cálcio (mais comum, radiopaco independente do pH); fosfato magnesiano/estruvita (coraliforme, pH básico); fosfato de cálcio/hidroxiapatita (pH básico); ácido úrico (transparente no Rx, visível na TC); cistina (pH ácido).',
            'Cálculos por inibidores de protease (ex. indinavir) são invisíveis até na TC.',
            'Locais clássicos de impactação do cálculo ureteral: junção ureteropélvica, cruzamento com os vasos ilíacos, junção ureterovesical.',
            'Radiografia simples serve para cálculos radiopacos; TC sem contraste é o exame de escolha para confirmação e localização; USG mostra hidronefrose e é livre de radiação (útil em gestantes).',
          ],
          imagens: [IMG('modulo5/p088_x518.webp'), IMG('modulo5/p088_x520.webp'), IMG('modulo5/p088_x522.webp'), IMG('modulo5/p088_x524.webp'), IMG('modulo5/p088_x526.webp'), IMG('modulo5/p088_x528.webp'), IMG('modulo5/p088_x530.webp'), IMG('modulo5/p088_x532.webp'), IMG('modulo5/p088_x534.webp')],
        },
        {
          id: 'm5-colica', titulo: 'Cólica renal e pielonefrite obstrutiva',
          bullets: [
            'Clínica da cólica renal: dor lombar súbita migratória (para escroto/vulva), náuseas/vômitos, disúria, polaciúria, hematúria.',
            'Pielonefrite obstrutiva (cálculo + infecção): mesma clínica + febre, hipotensão, taquicardia, Giordano positivo — é uma urgência urológica (obstrução infectada precisa de desobstrução, não só antibiótico).',
            'Tratamento cirúrgico do cálculo renal e ureteral depende de tamanho e localização: cálculos pequenos (<5mm terço médio/superior, <10mm terço inferior) tendem à eliminação espontânea/seguimento; maiores exigem ureterolitotripsia (semirrígida ou flexível), LECO ou nefrolitotripsia percutânea conforme o tamanho.',
            'Duplo J: usado quando há necessidade de desobstrução temporária (ex. pielonefrite associada) antes do tratamento definitivo do cálculo.',
          ],
          imagens: [IMG('modulo5/p089_x538.webp')],
        },
      ],
    },
    {
      id: 6, nome: 'Radiologia no Trauma', resumo: 'FAST, TCE, trauma torácico/abdominal, MESS e classificação de fraturas.',
      topicos: [
        {
          id: 'm6-atendimento', titulo: 'Atendimento ao trauma (xABCDE) e protocolo FAST',
          bullets: [
            'Sequência xABCDE: X — hemorragias exsanguinantes (compressão/torniquete); A — via aérea com controle cervical; B — ventilação/respiração; C — circulação com controle de hemorragia (acesso calibroso, reposição volêmica, busca de sangramento interno via FAST/TC/cirurgia); D — déficit neurológico; E — exposição e controle de hipotermia.',
            'Protocolo FAST avalia 4 janelas: pericárdica, hepatorrenal (espaço de Morison), esplenorrenal e suprapúbica (fundo de saco de Douglas) — positivo indica líquido livre (sangue) na cavidade correspondente.',
            'E-FAST estende o protocolo ao tórax: detecta pneumotórax (ausência de deslizamento pleural) e hemotórax (líquido no espaço pleural), além de fratura de pelve associada.',
          ],
          imagens: [IMG('modulo6/p091_x544.webp'), IMG('modulo6/p092_x549.webp'), IMG('modulo6/p092_x551.webp'), IMG('modulo6/p092_x552.webp'), IMG('modulo6/p092_x554.webp'), IMG('modulo6/p092_x555.webp'), IMG('modulo6/p092_x557.webp'), IMG('modulo6/p093_x562.webp'), IMG('modulo6/p093_x564.webp'), IMG('modulo6/p093_x566.webp'), IMG('modulo6/p093_x567.webp'), IMG('modulo6/p093_x569.webp')],
        },
        {
          id: 'm6-tce', titulo: 'Trauma cranioencefálico (Glasgow, hematomas)',
          bullets: [
            'Escala de coma de Glasgow: soma de abertura ocular (1–4) + resposta verbal (1–5) + resposta motora (1–6), variando de 3 a 15; classifica TCE em leve, moderado e grave.',
            'Indicações de TC no TCE leve: Glasgow <15 por mais de 2h, suspeita de fratura (exposta, com afundamento, de base de crânio — hemotímpano, olhos de guaxinim, otorreia/rinorreia, sinal de Battle), mais de 2 episódios de vômito, idade >65 anos, uso de anticoagulante, perda de consciência >5min, amnésia retrógrada >30min, mecanismo de alta energia.',
            'Espaços meníngeos, do osso para dentro: epidural → dura-máter → subdural → aracnoide → espaço subaracnóideo → pia-máter.',
            'Indicação cirúrgica: hematoma epidural com volume >30mL ou Glasgow <9 + anisocoria; hematoma subdural agudo >10mm de espessura ou desvio de linha média >5mm; sangramentos intracerebrais com efeito de massa, hidrocefalia ou volume >50cm³.',
            'Manejo do TCE grave: manter PAS >100-110, PAM >80-90, glicemia 140-180, normocapnia (PaCO2 ≈35), SatO2 >95%, cabeceira elevada a 30°, combater febre, monitorizar PIC (alvo 5-15mmHg), corrigir anticoagulação/antiagregação.',
          ],
          imagens: [IMG('modulo6/p095_x575.webp'), IMG('modulo6/p096_x579.webp'), IMG('modulo6/p096_x580.webp'), IMG('modulo6/p096_x582.webp'), IMG('modulo6/p096_x584.webp'), IMG('modulo6/p096_x586.webp'), IMG('modulo6/p096_x587.webp')],
        },
        {
          id: 'm6-toracico', titulo: 'Trauma torácico',
          bullets: [
            'Lesão de grandes vasos/aorta: hipotensão, choque refratário, pulso paradoxal, ausência de pulsos periféricos, sopro novo — controle cirúrgico ou endovascular emergencial.',
            'Pneumotórax/hemotórax traumáticos: dispneia, MV abolido; hipertimpanismo no pneumotórax, macicez no hemotórax — descompressão imediata se hipertensivo, drenagem torácica em ambos.',
            'Contusão/laceração pulmonar: dispneia, estertores, hipoxemia — suporte ventilatório e analgesia.',
            'Lesão diafragmática: dispneia + dor abdominal/torácica, abdome escavado, MV diminuído em base — correção cirúrgica (toracoscopia ou laparotomia conforme o lado).',
            'Lesão cardíaca/pericárdica: hipotensão, bulhas abafadas, turgência jugular, pulso paradoxal (tamponamento) — toracotomia emergencial ou janela pericárdica.',
            'Achados de imagem a reconhecer: hematoma mediastinal, pseudoaneurisma de aorta, derrame pericárdico, pneumomediastino, laceração pulmonar.',
          ],
          imagens: [IMG('modulo6/p098_x595.webp'), IMG('modulo6/p098_x597.webp'), IMG('modulo6/p098_x598.webp'), IMG('modulo6/p098_x600.webp'), IMG('modulo6/p098_x602.webp'), IMG('modulo6/p098_x604.webp'), IMG('modulo6/p098_x606.webp'), IMG('modulo6/p098_x608.webp'), IMG('modulo6/p098_x610.webp')],
        },
        {
          id: 'm6-abdominal', titulo: 'Trauma abdominal (fígado, baço, rim, bexiga)',
          bullets: [
            'Paciente instável com abdome cirúrgico (FAST/suspeita positiva) vai direto para cirurgia; se estável, TC de abdome com contraste EV orienta a conduta.',
            'Trauma hepático/esplênico: presença de "blush" arterial na TC (sangramento ativo) direciona para angioembolização; ausência de blush permite tentar tratamento conservador — falha do conservador ou instabilidade indicam cirurgia.',
            'Trauma renal: graus IV podem ser tratados com angioembolização; grau V geralmente exige nefrectomia. Hematoma perirrenal pulsátil/em expansão e lesões graus IV-V são indicação cirúrgica.',
            'Trauma vesical: rotura intraperitoneal (urina irritante causa peritonite) exige laparotomia e rafia primária; rotura extraperitoneal é tratada de forma conservadora com sondagem vesical de demora por ~14 dias.',
            'Achados de imagem centrais: laceração hepática/esplênica/renal/pancreática, pneumoperitônio, desvascularização renal, pneumoretroperitônio.',
          ],
          imagens: [IMG('modulo6/p101_x620.webp'), IMG('modulo6/p101_x621.webp'), IMG('modulo6/p101_x623.webp'), IMG('modulo6/p101_x625.webp'), IMG('modulo6/p101_x626.webp'), IMG('modulo6/p101_x627.webp'), IMG('modulo6/p101_x629.webp'), IMG('modulo6/p101_x631.webp'), IMG('modulo6/p101_x632.webp')],
        },
        {
          id: 'm6-mess', titulo: 'Escore MESS e classificação de fraturas',
          bullets: [
            'MESS (Mangled Extremity Severity Score) soma 4 grupos: energia do trauma (1-4), grau de choque (0-2), isquemia de membro (1-4, dobrado se >6h de isquemia) e idade (0-2).',
            'Interpretação: MESS ≥7 sugere alta chance de amputação; <7, possível salvamento do membro — mas é ferramenta de apoio, não substitui o julgamento clínico.',
            'Toda suspeita de fratura exige ao menos 2 incidências (geralmente AP + lateral, às vezes oblíqua) e avaliação das articulações proximal e distal ao traço.',
            'Classificação de fraturas: completa x incompleta (esta mais em crianças); quanto ao traço — transversa, espiral, oblíqua, fragmentada; quanto ao acometimento articular — extra-articular, articular parcial, articular completa; quanto ao desvio — sem ou com desvio dos fragmentos.',
          ],
          imagens: [],
        },
      ],
    },
    {
      id: 7, nome: 'Neurorradiologia', resumo: 'Cefaleia, HSA, AVC, hidrocefalia, herniações e infecções do SNC.',
      topicos: [
        {
          id: 'm7-cefaleia', titulo: 'Atendimento à cefaleia (sinais de alarme)',
          bullets: [
            'Mnemônico de sinais de alarme (red flags) que indicam investigar cefaleia secundária: mudança de padrão/piora progressiva; início súbito em trovoada (thunderclap) ou "pior dor da vida"; sintomas sistêmicos (febre, rigidez de nuca, emagrecimento, imunossupressão, gestação); sinais neurológicos focais, papiledema, convulsão; piora com Valsalva/tosse/espirro/esforço; início após os 40-50 anos.',
            'Etiologias secundárias e suas pistas: hematoma subdural (uso de anticoagulante, trauma, rebaixamento), HII/pseudotumor cerebral (piora ortostática, Valsalva, zumbido, papiledema), hemorragia intraparenquimatosa (sonolência, déficit focal), tumor (início após os 50 anos), meningite (imunossupressão, febre, meningismo), HSA aneurismática (thunderclap + deterioração progressiva), dissecção carotídea (Síndrome de Horner + sintomas de AVC), trombose venosa cerebral (uso de ACO + sinais de HIC).',
            'Diagnóstico diferencial das cefaleias primárias: enxaqueca (mulher 30-40a, unilateral pulsátil, 4-72h, náusea/foto/fonofobia, com ou sem aura); tensional (bilateral, opressiva, 30min-7 dias, sem náusea); em salvas (homem 20-40a, unilateral periorbitária, muito intensa, 15-180min várias vezes ao dia, com sintomas autonômicos ipsilaterais como lacrimejamento e rinorreia).',
          ],
          imagens: [],
        },
        {
          id: 'm7-hsa', titulo: 'Hemorragia subaracnóidea e trombose venosa cerebral',
          bullets: [
            'HSA aneurismática: cefaleia thunderclap + meningismo + possível deterioração neurológica progressiva — a TC de crânio sem contraste é o primeiro exame, mostrando sangue hiperdenso nos sulcos/cisternas.',
            'Trombose venosa cerebral: pode se apresentar como cefaleia thunderclap; fator de risco clássico é uso de anticoncepcional oral; cursa com sinais de hipertensão intracraniana (papiledema, alterações visuais).',
          ],
          imagens: [IMG('modulo7/p109_x653.webp'), IMG('modulo7/p109_x654.webp'), IMG('modulo7/p109_x656.webp'), IMG('modulo7/p109_x658.webp')],
        },
        {
          id: 'm7-disseccao-hii', titulo: 'Dissecção arterial e hipertensão intracraniana idiopática',
          bullets: [
            'Dissecção de artéria carótida/vertebral: síndrome de Horner ipsilateral, sintomas de AVC isquêmico, déficit de pares cranianos — pensar sobretudo em pacientes jovens com cefaleia + esses achados.',
            'Hipertensão intracraniana idiopática (pseudotumor cerebral): mais comum em mulheres jovens obesas; cefaleia ortostática, piora com Valsalva, zumbido pulsátil, papiledema e déficits visuais — a imagem ajuda a excluir causas secundárias de HIC.',
          ],
          imagens: [IMG('modulo7/p110_x664.webp'), IMG('modulo7/p110_x665.webp'), IMG('modulo7/p110_x666.webp'), IMG('modulo7/p110_x667.webp')],
        },
        {
          id: 'm7-tumores', titulo: 'Lesões tumorais e sinusopatia',
          bullets: [
            'Meningioma: tumor extra-axial mais comum, geralmente bem delimitado, com base ampla na dura-máter e realce homogêneo ao contraste.',
            'Glioblastoma: tumor intra-axial de alto grau, tipicamente com necrose central, realce heterogêneo em anel e edema perilesional extenso.',
            'Sinusopatia aguda: opacificação de seio paranasal, por vezes com nível hidroaéreo — achado comum e geralmente não exige TC/RM de rotina, reservados para complicações ou refratariedade.',
          ],
          imagens: [IMG('modulo7/p111_x670.webp'), IMG('modulo7/p111_x671.webp'), IMG('modulo7/p111_x672.webp')],
        },
        {
          id: 'm7-avc', titulo: 'AVC — protocolo e trombólise/trombectomia',
          bullets: [
            'Protocolo geral (mnemônico STEP): Start (NIHSS, glicemia capilar, neuroimagem imediata); Trombólise (se ictus ≤4,5h e sem contraindicações — PA <185x110, sem sangramento prévio recente, sem uso recente de anticoagulante em dose plena); Endovascular (trombectomia mecânica); Prevenção secundária.',
            'Trombectomia mecânica ("regra dos 6"): considerar até 6h com NIHSS ≥6 e ASPECTS ≥6 para grandes vasos (carótida interna, segmento M1 da cerebral média); janela pode se estender para 6-24h com critérios de imagem avançada (DWI-FLAIR/perfusão).',
            'Angio-TC: detecta o nível da obstrução arterial e avalia circulação colateral antes da trombectomia.',
            'Sinais precoces de AVC isquêmico na TC sem contraste: sinal da artéria densa, apagamento do núcleo lentiforme, perda da faixa insular, perda da diferenciação córtico-subcortical, apagamento de sulcos/cisternas.',
            'Contraindicações centrais à trombólise (mnemônico "4 Cs"): Cabeça (sangramento intracraniano prévio, TCE grave recente), Câncer (isquemia extensa, neoplasia GI ativa), Coração (endocardite, dissecção aórtica), Coagulação (uso recente de anticoagulante, plaquetopenia, sangramento GI recente).',
          ],
          imagens: [IMG('modulo7/p113_x677.webp'), IMG('modulo7/p113_x678.webp'), IMG('modulo7/p113_x679.webp')],
        },
        {
          id: 'm7-avc-rm', titulo: 'AVC na ressonância e doença de pequenos vasos',
          bullets: [
            'Sequência de difusão (DWI/ADC): detecta isquemia precocemente (minutos) — restrição à difusão aparece como alto sinal no DWI e baixo sinal no ADC.',
            'FLAIR: só fica alterado mais tardiamente (horas) — a discrepância DWI positivo/FLAIR ainda normal ajuda a estimar o tempo de evolução do AVC (útil no "wake-up stroke").',
            'Hipertensão arterial crônica: predispõe à ruptura de microaneurismas nas artérias lenticuloestriadas (de Charcot-Bouchard), causando micro-hemorragias profundas, infartos lacunares e hemorragias profundas.',
            'Angiopatia amiloide: causa de hemorragia lobar (não profunda) em idosos, tipicamente com múltiplas micro-hemorragias corticossubcorticais nas sequências sensíveis a sangue (SWI/GRE).',
          ],
          imagens: [IMG('modulo7/p114_x683.webp'), IMG('modulo7/p114_x684.webp'), IMG('modulo7/p114_x685.webp'), IMG('modulo7/p114_x686.webp'), IMG('modulo7/p114_x687.webp'), IMG('modulo7/p114_x688.webp'), IMG('modulo7/p115_x692.webp')],
        },
        {
          id: 'm7-hidrocefalia', titulo: 'Hipertensão intracraniana e hidrocefalia',
          bullets: [
            'Causas de hipertensão intracraniana: massa intracraniana (tumor, hematoma), edema cerebral (ex. AVC extenso), alteração da produção/absorção do líquor, obstrução de fluxo venoso, hidrocefalia obstrutiva, pseudotumor cerebral.',
            'Clínica: cefaleia, rebaixamento do nível de consciência, paralisia do VI par, tríade de Cushing (hipertensão + bradicardia + irregularidade respiratória), sintomas focais.',
            'Manejo de suporte: elevação da cabeceira, hiperventilação controlada (PaCO2 26-30), manitol, monitorização de PIC — sempre tratando a causa de base.',
            'Hidrocefalia comunicante (obstrução na absorção ou excesso de produção de líquor) x não comunicante/obstrutiva (bloqueio físico da circulação do líquor, ex. estenose do aqueduto cerebral ou tumor de IV ventrículo).',
          ],
          imagens: [IMG('modulo7/p117_x699.webp'), IMG('modulo7/p117_x700.webp'), IMG('modulo7/p117_x701.webp'), IMG('modulo7/p117_x702.webp')],
        },
        {
          id: 'm7-herniacao', titulo: 'Herniações cerebrais',
          bullets: [
            'Herniação subfalcina: giro do cíngulo empurrado sob a foice cerebral, para o lado oposto — geralmente o achado mais precoce de efeito de massa.',
            'Herniação uncal (transtentorial lateral): o úncus do lobo temporal desloca-se medialmente, comprimindo o mesencéfalo e o III par craniano — clinicamente associada à midríase ipsilateral.',
            'Herniação tonsilar: as tonsilas cerebelares descem através do forame magno, comprimindo o bulbo — risco iminente de parada cardiorrespiratória.',
          ],
          imagens: [IMG('modulo7/p118_x705.webp'), IMG('modulo7/p118_x706.webp'), IMG('modulo7/p118_x707.webp'), IMG('modulo7/p118_x708.webp')],
        },
        {
          id: 'm7-infeccoes', titulo: 'Infecções do SNC (meningites)',
          bullets: [
            'Clínica: 95% dos pacientes têm ao menos 2 de 4 — cefaleia, febre >38°C, rigidez de nuca, Glasgow <14.',
            'TC antes da punção lombar se: imunocomprometimento, doença de SNC conhecida, convulsão, papiledema, déficit focal ou rebaixamento do nível de consciência.',
            'Perfil do líquor por etiologia (padrão geral): meningite bacteriana — glicose baixa, proteína alta, muitas células (predomínio neutrofílico); meningite viral — glicose normal, proteína levemente elevada, celularidade menor (predomínio linfocitário); meningite tuberculosa — proteína muito alta, glicose baixa, evolução mais arrastada.',
            'Tratamento empírico da meningite bacteriana: antibiótico + dexametasona EV (reduz sequelas, iniciada antes ou junto da 1ª dose de antibiótico).',
            'Antibioticoterapia varia com a faixa etária e o agente suspeito/isolado (ex.: ceftriaxona é a base em crianças >3 meses e adultos; associar ampicilina em neonatos para cobrir Listeria).',
            'Profilaxia de comunicantes: para H. influenzae B e meningococo, rifampicina é a droga de escolha, iniciada o mais precocemente possível (idealmente nas primeiras 24h) para os contatos próximos.',
            'Achados de imagem no espectro das infecções do SNC: meningite aguda, abscesso cerebral piogênico, neurocriptococose, neurocisticercose, neurotoxoplasmose, encefalite herpética, meningite crônica por neurotuberculose.',
          ],
          imagens: [IMG('modulo7/p122_x718.webp'), IMG('modulo7/p122_x720.webp'), IMG('modulo7/p122_x722.webp'), IMG('modulo7/p122_x724.webp'), IMG('modulo7/p122_x726.webp'), IMG('modulo7/p122_x728.webp'), IMG('modulo7/p122_x730.webp'), IMG('modulo7/p122_x732.webp'), IMG('modulo7/p122_x734.webp')],
        },
      ],
    },
  ];

  window.RadioAulas = { MODULOS };
})();
