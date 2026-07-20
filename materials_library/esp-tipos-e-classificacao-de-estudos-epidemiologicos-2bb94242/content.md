# TIPOS E CLASSIFICAÇÃO DE ESTUDOS EPIDEMIOLÓGICOS

Para entender epidemiologia, é melhor compreender a lógica do investigador do que decorar nomes isolados. O delineamento do estudo é a forma como a investigação é organizada para relacionar exposição, desfecho e tempo.

A primeira pergunta ao ler uma questão é: o pesquisador interferiu no paciente ou apenas observou? Se apenas observou, o estudo é **observacional**. Se administrou um medicamento, aplicou uma vacina ou mudou deliberadamente uma conduta, o estudo é **experimental**.

## A Grande Divisão: Observacionais vs. Experimentais

Nos estudos observacionais, a natureza segue seu curso. O pesquisador é um espectador privilegiado que coleta dados. Já nos estudos experimentais, o pesquisador manipula a variável de exposição. Ele decide quem recebe a intervenção e quem recebe o placebo ou o tratamento padrão.

Cuidado com a pegadinha: nem todo estudo que envolve "dar um remédio" é experimental. Se o médico assistente prescreveu o remédio na rotina do hospital e o pesquisador apenas foi lá no prontuário ver o que aconteceu, isso é observacional. Para ser experimental, o pesquisador precisa ter o controle da alocação da exposição.

A randomização é o divisor de águas. Se o pesquisador distribui os participantes em grupos (intervenção versus controle) de forma aleatória, trata-se de um ensaio clínico randomizado (ECR), desenho de maior força para avaliar eficácia de intervenções.

## Unidade de Análise: Individual vs. Agregado

Outra classificação fundamental que as bancas adoram é baseada em QUEM está sendo estudado.

Se eu estudo o "João", a "Maria" e o "José" individualmente, o estudo é de base **individual**. Se eu estudo a "cidade de São Paulo", o "Brasil" ou os "alunos da escola X", sem saber os dados individuais de cada um, o estudo é de base **agregada** ou **populacional**.

O maior exemplo de estudo agregado é o **Estudo Ecológico**. Nele, comparamos indicadores globais. Por exemplo: "Cidades com maior cobertura de saneamento básico têm menor incidência de diarreia". Eu não sei se o João, que tem saneamento, teve diarreia. Eu sei que a média da cidade melhorou.

### O Perigo da Falácia Ecológica

Este é um conceito clássico de prova. A falácia ecológica ocorre quando uma conclusão obtida em nível populacional é aplicada indevidamente ao indivíduo. Se um estudo mostra que países com maior consumo de vinho têm menos infarto, não se pode concluir que uma pessoa específica terá menor risco apenas por consumir vinho. Essa inferência individual a partir de dados grupais é um erro metodológico.

## Estudos Observacionais Descritivos

Antes de tentarmos provar que A causa B, muitas vezes precisamos apenas descrever o que está acontecendo.

- **Relato de Caso:** Descrição de um único paciente com uma apresentação rara ou desfecho inusitado.

- **Série de Casos:** Descrição de um grupo de pacientes (geralmente acima de 10) com a mesma condição.

Por que fazemos isso? Porque é o primeiro passo da ciência. A série de casos não tem grupo controle, por isso não serve para testar hipóteses de causalidade, mas é excelente para gerar hipóteses que serão testadas em estudos maiores.

## Estudo Transversal (ou Seccional)

O estudo transversal funciona como uma fotografia de uma população em determinado momento. Exposição e desfecho são medidos simultaneamente.

A principal medida de associação aqui é a **Prevalência**.

**Vantagens:**

- Rápido e barato.

- Ótimo para planejar serviços de saúde (saber quantos diabéticos existem na região para comprar insulina).

**Desvantagens:**

- Não estabelece relação temporal. Como eu medi tudo junto, não sei se a exposição veio antes da doença.

- Exemplo: Um estudo transversal mostra que pessoas que fazem dieta têm mais obesidade. Significa que a dieta causa obesidade? Provavelmente não. É a obesidade que levou à dieta (causalidade reversa).

## Estudo de Caso-Controle

Aqui a lógica muda. O crime já aconteceu. Eu seleciono os indivíduos com base no **desfecho** (doença).

- **Casos:** Pessoas que já têm a doença.

- **Controles:** Pessoas saudáveis (ou sem a doença em questão), mas que vieram da mesma população dos casos.

