/**
 * Painel operacional (Operações 2.0 — M3): busca as tarefas do período/filtros
 * e computa KPIs, indicadores e score (geral + por setor + por usuário).
 * Cálculo on-the-fly a partir de schedules/executions/execution_items (M1/M2).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { deriveLiveStatus, type TaskStatus } from '@/lib/operations/sla';
import {
  summarize, computeScore, indicators, itemVerdict, emptyMetrics,
  type TaskInput, type OpsMetrics, type ScoreBreakdown, type OpsIndicators,
} from '@/lib/operations/score';

export interface DashboardFilters {
  dateFrom: string; // yyyy-mm-dd
  dateTo: string;
  sectorId?: string | null;
  shiftId?: string | null;
  userId?: string | null;
  /** Lojas selecionadas; vazio/ausente → usa a loja atual do contexto. */
  storeIds?: string[] | null;
}

export interface GroupResult {
  key: string; // sector_id / user_id
  metrics: OpsMetrics;
  score: ScoreBreakdown;
}

export interface DashboardResult {
  metrics: OpsMetrics;
  score: ScoreBreakdown;
  indicators: OpsIndicators;
  bySector: GroupResult[];
  byUser: GroupResult[];
}

export function buildTaskInput(row: any): TaskInput {
  const status = deriveLiveStatus(row.status as TaskStatus, row.deadline_at);
  const exec = Array.isArray(row.execution) ? row.execution[0] : row.execution;
  const items = (exec?.items ?? []).map((ei: any) => {
    const type = ei.item?.type ?? '';
    return {
      verdict: itemVerdict(type, ei.passed, ei.value_boolean),
      rating: type === 'rating' ? (ei.value_number ?? null) : null,
    };
  });
  return { status, critical: !!row.critical, items };
}

function groupBy(rows: any[], keyField: string): GroupResult[] {
  const map = new Map<string, TaskInput[]>();
  for (const r of rows) {
    const key = r[keyField];
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(buildTaskInput(r));
  }
  return [...map.entries()]
    .map(([key, tasks]) => {
      const metrics = summarize(tasks);
      return { key, metrics, score: computeScore(metrics) };
    })
    .sort((a, b) => b.score.score - a.score.score);
}

export function useOperationsDashboard(filters: DashboardFilters) {
  const { currentStore } = useStore();
  // Se o filtro fornece um array (mesmo vazio), respeita-o; senão, usa a loja atual.
  const storeIds = Array.isArray(filters.storeIds)
    ? filters.storeIds
    : (currentStore?.id ? [currentStore.id] : []);

  return useQuery({
    queryKey: ['op_dashboard', storeIds, filters],
    enabled: storeIds.length > 0,
    queryFn: async (): Promise<DashboardResult> => {
      let q = (supabase as any)
        .from('inventory_checklist_schedules')
        .select(
          'id, status, critical, sector_id, shift_id, responsible_user_id, collaborator_id, deadline_at, scheduled_date, ' +
            'execution:inventory_checklist_executions(id, completed_at, ' +
            'items:inventory_checklist_execution_items(passed, value_boolean, value_number, ' +
            'item:inventory_checklist_items(type)))',
        )
        .in('store_id', storeIds)
        .gte('scheduled_date', filters.dateFrom)
        .lte('scheduled_date', filters.dateTo);

      if (filters.sectorId) q = q.eq('sector_id', filters.sectorId);
      if (filters.shiftId) q = q.eq('shift_id', filters.shiftId);
      // "Responsável" no CheckGrau = colaborador (collaborator_id), não o
      // responsible_user_id legado (que apontava para user_profiles do sistema).
      if (filters.userId) q = q.eq('collaborator_id', filters.userId);

      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as any[];

      const tasks = rows.map(buildTaskInput);
      const metrics = rows.length ? summarize(tasks) : emptyMetrics();
      return {
        metrics,
        score: computeScore(metrics),
        indicators: indicators(metrics),
        bySector: groupBy(rows, 'sector_id'),
        byUser: groupBy(rows, 'collaborator_id'),
      };
    },
  });
}
