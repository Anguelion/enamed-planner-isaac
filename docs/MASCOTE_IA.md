# Mascote tutor com Gemini

O chat visual chama a Edge Function `mascote-ia`. Somente a função acessa a chave do Gemini.

## Ativação no Supabase

1. No painel do projeto, abra **Edge Functions > Secrets**.
2. Cadastre `GEMINI_API_KEY` com a chave criada no Google AI Studio.
3. Opcionalmente, cadastre `GEMINI_MODEL`; o padrão é `gemini-3.6-flash`.
4. Publique a pasta `supabase/functions/mascote-ia` como uma Edge Function chamada `mascote-ia`, mantendo a verificação de JWT ativada.
5. Teste pelo aplicativo já autenticado. A função rejeita origens desconhecidas e sessões inválidas.

Se o endereço de produção mudar, configure `ALLOWED_ORIGINS` como uma lista separada por vírgulas ou atualize `DEFAULT_ALLOWED_ORIGINS` na função.

Nunca coloque `GEMINI_API_KEY` no `index.html`, nos arquivos de `assets` ou no repositório.

## Recursos pedagógicos

O painel oferece modos Tutor, Socrático, Preceptor, OSCE, Caso clínico, Active recall, Comparação, Red flags e Prova. O aluno também escolhe o nível de dificuldade e quanto o tutor pode revelar: somente perguntas, pistas pequenas ou progressivas, explicação parcial ou resposta completa.

Depois das interações, a autoavaliação registra acerto/erro e confiança. Erros com alta confiança recebem revisão prioritária. A fila local usa intervalos de 1, 3, 7, 14 e 30 dias. Para sincronizar perfil e revisões entre aparelhos, aplique a migration `supabase/migrations/20260802_ai_tutor_profile.sql`.

O perfil é pedagógico e baseado na autoavaliação do aluno; não representa validação clínica automática da resposta. Fontes e recomendações médicas ainda devem ser conferidas na versão vigente da diretriz citada.
