import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface UazapiWebhookConfig {
  enabled: boolean;
  url: string;
  add_events: boolean;
  add_type_messages: boolean;
  listen_events: string;
  exclude_events: string;
}

export interface UazapiConfig {
  token: string;
  base_url: string;
  instance_name: string;
  auto_send_enabled: boolean;
  notify_statuses: string[];
  webhook: UazapiWebhookConfig;
}

export interface UazapiIntegration {
  id: string;
  franchisee_id: string;
  name: string;
  provider: string | null;
  config: UazapiConfig;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const INTEGRATION_NAME = 'uazapi_whatsapp';

const DEFAULT_CONFIG: UazapiConfig = {
  token: '',
  base_url: 'https://btzap.uazapi.com',
  instance_name: 'btzap',
  auto_send_enabled: false,
  notify_statuses: ['confirmed', 'preparing', 'out_for_delivery', 'delivered'],
  webhook: {
    enabled: false,
    url: '',
    add_events: true,
    add_type_messages: false,
    listen_events: 'message',
    exclude_events: '',
  },
};

export function useUazapiIntegration() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['uazapi_integration', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await (supabase
        .from('integrations' as any)
        .select('*')
        .eq('name', INTEGRATION_NAME)
        .eq('franchisee_id', user.id)
        .maybeSingle() as any);

      if (error) throw error;

      if (!data) {
        return {
          id: null,
          franchisee_id: user.id,
          name: INTEGRATION_NAME,
          provider: 'uazapi',
          config: DEFAULT_CONFIG,
          active: false,
        } as Partial<UazapiIntegration>;
      }

      return {
        ...data,
        config: { ...DEFAULT_CONFIG, ...(data.config || {}) },
      } as UazapiIntegration;
    },
    enabled: !!user,
  });
}

export function useSaveUazapiIntegration() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: { config: UazapiConfig; active: boolean }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data: existing } = await (supabase
        .from('integrations' as any)
        .select('id')
        .eq('name', INTEGRATION_NAME)
        .eq('franchisee_id', user.id)
        .maybeSingle() as any);

      const record = {
        name: INTEGRATION_NAME,
        provider: 'uazapi',
        franchisee_id: user.id,
        config: payload.config,
        active: payload.active,
      };

      if (existing?.id) {
        const { error } = await (supabase
          .from('integrations' as any)
          .update({ ...record, updated_at: new Date().toISOString() })
          .eq('id', existing.id) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from('integrations' as any)
          .insert(record) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uazapi_integration'] });
      toast({ title: 'Integração salva', description: 'Configurações do WhatsApp salvas com sucesso.' });
    },
    onError: (err: any) => {
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    },
  });
}

export async function testUazapiConnection(baseUrl: string, token: string): Promise<{ success: boolean; message: string }> {
  try {
    const url = baseUrl.replace(/\/$/, '');
    const response = await fetch(`${url}/instance/info`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'token': token,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, message: `Conectado! Instância: ${data?.instance?.instanceName || 'OK'}` };
    }

    const err = await response.json().catch(() => ({}));
    return { success: false, message: err?.message || `Erro ${response.status}` };
  } catch (e: any) {
    return { success: false, message: e.message || 'Falha na conexão com UazAPI' };
  }
}

export async function applyUazapiWebhook(
  config: UazapiConfig,
): Promise<{ success: boolean; message: string }> {
  try {
    const url = config.base_url.replace(/\/$/, '');
    const wh = config.webhook;

    const response = await fetch(`${url}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'token': config.token,
      },
      body: JSON.stringify({
        enabled: wh.enabled,
        url: wh.url,
        addEvents: wh.add_events,
        addTypeMessages: wh.add_type_messages,
        listenEvents: wh.listen_events
          ? wh.listen_events.split(',').map(e => e.trim()).filter(Boolean)
          : [],
        excludeEvents: wh.exclude_events
          ? wh.exclude_events.split(',').map(e => e.trim()).filter(Boolean)
          : [],
      }),
    });

    if (response.ok) {
      return { success: true, message: 'Webhook configurado com sucesso!' };
    }

    const err = await response.json().catch(() => ({}));
    return { success: false, message: err?.message || `Erro ${response.status}` };
  } catch (e: any) {
    return { success: false, message: e.message || 'Falha ao configurar webhook' };
  }
}

export async function sendUazapiMessage(
  config: UazapiConfig,
  phone: string,
  text: string,
): Promise<{ success: boolean; error?: any }> {
  try {
    const url = config.base_url.replace(/\/$/, '');
    const cleanPhone = phone.replace(/\D/g, '');
    const number = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;

    const response = await fetch(`${url}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'token': config.token,
      },
      body: JSON.stringify({ number, text }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}
