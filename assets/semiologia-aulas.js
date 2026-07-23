/* ============================================================================
 * SÓqueroMed — Semiologia · Aulas (conteúdo real, adaptado do material próprio)
 * Módulo de DADOS puro (sem UI) — consumido por assets/semiologia.js.
 *
 * Estruturado a partir do Método Semio3D (Bases do Método Clínico · Anamnese ·
 * Sistemas · Roteiros de Exame Físico) e dos princípios do briefing mestre:
 *   • do normal ao patológico;
 *   • técnica ligada à finalidade clínica (o que avalia · como · resultado ·
 *     erros · utilidade · quando NÃO fazer · como registrar);
 *   • raciocínio probabilístico (LR/S/E quando há evidência);
 *   • segurança do paciente e centralidade da pessoa;
 *   • red flags e documentação em todas as técnicas.
 *
 * Cada tópico é uma sequência de BLOCOS lidos em ordem:
 *   { t:'p',   x:'...' }                     — parágrafo
 *   { t:'h',   x:'...' }                     — subtítulo dentro do tópico
 *   { t:'tip', x:'...' }                     — macete / dica clínica em destaque
 *   { t:'warn',x:'...' }                     — red flag / alerta de segurança
 *   { t:'ul',  x:['...','...'] }             — lista
 *   { t:'doc', x:'...' }                     — exemplo de registro em prontuário
 *   { t:'ev',  x:'...' }                     — nota de evidência (S/E/LR)
 *   { t:'svg', x:'<svg…>', cap:'...' }       — esquema didático próprio + legenda
 *
 * window.SemioAulas = { MODULOS: [...] }
 * ==========================================================================*/