Depois de selecionar os grupos, a investigação olha para o passado e pergunta se houve exposição ao fator de interesse.

**Por que usar Caso-Controle?**
É o desenho ideal para **doenças raras**. Para estudar um câncer que ocorre em 1 a cada 100.000 pessoas por coorte, seria necessário seguir milhões de pessoas por anos. No caso-controle, é possível selecionar casos em um serviço de oncologia, escolher controles comparáveis e investigar exposições anteriores com muito mais eficiência.

**Ponto de prova:** a medida de associação do caso-controle é o **odds ratio (OR)** ou razão de chances. Como os participantes são selecionados pelo desfecho, não se calcula incidência diretamente; por isso, o risco relativo direto não é a medida típica.

**Principais Vieses:**

- **Viés de Memória (Recordação):** Quem está doente tende a lembrar com muito mais detalhes das exposições passadas do que quem está saudável.

- **Viés de Seleção:** Escolher controles que não representam a população de onde vieram os casos.

## Estudo de Coorte

Se o caso-controle olha para trás, a coorte olha para frente (geralmente). Na coorte, selecionamos os indivíduos com base na **exposição**.

- **Grupo Exposto:** Pessoas que fumam.

- **Grupo Não Exposto:** Pessoas que não fumam.

Ninguém tem a doença no início do estudo. Nós acompanhamos esses grupos ao longo do tempo (estudo longitudinal) para ver quem vai desenvolver a doença.

**Por que usar Coorte?**
É o melhor desenho observacional para estabelecer **causalidade**, pois garante a temporalidade (a exposição veio antes da doença). Além disso, é excelente para estudar **exposições raras** (ex: trabalhadores expostos a um produto químico específico em uma fábrica).

**Ponto de prova:** a medida de associação típica da coorte é o **risco relativo (RR)**. Como há acompanhamento ao longo do tempo, também se calcula **incidência**.

**Tabela 1: Comparativo Coorte vs. Caso-Controle**

| Característica | Estudo de Coorte | Estudo Caso-Controle |
| --- | --- | --- |
| Seleção dos participantes | Pela Exposição | Pelo Desfecho (Doença) |
| Sentido do estudo | Geralmente Prospectivo | Retrospectivo |
| Doenças raras | Ruim | Excelente |
| Exposições raras | Excelente | Ruim |
| Custo e Tempo | Caro e Longo | Barato e Rápido |
| Medida de Associação | Risco Relativo (RR) | Odds Ratio (OR) |
| Principal Viés | Perda de seguimento | Memória e Seleção |

## Ensaio Clínico Randomizado (ECR)

Este é o topo da pirâmide dos estudos primários. É um estudo experimental, longitudinal e prospectivo.

O pesquisador pega uma amostra, aplica critérios de inclusão e exclusão e, o mais importante, faz a **Randomização**.

### Por que randomizar?

A randomização não serve apenas para "ser justo". O objetivo técnico é **balancear variáveis de confusão**. Quando eu sorteio quem vai para cada grupo, eu espero que a idade média, o sexo, o peso e até fatores que eu nem conheço (como genética) se distribuam igualmente entre os grupos. Assim, se houver diferença no final, eu posso dizer com segurança que a culpa foi da intervenção.

### O Cegamento

Para evitar que a expectativa do paciente ou do médico influencie o resultado, usamos o cegamento:

- **Aberto:** Todos sabem o que o paciente está tomando.

- **Cego (ou Simples-Cego):** O paciente não sabe.

- **Duplo-Cego:** Paciente e médico assistente/avaliador não sabem.

- **Triplo-Cego:** Paciente, médico e o estatístico que analisa os dados não sabem.

### Análise por Intenção de Tratar (ITT) vs. Por Protocolo

Isso cai muito!
Imagine que 100 pessoas foram sorteadas para o remédio novo, mas 20 desistiram porque o comprimido era grande demais.

- **Análise por Protocolo:** Eu analiso apenas os 80 que tomaram tudo certinho. Isso mostra a eficácia biológica da droga, mas ignora a realidade.

- **Análise por Intenção de Tratar:** Eu analiso os 100, como se tivessem tomado, independentemente do que aconteceu. Isso preserva a randomização e reflete a **efetividade** (o que acontece no mundo real, onde as pessoas esquecem ou desistem do remédio). As bancas consideram a ITT mais fidedigna para decisões clínicas.

## Revisão Sistemática e Metanálise

Se o ECR é o topo dos estudos primários, a Revisão Sistemática é o topo de toda a pirâmide de evidência.

