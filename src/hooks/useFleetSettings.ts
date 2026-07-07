import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { FleetSettings } from '@/lib/fleetRules';

export function useFleetSettings() {
  return useQuery({
    queryKey: ['fleet-settings'],
    queryFn: async (): Promise<FleetSettings> => {
      const { data, error } = await supabase
        .from('fleet_settings' as any)
        .select('min_order_value')
        .eq('id', 1)
        .single();
      if (error) throw error;
      return { minOrderValue: Number((data as any)?.min_order_value) || 0 };
    },
  });
}

export function useUpdateFleetSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: FleetSettings) => {
      const { error } = await supabase
        .from('fleet_settings' as any)
        .update({ min_order_value: settings.minOrderValue } as any)
        .eq('id', 1);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet-settings'] });
      toast.success('Configurações da Frota salvas!');
    },
    onError: (err: any) => toast.error('Erro ao salvar configurações: ' + err.message),
  });
}
