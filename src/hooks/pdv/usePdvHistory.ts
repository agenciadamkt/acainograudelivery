
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

import { useStore } from '@/contexts/StoreContext';

export function usePdvHistory() {
    const { user } = useAuth();
    const { currentStore } = useStore();

    const { data: historyData, isLoading, error } = useQuery({
        queryKey: ['pdv_history', user?.id, currentStore?.id],
        queryFn: async () => {
            if (!user || !currentStore?.id) return [];

            let query = supabase
                .from('pdv_orders' as any) // Casting as any to avoid type error before migration
                .select(`
          *,
          items:pdv_order_items(*)
        `)
                .order('created_at', { ascending: false })
                .limit(50); // Pagination could be added later

            // Filter by store_id if available (migration applied)
            // But since we can't check schema easily, we assume migration is applied OR fail gracefully?
            // Actually, if we filter by a column that doesn't exist, it throws error.
            // But user MUST apply migration for this fix.
            query = query.eq('store_id', currentStore.id);

            const { data, error } = await query;

            if (error) {
                console.error("Error fetching history:", error);
                throw error;
            }
            return data;
        },
        enabled: !!user && !!currentStore?.id,
    });

    return { historyData, isLoading, error };
}
