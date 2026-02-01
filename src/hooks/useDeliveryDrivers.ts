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

  // Setup Realtime Subscription - GLOBAL (no filter, we filter on fetch)
  // This ensures we catch ALL driver updates regardless of store_id issues
  useEffect(() => {
    // Unique channel name per store session (but listen to ALL drivers)
    const channelName = `drivers-tracking-global-${Date.now()}`;

    console.log('[Realtime] Setting up driver tracking...');

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', // Only care about updates for location tracking
          schema: 'public',
          table: 'delivery_drivers',
          // NO FILTER - listen to all driver updates, filter on data fetch
        },
        (payload) => {
          console.log('[Realtime] Driver update received:', payload.new);
          // Invalidate cache to refresh list immediately
          queryClient.invalidateQueries({ queryKey: ['delivery-drivers'] });
        }
      )
      .subscribe((status, err) => {
        console.log('[Realtime] Subscription status:', status, err || '');
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] ✅ Connected to driver tracking!');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] ❌ Connection error:', err);
        }
      });

    return () => {
      console.log('[Realtime] Cleaning up channel...');
      supabase.removeChannel(channel);
    };
  }, [queryClient]); // Removed currentStore dependency - always listen

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
    refetchInterval: 5000, // Poll every 5 seconds as backup if realtime fails
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
