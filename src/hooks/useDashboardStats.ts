import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { startOfDay, endOfDay, format, parseISO, eachHourOfInterval, subDays } from 'date-fns';

export interface DashboardData {
    cards: {
        aguardando: number;
        naCozinha: number;
        mesasAbertas: number;
        clientesHoje: number;
        faturamentoTotal: number;
        totalOrders: number;
        ticketMedio: number;
        tempoMedioMesa: string;
    };
    participation: {
        delivery: { faturamento: number; pedidos: number; percent: number };
        salao: { faturamento: number; pedidos: number; percent: number };
    };
    charts: {
        hourly: Array<{ hour: string; faturamento: number; pedidos: number }>;
        paymentMethods: Array<{ name: string; value: number }>;
        topProducts: Array<{ name: string; quantity: number }>;
        peakHours: Array<{ hour: string; faturamento: number; pedidos: number }>;
    };
    footer: {
        entregasConcluidas: number;
        mesasFechadas: number;
        taxaCancelamento: number;
        itensVendidos: number;
    };
}

export function useDashboardStats(dateFrom?: string, dateTo?: string) {
    const { currentStore } = useStore();

    return useQuery<DashboardData | null>({
        queryKey: ['dashboard-stats', currentStore?.id, dateFrom, dateTo],
        queryFn: async () => {
            if (!currentStore?.id) return null;

            const dFrom = dateFrom || startOfDay(new Date()).toISOString();
            const dTo = dateTo || endOfDay(new Date()).toISOString();

            // Fetch orders for basic stats and charts
            const { data: orders, error: ordersError } = await supabase
                .from('orders')
                .select(`
          *,
          customer:customers(id, name),
          items:order_items(
            *,
            product:products(name)
          )
        `)
                .eq('store_id', currentStore.id)
                .gte('created_at', dFrom)
                .lte('created_at', dTo);

            if (ordersError) throw ordersError;

            // Stats calculations
            const totalOrders = orders.length;
            const finishedOrders = orders.filter(o => o.status === 'delivered');
            const cancelledOrders = orders.filter(o => o.status === 'cancelled');
            const faturamentoTotal = orders
                .filter(o => o.status !== 'cancelled')
                .reduce((sum, o) => sum + Number(o.total_amount), 0);

            const ticketMedio = totalOrders > 0 ? faturamentoTotal / totalOrders : 0;
            const taxaCancelamento = totalOrders > 0 ? (cancelledOrders.length / totalOrders) * 100 : 0;

            // Counts by status
            const aguardando = orders.filter(o => o.status === 'pending').length;
            const naCozinha = orders.filter(o => ['confirmed', 'preparing'].includes(o.status)).length;
            const mesasAbertas = orders.filter(o => o.order_type === 'dine_in' && o.status !== 'delivered' && o.status !== 'cancelled').length;
            const clientesHoje = new Set(orders.map(o => o.customer_id)).size;

            // Delivery vs Salão
            const deliveryOrders = orders.filter(o => o.order_type === 'delivery');
            const salaoOrders = orders.filter(o => o.order_type === 'dine_in' || o.order_type === 'pickup');
            const deliveryFaturamento = deliveryOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
            const salaoFaturamento = salaoOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);

            // Hourly Data
            const hours = eachHourOfInterval({
                start: parseISO(dFrom),
                end: parseISO(dTo)
            });
            const hourlyData = hours.map(hour => {
                const hourStr = format(hour, 'HH:00');
                const hourOrders = orders.filter(o => {
                    const oDate = parseISO(o.created_at);
                    return format(oDate, 'HH') === format(hour, 'HH');
                });
                return {
                    hour: hourStr,
                    faturamento: hourOrders.reduce((sum, o) => sum + Number(o.total_amount), 0),
                    pedidos: hourOrders.length
                };
            });

            // Payment Methods
            const paymentMethods = orders.reduce((acc: Record<string, number>, o) => {
                const method = o.payment_method || 'Outros';
                acc[method] = (acc[method] || 0) + Number(o.total_amount);
                return acc;
            }, {});
            const paymentMethodsData = Object.entries(paymentMethods).map(([name, value]) => ({
                name,
                value: Number(value)
            }));

            // Top Products
            const products: Record<string, number> = {};
            orders.forEach(o => {
                o.items?.forEach((item: any) => {
                    const name = item.product?.name || 'Desconhecido';
                    products[name] = (products[name] || 0) + Number(item.quantity);
                });
            });
            const topProducts = Object.entries(products)
                .map(([name, quantity]) => ({ name, quantity: Number(quantity) }))
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 5);

            // Total items sold
            const itensVendidos = orders.reduce((sum, o) => {
                return sum + (o.items?.reduce((iSum: number, item: any) => iSum + item.quantity, 0) || 0);
            }, 0);

            return {
                cards: {
                    aguardando,
                    naCozinha,
                    mesasAbertas,
                    clientesHoje,
                    faturamentoTotal,
                    totalOrders,
                    ticketMedio,
                    tempoMedioMesa: '--' // Need more logic/data for this
                },
                participation: {
                    delivery: {
                        faturamento: deliveryFaturamento,
                        pedidos: deliveryOrders.length,
                        percent: faturamentoTotal > 0 ? (deliveryFaturamento / faturamentoTotal) * 100 : 0
                    },
                    salao: {
                        faturamento: salaoFaturamento,
                        pedidos: salaoOrders.length,
                        percent: faturamentoTotal > 0 ? (salaoFaturamento / faturamentoTotal) * 100 : 0
                    }
                },
                charts: {
                    hourly: hourlyData,
                    paymentMethods: paymentMethodsData,
                    topProducts,
                    peakHours: hourlyData.sort((a, b) => b.pedidos - a.pedidos).slice(0, 5)
                },
                footer: {
                    entregasConcluidas: deliveryOrders.filter(o => o.status === 'delivered').length,
                    mesasFechadas: salaoOrders.filter(o => o.status === 'delivered').length,
                    taxaCancelamento,
                    itensVendidos
                }
            };
        },
        enabled: !!currentStore?.id,
        refetchInterval: 20000, // 20s as seen in image
    });
}
