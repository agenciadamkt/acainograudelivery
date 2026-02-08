import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';

export interface Customer {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    orders_count: number;
    total_spent: number;
    last_order_date: string | null;
    created_at: string;
}

export function useCustomers() {
    const { currentStore } = useStore();

    return useQuery({
        // Adicionando currentStore?.id à queryKey para refazer a busca quando trocar a loja
        queryKey: ['customers-list', currentStore?.id],
        queryFn: async () => {
            if (!currentStore?.id) {
                console.warn('Nenhuma loja selecionada, retornando lista vazia');
                return [];
            }

            console.log(`Buscando clientes para a loja ${currentStore.name} (${currentStore.id})...`);

            // 1. Buscar clientes vinculados a esta loja
            const { data: customersData, error: customersError } = await supabase
                .from('customers')
                .select(`
                    id,
                    name,
                    phone,
                    created_at,
                    user_id
                `)
                .eq('store_id', currentStore.id) // FILTRO POR LOJA ADICIONADO AQUI
                .order('created_at', { ascending: false });

            if (customersError) {
                console.error('Erro ao buscar customers:', customersError);
                return [];
            }

            console.log(`Clientes encontrados na loja atual: ${customersData?.length}`);

            if (!customersData || customersData.length === 0) {
                return [];
            }

            // 2. Busca pedidos APENAS desta loja para calcular métricas
            const { data: orders, error: ordersError } = await supabase
                .from('orders')
                .select('customer_id, total_amount, created_at')
                .eq('store_id', currentStore.id); // FILTRO POR LOJA ADICIONADO AQUI TAMBÉM

            if (ordersError) {
                console.error('Erro ao buscar orders:', ordersError);
            }

            const safeCustomers = customersData || [];
            const safeOrders = orders || [];

            // Agregando dados
            const aggregatedCustomers: Customer[] = safeCustomers.map((c: any) => {
                const customerOrders = safeOrders.filter(o => o.customer_id === c.id);
                const totalSpent = customerOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
                const lastOrder = customerOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

                return {
                    id: c.id,
                    name: c.name || 'Cliente sem nome',
                    phone: c.phone,
                    email: null,
                    orders_count: customerOrders.length,
                    total_spent: totalSpent,
                    last_order_date: lastOrder ? lastOrder.created_at : null,
                    created_at: c.created_at
                };
            });

            // Ordenar por quem comprou mais recentemente
            return aggregatedCustomers.sort((a, b) => {
                if (!a.last_order_date) return 1;
                if (!b.last_order_date) return -1;
                return new Date(b.last_order_date).getTime() - new Date(a.last_order_date).getTime();
            });
        },
        enabled: !!currentStore?.id, // Só executa se tiver loja selecionada
    });
}