- **Revisão Sistemática:** É um estudo secundário. O pesquisador faz uma pergunta específica, define critérios rigorosos de busca e seleciona todos os estudos de qualidade sobre o tema.

- **Metanálise:** É a parte estatística da revisão sistemática. Eu pego os dados de vários estudos pequenos e os combino como se fossem um "estudão". Isso aumenta o poder estatístico e a precisão.

O gráfico clássico da metanálise é o **Forest Plot** (gráfico de floresta). Se o "diamante" (resultado global) não tocar a linha da nulidade (1.0 para RR ou OR), o resultado é estatisticamente significativo.

## Causalidade em Epidemiologia

Não basta encontrar associação estatística; é preciso avaliar se a relação é causal. Correlação não é causalidade. Para essa análise, usam-se os **critérios de Bradford Hill**. Os mais cobrados são:

- **Temporalidade:** A causa deve vir antes do efeito. (O único critério obrigatório).

- **Força de Associação:** Quanto maior o RR ou OR, mais provável ser causal.

- **Dose-Resposta (Gradiente Biológico):** Quanto mais eu me exponho, mais doença eu tenho.

- **Plausibilidade Biológica:** Tem que fazer sentido com o que sabemos da fisiologia.

- **Consistência:** Outros estudos, em outros lugares, acharam a mesma coisa.

## Medidas de Associação no Contexto de Cada Desenho

A escolha da medida de associação depende da pergunta do estudo e de como os participantes foram selecionados. A regra prática é: **se o estudo mede incidência, pode calcular risco; se parte do desfecho, geralmente calcula odds; se é uma fotografia, trabalha com prevalência.**

Desenho do estudo → pergunta principal → medida mais típica

Transversal → Quem tem doença e exposição agora? → prevalência, razão de prevalência (RP)
Caso-controle → Entre doentes e não doentes, quem foi exposto? → odds ratio (OR)
Coorte → Entre expostos e não expostos, quem adoece? → incidência, risco relativo (RR), risco atribuível
Ensaio clínico → Intervenção reduz desfecho em relação ao controle? → RR, RRR, RAR, NNT/NNH
Sobrevida → Quanto tempo até o evento? → hazard ratio (HR)
Ecológico → Grupos/populações diferem? → correlação/associação agregada

### Transversal: prevalência e razão de prevalência

O estudo transversal mede exposição e desfecho ao mesmo tempo. Por isso, estima **prevalência**, não incidência. Ele responde: “qual a frequência deste problema neste momento?”

- **Prevalência:** casos existentes / população avaliada.

- **Razão de prevalência (RP):** prevalência nos expostos / prevalência nos não expostos.

- **Limitação:** como exposição e desfecho são medidos simultaneamente, a temporalidade costuma ser incerta.

Exemplo: em uma escola, 20% das crianças expostas à fumaça domiciliar têm sibilância atual, contra 10% das não expostas. A RP é 2,0. Isso sugere associação, mas não prova que a exposição veio antes do sintoma.

### Caso-controle: odds ratio

No caso-controle, a seleção começa pelo desfecho: primeiro são escolhidos casos doentes e controles não doentes. Como o número de doentes e não doentes é definido pelo pesquisador, não se calcula incidência nem risco diretamente. A medida típica é o **odds ratio (OR)**.

**OR = (a × d) / (b × c)** em uma tabela 2x2.

Interpretação:

- **OR > 1:** exposição associada a maior chance de doença.

- **OR = 1:** sem associação.

- **OR < 1:** exposição possivelmente protetora.

O OR aproxima o RR quando o desfecho é raro. Por isso, caso-controle é especialmente útil para doenças raras, eventos com longa latência ou situações em que uma coorte seria muito cara/demorada.

### Coorte: incidência e risco relativo

Na coorte, a seleção começa pela exposição: compara-se um grupo exposto com outro não exposto e acompanha-se o aparecimento do desfecho. Como há seguimento temporal, a coorte permite calcular **incidência** e **risco relativo (RR)**.

**RR = incidência nos expostos / incidência nos não expostos.**

Interpretação:

- **RR > 1:** exposição é fator de risco.

- **RR = 1:** não há associação.

- **RR < 1:** exposição é fator protetor.

Exemplo: em 1 ano, 8% dos expostos adoecem e 2% dos não expostos adoecem. O RR é 4,0: o risco no grupo exposto foi quatro vezes maior.

A coorte também permite calcular **risco atribuível**: diferença absoluta de incidência entre expostos e não expostos. Essa medida mostra excesso de risco associado à exposição.

