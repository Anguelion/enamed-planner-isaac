/*
 * Simulador de Consulta — Métodos Clínicos
 * Aba Prescrição › Métodos clínicos.
 * Você escolhe o método (MCCP, SOAP, Calgary-Cambridge…), escolhe a doença na caixa,
 * dá um nome fictício ao paciente e conduz a consulta passo a passo com orientação
 * do que perguntar, o que examinar, o que não pode passar e como fechar o plano.
 * Integra no planner via window.ConsultaClinica.mount(container, bridge).
 */
(function(){
  const F = { abertura:'Abertura', exploracao:'Exploração', contexto:'Contexto', exame:'Exame físico', sintese:'Síntese', plano:'Plano', fechamento:'Fechamento' };

  /* ============================== MÉTODOS CLÍNICOS ============================== */
  const METODOS = [
  { id:'mccp', nome:'MCCP — Método Clínico Centrado na Pessoa', sigla:'MCCP', tipo:'Consulta completa',
    uso:'Consulta ambulatorial em qualquer cenário, especialmente atenção primária. Integra doença e experiência da pessoa.',
    quando:'Quando você quer treinar escuta, agenda da pessoa e decisão compartilhada — não só o diagnóstico.',
    etapas:[
      { id:'m1', foco:'abertura', titulo:'1. Explorando a saúde, a doença e a experiência', objetivo:'Ouvir a história clínica E a vivência da pessoa.',
        orientacoes:['Abra com pergunta aberta e não interrompa nos primeiros 60 segundos.','Explore os dois lados: o que a doença faz no corpo (sintomas, cronologia) e o que ela faz na vida.','Use SIFE: Sentimentos, Ideias, Função e Expectativas.'],
        perguntas:['O que te traz aqui hoje?','Me conta desde o começo, com suas palavras.','Como isso vem afetando seu dia a dia, seu trabalho, seu sono?','O que você acha que pode estar causando isso? (Ideias)','O que mais te preocupa nisso? (Sentimentos)','O que você esperava que acontecesse na consulta de hoje? (Expectativas)','Tem mais alguma coisa que você queira me contar hoje?'] },
      { id:'m2', foco:'contexto', titulo:'2. Entendendo a pessoa por inteiro', objetivo:'Contexto próximo (família, trabalho) e distante (cultura, comunidade, acesso).',
        orientacoes:['Pergunte quem mora com a pessoa, quem cuida de quem, como é o trabalho e a renda.','Considere ciclo de vida familiar, rede de apoio e determinantes sociais.','Registre o que muda o plano: acesso a medicação, transporte, alfabetização em saúde.'],
        perguntas:['Quem mora com você? Com quem você pode contar?','Como é seu trabalho e sua rotina?','Como está sua vida financeira para conseguir tratamento e transporte?','O que acontece na sua vida hoje que pode estar influenciando isso?','Existe algo na sua fé, cultura ou família que eu deva saber para cuidar melhor de você?'] },
      { id:'m3', foco:'exame', titulo:'3. Exame físico dirigido', objetivo:'Examinar com hipótese na cabeça, avisando cada passo.',
        orientacoes:['Avise o que vai fazer e por quê; peça permissão.','Priorize as manobras que confirmam ou afastam suas hipóteses.','Sempre verbalize os achados relevantes ao final, em linguagem simples.'],
        perguntas:['Posso te examinar agora? Vou começar medindo sua pressão.','Vou apertar aqui, me avise se doer.','Encontrei o seguinte no exame… deixa eu te explicar o que isso significa.'] },
      { id:'m4', foco:'sintese', titulo:'4. Elaborando um projeto comum', objetivo:'Definir junto o problema, os objetivos e os papéis.',
        orientacoes:['Diga sua hipótese em linguagem simples e cheque o entendimento.','Ofereça opções reais, com benefícios e riscos, e pergunte a preferência.','Negocie prioridades: às vezes a agenda da pessoa é outra.'],
        perguntas:['Pelo que conversamos, eu penso que se trata de… o que você achou dessa explicação?','Existem duas opções aqui. Posso te explicar as duas e vemos qual combina mais com sua vida?','O que você acha que seria possível fazer daqui até nosso próximo encontro?','Qual dessas coisas é a mais importante para você resolver primeiro?'] },
      { id:'m5', foco:'plano', titulo:'5. Intensificando a relação e sendo realista', objetivo:'Fortalecer o vínculo, usar o tempo e os recursos como aliados.',
        orientacoes:['Reconheça emoções explicitamente; empatia é intervenção.','Use o tempo como recurso diagnóstico: reavaliar é conduta.','Seja realista com o que é possível no serviço e na vida da pessoa.'],
        perguntas:['Eu percebo que isso te deixou assustado. Faz sentido você se sentir assim.','Podemos combinar de reavaliar em X dias e ver como evoluiu?','Se aparecer algum destes sinais, você deve voltar imediatamente: …','Ficou alguma dúvida? Você poderia me repetir o combinado, para eu ver se expliquei bem?'] } ] },

  { id:'soap', nome:'SOAP — Registro orientado', sigla:'SOAP', tipo:'Registro clínico',
    uso:'Estruturar a consulta e o registro em prontuário: Subjetivo, Objetivo, Avaliação, Plano.',
    quando:'Ótimo para treinar organização de raciocínio e evolução de pacientes.',
    etapas:[
      { id:'s1', foco:'exploracao', titulo:'S — Subjetivo', objetivo:'Tudo o que a pessoa relata: queixa, HDA, antecedentes, hábitos, revisão de sistemas.',
        orientacoes:['Comece pela queixa principal com as palavras da pessoa e o tempo de evolução.','Detalhe a HDA em ordem cronológica.','Inclua o que a pessoa pensa e teme — isso também é subjetivo relevante.'],
        perguntas:['Qual o principal motivo da consulta e há quanto tempo?','Me conte a história desde o início, na ordem em que aconteceu.','O que melhora e o que piora?','Quais doenças você tem? Quais medicamentos usa?','Como são seus hábitos: sono, álcool, tabaco, alimentação, exercício?'] },
      { id:'s2', foco:'exame', titulo:'O — Objetivo', objetivo:'Sinais vitais, exame físico e exames complementares já disponíveis.',
        orientacoes:['Registre números, não adjetivos: "PA 158/96", não "pressão alta".','Descreva achados positivos e os negativos importantes.','Inclua resultados de exames que a pessoa trouxe.'],
        perguntas:['Vou registrar seus sinais vitais e o exame de hoje.','Você trouxe exames? Posso ver os resultados e as datas?'] },
      { id:'s3', foco:'sintese', titulo:'A — Avaliação', objetivo:'Interpretação: hipóteses, diagnósticos diferenciais, gravidade, problemas ativos.',
        orientacoes:['Nomeie o problema e diga por quê (dados que sustentam).','Liste diferenciais que você está afastando e com qual argumento.','Classifique gravidade/estadiamento quando existir escore.'],
        perguntas:['Quais dados sustentam minha hipótese principal?','O que ainda não explico com essa hipótese?','Qual diferencial eu não posso deixar passar?'] },
      { id:'s4', foco:'plano', titulo:'P — Plano', objetivo:'Diagnóstico, terapêutico, educacional e seguimento.',
        orientacoes:['Separe em: plano diagnóstico, terapêutico, educativo e de seguimento.','Cada item precisa de justificativa.','Combine sinais de alarme e data de retorno.'],
        perguntas:['Quais exames pedir e o que cada um muda na conduta?','Qual tratamento, em qual dose, por quanto tempo?','O que a pessoa precisa entender antes de sair daqui?','Quando retorna e o que faz se piorar?'] } ] },

  { id:'calgary', nome:'Calgary-Cambridge — Guia de comunicação clínica', sigla:'C-C', tipo:'Comunicação',
    uso:'Roteiro de comunicação da consulta inteira, do primeiro contato ao fechamento.',
    quando:'Quando o objetivo é treinar a habilidade de entrevista, não só o conteúdo.',
    etapas:[
      { id:'c1', foco:'abertura', titulo:'1. Iniciando a consulta', objetivo:'Criar rapport e identificar todos os motivos da consulta.',
        orientacoes:['Cumprimente, apresente-se, confirme o nome e como a pessoa prefere ser chamada.','Faça a pergunta de abertura e escute sem interromper.','Faça o "screening": pergunte se há mais alguma coisa antes de aprofundar.'],
        perguntas:['Bom dia, sou o Isaac, estudante de medicina. Como você prefere ser chamado(a)?','O que te traz aqui hoje?','Além disso, tem mais alguma coisa que você queira tratar hoje?','Podemos começar falando de qual delas?'] },
      { id:'c2', foco:'exploracao', titulo:'2. Coletando informações', objetivo:'Do aberto para o fechado, explorando doença e perspectiva.',
        orientacoes:['Comece com perguntas abertas e vá afunilando (cone).','Use facilitadores: repetição, ecoar, parafrasear, silêncio.','Resuma periodicamente e peça correção.'],
        perguntas:['Me conte mais sobre isso.','Você disse "peso no peito" — como é esse peso exatamente?','Deixa eu ver se entendi: … Está certo? Faltou alguma coisa?','E o que você acha que pode ser?'] },
      { id:'c3', foco:'exame', titulo:'3. Exame físico', objetivo:'Explicar, pedir permissão, preservar o pudor.',
        orientacoes:['Explique cada etapa antes de fazer.','Garanta privacidade e conforto.','Comente achados enquanto examina, quando ajudar.'],
        perguntas:['Vou examinar sua barriga agora, pode ser?','Me avise se algo incomodar.'] },
      { id:'c4', foco:'sintese', titulo:'4. Explicação e planejamento', objetivo:'Dar informação na medida certa e construir plano compartilhado.',
        orientacoes:['Descubra o ponto de partida: o que a pessoa já sabe.','Dê a informação em blocos e cheque o entendimento (chunk and check).','Evite jargão; use analogias.'],
        perguntas:['O que você já ouviu falar sobre essa condição?','Quanto você gostaria de saber sobre isso: o essencial ou todos os detalhes?','Vou explicar em três partes. A primeira é… Ficou claro até aqui?','O que você acha desse plano? Alguma parte parece difícil de fazer?'] },
      { id:'c5', foco:'fechamento', titulo:'5. Encerrando a consulta', objetivo:'Resumir, combinar rede de segurança e contratar o próximo passo.',
        orientacoes:['Resuma o combinado em uma frase.','Dê a rede de segurança: o que fazer se piorar, quando voltar.','Confirme entendimento com teach-back.'],
        perguntas:['Resumindo: vamos fazer X, Y e Z.','Se acontecer isto, você deve procurar atendimento imediatamente.','Você pode me contar com suas palavras o que combinamos?','Ficou alguma dúvida antes de terminarmos?'] } ] },

  { id:'anamnese', nome:'Anamnese clássica completa', sigla:'Anamnese', tipo:'Consulta completa',
    uso:'Roteiro tradicional: ID, QP, HDA, ISDA, antecedentes, hábitos, história familiar e social.',
    quando:'Base para prova prática e para internação; garante que nada estrutural fique de fora.',
    etapas:[
      { id:'a1', foco:'abertura', titulo:'1. Identificação e queixa principal', objetivo:'Quem é a pessoa e por que veio, nas palavras dela.',
        orientacoes:['Nome, idade, sexo, procedência, profissão, estado civil.','QP em uma frase curta, entre aspas, com duração.'],
        perguntas:['Qual seu nome completo e idade?','Qual sua profissão e de onde você é?','O que te trouxe aqui e há quanto tempo?'] },
      { id:'a2', foco:'exploracao', titulo:'2. HDA — História da doença atual', objetivo:'Cronologia completa do sintoma, com os 7 atributos.',
        orientacoes:['Use os atributos: localização, qualidade, intensidade, cronologia, fatores de melhora/piora, sintomas associados, contexto.','Registre o que a pessoa já tomou e o que aconteceu.','Não pule para o diagnóstico antes de fechar a cronologia.'],
        perguntas:['Quando começou e como começou?','Onde é e para onde vai?','Como é essa sensação? De 0 a 10, qual a intensidade?','O que melhora e o que piora?','Veio acompanhada de mais alguma coisa?','O que você já tomou? Melhorou?'] },
      { id:'a3', foco:'exploracao', titulo:'3. Revisão de sistemas (ISDA)', objetivo:'Varredura sistemática para achados que a pessoa não relatou.',
        orientacoes:['Vá por sistemas, com perguntas curtas e diretas.','Foque nos sistemas relacionados à hipótese, mas não pule os sinais gerais.'],
        perguntas:['Geral: febre, perda de peso, cansaço, suor noturno?','Cabeça e pescoço: dor de cabeça, alteração visual, dor de garganta?','Cardiorrespiratório: dor no peito, falta de ar, palpitação, tosse, inchaço?','Digestivo: azia, dor abdominal, náusea, mudança do intestino, sangue nas fezes?','Urinário: ardência, jato, frequência, urina escura?','Neuro/psíquico: tontura, fraqueza, formigamento, humor, sono?','Locomotor e pele: dor articular, manchas, feridas?'] },
      { id:'a4', foco:'contexto', titulo:'4. Antecedentes, hábitos e história familiar/social', objetivo:'Passado clínico e determinantes.',
        orientacoes:['Antecedentes pessoais: doenças, cirurgias, internações, alergias, medicamentos, vacinas.','Hábitos: tabaco, álcool, drogas, alimentação, exercício, sono, sexualidade.','Familiar: doenças e idade de início. Social: moradia, trabalho, renda, apoio.'],
        perguntas:['Quais doenças você tem ou já teve? Já operou ou internou?','Tem alergia a algum medicamento? Qual reação?','Quais medicamentos, chás ou suplementos você usa?','Fuma? Bebe? Usa outras substâncias? Quanto?','Como é sua alimentação, sono e atividade física?','Quais doenças existem na família e com que idade apareceram?','Como é sua moradia, seu trabalho e sua renda?'] },
      { id:'a5', foco:'exame', titulo:'5. Exame físico', objetivo:'Geral e segmentar, dirigido pelas hipóteses.',
        orientacoes:['Estado geral, sinais vitais, antropometria.','Segmentar: cabeça e pescoço, tórax, cardiovascular, abdome, extremidades, neurológico, pele.'],
        perguntas:['Vou examinar você agora, pode ser?'] },
      { id:'a6', foco:'sintese', titulo:'6. Hipóteses e conduta', objetivo:'Fechar raciocínio e definir plano.',
        orientacoes:['Hipótese principal + diferenciais com justificativa.','Plano diagnóstico, terapêutico e de seguimento.'],
        perguntas:['Qual minha hipótese principal e por quê?','Quais diferenciais preciso afastar?','Que exames mudam a conduta agora?'] } ] },

  { id:'socrates', nome:'SOCRATES — Avaliação da dor', sigla:'SOCRATES', tipo:'Sintoma',
    uso:'Roteiro dedicado para caracterizar dor de qualquer localização.',
    quando:'Sempre que a queixa principal for dor.',
    etapas:[
      { id:'so1', foco:'exploracao', titulo:'S.O.C.R.A.T.E.S.', objetivo:'Caracterizar completamente a dor.',
        orientacoes:['Site (local), Onset (início), Character (caráter), Radiation (irradiação), Associations (sintomas associados), Time course (evolução), Exacerbating/relieving (fatores), Severity (intensidade).','Peça para a pessoa apontar com um dedo onde dói.','Compare com a pior dor que ela já sentiu.'],
        perguntas:['Onde exatamente dói? Aponte com um dedo. (Site)','Quando e como começou: súbito ou gradual? O que fazia? (Onset)','Como é a dor: aperto, queimação, pontada, cólica, choque? (Character)','A dor vai para algum lugar? (Radiation)','Vem junto com náusea, suor, febre, falta de ar? (Associations)','É constante ou vai e volta? Piora em algum horário? (Time)','O que piora e o que melhora: movimento, comida, posição, remédio? (Exacerbating/Relieving)','De 0 a 10, quanto agora e quanto no pior momento? (Severity)'] } ] },

  { id:'oldcarts', nome:'OLDCARTS / ALICIA — Atributos do sintoma', sigla:'OLDCARTS', tipo:'Sintoma',
    uso:'Alternativa mnemônica para caracterizar qualquer sintoma, não só dor.',
    quando:'Útil para tosse, dispneia, tontura, náusea, prurido, sangramento.',
    etapas:[
      { id:'ol1', foco:'exploracao', titulo:'Os oito atributos', objetivo:'Onset, Location, Duration, Character, Aggravating, Relieving, Timing, Severity.',
        orientacoes:['ALICIA (pt-BR): Aparecimento, Localização, Intensidade, Caráter, Irradiação, Alívio/Agravo.','Um sintoma bem caracterizado já reduz o diferencial pela metade.'],
        perguntas:['Quando começou e como? (Onset)','Onde você sente? (Location)','Quanto tempo dura cada episódio? (Duration)','Como você descreveria essa sensação? (Character)','O que faz piorar? (Aggravating)','O que faz melhorar? (Relieving)','Tem hora do dia em que é pior? (Timing)','Qual a intensidade de 0 a 10? Como isso limita você? (Severity)'] } ] },

  { id:'sbar', nome:'SBAR / ISBAR — Passagem de caso', sigla:'SBAR', tipo:'Comunicação entre profissionais',
    uso:'Comunicar um caso de forma segura e objetiva a outro profissional.',
    quando:'Treine para apresentar caso na visita, discutir com plantonista ou pedir parecer.',
    etapas:[
      { id:'sb1', foco:'sintese', titulo:'S — Situação', objetivo:'Quem é e qual o problema agora, em 2 frases.',
        orientacoes:['Identifique-se, identifique o paciente e diga o problema atual.','Diga logo o quanto é urgente.'],
        perguntas:['Sou o Isaac, do leito X. Paciente de Y anos, com Z, que agora está apresentando…'] },
      { id:'sb2', foco:'contexto', titulo:'B — Background (antecedentes)', objetivo:'Contexto relevante, não a história inteira.',
        orientacoes:['Diagnóstico de base, tempo de internação, medicações relevantes, alergias.','Apenas o que muda a decisão.'],
        perguntas:['Ele internou há X dias por…, tem antecedente de…, está em uso de…'] },
      { id:'sb3', foco:'exame', titulo:'A — Avaliação', objetivo:'Sinais vitais, exame e sua interpretação.',
        orientacoes:['Dê números: PA, FC, FR, SpO2, temperatura, diurese.','Diga o que você acha que está acontecendo — arrisque uma hipótese.'],
        perguntas:['Sinais vitais atuais são…, no exame encontrei…, eu acho que pode ser…'] },
      { id:'sb4', foco:'plano', titulo:'R — Recomendação', objetivo:'O que você precisa do outro profissional, com prazo.',
        orientacoes:['Peça algo concreto: avaliação presencial, exame, mudança de conduta.','Defina prazo e confirme o entendimento (read-back).'],
        perguntas:['Eu gostaria que você avaliasse agora / que eu iniciasse X. Você concorda?','Confirmando o que combinamos: …'] } ] },

  { id:'ampla', nome:'ABCDE + AMPLA/SAMPLE — Atendimento de urgência', sigla:'ABCDE', tipo:'Urgência',
    uso:'Abordagem sistematizada do paciente grave: primeiro estabilizar, depois investigar.',
    quando:'Trauma, choque, rebaixamento, qualquer paciente instável.',
    etapas:[
      { id:'ab1', foco:'exame', titulo:'Avaliação primária — ABCDE', objetivo:'Encontrar e tratar o que mata primeiro.',
        orientacoes:['A: via aérea com proteção cervical. B: ventilação e oxigenação. C: circulação e controle de hemorragia. D: neurológico (Glasgow, pupilas, glicemia). E: exposição com prevenção de hipotermia.','Não avance sem resolver o problema da etapa anterior.','Reavalie em ciclos.'],
        perguntas:['A via aérea está pérvia? Ele fala?','A ventilação é simétrica? Qual a saturação e a FR?','Como estão pulso, PA, perfusão e sangramentos?','Qual o Glasgow, as pupilas e a glicemia?','Alguma lesão escondida ao expor o paciente?'] },
      { id:'ab2', foco:'exploracao', titulo:'AMPLA / SAMPLE', objetivo:'História rápida e dirigida durante a estabilização.',
        orientacoes:['A: Alergias. M: Medicamentos. P: Passado médico. L: Líquidos e alimentos (última refeição). A: Ambiente/eventos do agravo.','Colete com acompanhante, socorrista ou familiar se o paciente não puder responder.'],
        perguntas:['Tem alergia a algum medicamento?','Quais medicamentos usa? Anticoagulante?','Quais doenças tem? Já operou?','Qual foi a última vez que comeu ou bebeu?','O que exatamente aconteceu, e a que horas?'] },
      { id:'ab3', foco:'sintese', titulo:'Avaliação secundária', objetivo:'Exame da cabeça aos pés e definição de conduta.',
        orientacoes:['Só depois de estabilizado.','Exames dirigidos, monitorização contínua e reavaliação.'],
        perguntas:['O que ainda não foi examinado?','Quais exames mudam a conduta agora?','Precisa de transferência ou de suporte avançado?'] } ] },

  { id:'ice', nome:'ICE / SIFE — Perspectiva da pessoa', sigla:'ICE', tipo:'Comunicação',
    uso:'Ferramenta curta para acessar ideias, preocupações e expectativas.',
    quando:'Encaixa em qualquer consulta; especialmente quando há discordância ou não adesão.',
    etapas:[
      { id:'ic1', foco:'exploracao', titulo:'Ideias, Preocupações, Expectativas e Função', objetivo:'Entender o modelo explicativo da pessoa.',
        orientacoes:['Pergunte sem parecer teste: "muita gente pensa em algo quando isso acontece…".','A expectativa não atendida é a principal causa de insatisfação e não adesão.','Função: o que a pessoa deixou de fazer por causa do problema.'],
        perguntas:['O que você acha que está causando isso? (Ideias)','O que mais te preocupa? Tem algo específico que te dá medo? (Preocupações)','O que você esperava de mim hoje? (Expectativas)','O que você deixou de fazer por causa disso? (Função)','Alguém próximo já teve algo parecido? O que aconteceu?'] } ] },

  { id:'bathe', nome:'BATHE — Abordagem psicossocial breve', sigla:'BATHE', tipo:'Saúde mental na APS',
    uso:'Cinco perguntas para acessar o contexto emocional em consultas curtas.',
    quando:'Queixas vagas, somatização, sofrimento psíquico, consultas de 15 minutos.',
    etapas:[
      { id:'ba1', foco:'contexto', titulo:'B.A.T.H.E.', objetivo:'Background, Affect, Trouble, Handling, Empathy.',
        orientacoes:['Leva 3 a 5 minutos e muda o rumo da consulta.','Termine sempre com a validação empática — é o que sustenta o vínculo.'],
        perguntas:['O que está acontecendo na sua vida? (Background)','Como você tem se sentido com isso? (Affect)','O que mais te incomoda nessa situação? (Trouble)','Como você tem lidado com isso? (Handling)','Deve ser muito difícil para você. (Empathy)'] } ] },

  { id:'spikes', nome:'SPIKES — Comunicação de más notícias', sigla:'SPIKES', tipo:'Comunicação difícil',
    uso:'Protocolo de seis passos para comunicar diagnóstico grave ou prognóstico reservado.',
    quando:'Câncer, doença terminal, óbito, malformação, resultado grave.',
    etapas:[
      { id:'sp1', foco:'abertura', titulo:'S — Setting (preparando o ambiente)', objetivo:'Privacidade, tempo, quem deve estar presente.',
        orientacoes:['Ambiente reservado, sentado, sem interrupções, celular no silencioso.','Pergunte quem a pessoa quer ao lado.','Reserve tempo real; não faça em pé no corredor.'],
        perguntas:['Podemos conversar em uma sala reservada?','Você gostaria que alguém estivesse com você nessa conversa?'] },
      { id:'sp2', foco:'exploracao', titulo:'P — Perception (percepção)', objetivo:'Descobrir o que a pessoa já sabe e entende.',
        orientacoes:['"Antes de falar, me conte o que você já entendeu até aqui."','Isso revela negação, expectativa irreal ou conhecimento correto.'],
        perguntas:['O que os outros médicos já te explicaram?','O que você entendeu sobre o motivo dos exames?'] },
      { id:'sp3', foco:'contexto', titulo:'I — Invitation (convite)', objetivo:'Perguntar quanto a pessoa quer saber.',
        orientacoes:['Respeitar quem não quer todos os detalhes agora.','Deixar a porta aberta para depois.'],
        perguntas:['Você é do tipo de pessoa que quer saber todos os detalhes ou prefere que eu fale o essencial?','Se em algum momento você quiser parar, é só me dizer.'] },
      { id:'sp4', foco:'sintese', titulo:'K — Knowledge (informação)', objetivo:'Dar a notícia com aviso prévio, em linguagem simples.',
        orientacoes:['Use tiro de aviso: "infelizmente, tenho uma notícia difícil".','Fale em blocos curtos, faça pausas e silêncio.','Não use jargão nem eufemismo que confunda.'],
        perguntas:['Infelizmente os exames não trouxeram a notícia que esperávamos.','O resultado mostrou… (pausa) Quer que eu continue?'] },
      { id:'sp5', foco:'plano', titulo:'E — Emotions (emoções)', objetivo:'Acolher a reação com respostas empáticas (NURSE).',
        orientacoes:['Nomeie a emoção, valide, respeite o silêncio, ofereça apoio, explore.','Não corra para o plano terapêutico antes de acolher.'],
        perguntas:['Percebo que isso te deixou muito abalado.','Faz todo sentido você se sentir assim.','Estou aqui com você. Quer um tempo?','O que mais te assusta agora?'] },
      { id:'sp6', foco:'fechamento', titulo:'S — Strategy and Summary', objetivo:'Plano, próximos passos e disponibilidade.',
        orientacoes:['Diga o que vem a seguir, quem cuidará e quando é o próximo contato.','Reforce que nunca haverá abandono, mesmo sem cura.','Cheque o entendimento.'],
        perguntas:['O próximo passo é… e eu vou acompanhar você em todas as etapas.','Mesmo que a cura não seja possível, sempre haverá o que fazer pelo seu conforto.','O que ficou de dúvida do que conversamos?'] } ] },

  { id:'nurse', nome:'NURSE — Resposta às emoções', sigla:'NURSE', tipo:'Comunicação difícil',
    uso:'Cinco respostas empáticas estruturadas para momentos de emoção intensa.',
    quando:'Choro, raiva, medo, silêncio na consulta.',
    etapas:[
      { id:'nu1', foco:'plano', titulo:'N.U.R.S.E.', objetivo:'Naming, Understanding, Respecting, Supporting, Exploring.',
        orientacoes:['Emoção não se resolve com informação; se responde com empatia.','Silêncio e presença valem mais do que frases prontas.'],
        perguntas:['Parece que você está com medo. (Naming)','Depois de tudo o que você passou, eu entendo por que se sente assim. (Understanding)','Admiro a forma como você tem cuidado da sua mãe. (Respecting)','Estou aqui com você, vamos juntos nisso. (Supporting)','Me conte mais sobre o que te preocupa. (Exploring)'] } ] },

  { id:'em', nome:'Entrevista motivacional', sigla:'EM', tipo:'Mudança de comportamento',
    uso:'Ajuda a pessoa a resolver ambivalência e construir o próprio argumento de mudança.',
    quando:'Tabagismo, álcool, adesão, dieta, exercício, uso de drogas.',
    etapas:[
      { id:'em1', foco:'abertura', titulo:'1. Engajar com OARS', objetivo:'Perguntas abertas, afirmação, escuta reflexiva e resumo.',
        orientacoes:['Nada de confronto: resistência é sinal de que você empurrou demais.','Peça permissão antes de informar: "posso te contar o que costuma acontecer?".'],
        perguntas:['Como é o seu uso hoje, num dia comum?','Você já conseguiu mudar coisas difíceis antes — como fez?','Posso te contar o que a gente costuma ver nesses casos?'] },
      { id:'em2', foco:'exploracao', titulo:'2. Explorar ambivalência', objetivo:'Balança decisória: prós e contras da mudança.',
        orientacoes:['Pergunte pelos ganhos do comportamento antes das perdas — isso reduz resistência.','Deixe a pessoa verbalizar o argumento de mudança (change talk).'],
        perguntas:['O que de bom o cigarro/a bebida faz por você hoje?','E o que ele te custa?','Como seria sua vida daqui a 5 anos se nada mudasse?','E se você conseguisse mudar?'] },
      { id:'em3', foco:'sintese', titulo:'3. Medir importância e confiança', objetivo:'Escalas de 0 a 10 e o "por que não menos".',
        orientacoes:['Pergunte "por que 6 e não 3?" — a pessoa dá o próprio argumento.','Se a confiança for baixa, trabalhe barreiras concretas.'],
        perguntas:['De 0 a 10, quanto é importante mudar isso?','Por que você deu 6 e não 3?','De 0 a 10, quanto você se sente capaz?','O que faria esse número subir um ponto?'] },
      { id:'em4', foco:'plano', titulo:'4. Planejar e sustentar', objetivo:'Plano concreto, pequeno e do tamanho da pessoa.',
        orientacoes:['Metas específicas e alcançáveis, definidas por ela.','Antecipe situações de risco e combine reavaliação. Recaída não é fracasso.'],
        perguntas:['Qual o primeiro passo possível já nesta semana?','Quais situações vão ser mais difíceis? Como você vai lidar?','Quem pode te apoiar nisso?','Podemos combinar de conversar sobre isso no retorno?'] } ] },

  { id:'rop', nome:'Registro Orientado por Problemas (Weed)', sigla:'ROP', tipo:'Registro clínico',
    uso:'Lista de problemas ativos e inativos, cada um com sua própria evolução SOAP.',
    quando:'Pacientes complexos, multimorbidade, internação prolongada.',
    etapas:[
      { id:'r1', foco:'sintese', titulo:'1. Banco de dados', objetivo:'Reunir tudo o que se sabe: anamnese, exame, exames.',
        orientacoes:['Consolide dados de todas as fontes: prontuário, família, exames antigos.'],
        perguntas:['O que já sei com segurança sobre este paciente?','Que informação essencial ainda falta?'] },
      { id:'r2', foco:'sintese', titulo:'2. Lista de problemas', objetivo:'Nomear cada problema no nível de certeza que você tem.',
        orientacoes:['Um problema pode ser sintoma, sinal, achado laboratorial, diagnóstico ou questão social.','Numere, date e classifique em ativo/inativo.','Nunca "invente" diagnóstico: se é só um sintoma, registre como sintoma.'],
        perguntas:['Quais problemas ativos existem hoje?','Quais problemas são sociais ou psicológicos, e não só biológicos?','Algum problema pode ser unificado sob um só diagnóstico?'] },
      { id:'r3', foco:'plano', titulo:'3. Plano por problema', objetivo:'Cada problema com plano diagnóstico, terapêutico e educativo.',
        orientacoes:['Evita esquecer problemas secundários nos pacientes complexos.','Priorize por gravidade e por impacto na vida da pessoa.'],
        perguntas:['Qual o plano para o problema 1? E para o 2?','Qual a prioridade de hoje?'] },
      { id:'r4', foco:'fechamento', titulo:'4. Evolução', objetivo:'Evoluir cada problema em SOAP.',
        orientacoes:['Evolução deve responder: mudou? por quê? o que faço agora?'],
        perguntas:['O que mudou desde ontem em cada problema?','O que a resposta ao tratamento me ensina sobre o diagnóstico?'] } ] },

  { id:'ptc', nome:'Projeto Terapêutico Singular (PTS)', sigla:'PTS', tipo:'Equipe / caso complexo',
    uso:'Construção coletiva de um plano para casos complexos, com a pessoa e a equipe.',
    quando:'Multimorbidade, vulnerabilidade social, saúde mental, uso de substâncias.',
    etapas:[
      { id:'p1', foco:'sintese', titulo:'1. Diagnóstico ampliado', objetivo:'Ver além da doença: história de vida, vulnerabilidades e potências.',
        orientacoes:['Inclua determinantes sociais, rede de apoio e o que a pessoa deseja.','Levante também as potências, não só os problemas.'],
        perguntas:['Quem é essa pessoa além do diagnóstico?','Quais são suas vulnerabilidades e quais são suas forças?','O que ela deseja para a própria vida?'] },
      { id:'p2', foco:'plano', titulo:'2. Definição de metas', objetivo:'Metas negociadas, de curto, médio e longo prazo.',
        orientacoes:['Metas devem ser da pessoa, não da equipe.','Pequenas e verificáveis.'],
        perguntas:['O que seria uma vitória para você nas próximas semanas?','O que é possível fazer agora, com o que temos?'] },
      { id:'p3', foco:'plano', titulo:'3. Divisão de responsabilidades', objetivo:'Quem faz o quê, incluindo a pessoa e a família.',
        orientacoes:['Defina um profissional de referência.','Deixe claro o papel da pessoa e da família.'],
        perguntas:['Quem será a referência desse caso na equipe?','O que cabe a você? O que cabe à sua família?'] },
      { id:'p4', foco:'fechamento', titulo:'4. Reavaliação', objetivo:'Revisar prazos e ajustar o plano.',
        orientacoes:['PTS é vivo: revise em datas combinadas.'],
        perguntas:['Quando reavaliamos esse plano?','O que deu certo e o que precisa mudar?'] } ] },

  { id:'apgar', nome:'Ferramentas de abordagem familiar', sigla:'Família', tipo:'Saúde da família',
    uso:'Genograma, ciclo de vida, APGAR familiar, FIRO e PRACTICE aplicados à consulta.',
    quando:'Problemas com forte componente familiar: adoecimento crônico, adolescência, luto, cuidador.',
    etapas:[
      { id:'ap1', foco:'contexto', titulo:'1. Genograma e ciclo de vida', objetivo:'Mapear a família em três gerações e a fase do ciclo de vida.',
        orientacoes:['Desenhe: quem mora junto, relações, doenças, óbitos.','Identifique a fase (casal, filhos pequenos, adolescentes, ninho vazio, velhice).'],
        perguntas:['Quem faz parte da sua família? Quem mora com você?','Quem é próximo de quem? Existe algum conflito importante?','Que doenças existem na família e em quem?','Que mudança importante a família viveu recentemente?'] },
      { id:'ap2', foco:'contexto', titulo:'2. APGAR familiar', objetivo:'Medir a satisfação com o funcionamento familiar.',
        orientacoes:['Cinco domínios: Adaptação, Participação, Crescimento, Afeição, Resolução.','Respostas: sempre / às vezes / nunca.'],
        perguntas:['Você está satisfeito com a ajuda que recebe da sua família quando tem um problema? (Adaptação)','Você está satisfeito com a forma como sua família discute assuntos e divide problemas? (Participação)','Sua família aceita seus desejos de mudança e crescimento? (Crescimento)','Você está satisfeito com o carinho que sua família demonstra? (Afeição)','Você está satisfeito com o tempo que passam juntos? (Resolução)'] },
      { id:'ap3', foco:'plano', titulo:'3. PRACTICE — plano familiar', objetivo:'Organizar a intervenção com a família.',
        orientacoes:['Problema, Papéis, Afeto, Comunicação, Tempo no ciclo de vida, Doença na família, Enfrentamento.','Considere reunião familiar quando o problema é do sistema, não do indivíduo.'],
        perguntas:['Como a família vê o problema?','Quem cuida de quem nessa casa? Como está o cuidador?','Como a família costuma enfrentar crises?','Faria sentido conversarmos com a família reunida?'] } ] },

  { id:'geriatrica', nome:'Avaliação Geriátrica Ampla (AGA)', sigla:'AGA', tipo:'Idoso',
    uso:'Avaliação multidimensional do idoso: funcional, cognitiva, afetiva, social e clínica.',
    quando:'Idoso frágil, quedas, polifarmácia, declínio funcional.',
    etapas:[
      { id:'g1', foco:'exploracao', titulo:'1. Funcional', objetivo:'AVD básicas (Katz) e instrumentais (Lawton).',
        orientacoes:['Funcionalidade é o principal desfecho em geriatria.','Pergunte o que a pessoa faz, não o que ela acha que consegue.'],
        perguntas:['Você toma banho, se veste e come sozinho?','Consegue usar telefone, tomar remédio sozinho, cuidar do dinheiro, fazer compras?','Você usa transporte sozinho? Cozinha?','Precisa de ajuda para andar? Usa bengala ou andador?'] },
      { id:'g2', foco:'exploracao', titulo:'2. Cognição, humor e sono', objetivo:'Rastreio de demência, depressão e distúrbios do sono.',
        orientacoes:['MEEM/MoCA, teste do relógio, GDS-15.','Sempre coletar história com acompanhante.'],
        perguntas:['Tem esquecido compromissos, nomes, onde guardou objetos?','Já se perdeu em lugar conhecido?','Nas últimas semanas, tem se sentido triste ou sem ânimo?','Como está seu sono?'] },
      { id:'g3', foco:'contexto', titulo:'3. Social, nutrição e sentidos', objetivo:'Rede de apoio, renda, nutrição, visão e audição.',
        orientacoes:['Déficit sensorial simula demência e causa isolamento.','Rastreie violência e negligência.'],
        perguntas:['Quem mora com você? Quem ajuda no dia a dia?','Como está seu apetite e seu peso? Perdeu peso sem querer?','Você enxerga e escuta bem? Quando foi o último exame?','Alguém já te tratou mal, gritou ou pegou seu dinheiro sem permissão?'] },
      { id:'g4', foco:'plano', titulo:'4. Síndromes geriátricas e plano', objetivo:'Os "5 Is": incapacidade, instabilidade, incontinência, iatrogenia, insuficiência cognitiva.',
        orientacoes:['Revise TODOS os medicamentos (Beers/STOPP).','Priorize funcionalidade e qualidade de vida sobre metas rígidas de exames.'],
        perguntas:['Teve quedas no último ano?','Tem perda de urina? Isso te limita?','Quantos medicamentos usa? Algum pode ser retirado?','O que é mais importante para você: viver mais ou viver melhor e independente?'] } ] },

  { id:'psiquiatrica', nome:'Entrevista psiquiátrica e exame do estado mental', sigla:'EEM', tipo:'Saúde mental',
    uso:'Estrutura da entrevista psiquiátrica e descrição sistemática do estado mental.',
    quando:'Qualquer queixa de saúde mental, alteração de comportamento ou risco.',
    etapas:[
      { id:'ps1', foco:'exploracao', titulo:'1. História psiquiátrica', objetivo:'Queixa, evolução, episódios prévios, tratamentos, uso de substâncias.',
        orientacoes:['Investigue funcionamento prévio e o que mudou.','Sempre pergunte sobre episódios de humor elevado e sobre uso de substâncias.'],
        perguntas:['O que está acontecendo e desde quando?','Já teve episódios parecidos antes? Já tratou? Com o quê?','Já teve períodos de energia excessiva, pouco sono e muitos planos?','Usa álcool ou outras substâncias? Quanto?','Já teve internação psiquiátrica ou tentativa de suicídio?'] },
      { id:'ps2', foco:'exame', titulo:'2. Exame do estado mental', objetivo:'Descrever, não interpretar.',
        orientacoes:['Aparência e atitude; consciência e orientação; atenção e memória; humor e afeto; pensamento (curso, forma, conteúdo); sensopercepção; juízo crítico; psicomotricidade.','Delírios e alucinações se perguntam com naturalidade.'],
        perguntas:['Você tem ouvido ou visto coisas que outras pessoas não percebem?','Sente que alguém quer te prejudicar ou que te observam?','Sente que seus pensamentos estão acelerados ou lentos?','Você acha que está doente? O que acha que precisa?'] },
      { id:'ps3', foco:'sintese', titulo:'3. Risco e plano', objetivo:'Risco de suicídio, heteroagressão e autonegligência; plano de cuidado.',
        orientacoes:['Pergunte diretamente sobre suicídio — não induz o ato.','Defina nível de cuidado, rede e retorno.'],
        perguntas:['Você tem pensado em morrer ou em se machucar?','Chegou a pensar em como? Tem acesso a isso?','Quem sabe o que você está passando? Com quem posso contar?','Podemos construir um plano de segurança juntos?'] } ] },

  { id:'prenatal-roteiro', nome:'Roteiro de consulta pré-natal', sigla:'Pré-natal', tipo:'Obstetrícia',
    uso:'Estrutura das consultas de pré-natal, com foco em risco e educação.',
    quando:'Toda gestante, em qualquer trimestre.',
    etapas:[
      { id:'pn1', foco:'exploracao', titulo:'1. História obstétrica e queixas', objetivo:'IG, antecedentes obstétricos e queixas do período.',
        orientacoes:['DUM, IG, DPP, GPA (gestações, partos, abortos).','Explore queixas fisiológicas e diferencie das patológicas.'],
        perguntas:['Qual sua última menstruação? Com quantas semanas você está?','Quantas gestações, partos e perdas você teve? Como foram?','Como você está se sentindo? Tem náusea, azia, dor, corrimento?','O bebê está mexendo? Desde quando você sente?'] },
      { id:'pn2', foco:'exame', titulo:'2. Exame obstétrico', objetivo:'PA, peso, altura uterina, BCF, apresentação, edema.',
        orientacoes:['Plote peso e altura uterina nas curvas.','PA correta é o exame mais importante do pré-natal.'],
        perguntas:['Vou medir sua pressão, seu peso e a altura do útero.','Vou escutar o coração do bebê agora.'] },
      { id:'pn3', foco:'sintese', titulo:'3. Rastreios e risco', objetivo:'Exames do trimestre, vacinas e classificação de risco.',
        orientacoes:['Exames de rotina por trimestre; retestar sífilis e HIV no 3º trimestre.','Classifique risco habitual x alto risco a cada consulta.'],
        perguntas:['Você trouxe os exames? Vamos revisar juntos.','Suas vacinas estão em dia (dTpa, hepatite B, influenza)?','Algum sinal de alerta desde a última consulta?'] },
      { id:'pn4', foco:'fechamento', titulo:'4. Educação e plano de parto', objetivo:'Sinais de alarme, aleitamento, plano de parto e apoio.',
        orientacoes:['Sinais de alarme por escrito: sangramento, perda de líquido, dor forte, redução de movimentos, cefaleia/escotomas.','Discuta plano de parto e rede de apoio.','Rastreie violência e sofrimento mental.'],
        perguntas:['Você sabe quais sinais exigem ir imediatamente à maternidade?','Como você imagina seu parto? Já pensou em um plano?','Você tem apoio em casa? Se sente segura?'] } ] },

  { id:'pediatrica', nome:'Roteiro de consulta pediátrica', sigla:'Pediatria', tipo:'Pediatria',
    uso:'Anamnese pediátrica com história gestacional, desenvolvimento, alimentação, vacinas e a criança como sujeito.',
    quando:'Qualquer consulta com criança ou adolescente.',
    etapas:[
      { id:'pd1', foco:'abertura', titulo:'1. Abertura com a criança e o cuidador', objetivo:'Falar com os dois; adolescentes merecem tempo a sós.',
        orientacoes:['Cumprimente a criança pelo nome e no nível dos olhos.','Com adolescentes, garanta confidencialidade e um momento reservado (HEEADSSS).'],
        perguntas:['Oi, como você se chama? O que te trouxe aqui?','(ao cuidador) O que preocupa vocês hoje?','(adolescente) Posso conversar um pouco com você a sós? O que falamos é confidencial, salvo risco à vida.'] },
      { id:'pd2', foco:'exploracao', titulo:'2. História perinatal, alimentar e do desenvolvimento', objetivo:'Gestação, parto, nascimento, marcos, alimentação e sono.',
        orientacoes:['Pré-natal, tipo de parto, IG, peso ao nascer, intercorrências neonatais.','Marcos por faixa etária; alerta para regressão.'],
        perguntas:['Como foi a gestação e o parto? Com quantas semanas nasceu e quanto pesou?','Teve alguma intercorrência ao nascer?','Como foi a amamentação? Como está a alimentação hoje?','O que ele já faz: sorri, senta, anda, fala, brinca com outras crianças?','Como está o sono?'] },
      { id:'pd3', foco:'contexto', titulo:'3. Vacinas, ambiente e família', objetivo:'Caderneta, creche, tabagismo passivo, segurança e rede familiar.',
        orientacoes:['Sempre peça a caderneta.','Rastreie violência, negligência e saúde mental do cuidador.'],
        perguntas:['Vocês trouxeram a caderneta de vacinação?','Ele frequenta creche ou escola? Como vai lá?','Alguém fuma em casa? Como é a moradia?','Como você está se sentindo cuidando dele? Tem ajuda?'] },
      { id:'pd4', foco:'exame', titulo:'4. Exame físico e curvas', objetivo:'Antropometria plotada, exame completo, desenvolvimento.',
        orientacoes:['Peso, estatura, PC e IMC nas curvas — mostre à família.','Examine da forma menos invasiva primeiro; deixe otoscopia e oroscopia por último.'],
        perguntas:['Vou pesar e medir, e depois examinar do jeito mais tranquilo possível.','Posso ver seu ouvidinho e sua garganta agora?'] },
      { id:'pd5', foco:'plano', titulo:'5. Plano e orientação antecipatória', objetivo:'Conduta + prevenção específica da faixa etária.',
        orientacoes:['Orientação antecipatória: acidentes, alimentação, sono, tela, disciplina positiva.','Sinais de retorno claros e por escrito.'],
        perguntas:['Combinando: vamos fazer X, e vocês devem voltar se…','Nesta idade, é importante cuidar de… já pensaram nisso?'] } ] }
  ];

  /* ================================== ESTADO ================================== */
  function defaultState(){ return { sessions: [], activeId:'', ui:{ view:'home', box:true } }; }
  let B = null;                                  // bridge
  let root = null;                               // container
  const esc = (v) => (B && B.escapeHtml ? B.escapeHtml(String(v==null?'':v)) : String(v==null?'':v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const store = () => { const s = B.getState(); if(!s.consulta) s.consulta = defaultState(); if(!s.consulta.ui) s.consulta.ui = { view:'home', box:true }; return s.consulta; };
  const save = () => B.save();
  const doencas = () => (window.CONSULTA_DOENCAS || []);
  const metodo = (id) => METODOS.find(m => m.id === id) || METODOS[0];
  const doenca = (id) => doencas().find(d => d.id === id) || null;
  const sessao = () => store().sessions.find(s => s.id === store().activeId) || null;
  const uid = () => `cc-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;

  function novaSessao(data){
    return { id: uid(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      metodoId: data.metodoId || 'mccp', doencaId: data.doencaId || '',
      paciente: { nome: data.nome || 'Paciente simulado', idade: data.idade || '', sexo: data.sexo || '' },
      etapaAtiva: '', asked: [], dialogo: [], notas: {}, revelados: 0, finalizada: false, autoavaliacao: '' };
  }

  /* ================================ RENDER ================================ */
  function mount(container, bridge){ B = bridge; root = container; render(); }

  function render(){
    const st = store();
    root.innerHTML = st.ui.view === 'sessao' && sessao() ? renderSessao() : renderHome();
    bind();
  }

  function renderHome(){
    const st = store();
    const sessions = [...st.sessions].sort((a,b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    const areas = [...new Set(doencas().map(d => d.area))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    return `<div class="cc-wrap">
      <div class="cc-safety"><strong>TREINO SIMULADO</strong><span>Paciente fictício, ambiente educacional. Não use para atendimento real nem insira dados de pessoas reais.</span></div>
      <div class="cc-home-head">
        <div><span class="eyebrow">Laboratório clínico</span><h1>Métodos clínicos — Simulador de consulta</h1>
        <p class="muted">Escolha o método, escolha a doença na caixa, dê um nome fictício ao paciente e conduza a consulta. A cada etapa eu te oriento sobre o que perguntar, o que examinar e o que não pode passar.</p></div>
      </div>
      <div class="grid cards cc-metrics">
        <div class="metric"><span>Métodos disponíveis</span><strong>${METODOS.length}</strong><small>do MCCP ao SPIKES</small></div>
        <div class="metric"><span>Condições na caixa</span><strong>${doencas().length}</strong><small>${areas.length} áreas</small></div>
        <div class="metric"><span>Consultas simuladas</span><strong>${sessions.length}</strong><small>${sessions.filter(s=>s.finalizada).length} finalizadas</small></div>
      </div>
      <section class="card cc-setup">
        <div class="section-title"><div><h2>Nova consulta simulada</h2><div class="muted">1) método · 2) doença · 3) nome do paciente</div></div></div>
        <div class="cc-setup-grid">
          <label>1. Método clínico
            <select class="select" id="ccMetodo">${METODOS.map(m=>`<option value="${m.id}">${esc(m.nome)}</option>`).join('')}</select>
          </label>
          <label>3. Nome fictício do paciente<input class="input" id="ccNome" placeholder="Ex.: Dona Marlene"></label>
          <label>Idade<input class="input" id="ccIdade" type="number" min="0" max="120" placeholder="anos"></label>
          <label>Sexo<select class="select" id="ccSexo"><option value="">—</option><option>Feminino</option><option>Masculino</option></select></label>
        </div>
        <div class="cc-metodo-info" id="ccMetodoInfo">${renderMetodoInfo(METODOS[0])}</div>
        <div class="cc-box">
          <div class="cc-box-head"><h3>2. Caixa de doenças</h3><input class="input" id="ccBusca" placeholder="Buscar doença, sintoma ou área…"></div>
          <div class="cc-chips" id="ccDoencaGrid">${renderDoencaChips('')}</div>
        </div>
        <button class="icon-btn primary cc-start" id="ccStart">Iniciar consulta simulada</button>
      </section>
      <section class="card">
        <div class="section-title"><h2>Consultas anteriores</h2><span class="badge today">${sessions.length}</span></div>
        <div class="cc-session-list">${sessions.map(s=>{
          const d = doenca(s.doencaId), m = metodo(s.metodoId);
          return `<article class="cc-session-row"><button data-cc-open="${s.id}"><strong>${esc(s.paciente.nome)} · ${esc(d?d.nome:'Sem condição')}</strong><span>${esc(m.sigla)} · ${new Date(s.createdAt).toLocaleDateString('pt-BR')} · ${s.asked.length} perguntas feitas</span></button><span class="badge ${s.finalizada?'done':'wait'}">${s.finalizada?'finalizada':'em aberto'}</span><button class="tiny-btn" data-cc-del="${s.id}" title="Excluir">×</button></article>`;
        }).join('') || '<div class="empty">Nenhuma consulta simulada ainda. Monte a primeira acima.</div>'}</div>
      </section>
    </div>`;
  }

  function renderMetodoInfo(m){
    return `<div class="cc-metodo-card"><div><span class="badge today">${esc(m.tipo)}</span><strong>${esc(m.nome)}</strong></div>
      <p>${esc(m.uso)}</p><p class="muted">${esc(m.quando)}</p>
      <div class="cc-metodo-steps">${m.etapas.map(e=>`<span>${esc(e.titulo)}</span>`).join('')}</div></div>`;
  }

  function normaliza(v){ return String(v||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }
  function renderDoencaChips(query, selectedId){
    const q = normaliza(query);
    const list = doencas().filter(d => !q || normaliza(`${d.nome} ${d.area} ${d.queixa}`).includes(q));
    if(!list.length) return '<div class="empty">Nenhuma condição encontrada.</div>';
    const groups = new Map();
    list.forEach(d => { if(!groups.has(d.area)) groups.set(d.area, []); groups.get(d.area).push(d); });
    return [...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0],'pt-BR')).map(([area, items]) =>
      `<div class="cc-chip-group"><h4>${esc(area)}</h4><div>${items.map(d=>`<button type="button" class="cc-chip${d.id===selectedId?' active':''}" data-cc-doenca="${d.id}" title="${esc(d.queixa)}">${esc(d.nome)}</button>`).join('')}</div></div>`
    ).join('');
  }

  /* ------------------------------- SESSÃO ------------------------------- */
  function renderSessao(){
    const s = sessao(), m = metodo(s.metodoId), d = doenca(s.doencaId);
    const etapaAtiva = s.etapaAtiva || m.etapas[0].id;
    const etapa = m.etapas.find(e => e.id === etapaAtiva) || m.etapas[0];
    const total = totalPerguntas(m, d);
    const feitas = s.asked.length;
    const pct = total ? Math.round(feitas / total * 100) : 0;
    return `<div class="cc-wrap cc-session">
      <div class="cc-safety"><strong>TREINO SIMULADO</strong><span>Paciente fictício. Nenhuma conduta aqui serve para atendimento real.</span></div>
      <header class="cc-top">
        <button class="icon-btn" id="ccBack">‹ Consultas</button>
        <label class="cc-top-field">Método<select class="select" id="ccTopMetodo">${METODOS.map(x=>`<option value="${x.id}"${x.id===m.id?' selected':''}>${esc(x.sigla)} — ${esc(x.nome.split('—')[0].trim())}</option>`).join('')}</select></label>
        <label class="cc-top-field">Paciente<input class="input" id="ccTopNome" value="${esc(s.paciente.nome)}"></label>
        <label class="cc-top-field cc-narrow">Idade<input class="input" id="ccTopIdade" type="number" value="${esc(s.paciente.idade)}"></label>
        <label class="cc-top-field cc-narrow">Sexo<select class="select" id="ccTopSexo"><option value="">—</option><option${s.paciente.sexo==='Feminino'?' selected':''}>Feminino</option><option${s.paciente.sexo==='Masculino'?' selected':''}>Masculino</option></select></label>
        <button class="icon-btn" id="ccToggleBox">${store().ui.box?'Fechar caixa de doenças':'Trocar doença'}</button>
        <button class="icon-btn" id="ccCopiar">Copiar consulta</button>
        <button class="icon-btn primary" id="ccFinalizar">${s.finalizada?'Reabrir':'Finalizar'}</button>
      </header>
      ${store().ui.box ? `<section class="card cc-box cc-box-inline"><div class="cc-box-head"><h3>Caixa de doenças</h3><input class="input" id="ccBusca" placeholder="Buscar doença, sintoma ou área…"></div><div class="cc-chips" id="ccDoencaGrid">${renderDoencaChips('', s.doencaId)}</div></section>` : ''}
      ${d ? '' : '<div class="empty">Escolha uma condição na caixa acima para receber as perguntas dirigidas.</div>'}
      ${d ? `<section class="cc-caso card"><div><span class="eyebrow">Caso simulado</span><h2>${esc(s.paciente.nome)}${s.paciente.idade?` · ${esc(s.paciente.idade)} anos`:''}${s.paciente.sexo?` · ${esc(s.paciente.sexo)}`:''}</h2><p><strong>Queixa:</strong> ${esc(d.queixa)}</p><p class="muted">${esc(d.perfil)}</p></div><div class="cc-progress"><span>Roteiro coberto</span><strong>${pct}%</strong><i style="--p:${pct}%"></i><small>${feitas} de ${total} perguntas-chave</small></div></section>` : ''}
      <div class="cc-layout">
        <aside class="cc-steps card">
          <h3>Etapas do método</h3>
          <div class="cc-step-list">${m.etapas.map((e,i)=>{
            const done = etapaConcluida(s, m, d, e);
            return `<button class="cc-step${e.id===etapaAtiva?' active':''}${done?' done':''}" data-cc-step="${e.id}"><span>${i+1}</span><div><strong>${esc(e.titulo.replace(/^\d+\.\s*/,''))}</strong><small>${esc(F[e.foco]||'')}</small></div></button>`;
          }).join('')}</div>
          <div class="cc-step-note"><strong>${esc(m.sigla)}</strong><p>${esc(m.uso)}</p></div>
        </aside>
        <section class="cc-main card">
          <div class="cc-etapa-head"><span class="eyebrow">${esc(F[etapa.foco]||'Etapa')}</span><h2>${esc(etapa.titulo)}</h2><p class="muted">${esc(etapa.objetivo)}</p></div>
          <div class="cc-orient"><h4>Como conduzir</h4><ul>${etapa.orientacoes.map(o=>`<li>${esc(o)}</li>`).join('')}</ul></div>
          <div class="cc-perguntas">
            <h4>Frases e perguntas do método</h4>
            <div class="cc-q-list">${etapa.perguntas.map((q,i)=>renderPergunta(s, `${etapa.id}-m${i}`, q, 'metodo')).join('')}</div>
            ${d ? renderPerguntasDoenca(s, d, etapa) : ''}
          </div>
          <div class="cc-anot"><h4>Sua anotação nesta etapa</h4><textarea class="textarea" id="ccNota" data-etapa="${etapa.id}" placeholder="Escreva aqui como se estivesse registrando o que a pessoa respondeu, o que você pensou e o que decidiu.">${esc(s.notas[etapa.id]||'')}</textarea></div>
          <div class="cc-dialogo">
            <div class="section-title"><h4>Transcrição da consulta</h4><button class="tiny-btn" id="ccLimparDialogo">Limpar</button></div>
            <div class="cc-dialogo-list" id="ccDialogoList">${s.dialogo.map((l,i)=>`<div class="cc-linha ${l.quem}"><span>${l.quem==='medico'?'Você':esc(s.paciente.nome)}</span><p>${esc(l.texto)}</p><button class="tiny-btn" data-cc-del-linha="${i}" title="Remover">×</button></div>`).join('') || '<div class="empty">Clique numa pergunta ao lado ou escreva abaixo para começar a conversa.</div>'}</div>
            <div class="cc-dialogo-input">
              <select class="select" id="ccQuem"><option value="medico">Você (médico)</option><option value="paciente">${esc(s.paciente.nome)}</option></select>
              <input class="input" id="ccFala" placeholder="Digite sua fala e pressione Enter">
              <button class="tiny-btn" id="ccAddFala">Adicionar</button>
            </div>
          </div>
        </section>
        <aside class="cc-coach card">
          <h3>Painel de orientação</h3>
          ${d ? `
          <details open><summary>⚠️ Não pode passar (sinais de alarme)</summary><ul>${d.redflags.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>
          <details${etapa.foco==='exame'?' open':''}><summary>🩺 Exame físico dirigido</summary><ul>${d.exame.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>
          <details${etapa.foco==='sintese'?' open':''}><summary>🧠 Hipóteses e diferenciais</summary><ul>${(d.hipoteses||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>
          <details${etapa.foco==='plano'||etapa.foco==='fechamento'?' open':''}><summary>📋 Conduta e plano</summary><ul>${d.conduta.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>
          <details><summary>💡 Pontos-chave para a prova</summary><ul>${(d.pontos||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>
          <div class="cc-next"><h4>Próximo passo sugerido</h4><p>${esc(proximoPasso(s, m, d, etapa))}</p></div>
          ` : '<p class="muted">Escolha uma condição para ver sinais de alarme, exame dirigido, hipóteses e conduta.</p>'}
          ${s.finalizada ? `<div class="cc-autoaval"><h4>Autoavaliação</h4><textarea class="textarea" id="ccAuto" placeholder="O que você faria diferente nesta consulta?">${esc(s.autoavaliacao||'')}</textarea></div>` : ''}
        </aside>
      </div>
    </div>`;
  }

  function renderPergunta(s, key, texto, tipo){
    const feita = s.asked.includes(key);
    return `<div class="cc-q${feita?' feita':''}"><button type="button" data-cc-ask="${esc(key)}" data-texto="${esc(texto)}" data-tipo="${tipo}">${esc(texto)}</button><span>${feita?'✓':'+'}</span></div>`;
  }

  function perguntasDaDoenca(d, etapa){
    if(!d) return [];
    if(etapa.foco === 'exploracao' || etapa.foco === 'abertura') return d.perguntas;
    if(etapa.foco === 'contexto') return d.perguntas.slice(-4);
    if(etapa.foco === 'exame') return d.exame.map(x => `Examinar: ${x}`);
    if(etapa.foco === 'sintese') return (d.hipoteses||[]).map(x => `Considerar: ${x}`);
    if(etapa.foco === 'plano' || etapa.foco === 'fechamento') return d.conduta.map(x => `Conduta: ${x}`);
    return d.perguntas;
  }

  function renderPerguntasDoenca(s, d, etapa){
    const list = perguntasDaDoenca(d, etapa);
    if(!list.length) return '';
    return `<h4 class="cc-q-title">Dirigido a: ${esc(d.nome)}</h4><div class="cc-q-list">${list.map((q,i)=>renderPergunta(s, `${etapa.id}-d${i}`, q, 'doenca')).join('')}</div>`;
  }

  function totalPerguntas(m, d){
    return m.etapas.reduce((sum, e) => sum + e.perguntas.length + perguntasDaDoenca(d, e).length, 0);
  }
  function etapaConcluida(s, m, d, e){
    const total = e.perguntas.length + perguntasDaDoenca(d, e).length;
    if(!total) return false;
    const feitas = s.asked.filter(k => k.startsWith(`${e.id}-`)).length;
    return feitas >= Math.ceil(total * 0.6);
  }
  function proximoPasso(s, m, d, etapa){
    const pendentes = etapa.perguntas.filter((q,i) => !s.asked.includes(`${etapa.id}-m${i}`));
    if(pendentes.length) return `Ainda nesta etapa: "${pendentes[0]}"`;
    const dq = perguntasDaDoenca(d, etapa).filter((q,i) => !s.asked.includes(`${etapa.id}-d${i}`));
    if(dq.length) return `Falta explorar: "${dq[0]}"`;
    const idx = m.etapas.findIndex(e => e.id === etapa.id);
    const prox = m.etapas[idx+1];
    return prox ? `Etapa coberta. Avance para "${prox.titulo}".` : 'Roteiro completo. Feche com resumo, sinais de alarme e retorno — depois finalize a consulta.';
  }
  function respostaDoPaciente(s, d){
    if(!d || !d.achados || !d.achados.length) return null;
    const i = s.revelados % d.achados.length;
    s.revelados++;
    return d.achados[i];
  }

  /* ================================= EVENTOS ================================= */
  function bind(){
    const st = store();
    // ---- home
    const metodoSel = root.querySelector('#ccMetodo');
    if(metodoSel) metodoSel.onchange = () => { const info = root.querySelector('#ccMetodoInfo'); if(info) info.innerHTML = renderMetodoInfo(metodo(metodoSel.value)); };
    let escolhida = '';
    const busca = root.querySelector('#ccBusca');
    if(busca) busca.oninput = () => { const grid = root.querySelector('#ccDoencaGrid'); if(grid){ grid.innerHTML = renderDoencaChips(busca.value, escolhida || (sessao()?sessao().doencaId:'')); bindChips(); } };
    function bindChips(){
      root.querySelectorAll('[data-cc-doenca]').forEach(btn => btn.onclick = () => {
        const id = btn.dataset.ccDoenca;
        const s = sessao();
        if(st.ui.view === 'sessao' && s){ s.doencaId = id; s.updatedAt = new Date().toISOString(); st.ui.box = false; save(); render(); return; }
        escolhida = id;
        root.querySelectorAll('[data-cc-doenca]').forEach(b => b.classList.toggle('active', b === btn));
      });
    }
    bindChips();
    const start = root.querySelector('#ccStart');
    if(start) start.onclick = () => {
      if(!escolhida){ alert('Escolha uma doença na caixa antes de iniciar.'); return; }
      const nome = (root.querySelector('#ccNome')?.value || '').trim() || 'Paciente simulado';
      const s = novaSessao({ metodoId: root.querySelector('#ccMetodo').value, doencaId: escolhida, nome,
        idade: root.querySelector('#ccIdade')?.value || '', sexo: root.querySelector('#ccSexo')?.value || '' });
      st.sessions.unshift(s); st.activeId = s.id; st.ui.view = 'sessao'; st.ui.box = false; save(); render();
    };
    root.querySelectorAll('[data-cc-open]').forEach(btn => btn.onclick = () => { st.activeId = btn.dataset.ccOpen; st.ui.view = 'sessao'; st.ui.box = false; save(); render(); });
    root.querySelectorAll('[data-cc-del]').forEach(btn => btn.onclick = () => { if(!confirm('Excluir esta consulta simulada?')) return; st.sessions = st.sessions.filter(x => x.id !== btn.dataset.ccDel); save(); render(); });

    // ---- sessão
    const s = sessao();
    if(st.ui.view !== 'sessao' || !s) return;
    const touch = () => { s.updatedAt = new Date().toISOString(); save(); };
    root.querySelector('#ccBack').onclick = () => { st.ui.view = 'home'; st.activeId = ''; save(); render(); };
    root.querySelector('#ccToggleBox').onclick = () => { st.ui.box = !st.ui.box; save(); render(); };
    root.querySelector('#ccTopMetodo').onchange = e => { s.metodoId = e.target.value; s.etapaAtiva = ''; touch(); render(); };
    root.querySelector('#ccTopNome').onchange = e => { s.paciente.nome = e.target.value.trim() || 'Paciente simulado'; touch(); render(); };
    root.querySelector('#ccTopIdade').onchange = e => { s.paciente.idade = e.target.value; touch(); };
    root.querySelector('#ccTopSexo').onchange = e => { s.paciente.sexo = e.target.value; touch(); };
    root.querySelectorAll('[data-cc-step]').forEach(btn => btn.onclick = () => { s.etapaAtiva = btn.dataset.ccStep; touch(); render(); });
    root.querySelectorAll('[data-cc-ask]').forEach(btn => btn.onclick = () => {
      const key = btn.dataset.ccAsk, texto = btn.dataset.texto;
      if(!s.asked.includes(key)) s.asked.push(key);
      s.dialogo.push({ quem:'medico', texto });
      const d = doenca(s.doencaId);
      if(btn.dataset.tipo === 'doenca' && /^(Examinar|Considerar|Conduta):/.test(texto)) { /* item de raciocínio, sem resposta do paciente */ }
      else { const r = respostaDoPaciente(s, d); if(r) s.dialogo.push({ quem:'paciente', texto:r }); }
      touch(); render();
      const list = root.querySelector('#ccDialogoList'); if(list) list.scrollTop = list.scrollHeight;
    });
    const nota = root.querySelector('#ccNota');
    if(nota){ nota.oninput = () => { s.notas[nota.dataset.etapa] = nota.value; }; nota.onblur = () => touch(); }
    const auto = root.querySelector('#ccAuto');
    if(auto){ auto.oninput = () => { s.autoavaliacao = auto.value; }; auto.onblur = () => touch(); }
    const fala = root.querySelector('#ccFala');
    const addFala = () => {
      const texto = (fala.value || '').trim(); if(!texto) return;
      s.dialogo.push({ quem: root.querySelector('#ccQuem').value, texto });
      fala.value = ''; touch(); render();
      const f = root.querySelector('#ccFala'); if(f) f.focus();
    };
    if(fala){ fala.onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); addFala(); } }; root.querySelector('#ccAddFala').onclick = addFala; }
    root.querySelectorAll('[data-cc-del-linha]').forEach(btn => btn.onclick = () => { s.dialogo.splice(Number(btn.dataset.ccDelLinha), 1); touch(); render(); });
    root.querySelector('#ccLimparDialogo').onclick = () => { if(!confirm('Apagar toda a transcrição desta consulta?')) return; s.dialogo = []; s.revelados = 0; touch(); render(); };
    root.querySelector('#ccFinalizar').onclick = () => { s.finalizada = !s.finalizada; touch(); render(); };
    root.querySelector('#ccCopiar').onclick = () => {
      const texto = exportar(s);
      if(navigator.clipboard) navigator.clipboard.writeText(texto).then(()=>alert('Consulta copiada.'), ()=>prompt('Copie o texto:', texto));
      else prompt('Copie o texto:', texto);
    };
  }

  function exportar(s){
    const m = metodo(s.metodoId), d = doenca(s.doencaId);
    const linhas = [`CONSULTA SIMULADA (treino educacional)`, `Método: ${m.nome}`, `Condição: ${d?d.nome:'—'}`,
      `Paciente fictício: ${s.paciente.nome}${s.paciente.idade?`, ${s.paciente.idade} anos`:''}${s.paciente.sexo?`, ${s.paciente.sexo}`:''}`, ''];
    m.etapas.forEach(e => { const n = s.notas[e.id]; if(n && n.trim()) linhas.push(`## ${e.titulo}`, n.trim(), ''); });
    if(s.dialogo.length){ linhas.push('## Transcrição'); s.dialogo.forEach(l => linhas.push(`${l.quem==='medico'?'Médico':s.paciente.nome}: ${l.texto}`)); linhas.push(''); }
    if(s.autoavaliacao) linhas.push('## Autoavaliação', s.autoavaliacao);
    return linhas.join('\n');
  }

  window.ConsultaClinica = { mount, defaultState, METODOS };
})();
