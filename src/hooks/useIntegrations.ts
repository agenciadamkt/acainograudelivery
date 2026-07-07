import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Integration {
  id: string;
  name: string;
  provider: string | null;
  config: any;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function useIntegrations() {
  return useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Integration[];
    },
  });
}

export function useUpdateIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...integration }: Partial<Integration> & { id: string }) => {
      const { data, error } = await supabase
        .from('integrations')
        .update(integration)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast({
        title: 'Integração atualizada',
        description: 'Integração atualizada com sucesso.',
      });
    },
  });
}

export function useUpsertIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (integration: { name: string; provider: string | null; config: any; active: boolean }) => {
      const { data: existing } = await supabase
        .from('integrations')
        .select('id')
        .eq('name', integration.name)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('integrations')
          .update(integration)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('integrations')
          .insert(integration)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast({
        title: 'Integração salva',
        description: 'Dados da integração salvos com sucesso.',
      });
    },
  });
}
