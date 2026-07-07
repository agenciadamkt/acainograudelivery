import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';

export interface ExtratoRecord {
    id: string;
    date: string;
    type: 'pedido' | 'fundo_caixa' | 'retirada' | 'abertura' | 'fechamento';
    title: string;
    details: string;
    value: number;
    payment_method?: string;
    color: 'green' | 'red' | 'default';
}

export interface ExtratoFilters {
    dateFrom: string;
    dateTo: string;
}

export function useExtratoFinanceiro(filters: ExtratoFilters) {
    const { currentStore } = useStore();
    const { user } = useAuth();

    return useQuery({
        queryKey: ['extrato_financeiro', currentStore?.id, user?.id, filters],
        queryFn: async () => {
            if (!currentStore?.id || !user?.id) return [];

            const dateFromISO = filters.dateFrom + 'T00:00:00.000Z';
            const dateToISO = filters.dateTo + 'T23:59:59.999Z';

            // 1. Pedidos (Delivery)
            const { data: orders } = await supabase
                .from('orders')
                .select('id, order_number, total_amount, payment_method, created_at, status')
                .eq('store_id', currentStore.id)
                .neq('status', 'cancelled')
                .eq('payment_status', 'paid')
                .gte('created_at', dateFromISO)
                .lte('created_at', dateToISO);

            // 2. Pedidos (PDV)
            const { data: pdvOrders } = await supabase
                .from('pdv_orders')
                .select('id, order_number, amount_paid, payment_method, created_at, status')
                .eq('store_id', currentStore.id)
                .eq('status', 'paid')
                .gte('created_at', dateFromISO)
                .lte('created_at', dateToISO);

            // 3. Registers (Abertura / Fechamento)
            const { data: registers } = await supabase
                .from('pdv_cash_registers')
                .select('id, opening_amount, closing_amount, opened_at, closed_at, status')
                .eq('user_id', user.id)
                .gte('opened_at', dateFromISO)
                .lte('opened_at', dateToISO);

            // 4. Movimentos (Suprimento / Sangria)
            // Get register IDs
            const registerIds = registers?.map(r => r.id) || [];
            let movements: any[] = [];
            if (registerIds.length > 0) {
                const { data } = await supabase
                    .from('pdv_cash_movements')
                    .select('id, type, amount, reason, created_at')
                    .in('cash_register_id', registerIds);
                movements = data || [];
            }

            // Consolidate into one timeline
            const timeline: ExtratoRecord[] = [];

            // Delivery Orders
            (orders || []).forEach(o => {
                timeline.push({
                    id: o.id,
                    date: o.created_at,
                    type: 'pedido',
                    title: `Pedido #${o.order_number} · Cliente`,
                    details: `${labelPayment(o.payment_method)} · Delivery`,
                    value: Number(o.total_amount),
                    payment_method: o.payment_method,
                    color: 'green'
                });
            });

            // PDV Orders
            (pdvOrders || []).forEach(o => {
                timeline.push({
                    id: o.id,
                    date: o.created_at,
                    type: 'pedido',
                    title: `Pedido #${o.order_number} · Balcão`,
                    details: `${labelPayment(o.payment_method)} · Caixa Padrão`,
                    value: Number(o.amount_paid),
                    payment_method: o.payment_method,
                    color: 'green'
                });
            });

            // Registers
            (registers || []).forEach(r => {
                timeline.push({
                    id: `open-${r.id}`,
                    date: r.opened_at,
                    type: 'abertura',
                    title: `Abertura de caixa`,
                    details: `Caixa Padrão`,
                    value: Number(r.opening_amount), // Or 0 if we don't want it to affect total (as Fundo de caixa already adds the cash if we consider opening_amount as Fundo de caixa. Actually the system uses opening_amount as Fundo de Caixa). Let's use opening_amount as "Fundo de Caixa" event.
                    color: 'default'
                });
                
                // Representing Fundo de Caixa as a separate entry
                if (Number(r.opening_amount) > 0) {
                    timeline.push({
                        id: `fund-${r.id}`,
                        date: r.opened_at, // same time
                        type: 'fundo_caixa',
                        title: `Fundo de caixa`,
                        details: `Inserção · Dinheiro · Caixa Padrão`,
                        value: Number(r.opening_amount),
                        color: 'green'
                    });
                }

                if (r.closed_at) {
                    timeline.push({
                        id: `close-${r.id}`,
                        date: r.closed_at,
                        type: 'fechamento',
                        title: `Fechamento de caixa`,
                        details: `Caixa Padrão`,
                        value: 0,
                        color: 'default'
                    });
                }
            });

            // Movements
            movements.forEach(m => {
                const isRetirada = m.type === 'sangria';
                timeline.push({
                    id: m.id,
                    date: m.created_at,
                    type: isRetirada ? 'retirada' : 'fundo_caixa',
                    title: isRetirada ? 'Retirada de dinheiro' : 'Fundo de caixa (Suprimento)',
                    details: `${isRetirada ? 'Retirada' : 'Inserção'} · Dinheiro · Caixa Padrão · Mov. ${m.reason}`,
                    value: Number(m.amount) * (isRetirada ? -1 : 1),
                    color: isRetirada ? 'red' : 'green'
                });
            });

            // Sort by date DESC
            timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            return timeline;
        },
        enabled: !!currentStore?.id && !!user?.id,
    });
}

function labelPayment(p?: string) {
    switch (p) {
        case 'credit':
        case 'credit_card':
        case 'credit_moderninha':
        case 'credit_cielo': return 'Crédito';
        case 'debit':
        case 'debit_card':
        case 'debit_moderninha':
        case 'debit_cielo': return 'Débito';
        case 'money':
        case 'dinheiro': return 'Dinheiro';
        case 'pix':
        case 'pix_moderninha':
        case 'pix_cielo': return 'PIX';
        case 'online': return 'Online';
        default: return p || 'Não informado';
    }
}
