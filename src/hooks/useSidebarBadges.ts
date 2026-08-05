import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay } from 'date-fns';

export interface SidebarBadges {
  pending: number;       // pedidos aguardando → Pedidos
  kitchen: number;       // em preparo → KDS Cozinha
  delivery: number;      // saiu para entrega → Entregas
  nps: number;           // avaliações negativas de hoje → Avaliações NPS
  supplyOrders: number;  // pedidos de insumo em aberto → Meus Pedidos
}

const VAZIO: SidebarBadges = { pending: 0, kitchen: 0, delivery: 0, nps: 0, supplyOrders: 0 };

/** Um badge que falha vale 0 — nunca derruba os outros nem a sidebar. */
async function contar(p: PromiseLike<{ count: number | null }>): Promise<number> {
  try {
    const { count } = await p;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export function useSidebarBadges() {
  const { currentStore } = useStore();
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery<SidebarBadges>({
    queryKey: ['sidebar-badges', currentStore?.id, userId],
    queryFn: async () => {
      if (!currentStore?.id) return VAZIO;

      const today = startOfDay(new Date()).toISOString();

      // Schema conferido nas migrations antes de escrever estas queries:
      //  · order_feedback (20260124151500): id, order_id, customer_id,
      //    nps_score, category, comment, created_at. NÃO tem `read_at` nem
      //    `store_id` — daí o join com orders, e o critério ser "negativas de
      //    hoje" em vez de "não lidas", que seria impossível.
      //  · franchisee_orders (20260312000000): tem `franchisee_user_id`, NÃO
      //    tem `store_id`. Status: pending, approved, rejected, shipping,
      //    delivered.
      //
      // Uma leitura de `orders` cobre três badges de uma vez.
      const [orders, nps, supplyOrders] = await Promise.all([
        supabase
          .from('orders')
          .select('status')
          .eq('store_id', currentStore.id)
          .in('status', ['pending', 'confirmed', 'preparing', 'out_for_delivery'])
          .gte('created_at', today),
        // `as any`: a tabela não está nos tipos gerados — a FeedbackPage faz
        // o mesmo cast (src/pages/admin/feedback/FeedbackPage.tsx).
        contar(
          (supabase as any)
            .from('order_feedback')
            .select('id, orders!inner(store_id)', { count: 'exact', head: true })
            .eq('orders.store_id', currentStore.id)
            .eq('category', 'negative')
            .gte('created_at', today),
        ),
        userId
          ? contar(
              supabase
                .from('franchisee_orders')
                .select('id', { count: 'exact', head: true })
                .eq('franchisee_user_id', userId)
                .in('status', ['pending', 'approved', 'shipping']),
            )
          : Promise.resolve(0),
      ]);

      const rows = orders.data ?? [];

      return {
        pending: rows.filter(o => o.status === 'pending').length,
        kitchen: rows.filter(o => ['confirmed', 'preparing'].includes(o.status)).length,
        delivery: rows.filter(o => o.status === 'out_for_delivery').length,
        nps,
        supplyOrders,
      };
    },
    enabled: !!currentStore?.id,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
