# ESTATÍSTICA DESCRITIVA

Para começar nosso estudo, você precisa entender que a Bioestatística não é sobre fórmulas matemáticas complexas, mas sobre a organização da incerteza. Na prática médica, lidamos com dados o tempo todo. Se você não souber descrever esses dados corretamente, não conseguirá tomar decisões clínicas seguras. A Estatística Descritiva é a base de tudo: ela organiza, resume e apresenta os dados para que possamos enxergar padrões onde antes havia apenas uma lista de números.

## Tipos de Variáveis: O Primeiro Passo para Não Errar

Antes de calcular qualquer média ou mediana, você deve olhar para o dado e perguntar: "Que tipo de variável é essa?". Se você errar aqui, vai errar a escolha do teste estatístico lá na frente. As bancas de residência adoram cobrar essa classificação básica porque ela separa quem entende o conceito de quem apenas decora fórmulas.

As variáveis são divididas em dois grandes grupos:

### Variáveis Qualitativas (ou Categóricas)

Elas expressam uma qualidade, um atributo ou uma categoria. Não são números no sentido matemático da palavra.

- **Nominais:** Não existe uma ordem entre as categorias. Exemplo: Sexo (Masculino/Feminino), Tipo Sanguíneo (A, B, AB, O), ou a presença de uma doença (Sim/Não).

- **Ordinais:** Existe uma hierarquia ou ordem natural. Exemplo: Estadiamento de um câncer (I, II, III, IV), Escolaridade (Fundamental, Médio, Superior) ou a Intensidade da dor (Leve, Moderada, Intensa).

### Variáveis Quantitativas (ou Numéricas)

Aqui os números realmente representam quantidades e permitem operações matemáticas.

- **Discretas:** Resultam de uma contagem. São números inteiros, sem "quebrados". Exemplo: Número de filhos, número de batimentos cardíacos por minuto ou quantidade de episódios de cistite não complicada no último ano.

- **Contínuas:** Resultam de uma medição e podem assumir qualquer valor em um intervalo, incluindo decimais. Exemplo: Peso, altura, pressão arterial ou nível de glicemia.

**Dica de Prova:** Cuidado com a idade. Se a questão diz "idade em anos completos", ela está tratando como discreta. Se diz apenas "idade", geralmente é considerada contínua. A MedEvo sempre reforça: olhe como o dado foi coletado antes de classificar.

![Figura 1 - Diagrama de desvio padrão na distribuição normal](assets/imagem-001-168085eb5a8a.png)

*Figura 1 - Curva de distribuição normal ilustrando a regra empírica (68-95-99,7%): cada faixa representa um desvio padrão a partir da média. Fonte: M. W. Toews, CC BY 2.5 | Wikimedia Commons*

## Medidas de Tendência Central: Onde os Dados se Concentram

Quando temos um conjunto de dados, queremos saber qual é o valor "típico" ou central. Para isso, usamos três medidas principais: Média, Mediana e Moda.

### Média Aritmética

É a soma de todos os valores dividida pelo número total de observações (n). É a medida mais utilizada, mas tem um ponto fraco gigante: ela é extremamente sensível a valores extremos (outliers).
Imagine que em uma enfermaria temos 4 pacientes com 20 anos e um paciente com 90 anos. A média de idade será de 34 anos. Perceba que a média não representa bem nenhum dos dois grupos.

### Mediana

É o valor que divide o conjunto de dados exatamente ao meio, após serem colocados em ordem crescente (rol). 50% dos dados estão abaixo da mediana e 50% estão acima.
Diferente da média, a mediana é robusta, ou seja, não se deixa abalar por valores extremos. Se você tem uma distribuição de renda onde a maioria ganha pouco e um único bilionário ganha muito, a mediana será a melhor medida para representar a realidade daquela população.

**Erro clássico de prova:** Em uma amostra com número par de elementos (n), a mediana é a média aritmética dos dois valores centrais (posições n/2 e n/2 + 1). Se você esquecer de colocar os dados em ordem antes de calcular, vai errar a questão.

### Moda

É o valor que ocorre com maior frequência no conjunto de dados. Um conjunto pode ser amodal (sem moda), unimodal, bimodal ou polimodal. Na prática clínica, usamos pouco a moda, exceto para descrever variáveis qualitativas nominais (ex: qual o diagnóstico mais frequente nesta unidade?).

