# TESTES ESTATÍSTICOS

Para dominar a bioestatística em provas de residência, você precisa parar de tentar decorar fórmulas e começar a entender a lógica por trás da escolha de cada teste. O examinador não quer que você seja um matemático, ele quer saber se você sabe interpretar um estudo científico para aplicá-lo na beira do leito.

A estatística inferencial serve para uma única coisa: quantificar a probabilidade de que a diferença observada em um estudo seja fruto do acaso ou de um erro amostral. Quando dizemos que algo é estatisticamente significante, estamos dizendo que é muito improvável que aquele resultado tenha acontecido "por sorte".

![Figura 1 - Distribuição normal e desvios-padrão para análise estatística](assets/imagem-001-168085eb5a8a.png)

*Figura 1 - A escolha do teste estatístico depende do tipo de variável: qualitativas (nominal ou ordinal) → Qui-quadrado ou Fisher; quantitativas (contínua ou discreta) → t de Student (2 grupos) ou ANOVA (≥ 3 grupos). Distribuição não normal → testes não paramétricos (Mann-Whitney, Kruskal-Wallis). Fonte: Domínio Público | Wikimedia Commons*

## Tipos de Variáveis: O Primeiro Passo

Antes de escolher qualquer teste, você deve olhar para o tipo de dado que está analisando. Se você errar a classificação da variável, você errará o teste. No MedEvo, sempre batemos na tecla de que a variável dita a regra do jogo.

### Variáveis Qualitativas (ou Categóricas)

São aquelas que definem categorias ou atributos. Elas se dividem em:

- Nominais: Não existe uma ordem lógica. Exemplo: Sexo (masculino/feminino), tipo sanguíneo, presença ou ausência de doença (sim/não).

- Ordinais: Existe uma hierarquia ou ordem. Exemplo: Estadiamento de câncer (I, II, III, IV), escolaridade, escala de dor.

### Variáveis Quantitativas (ou Numéricas)

São aquelas expressas em números. Elas se dividem em:

- Discretas: Números inteiros, geralmente contagens. Exemplo: Número de filhos, número de episódios de convulsão no mês.

- Contínuas: Podem assumir qualquer valor em um intervalo, geralmente dependem de um instrumento de medida. Exemplo: Peso, altura, pressão arterial em mmHg, nível sérico de glicose.

Cuidado: Muitas vezes a banca apresenta uma variável contínua (como idade) e a transforma em categórica (faixas etárias). Se a análise for feita por faixas, o teste estatístico muda completamente.

## A Lógica da Hipótese Nula (H0) e o Valor P

Todo teste estatístico começa com a Hipótese Nula (H0). A H0 é a hipótese do "balde de água fria". Ela afirma que não há diferença entre os grupos ou que não há associação entre as variáveis. O objetivo do pesquisador, geralmente, é rejeitar a H0.

O Valor P (p-valor) é a probabilidade de encontrarmos os resultados observados (ou algo mais extremo) caso a Hipótese Nula seja verdadeira.
Se p < 0,05 (ou 5%), consideramos que a chance de o resultado ser puro acaso é muito baixa. Portanto, rejeitamos a H0 e dizemos que a diferença é estatisticamente significante.

Se p < 0,001, isso significa que, se a hipótese nula for verdadeira, a chance de observar tal diferença é menor que 0,1%. Quanto menor o p, maior a nossa confiança de que o efeito é real.

### Erros de Interferência

Ao tomar uma decisão baseada no p-valor, podemos cometer dois tipos de erros:

- Erro Tipo I (Alfa): É o falso positivo da estatística. É quando você rejeita a H0, mas ela era verdadeira. Ou seja, você diz que há uma diferença que, na verdade, não existe.

- Erro Tipo II (Beta): É o falso negativo. É quando você aceita a H0 (diz que não há diferença), mas na verdade a diferença existia. O poder do teste (1 - Beta) é a capacidade do estudo de detectar uma diferença quando ela realmente existe.

## Testes para Variáveis Categóricas: Comparando Proporções

Quando você quer saber se a proporção de cura é maior no grupo que tomou o remédio comparado ao grupo placebo, você está lidando com variáveis categóricas (curou: sim ou não).

### Teste Qui-quadrado de Pearson (χ²)

É o teste não paramétrico mais clássico das provas. Ele avalia a associação entre duas variáveis categóricas em amostras independentes.
A lógica do Qui-quadrado é comparar o que foi observado no estudo com o que seria esperado se não houvesse nenhuma associação (sob a H0).

Dica de prova: Quanto maior o valor do Qui-quadrado, menor será o p-valor. Isso significa que há uma menor chance de o resultado ser fruto do acaso.
Lembre-se: O Qui-quadrado não serve para amostras pareadas (como o mesmo paciente antes e depois).

