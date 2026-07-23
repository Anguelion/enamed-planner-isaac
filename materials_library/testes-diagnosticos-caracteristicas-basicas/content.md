# Testes Diagnósticos: Características Básicas

<!-- page:1 -->

## Testes Diagnósticos: Características Básicas

### Tabela 1: Tabela de Contingência na Avaliação de Testes

> ⚠️ Tabela reconstruída a partir de OCR — confira contra a fonte original.

| | Doença | Não Doença | Total |
|---|---|---|---|
| **Teste Positivo** | Verdadeiro Positivo (VP) | Falso Positivo (FP) | Total de Positivos (VP + FP) |
| **Teste Negativo** | Falso Negativo (FN) | Verdadeiro Negativo (VN) | Total de Negativos (FN + VN) |
| **Total** | Total de Doentes (VP + FN) | Total de Sadios (FP + VN) | Total Geral (VP+FN+FP+VN) |

### Tabela 2: Comparação entre Sensibilidade e Especificidade

> ⚠️ Tabela reconstruída a partir de OCR — confira contra a fonte original.

| | Alta Sensibilidade | Alta Especificidade |
|---|---|---|
| Característica | Detecta a maioria dos doentes | Descarta a maioria dos sadios (não doentes) |
| Confiabilidade | Teste negativo é muito confiável | Teste positivo é muito confiável |
| Uso | Bom para rastreamento | Bom para confirmar diagnóstico após um teste sensível |

### Tabela 3: Indicador, Definição e Fórmula — Testes Diagnósticos

> ⚠️ Tabela reconstruída a partir de OCR — confira contra a fonte original.

| Indicador | Definição | Fórmula |
|---|---|---|
| **Sensibilidade** | Capacidade do teste de identificar corretamente os doentes | VP / (FN + VP) |
| **Especificidade** | Capacidade do teste de identificar corretamente os não doentes | VN / (FP + VN) |
| **Valor Preditivo Positivo (VPP)** | Probabilidade do paciente realmente ter a doença se o teste for positivo | VP / (FP + VP) |
| **Valor Preditivo Negativo (VPN)** | Probabilidade do paciente realmente não ter a doença se o teste for negativo | VN / (FN + VN) |
| **Razão de Verossimilhança Positiva (RV+)** | Quanto um teste positivo aumenta a chance da doença | Sensibilidade / (1 - Especificidade) |
| **Razão de Verossimilhança Negativa (RV-)** | Quanto um teste negativo reduz a chance da doença | (1 - Sensibilidade) / Especificidade |
| **Acurácia** | Reflete a proporção de acertos do teste entre todos os resultados | (VP + VN) / Total |

- A acurácia está relacionada tanto à sensibilidade quanto à especificidade.

## Definição

- Testes diagnósticos são instrumentos utilizados para detectar ou excluir a presença de uma condição de saúde;
- Nenhum teste é perfeito: todos estão sujeitos a erros, como falsos positivos (indivíduos sem a doença com teste positivo) e falsos negativos (indivíduos com a doença com teste negativo);
- Na curva ROC, o teste com maior acurácia:
  - Tem a curva mais próxima do canto superior esquerdo;
  - Possui maior área sob a curva (AUC).
- A interpretação adequada exige correlação com o quadro clínico e com a prevalência da doença na população testada.

---

<!-- page:2 -->

### Tabela 4: Tabela de Contingência Resumida

| | Doença | Não Doença | |
|---|---|---|---|
| **Teste positivo** | VP | FP | P |
| **Teste negativo** | FN | VN | N |
| | Doentes | Sadios | Total |

À direita, nota-se o total de testes positivos (P) e o total de negativos (N), bem como o total da amostra.

## Classificação dos Testes Diagnósticos

Os testes podem ser classificados de algumas maneiras principais:

### De Acordo com a Finalidade Clínica

- **Rastreamento**: identificar precocemente uma doença em pessoas assintomáticas (sem sintomas), visando a detecção em estágios iniciais para melhor prognóstico (ex.: mamografia para câncer de mama);
- **Diagnóstico**: confirmar ou excluir a presença de uma doença em pessoas com suspeita (que apresentam sintomas ou sinais);
- **Avaliação de progressão/resposta ao tratamento**: monitorar a evolução de uma doença já diagnosticada ou verificar a eficácia de um tratamento instituído.

### De Acordo com o Tipo de Resultado Fornecido

