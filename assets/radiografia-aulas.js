/* ============================================================================
 * SÓqueroMed — Radiografia · Aulas (conteúdo real, adaptado do guia próprio)
 * Módulo de dados puro (sem UI) — consumido por assets/radiografia.js.
 *
 * 7 módulos, 43 tópicos, imagens reais em assets/radio-real/moduloN/.
 * Cobre Rx + TC + RM + USG (o guia de origem trata os métodos de forma
 * comparativa, não apenas radiografia isolada).
 *
 * Cada tópico é uma sequência de BLOCOS lidos em ordem (texto corrido com
 * imagens legendadas intercaladas no ponto exato em que são explicadas):
 *   { type: 'p',   text: '...' }                       — parágrafo
 *   { type: 'tip', text: '...' }                        — macete / dica clínica em destaque
 *   { type: 'img', src: '...', caption: '...' }         — imagem real com legenda
 *
 * window.RadioAulas = { MODULOS: [...] }
 * ==========================================================================*/
(function () {
  'use strict';

  const IMG = (p) => 'assets/radio-real/' + p;
  const P = (text) => ({ type: 'p', text });
  const TIP = (text) => ({ type: 'tip', text });
  const F = (src, caption) => ({ type: 'img', src: IMG(src), caption });

  const MODULOS = [
    // =========================================================================
    // MÓDULO 1 — BASES DA RADIOLOGIA
    // =========================================================================
    {
      id: 1, nome: 'Bases da Radiologia', resumo: 'Física essencial, comparação entre métodos e o passo a passo de leitura.',
      topicos: [
        {
          id: 'm1-formacao', titulo: 'Como a imagem é formada (Rx, USG, TC)',
          blocks: [
            P('O tubo de raios X gera elétrons no filamento do cátodo; eles são acelerados e colidem com o alvo de tungstênio no ânodo giratório (que gira para não derreter com o calor), produzindo o feixe de raios X. Esse feixe atravessa o paciente e sensibiliza o detector do outro lado.'),
            F('modulo1/p003_x10.webp', 'Anatomia do tubo de raios X: cátodo (filamento) → elétrons acelerados → ânodo giratório com alvo de tungstênio → feixe de raios X → janela → detector.'),
            P('Quanto mais denso o tecido que o feixe atravessa, mais ele é atenuado — e mais claro (branco) fica esse ponto na imagem. Isso dá origem às 5 densidades radiográficas clássicas, do mais escuro ao mais claro: ar, gordura, água/partes moles, osso e metal.'),
            TIP('Macete para decorar a escala: pense num copo com uma colher dentro — do fundo para a borda você "vê" ar (boca do copo), depois o líquido (água), a colher de metal brilhando, e se houver gordura boiando ela fica entre o ar e a água. É exatamente essa lógica que se aplica a qualquer radiografia.'),
            F('modulo1/p003_x12.webp', 'As 5 densidades radiográficas ilustradas num copo com colher: metal (mais branco) → osso → água/partes moles → gordura → ar (mais preto).'),
            F('modulo1/p003_x14.webp', 'As mesmas 5 densidades aplicadas a uma radiografia de tórax real: ar nos pulmões, osso nas costelas, metal num dispositivo, gordura subcutânea e água/partes moles no coração e mediastino.'),
            P('A ultrassonografia funciona por um princípio totalmente diferente: o transdutor emite ondas sonoras de alta frequência que refletem (eco) ao encontrar interfaces entre tecidos de densidades diferentes. O tempo que o eco leva para voltar é convertido em profundidade, formando a imagem.'),
            F('modulo1/p004_x18.webp', 'Formação da imagem por ultrassom: o transdutor emite a onda sonora, ela reflete (eco) ao encontrar o objeto/tecido, e o retorno é captado e convertido em imagem.'),
            P('O efeito Doppler mede a variação de frequência entre a onda emitida e a onda refletida por algo em movimento — na prática, as hemácias — permitindo estimar direção e velocidade do fluxo sanguíneo. Convenção de cores: vermelho indica fluxo que se aproxima do transdutor; azul indica fluxo que se afasta.'),
            TIP('Mnemônico para a cor do Doppler: pense num carro de bombeiro (vermelho) vindo NA SUA direção — vermelho = vindo. Se o carro está indo embora, você só vê a luz azul ao longe — azul = indo embora.'),
            P('Já a tomografia computadorizada usa o mesmo princípio físico da radiografia (atenuação de raios X), mas o tubo gira ao redor do paciente e múltiplos detectores registram a atenuação em cada voxel (o "pixel" tridimensional). Um algoritmo reconstrói esses valores em cortes.'),
            F('modulo1/p005_x22.webp', 'Escala de Hounsfield (UH): do ar (−1000) à cortical óssea (+1000), passando por gordura (≈−30), água (0), partes moles (+30 a +60) e sangue (≈+60).'),
            F('modulo1/p005_x24.webp', 'Princípio de aquisição da TC: o tubo gira ao redor do paciente em uma órbita, os detectores registram a atenuação em cada voxel, e o computador reconstrói o corte transversal.'),
            P('Nos exames com contraste iodado (típico em TC de abdome/tórax), a imagem muda conforme a fase de aquisição — e reconhecer a fase é obrigatório antes de interpretar qualquer achado, porque a mesma lesão pode parecer completamente diferente em cada uma.'),
            F('modulo1/p006_x29.webp', 'TC de abdome — fase SEM contraste: parênquima hepático homogêneo, sem realce, usada como referência basal.'),
            F('modulo1/p006_x31.webp', 'TC de abdome — fase ARTERIAL: contraste ainda concentrado nas artérias; lesões hipervasculares (como alguns hemangiomas e carcinomas hepatocelulares) já mostram realce nesta fase (seta).'),
            F('modulo1/p006_x33.webp', 'TC de abdome — fase PORTAL: o parênquima hepático normal atinge seu pico de realce por receber a maior parte do sangue pela veia porta; é a fase mais usada para caracterizar lesões focais (seta).'),
            F('modulo1/p006_x35.webp', 'TC de abdome — fase de EQUILÍBRIO (tardia): o contraste já se distribuiu de forma mais homogênea; útil para avaliar "lavagem" (washout) de lesões que captaram na fase arterial (seta).'),
            F('modulo1/p006_x37.webp', 'Outro corte na fase de equilíbrio, com a seta apontando a mesma lesão hepática agora mais escura (hipoatenuante) que o parênquima ao redor — esse é o "washout" clássico que fecha o diagnóstico de lesões hipervasculares.'),
            TIP('Macete das fases: pense na ordem "A-P-E" (Arterial → Portal → Equilíbrio). Lesão que "acende" na arterial e "lava" (fica mais escura que o fígado) na portal/equilíbrio é o padrão clássico do carcinoma hepatocelular — combinação muito cobrada em prova.'),
          ],
        },
        {
          id: 'm1-indicacoes', titulo: 'Indicações, vantagens e desvantagens de cada método',
          blocks: [
            P('Antes de pedir qualquer exame de imagem, vale ter internalizado para que cada método serve melhor — isso evita solicitar o exame errado (perda de tempo) ou o exame mais caro quando um mais simples já resolveria.'),
            P('Radiografia — principais indicações: abdome agudo (perfurativo e obstrutivo), dispneia/dor torácica, fraturas e lesões ósseas, e estudos contrastados (refluxo vesicoureteral, disfagia, estenose de uretra). Vantagens: disponível, barata, acessível, portátil e rápida. Desvantagens: sobreposição de estruturas, baixa resolução de contraste e uso de radiação ionizante.'),
            P('Ultrassonografia — indicações: avaliação de partes moles (tireoide, testículo, mamas), dor abdominal (apendicite, colecistite), trauma (protocolo E-FAST), avaliação ginecológica/obstétrica, protocolo BLUE/POCUS e avaliação vascular. Vantagens: sem radiação, barata, portátil e rápida. Desvantagens: muito limitada por obesidade, gás intestinal e calcificações — e é altamente operador-dependente.'),
            P('Tomografia computadorizada — é a escolha de excelência para a maioria das emergências: abdome agudo, cefaleia, trauma, dispneia, avaliação vascular (aorta, TEP) e estadiamento oncológico. Vantagens: alta resolução anatômica e aquisição muito rápida. Desvantagens: radiação ionizante, pouca portabilidade, custo elevado, e risco de reação alérgica/nefropatia pelo contraste iodado.'),
            P('Ressonância magnética — indicações: avaliação osteoarticular, sistema nervoso central, mamas, lesões focais hepáticas/pancreáticas, estadiamento e resposta a tratamento. Vantagens: melhor diferenciação de partes moles que qualquer outro método, sem radiação, contraste à base de gadolínio com menor risco alérgico/renal. Desvantagens: alto custo, pouca disponibilidade e exame demorado (pode exigir sedação em pacientes claustrofóbicos ou não colaborativos).'),
            TIP('Decoreba útil para a prova: contraindicações absolutas/relativas da RM — marcapasso não condicional, expansores mamários, próteses penianas e implantes cocleares. Pense no mnemônico "M-E-P-I" (Marcapasso, Expansor, Pênis-prótese, Implante coclear) para não esquecer nenhuma na hora da prova.'),
          ],
        },
        {
          id: 'm1-passopasso', titulo: 'Passo a passo para interpretação + anatomia normal',
          blocks: [
            P('A regra mais importante de toda a radiologia não é decorar achados — é ter uma ORDEM DE LEITURA fixa e sempre seguir a mesma sequência, exame após exame. Você pode escolher seguir a anatomia, ir de estruturas externas para internas, ou deixar a área de maior suspeita clínica por último — mas a ordem escolhida tem que ser sempre a mesma.'),
            TIP('Por que isso importa tanto: o cérebro humano tende a parar de procurar assim que encontra o primeiro achado óbvio ("satisfaction of search") — é assim que se perde uma segunda fratura, um nódulo pulmonar discreto ou uma ponta de cateter mal posicionada. Método fixo = menos coisa passando despercebida.'),
            P('Antes de sequer pensar em diagnóstico, avalie a qualidade técnica do exame: inclusão de toda a área de interesse, incidência correta, fase de aquisição adequada, inspiração/posição corretas, alinhamento, penetração, ausência de artefatos e — em exames contrastados — a fase certa do contraste. Um exame tecnicamente ruim pode simular ou esconder doença.'),
            P('Vamos treinar isso na prática com a anatomia normal do tórax. Nesta radiografia PA anotada, observe as estruturas ósseas e de partes moles: clavícula, escápula, úmero, arcos costais anterior e posterior, corpo vertebral, esterno, mama e a prega axilar.'),
            F('modulo1/p009_x45.webp', 'Radiografia de tórax PA anotada: clavícula, escápula, úmero, mama, prega axilar e arcos costais posterior/anterior sobrepostos (você vê os dois porque o raio atravessa a costela em dois pontos).'),
            F('modulo1/p009_x46.webp', 'A mesma anotação em incidência de perfil: escápula, esterno, mama, arcos costais anterior/posterior e corpo vertebral, agora vistos de lado.'),
            P('Repare como a MESMA estrutura muda de aparência entre PA e perfil — reconhecer isso em segundos é o que separa quem "decorou uma foto" de quem realmente entende anatomia radiográfica.'),
            F('modulo1/p010_x50.webp', 'Lobos pulmonares delimitados na PA: lobo superior, fissura horizontal, lobo médio e lobo inferior — a fissura horizontal só é vista do lado direito.'),
            F('modulo1/p010_x51.webp', 'Os mesmos lobos vistos em perfil: lobo superior, fissura horizontal, fissura oblíqua, lobo médio e lobo inferior — no perfil dá para ver as duas fissuras (horizontal e oblíqua).'),
            F('modulo1/p010_x53.webp', 'Anatomia mediastinal na PA: linha paratraqueal direita (correspondendo à veia cava superior), aorta torácica, arco médio (tronco da artéria pulmonar), átrio direito, ventrículo esquerdo, veia cava inferior.'),
            F('modulo1/p010_x54.webp', 'A mesma anatomia mediastinal em perfil: aorta torácica, artéria pulmonar, átrio esquerdo e ventrículo direito — no perfil, o espaço retroesternal e o retrocardíaco ficam visíveis.'),
            TIP('Macete para nunca mais confundir PA com AP: na PA as escápulas ficam PARA FORA dos campos pulmonares (o paciente "abraça" o aparelho) e o coração aparece em tamanho real. Na AP (paciente de costas para o filme, comum em UTI/portátil) as escápulas ficam sobrepostas aos pulmões e o coração fica ARTIFICIALMENTE maior — não confunda isso com cardiomegalia verdadeira.'),
            P('Agora a anatomia normal do abdome em radiografia simples — muito mais discreta que o tórax, já que a maioria dos órgãos tem a mesma densidade de água/partes moles e só aparecem pelo contraste natural da gordura ao redor.'),
            F('modulo1/p010_x56.webp', 'Radiografia simples de abdome sem anotação — repare como pouca coisa é visível a olho nu: sombra hepática, psoas e o padrão de gás intestinal.'),
            F('modulo1/p010_x57.webp', 'A mesma radiografia anotada: fígado, baço, rim direito e esquerdo, músculos psoas maior direito e esquerdo.'),
            F('modulo1/p010_x59.webp', 'Padrão normal de gás: bolha gástrica no quadrante superior esquerdo, alças delgadas centrais (finas, com pregas coniventes) e cólon periférico (mais calibroso, com haustrações).'),
          ],
        },
      ],
    },

    // =========================================================================
    // MÓDULO 2 — RADIOLOGIA DE TÓRAX — DISPNEIA
    // =========================================================================
    {
      id: 2, nome: 'Radiologia de Tórax — Dispneia', resumo: 'Pneumonias, TB, DPOC/asma, derrame, pneumotórax, IC e TEP.',
      topicos: [
        {
          id: 'm2-atendimento', titulo: 'Atendimento à dispneia (aguda x crônica)',
          blocks: [
            P('A primeira pergunta diante de um paciente com falta de ar é sempre: isso é agudo (minutos a horas) ou crônico? Isso muda completamente a lista de hipóteses e a urgência da investigação.'),
            P('Na dispneia AGUDA, pense em: infarto agudo do miocárdio, insuficiência cardíaca descompensada, tamponamento cardíaco, broncoespasmo, TEP, pneumotórax, infecção pulmonar e obstrução de vias aéreas superiores (anafilaxia, corpo estranho).'),
            P('Na dispneia CRÔNICA, a avaliação combina clínica + imagem + laboratório desde o início: hemoglobina/hematócrito, glicose, ureia/creatinina, TSH, radiografia de tórax, ECG e BNP. As causas mais comuns são asma/DPOC, insuficiência cardíaca, doença pulmonar intersticial e obesidade.'),
            TIP('Dica de prova: sempre que a questão descrever início SÚBITO da dispneia, pense primeiro nas "5 emergências que matam rápido": TEP, pneumotórax hipertensivo, tamponamento cardíaco, edema agudo de pulmão e obstrução de via aérea alta.'),
          ],
        },
        {
          id: 'm2-padroes', titulo: 'Atlas dos principais padrões radiológicos',
          blocks: [
            P('Antes de aprender doença por doença, vale treinar o olho para os PADRÕES básicos — porque na prática você raramente vê o nome da doença escrito na imagem, mas o padrão sempre te leva à lista certa de diferenciais.'),
            F('modulo2/p013_x72.webp', 'Padrão alveolar focal: opacidade localizada, com bordas mal definidas, por preenchimento do espaço aéreo — típico de pneumonia lobar/segmentar.'),
            F('modulo2/p013_x73.webp', 'Padrão nodular: opacidade arredondada e bem definida — pensar em granuloma, metástase ou nódulo primário conforme o contexto.'),
            F('modulo2/p013_x74.webp', 'Padrão intersticial nodular: múltiplos micronódulos distribuídos difusamente pelo interstício — típico de padrão miliar (TB, metástases hematogênicas).'),
            F('modulo2/p013_x75.webp', 'Padrão alveolar difuso: opacidades algodonosas bilaterais e extensas — pensar em edema pulmonar, SDRA ou hemorragia alveolar.'),
            F('modulo2/p013_x77.webp', 'Padrão intersticial reticulonodular: combinação de linhas finas (reticular) com pequenos nódulos — comum em doenças infecciosas atípicas e intersticiais.'),
            F('modulo2/p013_x78.webp', 'Derrame pleural: opacidade basal homogênea com menisco côncavo para cima, apagando o seio costofrênico.'),
            F('modulo2/p013_x79.webp', 'Atelectasia: perda de volume pulmonar com desvio de estruturas (fissura, hilo, mediastino, diafragma) EM DIREÇÃO à área colapsada — o oposto do que acontece no derrame/massa, que empurram para o lado contrário.'),
            F('modulo2/p013_x80.webp', 'Alargamento mediastinal: aumento da largura do mediastino — pensar em dissecção de aorta, massa mediastinal ou sangramento.'),
            F('modulo2/p013_x81.webp', 'Hemitórax opaco: um pulmão inteiro "apagado" — diferenciais incluem atelectasia total, derrame maciço, pneumonectomia prévia e agenesia pulmonar.'),
            F('modulo2/p013_x82.webp', 'Padrão intersticial linear: linhas finas e organizadas (como as linhas B de Kerley) — clássico do edema intersticial inicial.'),
            F('modulo2/p013_x85.webp', 'Padrão intersticial com faveolamento ("honeycombing"): pequenos cistos agrupados nas bases, subpleurais — marca registrada da fibrose pulmonar em estágio avançado.'),
            F('modulo2/p013_x86.webp', 'Pneumotórax: hipertransparência sem trama vascular, delimitada por uma linha pleural fina — o pulmão "murcha" para o hilo.'),
            TIP('Estratégia de prova: primeiro classifique o padrão (alveolar × intersticial × nodular × pleural), DEPOIS pense na lista de doenças daquele padrão. Tentar ir direto ao diagnóstico sem passar pelo padrão é o erro mais comum de quem está começando.'),
          ],
        },
        {
          id: 'm2-pneumonia', titulo: 'Pneumonias: clínica, tratamento e subtipos',
          blocks: [
            P('Clinicamente, pense em pneumonia diante de febre de início agudo, tosse com ou sem escarro e falta de ar; ao exame — crepitações, roncos, aumento do frêmito toracovocal, egofonia e macicez à percussão.'),
            P('Para a imagem, o Rx de tórax PA/perfil resolve a maioria dos casos. Reserve a TC para falha de tratamento, pacientes obesos, Rx duvidoso ou imunossuprimidos (nos quais o Rx pode ser normal mesmo com infecção presente).'),
            P('A decisão entre tratar em casa ou internar usa escores como CURB-65 ou PSI/PORT — de forma simplificada, pontuação baixa (≤2 no CURB-65) costuma permitir tratamento ambulatorial, enquanto pontuações mais altas indicam internação (enfermaria ou UTI conforme gravidade), mudando também o esquema antibiótico (de monoterapia para associação betalactâmico + macrolídeo, por exemplo).'),
            F('modulo2/p015_x93.webp', 'Fluxograma resumido de decisão: ambulatorial × internado (enfermaria/UTI), com os esquemas antibióticos típicos de cada cenário.'),
            F('modulo2/p015_x94.webp', 'Radiografia de pneumonia lobar: consolidação homogênea ocupando um lobo inteiro, com broncograma aéreo visível.'),
            P('Os subtipos radiológicos mudam o raciocínio: a pneumonia LOBAR consolida um lobo inteiro de forma homogênea; a BRONCOPNEUMONIA aparece como opacidades multifocais peribrônquicas, mais irregulares.'),
            F('modulo2/p016_x100.webp', 'Broncopneumonia: opacidades multifocais e mal definidas ao redor dos brônquios, em vez da consolidação homogênea de um lobo inteiro.'),
            F('modulo2/p016_x101.webp', 'Derrame pleural parapneumônico: opacidade basal associada à consolidação, com menisco.'),
            F('modulo2/p016_x102.webp', 'Outro exemplo de derrame pleural associado a pneumonia — repare como o líquido acumula na base, apagando o seio costofrênico.'),
            F('modulo2/p016_x103.webp', 'Pneumonia necrosante: dentro da área consolidada, começam a surgir pequenas áreas de hipertransparência — o tecido está literalmente necrosando.'),
            F('modulo2/p016_x104.webp', 'Abscesso pulmonar: cavidade bem definida com nível hidroaéreo dentro de uma área de consolidação — complicação de pneumonia necrosante não drenada.'),
            F('modulo2/p016_x105.webp', 'Pneumonia viral/atípica: padrão mais difuso e intersticial, menos consolidado que a pneumonia bacteriana típica.'),
            F('modulo2/p017_x108.webp', 'Outro exemplo de pneumonia viral, com opacidades em vidro fosco bilaterais — padrão que também aparece em COVID-19 e outras viroses respiratórias.'),
            TIP('Pérola clínica: abscesso pulmonar com nível hidroaéreo + fator de risco para aspiração (rebaixamento de consciência, etilismo, distúrbio de deglutição) → pense sempre em pneumonia aspirativa como causa de base, mais comum em segmentos posteriores do lobo superior direito (pelo trajeto do brônquio principal direito).'),
          ],
        },
        {
          id: 'm2-tb', titulo: 'Tuberculose pulmonar',
          blocks: [
            P('Clínica clássica que deve levantar a suspeita: tosse por 3 semanas ou mais, sudorese noturna e emagrecimento — a chamada "síndrome consumptiva".'),
            P('A doença se divide em TB primária (mais comum em crianças, geralmente nos lobos médio/inferior) e TB pós-primária/reativação (mais comum em adultos, tipicamente localizada nos ápices pulmonares, onde a maior concentração de oxigênio favorece o bacilo aeróbio).'),
            F('modulo2/p019_x115.webp', 'Padrão de tuberculose pós-primária: opacidades e cavitações predominando nos ápices pulmonares — localização típica da reativação em adultos.'),
            F('modulo2/p019_x116.webp', 'Cavitação tuberculosa: área de hipertransparência com parede espessada, geralmente em lobo superior.'),
            F('modulo2/p019_x117.webp', 'Outro exemplo de tuberculose cavitária apical — repare que a cavitação costuma vir acompanhada de opacidades satélites ao redor.'),
            TIP('Mnemônico para diferenciais de imagem cavitária pulmonar — "ISCAVOU": Infeccioso (TB, pneumonia necrosante, abscesso), Silicose/Sarcoidose, Câncer, Autoimune (artrite reumatoide), Vasculites (granulomatose com poliangeíte), Outros organismos (fungos, micobactérias não tuberculosas), Usuário de drogas (embolia séptica).'),
            P('O diagnóstico laboratorial combina baciloscopia direta (rápida, mas menos sensível), TRM-TB (teste molecular rápido, alta sensibilidade e já detecta resistência à rifampicina) e cultura (padrão-ouro, mas demorada — semanas).'),
            P('Formas mais graves e disseminadas merecem atenção especial. O padrão MILIAR — micronódulos difusos de 1-3mm espalhados por todo o parênquima — indica disseminação hematogênica e é mais comum em imunocomprometidos.'),
            F('modulo2/p020_x122.webp', 'Padrão miliar: incontáveis micronódulos difusos, uniformes, espalhados por ambos os pulmões — parecem "grãos de milho" espalhados na radiografia.'),
            F('modulo2/p020_x123.webp', 'Tuberculose ganglionar: linfonodomegalia hilar/mediastinal volumosa — apresentação comum em crianças e pacientes com HIV.'),
            F('modulo2/p020_x124.webp', 'Outro exemplo de linfonodomegalia por TB ganglionar, agora em corte de TC — os linfonodos aumentados por vezes mostram centro necrótico hipoatenuante.'),
            F('modulo2/p020_x125.webp', 'Bola fúngica (aspergiloma): massa arredondada dentro de uma cavidade pulmonar pré-existente (frequentemente uma cavidade tuberculosa antiga), com um crescente de ar ao redor — complicação clássica de cavidade cicatricial.'),
          ],
        },
        {
          id: 'm2-dpoc', titulo: 'DPOC e asma (hiperinsuflação)',
          blocks: [
            P('Os sinais radiográficos de hiperinsuflação pulmonar formam um conjunto que vale a pena decorar em bloco: aumento do diâmetro AP do tórax, retificação das cúpulas diafragmáticas, aumento dos espaços retroesternal e intercostal, mais de 10 costelas posteriores visíveis, pulmões hipertransparentes, horizontalização das costelas e coração em formato de "gota".'),
            P('Do ponto de vista clínico, bronquite crônica é definida como tosse produtiva por 3 meses ou mais ao ano, durante 2 anos consecutivos, com outras causas de tosse excluídas — já o enfisema é a destruição das paredes dos espaços aéreos, visível na imagem como áreas de hipertransparência com perda da trama vascular.'),
            F('modulo2/p022_x133.webp', 'Enfisema centrolobular: pequenas áreas de destruição no centro do lóbulo pulmonar secundário, predominando nos lobos superiores — o tipo mais associado ao tabagismo.'),
            F('modulo2/p022_x134.webp', 'Correlação anatômica do enfisema centrolobular: a destruição começa ao redor do bronquíolo respiratório, no centro do lóbulo.'),
            F('modulo2/p022_x135.webp', 'Enfisema parasseptal: destruição subpleural, junto aos septos interlobulares — associado à formação de bolhas e risco de pneumotórax espontâneo, especialmente em jovens magros.'),
            F('modulo2/p022_x136.webp', 'Correlação anatômica do enfisema parasseptal — a destruição predomina na periferia do lóbulo, junto à pleura.'),
            TIP('Macete para diferenciar os 3 tipos de enfisema: CENTROlobular = fumante, predomina em CIMA (ápices); PARAsseptal = fica PARAdo perto da pleura, risco de pneumotórax em jovens; PANlobular = destrói TUDO uniformemente, predomina nas BASES, e pensa em deficiência de alfa-1-antitripsina.'),
            F('modulo2/p023_x141.webp', 'Asma — radiografia em inspiração: hiperinsuflação leve, compatível com crise em curso.'),
            F('modulo2/p023_x142.webp', 'A mesma criança/paciente em expiração: o aprisionamento aéreo fica ainda mais evidente — os pulmões "não esvaziam" como deveriam, mostrando hipertransparência persistente mesmo na expiração.'),
            F('modulo2/p023_x143.webp', 'Padrão de enfisema panlobular: hipertransparência difusa e mais homogênea, predominando nas bases — típico do déficit de alfa-1-antitripsina, geralmente em pacientes mais jovens e não tabagistas.'),
          ],
        },
        {
          id: 'm2-derrame', titulo: 'Derrame pleural',
          blocks: [
            P('A investigação inicial de um derrame pleural é sempre Rx de tórax + USG torácico. A TC entra quando a etiologia é duvidosa, o derrame é loculado, ou há suspeita de malignidade.'),
            P('A toracocentese está indicada em praticamente todo derrame novo não óbvio — tanto para alívio sintomático quanto para prevenir complicações. É contraindicada se o volume de líquido for insuficiente para punção segura, houver infecção no local da punção, ou coagulopatia não corrigida.'),
            P('A primeira grande bifurcação diagnóstica é transudato × exsudato. Transudatos (problema sistêmico, pleura "normal"): atelectasia, insuficiência cardíaca, hidrotórax hepático, hipoalbuminemia (inclui síndrome nefrótica), diálise peritoneal, urinotórax. Exsudatos (problema local, pleura "doente"): infeccioso, perfuração esofágica, hemotórax, quilotórax, malignidade, pancreatite, TEP, sarcoidose, doenças autoimunes.'),
            TIP('Critérios de Light — exsudato se QUALQUER UM destes estiver presente: (1) proteína do líquido/soro > 0,5; (2) DHL do líquido/soro > 0,6; (3) DHL do líquido > 2/3 do limite superior normal sérico. Decoreba clássica de prova: "meio, seis décimos, dois terços".'),
            F('modulo2/p026_x808.webp', 'Derrame pleural na radiografia: opacidade basal homogênea com o clássico menisco côncavo para cima, apagando o seio costofrênico.'),
            F('modulo2/p026_x150.webp', 'O mesmo derrame na ultrassonografia: coleção anecoica (ou com ecos internos, se complicado) entre a pleura visceral e parietal — a USG é excelente para guiar a punção com segurança.'),
            F('modulo2/p026_x151.webp', 'Derrame pleural na tomografia: coleção de densidade líquida na cavidade pleural, com compressão do parênquima pulmonar adjacente.'),
            P('Quando o derrame complica com infecção (empiema), os critérios que indicam necessidade de DRENAGEM (não só antibiótico) são: pH < 7,2, cultura ou Gram positivos, glicose < 40, ou derrame loculado com espessamento pleural.'),
            F('modulo2/p027_x156.webp', 'Empiema/derrame parapneumônico complicado: coleção loculada e espessa, muitas vezes com septações visíveis — sinal de que o líquido já não é mais um simples transudato/exsudato livre.'),
            F('modulo2/p027_x157.webp', 'Outro exemplo de derrame parapneumônico em evolução, associado à consolidação pulmonar adjacente.'),
            F('modulo2/p027_x158.webp', 'Derrame loculado na TC: septações internas dividindo a coleção em compartimentos — achado que já indica maior gravidade e possível necessidade de drenagem guiada.'),
            F('modulo2/p027_x159.webp', 'Espessamento pleural associado ao derrame complicado — pleura visceral e parietal espessadas, "abraçando" a coleção.'),
            P('Por fim, dois exemplos de derrame por causas específicas: insuficiência cardíaca (tipicamente bilateral, com outros sinais de congestão associados) e malignidade pleural (derrame volumoso, recidivante, muitas vezes com espessamento pleural nodular).'),
            F('modulo2/p028_x164.webp', 'Derrame pleural por insuficiência cardíaca: geralmente bilateral (ou predominando à direita), acompanhado de cardiomegalia e sinais de congestão vascular.'),
            F('modulo2/p028_x166.webp', 'Derrame pleural volumoso, ocupando praticamente todo o hemitórax — típico de derrames malignos ou muito avançados.'),
            F('modulo2/p028_x167.webp', 'Hemitórax opaco por derrame maciço na TC — repare no desvio do mediastino para o lado CONTRÁRIO ao derrame (diferente da atelectasia, que puxa o mediastino para o MESMO lado).'),
            F('modulo2/p028_x168.webp', 'Espessamento pleural nodular — quando irregular e nodular (em vez de liso), é um sinal de alarme para malignidade pleural (mesotelioma ou metástase pleural).'),
          ],
        },
        {
          id: 'm2-ptx', titulo: 'Pneumotórax',
          blocks: [
            P('Pneumotórax é ar dentro do espaço pleural. A primeira divisão é traumático × espontâneo — e o espontâneo se subdivide em primário (jovens saudáveis, sem doença pulmonar prévia, por ruptura de pequenas bolhas de ar chamadas blebs) e secundário (associado a DPOC, fibrose cística, asma, tuberculose, tabagismo).'),
            F('modulo2/p030_x174.webp', 'Ilustração do mecanismo do pneumotórax: ar entra no espaço pleural e o pulmão colapsa progressivamente, afastando-se da parede torácica.'),
            P('Quanto à gravidade: pneumotórax SIMPLES não desloca o mediastino; HIPERTENSIVO desloca (é uma emergência); ABERTO tem comunicação direta com o meio externo através de uma ferida na parede torácica.'),
            P('O pneumotórax hipertensivo é a apresentação mais temida: o desvio do mediastino comprime o pulmão contralateral e "acotovela" as veias cavas, reduzindo o retorno venoso — o resultado é hipóxia, baixo débito cardíaco e choque. É um diagnóstico CLÍNICO (ausculta abolida, jugulares túrgidas, timpanismo à percussão) — não espere a radiografia para agir.'),
            TIP('Decoreba que salva vida: no pneumotórax hipertensivo, a conduta é PUNÇÃO DE ALÍVIO IMEDIATA no 5º espaço intercostal, linha axilar média ou anterior — seguida da drenagem torácica definitiva. Nunca espere confirmação radiológica em paciente instável.'),
            F('modulo2/p031_x179.webp', 'Sequência de manejo do pneumotórax aberto: a ferida permite entrada de ar durante a inspiração, piorando o colapso pulmonar.'),
            F('modulo2/p031_x181.webp', 'Continuação da sequência — sem tratamento, o ar continua entrando a cada respiração.'),
            F('modulo2/p031_x183.webp', 'O curativo de 3 pontas é aplicado sobre a ferida, fixado em apenas 3 dos 4 lados.'),
            F('modulo2/p031_x185.webp', 'Na inspiração, o curativo sela a ferida e impede a entrada de ar — funciona como uma válvula unidirecional.'),
            F('modulo2/p031_x186.webp', 'Na expiração, a borda solta do curativo permite a saída do ar acumulado — evitando a evolução para pneumotórax hipertensivo.'),
            F('modulo2/p031_x188.webp', 'Vista lateral do mecanismo de válvula do curativo de 3 pontas.'),
            F('modulo2/p031_x190.webp', 'Esquema resumido: entrada bloqueada na inspiração.'),
            F('modulo2/p031_x192.webp', 'Esquema resumido: saída liberada na expiração — o princípio da válvula unidirecional em uma imagem só.'),
            P('Além da radiografia e da TC, a ultrassonografia tem um papel crescente à beira-leito para detectar pneumotórax rapidamente, sem radiação.'),
            F('modulo2/p032_x196.webp', 'Sequência de manejo definitivo: curativo de 3 pontas (imediato) seguido de drenagem torácica em selo d\'água + rafia da lesão (definitivo).'),
            F('modulo2/p032_x198.webp', 'Ultrassonografia de pulmão NORMAL: o "sinal da praia" no modo M — a textura granulada abaixo da linha pleural (como areia) confirma que a pleura está deslizando normalmente.'),
            F('modulo2/p032_x199.webp', 'Ultrassonografia com PNEUMOTÓRAX: o "sinal do código de barras" — linhas retas e paralelas substituem a textura granulada, porque o ar entre as pleuras impede o deslizamento normal.'),
            TIP('Mnemônico ultrassonográfico: praia = normal (pulmão "deslizando na areia"); código de barras = pneumotórax (o "movimento" sumiu, virou listras retas). Fácil de lembrar pela imagem visual do próprio nome do sinal.'),
            F('modulo2/p033_x204.webp', 'Pneumotórax simples na TC: área de ar (hipoatenuante/preta) entre o pulmão e a parede torácica, sem desvio do mediastino.'),
            F('modulo2/p033_x205.webp', 'Pneumotórax hipertensivo na TC: já com desvio importante do mediastino para o lado contrário e compressão do pulmão colapsado.'),
            F('modulo2/p033_x207.webp', 'Outro corte do mesmo caso de pneumotórax hipertensivo, mostrando a extensão do colapso pulmonar e o achatamento das estruturas mediastinais.'),
            F('modulo2/p035_x213.webp', 'Pontos de referência para a punção de alívio e a drenagem torácica: 5º espaço intercostal, entre as linhas axilar anterior e média.'),
            F('modulo2/p035_x215.webp', 'Técnica de drenagem torácica em selo d\'água — o dreno é posicionado no mesmo território anatômico da punção de alívio.'),
            F('modulo2/p036_x219.webp', 'Comparação de fatores de risco: pneumotórax primário (jovens magros, longilíneos, sem doença de base) × secundário (idosos, DPOC, fibrose cística, tabagismo, tuberculose).'),
          ],
        },
        {
          id: 'm2-ic', titulo: 'Insuficiência cardíaca — achados radiológicos',
          blocks: [
            P('Vale a pena decorar a sequência CLÁSSICA de achados radiográficos da insuficiência cardíaca descompensada — nem todos precisam estar presentes ao mesmo tempo, mas eles costumam evoluir nesta ordem: cardiomegalia → edema intersticial pulmonar → edema alveolar pulmonar → derrame pleural → achados abdominais (hepatomegalia, dilatação de veias hepáticas/cava inferior, ascite).'),
            F('modulo2/p038_x227.webp', 'Cardiomegalia: índice cardiotorácico aumentado (relação entre o maior diâmetro cardíaco e o diâmetro torácico interno) — só é confiável em incidência PA.'),
            F('modulo2/p038_x228.webp', 'Aumento predominante das câmaras direitas: aponta para causas de sobrecarga de câmaras direitas (hipertensão pulmonar, cor pulmonale).'),
            F('modulo2/p038_x229.webp', 'Aumento predominante das câmaras esquerdas: mais associado a hipertensão arterial sistêmica crônica e valvopatias mitral/aórtica.'),
            F('modulo2/p038_x230.webp', 'Edema intersticial pulmonar: linhas B de Kerley (linhas finas horizontais nas bases) e perda da nitidez da trama vascular — é o estágio inicial da congestão, antes do edema alveolar.'),
            F('modulo2/p038_x231.webp', 'Detalhe ampliado das linhas B de Kerley — septos interlobulares espessados pelo acúmulo de líquido.'),
            TIP('Ordem de gravidade da congestão pulmonar (útil para prova): 1) redistribuição vascular (vasos dos ápices ficam mais evidentes que os das bases) → 2) edema intersticial (linhas B de Kerley) → 3) edema alveolar (opacidades algodonosas) → 4) derrame pleural. Quanto mais avançado, mais grave a descompensação.'),
            F('modulo2/p039_x237.webp', 'Edema alveolar pulmonar: opacidades algodonosas, mal definidas, tipicamente em distribuição perihilar bilateral — o clássico padrão em "asa de borboleta".'),
            F('modulo2/p039_x238.webp', 'Outro exemplo de edema alveolar, já mais extenso e simétrico.'),
            F('modulo2/p039_x239.webp', 'Achados abdominais associados na TC/USG: hepatomegalia congestiva com dilatação das veias hepáticas e da veia cava inferior.'),
            F('modulo2/p039_x240.webp', 'Ascite associada ao quadro de congestão sistêmica — presente nos casos mais avançados/crônicos de insuficiência cardíaca direita.'),
          ],
        },
        {
          id: 'm2-tep', titulo: 'TEP e hipertensão pulmonar',
          blocks: [
            P('A clínica clássica do TEP combina dispneia súbita, dor pleurítica, taquipneia e taquicardia — se o paciente estiver instável, pode haver hipotensão, choque ou até parada cardiorrespiratória.'),
            P('A estratificação de probabilidade usa o escore de Wells: baixo risco (<2 pontos), intermediário (2 a 6) e alto (>6). Isso decide o próximo passo: baixo/intermediário → D-dímero; alto → direto para angio-TC de tórax.'),
            TIP('A regra PERC é uma ferramenta para EXCLUIR TEP sem nem pedir D-dímero, em paciente de baixa probabilidade clínica: idade <50 anos, FC <100, SatO2 ≥95%, sem hemoptise, sem uso de estrogênio, sem TVP/TEP prévio, sem edema unilateral de perna, sem cirurgia/trauma recente que exigiu hospitalização. Se TODOS negativos, o TEP está praticamente excluído.'),
            P('Para gravidade, use o sPESI: pontuação 0 permite considerar tratamento ambulatorial; qualquer ponto ≥1 indica internação com avaliação ecocardiográfica e BNP. E quanto ao tratamento: paciente estável recebe anticoagulação; paciente instável (em choque) recebe trombólise.'),
            P('Nas imagens de radiografia simples, os sinais clássicos de TEP têm baixíssima sensibilidade — NÃO servem para excluir o diagnóstico, apenas reforçam a suspeita quando presentes.'),
            F('modulo2/p045_x255.webp', 'Sinal de Westermark: oligoemia focal — uma área do pulmão fica anormalmente hipertransparente por redução do fluxo sanguíneo distal à artéria obstruída.'),
            F('modulo2/p045_x256.webp', 'Corcova de Hampton: opacidade periférica em forma de cunha, com base voltada para a pleura — representa o infarto pulmonar hemorrágico.'),
            F('modulo2/p045_x257.webp', 'Outro exemplo do sinal de Westermark — repare como a diferença de transparência entre os dois pulmões é sutil, reforçando por que este sinal tem baixa sensibilidade isoladamente.'),
            F('modulo2/p045_x258.webp', 'Outro exemplo da corcova de Hampton, mostrando a clássica opacidade triangular periférica de base pleural.'),
            TIP('Cuidado de prova: Hampton e Westermark são sinais de BAIXA sensibilidade — não servem para excluir TEP quando ausentes. O exame que realmente confirma é a angio-TC de tórax.'),
            P('A angio-TC é o método de escolha para confirmação: mostra diretamente a falha de enchimento (o coágulo) dentro das artérias pulmonares e seus ramos, além de identificar áreas de infarto pulmonar.'),
            F('modulo2/p046_x261.webp', 'Angio-TC de tórax: falha de enchimento (área escura) dentro do lúmen de uma artéria pulmonar contrastada — o próprio trombo obstruindo o vaso.'),
            F('modulo2/p046_x262.webp', 'Outro corte mostrando falhas de enchimento em múltiplos ramos da artéria pulmonar — TEP bilateral.'),
            F('modulo2/p046_x264.webp', 'Área de infarto pulmonar na TC: opacidade periférica triangular, correspondendo à corcova de Hampton vista na radiografia — mas com muito mais detalhe e certeza diagnóstica.'),
            F('modulo2/p046_x265.webp', 'Outro exemplo de infarto pulmonar por TEP, já com componente de derrame pleural associado.'),
            P('A hipertensão pulmonar, por sua vez, é rastreada pelo ecocardiograma transtorácico (VRT ≥ 3,5 já indica alta probabilidade) — e antes de fechar o diagnóstico, é essencial descartar diferenciais como insuficiência cardíaca, doença arterial coronariana e doença hepática (síndrome de Budd-Chiari).'),
          ],
        },
      ],
    },

    // =========================================================================
    // MÓDULO 3 — RADIOLOGIA DE TÓRAX — DOR TORÁCICA
    // =========================================================================
    {
      id: 3, nome: 'Radiologia de Tórax — Dor torácica', resumo: 'Síndrome coronariana, dissecção de aorta, pericárdio e pneumomediastino.',
      topicos: [
        {
          id: 'm3-sindrome-coronariana', titulo: 'Síndrome coronariana crônica',
          blocks: [
            P('A investigação da dor torácica crônica de origem coronariana parte da probabilidade pré-teste (PPT): baixa PPT vai para teste ergométrico; intermediária vai para TC de coronária ou teste funcional; alta PPT pode ir direto para cateterismo.'),
            P('Em prevenção primária, o escore de cálcio coronário (CAC) ajuda a definir a meta de LDL: CAC = 0 → risco baixo (LDL-alvo <130); CAC 1-99 → risco intermediário/alto conforme outros fatores; CAC ≥100 → alto risco (LDL-alvo <70); CAC ≥400 → risco muito alto (LDL-alvo <50 + AAS).'),
            F('modulo3/p049_x273.webp', 'Graduação da estenose coronariana na angio-TC: sem DAC, mínima (1-24%), leve (25-49%), moderada (50-69%) e grave (≥70%) — a partir de 50% já se considera obstrutiva.'),
            TIP('Macete: quanto maior o CAC, menor o LDL-alvo. É basicamente uma escada onde cada degrau de risco "aperta" mais a meta de colesterol.'),
          ],
        },
        {
          id: 'm3-disseccao', titulo: 'Síndrome aórtica aguda e dissecção',
          blocks: [
            P('A dor de alarme para dissecção de aorta é súbita, em facada ou lancinante, e classicamente irradia para as costas (entre as escápulas).'),
            P('A classificação de Stanford é a mais cobrada: tipo A envolve a aorta ascendente (é uma emergência CIRÚRGICA — risco de tamponamento, infarto, AVC); tipo B poupa a ascendente (tratamento inicialmente conservador, controlando dor, frequência cardíaca abaixo de 60 bpm e pressão sistólica entre 100-120 mmHg).'),
            F('modulo3/p051_x279.webp', 'Classificação de Stanford e De Bakey lado a lado: Stanford A/De Bakey I e II envolvem a aorta ascendente; Stanford B/De Bakey III poupa a ascendente.'),
            F('modulo3/p051_x280.webp', 'Detalhe do flap mediointimal — a "membrana" que separa o lúmen verdadeiro do lúmen falso, visível na angio-TC.'),
            F('modulo3/p051_x281.webp', 'Extensão da dissecção tipo B, envolvendo a aorta descendente após a emergência da artéria subclávia esquerda.'),
            TIP('Regra de decisão rápida: "A de Ascendente, A de operAr" — Stanford A sempre vai para cirurgia. Stanford B só opera se houver complicação: dor refratária, isquemia de órgão, ruptura, ou expansão do lúmen falso apesar do tratamento clínico.'),
            P('O escore ADD-RS ajuda a estimar o risco combinando 3 categorias: condições de alto risco (Marfan, aneurisma aórtico conhecido, cirurgia aórtica prévia), características de dor de alto risco (início súbito, lancinante, intensidade severa) e achados de exame de alto risco (déficit de pulso, sopro de insuficiência aórtica novo, déficit neurológico focal). Com ADD-RS ≤1 e D-dímero <500, a dissecção está praticamente excluída — o D-dímero tem alto valor preditivo negativo aqui.'),
            P('Na radiografia simples, o achado clássico (mas inespecífico) é o alargamento do mediastino — não confirma nada sozinho, mas já é suficiente para disparar a angio-TC.'),
          ],
        },
        {
          id: 'm3-pericardite', titulo: 'Pericardite e derrame pericárdico',
          blocks: [
            P('O diagnóstico de pericardite aguda exige pelo menos 2 de 4 critérios: dor que melhora ao inclinar-se para frente, atrito pericárdico à ausculta, alterações eletrocardiográficas típicas (supra de ST difuso, côncavo) e derrame pericárdico novo ou em piora.'),
            P('O tratamento combina restrição de atividades físicas + AINE + colchicina — esta última mantida por 3 meses, pois reduz significativamente o risco de recorrência.'),
            TIP('Pérola de prova: colchicina isolada (sem AINE) é a EXCEÇÃO, não a regra — normalmente ela entra associada.'),
            F('modulo3/p054_x291.webp', 'Ultrassonografia de pericárdio NORMAL: sem coleção líquida visível entre as folhetos pericárdicos.'),
            F('modulo3/p054_x292.webp', 'Ultrassonografia com derrame pericárdico: espaço anecoico (líquido) circundando o coração, entre os folhetos visceral e parietal do pericárdio.'),
            F('modulo3/p054_x294.webp', 'Derrame pericárdico na radiografia de tórax: silhueta cardíaca aumentada e globosa, em formato de "moringa" — achado clássico mas tardio (só aparece com volumes maiores).'),
            F('modulo3/p054_x296.webp', 'Outro exemplo de silhueta cardíaca "em moringa" por derrame pericárdico volumoso.'),
            P('Quando o derrame evolui para tamponamento cardíaco, a clínica muda drasticamente: taquicardia, hipotensão, turgência jugular e pulso paradoxal formam a base — e a tríade de Beck resume os 3 achados mais lembrados em prova: hipotensão + turgência jugular + bulhas abafadas.'),
            TIP('No ecocardiograma do tamponamento: colapso DIASTÓLICO do átrio direito (mais sensível e mais precoce) e colapso SISTÓLICO do ventrículo direito (mais específico). O tratamento é pericardiocentese ou drenagem cirúrgica — não dá para esperar.'),
            F('modulo3/p055_x301.webp', 'Pericardite constritiva na TC: espessamento pericárdico difuso, por vezes com calcificações — o pericárdio "engessado" impede o enchimento diastólico normal.'),
            F('modulo3/p055_x302.webp', 'Sinais indiretos de restrição na TC: dilatação de veias hepáticas e cava inferior, refletindo a dificuldade de enchimento das câmaras direitas.'),
            F('modulo3/p055_x303.webp', 'Outro corte evidenciando o espessamento pericárdico característico da pericardite constritiva.'),
            F('modulo3/p055_x304.webp', 'Comparação: pericárdio espessado e aderido ao miocárdio, contrastando com o espaço pericárdico fino e normal esperado.'),
          ],
        },
        {
          id: 'm3-pneumomediastino', titulo: 'Pneumomediastino',
          blocks: [
            P('Pneumomediastino é a presença de ar dentro do mediastino. O mecanismo clássico (mecanismo de Macklin) é: ruptura alveolar → o ar disseca ao longo da bainha broncovascular → chega ao mediastino, sem necessariamente haver um "buraco" grande em nenhum órgão.'),
            P('Os sinais e sintomas a reconhecer: dor torácica retroesternal, dispneia, enfisema subcutâneo (crepitação à palpação do pescoço/tórax) e o sinal de Hamman — um estalo sincrônico com os batimentos cardíacos, audível à ausculta.'),
            P('É essencial diferenciar dois grupos com prognósticos bem diferentes. O espontâneo (tosse intensa, asma grave, esforço físico/vômito, uso de drogas inalatórias) costuma ser autolimitado — conduta conservadora com O2 em alto fluxo, analgesia e observação por 24-48h.'),
            TIP('Já o SECUNDÁRIO é bandeira vermelha: trauma torácico, ruptura traqueobrônquica ou esofágica (síndrome de Boerhaave, clássica após vômitos vigorosos), ventilação mecânica com PEEP elevada, ou procedimentos invasivos recentes — este grupo exige avaliação de urgência e, muitas vezes, cirurgia.'),
            F('modulo3/p058_x314.webp', 'Pneumomediastino na radiografia de tórax: linhas de ar delineando as estruturas mediastinais, criando contornos anormalmente nítidos ao redor do coração e dos grandes vasos.'),
            F('modulo3/p058_x315.webp', 'Pneumomediastino na TC: coleções de ar (hipoatenuantes) dissecando os planos do mediastino, ao redor da traqueia e dos grandes vasos.'),
            F('modulo3/p058_x317.webp', 'Caso de pneumomediastino secundário a trauma torácico — investigar sempre lesão de via aérea ou esôfago associada neste contexto.'),
            F('modulo3/p058_x318.webp', 'Enfisema subcutâneo cervical associado — o ar disseca também os planos de partes moles do pescoço, causando a crepitação característica à palpação.'),
            F('modulo3/p058_x319.webp', 'Caso de pneumomediastino por barotrauma (ex.: ventilação mecânica com pressões elevadas) — repare na extensão do ar dissecando múltiplos planos.'),
          ],
        },
        {
          id: 'm3-asma-intersticial', titulo: 'Asma e doença intersticial (comparativo)',
          blocks: [
            P('Este é um exercício comparativo direto: a asma tende a produzir hiperinsuflação com aprisionamento aéreo (pulmões "hipertransparentes" e volumosos), enquanto a doença intersticial mostra o padrão oposto — reticular ou reticulonodular, podendo evoluir para faveolamento nos estágios avançados.'),
            F('modulo3/p059_x323.webp', 'Padrão de asma: hiperinsuflação pulmonar, retificação diafragmática e aumento dos espaços intercostais.'),
            F('modulo3/p059_x324.webp', 'Padrão de doença intersticial: opacidades reticulares finas, predominando nas bases — o oposto visual da hipertransparência da asma.'),
            TIP('Treino de padrão: se a imagem parece "vazia demais" (muito preta, hipertransparente) pense em processo obstrutivo (asma/DPOC). Se parece "cheia demais" (linhas finas, reticular, esbranquiçada) pense em processo restritivo/intersticial.'),
          ],
        },
      ],
    },

    // =========================================================================
    // MÓDULO 4 — RADIOLOGIA DE ABDOME — DOR ABDOMINAL
    // =========================================================================
    {
      id: 4, nome: 'Radiologia de Abdome — Dor abdominal', resumo: 'Abdome agudo inflamatório, obstrutivo, perfurativo, vascular e pancreatite.',
      topicos: [
        {
          id: 'm4-definindo', titulo: 'Definindo o abdome agudo (anamnese e sinais)',
          blocks: [
            P('Todo abdome agudo se encaixa em uma de 5 categorias: inflamatório, vascular/isquêmico, hemorrágico, perfurativo e obstrutivo. Identificar a categoria certa já elimina boa parte dos diferenciais.'),
            P('Uma anamnese bem dirigida pergunta: sexo, idade, característica da dor (súbita, insidiosa, intensa), localização, duração, sintomas associados, cirurgias prévias, hábitos e medicações em uso.'),
            P('Alguns sinais semiológicos clássicos merecem decoreba: sinal de Blumberg (dor que piora à descompressão brusca no ponto de McBurney → apendicite), sinal de Murphy (interrupção da inspiração à palpação do hipocôndrio direito → colecistite), sinal de Jobert (timpanismo à percussão da área hepática → pneumoperitônio), e sinais de Cullen/Grey-Turner (equimose periumbilical/nos flancos → sangramento retroperitoneal, como na pancreatite hemorrágica).'),
            F('modulo4/p061_x330.webp', 'Mapa de dor referida abdominal em vista anterior: fígado/vesícula/duodeno (irritação diafragmática), estômago, cabeça do pâncreas/duodeno, ceco e apêndice.'),
            F('modulo4/p061_x332.webp', 'O mesmo mapa em vista posterior: baço, rins e ureteres, cólon sigmoide — pontos que ajudam a raciocinar a dor referida por localização.'),
            TIP('Regra prática por localização: dor em quadrante superior direito → colecistite/pancreatite; quadrante superior esquerdo → pancreatite/causas cardiovasculares; fossa ilíaca direita em jovem → apendicite; fossa ilíaca esquerda em idoso → diverticulite.'),
            F('modulo4/p063_x337.webp', 'Sequência de exames complementares no abdome agudo: laboratoriais (hemograma, PCR, eletrólitos, função renal, coagulograma, amilase/lipase, bilirrubinas, gasometria) + imagem (Rx de tórax e abdome, USG, e a TC com contraste como definidora na maioria dos casos).'),
          ],
        },
        {
          id: 'm4-inflamatorio', titulo: 'Abdome agudo inflamatório',
          blocks: [
            P('Colecistite aguda: começa com obstrução do ducto cístico (cálculo, em 90-95% dos casos) → distensão vesicular → isquemia da parede → supercrescimento bacteriano. Tratamento inicial: hidratação + analgesia + antibioticoterapia, com colecistectomia videolaparoscópica idealmente nas primeiras 72 horas.'),
            F('modulo4/p066_x345.webp', 'Colecistite aguda na ultrassonografia: parede vesicular espessada (>3mm), líquido pericolecístico e sinal de Murphy ultrassonográfico (dor à compressão do transdutor sobre a vesícula).'),
            F('modulo4/p066_x347.webp', 'Colecistite aguda na TC: espessamento parietal da vesícula biliar, com densificação da gordura perivesicular.'),
            P('Apendicite aguda: obstrução da luz apendicular (fecalito é a causa mais comum, também hiperplasia linfoide) → aumento da pressão luminal → isquemia da mucosa → necrose e perfuração se não tratada. Padrão-ouro de tratamento: apendicectomia, preferencialmente videolaparoscópica.'),
            F('modulo4/p066_x349.webp', 'Apendicite aguda na TC: apêndice espessado (>6-7mm de diâmetro), com densificação da gordura periapendicular — muitas vezes com um apendicolito visível dentro da luz.'),
            F('modulo4/p066_x351.webp', 'Apendicite aguda em corte diferente, mostrando a parede espessada e o processo inflamatório ao redor.'),
            P('Colite/enterocolite aguda: espessamento parietal do cólon (ou de segmentos do intestino delgado), inespecífico entre si, mas o contexto clínico (diarreia, febre, exposição a patógenos) direciona a etiologia infecciosa mais provável.'),
            F('modulo4/p066_x353.webp', 'Colite aguda na TC: espessamento parietal do cólon, com edema de submucosa — achado que também pode aparecer em colite isquêmica ou inflamatória, exigindo correlação clínica.'),
            P('Diverticulite aguda: inflamação de um divertículo colônico, geralmente no sigmoide — pode variar de não complicada (tratamento clínico) até complicada, com abscesso ou perfuração.'),
            F('modulo4/p066_x355.webp', 'Diverticulite aguda não complicada: divertículos visíveis com densificação da gordura pericolônica adjacente.'),
            F('modulo4/p066_x357.webp', 'Diverticulite aguda complicada, já com formação de abscesso pericólico — achado que muda a conduta de "apenas antibiótico" para "drenagem percutânea se >4cm".'),
            P('Dois quadros que costumam ser subestimados: apendagite epiploica (trombose ou torção de um apêndice epiploico, geralmente autolimitada em 5-10 dias, tratada só com AINE — pode mimetizar apendicite ou diverticulite) e colangite aguda (obstrução biliar com translocação bacteriana, emergência potencialmente fatal, tratada com suporte + antibiótico + descompressão biliar urgente via CPRE).'),
            F('modulo4/p067_x363.webp', 'Apendagite epiploica na TC: pequena estrutura ovalada de densidade gordurosa com anel hiperdenso ao redor ("anel gorduroso"), adjacente à parede do cólon — fácil de confundir com apendicite/diverticulite se não se conhecer o achado.'),
            F('modulo4/p067_x365.webp', 'Colangite aguda na TC/colangiorressonância: dilatação das vias biliares intra e extra-hepáticas, geralmente com cálculo obstrutivo (coledocolitíase) visível na via biliar principal.'),
          ],
        },
        {
          id: 'm4-anatomia-obstrutivo', titulo: 'Anatomia do TGI e introdução ao obstrutivo',
          blocks: [
            P('Antes de reconhecer uma obstrução, é preciso dominar a anatomia normal do trato gastrointestinal: estômago → duodeno → jejuno/íleo (delgado) → ceco/apêndice → cólon ascendente/transverso/descendente/sigmoide → reto/canal anal.'),
            F('modulo4/p068_x369.webp', 'Anatomia geral do trato gastrointestinal: piloro, duodeno, jejuno, íleo, ceco, apêndice vermiforme, cólons ascendente/transverso/descendente/sigmoide, reto e canal anal.'),
            F('modulo4/p068_x370.webp', 'Detalhe anatômico do delgado (jejuno/íleo, com pregas coniventes) em relação ao cólon (mais periférico, com haustrações).'),
            F('modulo4/p068_x372.webp', 'Correlação com peça anatômica/atlas fotográfico, mostrando a disposição real das alças intestinais na cavidade — útil para visualizar em 3D o que a radiografia mostra em 2D.'),
            TIP('A chave para diferenciar delgado de grosso numa radiografia simples: o delgado é CENTRAL, com pregas finas (coniventes) que atravessam TODA a largura da alça; o cólon é PERIFÉRICO, com haustrações que NÃO atravessam completamente a luz.'),
            F('modulo4/p069_x375.webp', 'Válvula ileocecal competente: não permite refluxo do conteúdo colônico de volta para o delgado — em uma obstrução colônica, isso faz o cólon distender progressivamente (alça fechada), aumentando o risco de perfuração cecal.'),
            F('modulo4/p069_x377.webp', 'Válvula ileocecal incompetente: permite refluxo para o delgado, "aliviando" parcialmente a pressão colônica — clinicamente menos perigosa que a competente numa obstrução baixa.'),
            F('modulo4/p069_x379.webp', 'Comparação lado a lado do padrão haustral do cólon (periférico) com as pregas coniventes do delgado (central) numa radiografia simples de abdome.'),
          ],
        },
        {
          id: 'm4-fisiopatologia', titulo: 'Fisiopatologia e pistas da obstrução intestinal',
          blocks: [
            P('A cascata fisiopatológica da obstrução intestinal segue uma lógica de "efeito dominó": hiperperistalse inicial (o intestino tenta vencer o obstáculo) → fadiga intestinal → dilatação → aumento da pressão intraluminal → queda da perfusão da parede → isquemia → perfuração, se não tratada a tempo. Em paralelo, o acúmulo de líquido intraluminal causa vômitos/diarreia → desidratação e hipovolemia.'),
            P('As manifestações clínicas centrais são: parada de eliminação de fezes e flatos, vômitos, distensão abdominal — e vale sempre perguntar sobre fatores de risco como cirurgia abdominal prévia ou massa/abaulamento inguinal.'),
            TIP('Mnemônico "DICA" para adivinhar a etiologia pela história: cirurgia abdominal prévia → bridas; fezes afiladas/sangramento anal → neoplasia colorretal; história de litíase biliar → íleo biliar; abaulamento inguinal → hérnia encarcerada; paciente pediátrico → íleo meconial/intussuscepção; pós-operatório recente → íleo paralítico; paciente grave de UTI → síndrome de Ogilvie (pseudo-obstrução colônica); idoso acamado/casa de repouso → fecaloma; e o clássico sinal do "grão de café" → volvo de sigmoide.'),
            P('O manejo muda bastante conforme a causa: volvo de sigmoide → descompressão colonoscópica se não houver isquemia (cirurgia se houver isquemia/perfuração); fecaloma → retirada manual das fezes impactadas; síndrome de Ogilvie → neostigmina, mas só depois de excluir obstrução mecânica verdadeira; bridas e íleo paralítico → manejo geral, geralmente expectante; hérnias e íleo biliar → cirurgia.'),
          ],
        },
        {
          id: 'm4-obstrucao', titulo: 'Obstrução alta x baixa (achados radiográficos)',
          blocks: [
            P('Comparar a obstrução ALTA (intestino delgado) com a BAIXA (intestino grosso) é um dos exercícios mais cobrados em prova, porque a clínica e a imagem seguem padrões praticamente opostos.'),
            P('Obstrução ALTA (delgado): vômitos PRECOCES, parada de flatos/fezes TARDIA, distensão discreta a moderada, cólicas FREQUENTES. Etiologias típicas: bridas, hérnias, íleo biliar. Na imagem: distensão CENTRAL, com o clássico "empilhamento de moedas" formado pelas pregas coniventes atravessando toda a alça.'),
            F('modulo4/p073_x391.webp', 'Obstrução do intestino delgado: alças centrais distendidas mostrando o padrão de "empilhamento de moedas" — as pregas coniventes finas atravessando toda a largura da alça.'),
            F('modulo4/p073_x393.webp', 'Radiografia simples confirmando múltiplas alças de delgado distendidas, centrais, com níveis hidroaéreos — padrão típico de obstrução alta.'),
            F('modulo4/p073_x395.webp', 'TC de obstrução de delgado: dilatação de alças com transição abrupta de calibre no ponto da obstrução — a TC também ajuda a identificar a CAUSA (brida, hérnia, etc).'),
            F('modulo4/p073_x397.webp', 'Detalhe da parede intestinal e das pregas coniventes espessadas por edema secundário à distensão.'),
            P('Obstrução BAIXA (grosso): vômitos TARDIOS, parada de flatos/fezes PRECOCE, distensão EXTENSA, cólicas ESPARSAS. Etiologias típicas: câncer de cólon, vólvulo, diverticulite. Na imagem: distensão PERIFÉRICA, com haustrações visíveis (que, ao contrário das pregas coniventes, não atravessam toda a largura da alça).'),
            F('modulo4/p074_x402.webp', 'Câncer de cólon obstrutivo: massa estenosante causando dilatação a montante do cólon — repare no calibre muito maior das alças em comparação com a obstrução de delgado.'),
            F('modulo4/p074_x404.webp', 'Vólvulo de ceco: alça cecal maciçamente dilatada, tipicamente deslocada para o quadrante superior esquerdo ou região central — diferente do volvo de sigmoide, que costuma apontar para o quadrante superior direito.'),
            TIP('Truque para não confundir os dois volvos: SIGMOIDE aponta para cima e para a DIREITA (sinal do "grão de café" clássico); CECO desloca-se para o centro/ESQUERDA do abdome, muitas vezes mostrando o sinal do "grão de café invertido" ou até uma configuração em "bola de futebol americano".'),
          ],
        },
        {
          id: 'm4-perfurativo', titulo: 'Abdome agudo perfurativo',
          blocks: [
            P('Os achados clínicos clássicos da perfuração são: dor súbita, abdome "em tábua" (rigidez de defesa generalizada) e o sinal de Jobert (timpanismo à percussão da área hepática, porque o ar livre se acumula entre o fígado e a parede abdominal). Uma história de úlcera péptica ou uso crônico de AINEs aponta fortemente para perfuração gástrica/duodenal.'),
            P('Praticamente qualquer víscera oca pode perfurar: esôfago (com pneumomediastino associado), estômago, delgado, cólon e até a vesícula biliar.'),
            F('modulo4/p076_x411.webp', 'Pneumoperitônio na radiografia de tórax em ortostase: ar livre em crescente sob a hemicúpula diafragmática direita — o achado mais clássico de perfuração de víscera oca.'),
            F('modulo4/p076_x412.webp', 'Pneumoperitônio na TC: bolhas de ar extraluminal livre na cavidade peritoneal, fora do trajeto esperado das alças intestinais.'),
            F('modulo4/p076_x413.webp', 'Úlcera gástrica perfurada: defeito na parede gástrica com extravasamento de ar/conteúdo, visível na TC com contraste oral.'),
            F('modulo4/p076_x414.webp', 'Corpo estranho perfurante: objeto radiopaco (ou de densidade distinta) atravessando a parede intestinal, causando a perfuração.'),
            F('modulo4/p076_x415.webp', 'Hérnia estrangulada: alça intestinal encarcerada com sinais de sofrimento vascular (espessamento parietal, densificação da gordura), risco iminente de perfuração se não corrigida.'),
            F('modulo4/p076_x416.webp', 'Diverticulite/apendicite aguda perfurada: coleção de ar extraluminal associada ao foco inflamatório primário — mostra que a perfuração pode ser complicação de praticamente qualquer processo inflamatório abdominal não tratado a tempo.'),
            P('A conduta segue o tratamento cirúrgico de urgência (laparoscopia ou laparotomia), dirigido à causa: ulcerorrafia, apendicectomia, sigmoidectomia — sempre associado a jejum, correção hidroeletrolítica e antibioticoterapia.'),
          ],
        },
        {
          id: 'm4-isquemia', titulo: 'Isquemia mesentérica / abdome vascular',
          blocks: [
            P('O abdome agudo vascular tem 4 mecanismos principais: embólico (a causa mais clássica é fibrilação atrial), trombótico arterial (aterosclerose, doença arterial periférica), trombose venosa (cirrose, trombofilias) e não oclusivo (baixo fluxo sistêmico, sem obstrução mecânica de vaso).'),
            TIP('Decoreba de prova: na suspeita de abdome agudo vascular, o exame inicial de escolha é sempre a AngioTC — não há tempo a perder com outros métodos mais lentos.'),
            F('modulo4/p078_x422.webp', 'Fluxograma dos mecanismos de isquemia mesentérica: embólica, trombótica arterial, trombose venosa, mista (estrangulamento/volvo) e não oclusiva.'),
            P('Os achados de imagem se dividem em sinais indiretos (mais precoces, menos específicos) e diretos (mais tardios, indicam maior gravidade).'),
            F('modulo4/p079_x427.webp', 'Espessamento parietal do intestino: sinal indireto e inespecífico de sofrimento de alça — pode aparecer também em processos inflamatórios/infecciosos.'),
            F('modulo4/p079_x429.webp', 'Densificação da gordura mesentérica adjacente à alça comprometida — outro sinal indireto de sofrimento local.'),
            F('modulo4/p079_x431.webp', 'Oclusão vascular direta: trombo visível dentro da artéria ou veia mesentérica na angio-TC — sinal DIRETO e mais específico.'),
            F('modulo4/p079_x433.webp', 'Hipocontrastação das alças: a parede intestinal isquêmica não realça normalmente após contraste — sinal direto de sofrimento vascular já instalado.'),
            F('modulo4/p079_x435.webp', 'Pneumatose intestinal: ar dentro da própria parede do intestino — sinal DIRETO e GRAVE, já indicando necrose de parede em curso.'),
            F('modulo4/p079_x437.webp', 'Outro exemplo de pneumatose intestinal, associado a gás no sistema porta — combinação que costuma indicar necrose transmural extensa.'),
            TIP('Hierarquia de gravidade: espessamento parietal e densificação da gordura são "alerta amarelo"; oclusão vascular direta e hipocontrastação já são "alerta laranja"; pneumatose intestinal (principalmente com gás portal) é "alerta vermelho" — necrose já instalada.'),
            P('Manifestações clínicas: dor abdominal intensa (classicamente desproporcional ao exame físico), podendo evoluir com sangramento digestivo, peritonite e acidose metabólica (hiperlactatemia).'),
            F('modulo4/p080_x442.webp', 'Aneurisma de aorta abdominal roto: dilatação aórtica com extravasamento de sangue para o retroperitônio — emergência cirúrgica vascular clássica que também se apresenta como abdome agudo vascular.'),
          ],
        },
        {
          id: 'm4-pancreatite', titulo: 'Pancreatite aguda',
          blocks: [
            P('O diagnóstico segue os critérios de Atlanta 2012: são necessários pelo menos 2 de 3 — dor característica, amilase ou lipase elevadas (geralmente >3x o limite superior da normalidade), e achados de imagem compatíveis.'),
            TIP('Atenção que costuma pegar quem está começando: a imagem pode estar completamente NORMAL nas primeiras 48-72 horas de evolução — não espere a TC "confirmar" para começar o tratamento clínico se a clínica e o laboratório já fecham o diagnóstico.'),
            P('A gravidade se classifica em leve (sem falência orgânica nem complicação local), moderada (falência orgânica transitória <48h e/ou complicação local) e grave (falência orgânica persistente >48h).'),
            P('O manejo geral é: analgesia, hidratação e correção hidroeletrolítica, jejum inicial (idealmente <48h), liberando a dieta assim que houver melhora da dor, ausência de vômitos e retorno do apetite. Antibiótico só entra se houver infecção CONFIRMADA — não é rotina.'),
            F('modulo4/p082_x449.webp', 'Pancreatite edematosa (intersticial): parênquima pancreático com realce homogêneo preservado após contraste — forma mais leve e mais comum.'),
            F('modulo4/p082_x451.webp', 'Pancreatite necrosante: áreas do parênquima SEM realce após contraste — o tecido pancreático já morreu naquela região, forma mais grave.'),
            F('modulo4/p082_x455.webp', 'Coleção líquida peripancreática aguda: acúmulo de líquido ao redor do pâncreas nas primeiras 4 semanas de evolução, ainda sem parede definida.'),
            F('modulo4/p082_x458.webp', 'Pseudocisto pancreático: a mesma coleção líquida, agora organizada com parede definida — só recebe esse nome após 4 semanas de evolução.'),
            F('modulo4/p082_x461.webp', 'Necrose delimitada (WON — walled-off necrosis): coleção necrótica organizada, com parede definida, após 4 semanas — o equivalente "necrótico" do pseudocisto.'),
            TIP('Linha do tempo para não confundir as coleções: ANTES de 4 semanas → "aguda" (líquida ou necrótica); DEPOIS de 4 semanas → "organizada com parede" (pseudocisto = líquida; WON = necrótica). É basicamente a mesma coleção, só que descrita em dois momentos diferentes da evolução.'),
          ],
        },
      ],
    },

    // =========================================================================
    // MÓDULO 5 — RADIOLOGIA DE ABDOME — VIAS URINÁRIAS
    // =========================================================================
    {
      id: 5, nome: 'Radiologia de Abdome — Vias urinárias', resumo: 'Lesões renais, nefrolitíase e cólica renal.',
      topicos: [
        {
          id: 'm5-alteracoes-renais', titulo: 'Atendimento às alterações renais',
          blocks: [
            P('A primeira pergunta diante de uma alteração da função renal é: isso é IRA (injúria renal aguda) ou DRC (doença renal crônica)? Se a etiologia não estiver clara, investigue sistematicamente causas pré-renais (hipovolemia), renais (sepse, nefrotóxicos) e pós-renais (obstrução) — estas últimas exigem exame de imagem para serem excluídas.'),
            P('Achados que sugerem cronicidade (DRC): anemia, hiperparatireoidismo secundário, e — na ultrassonografia — perda da diferenciação corticomedular, muitas vezes com rins reduzidos de tamanho.'),
            TIP('A USG de rins é o exame de TRIAGEM inicial para causas obstrutivas de injúria renal — rápida, sem radiação e sem necessidade de contraste, ideal mesmo em paciente com função renal já comprometida.'),
          ],
        },
        {
          id: 'm5-lesoes-renais', titulo: 'Lesões renais (TC x RM x USG)',
          blocks: [
            P('Este tópico é um exercício de comparação direta entre os 4 métodos de imagem — a mesma lesão renal muda de aparência conforme o método usado, e reconhecer isso em qualquer um deles é a habilidade central aqui.'),
            P('Um cisto renal SIMPLES tem características bem definidas em cada método: na TC sem contraste é arredondado, homogêneo e hipoatenuante (0 a 20 unidades Hounsfield); não realça após contraste; na RM em T2 aparece com hipersinal homogêneo (bem "brilhante"); e na USG é anecoico (preto), com reforço acústico posterior — a parede é sempre fina, sem septos ou nódulos.'),
            F('modulo5/p085_x489.webp', 'Cisto renal simples na TC sem contraste: lesão arredondada, homogênea, hipoatenuante, com parede imperceptível.'),
            F('modulo5/p085_x490.webp', 'O mesmo tipo de cisto na TC com contraste: repare que NÃO há realce algum — o cisto simples permanece igual, sem captar contraste.'),
            F('modulo5/p085_x491.webp', 'Cisto renal simples na ressonância em T2: hipersinal homogêneo (aparece bem claro/brilhante), característico de conteúdo líquido simples.'),
            F('modulo5/p085_x492.webp', 'Cisto renal simples na ultrassonografia: lesão anecoica (totalmente preta), arredondada, com reforço acústico posterior — o "carimbo" ultrassonográfico de líquido simples.'),
            P('Já um cisto COMPLEXO muda completamente a conduta — de "só observar" para "investigar/considerar cirurgia" — quando aparecem: septos espessos (em vez de finos), calcificações grosseiras, um nódulo sólido mural, ou qualquer realce após contraste.'),
            F('modulo5/p085_x493.webp', 'Cisto renal complexo: septos espessos dividindo a lesão em compartimentos — um dos critérios que eleva a suspeita de malignidade.'),
            F('modulo5/p085_x494.webp', 'Outro exemplo de cisto complexo, agora com calcificação grosseira na parede — critério adicional de complexidade.'),
            F('modulo5/p085_x495.webp', 'Nódulo sólido na parede do cisto: o achado mais preocupante — um componente sólido que capta contraste dentro de uma lesão predominantemente cística exige investigação para malignidade.'),
            F('modulo5/p085_x498.webp', 'Comparação final lado a lado: parênquima renal normal ao redor de uma lesão complexa, reforçando o contraste entre tecido são e a lesão suspeita.'),
            TIP('Regra prática (baseada na classificação de Bosniak, citada implicitamente aqui): septo FINO = provavelmente benigno; septo ESPESSO, calcificação GROSSEIRA ou nódulo REALÇANTE = suspeito, investigar mais.'),
            P('Outras condições renais importantes neste bloco: pielonefrite aguda (inflamação/infecção do parênquima renal), doença renal crônica (rins reduzidos, com perda da diferenciação corticomedular) e infarto renal (área em cunha, de base cortical, sem realce após contraste — o equivalente renal do infarto pulmonar).'),
            F('modulo5/p086_x503.webp', 'Pielonefrite aguda na TC: áreas em cunha de menor realce no parênquima renal, com densificação da gordura perirrenal — reflexo do processo infeccioso/inflamatório.'),
            F('modulo5/p086_x505.webp', 'Doença renal crônica na ultrassonografia: rim reduzido de tamanho, com perda da diferenciação normal entre córtex e medula.'),
            F('modulo5/p086_x507.webp', 'Infarto renal na TC com contraste: área em cunha, de base cortical e ápice voltado para o hilo, sem nenhum realce — o parênquima daquele território simplesmente "não pega" contraste.'),
            F('modulo5/p086_x509.webp', 'Outro exemplo de infarto renal, mostrando o contraste nítido entre a área infartada (escura) e o parênquima normal ao redor (realçado).'),
          ],
        },
        {
          id: 'm5-nefrolitiase', titulo: 'Nefrolitíase (tipos de cálculo)',
          blocks: [
            P('A nefrolitíase é mais comum em homens que em mulheres (proporção aproximada 3:1), com incidência de 3 a 10% na população — fatores de risco incluem baixo débito urinário e baixo consumo de água.'),
            P('Nem todo cálculo se comporta igual nos exames de imagem, e isso muda completamente a estratégia diagnóstica: oxalato de cálcio é o mais comum e é radiopaco independentemente do pH urinário; fosfato magnesiano (estruvita) forma cálculos coraliformes em pH básico; fosfato de cálcio/hidroxiapatita também aparece em pH básico; ácido úrico é TRANSPARENTE no Rx simples mas visível na TC; cistina aparece em pH ácido.'),
            TIP('Decoreba essencial de prova: cálculos por inibidores de protease (como o indinavir, usado em HIV) são INVISÍVEIS até na tomografia — se a clínica é fortemente sugestiva de cólica renal mas a TC não mostra cálculo algum em paciente usando essa classe de medicamento, pense nesse diagnóstico.'),
            P('Os locais clássicos de impactação do cálculo ureteral, do mais proximal ao mais distal, são: junção ureteropélvica, cruzamento com os vasos ilíacos, e junção ureterovesical (o ponto mais estreito de todo o trajeto).'),
            F('modulo5/p088_x518.webp', 'Cálculo renal na radiografia simples: imagem radiopaca sobrepondo-se à sombra renal — só é visível se o cálculo for radiopaco (oxalato/fosfato de cálcio, estruvita).'),
            F('modulo5/p088_x520.webp', 'Cálculo renal na TC sem contraste (o método mais sensível para qualquer tipo de cálculo, exceto os por inibidor de protease): imagem hiperdensa dentro do sistema coletor.'),
            F('modulo5/p088_x522.webp', 'Cálculo ureteral distal na TC: pequena imagem hiperdensa no trajeto do ureter, próxima à junção ureterovesical — repare na dilatação a montante.'),
            F('modulo5/p088_x524.webp', 'Cálculo coraliforme na radiografia: cálculo que preenche todo o sistema coletor, moldando-se ao formato dos cálices — quase sempre de estruvita, associado a infecção urinária de repetição.'),
            F('modulo5/p088_x526.webp', 'Hidronefrose: dilatação do sistema coletor renal secundária à obstrução distal pelo cálculo — o rim "incha" a montante do obstáculo.'),
            F('modulo5/p088_x528.webp', 'Cálculo vesical na radiografia: imagem radiopaca na topografia da bexiga.'),
            F('modulo5/p088_x530.webp', 'Cálculo renal na ultrassonografia: foco hiperecogênico com sombra acústica posterior — o "carimbo" ultrassonográfico de qualquer estrutura calcificada.'),
            F('modulo5/p088_x532.webp', 'Cálculo ureteral visto de outro ângulo, evidenciando a relação com a dilatação ureteral proximal.'),
            F('modulo5/p088_x534.webp', 'Cálculo vesical na TC, confirmando a densidade calcificada e a localização exata dentro da bexiga.'),
          ],
        },
        {
          id: 'm5-colica', titulo: 'Cólica renal e pielonefrite obstrutiva',
          blocks: [
            P('A clínica clássica da cólica renal é: dor lombar de início súbito, migratória (irradiando para escroto/vulva), náuseas e vômitos, disúria, polaciúria e hematúria.'),
            F('modulo5/p089_x538.webp', 'Fluxograma clínico: cólica renal simples × pielonefrite obstrutiva — a diferença central é a presença de febre, hipotensão, taquicardia e sinal de Giordano positivo no segundo grupo.'),
            TIP('Pielonefrite OBSTRUTIVA (cálculo + infecção) é uma verdadeira urgência urológica — antibiótico sozinho NÃO resolve, porque o sistema está obstruído e a infecção não consegue ser drenada. É preciso desobstruir (cateter duplo J ou nefrostomia) além de tratar a infecção.'),
            P('O tratamento cirúrgico do cálculo depende de tamanho e localização: cálculos pequenos (menos de 5mm no terço médio/superior, ou menos de 10mm no terço inferior) costumam ser candidatos à eliminação espontânea com seguimento; cálculos maiores exigem ureterolitotripsia (semirrígida ou flexível), litotripsia extracorpórea (LECO) ou nefrolitotripsia percutânea, conforme o tamanho.'),
            P('O duplo J entra quando é preciso desobstruir temporariamente o sistema (por exemplo, numa pielonefrite obstrutiva associada) antes de tratar o cálculo definitivamente.'),
          ],
        },
      ],
    },

    // =========================================================================
    // MÓDULO 6 — RADIOLOGIA NO TRAUMA
    // =========================================================================
    {
      id: 6, nome: 'Radiologia no Trauma', resumo: 'FAST, TCE, trauma torácico/abdominal, MESS e classificação de fraturas.',
      topicos: [
        {
          id: 'm6-atendimento', titulo: 'Atendimento ao trauma (xABCDE) e protocolo FAST',
          blocks: [
            P('A sequência xABCDE organiza o atendimento inicial ao trauma na ordem de prioridade de vida: X — hemorragias exsanguinantes (compressão direta ou torniquete, ANTES até de checar a via aérea, se o sangramento for maciço); A — via aérea com controle da coluna cervical; B — ventilação e respiração; C — circulação com controle de hemorragia (acesso venoso calibroso, reposição volêmica, busca ativa de sangramento interno via FAST/TC/cirurgia); D — déficit neurológico; E — exposição completa e controle de hipotermia.'),
            F('modulo6/p091_x544.webp', 'Ilustração da sequência xABCDE aplicada ao atendimento inicial do trauma.'),
            P('O protocolo FAST avalia 4 janelas ecográficas em busca de líquido livre (sangue) na cavidade: pericárdica, hepatorrenal (espaço de Morison — o ponto mais sensível para líquido livre em decúbito dorsal), esplenorrenal e suprapúbica (fundo de saco de Douglas).'),
            F('modulo6/p092_x549.webp', 'Janela pericárdica NEGATIVA no FAST: sem líquido entre as folhetos pericárdicos.'),
            F('modulo6/p092_x551.webp', 'Janela pericárdica POSITIVA: coleção líquida (sangue) visível ao redor do coração — sugere lesão cardíaca/pericárdica no trauma.'),
            F('modulo6/p092_x552.webp', 'Janela hepatorrenal (espaço de Morison) NEGATIVA: interface limpa entre fígado e rim direito, sem líquido livre.'),
            F('modulo6/p092_x554.webp', 'Janela hepatorrenal POSITIVA: faixa anecoica (líquido) separando o fígado do rim direito.'),
            F('modulo6/p092_x555.webp', 'Janela esplenorrenal NEGATIVA: interface limpa entre baço e rim esquerdo.'),
            F('modulo6/p092_x557.webp', 'Janela esplenorrenal POSITIVA: líquido livre entre baço e rim esquerdo — sugere lesão esplênica no contexto de trauma.'),
            TIP('Por que o espaço de Morison é o mais sensível: em decúbito dorsal, é o ponto mais "baixo" da cavidade peritoneal superior, onde o líquido livre se acumula primeiro por gravidade — por isso é sempre avaliado antes das outras janelas no protocolo.'),
            P('O E-FAST estende a avaliação ao tórax, detectando pneumotórax (pela ausência do deslizamento pleural/sinal da praia) e hemotórax, além de conseguir identificar fratura de pelve associada.'),
            F('modulo6/p093_x562.webp', 'Janela suprapúbica NEGATIVA: fundo de saco de Douglas livre, sem coleção líquida.'),
            F('modulo6/p093_x564.webp', 'Janela suprapúbica POSITIVA: líquido livre no fundo de saco de Douglas — o ponto mais dependente da pelve.'),
            F('modulo6/p093_x566.webp', 'Fratura de pelve identificada durante o exame — achado associado que reforça a suspeita de trauma de alta energia com sangramento retroperitoneal.'),
            F('modulo6/p093_x567.webp', 'E-FAST torácico: hemotórax — coleção líquida acima do diafragma, no espaço pleural.'),
            F('modulo6/p093_x569.webp', 'E-FAST torácico: pneumotórax — ausência do deslizamento pleural normal (sinal do código de barras no modo M, como já visto no módulo 2).'),
          ],
        },
        {
          id: 'm6-tce', titulo: 'Trauma cranioencefálico (Glasgow, hematomas)',
          blocks: [
            P('A escala de coma de Glasgow soma 3 componentes: abertura ocular (1 a 4 pontos), melhor resposta verbal (1 a 5) e melhor resposta motora (1 a 6) — o total varia de 3 a 15 e classifica o TCE em leve (13-15), moderado (9-12) e grave (≤8).'),
            F('modulo6/p095_x575.webp', 'Tabela completa da escala de coma de Glasgow, com a pontuação de cada componente e a classificação final em leve/moderado/grave.'),
            P('No TCE leve, as indicações de TC de crânio incluem: Glasgow <15 por mais de 2 horas, suspeita de fratura (exposta, com afundamento, ou de base de crânio — sinais como hemotímpano, "olhos de guaxinim", otorreia/rinorreia ou sinal de Battle), mais de 2 episódios de vômito, idade acima de 65 anos, uso de anticoagulante, perda de consciência por mais de 5 minutos, amnésia retrógrada maior que 30 minutos, ou mecanismo de alta energia.'),
            P('Vale conhecer os espaços meníngeos na ordem, do osso para dentro: epidural → dura-máter → subdural → aracnoide → espaço subaracnóideo → pia-máter. Isso ajuda a entender por que cada tipo de hematoma tem um formato característico na TC.'),
            F('modulo6/p096_x579.webp', 'Fratura de crânio com hematoma subgaleal associado (coleção entre o couro cabeludo e o osso) — achado externo que já levanta suspeita de trauma significativo.'),
            F('modulo6/p096_x580.webp', 'Outro exemplo de fratura craniana na TC (janela óssea) — repare na linha de fratura nítida atravessando a cortical.'),
            F('modulo6/p096_x582.webp', 'Hematoma EPIDURAL: coleção biconvexa (em forma de lente), hiperdensa, que NÃO ultrapassa as suturas cranianas — geralmente por lesão da artéria meníngea média, associado a fratura temporal.'),
            F('modulo6/p096_x584.webp', 'Hematoma SUBDURAL: coleção em forma de crescente (côncavo-convexa), que PODE ultrapassar as suturas cranianas — por ruptura de veias-ponte, mais comum em idosos e etilistas (cérebro mais atrófico, veias mais tracionadas).'),
            F('modulo6/p096_x586.webp', 'Hemorragia subaracnoide traumática: sangue hiperdenso preenchendo os sulcos e cisternas da base — diferente da HSA aneurismática, mas com aparência semelhante na TC.'),
            F('modulo6/p096_x587.webp', 'Lesão axonal difusa: pequenos focos hemorrágicos na transição substância branca-cinzenta, típicos de mecanismo de aceleração-desaceleração (ex.: acidente automobilístico em alta velocidade) — muitas vezes a TC inicial subestima a gravidade real, e a RM é mais sensível.'),
            TIP('Truque visual clássico para nunca mais confundir epidural com subdural: EPIdural = formato de LENTE (biconvexo), fica "preso" entre as suturas; SUBdural = formato de LUA CRESCENTE (côncavo-convexo), "escorre" livremente e pode cruzar as suturas.'),
            P('As indicações cirúrgicas mais cobradas: hematoma epidural com volume acima de 30mL, ou Glasgow menor que 9 associado a anisocoria; hematoma subdural agudo com mais de 10mm de espessura ou desvio de linha média maior que 5mm; sangramentos intracerebrais com efeito de massa, hidrocefalia associada ou volume acima de 50cm³.'),
            P('No manejo do TCE grave, os alvos fisiológicos a decorar são: PAS acima de 100-110, PAM acima de 80-90, glicemia entre 140-180, normocapnia (PaCO2 em torno de 35), saturação acima de 95%, cabeceira elevada a 30°, combate ativo à febre, monitorização da PIC (alvo de 5-15mmHg) e correção de qualquer anticoagulação/antiagregação em uso.'),
          ],
        },
        {
          id: 'm6-toracico', titulo: 'Trauma torácico',
          blocks: [
            P('Cada lesão torácica traumática tem um "cartão de visita" clínico próprio, que vale decorar em pares (achado → lesão):'),
            P('Lesão de grandes vasos/aorta: hipotensão, choque refratário, pulso paradoxal, ausência de pulsos periféricos, sopro novo — exige controle cirúrgico ou endovascular emergencial (ex.: REBOA, endoprótese).'),
            P('Pneumotórax e hemotórax: dispneia com murmúrio vesicular abolido — hipertimpanismo aponta para pneumotórax, macicez à percussão aponta para hemotórax. Tratamento: descompressão imediata se hipertensivo, e drenagem torácica em ambos os casos.'),
            P('Contusão/laceração pulmonar: dispneia, estertores, hipoxemia — tratamento é suporte ventilatório, oxigenoterapia e analgesia (não é cirúrgico na maioria dos casos).'),
            P('Lesão diafragmática: dispneia associada a dor abdominal/torácica, abdome escavado (conteúdo abdominal herniado para o tórax) e murmúrio vesicular diminuído na base — exige correção cirúrgica, por toracoscopia ou laparotomia conforme o lado e o mecanismo.'),
            P('Lesão cardíaca/pericárdica: hipotensão, bulhas abafadas, turgência jugular, pulso paradoxal — sugestivo de tamponamento cardíaco traumático, tratado com toracotomia emergencial ou janela pericárdica.'),
            F('modulo6/p098_x595.webp', 'Hematoma mediastinal na TC: alargamento e densificação do mediastino por sangramento — achado inespecífico que dispara investigação de lesão de grandes vasos.'),
            F('modulo6/p098_x597.webp', 'Pneumotórax traumático: hipertransparência sem trama vascular, com linha pleural visível, no contexto de trauma torácico.'),
            F('modulo6/p098_x598.webp', 'Hemotórax: opacidade basal por acúmulo de sangue no espaço pleural — no trauma, sempre pensar em drenagem precoce para monitorar o débito e decidir sobre toracotomia.'),
            F('modulo6/p098_x600.webp', 'Pseudoaneurisma de aorta pós-traumático: dilatação sacular irregular da parede aórtica — achado de altíssima gravidade que exige intervenção endovascular/cirúrgica urgente.'),
            F('modulo6/p098_x602.webp', 'Pneumotórax hipertensivo pós-traumático: desvio do mediastino associado ao colapso pulmonar — mesmos princípios do módulo 2, agora no contexto de trauma.'),
            F('modulo6/p098_x604.webp', 'Contusão pulmonar: área de opacidade em vidro fosco/consolidação que NÃO respeita os limites anatômicos (lobos/segmentos) — diferente de uma pneumonia, que costuma ser mais localizada a um segmento/lobo.'),
            F('modulo6/p098_x606.webp', 'Derrame pericárdico traumático (hemopericárdio): coleção líquida ao redor do coração — no trauma, qualquer derrame pericárdico deve ser tratado como potencial tamponamento até prova em contrário.'),
            F('modulo6/p098_x608.webp', 'Pneumomediastino traumático: ar dissecando os planos mediastinais — no trauma, sempre investigar lesão de via aérea ou esôfago associada.'),
            F('modulo6/p098_x610.webp', 'Laceração pulmonar: cavidade preenchida por ar e/ou sangue dentro do parênquima pulmonar, formando o chamado "pneumatocele traumático" ou "hematoma pulmonar".'),
          ],
        },
        {
          id: 'm6-abdominal', titulo: 'Trauma abdominal (fígado, baço, rim, bexiga)',
          blocks: [
            P('A primeira bifurcação de conduta: paciente instável com abdome cirúrgico (FAST positivo ou suspeita clínica forte) vai DIRETO para cirurgia. Paciente estável faz TC de abdome com contraste EV para orientar a conduta com mais precisão.'),
            P('No trauma hepático e esplênico, o achado-chave na TC é o "blush" arterial — uma área de extravasamento ativo de contraste que indica sangramento em curso. Presença de blush direciona para angioembolização; ausência de blush permite tentar tratamento conservador — mas falha do conservador ou instabilidade hemodinâmica sempre indicam cirurgia.'),
            F('modulo6/p101_x620.webp', 'Laceração hepática na TC: linha irregular hipoatenuante cruzando o parênquima hepático, representando a solução de continuidade do tecido.'),
            F('modulo6/p101_x621.webp', 'Detalhe de um "blush" arterial no fígado — o ponto de extravasamento ativo de contraste, mais brilhante que o parênquima ao redor.'),
            F('modulo6/p101_x623.webp', 'Laceração esplênica com sangramento ativo: mesmo princípio do "blush", agora no baço — órgão especialmente vascularizado e propenso a sangramento importante no trauma.'),
            F('modulo6/p101_x625.webp', 'Pneumoperitônio pós-traumático: ar livre na cavidade, sugerindo perfuração de víscera oca associada ao trauma abdominal.'),
            F('modulo6/p101_x626.webp', 'Desvascularização renal: ausência completa de realce em todo o rim após contraste — geralmente por lesão do pedículo vascular renal, achado gravíssimo.'),
            F('modulo6/p101_x627.webp', 'Laceração renal: solução de continuidade no parênquima renal, classificada por graus de gravidade (I a V) conforme profundidade e envolvimento do sistema coletor/hilo.'),
            F('modulo6/p101_x629.webp', 'Laceração pancreática: lesão através da glândula pancreática — a localização em relação à veia mesentérica superior (VMS) é o que define a conduta cirúrgica.'),
            F('modulo6/p101_x631.webp', 'Rotura vesical intraperitoneal: extravasamento de contraste para dentro da cavidade peritoneal livre — urina é irritante peritoneal, exigindo cirurgia (laparotomia + rafia).'),
            F('modulo6/p101_x632.webp', 'Rotura vesical extraperitoneal: extravasamento de contraste confinado ao espaço perivesical, sem entrar na cavidade peritoneal — tratada de forma conservadora, apenas com sonda vesical de demora.'),
            P('No trauma renal, cálculos práticos de conduta: lesões grau IV podem ser tratadas com angioembolização; grau V geralmente exige nefrectomia. Hematoma perirrenal pulsátil/em expansão e lesões graus IV-V são indicação cirúrgica.'),
            TIP('Diferença crucial entre as duas roturas vesicais: INTRAperitoneal (urina entra na cavidade → peritonite → cirurgia obrigatória) × EXTRAperitoneal (urina fica contida → sonda vesical por ~14 dias resolve, sem cirurgia). Essa distinção é frequentemente cobrada em prova.'),
          ],
        },
        {
          id: 'm6-mess', titulo: 'Escore MESS e classificação de fraturas',
          blocks: [
            P('O escore MESS (Mangled Extremity Severity Score) ajuda a decidir entre tentar salvar um membro gravemente traumatizado ou partir direto para amputação, somando 4 grupos de pontuação:'),
            P('Grupo de energia do trauma (0 a 4 pontos): de ferimento por arma branca/fratura fechada simples (baixa energia) até esmagamento maciço por trem/madeira (energia máxima). Grupo de choque (0 a 2): de normotenso estável até hipotensão que só responde à reposição no centro cirúrgico. Grupo de isquemia (1 a 4, dobrado se o tempo de isquemia ultrapassar 6 horas): de pulso presente e sem sinais de isquemia até membro frio, paralisado, sem qualquer pulso. Grupo etário (0 a 2): quanto mais velho o paciente, maior a pontuação.'),
            TIP('Interpretação final: MESS ≥7 sugere alta chance de necessidade de amputação; MESS <7 sugere possível salvamento do membro. Mas é só uma FERRAMENTA DE APOIO — a decisão final sempre depende do julgamento clínico, do estado geral do paciente e dos recursos disponíveis (equipe de microcirurgia, UTI etc).'),
            P('Toda suspeita de fratura exige, no mínimo, duas incidências (geralmente AP e lateral, às vezes com oblíqua adicional), e é obrigatório avaliar as articulações proximal E distal ao traço de fratura — uma fratura de antebraço, por exemplo, exige radiografia incluindo o punho e o cotovelo.'),
            P('Para classificar qualquer fratura, avalie 4 características: (1) completa × incompleta (esta última mais comum em crianças, cujo osso é mais flexível); (2) o traço — transverso, oblíquo, espiral ou fragmentado; (3) o acometimento articular — extra-articular, articular parcial ou articular completa; (4) o desvio dos fragmentos — sem ou com desvio.'),
          ],
        },
      ],
    },

    // =========================================================================
    // MÓDULO 7 — NEURORRADIOLOGIA
    // =========================================================================
    {
      id: 7, nome: 'Neurorradiologia', resumo: 'Cefaleia, HSA, AVC, hidrocefalia, herniações e infecções do SNC.',
      topicos: [
        {
          id: 'm7-cefaleia', titulo: 'Atendimento à cefaleia (sinais de alarme)',
          blocks: [
            P('Diante de qualquer cefaleia, a primeira tarefa é rastrear sinais de alarme que apontam para causa SECUNDÁRIA (precisa de imagem) em vez de primária (não precisa, na maioria dos casos).'),
            TIP('Sinais de alarme que obrigam investigação por imagem: mudança de padrão ou piora progressiva/refratária; início SÚBITO em "trovoada" (thunderclap) ou "a pior dor da vida"; sintomas sistêmicos (febre, rigidez de nuca, emagrecimento, imunossupressão, gestação); sinais neurológicos focais, papiledema ou convulsão; piora com manobra de Valsalva/tosse/espirro/esforço; início após os 40-50 anos de idade sem história prévia.'),
            P('Cada etiologia secundária tem sua "pista" característica: hematoma subdural (uso de anticoagulante, trauma, rebaixamento de consciência), hipertensão intracraniana idiopática/pseudotumor cerebral (piora ortostática, Valsalva, zumbido pulsátil, papiledema), hemorragia intraparenquimatosa (sonolência, déficit focal), tumor (início após os 50 anos), meningite (imunossupressão, febre, sinais meníngeos), HSA aneurismática (thunderclap + deterioração neurológica progressiva), dissecção carotídea (síndrome de Horner + sintomas de AVC), trombose venosa cerebral (uso de anticoncepcional oral + sinais de hipertensão intracraniana).'),
            P('Já entre as cefaleias PRIMÁRIAS, o diagnóstico diferencial mais cobrado compara três: enxaqueca (mulher de 30-40 anos, unilateral e pulsátil, dura de 4 a 72 horas, com náusea e foto/fonofobia, com ou sem aura), tensional (bilateral, em aperto/opressiva, dura de 30 minutos a 7 dias, sem náusea significativa) e em salvas (homem de 20-40 anos, unilateral periorbitária, MUITO intensa, dura de 15 a 180 minutos e pode se repetir várias vezes ao dia, com sintomas autonômicos ipsilaterais como lacrimejamento e rinorreia).'),
            TIP('Macete "3 personagens": Enxaqueca é a "dor da mulher que quer ficar quieta no escuro" (piora com luz/som/esforço). Tensional é a "faixa apertando a cabeça dos dois lados", sem grandes sintomas associados. Em salvas é a "dor mais curta e mais intensa, só de um lado do olho, no homem" — literalmente descrita como uma das piores dores que existem.'),
          ],
        },
        {
          id: 'm7-hsa', titulo: 'Hemorragia subaracnóidea e trombose venosa cerebral',
          blocks: [
            P('A hemorragia subaracnóidea (HSA) aneurismática se apresenta com cefaleia thunderclap (início súbito, "a pior dor da vida"), sinais meníngeos e possível deterioração neurológica progressiva. A TC de crânio sem contraste é sempre o primeiro exame — mostra sangue hiperdenso preenchendo os sulcos corticais e as cisternas da base.'),
            F('modulo7/p109_x653.webp', 'Hemorragia subaracnóidea na TC: material hiperdenso (branco) preenchendo os sulcos e cisternas da base do crânio, ao redor do polígono de Willis — onde a maioria dos aneurismas se origina.'),
            F('modulo7/p109_x654.webp', 'Outro corte de HSA, mostrando a extensão do sangramento pelas cisternas basais e fissura sylviana.'),
            P('Já a trombose venosa cerebral também pode se apresentar como cefaleia thunderclap — um importante diagnóstico diferencial da HSA. O fator de risco clássico de prova é o uso de anticoncepcional oral, e o quadro cursa com sinais de hipertensão intracraniana (papiledema, alterações visuais).'),
            F('modulo7/p109_x656.webp', 'Trombose venosa cerebral na angio-TC/RM venosa: falha de enchimento (ausência de fluxo) dentro de um seio venoso cerebral, geralmente o seio sagital superior.'),
            F('modulo7/p109_x658.webp', 'O "sinal do delta vazio" — achado clássico da trombose do seio sagital superior, em que o contraste circunda o trombo central sem realçá-lo, formando um triângulo com centro escuro.'),
          ],
        },
        {
          id: 'm7-disseccao-hii', titulo: 'Dissecção arterial e hipertensão intracraniana idiopática',
          blocks: [
            P('A dissecção de artéria carótida ou vertebral deve ser suspeitada em paciente jovem com cefaleia associada a síndrome de Horner ipsilateral (ptose, miose, anidrose), sintomas de AVC isquêmico ou déficit de pares cranianos.'),
            F('modulo7/p110_x664.webp', 'Dissecção arterial na angio-TC: espessamento da parede do vaso com estreitamento excêntrico do lúmen — o "hematoma de parede" característico da dissecção.'),
            F('modulo7/p110_x665.webp', 'Outro achado de dissecção, agora evidenciando o "sinal do crescente" — hematoma intramural em forma de meia-lua ao redor do lúmen residual.'),
            P('Já a hipertensão intracraniana idiopática (também chamada pseudotumor cerebral) é mais comum em mulheres jovens obesas, e cursa com cefaleia ortostática, piora com manobra de Valsalva, zumbido pulsátil, papiledema e déficits visuais. A imagem, aqui, serve principalmente para EXCLUIR causas secundárias de hipertensão intracraniana (massa, hidrocefalia, trombose venosa) — não existe um achado positivo único que "feche" o diagnóstico.'),
            F('modulo7/p110_x666.webp', 'RM em paciente com hipertensão intracraniana idiopática: sinais indiretos como achatamento da parte posterior do globo ocular e distensão da bainha do nervo óptico.'),
            F('modulo7/p110_x667.webp', 'Outro achado indireto associado: sela túrcica "vazia" (parcialmente preenchida por líquor) — encontrado com frequência nesses pacientes.'),
          ],
        },
        {
          id: 'm7-tumores', titulo: 'Lesões tumorais e sinusopatia',
          blocks: [
            P('O meningioma é o tumor extra-axial mais comum do sistema nervoso central — nasce das meninges (não do próprio tecido cerebral), geralmente bem delimitado, com uma base ampla de implantação na dura-máter e realce homogêneo e intenso após contraste.'),
            F('modulo7/p111_x670.webp', 'Meningioma na RM com contraste: massa extra-axial bem delimitada, com ampla base dural e realce homogêneo — repare como o tecido cerebral adjacente é apenas COMPRIMIDO, não invadido.'),
            P('Já o glioblastoma é um tumor INTRA-axial (nasce de dentro do próprio tecido cerebral) de altíssimo grau de malignidade — tipicamente mostra necrose central, realce heterogêneo em anel ao redor dessa necrose, e edema perilesional extenso.'),
            F('modulo7/p111_x671.webp', 'Glioblastoma na RM: massa intra-axial com necrose central (área escura, sem realce) circundada por um anel de realce heterogêneo e edema vasogênico extenso ao redor.'),
            TIP('Diferença mais cobrada em prova: meningioma é EXTRA-axial (empurra o cérebro, base ampla na dura, realce homogêneo) × glioblastoma é INTRA-axial (nasce de dentro, necrose central, realce em anel irregular). Pensar "de fora para dentro" (meningioma) versus "de dentro explodindo" (glioblastoma) ajuda a fixar.'),
            F('modulo7/p111_x672.webp', 'Sinusopatia aguda na TC/Rx de seios da face: opacificação do seio paranasal, por vezes com nível hidroaéreo visível — achado comum, geralmente sem necessidade de imagem seccional de rotina, reservada a casos refratários ou com suspeita de complicação.'),
          ],
        },
        {
          id: 'm7-avc', titulo: 'AVC — protocolo e trombólise/trombectomia',
          blocks: [
            TIP('Mnemônico geral do protocolo de AVC — "STEP": Start (avaliação inicial — NIHSS, glicemia capilar, neuroimagem imediata), Trombólise (se dentro da janela e sem contraindicações), Endovascular (trombectomia mecânica quando indicada), Prevenção secundária.'),
            P('A trombólise é considerada quando o início dos sintomas (ictus) foi há até 4,5 horas, com pressão arterial controlada (abaixo de 185x110) e ausência de contraindicações.'),
            TIP('Mnemônico das contraindicações à trombólise — "4 Cs": Cabeça (sangramento intracraniano prévio em qualquer época, TCE grave ou AVC isquêmico/neurocirurgia nos últimos 3 meses), Câncer (isquemia muito extensa, neoplasia gastrointestinal ativa com sangramento), Coração (endocardite infecciosa, dissecção aórtica), Coagulação (uso de heparina em dose plena nas últimas 24h, DOACs nas últimas 48h, INR/TP/TTPa alterados, plaquetas <100.000, sangramento gastrointestinal nos últimos 21 dias).'),
            P('A trombectomia mecânica segue a chamada "regra dos 6": considerar até 6 horas de ictus com NIHSS ≥6 e ASPECTS ≥6, para oclusões de grandes vasos (artéria carótida interna ou segmento M1 da cerebral média). A janela pode se estender de 6 a 24 horas quando há critérios de imagem avançada (perfusão, DWI-FLAIR) mostrando que ainda existe tecido salvável.'),
            F('modulo7/p113_x677.webp', 'Angio-TC no protocolo de AVC: mostra o nível exato da obstrução arterial e permite avaliar a qualidade da circulação colateral — essencial para decidir entre trombólise e trombectomia.'),
            F('modulo7/p113_x678.webp', 'Oclusão de grande vaso (segmento M1 da artéria cerebral média) na angio-TC: interrupção abrupta do fluxo de contraste no trajeto do vaso.'),
            F('modulo7/p113_x679.webp', 'TC de crânio sem contraste na fase aguda do AVC: os sinais precoces são sutis e fáceis de perder se você não procurar ativamente por eles.'),
            TIP('Os 5 sinais precoces de AVC isquêmico na TC sem contraste (procure ativamente, são sutis): sinal da artéria densa (artéria cerebral média mais branca que o normal, pelo próprio trombo), apagamento do núcleo lentiforme, perda da faixa insular, perda da diferenciação córtico-subcortical, e apagamento de sulcos/cisternas.'),
          ],
        },
        {
          id: 'm7-avc-rm', titulo: 'AVC na ressonância e doença de pequenos vasos',
          blocks: [
            P('Na ressonância magnética, a sequência de difusão (DWI/ADC) é a mais sensível para detectar isquemia PRECOCEMENTE — em questão de minutos. A restrição à difusão aparece como alto sinal no DWI combinado com baixo sinal no ADC (essa combinação é o que confirma isquemia aguda verdadeira, e não apenas um artefato).'),
            F('modulo7/p114_x683.webp', 'AVC isquêmico agudo em DWI: área de alto sinal (brilhante) correspondendo ao território isquêmico, detectável já nos primeiros minutos do evento.'),
            F('modulo7/p114_x684.webp', 'A mesma área no mapa de ADC: baixo sinal (escura) — a combinação DWI alto + ADC baixo é o que confirma que é isquemia aguda de verdade.'),
            F('modulo7/p114_x685.webp', 'FLAIR na mesma fase aguda: ainda SEM alteração significativa — o FLAIR só se altera mais tardiamente (horas depois), e essa discrepância DWI-positivo/FLAIR-ainda-normal é o que orienta a trombólise em pacientes que "acordaram com o AVC" (wake-up stroke) sem hora de início conhecida.'),
            TIP('"DWI-FLAIR mismatch": se o DWI já mostra a lesão mas o FLAIR ainda está normal, o AVC provavelmente tem menos de 4,5h de evolução — útil justamente quando não se sabe a hora exata do início dos sintomas.'),
            P('Já a hipertensão arterial crônica tem um mecanismo bem diferente de lesão cerebral: ela predispõe à ruptura de microaneurismas nas artérias lenticuloestriadas profundas (os chamados microaneurismas de Charcot-Bouchard), causando micro-hemorragias profundas, infartos lacunares e hemorragias profundas — tipicamente em núcleos da base, tálamo, ponte e cerebelo.'),
            F('modulo7/p114_x686.webp', 'Micro-hemorragias profundas por hipertensão crônica, em sequência sensível a sangue (SWI/GRE) — pequenos focos escuros distribuídos nos núcleos da base e tálamo.'),
            F('modulo7/p114_x687.webp', 'Infarto lacunar: pequena lesão isquêmica profunda, tipicamente na cápsula interna, núcleos da base ou ponte — território das artérias perfurantes.'),
            F('modulo7/p114_x688.webp', 'Hemorragia profunda hipertensiva: sangramento espontâneo nos núcleos da base — a localização profunda (em vez de lobar) é a principal pista de que a causa é hipertensiva.'),
            TIP('Localização é tudo: hemorragia PROFUNDA (núcleos da base, tálamo, ponte, cerebelo) → pensar em hipertensão crônica. Hemorragia LOBAR (cortical/subcortical) em idoso → pensar em angiopatia amiloide.'),
            F('modulo7/p115_x692.webp', 'Angiopatia amiloide cerebral em SWI/GRE: múltiplas micro-hemorragias corticossubcorticais (lobares), poupando os núcleos da base — o padrão espacial oposto ao da hipertensão crônica, típico de pacientes idosos.'),
          ],
        },
        {
          id: 'm7-hidrocefalia', titulo: 'Hipertensão intracraniana e hidrocefalia',
          blocks: [
            P('As causas de hipertensão intracraniana (HIC) são variadas: massa intracraniana (tumor, hematoma), edema cerebral (por exemplo, num AVC extenso), alteração da produção ou absorção do líquor, obstrução do fluxo venoso, hidrocefalia obstrutiva, e o pseudotumor cerebral já visto anteriormente.'),
            P('Clinicamente, a HIC se manifesta com cefaleia, rebaixamento do nível de consciência, paralisia do VI par craniano (por seu longo trajeto intracraniano, é o mais vulnerável ao aumento de pressão), a tríade de Cushing (hipertensão + bradicardia + irregularidade respiratória — um sinal tardio e grave) e sintomas neurológicos focais.'),
            P('O manejo de suporte inclui elevação da cabeceira, hiperventilação controlada (alvo de PaCO2 entre 26-30), manitol, e monitorização direta da PIC — mas o tratamento definitivo é sempre resolver a causa de base.'),
            P('A hidrocefalia se divide em dois grandes tipos conforme o mecanismo: COMUNICANTE (obstrução na absorção do líquor ou aumento da sua produção, mas sem bloqueio físico da circulação) e NÃO comunicante/OBSTRUTIVA (bloqueio físico direto da circulação do líquor, como numa estenose do aqueduto cerebral ou um tumor no IV ventrículo).'),
            F('modulo7/p117_x699.webp', 'Hidrocefalia obstrutiva na TC: dilatação dos ventrículos LATERAIS e do III ventrículo, mas o IV ventrículo permanece de tamanho normal — o padrão aponta para um bloqueio entre o III e o IV ventrículo.'),
            F('modulo7/p117_x700.webp', 'Hidrocefalia hipertensiva: além da dilatação ventricular, sinais de sofrimento periventricular (halo hipodenso ao redor dos ventrículos) por extravasamento transependimário de líquor.'),
            F('modulo7/p117_x701.webp', 'Estenose do aqueduto cerebral: o pequeno canal entre o III e o IV ventrículo está estreitado/bloqueado — uma das causas clássicas de hidrocefalia obstrutiva congênita ou adquirida.'),
            F('modulo7/p117_x702.webp', 'Tumor de IV ventrículo: massa dentro do IV ventrículo bloqueando a saída do líquor — causa obstrutiva mais comum em crianças (ex.: meduloblastoma, ependimoma).'),
          ],
        },
        {
          id: 'm7-herniacao', titulo: 'Herniações cerebrais',
          blocks: [
            P('Quando a pressão intracraniana sobe demais, o tecido cerebral pode literalmente ser empurrado para fora do compartimento onde deveria estar — isso é uma herniação, e reconhecer o tipo na imagem prediz exatamente qual estrutura está em risco.'),
            F('modulo7/p118_x705.webp', 'Herniação SUBFALCINA: o giro do cíngulo é empurrado por baixo da foice cerebral, para o lado oposto — geralmente o achado mais PRECOCE de efeito de massa, antes de sintomas mais graves aparecerem.'),
            F('modulo7/p118_x706.webp', 'Herniação UNCAL (transtentorial lateral): o úncus do lobo temporal desloca-se medialmente, comprimindo o mesencéfalo e o III par craniano.'),
            F('modulo7/p118_x707.webp', 'Consequência clínica da herniação uncal: compressão do III par craniano causa midríase (pupila dilatada) do MESMO lado da lesão — um sinal clínico de emergência neurológica.'),
            F('modulo7/p118_x708.webp', 'Herniação TONSILAR: as tonsilas cerebelares descem através do forame magno, comprimindo o bulbo — a mais grave de todas, com risco iminente de parada cardiorrespiratória por compressão do centro respiratório bulbar.'),
            TIP('Ordem de gravidade crescente para lembrar: subfalcina (mais precoce/leve) → uncal (compressão do III par, midríase ipsilateral) → tonsilar (compressão bulbar, risco de morte iminente). Cada uma tem uma "assinatura" clínica própria que ajuda a saber quão grave é a situação só pela clínica.'),
          ],
        },
        {
          id: 'm7-infeccoes', titulo: 'Infecções do SNC (meningites)',
          blocks: [
            P('Clinicamente, 95% dos pacientes com meningite apresentam pelo menos 2 de 4 achados: cefaleia (84%), febre acima de 38°C (74%), rigidez de nuca (74%) e Glasgow menor que 14 (71%).'),
            P('A TC de crânio deve ser feita ANTES da punção lombar apenas em situações específicas: imunocomprometimento, doença de SNC já conhecida (como um tumor), convulsão, papiledema, déficit neurológico focal ou rebaixamento do nível de consciência — fora desses casos, a punção pode e deve ser feita sem atrasar por uma TC desnecessária.'),
            TIP('Padrão geral do líquor por etiologia (não é regra absoluta, mas ajuda muito na prova): meningite BACTERIANA — glicose baixa, proteína alta, muitas células com predomínio de neutrófilos; meningite VIRAL — glicose normal, proteína levemente elevada, menos células, predomínio linfocitário; meningite TUBERCULOSA — proteína muito alta, glicose baixa, evolução mais arrastada no tempo.'),
            P('O tratamento empírico da meningite bacteriana combina antibiótico + dexametasona endovenosa — a dexametasona reduz sequelas neurológicas e deve ser iniciada ANTES ou junto com a primeira dose de antibiótico, nunca depois.'),
            P('O esquema antibiótico varia com a faixa etária e o agente suspeito/isolado: em linhas gerais, ceftriaxona é a base do tratamento em crianças acima de 3 meses e em adultos, enquanto em neonatos é preciso associar ampicilina para cobrir Listeria monocytogenes (um patógeno que a ceftriaxona sozinha não cobre).'),
            P('Para os comunicantes de casos de H. influenzae B ou meningococo, a rifampicina é a droga de escolha para profilaxia — deve ser iniciada o mais precocemente possível, idealmente dentro das primeiras 24 horas do diagnóstico do caso índice.'),
            P('No espectro de imagem das infecções do SNC, cada entidade tem um padrão característico que vale reconhecer:'),
            F('modulo7/p122_x718.webp', 'Meningite aguda na RM com contraste: realce leptomeníngeo (das meninges finas que revestem o cérebro), acompanhando os sulcos corticais.'),
            F('modulo7/p122_x720.webp', 'Abscesso cerebral piogênico: lesão com centro necrótico (sem realce) circundado por uma cápsula fina e regular que realça — e importante, restrição à difusão no DWI dentro do abscesso (diferente de um tumor necrótico, que geralmente não restringe tanto).'),
            F('modulo7/p122_x722.webp', 'Neurocriptococose: lesões císticas pequenas e múltiplas, muitas vezes nos núcleos da base, associadas a espaços perivasculares dilatados ("lesões em cachos de uva/gelatinosas") — típico de pacientes imunossuprimidos, especialmente HIV avançado.'),
            F('modulo7/p122_x724.webp', 'Neurocisticercose: cistos parasitários no parênquima cerebral, em diferentes estágios evolutivos (vesicular, coloidal, calcificado) — causa importante de epilepsia em áreas endêmicas.'),
            F('modulo7/p122_x726.webp', 'Encefalite herpética: alterações de sinal (edema/necrose) tipicamente assimétricas nos lobos temporais mediais e região insular — localização muito característica que ajuda a diferenciar de outras encefalites.'),
            F('modulo7/p122_x728.webp', 'Meningite crônica por neurotuberculose: espessamento e realce meníngeo predominando na base do crânio (meninge basal), diferente do padrão mais difuso da meningite bacteriana aguda.'),
            F('modulo7/p122_x730.webp', 'Neurotoxoplasmose: lesão(ões) com realce em anel, frequentemente múltiplas e localizadas na transição córtico-subcortical ou núcleos da base — principal diagnóstico diferencial de lesão cerebral em paciente com HIV/AIDS avançado.'),
            F('modulo7/p122_x732.webp', 'Outro exemplo de neurotoxoplasmose, evidenciando o clássico "sinal do alvo excêntrico" — um pequeno nódulo mural dentro do anel de realce, achado bastante específico quando presente.'),
            F('modulo7/p122_x734.webp', 'Comparação final: meningite aguda com realce meníngeo difuso versus abscesso cerebral piogênico com sua cápsula regular — reforçando visualmente os dois padrões extremos do espectro infeccioso do SNC.'),
            TIP('Regra rápida para lesões com realce em anel no paciente com HIV: se for única e grande, pensar mais em linfoma primário do SNC; se forem MÚLTIPLAS, pensar primeiro em neurotoxoplasmose (mais comum) — e a resposta ao tratamento empírico anti-toxoplasma em 2 semanas costuma ser o próprio "teste diagnóstico" usado na prática.'),
          ],
        },
      ],
    },
  ];

  window.RadioAulas = { MODULOS };
})();
