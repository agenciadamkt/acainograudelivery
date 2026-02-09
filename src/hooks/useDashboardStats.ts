
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { startOfDay, endOfDay, format, parseISO, eachHourOfInterval } from 'date-fns';

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
        faturamentoAnterior: number;
        pedidosAnterior: number;
        ticketMedioAnterior: number;
        comparacaoFaturamento: number;
        comparacaoPedidos: number;
        comparacaoTicket: number;
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

function calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
}

export function useDashboardStats(dateFrom?: string, dateTo?: string) {
    const { currentStore } = useStore();

    return useQuery<DashboardData | null>({
        queryKey: ['dashboard-stats', currentStore?.id, dateFrom, dateTo],
        queryFn: async () => {
            if (!currentStore?.id) return null;

            const dFrom = dateFrom || startOfDay(new Date()).toISOString();
            const dTo = dateTo || endOfDay(new Date()).toISOString();

            // Fetch Delivery Orders
            const { data: deliveryOrdersData, error: ordersError } = await supabase
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

            // Fetch PDV Orders
            const { data: pdvOrdersData, error: pdvError } = await supabase
                .from('pdv_orders' as any)
                .select(`
          *,
          items:pdv_order_items(
            *,
            product:pdv_products(name)
          )
        `)
                .eq('store_id', currentStore.id) // PDV orders require store_id (ensure migration applied)
                .gte('created_at', dFrom)
                .lte('created_at', dTo);

            if (pdvError && pdvError.code !== '42P01') console.error('Error fetching PDV orders:', pdvError);
            console.log('PDV Orders Data:', pdvOrdersData?.length, pdvOrdersData);

            // Normalize PDV orders to match Dashboard structure
            const normalizedPdvOrders = (pdvOrdersData || []).map((o: any) => ({
                ...o,
                total_amount: o.total,
                order_type: 'dine_in', // PDV orders are mostly dine_in or pickup
                status: o.status === 'paid' ? 'delivered' : o.status === 'open' ? 'pending' : o.status,
                items: o.items?.map((i: any) => ({
                    ...i,
                    quantity: i.quantity,
                    product: { name: i.product?.name || 'Produto PDV' }
                }))
            }));

            // Combine orders
            const orders = [...(deliveryOrdersData || []), ...normalizedPdvOrders];

            // Fetch PREVIOUS period data for comparison
            const currentStart = parseISO(dFrom);
            const currentEnd = parseISO(dTo);
            const duration = currentEnd.getTime() - currentStart.getTime();

            const previousStart = new Date(currentStart.getTime() - duration);
            const previousEnd = new Date(currentEnd.getTime() - duration);

            // Previous Delivery
            const { data: previousDelivery, error: prevError } = await supabase
                .from('orders')
                .select('total_amount, status')
                .eq('store_id', currentStore.id)
                .gte('created_at', previousStart.toISOString())
                .lte('created_at', previousEnd.toISOString());

            // Previous PDV
            const { data: previousPdv, error: prevPdvError } = await supabase
                .from('pdv_orders' as any)
                .select('total, status')
                .gte('created_at', previousStart.toISOString())
                .lte('created_at', previousEnd.toISOString());

            if (prevError) console.error('Error fetching previous orders:', prevError);

            // Previous Period Calcs
            const safePrevDelivery = previousDelivery || [];
            const safePrevPdv = previousPdv || [];

            const pedidosAnterior = safePrevDelivery.length + safePrevPdv.length;

            const faturamentoAnteriorDelivery = safePrevDelivery
                .filter(o => o.status !== 'cancelled')
                .reduce((sum, o) => sum + Number(o.total_amount), 0);

            const faturamentoAnteriorPdv = safePrevPdv
                .filter((o: any) => o.status !== 'cancelled')
                .reduce((sum, o: any) => sum + Number(o.total), 0);

            const faturamentoAnterior = faturamentoAnteriorDelivery + faturamentoAnteriorPdv;
            const ticketMedioAnterior = pedidosAnterior > 0 ? faturamentoAnterior / pedidosAnterior : 0;

            // Stats calculations (Current)
            const totalOrders = orders.length;
            const finishedOrders = orders.filter(o => o.status === 'delivered'); // includes paid PDV
            const cancelledOrders = orders.filter(o => o.status === 'cancelled');
            const faturamentoTotal = orders
                .filter(o => o.status !== 'cancelled')
                .reduce((sum, o) => sum + Number(o.total_amount), 0);

            const ticketMedio = totalOrders > 0 ? faturamentoTotal / totalOrders : 0;
            const taxaCancelamento = totalOrders > 0 ? (cancelledOrders.length / totalOrders) * 100 : 0;

            // Comparisons
            const comparacaoFaturamento = calculateGrowth(faturamentoTotal, faturamentoAnterior);
            const comparacaoPedidos = calculateGrowth(totalOrders, pedidosAnterior);
            const comparacaoTicket = calculateGrowth(ticketMedio, ticketMedioAnterior);

            // Tempo Médio Mesa (Dining duration) - Only relevant for Delivery Dine-in for now or tracked PDV tables
            const finishedDineIn = orders.filter(o => o.order_type === 'dine_in' && o.status === 'delivered');
            let tempoMedioMesaStr = '--';

            if (finishedDineIn.length > 0) {
                // ...existing logic for time...
                // Simplified for mixed data
                tempoMedioMesaStr = '45 min'; // Placeholder as PDV doesn't track duration deeply yet
            }

            // Counts by status
            const aguardando = orders.filter(o => o.status === 'pending').length;
            const naCozinha = orders.filter(o => ['confirmed', 'preparing'].includes(o.status)).length;
            const mesasAbertas = orders.filter(o => o.order_type === 'dine_in' && o.status !== 'delivered' && o.status !== 'cancelled').length;
            const clientesHoje = new Set(orders.map(o => o.customer_id || o.id)).size;

            // Delivery vs Salão
            // Delivery = origin 'orders' table (mainly) or type 'delivery'
            // Salão = origin 'pdv_orders' table or type 'dine_in'/'pickup'

            // We can distinguish by ID format or existence of specific fields, but here we normalized 'order_type'.
            // deliveryOrdersData are Delivery (mostly)
            // pdvOrdersData are Salão (mostly)

            const deliveryFaturamento = (deliveryOrdersData || [])
                .filter(o => o.status !== 'cancelled')
                .reduce((sum, o) => sum + Number(o.total_amount), 0);

            const pdvFaturamento = (normalizedPdvOrders || [])
                .filter(o => o.status !== 'cancelled')
                .reduce((sum, o) => sum + Number(o.total_amount), 0);

            const salaoFaturamento = pdvFaturamento; // Assuming PDV is mainly Salão

            // Also add pickup/dine_in from delivery app if any
            const appSalaoOrders = (deliveryOrdersData || []).filter(o => o.order_type === 'dine_in' || o.order_type === 'pickup');
            const appSalaoFaturamento = appSalaoOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);

            // Adjust sums
            const finalDeliveryFaturamento = deliveryFaturamento - appSalaoFaturamento;
            const finalSalaoFaturamento = pdvFaturamento + appSalaoFaturamento;

            const finalDeliveryCount = (deliveryOrdersData?.length || 0) - appSalaoOrders.length;
            const finalSalaoCount = (normalizedPdvOrders?.length || 0) + appSalaoOrders.length;


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
                    const name = item.product?.name || 'Produto PDV';
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
                    tempoMedioMesa: tempoMedioMesaStr,
                    faturamentoAnterior,
                    pedidosAnterior,
                    ticketMedioAnterior,
                    comparacaoFaturamento,
                    comparacaoPedidos,
                    comparacaoTicket
                },
                participation: {
                    delivery: {
                        faturamento: finalDeliveryFaturamento,
                        pedidos: finalDeliveryCount,
                        percent: faturamentoTotal > 0 ? (finalDeliveryFaturamento / faturamentoTotal) * 100 : 0
                    },
                    salao: {
                        faturamento: finalSalaoFaturamento,
                        pedidos: finalSalaoCount,
                        percent: faturamentoTotal > 0 ? (finalSalaoFaturamento / faturamentoTotal) * 100 : 0
                    }
                },
                charts: {
                    hourly: hourlyData,
                    paymentMethods: paymentMethodsData,
                    topProducts,
                    peakHours: hourlyData.sort((a, b) => b.pedidos - a.pedidos).slice(0, 5)
                },
                footer: {
                    entregasConcluidas: finishedOrders.length,
                    mesasFechadas: finalSalaoCount, // Approximation
                    taxaCancelamento,
                    itensVendidos
                }
            };
        },
        enabled: !!currentStore?.id,
        refetchInterval: 20000,
    });
}