- **Quantitativo**: apresentam resultados numéricos:
  - Dicotômicos: resultado "sim" ou "não", "positivo" ou "negativo" (ex.: teste rápido de gravidez);
  - Contínuos: resultados expressos em uma escala numérica contínua (ex.: níveis de glicose no sangue, espessura endometrial).
- **Qualitativos**: apresentam resultados descritivos que dependem da percepção humana (ex.: exames de imagem como radiografias, ultrassonografias).
  - Observação: mesmo testes qualitativos podem ser convertidos em resultados numéricos através de escores (ex.: classificação BI-RADS para mamografia, que atribui uma categoria numérica à imagem).

## Performance dos Testes Diagnósticos

- A performance de um teste é avaliada usando uma tabela de contingência 2x2, que compara a condição real do paciente com o resultado do teste;
- Verificar Tabela 4;
- Dessa forma, obtém-se o quadro 2x2 (tabela de contingência):
  - VP (verdadeiro positivo) para quem tem a doença e resultou positivo;
  - FN (falso negativo) para quem tem a doença e resultou negativo;
  - FP (falso positivo) para quem não tem doença e resultou positivo;
  - VN (verdadeiro negativo) para quem não tem a doença e de fato testou negativo.
- Ao somar os verdadeiros positivos e falsos negativos, tem-se o total de doentes. E ao somar os falsos positivos e verdadeiros negativos, tem-se o total de sadios.

## Indicadores de Performance

### Sensibilidade

- **Definição**: capacidade de identificar corretamente os doentes (probabilidade de positivo em doentes);
- **Fórmula**: (VP / (FN + VP)) × 100;
- **Valor clínico**: alta sensibilidade é ótima para descartar doenças (se negativo, exclui com confiança). Ideal para rastreamento. Não muda com a prevalência da doença na população.

### Especificidade

- **Definição**: capacidade de identificar corretamente os não doentes (probabilidade de negativo em não doentes);
- **Fórmula**: (VN / (FP + VN)) × 100;
- **Valor clínico**: alta especificidade é ótima para confirmar doenças (se positivo, confirma com confiança). Ideal para diagnóstico confirmatório. Não muda com a prevalência da doença na população.

### Valor Preditivo Positivo (VPP)

- **Definição**: probabilidade do paciente realmente ter a doença se o teste for positivo;
- **Fórmula**: (VP / (FP + VP)) × 100;
- **Valor clínico**: alta utilidade clínica pós-teste. Depende da prevalência da doença:
  - Alta prevalência: VPP aumenta (se o teste der positivo, a doença é mais provável);
  - Baixa prevalência: VPP diminui (mesmo um teste positivo pode ser um falso positivo).

### Valor Preditivo Negativo (VPN)

- **Definição**: probabilidade de não ter a doença se o teste for negativo;
- **Fórmula**: (VN / (FN + VN)) × 100;
- **Valor clínico**: alta utilidade clínica pós-teste. Depende da prevalência da doença:
  - Baixa prevalência: VPN aumenta (se der negativo, o exame tem mais chance de estar correto);
  - Alta prevalência: VPN diminui (um teste negativo pode não excluir bem a doença).

### Acurácia

- **Definição**: reflete a proporção de acertos do teste entre todos os resultados;
- **Fórmula**: Acurácia = (VP + VN) / Total;
- **Valor clínico**: usada principalmente para definir o ponto de corte ideal em testes contínuos, buscando o equilíbrio entre sensibilidade e especificidade (visualizada na curva ROC).

---

<!-- page:3 -->

### Razão de Verossimilhança Positiva (RV+)

- **Definição**: quanto um teste positivo aumenta a chance da doença;
- **Fórmula**: Sensibilidade / (1 - Especificidade);
- **Valor clínico**: RV+ > 10 indica forte evidência para confirmar. Não é influenciada pela prevalência.

### Razão de Verossimilhança Negativa (RV-)

- **Definição**: quanto um teste negativo reduz a chance da doença;
- **Fórmula**: (1 - Sensibilidade) / Especificidade;
- **Valor clínico**: RV- < 0,1 indica forte evidência para descartar. Não é influenciada pela prevalência.

## Aplicação Clínica dos Indicadores

