/**
 * CheckGrau — Ranking de colaboradores (Bloco D). Atribui as execuções a quem
 * de fato executou (execution.completed_by → checkgrau_collaborators.auth_user_id)
 * e pontua com o mesmo score do M3.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  summarize, computeScore, itemVerdict, type TaskInput, type OpsMetrics, type ScoreBreakdown,
} from '@/lib/operations/score';

export interface CollaboratorRankRow {
  auth_user_id: string;
  name: string;
  cargo: string | null;
  metrics: OpsMetrics;
  score: ScoreBreakdown;
  execucoes: number;
  atrasos: number;
}

export function useCollaboratorRanking(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['cg_collab_ranking', dateFrom, dateTo],
    queryFn: async (): Promise<CollaboratorRankRow[]> => {
      // colaboradores (para resolver nome pelo auth_user_id)
      const { data: collabs } = await (supabase as any)
        .from('checkgrau_collaborators')
        .select('auth_user_id, name, cargo')
        .not('auth_user_id', 'is', null);
      const byAuth = new Map<string, { name: string; cargo: string | null }>(
        (collabs ?? []).map((c: any) => [c.auth_user_id, { name: c.name, cargo: c.cargo }]),
      );

      // execuções concluídas no período
      const { data, error } = await (supabase as any)
        .from('inventory_checklist_executions')
        .select(
          'completed_by, completed_at, delay_minutes, ' +
            'items:inventory_checklist_execution_items(passed, value_boolean, item:inventory_checklist_items(type))',
        )
        .not('completed_at', 'is', null)
        .gte('completed_at', `${dateFrom}T00:00:00`)
        .lte('completed_at', `${dateTo}T23:59:59`);
      if (error) throw error;

      const byUser = new Map<string, TaskInput[]>();
      for (const ex of (data ?? []) as any[]) {
        const uid = ex.completed_by;
        if (!uid || !byAuth.has(uid)) continue; // só quem é colaborador
        const items = (ex.items ?? []).map((ei: any) => ({
          verdict: itemVerdict(ei.item?.type ?? '', ei.passed, ei.value_boolean),
          rating: null,
        }));
        const status = (ex.delay_minutes ?? 0) > 0 ? 'LATE' : 'COMPLETED';
        if (!byUser.has(uid)) byUser.set(uid, []);
        byUser.get(uid)!.push({ status: status as any, critical: false, items });
      }

      return [...byUser.entries()]
        .map(([auth_user_id, tasks]) => {
          const metrics = summarize(tasks);
          const info = byAuth.get(auth_user_id)!;
          return {
            auth_user_id,
            name: info.name,
            cargo: info.cargo,
            metrics,
            score: computeScore(metrics),
            execucoes: metrics.executed,
            atrasos: metrics.late,
          };
        })
        .sort((a, b) => b.score.score - a.score.score);
    },
  });
}