![Figura 2 - Box plot comparado à distribuição de probabilidade](assets/imagem-002-343a05e9c163.png)

*Figura 2 - Diagrama comparando um box plot (esquerda) com a função de densidade de probabilidade (direita) de uma distribuição normal, demonstrando mediana, quartis e intervalo interquartil. Fonte: Jhguch/Chen-Pan Liao, CC BY-SA 2.5 | Wikimedia Commons*

## Medidas de Dispersão: O Quão "Espalhados" Estão os Dados?

Saber a média não basta. Se eu te disser que a média de profundidade de um rio é de 1,5 metro, você pularia nele sem saber nadar? Se a dispersão for alta, pode haver pontos com 3 metros e outros com 0,5 metro.

### Amplitude

É a diferença entre o maior e o menor valor. É simples, mas limitada, pois ignora tudo o que acontece entre os extremos.

### Variância e Desvio-Padrão (DP)

O Desvio-Padrão é a medida de dispersão mais importante. Ele indica o quanto, em média, os valores se afastam da média aritmética.

- DP baixo: Os dados estão concentrados próximos à média (amostra homogênea).

- DP alto: Os dados estão espalhados (amostra heterogênea).

**Por que usamos o Desvio-Padrão e não a Variância?** Porque a variância está em unidades ao quadrado (ex: kg²). Ao tirar a raiz quadrada da variância, voltamos para a unidade original do dado (ex: kg), facilitando a interpretação clínica.

### Coeficiente de Variação (CV)

É a razão entre o desvio-padrão e a média, expressa em porcentagem (CV = (DP / Média) × 100). Ele serve para comparar a variabilidade entre grupos com médias muito diferentes ou unidades diferentes.
Exemplo: Comparar a variabilidade do peso de recém-nascidos com o peso de adultos. O desvio-padrão absoluto dos adultos será maior, mas o CV nos permite uma comparação justa da dispersão relativa.

## A Distribuição Normal e a Regra Empírica

A Distribuição Normal (ou Curva de Gauss) é o "santo graal" da estatística descritiva. Ela é perfeitamente simétrica e tem o formato de um sino.

### Propriedades da Distribuição Normal

- Média = Mediana = Moda.

- É determinada por dois parâmetros: a média (que define o centro) e o desvio-padrão (que define a largura do sino).

- **Regra Empírica (68-95-99.7):** Esta regra cai em quase todas as provas.

- Aproximadamente 68% dos dados estão entre a Média ± 1 DP.

- Aproximadamente 95% dos dados estão entre a Média ± 2 DP (mais precisamente 1,96 DP).

- Aproximadamente 99,7% dos dados estão entre a Média ± 3 DP.

**Cenário Clínico:** Se a pressão sistólica de uma população segue uma distribuição normal com média 120 mmHg e DP de 10 mmHg, você sabe imediatamente que 95% dessa população tem pressão entre 100 e 140 mmHg (120 ± 2x10).

### Distribuições Assimétricas

Nem tudo na vida é normal.

- **Assimetria Positiva (à direita):** A cauda da curva se alonga para a direita (valores altos). Aqui, Média > Mediana > Moda. Exemplo: Renda, tempo de internação hospitalar.

- **Assimetria Negativa (à esquerda):** A cauda se alonga para a esquerda (valores baixos). Aqui, Moda > Mediana > Média.

**Dica do Dr. Will:** Em distribuições muito assimétricas, a mediana é a melhor medida de tendência central para descrever os dados, pois a média é "puxada" pelos valores extremos.

## Indicadores de Saúde: Medindo a Doença e a Morte

Aqui entramos na parte de Epidemiologia Descritiva, onde as taxas e coeficientes são os protagonistas. As bancas amam trocar "coeficiente" por "índice" ou "taxa".

### Coeficientes vs. Índices

- **Coeficiente (ou Taxa):** O numerador está contido no denominador. Representa o risco ou probabilidade de um evento ocorrer. Ex: Coeficiente de Mortalidade Geral.

- **Índice (ou Razão):** O numerador NÃO está contido no denominador. É uma comparação entre dois grupos independentes. Ex: Razão de sexos (homens/mulheres).