- **Para rastreamento** (não perder doentes): priorize testes com alta sensibilidade. Um resultado negativo é confiável para afastar a doença;
- **Para confirmação** (ter certeza do diagnóstico): priorize testes com alta especificidade. Um resultado positivo é confiável para confirmar a doença;
- **Interpretação no contexto**: sempre considere a prevalência da doença na população do paciente ao interpretar VPP e VPN. As razões de verossimilhança (RV) são úteis para calcular a probabilidade pós-teste, oferecendo um raciocínio mais preciso para o caso individual.

## Estratégias de Aplicação de Testes Diagnósticos

A escolha entre testes múltiplos em paralelo ou em série é crucial na investigação diagnóstica, dependendo do objetivo clínico e do perfil do paciente.

### Testes em Paralelo

- Múltiplos testes são realizados simultaneamente;
- Um resultado final é considerado positivo se qualquer um dos testes for positivo;
- Um resultado final é considerado negativo apenas se todos os testes forem negativos;
- **Quando usar**:
  - Necessidade de uma abordagem rápida (ex.: pacientes graves em UTI);
  - Em ambiente ambulatorial com testes de baixo custo;
  - Com material obtido de procedimentos invasivos;
  - Quando há dois ou mais testes com baixa sensibilidade individual para o diagnóstico.
- **Impacto nos indicadores**:
  - Aumenta a sensibilidade do conjunto;
  - Aumenta o valor preditivo negativo (VPN);
  - Aumenta o número total de testes realizados por paciente;
  - Diminui a especificidade.

### Testes em Série (Sequenciais)

- Os testes são realizados sequencialmente, um após o outro, com o resultado do primeiro determinando a necessidade do próximo;
- **Quando usar**:
  - Quando alguns testes são de custo elevado ou possuem risco para o paciente;
  - Indicados apenas depois que outros testes já sugeriram a presença da doença (reduzindo a população a ser submetida aos testes mais caros/arriscados).
- **Impacto nos indicadores**:
  - Maximiza a especificidade do conjunto;
  - Maximiza o valor preditivo positivo (VPP), assegurando que um resultado positivo final represente a presença real da doença;
  - Diminui a sensibilidade e o valor preditivo negativo (VPN).

## Valor de Corte

Figura 1: Distribuição de indivíduos doentes e sadios — valor de corte para teste positivo, verdadeiros negativos, verdadeiros positivos, falsos negativos e falsos positivos.

![Figura do material - página 3](figure-003-1.webp)

---

<!-- page:4 -->

Figura 2: Distribuição de indivíduos doentes e sadios (saudável x doente, ponto de corte, falsos positivos, falsos negativos).

Um teste diagnóstico divide uma população em duas curvas:

- A curva vermelha representa pessoas que têm uma doença e a curva azul representa as pessoas sadias;
- O teste está configurado com um valor de corte no centro, separando pessoas com teste positivo e negativo;
- No lado azul, existem as pessoas com teste verdadeiramente negativo (não têm a doença e testaram negativo);
- No lado vermelho, existem as pessoas com doença e que testaram positivo;
- No entanto, existe uma sobreposição (taxa de erro desses testes) entre pessoas com e sem a doença; no lado direito, estão pessoas que não têm a doença, mas que testaram positivo (FP); no lado esquerdo, estão pessoas que têm a doença, mas que testaram negativo (FN);
- Verificar Figura 2.

- É possível realizar uma variação da linha de corte de um mesmo teste:
  - Para um teste X, a sensibilidade aumenta ao ponto que reduz a especificidade;
  - No teste Y, tem-se o mesmo parâmetro, porém de forma curva, aumentando a sensibilidade às custas de pouca redução de especificidade;
  - No teste Z, é possível crescer bastante a sensibilidade sem perder tanta especificidade.
- Dessa forma, observa-se que, ao aumentar um parâmetro, haverá uma diminuição do outro (não há teste 100% específico e sensível);
- No entanto, quanto mais próximo desses parâmetros, maior é a acurácia (alta sensibilidade e alta especificidade);
- Ao escolher um determinado teste, é possível calcular a área abaixo da curva, sendo que quanto maior a área ROC, maior será a acurácia;
- Logo, o teste Z é mais acurado do que o Y e, por sua vez, que o X.

Figura 3.

- Na primeira imagem, o ponto de corte foi tracionado para a esquerda, incluindo nos valores positivos a curva de pessoas doentes:
  - Isso faz com que aumente a sensibilidade;
  - A consequência disso é adicionar pessoas sadias, aumentando a taxa de falsos positivos.
