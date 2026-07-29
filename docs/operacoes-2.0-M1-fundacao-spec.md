# Operações 2.0 — Marco 1: Fundação (Agenda + Execução com SLA)

**Data:** 2026-07-16 · **Projeto:** GrauOS Operações 2.0 (evolução dos checklists para plataforma
de gestão operacional multiunidade). Este spec cobre **apenas o Marco 1**.

## Decisões (2026-07-16)

1. **Evoluir dentro de `stock/checklists`** — mantém prefixo `inventory_` nas tabelas e as rotas
   sob `/admin/stock/checklists/*`. **Não recriar** o cadastro atual (`inventory_checklists` /
   `inventory_checklist_items`).
2. **Setores e turnos entram no M1** (tabelas `sectors` e `shifts`).
3. **Alertas via UazAPI** (edge `whatsapp-notification` + config por franqueado) — usado no M4.
4. **IA via Claude** (edge function) — usado no M5.

## Roadmap (contexto — só o M1 é escopo agora)

| Marco | Entrega | Fases spec |
|---|---|---|
| **M1** | Setores/turnos + agenda (rotinas → tarefas) + execução com **SLA/status** | 1 |
| M2 | Evidências (foto/GPS/comentário/assinatura) + novos tipos de item | 2, 3 |
| M3 | Painel do gestor + `operation_scores` + indicadores | 4, 5 |
| M4 | Rankings + Notification Engine (WhatsApp/UazAPI) | 6, 7 |
| M5 | IA (validação foto, comparação, fraude, resumo) | 8 |
| M6 | Rede (`/admin/network`) + app operador | 9, 10 |

---

## Escopo do M1

O checklist deixa de ser "formulário → resposta". Passa a ser uma **tarefa operacional agendada**,
com responsável, prazo, SLA e ciclo de status. M1 entrega:

1. **Organização:** cadastro de **setores** e **turnos** por unidade.
2. **Agenda (rotina → tarefa):** uma *rotina* define "que checklist, em que setor/turno, quem é o
   responsável, com que recorrência e horário". A partir dela, o sistema **materializa uma tarefa
   por ocorrência** (`inventory_checklist_schedules`).
3. **Execução com SLA:** iniciar/finalizar a tarefa registra tempos, calcula `delay_minutes` e um
   **score de SLA** (100/90/75/50/0), e move o **status** (PENDING → IN_PROGRESS →
   COMPLETED/LATE/MISSED/CANCELLED).

Fora do M1 (marcos seguintes): evidências obrigatórias, novos tipos de item, dashboard, score
consolidado, ranking, alertas e IA. As respostas de item no M1 reusam os tipos atuais
(boolean/number/text/photo) sem validações novas.

Princípio que M1 já começa a garantir — **quem / quando / onde**: cada tarefa carrega responsável,
setor, turno, unidade e carimbos de tempo. *Como / evidência / dentro do padrão* vêm nos marcos 2–3.

---

## Modelo de dados (novas tabelas)

> Todas com `store_id` e RLS `authenticated` (padrão do projeto). `sectors`/`shifts` são entidades
> organizacionais reutilizáveis; as demais mantêm o prefixo `inventory_checklist_`.

### `sectors` — setores da unidade
```
id            uuid pk
store_id      uuid → stores(id)
name          text            -- Cozinha, Salão, Caixa, Estoque...
is_active     boolean default true
created_at    timestamptz
```

### `shifts` — turnos da unidade
```
id            uuid pk
store_id      uuid → stores(id)
name          text            -- Manhã, Tarde, Noite
start_time    time
end_time      time
is_active     boolean default true
created_at    timestamptz
```

### `inventory_checklist_routines` — a "rotina" (recorrência que gera tarefas)
```
id                 uuid pk
store_id           uuid → stores(id)
checklist_id       uuid → inventory_checklists(id)
sector_id          uuid → sectors(id)        null
shift_id           uuid → shifts(id)         null
responsible_user_id uuid → auth.users(id)    null
recurrence_type    text   -- daily | weekly | monthly
weekdays           int[]  -- 0=Seg…6=Dom (para weekly)
scheduled_time     time   -- horário alvo (ex 08:00)
sla_grace_minutes  int default 0   -- tolerância antes de contar atraso
critical           boolean default false
is_active          boolean default true
created_at/updated_at timestamptz
```

### `inventory_checklist_schedules` — a **tarefa** (instância por ocorrência)
```
id                  uuid pk
routine_id          uuid → inventory_checklist_routines(id)  null (permite avulsa)
store_id            uuid → stores(id)
sector_id           uuid → sectors(id)        null
shift_id            uuid → shifts(id)         null
checklist_id        uuid → inventory_checklists(id)
responsible_user_id uuid → auth.users(id)     null
scheduled_date      date
scheduled_time      time
deadline_at         timestamptz   -- scheduled_date+time (+ grace)
critical            boolean
status              text  -- PENDING|IN_PROGRESS|COMPLETED|LATE|MISSED|CANCELLED
created_at/updated_at timestamptz
UNIQUE (routine_id, scheduled_date)   -- idempotência da geração
```

