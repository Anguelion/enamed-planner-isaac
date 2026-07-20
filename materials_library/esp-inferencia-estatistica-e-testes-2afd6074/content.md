# INFERÊNCIA ESTATÍSTICA E TESTES

A estatística na medicina não serve para torturar alunos, embora pareça. Ela existe porque, na prática clínica, lidamos com a incerteza. Quando você prescreve uma estatina, você não tem 100% de certeza de que aquele paciente específico não terá um infarto; você trabalha com probabilidades baseadas em estudos. A inferência estatística é a ponte que nos permite olhar para um grupo pequeno de pessoas (amostra) e dizer algo sobre toda a população.

![Figura 1 - Curva normal com desvios-padrão: regra 68-95-99,7%](assets/imagem-001-168085eb5a8a.png)

*Figura 1 - O teste de hipóteses compara H0 (não há diferença) vs. H1 (há diferença). Erro tipo I (α): rejeitar H0 quando verdadeira (falso positivo). Erro tipo II (β): não rejeitar H0 quando falsa (falso negativo). Poder = 1 - β. Valor p < 0,05 → rejeita H0. Fonte: Domínio Público | Wikimedia Commons*

## O Coração da Inferência: População vs. Amostra

Imagine que queremos saber se uma nova medicação reduz a pressão arterial em brasileiros hipertensos. Não podemos testar em todos os milhões de hipertensos do Brasil. Por isso, selecionamos uma amostra.

O problema é que a amostra nunca é um espelho perfeito da população. Existe o que chamamos de erro amostral ou variação aleatória. A inferência estatística é justamente o conjunto de técnicas que usamos para saber se a diferença que vimos na amostra (ex: a pressão caiu 10 mmHg) aconteceu por "sorte" (acaso) ou se o remédio realmente funciona.

Como o Dr. Will sempre reforça nas discussões da MedEvo, o segredo aqui é entender que nunca teremos a "Verdade Absoluta", mas sim uma estimativa com um grau de confiança.

## Teste de Hipóteses: O Tribunal da Estatística

Para decidir se um resultado é real, a estatística usa um raciocínio jurídico. Todo estudo começa com a Hipótese Nula (H0).

### Hipótese Nula (H0) vs. Hipótese Alternativa (H1)

A Hipótese Nula (H0) é a hipótese do "nada acontece". Ela afirma que não há diferença entre os grupos, não há associação ou o medicamento não funciona. Por exemplo: "A droga A é igual ao placebo".

A Hipótese Alternativa (H1) é o que o pesquisador quer provar: "A droga A é melhor que o placebo".

Na estatística, nós não "provamos" que H1 é verdadeira. Nós tentamos acumular evidências contra H0. Se as evidências forem fortes o suficiente, nós "rejeitamos H0". Se forem fracas, "falhamos em rejeitar H0".

### Os Erros de Julgamento (Tipo I e Tipo II)

Como em qualquer julgamento, podemos cometer erros. As bancas de residência amam cobrar isso, e o segredo é memorizar a tabela de contingência dos erros.

| Realidade (Verdade) | Decisão do Teste: Rejeitar H0 | Decisão do Teste: Não Rejeitar H0 |
| --- | --- | --- |
| **H0 é Verdadeira** (Sem efeito) | **Erro Tipo I (Alfa)** | Decisão Correta |
| **H0 é Falsa** (Existe efeito) | Decisão Correta (Poder) | **Erro Tipo II (Beta)** |

**Erro Tipo I (Alfa):** É o falso positivo da estatística. É quando você diz que o remédio funciona, mas na verdade ele não faz nada. Você rejeitou uma H0 que era verdadeira. O nível de significância (geralmente 5% ou 0,05) é o risco máximo que aceitamos de cometer esse erro.

**Erro Tipo II (Beta):** É o falso negativo. O remédio funciona, mas o seu estudo foi pequeno ou mal desenhado e você não conseguiu provar isso. Você não rejeitou uma H0 que era falsa.