- Na segunda imagem, o ponto de corte foi tracionado para a direita, tornando o teste mais específico:
  - Ou seja, todos que testaram positivo para a direita certamente têm a doença, porém com chance de ter deixado algumas pessoas com doença para o outro lado (falso negativo).

## Curva ROC (Receiver Operating Characteristic)

- Ao colocar os resultados do teste em um gráfico, tem-se a curva ROC (Receiver Operating Characteristic): no eixo das ordenadas, coloca-se os valores de sensibilidade e, nas abscissas, o complementar da especificidade.

Figura 3: Curva ROC.

![Figura do material - página 4](figure-004-1.webp)

![Figura do material - página 4](figure-004-2.webp)

---

<!-- page:5 -->

- A curva 3 distribui a população entre doentes e sadios quase de forma sobreposta, não havendo diferenciação mesmo com sensibilidade alta;
- Ao melhorar a acurácia, observa-se a curva 2, na qual há sobreposição de melhor qualidade;
- No teste de alta acurácia (curva 1), observa-se uma distribuição quase perfeita, sem sobreposição, não havendo falso positivo ou negativo.

Figura 4: Curva ROC e distribuição de indivíduos doentes e sadios.

## Razão de Verossimilhança (Likelihood Ratio – LR)

- A proporção de testes positivos entre doentes (verdadeiro positivo) e entre os sadios (falso positivo) é obtida observando a tabela 2x2;
- LR+ = (VP/doentes) / (FP/saudáveis);
- LR+ = Sensibilidade / (1 – Especificidade);
- Quantas vezes mais provável é de se encontrar um teste positivo em pessoas doentes do que em pessoas sadias.

Portanto, o Likelihood Ratio positivo é a razão entre as probabilidades de um teste ser positivo em uma população doente e em uma população saudável.

**Interpretação**:

- LR+ = 1: um resultado positivo não altera a probabilidade da doença;
- LR+ > 1: um resultado positivo aumenta a chance da doença. Quanto maior o valor, mais forte é a evidência para a presença da doença (ex.: LR+ de 10 significa que a chance de doença é 10 vezes maior após um resultado positivo);
- LR+ < 1: um resultado positivo diminui a chance da doença (situação rara para um teste positivo, indicaria um teste com performance muito pobre ou uma interpretação invertida).

![Figura do material - página 5](figure-005-1.webp)

---

<!-- page:6 -->

Figura 5: Razão de verossimilhança de achados semiológicos na pneumonia.

- LR- = (FN/doentes) / (VN/saudáveis);
- Quantas vezes mais provável encontrar um teste negativo em pessoas doentes do que em pessoas sadias.
- LR- = 1: um resultado negativo não altera a probabilidade da doença;
- LR- < 1: um resultado negativo diminui a chance da doença. Quanto menor o valor (mais próximo de zero), mais forte é a evidência para a ausência da doença (ex.: LR- de 0,1 significa que a chance de doença é reduzida em 10 vezes após um resultado negativo);
- LR- > 1: um resultado negativo aumenta a chance da doença (situação rara e indesejável para um teste diagnóstico).

- Verificar Figura 5;
- Os valores de razão de verossimilhança (LR) para pneumonia estão representados na régua acima;
- De 0 a 1 estão os valores negativos e após 1 estão os valores positivos;
- Características encontradas no exame físico e anamnese trazem valor de LR para o raciocínio clínico;
- Uma percussão maciça multiplica em 3x a probabilidade de a pessoa ter pneumonia;
- Já o Heckerling Score multiplica em 8, aumentando em 40% a probabilidade de a pessoa estar com pneumonia;
- Ou seja, quanto vão multiplicar a probabilidade de a pessoa ter pneumonia ou não:
- Verificar Tabela 5.

### Tabela 5: Probabilidades de Ter Pneumonia (Heckerling Score)

> ⚠️ Tabela reconstruída a partir de OCR — confira contra a fonte original.

**Sinais que compõem o escore** (1 ponto cada): temperatura > 37,8°C; FC > 100 bpm; crepitação; murmúrios vesiculares reduzidos; ausência de asma.

| Escore | LR | Probabilidade pós-teste (APS, pré-teste 5%) | Probabilidade pós-teste (Emergências, pré-teste 15%) |
|---|---|---|---|
| 0 | 0,12 | 1% | 2% |
| 1 | 0,2 | 1% | 3% |
| 2 | 0,7 | 4% | 11% |
| 3 | 1,6 | 8% | 22% |
| 4 | 7,2 | 27% | 56% |
| 5 | 17,0 | 47% | 75% |

