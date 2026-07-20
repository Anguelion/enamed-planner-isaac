# ESTATÍSTICA INFERENCIAL

Para começar nosso papo sobre estatística inferencial, você precisa entender a lógica por trás da coisa. Na medicina, raramente conseguimos estudar todos os pacientes do mundo com uma determinada doença. Não temos tempo nem dinheiro para isso. O que fazemos? Pegamos uma **amostra** e, a partir dela, tentamos dizer algo sobre a **população**.

A inferência é justamente esse salto: eu olho para 500 pessoas (amostra) e concluo algo sobre 5 milhões (população). Mas esse salto tem riscos. O risco de eu ter pegado uma amostra "viciada" ou de o resultado ter sido pura sorte. É aqui que entram os testes de hipótese e os intervalos de confiança.

## Estimativa Pontual vs. Estimativa Intervalar

Quando você lê um estudo dizendo que a média de redução da pressão arterial com a droga X foi de 10 mmHg, isso é uma **estimativa pontual**. É um valor único, o "melhor palpite" baseado naquela amostra.

O problema é que, se eu repetir o estudo com outra amostra, o valor pode ser 9 ou 11. Por isso, na prática clínica e nas provas, valorizamos mais a **estimativa intervalar**, que é o famoso Intervalo de Confiança (IC).

O IC nos dá uma margem de segurança. Se o IC 95% é de [8 a 12], estamos dizendo que, se repetíssemos esse estudo 100 vezes, em 95 delas o resultado estaria dentro dessa faixa.

**Dica de Prova:** Quanto maior o tamanho da amostra, mais estreito é o IC. Um IC estreito significa maior **precisão**. Se o IC for muito largo, o estudo é impreciso, geralmente porque a amostra foi pequena.

## O Teste de Hipóteses e o Valor P

Aqui é onde muitos alunos se perdem, mas a lógica é simples. Imagine que estamos testando uma vacina nova contra a Febre Amarela. Temos dois grupos: vacina e placebo.

- **Hipótese Nula (H0):** É a hipótese do "balde de água fria". Ela diz que não há diferença entre os grupos. Se houver alguma diferença na amostra, foi por puro acaso.

- **Hipótese Alternativa (H1):** É o que o pesquisador quer provar. Diz que a vacina funciona e a diferença é real.

O **Valor P** é a probabilidade de encontrarmos aquele resultado (ou um mais extremo) assumindo que a H0 é verdadeira. Ou seja, é a probabilidade de o resultado ser fruto do acaso.

Se o P for pequeno (geralmente < 0,05 ou 5%), nós dizemos: "Puxa, a chance de isso ser acaso é tão pequena que eu vou rejeitar a H0". Aí dizemos que o resultado tem **significância estatística**.

**Cuidado:** Se o P for 0,40, por exemplo, ele é maior que 0,05. Isso não prova que os grupos são iguais; apenas significa que não temos evidência estatística para rejeitar a H0. Guarde isso: "Ausência de evidência não é evidência de ausência".

![Figura 1 - Valor de p nos testes de significância](assets/imagem-001-08d163dda412.png)

*Figura 1 - Ilustração do conceito de valor de p nos testes de significância estatística, mostrando a distribuição sob H0 e a área correspondente ao p-valor. Fonte: Repapetilto/Chen-Pan Liao, CC BY-SA 3.0 | Wikimedia Commons*

## Erros do Tipo I e Tipo II

Nesse processo de decisão, podemos errar de duas formas:

- **Erro Tipo I (Alfa):** É o falso positivo da estatística. Você diz que a droga funciona (rejeita H0), mas na verdade ela não faz nada. O limite aceitável para esse erro é o próprio nível de significância (geralmente 5%).

- **Erro Tipo II (Beta):** É o falso negativo. A droga funciona, mas o seu estudo não conseguiu provar (não rejeitou H0).

