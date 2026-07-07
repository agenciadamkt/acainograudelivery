-- ============================================================
-- MIGRAÇÃO: Pedidos Manuais na Rota do Dia
-- Execute cada bloco separadamente no Supabase SQL Editor
-- ============================================================

-- BLOCO 1: Cria tabela de pedidos manuais
CREATE TABLE IF NOT EXISTS public.manual_delivery_orders (
  id            UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  franchisee_user_id UUID,
  franchisee_name    TEXT     NOT NULL,
  order_number       TEXT     NOT NULL,
  order_date         TIMESTAMPTZ NOT NULL,
  notes              TEXT,
  status             TEXT     DEFAULT 'out_for_delivery'
                              CHECK (status IN ('out_for_delivery', 'delivered', 'cancelled')),
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);

-- ============================================================

-- BLOCO 2: Adiciona coluna de IDs de pedidos manuais em delivery_routes
ALTER TABLE public.delivery_routes
  ADD COLUMN IF NOT EXISTS manual_order_ids JSONB DEFAULT '[]'::jsonb;

-- ============================================================

-- BLOCO 3: RLS básico (opcional — ajuste conforme suas políticas)
ALTER TABLE public.manual_delivery_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam pedidos manuais"
  ON public.manual_delivery_orders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'manager')
    )
  );
