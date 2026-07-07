-- ============================================================
-- MIGRAÇÃO: Rota do Dia
-- Execute cada bloco separadamente no Supabase SQL Editor
-- ============================================================

-- PASSO 1: Adiciona campos em orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS out_for_delivery_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_observation TEXT;

-- ============================================================

-- PASSO 2: Adiciona campo em delivery_routes
ALTER TABLE public.delivery_routes
  ADD COLUMN IF NOT EXISTS estimated_duration INTEGER;