### Prevalência e Incidência: A Diferença Fundamental

Este é o conceito mais cobrado em provas de Medicina Preventiva.

- **Prevalência:** É uma fotografia. Mede o número total de casos (novos + antigos) em um determinado momento.

- Prevalência = (Casos existentes / População total).

- Útil para planejamento de leitos, compra de medicamentos e gestão de doenças crônicas como Diabetes Mellitus Tipo 2.

- **Incidência:** É um filme. Mede apenas os casos NOVOS que surgiram em um período.

- Incidência = (Casos novos / População em risco no início do período).

- É a melhor medida para avaliar risco e etiologia.

**Fatores que alteram a Prevalência:**

- Aumenta com: Maior duração da doença, imigração de casos, melhoria no diagnóstico.

- Diminui com: Cura rápida, alta letalidade (morte rápida), emigração de casos.

- Relação fundamental: Prevalência ≈ Incidência × Duração.

### Coeficientes de Mortalidade

Os coeficientes de mortalidade medem o risco de morte em uma população.

- **Mortalidade Geral:** (Óbitos totais / População total) x 1.000. É um indicador bruto, muito influenciado pela estrutura etária. Não serve para comparar populações com idades diferentes sem padronização.

- **Mortalidade Infantil:** (Óbitos < 1 ano / Nascidos Vivos) x 1.000. É um excelente indicador de condições de vida e saúde. Divide-se em:

- Neonatal (0-27 dias): Reflete causas biológicas, pré-natais e de parto.

- Pós-neonatal (28 dias a < 1 ano): Reflete causas ambientais (saneamento, nutrição, infecções). Também chamada de mortalidade infantil tardia.

- **Mortalidade Materna:** (Óbitos por causas ligadas à gestação, parto ou puerpério até 42 dias / Nascidos Vivos) x 100.000. Note que o fator multiplicador aqui é 100.000, diferente da infantil que é 1.000.

### Letalidade: A Gravidade da Doença

Diferente da mortalidade (que usa a população total), a letalidade foca nos doentes.
Letalidade = (Óbitos por determinada doença / Total de pessoas com essa doença) × 100.
Se a raiva humana tem letalidade próxima de 100%, significa que quase todos que adoecem morrem. Se a cistite tem letalidade próxima de 0%, ela mata muito pouco, apesar de ser comum.

## Indicadores de Avaliação de Saúde Populacional

### Índice de Swaroop-Uemura (Razão de Mortalidade Proporcional)

Este indicador é uma "pérola" de prova. Ele mede a proporção de óbitos que ocorrem em pessoas com 50 anos ou mais.
ISU = (Óbitos ≥ 50 anos / Total de óbitos) × 100.

- Quanto MAIOR o ISU, MELHOR o nível de saúde da população.

- Em países desenvolvidos, o ISU é superior a 75%. No Brasil, ele vem crescendo nas últimas décadas, refletindo o envelhecimento populacional e a melhoria das condições sanitárias.

### Curvas de Mortalidade Proporcional (Curvas de Nelson Moraes)

Avaliam o nível de saúde através do gráfico da mortalidade por idade.

- **Tipo I (Nível de saúde muito baixo):** Formato em "N" ou "J" invertido. Muitos óbitos infantis.

- **Tipo IV (Nível de saúde elevado):** Formato em "J". A maioria dos óbitos ocorre em idosos.

### Padronização de Taxas

Imagine comparar a mortalidade de Santos (cidade com muitos idosos) com a de uma cidade universitária jovem. Santos terá uma mortalidade bruta maior, mas isso não significa que o sistema de saúde lá é pior; é apenas uma população mais velha.
Para comparar populações diferentes, precisamos **padronizar por idade**. Isso elimina o viés da estrutura etária e permite uma comparação justa (maçãs com maçãs).

## Avaliação de Testes Diagnósticos: A Estatística na Beira do Leito

Quando você solicita um teste para um paciente, precisa saber o quão confiável ele é.

### Sensibilidade e Especificidade (Propriedades do Teste)

- **Sensibilidade:** Capacidade do teste de identificar os verdadeiros doentes. Um teste 93% sensível significa que 7% dos doentes serão Falsos Negativos. Testes muito sensíveis são ótimos para triagem (screening), pois um resultado negativo praticamente exclui a doença.

