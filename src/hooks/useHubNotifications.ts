import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface HubNotification {
    id: string;
    text: string;
    type: 'success' | 'warning' | 'info';
    time: string;
    link?: string;
}

export function useHubNotifications() {
    const { currentStore } = useStore();

    return useQuery({
        queryKey: ['hub-notifications', currentStore?.id],
        queryFn: async () => {
            const notifications: HubNotification[] = [];

            // 1. Check for New Required Trails (Last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const { data: newTrails } = await supabase
                .from('uni_trails')
                .select('id, title, created_at')
                .eq('required', true)
                .is('active', true)
                .gte('created_at', sevenDaysAgo.toISOString())
                .limit(1);

            if (newTrails && newTrails.length > 0) {
                const trail = newTrails[0];
                notifications.push({
                    id: `trail-${trail.id}`,
                    text: `Novo treinamento obrigatório: ${trail.title}`,
                    type: 'warning',
                    time: formatDistanceToNow(new Date(trail.created_at), { locale: ptBR, addSuffix: true }),
                    link: '/admin/universidade'
                });
            }

            // 2. Check Ranking Position
            // leveraging the existing RPC if possible, or simpler query
            if (currentStore) {
                const { data: ranking } = await supabase.rpc('get_network_ranking');
                if (ranking) {
                    const myRank = (ranking as any[]).find((r: any) => r.store_id === currentStore.id);
                    if (myRank && myRank.rank_pos <= 5) {
                        notifications.push({
                            id: 'ranking-top5',
                            text: `Sua unidade está no Top 5 (#${myRank.rank_pos}) do ranking! 🏆`,
                            type: 'success',
                            time: 'Hoje',
                            link: '/admin/performance'
                        });
                    }
                }
            }

            // 3. Check Financial Goal (Mock Logic for now: if revenue > 0)
            // Real logic would compare current_revenue vs target
            // For MVP demonstration, if we have recent orders, show success
            if (currentStore) {
                const today = new Date();
                const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

                const { count } = await supabase
                    .from('orders')
                    .select('*', { count: 'exact', head: true })
                    .eq('store_id', currentStore.id)
                    .gte('created_at', firstDayOfMonth);

                if (count && count > 10) { // Simple threshold for MVP
                    notifications.push({
                        id: 'goal-met',
                        text: 'Meta mensal de pedidos atingida! 🎉',
                        type: 'success',
                        time: 'Há pouco',
                        link: '/admin/dashboard'
                    });
                }
            }

            return notifications;
        },
        enabled: !!currentStore
    });
}