Para calcular o "Valor Esperado" em uma tabela 2x2, a fórmula que as bancas adoram cobrar é:
(Total da Linha x Total da Coluna) / Total Geral.

### Teste Exato de Fisher

Este é o "irmão mais preciso" do Qui-quadrado. Você deve usá-lo quando a amostra for pequena.
A regra de ouro para a prova: Se você tem uma tabela de contingência e pelo menos uma das células tem um valor esperado menor que 5, o Qui-quadrado perde a validade e você deve usar o Teste Exato de Fisher.

Exemplo clínico: Comparar a taxa de sucesso de uma cirurgia raríssima entre dois hospitais, onde apenas 10 pacientes foram operados no total.

## Testes para Variáveis Numéricas: Comparando Médias

Aqui o objetivo é comparar valores médios entre grupos. A escolha depende de quantos grupos temos e se os dados seguem uma distribuição normal (paramétricos).

### Teste t de Student

O Teste t de Student é um teste paramétrico usado para comparar as médias de dois grupos.
Ele pode ser de dois tipos:

- Independente (não pareado): Quando comparamos dois grupos distintos. Exemplo: Média de pressão arterial entre o grupo que usou a droga A e o grupo que usou placebo.

- Pareado: Quando comparamos o mesmo grupo em dois momentos diferentes. Exemplo: Peso dos pacientes antes de uma dieta e após 3 meses da mesma dieta.

Dica de prova: Se a questão fala em comparar médias de 2 grupos com distribuição normal, marque Teste t de Student. Se o teste t resultar em uma "grande razão", isso sugere que a diferença entre as médias é muito maior que a variabilidade interna, indicando um efeito significativo da intervenção.

### ANOVA (Análise de Variância)

E se tivermos 3 ou mais grupos? Imagine comparar a média de glicemia entre pacientes usando Metformina, Gliclazida ou Placebo.
Para comparar médias de três ou mais grupos independentes com dados paramétricos, usamos a ANOVA.

Cuidado: A ANOVA diz que "pelo menos um grupo é diferente dos outros", mas ela não diz qual. Para saber qual grupo específico difere, seriam necessários testes de post-hoc (como o de Tukey), mas isso raramente cai em provas de residência.

### Testes Não Paramétricos

Se os dados numéricos não seguem uma distribuição normal (são assimétricos) ou se a amostra é muito pequena, não podemos usar o Teste t ou a ANOVA. Usamos os equivalentes não paramétricos:

- No lugar do Teste t independente: Teste de Mann-Whitney.

- No lugar do Teste t pareado: Teste de Wilcoxon.

- No lugar da ANOVA: Teste de Kruskal-Wallis.

| Objetivo | Variável | Teste (Paramétrico) | Teste (Não Paramétrico) |
| --- | --- | --- | --- |
| Comparar 2 grupos | Categórica | Qui-quadrado | Fisher (amostras pequenas) |
| Comparar 2 grupos | Numérica | Teste t de Student | Mann-Whitney |
| Comparar 3+ grupos | Numérica | ANOVA | Kruskal-Wallis |
| Antes e Depois (2) | Numérica | Teste t pareado | Wilcoxon |

![Figura 2 - Diagrama boxplot e curva de densidade: ferramentas para análise paramétrica e não-paramétrica](assets/imagem-002-343a05e9c163.png)

*Figura 2 - Correlação de Pearson (r) mede associação linear entre duas variáveis quantitativas (-1 a +1). Regressão logística é usada para desfechos categóricos (ex: morte sim/não). A curva ROC avalia a acurácia global de testes diagnósticos (AUC: 0,5 = acaso, 1,0 = perfeito). Fonte: National Cancer Institute, Domínio Público | Wikimedia Commons*

## Correlação e Regressão: Analisando a Relação entre Variáveis

Às vezes não queremos comparar grupos, mas sim entender como uma variável se comporta em relação a outra.

### Coeficiente de Correlação de Pearson (r)

Usado para verificar a relação linear entre duas variáveis quantitativas contínuas. O valor de "r" varia de -1 a +1.

- r = +1: Correlação positiva perfeita (se uma aumenta, a outra aumenta na mesma proporção).

- r = -1: Correlação negativa (inversa) perfeita (se uma aumenta, a outra diminui).

- r = 0: Não há correlação linear.

Exemplo de prova: Um coeficiente de Pearson de -0,534 com p < 0,05 indica uma correlação inversa significativa. Se você vir um gráfico de dispersão com pontos decrescendo da esquerda para a direita, a correlação é negativa.

### Regressão Linear e Logística

A regressão serve para criar um modelo matemático que prevê o valor de uma variável baseada em outra(s).

- Regressão Linear: A variável dependente (o desfecho) é quantitativa (ex: prever o peso baseado na altura).

- Regressão Logística: A variável dependente é categórica dicotômica (ex: prever se o paciente terá alta ou óbito baseado em várias variáveis).