(function () {
  'use strict';

  const P = (x) => ({ t: 'p', x });
  const H = (x) => ({ t: 'h', x });
  const TIP = (x) => ({ t: 'tip', x });
  const WARN = (x) => ({ t: 'warn', x });
  const UL = (...x) => ({ t: 'ul', x });
  const DOC = (x) => ({ t: 'doc', x });
  const EV = (x) => ({ t: 'ev', x });
  const SVG = (x, cap) => ({ t: 'svg', x, cap });
  const IMG = (src, cap) => ({ t: 'img', x: src, cap });
  const IMGGRID = (arr) => ({ t: 'imggrid', x: arr });
  // gera uma grade de imagens numeradas [de..ate] de uma pasta real (assets/semiologia-real/<pasta>);
  // a extensão real (jpg/png) é resolvida automaticamente no navegador (ver imgFallback em semiologia.js)
  const galeria = (pasta, de, ate) => {
    const items = [];
    for (let i = de; i <= ate; i++) items.push({ src: `assets/semiologia-real/${pasta}/${i}.jpg`, cap: `Slide ${i}` });
    return IMGGRID(items);
  };
  const foto = (pasta, n, cap) => IMG(`assets/semiologia-real/${pasta}/${n}.jpg`, cap);

  // --- alguns esquemas SVG didáticos reutilizáveis -------------------------
  const svgTorax = `<svg viewBox="0 0 320 250" xmlns="http://www.w3.org/2000/svg" class="semio-fig-svg">
    <rect width="320" height="250" fill="none"/>
    <path d="M60 30 C60 20 120 14 160 14 C200 14 260 20 260 30 L272 210 C230 236 90 236 48 210 Z" fill="#eef3f8" stroke="#9db2c7" stroke-width="2"/>
    <line x1="160" y1="16" x2="160" y2="230" stroke="#c2d0de" stroke-width="1.2" stroke-dasharray="4 4"/>
    <text x="92" y="80" font-size="11" fill="#3a6ea5">Ápice</text>
    <text x="196" y="80" font-size="11" fill="#3a6ea5">Ápice</text>
    <text x="86" y="150" font-size="11" fill="#3a6ea5">Base</text>
    <text x="196" y="150" font-size="11" fill="#3a6ea5">Base</text>
    <circle cx="132" cy="170" r="4" fill="#c0392b"/><text x="118" y="196" font-size="10" fill="#c0392b">Foco mitral</text>
    <circle cx="150" cy="120" r="4" fill="#c0392b"/><text x="150" y="118" font-size="10" fill="#c0392b">Aórtico/Pulmonar</text>
  </svg>`;

  const svgAbdome = `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" class="semio-fig-svg">
    <rect width="300" height="300" fill="none"/>
    <rect x="40" y="40" width="220" height="220" rx="20" fill="#eef3f8" stroke="#9db2c7" stroke-width="2"/>
    <line x1="113" y1="40" x2="113" y2="260" stroke="#c2d0de" stroke-width="1.2"/>
    <line x1="187" y1="40" x2="187" y2="260" stroke="#c2d0de" stroke-width="1.2"/>
    <line x1="40" y1="113" x2="260" y2="113" stroke="#c2d0de" stroke-width="1.2"/>
    <line x1="40" y1="187" x2="260" y2="187" stroke="#c2d0de" stroke-width="1.2"/>
    <text x="60" y="80" font-size="9" fill="#3a6ea5">Hipocôndrio D</text>
    <text x="128" y="80" font-size="9" fill="#3a6ea5">Epigástrio</text>
    <text x="200" y="80" font-size="9" fill="#3a6ea5">Hipocôndrio E</text>
    <text x="66" y="155" font-size="9" fill="#3a6ea5">Flanco D</text>
    <text x="132" y="155" font-size="9" fill="#3a6ea5">Mesogástrio</text>
    <text x="206" y="155" font-size="9" fill="#3a6ea5">Flanco E</text>
    <text x="62" y="228" font-size="9" fill="#3a6ea5">Fossa ilíaca D</text>
    <text x="128" y="228" font-size="9" fill="#3a6ea5">Hipogástrio</text>
    <text x="200" y="228" font-size="9" fill="#3a6ea5">Fossa ilíaca E</text>
    <circle cx="220" cy="225" r="5" fill="#c0392b"/><text x="150" y="285" font-size="10" fill="#c0392b">McBurney (apêndice) fica na FID</text>
  </svg>`;

  const svgPercussao = `<svg viewBox="0 0 340 120" xmlns="http://www.w3.org/2000/svg" class="semio-fig-svg" style="max-width:340px">
    <defs><linearGradient id="semioPerc" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#111827"/><stop offset="0.35" stop-color="#334155"/>
      <stop offset="0.7" stop-color="#94a3b8"/><stop offset="1" stop-color="#e2e8f0"/></linearGradient></defs>
    <rect x="20" y="30" width="300" height="26" rx="6" fill="url(#semioPerc)"/>
    <text x="34" y="24" font-size="10" fill="#3a6ea5">mais ar (grave/musical)</text>
    <text x="238" y="24" font-size="10" fill="#3a6ea5">mais sólido</text>
    <g font-size="10" fill="#1e293b" text-anchor="middle">
      <line x1="55" y1="56" x2="55" y2="72" stroke="#94a3b8"/><text x="55" y="86">Timpânico</text>
      <line x1="135" y1="56" x2="135" y2="72" stroke="#94a3b8"/><text x="135" y="86">Claro pulm.</text>
      <line x1="215" y1="56" x2="215" y2="72" stroke="#94a3b8"/><text x="215" y="86">Submaciço</text>
      <line x1="295" y1="56" x2="295" y2="72" stroke="#94a3b8"/><text x="295" y="86">Maciço</text>
    </g>
    <g font-size="9" fill="#667085" text-anchor="middle">
      <text x="55" y="102">estômago/alça</text><text x="135" y="102">pulmão normal</text>
      <text x="215" y="102">consolidação</text><text x="295" y="102">fígado/derrame</text>
    </g>
  </svg>`;

  const MODULOS = [
    // =========================================================================
    // MÓDULO 1 — BASES DO MÉTODO CLÍNICO
    // =========================================================================
    {
      id: 1, nome: 'Bases do Método Clínico',
      resumo: 'A consulta como método: relação, segurança, terminologia e a lógica de transformar dados em diagnóstico.',
      topicos: [
        {
          id: 'm1-relacao', titulo: 'Relação médico-paciente e a consulta como método',
          blocks: [
            P('Semiologia não é decorar uma sequência de manobras — é um método de raciocínio que transforma a queixa de uma pessoa em um problema clínico bem definido. Tudo começa na relação: um vínculo mal construído gera uma história incompleta, e uma história incompleta é a principal causa de erro diagnóstico, muito mais do que a falta de exames.'),
            H('Os primeiros 60 segundos'),
            P('Apresente-se pelo nome e função ("Bom dia, sou o Isaac, estudante de Medicina da equipe"), confirme a identidade do paciente e explique o que vai fazer. Sente-se na altura dos olhos, evite ficar atrás de um computador e sinalize que aquele tempo é dele. A abertura calorosa e a escuta sem interrupção nos primeiros segundos aumentam a quantidade de informação espontânea que o paciente traz.'),
            TIP('Estudos clássicos mostram que o médico interrompe o paciente em média nos primeiros ~18 segundos de fala. Quem deixa o paciente completar a frase de abertura raramente perde mais que 30–60 segundos — e ganha dados que economizam perguntas depois. Deixe a primeira frase terminar.'),
            H('Ferramentas de comunicação'),
            UL(
              'Perguntas abertas para começar ("Conte-me o que está sentindo") e fechadas para precisar ("A dor piora quando respira fundo?").',
              'Facilitação: aceno, "hum", "continue" — mantém a fala sem dirigir.',
              'Clarificação: "Quando diz tontura, é o mundo girando ou sensação de desmaio?".',
              'Legitimação e empatia: "Deve ter sido assustador" — reconhece o sentimento sem julgar.',
              'Resumo e transição: devolva o que entendeu antes de mudar de assunto ("Deixa eu ver se entendi…"); isso corrige erros e mostra escuta.'
            ),
            P('Encerre sempre verificando expectativas e preocupações ("O que mais te preocupa nisso?") e combinando o próximo passo. Muitas queixas importantes só aparecem na porta — a chamada "doorknob complaint" — justamente porque não houve espaço antes.'),
            WARN('Centralidade da pessoa: use linguagem não estigmatizante ("pessoa que usa álcool", não "alcoólatra"), respeite diversidade e adapte a consulta a deficiência, baixa escolaridade e diferenças culturais. A forma como você pergunta determina o que o paciente se sente seguro para contar.'),
          ],
        },
        {
          id: 'm1-etica', titulo: 'Ética, consentimento, privacidade e segurança',
          blocks: [
            P('Antes de tocar em qualquer paciente há três obrigações não-negociáveis: consentimento, privacidade e segurança. Elas valem tanto para a entrevista quanto para o exame físico e são itens críticos — em uma estação de OSCE, ignorá-las costuma zerar a estação independentemente da técnica.'),
            H('Consentimento e chaperone'),
            UL(
              'Explique o que vai fazer e por quê, e obtenha consentimento antes de examinar ("Vou examinar seu abdome, tudo bem?").',
              'Garanta privacidade: porta/cortina fechada, exposição corporal progressiva e apenas da região examinada.',
              'Em exames íntimos (mama, genital, toque retal/vaginal) ofereça e registre a presença de acompanhante/chaperone.',
              'Confidencialidade tem limites: risco iminente à vida do paciente ou de terceiros e notificação compulsória.',
              'Adolescente tem direito à confidencialidade; quebra-se apenas diante de risco (abuso, ideação suicida, gravidez de risco).'
            ),
            H('Segurança e controle de infecção'),
            P('Higienize as mãos antes e depois de cada contato (os "5 momentos" da OMS) e limpe o diafragma do estetoscópio entre pacientes — o estetoscópio carrega a mesma carga bacteriana da palma da mão. Posicione o paciente com segurança, previna quedas e interrompa qualquer manobra que cause dor não prevista.'),
            WARN('Limites do estudante: você reconhece sinais de gravidade e chama ajuda — não conduz sozinho instabilidade hemodinâmica, via aérea ameaçada, rebaixamento de consciência ou dor torácica de alto risco. Saber a hora de pedir supervisão é competência, não fraqueza.'),
          ],
        },
        {
          id: 'm1-terminologia', titulo: 'Terminologia semiológica essencial',
          blocks: [
            P('A linguagem da semiologia precisa ser precisa porque cada termo carrega uma decisão. Confundir "sinal" com "sintoma" ou "hipótese" com "diagnóstico" muda a conduta.'),
            UL(
              'Sintoma — subjetivo, relatado pelo paciente (dor, náusea, dispneia).',
              'Sinal — objetivo, detectado pelo examinador (icterícia, sopro, macicez).',
              'Síndrome — conjunto de sinais e sintomas que costumam ocorrer juntos (ex.: síndrome consolidativa).',
              'Achado — qualquer dado positivo ou negativo colhido na avaliação.',
              'Hipótese diagnóstica — explicação provável, ainda sob teste; Diagnóstico — hipótese confirmada.',
              'Etiologia (causa) × fisiopatologia (mecanismo) × fator de risco (aumenta probabilidade, não é causa direta).'
            ),
            H('Temporalidade — a espinha dorsal da narrativa'),
            UL(
              'Agudo × subagudo × crônico; contínuo × intermitente × recorrente.',
              'Curso: progressivo, estável, em melhora; exacerbação, remissão, recidiva.',
              'Sequela — dano residual permanente; incapacidade — impacto funcional.'
            ),
            TIP('Sempre que ouvir um sintoma, "coloque data" nele: quando começou, como evoluiu e como está agora. Uma cefaleia "há 20 anos, sempre igual" e uma "há 3 dias, cada vez pior" são problemas de risco completamente diferentes — a mesma palavra, decisões opostas.'),
          ],
        },
        {
          id: 'm1-raciocinio', titulo: 'Da queixa ao diagnóstico: representação do problema',
          blocks: [
            P('O raciocínio clínico é o objetivo final da semiologia. O passo-chave é construir a representação do problema: uma frase curta e discriminativa que resume o caso e já aponta para um grupo de diagnósticos.'),
            H('Anatomia de uma boa representação'),
            P('Combine: perfil epidemiológico + temporalidade + síndrome dominante + gravidade + achados discriminativos (positivos e negativos pertinentes). Ex.: "Homem de 62 anos, tabagista, com dispneia progressiva há 3 semanas e edema assimétrico de MID, sem febre" — em uma frase você já pensou em TVP/TEP, ICC e neoplasia.'),
            H('Gerando e organizando hipóteses'),
            UL(
              'Organize por probabilidade (o mais comum), por gravidade (o que não pode ser perdido) e por mecanismo.',
              'Sempre liste os "não-podem-passar" (do not miss): SCA na dor torácica, HSA na cefaleia, meningite na febre com rigidez de nuca.',
              'Compare hipóteses buscando o dado que as separa (achado discriminativo), não o que confirma sua favorita.'
            ),
            H('Probabilidade em uma frase'),
            EV('Cada achado move a probabilidade: um teste com razão de verossimilhança positiva (LR+) alta aumenta a chance da doença; LR− baixa a reduz. LR ≈ 1 não muda nada. Guarde referências úteis: LR+ > 10 ou LR− < 0,1 alteram muito a conduta; entre 0,5 e 2 quase não mexem. Voltaremos a isso a cada manobra.'),
            WARN('Vieses que matam: fechamento prematuro (parar no primeiro diagnóstico), ancoragem (fixar na primeira impressão), disponibilidade (lembrar do caso recente) e satisfação da busca (achar UMA coisa e parar de procurar). O antídoto é o método fixo e a pergunta "o que mais poderia ser?".'),
          ],
        },
      ],
    },

    // =========================================================================
    // MÓDULO 2 — ANAMNESE
    // =========================================================================
    {
      id: 2, nome: 'Anamnese',
      resumo: 'A história clínica estruturada: da identificação à HMA, semiologia da dor e interrogatório dirigido.',
      topicos: [
        {
          id: 'm2-estrutura', titulo: 'Estrutura completa da anamnese',
          blocks: [
            P('A anamnese tem uma ordem consagrada. Segui-la garante que nada essencial seja esquecido e que quem ler o prontuário reconstrua o raciocínio. A ordem não precisa ser a ordem da conversa — você organiza depois —, mas o registro segue sempre a mesma sequência.'),
            UL(
              'Identificação — nome, idade, sexo, procedência, ocupação (cada dado já é epidemiologia).',
              'Fonte e confiabilidade da história (o próprio paciente? um acompanhante? paciente confuso?).',
              'Queixa principal (QP) — nas palavras do paciente + duração.',
              'História da moléstia atual (HMA) — a narrativa cronológica do problema.',
              'Interrogatório sintomatológico (revisão de sistemas).',
              'Antecedentes pessoais (patológicos, cirúrgicos, alergias, medicações, vacinas) e fisiológicos.',
              'Antecedentes familiares.',
              'História social — moradia, trabalho, alimentação, sono, tabagismo, álcool, outras substâncias, sexualidade, viagens.'
            ),
            TIP('A "identificação" não é burocracia: idade, sexo e procedência já reordenam a lista de diagnósticos antes da primeira queixa. Dor no peito em homem de 60 anos tabagista ≠ dor no peito em mulher de 22 anos ansiosa — mesmo sintoma, probabilidades pré-teste opostas.'),
          ],
        },
        {
          id: 'm2-hma', titulo: 'HMA: construindo a narrativa (SOCRATES / semiologia do sintoma)',
          blocks: [
            P('A HMA é o coração da anamnese. Deve ser uma narrativa cronológica — do primeiro dia até hoje — e não uma lista solta. Para cada sintoma, caracterize todos os atributos. Um roteiro útil é o SOCRATES (nascido para a dor, mas aplicável a quase todo sintoma).'),
            H('SOCRATES'),
            UL(
              'S — Site (localização): onde exatamente?',
              'O — Onset (início): súbito ou gradual? o que fazia na hora?',
              'C — Character (caráter): em aperto, queimação, pontada, cólica?',
              'R — Radiation (irradiação): vai para algum lugar?',
              'A — Associations (sintomas associados): náusea, sudorese, febre, dispneia?',
              'T — Timing (tempo/evolução): contínuo ou em crises? piora?',
              'E — Exacerbating/relieving (o que piora e melhora): esforço, repouso, alimentação, posição?',
              'S — Severity (intensidade): escala 0–10 e impacto funcional.'
            ),
            TIP('Mnemônicos como SOCRATES são andaimes, não gaiolas. Servem para não esquecer atributos — mas nunca dispare as 8 perguntas em metralhadora. Use-os para conferir, ao final, se algum atributo ficou faltando na história que o paciente já contou espontaneamente.'),
            WARN('O que piora e o que melhora costuma ser o dado mais discriminativo de todos. Dor torácica que piora com esforço e alivia com repouso grita angina; que piora com a respiração sugere causa pleurítica/pericárdica; que piora à palpação aponta parede torácica. A mesma dor, três caminhos diferentes.'),
            H('Registro'),
            DOC('HMA (exemplo): "Paciente refere dor torácica retroesternal há 2 dias, em aperto, iniciada aos esforços e aliviada com repouso, irradiando para MSE, associada a sudorese, sem relação com respiração ou palpação. Nega febre. Episódios progressivamente mais frequentes."'),
          ],
        },
        {
          id: 'm2-dor', titulo: 'Semiologia da dor',
          blocks: [
            P('A dor é a queixa mais comum e a mais rica em pistas. Além dos atributos do SOCRATES, classificá-la por mecanismo direciona a investigação.'),
            H('Tipos de dor por mecanismo'),
            UL(
              'Nociceptiva somática — bem localizada, em pontada/aperto (ex.: fratura, ferida).',
              'Nociceptiva visceral — mal localizada, profunda, em cólica, com náusea/sudorese (ex.: cólica renal, isquemia intestinal).',
              'Neuropática — em queimação/choque, com formigamento e no território de um nervo (ex.: neuralgia, ciática).',
              'Referida — sentida longe da origem por convergência de vias (ex.: IAM na mandíbula/MSE; colecistite no ombro D).'
            ),
            TIP('Dor visceral "migra" e se localiza quando o peritônio parietal é atingido. O exemplo clássico é a apendicite: começa periumbilical (visceral, mal localizada) e migra para a fossa ilíaca direita (somática, bem localizada) quando inflama o peritônio local. Essa migração vale mais que qualquer manobra isolada.'),
            WARN('Red flags de dor que exigem atenção imediata: início súbito e máximo desde o começo (thunderclap na cefaleia → HSA; dor lombar "rasgando" → dissecção de aorta), dor desproporcional ao exame (isquemia mesentérica), dor + febre + rigidez, primeira dor intensa após os 50 anos, e dor que desperta do sono.'),
          ],
        },
        {
          id: 'm2-interrogatorio', titulo: 'Interrogatório sintomatológico dirigido',
          blocks: [
            P('A revisão de sistemas varre queixas que o paciente não mencionou espontaneamente. O erro do iniciante é transformá-la em um questionário indiscriminado; o objetivo é dirigi-la pela hipótese da HMA.'),
            H('Roteiro por sistemas (perguntas-âncora)'),
            UL(
              'Constitucional: febre, perda de peso, astenia, sudorese noturna.',
              'Cardiovascular: dor torácica, dispneia, ortopneia, DPN, edema, palpitação, síncope.',
              'Respiratório: tosse, expectoração, hemoptise, chiado, dispneia.',
              'Gastrointestinal: dor abdominal, náusea/vômito, hábito intestinal, sangramento, icterícia.',
              'Geniturinário: disúria, hematúria, alteração miccional, corrimento.',
              'Neurológico: cefaleia, tontura, fraqueza, alteração sensitiva, convulsão.',
              'Psíquico: humor, sono, ansiedade, ideação suicida.'
            ),
            TIP('Regra prática: aprofunde o sistema da queixa e faça uma varredura leve dos demais. Numa dispneia, esmiúce cardio e respiratório (ortopneia, DPN, tosse, edema) e apenas pincele o resto. Interrogatório completo não é perguntar tudo — é perguntar o que muda a conduta.'),
            WARN('Sintomas constitucionais (febre + perda de peso + sudorese noturna) são a tríade que sempre acende o alerta de neoplasia, tuberculose e doença sistêmica. Nunca os deixe passar como "cansaço".'),
          ],
        },
      ],
    },

    // =========================================================================
    // MÓDULO 3 — EXAME FÍSICO GERAL E SINAIS VITAIS
    // =========================================================================
    {
      id: 3, nome: 'Exame Físico Geral e Sinais Vitais',
      resumo: 'Ectoscopia, os quatro tempos do exame e a técnica correta dos sinais vitais.',
      topicos: [
        {
          id: 'm3-geral', titulo: 'Ectoscopia e os quatro tempos',
          blocks: [
            P('O exame físico segue quatro tempos, quase sempre nesta ordem: inspeção, palpação, percussão e ausculta. A exceção é o abdome, onde a ausculta vem antes da palpação/percussão para não alterar os ruídos hidroaéreos.'),
            P('A ectoscopia (avaliação geral) começa no instante em que você vê o paciente. Antes de tocar, registre de forma estruturada:'),
            UL(
              'Estado geral (bom/regular/mau), nível de consciência e orientação.',
              'Fácies, atitude, decúbito preferencial, mobilidade e marcha.',
              'Coloração de pele e mucosas: palidez, cianose, icterícia.',
              'Hidratação e estado nutricional.',
              'Presença de edema, perfusão periférica, linfonodos palpáveis.'
            ),
            TIP('"Doente ou não-doente?" é a primeira e mais importante decisão semiológica, e ela é feita de longe, na ectoscopia. Um paciente prostrado, sudoreico, taquipneico e mal perfundido é uma emergência antes de qualquer número — a impressão geral treinada vale mais que a saturação isolada.'),
            DOC('Ectoscopia (exemplo normal): "REG, lúcido e orientado, corado, hidratado, acianótico, anictérico, eupneico em ar ambiente, afebril ao toque, sem edemas ou linfonodomegalias."'),
          ],
        },
        {
          id: 'm3-decubito', titulo: 'Decúbito, atitude, fácies e marcha',
          blocks: [
            P('Boa parte do diagnóstico começa antes de tocar o paciente: a forma como ele se posiciona, o rosto que faz e o jeito de andar já entregam pistas. São dados da ectoscopia que o examinador treinado lê à distância.'),
            H('Decúbito e atitude'),
            P('Decúbito é a posição do paciente deitado; atitude é a postura que ele adota espontaneamente, muitas vezes para aliviar um sintoma. A posição preferida costuma ter significado.'),
            UL(
              'Ortopneia (senta ou eleva a cabeceira para respirar) → congestão pulmonar/ICC.',
              'Posição de prece maometana (inclinado para frente) → derrame pericárdico.',
              'Decúbito lateral sobre o lado doente → derrame pleural volumoso (limita o lado bom).',
              'Posição em gatilho/antálgica imóvel → irritação peritoneal (o paciente evita mexer).',
              'Opistótono (arqueamento do corpo) → tétano, irritação meníngea grave.'
            ),
            TIP('O paciente que chega andando, fala frases completas e escolhe a posição confortável raramente está grave naquele instante. Já quem não tolera deitar, fica imóvel ou adota uma postura fixa está te dizendo onde procurar — leia a atitude antes de perguntar.'),
            H('Fácies — o rosto como sinal'),
            P('Fácies é o conjunto de expressão e traços do rosto que, em algumas doenças, forma um padrão reconhecível. Não são patognomônicas, mas orientam a hipótese.'),
            UL(
              'Fácies hipocrática — olhos fundos, nariz afilado, palidez terrosa: doença grave/terminal, peritonite avançada.',
              'Fácies mixedematosa — face inchada, pele seca, pálpebras edemaciadas: hipotireoidismo.',
              'Fácies basedowiana — olhos salientes (exoftalmia), olhar assustado: hipertireoidismo.',
              'Fácies em lua cheia — face arredondada e pletórica: síndrome de Cushing/corticoterapia.',
              'Fácies parkinsoniana — inexpressiva, "em máscara", piscar reduzido: doença de Parkinson.',
              'Fácies leonina — infiltração e espessamento da pele: hanseníase virchowiana.'
            ),
            H('Marcha'),
            P('A marcha integra força, equilíbrio, propriocepção e coordenação — por isso altera cedo em muitas doenças neurológicas. Peça ao paciente para caminhar alguns metros, virar e voltar.'),
            UL(
              'Ceifante/hemiplégica — perna estendida que circunda ("ceifa"): sequela de AVC (1º neurônio).',
              'Escarvante — pé caído, levanta muito o joelho para não arrastar: lesão do nervo fibular.',
              'Atáxica cerebelar — base alargada, cambaleante ("de bêbado"): síndrome cerebelar.',
              'Atáxica sensitiva (talonante) — olha os pés, pisa forte, piora no escuro: déficit proprioceptivo.',
              'Parkinsoniana — passos curtos, arrastados, tronco fletido, festinação: parkinsonismo.',
              'Anserina (gingante) — rebola por fraqueza da cintura pélvica: miopatias.'
            ),
            WARN('Marcha nova + assimetria de força ou fala arrastada de início súbito = suspeita de AVC → tempo é cérebro, acione o protocolo. Quedas de repetição no idoso nunca são "da idade": investigue causas (hipotensão ortostática, polifarmácia, déficit visual, neuropatia).'),
          ],
        },
        {
          id: 'm3-tecnicas', titulo: 'As quatro técnicas: inspeção, palpação, percussão e ausculta',
          blocks: [
            P('Todo exame de qualquer segmento se apoia em quatro técnicas. Dominá-las de forma genérica permite aplicá-las a qualquer sistema. Duas regras valem para todas: higienize as mãos antes e depois, e compare sempre órgãos/regiões simétricas — palpando a área normal antes da alterada e antes da dolorosa.'),
            H('Inspeção'),
            P('É olhar de forma dirigida, com boa iluminação e exposição adequada. Avalia cor, forma, simetria, volume, movimentos e lesões. Começa na ectoscopia e continua em cada segmento.'),
            H('Palpação'),
            P('Complementa a inspeção pelo tato. Mãos aquecidas e unhas curtas. Modalidades conforme o objetivo:'),
            UL(
              'Mão espalmada (toda a palma) — avalia frêmitos, expansibilidade e grandes massas.',
              'Dedos em pinça (polegar + indicador) — delimita nódulos e linfonodos.',
              'Dorso dos dedos — mais sensível para temperatura da pele.',
              'Digitopressão — pesquisa dor e o sinal do cacifo (edema).',
              'Vitropressão (comprimir com lâmina) — diferencia eritema (some) de púrpura (não some).',
              'Palpação bimanual combinada — órgãos profundos e toques (ex.: toque vaginal com a outra mão no abdome).'
            ),
            foto('01-exame-fisico-geral-parte-01-e-02', 12, 'Decúbitos de exame: dorsal, lateral D/E, ventral, sentado e ortostático.'),
            foto('01-exame-fisico-geral-parte-01-e-02', 15, 'Nomenclatura das regiões do corpo usada para localizar achados no exame.'),
            SVG(svgPercussao, 'Escala dos sons à percussão, do mais "cheio" de ar ao mais sólido: timpânico → claro pulmonar → submaciço → maciço.'),
            foto('04-percussao', 12, 'Técnica de percussão dígito-digital (foto real da aula).'),
            H('Percussão'),
            P('Golpear a superfície para gerar vibração e som que informam sobre o que há embaixo. A técnica mais usada é a dígito-digital: o dedo plexímetro apoiado na pele recebe 2 golpes secos do dedo plexor, retirado rápido para não abafar o som.'),
            UL(
              'Som timpânico — vísceras ocas com ar (estômago, alças): mais "musical".',
              'Som claro pulmonar — pulmão normal (ar + tecido).',
              'Som submaciço — intermediário (borda de órgãos, consolidação parcial).',
              'Som maciço — órgãos sólidos ou líquido (fígado, coração, derrame).'
            ),
            P('Variantes úteis: percussão direta nos seios da face (sinusite), punho-percussão lombar (sinal de Giordano) e percussão por piparote na pesquisa de ascite.'),
            H('Ausculta'),
            P('Ouvir os sons do corpo com o estetoscópio. Conheça o instrumento: o diafragma capta melhor sons agudos (murmúrio vesicular, B1/B2, sopros de alta frequência); a campânula, apoiada levemente, capta sons graves (B3, B4, ruflar da estenose mitral). Ausculte pele a pele, em ambiente silencioso, comparando lados.'),
            WARN('Segurança: limpe o diafragma do estetoscópio entre pacientes — ele carrega a mesma carga de bactérias da palma da mão. Sons abafados que forçam você a apertar a campânula na pele costumam ser artefato de má técnica, não achado.'),
          ],
        },
        {
          id: 'm3-pa', titulo: 'Pressão arterial: a técnica que mais erra',
          blocks: [
            P('A PA é o sinal vital mais mal aferido da prática. Pequenos erros de técnica geram diagnósticos falsos de hipertensão e decisões erradas. A finalidade é estimar a pressão de perfusão sistêmica de forma reprodutível.'),
            H('Técnica correta'),
            UL(
              'Paciente sentado, em repouso 5 min, sem falar, pernas descruzadas, bexiga vazia, sem café/cigarro na última hora.',
              'Braço apoiado na altura do coração; manguito com largura ~40% da circunferência do braço.',
              'Insufle ~30 mmHg acima do desaparecimento do pulso radial; desinsufle 2–3 mmHg/s.',
              '1º som de Korotkoff = sistólica; desaparecimento (5º som) = diastólica.',
              'Meça nos dois braços na 1ª avaliação; use o maior valor como referência.'
            ),
            WARN('Manguito pequeno demais superestima a PA (erro clássico no paciente obeso). O hiato auscultatório — silêncio entre a sistólica e a diastólica — pode fazer você subestimar a sistólica se não insuflar o suficiente; por isso a checagem palpatória antes. Diferença > 15–20 mmHg entre os braços sugere doença arterial (ex.: coarctação, dissecção/subclávia).'),
            H('Hipotensão ortostática'),
            EV('Definição: queda ≥ 20 mmHg na sistólica ou ≥ 10 mmHg na diastólica ao passar de deitado para em pé (aferir aos 1 e 3 min). É causa frequente de tontura e quedas, sobretudo em idosos, desidratados e em uso de anti-hipertensivos/diuréticos.'),
            DOC('Registro: "PA 128/82 mmHg em MSD, sentado, manguito adequado. Sem hipotensão ortostática."'),
          ],
        },
        {
          id: 'm3-vitais', titulo: 'FC, FR, temperatura e oximetria',
          blocks: [
            H('Pulso e frequência cardíaca'),
            P('Avalie mais que o número: frequência, ritmo (regular/irregular), amplitude e simetria. Palpe o pulso radial por pelo menos 30 s (60 s se irregular). Déficit de pulso — FC central (ausculta) maior que a periférica (pulso) — sugere fibrilação atrial ou extrassístoles.'),
            H('Frequência respiratória — o sinal esquecido'),
            P('É o primeiro sinal vital a se alterar na deterioração clínica e o mais negligenciado. Conte sem avisar o paciente (ou ele controla voluntariamente), idealmente enquanto finge ainda estar palpando o pulso. Observe padrão, profundidade, regularidade e sinais de esforço (tiragem, uso de musculatura acessória).'),
            WARN('FR > 20–24 irpm mantida é frequentemente o primeiro alarme de sepse, TEP, acidose ou insuficiência respiratória — antes da queda de saturação. Uma FR "normal" registrada como 16 sem ter sido de fato contada é uma armadilha perigosa.'),
            H('Temperatura e oximetria'),
            UL(
              'Temperatura: informe o local (axilar subestima ~0,5 °C em relação à central). Febre ≠ hipertermia (a segunda é falha de termorregulação, não sobe com antitérmico).',
              'Oximetria (SpO₂): confira se há curva pletismográfica boa antes de confiar no número.',
              'Falseiam a SpO₂: má perfusão/frio, movimento, esmalte, e — importante — a saturação pode parecer normal na intoxicação por CO (a carboxiemoglobina engana o sensor).'
            ),
            EV('Pele mais pigmentada: oxímetros de dedo têm maior taxa de hipoxemia oculta (SpO₂ "normal" com PaO₂ baixa) em pessoas negras. Diante de discrepância clínica, valorize o quadro e considere gasometria — não descarte hipoxemia só pela SpO₂.'),
          ],
        },
        {
          id: 'm3-avaliacao-inicial', titulo: 'Avaliação inicial: olho clínico, hálito e coloração (Aula real, Parte 3)',
          blocks: [
            P('Os primeiros 30 segundos de consulta já rendem exame físico: dá para classificar o estado geral, notar o biótipo, a fácies e a coloração da pele mesmo enquanto o paciente ainda está sentando ou contando a queixa. Essa leitura simultânea à anamnese é o que se chama de "olho clínico" — uma habilidade que se desenvolve com estudo e prática, e que sozinha às vezes já fecha o diagnóstico.'),
            H('Estado geral'),
            UL('BEG — bom estado geral.', 'REG — regular estado geral.', 'MEG — mau estado geral.'),
            H('Hálito'),
            UL(
              'Hálito urêmico (IRC) — odor de amônia/urina.',
              'Hálito cetônico (DM descompensado) — odor adocicado/frutas.',
              'Hálito etílico — excesso de aldeído expirado.',
              'Trimetilaminúria — odor de peixe podre.',
              'Hálito fecalóide — obstrução intestinal.'
            ),
            H('Coloração de pele e mucosas'),
            P('Avalie na pele, palma das mãos, conjuntiva ocular e mucosa oral — registrando em cruzes quando aplicável.'),
            UL(
              'Corado — normal.',
              'Descorado — neoplasias, perdas sanguíneas pequenas e constantes, doenças crônicas.',
              'Pálido — perda sanguínea intensa, choque, má perfusão periférica.',
              'Pletórico — poliglobulia (DPOC), policitemia, corticoterapia, síndrome de Cushing.'
            ),
            foto('02-exame-fisico-geral-parte-03', 14, 'Coloração da pele e mucosas — referência de avaliação.'),
          ],
        },
        {
          id: 'm3-hidratacao-cianose', titulo: 'Hidratação, turgência jugular, perfusão e cianose (Aula real, Parte 4)',
          blocks: [
            H('Estado de hidratação'),
            P('Avalia-se pela umidade/elasticidade/turgor da pele, umidade de mucosas, fontanelas (em crianças), globo ocular, estado psíquico, PA e pulso, além de queixas de sede, alteração de peso e diurese.'),
            H('Turgência venosa jugular'),
            UL(
              'Estase jugular avaliada em graus de elevação da cabeceira: 0°, 30°, 45°, 60° e 90°.',
              'Sinal de Kussmaul — aumento paradoxal da PVJ durante a inspiração: miocardiopatia constritiva, ICC direita grave, infarto de VD.',
              'Método de Gaertner — cabeceira a 45°, eleva-se passivamente o membro superior e observa-se a turgência das veias da mão; pressão venosa normal = colapso na altura do ângulo esternal.'
            ),
            TIP('A turgência jugular é uma estimativa indireta e à beira-leito da pressão venosa central — útil para diferenciar congestão (ICC direita, tamponamento) de hipovolemia sem precisar de exame invasivo.'),
            H('Perfusão tecidual'),
            P('Avalie leito ungueal e tempo de enchimento capilar — refletem a microcirculação em quadros hemodinâmicos (IAM, sepse, choques cardiogênico/distributivo/hemorrágico) e a perfusão específica de extremidades em obstrução arterial.'),
            H('Cianose'),
            UL(
              'Periférica — lábios, ponta do nariz, malares, lóbulo da orelha, língua, palato, extremidades; causa mais comum é exposição ao frio (vasoconstrição); também ICC, choque, TVP.',
              'Central — hipóxia sistêmica: O₂ inspirado baixo (altitude), transtorno de ventilação (asma/DPOC, depressão do centro respiratório), transtorno de difusão (fibrose, pneumonia, congestão), transtorno de perfusão (TEP, cardiopatias) ou shunt D–E (T4F, CIA, CIV).',
              'Mista — dois mecanismos somados, como na ICC (congestão pulmonar + estase venosa periférica).',
              'Alteração de hemoglobina — metahemoglobinemia (CO, anestésicos, substâncias tóxicas).'
            ),
            WARN('Cianose central sempre indica hipóxia sistêmica e deve ser investigada com urgência; cianose periférica isolada, com extremidades frias e o resto do paciente corado, aponta primeiro para causa local/vascular.'),
            foto('03-exame-fisico-geral-parte-04', 13, 'Cianose central x periférica — pontos de avaliação.'),
          ],
        },
        {
          id: 'm3-galeria-ectoscopia', titulo: 'Galeria complementar — fácies, biótipos e achados de ectoscopia (aula real)',
          blocks: [
            P('Conjunto de slides originais da aula que ilustram fácies, biótipos e demais achados de ectoscopia citados nos tópicos acima. Use como banco de imagens para revisão visual — a legenda indica apenas o número do slide original.'),
            galeria('04-exame-fisico-geral-parte-05', 12, 86),
          ],
        },
        {
          id: 'm3-galeria-hidratacao', titulo: 'Galeria complementar — hidratação, perfusão e sinais vitais (aula real)',
          blocks: [
            P('Slides originais complementares às Partes 6 e 7 da aula real de Exame Físico Geral.'),
            galeria('05-exame-fisico-geral-parte-06', 12, 54),
            galeria('06-exame-fisico-geral-parte-07', 12, 51),
          ],
        },
      ],
    },

    // =========================================================================
    // MÓDULO 4 — CABEÇA E PESCOÇO (Aula real: Exame Geral/Crânio/Face,
    // Glândulas salivares/nariz/boca, Exame otológico e oftalmológico)
    // =========================================================================
    {
      id: 4, nome: 'Cabeça e Pescoço',
      resumo: 'Crânio, face, ORL (nariz/boca/orofaringe), ouvido e olhos — sinais clássicos e eponímicos do exame cranio-caudal.',
      topicos: [
        {
          id: 'm4cp-cranio-face', titulo: 'Crânio e face: forma, posição e sinais da face',
          blocks: [
            P('O crânio normal é arredondado, com proeminência frontal e occipital, formado por sete ossos (2 frontais, 2 parietais, 2 temporais e 1 occipital) fundidos e cobertos pelo couro cabeludo. O roteiro de exame segue: tamanho e forma do crânio → posição e movimentos → superfície e couro cabeludo → face → olhos/nariz/lábios/boca → ORL.'),
            H('Tamanho'),
            UL(
              'Macrocefalia — sífilis congênita, hidrocefalia, acromegalia, raquitismo.',
              'Microcefalia — toxoplasmose, rubéola, HSV, EBV, Zika (infecções congênitas do grupo TORCH-like).'
            ),
            H('Forma'),
            UL(
              'Turricefalia (crânio em torre) e escafocefalia (casco de navio invertido).',
              'Dolicocefalia — aumento do diâmetro ântero-posterior; braquicefalia — aumento do diâmetro transverso.',
              'Plagiocefalia — crânio saliente anteriormente de um lado e posteriormente do outro.',
              'Nariz em sela e fronte olímpica — estigmas associados a sífilis congênita.'
            ),
            foto('01-exame-geral-cranio-e-face', 22, 'Turricefalia e escafocefalia.'),
            foto('01-exame-geral-cranio-e-face', 24, 'Braquicefalia e dolicocefalia.'),
            foto('01-exame-geral-cranio-e-face', 26, 'Plagiocefalia.'),
            H('Posição e movimento'),
            UL(
              'Desvio (torcicolo) e movimentos anormais (tiques, coreia, tremores).',
              'Sinal de De Musset — balançar da cabeça para frente, sincrônico com o pulso: insuficiência aórtica.',
              'Sinal de Felletti — balançar da cabeça para trás: aneurisma de aorta descendente.'
            ),
            foto('01-exame-geral-cranio-e-face', 28, 'Torcicolo congênito.'),
            H('Superfície e couro cabeludo'),
            UL(
              'Fontanela: fecha entre 9–18 meses; hipertensa/saliente (meningite, hidrocefalia); hipotensa/deprimida (desidratação).',
              'Consistência óssea amolecida (palpar acima do pavilhão auricular) — osteomalacia, sífilis, raquitismo.',
              'Couro cabeludo: distribuição, quantidade, aspecto, higiene e parasitas.'
            ),
            H('Face — inspeção'),
            P('Analise simetria, mímica facial, pele e pelos. Alterações de coloração (palidez, cianose, icterícia) e o eritema em asa de borboleta nas regiões malares (lúpus eritematoso sistêmico) são achados-chave.'),
            UL(
              'Paralisia facial (assimetria, VII par) e infecções (erisipela, herpes zoster).',
              'Madarose (queda de sobrancelha) — sífilis, hanseníase, hipotireoidismo (sinal da Rainha Ana da Dinamarca).',
              'Sinal de Vacher — desconforto à compressão do tragus (otite média aguda).',
              'Sinal de Hutchinson — vesícula na ponta do nariz que precede herpes zoster oftálmico (risco de acometimento ocular); homônimo também descrito no melanoma acral.',
              'Pupilas de Hutchinson — midríase paralítica ipsilateral a hematoma cerebral por compressão do III par.',
              'Sinal de Bell — paralisia do VII par: incapacidade de ocluir as pálpebras com motricidade ocular preservada.',
              'Sinal de Romaña — edema periorbital unilateral por picada do barbeiro (porta de entrada da doença de Chagas).'
            ),
            H('Sinais oculares de hipertireoidismo'),
            UL(
              'Sinal de Dalrymple — abertura excessiva das pálpebras (retração palpebral).',
              'Sinal de Rosenbach — tremor palpebral fino ao fechar os olhos.',
              'Sinal de Moebius — incapacidade de convergir os olhos.',
              'Lid lag — a pálpebra superior "atrasa" ao acompanhar o olhar para baixo.'
            ),
            P('Pupila de Argyll Robertson: perda do reflexo fotomotor com reflexo de acomodação preservado — clássica de neurossífilis.'),
            WARN('Sinal de Hutchinson no herpes zoster oftálmico é uma bandeira vermelha para encaminhamento oftalmológico urgente pelo risco de acometimento corneano/ocular grave.'),
            galeria('01-exame-geral-cranio-e-face', 12, 167),
          ],
        },
        {
          id: 'm4cp-glandulas-boca', titulo: 'Glândulas salivares, nariz e boca',
          blocks: [
            H('Glândulas salivares'),
            P('Inspeção seguida de palpação dirigida: parótida (manual, bimanual ou em pinça) e submandibular (manual/bimanual) — atenção para não confundir a glândula submandibular com linfonodos submandibulares adjacentes.'),
            UL('Parotidite — dor e aumento de volume da parótida, pode causar assimetria facial.', 'Nódulos parotídeos e cálculos de ducto salivar.'),
            foto('02-glandulas-salivares-nariz-e-boca', 13, 'Assimetria de face provocada por parotidite.'),
            H('Nariz'),
            UL(
              'Inspeção da pirâmide nasal — deformidade, laterorrinia (desvio lateral).',
              'Inspeção do septo — perfuração (leishmaniose, uso de cocaína).',
              'Linhas de Dennie-Morgan e prega/dobra nasal transversa — marcadores de rinite alérgica ("saudação do alérgico").',
              'Fratura nasal — possível epistaxe, estalido ("crunch"/"crack"), diagnóstico clínico confirmado por radiografia de ossos próprios.'
            ),
            foto('02-glandulas-salivares-nariz-e-boca', 16, 'Linhas de Dennie-Morgan.'),
            foto('02-glandulas-salivares-nariz-e-boca', 18, 'Saudação do alérgico.'),
            foto('02-glandulas-salivares-nariz-e-boca', 20, 'Prega nasal transversa.'),
            H('Boca — lábios e mucosa'),
            UL(
              'Lábios: cor, umidade, úlceras, nódulos, manchas — herpes simples, queilite angular, queilite actínica, angioedema (edema de Quincke), neoplasia labial.',
              'Mucosa oral: coloração, úlceras, manchas brancas, nódulos, morsicatio mucosae oris (lesão por hábito de morder a mucosa).'
            ),
            H('Boca — gengivas e dentes'),
            UL(
              'Gengiva escurecida em pessoas negras é variante normal; linha de Burton (uso de fenitoína); gengivite/retração gengival; gengiva edemaciada e sangrante na leucemia; sarcoma de Kaposi.',
              'Dentes mal conservados são porta de entrada para infecções (celulite, endocardite bacteriana); dentes de Hutchinson e diastema de Gaucher.'
            ),
            H('Boca — palato, língua e orofaringe'),
            UL(
              'Palato: coloração (perfusão, anemia, icterícia, candidíase) e castanho-escuro na doença de Addison; manchas de Koplik (sarampo) e de Forchheimer (precedem rubéola em ~20% dos casos).',
              'Língua: saburrosa, negra (Aspergillus niger), leucoplasia pilosa, candidíase, geográfica, escrotal, fissurada; glossite atrófica ("língua careca") — deficiência de B12, ferro, tiamina, riboflavina, pelagra, beriberi, álcool, próteses mal ajustadas.',
              'Língua em framboesa — escarlatina.',
              'Úvula/tonsilas: úvula bífida; úvula pulsátil = sinal de Müller (equivalente ao sinal de Musset), insuficiência aórtica; tamanho das tonsilas e quadros de faringite/amigdalite/mononucleose infecciosa.'
            ),
            foto('02-glandulas-salivares-nariz-e-boca', 61, 'Linha de Burton (uso de fenitoína).'),
            foto('02-glandulas-salivares-nariz-e-boca', 95, 'Glossite atrófica ("língua careca").'),
            galeria('02-glandulas-salivares-nariz-e-boca', 12, 122),
          ],
        },
        {
          id: 'm4cp-otologico-oftalmo', titulo: 'Exame otológico e oftalmológico',
          blocks: [
            H('Exame otológico — roteiro'),
            UL(
              'Inspeção do pavilhão auricular; inspeção/palpação da mastóide; linfonodos retroauriculares.',
              'Otoscopia; acumetria (diapasão e teste do sussurro).'
            ),
            H('Pavilhão auricular'),
            UL('Neoplasias (carcinoma basocelular), tofos (gota), nódulos reumáticos (artrite reumatoide), hanseníase lepromatosa, quelóide, lesões por atrito ("orelha de couve-flor" em lutadores).'),
            H('Mastóide e sinais de fratura de base de crânio'),
            UL(
              'Sinal de Battle — equimose retroauricular.',
              'Outros sinais de fratura de base de crânio: olhos de guaxinim (equimose periorbital bilateral), rinorreia liquórica, otoliquorreia.',
              'Dor à palpação da mastóide — mastoidite.'
            ),
            foto('03-exame-otologico-e-oftalmologico', 20, 'Sinal de Battle.'),
            H('Achados otoscópicos'),
            UL(
              'Corpo estranho e cerúmen impactado no CAE.',
              'Ouvido de nadador — exostoses + hiperemia do CAE; otite externa — edema do CAE, otorreia.',
              'Otite externa crônica — escoriação e hiperemia do CAE, vs. tímpano normal.',
              'Otite média aguda — tímpano opaco, hiperemiado e abaulado; otite média serosa — drenagem purulenta, bolhas, hiperemia timpânica.',
              'Perfuração timpânica; hemotímpano agudo e sua evolução em ~3 semanas.',
              'Síndrome de Ramsay-Hunt — herpes zóster do gânglio geniculado (paralisia facial + vesículas no CAE/pavilhão).'
            ),
            foto('03-exame-otologico-e-oftalmologico', 33, 'Otite média aguda: tímpano opaco, hiperemiado e abaulado.'),
            H('Acumetria'),
            P('Teste do sussurro: sussurrar por trás do paciente, ocluindo um ouvido de cada vez, pedindo para repetir a sequência de palavras (repetir se houver erro); pode-se usar fricção dos dedos próximos ao ouvido. Uso do diapasão nos testes de Rinne e Weber (parte do exame neurológico dos pares cranianos).'),
            H('Olhos — roteiro de avaliação'),
            P('A avaliação ocular combina o exame oftalmológico específico (fundo de olho, acuidade e campo visual, córnea, íris), o exame neurológico (campo visual, reflexos pupilares) e achados do exame físico geral (icterícia, anemia conjuntival).'),
            UL(
              'Pálpebras — edema, lesões, blefarite; ptose palpebral (picada de jararaca, miastenia gravis, lesão do III par).',
              'Glândula/saco lacrimal — dacriocistite; lacrimejamento por sinusite ou conjuntivite.',
              'Cílios — entrópio (borda palpebral vira para dentro), ectrópio (vira para fora), lagoftalmo (fechamento incompleto).',
              'Lesões perioculares — celulite periorbital, abscesso orbital; icterícia conjuntival.',
              'Pinguécula e pterígio (lesões conjuntivais); hordéolo (infecção aguda de glândula palpebral) e calázio (obstrução crônica).',
              'Conjuntivite viral vs. bacteriana; glaucoma.'
            ),
            WARN('Ptose + midríase ipsilateral = suspeitar de compressão do III par (ex.: aneurisma de comunicante posterior, herniação uncal) até prova em contrário. Celulite periorbital com dor à movimentação ocular, proptose ou diplopia sugere celulite orbitária — emergência com risco de extensão intracraniana.'),
            galeria('03-exame-otologico-e-oftalmologico', 12, 166),
          ],
        },
      ],
    },

    // =========================================================================
    // MÓDULO 5 — APARELHO RESPIRATÓRIO
    // =========================================================================
    {
      id: 5, nome: 'Aparelho Respiratório',
      resumo: 'Inspeção, palpação, percussão e ausculta do tórax e as grandes síndromes pleuropulmonares.',
      topicos: [
        {
          id: 'm5-pontos-anatomicos', titulo: 'Pontos de referência, pneumotórax e derrame (Aula real, Parte 1)',
          blocks: [
            P('O trato respiratório superior compreende fossas nasais, nasofaringe, bucofaringe e laringe; o inferior, traqueia, árvore brônquica e alvéolos. A respiração envolve 4 processos: ventilação pulmonar, trocas gasosas, transporte sanguíneo dos gases e respiração celular.'),
            H('Inspiração x expiração'),
            UL(
              'Inspiração — processo ativo: contração do diafragma e músculos acessórios (intercostais externos, paraesternais, escalenos, esternocleidomastóideo, trapézios, peitorais, abdominais) aumentam o volume torácico.',
              'Expiração — processo passivo: relaxamento dos músculos inspiratórios e retração elástica pulmonar reduzem o volume torácico.'
            ),
            H('Pontos de referência anatômica'),
            UL(
              'Anteriores — incisura supraesternal, clavículas, ângulo de Louis, prega axilar anterior, mamilos (5º EIC), ângulo de Charpy.',
              'Posteriores — coluna vertebral, 7ª vértebra cervical, borda superior da escápula (2ª costela), prega axilar posterior, ângulo inferior da escápula (7ª costela).'
            ),
            P('Ângulo de Louis (esternal) = junção do manúbrio com o corpo do esterno, na altura da 2ª costela e da 4ª vértebra torácica — o marco mais usado para contar espaços intercostais. Ângulo de Charpy (subcostal), formado pelas duas rebordas costais, caracteriza o biótipo: normolíneo ≈ 90°, longilíneo < 90°, brevilíneo > 90°.'),
            H('Marcos anatômicos de procedimento'),
            UL(
              '2º espaço intercostal → punção de alívio do pneumotórax hipertensivo.',
              '5º espaço intercostal → drenagem de tórax.',
              'T4 → margem inferior do tubo orotraqueal (controle radiográfico).',
              'T7–T8 → toracocentese.'
            ),
            foto('01-pontos-anatomicos-pneumotorax-derrame-pleural-posicao-do-iot', 12, 'Pontos de referência anatômica do tórax.'),
            H('Pneumotórax'),
            P('Presença de ar na cavidade pleural por ruptura da pleura parietal e/ou visceral, aumentando a pressão no espaço pleural e colapsando o pulmão.'),
            WARN('Pneumotórax hipertensivo: dor torácica, dispneia importante, hipotensão, taquicardia, MV ausente unilateral, desvio de traqueia e estase jugular — descompressão imediata com punção no 2º EIC, não espere imagem.'),
            H('Pleuras'),
            P('Folheto parietal reveste a parede torácica (e, sobre o diafragma, é chamado pleura diafragmática); o folheto visceral insinua-se entre os lobos formando as cisuras horizontal e oblíqua. Entre eles há um espaço virtual com pressão negativa e pequena quantidade de líquido que permite o deslizamento dos folhetos.'),
            galeria('01-pontos-anatomicos-pneumotorax-derrame-pleural-posicao-do-iot', 12, 37),
          ],
        },
        {
          id: 'm5-linhas-regioes', titulo: 'Linhas, regiões e projeções pulmonares (Aula real, Parte 2)',
          blocks: [
            P('A anatomia clínica do tórax serve para localizar achados com precisão: linhas verticais/horizontais, regiões torácicas e a projeção dos pulmões na parede.'),
            H('Linhas verticais'),
            UL(
              'Anteriores — médio-esternal (única e precisa, divide os hemitórax), esternal D/E, hemiclavicular D/E, paraesternal D/E.',
              'Posteriores — espondiléia/vertebral (única e precisa), escapular D/E (cruza o ângulo inferior da escápula), paravertebral D/E.',
              'Laterais — axilar anterior, axilar média, axilar posterior.'
            ),
            H('Linhas horizontais'),
            UL('Anteriores — clavicular superior/inferior, nível da 3ª costela, nível da 6ª costela.', 'Posteriores — borda superior e borda inferior da escápula.'),
            H('Regiões torácicas'),
            UL(
              'Face anterior — supraclavicular, clavicular, infraclavicular, mamária, inframamária (D/E), supraesternal, esternal superior e inferior.',
              'Face posterior — supraescapular, supraespinhal, infraespinhal, interescapulovertebral, infraescapular.',
              'Face lateral — axilar, infra-axilar.'
            ),
            H('Projeção dos pulmões na parede'),
            UL(
              'Supraclavicular/supraescapular → ápice pulmonar.',
              'Infraclavicular → maior parte do lobo superior (LS); mamária/inframamária → lobo médio (LM) e parte do lobo inferior (LI).',
              'Região esternal → bifurcação da traqueia.',
              'Supraespinhal → LS; infraescapular → LI e fundo de saco pleural.',
              'Axilar D → LSD; infra-axilar D → parte do LSD, LID e junção das fissuras.',
              'Axilar E → LSE; infra-axilar E → parte do LSE, LIE e fundo de saco pleural.'
            ),
            foto('02-linhas-regioes-e-projecoes', 13, 'Linhas torácicas verticais anteriores.'),
            foto('02-linhas-regioes-e-projecoes', 20, 'Regiões do tórax — face anterior.'),
            galeria('02-linhas-regioes-e-projecoes', 12, 27),
          ],
        },
        {
          id: 'm5-inspecao-real', titulo: 'Inspeção estática e dinâmica do tórax (Aula real, Parte 3)',
          blocks: [
            P('Exame com paciente sentado ou deitado, tórax desnudo, sempre comparando os hemitórax.'),
            H('Inspeção estática — assimetrias'),
            UL(
              'Abaulamentos localizados — derrame pleural, enfisema unilateral, hepato/esplenomegalia, pneumotórax, cardiopatias congênitas (região mamária E).',
              'Sinal de Lemos Torres — abaulamento nos últimos espaços intercostais, na linha axilar posterior, durante a expiração; sempre patológico, indica derrame pleural de pequeno/médio volume (paciente sentado, examinador atrás).',
              'Retrações — fibrose do parênquima/pleura correspondente, atelectasia pulmonar ou lobar.'
            ),
            P('Descrever também: pele e anexos, cicatrizes, circulação colateral, ângulo de Charpy, politelia e ginecomastia.'),
            H('Circulação colateral superficial do tórax'),
            P('Estase venosa nítida no pescoço, MMSS e face anterior do tronco, com veias dirigindo-se de cima para baixo até a VCI. A síndrome de compressão da veia cava superior (VCS) — por exemplo por câncer brônquico com metástases mediastinais — causa estase jugular bilateral não pulsátil, cianose, edema da metade superior do tronco e pescoço ("em pellerine") e circulação colateral, mais evidentes em esforços expiratórios (tosse, Valsalva).'),
            foto('03-inspecao', 13, 'Circulação colateral superficial do tórax.'),
            H('Formas do tórax'),
            UL(
              'Infundibuliforme (pectus excavatum) — depressão do 1/3 inferior do esterno até o apêndice xifoide.',
              'Cariniforme (pectus carinatum) — em quilha.',
              'Cônico/em sino; cifoescoliótico; cleido aplásico.',
              'Em tonel (enfisematoso) — aumento exagerado do diâmetro ântero-posterior, tórax longo, típico do DPOC tipo "soprador rosado" (pink puffer — idoso, magro, dispneia intensa, ortopneia — "Dom Quixote"), em contraste com o "blue bloater" (obeso, pletórico, cianótico, dispneia leve, edemaciado, ICC — "Sancho Pança").',
              'Paralítico/achatado.'
            ),
            foto('03-inspecao', 22, 'Tórax em tonel (enfisematoso).'),
            H('Inspeção dinâmica'),
            UL(
              'Tipo respiratório: costal superior (predomínio em mulheres), costo-abdominal (predomínio em homens), misto.',
              'Ritmos: dispneia suspirosa; ritmo de Cantani (↑ FR e amplitude, sem apneia, precede Kussmaul); Kussmaul (mais acentuado, com períodos de apneia); Cheyne-Stokes (hiperpneia crescente-decrescente seguida de apneia); Biot (irregular em amplitude, intervalos e apneias).',
              'Frequência normal em repouso: homens 16–20 irpm, mulheres 18–24 irpm; crianças variam de 30–60 irpm (<1 ano) até 12–16 irpm (adolescentes).',
              'Reflexo de Hering-Breuer — mantém a respiração normal, regulando a amplitude inspiratória e prevenindo hiperinsuflação (estiramento dos receptores pulmonares → aferência vagal → interrompe a inspiração).',
              'Expansão respiratória: aumento bilateral (acidose metabólica); diminuição bilateral (hipóxia, rigidez torácica, enfisema, dor); diminuição unilateral (derrame, paquipleuris, pneumotórax, pneumonia, fibrose, bronquiectasias).',
              'Tiragem — depressão dinâmica dos espaços intercostais durante toda a inspiração; unilateral (obstrução brônquica regional) ou bilateral (asma, enfisema, obstrução traqueal/brônquica bilateral).',
              'Cornagem/traqueísmo — respiração ruidosa por obstáculo nas VAS/laringe/traqueia/brônquios; episódica (corpo estranho, edema de glote, espasmo laríngeo, coqueluche) ou permanente (obstrução neoplásica/inflamatória).'
            ),
            galeria('03-inspecao', 12, 41),
          ],
        },
        {
          id: 'm5-palpacao-ausculta-galeria', titulo: 'Palpação do tórax e traqueia/tireoide (aula real, Parte 4 e 6)',
          blocks: [
            H('Palpação do tórax'),
            UL(
              'Expansibilidade torácica — mãos espalmadas na face posterior/lateral do tórax com os polegares se aproximando na linha média; peça inspiração profunda e compare a amplitude do afastamento dos polegares dos dois lados.',
              'Frêmito toracovocal (FTV) — vibração da voz transmitida à parede, palpada enquanto o paciente repete "trinta e três"; aumentado na consolidação, diminuído/abolido no derrame e no pneumotórax (ver síntese na sequência).',
              'Elasticidade torácica — compressão ântero-posterior e látero-lateral do tórax; reduzida no idoso e no tórax enfisematoso.',
              'Pesquisa de enfisema subcutâneo — crepitação à palpação da parede, sugerindo ar dissecando o tecido subcutâneo (ex.: após pneumotórax ou trauma torácico).'
            ),
            galeria('04-palpacao', 12, 31),
            H('Traqueia e tireoide'),
            UL(
              'Palpação da traqueia na fúrcula esternal — deve estar centrada; desvio sugere assimetria de pressão intratorácica (pneumotórax hipertensivo empurra a traqueia para o lado oposto; atelectasia/fibrose "puxa" a traqueia para o mesmo lado da lesão).',
              'Palpação da tireoide — abordagem posterior (examinador atrás do paciente) ou anterior; peça para o paciente deglutir (a glândula sobe e desce, confirmando que a massa palpada é tireoidiana).',
              'Achados: bócio difuso (hipertireoidismo, tireoidite), nódulo único (investigar risco de malignidade), bócio multinodular, dor à palpação (tireoidite subaguda).'
            ),
            galeria('06-traqueia-e-tireoide', 12, 18),
          ],
        },
        {
          id: 'm5-ausculta-galeria-real', titulo: 'Ausculta do tórax — aula real (Parte 5)',
          blocks: [
            P('Complementa a síntese de ausculta pulmonar (sons normais e adventícios) com os slides originais desta parte da aula real.'),
            galeria('05-ausculta', 12, 19),
          ],
        },
        {
          id: 'm4-metodo', titulo: 'Os quatro tempos no tórax',
          blocks: [
            SVG(svgTorax, 'Divisão em ápices e bases; a linha média separa os hemitórax para comparação sistemática lado a lado.'),
            foto('01-pontos-anatomicos-pneumotorax-derrame-pleural-posicao-do-iot', 12, 'Pontos de referência anatômica do tórax (foto real da aula).'),
            P('O princípio de ouro do exame torácico é a comparação sistemática entre lados homólogos: sempre examine o mesmo ponto à direita e à esquerda antes de descer. A assimetria é o achado mais valioso.'),
            H('Inspeção'),
            UL(
              'Forma do tórax, simetria, padrão e frequência respiratórios.',
              'Tiragem (intercostal, supraclavicular), uso de musculatura acessória, batimento de asa de nariz.',
              'Expansibilidade: reduzida do lado doente (derrame, consolidação extensa, pneumotórax).'
            ),
            H('Palpação — frêmito toracovocal (FTV)'),
            P('Peça ao paciente para dizer "trinta e três" enquanto você palpa comparando os dois lados. O FTV é a vibração da voz transmitida à parede. Regra: sólido transmite melhor, ar/líquido transmitem pior.'),
            UL(
              'FTV aumentado → consolidação (pneumonia): o pulmão cheio de exsudato conduz melhor.',
              'FTV diminuído/abolido → derrame pleural e pneumotórax: líquido ou ar isolam a vibração.'
            ),
            H('Percussão'),
            UL(
              'Som claro pulmonar = normal (ar).',
              'Macicez/submacicez → consolidação ou derrame (o derrame dá macicez "de pedra", mais intensa).',
              'Hipertimpanismo → pneumotórax ou hiperinsuflação (DPOC, crise asmática).'
            ),
          ],
        },
        {
          id: 'm4-ausculta', titulo: 'Ausculta pulmonar: sons normais e adventícios',
          blocks: [
            P('Ausculte com o diafragma, pele a pele, comparando lados homólogos, do ápice à base, pedindo respirações profundas pela boca. Identifique primeiro o som de base e depois os ruídos adventícios.'),
            H('Sons normais'),
            UL(
              'Murmúrio vesicular (MV) — suave, predomina na inspiração, ouvido na maior parte dos campos.',
              'Som brônquico — mais rude, expiração longa; normal na traqueia. Se aparecer na periferia = anormal (indica consolidação).'
            ),
            H('Ruídos adventícios'),
            UL(
              'Estertores finos (crepitantes) — "velcro", teleinspiratórios: edema pulmonar, fibrose, pneumonia.',
              'Estertores grossos (bolhosos) — secreção em vias maiores; mudam com a tosse.',
              'Sibilos — agudos, expiratórios: broncoespasmo (asma, DPOC); sibilo localizado fixo → corpo estranho/tumor.',
              'Roncos — graves, por secreção em vias grandes.',
              'Atrito pleural — "couro novo", inspiratório e expiratório, some quando o paciente prende a respiração.'
            ),
            H('Transmissão vocal'),
            P('Na consolidação, a voz é transmitida melhor: broncofonia (voz mais nítida), pectorilóquia (sussurro audível) e egofonia (o "i" falado soa como "é"). Todos apontam pulmão sólido.'),
            EV('Desempenho: nenhum sinal isolado fecha pneumonia. A combinação de FTV aumentado + macicez + som brônquico/crepitações + egofonia (síndrome de consolidação) tem bom valor; egofonia isolada tem LR+ em torno de 4–5. Ausência de qualquer alteração torna pneumonia menos provável, mas não a exclui — daí a radiografia.'),
          ],
        },
        {
          id: 'm4-sindromes', titulo: 'Síndromes pleuropulmonares — o quadro que fecha o diagnóstico',
          blocks: [
            P('Reconhecer o padrão combinado dos quatro tempos permite nomear a síndrome à beira do leito. Guarde esta tabela — ela é a mais cobrada em provas e OSCE.'),
            H('Consolidação (ex.: pneumonia)'),
            UL('Expansibilidade ↓ · FTV ↑ · Percussão macica · Ausculta: som brônquico + crepitações + egofonia.'),
            H('Derrame pleural'),
            UL('Expansibilidade ↓ · FTV ↓/abolido · Percussão macica ("de pedra") · Ausculta: MV ↓/abolido; sopro pleurítico no limite superior.'),
            H('Pneumotórax'),
            UL('Expansibilidade ↓ · FTV ↓/abolido · Percussão hipertimpânica · Ausculta: MV ↓/abolido.'),
            H('Atelectasia (obstrução)'),
            UL('Expansibilidade ↓ · FTV variável (↓ se brônquio ocluído) · Percussão macica · Ausculta: MV ↓; desvio do mediastino para o lado doente.'),
            WARN('Red flags respiratórias: FR > 30, SpO₂ < 90% em ar ambiente, uso de musculatura acessória, cianose, incapacidade de completar frases, MV abolido com hipertimpanismo + desvio de traqueia contralateral + instabilidade (pneumotórax hipertensivo — descompressão imediata, não espere imagem).'),
            DOC('Registro (derrame à E): "Expansibilidade reduzida em base E, FTV abolido, macicez à percussão e MV abolido no terço inferior do hemitórax E. Restante dos campos com MV preservado, sem ruídos adventícios."'),
          ],
        },
      ],
    },

    // =========================================================================
    // MÓDULO 6 — SISTEMA CARDIOVASCULAR
    // =========================================================================
    {
      id: 6, nome: 'Sistema Cardiovascular e Vascular Periférico',
      resumo: 'Precórdio, bulhas e sopros; e o exame vascular periférico real: pulsos, edemas, isquemia arterial, veias e linfáticos.',
      topicos: [
        {
          id: 'm5-focos', titulo: 'Precórdio, ictus e focos de ausculta',
          blocks: [
            SVG(svgTorax, 'Focos de ausculta: aórtico (2º EICD), pulmonar (2º EICE), tricúspide (4º–5º EIE junto ao esterno) e mitral (5º EIE na linha hemiclavicular = ictus).'),
            foto('02-linhas-regioes-e-projecoes', 13, 'Linhas e pontos de referência do tórax usados para localizar os focos de ausculta (foto real da aula).'),
            P('A inspeção e palpação do precórdio precedem a ausculta. O achado mais informativo é o ictus cordis (impulso apical), normalmente no 5º espaço intercostal esquerdo, na linha hemiclavicular, com ~1–2 cm.'),
            UL(
              'Ictus desviado para baixo e para a esquerda, mais amplo e sustentado → dilatação de VE (sobrecarga de volume, ex.: insuficiência aórtica/mitral).',
              'Ictus hipercinético e sustentado sem desvio → hipertrofia (sobrecarga de pressão, ex.: estenose aórtica, HAS).',
              'Frêmito palpável = sopro intenso (≥ 4/6); indica turbulência importante.'
            ),
            H('Os quatro focos'),
            UL(
              'Aórtico — 2º EIC direito, junto ao esterno.',
              'Pulmonar — 2º EIC esquerdo.',
              'Tricúspide — 4º–5º EIC esquerdo, borda esternal.',
              'Mitral — 5º EIC esquerdo, linha hemiclavicular (coincide com o ictus).'
            ),
          ],
        },
        {
          id: 'm5-bulhas', titulo: 'Bulhas e ritmos: B1, B2, B3, B4',
          blocks: [
            P('B1 (fechamento de mitral e tricúspide) marca o início da sístole; B2 (fechamento de aórtica e pulmonar) marca o início da diástole. Identifique-as palpando o pulso carotídeo: a bulha que coincide com o pulso é B1.'),
            UL(
              'Desdobramento fisiológico de B2 — aumenta na inspiração (a aórtica fecha antes da pulmonar); normal em jovens.',
              'B3 — protodiastólica, som surdo ("Ken-tu-cky"); fisiológica em jovens/atletas, mas em adulto/idoso sugere disfunção sistólica e sobrecarga de volume (ICC).',
              'B4 — pré-sistólica ("Ten-nes-see"); ventrículo rígido (hipertrofia, isquemia, estenose aórtica). Nunca é normal em idoso quando patológica.'
            ),
            EV('Desempenho: a B3 em adulto tem alta especificidade para disfunção ventricular e elevação da pressão de enchimento (LR+ elevado para ICC), embora seja pouco sensível — ou seja, ouvir B3 pesa muito a favor de ICC, mas não ouvir não exclui. É um dos poucos sinais de exame com forte valor mantido pela evidência.'),
            TIP('Ritmo de galope = B3 ou B4 somada à taquicardia, lembrando o galopar de um cavalo. Em contexto de dispneia, o galope por B3 é uma das pistas de cabeceira mais fortes de que a causa é cardíaca (ICC).'),
          ],
        },
        {
          id: 'm5-sopros', titulo: 'Sopros e manobras dinâmicas',
          blocks: [
            P('Caracterize todo sopro por: tempo (sistólico/diastólico), foco de maior intensidade, irradiação, intensidade (escala de 1 a 6/6), configuração e o efeito das manobras. O tempo é o primeiro divisor.'),
            H('Sistólicos × diastólicos'),
            UL(
              'Sistólicos: estenose aórtica (foco aórtico, irradia para carótidas, tipo ejeção), insuficiência mitral (foco mitral, irradia para axila, holossistólico), CIV.',
              'Diastólicos: insuficiência aórtica (foco aórtico/borda esternal E, aspirativo, com o paciente sentado e inclinado à frente), estenose mitral (ruflar diastólico no ictus, em decúbito lateral esquerdo).'
            ),
            H('Manobras dinâmicas — como diferenciar sopros'),
            UL(
              'Inspiração aumenta sopros do lado DIREITO (retorno venoso ao VD) — manobra de Rivero-Carvallo para insuficiência tricúspide.',
              'Expiração/agachamento aumentam sopros do lado ESQUERDO e o de insuficiência aórtica.',
              'Valsalva e ortostatismo (↓ retorno venoso) aumentam o sopro da cardiomiopatia hipertrófica e do prolapso mitral, e diminuem quase todos os outros — pista quase patognomônica.',
              'Handgrip (↑ pós-carga) aumenta insuficiência mitral e aórtica; diminui CMH.'
            ),
            EV('Desempenho na estenose aórtica: o conjunto sopro que irradia para carótida + pulso carotídeo tardio/reduzido (pulsus parvus et tardus) + B2 hipofonética aumenta muito a probabilidade; a ausência de qualquer sopro sobre a base torna estenose aórtica importante improvável (bom valor de exclusão).'),
            WARN('Sopro diastólico é sempre patológico. Sopro sistólico novo com febre → pense endocardite. Síncope aos esforços + sopro de estenose aórtica é sinal de gravidade (risco de morte súbita) — investigação urgente.'),
            DOC('Registro: "Ritmo cardíaco regular, 2 tempos, B1 e B2 normofonéticas, sopro sistólico ejetivo 3/6 em foco aórtico com irradiação para carótidas. Sem B3/B4, sem atrito."'),
          ],
        },
        {
          id: 'm6v-anatomia-metodos', titulo: 'Exame vascular periférico: objetivos, anatomia e método (Aula real, Partes 1–2)',
          blocks: [
            P('O exame físico vascular fornece informações para: determinar presença e qualidade dos pulsos arteriais; identificar aneurismas e sopros arteriais; e reconhecer sinais de doença isquêmica arterial e de doença venosa.'),
            H('Preparação e sequência'),
            UL(
              'Preparo do paciente: sala aquecida, posição supina, privacidade, área a examinar descoberta, explicar a finalidade do exame.',
              'Sistematizar, comparar sempre bilateralmente e revisar as queixas conforme o exame avança.',
              'Sequência: observar (inspeção) → auscultar → tocar suavemente → palpar → comprimir. Não há percussão no exame vascular.'
            ),
            H('Inspeção'),
            UL('Coloração da pele (palidez, cianose), úlceras, alterações de pele e fâneros, edemas e vasos dilatados.'),
            H('Palpação — 17 pulsos possíveis'),
            P('Qualidade registrada em cruzes (−, +, ++, +++, ++++): temporal, carotídeo, braquial, radial, aorta, femoral, poplíteo, dorsal do pé (pedioso) e tibial posterior — a maioria bilateral.'),
            H('Ausculta — sopros'),
            P('Som gerado pela vibração das paredes arteriais por fluxo turbulento; indica lesão arterial ou compressão extrínseca. Pesquisar 7 sopros: carotídeo (x2), aorta (x1), femoral (x2), renal (x2).'),
            H('Rastreio de aneurismas'),
            P('Palpar/auscultar 5 locais: aorta (x1), femoral (x2), poplíteo (x2).'),
            H('Observações específicas por membro'),
            UL(
              '6 sinais de isquemia arterial: coloração, temperatura, enchimento capilar, ulcerações, escaras, localização.',
              '5 sinais venosos: coloração, ulcerações, localização, veias varicosas, edema.'
            ),
            galeria('01-anatomia-vascular-central-e-anatomia-arterial', 12, 21),
          ],
        },
        {
          id: 'm6v-pulsos-edemas', titulo: 'Palpação de pulsos e pesquisa de edemas (Aula real, Parte 3)',
          blocks: [
            P('A palpação de pulso é a sensação tátil do choque da onda de pulso a partir dos grandes vasos, palpável até as extremidades.'),
            H('O que avaliar em cada pulso'),
            UL(
              'Intensidade — normal ou filiforme.',
              'Frequência — bradi/normo/taquisfigmia.',
              'Ritmo — rítmico ou arrítmico.',
              'Amplitude/caráter/volume da onda — preferir artérias centrais para essa avaliação.'
            ),
            P('O pulso radial é usado rotineiramente para sinais vitais; no exame vascular completo, avalie todas as artérias palpáveis: carótida, subclávia, braquial, radial, aórtica, femoral, poplítea, tibial posterior e pediosa — e os linfonodos epitrocleares na região do pulso braquial.'),
            H('Atraso da onda de pulso'),
            P('Fisiologicamente os pulsos radiais são simultâneos e o pulso femoral antecede o radial ipsilateral em ~5 ms. Atraso ou diminuição do pulso femoral em relação ao radial sugere obstrução da aorta (coarctação, aortoarterite de Takayasu) — meça a PA em MMSS e MMII para confirmar.'),
            H('Teste de Allen'),
            P('Avalia a perviedade das artérias radial e ulnar e a integridade do arco palmar antes de procedimentos na artéria radial (ex.: gasometria, cateterismo).'),
            H('Pesquisa de edemas'),
            P('Sinal do cacifo ("Godet") — compressão digital sustentada sobre a região pré-tibial ou maleolar por alguns segundos; a persistência de uma depressão (fóvea) confirma edema com componente de fóvea (+ a ++++), típico de causas sistêmicas/venosas — diferente do linfedema, que tipicamente não deixa cacifo em fases avançadas.'),
            foto('03-palpacao-de-pulsos-e-edemas', 20, 'Sinal do cacifo (Godet).'),
            galeria('03-palpacao-de-pulsos-e-edemas', 12, 35),
          ],
        },
        {
          id: 'm6v-arterial-iapc', titulo: 'Achados arteriais patológicos, isquemia e IAPC (Aula real, Parte 4)',
          blocks: [
            P('Os achados arteriais patológicos relacionam-se, em geral, a bloqueio/oclusão ou dilatação de uma artéria, com isquemia e eventual gangrena tecidual como desfechos.'),
            H('Aneurismas e dissecção'),
            P('Dilatação patológica da parede arterial (aneurisma) e a dissecção de aorta — separação das camadas da parede arterial pelo fluxo sanguíneo — são achados de alto risco que podem se apresentar com dor torácica/abdominal súbita e assimetria de pulsos.'),
            H('Isquemia aguda — os 6 P'),
            UL(
              'Pulseless — sem pulso.', 'Pain — dor.', 'Pallor — palidez.',
              'Paresthesia — parestesia.', 'Paralysis — paralisia.', 'Poikilothermia — frio.'
            ),
            P('Causas: embolia, trombose, fratura, ferimento por arma de fogo/branca, torniquete. Implica risco de lesão permanente sem restituição imediata do fluxo — suscetibilidade decrescente: nervos (+++) > músculos (++) > tendões e ossos (+).'),
            WARN('Isquemia arterial aguda de membro com qualquer um dos 6 P é emergência cirúrgica vascular — o tempo até a revascularização determina se o membro é salvo.'),
            H('Isquemia arterial periférica crônica (IAPC)'),
            P('Processo gradual em que o organismo compensa via circulação colateral — mas a compensação nunca é tão boa quanto a circulação original, e o leito vascular sobrevive com menor irrigação.'),
            UL(
              'Mudanças no membro cronicamente isquêmico: crescimento diminuído de pele e unhas, perda de folículos pilosos e glândulas sebáceas.',
              'Resultado: pele seca, fina e sem pelos; unhas distróficas, suscetíveis a infecções fúngicas.',
              'Sinais: palidez, cianose e vasodilatação com pele fria, além das alterações tróficas descritas.'
            ),
            foto('04-achados-arteriais-patologicos-aneurismas-e-iapc', 20, 'Achados de isquemia arterial periférica crônica (IAPC).'),
            galeria('04-achados-arteriais-patologicos-aneurismas-e-iapc', 12, 29),
          ],
        },
        {
          id: 'm6v-gangrenas-real', titulo: 'Sinais clínicos e gangrenas na isquemia arterial (aula real, Parte 5)',
          blocks: [
            P('A isquemia arterial crônica não tratada progride para necrose tecidual (gangrena), classificada pelo mecanismo e aparência.'),
            UL(
              'Gangrena seca — necrose isquêmica sem infecção sobreposta; tecido escurecido, mumificado, bem delimitado do tecido viável; menor risco séptico imediato.',
              'Gangrena úmida — necrose com infecção secundária; tecido edemaciado, com odor fétido e secreção; risco de sepse e evolução rápida, geralmente exige desbridamento/amputação urgente.',
              'Gangrena gasosa — infecção por Clostridium (mionecrose), com crepitação à palpação por gás nos tecidos — emergência cirúrgica com alta mortalidade.'
            ),
            WARN('Linha de demarcação nítida entre tecido necrótico e viável sugere processo estável (gangrena seca); progressão rápida da linha, crepitação ou toxemia sistêmica indicam infecção necrosante — intervenção cirúrgica emergencial.'),
            galeria('05-sinais-clinicos-e-gangrenas', 12, 42),
          ],
        },
        {
          id: 'm6v-venoso-real', titulo: 'Anatomia venosa e trombose venosa profunda (aula real, Partes 6–7)',
          blocks: [
            H('Anatomia venosa dos membros inferiores'),
            UL(
              'Sistema superficial — veias safena magna (medial, do maléolo medial até a virilha) e safena parva (posterior, até a fossa poplítea).',
              'Sistema profundo — acompanha as artérias homônimas (tibiais, poplítea, femoral, ilíaca); carrega a maior parte do retorno venoso.',
              'Veias perfurantes — conectam o sistema superficial ao profundo, contendo valvas unidirecionais que impedem refluxo.'
            ),
            H('Trombose venosa profunda (TVP)'),
            P('Formação de trombo no sistema venoso profundo, tipicamente de membros inferiores, com risco de embolia pulmonar.'),
            UL(
              'Fatores de risco (tríade de Virchow): estase venosa (imobilização, viagens longas, ICC), lesão endotelial (cirurgia, trauma) e hipercoagulabilidade (neoplasia, trombofilias, gestação, uso de estrogênio).',
              'Sinais clínicos: edema unilateral assimétrico, dor/empastamento na panturrilha, calor local, dilatação venosa superficial colateral, sinal de Homans (dor à dorsiflexão do pé — pouco sensível/específico, não deve ser usado isoladamente para excluir/confirmar).',
              'Escores clínicos (ex.: Wells) orientam a probabilidade pré-teste; confirmação por ultrassom Doppler venoso.'
            ),
            WARN('TVP proximal (poplítea/femoral/ilíaca) tem maior risco embólico que a distal. Dispneia súbita, dor pleurítica ou taquicardia em paciente com suspeita de TVP levanta a hipótese de tromboembolismo pulmonar — investigação urgente.'),
            galeria('06-anatomia-venosa', 12, 17),
            galeria('07-tvp', 12, 22),
          ],
        },
        {
          id: 'm6v-varizes-ulceras-real', titulo: 'Varizes, úlceras de membros inferiores e doenças linfáticas (aula real, Partes 8–9)',
          blocks: [
            H('Varizes (insuficiência venosa crônica)'),
            P('Dilatação e tortuosidade das veias superficiais por incompetência valvular, levando a estase venosa crônica.'),
            UL(
              'Achados progressivos: veias varicosas visíveis → edema vespertino → hiperpigmentação (dermatite ocre, por depósito de hemossiderina) → lipodermatoesclerose → úlcera venosa.',
              'Fatores de risco: predisposição familiar, ortostatismo prolongado, gestação, obesidade, idade avançada.'
            ),
            H('Úlceras de membros inferiores — diferenciação por etiologia'),
            UL(
              'Úlcera venosa — região maleolar medial (região do "gaiter"), bordas irregulares, pouco dolorosa, com edema e hiperpigmentação associados; pulsos preservados.',
              'Úlcera arterial — extremidades distais (dedos, calcanhar) ou pontos de pressão, bordas bem demarcadas ("em saca-bocado"), muito dolorosa, pele fria, pulsos diminuídos/ausentes, piora com elevação do membro.',
              'Úlcera neuropática (diabética) — pontos de pressão plantar (cabeça de metatarsos), indolor (perda de sensibilidade protetora), halo de hiperqueratose ao redor.'
            ),
            WARN('Antes de indicar terapia compressiva para úlcera venosa, é obrigatório excluir doença arterial associada (medir índice tornozelo-braquial) — comprimir um membro com insuficiência arterial significativa pode precipitar isquemia crítica.'),
            H('Doenças linfáticas'),
            UL(
              'Linfedema — edema que tipicamente NÃO deixa cacifo em fases avançadas (fibrose tecidual), pode acometer o dorso do pé/dedos (sinal de Stemmer: impossibilidade de pinçar a prega cutânea do 2º dedo do pé).',
              'Primário — malformação linfática congênita/idiopática; secundário — obstrução por cirurgia (esvaziamento axilar/inguinal), radioterapia, filariose (causa infecciosa mais comum no mundo) ou neoplasia.',
              'Linfangite — estrias eritematosas lineares seguindo o trajeto linfático a partir de uma porta de entrada infecciosa, geralmente com linfonodomegalia regional dolorosa.'
            ),
            galeria('08-varizes', 12, 24),
            galeria('09-1-ulceras-de-membros-inferiores', 12, 30),
            galeria('09-2-doencas-linfaticas', 12, 18),
          ],
        },
        {
          id: 'm6v-linfonodos-real', titulo: 'Exame de linfonodos (aula real)',
          blocks: [
            P('A palpação de linfonodos acompanha o exame de cada região (cervical, supraclavicular, axilar, epitroclear, inguinal), sempre descrevendo: localização, tamanho, consistência, mobilidade, sensibilidade e sinais inflamatórios da pele sobrejacente.'),
            UL(
              'Linfonodo reacional/inflamatório — móvel, doloroso, consistência fibroelástica, geralmente com porta de entrada infecciosa identificável na drenagem correspondente.',
              'Linfonodo neoplásico — endurecido (pétreo), aderido a planos profundos, indolor, de crescimento progressivo.',
              'Linfonodo supraclavicular esquerdo (de Virchow/Troisier) — sinal clássico de neoplasia abdominal ou torácica avançada (drenagem do ducto torácico).',
              'Linfonodo epitroclear palpável — sugestivo de sífilis secundária, sarcoidose ou linfoma, entre outras causas.'
            ),
            WARN('Linfonodomegalia endurecida, fixa, indolor e progressiva — mesmo sem outros sintomas — deve ser investigada para neoplasia até prova em contrário, especialmente em cadeias supraclavicular e cervical em adultos.'),
            galeria('05-linfonodos', 12, 19),
          ],
        },
      ],
    },

    // =========================================================================
    // MÓDULO 7 — ABDOME
    // =========================================================================
    {
      id: 7, nome: 'Abdome',
      resumo: 'A sequência invertida (ausculta antes), sinais de irritação peritoneal, visceromegalias e abdome agudo.',
      topicos: [
        {
          id: 'm7a-inspecao-real', titulo: 'Inspeção do abdome: exposição, tipos, sinais e cicatrizes (Aula real, Partes 1–2)',
          blocks: [
            P('Referências anatômicas de superfície: processo xifoide, rebordo costal, músculo reto abdominal, umbigo, linha média, crista ilíaca, EIAS, ligamento inguinal, tubérculo púbico, sínfise púbica. O abdome divide-se em 4 quadrantes (planos transumbilical e mediano) ou 9 regiões (2 planos sagitais + 2 transversos: subcostal e intertubercular).'),
            SVG(svgAbdome, 'Divisão em 9 regiões. Localizar a dor por região é o primeiro passo para o diagnóstico topográfico.'),
            foto('01-anatomia-semiologica', 12, 'Pontos de referência anatômica do abdome.'),
            H('Exposição e sequência'),
            P('Expor desde acima do apêndice xifoide até a sínfise púbica, com privacidade e paciente relaxado. Sequência do exame: Inspeção → Ausculta → Percussão → Palpação — a ausculta vem antes para não alterar o peristaltismo com a manipulação.'),
            H('Inspeção estática'),
            UL(
              'Abdome normal: depressão epigástrica, linha mediana, cicatriz umbilical, músculos retos visíveis, sulcos/linhas de Spiegel, pilificação — simétrico, sem lesões, sem circulação colateral, sem abaulamentos/retrações.',
              'Tipos de abdome: plano (normal); globoso (meteorismo, ascite, obesidade recente, pneumoperitônio); escavado (caquexia, desidratação intensa); em avental/pendular (obesidade de longa duração); ascite de médio volume (batráquio, em decúbito dorsal).',
              '6 causas comuns de protrusão abdominal: alimento, líquido, gordura, fezes, flatos, fetos.'
            ),
            foto('02-inspecao', 15, 'Tipos de abdome.'),
            H('Hérnias, cicatrizes e circulação colateral'),
            UL(
              'Hérnias — incisional, inguinal, umbilical; diástase dos retos; pesquisar com manobra de esforço/Valsalva (a hérnia aumenta ou surge).',
              'Circulação colateral tipo porta (irradia do umbigo) vs. tipo cava (predomina nos flancos/região lateral).',
              'Cicatrizes cirúrgicas: medianas (supra/infraumbilical, xifopúbica), paramedianas (pararretal interna/externa, transrretal), transversas (Pfannenstiel, subcostal bilateral "Mercedes"), oblíquas (Kocher — subcostal D; McBurney — FID), lombotomias, inguinotomias.'
            ),
            foto('02-inspecao', 20, 'Sinal de Halstead-Cullen (equimose periumbilical) e sinal de Grey-Turner (equimose de flanco).'),
            WARN('Sinal de Cullen (equimose periumbilical) — pancreatite aguda necro-hemorrágica. Sinal de Grey-Turner (equimose de flancos) — gravidez tubária rota, cisto de ovário roto ou também pancreatite grave. Ambos indicam sangramento retroperitoneal/intra-abdominal e mudam a gravidade do caso.'),
            H('Pulsatilidade e peristaltismo'),
            UL(
              'Aortismo — pulsação mediana supraumbilical em abdome magro, sensação desagradável mas benigna.',
              'Aneurisma de aorta abdominal — dilatação da aorta (geralmente aterosclerótica), inicialmente assintomática, podendo evoluir com dor lombar intensa por compressão radicular.',
              'Peristaltismo visível em mesogástrico, em indivíduo magro e abdome flácido, pode ser normal ("tumor fantasma de Koenig"); mas abdome rígido + peristaltismo visível (ondas de Kussmaul) = sinal de obstrução intestinal.'
            ),
            galeria('02-inspecao', 12, 49),
          ],
        },
        {
          id: 'm7a-ausculta-real', titulo: 'Ausculta do abdome (Aula real, Parte 3)',
          blocks: [
            P('A ausculta é feita antes da percussão e palpação, exatamente para evitar aumento involuntário do peristaltismo pela manipulação.'),
            UL(
              'Ruídos hidroaéreos (RHA): pesquisar em todo o abdome; tempo de ausculta de até 2 minutos; frequência normal de 5 a 30/min.',
              'Sopros a pesquisar: aórtico e de artérias renais.',
              'RHA aumentados — diarreia, oclusão intestinal (fase inicial, hiperperistáltica).',
              'RHA diminuídos/abolidos — íleo paralítico (metabólico ou infeccioso), pós-operatório de cirurgia abdominal.'
            ),
            TIP('No pós-operatório, a dieta só deve ser reiniciada após o reaparecimento dos RHA — é um marcador clínico simples do retorno da motilidade intestinal.'),
            galeria('03-ausculta', 12, 19),
          ],
        },
        {
          id: 'm7a-percussao-real', titulo: 'Percussão do abdome (Aula real, Parte 4)',
          blocks: [
            P('O som predominante normal é o timpanismo (ar nas alças intestinais); a macicez substitui o timpanismo sobre órgãos sólidos, massas ou líquido.'),
            H('Roteiro'),
            UL(
              'Percussão dígito-digital em todos os quadrantes, comparando áreas simétricas.',
              'Delimitação da área de macicez hepática (borda superior por percussão do tórax, borda inferior por palpação) — some na perfuração de víscera oca por interposição de ar livre entre fígado e parede (sinal de Jobert).',
              'Espaço de Traube (hemitórax inferior esquerdo): timpânico normalmente (bolha gástrica); maciço sugere esplenomegalia, mas tem baixa acurácia isolada.',
              'Percussão de flancos para rastreio de ascite (ver tópico específico) e punho-percussão lombar (sinal de Giordano) para dor renal.'
            ),
            WARN('Perda súbita da macicez hepática em paciente com dor abdominal aguda sugere pneumoperitônio (víscera perfurada) — sinal de Jobert, achado de alto valor quando presente.'),
            galeria('04-percussao', 12, 16),
          ],
        },
        {
          id: 'm7a-palpacao-real', titulo: 'Palpação do abdome (Aula real, Parte 5)',
          blocks: [
            P('Última etapa do exame abdominal. Mãos aquecidas, paciente relaxado com os joelhos levemente fletidos; comece longe da área dolorosa e observe o rosto do paciente, não apenas a mão.'),
            H('Palpação superficial'),
            P('Mão espalmada, pressão leve, percorrendo todos os quadrantes — avalia tensão da parede, dor, defesa voluntária e massas superficiais.'),
            H('Palpação profunda'),
            P('Uma mão sobre a outra (bimanual), pressão progressiva — avalia massas profundas, visceromegalias e ponto de maior dor.'),
            UL(
              'Defesa voluntária (contração antecipatória, relaxa se o paciente for distraído) vs. defesa involuntária/rigidez (contração reflexa que não relaxa — indica irritação peritoneal).',
              'Sinal de Blumberg (descompressão dolorosa) e sinal de Rovsing (dor em FID à palpação da FIE) — sugerem irritação peritoneal/apendicite.',
              'Sinal de Murphy — dor + parada inspiratória à palpação do hipocôndrio direito: colecistite aguda.'
            ),
            galeria('05-palpacao', 12, 23),
          ],
        },
        {
          id: 'm7a-visceras-real', titulo: 'Palpação de fígado, baço, rins e bexiga (Aula real, Parte 6)',
          blocks: [
            H('Fígado'),
            P('Palpação bimanual ou em "gancho", pedindo inspiração profunda para a borda hepática descer ao encontro dos dedos. Registrar: distância ao rebordo costal direito (em cm), borda (romba/fina), superfície (lisa/nodular) e consistência.'),
            UL('Hepatomegalia lisa e dolorosa — congestão (ICC) ou hepatite.', 'Superfície nodular e endurecida — cirrose ou neoplasia.'),
            H('Baço'),
            P('Não palpável normalmente — só se torna palpável quando aumenta cerca de 2–3×. Palpar em decúbito dorsal e em decúbito lateral direito (posição de Schuster), na inspiração profunda.'),
            H('Rins'),
            P('Palpação bimanual (uma mão anterior, outra no ângulo costovertebral posterior) — o "peloteio renal" (ballotement) é a técnica clássica para detectar aumento renal (hidronefrose, tumor, rim policístico). Punho-percussão lombar dolorosa (Giordano) sugere pielonefrite/cólica renal.'),
            H('Bexiga'),
            P('Palpável apenas quando distendida (globo vesical) — massa suprapúbica lisa, tensa, que gera desconforto miccional; percussão maciça na região suprapúbica confirma a distensão.'),
            galeria('06-figado-baco-rins-e-bexiga', 12, 32),
          ],
        },
        {
          id: 'm7a-ascite-real', titulo: 'Ascite (Aula real, Parte 7)',
          blocks: [
            P('Ascite é o acúmulo de líquido livre na cavidade peritoneal. As principais causas são cirrose/hipertensão porta, insuficiência cardíaca, síndrome nefrótica e carcinomatose peritoneal.'),
            H('Sinais ao exame físico'),
            UL(
              'Macicez móvel de decúbito — o sinal mais sensível: percute-se do umbigo em direção aos flancos, demarcando a transição timpanismo→macicez; ao virar o paciente de lado e repercutir, a linha de macicez se desloca com a gravidade.',
              'Piparote (onda líquida) — menos sensível, exige um ajudante comprimindo a linha média para bloquear a transmissão pela parede.',
              'Semicírculos de Skoda — delimitam o nível líquido no abdome distendido.',
              'Sinal do "batráquio" — abdome alargado nos flancos quando o paciente está deitado (típico de ascite de médio volume).'
            ),
            WARN('Ascite nova + febre + dor abdominal → investigar peritonite bacteriana espontânea (PBE), principalmente em cirróticos — indicação de paracentese diagnóstica.'),
            DOC('Registro: "Abdome globoso, macicez móvel de decúbito positiva, piparote positivo, RHA presentes, indolor à palpação. Sem sinais de irritação peritoneal."'),
            galeria('07-ascite', 12, 132),
          ],
        },
        {
          id: 'm7a-abdomeagudo-real', titulo: 'Abdômen agudo (Aula real, Parte 8)',
          blocks: [
            P('Abdômen agudo é a síndrome de dor abdominal aguda e intensa que frequentemente exige decisão cirúrgica rápida. Classifica-se por mecanismo fisiopatológico predominante, o que orienta a hipótese diagnóstica.'),
            H('Classificação sindrômica'),
            UL(
              'Inflamatório — dor progressiva, febre, defesa localizada evoluindo para irritação peritoneal (ex.: apendicite, colecistite, diverticulite, pancreatite).',
              'Obstrutivo — dor em cólica, distensão, parada de eliminação de gases/fezes, vômitos, RHA aumentados no início e depois abolidos (obstrução intestinal).',
              'Perfurativo — dor súbita e intensa, abdome "em tábua" (rigidez difusa), pneumoperitônio (perda da macicez hepática) — perfuração de víscera oca.',
              'Vascular/isquêmico — dor desproporcional ao exame físico ("exame pobre, dor rica"), fator de risco cardiovascular/fibrilação atrial — isquemia mesentérica, emergência de alta letalidade.',
              'Hemorrágico — instabilidade hemodinâmica, sinais de Cullen/Grey-Turner, história de trauma ou gravidez ectópica rota/aneurisma roto.'
            ),
            H('Sinais especiais de localização'),
            UL(
              'Sinal de Murphy — colecistite.',
              'Blumberg/Rovsing/dor em McBurney — apendicite.',
              'Giordano — pielonefrite/cólica renal.',
              'Sinal de Cullen (equimose periumbilical) — pancreatite necro-hemorrágica; Grey-Turner (equimose de flanco) — hemorragia retroperitoneal.'
            ),
            WARN('Red flags que indicam abdome cirúrgico: rigidez involuntária difusa, instabilidade hemodinâmica, distensão maciça com parada de eliminações, dor desproporcional ao exame (isquemia mesentérica) e massa pulsátil expansiva (aneurisma roto — evitar palpação repetida).'),
            DOC('Registro: "Abdome doloroso difusamente, com defesa involuntária e descompressão dolorosa em FID, Blumberg e Rovsing positivos, RHA diminuídos. Hipótese: apendicite aguda com sinais de irritação peritoneal."'),
            galeria('08-abdomen-agudo', 12, 140),
          ],
        },
        {
          id: 'm6-metodo', titulo: 'Sequência do exame abdominal — síntese',
          blocks: [
            P('No abdome, a ordem clássica se inverte: Inspeção → Ausculta → Percussão → Palpação. A ausculta vem antes porque palpar e percutir alteram os ruídos hidroaéreos. Paciente em decúbito dorsal, relaxado, com as mãos ao longo do corpo; examinador à direita, mãos aquecidas. Deixe a região dolorosa por último.'),
            UL(
              'Inspeção: forma (plano/globoso/escavado), cicatrizes, circulação colateral, hérnias, peristalse visível.',
              'Ausculta: presença e caráter dos ruídos hidroaéreos; sopros (aorta, artérias renais).',
              'Percussão: timpanismo (gás) predomina; macicez indica víscera sólida, massa ou líquido.',
              'Palpação: superficial (sensibilidade, defesa) e depois profunda (massas, visceromegalias).'
            ),
            TIP('Peça ao paciente para apontar com UM dedo onde dói mais e comece a palpação o mais longe possível desse ponto, observando o rosto dele — não a mão. A defesa e a expressão facial contam mais que o relato verbal, e ganhar a confiança na área que não dói evita a contração voluntária que atrapalha tudo.'),
          ],
        },
        {
          id: 'm6-peritonio', titulo: 'Irritação peritoneal: defesa, descompressão e a linguagem certa',
          blocks: [
            P('Distinguir os graus de comprometimento peritoneal é decisivo porque separa o que pode aguardar do que vai para o centro cirúrgico. Use os termos com precisão.'),
            UL(
              'Dor à palpação — apenas sensível ao toque.',
              'Defesa voluntária — o paciente contrai a musculatura antecipando a dor; relaxa se distraído.',
              'Defesa involuntária (rigidez) — contração reflexa que não relaxa; indica peritonite.',
              'Descompressão dolorosa (Blumberg) — dor à retirada súbita da mão; sinal de irritação peritoneal.',
              'Abdome "em tábua" — rigidez difusa; peritonite generalizada.'
            ),
            EV('Desempenho no abdome agudo: rigidez involuntária e a percussão dolorosa têm melhor valor para peritonite do que o clássico Blumberg, que é doloroso e menos específico. A dor à tosse ou ao movimento (o paciente que fica imóvel) também sugere peritônio irritado. Nenhum sinal isolado decide — é o conjunto + evolução.'),
            H('Sinais especiais'),
            UL(
              'Murphy — dor e parada inspiratória ao palpar o hipocôndrio D na inspiração: colecistite (LR+ razoável quando positivo).',
              'McBurney/Blumberg em FID + migração da dor + anorexia: apendicite.',
              'Rovsing — dor na FID à palpação da FIE: sugere apendicite.',
              'Giordano (punho-percussão lombar) positivo: pielonefrite/cólica renal.'
            ),
            WARN('Red flags de abdome agudo: rigidez involuntária difusa, dor desproporcional ao exame (isquemia mesentérica — clássico "exame pobre, dor rica"), distensão + parada de eliminação de gases/fezes + vômitos (obstrução), instabilidade hemodinâmica, e massa pulsátil expansiva (aneurisma de aorta roto — não palpe repetidamente).'),
          ],
        },
        {
          id: 'm6-visceras', titulo: 'Fígado, baço e ascite',
          blocks: [
            H('Fígado'),
            P('Delimite a borda superior por percussão (macicez hepática) e a inferior por palpação, pedindo inspiração profunda para o fígado descer ao encontro dos dedos. Descreva a que cm do rebordo costal direito, a consistência e a superfície.'),
            UL(
              'Hepatomegalia dolorosa e lisa → congestão (ICC) ou hepatite.',
              'Superfície nodular e endurecida → cirrose/neoplasia.',
              'Sinal do "rebote hepatojugular" e turgência jugular acompanham a congestão.'
            ),
            H('Baço'),
            P('O baço normal NÃO é palpável. Só se torna palpável quando aumenta ~2–3x (ultrapassa o rebordo costal E). Palpe com o paciente em decúbito dorsal e depois em decúbito lateral direito (posição de Schuster), na inspiração.'),
            EV('Um baço palpável tem alta especificidade para esplenomegalia (LR+ alto — se você o palpa, ele está aumentado), mas baixa sensibilidade (não palpar não exclui). Por isso a percussão do espaço de Traube (macicez sugere aumento) complementa o exame.'),
            H('Ascite'),
            UL(
              'Macicez móvel de decúbito — a mais confiável: a interface timpanismo/macicez se desloca ao mudar o paciente de posição.',
              'Piparote (onda líquida) — menos sensível; precisa de ajudante bloqueando a parede.',
              'Semicírculos de Skoda delimitam o nível líquido.'
            ),
            DOC('Registro: "Abdome plano, RHA presentes, timpânico, indolor à palpação superficial e profunda, sem defesa ou descompressão dolorosa. Fígado a 2 cm do RCD, borda lisa e indolor. Baço e rins não palpáveis. Sem ascite."'),
          ],
        },
      ],
    },

    // =========================================================================
    // MÓDULO 8 — APARELHO MÚSCULO-ESQUELÉTICO (Aula real: Membro Superior, Membro Inferior e Tronco)
    // =========================================================================
    {
      id: 8, nome: 'Aparelho Músculo-Esquelético',
      resumo: 'Roteiro sistematizado (inspeção → palpação → mobilidade → testes especiais → neurológico) e os testes clássicos de ombro, cotovelo, punho, quadril, joelho e tornozelo.',
      topicos: [
        {
          id: 'm8me-metodo-msuperior', titulo: 'Método geral e Membro Superior: ombro, cotovelo, punho e mão (Aula real, Parte 1)',
          blocks: [
            P('A maior parte dos diagnósticos musculoesqueléticos vem da história clínica; o exame físico serve para confirmar e fazer diagnóstico diferencial entre as hipóteses. Exames complementares só devem ser pedidos se ainda houver dúvida diagnóstica (<10% dos casos).'),
            H('Roteiro sistematizado (todo segmento)'),
            UL('1. Inspeção', '2. Palpação', '3. Mobilidade (ativa, passiva e resistida)', '4. Testes especiais', '5. Exame neurológico'),
            P('Planos de referência: sagital (divide D/E), frontal/coronal (divide frente/trás), horizontal/transverso/axial (divide cima/baixo).'),
            H('Ombro'),
            P('Articulações: glenoumeral, acrômio-clavicular, escápulo-dorsal, esterno-clavicular. Manguito rotador: supraespinhal, infraespinhal, redondo menor e subescapular; outros músculos-chave: deltoide, bíceps braquial.'),
            UL(
              'Inspeção: hipotrofias, tumefações (ex.: lipoma), deformidades (ex.: luxação glenoumeral anterior, a mais comum).',
              'Palpação: temperatura (sugere artrite), pontos-gatilho miofasciais, pontos fibromiálgicos, articulação acrômio-clavicular.',
              'ADM: flexão 0–180°, extensão 0–40°, abdução 0–180°, adução 0–45°, rotação externa/interna 60–90°, circundação.',
              '80–90% das patologias atraumáticas do ombro envolvem manguito rotador/bursa subacromial-subdeltóidea (tendinite, tendinite calcárea, bursite); 10–20% afetam a glenoumeral (artrite reumatoide, capsulite adesiva).',
              'ADM ativa ↓ com passiva normal → sugere lesão do manguito rotador. ADM ativa E passiva ↓ → sugere capsulite adesiva.'
            ),
            H('Testes especiais do ombro'),
            UL(
              'Teste de Apley — triagem rápida da funcionalidade global (flexão/abdução/RE; extensão/adução/RI; flexão/adução).',
              'Teste de Neer — elevação passiva rápida no plano sagital; dor = síndrome do impacto (choque do tubérculo maior contra o acrômio).',
              'Teste de Jobe — supraespinhal (abdutor): ombro a 90° de abdução + rotação interna, força para baixo contra resistência.',
              'Teste de Patte — infraespinhal (rotador externo): ombro a 90° de abdução, cotovelo a 90°, rotação externa contra resistência.',
              'Teste de Gerber (lift-off) — subescapular (rotador interno): dorso da mão na coluna, força contra resistência.',
              'Speed/Palm-up test — bíceps (flexor de ombro/cotovelo): cotovelo estendido, antebraço supinado, eleva o ombro contra resistência.'
            ),
            foto('01-exame-do-membro-superior', 24, 'Teste de Neer.'),
            H('Cotovelo'),
            P('Articulações úmero-radial, úmero-ulnar e rádio-ulnar; pontos ósseos: epicôndilos medial/lateral e olécrano; ligamentos colaterais ulnar/radial; músculos bíceps e tríceps.'),
            UL(
              'Achados: bursite olecraniana, hipermobilidade articular, nódulo reumatoide, psoríase, tofo gotoso.',
              'Palpação: nervo ulnar no sulco olecraniano medial (túnel cubital); ponto sinovial no sulco olecraniano lateral.',
              'ADM: flexão 0–145°, pronação/supinação 0–90°.',
              'Teste de Cozen — epicondilite lateral ("cotovelo do tenista"): extensão ativa do punho contra resistência com cotovelo fletido e antebraço pronado; dor no epicôndilo lateral = positivo.',
              'Teste de epicondilite medial ("cotovelo do golfista") — flexão ativa do punho contra resistência com antebraço supinado; dor no epicôndilo medial = positivo.',
              'Teste de Tinel no cotovelo — percussão do nervo ulnar no sulco entre olécrano e epicôndilo medial; positivo se choque/formigamento/dor no trajeto ulnar (síndrome do túnel cubital).'
            ),
            foto('01-exame-do-membro-superior', 45, 'Teste de Cozen (epicondilite lateral).'),
            H('Punho e mão'),
            UL(
              'Achados sistêmicos: osteoartrite; artrite reumatoide (sinovite + hipotrofia muscular, sinovite de IFPs, deformidades em pescoço de cisne e botoeira, tenossinovite ulnar, nódulos de Bouchard e Heberden); fenômeno de Raynaud; artrite psoriásica (distrofia ungueal + artrite de IFDs + pitting nail); esclerodactilia; dermatomiosite (pápulas de Gottron); contratura de Dupuytren; baqueteamento digital.',
              'ADM: flexão do punho 0–90°, extensão 0–70°, desvios radial/ulnar 0–25°/0–35°; MCFs e IFs com amplitudes próprias; adução/abdução e oposição do polegar.',
              'Teste de Finkelstein — tenossinovite de De Quervain (extensor curto e abdutor longo do polegar): polegar fechado na palma, desvio ulnar do punho provoca dor na região do processo estiloide radial.',
              'Teste de Phalen — síndrome do túnel do carpo (nervo mediano): punhos em flexão máxima, dorsos em oposição; dor/parestesia/choque no território do mediano = positivo.',
              'Teste de Tinel no punho — percussão sobre o nervo mediano na face anterior do punho; positivo se choque/parestesia no território do mediano.'
            ),
            foto('01-exame-do-membro-superior', 61, 'Teste de Phalen (síndrome do túnel do carpo).'),
            H('Correlação neurológica do membro superior (miótomos e reflexos)'),
            UL(
              'C5 — flexão do cotovelo / abdução do ombro; reflexo bicipital.',
              'C6 — flexão do cotovelo, extensão do punho; reflexo estilorradial.',
              'C7 — extensão do cotovelo, flexão do punho, extensão dos dedos; reflexo tricipital.',
              'C8 — flexão dos dedos, músculos interósseos.',
              'T1 — músculos interósseos.'
            ),
            galeria('01-exame-do-membro-superior', 12, 85),
          ],
        },
        {
          id: 'm8me-minferior-tronco', titulo: 'Membro inferior e tronco: quadril, joelho, tornozelo/pé (Aula real, Parte 2)',
          blocks: [
            H('Quadril'),
            UL(
              'Inspeção: desalinhamentos, retroversão/anteversão, atrofias musculares, marcha.',
              'Pontos dolorosos: grande trocânter, tuberosidade isquiática, banda iliotibial.',
              'ADM: flexão 90–110°, extensão 30°, abdução 50°, adução 30°, rotações interna/externa 45°.'
            ),
            H('Testes especiais do quadril e coluna'),
            UL(
              'Patrick/FABERE (Flexão + ABdução + Rotação Externa) — avalia coxofemoral ipsilateral e sacroilíaca contralateral.',
              'Schober — mobilidade da coluna lombar; compõe os critérios diagnósticos de espondilite anquilosante.',
              'Gaenslen — articulação sacroilíaca: flexão ativa do quadril contralateral (joelho dobrado) + extensão máxima do quadril examinado; dor na sacroilíaca = positivo.',
              'Thomas — contratura em flexão do quadril (iliopsoas): flexão máxima de um lado; se a coxa contralateral não encostar na maca ao relaxar, é positivo.',
              'Trendelenburg — fraqueza do glúteo médio: com quadril em extensão (flexão só do joelho), a queda da crista ilíaca do lado testado indica insuficiência do glúteo médio contralateral.'
            ),
            foto('02-exame-do-m-inferior-e-tronco', 22, 'Teste de Trendelenburg (normal x positivo).'),
            H('Joelho'),
            P('Ossos: fêmur, tíbia, patela. Articulações femurotibial e femuropatelar. Ligamentos cruzados anterior/posterior e colaterais medial/lateral; meniscos lateral e medial.'),
            UL(
              'Inspeção: hipotrofia, derrame articular, deformidades, alinhamento (valgo/varo/recurvado), marcha.',
              'Palpação: bursas, tendões da "pata de ganso", interlinha articular. Sinal da tecla — sugere derrame articular (choque da patela).',
              'ADM: flexão-extensão, rotação externa-interna.'
            ),
            H('Testes especiais do joelho'),
            UL(
              'Teste de retração de isquiotibiais — extensão passiva do joelho com quadril a 90° não atinge 0°.',
              'Teste de Ely (quadríceps) — decúbito ventral, tentativa de encostar o calcanhar no glúteo.',
              'Teste de McMurray — meniscos: rotação externa testa menisco medial, rotação interna testa menisco lateral.',
              'Teste de Apley (joelho) — compressão axial + rotação em decúbito ventral (dor = lesão meniscal); alívio à tração confirma origem meniscal (não ligamentar).',
              'Lachman e gaveta anterior/posterior — ligamentos cruzados (LCA/LCP).',
              'Estresse valgo (30° de flexão) — colateral medial; estresse varo — colateral lateral.'
            ),
            foto('02-exame-do-m-inferior-e-tronco', 30, 'Teste de McMurray.'),
            H('Tornozelo e pé'),
            UL(
              'ADM: flexão plantar 35–50°, flexão dorsal 20°.',
              'Inspeção por segmentos: retropé, mediopé, antepé; arcos longitudinal medial, transverso anterior e longitudinal externo.',
              'Achados: dedos em garra + calosidades, hálux valgo, fasceíte plantar (dor na face plantar do calcâneo).',
              'Movimentos combinados do pé: pronação = eversão + abdução + dorsiflexão; supinação = inversão + adução + flexão plantar.',
              'Entorse (ligamentar) e sinovite (ex.: artrite reumatoide) do tornozelo.'
            ),
            H('Correlação neurológica do membro inferior'),
            UL('L3–L4 → reflexo patelar.', 'S1 → reflexo aquileu.', 'Sensibilidade e pontos fibromiálgicos (tender points) completam o exame neurológico do segmento.'),
            galeria('02-exame-do-m-inferior-e-tronco', 12, 75),
          ],
        },
      ],
    },

    // =========================================================================
    // MÓDULO 9 — SISTEMA NEUROLÓGICO
    // =========================================================================
    {
      id: 9, nome: 'Sistema Neurológico',
      resumo: 'O exame que localiza a lesão: consciência, pares cranianos, motor, sensitivo, reflexos e sinais meníngeos.',
      topicos: [
        {
          id: 'm7-consciencia', titulo: 'Nível de consciência e a escala de Glasgow',
          blocks: [
            P('O exame neurológico não é uma lista de manobras — é um método para responder "onde está a lesão?". Começa pela consciência, que se avalia por dois eixos: nível (quão desperto) e conteúdo (orientação, coerência).'),
            H('Escala de Coma de Glasgow (ECG)'),
            UL(
              'Abertura ocular (1–4): espontânea (4), ao chamado (3), à dor (2), nenhuma (1).',
              'Resposta verbal (1–5): orientada (5), confusa (4), palavras inapropriadas (3), sons (2), nenhuma (1).',
              'Resposta motora (1–6): obedece (6), localiza dor (5), retirada (4), flexão anormal/decorticação (3), extensão/descerebração (2), nenhuma (1).'
            ),
            TIP('A melhor resposta motora é o item que mais prediz prognóstico. Decorticação (flexão dos MMSS, "mãos ao core-ação/coração") aponta lesão acima do mesencéfalo; descerebração (extensão de tudo) aponta lesão mais baixa e mais grave. Piora do escore motor exige reavaliação imediata.'),
            WARN('ECG ≤ 8 = coma e risco de via aérea não protegida → considerar intubação. Anisocoria nova + rebaixamento = herniação até prova em contrário — emergência absoluta, chame ajuda e imagem urgente.'),
          ],
        },
        {
          id: 'm7-motor', titulo: 'Força, tônus e reflexos: 1º × 2º neurônio motor',
          blocks: [
            P('A distinção mais rentável do exame motor é entre síndrome do 1º neurônio (central, via piramidal) e do 2º neurônio (periférico). Ela localiza a lesão e muda toda a investigação.'),
            H('Padrões'),
            UL(
              '1º neurônio (central): fraqueza, hipertonia espástica, hiper-reflexia, Babinski presente, pouca atrofia, sem fasciculações.',
              '2º neurônio (periférico): fraqueza, hipotonia, hiporreflexia/arreflexia, Babinski ausente, atrofia acentuada, fasciculações.'
            ),
            P('Gradue a força de 0 a 5 (MRC): 0 sem contração, 3 vence a gravidade mas não a resistência, 5 normal. Compare sempre os dois lados e proximal × distal (fraqueza proximal sugere miopatia; distal, neuropatia).'),
            H('Reflexos e sinal de Babinski'),
            P('Pesquise os reflexos profundos (bicipital, patelar, aquileu) comparando lados. O sinal de Babinski — extensão do hálux ao estimular a planta — é resposta de 1º neurônio; normal até ~2 anos, patológico depois.'),
            EV('Babinski tem alta especificidade para lesão do trato corticoespinhal (quando presente, pesa muito), mas sensibilidade limitada (pode faltar mesmo com lesão). Fasciculações + atrofia + hiper-reflexia no mesmo paciente (mistura de 1º e 2º neurônio) levantam ELA.'),
          ],
        },
        {
          id: 'm7-meningeos', titulo: 'Sinais meníngeos, cerebelo e marcha',
          blocks: [
            H('Irritação meníngea'),
            UL(
              'Rigidez de nuca — resistência à flexão passiva do pescoço.',
              'Kernig — dor/resistência ao estender o joelho com a coxa fletida.',
              'Brudzinski — flexão involuntária dos joelhos ao fletir o pescoço.'
            ),
            EV('Cuidado com a confiança excessiva: em adultos com suspeita de meningite, rigidez de nuca, Kernig e Brudzinski têm sensibilidade BAIXA (muitos pacientes com meningite não os têm). Ou seja: presentes ajudam, mas AUSENTES NÃO EXCLUEM meningite. A ausência desses sinais nunca deve, isoladamente, afastar a punção lombar quando a suspeita é clínica.'),
            WARN('Tríade clássica (febre + rigidez de nuca + alteração de consciência) está completa em menos da metade dos casos de meningite bacteriana. Febre + cefaleia + qualquer sinal neurológico/meníngeo já obriga a investigar. Não espere a tríade.'),
            H('Cerebelo e equilíbrio'),
            UL(
              'Dismetria (index-nariz, calcanhar-joelho), disdiadococinesia, nistagmo → síndrome cerebelar (ipsilateral à lesão).',
              'Romberg: desequilíbrio que PIORA ao fechar os olhos → déficit proprioceptivo/vestibular (não é cerebelar puro).',
              'Marcha: ceifante (1º neurônio/AVC), escarvante (lesão de fibular), atáxica de base alargada (cerebelo), parkinsoniana (passos curtos, festinação).'
            ),
            DOC('Registro: "Lúcido, orientado, Glasgow 15. Pupilas isocóricas fotorreagentes. Pares cranianos sem alterações. Força grau V global e simétrica, tônus e reflexos normais, Babinski ausente bilateralmente. Sensibilidade preservada. Sem dismetria; marcha atípica; sem sinais meníngeos."'),
          ],
        },
      ],
    },
  ];

  window.SemioAulas = { MODULOS };
})();