**Poder Estatístico (1 - Beta):** É a capacidade do estudo de detectar uma diferença quando ela realmente existe. Se um estudo tem poder de 80%, significa que, se o remédio funcionar, ele tem 80% de chance de encontrar um p < 0,05.

**Dica de Prova:** Se um estudo deu "negativo" (p > 0,05), mas a amostra era muito pequena, o erro provavelmente foi o Tipo II por baixo poder estatístico. Aumentar a amostra aumenta o poder.

## O Valor P e o Intervalo de Confiança

Estes são os dois indicadores que você verá em quase todas as questões de interpretação de artigos.

### O Valor P (p-value)

O valor p é a probabilidade de os resultados observados (ou algo mais extremo) terem ocorrido puramente por acaso, assumindo que a Hipótese Nula é verdadeira.

Se p < 0,05 (5%), dizemos que o resultado é "estatisticamente significativo". Isso significa que a chance de ser apenas sorte é menor que 5%.
Se p > 0,05, não podemos descartar o acaso.

**Cuidado:** O valor p não mede a magnitude do efeito. Um p = 0,0001 não significa que o remédio é "muito potente", apenas que é "muito improvável que seja acaso".

### Intervalo de Confiança (IC 95%)

O IC 95% é muito mais informativo que o valor p. Ele nos dá uma faixa de valores onde a verdadeira média da população provavelmente está.

A regra de ouro para provas:

- Se o estudo usa uma medida de razão (Risco Relativo, Odds Ratio, Hazard Ratio), o IC 95% **não pode incluir o número 1**. Se incluir o 1 (ex: IC 95% 0,8 a 1,2), o resultado não é significativo. Por que? Porque 1 significa que o risco é igual nos dois grupos.

- Se o estudo usa uma medida de diferença (ex: diferença de médias de pressão arterial), o IC 95% **não pode incluir o número 0**.

**Pérola Clínica:** Quanto mais estreito o IC, maior a precisão do estudo e, geralmente, maior o tamanho da amostra. No Forest Plot da metanálise, o estudo com o IC mais estreito é o que tem mais "peso".

![Figura 2 - Funções de densidade de probabilidade: visualização dos diferentes parâmetros em testes estatísticos](assets/imagem-002-f3e7ded74af7.png)

*Figura 2 - Risco Relativo (RR) é usado em coortes; Odds Ratio (OR) em caso-controle. Se RR ou OR = 1 (ou IC95% cruza 1) → sem associação. NNT = 1/RAR (redução absoluta de risco). IC95% com valor p: se IC não inclui o valor nulo, p < 0,05. Fonte: National Cancer Institute, Domínio Público | Wikimedia Commons*

## Medidas de Associação e Risco

Para entender a inferência, precisamos saber o que estamos medindo. As bancas adoram trocar esses conceitos.

### Risco Relativo (RR) e Odds Ratio (OR)

O **Risco Relativo** é a razão entre a incidência no grupo exposto e a incidência no grupo não exposto. É usado em estudos de Coorte e Ensaios Clínicos (estudos prospectivos).

A **Odds Ratio (Razão de Chances)** é a razão entre a chance de exposição nos casos e a chance de exposição nos controles. É a medida de escolha para estudos de Caso-Controle.

**Dica de Prova:** Em doenças raras, o OR se aproxima muito do RR. Se a questão te der um estudo transversal, a medida correta é a Razão de Prevalência (RP).

### Medidas de Impacto (RAR, RRR e NNT)

Aqui é onde a maioria dos alunos erra por falta de atenção aos cálculos simples. Vamos usar um exemplo:

- Risco de infarto no grupo Placebo (Rc): 10% (0,10)

- Risco de infarto no grupo Droga (Rt): 5% (0,05)

-

**Redução Absoluta do Risco (RAR):** É a diferença simples.
RAR = Rc - Rt = 10% - 5% = 5% (ou 0,05).
Isso diz o quanto o risco caiu em termos absolutos na população.

-

