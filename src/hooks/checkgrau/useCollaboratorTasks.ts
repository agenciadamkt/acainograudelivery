/**
 * CheckGrau App — tarefas do operador (Bloco C). Lista as tarefas da loja
 * selecionada num dia, com status "vivo" (reaproveita a lógica do M1).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { deriveLiveStatus, type TaskStatus } from '@/lib/operations/sla';
import type { ScheduleTask } from '@/hooks/operations/useAgenda';

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useCollaboratorTasks(storeId: string | undefined, dateISO: string) {
  return useQuery({
    queryKey: ['cg_tasks', storeId, dateISO],
    enabled: !!storeId && !!dateISO,
    queryFn: async (): Promise<ScheduleTask[]> => {
      console.log('[CG_TASKS] Querying schedules for store:', storeId, 'date:', dateISO);
      const { data, error } = await (supabase as any)
        .from('inventory_checklist_schedules')
        .select(
          '*, checklist:inventory_checklists(name), sector:sectors(name), shift:shifts(name), ' +
            'execution:inventory_checklist_executions(id, sla_score, delay_minutes)',
        )
        .eq('store_id', storeId)
        .eq('scheduled_date', dateISO)
        .order('scheduled_time');
      console.log('[CG_TASKS] Result:', { dataLength: data?.length, error, rawData: data });
      if (error) throw error;
      return ((data ?? []) as any[]).map((t) => ({
        ...t,
        execution: Array.isArray(t.execution) ? t.execution[0] ?? null : t.execution ?? null,
        liveStatus: deriveLiveStatus(t.status as TaskStatus, t.deadline_at),
      })) as ScheduleTask[];
    },
    refetchOnWindowFocus: true,
  });
}

/** Conta as tarefas por bucket (para os cards da home). */
export function taskCounts(tasks: ScheduleTask[]) {
  let pendentes = 0, atrasadas = 0, concluidas = 0;
  for (const t of tasks) {
    if (t.liveStatus === 'PENDING' || t.liveStatus === 'IN_PROGRESS') pendentes++;
    else if (t.liveStatus === 'MISSED') atrasadas++;
    else if (t.liveStatus === 'COMPLETED' || t.liveStatus === 'LATE') concluidas++;
  }
  return { pendentes, atrasadas, concluidas, total: tasks.length };
}
