/**
 * Alertas operacionais (Operações 2.0 — M4): config por unidade, log de
 * notificações e disparo do Notification Engine (edge function via UazAPI).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { toast } from 'sonner';

export interface AlertEvents {
  overdue: boolean;
  critical: boolean;
  out_of_standard: boolean;
}

export interface AlertSettings {
  id?: string;
  store_id: string;
  enabled: boolean;
  events: AlertEvents;
  recipient_phone: string | null;
  recipient_name: string | null;
}

export interface NotificationLog {
  id: string;
  event_type: string;
  schedule_id: string | null;
  phone: string | null;
  message: string | null;
  status: string;
  error: string | null;
  sent_at: string | null;
  created_at: string;
}

const DEFAULT_EVENTS: AlertEvents = { overdue: true, critical: true, out_of_standard: true };

export function useAlertSettings() {
  const { currentStore } = useStore();
  return useQuery({
    queryKey: ['op_alert_settings', currentStore?.id],
    enabled: !!currentStore?.id,
    queryFn: async (): Promise<AlertSettings> => {
      const fallback: AlertSettings = {
        store_id: currentStore!.id,
        enabled: false,
        events: DEFAULT_EVENTS,
        recipient_phone: null,
        recipient_name: null,
      };
      // Degrada com defaults se a tabela ainda não existir (migração pendente).
      try {
        const { data, error } = await (supabase as any)
          .from('operation_alert_settings')
          .select('*')
          .eq('store_id', currentStore!.id)
          .maybeSingle();
        if (error) throw error;
        return (data as AlertSettings) ?? fallback;
      } catch {
        return fallback;
      }
    },
  });
}

export function useSaveAlertSettings() {
  const { currentStore } = useStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: AlertSettings) => {
      const { error } = await (supabase as any)
        .from('operation_alert_settings')
        .upsert(
          {
            store_id: currentStore?.id,
            enabled: s.enabled,
            events: s.events,
            recipient_phone: s.recipient_phone,
            recipient_name: s.recipient_name,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'store_id' },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['op_alert_settings'] });
      toast.success('Configuração de alertas salva.');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao salvar.'),
  });
}

export function useNotificationLogs() {
  const { currentStore } = useStore();
  return useQuery({
    queryKey: ['op_notification_logs', currentStore?.id],
    enabled: !!currentStore?.id,
    queryFn: async (): Promise<NotificationLog[]> => {
      const { data, error } = await (supabase as any)
        .from('notification_logs')
        .select('*')
        .eq('store_id', currentStore!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as NotificationLog[];
    },
  });
}

/** Dispara o motor de alertas (edge function) para a unidade atual. */
export function useRunAlerts() {
  const { currentStore } = useStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<{ sent: number; skipped: number }> => {
      const { data, error } = await supabase.functions.invoke('operations-alerts', {
        body: { store_id: currentStore?.id },
      });
      if (error) throw error;
      return data as { sent: number; skipped: number };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['op_notification_logs'] });
      toast.success(
        res.sent > 0 ? `${res.sent} alerta(s) enviado(s).` : 'Nenhum alerta novo para enviar.',
      );
    },
    onError: (e: any) => toast.error(e?.message ?? 'Falha ao executar os alertas.'),
  });
}
