-- === 1. CORREÇÃO DE PERMISSÕES (RLS) ===
-- Permite que usuários autenticados vejam os pedidos do PDV
ALTER TABLE public.pdv_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own orders" ON public.pdv_orders;
DROP POLICY IF EXISTS "Authenticated users view all pdv orders" ON public.pdv_orders;

CREATE POLICY "Authenticated users view all pdv orders"
ON public.pdv_orders
FOR ALL
USING (auth.role() = 'authenticated'); -- Libera leitura para logados

-- === 2. CORREÇÃO DA LOJA (STORE ID) ===
-- Tenta vincular pedidos sem loja à loja do proprietário
UPDATE public.pdv_orders
SET store_id = public.stores.id
FROM public.stores
WHERE public.pdv_orders.user_id = public.stores.user_id
AND public.pdv_orders.store_id IS NULL;

-- Fallback: Se ainda houver nulos, define para a primeira loja encontrada
UPDATE public.pdv_orders
SET store_id = (SELECT id FROM public.stores LIMIT 1)
WHERE store_id IS NULL;

-- Garante que a coluna está aceitando valores
ALTER TABLE public.pdv_orders ALTER COLUMN store_id DROP NOT NULL;
