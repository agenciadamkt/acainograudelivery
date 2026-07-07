-- ==============================================================
-- FIX: Módulo de Frota — Rotas do Dia
-- Execute TODOS os blocos no Supabase SQL Editor
-- Blocos são idempotentes (IF NOT EXISTS / DROP NOT NULL)
-- ==============================================================

-- BLOCO 1: Colunas em orders (Rota do Dia)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS out_for_delivery_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_observation TEXT;

-- BLOCO 2: Coluna estimated_duration em delivery_routes
ALTER TABLE public.delivery_routes
  ADD COLUMN IF NOT EXISTS estimated_duration INTEGER;

-- BLOCO 3: Torna driver_id nullable (rota sem motorista)
ALTER TABLE public.delivery_routes
  ALTER COLUMN driver_id DROP NOT NULL;

-- BLOCO 4: Coluna para pedidos de franquia na rota
ALTER TABLE public.delivery_routes
  ADD COLUMN IF NOT EXISTS franchisee_order_ids JSONB DEFAULT '[]'::jsonb;

-- BLOCO 5: Tabela de pedidos manuais na rota
CREATE TABLE IF NOT EXISTS public.manual_delivery_orders (
  id                UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  franchisee_user_id UUID,
  franchisee_name    TEXT         NOT NULL,
  order_number       TEXT         NOT NULL,
  order_date         TIMESTAMPTZ  NOT NULL,
  notes              TEXT,
  status             TEXT         DEFAULT 'out_for_delivery'
                                  CHECK (status IN ('out_for_delivery', 'delivered', 'cancelled')),
  created_at         TIMESTAMPTZ  DEFAULT NOW()
);

-- BLOCO 6: Coluna para pedidos manuais na rota
ALTER TABLE public.delivery_routes
  ADD COLUMN IF NOT EXISTS manual_order_ids JSONB DEFAULT '[]'::jsonb;

-- BLOCO 7: RLS para pedidos manuais
ALTER TABLE public.manual_delivery_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins gerenciam pedidos manuais" ON public.manual_delivery_orders;
CREATE POLICY "Admins gerenciam pedidos manuais"
  ON public.manual_delivery_orders
  FOR ALL
  USING (
    public.is_admin_master() OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'manager', 'staff')
    )
  );

-- BLOCO 8-A: Colunas de endereço em manual_delivery_orders (pino no mapa)
ALTER TABLE public.manual_delivery_orders
  ADD COLUMN IF NOT EXISTS address_street       TEXT,
  ADD COLUMN IF NOT EXISTS address_number       TEXT,
  ADD COLUMN IF NOT EXISTS address_neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS address_city         TEXT,
  ADD COLUMN IF NOT EXISTS address_latitude     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS address_longitude    DOUBLE PRECISION;

-- BLOCO 8: Troca FK de driver_id para referenciar fleet_drivers (motoristas do /admin/frota)
DO $$
BEGIN
  -- Remove FK antiga (para delivery_drivers), se existir
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'delivery_routes_driver_id_fkey'
      AND table_name = 'delivery_routes'
  ) THEN
    ALTER TABLE public.delivery_routes DROP CONSTRAINT delivery_routes_driver_id_fkey;
  END IF;

  -- Zera driver_id de rotas antigas que apontam para IDs que não existem em fleet_drivers
  UPDATE public.delivery_routes
    SET driver_id = NULL
    WHERE driver_id IS NOT NULL
      AND driver_id NOT IN (SELECT id FROM public.fleet_drivers);

  -- Adiciona nova FK para fleet_drivers
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'delivery_routes_driver_id_fleet_fkey'
      AND table_name = 'delivery_routes'
  ) THEN
    ALTER TABLE public.delivery_routes
      ADD CONSTRAINT delivery_routes_driver_id_fleet_fkey
      FOREIGN KEY (driver_id) REFERENCES public.fleet_drivers(id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- BLOCO 9: Corrige RLS de delivery_routes para incluir is_admin_master()
DROP POLICY IF EXISTS "Staff pode gerenciar rotas" ON public.delivery_routes;
CREATE POLICY "Staff pode gerenciar rotas"
  ON public.delivery_routes
  FOR ALL
  USING (
    public.is_admin_master() OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_role(auth.uid(), 'staff'::app_role)
  )
  WITH CHECK (
    public.is_admin_master() OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_role(auth.uid(), 'staff'::app_role)
  );

-- BLOCO 10: Lat/lng da loja do franqueado (pino no mapa para pedidos de franquia)
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
