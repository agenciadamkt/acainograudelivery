-- SCRIPT DEFINITIVO PARA CORRIGIR DASHBOARD PDV
-- Execute este script no SQL Editor do Supabase.
-- Ele cria as colunas de Loja que faltam e corrige as vendas antigas.

-- 1. CRIAR AS COLUNAS (Se não existirem)
ALTER TABLE public.pdv_orders 
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

ALTER TABLE public.pdv_cash_registers 
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

ALTER TABLE public.pdv_tables 
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

-- 2. CRIAR INDICES (Para performance)
CREATE INDEX IF NOT EXISTS idx_pdv_orders_store_id ON public.pdv_orders(store_id);

-- 3. CORRIGIR DADOS ANTIGOS (Vendas órfãs)
-- Atribui vendas sem loja à primeira loja encontrada na sua conta.
UPDATE public.pdv_orders
SET store_id = (SELECT id FROM public.stores LIMIT 1)
WHERE store_id IS NULL;

UPDATE public.pdv_cash_registers
SET store_id = (SELECT id FROM public.stores LIMIT 1)
WHERE store_id IS NULL;

UPDATE public.pdv_tables
SET store_id = (SELECT id FROM public.stores LIMIT 1)
WHERE store_id IS NULL;

-- 4. CONFIRMAÇÃO
-- Mostra quantas vendas agora têm loja vinculada.
SELECT count(*) as vendas_corrigidas FROM public.pdv_orders WHERE store_id IS NOT NULL;
