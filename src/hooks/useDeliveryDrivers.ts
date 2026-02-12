import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useStore } from '@/contexts/StoreContext';

export interface DeliveryDriver {
  id: string;
  name: string;
  phone: string;
  store_id: string | null;
  is_global: boolean;
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

  return useQuery({
    queryKey: ['delivery-drivers', currentStore?.id],
    queryFn: async () => {
      if (!currentStore?.id) return [];

      const { data, error } = await supabase
        .rpc('get_available_drivers', { p_store_id: currentStore.id });

      if (error) {
        console.error('Error fetching drivers:', error);
        throw error;
      }
      return data as DeliveryDriver[];
    },
    enabled: !!currentStore?.id,
    refetchInterval: 10000,
    staleTime: 8000,
  });
}

export function useDriverStores(driverId: string | undefined) {
  return useQuery({
    queryKey: ['driver-stores', driverId],
    queryFn: async () => {
      if (!driverId) return [];
      // Cast to 'any' because the table is not in the generated types yet
      const { data, error } = await supabase
        .from('delivery_driver_stores' as any)
        .select('store_id')
        .eq('driver_id', driverId);

      if (error) throw error;
      return (data as any[]).map(d => d.store_id as string);
    },
    enabled: !!driverId
  });
}

export function useCreateDeliveryDriver() {
  const queryClient = useQueryClient();
  const { currentStore } = useStore();

  return useMutation({
    mutationFn: async (vars: {
      driver: Omit<DeliveryDriver, 'id' | 'created_at' | 'updated_at' | 'rating' | 'total_deliveries' | 'store_id'> & { is_global?: boolean },
      allowed_store_ids?: string[]
    }) => {
      const { data: newDriver, error } = await supabase
        .from('delivery_drivers')
        .insert({
          ...vars.driver,
          store_id: currentStore?.id,
          is_global: vars.driver.is_global || false
        } as any)
        .select()
        .single();

      if (error) throw error;

      const driver = newDriver as DeliveryDriver;

      if (!vars.driver.is_global && vars.allowed_store_ids && vars.allowed_store_ids.length > 0) {
        const associations = vars.allowed_store_ids.map(storeId => ({
          driver_id: driver.id,
          store_id: storeId
        }));
        const { error: assocError } = await supabase
          .from('delivery_driver_stores' as any)
          .insert(associations);

        if (assocError) console.error('Error linking stores:', assocError);

      } else if (!vars.driver.is_global && currentStore?.id) {
        // Auto-link to current store if not global
        const { error: assocError } = await supabase
          .from('delivery_driver_stores' as any)
          .insert([{ driver_id: driver.id, store_id: currentStore.id }]);
        if (assocError && (assocError as any).code !== '23505') console.error('Error linking current store:', assocError);
      }

      return driver;
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
    mutationFn: async (vars: {
      id: string,
      updates: Partial<DeliveryDriver>,
      allowed_store_ids?: string[]
    }) => {
      const { id, updates, allowed_store_ids } = vars;

      const { data, error } = await supabase
        .from('delivery_drivers')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updatedDriver = data as DeliveryDriver;

      if (allowed_store_ids !== undefined) {
        await supabase.from('delivery_driver_stores' as any).delete().eq('driver_id', id);

        // Check if global based on updates or current state
        const isGlobal = updates.is_global !== undefined ? updates.is_global : updatedDriver.is_global;

        if (!isGlobal && allowed_store_ids.length > 0) {
          const associations = allowed_store_ids.map(storeId => ({
            driver_id: id,
            store_id: storeId
          }));
          await supabase.from('delivery_driver_stores' as any).insert(associations);
        }
      }

      return updatedDriver;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-drivers'] });
      queryClient.invalidateQueries({ queryKey: ['driver-stores'] });
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
