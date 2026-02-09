-- SCRIPT DE CORREÇÃO DE DADOS DO PDV
-- Execute este script no SQL Editor do Supabase para corrigir as vendas que não aparecem no dashboard.

-- 1. Atualizar Pedidos do PDV sem loja (store_id NULL)
-- Atribui todas as vendas órfãs à primeira loja encontrada no sistema.
-- Se você tiver múltiplas lojas e quiser ser específico, substitua "(SELECT id FROM public.stores LIMIT 1)" pelo ID da loja desejada entre aspas simples, ex: 'uuid-da-loja'

UPDATE public.pdv_orders
SET store_id = (SELECT id FROM public.stores LIMIT 1)
WHERE store_id IS NULL;

-- 2. Atualizar Caixas do PDV sem loja
UPDATE public.pdv_cash_registers
SET store_id = (SELECT id FROM public.stores LIMIT 1)
WHERE store_id IS NULL;

-- 3. Atualizar Mesas do PDV sem loja
UPDATE public.pdv_tables
SET store_id = (SELECT id FROM public.stores LIMIT 1)
WHERE store_id IS NULL;

-- Verificação (Opcional): Conte quantos pedidos foram afetados
-- SELECT count(*) FROM public.pdv_orders WHERE store_id IS NOT NULL;
