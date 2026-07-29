/**
 * Histórico de execuções concluídas do colaborador (app CheckGrau). Filtra por
 * período (hoje/semana/mês) e traz nome do checklist, data/hora, status e score.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TaskStatus } from '@/lib/operations/sla';

export type HistoryRange = 'hoje' | 'semana' | 'mes';

export interface HistoryItem {
  executionId: string;
  scheduleId: string | null;
  checklistName: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  completedAt: string | null;
  status: TaskStatus;
  slaScore: number | null;
}

/** Início do período (timestamp ISO) para filtrar por completed_at. */
function rangeStartISO(range: HistoryRange): string {
  const d = new Date();
  if (range === 'hoje') d.setHours(0, 0, 0, 0);
  else if (range === 'semana') d.setDate(d.getDate() - 7);
  else d.setDate(d.getDate() - 30);
  return d.toISOString();
}

export function useCollaboratorHistory(storeId: string | undefined, range: HistoryRange) {
  return useQuery({
    queryKey: ['cg_history', storeId, range],
    enabled: !!storeId,
    queryFn: async (): Promise<HistoryItem[]> => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;

      let q = (supabase as any)
        .from('inventory_checklist_executions')
        .select('id, schedule_id, completed_at, sla_score, ' +
          'schedule:inventory_checklist_schedules(scheduled_date, scheduled_time, status, checklist:inventory_checklists(name))')
        .eq('store_id', storeId)
        .not('completed_at', 'is', null)
        .gte('completed_at', rangeStartISO(range))
        .order('completed_at', { ascending: false })
        .limit(100);
      if (uid) q = q.eq('completed_by', uid);

      const { data, error } = await q;
      if (error) throw error;

      return ((data ?? []) as any[]).map((r) => ({
        executionId: r.id,
        scheduleId: r.schedule_id,
        checklistName: r.schedule?.checklist?.name ?? 'Checklist',
        scheduledDate: r.schedule?.scheduled_date ?? null,
        scheduledTime: r.schedule?.scheduled_time ?? null,
        completedAt: r.completed_at,
        status: (r.schedule?.status ?? 'COMPLETED') as TaskStatus,
        slaScore: r.sla_score,
      }));
    },
  });
}
