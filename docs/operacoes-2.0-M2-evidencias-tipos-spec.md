# Operações 2.0 — Marco 2: Evidências + Novos tipos de item

**Data:** 2026-07-16 · Depende do **M1** (agenda/execução com SLA). Fases 2 e 3 do produto.

## Objetivo

Garantir os princípios que faltavam — **como / existe evidência / está dentro do padrão** — e
enriquecer os itens de checklist além de boolean/number/text/photo.

## Escopo

1. **Requisitos por item:** cada item pode exigir **foto**, **GPS**, **comentário** e/ou
   **assinatura**. A execução **bloqueia a finalização** enquanto um requisito obrigatório faltar.
2. **Evidências auditáveis:** foto enviada ao storage + **GPS** (lat/long/precisão) + carimbo de
   tempo + device, ligados ao item da execução (`checklist_evidences`).
3. **Novos tipos de item:** além de `boolean|number|text|photo` —
   `rating` (1–5), `temperature` (com limite), `range` (min/máx), `single_choice`, `multi_choice`,
   `qr`, `barcode`. Itens com faixa/limite têm **validação automática** (passou/não passou).

## Modelo de dados (`ADD_OPERATIONS_M2.sql`)

### Estende `inventory_checklist_items` (o template)
```
require_photo       boolean default false
require_gps         boolean default false
require_comment     boolean default false
require_signature   boolean default false
min_value           numeric        -- range / temperatura (mín)
max_value           numeric        -- range / temperatura (máx / limite)
options             jsonb          -- single_choice / multi_choice: ["Ótimo","Bom",...]
reference_image_url text           -- referência p/ comparação por IA (M5)
```
E amplia o CHECK de `type` para incluir os novos tipos.

### Estende `inventory_checklist_execution_items` (as respostas)
```
value_json   jsonb     -- multi_choice (array) / payload de qr-barcode
comment      text      -- comentário do item
signature    text      -- assinatura (nome digitado / dataURL) do item
passed       boolean   -- resultado da validação automática (temperatura/range)
```

### Nova `checklist_evidences` (evidências)
```
id                uuid pk
execution_item_id uuid → inventory_checklist_execution_items(id) on delete cascade
photo_url         text
latitude          numeric
longitude         numeric
accuracy          numeric
captured_at       timestamptz
device_info       text
created_at        timestamptz
```
RLS `authenticated`. Bucket de storage **`operations_evidence`** (leitura pública, escrita
autenticada), pasta por execução.

## Regras

- **Bloqueio de finalização:** se `require_photo` e não houver evidência com `photo_url` → não
  finaliza; idem `require_gps` (lat/long), `require_comment` (comentário), `require_signature`.
- **Validação automática (`passed`):**
  - `temperature`: aprovado se `value_number <= max_value` (limite) e, havendo `min_value`,
    `>= min_value`.
  - `range`: aprovado se `min_value <= value_number <= max_value`.
  - demais tipos: `passed = null` (não se aplica) ou `true`.

## Frontend

```
src/lib/operations/itemTypes.ts     catálogo de tipos + validação (puro, testável)
src/lib/operations/evidence.ts      upload de foto (bucket) + captura de GPS (reusa lib/platform/geolocation)
src/hooks/operations/useEvidence.ts  grava/lê checklist_evidences
```

- **Cadastro** — estende o editor de itens do `ChecklistAdminPage` (não recria): seletor com os
  novos tipos, campos de config (min/máx, opções, limite) e switches de requisito
  (foto/GPS/comentário/assinatura).
- **Execução** — `TaskExecutionPage` renderiza cada tipo (estrelas, temperatura com validação ao
  vivo, faixa, escolha única/múltipla, qr/código de barras via entrada), captura foto (upload) +
  GPS + comentário + assinatura conforme exigido, e só libera **Finalizar** com os requisitos ok.

## Fora do M2
- **Leitura por câmera** de QR/código de barras (entrada manual no M2; scanner de câmera depois).
- IA (comparação/validação de foto/fraude) — M5, mas `reference_image_url` já é gravado aqui.
- Score/dashboard/ranking — M3+.
