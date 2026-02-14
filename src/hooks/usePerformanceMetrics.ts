import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { startOfMonth, endOfMonth, subMonths, format, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface DailyRevenue {
    date: string;
    day: string;
    value: number;
}

export interface PerformanceKPIs {
    revenue: { value: number; trend: number; target: number };
    ticket: { value: number; trend: number };
    orders: { value: number; trend: number };
}

export function usePerformanceMetrics() {
    const { currentStore } = useStore();

    return useQuery({
        queryKey: ['performance-metrics', currentStore?.id],
        queryFn: async () => {
            if (!currentStore?.id) return null;

            const today = new Date();
            const startCurrent = startOfMonth(today);
            const endCurrent = endOfMonth(today);

            // 1. Fetch Current Month Orders
            const { data: currentOrders, error: errCurrent } = await supabase
                .from('orders')
                .select('total_amount, created_at, status')
                .eq('store_id', currentStore.id)
                .gte('created_at', startCurrent.toISOString())
                .lte('created_at', endCurrent.toISOString())
                .neq('status', 'cancelled');

            if (errCurrent) throw errCurrent;

            // 1.1 Fetch PDV Orders (Current Month)
            const { data: currentPdvOrders, error: errPdv } = await supabase
                .from('pdv_orders' as any)
                .select('total, created_at, status')
                .eq('store_id', currentStore.id)
                .gte('created_at', startCurrent.toISOString())
                .lte('created_at', endCurrent.toISOString())
                .neq('status', 'cancelled');

            // Combine
            const allCurrentOrders = [
                ...(currentOrders || []).map(o => ({ ...o, total: o.total_amount })),
                ...(currentPdvOrders || [])
            ];

            // 2. Fetch Previous Month for Trend
            const startPrev = startOfMonth(subMonths(today, 1));
            const endPrev = endOfMonth(subMonths(today, 1));

            const { data: prevOrders } = await supabase
                .from('orders')
                .select('total_amount, status')
                .eq('store_id', currentStore.id)
                .gte('created_at', startPrev.toISOString())
                .lte('created_at', endPrev.toISOString())
                .neq('status', 'cancelled');

            const { data: prevPdv } = await supabase
                .from('pdv_orders' as any)
                .select('total, status')
                .eq('store_id', currentStore.id)
                .gte('created_at', startPrev.toISOString())
                .lte('created_at', endPrev.toISOString())
                .neq('status', 'cancelled');

            const allPrevOrders = [
                ...(prevOrders || []).map(o => ({ ...o, total: o.total_amount })),
                ...(prevPdv || [])
            ];


            // --- Calculations ---

            // Revenue
            const currentRevenue = allCurrentOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
            const prevRevenue = allPrevOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
            const revenueTrend = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 100;

            // Ticket
            const currentTicket = allCurrentOrders.length > 0 ? currentRevenue / allCurrentOrders.length : 0;
            const prevTicket = allPrevOrders.length > 0 ? prevRevenue / allPrevOrders.length : 0;
            const ticketTrend = prevTicket > 0 ? ((currentTicket - prevTicket) / prevTicket) * 100 : 0;

            // Daily Chart Data
            // Create an array of all days in the current month so far (or whole month)
            const daysInterval = eachDayOfInterval({ start: startCurrent, end: endCurrent }); // Entire month to show progress

            const dailyChart: DailyRevenue[] = daysInterval.map(day => {
                // filter orders for this day
                const dayOrders = allCurrentOrders.filter(o => isSameDay(parseISO(o.created_at), day));
                const dayTotal = dayOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);

                return {
                    date: day.toISOString(),
                    day: format(day, 'dd'),
                    value: dayTotal
                };
            });

            return {
                kpis: {
                    revenue: { value: currentRevenue, trend: revenueTrend, target: 50000 }, // Mock target
                    ticket: { value: currentTicket, trend: ticketTrend },
                    orders: { value: allCurrentOrders.length, trend: 0 }
                },
                dailyChart
            };
        },
        enabled: !!currentStore?.id
    });
}
