/**
 * Visão de rede (Operações 2.0 — M6): compara todas as unidades por score.
 * Cálculo on-the-fly agrupando as tarefas por `store_id`.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { summarize, computeScore, type OpsMetrics, type ScoreBreakdown, type TaskInput } from '@/lib/operations/score';
import { buildTaskInput } from './useOperationsDashboard';

export interface NetworkRow {
  store_id: string;
  store_name: string;
  city: string | null;
  metrics: OpsMetrics;
  score: ScoreBreakdown;
  pendencias: number;      // pendentes + não executadas
  falhas: number;          // falhas críticas
}

export interface NetworkResult {
  units: NetworkRow[];
  avgScore: number;
  best: NetworkRow | null;
  worst: NetworkRow | null;
}

export function useNetworkDashboard(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['op_network', dateFrom, dateTo],
    queryFn: async (): Promise<NetworkResult> => {
      const { data: stores } = await (supabase as any)
        .from('stores').select('id, name, city');
      const storeMap = new Map<string, { name: string; city: string | null }>(
        (stores ?? []).map((s: any) => [s.id, { name: s.name, city: s.city ?? null }]),
      );

      const { data, error } = await (supabase as any)
        .from('inventory_checklist_schedules')
        .select(
          'store_id, status, critical, deadline_at, ' +
            'execution:inventory_checklist_executions(items:inventory_checklist_execution_items(passed, value_boolean, ' +
            'item:inventory_checklist_items(type)))',
        )
        .gte('scheduled_date', dateFrom)
        .lte('scheduled_date', dateTo);
      if (error) throw error;

      const byStore = new Map<string, TaskInput[]>();
      for (const row of (data ?? []) as any[]) {
        if (!row.store_id) continue;
        if (!byStore.has(row.store_id)) byStore.set(row.store_id, []);
        byStore.get(row.store_id)!.push(buildTaskInput(row));
      }

      const units: NetworkRow[] = [...byStore.entries()]
        .map(([store_id, tasks]) => {
          const metrics = summarize(tasks);
          const info = storeMap.get(store_id);
          return {
            store_id,
            store_name: info?.name ?? '—',
            city: info?.city ?? null,
            metrics,
            score: computeScore(metrics),
            pendencias: metrics.pending + metrics.missed,
            falhas: metrics.criticalFailures,
          };
        })
        .sort((a, b) => b.score.score - a.score.score);

      const avgScore = units.length
        ? Math.round(units.reduce((s, u) => s + u.score.score, 0) / units.length)
        : 0;

      return {
        units,
        avgScore,
        best: units[0] ?? null,
        worst: units.length ? units[units.length - 1] : null,
      };
    },
  });
}
