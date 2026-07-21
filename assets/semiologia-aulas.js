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
            SVG(svgPercussao, 'Escala dos sons à percussão, do mais "cheio" de ar ao mais sólido: timpânico → claro pulmonar → submaciço → maciço.'),
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
      ],
    },

    // =========================================================================
    // MÓDULO 4 — APARELHO RESPIRATÓRIO
    // =========================================================================
    {
      id: 4, nome: 'Aparelho Respiratório',
      resumo: 'Inspeção, palpação, percussão e ausculta do tórax e as grandes síndromes pleuropulmonares.',
      topicos: [
        {
          id: 'm4-metodo', titulo: 'Os quatro tempos no tórax',
          blocks: [
            SVG(svgTorax, 'Divisão em ápices e bases; a linha média separa os hemitórax para comparação sistemática lado a lado.'),
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
    // MÓDULO 5 — SISTEMA CARDIOVASCULAR
    // =========================================================================
    {
      id: 5, nome: 'Sistema Cardiovascular',
      resumo: 'Pulso venoso, precórdio, bulhas, sopros e as manobras dinâmicas que os diferenciam.',
      topicos: [
        {
          id: 'm5-focos', titulo: 'Precórdio, ictus e focos de ausculta',
          blocks: [
            SVG(svgTorax, 'Focos de ausculta: aórtico (2º EICD), pulmonar (2º EICE), tricúspide (4º–5º EIE junto ao esterno) e mitral (5º EIE na linha hemiclavicular = ictus).'),
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
      ],
    },

    // =========================================================================
    // MÓDULO 6 — ABDOME
    // =========================================================================
    {
      id: 6, nome: 'Abdome',
      resumo: 'A sequência invertida (ausculta antes), sinais de irritação peritoneal, visceromegalias e abdome agudo.',
      topicos: [
        {
          id: 'm6-metodo', titulo: 'Sequência do exame abdominal',
          blocks: [
            SVG(svgAbdome, 'Divisão em 9 regiões. Localizar a dor por região é o primeiro passo para o diagnóstico topográfico.'),
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
    // MÓDULO 7 — SISTEMA NEUROLÓGICO
    // =========================================================================
    {
      id: 7, nome: 'Sistema Neurológico',
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