### Ensaio clínico: efeito da intervenção

No ensaio clínico, o pesquisador aloca a intervenção. Quando há randomização, tende a haver melhor equilíbrio de confundidores conhecidos e desconhecidos. As medidas mais importantes são:

- **Risco relativo (RR):** risco no grupo intervenção / risco no grupo controle.

- **Redução relativa do risco (RRR):** 1 - RR. Mostra redução proporcional.

- **Redução absoluta do risco (RAR):** risco no controle - risco na intervenção. Mostra diferença real em pontos percentuais.

- **NNT:** 1 / RAR. Número de pacientes que precisam ser tratados para evitar um desfecho.

- **NNH:** 1 / aumento absoluto de risco de dano. Número necessário para causar um evento adverso.

Exemplo: mortalidade de 10% no controle e 5% na intervenção.

- RR = 0,05 / 0,10 = 0,5.

- RRR = 1 - 0,5 = 50%.

- RAR = 10% - 5% = 5 pontos percentuais.

- NNT = 1 / 0,05 = 20.

A RRR costuma parecer mais impressionante; a RAR e o NNT mostram melhor o impacto clínico absoluto.

### Estudos de sobrevida: hazard ratio

Quando o desfecho depende do tempo até o evento, como morte, recaída, internação ou progressão, pode-se usar análise de sobrevida. A medida frequente é o **hazard ratio (HR)**.

O HR compara a taxa instantânea de ocorrência do evento entre grupos ao longo do tempo. Um HR de 0,70 sugere redução relativa de 30% na taxa de ocorrência do evento no grupo intervenção, assumindo que o modelo seja adequado.

### Resumo integrador

| Desenho | Começa por | Mede incidência? | Medida típica | Melhor uso |
| --- | --- | --- | --- | --- |
| Transversal | população em um momento | Não | prevalência, RP | frequência e associação inicial |
| Caso-controle | desfecho | Não | OR | doença rara, longa latência |
| Coorte | exposição | Sim | RR, risco atribuível | prognóstico, fator de risco |
| Ensaio clínico | intervenção | Sim | RR, RRR, RAR, NNT/NNH | eficácia e segurança |
| Sobrevida | tempo até evento | Sim, com tempo | HR | desfechos temporais |

## Vieses e Variáveis de Confusão

Um estudo pode achar um resultado errado por dois motivos: erro aleatório (azar) ou erro sistemático (**viés**).

- **Viés de Seleção:** Os grupos comparados são diferentes desde o início por falha na escolha dos participantes. Exemplo: Comparar a mortalidade de um hospital terciário com um posto de saúde.

- **Viés de Aferição (ou Medição):** Os dados são coletados de forma diferente entre os grupos. Exemplo: O pesquisador usa um esfigmomanômetro calibrado no grupo intervenção e um descalibrado no controle.

- **Variável de Confusão:** É um "terceiro elemento" que está associado tanto à exposição quanto ao desfecho.

- Exemplo clássico: Um estudo mostra que quem toma café tem mais câncer de pulmão. O café causa câncer? Não. O fator de confusão é o **tabagismo**. Quem toma café tende a fumar mais, e o cigarro sim causa o câncer.

- Como controlar a confusão? Na fase de desenho, usamos a **randomização**, o **pareamento** ou a **restrição**. Na fase de análise, usamos a **estratificação** ou **análise multivariada**.

## Níveis de Evidência (USPSTF e Oxford)

As bancas frequentemente perguntam sobre a força da recomendação. Embora existam várias escalas, a lógica é sempre a mesma:

- **Nível I:** Evidência de pelo menos um Ensaio Clínico Randomizado bem desenhado ou metanálise de ECRs.

- **Nível II-1:** Ensaios controlados bem desenhados, mas sem randomização.

- **Nível II-2:** Estudos de Coorte ou Caso-Controle bem desenhados (preferencialmente multicêntricos).

- **Nível II-3:** Múltiplas séries temporais, com ou sem intervenção, ou resultados dramáticos em experimentos não controlados.

- **Nível III:** Opiniões de autoridades respeitadas, baseadas em experiência clínica, estudos descritivos ou relatórios de comitês de especialistas.

**Graus de Recomendação (USPSTF):**

- **A:** Recomendação forte. Há alta certeza de que o benefício líquido é substancial.

- **B:** Recomendação moderada. Há alta certeza de que o benefício líquido é moderado.

