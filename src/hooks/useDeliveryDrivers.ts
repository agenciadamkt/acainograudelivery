import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useStore } from '@/contexts/StoreContext';

export interface DeliveryDriver {
  id: string;
  name: string;
  phone: string;
  store_id: string | null;
  vehicle_type: string | null;
  vehicle_plate: string | null;
  status: 'disponivel' | 'em_entrega' | 'offline';
  current_location: any;
  rating: number;
  total_deliveries: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function useDeliveryDrivers() {
  const { currentStore } = useStore();
  const queryClient = useQueryClient();

  // Setup Realtime Subscription - Only for current_location updates
  useEffect(() => {
    if (!currentStore?.id) return;

    // Stable channel name per store (no Date.now() to avoid recreating)
    const channelName = `drivers-tracking-${currentStore.id}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'delivery_drivers',
          filter: `store_id=eq.${currentStore.id}`,
        },
        (payload) => {
          // Only invalidate if current_location actually changed
          const oldLoc = (payload.old as any)?.current_location;
          const newLoc = (payload.new as any)?.current_location;

          if (JSON.stringify(oldLoc) !== JSON.stringify(newLoc)) {
            queryClient.invalidateQueries({ queryKey: ['delivery-drivers'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentStore?.id, queryClient]);

  return useQuery({
    queryKey: ['delivery-drivers', currentStore?.id],
    queryFn: async () => {
      let query = supabase
        .from('delivery_drivers')
        .select('*')
        .order('name');

      if (currentStore?.id) {
        query = query.eq('store_id', currentStore.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DeliveryDriver[];
    },
    enabled: !!currentStore?.id,
    staleTime: 2000, // Consider data fresh for 2 seconds to prevent excessive refetches
  });
}

export function useCreateDeliveryDriver() {
  const queryClient = useQueryClient();
  const { currentStore } = useStore();

  return useMutation({
    mutationFn: async (driver: Omit<DeliveryDriver, 'id' | 'created_at' | 'updated_at' | 'rating' | 'total_deliveries' | 'store_id'>) => {
      const { data, error } = await supabase
        .from('delivery_drivers')
        .insert({ ...driver, store_id: currentStore?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-drivers'] });
      toast({
        title: 'Entregador cadastrado',
        description: 'Entregador cadastrado com sucesso.',
      });
    },
  });
}

export function useUpdateDeliveryDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...driver }: Partial<DeliveryDriver> & { id: string }) => {
      const { data, error } = await supabase
        .from('delivery_drivers')
        .update(driver)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-drivers'] });
      toast({
        title: 'Entregador atualizado',
        description: 'Entregador atualizado com sucesso.',
      });
    },
  });
}

export function useDeleteDeliveryDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('delivery_drivers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-drivers'] });
      toast({
        title: 'Entregador excluído',
        description: 'Entregador excluído com sucesso.',
      });
    },
  });
}