A análise multivariada (como a regressão logística múltipla) é fundamental para controlar vieses de confusão. Ela permite avaliar a influência de um fator de risco isolando a influência de outras variáveis.

## Análise de Sobrevida

Em oncologia ou estudos de doenças crônicas como a Covid-19 longa, o tempo até um evento ocorrer é o dado mais importante.

- Curva de Kaplan-Meier: Um gráfico que mostra a proporção de indivíduos que sobrevivem ao longo do tempo.

- Teste de Log-Rank: Usado para comparar duas ou mais curvas de sobrevida e ver se há diferença estatística entre elas.

- Modelo de Cox (Regressão de Cox): É a análise multivariada da sobrevida. Ela permite avaliar o risco (Hazard Ratio) controlando por outras variáveis.

## Acurácia de Testes Diagnósticos

Este é o tema que mais cai. Você precisa saber montar a tabela 2x2 e calcular os índices.

### Sensibilidade e Especificidade

A Sensibilidade é a capacidade do teste de identificar os verdadeiros doentes entre todos os doentes.
Fórmula: VP / (VP + FN).
Um teste muito sensível é ótimo para triagem (screening), pois ele dá poucos falsos negativos. Se o teste é sensível e deu negativo, você pode praticamente excluir a doença.

A Especificidade é a capacidade do teste de identificar os verdadeiros sadios entre todos os sadios.
Fórmula: VN / (VN + FP).
Um teste muito específico é ótimo para confirmar o diagnóstico, pois ele dá poucos falsos positivos. Se o teste é específico e deu positivo, você confirma a doença.

### Valores Preditivos (VPP e VPN)

Diferente da sensibilidade e especificidade, que são características intrínsecas do teste, os valores preditivos dependem da prevalência da doença na população testada.

- Valor Preditivo Positivo (VPP): Probabilidade de o paciente estar doente dado que o teste veio positivo. Fórmula: VP / (VP + FP).

- Valor Preditivo Negativo (VPN): Probabilidade de o paciente estar saudável dado que o teste veio negativo. Fórmula: VN / (VN + FN).

Regra de ouro: Se a prevalência da doença aumenta na população, o VPP aumenta e o VPN diminui. Se a prevalência diminui, o VPP cai e o VPN sobe.

### Acurácia e Curva ROC

A Acurácia mede a proporção de resultados corretos (verdadeiros positivos e verdadeiros negativos) sobre o total de testes realizados.
Fórmula: (VP + VN) / Total.

A Curva ROC é a representação gráfica da Sensibilidade (eixo Y) versus 1 - Especificidade (eixo X).
Quanto maior a área sob a curva (AUC), mais acurado é o teste. Um teste perfeito teria uma AUC de 1,0. Uma AUC de 0,5 (linha diagonal) significa que o teste é tão bom quanto jogar uma moeda para o alto (puro acaso).

## Medidas de Associação em Estudos Epidemiológicos

A escolha da medida de associação depende do desenho do estudo. Como o Dr. Will sempre reforça, o desenho do estudo é o que define a força da evidência.

### Risco Relativo (RR)

Usado em estudos de Coorte e Ensaios Clínicos Aleatorizados. Ele compara a incidência nos expostos com a incidência nos não expostos.
Fórmula: Incidência nos expostos / Incidência nos não expostos.
RR > 1: Fator de risco.
RR < 1: Fator de proteção.

### Odds Ratio (OR) - Razão de Chances

Usado principalmente em estudos de Caso-Controle, mas também pode ser usado em estudos transversais. Como no caso-controle não temos a incidência real (pois partimos do desfecho), usamos a razão de chances.
Fórmula simplificada na tabela 2x2: (a * d) / (b * c).
Em um estudo caso-controle, o OR compara a chance de exposição entre os casos (doentes) e a chance de exposição entre os controles (não doentes).

### Razão de Prevalência (RP)

Usada em estudos transversais. É a prevalência do desfecho nos expostos dividida pela prevalência nos não expostos. Indica a força da relação entre exposição e desfecho naquele momento específico.

### Medidas de Impacto (RRA, NNT e RA)

- Redução do Risco Absoluto (RRA): É a diferença aritmética entre o risco do grupo controle e o risco do grupo intervenção. RRA = Risco Controle - Risco Intervenção.

- NNT (Número Necessário para Tratar): É o inverso da RRA (1 / RRA). Indica quantos pacientes precisam ser tratados para evitar um desfecho negativo. Quanto menor o NNT, melhor a intervenção.

- Risco Atribuível (RA): É o excesso de casos na população exposta que pode ser atribuído exclusivamente àquela exposição. RA = Incidência nos expostos - Incidência nos não expostos.

