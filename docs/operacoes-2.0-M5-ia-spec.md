# Operações 2.0 — Marco 5: IA Operacional

**Data:** 2026-07-16 · Fase 8 do produto. Depende de M1–M4.

## Decisão
**IA via Google Gemini** (reusa `GEMINI_API_KEY` e o padrão de visão já usado em `ocr-receipt`
— `gemini-flash-latest`, `generateContent` com `inlineData` base64). Sem novo provedor.

## Escopo (4 IAs)
1. **Validação de foto** — dado o item ("Bancada limpa") + a foto, a IA avalia limpeza/organização
   /conformidade e retorna `{ approved, score 0-100, reason }`. Inclui sinal leve de **fraude**
   (parece screenshot / imagem reutilizada/manipulada) → `fraud_suspected`.
2. **Comparação com referência** — item com `reference_image_url`: compara a foto enviada com a
   referência → `CONFORME` / `NÃO CONFORME` + motivo.
3. **Detecção de fraude** — no M5, heurística leve via visão (screenshot/manipulação) embutida na
   validação. Dedupe por hash/EXIF fica como evolução.
4. **Resumo gerencial diário** — agrega as métricas do dia (executados, atrasados, falhas críticas,
   itens fora do padrão) e a IA escreve um resumo curto para o gestor; pode ser enviado no WhatsApp.

## Banco (`ADD_OPERATIONS_M5.sql`)
```
ai_analysis
  id, store_id, type,            -- photo_validation | comparison | summary
  execution_item_id (null), schedule_id (null),
  approved boolean, score int, reason text,
  raw jsonb,                     -- resposta bruta da IA
  created_at
```
RLS `authenticated` (leitura/escrita; a edge function usa service role).

## Motor (edge function `operations-ai`)
`Deno.serve` + service role. Ações:
- `validate_photo { photo_url, item_name, execution_item_id? }` → busca a imagem, chama Gemini
  visão, faz parse do JSON, grava em `ai_analysis`, retorna `{approved, score, reason, fraud_suspected}`.
- `compare_reference { photo_url, reference_image_url, item_name }` → duas imagens → conforme/reason.
- `daily_summary { store_id, date, send_whatsapp? }` → agrega o dia, Gemini escreve o resumo; se
  `send_whatsapp`, envia pelo UazAPI do franqueado (reusa o padrão do M4).

Deploy pelo usuário: `supabase functions deploy operations-ai`.

## Frontend
- `hooks/operations/useAiAnalysis.ts` — `validatePhoto`, `compareReference`, `dailySummary`
  (via `functions.invoke`).
- **Execução** (`TaskItemField`): botão **Validar com IA** na foto → mostra veredito (aprovado/score
  + motivo); **Comparar com referência** quando o item tem `reference_image_url`.
- **Painel** (`OperationsDashboardPage`): botão **Resumo do dia (IA)** → diálogo com o resumo +
  opção de enviar no WhatsApp.

## Fora do M5
Fraude por hash/EXIF/pHash, treinamento/threshold configurável, IA na foto de forma automática no
upload (aqui é sob demanda). Rede/app operador = M6.
