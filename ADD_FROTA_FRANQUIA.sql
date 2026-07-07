-- ============================================================
-- MIGRAÇÃO: Suporte a Entregas de Franquia na Rota do Dia
-- Execute cada bloco separadamente no Supabase SQL Editor
-- ============================================================

-- BLOCO 1: Adiciona coluna para IDs de pedidos de franquia na rota
ALTER TABLE public.delivery_routes
  ADD COLUMN IF NOT EXISTS franchisee_order_ids JSONB DEFAULT '[]'::jsonb;

-- ============================================================

-- BLOCO 2: Permite rota sem motorista (para rotas de abastecimento de franquia)
ALTER TABLE public.delivery_routes
  ALTER COLUMN driver_id DROP NOT NULL;