- **C:** Recomendação seletiva. O benefício é pequeno, deve ser individualizado.

- **D:** Contraindicação. O dano é maior que o benefício ou não há benefício.

- **I:** Insuficiente. Não há evidência de qualidade para recomendar a favor ou contra.

## Situações Especiais e Pegadinhas de Prova

### Coorte Retrospectiva (ou Histórica)

Muitos alunos erram isso achando que, se é retrospectivo, é caso-controle. Errado!
Na coorte retrospectiva, eu volto no passado (ex: prontuários de 2010), seleciono quem estava exposto e quem não estava, e "sigo" essas pessoas nos prontuários até 2024 para ver o desfecho. A seleção continua sendo pela **exposição**.

### Estudo de Intervenção Comunitária

É um ensaio clínico, mas a unidade de análise é o grupo. Exemplo: Fluoretação da água de uma cidade inteira comparada a outra cidade que não recebeu flúor. É experimental, mas de base agregada.

### Estudo de Acurácia Diagnóstica

É um tipo de estudo transversal onde comparamos um "teste índice" (o novo exame) com um "padrão-ouro". Serve para calcular Sensibilidade, Especificidade, VPP e VPN.

### O Uso do Placebo

Segundo a Declaração de Helsinki e as normas do Conselho Nacional de Saúde (Resolução 466/2012), o uso de placebo só é ético se não existir um tratamento padrão eficaz para aquela condição. Se já existe um remédio que funciona, o novo remédio deve ser comparado com o melhor tratamento disponível, não com o vácuo.

## Exemplo Clínico para Fixação

**Cenário:** investigar se o uso de um novo tipo de cotonete está associado ao aumento de otite externa em crianças.

- Selecionar 100 crianças com otite e 100 sem otite e perguntar se usaram o cotonete: **caso-controle**.

- Acompanhar 200 crianças que usam o cotonete e 200 que não usam por 6 meses: **coorte**.

- Sortear 100 crianças para usar o cotonete e 100 para não usar (antiético, mas didático): **ensaio clínico**.

- Comparar dados de venda de cotonetes por estado com notificações de otite nesses estados: **ecológico**.

- Entrevistar todas as crianças que estão no parquinho hoje sobre uso de cotonete e presença de dor de ouvido: **transversal**.

## Pontos-Chave para Prova

- **Unidade de análise:** Se for a população/grupo, o estudo é ECOLÓGICO. Se for o indivíduo, pode ser qualquer um dos outros.

- **Temporalidade:** Se mede exposição e desfecho ao mesmo tempo, é TRANSVERSAL (gera Prevalência).

- **Ponto de partida:** Partiu da doença? CASO-CONTROLE (gera Odds Ratio). Partiu da exposição? COORTE (gera Risco Relativo).

- **Doenças Raras:** O desenho de escolha é o CASO-CONTROLE.

- **Exposições Raras:** O desenho de escolha é a COORTE.

- **Padrão-Ouro de Causalidade:** Ensaio Clínico Randomizado (ECR).

- **Randomização:** Serve para evitar viés de seleção e balancear fatores de confusão (conhecidos e desconhecidos).

- **Cegamento:** Serve para evitar viés de aferição/observação.

- **Análise por Intenção de Tratar:** Avalia todos os randomizados, mantém a força do sorteio e reflete a efetividade.

- **Falácia Ecológica:** Erro de inferir que uma associação observada no grupo vale para o indivíduo.

- **Viés de Memória:** Típico de estudos Caso-Controle.

- **Perda de Seguimento:** O grande inimigo dos estudos de Coorte e Ensaios Clínicos.

- **Critério de Bradford Hill obrigatório:** Temporalidade (a causa deve preceder o efeito).

- **NNT:** É o inverso da Redução Absoluta do Risco (1/RAR). Quanto menor, melhor.

- **Metanálise:** O diamante no Forest Plot representa o resultado combinado. Se ele não cruza a linha do 1, há significância estatística.

- **Ética:** O uso de placebo é proibido se houver tratamento padrão eficaz disponível.

- **Validade Interna:** O estudo é correto para aquela amostra (sem vieses).

- **Validade Externa:** O resultado pode ser generalizado para outras populações. 💡

 Cópia offline para consulta pessoal.
 Fonte original:
 [https://www.medevo.com.br/material-apoio/ler/2bb94242-0da6-470e-a9aa-151633f6313b](https://www.medevo.com.br/material-apoio/ler/2bb94242-0da6-470e-a9aa-151633f6313b)