O **Poder Estatístico** de um estudo é (1 - Beta). É a capacidade do estudo de detectar uma diferença quando ela realmente existe. Estudos com amostras pequenas costumam ter baixo poder, aumentando a chance de erro tipo II. Como o Dr. Will sempre reforça nas discussões do MedEvo, um estudo "negativo" (P > 0,05) pode ser apenas um estudo pequeno demais para ver a realidade.

## Medidas de Associação e Efeito

As bancas amam cálculos. Você precisa saber quando usar cada medida e como interpretá-las.

### Risco Relativo (RR) e Odds Ratio (OR)

O RR é usado em estudos onde acompanhamos o paciente ao longo do tempo (Coorte e Ensaio Clínico). É a razão entre a incidência nos expostos e a incidência nos não expostos.

$RR = \frac{Incidência\ nos\ Expostos}{Incidência\ nos\ Não\ Expostos}Já o OR (Razão de Chances) é usado principalmente em estudos de Caso-Controle, onde partimos do doente para o passado.

**Tabela 2x2 Clássica:**

| | Doente | Saudável |
| --- | --- | --- |
| **Exposto** | a | b |
| **Não Exposto** | c | d |

- **RR** = [a / (a+b)] / [c / (c+d)]

- **OR** = (a * d) / (b * c)

**Interpretação do RR e OR:**

- **RR > 1:** A exposição é um fator de risco.

- **RR = 1:** Não há associação (Linha de Nulidade).

- **RR < 1:** A exposição é um fator de proteção (ex: vacina).

**Pegadinha de Prova:** Se o Intervalo de Confiança do RR ou OR passar pelo número 1 (ex: IC 95% 0,8 a 1,5), o resultado **não** tem significância estatística. Por quê? Porque o 1 significa "sem diferença", e se o intervalo inclui o 1, o acaso pode ser a explicação.

### RRA, RRR e NNT

Essas medidas são fundamentais para avaliar a eficácia de intervenções. Imagine um estudo com Metformina para prevenir Infarto:

- Risco no grupo controle (placebo): 16% (0,16)

- Risco no grupo intervenção (Metformina): 8% (0,08)

- **Redução do Risco Absoluto (RRA):** É a diferença simples.0,16 - 0,08 = 0,08(ou 8%). É o quanto de doença eu evitei na população total.

- **Redução do Risco Relativo (RRR):** É o quanto o risco caiu em relação ao que era antes.RRA / Risco\ Controle \rightarrow 0,08 / 0,16 = 0,5(ou 50%). A RRR costuma ser um número "bonito" que a indústria adora usar, mas a RRA é mais honesta clinicamente.

- **Número Necessário para Tratar (NNT):** É o inverso da RRA.1 / RRA. No nosso exemplo:1 / 0,08 = 12,5. Arredondamos para 13.

- **Significado:** Preciso tratar 13 pessoas para evitar 1 desfecho (infarto).

- Quanto menor o NNT, melhor a intervenção. Se o NNT de uma droga para sinusite é 15, significa que 14 em cada 15 pacientes estão sendo tratados sem necessidade para que 1 tenha o benefício real.

## Testes Diagnósticos: A Lógica da Incerteza

Na prática clínica, usamos testes para mudar nossa probabilidade pré-teste de que o paciente tenha a doença.

![Figura 2 - Curvas ROC](assets/imagem-002-8374a7af978d.png)

*Figura 2 - Curvas ROC (Receiver Operating Characteristic) comparando o desempenho de diferentes testes diagnósticos: quanto maior a área sob a curva (AUC), melhor a capacidade discriminativa do teste. Fonte: Sharpr/Kakau, CC BY-SA 3.0 | Wikimedia Commons*

## Sensibilidade e Especificidade

- **Sensibilidade:** Capacidade do teste de dar positivo em quem está doente. Testes muito sensíveis são ótimos para **rastreamento** (triagem), pois dão poucos falsos-negativos (SnNOut). Se um teste com 99% de sensibilidade dá negativo, você praticamente exclui a doença.