![Figura do material - página 6](figure-006-1.webp)

---

<!-- page:7 -->

## Nomograma de Fagan

Figura 6: Nomograma de Fagan. O nomograma de Fagan é uma ferramenta gráfica baseada no Teorema de Bayes, utilizada para estimar a probabilidade pós-teste a partir da probabilidade pré-teste e da razão de verossimilhança (Likelihood Ratio – LR) do teste diagnóstico.

### Estrutura

- Eixo esquerdo: probabilidade pré-teste (prevalência estimada da doença);
- Eixo central: razão de verossimilhança (LR);
- Eixo direito: probabilidade pós-teste.

### Como Usar

- Traça-se uma linha reta da probabilidade pré-teste (à esquerda) passando pela LR (ao centro), interceptando a probabilidade pós-teste (à direita);
- A linha traduz o quanto o teste modifica a estimativa inicial.

### Interpretação Aplicada

- Um paciente com probabilidade pré-teste de 7% que realiza um teste com LR = 20 terá uma probabilidade pós-teste de cerca de 60%;
- Isso indica que o teste tem alto poder para aumentar a probabilidade da doença em caso de resultado positivo;
- Em contrapartida, um teste com LR = 1 não altera a probabilidade pré-teste, não sendo importante para o raciocínio.

## Referências

Figura 1: Distribuição de indivíduos doentes e sadios. Adaptado de POLO, Tatiana Cristina Figueira; MIOT, Hélio Amante. Aplicações da curva ROC em estudos clínicos e experimentais. Jornal Vascular Brasileiro, v. 19, p. e20200186, 2020.

Figura 2: Distribuição de indivíduos doentes e sadios. Adaptado de POLO, Tatiana Cristina Figueira; MIOT, Hélio Amante. Aplicações da curva ROC em estudos clínicos e experimentais. Jornal Vascular Brasileiro, v. 19, p. e20200186, 2020.

Figura 3: Curva ROC. Adaptado de POLO, Tatiana Cristina Figueira; MIOT, Hélio Amante. Aplicações da curva ROC em estudos clínicos e experimentais. Jornal Vascular Brasileiro, v. 19, p. e20200186, 2020.

Figura 4: Curva ROC e distribuição de indivíduos doentes e sadios. Adaptado de POLO, Tatiana Cristina Figueira; MIOT, Hélio Amante. Aplicações da curva ROC em estudos clínicos e experimentais. Jornal Vascular Brasileiro, v. 19, p. e20200186, 2020.

Figura 5: Razão de verossimilhança de achados semiológicos na pneumonia. MCGEE, Steven. Evidence-based physical diagnosis e-book. Elsevier Health Sciences, 2021.

Figura 6: Nomograma de Fagan. NSAWOTEBBA, Andrew et al. Effectiveness of thermal screening in detection of COVID-19 among truck drivers at Mutukula Land Point of Entry, Uganda. PloS one, v. 16, n. 5, p. e0251150, 2021.

Tabela 1: Tabela de contingência na avaliação de testes. Autoral. Adaptado de ROUQUAYROL, Maria Zélia; GURGEL, Marcelo. Rouquayrol: epidemiologia e saúde. Medbook, 2021.

Tabela 2: Comparação entre sensibilidade e especificidade. Autoral. Embasado em ROUQUAYROL, Maria Zélia; GURGEL, Marcelo. Rouquayrol: epidemiologia e saúde. Medbook, 2021.

Tabela 3: Indicador, definição e fórmula. Testes Diagnósticos. Autoral. Embasado em ROUQUAYROL, Maria Zélia; GURGEL, Marcelo. Rouquayrol: epidemiologia e saúde. Medbook, 2021.

Tabela 4: Tabela de Contingência Resumida. Autoral. Adaptado de ROUQUAYROL, Maria Zélia; GURGEL, Marcelo. Rouquayrol: epidemiologia e saúde. Medbook, 2021.

Tabela 5: Probabilidade de ter pneumonia. Adaptado de MCGEE, Steven. Evidence-based physical diagnosis e-book. Elsevier Health Sciences, 2021.

![Figura do material - página 7](figure-007-1.webp)
