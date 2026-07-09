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
  base_url: 'https://acainograu.uazapi.com',
  instance_name: 'acainograu',
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

// Tipo sem o token — usado para carregar configurações no estado do componente
export type UazapiConfigSafe = Omit<UazapiConfig, 'token'>;

export function useUazapiIntegration() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['uazapi_integration', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Exclui config->token do select: o token nunca deve entrar no estado React.
      // A coluna config é JSONB; excluímos apenas via cast na leitura — o token
      // permanece no banco mas é omitido manualmente abaixo.
      const { data, error } = await (supabase
        .from('integrations' as any)
        .select('id, franchisee_id, name, provider, active, created_at, updated_at, config')
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
          hasToken: false,
        } as Partial<UazapiIntegration> & { hasToken: boolean };
      }

      // Remove o token do config antes de retornar — nunca expor no estado do componente
      const { token: _token, ...configWithoutToken } = { ...DEFAULT_CONFIG, ...(data.config || {}) };
      const hasToken = typeof data.config?.token === 'string' && data.config.token.length > 0;

      return {
        ...data,
        config: { ...configWithoutToken, token: '' } as UazapiConfig,
        hasToken,
      } as UazapiIntegration & { hasToken: boolean };
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
        .select('id, config')
        .eq('name', INTEGRATION_NAME)
        .eq('franchisee_id', user.id)
        .maybeSingle() as any);

      // Se o token estiver vazio no payload, preserva o token já salvo no banco
      const savedToken = existing?.config?.token ?? '';
      const newToken = payload.config.token.trim();
      const configToSave: UazapiConfig = {
        ...payload.config,
        token: newToken || savedToken,
      };

      const record = {
        name: INTEGRATION_NAME,
        provider: 'uazapi',
        franchisee_id: user.id,
        config: configToSave,
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