- **Especificidade:** Capacidade do teste de identificar os verdadeiros sadios. Um teste muito específico é ótimo para confirmar o diagnóstico, pois um resultado positivo raramente é um Falso Positivo.

### Valores Preditivos (Dependem da Prevalência)

Aqui está a maior pegadinha das bancas:

- **Valor Preditivo Positivo (VPP):** Probabilidade de o paciente ter a doença dado que o teste foi positivo.

- **Valor Preditivo Negativo (VPN):** Probabilidade de o paciente estar saudável dado que o teste foi negativo.

**Regra de Ouro:**

- Se a **Prevalência aumenta** → VPP aumenta e VPN diminui.

- Se a **Prevalência diminui** → VPP diminui e VPN aumenta.
Isso explica por que não fazemos rastreamento de doenças raras em populações de baixo risco: teríamos muitos falsos positivos (VPP baixo).

### Curva ROC (Receiver Operating Characteristic)

É um gráfico que coloca a Sensibilidade no eixo Y e (1 - Especificidade) no eixo X.

- Quanto mais a curva se aproxima do canto superior esquerdo, melhor é o teste.

- A área abaixo da curva (AUC) mede a acurácia global do teste. Uma AUC de 0,5 significa que o teste é tão bom quanto jogar uma moeda (puro acaso).

## Tabelas Comparativas para Fixação

### Tabela 1: Medidas de Tendência Central vs. Distribuição

| Medida | Sensibilidade a Outliers | Melhor uso |
| --- | --- | --- |
| Média | Alta (muito sensível) | Distribuições Simétricas (Normais) |
| Mediana | Baixa (robusta) | Distribuições Assimétricas |
| Moda | Nula | Variáveis Qualitativas Nominais |

### Tabela 2: Indicadores de Mortalidade

| Indicador | Numerador | Denominador | Fator (k) |
| --- | --- | --- | --- |
| Mortalidade Geral | Total de óbitos | População total | 1.000 |
| Mortalidade Infantil | Óbitos < 1 ano | Nascidos vivos | 1.000 |
| Mortalidade Materna | Óbitos maternos | Nascidos vivos | 100.000 |
| Letalidade | Óbitos por doença X | Casos da doença X | 100 |

### Tabela 3: Desempenho de Testes Diagnósticos

| Teste | Objetivo | Se der Negativo... | Se der Positivo... |
| --- | --- | --- | --- |
| Alta Sensibilidade | Triagem (Screening) | Exclui a doença (SNOUT) | Pode ser falso positivo |
| Alta Especificidade | Confirmação | Pode ser falso negativo | Confirma a doença (SPIN) |

## Erros Comuns e Heurísticas na Tomada de Decisão

Como professor, vejo alunos caírem em armadilhas cognitivas o tempo todo. A estatística descritiva tenta mitigar esses erros.

- **Heurística de Disponibilidade:** É a tendência de superestimar a probabilidade de eventos que lembramos com facilidade (eventos recentes ou dramáticos). Se você viu um caso raro de febre amarela ontem, tenderá a achar que a prevalência da doença é maior do que realmente é.

- **Confundir Precisão com Acurácia:**

- **Precisão (Confiabilidade):** É a capacidade de repetir o mesmo resultado várias vezes. Um teste pode ser altamente preciso, mas estar sempre errado (ex: uma balança descalibrada que marca sempre 2kg a mais).

- **Acurácia (Validade):** É a capacidade de o teste chegar perto do valor real.

- **Viés de Sobrevivência:** Ocorre quando analisamos apenas os pacientes que sobreviveram a um evento, ignorando os que morreram precocemente. Isso pode fazer uma intervenção parecer mais eficaz do que realmente é.

## Análise de Sobrevida e Eficácia

Em estudos de coorte ou ensaios clínicos, usamos a análise de sobrevida para entender o tempo até a ocorrência de um evento (morte, cura, recidiva).

- **Sobrevida Relativa:** É a razão entre a sobrevida observada no grupo de doentes e a sobrevida esperada em uma população semelhante, mas sem a doença.

