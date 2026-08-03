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