**Redução do Risco Relativo (RRR):** É a eficácia do remédio.
RRR = (Rc - Rt) / Rc = (10 - 5) / 10 = 50%.
O remédio reduziu o risco em 50% em relação ao que era antes.

-

**Número Necessário para Tratar (NNT):** É a medida mais clínica de todas.
NNT = 1 / RAR. No nosso exemplo: 1 / 0,05 = 20.
Significa que preciso tratar 20 pessoas para evitar 1 evento (infarto).

**Regra de Ouro:** Quanto menor o NNT, melhor a intervenção. Se o NNT de uma droga é 10 e de outra é 100, a de 10 é muito mais eficiente.

## Testes Diagnósticos e Probabilidade

A inferência também se aplica a exames. Quando você pede uma troponina, você está fazendo uma inferência sobre a presença de infarto.

### Sensibilidade e Especificidade

- **Sensibilidade:** Capacidade do teste de ser positivo nos doentes. VP / (VP + FN). Testes muito sensíveis são ótimos para triagem (screening), pois um resultado negativo exclui a doença (SNOUT).

- **Especificidade:** Capacidade do teste de ser negativo nos saudáveis. VN / (VN + FP). Testes muito específicos são ótimos para confirmar a doença, pois um resultado positivo raramente é falso (SPIN).

### Valores Preditivos (VPP e VPN)

Diferente da sensibilidade, os valores preditivos dependem da **prevalência** da doença na população.

- Se a prevalência aumenta: O VPP aumenta e o VPN diminui.

- Se a prevalência diminui: O VPP diminui e o VPN aumenta.

Isso explica por que testar HIV em uma população de baixo risco gera muitos alarmes falsos (falsos positivos).

| Teste | Doente | Saudável | Total |
| --- | --- | --- | --- |
| **Positivo** | Verdadeiro Positivo (VP) | Falso Positivo (FP) | Total Positivos |
| **Negativo** | Falso Negativo (FN) | Verdadeiro Negativo (VN) | Total Negativos |

**Acurácia:** É a proporção de acertos totais do teste. (VP + VN) / Total.

## Metanálise e o Forest Plot

A metanálise é o topo da pirâmide da evidência. Ela combina estatisticamente os resultados de vários ensaios clínicos.

### Como ler um Forest Plot

- **Linha Vertical (Linha de Identidade):** No 1 para RR/OR. Se o traço de um estudo cruza essa linha, ele sozinho não teve significância estatística.

- **Quadrados:** Representam o efeito pontual de cada estudo. O tamanho do quadrado é o peso do estudo (amostras maiores = quadrados maiores).

- **Linhas Horizontais:** Representam o IC 95% de cada estudo.

- **Diamante:** É o resultado combinado. A largura do diamante é o IC 95% da metanálise. Se o diamante não toca a linha vertical, a metanálise é significativa.

### Heterogeneidade

Nem sempre podemos somar alhos com bugalhos. O teste de heterogeneidade (como o I²) avalia se os estudos são parecidos o suficiente para serem combinados.

- I² > 50%: Alta heterogeneidade. Os resultados devem ser interpretados com cautela.

- P < 0,10 no teste Q de Cochran também indica heterogeneidade.

Se houver muita heterogeneidade, o pesquisador deve usar um modelo de "efeitos aleatórios" em vez de "efeitos fixos".

## Causalidade: Além da Associação Estatística

Um erro clássico é achar que, porque p < 0,05, uma coisa causa a outra. Correlação não é causalidade. Para dizer que X causa Y, usamos os **Critérios de Hill**:

- **Temporalidade:** A causa deve vir antes do efeito (único critério obrigatório).

- **Força de Associação:** RR ou OR elevados.

- **Dose-Resposta:** Quanto mais exposição, mais doença.

- **Consistência:** Outros estudos acharam a mesma coisa.

- **Plausibilidade Biológica:** Faz sentido conforme a fisiologia.

- **Coerência:** Não contradiz o conhecimento atual.

- **Evidência Experimental:** Ensaios clínicos confirmam.

- **Analogia:** Situações semelhantes têm efeitos parecidos.

