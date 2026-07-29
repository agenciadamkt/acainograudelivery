/**
 * CheckGrau — central de notificações do colaborador. Lê `checkgrau_notifications`
 * (do colaborador + broadcasts da loja) e gera de forma idempotente as de tarefa
 * atrasada a partir da agenda do dia. Marca como lida.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { todayISO } from './useCollaboratorTasks';

export type NotifCategory = 'late' | 'completed' | 'new' | 'critical' | 'message';

export interface Notification {
  id: string;
  category: NotifCategory;
  title: string;
  body: string | null;
  ref_schedule_id: string | null;
  read: boolean;
  created_at: string;
}

function recipientFilter<T extends { or: any; is: any }>(q: T, collaboratorId?: string): T {
  return (collaboratorId ? q.or(`collaborator_id.eq.${collaboratorId},collaborator_id.is.null`) : q.is('collaborator_id', null)) as T;
}

/** Gera (idempotente) notificações de tarefa atrasada a partir da agenda de hoje. */
async function syncLateNotifications(storeId: string) {
  const today = todayISO();
  const { data: scheds } = await (supabase as any)
    .from('inventory_checklist_schedules')
    .select('id, collaborator_id, checklist:inventory_checklists(name)')
    .eq('store_id', storeId)
    .eq('scheduled_date', today)
    .eq('status', 'MISSED');
  const rows = ((scheds ?? []) as any[]).map((s) => ({
    store_id: storeId,
    collaborator_id: s.collaborator_id ?? null,
    category: 'late',
    title: 'Tarefa atrasada',
    body: `${s.checklist?.name ?? 'Checklist'} está atrasada.`,
    ref_schedule_id: s.id,
    dedup_key: `late:${s.id}:${today}`,
  }));
  if (rows.length) {
    await (supabase as any).from('checkgrau_notifications').upsert(rows, { onConflict: 'dedup_key', ignoreDuplicates: true });
  }
}

export function useNotifications(collaboratorId: string | undefined, storeId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['cg_notifications', storeId, collaboratorId],
    enabled: !!storeId,
    queryFn: async (): Promise<Notification[]> => {
      try { await syncLateNotifications(storeId!); } catch { /* segue mesmo sem gerar */ }
      let q = (supabase as any)
        .from('checkgrau_notifications')
        .select('id, category, title, body, ref_schedule_id, read, created_at')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(50);
      q = recipientFilter(q, collaboratorId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      let u = (supabase as any).from('checkgrau_notifications').update({ read: true }).eq('store_id', storeId).eq('read', false);
      u = recipientFilter(u, collaboratorId);
      const { error } = await u;
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cg_notifications', storeId, collaboratorId] }),
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await (supabase as any).from('checkgrau_notifications').update({ read: true }).eq('id', id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cg_notifications', storeId, collaboratorId] }),
  });

  const unread = (query.data ?? []).filter((n) => !n.read).length;
  return { ...query, unread, markAllRead, markRead };
}

/** Contagem leve de não lidas (para o badge do sino) — sem gerar nada. */
export function useUnreadCount(collaboratorId: string | undefined, storeId: string | undefined) {
  return useQuery({
    queryKey: ['cg_notif_unread', storeId, collaboratorId],
    enabled: !!storeId,
    queryFn: async (): Promise<number> => {
      let q = (supabase as any)
        .from('checkgrau_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .eq('read', false);
      q = recipientFilter(q, collaboratorId);
      const { count, error } = await q;
      if (error) return 0;
      return count ?? 0;
    },
  });
}

/** Insere (idempotente) a notificação de "tarefa concluída". */
export function useNotifyCompleted() {
  return useMutation({
    mutationFn: async (v: { executionId: string; scheduleId: string; storeId?: string | null; collaboratorId?: string | null; checklistName: string }) => {
      await (supabase as any).from('checkgrau_notifications').upsert(
        [{
          store_id: v.storeId ?? null,
          collaborator_id: v.collaboratorId ?? null,
          category: 'completed',
          title: 'Tarefa concluída',
          body: `${v.checklistName} foi concluída com sucesso.`,
          ref_schedule_id: v.scheduleId,
          dedup_key: `completed:${v.executionId}`,
        }],
        { onConflict: 'dedup_key', ignoreDuplicates: true },
      );
    },
  });
}
