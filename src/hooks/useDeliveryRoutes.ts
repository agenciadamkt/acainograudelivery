import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface DeliveryRoute {
  id: string;
  driver_id: string | null;
  name: string;
  order_ids: any;
  status: 'pendente' | 'em_progresso' | 'concluida' | 'cancelada';
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  driver?: {
    name: string;
    phone: string;
  };
}

export function useDeliveryRoutes(status?: string) {
  return useQuery({
    queryKey: ['delivery-routes', status],
    queryFn: async () => {
      let query = supabase
        .from('delivery_routes')
        .select('*, driver:delivery_drivers(name, phone)')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as DeliveryRoute[];
    },
  });
}

export function useCreateDeliveryRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (route: Omit<DeliveryRoute, 'id' | 'created_at' | 'driver'>) => {
      const { data, error } = await supabase
        .from('delivery_routes')
        .insert(route)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-routes'] });
      toast({
        title: 'Rota criada',
        description: 'Rota de entrega criada com sucesso.',
      });
    },
  });
}

export function useUpdateDeliveryRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...route }: Partial<DeliveryRoute> & { id: string }) => {
      const { data, error } = await supabase
        .from('delivery_routes')
        .update(route)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-routes'] });
      toast({
        title: 'Rota atualizada',
        description: 'Rota de entrega atualizada com sucesso.',
      });
    },
  });
}