| Estudo | Medida de Associação | Lógica |
| --- | --- | --- |
| Coorte / Ensaio Clínico | Risco Relativo (RR) | Compara incidências (novos casos) |
| Caso-Controle | Odds Ratio (OR) | Compara chances de exposição prévia |
| Transversal | Razão de Prevalência (RP) | Compara prevalências no momento |
| Ecológico | Coeficiente de Correlação | Compara agregados populacionais |

## Desenhos de Estudo: Onde a Estatística se Aplica

A estatística não existe no vácuo; ela depende do desenho epidemiológico.

- Estudo de Coorte: Parte da exposição e segue os pacientes para ver quem adoece. É excelente para determinar incidência e risco relativo. É caro e longo.

- Estudo Caso-Controle: Parte do desfecho (quem já está doente) e olha para o passado em busca da exposição. É rápido, barato e bom para doenças raras. A medida é o Odds Ratio.

- Estudo Transversal: Exposição e desfecho são avaliados ao mesmo tempo. É como uma fotografia. Bom para prevalência, mas ruim para inferência causal (não sabemos o que veio antes).

- Estudo Ecológico: A unidade de análise não é o indivíduo, mas grupos (cidades, países). Cuidado com a "falácia ecológica": o que é verdade para o grupo pode não ser para o indivíduo.

- Ensaio Clínico Aleatorizado: O padrão-ouro para intervenções. A aleatorização (randomização) serve para equilibrar variáveis de confusão conhecidas e desconhecidas entre os grupos.

## Padronização de Taxas

Muitas vezes queremos comparar a mortalidade entre duas cidades, mas uma cidade tem muito mais idosos que a outra. Se não ajustarmos, a cidade mais velha sempre parecerá "pior".
A padronização (direta ou indireta) ajusta as taxas específicas para permitir a comparação entre grupos com diferentes estruturas demográficas. Isso remove o efeito da idade ou de outras variáveis na comparação bruta.

## Erros Comuns e Pegadinhas de Prova

Um erro clássico é confundir amostras independentes com amostras pareadas. Se o examinador disser que mediu a pressão de 50 pessoas, deu um remédio e mediu as mesmas 50 pessoas depois, isso é pareado (Teste t pareado). Se ele mediu 50 pessoas do grupo A e 50 pessoas diferentes do grupo B, isso é independente (Teste t de Student).

Outra pegadinha frequente envolve o VPP e a prevalência. A banca vai dizer que um teste tem sensibilidade de 99% e perguntar se o VPP será alto em uma população onde a doença é raríssima. A resposta é não. Mesmo com alta sensibilidade, se a doença é rara, a maioria dos positivos será falso-positivo, derrubando o VPP.

Lembre-se também da diferença entre significância estatística e significância clínica. Um estudo pode encontrar um p < 0,05 para uma redução de 1 mmHg na pressão arterial. Isso é estatisticamente significante? Sim. Isso muda a vida do paciente? Provavelmente não. Isso é falta de significância clínica.

## Pontos-Chave para Prova

- P-valor < 0,05: Rejeita a hipótese nula (H0). A diferença provavelmente não é por acaso.

- Teste t de Student: Compara médias de 2 grupos (dados paramétricos/normais).

- ANOVA: Compara médias de 3 ou mais grupos independentes.

- Qui-quadrado (χ²): Avalia associação entre variáveis categóricas (proporções).

- Teste Exato de Fisher: Usado no lugar do Qui-quadrado se a amostra for pequena (células < 5).

- Coeficiente de Pearson (r): Mede a relação linear entre duas variáveis contínuas (-1 a +1).

- Sensibilidade: Capacidade de detectar doentes (VP / VP+FN). Útil para triagem.

- Especificidade: Capacidade de detectar sadios (VN / VN+FP). Útil para confirmar.

- VPP: Depende da prevalência. Se a prevalência sobe, o VPP sobe.

- Risco Relativo (RR): Medida de associação típica da Coorte e Ensaio Clínico.

- Odds Ratio (OR): Medida de associação típica do Caso-Controle (a*d / b*c).

- NNT: 1 / Redução do Risco Absoluto. Quanto menor, melhor a intervenção.

- Erro Tipo I (Alfa): Dizer que há diferença quando não há (Falso Positivo).

- Erro Tipo II (Beta): Dizer que não há diferença quando ela existe (Falso Negativo).

- Curva ROC: Avalia a acurácia. Quanto maior a área sob a curva, melhor o teste.

- Análise Multivariada: Serve para controlar fatores de confusão.

- Valor Esperado (Qui-quadrado): (Total linha x Total coluna) / Total geral. 💡

 Cópia offline para consulta pessoal.
 Fonte original:
 [https://www.medevo.com.br/material-apoio/ler/41923a93-8844-4b9c-9623-95c0ff693631](https://www.medevo.com.br/material-apoio/ler/41923a93-8844-4b9c-9623-95c0ff693631)
