-- Valor mínimo do pedido para entrega — primeira regra de negócio do motor
-- de validações da Frota (src/lib/fleetRules.ts). 0 = regra desativada, pra
-- não impactar instalações existentes até o gestor configurar um valor real.
ALTER TABLE public.fleet_settings
  ADD COLUMN IF NOT EXISTS min_order_value NUMERIC(10,2) NOT NULL DEFAULT 0;
