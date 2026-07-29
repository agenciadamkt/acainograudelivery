/**
 * CheckGrau — Mensagens do gestor. Lado do colaborador (ler + marcar lida +
 * não lidas) e lado do gestor (enviar + histórico). Aviso de mão única; um
 * broadcast (collaborator_id NULL) vale para toda a loja.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Message {
  id: string;
  sender_name: string | null;
  title: string | null;
  body: string;
  created_at: string;
  read: boolean;
}

// ─── Colaborador ─────────────────────────────────────────────────────────────

export function useCollaboratorMessages(collaboratorId: string | undefined, storeId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['cg_messages', storeId, collaboratorId],
    enabled: !!storeId && !!collaboratorId,
    refetchInterval: 20000, // detecta novas mensagens com o app aberto
    queryFn: async (): Promise<Message[]> => {
      const { data: msgs, error } = await (supabase as any)
        .from('checkgrau_messages')
        .select('id, sender_name, title, body, created_at')
        .eq('store_id', storeId)
        .or(`collaborator_id.eq.${collaboratorId},collaborator_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;

      const { data: reads } = await (supabase as any)
        .from('checkgrau_message_reads').select('message_id').eq('collaborator_id', collaboratorId);
      const readSet = new Set(((reads ?? []) as any[]).map((r) => r.message_id));

      return ((msgs ?? []) as any[]).map((m) => ({ ...m, read: readSet.has(m.id) }));
    },
  });

  const markRead = useMutation({
    mutationFn: async (messageId: string) => {
      if (!collaboratorId) return;
      await (supabase as any).from('checkgrau_message_reads').upsert(
        [{ message_id: messageId, collaborator_id: collaboratorId }],
        { onConflict: 'message_id,collaborator_id', ignoreDuplicates: true },
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cg_messages', storeId, collaboratorId] }),
  });

  const unread = (query.data ?? []).filter((m) => !m.read).length;
  return { ...query, unread, markRead };
}

// ─── Gestor (admin) ──────────────────────────────────────────────────────────

export interface SentMessage {
  id: string;
  title: string | null;
  body: string;
  created_at: string;
  recipient: string; // "Toda a loja" ou nome do colaborador
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      storeId: string;
      collaboratorId: string | null; // null = broadcast p/ a loja
      title?: string;
      body: string;
      senderName?: string;
    }) => {
      const { data: msg, error } = await (supabase as any)
        .from('checkgrau_messages')
        .insert([{
          store_id: v.storeId,
          collaborator_id: v.collaboratorId,
          sender_name: v.senderName ?? 'Gestor',
          title: v.title?.trim() || null,
          body: v.body.trim(),
        }])
        .select('id')
        .single();
      if (error) throw error;

      // notificação "Mensagem do gestor" (aparece no sino/central)
      try {
        await (supabase as any).from('checkgrau_notifications').upsert(
          [{
            store_id: v.storeId,
            collaborator_id: v.collaboratorId,
            category: 'message',
            title: 'Mensagem do gestor',
            body: v.title?.trim() || v.body.trim().slice(0, 90),
            dedup_key: `message:${msg.id}`,
          }],
          { onConflict: 'dedup_key', ignoreDuplicates: true },
        );
      } catch { /* notificação é opcional */ }

      return msg.id as string;
    },
    onSuccess: (_id, v) => qc.invalidateQueries({ queryKey: ['cg_sent_messages', v.storeId] }),
  });
}

export function useSentMessages(storeId: string | undefined) {
  return useQuery({
    queryKey: ['cg_sent_messages', storeId],
    enabled: !!storeId,
    queryFn: async (): Promise<SentMessage[]> => {
      const { data, error } = await (supabase as any)
        .from('checkgrau_messages')
        .select('id, title, body, created_at, collaborator_id, collaborator:checkgrau_collaborators(name)')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return ((data ?? []) as any[]).map((m) => ({
        id: m.id, title: m.title, body: m.body, created_at: m.created_at,
        recipient: m.collaborator_id ? (m.collaborator?.name ?? 'Colaborador') : 'Toda a loja',
      }));
    },
  });
}
