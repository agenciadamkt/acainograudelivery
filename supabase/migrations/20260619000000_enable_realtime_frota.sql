-- ═══════════════════════════════════════════════════════════════
-- Habilita Supabase Realtime para as tabelas do módulo Frota
--
-- Sintoma: o app do motorista grava a localização corretamente em
-- fleet_drivers.current_location (confirmado direto no banco), mas o
-- mapa do admin nunca recebe o evento — porque fleet_drivers nunca foi
-- adicionada à publication `supabase_realtime` (passo separado da RLS;
-- só delivery_drivers/order_items/orders estavam habilitadas, do
-- módulo Delivery). Sem isso, a subscription postgres_changes do
-- RotaDoDiaMap.tsx nunca dispara.
--
-- Também habilita delivery_routes e manual_delivery_orders, usadas
-- pela subscription de useRotaDoDia.ts (hoje só funcionam via
-- polling de 30s como fallback, não em tempo real).
-- ═══════════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE public.fleet_drivers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_routes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.manual_delivery_orders;