### `inventory_checklist_executions` — a execução da tarefa
```
id             uuid pk
schedule_id    uuid → inventory_checklist_schedules(id)
store_id       uuid → stores(id)
started_at     timestamptz
started_by     uuid → auth.users(id)
completed_at   timestamptz
completed_by   uuid → auth.users(id)
delay_minutes  int          -- completed_at − deadline_at (0 se no prazo)
sla_score      int          -- 100 | 90 | 75 | 50 | 0
notes          text
created_at     timestamptz
```

### `inventory_checklist_execution_items` — respostas por item
```
id             uuid pk
execution_id   uuid → inventory_checklist_executions(id)
item_id        uuid → inventory_checklist_items(id)
value_text     text
value_boolean  boolean
value_number   numeric
photo_url      text
created_at     timestamptz
```
(As colunas de valor espelham `inventory_checklist_values` atuais; em M2 ganham GPS, comentário,
assinatura e os novos tipos.)

---

## Regras de negócio

### Materialização da agenda (rotina → tarefas)
- Uma rotina ativa gera **uma** `schedule` por dia aplicável (`recurrence_type` + `weekdays`).
- **M1:** geração **sob demanda e idempotente** — ao abrir a Agenda de uma data, o sistema faz
  `upsert` das tarefas faltantes daquele dia (chave `routine_id + scheduled_date`). Um botão
  "Gerar agenda do dia" força a geração. *(Cron/edge diário fica preparado para M4.)*
- `deadline_at` = `scheduled_date` + `scheduled_time` + `sla_grace_minutes`.

### Ciclo de status
```
PENDING ──iniciar──▶ IN_PROGRESS ──finalizar──▶ COMPLETED (no prazo)
   │                                         └▶ LATE (após deadline)
   ├── passou do fim do turno/dia sem concluir ──▶ MISSED
   └── cancelada manualmente ──▶ CANCELLED
```
- **MISSED** é derivado: uma tarefa PENDING/IN_PROGRESS cujo `deadline_at` (ou fim do turno) já
  passou é exibida e marcada como MISSED (job idempotente na abertura da agenda; cron em M4).

### SLA
- Ao **finalizar**: `delay_minutes = max(0, minutos(completed_at − deadline_at))`.
- `sla_score`: `0` → 100 · `≤15` → 90 · `≤30` → 75 · `≤60` → 50 · não executada → 0.
- `status`: `delay_minutes = 0` → COMPLETED; `> 0` → LATE.

---

## Rotas & telas (sob `/admin/stock/checklists`)

| Rota | Papel | Tela |
|---|---|---|
| `/admin/stock/checklists/settings` | `manager` | Setores & Turnos (CRUD simples de `sectors`/`shifts`). |
| `/admin/stock/checklists/routines` | `manager` | Rotinas: cadastro da agenda (checklist + setor/turno + responsável + recorrência + horário + SLA + crítico). |
| `/admin/stock/checklists/agenda` | `staff` | Agenda do dia: tarefas por status (Agora / Futuras / Atrasadas / Concluídas), filtro por unidade/setor/turno/data. Botão "Gerar agenda do dia". |
| `/admin/stock/checklists/task/:scheduleId` | `staff` | Execução da tarefa: contador de tempo até o `deadline_at`, itens do checklist, iniciar/finalizar → grava execução + SLA. |

As telas atuais `/checklists/execution` e `/checklists/reports` permanecem (legado) até o dashboard
do M3 substituí-las; nada é removido no M1.

### Camada de código (padrão do projeto)
```
src/pages/admin/stock/operations/
    OpsSettingsPage.tsx        (setores & turnos)
    RoutinesPage.tsx           (rotinas / agenda-def)
    AgendaPage.tsx             (tarefas do dia)
    TaskExecutionPage.tsx      (execução + SLA)
src/hooks/operations/
    useSectors.ts  useShifts.ts  useRoutines.ts
    useAgenda.ts   (materialização + listagem)  useTaskExecution.ts
src/lib/operations/sla.ts      (cálculo delay/score/status — puro e testável)
supabase migration: ADD_OPERATIONS_M1.sql  (6 tabelas + RLS + índices)
Rotas em src/App.tsx sob /admin/stock/checklists
Menu no AdminLayout / stock DashboardPage
```

---

## Testes / verificação do M1
- `lib/operations/sla.ts`: unit test da tabela de SLA (0/15/30/60/não-executado) e do status.
- Fluxo ponta a ponta no app: criar setor+turno → criar rotina → gerar agenda do dia → iniciar e
  finalizar uma tarefa no prazo (COMPLETED/100) e outra atrasada (LATE/score reduzido) → conferir
  status e SLA persistidos.

## Fora de escopo (M1)
Evidências obrigatórias, novos tipos de item, dashboard/indicadores, `operation_scores`
consolidado, rankings, alertas WhatsApp, IA, `/admin/network`, app operador dedicado. Tudo isso
depende desta fundação e vem nos marcos seguintes.
