# Operações 2.0 — Marco 3: Painel do gestor + Score operacional

**Data:** 2026-07-16 · Fases 4 e 5 do produto. Depende de M1/M2.

## Nota de arquitetura

O M3 é **só frontend** — calcula tudo **on-the-fly** a partir de `inventory_checklist_schedules`
+ `_executions` + `_execution_items` (já existentes). **Não precisa de nova migration.** A tabela
materializada `operation_scores` e os rankings persistidos ficam para o **M4** (quando entram
snapshots periódicos e comparação de rede).

Rota: `/admin/stock/checklists/dashboard` (mantém o padrão da decisão do M1 de ficar sob
`stock/checklists`, em vez de `/admin/operations`). Escopo = unidade atual (`currentStore`);
comparação entre unidades é o **M6** (`/admin/network`).

## Score (lib pura `src/lib/operations/score.ts`)

Ponderação: **40% Pontualidade · 30% Conformidade · 20% Conclusão · 10% Qualidade** → 0–100.
- **Conclusão** = executados / agendados.
- **Pontualidade** = no prazo / executados.
- **Conformidade** = itens aprovados / itens avaliáveis. Avaliável = temperatura/faixa (usa
  `passed`) ou sim/não (aprovado quando "sim"). Sem itens avaliáveis → 100 (não penaliza).
- **Qualidade** = média das avaliações (itens `rating`, estrelas/5). Sem avaliações → usa a
  conformidade.
- Score do setor/unidade = agregação das tarefas do grupo (mesma fórmula). Validado (81 no
  cenário-base; teste avulso).

## Painel (`OperationsDashboardPage`)

- **Filtros:** período (de/até), setor, turno, responsável.
- **6 KPIs:** Agendados · Concluídos · Pendentes · Atrasados (late+missed) · Falhas críticas ·
  Conformidade.
- **Indicadores:** Taxa de conclusão · Pontualidade · Conformidade dos itens.
- **Score operacional** (0–100) com as 4 componentes em barras.
- **Rankings preliminares:** score por setor e por responsável (prévia do M4).

Camada: `src/hooks/operations/useOperationsDashboard.ts` (busca + agrega geral/por setor/por
usuário) · página em `pages/admin/stock/operations/` · rota + link no menu do estoque.

## Fora do M3
Ranking persistido (`operation_rankings`), `operation_scores` materializado, alertas (M4), IA (M5),
rede/`/admin/network` (M6).
