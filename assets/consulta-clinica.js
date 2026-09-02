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
        orientacoes:['Revise os fatos clínicos antes de entrar e antecipe as perguntas difíceis.','Garanta privacidade, sente-se na mesma altura e reduza interrupções.','Confirme quem a pessoa deseja ao lado e ofereça apoio de comunicação, se necessário.'],
        perguntas:['Este é um lugar confortável e reservado para conversarmos?','Você gostaria que alguém de sua confiança estivesse com você?','Podemos desligar as interrupções e conversar com calma agora?','Antes de começarmos, há algo de que você precise para se sentir mais confortável?'] },
      { id:'sp2', foco:'exploracao', titulo:'P — Perception (percepção)', objetivo:'Descobrir o que a pessoa já sabe e entende.',
        orientacoes:['Comece pelo entendimento da pessoa, sem corrigir imediatamente.','Explore o que ela percebeu na evolução e o que imagina que os exames mostraram.','Identifique lacunas, negação e expectativas irreais para calibrar a notícia.'],
        perguntas:['Antes de eu explicar os resultados, o que você entendeu sobre sua doença até aqui?','O que você percebeu que mudou na sua saúde nas últimas semanas?','O que imagina que os exames ou o tratamento mostraram?','Na sua compreensão, qual era o objetivo do tratamento até agora?'] },
      { id:'sp3', foco:'contexto', titulo:'I — Invitation (convite)', objetivo:'Perguntar quanto a pessoa quer saber.',
        orientacoes:['Peça permissão para compartilhar a informação.','Respeite o ritmo e a quantidade de detalhes desejada, inclusive sobre prognóstico.','Se a pessoa não quiser saber agora, combine a quem informar e mantenha a porta aberta.'],
        perguntas:['Você gostaria que eu explicasse agora o que os resultados mostram?','Prefere que eu comece pelo essencial ou quer todos os detalhes?','Você quer conversar também sobre o que isso significa para o futuro e sobre tempo de vida?','Com quem mais você autoriza que eu compartilhe essas informações?'] },
      { id:'sp4', foco:'sintese', titulo:'K — Knowledge (informação)', objetivo:'Dar a notícia com aviso prévio, em linguagem simples.',
        orientacoes:['Use um “tiro de aviso” antes da notícia: “Infelizmente, tenho uma notícia difícil”.','Diga a informação central com palavras claras, em uma ou duas frases; depois pare.','Dê blocos pequenos, evite jargão e cheque a compreensão antes de acrescentar detalhes.','Não declare prazos exatos como certeza; comunique incerteza com honestidade.'],
        perguntas:['Infelizmente, tenho uma notícia difícil para compartilhar.','Os resultados mostram que… (diga a notícia central em linguagem simples e faça uma pausa).','O que você entendeu do que eu disse até aqui?','Quer que eu explique novamente alguma parte ou prossiga com mais detalhes?'] },
      { id:'sp5', foco:'plano', titulo:'E — Emotions (emoções)', objetivo:'Acolher a reação com respostas empáticas (NURSE).',
        orientacoes:['Observe e nomeie a emoção antes de voltar às informações.','Use NURSE: nomear, compreender, respeitar, apoiar e explorar.','Tolere o silêncio; não apresse a pessoa nem tente apagar a emoção com falsa tranquilização.'],
        perguntas:['Percebo que essa notícia deixou você muito abalado.','Imagino como deve ser difícil ouvir isso depois de tudo o que você viveu.','Vamos fazer uma pausa. Estou aqui com você.','O que passa pela sua cabeça agora?','O que mais assusta ou preocupa você neste momento?'] },
      { id:'sp6', foco:'fechamento', titulo:'S — Strategy and Summary', objetivo:'Plano, próximos passos e disponibilidade.',
        orientacoes:['Só avance quando a emoção tiver sido reconhecida.','Pergunte o que importa, apresente opções realistas e construa o plano em conjunto.','Resuma notícia e próximos passos, nomeie responsáveis, combine retorno e cheque o entendimento.','Evite “não há mais nada a fazer”: cuidado, conforto e acompanhamento continuam.'],
        perguntas:['Diante do que conversamos, o que é mais importante para você agora?','Posso explicar as opções e construirmos juntos o próximo passo?','Mesmo sem possibilidade de cura, há muito que podemos fazer para controlar sintomas e cuidar de você.','Vamos resumir o plano, quem será acionado e quando voltaremos a conversar.','Para eu confirmar que fui claro: como você explicaria nossa conversa a alguém de sua confiança?','Que dúvidas ficaram ou o que você gostaria de perguntar agora?'] } ] },

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

  /* Respostas do paciente para as perguntas de cada método, na mesma ordem de `perguntas`.
   * '@campo' busca a fala específica da doença em `perspectiva`; '' = não cabe resposta
   * do paciente (é raciocínio seu ou fala dirigida a outro profissional). */
  const RESPOSTAS_METODO = {
    m1:['@abertura','@historia','@funcao','@ideias','@preocupacoes','@expectativas','Acho que é isso. Falei tudo que estava me incomodando.'],
    m2:['@contexto','Trabalho o dia todo e chego em casa acabado.','Dá pra me virar, mas remédio caro pesa no orçamento.','@emocao','Minha fé me ajuda muito a aguentar as coisas.'],
    m3:['@exame','Pode apertar, eu aviso se doer.','Entendi, doutor. Obrigado por explicar desse jeito.'],
    m4:['@entendimento','Pode explicar as duas, quero entender direitinho.','Acho que consigo fazer isso, sim.','@expectativas'],
    m5:['@emocao','Pode marcar que eu venho.','Anotei. Se aparecer isso eu procuro atendimento na hora.','@resumo'],
    s1:['@abertura','@historia','Melhora quando eu descanso e piora quando eu forço.','Tenho o que já te falei, e tomo esses remédios mesmo.','Durmo mal, como correndo e não faço exercício nenhum.'],
    s2:['@exame','Trouxe sim, estão aqui na pasta.'],
    s3:['','',''],
    s4:['','','',''],
    c1:['Prazer, doutor. Pode me chamar pelo primeiro nome.','@abertura','Tem outra coisinha, mas o principal é isso mesmo.','Vamos começar por essa que me incomoda mais.'],
    c2:['@historia','É como se apertasse, sabe? Não é uma fisgada.','@resumo','@ideias'],
    c3:['@exame','Pode deixar, eu aviso se incomodar.'],
    c4:['@entendimento','Prefiro o essencial, sem muito termo difícil.','Ficou claro até aqui, sim.','Acho que dá pra fazer. Só o horário que é mais complicado.'],
    c5:['Entendi o combinado, doutor.','Certo. Se acontecer isso eu procuro na hora.','@resumo','@duvida'],
    a1:['Meu nome é esse mesmo que está no cartão.','Trabalho aqui perto e moro na região.','@abertura'],
    a2:['@historia','Começou aos poucos e foi piorando com o tempo.','É bem incômodo, uns 7 de 10.','Melhora com repouso e piora quando eu me esforço.','Vem junto com aquele cansaço que eu falei.','Tomei um remédio de farmácia, ajudou pouco.'],
    a3:['Febre não tive. Cansaço sim, e não perdi peso.','Dor de cabeça de vez em quando; a vista está normal.','Falta de ar quando me esforço. Dor no peito não.','Azia às vezes; o intestino está normal.','Pra urinar está tudo normal, sem ardência.','Durmo mal e ando meio ansioso.','Dor nas juntas de vez em quando; a pele está boa.'],
    a4:['Tenho o que já comentei. Operei uma vez, faz tempo.','Alergia a remédio nenhuma que eu saiba.','Tomo os que falei e às vezes um chá que minha mãe faz.','Bebo socialmente; sobre cigarro já te contei.','Como correndo, durmo mal e não me exercito.','Na minha família tem pressão alta e diabetes.','@contexto'],
    a5:['@exame'],
    a6:['','',''],
    so1:['É bem aqui, ó (aponta com o dedo).','Começou de repente, eu estava parado quando veio.','É tipo um aperto, um peso.','Vai um pouco pro lado e pras costas.','Veio com enjoo e um suor frio.','É mais constante, mas piora à noite.','Piora quando eu me mexo e melhora se eu fico parado.','Agora uns 6. No pior momento foi 9.'],
    ol1:['Começou aos poucos, faz umas semanas.','Sinto mais aqui nessa região.','Dura um bom tempo, às vezes o dia todo.','É um incômodo meio surdo, constante.','Piora quando eu me esforço.','Melhora se eu paro e descanso um pouco.','De manhã costuma ser pior.','Uns 6 de 10, e me atrapalha pra trabalhar.'],
    sb1:[''], sb2:[''], sb3:[''], sb4:['',''],
    ab1:['','','','',''],
    ab2:['Alergia a remédio eu não tenho.','Tomo os remédios que já falei, nada além disso.','Tenho o que comentei e já operei uma vez.','Comi hoje de manhã, umas sete horas.','Foi tudo muito rápido, doutor, mal vi o que aconteceu.'],
    ab3:['','',''],
    ic1:['@ideias','@preocupacoes','@expectativas','@funcao','Um parente meu teve algo parecido e não terminou bem.'],
    ba1:['@contexto','@emocao','@preocupacoes','Vou levando como dá, tentando não pensar muito.','Obrigado, doutor. Faz diferença ouvir isso.'],
    sp1:['@spikes.privacidade','@spikes.acompanhante','@spikes.tempo','@spikes.conforto'],
    sp2:['@spikes.percepcao','@spikes.mudanca','@spikes.expectativaExame','@spikes.objetivoTratamento'],
    sp3:['@spikes.convite','@spikes.detalhes','@spikes.prognostico','@spikes.compartilhamento'],
    sp4:['@spikes.reacaoAviso','@spikes.reacaoNoticia','@spikes.compreensao','@spikes.maisDetalhes'],
    sp5:['@spikes.emocao','@spikes.validacao','@spikes.pausa','@spikes.pensamento','@spikes.medo'],
    sp6:['@spikes.prioridade','@spikes.opcoes','@spikes.naoAbandono','@spikes.plano','@spikes.resumo','@spikes.duvidas'],
    nu1:['É, estou com medo mesmo.','Obrigado, doutor. Ninguém tinha falado assim comigo.','Faço o que posso por ela.','Isso ajuda muito, de verdade.','@preocupacoes'],
    em1:['@abertura','Já parei outras coisas antes, na força de vontade.','Pode falar, doutor, eu escuto.'],
    em2:['Me acalma, me distrai depois de um dia ruim.','Me custa saúde e dinheiro, isso eu sei.','Acho que estaria bem pior do que hoje.','Seria bom. Eu me sentiria orgulhoso de mim.'],
    em3:['Uns 8. É importante sim.','Porque já vi o que aconteceu com gente próxima de mim.','Capacidade uns 4. Já tentei e falhei antes.','Se eu tivesse um acompanhamento mais de perto.'],
    em4:['Posso começar diminuindo aos poucos já essa semana.','O fim de semana e a companhia dos amigos.','Minha esposa me apoia bastante nisso.','Pode marcar que eu venho conversar.'],
    r1:['',''], r2:['','',''], r3:['',''], r4:['',''],
    p1:['','',''],
    p2:['Seria conseguir voltar a trabalhar.','Dá pra tentar, sim.'],
    p3:['','Eu faço a minha parte, e minha filha me ajuda com o resto.'],
    p4:['Pode marcar, doutor.','Melhorou um pouco, mas ainda tem coisa pra ajustar.'],
    ap1:['@contexto','Sou mais próximo da minha filha. Com meu irmão a gente não se fala.','Na família tem pressão alta e diabetes.','Minha mãe faleceu ano passado e isso mexeu com todo mundo.'],
    ap2:['Às vezes. Quando eu preciso mesmo, eles ajudam.','Às vezes. A gente não conversa muito sobre problema.','Sim, eles apoiam o que eu quero fazer.','Sim, carinho não falta lá em casa.','Quase nunca. Cada um na sua correria.'],
    ap3:['Eles acham que eu não me cuido direito.','Eu cuido da minha mãe e minha filha cuida de mim.','A gente segura as pontas e reza bastante.','Faria sim, acho que ajudaria a gente se entender.'],
    g1:['Banho e roupa eu faço sozinho.','Telefone eu uso. O dinheiro quem cuida é minha filha.','Não pego mais ônibus sozinho. Cozinhar eu ainda faço.','Ando devagar, me segurando nos móveis.'],
    g2:['Esqueço nomes e onde deixei as coisas.','Uma vez me perdi voltando da padaria.','Ando meio pra baixo, sim.','Durmo mal, acordo várias vezes de madrugada.'],
    g3:['@apoio','Como pouco e perdi uns quilos ultimamente.','Enxergo mal. Faz anos que não troco o óculos.','Não, ninguém me maltrata.'],
    g4:['Caí duas vezes esse ano.','Escapa um pouco de urina, sim. Me deixa constrangido.','Tomo bastante remédio, uns sete.','Quero continuar me virando sozinho.'],
    ps1:['@abertura','Já tive algo parecido antes, mas não cheguei a tratar.','Acelerado desse jeito, nunca me aconteceu.','Bebo de vez em quando, mais quando fico mal.','Internação eu nunca tive.'],
    ps2:['Ouvir voz não. Às vezes acho que escuto meu nome.','Sinto que as pessoas me olham diferente na rua.','Meus pensamentos ficam acelerados à noite.','Acho que estou doente, sim. Queria melhorar.'],
    ps3:['Já pensei que seria melhor não acordar.','Não cheguei a pensar em como, não.','@apoio','Podemos sim, doutor.'],
    pn1:['Foi no dia 12 do mês passado, anotei no aplicativo.','É a minha primeira gestação.','Tenho enjoo de manhã e uma azia que não passa.','Sinto ele mexer bastante, ainda mais à noite.'],
    pn2:['@exame','Pode escutar, doutor. Fico ansiosa nessa hora.'],
    pn3:['Trouxe sim, estão aqui.','Acho que estão em dia. Trouxe o cartão pra o senhor ver.','Nada demais desde a última, só o enjoo mesmo.'],
    pn4:['Sei mais ou menos, mas queria que o senhor anotasse pra mim.','Queria parto normal, se der certo.','Tenho meu marido e minha mãe. Me sinto segura, sim.'],
    pd1:['(a criança) Oi... tô com dodói.','A gente veio porque ele não está bem, doutor.','Pode sim. Prefiro conversar sozinho mesmo.'],
    pd2:['A gestação foi tranquila, parto normal, nasceu com 3 quilos.','Não teve nada de errado ao nascer.','Mamou até um ano. Hoje come de tudo, mas enjeita verdura.','Ele já anda, fala bastante e brinca com os priminhos.','Dorme bem, umas dez horas por noite.'],
    pd3:['Trouxemos a caderneta, está aqui.','Vai na creche e gosta de lá.','O avô fuma na varanda. Moramos em casa própria.','Ando cansada, mas tenho ajuda do meu marido.'],
    pd4:['@exame','Pode ver sim, doutor.'],
    pd5:['Entendi, doutor.','Não tinha pensado nisso. Vou cuidar disso em casa.']
  };
  METODOS.forEach(m => m.etapas.forEach(e => { e.resp = RESPOSTAS_METODO[e.id] || e.perguntas.map(() => ''); }));

  /* ================================== ESTADO ================================== */
  function defaultState(){ return { sessions: [], activeId:'', ui:{ view:'home', box:true, perguntasOcultas:false, ocultarFeitas:false, orientOculta:false } }; }
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

  /* Limpeza da integração de IA que existiu em versões anteriores deste módulo. */
  try { ['cc_gemini_api_key','cc_gemini_enabled','cc_gemini_model'].forEach(k => localStorage.removeItem(k)); } catch(e){}

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
          <div class="cc-chips" id="ccDoencaGrid">${renderDoencaChips('', '', METODOS[0].id)}</div>
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
  function renderDoencaChips(query, selectedId, metodoId){
    const q = normaliza(query);
    const apenasComunicacao = metodoId === 'spikes';
    const list = doencas().filter(d => (!apenasComunicacao || d.spikes) && (!q || normaliza(`${d.nome} ${d.area} ${d.queixa} ${d.spikes?.cenario||''}`).includes(q)));
    if(!list.length) return `<div class="empty">${apenasComunicacao?'Nenhum cenário SPIKES encontrado.':'Nenhuma condição encontrada.'}</div>`;
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
      ${store().ui.box ? `<section class="card cc-box cc-box-inline"><div class="cc-box-head"><h3>${m.id==='spikes'?'Cenários de más notícias':'Caixa de doenças'}</h3><input class="input" id="ccBusca" placeholder="Buscar doença, sintoma ou área…"></div>${m.id==='spikes'?'<p class="muted cc-box-hint">Somente casos preparados para treinar as seis letras do SPIKES são exibidos.</p>':''}<div class="cc-chips" id="ccDoencaGrid">${renderDoencaChips('', s.doencaId, m.id)}</div></section>` : ''}
      ${d ? '' : '<div class="empty">Escolha uma condição na caixa acima para receber as perguntas dirigidas.</div>'}
      ${d ? `<section class="cc-caso card"><div class="cc-avatar">${avatarSvg(avatarCategoria(s.paciente))}</div><div class="cc-caso-info"><span class="eyebrow">Paciente à sua frente</span><h2>${esc(s.paciente.nome)}${s.paciente.idade?` · ${esc(s.paciente.idade)} anos`:''}${s.paciente.sexo?` · ${esc(s.paciente.sexo)}`:''}</h2><p><strong>Queixa:</strong> ${esc(d.queixa)}</p>${renderBalao(s)}</div><div class="cc-progress"><span>Roteiro coberto</span><strong>${pct}%</strong><i style="--p:${pct}%"></i><small>${feitas} de ${total} perguntas-chave</small></div></section>` : ''}
      <div class="cc-layout">
        <aside class="cc-steps card">
          <h3>Etapas do método</h3>
          <div class="cc-step-list">${m.etapas.map((e,i)=>{
            const done = etapaConcluida(s, m, d, e);
            const marcador = m.id === 'spikes' ? e.titulo.split(' — ')[0] : i+1;
            return `<button class="cc-step${e.id===etapaAtiva?' active':''}${done?' done':''}" data-cc-step="${e.id}"><span>${esc(marcador)}</span><div><strong>${esc(e.titulo.replace(/^\d+\.\s*/,''))}</strong><small>${esc(F[e.foco]||'')}</small></div></button>`;
          }).join('')}</div>
          <div class="cc-step-note"><strong>${esc(m.sigla)}</strong><p>${esc(m.uso)}</p></div>
        </aside>
        <section class="cc-main card">
          <div class="cc-dialogo">
            <div class="section-title"><h4>Transcrição da consulta</h4><button class="tiny-btn" id="ccLimparDialogo">Limpar</button></div>
            <div class="cc-dialogo-list" id="ccDialogoList">${s.dialogo.map((l,i)=>`<div class="cc-linha ${l.quem}"><span>${l.quem==='medico'?'Você':esc(s.paciente.nome)}</span><p>${i===animarIndice?'':esc(l.texto)}</p><button class="tiny-btn" data-cc-del-linha="${i}" title="Remover">×</button></div>`).join('') || '<div class="empty">Clique numa pergunta para trazê-la ao campo abaixo, edite se quiser e envie. A pessoa só responde ao que você digitar.</div>'}</div>
            <div class="cc-dialogo-input">
              <select class="select" id="ccQuem"><option value="medico">Você (médico)</option><option value="paciente">${esc(s.paciente.nome)}</option></select>
              <input class="input" id="ccFala" placeholder="Digite sua fala e pressione Enter">
              <button class="tiny-btn" id="ccAddFala">Adicionar</button>
            </div>
          </div>
          <div class="cc-etapa-head"><span class="eyebrow">${esc(F[etapa.foco]||'Etapa')}</span><h2>${esc(etapa.titulo)}</h2><p class="muted">${esc(etapa.objetivo)}</p></div>
          ${renderPerguntasBloco(s, d, etapa)}
          <details class="cc-orient"${store().ui.orientOculta?'':' open'} id="ccOrient"><summary>Como conduzir esta etapa</summary><ul>${etapa.orientacoes.map(o=>`<li>${esc(o)}</li>`).join('')}</ul></details>
          <div class="cc-anot"><h4>Sua anotação nesta etapa</h4><textarea class="textarea" id="ccNota" data-etapa="${etapa.id}" placeholder="Escreva aqui como se estivesse registrando o que a pessoa respondeu, o que você pensou e o que decidiu.">${esc(s.notas[etapa.id]||'')}</textarea></div>
        </section>
        <aside class="cc-coach card">
          <h3>Painel de orientação</h3>
          ${d ? (m.id === 'spikes' ? renderCoachSpikes(d, etapa) : `
          <details open><summary>⚠️ Não pode passar (sinais de alarme)</summary><ul>${d.redflags.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>
          <details${etapa.foco==='exame'?' open':''}><summary>🩺 Exame físico dirigido</summary><ul>${d.exame.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>
          <details${etapa.foco==='sintese'?' open':''}><summary>🧠 Hipóteses e diferenciais</summary><ul>${(d.hipoteses||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>
          <details${etapa.foco==='plano'||etapa.foco==='fechamento'?' open':''}><summary>📋 Conduta e plano</summary><ul>${d.conduta.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>
          <details><summary>💡 Pontos-chave para a prova</summary><ul>${(d.pontos||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>
          `) : '<p class="muted">Escolha uma condição para ver sinais de alarme, exame dirigido, hipóteses e conduta.</p>'}
          ${d ? `<div class="cc-next"><h4>Próximo passo sugerido</h4><p>${esc(proximoPasso(s, m, d, etapa))}</p></div>` : ''}
          ${s.finalizada ? `<div class="cc-autoaval"><h4>Autoavaliação</h4><textarea class="textarea" id="ccAuto" placeholder="O que você faria diferente nesta consulta?">${esc(s.autoavaliacao||'')}</textarea></div>` : ''}
        </aside>
      </div>
    </div>`;
  }

  function renderCoachSpikes(d, etapa){
    const sp = d.spikes || {};
    const armadilhas = sp.armadilhas || ['Despejar toda a informação sem checar a compreensão.','Preencher o silêncio ou oferecer falsa tranquilização.','Ir direto ao plano antes de acolher a emoção.'];
    return `<div class="cc-spikes-case"><span class="eyebrow">Seu desafio neste caso</span><p>${esc(sp.cenario||d.perfil||d.queixa)}</p></div>
      <details open><summary>🗣️ Notícia central</summary><p>${esc(sp.noticia||'Comunique a mudança clínica com clareza, sem jargões.')}</p></details>
      <details open><summary>🎯 Objetivo desta letra</summary><p>${esc(etapa.objetivo)}</p></details>
      <details><summary>⚠️ Armadilhas de prova</summary><ul>${armadilhas.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>
      <details><summary>📋 Estratégia possível</summary><ul>${(sp.estrategia||d.conduta||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>`;
  }

  function avatarCategoria(p){
    const idade = parseInt(p?.idade, 10);
    const sexo = normaliza(p?.sexo||'');
    if(!isNaN(idade)){
      if(idade < 12) return sexo==='masculino' ? 'menino' : sexo==='feminino' ? 'menina' : 'crianca';
      if(idade >= 60) return sexo==='feminino' ? 'idosa' : 'idoso';
    }
    if(sexo==='feminino') return 'mulher';
    if(sexo==='masculino') return 'homem';
    return 'pessoa';
  }
  function avatarSvg(cat){
    const skin = '#f0c9a0';
    const base = inner => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(cat)}">${inner}</svg>`;
    switch(cat){
      case 'homem': return base(`<circle cx="32" cy="32" r="32" fill="#dbe7f5"/><path d="M14 58c2-12 10-18 18-18s16 6 18 18" fill="#4a6fa5"/><circle cx="32" cy="26" r="12" fill="${skin}"/><path d="M20 22c2-8 8-12 12-12s10 4 12 12c-4-2-8-3-12-3s-8 1-12 3z" fill="#3a3a3a"/>`);
      case 'mulher': return base(`<circle cx="32" cy="32" r="32" fill="#f6dde7"/><path d="M13 58c2-12 10-18 19-18s17 6 19 18" fill="#c3608a"/><path d="M14 20c0-11 8-18 18-18s18 7 18 18c0 4-1 8-3 12 1 6 2 12 2 18H17c0-6 1-12 2-18-2-4-3-8-3-12z" fill="#6b4226"/><circle cx="32" cy="27" r="11" fill="${skin}"/>`);
      case 'idoso': return base(`<circle cx="32" cy="32" r="32" fill="#e4e9ec"/><path d="M14 58c2-12 10-18 18-18s16 6 18 18" fill="#7c8b99"/><circle cx="32" cy="28" r="11" fill="#eccca3"/><path d="M20 22c2-6 6-10 12-10s10 4 12 10c-4-2-8-2-12-2s-8 0-12 2z" fill="#c9c9c9"/>`);
      case 'idosa': return base(`<circle cx="32" cy="32" r="32" fill="#efe3ea"/><path d="M13 58c2-12 10-18 19-18s17 6 19 18" fill="#9c7c94"/><circle cx="32" cy="28" r="11" fill="#eccca3"/><path d="M17 22c2-9 8-13 15-13s13 4 15 13c-2 3-2 7-2 7-2-3-3-4-3-4-2 3-18 3-20 0 0 0-1 1-3 4 0 0 0-4-2-7z" fill="#d8d3d8"/>`);
      case 'menino': return base(`<circle cx="32" cy="32" r="32" fill="#dff0e4"/><path d="M16 58c2-11 9-16 16-16s14 5 16 16" fill="#5aa9c9"/><circle cx="32" cy="31" r="13" fill="${skin}"/><path d="M18 25c2-7 7-11 14-11s12 4 14 11c-4-2-9-3-14-3s-10 1-14 3z" fill="#4a4a4a"/>`);
      case 'menina': return base(`<circle cx="32" cy="32" r="32" fill="#fdeadb"/><path d="M16 58c2-11 9-16 16-16s14 5 16 16" fill="#e08fb0"/><path d="M17 27c0-9 6-15 15-15s15 6 15 15c0 3-1 6-2 9-2-2-3-3-3-3 0 3-18 3-20 0 0 0-1 1-3 3-1-3-2-6-2-9z" fill="#8a5a3c"/><circle cx="32" cy="31" r="13" fill="${skin}"/>`);
      case 'crianca': return base(`<circle cx="32" cy="32" r="32" fill="#fff3d6"/><path d="M16 58c2-11 9-16 16-16s14 5 16 16" fill="#e0b23c"/><circle cx="32" cy="31" r="13" fill="${skin}"/><path d="M18 25c2-7 7-11 14-11s12 4 14 11c-4-2-9-3-14-3s-10 1-14 3z" fill="#6b4226"/>`);
      default: return base(`<circle cx="32" cy="32" r="32" fill="#e6e6ee"/><path d="M14 58c2-12 10-18 18-18s16 6 18 18" fill="#8f8fae"/><circle cx="32" cy="27" r="11" fill="#d7c3ac"/>`);
    }
  }
  function renderBalao(s){
    const indice = s.dialogo.map(l => l.quem).lastIndexOf('paciente');
    if(indice < 0) return `<p class="muted cc-balao-vazio">Pergunte alguma coisa no campo de conversa — a resposta aparece aqui.</p>`;
    return `<div class="cc-balao" id="ccBalao">${indice===animarIndice?'':esc(s.dialogo[indice].texto)}</div>`;
  }
  function renderPergunta(s, key, texto, tipo, indice){
    const feita = s.asked.includes(key);
    return `<div class="cc-q${feita?' feita':''}"><button type="button" data-cc-ask="${esc(key)}" data-texto="${esc(texto)}" data-tipo="${tipo}" data-indice="${indice}">${esc(texto)}</button><span>${feita?'✓':'+'}</span><button type="button" class="cc-q-hide" data-cc-ocultar="${esc(key)}" title="Ocultar esta pergunta">×</button></div>`;
  }
  /* Bloco de perguntas com opções de ocultar: o roteiro inteiro, as já feitas
   * ou uma pergunta específica. */
  function renderPerguntasBloco(s, d, etapa){
    const ui = store().ui;
    const ocultas = s.perguntasOcultas || (s.perguntasOcultas = []);
    const visivel = item => !ocultas.includes(item.key) && (!ui.ocultarFeitas || !s.asked.includes(item.key));
    const doMetodo = etapa.perguntas.map((q,i) => ({ q, i, key:`${etapa.id}-m${i}`, tipo:'metodo' })).filter(visivel);
    const daDoenca = perguntasDaDoenca(d, etapa).map((q,i) => ({ q, i, key:`${etapa.id}-d${i}`, tipo:'doenca' })).filter(visivel);
    const escondidasAqui = ocultas.filter(k => k.startsWith(`${etapa.id}-`)).length;
    const cabecalho = `<div class="section-title cc-perguntas-head"><h4>Perguntas sugeridas</h4><div class="cc-perguntas-acoes">
      <button class="tiny-btn${ui.ocultarFeitas?' active':''}" id="ccOcultarFeitas" title="Some com as perguntas que você já fez">${ui.ocultarFeitas?'Mostrando só as pendentes':'Ocultar as já feitas'}</button>
      ${escondidasAqui?`<button class="tiny-btn" id="ccRestaurarOcultas">Restaurar ${escondidasAqui} oculta${escondidasAqui>1?'s':''}</button>`:''}
      <button class="tiny-btn" id="ccTogglePerguntas">${ui.perguntasOcultas?'Mostrar perguntas':'Ocultar perguntas'}</button>
    </div></div>`;
    if(ui.perguntasOcultas) return `<div class="cc-perguntas recolhido">${cabecalho}</div>`;
    const listaMetodo = doMetodo.length
      ? `<div class="cc-q-list">${doMetodo.map(x => renderPergunta(s, x.key, x.q, x.tipo, x.i)).join('')}</div>`
      : '<p class="muted cc-q-vazio">Nenhuma pergunta do método visível nesta etapa.</p>';
    const listaDoenca = d && daDoenca.length
      ? `<h4 class="cc-q-title">${etapa.id.startsWith('sp')?'Aplicação ao caso':'Dirigido a'}: ${esc(d.nome)}</h4><div class="cc-q-list">${daDoenca.map(x => renderPergunta(s, x.key, x.q, x.tipo, x.i)).join('')}</div>`
      : '';
    return `<div class="cc-perguntas">${cabecalho}<h4 class="cc-q-title">${etapa.id.startsWith('sp')?'Falas e perguntas desta letra':'Frases e perguntas do método'}</h4>${listaMetodo}${listaDoenca}</div>`;
  }

  function falasSpikes(d, etapa){
    return d?.spikes?.falas?.[etapa.id] || [];
  }
  function perguntasDaDoenca(d, etapa){
    if(!d) return [];
    if(etapa.id.startsWith('sp')) return falasSpikes(d, etapa).map(item => item.pergunta);
    if(etapa.foco === 'exploracao' || etapa.foco === 'abertura') return d.perguntas;
    if(etapa.foco === 'contexto') return d.perguntas.slice(-4);
    if(etapa.foco === 'exame') return d.exame.map(x => `Examinar: ${x}`);
    if(etapa.foco === 'sintese') return (d.hipoteses||[]).map(x => `Considerar: ${x}`);
    if(etapa.foco === 'plano' || etapa.foco === 'fechamento') return d.conduta.map(x => `Conduta: ${x}`);
    return d.perguntas;
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
  /* ======================= MOTOR DE RESPOSTA DO PACIENTE =======================
   * O paciente só fala quando VOCÊ digita. O texto digitado é comparado com o banco
   * de perguntas (as da doença e as do método) e a resposta correspondente é usada,
   * com variação natural na forma de falar. */
  const STOP = new Set(['que','como','qual','quais','voce','esta','tem','isso','para','pra','com','uma','dos','das','por','mais','seu','sua','sr','sra','doutor','doutora','você','mas','nao','sim','pode','poderia','me','fala','conta','sobre','algum','alguma','ate','tambem','quando','onde','porque','tudo','bem','aqui','hoje','agora','ele','ela','eles','elas','meu','minha','muito','ser','estar','ter','fazer','disso','dessa','desse','tipo','vez','coisa','gente','tinha','teve','foi','vai','ainda','depois','antes','desde','entre','sempre','nunca','nada','algo','outro','outra']);
  const SINONIMOS = {
    esposa:'familia', marido:'familia', companheiro:'familia', companheira:'familia', parente:'familia', filhos:'familia', filho:'familia', filha:'familia', cuidador:'familia',
    receio:'medo', teme:'medo', assusta:'medo', preocupado:'preocupa', preocupada:'preocupa',
    emprego:'trabalho', profissao:'trabalho', rotina:'funcao', limita:'funcao', atrapalha:'funcao',
    remedio:'medicamento', remedios:'medicamento', farmaco:'medicamento',
    cansaco:'fadiga', cansado:'fadiga', cansada:'fadiga', respirar:'dispneia', falta:'dispneia',
    resultado:'exame', exames:'exame', diagnostico:'doenca', enfermidade:'doenca'
  };
  function tokens(t){
    return normaliza(t).replace(/[^a-z0-9\s]/g,' ').split(/\s+/)
      .filter(w => w.length > 2 && !STOP.has(w)).map(w => SINONIMOS[w] || w);
  }
  function pontuacao(perguntaTokens, digitadoTokens){
    if(!perguntaTokens.length || !digitadoTokens.length) return 0;
    const set = new Set(digitadoTokens);
    let acertos = 0;
    perguntaTokens.forEach(w => {
      if(set.has(w)) { acertos += 1; return; }
      for(const dw of digitadoTokens){ if(w.length > 4 && (dw.startsWith(w.slice(0,5)) || w.startsWith(dw.slice(0,5)))) { acertos += 0.7; return; } }
    });
    return acertos / Math.sqrt(perguntaTokens.length);
  }
  /* Frases digitadas que puxam a perspectiva da pessoa (SIFE, contexto, emoção…). */
  const GATILHOS = [
    { campo:'ideias', chaves:['acha que e','acha que causa','causando','imagina que','o que voce acha','na sua opiniao','acha que pode ser'] },
    { campo:'preocupacoes', chaves:['preocupa','medo','receio','assusta','teme','aflige'] },
    { campo:'expectativas', chaves:['esperava','espera da consulta','o que voce esperava','gostaria que eu','veio buscar','quer que eu faca'] },
    { campo:'funcao', chaves:['dia a dia','atrapalha','limita','deixou de fazer','impede','trabalho por causa','rotina'] },
    { campo:'contexto', chaves:['mora com','quem mora','sua casa','sua renda','sua moradia','apoio em casa','como e sua familia','sobre sua familia','no que voce trabalha','qual sua profissao'] },
    { campo:'emocao', chaves:['se sente','sentindo com','como esta seu animo','emocional','humor'] },
    { campo:'entendimento', chaves:['ja ouviu','sabe sobre','entendeu','ja te explicaram','conhece sobre','o que sabe'] },
    { campo:'apoio', chaves:['pode contar','quem te ajuda','quem cuida','tem apoio','alguem te acompanha'] },
    { campo:'historia', chaves:['desde o comeco','me conta a historia','como comecou tudo','conte desde'] },
    { campo:'abertura', chaves:['te traz aqui','motivo da consulta','o que te trouxe','no que posso ajudar','o que houve'] }
  ];
  /* Variações de forma: mudam o jeito de falar sem mudar o conteúdo clínico. */
  const PREFIXOS = ['','','','Olha, ','Então, ','Ah, ','Pois é, ','Deixa eu ver... ','Sabe, ','Bom, ','É, '];
  const SUFIXOS = ['','','','','',' Sabe?',' É isso mesmo.',' Pelo menos é o que eu sinto.',' Foi bem assim.',' Não sei se ajuda.'];
  const SEM_RESPOSTA = [
    'Isso eu não sei responder, doutor.',
    'Nunca prestei atenção nisso, pra ser sincero.',
    'Hum... não sei dizer, desculpa.',
    'Não me lembro bem disso agora.',
    'Acho que não, mas não tenho certeza.',
    'Essa eu não sei, doutor.',
    'Nunca ninguém me perguntou isso antes.',
    'Não sei te dizer ao certo.'
  ];
  const NAO_ENTENDI = [
    'Desculpa, não entendi bem o que o senhor perguntou.',
    'Como assim, doutor? Pode explicar de outro jeito?',
    'Não sei se entendi a pergunta.',
    'Pode repetir? Não peguei direito.'
  ];
  const sorteia = arr => arr[Math.floor(Math.random()*arr.length)];
  function limpaAchado(t){ return String(t||'').replace(/^["“”']+|["“”']+$/g,'').trim(); }
  function varia(texto, sensivel){
    const escolhido = Array.isArray(texto) ? sorteia(texto) : texto;
    let t = limpaAchado(escolhido);
    if(!t) return t;
    if(sensivel || /^\(/.test(t)) return t; // comunicação difícil e falas de acompanhante ficam literais
    const pre = sorteia(PREFIXOS);
    if(pre) t = pre + t.charAt(0).toLowerCase() + t.slice(1);
    const suf = sorteia(SUFIXOS);
    if(suf && !/[!?]$/.test(t)) t = t.replace(/\.?$/, '.') + suf;
    return t;
  }
  /* Estado da animação de digitação do paciente. */
  let digitandoEm = '';
  let digitandoTimer = null;
  let animTimer = null;
  let animarIndice = -1;   // índice da fala que está sendo "digitada" na tela
  function rolarDialogo(){ const list = root && root.querySelector('#ccDialogoList'); if(list) list.scrollTop = list.scrollHeight; }
  /* Encerra a animação em curso sem perder nada: a fala que estava sendo digitada
   * aparece completa e a resposta que ainda ia sair é entregue na hora. */
  function finalizarAnimacao(){
    clearInterval(animTimer); animTimer = null;
    clearTimeout(digitandoTimer); digitandoTimer = null;
    animarIndice = -1;
    digitandoEm = '';
  }
  function animarUltimaFala(){
    const s = sessao();
    if(!s || animarIndice < 0 || animarIndice !== s.dialogo.length - 1) return;
    const alvo = root.querySelector('#ccDialogoList .cc-linha:last-child p');
    const linha = s.dialogo[animarIndice];
    if(!alvo || !linha) { animarIndice = -1; return; }
    const balao = root.querySelector('#ccBalao');
    const texto = linha.texto;
    let i = 0;
    clearInterval(animTimer);
    clearTimeout(digitandoTimer);
    // pausa curta com os pontinhos, como alguém formulando a resposta
    alvo.innerHTML = '<i></i><i></i><i></i>';
    alvo.classList.add('cc-pensando');
    if(balao){ balao.innerHTML = '<i></i><i></i><i></i>'; balao.classList.add('digitando'); }
    digitandoTimer = setTimeout(() => {
    alvo.classList.remove('cc-pensando'); alvo.textContent = '';
    if(balao){ balao.classList.remove('digitando'); balao.textContent = ''; }
    animTimer = setInterval(() => {
      i += Math.random() < 0.25 ? 2 : 1;
      const parcial = texto.slice(0, i);
      alvo.textContent = parcial;
      if(balao) balao.textContent = parcial;
      rolarDialogo();
      if(i >= texto.length){
        clearInterval(animTimer);
        alvo.textContent = texto;
        if(balao) balao.textContent = texto;
        animarIndice = -1;
        const f = root.querySelector('#ccFala'); if(f) f.focus();
      }
    }, 24);
    }, 600);
  }
  /* Marca como feita a pergunta do roteiro que corresponde ao que foi digitado. */
  function marcarPerguntaFeita(s, texto){
    const m = metodo(s.metodoId), d = doenca(s.doencaId);
    const alvo = tokens(texto);
    if(!alvo.length) return;
    let melhor = { score:0, key:'' };
    m.etapas.forEach(e => {
      (e.perguntas||[]).forEach((q,i) => { const sc = pontuacao(tokens(q), alvo); if(sc > melhor.score) melhor = { score:sc, key:`${e.id}-m${i}` }; });
      perguntasDaDoenca(d, e).forEach((q,i) => { const sc = pontuacao(tokens(q), alvo); if(sc > melhor.score) melhor = { score:sc, key:`${e.id}-d${i}` }; });
    });
    if(melhor.score >= 1.1 && melhor.key && !s.asked.includes(melhor.key)) s.asked.push(melhor.key);
  }
  /* Encontra a melhor resposta para o que foi digitado. */
  function respostaParaTexto(d, m, textoDigitado){
    if(!d) return sorteia(NAO_ENTENDI);
    const alvo = tokens(textoDigitado);
    if(!alvo.length) return sorteia(NAO_ENTENDI);
    const texto = normaliza(textoDigitado);
    let melhor = { score:0, resposta:null };

    // 0) falas próprias de cada cenário SPIKES. Elas têm prioridade sobre a
    // anamnese clínica para que cada letra permaneça fiel ao protocolo.
    if(m?.id === 'spikes'){
      m.etapas.forEach(e => falasSpikes(d, e).forEach(item => {
        const s = pontuacao(tokens(item.pergunta), alvo) * 1.2;
        if(item.resposta && s > melhor.score) melhor = { score:s, resposta:item.resposta };
      }));
    }

    // 1) perguntas dirigidas à doença → achado de mesmo índice
    (d.perguntas||[]).forEach((q, i) => {
      const s = pontuacao(tokens(q), alvo);
      const r = (d.achados||[])[i];
      if(r && s > melhor.score) melhor = { score:s, resposta:r };
    });
    // 2) gatilhos de perspectiva — só valem se nenhuma pergunta da doença casou melhor
    GATILHOS.forEach(g => {
      const bateu = g.chaves.some(c => texto.includes(c));
      if(!bateu) return;
      const campoSpikes = { ideias:'percepcao', preocupacoes:'medo', expectativas:'prioridade', funcao:'mudanca', contexto:'acompanhante', emocao:'emocao', entendimento:'percepcao', apoio:'acompanhante', historia:'mudanca' }[g.campo];
      const r = (m?.id === 'spikes' && campoSpikes ? d.spikes?.[campoSpikes] : null) || (d.perspectiva||{})[g.campo] || PERSPECTIVA_PADRAO[g.campo];
      if(r && melhor.score < 1.15) melhor = { score:1.15, resposta:r };
    });
    // 3) perguntas do método escolhido
    (m?.etapas||[]).forEach(e => (e.perguntas||[]).forEach((q, i) => {
      const marca = (e.resp||[])[i];
      if(!marca) return;
      const s = pontuacao(tokens(q), alvo) * 0.9;
      if(s <= melhor.score) return;
      const r = resolveMarca(d, marca);
      if(r) melhor = { score:s, resposta:r };
    }));
    // 4) campos de perspectiva por semelhança direta
    Object.entries(d.perspectiva||{}).forEach(([campo, r]) => {
      if(!r) return;
      const s = pontuacao(tokens(campo === 'abertura' ? 'o que traz motivo consulta' : campo), alvo) * 0.8;
      if(s > melhor.score) melhor = { score:s, resposta:r };
    });

    if(melhor.score < 0.75 || !melhor.resposta){
      const conversa = respostaConversacional(d, texto);
      return conversa || sorteia(Math.random() < 0.65 ? SEM_RESPOSTA : NAO_ENTENDI);
    }
    return varia(melhor.resposta, m?.id === 'spikes');
  }
  function resolveMarca(d, marca){
    if(typeof marca !== 'string' || !marca.startsWith('@')) return marca;
    const caminho = marca.slice(1).split('.');
    let atual = caminho[0] === 'spikes' ? d.spikes : d.perspectiva;
    caminho.slice(1).forEach(chave => { atual = atual?.[chave]; });
    if(caminho.length === 1) atual = d.perspectiva?.[caminho[0]];
    return atual || (caminho[0] === 'spikes' ? SPIKES_PADRAO[caminho[1]] : PERSPECTIVA_PADRAO[caminho[0]]);
  }
  function respostaConversacional(d, texto){
    const p = d.perspectiva || {};
    const sp = d.spikes || {};
    if(/^(oi|ola|bom dia|boa tarde|boa noite)\b/.test(texto)) return 'Olá, doutor. Podemos conversar, sim.';
    if(/obrigad|agradec/.test(texto)) return 'Eu que agradeço por me ouvir e explicar com calma.';
    if(/sinto muito|estou aqui|deve ser dificil|imagino como/.test(texto)) return sp.validacao || 'Obrigado por reconhecer isso. Está sendo muito difícil para mim.';
    if(/mais importante|prioridade|objetivo|importa para voce/.test(texto)) return sp.prioridade || p.expectativas || PERSPECTIVA_PADRAO.expectativas;
    if(/entendeu|suas palavras|resumir|resumo/.test(texto)) return sp.resumo || p.resumo || PERSPECTIVA_PADRAO.resumo;
    if(/duvida|pergunta agora|quer perguntar/.test(texto)) return sp.duvidas || p.duvida || PERSPECTIVA_PADRAO.duvida;
    if(/posso (te |lhe )?(examinar|explicar|contar)|tudo bem se|voce autoriza/.test(texto)) return 'Pode sim, doutor. Prefiro que explique com calma.';
    if(/mais alguma coisa|algo a acrescentar/.test(texto)) return 'Por enquanto é isso. Se eu lembrar de algo, conto ao senhor.';
    return '';
  }
  const PERSPECTIVA_PADRAO = {
    abertura:'É por causa disso que eu vim, doutor. Começou faz um tempo e não melhorou.',
    ideias:'Sinceramente não sei o que é. Já pensei em várias coisas, mas nada certo.',
    preocupacoes:'Fico com medo de ser algo grave e eu estar deixando passar.',
    expectativas:'Queria entender o que está acontecendo e sair daqui com um caminho.',
    funcao:'Isso tem atrapalhado bastante minha rotina, não consigo tocar o dia normalmente.',
    contexto:'Moro com minha família, e o trabalho anda puxado. Dá pra me virar, mas com dificuldade.',
    emocao:'Confesso que ando preocupado com isso, sim.',
    entendimento:'Já ouvi falar, mas ninguém nunca me explicou direito.',
    apoio:'Tenho minha família, eles me ajudam no que precisa.',
    concorda:'Por mim tudo bem, doutor. Se o senhor acha melhor assim, eu topo.',
    duvida:'Acho que entendi. Se surgir dúvida eu volto a perguntar.',
    exame:'Pode examinar, doutor, fique à vontade.',
    resumo:'É isso mesmo que eu falei, o senhor entendeu certinho.'
  };
  const SPIKES_PADRAO = {
    privacidade:'Aqui está bom para mim.', acompanhante:'Gostaria que alguém da minha família estivesse aqui.', tempo:'Podemos conversar agora, sim.', conforto:'Estou confortável; pode começar.',
    percepcao:'Sei que a doença é séria, mas não entendi exatamente como ela está agora.', mudanca:'Percebi que fiquei mais fraco e que as coisas pioraram.', expectativaExame:'Eu esperava que os exames mostrassem alguma melhora.', objetivoTratamento:'Eu achava que o tratamento ainda pudesse controlar a doença.',
    convite:'Quero saber, pode me explicar.', detalhes:'Prefiro saber os detalhes, mas fale devagar.', prognostico:'Quero saber o que esperar, mesmo que seja difícil.', compartilhamento:'Pode conversar também com a pessoa que me acompanha.',
    reacaoAviso:'Está bem… pode me contar.', reacaoNoticia:'(permanece em silêncio por alguns segundos) Eu não esperava ouvir isso.', compreensao:'Entendi que a doença avançou e que a situação é séria.', maisDetalhes:'Pode continuar, mas preciso que fale aos poucos.',
    emocao:'Estou muito abalado. Parece que tudo parou agora.', validacao:'Obrigado por compreender. Está sendo muito difícil.', pausa:'Quero um minuto, por favor.', pensamento:'Estou pensando na minha família e no que vai acontecer daqui para frente.', medo:'Tenho medo de sofrer e de deixar minha família.',
    prioridade:'Quero ficar confortável e perto da minha família.', opcoes:'Pode explicar as opções. Quero decidir junto.', naoAbandono:'Ouvir que vocês continuarão comigo me alivia.', plano:'Entendi. Vamos combinar o próximo passo e quando voltamos a conversar.', resumo:'Entendi que a doença piorou, que a cura pode não ser possível e que vamos priorizar meu conforto e o que importa para mim.', duvidas:'Quero saber como vocês vão controlar meus sintomas e quem devo procurar se eu piorar.'
  };

  /* ================================= EVENTOS ================================= */
  function bind(){
    const st = store();
    // ---- home
    const metodoSel = root.querySelector('#ccMetodo');
    if(metodoSel) metodoSel.onchange = () => {
      const info = root.querySelector('#ccMetodoInfo');
      if(info) info.innerHTML = renderMetodoInfo(metodo(metodoSel.value));
      escolhida = '';
      const grid = root.querySelector('#ccDoencaGrid');
      if(grid){ grid.innerHTML = renderDoencaChips(busca?.value || '', '', metodoSel.value); bindChips(); }
    };
    let escolhida = '';
    const busca = root.querySelector('#ccBusca');
    if(busca) busca.oninput = () => { const grid = root.querySelector('#ccDoencaGrid'); if(grid){ grid.innerHTML = renderDoencaChips(busca.value, escolhida || (sessao()?sessao().doencaId:''), metodoSel?.value || sessao()?.metodoId); bindChips(); } };
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
    root.querySelector('#ccBack').onclick = () => { finalizarAnimacao(); st.ui.view = 'home'; st.activeId = ''; save(); render(); };
    root.querySelector('#ccToggleBox').onclick = () => { st.ui.box = !st.ui.box; save(); render(); };
    root.querySelector('#ccTopMetodo').onchange = e => {
      s.metodoId = e.target.value;
      if(s.metodoId === 'spikes' && !doenca(s.doencaId)?.spikes){
        const primeiroCaso = doencas().find(item => item.spikes);
        if(primeiroCaso) s.doencaId = primeiroCaso.id;
      }
      s.etapaAtiva = ''; touch(); render();
    };
    root.querySelector('#ccTopNome').onchange = e => { s.paciente.nome = e.target.value.trim() || 'Paciente simulado'; touch(); render(); };
    root.querySelector('#ccTopIdade').onchange = e => { s.paciente.idade = e.target.value; touch(); render(); };
    root.querySelector('#ccTopSexo').onchange = e => { s.paciente.sexo = e.target.value; touch(); render(); };
    root.querySelectorAll('[data-cc-step]').forEach(btn => btn.onclick = () => { finalizarAnimacao(); s.etapaAtiva = btn.dataset.ccStep; touch(); render(); });
    root.querySelector('#ccTogglePerguntas')?.addEventListener('click', () => { st.ui.perguntasOcultas = !st.ui.perguntasOcultas; save(); render(); });
    root.querySelector('#ccOcultarFeitas')?.addEventListener('click', () => { st.ui.ocultarFeitas = !st.ui.ocultarFeitas; save(); render(); });
    root.querySelector('#ccRestaurarOcultas')?.addEventListener('click', () => {
      const etapaId = (s.etapaAtiva || metodo(s.metodoId).etapas[0].id);
      s.perguntasOcultas = (s.perguntasOcultas || []).filter(k => !k.startsWith(`${etapaId}-`));
      touch(); render();
    });
    root.querySelectorAll('[data-cc-ocultar]').forEach(btn => btn.onclick = event => {
      event.stopPropagation();
      const key = btn.dataset.ccOcultar;
      s.perguntasOcultas = s.perguntasOcultas || [];
      if(!s.perguntasOcultas.includes(key)) s.perguntasOcultas.push(key);
      touch(); render();
    });
    root.querySelector('#ccOrient')?.addEventListener('toggle', event => { st.ui.orientOculta = !event.target.open; save(); });
    // Clicar numa pergunta só a coloca no campo de digitação: quem conduz a fala é você.
    root.querySelectorAll('[data-cc-ask]').forEach(btn => btn.onclick = () => {
      const campo = root.querySelector('#ccFala');
      if(!campo) return;
      const quemSel = root.querySelector('#ccQuem'); if(quemSel) quemSel.value = 'medico';
      campo.value = btn.dataset.texto;
      campo.focus();
      campo.setSelectionRange(campo.value.length, campo.value.length);
    });
    const nota = root.querySelector('#ccNota');
    if(nota){ nota.oninput = () => { s.notas[nota.dataset.etapa] = nota.value; }; nota.onblur = () => touch(); }
    const auto = root.querySelector('#ccAuto');
    if(auto){ auto.oninput = () => { s.autoavaliacao = auto.value; }; auto.onblur = () => touch(); }
    const fala = root.querySelector('#ccFala');
    const addFala = () => {
      const texto = (fala.value || '').trim(); if(!texto) return;
      const quem = root.querySelector('#ccQuem').value;
      finalizarAnimacao();
      s.dialogo.push({ quem, texto });
      fala.value = '';
      if(quem === 'medico'){
        marcarPerguntaFeita(s, texto);
        const d = doenca(s.doencaId);
        const resposta = respostaParaTexto(d, metodo(s.metodoId), texto);
        // A resposta já entra na conversa e é salva; a animação é só de exibição.
        s.dialogo.push({ quem:'paciente', texto: resposta });
        animarIndice = s.dialogo.length - 1;
        touch(); render(); rolarDialogo();
        animarUltimaFala();
        return;
      }
      touch(); render(); rolarDialogo();
      const f = root.querySelector('#ccFala'); if(f) f.focus();
    };
    if(fala){ fala.onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); addFala(); } }; root.querySelector('#ccAddFala').onclick = addFala; }
    root.querySelectorAll('[data-cc-del-linha]').forEach(btn => btn.onclick = () => { finalizarAnimacao(); s.dialogo.splice(Number(btn.dataset.ccDelLinha), 1); touch(); render(); });
    root.querySelector('#ccLimparDialogo').onclick = () => { if(!confirm('Apagar toda a transcrição desta consulta?')) return; finalizarAnimacao(); s.dialogo = []; s.revelados = 0; touch(); render(); };
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
