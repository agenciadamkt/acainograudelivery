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
import { type ItemType, validateItemValue } from '@/lib/operations/itemTypes';
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
  /** Respostas em andamento (Auto Save / Rascunho) */
  answers?: Record<string, ItemAnswer>;
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
  /** Primeira foto — mantida para retrocompatibilidade com execuções antigas. */
  photo_url?: string | null;
  /** Lista completa de fotos (feature múltiplas fotos). photo_url = photos[0] quando presente. */
  photos?: string[];
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
        .select(`
          id, started_at, completed_at, completed_by, delay_minutes, sla_score, notes,
          items:inventory_checklist_execution_items(
            id, item_id, value_boolean, value_number, value_text, value_json, photo_url, comment, signature, passed,
            item:inventory_checklist_items(type),
            evidences:checklist_evidences(latitude, longitude, accuracy)
          )
        `)
        .eq('schedule_id', scheduleId)
        .order('created_at', { ascending: false })
        .limit(1);

      let execution = (execs?.[0] ?? null) as (TaskExecution & { items?: any[]; answers?: Record<string, ItemAnswer> }) | null;
      if (execution) {
        const rawItems = execution.items ?? [];
        // Carrega fotos adicionais salvos na tabela de múltiplas fotos
        const { data: photosData } = await (supabase as any)
          .from('inventory_checklist_execution_item_photos')
          .select('*')
          .eq('execution_id', execution.id);

        let approved = 0, evaluable = 0;
        const answersMap: Record<string, ItemAnswer> = {};

        for (const ei of rawItems) {
          const t = ei.item?.type;
          if (t === 'temperature' || t === 'range') { evaluable++; if (ei.passed === true) approved++; }
          else if (t === 'boolean') { evaluable++; if (ei.value_boolean === true) approved++; }

          const gpsRecord = ei.evidences?.[0] || null;
          const gps = gpsRecord && gpsRecord.latitude != null ? {
            latitude: Number(gpsRecord.latitude),
            longitude: Number(gpsRecord.longitude),
            accuracy: Number(gpsRecord.accuracy ?? 0),
          } : null;

          const itemPhotos = (photosData ?? [])
            .filter((p: any) => p.item_id === ei.item_id)
            .sort((a: any, b: any) => a.sort_order - b.sort_order)
            .map((p: any) => p.photo_url);

          answersMap[ei.item_id] = {
            value_boolean: ei.value_boolean,
            value_number: ei.value_number != null ? Number(ei.value_number) : null,
            value_text: ei.value_text,
            value_json: ei.value_json,
            photo_url: ei.photo_url,
            photos: itemPhotos.length > 0 ? itemPhotos : (ei.photo_url ? [ei.photo_url] : []),
            comment: ei.comment,
            signature: ei.signature,
            gps,
          };
        }

        execution = {
          ...execution,
          conformidade: evaluable > 0 ? Math.round((approved / evaluable) * 100) : null,
          answers: answersMap,
        };
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

/** Salva uma resposta individual (Auto Save). */
export function useSaveAnswer() {
  return useMutation({
    mutationFn: async (args: {
      executionId: string;
      itemId: string;
      answer: ItemAnswer;
      itemType: string;
      itemConfig?: { min_value: number | null; max_value: number | null };
    }) => {
      const passed = validateItemValue(args.itemType, args.answer.value_number ?? null, args.itemConfig ?? {});
      
      const { data: itemData, error: itemError } = await (supabase as any)
        .from('inventory_checklist_execution_items')
        .upsert({
          execution_id: args.executionId,
          item_id: args.itemId,
          value_boolean: args.answer.value_boolean ?? null,
          value_number: args.answer.value_number ?? null,
          value_text: args.answer.value_text ?? null,
          value_json: args.answer.value_json ?? null,
          photo_url: args.answer.photo_url ?? null,
          comment: args.answer.comment ?? null,
          signature: args.answer.signature ?? null,
          passed,
        }, { onConflict: 'execution_id,item_id' })
        .select('id')
        .single();
        
      if (itemError) throw itemError;
      const executionItemId = itemData.id;

      // 2. Se houver GPS ou photo_url (na tabela de evidências legada), salva em `checklist_evidences`
      if (args.answer.gps || args.answer.photo_url) {
        await (supabase as any)
          .from('checklist_evidences')
          .upsert({
            execution_item_id: executionItemId,
            photo_url: args.answer.photo_url ?? null,
            latitude: args.answer.gps?.latitude ?? null,
            longitude: args.answer.gps?.longitude ?? null,
            accuracy: args.answer.gps?.accuracy ?? null,
            captured_at: new Date().toISOString(),
            device_info: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : null,
          }, { onConflict: 'execution_item_id' });
      }

      // 3. Salva múltiplas fotos na tabela `inventory_checklist_execution_item_photos`
      if (args.answer.photos) {
        // Primeiro deletamos as existentes
        await (supabase as any)
          .from('inventory_checklist_execution_item_photos')
          .delete()
          .eq('execution_id', args.executionId)
          .eq('item_id', args.itemId);
          
        if (args.answer.photos.length > 0) {
          const photoRows = args.answer.photos.map((url, i) => ({
            execution_id: args.executionId,
            item_id: args.itemId,
            photo_url: url,
            sort_order: i,
          }));
          await (supabase as any)
            .from('inventory_checklist_execution_item_photos')
            .insert(photoRows);
        }
      }
    }
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
      // Limpa backup local após envio bem-sucedido
      localStorage.removeItem(`cg_draft_${vars.executionId}`);
      toast.success(
        res.status === 'COMPLETED'
          ? `Tarefa concluída no prazo — SLA ${res.sla_score}%.`
          : `Tarefa concluída com ${res.delay_minutes} min de atraso — SLA ${res.sla_score}%.`,
      );
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao finalizar a tarefa.'),
  });
}
