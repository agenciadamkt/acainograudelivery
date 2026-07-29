/**
 * Execução de uma tarefa de checklist (Operações 2.0 — M1).
 *
 * Carrega a tarefa + itens do checklist + execução atual; inicia (started_at) e
 * finaliza (completed_at + cálculo de SLA/status). Persiste as respostas por item.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { type TaskStatus } from '@/lib/operations/sla';
import { type ItemType } from '@/lib/operations/itemTypes';
import type { GpsCapture } from '@/lib/operations/evidence';
import { completeExecution } from '@/lib/operations/completeExecution';

export type { ItemType };

export interface ChecklistItem {
  id: string;
  name: string;
  type: ItemType;
  is_required: boolean;
  sort_order: number;
  // M2 — requisitos e configuração
  require_photo: boolean;
  require_gps: boolean;
  require_comment: boolean;
  require_signature: boolean;
  min_value: number | null;
  max_value: number | null;
  options: string[] | null;
  reference_image_url: string | null;
}

export interface TaskExecution {
  id: string;
  started_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  delay_minutes: number | null;
  sla_score: number | null;
  notes: string | null;
  /** Conformidade da execução (itens aprovados / avaliáveis), 0-100 ou null. */
  conformidade?: number | null;
}

export interface TaskDetail {
  id: string;
  checklist_id: string;
  deadline_at: string;
  scheduled_time: string;
  critical: boolean;
  status: TaskStatus;
  collaborator_id?: string | null;
  responsible_user_id?: string | null;
  checklist?: { name: string; description?: string | null } | null;
  sector?: { name: string } | null;
  shift?: { name: string } | null;
  items: ChecklistItem[];
  execution: TaskExecution | null;
}

/** Valor respondido por item (+ evidências do M2). */
export type ItemAnswer = {
  value_boolean?: boolean | null;
  value_number?: number | null;
  value_text?: string | null;
  value_json?: unknown | null; // multi_choice (array) / payload qr-barcode
  photo_url?: string | null;
  comment?: string | null;
  signature?: string | null;
  gps?: GpsCapture | null;
};

export function useTask(scheduleId: string | undefined) {
  return useQuery({
    queryKey: ['op_task', scheduleId],
    enabled: !!scheduleId,
    queryFn: async (): Promise<TaskDetail> => {
      const { data: sched, error: sErr } = await (supabase as any)
        .from('inventory_checklist_schedules')
        .select('*, checklist:inventory_checklists(name, description), sector:sectors(name), shift:shifts(name)')
        .eq('id', scheduleId)
        .single();
      if (sErr) throw sErr;

      const { data: items, error: iErr } = await (supabase as any)
        .from('inventory_checklist_items')
        .select(
          'id, name, type, is_required, sort_order, require_photo, require_gps, ' +
            'require_comment, require_signature, min_value, max_value, options, reference_image_url',
        )
        .eq('checklist_id', sched.checklist_id)
        .order('sort_order');
      if (iErr) throw iErr;

      const { data: execs } = await (supabase as any)
        .from('inventory_checklist_executions')
        .select('id, started_at, completed_at, completed_by, delay_minutes, sla_score, notes, ' +
          'items:inventory_checklist_execution_items(passed, value_boolean, item:inventory_checklist_items(type))')
        .eq('schedule_id', scheduleId)
        .order('created_at', { ascending: false })
        .limit(1);

      let execution = (execs?.[0] ?? null) as (TaskExecution & { items?: any[] }) | null;
      if (execution) {
        // Conformidade: itens com veredito (temperatura/faixa via passed; sim/não).
        let approved = 0, evaluable = 0;
        for (const ei of execution.items ?? []) {
          const t = ei.item?.type;
          if (t === 'temperature' || t === 'range') { evaluable++; if (ei.passed === true) approved++; }
          else if (t === 'boolean') { evaluable++; if (ei.value_boolean === true) approved++; }
        }
        execution = { ...execution, conformidade: evaluable > 0 ? Math.round((approved / evaluable) * 100) : null };
        delete (execution as any).items;
      }

      return {
        ...sched,
        items: (items ?? []) as ChecklistItem[],
        execution,
      } as TaskDetail;
    },
  });
}

/** Inicia a execução (started_at/by) e marca a tarefa como IN_PROGRESS. */
export function useStartTask() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (task: { scheduleId: string; storeId: string; existingExecutionId?: string }) => {
      if (task.existingExecutionId) return task.existingExecutionId;
      const { data, error } = await (supabase as any)
        .from('inventory_checklist_executions')
        .insert({
          schedule_id: task.scheduleId,
          store_id: task.storeId,
          started_at: new Date().toISOString(),
          started_by: user?.id ?? null,
        })
        .select('id')
        .single();
      if (error) throw error;
      await (supabase as any)
        .from('inventory_checklist_schedules')
        .update({ status: 'IN_PROGRESS', updated_at: new Date().toISOString() })
        .eq('id', task.scheduleId);
      return data.id as string;
    },
    onSuccess: (_id, vars) => {
      qc.invalidateQueries({ queryKey: ['op_task', vars.scheduleId] });
      qc.invalidateQueries({ queryKey: ['op_agenda'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao iniciar a tarefa.'),
  });
}

/** Finaliza: grava respostas, calcula SLA e move o status (COMPLETED/LATE). */
export function useCompleteTask() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      scheduleId: string;
      executionId: string;
      deadlineAt: string;
      items: ChecklistItem[];
      answers: Record<string, ItemAnswer>;
      notes?: string;
      collaboratorId?: string | null;
    }) => completeExecution({ ...args, userId: user?.id ?? null }),
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ['op_task', vars.scheduleId] });
      qc.invalidateQueries({ queryKey: ['op_agenda'] });
      toast.success(
        res.status === 'COMPLETED'
          ? `Tarefa concluída no prazo — SLA ${res.sla_score}%.`
          : `Tarefa concluída com ${res.delay_minutes} min de atraso — SLA ${res.sla_score}%.`,
      );
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao finalizar a tarefa.'),
  });
}
