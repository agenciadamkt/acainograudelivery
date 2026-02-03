import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';

export interface DeliveryReportData {
    // General stats
    totalDeliveries: number;
    completedDeliveries: number;
    cancelledDeliveries: number;
    pendingDeliveries: number;
    totalRevenue: number;
    totalDeliveryFees: number;
    avgDeliveryTime: number | null; // in minutes

    // By driver
    driverStats: {
        id: string;
        name: string;
        phone: string;
        totalDeliveries: number;
        avgTime: number | null;
        rating: number;
        revenue: number;
    }[];

    // By day
    dailyStats: {
        date: string;
        count: number;
        revenue: number;
    }[];

    // By hour
    hourlyDistribution: {
        hour: number;
        count: number;
    }[];
}

export function useDeliveryReports(dateFrom?: string, dateTo?: string) {
    const { currentStore } = useStore();

    return useQuery({
        queryKey: ['delivery-reports', currentStore?.id, dateFrom, dateTo],
        queryFn: async (): Promise<DeliveryReportData> => {
            if (!currentStore?.id) throw new Error('Store not found');

            // Build base query filters
            let query = supabase
                .from('orders')
                .select(`
          id,
          status,
          order_type,
          delivery_fee,
          total_amount,
          created_at,
          delivered_at,
          ready_at,
          driver_id,
          delivery_drivers!orders_driver_id_fkey(id, name, phone, rating)
        `)
                .eq('store_id', currentStore.id)
                .eq('order_type', 'delivery');

            if (dateFrom) {
                query = query.gte('created_at', dateFrom);
            }
            if (dateTo) {
                query = query.lte('created_at', dateTo);
            }

            const { data: orders, error } = await query;
            if (error) throw error;

            // Calculate general stats
            const totalDeliveries = orders?.length || 0;
            const completedDeliveries = orders?.filter(o => o.status === 'delivered').length || 0;
            const cancelledDeliveries = orders?.filter(o => o.status === 'cancelled').length || 0;
            const pendingDeliveries = orders?.filter(o =>
                !['delivered', 'cancelled'].includes(o.status)
            ).length || 0;

            const completedOrders = orders?.filter(o => o.status === 'delivered') || [];
            const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
            const totalDeliveryFees = completedOrders.reduce((sum, o) => sum + Number(o.delivery_fee), 0);

            // Calculate avg delivery time (from ready_at to delivered_at)
            const timesInMinutes: number[] = [];
            completedOrders.forEach(order => {
                if (order.ready_at && order.delivered_at) {
                    const readyTime = new Date(order.ready_at).getTime();
                    const deliveredTime = new Date(order.delivered_at).getTime();
                    const diffMinutes = (deliveredTime - readyTime) / (1000 * 60);
                    if (diffMinutes > 0 && diffMinutes < 180) { // Sanity check: less than 3 hours
                        timesInMinutes.push(diffMinutes);
                    }
                }
            });
            const avgDeliveryTime = timesInMinutes.length > 0
                ? timesInMinutes.reduce((a, b) => a + b, 0) / timesInMinutes.length
                : null;

            // Calculate driver stats
            const driverMap = new Map<string, {
                id: string;
                name: string;
                phone: string;
                totalDeliveries: number;
                times: number[];
                rating: number;
                revenue: number;
            }>();

            orders?.forEach(order => {
                if (order.driver_id && (order as any).delivery_drivers) {
                    const driver = (order as any).delivery_drivers;
                    if (!driverMap.has(order.driver_id)) {
                        driverMap.set(order.driver_id, {
                            id: driver.id,
                            name: driver.name,
                            phone: driver.phone,
                            totalDeliveries: 0,
                            times: [],
                            rating: driver.rating || 0,
                            revenue: 0,
                        });
                    }

                    const driverData = driverMap.get(order.driver_id)!;

                    if (order.status === 'delivered') {
                        driverData.totalDeliveries++;
                        driverData.revenue += Number(order.total_amount);

                        if (order.ready_at && order.delivered_at) {
                            const readyTime = new Date(order.ready_at).getTime();
                            const deliveredTime = new Date(order.delivered_at).getTime();
                            const diffMinutes = (deliveredTime - readyTime) / (1000 * 60);
                            if (diffMinutes > 0 && diffMinutes < 180) {
                                driverData.times.push(diffMinutes);
                            }
                        }
                    }
                }
            });

            const driverStats = Array.from(driverMap.values()).map(d => ({
                id: d.id,
                name: d.name,
                phone: d.phone,
                totalDeliveries: d.totalDeliveries,
                avgTime: d.times.length > 0
                    ? d.times.reduce((a, b) => a + b, 0) / d.times.length
                    : null,
                rating: d.rating,
                revenue: d.revenue,
            })).sort((a, b) => b.totalDeliveries - a.totalDeliveries);

            // Calculate daily stats
            const dailyMap = new Map<string, { count: number; revenue: number }>();
            completedOrders.forEach(order => {
                const date = order.created_at.split('T')[0];
                if (!dailyMap.has(date)) {
                    dailyMap.set(date, { count: 0, revenue: 0 });
                }
                const day = dailyMap.get(date)!;
                day.count++;
                day.revenue += Number(order.total_amount);
            });

            const dailyStats = Array.from(dailyMap.entries())
                .map(([date, data]) => ({ date, ...data }))
                .sort((a, b) => a.date.localeCompare(b.date));

            // Calculate hourly distribution
            const hourlyMap = new Map<number, number>();
            for (let h = 0; h < 24; h++) {
                hourlyMap.set(h, 0);
            }
            orders?.forEach(order => {
                const hour = new Date(order.created_at).getHours();
                hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
            });

            const hourlyDistribution = Array.from(hourlyMap.entries())
                .map(([hour, count]) => ({ hour, count }))
                .sort((a, b) => a.hour - b.hour);

            return {
                totalDeliveries,
                completedDeliveries,
                cancelledDeliveries,
                pendingDeliveries,
                totalRevenue,
                totalDeliveryFees,
                avgDeliveryTime,
                driverStats,
                dailyStats,
                hourlyDistribution,
            };
        },
        enabled: !!currentStore?.id,
    });
}
