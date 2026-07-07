-- Habilita Supabase Realtime para franchisee_orders
--
-- Sintoma: o alerta global de "novo pedido de franquia" (som em loop +
-- modal, montado em AdminLayout via useRealtimeFranchiseeOrders) nunca
-- disparava — a subscription postgres_changes('INSERT', 'franchisee_orders')
-- nunca recebia nenhum evento. Causa: franchisee_orders nunca foi adicionada
-- à publication `supabase_realtime` (passo separado da RLS/policies) —
-- mesmo problema já visto antes com fleet_drivers/delivery_routes
-- (20260619000000_enable_realtime_frota.sql).

ALTER PUBLICATION supabase_realtime ADD TABLE public.franchisee_orders;
