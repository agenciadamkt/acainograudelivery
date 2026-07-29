# Operações 2.0 — Marco 6: Rede + App Operador

**Data:** 2026-07-16 · Fases 9 e 10 do produto. Fecha o roadmap. Depende de M1–M5.

## Parte A — Rede (comparação entre unidades)

Visão que compara **todas as unidades** — o gestor de rede vê quem está acima/abaixo do padrão.
Cálculo **on-the-fly** (reaproveita `score.ts`), agrupando por `store_id` em vez de por setor/usuário.

- **Hook** `useNetworkDashboard(period)` — busca as tarefas do período de todas as unidades (RLS
  aberta, como o resto do módulo) + a lista de lojas; computa métricas/score por unidade.
- **Página** `/admin/checkgrau/rede` (manager) — cards da rede (unidades, score médio, melhor/pior)
  + ranking de unidades com **Score · Conformidade · Pontualidade · Pendências · Falhas críticas**.
- Item **Rede** no menu do CheckGrau (grupo Gestão). Equivale ao `/admin/network` do spec.

## Parte B — App Operador

O operador já tem a **Agenda** (tarefas agrupadas por status) e a **execução com SLA**. O M6 fecha
a experiência:
- **Agenda**: filtro **"Só as minhas"** (tarefas em que o usuário logado é o responsável) — foco
  do operador.
- **Execução (finalização)**: além de SLA e atraso, mostra **Tempo gasto** (início→fim) e
  **Conformidade** da execução (itens aprovados / avaliáveis). Para isso, `useTask` passa a
  carregar os itens da execução (passed) quando concluída.

Sem novas tabelas — usa dados de M1/M2. Mobile-first já herdado do layout/PWA.

## Fora do M6 / evoluções
Materialização de scores da rede (histórico/tendência), app nativo dedicado, RLS multi-tenant
coordenada (débito de segurança já registrado), leitura de QR/barras por câmera, fraude por
hash/EXIF.
