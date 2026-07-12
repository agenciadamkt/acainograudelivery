
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';

export interface UnifiedSaleRecord {
    id: string;
    order_number: string;
    canal: 'PDV' | 'Delivery';
    customer_name: string;
    payment_method: string;
    total: number;
    status: string;
    created_at: string;
    order_type?: string;
    items?: any[] | null;
    discount: number;        // desconto aplicado no pedido
    cmv: number;             // custo dos produtos vendidos (Σ qtd × custo)
}

export interface HistoryFilters {
    dateFrom?: string;
    dateTo?: string;
    canal?: 'all' | 'pdv' | 'delivery';
    paymentMethod?: string;
}

const PDV_PAYMENT_LABELS: Record<string, string> = {
    money: 'Dinheiro',
    credit: 'Crédito',
    debit: 'Débito',
    pix: 'PIX',
    credit_moderninha: 'Crédito Moderninha',
    debit_moderninha: 'Débito Moderninha',
    pix_moderninha: 'PIX Moderninha',
    credit_cielo: 'Crédito Cielo',
    debit_cielo: 'Débito Cielo',
    pix_cielo: 'PIX Cielo',
    online: 'Online',
};

const DELIVERY_PAYMENT_LABELS: Record<string, string> = {
    dinheiro: 'Dinheiro',
    credit_card: 'Crédito',
    debit_card: 'Débito',
    pix: 'PIX',
    online: 'Online',
};

export function labelPayment(method: string, canal: 'PDV' | 'Delivery'): string {
    if (canal === 'PDV') return PDV_PAYMENT_LABELS[method] || method;
    return DELIVERY_PAYMENT_LABELS[method] || method;
}

export function usePdvHistory(filters?: HistoryFilters) {
    const { user } = useAuth();
    const { currentStore } = useStore();

    const { data: historyData, isLoading, error, refetch } = useQuery({
        queryKey: ['pdv_unified_history', user?.id, currentStore?.id, filters],
        enabled: !!user && !!currentStore?.id,
        staleTime: 0,
        queryFn: async (): Promise<UnifiedSaleRecord[]> => {
            if (!user || !currentStore?.id) return [];

            // Mapa de custo por produto (para CMV). cost_price vem de products.
            const { data: prods } = await (supabase as any)
                .from('products')
                .select('id, cost_price');
            const costMap = new Map<string, number>(
                (prods || []).map((p: any) => [p.id, Number(p.cost_price || 0)])
            );
            const cmvOf = (items: any[] | null | undefined): number =>
                (items || []).reduce((s: number, it: any) =>
                    s + Number(it.quantity || 0) * (costMap.get(it.product_id) || 0), 0);

            const [pdvResult, deliveryResult] = await Promise.all([
                // ── PDV orders ───────────────────────────────────────────────
                (async (): Promise<UnifiedSaleRecord[]> => {
                    if (filters?.canal === 'delivery') return [];
                    let q = (supabase as any)
                        .from('pdv_orders')
                        .select('*, items:pdv_order_items(*)')
                        .eq('store_id', currentStore.id)
                        .order('created_at', { ascending: false })
                        .limit(200);
                    if (filters?.dateFrom) q = q.gte('created_at', `${filters.dateFrom}T00:00:00-03:00`);
                    if (filters?.dateTo)   q = q.lte('created_at', `${filters.dateTo}T23:59:59-03:00`);
                    if (filters?.paymentMethod && filters.paymentMethod !== 'all')
                        q = q.eq('payment_method', filters.paymentMethod);
                    const { data, error } = await q;
                    if (error) throw error;
                    return (data || []).map((o: any): UnifiedSaleRecord => ({
                        id: o.id,
                        order_number: o.id.slice(0, 8).toUpperCase(),
                        canal: 'PDV',
                        customer_name: o.customer_name || 'Cliente Balcão',
                        payment_method: o.payment_method || 'money',
                        total: Number(o.total || 0),
                        status: o.status,
                        created_at: o.created_at,
                        items: o.items,
                        discount: Number(o.discount || 0),
                        cmv: cmvOf(o.items),
                    }));
                })(),

                // ── Delivery orders ──────────────────────────────────────────
                (async (): Promise<UnifiedSaleRecord[]> => {
                    if (filters?.canal === 'pdv') return [];
                    let q = supabase
                        .from('orders')
                        .select('id, order_number, total_amount, discount_amount, payment_method, payment_status, status, order_type, created_at, customer:customers(name), items:order_items(product_id, quantity)')
                        .eq('store_id', currentStore.id)
                        .neq('status', 'cancelled')
                        .order('created_at', { ascending: false })
                        .limit(200);
                    if (filters?.dateFrom) q = q.gte('created_at', `${filters.dateFrom}T00:00:00-03:00`);
                    if (filters?.dateTo)   q = q.lte('created_at', `${filters.dateTo}T23:59:59-03:00`);
                    if (filters?.paymentMethod && filters.paymentMethod !== 'all')
                        q = q.eq('payment_method', filters.paymentMethod);
                    const { data, error } = await q;
                    if (error) throw error;
                    return (data || []).map((o: any): UnifiedSaleRecord => ({
                        id: o.id,
                        order_number: String(o.order_number || o.id.slice(0, 8).toUpperCase()),
                        canal: 'Delivery',
                        customer_name: (o.customer as any)?.name || 'Cliente',
                        payment_method: o.payment_method || 'dinheiro',
                        total: Number(o.total_amount || 0),
                        status: o.payment_status === 'paid' ? 'paid' : o.status,
                        created_at: o.created_at,
                        order_type: o.order_type,
                        items: o.items || null,
                        discount: Number(o.discount_amount || 0),
                        cmv: cmvOf(o.items),
                    }));
                })(),
            ]);

            return [...pdvResult, ...deliveryResult].sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
        },
    });

    return { historyData: historyData ?? [], isLoading, error, refetch };
}
