/**
 * Gravação da conclusão de uma execução (respostas + evidências + SLA/status).
 * Extraído de useCompleteTask para ser reusado pelo motor de sincronização
 * offline (replay da fila local).
 */

import { supabase } from '@/integrations/supabase/client';
import { computeCompletion } from './sla';
import { validateItemValue } from './itemTypes';
import type { ChecklistItem, ItemAnswer } from '@/hooks/operations/useTaskExecution';

export interface CompleteArgs {
  scheduleId: string;
  executionId: string;
  deadlineAt: string;
  items: ChecklistItem[];
  answers: Record<string, ItemAnswer>;
  notes?: string;
  userId?: string | null;
  /** Colaborador que executou (app do colaborador) — atribuição robusta. */
  collaboratorId?: string | null;
  /** Momento da conclusão (para offline usa-se o horário em que foi feito). */
  completedAtISO?: string;
}

export async function completeExecution(args: CompleteArgs) {
  const now = args.completedAtISO ?? new Date().toISOString();
  const { delay_minutes, sla_score, status } = computeCompletion(args.deadlineAt, now);
  const itemById = new Map(args.items.map((it) => [it.id, it]));

  // respostas por item (substitui as anteriores desta execução)
  await (supabase as any).from('inventory_checklist_execution_items').delete().eq('execution_id', args.executionId);

  const itemRows = Object.entries(args.answers).map(([item_id, a]) => {
    const it = itemById.get(item_id);
    const passed = it
      ? validateItemValue(it.type, a.value_number ?? null, { min_value: it.min_value, max_value: it.max_value })
      : null;
    return {
      execution_id: args.executionId,
      item_id,
      value_boolean: a.value_boolean ?? null,
      value_number: a.value_number ?? null,
      value_text: a.value_text ?? null,
      value_json: a.value_json ?? null,
      photo_url: a.photo_url ?? null,
      comment: a.comment ?? null,
      signature: a.signature ?? null,
      passed,
    };
  });

  if (itemRows.length > 0) {
    const { data: inserted, error: itErr } = await (supabase as any)
      .from('inventory_checklist_execution_items').insert(itemRows).select('id, item_id');
    if (itErr) throw itErr;

    const evidences = (inserted ?? [])
      .map((row: any) => {
        const a = args.answers[row.item_id];
        if (!a || (!a.photo_url && !a.gps)) return null;
        return {
          execution_item_id: row.id,
          photo_url: a.photo_url ?? null,
          latitude: a.gps?.latitude ?? null,
          longitude: a.gps?.longitude ?? null,
          accuracy: a.gps?.accuracy ?? null,
          captured_at: now,
          device_info: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : null,
        };
      })
      .filter(Boolean);
    if (evidences.length > 0) {
      const { error: evErr } = await (supabase as any).from('checklist_evidences').insert(evidences);
      if (evErr) throw evErr;
    }
  }

  const execUpdate: Record<string, unknown> = {
    completed_at: now, completed_by: args.userId ?? null, delay_minutes, sla_score, notes: args.notes ?? null,
  };
  if (args.collaboratorId) execUpdate.collaborator_id = args.collaboratorId; // atribuição robusta (app do colaborador)
  const { error: eErr } = await (supabase as any)
    .from('inventory_checklist_executions').update(execUpdate).eq('id', args.executionId);
  if (eErr) throw eErr;

  const { error: sErr } = await (supabase as any)
    .from('inventory_checklist_schedules').update({ status, updated_at: now }).eq('id', args.scheduleId);
  if (sErr) throw sErr;

  return { delay_minutes, sla_score, status };
}