- **Especificidade:** Uma causa gera um efeito específico (critério fraco hoje em dia).

## Escolhendo o Teste Estatístico Correto

As bancas adoram perguntar qual teste usar. A escolha depende do tipo de variável:

-

**Variáveis Categóricas (Nominais/Proporções):** Ex: Vivo/Morto, Curado/Não curado.

- Teste de **Qui-quadrado**: Para comparar proporções entre dois ou mais grupos independentes.

- Teste Exato de Fisher: Usado quando a amostra é muito pequena (frequência esperada < 5).

-

**Variáveis Numéricas (Contínuas):** Ex: Pressão arterial, peso, glicemia.

- **Teste t de Student**: Para comparar as médias de dois grupos (ex: Droga vs. Placebo).

- **ANOVA**: Para comparar as médias de três ou mais grupos.

-

**Análise de Sobrevida:** Quando o desfecho é o "tempo até o evento".

- Curva de Kaplan-Meier: Visualização gráfica.

- Teste de Log-rank: Compara as curvas de sobrevivência.

- Regressão de Cox (Hazard Ratio): Avalia o risco ao longo do tempo ajustando para outras variáveis.

**Análise Multivariada:** Serve para ajustar fatores de confusão. Se um estudo diz que beber café causa câncer, mas depois de ajustar para "tabagismo" o efeito desaparece, o café era apenas uma variável de confusão.

## Pontos-Chave para Prova

- **Erro Tipo I (Alfa):** Rejeitar H0 verdadeira. É o Falso Positivo da pesquisa. O limite usual é 5%.

- **Erro Tipo II (Beta):** Não rejeitar H0 falsa. É o Falso Negativo da pesquisa.

- **Poder Estatístico (1 - Beta):** Capacidade de detectar diferença real. Aumenta com o tamanho da amostra.

- **Valor P < 0,05:** Indica significância estatística, mas não garante relevância clínica.

- **IC 95%:** Se for Risco Relativo ou Odds Ratio, não pode cruzar o 1. Se cruzar, o p é > 0,05.

- **NNT (Número Necessário para Tratar):** 1 / Redução Absoluta do Risco (RAR). Memorize: RAR é a diferença decimal (ex: 0,10 - 0,05 = 0,05).

- **Sensibilidade:** VP / (VP + FN). Alta sensibilidade = poucos Falsos Negativos. Ideal para triagem.

- **Especificidade:** VN / (VN + FP). Alta especificidade = poucos Falsos Positivos. Ideal para confirmar.

- **VPP e VPN:** Dependem da prevalência. Se a prevalência sobe, o VPP sobe.

- **Forest Plot:** O diamante representa o resultado final. Se ele não toca a linha do 1, a metanálise é favorável ou desfavorável com significância.

- **Heterogeneidade (I²):** Se > 50%, os estudos são muito diferentes entre si.

- **Viés de Publicação:** Avaliado pelo Funnel Plot (Gráfico de Funil). Se o funil for assimétrico, há suspeita de que estudos negativos não foram publicados.

- **Hazard Ratio (HR):** Medida de risco em análise de sobrevida que considera o tempo até o evento.

- **Regressão Multivariada:** Técnica para isolar o efeito de uma variável, limpando os fatores de confusão.

- **Critério de Hill mais importante:** Temporalidade (a exposição deve preceder o desfecho).

- **Teste de Qui-quadrado:** Rei das provas para comparar proporções (ex: % de curados no grupo A vs % no grupo B).

- **O que NÃO fazer:** Nunca diga que um p = 0,06 é "quase significativo". Ou é menor que 0,05 ou não é. Na prova, p > 0,05 significa aceitar a Hipótese Nula. 📊

 Cópia offline para consulta pessoal.
 Fonte original:
 [https://www.medevo.com.br/material-apoio/ler/2afd6074-6200-4638-85c7-d5596aedccb6](https://www.medevo.com.br/material-apoio/ler/2afd6074-6200-4638-85c7-d5596aedccb6)
