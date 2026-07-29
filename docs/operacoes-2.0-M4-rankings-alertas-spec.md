# Operações 2.0 — Marco 4: Rankings + Alertas WhatsApp

**Data:** 2026-07-16 · Fases 6 e 7 do produto. Depende de M1–M3.

## Parte A — Rankings (frontend, on-the-fly)

Reaproveita o score do M3 (`lib/operations/score.ts` + `useOperationsDashboard`, que já retorna
`bySector`/`byUser`). Página dedicada em `/admin/checkgrau/rankings`:
- **Ranking de Responsáveis** e **Ranking de Setores** com pódio + tabela.
- Colunas por linha: **Score · Conformidade · Pontualidade · Execuções**.
- Filtro de período. (Ranking de **unidades** = rede = M6.)

Sem nova tabela — cálculo ao vivo. `operation_scores`/`operation_rankings` materializados ficam
para quando a rede/histórico precisar (M6+).

## Parte B — Alertas WhatsApp (Notification Engine via UazAPI)

Reusa a infra existente: tabela `integrations` (`name='uazapi_whatsapp'`, `franchisee_id`,
`config.base_url`/`config.token`) e o envio `POST {base_url}/send/text` (header `token`,
body `{number,text}`).

### Banco (`ADD_OPERATIONS_M4.sql`)
```
operation_alert_settings
  id, store_id (unique), enabled bool,
  events jsonb,            -- {overdue, critical, out_of_standard}
  recipient_phone text,    -- número que recebe os alertas
  recipient_name text,
  created_at, updated_at

notification_logs
  id, store_id, event_type, schedule_id (null), phone, message,
  status,                  -- sent | failed | skipped
  error, sent_at, created_at
  UNIQUE (store_id, event_type, schedule_id)   -- dedupe
```

### Eventos detectáveis no M4 (sem IA)
- **overdue** — checklist não executado no prazo (status vira MISSED).
- **critical** — tarefa crítica MISSED ou com item reprovado.
- **out_of_standard** — item de temperatura/faixa reprovado (`passed=false`).
(Foto reprovada / item obrigatório não respondido dependem de IA/execução → M5.)

### Motor (edge function `operations-alerts`)
`Deno.serve` + service role. Para a(s) unidade(s) com alertas habilitados: varre as tarefas do dia,
deriva o status (MISSED), acha condições, **deduplica** por `notification_logs`, monta a mensagem
e envia pelo UazAPI do franqueado da loja; registra em `notification_logs`.
Deploy + agendamento (pg_cron / função agendada) ficam a cargo do usuário — segue o padrão de
`scheduled-campaigns-check`.

Mensagem:
```
🚨 ALERTA OPERACIONAL
Unidade: {loja}
Checklist: {checklist}
Responsável: {nome}
{detalhe: Atraso / Falha crítica / Temperatura fora do padrão}
```

### Frontend (`/admin/checkgrau/alertas`, manager)
Configura: habilitar, quais eventos, número destinatário. Botão **Enviar agora** (invoca a edge
function via `supabase.functions.invoke`) e **log** das notificações enviadas.

## Fora do M4
Materialização de scores/rankings, ranking de unidades (rede → M6), alertas por IA (foto/fraude →
M5), agendamento automático do cron (deploy do usuário).