- **Especificidade:** Capacidade do teste de dar negativo em quem é saudável. Testes muito específicos são ótimos para **confirmar** o diagnóstico, pois dão poucos falsos-positivos (SpPIn).

### Valores Preditivos (VPP e VPN)

Aqui está o erro mais comum em provas. Sensibilidade e Especificidade são características do **teste**. Valores Preditivos dependem da **prevalência** da doença na população.

- **VPP (Valor Preditivo Positivo):** Se o teste deu positivo, qual a chance de o paciente realmente estar doente?

- **VPN (Valor Preditivo Negativo):** Se o teste deu negativo, qual a chance de o paciente realmente estar saudável?

**Regra de Ouro:**

- Se a prevalência da doença **aumenta** (ex: um especialista atendendo casos referenciados), o **VPP aumenta** e o VPN diminui.

- Se a prevalência **diminui** (ex: rastreamento em massa em população assintomática), o **VPP diminui** e o VPN aumenta.

### Razão de Verossimilhança (Likelihood Ratio)

A Razão de Verossimilhança (RV) é excelente porque não depende da prevalência.

- **RV Positiva (RVP):**Sensibilidade / (1 - Especificidade). Indica quanto um resultado positivo aumenta a chance da doença.

- **RV Negativa (RVN):**(1 - Sensibilidade) / Especificidade. Indica quanto um resultado negativo reduz a chance da doença.

### Curva ROC

Quando temos um teste que dá um valor contínuo (ex: Glicemia, PSA), precisamos escolher um "ponto de corte". A Curva ROC coloca a Sensibilidade no eixo Y e (1 - Especificidade) no eixo X.

- O ponto mais alto e à esquerda da curva é, geralmente, o melhor equilíbrio entre sensibilidade e especificidade.

- A **Área Abaixo da Curva (AUC)** mede a acurácia do teste. Quanto mais próxima de 1 (100%), melhor o teste. Uma AUC de 0,5 (linha diagonal) significa que o teste é tão bom quanto jogar uma moeda para cima.

## Delineamentos de Estudo e Vieses

A validade da sua inferência depende de como o estudo foi feito.

### Ensaio Clínico Randomizado (ECR)

É o padrão-ouro para intervenções. A **aleatorização** (randomização) serve para criar grupos comparáveis, distribuindo tanto os fatores conhecidos quanto os desconhecidos (confundidores) de forma igual entre os grupos. Isso reduz o **viés de seleção**.

Existem duas formas de analisar os resultados de um ECR:

- **Intenção de Tratar (ITT):** Analisa o paciente no grupo em que ele foi sorteado, mesmo que ele não tenha tomado o remédio ou tenha abandonado o estudo. Isso preserva a randomização e reflete a "vida real" (efetividade).

- **Por Protocolo (PP):** Analisa apenas quem seguiu o tratamento direitinho. Mostra o potencial máximo da droga (eficácia), mas perde a força da randomização.

### Revisão Sistemática e Metanálise

A metanálise é uma técnica estatística que combina resultados de vários estudos independentes para gerar um resultado único, com maior poder estatístico.

O gráfico clássico é o **Forest Plot** (gráfico de floresta). Nele, cada estudo é um quadrado (o tamanho do quadrado é o peso do estudo) e o resultado final é um diamante.

- Se o diamante não toca a linha de nulidade (1 para RR/OR ou 0 para diferenças de média), a metanálise é estatisticamente significante.

- **Heterogeneidade:** Se os estudos são muito diferentes entre si, a metanálise pode não ser confiável. Medimos isso peloI^2. Se oI^2for alto (ex: > 50%), há muita heterogeneidade.

### Vieses (Erros Sistemáticos)

Diferente do erro aleatório (que diminui se você aumentar a amostra), o **viés** é um erro de design que distorce o resultado sempre para o mesmo lado. Aumentar a amostra não resolve o viés.

- **Viés de Confusão:** Quando uma terceira variável está associada tanto à exposição quanto ao desfecho. Exemplo: Café causa câncer de pulmão? Na verdade, quem bebe muito café costuma fumar mais. O cigarro é a variável de confusão.

