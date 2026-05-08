import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { startOfDay } from 'date-fns';

export interface SidebarBadges {
  pending: number;  // pedidos aguardando → badge vermelho em Pedidos
  kitchen: number;  // em preparo → badge âmbar em KDS Cozinha
}

export function useSidebarBadges() {
  const { currentStore } = useStore();

  return useQuery<SidebarBadges>({
    queryKey: ['sidebar-badges', currentStore?.id],
    queryFn: async () => {
      if (!currentStore?.id) return { pending: 0, kitchen: 0 };

      const today = startOfDay(new Date()).toISOString();

      const { data } = await supabase
        .from('orders')
        .select('status')
        .eq('store_id', currentStore.id)
        .in('status', ['pending', 'confirmed', 'preparing'])
        .gte('created_at', today);

      return {
        pending: data?.filter(o => o.status === 'pending').length ?? 0,
        kitchen: data?.filter(o => ['confirmed', 'preparing'].includes(o.status)).length ?? 0,
      };
    },
    enabled: !!currentStore?.id,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