- **Eficácia da Intervenção:** Geralmente calculada como 1 - Risco Relativo (RR). Se uma vacina reduz o risco de infecção de 10% para 2%, o RR é 0,2 e a eficácia é 1 - 0,2 = 0,8 (ou 80%).

- **Redução Relativa do Risco (RRR):** É a proporção do risco basal que foi removida pela intervenção. RRR = (Risco Controle - Risco Intervenção) / Risco Controle.

## Medidas de Associação e Risco

Embora façam parte da estatística analítica, as bancas costumam cobrar o cálculo básico dessas medidas junto com a descritiva.

- **Risco Relativo (RR):** Usado em estudos de Coorte e Ensaios Clínicos. É a razão entre a incidência nos expostos e a incidência nos não expostos.

- **Odds Ratio (OR):** Usado em estudos de Caso-Controle. É a razão de chances. Calculado pela "multiplicação cruzada" da tabela 2x2: (a × d) / (b × c).

- **Razão de Prevalência (RP):** Usada em estudos Transversais. Compara a prevalência do desfecho entre expostos e não expostos.

## Determinantes Sociais e Estatísticas Vitais

A estatística descritiva em saúde pública não vive apenas de números biológicos. O **IDH (Índice de Desenvolvimento Humano)** é um indicador composto que você deve conhecer:

- Expectativa de vida ao nascer (Saúde).

- Anos de escolaridade média e esperada (Educação).

- PIB per capita (Renda).

As estatísticas vitais dependem da qualidade do preenchimento de documentos como a **Declaração de Óbito (DO)** e a **Declaração de Nascido Vivo (DNV)**. Erros no preenchimento da causa básica na DO geram dados de má qualidade, dificultando o planejamento de políticas públicas.

## Pontos-Chave para Prova 🎯

- **Distribuição Normal:** Média = Mediana = Moda. 95% dos dados estão entre ± 1,96 Desvios-Padrão.

- **Mediana:** É a melhor medida para dados com valores extremos (outliers) ou distribuições assimétricas.

- **Incidência vs. Prevalência:** Incidência = casos NOVOS (risco). Prevalência = casos TOTAIS (carga da doença).

- **Letalidade:** Óbitos / Doentes. Mede a gravidade da doença.

- **Mortalidade Infantil:** Neonatal (até 27 dias) vs. Pós-neonatal (28 dias a 1 ano).

- **Swaroop-Uemura:** Óbitos ≥ 50 anos / Total de óbitos. Quanto maior, melhor a saúde.

- **Mortalidade Materna:** Denominador é Nascidos Vivos, multiplicador é 100.000.

- **Sensibilidade:** Boa para triagem. Se negativa, exclui a doença (baixo Falso Negativo).

- **VPP e VPN:** O VPP aumenta quando a prevalência da doença na população aumenta.

- **Variáveis:** Saiba diferenciar Nominal (sexo), Ordinal (estadiamento), Discreta (nº de filhos) e Contínua (peso).

- **Coeficiente de Variação:** Usado para comparar a variabilidade de grupos com unidades ou médias diferentes.

- **Regra de Ouro da Assimetria Positiva:** Média > Mediana > Moda.

- **Padronização:** Essencial para comparar taxas de mortalidade entre populações com estruturas etárias diferentes.

- **Erro de Prova:** Achar que Mortalidade e Letalidade são a mesma coisa. Mortalidade usa a população toda; Letalidade usa apenas quem está doente.

- **O que NÃO fazer:** Nunca use a média para descrever uma amostra com outliers bizarros sem mencionar a mediana.

- **Valores a memorizar:** 68% (1 DP), 95% (2 DP), 99,7% (3 DP) na curva normal.

- **Cuidado:** A mediana de uma amostra par é a média dos dois valores centrais APÓS a ordenação.

- **Eficácia Vacinal:** Calculada como 1 - RR. Se o IC 95% do RR cruzar o valor 1, o resultado não tem significância estatística.

 Cópia offline para consulta pessoal.
 Fonte original:
 [https://www.medevo.com.br/material-apoio/ler/e2c15093-61f5-4d78-8c29-62d4ea100684](https://www.medevo.com.br/material-apoio/ler/e2c15093-61f5-4d78-8c29-62d4ea100684)
