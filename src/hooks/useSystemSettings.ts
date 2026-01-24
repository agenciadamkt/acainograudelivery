import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description: string | null;
  category: 'geral' | 'pagamento' | 'notificacoes' | 'aparencia';
  updated_by: string | null;
  updated_at: string;
}

export function useSystemSettings(category?: string) {
  return useQuery({
    queryKey: ['system-settings', category],
    queryFn: async () => {
      let query = supabase
        .from('system_settings')
        .select('*')
        .order('key');

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SystemSetting[];
    },
  });
}

export function useUpdateSystemSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { data, error } = await supabase
        .from('system_settings')
        .upsert({
          key,
          value,
          category: 'notificacoes', // Default category for new settings created this way
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast({
        title: 'Configuração atualizada',
        description: 'Configuração do sistema atualizada com sucesso.',
      });
    },
  });
}
