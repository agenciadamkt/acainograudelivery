import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Customer {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null; // Email costuma vir de auth.users, mas vamos tentar pegar de algum lugar se tiver
    orders_count: number;
    total_spent: number;
    last_order_date: string | null;
    created_at: string;
}

export function useCustomers() {
    return useQuery({
        queryKey: ['customers-list'],
        queryFn: async () => {
            // Como não temos uma tabela 'customers' agregada, vamos buscar dos 'profiles'
            // e cruzar com 'orders' para ter estatísticas.

            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select(`
          id,
          name,
          phone,
          created_at
        `)
                .order('created_at', { ascending: false });

            if (profilesError) throw profilesError;

            // Para ter métricas reais (total gasto, qtd pedidos), precisariamos de uma view ou query mais complexa.
            // Por enquanto, vamos buscar TODOS os pedidos para agregar no front (cuidado com performance em escala)
            // OU idealmente criar uma Edge Function / View.
            // Para manter simples e rápido agora, vamos fazer uma query separada de orders.

            const { data: orders, error: ordersError } = await supabase
                .from('orders')
                .select('customer_id, total_amount, created_at');

            if (ordersError) throw ordersError;

            // Agregando dados
            const customers: Customer[] = profiles.map((p: any) => {
                const profile = p;
                const customerOrders = orders?.filter(o => o.customer_id === profile.id) || [];
                const totalSpent = customerOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
                const lastOrder = customerOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

                return {
                    id: profile.id,
                    name: profile.name || 'Cliente sem nome',
                    phone: profile.phone,
                    email: null, // Profiles publico nao costuma ter email por segurança, a menos que adicionemos na tabela
                    orders_count: customerOrders.length,
                    total_spent: totalSpent,
                    last_order_date: lastOrder ? lastOrder.created_at : null,
                    created_at: profile.created_at
                };
            });

            // Ordenar por quem comprou mais recentemente
            return customers.sort((a, b) => {
                if (!a.last_order_date) return 1;
                if (!b.last_order_date) return -1;
                return new Date(b.last_order_date).getTime() - new Date(a.last_order_date).getTime();
            });
        }
    });
}