- **Viés de Seleção:** Quando os grupos comparados são diferentes desde o início.

- **Viés de Aferição:** Quando o pesquisador sabe quem está tomando a droga e acaba "procurando" mais o desfecho naquele grupo. Resolvemos isso com o **cegamento**.

## Comparação de Variáveis e Testes Estatísticos

Para escolher o teste estatístico correto na prova, você deve olhar para o tipo de variável:

| Tipo de Variável | Comparação entre 2 grupos | Comparação entre 3 ou + grupos |
| --- | --- | --- |
| **Quantitativa (Numérica)** | Teste t de Student | ANOVA |
| **Qualitativa (Categórica)** | Qui-quadrado ou Teste de Fisher | Qui-quadrado |

- **Teste t de Student:** Compara médias (ex: média de peso entre homens e mulheres).

- **Qui-quadrado:** Compara proporções (ex: % de curados no grupo A vs % de curados no grupo B). Se a amostra for muito pequena (alguma célula da tabela 2x2 < 5), usamos o **Teste Exato de Fisher**.

## Causalidade: Além da Estatística

Lembre-se sempre: **Associação estatística não é causalidade**. Para dizer que A causa B, usamos os **Critérios de Bradford Hill**:

- **Temporalidade:** A causa vem antes do efeito (único critério obrigatório).

- **Força de Associação:** RR ou OR elevados.

- **Dose-Resposta:** Quanto mais exposição, mais doença.

- **Consistência:** Outros estudos acharam a mesma coisa.

- **Plausibilidade Biológica:** Faz sentido de acordo com a fisiopatologia.

## Pontos-Chave para Prova

- **Valor P < 0,05:** Rejeita a hipótese nula (H0). O resultado é estatisticamente significante (provavelmente não é acaso).

- **Intervalo de Confiança (IC):** Se o IC de um RR ou OR incluir o valor **1**, o resultado não tem significância estatística.

- **NNT:** É calculado como1 / RRA. Se a RRA for 5% (0,05), o NNT é 20.

- **Sensibilidade (Sn):** Alta sensibilidade é boa para excluir doenças (SnNOut). Poucos falsos-negativos.

- **Especificidade (Sp):** Alta especificidade é boa para confirmar doenças (SpPIn). Poucos falsos-positivos.

- **VPP e VPN:** O VPP aumenta quando a prevalência da doença aumenta. O VPN diminui.

- **Erro Tipo I (Alfa):** Dizer que há diferença quando não há (Falso Positivo).

- **Erro Tipo II (Beta):** Dizer que não há diferença quando ela existe (Falso Negativo).

- **Poder Estatístico:** Capacidade de detectar diferença (1 - Beta). Aumenta com o tamanho da amostra.

- **Randomização:** Serve para garantir a comparabilidade dos grupos e reduzir o viés de seleção.

- **Análise por Intenção de Tratar (ITT):** Mantém a randomização e avalia a efetividade (vida real).

- **Viés de Confusão:** Variável associada à exposição e ao desfecho, mas que não faz parte do caminho causal.

- **Curva ROC:** O melhor ponto de corte é o que maximiza a sensibilidade e a especificidade simultaneamente (canto superior esquerdo).

- **Metanálise:** Nível I de evidência. O diamante no Forest Plot resume o efeito global.

- **Acurácia:** É a proporção de acertos totais do teste:(VP + VN) / Total$.

- **Risco Atribuível:** É a proporção de casos que poderiam ser evitados se eliminássemos a exposição.

- **Variáveis Categóricas:** Use Qui-quadrado para comparar proporções entre grupos. 🧠

 Cópia offline para consulta pessoal.
 Fonte original:
 [https://www.medevo.com.br/material-apoio/ler/ea329f31-b03c-4d37-ae01-b025879fd97d](https://www.medevo.com.br/material-apoio/ler/ea329f31-b03c-4d37-ae01-b025879fd97d)
